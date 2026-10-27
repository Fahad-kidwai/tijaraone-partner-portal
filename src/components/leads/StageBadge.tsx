import React from "react";

export type LeadStageKey = "ADVANCE_RECEIVED" | "IN_PROGRESS" | "COMPLETED";

export type CommissionStatusKey = "EXPECTED" | "PAYABLE" | "PAID";

/** Single colour/label map for stages — never re-implement per screen. */
export const STAGE_BADGES: Record<LeadStageKey, { label: string; className: string }> = {
  ADVANCE_RECEIVED: { label: "Advance Received", className: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-sky-50 text-sky-700 border-sky-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const COMMISSION_BADGES: Record<CommissionStatusKey, { label: string; className: string }> = {
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
