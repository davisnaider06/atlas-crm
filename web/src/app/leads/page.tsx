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
  BANT_LEVEL_OPTIONS,
  BANT_DIMENSIONS,
  INTERACTION_CHANNEL_OPTIONS,
  INTERACTION_OUTCOME_OPTIONS,
  INTERACTION_OUTCOME_LABELS,
} from "@/lib/constants";
import type { ChatMessage, Conversation, CustomFieldDef, FunnelStage, LeadImportResult, LeadInteraction, Script } from "@/lib/types";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import type { HistoryItem, Lead, LeadOwner, Pipeline } from "@/lib/types";

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
  // Importação / exportação / limpeza em massa
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  // Distribuição automática entre vendedores na importação
  const [distributeLeads, setDistributeLeads] = useState(true);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);
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
  const [scripts, setScripts] = useState<Script[]>([]);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [interactionForm, setInteractionForm] = useState({ channel: "", scriptId: "", outcome: "NoReply", notes: "" });
  const [leadConversation, setLeadConversation] = useState<Conversation | null>(null);
  const [leadMessages, setLeadMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
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
    city: "",
    instagramHandle: "",
    googleRating: "",
    bantBudget: "Unknown",
    bantAuthority: "Unknown",
    bantNeed: "Unknown",
    bantTimeline: "Unknown",
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
      followUpStep: String(selectedLead?.followUpStep ?? 0),
      city: selectedLead?.city ?? "",
      instagramHandle: selectedLead?.instagramHandle ?? "",
      googleRating: selectedLead?.googleRating != null ? String(selectedLead.googleRating) : "",
      bantBudget: selectedLead?.bantBudget ?? "Unknown",
      bantAuthority: selectedLead?.bantAuthority ?? "Unknown",
      bantNeed: selectedLead?.bantNeed ?? "Unknown",
      bantTimeline: selectedLead?.bantTimeline ?? "Unknown",
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
    void api.getScripts(token).then(setScripts).catch(() => setScripts([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedLead) {
      setInteractions([]);
      return;
    }
    void api.getLeadInteractions(token, selectedLead.id).then(setInteractions).catch(() => setInteractions([]));
  }, [selectedLead, token]);

  // WhatsApp do lead: localiza a conversa vinculada e carrega as mensagens.
  useEffect(() => {
    if (!token || !selectedLead) {
      setLeadConversation(null);
      setLeadMessages([]);
      return;
    }
    let cancelled = false;
    void api
      .getConversations(token)
      .then((all) => {
        const match = all.find((c) => c.leadId === selectedLead.id) ?? null;
        if (cancelled) return;
        setLeadConversation(match);
        if (match) {
          void api
            .getConversationMessages(token, match.id)
            .then((msgs) => !cancelled && setLeadMessages(msgs))
            .catch(() => !cancelled && setLeadMessages([]));
        } else {
          setLeadMessages([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeadConversation(null);
          setLeadMessages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLead, token]);

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

  // Prontidão da ficha para IA: % de campos estruturados preenchidos de forma consistente.
  const aiReadiness = useMemo(() => {
    if (!selectedLead) return { pct: 0, checks: [] as { label: string; ok: boolean }[] };
    const checks = [
      { label: "Empresa / nicho", ok: !!selectedLead.companyName },
      { label: "Cidade", ok: !!selectedLead.city },
      { label: "Canal de entrada", ok: !!selectedLead.channel },
      { label: "Contato (Instagram ou telefone)", ok: !!(selectedLead.instagramHandle || selectedLead.phone || selectedLead.contactHandle) },
      { label: "Fonte", ok: !!selectedLead.source },
      { label: "BANT — Orçamento", ok: selectedLead.bantBudget !== "Unknown" },
      { label: "BANT — Autoridade", ok: selectedLead.bantAuthority !== "Unknown" },
      { label: "BANT — Necessidade", ok: selectedLead.bantNeed !== "Unknown" },
      { label: "BANT — Prazo", ok: selectedLead.bantTimeline !== "Unknown" },
      { label: "Histórico de contato registrado", ok: interactions.length > 0 },
    ];
    const done = checks.filter((c) => c.ok).length;
    return { pct: Math.round((done / checks.length) * 100), checks };
  }, [selectedLead, interactions]);

  // Timeline unificada: eventos do sistema (EventLog) + contatos registrados manualmente.
  const timelineEntries = useMemo(() => {
    const fromHistory = history.map((item) => ({
      key: `h-${item.id}`,
      kind: "event" as const,
      at: item.occurredAtUtc,
      title: eventTypeLabels[item.type] ?? item.type,
      detail: formatHistoryDetail(item),
      outcome: null as string | null,
      interactionId: null as number | null,
    }));
    const fromInteractions = interactions.map((it) => ({
      key: `i-${it.id}`,
      kind: "interaction" as const,
      at: it.occurredAtUtc,
      title: `Contato · ${it.channel}`,
      detail: [
        it.scriptName ? `Script: ${it.scriptName}` : null,
        INTERACTION_OUTCOME_LABELS[it.outcome] ?? it.outcome,
        it.notes,
        it.createdByName,
      ]
        .filter(Boolean)
        .join(" · "),
      outcome: it.outcome,
      interactionId: it.id,
    }));
    return [...fromHistory, ...fromInteractions].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [history, interactions]);

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
      const [response, ownerResponse] = await Promise.all([
        api.getAllLeads(token, {
          search: search || undefined,
          ownerUserId: ownerFilter ? Number(ownerFilter) : undefined,
        }),
        api.getLeadOwners(token),
      ]);
      setLeads(response.items);
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
        city: form.city || undefined,
        instagramHandle: form.instagramHandle || undefined,
        googleRating: form.googleRating ? Number(form.googleRating) : undefined,
        bantBudget: form.bantBudget,
        bantAuthority: form.bantAuthority,
        bantNeed: form.bantNeed,
        bantTimeline: form.bantTimeline,
        extraDataJson: customFields.length > 0 ? mergeCustomFieldValues(null, customValues) : undefined,
      });
      setForm({ name: "", channel: "", companyName: "", contactHandle: "", email: "", phone: "", source: "", observations: "", nextFollowUp: "", city: "", instagramHandle: "", googleRating: "", bantBudget: "Unknown", bantAuthority: "Unknown", bantNeed: "Unknown", bantTimeline: "Unknown" });
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
        city: editState.city || undefined,
        instagramHandle: editState.instagramHandle || undefined,
        googleRating: editState.googleRating ? Number(editState.googleRating) : null,
        bantBudget: editState.bantBudget,
        bantAuthority: editState.bantAuthority,
        bantNeed: editState.bantNeed,
        bantTimeline: editState.bantTimeline,
        lastContactAtUtc: fromDateInput(editState.lastContact),
        nextFollowUpAtUtc: fromDateInput(editState.nextFollowUp),
        followUpStep: Number(editState.followUpStep) || 0,
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

  const handleLogInteraction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedLead) return;
    if (!interactionForm.channel) {
      notify({ type: "error", message: "Selecione o canal do contato.", title: "Campo obrigatório" });
      return;
    }

    setSubmitting(true);
    try {
      await api.createLeadInteraction(token, selectedLead.id, {
        channel: interactionForm.channel,
        scriptId: interactionForm.scriptId ? Number(interactionForm.scriptId) : null,
        outcome: interactionForm.outcome,
        notes: interactionForm.notes || null,
      });
      setInteractionForm({ channel: "", scriptId: "", outcome: "NoReply", notes: "" });
      const [refreshed, refreshedScripts] = await Promise.all([
        api.getLeadInteractions(token, selectedLead.id),
        api.getScripts(token),
      ]);
      setInteractions(refreshed);
      setScripts(refreshedScripts);
      await load();
      notify({ type: "success", message: "Contato registrado.", title: "Sucesso" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao registrar contato.";
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para registrar contatos." : message, title: status === 403 ? "Permissão negada" : "Erro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !leadConversation || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      const sent = await api.sendConversationMessage(token, leadConversation.id, messageDraft.trim());
      setLeadMessages((current) => [...current, sent]);
      setMessageDraft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar mensagem.";
      notify({ type: "error", message, title: "Erro" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: number) => {
    if (!token || !selectedLead) return;
    try {
      await api.deleteLeadInteraction(token, interactionId);
      setInteractions((current) => current.filter((i) => i.id !== interactionId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir contato.";
      notify({ type: "error", message, title: "Erro" });
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

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await api.exportLeads(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify({ type: "success", message: "Planilha de leads gerada.", title: "Exportado" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao exportar leads.";
      notify({ type: "error", message, title: "Erro ao exportar" });
    } finally {
      setExporting(false);
    }
  };

  // Gera um CSV modelo (cabeçalhos esperados) para o usuário preencher.
  const downloadImportTemplate = () => {
    const headers = ["Nome", "Empresa", "Canal", "Email", "Telefone", "Instagram", "Cidade", "Avaliacao Google", "Fonte", "Observacoes"];
    const example = ["Maria Silva", "Padaria Pão Quente", "Instagram", "maria@email.com", "(11) 99999-0000", "@padaria", "São Paulo", "4.5", "Indicação", "Tem interesse em delivery"];
    const csv = `﻿${headers.join(";")}\n${example.join(";")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-leads.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Vendedores (papel Sales) que entram no rodízio de distribuição.
  const salesOwners = useMemo(() => owners.filter((o) => o.role === "Sales"), [owners]);

  const openImportModal = () => {
    setImportResult(null);
    setImportFile(null);
    setDistributeLeads(true);
    setSelectedOwnerIds(salesOwners.map((o) => o.id));
    setImportModalOpen(true);
  };

  const handleImport = async (phoneDuplicateMode: "ask" | "import" | "skip" = "ask") => {
    if (!token || !importFile) return;
    setImporting(true);
    if (phoneDuplicateMode === "ask") setImportResult(null);
    try {
      const result = await api.importLeads(token, importFile, {
        distribute: distributeLeads,
        ownerUserIds: distributeLeads ? selectedOwnerIds : undefined,
        phoneDuplicateMode,
      });
      setImportResult(result);

      // Modo "ask" detectou telefone repetido: espera a decisão do usuário, nada foi gravado.
      if (result.needsPhoneConfirmation) {
        return;
      }

      await load();
      const distMsg = result.distribution.length > 0
        ? ` Distribuídos: ${result.distribution.map((d) => `${d.ownerName} +${d.assigned}`).join(", ")}.`
        : "";
      notify({
        type: result.imported > 0 ? "success" : "info",
        message: `${result.imported} lead(s) importado(s), ${result.skippedDuplicates} duplicado(s) ignorado(s).${distMsg}`,
        title: "Importação concluída",
      });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : "Erro ao importar leads.";
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para importar leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao importar" });
    } finally {
      setImporting(false);
    }
  };

  const toggleOwnerSelected = (id: number) => {
    setSelectedOwnerIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const handleClearAll = async () => {
    if (!token) return;
    const confirmed = window.confirm(
      "Isso vai apagar TODOS os leads do CRM (exceto os que têm negócios vinculados). Recomendamos exportar para Excel antes. Deseja continuar?",
    );
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const result = await api.clearAllLeads(token);
      setSelectedLead(null);
      await load();
      notify({
        type: "success",
        message: `${result.deleted} lead(s) apagado(s)${result.skippedWithDeals > 0 ? `, ${result.skippedWithDeals} mantido(s) por terem negócios vinculados` : ""}.`,
        title: "Leads limpos",
      });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : "Erro ao limpar leads.";
      notify({ type: "error", message: status === 403 ? "Você não tem permissão para excluir leads." : message, title: status === 403 ? "Permissão negada" : "Erro ao limpar" });
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
          <div className="lead-command-buttons">
            <button type="button" className="ghost-button" onClick={() => void handleExport()} disabled={exporting}>
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
            {canCreate ? (
              <button type="button" className="ghost-button" onClick={openImportModal}>
                Importar leads
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="ghost-button danger" onClick={() => void handleClearAll()} disabled={submitting}>
                Limpar todos
              </button>
            ) : null}
            {canCreate ? (
              <button type="button" className="primary-button" onClick={() => setCreateModalOpen(true)}>
                Novo lead
              </button>
            ) : null}
          </div>
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
            <div className="two-column">
              <label className="field">
                <span>Instagram</span>
                <input value={form.instagramHandle} onChange={(event) => setForm((current) => ({ ...current, instagramHandle: event.target.value }))} placeholder="@usuario" />
              </label>
              <label className="field">
                <span>Telefone</span>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="(11) 99999-9999" />
              </label>
            </div>
            <div className="two-column">
              <label className="field">
                <span>Cidade</span>
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
              </label>
              <label className="field">
                <span>Avaliação Google</span>
                <input type="number" min="0" max="5" step="0.1" value={form.googleRating} onChange={(event) => setForm((current) => ({ ...current, googleRating: event.target.value }))} placeholder="0,0 a 5,0" />
              </label>
            </div>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <div className="bant-grid">
              <span className="field-group-label">Qualificação BANT</span>
              {BANT_DIMENSIONS.map((dim) => (
                <label className="field compact" key={dim.key}>
                  <span>{dim.label}</span>
                  <Select
                    value={form[dim.key as keyof typeof form] as string}
                    onChange={(value) => setForm((current) => ({ ...current, [dim.key]: value }))}
                    options={BANT_LEVEL_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
                  />
                </label>
              ))}
            </div>
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

      {importModalOpen && canCreate ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setImportModalOpen(false)}>
          <div className="modal-panel narrow" onMouseDown={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3>Importar leads</h3>
                <p>CSV ou Excel (.xlsx). Email repetido é ignorado; telefone repetido (na base ou no próprio arquivo) pede confirmação.</p>
              </div>
              <button type="button" className="table-action" onClick={() => setImportModalOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>Arquivo (.csv ou .xlsx)</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
                />
              </label>
              <p className="muted-mini">
                Colunas reconhecidas: Nome (obrigatório), Empresa, Canal, Email, Telefone, Instagram, Cidade, Avaliação Google, Fonte, Observações.{" "}
                <button type="button" className="link-button" onClick={downloadImportTemplate}>
                  Baixar modelo CSV
                </button>
              </p>

              <label className="checkbox-row">
                <input type="checkbox" checked={distributeLeads} onChange={(e) => setDistributeLeads(e.target.checked)} />
                <span>Distribuir automaticamente entre vendedores</span>
              </label>
              {distributeLeads ? (
                salesOwners.length > 0 ? (
                  <div className="owner-pick">
                    <p className="muted-mini">Vendedores que vão receber os leads (carga equilibrada):</p>
                    <div className="owner-pick-grid">
                      {salesOwners.map((o) => (
                        <label key={o.id} className="checkbox-row compact">
                          <input type="checkbox" checked={selectedOwnerIds.includes(o.id)} onChange={() => toggleOwnerSelected(o.id)} />
                          <span>{o.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedOwnerIds.length === 0 ? (
                      <p className="form-error">Selecione ao menos um vendedor (ou desligue a distribuição).</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="muted-mini">Nenhum vendedor (perfil Sales) ativo — os leads ficarão com você.</p>
                )
              ) : null}

              {importResult?.needsPhoneConfirmation ? (
                <div className="compact-insight warn-insight">
                  <span>⚠️ {importResult.phoneDuplicateCount} lead(s) com telefone repetido</span>
                  <ul className="import-errors">
                    {importResult.phoneDuplicateSamples.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                    {importResult.phoneDuplicateCount > importResult.phoneDuplicateSamples.length ? (
                      <li>e mais {importResult.phoneDuplicateCount - importResult.phoneDuplicateSamples.length}…</li>
                    ) : null}
                  </ul>
                  <p className="muted-mini">Deseja importar mesmo assim?</p>
                </div>
              ) : null}

              {importResult && !importResult.needsPhoneConfirmation ? (
                <div className="compact-insight">
                  <span>Resultado da importação</span>
                  <div className="checklist-grid">
                    <div className="checklist-item"><em className="checklist-icon ok">✓</em><span>{importResult.imported} importado(s)</span></div>
                    <div className="checklist-item"><em className="checklist-icon warn">!</em><span>{importResult.skippedDuplicates} duplicado(s) ignorado(s)</span></div>
                    <div className="checklist-item"><em className="checklist-icon warn">!</em><span>{importResult.skippedEmpty} sem nome ignorado(s)</span></div>
                    <div className="checklist-item"><em className="checklist-icon">·</em><span>{importResult.totalRows} linha(s) lida(s)</span></div>
                  </div>
                  {importResult.distribution.length > 0 ? (
                    <div className="owner-pick">
                      <p className="muted-mini">Distribuição por vendedor:</p>
                      <div className="checklist-grid">
                        {importResult.distribution.map((d) => (
                          <div key={d.ownerUserId} className="checklist-item">
                            <em className="checklist-icon ok">→</em><span>{d.ownerName}: +{d.assigned}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {importResult.errors.length > 0 ? (
                    <ul className="import-errors">
                      {importResult.errors.slice(0, 10).map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {importResult?.needsPhoneConfirmation ? (
                <div className="modal-actions">
                  <button type="button" className="ghost-button" onClick={() => setImportResult(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="ghost-button" onClick={() => void handleImport("skip")} disabled={importing}>
                    Pular os repetidos
                  </button>
                  <button type="button" className="primary-button" onClick={() => void handleImport("import")} disabled={importing}>
                    {importing ? "Importando..." : "Importar mesmo assim"}
                  </button>
                </div>
              ) : (
                <div className="modal-actions">
                  <button type="button" className="ghost-button" onClick={() => setImportModalOpen(false)}>
                    {importResult ? "Fechar" : "Cancelar"}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleImport("ask")}
                    disabled={importing || !importFile || (distributeLeads && salesOwners.length > 0 && selectedOwnerIds.length === 0)}
                  >
                    {importing ? "Importando..." : "Importar"}
                  </button>
                </div>
              )}
            </div>
          </div>
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

            <div className="ai-readiness">
              <div className="ai-readiness-head">
                <span>Prontidão da ficha</span>
                <strong className={aiReadiness.pct >= 80 ? "good" : aiReadiness.pct >= 50 ? "mid" : "low"}>
                  {aiReadiness.pct}%
                </strong>
              </div>
              <div className="ai-readiness-track">
                <div className="ai-readiness-fill" style={{ width: `${aiReadiness.pct}%` }} />
              </div>
              <div className="ai-readiness-chips">
                {aiReadiness.checks.map((c) => (
                  <span key={c.label} className={`ai-chip${c.ok ? " ok" : ""}`}>
                    {c.ok ? "✓" : "•"} {c.label}
                  </span>
                ))}
              </div>
              <p className="ai-readiness-note">Campos estruturados completos deixam a base pronta para automações e IA.</p>
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
                <div className="two-column">
                  <label className="field">
                    <span>Instagram</span>
                    <input value={editState.instagramHandle} onChange={(event) => setEditState((current) => ({ ...current, instagramHandle: event.target.value }))} placeholder="@usuario" />
                  </label>
                  <label className="field">
                    <span>Telefone</span>
                    <input value={editState.phone} onChange={(event) => setEditState((current) => ({ ...current, phone: event.target.value }))} />
                  </label>
                </div>
                <div className="two-column">
                  <label className="field">
                    <span>Cidade</span>
                    <input value={editState.city} onChange={(event) => setEditState((current) => ({ ...current, city: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Avaliação Google</span>
                    <input type="number" min="0" max="5" step="0.1" value={editState.googleRating} onChange={(event) => setEditState((current) => ({ ...current, googleRating: event.target.value }))} placeholder="0,0 a 5,0" />
                  </label>
                </div>
                <label className="field">
                  <span>Email</span>
                  <input value={editState.email} onChange={(event) => setEditState((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <div className="bant-grid">
                  <span className="field-group-label">Qualificação BANT</span>
                  {BANT_DIMENSIONS.map((dim) => (
                    <label className="field compact" key={dim.key}>
                      <span>{dim.label}</span>
                      <Select
                        value={editState[dim.key as keyof typeof editState] as string}
                        onChange={(value) => setEditState((current) => ({ ...current, [dim.key]: value }))}
                        options={BANT_LEVEL_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
                        disabled={!canEdit}
                      />
                    </label>
                  ))}
                </div>
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
                  <span>Follow-up atual</span>
                  <Select
                    value={editState.followUpStep}
                    onChange={(value) => setEditState((current) => ({ ...current, followUpStep: value }))}
                    disabled={!canEdit}
                    options={[
                      { value: "0", label: "Nenhum" },
                      { value: "1", label: "Follow-up 1" },
                      { value: "2", label: "Follow-up 2" },
                      { value: "3", label: "Follow-up 3" },
                      { value: "4", label: "Follow-up 4" },
                      { value: "5", label: "Follow-up 5" },
                      { value: "6", label: "Follow-up 6" },
                      { value: "7", label: "Follow-up 7" },
                    ]}
                  />
                </label>
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

              <div className="modal-side">
              <div className="wa-panel">
                <div className="card-header">
                  <div>
                    <h3>WhatsApp</h3>
                    <p>{leadConversation ? `Conversa com ${leadConversation.contactName || leadConversation.contactPhone}` : "Sem conversa vinculada a este lead."}</p>
                  </div>
                  {leadConversation ? <span className="tag">{leadMessages.length} msgs</span> : null}
                </div>
                {leadConversation ? (
                  <>
                    <div className="wa-thread">
                      {leadMessages.map((m) => (
                        <div key={m.id} className={`wa-bubble${m.isInbound ? " inbound" : " outbound"}`}>
                          <p>{m.text}</p>
                          <span>{formatDate(m.sentAtUtc)}</span>
                        </div>
                      ))}
                      {leadMessages.length === 0 ? <div className="empty-card">Sem mensagens ainda.</div> : null}
                    </div>
                    {canEdit ? (
                      <form className="wa-composer" onSubmit={handleSendWhatsApp}>
                        <input
                          value={messageDraft}
                          onChange={(event) => setMessageDraft(event.target.value)}
                          placeholder="Escreva uma mensagem..."
                        />
                        <button type="submit" className="primary-button" disabled={sendingMessage || !messageDraft.trim()}>
                          {sendingMessage ? "..." : "Enviar"}
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <div className="empty-card">
                    Quando o lead tiver telefone e uma conversa no módulo WhatsApp, ela aparece aqui automaticamente.
                  </div>
                )}
              </div>

              <div className="timeline">
                {canEdit ? (
                  <form className="interaction-form" onSubmit={handleLogInteraction}>
                    <div className="card-header">
                      <div>
                        <h3>Registrar contato</h3>
                        <p>Anote o canal, o script usado e o resultado.</p>
                      </div>
                    </div>
                    <div className="two-column">
                      <label className="field compact">
                        <span>Canal</span>
                        <Select
                          value={interactionForm.channel}
                          onChange={(value) => setInteractionForm((c) => ({ ...c, channel: value }))}
                          placeholder="Selecione"
                          options={INTERACTION_CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        />
                      </label>
                      <label className="field compact">
                        <span>Resultado</span>
                        <Select
                          value={interactionForm.outcome}
                          onChange={(value) => setInteractionForm((c) => ({ ...c, outcome: value }))}
                          options={INTERACTION_OUTCOME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        />
                      </label>
                    </div>
                    <label className="field compact">
                      <span>Script usado</span>
                      <Select
                        value={interactionForm.scriptId}
                        onChange={(value) => setInteractionForm((c) => ({ ...c, scriptId: value }))}
                        placeholder={scripts.length > 0 ? "Nenhum / livre" : "Cadastre scripts em Configurações"}
                        options={scripts
                          .filter((s) => s.isActive)
                          .map((s) => ({ value: String(s.id), label: s.name }))}
                      />
                    </label>
                    <label className="field compact">
                      <span>Observação do contato</span>
                      <textarea
                        value={interactionForm.notes}
                        onChange={(event) => setInteractionForm((c) => ({ ...c, notes: event.target.value }))}
                        placeholder="O que foi dito / próximo passo"
                      />
                    </label>
                    <button type="submit" className="ghost-button" disabled={submitting}>
                      {submitting ? "Registrando..." : "Registrar contato"}
                    </button>
                  </form>
                ) : null}

                <div className="card-header">
                  <div>
                    <h3>Histórico</h3>
                    <p>Linha do tempo unificada do lead.</p>
                  </div>
                  <span className="tag">#{selectedLead.id}</span>
                </div>
                {timelineEntries.map((entry) => (
                  <article key={entry.key} className={`timeline-item${entry.kind === "interaction" ? " is-interaction" : ""}`}>
                    <span className={`timeline-dot${entry.outcome && entry.outcome !== "NoReply" ? " is-positive" : ""}`} />
                    <div className="timeline-body">
                      <strong>{entry.title}</strong>
                      {entry.detail ? <p>{entry.detail}</p> : null}
                    </div>
                    <div className="timeline-meta">
                      <span>{formatDate(entry.at)}</span>
                      {entry.interactionId && canEdit ? (
                        <button type="button" className="timeline-remove" onClick={() => void handleDeleteInteraction(entry.interactionId!)} aria-label="Excluir contato">
                          ×
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {timelineEntries.length === 0 ? <div className="empty-card">Sem histórico encontrado.</div> : null}
              </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
