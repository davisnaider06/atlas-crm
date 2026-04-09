"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { read, utils } from "xlsx";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type {
  WhatsAppCampaignRecipient,
  WhatsAppCampaignResult,
  WhatsAppConnectionSession,
  WhatsAppIntegration,
} from "@/lib/types";

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

export default function WhatsAppPage() {
  const { token, user } = useAuth();
  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [session, setSession] = useState<WhatsAppConnectionSession | null>(null);
  const [campaignResult, setCampaignResult] = useState<WhatsAppCampaignResult | null>(null);
  const [recipients, setRecipients] = useState<WhatsAppCampaignRecipient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
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
  const [campaignMessage, setCampaignMessage] = useState("Oi {{nome}}, tudo bem? Quero te apresentar nossa proposta.");

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [integrationResponse, sessionResponse] = await Promise.all([
        api.getWhatsAppIntegration(token),
        api.getWhatsAppSession(token).catch(() => null),
      ]);

      setIntegration(integrationResponse);
      setSession(sessionResponse);
      setForm({
        provider: String(whatsAppProviders.find((item) => item.label === integrationResponse.provider)?.value ?? 1),
        instanceName: integrationResponse.instanceName ?? "atlas-demo",
        phoneNumber: integrationResponse.phoneNumber ?? "",
        webhookUrl: integrationResponse.webhookUrl ?? "",
        apiBaseUrl: integrationResponse.apiBaseUrl ?? "",
        apiToken: "",
        captureLeadsEnabled: integrationResponse.captureLeadsEnabled,
        broadcastEnabled: integrationResponse.broadcastEnabled,
        status: String(whatsAppStatus.find((item) => item.label === integrationResponse.status)?.value ?? 1),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar modulo WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const webhookPreview = useMemo(() => {
    if (typeof window === "undefined" || !integration?.id) {
      return "";
    }

    const companyId = user?.companyId ?? 1;
    return `${window.location.origin.replace(":3000", ":8080")}/whatsapp/webhook/${companyId}`;
  }, [integration?.id, user?.companyId]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.saveWhatsAppIntegration(token, {
        provider: Number(form.provider),
        instanceName: form.instanceName,
        phoneNumber: form.phoneNumber,
        webhookUrl: form.webhookUrl || undefined,
        apiBaseUrl: form.apiBaseUrl || undefined,
        apiToken: form.apiToken || undefined,
        captureLeadsEnabled: form.captureLeadsEnabled,
        broadcastEnabled: form.broadcastEnabled,
        status: Number(form.status),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configuracao do WhatsApp.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!token) {
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      const response = await api.connectWhatsApp(token);
      setSession(response);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar QR Code.");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshSession = async () => {
    if (!token) {
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      const response = await api.getWhatsAppSession(token);
      setSession(response);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar sessao.");
    } finally {
      setConnecting(false);
    }
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    const mappedRecipients = rows
      .map((row) => ({
        name: String(row.nome ?? row.name ?? row.Nome ?? "").trim(),
        phoneNumber: String(row.telefone ?? row.phone ?? row.Telefone ?? row.celular ?? "").trim(),
      }))
      .filter((row) => row.name && row.phoneNumber);

    setRecipients(mappedRecipients);
  };

  const handleSendCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSending(true);
    setError(null);
    setCampaignResult(null);
    try {
      const response = await api.sendWhatsAppCampaign(token, {
        message: campaignMessage,
        recipients,
      });
      setCampaignResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao disparar campanha.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando modulo WhatsApp..." />;
  }

  if (error && !integration) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="two-column">
        <form className="settings-card form-card" onSubmit={handleSave}>
          <div className="card-header">
            <div>
              <h3>Conectar WhatsApp</h3>
              <p>Configure a instancia, salve e gere o QR Code para logar como no WhatsApp Web.</p>
            </div>
            <span className="tag">{integration?.status ?? "Disconnected"}</span>
          </div>

          <label className="field">
            <span>Provedor</span>
            <select value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}>
              {whatsAppProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nome da instancia</span>
            <input value={form.instanceName} onChange={(event) => setForm((current) => ({ ...current, instanceName: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Numero principal</span>
            <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
          </label>
          <label className="field">
            <span>API Base URL</span>
            <input value={form.apiBaseUrl} onChange={(event) => setForm((current) => ({ ...current, apiBaseUrl: event.target.value }))} placeholder="https://sua-evolution-api/" />
          </label>
          <label className="field">
            <span>API Token</span>
            <input value={form.apiToken} onChange={(event) => setForm((current) => ({ ...current, apiToken: event.target.value }))} placeholder="apikey da Evolution API" />
          </label>
          <label className="field">
            <span>Webhook URL</span>
            <input value={form.webhookUrl} onChange={(event) => setForm((current) => ({ ...current, webhookUrl: event.target.value }))} placeholder={webhookPreview || "http://api/whatsapp/webhook/empresa"} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.captureLeadsEnabled} onChange={(event) => setForm((current) => ({ ...current, captureLeadsEnabled: event.target.checked }))} />
            <span>Capturar leads a partir das mensagens recebidas</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.broadcastEnabled} onChange={(event) => setForm((current) => ({ ...current, broadcastEnabled: event.target.checked }))} />
            <span>Permitir disparos em massa</span>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {whatsAppStatus.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Salvando..." : "Salvar configuracao"}
          </button>
        </form>

        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>QR Code de conexao</h3>
              <p>Depois de salvar a instancia, gere o QR e escaneie com o seu WhatsApp.</p>
            </div>
            <span className="tag">{session?.status ?? integration?.status ?? "Pending"}</span>
          </div>

          <div className="qr-panel">
            {session?.qrCodeBase64 ? (
              <img
                className="qr-image"
                src={`data:image/png;base64,${session.qrCodeBase64}`}
                alt="QR Code para conectar WhatsApp"
              />
            ) : (
              <div className="qr-placeholder">
                <strong>QR ainda nao gerado</strong>
                <p>Salve a integracao e clique em gerar QR Code.</p>
              </div>
            )}
          </div>

          <div className="session-meta">
            <div>
              <strong>Instancia</strong>
              <span>{session?.instanceName ?? integration?.instanceName ?? "-"}</span>
            </div>
            <div>
              <strong>Status</strong>
              <span>{session?.status ?? integration?.status ?? "-"}</span>
            </div>
            <div>
              <strong>Numero conectado</strong>
              <span>{session?.phoneNumber ?? integration?.phoneNumber ?? "-"}</span>
            </div>
          </div>

          <div className="inline-actions">
            <button type="button" className="primary-button" onClick={() => void handleConnect()} disabled={connecting}>
              {connecting ? "Gerando..." : "Gerar QR Code"}
            </button>
            <button type="button" className="ghost-button" onClick={() => void handleRefreshSession()} disabled={connecting}>
              Atualizar status
            </button>
          </div>
        </div>
      </section>

      <section className="two-column">
        <form className="settings-card form-card" onSubmit={handleSendCampaign}>
          <div className="card-header">
            <div>
              <h3>Campanha em massa por planilha</h3>
              <p>Suba um Excel com colunas `nome` e `telefone`, escreva a mensagem e dispare.</p>
            </div>
            <span className="tag">{recipients.length} contatos</span>
          </div>

          <label className="field">
            <span>Importar planilha</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void handleFileImport(event)} />
          </label>
          <label className="field">
            <span>Mensagem</span>
            <textarea value={campaignMessage} onChange={(event) => setCampaignMessage(event.target.value)} required />
          </label>
          <button type="submit" className="primary-button" disabled={sending || recipients.length === 0}>
            {sending ? "Enviando..." : "Enviar campanha"}
          </button>
        </form>

        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Contatos importados</h3>
              <p>Preview do que vai sair na campanha.</p>
            </div>
            {campaignResult ? <span className="tag">{campaignResult.sentCount} enviados</span> : null}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient) => {
                const dispatch = campaignResult?.results.find((item) => item.phoneNumber === recipient.phoneNumber);
                return (
                  <tr key={`${recipient.phoneNumber}-${recipient.name}`}>
                    <td>{recipient.name}</td>
                    <td>{recipient.phoneNumber}</td>
                    <td>{dispatch ? (dispatch.success ? "Enviado" : dispatch.error ?? "Falhou") : "Pendente"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
