import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("CEO");
  return (
    <AppShell role="CEO" userName={user.name}>
      {children}
    </AppShell>
  );
}
