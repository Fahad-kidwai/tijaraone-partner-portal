import { NextResponse } from "next/server";
import { adminLeadQuerySchema, paginationSchema } from "@/lib/schemas";
import { listCeoLeads } from "@/lib/leads/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const actor = await requireRole("CEO");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const query = adminLeadQuerySchema.parse(params);
    const pagination = paginationSchema.parse(params);
    const result = await listCeoLeads(actor, { ...query, ...pagination });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
