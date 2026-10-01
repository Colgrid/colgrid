-- Colgrid: open routes (self-guided test, Oct 1, 2026).
-- An open route is an ordinary session with open_until set: it stays live for a test window,
-- has no start pin or host, and anyone can sign up, make a team, invite friends and play it.
-- Sessions without open_until (the Oct 17 gathering) behave exactly as before.
-- Run after 20261001000017_survey.sql. Safe to re-run.

alter table public.session add column if not exists route_name text check (char_length(route_name) <= 80);
alter table public.session add column if not exists slug text check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$');
alter table public.session add column if not exists open_until timestamptz;
create unique index if not exists session_slug_key on public.session (slug);

-- Opening hours, typed by hand in admin (e.g. "Tue–Sat 10–6"). Shown, not enforced.
alter table public.quest add column if not exists hours_text text check (char_length(hours_text) <= 120);

------------------------------------------------------------------------------------------------
-- Team invite links: colgrid.app/join/<token>
------------------------------------------------------------------------------------------------
create table if not exists public.team_invite (
  token text primary key check (token ~ '^[a-z0-9]{10}$'),
  team_id uuid not null references public.team (id) on delete cascade,
  session_id uuid not null references public.session (id) on delete cascade,
  created_by uuid references public.player (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, session_id)
);
alter table public.team_invite enable row level security;
drop policy if exists "admins read invites" on public.team_invite;
create policy "admins read invites" on public.team_invite for select using (public.is_admin());
revoke all on public.team_invite from public, anon, authenticated;
grant select on public.team_invite to authenticated;

------------------------------------------------------------------------------------------------
-- Test counts. Completions come from the completion table; this holds what it doesn't.
------------------------------------------------------------------------------------------------
create table if not exists public.play_event (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('route_view', 'signup', 'team_created', 'invite_sent', 'invite_accepted',
                                     'route_start', 'quest_start', 'install_shown', 'install_accepted', 'installed_open')),
  session_id uuid references public.session (id) on delete cascade,
  quest_id uuid references public.quest (id) on delete cascade,
  team_id uuid references public.team (id) on delete cascade,
  player_id uuid references public.player (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists play_event_session_idx on public.play_event (session_id, kind);
-- Counted once: a team starting a route or a quest; a player's install moments.
create unique index if not exists play_event_route_once on public.play_event (kind, team_id, session_id) where kind in ('route_start', 'team_created');
create unique index if not exists play_event_quest_once on public.play_event (kind, team_id, quest_id) where kind = 'quest_start';
create unique index if not exists play_event_player_once on public.play_event (kind, player_id) where kind in ('install_shown', 'install_accepted', 'installed_open', 'signup');
create unique index if not exists play_event_join_once on public.play_event (kind, player_id, team_id) where kind = 'invite_accepted';
alter table public.play_event enable row level security;
drop policy if exists "admins read play events" on public.play_event;
create policy "admins read play events" on public.play_event for select using (public.is_admin());
revoke all on public.play_event from public, anon, authenticated;
grant select on public.play_event to authenticated;

------------------------------------------------------------------------------------------------
-- Helpers (internal)
------------------------------------------------------------------------------------------------
-- The player's team in a season (most recent, like check_in).
create or replace function public.my_season_team(p_season_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select tm.team_id from public.team_member tm join public.team t on t.id = tm.team_id
  where tm.player_id = public.current_player_id() and t.season_id = p_season_id
  order by tm.joined_at desc limit 1;
$$;
revoke all on function public.my_season_team(uuid) from public, anon, authenticated;

create or replace function public.route_is_open(s public.session)
returns boolean language sql stable as $$
  select s.open_until is not null and s.status = 'live' and s.open_until > now();
$$;

-- The team's invite token for a route, made on first ask.
create or replace function public.route_invite(p_team_id uuid, p_session_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  select token into v_token from public.team_invite where team_id = p_team_id and session_id = p_session_id;
  if v_token is null then
    insert into public.team_invite (token, team_id, session_id, created_by)
    values (substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), p_team_id, p_session_id, public.current_player_id())
    on conflict (team_id, session_id) do nothing;
    select token into v_token from public.team_invite where team_id = p_team_id and session_id = p_session_id;
  end if;
  return v_token;
end;
$$;
revoke all on function public.route_invite(uuid, uuid) from public, anon, authenticated;

-- Main quests the team finished on a route, and how many there are.
create or replace function public.route_progress(p_session_id uuid, p_team_id uuid)
returns table (done int, total int) language sql stable security definer set search_path = public as $$
  select (select count(*)::int from public.completion c join public.quest q on q.id = c.quest_id
          where q.session_id = p_session_id and c.team_id = p_team_id and not q.is_hidden and not q.is_judged),
         (select count(*)::int from public.quest q where q.session_id = p_session_id and not q.is_hidden and not q.is_judged);
$$;
revoke all on function public.route_progress(uuid, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- Public: the route page and the list of open routes. Never answers, codes or hidden quests.
------------------------------------------------------------------------------------------------
-- status: ok | not_found | not_open | closed
create or replace function public.open_route(p_slug text, p_count boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_s public.session;
  v_player uuid := public.current_player_id();
  v_team uuid;
  v_team_name text;
  v_started boolean := false;
  v_done int; v_total int;
begin
  select * into v_s from public.session where slug = lower(p_slug) and open_until is not null;
  if v_s.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if p_count then
    insert into public.play_event (kind, session_id, player_id) values ('route_view', v_s.id, v_player);
  end if;
  if v_player is not null then
    v_team := public.my_season_team(v_s.season_id);
    select name into v_team_name from public.team where id = v_team;
    v_started := exists (select 1 from public.play_event where kind = 'route_start' and team_id = v_team and session_id = v_s.id);
    select done, total into v_done, v_total from public.route_progress(v_s.id, v_team);
  end if;
  return jsonb_build_object(
    'status', case when v_s.status = 'closed' or v_s.open_until <= now() then 'closed' when v_s.status = 'scheduled' then 'not_open' else 'ok' end,
    'id', v_s.id,
    'number', v_s.number,
    'route_name', coalesce(v_s.route_name, 'Route ' || lpad(v_s.number::text, 2, '0')),
    'neighborhood', v_s.neighborhood,
    'open_until', v_s.open_until,
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object('stop', q.stop_number, 'title', q.title, 'where', q.where_text, 'hours', q.hours_text)
                       order by q.stop_number nulls last, q.title)
      from public.quest q where q.session_id = v_s.id and not q.is_hidden and not q.is_judged
    ), '[]'::jsonb),
    'signed_in', auth.uid() is not null,
    'has_pass', v_player is not null,
    'team_name', v_team_name,
    'started', v_started,
    'done', coalesce(v_total > 0 and v_done = v_total, false)
  );
end;
$$;
revoke all on function public.open_route(text, boolean) from public;
grant execute on function public.open_route(text, boolean) to anon, authenticated;

-- Routes open right now, for "play another route".
create or replace function public.open_routes()
returns table (slug text, route_name text, neighborhood text, stops int, open_until timestamptz, my_started boolean, my_done boolean)
language sql stable security definer set search_path = public as $$
  select s.slug, coalesce(s.route_name, 'Route ' || lpad(s.number::text, 2, '0')), s.neighborhood,
         (select count(*)::int from public.quest q where q.session_id = s.id and not q.is_hidden and not q.is_judged),
         s.open_until,
         exists (select 1 from public.play_event e where e.kind = 'route_start' and e.session_id = s.id
                 and e.team_id = public.my_season_team(s.season_id)),
         coalesce((select p.total > 0 and p.done = p.total from public.route_progress(s.id, public.my_season_team(s.season_id)) p), false)
  from public.session s
  where s.slug is not null and public.route_is_open(s)
  order by s.number;
$$;
revoke all on function public.open_routes() from public;
grant execute on function public.open_routes() to anon, authenticated;

------------------------------------------------------------------------------------------------
-- Sign up without a ticket. Returns the player's id (existing players are just linked).
------------------------------------------------------------------------------------------------
create or replace function public.join_colgrid(p_name text, p_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_player uuid;
  v_email text;
  v_name text := left(btrim(coalesce(p_name, '')), 60);
begin
  if v_uid is null then return null; end if;
  v_player := public.claim_my_pass();
  if v_player is not null then return v_player; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null or v_name = '' then return null; end if;
  insert into public.player (email, name, user_id) values (v_email, v_name, v_uid)
  on conflict (email) do nothing
  returning id into v_player;
  if v_player is null then return public.claim_my_pass(); end if;
  insert into public.play_event (kind, session_id, player_id)
  values ('signup', (select id from public.session where id = p_session_id and open_until is not null), v_player)
  on conflict do nothing;
  return v_player;
end;
$$;
revoke all on function public.join_colgrid(text, uuid) from public, anon;
grant execute on function public.join_colgrid(text, uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- Start a route: with your team this season, or a new team you name.
-- status: ok | no_pass | not_open | need_name | name_taken
------------------------------------------------------------------------------------------------
create or replace function public.start_route(p_session_id uuid, p_team_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_s public.session;
  v_team uuid;
  v_name text := left(btrim(regexp_replace(coalesce(p_team_name, ''), '\s+', ' ', 'g')), 40);
begin
  if v_player is null then return jsonb_build_object('status', 'no_pass'); end if;
  select * into v_s from public.session where id = p_session_id;
  if v_s.id is null or not public.route_is_open(v_s) then return jsonb_build_object('status', 'not_open'); end if;

  v_team := public.my_season_team(v_s.season_id);
  if v_team is null then
    if v_name = '' then return jsonb_build_object('status', 'need_name'); end if;
    if exists (select 1 from public.team where season_id = v_s.season_id and lower(name) = lower(v_name)) then
      return jsonb_build_object('status', 'name_taken');
    end if;
    insert into public.team (season_id, name) values (v_s.season_id, v_name) returning id into v_team;
    insert into public.team_member (team_id, player_id) values (v_team, v_player);
    insert into public.play_event (kind, session_id, team_id, player_id) values ('team_created', v_s.id, v_team, v_player)
    on conflict do nothing;
  end if;

  -- Re-starting a route the team already started makes it the one the pass shows again.
  insert into public.play_event (kind, session_id, team_id, player_id) values ('route_start', v_s.id, v_team, v_player)
  on conflict (kind, team_id, session_id) where kind in ('route_start', 'team_created') do update set created_at = now();

  return jsonb_build_object('status', 'ok', 'team_name', (select name from public.team where id = v_team),
                            'invite', public.route_invite(v_team, v_s.id));
end;
$$;
revoke all on function public.start_route(uuid, text) from public, anon;
grant execute on function public.start_route(uuid, text) to authenticated;

------------------------------------------------------------------------------------------------
-- Invites
------------------------------------------------------------------------------------------------
create or replace function public.team_invite_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when i.token is null then jsonb_build_object('status', 'not_found') else jsonb_build_object(
    'status', case when public.route_is_open(s) then 'ok' else 'closed' end,
    'team_name', t.name,
    'members', (select count(*) from public.team_member m where m.team_id = t.id),
    'slug', s.slug,
    'route_name', coalesce(s.route_name, 'Route ' || lpad(s.number::text, 2, '0')),
    'neighborhood', s.neighborhood,
    'session_id', s.id,
    'is_member', exists (select 1 from public.team_member m where m.team_id = t.id and m.player_id = public.current_player_id())
  ) end
  from (select lower(btrim(p_token)) as tok) x
  left join public.team_invite i on i.token = x.tok
  left join public.team t on t.id = i.team_id
  left join public.session s on s.id = i.session_id;
$$;
revoke all on function public.team_invite_info(text) from public;
grant execute on function public.team_invite_info(text) to anon, authenticated;

-- status: ok | no_pass | not_found | closed | on_other_team
create or replace function public.join_team(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_inv public.team_invite;
  v_s public.session;
  v_team public.team;
  v_current uuid;
begin
  if v_player is null then return jsonb_build_object('status', 'no_pass'); end if;
  select * into v_inv from public.team_invite where token = lower(btrim(p_token));
  if v_inv.token is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into v_s from public.session where id = v_inv.session_id;
  select * into v_team from public.team where id = v_inv.team_id;
  if not public.route_is_open(v_s) then return jsonb_build_object('status', 'closed'); end if;

  v_current := public.my_season_team(v_team.season_id);
  if v_current is distinct from v_team.id then
    if v_current is not null then
      -- Already played with another team this season: keep that team (progress stays with it).
      if exists (select 1 from public.attendance where player_id = v_player and team_id = v_current) then
        return jsonb_build_object('status', 'on_other_team', 'team_name', (select name from public.team where id = v_current));
      end if;
      delete from public.team_member where team_id = v_current and player_id = v_player;
    end if;
    insert into public.team_member (team_id, player_id) values (v_team.id, v_player) on conflict do nothing;
    insert into public.play_event (kind, session_id, team_id, player_id) values ('invite_accepted', v_s.id, v_team.id, v_player)
    on conflict do nothing;
  end if;
  return jsonb_build_object('status', 'ok', 'team_name', v_team.name, 'slug', v_s.slug);
end;
$$;
revoke all on function public.join_team(text) from public, anon;
grant execute on function public.join_team(text) to authenticated;

------------------------------------------------------------------------------------------------
-- Counts from the app: invite_sent | quest_start | install_shown | install_accepted | installed_open
------------------------------------------------------------------------------------------------
create or replace function public.log_play(p_kind text, p_session_id uuid default null, p_quest_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_s public.session;
  v_team uuid;
begin
  if v_player is null or p_kind not in ('invite_sent', 'quest_start', 'install_shown', 'install_accepted', 'installed_open') then
    return;
  end if;
  if p_kind in ('install_shown', 'install_accepted', 'installed_open') then
    insert into public.play_event (kind, session_id, player_id)
    values (p_kind, (select id from public.session where id = p_session_id and open_until is not null), v_player)
    on conflict do nothing;
    return;
  end if;
  select * into v_s from public.session where id = p_session_id and open_until is not null;
  if v_s.id is null then return; end if;
  v_team := public.my_season_team(v_s.season_id);
  if v_team is null then return; end if;
  if p_kind = 'invite_sent' then
    if (select count(*) from public.play_event where kind = 'invite_sent' and player_id = v_player and created_at > now() - interval '1 minute') >= 10 then
      return;
    end if;
    insert into public.play_event (kind, session_id, team_id, player_id) values ('invite_sent', v_s.id, v_team, v_player);
  elsif exists (select 1 from public.quest where id = p_quest_id and session_id = v_s.id and not is_hidden) then
    insert into public.play_event (kind, session_id, quest_id, team_id, player_id) values ('quest_start', v_s.id, p_quest_id, v_team, v_player)
    on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.log_play(text, uuid, uuid) from public, anon;
grant execute on function public.log_play(text, uuid, uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- The pass: which open route to show (the one the team started last).
------------------------------------------------------------------------------------------------
create or replace function public.my_route()
returns uuid language sql stable security definer set search_path = public as $$
  select e.session_id from public.play_event e
  where e.kind = 'route_start' and e.team_id in (select public.my_team_ids())
  order by e.created_at desc limit 1;
$$;
revoke all on function public.my_route() from public, anon;
grant execute on function public.my_route() to authenticated;

-- my_guided(): plus the open-route bits (no start gate, route name, invite link).
create or replace function public.my_guided(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_session public.session%rowtype;
  v_team uuid;
  v_slot int;
  v_arrived timestamptz;
  v_last timestamptz;
  v_season_team uuid;
begin
  if v_player is null then return null; end if;
  select * into v_session from public.session where id = p_session_id;
  if v_session.id is null then return null; end if;
  select a.team_id, a.checked_in_at into v_team, v_arrived from public.attendance a
  where a.session_id = p_session_id and a.player_id = v_player;
  if v_team is not null then
    select slot into v_slot from public.session_team_route where session_id = p_session_id and team_id = v_team;
    select min(a.checked_in_at) into v_arrived from public.attendance a where a.session_id = p_session_id and a.team_id = v_team;
    select max(c.completed_at) into v_last from public.completion c join public.quest q on q.id = c.quest_id
    where q.session_id = p_session_id and c.team_id = v_team and not q.is_hidden and not q.is_judged;
  end if;
  if v_session.open_until is not null then
    v_season_team := coalesce(v_team, public.my_season_team(v_session.season_id));
  end if;
  return jsonb_build_object(
    'arrived', v_team is not null,
    'slot', v_slot,
    'mission_started_at', greatest(v_arrived, v_last),
    'finale_name', case when v_session.status <> 'scheduled' then v_session.finale_name end,
    'finale_where', case when v_session.status <> 'scheduled' then v_session.finale_where end,
    'finale_at', case when v_session.status <> 'scheduled' then v_session.finale_at end,
    'open_route', v_session.open_until is not null,
    'route_name', case when v_session.open_until is not null then coalesce(v_session.route_name, 'Route ' || lpad(v_session.number::text, 2, '0')) end,
    'slug', v_session.slug,
    'open_until', v_session.open_until,
    'invite', case when v_season_team is not null and v_session.status = 'live' then (select token from public.team_invite where team_id = v_season_team and session_id = p_session_id) end
  );
end;
$$;
revoke all on function public.my_guided(uuid) from public, anon;
grant execute on function public.my_guided(uuid) to authenticated;

-- player_sessions(): plus route name and window (open routes have no start gate).
drop function if exists public.player_sessions(uuid);
create function public.player_sessions(p_season_id uuid)
returns table (id uuid, number int, starts_at timestamptz, neighborhood text, start_location text,
               revealed boolean, status public.session_status, is_finals boolean, survey_url text,
               route_name text, open_until timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.number, s.starts_at, s.neighborhood,
         case when s.revealed_at is not null and s.revealed_at <= now() then s.start_location end,
         (s.revealed_at is not null and s.revealed_at <= now()),
         s.status, s.is_finals, s.survey_url, s.route_name, s.open_until
  from public.session s
  where s.season_id = p_season_id
  order by s.number;
$$;
revoke all on function public.player_sessions(uuid) from public;
grant execute on function public.player_sessions(uuid) to anon, authenticated;

-- player_quests(): plus hours and the stop pin (for "Open in Maps"), only for quests players can see.
drop function if exists public.player_quests(uuid);
create function public.player_quests(p_session_id uuid)
returns table (id uuid, stop_number int, title text, type public.quest_type, xp int, host_business text,
               is_hidden boolean, is_judged boolean, unlocked boolean, completed boolean, points int,
               where_text text, briefing text, time_limit_min int, verify text, completed_at timestamptz,
               hours_text text, lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  with my_team as (
    select t.id from public.team t
    join public.session s on s.season_id = t.season_id and s.id = p_session_id
    where t.id in (select public.my_team_ids())
    limit 1
  ), q as (
    select q.*, (not q.is_hidden or c.team_id is not null or (q.revealed_at is not null and q.revealed_at <= now())) as visible,
           c.team_id as done_by, c.points as pts, c.completed_at as done_at
    from public.quest q
    left join public.completion c on c.quest_id = q.id and c.team_id = (select id from my_team)
    where q.session_id = p_session_id
  )
  select q.id, q.stop_number,
         case when q.visible then q.title end,
         q.type, q.xp,
         case when q.visible then h.business end,
         q.is_hidden, q.is_judged, q.visible, (q.done_by is not null), q.pts,
         case when q.visible then q.where_text end,
         case when q.visible then q.briefing end,
         q.time_limit_min,
         case
           when q.lat is not null and q.answer is not null then 'location+answer'
           when q.lat is not null then 'location'
           when q.answer is not null then 'answer'
           else 'code'
         end,
         q.done_at,
         case when q.visible then q.hours_text end,
         case when q.visible then q.lat end,
         case when q.visible then q.lng end
  from q left join public.host h on h.id = q.host_id
  order by q.is_hidden, q.stop_number nulls last, q.title;
$$;
revoke all on function public.player_quests(uuid) from public, anon;
grant execute on function public.player_quests(uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- Close routes whose window ended (called by the 5-minute timer, app/api/cron/reveal).
-- Just closes them: no session badge, no emails.
------------------------------------------------------------------------------------------------
create or replace function public.cron_close_routes(p_secret text)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not private.cron_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.session set status = 'closed'
  where open_until is not null and open_until <= now() and status <> 'closed';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.cron_close_routes(text) from public, authenticated;
grant execute on function public.cron_close_routes(text) to anon, authenticated;

------------------------------------------------------------------------------------------------
-- my_pass_season(): which season the pass shows.
--  1. a gathering the player has a ticket for that's happening now (or check-in is open)
--  2. else the team they joined most recently (as before)
--  3. else the season of their latest ticket (before: the newest season, e.g. the practice one)
------------------------------------------------------------------------------------------------
create or replace function public.my_pass_season()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.season_id from public.ticket t join public.session s on s.id = t.session_id
     where t.player_id = public.current_player_id() and s.open_until is null
       and (s.status = 'live' or (s.status = 'scheduled' and s.starts_at is not null and now() >= s.starts_at - interval '30 minutes'))
     order by s.starts_at desc nulls last limit 1),
    (select t.season_id from public.team_member tm join public.team t on t.id = tm.team_id
     where tm.player_id = public.current_player_id() order by tm.joined_at desc limit 1),
    (select s.season_id from public.ticket t join public.session s on s.id = t.session_id
     where t.player_id = public.current_player_id() order by s.starts_at desc nulls last limit 1)
  );
$$;
revoke all on function public.my_pass_season() from public, anon;
grant execute on function public.my_pass_season() to authenticated;
