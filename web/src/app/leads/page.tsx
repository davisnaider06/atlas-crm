"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import type { HistoryItem, Lead, LeadOwner, PagedResult, Pipeline } from "@/lib/types";

const leadStatusOptions = [
  { value: 1, label: "New" },
  { value: 2, label: "Contacted" },
  { value: 3, label: "Qualified" },
  { value: 4, label: "Lost" },
  { value: 5, label: "Converted" },
  { value: 6, label: "MessageSent" },
  { value: 7, label: "FollowUp" },
  { value: 8, label: "InNegotiation" },
  { value: 9, label: "MeetingScheduled" },
];

const leadStatusLabels: Record<string, string> = {
  New: "Novo",
  Contacted: "Contato feito",
  Qualified: "Qualificado",
  Lost: "Perdido",
  Converted: "Convertido",
  MessageSent: "Mensagem enviada",
  FollowUp: "Fazer follow-up",
  InNegotiation: "Em negociação",
  MeetingScheduled: "Reunião marcada",
};

const statusTones: Record<string, string> = {
  New: "orange",
  Contacted: "blue",
  Qualified: "gold",
  Lost: "danger",
  Converted: "success",
  MessageSent: "orange",
  FollowUp: "gold",
  InNegotiation: "warning",
  MeetingScheduled: "blue",
};

const qualificationLabels: Record<string, string> = {
  Hot: "Quente",
  Warm: "Morno",
  Cold: "Frio",
  Unqualified: "Sem fit",
};

const qualificationTones: Record<string, string> = {
  Hot: "danger",
  Warm: "gold",
  Cold: "blue",
  Unqualified: "muted",
};

const qualificationValues: Record<string, number> = {
  Unqualified: 1,
  Cold: 2,
  Warm: 3,
  Hot: 4,
};

const eventTypeLabels: Record<string, string> = {
  LeadCreated: "Lead criado",
  LeadUpdated: "Dados atualizados",
  LeadStatusChanged: "Status alterado",
  LeadConverted: "Convertido em cliente",
  CustomerCreated: "Cliente criado",
  DealCreated: "Negócio criado",
  ActivityCreated: "Atividade registrada",
  ActivityUpdated: "Atividade atualizada",
};

function formatHistoryDetail(item: HistoryItem): string {
  try {
    const data = JSON.parse(item.dataJson) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof data.status === "string") {
      parts.push(leadStatusLabels[data.status] ?? data.status);
    }
    if (typeof data.value === "number") {
      parts.push(`R$ ${data.value.toLocaleString("pt-BR")}`);
    }
    if (typeof data.name === "string") {
      parts.push(data.name);
    }
    return parts.join(" · ");
  } catch {
    return "";
  }
}

export default function LeadsPage() {
  const { token, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [conversionForm, setConversionForm] = useState({
    reason: "",
    dealValue: "",
    pipelineId: "",
    stageId: "",
  });
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    status: "6",
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

  const groupedLeads = useMemo(
    () =>
      leadStatusOptions.map((status) => ({
        ...status,
        items: leads.filter((lead) => lead.status === status.label),
      })),
    [leads],
  );

  const leadMetrics = useMemo(
    () => ({
      total: leads.length,
      qualified: leads.filter((lead) => lead.status === "Qualified").length,
      converted: leads.filter((lead) => lead.status === "Converted").length,
      lost: leads.filter((lead) => lead.status === "Lost").length,
    }),
    [leads],
  );
  const ownerMetrics = useMemo(
    () =>
      owners.map((owner) => ({
        ...owner,
        visibleLeadCount: leads.filter((lead) => lead.ownerUserId === owner.id).length,
      })),
    [leads, owners],
  );
  const conversionChecklist = useMemo(
    () =>
      !selectedLead
        ? []
        : [
            { label: "Contato registrado (email ou telefone)", ok: !!(selectedLead.email || selectedLead.phone) },
            { label: "Temperatura de qualificação definida", ok: selectedLead.qualificationTemperature !== "Unqualified" },
            { label: "Tem histórico de interações", ok: history.length > 0 },
            { label: "Score de qualificação acima de zero", ok: selectedLead.qualificationScore > 0 },
          ],
    [selectedLead, history],
  );

  const availableStages = useMemo(() => {
    const found = pipelines.find((p) => String(p.id) === conversionForm.pipelineId);
    return found?.stages ?? [];
  }, [pipelines, conversionForm.pipelineId]);

  const canCreate = hasPermission(user, permissions.leadsCreate);
  const canEdit = hasPermission(user, permissions.leadsEdit);
  const canDelete = hasPermission(user, permissions.leadsDelete);
  const canCreateCustomer = hasPermission(user, permissions.customersCreate);

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
        ownerUserId: ownerFilter ? Number(ownerFilter) : undefined,
      })) as PagedResult<Lead>;
      setLeads(response.items);
      const ownerResponse = await api.getLeadOwners(token);
      setOwners(ownerResponse);
      setSelectedLead((current) => current ? response.items.find((item) => item.id === current.id) ?? null : null);
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao carregar leads.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para ver leads." : message, title: status === 403 ? "Permissao negada" : "Erro ao carregar leads" });
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, ownerFilter, notify]);

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
      setCreateModalOpen(false);
      await load();
      notify({ type: "success", message: "Lead criado com sucesso.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao criar lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para criar leads." : message, title: status === 403 ? "Permissao negada" : "Erro ao criar lead" });
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
        qualificationTemperature: qualificationValues[selectedLead.qualificationTemperature] ?? 2,
        qualificationScore: selectedLead.qualificationScore ?? 0,
        qualificationNotes: selectedLead.qualificationNotes ?? null,
        ownerUserId: selectedLead.ownerUserId ?? null,
      });
      await load();
      notify({ type: "success", message: "Lead atualizado.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao atualizar lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para editar leads." : message, title: status === 403 ? "Permissao negada" : "Erro ao atualizar lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedLead) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteLead(token, selectedLead.id);
      setSelectedLead(null);
      setHistory([]);
      await load();
      notify({ type: "success", message: "Lead excluido.", title: "Excluido" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao excluir lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para excluir leads." : message, title: status === 403 ? "Permissao negada" : "Erro ao excluir lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveLead = async (lead: Lead, statusValue: number) => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.updateLead(token, lead.id, {
        name: lead.name,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        source: lead.source,
        status: statusValue,
        qualificationTemperature: qualificationValues[lead.qualificationTemperature] ?? 2,
        qualificationScore: lead.qualificationScore ?? 0,
        qualificationNotes: lead.qualificationNotes ?? null,
        ownerUserId: lead.ownerUserId ?? null,
      });
      await load();
      notify({ type: "success", message: "Lead movido com sucesso.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao mover lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para editar leads." : message, title: status === 403 ? "Permissao negada" : "Erro ao mover lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenConvertModal = () => {
    if (!selectedLead) return;
    setError(null);
    if (token && pipelines.length === 0) {
      void api.getPipelines(token).then(setPipelines).catch(() => {});
    }
    setConvertModalOpen(true);
  };

  const handleConvertToCustomer = async () => {
    if (!token || !selectedLead) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.convertLeadToCustomer(token, selectedLead.id);

      if (conversionForm.dealValue && conversionForm.stageId) {
        await api.createDeal(token, {
          leadId: selectedLead.id,
          stageId: Number(conversionForm.stageId),
          value: Number(conversionForm.dealValue),
          ownerUserId: selectedLead.ownerUserId ?? undefined,
        });
      }

      setConvertModalOpen(false);
      setConversionForm({ reason: "", dealValue: "", pipelineId: "", stageId: "" });
      setSelectedLead(null);
      await load();
      notify({ type: "success", message: "Lead convertido em cliente.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao converter lead em cliente.";
      setError(message);
      notify({
        type: "error",
        message: status === 403 ? "Você não tem permissão para converter leads." : message,
        title: status === 403 ? "Permissão negada" : "Erro ao converter lead",
      });
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
      <section className="lead-command-card">
        <div>
          <p className="eyebrow">Central de leads</p>
          <h2>Entrada, qualificação e conversão em uma visão única.</h2>
        </div>
        <div className="lead-command-actions">
          <div className="lead-metrics">
            <article>
              <span>Total</span>
              <strong>{leadMetrics.total}</strong>
            </article>
            <article>
              <span>Qualificados</span>
              <strong>{leadMetrics.qualified}</strong>
            </article>
            <article>
              <span>Convertidos</span>
              <strong>{leadMetrics.converted}</strong>
            </article>
            <article>
              <span>Perdidos</span>
              <strong>{leadMetrics.lost}</strong>
            </article>
          </div>
          {canCreate ? (
            <button type="button" className="primary-button" onClick={() => setCreateModalOpen(true)}>
              Novo lead
            </button>
          ) : null}
        </div>
      </section>

      <section className="toolbar-card lead-toolbar">
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
                {leadStatusLabels[option.label] ?? option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Vendedor</span>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="">Todos</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar filtros
        </button>
      </section>

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>Leads por vendedor</h3>
            <p>Acompanhe a distribuicao dos leads entre os responsaveis comerciais.</p>
          </div>
          <span className="tag">{owners.length} vendedores</span>
        </div>
        <div className="lead-metrics">
          {ownerMetrics.map((owner) => (
            <article key={owner.id}>
              <span>{owner.name}</span>
              <strong>{ownerFilter ? owner.visibleLeadCount : owner.leadCount}</strong>
            </article>
          ))}
          {ownerMetrics.length === 0 ? (
            <article>
              <span>Sem vendedores</span>
              <strong>0</strong>
            </article>
          ) : null}
        </div>
      </section>

      <section className="table-card lead-kanban-section">
        <div className="card-header">
          <div>
            <h3>Kanban de leads</h3>
            <p>Mova o status pelo seletor em cada card e acompanhe o funil de entrada.</p>
          </div>
          <span className="tag">{leads.length} leads</span>
        </div>

        <div className="lead-kanban">
          {groupedLeads.map((column) => (
            <div key={column.label} className="lead-column">
              <header>
                <div>
                  <span className={`status-dot ${statusTones[column.label] ?? "orange"}`} />
                  <strong>{leadStatusLabels[column.label] ?? column.label}</strong>
                </div>
                <small>{column.items.length}</small>
              </header>

              <div className="lead-card-list">
                {column.items.map((lead) => (
                  <article
                    key={lead.id}
                    className={`lead-card selectable-card${selectedLead?.id === lead.id ? " row-active" : ""}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="lead-card-top">
                      <strong>{lead.name}</strong>
                      <span>{lead.source}</span>
                    </div>
                    <p>{lead.email || lead.phone || "Contato não informado"}</p>
                    <p>{lead.ownerName ? `Vendedor: ${lead.ownerName}` : "Sem vendedor definido"}</p>
                    <div className="lead-qualification-row">
                      <span className={`tag ${qualificationTones[lead.qualificationTemperature] ?? "muted"}`}>
                        {qualificationLabels[lead.qualificationTemperature] ?? lead.qualificationTemperature}
                      </span>
                      <small>{lead.qualificationScore} pts</small>
                    </div>
                    <div className="lead-card-footer">
                      <small>{formatDate(lead.createdAtUtc)}</small>
                      <select
                        value={leadStatusOptions.find((option) => option.label === lead.status)?.value ?? 1}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void handleMoveLead(lead, Number(event.target.value))}
                        disabled={submitting || !canEdit}
                      >
                        {leadStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {leadStatusLabels[option.label] ?? option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
                {column.items.length === 0 ? <div className="empty-card compact-empty">Sem leads aqui.</div> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lead-workspace single">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Lista completa</h3>
              <p>Selecione um lead para editar ou ver historico</p>
            </div>
            <span className="tag">{leads.length} itens</span>
          </div>

          <table className="table clickable-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Origem</th>
                <th>Temperatura</th>
                <th>Status</th>
                <th>Vendedor</th>
                <th>Criado em</th>
                <th>Ações</th>
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
                  <td>
                    {qualificationLabels[lead.qualificationTemperature] ?? lead.qualificationTemperature} ({lead.qualificationScore})
                  </td>
                  <td>{leadStatusLabels[lead.status] ?? lead.status}</td>
                  <td>{lead.ownerName ?? "Sem vendedor"}</td>
                  <td>{formatDate(lead.createdAtUtc)}</td>
                  <td>
                    <button
                      type="button"
                      className="table-action danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedLead(lead);
                      }}
                    >
                      Selecionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {createModalOpen && canCreate ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCreateModalOpen(false)}>
          <form className="modal-panel form-card" onSubmit={handleCreate} onMouseDown={(event) => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Novo lead</h3>
                <p>Cadastre uma nova entrada comercial.</p>
              </div>
              <button type="button" className="table-action" onClick={() => setCreateModalOpen(false)}>
                Fechar
              </button>
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
                    {leadStatusLabels[option.label] ?? option.label}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar lead"}
            </button>
          </form>
        </div>
      ) : null}

      {convertModalOpen && selectedLead && canCreateCustomer ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConvertModalOpen(false)}>
          <div className="modal-panel narrow" onMouseDown={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Converter em cliente</h3>
                <p>Confirme a conversão e crie um negócio no pipeline.</p>
              </div>
              <button type="button" className="table-action" onClick={() => setConvertModalOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="modal-body">
              <div className="compact-insight">
                <span>Pré-análise do lead</span>
                <div className="checklist-grid">
                  {conversionChecklist.map((check) => (
                    <div key={check.label} className="checklist-item">
                      <em className={`checklist-icon ${check.ok ? "ok" : "warn"}`}>
                        {check.ok ? "✓" : "!"}
                      </em>
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Motivo da conversão</span>
                <select
                  value={conversionForm.reason}
                  onChange={(e) => setConversionForm((f) => ({ ...f, reason: e.target.value }))}
                >
                  <option value="">Selecionar motivo...</option>
                  <option value="proposal_accepted">Proposta aceita</option>
                  <option value="referral">Indicação</option>
                  <option value="inbound">Inbound</option>
                  <option value="trial_converted">Trial convertido</option>
                  <option value="other">Outro</option>
                </select>
              </label>

              <div className="convert-section">
                <p className="convert-section-title">Criar negócio ao converter (opcional)</p>
                <label className="field">
                  <span>Valor estimado (R$)</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={conversionForm.dealValue}
                    onChange={(e) => setConversionForm((f) => ({ ...f, dealValue: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Pipeline</span>
                  <select
                    value={conversionForm.pipelineId}
                    onChange={(e) =>
                      setConversionForm((f) => ({ ...f, pipelineId: e.target.value, stageId: "" }))
                    }
                  >
                    <option value="">Selecionar pipeline...</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {conversionForm.pipelineId ? (
                  <label className="field">
                    <span>Estágio inicial</span>
                    <select
                      value={conversionForm.stageId}
                      onChange={(e) =>
                        setConversionForm((f) => ({ ...f, stageId: e.target.value }))
                      }
                    >
                      <option value="">Selecionar estágio...</option>
                      {availableStages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {error ? <p className="form-error">{error}</p> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setConvertModalOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleConvertToCustomer()}
                  disabled={submitting}
                >
                  {submitting ? "Convertendo..." : "Converter em cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedLead && !convertModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLead(null)}>
          <div className="modal-panel lead-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Detalhes do lead</h3>
                <p>Atualize informações, converta em cliente ou consulte o histórico.</p>
              </div>
              <button type="button" className="table-action" onClick={() => setSelectedLead(null)}>
                Fechar
              </button>
            </div>
            <div className="two-column modal-columns">
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
                        {leadStatusLabels[option.label] ?? option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-insight">
                  <span>Pré-qualificação</span>
                  <strong>
                    {qualificationLabels[selectedLead.qualificationTemperature] ?? selectedLead.qualificationTemperature} · {selectedLead.qualificationScore} pts
                  </strong>
                  <p>{selectedLead.qualificationNotes || "Sem notas de qualificação."}</p>
                </div>
                <button type="submit" className="primary-button" disabled={submitting || !canEdit}>
                  {submitting ? "Atualizando..." : "Salvar alterações"}
                </button>
                {canCreateCustomer ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleOpenConvertModal()}
                    disabled={submitting || selectedLead.status === "Converted"}
                  >
                    {selectedLead.status === "Converted" ? "Lead já convertido" : "Converter em cliente"}
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                    Excluir lead
                  </button>
                ) : null}
              </form>

              <div className="timeline">
                <div className="card-header">
                  <div>
                    <h3>Histórico</h3>
                    <p>Eventos registrados para este lead.</p>
                  </div>
                  <span className="tag">#{selectedLead.id}</span>
                </div>
                {history.map((item) => {
                  const detail = formatHistoryDetail(item);
                  return (
                    <article key={item.id} className="timeline-item">
                      <span className="timeline-dot" />
                      <div className="timeline-body">
                        <strong>{eventTypeLabels[item.type] ?? item.type}</strong>
                        {detail ? <p>{detail}</p> : null}
                      </div>
                      <span>{formatDate(item.occurredAtUtc)}</span>
                    </article>
                  );
                })}
                {history.length === 0 ? <div className="empty-card">Sem histórico encontrado.</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
