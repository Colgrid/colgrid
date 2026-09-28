-- Rule tests for the Colgrid schema. Run after the migration and seed (see supabase/tests/README.md).
-- Each check raises an exception if a rule is broken; the script prints PASS lines otherwise.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- Test users: Rosa (The Night Owls, tournament), Sam (Salt Flats Syndicate), Grace (Liberty Loopers, casual), a GM.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'rosa.delgado@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'grace.liu@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'gm@example.com');
update public.player set user_id = '00000000-0000-0000-0000-00000000000a' where email = 'rosa.delgado@example.com';
update public.player set user_id = '00000000-0000-0000-0000-00000000000b' where email = 'grace.liu@example.com';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000000c', 'gm');

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- 1. New teams are casual by default -----------------------------------------------------------
do $$
declare v public.play_mode;
begin
  insert into public.team (season_id, name) select id, 'Test Default Team' from public.season where number = 1
  returning mode into v;
  if v <> 'casual' then raise exception 'FAIL new team mode is %', v; end if;
  perform pg_temp.pass('new teams start casual');
  delete from public.team where name = 'Test Default Team';
end $$;

-- 2. Tournament opt-in refused after Session 02 started; dropping to casual allowed --------------
do $$
declare ok boolean := false;
begin
  begin
    update public.team set mode = 'tournament' where name = 'Liberty Loopers';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FAIL casual team opted into tournament after Session 02 started'; end if;
  perform pg_temp.pass('tournament opt-in refused once Session 02 has started');

  update public.team set mode = 'casual' where name = 'Brine Shrimp Society';
  if (select mode from public.team where name = 'Brine Shrimp Society') <> 'casual' then
    raise exception 'FAIL could not drop back to casual';
  end if;
  perform pg_temp.pass('tournament team can drop back to casual any time');

  ok := false;
  begin
    update public.team set mode = 'tournament' where name = 'Brine Shrimp Society';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FAIL team rejoined tournament after lock'; end if;
  perform pg_temp.pass('a team that dropped out cannot rejoin after the lock');
  -- restore for later checks (bypass by temporarily reopening is not possible by design; recreate state)
end $$;

-- 3. XP and badges are append-only -------------------------------------------------------------
do $$
declare ok boolean;
begin
  ok := false;
  begin update public.xp_event set amount = 1 where id = (select min(id) from public.xp_event);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL xp_event was editable'; end if;

  ok := false;
  begin delete from public.xp_event where id = (select min(id) from public.xp_event);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL xp_event was deletable'; end if;

  ok := false;
  begin insert into public.xp_event (player_id, amount, reason) select id, -10, 'adjustment' from public.player limit 1;
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FAIL negative XP was accepted'; end if;

  ok := false;
  begin delete from public.player_badge where true;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL badge was removable'; end if;
  perform pg_temp.pass('XP cannot be edited, deleted or negative; badges cannot be removed');
end $$;

-- 4. Casual teams never earn points and never appear in standings -------------------------------
do $$
declare v_points int;
begin
  -- A completion recorded for a casual team never carries points, even if points are sent.
  insert into public.completion (quest_id, team_id, points)
  select q.id, t.id, 40 from public.quest q, public.team t where q.code = 'TAC-7Q2' and t.name = 'Two Tacos Deep'
  returning points into v_points;
  if v_points is not null then raise exception 'FAIL casual completion kept % points', v_points; end if;
  -- (A team that drops to casual keeps earlier points in its history, but is no longer ranked.)
  if exists (select 1 from public.season_standings((select id from public.season where number = 1)) s
             join public.team t on t.id = s.team_id where t.mode = 'casual') then
    raise exception 'FAIL casual team in standings';
  end if;
  perform pg_temp.pass('casual teams carry no points and never appear in standings');
end $$;

-- 5. Quest codes are unique and a quest belongs to one session ----------------------------------
do $$
declare ok boolean := false;
begin
  begin
    insert into public.quest (session_id, title, type, xp, code)
    select id, 'Reused quest', 'puzzle', 25, 'TAC-7Q2' from public.session where number = 3;
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FAIL quest code reused'; end if;
  perform pg_temp.pass('quest codes cannot be reused');
end $$;

-- 6. Row-level security and hidden content, as the signed-in player Rosa --------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare n int; v_hidden_title text; v_loc text;
begin
  select count(*) into n from public.player;
  if n <> 1 then raise exception 'FAIL player sees % player rows (expected only self)', n; end if;
  select count(*) into n from public.team;
  if n <> 1 then raise exception 'FAIL player sees % teams (expected only own)', n; end if;
  select count(*) into n from public.team_member;
  if n <> 5 then raise exception 'FAIL player sees % team members (expected 5)', n; end if;
  select count(*) into n from public.quest;
  if n <> 0 then raise exception 'FAIL player can read quest table directly (codes would leak)'; end if;
  select count(*) into n from public.session;
  if n <> 0 then raise exception 'FAIL player can read session table directly (locations would leak)'; end if;
  perform pg_temp.pass('players see only their own row, team and teammates; no direct quest/session access');

  select title into v_hidden_title from public.player_quests((select id from public.player_sessions((select id from public.season where number = 1)) where number = 2)) where is_hidden;
  if v_hidden_title is not null then raise exception 'FAIL hidden quest title visible before unlock: %', v_hidden_title; end if;
  select start_location into v_loc from public.player_sessions((select id from public.season where number = 1)) where number = 3;
  if v_loc is not null then raise exception 'FAIL Session 03 location visible before reveal'; end if;
  select start_location into v_loc from public.player_sessions((select id from public.season where number = 1)) where number = 2;
  if v_loc is null then raise exception 'FAIL revealed Session 02 location not shown'; end if;
  perform pg_temp.pass('hidden quests and unrevealed locations stay hidden; revealed ones show');

  select count(*) into n from public.xp_event;
  if n = 0 then raise exception 'FAIL player cannot see own XP'; end if;
  if exists (select 1 from public.xp_event x where x.player_id <> public.current_player_id()) then
    raise exception 'FAIL player sees another player''s XP';
  end if;
  perform pg_temp.pass('players see only their own XP');
end $$;

-- 7. Only team members can change their team's mode ---------------------------------------------
do $$
begin
  perform public.set_team_mode((select id from public.team where name = 'The Night Owls'), 'casual');
  if (select mode from public.team where name = 'The Night Owls') <> 'casual' then
    raise exception 'FAIL member could not switch own team to casual';
  end if;
  perform pg_temp.pass('a member can switch their own team to casual');
end $$;
reset role;
select id as night_owls_id from public.team where name = 'The Night Owls' \gset
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select set_config('test.night_owls', :'night_owls_id', false);
do $$
declare ok boolean := false;
begin
  begin
    -- Grace (Liberty Loopers) cannot change The Night Owls, even with its id
    perform public.set_team_mode(current_setting('test.night_owls')::uuid, 'tournament');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL a non-member changed another team''s mode'; end if;
  perform pg_temp.pass('non-members cannot change another team''s mode');
end $$;
reset role;

-- 8. Staff (GM) can read quests and sessions -----------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.quest;
  if n < 18 then raise exception 'FAIL GM sees only % quests', n; end if;
  perform pg_temp.pass('game master can read all quests and codes');
end $$;
reset role;
