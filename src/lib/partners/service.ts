import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { getServerEnv } from "../env";
import { sendEmail, logEmailFailure } from "../email";
import { welcomeEmail } from "../emails/welcomeEmail";
import { normalizeEmail, type CreatePartnerInput } from "../schemas";
import { parsePhone } from "../phone";
import { logEvent, maskEmail } from "../log";

export class ServiceError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  /** Extra top-level error-body keys (e.g. allowedNext on INVALID_TRANSITION). */
  extra?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.extra = extra;
    this.name = "ServiceError";
  }
}

export interface PartnerStats {
  totalLeads: number;
  wonLeads: number;
  inProgressLeads: number;
  lostLeads: number;
}

export function toPartnerDto(user: User, stats?: PartnerStats) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    ...(stats ? { stats } : {}),
  };
}

const WON_STAGES = ["WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS", "WON_CLOSED"] as const;

export async function getPartnerStats(db: PrismaClient, partnerIds: string[]): Promise<Map<string, PartnerStats>> {
  const map = new Map<string, PartnerStats>(
    partnerIds.map((id) => [id, { totalLeads: 0, wonLeads: 0, inProgressLeads: 0, lostLeads: 0 }])
  );
  if (partnerIds.length === 0) return map;
  const grouped = await db.lead.groupBy({
    by: ["partnerId", "stage"],
    where: { partnerId: { in: partnerIds } },
    _count: { _all: true },
  });
  for (const row of grouped) {
    const stats = map.get(row.partnerId);
    if (!stats) continue;
    stats.totalLeads += row._count._all;
    if (row.stage === "WON_CLOSED") stats.wonLeads += row._count._all;
    else if ((WON_STAGES as readonly string[]).includes(row.stage)) stats.inProgressLeads += row._count._all;
    else if (row.stage === "LOST") stats.lostLeads += row._count._all;
  }
  return map;
}

export interface ListPartnersQuery {
  q?: string;
  includeInactive?: boolean;
  page: number;
  pageSize: number;
}

export async function listPartners(actor: User, query: ListPartnersQuery, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const where = {
    role: "PARTNER" as const,
    ...(query.includeInactive ? {} : { isActive: true }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
            { companyName: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const stats = await getPartnerStats(db, users.map((u) => u.id));
  return {
    data: users.map((u) => toPartnerDto(u, stats.get(u.id))),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export interface PartnerDeps {
  sendWelcome: (email: string) => Promise<void>;
}

function defaultDeps(): PartnerDeps {
  return {
    sendWelcome: async (email) => {
      const mail = welcomeEmail(getServerEnv().APP_URL);
      await sendEmail({ to: email, ...mail });
    },
  };
}

export async function createPartner(
  actor: User,
  input: CreatePartnerInput,
  db: PrismaClient = prisma,
  deps: PartnerDeps = defaultDeps()
) {
  assertRole(actor, "CEO");
  // Normalise in the service too (trim + lowercase only) — never rely on the
  // caller having run zod first when money/identity data is involved.
  const email = normalizeEmail(input.email);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ServiceError(409, "CONFLICT", "A user with this email already exists.", {
      email: "This email is already registered",
    });
  }
  const partner = await db.user.create({
    data: {
      role: "PARTNER",
      name: input.name,
      email,
      phone: parsePhone(input.phone).e164,
      companyName: input.companyName,
      createdById: actor.id,
    },
  });
  let welcomeEmailFailed = false;
  if (input.sendWelcomeEmail) {
    try {
      await deps.sendWelcome(partner.email);
    } catch (error) {
      // Best-effort (awaited, timed out inside sendEmail): never fail creation,
      // but surface it so the CEO UI can show a visible warning.
      welcomeEmailFailed = true;
      logEmailFailure("partner.welcome_send_failed", partner.email, error);
    }
  }
  const stats = await getPartnerStats(db, [partner.id]);
  return { ...toPartnerDto(partner, stats.get(partner.id)), welcomeEmailFailed };
}

async function findPartnerOr404(db: PrismaClient, id: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.role !== "PARTNER") throw new ServiceError(404, "NOT_FOUND", "Partner not found.");
  return user;
}

export async function getPartner(
  actor: User,
  id: string,
  leadsPage = 1,
  leadsPageSize = 20,
  db: PrismaClient = prisma
) {
  assertRole(actor, "CEO");
  const partner = await findPartnerOr404(db, id);
  const stats = await getPartnerStats(db, [id]);
  const [leadTotal, leads] = await Promise.all([
    db.lead.count({ where: { partnerId: id } }),
    db.lead.findMany({
      where: { partnerId: id },
      orderBy: { createdAt: "desc" },
      skip: (leadsPage - 1) * leadsPageSize,
      take: leadsPageSize,
      select: {
        id: true,
        token: true,
        clientName: true,
        clientPhone: true,
        serviceType: true,
        stage: true,
        commissionStatus: true,
        commissionPercent: true,
        commissionAmount: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    ...toPartnerDto(partner, stats.get(id)),
    leads: {
      data: leads.map((l) => ({
        ...l,
        commissionPercent: l.commissionPercent?.toString() ?? null,
        commissionAmount: l.commissionAmount?.toString() ?? null,
        totalAmount: l.totalAmount?.toString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      page: leadsPage,
      pageSize: leadsPageSize,
      total: leadTotal,
    },
  };
}

export interface UpdatePartnerInput {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  isActive?: boolean;
}

export async function updatePartner(actor: User, id: string, input: UpdatePartnerInput, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const partner = await findPartnerOr404(db, id);
  const nextEmail = input.email ? normalizeEmail(input.email) : undefined;
  if (nextEmail && nextEmail !== partner.email) {
    const clash = await db.user.findUnique({ where: { email: nextEmail } });
    if (clash) {
      throw new ServiceError(409, "CONFLICT", "A user with this email already exists.", {
        email: "This email is already registered",
      });
    }
  }
  const emailChanged = nextEmail !== undefined && nextEmail !== partner.email;
  const updated = await db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
      ...(input.phone !== undefined ? { phone: parsePhone(input.phone).e164 } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      // Deactivation and email changes both revoke all live sessions
      // immediately (plan §3.4): the old address may belong to someone else.
      ...(input.isActive === false || emailChanged ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  if (emailChanged) {
    logEvent("admin.partner_email_changed", {
      partnerId: id,
      from: maskEmail(partner.email),
      to: maskEmail(nextEmail),
    });
  }
  const stats = await getPartnerStats(db, [id]);
  return toPartnerDto(updated, stats.get(id));
}
