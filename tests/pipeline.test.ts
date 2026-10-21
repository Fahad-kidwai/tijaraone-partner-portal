import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createLead,
  transitionLead,
  updateLeadAsCeo,
  markCommissionPaid,
  getCeoLead,
  listCeoLeads,
  getPartnerLead,
  listPartnerLeads,
} from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { AuthError } from "@/lib/auth/session";
import { allowedNext, LEAD_STAGE_VALUES, type LeadStageValue } from "@/lib/leads/stateMachine";
import { generateToken } from "@/lib/leads/token";
import { stageTransitionSchema, markCommissionPaidSchema } from "@/lib/schemas";
import type { Lead, User } from "@prisma/client";

/** Integration tests against the Neon DEV branch only. */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;
const PREFIX = `pipeline-test-${randomUUID().slice(0, 8)}`;

let counter = 0;
const email = (label: string) => `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;
const phone = () => `+97152${String(1000000 + counter++).slice(-7)}`;

let ceo: User;
let partnerA: User;
let partnerB: User;

const silentMail = { sendMail: async () => {} };

async function makeUser(role: "CEO" | "PARTNER", label: string) {
  return prisma.user.create({
    data: { role, name: `${label} User`, email: email(label), phone: "+971500000001", companyName: `${label} Co` },
  });
}

/**
 * Fixture lead inserted directly (not via createLead) so the suite's many
 * leads don't trip the 30/hour submit rate limit; the CREATED event is
 * written just like the service does.
 */
async function freshLead(partner: User, label = "client"): Promise<Lead> {
  const lead = await prisma.lead.create({
    data: {
      token: generateToken(),
      partnerId: partner.id,
      clientName: `${label}-${counter++}`,
      clientPhone: phone(),
      serviceType: "MAINLAND_SETUP",
    },
  });
  await prisma.leadEvent.create({ data: { leadId: lead.id, actorId: partner.id, type: "CREATED", toStage: "NEW" } });
  return lead;
}

/** Drive a lead to a stage directly (test fixture setup only). */
async function leadAt(stage: LeadStageValue, partner: User = partnerA): Promise<Lead> {
  const lead = await freshLead(partner);
  const commissioned = stage === "WON_ADVANCE_TAKEN" || stage === "WON_IN_PROCESS" || stage === "WON_CLOSED";
  return prisma.lead.update({
    where: { id: lead.id },
    data: {
      stage,
      ...(commissioned
        ? {
            totalAmount: "10000.00",
            commissionPercent: "25.00",
            commissionAmount: "2500.00",
            commissionStatus: stage === "WON_CLOSED" ? "PAYABLE" : "EXPECTED",
          }
        : {}),
      ...(stage === "WON_CLOSED" ? { closedAt: new Date() } : {}),
      ...(stage === "LOST" ? { lostReason: "PRICE" } : {}),
    },
  });
}

async function progressToClosed(partner: User): Promise<Lead> {
  const lead = await freshLead(partner);
  await transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, silentMail);
  await transitionLead(
    ceo,
    lead.id,
    { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "9999.99", commissionPercent: "25" },
    prisma,
    silentMail
  );
  await transitionLead(ceo, lead.id, { toStage: "WON_IN_PROCESS", expectedStage: "WON_ADVANCE_TAKEN" }, prisma, silentMail);
  await transitionLead(ceo, lead.id, { toStage: "WON_CLOSED", expectedStage: "WON_IN_PROCESS" }, prisma, silentMail);
  return (await prisma.lead.findUnique({ where: { id: lead.id } }))!;
}

async function expectServiceError(promise: Promise<unknown>, status: number, code?: string): Promise<ServiceError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError);
    const e = error as ServiceError;
    expect(e.status).toBe(status);
    if (code) expect(e.code).toBe(code);
    return e;
  }
  throw new Error("expected the operation to throw");
}

RUN("leads: CEO pipeline + commission (dev branch)", () => {
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

  it(
    "transition matrix: every legal pair succeeds, every illegal pair is 409 INVALID_TRANSITION with allowedNext",
    { timeout: 600_000 },
    async () => {
      for (const from of LEAD_STAGE_VALUES) {
        for (const to of LEAD_STAGE_VALUES) {
          const lead = await leadAt(from);
          const legal = allowedNext(from, "EXPECTED").includes(to);
          const input = {
            toStage: to,
            expectedStage: from,
            ...(to === "WON_ADVANCE_TAKEN" ? { totalAmount: "5000.00" } : {}),
            ...(to === "LOST" ? { lostReason: "PRICE" as const } : {}),
          };
          if (legal) {
            const dto = await transitionLead(ceo, lead.id, input, prisma, silentMail);
            expect(dto.stage).toBe(to);
          } else {
            const err = await expectServiceError(transitionLead(ceo, lead.id, input, prisma, silentMail), 409, "INVALID_TRANSITION");
            expect(err.extra?.allowedNext).toEqual(allowedNext(from, "EXPECTED"));
          }
        }
      }
    }
  );

  it("Advance Taken requires totalAmount; percent defaults to 25; commission computed ROUND_HALF_UP", async () => {
    const lead = await leadAt("WON_ADVANCE_PENDING");
    await expectServiceError(
      transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING" }, prisma, silentMail),
      400
    );
    const dto = await transitionLead(
      ceo,
      lead.id,
      { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "9999.99" },
      prisma,
      silentMail
    );
    expect(dto.commission).toMatchObject({ status: "EXPECTED", totalAmount: "9999.99", percent: "25.00", amount: "2500.00" });
    const events = await prisma.leadEvent.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.type)).toEqual(["CREATED", "STAGE_CHANGED", "COMMISSION_SET"]);

    const penny = await leadAt("WON_ADVANCE_PENDING");
    const pennyDto = await transitionLead(
      ceo,
      penny.id,
      { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "0.02", commissionPercent: "25" },
      prisma,
      silentMail
    );
    expect(pennyDto.commission.amount).toBe("0.01");
  });

  it("percent bounds: 0 and 100.01 rejected by schema, 100 accepted; client-sent commissionAmount rejected 400", async () => {
    const base = { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "100.00" } as const;
    expect(stageTransitionSchema.safeParse({ ...base, commissionPercent: "0" }).success).toBe(false);
    expect(stageTransitionSchema.safeParse({ ...base, commissionPercent: "100.01" }).success).toBe(false);
    expect(stageTransitionSchema.safeParse({ ...base, commissionPercent: "100" }).success).toBe(true);
    expect(stageTransitionSchema.safeParse({ ...base, commissionAmount: "1.00" }).success).toBe(false);
    expect(markCommissionPaidSchema.safeParse({ paidAt: "2026-01-01", commissionAmount: "1.00" }).success).toBe(false);

    const lead = await leadAt("WON_ADVANCE_PENDING");
    const dto = await transitionLead(ceo, lead.id, { ...base, commissionPercent: "100" }, prisma, silentMail);
    expect(dto.commission.amount).toBe("100.00");
  });

  it("money fields on a non-accepting transition are a 400, never silently ignored", async () => {
    const lead = await freshLead(partnerA);
    await expectServiceError(
      transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW", totalAmount: "100.00" }, prisma, silentMail),
      400
    );
    const row = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(row?.stage).toBe("NEW");
    expect(row?.totalAmount).toBeNull();
  });

  it("commission edit before PAID recomputes atomically + COMMISSION_UPDATED with before/after; note edit logs no text", async () => {
    const lead = await leadAt("WON_ADVANCE_TAKEN");
    const dto = await updateLeadAsCeo(ceo, lead.id, { commissionPercent: "20" });
    expect(dto.commission).toMatchObject({ totalAmount: "10000.00", percent: "20.00", amount: "2000.00", status: "EXPECTED" });
    const update = await prisma.leadEvent.findFirst({ where: { leadId: lead.id, type: "COMMISSION_UPDATED" } });
    expect(update?.meta).toMatchObject({
      from: { totalAmount: "10000.00", commissionPercent: "25.00", commissionAmount: "2500.00" },
      to: { totalAmount: "10000.00", commissionPercent: "20.00", commissionAmount: "2000.00" },
    });

    await updateLeadAsCeo(ceo, lead.id, { internalNote: "call after 6pm, vip" });
    const noteEvent = await prisma.leadEvent.findFirst({ where: { leadId: lead.id, type: "NOTE_UPDATED" } });
    expect(JSON.stringify(noteEvent?.meta ?? {})).not.toContain("vip");
    const detail = await getCeoLead(ceo, lead.id);
    expect(detail.internalNote).toBe("call after 6pm, vip");
  });

  it("Lost requires a reason; from a commissioned stage it clears commission with the audit event first; reopen works", async () => {
    const noReason = await leadAt("WON_ADVANCE_TAKEN");
    await expectServiceError(
      transitionLead(ceo, noReason.id, { toStage: "LOST", expectedStage: "WON_ADVANCE_TAKEN" }, prisma, silentMail),
      400
    );

    const lead = await leadAt("WON_IN_PROCESS");
    const dto = await transitionLead(
      ceo,
      lead.id,
      { toStage: "LOST", expectedStage: "WON_IN_PROCESS", lostReason: "NO_RESPONSE", lostReasonNote: "ghosted" },
      prisma,
      silentMail
    );
    expect(dto.stage).toBe("LOST");
    expect(dto.commission).toMatchObject({ status: "NOT_SET", totalAmount: null, percent: null, amount: null });
    const events = await prisma.leadEvent.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    const clearIdx = events.findIndex((e) => e.type === "COMMISSION_SET" && (e.meta as { cleared?: boolean })?.cleared === true);
    const stageIdx = events.findIndex((e) => e.type === "STAGE_CHANGED" && e.toStage === "LOST");
    expect(clearIdx).toBeGreaterThanOrEqual(0);
    expect(stageIdx).toBeGreaterThan(clearIdx);
    expect(events[clearIdx].meta).toMatchObject({ previousTotalAmount: "10000.00", previousAmount: "2500.00" });

    const reopened = await transitionLead(ceo, lead.id, { toStage: "NEW", expectedStage: "LOST" }, prisma, silentMail);
    expect(reopened.stage).toBe("NEW");
    expect(reopened.lostReason).toBeNull();
    const reopenEvent = await prisma.leadEvent.findFirst({ where: { leadId: lead.id, type: "REOPENED" } });
    expect(reopenEvent).toBeTruthy();
  });

  it("closing sets PAYABLE + closedAt; undo-close restores EXPECTED before PAID", async () => {
    const lead = await leadAt("WON_IN_PROCESS");
    const closed = await transitionLead(ceo, lead.id, { toStage: "WON_CLOSED", expectedStage: "WON_IN_PROCESS" }, prisma, silentMail);
    expect(closed.commission.status).toBe("PAYABLE");
    expect(closed.closedAt).not.toBeNull();
    const undone = await transitionLead(ceo, lead.id, { toStage: "WON_IN_PROCESS", expectedStage: "WON_CLOSED" }, prisma, silentMail);
    expect(undone.commission.status).toBe("EXPECTED");
    expect(undone.closedAt).toBeNull();
  });

  it("mark-paid: only from PAYABLE, future date rejected, exactly once, PAID locks money + undo", async () => {
    const notPayable = await leadAt("WON_ADVANCE_TAKEN");
    await expectServiceError(markCommissionPaid(ceo, notPayable.id, { paidAt: "2026-10-01" }, prisma, silentMail), 409);

    const lead = await progressToClosed(partnerA);
    await expectServiceError(markCommissionPaid(ceo, lead.id, { paidAt: "2999-01-01" }, prisma, silentMail), 400);
    const paid = await markCommissionPaid(ceo, lead.id, { paidAt: "2026-10-20", paidRef: "TRX-1" }, prisma, silentMail);
    expect(paid.commission).toMatchObject({ status: "PAID", paidRef: "TRX-1" });
    expect(paid.commission.paidAt).toContain("2026-10-20");

    await expectServiceError(markCommissionPaid(ceo, lead.id, { paidAt: "2026-10-21" }, prisma, silentMail), 409, "COMMISSION_ALREADY_PAID");
    const locked = await expectServiceError(updateLeadAsCeo(ceo, lead.id, { totalAmount: "1.00" }), 409, "COMMISSION_LOCKED");
    expect(locked).toBeTruthy();
    await expectServiceError(
      transitionLead(ceo, lead.id, { toStage: "WON_IN_PROCESS", expectedStage: "WON_CLOSED" }, prisma, silentMail),
      409,
      "INVALID_TRANSITION"
    );
    const payEvents = await prisma.leadEvent.count({ where: { leadId: lead.id, type: "COMMISSION_PAID" } });
    expect(payEvents).toBe(1);
  });

  it("optimistic concurrency: two simultaneous stage changes — exactly one wins, loser gets 409 STALE_STATE", async () => {
    const lead = await freshLead(partnerA);
    const results = await Promise.allSettled([
      transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, silentMail),
      transitionLead(ceo, lead.id, { toStage: "LOST", expectedStage: "NEW", lostReason: "PRICE" }, prisma, silentMail),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    expect(((bad[0] as PromiseRejectedResult).reason as ServiceError).code).toBe("STALE_STATE");
    const row = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(["WON_ADVANCE_PENDING", "LOST"]).toContain(row?.stage);
  });

  it("a failure inside the transition transaction writes nothing (no partial stage/event)", async () => {
    const lead = await leadAt("WON_ADVANCE_PENDING");
    const eventsBefore = await prisma.leadEvent.count({ where: { leadId: lead.id } });
    await expect(
      transitionLead(
        ceo,
        lead.id,
        {
          toStage: "WON_ADVANCE_TAKEN",
          expectedStage: "WON_ADVANCE_PENDING",
          totalAmount: "100.00",
          commissionPercent: "not-a-number",
        },
        prisma,
        silentMail
      )
    ).rejects.toThrow();
    const row = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(row?.stage).toBe("WON_ADVANCE_PENDING");
    expect(row?.totalAmount).toBeNull();
    expect(await prisma.leadEvent.count({ where: { leadId: lead.id } })).toBe(eventsBefore);
  });

  it("partner visibility: forbidden keys absent at EVERY stage; timeline JSON leaks no totalAmount or lostReason", async () => {
    const forbidden = ["totalAmount", "internalNote", "lostReason", "lostReasonNote", "isPossibleDuplicate", "duplicateOfId", "firstViewedAt", "partnerId"];
    const checkDto = async (partner: User, leadId: string) => {
      const detail = await getPartnerLead(partner, leadId);
      const list = await listPartnerLeads(partner, { page: 1, pageSize: 50 });
      const row = list.data.find((l) => l.id === leadId)!;
      for (const key of forbidden) {
        expect(detail).not.toHaveProperty(key);
        expect(row).not.toHaveProperty(key);
      }
      return detail;
    };

    const lead = await freshLead(partnerA);
    await checkDto(partnerA, lead.id);
    await transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, silentMail);
    await checkDto(partnerA, lead.id);
    await transitionLead(
      ceo,
      lead.id,
      { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "9999.99", commissionPercent: "25" },
      prisma,
      silentMail
    );
    const taken = await checkDto(partnerA, lead.id);
    expect(taken.commission).toMatchObject({ status: "EXPECTED", amount: "2500.00", percent: "25.00" });
    await transitionLead(ceo, lead.id, { toStage: "WON_IN_PROCESS", expectedStage: "WON_ADVANCE_TAKEN" }, prisma, silentMail);
    await checkDto(partnerA, lead.id);
    await transitionLead(ceo, lead.id, { toStage: "WON_CLOSED", expectedStage: "WON_IN_PROCESS" }, prisma, silentMail);
    const closed = await checkDto(partnerA, lead.id);
    expect(closed.commission.status).toBe("PAYABLE");
    await markCommissionPaid(ceo, lead.id, { paidAt: "2026-10-20" }, prisma, silentMail);
    const paidDto = await checkDto(partnerA, lead.id);
    expect(paidDto.commission.status).toBe("PAID");
    expect(paidDto.commission).toHaveProperty("paidAt");

    const lost = await leadAt("WON_ADVANCE_TAKEN", partnerA);
    await transitionLead(ceo, lost.id, { toStage: "LOST", expectedStage: "WON_ADVANCE_TAKEN", lostReason: "WENT_ELSEWHERE" }, prisma, silentMail);
    const lostDto = await checkDto(partnerA, lost.id);
    const json = JSON.stringify(lostDto);
    expect(json).not.toContain("9999.99");
    expect(json).not.toContain("10000");
    expect(json).not.toContain("WENT_ELSEWHERE");
    expect(json).not.toContain("lostReason");
    expect(lostDto.timeline.map((e) => e.type)).toEqual(["CREATED", "STAGE_CHANGED"]);

    // Partner B cannot see partner A's commission at all.
    await expectServiceError(getPartnerLead(partnerB, lead.id), 404);
  });

  it("firstViewedAt is stamped on first CEO view only; unattended flag follows the 48h rule", async () => {
    const lead = await freshLead(partnerA);
    const before = await listCeoLeads(ceo, { q: lead.token, page: 1, pageSize: 50 });
    const beforeRow = before.data.find((l) => l.token === lead.token)!;
    expect(beforeRow.unattended).toBe(true);
    expect(beforeRow.firstViewedAt).toBeNull();

    const first = await getCeoLead(ceo, lead.id);
    expect(first.firstViewedAt).not.toBeNull();
    expect(first.unattended).toBe(false);
    const second = await getCeoLead(ceo, lead.id);
    expect(second.firstViewedAt).toBe(first.firstViewedAt);

    await prisma.lead.update({
      where: { id: lead.id },
      data: { createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    const stale = await getCeoLead(ceo, lead.id);
    expect(stale.unattended).toBe(true);
  });

  it("duplicate badge exists only in CEO DTOs", async () => {
    const dupA = await makeUser("PARTNER", "dupA");
    const dupB = await makeUser("PARTNER", "dupB");
    const shared = phone();
    await createLead(dupA, { clientName: "Shared", clientPhone: shared, serviceType: "GOLDEN_VISA" }, prisma, silentMail);
    const secondDto = await createLead(dupB, { clientName: "Shared", clientPhone: shared, serviceType: "GOLDEN_VISA" }, prisma, silentMail);
    const ceoList = await listCeoLeads(ceo, { q: secondDto.token, page: 1, pageSize: 5 });
    expect(ceoList.data[0].isPossibleDuplicate).toBe(true);
    expect(ceoList.data[0].duplicateOfId).toBeTruthy();
    const partnerList = await listPartnerLeads(dupB, { page: 1, pageSize: 50 });
    expect(partnerList.data.find((l) => l.id === secondDto.id)).not.toHaveProperty("isPossibleDuplicate");
  });

  it("partner notification emails fire on Advance Taken, Closed and Paid ONLY, with no internal data; failures don't fail actions", async () => {
    const sent: Array<{ to: string; subject: string; text: string }> = [];
    const capture = {
      sendMail: async (input: { to: string; subject: string; html: string; text: string }) => {
        sent.push(input);
      },
    };
    const lead = await freshLead(partnerA);
    await transitionLead(ceo, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, capture);
    expect(sent).toHaveLength(0);
    await transitionLead(
      ceo,
      lead.id,
      { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "10000.00", commissionPercent: "25" },
      prisma,
      capture
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(partnerA.email);
    expect(sent[0].text).toContain(lead.token);
    expect(sent[0].text).toContain("AED 2,500.00");
    expect(sent[0].text).not.toContain("10000");
    await transitionLead(ceo, lead.id, { toStage: "WON_IN_PROCESS", expectedStage: "WON_ADVANCE_TAKEN" }, prisma, capture);
    expect(sent).toHaveLength(1);
    await transitionLead(ceo, lead.id, { toStage: "WON_CLOSED", expectedStage: "WON_IN_PROCESS" }, prisma, capture);
    expect(sent).toHaveLength(2);
    await markCommissionPaid(ceo, lead.id, { paidAt: "2026-10-20" }, prisma, capture);
    expect(sent).toHaveLength(3);
    expect(sent[2].text).toContain("Commission paid");

    const failLead = await freshLead(partnerA);
    await transitionLead(ceo, failLead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, capture);
    const dto = await transitionLead(
      ceo,
      failLead.id,
      { toStage: "WON_ADVANCE_TAKEN", expectedStage: "WON_ADVANCE_PENDING", totalAmount: "100.00" },
      prisma,
      {
        sendMail: async () => {
          throw new Error("provider down");
        },
      }
    );
    expect(dto.stage).toBe("WON_ADVANCE_TAKEN");
  });

  it("partners get 403 on every CEO pipeline operation", async () => {
    const lead = await freshLead(partnerA);
    for (const op of [
      () => transitionLead(partnerA, lead.id, { toStage: "WON_ADVANCE_PENDING", expectedStage: "NEW" }, prisma, silentMail),
      () => updateLeadAsCeo(partnerA, lead.id, { internalNote: "x" }),
      () => markCommissionPaid(partnerA, lead.id, { paidAt: "2026-10-20" }, prisma, silentMail),
      () => getCeoLead(partnerA, lead.id),
      () => listCeoLeads(partnerA, { page: 1, pageSize: 5 }),
    ]) {
      try {
        await op();
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).status).toBe(403);
      }
    }
  });
});
