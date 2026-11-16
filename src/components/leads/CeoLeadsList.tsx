"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StageBadge, CommissionBadge } from "./StageBadge";
import { CeoLeadDetail, type CeoLeadDetailData } from "./CeoLeadDetail";
import { DeleteLeadButton } from "./DeleteLeadButton";
import { serviceLabel } from "@/lib/services";

export interface CeoLeadRow {
  id: string;
  clientId: string;
  partner: { id: string; name: string; companyName: string | null; partnerCode: string | null };
  clientName: string;
  serviceType: string;
  stage: CeoLeadDetailData["stage"];
  createdAt: string;
  commission: CeoLeadDetailData["commission"];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short" }).format(new Date(iso));
}

function partnerLabel(p: CeoLeadRow["partner"]): string {
  return p.partnerCode ? `${p.name} · ${p.partnerCode}` : p.name;
}

/** CEO clients list. Desktop rows open detail in a drawer; mobile uses /admin/leads/[id]. */
export function CeoLeadsList({ leads }: { leads: CeoLeadRow[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<CeoLeadDetailData | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openLead(id: string) {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push(`/admin/leads/${id}`);
      return;
    }
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) setDrawer(data.data);
      else router.push(`/admin/leads/${id}`);
    } catch {
      router.push(`/admin/leads/${id}`);
    } finally {
      setLoadingId(null);
    }
  }

  if (leads.length === 0) return null;

  return (
    <>
      <ul className="md:hidden divide-y divide-slate-100">
        {leads.map((lead) => (
          <li key={lead.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-slate-700">{lead.clientName}</span>
                <span className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold tracking-wide text-[#011550]">{lead.clientId}</span>
                  <StageBadge stage={lead.stage} />
                </span>
                <span className="block text-xs text-slate-500 mt-1">
                  {serviceLabel(lead.serviceType)} · {partnerLabel(lead.partner)} · {formatDate(lead.createdAt)}
                </span>
                <Link href={`/admin/leads/${lead.id}`} className="mt-1 inline-block text-xs font-bold text-[#0052FF]">
                  View details
                </Link>
              </div>
              <DeleteLeadButton
                leadId={lead.id}
                clientName={lead.clientName}
                clientId={lead.clientId}
                commissionStatus={lead.commission.status}
                variant="icon"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-3 px-4 font-bold">Client</th>
              <th className="py-3 px-4 font-bold">Client ID</th>
              <th className="py-3 px-4 font-bold">Partner</th>
              <th className="py-3 px-4 font-bold">Service</th>
              <th className="py-3 px-4 font-bold">Phase</th>
              <th className="py-3 px-4 font-bold">Commission</th>
              <th className="py-3 px-4 font-bold">Created</th>
              <th className="py-3 px-4 font-bold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                onClick={() => openLead(lead.id)}
              >
                <td className="py-3 px-4 font-semibold text-slate-700">{lead.clientName}</td>
                <td className="py-3 px-4 font-extrabold tracking-wide text-[#011550]">
                  {lead.clientId}
                  {loadingId === lead.id ? <span className="ml-2 text-xs text-slate-400">…</span> : null}
                </td>
                <td className="py-3 px-4 text-slate-600">{partnerLabel(lead.partner)}</td>
                <td className="py-3 px-4 text-slate-600">{serviceLabel(lead.serviceType)}</td>
                <td className="py-3 px-4">
                  <StageBadge stage={lead.stage} />
                </td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <CommissionBadge status={lead.commission.status} />
                    <span className="text-xs font-bold text-slate-600">AED {lead.commission.amount}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">{formatDate(lead.createdAt)}</td>
                <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <DeleteLeadButton
                    leadId={lead.id}
                    clientName={lead.clientName}
                    clientId={lead.clientId}
                    commissionStatus={lead.commission.status}
                    variant="icon"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={() => setDrawer(null)} />
          <div className="relative w-full max-w-lg bg-[#F4F7FC] h-full overflow-y-auto shadow-2xl p-6">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200"
              onClick={() => setDrawer(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <CeoLeadDetail initial={drawer} onDeleted={() => setDrawer(null)} />
          </div>
        </div>
      )}
    </>
  );
}
