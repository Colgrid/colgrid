-- Open routes (self-guided test). Run after 99_survey.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- An Open Play season: Route 01 open for a week (3 answer stops), Route 02 not opened yet.
insert into public.season (id, chapter_id, number, name)
select '00000000-0000-0000-0000-00000000d000', id, 8, 'Open Play' from public.chapter where number = 1;
insert into public.session (id, season_id, number, neighborhood, status, route_name, slug, open_until) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d000', 1, '9th & 9th', 'live', 'Route 01', 'route-01', now() + interval '7 days'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000d000', 2, '9th & 9th', 'scheduled', 'Route 02', 'route-02', now() + interval '14 days');
insert into public.quest (id, session_id, stop_number, title, type, xp, code, where_text, hours_text, answer, lat, lng) values
  ('00000000-0000-0000-0000-00000000d0a1', '00000000-0000-0000-0000-00000000d001', 1, 'The mural', 'puzzle', 25, 'ORA-111', 'Mural on 9th', 'Any time', 'whale', 40.75, -111.86),
  ('00000000-0000-0000-0000-00000000d0a2', '00000000-0000-0000-0000-00000000d001', 2, 'The bakery', 'tasting', 25, 'ORB-111', 'Bakery', 'Tue–Sat 8–4', 'rye', null, null),
  ('00000000-0000-0000-0000-00000000d0a3', '00000000-0000-0000-0000-00000000d001', 3, 'The shop', 'discovery', 25, 'ORC-111', 'Shop', null, 'blue', null, null),
  ('00000000-0000-0000-0000-00000000d0a9', '00000000-0000-0000-0000-00000000d001', null, 'Secret', 'discovery', 30, 'ORH-111', 'Hidden', null, 'x', null, null);
update public.quest set is_hidden = true where id = '00000000-0000-0000-0000-00000000d0a9';
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000d1a1', 'mia@o.co', now()),
  ('00000000-0000-0000-0000-00000000d1a2', 'ben@o.co', now()),
  ('00000000-0000-0000-0000-00000000d1a3', 'zoe@o.co', now());

set role anon;
do $$
declare r jsonb;
begin
  r := public.open_route('ROUTE-01');
  if r->>'status' <> 'ok' or jsonb_array_length(r->'stops') <> 3 or (r->>'has_pass')::boolean then raise exception 'FAIL route page %', r; end if;
  if r::text like '%whale%' or r::text like '%ORA-111%' or r::text like '%Secret%' then raise exception 'FAIL route page leaks answers, codes or hidden quests'; end if;
  if r->'stops'->1->>'hours' <> 'Tue–Sat 8–4' then raise exception 'FAIL hours %', r; end if;
  if public.open_route('route-02')->>'status' <> 'not_open' then raise exception 'FAIL unopened route'; end if;
  if public.open_route('nope')->>'status' <> 'not_found' then raise exception 'FAIL unknown route'; end if;
  if (select count(*) from public.open_routes()) <> 1 then raise exception 'FAIL open routes list'; end if;
  perform pg_temp.pass('anyone can see an open route: name, stops, hours; never answers, codes or hidden quests');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d1a1', false);
do $$
declare r jsonb; v uuid;
begin
  if public.join_colgrid('  ', '00000000-0000-0000-0000-00000000d001') is not null then raise exception 'FAIL sign-up without a name'; end if;
  v := public.join_colgrid('Mia', '00000000-0000-0000-0000-00000000d001');
  if v is null or public.join_colgrid('Someone else') <> v then raise exception 'FAIL sign-up'; end if;
  if public.start_route('00000000-0000-0000-0000-00000000d002', 'X')->>'status' <> 'not_open' then raise exception 'FAIL started an unopened route'; end if;
  if public.start_route('00000000-0000-0000-0000-00000000d001', '')->>'status' <> 'need_name' then raise exception 'FAIL team needs a name'; end if;
  r := public.start_route('00000000-0000-0000-0000-00000000d001', ' Night   Owls ');
  if r->>'status' <> 'ok' or r->>'team_name' <> 'Night Owls' or length(r->>'invite') <> 10 then raise exception 'FAIL start %', r; end if;
  if public.start_route('00000000-0000-0000-0000-00000000d001', 'Other')->>'invite' <> r->>'invite' then raise exception 'FAIL second start made a new team'; end if;
  if public.my_route() <> '00000000-0000-0000-0000-00000000d001' then raise exception 'FAIL my route'; end if;
  r := public.my_guided('00000000-0000-0000-0000-00000000d001');
  if not (r->>'open_route')::boolean or (r->>'arrived')::boolean or r->>'invite' is null or r->>'route_name' <> 'Route 01' then raise exception 'FAIL my_guided %', r; end if;
  perform public.log_play('invite_sent', '00000000-0000-0000-0000-00000000d001');
  perform public.log_play('quest_start', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d0a1');
  perform public.log_play('quest_start', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d0a1');
  perform public.log_play('quest_start', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d0a9'); -- hidden: ignored
  perform public.log_play('install_shown', '00000000-0000-0000-0000-00000000d001');
  perform public.log_play('cheat', '00000000-0000-0000-0000-00000000d001');
  if exists (select 1 from public.play_event) or exists (select 1 from public.team_invite) then raise exception 'FAIL players can read counts or invites'; end if;
  perform pg_temp.pass('sign up without a ticket, name a team, get an invite link; the pass knows the route');
end $$;

-- Mia plays stop 1 (location + answer) and stop 2: the first stop marks her present (+50), +25 each.
do $$
declare r jsonb;
begin
  r := public.complete_mission('00000000-0000-0000-0000-00000000d0a1', 'Whale', 40.75, -111.86, 10);
  if r->>'status' <> 'ok' then raise exception 'FAIL stop 1 %', r; end if;
  r := public.complete_mission('00000000-0000-0000-0000-00000000d0a2', 'rye', null, null, null);
  if r->>'status' <> 'ok' or (r->>'xp_after')::int <> 100 then raise exception 'FAIL stop 2 %', r; end if;
  perform pg_temp.pass('no host, no start pin: the first finished stop starts the route (+50), 25 XP per stop, Level 2 at 100');
end $$;

-- Ben signs up through Mia's link and joins her team (not some other team).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d1a2', false);
do $$
declare r jsonb; v_token text;
begin
  perform public.join_colgrid('Ben');
  select token into v_token from public.team_invite;
  if v_token is not null then raise exception 'FAIL players can read invite tokens'; end if;
end $$;
reset role;
select set_config('test.token', (select token from public.team_invite limit 1), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.team_invite_info(upper(current_setting('test.token')));
  if r->>'status' <> 'ok' or r->>'team_name' <> 'Night Owls' or (r->>'is_member')::boolean then raise exception 'FAIL invite info %', r; end if;
  if public.start_route('00000000-0000-0000-0000-00000000d001', 'night owls')->>'status' <> 'name_taken' then raise exception 'FAIL duplicate team name'; end if;
  r := public.join_team(current_setting('test.token'));
  if r->>'status' <> 'ok' or r->>'slug' <> 'route-01' then raise exception 'FAIL join %', r; end if;
  perform public.join_team(current_setting('test.token'));
  -- Ben finishes stop 3 at the shop: he's marked present and catches up on the whole team's route.
  r := public.complete_mission('00000000-0000-0000-0000-00000000d0a3', 'BLUE', null, null, null);
  if r->>'status' <> 'ok' or (r->>'xp_after')::int <> 50 + 75 + 20 then raise exception 'FAIL Ben catch-up %', r; end if;
  if public.my_route() <> '00000000-0000-0000-0000-00000000d001' then raise exception 'FAIL Ben route'; end if;
  if not (select my_done from public.open_routes() where slug = 'route-01') then raise exception 'FAIL route done'; end if;
  perform pg_temp.pass('friends join through the link, play on the same team, catch up; finishing every stop adds +20 each');
end $$;

-- The pass season: an open-route team shows that season, but on a gathering night a ticket wins.
do $$
begin
  if public.my_pass_season() <> '00000000-0000-0000-0000-00000000d000' then raise exception 'FAIL pass season for a route player'; end if;
end $$;
reset role;
insert into public.ticket (session_id, player_id, source)
select '00000000-0000-0000-0000-00000000c702', id, 'manual' from public.player where email = 'ben@o.co';
set role authenticated;
do $$
begin
  if (select status from public.player_sessions('00000000-0000-0000-0000-00000000c700') where number = 2) <> 'live' then raise exception 'FAIL setup: gathering not live'; end if;
  if public.my_pass_season() <> '00000000-0000-0000-0000-00000000c700' then raise exception 'FAIL a live gathering with a ticket should show on the pass'; end if;
  perform pg_temp.pass('the pass shows tonight''s gathering for ticket holders, else the latest team''s season');
end $$;

-- Zoe made her own team and played a stop: an invite can't move her (her progress stays with her team).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d1a3', false);
do $$
declare r jsonb;
begin
  perform public.join_colgrid('Zoe');
  perform public.start_route('00000000-0000-0000-0000-00000000d001', 'Zoe Squad');
  perform public.complete_mission('00000000-0000-0000-0000-00000000d0a2', 'rye', null, null, null);
  r := public.join_team(current_setting('test.token'));
  if r->>'status' <> 'on_other_team' or r->>'team_name' <> 'Zoe Squad' then raise exception 'FAIL moved a player who already played %', r; end if;
  perform pg_temp.pass('nobody is moved off a team they already played with, and nobody is put on a stranger''s team');
end $$;
reset role;
reset request.jwt.claim.sub;

do $$
declare n int;
begin
  if (select count(*) from public.play_event where kind = 'quest_start') <> 1 then raise exception 'FAIL quest starts deduped'; end if;
  if (select count(*) from public.play_event where kind = 'invite_accepted') <> 1 then raise exception 'FAIL invite accepted once'; end if;
  if (select count(*) from public.play_event where kind = 'signup') <> 3 then raise exception 'FAIL signups'; end if;
  if (select count(*) from public.play_event where kind = 'team_created') <> 2 then raise exception 'FAIL teams created'; end if;
  if (select count(*) from public.play_event where kind = 'route_view' and session_id = '00000000-0000-0000-0000-00000000d001') <> 1 then raise exception 'FAIL route views'; end if;
  if (select count(*) from public.play_event where kind = 'install_shown') <> 1 then raise exception 'FAIL install shown'; end if;
  if exists (select 1 from public.play_event where kind not in ('route_view', 'signup', 'team_created', 'route_start', 'invite_sent', 'quest_start', 'install_shown', 'invite_accepted')) then
    raise exception 'FAIL unknown kinds were logged';
  end if;
  perform pg_temp.pass('counts are recorded once each');
end $$;

-- The window ends: the 5-minute timer closes the route (secret required). No badge, no emails.
update public.session set open_until = now() - interval '1 minute' where id = '00000000-0000-0000-0000-00000000d001';
select set_config('test.secret', (select value from private.app_secret where name = 'cron'), false);
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.cron_close_routes('wrong'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL closed without the secret'; end if;
  if public.cron_close_routes(current_setting('test.secret')) <> 1 then raise exception 'FAIL nothing closed'; end if;
  if public.open_route('route-01', false)->>'status' <> 'closed' then raise exception 'FAIL route page still open'; end if;
end $$;
reset role;
do $$
begin
  if (select status from public.session where id = '00000000-0000-0000-0000-00000000d001') <> 'closed' then raise exception 'FAIL route not closed'; end if;
  if (select count(*) from public.player_badge pb join public.player p on p.id = pb.player_id where p.email like '%@o.co') <> 0 then
    raise exception 'FAIL closing a route awarded a session badge';
  end if;
  perform pg_temp.pass('routes close themselves when the window ends (no badge, no emails)');
end $$;
