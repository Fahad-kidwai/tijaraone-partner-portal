import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth/session";

export function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return apiError(error.status, error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", error.message);
  }
  if (error instanceof ZodError) {
    return apiError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", zodFieldErrors(error));
  }
  console.error(
    JSON.stringify({
      level: "error",
      event: "api.unhandled",
      error: error instanceof Error ? error.name : "unknown",
      ...(process.env.NODE_ENV === "development" && error instanceof Error
        ? { devMessage: error.message, devStack: error.stack?.split("\n").slice(0, 6) }
        : {}),
    })
  );
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
