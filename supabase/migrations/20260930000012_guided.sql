-- Colgrid: guided mode. The app runs the night; a person only handles exceptions.
-- Run after 20260930000011_leads.sql. Safe to re-run.
--
--  - Each quest can carry a briefing: where to go, what to do, a target time, and (for puzzle
--    stops) an answer players type instead of a host code. Answers are never sent to players.
--  - Missions unlock one at a time. Each team gets a route slot when it arrives, and the app
--    rotates the stop order by that slot so teams spread out (team 1 starts at stop 1, team 2 at
--    stop 2, …). Slots are handed out in arrival order.
--  - Self check-in: every session has a start code (QR on a sign at the drop point). Scanning it
--    starts the session (from 30 minutes before the start time), puts a ticket holder without a
--    team on the smallest team that has players tonight, and marks them present (+50 XP).
--  - A finale (place, address, time) shows once a team finishes every main mission.

alter table public.quest add column if not exists where_text text check (length(where_text) <= 300);
alter table public.quest add column if not exists briefing text check (length(briefing) <= 1500);
alter table public.quest add column if not exists time_limit_min int check (time_limit_min between 1 and 240);
alter table public.quest add column if not exists answer text check (length(answer) <= 200);

alter table public.session add column if not exists finale_name text check (length(finale_name) <= 120);
alter table public.session add column if not exists finale_where text check (length(finale_where) <= 300);
alter table public.session add column if not exists finale_at timestamptz;

-- Codes are unique across quest codes and start codes, so one check-in box serves both.
create or replace function public.new_quest_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      if i = 3 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.quest where code = v_code)
          and not exists (select 1 from public.session where start_code = v_code);
  end loop;
  return v_code;
end;
$$;

alter table public.session add column if not exists start_code text;
update public.session set start_code = public.new_quest_code() where start_code is null;
alter table public.session alter column start_code set default public.new_quest_code();
alter table public.session alter column start_code set not null;
create unique index if not exists session_start_code_key on public.session (start_code);

------------------------------------------------------------------------------------------------
-- Route slots: which stop each team starts at, in arrival order.
------------------------------------------------------------------------------------------------
create table if not exists public.session_team_route (
  session_id uuid not null references public.session (id) on delete cascade,
  team_id uuid not null references public.team (id) on delete cascade,
  slot int not null check (slot >= 0),
  created_at timestamptz not null default now(),
  primary key (session_id, team_id)
);
alter table public.session_team_route enable row level security;
drop policy if exists "staff read routes" on public.session_team_route;
create policy "staff read routes" on public.session_team_route for select using (public.is_staff());
revoke all on public.session_team_route from public, anon, authenticated;
grant select on public.session_team_route to authenticated;

-- Mark a player present (with their team), give their team a route slot, award what they've earned.
create or replace function public.mark_present(p_session_id uuid, p_player_id uuid, p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.attendance (session_id, player_id, team_id)
  values (p_session_id, p_player_id, p_team_id)
  on conflict (session_id, player_id) do nothing;

  if not exists (select 1 from public.session_team_route where session_id = p_session_id and team_id = p_team_id) then
    perform pg_advisory_xact_lock(hashtext('route:' || p_session_id::text));
    insert into public.session_team_route (session_id, team_id, slot)
    select p_session_id, p_team_id, count(*) from public.session_team_route where session_id = p_session_id
    on conflict (session_id, team_id) do nothing;
  end if;

  insert into public.xp_event (player_id, amount, reason, source_id)
  values (p_player_id, 50, 'attend', p_session_id)
  on conflict (player_id, reason, source_id) where reason <> 'adjustment' do nothing;

  perform public.award_team_progress(p_session_id, p_team_id);
end;
$$;
revoke all on function public.mark_present(uuid, uuid, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- arrive(session): the start code. Internal; players reach it through check_in().
-- status: arrived | already_here | too_early | not_live | no_team | no_pass
------------------------------------------------------------------------------------------------
create or replace function public.arrive(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_session public.session%rowtype;
  v_team public.team%rowtype;
  v_team_id uuid;
  v_here boolean;
  v_before int;
  v_after int;
  v_breakdown jsonb;
begin
  if v_player is null then
    return jsonb_build_object('status', 'no_pass');
  end if;
  select * into v_session from public.session where id = p_session_id for update;
  if v_session.status = 'closed' then
    return jsonb_build_object('status', 'not_live', 'session_number', v_session.number);
  end if;
  if v_session.status = 'scheduled' then
    if v_session.starts_at is null or now() < v_session.starts_at - interval '30 minutes' then
      return jsonb_build_object('status', 'too_early', 'starts_at', v_session.starts_at, 'session_number', v_session.number);
    end if;
    update public.session set status = 'live' where id = p_session_id;
  end if;

  -- Team: where they're already marked present, else their team this season.
  select a.team_id into v_team_id from public.attendance a where a.session_id = p_session_id and a.player_id = v_player;
  v_here := found;
  if v_team_id is null then
    select tm.team_id into v_team_id from public.team_member tm join public.team t on t.id = tm.team_id
    where tm.player_id = v_player and t.season_id = v_session.season_id
    order by tm.joined_at desc limit 1;
  end if;
  -- Ticket holder without a team: the smallest team that has ticket holders tonight.
  if v_team_id is null and exists (select 1 from public.ticket where session_id = p_session_id and player_id = v_player) then
    select t.id into v_team_id from public.team t
    where t.season_id = v_session.season_id
      and exists (select 1 from public.team_member tm join public.ticket tk on tk.player_id = tm.player_id and tk.session_id = p_session_id
                  where tm.team_id = t.id)
    order by (select count(*) from public.team_member tm2 where tm2.team_id = t.id), t.name
    limit 1;
    if v_team_id is not null then
      insert into public.team_member (team_id, player_id) values (v_team_id, v_player) on conflict do nothing;
    end if;
  end if;
  if v_team_id is null then
    return jsonb_build_object('status', 'no_team');
  end if;
  select * into v_team from public.team where id = v_team_id;

  select coalesce(sum(amount), 0) into v_before from public.xp_event where player_id = v_player;
  perform public.mark_present(p_session_id, v_player, v_team_id);
  select coalesce(sum(amount), 0) into v_after from public.xp_event where player_id = v_player;
  select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'amount', amount) order by id), '[]'::jsonb)
  into v_breakdown from public.xp_event where player_id = v_player and created_at = now();

  return jsonb_build_object(
    'status', case when v_here then 'already_here' else 'arrived' end,
    'team_name', v_team.name,
    'team_mode', v_team.mode,
    'session_number', v_session.number,
    'xp_before', v_before,
    'xp_after', v_after,
    'breakdown', v_breakdown,
    'new_badges', '[]'::jsonb
  );
end;
$$;
revoke all on function public.arrive(uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- check_in(code): unchanged, plus the start code.
------------------------------------------------------------------------------------------------
create or replace function public.check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code text;
  v_quest public.quest%rowtype;
  v_session public.session%rowtype;
  v_team public.team%rowtype;
  v_fails int;
  v_before int;
  v_after int;
  v_new boolean;
  v_points int;
  v_breakdown jsonb;
  v_badges jsonb;
begin
  if v_player is null then
    return jsonb_build_object('status', 'no_pass');
  end if;

  select count(*) into v_fails from public.check_in_attempt
  where player_id = v_player and not ok and attempted_at > now() - interval '10 minutes';
  if v_fails >= 8 then
    return jsonb_build_object('status', 'too_many');
  end if;

  v_code := case when length(v_raw) = 6 then substr(v_raw, 1, 3) || '-' || substr(v_raw, 4, 3) end;

  -- The start code on the sign at the drop point: arrive, get placed on a team, mission 1 unlocks.
  if exists (select 1 from public.session where start_code = v_code) then
    return public.arrive((select id from public.session where start_code = v_code));
  end if;
  select * into v_quest from public.quest where code = v_code;
  if found then
    select * into v_session from public.session where id = v_quest.session_id;
  end if;

  -- Unknown codes and codes for sessions that haven't started look the same (hidden stays hidden).
  if not found or v_session.status = 'scheduled' then
    insert into public.check_in_attempt (player_id, code_entered, ok) values (v_player, left(coalesce(p_code, ''), 32), false);
    return jsonb_build_object('status', 'bad_code');
  end if;

  if v_session.status = 'closed' then
    return jsonb_build_object('status', 'not_live', 'session_number', v_session.number);
  end if;

  -- The player's team for this session: where they're marked present, else their team this season.
  select t.* into v_team from public.attendance a join public.team t on t.id = a.team_id
  where a.session_id = v_session.id and a.player_id = v_player;
  if not found then
    select t.* into v_team from public.team t join public.team_member tm on tm.team_id = t.id
    where tm.player_id = v_player and t.season_id = v_session.season_id
    order by tm.joined_at desc limit 1;
  end if;
  if not found then
    return jsonb_build_object('status', 'no_team');
  end if;

  if v_quest.is_judged then
    return jsonb_build_object('status', 'judged', 'quest_title', v_quest.title);
  end if;

  insert into public.check_in_attempt (player_id, code_entered, ok) values (v_player, v_code, true);
  select coalesce(sum(amount), 0) into v_before from public.xp_event where player_id = v_player;

  -- Whoever holds the code is here.
  perform public.mark_present(v_session.id, v_player, v_team.id);

  insert into public.completion (quest_id, team_id, points)
  values (v_quest.id, v_team.id, case when v_team.mode = 'tournament' then v_quest.max_points end)
  on conflict (quest_id, team_id) do nothing
  returning points into v_points;
  v_new := found;
  if not v_new then
    select points into v_points from public.completion where quest_id = v_quest.id and team_id = v_team.id;
  end if;

  perform public.award_team_progress(v_session.id, v_team.id);

  select coalesce(sum(amount), 0) into v_after from public.xp_event where player_id = v_player;

  -- What this check-in gave the player who entered it, by reason.
  select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'amount', amount) order by id), '[]'::jsonb)
  into v_breakdown
  from public.xp_event where player_id = v_player and created_at = now(); -- now() = this transaction

  select coalesce(jsonb_agg(jsonb_build_object('key', b.key, 'name', b.name)), '[]'::jsonb) into v_badges
  from public.player_badge pb join public.badge b on b.id = pb.badge_id
  where pb.player_id = v_player and pb.awarded_at = now();

  return jsonb_build_object(
    'status', case when v_new then 'ok' else 'already' end,
    'quest_title', v_quest.title,
    'quest_xp', v_quest.xp,
    'is_hidden', v_quest.is_hidden,
    'stop_number', v_quest.stop_number,
    'team_name', v_team.name,
    'team_mode', v_team.mode,
    'points', v_points,
    'xp_before', v_before,
    'xp_after', v_after,
    'breakdown', v_breakdown,
    'new_badges', v_badges
  );
end;
$$;
revoke all on function public.check_in(text) from public, anon;
grant execute on function public.check_in(text) to authenticated;

------------------------------------------------------------------------------------------------
-- answer_mission(quest, answer): puzzle stops. A right answer counts exactly like the host code.
-- Wrong answers count toward the same guess limit as wrong codes.
------------------------------------------------------------------------------------------------
create or replace function public.normalize_answer(p text)
returns text language sql immutable as $$
  select regexp_replace(regexp_replace(lower(coalesce(p, '')), '^\s*(the|a|an)\s+', ''), '[^a-z0-9]', '', 'g');
$$;

create or replace function public.answer_mission(p_quest_id uuid, p_answer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_quest public.quest%rowtype;
  v_status public.session_status;
  v_fails int;
begin
  if v_player is null then
    return jsonb_build_object('status', 'no_pass');
  end if;
  select count(*) into v_fails from public.check_in_attempt
  where player_id = v_player and not ok and attempted_at > now() - interval '10 minutes';
  if v_fails >= 8 then
    return jsonb_build_object('status', 'too_many');
  end if;
  select * into v_quest from public.quest where id = p_quest_id;
  select status into v_status from public.session where id = v_quest.session_id;
  if v_quest.id is null or v_quest.answer is null or v_quest.is_hidden or v_status is distinct from 'live' then
    return jsonb_build_object('status', 'bad_code');
  end if;
  if public.normalize_answer(p_answer) = ''
     or not exists (select 1 from unnest(string_to_array(v_quest.answer, '|')) a
                    where public.normalize_answer(a) = public.normalize_answer(p_answer)) then
    insert into public.check_in_attempt (player_id, code_entered, ok) values (v_player, left(coalesce(p_answer, ''), 32), false);
    return jsonb_build_object('status', 'wrong_answer');
  end if;
  return public.check_in(v_quest.code);
end;
$$;
revoke all on function public.answer_mission(uuid, text) from public, anon;
grant execute on function public.answer_mission(uuid, text) to authenticated;

------------------------------------------------------------------------------------------------
-- player_quests(): now with the briefing. Answers and codes are never returned; hidden quests stay
-- masked until found or revealed.
------------------------------------------------------------------------------------------------
drop function if exists public.player_quests(uuid);
create function public.player_quests(p_session_id uuid)
returns table (id uuid, stop_number int, title text, type public.quest_type, xp int, host_business text,
               is_hidden boolean, is_judged boolean, unlocked boolean, completed boolean, points int,
               where_text text, briefing text, time_limit_min int, verify text, completed_at timestamptz)
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
         case when q.answer is not null then 'answer' else 'code' end,
         q.done_at
  from q left join public.host h on h.id = q.host_id
  order by q.is_hidden, q.stop_number nulls last, q.title;
$$;
revoke all on function public.player_quests(uuid) from public, anon;
grant execute on function public.player_quests(uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- my_guided(session): the signed-in player's route slot, when their current mission started,
-- and the finale (only once the session is live).
------------------------------------------------------------------------------------------------
create or replace function public.my_guided(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_session public.session%rowtype;
  v_team uuid;
  v_slot int;
  v_arrived timestamptz;
  v_last timestamptz;
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
  return jsonb_build_object(
    'arrived', v_team is not null,
    'slot', v_slot,
    'mission_started_at', greatest(v_arrived, v_last),
    'finale_name', case when v_session.status <> 'scheduled' then v_session.finale_name end,
    'finale_where', case when v_session.status <> 'scheduled' then v_session.finale_where end,
    'finale_at', case when v_session.status <> 'scheduled' then v_session.finale_at end
  );
end;
$$;
revoke all on function public.my_guided(uuid) from public, anon;
grant execute on function public.my_guided(uuid) to authenticated;
