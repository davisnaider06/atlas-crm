"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon, AlertIcon, XIcon } from "@/components/ui/icons";

type Notification = { id: string; title?: string; message: string; type?: "error" | "success" | "info" };

const NotificationContext = createContext<{
  notify: (n: Omit<Notification, "id">) => void;
  dismiss: (id?: string) => void;
  current?: Notification | null;
} | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Notification | null>(null);

  const notify = useCallback((n: Omit<Notification, "id">) => {
    const note: Notification = { id: String(Date.now()), ...n };
    setCurrent(note);
    setTimeout(() => setCurrent((cur) => (cur && cur.id === note.id ? null : cur)), 6000);
  }, []);

  const dismiss = useCallback((id?: string) => {
    if (!id) setCurrent(null);
    else setCurrent((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, dismiss, current }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

export function NotificationModal() {
  const ctx = useContext(NotificationContext);
  if (!ctx) return null;
  const { current, dismiss } = ctx;
  if (!current) return null;

  const isSuccess = current.type === "success";
  const isError = current.type === "error";

  const accentColor = isSuccess ? "var(--success)" : isError ? "var(--danger)" : "var(--cool)";
  const bgColor = isSuccess ? "var(--success-soft)" : isError ? "var(--danger-soft)" : "var(--cool-soft)";
  const title = current.title ?? (isError ? "Erro" : isSuccess ? "Sucesso" : "Informação");

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 20px 24px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          minWidth: 280,
          maxWidth: 420,
          width: "100%",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "16px 18px",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          animation: "toastIn 220ms var(--ease) both",
        }}
      >
        <style>{`
          @keyframes toastIn {
            from { opacity: 0; transform: translateY(16px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <span
          style={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: bgColor,
            color: accentColor,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {isSuccess ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: "0.9rem", marginBottom: 4 }}>{title}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.84rem", overflowWrap: "anywhere" }}>
            {current.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() => dismiss(current.id)}
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            color: "var(--muted)",
            flexShrink: 0,
            cursor: "pointer",
            transition: "background 120ms",
          }}
          aria-label="Fechar"
        >
          <XIcon size={13} />
        </button>
      </div>
    </div>
  );
}
