import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerLead } from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { waMeDigits } from "@/lib/phone";
import { Card } from "@/components/ui/Card";
import { StageBadge, CommissionBadge } from "@/components/leads/StageBadge";
import { LeadTimeline } from "@/components/leads/LeadTimeline";

/**
 * Ownership is checked in generateMetadata (runs before any HTML streams)
 * so a tampered id returns a real HTTP 404 — checking only in the page
 * body would soft-404 with a 200 status after the shell has flushed.
 */
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
          <p className="text-sm text-slate-500">{lead.clientPhone}</p>
          <span className="mt-3 flex gap-2">
            <a
              href={`tel:${lead.clientPhone}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0A1128] text-white px-4 py-2 text-xs font-bold min-h-[44px]"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={`https://wa.me/${waMeDigits(lead.clientPhone)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-bold min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Service</p>
          <p className="mt-1 font-bold text-slate-800">{SERVICE_TYPE_LABELS[lead.serviceType]}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Commission</p>
          <p className="mt-1">
            <CommissionBadge status={lead.commission.status} />
          </p>
        </div>
        {lead.requirementNote && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your note</p>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{lead.requirementNote}</p>
          </div>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-base font-extrabold text-[#011550] mb-5">Timeline</h2>
        <LeadTimeline events={lead.timeline} />
      </Card>
    </div>
  );
}
