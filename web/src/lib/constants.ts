// --- Processo comercial Atlas: funil de 7 etapas (fixas) ---
export const FUNNEL_STAGE_OPTIONS = [
  { value: "Mapped", label: "Mapeado", order: 1 },
  { value: "Prospected", label: "Prospectado", order: 2 },
  { value: "Replied", label: "Respondeu", order: 3 },
  { value: "MeetingScheduled", label: "Reunião agendada", order: 4 },
  { value: "MeetingDone", label: "Reunião feita", order: 5 },
  { value: "ProposalSent", label: "Proposta enviada", order: 6 },
  { value: "Closed", label: "Fechado / Perdido", order: 7 },
] as const;

export const FUNNEL_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  FUNNEL_STAGE_OPTIONS.map((s) => [s.value, s.label]),
);

// --- Divisão do CRM: Inbound (tráfego pago) x Outbound (cold call) ---
export const LEAD_TYPE_OPTIONS = [
  { value: "Inbound", label: "Inbound" },
  { value: "Outbound", label: "Outbound" },
] as const;

export type LeadTypeValue = (typeof LEAD_TYPE_OPTIONS)[number]["value"];

// No outbound, as 3 primeiras etapas têm rótulo de cold call; as demais são iguais.
export const OUTBOUND_STAGE_LABELS: Record<string, string> = {
  Mapped: "Lista",
  Prospected: "Em cadência",
  Replied: "Conectado",
};

// Rótulo da etapa conforme o tipo do lead.
export function stageLabelFor(stage: string, leadType: LeadTypeValue): string {
  if (leadType === "Outbound" && OUTBOUND_STAGE_LABELS[stage]) return OUTBOUND_STAGE_LABELS[stage];
  return FUNNEL_STAGE_LABELS[stage] ?? stage;
}

export const CHANNEL_OPTIONS = [
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Indicação", label: "Indicação" },
] as const;

export const LOSS_REASON_OPTIONS = [
  { value: "NoInterest", label: "Sem interesse" },
  { value: "NoBudget", label: "Sem verba" },
  { value: "NoAuthority", label: "Sem autoridade" },
  { value: "ClosedWithCompetitor", label: "Concorrente" },
  { value: "StoppedResponding", label: "Fantasma (parou de responder)" },
  { value: "Other", label: "Outro" },
] as const;

export const LOSS_REASON_LABELS: Record<string, string> = Object.fromEntries(
  LOSS_REASON_OPTIONS.map((r) => [r.value, r.label]),
);

// Qualificação BANT — opções fixas por dimensão (Budget, Authority, Need, Timeline)
export const BANT_LEVEL_OPTIONS = [
  { value: "Unknown", label: "Não avaliado" },
  { value: "No", label: "Não" },
  { value: "Partial", label: "Parcial" },
  { value: "Yes", label: "Sim" },
] as const;

export const BANT_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  BANT_LEVEL_OPTIONS.map((b) => [b.value, b.label]),
);

export const BANT_DIMENSIONS = [
  { key: "bantBudget", label: "Orçamento (Budget)", short: "B" },
  { key: "bantAuthority", label: "Autoridade (Authority)", short: "A" },
  { key: "bantNeed", label: "Necessidade (Need)", short: "N" },
  { key: "bantTimeline", label: "Prazo (Timeline)", short: "T" },
] as const;

// Registro de contato / script usado
export const INTERACTION_CHANNEL_OPTIONS = [
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Ligação", label: "Ligação" },
  { value: "Email", label: "E-mail" },
  { value: "Presencial", label: "Presencial" },
] as const;

export const INTERACTION_OUTCOME_OPTIONS = [
  { value: "NoReply", label: "Sem resposta" },
  { value: "Replied", label: "Respondeu" },
  { value: "Positive", label: "Resposta positiva" },
  { value: "Negative", label: "Resposta negativa" },
] as const;

export const INTERACTION_OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  INTERACTION_OUTCOME_OPTIONS.map((o) => [o.value, o.label]),
);

export const LEAD_STATUS_OPTIONS = [
  { value: "New", label: "Novo" },
  { value: "Contacted", label: "Contactado" },
  { value: "MessageSent", label: "Mensagem enviada" },
  { value: "Qualified", label: "Qualificado" },
  { value: "Converted", label: "Convertido" },
  { value: "Lost", label: "Perdido" },
] as const;

export const LEAD_SOURCE_OPTIONS = [
  { value: "Instagram Ads", label: "Instagram Ads" },
  { value: "Facebook Ads", label: "Facebook Ads" },
  { value: "Google Ads", label: "Google Ads" },
  { value: "Landing Page", label: "Landing Page" },
  { value: "Outbound", label: "Outbound" },
  { value: "Referral", label: "Indicação" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Orgânico", label: "Orgânico" },
  { value: "Evento", label: "Evento" },
  { value: "Outro", label: "Outro" },
] as const;

export const LEAD_TEMPERATURE_OPTIONS = [
  { value: 0, label: "Não qualificado", tone: "muted" },
  { value: 1, label: "Frio", tone: "cool" },
  { value: 2, label: "Morno", tone: "gold" },
  { value: 3, label: "Quente", tone: "orange" },
] as const;

export const DEAL_STATUS_OPTIONS = [
  { value: 1, label: "Em aberto" },
  { value: 2, label: "Ganho" },
  { value: 3, label: "Perdido" },
] as const;

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 1, label: "Tarefa" },
  { value: 2, label: "Ligação" },
  { value: 3, label: "E-mail" },
  { value: 4, label: "Reunião" },
  { value: 5, label: "Nota" },
] as const;

export const ACTIVITY_STATUS_OPTIONS = [
  { value: 1, label: "Pendente" },
  { value: 2, label: "Concluída" },
  { value: 3, label: "Cancelada" },
] as const;

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: 1, label: "Ligação", key: "Call" },
  { value: 2, label: "Reunião", key: "Meeting" },
  { value: 3, label: "Visita", key: "Visit" },
  { value: 4, label: "Lembrete", key: "Reminder" },
  { value: 5, label: "Tarefa", key: "Task" },
] as const;

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 1, label: "Agendado", key: "Scheduled" },
  { value: 2, label: "Realizado", key: "Done" },
  { value: 3, label: "Cancelado", key: "Cancelled" },
] as const;

export const AUTOMATION_EVENT_OPTIONS = [
  { value: 1, label: "Negócio movido" },
  { value: 2, label: "Lead criado" },
  { value: 3, label: "Atividade concluída" },
] as const;

export const WHATSAPP_PROVIDER_OPTIONS = [
  { value: 1, label: "Evolution" },
  { value: 2, label: "MetaCloud" },
  { value: 3, label: "ZApi" },
] as const;

export const WHATSAPP_STATUS_OPTIONS = [
  { value: 1, label: "Desconectado" },
  { value: 2, label: "Pendente" },
  { value: 3, label: "Conectado" },
] as const;
