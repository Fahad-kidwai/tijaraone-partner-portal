/** One-off production-mode smoke helper (local dev only).
 * Inserts a known OTP code for SEED_CEO_EMAIL so a production-mode
 * server (which never prints codes) can be smoke-tested end-to-end.
 * Run: npx tsx scripts/smoke-otp.ts
 * Prints only "ready"; never prints the email or secrets.
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value;
  }
}
loadEnvLocal();

export const SMOKE_CODE = "424242";

async function main(): Promise<void> {
  if (process.env.NEON_BRANCH !== "dev") throw new Error("smoke-otp refuses to run unless NEON_BRANCH=dev");
  const { prisma } = await import("../src/lib/db");
  const { hashOtp } = await import("../src/lib/auth/otp");
  const { getServerEnv } = await import("../src/lib/env");
  const email = process.env.SEED_CEO_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SEED_CEO_EMAIL missing");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("CEO user not found");
  await prisma.otpCode.deleteMany({ where: { email } });
  await prisma.otpCode.create({
    data: {
      email,
      codeHash: hashOtp(email, SMOKE_CODE, getServerEnv().OTP_PEPPER),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      ip: "smoke",
    },
  });
  await prisma.$disconnect();
  console.log("smoke OTP ready (dev branch only)");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
