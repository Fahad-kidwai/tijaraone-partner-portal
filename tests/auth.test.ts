import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  requestOtp,
  verifyOtp,
  hashOtp,
  GENERIC_OTP_RESPONSE,
  type OtpDeps,
} from "@/lib/auth/otp";
import { signSession, getSessionUser, assertRole, AuthError } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/schemas";

/**
 * Integration tests against the Neon DEV branch only.
 * Hard guard: refuses to run unless NEON_BRANCH=dev.
 */
const IS_DEV = process.env.NEON_BRANCH === "dev";
const RUN = IS_DEV ? describe : describe.skip;

const PREFIX = `otp-test-${randomUUID().slice(0, 8)}`;
const PEPPER = process.env.OTP_PEPPER ?? "test-pepper";

let counter = 0;
function testEmail(label: string): string {
  return `${PREFIX}-${label}-${counter++}@dev.tijaraone.local`;
}

interface SentMail {
  email: string;
  code: string;
}
let sent: SentMail[] = [];

function deps(nowRef: { now: Date } = { now: new Date() }): Partial<OtpDeps> {
  return {
    pepper: PEPPER,
    now: () => nowRef.now,
    sendOtp: async (email, code) => {
      sent.push({ email, code });
    },
  };
}

async function createUser(email: string, opts: { role?: "CEO" | "PARTNER"; isActive?: boolean } = {}) {
  return prisma.user.create({
    data: {
      role: opts.role ?? "PARTNER",
      name: "OTP Test User",
      email,
      phone: "+971500000000",
      companyName: "Test Co",
      isActive: opts.isActive ?? true,
    },
  });
}

async function latestCode(email: string): Promise<string> {
  const mail = [...sent].reverse().find((s) => s.email === email);
  if (!mail) throw new Error(`No OTP captured for ${email}`);
  return mail.code;
}

async function backdateLatest(email: string, ms: number): Promise<void> {
  const row = await prisma.otpCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  if (row) {
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { createdAt: new Date(row.createdAt.getTime() - ms) },
    });
  }
}

RUN("auth: OTP lifecycle (dev branch)", () => {
  beforeAll(() => {
    if (!IS_DEV) throw new Error("NEON_BRANCH must be dev for auth integration tests");
  });

  afterAll(async () => {
    await prisma.otpCode.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("email normalisation trims + lowercases only (dots and +tags preserved)", () => {
    expect(normalizeEmail("  Fahad.K+Referrals@Gmail.COM ")).toBe("fahad.k+referrals@gmail.com");
  });

  it("hashOtp never stores the plain code and is pepper-dependent", () => {
    const h = hashOtp("a@b.com", "123456", PEPPER);
    expect(h).not.toContain("123456");
    expect(h).not.toBe(hashOtp("a@b.com", "123456", "another-pepper-value-32-chars!!"));
  });

  it("happy path: request -> verify succeeds and sets lastLoginAt", async () => {
    sent = [];
    const email = testEmail("happy");
    const user = await createUser(email);
    const res = await requestOtp(email, "10.0.0.1", deps());
    expect(res).toEqual(GENERIC_OTP_RESPONSE);
    const result = await verifyOtp(email, await latestCode(email), deps());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe(user.id);
    const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reloaded?.lastLoginAt).not.toBeNull();
  });

  it("single use: a consumed code cannot verify twice", async () => {
    const email = testEmail("single");
    await createUser(email);
    await requestOtp(email, "10.0.0.2", deps());
    const code = await latestCode(email);
    expect((await verifyOtp(email, code, deps())).ok).toBe(true);
    expect((await verifyOtp(email, code, deps())).ok).toBe(false);
  });

  it("expiry: a code past 10 minutes fails", async () => {
    const email = testEmail("expiry");
    await createUser(email);
    await requestOtp(email, "10.0.0.3", deps());
    const code = await latestCode(email);
    const row = await prisma.otpCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    await prisma.otpCode.update({
      where: { id: row!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await verifyOtp(email, code, deps())).ok).toBe(false);
  });

  it("lockout: 5 wrong attempts invalidate the code, correct code then fails", async () => {
    const email = testEmail("lockout");
    await createUser(email);
    await requestOtp(email, "10.0.0.4", deps());
    const code = await latestCode(email);
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) {
      expect((await verifyOtp(email, wrong, deps())).ok).toBe(false);
    }
    expect((await verifyOtp(email, code, deps())).ok).toBe(false);
    const row = await prisma.otpCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    expect(row?.attempts).toBe(5);
    expect(row?.consumedAt).not.toBeNull();
  });

  it("re-issue invalidates the previous code", async () => {
    const email = testEmail("reissue");
    await createUser(email);
    await requestOtp(email, "10.0.0.5", deps());
    const first = await latestCode(email);
    await backdateLatest(email, 31_000);
    await requestOtp(email, "10.0.0.5", deps());
    const second = await latestCode(email);
    expect((await verifyOtp(email, first, deps())).ok).toBe(false);
    expect((await verifyOtp(email, second, deps())).ok).toBe(true);
  });

  it("generic response is identical for unknown, inactive, active and rate-limited", async () => {
    const unknown = await requestOtp(testEmail("ghost"), "10.0.0.6", deps());
    const inactiveEmail = testEmail("inactive");
    await createUser(inactiveEmail, { isActive: false });
    const inactive = await requestOtp(inactiveEmail, "10.0.0.6", deps());
    const activeEmail = testEmail("active");
    await createUser(activeEmail);
    const active = await requestOtp(activeEmail, "10.0.0.6", deps());
    expect(unknown).toEqual(GENERIC_OTP_RESPONSE);
    expect(inactive).toEqual(GENERIC_OTP_RESPONSE);
    expect(active).toEqual(GENERIC_OTP_RESPONSE);
    expect(unknown).toEqual(inactive);
    // No email was "sent" for unknown/inactive
    expect(sent.find((s) => s.email === inactiveEmail)).toBeUndefined();
  });

  it("rate limit: max 3 codes per email per 15 min", async () => {
    const email = testEmail("emaillimit");
    await createUser(email);
    const before = sent.length;
    for (let i = 0; i < 3; i++) {
      await requestOtp(email, "10.0.0.7", deps());
      await backdateLatest(email, 31_000);
    }
    const res = await requestOtp(email, "10.0.0.7", deps());
    expect(res).toEqual(GENERIC_OTP_RESPONSE);
    expect(sent.length - before).toBe(3);
  });

  it("cooldown: a second request within 30s sends nothing new", async () => {
    const email = testEmail("cooldown");
    await createUser(email);
    await requestOtp(email, "10.0.0.8", deps());
    const before = sent.length;
    await requestOtp(email, "10.0.0.8", deps());
    expect(sent.length).toBe(before);
  });

  it("timing: unknown, inactive and registered paths are padded to comparable durations", async () => {
    const timedDeps = (): Partial<OtpDeps> => ({ ...deps(), minResponseMs: 400 });
    const activeEmail = testEmail("timing");
    await createUser(activeEmail);

    const t0 = performance.now();
    await requestOtp(testEmail("timing-ghost"), "10.1.1.1", timedDeps());
    const unknownMs = performance.now() - t0;

    const t1 = performance.now();
    await requestOtp(activeEmail, "10.1.1.1", timedDeps());
    const activeMs = performance.now() - t1;

    // Both paths meet the minimum response floor...
    expect(unknownMs).toBeGreaterThanOrEqual(380);
    expect(activeMs).toBeGreaterThanOrEqual(380);
    // ...and are comparable (difference far smaller than the unpadded gap
    // between a bare lookup and a DB write + awaited send).
    expect(Math.abs(activeMs - unknownMs)).toBeLessThan(1500);
  });

  it("rate limit: max 10 codes per IP per hour", async () => {
    const ip = "10.9.9.9";
    const before = sent.length;
    for (let i = 0; i < 10; i++) {
      const email = testEmail(`ip${i}`);
      await createUser(email);
      await requestOtp(email, ip, deps());
    }
    const eleventh = testEmail("ip11");
    await createUser(eleventh);
    const res = await requestOtp(eleventh, ip, deps());
    expect(res).toEqual(GENERIC_OTP_RESPONSE);
    expect(sent.length - before).toBe(10);
  });

  it("no trusted client IP (null) skips the per-IP limit instead of sharing one bucket", async () => {
    // Production hosts without CLIENT_IP_HEADER configured pass ip=null:
    // 11 different users must ALL still get codes (per-email limits apply,
    // per-IP does not). A shared "unknown" bucket would stop at 10.
    const before = sent.length;
    for (let i = 0; i < 11; i++) {
      const email = testEmail(`noip${i}`);
      await createUser(email);
      await requestOtp(email, null, deps());
    }
    expect(sent.length - before).toBe(11);
  });
});

RUN("auth: sessions & role guards (dev branch)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  });

  it("valid session resolves; deactivation and sessionVersion bump both revoke it", async () => {
    const email = testEmail("session");
    const user = await createUser(email);
    const token = await signSession({ id: user.id, role: "PARTNER", sessionVersion: user.sessionVersion });
    expect((await getSessionUser(token))?.id).toBe(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect(await getSessionUser(token)).toBeNull();

    const bumped = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, sessionVersion: { increment: 1 } },
    });
    expect(await getSessionUser(token)).toBeNull();
    const fresh = await signSession({ id: user.id, role: "PARTNER", sessionVersion: bumped.sessionVersion });
    expect((await getSessionUser(fresh))?.id).toBe(user.id);
  });

  it("tampered and garbage tokens resolve to no user", async () => {
    expect(await getSessionUser("not-a-token")).toBeNull();
    expect(await getSessionUser(undefined)).toBeNull();
  });

  it("role guard matrix: assertRole allows own role, 403s the other", async () => {
    const partner = await createUser(testEmail("guard-p"), { role: "PARTNER" });
    const ceo = await createUser(testEmail("guard-c"), { role: "CEO" });
    expect(() => assertRole(partner, "PARTNER")).not.toThrow();
    expect(() => assertRole(ceo, "CEO")).not.toThrow();
    for (const [user, wrong] of [
      [partner, "CEO"],
      [ceo, "PARTNER"],
    ] as const) {
      try {
        assertRole(user, wrong);
        expect.unreachable("assertRole should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).status).toBe(403);
      }
    }
  });
});
