"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, TicketPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input, Select, Textarea } from "../ui/fields";
import { Card } from "../ui/Card";
import { createLeadSchema, SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/schemas";

interface CreatedToken {
  id: string;
  token: string;
}

export function GenerateTokenForm() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", serviceType: "", requirementNote: "" });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function copyToken() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
    } catch {
      // Clipboard may be unavailable (permissions); the token stays visible.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setDuplicateMessage(null);

    // Inline validation with the SAME shared schema the API uses.
    const parsed = createLeadSchema.safeParse({
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      serviceType: form.serviceType,
      requirementNote: form.requirementNote.trim() ? form.requirementNote : undefined,
    });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!fields[key]) fields[key] = issue.message;
      }
      setErrors(fields);
      return;
    }

    // Busy state disables the button — a double-click cannot create two tokens.
    setBusy(true);
    try {
      const res = await fetch("/api/partner/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error?.code === "DUPLICATE_LEAD") {
          setDuplicateMessage(data.error.message);
        } else if (data?.error?.code === "RATE_LIMITED") {
          setErrors({ form: data.error.message });
        } else {
          setErrors(data?.error?.fields ?? { form: data?.error?.message ?? "Could not generate the token." });
        }
        return;
      }
      setCreated({ id: data.data.id, token: data.data.token });
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Card className="p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your referral token</p>
        <p className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-wider text-[#011550]">{created.token}</p>
        <p className="mt-3 text-sm text-slate-500">
          Share this token with your client. TijaraOne has been notified and will contact them.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={copyToken}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy token"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCreated(null);
              setCopied(false);
              setForm({ clientName: "", clientPhone: "", serviceType: "", requirementNote: "" });
            }}
          >
            <TicketPlus className="w-4 h-4" /> Generate another
          </Button>
          <Link
            href="/dashboard/tokens"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[#0052FF] hover:underline min-h-[44px]"
          >
            View my tokens
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {duplicateMessage && (
        <div role="alert" className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-sm font-semibold">
          {duplicateMessage}
        </div>
      )}
      {errors.form && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
          {errors.form}
        </div>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <FormField label="Client name / company" htmlFor="g-client" error={errors.clientName}>
          <Input id="g-client" required value={form.clientName} onChange={set("clientName")} placeholder="e.g. Al Noor Trading LLC" />
        </FormField>
        <FormField label="Service needed" htmlFor="g-service" error={errors.serviceType}>
          <Select id="g-service" required value={form.serviceType} onChange={set("serviceType")}>
            <option value="" disabled>
              Select a service
            </option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Client phone / WhatsApp" htmlFor="g-phone" error={errors.clientPhone}>
          <Input id="g-phone" type="tel" required value={form.clientPhone} onChange={set("clientPhone")} placeholder="050 123 4567" />
        </FormField>
        <p className="-mt-2 text-xs text-slate-400">UAE numbers can be typed as-is (e.g. 050…). For other countries start with + or 00.</p>
        <FormField label="Requirement note (optional)" htmlFor="g-note" error={errors.requirementNote}>
          <Textarea
            id="g-note"
            rows={3}
            maxLength={500}
            value={form.requirementNote}
            onChange={set("requirementNote")}
            placeholder="Anything TijaraOne should know before calling"
          />
        </FormField>
        <p className="-mt-2 text-xs text-slate-400 text-right">{form.requirementNote.length}/500</p>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Generating..." : "Generate token"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
