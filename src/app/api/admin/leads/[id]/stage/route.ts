import { NextResponse } from "next/server";
import { stageTransitionSchema } from "@/lib/schemas";
import { transitionLead } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const body = stageTransitionSchema.parse(await req.json());
    const lead = await transitionLead(actor, params.id, body);
    return NextResponse.json({ data: lead }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
