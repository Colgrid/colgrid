-- Founding badge for the launch. Run after 20_signin.test.sql (uses its Pilot session ...05f1).
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- Two more seasons exist (like Practice 99 in production): they must not switch Founding off.
insert into public.season (id, chapter_id, number, name)
select '00000000-0000-0000-0000-0000000005e9', id, 99, 'Practice' from public.chapter where number = 1;
insert into public.session (id, season_id, number, neighborhood)
values ('00000000-0000-0000-0000-0000000005f9', '00000000-0000-0000-0000-0000000005e9', 1, 'Practice Run');

insert into public.player (email, name) values ('launch@f.co', 'Launch'), ('practice@f.co', 'Practice'), ('late@f.co', 'Late');
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000005a1', 'launch@f.co', now()),
  ('00000000-0000-0000-0000-0000000005a2', 'practice@f.co', now()),
  ('00000000-0000-0000-0000-0000000005a3', 'late@f.co', now());
insert into public.ticket (session_id, player_id, source)
select '00000000-0000-0000-0000-0000000005f1', id, 'manual' from public.player where email = 'launch@f.co';
insert into public.ticket (session_id, player_id, source)
select '00000000-0000-0000-0000-0000000005f9', id, 'manual' from public.player where email = 'practice@f.co';

create or replace function pg_temp.founder(p_email text) returns boolean language sql as $$
  select exists (select 1 from public.player_badge pb join public.badge b on b.id = pb.badge_id
                 join public.player p on p.id = pb.player_id where p.email = p_email and b.key = 'founding');
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000005a1', false);
select public.claim_my_pass();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000005a2', false);
select public.claim_my_pass();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000005a3', false);
select public.claim_my_pass(); -- signs in before their ticket is imported
reset role;
do $$
begin
  if not pg_temp.founder('launch@f.co') then raise exception 'FAIL launch ticket holder has no Founding badge'; end if;
  if pg_temp.founder('practice@f.co') then raise exception 'FAIL practice-only player got Founding'; end if;
  if pg_temp.founder('late@f.co') then raise exception 'FAIL Founding without a ticket'; end if;
  perform pg_temp.pass('launch ticket holders get Founding at first sign-in, even with other seasons around; practice-only players don''t');
end $$;

-- The ticket arrives after they signed in: the next pass load awards it, once.
insert into public.ticket (session_id, player_id, source)
select '00000000-0000-0000-0000-0000000005f1', id, 'manual' from public.player where email = 'late@f.co';
set role authenticated;
select public.claim_my_pass();
select public.claim_my_pass();
reset role;
reset request.jwt.claim.sub;
do $$
begin
  if not pg_temp.founder('late@f.co') then raise exception 'FAIL late ticket never earned Founding'; end if;
  if (select count(*) from public.player_badge pb join public.badge b on b.id = pb.badge_id
      join public.player p on p.id = pb.player_id where p.email = 'late@f.co' and b.key = 'founding') <> 1 then
    raise exception 'FAIL Founding awarded twice';
  end if;
  perform pg_temp.pass('a ticket imported after sign-in earns Founding on the next pass load, once');
end $$;

-- (Badges are permanent, so these test players stay; their emails don't overlap later tests.)
-- Remove the test sessions (later tests expect one Pilot session). Badges stay: they're permanent.
delete from public.ticket where session_id in ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005f9');
delete from public.session where id in ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005f9');
delete from public.season where id = '00000000-0000-0000-0000-0000000005e9';
