"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { OtpInput } from "./OtpInput";

type Step = "email" | "otp";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.fields?.email ?? data?.error?.message ?? "Please enter a valid email address.");
        return;
      }
      setNotice(data.message);
      setStep("otp");
      setCode("");
      setResendIn(30);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(fullCode: string) {
    if (submittingRef.current || fullCode.length !== 6) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: fullCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Invalid or expired code. Please try again.");
        setCode("");
        return;
      }
      const role = data?.data?.user?.role;
      router.push(role === "CEO" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div>
      <div aria-live="polite">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {notice && !error && step === "otp" && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#0052FF] text-xs font-semibold leading-relaxed">
            {notice}
          </div>
        )}
      </div>

      {step === "email" ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <label htmlFor="login-email" className="sr-only">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="EMAIL ADDRESS"
              className="w-full pl-11 pr-4 py-3.5 rounded-full bg-[#F8FAFD] border border-slate-200 text-xs sm:text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:bg-white focus:ring-2 focus:ring-[#0052FF]/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0080FF] hover:from-[#002CB8] hover:to-[#006BE0] text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? "SENDING CODE..." : "EMAIL ME A CODE"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[11px] font-semibold text-slate-500 pt-1">
            Access is by invitation. Contact your TijaraOne manager.
          </p>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-xs font-semibold text-slate-600">
            Enter the 6-digit code sent to <span className="text-[#011550]">{email.trim().toLowerCase()}</span>
          </p>

          <OtpInput value={code} onChange={setCode} onComplete={verifyCode} disabled={loading} />

          <button
            type="button"
            onClick={() => verifyCode(code)}
            disabled={loading || code.length !== 6}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0080FF] hover:from-[#002CB8] hover:to-[#006BE0] text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{loading ? "VERIFYING..." : "VERIFY & SIGN IN"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between pt-1 text-[11px] font-bold tracking-wide">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
                setNotice(null);
              }}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-[#0052FF] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> CHANGE EMAIL
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={() => requestCode()}
              className="inline-flex items-center gap-1 text-[#0052FF] hover:text-[#0038E0] disabled:text-slate-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendIn > 0 ? `RESEND IN ${resendIn}s` : "RESEND CODE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
