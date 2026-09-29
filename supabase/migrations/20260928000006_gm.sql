-- Colgrid MVP step 5: game master console (run the night).
-- Run after 20260928000005_admin.sql. Safe to re-run.
--
-- The console (for staff: game masters and admins) marks attendance, starts and closes the session,
-- reveals the start location, and scores judged challenges. Teams and team members are written
-- directly under the existing staff row-level-security policies; attendance and closing go through
-- the functions below so XP and badges are always awarded the same way (and only ever go up).

-- Post-session survey link, shown on the pass after the session (docs/mvp-spec.md, user flow 8).
alter table public.session add column if not exists survey_url text;

------------------------------------------------------------------------------------------------
-- Mark a ticket holder present. They must be on a team this season. Gives +50 attend XP and
-- catches them up on anything their team already completed (mark_present is idempotent).
------------------------------------------------------------------------------------------------
create or replace function public.gm_mark_present(p_session_id uuid, p_player_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.session%rowtype;
  v_team uuid;
  v_already boolean;
begin
  if not public.is_staff() then
    raise exception 'Only the game master can mark attendance.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_session from public.session where id = p_session_id;
  if not found then
    return jsonb_build_object('status', 'no_session');
  end if;
  if v_session.status = 'closed' then
    return jsonb_build_object('status', 'closed');
  end if;

  select exists (select 1 from public.attendance where session_id = p_session_id and player_id = p_player_id) into v_already;
  if v_already then
    return jsonb_build_object('status', 'already');
  end if;

  select tm.team_id into v_team
  from public.team_member tm join public.team t on t.id = tm.team_id
  where tm.player_id = p_player_id and t.season_id = v_session.season_id
  order by tm.joined_at desc limit 1;
  if v_team is null then
    return jsonb_build_object('status', 'no_team');
  end if;

  perform public.mark_present(p_session_id, p_player_id, v_team);
  return jsonb_build_object('status', 'ok', 'team_id', v_team);
end;
$$;
revoke all on function public.gm_mark_present(uuid, uuid) from public, anon;
grant execute on function public.gm_mark_present(uuid, uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- Start the session (scheduled -> live).
------------------------------------------------------------------------------------------------
create or replace function public.gm_start_session(p_session_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_status public.session_status;
begin
  if not public.is_staff() then
    raise exception 'Only the game master can start a session.' using errcode = 'insufficient_privilege';
  end if;
  select status into v_status from public.session where id = p_session_id for update;
  if v_status is null then return 'no_session'; end if;
  if v_status <> 'scheduled' then return v_status::text; end if;
  update public.session set status = 'live', starts_at = coalesce(starts_at, now()) where id = p_session_id;
  return 'live';
end;
$$;
revoke all on function public.gm_start_session(uuid) from public, anon;
grant execute on function public.gm_start_session(uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- Close the session (live -> closed) and award the numbered session badge to everyone present.
-- Badge key: session-NN for regular seasons, pilot-session-NN for the pilot season (Season 00).
------------------------------------------------------------------------------------------------
create or replace function public.gm_close_session(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.session%rowtype;
  v_season public.season%rowtype;
  v_key text;
  v_name text;
  v_badge uuid;
  v_awarded int;
begin
  if not public.is_staff() then
    raise exception 'Only the game master can close a session.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_session from public.session where id = p_session_id for update;
  if not found then return jsonb_build_object('status', 'no_session'); end if;
  if v_session.status = 'closed' then return jsonb_build_object('status', 'already'); end if;
  select * into v_season from public.season where id = v_session.season_id;

  v_key := case when v_season.number = 0 then 'pilot-session-' else 'session-' end || lpad(v_session.number::text, 2, '0');
  v_name := case when v_season.number = 0 then 'Pilot Session ' else 'Session ' end || lpad(v_session.number::text, 2, '0');
  insert into public.badge (key, name, description)
  values (v_key, v_name, 'Played ' || v_name)
  on conflict (key) do nothing;
  select id into v_badge from public.badge where key = v_key;

  insert into public.player_badge (player_id, badge_id)
  select a.player_id, v_badge from public.attendance a where a.session_id = p_session_id
  on conflict do nothing;
  get diagnostics v_awarded = row_count;

  update public.session set status = 'closed' where id = p_session_id;
  return jsonb_build_object('status', 'closed', 'badge', v_name, 'awarded', v_awarded);
end;
$$;
revoke all on function public.gm_close_session(uuid) from public, anon;
grant execute on function public.gm_close_session(uuid) to authenticated;

------------------------------------------------------------------------------------------------
-- player_sessions() now also returns the survey link (shown on the pass after a session).
-- Same masking as before: the start location stays hidden until revealed_at.
------------------------------------------------------------------------------------------------
drop function if exists public.player_sessions(uuid);
create function public.player_sessions(p_season_id uuid)
returns table (id uuid, number int, starts_at timestamptz, neighborhood text, start_location text,
               revealed boolean, status public.session_status, is_finals boolean, survey_url text)
language sql stable security definer set search_path = public as $$
  select s.id, s.number, s.starts_at, s.neighborhood,
         case when s.revealed_at is not null and s.revealed_at <= now() then s.start_location end,
         (s.revealed_at is not null and s.revealed_at <= now()),
         s.status, s.is_finals, s.survey_url
  from public.session s
  where s.season_id = p_season_id
  order by s.number;
$$;
revoke all on function public.player_sessions(uuid) from public;
grant execute on function public.player_sessions(uuid) to anon, authenticated;
