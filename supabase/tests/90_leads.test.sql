-- Lead form tests. Run after 80_auto_reveal.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

set role anon;
do $$
declare ok boolean := false;
begin
  if public.submit_lead('corporate', 'Dana Reyes', ' Dana@Acme.co ', 'Acme', null, 28, 'Late October', 'Team offsite') <> 'ok' then raise exception 'FAIL corporate lead'; end if;
  if public.submit_lead('host', 'Lee Park', 'lee@kiln.shop', 'Kiln & Co', '801-555-0100', 99, null, 'Pottery mission') <> 'ok' then raise exception 'FAIL host lead'; end if;
  if public.submit_lead('corporate', 'Dana Reyes', 'dana@acme.co', 'Acme', null, 28, null, null) <> 'duplicate' then raise exception 'FAIL double submit accepted'; end if;
  if public.submit_lead('corporate', 'X', 'not-an-email', null, null, null, null, null) <> 'invalid' then raise exception 'FAIL bad email accepted'; end if;
  if public.submit_lead('vendor', 'X', 'x@y.co', null, null, null, null, null) <> 'invalid' then raise exception 'FAIL unknown form accepted'; end if;
  if public.submit_lead('contact', 'Ana', 'ana@x.co', null, null, null, null, 'Is there parking?') <> 'ok' then raise exception 'FAIL contact form'; end if;
  if public.submit_lead('contact', 'Ana', 'ana2@x.co', null, null, null, null, '  ') <> 'invalid' then raise exception 'FAIL empty contact message accepted'; end if;
  begin perform 1 from public.lead; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL visitors can read leads'; end if;
  perform pg_temp.pass('anyone can send the corporate, host or contact form; double-submits and bad emails are refused; visitors cannot read leads');
end $$;
reset role;

do $$
begin
  if (select email from public.lead where kind = 'corporate') <> 'dana@acme.co' then raise exception 'FAIL email not cleaned'; end if;
  if (select group_size from public.lead where kind = 'host') is not null then raise exception 'FAIL host lead kept a group size'; end if;
  perform pg_temp.pass('emails are cleaned up; hosts have no group size');
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$
begin
  if exists (select 1 from public.lead) then raise exception 'FAIL a player can read leads'; end if;
  perform pg_temp.pass('players cannot read leads');
end $$;
reset role;
reset request.jwt.claim.sub;
delete from public.lead;
