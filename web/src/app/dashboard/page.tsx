"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Dashboard, PagedResult, Deal, Lead } from "@/lib/types";

export default function DashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

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

  if (loading) {
    return <LoadingState label="Carregando dashboard..." />;
  }

  if (error || !dashboard) {
    return <ErrorState message={error ?? "Dashboard indisponivel."} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="panel hero">
        <p className="eyebrow">Visao geral</p>
        <h2>CRM conectado na API real com JWT, tenant e dados vivos do backend.</h2>
        <p>
          Esta visao ja reflete os endpoints protegidos. O que aparece aqui vem das consultas
          autenticadas da sua API ASP.NET.
        </p>
      </section>

      <section className="metrics">
        <article className="metric-card">
          <span>Leads ativos</span>
          <strong>{dashboard.totalLeads}</strong>
          <small>Consulta real do endpoint `dashboard`</small>
        </article>
        <article className="metric-card">
          <span>Negocios abertos</span>
          <strong>{dashboard.openDeals}</strong>
          <small>{formatCurrency(dashboard.pipelineValue)} em pipeline</small>
        </article>
        <article className="metric-card">
          <span>Atividades pendentes</span>
          <strong>{dashboard.pendingActivities}</strong>
          <small>Prioridades operacionais do tenant</small>
        </article>
        <article className="metric-card">
          <span>Etapas ativas</span>
          <strong>{dashboard.stageSummary.length}</strong>
          <small>Resumo por coluna do funil</small>
        </article>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Leads recentes</h3>
              <p>Primeiros registros vindos do endpoint `/leads`</p>
            </div>
            <span className="tag">{leads.length} itens</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Origem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead) => (
                <tr key={lead.id}>
                  <td className="mono">#{lead.id}</td>
                  <td>{lead.name}</td>
                  <td>{lead.source}</td>
                  <td>{lead.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Resumo por etapa</h3>
              <p>Pipeline agregado pelo backend</p>
            </div>
            <span className="tag">Analytics</span>
          </div>

          <div className="timeline">
            {dashboard.stageSummary.map((stage) => (
              <article key={stage.stageName} className="timeline-item">
                <strong>{stage.stageName}</strong>
                <p>{stage.dealCount} negocios</p>
                <span>{formatCurrency(stage.totalValue)}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>Negocios recentes</h3>
            <p>Vindo do endpoint `/negocios` com nome do lead e etapa atual</p>
          </div>
          <span className="tag">{deals.length} itens</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Etapa</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>{deal.leadName}</td>
                <td>{deal.stageName}</td>
                <td>{deal.status}</td>
                <td>{formatCurrency(deal.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
