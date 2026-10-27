import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "../db";
import { assertRole } from "../auth/session";
import { decimal2 } from "../leads/commission";
import { toPartnerLeadDto } from "../leads/service";
import { dubaiMonthBoundsUtc, dubaiMonthKeyBounds } from "../time";
import { STAGE_BADGES } from "../../components/leads/StageBadge";
import { SERVICE_TYPE_LABELS } from "../schemas";
import { buildCsv, dubaiCsvDate } from "./csv";

/**
 * Dashboards, commissions ledger and CSV exports.
 * Numbers from SQL aggregates only — no in-memory scans of lead rows.
 */

const STAGE_ORDER = ["ADVANCE_RECEIVED", "IN_PROGRESS", "COMPLETED"] as const;

function sum2(value: unknown): string {
  return decimal2(value === null || value === undefined ? "0" : String(value));
}

export async function getCeoOverview(actor: User, db: PrismaClient = prisma, now: Date = new Date()) {
  assertRole(actor, "CEO");
  const month = dubaiMonthBoundsUtc(now);

  const [stageGrouped, aggregates, paidThisMonthAgg, partnerGrouped, completedThisMonth] = await Promise.all([
    db.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.lead.aggregate({
      _sum: { commissionAmount: true },
      where: { commissionStatus: "PAYABLE" },
    }),
    db.lead.aggregate({
      where: { commissionStatus: "PAID", commissionPaidAt: { gte: month.start, lt: month.end } },
      _sum: { commissionAmount: true },
    }),
    db.lead.groupBy({
      by: ["partnerId"],
      _count: { _all: true },
      _sum: { commissionAmount: true },
    }),
    db.lead.count({
      where: { stage: "COMPLETED", completedAt: { gte: month.start, lt: month.end } },
    }),
  ]);

  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<(typeof STAGE_ORDER)[number], number>;
  for (const row of stageGrouped) stageCounts[row.stage] = row._count._all;

  const activeTokens = (stageCounts.ADVANCE_RECEIVED ?? 0) + (stageCounts.IN_PROGRESS ?? 0);

  const topIds = [...partnerGrouped].sort((a, b) => b._count._all - a._count._all).slice(0, 5);
  const topUsers = topIds.length
    ? await db.user.findMany({
        where: { id: { in: topIds.map((r) => r.partnerId) } },
        select: { id: true, name: true, companyName: true },
      })
    : [];
  const topPartners = topIds.map((row) => {
    const user = topUsers.find((u) => u.id === row.partnerId);
    return {
      partnerId: row.partnerId,
      name: user?.name ?? "Partner",
      companyName: user?.companyName ?? null,
      tokens: row._count._all,
      commission: sum2(row._sum.commissionAmount?.toString() ?? null),
    };
  });

  return {
    generatedAt: now.toISOString(),
    kpis: {
      activeTokens,
      completedThisMonth,
      commissionPayable: sum2(aggregates._sum.commissionAmount?.toString() ?? null),
      commissionPaidThisMonth: sum2(paidThisMonthAgg._sum.commissionAmount?.toString() ?? null),
    },
    stageCounts: STAGE_ORDER.map((stage) => ({ stage, label: STAGE_BADGES[stage].label, count: stageCounts[stage] })),
    topPartners,
  };
}

export async function getPartnerOverview(actor: User, db: PrismaClient = prisma, now: Date = new Date()) {
  assertRole(actor, "PARTNER");
  const month = dubaiMonthBoundsUtc(now);
  const where = { partnerId: actor.id };

  const PARTNER_SELECT = {
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
  } as const;

  const [stageGrouped, sums, paidThisMonthAgg, recent] = await Promise.all([
    db.lead.groupBy({ by: ["stage"], where, _count: { _all: true } }),
    db.lead.groupBy({ by: ["commissionStatus"], where, _sum: { commissionAmount: true } }),
    db.lead.aggregate({
      where: { ...where, commissionStatus: "PAID", commissionPaidAt: { gte: month.start, lt: month.end } },
      _sum: { commissionAmount: true },
    }),
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 10, select: PARTNER_SELECT }),
  ]);

  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<(typeof STAGE_ORDER)[number], number>;
  for (const row of stageGrouped) stageCounts[row.stage] = row._count._all;
  const sumFor = (status: string) =>
    sum2(sums.find((s) => s.commissionStatus === status)?._sum.commissionAmount?.toString() ?? null);

  const tokensTotal = STAGE_ORDER.reduce((n, s) => n + stageCounts[s], 0);
  const payableExpected = (() => {
    const a = BigInt(sumFor("PAYABLE").replace(".", ""));
    const b = BigInt(sumFor("EXPECTED").replace(".", ""));
    const total = a + b;
    const whole = total / BigInt(100);
    const frac = (total % BigInt(100)).toString().padStart(2, "0");
    return `${whole.toString()}.${frac}`;
  })();

  return {
    kpis: {
      tokensTotal,
      inProgress: stageCounts.IN_PROGRESS,
      commissionPayableExpected: payableExpected,
      commissionPaid: sumFor("PAID"),
      commissionPaidThisMonth: sum2(paidThisMonthAgg._sum.commissionAmount?.toString() ?? null),
    },
    stageCounts: STAGE_ORDER.map((stage) => ({ stage, label: STAGE_BADGES[stage].label, count: stageCounts[stage] })),
    recent: recent.map(toPartnerLeadDto),
  };
}

export type CommissionStatusFilter = "expected" | "payable" | "paid";
const STATUS_MAP = { expected: "EXPECTED", payable: "PAYABLE", paid: "PAID" } as const;

export interface CommissionsQuery {
  status?: CommissionStatusFilter;
  partnerId?: string;
  month?: string;
  page: number;
  pageSize: number;
}

function monthWhereFor(status: "EXPECTED" | "PAYABLE" | "PAID", bounds: { start: Date; end: Date }) {
  if (status === "PAID") return { commissionStatus: status, commissionPaidAt: { gte: bounds.start, lt: bounds.end } };
  if (status === "PAYABLE") return { commissionStatus: status, completedAt: { gte: bounds.start, lt: bounds.end } };
  return { commissionStatus: status, stageChangedAt: { gte: bounds.start, lt: bounds.end } };
}

export async function listCommissions(actor: User, query: CommissionsQuery, db: PrismaClient = prisma) {
  assertRole(actor, "CEO");
  const bounds = query.month ? dubaiMonthKeyBounds(query.month) : null;
  const statuses = query.status ? [STATUS_MAP[query.status]] : (["EXPECTED", "PAYABLE", "PAID"] as const);
  const where = {
    ...(query.partnerId ? { partnerId: query.partnerId } : {}),
    OR: statuses.map((s) => (bounds ? monthWhereFor(s, bounds) : { commissionStatus: s })),
  };

  const [total, rows, totalsGrouped] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      select: {
        id: true,
        token: true,
        clientName: true,
        serviceType: true,
        stage: true,
        totalAmount: true,
        commissionPercent: true,
        commissionAmount: true,
        commissionStatus: true,
        commissionPaidAt: true,
        commissionPaidRef: true,
        partner: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.lead.groupBy({
      by: ["commissionStatus"],
      where: {
        ...(query.partnerId ? { partnerId: query.partnerId } : {}),
        OR: (["EXPECTED", "PAYABLE", "PAID"] as const).map((s) =>
          bounds ? monthWhereFor(s, bounds) : { commissionStatus: s }
        ),
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
      totalAmount: decimal2(lead.totalAmount.toString()),
      percent: decimal2(lead.commissionPercent.toString()),
      amount: decimal2(lead.commissionAmount.toString()),
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

export const EXPORT_ROW_CAP = 10_000;

export interface CsvResult {
  csv: string;
  rowCount: number;
  truncated: boolean;
}

export interface LeadsExportFilters {
  stage?: string;
  serviceType?: string;
  partnerId?: string;
  q?: string;
  month?: string;
}

export async function buildLeadsCsv(
  actor: User,
  filters: LeadsExportFilters,
  db: PrismaClient = prisma
): Promise<CsvResult> {
  assertRole(actor, "CEO");
  const monthBounds = filters.month ? dubaiMonthKeyBounds(filters.month) : null;
  const leads = await db.lead.findMany({
    where: {
      ...(filters.stage ? { stage: filters.stage as never } : {}),
      ...(filters.serviceType ? { serviceType: filters.serviceType as never } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(monthBounds ? { createdAt: { gte: monthBounds.start, lt: monthBounds.end } } : {}),
      ...(filters.q
        ? {
            OR: [
              { token: { contains: filters.q, mode: "insensitive" as const } },
              { clientName: { contains: filters.q, mode: "insensitive" as const } },
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
  const csv = buildCsv(
    [
      "Token",
      "Client Name",
      "Partner",
      "Partner Company",
      "Service",
      "Stage",
      "Created (Dubai)",
      "Commission Status",
      "Total Service Fee (AED)",
      "Commission %",
      "Commission Amount (AED)",
      "Paid At (Dubai)",
      "Paid Ref",
    ],
    rows.map((l) => [
      l.token,
      l.clientName,
      l.partner.name,
      l.partner.companyName ?? "",
      SERVICE_TYPE_LABELS[l.serviceType],
      STAGE_BADGES[l.stage].label,
      dubaiCsvDate(l.createdAt),
      l.commissionStatus,
      decimal2(l.totalAmount.toString()),
      decimal2(l.commissionPercent.toString()),
      decimal2(l.commissionAmount.toString()),
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

export async function buildCommissionsCsv(
  actor: User,
  filters: CommissionsExportFilters,
  db: PrismaClient = prisma
): Promise<CsvResult> {
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
    [
      "Token",
      "Partner",
      "Partner Company",
      "Client",
      "Service",
      "Stage",
      "Status",
      "Total Service Fee (AED)",
      "Commission %",
      "Commission Amount (AED)",
      "Paid At (Dubai)",
      "Paid Ref",
    ],
    rows.map((l) => [
      l.token,
      l.partner.name,
      l.partner.companyName ?? "",
      l.clientName,
      SERVICE_TYPE_LABELS[l.serviceType],
      STAGE_BADGES[l.stage].label,
      l.commissionStatus,
      decimal2(l.totalAmount.toString()),
      decimal2(l.commissionPercent.toString()),
      decimal2(l.commissionAmount.toString()),
      dubaiCsvDate(l.commissionPaidAt),
      l.commissionPaidRef ?? "",
    ])
  );
  return { csv, rowCount: rows.length, truncated };
}
