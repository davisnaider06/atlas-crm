"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Automation, PagedResult, WhatsAppIntegration } from "@/lib/types";

const automationEvents = [
  { value: 1, label: "DealMoved" },
  { value: 2, label: "LeadCreated" },
  { value: 3, label: "ActivityCompleted" },
];

const whatsAppProviders = [
  { value: 1, label: "Evolution" },
  { value: 2, label: "MetaCloud" },
  { value: 3, label: "ZApi" },
];

const whatsAppStatus = [
  { value: 1, label: "Disconnected" },
  { value: 2, label: "Pending" },
  { value: 3, label: "Connected" },
];

export default function SettingsPage() {
  const { token, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [whatsApp, setWhatsApp] = useState<WhatsAppIntegration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [automationForm, setAutomationForm] = useState({
    name: "",
    eventType: "2",
    conditionJson: '{"source":"Instagram Ads"}',
    actionJson: '{"userIds":[2,3]}',
  });
  const [whatsAppForm, setWhatsAppForm] = useState({
    provider: "1",
    instanceName: "atlas-demo",
    phoneNumber: "",
    webhookUrl: "",
    apiBaseUrl: "",
    apiToken: "",
    captureLeadsEnabled: true,
    broadcastEnabled: true,
    status: "2",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [automationsResponse, whatsAppResponse] = await Promise.all([
        api.getAutomations(token),
        api.getWhatsAppIntegration(token),
      ]);
      setAutomations((automationsResponse as PagedResult<Automation>).items);
      setWhatsApp(whatsAppResponse);
      setWhatsAppForm({
        provider: String(whatsAppProviders.find((item) => item.label === whatsAppResponse.provider)?.value ?? 1),
        instanceName: whatsAppResponse.instanceName ?? "",
        phoneNumber: whatsAppResponse.phoneNumber ?? "",
        webhookUrl: whatsAppResponse.webhookUrl ?? "",
        apiBaseUrl: whatsAppResponse.apiBaseUrl ?? "",
        apiToken: "",
        captureLeadsEnabled: whatsAppResponse.captureLeadsEnabled,
        broadcastEnabled: whatsAppResponse.broadcastEnabled,
        status: String(whatsAppStatus.find((item) => item.label === whatsAppResponse.status)?.value ?? 1),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar configuracoes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAutomationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createAutomation(token, {
        name: automationForm.name,
        eventType: Number(automationForm.eventType),
        conditionJson: automationForm.conditionJson,
        actionJson: automationForm.actionJson,
        isActive: true,
      });
      setAutomationForm((current) => ({ ...current, name: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar automacao.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAutomation = async (id: number) => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteAutomation(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir automacao.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.saveWhatsAppIntegration(token, {
        provider: Number(whatsAppForm.provider),
        instanceName: whatsAppForm.instanceName,
        phoneNumber: whatsAppForm.phoneNumber,
        webhookUrl: whatsAppForm.webhookUrl || undefined,
        apiBaseUrl: whatsAppForm.apiBaseUrl || undefined,
        apiToken: whatsAppForm.apiToken || undefined,
        captureLeadsEnabled: whatsAppForm.captureLeadsEnabled,
        broadcastEnabled: whatsAppForm.broadcastEnabled,
        status: Number(whatsAppForm.status),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar integracao WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando configuracoes..." />;
  }

  if (error && automations.length === 0 && !whatsApp) {
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
            <h3>Aparencia</h3>
            <span className="tag">{theme === "light" ? "Light" : "Dark"}</span>
          </div>
          <p>Alterne entre modo claro e escuro quando quiser.</p>
          <button type="button" className="ghost-button inline-button" onClick={toggleTheme}>
            Trocar para modo {theme === "light" ? "escuro" : "claro"}
          </button>
        </article>

        <article className="settings-card">
          <div className="card-header">
            <h3>WhatsApp</h3>
            <span className="tag">{whatsApp?.status ?? "Disconnected"}</span>
          </div>
          <p>Conexao por QR, captura de lead e disparo em massa ficam no modulo dedicado.</p>
          <Link href="/whatsapp" className="ghost-button inline-link-button">
            Abrir modulo WhatsApp
          </Link>
        </article>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Automacoes existentes</h3>
              <p>Distribuicao e tarefas automaticas ja ativas no CRM</p>
            </div>
            <span className="tag">{automations.length} regras</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Evento</th>
                <th>Ativa</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((automation) => (
                <tr key={automation.id}>
                  <td>{automation.name}</td>
                  <td>{automation.eventType}</td>
                  <td>{automation.isActive ? "Sim" : "Nao"}</td>
                  <td>
                    <button type="button" className="table-action danger" onClick={() => void handleDeleteAutomation(automation.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleAutomationSubmit}>
          <div className="card-header">
            <div>
              <h3>Nova automacao</h3>
              <p>Exemplo: distribuir lead por round-robin</p>
            </div>
            <span className="tag">Lead routing</span>
          </div>

          <label className="field">
            <span>Nome</span>
            <input value={automationForm.name} onChange={(event) => setAutomationForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Evento</span>
            <select value={automationForm.eventType} onChange={(event) => setAutomationForm((current) => ({ ...current, eventType: event.target.value }))}>
              {automationEvents.map((eventOption) => (
                <option key={eventOption.value} value={eventOption.value}>
                  {eventOption.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Condicao JSON</span>
            <textarea value={automationForm.conditionJson} onChange={(event) => setAutomationForm((current) => ({ ...current, conditionJson: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Acao JSON</span>
            <textarea value={automationForm.actionJson} onChange={(event) => setAutomationForm((current) => ({ ...current, actionJson: event.target.value }))} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar automacao"}
          </button>
        </form>
      </section>

      <section className="two-column">
        <form className="settings-card form-card" onSubmit={handleWhatsAppSubmit}>
          <div className="card-header">
            <div>
              <h3>Base da integracao com WhatsApp</h3>
              <p>Esses dados alimentam a conexao QR e o disparo do modulo dedicado</p>
            </div>
            <span className="tag">{whatsApp?.provider ?? "Sem provedor"}</span>
          </div>

          <label className="field">
            <span>Provedor</span>
            <select value={whatsAppForm.provider} onChange={(event) => setWhatsAppForm((current) => ({ ...current, provider: event.target.value }))}>
              {whatsAppProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nome da instancia</span>
            <input value={whatsAppForm.instanceName} onChange={(event) => setWhatsAppForm((current) => ({ ...current, instanceName: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Numero</span>
            <input value={whatsAppForm.phoneNumber} onChange={(event) => setWhatsAppForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Webhook URL</span>
            <input value={whatsAppForm.webhookUrl} onChange={(event) => setWhatsAppForm((current) => ({ ...current, webhookUrl: event.target.value }))} />
          </label>
          <label className="field">
            <span>API Base URL</span>
            <input value={whatsAppForm.apiBaseUrl} onChange={(event) => setWhatsAppForm((current) => ({ ...current, apiBaseUrl: event.target.value }))} />
          </label>
          <label className="field">
            <span>API Token</span>
            <input value={whatsAppForm.apiToken} onChange={(event) => setWhatsAppForm((current) => ({ ...current, apiToken: event.target.value }))} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={whatsAppForm.captureLeadsEnabled} onChange={(event) => setWhatsAppForm((current) => ({ ...current, captureLeadsEnabled: event.target.checked }))} />
            <span>Capturar leads do WhatsApp</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={whatsAppForm.broadcastEnabled} onChange={(event) => setWhatsAppForm((current) => ({ ...current, broadcastEnabled: event.target.checked }))} />
            <span>Permitir disparos</span>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={whatsAppForm.status} onChange={(event) => setWhatsAppForm((current) => ({ ...current, status: event.target.value }))}>
              {whatsAppStatus.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar integracao"}
          </button>
        </form>

        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Fase 4 pronta para deploy</h3>
              <p>Entregas que fecham o comercial e a operacao</p>
            </div>
          </div>
          <div className="timeline">
            <article className="timeline-item">
              <strong>CRUD operacional completo</strong>
              <p>Leads, negocios, atividades e automacoes com criacao, edicao e exclusao.</p>
            </article>
            <article className="timeline-item">
              <strong>Dashboard com dado real</strong>
              <p>Graficos e cards puxando pipeline, origem de leads e atividade comercial.</p>
            </article>
            <article className="timeline-item">
              <strong>Modulo WhatsApp dedicado</strong>
              <p>Conexao por QR e campanha em massa por planilha em uma tela propria.</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
