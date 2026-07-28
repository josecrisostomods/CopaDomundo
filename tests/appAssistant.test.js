import assert from "node:assert/strict";
import test from "node:test";
import { answerAppQuestion, normalizeAssistantText } from "../src/lib/appAssistant.js";

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
