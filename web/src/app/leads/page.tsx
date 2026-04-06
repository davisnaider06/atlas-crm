"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Lead, PagedResult } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    status: "1",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = (await api.getLeads(token)) as PagedResult<Lead>;
      setLeads(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar leads.");
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

  if (loading) {
    return <LoadingState label="Carregando leads..." />;
  }

  if (error && leads.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Leads do tenant</h3>
              <p>Listagem real da API com isolamento por empresa</p>
            </div>
            <span className="tag">{leads.length} itens</span>
          </div>

          <table className="table">
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
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.source}</td>
                  <td>{lead.status}</td>
                  <td>{formatDate(lead.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Novo lead</h3>
              <p>Escreve direto no endpoint `POST /leads`</p>
            </div>
            <span className="tag">Criacao</span>
          </div>

          <label className="field">
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Origem</span>
            <input
              value={form.source}
              onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
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
      </section>
    </div>
  );
}
