"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Deal, Lead, PagedResult, Pipeline } from "@/lib/types";

export default function PipelinePage() {
  const { token } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leadId: "",
    stageId: "",
    value: "",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [dealsResponse, pipelinesResponse, leadsResponse] = await Promise.all([
        api.getDeals(token),
        api.getPipelines(token),
        api.getLeads(token),
      ]);

      setDeals((dealsResponse as PagedResult<Deal>).items);
      setPipelines(pipelinesResponse);
      setLeads((leadsResponse as PagedResult<Lead>).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pipeline.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const stages = useMemo(() => pipelines.flatMap((pipeline) => pipeline.stages), [pipelines]);

  const grouped = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        deals: deals.filter((deal) => deal.stageId === stage.id),
      })),
    [deals, stages],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createDeal(token, {
        leadId: Number(form.leadId),
        stageId: Number(form.stageId),
        value: Number(form.value),
      });
      setForm({ leadId: "", stageId: "", value: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar negocio.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando pipeline..." />;
  }

  if (error && deals.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Pipeline em tempo real</h3>
              <p>Colunas montadas com `GET /pipelines` e `GET /negocios`</p>
            </div>
            <span className="tag">{deals.length} negocios</span>
          </div>

          <div className="kanban-board">
            {grouped.map((stage) => (
              <div key={stage.id} className="kanban-column">
                <header>
                  <strong>{stage.name}</strong>
                  <span>{stage.deals.length}</span>
                </header>

                {stage.deals.map((deal) => (
                  <article key={deal.id} className="kanban-card">
                    <strong>{deal.leadName}</strong>
                    <span>{formatCurrency(deal.value)}</span>
                    <small>{deal.status}</small>
                  </article>
                ))}

                {stage.deals.length === 0 ? <div className="empty-card">Sem negocios nesta etapa.</div> : null}
              </div>
            ))}
          </div>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Novo negocio</h3>
              <p>Cria item direto no funil comercial</p>
            </div>
            <span className="tag">POST /negocios</span>
          </div>

          <label className="field">
            <span>Lead</span>
            <select
              value={form.leadId}
              onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}
              required
            >
              <option value="">Selecione um lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Etapa</span>
            <select
              value={form.stageId}
              onChange={(event) => setForm((current) => ({ ...current, stageId: event.target.value }))}
              required
            >
              <option value="">Selecione uma etapa</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Valor</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar negocio"}
          </button>
        </form>
      </section>
    </div>
  );
}
