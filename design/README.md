# Colgrid design

Mobile mockups from Claude Design (Sep 28, 2026), 390 × 844.

| File | What it is |
| --- | --- |
| `mockups/Colgrid Mobile.dc.html` | All screens side by side. Open with `support.js` and `assets/` next to it |
| `mockups/screens-player-flow.png` | Snapshot: Home, Sign in, Pass (Casual + Tournament), Check in + success, Team, Standings |
| `mockups/screens-crew-and-style.png` | Snapshot: Game master console, Admin, style sheet |

The logo in `mockups/assets/` is the primary logo (`brand/colgrid-logo.png`). The first export used the alternate logo; it was swapped so the mockups match the brand files.

## Use the mockups for look and layout; use the docs for numbers and rules

Where the mockups and `docs/` disagree, **the docs win**. Known differences to correct when building:

| In the mockups | Correct value (source) |
| --- | --- |
| Main quests worth +40 to +60 XP; hidden quest +75 | Main quest **25 XP**, hidden quest **30 XP**, attend **50 XP**, all main quests done **+20 each** (`docs/game-design.md` §9) |
| Success screen shows +25 XP but the same quest is +40 on the pass; level-up shows 1,005 / 1,000 from 680 | XP shown must match the quest; level thresholds from `docs/mvp-spec.md` |
| Session dates Sep–Dec (Admin, Home) | Pilot dates not set; projections assume the first gathering in Feb 2027 |
| Host payouts shown on quest rows ($180–$220) | Fine for admin only; never show host pay to players |
| "Close session" button sits under the home indicator on the GM console | Keep it fully visible above the safe area |

## Keep from the mockups

- Dark Asphalt base, amber for the active quest and XP, teal for casual/discovery, red for tournament
- Red text on dark uses `#FF5A6E` for contrast; solid `#E71D36` only as a fill behind white text
- Quest states: done (teal check), active (amber, one at a time), locked (dashed), hidden (striped)
- Casual players see Explorer lottery progress; tournament players see rank, points and the Finals path
- Standings list only tournament teams, with "Casual teams aren't ranked"
- Bottom tabs: Pass · Check in · Team · Standings
