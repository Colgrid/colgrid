-- Guided mode tests (the app runs the night). Run after 90_leads.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A test season with one session starting in 20 minutes, 4 stops (stop 3 is a puzzle), 3 teams.
insert into public.season (id, chapter_id, number, name)
select '00000000-0000-0000-0000-00000000c700', id, 7, 'Guided test' from public.chapter where number = 1;
insert into public.session (id, season_id, number, neighborhood, starts_at, start_location, revealed_at, start_code,
                            finale_name, finale_where, finale_at)
values ('00000000-0000-0000-0000-00000000c701', '00000000-0000-0000-0000-00000000c700', 1, '9th & 9th',
        now() + interval '20 minutes', 'The whale', now() - interval '1 day', 'GGG-222',
        'The Long Table', '900 S 900 E', now() + interval '2 hours');
insert into public.quest (id, session_id, stop_number, title, type, xp, code, where_text, briefing, time_limit_min, answer) values
  ('00000000-0000-0000-0000-00000000c7a1', '00000000-0000-0000-0000-00000000c701', 1, 'Custom keepsake', 'making', 25, 'GGA-111', 'Kiln & Co, 912 E 900 S', 'Ask for the Colgrid craft kit.', 20, null),
  ('00000000-0000-0000-0000-00000000c7a2', '00000000-0000-0000-0000-00000000c701', 2, 'Off-menu bite', 'tasting', 25, 'GGB-111', 'The bakery', 'Say the passphrase.', 15, null),
  ('00000000-0000-0000-0000-00000000c7a3', '00000000-0000-0000-0000-00000000c701', 3, 'The missing detail', 'puzzle', 25, 'GGC-111', 'The mural', 'Find the year.', 15, '1912|nineteen twelve'),
  ('00000000-0000-0000-0000-00000000c7a4', '00000000-0000-0000-0000-00000000c701', 4, 'Flavor matrix', 'tasting', 25, 'GGD-111', 'The spice shop', 'Identify sample 2.', 20, null);

-- Six players with tickets; A1+A2 on Team A, B1 on Team B, C1 on Team C; S1 and S2 came solo (no team).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c1a1', 'a1@t.co'), ('00000000-0000-0000-0000-00000000c1a2', 'a2@t.co'),
  ('00000000-0000-0000-0000-00000000c1b1', 'b1@t.co'), ('00000000-0000-0000-0000-00000000c1c1', 'c1@t.co'),
  ('00000000-0000-0000-0000-00000000c151', 's1@t.co'), ('00000000-0000-0000-0000-00000000c152', 's2@t.co'),
  ('00000000-0000-0000-0000-00000000c1ff', 'nt@t.co');
insert into public.player (id, user_id, email, name)
select ('00000000-0000-0000-0000-00000000c2' || right(u.id::text, 2))::uuid, u.id, u.email, upper(split_part(u.email, '@', 1))
from auth.users u where u.email like '%@t.co';
insert into public.team (id, season_id, name) values
  ('00000000-0000-0000-0000-00000000c7ea', '00000000-0000-0000-0000-00000000c700', 'Team A'),
  ('00000000-0000-0000-0000-00000000c7eb', '00000000-0000-0000-0000-00000000c700', 'Team B'),
  ('00000000-0000-0000-0000-00000000c7ec', '00000000-0000-0000-0000-00000000c700', 'Team C');
insert into public.team_member (team_id, player_id) values
  ('00000000-0000-0000-0000-00000000c7ea', '00000000-0000-0000-0000-00000000c2a1'),
  ('00000000-0000-0000-0000-00000000c7ea', '00000000-0000-0000-0000-00000000c2a2'),
  ('00000000-0000-0000-0000-00000000c7eb', '00000000-0000-0000-0000-00000000c2b1'),
  ('00000000-0000-0000-0000-00000000c7ec', '00000000-0000-0000-0000-00000000c2c1');
insert into public.ticket (session_id, player_id, source)
select '00000000-0000-0000-0000-00000000c701', id, 'manual' from public.player
where email in ('a1@t.co', 'a2@t.co', 'b1@t.co', 'c1@t.co', 's1@t.co', 's2@t.co');

create or replace function pg_temp.as_player(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, false);
$$;

-- Too early: an hour before the start, the start code doesn't open anything.
update public.session set starts_at = now() + interval '1 hour' where id = '00000000-0000-0000-0000-00000000c701';
set role authenticated;
select pg_temp.as_player('00000000-0000-0000-0000-00000000c1a1');
do $$
begin
  if public.check_in('ggg222')->>'status' <> 'too_early' then raise exception 'FAIL expected too_early'; end if;
end $$;
reset role;
update public.session set starts_at = now() + interval '20 minutes' where id = '00000000-0000-0000-0000-00000000c701';
set role authenticated;
do $$
declare r jsonb;
begin
  -- 20 minutes before: the start code starts the session and checks the player in.
  r := public.check_in('GGG-222');
  if r->>'status' <> 'arrived' or r->>'team_name' <> 'Team A' then raise exception 'FAIL arrive %', r; end if;
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 50 then raise exception 'FAIL attend XP %', r; end if;
  if (select status from public.player_sessions('00000000-0000-0000-0000-00000000c700') limit 1) <> 'live' then
    raise exception 'FAIL session did not go live';
  end if;
  r := public.check_in('GGG-222');
  if r->>'status' <> 'already_here' then raise exception 'FAIL second scan %', r; end if;
  perform pg_temp.pass('the start code opens 30 minutes early, starts the session, checks you in (+50 XP) once');
end $$;

do $$
declare r jsonb; g jsonb;
begin
  -- Teams B and C arrive: route slots 1 and 2 in arrival order (Team A got slot 0).
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c1b1'); perform public.check_in('GGG-222');
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c1c1'); perform public.check_in('GGG-222');
  g := public.my_guided('00000000-0000-0000-0000-00000000c701');
  if (g->>'slot')::int <> 2 or (g->>'arrived')::boolean is not true then raise exception 'FAIL Team C slot %', g; end if;
  if g->>'finale_name' <> 'The Long Table' then raise exception 'FAIL finale hidden while live %', g; end if;
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c1a1');
  if (public.my_guided('00000000-0000-0000-0000-00000000c701')->>'slot')::int <> 0 then raise exception 'FAIL Team A slot'; end if;

  -- Solo ticket holders land on the smallest team with players tonight (B or C, 1 member each), spreading out.
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c151');
  r := public.check_in('GGG-222');
  if r->>'status' <> 'arrived' or r->>'team_name' not in ('Team B', 'Team C') then raise exception 'FAIL solo 1 %', r; end if;
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c152');
  g := public.check_in('GGG-222');
  if g->>'team_name' = r->>'team_name' or g->>'team_name' = 'Team A' then raise exception 'FAIL solo 2 should balance: % then %', r->>'team_name', g->>'team_name'; end if;

  -- No ticket and no team: nothing to join.
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c1ff');
  if public.check_in('GGG-222')->>'status' <> 'no_team' then raise exception 'FAIL player without ticket got in'; end if;
  perform pg_temp.pass('teams get route slots in arrival order; solo players balance the smallest teams; no ticket, no team');
end $$;

do $$
declare r jsonb; q record; ok boolean := false;
begin
  perform pg_temp.as_player('00000000-0000-0000-0000-00000000c1a1');
  -- Briefings come through; answers and codes never do.
  select * into q from public.player_quests('00000000-0000-0000-0000-00000000c701') where stop_number = 3;
  if q.where_text <> 'The mural' or q.verify <> 'answer' or q.time_limit_min <> 15 then raise exception 'FAIL briefing %', q; end if;
  if (select count(*) from public.player_quests('00000000-0000-0000-0000-00000000c701') p where p::text like '%1912%' or p::text like '%GGC%') > 0 then
    raise exception 'FAIL an answer or code leaked';
  end if;
  if current_user <> 'authenticated' then raise exception 'FAIL test is not running as a player'; end if;
  if exists (select 1 from public.quest where answer is not null) then raise exception 'FAIL players can read answers'; end if;

  -- Puzzle stop: wrong answer, then the right one typed loosely.
  r := public.answer_mission('00000000-0000-0000-0000-00000000c7a3', '1921');
  if r->>'status' <> 'wrong_answer' then raise exception 'FAIL wrong answer accepted %', r; end if;
  r := public.answer_mission('00000000-0000-0000-0000-00000000c7a3', ' Nineteen-Twelve! ');
  if r->>'status' <> 'ok' or (r->>'quest_xp')::int <> 25 then raise exception 'FAIL right answer %', r; end if;
  r := public.answer_mission('00000000-0000-0000-0000-00000000c7a1', 'anything');
  if r->>'status' <> 'bad_code' then raise exception 'FAIL code stops cannot be answered %', r; end if;
  if (select completed from public.player_quests('00000000-0000-0000-0000-00000000c701') where stop_number = 3) is not true then
    raise exception 'FAIL puzzle not marked done';
  end if;
  if (public.my_guided('00000000-0000-0000-0000-00000000c701')->>'mission_started_at')::timestamptz < now() - interval '1 second' then
    raise exception 'FAIL the next mission clock did not restart';
  end if;
  perform pg_temp.pass('puzzle stops take a typed answer (loosely matched); answers and codes never reach players');
end $$;
reset role;
reset request.jwt.claim.sub;
