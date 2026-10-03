-- Colgrid: paid challenges. Photo proof, rewards and their fulfilment, the Outcome Report, and
-- what marks a client's challenge apart from the older test routes.
-- Run after 20261001000019_founding_inactive.sql. Safe to re-run.
--
-- Nothing here changes how check-ins, XP or the pass work today: it only adds columns, three tables,
-- one private storage bucket and new functions. Existing functions are left untouched.
--
-- Words: the app says "challenge" and "ask". In the database a challenge is still a `session` with a
-- route (slug + open_until) and an ask is still a `quest`; renaming tables would touch every function.

------------------------------------------------------------------------------------------------
-- 1. Challenge management: what a client's challenge adds to a route
------------------------------------------------------------------------------------------------
-- is_challenge separates client challenges from the older test routes. Open and closed are unchanged:
-- a challenge is open while status = 'live' and open_until is in the future (route_is_open).
alter table public.session add column if not exists is_challenge boolean not null default false;
alter table public.session add column if not exists client_name text check (char_length(client_name) <= 120);
alter table public.session add column if not exists client_objective text check (char_length(client_objective) <= 500);
-- The guaranteed reward: how much (cents), in what form, and how many asks a team must finish to earn it
-- (null = every main ask). 0 cents = no guaranteed reward on this challenge.
alter table public.session add column if not exists base_reward_cents int not null default 0 check (base_reward_cents between 0 and 50000);
alter table public.session add column if not exists base_reward_form text not null default 'gift_card' check (base_reward_form in ('gift_card', 'cash'));
alter table public.session add column if not exists base_reward_min_asks int check (base_reward_min_asks is null or base_reward_min_asks > 0);

-- Per ask: does it need a photo, and is a business paying a reward for it?
alter table public.quest add column if not exists needs_photo boolean not null default false;
alter table public.quest add column if not exists sponsor_name text check (char_length(sponsor_name) <= 120);
alter table public.quest add column if not exists sponsor_reward_cents int check (sponsor_reward_cents is null or sponsor_reward_cents between 1 and 50000);

------------------------------------------------------------------------------------------------
-- 2. Photo proof
------------------------------------------------------------------------------------------------
-- One row per photo a participant sends for an ask. The image itself lives in the private storage
-- bucket "proof" at <user id>/<quest id>/<file name>; this table holds the path and the review.
create table if not exists public.photo_proof (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quest (id) on delete restrict,
  team_id uuid not null references public.team (id) on delete restrict,
  player_id uuid not null references public.player (id) on delete restrict,
  storage_path text not null unique check (char_length(storage_path) between 10 and 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text check (char_length(review_note) <= 300),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists photo_proof_quest_idx on public.photo_proof (quest_id, status);
create index if not exists photo_proof_team_idx on public.photo_proof (team_id);
alter table public.photo_proof enable row level security;
drop policy if exists "players read own team photos" on public.photo_proof;
create policy "players read own team photos" on public.photo_proof
  for select using (team_id in (select public.my_team_ids()) or public.is_staff());
revoke all on public.photo_proof from public, anon, authenticated;
grant select on public.photo_proof to authenticated; -- own team's rows (or staff), through the policy

-- A participant records a photo they just uploaded. status: ok | no_pass | not_found | not_open |
-- no_team | not_needed | bad_path | too_many
create or replace function public.submit_photo(p_quest_id uuid, p_storage_path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_q public.quest;
  v_s public.session;
  v_team uuid;
  v_path text := btrim(coalesce(p_storage_path, ''));
begin
  if v_player is null then return jsonb_build_object('status', 'no_pass'); end if;
  select * into v_q from public.quest where id = p_quest_id;
  if v_q.id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into v_s from public.session where id = v_q.session_id;
  if v_s.status <> 'live' or (v_s.open_until is not null and v_s.open_until <= now()) then
    return jsonb_build_object('status', 'not_open');
  end if;
  if not v_q.needs_photo then return jsonb_build_object('status', 'not_needed'); end if;
  v_team := public.my_season_team(v_s.season_id);
  if v_team is null then return jsonb_build_object('status', 'no_team'); end if;
  -- The file must sit in the caller's own folder for this ask, so nobody can claim someone else's upload.
  if v_path not like auth.uid()::text || '/' || p_quest_id::text || '/%' or v_path like '%..%' then
    return jsonb_build_object('status', 'bad_path');
  end if;
  if (select count(*) from public.photo_proof where quest_id = p_quest_id and team_id = v_team) >= 10 then
    return jsonb_build_object('status', 'too_many');
  end if;
  insert into public.photo_proof (quest_id, team_id, player_id, storage_path)
  values (p_quest_id, v_team, v_player, v_path)
  on conflict (storage_path) do nothing;
  return jsonb_build_object('status', 'ok');
end;
$$;
revoke all on function public.submit_photo(uuid, text) from public, anon;
grant execute on function public.submit_photo(uuid, text) to authenticated;

-- Staff approve or reject a photo.
create or replace function public.review_photo(p_photo_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  update public.photo_proof
     set status = case when p_approve then 'approved' else 'rejected' end,
         review_note = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_photo_id;
end;
$$;
revoke all on function public.review_photo(uuid, boolean, text) from public, anon;
grant execute on function public.review_photo(uuid, boolean, text) to authenticated;

-- The private bucket and who may use it. Supabase only (plain Postgres in local tests has no storage).
do $storage$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('proof', 'proof', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    on conflict (id) do nothing;

    execute 'drop policy if exists "participants upload own proof" on storage.objects';
    execute $p$create policy "participants upload own proof" on storage.objects for insert to authenticated
             with check (bucket_id = 'proof' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute 'drop policy if exists "participants and staff read proof" on storage.objects';
    execute $p$create policy "participants and staff read proof" on storage.objects for select to authenticated
             using (bucket_id = 'proof' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()))$p$;
  end if;
end
$storage$;

------------------------------------------------------------------------------------------------
-- 3. Rewards and fulfilment
------------------------------------------------------------------------------------------------
-- One row per reward a participant has earned. Money is sent outside the app (gift cards at first);
-- this is the record of what is owed, what was sent and when.
--   guaranteed  = finished the base set of asks on a challenge
--   sponsored   = finished an ask a business pays a reward for
--   performance = a share of the client's bonus when the challenge hit its target (added by an admin)
create table if not exists public.reward (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.session (id) on delete restrict,
  player_id uuid not null references public.player (id) on delete restrict,
  team_id uuid references public.team (id) on delete set null,
  quest_id uuid references public.quest (id) on delete restrict,   -- sponsored rewards only
  kind text not null check (kind in ('guaranteed', 'sponsored', 'performance')),
  amount_cents int not null check (amount_cents > 0),
  form text not null default 'gift_card' check (form in ('gift_card', 'cash')),
  status text not null default 'earned' check (status in ('earned', 'sent', 'claimed', 'void')),
  note text check (char_length(note) <= 300),
  earned_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by uuid references auth.users (id),
  claimed_at timestamptz,
  check ((kind = 'sponsored') = (quest_id is not null))
);
-- A participant earns the guaranteed reward once per challenge and a sponsored reward once per ask.
create unique index if not exists reward_guaranteed_once on public.reward (session_id, player_id) where kind = 'guaranteed';
create unique index if not exists reward_sponsored_once on public.reward (quest_id, player_id) where kind = 'sponsored';
create index if not exists reward_session_idx on public.reward (session_id, status);
create index if not exists reward_player_idx on public.reward (player_id);
alter table public.reward enable row level security;
drop policy if exists "players read own rewards" on public.reward;
create policy "players read own rewards" on public.reward
  for select using (player_id = public.current_player_id() or public.is_staff());
revoke all on public.reward from public, anon, authenticated;
grant select on public.reward to authenticated; -- own rows (or staff), through the policy; changes go through the functions below

-- Work out who has earned what on a challenge and record it. Safe to run again: nobody is paid twice.
-- Teams count as they do for check-ins: an ask is finished by the team, and every member of that
-- team earns the reward. Returns how many new rewards were recorded.
create or replace function public.award_challenge_rewards(p_session_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_s public.session;
  v_need int;
  v_new int := 0;
  v_n int;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select * into v_s from public.session where id = p_session_id;
  if v_s.id is null then raise exception 'challenge not found'; end if;

  if v_s.base_reward_cents > 0 then
    v_need := coalesce(v_s.base_reward_min_asks,
      (select count(*)::int from public.quest q where q.session_id = v_s.id and not q.is_hidden and not q.is_judged));
    insert into public.reward (session_id, player_id, team_id, kind, amount_cents, form)
    select v_s.id, tm.player_id, tm.team_id, 'guaranteed', v_s.base_reward_cents, v_s.base_reward_form
    from public.team_member tm
    where v_need > 0
      and (select count(*) from public.completion c join public.quest q on q.id = c.quest_id
           where q.session_id = v_s.id and c.team_id = tm.team_id and not q.is_hidden and not q.is_judged) >= v_need
    on conflict do nothing;
    get diagnostics v_n = row_count;
    v_new := v_new + v_n;
  end if;

  insert into public.reward (session_id, player_id, team_id, quest_id, kind, amount_cents, form)
  select v_s.id, tm.player_id, tm.team_id, q.id, 'sponsored', q.sponsor_reward_cents, v_s.base_reward_form
  from public.quest q
  join public.completion c on c.quest_id = q.id
  join public.team_member tm on tm.team_id = c.team_id
  where q.session_id = v_s.id and q.sponsor_reward_cents is not null
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_new + v_n;
end;
$$;
revoke all on function public.award_challenge_rewards(uuid) from public, anon;
grant execute on function public.award_challenge_rewards(uuid) to authenticated;

-- Add a performance-pool share (or any one-off reward) by hand.
create or replace function public.add_performance_reward(p_session_id uuid, p_player_id uuid, p_amount_cents int, p_form text default 'gift_card', p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  insert into public.reward (session_id, player_id, kind, amount_cents, form, note)
  values (p_session_id, p_player_id, 'performance', p_amount_cents, p_form, left(nullif(btrim(coalesce(p_note, '')), ''), 300))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_performance_reward(uuid, uuid, int, text, text) from public, anon;
grant execute on function public.add_performance_reward(uuid, uuid, int, text, text) to authenticated;

-- Move a reward along: earned -> sent -> claimed, or void. Stamps who sent it and when.
create or replace function public.set_reward_status(p_reward_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_status not in ('earned', 'sent', 'claimed', 'void') then raise exception 'unknown status'; end if;
  update public.reward
     set status = p_status,
         note = coalesce(left(nullif(btrim(coalesce(p_note, '')), ''), 300), note),
         sent_at = case when p_status = 'sent' then now() when p_status = 'earned' then null else sent_at end,
         sent_by = case when p_status = 'sent' then auth.uid() when p_status = 'earned' then null else sent_by end,
         claimed_at = case when p_status = 'claimed' then now() when p_status in ('earned', 'sent') then null else claimed_at end
   where id = p_reward_id;
end;
$$;
revoke all on function public.set_reward_status(uuid, text, text) from public, anon;
grant execute on function public.set_reward_status(uuid, text, text) to authenticated;

------------------------------------------------------------------------------------------------
-- 4. Outcome Report: the numbers for one challenge, for the client export
------------------------------------------------------------------------------------------------
-- Staff only. No names or emails: counts and times only, so it can be handed to a client as is.
create or replace function public.challenge_report(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_s public.session;
  v_asks int;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select * into v_s from public.session where id = p_session_id;
  if v_s.id is null then return null; end if;
  select count(*)::int into v_asks from public.quest q where q.session_id = v_s.id and not q.is_hidden and not q.is_judged;

  return (
    with done as (
      select c.quest_id, c.team_id, c.completed_at
      from public.completion c join public.quest q on q.id = c.quest_id
      where q.session_id = v_s.id
    ),
    teams as (select distinct team_id from done),
    people as (select distinct tm.player_id from public.team_member tm join teams t on t.team_id = tm.team_id),
    per_team as (
      select d.team_id, count(*) filter (where not q.is_hidden and not q.is_judged) as main_done
      from done d join public.quest q on q.id = d.quest_id group by d.team_id
    )
    select jsonb_build_object(
      'challenge', jsonb_build_object('name', v_s.route_name, 'neighborhood', v_s.neighborhood, 'client', v_s.client_name,
                                      'objective', v_s.client_objective, 'status', v_s.status, 'open_until', v_s.open_until),
      'participants', (select count(*) from people),
      -- First-time: people with no finished ask on any other challenge before this one.
      'first_time_participants', (
        select count(*) from people p where not exists (
          select 1 from public.team_member tm2
          join public.completion c2 on c2.team_id = tm2.team_id
          join public.quest q2 on q2.id = c2.quest_id
          where tm2.player_id = p.player_id and q2.session_id <> v_s.id
            and c2.completed_at < (select min(completed_at) from done))),
      'teams', (select count(*) from teams),
      'asks', v_asks,
      'asks_completed', (select count(*) from done),
      'teams_finished_all', (select count(*) from per_team where v_asks > 0 and main_done >= v_asks),
      'completion_rate', case when v_asks > 0 and (select count(*) from teams) > 0
        then round((select sum(main_done) from per_team)::numeric / (v_asks * (select count(*) from teams)), 3) end,
      'first_check_in', (select min(completed_at) from done),
      'last_check_in', (select max(completed_at) from done),
      'by_ask', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'stop', q.stop_number, 'title', q.title, 'sponsor', q.sponsor_name, 'needs_photo', q.needs_photo,
                 'teams_completed', (select count(*) from done d where d.quest_id = q.id),
                 'first', (select min(d.completed_at) from done d where d.quest_id = q.id),
                 'last', (select max(d.completed_at) from done d where d.quest_id = q.id),
                 'photos', (select count(*) from public.photo_proof ph where ph.quest_id = q.id),
                 'photos_approved', (select count(*) from public.photo_proof ph where ph.quest_id = q.id and ph.status = 'approved'))
               order by q.stop_number nulls last, q.title)
        from public.quest q where q.session_id = v_s.id), '[]'::jsonb),
      'photos', jsonb_build_object(
        'submitted', (select count(*) from public.photo_proof ph join public.quest q on q.id = ph.quest_id where q.session_id = v_s.id),
        'approved', (select count(*) from public.photo_proof ph join public.quest q on q.id = ph.quest_id where q.session_id = v_s.id and ph.status = 'approved'),
        'pending', (select count(*) from public.photo_proof ph join public.quest q on q.id = ph.quest_id where q.session_id = v_s.id and ph.status = 'pending')),
      'rewards', jsonb_build_object(
        'earned_cents', (select coalesce(sum(amount_cents), 0) from public.reward r where r.session_id = v_s.id and r.status <> 'void'),
        'sent_cents', (select coalesce(sum(amount_cents), 0) from public.reward r where r.session_id = v_s.id and r.status in ('sent', 'claimed')),
        'people_rewarded', (select count(distinct player_id) from public.reward r where r.session_id = v_s.id and r.status <> 'void'))
    )
  );
end;
$$;
revoke all on function public.challenge_report(uuid) from public, anon;
grant execute on function public.challenge_report(uuid) to authenticated;
