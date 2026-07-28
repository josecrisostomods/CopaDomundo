import assert from "node:assert/strict";
import test from "node:test";
import {
  answerAppQuestion,
  getAppAssistantResponse,
  normalizeAssistantText,
} from "../src/lib/appAssistant.js";

const fixtures = [
  {
    id: "future",
    kickoff: "2026-08-01T20:00:00-03:00",
    status: "SCHEDULED",
    home: { name: "Brasil" },
    away: { name: "Argentina" },
    venue: "Estádio Central",
  },
  {
    id: "finished",
    kickoff: "2026-07-20T20:00:00-03:00",
    status: "FINISHED",
    home: { name: "Portugal" },
    away: { name: "Espanha" },
    homeScore: 2,
    awayScore: 1,
  },
];

const baseContext = {
  now: new Date("2026-07-27T12:00:00-03:00").getTime(),
  fixtures,
  leagues: [{ id: "league-1", name: "Liga Teste" }],
  publicLeagues: [],
  activeLeague: { name: "Liga Teste" },
  currentUser: { id: "user-1", name: "Usuário" },
  ranking: [{ id: "user-1", name: "Usuário", position: 1, points: 12 }],
  userPredictions: [{ fixtureId: "finished", userId: "user-1" }],
};

test("normaliza acentos e pontuação", () => {
  assert.equal(normalizeAssistantText("Próximos jogos?"), "proximos jogos");
});

test("explica a pontuação sem serviço externo", () => {
  const reply = answerAppQuestion("Como funciona a pontuação?", baseContext);
  assert.match(reply, /Placar exato: 5 pontos/);
  assert.match(reply, /Vencedor ou empate correto/);
});

test("lista os próximos jogos carregados na aplicação", () => {
  const reply = answerAppQuestion("Quais são os próximos jogos?", baseContext);
  assert.match(reply, /Brasil x Argentina/);
  assert.doesNotMatch(reply, /Portugal 2 x 1 Espanha/);
});

test("consulta resultados carregados na aplicação", () => {
  const reply = answerAppQuestion("Quais foram os resultados?", baseContext);
  assert.match(reply, /Portugal 2 x 1 Espanha/);
});

test("não expõe resumo administrativo ao público", () => {
  const reply = answerAppQuestion("Resuma a situação administrativa", {
    ...baseContext,
    canUseAdmin: false,
    adminState: { users: [{ id: "private" }], leagues: [] },
  });
  assert.doesNotMatch(reply, /1 usuário/);
});

test("apresenta resumo administrativo somente para conta autorizada", () => {
  const reply = answerAppQuestion("Resuma a situação administrativa", {
    ...baseContext,
    canUseAdmin: true,
    adminState: { users: [{ id: "admin" }], leagues: [{ id: "league-1" }] },
  });
  assert.match(reply, /Resumo administrativo/);
  assert.match(reply, /1 usuário/);
  assert.match(reply, /aba Admin/);
});

test("entende erros de digitação em perguntas sobre pontuação", () => {
  const response = getAppAssistantResponse("cm funsiona a pontuassao?", baseContext);
  assert.match(response.answer, /Placar exato: 5 pontos/);
  assert.match(response.interpretedAs, /pontuação/);
  assert.ok(response.suggestions.length >= 4);
});

test("entende erros de digitação em perguntas sobre próximos jogos", () => {
  const response = getAppAssistantResponse("quais os prossimos jgos?", baseContext);
  assert.match(response.answer, /Brasil x Argentina/);
  assert.match(response.interpretedAs, /próximos jogos/);
});

test("reconhece nome de seleção escrito errado", () => {
  const response = getAppAssistantResponse("qndo joga o brasl?", baseContext);
  assert.match(response.answer, /Brasil x Argentina/);
  assert.match(response.interpretedAs, /Brasil/);
});

test("responde dados personalizados da conta conectada", () => {
  const reply = answerAppQuestion("quantos pontos e palpites eu tenho?", baseContext);
  assert.match(reply, /1º lugar com 12 ponto/);
  assert.match(reply, /1 palpite/);
});

test("explica regras adicionais do aplicativo", () => {
  assert.match(answerAppQuestion("qual o máximo de pontos por jogo?", baseContext), /até 9 pontos/);
  assert.match(answerAppQuestion("meu palpite vale em todas as ligas?", baseContext), /todas as ligas/);
  assert.match(answerAppQuestion("placar inclui os pênaltis?", baseContext), /sem somar a disputa/);
  assert.match(answerAppQuestion("o bolão vale dinheiro?", baseContext), /não registra apostas/i);
});

test("oferece opções quando não entende a pergunta", () => {
  const response = getAppAssistantResponse("xyz coisa desconhecida", baseContext);
  assert.match(response.answer, /não reconheci/i);
  assert.ok(response.suggestions.length >= 5);
});
