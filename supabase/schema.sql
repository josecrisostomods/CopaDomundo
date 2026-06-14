create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text,
  password_hash text,
  recovery_code_hash text,
  name text not null,
  avatar text,
  role text not null default 'player' check (role in ('player', 'admin')),
  display_name_set boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists recovery_code_hash text;
alter table public.profiles add column if not exists role text not null default 'player';
alter table public.profiles add column if not exists display_name_set boolean not null default false;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('player', 'admin'));
update public.profiles
set username = lower(coalesce(username, 'jogador_' || substr(id::text, 1, 8)))
where username is null;
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_unique on public.profiles (username);

insert into public.profiles (username, password_hash, recovery_code_hash, name, avatar, display_name_set, role)
values ('jardel', crypt('212220', gen_salt('bf')), null, 'Jardel', 'JA', true, 'admin')
on conflict (username) do update
set
  password_hash = excluded.password_hash,
  role = 'admin',
  name = coalesce(nullif(public.profiles.name, ''), 'Jardel'),
  avatar = coalesce(nullif(public.profiles.avatar, ''), 'JA'),
  display_name_set = true;

create table if not exists public.player_sessions (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table public.player_sessions add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  is_public boolean not null default false,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.leagues add column if not exists is_public boolean not null default false;

create table if not exists public.league_members (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.league_members drop constraint if exists league_members_role_check;
alter table public.league_members add constraint league_members_role_check check (role in ('owner', 'member'));

create table if not exists public.teams (
  id text primary key,
  name text not null,
  flag text,
  crest_url text,
  api_provider text,
  api_id text
);

alter table public.teams add column if not exists crest_url text;

create table if not exists public.fixtures (
  id text primary key,
  api_provider text,
  api_id text,
  group_name text,
  round text,
  phase text not null,
  stage_type text not null check (stage_type in ('GROUP', 'KNOCKOUT')),
  venue text,
  kickoff timestamptz not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED')),
  home_team_id text references public.teams(id),
  away_team_id text references public.teams(id),
  home_score int,
  away_score int,
  winner_team_id text references public.teams(id),
  classification_method text check (classification_method in ('NORMAL_TIME', 'EXTRA_TIME', 'PENALTIES')),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  fixture_id text references public.fixtures(id) on delete cascade,
  normal_outcome text not null check (normal_outcome in ('HOME', 'DRAW', 'AWAY')),
  home_score int not null,
  away_score int not null,
  qualifier_team_id text references public.teams(id),
  qualification_method text check (qualification_method in ('NORMAL_TIME', 'EXTRA_TIME', 'PENALTIES')),
  extra_home_score int,
  extra_away_score int,
  penalties_home int,
  penalties_away int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, fixture_id)
);

alter table public.predictions drop constraint if exists predictions_league_id_user_id_fixture_id_key;

with ranked_predictions as (
  select
    ctid,
    row_number() over (
      partition by user_id, fixture_id
      order by updated_at desc, created_at desc, id desc
    ) as row_number
  from public.predictions
)
delete from public.predictions p
using ranked_predictions ranked
where p.ctid = ranked.ctid
and ranked.row_number > 1;

update public.predictions
set league_id = null
where league_id is not null;

create unique index if not exists predictions_user_fixture_unique
on public.predictions (user_id, fixture_id);

create table if not exists public.league_settings (
  league_id uuid primary key references public.leagues(id) on delete cascade,
  points_outcome int not null default 2,
  points_exact_score int not null default 5,
  points_qualifier int not null default 2,
  points_qualification_method int not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.league_settings alter column points_outcome set default 2;
alter table public.league_settings alter column points_exact_score set default 5;
update public.league_settings
set
  points_outcome = 2,
  points_exact_score = 5,
  updated_at = now()
where points_outcome = 3
and points_exact_score = 2;

create table if not exists public.api_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null,
  message text,
  fixtures_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.player_sessions enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.teams enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.league_settings enable row level security;
alter table public.api_sync_logs enable row level security;

create table if not exists public.user_bonus_predictions (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  champion_team_id text,
  top_scorer_name text,
  revelation_name text,
  updated_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.user_bonus_predictions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_same_league" on public.profiles;
drop policy if exists "leagues_select_member" on public.leagues;
drop policy if exists "leagues_insert_authenticated" on public.leagues;
drop policy if exists "members_select_own_leagues" on public.league_members;
drop policy if exists "members_insert_self" on public.league_members;
drop policy if exists "teams_public_read" on public.teams;
drop policy if exists "fixtures_public_read" on public.fixtures;
drop policy if exists "predictions_member_read" on public.predictions;
drop policy if exists "predictions_owner_write_before_kickoff" on public.predictions;
drop policy if exists "settings_member_read" on public.league_settings;
drop policy if exists "sync_logs_no_client_read" on public.api_sync_logs;
drop policy if exists "profiles_no_direct_access" on public.profiles;
drop policy if exists "sessions_no_direct_access" on public.player_sessions;
drop policy if exists "leagues_no_direct_access" on public.leagues;
drop policy if exists "members_no_direct_access" on public.league_members;
drop policy if exists "predictions_no_direct_access" on public.predictions;
drop policy if exists "settings_no_direct_access" on public.league_settings;

drop policy if exists "bonus_no_direct_access" on public.user_bonus_predictions;

create policy "bonus_no_direct_access" on public.user_bonus_predictions
  for all using (false) with check (false);

create policy "profiles_no_direct_access" on public.profiles
  for all using (false) with check (false);

create policy "sessions_no_direct_access" on public.player_sessions
  for all using (false) with check (false);

create policy "leagues_no_direct_access" on public.leagues
  for all using (false) with check (false);

create policy "members_no_direct_access" on public.league_members
  for all using (false) with check (false);

create policy "teams_public_read" on public.teams
  for select using (true);

create policy "fixtures_public_read" on public.fixtures
  for select using (true);

create policy "predictions_no_direct_access" on public.predictions
  for all using (false) with check (false);

create policy "settings_no_direct_access" on public.league_settings
  for all using (false) with check (false);

create policy "sync_logs_no_client_read" on public.api_sync_logs
  for select using (false);

drop function if exists public.create_league_with_owner(text);
drop function if exists public.create_league_with_owner(text, text);
drop function if exists public.join_league_by_code(text);
drop function if exists public.join_public_league(text, uuid);
drop function if exists public.remove_league_member(text, uuid, uuid);
drop function if exists public.reset_player_credentials(text, text, text);
drop function if exists public.rotate_player_recovery_code(text);
drop function if exists public.get_admin_state(text);
drop function if exists public.admin_update_fixture_result(text, text, text, int, int, text, text);
drop function if exists public.admin_delete_user(text, uuid);
drop function if exists public.admin_delete_league(text, uuid);
drop function if exists public.admin_create_league(text, text, boolean);
drop function if exists public.admin_update_league(text, uuid, text, boolean);
drop function if exists public.admin_player_id_from_session(text);
drop function if exists public.admin_ensure_fixture_for_update(text, jsonb);
drop function if exists public.ensure_fixture_for_prediction(text, uuid, jsonb);

create or replace function public.player_payload(player public.profiles)
returns jsonb
language plpgsql
stable
as $$
begin
  return jsonb_build_object(
    'id', player.id,
    'username', player.username,
    'name', player.name,
    'avatar', coalesce(player.avatar, upper(substr(player.name, 1, 2))),
    'role', player.role,
    'is_admin', player.role = 'admin',
    'display_name_set', player.display_name_set
  );
end;
$$;

create or replace function public.normalize_player_username(raw_username text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(raw_username, '')), '[^a-zA-Z0-9_.-]', '', 'g'));
$$;

create or replace function public.normalize_recovery_code(raw_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(raw_code, '')), '[^a-zA-Z0-9]', '', 'g'));
$$;

create or replace function public.generate_recovery_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_code text;
begin
  raw_code := upper(encode(gen_random_bytes(8), 'hex'));
  return substr(raw_code, 1, 4) || '-' ||
    substr(raw_code, 5, 4) || '-' ||
    substr(raw_code, 9, 4) || '-' ||
    substr(raw_code, 13, 4);
end;
$$;

create or replace function public.create_player_session(player_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_token text;
begin
  -- Limpar sessões expiradas desse usuário
  delete from public.player_sessions
  where user_id = player_id and expires_at < now();

  new_token := encode(gen_random_bytes(32), 'hex');

  insert into public.player_sessions (token, user_id, expires_at)
  values (new_token, player_id, now() + interval '30 days');

  return new_token;
end;
$$;

create or replace function public.player_id_from_session(session_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
begin
  select user_id
  into current_player_id
  from public.player_sessions
  where token = session_token
  and expires_at > now()
  limit 1;

  if current_player_id is null then
    raise exception 'Sessao invalida ou expirada';
  end if;

  update public.player_sessions
  set last_seen_at = now(),
      expires_at = now() + interval '30 days'
  where token = session_token;

  return current_player_id;
end;
$$;

create or replace function public.logout_player(session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.player_sessions
  where token = session_token;
end;
$$;

create or replace function public.register_player(login_username text, login_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_username text;
  recovery_code text;
  normalized_recovery_code text;
  new_player public.profiles;
  new_token text;
begin
  normalized_username := public.normalize_player_username(login_username);

  if normalized_username = '' then
    raise exception 'Informe um usuario';
  end if;

  if login_password is null or login_password = '' then
    raise exception 'Informe uma senha';
  end if;

  loop
    recovery_code := public.generate_recovery_code();
    normalized_recovery_code := public.normalize_recovery_code(recovery_code);
    exit when not exists (
      select 1
      from public.profiles p
      where p.recovery_code_hash is not null
      and p.recovery_code_hash = crypt(normalized_recovery_code, p.recovery_code_hash)
    );
  end loop;

  insert into public.profiles (username, password_hash, recovery_code_hash, name, avatar, display_name_set)
  values (
    normalized_username,
    crypt(login_password, gen_salt('bf')),
    crypt(normalized_recovery_code, gen_salt('bf')),
    normalized_username,
    upper(substr(normalized_username, 1, 2)),
    false
  )
  returning * into new_player;

  new_token := public.create_player_session(new_player.id);

  return jsonb_build_object(
    'sessionToken', new_token,
    'recoveryCode', recovery_code,
    'profile', public.player_payload(new_player)
  );
exception
  when unique_violation then
    raise exception 'Usuario ja existe';
end;
$$;

create or replace function public.login_player(login_username text, login_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_username text;
  found_player public.profiles;
  new_token text;
begin
  normalized_username := public.normalize_player_username(login_username);

  select *
  into found_player
  from public.profiles
  where username = normalized_username
  limit 1;

  if found_player.id is null
    or found_player.password_hash is null
    or found_player.password_hash <> crypt(coalesce(login_password, ''), found_player.password_hash)
  then
    raise exception 'Usuario ou senha invalidos';
  end if;

  new_token := public.create_player_session(found_player.id);

  return jsonb_build_object(
    'sessionToken', new_token,
    'profile', public.player_payload(found_player)
  );
end;
$$;

create or replace function public.reset_player_credentials(recovery_code text, new_username text, new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text;
  normalized_username text;
  next_recovery_code text;
  next_normalized_recovery_code text;
  found_player public.profiles;
  updated_player public.profiles;
  new_token text;
begin
  normalized_code := public.normalize_recovery_code(recovery_code);
  normalized_username := public.normalize_player_username(new_username);

  if normalized_code = '' then
    raise exception 'Informe o codigo de validacao';
  end if;

  if normalized_username = '' then
    raise exception 'Informe um novo usuario';
  end if;

  if new_password is null or new_password = '' then
    raise exception 'Informe uma nova senha';
  end if;

  select *
  into found_player
  from public.profiles p
  where p.recovery_code_hash is not null
  and p.recovery_code_hash = crypt(normalized_code, p.recovery_code_hash)
  limit 1;

  if found_player.id is null then
    raise exception 'Codigo de validacao invalido';
  end if;

  loop
    next_recovery_code := public.generate_recovery_code();
    next_normalized_recovery_code := public.normalize_recovery_code(next_recovery_code);
    exit when not exists (
      select 1
      from public.profiles p
      where p.recovery_code_hash is not null
      and p.recovery_code_hash = crypt(next_normalized_recovery_code, p.recovery_code_hash)
    );
  end loop;

  update public.profiles
  set
    username = normalized_username,
    password_hash = crypt(new_password, gen_salt('bf')),
    recovery_code_hash = crypt(next_normalized_recovery_code, gen_salt('bf'))
  where id = found_player.id
  returning * into updated_player;

  delete from public.player_sessions
  where user_id = updated_player.id;

  new_token := public.create_player_session(updated_player.id);

  return jsonb_build_object(
    'sessionToken', new_token,
    'recoveryCode', next_recovery_code,
    'profile', public.player_payload(updated_player)
  );
exception
  when unique_violation then
    raise exception 'Usuario ja existe';
end;
$$;

create or replace function public.rotate_player_recovery_code(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_player_id uuid;
  next_recovery_code text;
  next_normalized_recovery_code text;
begin
  current_player_id := public.player_id_from_session(session_token);

  loop
    next_recovery_code := public.generate_recovery_code();
    next_normalized_recovery_code := public.normalize_recovery_code(next_recovery_code);
    exit when not exists (
      select 1
      from public.profiles p
      where p.recovery_code_hash is not null
      and p.recovery_code_hash = crypt(next_normalized_recovery_code, p.recovery_code_hash)
    );
  end loop;

  update public.profiles
  set recovery_code_hash = crypt(next_normalized_recovery_code, gen_salt('bf'))
  where id = current_player_id;

  return jsonb_build_object('recoveryCode', next_recovery_code);
end;
$$;

create or replace function public.admin_player_id_from_session(session_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
begin
  current_player_id := public.player_id_from_session(session_token);

  if not exists (
    select 1
    from public.profiles p
    where p.id = current_player_id
    and p.role = 'admin'
  ) then
    raise exception 'Acesso administrativo necessario';
  end if;

  return current_player_id;
end;
$$;

create or replace function public.get_admin_state(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  users_json jsonb;
  leagues_json jsonb;
begin
  admin_id := public.admin_player_id_from_session(session_token);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', user_data.id,
    'username', user_data.username,
    'name', user_data.name,
    'avatar', coalesce(user_data.avatar, upper(substr(user_data.name, 1, 2))),
    'role', user_data.role,
    'display_name_set', user_data.display_name_set,
    'created_at', user_data.created_at,
    'leagueCount', user_data.league_count,
    'predictionCount', user_data.prediction_count
  ) order by user_data.created_at desc), '[]'::jsonb)
  into users_json
  from (
    select
      p.*,
      (select count(*)::int from public.league_members lm where lm.user_id = p.id) as league_count,
      (select count(*)::int from public.predictions pr where pr.user_id = p.id) as prediction_count
    from public.profiles p
  ) user_data;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', league_data.id,
    'name', league_data.name,
    'code', league_data.code,
    'is_public', league_data.is_public,
    'owner_id', league_data.owner_id,
    'owner_name', league_data.owner_name,
    'memberCount', league_data.member_count,
    'predictionCount', league_data.prediction_count,
    'created_at', league_data.created_at
  ) order by league_data.created_at desc), '[]'::jsonb)
  into leagues_json
  from (
    select
      l.*,
      owner.name as owner_name,
      (select count(*)::int from public.league_members lm where lm.league_id = l.id) as member_count,
      (
        select count(*)::int
        from public.predictions pr
        where exists (
          select 1
          from public.league_members lm
          where lm.league_id = l.id
          and lm.user_id = pr.user_id
        )
      ) as prediction_count
    from public.leagues l
    left join public.profiles owner on owner.id = l.owner_id
  ) league_data;

  return jsonb_build_object(
    'users', users_json,
    'leagues', leagues_json,
    'totals', jsonb_build_object(
      'users', jsonb_array_length(users_json),
      'leagues', jsonb_array_length(leagues_json),
      'adminId', admin_id
    )
  );
end;
$$;

create or replace function public.admin_ensure_fixture_for_update(
  session_token text,
  fixture_data jsonb
)
returns public.fixtures
language plpgsql
security definer
set search_path = public
as $$
declare
  fixture_id text;
  fixture_api_id text;
  fixture_group text;
  fixture_round text;
  fixture_phase text;
  fixture_stage_type text;
  fixture_venue text;
  fixture_kickoff timestamptz;
  fixture_status text;
  home_data jsonb;
  away_data jsonb;
  home_id text;
  home_name text;
  away_id text;
  away_name text;
  saved_fixture public.fixtures;
begin
  perform public.admin_player_id_from_session(session_token);

  fixture_id := nullif(trim(coalesce(fixture_data->>'id', '')), '');
  fixture_api_id := nullif(trim(coalesce(fixture_data->>'apiId', fixture_data->>'api_id', '')), '');
  fixture_group := nullif(trim(coalesce(fixture_data->>'group', fixture_data->>'group_name', '')), '');
  fixture_round := nullif(trim(coalesce(fixture_data->>'round', '')), '');
  fixture_phase := coalesce(nullif(trim(coalesce(fixture_data->>'phase', '')), ''), 'Copa do Mundo');
  fixture_stage_type := upper(coalesce(nullif(trim(coalesce(fixture_data->>'stageType', fixture_data->>'stage_type', '')), ''), 'GROUP'));
  fixture_venue := coalesce(nullif(trim(coalesce(fixture_data->>'venue', '')), ''), 'A definir');
  fixture_status := upper(coalesce(nullif(trim(coalesce(fixture_data->>'status', '')), ''), 'SCHEDULED'));
  home_data := fixture_data->'home';
  away_data := fixture_data->'away';
  home_id := nullif(trim(coalesce(home_data->>'id', '')), '');
  home_name := coalesce(nullif(trim(coalesce(home_data->>'name', '')), ''), 'Time A');
  away_id := nullif(trim(coalesce(away_data->>'id', '')), '');
  away_name := coalesce(nullif(trim(coalesce(away_data->>'name', '')), ''), 'Time B');

  if fixture_id is null then
    raise exception 'Jogo invalido';
  end if;

  if home_id is null or away_id is null then
    raise exception 'Selecoes invalidas';
  end if;

  if fixture_stage_type not in ('GROUP', 'KNOCKOUT') then
    raise exception 'Tipo de fase invalido';
  end if;

  if fixture_status not in ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED') then
    fixture_status := 'SCHEDULED';
  end if;

  fixture_kickoff := (fixture_data->>'kickoff')::timestamptz;

  insert into public.teams (id, name, flag, crest_url, api_provider, api_id)
  values (
    home_id,
    home_name,
    nullif(trim(coalesce(home_data->>'flag', 'FIFA')), ''),
    nullif(trim(coalesce(home_data->>'crest', home_data->>'crest_url', '')), ''),
    'local',
    home_id
  )
  on conflict (id) do update
  set
    name = excluded.name,
    flag = coalesce(excluded.flag, public.teams.flag),
    crest_url = coalesce(excluded.crest_url, public.teams.crest_url);

  insert into public.teams (id, name, flag, crest_url, api_provider, api_id)
  values (
    away_id,
    away_name,
    nullif(trim(coalesce(away_data->>'flag', 'FIFA')), ''),
    nullif(trim(coalesce(away_data->>'crest', away_data->>'crest_url', '')), ''),
    'local',
    away_id
  )
  on conflict (id) do update
  set
    name = excluded.name,
    flag = coalesce(excluded.flag, public.teams.flag),
    crest_url = coalesce(excluded.crest_url, public.teams.crest_url);

  insert into public.fixtures (
    id,
    api_provider,
    api_id,
    group_name,
    round,
    phase,
    stage_type,
    venue,
    kickoff,
    status,
    home_team_id,
    away_team_id,
    home_score,
    away_score,
    winner_team_id,
    classification_method,
    updated_at
  )
  values (
    fixture_id,
    'local',
    fixture_api_id,
    fixture_group,
    fixture_round,
    fixture_phase,
    fixture_stage_type,
    fixture_venue,
    fixture_kickoff,
    fixture_status,
    home_id,
    away_id,
    nullif(fixture_data->>'homeScore', '')::int,
    nullif(fixture_data->>'awayScore', '')::int,
    nullif(trim(coalesce(fixture_data->>'winner', fixture_data->>'winner_team_id', '')), ''),
    nullif(upper(trim(coalesce(fixture_data->>'classificationMethod', fixture_data->>'classification_method', ''))), ''),
    now()
  )
  on conflict (id) do update
  set
    api_id = coalesce(excluded.api_id, public.fixtures.api_id),
    group_name = excluded.group_name,
    round = excluded.round,
    phase = excluded.phase,
    stage_type = excluded.stage_type,
    venue = excluded.venue,
    kickoff = excluded.kickoff,
    home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id,
    updated_at = now()
  returning * into saved_fixture;

  return saved_fixture;
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
  admin_id uuid;
  target_fixture public.fixtures;
  next_status text;
  next_winner text;
  next_method text;
  saved_fixture public.fixtures;
begin
  admin_id := public.admin_player_id_from_session(session_token);
  next_status := upper(trim(coalesce(p_status, 'SCHEDULED')));
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

  select *
  into target_fixture
  from public.fixtures
  where id = p_fixture_id
  limit 1;

  if target_fixture.id is null then
    raise exception 'Jogo nao encontrado';
  end if;

  if next_winner is not null
    and next_winner not in (target_fixture.home_team_id, target_fixture.away_team_id)
  then
    raise exception 'Vencedor invalido para este jogo';
  end if;

  if next_method is not null
    and next_method not in ('NORMAL_TIME', 'EXTRA_TIME', 'PENALTIES')
  then
    raise exception 'Forma de classificacao invalida';
  end if;

  if next_status = 'FINISHED' and (p_home_score is null or p_away_score is null) then
    raise exception 'Informe o placar final';
  end if;

  if target_fixture.stage_type = 'KNOCKOUT'
    and next_status = 'FINISHED'
    and next_winner is null
  then
    raise exception 'Informe quem passou no mata-mata';
  end if;

  update public.fixtures
  set
    status = next_status,
    home_score = p_home_score,
    away_score = p_away_score,
    winner_team_id = next_winner,
    classification_method = next_method,
    updated_at = now()
  where id = target_fixture.id
  returning * into saved_fixture;

  return saved_fixture;
end;
$$;

create or replace function public.admin_delete_user(session_token text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  target_profile public.profiles;
begin
  admin_id := public.admin_player_id_from_session(session_token);

  select *
  into target_profile
  from public.profiles
  where id = p_user_id
  limit 1;

  if target_profile.id is null then
    raise exception 'Usuario nao encontrado';
  end if;

  if target_profile.id = admin_id then
    raise exception 'Nao e possivel excluir a propria conta admin';
  end if;

  if target_profile.role = 'admin'
    and (select count(*) from public.profiles where role = 'admin') <= 1
  then
    raise exception 'Mantenha pelo menos um administrador';
  end if;

  delete from public.profiles
  where id = target_profile.id;

  return jsonb_build_object('deletedUserId', target_profile.id);
end;
$$;

create or replace function public.admin_delete_league(session_token text, p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league public.leagues;
begin
  perform public.admin_player_id_from_session(session_token);

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  limit 1;

  if target_league.id is null then
    raise exception 'Liga nao encontrada';
  end if;

  delete from public.leagues
  where id = target_league.id;

  return jsonb_build_object('deletedLeagueId', target_league.id);
end;
$$;

create or replace function public.admin_create_league(
  session_token text,
  league_name text,
  league_is_public boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  new_code text;
  new_league public.leagues;
begin
  admin_id := public.admin_player_id_from_session(session_token);

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.leagues where code = new_code);
  end loop;

  insert into public.leagues (name, code, is_public, owner_id)
  values (coalesce(nullif(trim(league_name), ''), 'Liga criada pelo admin'), new_code, coalesce(league_is_public, false), admin_id)
  returning * into new_league;

  insert into public.league_members (league_id, user_id, role)
  values (new_league.id, admin_id, 'owner')
  on conflict (league_id, user_id) do nothing;

  insert into public.league_settings (league_id)
  values (new_league.id)
  on conflict (league_id) do nothing;

  return jsonb_build_object(
    'id', new_league.id,
    'name', new_league.name,
    'code', new_league.code,
    'is_public', new_league.is_public,
    'owner_id', new_league.owner_id,
    'role', 'owner',
    'memberCount', 1
  );
end;
$$;

create or replace function public.admin_update_league(
  session_token text,
  p_league_id uuid,
  p_name text,
  p_is_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_league public.leagues;
  target_member_count int;
begin
  perform public.admin_player_id_from_session(session_token);

  update public.leagues
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    is_public = coalesce(p_is_public, is_public)
  where id = p_league_id
  returning * into saved_league;

  if saved_league.id is null then
    raise exception 'Liga nao encontrada';
  end if;

  select count(*)::int
  into target_member_count
  from public.league_members
  where league_id = saved_league.id;

  return jsonb_build_object(
    'id', saved_league.id,
    'name', saved_league.name,
    'code', saved_league.code,
    'is_public', saved_league.is_public,
    'owner_id', saved_league.owner_id,
    'memberCount', target_member_count
  );
end;
$$;

create or replace function public.update_player_profile(session_token text, display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  updated_player public.profiles;
  next_name text;
begin
  current_player_id := public.player_id_from_session(session_token);
  next_name := coalesce(nullif(trim(display_name), ''), 'Jogador');

  update public.profiles
  set
    name = next_name,
    avatar = upper(substr(next_name, 1, 2)),
    display_name_set = true
  where id = current_player_id
  returning * into updated_player;

  return public.player_payload(updated_player);
end;
$$;

create or replace function public.get_player_state(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  current_player public.profiles;
  leagues_json jsonb;
  public_leagues_json jsonb;
  members_json jsonb;
  predictions_json jsonb;
  bonus_predictions_json jsonb;
begin
  current_player_id := public.player_id_from_session(session_token);

  select *
  into current_player
  from public.profiles
  where id = current_player_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', league_data.id,
    'name', league_data.name,
    'code', case when league_data.owner_id = current_player_id then league_data.code else null end,
    'is_public', league_data.is_public,
    'owner_id', league_data.owner_id,
    'role', league_data.role,
    'memberCount', league_data.member_count,
    'settings', jsonb_build_object(
      'outcome', coalesce(league_data.points_outcome, 2),
      'exactScore', coalesce(league_data.points_exact_score, 5),
      'qualifier', coalesce(league_data.points_qualifier, 2),
      'qualificationMethod', coalesce(league_data.points_qualification_method, 2)
    )
  ) order by league_data.created_at desc), '[]'::jsonb)
  into leagues_json
  from (
    select
      l.id,
      l.name,
      l.code,
      l.is_public,
      l.owner_id,
      l.created_at,
      lm.role,
      ls.points_outcome,
      ls.points_exact_score,
      ls.points_qualifier,
      ls.points_qualification_method,
      (select count(*)::int from public.league_members count_lm where count_lm.league_id = l.id) as member_count
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    left join public.league_settings ls on ls.league_id = l.id
    where lm.user_id = current_player_id
  ) league_data;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', public_league_data.id,
    'name', public_league_data.name,
    'code', null,
    'is_public', true,
    'owner_id', public_league_data.owner_id,
    'role', 'public',
    'memberCount', public_league_data.member_count,
    'settings', jsonb_build_object(
      'outcome', coalesce(public_league_data.points_outcome, 2),
      'exactScore', coalesce(public_league_data.points_exact_score, 5),
      'qualifier', coalesce(public_league_data.points_qualifier, 2),
      'qualificationMethod', coalesce(public_league_data.points_qualification_method, 2)
    )
  ) order by public_league_data.member_count desc, public_league_data.created_at desc), '[]'::jsonb)
  into public_leagues_json
  from (
    select
      l.id,
      l.name,
      l.owner_id,
      l.created_at,
      ls.points_outcome,
      ls.points_exact_score,
      ls.points_qualifier,
      ls.points_qualification_method,
      (select count(*)::int from public.league_members count_lm where count_lm.league_id = l.id) as member_count
    from public.leagues l
    left join public.league_settings ls on ls.league_id = l.id
    where l.is_public = true
    and not exists (
      select 1
      from public.league_members lm
      where lm.league_id = l.id
      and lm.user_id = current_player_id
    )
  ) public_league_data;

  select coalesce(jsonb_agg(jsonb_build_object(
    'leagueId', member_data.league_id,
    'id', member_data.id,
    'username', member_data.username,
    'name', member_data.name,
    'avatar', member_data.avatar,
    'display_name_set', member_data.display_name_set
  ) order by member_data.name), '[]'::jsonb)
  into members_json
  from (
    select
      viewer.league_id,
      p.id,
      p.username,
      p.name,
      p.avatar,
      p.display_name_set
    from public.league_members viewer
    join public.league_members lm on lm.league_id = viewer.league_id
    join public.profiles p on p.id = lm.user_id
    where viewer.user_id = current_player_id
  ) member_data;

  select coalesce(jsonb_agg(to_jsonb(pr) order by pr.updated_at desc), '[]'::jsonb)
  into predictions_json
  from public.predictions pr
  where pr.user_id = current_player_id
  or exists (
    select 1
    from public.league_members viewer
    join public.league_members same_league_member
      on same_league_member.league_id = viewer.league_id
    where viewer.user_id = current_player_id
    and same_league_member.user_id = pr.user_id
  );

  select coalesce(jsonb_agg(to_jsonb(bp) order by bp.updated_at desc), '[]'::jsonb)
  into bonus_predictions_json
  from public.user_bonus_predictions bp
  where exists (
    select 1
    from public.league_members lm
    where lm.league_id = bp.league_id
    and lm.user_id = current_player_id
  );

  return jsonb_build_object(
    'profile', public.player_payload(current_player),
    'leagues', leagues_json,
    'publicLeagues', public_leagues_json,
    'members', members_json,
    'predictions', predictions_json,
    'bonusPredictions', bonus_predictions_json
  );
end;
$$;

create or replace function public.create_league_with_owner(session_token text, league_name text, league_is_public boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  current_player_role text;
  owned_league_count int;
  new_code text;
  new_league public.leagues;
begin
  current_player_id := public.player_id_from_session(session_token);

  select role
  into current_player_role
  from public.profiles
  where id = current_player_id;

  select count(*)::int
  into owned_league_count
  from public.leagues
  where owner_id = current_player_id;

  if current_player_role <> 'admin' and owned_league_count >= 3 then
    raise exception 'Voce pode criar no maximo 3 ligas';
  end if;

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.leagues where code = new_code);
  end loop;

  insert into public.leagues (name, code, is_public, owner_id)
  values (coalesce(nullif(trim(league_name), ''), 'Minha liga'), new_code, coalesce(league_is_public, false), current_player_id)
  returning * into new_league;

  insert into public.league_members (league_id, user_id, role)
  values (new_league.id, current_player_id, 'owner')
  on conflict (league_id, user_id) do nothing;

  insert into public.league_settings (league_id)
  values (new_league.id)
  on conflict (league_id) do nothing;

  return jsonb_build_object(
    'id', new_league.id,
    'name', new_league.name,
    'code', new_league.code,
    'is_public', new_league.is_public,
    'owner_id', new_league.owner_id,
    'role', 'owner',
    'memberCount', 1
  );
end;
$$;

create or replace function public.join_league_by_code(session_token text, invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  target_league public.leagues;
  target_role text;
  target_member_count int;
begin
  current_player_id := public.player_id_from_session(session_token);

  select *
  into target_league
  from public.leagues
  where code = upper(trim(invite_code))
  limit 1;

  if target_league.id is null then
    raise exception 'Liga nao encontrada';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (target_league.id, current_player_id, 'member')
  on conflict (league_id, user_id) do nothing;

  select role
  into target_role
  from public.league_members
  where league_id = target_league.id
  and user_id = current_player_id;

  select count(*)::int
  into target_member_count
  from public.league_members
  where league_id = target_league.id;

  return jsonb_build_object(
    'id', target_league.id,
    'name', target_league.name,
    'code', case when target_league.owner_id = current_player_id then target_league.code else null end,
    'is_public', target_league.is_public,
    'owner_id', target_league.owner_id,
    'role', target_role,
    'memberCount', target_member_count
  );
end;
$$;

create or replace function public.join_public_league(session_token text, p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  target_league public.leagues;
  target_role text;
  target_member_count int;
begin
  current_player_id := public.player_id_from_session(session_token);

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  and is_public = true
  limit 1;

  if target_league.id is null then
    raise exception 'Liga publica nao encontrada';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (target_league.id, current_player_id, 'member')
  on conflict (league_id, user_id) do nothing;

  select role
  into target_role
  from public.league_members
  where league_id = target_league.id
  and user_id = current_player_id;

  select count(*)::int
  into target_member_count
  from public.league_members
  where league_id = target_league.id;

  return jsonb_build_object(
    'id', target_league.id,
    'name', target_league.name,
    'code', case when target_league.owner_id = current_player_id then target_league.code else null end,
    'is_public', target_league.is_public,
    'owner_id', target_league.owner_id,
    'role', target_role,
    'memberCount', target_member_count
  );
end;
$$;

create or replace function public.remove_league_member(
  session_token text,
  p_league_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  current_player_role text;
  target_league public.leagues;
  target_member public.profiles;
  target_member_count int;
begin
  current_player_id := public.player_id_from_session(session_token);

  select role
  into current_player_role
  from public.profiles
  where id = current_player_id;

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  limit 1;

  if target_league.id is null then
    raise exception 'Liga nao encontrada';
  end if;

  if current_player_role <> 'admin' and target_league.owner_id <> current_player_id then
    raise exception 'Apenas o dono da liga pode remover participantes';
  end if;

  if p_user_id = current_player_id then
    raise exception 'Voce nao pode remover a propria conta da liga';
  end if;

  select *
  into target_member
  from public.profiles
  where id = p_user_id
  limit 1;

  if target_member.id is null then
    raise exception 'Usuario nao encontrado';
  end if;

  if not exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league.id
    and lm.user_id = target_member.id
  ) then
    raise exception 'Usuario nao participa dessa liga';
  end if;

  if target_league.owner_id = target_member.id then
    raise exception 'O dono da liga nao pode ser removido';
  end if;

  delete from public.user_bonus_predictions
  where league_id = target_league.id
  and user_id = target_member.id;

  delete from public.league_members
  where league_id = target_league.id
  and user_id = target_member.id;

  select count(*)::int
  into target_member_count
  from public.league_members
  where league_id = target_league.id;

  return jsonb_build_object(
    'leagueId', target_league.id,
    'removedUserId', target_member.id,
    'memberCount', target_member_count
  );
end;
$$;

create or replace function public.ensure_fixture_for_prediction(
  session_token text,
  p_league_id uuid,
  fixture_data jsonb
)
returns public.fixtures
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  fixture_id text;
  fixture_api_id text;
  fixture_group text;
  fixture_round text;
  fixture_phase text;
  fixture_stage_type text;
  fixture_venue text;
  fixture_kickoff timestamptz;
  fixture_status text;
  home_data jsonb;
  away_data jsonb;
  home_id text;
  home_name text;
  away_id text;
  away_name text;
  saved_fixture public.fixtures;
begin
  current_player_id := public.player_id_from_session(session_token);

  if p_league_id is not null and not exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
    and lm.user_id = current_player_id
  ) then
    raise exception 'Voce nao participa dessa liga';
  end if;

  fixture_id := nullif(trim(coalesce(fixture_data->>'id', '')), '');
  fixture_api_id := nullif(trim(coalesce(fixture_data->>'apiId', fixture_data->>'api_id', '')), '');
  fixture_group := nullif(trim(coalesce(fixture_data->>'group', fixture_data->>'group_name', '')), '');
  fixture_round := nullif(trim(coalesce(fixture_data->>'round', '')), '');
  fixture_phase := coalesce(nullif(trim(coalesce(fixture_data->>'phase', '')), ''), 'Copa do Mundo');
  fixture_stage_type := upper(coalesce(nullif(trim(coalesce(fixture_data->>'stageType', fixture_data->>'stage_type', '')), ''), 'GROUP'));
  fixture_venue := coalesce(nullif(trim(coalesce(fixture_data->>'venue', '')), ''), 'A definir');
  fixture_status := upper(coalesce(nullif(trim(coalesce(fixture_data->>'status', '')), ''), 'SCHEDULED'));
  home_data := fixture_data->'home';
  away_data := fixture_data->'away';
  home_id := nullif(trim(coalesce(home_data->>'id', '')), '');
  home_name := coalesce(nullif(trim(coalesce(home_data->>'name', '')), ''), 'Time A');
  away_id := nullif(trim(coalesce(away_data->>'id', '')), '');
  away_name := coalesce(nullif(trim(coalesce(away_data->>'name', '')), ''), 'Time B');

  if fixture_id is null then
    raise exception 'Jogo invalido';
  end if;

  if home_id is null or away_id is null then
    raise exception 'Selecoes invalidas';
  end if;

  if fixture_stage_type not in ('GROUP', 'KNOCKOUT') then
    raise exception 'Tipo de fase invalido';
  end if;

  if fixture_status not in ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED') then
    fixture_status := 'SCHEDULED';
  end if;

  fixture_kickoff := (fixture_data->>'kickoff')::timestamptz;

  if fixture_status = 'SCHEDULED' and fixture_kickoff <= now() then
    fixture_status := 'FINISHED';
  end if;

  insert into public.teams (id, name, flag, crest_url, api_provider, api_id)
  values (
    home_id,
    home_name,
    nullif(trim(coalesce(home_data->>'flag', 'FIFA')), ''),
    nullif(trim(coalesce(home_data->>'crest', home_data->>'crest_url', '')), ''),
    'local',
    home_id
  )
  on conflict (id) do nothing;

  insert into public.teams (id, name, flag, crest_url, api_provider, api_id)
  values (
    away_id,
    away_name,
    nullif(trim(coalesce(away_data->>'flag', 'FIFA')), ''),
    nullif(trim(coalesce(away_data->>'crest', away_data->>'crest_url', '')), ''),
    'local',
    away_id
  )
  on conflict (id) do nothing;

  select *
  into saved_fixture
  from public.fixtures
  where id = fixture_id
  limit 1;

  if saved_fixture.id is not null then
    if saved_fixture.kickoff > now() and fixture_status = 'SCHEDULED' then
      update public.fixtures
      set
        api_id = coalesce(fixture_api_id, api_id),
        group_name = fixture_group,
        round = fixture_round,
        phase = fixture_phase,
        stage_type = fixture_stage_type,
        venue = fixture_venue,
        kickoff = fixture_kickoff,
        status = 'SCHEDULED',
        home_team_id = home_id,
        away_team_id = away_id,
        updated_at = now()
      where id = fixture_id
      returning * into saved_fixture;
    end if;

    return saved_fixture;
  end if;

  insert into public.fixtures (
    id,
    api_provider,
    api_id,
    group_name,
    round,
    phase,
    stage_type,
    venue,
    kickoff,
    status,
    home_team_id,
    away_team_id,
    home_score,
    away_score,
    winner_team_id,
    classification_method,
    updated_at
  )
  values (
    fixture_id,
    'local',
    fixture_api_id,
    fixture_group,
    fixture_round,
    fixture_phase,
    fixture_stage_type,
    fixture_venue,
    fixture_kickoff,
    fixture_status,
    home_id,
    away_id,
    nullif(fixture_data->>'homeScore', '')::int,
    nullif(fixture_data->>'awayScore', '')::int,
    nullif(trim(coalesce(fixture_data->>'winner', fixture_data->>'winner_team_id', '')), ''),
    nullif(upper(trim(coalesce(fixture_data->>'classificationMethod', fixture_data->>'classification_method', ''))), ''),
    now()
  )
  returning * into saved_fixture;

  return saved_fixture;
end;
$$;

create or replace function public.save_player_prediction(
  session_token text,
  p_league_id uuid,
  p_fixture_id text,
  p_normal_outcome text,
  p_home_score int,
  p_away_score int,
  p_qualifier_team_id text,
  p_qualification_method text,
  p_extra_home_score int,
  p_extra_away_score int,
  p_penalties_home int,
  p_penalties_away int
)
returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  saved_prediction public.predictions;
begin
  current_player_id := public.player_id_from_session(session_token);

  if p_league_id is not null and not exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
    and lm.user_id = current_player_id
  ) then
    raise exception 'Voce nao participa dessa liga';
  end if;

  if not exists (
    select 1
    from public.fixtures f
    where f.id = p_fixture_id
    and f.status = 'SCHEDULED'
    -- Relaxamos a verificacao de relogio estrita para evitar problemas de fuso
    -- Se o status na API ainda e SCHEDULED, o jogo nao comecou
  ) then
    raise exception 'Palpite fechado para esta partida';
  end if;

  insert into public.predictions (
    league_id,
    user_id,
    fixture_id,
    normal_outcome,
    home_score,
    away_score,
    qualifier_team_id,
    qualification_method,
    extra_home_score,
    extra_away_score,
    penalties_home,
    penalties_away,
    updated_at
  )
  values (
    null,
    current_player_id,
    p_fixture_id,
    p_normal_outcome,
    p_home_score,
    p_away_score,
    p_qualifier_team_id,
    p_qualification_method,
    p_extra_home_score,
    p_extra_away_score,
    p_penalties_home,
    p_penalties_away,
    now()
  )
  on conflict (user_id, fixture_id) do update
  set
    league_id = null,
    normal_outcome = excluded.normal_outcome,
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    qualifier_team_id = excluded.qualifier_team_id,
    qualification_method = excluded.qualification_method,
    extra_home_score = excluded.extra_home_score,
    extra_away_score = excluded.extra_away_score,
    penalties_home = excluded.penalties_home,
    penalties_away = excluded.penalties_away,
    updated_at = now()
  returning * into saved_prediction;

  return saved_prediction;
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
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
    and lm.user_id = current_player_id
  ) then
    raise exception 'Voce nao participa dessa liga';
  end if;

  insert into public.user_bonus_predictions (
    league_id,
    user_id,
    champion_team_id,
    top_scorer_name,
    revelation_name,
    updated_at
  )
  values (
    p_league_id,
    current_player_id,
    p_champion_team_id,
    p_top_scorer_name,
    p_revelation_name,
    now()
  )
  on conflict (league_id, user_id) do update
  set
    champion_team_id = excluded.champion_team_id,
    top_scorer_name = excluded.top_scorer_name,
    revelation_name = excluded.revelation_name,
    updated_at = now()
  returning * into saved_bonus;

  return saved_bonus;
end;
$$;

grant execute on function public.register_player(text, text) to anon, authenticated;
grant execute on function public.login_player(text, text) to anon, authenticated;
grant execute on function public.reset_player_credentials(text, text, text) to anon, authenticated;
grant execute on function public.rotate_player_recovery_code(text) to anon, authenticated;
grant execute on function public.update_player_profile(text, text) to anon, authenticated;
grant execute on function public.get_player_state(text) to anon, authenticated;
grant execute on function public.create_league_with_owner(text, text, boolean) to anon, authenticated;
grant execute on function public.join_league_by_code(text, text) to anon, authenticated;
grant execute on function public.join_public_league(text, uuid) to anon, authenticated;
grant execute on function public.remove_league_member(text, uuid, uuid) to anon, authenticated;
grant execute on function public.ensure_fixture_for_prediction(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.save_player_prediction(text, uuid, text, text, int, int, text, text, int, int, int, int) to anon, authenticated;
grant execute on function public.save_bonus_prediction(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.logout_player(text) to anon, authenticated;
grant execute on function public.get_admin_state(text) to anon, authenticated;
grant execute on function public.admin_ensure_fixture_for_update(text, jsonb) to anon, authenticated;
grant execute on function public.admin_update_fixture_result(text, text, text, int, int, text, text) to anon, authenticated;
grant execute on function public.admin_delete_user(text, uuid) to anon, authenticated;
grant execute on function public.admin_delete_league(text, uuid) to anon, authenticated;
grant execute on function public.admin_create_league(text, text, boolean) to anon, authenticated;
grant execute on function public.admin_update_league(text, uuid, text, boolean) to anon, authenticated;

revoke execute on function public.create_player_session(uuid) from public, anon, authenticated;
revoke execute on function public.player_id_from_session(text) from public, anon, authenticated;
revoke execute on function public.generate_recovery_code() from public, anon, authenticated;
revoke execute on function public.admin_player_id_from_session(text) from public, anon, authenticated;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.player_sessions from anon, authenticated;
revoke all on table public.leagues from anon, authenticated;
revoke all on table public.league_members from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.fixtures from anon, authenticated;
revoke all on table public.predictions from anon, authenticated;
revoke all on table public.league_settings from anon, authenticated;
revoke all on table public.user_bonus_predictions from anon, authenticated;
revoke all on table public.api_sync_logs from anon, authenticated;
grant select on table public.teams to anon, authenticated;
grant select on table public.fixtures to anon, authenticated;

notify pgrst, 'reload schema';
