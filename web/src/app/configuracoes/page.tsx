"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Automation, PagedResult } from "@/lib/types";

const automationEvents = [
  { value: 1, label: "DealMoved" },
  { value: 2, label: "LeadCreated" },
  { value: 3, label: "ActivityCompleted" },
];

export default function SettingsPage() {
  const { token, user } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eventType: "1",
    conditionJson: '{"stage":"Fechado"}',
    actionJson: '{"type":"create_task","name":"Iniciar onboarding"}',
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = (await api.getAutomations(token)) as PagedResult<Automation>;
      setAutomations(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar automacoes.");
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
      await api.createAutomation(token, {
        name: form.name,
        eventType: Number(form.eventType),
        conditionJson: form.conditionJson,
        actionJson: form.actionJson,
        isActive: true,
      });
      setForm((current) => ({ ...current, name: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar automacao.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando configuracoes..." />;
  }

  if (error && automations.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="settings-grid">
        <article className="settings-card">
          <div className="card-header">
            <h3>Usuario autenticado</h3>
            <span className="tag">{user?.role}</span>
          </div>
          <p>{user?.name}</p>
          <p>{user?.email}</p>
        </article>

        <article className="settings-card">
          <div className="card-header">
            <h3>Seguranca</h3>
            <span className="tag">JWT</span>
          </div>
          <p>Token persistido no frontend e enviado em cada chamada protegida.</p>
        </article>

        <article className="settings-card">
          <div className="card-header">
            <h3>Tenant</h3>
            <span className="tag">#{user?.companyId}</span>
          </div>
          <p>As consultas da API estao sendo filtradas pela empresa do usuario logado.</p>
        </article>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Automacoes existentes</h3>
              <p>Lista real do endpoint `/automacoes`</p>
            </div>
            <span className="tag">{automations.length} regras</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Evento</th>
                <th>Ativa</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((automation) => (
                <tr key={automation.id}>
                  <td>{automation.name}</td>
                  <td>{automation.eventType}</td>
                  <td>{automation.isActive ? "Sim" : "Nao"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Nova automacao</h3>
              <p>Motor inicial de evento + condicao + acao</p>
            </div>
            <span className="tag">POST /automacoes</span>
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
            <span>Evento</span>
            <select
              value={form.eventType}
              onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}
            >
              {automationEvents.map((eventOption) => (
                <option key={eventOption.value} value={eventOption.value}>
                  {eventOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Condicao JSON</span>
            <textarea
              value={form.conditionJson}
              onChange={(event) =>
                setForm((current) => ({ ...current, conditionJson: event.target.value }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Acao JSON</span>
            <textarea
              value={form.actionJson}
              onChange={(event) => setForm((current) => ({ ...current, actionJson: event.target.value }))}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar automacao"}
          </button>
        </form>
      </section>
    </div>
  );
}
