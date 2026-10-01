# Colgrid: Game Design Document

> **Decision, Oct 1, 2026 (Matt): Open Play replaces the ticketed-event model.** Colgrid is an ongoing self-guided city game: free sign-up, teams, invite links and routes played whenever the places are open, with no host, ticket or schedule. Eventbrite, the Oct 17 event and the $75-per-player ticket are dropped. Direction to test (nothing paid is built yet): free core Open Play → paid premium routes or experiences later → optional membership if repeat play supports it → separate revenue from company experiences and business partnerships. Future web payments: Stripe. The hosted-event tools stay in the app, hidden, for later hosted or company experiences. Everything below this note that describes tickets, Eventbrite, $75 or scheduled gatherings is kept as **historical context**, not current direction.

Version 3 · Sep 28, 2026 · Matt [last name]

> Colgrid is not an event series that happens to have a game. It is a persistent game that happens to be played through real-world gatherings.

This version adds the Colgrid name and the two ways to play (casual by default, tournament by choice). Anything not marked **Locked** is a design hypothesis to test or an open decision.

## Decisions, Sept 30, 2026 (Matt)

These override anything below that disagrees.

- **Tournament paused.** Colgrid is about a great experience first. No rankings, standings or tournament switch for players until the basic format is proven. Section 5 stays as the plan for later; the site hides it (`SITE.tournamentOpen = false`).
- **October 17 scope:** 3–4 quests + tastings + finale meal + the player pass. Nothing else.
- **The app runs the night.** Guided missions, staggered routes, self check-in at the start sign. A person only handles exceptions.
- **Verification without people.** A stop is finished by being there (the phone's location inside the stop's radius) and interacting with it (an answer only visible on site). Host codes/QR stickers are a backup and admin override. Photo checks come back with the tournament.
- **Design challenges around physical presence**, not around being hard for AI to solve. If you have to be there and interact with the place to answer it, it can't be solved from a couch, and it's a better experience anyway.
- **Keep quests fresh:** rotate locations, questions and challenges so nobody can memorize a route (rule 5: every gathering happens once).
- **Later, after the first few gatherings show what people want:**
  - two formats: full 3-hour gatherings and shorter weeknight ones;
  - themes and niches: families, singles, coworkers, food-focused, seasonal;
  - difficulty levels;
  - partner applications through the site (the host form on the home page is the first version);
  - pricing per experience, based on what it includes and partner costs, targeting about 50% gross margin.

## 1. Overview

Colgrid is a persistent real-world team game built around local experiences, discovery, making and community. The city supplies the content, gatherings are the play sessions, and a player's progress follows them everywhere, building toward an annual flagship.

**In the founder's words:** meeting up with a team, with friends or strangers who become a team, and doing things together in a city that you normally wouldn't. Gamified so it's fun, with twists and turns, like *Mission Impossible*: things people don't do in normal life.

**Player fantasy:** "I'm part of a team, I see my city in ways others don't, and I'm building something that carries forward."

**Format:** 30–50 players per gathering, in teams, in one walkable neighborhood.

### What it is not

- Not a market or vendor fair: nobody walks rows of booths.
- Not a convention: attendees play, they don't watch.
- Not a scavenger hunt: search-and-find is one tool among many, not the anchor.
- Not a league that exists only to produce a championship.
- Not a tourism event with a game bolted on.

### Blue ocean position

The local market scene is a red ocean, with 4–5 markets running around Salt Lake on a single late-September Saturday, all competing on vendor count. Colgrid leaves the market category and competes for people's evenings and weekends against trips, retreats, escape rooms and festivals. It drops what markets treat as essential (booths, vendor count, shopping) and raises what nobody offers (story, participation, persistent progress).

### Design pillars (Locked)

Every feature must serve at least one pillar. If it serves none, cut it.

| Pillar | Meaning in play | Test for any feature |
| --- | --- | --- |
| Progress follows the player | Levels, badges and team history belong to the player, in any city | Does it add to a record the player keeps? |
| The city is the content | Food, traditions, makers and hidden places supply the game | Does it draw on this city? |
| Participate, don't browse | Every minute is spent playing, making or meeting | Is the player doing something, not watching? |
| Teams are the tribe | Teams reunite at every gathering | Does it bring teammates together? |
| Two ways to play | Casual by default; the tournament is opt-in; both reach the flagship | Does it work for both kinds of player? |
| Every gathering happens once | Quests and exclusives are never repeated | Would a returning player find this new? |
| The host city is better off | Local hosts are paid and spending stays local | Does it benefit someone besides the organizer? |

## 2. Certainty map

| Locked | Proposed (hypotheses) | Undecided |
| --- | --- | --- |
| Persistent game played through real-world experiences | Chapter = city, session = one gathering | Point values and level thresholds |
| City as content and board | Teams of 4–6 | Whether roles add anything |
| Teams that reunite | XP, levels, badges | Frequency and attendance cap after the pilot |
| Local chapters, one shared network | Quest types and quest rules | Flagship size and location |
| Progress follows the player | Opening and closing ritual scripts | Chapter 02 lead (Ogden is the lead candidate) |
| Annual flagship | Web pass and live standings | |
| Casual by default, opt-in tournament | Tournament scoring and finals format | |
| Participation, not browsing | Hidden quests and mid-session twists | |
| Local hosts, not vendor booths | Fair-play rules | |
| Scarcity; no repeated quests | | |
| Local economic benefit | | |
| MVP: one city, one season, testing whether progression drives return | | |

## 3. Game structure (Locked)

Three levels: the **Network** (all players, all cities), **Chapters** (local, recurring, city-based play) and the **Flagship** (the annual gathering).

| Term | Meaning |
| --- | --- |
| Network | All players, all cities, one ruleset |
| Chapter | One city's recurring game (Chapter 01: Salt Lake, Chapter 02: Ogden) |
| Session | One gathering inside a chapter |
| Season | A run of 4–5 sessions in a city, ending in the Chapter Finals |
| Flagship | The annual 2–3 day retreat in a rotating host city; hosts the Championship and the Explorer weekend |

## 4. Core loop

Players run the inner loop (Play → Earn → Advance) every session and the outer loop (Qualify → Gather) once a season. The inner loop is what the pilot tests: a player who levels up at session 1 should want to come back to session 2 because their team and record are waiting.

| Loop | Timescale | What the player does | What pulls them back |
| --- | --- | --- | --- |
| Moment | 5–20 min | Completes one quest at one stop | Instant progress update |
| Session | 2–4 hours | Plays a full chapter night with their team | Finale, standings (tournament) and next date |
| Season | 4–5 sessions | Builds a season record, casual or tournament | Chapter Finals; flagship eligibility |
| Career | Years | Levels, rare badges, alumni status | Status that only goes up |

## 5. Two ways to play (Locked)

Every player plays **casually by default**. Nobody is entered into competition and nobody is ranked unless their team opts in. Both kinds of teams play the same gathering, same quests, same ticket.

| | Casual (default) | Tournament (opt-in) |
| --- | --- | --- |
| How you join | Automatic | Team opts in at sign-up or before the season's 2nd session |
| Cost | Included | Included; no extra fee in the pilot |
| Earns | XP, levels, badges | XP, levels, badges **plus** tournament points |
| Shown on standings | Never | Yes, chapter standings |
| Route to flagship | Explorer lottery (attendance and discovery earn entries) | Chapter Finals → Championship qualification |
| Can switch | Can opt in until the season's 2nd session | Can drop back to casual any time |

### Tournament structure

1. **Regular season:** 4–5 monthly sessions; tournament teams build points on the chapter standings.
2. **Chapter Finals:** the top 4 tournament teams play a finals mission at the season's last session, in front of everyone at the closing ritual. Winner: Chapter Champion.
3. **Championship:** Chapter Champions plus the highest-scoring runners-up (wildcards) compete at the flagship.
4. **Explorer weekend:** casual players drawn by lottery attend the same flagship with their own quests, never required to compete.

Precedent: anyone can take part in the CrossFit Open and the top athletes advance to the CrossFit Games; adult rec leagues run casual and competitive divisions side by side.

## 6. Player identity and the web pass (Locked)

The pass is the player's identity. Progress belongs to the player, not the city: a Salt Lake player's history comes with them to Denver.

**Record:** player, team, home chapter, season, play mode (Casual / Tournament); XP and level; badges; completed quests; hosts and places discovered; flagship status. Lifetime progress never resets. Season-only numbers (tournament points) reset each season.

**Pilot version:** no app build. A unique link per player (web pass) showing team, level, badges and quests completed; quests logged with QR codes or host codes.

## 7. Teams

**Locked:** teams reunite at every gathering and are part of a player's persistent identity. The pull is "my team is here and my progress continues," never "I'll let my team down if I miss."

Proposed rules:

- **Size:** 4–6 players; tune after session 1.
- **Formation:** the opening ritual sorts players into teams at the first session. Friends who register together can ask to play together.
- **Persistence:** a team keeps its name and history across the season.
- **Absences carry no penalty:** a team plays with whoever shows up; a returning player rejoins with nothing lost.
- **Welcome back:** teams are greeted by name; returning players see what the team did while they were away.
- **Roles:** optional flavor only (navigator, maker, scout, chronicler), not in the MVP.

## 8. Quests: the city is the source

**Locked:** quests draw on local food, traditions, makers and hidden places, and a quest is never repeated. A quest can happen at one stop, span several stops, or be a group challenge.

| In the city | In the game |
| --- | --- |
| A neighborhood | A level |
| A restaurant | A challenge |
| A maker or artisan | A quest giver |
| A historic site | A place holding a clue |
| A local tradition | A challenge to take part in |
| A hidden business | An unlock |

| Quest form | Example |
| --- | --- |
| Making | A hands-on piece with a local artisan |
| Cooking or tasting | A private tasting, or a team cooking challenge |
| Tradition or ritual | Taking part in a local custom, dance or game |
| Creative or performance | A team performance or story judged at the finale |
| Social | Meeting players from other teams; a challenge that needs two teams |
| Discovery | Finding hidden places only the game leads to |
| Puzzle | A location-based puzzle |
| Multi-location | A challenge built across several stops |

**Quest rules:** never repeat a quest; route only through willing hosts (Locked). 3–4 main quests per session, each led by a local host; stagger team starts and cap teams per stop (Proposed).

**Filter:** does it reinforce the theme, get people participating, benefit someone besides the organizer, make the night more memorable, and create something worth repeating? If not, cut it.

### Quest design rules (Locked, Oct 1, 2026)

Every quest must:

1. Be easy to understand: one read of the mission card and the team knows what to do.
2. Be fun within the first few minutes, not after a long setup.
3. Need teamwork: more than one person has something to do.
4. Work in the physical place: you have to be there and interact with it (see "Verification without people" above).
5. Be finishable within the scheduled time, including walking between stops.
6. Give players something to talk about afterward.

### Safety rules (Locked)

Shown to players in plain words before the first mission, and built into every quest:

- Follow traffic laws. Use sidewalks and crosswalks.
- Respect businesses and residents. Don't disrupt other customers.
- Don't enter restricted areas.
- Follow host instructions.
- Stay within the gathering area.

No quest may reward speed between stops, ask players to go somewhere off-limits, or depend on blocking a sidewalk or a business.

### Backup plans (Locked)

- Every neighborhood has at least one backup quest that works in a public space (a puzzle on a mural, plaque or storefront) and needs no host, so a closed shop or a host who drops out doesn't stop the night.
- Swapping a quest is an admin edit: open the session in admin, change the quest's title, place, briefing, answer and pin. The quest's code and QR plaque stay the same, so nothing has to be reprinted.
- If a stop can't verify (bad GPS, missing answer), the host code or the game master's code is the backup. GPS and on-site answers stay the normal way to finish a stop.
- Signal drops: check-ins and answers made without signal are saved on the phone and sent automatically when the connection returns. XP is never counted twice.

## 9. Progression and scoring

**Locked:** XP, badges, levels that only go up, season progression. Leaderboards rank actions (quests completed, places discovered, judged challenges), **never money spent**. Only tournament teams appear on standings.

Prototype XP values (subject to playtesting):

| Action | XP |
| --- | --- |
| Attend a session | 50 |
| Complete a main quest | 25 |
| Find a hidden quest | 30 |
| Team completes every main quest | 20 each |

Goal of the values: a first-time player levels up during their first session, and a returning player sees visible progress every session.

Tournament points (Proposed, tournament teams only): quest completion, speed, accuracy and judged challenges, set per session by the game master.

Badges (Proposed): **Session** (numbered, matches the physical keepsake), **Founding** (registered for a chapter's first season), **Full season** (attended every session), **Two-city** (played in two chapters), **Chapter Champion** (won the Chapter Finals).

Deferred until after the pilot: level thresholds beyond the first few, cross-city and referral bonuses, badge rarity tiers.

Future badge ideas (not built; decide after the pilot): **Taster** (finished every tasting in a gathering) and **3 Gatherings** (played three gatherings).

## 10. Session flow and rituals

**Locked:** every session is bookended by ritual. The opening ritual turns strangers into teams; the closing ritual ends on standings and the next date.

| When | Phase | What happens | Pilot |
| --- | --- | --- | --- |
| Before | Pre-game | Team assignments and quest teasers by email or text | Yes |
| 24–48 h before | Reveal | Starting location revealed | Yes |
| Start | Opening ritual | Teams formed or reunited, materials handed out, story hook, first quest | Yes |
| Middle | Quests | Staggered starts; 3–4 hosted quests | Yes |
| Middle | Twist | A hidden quest or new clue revealed | Optional |
| End | Closing ritual | Shared meal, keepsakes, standings (tournament), next date | Yes |
| Same night | Debrief | Player survey; host debrief | Yes |
| After | Post-game | Photos, standings, teaser for the next session | Yes |

Opening: within minutes of arriving, every player is on a team with a quest in hand. Closing: end on a peak, with the next date announced last.

## 11. The flagship

**Locked:** a 2–3 day retreat with lodging and shared meals, once a year in a different host city. It hosts the **Championship** for tournament qualifiers and the **Explorer weekend** for casual players drawn by lottery. $725 per player.

Open questions: size (50 or 500?), individual vs. team spots, split between paths, guaranteed spots per city, lottery vs. threshold for Explorer entries.

## 12. Why people come back (Locked)

They return because their team is there, every gathering is new, and each one moves them closer to the flagship. The pull is belonging and progress, never obligation or penalty.

| Mechanic | How it shows up |
| --- | --- |
| Onboarding | The opening ritual puts you on a team with a quest within minutes |
| Fast feedback | Every quest completed updates your pass |
| Community | Teams that reunite; one shared goal each gathering |
| Leaderboards | Opt-in, on actions that matter, never money spent |
| Early commitment | Registering early locks a team spot and a Founding badge |
| Curiosity | Hidden quests, the location reveal, mystery rewards |
| Variety of choice | Exploring, making, performing, helping, meeting people |
| Special content | Each gathering's quests and keepsakes exist only there, only then |
| Infinite progress | Your level only goes up, in any city |
| Scarcity | Capped attendance, rare multi-city badges, earned flagship spots |

Fair play (Proposed): stops are verified without a person there: the phone must be at the stop's map pin and, where set, the team types an answer only visible on site (decided Sept 30, 2026); host codes stay as a backup, shown only after the quest is done; tournament teams add a photo at each stop (later); stagger starts and cap teams per stop; a simple code of play (respect hosts, non-players and neighbors); no joining the tournament after the season's 2nd session.

## 13. Hosts and chapter leads

**Locked:** local makers, cooks and guides host quests instead of renting tables; they're paid a host fee ($180–$240 per stop). A chapter playbook with fixed rituals, rules and standards keeps every city consistent. Each city's lead is trained and certified; leads grow from the most active alumni; later, chapters are licensed to partners.

Pilot: 3–4 paid quest hosts, a start venue, a final venue for the shared meal and finale, and one game master on the night. The app runs the quest flow (guided mode); the game master only handles exceptions, which is what lets a chapter run without a full-time game master.

## 14. Host-city value and impact (Locked)

Every host city should be measurably better off after a gathering. Quests route teams through local restaurants, shops, makers and landmarks so spending stays local.

| Impact report area | Measures |
| --- | --- |
| Economic | Spending at local businesses, money paid to hosts, out-of-town visitors, hotel nights |
| Community | Local groups and makers involved, new customers gained by hosts |
| Experience | Satisfaction, quest participation, friendships formed, intent to return |
| The business | Revenue, costs, returning players, returning sponsors, cities asking to host |

## 15. Business design constraints

Game mechanics must support the revenue model: tickets and memberships lead, booth fees disappear. See [pricing.md](pricing.md).

| Revenue source | What the game design must do |
| --- | --- |
| Gathering tickets ($75) and Season Pass ($280) | Make every gathering feel new and once-only |
| Vanguard membership ($360/yr, after pilot) | Progress that persists across cities, priority toward the flagship |
| Flagship ($725) | Make it the thing players have been playing toward |
| Sponsors | Fund quests, Chapter Finals or the Championship; part of the experience, not a banner |
| Cities, BIDs, tourism boards | Route quests through local businesses; produce the impact report |
| Chapter licensing | Keep the playbook portable |
| Keepsakes | Tie keepsakes to specific gatherings so collecting is part of play |
| Corporate private runs ($2,500) | Let companies book private sessions |

## 16. MVP: one city, one season

The pilot answers one question: **will someone who had a good time at gathering 1 come back to gathering 2 because their team and progress continue?**

**Locked scope:** Salt Lake City, one season of 3–4 gatherings, 30–50 players each, one walkable neighborhood (9th & 9th). Adults 18+. The first event is a small pilot/dry run in October 2026, before the full season. Persistent profiles, teams, XP, quests, casual/tournament choice. Build spec: [mvp-spec.md](mvp-spec.md).

**Pilot metrics (Oct 1, 2026):** the pilot measures what actually happens; it has no pass/fail targets. Its results become the baseline that later targets are set from.

| Area | What we measure | Where it comes from |
| --- | --- | --- |
| Return rate | Players who come back to a later gathering | Tickets and check-ins |
| Engagement | Teams finishing all main quests | Check-ins |
| Clarity | "Was it easy to understand what you were supposed to do?" | Survey |
| Enjoyment | Enjoyed the gathering, quests fun, neighborhood added to it, web pass | Survey |
| Best and worst quest | Most and least liked quest | Survey |
| Word of mouth | Would attend again; would recommend to a friend | Survey |
| What to change | One thing players would change, plus comments | Survey |
| Host value | Hosts who want to do it again | Asked after the gathering |
| Unit economics | Ticket price vs. cost per player | $75 vs. actual costs |

The survey is built into the player app (10 questions plus an optional comment), linked from the pass and the thank-you email after the gathering. Results: admin → session → Survey answers.

**Build order (Locked):** one city → persistent game → repeat behavior → local chapter model → multiple cities → flagship. Each step starts only when the one before it is proven.
