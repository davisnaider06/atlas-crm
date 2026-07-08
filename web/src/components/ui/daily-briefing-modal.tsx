"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import type { DailyBriefing } from "@/lib/types";

/** Mostra o briefing (meta + tarefas) uma vez por dia por usuário. */
const SEEN_PREFIX = "atlascrm.briefing.seen";

function todayKey(userId: number) {
  const now = new Date();
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return `${SEEN_PREFIX}.${userId}.${day}`;
}

const TASK_META: Record<string, { label: string; tone: string }> = {
  overdue_followup: { label: "Follow-up atrasado", tone: "danger" },
  today_followup: { label: "Follow-up de hoje", tone: "warn" },
  no_contact: { label: "Sem contato", tone: "info" },
  hot_no_next: { label: "Lead quente", tone: "warn" },
};

export function DailyBriefingModal() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    // Só busca/mostra se ainda não foi visto hoje.
    if (window.localStorage.getItem(todayKey(user.userId)) === "1") return;

    let cancelled = false;
    void api
      .getMyBriefing(token)
      .then((data) => {
        if (cancelled) return;
        setBriefing(data);
        setOpen(true);
      })
      .catch(() => {
        /* silencioso: o briefing é um extra, não bloqueia o uso do CRM */
      });
    return () => {
      cancelled = true;
    };
    // Depende apenas do token/usuário: roda uma vez por sessão de login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.userId]);

  const dismiss = () => {
    if (user) window.localStorage.setItem(todayKey(user.userId), "1");
    setOpen(false);
  };

  if (!open || !briefing) return null;

  const { goal, tasks, monthLabel } = briefing;
  const pct = Math.min(100, Math.max(0, goal.progressPct));
  const firstName = (goal.userName || user?.name || "").split(" ")[0];

  const goToLead = (leadId?: number | null) => {
    dismiss();
    if (leadId) router.push(`/leads?search=${encodeURIComponent(String(leadId))}`);
    else router.push("/hoje");
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={dismiss}>
      <div className="modal-panel briefing-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <h3>Bom dia, {firstName}! 👋</h3>
            <p>Seu resumo de {monthLabel} e as tarefas de hoje.</p>
          </div>
          <button type="button" className="table-action" onClick={dismiss}>
            Fechar
          </button>
        </div>

        <div className="modal-body">
          <section className="briefing-goal">
            <div className="briefing-goal-head">
              <span className="briefing-goal-label">Meta mensal</span>
              <strong className="briefing-goal-values">
                {formatCurrency(goal.achieved)}{" "}
                <span className="muted-mini">/ {formatCurrency(goal.monthlyTarget)}</span>
              </strong>
            </div>
            <div className="briefing-progress">
              <div
                className={`briefing-progress-fill${pct >= 100 ? " complete" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="briefing-goal-foot">
              <span>{goal.progressPct.toFixed(0)}% da meta</span>
              <span>
                {goal.remaining > 0
                  ? `Faltam ${formatCurrency(goal.remaining)}`
                  : "🎉 Meta batida!"}
              </span>
            </div>
          </section>

          <section className="briefing-tasks">
            <div className="briefing-tasks-head">
              <span className="briefing-goal-label">Tarefas de hoje</span>
              <span className="status-pill">{tasks.length}</span>
            </div>
            {tasks.length === 0 ? (
              <p className="briefing-empty">Nada pendente por aqui. Bom trabalho! ✅</p>
            ) : (
              <ul className="briefing-task-list">
                {tasks.slice(0, 8).map((task) => {
                  const meta = TASK_META[task.type] ?? { label: "Tarefa", tone: "info" };
                  return (
                    <li key={task.id}>
                      <button type="button" className="briefing-task" onClick={() => goToLead(task.leadId)}>
                        <span className={`briefing-task-dot tone-${meta.tone}`} />
                        <span className="briefing-task-body">
                          <strong>{task.leadName ?? task.title}</strong>
                          <span className="muted-mini">{meta.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {tasks.length > 8 ? (
                  <li className="briefing-more muted-mini">+{tasks.length - 8} outras tarefas</li>
                ) : null}
              </ul>
            )}
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={dismiss}>
            Depois
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              dismiss();
              router.push("/hoje");
            }}
          >
            Ver meu dia
          </button>
        </div>
      </div>
    </div>
  );
}
