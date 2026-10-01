-- Share counts. Run after 96_location.test.sql (uses its players).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', false);
do $$
begin
  perform public.log_share('mission', 'opened');
  perform public.log_share('mission', 'shared');
  perform public.log_share('mission', 'posted-to-everyone'); -- not an action: ignored
  perform public.log_share('feed', 'shared');                -- not a kind: ignored
  if exists (select 1 from public.share_event) then raise exception 'FAIL players can read share counts'; end if;
  perform pg_temp.pass('players can log their own shares but cannot read anyone''s');
end $$;
reset role;
do $$
begin
  if (select count(*) from public.share_event) <> 2 then raise exception 'FAIL expected 2 share events, got %', (select count(*) from public.share_event); end if;
  perform pg_temp.pass('only known kinds and actions are counted');
end $$;
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.log_share('mission', 'shared'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL visitors can log shares'; end if;
  perform pg_temp.pass('signed-out visitors cannot log shares');
end $$;
reset role;
reset request.jwt.claim.sub;
delete from public.share_event;
