import React from "react";
import { formatAed } from "@/lib/leads/commission";

export interface TopPartnerRow {
  partnerId: string;
  name: string;
  companyName: string | null;
  tokens: number;
  commission: string;
}

/** Top 5 partners by tokens and commission. */
export function TopPartnersList({ topPartners }: { topPartners: TopPartnerRow[] }) {
  if (topPartners.length === 0) {
    return <p className="text-sm text-slate-500">No partner activity yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {topPartners.map((p) => (
        <li key={p.partnerId} className="py-3 flex items-center gap-3">
          <span className="min-w-0">
            <span className="block font-bold text-slate-800 truncate">{p.name}</span>
            <span className="block text-xs text-slate-400 truncate">{p.companyName ?? ""}</span>
          </span>
          <span className="ml-auto text-right text-xs font-semibold text-slate-500">
            <span className="block text-sm font-extrabold text-slate-700">{p.tokens} tokens</span>
            {formatAed(p.commission)} commission
          </span>
        </li>
      ))}
    </ul>
  );
}
