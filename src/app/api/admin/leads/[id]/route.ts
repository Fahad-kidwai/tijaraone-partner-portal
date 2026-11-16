import { NextResponse } from "next/server";
import { updateLeadSchema } from "@/lib/schemas";
import { getCeoLead, updateLeadAsCeo } from "@/lib/leads/service";
import { assertSameOrigin, requireRole } from "@/lib/auth/guards";
import { apiError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/log";

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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const actor = await requireRole("CEO");
    const snap = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true, partnerId: true, stage: true },
    });
    const { count } = await prisma.lead.deleteMany({
      where: { id: params.id, commissionStatus: { not: "PAID" } },
    });
    if (count === 0) {
      const existing = await prisma.lead.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!existing) return apiError(404, "NOT_FOUND", "Client not found.");
      return apiError(409, "LEAD_PAID_LOCKED", "Paid clients can't be deleted");
    }
    logEvent("lead.deleted", {
      leadId: snap!.id,
      clientId: snap!.clientId,
      partnerId: snap!.partnerId,
      stage: snap!.stage,
      actorId: actor.id,
    });
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
