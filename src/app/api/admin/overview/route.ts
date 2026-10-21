import { NextResponse } from "next/server";
import { getCeoOverview } from "@/lib/insights/service";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await requireRole("CEO");
    const overview = await getCeoOverview(actor);
    return NextResponse.json({ data: overview }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
