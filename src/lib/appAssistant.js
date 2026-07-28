import { DEFAULT_SCORING } from "./scoring.js";

const HELP_TEXT =
  "Posso ajudar com regras de pontuação, palpites, bônus, ligas, ranking, calendário e resultados. " +
  "Tente perguntar “Quais são os próximos jogos?”, “Como funciona a pontuação?” ou “Como entrar em uma liga?”.";

export function normalizeAssistantText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function includesTerm(text, term) {
  return ` ${text} `.includes(` ${term} `);
}

function fixtureTeamName(team, fallback) {
  return team?.name || fallback || "A definir";
}

function formatFixture(fixture) {
  const home = fixtureTeamName(fixture.home, fixture.homeTeamName);
  const away = fixtureTeamName(fixture.away, fixture.awayTeamName);
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(fixture.kickoff));

  if (fixture.status === "FINISHED") {
    return `${home} ${fixture.homeScore ?? "-"} x ${fixture.awayScore ?? "-"} ${away} — ${date}`;
  }

  return `${home} x ${away} — ${date}${fixture.venue ? `, ${fixture.venue}` : ""}`;
}

function upcomingFixtures(fixtures, now) {
  const ordered = [...fixtures].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const future = ordered.filter(
    (fixture) => fixture.status === "SCHEDULED" && new Date(fixture.kickoff).getTime() >= now,
  );
  return future.length ? future : ordered.filter((fixture) => fixture.status === "SCHEDULED");
}

function recentResults(fixtures) {
  return [...fixtures]
    .filter((fixture) => fixture.status === "FINISHED")
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));
}

function listFixtures(title, fixtures, limit = 5) {
  if (!fixtures.length) return `${title}: nenhum jogo encontrado nos dados atuais.`;
  return `${title}:\n${fixtures
    .slice(0, limit)
    .map((fixture) => `• ${formatFixture(fixture)}`)
    .join("\n")}`;
}

function scoringReply(activeLeague) {
  const scoring = activeLeague?.settings || DEFAULT_SCORING;
  return [
    "Pontuação atual:",
    `• Placar exato: ${scoring.exactScore ?? DEFAULT_SCORING.exactScore} pontos.`,
    `• Vencedor ou empate correto na fase de grupos: ${scoring.outcome ?? DEFAULT_SCORING.outcome} pontos.`,
    `• Classificado correto no mata-mata: ${scoring.qualifier ?? DEFAULT_SCORING.qualifier} pontos.`,
    `• Forma de classificação correta: ${scoring.qualificationMethod ?? DEFAULT_SCORING.qualificationMethod} pontos.`,
    "O palpite fecha quando a partida começa. No mata-mata, informe também quem se classifica e como.",
  ].join("\n");
}

function leagueReply({ currentUser, leagues, publicLeagues, activeLeague }) {
  if (!currentUser) {
    return "Entre na sua conta para criar uma liga ou participar de uma existente. Ligas públicas podem ser encontradas na área Liga; ligas privadas exigem o código de convite.";
  }

  const active = activeLeague ? ` Sua liga ativa é “${activeLeague.name}”.` : "";
  return `Abra a área Liga para criar uma liga, usar um código de convite ou entrar em uma liga pública. Você participa de ${leagues.length} liga(s) e há ${publicLeagues.length} liga(s) pública(s) disponível(is).${active}`;
}

function rankingReply({ currentUser, ranking, activeLeague }) {
  if (!currentUser) return "Entre na sua conta e participe de uma liga para consultar o ranking.";
  if (!activeLeague) return "Selecione ou entre em uma liga para consultar o ranking.";
  if (!ranking.length) return `O ranking da liga “${activeLeague.name}” ainda não possui participantes pontuados.`;

  return `Ranking da liga “${activeLeague.name}”:\n${ranking
    .slice(0, 5)
    .map((user) => `${user.position}º ${user.name} — ${user.points} ponto(s)`)
    .join("\n")}`;
}

function teamReply(query, fixtures, now) {
  const teams = new Map();
  fixtures.forEach((fixture) => {
    [fixture.home, fixture.away].forEach((team) => {
      if (team?.name) teams.set(normalizeAssistantText(team.name), team.name);
    });
  });

  const matchedEntry = [...teams.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([normalizedName]) => includesTerm(query, normalizedName));

  if (!matchedEntry) return null;

  const [, teamName] = matchedEntry;
  const normalizedTeam = normalizeAssistantText(teamName);
  const teamFixtures = fixtures.filter((fixture) =>
    [fixtureTeamName(fixture.home), fixtureTeamName(fixture.away)]
      .map(normalizeAssistantText)
      .includes(normalizedTeam),
  );
  const next = upcomingFixtures(teamFixtures, now);
  if (next.length) return listFixtures(`Próximos jogos de ${teamName}`, next, 4);

  return listFixtures(`Resultados mais recentes de ${teamName}`, recentResults(teamFixtures), 4);
}

function adminReply(query, context, now) {
  if (!context.canUseAdmin) return null;
  if (
    !includesAny(query, [
      "admin",
      "administrativo",
      "resumo",
      "situacao",
      "atencao",
      "usuarios",
      "sincronizacao",
      "dados atuais",
    ])
  ) {
    return null;
  }

  const users = context.adminState?.users || [];
  const leagues = context.adminState?.leagues || [];
  const finished = context.fixtures.filter((fixture) => fixture.status === "FINISHED").length;
  const scheduled = context.fixtures.filter((fixture) => fixture.status === "SCHEDULED").length;
  const overdue = context.fixtures.filter(
    (fixture) => fixture.status === "SCHEDULED" && new Date(fixture.kickoff).getTime() < now,
  ).length;

  return [
    "Resumo administrativo:",
    `• ${users.length} usuário(s) carregado(s).`,
    `• ${leagues.length} liga(s) cadastrada(s).`,
    `• ${finished} jogo(s) finalizado(s) e ${scheduled} agendado(s).`,
    `• ${overdue} jogo(s) com horário passado ainda aparecem como agendados.`,
    context.lastSync ? `• Última sincronização: ${context.lastSync}.` : "• Não há horário de sincronização disponível.",
    "Para criar, editar ou excluir dados, use a aba Admin. O assistente interno não executa alterações.",
  ].join("\n");
}

export function answerAppQuestion(message, context = {}) {
  const query = normalizeAssistantText(message);
  const now = Number(context.now || Date.now());
  const safeContext = {
    fixtures: Array.isArray(context.fixtures) ? context.fixtures : [],
    leagues: Array.isArray(context.leagues) ? context.leagues : [],
    publicLeagues: Array.isArray(context.publicLeagues) ? context.publicLeagues : [],
    ranking: Array.isArray(context.ranking) ? context.ranking : [],
    currentUser: context.currentUser || null,
    activeLeague: context.activeLeague || null,
    adminState: context.adminState || {},
    canUseAdmin: Boolean(context.canUseAdmin),
    lastSync: context.lastSync || "",
  };

  if (!query) return HELP_TEXT;

  if (includesAny(query, ["oi", "ola", "bom dia", "boa tarde", "boa noite", "ajuda"])) {
    return safeContext.canUseAdmin
      ? `${HELP_TEXT} Também posso apresentar um resumo administrativo dos dados carregados.`
      : HELP_TEXT;
  }

  const adminAnswer = adminReply(query, safeContext, now);
  if (adminAnswer) return adminAnswer;

  if (includesAny(query, ["pontuacao", "pontos", "placar exato", "classificado"])) {
    return scoringReply(safeContext.activeLeague);
  }

  if (includesAny(query, ["proximos jogos", "proximo jogo", "calendario", "partidas"])) {
    return listFixtures("Próximos jogos", upcomingFixtures(safeContext.fixtures, now));
  }

  if (includesAny(query, ["resultado", "resultados", "ultimo jogo", "ultimos jogos"])) {
    return listFixtures("Resultados mais recentes", recentResults(safeContext.fixtures));
  }

  if (includesAny(query, ["ranking", "classificacao", "lider", "posicao"])) {
    return rankingReply(safeContext);
  }

  if (includesAny(query, ["liga", "convite", "codigo"])) {
    return leagueReply(safeContext);
  }

  if (includesAny(query, ["palpite", "apostar", "prever"])) {
    return "Abra a área Jogos, escolha a partida e informe o placar. No mata-mata, indique também o classificado e se a classificação acontece no tempo normal, na prorrogação ou nos pênaltis. O palpite fecha no início da partida.";
  }

  if (includesAny(query, ["bonus", "campeao", "artilheiro"])) {
    return "Na área Bônus você pode escolher previsões especiais, como campeão e artilheiro, quando essas opções estiverem liberadas para a sua liga.";
  }

  const teamAnswer = teamReply(query, safeContext.fixtures, now);
  if (teamAnswer) return teamAnswer;

  if (includesAny(query, ["como funciona", "regras", "o que posso"])) return HELP_TEXT;

  return `Não encontrei uma resposta específica para essa pergunta. ${HELP_TEXT}`;
}
