"use client";

import { RefreshIcon, AlertIcon } from "@/components/ui/icons";

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="panel state-card" style={{ gap: 16, padding: "48px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{label}</span>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="panel state-card"
      style={{ gap: 14, padding: "48px 24px", maxWidth: 480, margin: "0 auto" }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: "var(--danger-soft)",
          color: "var(--danger)",
        }}
      >
        <AlertIcon size={22} />
      </span>
      <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
        <strong style={{ fontSize: "1rem" }}>Falha ao carregar</strong>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="ghost-button"
          onClick={onRetry}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <RefreshIcon size={15} />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
