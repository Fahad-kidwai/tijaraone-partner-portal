"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Hourglass,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  ChevronRight,
  Edit2,
  Check,
  Copy,
  LogOut,
  Plus,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { INITIAL_CEO, INITIAL_PARTNERS, INITIAL_CLIENTS } from "@/lib/mockData";
import { ClientRecord, ClientStatus, PartnerUser } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();

  // Active Data State
  const [partners, setPartners] = useState<PartnerUser[]>(() =>
    Object.values(INITIAL_PARTNERS).map((p) => p.profile)
  );
  const [clients, setClients] = useState<ClientRecord[]>(INITIAL_CLIENTS);

  // Navigation & Selection States
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"agents" | "all_clients">("agents");

  // Filtering & Search
  const [agentSearch, setAgentSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ClientStatus>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Inline Commission Edit State
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [commissionInput, setCommissionInput] = useState("");

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Onboard Client Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientService, setNewClientService] = useState("Business Setup (Mainland)");
  const [newClientPartner, setNewClientPartner] = useState("pt-101");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientCommission, setNewClientCommission] = useState("AED 2,500");
  const [newClientStatus, setNewClientStatus] = useState<ClientStatus>("In Progress");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [onboardSuccess, setOnboardSuccess] = useState<ClientRecord | null>(null);

  // Load persisted clients from localStorage if available
  useEffect(() => {
    const savedClients = localStorage.getItem("tijaraone_clients");
    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
        }
      } catch (err) {
        console.error("Failed to parse saved clients", err);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("tijaraone_admin_session");
    router.push("/");
  };

  // Status Change Controller
  const handleStatusChange = (clientId: string, newStatus: ClientStatus) => {
    const updated = clients.map((c) => {
      if (c.id === clientId) {
        return { ...c, status: newStatus };
      }
      return c;
    });
    setClients(updated);
    localStorage.setItem("tijaraone_clients", JSON.stringify(updated));
    showToast(`Status updated to "${newStatus}"`);
  };

  // Commission Edit & Save
  const handleSaveCommission = (clientId: string) => {
    if (!commissionInput.trim()) return;
    const formatted = commissionInput.startsWith("AED")
      ? commissionInput
      : `AED ${commissionInput}`;
    const updated = clients.map((c) => {
      if (c.id === clientId) {
        return { ...c, commission: formatted };
      }
      return c;
    });
    setClients(updated);
    localStorage.setItem("tijaraone_clients", JSON.stringify(updated));
    setEditingCommissionId(null);
    setCommissionInput("");
    showToast(`Commission approved: ${formatted}`);
  };

  // Copy Case Summary for WhatsApp / Sharing
  const handleShareSummary = (client: ClientRecord) => {
    const text = `*TIJARA ONE - CLIENT CASE UPDATE*
----------------------------------------
Client: ${client.clientName} (${client.clientId})
Service: ${client.service}
Status: ${client.status}
Agent: ${client.partnerName || "Tijara One Partner"}
Commission: ${client.commission}
Phone: ${client.phone || "+971 50 000 0000"}
----------------------------------------
Tijara One Management`;
    navigator.clipboard.writeText(text);
    setCopiedId(client.id);
    showToast(`Case summary for ${client.clientName} copied!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Onboard Client Submit
  const handleOnboardClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const nextNum = 1000 + clients.length + 1;
    const newClientId = `TJ-${nextNum}`;
    const today = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());

    const partnerObj = partners.find((p) => p.id === newClientPartner);
    const partnerName = partnerObj ? partnerObj.companyName : "Apex Consulting";

    const newRecord: ClientRecord = {
      id: `cl-${Date.now()}`,
      clientId: newClientId,
      clientName: newClientName.trim(),
      service: newClientService,
      status: newClientStatus,
      commission: newClientCommission.trim() || "Under Review",
      date: today,
      partnerId: newClientPartner,
      partnerName: partnerName,
      phone: newClientPhone.trim() || "+971 50 000 0000",
      notes: newClientNotes.trim(),
    };

    const updated = [newRecord, ...clients];
    setClients(updated);
    localStorage.setItem("tijaraone_clients", JSON.stringify(updated));
    setOnboardSuccess(newRecord);
    showToast(`${newClientName} onboarded successfully under ${partnerName}!`);
  };

  const resetOnboardModal = () => {
    setIsModalOpen(false);
    setOnboardSuccess(null);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientNotes("");
    setNewClientCommission("AED 2,500");
    setNewClientStatus("In Progress");
  };

  // Compute live statistics per agent
  const agentStatsMap = useMemo(() => {
    const map: Record<
      string,
      { total: number; pending: number; inProgress: number; completed: number; totalCommAed: number }
    > = {};

    partners.forEach((p) => {
      map[p.id] = { total: 0, pending: 0, inProgress: 0, completed: 0, totalCommAed: 0 };
    });

    clients.forEach((c) => {
      if (!map[c.partnerId]) {
        map[c.partnerId] = { total: 0, pending: 0, inProgress: 0, completed: 0, totalCommAed: 0 };
      }
      map[c.partnerId].total += 1;
      if (c.status === "Pending") map[c.partnerId].pending += 1;
      else if (c.status === "In Progress") map[c.partnerId].inProgress += 1;
      else if (c.status === "Completed") map[c.partnerId].completed += 1;

      // Extract numeric AED value if present
      const cleanComm = parseInt(c.commission.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(cleanComm)) {
        map[c.partnerId].totalCommAed += cleanComm;
      }
    });

    return map;
  }, [partners, clients]);

  // Overall Global Network Stats
  const globalStats = useMemo(() => {
    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let totalComm = 0;

    clients.forEach((c) => {
      if (c.status === "Pending") pendingCount += 1;
      else if (c.status === "In Progress") inProgressCount += 1;
      else if (c.status === "Completed") completedCount += 1;

      const num = parseInt(c.commission.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) totalComm += num;
    });

    return {
      totalAgents: partners.length,
      totalClients: clients.length,
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
      totalCommission: `AED ${totalComm.toLocaleString()}`,
    };
  }, [partners, clients]);

  // Filtered Agents List
  const filteredAgents = useMemo(() => {
    return partners.filter((p) => {
      const q = agentSearch.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchCategory = categoryFilter === "ALL" || p.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [partners, agentSearch, categoryFilter]);

  // Selected Agent Object
  const currentSelectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return partners.find((p) => p.id === selectedAgentId) || null;
  }, [selectedAgentId, partners]);

  // Clients filtered for Selected Agent
  const agentClients = useMemo(() => {
    if (!selectedAgentId) return [];
    return clients.filter((c) => {
      if (c.partnerId !== selectedAgentId) return false;
      const q = clientSearch.toLowerCase();
      const matchSearch =
        c.clientName.toLowerCase().includes(q) ||
        c.clientId.toLowerCase().includes(q) ||
        c.service.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q));

      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [clients, selectedAgentId, clientSearch, statusFilter]);

  // Master All Clients (for master tab)
  const masterClients = useMemo(() => {
    return clients.filter((c) => {
      const q = clientSearch.toLowerCase();
      const matchSearch =
        c.clientName.toLowerCase().includes(q) ||
        c.clientId.toLowerCase().includes(q) ||
        c.service.toLowerCase().includes(q) ||
        (c.partnerName && c.partnerName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));

      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [clients, clientSearch, statusFilter]);

  return (
    <div className="min-h-screen bg-[#F8FAFD] text-slate-800 flex flex-col font-sans">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#011550] text-white text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Portal Role Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/images/logo-blue.png"
              alt="Tijara One"
              className="h-8 sm:h-9 w-auto object-contain"
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider">
              👑 CEO Executive Desk
            </span>
          </div>

          {/* CEO User Profile & Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0052FF] to-[#0070FF] text-white text-xs font-black tracking-wider shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ONBOARD CLIENT</span>
            </button>

            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l border-slate-200">
              <img
                src={INITIAL_CEO.profile.avatarUrl}
                alt={INITIAL_CEO.profile.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">
                  {INITIAL_CEO.profile.name}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Founder & CEO
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Global Executive Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Card 1: Registered Agents */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Network Agents
              </p>
              <p className="text-2xl sm:text-3xl font-black text-[#011550] mt-1">
                {globalStats.totalAgents}
              </p>
              <p className="text-[10.5px] font-semibold text-emerald-600 mt-0.5">
                100% Active Partners
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Clients */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Clients
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {globalStats.totalClients}
              </p>
              <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                Across All Agents
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                In Progress ⚡
              </p>
              <p className="text-2xl sm:text-3xl font-black text-[#0052FF] mt-1">
                {globalStats.inProgress}
              </p>
              <p className="text-[10.5px] font-semibold text-blue-500 mt-0.5">
                DET / Bank Processing
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Pending Cases */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pending ⏳
              </p>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                {globalStats.pending}
              </p>
              <p className="text-[10.5px] font-semibold text-amber-500 mt-0.5">
                Awaiting Initial Approval
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Completed ✓
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                {globalStats.completed}
              </p>
              <p className="text-[10.5px] font-semibold text-emerald-600 mt-0.5">
                Trade Licenses Issued
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* ========================================================
            VIEW MODE 1: SINGLE AGENT HISTORY & CLIENT PIPELINE
        ======================================================== */}
        {selectedAgentId && currentSelectedAgent ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Back Button Bar & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => {
                  setSelectedAgentId(null);
                  setStatusFilter("ALL");
                  setClientSearch("");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer shadow-xs w-fit"
              >
                <ArrowLeft className="w-4 h-4 text-[#0052FF]" />
                <span>Back to All Agents</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewClientPartner(currentSelectedAgent.id);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Client for {currentSelectedAgent.name}</span>
                </button>
              </div>
            </div>

            {/* Selected Agent Profile Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Agent Basic Identity */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                  <img
                    src={currentSelectedAgent.avatarUrl}
                    alt={currentSelectedAgent.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0052FF] border border-blue-200/70">
                        {currentSelectedAgent.role}
                      </span>
                      {currentSelectedAgent.category && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600">
                          {currentSelectedAgent.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      {currentSelectedAgent.name}
                    </h2>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentSelectedAgent.companyName}</span>
                      {currentSelectedAgent.location && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-normal flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" /> {currentSelectedAgent.location}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Agent Quick Contact & Communication */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <a
                    href={`https://wa.me/${(currentSelectedAgent.phone || "+971500000000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${currentSelectedAgent.name}, update regarding your Tijara One clients...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Agent</span>
                  </a>
                  <a
                    href={`mailto:${currentSelectedAgent.email}`}
                    className="px-4 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Send Email</span>
                  </a>
                </div>

              </div>

              {/* Agent Performance Numbers Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Referred</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {agentStatsMap[currentSelectedAgent.id]?.total || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-700">Pending Review</p>
                  <p className="text-xl font-black text-amber-700 mt-0.5">
                    {agentStatsMap[currentSelectedAgent.id]?.pending || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#0052FF]">In Progress</p>
                  <p className="text-xl font-black text-[#0052FF] mt-0.5">
                    {agentStatsMap[currentSelectedAgent.id]?.inProgress || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Completed</p>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    {agentStatsMap[currentSelectedAgent.id]?.completed || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase text-indigo-700">Approved Commission</p>
                  <p className="text-xl font-black text-indigo-700 mt-0.5">
                    AED {(agentStatsMap[currentSelectedAgent.id]?.totalCommAed || 0).toLocaleString()}
                  </p>
                </div>
              </div>

            </div>

            {/* Agent's Clients Section */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              
              {/* Filter Tabs & Search Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Client History & Current Formation Pipeline
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing all clients referred by <strong>{currentSelectedAgent.companyName}</strong>.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      statusFilter === "ALL"
                        ? "bg-[#011550] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({agentStatsMap[currentSelectedAgent.id]?.total || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter("Pending")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      statusFilter === "Pending"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    ⏳ Pending ({agentStatsMap[currentSelectedAgent.id]?.pending || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter("In Progress")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      statusFilter === "In Progress"
                        ? "bg-[#0052FF] text-white"
                        : "bg-blue-50 text-[#0052FF] hover:bg-blue-100"
                    }`}
                  >
                    ⚡ In Progress ({agentStatsMap[currentSelectedAgent.id]?.inProgress || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter("Completed")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      statusFilter === "Completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    ✓ Completed ({agentStatsMap[currentSelectedAgent.id]?.completed || 0})
                  </button>
                </div>
              </div>

              {/* Table of Agent Clients */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3">Client Information</th>
                      <th className="py-3 px-3">Service Referred</th>
                      <th className="py-3 px-3">Referral Date</th>
                      <th className="py-3 px-3">Formation Status</th>
                      <th className="py-3 px-3">Partner Commission</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agentClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold text-xs">
                          No clients found matching the current status filter.
                        </td>
                      </tr>
                    ) : (
                      agentClients.map((c) => {
                        const isEditingComm = editingCommissionId === c.id;

                        return (
                          <tr key={c.id} className="hover:bg-blue-50/25 transition">
                            
                            {/* Client Info */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#0052FF] font-mono text-xs">
                                  {c.clientId}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 mt-0.5 text-xs">
                                {c.clientName}
                              </p>
                              <p className="text-[10.5px] text-slate-400">
                                {c.phone || "+971 50 000 0000"}
                              </p>
                            </td>

                            {/* Service */}
                            <td className="py-3.5 px-3">
                              <span className="font-semibold text-slate-800 block max-w-[170px]">
                                {c.service}
                              </span>
                            </td>

                            {/* Referral Date */}
                            <td className="py-3.5 px-3">
                              <span className="text-slate-600 block text-[11px]">
                                {c.date}
                              </span>
                            </td>

                            {/* Status Controller (CEO Can Change Live) */}
                            <td className="py-3.5 px-3">
                              <select
                                value={c.status}
                                onChange={(e) => handleStatusChange(c.id, e.target.value as ClientStatus)}
                                className={`px-2.5 py-1.5 rounded-full text-[10.5px] font-extrabold border cursor-pointer focus:outline-none transition ${
                                  c.status === "Completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : c.status === "In Progress"
                                    ? "bg-blue-50 text-[#0052FF] border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                <option value="Pending">⏳ Pending Approval</option>
                                <option value="In Progress">⚡ In Progress</option>
                                <option value="Completed">✓ Completed Setup</option>
                              </select>
                            </td>

                            {/* Commission (CEO Approves / Edits Inline) */}
                            <td className="py-3.5 px-3">
                              {isEditingComm ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={commissionInput}
                                    onChange={(e) => setCommissionInput(e.target.value)}
                                    placeholder="e.g. 2,500"
                                    className="w-24 px-2 py-1 rounded-lg border border-[#0052FF] text-xs font-bold text-slate-800"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveCommission(c.id)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingCommissionId(null)}
                                    className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {c.commission === "Under Review" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                      Under Review
                                    </span>
                                  ) : (
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      {c.commission}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingCommissionId(c.id);
                                      setCommissionInput(c.commission.replace("AED", "").trim());
                                    }}
                                    className="p-1 text-slate-400 hover:text-[#0052FF] rounded hover:bg-slate-100 transition cursor-pointer"
                                    title="Edit Commission"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* WhatsApp & Copy Action */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={`https://wa.me/${(c.phone || "+971500000000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${c.clientName}, update from Tijara One regarding your ${c.service}...`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="py-1 px-2.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  onClick={() => handleShareSummary(c)}
                                  className="py-1 px-2 rounded-lg text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                                  title="Copy Case Update"
                                >
                                  {copiedId === c.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        ) : (
          /* ========================================================
              VIEW MODE 2: ALL AGENTS DIRECTORY (DEFAULT OVERVIEW)
          ======================================================== */
          <div className="space-y-6">

            {/* Navigation Tabs Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              
              {/* Tab Pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminTab("agents")}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    adminTab === "agents"
                      ? "bg-[#011550] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  👥 Agents & Partners Directory ({partners.length})
                </button>
                <button
                  onClick={() => setAdminTab("all_clients")}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    adminTab === "all_clients"
                      ? "bg-[#011550] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📋 Master Client List ({clients.length})
                </button>
              </div>

              {/* Search input in tab bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={adminTab === "agents" ? agentSearch : clientSearch}
                  onChange={(e) =>
                    adminTab === "agents"
                      ? setAgentSearch(e.target.value)
                      : setClientSearch(e.target.value)
                  }
                  placeholder={
                    adminTab === "agents"
                      ? "Search agents by name, company..."
                      : "Search clients by name, ID..."
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] bg-slate-50/50"
                />
              </div>

            </div>

            {/* If Master All Clients Tab Selected */}
            {adminTab === "all_clients" ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      All Network Clients (Consolidated Table)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review all client formations across all partners in one master list.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Pending">⏳ Pending</option>
                      <option value="In Progress">⚡ In Progress</option>
                      <option value="Completed">✓ Completed</option>
                    </select>
                  </div>
                </div>

                {/* Master Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-3">Client Info</th>
                        <th className="py-3 px-3">Referred By Agent</th>
                        <th className="py-3 px-3">Service</th>
                        <th className="py-3 px-3">Status Controller</th>
                        <th className="py-3 px-3">Commission (CEO Decision)</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterClients.map((c) => {
                        const isEditingComm = editingCommissionId === c.id;

                        return (
                          <tr key={c.id} className="hover:bg-blue-50/25 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-extrabold text-[#0052FF] font-mono text-xs">
                                {c.clientId}
                              </span>
                              <p className="font-bold text-slate-900 mt-0.5 text-xs">{c.clientName}</p>
                              <p className="text-[10px] text-slate-400">{c.phone || "+971 50 000 0000"}</p>
                            </td>

                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => setSelectedAgentId(c.partnerId)}
                                className="font-bold text-[#0052FF] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{c.partnerName}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-400">{c.date}</span>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="font-semibold text-slate-800 block max-w-[170px]">
                                {c.service}
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <select
                                value={c.status}
                                onChange={(e) => handleStatusChange(c.id, e.target.value as ClientStatus)}
                                className={`px-2.5 py-1.5 rounded-full text-[10.5px] font-extrabold border cursor-pointer focus:outline-none transition ${
                                  c.status === "Completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : c.status === "In Progress"
                                    ? "bg-blue-50 text-[#0052FF] border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                <option value="Pending">⏳ Pending</option>
                                <option value="In Progress">⚡ In Progress</option>
                                <option value="Completed">✓ Completed</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-3">
                              {isEditingComm ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={commissionInput}
                                    onChange={(e) => setCommissionInput(e.target.value)}
                                    placeholder="e.g. 2,500"
                                    className="w-24 px-2 py-1 rounded-lg border border-[#0052FF] text-xs font-bold text-slate-800"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveCommission(c.id)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingCommissionId(null)}
                                    className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {c.commission}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingCommissionId(c.id);
                                      setCommissionInput(c.commission.replace("AED", "").trim());
                                    }}
                                    className="p-1 text-slate-400 hover:text-[#0052FF] rounded hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={`https://wa.me/${(c.phone || "+971500000000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${c.clientName}, regarding your ${c.service} with Tijara One...`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="py-1 px-2.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  onClick={() => handleShareSummary(c)}
                                  className="py-1 px-2 rounded-lg text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                                >
                                  {copiedId === c.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Agents Directory Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAgents.map((agent) => {
                  const stats = agentStatsMap[agent.id] || {
                    total: 0,
                    pending: 0,
                    inProgress: 0,
                    completed: 0,
                    totalCommAed: 0,
                  };

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs hover:shadow-xl hover:border-blue-300/80 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Top Accent Strip */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0038E0] via-[#0052FF] to-[#00A3FF] opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Agent Header */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs"
                          />
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0052FF] border border-blue-200/60">
                            {agent.role}
                          </span>
                        </div>

                        <h4 className="text-lg font-black text-slate-900 group-hover:text-[#0052FF] transition-colors leading-tight">
                          {agent.name}
                        </h4>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {agent.companyName}
                        </p>
                        {agent.location && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{agent.location}</span>
                          </p>
                        )}

                        {/* Status Breakdown Pills for this Agent */}
                        <div className="grid grid-cols-3 gap-1.5 py-4 my-4 border-y border-slate-100 text-center">
                          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                            <p className="text-[9.5px] font-bold uppercase text-amber-700">Pending</p>
                            <p className="text-base font-black text-amber-700 mt-0.5">
                              {stats.pending}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                            <p className="text-[9.5px] font-bold uppercase text-[#0052FF]">In Progress</p>
                            <p className="text-base font-black text-[#0052FF] mt-0.5">
                              {stats.inProgress}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                            <p className="text-[9.5px] font-bold uppercase text-emerald-700">Completed</p>
                            <p className="text-base font-black text-emerald-700 mt-0.5">
                              {stats.completed}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Total Commission & Action Button */}
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Total Clients</p>
                          <p className="text-sm font-black text-slate-900">
                            {stats.total} Clients
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Commission</p>
                          <p className="text-sm font-black text-[#0052FF]">
                            AED {stats.totalCommAed.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Call to Action Button */}
                      <button
                        type="button"
                        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-50 group-hover:bg-[#0052FF] text-slate-700 group-hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>View Agent History & Clients</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Onboard Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <button
              onClick={resetOnboardModal}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>

            {!onboardSuccess ? (
              <div>
                <h3 className="text-xl font-black text-[#011550] mb-1">
                  Onboard New Client
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Assign a client to an agent and initiate corporate formation tracking.
                </p>

                <form onSubmit={handleOnboardClient} className="space-y-4">
                  
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Client / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g. Al Safa Global Trading LLC"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Service Type
                      </label>
                      <select
                        value={newClientService}
                        onChange={(e) => setNewClientService(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF] bg-white"
                      >
                        <option value="Business Setup (Mainland)">Mainland Setup</option>
                        <option value="Freezone License & Visas">Freezone License</option>
                        <option value="Corporate Tax & Accounting">Corporate Tax</option>
                        <option value="Corporate Bank Account Setup">Bank Account Setup</option>
                        <option value="Golden Visa & Residency">Golden Visa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Assign to Agent / Partner *
                      </label>
                      <select
                        value={newClientPartner}
                        onChange={(e) => setNewClientPartner(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF] bg-white"
                      >
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.companyName} ({p.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="+971 50 123 4567"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Initial Status
                      </label>
                      <select
                        value={newClientStatus}
                        onChange={(e) => setNewClientStatus(e.target.value as ClientStatus)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF] bg-white"
                      >
                        <option value="Pending">⏳ Pending Approval</option>
                        <option value="In Progress">⚡ In Progress</option>
                        <option value="Completed">✓ Completed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Commission Approved (AED)
                    </label>
                    <input
                      type="text"
                      value={newClientCommission}
                      onChange={(e) => setNewClientCommission(e.target.value)}
                      placeholder="e.g. AED 2,500 or Under Review"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052FF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#0038E0] via-[#0052FF] to-[#0070FF] text-white font-black text-xs tracking-wider shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition cursor-pointer mt-2"
                  >
                    ONBOARD CLIENT NOW
                  </button>
                </form>
              </div>
            ) : (
              /* Success View */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#011550]">
                    Client Onboarded Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Record created for <strong>{onboardSuccess.clientName}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Client ID:</span>
                    <span className="font-black text-[#0052FF]">{onboardSuccess.clientId}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Company:</span>
                    <span className="font-bold text-slate-900">{onboardSuccess.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Agent:</span>
                    <span className="font-semibold text-slate-800">{onboardSuccess.partnerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Status:</span>
                    <span className="font-bold text-blue-700">{onboardSuccess.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Commission:</span>
                    <span className="font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      {onboardSuccess.commission}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleShareSummary(onboardSuccess)}
                  className="w-full py-3 rounded-full bg-emerald-600 text-white font-bold text-xs tracking-wider hover:bg-emerald-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Case Summary</span>
                </button>

                <button
                  onClick={resetOnboardModal}
                  className="w-full py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Close & Back to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
