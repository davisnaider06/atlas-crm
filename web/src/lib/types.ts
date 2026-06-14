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

export type FunnelStage =
  | "Mapped"
  | "Prospected"
  | "Replied"
  | "MeetingScheduled"
  | "MeetingDone"
  | "ProposalSent"
  | "Closed";

export type FunnelOutcome = "None" | "Won" | "Lost";

export type LossReason =
  | "None"
  | "NoBudget"
  | "NoInterest"
  | "StoppedResponding"
  | "ClosedWithCompetitor"
  | "Other"
  | "NoAuthority";

export type BantLevel = "Unknown" | "No" | "Partial" | "Yes";

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
  extraDataJson?: string | null;
  createdAtUtc: string;
  // Processo comercial Atlas (funil de 7 etapas)
  funnelStage: FunnelStage;
  outcome: FunnelOutcome;
  channel?: string | null;
  companyName?: string | null;
  contactHandle?: string | null;
  lastContactAtUtc?: string | null;
  nextFollowUpAtUtc?: string | null;
  observations?: string | null;
  proposalValue?: number | null;
  contractValue?: number | null;
  lossReason: LossReason;
  isCold: boolean;
  followUpStep: number;
  // Ficha completa do lead
  city?: string | null;
  instagramHandle?: string | null;
  googleRating?: number | null;
  // Qualificação BANT
  bantBudget: BantLevel;
  bantAuthority: BantLevel;
  bantNeed: BantLevel;
  bantTimeline: BantLevel;
};

export type Conversation = {
  id: number;
  contactPhone: string;
  contactName: string;
  leadId?: number | null;
  leadName?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAtUtc: string;
  unreadCount: number;
};

export type ChatMessage = {
  id: number;
  isInbound: boolean;
  text: string;
  sentAtUtc: string;
  senderName?: string | null;
};

export type InteractionOutcome = "NoReply" | "Replied" | "Positive" | "Negative";

export type Script = {
  id: number;
  name: string;
  channel?: string | null;
  body?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  usageCount: number;
  replyRate: number;
};

export type LeadInteraction = {
  id: number;
  leadId: number;
  channel: string;
  scriptId?: number | null;
  scriptName?: string | null;
  outcome: InteractionOutcome;
  notes?: string | null;
  occurredAtUtc: string;
  createdByUserId?: number | null;
  createdByName?: string | null;
};

export type CustomFieldDef = {
  id: number;
  target: string;
  name: string;
  fieldKey: string;
  type: "Text" | "Number" | "Date" | "Select";
  options: string[];
  sortOrder: number;
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
  funnelConversion: {
    stageName: string;
    order: number;
    reachedCount: number;
    droppedCount: number;
    conversionRate: number;
  }[];
  // Métricas do processo comercial
  weeklyMessagesSent: number;
  weeklyReplies: number;
  weeklyResponseRate: number;
  weeklyMeetingsScheduled: number;
  weeklyProposalsSent: number;
  monthlyClosedWon: number;
  monthlyRevenue: number;
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

export type AppointmentType = "Call" | "Meeting" | "Visit" | "Reminder" | "Task";
export type AppointmentStatus = "Scheduled" | "Done" | "Cancelled";

export type Appointment = {
  id: number;
  title: string;
  description?: string | null;
  startAtUtc: string;
  endAtUtc: string;
  type: AppointmentType;
  status: AppointmentStatus;
  leadId?: number | null;
  leadName?: string | null;
  dealId?: number | null;
  dealLeadName?: string | null;
  assignedUserId: number;
  assignedUserName?: string | null;
  createdAtUtc: string;
};
