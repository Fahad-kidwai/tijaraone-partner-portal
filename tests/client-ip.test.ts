import { describe, it, expect } from "vitest";
import { getClientIp, DEFAULT_CLIENT_IP_HEADER } from "@/lib/auth/guards";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/auth/request-otp", { headers });
}

describe("getClientIp trust order (Step A.2)", () => {
  it("prefers the host-provided header in production, ignoring spoofable XFF", () => {
    const r = req({
      [DEFAULT_CLIENT_IP_HEADER]: "203.0.113.9",
      "x-forwarded-for": "1.1.1.1",
    });
    expect(getClientIp(r, { NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe("203.0.113.9");
  });

  it("in production, XFF alone is NOT trusted (returns null)", () => {
    const r = req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(r, { NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("in development, XFF first hop is the fallback", () => {
    const r = req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(r, { NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe("1.1.1.1");
  });

  it("header name is configurable via CLIENT_IP_HEADER", () => {
    const r = req({ "x-custom-ip": "198.51.100.7" });
    expect(
      getClientIp(r, { NODE_ENV: "production", CLIENT_IP_HEADER: "x-custom-ip" } as NodeJS.ProcessEnv)
    ).toBe("198.51.100.7");
  });
});
