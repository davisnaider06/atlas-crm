"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

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
    // auto dismiss after 6s
    setTimeout(() => setCurrent((cur) => (cur && cur.id === note.id ? null : cur)), 6000);
  }, []);

  const dismiss = useCallback((id?: string) => {
    if (!id) setCurrent(null);
    else setCurrent((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  return <NotificationContext.Provider value={{ notify, dismiss, current }}>{children}</NotificationContext.Provider>;
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

  const color = current.type === "success" ? "#064e3b" : current.type === "error" ? "#7f1d1d" : "#0f172a";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => dismiss(current.id)}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{current.title ?? (current.type === "error" ? "Erro" : current.type === "success" ? "Sucesso" : "Info")}</h3>
          <button className="ghost-button" onClick={() => dismiss(current.id)}>
            Fechar
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: 12, borderRadius: 6, background: color, color: "white" }}>{current.message}</div>
        </div>
      </div>
    </div>
  );
}
