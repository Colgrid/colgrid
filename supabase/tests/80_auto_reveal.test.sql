-- Automatic reveal email tests. Run after 70_team.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A fresh upcoming session in Season 1 whose location revealed a minute ago, with one ticket.
insert into public.session (id, season_id, number, neighborhood, starts_at, start_location, revealed_at, status)
select '00000000-0000-0000-0000-00000000a801', id, 9, 'Central 9th', now() + interval '2 days',
       'The mural on 900 S', now() - interval '1 minute', 'scheduled'
from public.season where number = 1;
insert into public.ticket (session_id, player_id)
select '00000000-0000-0000-0000-00000000a801', id from public.player order by name limit 1;
-- And one whose reveal is still in the future.
insert into public.session (id, season_id, number, neighborhood, starts_at, start_location, revealed_at, status)
select '00000000-0000-0000-0000-00000000a802', id, 10, 'Sugar House', now() + interval '9 days',
       'Secret', now() + interval '7 days', 'scheduled'
from public.season where number = 1;

set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.cron_due_reveals('wrong'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL a wrong secret was accepted'; end if;
  ok := false;
  begin perform public.cron_due_reveals(null); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL an empty secret was accepted'; end if;
  ok := false;
  begin perform 1 from private.app_secret; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL anon could read the secret'; end if;
  perform pg_temp.pass('without the secret, nobody can trigger reveals or read the guest list');
end $$;
reset role;

do $$
declare s text := (select value from private.app_secret where name = 'cron'); r jsonb; r2 jsonb;
begin
  set local role anon;
  r := public.cron_due_reveals(s);
  if jsonb_array_length(r) <> 1 or r->0->>'id' <> '00000000-0000-0000-0000-00000000a801' then
    raise exception 'FAIL expected only the just-revealed session, got %', r;
  end if;
  if jsonb_array_length(r->0->'recipients') <> 1 or r->0->>'start_location' <> 'The mural on 900 S' then
    raise exception 'FAIL recipients/location %', r;
  end if;
  r2 := public.cron_due_reveals(s);
  if jsonb_array_length(r2) <> 0 then raise exception 'FAIL the same session was handed out twice'; end if;
  perform public.cron_reveal_failed(s, '00000000-0000-0000-0000-00000000a801');
  r2 := public.cron_due_reveals(s);
  if jsonb_array_length(r2) <> 1 then raise exception 'FAIL a failed send was not retried'; end if;
  reset role;
  perform pg_temp.pass('each revealed session is emailed once, future reveals wait, failed sends retry');
end $$;

delete from public.ticket where session_id in ('00000000-0000-0000-0000-00000000a801', '00000000-0000-0000-0000-00000000a802');
delete from public.session where id in ('00000000-0000-0000-0000-00000000a801', '00000000-0000-0000-0000-00000000a802');
