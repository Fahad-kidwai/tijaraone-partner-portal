import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createPartner, listPartners, getPartner, updatePartner, ServiceError } from "@/lib/partners/service";
import { signSession, getSessionUser, AuthError } from "@/lib/auth/session";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { createPartnerSchema, updatePartnerSchema } from "@/lib/schemas";

/** Integration tests against the Neon DEV branch only. */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;
const PREFIX = `partners-test-${randomUUID().slice(0, 8)}`;

let ceo: Awaited<ReturnType<typeof prisma.user.create>>;
let counter = 0;
const email = (label: string) => `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;

async function makeCeo() {
  return prisma.user.create({
    data: { role: "CEO", name: "Test CEO", email: email("ceo"), phone: "+971500000001", companyName: null },
  });
}

const noWelcome = { sendWelcome: async () => {} };

RUN("partners: CEO partner management (dev branch)", () => {
  beforeAll(async () => {
    if (!IS_DEV) throw new Error("NEON_BRANCH must be dev");
    ceo = await makeCeo();
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { partner: { email: { startsWith: PREFIX } } } });
    await prisma.leadEvent.deleteMany({ where: { actor: { email: { startsWith: PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("CEO creates a partner; DTO has no sessionVersion; welcome can be captured", async () => {
    let welcomed = "";
    const rawEmail = `  ${PREFIX}.One+Ref@Gmail.COM `;
    const expectedEmail = `${PREFIX.toLowerCase()}.one+ref@gmail.com`;
    const partner = await createPartner(
      ceo,
      { name: "Gmail Partner", email: rawEmail, phone: "+971 50 123 4567", companyName: "Advisory LLC", sendWelcomeEmail: true },
      prisma,
      { sendWelcome: async (to) => { welcomed = to; } }
    );
    expect(partner.email).toBe(expectedEmail);
    expect(partner.phone).toBe("+971501234567");
    expect(partner.role).toBe("PARTNER");
    expect(partner).not.toHaveProperty("sessionVersion");
    expect(partner.welcomeEmailFailed).toBe(false);
    expect(welcomed).toBe(expectedEmail);
    const row = await prisma.user.findUnique({ where: { email: partner.email } });
    expect(row?.createdById).toBe(ceo.id);
  });

  it("duplicate email (incl. an existing CEO email) is a 409 with a field error", async () => {
    const e = email("dup");
    await createPartner(ceo, { name: "First", email: e, phone: "+971501111111", companyName: "One", sendWelcomeEmail: false }, prisma, noWelcome);
    for (const dupe of [e, ceo.email]) {
      try {
        await createPartner(ceo, { name: "Second", email: dupe, phone: "+971502222222", companyName: "Two", sendWelcomeEmail: false }, prisma, noWelcome);
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).status).toBe(409);
        expect((error as ServiceError).fields?.email).toBeTruthy();
      }
    }
  });

  it("a PARTNER actor is rejected from every partner-management operation (403)", async () => {
    const partnerUser = await prisma.user.create({
      data: { role: "PARTNER", name: "Intruder", email: email("intruder"), phone: "+971503333333", companyName: "X" },
    });
    const ops = [
      () => listPartners(partnerUser, { page: 1, pageSize: 10 }),
      () => createPartner(partnerUser, { name: "N", email: email("n"), phone: "+971504444444", companyName: "Y", sendWelcomeEmail: false }, prisma, noWelcome),
      () => getPartner(partnerUser, partnerUser.id),
      () => updatePartner(partnerUser, partnerUser.id, { name: "Hacked" }),
    ];
    for (const op of ops) {
      try {
        await op();
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).status).toBe(403);
      }
    }
  });

  it("unknown partner id is a 404 (and CEO ids are not partner-manageable)", async () => {
    for (const id of ["nonexistent-id", ceo.id]) {
      try {
        await getPartner(ceo, id);
        expect.unreachable("should have thrown");
      } catch (error) {
        expect((error as ServiceError).status).toBe(404);
      }
    }
  });

  it("deactivation bumps sessionVersion and kills the partner's live session; reactivation works", async () => {
    const created = await createPartner(
      ceo,
      { name: "Session Partner", email: email("session"), phone: "+971505555555", companyName: "S", sendWelcomeEmail: false },
      prisma,
      noWelcome
    );
    const row = await prisma.user.findUnique({ where: { id: created.id } });
    const token = await signSession({ id: created.id, role: "PARTNER", sessionVersion: row!.sessionVersion });
    expect((await getSessionUser(token))?.id).toBe(created.id);

    const deactivated = await updatePartner(ceo, created.id, { isActive: false });
    expect(deactivated.isActive).toBe(false);
    expect(await getSessionUser(token)).toBeNull();

    const reactivated = await updatePartner(ceo, created.id, { isActive: true });
    expect(reactivated.isActive).toBe(true);
  });

  it("list search + lead stats are accurate, and there is no delete operation", async () => {
    const created = await createPartner(
      ceo,
      { name: "Stats Partner", email: email("stats"), phone: "+971506666666", companyName: "StatsCo", sendWelcomeEmail: false },
      prisma,
      noWelcome
    );
    await prisma.lead.createMany({
      data: [
        { token: `TJ-${randomUUID().slice(0, 6).toUpperCase()}A`, partnerId: created.id, clientName: "Client A", clientPhone: "+971501010101", serviceType: "MAINLAND_SETUP", stage: "WON_CLOSED" },
        { token: `TJ-${randomUUID().slice(0, 6).toUpperCase()}B`, partnerId: created.id, clientName: "Client B", clientPhone: "+971502020202", serviceType: "GOLDEN_VISA", stage: "NEW" },
      ],
    });
    const found = await listPartners(ceo, { q: "StatsCo", page: 1, pageSize: 10 });
    expect(found.total).toBe(1);
    expect(found.data[0].stats).toMatchObject({ totalLeads: 2, wonLeads: 1 });
    const hidden = await listPartners(ceo, { q: "StatsCo", includeInactive: false, page: 1, pageSize: 10 });
    await updatePartner(ceo, created.id, { isActive: false });
    const afterDeactivate = await listPartners(ceo, { q: "StatsCo", page: 1, pageSize: 10 });
    expect(afterDeactivate.total).toBe(0);
    const withInactive = await listPartners(ceo, { q: "StatsCo", includeInactive: true, page: 1, pageSize: 10 });
    expect(withInactive.total).toBe(1);
    expect(hidden.total).toBe(1);
    const service = await import("@/lib/partners/service");
    expect((service as Record<string, unknown>).deletePartner).toBeUndefined();
  });

  it("welcome email failure never fails creation and flags welcomeEmailFailed for the CEO warning", async () => {
    const partner = await createPartner(
      ceo,
      { name: "No Welcome", email: email("welcome-fail"), phone: "+971507777777", companyName: "W", sendWelcomeEmail: true },
      prisma,
      {
        sendWelcome: async () => {
          throw new Error("provider down");
        },
      }
    );
    expect(partner.id).toBeTruthy();
    expect(partner.welcomeEmailFailed).toBe(true);
    const row = await prisma.user.findUnique({ where: { email: partner.email } });
    expect(row?.role).toBe("PARTNER");
  });

  it("changing a partner's email bumps sessionVersion, kills the old session, and logs masked emails only", async () => {
    const created = await createPartner(
      ceo,
      { name: "Email Change", email: email("email-change"), phone: "+971508888888", companyName: "E", sendWelcomeEmail: false },
      prisma,
      noWelcome
    );
    const before = await prisma.user.findUnique({ where: { id: created.id } });
    const token = await signSession({ id: created.id, role: "PARTNER", sessionVersion: before!.sessionVersion });
    expect((await getSessionUser(token))?.id).toBe(created.id);

    const newEmail = email("email-changed");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    let logged = "";
    try {
      const updated = await updatePartner(ceo, created.id, { email: `  ${newEmail.toUpperCase()} ` });
      expect(updated.email).toBe(newEmail);
      logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    } finally {
      logSpy.mockRestore();
    }
    const after = await prisma.user.findUnique({ where: { id: created.id } });
    expect(after!.sessionVersion).toBe(before!.sessionVersion + 1);
    expect(await getSessionUser(token)).toBeNull();
    expect(logged).toContain("admin.partner_email_changed");
    expect(logged).toContain("***@");
    expect(logged).not.toContain(created.email);
    expect(logged).not.toContain(newEmail);
  });

  it("a reactivated partner can OTP-log-in again (and cannot while deactivated)", async () => {
    const created = await createPartner(
      ceo,
      { name: "Reactivation", email: email("reactivate"), phone: "+971509999999", companyName: "R", sendWelcomeEmail: false },
      prisma,
      noWelcome
    );
    const captured: string[] = [];
    const otpDeps = {
      sendOtp: async (_to: string, code: string) => {
        captured.push(code);
      },
      minResponseMs: 0,
      sleep: async () => {},
    };

    await updatePartner(ceo, created.id, { isActive: false });
    await requestOtp(created.email, null, otpDeps);
    expect(captured).toHaveLength(0);

    await updatePartner(ceo, created.id, { isActive: true });
    await requestOtp(created.email, null, otpDeps);
    expect(captured).toHaveLength(1);
    const result = await verifyOtp(created.email, captured[0]);
    expect(result.ok).toBe(true);
  });

  it("schemas reject role escalation fields (strict)", () => {
    expect(() => updatePartnerSchema.parse({ role: "CEO" })).toThrow();
    expect(() =>
      createPartnerSchema.parse({ name: "N", email: "n@example.com", phone: "+971501234567", companyName: "C", role: "CEO" })
    ).toThrow();
  });
});
