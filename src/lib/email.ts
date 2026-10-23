import { Resend } from "resend";
import { getServerEnv, normalizeEnvValue } from "./env";
import { logEvent, logError, maskEmail } from "./log";

/**
 * Email adapter — the ONLY place an email provider is referenced.
 * Driver is selected by EMAIL_DRIVER: "console" (dev) or "resend".
 *
 * Every send is AWAITED with a hard timeout (default 4s, per plan §3.5).
 * No fire-and-forget, no waitUntil: Netlify may kill background work after
 * the response. Callers wrap sendEmail in try/catch; a failed or slow send
 * must never fail the business operation, but failures are logged.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const EMAIL_TIMEOUT_MS = 4000;

export class EmailTimeoutError extends Error {
  constructor() {
    super("Email send timed out");
    this.name = "EmailTimeoutError";
  }
}

/** Thrown when Resend returns `{ error }` (SDK does not throw on API errors). */
export class ResendSendError extends Error {
  readonly httpStatus: number | null;
  readonly resendName: string;
  readonly resendMessage: string;

  constructor(error: { name: string; message: string; statusCode: number | null }) {
    super(error.message || `Resend send failed: ${error.name}`);
    this.name = "ResendSendError";
    this.httpStatus = error.statusCode;
    this.resendName = error.name;
    this.resendMessage = error.message;
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new EmailTimeoutError()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sendViaConsole(input: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    // The ONE sanctioned place an OTP code may be printed: dev console driver.
    console.log(
      `\n[email:console] To: ${input.to}\nSubject: ${input.subject}\n${input.text}\n`
    );
  } else {
    // Production must never log codes or full emails.
    logEvent("email.console_driver_in_production", { to: maskEmail(input.to), subject: input.subject });
  }
}

/** Domain only — safe to log; never the local-part or full address. */
export function emailFromDomain(from: string): string | null {
  const match = from.match(/@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*>?\s*$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Scrub anything that must never appear in logs: API keys, emails, long
 * digit runs that could be OTP codes.
 */
export function sanitizeLogText(text: string): string {
  return text
    .replace(/\bre_[A-Za-z0-9]+/g, "re_***")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (addr) => maskEmail(addr))
    .replace(/\b\d{4,8}\b/g, "****");
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const env = getServerEnv();
  const apiKey = normalizeEnvValue(env.RESEND_API_KEY);
  const from = normalizeEnvValue(env.EMAIL_FROM);

  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  if (!from) throw new Error("EMAIL_FROM is not configured");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  // Resend's Node SDK returns API failures as `{ data: null, error }` —
  // it does NOT throw. Treating a missing `data` without checking `error`
  // would silently look like success.
  if (error) {
    throw new ResendSendError({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  if (!data?.id) {
    throw new ResendSendError({
      name: "application_error",
      message: "Resend returned no error and no email id",
      statusCode: null,
    });
  }
}

export async function sendEmail(input: SendEmailInput, timeoutMs: number = EMAIL_TIMEOUT_MS): Promise<void> {
  const env = getServerEnv();
  const send = env.EMAIL_DRIVER === "resend" ? sendViaResend(input) : sendViaConsole(input);
  await withTimeout(send, timeoutMs);
}

/**
 * Structured failure log for every email send path.
 * Never includes: API key, OTP code, full recipient (masked only), note text.
 */
export function logEmailFailure(event: string, to: string, error: unknown): void {
  const fields: Record<string, unknown> = {
    to: maskEmail(to),
    error: error instanceof Error ? error.name : "UnknownError",
  };

  if (error instanceof EmailTimeoutError) {
    fields.httpStatus = null;
    fields.resendName = null;
    fields.resendMessage = null;
    fields.message = error.message;
    fields.timeoutMs = EMAIL_TIMEOUT_MS;
  } else if (error instanceof ResendSendError) {
    fields.httpStatus = error.httpStatus;
    fields.resendName = error.resendName;
    fields.resendMessage = sanitizeLogText(error.resendMessage);
    fields.message = sanitizeLogText(error.message);
    // Domain-only hint so misconfigured EMAIL_FROM is diagnosable without PII.
    try {
      const from = normalizeEnvValue(getServerEnv().EMAIL_FROM);
      fields.fromDomain = emailFromDomain(from);
    } catch {
      fields.fromDomain = null;
    }
  } else if (error instanceof Error) {
    fields.httpStatus = null;
    fields.resendName = null;
    fields.resendMessage = null;
    fields.message = sanitizeLogText(error.message);
  } else {
    fields.httpStatus = null;
    fields.resendName = null;
    fields.resendMessage = null;
    fields.message = "non-Error throw";
  }

  logError(event, fields);
}
