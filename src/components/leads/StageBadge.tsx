import React from "react";

export type LeadStageKey =
  | "NEW"
  | "WON_ADVANCE_PENDING"
  | "WON_ADVANCE_TAKEN"
  | "WON_IN_PROCESS"
  | "WON_CLOSED"
  | "LOST";

export type CommissionStatusKey = "NOT_SET" | "EXPECTED" | "PAYABLE" | "PAID";

/** Single colour/label map for stages — never re-implement per screen (plan §8.2). */
export const STAGE_BADGES: Record<LeadStageKey, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-blue-50 text-[#0052FF] border-blue-200" },
  WON_ADVANCE_PENDING: { label: "Advance Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  WON_ADVANCE_TAKEN: { label: "Advance Taken", className: "bg-violet-50 text-violet-700 border-violet-200" },
  WON_IN_PROCESS: { label: "In Process", className: "bg-sky-50 text-sky-700 border-sky-200" },
  WON_CLOSED: { label: "Client Closed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LOST: { label: "Lost", className: "bg-rose-50 text-rose-600 border-rose-200" },
};

export const COMMISSION_BADGES: Record<CommissionStatusKey, { label: string; className: string }> = {
  NOT_SET: { label: "—", className: "bg-slate-50 text-slate-400 border-slate-200" },
  EXPECTED: { label: "Expected", className: "bg-amber-50 text-amber-700 border-amber-300" },
  PAYABLE: { label: "Payable", className: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  PAID: { label: "Paid", className: "bg-emerald-600 text-white border-emerald-600" },
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: LeadStageKey }) {
  const b = STAGE_BADGES[stage];
  return <Badge className={b.className}>{b.label}</Badge>;
}

export function CommissionBadge({ status }: { status: CommissionStatusKey }) {
  const b = COMMISSION_BADGES[status];
  return <Badge className={b.className}>{b.label}</Badge>;
}
