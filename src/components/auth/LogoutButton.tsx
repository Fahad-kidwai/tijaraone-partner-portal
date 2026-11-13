"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Top-bar sign-out: avatar + name (desktop) + button. */
export function LogoutButton({ userName }: { userName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
     <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 min-h-[40px]"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Sign out</span>
      </button>
    </div>
  );
}
