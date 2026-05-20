"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/leads", label: "Leads", icon: "L" },
  { href: "/clientes", label: "Clientes", icon: "C" },
  { href: "/documentos", label: "Documentos", icon: "D" },
  { href: "/pipeline", label: "Pipeline", icon: "P" },
  { href: "/atividades", label: "Atividades", icon: "A" },
  { href: "/whatsapp", label: "Conectar WhatsApp", icon: "W" },
  { href: "/configuracoes", label: "Configuracoes", icon: "S" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Bom te ver de novo",
    subtitle: "Monitore o desempenho comercial e acompanhe o crescimento do time.",
  },
  "/leads": {
    title: "Gestao de leads",
    subtitle: "Organize entradas, filtros e responsaveis sem perder contexto.",
  },
  "/clientes": {
    title: "Base de clientes",
    subtitle: "Acompanhe contas convertidas e contatos ativos da operacao.",
  },
  "/documentos": {
    title: "Documentos",
    subtitle: "Centralize arquivos e links importantes da Atlas.",
  },
  "/pipeline": {
    title: "Controle do pipeline",
    subtitle: "Visualize cada oportunidade com mais clareza e espaco para agir.",
  },
  "/atividades": {
    title: "Fluxo de atividades",
    subtitle: "Priorize tarefas, follow-ups e proximos passos da operacao.",
  },
  "/whatsapp": {
    title: "Conectar WhatsApp",
    subtitle: "Conecte a instancia por QR Code e dispare campanhas com base em planilhas.",
  },
  "/configuracoes": {
    title: "Configuracoes",
    subtitle: "Controle integracoes, automacoes e aparencia do seu ambiente.",
  },
};

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
    if (!loading && user && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return <div className="screen-center">Carregando sessao...</div>;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return <div className="screen-center">Redirecionando para login...</div>;
  }

  const currentPage = pageTitles[pathname] ?? pageTitles["/dashboard"];
  const firstName = user.name.split(" ")[0];

  return (
    <div className="shell-bg">
      <div className={`shell-panel rockart-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="sidebar rockart-sidebar">
          <div className="brand rockart-brand">
            <span className="brand-mark">A</span>
            <div className="brand-copy">
              <strong>Atlas CRM</strong>
              <p className="muted-mini">Workspace comercial</p>
            </div>
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              {sidebarCollapsed ? ">" : "<"}
            </button>
          </div>

          <nav className="nav rockart-nav">
            <p className="nav-group-title">Menu principal</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link rockart-link${pathname === item.href ? " active" : ""}`}
              >
                <span className="icon-box">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-preferences">
            <p className="nav-group-title">Preferencias</p>
            <Link href="/configuracoes" className="nav-link rockart-link">
              <span className="icon-box">?</span>
              <span className="nav-label">Central de ajuda</span>
            </Link>
            <button type="button" className="nav-link rockart-link logout-link" onClick={logout}>
              <span className="icon-box">X</span>
              <span className="nav-label">Sair</span>
            </button>
          </div>

          <div className="sidebar-footer rockart-user">
            <div className="avatar-block">{firstName.slice(0, 1)}</div>
            <div className="user-copy">
              <strong>{user.name}</strong>
              <p>{user.email}</p>
            </div>
          </div>
        </aside>

        <div className="main-shell rockart-main">
          <header className="topbar rockart-topbar">
            <div className="page-intro">
              <h1>{currentPage.title}, {firstName}!</h1>
              <p>{currentPage.subtitle}</p>
            </div>

            <div className="topbar-tools">
              <button type="button" className="theme-switch" onClick={toggleTheme}>
                {theme === "light" ? "Modo escuro" : "Modo claro"}
              </button>
              <div className="dashboard-search">
                <span className="search-icon" />
                <span>Buscar no CRM...</span>
              </div>
              <span className="status-pill">{user.role}</span>
            </div>
          </header>

          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
