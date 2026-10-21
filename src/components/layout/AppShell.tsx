"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Ticket, TicketPlus, Coins, CircleUserRound, type LucideIcon } from "lucide-react";
import { LogoutButton } from "../auth/LogoutButton";

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  phase?: string;
}

const CEO_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Leads", icon: Ticket, phase: "Phase 4" },
  { label: "Partners", href: "/admin/partners", icon: Users },
  { label: "Commissions", icon: Coins, phase: "Phase 5" },
];

const PARTNER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Generate Token", href: "/dashboard/generate", icon: TicketPlus },
  { label: "My Tokens", href: "/dashboard/tokens", icon: Ticket },
  { label: "Commissions", href: "/dashboard/commissions", icon: Coins, phase: "Phase 5" },
  { label: "Profile", href: "/dashboard/profile", icon: CircleUserRound },
];

export function AppShell({
  role,
  userName,
  children,
}: {
  role: "CEO" | "PARTNER";
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = role === "CEO" ? CEO_NAV : PARTNER_NAV;
  const active =
    nav.find((i) => i.href && i.href !== "/admin" && i.href !== "/dashboard" && pathname.startsWith(i.href))?.label ??
    nav.find((i) => i.href === pathname)?.label ??
    nav[0].label;
  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#0A1128] text-slate-200 min-h-screen sticky top-0">
        <div className="px-5 py-6 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/tijaraone_logo_white_tight.png" alt="TijaraOne" className="h-7 w-auto object-contain" />
        </div>
        <nav className="px-3 space-y-1" aria-label="Main">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  title={`Coming in ${item.phase}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-slate-600">Soon</span>
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "bg-[#004DD9] text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-5 py-5 border-t border-white/10">
          <p className="text-xs font-bold text-white truncate">{userName}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{role === "CEO" ? "CEO · Admin" : "Partner"}</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 bg-[#0A1128] text-white px-4 py-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/tijaraone_logo_white_tight.png" alt="TijaraOne" className="h-6 w-auto object-contain" />
          <nav className="flex gap-1" aria-label="Main">
            {nav
              .filter((i) => i.href)
              .map((i) => (
                <Link
                  key={i.label}
                  href={i.href!}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${i.label === active ? "bg-[#004DD9]" : "text-slate-300"}`}
                >
                  {i.label}
                </Link>
              ))}
          </nav>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-6 w-full max-w-6xl mx-auto">{children}</main>
        <footer className="px-4 pb-6 flex justify-center">
          <LogoutButton />
        </footer>
      </div>
    </div>
  );
}
