"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import { APPOINTMENT_TYPE_OPTIONS, APPOINTMENT_STATUS_OPTIONS } from "@/lib/constants";
import type { Appointment, Lead, TeamMember } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "@/components/ui/icons";


const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

type ModalMode = "create" | "edit";

const BLANK_FORM = {
  title: "",
  description: "",
  startAtUtc: "",
  endAtUtc: "",
  type: "2",
  status: "1",
  leadId: "",
  assignedUserId: "",
};

export default function AgendaPage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const canCreate = hasPermission(user, permissions.schedulesCreate);
  const canEdit = hasPermission(user, permissions.schedulesEdit);
  const canDelete = hasPermission(user, permissions.schedulesDelete);

  const monthStart = useMemo(() => {
    const d = new Date(currentMonth);
    d.setDate(1);
    return d;
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  }, [currentMonth]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1).toISOString();
      const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0).toISOString();
      const [apptRes, leadsRes, teamRes] = await Promise.all([
        api.getAppointments(token, { from, to, pageSize: 200 }),
        api.getLeads(token, {}),
        api.getTeamMembers(token),
      ]);
      setAppointments(apptRes.items);
      setLeads(leadsRes.items ?? []);
      setTeamMembers(Array.isArray(teamRes) ? teamRes : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar agenda.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setLoading(false);
    }
  }, [token, currentMonth, notify]);

  useEffect(() => { void load(); }, [load]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startPad = monthStart.getDay();
    for (let i = startPad; i > 0; i--) {
      days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - i));
    }
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }, [monthStart, monthEnd, currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      const key = new Date(appt.startAtUtc).toDateString();
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    return appointmentsByDay.get(selectedDay.toDateString()) ?? [];
  }, [appointmentsByDay, selectedDay]);

  function openCreate(day?: Date) {
    const base = day ?? selectedDay;
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = base.getFullYear();
    const m = pad(base.getMonth() + 1);
    const d = pad(base.getDate());
    setForm({ ...BLANK_FORM, startAtUtc: `${y}-${m}-${d}T09:00`, endAtUtc: `${y}-${m}-${d}T10:00` });
    setModalMode("create");
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(appt: Appointment) {
    setForm({
      title: appt.title,
      description: appt.description ?? "",
      startAtUtc: appt.startAtUtc.slice(0, 16),
      endAtUtc: appt.endAtUtc.slice(0, 16),
      type: String(APPOINTMENT_TYPE_OPTIONS.find((o) => o.key === appt.type)?.value ?? 2),
      status: String(APPOINTMENT_STATUS_OPTIONS.find((o) => o.key === appt.status)?.value ?? 1),
      leadId: appt.leadId ? String(appt.leadId) : "",
      assignedUserId: appt.assignedUserId ? String(appt.assignedUserId) : "",
    });
    setModalMode("edit");
    setEditingId(appt.id);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        startAtUtc: new Date(form.startAtUtc).toISOString(),
        endAtUtc: new Date(form.endAtUtc).toISOString(),
        type: Number(form.type),
        status: Number(form.status),
        leadId: form.leadId ? Number(form.leadId) : null,
        assignedUserId: form.assignedUserId ? Number(form.assignedUserId) : null,
      };
      if (modalMode === "create") {
        await api.createAppointment(token, payload);
        notify({ type: "success", message: "Compromisso criado.", title: "Sucesso" });
      } else if (editingId) {
        await api.updateAppointment(token, editingId, payload);
        notify({ type: "success", message: "Compromisso atualizado.", title: "Sucesso" });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token || !editingId) return;
    setSubmitting(true);
    try {
      await api.deleteAppointment(token, editingId);
      notify({ type: "success", message: "Compromisso excluído.", title: "Excluído" });
      setModalOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date();

  if (loading) return <LoadingState label="Carregando agenda..." />;
  if (error && appointments.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="page-grid">
      <div className="calendar-shell">
        {/* Calendar panel */}
        <div className="calendar-main">
          <div className="calendar-header">
            <h3 className="calendar-month-label">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h3>
            <div className="calendar-nav">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeftIcon size={15} />
              </button>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDay(now);
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRightIcon size={15} />
              </button>
            </div>
            {canCreate && (
              <button type="button" className="primary-button" onClick={() => openCreate()}>
                <PlusIcon size={14} /> Novo compromisso
              </button>
            )}
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="calendar-weekday">{wd}</div>
            ))}
            {calendarDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const isOtherMonth = day.getMonth() !== currentMonth.getMonth();
              const dayAppts = appointmentsByDay.get(day.toDateString()) ?? [];
              return (
                <button
                  key={i}
                  type="button"
                  className={`calendar-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}${isOtherMonth ? " other-month" : ""}`}
                  onClick={() => {
                    setSelectedDay(day);
                    if (day.getMonth() !== currentMonth.getMonth()) {
                      setCurrentMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    }
                  }}
                >
                  <span className="calendar-day-num">{day.getDate()}</span>
                  <span className="calendar-event-dots">
                    {dayAppts.slice(0, 3).map((appt) => (
                      <span
                        key={appt.id}
                        className={`calendar-event-dot ${appt.type.toLowerCase()}`}
                      />
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="calendar-event-dot more">+{dayAppts.length - 3}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="agenda-day-list">
          <div className="agenda-day-header">
            <div>
              <p className="agenda-day-label">{formatDateLabel(selectedDay)}</p>
              <span className="muted-mini">{selectedDayAppointments.length} compromisso{selectedDayAppointments.length !== 1 ? "s" : ""}</span>
            </div>
            {canCreate && (
              <button type="button" className="ghost-button" onClick={() => openCreate(selectedDay)}>
                <PlusIcon size={13} />
              </button>
            )}
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div className="agenda-empty">
              <p>Sem compromissos neste dia.</p>
              {canCreate && (
                <button type="button" className="ghost-button" onClick={() => openCreate(selectedDay)}>
                  Adicionar compromisso
                </button>
              )}
            </div>
          ) : (
            <div className="agenda-event-list">
              {selectedDayAppointments
                .sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime())
                .map((appt) => {
                  const typeOpt = APPOINTMENT_TYPE_OPTIONS.find((o) => o.key === appt.type);
                  const statusOpt = APPOINTMENT_STATUS_OPTIONS.find((o) => o.key === appt.status);
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      className="agenda-event-card"
                      onClick={() => canEdit && openEdit(appt)}
                    >
                      <span className={`agenda-event-bar ${appt.type.toLowerCase()}`} />
                      <div className="agenda-event-info">
                        <div className="agenda-event-title-row">
                          <strong>{appt.title}</strong>
                          <div className="agenda-event-chips">
                            <span className={`type-chip ${appt.type}`}>{typeOpt?.label ?? appt.type}</span>
                            <span className={`status-chip ${appt.status}`}>{statusOpt?.label ?? appt.status}</span>
                          </div>
                        </div>
                        <p className="agenda-event-time">
                          {formatTime(appt.startAtUtc)} – {formatTime(appt.endAtUtc)}
                          {appt.assignedUserName && <> · {appt.assignedUserName}</>}
                        </p>
                        {appt.leadName && <p className="agenda-event-lead">{appt.leadName}</p>}
                        {appt.description && <p className="agenda-event-desc">{appt.description}</p>}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>{modalMode === "create" ? "Novo compromisso" : "Editar compromisso"}</h3>
              <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>
                <XIcon size={16} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Título *</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Reunião de onboarding"
                  required
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Início *</span>
                  <input
                    type="datetime-local"
                    value={form.startAtUtc}
                    onChange={(e) => setForm((f) => ({ ...f, startAtUtc: e.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Fim *</span>
                  <input
                    type="datetime-local"
                    value={form.endAtUtc}
                    onChange={(e) => setForm((f) => ({ ...f, endAtUtc: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>Tipo</span>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {APPOINTMENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                {modalMode === "edit" && (
                  <label className="field">
                    <span>Status</span>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                      {APPOINTMENT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label className="field">
                <span>Lead vinculado</span>
                <select value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}>
                  <option value="">Sem vínculo</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Responsável</span>
                <select value={form.assignedUserId} onChange={(e) => setForm((f) => ({ ...f, assignedUserId: e.target.value }))}>
                  <option value="">Não atribuído</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Descrição</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detalhes do compromisso..."
                  rows={3}
                />
              </label>

              <div className="modal-actions">
                {modalMode === "edit" && canDelete && (
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => void handleDelete()}
                    disabled={submitting}
                  >
                    Excluir
                  </button>
                )}
                <div className="modal-actions-right">
                  <button type="button" className="ghost-button" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={submitting}>
                    {submitting ? "Salvando..." : modalMode === "create" ? "Criar" : "Salvar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
