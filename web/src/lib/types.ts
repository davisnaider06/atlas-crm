export type UserRole = "Admin" | "Manager" | "Sales";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  userId: number;
  companyId: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
};

export type RegisterPayload = {
  companyName: string;
  name: string;
  email: string;
  password: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type Lead = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
  qualificationTemperature: "Unqualified" | "Cold" | "Warm" | "Hot";
  qualificationScore: number;
  qualificationNotes?: string | null;
  ownerUserId?: number | null;
  ownerName?: string | null;
  createdAtUtc: string;
};

export type LeadOwner = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  leadCount: number;
};

export type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadId?: number | null;
  leadName?: string | null;
  createdAtUtc: string;
};

export type DocumentItem = {
  id: number;
  title: string;
  description?: string | null;
  type: "File" | "Link";
  url?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  sector?: string | null;
  tags?: string[] | null;
  isOnboarding?: boolean | null;
  visibility?: string | null;
  createdAtUtc: string;
};

export type FinanceEntry = {
  id: number;
  occurredAtUtc: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  currency: string;
  notes?: string | null;
  attachmentFileName?: string | null;
  createdAtUtc: string;
};

export type HistoryItem = {
  id: number;
  type: string;
  dataJson: string;
  occurredAtUtc: string;
};

export type Deal = {
  id: number;
  leadId: number;
  stageId: number;
  value: number;
  status: string;
  ownerUserId?: number | null;
  stageName: string;
  leadName: string;
  createdAtUtc: string;
};

export type Activity = {
  id: number;
  dealId?: number | null;
  type: string;
  description: string;
  dueAtUtc: string;
  status: string;
  assignedUserId?: number | null;
  createdAtUtc: string;
};

export type Stage = {
  id: number;
  name: string;
  order: number;
};

export type Pipeline = {
  id: number;
  name: string;
  stages: Stage[];
};

export type Automation = {
  id: number;
  name: string;
  eventType: string;
  conditionJson: string;
  actionJson: string;
  isActive: boolean;
  createdAtUtc: string;
};

export type Dashboard = {
  totalLeads: number;
  openDeals: number;
  pipelineValue: number;
  pendingActivities: number;
  stageSummary: {
    stageName: string;
    dealCount: number;
    totalValue: number;
  }[];
};

export type WhatsAppIntegration = {
  id: number;
  provider: string;
  instanceName: string;
  phoneNumber: string;
  webhookUrl?: string | null;
  apiBaseUrl?: string | null;
  captureLeadsEnabled: boolean;
  broadcastEnabled: boolean;
  status: string;
};

export type WhatsAppConnectionSession = {
  instanceName: string;
  status: string;
  qrCodeBase64?: string | null;
  pairingCode?: string | null;
  phoneNumber?: string | null;
  expiresAtUtc?: string | null;
};

export type WhatsAppCampaignRecipient = {
  name: string;
  phoneNumber: string;
};

export type WhatsAppCampaignDispatch = {
  name: string;
  phoneNumber: string;
  success: boolean;
  externalId?: string | null;
  error?: string | null;
};

export type WhatsAppCampaignResult = {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  results: WhatsAppCampaignDispatch[];
};

export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
  createdAtUtc: string;
};

export type PermissionCatalogItem = {
  key: string;
  label: string;
  group: string;
};
