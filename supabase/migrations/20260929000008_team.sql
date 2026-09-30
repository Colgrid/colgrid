-- Colgrid MVP step 4: the Team screen.
-- Run after 20260929000007_add_player.sql. Safe to re-run.
--
-- Players can't read other players' rows directly (row-level security), so the Team screen reads
-- its roster through this function. It returns only what a teammate should see: first-and-last
-- names, levels' raw XP, and what the team did each session. Never emails.

create or replace function public.my_team(p_season_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_team public.team%rowtype;
  v_members jsonb;
  v_history jsonb;
begin
  if v_player is null then
    return null;
  end if;

  select t.* into v_team
  from public.team t join public.team_member tm on tm.team_id = t.id
  where tm.player_id = v_player and t.season_id = p_season_id
  order by tm.joined_at desc limit 1;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', p.name,
           'is_me', p.id = v_player,
           'xp', coalesce((select sum(x.amount) from public.xp_event x where x.player_id = p.id), 0)
         ) order by (p.id = v_player) desc, p.name), '[]'::jsonb)
  into v_members
  from public.team_member tm join public.player p on p.id = tm.player_id
  where tm.team_id = v_team.id;

  -- Every session of the season, with what this team did in it (what you missed while away, too).
  select coalesce(jsonb_agg(jsonb_build_object(
           'number', s.number,
           'neighborhood', s.neighborhood,
           'starts_at', s.starts_at,
           'status', s.status,
           'quests_total', (select count(*) from public.quest q where q.session_id = s.id and not q.is_hidden and not q.is_judged),
           'quests_done', (select count(*) from public.completion c join public.quest q on q.id = c.quest_id
                           where q.session_id = s.id and c.team_id = v_team.id and not q.is_hidden and not q.is_judged),
           'hidden_found', (select count(*) from public.completion c join public.quest q on q.id = c.quest_id
                            where q.session_id = s.id and c.team_id = v_team.id and q.is_hidden),
           'players', (select count(*) from public.attendance a where a.session_id = s.id and a.team_id = v_team.id),
           'i_was_there', exists (select 1 from public.attendance a where a.session_id = s.id and a.player_id = v_player)
         ) order by s.number desc), '[]'::jsonb)
  into v_history
  from public.session s
  where s.season_id = p_season_id;

  return jsonb_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'mode', v_team.mode,
    'opt_in_closed', public.tournament_opt_in_closed(p_season_id),
    'members', v_members,
    'history', v_history
  );
end;
$$;
revoke all on function public.my_team(uuid) from public, anon;
grant execute on function public.my_team(uuid) to authenticated;
