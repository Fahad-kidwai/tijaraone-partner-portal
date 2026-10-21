/**
 * End-to-end Neon connectivity check through the app's own Prisma client
 * (src/lib/db.ts -> @prisma/adapter-neon -> pooled DATABASE_URL).
 * Usage: npm run db:check   (env must be loaded, e.g. from .env.local)
 */
import fs from "node:fs";
import path from "node:path";

// Load .env.local before importing the Prisma client (static imports hoist).
const localEnv = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(localEnv)) {
  for (const line of fs.readFileSync(localEnv, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
    }
  }
}

async function main(): Promise<void> {
  const { prisma } = await import("../src/lib/db");
  const host = new URL(process.env.DATABASE_URL ?? "").host;
  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  const userCount = await prisma.user.count();
  const ceoCount = await prisma.user.count({ where: { role: "CEO" } });
  const leadCount = await prisma.lead.count();
  console.log(`Neon host: ${host}`);
  console.log(`Postgres: ${version.split(" ").slice(0, 2).join(" ")}`);
  console.log(`Users: ${userCount} (CEO: ${ceoCount}) · Leads: ${leadCount}`);
  console.log("DB CHECK OK — app Prisma client reached Neon through the serverless adapter.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("DB CHECK FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
