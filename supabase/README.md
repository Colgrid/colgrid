# Colgrid database (Supabase)

| File | What it does |
| --- | --- |
| `migrations/20260928000001_init.sql` | All tables, the game rules, and row-level security |
| `seed.sql` | Sample data: Chapter 01 Salt Lake, Season 1, 4 sessions, 18 quests, 6 teams, 30 players (made up) |
| `tests/10_rules.test.sql` | 13 checks that the rules hold |
| `tests/00_local_supabase_stub.sql` | Local testing only; never run on Supabase |

## Set up your Supabase project (one time)

1. Open your project at supabase.com and go to **SQL Editor → New query**.
2. Paste the whole of `migrations/20260928000001_init.sql` and click **Run**. You should see "Success. No rows returned."
3. Optional, for trying things out: open a new query, paste `seed.sql`, and click **Run**. This adds sample players and teams. Skip it for the real pilot, or remove the sample data before launch.
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. These go in `.env.local` locally and in Vercel's environment variables later (see `.env.example`).

## Rules the database enforces

| Rule (CLAUDE.md) | How |
| --- | --- |
| Casual by default | `team.mode` defaults to `casual` |
| Tournament opt-in closes when Session 02 starts; casual any time | `team_mode_rules` trigger |
| Progress only goes up | `xp_event` and `player_badge` reject edits and deletes; XP must be positive |
| Casual teams never ranked | `season_standings()` returns tournament teams only; casual completions carry no points |
| Quests never reused | each quest belongs to one session; codes are unique |
| Hidden stays hidden | players read sessions and quests only through `player_sessions()` / `player_quests()`, which mask unrevealed locations and hidden quests and never return codes or host fees |
| Players see only their own pass and team | row-level security on every table |

## Run the tests locally (developers)

On any machine with Postgres 15+:

```
createdb colgrid_test
psql -d colgrid_test -f supabase/tests/00_local_supabase_stub.sql
psql -d colgrid_test -f supabase/migrations/20260928000001_init.sql
psql -d colgrid_test -f supabase/seed.sql
psql -d colgrid_test -f supabase/tests/10_rules.test.sql
```

Every line should read `PASS`.
