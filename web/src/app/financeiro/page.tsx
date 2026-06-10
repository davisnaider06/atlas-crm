"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate, formatCurrency } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { FinanceEntry, PagedResult } from "@/lib/types";
import { permissions, hasPermission } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";

export default function FinancePage() {
  const { token, user } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ occurredAtUtc: "", type: "income", category: "", amount: "", currency: "BRL", notes: "" });
  const { notify } = useNotification();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = (await api.getFinance(token)) as PagedResult<FinanceEntry>;
      setEntries(response.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar financeiro.";
      setError(message);
      notify({ type: "error", message, title: "Falha ao carregar financeiro" });
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createFinanceEntry(token, {
        occurredAtUtc: form.occurredAtUtc || new Date().toISOString(),
        type: form.type as any,
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency || "BRL",
        notes: form.notes || undefined,
      });
      setForm({ occurredAtUtc: "", type: "income", category: "", amount: "", currency: "BRL", notes: "" });
      await load();
        notify({ type: "success", message: "Registro financeiro criado.", title: "Sucesso" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar entrada financeira.";
      setError(message);
      notify({ type: "error", message, title: "Erro ao criar registro" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando registros financeiros..." />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const canManage = hasPermission(user, permissions.financeManage);

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <div>
          <h3>Financeiro</h3>
          <p>Registros de receitas e despesas da Atlas.</p>
        </div>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Entradas</h3>
              <p>Lista das últimas movimentações.</p>
            </div>
            <span className="tag">{entries.length}</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.occurredAtUtc)}</td>
                  <td>{e.type === "income" ? "Receita" : "Despesa"}</td>
                  <td>{e.category}</td>
                  <td>{formatCurrency(e.amount)}</td>
                  <td>{e.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 ? <div className="empty-card">Nenhum registro financeiro encontrado.</div> : null}
        </div>

        <form className="settings-card form-card" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <h3>Criar registro</h3>
              <p>Adicionar receita ou despesa.</p>
            </div>
            <span className="tag">{canManage ? "Admin" : "Visualização"}</span>
          </div>
          <label className="field">
            <span>Data</span>
            <input type="datetime-local" value={form.occurredAtUtc} onChange={(ev) => setForm((c) => ({ ...c, occurredAtUtc: ev.target.value }))} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={form.type} onChange={(ev) => setForm((c) => ({ ...c, type: ev.target.value }))}>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <input value={form.category} onChange={(ev) => setForm((c) => ({ ...c, category: ev.target.value }))} required />
          </label>
          <label className="field">
            <span>Valor</span>
            <input type="number" step="0.01" value={form.amount} onChange={(ev) => setForm((c) => ({ ...c, amount: ev.target.value }))} required />
          </label>
          <label className="field">
            <span>Moeda</span>
            <input value={form.currency} onChange={(ev) => setForm((c) => ({ ...c, currency: ev.target.value }))} />
          </label>
          <label className="field">
            <span>Notas</span>
            <textarea value={form.notes} onChange={(ev) => setForm((c) => ({ ...c, notes: ev.target.value }))} />
          </label>
          <div>
            {!canManage ? (
              <p className="muted-mini">Você não tem permissão para criar registros financeiros.</p>
            ) : (
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Salvando..." : "Criar registro"}
              </button>
            )}
            {error ? <p className="form-error">{error}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
