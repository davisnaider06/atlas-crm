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
