# Colgrid MVP Spec: Salt Lake Pilot

> **Decision, Oct 1, 2026 (Matt): Open Play replaces the ticketed-event model.** Colgrid is an ongoing self-guided city game: free sign-up, teams, invite links and routes played whenever the places are open, with no host, ticket or schedule. Eventbrite, the Oct 17 event and the $75-per-player ticket are dropped. Direction to test (nothing paid is built yet): free core Open Play → paid premium routes or experiences later → optional membership if repeat play supports it → separate revenue from company experiences and business partnerships. Future web payments: Stripe. The hosted-event tools stay in the app, hidden, for later hosted or company experiences. Everything below this note that describes tickets, Eventbrite, $75 or scheduled gatherings is kept as **historical context**, not current direction.

Sep 28, 2026 · Matt [last name]

The MVP is the smallest product that runs one pilot season in Salt Lake (4 gatherings, 30–50 players each) and answers one question: **do players come back because their team and progress carry forward?** Everything not needed for that question is out of scope.

**Sept 30, 2026:** the tournament is paused and October 17 is 3–4 quests + tastings + finale meal + the player pass. See the decisions at the top of [game-design.md](game-design.md).

Source of truth for rules: [game-design.md](game-design.md). Brand: [brand-identity.md](brand-identity.md). Prices: [pricing.md](pricing.md).

## Scope

| In the MVP | Not in the MVP |
| --- | --- |
| Public site: what Colgrid is, next gathering, buy link | Native iOS/Android app |
| Player sign-in and web pass | Built-in checkout (use Stripe Payment Links or Eventbrite) |
| Teams, casual/tournament mode | Vanguard membership, flagship booking |
| Quest check-in by host code or QR | Multiple cities (data model supports it; UI shows Salt Lake only) |
| XP, levels, badges | Team roles, referral bonuses, badge rarity |
| Tournament standings (opt-in teams only) | Chat, social feed, photo uploads |
| Game master console | Automated team matching |
| Post-session survey (built in: 10 questions + optional comment) | Payments to hosts (paid outside the app) |

## Pilot decisions (Sep 28, 2026)

| Decision | Choice |
| --- | --- |
| First event | A small paid pilot/dry run ($75/person) with real ticket buyers, not the full Season 1 launch. It tests the full customer experience, from buying a ticket to the post-session survey, before Season 1 launches. |
| Date | October 2026, ideally within the next few weeks |
| Neighborhood | 9th & 9th |
| Hosts | 3–4 local businesses/makers |
| Age | Adults 18+ (Eventbrite age restriction plus a required checkout question) |
| Tickets | Eventbrite, one ticket type: **Colgrid Pilot, $75/person**. No Season Pass until the pilot has run (Stripe waits on the IRS name update). Flow: Eventbrite ticket → registrations → run the event → collect feedback → then build the Season Pass. |
| Ticket question | "Who are you coming with?" Friends / Partner / Family / Coworkers / Solo / Other. Asked as an Eventbrite checkout question, imported with the player from the attendee export. |

The dry run's players, XP and badges are real and stay on their passes (progress only goes up). It runs as its own practice season so it doesn't use up Season 1's sessions or its tournament opt-in window.

## Open routes test (Oct 1, 2026)

Testing a second way to play next to the hosted gathering: an **open route** that people play on their own, any time the places are open. The question: will someone discover a route, make a team, invite friends, play without a host, finish, and choose another route?

- An open route is a normal session with a route name, a link (`colgrid.app/play/<route>`) and a closing time. Admin → session → **Open route**: Open now / Close now; it closes itself at the closing time (no badge, no emails). Sessions without this (hosted gatherings, kept hidden for later) are unchanged.
- Anyone can sign up from the route page (email link or 6-digit code, first name, no ticket), name a team and text an invite link (`/join/<token>`). Friends who join go on that team; nobody is placed on a stranger's team.
- No start pin and no host: the first finished stop starts a team's route (+50). Stops are verified the usual way (location + on-site answer; host code as backup). Same XP: 25 per quest, +20 each for finishing every stop. Each stop shows hours (typed in admin) and Open in Maps (hands off to the phone's maps app; no map in Colgrid).
- After the first finished stop, the pass offers Add to Home Screen (never required). After the last, it shows the survey and the other open routes.
- Counts (admin → session → Open route): route page visits, sign-ups, teams created/started, invites sent/accepted, quest starts and completions, route completions, install card shown/installed/opened from the home screen.
- Not part of this test: payments, subscriptions, leaderboards, rankings, tournament, push notifications, in-app maps, chat.

## Users

| Role | What they do |
| --- | --- |
| Player | Signs in, sees their pass, chooses play mode with their team, checks in quests |
| Game master (GM) | Handles exceptions: safety, a host who doesn't show, walk-ins, judged challenges, finals. In guided mode the app runs the flow (decided Sept 30, 2026) |
| Admin (owner) | Creates chapters, seasons, sessions, quests, hosts; imports ticket buyers |
| Host | No login in the MVP. Holds a printed plaque with a quest code/QR, shown only after the quest is done |

## User flows

1. **Buy and join.** Player buys on the ticket link → admin imports buyers (CSV or webhook) → player gets an email with a magic sign-in link → first sign-in creates their pass with the Founding badge.
2. **Choose how to play.** On the pass, the team sees "Casual (default)". Any team member can switch the team to Tournament until the season's 2nd session starts; after that the toggle only allows dropping to Casual.
3. **Pre-game.** 24–48 h before, the GM publishes the start location; players see it on their pass and get an email/text.
4. **Opening ritual.** Teams are made ahead of time from ticket groups. Players go to the start and tap I'm here: the phone must be inside the start pin's radius (no sign; the start code is a backup the crew can say out loud). The app checks them in (+50 XP), places solo ticket holders on the smallest team, starts the session (from 30 minutes before) and unlocks mission 1. The GM can still assign teams in the console.
4a. **Guided missions.** One mission unlocks at a time with where to go, what to do and a target time. Teams start at different stops (route slots in arrival order, rotating the stops) so no host gets swamped. Puzzle stops take a typed answer instead of a host code. When every mission is done, the pass sends the team to the finale.
5. **Quest check-in.** Team finishes a quest → one player taps **I'm here** on the mission: the phone's location must be inside the stop's radius (set once per stop; never stored) and, where the stop has one, the team types an answer only visible on site. Pin-only stops need a short stay. Every present teammate gets the XP; tournament teams get points. It counts once per team. **Backups:** the host code / QR sticker, and admin override. **Tournament (later):** add a team photo at each stop. Decided Sept 30, 2026: no person is needed at a stop to verify it, so Colgrid can run at any number of locations. **No signal:** a check-in or answer made offline is saved on the phone and sent automatically when signal returns; the server counts it once, so XP is never doubled.
6. **Judged challenges.** GM scores creative/performance quests in the console.
7. **Closing ritual.** GM marks attendance, awards the session badge, reveals standings (tournament teams only) and the next date. Passes update live.
8. **After.** The survey on the pass and in the thank-you email; players see what the team did while they were away.
9. **Chapter Finals.** At the season's last session, the GM marks the top 4 tournament teams as finalists, scores the finals mission and crowns the Chapter Champion (badge).

## Screens

| # | Screen | Who | Key content |
| --- | --- | --- | --- |
| 1 | Home (public) | Anyone | What Colgrid is, how it works (casual or tournament), next gathering, ticket button ($75 Eventbrite pilot ticket; $280 Season Pass after the pilot) |
| 2 | Sign in | Player | Email magic link |
| 3 | Player pass | Player | Header: Colgrid, level, play mode · identity: name, team, Chapter 01: Salt Lake · now: session and neighborhood · XP bar · quests (done, active, locked, hidden) · badges · flagship progress |
| 4 | Check in | Player | Code entry + camera QR scan, success state with XP gained |
| 5 | Team | Player | Team name, members, mode toggle with rules, team history |
| 6 | Standings | Anyone signed in | Chapter tournament table; casual teams never listed |
| 7 | GM console | GM | Session run sheet: attendance, team assignment, quest status per team, judged scores, reveal location, close session |
| 8 | Admin | Admin | Chapters, seasons, sessions, quests + codes, hosts, player import |

Mobile first: every player screen must work one-handed on a phone outdoors (high contrast, large tap targets).

## Data model

```
chapter        id, number (01), city, neighborhood_default
season         id, chapter_id, number, starts_on, tournament_lock_session_number (2)
session        id, season_id, number, date, start_location (hidden until revealed_at), revealed_at, status
host           id, name, business, contact
quest          id, session_id, host_id, title, type, xp, is_hidden, is_judged, code (unique), max_points
player         id, email, name, coming_with (friends|partner|family|coworkers|solo|other), created_at
team           id, season_id, name, mode ('casual' | 'tournament'), mode_changed_at
team_member    team_id, player_id
attendance     session_id, player_id, team_id
completion     quest_id, team_id, completed_at, points (tournament only), verified_by
xp_event       id, player_id, amount, reason, source_id, created_at   -- append-only; XP never decreases
badge          id, key ('founding','session-01','full-season','two-city','chapter-champion'), name
player_badge   player_id, badge_id, awarded_at
```

## Rules to enforce in code

- New teams are **casual by default**. Tournament opt-in only while `session.number < season.tournament_lock_session_number` has not started; dropping to casual is always allowed.
- **Casual teams never appear on standings.** Standings = tournament teams ordered by total points this season.
- **XP only goes up.** Write XP as append-only events; level is derived from total XP.
- A quest code counts **once per team**; XP goes to every teammate marked present that session.
- Hidden quests don't show until completed or revealed by the GM.
- Start location stays hidden until `revealed_at`.
- No ranking or reward is ever based on money spent.

## XP and levels (prototype values from the design doc)

| Action | XP |
| --- | --- |
| Attend a session | 50 |
| Complete a main quest | 25 |
| Find a hidden quest | 30 |
| Team completes every main quest | 20 each |

Starter levels: L1 = 0, L2 = 100, L3 = 250, L4 = 450, L5 = 700 (tune after session 1). A first-time player who attends and finishes 3 quests (125 XP) reaches L2 on night one.

## Suggested stack

- **Next.js** (web, mobile-first) on **Vercel**, hosted at getcolgrid.com
- **Supabase**: Postgres, auth (email magic link), row-level security
- **Resend** (or Supabase email) for sign-in and reveal emails
- Tickets: **Eventbrite** for the pilot; import buyers from Eventbrite's attendee CSV export, webhook later. Stripe Payment Links later, once the business name matches IRS records
- QR: generate per-quest codes as printable PDFs for host plaques

## Build order

1. Data model + seed data for Chapter 01, Season 1, 4 sessions, sample quests
2. Sign-in and player pass (read-only)
3. Quest check-in → XP → level-up (the core loop)
4. Teams + casual/tournament mode + standings
5. GM console (attendance, verify, reveal, close session)
6. Admin screens + player import
7. Public home page
8. Paid pilot/dry run with real ticket buyers before Season 1

Steps 1–3 are done. For the October dry run, the order is now **6 → 5 → 7 → dry run → 4**: the dry run needs sessions, quests, QR plaques and imported players (6), a way to run the night (5) and a ticket link (7). It is casual only, so standings (4) can follow it.

## Done when

- A player can sign in, see their pass, and check in a quest in under 30 seconds on a phone.
- A first-time player visibly levels up during their first session.
- Casual players are never shown on standings; tournament teams are.
- The GM can run a full 40-player session from the console without editing the database.
- Survey and attendance data answer: did players return, and why?
