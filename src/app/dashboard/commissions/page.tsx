import React from "react";
import Link from "next/link";
import { TicketPlus } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerCommissions } from "@/lib/insights/service";
import { formatAed } from "@/lib/leads/commission";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { StageBadge, CommissionBadge } from "@/components/leads/StageBadge";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function PartnerCommissionsPage() {
  const actor = await requirePageRole("PARTNER");
  const commissions = await getPartnerCommissions(actor);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Commissions</h1>
      <p className="text-sm text-slate-500 mt-1">What you have earned from your referrals.</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Expected</p>
          <p className="mt-1 font-extrabold text-amber-700">{formatAed(commissions.totals.expected)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Payable</p>
          <p className="mt-1 font-extrabold text-emerald-700">{formatAed(commissions.totals.payable)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
          <p className="mt-1 font-extrabold text-emerald-700">{formatAed(commissions.totals.paid)}</p>
        </Card>
      </div>

      {commissions.data.length === 0 ? (
        <Card className="mt-5 px-6 py-14 text-center">
          <h2 className="text-base font-extrabold text-[#011550]">No commissions yet</h2>
          <p className="mt-1 text-sm text-slate-500">Commissions appear once TijaraOne takes an advance on one of your referrals.</p>
          <Link
            href="/dashboard/generate"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0052FF] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#004DD9] transition-colors min-h-[44px]"
          >
            <TicketPlus className="w-4 h-4" /> Generate a token
          </Link>
        </Card>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {commissions.data.map((lead) => (
              <li key={lead.id}>
                <Link href={`/dashboard/tokens/${lead.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-blue-50/40 transition-colors">
                  <span className="min-w-0">
                    <span className="block font-extrabold tracking-wide text-[#011550]">{lead.token}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {lead.clientName} · {SERVICE_TYPE_LABELS[lead.serviceType]}
                    </span>
                    {"paidAt" in lead.commission && lead.commission.paidAt && (
                      <span className="block text-xs text-slate-400">Paid {formatDate(lead.commission.paidAt)}</span>
                    )}
                  </span>
                  <span className="ml-auto text-right shrink-0">
                    {"amount" in lead.commission && lead.commission.amount && (
                      <span className="block font-extrabold text-emerald-700">
                        AED {lead.commission.amount}
                        {"percent" in lead.commission && lead.commission.percent ? ` · ${lead.commission.percent}%` : ""}
                      </span>
                    )}
                    <span className="mt-1 flex gap-1 justify-end">
                      <StageBadge stage={lead.stage} />
                      <CommissionBadge status={lead.commission.status} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
