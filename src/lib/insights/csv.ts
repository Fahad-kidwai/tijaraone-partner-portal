/**
 * CSV building (plan Â§6.2 exports): UTF-8 BOM for Excel, RFC-4180 quoting,
 * and formula-injection defence â€” any cell starting with = + - @, tab or CR
 * is prefixed with a single quote so spreadsheets never execute it.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  let cell = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(cell)) cell = `'${cell}`;
  if (/[",\n\r]/.test(cell)) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** Asia/Dubai timestamp for CSV cells. */
export function dubaiCsvDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
