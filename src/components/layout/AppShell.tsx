"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Ticket, Coins, CircleUserRound, type LucideIcon } from "lucide-react";
import { LogoutButton } from "../auth/LogoutButton";

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  phase?: string;
}

const CEO_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/leads", icon: Ticket },
  { label: "Partners", href: "/admin/partners", icon: Users },
  { label: "Commissions", href: "/admin/commissions", icon: Coins },
];

const PARTNER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Clients", href: "/dashboard/clients", icon: Ticket },
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
  const mobileNav = nav.filter((item) => item.href);
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
        <nav className="px-3 space-y-1 flex-1" aria-label="Main">
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
        <div className="mt-auto px-5 py-5 border-t border-white/10 flex items-center gap-3">
          <span
            className="inline-flex w-9 h-9 rounded-full bg-white/15 text-white items-center justify-center text-xs font-extrabold shrink-0"
            aria-hidden
          >
            {userName
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("") || "?"}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {role === "CEO" ? "CEO · Admin" : "Partner"}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[#0A1128] text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tijaraone_logo_white_tight.png"
              alt="TijaraOne"
              className="h-6 w-auto object-contain md:hidden shrink-0"
            />
            <p className="hidden md:block text-xs font-bold uppercase tracking-widest text-slate-400">
              {role === "CEO" ? "CEO · Admin" : "Partner"}
            </p>
          </div>
          <LogoutButton userName={userName} />
        </header>
        <main className="flex-1 px-4 sm:px-8 pt-6 pb-24 md:pb-6 w-full max-w-6xl mx-auto">{children}</main>
      </div>

      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0A1128] pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` }}
        >
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            return (
              <li key={item.label} className="min-w-0">
                <Link
                  href={item.href!}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-full flex-col items-center gap-1 px-0.5 pt-2 pb-2 text-[10px] font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 items-center justify-center rounded-full px-3.5 ${
                      isActive ? "bg-[#004DD9] text-white" : ""
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="w-full text-center">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
