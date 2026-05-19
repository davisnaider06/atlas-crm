"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import type { Customer, Lead, PagedResult } from "@/lib/types";

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    leadId: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    leadId: "",
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [customersResponse, leadsResponse] = await Promise.all([
        api.getCustomers(token, { search: search || undefined }),
        api.getLeads(token),
      ]);
      const customerItems = (customersResponse as PagedResult<Customer>).items;
      setCustomers(customerItems);
      setLeads((leadsResponse as PagedResult<Lead>).items);
      if (selectedCustomer) {
        setSelectedCustomer(customerItems.find((item) => item.id === selectedCustomer.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedCustomer]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    setEditForm({
      name: selectedCustomer.name,
      email: selectedCustomer.email ?? "",
      phone: selectedCustomer.phone ?? "",
      leadId: selectedCustomer.leadId ? String(selectedCustomer.leadId) : "",
    });
  }, [selectedCustomer]);

  const convertibleLeads = useMemo(
    () => leads.filter((lead) => lead.status !== "Converted" && !customers.some((customer) => customer.leadId === lead.id)),
    [customers, leads],
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createCustomer(token, {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        leadId: form.leadId ? Number(form.leadId) : null,
      });
      setForm({ name: "", email: "", phone: "", leadId: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertLead = async (leadId: number) => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const customer = await api.convertLeadToCustomer(token, leadId);
      setSelectedCustomer(customer);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao converter lead.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedCustomer) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.updateCustomer(token, selectedCustomer.id, {
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        leadId: editForm.leadId ? Number(editForm.leadId) : null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedCustomer) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.deleteCustomer(token, selectedCustomer.id);
      setSelectedCustomer(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando clientes..." />;
  }

  if (error && customers.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="page-grid">
      <section className="toolbar-card">
        <label className="field compact">
          <span>Buscar cliente</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, email, telefone ou lead" />
        </label>
        <button type="button" className="ghost-button" onClick={() => void load()}>
          Aplicar busca
        </button>
      </section>

      <section className="three-column">
        <div className="table-card">
          <div className="card-header">
            <div>
              <h3>Clientes ativos</h3>
              <p>Contas convertidas e contatos cadastrados</p>
            </div>
            <span className="tag">{customers.length} clientes</span>
          </div>

          <table className="table clickable-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Origem</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={selectedCustomer?.id === customer.id ? "row-active" : ""}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td>{customer.name}</td>
                  <td>{customer.email || customer.phone || "-"}</td>
                  <td>{customer.leadName ?? "Cadastro direto"}</td>
                  <td>{formatDate(customer.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 ? <div className="empty-card">Nenhum cliente cadastrado ainda.</div> : null}
        </div>

        <form className="settings-card form-card" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <h3>Novo cliente</h3>
              <p>Cadastro direto na base</p>
            </div>
            <span className="tag">Novo</span>
          </div>

          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label className="field">
            <span>Telefone</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="field">
            <span>Lead vinculado</span>
            <select value={form.leadId} onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}>
              <option value="">Sem lead vinculado</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar cliente"}
          </button>
        </form>

        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>Converter lead</h3>
              <p>Transforme oportunidades qualificadas em clientes</p>
            </div>
            <span className="tag">{convertibleLeads.length} disponiveis</span>
          </div>

          <div className="mini-list">
            {convertibleLeads.slice(0, 8).map((lead) => (
              <article key={lead.id} className="mini-row">
                <div>
                  <strong>{lead.name}</strong>
                  <p>{lead.source} - {lead.status}</p>
                </div>
                <button type="button" className="table-action" onClick={() => void handleConvertLead(lead.id)} disabled={submitting}>
                  Converter
                </button>
              </article>
            ))}
            {convertibleLeads.length === 0 ? <div className="empty-card">Nao ha leads pendentes para converter.</div> : null}
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="settings-card form-card">
          <div className="card-header">
            <div>
              <h3>{selectedCustomer ? "Editar cliente" : "Selecione um cliente"}</h3>
              <p>{selectedCustomer ? "Atualize cadastro e vinculo com lead" : "Clique em um cliente da tabela"}</p>
            </div>
            {selectedCustomer ? <span className="tag">#{selectedCustomer.id}</span> : null}
          </div>

          {selectedCustomer ? (
            <form className="form-card" onSubmit={handleUpdate}>
              <label className="field">
                <span>Nome</span>
                <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="field">
                <span>Telefone</span>
                <input value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="field">
                <span>Lead vinculado</span>
                <select value={editForm.leadId} onChange={(event) => setEditForm((current) => ({ ...current, leadId: event.target.value }))}>
                  <option value="">Sem lead vinculado</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Atualizando..." : "Salvar cliente"}
              </button>
              <button type="button" className="ghost-button danger" onClick={() => void handleDelete()} disabled={submitting}>
                Excluir cliente
              </button>
            </form>
          ) : (
            <div className="empty-card">Selecione um cliente para editar.</div>
          )}
        </div>

        <div className="timeline-card">
          <div className="card-header">
            <div>
              <h3>Resumo da carteira</h3>
              <p>Leads convertidos e clientes cadastrados diretamente</p>
            </div>
          </div>
          <div className="stats-strip compact-stats">
            <article className="impact-card orange">
              <span>Total de clientes</span>
              <strong>{customers.length}</strong>
              <small>ativos na base</small>
            </article>
            <article className="impact-card gold">
              <span>Com origem em lead</span>
              <strong>{customers.filter((customer) => customer.leadId).length}</strong>
              <small>convertidos pelo funil</small>
            </article>
            <article className="impact-card blue">
              <span>Leads a converter</span>
              <strong>{convertibleLeads.length}</strong>
              <small>pendentes na entrada</small>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
