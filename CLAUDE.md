# CLAUDE.md: Colgrid

Instructions for Claude Code working in this repo. Read this first, every session.

## What Colgrid is

Colgrid is an ongoing, self-guided city game. Players sign up free, start a team, invite friends with a link and play **routes** (a few stops through one neighborhood) whenever the places are open. No host, no ticket, no schedule. Stops are verified by the phone's location plus an on-site answer. Players earn XP, levels and badges on a web pass that carries forward to every route and every city. Chapter 01 is Salt Lake City. Hosted experiences (company events, special nights) may come back later as a premium layer on the same app.

## Source of truth (read before building a feature)

| Topic | File |
| --- | --- |
| What to build now | `docs/mvp-spec.md` |
| Game rules, pillars, XP, rituals | `docs/game-design.md` |
| Voice, colors, type, touchpoints | `docs/brand-identity.md` |
| Prices | `docs/pricing.md` (the $75 ticket model there is historical; see its Oct 1 note) |
| Business context | `docs/business-plan.md`, `business/` |
| Logo | `brand/colgrid-logo.png` (primary), `brand/colgrid-logo-alt.png` |
| Screen designs | `design/README.md`, `design/mockups/` |

If code and docs disagree, the docs win; ask before changing a rule. Match the mockups for look and layout, but take numbers and rules from `docs/` (see the known differences in `design/README.md`).

## Rules that must never break

1. **Casual by default.** No player or team is ranked unless their team opted into the tournament. Casual teams never appear on standings.
2. **Tournament opt-in** is allowed only before the season's 2nd session starts; dropping back to casual is always allowed.
3. **Progress only goes up.** XP is append-only; levels and badges are never taken away.
4. **Never rank or reward money spent.**
5. **Every gathering happens once.** Quests are never reused across sessions.
6. **Hidden stays hidden** until revealed (start location, hidden quests).
7. Stay in MVP scope (`docs/mvp-spec.md`). No native app, no built-in checkout, no chat.

## Current focus (Oct 2, 2026)

- **The public site follows the Oct 2 blueprint: paid civic action and crowdsourced field operations.** Organizations (business districts, city groups, nonprofits, developers) pay Colgrid as a contractor to mobilize everyday citizens, coordinate field work and deliver verified impact. Citizens take part for free. Copy, examples, the sample report, prices and payment terms live in `CHALLENGE` in `lib/site.ts`.
- **Pages:** `/` (hero, core model, organizations vs. residents, what we solve, outcome report, lead form), `/how-it-works`, `/pricing`, `/contact`.
- **Words:** challenge, field operation, residents, citizens, Outcome Report, verified. It is not a game: on the public site don't say game, mission, quest, XP, players or play. (Player screens on colgrid.app keep their game language.)
- **Lead intake:** the home-page form asks name, email, organization, location, primary objective and target timeline, and is stored as a corporate lead whose message starts "Challenge inquiry". When `SITE.schedulerUrl` is set, the thanks page offers the 20-minute call.
- **Still never show an email address on the site** (the blueprint asked for one; the contact form stays instead until Matt decides).
- **Use photos of real people.** The hero and each "what we solve" card take a photo (`heroPhoto`, `photo`); cards without one show a colored tile.
- **Hosted nights moved to `/nights`** (linked in the footer), unchanged. Open Play stays on colgrid.app, not promoted.
- Home-page inquiries use the corporate lead form (`<LeadForm kind="corporate" challenge />`) and arrive marked "Challenge inquiry".

### Oct 1, 2026, evening (hosted nights; still true for `/nights`)

- **Hosted social nights are what the public site sells.** Ticketed nights for meeting new people (first: Game Night for Singles, ages 21 to 35), sold on Eventbrite. The home page leads to the next night; its details live in `NIGHT` in `lib/site.ts`. This replaces the earlier "no Eventbrite, no ticketed events" rule for the public site.
- **Still no built-in checkout** (rule 7): the site links out to Eventbrite.
- **Don't name the venue until it has confirmed in writing** (`NIGHT.venueConfirmed`).
- **Open Play is kept, not promoted.** The player app, routes, pass, XP and badges stay in place on colgrid.app and are not mentioned on the public home page for now. Don't delete them.

### Earlier the same day (Open Play; kept for reference)

- **Open Play is the product.** Free sign-up, teams, invite links, routes, location checks, on-site answers, XP, levels, badges, the pass and repeat play. Route 01 and Route 02 (Season 10 · Open Play) are built and stay closed until phone testing with friends passes.
- **No Eventbrite and no ticketed events.** The Oct 17 event and the $75 ticket model are dropped. Nothing in the public site or the Open Play flow may require or mention a ticket.
- **Hosted-event tools stay, hidden.** Ticket table, CSV import, start pin/start code, game master console, reveal and thank-you emails are kept for future hosted or company experiences. Players never see them; don't delete them.
- **No payments yet.** No subscriptions, in-app payments or payment processor. When the first paid route comes, plan around Stripe (web checkout on Colgrid's own site).
- **Business direction (to test, not build):** free core Open Play → paid premium routes/experiences later → optional membership if repeat play supports it → separate revenue from company experiences and business partnerships.
- **Founding badge is inactive** until a new rule is chosen.
- Tournament paused (`SITE.tournamentOpen = false`): no standings or tournament switch for players. Rules 1–2 still hold for when it returns.
- Design challenges around being physically present, not around beating AI. Rotate locations and questions.
- Two domains, one app: getcolgrid.com is the public site (home, companies, hosts, contact, legal); colgrid.app is the player app (sign-in, pass, routes, check-in, team, invites) and crew tools. `middleware.ts` moves player pages to colgrid.app; player links in emails and QR codes use `SITE.appUrl`.
- Public site style: Apple-like. No small labels/eyebrows above headlines, short copy, lots of space, one orange CTA per section at most.
- Support: help is call/text (801) 441-3621 (Quo), shown on the pass and in player emails only. General questions go through the contact form (stored in Leads, emailed privately to colgridco@gmail.com, protected by Cloudflare Turnstile). Never show an email address on the site. Instagram DMs are secondary.

## Brand in the UI

- Name: **Colgrid** (never "The Gathering" or any other old working name).
- Colors: Asphalt `#1A1D20` (base), Beacon Amber `#FF9F1C` (actions, XP), Concrete `#F4F5F7` (cards), Chapter Teal `#2EC4B6` (explorer/casual, discovery), Signal Red `#E71D36` (tournament, standings).
- Fonts (Google Fonts): Chakra Petch (headlines), Space Grotesk (body), JetBrains Mono (stats/codes).
- Voice: casual, playful, a little secretive, welcoming. Plain instructions, mysterious story. Example: "Your team's been assigned. Location drops Thursday at 6."
- Words to use: mission, quest, team, unlock, reveal, level up, chapter, season. Avoid: scavenger hunt, tour, event, vendor.
- Use the logo files as provided. Do not redraw, recolor or alter the logo.
- Mobile first, high contrast, large tap targets: players use it outdoors.

## Terminology

Network (all cities) → Chapter (a city, "Chapter 01: Salt Lake") → Season (4–5 sessions) → Session (one gathering) → Chapter Finals → Flagship (Championship + Explorer weekend).

## Stack (suggested in the spec)

Next.js on Vercel, Supabase (Postgres, magic-link auth, row-level security), Resend for email, Stripe Payment Links or Eventbrite for tickets. Keep dependencies few.

## Working style

- Build in the order listed in `docs/mvp-spec.md`.
- Small commits with clear messages; one feature per branch/PR.
- Write seed data for Chapter 01 so every screen can be tried locally.
