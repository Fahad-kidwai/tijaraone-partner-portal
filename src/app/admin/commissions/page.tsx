import React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { listCommissions } from "@/lib/insights/service";
import { listPartners } from "@/lib/partners/service";
import { formatAed } from "@/lib/leads/commission";
import { Card } from "@/components/ui/Card";
import { CommissionsLedger } from "@/components/insights/CommissionsLedger";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Expected", value: "expected" },
  { label: "Payable", value: "payable" },
  { label: "Paid", value: "paid" },
] as const;

export default async function CeoCommissionsPage({
  searchParams,
}: {
  searchParams: { status?: string; partnerId?: string; month?: string; page?: string };
}) {
  const actor = await requirePageRole("CEO");
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const status =
    searchParams.status === "expected" || searchParams.status === "payable" || searchParams.status === "paid"
      ? searchParams.status
      : undefined;
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month : undefined;

  const [result, partners] = await Promise.all([
    listCommissions(actor, { status, partnerId: searchParams.partnerId || undefined, month, page, pageSize: 20 }),
    listPartners(actor, { includeInactive: true, page: 1, pageSize: 50 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const exportQs = new URLSearchParams({
    ...(status ? { status } : {}),
    ...(searchParams.partnerId ? { partnerId: searchParams.partnerId } : {}),
    ...(month ? { month } : {}),
  }).toString();
  const base = `/admin/commissions?status=${status ?? ""}&partnerId=${searchParams.partnerId ?? ""}&month=${month ?? ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#011550]">Commissions</h1>
          <p className="text-sm text-slate-500 mt-1">{result.total} record{result.total === 1 ? "" : "s"}</p>
        </div>
        <a
          href={`/api/admin/export/commissions.csv${exportQs ? `?${exportQs}` : ""}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#0A1128] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors min-h-[44px]"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Expected</p>
          <p className="mt-1 font-extrabold text-amber-700">{formatAed(result.totals.expected.amount)}</p>
          <p className="text-xs text-slate-400">{result.totals.expected.count} leads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Payable</p>
          <p className="mt-1 font-extrabold text-emerald-700">{formatAed(result.totals.payable.amount)}</p>
          <p className="text-xs text-slate-400">{result.totals.payable.count} leads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
          <p className="mt-1 font-extrabold text-emerald-700">{formatAed(result.totals.paid.amount)}</p>
          <p className="text-xs text-slate-400">{result.totals.paid.count} leads</p>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Commission status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={`/admin/commissions?status=${tab.value}`}
            className={`rounded-full px-4 py-2 text-sm font-bold border min-h-[44px] inline-flex items-center ${
              (status ?? "") === tab.value ? "bg-[#0A1128] text-white border-[#0A1128]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0052FF]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mt-4 flex flex-wrap gap-3 items-center">
        <input type="hidden" name="status" value={status ?? ""} />
        <label htmlFor="comm-partner" className="sr-only">
          Partner
        </label>
        <select
          id="comm-partner"
          name="partnerId"
          defaultValue={searchParams.partnerId ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
        >
          <option value="">All partners</option>
          {partners.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label htmlFor="comm-month" className="text-sm font-semibold text-slate-600">
          Month
        </label>
        <input
          id="comm-month"
          type="month"
          name="month"
          defaultValue={month ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#0A1128] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors cursor-pointer min-h-[44px]"
        >
          Filter
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        Month filter uses Dubai months: paid month for Paid, completed month for Payable, last stage-change month for Expected.
      </p>

      {result.data.length === 0 ? (
        <Card className="mt-5 px-6 py-14 text-center">
          <h3 className="text-base font-extrabold text-[#011550]">No commissions match</h3>
          <p className="mt-1 text-sm text-slate-500">Commissions appear here once tokens are created.</p>
        </Card>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <CommissionsLedger rows={result.data} />
        </Card>
      )}

      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm font-bold" aria-label="Pagination">
          {page > 1 ? (
            <Link href={`${base}&page=${page - 1}`} className="text-[#0052FF] hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-slate-300">← Previous</span>
          )}
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`${base}&page=${page + 1}`} className="text-[#0052FF] hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-slate-300">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
