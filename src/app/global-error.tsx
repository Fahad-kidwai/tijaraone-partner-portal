"use client";

import { useEffect, useState } from "react";

/**
 * Last-resort error boundary (catches failures in the root layout itself,
 * so it must render its own <html>/<body> and cannot rely on globals.css —
 * inline styles only). Never renders the caught error: no stack traces,
 * no internal messages, no PII.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F4F7FC",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#1e293b",
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            backgroundColor: "#ffffff",
            borderRadius: "1.5rem",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 1px 2px rgba(1, 21, 80, 0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", color: "#004DD9" }}>
            SOMETHING WENT WRONG
          </p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#011550" }}>
            We hit a snag
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#475569" }}>
            Sorry — the portal could not be loaded. Please try again, or head back to your dashboard.
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: "999px",
                backgroundColor: "#004DD9",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Try again
            </button>
            <a
              href={dashboardHref}
              style={{
                borderRadius: "999px",
                border: "1px solid #cbd5e1",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#011550",
                textDecoration: "none",
              }}
            >
              {dashboardLabel}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
