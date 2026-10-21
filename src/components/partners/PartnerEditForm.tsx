"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { FormField, Input } from "../ui/fields";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export interface PartnerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
  isActive: boolean;
}

export function PartnerEditForm({ partner }: { partner: PartnerDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: partner.name,
    email: partner.email,
    phone: partner.phone,
    companyName: partner.companyName ?? "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/admin/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErrors(data?.error?.fields ?? { form: data?.error?.message ?? "Update failed." });
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setSuccess(null);
    if (await patch(form)) {
      setSuccess("Partner updated.");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div>
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">{success}</div>
      )}
      {errors.form && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">{errors.form}</div>
      )}
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <FormField label="Full name" htmlFor="e-name" error={errors.name}>
          <Input id="e-name" required value={form.name} onChange={set("name")} />
        </FormField>
        <FormField label="Email (their private email)" htmlFor="e-email" error={errors.email}>
          <Input id="e-email" type="email" required value={form.email} onChange={set("email")} />
        </FormField>
        <FormField label="Phone / WhatsApp" htmlFor="e-phone" error={errors.phone}>
          <Input id="e-phone" type="tel" required value={form.phone} onChange={set("phone")} />
        </FormField>
        <FormField label="Company name" htmlFor="e-company" error={errors.companyName}>
          <Input id="e-company" required value={form.companyName} onChange={set("companyName")} />
        </FormField>
        <div className="sm:col-span-2 flex flex-wrap justify-between gap-3 pt-1">
          {partner.isActive ? (
            <ConfirmDialog
              triggerLabel="Deactivate partner"
              title="Deactivate this partner?"
              message="They will be signed out immediately and will no longer be able to request sign-in codes. Their tokens and history are kept. You can reactivate them at any time."
              confirmLabel="Deactivate"
              onConfirm={async () => {
                if (await patch({ isActive: false })) router.refresh();
              }}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (await patch({ isActive: true })) router.refresh();
              }}
            >
              Reactivate partner
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
