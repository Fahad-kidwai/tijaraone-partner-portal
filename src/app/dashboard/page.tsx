import React from "react";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerOverview } from "@/lib/insights/service";
import { formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/insights/KpiCard";
import { StageBars } from "@/components/insights/StageBars";
import { StageBadge, CommissionBadge } from "@/components/leads/StageBadge";

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[24px] bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="h-56 rounded-[24px] bg-white border border-slate-100 animate-pulse" />
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      <PartnerDashboardContent />
    </React.Suspense>
  );
}

async function PartnerDashboardContent() {
  const actor = await requirePageRole("PARTNER");
  const overview = await getPartnerOverview(actor);
  const { kpis } = overview;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Welcome, {actor.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mt-1">Your referrals and commissions at a glance.</p>

      {kpis.tokensTotal === 0 ? (
        <Card className="mt-6 px-6 py-14 text-center">
          <h2 className="text-base font-extrabold text-[#011550]">No tokens yet</h2>
          <p className="mt-1 text-sm text-slate-500">Tokens appear here once TijaraOne registers a client you referred.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <KpiCard label="Tokens" value={String(kpis.tokensTotal)} href="/dashboard/tokens" />
            <KpiCard label="In progress" value={String(kpis.inProgress)} href="/dashboard/tokens?stage=IN_PROGRESS" />
            <KpiCard label="Commission payable + expected" value={formatAed(kpis.commissionPayableExpected)} />
            <KpiCard
              label="Commission paid"
              value={formatAed(kpis.commissionPaid)}
              sub={`${formatAed(kpis.commissionPaidThisMonth)} this month`}
            />
          </div>

          <Card className="mt-5 p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Tokens by phase</h2>
            <div className="mt-4">
              <StageBars data={overview.stageCounts} />
            </div>
          </Card>

          <Card className="mt-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#011550]">Recent tokens</h2>
              <Link href="/dashboard/tokens" className="text-xs font-bold text-[#0052FF]">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-4 font-bold">Token</th>
                    <th className="py-3 px-4 font-bold">Client</th>
                    <th className="py-3 px-4 font-bold">Service</th>
                    <th className="py-3 px-4 font-bold">Phase</th>
                    <th className="py-3 px-4 font-bold">Commission</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recent.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-50">
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/tokens/${lead.id}`} className="font-extrabold tracking-wide text-[#0052FF]">
                          {lead.token}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{lead.clientName}</td>
                      <td className="py-3 px-4 text-slate-600">{SERVICE_TYPE_LABELS[lead.serviceType]}</td>
                      <td className="py-3 px-4">
                        <StageBadge stage={lead.stage} />
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{formatAed(lead.commission.amount)}</td>
                      <td className="py-3 px-4">
                        <CommissionBadge status={lead.commission.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
