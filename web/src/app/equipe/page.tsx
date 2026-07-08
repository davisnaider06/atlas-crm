"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { Select } from "@/components/ui/select";
import { useNotification } from "@/components/ui/notification-context";
import { permissions } from "@/lib/permissions";
import type { PermissionCatalogItem, SdrGoal, TeamMember, UserRole } from "@/lib/types";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "Admin", label: "Administrador" },
  { value: "Manager", label: "Gestor" },
  { value: "Sales", label: "Vendedor" },
];

const defaultPermissionsByRole: Record<UserRole, string[]> = {
  Admin: Object.values(permissions),
  Manager: [
    permissions.dashboardView,
    permissions.leadsView,
    permissions.leadsCreate,
    permissions.leadsEdit,
    permissions.customersView,
    permissions.customersCreate,
    permissions.customersEdit,
    permissions.dealsView,
    permissions.dealsCreate,
    permissions.dealsEdit,
    permissions.activitiesView,
    permissions.activitiesCreate,
    permissions.activitiesEdit,
    permissions.documentsView,
    permissions.schedulesView,
    permissions.schedulesCreate,
    permissions.schedulesEdit,
  ],
  Sales: [
    permissions.dashboardView,
    permissions.leadsView,
    permissions.leadsCreate,
    permissions.leadsEdit,
    permissions.customersView,
    permissions.dealsView,
    permissions.dealsCreate,
    permissions.dealsEdit,
    permissions.activitiesView,
    permissions.activitiesCreate,
    permissions.activitiesEdit,
    permissions.schedulesView,
    permissions.schedulesCreate,
  ],
};

type MemberForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
};

const emptyForm: MemberForm = {
  name: "",
  email: "",
  password: "",
  role: "Sales",
  isActive: true,
  permissions: defaultPermissionsByRole.Sales,
};

export default function TeamPage() {
  const { token, user } = useAuth();
  const { notify } = useNotification();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [goals, setGoals] = useState<SdrGoal[]>([]);
  const [goalDrafts, setGoalDrafts] = useState<Record<number, string>>({});
  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [memberRes, catalogRes, goalsRes] = await Promise.all([
        api.getTeamMembers(token),
        api.getPermissionCatalog(token),
        api.getTeamGoals(token),
      ]);
      setMembers(memberRes);
      setCatalog(catalogRes);
      setGoals(goalsRes);
      setGoalDrafts(
        goalsRes.reduce<Record<number, string>>((acc, g) => {
          acc[g.userId] = String(g.monthlyTarget);
          return acc;
        }, {}),
      );
      setSelectedMember((cur) => cur ? memberRes.find((m) => m.id === cur.id) ?? null : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar equipe.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro ao carregar equipe" });
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedMember) { setForm(emptyForm); return; }
    setForm({
      name: selectedMember.name,
      email: selectedMember.email,
      password: "",
      role: selectedMember.role,
      isActive: selectedMember.isActive,
      permissions: selectedMember.permissions,
    });
  }, [selectedMember]);

  const groupedCatalog = useMemo(() => {
    return catalog.reduce<Record<string, PermissionCatalogItem[]>>((groups, item) => {
      groups[item.group] = [...(groups[item.group] ?? []), item];
      return groups;
    }, {});
  }, [catalog]);

  const activeMembers = members.filter((m) => m.isActive).length;

  const updateRole = (role: UserRole) => {
    setForm((cur) => ({
      ...cur,
      role,
      permissions: defaultPermissionsByRole[role],
    }));
  };

  const togglePermission = (permission: string) => {
    setForm((cur) => ({
      ...cur,
      permissions: cur.permissions.includes(permission)
        ? cur.permissions.filter((p) => p !== permission)
        : [...cur.permissions, permission],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      if (selectedMember) {
        await api.updateTeamMember(token, selectedMember.id, {
          name: form.name,
          password: form.password || undefined,
          role: form.role,
          isActive: form.isActive,
          permissions: form.permissions,
        });
      } else {
        await api.createTeamMember(token, {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          permissions: form.permissions,
        });
      }
      setSelectedMember(null);
      setForm(emptyForm);
      await load();
      notify({ type: "success", message: "Membro salvo com sucesso.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar membro.";
      setError(msg);
      notify({ type: "error", message: msg, title: "Erro ao salvar membro" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGoal = async (userId: number) => {
    if (!token) return;
    const raw = (goalDrafts[userId] ?? "").replace(/\./g, "").replace(",", ".");
    const target = Number(raw);
    if (!Number.isFinite(target) || target < 0) {
      notify({ type: "error", message: "Informe um valor de meta válido.", title: "Meta inválida" });
      return;
    }
    setSavingGoal(userId);
    try {
      const updated = await api.setSdrGoal(token, userId, target);
      setGoals((cur) => cur.map((g) => (g.userId === userId ? updated : g)));
      notify({ type: "success", message: "Meta atualizada.", title: "Sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar meta.";
      notify({ type: "error", message: msg, title: "Erro ao salvar meta" });
    } finally {
      setSavingGoal(null);
    }
  };

  if (loading) return <LoadingState label="Carregando equipe..." />;
  if (error && members.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="lead-command-card">
        <div>
          <p className="eyebrow">Controle de acesso</p>
          <h2>Funcionários, tipos de conta e permissões no mesmo lugar.</h2>
        </div>
        <div className="lead-metrics">
          <article>
            <span>Total</span>
            <strong>{members.length}</strong>
          </article>
          <article>
            <span>Ativos</span>
            <strong>{activeMembers}</strong>
          </article>
          <article>
            <span>Admins</span>
            <strong>{members.filter((m) => m.role === "Admin").length}</strong>
          </article>
        </div>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Membros da equipe</h3>
              <p>Selecione uma pessoa para editar acesso e permissões.</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => { setSelectedMember(null); setForm(emptyForm); }}
            >
              Novo membro
            </button>
          </div>

          <table className="table clickable-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className={selectedMember?.id === m.id ? "row-active" : ""}
                  onClick={() => setSelectedMember(m)}
                >
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.role}</td>
                  <td>{m.isActive ? "Ativo" : "Inativo"}</td>
                  <td>{formatDate(m.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>{selectedMember ? "Editar membro" : "Cadastrar membro"}</h3>
              <p>{selectedMember ? selectedMember.email : "Crie o acesso inicial do funcionário."}</p>
            </div>
            {selectedMember ? <span className="tag">#{selectedMember.id}</span> : <span className="tag">Novo</span>}
          </div>

          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={Boolean(selectedMember)}
              required
            />
          </label>
          <label className="field">
            <span>{selectedMember ? "Nova senha (opcional)" : "Senha"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!selectedMember}
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <Select
              value={form.role}
              onChange={(value) => updateRole(value as UserRole)}
              options={roleOptions.map((r) => ({ value: r.value, label: r.label }))}
            />
          </label>

          {selectedMember?.id !== user?.userId && (
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span>Membro ativo</span>
            </label>
          )}

          <div className="permission-groups">
            {Object.entries(groupedCatalog).map(([group, items]) => (
              <fieldset key={group} className="permission-group">
                <legend>{group}</legend>
                {items.map((perm) => (
                  <label key={perm.key} className="toggle-row">
                    <input
                      type="checkbox"
                      checked={form.role === "Admin" || form.permissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      disabled={form.role === "Admin"}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : selectedMember ? "Salvar membro" : "Cadastrar membro"}
          </button>
        </form>
      </section>

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>Metas mensais dos SDRs</h3>
            <p>Meta padrão de R$ 20.000/mês. O progresso vem dos contratos fechados no mês.</p>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>SDR</th>
              <th>Progresso</th>
              <th>Fechado no mês</th>
              <th>Meta (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const pct = Math.min(100, Math.max(0, g.progressPct));
              return (
                <tr key={g.userId}>
                  <td>{g.userName}</td>
                  <td style={{ minWidth: 160 }}>
                    <div className="briefing-progress" style={{ marginBottom: 4 }}>
                      <div
                        className={`briefing-progress-fill${pct >= 100 ? " complete" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="muted-mini">{g.progressPct.toFixed(0)}% · {g.wonDeals} fechado(s)</span>
                  </td>
                  <td>{formatCurrency(g.achieved)}</td>
                  <td>
                    <input
                      className="goal-input"
                      inputMode="numeric"
                      value={goalDrafts[g.userId] ?? ""}
                      onChange={(e) =>
                        setGoalDrafts((cur) => ({ ...cur, [g.userId]: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => void handleSaveGoal(g.userId)}
                      disabled={savingGoal === g.userId}
                    >
                      {savingGoal === g.userId ? "..." : "Salvar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {goals.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted-mini">Nenhum SDR ativo encontrado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
