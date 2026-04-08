import type {
  Activity,
  AuthResponse,
  Automation,
  Dashboard,
  Deal,
  HistoryItem,
  Lead,
  PagedResult,
  Pipeline,
  WhatsAppIntegration,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
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

  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
    payload: { name: string; email?: string; phone?: string; source: string; status: number },
  ) =>
    request<Lead>("/leads", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateLead: (
    token: string,
    id: number,
    payload: { name: string; email?: string; phone?: string; source: string; status: number; ownerUserId?: number | null },
  ) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
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
  getHistory: (token: string, params?: { leadId?: number; dealId?: number }) => {
    const query = new URLSearchParams();
    if (params?.leadId) query.set("leadId", String(params.leadId));
    if (params?.dealId) query.set("dealId", String(params.dealId));
    return request<HistoryItem[]>(`/historico?${query.toString()}`, { token });
  },
  getWhatsAppIntegration: (token: string) => request<WhatsAppIntegration>("/whatsapp/integracao", { token }),
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
