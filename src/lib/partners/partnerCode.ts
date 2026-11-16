import type { PrismaClient } from "@prisma/client";

/** Format a numeric suffix as TOS-P0001 (grows past 4 digits naturally). */
export function formatPartnerCode(n: number | bigint): string {
  return `TOS-P${String(n).padStart(4, "0")}`;
}

type Db = Pick<PrismaClient, "$queryRaw">;

/** Next suggested Partner ID from existing TOS-P#### codes only. */
export async function nextPartnerCode(db: Db): Promise<string> {
  const rows = await db.$queryRaw<Array<{ n: bigint }>>`
    SELECT COALESCE(MAX(CAST(substring("partnerCode" FROM 6) AS bigint)),0)+1 AS n
    FROM "User"
    WHERE "partnerCode" ~ '^TOS-P[0-9]+$'
  `;
  return formatPartnerCode(rows[0]?.n ?? BigInt(1));
}
