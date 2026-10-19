"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ShieldCheck, Users, Headphones, Globe, ArrowRight, Check } from "lucide-react";
import { INITIAL_PARTNERS, INITIAL_CLIENTS, INITIAL_CEO } from "@/lib/mockData";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const [langOpen, setLangOpen] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase();

      // 1. CEO / Admin Check
      if (
        (cleanUser === "ceo" || cleanUser === "admin" || cleanUser === "ceo@tijaraone.ae") &&
        password === INITIAL_CEO.password
      ) {
        localStorage.setItem("tijaraone_admin_session", JSON.stringify(INITIAL_CEO.profile));
        router.push("/admin");
        return;
      }

      // 2. Partner Check
      const foundPartnerKey = Object.keys(INITIAL_PARTNERS).find(
        (key) =>
          key.toLowerCase() === cleanUser ||
          INITIAL_PARTNERS[key].profile.username.toLowerCase() === cleanUser ||
          INITIAL_PARTNERS[key].profile.email.toLowerCase() === cleanUser
      );

      if (foundPartnerKey && INITIAL_PARTNERS[foundPartnerKey].password === password) {
        const partner = INITIAL_PARTNERS[foundPartnerKey].profile;
        localStorage.setItem("tijaraone_partner_session", JSON.stringify(partner));
        router.push("/dashboard");
        return;
      }

      setError("Invalid credentials. Try: ceo / admin123 or partner1 / password123");
      setLoading(false);
    }, 350);
  };

  const handleQuickFill = (user: string, pass: string, role: "ceo" | "partner") => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError(null);
    setTimeout(() => {
      if (role === "ceo") {
        localStorage.setItem("tijaraone_admin_session", JSON.stringify(INITIAL_CEO.profile));
        router.push("/admin");
      } else if (role === "partner") {
        const partner = INITIAL_PARTNERS[user].profile;
        localStorage.setItem("tijaraone_partner_session", JSON.stringify(partner));
        router.push("/dashboard");
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between relative overflow-x-hidden select-none">
      
      {/* Background: User's Official Dubai Skyline & UAE Flag Artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Full Image Background aligned to bottom */}
        <div
          className="absolute inset-0 bg-bottom bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/portal_bg.jpg')",
            backgroundPosition: "center bottom",
          }}
        />

        {/* Subtle Top Soft Sky Gradient Blend */}
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#EBF2FC]/70 via-[#F3F7FD]/40 to-transparent pointer-events-none" />
      </div>

      {/* Top Header Bar with Language Selector */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-5 sm:pt-7 flex justify-end">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer backdrop-blur-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#0052FF]" />
            <span>{selectedLang}</span>
            <span className="text-[9px] text-slate-400">▼</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 text-xs font-medium animate-in fade-in duration-100">
              {["English", "العربية (Arabic)", "Русский (Russian)"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedLang(lang.split(" ")[0]);
                    setLangOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-700 hover:text-[#0052FF] transition flex items-center justify-between"
                >
                  <span>{lang}</span>
                  {selectedLang === lang.split(" ")[0] && (
                    <Check className="w-3 h-3 text-[#0052FF]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6">
        
        {/* Tijara One Official Blue Branding Header */}
        <div className="flex flex-col items-center text-center mb-5 max-w-lg">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <img
              src="/images/logo-blue.png"
              alt="TijaraOne Icon"
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-xs"
            />
            <img
              src="/images/tijaraone_text.svg"
              alt="TijaraOne Wordmark"
              className="h-5 sm:h-6 w-auto object-contain"
            />
          </div>

          <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-3">
            EXECUTIVE PARTNER PORTAL
          </p>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#011550] tracking-tight">
            Welcome <span className="text-[#0052FF]">Back</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal max-w-md">
            Access your partner account and continue growing with Tijara One.
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[420px] bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,35,110,0.14)] border border-slate-100 overflow-hidden relative">
          
          {/* Top Royal Blue Gradient Banner */}
          <div className="bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0094FF] pt-5 pb-5 px-6 text-center text-white relative">
            <h2 className="text-sm sm:text-base font-extrabold tracking-widest uppercase">
              MEMBER LOGIN
            </h2>
            <div className="w-10 h-0.5 bg-[#00E5FF] mx-auto mt-1 rounded-full shadow-xs" />
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Username Input Pill */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ENTER USERNAME"
                  className="w-full pl-11 pr-4 py-3.5 rounded-full bg-[#F8FAFD] border border-slate-200 text-xs sm:text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:bg-white focus:ring-2 focus:ring-[#0052FF]/20 transition-all uppercase placeholder:normal-case sm:placeholder:uppercase"
                />
              </div>

              {/* Password Input Pill */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER PASSWORD"
                  className="w-full pl-11 pr-4 py-3.5 rounded-full bg-[#F8FAFD] border border-slate-200 text-xs sm:text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:bg-white focus:ring-2 focus:ring-[#0052FF]/20 transition-all uppercase placeholder:normal-case sm:placeholder:uppercase"
                />
              </div>

              {/* Login Button Pill */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0080FF] hover:from-[#002CB8] hover:to-[#006BE0] text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? "AUTHENTICATING..." : "LOGIN"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-2 text-[11px] font-bold tracking-wider">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 uppercase">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF] accent-[#0052FF] cursor-pointer"
                  />
                  <span>REMEMBER</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert("Please contact support@tijaraone.com to reset partner credentials.")}
                  className="text-[#0052FF] hover:text-[#0038E0] hover:underline uppercase transition-colors"
                >
                  FORGOT THE PASSWORD?
                </button>
              </div>

            </form>

            {/* Quick Demo Helper */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Demo Logins:
              </span>
              <button
                type="button"
                onClick={() => handleQuickFill("ceo", "admin123", "ceo")}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                👑 CEO Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("partner1", "password123", "partner")}
                className="text-[11px] font-bold text-[#0052FF] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                🤝 Partner 1
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Floating Card: 3 Trust Badges */}
        <div className="w-full max-w-[580px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,35,110,0.08)] border border-slate-200/80 p-3 sm:p-4 mt-6 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 gap-3 sm:gap-0">
          
          {/* Badge 1: Secure Access */}
          <div className="flex items-center gap-3 px-2 sm:px-3 py-1.5 sm:py-0">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#0052FF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Secure Access</p>
              <p className="text-[10px] text-slate-500">Your data is protected</p>
            </div>
          </div>

          {/* Badge 2: Partner Network */}
          <div className="flex items-center gap-3 px-2 sm:px-3 py-1.5 sm:py-0">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#0052FF]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Partner Network</p>
              <p className="text-[10px] text-slate-500">Authorized Portal</p>
            </div>
          </div>

          {/* Badge 3: Need Help? */}
          <div className="flex items-center gap-3 px-2 sm:px-3 py-1.5 sm:py-0">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#0052FF]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Need Help?</p>
              <p className="text-[10px] text-slate-500">support@tijaraone.com</p>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-4 text-center px-4">
        <p className="text-[11px] text-slate-500 font-medium">
          © 2026 Tijara One Solutions. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
