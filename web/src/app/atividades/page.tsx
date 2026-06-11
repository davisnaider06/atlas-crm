"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { Select } from "@/components/ui/select";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_STATUS_OPTIONS } from "@/lib/constants";
import type { Activity, Deal, PagedResult } from "@/lib/types";

export default function ActivitiesPage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ dealId: "", type: "1", description: "", dueAtUtc: "" });
  const [editForm, setEditForm] = useState({ type: "Task", description: "", dueAtUtc: "", status: "Pending" });

  const canCreate = hasPermission(user, permissions.activitiesCreate);
  const canEdit = hasPermission(user, permissions.activitiesEdit);
  const canDelete = hasPermission(user, permissions.activitiesDelete);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [activitiesRes, dealsRes] = await Promise.all([
        api.getActivities(token, { search: search || undefined }),
        api.getDeals(token),
      ]);
      const items = (activitiesRes as PagedResult<Activity>).items;
      setActivities(items);
      setDeals((dealsRes as PagedResult<Deal>).items);
      setSelectedActivity((cur) => cur ? items.find((a) => a.id === cur.id) ?? null : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar atividades.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro ao carregar atividades" });
    } finally {
      setLoading(false);
    }
  }, [token, search, notify]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedActivity) return;
    setEditForm({
      type: selectedActivity.type,
      description: selectedActivity.description,
      dueAtUtc: selectedActivity.dueAtUtc.slice(0, 16),
      status: selectedActivity.status,
    });
  }, [selectedActivity]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.createActivity(token, {
        dealId: form.dealId ? Number(form.dealId) : undefined,
        type: Number(form.type),
        description: form.description,
        dueAtUtc: new Date(form.dueAtUtc).toISOString(),
        status: 1,
      });
      setForm({ dealId: "", type: "1", description: "", dueAtUtc: "" });
      await load();
      notify({ type: "success", message: "Atividade criada.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar atividade.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedActivity) return;
    setSubmitting(true);
    try {
      const typeVal = ACTIVITY_TYPE_OPTIONS.find((o) => o.label === editForm.type)?.value ?? 1;
      const statusVal = ACTIVITY_STATUS_OPTIONS.find((o) => o.label === editForm.status)?.value ?? 1;
      await api.updateActivity(token, selectedActivity.id, {
        type: typeVal,
        description: editForm.description,
        dueAtUtc: new Date(editForm.dueAtUtc).toISOString(),
        status: statusVal,
        assignedUserId: selectedActivity.assignedUserId ?? null,
      });
      await load();
      notify({ type: "success", message: "Atividade atualizada.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar atividade.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedActivity) return;
    setSubmitting(true);
    try {
      await api.deleteActivity(token, selectedActivity.id);
      setSelectedActivity(null);
      await load();
      notify({ type: "success", message: "Atividade excluída.", title: "Excluída" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir atividade.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando atividades..." />;
  if (error && activities.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar atividade</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Descrição" />
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Atualizar lista
        </button>
      </section>

      <section className="three-column">
        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Timeline de atividades</h3>
              <p>Com seleção e edição</p>
            </div>
            <span className="tag">{activities.length} itens</span>
          </div>

          <div className="timeline">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className={`timeline-item selectable-card${selectedActivity?.id === activity.id ? " row-active" : ""}`}
                onClick={() => setSelectedActivity(activity)}
              >
                <strong>{activity.description}</strong>
                <p>{activity.type}</p>
                <span>
                  {activity.status} — {formatDate(activity.dueAtUtc)}
                </span>
              </article>
            ))}
            {activities.length === 0 && (
              <div className="empty-card">Nenhuma atividade encontrada.</div>
            )}
          </div>
        </div>

        {canCreate && (
          <form className="settings-card form-card" onSubmit={handleCreate}>
            <div className="card-header">
              <div>
                <h3>Nova atividade</h3>
                <p>Cria tarefas e follow-ups</p>
              </div>
              <span className="tag">Nova</span>
            </div>

            <label className="field">
              <span>Negócio</span>
              <Select
                value={form.dealId}
                onChange={(value) => setForm((f) => ({ ...f, dealId: value }))}
                options={[
                  { value: "", label: "Sem vínculo" },
                  ...deals.map((d) => ({ value: String(d.id), label: `${d.leadName} — ${d.stageName}` })),
                ]}
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <Select
                value={form.type}
                onChange={(value) => setForm((f) => ({ ...f, type: value }))}
                options={ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </label>
            <label className="field">
              <span>Vencimento</span>
              <input type="datetime-local" value={form.dueAtUtc} onChange={(e) => setForm((f) => ({ ...f, dueAtUtc: e.target.value }))} required />
            </label>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar atividade"}
            </button>
          </form>
        )}

        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>{selectedActivity ? "Editar atividade" : "Selecione uma atividade"}</h3>
              <p>{selectedActivity ? "Atualize status, tipo e prazo" : "Clique na timeline"}</p>
            </div>
          </div>

          {selectedActivity ? (
            <form className="form-card" onSubmit={handleUpdate}>
              <label className="field">
                <span>Tipo</span>
                <Select
                  value={editForm.type}
                  onChange={(value) => setEditForm((f) => ({ ...f, type: value }))}
                  options={ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.label, label: o.label }))}
                />
              </label>
              <label className="field">
                <span>Descrição</span>
                <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} required />
              </label>
              <label className="field">
                <span>Vencimento</span>
                <input type="datetime-local" value={editForm.dueAtUtc} onChange={(e) => setEditForm((f) => ({ ...f, dueAtUtc: e.target.value }))} required />
              </label>
              <label className="field">
                <span>Status</span>
                <Select
                  value={editForm.status}
                  onChange={(value) => setEditForm((f) => ({ ...f, status: value }))}
                  options={ACTIVITY_STATUS_OPTIONS.map((o) => ({ value: o.label, label: o.label }))}
                />
              </label>
              <button type="submit" className="primary-button" disabled={submitting || !canEdit}>
                {submitting ? "Atualizando..." : "Salvar atividade"}
              </button>
              {canDelete && (
                <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                  Excluir atividade
                </button>
              )}
            </form>
          ) : (
            <div className="empty-card">Selecione uma atividade para editar.</div>
          )}
        </div>
      </section>
    </div>
  );
}
