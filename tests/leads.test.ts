import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createLead,
  listPartnerLeads,
  getPartnerLead,
  updatePartnerProfile,
} from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { AuthError } from "@/lib/auth/session";
import { generateToken, TOKEN_REGEX } from "@/lib/leads/token";
import { createLeadSchema } from "@/lib/schemas";

/** Integration tests against the Neon DEV branch only. */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;
const PREFIX = `leads-test-${randomUUID().slice(0, 8)}`;

let counter = 0;
const email = (label: string) => `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;
const phone = () => `+9715${String(10000000 + counter++).slice(-8)}`;

async function makeUser(role: "CEO" | "PARTNER", label: string, isActive = true) {
  return prisma.user.create({
    data: { role, name: `${label} User`, email: email(label), phone: "+971500000001", companyName: `${label} Co`, isActive },
  });
}

const silentMail = { sendMail: async () => {} };

let partnerA: Awaited<ReturnType<typeof makeUser>>;
let partnerB: Awaited<ReturnType<typeof makeUser>>;
let ceoActor: Awaited<ReturnType<typeof makeUser>>;

const FORBIDDEN_DTO_KEYS = [
  "internalNote",
  "lostReason",
  "lostReasonNote",
  "totalAmount",
  "isPossibleDuplicate",
  "duplicateOfId",
  "firstViewedAt",
  "partnerId",
  "commissionAmount",
  "commissionPercent",
] as const;

RUN("leads: partner token generation (dev branch)", () => {
  beforeAll(async () => {
    if (!IS_DEV) throw new Error("NEON_BRANCH must be dev");
    partnerA = await makeUser("PARTNER", "partnerA");
    partnerB = await makeUser("PARTNER", "partnerB");
    ceoActor = await makeUser("CEO", "ceoActor");
  });

  afterAll(async () => {
    await prisma.leadEvent.deleteMany({ where: { actor: { email: { startsWith: PREFIX } } } });
    await prisma.lead.deleteMany({ where: { partner: { email: { startsWith: PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("token format matches TJ- + 6 chars from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(TOKEN_REGEX);
    }
  });

  it("creates a lead + CREATED event in one go; DTO contains no forbidden keys", async () => {
    const dto = await createLead(
      partnerA,
      { clientName: "Client One", clientPhone: "050 123 4567", serviceType: "MAINLAND_SETUP", requirementNote: "Needs mainland" },
      prisma,
      silentMail
    );
    expect(dto.token).toMatch(TOKEN_REGEX);
    expect(dto.stage).toBe("NEW");
    expect(dto.clientPhone).toBe("+971501234567");
    expect(dto.commission).toEqual({ status: "NOT_SET" });
    for (const key of FORBIDDEN_DTO_KEYS) expect(dto).not.toHaveProperty(key);

    const events = await prisma.leadEvent.findMany({ where: { leadId: dto.id } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("CREATED");
    expect(events[0].actorId).toBe(partnerA.id);

    const detail = await getPartnerLead(partnerA, dto.id);
    for (const key of FORBIDDEN_DTO_KEYS) expect(detail).not.toHaveProperty(key);
    expect(detail.timeline).toHaveLength(1);
    expect(detail.timeline[0].type).toBe("CREATED");
  });

  it("phone cases: AE bare, +971, 00971, +91, +44, +7 accepted as E.164; invalid rejected 400", async () => {
    const cases: Array<[string, string]> = [
      ["050 222 3344", "+971502223344"],
      ["+971 50 222 3345", "+971502223345"],
      ["00971 50 222 3346", "+971502223346"],
      ["+91 98110 12347", "+919811012347"],
      ["+44 20 7946 0958", "+442079460958"],
      ["+7 916 123 4567", "+79161234567"],
    ];
    for (const [input, expected] of cases) {
      const dto = await createLead(partnerA, { clientName: "Phone Case", clientPhone: input, serviceType: "CORPORATE_TAX" }, prisma, silentMail);
      expect(dto.clientPhone).toBe(expected);
    }
    try {
      await createLead(partnerA, { clientName: "Bad", clientPhone: "not-a-number", serviceType: "CORPORATE_TAX" }, prisma, silentMail);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ServiceError).status).toBe(400);
      expect((error as ServiceError).fields?.clientPhone).toBeTruthy();
    }
  });

  it("serviceType validation: only the 5 services are accepted (schema + strict body)", () => {
    for (const ok of ["MAINLAND_SETUP", "FREEZONE_LICENSE", "CORPORATE_TAX", "BANK_ACCOUNT_SETUP", "GOLDEN_VISA"]) {
      expect(createLeadSchema.safeParse({ clientName: "C", clientPhone: "+971501234567", serviceType: ok }).success).toBe(true);
    }
    expect(createLeadSchema.safeParse({ clientName: "C", clientPhone: "+971501234567", serviceType: "VISA" }).success).toBe(false);
    // partnerId (or any server-owned field) sent by the client is rejected outright.
    expect(
      createLeadSchema.safeParse({ clientName: "C", clientPhone: "+971501234567", serviceType: "MAINLAND_SETUP", partnerId: "someone-else" }).success
    ).toBe(false);
    expect(
      createLeadSchema.safeParse({ clientName: "C", clientPhone: "+971501234567", serviceType: "MAINLAND_SETUP", requirementNote: "x".repeat(501) }).success
    ).toBe(false);
  });

  it("same partner + same phone + same service within 90 days is blocked 409 DUPLICATE_LEAD (double-submit safety)", async () => {
    const input = { clientName: "Dup Client", clientPhone: phone(), serviceType: "FREEZONE_LICENSE" as const };
    const first = await createLead(partnerA, input, prisma, silentMail);
    try {
      await createLead(partnerA, input, prisma, silentMail);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ServiceError).status).toBe(409);
      expect((error as ServiceError).code).toBe("DUPLICATE_LEAD");
      expect((error as ServiceError).message).toContain(first.token);
    }
    const count = await prisma.lead.count({ where: { partnerId: partnerA.id, clientPhone: first.clientPhone } });
    expect(count).toBe(1);
    // Different service for the same phone is a new requirement — allowed.
    const other = await createLead(partnerA, { ...input, serviceType: "BANK_ACCOUNT_SETUP" }, prisma, silentMail);
    expect(other.id).not.toBe(first.id);
  });

  it("different partner + same phone: allowed, flagged CEO-side only, never disclosed to the submitter", async () => {
    const sharedPhone = phone();
    const first = await createLead(partnerA, { clientName: "Shared", clientPhone: sharedPhone, serviceType: "GOLDEN_VISA" }, prisma, silentMail);
    const second = await createLead(partnerB, { clientName: "Shared", clientPhone: sharedPhone, serviceType: "MAINLAND_SETUP" }, prisma, silentMail);

    for (const key of FORBIDDEN_DTO_KEYS) expect(second).not.toHaveProperty(key);
    const row = await prisma.lead.findUnique({ where: { id: second.id } });
    expect(row?.isPossibleDuplicate).toBe(true);
    expect(row?.duplicateOfId).toBe(first.id);
    const events = await prisma.leadEvent.findMany({ where: { leadId: second.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.type)).toEqual(["CREATED", "MARKED_DUPLICATE"]);
    // Partner timeline hides the duplicate marker entirely.
    const detail = await getPartnerLead(partnerB, second.id);
    expect(detail.timeline.map((e) => e.type)).toEqual(["CREATED"]);
  });

  it("forced token collision retries and succeeds with a fresh token", async () => {
    const existing = await createLead(partnerA, { clientName: "Collision Seed", clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, silentMail);
    // Force the generator to first redraw the existing token, then a new one.
    const existingBody = existing.token.slice(3);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const forced = [...existingBody, "A", "A", "A", "A", "A", "B"].map((ch) => alphabet.indexOf(ch));
    let calls = 0;
    const dto = await createLead(
      partnerA,
      { clientName: "Collision Retry", clientPhone: phone(), serviceType: "MAINLAND_SETUP" },
      prisma,
      { ...silentMail, nextIndex: () => forced[calls++] ?? 0 }
    );
    expect(dto.token).toBe("TJ-AAAAAB");
    expect(calls).toBe(12);
  });

  it("CEO notification is sent to ALL active CEOs (not inactive), with token + admin link", async () => {
    const ceo1 = await makeUser("CEO", "notify1");
    const ceo2 = await makeUser("CEO", "notify2");
    await makeUser("CEO", "notifyInactive", false);
    const sentTo: string[] = [];
    let subject = "";
    let text = "";
    await createLead(partnerA, { clientName: "Notify Client", clientPhone: "+971 50 777 8899", serviceType: "FREEZONE_LICENSE" }, prisma, {
      sendMail: async (input) => {
        sentTo.push(input.to);
        subject = input.subject;
        text = input.text;
      },
    });
    expect(sentTo).toContain(ceo1.email);
    expect(sentTo).toContain(ceo2.email);
    expect(sentTo).not.toContain(`${PREFIX}-notifyInactive`);
    expect(sentTo.some((e) => e.includes("notifyInactive"))).toBe(false);
    expect(subject).toContain("TJ-");
    expect(text).toContain("/admin/leads/");
    // tel: uses full E.164; wa.me is digits-only (no "+").
    expect(text).toContain("tel:+971507778899");
    expect(text).toContain("https://wa.me/971507778899");
    expect(text).not.toContain("wa.me/+");
  });

  it("CEO notification failure never fails the submission", async () => {
    const dto = await createLead(partnerA, { clientName: "Notify Fail", clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, {
      sendMail: async () => {
        throw new Error("provider down");
      },
    });
    expect(dto.token).toMatch(TOKEN_REGEX);
  });

  it("submit rate limit: the 31st token within an hour is a friendly 429", { timeout: 180_000 }, async () => {
    const rapid = await makeUser("PARTNER", "rapid");
    for (let i = 0; i < 30; i++) {
      await createLead(rapid, { clientName: `Rapid ${i}`, clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, silentMail);
    }
    try {
      await createLead(rapid, { clientName: "Rapid 31", clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, silentMail);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ServiceError).status).toBe(429);
      expect((error as ServiceError).code).toBe("RATE_LIMITED");
    }
  });

  it("partner cannot read another partner's lead (404); lists are own-only; CEO actor is 403", async () => {
    const mine = await createLead(partnerA, { clientName: "Mine Only", clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, silentMail);
    try {
      await getPartnerLead(partnerB, mine.id);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ServiceError).status).toBe(404);
    }
    const listB = await listPartnerLeads(partnerB, { page: 1, pageSize: 50 });
    expect(listB.data.some((l) => l.id === mine.id)).toBe(false);
    for (const op of [
      () => createLead(ceoActor, { clientName: "CEO Lead", clientPhone: phone(), serviceType: "MAINLAND_SETUP" }, prisma, silentMail),
      () => listPartnerLeads(ceoActor, { page: 1, pageSize: 10 }),
      () => getPartnerLead(ceoActor, mine.id),
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

  it("concurrent double-submit: two simultaneous identical submits create exactly one lead (advisory lock)", async () => {
    const racer = await makeUser("PARTNER", "racer");
    const input = { clientName: "Race Client", clientPhone: phone(), serviceType: "MAINLAND_SETUP" as const };
    const results = await Promise.allSettled([
      createLead(racer, input, prisma, silentMail),
      createLead(racer, input, prisma, silentMail),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason as ServiceError;
    expect(reason.status).toBe(409);
    expect(reason.code).toBe("DUPLICATE_LEAD");
    const count = await prisma.lead.count({ where: { partnerId: racer.id } });
    expect(count).toBe(1);
  });

  it("profile update changes phone only, stored E.164", async () => {
    const before = await prisma.user.findUnique({ where: { id: partnerA.id } });
    const updated = await updatePartnerProfile(partnerA, "050 999 8877");
    expect(updated.phone).toBe("+971509998877");
    expect(updated.email).toBe(before?.email);
    expect(updated.name).toBe(before?.name);
  });
});
