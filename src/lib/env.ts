import { z } from "zod";
import { logEvent } from "./log";

/**
 * Strip accidental surrounding quotes / whitespace that Netlify (and some
 * shell exports) leave on env values. `"re_xxx"` or `"Name <a@b>"` with the
 * quotes included would otherwise fail Resend while a clean curl succeeds.
 */
export function normalizeEnvValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

/**
 * Server environment, validated with zod.
 * Parsing is lazy (first access) so importing this module during `next build`
 * does not require real secrets; any server code that actually needs config
 * fails fast with a clear message instead of failing obscurely later.
 *
 * EMAIL_FROM / RESEND_API_KEY / EMAIL_DRIVER are quote-stripped (see above).
 */
const quotedString = (fallback: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? normalizeEnvValue(value) : value),
    z.string().default(fallback)
  );

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().min(1, "DATABASE_URL_UNPOOLED is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  OTP_PEPPER: z.string().min(32, "OTP_PEPPER must be at least 32 characters"),
  EMAIL_DRIVER: z.preprocess(
    (value) => (typeof value === "string" ? normalizeEnvValue(value) : value),
    z.enum(["console", "resend"]).default("console")
  ),
  CLIENT_IP_HEADER: z.string().optional().default(""),
  RESEND_API_KEY: quotedString(""),
  EMAIL_FROM: quotedString("TijaraOne <no-reply@tijaraone.ae>"),
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
  if (!cached) {
    cached = parseServerEnv(process.env);
    // Startup warning (fires once per process, on first config use): the
    // console driver delivers no mail, so in production this silently
    // breaks OTP sign-in. Make the misconfiguration loud in the logs.
    if (process.env.NODE_ENV === "production" && cached.EMAIL_DRIVER === "console") {
      logEvent("email.console_driver_startup_warning", {
        warning: "EMAIL_DRIVER=console in production: no email will be delivered (OTP sign-in will fail)",
      });
    }
  }
  return cached;
}

export const seedCeoSchema = z.object({
  SEED_CEO_EMAIL: z.string().email("SEED_CEO_EMAIL must be a valid email"),
  SEED_CEO_NAME: z.string().trim().min(1, "SEED_CEO_NAME is required"),
  SEED_CEO_PHONE: z.string().trim().min(1, "SEED_CEO_PHONE is required"),
});
