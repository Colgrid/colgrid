# Colgrid

A persistent real-world team game. Teams take on missions through a city, hosted by local makers and businesses, and build a record that follows them from gathering to gathering and city to city. Play casually by default, or opt into the tournament and compete for the championship.

**Pilot:** Chapter 01, Salt Lake City · 4 gatherings · 30–50 players each
**Web:** getcolgrid.com (main) · colgrid.co · colgrid.app

## Repo map

```
CLAUDE.md                 Instructions for Claude Code (read first)
docs/
  mvp-spec.md             What to build for the pilot: screens, flows, data, rules
  game-design.md          Game rules, pillars, XP, rituals, two ways to play
  brand-identity.md       Wheeler's five phases: audience, voice, colors, type, touchpoints
  pricing.md              Prices and unit economics
  business-plan.md        Business plan (Markdown copy)
design/
  README.md               Notes on the mockups and known fixes
  mockups/                Claude Design screens (HTML + PNG snapshots)
brand/
  colgrid-logo.png        Primary logo
  colgrid-logo-alt.png    Alternate logo
business/
  Colgrid_Business_Plan.docx
  Colgrid_Projections_2026.xlsx
  Colgrid_Brand_Identity.docx
```

## How to build

1. **Design:** done. Mockups are in `design/mockups/`; read `design/README.md` for the fixes to apply.
2. **Build:** open this repo in Claude Code. It reads `CLAUDE.md` automatically. Start with step 1 of the build order in `docs/mvp-spec.md`.
3. **Test:** dry run with 6–8 friends before gathering 1.

## Status

- Name: Colgrid (official Sep 28, 2026). USPTO trademark search pending (classes 41 and 9).
- Brand: Phases 1–2 done; Phases 3–5 drafted.
- Product: MVP spec written; mockups done; build steps 1 (foundation), 2 (magic-link sign-in and player pass) 3 (quest check-in, XP, level up), 5 (game master console) and 6 (admin: sessions, quests, hosts, QR plaques, Eventbrite import, welcome emails) done.

## For developers

```
cp .env.example .env.local   # add your Supabase URL and anon key
npm install
npm run dev                  # http://localhost:3000
npm test                     # XP, level, pass and check-in logic tests
```

Database setup and rule tests: see `supabase/README.md`.
