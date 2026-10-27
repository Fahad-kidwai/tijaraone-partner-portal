"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input, Select, Textarea } from "../ui/fields";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { StageBadge, CommissionBadge, STAGE_BADGES, type LeadStageKey } from "./StageBadge";
import { computeCommissionAmount, formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS, SERVICE_TYPES, LEAD_STAGES } from "@/lib/schemas";

export interface CeoLeadDetailData {
  id: string;
  token: string;
  partner: { id: string; name: string; email: string; phone: string; companyName: string | null };
  clientName: string;
  serviceType: keyof typeof SERVICE_TYPE_LABELS;
  stage: LeadStageKey;
  internalNote: string | null;
  completedAt: string | null;
  createdAt: string;
  allowedNext: LeadStageKey[];
  commission: {
    status: "EXPECTED" | "PAYABLE" | "PAID";
    totalAmount: string;
    percent: string;
    amount: string;
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
      return "Token created";
    case "STAGE_CHANGED":
      return `Phase: ${e.fromStage ? STAGE_BADGES[e.fromStage].label : ""} → ${e.toStage ? STAGE_BADGES[e.toStage].label : ""}`;
    case "COMMISSION_UPDATED":
      return "Commission updated";
    case "COMMISSION_PAID":
      return "Commission marked paid";
    case "NOTE_UPDATED":
      return "Internal note updated";
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
  const [selectedTo, setSelectedTo] = useState<LeadStageKey | "">("");
  const [clientName, setClientName] = useState(initial.clientName);
  const [serviceType, setServiceType] = useState(initial.serviceType);
  const [note, setNote] = useState(initial.internalNote ?? "");
  const [editTotal, setEditTotal] = useState(initial.commission.totalAmount);
  const [editPercent, setEditPercent] = useState(initial.commission.percent);
  const [payOpen, setPayOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(dubaiToday());
  const [paidRef, setPaidRef] = useState("");

  const locked = lead.commission.status === "PAID";

  async function call(url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    setStale(false);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.error?.code === "STALE_STATE") {
        setStale(true);
        return false;
      }
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong.");
        return false;
      }
      if (data?.data) {
        setLead((prev) => ({ ...prev, ...data.data, timeline: data.data.timeline ?? prev.timeline }));
        setClientName(data.data.clientName);
        setServiceType(data.data.serviceType);
        setNote(data.data.internalNote ?? "");
        setEditTotal(data.data.commission.totalAmount);
        setEditPercent(data.data.commission.percent);
        setSelectedTo("");
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveFields() {
    await call(`/api/admin/leads/${lead.id}`, "PATCH", {
      clientName,
      serviceType,
      totalAmount: editTotal,
      commissionPercent: editPercent,
      internalNote: note.trim() === "" ? null : note,
    });
  }

  async function changeStage() {
    if (!selectedTo) return;
    await call(`/api/admin/leads/${lead.id}`, "PATCH", {
      toStage: selectedTo,
      expectedStage: lead.stage,
    });
  }

  async function markPaid() {
    const ok = await call(`/api/admin/leads/${lead.id}/commission/pay`, "POST", {
      paidAt,
      paidRef: paidRef.trim() || undefined,
    });
    if (ok) setPayOpen(false);
  }

  const preview =
    editTotal && editPercent
      ? (() => {
          try {
            return computeCommissionAmount(editTotal, editPercent);
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-extrabold tracking-wider text-[#011550]">{lead.token}</h2>
        <StageBadge stage={lead.stage} />
        <CommissionBadge status={lead.commission.status} />
      </div>
      <p className="text-sm text-slate-500">
        Partner: {lead.partner.name}
        {lead.partner.companyName ? ` (${lead.partner.companyName})` : ""} · Created {formatDateTime(lead.createdAt)}
      </p>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      {stale && (
        <p className="text-sm font-semibold text-amber-700">
          This token was updated elsewhere.{" "}
          <button type="button" className="underline font-bold" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      )}

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-extrabold text-[#011550]">Details</h3>
        <FormField label="Client name" htmlFor="d-client">
          <Input id="d-client" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={locked || busy} maxLength={120} />
        </FormField>
        <FormField label="Service" htmlFor="d-service">
          <Select id="d-service" value={serviceType} onChange={(e) => setServiceType(e.target.value as typeof serviceType)} disabled={locked || busy}>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Total service fee (AED)" htmlFor="d-total">
          <Input id="d-total" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} disabled={locked || busy} inputMode="decimal" />
        </FormField>
        <FormField label="Commission %" htmlFor="d-pct">
          <Input id="d-pct" value={editPercent} onChange={(e) => setEditPercent(e.target.value)} disabled={locked || busy} inputMode="decimal" />
        </FormField>
        {preview && <p className="text-sm font-bold text-emerald-700">Commission preview: {formatAed(preview)}</p>}
        <FormField label="Internal note (CEO only)" htmlFor="d-note">
          <Textarea id="d-note" value={note} onChange={(e) => setNote(e.target.value)} disabled={locked || busy} rows={3} maxLength={2000} />
        </FormField>
        {!locked && (
          <Button type="button" onClick={saveFields} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save changes
          </Button>
        )}
        {locked && <p className="text-xs text-slate-500">Paid commissions are locked. Corrections are developer-run (see OPERATIONS.md).</p>}
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-[#011550]">Phase</h3>
        {locked ? (
          <p className="text-sm text-slate-500">Phase is locked after commission is paid.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {LEAD_STAGES.filter((s) => s !== lead.stage).map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedTo(to)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold min-h-[40px] ${
                    selectedTo === to ? "bg-[#0052FF] text-white border-[#0052FF]" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {STAGE_BADGES[to].label}
                </button>
              ))}
            </div>
            {selectedTo && (
              <Button type="button" onClick={changeStage} disabled={busy}>
                Move to {STAGE_BADGES[selectedTo].label}
              </Button>
            )}
          </>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-[#011550]">Commission</h3>
        <p className="text-sm text-slate-700">
          {formatAed(lead.commission.amount)} ({lead.commission.percent}%) · <CommissionBadge status={lead.commission.status} />
        </p>
        {lead.commission.status === "PAID" && lead.commission.paidAt && (
          <p className="text-xs text-slate-500">
            Paid {formatDateTime(lead.commission.paidAt)}
            {lead.commission.paidRef ? ` · Ref ${lead.commission.paidRef}` : ""}
          </p>
        )}
        {lead.commission.status === "PAYABLE" && lead.stage === "COMPLETED" && (
          <Button type="button" onClick={() => setPayOpen(true)} disabled={busy}>
            Mark paid
          </Button>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-extrabold text-[#011550] mb-4">Timeline</h3>
        <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
          {lead.timeline.map((e, i) => (
            <li key={i} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#0052FF] border-2 border-white shadow" />
              <p className="text-sm font-bold text-slate-800">{timelineLabel(e)}</p>
              <p className="text-xs text-slate-400">
                {e.actor.name} · {formatDateTime(e.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={payOpen}
        title="Mark commission paid?"
        message={`Confirm payment of ${formatAed(lead.commission.amount)} for ${lead.token}.`}
        confirmLabel="Mark paid"
        onCancel={() => setPayOpen(false)}
        onConfirm={markPaid}
        busy={busy}
      >
        <FormField label="Paid date (Asia/Dubai)" htmlFor="paid-at">
          <Input id="paid-at" type="date" value={paidAt} max={dubaiToday()} onChange={(e) => setPaidAt(e.target.value)} />
        </FormField>
        <FormField label="Reference (optional)" htmlFor="paid-ref">
          <Input id="paid-ref" value={paidRef} onChange={(e) => setPaidRef(e.target.value)} maxLength={120} />
        </FormField>
      </ConfirmDialog>
    </div>
  );
}
