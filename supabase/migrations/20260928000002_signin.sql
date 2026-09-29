-- Colgrid MVP step 2: sign-in links a player's ticket to their account.
-- Run after 20260928000001_init.sql. Safe to run more than once.
--
-- How it works: an admin imports ticket buyers as rows in public.player (by email). When that
-- person signs in with a magic link, claim_my_pass() finds the player row with the same email and
-- links it to their account. The first time it links, the player gets the Founding badge
-- (docs/mvp-spec.md, user flow 1).

create or replace function public.claim_my_pass()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_player uuid;
begin
  if v_uid is null then
    return null;
  end if;

  -- Already linked.
  select id into v_player from public.player where user_id = v_uid;
  if v_player is not null then
    return v_player;
  end if;

  -- Only a confirmed email can claim a pass. A magic-link sign-in confirms it.
  select lower(u.email) into v_email from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;

  update public.player set user_id = v_uid
  where email = v_email and user_id is null
  returning id into v_player;

  -- First sign-in: Founding badge (registered for a chapter's first season, docs/game-design.md).
  -- Pilot rule: while only first seasons exist, every ticket holder is a founder. Once later
  -- seasons exist, the import in step 6 awards it per season instead.
  if v_player is not null and not exists (select 1 from public.season where number > 1) then
    insert into public.player_badge (player_id, badge_id)
    select v_player, b.id from public.badge b where b.key = 'founding'
    on conflict do nothing;
  end if;

  return v_player;
end;
$$;

revoke all on function public.claim_my_pass() from public;
grant execute on function public.claim_my_pass() to authenticated;

-- The Founding badge must exist for the link above to award it (seed.sql adds the rest).
insert into public.badge (key, name, description)
values ('founding', 'Founding', 'Registered for a chapter''s first season')
on conflict (key) do nothing;
