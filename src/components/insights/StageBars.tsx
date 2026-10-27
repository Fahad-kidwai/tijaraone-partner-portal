import React from "react";

/** Horizontal stage bars — Tailwind divs only, no chart library. */
export function StageBars({
  data,
  note,
}: {
  data: Array<{ stage: string; label: string; count: number }>;
  note?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <ul className="space-y-3">
        {data.map((row) => (
          <li key={row.stage} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-xs font-bold text-slate-600">{row.label}</span>
            <span className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
              <span
                className="block h-full rounded-full bg-[#0052FF]"
                style={{ width: `${Math.round((row.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-extrabold text-slate-700">{row.count}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
