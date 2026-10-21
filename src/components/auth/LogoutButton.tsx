"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data) setLabel(`${data.data.name} · ${data.data.role}`);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      {label && <p className="text-xs font-bold text-slate-500">Signed in as {label}</p>}
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-[#0052FF] hover:text-[#0052FF] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]/40"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
}
