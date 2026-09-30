-- Colgrid: add one player by hand (comps, invited friends, walk-ins at the door).
-- Run after 20260928000006_gm.sql. Safe to re-run.
-- Game masters and admins can use it; it works like one row of the Eventbrite import:
-- the player is found or created by email (never duplicated) and gets a ticket for the session.

create or replace function public.add_player(p_session_id uuid, p_email text, p_name text, p_coming_with text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_player uuid;
  v_new boolean;
  v_status public.session_status;
begin
  if not public.is_staff() then
    raise exception 'Only the crew can add players.' using errcode = 'insufficient_privilege';
  end if;
  select status into v_status from public.session where id = p_session_id;
  if v_status is null then return jsonb_build_object('status', 'no_session'); end if;
  if v_status = 'closed' then return jsonb_build_object('status', 'closed'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('status', 'bad_email'); end if;
  if v_name is null then v_name := split_part(v_email, '@', 1); end if;

  insert into public.player (email, name, coming_with)
  values (v_email, left(v_name, 120), public.normalize_coming_with(p_coming_with))
  on conflict (email) do update set coming_with = coalesce(public.player.coming_with, excluded.coming_with)
  returning id, (xmax = 0) into v_player, v_new;

  insert into public.ticket (session_id, player_id, source)
  values (p_session_id, v_player, 'manual')
  on conflict (session_id, player_id) do nothing;

  return jsonb_build_object(
    'status', case when found then 'added' else 'already' end,
    'player_id', v_player,
    'new_player', v_new
  );
end;
$$;
revoke all on function public.add_player(uuid, text, text, text) from public, anon;
grant execute on function public.add_player(uuid, text, text, text) to authenticated;
