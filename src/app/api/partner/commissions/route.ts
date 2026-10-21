import { NextResponse } from "next/server";
import { getPartnerCommissions } from "@/lib/insights/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await requireRole("PARTNER");
    const commissions = await getPartnerCommissions(actor);
    return NextResponse.json({ data: commissions }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
