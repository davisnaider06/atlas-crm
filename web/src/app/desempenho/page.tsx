"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { useNotification } from "@/components/ui/notification-context";
import type { SellerPerformance } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = { Admin: "Administrador", Manager: "Gerente", Sales: "Vendedor" };

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

function GoalBar({
  label,
  current,
  target,
  pct,
  money,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
  money?: boolean;
}) {
  const reached = pct >= 100;
  const remaining = Math.max(0, target - current);
  const fmt = (n: number) => (money ? formatCurrency(n) : String(n));
  return (
    <div className="goal-block">
      <div className="goal-head">
        <span>{label}</span>
        <strong className={reached ? "good" : ""}>
          {fmt(current)} <em>/ {fmt(target)}</em>
        </strong>
      </div>
      <div className="goal-track">
        <div className={`goal-fill${reached ? " done" : ""}`} style={{ width: `${clampPct(pct)}%` }} />
      </div>
      <small className="goal-meta">{reached ? "Meta batida 🎉" : `${Math.round(pct)}% — faltam ${fmt(remaining)}`}</small>
    </div>
  );
}

function SellerCard({
  seller,
  canEditGoal,
  onSaveGoal,
}: {
  seller: SellerPerformance;
  canEditGoal: boolean;
  onSaveGoal: (userId: number, revenueTarget: number, meetingsTarget: number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [revenue, setRevenue] = useState(String(seller.revenueTarget));
  const [meetings, setMeetings] = useState(String(seller.meetingsTarget));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSaveGoal(seller.userId, Number(revenue) || 0, Number(meetings) || 0);
    setSaving(false);
    if (ok) setEditing(false);
  };

  const tiles: { label: string; value: string }[] = [
    { label: "Total de leads", value: String(seller.totalLeads) },
    { label: "Em aberto", value: String(seller.openLeads) },
    { label: "Ganhos", value: String(seller.won) },
    { label: "Perdidos", value: String(seller.lost) },
    { label: "Frios", value: String(seller.cold) },
    { label: "Conversão", value: `${seller.conversionRate.toFixed(1)}%` },
    { label: "Ticket médio", value: formatCurrency(seller.avgTicket) },
    { label: "Follow-ups atrasados", value: String(seller.overdueFollowUps) },
    { label: "Receita total", value: formatCurrency(seller.revenueTotal) },
  ];

  return (
    <article className="perf-card">
      <header className="perf-card-head">
        <div>
          <strong>{seller.name}</strong>
          <span className="tag">{ROLE_LABELS[seller.role] ?? seller.role}</span>
        </div>
        {canEditGoal ? (
          <button type="button" className="table-action" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancelar" : "Editar meta"}
          </button>
        ) : null}
      </header>

      <div className="perf-goals">
        <GoalBar label="Faturamento (mês)" current={seller.revenueMonth} target={seller.revenueTarget} pct={seller.revenueProgressPct} money />
        <GoalBar label="Reuniões agendadas (mês)" current={seller.meetingsScheduledMonth} target={seller.meetingsTarget} pct={seller.meetingsProgressPct} />
      </div>

      {editing ? (
        <form className="perf-goal-form" onSubmit={handleSave}>
          <label className="field compact">
            <span>Meta de faturamento (R$)</span>
            <input type="number" min="0" step="100" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </label>
          <label className="field compact">
            <span>Meta de reuniões</span>
            <input type="number" min="0" value={meetings} onChange={(e) => setMeetings(e.target.value)} />
          </label>
          <button type="submit" className="primary-button small" disabled={saving}>
            {saving ? "Salvando..." : "Salvar meta"}
          </button>
        </form>
      ) : null}

      <div className="perf-metrics">
        {tiles.map((t) => (
          <div key={t.label} className="perf-tile">
            <span>{t.label}</span>
            <strong>{t.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function DesempenhoPage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();
  const isManagerial = user?.role === "Admin" || user?.role === "Manager";
  const isAdmin = user?.role === "Admin";

  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [team, setTeam] = useState<
    { revenueMonth: number; meetingsMonth: number; revenueTarget: number; meetingsTarget: number; period: string } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (isManagerial) {
        const overview = await api.getPerformanceOverview(token);
        setSellers(overview.sellers);
        setTeam({
          revenueMonth: overview.teamRevenueMonth,
          meetingsMonth: overview.teamMeetingsMonth,
          revenueTarget: overview.teamRevenueTarget,
          meetingsTarget: overview.teamMeetingsTarget,
          period: monthLabel(overview.year, overview.month),
        });
      } else {
        const me = await api.getMyPerformance(token);
        setSellers([me]);
        setTeam(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar desempenho.");
    } finally {
      setLoading(false);
    }
  }, [token, isManagerial]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveGoal = async (userId: number, revenueTarget: number, meetingsTarget: number): Promise<boolean> => {
    if (!token) return false;
    try {
      const updated = await api.setSalesGoal(token, userId, { revenueTarget, meetingsTarget });
      setSellers((cur) => cur.map((s) => (s.userId === userId ? updated : s)));
      notify({ type: "success", message: "Meta atualizada.", title: "Meta" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar meta.";
      notify({ type: "error", message, title: "Erro" });
      return false;
    }
  };

  if (loading) return <LoadingState label="Carregando desempenho..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      {team ? (
        <section className="table-card">
          <div className="card-header">
            <div>
              <h3>Time comercial — {team.period}</h3>
              <p>Resultado consolidado do mês contra a soma das metas dos vendedores.</p>
            </div>
            <span className="tag">{sellers.length} vendedores</span>
          </div>
          <div className="perf-goals team-goals">
            <GoalBar
              label="Faturamento do time (mês)"
              current={team.revenueMonth}
              target={team.revenueTarget}
              pct={team.revenueTarget > 0 ? (team.revenueMonth / team.revenueTarget) * 100 : 0}
              money
            />
            <GoalBar
              label="Reuniões agendadas (mês)"
              current={team.meetingsMonth}
              target={team.meetingsTarget}
              pct={team.meetingsTarget > 0 ? (team.meetingsMonth / team.meetingsTarget) * 100 : 0}
            />
          </div>
        </section>
      ) : null}

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>{isManagerial ? "Desempenho por vendedor" : "Meu desempenho"}</h3>
            <p>
              {isManagerial
                ? "Acompanhe metas e resultados de cada vendedor. Edite as metas pelo botão de cada card."
                : "Acompanhe suas metas do mês e seus números."}
            </p>
          </div>
        </div>
        <div className="perf-grid">
          {sellers.map((s) => (
            <SellerCard key={s.userId} seller={s} canEditGoal={isAdmin} onSaveGoal={handleSaveGoal} />
          ))}
          {sellers.length === 0 ? <div className="empty-card">Nenhum vendedor ativo ainda.</div> : null}
        </div>
      </section>
    </div>
  );
}
