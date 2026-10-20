import { z } from "zod";

/**
 * Server environment, validated with zod.
 * Parsing is lazy (first access) so importing this module during `next build`
 * does not require real secrets; any server code that actually needs config
 * fails fast with a clear message instead of failing obscurely later.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().min(1, "DATABASE_URL_UNPOOLED is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  OTP_PEPPER: z.string().min(32, "OTP_PEPPER must be at least 32 characters"),
  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("TijaraOne <no-reply@tijaraone.ae>"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  return parsed.data;
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv(process.env);
  return cached;
}

export const seedCeoSchema = z.object({
  SEED_CEO_EMAIL: z.string().email("SEED_CEO_EMAIL must be a valid email"),
  SEED_CEO_NAME: z.string().trim().min(1, "SEED_CEO_NAME is required"),
  SEED_CEO_PHONE: z.string().trim().min(1, "SEED_CEO_PHONE is required"),
});
