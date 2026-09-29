-- Colgrid MVP step 6: admin setup and player import (for the October pilot).
-- Run after 20260928000004_checkin.sql. Safe to re-run.
--
-- Decisions (docs/mvp-spec.md, Pilot decisions):
--  - The October pilot is its own practice season ("Season 00 · Pilot"), so it doesn't use up
--    Season 1's sessions or tournament window. Its XP and badges are real and stay.
--  - Tickets are sold on Eventbrite. The admin imports the attendee export; each row becomes a player
--    (by email) with a ticket for the chosen session, plus their "Who are you coming with?" answer.

------------------------------------------------------------------------------------------------
-- Seasons can be numbered 0 (the pilot) and have a display name.
------------------------------------------------------------------------------------------------
alter table public.season drop constraint if exists season_number_check;
alter table public.season add constraint season_number_check check (number >= 0);
alter table public.season add column if not exists name text;

------------------------------------------------------------------------------------------------
-- Player: the ticket question and when the welcome email went out.
------------------------------------------------------------------------------------------------
alter table public.player add column if not exists coming_with text;
alter table public.player drop constraint if exists player_coming_with_check;
alter table public.player add constraint player_coming_with_check
  check (coming_with is null or coming_with in ('friends', 'partner', 'family', 'coworkers', 'solo', 'other'));
alter table public.player add column if not exists welcomed_at timestamptz;

------------------------------------------------------------------------------------------------
-- Tickets: who is registered for which session (from the ticket platform).
------------------------------------------------------------------------------------------------
create table if not exists public.ticket (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.session (id) on delete restrict,
  player_id uuid not null references public.player (id) on delete restrict,
  order_ref text,          -- Eventbrite order number: people in one order usually want one team
  ticket_type text,
  source text not null default 'eventbrite',
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);
create index if not exists ticket_session_idx on public.ticket (session_id);
alter table public.ticket enable row level security;
drop policy if exists "players read own tickets" on public.ticket;
create policy "players read own tickets" on public.ticket
  for select using (player_id = public.current_player_id() or public.is_staff());
drop policy if exists "admins write tickets" on public.ticket;
create policy "admins write tickets" on public.ticket
  for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.ticket to authenticated;

------------------------------------------------------------------------------------------------
-- Quest codes are generated: 3 + 3 characters with no look-alikes (no 0/O, 1/I/L).
------------------------------------------------------------------------------------------------
create or replace function public.new_quest_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      if i = 3 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.quest where code = v_code);
  end loop;
  return v_code;
end;
$$;
alter table public.quest alter column code set default public.new_quest_code();
-- The admin dashboard creates quests directly; the column default fills in the code.
grant execute on function public.new_quest_code() to authenticated;

------------------------------------------------------------------------------------------------
-- import_players(session, rows): admin only. rows = [{email, name, coming_with, order_ref, ticket_type}]
-- Creates players by email (never duplicates), adds a ticket for the session, keeps existing names.
-- Returns counts and the rows it skipped, with the reason.
------------------------------------------------------------------------------------------------
create or replace function public.normalize_coming_with(p text)
returns text language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when lower(p) ~ 'friend' then 'friends'
    when lower(p) ~ '(partner|spouse|husband|wife|boyfriend|girlfriend|date)' then 'partner'
    when lower(p) ~ 'famil' then 'family'
    when lower(p) ~ '(co-?worker|colleague|work)' then 'coworkers'
    when lower(p) ~ '(solo|alone|myself|just me)' then 'solo'
    else 'other'
  end;
$$;

create or replace function public.import_players(p_session_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_i int := 0;
  v_email text;
  v_name text;
  v_player uuid;
  v_created int := 0;
  v_existing int := 0;
  v_tickets int := 0;
  v_had_ticket int := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_new boolean;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can import players.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.session where id = p_session_id) then
    raise exception 'That session doesn''t exist.' using errcode = 'foreign_key_violation';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a list.' using errcode = 'invalid_parameter_value';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_i := v_i + 1;
    v_email := lower(btrim(coalesce(v_row->>'email', '')));
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_skipped := v_skipped || jsonb_build_object('row', v_i, 'email', v_row->>'email', 'reason', 'missing or invalid email');
      continue;
    end if;
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    if v_name is null then v_name := split_part(v_email, '@', 1); end if;

    insert into public.player (email, name, coming_with)
    values (v_email, left(v_name, 120), public.normalize_coming_with(v_row->>'coming_with'))
    on conflict (email) do update
      set coming_with = coalesce(public.player.coming_with, excluded.coming_with)
    returning id, (xmax = 0) into v_player, v_new;
    if v_new then v_created := v_created + 1; else v_existing := v_existing + 1; end if;

    insert into public.ticket (session_id, player_id, order_ref, ticket_type)
    values (p_session_id, v_player, nullif(btrim(coalesce(v_row->>'order_ref', '')), ''), nullif(btrim(coalesce(v_row->>'ticket_type', '')), ''))
    on conflict (session_id, player_id) do nothing;
    if found then v_tickets := v_tickets + 1; else v_had_ticket := v_had_ticket + 1; end if;
  end loop;

  return jsonb_build_object(
    'players_created', v_created,
    'players_existing', v_existing,
    'tickets_added', v_tickets,
    'tickets_existing', v_had_ticket,
    'skipped', v_skipped
  );
end;
$$;
revoke all on function public.import_players(uuid, jsonb) from public, anon;
grant execute on function public.import_players(uuid, jsonb) to authenticated;

------------------------------------------------------------------------------------------------
-- Chapter 01 and the pilot season, plus the standard badges. Only added if missing.
------------------------------------------------------------------------------------------------
insert into public.chapter (number, city, neighborhood_default)
select 1, 'Salt Lake City', '9th & 9th'
where not exists (select 1 from public.chapter where number = 1);

insert into public.season (chapter_id, number, name, tournament_lock_session_number)
select c.id, 0, 'Pilot', 2 from public.chapter c
where c.number = 1 and not exists (select 1 from public.season s where s.chapter_id = c.id and s.number = 0);

insert into public.badge (key, name, description) values
  ('founding',         'Founding',         'Registered for a chapter''s first season'),
  ('full-season',      'Full season',      'Attended every session in a season'),
  ('two-city',         'Two-city',         'Played in two chapters'),
  ('chapter-champion', 'Chapter Champion', 'Won the Chapter Finals'),
  ('maker',            'Maker',            'Completed a making quest'),
  ('scout',            'Scout',            'Found a hidden quest')
on conflict (key) do nothing;
