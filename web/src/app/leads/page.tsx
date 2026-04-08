"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { HistoryItem, Lead, PagedResult } from "@/lib/types";

const leadStatusOptions = [
  { value: 1, label: "New" },
  { value: 2, label: "Contacted" },
  { value: 3, label: "Qualified" },
  { value: 4, label: "Lost" },
  { value: 5, label: "Converted" },
];

export default function LeadsPage() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    status: "1",
  });

  const editForm = useMemo(
    () => ({
      name: selectedLead?.name ?? "",
      email: selectedLead?.email ?? "",
      phone: selectedLead?.phone ?? "",
      source: selectedLead?.source ?? "",
      status: selectedLead?.status ?? "New",
    }),
    [selectedLead],
  );
  const [editState, setEditState] = useState(editForm);

  useEffect(() => {
    setEditState(editForm);
  }, [editForm]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = (await api.getLeads(token, {
        search: search || undefined,
        status: statusFilter || undefined,
      })) as PagedResult<Lead>;
      setLeads(response.items);
      if (selectedLead) {
        setSelectedLead(response.items.find((item) => item.id === selectedLead.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedLead, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !selectedLead) {
      setHistory([]);
      return;
    }

    void api.getHistory(token, { leadId: selectedLead.id }).then(setHistory).catch(() => setHistory([]));
  }, [selectedLead, token]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createLead(token, {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        source: form.source,
        status: Number(form.status),
      });
      setForm({ name: "", email: "", phone: "", source: "", status: "1" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar lead.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedLead) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const matchedStatus = leadStatusOptions.find((option) => option.label === editState.status)?.value ?? 1;
      await api.updateLead(token, selectedLead.id, {
        name: editState.name,
        email: editState.email || undefined,
        phone: editState.phone || undefined,
        source: editState.source,
        status: matchedStatus,
        ownerUserId: selectedLead.ownerUserId ?? null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar lead.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando leads..." />;
  }

  if (error && leads.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, email ou telefone" />
        </label>
        <label className="field compact">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos</option>
            {leadStatusOptions.map((option) => (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar filtros
        </button>
      </section>

      <section className="three-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Leads do tenant</h3>
              <p>Busca, filtro e selecao para edicao</p>
            </div>
            <span className="tag">{leads.length} itens</span>
          </div>

          <table className="table clickable-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={selectedLead?.id === lead.id ? "row-active" : ""}
                  onClick={() => setSelectedLead(lead)}
                >
                  <td>{lead.name}</td>
                  <td>{lead.source}</td>
                  <td>{lead.status}</td>
                  <td>{formatDate(lead.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <h3>Novo lead</h3>
              <p>Entrada comercial</p>
            </div>
            <span className="tag">Criacao</span>
          </div>

          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label className="field">
            <span>Telefone</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="field">
            <span>Origem</span>
            <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {leadStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar lead"}
          </button>
        </form>

        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>{selectedLead ? "Editar lead" : "Historico"}</h3>
              <p>{selectedLead ? "Atualizacao do lead selecionado" : "Selecione um lead na lista"}</p>
            </div>
            {selectedLead ? <span className="tag">#{selectedLead.id}</span> : null}
          </div>

          {selectedLead ? (
            <>
              <form className="form-card" onSubmit={handleUpdate}>
                <label className="field">
                  <span>Nome</span>
                  <input value={editState.name} onChange={(event) => setEditState((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input value={editState.email} onChange={(event) => setEditState((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input value={editState.phone} onChange={(event) => setEditState((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Origem</span>
                  <input value={editState.source} onChange={(event) => setEditState((current) => ({ ...current, source: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select value={editState.status} onChange={(event) => setEditState((current) => ({ ...current, status: event.target.value }))}>
                    {leadStatusOptions.map((option) => (
                      <option key={option.value} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Atualizando..." : "Salvar alteracoes"}
                </button>
              </form>

              <div className="timeline">
                {history.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <strong>{item.type}</strong>
                    <p className="mono">{item.dataJson}</p>
                    <span>{formatDate(item.occurredAtUtc)}</span>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-card">Selecione um lead para editar e ver historico.</div>
          )}
        </div>
      </section>
    </div>
  );
}
