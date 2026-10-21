import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getCeoOverview } from "@/lib/insights/service";
import { formatAed } from "@/lib/leads/commission";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/insights/KpiCard";
import { StageBars } from "@/components/insights/StageBars";
import { OverviewTabs } from "@/components/insights/OverviewTabs";

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[24px] bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="h-56 rounded-[24px] bg-white border border-slate-100 animate-pulse" />
      <div className="h-56 rounded-[24px] bg-white border border-slate-100 animate-pulse" />
    </div>
  );
}

export default function CeoOverviewPage() {
  return (
    <React.Suspense fallback={<OverviewSkeleton />}>
      <CeoOverviewContent />
    </React.Suspense>
  );
}

async function CeoOverviewContent() {
  const actor = await requirePageRole("CEO");
  const overview = await getCeoOverview(actor);
  const { kpis } = overview;
  const hasAnyLeads = overview.stageCounts.some((s) => s.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Overview</h1>
      <p className="text-sm text-slate-500 mt-1">The whole pipeline at a glance. All figures are live from the database.</p>

      {!hasAnyLeads ? (
        <Card className="mt-6 px-6 py-14 text-center">
          <h2 className="text-base font-extrabold text-[#011550]">No leads yet</h2>
          <p className="mt-1 text-sm text-slate-500">When partners generate referral tokens, your pipeline will appear here.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <KpiCard
              label="New leads awaiting action"
              value={String(kpis.awaitingAction)}
              sub="Unviewed, or new for over 48 hours"
              highlight={kpis.awaitingAction > 0}
              href="/admin/leads?stageGroup=new"
            />
            <KpiCard
              label="Won this month"
              value={String(kpis.wonThisMonth)}
              sub={`${kpis.wonInPipeline} more in the won pipeline`}
            />
            <KpiCard
              label="Conversion rate (last 90 days)"
              value={kpis.conversion90d.percent !== null ? `${kpis.conversion90d.percent}%` : "—"}
              sub={
                kpis.conversion90d.decided > 0
                  ? `${kpis.conversion90d.won} of ${kpis.conversion90d.decided} decided leads won`
                  : "No decided leads yet"
              }
            />
            <KpiCard label="Commission payable" value={formatAed(kpis.commissionPayable)} sub="Ready to pay partners" href="/admin/commissions?status=payable" />
          </div>

          <Card className="mt-5 p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Leads by stage</h2>
            <div className="mt-4">
              <StageBars data={overview.stageCounts} note="Current snapshot of where every lead stands — not a cohort conversion funnel." />
            </div>
          </Card>

          <Card className="mt-5 p-6">
            <OverviewTabs topPartners={overview.topPartners} needsAttention={overview.needsAttention} />
          </Card>

          <details className="mt-5 group">
            <summary className="cursor-pointer text-sm font-bold text-[#0052FF]">More breakdowns (by service, by month)</summary>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Card className="p-6">
                <h3 className="text-sm font-extrabold text-[#011550]">Leads by service</h3>
                <ul className="mt-3 space-y-2">
                  {overview.byService.map((row) => (
                    <li key={row.serviceType} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-semibold">{row.label}</span>
                      <span className="font-extrabold text-slate-800">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-extrabold text-[#011550]">Leads per month (last 6, Dubai)</h3>
                <ul className="mt-3 space-y-2">
                  {overview.byMonth.map((row) => (
                    <li key={row.key} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-semibold">{row.label}</span>
                      <span className="font-extrabold text-slate-800">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
