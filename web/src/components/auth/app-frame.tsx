"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { hasPermission, permissions } from "@/lib/permissions";
import {
  DashboardIcon,
  LeadsIcon,
  ClientsIcon,
  DocumentsIcon,
  FinanceIcon,
  PipelineIcon,
  ActivitiesIcon,
  WhatsAppIcon,
  TeamIcon,
  SettingsIcon,
  HelpIcon,
  LogoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
} from "@/components/ui/icons";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",         Icon: DashboardIcon,   permission: permissions.dashboardView },
  { href: "/leads",         label: "Leads",             Icon: LeadsIcon,       permission: permissions.leadsView },
  { href: "/clientes",      label: "Clientes",          Icon: ClientsIcon,     permission: permissions.customersView },
  { href: "/documentos",    label: "Documentos",        Icon: DocumentsIcon,   permission: permissions.documentsView },
  { href: "/financeiro",    label: "Financeiro",        Icon: FinanceIcon,     permission: permissions.financeManage },
  { href: "/pipeline",      label: "Pipeline",          Icon: PipelineIcon,    permission: permissions.dealsView },
  { href: "/atividades",    label: "Atividades",        Icon: ActivitiesIcon,  permission: permissions.activitiesView },
  { href: "/whatsapp",      label: "WhatsApp",          Icon: WhatsAppIcon,    permission: permissions.whatsAppManage },
  { href: "/equipe",        label: "Equipe",            Icon: TeamIcon,        permission: permissions.teamManage },
  { href: "/configuracoes", label: "Configurações",     Icon: SettingsIcon,    permission: permissions.settingsView },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Bom te ver de novo",
    subtitle: "Monitore o desempenho comercial e acompanhe o crescimento do time.",
  },
  "/leads": {
    title: "Gestão de leads",
    subtitle: "Organize entradas, filtros e responsáveis sem perder contexto.",
  },
  "/clientes": {
    title: "Base de clientes",
    subtitle: "Acompanhe contas convertidas e contatos ativos da operação.",
  },
  "/documentos": {
    title: "Materiais",
    subtitle: "Centralize arquivos, materiais e onboarding da Atlas.",
  },
  "/financeiro": {
    title: "Financeiro",
    subtitle: "Controle básico de receitas e despesas.",
  },
  "/pipeline": {
    title: "Controle do pipeline",
    subtitle: "Visualize cada oportunidade com mais clareza e espaço para agir.",
  },
  "/atividades": {
    title: "Fluxo de atividades",
    subtitle: "Priorize tarefas, follow-ups e próximos passos da operação.",
  },
  "/whatsapp": {
    title: "Conectar WhatsApp",
    subtitle: "Conecte a instância por QR Code e dispare campanhas com base em planilhas.",
  },
  "/configuracoes": {
    title: "Configurações",
    subtitle: "Controle integrações, automações e aparência do seu ambiente.",
  },
  "/equipe": {
    title: "Equipe e permissões",
    subtitle: "Cadastre funcionários e controle exatamente o que cada pessoa pode acessar.",
  },
};

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/leads?search=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm("");
  };

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
    if (!loading && user && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return <div className="screen-center">Carregando sessão...</div>;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return <div className="screen-center">Redirecionando para login...</div>;
  }

  const currentPage = pageTitles[pathname] ?? pageTitles["/dashboard"];
  const firstName = user.name.split(" ")[0];
  const allowedNavItems = navItems.filter((item) => hasPermission(user, item.permission));
  const currentNavItem = navItems.find((item) => item.href === pathname);
  const canViewCurrentPage = !currentNavItem || hasPermission(user, currentNavItem.permission);

  if (!canViewCurrentPage) {
    return <div className="screen-center">Você não tem permissão para acessar esta página.</div>;
  }

  return (
    <div className="shell-bg">
      <div className={`shell-panel rockart-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="sidebar rockart-sidebar">
          <div className="brand rockart-brand">
            <span className="brand-mark">A</span>
            {!sidebarCollapsed && (
              <div className="brand-copy">
                <strong>Atlas CRM</strong>
                <p className="muted-mini">Workspace comercial</p>
              </div>
            )}
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              {sidebarCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
            </button>
          </div>

          <nav className="nav rockart-nav">
            {!sidebarCollapsed && <p className="nav-group-title">Menu principal</p>}
            {allowedNavItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link rockart-link${pathname === href ? " active" : ""}`}
                title={sidebarCollapsed ? label : undefined}
              >
                <span className="icon-box">
                  <Icon size={17} />
                </span>
                {!sidebarCollapsed && <span className="nav-label">{label}</span>}
              </Link>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="sidebar-preferences">
              <p className="nav-group-title">Preferências</p>
              {hasPermission(user, permissions.settingsView) ? (
                <Link href="/configuracoes" className="nav-link rockart-link">
                  <span className="icon-box">
                    <HelpIcon size={17} />
                  </span>
                  <span className="nav-label">Central de ajuda</span>
                </Link>
              ) : null}
              <button type="button" className="nav-link rockart-link logout-link" onClick={logout}>
                <span className="icon-box">
                  <LogoutIcon size={17} />
                </span>
                <span className="nav-label">Sair</span>
              </button>
            </div>
          )}

          {!sidebarCollapsed && (
            <div className="sidebar-footer rockart-user">
              <div className="avatar-block">{firstName.slice(0, 1)}</div>
              <div className="user-copy">
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
            </div>
          )}
        </aside>

        <div className="main-shell rockart-main">
          <header className="topbar rockart-topbar">
            <div className="page-intro">
              <h1>
                {currentPage.title}, {firstName}!
              </h1>
              <p>{currentPage.subtitle}</p>
            </div>

            <div className="topbar-tools">
              <button type="button" className="theme-switch" onClick={toggleTheme} title="Alternar tema">
                {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
                <span>{theme === "light" ? "Escuro" : "Claro"}</span>
              </button>
              <form className="dashboard-search" onSubmit={handleSearch} role="search">
                <SearchIcon size={14} />
                <input
                  aria-label="Buscar no CRM"
                  placeholder="Buscar no CRM..."
                  value={searchTerm}
                  onChange={(ev) => setSearchTerm(ev.target.value)}
                  className="search-input"
                />
              </form>
              <span className="status-pill">{user.role}</span>
            </div>
          </header>

          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
