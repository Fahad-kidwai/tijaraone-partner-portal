import { NextResponse } from "next/server";
import { getPartnerProfile } from "@/lib/leads/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await requireRole("PARTNER");
    return NextResponse.json({ data: getPartnerProfile(actor) }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
