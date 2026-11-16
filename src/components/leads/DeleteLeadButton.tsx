"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export function DeleteLeadButton({
  leadId,
  clientName,
  clientId,
  commissionStatus,
  redirectTo,
  onDeleted,
  variant = "button",
}: {
  leadId: string;
  clientName: string;
  clientId: string;
  commissionStatus: "EXPECTED" | "PAYABLE" | "PAID";
  /** After success, navigate here (detail page → list). Otherwise refresh in place. */
  redirectTo?: string;
  onDeleted?: () => void;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paid = commissionStatus === "PAID";
  const paidTitle = "Paid clients can't be deleted";

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Could not delete this client.");
        return;
      }
      setOpen(false);
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        disabled={paid}
        title={paid ? paidTitle : "Delete client"}
        aria-label={paid ? paidTitle : "Delete client"}
        onClick={(e) => {
          e.stopPropagation();
          if (!paid) setOpen(true);
        }}
        className="inline-flex items-center justify-center p-2 rounded-full text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    ) : (
      <Button
        type="button"
        variant="danger"
        disabled={paid}
        title={paid ? paidTitle : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4" /> Delete client
      </Button>
    );

  return (
    <>
      {trigger}
      <ConfirmDialog
        open={open}
        title="Delete client?"
        message={`${clientName} · ${clientId}. This permanently removes the client and its history. This can't be undone.`}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => {
          if (!busy) {
            setOpen(false);
            setError(null);
          }
        }}
        onConfirm={onConfirm}
        busy={busy}
      >
        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}
        {busy && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
