import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerProfile } from "@/lib/leads/service";
import { Card } from "@/components/ui/Card";

export default async function ProfilePage() {
  const actor = await requirePageRole("PARTNER");
  const profile = await getPartnerProfile(actor);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#011550]">Profile</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Read-only. Contact TijaraOne if anything needs updating.</p>
      <Card className="p-6 space-y-4">
        {[
          { label: "Name", value: profile.name },
          { label: "Email", value: profile.email },
          { label: "Phone", value: profile.phone },
          { label: "Company", value: profile.companyName ?? "—" },
        ].map((row) => (
          <div key={row.label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{row.label}</p>
            <p className="mt-1 font-semibold text-slate-800">{row.value}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
