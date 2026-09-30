-- Colgrid: verify a stop without a person there.
-- Run after 20260930000012_guided.sql. Safe to re-run.
--
-- The normal way to finish a stop is now what the app can check on its own:
--  - Location: the phone is inside the stop's radius (a pin + radius set once per stop).
--  - Answer: something you can only know by being there (typed, loosely matched).
--  - Location-only stops ask the team to stay a moment (dwell) so driving past doesn't count.
-- Host codes and QR stickers still work as a backup and admin override (check_in()).
-- Positions are used for the check and never stored.

alter table public.quest add column if not exists lat double precision check (lat between -90 and 90);
alter table public.quest add column if not exists lng double precision check (lng between -180 and 180);
alter table public.quest add column if not exists radius_m int not null default 40 check (radius_m between 10 and 500);
alter table public.quest add column if not exists dwell_sec int not null default 90 check (dwell_sec between 0 and 1800);

-- When a team was first seen inside a location-only stop (for the dwell).
create table if not exists public.quest_visit (
  quest_id uuid not null references public.quest (id) on delete cascade,
  team_id uuid not null references public.team (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  primary key (quest_id, team_id)
);
alter table public.quest_visit enable row level security;
revoke all on public.quest_visit from public, anon, authenticated;

create or replace function public.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

------------------------------------------------------------------------------------------------
-- complete_mission(quest, answer, lat, lng, accuracy): the in-app way to finish a stop.
-- status: ok | already (from check_in) | need_location | weak_signal | too_far | stay |
--         wrong_answer | bad_code | too_many | no_team | no_pass
------------------------------------------------------------------------------------------------
create or replace function public.complete_mission(p_quest_id uuid, p_answer text, p_lat double precision,
                                                   p_lng double precision, p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_quest public.quest%rowtype;
  v_session public.session%rowtype;
  v_team uuid;
  v_fails int;
  v_dist double precision;
  v_first timestamptz;
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
  select * into v_session from public.session where id = v_quest.session_id;
  if v_quest.id is null or v_quest.is_hidden or v_quest.is_judged or v_session.status is distinct from 'live'
     or (v_quest.answer is null and v_quest.lat is null) then
    return jsonb_build_object('status', 'bad_code');
  end if;

  select a.team_id into v_team from public.attendance a where a.session_id = v_session.id and a.player_id = v_player;
  if v_team is null then
    select tm.team_id into v_team from public.team_member tm join public.team t on t.id = tm.team_id
    where tm.player_id = v_player and t.season_id = v_session.season_id
    order by tm.joined_at desc limit 1;
  end if;
  if v_team is null then
    return jsonb_build_object('status', 'no_team');
  end if;

  -- Location: inside the radius, with a little slack for GPS error (at most 30 m).
  if v_quest.lat is not null then
    if p_lat is null or p_lng is null then
      return jsonb_build_object('status', 'need_location');
    end if;
    if coalesce(p_accuracy, 0) > 150 then
      return jsonb_build_object('status', 'weak_signal');
    end if;
    v_dist := public.distance_m(v_quest.lat, v_quest.lng, p_lat, p_lng);
    if v_dist > v_quest.radius_m + least(greatest(coalesce(p_accuracy, 0), 0), 30) then
      return jsonb_build_object('status', 'too_far', 'distance_m', round(v_dist)::int);
    end if;
  end if;

  -- Answer: typed, loosely matched; wrong answers count toward the guess limit.
  if v_quest.answer is not null then
    if public.normalize_answer(p_answer) = ''
       or not exists (select 1 from unnest(string_to_array(v_quest.answer, '|')) a
                      where public.normalize_answer(a) = public.normalize_answer(p_answer)) then
      insert into public.check_in_attempt (player_id, code_entered, ok) values (v_player, left(coalesce(p_answer, ''), 32), false);
      return jsonb_build_object('status', 'wrong_answer');
    end if;
  elsif v_quest.dwell_sec > 0 then
    -- Location-only stop: stay a moment.
    insert into public.quest_visit (quest_id, team_id) values (v_quest.id, v_team) on conflict do nothing;
    select first_seen_at into v_first from public.quest_visit where quest_id = v_quest.id and team_id = v_team;
    if now() < v_first + make_interval(secs => v_quest.dwell_sec)
       and not exists (select 1 from public.completion where quest_id = v_quest.id and team_id = v_team) then
      return jsonb_build_object('status', 'stay',
        'seconds_left', ceil(extract(epoch from (v_first + make_interval(secs => v_quest.dwell_sec) - now())))::int);
    end if;
  end if;

  return public.check_in(v_quest.code);
end;
$$;
revoke all on function public.complete_mission(uuid, text, double precision, double precision, double precision) from public, anon;
grant execute on function public.complete_mission(uuid, text, double precision, double precision, double precision) to authenticated;

-- The earlier answer-only call goes through the same checks (so a stop with a location can't skip it).
create or replace function public.answer_mission(p_quest_id uuid, p_answer text)
returns jsonb language sql security definer set search_path = public as $$
  select public.complete_mission(p_quest_id, p_answer, null, null, null);
$$;
revoke all on function public.answer_mission(uuid, text) from public, anon;
grant execute on function public.answer_mission(uuid, text) to authenticated;

-- player_quests(): verify now says what the stop needs: location+answer | location | answer | code.
create or replace function public.player_quests(p_session_id uuid)
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
         case
           when q.lat is not null and q.answer is not null then 'location+answer'
           when q.lat is not null then 'location'
           when q.answer is not null then 'answer'
           else 'code'
         end,
         q.done_at
  from q left join public.host h on h.id = q.host_id
  order by q.is_hidden, q.stop_number nulls last, q.title;
$$;
revoke all on function public.player_quests(uuid) from public, anon;
grant execute on function public.player_quests(uuid) to authenticated;
