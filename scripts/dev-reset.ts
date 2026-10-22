/**
 * DEV-ONLY database wipe + CEO re-seed.
 *
 * Deletes all LeadEvent, Lead and OtpCode rows and every PARTNER user on the
 * Neon **dev** branch, then re-seeds the real CEO from SEED_CEO_* (idempotent
 * upsert, same logic as prisma/seed.ts).
 *
 * Hard guards — refuses to run unless:
 *   - NEON_BRANCH === "dev"
 *   - NODE_ENV !== "production"
 * Prints the branch name before acting and only row counts afterwards.
 * Never prints connection strings, emails or any user details.
 *
 * Usage: npm run db:reset:dev
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Role } from "@prisma/client";
import { seedCeoSchema } from "../src/lib/env";
import { normalizeEmail } from "../src/lib/schemas";
import { parsePhone } from "../src/lib/phone";

// Load .env.local if present (npm scripts do not load it automatically).
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
  const branch = process.env.NEON_BRANCH ?? "unset";
  if (process.env.NODE_ENV === "production") {
    throw new Error("dev-reset refused: NODE_ENV is production");
  }
  if (branch !== "dev") {
    throw new Error(`dev-reset refused: NEON_BRANCH is "${branch}", not "dev"`);
  }
  console.log(`dev-reset: about to wipe branch "${branch}" (NEON_BRANCH=${branch})`);

  // Validate the CEO seed env before deleting anything, so a misconfigured
  // run can never leave the branch without a CEO.
  const parsed = seedCeoSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`dev-reset refused — invalid/missing seed env: ${issues}`);
  }
  const ceoEmail = normalizeEmail(parsed.data.SEED_CEO_EMAIL);
  const ceoPhone = parsePhone(parsed.data.SEED_CEO_PHONE).e164;

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction([
      prisma.leadEvent.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.otpCode.deleteMany(),
      prisma.user.deleteMany({ where: { role: Role.PARTNER } }),
    ]);

    // Re-seed the real CEO (idempotent — creates or refreshes the seed CEO).
    await prisma.user.upsert({
      where: { email: ceoEmail },
      update: { name: parsed.data.SEED_CEO_NAME, phone: ceoPhone, role: Role.CEO, isActive: true },
      create: {
        role: Role.CEO,
        name: parsed.data.SEED_CEO_NAME,
        email: ceoEmail,
        phone: ceoPhone,
        companyName: null,
      },
    });

    const [users, ceos, partners, leads, leadEvents, otpCodes] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.CEO } }),
      prisma.user.count({ where: { role: Role.PARTNER } }),
      prisma.lead.count(),
      prisma.leadEvent.count(),
      prisma.otpCode.count(),
    ]);
    console.log(
      `dev-reset done. Users: ${users} (CEO: ${ceos}) · Partners: ${partners} · Leads: ${leads} · LeadEvents: ${leadEvents} · OtpCodes: ${otpCodes}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "dev-reset failed");
  process.exit(1);
});
