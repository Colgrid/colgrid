-- Location verification tests. Run after 95_guided.test.sql (uses its test season and players).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- Two more stops in the guided test session (live by now): the whale (location + answer) and a
-- bench (location only, 60-second stay). The whale sits at 40.7503, -111.8650.
insert into public.quest (id, session_id, stop_number, title, type, xp, code, answer, lat, lng, radius_m, dwell_sec) values
  ('00000000-0000-0000-0000-00000000c7b1', '00000000-0000-0000-0000-00000000c701', 5, 'The whale', 'discovery', 25, 'GGE-111', 'blue', 40.7503, -111.8650, 40, 90),
  ('00000000-0000-0000-0000-00000000c7b2', '00000000-0000-0000-0000-00000000c701', 6, 'The bench', 'discovery', 25, 'GGF-111', null, 40.7510, -111.8650, 40, 60);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', false);
do $$
declare r jsonb;
begin
  if (select verify from public.player_quests('00000000-0000-0000-0000-00000000c701') where stop_number = 5) <> 'location+answer' then raise exception 'FAIL verify label'; end if;
  r := public.complete_mission('00000000-0000-0000-0000-00000000c7b1', 'blue', null, null, null);
  if r->>'status' <> 'need_location' then raise exception 'FAIL no location %', r; end if;
  if public.answer_mission('00000000-0000-0000-0000-00000000c7b1', 'blue')->>'status' <> 'need_location' then raise exception 'FAIL answer-only call skipped the location'; end if;
  -- ~450 m south: too far.
  r := public.complete_mission('00000000-0000-0000-0000-00000000c7b1', 'blue', 40.7463, -111.8650, 10);
  if r->>'status' <> 'too_far' or (r->>'distance_m')::int not between 400 and 500 then raise exception 'FAIL too far %', r; end if;
  -- Signal too weak to trust.
  if public.complete_mission('00000000-0000-0000-0000-00000000c7b1', 'blue', 40.7503, -111.8650, 400)->>'status' <> 'weak_signal' then raise exception 'FAIL weak signal'; end if;
  -- ~30 m away with 15 m accuracy: inside. Wrong answer, then right.
  if public.complete_mission('00000000-0000-0000-0000-00000000c7b1', 'green', 40.75057, -111.8650, 15)->>'status' <> 'wrong_answer' then raise exception 'FAIL wrong answer'; end if;
  r := public.complete_mission('00000000-0000-0000-0000-00000000c7b1', ' Blue! ', 40.75057, -111.8650, 15);
  if r->>'status' <> 'ok' then raise exception 'FAIL right place + answer %', r; end if;
  perform pg_temp.pass('location + answer: must be within the radius (with GPS slack) and know the answer');
end $$;

do $$
declare r jsonb;
begin
  r := public.complete_mission('00000000-0000-0000-0000-00000000c7b2', null, 40.7510, -111.8650, 10);
  if r->>'status' <> 'stay' or (r->>'seconds_left')::int not between 55 and 60 then raise exception 'FAIL stay %', r; end if;
end $$;
reset role;
-- A minute passes.
update public.quest_visit set first_seen_at = now() - interval '61 seconds' where quest_id = '00000000-0000-0000-0000-00000000c7b2';
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.complete_mission('00000000-0000-0000-0000-00000000c7b2', null, 40.7510, -111.8650, 10);
  if r->>'status' <> 'ok' then raise exception 'FAIL after the stay %', r; end if;
  -- The host code still works as a backup on location stops (another team member, already done = already).
  if public.check_in('GGF-111')->>'status' <> 'already' then raise exception 'FAIL code fallback'; end if;
  perform pg_temp.pass('location-only stops need a short stay; host codes still work as a backup');
end $$;
reset role;
reset request.jwt.claim.sub;
