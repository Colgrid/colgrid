-- Game master console tests (step 5). Run after 40_admin.test.sql (uses its pilot session and players).
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A game master account.
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000f2', 'gm2@example.com', now());
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000f2', 'gm');

select id as pilot_session from public.session where season_id = (select id from public.season where number = 0) and number = 1 \gset
select set_config('test.pilot_session', :'pilot_session', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);

-- 1. Attendance needs a team; with one, it gives the attend XP once ---------------------------------
do $$
declare r jsonb; v_player uuid; v_team uuid; v_xp int;
begin
  select id into v_player from public.player where email = 'new.buyer@example.com';
  r := public.gm_mark_present(current_setting('test.pilot_session')::uuid, v_player);
  if r->>'status' <> 'no_team' then raise exception 'FAIL marked present without a team: %', r; end if;

  insert into public.team (season_id, name) select id, 'Pilot Team 1' from public.season where number = 0 returning id into v_team;
  insert into public.team_member (team_id, player_id) values (v_team, v_player);

  r := public.gm_mark_present(current_setting('test.pilot_session')::uuid, v_player);
  if r->>'status' <> 'ok' then raise exception 'FAIL mark present: %', r; end if;
  r := public.gm_mark_present(current_setting('test.pilot_session')::uuid, v_player);
  if r->>'status' <> 'already' then raise exception 'FAIL second mark present: %', r; end if;

  select coalesce(sum(amount), 0) into v_xp from public.xp_event
  where player_id = v_player and reason = 'attend' and source_id = current_setting('test.pilot_session')::uuid;
  if v_xp <> 50 then raise exception 'FAIL attend XP %', v_xp; end if;
  perform pg_temp.pass('the game master marks attendance (team required); +50 XP, once');
end $$;

-- 2. Start, then close: session badge for everyone present -----------------------------------------
do $$
declare s text; r jsonb;
begin
  s := public.gm_start_session(current_setting('test.pilot_session')::uuid);
  if s <> 'live' then raise exception 'FAIL start: %', s; end if;
  r := public.gm_close_session(current_setting('test.pilot_session')::uuid);
  if r->>'status' <> 'closed' or (r->>'awarded')::int <> 1 or r->>'badge' <> 'Pilot Session 01' then
    raise exception 'FAIL close: %', r;
  end if;
  r := public.gm_close_session(current_setting('test.pilot_session')::uuid);
  if r->>'status' <> 'already' then raise exception 'FAIL closing twice: %', r; end if;
  r := public.gm_mark_present(current_setting('test.pilot_session')::uuid, (select id from public.player where email = 'pair.one@example.com'));
  if r->>'status' <> 'closed' then raise exception 'FAIL attendance after close: %', r; end if;
  perform pg_temp.pass('start and close; closing awards "Pilot Session 01" to everyone present, once');
end $$;

-- 3. Players can't run the night ----------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare ok boolean := false;
begin
  begin
    perform public.gm_start_session(current_setting('test.pilot_session')::uuid);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could start a session'; end if;
  ok := false;
  begin
    perform public.gm_mark_present(current_setting('test.pilot_session')::uuid, public.current_player_id());
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could mark themselves present'; end if;
  perform pg_temp.pass('players cannot start, close or take attendance');
end $$;
reset role;
reset request.jwt.claim.sub;
