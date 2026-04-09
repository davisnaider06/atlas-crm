"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Activity, Deal, PagedResult } from "@/lib/types";

const activityTypeOptions = [
  { value: 1, label: "Task" },
  { value: 2, label: "Call" },
  { value: 3, label: "Email" },
  { value: 4, label: "Meeting" },
  { value: 5, label: "Note" },
];

const activityStatusOptions = [
  { value: 1, label: "Pending" },
  { value: 2, label: "Completed" },
  { value: 3, label: "Cancelled" },
];

export default function ActivitiesPage() {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    dealId: "",
    type: "1",
    description: "",
    dueAtUtc: "",
  });
  const [editForm, setEditForm] = useState({
    type: "Task",
    description: "",
    dueAtUtc: "",
    status: "Pending",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [activitiesResponse, dealsResponse] = await Promise.all([
        api.getActivities(token, { search: search || undefined }),
        api.getDeals(token),
      ]);

      const activityItems = (activitiesResponse as PagedResult<Activity>).items;
      setActivities(activityItems);
      setDeals((dealsResponse as PagedResult<Deal>).items);
      if (selectedActivity) {
        setSelectedActivity(activityItems.find((item) => item.id === selectedActivity.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedActivity) {
      return;
    }

    setEditForm({
      type: selectedActivity.type,
      description: selectedActivity.description,
      dueAtUtc: selectedActivity.dueAtUtc.slice(0, 16),
      status: selectedActivity.status,
    });
  }, [selectedActivity]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar atividade.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedActivity) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const type = activityTypeOptions.find((option) => option.label === editForm.type)?.value ?? 1;
      const status = activityStatusOptions.find((option) => option.label === editForm.status)?.value ?? 1;
      await api.updateActivity(token, selectedActivity.id, {
        type,
        description: editForm.description,
        dueAtUtc: new Date(editForm.dueAtUtc).toISOString(),
        status,
        assignedUserId: selectedActivity.assignedUserId ?? null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar atividade.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedActivity) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteActivity(token, selectedActivity.id);
      setSelectedActivity(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir atividade.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando atividades..." />;
  }

  if (error && activities.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar atividade</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descricao" />
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
              <p>Com selecao e edicao</p>
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
                  {activity.status} · {formatDate(activity.dueAtUtc)}
                </span>
              </article>
            ))}
          </div>
        </div>

        <form className="settings-card form-card" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <h3>Nova atividade</h3>
              <p>Cria tarefas e follow-ups</p>
            </div>
            <span className="tag">Criacao</span>
          </div>

          <label className="field">
            <span>Negocio</span>
            <select value={form.dealId} onChange={(event) => setForm((current) => ({ ...current, dealId: event.target.value }))}>
              <option value="">Sem vinculo</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.leadName} · {deal.stageName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              {activityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Descricao</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Vencimento</span>
            <input type="datetime-local" value={form.dueAtUtc} onChange={(event) => setForm((current) => ({ ...current, dueAtUtc: event.target.value }))} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar atividade"}
          </button>
        </form>

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
                <select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}>
                  {activityTypeOptions.map((option) => (
                    <option key={option.value} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Descricao</span>
                <textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} required />
              </label>
              <label className="field">
                <span>Vencimento</span>
                <input type="datetime-local" value={editForm.dueAtUtc} onChange={(event) => setEditForm((current) => ({ ...current, dueAtUtc: event.target.value }))} required />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                  {activityStatusOptions.map((option) => (
                    <option key={option.value} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Atualizando..." : "Salvar atividade"}
              </button>
              <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                Excluir atividade
              </button>
            </form>
          ) : (
            <div className="empty-card">Selecione uma atividade para editar.</div>
          )}
        </div>
      </section>
    </div>
  );
}
