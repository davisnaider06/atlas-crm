"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { useNotification } from "@/components/ui/notification-context";
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
  const [filterSector, setFilterSector] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", description: "", url: "", sector: "", tags: "", isOnboarding: false, visibility: "private" });
  const [fileForm, setFileForm] = useState<{ title: string; description: string; file: File | null; sector: string; tags: string; isOnboarding: boolean; visibility: string }>({
    title: "",
    description: "",
    file: null,
    sector: "",
    tags: "",
    isOnboarding: false,
    visibility: "private",
  });
  const { notify } = useNotification();

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = (await api.getDocuments(token, {
        search: search || undefined,
        sector: filterSector || undefined,
        tag: filterTag || undefined,
        visibility: filterVisibility || undefined,
      })) as PagedResult<DocumentItem>;
      setDocuments(response.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar documentos.";
      const status = (err as any)?.status;
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para ver materiais." : message, title: status === 403 ? "Permissao negada" : "Falha ao carregar materiais" });
    } finally {
      setLoading(false);
    }
  }, [search, token, filterSector, filterTag, filterVisibility, notify]);

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
        sector: linkForm.sector || undefined,
        tags: linkForm.tags ? linkForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        isOnboarding: linkForm.isOnboarding,
        visibility: linkForm.visibility || "private",
      });
      setLinkForm({ title: "", description: "", url: "", sector: "", tags: "", isOnboarding: false, visibility: "private" });
      await load();
      notify({ type: "success", message: "Link salvo com sucesso.", title: "Link criado" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao salvar link.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para criar materiais." : message, title: status === 403 ? "Permissao negada" : "Falha ao salvar link" });
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
    payload.set("sector", fileForm.sector);
    payload.set("tagsJson", JSON.stringify(fileForm.tags ? fileForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : []));
    payload.set("isOnboarding", String(fileForm.isOnboarding));
    payload.set("visibility", fileForm.visibility || "private");

    setSubmitting(true);
    setError(null);
    try {
      await api.uploadDocumentFile(token, payload);
      setFileForm({ title: "", description: "", file: null, sector: "", tags: "", isOnboarding: false, visibility: "private" });
      event.currentTarget.reset();
      await load();
        notify({ type: "success", message: "Arquivo enviado com sucesso.", title: "Upload concluido" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao enviar arquivo.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para enviar arquivos." : message, title: status === 403 ? "Permissao negada" : "Falha no upload" });
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
      notify({ type: "success", message: "Material excluido.", title: "Excluido" });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro ao excluir documento.";
      setError(message);
      notify({ type: "error", message: status === 403 ? "Voce nao tem permissao para excluir este material." : message, title: status === 403 ? "Permissao negada" : "Erro ao excluir" });
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
        <label className="field">
          <span>Setor</span>
          <input value={filterSector} onChange={(event) => setFilterSector(event.target.value)} placeholder="Operacional, Comercial" />
        </label>
        <label className="field">
          <span>Tag</span>
          <input value={filterTag} onChange={(event) => setFilterTag(event.target.value)} placeholder="onboarding" />
        </label>
        <label className="field">
          <span>Visibilidade</span>
          <select value={filterVisibility} onChange={(event) => setFilterVisibility(event.target.value)}>
            <option value="">Todos</option>
            <option value="private">Privado</option>
            <option value="public">Publico</option>
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar filtros
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
            <span>Setor</span>
            <input value={fileForm.sector} onChange={(event) => setFileForm((current) => ({ ...current, sector: event.target.value }))} placeholder="Operacional, Comercial" />
          </label>
          <label className="field">
            <span>Tags (separadas por vírgula)</span>
            <input value={fileForm.tags} onChange={(event) => setFileForm((current) => ({ ...current, tags: event.target.value }))} placeholder="onboarding, contrato" />
          </label>
          <label className="field compact">
            <span>Onboarding?</span>
            <input type="checkbox" checked={fileForm.isOnboarding} onChange={(event) => setFileForm((current) => ({ ...current, isOnboarding: event.target.checked }))} />
          </label>
          <label className="field">
            <span>Visibilidade</span>
            <select value={fileForm.visibility} onChange={(event) => setFileForm((current) => ({ ...current, visibility: event.target.value }))}>
              <option value="private">Privado</option>
              <option value="public">Publico</option>
            </select>
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
            <span>Setor</span>
            <input value={linkForm.sector} onChange={(event) => setLinkForm((current) => ({ ...current, sector: event.target.value }))} placeholder="Operacional, Comercial" />
          </label>
          <label className="field">
            <span>Tags (vírgula)</span>
            <input value={linkForm.tags} onChange={(event) => setLinkForm((current) => ({ ...current, tags: event.target.value }))} placeholder="onboarding, script" />
          </label>
          <label className="field compact">
            <span>Onboarding?</span>
            <input type="checkbox" checked={linkForm.isOnboarding} onChange={(event) => setLinkForm((current) => ({ ...current, isOnboarding: event.target.checked }))} />
          </label>
          <label className="field">
            <span>Visibilidade</span>
            <select value={linkForm.visibility} onChange={(event) => setLinkForm((current) => ({ ...current, visibility: event.target.value }))}>
              <option value="private">Privado</option>
              <option value="public">Publico</option>
            </select>
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
                  <p className="muted-mini">
                    {document.sector ? <span className="tag small">{document.sector}</span> : null}
                    {document.tags && document.tags.length > 0 ? <span className="muted-mini"> {document.tags.join(", ")}</span> : null}
                    {document.isOnboarding ? <span className="tag small">Onboarding</span> : null}
                    {document.visibility ? <span className="muted-mini"> {document.visibility}</span> : null}
                  </p>
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
