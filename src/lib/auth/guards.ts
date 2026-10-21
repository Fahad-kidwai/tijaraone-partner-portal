import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { AuthError, assertRole, getSessionUser, SESSION_COOKIE, type AppRole } from "./session";

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
 * Client-IP resolution — DO NOT trust x-forwarded-for blindly: any client
 * can spoof it and defeat the per-IP OTP rate limit.
 *
 * Header order (first present wins):
 *   1. `x-nf-client-connection-ip` — set by Netlify's edge (our host,
 *      plan Q11); not client-settable through Netlify.
 *   2. Header named by env CLIENT_IP_HEADER, if configured (e.g. if a
 *      future host provides CF-Connecting-IP or True-Client-IP).
 *   3. DEVELOPMENT ONLY: `x-forwarded-for` (first hop), then `x-real-ip` —
 *      local dev servers sit behind no trusted proxy.
 * In production with no trusted header present we return null; the per-IP
 * rate limit is then skipped and the per-email limit carries the load.
 * To change the order for a new host: set CLIENT_IP_HEADER — no code change.
 */
export const TRUSTED_CLIENT_IP_HEADER = "x-nf-client-connection-ip";

export function getClientIp(req: Request): string | null {
  const netlifyIp = req.headers.get(TRUSTED_CLIENT_IP_HEADER);
  if (netlifyIp) return netlifyIp.trim();

  const configured = process.env.CLIENT_IP_HEADER?.toLowerCase();
  if (configured && configured !== TRUSTED_CLIENT_IP_HEADER) {
    const value = req.headers.get(configured);
    if (value) return value.split(",")[0]?.trim() || null;
  }

  if (process.env.NODE_ENV === "development") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || null;
    return req.headers.get("x-real-ip");
  }
  return null;
}
