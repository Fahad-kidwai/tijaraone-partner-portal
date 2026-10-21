import React from "react";
import Link from "next/link";
import { TicketPlus } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerOverview } from "@/lib/insights/service";
import { formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/insights/KpiCard";
import { StageBars } from "@/components/insights/StageBars";
import { StageBadge } from "@/components/leads/StageBadge";

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

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short" }).format(new Date(iso));
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
          <h2 className="text-base font-extrabold text-[#011550]">Generate your first token</h2>
          <p className="mt-1 text-sm text-slate-500">Refer a client and track their progress and your commission here.</p>
          <Link
            href="/dashboard/generate"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0052FF] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors min-h-[44px]"
          >
            <TicketPlus className="w-4 h-4" /> Generate your first token
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <KpiCard label="Tokens generated" value={String(kpis.tokensTotal)} sub={`${kpis.tokensThisMonth} this month`} href="/dashboard/tokens" />
            <KpiCard label="Won" value={String(kpis.wonClosed + kpis.wonInPipeline)} sub={`${kpis.wonClosed} closed · ${kpis.wonInPipeline} in pipeline`} />
            <KpiCard
              label="Commission expected / payable"
              value={formatAed(kpis.commissionPayable)}
              sub={`${formatAed(kpis.commissionExpected)} expected · ${formatAed(kpis.commissionPayable)} payable`}
              href="/dashboard/commissions"
            />
            <KpiCard label="Commission paid" value={formatAed(kpis.commissionPaid)} sub={`${formatAed(kpis.commissionPaidThisMonth)} this month`} href="/dashboard/commissions" />
          </div>

          <Card className="mt-5 p-6">
            <h2 className="text-base font-extrabold text-[#011550]">Tokens by stage</h2>
            <div className="mt-4">
              <StageBars data={overview.stageCounts} />
            </div>
          </Card>

          <Card className="mt-5 overflow-hidden">
            <h2 className="text-base font-extrabold text-[#011550] px-6 pt-5">Recent tokens</h2>
            <ul className="divide-y divide-slate-100 mt-2">
              {overview.recent.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/dashboard/tokens/${lead.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-blue-50/40 transition-colors">
                    <span className="font-extrabold tracking-wide text-[#011550]">{lead.token}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-700 truncate">{lead.clientName}</span>
                      <span className="block text-xs text-slate-400">
                        {SERVICE_TYPE_LABELS[lead.serviceType]} · {formatDate(lead.createdAt)}
                      </span>
                    </span>
                    <span className="ml-auto flex items-center gap-2 shrink-0">
                      {"amount" in lead.commission && lead.commission.amount && (
                        <span className="text-xs font-bold text-emerald-700">AED {lead.commission.amount}</span>
                      )}
                      <StageBadge stage={lead.stage} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
