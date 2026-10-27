import { NextResponse } from "next/server";
import { partnerLeadQuerySchema, paginationSchema } from "@/lib/schemas";
import { listPartnerLeads } from "@/lib/leads/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const actor = await requireRole("PARTNER");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const query = partnerLeadQuerySchema.parse(params);
    const pagination = paginationSchema.parse(params);
    const result = await listPartnerLeads(actor, { ...query, ...pagination });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
