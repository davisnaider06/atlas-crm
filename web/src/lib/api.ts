import type {
  Activity,
  AuthResponse,
  Automation,
  Dashboard,
  Customer,
  Deal,
  DocumentItem,
  HistoryItem,
  Lead,
  PagedResult,
  Pipeline,
  RegisterPayload,
  WhatsAppCampaignRecipient,
  WhatsAppCampaignResult,
  WhatsAppConnectionSession,
  WhatsAppIntegration,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Falha ao comunicar com a API.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: RegisterPayload) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDashboard: (token: string) => request<Dashboard>("/dashboard", { token }),
  getLeads: (
    token: string,
    params?: { search?: string; source?: string; status?: string },
  ) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    if (params?.source) query.set("source", params.source);
    if (params?.status) query.set("status", params.status);
    return request<PagedResult<Lead>>(`/leads?${query.toString()}`, { token });
  },
  createLead: (
    token: string,
    payload: {
      name: string;
      email?: string;
      phone?: string;
      source: string;
      status: number;
      qualificationTemperature?: number;
      qualificationScore?: number;
      qualificationNotes?: string | null;
    },
  ) =>
    request<Lead>("/leads", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateLead: (
    token: string,
    id: number,
    payload: {
      name: string;
      email?: string;
      phone?: string;
      source: string;
      status: number;
      qualificationTemperature?: number;
      qualificationScore?: number;
      qualificationNotes?: string | null;
      ownerUserId?: number | null;
    },
  ) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteLead: (token: string, id: number) =>
    request<void>(`/leads/${id}`, {
      method: "DELETE",
      token,
    }),
  getCustomers: (token: string, params?: { search?: string }) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    return request<PagedResult<Customer>>(`/clientes?${query.toString()}`, { token });
  },
  createCustomer: (
    token: string,
    payload: { name: string; email?: string; phone?: string; leadId?: number | null },
  ) =>
    request<Customer>("/clientes", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  convertLeadToCustomer: (token: string, leadId: number) =>
    request<Customer>(`/clientes/converter-lead/${leadId}`, {
      method: "POST",
      token,
    }),
  updateCustomer: (
    token: string,
    id: number,
    payload: { name: string; email?: string; phone?: string; leadId?: number | null },
  ) =>
    request<Customer>(`/clientes/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteCustomer: (token: string, id: number) =>
    request<void>(`/clientes/${id}`, {
      method: "DELETE",
      token,
    }),
  getDocuments: (token: string, params?: { search?: string }) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    return request<PagedResult<DocumentItem>>(`/documentos?${query.toString()}`, { token });
  },
  createDocumentLink: (
    token: string,
    payload: { title: string; description?: string; url: string },
  ) =>
    request<DocumentItem>("/documentos/links", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  uploadDocumentFile: (token: string, payload: FormData) =>
    request<DocumentItem>("/documentos/arquivos", {
      method: "POST",
      token,
      body: payload,
    }),
  deleteDocument: (token: string, id: number) =>
    request<void>(`/documentos/${id}`, {
      method: "DELETE",
      token,
    }),
  getDocumentDownloadUrl: (id: number) => `${API_URL}/documentos/${id}/download`,
  getDeals: (
    token: string,
    params?: { search?: string; stageId?: number; status?: string },
  ) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    if (params?.stageId) query.set("stageId", String(params.stageId));
    if (params?.status) query.set("status", params.status);
    return request<PagedResult<Deal>>(`/negocios?${query.toString()}`, { token });
  },
  createDeal: (
    token: string,
    payload: { leadId: number; stageId: number; value: number; ownerUserId?: number },
  ) =>
    request<Deal>("/negocios", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateDeal: (
    token: string,
    id: number,
    payload: { value: number; status: number; ownerUserId?: number | null },
  ) =>
    request<Deal>(`/negocios/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  moveDeal: (token: string, id: number, payload: { stageId: number; status: number }) =>
    request<Deal>(`/negocios/${id}/mover`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteDeal: (token: string, id: number) =>
    request<void>(`/negocios/${id}`, {
      method: "DELETE",
      token,
    }),
  getActivities: (token: string, params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    return request<PagedResult<Activity>>(`/atividades?${query.toString()}`, { token });
  },
  createActivity: (
    token: string,
    payload: {
      dealId?: number;
      type: number;
      description: string;
      dueAtUtc: string;
      status: number;
    },
  ) =>
    request<Activity>("/atividades", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateActivity: (
    token: string,
    id: number,
    payload: {
      type: number;
      description: string;
      dueAtUtc: string;
      status: number;
      assignedUserId?: number | null;
    },
  ) =>
    request<Activity>(`/atividades/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteActivity: (token: string, id: number) =>
    request<void>(`/atividades/${id}`, {
      method: "DELETE",
      token,
    }),
  getPipelines: (token: string) => request<Pipeline[]>("/pipelines", { token }),
  getAutomations: (token: string) =>
    request<PagedResult<Automation>>("/automacoes?page=1&pageSize=50", { token }),
  createAutomation: (
    token: string,
    payload: {
      name: string;
      eventType: number;
      conditionJson: string;
      actionJson: string;
      isActive: boolean;
    },
  ) =>
    request<Automation>("/automacoes", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  deleteAutomation: (token: string, id: number) =>
    request<void>(`/automacoes/${id}`, {
      method: "DELETE",
      token,
    }),
  getHistory: (token: string, params?: { leadId?: number; dealId?: number }) => {
    const query = new URLSearchParams();
    if (params?.leadId) query.set("leadId", String(params.leadId));
    if (params?.dealId) query.set("dealId", String(params.dealId));
    return request<HistoryItem[]>(`/historico?${query.toString()}`, { token });
  },
  getWhatsAppIntegration: (token: string) => request<WhatsAppIntegration>("/whatsapp/integracao", { token }),
  connectWhatsApp: (token: string) =>
    request<WhatsAppConnectionSession>("/whatsapp/conectar", {
      method: "POST",
      token,
    }),
  getWhatsAppSession: (token: string) =>
    request<WhatsAppConnectionSession>("/whatsapp/sessao", { token }),
  saveWhatsAppIntegration: (
    token: string,
    payload: {
      provider: number;
      instanceName: string;
      phoneNumber: string;
      webhookUrl?: string;
      apiBaseUrl?: string;
      apiToken?: string;
      captureLeadsEnabled: boolean;
      broadcastEnabled: boolean;
      status: number;
    },
  ) =>
    request<WhatsAppIntegration>("/whatsapp/integracao", {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  sendWhatsAppCampaign: (
    token: string,
    payload: {
      message: string;
      recipients: WhatsAppCampaignRecipient[];
    },
  ) =>
    request<WhatsAppCampaignResult>("/whatsapp/campanhas/disparo", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
