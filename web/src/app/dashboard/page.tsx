"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Dashboard, Deal, Lead, PagedResult } from "@/lib/types";

function LineChart() {
  return (
    <svg viewBox="0 0 420 220" className="chart-svg" aria-hidden="true">
      <defs>
        <linearGradient id="lineFillOne" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(91, 101, 255, 0.28)" />
          <stop offset="100%" stopColor="rgba(91, 101, 255, 0)" />
        </linearGradient>
        <linearGradient id="lineFillTwo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(180, 132, 255, 0.2)" />
          <stop offset="100%" stopColor="rgba(180, 132, 255, 0)" />
        </linearGradient>
      </defs>
      {[40, 100, 160, 220, 280, 340].map((x) => (
        <line key={x} x1={x} y1="18" x2={x} y2="200" className="chart-grid-line" />
      ))}
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="20" y1={y} x2="400" y2={y} className="chart-grid-line" />
      ))}
      <path d="M20 160 C60 130, 95 145, 130 115 S210 145, 240 105 S315 70, 400 115 L400 200 L20 200 Z" fill="url(#lineFillOne)" />
      <path d="M20 130 C55 90, 100 165, 145 120 S230 70, 270 85 S335 160, 400 125" className="chart-line primary" />
      <path d="M20 160 C60 130, 95 145, 130 115 S210 145, 240 105 S315 70, 400 115" className="chart-line secondary" />
      <path d="M20 118 C55 140, 105 70, 145 148 S230 118, 270 110 S335 84, 400 92 L400 200 L20 200 Z" fill="url(#lineFillTwo)" />
      <path d="M20 118 C55 140, 105 70, 145 148 S230 118, 270 110 S335 84, 400 92" className="chart-line tertiary" />
    </svg>
  );
}

function BarChart({ deals }: { deals: Deal[] }) {
  const stageTotals = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const deal of deals) {
      grouped.set(deal.stageName, (grouped.get(deal.stageName) ?? 0) + 1);
    }
    return Array.from(grouped.entries()).slice(0, 4);
  }, [deals]);

  const max = Math.max(...stageTotals.map(([, value]) => value), 1);

  return (
    <div className="bar-chart">
      {stageTotals.map(([label, value], index) => (
        <div key={label} className="bar-group">
          <div className="bars">
            <div className="bar ghost" style={{ height: `${(value / max) * 72}%` }} />
            <div className={`bar solid tone-${index + 1}`} style={{ height: `${(value / max) * 100}%` }} />
          </div>
          <span>{label}</span>
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const [dashboardData, dealsData, leadsData] = await Promise.all([
        api.getDashboard(token),
        api.getDeals(token),
        api.getLeads(token),
      ]);

      setDashboard(dashboardData);
      setDeals((dealsData as PagedResult<Deal>).items);
      setLeads((leadsData as PagedResult<Lead>).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Carregando dashboard..." />;
  if (error || !dashboard) {
    return <ErrorState message={error ?? "Dashboard indisponivel."} onRetry={() => void load()} />;
  }

  const deliveryCards = [
    { title: "Delivered Rate", value: `${dashboard.totalLeads}%`, note: "Lead flow" },
    { title: "Hard Bounce Rate", value: `${dashboard.openDeals}%`, note: "Open deals" },
    { title: "Unsubscribed Rate", value: `${dashboard.pendingActivities}%`, note: "Pending tasks" },
    { title: "Spam Report Rate", value: `${dashboard.stageSummary.length}.0%`, note: "Active stages" },
  ];

  return (
    <div className="analytics-grid">
      <section className="surface-card section-card">
        <div className="section-title">
          <h3>Email Analytics</h3>
        </div>

        <div className="stats-row">
          <article className="stat-box">
            <span>Sent</span>
            <strong>{dashboard.totalLeads.toLocaleString("pt-BR")}</strong>
            <small>{leads.length} contacts</small>
          </article>
          <article className="stat-box">
            <span>Open Rate</span>
            <strong>{dashboard.openDeals.toFixed(2)}%</strong>
            <small>{deals.length} opened</small>
          </article>
          <article className="stat-box">
            <span>Click Rate</span>
            <strong>{((dashboard.pendingActivities / Math.max(dashboard.totalLeads, 1)) * 100).toFixed(2)}%</strong>
            <small>{dashboard.pendingActivities} pending</small>
          </article>
          <article className="stat-box">
            <span>Click Through</span>
            <strong>{((dashboard.pipelineValue / Math.max(dashboard.totalLeads, 1)) / 1000).toFixed(2)}%</strong>
            <small>{formatCurrency(dashboard.pipelineValue)}</small>
          </article>
        </div>
      </section>

      <section className="surface-card section-card">
        <div className="section-header">
          <h3>Delivery</h3>
          <button type="button" className="link-button">
            Save report
          </button>
        </div>
        <div className="delivery-grid">
          {deliveryCards.map((card) => (
            <article key={card.title} className="metric-tile">
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
              <div className="spark-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card chart-card">
        <div className="section-header stacked">
          <div>
            <h3>Email Data Chart</h3>
            <p>Open rate and click-through trend</p>
          </div>
          <div className="legend-row">
            <span><i className="legend-dot primary" /> Click through rate</span>
            <span><i className="legend-dot tertiary" /> Open rate</span>
          </div>
        </div>
        <LineChart />
      </section>

      <section className="surface-card chart-card">
        <div className="section-header stacked">
          <div>
            <h3>Performance By Device Type</h3>
            <p>Negocios por etapa no pipeline</p>
          </div>
          <div className="legend-row">
            <span><i className="legend-dot primary" /> Opened</span>
            <span><i className="legend-dot soft" /> Clicks</span>
          </div>
        </div>
        <BarChart deals={deals} />
      </section>
    </div>
  );
}
