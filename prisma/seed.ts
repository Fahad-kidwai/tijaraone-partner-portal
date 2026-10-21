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

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.argv.includes("--dev-fixtures")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("--dev-fixtures refused: NODE_ENV is production");
    }
    if (process.env.NEON_BRANCH !== "dev") {
      throw new Error(`--dev-fixtures refused: NEON_BRANCH is "${process.env.NEON_BRANCH ?? "unset"}", not "dev"`);
    }
  }
  const parsed = seedCeoSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Seed refused — invalid/missing seed env: ${issues}`);
  }

  const email = normalizeEmail(parsed.data.SEED_CEO_EMAIL);
  const phone = parsePhone(parsed.data.SEED_CEO_PHONE).e164;

  const ceo = await prisma.user.upsert({
    where: { email },
    update: { name: parsed.data.SEED_CEO_NAME, phone, role: Role.CEO, isActive: true },
    create: {
      role: Role.CEO,
      name: parsed.data.SEED_CEO_NAME,
      email,
      phone,
      companyName: null,
    },
  });

  console.log(`Seeded CEO id=${ceo.id} (email masked: ${ceo.email[0]}***@${ceo.email.split("@")[1]})`);

  // Optional clearly-labelled dev fixtures. Never runs in production.
  if (process.argv.includes("--dev-fixtures")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("--dev-fixtures must never run in production");
    }
    const fixtures = [
      { name: "Dev Partner One", email: "partner1@dev.tijaraone.local", companyName: "Dev Advisory One" },
      { name: "Dev Partner Two", email: "partner2@dev.tijaraone.local", companyName: "Dev Advisory Two" },
      { name: "Dev Partner Three", email: "partner3@dev.tijaraone.local", companyName: "Dev Advisory Three" },
    ];
    for (const f of fixtures) {
      await prisma.user.upsert({
        where: { email: f.email },
        update: {},
        create: { role: Role.PARTNER, name: f.name, email: f.email, phone: "+971500000000", companyName: f.companyName, createdById: ceo.id },
      });
    }
    console.log(`Seeded ${fixtures.length} dev fixture partners`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
