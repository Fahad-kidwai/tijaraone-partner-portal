import React from "react";
import { Card } from "./ui/Card";
import { LogoutButton } from "./auth/LogoutButton";

/** Temporary Phase 0 placeholder. Real screens land phase by phase (plan §9). */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="min-h-screen bg-[#F4F7FC] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-blue.png" alt="TijaraOne" className="h-9 w-auto mx-auto object-contain" />
        <h1 className="mt-4 text-xl font-extrabold text-[#011550]">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          This portal is being rebuilt on a secure foundation. {phase} will bring this screen online.
        </p>
        <LogoutButton />
      </Card>
    </main>
  );
}
