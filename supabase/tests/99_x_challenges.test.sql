-- Paid challenges: photo proof, rewards, Outcome Report. Run after 99_w_open_routes.test.sql (uses its season).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A client challenge with two asks: the first needs a photo and carries a $5 sponsored reward.
-- Guaranteed reward: $10 for finishing both asks.
insert into public.session (id, season_id, number, neighborhood, status, route_name, slug, open_until,
                            is_challenge, client_name, client_objective, base_reward_cents)
values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000d000', 9, 'Sugar House', 'live',
        'Safer streets', 'safer-streets', now() + interval '7 days', true, 'Test District', 'Audit crossings', 1000);
insert into public.quest (id, session_id, stop_number, title, type, xp, code, needs_photo, sponsor_name, sponsor_reward_cents) values
  ('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e001', 1, 'Crossing by the school', 'discovery', 25, 'CHA-111', true, 'Corner Cafe', 500),
  ('00000000-0000-0000-0000-00000000e0a2', '00000000-0000-0000-0000-00000000e001', 2, 'Crossing by the park', 'discovery', 25, 'CHB-111', false, null, null);
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000e1a1', 'ana@c.co', now()),
  ('00000000-0000-0000-0000-00000000e1a2', 'raj@c.co', now()),
  ('00000000-0000-0000-0000-00000000e1a3', 'lee@c.co', now()),
  ('00000000-0000-0000-0000-00000000e1a9', 'boss@c.co', now());
insert into public.player (id, user_id, email, name) values
  ('00000000-0000-0000-0000-00000000e2a1', '00000000-0000-0000-0000-00000000e1a1', 'ana@c.co', 'Ana'),
  ('00000000-0000-0000-0000-00000000e2a2', '00000000-0000-0000-0000-00000000e1a2', 'raj@c.co', 'Raj'),
  ('00000000-0000-0000-0000-00000000e2a3', '00000000-0000-0000-0000-00000000e1a3', 'lee@c.co', 'Lee');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000e1a9', 'admin');
insert into public.team (id, season_id, name) values
  ('00000000-0000-0000-0000-00000000e3a1', '00000000-0000-0000-0000-00000000d000', 'Crosswalkers'),
  ('00000000-0000-0000-0000-00000000e3a2', '00000000-0000-0000-0000-00000000d000', 'Solo Lee');
insert into public.team_member (team_id, player_id) values
  ('00000000-0000-0000-0000-00000000e3a1', '00000000-0000-0000-0000-00000000e2a1'),
  ('00000000-0000-0000-0000-00000000e3a1', '00000000-0000-0000-0000-00000000e2a2'),
  ('00000000-0000-0000-0000-00000000e3a2', '00000000-0000-0000-0000-00000000e2a3');
-- Crosswalkers finish both asks; Solo Lee finishes only the first.
insert into public.completion (quest_id, team_id) values
  ('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e3a1'),
  ('00000000-0000-0000-0000-00000000e0a2', '00000000-0000-0000-0000-00000000e3a1'),
  ('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e3a2');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a1', false);
do $$
declare r jsonb; ok boolean := false;
begin
  r := public.submit_photo('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e1a1/00000000-0000-0000-0000-00000000e0a1/a.jpg');
  if r->>'status' <> 'ok' then raise exception 'FAIL photo %', r; end if;
  r := public.submit_photo('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e1a2/00000000-0000-0000-0000-00000000e0a1/a.jpg');
  if r->>'status' <> 'bad_path' then raise exception 'FAIL someone else''s folder %', r; end if;
  r := public.submit_photo('00000000-0000-0000-0000-00000000e0a2', '00000000-0000-0000-0000-00000000e1a1/00000000-0000-0000-0000-00000000e0a2/a.jpg');
  if r->>'status' <> 'not_needed' then raise exception 'FAIL photo on an ask without one %', r; end if;
  if (select count(*) from public.photo_proof) <> 1 then raise exception 'FAIL participant should see own team photo'; end if;
  perform pg_temp.pass('a participant can record a photo in their own folder, only for an ask that needs one');

  begin perform public.award_challenge_rewards('00000000-0000-0000-0000-00000000e001'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL participants can award rewards'; end if;
  ok := false;
  begin perform public.challenge_report('00000000-0000-0000-0000-00000000e001'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL participants can read the report'; end if;
  ok := false;
  begin insert into public.reward (session_id, player_id, kind, amount_cents) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e2a1', 'performance', 99999); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL participants can write rewards'; end if;
  perform pg_temp.pass('participants cannot award rewards, write rewards or read the report');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a3', false);
do $$
begin
  if (select count(*) from public.photo_proof) <> 0 then raise exception 'FAIL another team can see the photo'; end if;
  perform pg_temp.pass('another team cannot see the photo');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a9', false);
do $$
declare n int; r jsonb; v uuid;
begin
  n := public.award_challenge_rewards('00000000-0000-0000-0000-00000000e001');
  -- Guaranteed: Ana and Raj (both asks). Sponsored: Ana, Raj and Lee (first ask).
  if n <> 5 then raise exception 'FAIL expected 5 rewards, got %', n; end if;
  if public.award_challenge_rewards('00000000-0000-0000-0000-00000000e001') <> 0 then raise exception 'FAIL rewards awarded twice'; end if;
  perform pg_temp.pass('rewards: guaranteed for teams that finished, sponsored per ask, never twice');

  perform public.review_photo((select id from public.photo_proof limit 1), true, 'clear');
  select id into v from public.reward where kind = 'guaranteed' and player_id = '00000000-0000-0000-0000-00000000e2a1';
  perform public.set_reward_status(v, 'sent', 'gift card emailed');
  if (select sent_at is null or sent_by is null or status <> 'sent' from public.reward where id = v) then raise exception 'FAIL sent stamp'; end if;
  v := public.add_performance_reward('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e2a2', 2500, 'cash', 'target hit');
  perform pg_temp.pass('an admin can approve a photo, mark a reward sent (stamped) and add a performance share');

  r := public.challenge_report('00000000-0000-0000-0000-00000000e001');
  if (r->>'participants')::int <> 3 or (r->>'teams')::int <> 2 or (r->>'asks')::int <> 2 or (r->>'asks_completed')::int <> 3
     or (r->>'teams_finished_all')::int <> 1 or (r->>'completion_rate')::numeric <> 0.75
     or (r->'photos'->>'approved')::int <> 1 or (r->'rewards'->>'earned_cents')::int <> 6000
     or (r->'rewards'->>'sent_cents')::int <> 1000 or (r->'rewards'->>'people_rewarded')::int <> 3
     or jsonb_array_length(r->'by_ask') <> 2 or (r->'by_ask'->0->>'teams_completed')::int <> 2 then
    raise exception 'FAIL report %', r;
  end if;
  if r::text like '%@c.co%' or r::text like '%Ana%' then raise exception 'FAIL report leaks names or emails'; end if;
  perform pg_temp.pass('the Outcome Report adds up and carries no names or emails');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a3', false);
do $$
begin
  if (select count(*) from public.reward) <> 1 then raise exception 'FAIL a participant should see only their own reward, saw %', (select count(*) from public.reward); end if;
  perform pg_temp.pass('a participant sees only their own rewards');
end $$;
reset role;

set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.submit_photo('00000000-0000-0000-0000-00000000e0a1', 'x'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL visitors can submit photos'; end if;
  perform pg_temp.pass('signed-out visitors cannot submit photos');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e1a1', false);
do $$
declare r record;
begin
  select * into r from public.my_photo_asks('00000000-0000-0000-0000-00000000e001');
  if r.quest_id <> '00000000-0000-0000-0000-00000000e0a1' or r.photos <> 1 or r.approved <> 1 then raise exception 'FAIL photo asks %', r; end if;
  if (select count(*) from public.my_photo_asks('00000000-0000-0000-0000-00000000e001')) <> 1 then raise exception 'FAIL only asks that need a photo'; end if;
  perform pg_temp.pass('the pass knows which asks need a photo and how many the team sent');
end $$;
reset role;
