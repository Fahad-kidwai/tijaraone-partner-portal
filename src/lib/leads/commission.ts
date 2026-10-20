export const DEFAULT_COMMISSION_PERCENT = "25.00";

/**
 * Decimal money math on strings, via BigInt scaling — no JS floats anywhere
 * near money. Inputs are decimal strings with up to 2dp (validated by zod
 * before this is called).
 *
 * Rounding mode: ROUND_HALF_UP (a tie at exactly half a cent rounds up,
 * i.e. away from zero — all amounts here are non-negative, so the two are
 * the same). Example: total 0.02 @ 25% = 0.005 exactly -> 0.01.
 * This matches Postgres `ROUND(numeric, 2)` and Prisma Decimal's default,
 * so the stored snapshot never disagrees with a DB-side recomputation.
 *
 * commission = ROUND_HALF_UP(totalAmount * commissionPercent / 100, 2)
 */
const HUNDRED = BigInt(100);

function toHundredths(value: string): bigint {
  const [whole, frac = ""] = value.split(".");
  return BigInt(whole) * HUNDRED + BigInt((frac + "00").slice(0, 2) || "0");
}

export function computeCommissionAmount(totalAmount: string, commissionPercent: string): string {
  const totalHundredths = toHundredths(totalAmount); // total * 100
  const percentHundredths = toHundredths(commissionPercent); // percent * 100
  // commission(2dp) = totalHundredths * percentHundredths / (100 * 100), rounded half-up
  const numerator = totalHundredths * percentHundredths;
  const denominator = BigInt(10000);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;
  const whole = rounded / HUNDRED;
  const frac = (rounded % HUNDRED).toString().padStart(2, "0");
  return `${whole.toString()}.${frac}`;
}

/** Format a decimal string as AED for display, e.g. "AED 2,500.00". */
export function formatAed(amount: string): string {
  const [whole, frac = "00"] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `AED ${grouped}.${(frac + "00").slice(0, 2)}`;
}
