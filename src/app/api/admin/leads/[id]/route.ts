import { NextResponse } from "next/server";
import { updateLeadSchema } from "@/lib/schemas";
import { getCeoLead, updateLeadAsCeo } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("CEO");
    const lead = await getCeoLead(actor, params.id);
    return NextResponse.json({ data: lead }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const body = updateLeadSchema.parse(await req.json());
    const lead = await updateLeadAsCeo(actor, params.id, body);
    return NextResponse.json({ data: lead }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
