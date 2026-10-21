"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface TopPartnerRow {
  partnerId: string;
  name: string;
  companyName: string | null;
  leads: number;
  won: number;
  conversionPercent: string | null;
}

export interface NeedsAttentionRow {
  id: string;
  token: string;
  clientName: string;
  partnerName: string;
  createdAt: string;
}

function formatAge(iso: string): string {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

/** One list slot, two tabs: Top partners / Needs attention (plan §7). */
export function OverviewTabs({ topPartners, needsAttention }: { topPartners: TopPartnerRow[]; needsAttention: NeedsAttentionRow[] }) {
  const [tab, setTab] = useState<"top" | "attention">("top");
  return (
    <div>
      <div className="flex gap-2" role="tablist" aria-label="Overview lists">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "top"}
          onClick={() => setTab("top")}
          className={`rounded-full px-4 py-2 text-sm font-bold border min-h-[44px] cursor-pointer ${
            tab === "top" ? "bg-[#0A1128] text-white border-[#0A1128]" : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          Top partners
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "attention"}
          onClick={() => setTab("attention")}
          className={`rounded-full px-4 py-2 text-sm font-bold border min-h-[44px] cursor-pointer ${
            tab === "attention" ? "bg-[#0A1128] text-white border-[#0A1128]" : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          Needs attention{needsAttention.length > 0 ? ` (${needsAttention.length})` : ""}
        </button>
      </div>

      {tab === "top" ? (
        topPartners.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No partner activity yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {topPartners.map((p) => (
              <li key={p.partnerId} className="py-3 flex items-center gap-3">
                <span className="min-w-0">
                  <span className="block font-bold text-slate-800 truncate">{p.name}</span>
                  <span className="block text-xs text-slate-400 truncate">{p.companyName ?? ""}</span>
                </span>
                <span className="ml-auto text-right text-xs font-semibold text-slate-500">
                  <span className="block text-sm font-extrabold text-slate-700">{p.leads} leads</span>
                  {p.won} won · {p.conversionPercent !== null ? `${p.conversionPercent}% conv.` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : needsAttention.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nothing waiting — every new lead has been seen.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {needsAttention.map((lead) => (
            <li key={lead.id} className="py-3 flex items-center gap-3">
              <span className="min-w-0">
                <span className="block font-bold text-slate-800">
                  {lead.token} · {lead.clientName}
                </span>
                <span className="block text-xs text-slate-400">
                  {lead.partnerName} · {formatAge(lead.createdAt)}
                </span>
              </span>
              <Link href={`/admin/leads/${lead.id}`} className="ml-auto text-xs font-bold text-[#0052FF] hover:underline shrink-0">
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
