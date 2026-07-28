import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, LockKeyhole, Send, Sparkles, X } from "lucide-react";
import {
  getAppAssistantResponse,
  getAssistantStarterSuggestions,
} from "../lib/appAssistant.js";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content:
      "Olá! Sou o assistente interno do site. Posso explicar as regras e consultar partidas, resultados, ligas e ranking usando os dados já carregados.",
  },
];

export function AppAssistant({ canUseAdmin, assistantContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [replySuggestions, setReplySuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const starterSuggestions = useMemo(
    () => getAssistantStarterSuggestions(canUseAdmin),
    [canUseAdmin],
  );
  const suggestions = replySuggestions.length ? replySuggestions : starterSuggestions;

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, open]);

  function sendMessage(content) {
    const normalized = content.trim();
    if (!normalized) return;

    const response = getAppAssistantResponse(normalized, {
      ...assistantContext,
      canUseAdmin,
    });

    setMessages((current) => [
      ...current,
      { role: "user", content: normalized },
      {
        role: "assistant",
        content: response.answer,
        interpretation: response.interpretedAs,
      },
    ]);
    setReplySuggestions(response.suggestions || []);
    setDraft("");
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
                <small>{canUseAdmin ? "Consulta administrativa" : "Atendimento público"}</small>
              </div>
            </div>
            <span className={`assistant-mode ${canUseAdmin ? "admin" : "public"}`}>
              {canUseAdmin && <LockKeyhole size={13} />}
              {canUseAdmin ? "Administrador" : "Interno"}
            </span>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                <strong>{message.role === "user" ? "Você" : "Assistente"}</strong>
                {message.interpretation && (
                  <small className="assistant-interpretation">{message.interpretation}</small>
                )}
                <p>{message.content}</p>
              </article>
            ))}
            <div className="assistant-message-end" ref={messagesEndRef} aria-hidden="true" />
          </div>

          {suggestions.length > 0 && (
            <div className="assistant-suggestions">
              <small>Você também pode perguntar:</small>
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}>
                  <Sparkles size={14} />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className="assistant-composer" onSubmit={submitMessage}>
            <textarea
              aria-label="Mensagem para o assistente"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Pergunte sobre o site..."
              maxLength={500}
              rows={2}
            />
            <button type="submit" aria-label="Enviar mensagem" disabled={!draft.trim()}>
              <Send size={18} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
