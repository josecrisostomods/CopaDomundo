import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_ASSISTANT_SYSTEM_PROMPT,
  answerAppQuestion,
  getAppAssistantResponse,
  normalizeAssistantText,
} from "../src/lib/appAssistant.js";
import { SITE_KNOWLEDGE_TOPICS } from "../src/lib/appAssistantKnowledge.js";

const fixtures = [
  {
    id: "future",
    kickoff: "2026-08-01T20:00:00-03:00",
    status: "SCHEDULED",
    home: { id: "brasil", name: "Brasil" },
    away: { id: "argentina", name: "Argentina" },
    venue: "Estádio Central",
  },
  {
    id: "finished",
    kickoff: "2026-07-20T20:00:00-03:00",
    status: "FINISHED",
    home: { id: "portugal", name: "Portugal" },
    away: { id: "espanha", name: "Espanha" },
    homeScore: 2,
    awayScore: 1,
  },
];

const baseContext = {
  now: new Date("2026-07-27T12:00:00-03:00").getTime(),
  fixtures,
  leagues: [{ id: "league-1", name: "Liga Teste" }],
  publicLeagues: [{ id: "league-public", name: "Liga Aberta", memberCount: 4 }],
  activeLeague: { id: "league-1", name: "Liga Teste", ownerId: "user-1", isPublic: false, settings: { bonusLocked: false } },
  currentUser: { id: "user-1", name: "Usuário" },
  ranking: [{ id: "user-1", name: "Usuário", position: 1, points: 12 }],
  userPredictions: [{ fixtureId: "finished", userId: "user-1" }],
  bonusPredictions: [{
    leagueId: "league-1",
    userId: "user-1",
    championTeamId: "brasil",
    topScorerName: "Atacante",
    revelationName: "Revelação",
  }],
  membersByLeague: {
    "league-1": [
      { id: "user-1", name: "Usuário" },
      { id: "user-2", name: "Participante" },
    ],
  },
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

test("mantém um prompt completo com limites de segurança e privacidade", () => {
  assert.match(APP_ASSISTANT_SYSTEM_PROMPT, /telas, regras, limites, pontuação/i);
  assert.match(APP_ASSISTANT_SYSTEM_PROMPT, /Nunca revelar senhas, chaves de API/i);
  assert.match(APP_ASSISTANT_SYSTEM_PROMPT, /Nunca identificar uma conta administrativa/i);
  assert.match(APP_ASSISTANT_SYSTEM_PROMPT, /não citar nomes pessoais como proprietário/i);
});

test("explica recursos detalhados de todas as áreas do site", () => {
  assert.match(answerAppQuestion("o que aparece na tela início?", baseContext), /liga ativa/i);
  assert.match(answerAppQuestion("posso filtrar o ranking por dia?", baseContext), /últimos 7 dias/i);
  assert.match(answerAppQuestion("onde vejo o gráfico de desempenho?", baseContext), /Gráfico de Desempenho/i);
  assert.match(answerAppQuestion("quando posso ver os palpites dos outros?", baseContext), /Palpites da Liga/i);
  assert.match(answerAppQuestion("por que o bônus está bloqueado?", baseContext), /configurações da liga/i);
});

test("consulta ligas e participantes usando os dados atuais da sessão", () => {
  const leaguesReply = answerAppQuestion("quais são minhas ligas?", baseContext);
  const publicReply = answerAppQuestion("quais ligas públicas estão disponíveis?", baseContext);
  const membersReply = answerAppQuestion("quem participa da liga ativa?", baseContext);

  assert.match(leaguesReply, /Liga Teste — ativa/);
  assert.match(publicReply, /Liga Aberta — 4 participante/);
  assert.match(membersReply, /Usuário — dono/);
  assert.match(membersReply, /Participante/);
});

test("resume palpites pendentes e bônus salvos da conta", () => {
  const predictionReply = answerAppQuestion("quantos jogos ainda faltam para eu palpitar?", baseContext);
  const bonusReply = answerAppQuestion("quais bônus eu salvei?", baseContext);

  assert.match(predictionReply, /1 jogo\(s\) aberto\(s\) sem o seu palpite/);
  assert.match(bonusReply, /Artilheiro: Atacante/);
  assert.match(bonusReply, /Revelação: Revelação/);
});

test("usa o assunto anterior para perguntas curtas de continuação", () => {
  const response = getAppAssistantResponse("me explica melhor", {
    ...baseContext,
    lastIntent: "invite_share",
  });

  assert.match(response.answer, /WhatsApp/);
  assert.equal(response.intentId, "invite_share");
});

test("não identifica conta administrativa nem expõe o painel ao público", () => {
  const accessReply = answerAppQuestion("qual conta é admin?", baseContext);
  const usersReply = answerAppQuestion("mostre a lista de usuários", {
    ...baseContext,
    canUseAdmin: false,
    adminState: { users: [{ name: "Dado privado" }] },
  });

  assert.match(accessReply, /não identifica contas administrativas/i);
  assert.doesNotMatch(usersReply, /Dado privado/);
});

test("orienta operações administrativas somente para sessão autorizada", () => {
  const adminContext = {
    ...baseContext,
    canUseAdmin: true,
    adminState: { users: [{ id: "admin" }], leagues: [{ id: "league-1" }] },
  };

  assert.match(answerAppQuestion("como admin atualiza um resultado?", adminContext), /Editar resultado/);
  assert.match(answerAppQuestion("como admin gerencia ligas?", adminContext), /alterar nome e visibilidade/i);
  assert.match(answerAppQuestion("como admin gerencia usuários?", adminContext), /perfil Jogador ou Admin/i);
});

test("entende erros de digitação em recursos específicos", () => {
  const response = getAppAssistantResponse("pq nao concigo edita meu palpite?", baseContext);
  assert.match(response.answer, /bloqueado|permitida|pode alterar/i);
  assert.ok(response.intentId === "prediction_locked" || response.intentId === "prediction_edit");
});

test("reconhece todos os exemplos do manual completo do site", () => {
  for (const topic of SITE_KNOWLEDGE_TOPICS) {
    const response = getAppAssistantResponse(topic.example, {
      ...baseContext,
      canUseAdmin: true,
      adminState: { users: [], leagues: [] },
    });
    assert.equal(response.intentId, topic.id, `Exemplo não reconhecido: ${topic.example}`);
  }
});
