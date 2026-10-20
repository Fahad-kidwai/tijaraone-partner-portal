import { describe, expect, it } from "vitest";
import { generateToken, isValidToken, TOKEN_ALPHABET } from "@/lib/leads/token";
import { computeCommissionAmount, formatAed } from "@/lib/leads/commission";
import { parseServerEnv } from "@/lib/env";
import { dubaiMonthBoundsUtc, formatInDubai } from "@/lib/time";
import { maskEmail } from "@/lib/log";

describe("token generator", () => {
  it("always produces TJ-XXXXXX from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const token = generateToken();
      expect(token).toMatch(/^TJ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      expect(isValidToken(token)).toBe(true);
    }
  });

  it("alphabet excludes ambiguous characters", () => {
    expect(TOKEN_ALPHABET).not.toMatch(/[01OI]/);
    expect(TOKEN_ALPHABET).toHaveLength(32);
  });

  it("is deterministic with an injected index source (collision-test hook)", () => {
    expect(generateToken(() => 0)).toBe("TJ-AAAAAA");
  });
});

describe("commission math (Q7: percent of total service fee)", () => {
  it("defaults concept: 25% of 10,000.00 = 2,500.00", () => {
    expect(computeCommissionAmount("10000.00", "25.00")).toBe("2500.00");
  });

  it("rounds half-up to 2dp: 25% of 9,999.99 = 2,500.00", () => {
    expect(computeCommissionAmount("9999.99", "25")).toBe("2500.00");
  });

  it("rounds a half-cent tie up (ROUND_HALF_UP): 25% of 0.02 = 0.01", () => {
    expect(computeCommissionAmount("0.02", "25")).toBe("0.01");
  });

  it("handles fractional percents without floats", () => {
    expect(computeCommissionAmount("1000.00", "12.5")).toBe("125.00");
    expect(computeCommissionAmount("333.33", "10")).toBe("33.33");
  });

  it("formats AED for display", () => {
    expect(formatAed("2500.00")).toBe("AED 2,500.00");
  });
});

describe("env validation", () => {
  const valid = {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    DATABASE_URL_UNPOOLED: "postgresql://u:p@localhost:5432/db",
    SESSION_SECRET: "s".repeat(32),
    OTP_PEPPER: "p".repeat(32),
  };

  it("accepts a complete env and applies defaults", () => {
    const env = parseServerEnv(valid);
    expect(env.EMAIL_DRIVER).toBe("console");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("rejects short secrets and missing database URLs", () => {
    expect(() => parseServerEnv({ ...valid, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });
});

describe("Dubai time helpers", () => {
  it("computes Dubai month bounds in UTC (UTC+4)", () => {
    // 2026-10-15T12:00Z is October in Dubai; October starts 2026-09-30T20:00Z.
    const { start, end } = dubaiMonthBoundsUtc(new Date("2026-10-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-09-30T20:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T20:00:00.000Z");
  });

  it("formats in Asia/Dubai", () => {
    expect(formatInDubai(new Date("2026-10-15T12:00:00Z"))).toContain("16:00");
  });
});

describe("log masking", () => {
  it("masks emails to first letter + domain", () => {
    expect(maskEmail("fahad@tijaraone.ae")).toBe("f***@tijaraone.ae");
  });
});
