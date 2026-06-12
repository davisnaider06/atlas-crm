"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { QuickContactActions } from "@/components/ui/quick-actions";
import { FUNNEL_STAGE_LABELS } from "@/lib/constants";
import { hasPermission, permissions } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";
import type { Lead, PagedResult } from "@/lib/types";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function dueInfo(iso: string): { label: string; tone: string } {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfToday() - due.getTime()) / 86400000);
  if (diffDays > 0) return { label: `Atrasado ${diffDays} dia${diffDays > 1 ? "s" : ""}`, tone: "danger" };
  if (diffDays === 0) return { label: "Vence hoje", tone: "gold" };
  return { label: formatDate(iso), tone: "blue" };
}

export default function HojePage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const canEdit = hasPermission(user, permissions.leadsEdit);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = (await api.getLeads(token, {})) as PagedResult<Lead>;
      setLeads(response.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar leads de hoje.";
      setError(message);
      notify({ type: "error", message, title: "Erro ao carregar" });
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  // Leads com follow-up vencido ou para hoje, do mais atrasado para o mais recente.
  const dueLeads = useMemo(() => {
    const limit = endOfToday();
    return leads
      .filter(
        (l) =>
          l.outcome === "None" &&
          !!l.nextFollowUpAtUtc &&
          new Date(l.nextFollowUpAtUtc).getTime() <= limit,
      )
      .sort((a, b) => new Date(a.nextFollowUpAtUtc!).getTime() - new Date(b.nextFollowUpAtUtc!).getTime());
  }, [leads]);

  const overdueCount = useMemo(
    () => dueLeads.filter((l) => dueInfo(l.nextFollowUpAtUtc!).tone === "danger").length,
    [dueLeads],
  );

  const handleAdvance = async (lead: Lead) => {
    if (!token) return;
    setSubmittingId(lead.id);
    try {
      const updated = await api.advanceLeadFollowUp(token, lead.id);
      await load();
      notify({
        type: "success",
        message: updated.isCold
          ? "Sem resposta após D+10 — lead marcado como Frio."
          : "Follow-up registrado e próxima data agendada.",
        title: "Follow-up",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao registrar follow-up.";
      notify({ type: "error", message, title: "Erro" });
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <LoadingState label="Carregando follow-ups de hoje..." />;
  if (error && leads.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="lead-command-card">
        <div>
          <p className="eyebrow">Comece o dia por aqui</p>
          <h2>Hoje · {dueLeads.length} follow-up{dueLeads.length === 1 ? "" : "s"} para fazer</h2>
        </div>
        <div className="lead-command-actions">
          <div className="lead-metrics">
            <article>
              <span>Total do dia</span>
              <strong>{dueLeads.length}</strong>
            </article>
            <article>
              <span>Atrasados</span>
              <strong>{overdueCount}</strong>
            </article>
          </div>
          <button type="button" className="ghost-button" onClick={() => void load()}>
            Atualizar
          </button>
        </div>
      </section>

      <section className="today-list">
        {dueLeads.map((lead) => {
          const info = dueInfo(lead.nextFollowUpAtUtc!);
          return (
            <article key={lead.id} className="today-card">
              <div className="today-card-main">
                <div className="today-card-head">
                  <strong>{lead.name}</strong>
                  <span className={`tag ${info.tone}`}>{info.label}</span>
                </div>
                <p className="today-card-sub">
                  {lead.companyName ? `${lead.companyName} · ` : ""}
                  {lead.channel || lead.source}
                </p>
                <p className="today-card-contact">{lead.contactHandle || lead.email || lead.phone || "Contato não informado"}</p>
                <div className="today-card-tags">
                  <span className="tag muted">{FUNNEL_STAGE_LABELS[lead.funnelStage] ?? lead.funnelStage}</span>
                  {lead.isCold ? <span className="tag muted">Frio</span> : null}
                  {lead.ownerName ? <span className="tag blue">{lead.ownerName}</span> : null}
                </div>
              </div>
              <div className="today-card-actions">
                <QuickContactActions phone={lead.phone} email={lead.email} name={lead.name} />
                {canEdit ? (
                  <button
                    type="button"
                    className="primary-button small"
                    onClick={() => void handleAdvance(lead)}
                    disabled={submittingId === lead.id}
                  >
                    {submittingId === lead.id ? "..." : "Registrar follow-up"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}

        {dueLeads.length === 0 ? (
          <div className="empty-card today-empty">
            <strong>Tudo em dia! 🎉</strong>
            <p>Nenhum follow-up vencido ou para hoje. Bom trabalho.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
