-- Admin and import tests (step 6). Run after 30_checkin.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- An admin account, and the pilot season's first session.
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000f1', 'owner@example.com', now());
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000f1', 'admin');

do $$
begin
  if not exists (select 1 from public.season where number = 0 and name = 'Pilot') then
    raise exception 'FAIL pilot season was not created';
  end if;
  perform pg_temp.pass('Chapter 01 has a Pilot season (Season 00)');
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
insert into public.session (season_id, number, neighborhood, starts_at)
select id, 1, '9th & 9th', now() + interval '14 days' from public.season where number = 0;
select id as pilot_session from public.session where season_id = (select id from public.season where number = 0) \gset
select set_config('test.pilot_session', :'pilot_session', false);

-- 1. Quest codes are generated in the right format -------------------------------------------------
do $$
declare v text;
begin
  insert into public.quest (session_id, title, type, xp)
  values (current_setting('test.pilot_session')::uuid, 'Pilot test quest', 'tasting', 25)
  returning code into v;
  if v !~ '^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$' then raise exception 'FAIL generated code %', v; end if;
  perform pg_temp.pass('new quests get a code automatically, with no look-alike characters');
end $$;

-- 2. Import: new players, existing players, bad rows, duplicates, the ticket question -------------
do $$
declare r jsonb;
begin
  r := public.import_players(current_setting('test.pilot_session')::uuid, '[
    {"email": "New.Buyer@Example.com", "name": "New Buyer", "coming_with": "Just me", "order_ref": "1001"},
    {"email": "ROSA.DELGADO@example.com", "name": "Rosa D", "coming_with": "My coworkers", "order_ref": "1002"},
    {"email": "not-an-email", "name": "Broken Row"},
    {"email": "new.buyer@example.com", "name": "Same Person Again", "order_ref": "1001"},
    {"email": "pair.one@example.com", "name": "", "coming_with": "Partner", "order_ref": "1003"}
  ]'::jsonb);
  if (r->>'players_created')::int <> 2 then raise exception 'FAIL created %', r; end if;
  if (r->>'players_existing')::int <> 2 then raise exception 'FAIL existing %', r; end if;
  if (r->>'tickets_added')::int <> 3 then raise exception 'FAIL tickets added %', r; end if;
  if (r->>'tickets_existing')::int <> 1 then raise exception 'FAIL duplicate ticket %', r; end if;
  if jsonb_array_length(r->'skipped') <> 1 then raise exception 'FAIL skipped %', r; end if;
  perform pg_temp.pass('import creates players by email, never duplicates, and reports bad rows');

  if (select coming_with from public.player where email = 'new.buyer@example.com') <> 'solo' then
    raise exception 'FAIL "Just me" not saved as solo';
  end if;
  if (select name from public.player where email = 'rosa.delgado@example.com') <> 'Rosa Delgado' then
    raise exception 'FAIL import overwrote an existing name';
  end if;
  if (select name from public.player where email = 'pair.one@example.com') <> 'pair.one' then
    raise exception 'FAIL blank name not filled from email';
  end if;
  perform pg_temp.pass('the ticket question is normalized; existing names are kept');

  r := public.import_players(current_setting('test.pilot_session')::uuid,
    '[{"email": "new.buyer@example.com"}, {"email": "pair.one@example.com"}]'::jsonb);
  if (r->>'players_created')::int <> 0 or (r->>'tickets_added')::int <> 0 then raise exception 'FAIL re-import %', r; end if;
  perform pg_temp.pass('importing the same file again changes nothing');
end $$;

-- 3. Only admins can import or write tickets ------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare ok boolean := false; n int;
begin
  begin
    perform public.import_players(current_setting('test.pilot_session')::uuid, '[{"email": "sneaky@example.com"}]'::jsonb);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could import players'; end if;

  ok := false;
  begin
    insert into public.ticket (session_id, player_id) values (current_setting('test.pilot_session')::uuid, public.current_player_id());
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could give themselves a ticket'; end if;

  select count(*) into n from public.ticket;
  if n <> 1 then raise exception 'FAIL player sees % tickets (expected only their own)', n; end if;
  perform pg_temp.pass('only admins import or write tickets; players see only their own');
end $$;
reset role;
reset request.jwt.claim.sub;
