import { NextResponse } from "next/server";
import { createPartnerSchema, paginationSchema } from "@/lib/schemas";
import { requireRole } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/auth/guards";
import { createPartner, listPartners } from "@/lib/partners/service";
import { handleApiError } from "@/lib/api";
import { z } from "zod";

const listQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(req: Request) {
  try {
    const actor = await requireRole("CEO");
    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const query = listQuerySchema.parse(params);
    const result = await listPartners(actor, query);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const input = createPartnerSchema.parse(await req.json());
    const partner = await createPartner(actor, input);
    return NextResponse.json({ data: partner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
