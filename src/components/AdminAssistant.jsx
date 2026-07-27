import React, { useMemo, useState } from "react";
import { Bot, Check, Loader2, LockKeyhole, Send, Sparkles, X } from "lucide-react";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content:
      "Olá! Posso explicar as regras, ajudar a usar o site e consultar partidas públicas. Contas autorizadas também podem acessar recursos administrativos protegidos.",
  },
];

const PUBLIC_SUGGESTIONS = [
  "Como funciona a pontuação?",
  "Quais são os próximos jogos?",
  "Como criar ou entrar em uma liga?",
];

const ADMIN_SUGGESTIONS = [
  "Resuma a situação atual do aplicativo.",
  "Quais dados precisam de atenção administrativa?",
];

export function AppAssistant({ sessionToken, canUseAdmin, onConfirmAction }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("public");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(
    () => (canUseAdmin ? [...ADMIN_SUGGESTIONS, ...PUBLIC_SUGGESTIONS] : PUBLIC_SUGGESTIONS),
    [canUseAdmin],
  );

  async function sendMessage(content) {
    const normalized = content.trim();
    if (!normalized || loading || pendingAction) return;

    const nextMessages = [...messages, { role: "user", content: normalized }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: sessionToken || undefined,
          messages: nextMessages,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o assistente.");

      setMode(payload.mode === "admin" ? "admin" : "public");
      setMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
      setPendingAction(payload.pendingAction || null);
    } catch (requestError) {
      setError(requestError.message || "Não foi possível consultar o assistente.");
    } finally {
      setLoading(false);
    }
  }

  function submitMessage(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  async function confirmAction() {
    if (!pendingAction || confirming || mode !== "admin" || !onConfirmAction) return;

    setConfirming(true);
    setError("");

    try {
      await onConfirmAction(pendingAction);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Ação concluída: ${pendingAction.summary}` },
      ]);
      setPendingAction(null);
    } catch (actionError) {
      setError(actionError.message || "Não foi possível executar a ação.");
    } finally {
      setConfirming(false);
    }
  }

  function cancelAction() {
    setMessages((current) => [
      ...current,
      { role: "assistant", content: "Ação cancelada. Nenhum dado foi alterado." },
    ]);
    setPendingAction(null);
    setError("");
  }

  return (
    <>
      <button
        className="assistant-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Bot size={25} />}
        {!open && <span>Ajuda</span>}
      </button>

      {open && (
        <aside className="assistant-window" aria-label="Assistente Copa Palpites">
          <header className="assistant-header">
            <div className="assistant-title">
              <span className="assistant-icon">
                <Bot size={21} />
              </span>
              <div>
                <strong>Assistente Copa</strong>
                <small>{mode === "admin" ? "Modo administrativo" : "Atendimento público"}</small>
              </div>
            </div>
            <span className={`assistant-mode ${mode}`}>
              {mode === "admin" && <LockKeyhole size={13} />}
              {mode === "admin" ? "Administrador" : "Público"}
            </span>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                <strong>{message.role === "user" ? "Você" : "Assistente"}</strong>
                <p>{message.content}</p>
              </article>
            ))}
            {loading && (
              <article className="assistant-message assistant assistant-thinking">
                <Loader2 size={17} className="spin-icon" />
                <p>Consultando os dados atuais...</p>
              </article>
            )}
          </div>

          {messages.length === 1 && !pendingAction && (
            <div className="assistant-suggestions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={loading}>
                  <Sparkles size={14} />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {pendingAction && (
            <div className="assistant-confirmation" role="alert">
              <strong>Confirmação necessária</strong>
              <p>{pendingAction.summary}</p>
              <div className="assistant-confirmation-actions">
                <button className="secondary-button" type="button" onClick={cancelAction} disabled={confirming}>
                  <X size={15} />
                  Cancelar
                </button>
                <button className="primary-button" type="button" onClick={confirmAction} disabled={confirming}>
                  {confirming ? <Loader2 size={15} className="spin-icon" /> : <Check size={15} />}
                  {confirming ? "Executando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="assistant-error">{error}</p>}

          <form className="assistant-composer" onSubmit={submitMessage}>
            <textarea
              aria-label="Mensagem para o assistente"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Digite sua pergunta..."
              maxLength={4000}
              rows={2}
              disabled={loading || Boolean(pendingAction)}
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={!draft.trim() || loading || Boolean(pendingAction)}
            >
              {loading ? <Loader2 size={18} className="spin-icon" /> : <Send size={18} />}
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
