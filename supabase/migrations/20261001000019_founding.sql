-- Colgrid: Founding badge for the Oct 17 launch.
-- Run after 20260928000002_signin.sql (any time after). Safe to re-run.
--
-- Before: Founding was given at first sign-in only while no season numbered above 1 existed, so
-- the Practice season (99) quietly switched it off for everyone.
-- Now: a player is a founder if they hold a ticket for a session in Chapter 01's launch seasons:
-- the Pilot (Season 00, the Oct 17 launch) or Season 01. It's checked every time the pass loads,
-- so a ticket imported after someone first signed in still earns it. Practice, Open Play and
-- later seasons never do. Badges are never taken away (CLAUDE.md rule 3).

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

  -- Already linked?
  select id into v_player from public.player where user_id = v_uid;

  if v_player is null then
    -- Only a confirmed email can claim a pass. A magic-link sign-in confirms it.
    select lower(u.email) into v_email from auth.users u
    where u.id = v_uid and u.email_confirmed_at is not null;
    if v_email is null then
      return null;
    end if;

    update public.player set user_id = v_uid
    where email = v_email and user_id is null
    returning id into v_player;
  end if;

  -- Founding: a ticket for the launch (Pilot / Season 01 of Chapter 01). Once, and kept forever.
  if v_player is not null and exists (
    select 1 from public.ticket t
    join public.session s on s.id = t.session_id
    join public.season se on se.id = s.season_id
    join public.chapter c on c.id = se.chapter_id
    where t.player_id = v_player and c.number = 1 and se.number in (0, 1)
  ) then
    insert into public.player_badge (player_id, badge_id)
    select v_player, b.id from public.badge b where b.key = 'founding'
    on conflict do nothing;
  end if;

  return v_player;
end;
$$;

revoke all on function public.claim_my_pass() from public, anon;
grant execute on function public.claim_my_pass() to authenticated;
