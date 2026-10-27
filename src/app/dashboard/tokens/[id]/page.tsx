import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerLead } from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { StageBadge, CommissionBadge } from "@/components/leads/StageBadge";
import { LeadTimeline } from "@/components/leads/LeadTimeline";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const actor = await requirePageRole("PARTNER");
  try {
    const lead = await getPartnerLead(actor, params.id);
    return { title: `${lead.token} — TijaraOne Partner Portal` };
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }
}

export default async function TokenDetailPage({ params }: { params: { id: string } }) {
  const actor = await requirePageRole("PARTNER");
  let lead;
  try {
    lead = await getPartnerLead(actor, params.id);
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }

  const paidLabel = lead.commission.paidAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dubai",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(lead.commission.paidAt))
    : null;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/tokens" className="text-sm font-bold text-[#0052FF] hover:underline">
        ← My Tokens
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-wider text-[#011550]">{lead.token}</h1>
        <StageBadge stage={lead.stage} />
      </div>

      <Card className="mt-6 p-6 grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Client</p>
          <p className="mt-1 font-bold text-slate-800">{lead.clientName}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Service</p>
          <p className="mt-1 font-bold text-slate-800">{SERVICE_TYPE_LABELS[lead.serviceType]}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your commission</p>
          <p className="mt-1 text-sm font-extrabold text-emerald-700">
            You will earn {formatAed(lead.commission.amount)} ({lead.commission.percent}%)
          </p>
          <p className="mt-2 flex items-center gap-2 flex-wrap">
            <CommissionBadge status={lead.commission.status} />
            {paidLabel && <span className="text-xs text-slate-500">Paid {paidLabel}</span>}
          </p>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-base font-extrabold text-[#011550] mb-5">Timeline</h2>
        <LeadTimeline events={lead.timeline} />
      </Card>
    </div>
  );
}
