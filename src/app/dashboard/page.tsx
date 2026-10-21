import React from "react";
import Link from "next/link";
import { TicketPlus, Ticket } from "lucide-react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { Card } from "@/components/ui/Card";

export default async function PartnerDashboardPage() {
  const user = await requirePageRole("PARTNER");
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Welcome, {user.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mt-1">
        Generate a referral token for each new client. TijaraOne works the client and you track your commission here.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <Link href="/dashboard/generate" className="block">
          <Card className="p-6 hover:shadow-md transition-shadow h-full">
            <TicketPlus className="w-6 h-6 text-[#0052FF]" />
            <h2 className="mt-3 font-extrabold text-[#011550]">Generate Token</h2>
            <p className="text-sm text-slate-500 mt-1">Refer a new client in under a minute.</p>
          </Card>
        </Link>
        <Link href="/dashboard/tokens" className="block">
          <Card className="p-6 hover:shadow-md transition-shadow h-full">
            <Ticket className="w-6 h-6 text-[#0052FF]" />
            <h2 className="mt-3 font-extrabold text-[#011550]">My Tokens</h2>
            <p className="text-sm text-slate-500 mt-1">Track every referral and its stage.</p>
          </Card>
        </Link>
      </div>
      <p className="text-xs text-slate-400 mt-6">Full dashboard insights and commissions arrive in Phase 5.</p>
    </div>
  );
}
