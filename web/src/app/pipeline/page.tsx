"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Deal, HistoryItem, Lead, PagedResult, Pipeline } from "@/lib/types";

const dealStatusOptions = [
  { value: 1, label: "Open" },
  { value: 2, label: "Won" },
  { value: 3, label: "Lost" },
];

export default function PipelinePage() {
  const { token } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    leadId: "",
    stageId: "",
    value: "",
  });
  const [editForm, setEditForm] = useState({
    value: "",
    status: "Open",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [dealsResponse, pipelinesResponse, leadsResponse] = await Promise.all([
        api.getDeals(token, { search: search || undefined }),
        api.getPipelines(token),
        api.getLeads(token),
      ]);

      const dealItems = (dealsResponse as PagedResult<Deal>).items;
      setDeals(dealItems);
      setPipelines(pipelinesResponse);
      setLeads((leadsResponse as PagedResult<Lead>).items);
      if (selectedDeal) {
        setSelectedDeal(dealItems.find((item) => item.id === selectedDeal.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pipeline.");
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedDeal]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !selectedDeal) {
      setHistory([]);
      return;
    }

    setEditForm({ value: String(selectedDeal.value), status: selectedDeal.status });
    void api.getHistory(token, { dealId: selectedDeal.id }).then(setHistory).catch(() => setHistory([]));
  }, [selectedDeal, token]);

  const stages = useMemo(() => pipelines.flatMap((pipeline) => pipeline.stages), [pipelines]);
  const grouped = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        deals: deals.filter((deal) => deal.stageId === stage.id),
      })),
    [deals, stages],
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedDeal) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const status = dealStatusOptions.find((option) => option.label === editForm.status)?.value ?? 1;
      await api.updateDeal(token, selectedDeal.id, {
        value: Number(editForm.value),
        status,
        ownerUserId: selectedDeal.ownerUserId ?? null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar negocio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (dealId: number, stageId: number) => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.moveDeal(token, dealId, { stageId, status: 1 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao mover negocio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedDeal) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteDeal(token, selectedDeal.id);
      setSelectedDeal(null);
      setHistory([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir negocio.");
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
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar negocio</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lead ou etapa" />
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Atualizar lista
        </button>
      </section>

      <section className="three-column">
        <div className="table-card span-two">
          <div className="card-header">
            <div>
              <h3>Pipeline em tempo real</h3>
              <p>Movimentacao manual entre etapas</p>
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
                  <article key={deal.id} className="kanban-card selectable-card" onClick={() => setSelectedDeal(deal)}>
                    <strong>{deal.leadName}</strong>
                    <span>{formatCurrency(deal.value)}</span>
                    <small>{deal.status}</small>
                    <select value={deal.stageId} onChange={(event) => void handleMove(deal.id, Number(event.target.value))}>
                      {stages.map((moveStage) => (
                        <option key={moveStage.id} value={moveStage.id}>
                          {moveStage.name}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}

                {stage.deals.length === 0 ? <div className="empty-card">Sem negocios nesta etapa.</div> : null}
              </div>
            ))}
          </div>
        </div>

        <form className="settings-card form-card" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <h3>Novo negocio</h3>
              <p>Cria item no funil</p>
            </div>
            <span className="tag">POST</span>
          </div>

          <label className="field">
            <span>Lead</span>
            <select value={form.leadId} onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))} required>
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
            <select value={form.stageId} onChange={(event) => setForm((current) => ({ ...current, stageId: event.target.value }))} required>
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
            <input type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} required />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar negocio"}
          </button>
        </form>
      </section>

      <section className="two-column">
        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>{selectedDeal ? "Editar negocio" : "Selecione um negocio"}</h3>
              <p>{selectedDeal ? selectedDeal.leadName : "Clique em um card do pipeline"}</p>
            </div>
          </div>

          {selectedDeal ? (
            <form className="form-card" onSubmit={handleUpdate}>
              <label className="field">
                <span>Valor</span>
                <input value={editForm.value} onChange={(event) => setEditForm((current) => ({ ...current, value: event.target.value }))} type="number" min="0" step="0.01" required />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                  {dealStatusOptions.map((option) => (
                    <option key={option.value} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Atualizando..." : "Salvar negocio"}
              </button>
              <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                Excluir negocio
              </button>
            </form>
          ) : (
            <div className="empty-card">Selecione um negocio para editar.</div>
          )}
        </div>

        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Historico do negocio</h3>
              <p>Eventos registrados no backend</p>
            </div>
          </div>
          <div className="timeline">
            {history.map((item) => (
              <article key={item.id} className="timeline-item">
                <strong>{item.type}</strong>
                <p className="mono">{item.dataJson}</p>
                <span>{formatDate(item.occurredAtUtc)}</span>
              </article>
            ))}
            {selectedDeal && history.length === 0 ? <div className="empty-card">Sem historico encontrado.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
