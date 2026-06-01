"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { permissions } from "@/lib/permissions";
import type { PermissionCatalogItem, TeamMember, UserRole } from "@/lib/types";

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [memberResponse, catalogResponse] = await Promise.all([
        api.getTeamMembers(token),
        api.getPermissionCatalog(token),
      ]);
      setMembers(memberResponse);
      setCatalog(catalogResponse);
      setSelectedMember((current) => current ? memberResponse.find((item) => item.id === current.id) ?? null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedMember) {
      setForm(emptyForm);
      return;
    }

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

  const activeMembers = members.filter((member) => member.isActive).length;

  const updateRole = (role: UserRole) => {
    setForm((current) => ({
      ...current,
      role,
      permissions: role === "Admin" ? Object.values(permissions) : defaultPermissionsByRole[role],
    }));
  };

  const togglePermission = (permission: string) => {
    setForm((current) => {
      const hasCurrent = current.permissions.includes(permission);
      return {
        ...current,
        permissions: hasCurrent
          ? current.permissions.filter((item) => item !== permission)
          : [...current.permissions, permission],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar membro.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando equipe..." />;
  }

  if (error && members.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="lead-command-card">
        <div>
          <p className="eyebrow">Controle de acesso</p>
          <h2>Funcionarios, tipos de conta e permissoes no mesmo lugar.</h2>
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
            <strong>{members.filter((member) => member.role === "Admin").length}</strong>
          </article>
        </div>
      </section>

      <section className="two-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Membros da equipe</h3>
              <p>Selecione uma pessoa para editar acesso e permissoes.</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setSelectedMember(null);
                setForm(emptyForm);
              }}
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
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={selectedMember?.id === member.id ? "row-active" : ""}
                  onClick={() => setSelectedMember(member)}
                >
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.role}</td>
                  <td>{member.isActive ? "Ativo" : "Inativo"}</td>
                  <td>{formatDate(member.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="settings-card form-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>{selectedMember ? "Editar membro" : "Cadastrar membro"}</h3>
              <p>{selectedMember ? selectedMember.email : "Crie o acesso inicial do funcionario."}</p>
            </div>
            {selectedMember ? <span className="tag">#{selectedMember.id}</span> : <span className="tag">Novo</span>}
          </div>

          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              disabled={Boolean(selectedMember)}
              required
            />
          </label>
          <label className="field">
            <span>{selectedMember ? "Nova senha" : "Senha"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required={!selectedMember}
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={form.role} onChange={(event) => updateRole(event.target.value as UserRole)}>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {selectedMember?.id !== user?.userId ? (
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              <span>Membro ativo</span>
            </label>
          ) : null}

          <div className="permission-groups">
            {Object.entries(groupedCatalog).map(([group, items]) => (
              <fieldset key={group} className="permission-group">
                <legend>{group}</legend>
                {items.map((permission) => (
                  <label key={permission.key} className="toggle-row">
                    <input
                      type="checkbox"
                      checked={form.role === "Admin" || form.permissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      disabled={form.role === "Admin"}
                    />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : selectedMember ? "Salvar membro" : "Cadastrar membro"}
          </button>
        </form>
      </section>
    </div>
  );
}
