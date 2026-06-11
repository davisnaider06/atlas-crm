"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { useNotification } from "@/components/ui/notification-context";
import { ChevronLeftIcon, SendIcon, WhatsAppIcon } from "@/components/ui/icons";
import type { ChatMessage, Conversation } from "@/lib/types";

const POLL_INTERVAL_MS = 8000;

function formatTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ConversationsPage() {
  const { token } = useAuth();
  const { notify } = useNotification();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const items = await api.getConversations(token);
      setConversations(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMessages = useCallback(
    async (conversationId: number) => {
      if (!token) return;
      try {
        const items = await api.getConversationMessages(token, conversationId);
        setMessages(items);
        // Zera o contador local (o backend marca como lida)
        setConversations((current) =>
          current.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch {
        // mantém o thread atual em caso de falha temporária
      }
    },
    [token],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Polling: lista + thread ativo
  useEffect(() => {
    const interval = setInterval(() => {
      void loadConversations();
      if (selectedId !== null) void loadMessages(selectedId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    if (selectedId !== null) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || selectedId === null || !draft.trim()) return;
    setSending(true);
    try {
      const message = await api.sendConversationMessage(token, selectedId, draft.trim());
      setMessages((current) => [...current, message]);
      setDraft("");
      void loadConversations();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao enviar mensagem.",
        title: "Erro",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState label="Carregando conversas..." />;
  if (error && conversations.length === 0) {
    return <ErrorState message={error} onRetry={() => void loadConversations()} />;
  }

  return (
    <div className={`chat-shell${selected ? " thread-open" : ""}`}>
      <aside className="chat-list panel">
        <div className="chat-list-header">
          <strong>Conversas</strong>
          <span className="tag">{conversations.length}</span>
        </div>

        <div className="chat-list-items">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`chat-list-item${conversation.id === selectedId ? " active" : ""}`}
              onClick={() => setSelectedId(conversation.id)}
            >
              <span className="chat-avatar">
                {conversation.contactName.slice(0, 1).toUpperCase()}
              </span>
              <span className="chat-list-copy">
                <span className="chat-list-top">
                  <strong>{conversation.contactName}</strong>
                  <small>{formatTime(conversation.lastMessageAtUtc)}</small>
                </span>
                <span className="chat-list-bottom">
                  <p>{conversation.lastMessagePreview ?? "Sem mensagens"}</p>
                  {conversation.unreadCount > 0 ? (
                    <em className="chat-unread">{conversation.unreadCount}</em>
                  ) : null}
                </span>
              </span>
            </button>
          ))}

          {conversations.length === 0 ? (
            <div className="empty-card">
              Nenhuma conversa ainda. Configure o webhook do WhatsApp no módulo de integração para
              receber mensagens aqui.
            </div>
          ) : null}
        </div>
      </aside>

      <section className="chat-thread panel">
        {selected ? (
          <>
            <header className="chat-thread-header">
              <button
                type="button"
                className="icon-btn chat-back"
                aria-label="Voltar para a lista"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeftIcon size={15} />
              </button>
              <span className="chat-avatar">{selected.contactName.slice(0, 1).toUpperCase()}</span>
              <div className="chat-thread-title">
                <strong>{selected.contactName}</strong>
                <small>{selected.contactPhone}</small>
              </div>
              {selected.leadId ? (
                <Link href="/leads" className="tag blue chat-lead-tag">
                  Lead: {selected.leadName ?? `#${selected.leadId}`}
                </Link>
              ) : null}
            </header>

            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`chat-bubble ${message.isInbound ? "in" : "out"}`}>
                  <p>{message.text}</p>
                  <small>
                    {!message.isInbound && message.senderName ? `${message.senderName} · ` : ""}
                    {formatTime(message.sentAtUtc)}
                  </small>
                </div>
              ))}
              {messages.length === 0 ? (
                <div className="empty-card compact-empty">Sem mensagens nesta conversa.</div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-composer" onSubmit={handleSend}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escreva uma mensagem..."
                aria-label="Mensagem"
              />
              <button
                type="submit"
                className="primary-button chat-send"
                disabled={sending || !draft.trim()}
                aria-label="Enviar mensagem"
              >
                <SendIcon size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <WhatsAppIcon size={34} />
            <strong>Central de conversas</strong>
            <p>
              Selecione uma conversa ao lado para responder seus contatos do WhatsApp sem sair do
              CRM.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
