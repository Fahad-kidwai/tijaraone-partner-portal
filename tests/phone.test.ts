import { describe, expect, it } from "vitest";
import { parsePhone, PhoneParseError } from "@/lib/phone";

describe("parsePhone", () => {
  it("parses a bare UAE local number with the AE default", () => {
    expect(parsePhone("050 123 4567").e164).toBe("+971501234567");
  });

  it("parses +971 international form", () => {
    expect(parsePhone("+971 50 123 4567").e164).toBe("+971501234567");
  });

  it("parses 00971 international form", () => {
    expect(parsePhone("00971501234567").e164).toBe("+971501234567");
  });

  it("accepts non-UAE numbers with + (India)", () => {
    expect(parsePhone("+91 98765 43210").e164).toBe("+919876543210");
  });

  it("accepts non-UAE numbers with + (UK)", () => {
    expect(parsePhone("+44 20 7946 0958").e164).toBe("+442079460958");
  });

  it("accepts non-UAE numbers with 00 (Russia/Kazakhstan +7)", () => {
    expect(parsePhone("007 916 123 4567").e164).toBe("+79161234567");
  });

  it("rejects invalid numbers", () => {
    expect(() => parsePhone("12345")).toThrow(PhoneParseError);
    expect(() => parsePhone("+971 12 345")).toThrow(PhoneParseError);
    expect(() => parsePhone("")).toThrow(PhoneParseError);
  });
});
