import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("PARTNER");
  return (
    <AppShell role="PARTNER" userName={user.name}>
      {children}
    </AppShell>
  );
}
