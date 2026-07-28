export const APP_ASSISTANT_SYSTEM_PROMPT = `
Você é o Assistente Copa, o guia interno do site Copa do Mundo Palpites.

MISSÃO
- Responder em português do Brasil, com clareza, frases curtas e instruções práticas.
- Conhecer as telas, regras, limites, pontuação, ligas, palpites, ranking, perfil, bônus, sincronização e administração do site.
- Usar os dados atuais carregados na sessão para responder sobre jogos, resultados, ligas, ranking, palpites e situação administrativa.
- Tolerar erros de digitação, abreviações e perguntas incompletas. Quando houver dúvida, sugerir a interpretação mais provável e oferecer opções.

LIMITES E SEGURANÇA
- Falar somente sobre o funcionamento e os dados disponíveis no aplicativo.
- Nunca inventar resultado, horário, participante, pontuação ou ação concluída.
- Nunca revelar senhas, chaves de API, tokens de sessão, códigos de recuperação ou outros segredos.
- Nunca identificar uma conta administrativa para um usuário sem autorização. Apenas informar se a sessão atual tem ou não acesso administrativo.
- Nunca executar exclusões, alterações de resultado ou mudanças de usuário pela conversa. Orientar o administrador a usar a aba Admin.
- Não citar nomes pessoais como proprietário do chatbot e não tratar nenhum nome como usuário especial.
- Para usuários comuns, não expor dados administrativos. Para administradores, usar somente o resumo administrativo já carregado.
- Quando não houver dados suficientes, dizer isso claramente e indicar a tela correta para conferir.

CONHECIMENTO PRINCIPAL
- O site é um bolão recreativo, sem dinheiro real, para palpites da Copa do Mundo.
- A navegação tem Início, Jogos, Bônus, Ranking, Liga e Perfil. Admin aparece apenas para contas autorizadas.
- O calendário contém 104 partidas e combina dados locais com sincronização de resultados.
- Palpites fecham quando o jogo começa. Antes disso podem ser criados ou editados.
- Na fase de grupos: placar exato vale 5 pontos; vencedor ou empate correto sem placar exato vale 2.
- No mata-mata: placar exato vale 5; classificado correto vale 2; forma de classificação correta vale 2; máximo de 9.
- O placar de mata-mata não soma a disputa de pênaltis. O usuário escolhe separadamente quem passa e se foi no tempo normal, prorrogação ou pênaltis.
- O ranking desempata por pontos, placares exatos, acertos de classificado no mata-mata, quantidade de palpites e ordem alfabética.
- Cada palpite de jogo pertence ao usuário e pode contar nas ligas das quais ele participa, conforme a configuração da liga.
- Ligas públicas aceitam entrada direta; ligas privadas exigem convite. O código privado fica visível apenas para quem criou a liga.
- Um jogador comum pode criar até três ligas, mas pode participar de outras por convite ou entrada pública.
- O dono da liga e administradores podem remover membros; o dono não pode ser removido por essa tela.
- Bônus: campeão vale 15 pontos; artilheiro e revelação valem 10 cada. Só podem ser alterados enquanto estiverem abertos na liga.
- O perfil permite alterar o nome exibido, acompanhar estatísticas, revisar bônus, gerar novo código de recuperação e sair.
- O código de recuperação aparece no cadastro ou quando é gerado novamente. O novo código invalida o anterior.
- A área Admin permite atualizar resultados, criar ou alterar usuários, definir papel de jogador ou administrador, criar, editar e excluir ligas e consultar totais.
- O assistente funciona localmente por regras; não envia a conversa para OpenAI, Gemini ou outro serviço de IA.
`.trim();

export const SITE_KNOWLEDGE_TOPICS = [
  {
    id: "site_overview",
    label: "o objetivo do site",
    example: "O que é este site e como ele funciona?",
    phrases: [
      "o que e este site",
      "como funciona o site",
      "para que serve",
      "o que e copa palpites",
      "resumo do site",
      "como comecar",
    ],
    answer:
      "Este é um bolão recreativo da Copa do Mundo, sem dinheiro real. Você cria uma conta, entra ou cria uma liga, faz palpites antes dos jogos e disputa o ranking por pontos. As áreas principais são Início, Jogos, Bônus, Ranking, Liga e Perfil.",
  },
  {
    id: "dashboard",
    label: "a tela Início",
    example: "O que aparece na tela Início?",
    phrases: [
      "tela inicio",
      "pagina inicial",
      "resumo inicial",
      "painel inicial",
      "dashboard",
      "o que aparece no inicio",
    ],
    answer:
      "A tela Início resume a liga ativa, sua posição, seus pontos, quantidade de palpites, jogos encerrados, próximos jogos e as primeiras posições do ranking.",
  },
  {
    id: "prediction_edit",
    label: "como editar um palpite",
    example: "Posso editar um palpite?",
    phrases: [
      "posso editar um palpite",
      "alterar palpite",
      "corrigir palpite",
      "mudar o placar",
      "refazer palpite",
      "editar antes do jogo",
    ],
    answer:
      "Sim. Abra Jogos, localize a partida e toque em Editar palpite. A alteração só é permitida enquanto a partida estiver agendada e ainda não tiver começado.",
  },
  {
    id: "prediction_locked",
    label: "por que um palpite está bloqueado",
    example: "Por que não consigo fazer ou editar um palpite?",
    phrases: [
      "botao de palpite bloqueado",
      "nao consigo palpitar",
      "nao consigo editar",
      "nao consigo editar meu palpite",
      "palpite bloqueado",
      "palpite travado",
      "botao desativado",
      "por que fechou",
    ],
    answer:
      "O palpite fica bloqueado quando o jogo começa, quando a partida já não está agendada ou quando o confronto ainda aguarda a definição dos classificados. Confira o status e o contador exibidos no cartão do jogo.",
  },
  {
    id: "prediction_history",
    label: "os palpites dos participantes",
    example: "Quando posso ver os palpites da liga?",
    phrases: [
      "ver palpites da liga",
      "palpites dos participantes",
      "palpite dos outros",
      "historico da partida",
      "quem palpitou",
      "ver placar dos amigos",
    ],
    answer:
      "Depois que o palpite do jogo fecha, o cartão da partida pode mostrar Palpites da Liga. Ao abrir essa área, você vê os palpites dos participantes e, quando houver resultado final, os pontos de cada um.",
  },
  {
    id: "game_status",
    label: "os estados de uma partida",
    example: "O que significam os estados dos jogos?",
    phrases: [
      "status do jogo",
      "jogo agendado",
      "jogo finalizado",
      "aguardando api",
      "aguardando classificados",
      "estado da partida",
    ],
    answer:
      "Agendado significa que o jogo ainda aceita palpite até o horário inicial. Finalizado significa que o resultado já pode pontuar. Aguardando API indica que o encerramento chegou sem placar completo; Aguardando classificados aparece quando o confronto do mata-mata ainda não tem as seleções definidas.",
  },
  {
    id: "ranking_periods",
    label: "os filtros de período do ranking",
    example: "Posso filtrar o ranking por dia?",
    phrases: [
      "ranking por dia",
      "ranking de hoje",
      "ranking de ontem",
      "ultimos 7 dias",
      "filtrar ranking",
      "periodo do ranking",
    ],
    answer:
      "Sim. Na área Ranking, use o seletor de período para ver todo o campeonato, apenas hoje, ontem, os últimos 7 dias ou uma data específica já finalizada.",
  },
  {
    id: "ranking_chart",
    label: "o gráfico de desempenho",
    example: "Onde vejo o gráfico de desempenho?",
    phrases: [
      "grafico de desempenho",
      "grafico do ranking",
      "evolucao dos pontos",
      "ver desempenho",
      "tabela ou grafico",
    ],
    answer:
      "Abra Ranking e troque Tabela de Classificação por Gráfico de Desempenho. A tabela mostra a posição atual; o gráfico ajuda a acompanhar a evolução dos participantes nos jogos finalizados.",
  },
  {
    id: "league_owner",
    label: "as permissões do dono da liga",
    example: "O que o dono da liga pode fazer?",
    phrases: [
      "dono da liga",
      "criador da liga",
      "permissoes do dono",
      "quem administra a liga",
      "remover participante",
      "expulsar membro",
    ],
    answer:
      "Quem criou a liga é o dono. Ele pode ver e compartilhar o código de convite da liga privada e remover outros participantes. A própria conta do dono não pode ser removida por essa lista. Contas administrativas também podem gerenciar membros.",
  },
  {
    id: "invite_share",
    label: "como compartilhar o convite",
    example: "Como compartilho o código da liga?",
    phrases: [
      "compartilhar codigo",
      "copiar convite",
      "mandar convite",
      "whatsapp da liga",
      "codigo de convite",
      "convidar amigos",
    ],
    answer:
      "Na área Liga, selecione uma liga criada por você. Use Copiar para copiar o código ou WhatsApp para abrir uma mensagem pronta. Em ligas privadas, somente o dono vê esse código.",
  },
  {
    id: "active_league",
    label: "como trocar a liga ativa",
    example: "Como troco a liga ativa?",
    phrases: [
      "trocar liga ativa",
      "selecionar outra liga",
      "mudar de liga",
      "qual liga esta ativa",
      "ativar liga",
    ],
  },
  {
    id: "my_leagues",
    label: "as ligas da conta",
    example: "Quais são minhas ligas?",
    phrases: [
      "quais sao minhas ligas",
      "minhas ligas",
      "ligas que participo",
      "quantas ligas participo",
      "listar minhas ligas",
      "em quais ligas estou",
    ],
  },
  {
    id: "public_league_list",
    label: "as ligas públicas disponíveis",
    example: "Quais ligas públicas estão disponíveis?",
    phrases: [
      "quais ligas publicas",
      "ligas publicas disponiveis",
      "listar ligas publicas",
      "onde posso entrar",
      "liga aberta",
      "ligas para entrar",
    ],
  },
  {
    id: "league_members",
    label: "os participantes da liga",
    example: "Quem participa da liga ativa?",
    phrases: [
      "quem participa da liga",
      "participantes da liga",
      "membros da liga",
      "quem esta na liga",
      "listar participantes",
      "pessoas da liga",
    ],
  },
  {
    id: "prediction_progress",
    label: "a situação dos seus palpites",
    example: "Quantos jogos ainda faltam para eu palpitar?",
    phrases: [
      "quantos faltam palpitar",
      "quantos jogos ainda faltam para eu palpitar",
      "jogos sem palpite",
      "palpites pendentes",
      "quantos palpites salvei",
      "situacao dos meus palpites",
      "progresso dos palpites",
    ],
  },
  {
    id: "my_bonus",
    label: "os seus palpites bônus",
    example: "Quais bônus eu salvei?",
    phrases: [
      "quais bonus eu salvei",
      "meus palpites bonus",
      "meu campeao",
      "meu artilheiro",
      "minha revelacao",
      "bonus da minha conta",
    ],
  },
  {
    id: "bonus_locked",
    label: "por que os bônus estão encerrados",
    example: "Por que não consigo alterar os palpites bônus?",
    phrases: [
      "bonus encerrado",
      "bonus bloqueado",
      "bonus esta bloqueado",
      "por que o bonus esta bloqueado",
      "nao consigo alterar bonus",
      "palpite bonus fechado",
      "quando fecha o bonus",
    ],
    answer:
      "Os palpites bônus só podem ser alterados enquanto estiverem abertos nas configurações da liga. Quando aparece Palpites bônus encerrados, os campos e o botão de salvar ficam bloqueados.",
  },
  {
    id: "bonus_players",
    label: "como escolher artilheiro e revelação",
    example: "Como escolho o artilheiro e a revelação?",
    phrases: [
      "escolher artilheiro",
      "escolher revelacao",
      "lista de jogadores",
      "buscar jogador no bonus",
      "nome do artilheiro",
      "jogador revelacao",
    ],
    answer:
      "Na área Bônus, comece a digitar o nome do jogador e escolha uma sugestão da lista. Também selecione a seleção campeã. Depois use Salvar Palpites Bônus, desde que a liga ainda não tenha encerrado essa etapa.",
  },
  {
    id: "recovery_security",
    label: "a segurança do código de recuperação",
    example: "Como devo guardar o código de recuperação?",
    phrases: [
      "guardar codigo de recuperacao",
      "seguranca do codigo",
      "codigo aparece uma vez",
      "novo codigo invalida",
      "codigo anterior",
      "codigo de validacao seguro",
    ],
    answer:
      "Guarde o código de validação fora do site e não o compartilhe. Ele aparece após o cadastro ou ao gerar um novo no Perfil. Quando um novo código é criado, o anterior deixa de valer.",
  },
  {
    id: "credentials_change",
    label: "como trocar usuário ou senha",
    example: "Como altero meu usuário ou minha senha?",
    phrases: [
      "alterar usuario",
      "trocar usuario",
      "mudar senha",
      "alterar senha",
      "novas credenciais",
      "trocar login",
    ],
    answer:
      "O Perfil permite alterar o nome exibido no ranking. Para trocar usuário ou senha, use Recuperar na tela de acesso com seu código de validação e crie novas credenciais.",
  },
  {
    id: "logout",
    label: "como sair da conta",
    example: "Como saio da minha conta?",
    phrases: [
      "como sair",
      "sair da conta",
      "desconectar",
      "trocar de conta",
      "encerrar sessao",
      "logout",
    ],
    answer:
      "Use Sair no topo da tela ou o botão de desconectar na área Perfil. Depois você pode entrar com outra conta no mesmo dispositivo.",
  },
  {
    id: "ranking_empty",
    label: "por que o ranking está vazio",
    example: "Por que meu ranking está vazio?",
    phrases: [
      "ranking vazio",
      "nao apareco no ranking",
      "pontos nao aparecem",
      "sem posicao",
      "ranking nao atualizou",
      "ninguem no ranking",
    ],
    answer:
      "O ranking precisa de uma liga ativa, participantes, palpites e jogos finalizados com resultado. Confira a liga selecionada e o período do ranking. Se o placar acabou de chegar, aguarde a sincronização e atualize a página.",
  },
  {
    id: "public_league_empty",
    label: "por que não aparecem ligas públicas",
    example: "Por que não aparecem ligas públicas?",
    phrases: [
      "nao aparece liga publica",
      "sem ligas publicas",
      "lista publica vazia",
      "cade as ligas publicas",
      "liga publica sumiu",
    ],
    answer:
      "A lista mostra apenas ligas públicas das quais a conta ainda não participa. Se estiver vazia, pode não existir uma liga pública disponível ou você já pode ter entrado nas ligas existentes. Confira também Minhas Ligas.",
  },
  {
    id: "persistence",
    label: "onde os dados ficam salvos",
    example: "Meus dados ficam salvos?",
    phrases: [
      "dados ficam salvos",
      "onde salva",
      "salvar no banco",
      "perder meus palpites",
      "dados no navegador",
      "persistencia",
    ],
    answer:
      "Na versão conectada, conta, ligas, participantes e palpites são salvos no banco do aplicativo. O calendário local continua disponível como apoio quando a sincronização externa não responde. A tela sempre confirma quando uma ação é salva ou informa um erro.",
  },
  {
    id: "admin_access",
    label: "o acesso administrativo",
    example: "Como funciona o acesso administrativo?",
    phrases: [
      "quem e admin",
      "qual conta e admin",
      "acesso admin",
      "permissao administrativa",
      "virar administrador",
      "perfil admin",
    ],
    answer:
      "A aba Admin só aparece para uma sessão autorizada. Por segurança, o assistente não identifica contas administrativas nem revela credenciais. Uma conta já autorizada pode criar ou alterar usuários e definir o perfil Jogador ou Admin pelo painel.",
  },
  {
    id: "admin_users",
    adminOnly: true,
    label: "o gerenciamento administrativo de usuários",
    example: "Como o administrador gerencia usuários?",
    phrases: [
      "admin criar usuario",
      "admin alterar usuario",
      "gerenciar usuarios",
      "excluir usuario",
      "definir jogador ou admin",
      "lista de usuarios",
    ],
    answer:
      "Na aba Admin, use Criar ou alterar usuário para informar usuário, nome, senha e perfil Jogador ou Admin. A lista mostra ligas e palpites de cada conta. Excluir uma conta remove também seus palpites e participações; a própria conta conectada não pode se excluir por essa lista.",
  },
  {
    id: "admin_leagues",
    adminOnly: true,
    label: "o gerenciamento administrativo de ligas",
    example: "Como o administrador gerencia ligas?",
    phrases: [
      "admin criar liga",
      "admin editar liga",
      "admin excluir liga",
      "gerenciar ligas",
      "mudar liga publica privada",
      "lista de ligas admin",
    ],
    answer:
      "Na aba Admin é possível criar ligas públicas ou privadas, alterar nome e visibilidade, conferir dono, código, membros e quantidade de palpites, salvar mudanças ou excluir uma liga. A exclusão pede confirmação e remove os dados vinculados à liga.",
  },
  {
    id: "admin_results",
    adminOnly: true,
    label: "a atualização administrativa de resultados",
    example: "Como o administrador atualiza um resultado?",
    phrases: [
      "admin atualizar resultado",
      "como admin atualiza um resultado",
      "editar resultado oficial",
      "corrigir placar admin",
      "mudar status do jogo",
      "quem passou admin",
      "forma de classificacao admin",
    ],
    answer:
      "Na aba Admin, escolha a partida em Editar resultado, defina status e placar e salve. Em jogos de mata-mata, informe também quem passou e a forma de classificação. O resultado atualizado recalcula a pontuação e pode avançar o vencedor na chave.",
  },
  {
    id: "admin_refresh",
    adminOnly: true,
    label: "como atualizar o painel administrativo",
    example: "Como atualizo os dados do painel Admin?",
    phrases: [
      "atualizar painel admin",
      "recarregar admin",
      "dados admin desatualizados",
      "botao atualizar painel",
      "sincronizar painel administrativo",
    ],
    answer:
      "Use Atualizar painel na aba Admin para recarregar usuários e ligas. Para placares, aguarde a sincronização automática ou registre a correção manualmente em Editar resultado.",
  },
  {
    id: "assistant_scope",
    label: "tudo que o assistente conhece",
    example: "O que o chatbot consegue responder?",
    phrases: [
      "o que o chatbot sabe",
      "o que voce sabe",
      "o que consegue responder",
      "tudo que pode fazer",
      "assuntos do assistente",
      "comandos do chat",
    ],
    answer:
      "Posso explicar cadastro, recuperação, perfil, navegação, ligas, convites, participantes, palpites, bloqueios, mata-mata, bônus, pontuação, desempate, ranking, filtros, calendário, resultados, sincronização e solução de problemas. Com uma conta conectada, também consulto seus dados atuais; com autorização administrativa, resumo usuários, ligas e partidas. Não altero nem excluo dados pela conversa.",
  },
];

export const SITE_KNOWLEDGE_SUGGESTIONS = {
  site_overview: [
    "Como faço meu cadastro?",
    "Como entrar em uma liga?",
    "Como faço um palpite?",
    "Como funciona a pontuação?",
  ],
  dashboard: [
    "Onde encontro jogos, ranking e perfil?",
    "Como está o ranking?",
    "Quais são os próximos jogos?",
    "Quantos pontos eu tenho?",
  ],
  prediction_edit: [
    "Quando o palpite fecha?",
    "Por que não consigo fazer um palpite?",
    "Quando posso ver os palpites da liga?",
    "Como funciona o mata-mata?",
  ],
  prediction_locked: [
    "Quando o palpite fecha?",
    "Posso editar um palpite?",
    "O que significam os estados dos jogos?",
    "O que faço se algo não atualizar?",
  ],
  prediction_history: [
    "Como faço um palpite?",
    "Como está o ranking?",
    "Quando o palpite fecha?",
    "Como funciona a pontuação?",
  ],
  game_status: [
    "Quais são os próximos jogos?",
    "Por que não consigo fazer um palpite?",
    "Quando os jogos são atualizados?",
    "De onde vêm os resultados?",
  ],
  ranking_periods: [
    "Onde vejo o gráfico de desempenho?",
    "Como funciona o desempate?",
    "Quantos pontos eu tenho?",
    "Por que meu ranking está vazio?",
  ],
  ranking_chart: [
    "Posso filtrar o ranking por dia?",
    "Como funciona o desempate?",
    "Como está o ranking?",
    "Quantos pontos eu tenho?",
  ],
  league_owner: [
    "Como compartilho o código da liga?",
    "Como troco a liga ativa?",
    "Qual a diferença entre liga pública e privada?",
    "Quantas ligas posso criar?",
  ],
  invite_share: [
    "Como entrar com um convite?",
    "O que o dono da liga pode fazer?",
    "Como troco a liga ativa?",
    "Qual a diferença entre liga pública e privada?",
  ],
  active_league: [
    "Quais são minhas ligas?",
    "Quem participa da liga ativa?",
    "Como está o ranking?",
    "Meu palpite vale em todas as ligas?",
  ],
  my_leagues: [
    "Qual liga está ativa?",
    "Quais ligas públicas estão disponíveis?",
    "Como entrar com um convite?",
    "Como está o ranking?",
  ],
  public_league_list: [
    "Quais são minhas ligas?",
    "Como entrar em uma liga pública?",
    "Como entrar com um convite?",
    "Por que não aparecem ligas públicas?",
  ],
  league_members: [
    "Qual liga está ativa?",
    "Como está o ranking?",
    "O que o dono da liga pode fazer?",
    "Quando posso ver os palpites da liga?",
  ],
  prediction_progress: [
    "Quais são os próximos jogos?",
    "Como faço um palpite?",
    "Posso editar um palpite?",
    "Quando o palpite fecha?",
  ],
  my_bonus: [
    "Como funcionam os bônus?",
    "Como escolho o artilheiro e a revelação?",
    "Por que não consigo alterar os palpites bônus?",
    "Como altero meu perfil?",
  ],
  bonus_locked: [
    "Como funcionam os bônus?",
    "Como escolho o artilheiro e a revelação?",
    "Quais bônus eu salvei?",
    "Como altero meu perfil?",
  ],
  bonus_players: [
    "Como funcionam os bônus?",
    "Por que não consigo alterar os palpites bônus?",
    "Quais bônus eu salvei?",
    "Como funciona a pontuação?",
  ],
  recovery_security: [
    "Como recupero minha conta?",
    "Como altero meu usuário ou minha senha?",
    "Como altero meu perfil?",
    "Como saio da minha conta?",
  ],
  credentials_change: [
    "Como recupero minha conta?",
    "Como devo guardar o código de recuperação?",
    "Como altero meu perfil?",
    "Como saio da minha conta?",
  ],
  logout: [
    "Como faço meu cadastro?",
    "Como recupero minha conta?",
    "Como altero meu perfil?",
    "O assistente envia meus dados para algum serviço?",
  ],
  ranking_empty: [
    "Como está o ranking?",
    "Quando os jogos são atualizados?",
    "Como funciona a pontuação?",
    "Como troco a liga ativa?",
  ],
  public_league_empty: [
    "Quais ligas públicas estão disponíveis?",
    "Quais são minhas ligas?",
    "Como entrar com um convite?",
    "Como criar uma liga?",
  ],
  persistence: [
    "O assistente envia meus dados para algum serviço?",
    "Meu palpite não foi salvo.",
    "Quando os jogos são atualizados?",
    "Como recupero minha conta?",
  ],
  admin_access: [
    "O que existe na aba Admin?",
    "Como o administrador gerencia usuários?",
    "Como o administrador gerencia ligas?",
    "Como o administrador atualiza um resultado?",
  ],
  admin_users: [
    "Quantos usuários estão cadastrados?",
    "Como o administrador gerencia ligas?",
    "Como atualizo os dados do painel Admin?",
    "Resuma a situação administrativa.",
  ],
  admin_leagues: [
    "Quantas ligas estão cadastradas?",
    "Como o administrador gerencia usuários?",
    "Como atualizo os dados do painel Admin?",
    "Resuma a situação administrativa.",
  ],
  admin_results: [
    "Quais jogos precisam de atenção?",
    "Quando ocorreu a última sincronização?",
    "Como atualizo os dados do painel Admin?",
    "Resuma a situação administrativa.",
  ],
  admin_refresh: [
    "Resuma a situação administrativa.",
    "Quais jogos precisam de atenção?",
    "Como o administrador atualiza um resultado?",
    "Quando ocorreu a última sincronização?",
  ],
  assistant_scope: [
    "O que é este site e como ele funciona?",
    "Como faço um palpite?",
    "Como entrar em uma liga?",
    "Como funciona a pontuação?",
  ],
};
