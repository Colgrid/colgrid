-- Colgrid: built-in post-gathering survey (10 questions + optional comment). One answer set per
-- player per session; players can change their answers. Only admins read results.
-- Run after 20260930000016_start_gps.sql. Safe to re-run.

create table if not exists public.survey_response (
  session_id uuid not null references public.session (id) on delete restrict,
  player_id uuid not null references public.player (id) on delete cascade,
  enjoyed smallint check (enjoyed between 1 and 5),           -- Did you enjoy the gathering?
  easy smallint check (easy between 1 and 5),                 -- Was it easy to understand what to do?
  quests_fun smallint check (quests_fun between 1 and 5),     -- Were the quests fun?
  best_quest_id uuid references public.quest (id) on delete set null,  -- Which quest did you like most?
  worst_quest_id uuid references public.quest (id) on delete set null, -- Which quest did you like least?
  neighborhood smallint check (neighborhood between 1 and 5), -- Did the neighborhood and locations add to it?
  web_pass smallint check (web_pass between 1 and 5),         -- Did you enjoy using the web pass?
  again text check (again in ('yes', 'maybe', 'no')),         -- Would you attend another gathering?
  recommend text check (recommend in ('yes', 'maybe', 'no')), -- Would you recommend Colgrid to a friend?
  change_one text check (char_length(change_one) <= 500),     -- What is one thing you would change?
  comment text check (char_length(comment) <= 1000),          -- Optional comment
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, player_id)
);
alter table public.survey_response enable row level security;
drop policy if exists "admins read surveys" on public.survey_response;
create policy "admins read surveys" on public.survey_response for select using (public.is_admin());
revoke all on public.survey_response from public, anon, authenticated;
grant select on public.survey_response to authenticated; -- admins only, through the policy

-- What the survey page needs: the session, its main quests (for most/least liked) and my answers.
-- status: ok | not_found | not_attended | not_started
create or replace function public.my_survey(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_session public.session;
  v_mine public.survey_response;
begin
  select * into v_session from public.session where id = p_session_id;
  if v_session.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if v_player is null or not exists (select 1 from public.attendance where session_id = p_session_id and player_id = v_player) then
    return jsonb_build_object('status', 'not_attended');
  end if;
  if v_session.status = 'scheduled' then return jsonb_build_object('status', 'not_started'); end if;
  select * into v_mine from public.survey_response where session_id = p_session_id and player_id = v_player;
  return jsonb_build_object(
    'status', 'ok',
    'number', v_session.number,
    'neighborhood', v_session.neighborhood,
    'quests', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'title', q.title) order by q.stop_number nulls last, q.title)
      from public.quest q where q.session_id = p_session_id and not q.is_hidden and not q.is_judged
    ), '[]'::jsonb),
    'answers', case when v_mine.player_id is null then null else to_jsonb(v_mine) - 'session_id' - 'player_id' end
  );
end;
$$;
revoke all on function public.my_survey(uuid) from public, anon;
grant execute on function public.my_survey(uuid) to authenticated;

-- Save (or update) my answers. Every question is optional; unknown values are ignored.
-- status: ok | not_attended | not_started | empty
create or replace function public.submit_survey(p_session_id uuid, p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := public.current_player_id();
  v_status public.session_status;
  v_scale text[] := array['1', '2', '3', '4', '5'];
  v_ynm text[] := array['yes', 'maybe', 'no'];
  v_enjoyed smallint; v_easy smallint; v_fun smallint; v_hood smallint; v_pass smallint;
  v_best uuid; v_worst uuid; v_again text; v_rec text; v_change text; v_comment text;
begin
  if v_player is null or not exists (select 1 from public.attendance where session_id = p_session_id and player_id = v_player) then
    return 'not_attended';
  end if;
  select status into v_status from public.session where id = p_session_id;
  if v_status = 'scheduled' then return 'not_started'; end if;

  if p->>'enjoyed' = any (v_scale) then v_enjoyed := (p->>'enjoyed')::smallint; end if;
  if p->>'easy' = any (v_scale) then v_easy := (p->>'easy')::smallint; end if;
  if p->>'quests_fun' = any (v_scale) then v_fun := (p->>'quests_fun')::smallint; end if;
  if p->>'neighborhood' = any (v_scale) then v_hood := (p->>'neighborhood')::smallint; end if;
  if p->>'web_pass' = any (v_scale) then v_pass := (p->>'web_pass')::smallint; end if;
  if p->>'again' = any (v_ynm) then v_again := p->>'again'; end if;
  if p->>'recommend' = any (v_ynm) then v_rec := p->>'recommend'; end if;
  select id into v_best from public.quest where session_id = p_session_id and not is_hidden and id::text = p->>'best_quest_id';
  select id into v_worst from public.quest where session_id = p_session_id and not is_hidden and id::text = p->>'worst_quest_id';
  v_change := nullif(left(btrim(coalesce(p->>'change_one', '')), 500), '');
  v_comment := nullif(left(btrim(coalesce(p->>'comment', '')), 1000), '');

  if coalesce(v_enjoyed, v_easy, v_fun, v_hood, v_pass) is null and v_best is null and v_worst is null
     and v_again is null and v_rec is null and v_change is null and v_comment is null then
    return 'empty';
  end if;

  insert into public.survey_response as s
    (session_id, player_id, enjoyed, easy, quests_fun, best_quest_id, worst_quest_id, neighborhood, web_pass, again, recommend, change_one, comment)
  values
    (p_session_id, v_player, v_enjoyed, v_easy, v_fun, v_best, v_worst, v_hood, v_pass, v_again, v_rec, v_change, v_comment)
  on conflict (session_id, player_id) do update set
    enjoyed = excluded.enjoyed, easy = excluded.easy, quests_fun = excluded.quests_fun,
    best_quest_id = excluded.best_quest_id, worst_quest_id = excluded.worst_quest_id,
    neighborhood = excluded.neighborhood, web_pass = excluded.web_pass,
    again = excluded.again, recommend = excluded.recommend,
    change_one = excluded.change_one, comment = excluded.comment, updated_at = now();
  return 'ok';
end;
$$;
revoke all on function public.submit_survey(uuid, jsonb) from public, anon;
grant execute on function public.submit_survey(uuid, jsonb) to authenticated;
