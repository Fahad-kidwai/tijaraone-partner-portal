import React from "react";
import Link from "next/link";
import { TicketPlus } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { listPartnerLeads } from "@/lib/leads/service";
import { LEAD_STAGES, SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { StageBadge, STAGE_BADGES } from "@/components/leads/StageBadge";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

function TokensSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading tokens" className="mt-6 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function MyTokensPage(props: {
  searchParams: { q?: string; stage?: string; serviceType?: string; sort?: string; page?: string };
}) {
  // Local Suspense (not a route loading.tsx) so the skeleton covers only
  // this list — a segment loading boundary would also wrap tokens/[id]
  // and turn its 404 into a streamed soft-404.
  return (
    <React.Suspense fallback={<TokensSkeleton />}>
      <MyTokensContent {...props} />
    </React.Suspense>
  );
}

async function MyTokensContent({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; serviceType?: string; sort?: string; page?: string };
}) {
  const actor = await requirePageRole("PARTNER");
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const stage = (LEAD_STAGES as readonly string[]).includes(searchParams.stage ?? "")
    ? (searchParams.stage as (typeof LEAD_STAGES)[number])
    : undefined;
  const serviceType = (SERVICE_TYPES as readonly string[]).includes(searchParams.serviceType ?? "")
    ? (searchParams.serviceType as (typeof SERVICE_TYPES)[number])
    : undefined;
  const sort = searchParams.sort === "oldest" || searchParams.sort === "clientName" ? searchParams.sort : "newest";
  const result = await listPartnerLeads(actor, {
    q: searchParams.q,
    stage,
    serviceType,
    sort,
    page,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const base = `/dashboard/tokens?q=${encodeURIComponent(searchParams.q ?? "")}&stage=${stage ?? ""}&serviceType=${serviceType ?? ""}&sort=${sort}`;
  const hasFilters = Boolean(searchParams.q || stage || serviceType);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#011550]">My Tokens</h1>
          <p className="text-sm text-slate-500 mt-1">{result.total} token{result.total === 1 ? "" : "s"}</p>
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex items-center gap-2 rounded-full bg-[#0052FF] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors min-h-[44px]"
        >
          <TicketPlus className="w-4 h-4" /> Generate token
        </Link>
      </div>

      <form method="GET" className="mt-6 flex flex-wrap gap-3 items-center">
        <label htmlFor="token-search" className="sr-only">
          Search tokens
        </label>
        <input
          id="token-search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search token, client, phone..."
          className="flex-1 min-w-[200px] rounded-full bg-white border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20"
        />
        <label htmlFor="token-service" className="sr-only">
          Service
        </label>
        <select
          id="token-service"
          name="serviceType"
          defaultValue={serviceType ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
        >
          <option value="">All services</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_TYPE_LABELS[s]}
            </option>
          ))}
        </select>
        <label htmlFor="token-stage" className="sr-only">
          Stage
        </label>
        <select
          id="token-stage"
          name="stage"
          defaultValue={stage ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
        >
          <option value="">All stages</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_BADGES[s].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-[#0A1128] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors cursor-pointer min-h-[44px]"
        >
          Filter
        </button>
      </form>

      {result.data.length === 0 ? (
        <Card className="mt-6 px-6 py-14 text-center">
          <h3 className="text-base font-extrabold text-[#011550]">{hasFilters ? "No tokens match your filters" : "No tokens yet"}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasFilters ? "Try a different search or filter." : "Refer your first client and track them here."}
          </p>
          {!hasFilters && (
            <Link
              href="/dashboard/generate"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0052FF] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors min-h-[44px]"
            >
              <TicketPlus className="w-4 h-4" /> Generate your first token
            </Link>
          )}
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-slate-100">
            {result.data.map((lead) => (
              <li key={lead.id} className="px-5 py-4">
                <span className="flex items-center gap-3">
                  <span className="font-extrabold tracking-wide text-[#011550]">{lead.token}</span>
                  <span className="ml-auto">
                    <StageBadge stage={lead.stage} />
                  </span>
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-700">{lead.clientName}</span>
                <span className="block text-xs text-slate-500">
                  {SERVICE_TYPE_LABELS[lead.serviceType]} · {formatDate(lead.createdAt)}
                </span>
                <Link href={`/dashboard/tokens/${lead.id}`} className="mt-1 inline-block text-xs font-bold text-[#0052FF]">
                  View details
                </Link>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4 font-bold">Token</th>
                  <th className="py-3 px-4 font-bold">Client</th>
                  <th className="py-3 px-4 font-bold">Service</th>
                  <th className="py-3 px-4 font-bold">Stage</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-extrabold tracking-wide text-slate-800">{lead.token}</td>
                    <td className="py-3 px-4">
                      <span className="block font-semibold text-slate-700">{lead.clientName}</span>
                      <span className="block text-xs text-slate-400">{lead.clientPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{SERVICE_TYPE_LABELS[lead.serviceType]}</td>
                    <td className="py-3 px-4">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/dashboard/tokens/${lead.id}`} className="text-xs font-bold text-[#0052FF] hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
