"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import { DEAL_STATUS_OPTIONS } from "@/lib/constants";
import type { Deal, HistoryItem, Lead, PagedResult, Pipeline } from "@/lib/types";

export default function PipelinePage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ leadId: "", stageId: "", value: "" });
  const [editForm, setEditForm] = useState({ value: "", status: "Open" });

  const canCreate = hasPermission(user, permissions.dealsCreate);
  const canEdit = hasPermission(user, permissions.dealsEdit);
  const canDelete = hasPermission(user, permissions.dealsDelete);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, pipelinesRes, leadsRes] = await Promise.all([
        api.getDeals(token, { search: search || undefined }),
        api.getPipelines(token),
        api.getLeads(token),
      ]);
      const dealItems = (dealsRes as PagedResult<Deal>).items;
      setDeals(dealItems);
      setPipelines(pipelinesRes);
      setLeads((leadsRes as PagedResult<Lead>).items);
      setSelectedDeal((cur) => cur ? dealItems.find((d) => d.id === cur.id) ?? null : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar pipeline.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro ao carregar pipeline" });
    } finally {
      setLoading(false);
    }
  }, [token, search, notify]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!token || !selectedDeal) { setHistory([]); return; }
    setEditForm({ value: String(selectedDeal.value), status: selectedDeal.status });
    void api.getHistory(token, { dealId: selectedDeal.id }).then(setHistory).catch(() => setHistory([]));
  }, [selectedDeal, token]);

  const stages = useMemo(() => pipelines.flatMap((p) => p.stages), [pipelines]);
  const grouped = useMemo(
    () => stages.map((stage) => ({ ...stage, deals: deals.filter((d) => d.stageId === stage.id) })),
    [deals, stages],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.createDeal(token, {
        leadId: Number(form.leadId),
        stageId: Number(form.stageId),
        value: Number(form.value),
      });
      setForm({ leadId: "", stageId: "", value: "" });
      await load();
      notify({ type: "success", message: "Negócio criado.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar negócio.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDeal) return;
    setSubmitting(true);
    try {
      const statusVal = DEAL_STATUS_OPTIONS.find((o) => o.label === editForm.status)?.value ?? 1;
      await api.updateDeal(token, selectedDeal.id, {
        value: Number(editForm.value),
        status: statusVal,
        ownerUserId: selectedDeal.ownerUserId ?? null,
      });
      await load();
      notify({ type: "success", message: "Negócio atualizado.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar negócio.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (dealId: number, stageId: number) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.moveDeal(token, dealId, { stageId, status: 1 });
      await load();
      notify({ type: "success", message: "Negócio movido.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao mover negócio.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedDeal) return;
    setSubmitting(true);
    try {
      await api.deleteDeal(token, selectedDeal.id);
      setSelectedDeal(null);
      setHistory([]);
      await load();
      notify({ type: "success", message: "Negócio excluído.", title: "Excluído" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir negócio.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando pipeline..." />;
  if (error && deals.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar negócio</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lead ou etapa" />
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
              <p>Movimentação manual entre etapas</p>
            </div>
            <span className="tag">{deals.length} negócios</span>
          </div>

          <div className="kanban-board">
            {grouped.map((stage) => (
              <div key={stage.id} className="kanban-column">
                <header>
                  <strong>{stage.name}</strong>
                  <span>{stage.deals.length}</span>
                </header>

                {stage.deals.map((deal) => (
                  <article
                    key={deal.id}
                    className={`kanban-card selectable-card${selectedDeal?.id === deal.id ? " row-active" : ""}`}
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <strong>{deal.leadName}</strong>
                    <span>{formatCurrency(deal.value)}</span>
                    <small>{deal.status}</small>
                    <select
                      value={deal.stageId}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => void handleMove(deal.id, Number(e.target.value))}
                      disabled={!canEdit || submitting}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </article>
                ))}

                {stage.deals.length === 0 && (
                  <div className="empty-card">Sem negócios nesta etapa.</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {canCreate && (
          <form className="settings-card form-card" onSubmit={handleCreate}>
            <div className="card-header">
              <div>
                <h3>Novo negócio</h3>
                <p>Cria item no funil</p>
              </div>
              <span className="tag">Novo</span>
            </div>

            <label className="field">
              <span>Lead</span>
              <select value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))} required>
                <option value="">Selecione um lead</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Etapa</span>
              <select value={form.stageId} onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))} required>
                <option value="">Selecione uma etapa</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} required />
            </label>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar negócio"}
            </button>
          </form>
        )}
      </section>

      <section className="two-column">
        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>{selectedDeal ? "Editar negócio" : "Selecione um negócio"}</h3>
              <p>{selectedDeal ? selectedDeal.leadName : "Clique em um card do pipeline"}</p>
            </div>
          </div>

          {selectedDeal ? (
            <form className="form-card" onSubmit={handleUpdate}>
              <label className="field">
                <span>Valor</span>
                <input value={editForm.value} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} type="number" min="0" step="0.01" required />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                  {DEAL_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.label}>{o.label}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={submitting || !canEdit}>
                {submitting ? "Atualizando..." : "Salvar negócio"}
              </button>
              {canDelete && (
                <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                  Excluir negócio
                </button>
              )}
            </form>
          ) : (
            <div className="empty-card">Selecione um negócio para editar.</div>
          )}
        </div>

        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Histórico do negócio</h3>
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
            {selectedDeal && history.length === 0 && (
              <div className="empty-card">Sem histórico encontrado.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
