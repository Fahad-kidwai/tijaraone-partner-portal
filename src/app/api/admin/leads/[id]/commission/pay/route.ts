import { NextResponse } from "next/server";
import { markCommissionPaidSchema } from "@/lib/schemas";
import { markCommissionPaid } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const body = markCommissionPaidSchema.parse(await req.json());
    const lead = await markCommissionPaid(actor, params.id, body);
    return NextResponse.json({ data: lead }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
