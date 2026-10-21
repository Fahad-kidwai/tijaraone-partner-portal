import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartner, ServiceError } from "@/lib/partners/service";
import { Card } from "@/components/ui/Card";
import { InitialsAvatar } from "@/components/partners/PartnerTable";
import { PartnerEditForm } from "@/components/partners/PartnerEditForm";
import { StageBadge } from "@/components/leads/StageBadge";
import { SERVICE_TYPE_LABELS } from "@/lib/schemas";

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const actor = await requirePageRole("CEO");
  let partner;
  try {
    partner = await getPartner(actor, params.id);
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }

  const stats = partner.stats ?? { totalLeads: 0, wonLeads: 0, inProgressLeads: 0, lostLeads: 0 };

  return (
    <div>
      <Link href="/admin/partners" className="text-xs font-bold text-[#0052FF] hover:underline">
        ← All partners
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <InitialsAvatar name={partner.name} />
        <div>
          <h1 className="text-2xl font-extrabold text-[#011550]">{partner.name}</h1>
          <p className="text-sm text-slate-500">
            {partner.email} · {partner.phone}
            {partner.companyName ? ` · ${partner.companyName}` : ""}
          </p>
        </div>
        <span
          className={`ml-auto inline-flex px-3 py-1 rounded-full border text-[11px] font-bold ${
            partner.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {partner.isActive ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tokens generated", value: stats.totalLeads },
          { label: "Won (closed)", value: stats.wonLeads },
          { label: "In won pipeline", value: stats.inProgressLeads },
          { label: "Lost", value: stats.lostLeads },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[#011550]">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-extrabold text-[#011550] mb-4">Partner details</h2>
        <PartnerEditForm partner={partner} />
      </Card>

      <Card className="mt-6 overflow-hidden">
        <h2 className="text-base font-extrabold text-[#011550] px-6 pt-5 pb-3">Their tokens</h2>
        {partner.leads.data.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-slate-500">No tokens yet. They will appear here as soon as this partner generates one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-y border-slate-100">
                  <th className="py-2.5 px-4 font-bold">Token</th>
                  <th className="py-2.5 px-4 font-bold">Client</th>
                  <th className="py-2.5 px-4 font-bold">Service</th>
                  <th className="py-2.5 px-4 font-bold">Stage</th>
                  <th className="py-2.5 px-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {partner.leads.data.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50">
                    <td className="py-2.5 px-4 font-bold text-[#0052FF]">{lead.token}</td>
                    <td className="py-2.5 px-4 text-slate-700">{lead.clientName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{SERVICE_TYPE_LABELS[lead.serviceType]}</td>
                    <td className="py-2.5 px-4">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{new Date(lead.createdAt).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
