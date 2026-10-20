import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Neon wiring (plan §2/§5, neon-postgres skill):
 * - App traffic uses the POOLED DATABASE_URL through the Neon serverless
 *   driver (WebSocket transport) — the recommended driver for serverless
 *   runtimes such as Netlify Functions, where TCP connections churn.
 *   Prisma remains the ORM; only the transport changes.
 * - Migrations never use this client: Prisma Migrate reads
 *   DATABASE_URL_UNPOOLED (direct, no -pooler) via schema.prisma directUrl.
 */
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — run `neon deploy` / `neon env pull` to populate .env.local");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
