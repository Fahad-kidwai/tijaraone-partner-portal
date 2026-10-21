import type { Lead, LeadEvent, PrismaClient, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { ServiceError } from "../partners/service";
import { parsePhone, PhoneParseError } from "../phone";
import { generateToken } from "./token";
import { getServerEnv } from "../env";
import { sendEmail, logEmailFailure } from "../email";
import { ceoNewLeadEmail } from "../emails/ceoNewLeadEmail";

/**
 * Partner-side lead (referral token) service — plan §6.3/§6.4.
 * INVARIANTS:
 * - partnerId ALWAYS comes from the authenticated session user, never input.
 * - The partner DTO is an explicit allow-list: it can never contain
 *   internalNote, lostReason, lostReasonNote, totalAmount, isPossibleDuplicate,
 *   duplicateOfId, firstViewedAt, or another partner's data.
 * - Duplicate flagging (cross-partner) is CEO-only information and is never
 *   disclosed to the submitting partner.
 */

export const DUPLICATE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
export const SUBMIT_RATE_LIMIT = 30;
export const SUBMIT_RATE_WINDOW_MS = 60 * 60 * 1000;
export const TOKEN_MAX_ATTEMPTS = 5;

const PARTNER_TIMELINE_TYPES = ["CREATED", "STAGE_CHANGED"] as const;

export function toPartnerLeadDto(lead: Lead) {
  return {
    id: lead.id,
    token: lead.token,
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    serviceType: lead.serviceType,
    requirementNote: lead.requirementNote,
    stage: lead.stage,
    stageChangedAt: lead.stageChangedAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    // Commission stays NOT_SET/hidden until Phase 4 sets it; amount/percent
    // are only exposed once a commission exists, and totalAmount NEVER is.
    commission: {
      status: lead.commissionStatus,
      ...(lead.commissionStatus !== "NOT_SET"
        ? {
            percent: lead.commissionPercent?.toString() ?? null,
            amount: lead.commissionAmount?.toString() ?? null,
          }
        : {}),
    },
  };
}

export type PartnerLeadDto = ReturnType<typeof toPartnerLeadDto>;

function toPartnerTimelineEvent(event: LeadEvent) {
  return {
    type: event.type,
    fromStage: event.fromStage,
    toStage: event.toStage,
    createdAt: event.createdAt.toISOString(),
  };
}

export interface CreateLeadServiceInput {
  clientName: string;
  clientPhone: string;
  serviceType: Lead["serviceType"];
  requirementNote?: string;
}

export interface LeadDeps {
  /** Injectable token RNG for collision tests; defaults to crypto.randomInt. */
  nextIndex?: (maxExclusive: number) => number;
  /** Injectable mail sender for tests; defaults to the email adapter. */
  sendMail?: (input: { to: string; subject: string; html: string; text: string }) => Promise<void>;
  now?: () => Date;
}

function dubaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function notifyCeos(db: PrismaClient, lead: Lead, partner: User, deps: LeadDeps): Promise<void> {
  const send = deps.sendMail ?? (async (input) => sendEmail(input));
  const ceos = await db.user.findMany({ where: { role: "CEO", isActive: true }, select: { email: true } });
  const mail = ceoNewLeadEmail({
    appUrl: getServerEnv().APP_URL,
    leadId: lead.id,
    token: lead.token,
    partnerName: partner.name,
    partnerCompany: partner.companyName,
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    serviceType: lead.serviceType,
  });
  for (const ceo of ceos) {
    try {
      await send({ to: ceo.email, ...mail });
    } catch (error) {
      // Awaited with the adapter timeout; a failure never fails submission.
      logEmailFailure("partner.ceo_notify_failed", ceo.email, error);
    }
  }
}

function isTokenUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createLead(
  actor: User,
  input: CreateLeadServiceInput,
  db: PrismaClient = prisma,
  deps: LeadDeps = {}
) {
  assertRole(actor, "PARTNER");
  let clientPhone: string;
  try {
    clientPhone = parsePhone(input.clientPhone).e164;
  } catch (error) {
    if (error instanceof PhoneParseError) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        clientPhone: "Enter a valid phone number (UAE default, or + / 00 for other countries)",
      });
    }
    throw error;
  }
  const now = deps.now?.() ?? new Date();
  const windowStart = new Date(now.getTime() - DUPLICATE_WINDOW_MS);

  // Token collisions retry the whole transaction (a P2002 aborts it);
  // duplicate + rate-limit checks re-run inside each attempt (§6.4).
  for (let attempt = 1; attempt <= TOKEN_MAX_ATTEMPTS; attempt++) {
    const token = generateToken(deps.nextIndex);
    try {
      const lead = await db.$transaction(async (tx) => {
        // Abuse guard (plan addition, Phase 3): max 30 submissions/hour.
        const recentCount = await tx.lead.count({
          where: { partnerId: actor.id, createdAt: { gte: new Date(now.getTime() - SUBMIT_RATE_WINDOW_MS) } },
        });
        if (recentCount >= SUBMIT_RATE_LIMIT) {
          throw new ServiceError(
            429,
            "RATE_LIMITED",
            "You've reached the limit of 30 tokens per hour. Please try again a little later."
          );
        }

        const samePartner = await tx.lead.findFirst({
          where: {
            partnerId: actor.id,
            clientPhone,
            serviceType: input.serviceType,
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: "asc" },
        });
        if (samePartner) {
          throw new ServiceError(
            409,
            "DUPLICATE_LEAD",
            `You've already submitted this client for this service on ${dubaiDate(samePartner.createdAt)} (token ${samePartner.token}). Contact TijaraOne if this is a new requirement.`
          );
        }

        const crossPartner = await tx.lead.findFirst({
          where: { clientPhone, partnerId: { not: actor.id }, createdAt: { gte: windowStart } },
          orderBy: { createdAt: "asc" },
        });

        const created = await tx.lead.create({
          data: {
            token,
            partnerId: actor.id,
            clientName: input.clientName,
            clientPhone,
            serviceType: input.serviceType,
            requirementNote: input.requirementNote,
            isPossibleDuplicate: Boolean(crossPartner),
            duplicateOfId: crossPartner?.id ?? null,
          },
        });
        await tx.leadEvent.create({
          data: { leadId: created.id, actorId: actor.id, type: "CREATED", toStage: "NEW" },
        });
        if (crossPartner) {
          // CEO-side only; the submitting partner is never told (§6.4).
          await tx.leadEvent.create({
            data: {
              leadId: created.id,
              actorId: actor.id,
              type: "MARKED_DUPLICATE",
              meta: { duplicateOfId: crossPartner.id },
            },
          });
        }
        return created;
      });

      await notifyCeos(db, lead, actor, deps);
      return toPartnerLeadDto(lead);
    } catch (error) {
      if (isTokenUniqueViolation(error) && attempt < TOKEN_MAX_ATTEMPTS) continue;
      if (isTokenUniqueViolation(error)) {
        throw new ServiceError(500, "TOKEN_GENERATION_FAILED", "Could not generate a token. Please try again.");
      }
      throw error;
    }
  }
  throw new ServiceError(500, "TOKEN_GENERATION_FAILED", "Could not generate a token. Please try again.");
}

export interface ListPartnerLeadsQuery {
  stage?: Lead["stage"];
  serviceType?: Lead["serviceType"];
  q?: string;
  sort?: "newest" | "oldest" | "clientName";
  page: number;
  pageSize: number;
}

export async function listPartnerLeads(actor: User, query: ListPartnerLeadsQuery, db: PrismaClient = prisma) {
  assertRole(actor, "PARTNER");
  const orderBy =
    query.sort === "oldest"
      ? { createdAt: "asc" as const }
      : query.sort === "clientName"
        ? { clientName: "asc" as const }
        : { createdAt: "desc" as const };
  const digits = query.q?.replace(/\D/g, "") ?? "";
  const where = {
    partnerId: actor.id,
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    ...(query.q
      ? {
          OR: [
            { token: { contains: query.q, mode: "insensitive" as const } },
            { clientName: { contains: query.q, mode: "insensitive" as const } },
            { clientPhone: { contains: query.q } },
            ...(digits ? [{ clientPhone: { contains: digits } }] : []),
          ],
        }
      : {}),
  };
  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: leads.map(toPartnerLeadDto), page: query.page, pageSize: query.pageSize, total };
}

export async function getPartnerLead(actor: User, id: string, db: PrismaClient = prisma) {
  assertRole(actor, "PARTNER");
  const lead = await db.lead.findFirst({ where: { id, partnerId: actor.id } });
  if (!lead) throw new ServiceError(404, "NOT_FOUND", "Token not found.");
  const events = await db.leadEvent.findMany({
    where: { leadId: lead.id, type: { in: [...PARTNER_TIMELINE_TYPES] } },
    orderBy: { createdAt: "asc" },
  });
  return { ...toPartnerLeadDto(lead), timeline: events.map(toPartnerTimelineEvent) };
}

export async function getPartnerProfile(actor: User) {
  assertRole(actor, "PARTNER");
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    phone: actor.phone,
    companyName: actor.companyName,
  };
}

export async function updatePartnerProfile(actor: User, rawPhone: string, db: PrismaClient = prisma) {
  assertRole(actor, "PARTNER");
  let phone: string;
  try {
    phone = parsePhone(rawPhone).e164;
  } catch (error) {
    if (error instanceof PhoneParseError) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        phone: "Enter a valid phone number (UAE default, or + / 00 for other countries)",
      });
    }
    throw error;
  }
  const updated = await db.user.update({ where: { id: actor.id }, data: { phone } });
  return getPartnerProfile(updated);
}
