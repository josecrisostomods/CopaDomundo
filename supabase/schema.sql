create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text,
  created_at timestamptz not null default now()
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
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

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
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.teams enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.league_settings enable row level security;
alter table public.api_sync_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_select_same_league" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1
      from public.league_members viewer
      join public.league_members target
        on target.league_id = viewer.league_id
      where viewer.user_id = auth.uid()
      and target.user_id = profiles.id
    )
  );

create policy "leagues_select_member" on public.leagues
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid()
    )
  );

create policy "leagues_insert_authenticated" on public.leagues
  for insert with check (auth.uid() = owner_id);

create policy "members_select_own_leagues" on public.league_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = league_members.league_id and lm.user_id = auth.uid()
    )
  );

create policy "members_insert_self" on public.league_members
  for insert with check (auth.uid() = user_id);

create policy "teams_public_read" on public.teams
  for select using (true);

create policy "fixtures_public_read" on public.fixtures
  for select using (true);

create policy "predictions_member_read" on public.predictions
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = predictions.league_id and lm.user_id = auth.uid()
    )
  );

create policy "predictions_owner_write_before_kickoff" on public.predictions
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.fixtures f
      where f.id = predictions.fixture_id
      and f.status = 'SCHEDULED'
      and f.kickoff > now()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.fixtures f
      where f.id = predictions.fixture_id
      and f.status = 'SCHEDULED'
      and f.kickoff > now()
    )
  );

create policy "settings_member_read" on public.league_settings
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_settings.league_id and lm.user_id = auth.uid()
    )
  );

create policy "sync_logs_no_client_read" on public.api_sync_logs
  for select using (false);

create or replace function public.create_league_with_owner(league_name text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  new_league public.leagues;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.leagues where code = new_code);
  end loop;

  insert into public.leagues (name, code, owner_id)
  values (coalesce(nullif(trim(league_name), ''), 'Bolao da turma'), new_code, auth.uid())
  returning * into new_league;

  insert into public.league_members (league_id, user_id, role)
  values (new_league.id, auth.uid(), 'owner')
  on conflict (league_id, user_id) do nothing;

  insert into public.league_settings (league_id)
  values (new_league.id)
  on conflict (league_id) do nothing;

  return new_league;
end;
$$;

create or replace function public.join_league_by_code(invite_code text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league public.leagues;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select *
  into target_league
  from public.leagues
  where code = upper(trim(invite_code))
  limit 1;

  if target_league.id is null then
    raise exception 'Liga nao encontrada';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (target_league.id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return target_league;
end;
$$;

grant execute on function public.create_league_with_owner(text) to authenticated;
grant execute on function public.join_league_by_code(text) to authenticated;
