import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getCeoLead } from "@/lib/leads/service";
import { ServiceError } from "@/lib/partners/service";
import { CeoLeadDetail } from "@/components/leads/CeoLeadDetail";

export default async function CeoLeadDetailPage({ params }: { params: { id: string } }) {
  const actor = await requirePageRole("CEO");
  let lead;
  try {
    lead = await getCeoLead(actor, params.id);
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="max-w-3xl">
      <Link href="/admin/leads" className="text-sm font-bold text-[#0052FF] hover:underline">
        ← Tokens
      </Link>
      <div className="mt-4">
        <CeoLeadDetail initial={lead} />
      </div>
    </div>
  );
}
