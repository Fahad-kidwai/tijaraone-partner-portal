import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "AE";

export interface ParsedPhone {
  /** E.164 form, e.g. +971501234567 — this is what we store. */
  e164: string;
  /** Human-readable international format, e.g. +971 50 123 4567. */
  international: string;
  country: string | undefined;
}

export class PhoneParseError extends Error {
  constructor(message = "Enter a valid phone number") {
    super(message);
    this.name = "PhoneParseError";
  }
}

/**
 * Normalise a user-entered phone number to E.164.
 * - Leading "+"  -> international number, any country.
 * - Leading "00" -> international number, any country (00 normalised to +).
 * - No prefix    -> parsed with the default country (UAE, +971).
 */
export function parsePhone(input: string): ParsedPhone {
  const trimmed = input.trim().replace(/[\s()-]/g, "");
  if (!trimmed) throw new PhoneParseError();

  let candidate = trimmed;
  let defaultCountry: CountryCode | undefined = DEFAULT_PHONE_COUNTRY;
  if (candidate.startsWith("+")) {
    defaultCountry = undefined;
  } else if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`;
    defaultCountry = undefined;
  }

  const parsed = defaultCountry
    ? parsePhoneNumberFromString(candidate, defaultCountry)
    : parsePhoneNumberFromString(candidate);
  if (!parsed || !parsed.isValid()) throw new PhoneParseError();

  return {
    e164: parsed.number,
    international: parsed.formatInternational(),
    country: parsed.country,
  };
}

export function isValidPhone(input: string): boolean {
  try {
    parsePhone(input);
    return true;
  } catch {
    return false;
  }
}

/** wa.me link digits (E.164 without the leading +). */
export function waMeDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
