import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { getServerEnv } from "../env";
import { normalizeEmail } from "../schemas";
import { sendEmail, logEmailFailure } from "../email";
import { otpEmail } from "../emails/otpEmail";
import { logEvent } from "../log";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_EMAIL_LIMIT = 3;
export const OTP_EMAIL_WINDOW_MS = 15 * 60 * 1000;
export const OTP_IP_LIMIT = 10;
export const OTP_IP_WINDOW_MS = 60 * 60 * 1000;

export const GENERIC_OTP_RESPONSE = {
  ok: true,
  message: "If this email is registered, a code has been sent.",
} as const;

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(email: string, code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`${email}:${code}`).digest("hex");
}

export function otpHashesEqual(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Minimum response time for request-otp. Unknown/inactive emails would
 * otherwise return in a few ms while registered ones do DB writes plus an
 * awaited email send — a timing side channel that leaks registration.
 * Every path is padded UP to this floor (slower paths, e.g. a real send,
 * are unaffected beyond it). Well inside the 3–5 s send timeout budget.
 */
export const OTP_MIN_RESPONSE_MS = 900;

export interface OtpDeps {
  db: PrismaClient;
  pepper: string;
  now: () => Date;
  sendOtp: (email: string, code: string) => Promise<void>;
  minResponseMs: number;
  sleep: (ms: number) => Promise<void>;
}

function defaultDeps(): OtpDeps {
  return {
    db: prisma,
    pepper: getServerEnv().OTP_PEPPER,
    now: () => new Date(),
    minResponseMs: OTP_MIN_RESPONSE_MS,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    sendOtp: async (email, code) => {
      const mail = otpEmail(code);
      await sendEmail({ to: email, ...mail });
    },
  };
}

export type RequestOtpResult = typeof GENERIC_OTP_RESPONSE;

/**
 * ALWAYS resolves to the identical generic response — registered,
 * unregistered, inactive, rate-limited and send-failure outcomes are
 * indistinguishable to the caller (anti-enumeration, plan §3.2),
 * and every path takes at least OTP_MIN_RESPONSE_MS (timing, above).
 */
export async function requestOtp(
  rawEmail: string,
  ip: string | null,
  overrides: Partial<OtpDeps> = {}
): Promise<RequestOtpResult> {
  const deps = { ...defaultDeps(), ...overrides };
  const startedAt = Date.now();
  const result = await requestOtpInner(rawEmail, ip, deps);
  const elapsed = Date.now() - startedAt;
  if (elapsed < deps.minResponseMs) {
    await deps.sleep(deps.minResponseMs - elapsed);
  }
  return result;
}

async function requestOtpInner(
  rawEmail: string,
  ip: string | null,
  deps: OtpDeps
): Promise<RequestOtpResult> {
  const email = normalizeEmail(rawEmail);
  const now = deps.now();

  const user = await deps.db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    logEvent("auth.otp_requested", { outcome: "no_send" });
    return GENERIC_OTP_RESPONSE;
  }

  // Rate limits (DB-counted, plan §3.2)
  const [emailCount, ipCount, latest] = await Promise.all([
    deps.db.otpCode.count({
      where: { email, createdAt: { gte: new Date(now.getTime() - OTP_EMAIL_WINDOW_MS) } },
    }),
    ip
      ? deps.db.otpCode.count({
          where: { ip, createdAt: { gte: new Date(now.getTime() - OTP_IP_WINDOW_MS) } },
        })
      : Promise.resolve(0),
    deps.db.otpCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } }),
  ]);

  if (emailCount >= OTP_EMAIL_LIMIT || ipCount >= OTP_IP_LIMIT) {
    logEvent("auth.otp_requested", { outcome: "rate_limited" });
    return GENERIC_OTP_RESPONSE;
  }
  if (latest && now.getTime() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    logEvent("auth.otp_requested", { outcome: "cooldown" });
    return GENERIC_OTP_RESPONSE;
  }

  const code = generateOtpCode();
  await deps.db.$transaction([
    deps.db.otpCode.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: now },
    }),
    deps.db.otpCode.create({
      data: {
        email,
        codeHash: hashOtp(email, code, deps.pepper),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        ip,
      },
    }),
  ]);

  try {
    await deps.sendOtp(email, code);
    logEvent("auth.otp_requested", { outcome: "sent" });
  } catch (error) {
    // Never fail the request; surface in logs at error level.
    logEmailFailure("auth.otp_send_failed", email, error);
  }
  return GENERIC_OTP_RESPONSE;
}

export type VerifyOtpResult =
  | { ok: true; user: { id: string; role: "CEO" | "PARTNER"; name: string; sessionVersion: number } }
  | { ok: false };

const VERIFY_FAILURE: VerifyOtpResult = { ok: false };

export async function verifyOtp(
  rawEmail: string,
  code: string,
  overrides: Partial<OtpDeps> = {}
): Promise<VerifyOtpResult> {
  const deps = { ...defaultDeps(), ...overrides };
  const email = normalizeEmail(rawEmail);
  const now = deps.now();

  const record = await deps.db.otpCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt <= now || record.attempts >= OTP_MAX_ATTEMPTS) {
    if (record && record.expiresAt <= now) {
      await deps.db.otpCode.update({ where: { id: record.id }, data: { consumedAt: now } });
    }
    logEvent("auth.otp_verify_failed", { reason: !record ? "none" : record.expiresAt <= now ? "expired" : "locked" });
    return VERIFY_FAILURE;
  }

  if (!otpHashesEqual(hashOtp(email, code, deps.pepper), record.codeHash)) {
    const attempts = record.attempts + 1;
    await deps.db.otpCode.update({
      where: { id: record.id },
      data: { attempts, ...(attempts >= OTP_MAX_ATTEMPTS ? { consumedAt: now } : {}) },
    });
    logEvent("auth.otp_verify_failed", { reason: "mismatch" });
    return VERIFY_FAILURE;
  }

  const user = await deps.db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await deps.db.otpCode.update({ where: { id: record.id }, data: { consumedAt: now } });
    logEvent("auth.otp_verify_failed", { reason: "inactive" });
    return VERIFY_FAILURE;
  }

  await deps.db.$transaction([
    deps.db.otpCode.update({ where: { id: record.id }, data: { consumedAt: now } }),
    deps.db.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
  ]);
  logEvent("auth.login_success", { userId: user.id, role: user.role });
  return {
    ok: true,
    user: { id: user.id, role: user.role, name: user.name, sessionVersion: user.sessionVersion },
  };
}
