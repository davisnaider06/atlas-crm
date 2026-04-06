"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/atividades", label: "Atividades" },
  { href: "/configuracoes", label: "Configuracoes" },
];

export function AppFrame({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <p className="eyebrow">Atlas CRM</p>
            <strong>SaaS Sales OS</strong>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Tenant demo</p>
          <strong>Atlas CRM Demo</strong>
          <span>{user.email}</span>
          <button type="button" className="ghost-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operacao comercial</p>
            <h1>Painel do CRM</h1>
          </div>

          <div className="topbar-actions">
            <span className="status-pill">{user.name}</span>
            <span className="status-pill accent">{user.role}</span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
