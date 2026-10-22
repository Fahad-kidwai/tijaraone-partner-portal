"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Never renders the caught error (no stack
 * traces, no internal messages, no PII) — just a friendly message, a
 * retry, and a role-aware "back to my dashboard" link resolved from
 * /api/me (falls back to the sign-in page when signed out).
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [dashboardHref, setDashboardHref] = useState("/");
  const [dashboardLabel, setDashboardLabel] = useState("Back to sign in");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { role?: string } } | null) => {
        if (cancelled || !json?.data?.role) return;
        setDashboardHref(json.data.role === "CEO" ? "/admin" : "/dashboard");
        setDashboardLabel("Back to my dashboard");
      })
      .catch(() => {
        // Keep the sign-in fallback link.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#004DD9]">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-bold text-[#011550]">We hit a snag</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sorry — that page could not be loaded. Please try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#004DD9] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0043c2]"
          >
            Try again
          </button>
          <Link
            href={dashboardHref}
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-[#011550] transition hover:bg-slate-50"
          >
            {dashboardLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
