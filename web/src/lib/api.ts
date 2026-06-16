import type {
  Activity,
  Appointment,
  AuthResponse,
  Automation,
  ChatMessage,
  Conversation,
  CustomFieldDef,
  Dashboard,
  Customer,
  FinanceEntry,
  Deal,
  DocumentItem,
  HistoryItem,
  Lead,
  LeadClearResult,
  LeadImportResult,
  LeadInteraction,
  LeadOwner,
  PagedResult,
  Script,
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

const REQUEST_TIMEOUT_MS = 20000;

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

// Notifica todos os aguardando o refresh. Passa o novo token em caso de sucesso
// ou null em caso de falha — assim ninguém fica preso esperando para sempre.
function notifyRefreshSubscribers(token: string | null) {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach((cb) => cb(token));
}

// fetch com timeout: corta a requisição se a API/DB demorar demais, em vez de
// deixar a tela travada indefinidamente.
async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const timeoutError = new Error("A requisição demorou demais e foi cancelada. Tente novamente.");
      (timeoutError as { status?: number }).status = 408;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined" && path !== "/auth/login" && path !== "/auth/refresh") {
    const storageKey = "atlascrm.auth";
    const raw = window.localStorage.getItem(storageKey);
    const refreshToken = (() => {
      if (!raw) return null;
      try {
        return JSON.parse(raw)?.user?.refreshToken ?? null;
      } catch {
        return null;
      }
    })();

    if (refreshToken) {
      let newToken: string | null = null;

      if (isRefreshing) {
        // Já há um refresh em andamento: aguarda o resultado dele.
        newToken = await new Promise<string | null>((resolve) => {
          subscribeTokenRefresh(resolve);
        });
      } else {
        isRefreshing = true;
        try {
          const refreshResponse = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error("Refresh failed");
          }

          const newAuthData = await refreshResponse.json();
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ token: newAuthData.accessToken, user: newAuthData }),
          );
          window.dispatchEvent(new CustomEvent("atlascrm:auth:refresh", { detail: newAuthData }));
          isRefreshing = false;
          newToken = newAuthData.accessToken;
          notifyRefreshSubscribers(newToken);
        } catch (err) {
          // Falha no refresh: libera todos os que aguardavam (com null) e desloga,
          // evitando requisições penduradas para sempre.
          isRefreshing = false;
          notifyRefreshSubscribers(null);
          window.localStorage.removeItem(storageKey);
          window.dispatchEvent(new Event("atlascrm:auth:logout"));
          throw err;
        }
      }

      if (newToken) {
        const newHeaders = new Headers(options.headers);
        if (!newHeaders.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
          newHeaders.set("Content-Type", "application/json");
        }
        newHeaders.set("Authorization", `Bearer ${newToken}`);

        response = await fetchWithTimeout(`${API_URL}${path}`, {
          ...options,
          headers: newHeaders,
        });
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

  getConversations: (token: string) => request<Conversation[]>("/whatsapp/conversas", { token }),
  getConversationMessages: (token: string, id: number) =>
    request<ChatMessage[]>(`/whatsapp/conversas/${id}/mensagens`, { token }),
  sendConversationMessage: (token: string, id: number, text: string) =>
    request<ChatMessage>(`/whatsapp/conversas/${id}/mensagens`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }),

  getCustomFields: (token: string, target: "Lead" | "Deal" | "Customer" = "Lead") =>
    request<CustomFieldDef[]>(`/custom-fields?target=${target}`, { token }),
  createCustomField: (
    token: string,
    payload: { target: number; name: string; type: number; options?: string[] },
  ) =>
    request<CustomFieldDef>("/custom-fields", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  deleteCustomField: (token: string, id: number) =>
    request<void>(`/custom-fields/${id}`, { method: "DELETE", token }),

  getDashboard: (token: string, period?: string) =>
    request<Dashboard>(`/dashboard${period ? `?period=${encodeURIComponent(period)}` : ""}`, { token }),
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
      extraDataJson?: string | null;
      channel?: string | null;
      companyName?: string | null;
      contactHandle?: string | null;
      nextFollowUpAtUtc?: string | null;
      observations?: string | null;
      city?: string | null;
      instagramHandle?: string | null;
      googleRating?: number | null;
      bantBudget?: string;
      bantAuthority?: string;
      bantNeed?: string;
      bantTimeline?: string;
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
      extraDataJson?: string | null;
      channel?: string | null;
      companyName?: string | null;
      contactHandle?: string | null;
      lastContactAtUtc?: string | null;
      nextFollowUpAtUtc?: string | null;
      followUpStep?: number;
      observations?: string | null;
      proposalValue?: number | null;
      city?: string | null;
      instagramHandle?: string | null;
      googleRating?: number | null;
      bantBudget?: string;
      bantAuthority?: string;
      bantNeed?: string;
      bantTimeline?: string;
    },
  ) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  moveLeadStage: (
    token: string,
    id: number,
    payload: {
      funnelStage: string;
      outcome?: string;
      contractValue?: number | null;
      lossReason?: string;
    },
  ) =>
    request<Lead>(`/leads/${id}/move`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  advanceLeadFollowUp: (token: string, id: number) =>
    request<Lead>(`/leads/${id}/followup`, {
      method: "POST",
      token,
    }),
  deleteLead: (token: string, id: number) =>
    request<void>(`/leads/${id}`, {
      method: "DELETE",
      token,
    }),
  // Baixa o .xlsx de todos os leads. Retorna um Blob (o componente cuida do download).
  exportLeads: async (token: string): Promise<Blob> => {
    const response = await fetchWithTimeout(
      `${API_URL}/leads/export`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      60000,
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const err = new Error(body?.error ?? "Falha ao exportar leads.");
      (err as { status?: number }).status = response.status;
      throw err;
    }
    return response.blob();
  },
  importLeads: (
    token: string,
    file: File,
    options?: {
      distribute?: boolean;
      ownerUserIds?: number[];
      phoneDuplicateMode?: "ask" | "import" | "skip";
    },
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.distribute !== undefined) formData.append("distribute", String(options.distribute));
    if (options?.ownerUserIds && options.ownerUserIds.length > 0) {
      formData.append("ownerUserIds", options.ownerUserIds.join(","));
    }
    if (options?.phoneDuplicateMode) formData.append("phoneDuplicateMode", options.phoneDuplicateMode);
    return request<LeadImportResult>("/leads/import", {
      method: "POST",
      token,
      body: formData,
    });
  },
  clearAllLeads: (token: string) =>
    request<LeadClearResult>("/leads", {
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
  getScripts: (token: string) => request<Script[]>("/scripts", { token }),
  createScript: (
    token: string,
    payload: { name: string; channel?: string | null; body?: string | null; isActive: boolean },
  ) => request<Script>("/scripts", { method: "POST", token, body: JSON.stringify(payload) }),
  updateScript: (
    token: string,
    id: number,
    payload: { name: string; channel?: string | null; body?: string | null; isActive: boolean },
  ) => request<Script>(`/scripts/${id}`, { method: "PUT", token, body: JSON.stringify(payload) }),
  deleteScript: (token: string, id: number) =>
    request<void>(`/scripts/${id}`, { method: "DELETE", token }),

  getLeadInteractions: (token: string, leadId: number) =>
    request<LeadInteraction[]>(`/leads/${leadId}/interacoes`, { token }),
  createLeadInteraction: (
    token: string,
    leadId: number,
    payload: { channel: string; scriptId?: number | null; outcome: string; notes?: string | null; occurredAtUtc?: string | null },
  ) => request<LeadInteraction>(`/leads/${leadId}/interacoes`, { method: "POST", token, body: JSON.stringify(payload) }),
  deleteLeadInteraction: (token: string, interactionId: number) =>
    request<void>(`/leads/interacoes/${interactionId}`, { method: "DELETE", token }),

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
