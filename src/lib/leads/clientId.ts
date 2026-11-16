import type { PrismaClient } from "@prisma/client";
import { serviceAbbr, type ServiceAbbr } from "../services";

/** Format a numeric suffix as TOS-{ABBR}-C0001 (grows past 4 digits naturally). */
export function formatClientId(abbr: ServiceAbbr | string, n: number | bigint): string {
  return `TOS-${abbr}-C${String(n).padStart(4, "0")}`;
}

export const CLIENT_ID_REGEX = /^TOS-[A-Z]{2}-C[0-9]+$/;

export function isValidClientId(value: string): boolean {
  return CLIENT_ID_REGEX.test(value);
}

type Db = Pick<PrismaClient, "$queryRaw">;

/** Next Client ID for a service using a global C#### sequence across all services. */
export async function nextClientId(db: Db, serviceType: string): Promise<string> {
  const abbr = serviceAbbr(serviceType);
  if (!abbr) {
    throw new Error(`Unknown service type for Client ID: ${serviceType}`);
  }

  const rows = await db.$queryRaw<Array<{ n: bigint }>>`
    SELECT COALESCE(MAX(CAST(substring("clientId" FROM 'C([0-9]+)$') AS bigint)),0)+1 AS n
    FROM "Lead"
    WHERE "clientId" ~ '^TOS-[A-Z]{2}-C[0-9]+$'
  `;
  return formatClientId(abbr, rows[0]?.n ?? BigInt(1));
}
