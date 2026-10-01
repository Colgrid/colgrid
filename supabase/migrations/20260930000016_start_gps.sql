-- Colgrid: check in at the start by GPS, no sign (decided Sept 30, 2026).
-- Run after 20260930000015_share.sql. Safe to re-run.
-- Each session can have a start pin (set once in admin). Players tap "I'm here" at the start: the
-- phone must be inside the radius. The start code stays as a backup the crew can say out loud.
-- Positions are used for the check and never stored. The pin is never sent to phones.

alter table public.session add column if not exists start_lat double precision check (start_lat between -90 and 90);
alter table public.session add column if not exists start_lng double precision check (start_lng between -180 and 180);
alter table public.session add column if not exists start_radius_m int not null default 60 check (start_radius_m between 10 and 500);

-- status: whatever arrive() returns, or need_location | weak_signal | too_far | not_revealed
create or replace function public.arrive_here(p_session_id uuid, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.session%rowtype;
  v_dist double precision;
begin
  if public.current_player_id() is null then
    return jsonb_build_object('status', 'no_pass');
  end if;
  select * into v_session from public.session where id = p_session_id;
  if v_session.id is null then
    return jsonb_build_object('status', 'bad_code');
  end if;
  -- Hidden stays hidden: no checking in at a start that hasn't been revealed.
  if v_session.revealed_at is null or v_session.revealed_at > now() then
    return jsonb_build_object('status', 'not_revealed');
  end if;
  if v_session.start_lat is not null then
    if p_lat is null or p_lng is null then
      return jsonb_build_object('status', 'need_location');
    end if;
    if coalesce(p_accuracy, 0) > 150 then
      return jsonb_build_object('status', 'weak_signal');
    end if;
    v_dist := public.distance_m(v_session.start_lat, v_session.start_lng, p_lat, p_lng);
    if v_dist > v_session.start_radius_m + least(greatest(coalesce(p_accuracy, 0), 0), 30) then
      return jsonb_build_object('status', 'too_far', 'distance_m', round(v_dist)::int);
    end if;
  end if;
  -- Same rules as the start code from here: time window, team placement, attendance, +50 XP.
  return public.arrive(p_session_id);
end;
$$;
revoke all on function public.arrive_here(uuid, double precision, double precision, double precision) from public, anon;
grant execute on function public.arrive_here(uuid, double precision, double precision, double precision) to authenticated;
