-- Team screen tests (step 4). Run after 60_add_player.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

set role authenticated;
-- Sam (Salt Flats Syndicate, Season 1), from the check-in tests.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare r jsonb; s2 jsonb;
begin
  r := public.my_team((select id from public.season where number = 1));
  if r->>'name' <> 'Salt Flats Syndicate' then raise exception 'FAIL wrong team %', r->>'name'; end if;
  if jsonb_array_length(r->'members') <> 6 then raise exception 'FAIL members %', r->'members'; end if;
  if (r->'members'->0->>'is_me')::boolean is not true then raise exception 'FAIL "you" should come first'; end if;
  if r::text ~* '@' then raise exception 'FAIL an email address leaked into the team roster'; end if;
  if (r->>'opt_in_closed')::boolean is not true then raise exception 'FAIL opt-in should be closed after Session 02 started'; end if;
  select h into s2 from jsonb_array_elements(r->'history') h where (h->>'number')::int = 2;
  if (s2->>'quests_done')::int <> 3 or (s2->>'quests_total')::int <> 3 or (s2->>'hidden_found')::int <> 1 then
    raise exception 'FAIL session 2 history %', s2;
  end if;
  perform pg_temp.pass('the team screen shows teammates (no emails), you first, and what the team did each session');
end $$;

-- A player with no team this season sees nothing; signed-out visitors can't call it.
do $$
begin
  if public.my_team((select id from public.season where number = 0)) is not null then
    raise exception 'FAIL Sam has no pilot team';
  end if;
  perform pg_temp.pass('no team this season, no roster');
end $$;
reset role;
set role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.my_team((select id from public.season where number = 1));
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL anon could read a roster'; end if;
  perform pg_temp.pass('signed-out visitors cannot read rosters');
end $$;
reset role;
reset request.jwt.claim.sub;
