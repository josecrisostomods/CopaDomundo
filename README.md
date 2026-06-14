# Copa do Mundo Palpites

Bolao mobile-first para amigos palpitarem nos jogos da Copa do Mundo. O projeto nao usa dinheiro real: a competicao e por pontos, ranking e placares exatos.

## O que ja vem pronto

- React + Vite na raiz do repositorio.
- Interface pensada primeiro para celular.
- Login simples por usuario e senha, sem confirmacao por e-mail.
- Codigo de validacao unico para recuperar acesso caso o usuario esqueca usuario ou senha.
- Ligas privadas com codigo de convite e ligas publicas abertas para qualquer usuario entrar.
- Calendario com 104 jogos salvos no app para garantir navegacao mesmo antes da API responder.
- Palpite de fase de grupos: vencedor, empate e placar exato.
- Palpite de mata-mata: vencedor ou empate nos 90 minutos, quem passa e se passa no tempo normal, prorrogacao ou penaltis.
- Palpites salvos por usuario: o mesmo palpite vale em todas as ligas onde a pessoa participa.
- Ranking por liga com criterios de desempate.
- Pontuacao preservada mesmo antes de entrar em uma liga.
- Tela de perfil para o usuario editar dados e acompanhar seu resumo na liga.
- Painel admin para editar resultados, criar/excluir ligas e excluir usuarios.
- Funcao serverless `/api/sync-fixtures` para proteger a chave da API de futebol.
- Persistencia no Supabase para perfil, ligas, membros, jogos e palpites quando as variaveis estiverem configuradas.
- Escudos/logos das selecoes quando a API retornar imagem do time.
- Atualizacao automatica das partidas quando o site esta aberto.
- Cron da Vercel chamando `/api/sync-fixtures` uma vez por dia no plano Hobby para gravar placares no Supabase.

## Rodando localmente

```bash
npm install
npm test
npm run dev
```

Depois abra `http://127.0.0.1:5173`.

Para usar varios jogadores reais, configure as variaveis do Supabase antes do deploy e rode o SQL atualizado.

## Variaveis de ambiente

Copie `.env.example` para `.env.local` no desenvolvimento local ou configure as variaveis na Vercel:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

FOOTBALL_DATA_TOKEN=

API_FOOTBALL_KEY=
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
```

## API de futebol

O app esta preparado para dois provedores:

1. **football-data.org**
   - Endpoint usado: `/v4/competitions/WC/matches?season=2026`.
   - A documentacao oficial mostra o recurso de partidas por competicao em `/v4/competitions/{id}/matches`, com filtros como `season`, `stage`, `status`, `matchday` e `group`.
   - O normalizador usa `homeTeam.crest` e `awayTeam.crest` quando esses campos vierem na resposta.
   - Link: https://www.football-data.org/documentation/quickstart

2. **API-Football / API-Sports**
   - Endpoint usado: `/fixtures?league={id}&season=2026`.
   - Use quando quiser alternativa com dados mais detalhados ou quando seu plano cobrir a Copa.
   - O normalizador usa `teams.home.logo` e `teams.away.logo` para mostrar os escudos.
   - Link: https://www.api-football.com/documentation-v3

Importante: chaves privadas ficam somente na Vercel, dentro da funcao serverless `api/sync-fixtures.js`. O frontend chama `/api/sync-fixtures`, nunca a API externa diretamente.

Quando `SUPABASE_SERVICE_ROLE_KEY` estiver configurada, a sincronizacao tambem grava selecoes e partidas nas tabelas `teams` e `fixtures`. Sem essa chave, a API ainda retorna os jogos para o frontend, mas nao persiste no banco.

## Atualizacao automatica das partidas

O site atualiza partidas e placares de duas formas:

1. **Enquanto alguem esta usando o site**
   - O frontend chama `/api/sync-fixtures` ao entrar.
   - Depois repete a chamada a cada 2 minutos.
   - Quando a API ou o Supabase retornam poucos jogos, o app mescla esses resultados com o calendario local em vez de apagar a lista completa.
   - Ao voltar para a aba do navegador, ele tenta atualizar de novo.

2. **Sozinho na Vercel**
   - O `vercel.json` tem um cron em `/api/sync-fixtures`.
   - No plano Hobby da Vercel, a chamada roda uma vez por dia.
   - Enquanto alguem estiver usando o site, o frontend ainda tenta atualizar a cada 5 minutos.
   - Com `API_FOOTBALL_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, os placares novos ficam salvos no Supabase.

No desenvolvimento local com `npm run dev`, a rota serverless da Vercel pode nao estar ativa. Nesse caso, a atualizacao automatica real acontece depois do deploy na Vercel ou usando `vercel dev`.

## Supabase

O arquivo `supabase/schema.sql` contem a estrutura inicial para:

- perfis
- sessoes de jogadores
- ligas
- participantes
- selecoes
- jogos
- palpites globais por usuario e jogo
- configuracoes de pontuacao
- logs de sincronizacao da API
- funcoes RPC para cadastrar jogador, entrar, recuperar credenciais com codigo de validacao, criar liga, listar/entrar em ligas publicas, salvar palpite e executar acoes admin

Para ativar:

1. Crie um projeto no Supabase.
2. Rode o SQL em `supabase/schema.sql`.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` na Vercel para permitir que a funcao da API grave jogos.
5. Configure as mesmas variaveis na Vercel.

### Acesso admin inicial

Ao rodar `supabase/schema.sql`, o banco cria ou atualiza o usuario admin:

```text
usuario: jardel
senha: 212220
```

Esse usuario aparece com a aba **Admin** no menu. As acoes administrativas passam por RPC com validacao de sessao e papel `admin`; as tabelas sensiveis seguem bloqueadas para acesso direto pelo cliente.

## Deploy na Vercel

O `vercel.json` ja esta configurado:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "crons": [
    {
      "path": "/api/sync-fixtures",
      "schedule": "0 12 * * *"
    }
  ]
}
```

Depois de importar o repositorio na Vercel, adicione as variaveis de ambiente do Supabase e da API de futebol.

## Regras de pontuacao

Fase de grupos:

- Acertou vencedor ou empate: 2 pontos.
- Acertou placar exato: 5 pontos no total.
- Palpite errado: 0 pontos.

Mata-mata:

- Acertou vencedor ou empate nos 90 minutos: 2 pontos.
- Acertou placar exato dos 90 minutos: 5 pontos no total.
- Acertou quem passa de fase: +2 pontos.
- Acertou forma de classificacao: +2 pontos.

Desempate:

1. Mais placares exatos.
2. Mais acertos no mata-mata.
3. Mais palpites feitos.
4. Ordem alfabetica.

## Estrutura principal

```text
api/sync-fixtures.js        Funcao serverless para buscar jogos da API
src/App.jsx                Telas e fluxo do produto
src/components/AdminView.jsx Painel administrativo
src/config/appConfig.js    Configuracoes de navegacao e armazenamento local
src/data/mockWorldCup.js   Calendario local com jogos da Copa
src/lib/scoring.js         Regras de pontuacao e ranking
src/lib/supabase.js        Cliente Supabase opcional
src/lib/validators.js      Validacoes compartilhadas de formulario
src/styles.css             Visual mobile-first
src/utils/formatters.js    Formatadores de datas, horarios e rotulos
supabase/schema.sql        Banco de dados
tests/validators.test.js   Testes dos validadores principais
```

## Observacoes

- Use sempre a palavra **palpite**, nao aposta.
- O app nao e PWA e nao precisa ser instalado no celular.
- A prioridade e funcionar muito bem no navegador mobile.
- O palpite de cada jogo pertence ao usuario, nao a uma liga especifica. Ao entrar em uma nova liga, os palpites ja feitos passam a contar no ranking daquela liga.
- Se a API nao trouxer prorrogacao ou penaltis, esses campos ficam como `A definir` ate a sincronizacao trazer dados completos.
