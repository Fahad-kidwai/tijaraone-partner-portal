import { SignJWT, jwtVerify } from "jose";
import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "../db";
import { getServerEnv } from "../env";
import { SESSION_TTL_SECONDS } from "./constants";

export { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";

export type AppRole = "CEO" | "PARTNER";

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().SESSION_SECRET);
}

export async function signSession(user: { id: string; role: AppRole; sessionVersion: number }): Promise<string> {
  return new SignJWT({ role: user.role, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export interface SessionClaims {
  userId: string;
  role: AppRole;
  sessionVersion: number;
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "CEO" && payload.role !== "PARTNER") ||
      typeof payload.sv !== "number"
    ) {
      return null;
    }
    return { userId: payload.sub, role: payload.role, sessionVersion: payload.sv };
  } catch {
    return null;
  }
}

/**
 * Authoritative session check (plan §3.4): JWT signature AND a fresh DB
 * load on every call — rejects deactivated users and stale sessionVersions.
 * Middleware is only an optimistic gate and never replaces this.
 */
export async function getSessionUser(token: string | undefined, db: PrismaClient = prisma): Promise<User | null> {
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const user = await db.user.findUnique({ where: { id: claims.userId } });
  if (!user || !user.isActive || user.sessionVersion !== claims.sessionVersion) return null;
  return user;
}

export function assertRole(user: User, role: AppRole): void {
  if (user.role !== role) throw new AuthError(403, "You do not have access to this resource.");
}

export function toMeDto(user: User) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
  };
}
