/**
 * End-to-end Neon connectivity check through the app's own Prisma client
 * (src/lib/db.ts -> @prisma/adapter-neon -> pooled DATABASE_URL).
 * Usage: npm run db:check   (env must be loaded, e.g. from .env.local)
 */
import { prisma } from "../src/lib/db";

async function main(): Promise<void> {
  const host = new URL(process.env.DATABASE_URL ?? "").host;
  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  const userCount = await prisma.user.count();
  const ceoCount = await prisma.user.count({ where: { role: "CEO" } });
  const leadCount = await prisma.lead.count();
  console.log(`Neon host: ${host}`);
  console.log(`Postgres: ${version.split(" ").slice(0, 2).join(" ")}`);
  console.log(`Users: ${userCount} (CEO: ${ceoCount}) · Leads: ${leadCount}`);
  console.log("DB CHECK OK — app Prisma client reached Neon through the serverless adapter.");
}

main()
  .catch((error) => {
    console.error("DB CHECK FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
