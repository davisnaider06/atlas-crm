"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "O" },
  { href: "/leads", label: "Leads", icon: "L" },
  { href: "/pipeline", label: "Pipeline", icon: "P" },
  { href: "/atividades", label: "Activities", icon: "A" },
  { href: "/whatsapp", label: "Conectar WhatsApp", icon: "W" },
  { href: "/configuracoes", label: "Settings", icon: "S" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Good to see you again",
    subtitle: "Monitore o desempenho comercial e acompanhe o crescimento do time.",
  },
  "/leads": {
    title: "Lead management",
    subtitle: "Organize entradas, filtros e responsaveis sem perder contexto.",
  },
  "/pipeline": {
    title: "Pipeline control",
    subtitle: "Visualize cada oportunidade com mais clareza e espaco para agir.",
  },
  "/atividades": {
    title: "Activity flow",
    subtitle: "Priorize tarefas, follow-ups e proximos passos da operacao.",
  },
  "/whatsapp": {
    title: "Connect WhatsApp",
    subtitle: "Conecte a instancia por QR Code e dispare campanhas com base em planilhas.",
  },
  "/configuracoes": {
    title: "Workspace settings",
    subtitle: "Controle integracoes, automacoes e aparencia do seu ambiente.",
  },
};

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

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
      <div className="shell-panel rockart-shell">
        <aside className="sidebar rockart-sidebar">
          <div className="brand rockart-brand">
            <span className="brand-mark">R</span>
            <div>
              <strong>Rockart CRM</strong>
              <p className="muted-mini">Sales workspace</p>
            </div>
          </div>

          <nav className="nav rockart-nav">
            <p className="nav-group-title">Main menu</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link rockart-link${pathname === item.href ? " active" : ""}`}
              >
                <span className="icon-box">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sidebar-preferences">
            <p className="nav-group-title">Preference</p>
            <Link href="/configuracoes" className="nav-link rockart-link">
              <span className="icon-box">?</span>
              Help center
            </Link>
            <button type="button" className="nav-link rockart-link logout-link" onClick={logout}>
              <span className="icon-box">X</span>
              Sair
            </button>
          </div>

          <div className="sidebar-footer rockart-user">
            <div className="avatar-block">{firstName.slice(0, 1)}</div>
            <div>
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
              <div className="dashboard-search">
                <span className="search-icon" />
                <span>Search anything...</span>
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
