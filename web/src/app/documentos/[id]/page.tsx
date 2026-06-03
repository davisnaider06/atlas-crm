"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { DocumentItem } from "@/lib/types";
import { permissions, hasPermission } from "@/lib/permissions";
import { useNotification } from "@/components/ui/notification-context";

export default function DocumentDetail({ params }: { params: { id: string } }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();
  const [rawText, setRawText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const doc = await api.getDocumentById(token, Number(params.id));
        setDocument(doc);
      } catch (err) {
        const status = (err as any)?.status;
        const message = err instanceof Error ? err.message : "Erro ao carregar material.";
        setError(message);
        notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para ver este material." : message, title: status === 403 ? "Permissao negada" : "Falha ao carregar material" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, params.id]);

  useEffect(() => {
    if (!document || !token) return;
    const ct = document.contentType ?? "";
    if (ct.startsWith("text/") || ct === "application/json" || ct === "text/markdown") {
      void (async () => {
        try {
          const resp = await fetch(api.getDocumentRawUrl(document.id), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const txt = await resp.text();
            setRawText(txt);
          } else {
            setRawText(null);
          }
        } catch {
          setRawText(null);
        }
      })();
    } else {
      setRawText(null);
    }
  }, [document, token]);

  const handleDelete = async () => {
    if (!token || !document) return;
    if (!confirm("Tem certeza que deseja excluir este material?")) return;
    setSubmitting(true);
    try {
      await api.deleteDocument(token, document.id);
      router.push("/documentos");
      notify({ type: "success", message: "Material excluido com sucesso.", title: "Excluido" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao excluir material.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para excluir este material." : message, title: status === 403 ? "Permissao negada" : "Erro ao excluir" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando material..." />;
  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!document) return <div className="empty-card">Material nao encontrado.</div>;

  const canDelete = hasPermission(user, permissions.documentsDelete);

  return (
    <div className="page-grid">
      <section className="settings-card">
        <div className="card-header">
          <div>
            <h3>{document.title}</h3>
            <p className="muted-mini">{document.description}</p>
          </div>
          <span className="tag">{document.type}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <strong>Setor:</strong> {document.sector ?? "-"} &nbsp; <strong>Tags:</strong> {document.tags?.join(", ") ?? "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <strong>Onboarding:</strong> {document.isOnboarding ? "Sim" : "Nao"} &nbsp; <strong>Visibilidade:</strong> {document.visibility}
        </div>

        <div className="inline-actions">
          {document.type === "File" ? (
            <a className="primary-button" href={api.getDocumentDownloadUrl(document.id)} target="_blank" rel="noreferrer">
              Baixar arquivo
            </a>
          ) : (
            <a className="primary-button" href={document.url ?? "#"} target="_blank" rel="noreferrer">
              Abrir link
            </a>
          )}

          {canDelete ? (
            <button className="danger" onClick={() => void handleDelete()} disabled={submitting}>
              Excluir
            </button>
          ) : null}
        </div>

        <div className="muted-mini">Criado em: {formatDate(document.createdAtUtc)}</div>
      </section>

      {document.type === "File" ? (
        <section className="settings-card">
          <div className="card-header">
            <div>
              <h3>Preview</h3>
              <p>Visualizacao do arquivo quando disponivel.</p>
            </div>
            <span className="tag">Preview</span>
          </div>

          <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
            {document.contentType?.startsWith("image/") ? (
              <img src={api.getDocumentRawUrl(document.id)} alt={document.title} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
            ) : document.contentType?.startsWith("video/") ? (
              <video controls style={{ width: "100%", maxHeight: "70vh" }}>
                <source src={api.getDocumentRawUrl(document.id)} type={document.contentType} />
                Seu navegador nao suporta video.
              </video>
            ) : document.contentType?.startsWith("audio/") ? (
              <audio controls style={{ width: "100%" }} src={api.getDocumentRawUrl(document.id)} />
            ) : document.contentType === "application/pdf" ? (
              <div style={{ width: "100%", height: "min(80vh, 1000px)" }}>
                <iframe src={api.getDocumentRawUrl(document.id)} style={{ width: "100%", height: "100%", border: "none" }} title="PDF Preview" />
              </div>
            ) : ([
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.ms-powerpoint",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ].includes(document.contentType ?? "") ? (
              <div>
                <p className="muted-mini">Tentando visualizar via Google Docs Viewer. Se nao abrir, utilize o botao de download.</p>
                <div style={{ width: "100%", height: "80vh" }}>
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(api.getDocumentRawUrl(document.id))}&embedded=true`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    title="Office Preview"
                  />
                </div>
              </div>
            ) : document.contentType?.startsWith("text/") || document.contentType === "application/json" ? (
              rawText ? (
                <pre className="code-preview" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{rawText}</pre>
              ) : (
                <div className="empty-card">Preview de texto indisponivel.</div>
              )
            ) : (
              <div className="empty-card">Preview nao disponivel para este tipo de arquivo.</div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
