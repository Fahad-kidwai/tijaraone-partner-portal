import { NextResponse } from "next/server";
import { getPartnerLead } from "@/lib/leads/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("PARTNER");
    const lead = await getPartnerLead(actor, params.id);
    return NextResponse.json({ data: lead }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
