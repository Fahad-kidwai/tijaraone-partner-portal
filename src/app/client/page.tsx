"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  LogOut,
  Globe,
  Check,
  ShieldCheck,
  Calendar,
  ChevronRight,
  ExternalLink,
  MapPin,
  Sparkles
} from "lucide-react";
import { INITIAL_CLIENTS } from "@/lib/mockData";
import { ClientRecord } from "@/lib/types";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<ClientRecord>(INITIAL_CLIENTS[0]);
  const [selectedLang, setSelectedLang] = useState<"en" | "ar" | "ru">("en");
  const [langOpen, setLangOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    // Client portal is not needed; redirect to main login
    router.replace("/");
  }, [router]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("tijaraone_client_session");
    router.push("/");
  };

  // Translations dictionary for Client Portal
  const t = {
    en: {
      badge: "Official Client Portal",
      welcome: "Welcome,",
      sub: "Track your UAE business setup milestones, download official government certificates, and communicate directly with your dedicated formation consultant.",
      trackingId: "TRACKING ID",
      caseStatus: "FORMATION STATUS",
      progressTitle: "Setup Journey & Live Milestones",
      progressSub: "Real-time updates directly from Dubai DED, FTA, and banking authorities.",
      docVaultTitle: "Official Documents Vault",
      docVaultSub: "Download court-notarized licenses, certificates, and compliance records.",
      download: "Download",
      managerTitle: "Dedicated Relationship Manager",
      managerSub: "Your direct point of contact at Tijara One for all government approvals and banking queries.",
      chatWhatsApp: "Chat on WhatsApp",
      emailConsultant: "Send Email",
      callDirect: "Call Consultant",
      officeLocation: "Boulevard Plaza Tower 1, Downtown Dubai",
      switchPortal: "Back to Login",
      exit: "Exit Portal",
    },
    ar: {
      badge: "بوابة العميل الرسمية",
      welcome: "مرحباً بكم،",
      sub: "تابع مراحل تأسيس شركتك في الإمارات، وحمّل الرخص والشهادات الحكومية المعتمدة، وتواصل مباشرة مع مستشارك المخصص.",
      trackingId: "كود المتابعة",
      caseStatus: "حالة المعاملة",
      progressTitle: "مراحل وخطوات التأسيس المباشرة",
      progressSub: "تحديثات لحظية ومباشرة من اقتصادية دبي وهيئة الضرائب والبنوك.",
      docVaultTitle: "خزينة المستندات والوثائق الرسمية",
      docVaultSub: "تحميل الرخص التجارية الموثقة، العقود والشهادات الضريبية.",
      download: "تحميل",
      managerTitle: "مدير العلاقات والمستشار المخصص",
      managerSub: "مسؤولك المباشر في تيجارة ون لكافة الموافقات الحكومية والإجراءات المصرفية.",
      chatWhatsApp: "محادثة عبر واتساب",
      emailConsultant: "إرسال بريد إلكتروني",
      callDirect: "اتصال مباشر",
      officeLocation: "برج بوليفارد بلازا 1، داون تاون دبي",
      switchPortal: "العودة لتسجيل الدخول",
      exit: "تسجيل الخروج",
    },
    ru: {
      badge: "Официальный портал клиента",
      welcome: "Добро пожаловать,",
      sub: "Отслеживайте этапы регистрации бизнеса в ОАЭ, скачивайте государственные лицензии и сертификаты и общайтесь с личным консультантом.",
      trackingId: "НОМЕР ДЕЛА",
      caseStatus: "СТАТУС РЕГИСТРАЦИИ",
      progressTitle: "Этапы процесса и статус выполнения",
      progressSub: "Актуальные обновления от DED Дубая, налоговой службы и банков.",
      docVaultTitle: "Хранилище официальных документов",
      docVaultSub: "Скачивайте заверенные торговые лицензии, договоры и налоговые сертификаты.",
      download: "Скачать",
      managerTitle: "Персональный менеджер проекта",
      managerSub: "Ваш прямой контакт в Tijara One по всем государственным согласованиям и банковским вопросам.",
      chatWhatsApp: "Написать в WhatsApp",
      emailConsultant: "Отправить Email",
      callDirect: "Позвонить",
      officeLocation: "Boulevard Plaza Tower 1, Downtown Dubai",
      switchPortal: "К входу",
      exit: "Выйти",
    },
  }[selectedLang];

  const milestones = client.milestones || [
    { id: "m1", title: "Trade Name Reservation", desc: "Approved by Department of Economy & Tourism (DET)", status: "completed", date: "28 Sep 2026" },
    { id: "m2", title: "Initial Approval (DET)", desc: "Legal authority sanction obtained for commercial activity", status: "completed", date: "01 Oct 2026" },
    { id: "m3", title: "MOA Drafting & Notarization", desc: "Court notarized Memorandum of Association signed", status: "completed", date: "03 Oct 2026" },
    { id: "m4", title: "Trade License Issuance", desc: "Official Dubai commercial license issued and active", status: "completed", date: "05 Oct 2026" },
    { id: "m5", title: "Corporate Bank Account Setup", desc: "Emirates NBD application undergoing KYC verification", status: "in_progress", date: "In Progress" },
  ];

  const documents = client.documents || [
    { id: "d1", name: `Official Trade License - ${client.clientName}.pdf`, size: "1.2 MB", category: "License", date: client.date },
    { id: "d2", name: "Memorandum of Association (MOA).pdf", size: "2.4 MB", category: "Legal", date: client.date },
    { id: "d3", name: "Commercial Register Certificate.pdf", size: "850 KB", category: "Registration", date: client.date },
    { id: "d4", name: "Establishment Card (MOHRE).pdf", size: "520 KB", category: "Immigration", date: client.date },
  ];

  const manager = client.assignedManager || {
    name: "Miss Shahina",
    role: "Head of Business Setup",
    phone: "+971 54 220 1188",
    email: "shahina@tijaraone.ae",
    avatarUrl: "/images/team/Miss Shahina- Head of Business Setup.png",
  };

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return (
    <div
      className="min-h-screen bg-[#F4F7FC] text-slate-800 flex flex-col font-sans select-none"
      dir={selectedLang === "ar" ? "rtl" : "ltr"}
    >
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#011550] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* ========================================================
          CLIENT HEADER BAR
      ======================================================== */}
      <header className="sticky top-0 z-40 bg-[#011550] text-white border-b border-white/10 shadow-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => router.push("/client")}>
            <img
              src="/images/tijaraone_logo_white_tight.png"
              alt="TijaraOne"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-[#5FE7FD] tracking-[0.22em] block uppercase mt-0.5">
              {t.badge}
            </span>
          </div>
        </div>

        {/* Right Header: Language + User + Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#5FE7FD]" />
              <span>{selectedLang === "en" ? "English" : selectedLang === "ar" ? "العربية" : "Русский"}</span>
              <span className="text-[9px] text-slate-300">▼</span>
            </button>

            {langOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 text-xs font-medium animate-in fade-in duration-100 text-slate-800">
                {[
                  { code: "en", label: "English" },
                  { code: "ar", label: "العربية (Arabic)" },
                  { code: "ru", label: "Русский (Russian)" },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setSelectedLang(item.code as "en" | "ar" | "ru");
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition flex items-center justify-between ${
                      selectedLang === item.code ? "text-[#0052FF] font-bold bg-blue-50/50" : "text-slate-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedLang === item.code && <Check className="w-3 h-3 text-[#0052FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client Company Badge */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/15">
            <div className="w-8 h-8 rounded-full bg-white text-[#011550] font-black text-xs flex items-center justify-center shadow-sm">
              {client.clientName.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight truncate max-w-[150px]">
                {client.clientName}
              </p>
              <p className="text-[9.5px] font-mono text-emerald-300">
                {client.clientId}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-rose-400 p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer ml-1"
              title={t.exit}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================
          MAIN CLIENT CONTENT
      ======================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Company Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#011550] via-[#022468] to-[#011550] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#0052FF] text-white text-[10px] font-black uppercase tracking-wider">
                {client.service}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                {client.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              {t.welcome} <span className="text-[#5FE7FD]">{client.clientName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed">
              {t.sub}
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-4 border-t border-white/15 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.trackingId}
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {client.clientId}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.caseStatus}
                </span>
                <span className="font-bold text-emerald-300 text-sm">
                  {client.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Registration Date
                </span>
                <span className="font-semibold text-slate-200 text-sm">
                  {client.date}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Tracker Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {t.progressTitle}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t.progressSub}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">Progress</span>
                <span className="text-sm font-black text-[#0052FF] block">{progressPercent}%</span>
              </div>
              <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0052FF] to-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Milestones */}
          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const isCompleted = m.status === "completed";
              const isInProgress = m.status === "in_progress";

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                    isCompleted
                      ? "bg-emerald-50/40 border-emerald-200/80"
                      : isInProgress
                      ? "bg-blue-50/50 border-blue-200 ring-2 ring-blue-500/10 shadow-sm"
                      : "bg-slate-50/60 border-slate-200/60 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isInProgress
                          ? "bg-[#0052FF] text-white shadow-md animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {m.title}
                        </h4>
                        {isInProgress && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0052FF] text-[9.5px] font-extrabold uppercase tracking-wide">
                            Active Step
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        isCompleted
                          ? "text-emerald-700"
                          : isInProgress
                          ? "text-[#0052FF]"
                          : "text-slate-400"
                      }`}
                    >
                      {isCompleted ? "Completed" : isInProgress ? "Under Review" : "Pending"}
                    </span>
                    {m.date && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {m.date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 Columns: Documents Vault + Relationship Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Documents Vault (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {t.docVaultTitle}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t.docVaultSub}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-blue-200 hover:bg-blue-50/20 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {doc.size} • Verified Government Copy
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => showToast(`Downloading "${doc.name}"...`)}
                    className="px-3.5 py-1.5 rounded-full bg-slate-100 group-hover:bg-[#0052FF] text-slate-700 group-hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.download}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Manager Contact Desk */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052FF] text-[9.5px] font-extrabold uppercase tracking-widest block w-fit mb-2">
                Tijara One VIP Desk
              </span>
              <h3 className="text-base font-black text-slate-900">
                {t.managerTitle}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {t.managerSub}
              </p>

              {/* Manager Card */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3.5">
                <img
                  src={manager.avatarUrl}
                  alt={manager.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0052FF]/30"
                />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    {manager.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#0052FF]">
                    {manager.role}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tijara One Downtown Dubai
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/${manager.phone.replace(/[^0-9]/g, "")}?text=Hello%20Tijara%20One,%20I%20am%20inquiring%20about%20my%20company%20setup%20${encodeURIComponent(client.clientName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t.chatWhatsApp}</span>
              </a>

              <a
                href={`mailto:${manager.email}?subject=Client%20Inquiry%20-${encodeURIComponent(client.clientName)}`}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{t.emailConsultant}</span>
              </a>

              <div className="pt-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.officeLocation}</span>
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
