import React from "react";
import { ShieldCheck, Users, Headphones } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-bottom bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/images/portal_bg.jpg')", backgroundPosition: "center bottom" }}
        />
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#EBF2FC]/70 via-[#F3F7FD]/40 to-transparent" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center text-center mb-5 max-w-lg">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-blue.png" alt="TijaraOne Icon" className="h-8 sm:h-9 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/tijaraone_text.svg" alt="TijaraOne Wordmark" className="h-5 sm:h-6 w-auto object-contain" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-3">Executive Partner Portal</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#011550] tracking-tight">
            Welcome <span className="text-[#0052FF]">Back</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            Access is by invitation. Contact your TijaraOne manager.
          </p>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,35,110,0.14)] border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0094FF] pt-5 pb-5 px-6 text-center text-white">
            <h2 className="text-sm sm:text-base font-extrabold tracking-widest uppercase">Member Login</h2>
            <div className="w-10 h-0.5 bg-[#00E5FF] mx-auto mt-1 rounded-full" />
          </div>
          <div className="p-6 sm:p-8">
            <LoginForm />
          </div>
        </div>

        <div className="w-full max-w-[580px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,35,110,0.08)] border border-slate-200/80 p-4 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, title: "Secure Access", sub: "Your data is protected" },
            { icon: Users, title: "Partner Network", sub: "Authorized Portal" },
            { icon: Headphones, title: "Need Help?", sub: "support@tijaraone.com" },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#0052FF]">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{title}</p>
                <p className="text-[10px] text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 pb-4 text-center px-4">
        <p className="text-[11px] text-slate-500 font-medium">© 2026 TijaraOne. All rights reserved.</p>
      </footer>
    </div>
  );
}
