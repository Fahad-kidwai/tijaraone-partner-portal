import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getCeoOverview } from "@/lib/insights/service";
import { formatAed } from "@/lib/leads/commission";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/insights/KpiCard";
import { StageBars } from "@/components/insights/StageBars";
import { TopPartnersList } from "@/components/insights/OverviewTabs";

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
  const hasAny = overview.stageCounts.some((s) => s.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Overview</h1>
      <p className="text-sm text-slate-500 mt-1">Tokens and commissions at a glance.</p>

      {!hasAny ? (
        <Card className="mt-6 px-6 py-14 text-center">
          <h2 className="text-base font-extrabold text-[#011550]">No tokens yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create a token once a referred client has agreed.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <KpiCard label="Active tokens" value={String(kpis.activeTokens)} sub="Not completed" href="/admin/leads?stage=IN_PROGRESS" />
            <KpiCard label="Completed this month" value={String(kpis.completedThisMonth)} sub="Dubai calendar month" />
            <KpiCard label="Commission payable" value={formatAed(kpis.commissionPayable)} href="/admin/commissions?status=payable" />
            <KpiCard label="Commission paid this month" value={formatAed(kpis.commissionPaidThisMonth)} href="/admin/commissions?status=paid" />
          </div>

          <Card className="mt-5 p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Tokens by phase</h2>
            <div className="mt-4">
              <StageBars data={overview.stageCounts} />
            </div>
          </Card>

          <Card className="mt-5 p-6">
            <h2 className="text-base font-extrabold text-[#011550] mb-2">Top partners</h2>
            <TopPartnersList topPartners={overview.topPartners} />
          </Card>
        </>
      )}
    </div>
  );
}
