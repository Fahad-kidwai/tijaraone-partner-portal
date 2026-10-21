import React from "react";
import Link from "next/link";

export function KpiCard({
  label,
  value,
  sub,
  highlight = false,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-[24px] border p-5 h-full ${
        highlight ? "bg-amber-50 border-amber-300" : "bg-white border-slate-100 shadow-[0_2px_20px_rgba(1,21,80,0.04)]"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${highlight ? "text-amber-700" : "text-[#011550]"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs font-semibold text-slate-500">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : (
    inner
  );
}
