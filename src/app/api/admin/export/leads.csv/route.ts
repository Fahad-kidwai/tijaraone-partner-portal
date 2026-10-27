import { NextResponse } from "next/server";
import { adminLeadQuerySchema } from "@/lib/schemas";
import { buildLeadsCsv } from "@/lib/insights/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";
import { logEvent } from "@/lib/log";

export async function GET(req: Request) {
  try {
    const actor = await requireRole("CEO");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const filters = adminLeadQuerySchema.parse(params);
    const result = await buildLeadsCsv(actor, filters);
    logEvent("export.leads_csv", {
      actorId: actor.id,
      rowCount: result.rowCount,
      truncated: result.truncated,
      stage: filters.stage ?? null,
      serviceType: filters.serviceType ?? null,
      hasPartnerFilter: Boolean(filters.partnerId),
      hasQuery: Boolean(filters.q),
    });
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
        ...(result.truncated ? { "X-Export-Note": `Truncated at ${result.rowCount} rows` } : {}),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
