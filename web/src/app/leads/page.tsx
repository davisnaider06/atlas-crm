"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { Select } from "@/components/ui/select";
import { QuickContactActions } from "@/components/ui/quick-actions";
import { CustomFieldInputs } from "@/components/ui/custom-field-inputs";
import { mergeCustomFieldValues, readCustomFieldValues } from "@/lib/custom-fields";
import {
  FUNNEL_STAGE_OPTIONS,
  FUNNEL_STAGE_LABELS,
  CHANNEL_OPTIONS,
  LOSS_REASON_OPTIONS,
  LOSS_REASON_LABELS,
} from "@/lib/constants";
import type { CustomFieldDef, FunnelStage } from "@/lib/types";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import type { HistoryItem, Lead, LeadOwner, PagedResult, Pipeline } from "@/lib/types";

const PROPOSAL_STAGE_ORDER = 6; // valor_proposta editável a partir de "Proposta enviada"

const stageTones: Record<string, string> = {
  Mapped: "muted",
  Prospected: "orange",
  Replied: "blue",
  MeetingScheduled: "gold",
  MeetingDone: "warning",
  ProposalSent: "gold",
  Closed: "success",
};

const eventTypeLabels: Record<string, string> = {
  LeadCreated: "Lead criado",
  LeadUpdated: "Dados atualizados",
  LeadStageChanged: "Etapa alterada",
  LeadConverted: "Convertido em cliente",
  CustomerCreated: "Cliente criado",
  DealCreated: "Negócio criado",
  ActivityCreated: "Atividade registrada",
};

function stageOrder(stage: FunnelStage): number {
  return FUNNEL_STAGE_OPTIONS.find((s) => s.value === stage)?.order ?? 0;
}

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

function formatHistoryDetail(item: HistoryItem): string {
  try {
    const data = JSON.parse(item.dataJson) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof data.To === "string") {
      parts.push(FUNNEL_STAGE_LABELS[data.To] ?? data.To);
    }
    if (typeof data.Outcome === "string" && data.Outcome !== "None") {
      parts.push(data.Outcome === "Won" ? "Fechado" : "Perdido");
    }
    if (typeof data.value === "number") {
      parts.push(formatCurrency(data.value));
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
  const [conversionForm, setConversionForm] = useState({ reason: "", dealValue: "", pipelineId: "", stageId: "" });
  // Fechamento (etapa 7): desfecho + valor de contrato / motivo de perda
  const [closeModal, setCloseModal] = useState<{ lead: Lead } | null>(null);
  const [closeForm, setCloseForm] = useState({ outcome: "", contractValue: "", lossReason: "" });
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dragLeadId, setDragLeadId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editCustomValues, setEditCustomValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    channel: "",
    companyName: "",
    contactHandle: "",
    email: "",
    phone: "",
    source: "",
    observations: "",
    nextFollowUp: "",
  });

  const editForm = useMemo(
    () => ({
      name: selectedLead?.name ?? "",
      email: selectedLead?.email ?? "",
      phone: selectedLead?.phone ?? "",
      source: selectedLead?.source ?? "",
      channel: selectedLead?.channel ?? "",
      companyName: selectedLead?.companyName ?? "",
      contactHandle: selectedLead?.contactHandle ?? "",
      observations: selectedLead?.observations ?? "",
      proposalValue: selectedLead?.proposalValue != null ? String(selectedLead.proposalValue) : "",
      lastContact: toDateInput(selectedLead?.lastContactAtUtc),
      nextFollowUp: toDateInput(selectedLead?.nextFollowUpAtUtc),
    }),
    [selectedLead],
  );
  const [editState, setEditState] = useState(editForm);

  useEffect(() => {
    setEditState(editForm);
  }, [editForm]);

  useEffect(() => {
    setEditCustomValues(readCustomFieldValues(selectedLead?.extraDataJson));
  }, [selectedLead]);

  useEffect(() => {
    if (!token) return;
    void api.getCustomFields(token, "Lead").then(setCustomFields).catch(() => setCustomFields([]));
  }, [token]);

  const groupedLeads = useMemo(
    () =>
      FUNNEL_STAGE_OPTIONS.map((stage) => ({
        ...stage,
        items: leads.filter((lead) => lead.funnelStage === stage.value),
      })),
    [leads],
  );

  const leadMetrics = useMemo(
    () => ({
      total: leads.length,
      active: leads.filter((lead) => lead.funnelStage !== "Closed").length,
      won: leads.filter((lead) => lead.outcome === "Won").length,
      lost: leads.filter((lead) => lead.outcome === "Lost").length,
      cold: leads.filter((lead) => lead.isCold).length,
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
        ownerUserId: ownerFilter ? Number(ownerFilter) : undefined,
      })) as PagedResult<Lead>;
      setLeads(response.items);
      const ownerResponse = await api.getLeadOwners(token);
      setOwners(ownerResponse);
      setSelectedLead((current) => (current ? response.items.find((item) => item.id === current.id) ?? null : null));
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao carregar leads.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para ver leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao carregar leads" });
    } finally {
      setLoading(false);
    }
  }, [token, search, ownerFilter, notify]);

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
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.createLead(token, {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        source: form.source || form.channel || "Outro",
        status: 6,
        channel: form.channel || undefined,
        companyName: form.companyName || undefined,
        contactHandle: form.contactHandle || undefined,
        observations: form.observations || undefined,
        nextFollowUpAtUtc: fromDateInput(form.nextFollowUp),
        extraDataJson: customFields.length > 0 ? mergeCustomFieldValues(null, customValues) : undefined,
      });
      setForm({ name: "", channel: "", companyName: "", contactHandle: "", email: "", phone: "", source: "", observations: "", nextFollowUp: "" });
      setCustomValues({});
      setCreateModalOpen(false);
      await load();
      notify({ type: "success", message: "Lead criado com sucesso.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao criar lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para criar leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao criar lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedLead) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.updateLead(token, selectedLead.id, {
        name: editState.name,
        email: editState.email || undefined,
        phone: editState.phone || undefined,
        source: editState.source || editState.channel || "Outro",
        status: 6,
        ownerUserId: selectedLead.ownerUserId ?? null,
        channel: editState.channel || undefined,
        companyName: editState.companyName || undefined,
        contactHandle: editState.contactHandle || undefined,
        observations: editState.observations || undefined,
        proposalValue: editState.proposalValue ? Number(editState.proposalValue) : null,
        lastContactAtUtc: fromDateInput(editState.lastContact),
        nextFollowUpAtUtc: fromDateInput(editState.nextFollowUp),
        extraDataJson:
          customFields.length > 0 ? mergeCustomFieldValues(selectedLead.extraDataJson, editCustomValues) : undefined,
      });
      await load();
      notify({ type: "success", message: "Lead atualizado.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao atualizar lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para editar leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao atualizar lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedLead) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteLead(token, selectedLead.id);
      setSelectedLead(null);
      setHistory([]);
      await load();
      notify({ type: "success", message: "Lead excluído.", title: "Excluído" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao excluir lead.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para excluir leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao excluir lead" });
    } finally {
      setSubmitting(false);
    }
  };

  // Move um lead de etapa. Ao mover para "Closed" abre o modal de fechamento/perda.
  const handleMoveStage = async (lead: Lead, stageValue: string) => {
    if (!token || stageValue === lead.funnelStage) return;

    if (stageValue === "Closed") {
      setCloseForm({ outcome: "", contractValue: "", lossReason: "" });
      setCloseModal({ lead });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.moveLeadStage(token, lead.id, { funnelStage: stageValue });
      await load();
      notify({ type: "success", message: `Lead movido para "${FUNNEL_STAGE_LABELS[stageValue]}".`, title: "Etapa atualizada" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao mover lead.";
      notify({ type: "error", message, title: "Erro ao mover lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!token || !closeModal) return;

    if (!closeForm.outcome) {
      notify({ type: "error", message: "Selecione o desfecho: Fechado ou Perdido.", title: "Desfecho obrigatório" });
      return;
    }
    if (closeForm.outcome === "Won" && (!closeForm.contractValue || Number(closeForm.contractValue) <= 0)) {
      notify({ type: "error", message: "Informe o valor do contrato para marcar como Fechado.", title: "Valor obrigatório" });
      return;
    }
    if (closeForm.outcome === "Lost" && !closeForm.lossReason) {
      notify({ type: "error", message: "Selecione o motivo da perda.", title: "Motivo obrigatório" });
      return;
    }

    setSubmitting(true);
    try {
      await api.moveLeadStage(token, closeModal.lead.id, {
        funnelStage: "Closed",
        outcome: closeForm.outcome,
        contractValue: closeForm.outcome === "Won" ? Number(closeForm.contractValue) : null,
        lossReason: closeForm.outcome === "Lost" ? closeForm.lossReason : undefined,
      });
      setCloseModal(null);
      await load();
      notify({
        type: "success",
        message: closeForm.outcome === "Won" ? "Lead fechado e receita lançada no financeiro." : "Lead marcado como perdido.",
        title: closeForm.outcome === "Won" ? "Fechado 🎉" : "Perdido",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fechar lead.";
      notify({ type: "error", message, title: "Erro ao fechar lead" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceFollowUp = async (lead: Lead) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const updated = await api.advanceLeadFollowUp(token, lead.id);
      await load();
      notify({
        type: "success",
        message: updated.isCold ? "Sem resposta após D+10 — lead marcado como Frio." : "Follow-up registrado e próxima data agendada.",
        title: "Follow-up",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao registrar follow-up.";
      notify({ type: "error", message, title: "Erro" });
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

  const selectedProposalEditable = selectedLead ? stageOrder(selectedLead.funnelStage) >= PROPOSAL_STAGE_ORDER : false;

  return (
    <div className="page-grid">
      <section className="lead-command-card">
        <div>
          <p className="eyebrow">Funil comercial</p>
          <h2>Sete etapas, do lead mapeado ao contrato fechado.</h2>
        </div>
        <div className="lead-command-actions">
          <div className="lead-metrics">
            <article>
              <span>Total</span>
              <strong>{leadMetrics.total}</strong>
            </article>
            <article>
              <span>Em andamento</span>
              <strong>{leadMetrics.active}</strong>
            </article>
            <article>
              <span>Fechados</span>
              <strong>{leadMetrics.won}</strong>
            </article>
            <article>
              <span>Perdidos</span>
              <strong>{leadMetrics.lost}</strong>
            </article>
            <article>
              <span>Frios</span>
              <strong>{leadMetrics.cold}</strong>
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
          <span>Vendedor</span>
          <Select
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={[
              { value: "", label: "Todos" },
              ...owners.map((owner) => ({ value: String(owner.id), label: owner.name })),
            ]}
          />
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar filtros
        </button>
      </section>

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>Leads por vendedor</h3>
            <p>Acompanhe a distribuição dos leads entre os responsáveis comerciais.</p>
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
            <h3>Funil de 7 etapas</h3>
            <p>Arraste o card ou use o seletor para mover de etapa. A etapa final exige desfecho.</p>
          </div>
          <span className="tag">{leads.length} leads</span>
        </div>

        <div className="lead-kanban funnel-kanban">
          {groupedLeads.map((column) => (
            <div
              key={column.value}
              className={`lead-column${dropStage === column.value ? " drop-target" : ""}`}
              onDragOver={(e) => {
                if (dragLeadId === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropStage !== column.value) setDropStage(column.value);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDropStage((current) => (current === column.value ? null : current));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const leadId = dragLeadId;
                setDragLeadId(null);
                setDropStage(null);
                if (leadId === null) return;
                const lead = leads.find((item) => item.id === leadId);
                if (lead && lead.funnelStage !== column.value) void handleMoveStage(lead, column.value);
              }}
            >
              <header>
                <div>
                  <span className={`status-dot ${stageTones[column.value] ?? "orange"}`} />
                  <strong>{column.order}. {column.label}</strong>
                </div>
                <small>{column.items.length}</small>
              </header>

              <div className="lead-card-list">
                {column.items.map((lead) => (
                  <article
                    key={lead.id}
                    className={`lead-card selectable-card${selectedLead?.id === lead.id ? " row-active" : ""}${dragLeadId === lead.id ? " dragging" : ""}`}
                    draggable={canEdit && !submitting}
                    onDragStart={(e) => {
                      setDragLeadId(lead.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragLeadId(null);
                      setDropStage(null);
                    }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="lead-card-top">
                      <strong>{lead.name}</strong>
                      <span>{lead.channel || lead.source}</span>
                    </div>
                    <p>{lead.companyName || "Empresa/nicho não informado"}</p>
                    <p>{lead.contactHandle || lead.email || lead.phone || "Contato não informado"}</p>
                    <div className="lead-card-badges">
                      {lead.outcome === "Won" ? <span className="tag success">Fechado</span> : null}
                      {lead.outcome === "Lost" ? (
                        <span className="tag danger">Perdido{lead.lossReason !== "None" ? ` · ${LOSS_REASON_LABELS[lead.lossReason] ?? ""}` : ""}</span>
                      ) : null}
                      {lead.isCold ? <span className="tag muted">Frio</span> : null}
                      {lead.nextFollowUpAtUtc && lead.outcome === "None" ? (
                        <span className={`tag ${new Date(lead.nextFollowUpAtUtc) < new Date() ? "danger" : "blue"}`}>
                          Follow-up {formatDate(lead.nextFollowUpAtUtc)}
                        </span>
                      ) : null}
                    </div>
                    <div className="lead-card-footer">
                      <QuickContactActions phone={lead.phone} email={lead.email} name={lead.name} />
                      <Select
                        value={lead.funnelStage}
                        onChange={(value) => void handleMoveStage(lead, value)}
                        options={FUNNEL_STAGE_OPTIONS.map((option) => ({ value: option.value, label: `${option.order}. ${option.label}` }))}
                        disabled={submitting || !canEdit}
                      />
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
              <p>Selecione um lead para editar, mover de etapa ou ver histórico</p>
            </div>
            <span className="tag">{leads.length} itens</span>
          </div>

          <table className="table clickable-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa/nicho</th>
                <th>Canal</th>
                <th>Etapa</th>
                <th>Próx. follow-up</th>
                <th>Vendedor</th>
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
                  <td>{lead.companyName ?? "-"}</td>
                  <td>{lead.channel ?? lead.source}</td>
                  <td>
                    <span className={`tag ${stageTones[lead.funnelStage] ?? "muted"}`}>
                      {FUNNEL_STAGE_LABELS[lead.funnelStage] ?? lead.funnelStage}
                    </span>
                  </td>
                  <td>{lead.nextFollowUpAtUtc ? formatDate(lead.nextFollowUpAtUtc) : "-"}</td>
                  <td>{lead.ownerName ?? "Sem vendedor"}</td>
                  <td>
                    <div className="table-action-row">
                      <QuickContactActions phone={lead.phone} email={lead.email} name={lead.name} />
                      <button
                        type="button"
                        className="table-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLead(lead);
                        }}
                      >
                        Abrir
                      </button>
                    </div>
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
                <p>Entra na etapa 1 (Mapeado).</p>
              </div>
              <button type="button" className="table-action" onClick={() => setCreateModalOpen(false)}>
                Fechar
              </button>
            </div>
            <label className="field">
              <span>Nome do contato</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Empresa / nicho</span>
              <input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
            </label>
            <label className="field">
              <span>Canal</span>
              <Select
                value={form.channel}
                onChange={(value) => setForm((current) => ({ ...current, channel: value }))}
                placeholder="Selecione o canal"
                options={CHANNEL_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
              />
            </label>
            <label className="field">
              <span>@ ou telefone</span>
              <input value={form.contactHandle} onChange={(event) => setForm((current) => ({ ...current, contactHandle: event.target.value }))} placeholder="@usuario ou (11) 99999-9999" />
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
              <span>Próximo follow-up</span>
              <input type="date" value={form.nextFollowUp} onChange={(event) => setForm((current) => ({ ...current, nextFollowUp: event.target.value }))} />
            </label>
            <label className="field">
              <span>Observações</span>
              <textarea value={form.observations} onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))} />
            </label>
            <CustomFieldInputs
              defs={customFields}
              values={customValues}
              onChange={(key, value) => setCustomValues((current) => ({ ...current, [key]: value }))}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar lead"}
            </button>
          </form>
        </div>
      ) : null}

      {closeModal ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCloseModal(null)}>
          <div className="modal-panel narrow" onMouseDown={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Encerrar lead</h3>
                <p>{closeModal.lead.name} — defina o desfecho.</p>
              </div>
              <button type="button" className="table-action" onClick={() => setCloseModal(null)}>
                Fechar
              </button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>Desfecho</span>
                <Select
                  value={closeForm.outcome}
                  onChange={(value) => setCloseForm((f) => ({ ...f, outcome: value }))}
                  placeholder="Selecionar..."
                  options={[
                    { value: "Won", label: "Fechado (ganho)" },
                    { value: "Lost", label: "Perdido" },
                  ]}
                />
              </label>

              {closeForm.outcome === "Won" ? (
                <label className="field">
                  <span>Valor do contrato (R$) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closeForm.contractValue}
                    onChange={(e) => setCloseForm((f) => ({ ...f, contractValue: e.target.value }))}
                    placeholder="Obrigatório"
                    required
                  />
                  <small className="muted-mini">Entra automaticamente como receita no financeiro.</small>
                </label>
              ) : null}

              {closeForm.outcome === "Lost" ? (
                <label className="field">
                  <span>Motivo da perda *</span>
                  <Select
                    value={closeForm.lossReason}
                    onChange={(value) => setCloseForm((f) => ({ ...f, lossReason: value }))}
                    placeholder="Selecionar motivo..."
                    options={LOSS_REASON_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                  />
                </label>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setCloseModal(null)}>
                  Cancelar
                </button>
                <button type="button" className="primary-button" onClick={() => void handleConfirmClose()} disabled={submitting}>
                  {submitting ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
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
                      <em className={`checklist-icon ${check.ok ? "ok" : "warn"}`}>{check.ok ? "✓" : "!"}</em>
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Motivo da conversão</span>
                <Select
                  value={conversionForm.reason}
                  onChange={(value) => setConversionForm((f) => ({ ...f, reason: value }))}
                  placeholder="Selecionar motivo..."
                  options={[
                    { value: "proposal_accepted", label: "Proposta aceita" },
                    { value: "referral", label: "Indicação" },
                    { value: "inbound", label: "Inbound" },
                    { value: "trial_converted", label: "Trial convertido" },
                    { value: "other", label: "Outro" },
                  ]}
                />
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
                  <Select
                    value={conversionForm.pipelineId}
                    onChange={(value) => setConversionForm((f) => ({ ...f, pipelineId: value, stageId: "" }))}
                    placeholder="Selecionar pipeline..."
                    options={pipelines.map((p) => ({ value: String(p.id), label: p.name }))}
                  />
                </label>
                {conversionForm.pipelineId ? (
                  <label className="field">
                    <span>Estágio inicial</span>
                    <Select
                      value={conversionForm.stageId}
                      onChange={(value) => setConversionForm((f) => ({ ...f, stageId: value }))}
                      placeholder="Selecionar estágio..."
                      options={availableStages.map((s) => ({ value: String(s.id), label: s.name }))}
                    />
                  </label>
                ) : null}
              </div>

              {error ? <p className="form-error">{error}</p> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setConvertModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="primary-button" onClick={() => void handleConvertToCustomer()} disabled={submitting}>
                  {submitting ? "Convertendo..." : "Converter em cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedLead && !convertModalOpen && !closeModal ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLead(null)}>
          <div className="modal-panel lead-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Detalhes do lead</h3>
                <p>
                  Etapa atual:{" "}
                  <strong>{FUNNEL_STAGE_LABELS[selectedLead.funnelStage] ?? selectedLead.funnelStage}</strong>
                  {selectedLead.outcome === "Won" ? " · Fechado" : ""}
                  {selectedLead.outcome === "Lost" ? ` · Perdido (${LOSS_REASON_LABELS[selectedLead.lossReason] ?? ""})` : ""}
                  {selectedLead.isCold ? " · Frio" : ""}
                </p>
              </div>
              <button type="button" className="table-action" onClick={() => setSelectedLead(null)}>
                Fechar
              </button>
            </div>

            <div className="lead-detail-stagebar">
              <label className="field compact">
                <span>Mover de etapa</span>
                <Select
                  value={selectedLead.funnelStage}
                  onChange={(value) => void handleMoveStage(selectedLead, value)}
                  options={FUNNEL_STAGE_OPTIONS.map((option) => ({ value: option.value, label: `${option.order}. ${option.label}` }))}
                  disabled={submitting || !canEdit}
                />
              </label>
              {(selectedLead.funnelStage === "Prospected" || selectedLead.funnelStage === "ProposalSent") && canEdit ? (
                <button type="button" className="ghost-button" onClick={() => void handleAdvanceFollowUp(selectedLead)} disabled={submitting}>
                  Registrar follow-up
                </button>
              ) : null}
            </div>

            <div className="two-column modal-columns">
              <form className="form-card" onSubmit={handleUpdate}>
                <label className="field">
                  <span>Nome do contato</span>
                  <input value={editState.name} onChange={(event) => setEditState((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Empresa / nicho</span>
                  <input value={editState.companyName} onChange={(event) => setEditState((current) => ({ ...current, companyName: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Canal</span>
                  <Select
                    value={editState.channel}
                    onChange={(value) => setEditState((current) => ({ ...current, channel: value }))}
                    placeholder="Selecione o canal"
                    options={CHANNEL_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
                  />
                </label>
                <label className="field">
                  <span>@ ou telefone</span>
                  <input value={editState.contactHandle} onChange={(event) => setEditState((current) => ({ ...current, contactHandle: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input value={editState.email} onChange={(event) => setEditState((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input value={editState.phone} onChange={(event) => setEditState((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <div className="two-column">
                  <label className="field">
                    <span>Último contato</span>
                    <input type="date" value={editState.lastContact} onChange={(event) => setEditState((current) => ({ ...current, lastContact: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Próximo follow-up</span>
                    <input type="date" value={editState.nextFollowUp} onChange={(event) => setEditState((current) => ({ ...current, nextFollowUp: event.target.value }))} />
                  </label>
                </div>
                <label className="field">
                  <span>Valor da proposta (R$)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editState.proposalValue}
                    disabled={!selectedProposalEditable}
                    placeholder={selectedProposalEditable ? "0,00" : "Disponível a partir de Proposta enviada"}
                    onChange={(event) => setEditState((current) => ({ ...current, proposalValue: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Observações</span>
                  <textarea value={editState.observations} onChange={(event) => setEditState((current) => ({ ...current, observations: event.target.value }))} />
                </label>
                <CustomFieldInputs
                  defs={customFields}
                  values={editCustomValues}
                  onChange={(key, value) => setEditCustomValues((current) => ({ ...current, [key]: value }))}
                />
                {selectedLead.outcome === "Won" && selectedLead.contractValue != null ? (
                  <div className="compact-insight">
                    <span>Contrato fechado</span>
                    <strong>{formatCurrency(selectedLead.contractValue)}</strong>
                    <p>Receita lançada no financeiro.</p>
                  </div>
                ) : null}
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
