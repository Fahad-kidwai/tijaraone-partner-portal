import type { Lead, LeadEvent, PrismaClient, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { ServiceError } from "../partners/service";
import { parsePhone, PhoneParseError } from "../phone";
import { generateToken } from "./token";
import { getServerEnv } from "../env";
import { sendEmail, logEmailFailure, withTimeout } from "../email";
import { ceoNewLeadEmail } from "../emails/ceoNewLeadEmail";
import { partnerLeadEmail, type PartnerLeadEmailKind } from "../emails/partnerLeadEmail";
import { allowedNext, isLegalTransition, type LeadStageValue } from "./stateMachine";
import { computeCommissionAmount, decimal2, DEFAULT_COMMISSION_PERCENT } from "./commission";

/**
 * Partner-side lead (referral token) service ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â plan Ãƒâ€šÃ‚Â§6.3/Ãƒâ€šÃ‚Â§6.4.
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

const PARTNER_TIMELINE_TYPES = ["CREATED", "STAGE_CHANGED", "COMMISSION_PAID"] as const;

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
            percent: (lead.commissionPercent ? decimal2(lead.commissionPercent.toString()) : null),
            amount: (lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null),
            ...(lead.commissionStatus === "PAID"
              ? { paidAt: lead.commissionPaidAt?.toISOString() ?? null }
              : {}),
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
  // All CEOs in PARALLEL with an overall ~4s cap: sequential sends must
  // never delay the partner's submission (each adapter send also has its
  // own timeout). Failures are logged masked and never fail submission.
  const sends = ceos.map(async (ceo) => {
    try {
      await send({ to: ceo.email, ...mail });
    } catch (error) {
      logEmailFailure("partner.ceo_notify_failed", ceo.email, error);
    }
  });
  await withTimeout(Promise.allSettled(sends), 4000).catch(() => {
    // Overall cap hit ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â notification is best-effort by design (Ãƒâ€šÃ‚Â§3.5).
  });
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
  // duplicate + rate-limit checks re-run inside each attempt (Ãƒâ€šÃ‚Â§6.4).
  for (let attempt = 1; attempt <= TOKEN_MAX_ATTEMPTS; attempt++) {
    const token = generateToken(deps.nextIndex);
    try {
      const lead = await db.$transaction(async (tx) => {
        // Serialize submissions per partner: a double-tap (two requests in
        // flight at once) must not slip two tokens past the duplicate and
        // rate-limit checks below. The advisory lock is transaction-scoped
        // and keyed on the partner id; all access still goes through the
        // Prisma client from src/lib/db.ts.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.id}, 0))`;
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
          // CEO-side only; the submitting partner is never told (Ãƒâ€šÃ‚Â§6.4).
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
      }, { timeout: 30_000, maxWait: 20_000 });

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

// ---------------------------------------------------------------------------
// CEO pipeline (Phase 4, plan Ãƒâ€šÃ‚Â§4 + Ãƒâ€šÃ‚Â§6.2). ALL stage/commission writes go
// through transitionLead / updateLeadAsCeo / markCommissionPaid below ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
// no other code path may write stage, commission*, lost*, or closedAt.
// ---------------------------------------------------------------------------

type LeadWithPartner = Lead & { partner: User };

export const UNATTENDED_AFTER_MS = 48 * 60 * 60 * 1000;

export function isUnattended(lead: Lead, now: Date): boolean {
  return lead.stage === "NEW" && (lead.firstViewedAt === null || now.getTime() - lead.createdAt.getTime() >= UNATTENDED_AFTER_MS);
}

export function toCeoLeadDto(lead: LeadWithPartner, now: Date = new Date()) {
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
    clientPhone: lead.clientPhone,
    serviceType: lead.serviceType,
    requirementNote: lead.requirementNote,
    stage: lead.stage,
    stageChangedAt: lead.stageChangedAt.toISOString(),
    lostReason: lead.lostReason,
    lostReasonNote: lead.lostReasonNote,
    internalNote: lead.internalNote,
    isPossibleDuplicate: lead.isPossibleDuplicate,
    duplicateOfId: lead.duplicateOfId,
    unattended: isUnattended(lead, now),
    firstViewedAt: lead.firstViewedAt?.toISOString() ?? null,
    closedAt: lead.closedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    allowedNext: allowedNext(lead.stage, lead.commissionStatus),
    commission: {
      status: lead.commissionStatus,
      totalAmount: (lead.totalAmount ? decimal2(lead.totalAmount.toString()) : null),
      percent: (lead.commissionPercent ? decimal2(lead.commissionPercent.toString()) : null),
      amount: (lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null),
      paidAt: lead.commissionPaidAt?.toISOString() ?? null,
      paidRef: lead.commissionPaidRef,
    },
  };
}

export type CeoLeadDto = ReturnType<typeof toCeoLeadDto>;

export interface ListCeoLeadsQuery {
  stage?: Lead["stage"];
  stageGroup?: "new" | "won" | "lost";
  serviceType?: Lead["serviceType"];
  partnerId?: string;
  q?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "clientName";
  page: number;
  pageSize: number;
}

const WON_GROUP_STAGES = ["WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS", "WON_CLOSED"] as const;

export async function listCeoLeads(actor: User, query: ListCeoLeadsQuery, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const digits = query.q?.replace(/\D/g, "") ?? "";
  const where = {
    ...(query.stage
      ? { stage: query.stage }
      : query.stageGroup === "new"
        ? { stage: "NEW" as const }
        : query.stageGroup === "lost"
          ? { stage: "LOST" as const }
          : query.stageGroup === "won"
            ? { stage: { in: [...WON_GROUP_STAGES] } }
            : {}),
    ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    ...(query.partnerId ? { partnerId: query.partnerId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
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
  const now = new Date();
  return { data: leads.map((l) => toCeoLeadDto(l, now)), page: query.page, pageSize: query.pageSize, total };
}

export async function getCeoLead(actor: User, id: string, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const lead = await db.lead.findUnique({ where: { id }, include: { partner: true } });
  if (!lead) throw new ServiceError(404, "NOT_FOUND", "Lead not found.");
  // First CEO view stamps firstViewedAt ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â same operation, only when null.
  let current = lead;
  if (lead.firstViewedAt === null) {
    const stamped = await db.lead.updateMany({
      where: { id, firstViewedAt: null },
      data: { firstViewedAt: new Date() },
    });
    if (stamped.count === 1) {
      current = (await db.lead.findUnique({ where: { id }, include: { partner: true } })) ?? lead;
    }
  }
  const events = await db.leadEvent.findMany({
    where: { leadId: id },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    ...toCeoLeadDto(current),
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

export interface TransitionInput {
  toStage: LeadStageValue;
  expectedStage: LeadStageValue;
  totalAmount?: string;
  commissionPercent?: string;
  lostReason?: Lead["lostReason"];
  lostReasonNote?: string;
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
    kind,
    commissionAmount: (lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null),
    commissionPercent: (lead.commissionPercent ? decimal2(lead.commissionPercent.toString()) : null),
    paidAt: lead.commissionPaidAt
      ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" }).format(lead.commissionPaidAt)
      : null,
  });
  try {
    await send({ to: partner.email, ...mail });
  } catch (error) {
    logEmailFailure("lead.partner_notify_failed", partner.email, error);
  }
}

export async function transitionLead(
  actor: User,
  id: string,
  input: TransitionInput,
  db: PrismaClient = prisma,
  deps: LeadDeps = {}
) {
  assertRole(actor, "CEO");
  const now = deps.now?.() ?? new Date();

  const updated = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, include: { partner: true } });
    if (!lead) throw new ServiceError(404, "NOT_FOUND", "Lead not found.");
    if (lead.stage !== input.expectedStage) {
      throw new ServiceError(409, "STALE_STATE", "This lead was updated by someone else. Please reload.", undefined, {
        currentStage: lead.stage,
      });
    }
    const legal = allowedNext(lead.stage, lead.commissionStatus);
    if (!isLegalTransition(lead.stage, input.toStage, lead.commissionStatus)) {
      throw new ServiceError(
        409,
        "INVALID_TRANSITION",
        `Cannot move from ${lead.stage} to ${input.toStage}.`,
        undefined,
        { allowedNext: legal }
      );
    }

    const isAdvanceTaken = input.toStage === "WON_ADVANCE_TAKEN";
    const isLost = input.toStage === "LOST";
    // Money/lost fields are only accepted by the transitions that own them;
    // anywhere else they are a 400 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â money input is never silently ignored.
    if (!isAdvanceTaken && (input.totalAmount !== undefined || input.commissionPercent !== undefined)) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        form: "Commission amounts can only be set when moving to Advance Taken.",
      });
    }
    if (!isLost && (input.lostReason !== undefined || input.lostReasonNote !== undefined)) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        form: "A lost reason can only be set when marking a lead Lost.",
      });
    }
    if (isAdvanceTaken && input.totalAmount === undefined) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        totalAmount: "Total service fee is required when the advance is taken.",
      });
    }
    if (isLost && !input.lostReason) {
      throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        lostReason: "Choose a reason for marking this lead lost.",
      });
    }

    const percent = isAdvanceTaken ? decimal2(input.commissionPercent ?? DEFAULT_COMMISSION_PERCENT) : undefined;
    const commissionAmount =
      isAdvanceTaken && input.totalAmount !== undefined ? computeCommissionAmount(input.totalAmount, percent!) : undefined;

    // Commission-clearing audit event (LOST from a commissioned stage) is
    // written BEFORE the stage event, per plan Ãƒâ€šÃ‚Â§4.1.
    if (isLost && lead.totalAmount !== null) {
      await tx.leadEvent.create({
        data: {
          leadId: id,
          actorId: actor.id,
          type: "COMMISSION_SET",
          meta: {
            cleared: true,
            previousTotalAmount: decimal2(lead.totalAmount.toString()),
            previousPercent: (lead.commissionPercent ? decimal2(lead.commissionPercent.toString()) : null),
            previousAmount: (lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null),
          },
        },
      });
    }

    // Optimistic concurrency: the stage update itself is guarded on the
    // stage the client saw; a lost race affects 0 rows.
    const result = await tx.lead.updateMany({
      where: { id, stage: input.expectedStage },
      data: {
        stage: input.toStage,
        stageChangedAt: now,
        ...(isAdvanceTaken
          ? {
              totalAmount: input.totalAmount,
              commissionPercent: percent,
              commissionAmount,
              commissionStatus: "EXPECTED" as const,
            }
          : {}),
        ...(isLost
          ? {
              lostReason: input.lostReason,
              lostReasonNote: input.lostReasonNote ?? null,
              totalAmount: null,
              commissionPercent: null,
              commissionAmount: null,
              commissionStatus: "NOT_SET" as const,
              closedAt: null,
            }
          : {}),
        ...(input.toStage === "WON_CLOSED" ? { commissionStatus: "PAYABLE" as const, closedAt: now } : {}),
        ...(lead.stage === "WON_CLOSED" && input.toStage === "WON_IN_PROCESS"
          ? { commissionStatus: "EXPECTED" as const, closedAt: null }
          : {}),
        ...(lead.stage === "LOST" && input.toStage === "NEW" ? { lostReason: null, lostReasonNote: null } : {}),
      },
    });
    if (result.count !== 1) {
      throw new ServiceError(409, "STALE_STATE", "This lead was updated by someone else. Please reload.");
    }

    const isReopen = lead.stage === "LOST" && input.toStage === "NEW";
    await tx.leadEvent.create({
      data: {
        leadId: id,
        actorId: actor.id,
        type: isReopen ? "REOPENED" : "STAGE_CHANGED",
        fromStage: lead.stage,
        toStage: input.toStage,
        ...(isLost ? { meta: { lostReason: input.lostReason } } : {}),
      },
    });
    if (isAdvanceTaken) {
      await tx.leadEvent.create({
        data: {
          leadId: id,
          actorId: actor.id,
          type: "COMMISSION_SET",
          meta: {
            totalAmount: input.totalAmount !== undefined ? decimal2(input.totalAmount) : null,
            commissionPercent: percent,
            commissionAmount,
          },
        },
      });
    }

    const fresh = await tx.lead.findUnique({ where: { id }, include: { partner: true } });
    return fresh!;
  }, { timeout: 30_000, maxWait: 20_000 });

  if (input.toStage === "WON_ADVANCE_TAKEN") {
    await notifyPartner(db, updated, "ADVANCE_TAKEN", deps);
  } else if (input.toStage === "WON_CLOSED") {
    // The "Client closed" email goes out only the FIRST time a lead reaches
    // WON_CLOSED — an undo-close followed by re-close must not re-email.
    const closedEvents = await db.leadEvent.count({
      where: { leadId: id, type: "STAGE_CHANGED", toStage: "WON_CLOSED" },
    });
    if (closedEvents <= 1) {
      await notifyPartner(db, updated, "CLOSED", deps);
    }
  }
  return toCeoLeadDto(updated);
}

export interface UpdateLeadInput {
  internalNote?: string | null;
  totalAmount?: string;
  commissionPercent?: string;
}

export async function updateLeadAsCeo(
  actor: User,
  id: string,
  input: UpdateLeadInput,
  db: PrismaClient = prisma
) {
  assertRole(actor, "CEO");
  const updated = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, include: { partner: true } });
    if (!lead) throw new ServiceError(404, "NOT_FOUND", "Lead not found.");

    const moneyEdit = input.totalAmount !== undefined || input.commissionPercent !== undefined;
    if (moneyEdit) {
      if (lead.commissionStatus === "PAID") {
        throw new ServiceError(409, "COMMISSION_LOCKED", "This commission is already paid and cannot be changed.");
      }
      if (lead.totalAmount === null || lead.commissionPercent === null) {
        throw new ServiceError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", {
          form: "Commission is not set on this lead yet ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â set it when moving to Advance Taken.",
        });
      }
      const total = decimal2(input.totalAmount ?? lead.totalAmount.toString());
      const percent = decimal2(input.commissionPercent ?? lead.commissionPercent.toString());
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
              totalAmount: decimal2(lead.totalAmount.toString()),
              commissionPercent: decimal2(lead.commissionPercent.toString()),
              commissionAmount: (lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null),
            },
            to: { totalAmount: total, commissionPercent: percent, commissionAmount: amount },
          },
        },
      });
    }

    if (input.internalNote !== undefined) {
      await tx.lead.update({ where: { id }, data: { internalNote: input.internalNote } });
      // meta deliberately carries NO note text (PII hygiene, plan Ãƒâ€šÃ‚Â§4.1).
      await tx.leadEvent.create({
        data: { leadId: id, actorId: actor.id, type: "NOTE_UPDATED", meta: { updated: true } },
      });
    }

    return (await tx.lead.findUnique({ where: { id }, include: { partner: true } }))!;
  });
  return toCeoLeadDto(updated);
}

function dubaiTodayString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
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
    if (!lead) throw new ServiceError(404, "NOT_FOUND", "Lead not found.");
    if (lead.commissionStatus === "PAID") {
      throw new ServiceError(409, "COMMISSION_ALREADY_PAID", "This commission has already been marked paid.");
    }
    if (lead.stage !== "WON_CLOSED" || lead.commissionStatus !== "PAYABLE") {
      throw new ServiceError(409, "INVALID_TRANSITION", "Only a closed lead with a payable commission can be marked paid.", undefined, {
        allowedNext: allowedNext(lead.stage, lead.commissionStatus),
      });
    }
    // Guarded on commissionStatus so mark-paid can happen exactly once.
    const paidAt = new Date(`${input.paidAt}T12:00:00.000Z`);
    const result = await tx.lead.updateMany({
      where: { id, stage: "WON_CLOSED", commissionStatus: "PAYABLE" },
      data: { commissionStatus: "PAID", commissionPaidAt: paidAt, commissionPaidRef: input.paidRef ?? null },
    });
    if (result.count !== 1) {
      throw new ServiceError(409, "STALE_STATE", "This lead was updated by someone else. Please reload.");
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

