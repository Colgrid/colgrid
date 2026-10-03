-- Colgrid: which asks on a challenge need a photo, and how many this team has sent. For the pass.
-- Run after 20261002000020_challenges.sql. Safe to re-run. Adds one function; changes nothing else.
create or replace function public.my_photo_asks(p_session_id uuid)
returns table (quest_id uuid, photos int, approved int, rejected int)
language sql stable security definer set search_path = public as $$
  with s as (select season_id from public.session where id = p_session_id),
       t as (select public.my_season_team((select season_id from s)) as team_id)
  select q.id,
         (select count(*)::int from public.photo_proof p where p.quest_id = q.id and p.team_id = (select team_id from t)),
         (select count(*)::int from public.photo_proof p where p.quest_id = q.id and p.team_id = (select team_id from t) and p.status = 'approved'),
         (select count(*)::int from public.photo_proof p where p.quest_id = q.id and p.team_id = (select team_id from t) and p.status = 'rejected')
  from public.quest q
  where q.session_id = p_session_id and q.needs_photo and not q.is_hidden
    and public.current_player_id() is not null;
$$;
revoke all on function public.my_photo_asks(uuid) from public, anon;
grant execute on function public.my_photo_asks(uuid) to authenticated;
