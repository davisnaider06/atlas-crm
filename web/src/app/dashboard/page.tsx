"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { LineChart, BarChart } from "@/components/ui/charts";
import { useNotification } from "@/components/ui/notification-context";
import type { Activity, Dashboard, Deal, Lead, PagedResult } from "@/lib/types";

type TrendPoint = { label: string; leads: number; deals: number };

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function buildTrend(leads: Lead[], deals: Deal[]): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const label = day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const leadCount = leads.filter((l) => startOfDay(l.createdAtUtc).getTime() === day.getTime()).length;
    const dealCount = deals.filter((d) => startOfDay(d.createdAtUtc).getTime() === day.getTime()).length;
    return { label, leads: leadCount, deals: dealCount };
  });
}

export default function DashboardPage() {
  const { token } = useAuth();
  const { notify } = useNotification();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, dealsData, leadsData, activitiesData] = await Promise.all([
        api.getDashboard(token),
        api.getDeals(token),
        api.getLeads(token),
        api.getActivities(token),
      ]);
      setDashboard(dashboardData);
      setDeals((dealsData as PagedResult<Deal>).items);
      setLeads((leadsData as PagedResult<Lead>).items);
      setActivities((activitiesData as PagedResult<Activity>).items);
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao carregar dashboard.";
      setError(message);
      notify({
        type: "error",
        title: status === 403 ? "Permissão negada" : "Erro ao carregar dashboard",
        message: status === 403 ? "Você não tem permissão para ver o dashboard." : message,
      });
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { void load(); }, [load]);

  const trend = useMemo(() => buildTrend(leads, deals), [leads, deals]);

  const sourceMix = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const lead of leads) grouped.set(lead.source, (grouped.get(lead.source) ?? 0) + 1);
    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [leads]);

  const recentLeads = useMemo(
    () => [...leads].sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc)).slice(0, 5),
    [leads],
  );

  const completionRate = useMemo(() => {
    if (activities.length === 0) return 0;
    return Math.round(
      (activities.filter((a) => a.status.toLowerCase().includes("completed")).length / activities.length) * 100,
    );
  }, [activities]);

  const leadsThisWeek = useMemo(
    () => leads.filter((l) => daysBetween(new Date(), new Date(l.createdAtUtc)) <= 7).length,
    [leads],
  );

  if (loading) return <LoadingState label="Carregando dashboard..." />;
  if (error || !dashboard) {
    return <ErrorState message={error ?? "Dashboard indisponível."} onRetry={() => void load()} />;
  }

  const statCards = [
    {
      label: "Total de leads",
      value: dashboard.totalLeads.toLocaleString("pt-BR"),
      note: `+${leadsThisWeek} nos últimos 7 dias`,
      tone: "orange",
    },
    {
      label: "Receita no pipeline",
      value: formatCurrency(dashboard.pipelineValue),
      note: `${dashboard.openDeals} negócios abertos`,
      tone: "gold",
    },
    {
      label: "Tarefas em aberto",
      value: String(dashboard.pendingActivities),
      note: `${completionRate}% concluídas no período`,
      tone: "blue",
    },
  ];

  const maxSource = Math.max(...sourceMix.map((s) => s.value), 1);

  return (
    <div className="dashboard-grid">
      <section className="hero-card">
        <div>
          <p className="hero-kicker">Performance comercial</p>
          <h2>Painel executivo do CRM</h2>
          <p className="hero-copy">
            Leads, pipeline e operação concentrados em um dashboard para tomada de decisão mais rápida.
          </p>
        </div>
        <div className="period-tabs">
          <button type="button" className="tab-chip">24h</button>
          <button type="button" className="tab-chip">7 dias</button>
          <button type="button" className="tab-chip active">30 dias</button>
          <button type="button" className="tab-chip">Ano</button>
        </div>
      </section>

      <section className="stats-strip">
        {statCards.map((card) => (
          <article key={card.label} className={`impact-card ${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </section>

      <section className="dashboard-panel wide">
        <div className="panel-heading">
          <div>
            <h3>Fluxo de leads vs negócios</h3>
            <p>Registros reais cadastrados nos últimos 7 dias.</p>
          </div>
          <button type="button" className="panel-link" onClick={() => void load()}>
            Atualizar
          </button>
        </div>
        <div className="legend-row dark">
          <span><i className="legend-dot warm" /> Leads criados</span>
          <span><i className="legend-dot cool" /> Negócios criados</span>
        </div>
        <LineChart trend={trend} />
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Etapas mais carregadas</h3>
            <p>Volume de negócios por etapa do pipeline.</p>
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

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Origem dos leads</h3>
            <p>Canais que mais abastecem a operação comercial.</p>
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

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Últimos leads</h3>
            <p>Entradas recentes do funil comercial.</p>
          </div>
        </div>
        <div className="mini-list">
          {recentLeads.length > 0 ? (
            recentLeads.map((lead) => (
              <article key={lead.id} className="mini-row">
                <div>
                  <strong>{lead.name}</strong>
                  <p>{lead.source}</p>
                </div>
                <span>{formatDate(lead.createdAtUtc)}</span>
              </article>
            ))
          ) : (
            <p className="empty-copy">Nenhum lead recente ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
