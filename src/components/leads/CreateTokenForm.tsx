"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input, Select, Textarea } from "../ui/fields";
import { computeCommissionAmount, formatAed, DEFAULT_COMMISSION_PERCENT } from "@/lib/leads/commission";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, LEAD_STAGES, LEAD_STAGE_LABELS } from "@/lib/schemas";

export interface ActivePartnerOption {
  id: string;
  name: string;
  companyName: string | null;
}

export function CreateTokenForm({ partners }: { partners: ActivePartnerOption[] }) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>("MAINLAND_SETUP");
  const [totalAmount, setTotalAmount] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(DEFAULT_COMMISSION_PERCENT);
  const [stage, setStage] = useState<(typeof LEAD_STAGES)[number]>("ADVANCE_RECEIVED");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ id: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => {
    try {
      if (!totalAmount || !commissionPercent) return null;
      return computeCommissionAmount(totalAmount, commissionPercent);
    } catch {
      return null;
    }
  }, [totalAmount, commissionPercent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          clientName,
          serviceType,
          totalAmount,
          commissionPercent,
          stage,
          ...(internalNote.trim() ? { internalNote: internalNote.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Could not create token.");
        if (data?.error?.fields) setFields(data.error.fields);
        return;
      }
      setCreated({ id: data.data.id, token: data.data.token });
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (created) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-sm font-bold text-emerald-700">Token created</p>
        <p className="text-4xl font-extrabold tracking-wider text-[#011550]">{created.token}</p>
        <div className="flex justify-center gap-2">
          <Button type="button" onClick={copyToken}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCreated(null);
              setClientName("");
              setTotalAmount("");
              setCommissionPercent(DEFAULT_COMMISSION_PERCENT);
              setStage("ADVANCE_RECEIVED");
              setInternalNote("");
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return <p className="text-sm text-slate-500">Add an active partner before creating tokens.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      <FormField label="Partner" htmlFor="ct-partner" error={fields.partnerId}>
        <Select id="ct-partner" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.companyName ? ` · ${p.companyName}` : ""}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Client name" htmlFor="ct-client" error={fields.clientName}>
        <Input id="ct-client" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} required />
      </FormField>
      <FormField label="Service" htmlFor="ct-service" error={fields.serviceType}>
        <Select id="ct-service" value={serviceType} onChange={(e) => setServiceType(e.target.value as typeof serviceType)}>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_TYPE_LABELS[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Total service fee (AED)" htmlFor="ct-total" error={fields.totalAmount}>
        <Input id="ct-total" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} inputMode="decimal" required />
      </FormField>
      <FormField label="Commission %" htmlFor="ct-pct" error={fields.commissionPercent}>
        <Input id="ct-pct" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} inputMode="decimal" required />
      </FormField>
      {preview && <p className="text-sm font-bold text-emerald-700">Commission: {formatAed(preview)}</p>}
      <FormField label="Starting phase" htmlFor="ct-stage">
        <Select id="ct-stage" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Internal note (optional)" htmlFor="ct-note">
        <Textarea id="ct-note" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2} maxLength={2000} />
      </FormField>
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {busy ? "Creating..." : "Create token"}
      </Button>
    </form>
  );
}
