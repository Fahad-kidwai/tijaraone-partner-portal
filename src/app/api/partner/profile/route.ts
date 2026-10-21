import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/lib/schemas";
import { getPartnerProfile, updatePartnerProfile } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const actor = await requireRole("PARTNER");
    return NextResponse.json({ data: getPartnerProfile(actor) }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("PARTNER");
    const body = updateProfileSchema.parse(await req.json());
    const profile = await updatePartnerProfile(actor, body.phone);
    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
