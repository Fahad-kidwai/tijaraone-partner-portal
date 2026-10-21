import { NextResponse } from "next/server";
import { createLeadSchema, paginationSchema, partnerLeadQuerySchema } from "@/lib/schemas";
import { createLead, listPartnerLeads } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("PARTNER");
    const body = createLeadSchema.parse(await req.json());
    const lead = await createLead(actor, body);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

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
