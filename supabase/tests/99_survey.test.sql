-- Built-in survey. Run after 98_start_gps.test.sql (uses its live session c702 and player c2a2).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

insert into public.quest (id, session_id, stop_number, title, type, xp, code)
values ('00000000-0000-0000-0000-00000000c9a1', '00000000-0000-0000-0000-00000000c702', 1, 'The Missing Detail', 'puzzle', 50, 'SV1-AAA'),
       ('00000000-0000-0000-0000-00000000c9a2', '00000000-0000-0000-0000-00000000c702', 2, 'Blind Taste', 'puzzle', 50, 'SV2-AAA');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a2', false);
do $$
declare r jsonb;
begin
  r := public.my_survey('00000000-0000-0000-0000-00000000c702');
  if r->>'status' <> 'ok' or jsonb_array_length(r->'quests') <> 2 or r->'answers' <> 'null'::jsonb then raise exception 'FAIL survey page %', r; end if;
  if public.submit_survey('00000000-0000-0000-0000-00000000c702', '{}') <> 'empty' then raise exception 'FAIL empty survey saved'; end if;
  if public.submit_survey('00000000-0000-0000-0000-00000000c702',
       '{"enjoyed":"5","easy":"9","best_quest_id":"00000000-0000-0000-0000-00000000c9a2","worst_quest_id":"00000000-0000-0000-0000-00000000c701","again":"yes","recommend":"sure","change_one":"  More food  "}') <> 'ok' then
    raise exception 'FAIL survey not saved';
  end if;
  r := public.my_survey('00000000-0000-0000-0000-00000000c702')->'answers';
  if r->>'enjoyed' <> '5' or r->>'easy' is not null or r->>'best_quest_id' <> '00000000-0000-0000-0000-00000000c9a2'
     or r->>'worst_quest_id' is not null or r->>'again' <> 'yes' or r->>'recommend' is not null or r->>'change_one' <> 'More food' then
    raise exception 'FAIL answers %', r;
  end if;
  -- Answering again updates the same row.
  perform public.submit_survey('00000000-0000-0000-0000-00000000c702', '{"enjoyed":"4","comment":"Great night"}');
  if exists (select 1 from public.survey_response) then raise exception 'FAIL players can read survey results'; end if;
  perform pg_temp.pass('players who came can answer, change their answers, and only known values are kept');
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c1a1', false);
do $$
begin
  if public.my_survey('00000000-0000-0000-0000-00000000c702')->>'status' <> 'not_attended' then raise exception 'FAIL non-attendee sees survey'; end if;
  if public.submit_survey('00000000-0000-0000-0000-00000000c702', '{"enjoyed":"1"}') <> 'not_attended' then raise exception 'FAIL non-attendee answered'; end if;
  perform pg_temp.pass('only players who checked in can answer');
end $$;
reset role;
reset request.jwt.claim.sub;
do $$
begin
  if (select count(*) from public.survey_response) <> 1 or (select enjoyed from public.survey_response) <> 4
     or (select comment from public.survey_response) <> 'Great night' then
    raise exception 'FAIL expected one updated response';
  end if;
  perform pg_temp.pass('one response per player per session; admins can read it');
end $$;
