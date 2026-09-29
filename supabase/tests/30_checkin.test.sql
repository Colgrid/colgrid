-- Check-in tests (step 3). Run after 20_signin.test.sql, on the seed data.
-- Salt Flats Syndicate is a tournament team, everyone on it is present at the live Session 02,
-- and it hasn't finished any Session 02 quest yet.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- Accounts: Sam and Priya (Salt Flats), Aiko (Night Owls), and Larry, a late Salt Flats signup
-- who isn't marked present yet.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'sam.ortiz@example.com', now()),
  ('00000000-0000-0000-0000-0000000000e2', 'priya.nair@example.com', now()),
  ('00000000-0000-0000-0000-0000000000e3', 'aiko.mori@example.com', now()),
  ('00000000-0000-0000-0000-0000000000e4', 'late.larry@example.com', now());
insert into public.player (email, name) values ('late.larry@example.com', 'Larry Late');
insert into public.team_member (team_id, player_id)
select t.id, p.id from public.team t, public.player p where t.name = 'Salt Flats Syndicate' and p.email = 'late.larry@example.com';
update public.player p set user_id = u.id from auth.users u where u.email = p.email and p.user_id is null
  and u.email in ('sam.ortiz@example.com', 'priya.nair@example.com', 'aiko.mori@example.com', 'late.larry@example.com');

set role authenticated;

-- 1. A code works, any format; the whole present team gets the XP; tournament points recorded ----
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare r jsonb;
begin
  r := public.check_in('tac7q2');
  if r->>'status' <> 'ok' then raise exception 'FAIL check-in status %', r; end if;
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 25 then raise exception 'FAIL expected +25, got %', r; end if;
  if (r->>'points')::int is distinct from 40 then raise exception 'FAIL tournament points not recorded: %', r; end if;
  perform pg_temp.pass('a host code checks in (typed any way), gives quest XP and tournament points');
end $$;
reset role;
do $$
begin
  if (select count(*) from public.xp_event x join public.quest q on q.id = x.source_id
      join public.attendance a on a.player_id = x.player_id and a.session_id = q.session_id
      join public.team t on t.id = a.team_id
      where q.code = 'TAC-7Q2' and t.name = 'Salt Flats Syndicate' and x.reason = 'quest') <> 5 then
    raise exception 'FAIL not every present teammate got the quest XP';
  end if;
  perform pg_temp.pass('every present teammate gets the quest XP');
end $$;
set role authenticated;

-- 2. A code counts once per team ------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', false);
do $$
declare r jsonb;
begin
  r := public.check_in('TAC-7Q2');
  if r->>'status' <> 'already' then raise exception 'FAIL second check-in status %', r; end if;
  if (r->>'xp_after')::int <> (r->>'xp_before')::int then raise exception 'FAIL second check-in gave XP: %', r; end if;
  perform pg_temp.pass('a code counts once per team; a teammate re-entering it earns nothing extra');
end $$;

-- 3. Hidden quest: its own XP and the Scout badge -------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare r jsonb;
begin
  r := public.check_in('HID-8X1');
  if r->>'status' <> 'ok' or (r->>'is_hidden')::boolean is not true then raise exception 'FAIL hidden check-in %', r; end if;
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 30 then raise exception 'FAIL hidden quest XP %', r; end if;
  if not (r->'new_badges') @> '[{"key":"scout"}]' then raise exception 'FAIL no Scout badge %', r; end if;
  perform pg_temp.pass('finding a hidden quest gives 30 XP and the Scout badge');
end $$;

-- 4. Finishing every main quest adds +20 (the judged challenge doesn't count as main) -------------
do $$
declare r jsonb;
begin
  r := public.check_in('NNP-4K7');
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 25 then raise exception 'FAIL expected +25 (2 of 3 main), got %', r; end if;
end $$;
do $$
declare r jsonb;
begin
  r := public.check_in('MAP 2H9');
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 45 then raise exception 'FAIL expected +25 +20 bonus, got %', r; end if;
  if not (r->'breakdown') @> '[{"reason":"all_main_quests","amount":20}]' then raise exception 'FAIL bonus missing from breakdown %', r; end if;
  perform pg_temp.pass('finishing every main quest adds +20 each');
end $$;

-- 5. Judged challenges, past sessions and future sessions -----------------------------------------
do $$
declare r jsonb;
begin
  r := public.check_in('JDG-5R3');
  if r->>'status' <> 'judged' then raise exception 'FAIL judged quest checked in: %', r; end if;
  r := public.check_in('SUG-P1K');
  if r->>'status' <> 'not_live' then raise exception 'FAIL closed-session code: %', r; end if;
  r := public.check_in('CEN-1M4');
  if r->>'status' <> 'bad_code' then raise exception 'FAIL future-session code should look unknown: %', r; end if;
  r := public.check_in('ZZZ-999');
  if r->>'status' <> 'bad_code' then raise exception 'FAIL unknown code: %', r; end if;
  perform pg_temp.pass('judged, past and future-session codes are refused; future codes reveal nothing');
end $$;

-- 6. A late arrival is marked present and catches up on what the team already did ----------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e4', false);
do $$
declare r jsonb;
begin
  r := public.check_in('NNP-4K7');
  if r->>'status' <> 'already' then raise exception 'FAIL late check-in status %', r; end if;
  -- 50 attend + 3 main x 25 + hidden 30 + all-main bonus 20
  if (r->>'xp_after')::int - (r->>'xp_before')::int <> 175 then raise exception 'FAIL late arrival XP %', r; end if;
  perform pg_temp.pass('a late arrival who enters a code is marked present and catches up (+175)');
end $$;

-- 7. Casual team: XP, never points ---------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare r jsonb;
begin
  r := public.check_in('TAC-7Q2');
  if r->>'status' <> 'ok' then raise exception 'FAIL casual check-in %', r; end if;
  if r->>'points' is not null then raise exception 'FAIL casual team got points %', r; end if;
  perform pg_temp.pass('casual teams earn XP but never points');
end $$;

-- 8. Guessing codes locks check-in for a while -----------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', false);
do $$
declare r jsonb;
begin
  for i in 1..8 loop
    r := public.check_in('AAA-00' || i);
  end loop;
  r := public.check_in('MAP-2H9');
  if r->>'status' <> 'too_many' then raise exception 'FAIL guessing not locked out: %', r; end if;
  perform pg_temp.pass('8 wrong codes in 10 minutes pauses check-in (stops code guessing)');
end $$;

-- 9. Players can't read other players' attempts; signed-out visitors can't check in -----------------
do $$
begin
  if exists (select 1 from public.check_in_attempt) then raise exception 'FAIL player can read check-in attempts'; end if;
  perform pg_temp.pass('players cannot read the check-in log');
end $$;
reset role;
set role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.check_in('TAC-7Q2');
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL anon could check in'; end if;
  perform pg_temp.pass('signed-out visitors cannot check in');
end $$;
reset role;
set role authenticated;
do $$
declare ok boolean := false;
begin
  begin
    perform public.mark_present(gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could call mark_present directly'; end if;
  perform pg_temp.pass('players cannot award XP or attendance directly');
end $$;
reset role;

-- 10. No XP was ever awarded twice for the same thing ----------------------------------------------
do $$
begin
  if exists (select 1 from public.xp_event where reason <> 'adjustment'
             group by player_id, reason, source_id having count(*) > 1) then
    raise exception 'FAIL duplicate XP awards';
  end if;
  perform pg_temp.pass('no XP awarded twice for the same thing');
end $$;
reset request.jwt.claim.sub;
