-- Add-a-player tests. Run after 50_gm.test.sql (uses its game master and a new pilot session).
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

insert into public.session (season_id, number, neighborhood, starts_at)
select id, 2, '9th & 9th', now() + interval '20 days' from public.season where number = 0;
select id as s2 from public.session where season_id = (select id from public.season where number = 0) and number = 2 \gset
select set_config('test.s2', :'s2', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false); -- game master

do $$
declare r jsonb;
begin
  r := public.add_player(current_setting('test.s2')::uuid, 'Walk.In@Example.com', 'Walk In', 'with my coworkers');
  if r->>'status' <> 'added' or (r->>'new_player')::boolean is not true then raise exception 'FAIL add new player %', r; end if;
  r := public.add_player(current_setting('test.s2')::uuid, 'walk.in@example.com', 'Someone Else', null);
  if r->>'status' <> 'already' then raise exception 'FAIL adding twice %', r; end if;
  r := public.add_player(current_setting('test.s2')::uuid, 'rosa.delgado@example.com', '', null);
  if r->>'status' <> 'added' or (r->>'new_player')::boolean then raise exception 'FAIL existing player %', r; end if;
  r := public.add_player(current_setting('test.s2')::uuid, 'nope', 'Bad', null);
  if r->>'status' <> 'bad_email' then raise exception 'FAIL bad email %', r; end if;
  perform pg_temp.pass('the crew can add a player by hand; no duplicates, existing players reused');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); -- a player
do $$
declare ok boolean := false;
begin
  begin
    perform public.add_player(current_setting('test.s2')::uuid, 'friend@example.com', 'Friend', null);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL a player could add players'; end if;
  perform pg_temp.pass('players cannot add players');
end $$;
reset role;
reset request.jwt.claim.sub;

do $$
begin
  if (select coming_with from public.player where email = 'walk.in@example.com') <> 'coworkers' then
    raise exception 'FAIL coming_with not saved';
  end if;
  if (select source from public.ticket t join public.player p on p.id = t.player_id
      where p.email = 'walk.in@example.com') <> 'manual' then
    raise exception 'FAIL ticket source';
  end if;
  perform pg_temp.pass('hand-added tickets are marked manual and keep the "coming with" answer');
end $$;
