import React from "react";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { listCeoLeads } from "@/lib/leads/service";
import { listPartners } from "@/lib/partners/service";
import { LEAD_STAGES, SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { CeoLeadsList } from "@/components/leads/CeoLeadsList";
import { CreateTokenForm } from "@/components/leads/CreateTokenForm";

const CHIPS = [
  { label: "All", stage: "" },
  { label: "Advance Received", stage: "ADVANCE_RECEIVED" },
  { label: "In Progress", stage: "IN_PROGRESS" },
  { label: "Completed", stage: "COMPLETED" },
] as const;

function LeadsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading tokens" className="mt-5 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function CeoLeadsPage(props: {
  searchParams: { q?: string; stage?: string; serviceType?: string; partnerId?: string; page?: string; create?: string };
}) {
  return (
    <React.Suspense fallback={<LeadsSkeleton />}>
      <CeoLeadsContent {...props} />
    </React.Suspense>
  );
}

async function CeoLeadsContent({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; serviceType?: string; partnerId?: string; page?: string; create?: string };
}) {
  const actor = await requirePageRole("CEO");
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const stage = (LEAD_STAGES as readonly string[]).includes(searchParams.stage ?? "")
    ? (searchParams.stage as (typeof LEAD_STAGES)[number])
    : undefined;
  const serviceType = (SERVICE_TYPES as readonly string[]).includes(searchParams.serviceType ?? "")
    ? (searchParams.serviceType as (typeof SERVICE_TYPES)[number])
    : undefined;

  const [result, partners] = await Promise.all([
    listCeoLeads(actor, {
      q: searchParams.q,
      stage,
      serviceType,
      partnerId: searchParams.partnerId || undefined,
      page,
      pageSize: 20,
    }),
    listPartners(actor, { includeInactive: false, page: 1, pageSize: 50 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const base = `/admin/leads?q=${encodeURIComponent(searchParams.q ?? "")}&stage=${stage ?? ""}&serviceType=${serviceType ?? ""}&partnerId=${searchParams.partnerId ?? ""}`;
  const hasFilters = Boolean(searchParams.q || stage || serviceType || searchParams.partnerId);
  const showCreate = searchParams.create === "1";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#011550]">Tokens</h1>
          <p className="text-sm text-slate-500 mt-1">
            {result.total} token{result.total === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={showCreate ? "/admin/leads" : "/admin/leads?create=1"}
          className="inline-flex items-center rounded-full bg-[#0052FF] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] min-h-[44px]"
        >
          {showCreate ? "Close form" : "Create token"}
        </Link>
      </div>

      {showCreate && (
        <Card className="mt-5 p-6">
          <h2 className="text-base font-extrabold text-[#011550] mb-4">Create token</h2>
          <CreateTokenForm partners={partners.data.filter((p) => p.isActive)} />
        </Card>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Phase filters">
        {CHIPS.map((chip) => {
          const active = (stage ?? "") === chip.stage;
          return (
            <Link
              key={chip.label}
              href={`/admin/leads?stage=${chip.stage}`}
              className={`rounded-full px-4 py-2 text-sm font-bold border min-h-[44px] inline-flex items-center ${
                active ? "bg-[#0A1128] text-white border-[#0A1128]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0052FF]"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      <form method="GET" className="mt-4 flex flex-wrap gap-3 items-center">
        {stage && <input type="hidden" name="stage" value={stage} />}
        <label htmlFor="lead-search" className="sr-only">
          Search tokens
        </label>
        <input
          id="lead-search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search token or client..."
          className="flex-1 min-w-[200px] rounded-full bg-white border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20"
        />
        <select
          id="lead-service"
          name="serviceType"
          defaultValue={serviceType ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
          aria-label="Service"
        >
          <option value="">All services</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_TYPE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          id="lead-partner"
          name="partnerId"
          defaultValue={searchParams.partnerId ?? ""}
          className="rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0052FF]"
          aria-label="Partner"
        >
          <option value="">All partners</option>
          {partners.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
        <Card className="mt-5 px-6 py-14 text-center">
          <h3 className="text-base font-extrabold text-[#011550]">{hasFilters ? "No tokens match your filters" : "No tokens yet"}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasFilters ? "Try a different search or filter." : "Create a token once a referred client has agreed."}
          </p>
        </Card>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <CeoLeadsList leads={result.data} />
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
