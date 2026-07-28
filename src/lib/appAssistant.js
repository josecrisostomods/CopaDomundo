import { DEFAULT_SCORING } from "./scoring.js";

const HELP_TEXT =
  "Posso consultar jogos, resultados, classificação, ligas e seus dados atuais, além de explicar palpites, bônus e todas as regras do site.";

const PUBLIC_STARTER_SUGGESTIONS = [
  "Quais são os próximos jogos?",
  "Como funciona a pontuação?",
  "Qual foi o último resultado?",
  "Como está o ranking?",
  "Como fazer um palpite?",
  "Como entrar em uma liga?",
  "Quando o palpite fecha?",
  "Como funciona o mata-mata?",
];

const ADMIN_STARTER_SUGGESTIONS = [
  "Resuma a situação atual do aplicativo.",
  "Quais dados precisam de atenção administrativa?",
  "Quando ocorreu a última sincronização?",
];

const INTENTS = [
  {
    id: "scoring",
    label: "a pontuação",
    example: "Como funciona a pontuação?",
    phrases: [
      "pontuacao",
      "pontos",
      "placar exato",
      "quanto vale",
      "como pontua",
      "regra de pontos",
    ],
  },
  {
    id: "upcoming",
    label: "os próximos jogos",
    example: "Quais são os próximos jogos?",
    phrases: [
      "proximos jogos",
      "proximo jogo",
      "calendario",
      "agenda",
      "partidas futuras",
      "quem joga",
      "jogos de hoje",
    ],
  },
  {
    id: "results",
    label: "os resultados",
    example: "Quais foram os últimos resultados?",
    phrases: [
      "resultado",
      "resultados",
      "ultimo jogo",
      "ultimos jogos",
      "placares",
      "quem ganhou",
      "quem venceu",
    ],
  },
  {
    id: "ranking",
    label: "o ranking",
    example: "Como está o ranking?",
    phrases: ["ranking", "classificacao", "lider", "lideranca", "tabela", "posicoes"],
  },
  {
    id: "my_stats",
    label: "seus pontos e palpites",
    example: "Quantos pontos e palpites eu tenho?",
    phrases: [
      "meus pontos",
      "minha pontuacao",
      "minha posicao",
      "meu ranking",
      "meus palpites",
      "quantos pontos",
      "pontos e palpites",
      "quantos palpites fiz",
      "como estou",
    ],
  },
  {
    id: "tiebreaker",
    label: "os critérios de desempate",
    example: "Como funciona o desempate do ranking?",
    phrases: ["desempate", "empate no ranking", "criterio do ranking", "criterios de desempate"],
  },
  {
    id: "league",
    label: "as ligas",
    example: "Como criar ou entrar em uma liga?",
    phrases: [
      "liga",
      "ligas",
      "convite",
      "codigo da liga",
      "entrar na liga",
      "criar liga",
      "trocar liga",
      "liga publica",
      "liga privada",
    ],
  },
  {
    id: "league_visibility",
    label: "a diferença entre ligas públicas e privadas",
    example: "Qual a diferença entre liga pública e privada?",
    phrases: [
      "liga publica ou privada",
      "diferenca entre ligas",
      "liga publica",
      "liga privada",
      "visibilidade da liga",
      "quem pode entrar",
    ],
  },
  {
    id: "league_limit",
    label: "o limite de ligas",
    example: "Quantas ligas posso criar?",
    phrases: [
      "quantas ligas posso criar",
      "limite de ligas",
      "maximo de ligas",
      "criei muitas ligas",
    ],
  },
  {
    id: "prediction",
    label: "como fazer um palpite",
    example: "Como faço um palpite?",
    phrases: ["palpite", "palpitar", "apostar", "prever", "mudar palpite", "editar palpite"],
  },
  {
    id: "deadline",
    label: "o prazo dos palpites",
    example: "Quando o palpite fecha?",
    phrases: [
      "quando fecha",
      "prazo do palpite",
      "palpite fechado",
      "jogo fechado",
      "ate quando",
      "horario limite",
    ],
  },
  {
    id: "knockout",
    label: "o mata-mata",
    example: "Como funciona o palpite no mata-mata?",
    phrases: [
      "mata mata",
      "classificado",
      "quem se classifica",
      "prorrogacao",
      "penaltis",
      "forma de classificacao",
    ],
  },
  {
    id: "bonus",
    label: "os palpites de bônus",
    example: "Como funcionam os bônus?",
    phrases: [
      "bonus",
      "campeao",
      "artilheiro",
      "previsao especial",
      "palpite especial",
      "selecao campea",
    ],
  },
  {
    id: "prediction_scope",
    label: "em quais ligas o palpite vale",
    example: "Meu palpite vale em todas as ligas?",
    phrases: [
      "palpite vale em todas as ligas",
      "palpite por liga",
      "mesmo palpite",
      "troquei de liga",
      "entrei em outra liga",
      "palpites globais",
    ],
  },
  {
    id: "max_points",
    label: "o máximo de pontos por jogo",
    example: "Qual o máximo de pontos por jogo?",
    phrases: [
      "maximo de pontos",
      "pontuacao maxima",
      "quantos pontos por jogo",
      "nove pontos",
      "9 pontos",
    ],
  },
  {
    id: "penalty_score",
    label: "como informar o placar com pênaltis",
    example: "O placar do mata-mata inclui os pênaltis?",
    phrases: [
      "placar inclui penaltis",
      "placar inclui os penaltis",
      "somar penaltis",
      "placar dos penaltis",
      "resultado com penaltis",
      "placar oficial",
    ],
  },
  {
    id: "account",
    label: "como criar uma conta",
    example: "Como faço meu cadastro?",
    phrases: [
      "cadastro",
      "cadastrar",
      "criar conta",
      "nova conta",
      "usuario e senha",
      "comecar a jogar",
    ],
  },
  {
    id: "recovery",
    label: "como recuperar a conta",
    example: "Como recupero minha conta?",
    phrases: [
      "esqueci a senha",
      "esqueci usuario",
      "recuperar conta",
      "recuperacao de conta",
      "codigo de validacao",
      "perdi o acesso",
      "nova senha",
    ],
  },
  {
    id: "profile",
    label: "o perfil e acesso",
    example: "Como altero meu perfil?",
    phrases: [
      "perfil",
      "meu nome",
      "alterar nome",
      "codigo de recuperacao",
      "recuperar conta",
      "sair da conta",
      "login",
      "acesso",
    ],
  },
  {
    id: "sync",
    label: "a atualização dos dados",
    example: "Quando os jogos são atualizados?",
    phrases: [
      "atualizacao",
      "atualizar",
      "sincronizacao",
      "ultima sincronizacao",
      "dados atualizados",
      "placar desatualizado",
    ],
  },
  {
    id: "privacy",
    label: "a privacidade do assistente",
    example: "O assistente envia meus dados para algum serviço?",
    phrases: [
      "privacidade",
      "meus dados",
      "inteligencia artificial",
      "openai",
      "gemini",
      "servico externo",
      "chave de api",
    ],
  },
  {
    id: "navigation",
    label: "onde encontrar cada recurso",
    example: "Onde encontro jogos, ranking e perfil?",
    phrases: [
      "onde fica",
      "onde encontro",
      "como navegar",
      "menu",
      "abas",
      "pagina de jogos",
      "area de ranking",
    ],
  },
  {
    id: "filters",
    label: "como localizar jogos",
    example: "Como encontro um jogo específico?",
    phrases: [
      "buscar jogo",
      "procurar jogo",
      "encontrar partida",
      "filtrar jogos",
      "meus palpites",
      "jogos encerrados",
      "buscar selecao",
      "buscar fase",
    ],
  },
  {
    id: "tournament",
    label: "o calendário e as fases da Copa",
    example: "Quantos jogos e fases existem?",
    phrases: [
      "quantos jogos",
      "fases da copa",
      "fase de grupos",
      "formato da copa",
      "calendario completo",
      "104 jogos",
      "oitavas",
      "quartas",
      "semifinal",
      "final da copa",
    ],
  },
  {
    id: "data_source",
    label: "a origem dos resultados",
    example: "De onde vêm os jogos e resultados?",
    phrases: [
      "de onde vem os resultados",
      "origem dos dados",
      "fonte dos jogos",
      "api de futebol",
      "resultado oficial",
      "dados das partidas",
    ],
  },
  {
    id: "troubleshooting",
    label: "um problema no site",
    example: "O que faço se algo não atualizar?",
    phrases: [
      "nao funciona",
      "deu erro",
      "erro no site",
      "nao atualiza",
      "nao salvou",
      "palpite sumiu",
      "resultado errado",
      "tela travou",
      "problema",
    ],
  },
  {
    id: "money",
    label: "se o bolão envolve dinheiro",
    example: "O bolão usa dinheiro real?",
    phrases: [
      "dinheiro real",
      "vale dinheiro",
      "premio em dinheiro",
      "aposta",
      "pagar para jogar",
      "custa alguma coisa",
    ],
  },
  {
    id: "mobile",
    label: "como usar no celular",
    example: "Preciso instalar o aplicativo?",
    phrases: [
      "instalar aplicativo",
      "baixar aplicativo",
      "usar no celular",
      "app para celular",
      "play store",
      "pwa",
    ],
  },
  {
    id: "admin",
    label: "o resumo administrativo",
    example: "Resuma a situação administrativa.",
    phrases: [
      "admin",
      "administrativo",
      "resumo do aplicativo",
      "situacao administrativa",
      "dados precisam de atencao",
      "usuarios cadastrados",
    ],
  },
];

const INTENT_SUGGESTIONS = {
  scoring: [
    "Como funciona o desempate do ranking?",
    "Como funciona o mata-mata?",
    "Quando o palpite fecha?",
    "Quantos pontos eu tenho?",
  ],
  upcoming: [
    "Qual foi o último resultado?",
    "Quando o palpite fecha?",
    "Como faço um palpite?",
    "Como está o ranking?",
  ],
  results: [
    "Quais são os próximos jogos?",
    "Como está o ranking?",
    "Quantos pontos eu tenho?",
    "Como funciona a pontuação?",
  ],
  ranking: [
    "Quantos pontos eu tenho?",
    "Como funciona o desempate do ranking?",
    "Como funciona a pontuação?",
    "Quais foram os últimos resultados?",
  ],
  my_stats: [
    "Como está o ranking?",
    "Como funciona a pontuação?",
    "Quantos palpites fiz?",
    "Quais foram os últimos resultados?",
  ],
  tiebreaker: [
    "Como funciona a pontuação?",
    "Como está o ranking?",
    "Quantos pontos eu tenho?",
    "Como funciona o mata-mata?",
  ],
  league: [
    "Como está o ranking?",
    "Como faço um palpite?",
    "Como altero meu perfil?",
    "Quais são os próximos jogos?",
  ],
  league_visibility: [
    "Como entrar em uma liga?",
    "Quantas ligas posso criar?",
    "Meu palpite vale em todas as ligas?",
    "Como está o ranking?",
  ],
  league_limit: [
    "Como criar uma liga?",
    "Qual a diferença entre liga pública e privada?",
    "Como entrar com um convite?",
    "Meu palpite vale em todas as ligas?",
  ],
  prediction: [
    "Quando o palpite fecha?",
    "Como funciona o mata-mata?",
    "Como funciona a pontuação?",
    "Como funcionam os bônus?",
  ],
  deadline: [
    "Como faço um palpite?",
    "Quais são os próximos jogos?",
    "Posso alterar um palpite?",
    "Como funciona o mata-mata?",
  ],
  knockout: [
    "Como funciona a pontuação?",
    "Quando o palpite fecha?",
    "Como faço um palpite?",
    "Quais são os próximos jogos?",
  ],
  bonus: [
    "Como faço um palpite?",
    "Como funciona a pontuação?",
    "Quando o palpite fecha?",
    "Como está o ranking?",
  ],
  prediction_scope: [
    "Como faço um palpite?",
    "Como entrar em uma liga?",
    "Como está o ranking?",
    "Quando o palpite fecha?",
  ],
  max_points: [
    "Como funciona a pontuação?",
    "Como funciona o mata-mata?",
    "O placar inclui os pênaltis?",
    "Como funciona o desempate?",
  ],
  penalty_score: [
    "Como funciona o mata-mata?",
    "Qual o máximo de pontos por jogo?",
    "Como faço um palpite?",
    "Quando o palpite fecha?",
  ],
  account: [
    "Como recupero minha conta?",
    "Como entrar em uma liga?",
    "Como altero meu perfil?",
    "Preciso instalar o aplicativo?",
  ],
  recovery: [
    "Como faço meu cadastro?",
    "Onde encontro o código de validação?",
    "Como altero meu perfil?",
    "Como entrar em uma liga?",
  ],
  profile: [
    "Como entrar em uma liga?",
    "Onde encontro jogos, ranking e perfil?",
    "Quantos pontos eu tenho?",
    "Como recuperar minha conta?",
  ],
  sync: [
    "Quais são os próximos jogos?",
    "Quais foram os últimos resultados?",
    "O placar está desatualizado.",
    "Como está o ranking?",
  ],
  privacy: [
    "O assistente usa inteligência artificial?",
    "Quais dados o assistente consegue consultar?",
    "Como altero meu perfil?",
    "O que você pode responder?",
  ],
  navigation: [
    "Como faço um palpite?",
    "Como entrar em uma liga?",
    "Como altero meu perfil?",
    "Como está o ranking?",
  ],
  filters: [
    "Quais são os próximos jogos?",
    "Quais foram os últimos resultados?",
    "Como faço um palpite?",
    "Quando o palpite fecha?",
  ],
  tournament: [
    "Quais são os próximos jogos?",
    "Como funciona o mata-mata?",
    "De onde vêm os resultados?",
    "Como faço um palpite?",
  ],
  data_source: [
    "Quando os jogos são atualizados?",
    "O que faço se algo não atualizar?",
    "Quais foram os últimos resultados?",
    "Quais são os próximos jogos?",
  ],
  troubleshooting: [
    "Quando os jogos são atualizados?",
    "Meu palpite não foi salvo.",
    "O resultado está errado.",
    "Como recupero minha conta?",
  ],
  money: [
    "Como funciona a pontuação?",
    "Como faço um palpite?",
    "Como entrar em uma liga?",
    "Preciso instalar o aplicativo?",
  ],
  mobile: [
    "Como faço meu cadastro?",
    "Como faço um palpite?",
    "Como entrar em uma liga?",
    "Onde encontro jogos, ranking e perfil?",
  ],
  admin: [
    "Quais dados precisam de atenção administrativa?",
    "Quando ocorreu a última sincronização?",
    "Quantos usuários estão cadastrados?",
    "Quantos jogos ainda estão agendados?",
  ],
};

export function normalizeAssistantText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAssistantStarterSuggestions(canUseAdmin = false) {
  return canUseAdmin
    ? [...ADMIN_STARTER_SUGGESTIONS, ...PUBLIC_STARTER_SUGGESTIONS]
    : [...PUBLIC_STARTER_SUGGESTIONS];
}

function includesPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

function includesAny(text, terms) {
  return terms.some((term) => includesPhrase(text, term));
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    for (let index = 0; index <= right.length; index += 1) previous[index] = current[index];
  }

  return previous[right.length];
}

function wordSimilarity(left, right) {
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  if (Math.min(left.length, right.length) <= 2) return 0;
  return 1 - editDistance(left, right) / longest;
}

function phraseScore(query, phrase) {
  if (includesPhrase(query, phrase)) {
    return { score: 1 + phrase.split(" ").length * 0.03, exact: true };
  }

  const queryTokens = query.split(" ").filter(Boolean);
  const phraseTokens = phrase.split(" ").filter(Boolean);
  if (!queryTokens.length || !phraseTokens.length) return { score: 0, exact: false };

  const similarities = phraseTokens.map((phraseToken) =>
    Math.max(...queryTokens.map((queryToken) => wordSimilarity(phraseToken, queryToken))),
  );
  const average = similarities.reduce((total, value) => total + value, 0) / similarities.length;
  const covered = similarities.filter((value) => value >= 0.68).length / similarities.length;
  const score = average * 0.72 + covered * 0.28;
  return { score, exact: false };
}

function resolveIntent(query, canUseAdmin) {
  const candidates = INTENTS.filter((intent) => canUseAdmin || intent.id !== "admin").map((intent) => {
    const matches = intent.phrases.map((phrase) => ({
      ...phraseScore(query, phrase),
      phrase,
    }));
    const best = matches.sort((left, right) => right.score - left.score)[0];
    return { ...intent, ...best };
  });

  return candidates.sort((left, right) => right.score - left.score)[0];
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
  const ordered = [...fixtures].sort((left, right) => new Date(left.kickoff) - new Date(right.kickoff));
  const future = ordered.filter(
    (fixture) => fixture.status === "SCHEDULED" && new Date(fixture.kickoff).getTime() >= now,
  );
  return future.length ? future : ordered.filter((fixture) => fixture.status === "SCHEDULED");
}

function recentResults(fixtures) {
  return [...fixtures]
    .filter((fixture) => fixture.status === "FINISHED")
    .sort((left, right) => new Date(right.kickoff) - new Date(left.kickoff));
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
    return "Entre na sua conta para criar uma liga ou participar de uma existente. Ligas públicas aparecem na área Liga; ligas privadas exigem o código de convite.";
  }

  const active = activeLeague ? ` Sua liga ativa é “${activeLeague.name}”.` : "";
  return `Abra Liga para criar uma competição, usar um código de convite, trocar a liga ativa ou entrar em uma liga pública. Você participa de ${leagues.length} liga(s) e há ${publicLeagues.length} liga(s) pública(s) disponível(is).${active}`;
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

function myStatsReply({ currentUser, ranking, userPredictions, activeLeague }) {
  if (!currentUser) return "Entre na sua conta para consultar seus pontos, posição e palpites.";
  if (!activeLeague) return "Entre ou selecione uma liga para consultar seus dados.";

  const currentRanking = ranking.find((entry) => entry.id === currentUser.id);
  const position = currentRanking ? `${currentRanking.position}º lugar com ${currentRanking.points} ponto(s)` : "sem posição calculada";
  return `Na liga “${activeLeague.name}”, você está em ${position} e possui ${userPredictions.length} palpite(s) registrado(s).`;
}

function syncReply({ lastSync }) {
  return lastSync
    ? `Os jogos e resultados são atualizados pela sincronização da aplicação. A última atualização informada foi ${lastSync}.`
    : "Os jogos e resultados são atualizados pela sincronização da aplicação. Ainda não há um horário de atualização disponível nesta sessão.";
}

function profileReply(currentUser) {
  if (!currentUser) {
    return "Use a tela de acesso para entrar ou criar sua conta. Se receber um código de recuperação, guarde-o em local seguro.";
  }
  return "Abra Perfil para alterar seus dados e gerar um código de recuperação. Para encerrar a sessão, use Sair no topo da tela.";
}

function adminReply(context, now) {
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

function findTeamQuestion(query, fixtures, now) {
  const teams = new Map();
  fixtures.forEach((fixture) => {
    [fixture.home, fixture.away].forEach((team) => {
      if (team?.name) teams.set(normalizeAssistantText(team.name), team.name);
    });
  });

  const matches = [...teams.entries()].map(([normalizedName, teamName]) => {
    const result = phraseScore(query, normalizedName);
    return { normalizedName, teamName, ...result };
  });
  const best = matches.sort((left, right) => right.score - left.score)[0];
  if (!best || best.score < 0.76) return null;

  const teamTerms = [
    "jogo",
    "jogos",
    "joga",
    "partida",
    "resultado",
    "placar",
    "quando",
    "proximo",
    "ultimo",
  ];
  if (query.split(" ").length > 3 && !includesAny(query, teamTerms)) return null;

  const teamFixtures = fixtures.filter((fixture) =>
    [fixtureTeamName(fixture.home), fixtureTeamName(fixture.away)]
      .map(normalizeAssistantText)
      .includes(best.normalizedName),
  );
  const wantsResult = includesAny(query, ["resultado", "placar", "ultimo", "ganhou", "venceu"]);
  const selectedFixtures = wantsResult ? recentResults(teamFixtures) : upcomingFixtures(teamFixtures, now);
  const title = wantsResult ? `Resultados mais recentes de ${best.teamName}` : `Próximos jogos de ${best.teamName}`;

  return {
    answer: listFixtures(title, selectedFixtures, 4),
    suggestions: [
      "Quais são os próximos jogos?",
      "Quais foram os últimos resultados?",
      "Como funciona a pontuação?",
      "Como está o ranking?",
    ],
    interpretedAs: best.exact ? "" : `Entendi que você quis consultar ${best.teamName}.`,
  };
}

function replyForIntent(intentId, context, now) {
  switch (intentId) {
    case "scoring":
      return scoringReply(context.activeLeague);
    case "upcoming":
      return listFixtures("Próximos jogos", upcomingFixtures(context.fixtures, now));
    case "results":
      return listFixtures("Resultados mais recentes", recentResults(context.fixtures));
    case "ranking":
      return rankingReply(context);
    case "my_stats":
      return myStatsReply(context);
    case "tiebreaker":
      return "O ranking desempata nesta ordem: mais pontos, mais placares exatos, mais classificados corretos no mata-mata, maior quantidade de palpites pontuados e, por último, ordem alfabética.";
    case "league":
      return leagueReply(context);
    case "league_visibility":
      return "Ligas públicas aparecem para todos os usuários e permitem entrada direta. Ligas privadas não aparecem na lista pública: para entrar, o participante precisa receber e informar o código de convite.";
    case "league_limit":
      return "Cada usuário pode criar até 3 ligas. Mesmo depois de atingir esse limite, ainda é possível entrar em outras ligas públicas ou privadas por convite.";
    case "prediction":
      return "Abra Jogos, escolha a partida e informe o placar. Você pode alterar o palpite enquanto o jogo ainda não começou. No mata-mata, indique também o classificado e a forma de classificação.";
    case "deadline":
      return "O palpite fecha automaticamente quando a partida começa. Depois desse horário ele não pode ser criado nem alterado.";
    case "knockout":
      return "No mata-mata, informe o placar, quem se classifica e se a classificação acontece no tempo normal, na prorrogação ou nos pênaltis. Cada acerto usa a pontuação configurada na liga.";
    case "bonus":
      return "Na área Bônus você pode escolher a seleção campeã, que vale 15 pontos, o artilheiro e o jogador revelação, que valem 10 pontos cada. As escolhas podem ser alteradas enquanto o bônus da liga estiver aberto.";
    case "prediction_scope":
      return "Cada palpite pertence ao usuário e vale em todas as ligas das quais ele participa. Se você entrar em outra liga depois, os palpites já feitos também passam a contar nela.";
    case "max_points":
      return "Na fase de grupos, o máximo é 5 pontos por jogo. No mata-mata, é possível fazer até 9 pontos: 5 pelo placar exato, 2 pelo classificado e 2 pela forma de classificação.";
    case "penalty_score":
      return "No mata-mata, informe o placar oficial sem somar a disputa de pênaltis. Depois escolha quem se classifica e marque Pênaltis como forma de classificação.";
    case "account":
      return "Na tela inicial, escolha Cadastrar, crie seu usuário e senha e depois informe o nome que aparecerá no ranking. Guarde o código de validação exibido após o cadastro.";
    case "recovery":
      return "Na tela de acesso, escolha Recuperar. Informe o código de validação guardado e crie um novo usuário e uma nova senha. O código também pode ser gerado novamente na área Perfil enquanto a conta estiver conectada.";
    case "profile":
      return profileReply(context.currentUser);
    case "sync":
      return syncReply(context);
    case "privacy":
      return "Este assistente funciona dentro do próprio site. Ele usa apenas regras e dados já carregados na aplicação e não envia a conversa para OpenAI, Gemini ou outro serviço de inteligência artificial.";
    case "navigation":
      return "Use as áreas Inicio para o resumo, Jogos para palpites, Bonus para previsões especiais, Ranking para a classificação, Liga para participar de competições e Perfil para sua conta. A área Admin aparece somente para administradores.";
    case "filters":
      return "Abra Jogos e use a busca pelo nome da seleção ou fase. Os filtros permitem mostrar todas as partidas, próximas partidas, resultados, seus palpites ou somente o mata-mata.";
    case "tournament": {
      const total = context.fixtures.length;
      const finished = context.fixtures.filter((fixture) => fixture.status === "FINISHED").length;
      const scheduled = context.fixtures.filter((fixture) => fixture.status === "SCHEDULED").length;
      return `O calendário possui ${total || 104} partida(s) carregada(s), com fase de grupos e mata-mata. Neste momento há ${finished} finalizada(s) e ${scheduled} agendada(s). Os vencedores do mata-mata avançam automaticamente quando o resultado oficial é registrado.`;
    }
    case "data_source":
      return "A aplicação mantém um calendário local completo e tenta sincronizar partidas e placares com provedores de dados de futebol. Quando novos dados oficiais chegam, eles são mesclados sem apagar o calendário existente.";
    case "troubleshooting":
      return "Se algo não atualizar, confira a mensagem no topo, aguarde a sincronização e recarregue a página. Verifique também sua conexão e se o jogo já começou. Se o problema continuar, informe ao administrador qual tela, jogo e mensagem de erro apareceram.";
    case "money":
      return "Não. Este é um bolão recreativo por pontos e ranking. A aplicação não registra apostas, pagamentos nem dinheiro real.";
    case "mobile":
      return "Não é necessário instalar nada. Abra o site no navegador do celular; a interface foi preparada para uso em telas pequenas.";
    case "admin":
      return adminReply(context, now);
    default:
      return HELP_TEXT;
  }
}

function greetingReply(canUseAdmin) {
  return canUseAdmin
    ? `${HELP_TEXT} Também posso mostrar um resumo administrativo dos dados carregados.`
    : HELP_TEXT;
}

function buildSafeContext(context) {
  return {
    fixtures: Array.isArray(context.fixtures) ? context.fixtures : [],
    leagues: Array.isArray(context.leagues) ? context.leagues : [],
    publicLeagues: Array.isArray(context.publicLeagues) ? context.publicLeagues : [],
    ranking: Array.isArray(context.ranking) ? context.ranking : [],
    userPredictions: Array.isArray(context.userPredictions) ? context.userPredictions : [],
    bonusPredictions: Array.isArray(context.bonusPredictions) ? context.bonusPredictions : [],
    currentUser: context.currentUser || null,
    activeLeague: context.activeLeague || null,
    adminState: context.adminState || {},
    canUseAdmin: Boolean(context.canUseAdmin),
    lastSync: context.lastSync || "",
  };
}

export function getAppAssistantResponse(message, context = {}) {
  const query = normalizeAssistantText(message);
  const now = Number(context.now || Date.now());
  const safeContext = buildSafeContext(context);
  const starterSuggestions = getAssistantStarterSuggestions(safeContext.canUseAdmin);

  if (!query) {
    return { answer: greetingReply(safeContext.canUseAdmin), suggestions: starterSuggestions };
  }

  if (includesAny(query, ["oi", "ola", "bom dia", "boa tarde", "boa noite", "ajuda", "o que voce faz"])) {
    return { answer: greetingReply(safeContext.canUseAdmin), suggestions: starterSuggestions };
  }

  if (!safeContext.canUseAdmin && includesAny(query, ["admin", "administrativo", "area admin"])) {
    return {
      answer: "A área administrativa é restrita a contas autorizadas. Posso continuar ajudando com jogos, resultados, palpites, ligas, ranking e regras públicas.",
      suggestions: PUBLIC_STARTER_SUGGESTIONS.slice(0, 5),
    };
  }

  const teamQuestion = findTeamQuestion(query, safeContext.fixtures, now);
  if (teamQuestion) return teamQuestion;

  const intent = resolveIntent(query, safeContext.canUseAdmin);
  if (intent?.score >= 0.73) {
    return {
      answer: replyForIntent(intent.id, safeContext, now),
      suggestions: INTENT_SUGGESTIONS[intent.id] || starterSuggestions.slice(0, 4),
      interpretedAs: intent.exact ? "" : `Entendi que você quis perguntar sobre ${intent.label}.`,
    };
  }

  if (intent?.score >= 0.56) {
    const alternatives = [
      intent.example,
      ...starterSuggestions.filter((suggestion) => suggestion !== intent.example),
    ].slice(0, 5);
    return {
      answer: `Não tive certeza da pergunta. Você quis dizer “${intent.example}”? Toque em uma opção abaixo ou escreva novamente com mais detalhes.`,
      suggestions: alternatives,
      interpretedAs: `A intenção mais provável é ${intent.label}.`,
    };
  }

  return {
    answer: `Ainda não reconheci essa pergunta. ${HELP_TEXT} Escolha uma das opções abaixo para continuar.`,
    suggestions: starterSuggestions.slice(0, 6),
  };
}

export function answerAppQuestion(message, context = {}) {
  return getAppAssistantResponse(message, context).answer;
}
