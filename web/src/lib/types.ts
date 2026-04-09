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
  ownerUserId?: number | null;
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
