"use client";

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return <div className="panel state-card">{label}</div>;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel state-card">
      <strong>Falha ao carregar</strong>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="primary-button" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
