import { NextResponse } from "next/server";
import { updatePartnerSchema } from "@/lib/schemas";
import { requireRole, assertSameOrigin } from "@/lib/auth/guards";
import { getPartner, updatePartner } from "@/lib/partners/service";
import { handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("CEO");
    const partner = await getPartner(actor, params.id);
    return NextResponse.json({ data: partner });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const input = updatePartnerSchema.parse(await req.json());
    const partner = await updatePartner(actor, params.id, input);
    return NextResponse.json({ data: partner });
  } catch (error) {
    return handleApiError(error);
  }
}
