"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useCachedResource } from "@/lib/data-cache";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { BarChart } from "@/components/ui/charts";
import { useNotification } from "@/components/ui/notification-context";
import type { Activity, Dashboard, Lead, PagedResult } from "@/lib/types";

const PERIOD_NEW_LEADS_LABEL: Record<string, string> = {
  "24h": "nas últimas 24h",
  "7d": "nos últimos 7 dias",
  "30d": "nos últimos 30 dias",
  year: "no último ano",
};

const PERIOD_TREND_LABEL: Record<string, string> = {
  "24h": "Criados nas últimas 24 horas (por hora).",
  "7d": "Criados nos últimos 7 dias.",
  "30d": "Criados nos últimos 30 dias.",
  year: "Criados nos últimos 12 meses (por mês).",
};

export default function DashboardPage() {
  const { token } = useAuth();
  const { notify } = useNotification();
  const [activePeriod, setActivePeriod] = useState("30d");

  // Cache SWR: ao voltar para o dashboard os dados aparecem na hora e só
  // revalidam em segundo plano — sem spinner a cada troca de aba.
  const dashboardRes = useCachedResource(
    token ? `dashboard:${activePeriod}` : null,
    () => api.getDashboard(token as string, activePeriod),
    { enabled: !!token },
  );
  const leadsRes = useCachedResource(
    token ? "dashboard:leads" : null,
    () => api.getLeads(token as string) as Promise<PagedResult<Lead>>,
    { enabled: !!token },
  );
  const activitiesRes = useCachedResource(
    token ? "dashboard:activities" : null,
    () => api.getActivities(token as string) as Promise<PagedResult<Activity>>,
    { enabled: !!token },
  );
  const briefingRes = useCachedResource(
    token ? "dashboard:my-goal" : null,
    () => api.getMyBriefing(token as string),
    { enabled: !!token },
  );

  const dashboard = dashboardRes.data ?? null;
  const leads = useMemo(() => leadsRes.data?.items ?? [], [leadsRes.data]);
  const activities = useMemo(() => activitiesRes.data?.items ?? [], [activitiesRes.data]);
  const loading = dashboardRes.loading || leadsRes.loading || activitiesRes.loading;
  const error = dashboardRes.error || leadsRes.error || activitiesRes.error;

  const load = useCallback(() => {
    void dashboardRes.reload();
    void leadsRes.reload();
    void activitiesRes.reload();
  }, [dashboardRes.reload, leadsRes.reload, activitiesRes.reload]);

  // Notifica falhas de carregamento (mantém o comportamento anterior).
  useEffect(() => {
    if (error) notify({ type: "error", title: "Erro ao carregar dashboard", message: error });
  }, [error, notify]);

  const sourceMix = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const l of leads) grouped.set(l.source, (grouped.get(l.source) ?? 0) + 1);
    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [leads]);

  const recentLeads = useMemo(
    () => [...leads].sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc)).slice(0, 6),
    [leads],
  );

  const completionRate = useMemo(() => {
    if (activities.length === 0) return 0;
    return Math.round(
      (activities.filter((a) => a.status.toLowerCase().includes("completed")).length / activities.length) * 100,
    );
  }, [activities]);

  if (loading) return <LoadingState label="Carregando dashboard..." />;
  if (error || !dashboard) return <ErrorState message={error ?? "Dashboard indisponível."} onRetry={() => void load()} />;

  const maxSource = Math.max(...sourceMix.map((s) => s.value), 1);
  const trend = dashboard.periodTrend ?? [];
  const periodNewLeadsLabel = PERIOD_NEW_LEADS_LABEL[activePeriod] ?? "no período";
  const myGoal = briefingRes.data?.goal ?? null;
  const goalPct = myGoal ? Math.min(100, Math.max(0, myGoal.progressPct)) : 0;

  return (
    <div className="dashboard-grid">

      {/* Period selector */}
      <section className="dashboard-period-bar">
        <div className="period-tabs">
          {[
            { key: "24h", label: "24h" },
            { key: "7d", label: "7 dias" },
            { key: "30d", label: "30 dias" },
            { key: "year", label: "Ano" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              className={`tab-chip${activePeriod === p.key ? " active" : ""}`}
              onClick={() => setActivePeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="ghost-button small" onClick={() => void load()}>
          Atualizar
        </button>
      </section>

      {/* KPI cards */}
      <section className="stats-strip">
        <article className="impact-card featured">
          <span>Total de leads</span>
          <strong>{dashboard.totalLeads.toLocaleString("pt-BR")}</strong>
          <small>+{dashboard.periodNewLeads} {periodNewLeadsLabel}</small>
        </article>
        <article className="impact-card gold">
          <span>Receita no pipeline</span>
          <strong>{formatCurrency(dashboard.pipelineValue)}</strong>
          <small>{dashboard.openDeals} negócios abertos</small>
        </article>
        <article className="impact-card blue">
          <span>Tarefas em aberto</span>
          <strong>{dashboard.pendingActivities}</strong>
          <small>{completionRate}% concluídas no período</small>
        </article>
      </section>

      {/* Minha meta mensal */}
      {myGoal ? (
        <section className="dashboard-panel wide goal-panel">
          <div className="panel-heading">
            <div>
              <h3>Minha meta do mês</h3>
              <p>Progresso puxado dos contratos fechados no mês.</p>
            </div>
            <span className="status-pill">{myGoal.progressPct.toFixed(0)}%</span>
          </div>
          <div className="goal-panel-values">
            <strong>{formatCurrency(myGoal.achieved)}</strong>
            <span className="muted-mini">de {formatCurrency(myGoal.monthlyTarget)}</span>
          </div>
          <div className="briefing-progress">
            <div
              className={`briefing-progress-fill${goalPct >= 100 ? " complete" : ""}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <div className="goal-panel-foot">
            <span>{myGoal.wonDeals} contrato(s) fechado(s)</span>
            <span>
              {myGoal.remaining > 0
                ? `Faltam ${formatCurrency(myGoal.remaining)}`
                : "🎉 Meta batida!"}
            </span>
          </div>
        </section>
      ) : null}

      {/* Métricas do processo comercial (automáticas) */}
      <section className="dashboard-panel wide">
        <div className="panel-heading">
          <div>
            <h3>Processo comercial</h3>
            <p>Métricas automáticas — semana atual e mês corrente.</p>
          </div>
        </div>
        <div className="lead-metrics commercial-metrics">
          <article>
            <span>Mensagens enviadas (semana)</span>
            <strong>{dashboard.weeklyMessagesSent}</strong>
            <small>leads movidos para Prospectado</small>
          </article>
          <article>
            <span>Taxa de resposta (semana)</span>
            <strong>{Math.round((dashboard.weeklyResponseRate || 0) * 100)}%</strong>
            <small>{dashboard.weeklyReplies} responderam</small>
          </article>
          <article>
            <span>Reuniões agendadas (semana)</span>
            <strong>{dashboard.weeklyMeetingsScheduled}</strong>
          </article>
          <article>
            <span>Propostas enviadas (semana)</span>
            <strong>{dashboard.weeklyProposalsSent}</strong>
          </article>
          <article>
            <span>Fechamentos (mês)</span>
            <strong>{dashboard.monthlyClosedWon}</strong>
          </article>
          <article className="metric-highlight">
            <span>Receita do mês</span>
            <strong>{formatCurrency(dashboard.monthlyRevenue)}</strong>
            <small>puxada do financeiro</small>
          </article>
        </div>
      </section>

      {/* Charts row */}
      <section className="dashboard-panel wide">
        <div className="panel-heading">
          <div>
            <h3>Fluxo de leads vs negócios</h3>
            <p>{PERIOD_TREND_LABEL[activePeriod] ?? "Registros criados no período."}</p>
          </div>
        </div>
        <div className="legend-row dark">
          <span><i className="legend-dot warm" /> Leads criados</span>
          <span><i className="legend-dot cool" /> Negócios criados</span>
        </div>
        <div className="mini-bar-chart">
          {trend.map((point) => {
            const maxVal = Math.max(...trend.map((t) => Math.max(t.leads, t.deals)), 1);
            return (
              <div key={point.label} className="mini-bar-col">
                <div className="mini-bar-pair">
                  <div className="mini-bar accent" style={{ height: `${(point.leads / maxVal) * 100}%` }} />
                  <div className="mini-bar cool" style={{ height: `${(point.deals / maxVal) * 100}%` }} />
                </div>
                <span>{point.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Etapas do pipeline</h3>
            <p>Volume por etapa.</p>
          </div>
        </div>
        <BarChart
          items={
            dashboard.stageSummary.length > 0
              ? dashboard.stageSummary.map((s) => ({ label: s.stageName, value: s.dealCount }))
              : [{ label: "Sem dados", value: 0 }]
          }
        />
      </section>

      <section className="dashboard-panel wide">
        <div className="panel-heading">
          <div>
            <h3>Conversão por etapa</h3>
            <p>Quantos leads alcançam cada etapa e onde abandonam o funil.</p>
          </div>
        </div>
        {(() => {
          const stages = dashboard.funnelConversion ?? [];
          const top = stages[0]?.reachedCount ?? 0;
          if (stages.length === 0 || top === 0) {
            return <div className="empty-card">Sem movimentação de etapas ainda.</div>;
          }
          return (
            <div className="funnel-list">
              {stages.map((s, i) => {
                const widthPct = top > 0 ? Math.max(4, Math.round((s.reachedCount / top) * 100)) : 0;
                const next = stages[i + 1];
                return (
                  <div className="funnel-row" key={s.stageName}>
                    <div className="funnel-row-head">
                      <span className="funnel-stage-name">{s.order}. {s.stageName}</span>
                      <span className="funnel-stage-count">{s.reachedCount} leads</span>
                    </div>
                    <div className="funnel-bar-track">
                      <div className="funnel-bar-fill" style={{ width: `${widthPct}%` }} />
                    </div>
                    {next ? (
                      <div className="funnel-row-foot">
                        <span>Conversão p/ próxima: <strong>{Math.round(s.conversionRate * 100)}%</strong></span>
                        {s.droppedCount > 0 ? <span className="funnel-drop">−{s.droppedCount} abandonaram</span> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* Bottom row */}
      <section className="dashboard-panel wide">
        <div className="panel-heading">
          <div>
            <h3>Últimos leads</h3>
            <p>Entradas recentes do funil comercial.</p>
          </div>
          <span className="tag">{leads.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Temperatura</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {recentLeads.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.name}</strong></td>
                <td>{l.source}</td>
                <td>{l.status}</td>
                <td>{l.qualificationTemperature}</td>
                <td>{formatDate(l.createdAtUtc)}</td>
              </tr>
            ))}
            {recentLeads.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>Nenhum lead cadastrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Canais de origem</h3>
            <p>Fontes que mais trazem leads.</p>
          </div>
        </div>
        <div className="source-stack">
          {sourceMix.length > 0 ? (
            sourceMix.map((item) => (
              <div key={item.label} className="source-row">
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value} leads</span>
                </div>
                <div className="source-bar">
                  <span style={{ width: `${(item.value / maxSource) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="empty-copy">Cadastre leads para ver os canais mais fortes aqui.</p>
          )}
        </div>
      </section>

    </div>
  );
}
