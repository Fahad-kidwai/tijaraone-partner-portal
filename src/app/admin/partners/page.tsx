import React from "react";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { listPartners } from "@/lib/partners/service";
import { Card } from "@/components/ui/Card";
import { PartnerTable } from "@/components/partners/PartnerTable";
import { AddPartnerForm } from "@/components/partners/AddPartnerForm";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: { q?: string; includeInactive?: string; page?: string };
}) {
  const actor = await requirePageRole("CEO");
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const includeInactive = searchParams.includeInactive === "true";
  const result = await listPartners(actor, {
    q: searchParams.q,
    includeInactive,
    page,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const base = `/admin/partners?q=${encodeURIComponent(searchParams.q ?? "")}&includeInactive=${includeInactive}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#011550]">Partners</h1>
          <p className="text-sm text-slate-500 mt-1">{result.total} partner{result.total === 1 ? "" : "s"} · partners sign in with their private email via one-time code.</p>
        </div>
        <AddPartnerForm />
      </div>

      <form method="GET" className="mt-6 flex flex-wrap gap-3 items-center">
        <label htmlFor="partner-search" className="sr-only">
          Search partners
        </label>
        <input
          id="partner-search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search name, email, company..."
          className="flex-1 min-w-[220px] rounded-full bg-white border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20"
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" name="includeInactive" value="true" defaultChecked={includeInactive} className="w-4 h-4 accent-[#0052FF]" />
          Include deactivated
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#0A1128] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      <Card className="mt-5 overflow-hidden">
        <PartnerTable partners={result.data} />
      </Card>

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
