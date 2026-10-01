# CLAUDE.md: Colgrid

Instructions for Claude Code working in this repo. Read this first, every session.

## What Colgrid is

Colgrid is a persistent real-world team game. Teams (friends or strangers) meet in one walkable neighborhood for a 2–4 hour gathering and complete missions hosted by local makers, restaurants and guides. Players earn XP, levels and badges on a web pass that carries forward to every gathering and every city, building toward an annual flagship. Pilot: Chapter 01, Salt Lake City, 4 gatherings, 30–50 players each.

## Source of truth (read before building a feature)

| Topic | File |
| --- | --- |
| What to build now | `docs/mvp-spec.md` |
| Game rules, pillars, XP, rituals | `docs/game-design.md` |
| Voice, colors, type, touchpoints | `docs/brand-identity.md` |
| Prices | `docs/pricing.md` |
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

## Current focus (Sept 30, 2026)

- Tournament paused (`SITE.tournamentOpen = false`): no standings or tournament switch for players. Rules 1–2 still hold for when it returns.
- Oct 17 = 3–4 quests + tastings + finale meal + player pass. The app runs the night. Check-in at the start is by GPS (start pin + radius, no sign; start code as a spoken backup). Stops are verified by location + on-site answer, with host codes as backup.
- Design challenges around being physically present, not around beating AI. Rotate locations and questions.
- Two domains, one app: getcolgrid.com is the public site (home, tickets, corporate, hosts, contact, legal); colgrid.app is the player app (sign-in, pass, check-in, team) and crew tools. `middleware.ts` moves player pages to colgrid.app; player links in emails and QR codes use `SITE.appUrl`.
- Public site style: Apple-like. No small labels/eyebrows above headlines, short copy, lots of space, one orange CTA per section at most.
- Support: game-day help is call/text (801) 441-3621 (Quo), shown on the pass and in player emails only. General questions go through the contact form (stored in Leads, emailed privately to colgridco@gmail.com, protected by Cloudflare Turnstile). Never show an email address on the site. Instagram DMs are secondary.

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
