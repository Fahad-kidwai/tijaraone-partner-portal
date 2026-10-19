export type ClientStatus = "Completed" | "In Progress" | "Pending";

export interface Milestone {
  id: string;
  title: string;
  desc: string;
  status: "completed" | "in_progress" | "pending";
  date?: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  size: string;
  category: string;
  date: string;
}

export interface ClientRecord {
  id: string;
  clientId: string; // e.g., "TJ-1001"
  clientName: string;
  service: string;
  status: ClientStatus;
  commission: string;
  date: string;
  notes?: string;
  partnerId: string;
  partnerName?: string;
  phone?: string;
  clientUsername?: string;
  clientPassword?: string;
  milestones?: Milestone[];
  documents?: ClientDocument[];
  assignedManager?: {
    name: string;
    role: string;
    phone: string;
    email: string;
    avatarUrl: string;
  };
}

export interface PartnerUser {
  id: string;
  username: string;
  email: string;
  name: string;
  companyName: string;
  avatarUrl: string;
  role: string;
  phone?: string;
  location?: string;
  joinedDate?: string;
  category?: string;
  totalClients: number;
  activeClients: number;
  totalCommission: string;
  pendingCommission: string;
  paidCommission: string;
  processingCommission: string;
}

export interface CEOUser {
  id: string;
  username: string;
  email: string;
  name: string;
  title: string;
  role: "ceo";
  avatarUrl: string;
}

