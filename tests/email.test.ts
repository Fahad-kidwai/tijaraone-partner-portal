import { describe, it, expect } from "vitest";
import { withTimeout, EmailTimeoutError, EMAIL_TIMEOUT_MS } from "@/lib/email";

describe("email adapter timeout (§3.5: awaited, 3-5s, never blocks the operation)", () => {
  it("timeout constant is within the 3-5s window", () => {
    expect(EMAIL_TIMEOUT_MS).toBeGreaterThanOrEqual(3000);
    expect(EMAIL_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });

  it("resolves fast sends", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects slow sends with EmailTimeoutError so callers can log and continue", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
    await expect(withTimeout(slow, 20)).rejects.toBeInstanceOf(EmailTimeoutError);
  });
});
