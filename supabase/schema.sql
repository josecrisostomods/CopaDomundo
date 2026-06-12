create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text,
  password_hash text,
  name text not null,
  avatar text,
  display_name_set boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists display_name_set boolean not null default false;
update public.profiles
set username = lower(coalesce(username, 'jogador_' || substr(id::text, 1, 8)))
where username is null;
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_unique on public.profiles (username);

create table if not exists public.player_sessions (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

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

create table if not exists public.league_settings (
  league_id uuid primary key references public.leagues(id) on delete cascade,
  points_outcome int not null default 3,
  points_exact_score int not null default 2,
  points_qualifier int not null default 2,
  points_qualification_method int not null default 2,
  updated_at timestamptz not null default now()
);

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
drop function if exists public.join_league_by_code(text);

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

create or replace function public.create_player_session(player_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_token text;
begin
  new_token := encode(gen_random_bytes(32), 'hex');

  insert into public.player_sessions (token, user_id)
  values (new_token, player_id);

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
  limit 1;

  if current_player_id is null then
    raise exception 'Sessao invalida';
  end if;

  update public.player_sessions
  set last_seen_at = now()
  where token = session_token;

  return current_player_id;
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

  insert into public.profiles (username, password_hash, name, avatar, display_name_set)
  values (
    normalized_username,
    crypt(login_password, gen_salt('bf')),
    normalized_username,
    upper(substr(normalized_username, 1, 2)),
    false
  )
  returning * into new_player;

  new_token := public.create_player_session(new_player.id);

  return jsonb_build_object(
    'sessionToken', new_token,
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
  members_json jsonb;
  predictions_json jsonb;
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
    'owner_id', league_data.owner_id,
    'role', league_data.role,
    'memberCount', league_data.member_count
  ) order by league_data.created_at desc), '[]'::jsonb)
  into leagues_json
  from (
    select
      l.id,
      l.name,
      l.code,
      l.owner_id,
      l.created_at,
      lm.role,
      (select count(*)::int from public.league_members count_lm where count_lm.league_id = l.id) as member_count
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    where lm.user_id = current_player_id
  ) league_data;

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
  where exists (
    select 1
    from public.league_members lm
    where lm.league_id = pr.league_id
    and lm.user_id = current_player_id
  );

  return jsonb_build_object(
    'profile', public.player_payload(current_player),
    'leagues', leagues_json,
    'members', members_json,
    'predictions', predictions_json
  );
end;
$$;

create or replace function public.create_league_with_owner(session_token text, league_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_player_id uuid;
  new_code text;
  new_league public.leagues;
begin
  current_player_id := public.player_id_from_session(session_token);

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.leagues where code = new_code);
  end loop;

  insert into public.leagues (name, code, owner_id)
  values (coalesce(nullif(trim(league_name), ''), 'Minha liga'), new_code, current_player_id)
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
    'owner_id', target_league.owner_id,
    'role', target_role,
    'memberCount', target_member_count
  );
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

  if not exists (
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
    and f.kickoff > now()
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
    p_league_id,
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
  on conflict (league_id, user_id, fixture_id) do update
  set
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

grant execute on function public.register_player(text, text) to anon, authenticated;
grant execute on function public.login_player(text, text) to anon, authenticated;
grant execute on function public.update_player_profile(text, text) to anon, authenticated;
grant execute on function public.get_player_state(text) to anon, authenticated;
grant execute on function public.create_league_with_owner(text, text) to anon, authenticated;
grant execute on function public.join_league_by_code(text, text) to anon, authenticated;
grant execute on function public.save_player_prediction(text, uuid, text, text, int, int, text, text, int, int, int, int) to anon, authenticated;

revoke execute on function public.create_player_session(uuid) from public, anon, authenticated;
revoke execute on function public.player_id_from_session(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
