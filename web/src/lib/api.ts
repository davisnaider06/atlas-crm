import type {
  Activity,
  Appointment,
  AuthResponse,
  Automation,
  Dashboard,
  Customer,
  FinanceEntry,
  Deal,
  DocumentItem,
  HistoryItem,
  Lead,
  LeadOwner,
  PagedResult,
  PermissionCatalogItem,
  Pipeline,
  RegisterPayload,
  TeamMember,
  WhatsAppCampaignRecipient,
  WhatsAppCampaignResult,
  WhatsAppConnectionSession,
  WhatsAppIntegration,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = RequestInit & {
  token?: string | null;
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined" && path !== "/auth/login" && path !== "/auth/refresh") {
    const storageKey = "atlascrm.auth";
    const raw = window.localStorage.getItem(storageKey);
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: parsed.user.refreshToken }),
              });

              if (refreshResponse.ok) {
                const newAuthData = await refreshResponse.json();
                
                window.localStorage.setItem(
                  storageKey,
                  JSON.stringify({ token: newAuthData.accessToken, user: newAuthData })
                );
                
                window.dispatchEvent(new CustomEvent("atlascrm:auth:refresh", { detail: newAuthData }));
                
                isRefreshing = false;
                onRefreshed(newAuthData.accessToken);
              } else {
                throw new Error("Refresh failed");
              }
            } catch (err) {
              isRefreshing = false;
              window.localStorage.removeItem(storageKey);
              window.dispatchEvent(new Event("atlascrm:auth:logout"));
              throw err;
            }
          }
          
          const newToken = await new Promise<string>((resolve) => {
            subscribeTokenRefresh(resolve);
          });
          
          const newHeaders = new Headers(options.headers);
          if (!newHeaders.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
            newHeaders.set("Content-Type", "application/json");
          }
          newHeaders.set("Authorization", `Bearer ${newToken}`);
          
          response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: newHeaders,
          });
          
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const err = new Error(body?.error ?? "Falha ao comunicar com a API.");
    (err as any).status = response.status;
    throw err;
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
  clerkLogin: (clerkToken: string, companyName?: string) =>
    request<AuthResponse>("/auth/clerk", {
      method: "POST",
      body: JSON.stringify({ token: clerkToken, companyName }),
    }),

  getDashboard: (token: string) => request<Dashboard>("/dashboard", { token }),
  getLeads: (
    token: string,
    params?: { search?: string; source?: string; status?: string; ownerUserId?: number },
  ) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    if (params?.source) query.set("source", params.source);
    if (params?.status) query.set("status", params.status);
    if (params?.ownerUserId) query.set("ownerUserId", String(params.ownerUserId));
    return request<PagedResult<Lead>>(`/leads?${query.toString()}`, { token });
  },
  getLeadOwners: (token: string) => request<LeadOwner[]>("/leads/vendedores", { token }),
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
  getDocuments: (token: string, params?: { search?: string; sector?: string; tag?: string; visibility?: string }) => {
    const query = new URLSearchParams({ page: "1", pageSize: "50" });
    if (params?.search) query.set("search", params.search);
    if (params?.sector) query.set("sector", params.sector);
    if (params?.tag) query.set("tag", params.tag);
    if (params?.visibility) query.set("visibility", params.visibility);
    return request<PagedResult<DocumentItem>>(`/documentos?${query.toString()}`, { token });
  },
  getDocumentById: (token: string, id: number) => request<DocumentItem>(`/documentos/${id}`, { token }),
  getDocumentRawUrl: (id: number) => `${API_URL}/documentos/${id}/raw`,
  // Materials/Finance
  getFinance: (token: string) => request<PagedResult<FinanceEntry>>(`/finance?page=1&pageSize=50`, { token }),
  createFinanceEntry: (token: string, payload: { occurredAtUtc: string; type: string; category: string; amount: number; currency?: string; notes?: string }) =>
    request<FinanceEntry>("/finance", {
      method: "POST",
      token,
      body: JSON.stringify({ ...payload, currency: payload.currency ?? "BRL" }),
    }),
  createDocumentLink: (
    token: string,
    payload: { title: string; description?: string; url: string; sector?: string; tags?: string[]; isOnboarding?: boolean; visibility?: string },
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
  getTeamMembers: (token: string) => request<TeamMember[]>("/equipe", { token }),
  getPermissionCatalog: (token: string) =>
    request<PermissionCatalogItem[]>("/equipe/permissoes", { token }),
  createTeamMember: (
    token: string,
    payload: {
      name: string;
      email: string;
      password: string;
      role: string;
      permissions: string[];
    },
  ) =>
    request<TeamMember>("/equipe", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateTeamMember: (
    token: string,
    id: number,
    payload: {
      name: string;
      password?: string;
      role: string;
      isActive: boolean;
      permissions: string[];
    },
  ) =>
    request<TeamMember>(`/equipe/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),

  getAppointments: (
    token: string,
    params?: { from?: string; to?: string; status?: string; page?: number; pageSize?: number },
  ) => {
    const query = new URLSearchParams({ page: String(params?.page ?? 1), pageSize: String(params?.pageSize ?? 50) });
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.status) query.set("status", params.status);
    return request<PagedResult<Appointment>>(`/agenda?${query.toString()}`, { token });
  },

  createAppointment: (
    token: string,
    payload: {
      title: string;
      description?: string;
      startAtUtc: string;
      endAtUtc: string;
      type: number;
      leadId?: number | null;
      dealId?: number | null;
      assignedUserId?: number | null;
    },
  ) =>
    request<Appointment>("/agenda", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),

  updateAppointment: (
    token: string,
    id: number,
    payload: {
      title: string;
      description?: string;
      startAtUtc: string;
      endAtUtc: string;
      type: number;
      status: number;
      leadId?: number | null;
      dealId?: number | null;
      assignedUserId?: number | null;
    },
  ) =>
    request<Appointment>(`/agenda/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),

  deleteAppointment: (token: string, id: number) =>
    request<void>(`/agenda/${id}`, {
      method: "DELETE",
      token,
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
