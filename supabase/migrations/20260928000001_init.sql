-- Colgrid MVP: core schema, game rules and row-level security.
-- Source of truth: docs/mvp-spec.md (Data model, Rules to enforce in code) and docs/game-design.md.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on an empty project.

------------------------------------------------------------------------------------------------
-- Types
------------------------------------------------------------------------------------------------
create type public.play_mode as enum ('casual', 'tournament');
create type public.session_status as enum ('scheduled', 'live', 'closed');
create type public.quest_type as enum (
  'making', 'tasting', 'tradition', 'performance', 'social', 'discovery', 'puzzle', 'multi_stop'
);
create type public.staff_role as enum ('gm', 'admin');

------------------------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------------------------
create table public.chapter (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),          -- 1 => "Chapter 01"
  city text not null,
  neighborhood_default text,
  created_at timestamptz not null default now()
);

create table public.season (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapter (id) on delete restrict,
  number int not null check (number > 0),
  starts_on date,
  -- Tournament opt-in closes once the session with this number (or later) has started.
  tournament_lock_session_number int not null default 2 check (tournament_lock_session_number > 0),
  created_at timestamptz not null default now(),
  unique (chapter_id, number)
);

create table public.session (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.season (id) on delete restrict,
  number int not null check (number > 0),
  starts_at timestamptz,
  neighborhood text,
  start_location text,               -- hidden from players until revealed_at <= now()
  revealed_at timestamptz,
  status public.session_status not null default 'scheduled',
  is_finals boolean not null default false,
  created_at timestamptz not null default now(),
  unique (season_id, number)
);

create table public.host (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- contact person
  business text not null,
  contact text,
  created_at timestamptz not null default now()
);

-- A quest belongs to exactly one session, so it can never be reused (rule 5).
create table public.quest (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.session (id) on delete restrict,
  host_id uuid references public.host (id) on delete set null,
  stop_number int,
  title text not null,
  type public.quest_type not null,
  xp int not null check (xp > 0),
  is_hidden boolean not null default false,   -- not shown to players until completed or revealed
  revealed_at timestamptz,                    -- GM can reveal a hidden quest mid-session
  is_judged boolean not null default false,   -- scored by the GM (tournament points only)
  code text not null unique check (code ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'),
  max_points int check (max_points is null or max_points > 0),
  host_fee_cents int check (host_fee_cents is null or host_fee_cents >= 0), -- admin only, never shown to players
  created_at timestamptz not null default now()
);

create table public.player (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null, -- linked on first sign-in
  email text not null unique check (email = lower(email)),
  name text not null,
  created_at timestamptz not null default now()
);

-- Teams are casual by default (rule 1).
create table public.team (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.season (id) on delete restrict,
  name text not null,
  mode public.play_mode not null default 'casual',
  mode_changed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (season_id, name)
);

create table public.team_member (
  team_id uuid not null references public.team (id) on delete cascade,
  player_id uuid not null references public.player (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create table public.attendance (
  session_id uuid not null references public.session (id) on delete restrict,
  player_id uuid not null references public.player (id) on delete restrict,
  team_id uuid not null references public.team (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

-- A quest code counts once per team.
create table public.completion (
  quest_id uuid not null references public.quest (id) on delete restrict,
  team_id uuid not null references public.team (id) on delete restrict,
  completed_at timestamptz not null default now(),
  points int check (points is null or points >= 0),  -- tournament teams only; see trigger
  verified_by uuid references auth.users (id),
  primary key (quest_id, team_id)
);

-- XP is append-only (rule 3). Level is derived from the total.
create table public.xp_event (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.player (id) on delete restrict,
  amount int not null check (amount > 0),
  reason text not null check (reason in ('attend', 'quest', 'hidden_quest', 'all_main_quests', 'adjustment')),
  source_id uuid,          -- session or quest id
  created_at timestamptz not null default now()
);
create index xp_event_player_idx on public.xp_event (player_id);

create table public.badge (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,     -- 'founding', 'session-01', 'full-season', 'two-city', 'chapter-champion', ...
  name text not null,
  description text
);

-- Badges are never taken away (rule 3).
create table public.player_badge (
  player_id uuid not null references public.player (id) on delete restrict,
  badge_id uuid not null references public.badge (id) on delete restrict,
  awarded_at timestamptz not null default now(),
  primary key (player_id, badge_id)
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.player where user_id = auth.uid();
$$;

-- Teams the signed-in player belongs to.
create or replace function public.my_team_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tm.team_id from public.team_member tm
  join public.player p on p.id = tm.player_id
  where p.user_id = auth.uid();
$$;

-- True once the session numbered tournament_lock_session_number (or any later one) has started.
create or replace function public.tournament_opt_in_closed(p_season_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.session s
    join public.season se on se.id = s.season_id
    where s.season_id = p_season_id
      and s.number >= se.tournament_lock_session_number
      and (s.status <> 'scheduled' or (s.starts_at is not null and s.starts_at <= now()))
  );
$$;

------------------------------------------------------------------------------------------------
-- Rule triggers
------------------------------------------------------------------------------------------------

-- Rule 2: tournament opt-in only before the lock session starts; dropping to casual is always allowed.
create or replace function public.enforce_team_mode()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.mode is distinct from old.mode then
    new.mode_changed_at := now();
  end if;
  if new.mode = 'tournament'
     and (tg_op = 'INSERT' or old.mode is distinct from 'tournament')
     and public.tournament_opt_in_closed(new.season_id) then
    raise exception 'Tournament opt-in is closed for this season (it closes when Session % starts). Teams can still play casual.',
      (select tournament_lock_session_number from public.season where id = new.season_id)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger team_mode_rules before insert or update on public.team
  for each row execute function public.enforce_team_mode();

-- Rule 3: XP events and badges can be added, never edited or removed.
create or replace function public.forbid_change()
returns trigger language plpgsql as $$
begin
  raise exception '% rows are permanent: progress only goes up.', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;
create trigger xp_event_append_only before update or delete on public.xp_event
  for each row execute function public.forbid_change();
create trigger player_badge_permanent before update or delete on public.player_badge
  for each row execute function public.forbid_change();

-- Tournament points only for tournament teams; casual completions carry no points.
create or replace function public.enforce_completion_points()
returns trigger language plpgsql as $$
declare v_mode public.play_mode;
begin
  select mode into v_mode from public.team where id = new.team_id;
  if v_mode = 'casual' then
    new.points := null;
  end if;
  return new;
end;
$$;
create trigger completion_points_rules before insert or update on public.completion
  for each row execute function public.enforce_completion_points();

-- Team, quest and attendance must belong to the same season.
create or replace function public.enforce_same_season()
returns trigger language plpgsql as $$
declare v_quest_season uuid; v_team_season uuid;
begin
  if tg_table_name = 'completion' then
    select s.season_id into v_quest_season from public.quest q join public.session s on s.id = q.session_id where q.id = new.quest_id;
  else
    select season_id into v_quest_season from public.session where id = new.session_id;
  end if;
  select season_id into v_team_season from public.team where id = new.team_id;
  if v_quest_season is distinct from v_team_season then
    raise exception 'Team and session are in different seasons.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger completion_same_season before insert or update on public.completion
  for each row execute function public.enforce_same_season();
create trigger attendance_same_season before insert or update on public.attendance
  for each row execute function public.enforce_same_season();

------------------------------------------------------------------------------------------------
-- Player-facing reads that respect "hidden stays hidden" (rule 6) and "casual never ranked" (rule 1)
------------------------------------------------------------------------------------------------

-- Sessions with the start location masked until revealed.
create or replace function public.player_sessions(p_season_id uuid)
returns table (id uuid, number int, starts_at timestamptz, neighborhood text, start_location text,
               revealed boolean, status public.session_status, is_finals boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.number, s.starts_at, s.neighborhood,
         case when s.revealed_at is not null and s.revealed_at <= now() then s.start_location end,
         (s.revealed_at is not null and s.revealed_at <= now()),
         s.status, s.is_finals
  from public.session s
  where s.season_id = p_season_id
  order by s.number;
$$;

-- Quests for a session as seen by the signed-in player's team. Hidden quests stay masked until
-- completed by the team or revealed by the GM. Codes and host fees are never returned.
create or replace function public.player_quests(p_session_id uuid)
returns table (id uuid, stop_number int, title text, type public.quest_type, xp int, host_business text,
               is_hidden boolean, is_judged boolean, unlocked boolean, completed boolean, points int)
language sql stable security definer set search_path = public as $$
  with my_team as (
    select t.id from public.team t
    join public.session s on s.season_id = t.season_id and s.id = p_session_id
    where t.id in (select public.my_team_ids())
    limit 1
  )
  select q.id, q.stop_number,
         case when q.is_hidden and not (c.team_id is not null or (q.revealed_at is not null and q.revealed_at <= now()))
              then null else q.title end,
         q.type, q.xp,
         case when q.is_hidden and not (c.team_id is not null or (q.revealed_at is not null and q.revealed_at <= now()))
              then null else h.business end,
         q.is_hidden, q.is_judged,
         (not q.is_hidden or c.team_id is not null or (q.revealed_at is not null and q.revealed_at <= now())),
         (c.team_id is not null),
         c.points
  from public.quest q
  left join public.host h on h.id = q.host_id
  left join public.completion c on c.quest_id = q.id and c.team_id = (select id from my_team)
  where q.session_id = p_session_id
  order by q.is_hidden, q.stop_number nulls last, q.title;
$$;

-- Chapter standings: tournament teams only. Casual teams never appear.
create or replace function public.season_standings(p_season_id uuid)
returns table (rank bigint, team_id uuid, team_name text, points bigint, quests_completed bigint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by coalesce(sum(c.points), 0) desc) as rank,
         t.id, t.name,
         coalesce(sum(c.points), 0) as points,
         count(c.quest_id) as quests_completed
  from public.team t
  left join public.completion c on c.team_id = t.id
  where t.season_id = p_season_id and t.mode = 'tournament'
  group by t.id, t.name
  order by points desc, t.name;
$$;

-- Total XP per player (level is computed in the app from lib/game/levels.ts).
create or replace view public.player_xp_total with (security_invoker = true) as
  select p.id as player_id, coalesce(sum(x.amount), 0)::int as total_xp
  from public.player p
  left join public.xp_event x on x.player_id = p.id
  group by p.id;

------------------------------------------------------------------------------------------------
-- Team mode change by a player (any team member). Uses the same rule trigger.
------------------------------------------------------------------------------------------------
create or replace function public.set_team_mode(p_team_id uuid, p_mode public.play_mode)
returns public.play_mode language plpgsql security definer set search_path = public as $$
begin
  if p_team_id is null
     or not (exists (select 1 from public.my_team_ids() t where t = p_team_id) or public.is_staff()) then
    raise exception 'Only team members can change how their team plays.' using errcode = 'insufficient_privilege';
  end if;
  update public.team set mode = p_mode where id = p_team_id;
  return p_mode;
end;
$$;

------------------------------------------------------------------------------------------------
-- Row-level security
-- Players read only their own pass and their own team. Staff (GM/admin) read and write through
-- the console. Game writes (check-ins, XP) go through server functions added in later steps.
------------------------------------------------------------------------------------------------
alter table public.chapter      enable row level security;
alter table public.season       enable row level security;
alter table public.session      enable row level security;
alter table public.host         enable row level security;
alter table public.quest        enable row level security;
alter table public.player       enable row level security;
alter table public.team         enable row level security;
alter table public.team_member  enable row level security;
alter table public.attendance   enable row level security;
alter table public.completion   enable row level security;
alter table public.xp_event     enable row level security;
alter table public.badge        enable row level security;
alter table public.player_badge enable row level security;
alter table public.staff        enable row level security;

-- Public reference data (no secrets in these tables).
create policy "chapters are public" on public.chapter for select using (true);
create policy "seasons are public"  on public.season  for select using (true);
create policy "badges are public"   on public.badge   for select using (true);

-- Sessions and quests hold hidden locations and codes: players use player_sessions()/player_quests().
create policy "staff read sessions" on public.session for select using (public.is_staff());
create policy "staff read quests"   on public.quest   for select using (public.is_staff());
create policy "staff read hosts"    on public.host    for select using (public.is_staff());

-- A player's own records.
create policy "players read self" on public.player
  for select using (user_id = auth.uid() or public.is_staff());
create policy "players read own teams" on public.team
  for select using (id in (select public.my_team_ids()) or public.is_staff());
create policy "players read own team members" on public.team_member
  for select using (team_id in (select public.my_team_ids()) or public.is_staff());
create policy "players read own attendance" on public.attendance
  for select using (player_id = public.current_player_id() or public.is_staff());
create policy "players read own team completions" on public.completion
  for select using (team_id in (select public.my_team_ids()) or public.is_staff());
create policy "players read own xp" on public.xp_event
  for select using (player_id = public.current_player_id() or public.is_staff());
create policy "players read own badges" on public.player_badge
  for select using (player_id = public.current_player_id() or public.is_staff());
create policy "staff read staff" on public.staff
  for select using (user_id = auth.uid() or public.is_admin());

-- Writes: admins manage setup data; staff run sessions. (Players change team mode via set_team_mode.)
create policy "admins write chapters" on public.chapter for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write seasons"  on public.season  for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write hosts"    on public.host    for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write quests"   on public.quest   for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write players"  on public.player  for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write badges"   on public.badge   for all using (public.is_admin()) with check (public.is_admin());
create policy "staff write sessions"  on public.session for update using (public.is_staff()) with check (public.is_staff());
create policy "admins add sessions"   on public.session for insert with check (public.is_admin());
create policy "staff write teams"     on public.team    for all using (public.is_staff()) with check (public.is_staff());
create policy "staff write members"   on public.team_member for all using (public.is_staff()) with check (public.is_staff());
create policy "staff write attendance" on public.attendance for all using (public.is_staff()) with check (public.is_staff());
create policy "staff write completions" on public.completion for all using (public.is_staff()) with check (public.is_staff());
create policy "staff add xp"          on public.xp_event for insert with check (public.is_staff());
create policy "staff add badges"      on public.player_badge for insert with check (public.is_staff());
create policy "admins manage staff"   on public.staff for all using (public.is_admin()) with check (public.is_admin());

-- Function access for signed-in users.
revoke all on function public.set_team_mode(uuid, public.play_mode) from public;
grant execute on function public.set_team_mode(uuid, public.play_mode) to authenticated;
grant execute on function public.player_sessions(uuid) to anon, authenticated;
grant execute on function public.player_quests(uuid) to authenticated;
grant execute on function public.season_standings(uuid) to anon, authenticated;
grant select on public.player_xp_total to authenticated;
