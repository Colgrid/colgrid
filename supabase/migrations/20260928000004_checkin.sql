-- Colgrid MVP step 3: quest check-in -> XP -> level up (the core loop).
-- Run after 20260928000003_grants.sql. Safe to re-run.
--
-- Rules (docs/mvp-spec.md, docs/game-design.md section 9):
--  - A team finishes a quest, the host shows the code or QR, one player enters it.
--  - A code counts once per team. Every teammate marked present that session gets the quest's XP.
--  - Tournament teams also get the quest's points (casual teams never do; see the completion trigger).
--  - Team completes every main quest: +20 XP each. Attending a session: +50 XP.
--  - Judged challenges are scored by the game master, not checked in.
--  - Whoever enters the code is there, so they're marked present if they weren't yet.
--
-- XP awards are idempotent: each (player, reason, source) is awarded at most once, so running
-- award_team_progress() again never double-counts. XP stays append-only (rule 3).

------------------------------------------------------------------------------------------------
-- One award per player per reason per source (adjustments excepted).
------------------------------------------------------------------------------------------------
create unique index if not exists xp_event_once
  on public.xp_event (player_id, reason, source_id)
  where reason <> 'adjustment';

------------------------------------------------------------------------------------------------
-- Code-guessing protection: failed attempts are logged; too many in 10 minutes locks check-in briefly.
------------------------------------------------------------------------------------------------
create table if not exists public.check_in_attempt (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.player (id) on delete cascade,
  code_entered text not null,
  ok boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists check_in_attempt_player_idx on public.check_in_attempt (player_id, attempted_at);
alter table public.check_in_attempt enable row level security;
-- Players never touch it directly; check_in() writes it. Staff can read it (GM console, step 5).
drop policy if exists "staff read check-in attempts" on public.check_in_attempt;
create policy "staff read check-in attempts" on public.check_in_attempt for select using (public.is_staff());
grant select on public.check_in_attempt to authenticated;

------------------------------------------------------------------------------------------------
-- Award everything a team's present players have earned this session. Idempotent.
-- Called after a check-in, and (step 5) when the game master marks someone present late,
-- so late arrivals catch up on quests their team already finished.
------------------------------------------------------------------------------------------------
create or replace function public.award_team_progress(p_session_id uuid, p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_main_total int;
  v_main_done int;
begin
  -- Quest XP for every completed, non-judged quest, to every present teammate.
  insert into public.xp_event (player_id, amount, reason, source_id)
  select a.player_id, q.xp, case when q.is_hidden then 'hidden_quest' else 'quest' end, q.id
  from public.completion c
  join public.quest q on q.id = c.quest_id and q.session_id = p_session_id and not q.is_judged
  join public.attendance a on a.session_id = p_session_id and a.team_id = c.team_id
  where c.team_id = p_team_id
  on conflict (player_id, reason, source_id) where reason <> 'adjustment' do nothing;

  -- Every main quest done: +20 each (main = not hidden, not judged).
  select count(*) into v_main_total from public.quest q
  where q.session_id = p_session_id and not q.is_hidden and not q.is_judged;
  select count(*) into v_main_done from public.completion c
  join public.quest q on q.id = c.quest_id
  where q.session_id = p_session_id and c.team_id = p_team_id and not q.is_hidden and not q.is_judged;

  if v_main_total > 0 and v_main_done = v_main_total then
    insert into public.xp_event (player_id, amount, reason, source_id)
    select a.player_id, 20, 'all_main_quests', p_session_id
    from public.attendance a
    where a.session_id = p_session_id and a.team_id = p_team_id
    on conflict (player_id, reason, source_id) where reason <> 'adjustment' do nothing;
  end if;

  -- Discovery badges, if the chapter uses them: Scout for a hidden quest, Maker for a making quest.
  insert into public.player_badge (player_id, badge_id)
  select distinct a.player_id, b.id
  from public.completion c
  join public.quest q on q.id = c.quest_id and q.session_id = p_session_id and not q.is_judged
  join public.attendance a on a.session_id = p_session_id and a.team_id = c.team_id
  join public.badge b on b.key = case when q.is_hidden then 'scout' when q.type = 'making' then 'maker' end
  where c.team_id = p_team_id
  on conflict do nothing;
end;
$$;
-- Internal only. Supabase may grant new functions to its API roles by default, so revoke from them too.
revoke all on function public.award_team_progress(uuid, uuid) from public, anon, authenticated;

-- Mark a player present for a session (with their team) and give them what they've earned. Idempotent.
create or replace function public.mark_present(p_session_id uuid, p_player_id uuid, p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.attendance (session_id, player_id, team_id)
  values (p_session_id, p_player_id, p_team_id)
  on conflict (session_id, player_id) do nothing;

  insert into public.xp_event (player_id, amount, reason, source_id)
  values (p_player_id, 50, 'attend', p_session_id)
  on conflict (player_id, reason, source_id) where reason <> 'adjustment' do nothing;

  perform public.award_team_progress(p_session_id, p_team_id);
end;
$$;
revoke all on function public.mark_present(uuid, uuid, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- check_in(code): what the Check in screen calls. Returns a result the app turns into words.
-- status: ok | already | bad_code | not_live | judged | no_team | no_pass | too_many
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

-- Quests are for signed-in players only (as step 1 intended; Supabase had also granted it to visitors).
revoke all on function public.player_quests(uuid) from public, anon;
grant execute on function public.player_quests(uuid) to authenticated;
