import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  getCeoOverview,
  getPartnerOverview,
  listCommissions,
  getPartnerCommissions,
  buildLeadsCsv,
  buildCommissionsCsv,
  EXPORT_ROW_CAP,
} from "@/lib/insights/service";
import { escapeCsvCell, buildCsv } from "@/lib/insights/csv";
import { dubaiMonthBoundsUtc, dubaiMonthKeyBounds } from "@/lib/time";
import { generateToken } from "@/lib/leads/token";
import { AuthError } from "@/lib/auth/session";
import type { User } from "@prisma/client";

/** Integration tests against the Neon DEV branch only. */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;
const PREFIX = `insights-test-${randomUUID().slice(0, 8)}`;

let counter = 0;
const email = (label: string) => `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;

let ceo: User;
let partnerA: User;
let partnerB: User;

async function makeUser(role: "CEO" | "PARTNER", label: string) {
  return prisma.user.create({
    data: { role, name: `${label} User`, email: email(label), phone: "+971500000001", companyName: `${label} Co` },
  });
}

interface FixtureLead {
  stage?: string;
  createdAt?: Date;
  stageChangedAt?: Date;
  closedAt?: Date | null;
  firstViewedAt?: Date | null;
  totalAmount?: string;
  commissionPercent?: string;
  commissionAmount?: string;
  commissionStatus?: string;
  commissionPaidAt?: Date | null;
  commissionPaidRef?: string | null;
  clientName?: string;
  internalNote?: string | null;
}

async function fixtureLead(partner: User, fx: FixtureLead = {}) {
  return prisma.lead.create({
    data: {
      token: generateToken(),
      partnerId: partner.id,
      clientName: fx.clientName ?? `Fixture ${counter++}`,
      clientPhone: "+971501112233",
      serviceType: "MAINLAND_SETUP",
      stage: (fx.stage ?? "NEW") as never,
      createdAt: fx.createdAt ?? new Date(),
      stageChangedAt: fx.stageChangedAt ?? fx.createdAt ?? new Date(),
      closedAt: fx.closedAt ?? null,
      firstViewedAt: fx.firstViewedAt ?? null,
      totalAmount: fx.totalAmount ?? null,
      commissionPercent: fx.commissionPercent ?? null,
      commissionAmount: fx.commissionAmount ?? null,
      commissionStatus: (fx.commissionStatus ?? "NOT_SET") as never,
      commissionPaidAt: fx.commissionPaidAt ?? null,
      commissionPaidRef: fx.commissionPaidRef ?? null,
      internalNote: fx.internalNote ?? null,
    },
  });
}

const AED = (s: string) => Number(s);

RUN("insights: dashboards, ledger, exports (dev branch)", () => {
  beforeAll(async () => {
    if (!IS_DEV) throw new Error("NEON_BRANCH must be dev");
    ceo = await makeUser("CEO", "ceo");
    partnerA = await makeUser("PARTNER", "partnerA");
    partnerB = await makeUser("PARTNER", "partnerB");
  });

  afterAll(async () => {
    await prisma.leadEvent.deleteMany({ where: { actor: { email: { startsWith: PREFIX } } } });
    await prisma.lead.deleteMany({ where: { partner: { email: { startsWith: PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("Dubai month bounds: 23:59 and 00:01 Dubai on month edges land in the right months (UTC differs)", () => {
    // 2026-10-31 23:59 Dubai = 19:59 UTC, still October in Dubai.
    const oct = dubaiMonthBoundsUtc(new Date("2026-10-31T19:59:00.000Z"));
    expect(oct.start.toISOString()).toBe("2026-09-30T20:00:00.000Z");
    expect(oct.end.toISOString()).toBe("2026-10-31T20:00:00.000Z");
    // 2026-11-01 00:01 Dubai = 2026-10-31 20:01 UTC, November in Dubai.
    const nov = dubaiMonthBoundsUtc(new Date("2026-10-31T20:01:00.000Z"));
    expect(nov.start.toISOString()).toBe("2026-10-31T20:00:00.000Z");
    expect(nov.end.toISOString()).toBe("2026-11-30T20:00:00.000Z");
    const key = dubaiMonthKeyBounds("2026-11");
    expect(key.start.toISOString()).toBe("2026-10-31T20:00:00.000Z");
  });

  it("CEO overview aggregates move correctly with fixture data (deltas, division-by-zero safe)", async () => {
    const before = await getCeoOverview(ceo);
    const now = new Date();
    const month = dubaiMonthBoundsUtc(now);

    await fixtureLead(partnerA, { stage: "NEW" });
    await fixtureLead(partnerA, { stage: "NEW", createdAt: new Date(now.getTime() - 72 * 3600_000) });
    // Closed this Dubai month (00:01 Dubai on the 1st = 20:01 UTC prev day).
    await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      closedAt: new Date(month.start.getTime() + 60_000),
      totalAmount: "10000.00",
      commissionPercent: "25.00",
      commissionAmount: "2500.00",
      commissionStatus: "PAYABLE",
    });
    // Closed LAST Dubai month — must not count in won-this-month.
    await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      closedAt: new Date(month.start.getTime() - 60_000),
      totalAmount: "4000.00",
      commissionPercent: "25.00",
      commissionAmount: "1000.00",
      commissionStatus: "PAYABLE",
    });
    // Decided 89 days ago counts in the 90d window; 91 days ago does not.
    await fixtureLead(partnerB, { stage: "LOST", stageChangedAt: new Date(now.getTime() - 89 * 86400_000) });
    await fixtureLead(partnerB, { stage: "LOST", stageChangedAt: new Date(now.getTime() - 91 * 86400_000) });

    const after = await getCeoOverview(ceo);
    expect(after.kpis.awaitingAction - before.kpis.awaitingAction).toBe(2);
    expect(after.kpis.wonThisMonth - before.kpis.wonThisMonth).toBe(1);
    expect(AED(after.kpis.commissionPayable) - AED(before.kpis.commissionPayable)).toBeCloseTo(3500, 2);
    expect(after.kpis.conversion90d.decided - before.kpis.conversion90d.decided).toBe(3); // 2 won closes + 1 lost (89d); the 91d lost is outside
    expect(after.kpis.conversion90d.won - before.kpis.conversion90d.won).toBe(2);
    expect(after.kpis.conversion90d.percent === null || Number(after.kpis.conversion90d.percent) >= 0).toBe(true);

    const stageDelta = (stage: string) =>
      (after.stageCounts.find((s) => s.stage === stage)?.count ?? 0) - (before.stageCounts.find((s) => s.stage === stage)?.count ?? 0);
    expect(stageDelta("NEW")).toBe(2);
    expect(stageDelta("WON_CLOSED")).toBe(2);
    expect(stageDelta("LOST")).toBe(2);

    const top = after.topPartners.find((p) => p.partnerId === partnerA.id);
    expect(top).toMatchObject({ leads: 4, won: 2 });

    const attentionTokens = after.needsAttention.map((l) => l.token);
    expect(attentionTokens.length).toBeGreaterThan(0);
  });

  it("needs-attention lists the oldest stale NEW leads first", async () => {
    const older = await fixtureLead(partnerA, { stage: "NEW", createdAt: new Date(Date.now() - 96 * 3600_000) });
    const newer = await fixtureLead(partnerA, { stage: "NEW", createdAt: new Date(Date.now() - 50 * 3600_000) });
    const overview = await getCeoOverview(ceo);
    const tokens = overview.needsAttention.map((l) => l.token);
    const olderIdx = tokens.indexOf(older.token);
    const newerIdx = tokens.indexOf(newer.token);
    if (olderIdx !== -1 && newerIdx !== -1) expect(olderIdx).toBeLessThan(newerIdx);
    else expect(tokens).toContain(older.token); // top-5 cut may drop the newer one
  });

  it("partner overview: own data only, forbidden keys absent, B unaffected by A", async () => {
    const aOverview = await getPartnerOverview(partnerA);
    const bOverview = await getPartnerOverview(partnerB);
    expect(aOverview.kpis.tokensTotal).toBeGreaterThanOrEqual(4);
    expect(bOverview.kpis.tokensTotal).toBe(2); // only B's two LOST fixtures
    expect(bOverview.kpis.wonClosed).toBe(0);
    const json = JSON.stringify(bOverview);
    for (const key of ["totalAmount", "internalNote", "lostReason", "isPossibleDuplicate", "duplicateOfId", "firstViewedAt"]) {
      expect(json).not.toContain(`"${key}"`);
    }
    const commissions = await getPartnerCommissions(partnerB);
    expect(commissions.data).toHaveLength(0);
    expect(commissions.totals).toEqual({ expected: "0.00", payable: "0.00", paid: "0.00" });
  });

  it("commissions ledger: month rule (paid month vs closed month), totals, and overview payable consistency", async () => {
    const month = "2026-09";
    const bounds = dubaiMonthKeyBounds(month);
    // Paid in September (closed in August): belongs to September by PAID rule.
    await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      closedAt: new Date("2026-08-10T08:00:00.000Z"),
      commissionPaidAt: new Date(bounds.start.getTime() + 5 * 86400_000),
      totalAmount: "8000.00",
      commissionPercent: "25.00",
      commissionAmount: "2000.00",
      commissionStatus: "PAID",
      commissionPaidRef: "REF-SEP",
    });
    // Payable, closed in September: belongs by CLOSED rule.
    await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      closedAt: new Date(bounds.start.getTime() + 2 * 86400_000),
      totalAmount: "4000.00",
      commissionPercent: "25.00",
      commissionAmount: "1000.00",
      commissionStatus: "PAYABLE",
    });
    // Paid in October: excluded from September.
    await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      closedAt: new Date("2026-09-10T08:00:00.000Z"),
      commissionPaidAt: new Date("2026-10-03T08:00:00.000Z"),
      totalAmount: "4000.00",
      commissionPercent: "25.00",
      commissionAmount: "1000.00",
      commissionStatus: "PAID",
    });

    const september = await listCommissions(ceo, { partnerId: partnerA.id, month, page: 1, pageSize: 50 });
    // 3 rows: this test's Sep-paid + Sep-closed-payable, PLUS the earlier
    // test's "last Dubai month" close (23:59 Dubai on Sep 30) — also Sep.
    expect(september.data).toHaveLength(3);
    expect(september.data.map((r) => r.status).sort()).toEqual(["PAID", "PAYABLE", "PAYABLE"]);
    expect(september.totals.paid.amount).toBe("2000.00");
    expect(september.totals.payable.amount).toBe("2000.00");

    const paidOnly = await listCommissions(ceo, { status: "paid", partnerId: partnerA.id, page: 1, pageSize: 1 });
    expect(paidOnly.data).toHaveLength(1);
    expect(paidOnly.total).toBe(2);

    // KPI equals the (unfiltered) ledger PAYABLE total for the same data.
    const overview = await getCeoOverview(ceo);
    const ledger = await listCommissions(ceo, { status: "payable", page: 1, pageSize: 1 });
    expect(ledger.totals.payable.amount).toBe(overview.kpis.commissionPayable);
  });

  it("CSV unit rules: BOM, formula-injection prefixes, quoting", () => {
    expect(buildCsv(["A"], [["x"]]).charCodeAt(0)).toBe(0xfeff);
    expect(escapeCsvCell("=2+5")).toBe("'=2+5");
    expect(escapeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(escapeCsvCell("-cmd")).toBe("'-cmd");
    expect(escapeCsvCell("@mention")).toBe("'@mention");
    expect(escapeCsvCell("\tTabbed")).toBe("'\tTabbed");
    expect(escapeCsvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(escapeCsvCell("plain")).toBe("plain");
  });

  it("leads CSV: escaping applied, internal note never included, filters honoured", async () => {
    const nasty = await fixtureLead(partnerA, {
      stage: "WON_CLOSED",
      clientName: '=HACK, "Co"\nLtd',
      closedAt: new Date(),
      totalAmount: "10000.00",
      commissionPercent: "25.00",
      commissionAmount: "2500.00",
      commissionStatus: "PAYABLE",
      internalNote: "SECRET-NOTE-TEXT",
    });
    const { csv, rowCount, truncated } = await buildLeadsCsv(ceo, { partnerId: partnerA.id });
    expect(truncated).toBe(false);
    expect(rowCount).toBeGreaterThan(0);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(nasty.token);
    expect(csv).toContain("'=HACK");
    expect(csv).toContain("2500.00");
    expect(csv).not.toContain("SECRET-NOTE-TEXT");
    expect(csv.split("\r\n")[0]).not.toContain("Internal");

    const none = await buildLeadsCsv(ceo, { partnerId: "no-such-partner" });
    expect(none.rowCount).toBe(0);

    try {
      await buildLeadsCsv(partnerA, {});
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(403);
    }
  });

  it("commissions CSV honours the month filter; partner actor is 403", async () => {
    const { csv, rowCount } = await buildCommissionsCsv(ceo, { partnerId: partnerA.id, month: "2026-09" });
    expect(rowCount).toBe(3); // includes the earlier 23:59-Dubai Sep 30 close
    expect(csv).toContain("REF-SEP");
    try {
      await buildCommissionsCsv(partnerA, {});
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as AuthError).status).toBe(403);
    }
  });

  it("export row cap truncates at 10,000 with the truncated flag", { timeout: 300_000 }, async () => {
    expect(EXPORT_ROW_CAP).toBe(10_000);
    const bulk = await makeUser("PARTNER", "bulk");
    const rows = Array.from({ length: EXPORT_ROW_CAP + 5 }, () => ({
      token: generateToken(),
      partnerId: bulk.id,
      clientName: "Bulk",
      clientPhone: "+971501112233",
      serviceType: "MAINLAND_SETUP" as const,
    }));
    // Tokens must be unique; regenerate any accidental duplicates.
    const seen = new Set<string>();
    for (const r of rows) {
      while (seen.has(r.token)) r.token = generateToken();
      seen.add(r.token);
    }
    await prisma.lead.createMany({ data: rows });
    const result = await buildLeadsCsv(ceo, { partnerId: bulk.id });
    expect(result.truncated).toBe(true);
    expect(result.rowCount).toBe(EXPORT_ROW_CAP);
  });
});
