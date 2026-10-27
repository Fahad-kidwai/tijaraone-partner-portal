import type { Lead, LeadEvent, Prisma, PrismaClient, User } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { ServiceError } from "../partners/service";
import { generateToken } from "./token";
import { getServerEnv } from "../env";
import { sendEmail, logEmailFailure, withTimeout } from "../email";
import { partnerLeadEmail, type PartnerLeadEmailKind } from "../emails/partnerLeadEmail";
import { allowedNext, commissionStatusForStage, isLegalTransition, type LeadStageValue } from "./stateMachine";
import { computeCommissionAmount, decimal2, DEFAULT_COMMISSION_PERCENT } from "./commission";
import { dubaiMonthKeyBounds } from "../time";

export const TOKEN_MAX_ATTEMPTS = 5;

const PARTNER_TIMELINE_TYPES = ["CREATED", "STAGE_CHANGED", "COMMISSION_PAID"] as const;

const PARTNER_LEAD_SELECT = {
  id: true,
  token: true,
  clientName: true,
  serviceType: true,
  stage: true,
  createdAt: true,
  completedAt: true,
  commissionStatus: true,
  commissionAmount: true,
  commissionPercent: true,
  commissionPaidAt: true,
} satisfies Prisma.LeadSelect;

type PartnerLeadRow = Prisma.LeadGetPayload<{ select: typeof PARTNER_LEAD_SELECT }>;

export function toPartnerLeadDto(lead: PartnerLeadRow) {
  return {
    id: lead.id,
    token: lead.token,
    clientName: lead.clientName,
    serviceType: lead.serviceType,
    stage: lead.stage,
    createdAt: lead.createdAt.toISOString(),
    completedAt: lead.completedAt?.toISOString() ?? null,
    commission: {
      status: lead.commissionStatus,
      amount: decimal2(lead.commissionAmount.toString()),
      percent: decimal2(lead.commissionPercent.toString()),
      paidAt: lead.commissionPaidAt?.toISOString() ?? null,
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

export interface LeadDeps {
  nextIndex?: (maxExclusive: number) => number;
  sendMail?: (input: { to: string; subject: string; html: string; text: string }) => Promise<void>;
  now?: () => Date;
}

function isTokenUniqueViolation(error: unknown): boolean {
  return error instanceof PrismaNS.PrismaClientKnownRequestError && error.code === "P2002";
}

async function notifyPartner(
  db: PrismaClient,
  lead: Lead,
  kind: PartnerLeadEmailKind,
  deps: LeadDeps
): Promise<void> {
  const partner = await db.user.findUnique({ where: { id: lead.partnerId }, select: { email: true } });
  if (!partner) return;
  const send = deps.sendMail ?? (async (input) => sendEmail(input));
  const mail = partnerLeadEmail({
    appUrl: getServerEnv().APP_URL,
    leadId: lead.id,
    token: lead.token,
    clientName: lead.clientName,
    serviceType: lead.serviceType,
    stage: lead.stage,
    kind,
    commissionAmount: decimal2(lead.commissionAmount.toString()),
    commissionPercent: decimal2(lead.commissionPercent.toString()),
    paidAt: lead.commissionPaidAt
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Dubai",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(lead.commissionPaidAt)
      : null,
  });
  try {
    await withTimeout(send({ to: partner.email, ...mail }), 5000);
  } catch (error) {
    logEmailFailure("lead.partner_notify_failed", partner.email, error);
  }
}

export interface CreateLeadServiceInput {
  partnerId: string;
  clientName: string;
  serviceType: Lead["serviceType"];
  totalAmount: string;
  commissionPercent?: string;
  stage?: LeadStageValue;
  internalNote?: string;
}

export async function createLead(
  actor: User,
  input: CreateLeadServiceInput,
  db: PrismaClient = prisma,
  deps: LeadDeps = {}
) {
  assertRole(actor, "CEO");
  const partner = await db.user.findFirst({
    where: { id: input.partnerId, role: "PARTNER", isActive: true },
  });
  if (!partner) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
      partnerId: "Select an active partner.",
    });
  }

  const now = deps.now?.() ?? new Date();
  const stage = (input.stage ?? "ADVANCE_RECEIVED") as LeadStageValue;
  const percent = decimal2(input.commissionPercent ?? DEFAULT_COMMISSION_PERCENT);
  const total = decimal2(input.totalAmount);
  const amount = computeCommissionAmount(total, percent);
  const commissionStatus = commissionStatusForStage(stage);
  const completedAt = stage === "COMPLETED" ? now : null;

  let lead: Lead | null = null;
  for (let attempt = 0; attempt < TOKEN_MAX_ATTEMPTS; attempt++) {
    const token = generateToken(deps.nextIndex);
    try {
      lead = await db.$transaction(async (tx) => {
        const created = await tx.lead.create({
          data: {
            token,
            partnerId: partner.id,
            clientName: input.clientName,
            serviceType: input.serviceType,
            stage,
            stageChangedAt: now,
            internalNote: input.internalNote ?? null,
            totalAmount: total,
            commissionPercent: percent,
            commissionAmount: amount,
            commissionStatus,
            completedAt,
          },
        });
        await tx.leadEvent.create({
          data: { leadId: created.id, actorId: actor.id, type: "CREATED", toStage: stage },
        });
        return created;
      });
      break;
    } catch (error) {
      if (isTokenUniqueViolation(error) && attempt < TOKEN_MAX_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  if (!lead) throw new ServiceError(500, "INTERNAL_ERROR", "Could not create token. Please try again.");

  await notifyPartner(db, lead, "CREATED", deps);
  const withPartner = await db.lead.findUnique({ where: { id: lead.id }, include: { partner: true } });
  return toCeoLeadDto(withPartner!);
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
  const where: Prisma.LeadWhereInput = {
    partnerId: actor.id,
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    ...(query.q
      ? {
          OR: [
            { token: { contains: query.q, mode: "insensitive" } },
            { clientName: { contains: query.q, mode: "insensitive" } },
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
      select: PARTNER_LEAD_SELECT,
    }),
  ]);
  return { data: leads.map(toPartnerLeadDto), page: query.page, pageSize: query.pageSize, total };
}

export async function getPartnerLead(actor: User, id: string, db: PrismaClient = prisma) {
  assertRole(actor, "PARTNER");
  const lead = await db.lead.findFirst({ where: { id, partnerId: actor.id }, select: PARTNER_LEAD_SELECT });
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

type LeadWithPartner = Lead & { partner: User };

export function toCeoLeadDto(lead: LeadWithPartner) {
  return {
    id: lead.id,
    token: lead.token,
    partner: {
      id: lead.partner.id,
      name: lead.partner.name,
      email: lead.partner.email,
      phone: lead.partner.phone,
      companyName: lead.partner.companyName,
    },
    clientName: lead.clientName,
    serviceType: lead.serviceType,
    stage: lead.stage,
    stageChangedAt: lead.stageChangedAt.toISOString(),
    internalNote: lead.internalNote,
    completedAt: lead.completedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    allowedNext: allowedNext(lead.stage, lead.commissionStatus),
    commission: {
      status: lead.commissionStatus,
      totalAmount: decimal2(lead.totalAmount.toString()),
      percent: decimal2(lead.commissionPercent.toString()),
      amount: decimal2(lead.commissionAmount.toString()),
      paidAt: lead.commissionPaidAt?.toISOString() ?? null,
      paidRef: lead.commissionPaidRef,
    },
  };
}

export type CeoLeadDto = ReturnType<typeof toCeoLeadDto>;

export interface ListCeoLeadsQuery {
  stage?: Lead["stage"];
  serviceType?: Lead["serviceType"];
  partnerId?: string;
  q?: string;
  month?: string;
  sort?: "newest" | "oldest" | "clientName";
  page: number;
  pageSize: number;
}

export async function listCeoLeads(actor: User, query: ListCeoLeadsQuery, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const monthBounds = query.month ? dubaiMonthKeyBounds(query.month) : null;
  const where: Prisma.LeadWhereInput = {
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    ...(query.partnerId ? { partnerId: query.partnerId } : {}),
    ...(monthBounds ? { createdAt: { gte: monthBounds.start, lt: monthBounds.end } } : {}),
    ...(query.q
      ? {
          OR: [
            { token: { contains: query.q, mode: "insensitive" } },
            { clientName: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy =
    query.sort === "oldest"
      ? { createdAt: "asc" as const }
      : query.sort === "clientName"
        ? { clientName: "asc" as const }
        : { createdAt: "desc" as const };
  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      include: { partner: true },
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: leads.map(toCeoLeadDto), page: query.page, pageSize: query.pageSize, total };
}

export async function getCeoLead(actor: User, id: string, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const lead = await db.lead.findUnique({ where: { id }, include: { partner: true } });
  if (!lead) throw new ServiceError(404, "NOT_FOUND", "Token not found.");
  const events = await db.leadEvent.findMany({
    where: { leadId: id },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    ...toCeoLeadDto(lead),
    timeline: events.map((e) => ({
      type: e.type,
      fromStage: e.fromStage,
      toStage: e.toStage,
      meta: e.meta ?? null,
      actor: { id: e.actor.id, name: e.actor.name, role: e.actor.role },
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export interface UpdateLeadServiceInput {
  toStage?: LeadStageValue;
  expectedStage?: LeadStageValue;
  clientName?: string;
  serviceType?: Lead["serviceType"];
  totalAmount?: string;
  commissionPercent?: string;
  internalNote?: string | null;
}

export async function updateLeadAsCeo(
  actor: User,
  id: string,
  input: UpdateLeadServiceInput,
  db: PrismaClient = prisma,
  deps: LeadDeps = {}
) {
  assertRole(actor, "CEO");
  const now = deps.now?.() ?? new Date();
  let completedFirstTime = false;

  const updated = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, include: { partner: true } });
    if (!lead) throw new ServiceError(404, "NOT_FOUND", "Token not found.");

    if (lead.commissionStatus === "PAID") {
      throw new ServiceError(409, "COMMISSION_LOCKED", "This commission is already paid and cannot be changed.");
    }

    if (input.toStage !== undefined) {
      if (!input.expectedStage) {
        throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
          expectedStage: "expectedStage is required when changing stage",
        });
      }
      if (lead.stage !== input.expectedStage) {
        throw new ServiceError(409, "STALE_STATE", "This token was updated by someone else. Please reload.", undefined, {
          currentStage: lead.stage,
        });
      }
      if (!isLegalTransition(lead.stage, input.toStage, lead.commissionStatus)) {
        throw new ServiceError(409, "INVALID_TRANSITION", `Cannot move from ${lead.stage} to ${input.toStage}.`, undefined, {
          allowedNext: allowedNext(lead.stage, lead.commissionStatus),
        });
      }

      const enteringCompleted = input.toStage === "COMPLETED" && lead.stage !== "COMPLETED";
      const leavingCompleted = lead.stage === "COMPLETED" && input.toStage !== "COMPLETED";
      const commissionStatus = commissionStatusForStage(input.toStage);
      const result = await tx.lead.updateMany({
        where: { id, stage: input.expectedStage, commissionStatus: { not: "PAID" } },
        data: {
          stage: input.toStage,
          stageChangedAt: now,
          commissionStatus,
          completedAt: enteringCompleted ? now : leavingCompleted ? null : lead.completedAt,
        },
      });
      if (result.count !== 1) {
        throw new ServiceError(409, "STALE_STATE", "This token was updated by someone else. Please reload.");
      }
      await tx.leadEvent.create({
        data: {
          leadId: id,
          actorId: actor.id,
          type: "STAGE_CHANGED",
          fromStage: lead.stage,
          toStage: input.toStage,
        },
      });
      if (enteringCompleted) {
        const priorCompleted = await tx.leadEvent.count({
          where: { leadId: id, type: "STAGE_CHANGED", toStage: "COMPLETED" },
        });
        // This event just written counts as 1 — first time only if no earlier COMPLETED.
        completedFirstTime = priorCompleted <= 1;
      }
    }

    const moneyEdit = input.totalAmount !== undefined || input.commissionPercent !== undefined;
    const fieldEdit =
      input.clientName !== undefined || input.serviceType !== undefined || input.internalNote !== undefined || moneyEdit;

    if (fieldEdit) {
      const fresh = await tx.lead.findUnique({ where: { id } });
      if (!fresh) throw new ServiceError(404, "NOT_FOUND", "Token not found.");
      if (fresh.commissionStatus === "PAID") {
        throw new ServiceError(409, "COMMISSION_LOCKED", "This commission is already paid and cannot be changed.");
      }

      if (moneyEdit) {
        const total = decimal2(input.totalAmount ?? fresh.totalAmount.toString());
        const percent = decimal2(input.commissionPercent ?? fresh.commissionPercent.toString());
        const amount = computeCommissionAmount(total, percent);
        await tx.lead.update({
          where: { id },
          data: { totalAmount: total, commissionPercent: percent, commissionAmount: amount },
        });
        await tx.leadEvent.create({
          data: {
            leadId: id,
            actorId: actor.id,
            type: "COMMISSION_UPDATED",
            meta: {
              from: {
                totalAmount: decimal2(fresh.totalAmount.toString()),
                commissionPercent: decimal2(fresh.commissionPercent.toString()),
                commissionAmount: decimal2(fresh.commissionAmount.toString()),
              },
              to: { totalAmount: total, commissionPercent: percent, commissionAmount: amount },
            },
          },
        });
      }

      if (input.clientName !== undefined || input.serviceType !== undefined) {
        await tx.lead.update({
          where: { id },
          data: {
            ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
            ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
          },
        });
      }

      if (input.internalNote !== undefined) {
        await tx.lead.update({ where: { id }, data: { internalNote: input.internalNote } });
        await tx.leadEvent.create({
          data: { leadId: id, actorId: actor.id, type: "NOTE_UPDATED", meta: { updated: true } },
        });
      }
    }

    return (await tx.lead.findUnique({ where: { id }, include: { partner: true } }))!;
  });

  if (completedFirstTime) {
    await notifyPartner(db, updated, "COMPLETED", deps);
  }
  return toCeoLeadDto(updated);
}

function dubaiTodayString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function markCommissionPaid(
  actor: User,
  id: string,
  input: { paidAt: string; paidRef?: string },
  db: PrismaClient = prisma,
  deps: LeadDeps = {}
) {
  assertRole(actor, "CEO");
  const now = deps.now?.() ?? new Date();
  if (input.paidAt > dubaiTodayString(now)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
      paidAt: "Paid date cannot be in the future.",
    });
  }

  const updated = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, include: { partner: true } });
    if (!lead) throw new ServiceError(404, "NOT_FOUND", "Token not found.");
    if (lead.commissionStatus === "PAID") {
      throw new ServiceError(409, "COMMISSION_ALREADY_PAID", "This commission has already been marked paid.");
    }
    if (lead.stage !== "COMPLETED" || lead.commissionStatus !== "PAYABLE") {
      throw new ServiceError(
        409,
        "INVALID_TRANSITION",
        "Only a completed token with a payable commission can be marked paid."
      );
    }
    const paidAt = new Date(`${input.paidAt}T12:00:00.000Z`);
    const result = await tx.lead.updateMany({
      where: { id, stage: "COMPLETED", commissionStatus: "PAYABLE" },
      data: { commissionStatus: "PAID", commissionPaidAt: paidAt, commissionPaidRef: input.paidRef ?? null },
    });
    if (result.count !== 1) {
      throw new ServiceError(409, "STALE_STATE", "This token was updated by someone else. Please reload.");
    }
    await tx.leadEvent.create({
      data: {
        leadId: id,
        actorId: actor.id,
        type: "COMMISSION_PAID",
        meta: { paidAt: input.paidAt, ...(input.paidRef ? { paidRef: input.paidRef } : {}) },
      },
    });
    return (await tx.lead.findUnique({ where: { id }, include: { partner: true } }))!;
  });

  await notifyPartner(db, updated, "PAID", deps);
  return toCeoLeadDto(updated);
}
