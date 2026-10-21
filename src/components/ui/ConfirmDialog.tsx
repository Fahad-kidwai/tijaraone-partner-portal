"use client";

import React, { useState } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  triggerLabel,
  title,
  message,
  confirmLabel,
  onConfirm,
  triggerClassName,
}: {
  triggerLabel: string;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button variant="danger" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-[24px] shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-[#011550]">{title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onConfirm();
                  setBusy(false);
                  setOpen(false);
                }}
              >
                {busy ? "Working..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
