"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StageBadge, CommissionBadge } from "./StageBadge";
import { CeoLeadDetail, type CeoLeadDetailData } from "./CeoLeadDetail";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";

export interface CeoLeadRow {
  id: string;
  token: string;
  partner: { id: string; name: string; companyName: string | null };
  clientName: string;
  serviceType: keyof typeof SERVICE_TYPE_LABELS;
  stage: CeoLeadDetailData["stage"];
  createdAt: string;
  commission: CeoLeadDetailData["commission"];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short" }).format(new Date(iso));
}

/** CEO tokens list. Desktop rows open detail in a drawer; mobile uses /admin/leads/[id]. */
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
            <span className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-wide text-[#011550]">{lead.token}</span>
              <StageBadge stage={lead.stage} />
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-700">{lead.clientName}</span>
            <span className="block text-xs text-slate-500">
              {SERVICE_TYPE_LABELS[lead.serviceType]} · {lead.partner.name} · {formatDate(lead.createdAt)}
            </span>
            <Link href={`/admin/leads/${lead.id}`} className="mt-1 inline-block text-xs font-bold text-[#0052FF]">
              View details
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-3 px-4 font-bold">Token</th>
              <th className="py-3 px-4 font-bold">Client</th>
              <th className="py-3 px-4 font-bold">Partner</th>
              <th className="py-3 px-4 font-bold">Service</th>
              <th className="py-3 px-4 font-bold">Phase</th>
              <th className="py-3 px-4 font-bold">Commission</th>
              <th className="py-3 px-4 font-bold">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                onClick={() => openLead(lead.id)}
              >
                <td className="py-3 px-4 font-extrabold tracking-wide text-[#011550]">
                  {lead.token}
                  {loadingId === lead.id ? <span className="ml-2 text-xs text-slate-400">…</span> : null}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-700">{lead.clientName}</td>
                <td className="py-3 px-4 text-slate-600">{lead.partner.name}</td>
                <td className="py-3 px-4 text-slate-600">{SERVICE_TYPE_LABELS[lead.serviceType]}</td>
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
            <CeoLeadDetail initial={drawer} />
          </div>
        </div>
      )}
    </>
  );
}
