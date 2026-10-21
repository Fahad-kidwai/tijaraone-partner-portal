"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { FormField, Input } from "../ui/fields";

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
}

/** Partner profile: name/email/company are read-only (CEO-managed); phone only is editable (Q8). */
export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [phone, setPhone] = useState(profile.phone);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setSuccess(null);
    try {
      const res = await fetch("/api/partner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(data?.error?.fields ?? { form: data?.error?.message ?? "Could not update your profile." });
        return;
      }
      setPhone(data.data.phone);
      setSuccess("Phone number updated.");
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">{success}</div>
      )}
      {errors.form && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
          {errors.form}
        </div>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <FormField label="Full name" htmlFor="pf-name">
          <Input id="pf-name" value={profile.name} readOnly disabled className="opacity-60 cursor-not-allowed" />
        </FormField>
        <FormField label="Email (sign-in)" htmlFor="pf-email">
          <Input id="pf-email" value={profile.email} readOnly disabled className="opacity-60 cursor-not-allowed" />
        </FormField>
        <FormField label="Company" htmlFor="pf-company">
          <Input id="pf-company" value={profile.companyName ?? ""} readOnly disabled className="opacity-60 cursor-not-allowed" />
        </FormField>
        <p className="-mt-1 text-xs text-slate-400">Name, email and company are managed by TijaraOne. Contact your manager to change them.</p>
        <FormField label="Phone / WhatsApp" htmlFor="pf-phone" error={errors.phone}>
          <Input id="pf-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050 123 4567" />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save phone"}
          </Button>
        </div>
      </form>
    </div>
  );
}
