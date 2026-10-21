import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { AuthError, assertRole, getSessionUser, SESSION_COOKIE, type AppRole } from "./session";
import { logError } from "../log";

/** Server-side guard used by every authenticated handler/component. */
export async function requireUser(): Promise<User> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) throw new AuthError(401, "Your session has expired. Please sign in again.");
  return user;
}

export async function requireRole(role: AppRole): Promise<User> {
  const user = await requireUser();
  assertRole(user, role);
  return user;
}

/**
 * CSRF defence-in-depth (plan §3.4): mutating requests must carry an
 * Origin (or Referer) whose host matches the request Host.
 */
export function assertSameOrigin(req: Request): void {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) throw new AuthError(403, "Cross-origin request rejected.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthError(403, "Cross-origin request rejected.");
  }
  if (originHost !== host) throw new AuthError(403, "Cross-origin request rejected.");
}

/**
 * Client IP for rate limiting — header trust order (documented, configurable):
 *
 * 1. The host-provided client-IP header. Default: `x-nf-client-connection-ip`
 *    (Netlify). Override with the CLIENT_IP_HEADER env var if the chosen
 *    host differs (Phase 6). This header is set by the host platform and
 *    cannot be spoofed by the client through it.
 * 2. DEVELOPMENT ONLY: `x-forwarded-for` (first hop), then `x-real-ip`.
 *    These are client-spoofable and are never trusted in production.
 * 3. Otherwise null — the IP rate limiter then simply does not apply
 *    (per-email limits still do). Returning a spoofable value in
 *    production would be worse than no IP limit.
 */
export const DEFAULT_CLIENT_IP_HEADER = "x-nf-client-connection-ip";

let warnedMissingClientIp = false;

/** Test hook: reset the once-per-process missing-header warning. */
export function __resetClientIpWarningForTests(): void {
  warnedMissingClientIp = false;
}

export function getClientIp(req: Request, env: NodeJS.ProcessEnv = process.env): string | null {
  const trustedHeader = (env.CLIENT_IP_HEADER || DEFAULT_CLIENT_IP_HEADER).toLowerCase();
  const trusted = req.headers.get(trustedHeader);
  if (trusted) return trusted.split(",")[0]?.trim() || null;

  if (env.NODE_ENV === "development") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || null;
    return req.headers.get("x-real-ip");
  }
  // Production without the host's client-IP header: return null so the
  // per-IP OTP limit is SKIPPED (never bucket everyone under one shared
  // "unknown" IP — that would lock out all users at 10 requests/hour).
  // Per-email limits still apply. Warn once per process so a missing
  // CLIENT_IP_HEADER on the host is visible in logs exactly once.
  if (env.NODE_ENV === "production" && !warnedMissingClientIp) {
    warnedMissingClientIp = true;
    logError("auth.client_ip_header_missing", { header: trustedHeader });
  }
  return null;
}
