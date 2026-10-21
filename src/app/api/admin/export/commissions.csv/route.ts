import { NextResponse } from "next/server";
import { commissionsQuerySchema } from "@/lib/schemas";
import { buildCommissionsCsv } from "@/lib/insights/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";
import { logEvent } from "@/lib/log";

export async function GET(req: Request) {
  try {
    const actor = await requireRole("CEO");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const filters = commissionsQuerySchema.parse(params);
    const result = await buildCommissionsCsv(actor, filters);
    logEvent("export.commissions_csv", {
      actorId: actor.id,
      rowCount: result.rowCount,
      truncated: result.truncated,
      status: filters.status ?? null,
      month: filters.month ?? null,
      hasPartnerFilter: Boolean(filters.partnerId),
    });
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="commissions.csv"',
        ...(result.truncated ? { "X-Export-Note": `Truncated at ${result.rowCount} rows` } : {}),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
