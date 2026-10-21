import { describe, it, expect, afterEach, vi } from "vitest";
import { getClientIp, __resetClientIpWarningForTests } from "@/lib/auth/guards";

function reqWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/auth/request-otp", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getClientIp: trusted header order", () => {
  it("prefers Netlify's x-nf-client-connection-ip even over a spoofed x-forwarded-for (production)", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CLIENT_IP_HEADER", "");
    const req = reqWith({
      "x-nf-client-connection-ip": "203.0.113.10",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("production ignores x-forwarded-for entirely (spoofable) and returns null", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CLIENT_IP_HEADER", "");
    expect(getClientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBeNull();
    expect(getClientIp(reqWith({ "x-real-ip": "1.2.3.4" }))).toBeNull();
  });

  it("development falls back to x-forwarded-for first hop, then x-real-ip", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("CLIENT_IP_HEADER", "");
    expect(getClientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(getClientIp(reqWith({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("production with no trusted header returns null and warns only once per process", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CLIENT_IP_HEADER", "");
    __resetClientIpWarningForTests();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let warnings: string[] = [];
    try {
      expect(getClientIp(reqWith({}))).toBeNull();
      expect(getClientIp(reqWith({}))).toBeNull();
      expect(getClientIp(reqWith({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
      warnings = errorSpy.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("auth.client_ip_header_missing"));
    } finally {
      errorSpy.mockRestore();
    }
    expect(warnings).toHaveLength(1);
  });

  it("CLIENT_IP_HEADER overrides the fallback chain for a different host", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    const req = reqWith({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });
});
