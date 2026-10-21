"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { FormField, Input } from "../ui/fields";
import { CommissionBadge } from "../leads/StageBadge";
import { formatAed } from "@/lib/leads/commission";

export interface CommissionRow {
  leadId: string;
  token: string;
  partner: { id: string; name: string; companyName: string | null };
  clientName: string;
  serviceLabel: string;
  stage: string;
  totalAmount: string | null;
  percent: string | null;
  amount: string | null;
  status: "NOT_SET" | "EXPECTED" | "PAYABLE" | "PAID";
  paidAt: string | null;
  paidRef: string | null;
}

function dubaiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Ledger table/cards with the Mark-paid action (reuses the Phase 4 pay flow). */
export function CommissionsLedger({ rows }: { rows: CommissionRow[] }) {
  const router = useRouter();
  const [paying, setPaying] = useState<CommissionRow | null>(null);
  const [paidAt, setPaidAt] = useState(dubaiToday());
  const [paidRef, setPaidRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    if (!paying) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${paying.leadId}/commission/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAt, paidRef: paidRef.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error?.code === "STALE_STATE") {
          setError("This lead was updated, reloading…");
          setTimeout(() => router.refresh(), 800);
        } else {
          setError(data?.error?.message ?? "Could not mark paid.");
        }
        return;
      }
      setPaying(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) return null;

  return (
    <>
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}
      {/* Mobile cards */}
      <ul className="md:hidden divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.leadId} className="px-5 py-4">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-wide text-[#011550]">{row.token}</span>
              <CommissionBadge status={row.status} />
              <span className="ml-auto font-extrabold text-emerald-700">{row.amount ? formatAed(row.amount) : "—"}</span>
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-700">
              {row.clientName} · {row.serviceLabel}
            </span>
            <span className="block text-xs text-slate-500">
              {row.partner.name} · {row.percent ? `${row.percent}%` : "—"}
              {row.status === "PAID" ? ` · Paid ${formatDate(row.paidAt)}` : ""}
            </span>
            {row.status === "PAYABLE" && (
              <Button type="button" className="mt-2" onClick={() => { setPaying(row); setPaidAt(dubaiToday()); setPaidRef(""); }}>
                Mark paid
              </Button>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-3 px-4 font-bold">Token</th>
              <th className="py-3 px-4 font-bold">Partner</th>
              <th className="py-3 px-4 font-bold">Client / Service</th>
              <th className="py-3 px-4 font-bold text-right">Total fee</th>
              <th className="py-3 px-4 font-bold text-right">%</th>
              <th className="py-3 px-4 font-bold text-right">Commission</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold">Paid</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.leadId} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-4 font-extrabold tracking-wide text-slate-800">{row.token}</td>
                <td className="py-3 px-4 text-slate-600">{row.partner.name}</td>
                <td className="py-3 px-4">
                  <span className="block font-semibold text-slate-700">{row.clientName}</span>
                  <span className="block text-xs text-slate-400">{row.serviceLabel}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-600">{row.totalAmount ? formatAed(row.totalAmount) : "—"}</td>
                <td className="py-3 px-4 text-right text-slate-600">{row.percent ? `${row.percent}%` : "—"}</td>
                <td className="py-3 px-4 text-right font-extrabold text-emerald-700">{row.amount ? formatAed(row.amount) : "—"}</td>
                <td className="py-3 px-4">
                  <CommissionBadge status={row.status} />
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {row.status === "PAID" ? (
                    <>
                      {formatDate(row.paidAt)}
                      {row.paidRef ? <span className="block text-xs text-slate-400">{row.paidRef}</span> : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {row.status === "PAYABLE" && (
                    <Button type="button" onClick={() => { setPaying(row); setPaidAt(dubaiToday()); setPaidRef(""); }}>
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Mark commission paid">
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={() => setPaying(null)} />
          <div className="relative bg-white rounded-[24px] shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Mark commission paid</h2>
            <p className="mt-1 text-sm text-slate-500">
              {paying.amount ? formatAed(paying.amount) : ""} to {paying.partner.name} for {paying.token}. This cannot be edited afterwards.
            </p>
            <div className="mt-4 grid gap-4">
              <FormField label="Paid date" htmlFor="ledger-pay-date">
                <Input id="ledger-pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </FormField>
              <FormField label="Reference (optional)" htmlFor="ledger-pay-ref">
                <Input id="ledger-pay-ref" value={paidRef} onChange={(e) => setPaidRef(e.target.value)} placeholder="Bank transfer ref" />
              </FormField>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPaying(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => void markPaid()}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? "Saving..." : "Mark paid"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
