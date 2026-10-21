import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function CommissionsPlaceholderPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#011550]">Commissions</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Your commission for each token, once TijaraOne sets it.</p>
      <Card className="p-8 text-center">
        <h2 className="text-base font-extrabold text-[#011550]">Coming in Phase 5</h2>
        <p className="mt-1 text-sm text-slate-500">
          Commission amounts appear here as your tokens progress. For now, each token's status is on its detail page.
        </p>
        <Link href="/dashboard/tokens" className="mt-4 inline-block text-sm font-bold text-[#0052FF] hover:underline">
          View my tokens
        </Link>
      </Card>
    </div>
  );
}
