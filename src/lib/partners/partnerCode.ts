/** Format a partner_code_seq value as TOS-P0001 (grows past 4 digits naturally). */
export function formatPartnerCode(n: number | bigint): string {
  return `TOS-P${String(n).padStart(4, "0")}`;
}
