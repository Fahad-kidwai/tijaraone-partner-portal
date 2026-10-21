import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#011550]">Overview</h1>
      <p className="text-sm text-slate-500 mt-1">KPIs, pipeline funnel and top partners arrive in Phase 5.</p>
      <Card className="mt-6 p-8 text-center">
        <p className="text-sm font-semibold text-slate-600">
          Partner management is live under <span className="text-[#0052FF]">Partners</span>. Leads open in Phase 4, insights in Phase 5.
        </p>
      </Card>
    </div>
  );
}
