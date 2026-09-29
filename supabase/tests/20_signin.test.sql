-- Sign-in tests: claim_my_pass() links a ticket to an account by email. Run after 10_rules.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.pass(msg text) returns void language plpgsql as $$
begin raise notice 'PASS  %', msg; end $$;

-- A ticket holder who hasn't signed in yet, plus three accounts.
insert into public.player (email, name) values ('new.player@example.com', 'New Player');
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'New.Player@Example.com', now()),   -- same email, different case
  ('00000000-0000-0000-0000-0000000000d2', 'no.ticket@example.com', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'jonah.kim@example.com', null);     -- not confirmed yet

-- 1. First sign-in links the pass and awards the Founding badge --------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$
declare v uuid; v2 uuid;
begin
  v := public.claim_my_pass();
  if v is null then raise exception 'FAIL first sign-in did not link the pass'; end if;
  if v <> (select id from public.player where email = 'new.player@example.com') then
    raise exception 'FAIL linked the wrong player';
  end if;
  if not exists (select 1 from public.player_badge pb join public.badge b on b.id = pb.badge_id
                 where pb.player_id = v and b.key = 'founding') then
    raise exception 'FAIL no Founding badge after first sign-in';
  end if;
  perform pg_temp.pass('first sign-in links the pass by email (any case) and awards Founding');

  v2 := public.claim_my_pass();
  if v2 is distinct from v then raise exception 'FAIL second sign-in changed the pass'; end if;
  perform pg_temp.pass('signing in again keeps the same pass');

  -- The newly linked player can now read their own row through row-level security.
  if (select count(*) from public.player) <> 1 then raise exception 'FAIL player sees other players'; end if;
  perform pg_temp.pass('a signed-in player sees only their own player row');
end $$;

-- 2. No ticket under that email: no pass, nothing created --------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
do $$
begin
  if public.claim_my_pass() is not null then raise exception 'FAIL account without a ticket got a pass'; end if;
  perform pg_temp.pass('an account with no ticket gets no pass');
end $$;

-- 3. Unconfirmed email can't claim a pass --------------------------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d3';
do $$
begin
  if public.claim_my_pass() is not null then raise exception 'FAIL unconfirmed email claimed a pass'; end if;
  perform pg_temp.pass('an unconfirmed email cannot claim a pass');
end $$;
reset role;
do $$ begin
  if (select user_id from public.player where email = 'jonah.kim@example.com') is not null then
    raise exception 'FAIL unconfirmed email was linked';
  end if;
end $$;

-- 4. Signed-out visitors can't call it --------------------------------------------------------
set role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.claim_my_pass();
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FAIL anon could call claim_my_pass'; end if;
  perform pg_temp.pass('signed-out visitors cannot claim a pass');
end $$;
reset role;
reset request.jwt.claim.sub;
