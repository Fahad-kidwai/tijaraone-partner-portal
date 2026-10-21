"use client";

import React, { useRef } from "react";

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, digit: string) => {
    const next = (value.padEnd(6, " ").split(""));
    next[index] = digit;
    const joined = next.join("").trimEnd();
    onChange(joined);
    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (joined.length === 6) onComplete?.(joined);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One-time code, 6 digits">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          maxLength={1}
          disabled={disabled}
          autoFocus={i === 0}
          value={value[i] ?? ""}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, digit);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
            if (pasted.length === 6) onComplete?.(pasted);
          }}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-extrabold rounded-xl bg-[#F8FAFD] border border-slate-200 text-slate-800 focus:outline-none focus:border-[#0052FF] focus:bg-white focus:ring-2 focus:ring-[#0052FF]/20 transition-all disabled:opacity-60"
        />
      ))}
    </div>
  );
}
