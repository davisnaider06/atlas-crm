"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Activity, Dashboard, Deal, Lead, PagedResult } from "@/lib/types";

type TrendPoint = {
  label: string;
  leads: number;
  deals: number;
};

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(a: Date, b: Date) {
  const difference = a.getTime() - b.getTime();
  return Math.floor(difference / (1000 * 60 * 60 * 24));
}

function buildTrend(leads: Lead[], deals: Deal[]): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const label = day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

    const leadCount = leads.filter((lead) => {
      const created = startOfDay(lead.createdAtUtc);
      return created.getTime() === day.getTime();
    }).length;

    const dealCount = deals.filter((deal) => {
      const created = startOfDay(deal.createdAtUtc);
      return created.getTime() === day.getTime();
    }).length;

    return { label, leads: leadCount, deals: dealCount };
  });
}

function buildPath(points: number[], width: number, height: number, padding: number) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points, 1);
  const step = (width - padding * 2) / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = padding + step * index;
      const y = height - padding - (point / maxValue) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function LineChart({ trend }: { trend: TrendPoint[] }) {
  const width = 640;
  const height = 260;
  const padding = 28;
  const leadPath = buildPath(trend.map((point) => point.leads), width, height, padding);
  const dealPath = buildPath(trend.map((point) => point.deals), width, height, padding);

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((line) => {
          const y = padding + ((height - padding * 2) / 4) * line;
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />;
        })}
        {trend.map((point, index) => {
          const x = padding + ((width - padding * 2) / Math.max(trend.length - 1, 1)) * index;
          return <line key={point.label} x1={x} y1={padding} x2={x} y2={height - padding} className="chart-grid-line subtle" />;
        })}
        <path d={leadPath} className="chart-line primary" />
        <path d={dealPath} className="chart-line secondary" />
      </svg>
      <div className="chart-axis">
        {trend.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rockart-bars">
      {items.map((item) => (
        <div key={item.label} className="rockart-bar-group">
          <div className="rockart-bar-track">
            <div className="rockart-bar-fill" style={{ height: `${(item.value / maxValue) * 100}%` }} />
          </div>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
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
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const trend = useMemo(() => buildTrend(leads, deals), [deals, leads]);

  const sourceMix = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const lead of leads) {
      grouped.set(lead.source, (grouped.get(lead.source) ?? 0) + 1);
    }
    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [leads]);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc))
        .slice(0, 5),
    [leads],
  );

  const completionRate = useMemo(() => {
    if (activities.length === 0) return 0;
    const completed = activities.filter((activity) => activity.status.toLowerCase().includes("completed")).length;
    return Math.round((completed / activities.length) * 100);
  }, [activities]);

  const leadsThisWeek = useMemo(() => {
    const now = new Date();
    return leads.filter((lead) => daysBetween(now, new Date(lead.createdAtUtc)) <= 7).length;
  }, [leads]);

  if (loading) return <LoadingState label="Carregando dashboard..." />;
  if (error || !dashboard) {
    return <ErrorState message={error ?? "Dashboard indisponivel."} onRetry={() => void load()} />;
  }

  const statCards = [
    {
      label: "Total de leads",
      value: dashboard.totalLeads.toLocaleString("pt-BR"),
      note: `${leadsThisWeek} entraram nos ultimos 7 dias`,
      tone: "orange",
    },
    {
      label: "Receita no pipeline",
      value: formatCurrency(dashboard.pipelineValue),
      note: `${dashboard.openDeals} negocios abertos`,
      tone: "gold",
    },
    {
      label: "Tarefas em aberto",
      value: String(dashboard.pendingActivities),
      note: `${completionRate}% concluidas no periodo`,
      tone: "blue",
    },
  ];

  return (
    <div className="dashboard-grid">
      <section className="hero-card">
        <div>
          <p className="hero-kicker">Performance comercial</p>
          <h2>Painel executivo do CRM</h2>
          <p className="hero-copy">
            Leads, pipeline e operacao concentrados em um dashboard mais claro para tomada de decisao.
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
            <h3>Fluxo de leads vs negocios</h3>
            <p>Os graficos abaixo usam os registros reais cadastrados nos ultimos dias.</p>
          </div>
          <button type="button" className="panel-link">
            Atualizar leitura
          </button>
        </div>
        <div className="legend-row dark">
          <span><i className="legend-dot warm" /> Leads criados</span>
          <span><i className="legend-dot cool" /> Negocios criados</span>
        </div>
        <LineChart trend={trend} />
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Etapas mais carregadas</h3>
            <p>Volume de negocios por etapa do pipeline.</p>
          </div>
        </div>
        <BarChart
          items={dashboard.stageSummary.length > 0
            ? dashboard.stageSummary.map((stage) => ({
                label: stage.stageName,
                value: stage.dealCount,
              }))
            : [{ label: "Sem dados", value: 0 }]}
        />
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Origem dos leads</h3>
            <p>Canais que mais abastecem a operacao comercial.</p>
          </div>
        </div>
        <div className="source-stack">
          {sourceMix.length > 0 ? (
            sourceMix.map((item) => {
              const maxValue = Math.max(...sourceMix.map((source) => source.value), 1);
              return (
                <div key={item.label} className="source-row">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.value} leads</span>
                  </div>
                  <div className="source-bar">
                    <span style={{ width: `${(item.value / maxValue) * 100}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-copy">Cadastre leads para ver os canais mais fortes aqui.</p>
          )}
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>Ultimos leads</h3>
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
