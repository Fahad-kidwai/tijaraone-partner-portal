"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, MessageCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input, Select, Textarea } from "../ui/fields";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { StageBadge, CommissionBadge, STAGE_BADGES, type LeadStageKey } from "./StageBadge";
import { computeCommissionAmount, formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS, LOST_REASONS } from "@/lib/schemas";
import { waMeDigits } from "@/lib/phone";

export interface CeoLeadDetailData {
  id: string;
  token: string;
  partner: { id: string; name: string; email: string; phone: string; companyName: string | null };
  clientName: string;
  clientPhone: string;
  serviceType: keyof typeof SERVICE_TYPE_LABELS;
  requirementNote: string | null;
  stage: LeadStageKey;
  lostReason: string | null;
  internalNote: string | null;
  isPossibleDuplicate: boolean;
  unattended: boolean;
  createdAt: string;
  allowedNext: LeadStageKey[];
  commission: {
    status: "NOT_SET" | "EXPECTED" | "PAYABLE" | "PAID";
    totalAmount: string | null;
    percent: string | null;
    amount: string | null;
    paidAt: string | null;
    paidRef: string | null;
  };
  timeline: Array<{
    type: string;
    fromStage: LeadStageKey | null;
    toStage: LeadStageKey | null;
    actor: { name: string; role: string };
    createdAt: string;
  }>;
}

const LOST_REASON_LABELS: Record<string, string> = {
  PRICE: "Price",
  NO_RESPONSE: "No response",
  WENT_ELSEWHERE: "Went elsewhere",
  NOT_ELIGIBLE: "Not eligible",
  OTHER: "Other",
};

function dubaiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function timelineLabel(e: CeoLeadDetailData["timeline"][number]): string {
  switch (e.type) {
    case "CREATED":
      return "Token generated";
    case "STAGE_CHANGED":
      return `Stage: ${e.fromStage ? STAGE_BADGES[e.fromStage].label : ""} → ${e.toStage ? STAGE_BADGES[e.toStage].label : ""}`;
    case "COMMISSION_SET":
      return "Commission set / cleared";
    case "COMMISSION_UPDATED":
      return "Commission updated";
    case "COMMISSION_PAID":
      return "Commission marked paid";
    case "NOTE_UPDATED":
      return "Internal note updated";
    case "REOPENED":
      return "Lead reopened";
    case "MARKED_DUPLICATE":
      return "Flagged as possible duplicate";
    default:
      return e.type;
  }
}

export function CeoLeadDetail({ initial }: { initial: CeoLeadDetailData }) {
  const router = useRouter();
  const [lead, setLead] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [selectedTo, setSelectedTo] = useState<LeadStageKey | null>(null);
  const [total, setTotal] = useState("");
  const [percent, setPercent] = useState("25");
  const [lostReason, setLostReason] = useState("");
  const [lostNote, setLostNote] = useState("");
  const [note, setNote] = useState(initial.internalNote ?? "");
  const [editTotal, setEditTotal] = useState(initial.commission.totalAmount ?? "");
  const [editPercent, setEditPercent] = useState(initial.commission.percent ?? "25");
  const [payOpen, setPayOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(dubaiToday());
  const [paidRef, setPaidRef] = useState("");

  async function call(url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error?.code === "STALE_STATE") {
          setStale(true);
          setError("This lead was updated, reloading…");
          setTimeout(() => router.refresh(), 800);
          return false;
        }
        setError(data?.error?.message ?? "Something went wrong. Please try again.");
        return false;
      }
      // Re-fetch the full detail (timeline + partner) after any mutation.
      const fresh = await fetch(`/api/admin/leads/${lead.id}`);
      const freshData = await fresh.json().catch(() => null);
      if (fresh.ok && freshData?.data) setLead(freshData.data);
      router.refresh();
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function doTransition(to: LeadStageKey) {
    const body: Record<string, unknown> = { toStage: to, expectedStage: lead.stage };
    if (to === "WON_ADVANCE_TAKEN") {
      body.totalAmount = total;
      body.commissionPercent = percent || undefined;
    }
    if (to === "LOST") {
      body.lostReason = lostReason || undefined;
      body.lostReasonNote = lostNote.trim() || undefined;
    }
    void call(`/api/admin/leads/${lead.id}/stage`, "PATCH", body).then((ok) => {
      if (ok) setSelectedTo(null);
    });
  }

  const preview =
    selectedTo === "WON_ADVANCE_TAKEN" && total && percent
      ? (() => {
          try {
            return computeCommissionAmount(total, percent);
          } catch {
            return null;
          }
        })()
      : null;
  const editPreview =
    lead.commission.status !== "NOT_SET" && lead.commission.status !== "PAID" && editTotal && editPercent
      ? (() => {
          try {
            return computeCommissionAmount(editTotal, editPercent);
          } catch {
            return null;
          }
        })()
      : null;

  const needsConfirm = (to: LeadStageKey) =>
    to === "LOST" || (lead.stage === "WON_CLOSED" && to === "WON_IN_PROCESS");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-wider text-[#011550]">{lead.token}</h1>
        <StageBadge stage={lead.stage} />
        {lead.isPossibleDuplicate && (
          <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-amber-50 text-amber-700 border-amber-300">
            Possible duplicate
          </span>
        )}
        {lead.unattended && (
          <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-rose-50 text-rose-600 border-rose-200">
            Unattended
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}
      {stale && <p className="mt-2 text-xs font-semibold text-amber-600">Reloading the latest state…</p>}

      <Card className="mt-5 p-6 grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Client</p>
          <p className="mt-1 font-bold text-slate-800">{lead.clientName}</p>
          <p className="text-sm text-slate-500">{lead.clientPhone}</p>
          <span className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${lead.clientPhone}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#0A1128] text-white px-4 py-2 text-xs font-bold min-h-[44px]">
              <Phone className="w-3.5 h-3.5" /> Call client
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
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Partner</p>
          <p className="mt-1 font-bold text-slate-800">
            {lead.partner.name}
            {lead.partner.companyName ? ` · ${lead.partner.companyName}` : ""}
          </p>
          <p className="text-sm text-slate-500">{lead.partner.phone}</p>
        </div>
        {lead.requirementNote && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Requirement note</p>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{lead.requirementNote}</p>
          </div>
        )}
        {lead.stage === "LOST" && lead.lostReason && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lost reason</p>
            <p className="mt-1 text-sm text-slate-600">{LOST_REASON_LABELS[lead.lostReason] ?? lead.lostReason}</p>
          </div>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-base font-extrabold text-[#011550]">Stage</h2>
        {lead.allowedNext.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No further stage changes are available for this lead.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.allowedNext.map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedTo(to)}
                  className={`rounded-full px-4 py-2 text-sm font-bold border transition-colors min-h-[44px] cursor-pointer disabled:opacity-60 ${
                    selectedTo === to ? "bg-[#0052FF] text-white border-[#0052FF]" : "bg-white text-slate-700 border-slate-200 hover:border-[#0052FF]"
                  }`}
                >
                  {lead.stage === "LOST" && to === "NEW" ? "Reopen" : lead.stage === "WON_CLOSED" && to === "WON_IN_PROCESS" ? "Undo close" : STAGE_BADGES[to].label}
                </button>
              ))}
            </div>

            {selectedTo === "WON_ADVANCE_TAKEN" && (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <FormField label="Total service fee (AED)" htmlFor="s-total">
                  <Input id="s-total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 10000" />
                </FormField>
                <FormField label="Commission %" htmlFor="s-percent">
                  <Input id="s-percent" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="25" />
                </FormField>
                {preview && (
                  <p className="sm:col-span-2 text-sm font-bold text-emerald-700">
                    Partner commission preview: {formatAed(preview)} <span className="text-slate-400 font-semibold">(server recomputes on save)</span>
                  </p>
                )}
              </div>
            )}
            {selectedTo === "LOST" && (
              <div className="mt-4 grid gap-4">
                <FormField label="Lost reason" htmlFor="s-lost">
                  <Select id="s-lost" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
                    <option value="" disabled>
                      Choose a reason
                    </option>
                    {LOST_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {LOST_REASON_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Note (optional)" htmlFor="s-lostnote">
                  <Textarea id="s-lostnote" rows={2} value={lostNote} onChange={(e) => setLostNote(e.target.value)} placeholder="Optional detail" />
                </FormField>
              </div>
            )}

            {selectedTo && (
              <div className="mt-4 flex justify-end">
                {needsConfirm(selectedTo) ? (
                  <ConfirmDialog
                    triggerLabel={selectedTo === "LOST" ? "Mark lost" : "Undo close"}
                    title={selectedTo === "LOST" ? "Mark this lead lost?" : "Undo the close?"}
                    message={
                      selectedTo === "LOST"
                        ? "Any commission set on this lead will be cleared (the previous figures stay in the audit timeline). The partner is not emailed."
                        : "The lead returns to In Process and its commission goes back to Expected."
                    }
                    confirmLabel={selectedTo === "LOST" ? "Mark lost" : "Undo close"}
                    onConfirm={async () => doTransition(selectedTo)}
                  />
                ) : (
                  <Button type="button" disabled={busy} onClick={() => doTransition(selectedTo)}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {busy ? "Saving..." : "Save stage"}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#011550]">Commission</h2>
          <CommissionBadge status={lead.commission.status} />
        </div>
        {lead.commission.status === "NOT_SET" ? (
          <p className="mt-2 text-sm text-slate-500">Not set yet. It is set when the advance is taken.</p>
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[#F8FAFD] border border-slate-100 p-3">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total fee</dt>
                <dd className="mt-1 font-extrabold text-slate-800">{lead.commission.totalAmount ? formatAed(lead.commission.totalAmount) : "—"}</dd>
              </div>
              <div className="rounded-xl bg-[#F8FAFD] border border-slate-100 p-3">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Percent</dt>
                <dd className="mt-1 font-extrabold text-slate-800">{lead.commission.percent ? `${lead.commission.percent}%` : "—"}</dd>
              </div>
              <div className="rounded-xl bg-[#F8FAFD] border border-slate-100 p-3">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Commission</dt>
                <dd className="mt-1 font-extrabold text-emerald-700">{lead.commission.amount ? formatAed(lead.commission.amount) : "—"}</dd>
              </div>
            </dl>
            {lead.commission.status === "PAID" ? (
              <p className="mt-3 text-sm text-slate-500">
                Paid{lead.commission.paidAt ? ` on ${formatDateTime(lead.commission.paidAt)}` : ""}
                {lead.commission.paidRef ? ` · Ref: ${lead.commission.paidRef}` : ""}. Paid commissions are locked.
              </p>
            ) : (
              <>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <FormField label="Total service fee (AED)" htmlFor="c-total">
                    <Input id="c-total" inputMode="decimal" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
                  </FormField>
                  <FormField label="Commission %" htmlFor="c-percent">
                    <Input id="c-percent" inputMode="decimal" value={editPercent} onChange={(e) => setEditPercent(e.target.value)} />
                  </FormField>
                </div>
                {editPreview && <p className="mt-2 text-sm font-bold text-emerald-700">New commission preview: {formatAed(editPreview)}</p>}
                <div className="mt-4 flex flex-wrap justify-between gap-3">
                  {lead.commission.status === "PAYABLE" ? (
                    <Button type="button" variant="secondary" onClick={() => setPayOpen(true)}>
                      Mark paid
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void call(`/api/admin/leads/${lead.id}`, "PATCH", { totalAmount: editTotal, commissionPercent: editPercent })}
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save commission
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-base font-extrabold text-[#011550]">Internal note (CEO only)</h2>
        <Textarea className="mt-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private note — partners never see this" />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void call(`/api/admin/leads/${lead.id}`, "PATCH", { internalNote: note || null })}
          >
            {busy ? "Saving..." : "Save note"}
          </Button>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-base font-extrabold text-[#011550] mb-5">Timeline</h2>
        <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5">
          {lead.timeline.map((e, i) => (
            <li key={i} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#0052FF] border-2 border-white shadow" />
              <p className="text-sm font-bold text-slate-800">{timelineLabel(e)}</p>
              <p className="text-xs text-slate-400">
                {e.actor.name} · {formatDateTime(e.createdAt)} (Dubai)
              </p>
            </li>
          ))}
        </ol>
      </Card>

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Mark commission paid">
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={() => setPayOpen(false)} />
          <div className="relative bg-white rounded-[24px] shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Mark commission paid</h2>
            <p className="mt-1 text-sm text-slate-500">
              {lead.commission.amount ? formatAed(lead.commission.amount) : ""} to {lead.partner.name}. This cannot be edited afterwards.
            </p>
            <div className="mt-4 grid gap-4">
              <FormField label="Paid date" htmlFor="pay-date">
                <Input id="pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </FormField>
              <FormField label="Reference (optional)" htmlFor="pay-ref">
                <Input id="pay-ref" value={paidRef} onChange={(e) => setPaidRef(e.target.value)} placeholder="Bank transfer ref" />
              </FormField>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPayOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await call(`/api/admin/leads/${lead.id}/commission/pay`, "POST", { paidAt, paidRef: paidRef.trim() || undefined })) {
                    setPayOpen(false);
                  }
                }}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? "Saving..." : "Mark paid"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
