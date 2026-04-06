import type {
  Activity,
  AuthResponse,
  Automation,
  Dashboard,
  Deal,
  Lead,
  PagedResult,
  Pipeline,
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
  getLeads: (token: string) => request<PagedResult<Lead>>("/leads?page=1&pageSize=50", { token }),
  createLead: (
    token: string,
    payload: { name: string; email?: string; phone?: string; source: string; status: number },
  ) =>
    request<Lead>("/leads", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  getDeals: (token: string) => request<PagedResult<Deal>>("/negocios?page=1&pageSize=50", { token }),
  createDeal: (
    token: string,
    payload: { leadId: number; stageId: number; value: number; ownerUserId?: number },
  ) =>
    request<Deal>("/negocios", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  moveDeal: (token: string, id: number, payload: { stageId: number; status: number }) =>
    request<Deal>(`/negocios/${id}/mover`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  getActivities: (token: string) =>
    request<PagedResult<Activity>>("/atividades?page=1&pageSize=50", { token }),
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
