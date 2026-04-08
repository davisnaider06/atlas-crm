"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", section: "core" },
  { href: "/leads", label: "Contacts", section: "core" },
  { href: "/pipeline", label: "CRM", section: "core" },
  { href: "/atividades", label: "Sales", section: "ops" },
  { href: "/configuracoes", label: "Settings", section: "ops" },
];

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

  return (
    <div className="shell-bg">
      <div className="shell-panel">
        <aside className="sidebar">
          <div className="brand compact-brand">
            <span className="brand-mark">A</span>
            <div>
              <strong>Atlas CRM</strong>
              <p className="muted-mini">Revenue workspace</p>
            </div>
          </div>

          <div className="search-mini">
            <span className="search-icon" />
            <span>Search</span>
          </div>

          <nav className="nav grouped-nav">
            <p className="nav-group-title">Workspace</p>
            {navItems
              .filter((item) => item.section === "core")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link soft-link${pathname === item.href ? " active" : ""}`}
                >
                  <span className="nav-bullet" />
                  {item.label}
                </Link>
              ))}

            <p className="nav-group-title">Operations</p>
            {navItems
              .filter((item) => item.section === "ops")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link soft-link${pathname === item.href ? " active" : ""}`}
                >
                  <span className="nav-bullet" />
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-chip">
              <div className="avatar-block">{user.name.slice(0, 1)}</div>
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
            </div>
            <button type="button" className="ghost-button flush" onClick={logout}>
              Sair
            </button>
          </div>
        </aside>

        <div className="main-shell">
          <header className="topbar analytics-topbar">
            <div>
              <p className="eyebrow">Atlas CRM</p>
              <h1>{pathname === "/dashboard" ? "Email Analytics" : "Revenue Analytics"}</h1>
            </div>

            <div className="topbar-actions">
              <span className="status-pill">{user.role}</span>
              <span className="status-pill accent">Last 30 Days</span>
            </div>
          </header>

          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
