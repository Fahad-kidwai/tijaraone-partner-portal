import React from "react";
import Link from "next/link";

export interface PartnerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
  isActive: boolean;
  createdAt: string;
  stats?: { totalLeads: number; wonLeads: number; inProgressLeads: number; lostLeads: number };
}

export function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="inline-flex w-9 h-9 rounded-full bg-blue-50 text-[#0052FF] items-center justify-center text-xs font-extrabold shrink-0">
      {initials || "?"}
    </span>
  );
}

export function PartnerTable({ partners }: { partners: PartnerRow[] }) {
  if (partners.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <h3 className="text-base font-extrabold text-[#011550]">No partners found</h3>
        <p className="mt-1 text-sm text-slate-500">Add your first partner to start receiving referral tokens.</p>
      </div>
    );
  }
  return (
    <>
      {/* Mobile: cards (the table below is desktop-only) */}
      <ul className="md:hidden divide-y divide-slate-100">
        {partners.map((p) => (
          <li key={p.id} className="px-5 py-4">
            <span className="flex items-center gap-3">
              <InitialsAvatar name={p.name} />
              <span className="min-w-0">
                <span className="block font-bold text-slate-800 truncate">{p.name}</span>
                <span className="block text-xs text-slate-500 truncate">{p.email}</span>
              </span>
              <span className="ml-auto shrink-0">
                {p.isActive ? (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">Active</span>
                ) : (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-slate-100 text-slate-500 border-slate-200">Deactivated</span>
                )}
              </span>
            </span>
            <span className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span>{p.companyName ?? "—"}</span>
              <span>{p.stats?.totalLeads ?? 0} tokens</span>
              <span className="font-bold text-emerald-600">{p.stats?.wonLeads ?? 0} won</span>
              <Link href={`/admin/partners/${p.id}`} className="ml-auto text-xs font-bold text-[#0052FF]">
                View
              </Link>
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="py-3 px-4 font-bold">Partner</th>
            <th className="py-3 px-4 font-bold">Company</th>
            <th className="py-3 px-4 font-bold">Phone</th>
            <th className="py-3 px-4 font-bold text-center">Tokens</th>
            <th className="py-3 px-4 font-bold text-center">Won</th>
            <th className="py-3 px-4 font-bold">Status</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
              <td className="py-3 px-4">
                <span className="flex items-center gap-3">
                  <InitialsAvatar name={p.name} />
                  <span>
                    <span className="block font-bold text-slate-800">{p.name}</span>
                    <span className="block text-xs text-slate-500">{p.email}</span>
                  </span>
                </span>
              </td>
              <td className="py-3 px-4 text-slate-600">{p.companyName ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{p.phone}</td>
              <td className="py-3 px-4 text-center font-bold text-slate-700">{p.stats?.totalLeads ?? 0}</td>
              <td className="py-3 px-4 text-center font-bold text-emerald-600">{p.stats?.wonLeads ?? 0}</td>
              <td className="py-3 px-4">
                {p.isActive ? (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">Active</span>
                ) : (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold bg-slate-100 text-slate-500 border-slate-200">Deactivated</span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <Link href={`/admin/partners/${p.id}`} className="text-xs font-bold text-[#0052FF] hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
