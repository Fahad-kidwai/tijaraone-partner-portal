import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { decimal2 } from "../leads/commission";
import { toPartnerLeadDto, isUnattended, UNATTENDED_AFTER_MS } from "../leads/service";
import { dubaiMonthBoundsUtc, dubaiMonthKeyBounds, lastDubaiMonths } from "../time";
import { STAGE_BADGES } from "../../components/leads/StageBadge";
import { SERVICE_TYPE_LABELS } from "../schemas";
import { buildCsv, dubaiCsvDate } from "./csv";

/**
 * Dashboards, commissions ledger and CSV exports (Phase 5, plan §7).
 * Every number here comes from SQL aggregates (count / groupBy / aggregate)
 * — raw lead rows are only fetched for the small lists that render them.
 * Money travels as stable 2-dp decimal strings; no float maths.
 */

const WON_STAGES = ["WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS", "WON_CLOSED"] as const;
const STAGE_ORDER = ["NEW", "WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS", "WON_CLOSED", "LOST"] as const;

function sum2(value: unknown): string {
  return decimal2(value === null || value === undefined ? "0" : String(value));
}

export async function getCeoOverview(actor: User, db: PrismaClient = prisma, now: Date = new Date()) {
  assertRole(actor, "CEO");
  const month = dubaiMonthBoundsUtc(now);
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const staleBefore = new Date(now.getTime() - UNATTENDED_AFTER_MS);

  const [
    awaitingAction,
    wonThisMonth,
    wonInPipeline,
    decidedWon,
    decidedLost,
    payableAgg,
    stageGrouped,
    partnerStageGrouped,
    needsAttention,
    byServiceGrouped,
  ] = await Promise.all([
    db.lead.count({
      where: { stage: "NEW", OR: [{ firstViewedAt: null }, { createdAt: { lte: staleBefore } }] },
    }),
    db.lead.count({ where: { stage: "WON_CLOSED", closedAt: { gte: month.start, lt: month.end } } }),
    db.lead.count({ where: { stage: { in: ["WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS"] } } }),
    db.lead.count({ where: { stage: { in: [...WON_STAGES] }, stageChangedAt: { gte: since90 } } }),
    db.lead.count({ where: { stage: "LOST", stageChangedAt: { gte: since90 } } }),
    db.lead.aggregate({ where: { commissionStatus: "PAYABLE" }, _sum: { commissionAmount: true } }),
    db.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.lead.groupBy({ by: ["partnerId", "stage"], _count: { _all: true } }),
    db.lead.findMany({
      where: { stage: "NEW", OR: [{ firstViewedAt: null }, { createdAt: { lte: staleBefore } }] },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        token: true,
        clientName: true,
        createdAt: true,
        partner: { select: { name: true } },
      },
    }),
    db.lead.groupBy({ by: ["serviceType"], _count: { _all: true } }),
  ]);

  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<(typeof STAGE_ORDER)[number], number>;
  for (const row of stageGrouped) stageCounts[row.stage] = row._count._all;

  // Top partners from the grouped aggregate rows (partners x stages, tiny).
  const perPartner = new Map<string, { leads: number; won: number; decided: number }>();
  for (const row of partnerStageGrouped) {
    const entry = perPartner.get(row.partnerId) ?? { leads: 0, won: 0, decided: 0 };
    entry.leads += row._count._all;
    if (row.stage === "WON_CLOSED") entry.won += row._count._all;
    if ((WON_STAGES as readonly string[]).includes(row.stage) || row.stage === "LOST") entry.decided += row._count._all;
    perPartner.set(row.partnerId, entry);
  }
  const topIds = [...perPartner.entries()].sort((a, b) => b[1].leads - a[1].leads).slice(0, 5);
  const topUsers = topIds.length
    ? await db.user.findMany({ where: { id: { in: topIds.map(([id]) => id) } }, select: { id: true, name: true, companyName: true } })
    : [];
  const topPartners = topIds.map(([id, stats]) => {
    const user = topUsers.find((u) => u.id === id);
    return {
      partnerId: id,
      name: user?.name ?? "Partner",
      companyName: user?.companyName ?? null,
      leads: stats.leads,
      won: stats.won,
      conversionPercent: stats.decided > 0 ? decimal2(String(Math.round((stats.won / stats.decided) * 1000) / 10)) : null,
    };
  });

  const months = lastDubaiMonths(now, 6);
  const byMonth: Array<{ key: string; label: string; count: number }> = [];
  for (const m of months) {
    byMonth.push({
      key: m.key,
      label: m.label,
      count: await db.lead.count({ where: { createdAt: { gte: m.start, lt: m.end } } }),
    });
  }

  const decided = decidedWon + decidedLost;
  return {
    generatedAt: now.toISOString(),
    kpis: {
      awaitingAction,
      wonThisMonth,
      wonInPipeline,
      conversion90d: {
        won: decidedWon,
        decided,
        percent: decided > 0 ? decimal2(String(Math.round((decidedWon / decided) * 1000) / 10)) : null,
      },
      commissionPayable: sum2(payableAgg._sum.commissionAmount?.toString() ?? null),
    },
    stageCounts: STAGE_ORDER.map((stage) => ({ stage, label: STAGE_BADGES[stage].label, count: stageCounts[stage] })),
    topPartners,
    needsAttention: needsAttention.map((l) => ({
      id: l.id,
      token: l.token,
      clientName: l.clientName,
      partnerName: l.partner.name,
      createdAt: l.createdAt.toISOString(),
    })),
    byService: byServiceGrouped.map((row) => ({
      serviceType: row.serviceType,
      label: SERVICE_TYPE_LABELS[row.serviceType],
      count: row._count._all,
    })),
    byMonth,
  };
}

export async function getPartnerOverview(actor: User, db: PrismaClient = prisma, now: Date = new Date()) {
  assertRole(actor, "PARTNER");
  const month = dubaiMonthBoundsUtc(now);
  const where = { partnerId: actor.id };

  const [total, thisMonth, wonClosed, wonInPipeline, sums, paidThisMonthAgg, stageGrouped, recent] = await Promise.all([
    db.lead.count({ where }),
    db.lead.count({ where: { ...where, createdAt: { gte: month.start, lt: month.end } } }),
    db.lead.count({ where: { ...where, stage: "WON_CLOSED" } }),
    db.lead.count({ where: { ...where, stage: { in: ["WON_ADVANCE_PENDING", "WON_ADVANCE_TAKEN", "WON_IN_PROCESS"] } } }),
    db.lead.groupBy({ by: ["commissionStatus"], where, _sum: { commissionAmount: true } }),
    db.lead.aggregate({
      where: { ...where, commissionStatus: "PAID", commissionPaidAt: { gte: month.start, lt: month.end } },
      _sum: { commissionAmount: true },
    }),
    db.lead.groupBy({ by: ["stage"], where, _count: { _all: true } }),
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const sumFor = (status: string) => sum2(sums.find((s) => s.commissionStatus === status)?._sum.commissionAmount?.toString() ?? null);
  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<(typeof STAGE_ORDER)[number], number>;
  for (const row of stageGrouped) stageCounts[row.stage] = row._count._all;

  // Recent tokens go through the partner allow-list DTO — no internal fields.
  return {
    kpis: {
      tokensTotal: total,
      tokensThisMonth: thisMonth,
      wonClosed,
      wonInPipeline,
      commissionExpected: sumFor("EXPECTED"),
      commissionPayable: sumFor("PAYABLE"),
      commissionPaid: sumFor("PAID"),
      commissionPaidThisMonth: sum2(paidThisMonthAgg._sum.commissionAmount?.toString() ?? null),
    },
    stageCounts: STAGE_ORDER.map((stage) => ({ stage, label: STAGE_BADGES[stage].label, count: stageCounts[stage] })),
    recent: recent.map(toPartnerLeadDto),
  };
}

// ---------------------------------------------------------------------------
// Commissions ledger
// ---------------------------------------------------------------------------

export type CommissionStatusFilter = "expected" | "payable" | "paid";
const STATUS_MAP = { expected: "EXPECTED", payable: "PAYABLE", paid: "PAID" } as const;

export interface CommissionsQuery {
  status?: CommissionStatusFilter;
  partnerId?: string;
  /** Dubai month "YYYY-MM". Per-status date rule: PAID → paid month,
   * PAYABLE → closed month, EXPECTED → last stage-change month. */
  month?: string;
  page: number;
  pageSize: number;
}

function monthWhereFor(status: "EXPECTED" | "PAYABLE" | "PAID", bounds: { start: Date; end: Date }) {
  if (status === "PAID") return { commissionStatus: status, commissionPaidAt: { gte: bounds.start, lt: bounds.end } };
  if (status === "PAYABLE") return { commissionStatus: status, closedAt: { gte: bounds.start, lt: bounds.end } };
  return { commissionStatus: status, stageChangedAt: { gte: bounds.start, lt: bounds.end } };
}

export async function listCommissions(actor: User, query: CommissionsQuery, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const bounds = query.month ? dubaiMonthKeyBounds(query.month) : null;
  const statuses = query.status ? [STATUS_MAP[query.status]] : (["EXPECTED", "PAYABLE", "PAID"] as const);
  const where = {
    ...(query.partnerId ? { partnerId: query.partnerId } : {}),
    OR: statuses.map((s) =>
      bounds ? monthWhereFor(s, bounds) : { commissionStatus: s }
    ),
  };

  const [total, rows, totalsGrouped] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      include: { partner: { select: { id: true, name: true, companyName: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.lead.groupBy({
      by: ["commissionStatus"],
      where: {
        ...(query.partnerId ? { partnerId: query.partnerId } : {}),
        OR: (["EXPECTED", "PAYABLE", "PAID"] as const).map((s) => (bounds ? monthWhereFor(s, bounds) : { commissionStatus: s })),
      },
      _sum: { commissionAmount: true },
      _count: { _all: true },
    }),
  ]);

  const totalFor = (status: string) => {
    const row = totalsGrouped.find((t) => t.commissionStatus === status);
    return { count: row?._count._all ?? 0, amount: sum2(row?._sum.commissionAmount?.toString() ?? null) };
  };

  return {
    data: rows.map((lead) => ({
      leadId: lead.id,
      token: lead.token,
      partner: { id: lead.partner.id, name: lead.partner.name, companyName: lead.partner.companyName },
      clientName: lead.clientName,
      serviceType: lead.serviceType,
      serviceLabel: SERVICE_TYPE_LABELS[lead.serviceType],
      stage: lead.stage,
      totalAmount: lead.totalAmount ? decimal2(lead.totalAmount.toString()) : null,
      percent: lead.commissionPercent ? decimal2(lead.commissionPercent.toString()) : null,
      amount: lead.commissionAmount ? decimal2(lead.commissionAmount.toString()) : null,
      status: lead.commissionStatus,
      paidAt: lead.commissionPaidAt?.toISOString() ?? null,
      paidRef: lead.commissionPaidRef,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totals: { expected: totalFor("EXPECTED"), payable: totalFor("PAYABLE"), paid: totalFor("PAID") },
  };
}

export async function getPartnerCommissions(actor: User, db: PrismaClient = prisma) {
  assertRole(actor, "PARTNER");
  const where = { partnerId: actor.id, commissionStatus: { not: "NOT_SET" as const } };
  const [sums, leads] = await Promise.all([
    db.lead.groupBy({ by: ["commissionStatus"], where: { partnerId: actor.id }, _sum: { commissionAmount: true } }),
    db.lead.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200 }),
  ]);
  const sumFor = (status: string) => sum2(sums.find((s) => s.commissionStatus === status)?._sum.commissionAmount?.toString() ?? null);
  return {
    totals: { expected: sumFor("EXPECTED"), payable: sumFor("PAYABLE"), paid: sumFor("PAID") },
    // Partner allow-list DTO only: no totalAmount, no internal fields.
    data: leads.map(toPartnerLeadDto),
  };
}

// ---------------------------------------------------------------------------
// CSV exports (CEO only). Row cap with explicit truncation signal.
// ---------------------------------------------------------------------------

export const EXPORT_ROW_CAP = 10_000;

export interface CsvResult {
  csv: string;
  rowCount: number;
  truncated: boolean;
}

export interface LeadsExportFilters {
  stage?: string;
  stageGroup?: "new" | "won" | "lost";
  serviceType?: string;
  partnerId?: string;
  q?: string;
  from?: string;
  to?: string;
}

export async function buildLeadsCsv(actor: User, filters: LeadsExportFilters, db: PrismaClient = prisma): Promise<CsvResult> {
  assertRole(actor, "CEO");
  const digits = filters.q?.replace(/\D/g, "") ?? "";
  const leads = await db.lead.findMany({
    where: {
      ...(filters.stage ? { stage: filters.stage as never } : {}),
      ...(filters.stageGroup === "new"
        ? { stage: "NEW" as const }
        : filters.stageGroup === "lost"
          ? { stage: "LOST" as const }
          : filters.stageGroup === "won"
            ? { stage: { in: [...WON_STAGES] } }
            : {}),
      ...(filters.serviceType ? { serviceType: filters.serviceType as never } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) } }
        : {}),
      ...(filters.q
        ? {
            OR: [
              { token: { contains: filters.q, mode: "insensitive" as const } },
              { clientName: { contains: filters.q, mode: "insensitive" as const } },
              { clientPhone: { contains: filters.q } },
              ...(digits ? [{ clientPhone: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
    include: { partner: { select: { name: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
    take: EXPORT_ROW_CAP + 1,
  });
  const truncated = leads.length > EXPORT_ROW_CAP;
  const rows = leads.slice(0, EXPORT_ROW_CAP);
  // Deliberately NO internalNote column (CEO asked only if requested later).
  const csv = buildCsv(
    ["Token", "Client Name", "Client Phone", "Partner", "Partner Company", "Service", "Stage", "Created (Dubai)", "Commission Status", "Total Service Fee (AED)", "Commission %", "Commission Amount (AED)", "Paid At (Dubai)", "Paid Ref"],
    rows.map((l) => [
      l.token,
      l.clientName,
      l.clientPhone,
      l.partner.name,
      l.partner.companyName ?? "",
      SERVICE_TYPE_LABELS[l.serviceType],
      STAGE_BADGES[l.stage].label,
      dubaiCsvDate(l.createdAt),
      l.commissionStatus,
      l.totalAmount ? decimal2(l.totalAmount.toString()) : "",
      l.commissionPercent ? decimal2(l.commissionPercent.toString()) : "",
      l.commissionAmount ? decimal2(l.commissionAmount.toString()) : "",
      dubaiCsvDate(l.commissionPaidAt),
      l.commissionPaidRef ?? "",
    ])
  );
  return { csv, rowCount: rows.length, truncated };
}

export interface CommissionsExportFilters {
  status?: CommissionStatusFilter;
  partnerId?: string;
  month?: string;
}

export async function buildCommissionsCsv(actor: User, filters: CommissionsExportFilters, db: PrismaClient = prisma): Promise<CsvResult> {
  assertRole(actor, "CEO");
  const bounds = filters.month ? dubaiMonthKeyBounds(filters.month) : null;
  const statuses = filters.status ? [STATUS_MAP[filters.status]] : (["EXPECTED", "PAYABLE", "PAID"] as const);
  const leads = await db.lead.findMany({
    where: {
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      OR: statuses.map((s) => (bounds ? monthWhereFor(s, bounds) : { commissionStatus: s })),
    },
    include: { partner: { select: { name: true, companyName: true } } },
    orderBy: { updatedAt: "desc" },
    take: EXPORT_ROW_CAP + 1,
  });
  const truncated = leads.length > EXPORT_ROW_CAP;
  const rows = leads.slice(0, EXPORT_ROW_CAP);
  const csv = buildCsv(
    ["Token", "Partner", "Partner Company", "Client", "Service", "Stage", "Status", "Total Service Fee (AED)", "Commission %", "Commission Amount (AED)", "Paid At (Dubai)", "Paid Ref"],
    rows.map((l) => [
      l.token,
      l.partner.name,
      l.partner.companyName ?? "",
      l.clientName,
      SERVICE_TYPE_LABELS[l.serviceType],
      STAGE_BADGES[l.stage].label,
      l.commissionStatus,
      l.totalAmount ? decimal2(l.totalAmount.toString()) : "",
      l.commissionPercent ? decimal2(l.commissionPercent.toString()) : "",
      l.commissionAmount ? decimal2(l.commissionAmount.toString()) : "",
      dubaiCsvDate(l.commissionPaidAt),
      l.commissionPaidRef ?? "",
    ])
  );
  return { csv, rowCount: rows.length, truncated };
}
