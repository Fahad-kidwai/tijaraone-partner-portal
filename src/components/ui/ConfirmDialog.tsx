"use client";

import React, { useState } from "react";
import { Button } from "./Button";

/** Controlled or trigger-based confirm dialog. Pass `open`+`onCancel` for controlled mode. */
export function ConfirmDialog({
  triggerLabel,
  title,
  message,
  confirmLabel,
  onConfirm,
  triggerClassName,
  open: controlledOpen,
  onCancel,
  busy: controlledBusy,
  children,
}: {
  triggerLabel?: string;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  triggerClassName?: string;
  open?: boolean;
  onCancel?: () => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalBusy, setInternalBusy] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const busy = controlledBusy ?? internalBusy;

  function close() {
    if (isControlled) onCancel?.();
    else setInternalOpen(false);
  }

  return (
    <>
      {!isControlled && triggerLabel && (
        <Button variant="danger" className={triggerClassName} onClick={() => setInternalOpen(true)}>
          {triggerLabel}
        </Button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
          <div className="absolute inset-0 bg-[#0A1128]/60" onClick={close} />
          <div className="relative bg-white rounded-[24px] shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-extrabold text-[#011550]">{title}</h2>
            {message && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>}
            {children && <div className="mt-4 space-y-3">{children}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  if (!isControlled) setInternalBusy(true);
                  await onConfirm();
                  if (!isControlled) {
                    setInternalBusy(false);
                    setInternalOpen(false);
                  }
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
