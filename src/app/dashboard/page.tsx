"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  UserPlus,
  Users,
  Coins,
  BarChart3,
  Megaphone,
  User,
  Headphones,
  Search,
  Bell,
  Globe,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Plus,
  LogOut,
  Menu,
} from "lucide-react";
import { INITIAL_PARTNERS, INITIAL_CLIENTS } from "@/lib/mockData";
import { ClientRecord, PartnerUser } from "@/lib/types";
import { translations, Language } from "@/lib/translations";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerUser>(INITIAL_PARTNERS["partner1"].profile);
  const [clients, setClients] = useState<ClientRecord[]>(INITIAL_CLIENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("ALL");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  
  // Header Dropdown States
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);

  useEffect(() => {
    const savedLang = localStorage.getItem("tijaraone_lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "ar" || savedLang === "ru")) {
      setCurrentLang(savedLang);
    }
  }, []);

  const handleSelectLang = (code: Language) => {
    setCurrentLang(code);
    localStorage.setItem("tijaraone_lang", code);
    setLangMenuOpen(false);
  };

  const t = translations[currentLang] || translations.en;

  const languageOptions: { code: Language; name: string; label: string }[] = [
    { code: "en", name: "English", label: "English" },
    { code: "ar", name: "العربية", label: "العربية (Arabic)" },
    { code: "ru", name: "Русский", label: "Русский (Russian)" },
  ];
  
  // Modal State for "Generate Client ID"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientService, setNewClientService] = useState("Business Setup");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [generatedSuccessId, setGeneratedSuccessId] = useState<string | null>(null);

  // {t.card1Title} Modal
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem("tijaraone_partner_session");
    if (sessionStr) {
      try {
        const u = JSON.parse(sessionStr);
        setPartner(u);
      } catch (err) {
        console.error("Invalid session", err);
      }
    }

    const savedClients = localStorage.getItem("tijaraone_clients");
    if (savedClients) {
      try {
        setClients(JSON.parse(savedClients));
      } catch (err) {
        console.error("Invalid saved clients", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tijaraone_partner_session");
    router.push("/");
  };

  const handleGenerateClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const nextNumber = 1000 + clients.length + 1;
    const newId = `TJ-${nextNumber}`;
    const today = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());

    const newRecord: ClientRecord = {
      id: `cl-${Date.now()}`,
      clientId: newId,
      clientName: newClientName.trim(),
      service: newClientService,
      status: "In Progress",
      commission: "Under Review",
      date: today,
      notes: newClientNotes.trim(),
      partnerId: partner.id,
    };

    const updated = [newRecord, ...clients];
    setClients(updated);
    localStorage.setItem("tijaraone_clients", JSON.stringify(updated));

    // Update partner stat
    const updatedPartner = {
      ...partner,
      totalClients: partner.totalClients + 1,
      activeClients: partner.activeClients + 1,
    };
    setPartner(updatedPartner);
    localStorage.setItem("tijaraone_partner_session", JSON.stringify(updatedPartner));

    setGeneratedSuccessId(newId);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientNotes("");
    setGeneratedSuccessId(null);
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService =
      selectedServiceFilter === "ALL" || c.service === selectedServiceFilter;
    return matchesSearch && matchesService;
  });

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 flex flex-col lg:flex-row font-sans">
      
      {/* ========================================================
          LEFT SIDEBAR (Desktop - Fixed Full-Height)
      ======================================================== */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-64 bg-[#011550] text-white justify-between select-none overflow-hidden shadow-2xl">
        
        {/* Top: Branding & Navigation */}
        <div className="pt-5 px-4 shrink-0">
          {/* Logo Brand */}
          <div className="px-2 mb-5 cursor-pointer select-none" onClick={() => router.push("/dashboard")}>
            <img
              src="/images/tijaraone_logo_white_tight.png"
              alt="TijaraOne"
              className="h-6 w-auto object-contain object-left"
            />
            <span className="text-[7.5px] font-bold text-slate-300 tracking-[0.22em] block uppercase mt-1 pl-0.5">
              {t.portalSubtitle}
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-0.5">
            {[
              { name: t.navDashboard, icon: Home },
              { name: t.navGenerateClientId, icon: UserPlus, action: () => setIsModalOpen(true) },
              { name: t.navMyClients, icon: Users },
              { name: t.navCommissions, icon: Coins },
              { name: t.navReports, icon: BarChart3 },
              { name: t.navMarketingMaterials, icon: Megaphone, action: () => setIsMaterialsModalOpen(true) },
              { name: t.navProfile, icon: User },
              { name: t.navSupport, icon: Headphones, action: () => setIsTrainingModalOpen(true) },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeMenuIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveMenuIndex(idx);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0052FF] text-white shadow-md shadow-blue-900/40"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* From Just Below 'Support' Down To The Very Bottom: Full Width Seamless Flow */}
        <div className="relative flex-1 w-full flex flex-col justify-end p-4 overflow-hidden group cursor-pointer">
          
          {/* 4K Ultra-HD Dubai Skyline & Burj Khalifa Background - Edge to Edge */}
          <div
            className="absolute inset-0 bg-cover bg-top transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: "url('/images/sidebar_grow_hd.jpg')" }}
          />
          
          {/* Seamless Top Fade Gradient: dissolves image top into the exact sidebar #011550 background */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#011550] via-[#011550]/40 to-transparent pointer-events-none" />

          {/* Bottom Dark Contrast Gradient for Exit bar & text readability */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#000e33] via-[#000e33]/70 to-transparent pointer-events-none" />

          {/* User Signout Link neatly seated at bottom of sidebar with zero overflow */}
          <div className="relative z-10 pt-2 pb-0.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-200">
            <span className="truncate font-semibold max-w-[130px]">{partner.companyName}</span>
            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-bold shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.exit}</span>
            </button>
          </div>

        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 pb-20 lg:pb-8">
        
        {/* TOP HEADER BAR */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Mobile Logo on Small Screens */}
          <div className="lg:hidden flex items-center gap-2">
            <img
              src="/images/logo-blue.png"
              alt="TijaraOne Icon"
              className="h-6 w-auto object-contain"
            />
            <span className="text-sm font-black text-[#011550] tracking-wider">
              TIJARAONE
            </span>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:bg-white transition-all"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => alert(t.notificationsMsg)}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>{t.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-150">
                  {languageOptions.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => handleSelectLang(opt.code)}
                      className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition flex items-center justify-between ${
                        currentLang === opt.code ? "text-[#0052FF] font-bold bg-blue-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {currentLang === opt.code && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile Chip */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer"
              >
                <img
                  src={partner.avatarUrl || "/images/executive_avatar.png"}
                  alt={partner.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0052FF]/20"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {partner.name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {partner.companyName}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="font-bold text-slate-900">{partner.name}</p>
                    <p className="text-[10px] text-slate-400">{partner.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF] text-[9.5px] font-bold">
                      {partner.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const p2 = INITIAL_PARTNERS["partner2"].profile;
                      setPartner(p2);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition"
                  >
                    Switch to Partner 2
                  </button>
                  <button
                    onClick={() => {
                      const p1 = INITIAL_PARTNERS["partner1"].profile;
                      setPartner(p1);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition"
                  >
                    Switch to Partner 1
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold transition flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pt-3">
          <div className="flex items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients, ID or status..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
            />
          </div>
        </div>

        {/* DASHBOARD BODY CONTAINER */}
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* ========================================================
              WELCOME BANNER WITH 4K DUBAI SKYLINE & UAE FLAG ART
          ======================================================== */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 relative overflow-hidden p-6 sm:p-7 min-h-[125px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* 4K Panoramic Dubai Skyline Artwork with Smooth Left Fade */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 lg:w-1/2 pointer-events-none bg-no-repeat bg-cover hidden sm:block opacity-90"
              style={{
                backgroundImage: "url('/images/welcome_banner_hd.jpg')",
                backgroundPosition: "center 30%",
                maskImage: "linear-gradient(to right, transparent 0%, black 35%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 35%)",
              }}
            />

            {/* Left Content (Professional Corporate Typography) */}
            <div className="relative z-10 max-w-md sm:max-w-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#0052FF] text-[9.5px] font-extrabold uppercase tracking-widest">
                  {t.partnerBadge}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#011550] tracking-tight">
                {t.welcomeBack} <span className="text-[#0052FF]">{partner.name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                {t.welcomeSub}
              </p>
            </div>


          </div>

          {/* ========================================================
              4 STAT CARDS
          ======================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Total Clients */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0052FF]">
                  <Users className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-500">{t.totalClients}</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {partner.totalClients}
              </p>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                <span>↑ 20%</span>
                <span className="text-slate-400 font-normal">{t.vsLastMonth}</span>
              </p>
            </div>

            {/* Card 2: Active Clients */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <FileText className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-500">{t.activeClients}</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {partner.activeClients}
              </p>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                <span>↑ 33%</span>
                <span className="text-slate-400 font-normal">{t.vsLastMonth}</span>
              </p>
            </div>

            {/* Card 3: Total Commission */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Coins className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-500">{t.totalCommission}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {partner.totalCommission}
              </p>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                <span>↑ 18%</span>
                <span className="text-slate-400 font-normal">{t.vsLastMonth}</span>
              </p>
            </div>

            {/* Card 4: Pending Commission */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0052FF]">
                  <Clock className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-500">{t.pendingCommission}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {partner.pendingCommission}
              </p>
              <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                4 {t.clientsPending}
              </p>
            </div>

          </div>

          {/* ========================================================
              ACTION BANNER: GENERATE NEW {t.thClientId}
          ======================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0052FF] flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Generate New Client ID
                </h3>
                <p className="text-xs text-slate-500">
                  {t.generateBannerSub}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0052FF] to-[#0070FF] hover:from-[#002CB8] hover:to-[#005FE0] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Client ID →</span>
            </button>
          </div>

          {/* ========================================================
              TWO COLUMN LAYOUT: RECENT CLIENTS & CHARTS
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT 2 COLUMNS: RECENT CLIENTS TABLE & RESOURCE CARDS */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Recent Clients Card */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Recent Clients
                  </h3>
                  <button 
                    onClick={() => setSelectedServiceFilter("ALL")}
                    className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Client ID</th>
                        <th className="py-2.5 px-3">Client Name</th>
                        <th className="py-2.5 px-3">Service</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Commission</th>
                        <th className="py-2.5 px-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {filteredClients.slice(0, 5).map((client, index) => (
                        <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#0052FF]">
                            {client.clientId}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {client.clientName}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {client.service}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                                client.status === "Completed"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : client.status === "In Progress"
                                  ? "bg-blue-50 text-[#0052FF] border-blue-200"
                                  : "bg-amber-50 text-amber-600 border-amber-200"
                              }`}
                            >
                              {client.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {client.commission === "Under Review" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Under Review
                              </span>
                            ) : (
                              client.commission
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-right">
                            {client.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View (from Screenshot 3) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {filteredClients.slice(0, 5).map((client) => (
                    <div key={client.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0052FF]">
                            {client.clientId}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {client.clientName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10.5px] text-slate-500">
                            {client.service}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                              client.status === "Completed"
                                ? "bg-emerald-50 text-emerald-600"
                                : client.status === "In Progress"
                                ? "bg-blue-50 text-[#0052FF]"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {client.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {client.commission === "Under Review" ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Under Review
                            </span>
                          ) : (
                            client.commission
                          )}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* 3 Quick Resource Cards under Table */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Resource 1 */}
                <div 
                  onClick={() => setIsMaterialsModalOpen(true)}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 hover:border-[#0052FF]/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0052FF] shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Marketing Materials
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Get brochures, logos & decks.
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </div>

                {/* Resource 2 */}
                <div 
                  onClick={() => setIsTrainingModalOpen(true)}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 hover:border-[#0052FF]/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0052FF] shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {t.card2Title}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Learn service workflows.
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </div>

                {/* Resource 3 */}
                <div 
                  onClick={() => alert("Connecting to Tijara One Partner Support Desk. Email: support@tijaraone.com")}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 hover:border-[#0052FF]/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0052FF] shrink-0">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {t.card3Title}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Contact support team.
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: DONUT CHART & CLIENT {t.thStatus} BAR CHART */}
            <div className="space-y-4">
              
              {/* Card 1: {t.commissionOverviewTitle} (Donut Chart) */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Commission Overview
                  </h3>
                  <button className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-700">
                    <span>{t.thisMonth}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  
                  {/* Circular Donut Ring Graphic */}
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#E2E8F0"
                        strokeWidth="11"
                        fill="transparent"
                      />
                      {/* Paid segment (Emerald green ~ 74%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#00C853"
                        strokeWidth="11"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="62"
                        strokeLinecap="round"
                      />
                      {/* Pending segment (Blue ~ 26%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#0052FF"
                        strokeWidth="11"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="176"
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[8.5px] uppercase font-bold text-slate-400">
                        AED
                      </span>
                      <span className="text-sm font-black text-slate-900 leading-none">
                        12,500
                      </span>
                      <span className="text-[8.5px] text-slate-400 mt-0.5">
                        {t.totalEarned}
                      </span>
                    </div>
                  </div>

                  {/* Legend on Right */}
                  <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#00C853] shrink-0" />
                      <span className="text-slate-600">Paid</span>
                      <span className="font-bold text-slate-900 ml-auto">AED 9,300</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#0052FF] shrink-0" />
                      <span className="text-slate-600">Pending</span>
                      <span className="font-bold text-slate-900 ml-auto">AED 3,200</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED] shrink-0" />
                      <span className="text-slate-600">Processing</span>
                      <span className="font-bold text-slate-900 ml-auto">AED 0</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 2: {t.clientStatusTitle} (Bar Chart) */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Client Status
                  </h3>
                  <button className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-700">
                    <span>This Month</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                {/* Bar Chart Container */}
                <div className="h-40 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
                  
                  {/* Bar 1: Total (12) */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-900">12</span>
                    <div 
                      className="w-full max-w-[36px] bg-[#011550] rounded-t-md transition-all hover:opacity-90"
                      style={{ height: "100%" }}
                    />
                  </div>

                  {/* Bar 2: Active (8) */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-900">8</span>
                    <div 
                      className="w-full max-w-[36px] bg-[#0070FF] rounded-t-md transition-all hover:opacity-90"
                      style={{ height: "66%" }}
                    />
                  </div>

                  {/* Bar 3: Pending (3) */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-900">3</span>
                    <div 
                      className="w-full max-w-[36px] bg-[#FF9800] rounded-t-md transition-all hover:opacity-90"
                      style={{ height: "25%" }}
                    />
                  </div>

                  {/* Bar 4: Completed (5) */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-900">5</span>
                    <div 
                      className="w-full max-w-[36px] bg-[#00C853] rounded-t-md transition-all hover:opacity-90"
                      style={{ height: "42%" }}
                    />
                  </div>

                </div>

                {/* Bottom Bar Labels */}
                <div className="flex items-center justify-between text-center pt-2 px-1 text-[10.5px] font-semibold text-slate-600">
                  <span className="flex-1">Total</span>
                  <span className="flex-1">Active</span>
                  <span className="flex-1">Pending</span>
                  <span className="flex-1">Completed</span>
                </div>

              </div>

            </div>

          </div>

        </main>

      </div>

      {/* ========================================================
          MOBILE BOTTOM FLOATING NAVIGATION BAR (Screenshot 3)
      ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 z-40 flex items-center justify-around shadow-lg">
        {[
          { name: t.mobDashboard, icon: Home, active: true },
          { name: t.mobGenerate, icon: UserPlus, action: () => setIsModalOpen(true) },
          { name: t.mobClients, icon: Users },
          { name: t.mobCommissions, icon: Coins },
          { name: t.mobMore, icon: Menu, action: () => setUserMenuOpen(true) },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => {
                if (item.action) item.action();
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg cursor-pointer ${
                item.active ? "text-[#0052FF]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9.5px] font-semibold">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* ========================================================
          MODAL: GENERATE CLIENT ID
      ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            
            <button
              onClick={resetModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            {!generatedSuccessId ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Generate Client ID
                    </h3>
                    <p className="text-xs text-slate-500">
                      Assign a referral token for tracking
                    </p>
                  </div>
                </div>

                <form onSubmit={handleGenerateClientId} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Client / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g. Al Noor Trading LLC"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Service Requested *
                    </label>
                    <select
                      value={newClientService}
                      onChange={(e) => setNewClientService(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF] bg-white"
                    >
                      <option value="Business Setup">Business Setup (Mainland / Freezone)</option>
                      <option value="VAT Registration">VAT & Accounting Services</option>
                      <option value="Corporate Tax">Corporate Tax Filing</option>
                      <option value="Bank Account">Corporate Bank Account Assistance</option>
                      <option value="Freelance Visa">Freelance & Investor Visa</option>
                      <option value="Golden Visa">UAE 10-Year Golden Visa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Contact Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="+971 50 000 0000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      rows={2}
                      value={newClientNotes}
                      onChange={(e) => setNewClientNotes(e.target.value)}
                      placeholder="Key requirements, requested freezone or visa count..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#0052FF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0052FF] to-[#0070FF] text-white font-extrabold text-xs tracking-wider shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition cursor-pointer mt-2"
                  >
                    GENERATE CLIENT ID
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Client ID Generated!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your unique partner tracking code is ready.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    ASSIGNED CLIENT ID
                  </span>
                  <span className="text-3xl font-black text-[#0052FF] tracking-wider block mt-1">
                    {generatedSuccessId}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 mt-1 block">
                    {newClientName}
                  </span>
                </div>

                <button
                  onClick={resetModal}
                  className="w-full py-3 rounded-full bg-[#0052FF] text-white font-bold text-xs tracking-wider shadow-md hover:bg-[#003ecb] transition"
                >
                  Done & Back to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          MARKETING MATERIALS MODAL
      ======================================================== */}
      {isMaterialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsMaterialsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-black text-slate-900 mb-1">
              {t.materialsModalTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t.materialsModalSub}
            </p>
            <div className="space-y-2.5">
              {[
                { title: "Tijara One Corporate Profile (PDF)", size: "4.2 MB" },
                { title: "UAE Mainland vs Freezone Comparison 2026", size: "2.8 MB" },
                { title: "Executive Partner Referral Guide", size: "1.5 MB" },
                { title: "Official Brand Assets & Logos Pack", size: "8.1 MB" },
              ].map((kit) => (
                <div key={kit.title} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-blue-50/50 transition">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{kit.title}</p>
                    <p className="text-[10px] text-slate-400">{kit.size}</p>
                  </div>
                  <button 
                    onClick={() => alert(`Starting download for ${kit.title}`)}
                    className="px-3 py-1.5 rounded-full bg-[#0052FF] text-white text-[11px] font-bold hover:bg-[#0038E0]"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TRAINING & RESOURCES MODAL
      ======================================================== */}
      {isTrainingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsTrainingModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-black text-slate-900 mb-1">
              {t.supportModalTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t.supportModalSub}
            </p>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
              <p className="font-bold text-slate-800">Direct Support Channels:</p>
              <p className="text-slate-600">📧 Email: <span className="font-bold text-[#0052FF]">support@tijaraone.com</span></p>
              <p className="text-slate-600">📱 WhatsApp Desk: <span className="font-bold text-slate-800">+971 4 000 0000</span></p>
              <p className="text-slate-600">📍 Office: Boulevard Plaza Tower 1, Downtown Dubai</p>
            </div>
            <button
              onClick={() => setIsTrainingModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-full bg-[#0052FF] text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
