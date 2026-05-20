"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { DocumentItem, PagedResult } from "@/lib/types";

function formatFileSize(value?: number | null) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", description: "", url: "" });
  const [fileForm, setFileForm] = useState<{ title: string; description: string; file: File | null }>({
    title: "",
    description: "",
    file: null,
  });

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = (await api.getDocuments(token, { search: search || undefined })) as PagedResult<DocumentItem>;
      setDocuments(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar documentos.");
    } finally {
      setLoading(false);
    }
  }, [search, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.createDocumentLink(token, {
        title: linkForm.title,
        description: linkForm.description || undefined,
        url: linkForm.url,
      });
      setLinkForm({ title: "", description: "", url: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar link.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !fileForm.file) return;

    const payload = new FormData();
    payload.set("title", fileForm.title);
    payload.set("description", fileForm.description);
    payload.set("file", fileForm.file);

    setSubmitting(true);
    setError(null);
    try {
      await api.uploadDocumentFile(token, payload);
      setFileForm({ title: "", description: "", file: null });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteDocument(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir documento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Carregando documentos..." />;
  if (error && documents.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar documento</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Titulo, descricao ou link" />
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar busca
        </button>
      </section>

      <section className="two-column">
        <form className="settings-card form-card" onSubmit={handleUpload}>
          <div className="card-header">
            <div>
              <h3>Enviar arquivo</h3>
              <p>Contratos, propostas, planilhas e materiais da Atlas.</p>
            </div>
            <span className="tag">Arquivo</span>
          </div>
          <label className="field">
            <span>Titulo</span>
            <input value={fileForm.title} onChange={(event) => setFileForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Descricao</span>
            <textarea value={fileForm.description} onChange={(event) => setFileForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="field">
            <span>Arquivo</span>
            <input type="file" onChange={(event) => setFileForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} required />
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar arquivo"}
          </button>
        </form>

        <form className="settings-card form-card" onSubmit={handleCreateLink}>
          <div className="card-header">
            <div>
              <h3>Adicionar link</h3>
              <p>Drive, contrato externo, briefing ou material online.</p>
            </div>
            <span className="tag">Link</span>
          </div>
          <label className="field">
            <span>Titulo</span>
            <input value={linkForm.title} onChange={(event) => setLinkForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label className="field">
            <span>URL</span>
            <input type="url" value={linkForm.url} onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Descricao</span>
            <textarea value={linkForm.description} onChange={(event) => setLinkForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar link"}
          </button>
        </form>
      </section>

      <section className="table-card">
        <div className="card-header">
          <div>
            <h3>Biblioteca Atlas</h3>
            <p>Arquivos e links disponiveis para o time.</p>
          </div>
          <span className="tag">{documents.length} itens</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Tipo</th>
              <th>Detalhe</th>
              <th>Criado em</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>
                  <strong>{document.title}</strong>
                  <p className="muted-mini">{document.description || "Sem descricao"}</p>
                </td>
                <td>{document.type === "File" ? "Arquivo" : "Link"}</td>
                <td>{document.type === "File" ? `${document.originalFileName} - ${formatFileSize(document.sizeBytes)}` : document.url}</td>
                <td>{formatDate(document.createdAtUtc)}</td>
                <td>
                  <div className="inline-actions">
                    {document.type === "File" ? (
                      <a className="table-action" href={api.getDocumentDownloadUrl(document.id)} target="_blank" rel="noreferrer">
                        Baixar
                      </a>
                    ) : (
                      <a className="table-action" href={document.url ?? "#"} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    )}
                    <button type="button" className="table-action danger" onClick={() => void handleDelete(document.id)} disabled={submitting}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 ? <div className="empty-card">Nenhum documento cadastrado ainda.</div> : null}
      </section>
    </div>
  );
}
