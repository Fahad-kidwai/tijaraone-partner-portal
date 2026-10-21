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
  clientPhone: string;
  serviceType: keyof typeof SERVICE_TYPE_LABELS;
  stage: CeoLeadDetailData["stage"];
  isPossibleDuplicate: boolean;
  unattended: boolean;
  createdAt: string;
  commission: CeoLeadDetailData["commission"];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short" }).format(new Date(iso));
}

function Badges({ lead }: { lead: CeoLeadRow }) {
  return (
    <>
      {lead.isPossibleDuplicate && (
        <span className="inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-300">Duplicate?</span>
      )}
      {lead.unattended && (
        <span className="inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold bg-rose-50 text-rose-600 border-rose-200">Unattended</span>
      )}
    </>
  );
}

/**
 * CEO leads list. Desktop rows open the detail in a drawer over the list;
 * on mobile (and for direct links) the same detail lives at
 * /admin/leads/[id]. One CeoLeadDetail component powers both.
 */
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
      {/* Mobile cards */}
      <ul className="md:hidden divide-y divide-slate-100">
        {leads.map((lead) => (
          <li key={lead.id} className="px-5 py-4">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-wide text-[#011550]">{lead.token}</span>
              <StageBadge stage={lead.stage} />
              <Badges lead={lead} />
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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-3 px-4 font-bold">Token</th>
              <th className="py-3 px-4 font-bold">Client</th>
              <th className="py-3 px-4 font-bold">Partner</th>
              <th className="py-3 px-4 font-bold">Service</th>
              <th className="py-3 px-4 font-bold">Stage</th>
              <th className="py-3 px-4 font-bold">Commission</th>
              <th className="py-3 px-4 font-bold">Flags</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-4 font-extrabold tracking-wide text-slate-800">{lead.token}</td>
                <td className="py-3 px-4">
                  <span className="block font-semibold text-slate-700">{lead.clientName}</span>
                  <span className="block text-xs text-slate-400">{lead.clientPhone}</span>
                </td>
                <td className="py-3 px-4 text-slate-600">{lead.partner.name}</td>
                <td className="py-3 px-4 text-slate-600">{SERVICE_TYPE_LABELS[lead.serviceType]}</td>
                <td className="py-3 px-4">
                  <StageBadge stage={lead.stage} />
                </td>
                <td className="py-3 px-4">
                  <CommissionBadge status={lead.commission.status} />
                </td>
                <td className="py-3 px-4">
                  <span className="flex gap-1 flex-wrap">
                    <Badges lead={lead} />
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => void openLead(lead.id)}
                    className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer"
                  >
                    {loadingId === lead.id ? "Opening..." : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-40 hidden md:block" role="dialog" aria-modal="true" aria-label={`Lead ${drawer.token}`}>
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={() => setDrawer(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-[#F4F7FC] shadow-xl overflow-y-auto p-6">
            <button
              type="button"
              aria-label="Close lead detail"
              onClick={() => setDrawer(null)}
              className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <CeoLeadDetail initial={drawer} />
          </div>
        </div>
      )}
    </>
  );
}
