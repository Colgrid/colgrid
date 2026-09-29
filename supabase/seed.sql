-- Colgrid sample data: Chapter 01, Salt Lake, Season 1.
-- SAMPLE ONLY. Hosts, businesses, players and emails are made up for local testing.
-- State it creates: Session 01 is closed (with results), Session 02 is live tonight,
-- Sessions 03-04 are scheduled. Dates are relative to when you run it.
-- XP values follow docs/game-design.md section 9: attend 50, main quest 25, hidden quest 30,
-- team completes every main quest +20 each.

begin;

-- Badges ---------------------------------------------------------------------------------------
insert into public.badge (key, name, description) values
  ('founding',         'Founding',         'Registered for a chapter''s first season'),
  ('session-01',       'Session 01',       'Played Session 01'),
  ('session-02',       'Session 02',       'Played Session 02'),
  ('session-03',       'Session 03',       'Played Session 03'),
  ('session-04',       'Session 04',       'Played Session 04'),
  ('full-season',      'Full season',      'Attended every session in a season'),
  ('two-city',         'Two-city',         'Played in two chapters'),
  ('chapter-champion', 'Chapter Champion', 'Won the Chapter Finals'),
  ('maker',            'Maker',            'Completed a making quest'),
  ('scout',            'Scout',            'Found a hidden quest')
on conflict (key) do nothing;

-- Chapter, season, sessions --------------------------------------------------------------------
insert into public.chapter (number, city, neighborhood_default) values (1, 'Salt Lake City', '9th & 9th');

insert into public.season (chapter_id, number, starts_on, tournament_lock_session_number)
select id, 1, (now() - interval '28 days')::date, 2 from public.chapter where number = 1;

-- Teams: 4 tournament, 2 casual (created and opted in before any session starts, as the rules require) ---------------
insert into public.team (season_id, name, mode)
select se.id, v.name, v.mode::public.play_mode
from public.season se
cross join (values
  ('The Night Owls',        'tournament'),
  ('Salt Flats Syndicate',  'tournament'),
  ('Wasatch Wanderers',     'tournament'),
  ('Brine Shrimp Society',  'tournament'),
  ('Liberty Loopers',       'casual'),
  ('Two Tacos Deep',        'casual')
) as v(name, mode)
where se.number = 1;

-- Sessions start as scheduled so teams can opt into the tournament first (as they would in real life).
insert into public.session (season_id, number, starts_at, neighborhood, start_location, revealed_at, status, is_finals)
select se.id, v.number, v.starts_at, v.neighborhood, v.start_location, v.revealed_at, 'scheduled', v.is_finals
from public.season se
cross join (values
  (1, now() - interval '28 days', 'Sugar House', 'Fairmont Park pavilion',          now() - interval '30 days', false),
  (2, now() - interval '1 hour',  '9th & 9th',   'Corner of 900 S and 900 E',        now() - interval '2 days',  false),
  (3, now() + interval '28 days', 'Central 9th', 'Revealed 48 hours before',         null,                       false),
  (4, now() + interval '56 days', '9th & 9th',   'Revealed 48 hours before',         null,                       true)
) as v(number, starts_at, neighborhood, start_location, revealed_at, is_finals)
where se.number = 1;

-- Hosts (sample) -------------------------------------------------------------------------------
insert into public.host (name, business, contact) values
  ('Ada',    'Ninth & Ninth Pottery (sample)', 'ada@example.com'),
  ('Luis',   'Central 9th Taco Stand (sample)', 'luis@example.com'),
  ('June',   'Wasatch Stories (sample)',       'june@example.com'),
  ('Marco',  'Sugar House Letterpress (sample)', 'marco@example.com'),
  ('Priya',  'Park Bench Bakery (sample)',     'priya@example.com'),
  ('Theo',   'Liberty Records (sample)',       'theo@example.com'),
  ('Rin',    'Salt City Soda Works (sample)',  'rin@example.com');

-- Quests: 3 main + 1 hidden per session; Session 02 and 04 also have a judged challenge ---------
insert into public.quest (session_id, host_id, stop_number, title, type, xp, is_hidden, is_judged, code, max_points, host_fee_cents)
select s.id, h.id, v.stop, v.title, v.type::public.quest_type, v.xp, v.hidden, v.judged, v.code, v.max_points, v.fee
from (values
  -- Session 01 · Sugar House
  (1, 'Sugar House Letterpress (sample)', 1, 'Print your team crest',          'making',    25, false, false, 'SUG-P1K', 40, 20000),
  (1, 'Park Bench Bakery (sample)',       2, 'The loaf with a secret',          'tasting',   25, false, false, 'SUG-B2R', 40, 18000),
  (1, 'Liberty Records (sample)',         3, 'Name that Salt Lake B-side',      'puzzle',    25, false, false, 'SUG-R3C', 40, 18000),
  (1, 'Salt City Soda Works (sample)',    null, 'The back-room syrup',          'discovery', 30, true,  false, 'SUG-H4S', 30, 15000),
  -- Session 02 · 9th & 9th (live)
  (2, 'Ninth & Ninth Pottery (sample)',   1, 'Glaze a secret',                  'making',    25, false, false, 'NNP-4K7', 40, 22000),
  (2, 'Central 9th Taco Stand (sample)',  2, 'The taco that isn''t on the menu','tasting',   25, false, false, 'TAC-7Q2', 40, 18000),
  (2, 'Wasatch Stories (sample)',         3, 'The map room',                    'puzzle',    25, false, false, 'MAP-2H9', 40, 20000),
  (2, 'Central 9th Taco Stand (sample)',  null, 'The back booth',               'discovery', 30, true,  false, 'HID-8X1', 30, null),
  (2, null,                               null, 'Best glaze story',             'performance', 25, false, true, 'JDG-5R3', 10, null),
  -- Session 03 · Central 9th
  (3, 'Wasatch Stories (sample)',         1, 'Rooftop cartographers',           'multi_stop',25, false, false, 'CEN-1M4', 40, 20000),
  (3, 'Salt City Soda Works (sample)',    2, 'Mix the chapter''s soda',         'making',    25, false, false, 'CEN-2S8', 40, 18000),
  (3, 'Liberty Records (sample)',         3, 'Two-team listening duel',         'social',    25, false, false, 'CEN-3D5', 40, 18000),
  (3, 'Park Bench Bakery (sample)',       null, 'The flour-dusted door',        'discovery', 30, true,  false, 'CEN-H9F', 30, 15000),
  -- Session 04 · 9th & 9th · Chapter Finals
  (4, 'Ninth & Ninth Pottery (sample)',   1, 'Build the chapter totem',         'making',    25, false, false, 'FIN-1T6', 40, 22000),
  (4, 'Central 9th Taco Stand (sample)',  2, 'Salsa, blindfolded',              'tasting',   25, false, false, 'FIN-2S3', 40, 18000),
  (4, 'Wasatch Stories (sample)',         3, 'The last map',                    'puzzle',    25, false, false, 'FIN-3M7', 40, 20000),
  (4, 'Sugar House Letterpress (sample)', null, 'The champion''s press',        'discovery', 30, true,  false, 'FIN-H2P', 30, 15000),
  (4, null,                               null, 'Finals mission: the city story','performance', 25, false, true, 'FIN-J8X', 10, null)
) as v(session_number, host_business, stop, title, type, xp, hidden, judged, code, max_points, fee)
join public.session s on s.number = v.session_number
left join public.host h on h.business = v.host_business;

-- Players (30, sample) -------------------------------------------------------------------------
insert into public.player (email, name)
select lower(replace(v.name, ' ', '.')) || '@example.com', v.name
from (values
  ('Rosa Delgado'),('Jonah Kim'),('Aiko Mori'),('Tavita Fonoti'),('Lena Walsh'),
  ('Sam Ortiz'),('Priya Nair'),('Ben Carter'),('Mia Chen'),('Owen Hale'),
  ('Grace Liu'),('Diego Ruiz'),('Hana Sato'),('Eli Brooks'),('Nora Quinn'),
  ('Tomas Vega'),('Ivy Park'),('Caleb Reed'),('Zoe Adams'),('Arjun Rao'),
  ('Maya Stone'),('Luca Bianchi'),('Kira Novak'),('Felix Ward'),('Ruby Hart'),
  ('Omar Haddad'),('Tess Moreno'),('Jude Price'),('Lila Ford'),('Nico Alvarez')
) as v(name);

-- 5 players per team. slot 5 = the player who missed Session 01.
create temporary table seed_roster (player_name text, team_name text, slot int) on commit drop;
insert into seed_roster values
  ('Rosa Delgado','The Night Owls',1),('Jonah Kim','The Night Owls',2),('Aiko Mori','The Night Owls',3),('Tavita Fonoti','The Night Owls',4),('Lena Walsh','The Night Owls',5),
  ('Sam Ortiz','Salt Flats Syndicate',1),('Priya Nair','Salt Flats Syndicate',2),('Ben Carter','Salt Flats Syndicate',3),('Mia Chen','Salt Flats Syndicate',4),('Owen Hale','Salt Flats Syndicate',5),
  ('Grace Liu','Liberty Loopers',1),('Diego Ruiz','Liberty Loopers',2),('Hana Sato','Liberty Loopers',3),('Eli Brooks','Liberty Loopers',4),('Nora Quinn','Liberty Loopers',5),
  ('Tomas Vega','Wasatch Wanderers',1),('Ivy Park','Wasatch Wanderers',2),('Caleb Reed','Wasatch Wanderers',3),('Zoe Adams','Wasatch Wanderers',4),('Arjun Rao','Wasatch Wanderers',5),
  ('Maya Stone','Brine Shrimp Society',1),('Luca Bianchi','Brine Shrimp Society',2),('Kira Novak','Brine Shrimp Society',3),('Felix Ward','Brine Shrimp Society',4),('Ruby Hart','Brine Shrimp Society',5),
  ('Omar Haddad','Two Tacos Deep',1),('Tess Moreno','Two Tacos Deep',2),('Jude Price','Two Tacos Deep',3),('Lila Ford','Two Tacos Deep',4),('Nico Alvarez','Two Tacos Deep',5);

insert into public.team_member (team_id, player_id)
select t.id, p.id
from seed_roster r
join public.player p on p.name = r.player_name
join public.team t on t.name = r.team_name;

-- Everyone registered for the first season gets the Founding badge
insert into public.player_badge (player_id, badge_id)
select p.id, b.id from public.player p cross join public.badge b where b.key = 'founding';

-- Session 01 results --------------------------------------------------------------------------
-- Attendance: 4 of 5 players per team came (the 5th member of each team missed it).
insert into public.attendance (session_id, player_id, team_id, checked_in_at)
select s.id, tm.player_id, tm.team_id, s.starts_at
from public.session s
join public.team_member tm on true
join public.player p on p.id = tm.player_id
join seed_roster r on r.player_name = p.name
where s.number = 1 and r.slot <= 4;

-- Completions: (team, quest code, tournament points). Casual teams' points are cleared by the rules trigger.
insert into public.completion (quest_id, team_id, completed_at, points)
select q.id, t.id, s.starts_at + interval '90 minutes', v.points
from (values
  ('The Night Owls',       'SUG-P1K', 34), ('The Night Owls',       'SUG-B2R', 30), ('The Night Owls',       'SUG-R3C', 36), ('The Night Owls', 'SUG-H4S', 25),
  ('Salt Flats Syndicate', 'SUG-P1K', 38), ('Salt Flats Syndicate', 'SUG-B2R', 36), ('Salt Flats Syndicate', 'SUG-R3C', 34),
  ('Wasatch Wanderers',    'SUG-P1K', 31), ('Wasatch Wanderers',    'SUG-B2R', 35), ('Wasatch Wanderers',    'SUG-H4S', 28),
  ('Brine Shrimp Society', 'SUG-P1K', 29), ('Brine Shrimp Society', 'SUG-R3C', 30),
  ('Liberty Loopers',      'SUG-P1K', 40), ('Liberty Loopers',      'SUG-B2R', 40), ('Liberty Loopers',      'SUG-R3C', 40),
  ('Two Tacos Deep',       'SUG-B2R', 40), ('Two Tacos Deep',       'SUG-H4S', 30)
) as v(team_name, code, points)
join public.team t on t.name = v.team_name
join public.quest q on q.code = v.code
join public.session s on s.id = q.session_id;

-- XP for Session 01, derived from attendance and completions:
-- attend 50
insert into public.xp_event (player_id, amount, reason, source_id, created_at)
select a.player_id, 50, 'attend', a.session_id, a.checked_in_at
from public.attendance a join public.session s on s.id = a.session_id where s.number = 1;

-- each completed quest -> its XP to every teammate present that session
insert into public.xp_event (player_id, amount, reason, source_id, created_at)
select a.player_id, q.xp, case when q.is_hidden then 'hidden_quest' else 'quest' end, q.id, c.completed_at
from public.completion c
join public.quest q on q.id = c.quest_id
join public.attendance a on a.session_id = q.session_id and a.team_id = c.team_id
join public.session s on s.id = q.session_id
where s.number = 1 and not q.is_judged;

-- team completed every main (non-hidden, non-judged) quest -> +20 each present player
insert into public.xp_event (player_id, amount, reason, source_id, created_at)
select a.player_id, 20, 'all_main_quests', s.id, s.starts_at + interval '3 hours'
from public.session s
join public.attendance a on a.session_id = s.id
where s.number = 1
  and (select count(*) from public.quest q where q.session_id = s.id and not q.is_hidden and not q.is_judged)
    = (select count(*) from public.completion c join public.quest q on q.id = c.quest_id
       where q.session_id = s.id and c.team_id = a.team_id and not q.is_hidden and not q.is_judged);

-- Session 01 badge for everyone who attended; Scout for teams that found the hidden quest; Maker for the making quest
insert into public.player_badge (player_id, badge_id, awarded_at)
select a.player_id, b.id, s.starts_at + interval '3 hours'
from public.attendance a join public.session s on s.id = a.session_id join public.badge b on b.key = 'session-01'
where s.number = 1;

insert into public.player_badge (player_id, badge_id, awarded_at)
select distinct a.player_id, b.id, c.completed_at
from public.completion c
join public.quest q on q.id = c.quest_id
join public.attendance a on a.session_id = q.session_id and a.team_id = c.team_id
join public.badge b on b.key = case q.type when 'discovery' then 'scout' when 'making' then 'maker' end
where q.is_hidden or q.type = 'making';

-- Session 01 is over; Session 02 is live now. From here, tournament opt-in is closed for Season 1.
update public.session set status = 'closed' where number = 1;
update public.session set status = 'live'   where number = 2;

-- Session 02 so far: most players checked in; The Night Owls finished quest 1.
insert into public.attendance (session_id, player_id, team_id, checked_in_at)
select s.id, tm.player_id, tm.team_id, s.starts_at
from public.session s cross join public.team_member tm
where s.number = 2;

insert into public.completion (quest_id, team_id, completed_at, points)
select q.id, t.id, now() - interval '20 minutes', 32
from public.quest q join public.team t on t.name = 'The Night Owls' where q.code = 'NNP-4K7';

insert into public.xp_event (player_id, amount, reason, source_id)
select a.player_id, 50, 'attend', a.session_id
from public.attendance a join public.session s on s.id = a.session_id where s.number = 2;

insert into public.xp_event (player_id, amount, reason, source_id)
select a.player_id, q.xp, 'quest', q.id
from public.quest q
join public.team t on t.name = 'The Night Owls'
join public.attendance a on a.session_id = q.session_id and a.team_id = t.id
where q.code = 'NNP-4K7';

commit;
