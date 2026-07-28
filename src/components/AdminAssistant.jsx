import React, { useMemo, useState } from "react";
import { Bot, LockKeyhole, Send, Sparkles, X } from "lucide-react";
import { answerAppQuestion } from "../lib/appAssistant.js";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content:
      "Olá! Sou o assistente interno do site. Posso explicar as regras e consultar partidas, resultados, ligas e ranking usando os dados já carregados.",
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

export function AppAssistant({ canUseAdmin, assistantContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");

  const suggestions = useMemo(
    () => (canUseAdmin ? [...ADMIN_SUGGESTIONS, ...PUBLIC_SUGGESTIONS] : PUBLIC_SUGGESTIONS),
    [canUseAdmin],
  );

  function sendMessage(content) {
    const normalized = content.trim();
    if (!normalized) return;

    const reply = answerAppQuestion(normalized, {
      ...assistantContext,
      canUseAdmin,
    });

    setMessages((current) => [
      ...current,
      { role: "user", content: normalized },
      { role: "assistant", content: reply },
    ]);
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
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          {messages.length === 1 && (
            <div className="assistant-suggestions">
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
