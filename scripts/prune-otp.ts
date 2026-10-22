/**
 * OTP housekeeping: deletes OtpCode rows older than 7 days.
 *
 * OTP codes expire after 10 minutes, so week-old rows are pure history
 * (kept briefly only for rate-limit forensics). Safe to run on any branch,
 * including production, at any time. Prints only the deleted-row count —
 * never emails, codes, or connection details.
 *
 * Usage: npm run prune:otp   (run monthly, or on a scheduler — see
 * docs/OPERATIONS.md)
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const { count } = await prisma.otpCode.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - SEVEN_DAYS_MS) } },
    });
    console.log(`prune:otp deleted ${count} OtpCode row(s) older than 7 days`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "prune:otp failed");
  process.exit(1);
});
