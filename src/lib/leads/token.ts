import { randomInt } from "node:crypto";

/** Unambiguous alphabet: no 0/O/1/I. 32 characters. */
export const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TOKEN_PREFIX = "TJ-";
export const TOKEN_BODY_LENGTH = 6;
export const TOKEN_REGEX = /^TJ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Generate a referral token, e.g. TJ-7K4M2Q.
 * `nextIndex` is injectable so tests can force collisions deterministically;
 * in production it is crypto.randomInt (CSPRNG).
 */
export function generateToken(nextIndex: (maxExclusive: number) => number = (max) => randomInt(max)): string {
  let body = "";
  for (let i = 0; i < TOKEN_BODY_LENGTH; i++) {
    body += TOKEN_ALPHABET[nextIndex(TOKEN_ALPHABET.length)];
  }
  return `${TOKEN_PREFIX}${body}`;
}

export function isValidToken(value: string): boolean {
  return TOKEN_REGEX.test(value);
}
