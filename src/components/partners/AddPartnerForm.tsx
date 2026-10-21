"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input } from "../ui/fields";
import { Card } from "../ui/Card";

export function AddPartnerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", companyName: "", sendWelcomeEmail: true });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(data?.error?.fields ?? { form: data?.error?.message ?? "Could not create the partner." });
        return;
      }
      setSuccess(`Partner added: ${data.data.name} (${data.data.email})`);
      setForm({ name: "", email: "", phone: "", companyName: "", sendWelcomeEmail: true });
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" /> Add partner
      </Button>
    );
  }

  return (
    <Card className="p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-[#011550]">Add partner</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close add partner form"
          className="text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">{success}</div>
      )}
      {errors.form && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">{errors.form}</div>
      )}
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <FormField label="Full name" htmlFor="p-name" error={errors.name}>
          <Input id="p-name" required value={form.name} onChange={set("name")} placeholder="Partner name" />
        </FormField>
        <FormField label="Email (their private email)" htmlFor="p-email" error={errors.email}>
          <Input id="p-email" type="email" required value={form.email} onChange={set("email")} placeholder="name@gmail.com" />
        </FormField>
        <FormField label="Phone / WhatsApp" htmlFor="p-phone" error={errors.phone}>
          <Input id="p-phone" type="tel" required value={form.phone} onChange={set("phone")} placeholder="+971 50 000 0000" />
        </FormField>
        <FormField label="Company name" htmlFor="p-company" error={errors.companyName}>
          <Input id="p-company" required value={form.companyName} onChange={set("companyName")} placeholder="Company LLC" />
        </FormField>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.sendWelcomeEmail}
            onChange={set("sendWelcomeEmail")}
            className="w-4 h-4 accent-[#0052FF]"
          />
          Send welcome email with the sign-in link
        </label>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add partner"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
