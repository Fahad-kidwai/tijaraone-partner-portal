import { NextResponse } from "next/server";
import { getPartnerOverview } from "@/lib/insights/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await requireRole("PARTNER");
    const overview = await getPartnerOverview(actor);
    return NextResponse.json({ data: overview }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
