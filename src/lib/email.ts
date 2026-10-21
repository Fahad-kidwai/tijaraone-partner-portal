import { Resend } from "resend";
import { getServerEnv } from "./env";
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

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) throw new Error(`Resend send failed: ${error.name}`);
}

export async function sendEmail(input: SendEmailInput, timeoutMs: number = EMAIL_TIMEOUT_MS): Promise<void> {
  const env = getServerEnv();
  const send = env.EMAIL_DRIVER === "resend" ? sendViaResend(input) : sendViaConsole(input);
  await withTimeout(send, timeoutMs);
}

export function logEmailFailure(event: string, to: string, error: unknown): void {
  logError(event, {
    to: maskEmail(to),
    error: error instanceof Error ? error.name : "UnknownError",
  });
}
