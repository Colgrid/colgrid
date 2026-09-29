-- Colgrid: table access for the website's roles. Run after 20260928000002_signin.sql. Safe to re-run.
--
-- Newer Supabase projects don't give the website's roles (anon = signed out, authenticated = signed in)
-- any access to new tables by default. Without these grants, row-level security never even gets a
-- say: every read from the pass fails. These grants open the door; the row-level security policies in
-- 20260928000001_init.sql still decide which rows each person can see or change.

-- Signed-out visitors: public reference data only. Sessions, quests and hosts are read through
-- player_sessions() / player_quests(), never directly.
grant select on public.chapter, public.season, public.badge to anon;

-- Signed-in players and crew: read everything (policies limit players to their own rows).
grant select on
  public.chapter, public.season, public.session, public.host, public.quest, public.player,
  public.team, public.team_member, public.attendance, public.completion, public.xp_event,
  public.badge, public.player_badge, public.staff
to authenticated;

-- Writes: only staff and admins have policies that allow them (players change team mode through
-- set_team_mode()). XP and badges are insert-only; triggers refuse edits and deletes regardless.
grant insert, update, delete on
  public.chapter, public.season, public.host, public.quest, public.player, public.badge,
  public.team, public.team_member, public.attendance, public.completion, public.staff
to authenticated;
grant insert, update on public.session to authenticated;
grant insert on public.xp_event, public.player_badge to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on public.player_xp_total to authenticated;
