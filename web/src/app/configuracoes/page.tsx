"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { Select } from "@/components/ui/select";
import { useNotification } from "@/components/ui/notification-context";
import { AUTOMATION_EVENT_OPTIONS, INTERACTION_CHANNEL_OPTIONS } from "@/lib/constants";
import { CUSTOM_FIELD_TYPE_OPTIONS, customFieldTypeLabels } from "@/lib/custom-fields";
import type { Automation, CustomFieldDef, PagedResult, Script } from "@/lib/types";

const automationPresets = [
  {
    value: "roundRobin",
    label: "Distribuir leads entre vendedores",
    eventType: "2",
    conditionJson: '{"source":"any"}',
    actionJson: '{"userIds":[2,3]}',
  },
  {
    value: "createTask",
    label: "Criar tarefa para novo lead",
    eventType: "2",
    conditionJson: '{"source":"any"}',
    actionJson: '{"createTask":true,"taskDescription":"Fazer primeiro contato com o lead"}',
  },
  {
    value: "assignOwner",
    label: "Atribuir lead para um responsável",
    eventType: "2",
    conditionJson: '{"status":"New"}',
    actionJson: '{"assignOwnerUserId":2}',
  },
  {
    value: "dealMoved",
    label: "Registrar automação quando negócio muda de etapa",
    eventType: "1",
    conditionJson: '{"stage":"Fechado"}',
    actionJson: '{"type":"log","message":"Negócio movido para etapa importante"}',
  },
];

export default function SettingsPage() {
  const { token, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useNotification();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [automationForm, setAutomationForm] = useState({
    preset: "roundRobin",
    name: "",
    eventType: "2",
    conditionJson: '{"source":"any"}',
    actionJson: '{"userIds":[2,3]}',
  });
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [fieldForm, setFieldForm] = useState({ name: "", type: "1", options: "" });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptForm, setScriptForm] = useState({ name: "", channel: "", body: "" });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAutomations(token);
      setAutomations((res as PagedResult<Automation>).items);
      const fields = await api.getCustomFields(token, "Lead").catch(() => []);
      setCustomFields(fields);
      const scriptList = await api.getScripts(token).catch(() => []);
      setScripts(scriptList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar configurações.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro ao carregar configurações" });
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { void load(); }, [load]);

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.createAutomation(token, {
        name: automationForm.name,
        eventType: Number(automationForm.eventType),
        conditionJson: automationForm.conditionJson,
        actionJson: automationForm.actionJson,
        isActive: true,
      });
      setAutomationForm((f) => ({ ...f, name: "" }));
      await load();
      notify({ type: "success", message: "Automação criada.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar automação.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresetChange = (value: string) => {
    const preset = automationPresets.find((p) => p.value === value) ?? automationPresets[0];
    setAutomationForm((f) => ({
      ...f,
      preset: preset.value,
      eventType: preset.eventType,
      conditionJson: preset.conditionJson,
      actionJson: preset.actionJson,
      name: f.name || preset.label,
    }));
  };

  const handleDeleteAutomation = async (id: number) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.deleteAutomation(token, id);
      await load();
      notify({ type: "success", message: "Automação excluída.", title: "Excluída" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir automação.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.createCustomField(token, {
        target: 1,
        name: fieldForm.name,
        type: Number(fieldForm.type),
        options: fieldForm.options
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean),
      });
      setFieldForm({ name: "", type: "1", options: "" });
      await load();
      notify({ type: "success", message: "Campo personalizado criado.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar campo.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.deleteCustomField(token, id);
      await load();
      notify({ type: "success", message: "Campo excluído.", title: "Excluído" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir campo.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.createScript(token, {
        name: scriptForm.name,
        channel: scriptForm.channel || null,
        body: scriptForm.body || null,
        isActive: true,
      });
      setScriptForm({ name: "", channel: "", body: "" });
      await load();
      notify({ type: "success", message: "Script criado.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar script.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.deleteScript(token, id);
      await load();
      notify({ type: "success", message: "Script excluído.", title: "Excluído" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir script.";
      notify({ type: "error", message: msg, title: "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando configurações..." />;
  if (error && automations.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="settings-grid">
        <article className="settings-card">
          <div className="card-header">
            <h3>Usuário autenticado</h3>
            <span className="tag">{user?.role}</span>
          </div>
          <p>{user?.name}</p>
          <p>{user?.email}</p>
        </article>

        <article className="settings-card">
          <div className="card-header">
            <h3>Aparência</h3>
            <span className="tag">{theme === "light" ? "Claro" : "Escuro"}</span>
          </div>
          <p>Alterne entre modo claro e escuro quando quiser.</p>
          <button type="button" className="ghost-button inline-button" onClick={toggleTheme}>
            Trocar para modo {theme === "light" ? "escuro" : "claro"}
          </button>
        </article>

        <article className="settings-card">
          <div className="card-header">
            <h3>WhatsApp</h3>
          </div>
          <p>Conexão por QR, captura de lead e disparo em massa ficam no módulo dedicado.</p>
          <Link href="/whatsapp" className="ghost-button inline-link-button">
            Abrir módulo WhatsApp
          </Link>
        </article>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Automações existentes</h3>
              <p>Distribuição e tarefas automáticas já ativas no CRM</p>
            </div>
            <span className="tag">{automations.length} regras</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Evento</th>
                <th>Ativa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.eventType}</td>
                  <td>{a.isActive ? "Sim" : "Não"}</td>
                  <td>
                    <button type="button" className="table-action danger" onClick={() => void handleDeleteAutomation(a.id)} disabled={submitting}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {automations.length === 0 && <div className="empty-card">Nenhuma automação configurada ainda.</div>}
        </div>

        <form className="settings-card form-card" onSubmit={handleAutomationSubmit}>
          <div className="card-header">
            <div>
              <h3>Nova automação</h3>
              <p>Exemplo: distribuir lead por round-robin</p>
            </div>
            <span className="tag">Lead routing</span>
          </div>

          <label className="field">
            <span>Modelo</span>
            <Select
              value={automationForm.preset}
              onChange={(value) => handlePresetChange(value)}
              options={automationPresets.map((p) => ({ value: p.value, label: p.label }))}
            />
          </label>
          <label className="field">
            <span>Nome</span>
            <input value={automationForm.name} onChange={(e) => setAutomationForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Evento</span>
            <Select
              value={automationForm.eventType}
              onChange={(value) => setAutomationForm((f) => ({ ...f, eventType: value }))}
              options={AUTOMATION_EVENT_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </label>
          <label className="field">
            <span>Condição JSON</span>
            <textarea value={automationForm.conditionJson} onChange={(e) => setAutomationForm((f) => ({ ...f, conditionJson: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Ação JSON</span>
            <textarea value={automationForm.actionJson} onChange={(e) => setAutomationForm((f) => ({ ...f, actionJson: e.target.value }))} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar automação"}
          </button>
        </form>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Campos personalizados de lead</h3>
              <p>Informações extras que aparecem no cadastro e na edição de leads</p>
            </div>
            <span className="tag">{customFields.length} campos</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Opções</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customFields.map((field) => (
                <tr key={field.id}>
                  <td>{field.name}</td>
                  <td>{customFieldTypeLabels[field.type] ?? field.type}</td>
                  <td>{field.options.length > 0 ? field.options.join(", ") : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="table-action danger"
                      onClick={() => void handleDeleteField(field.id)}
                      disabled={submitting}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customFields.length === 0 && (
            <div className="empty-card">Nenhum campo personalizado ainda. Crie o primeiro ao lado.</div>
          )}
        </div>

        <form className="settings-card form-card" onSubmit={handleCreateField}>
          <div className="card-header">
            <div>
              <h3>Novo campo personalizado</h3>
              <p>Adapte o CRM ao seu processo, sem código</p>
            </div>
            <span className="tag">Flexível</span>
          </div>

          <label className="field">
            <span>Nome do campo</span>
            <input
              value={fieldForm.name}
              onChange={(e) => setFieldForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex.: Segmento, CNPJ, Nº de funcionários"
              required
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <Select
              value={fieldForm.type}
              onChange={(value) => setFieldForm((f) => ({ ...f, type: value }))}
              options={CUSTOM_FIELD_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </label>
          {fieldForm.type === "4" ? (
            <label className="field">
              <span>Opções (separadas por vírgula)</span>
              <input
                value={fieldForm.options}
                onChange={(e) => setFieldForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Ex.: Varejo, Indústria, Serviços"
                required
              />
            </label>
          ) : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar campo"}
          </button>
        </form>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Biblioteca de scripts</h3>
              <p>Abordagens reutilizáveis. A taxa de resposta mostra o que funciona.</p>
            </div>
            <span className="tag">{scripts.length} scripts</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Canal</th>
                <th>Usos</th>
                <th>Resposta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.channel || "—"}</td>
                  <td>{s.usageCount}</td>
                  <td>{s.usageCount > 0 ? `${Math.round(s.replyRate * 100)}%` : "—"}</td>
                  <td>
                    <button type="button" className="table-action danger" onClick={() => void handleDeleteScript(s.id)} disabled={submitting}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scripts.length === 0 && (
            <div className="empty-card">Nenhum script cadastrado. Crie o primeiro ao lado.</div>
          )}
        </div>

        <form className="settings-card form-card" onSubmit={handleCreateScript}>
          <div className="card-header">
            <div>
              <h3>Novo script</h3>
              <p>Modelo de mensagem ou roteiro de ligação</p>
            </div>
            <span className="tag">Prospecção</span>
          </div>

          <label className="field">
            <span>Nome</span>
            <input
              value={scriptForm.name}
              onChange={(e) => setScriptForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex.: Abordagem fria Instagram"
              required
            />
          </label>
          <label className="field">
            <span>Canal sugerido</span>
            <Select
              value={scriptForm.channel}
              onChange={(value) => setScriptForm((f) => ({ ...f, channel: value }))}
              placeholder="Opcional"
              options={INTERACTION_CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </label>
          <label className="field">
            <span>Conteúdo do script</span>
            <textarea
              value={scriptForm.body}
              onChange={(e) => setScriptForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Texto do modelo / roteiro"
            />
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar script"}
          </button>
        </form>
      </section>
    </div>
  );
}
