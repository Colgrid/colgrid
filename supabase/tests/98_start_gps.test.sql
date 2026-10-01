-- Check in at the start by GPS. Run after 97_share.test.sql (uses the guided test players).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A second session for the guided test season, revealed, starting in 10 minutes, start pin at the whale.
insert into public.session (id, season_id, number, neighborhood, starts_at, start_location, revealed_at, start_lat, start_lng, start_radius_m)
values ('00000000-0000-0000-0000-00000000c702', '00000000-0000-0000-0000-00000000c700', 2, '9th & 9th', now() + interval '10 minutes',
        'The whale sculpture', now() - interval '1 hour', 40.7503, -111.8650, 60);
insert into public.session (id, season_id, number, neighborhood, starts_at, start_location, revealed_at, start_lat, start_lng)
values ('00000000-0000-0000-0000-00000000c703', '00000000-0000-0000-0000-00000000c700', 3, 'Sugar House', now() + interval '10 minutes',
        'Secret', now() + interval '1 day', 40.72, -111.85);
insert into public.ticket (session_id, player_id, source)
values ('00000000-0000-0000-0000-00000000c702', '00000000-0000-0000-0000-00000000c2a2', 'manual');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a2', false);
do $$
declare r jsonb;
begin
  if public.arrive_here('00000000-0000-0000-0000-00000000c703', 40.72, -111.85, 10)->>'status' <> 'not_revealed' then raise exception 'FAIL unrevealed start'; end if;
  if public.arrive_here('00000000-0000-0000-0000-00000000c702', null, null, null)->>'status' <> 'need_location' then raise exception 'FAIL no location'; end if;
  r := public.arrive_here('00000000-0000-0000-0000-00000000c702', 40.7463, -111.8650, 10);
  if r->>'status' <> 'too_far' then raise exception 'FAIL too far %', r; end if;
  r := public.arrive_here('00000000-0000-0000-0000-00000000c702', 40.75055, -111.8650, 12);
  if r->>'status' <> 'arrived' or r->>'team_name' <> 'Team A' then raise exception 'FAIL arrive at the pin %', r; end if;
  if (select status from public.session where id = '00000000-0000-0000-0000-00000000c702') <> 'live' then raise exception 'FAIL session not started'; end if;
  perform pg_temp.pass('GPS start: hidden until revealed, must be within the radius, then checks in and starts the session');
end $$;
reset role;
reset request.jwt.claim.sub;
