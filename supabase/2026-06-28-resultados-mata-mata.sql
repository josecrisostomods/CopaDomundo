-- Atualizacao de 28/06/2026.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Depois do deploy, /api/sync-fixtures grava os 104 jogos e os resultados no banco.

alter table public.league_settings
add column if not exists bonus_locked boolean not null default true;

update public.league_settings
set bonus_locked = true;

create or replace function public.apply_knockout_advancement(
  p_fixture_id text,
  p_winner_team_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_fixture public.fixtures;
  loser_team_id text;
  target_fixture_id text;
  target_side text;
  second_target_fixture_id text;
  second_target_side text;
  second_target_team_id text;
begin
  select * into source_fixture
  from public.fixtures
  where id = p_fixture_id
  limit 1;

  if source_fixture.id is null or source_fixture.stage_type <> 'KNOCKOUT' then
    return;
  end if;

  if p_winner_team_id not in (source_fixture.home_team_id, source_fixture.away_team_id) then
    raise exception 'Vencedor invalido para este jogo';
  end if;

  loser_team_id := case
    when p_winner_team_id = source_fixture.home_team_id then source_fixture.away_team_id
    else source_fixture.home_team_id
  end;

  case p_fixture_id
    when 'r32-1' then target_fixture_id := 'r16-2'; target_side := 'home';
    when 'r32-2' then target_fixture_id := 'r16-3'; target_side := 'home';
    when 'r32-3' then target_fixture_id := 'r16-1'; target_side := 'home';
    when 'r32-4' then target_fixture_id := 'r16-2'; target_side := 'away';
    when 'r32-5' then target_fixture_id := 'r16-3'; target_side := 'away';
    when 'r32-6' then target_fixture_id := 'r16-1'; target_side := 'away';
    when 'r32-7' then target_fixture_id := 'r16-4'; target_side := 'home';
    when 'r32-8' then target_fixture_id := 'r16-4'; target_side := 'away';
    when 'r32-9' then target_fixture_id := 'r16-6'; target_side := 'away';
    when 'r32-10' then target_fixture_id := 'r16-6'; target_side := 'home';
    when 'r32-11' then target_fixture_id := 'r16-5'; target_side := 'away';
    when 'r32-12' then target_fixture_id := 'r16-5'; target_side := 'home';
    when 'r32-13' then target_fixture_id := 'r16-8'; target_side := 'home';
    when 'r32-14' then target_fixture_id := 'r16-7'; target_side := 'away';
    when 'r32-15' then target_fixture_id := 'r16-7'; target_side := 'home';
    when 'r32-16' then target_fixture_id := 'r16-8'; target_side := 'away';
    when 'r16-1' then target_fixture_id := 'qf-1'; target_side := 'home';
    when 'r16-2' then target_fixture_id := 'qf-1'; target_side := 'away';
    when 'r16-3' then target_fixture_id := 'qf-3'; target_side := 'home';
    when 'r16-4' then target_fixture_id := 'qf-3'; target_side := 'away';
    when 'r16-5' then target_fixture_id := 'qf-2'; target_side := 'home';
    when 'r16-6' then target_fixture_id := 'qf-2'; target_side := 'away';
    when 'r16-7' then target_fixture_id := 'qf-4'; target_side := 'home';
    when 'r16-8' then target_fixture_id := 'qf-4'; target_side := 'away';
    when 'qf-1' then target_fixture_id := 'sf-1'; target_side := 'home';
    when 'qf-2' then target_fixture_id := 'sf-1'; target_side := 'away';
    when 'qf-3' then target_fixture_id := 'sf-2'; target_side := 'home';
    when 'qf-4' then target_fixture_id := 'sf-2'; target_side := 'away';
    when 'sf-1' then
      target_fixture_id := 'final-1'; target_side := 'home';
      second_target_fixture_id := 'third-1'; second_target_side := 'home'; second_target_team_id := loser_team_id;
    when 'sf-2' then
      target_fixture_id := 'final-1'; target_side := 'away';
      second_target_fixture_id := 'third-1'; second_target_side := 'away'; second_target_team_id := loser_team_id;
    else return;
  end case;

  if exists (
    select 1 from public.fixtures f
    where f.id = target_fixture_id
      and f.status <> 'SCHEDULED'
      and case when target_side = 'home' then f.home_team_id else f.away_team_id end <> p_winner_team_id
  ) then
    raise exception 'A proxima fase ja comecou e nao pode receber outro classificado';
  end if;

  update public.fixtures
  set
    home_team_id = case when target_side = 'home' then p_winner_team_id else home_team_id end,
    away_team_id = case when target_side = 'away' then p_winner_team_id else away_team_id end,
    updated_at = now()
  where id = target_fixture_id
    and status = 'SCHEDULED';

  if second_target_fixture_id is not null then
    if exists (
      select 1 from public.fixtures f
      where f.id = second_target_fixture_id
        and f.status <> 'SCHEDULED'
        and case when second_target_side = 'home' then f.home_team_id else f.away_team_id end <> second_target_team_id
    ) then
      raise exception 'A disputa de terceiro ja comecou e nao pode receber outro participante';
    end if;

    update public.fixtures
    set
      home_team_id = case when second_target_side = 'home' then second_target_team_id else home_team_id end,
      away_team_id = case when second_target_side = 'away' then second_target_team_id else away_team_id end,
      updated_at = now()
    where id = second_target_fixture_id
      and status = 'SCHEDULED';
  end if;
end;
$$;

create or replace function public.admin_update_fixture_result(
  session_token text,
  p_fixture_id text,
  p_status text,
  p_home_score int,
  p_away_score int,
  p_winner_team_id text,
  p_classification_method text
)
returns public.fixtures
language plpgsql
security definer
set search_path = public
as $$
declare
  target_fixture public.fixtures;
  next_status text;
  next_winner text;
  next_method text;
  saved_fixture public.fixtures;
begin
  perform public.admin_player_id_from_session(session_token);
  next_status := upper(trim(coalesce(p_status, 'SCHEDULED'));
  next_winner := nullif(trim(coalesce(p_winner_team_id, '')), '');
  next_method := nullif(upper(trim(coalesce(p_classification_method, ''))), '');

  if next_status not in ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED') then
    raise exception 'Status invalido';
  end if;
  if p_home_score is not null and (p_home_score < 0 or p_home_score > 99) then
    raise exception 'Placar da casa invalido';
  end if;
  if p_away_score is not null and (p_away_score < 0 or p_away_score > 99) then
    raise exception 'Placar do visitante invalido';
  end if;

  select * into target_fixture
  from public.fixtures
  where id = p_fixture_id
  limit 1;

  if target_fixture.id is null then
    raise exception 'Jogo nao encontrado';
  end if;
  if next_winner is not null and next_winner not in (target_fixture.home_team_id, target_fixture.away_team_id) then
    raise exception 'Vencedor invalido para este jogo';
  end if;
  if next_method is not null and next_method not in ('NORMAL_TIME', 'EXTRA_TIME', 'PENALTIES') then
    raise exception 'Forma de classificacao invalida';
  end if;
  if next_status = 'FINISHED' and (p_home_score is null or p_away_score is null) then
    raise exception 'Informe o placar final';
  end if;
  if target_fixture.stage_type = 'KNOCKOUT' and next_status = 'FINISHED' and next_winner is null then
    raise exception 'Informe quem passou no mata-mata';
  end if;

  update public.fixtures
  set status = next_status,
      home_score = p_home_score,
      away_score = p_away_score,
      winner_team_id = next_winner,
      classification_method = next_method,
      updated_at = now()
  where id = target_fixture.id
  returning * into saved_fixture;

  if target_fixture.stage_type = 'KNOCKOUT' and next_status = 'FINISHED' and next_winner is not null then
    perform public.apply_knockout_advancement(target_fixture.id, next_winner);
  end if;

  return saved_fixture;
end;
$$;

create or replace function public.save_bonus_prediction(
  session_token text,
  p_league_id uuid,
  p_champion_team_id text,
  p_top_scorer_name text,
  p_revelation_name text
)
returns public.user_bonus_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  saved_bonus public.user_bonus_predictions;
begin
  current_player_id := public.player_id_from_session(session_token);

  if not exists (
    select 1 from public.league_members lm
    where lm.league_id = p_league_id and lm.user_id = current_player_id
  ) then
    raise exception 'Voce nao participa dessa liga';
  end if;

  if coalesce((select ls.bonus_locked from public.league_settings ls where ls.league_id = p_league_id), true) then
    raise exception 'Palpites bonus encerrados';
  end if;

  insert into public.user_bonus_predictions (
    league_id, user_id, champion_team_id, top_scorer_name, revelation_name, updated_at
  ) values (
    p_league_id, current_player_id, p_champion_team_id, p_top_scorer_name, p_revelation_name, now()
  )
  on conflict (league_id, user_id) do update
  set champion_team_id = excluded.champion_team_id,
      top_scorer_name = excluded.top_scorer_name,
      revelation_name = excluded.revelation_name,
      updated_at = now()
  returning * into saved_bonus;

  return saved_bonus;
end;
$$;

create or replace function public.reject_unready_fixture_prediction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.fixtures f
    where f.id = new.fixture_id
      and (f.home_team_id like 'slot-%' or f.away_team_id like 'slot-%')
  ) then
    raise exception 'Aguardando os classificados deste confronto';
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_require_defined_teams on public.predictions;
create trigger predictions_require_defined_teams
before insert or update on public.predictions
for each row execute function public.reject_unready_fixture_prediction();

grant execute on function public.admin_update_fixture_result(text, text, text, int, int, text, text) to anon, authenticated;
grant execute on function public.save_bonus_prediction(text, uuid, text, text, text) to anon, authenticated;
revoke execute on function public.apply_knockout_advancement(text, text) from public, anon, authenticated;
revoke execute on function public.reject_unready_fixture_prediction() from public, anon, authenticated;

notify pgrst, 'reload schema';
