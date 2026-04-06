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

export default function ActivitiesPage() {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    dealId: "",
    type: "1",
    description: "",
    dueAtUtc: "",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [activitiesResponse, dealsResponse] = await Promise.all([
        api.getActivities(token),
        api.getDeals(token),
      ]);

      setActivities((activitiesResponse as PagedResult<Activity>).items);
      setDeals((dealsResponse as PagedResult<Deal>).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

  if (loading) {
    return <LoadingState label="Carregando atividades..." />;
  }

  if (error && activities.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="two-column">
        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Timeline de atividades</h3>
              <p>Dados reais do endpoint `/atividades`</p>
            </div>
            <span className="tag">{activities.length} itens</span>
          </div>

          <div className="timeline">
            {activities.map((activity) => (
              <article key={activity.id} className="timeline-item">
                <strong>{activity.description}</strong>
                <p>{activity.type}</p>
                <span>
                  {activity.status} · {formatDate(activity.dueAtUtc)}
                </span>
              </article>
            ))}
          </div>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Nova atividade</h3>
              <p>Cria tarefas e follow-ups no tenant logado</p>
            </div>
            <span className="tag">POST /atividades</span>
          </div>

          <label className="field">
            <span>Negocio</span>
            <select
              value={form.dealId}
              onChange={(event) => setForm((current) => ({ ...current, dealId: event.target.value }))}
            >
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
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              {activityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Descricao</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Vencimento</span>
            <input
              type="datetime-local"
              value={form.dueAtUtc}
              onChange={(event) => setForm((current) => ({ ...current, dueAtUtc: event.target.value }))}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar atividade"}
          </button>
        </form>
      </section>
    </div>
  );
}
