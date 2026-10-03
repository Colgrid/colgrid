# Colgrid database (Supabase)

| File | What it does |
| --- | --- |
| `migrations/20260928000001_init.sql` | All tables, the game rules, and row-level security |
| `migrations/20260928000002_signin.sql` | Sign-in: links a ticket to an account by email and awards the Founding badge |
| `migrations/20260928000003_grants.sql` | Lets the website's signed-in and signed-out roles reach the tables (row-level security still decides which rows) |
| `migrations/20260929000007_add_player.sql` | Add one player by hand (comps, walk-ins) from the admin or the console |
| `migrations/20260929000008_team.sql` | `my_team()`: the Team screen's roster (no emails), mode and session history |
| `migrations/20260930000009_auto_reveal.sql` | The reveal email sends itself: `cron_due_reveals()` behind a database-only secret |
| `migrations/20260930000011_leads.sql` | Corporate and host forms: `submit_lead()` (anyone), `lead` table (admins only) |
| `migrations/20260930000012_guided.sql` | Guided mode: mission briefings, puzzle answers, start code self check-in, route slots, finale |
| `migrations/20260930000013_location.sql` | Verify stops with no one there: map pin + radius, on-site answer, short stay; `complete_mission()` |
| `migrations/20260930000014_contact.sql` | The contact form (no public email address) |
| `migrations/20260930000015_share.sql` | Sharing phase 1: `log_share()` and share counts (admins only) |
| `migrations/20260930000016_start_gps.sql` | Check in at the start by GPS: start pin + radius, `arrive_here()` |
| `migrations/20260930000010_reveal_schedule.sql` | Supabase only: pings the site every 5 minutes (pg_cron + pg_net). Skip it in local tests |
| `migrations/20260928000006_gm.sql` | Game master console: attendance, start/close (session badge), survey link |
| `migrations/20260928000005_admin.sql` | Admin: pilot season (Season 00), tickets, generated quest codes, Eventbrite import, "coming with" answer |
| `migrations/20260928000004_checkin.sql` | Quest check-in: codes, XP to present teammates, tournament points, all-quests bonus, code-guessing limit |
| `migrations/20261002000020_challenges.sql` | Paid challenges: photo proof (table + private `proof` storage bucket), rewards and their fulfilment, the Outcome Report (`challenge_report()`), and the columns that mark a client's challenge. **Not applied yet: review, then paste into the SQL Editor** |
| `seed.sql` | Sample data: Chapter 01 Salt Lake, Season 1, 4 sessions, 18 quests, 6 teams, 30 players (made up) |
| `tests/10_rules.test.sql` | 13 checks that the rules hold |
| `tests/20_signin.test.sql` | 6 checks that sign-in links the right pass |
| `tests/30_checkin.test.sql` | 13 checks on check-in and XP |
| `tests/40_admin.test.sql` | 6 checks on the admin import |
| `tests/50_gm.test.sql` | 3 checks on running the night |
| `tests/60_add_player.test.sql` | 3 checks on adding a player by hand |
| `tests/70_team.test.sql` | 3 checks on the Team screen |
| `tests/80_auto_reveal.test.sql` | 2 checks on the automatic reveal email |
| `tests/90_leads.test.sql` | 3 checks on the lead forms |
| `tests/95_guided.test.sql` | 3 checks on guided mode |
| `tests/96_location.test.sql` | 2 checks on location verification |
| `tests/97_share.test.sql` | 3 checks on share counts |
| `tests/98_start_gps.test.sql` | 1 check on GPS check-in at the start |
| `tests/99_x_challenges.test.sql` | 8 checks on photo proof, rewards and the Outcome Report |
| `templates/` | Branded sign-in emails to paste into Supabase |
| `tests/00_local_supabase_stub.sql` | Local testing only; never run on Supabase |

## Set up your Supabase project (one time)

1. Open your project at supabase.com and go to **SQL Editor → New query**.
2. Paste the whole of `migrations/20260928000001_init.sql` and click **Run**. You should see "Success. No rows returned."
3. Optional, for trying things out: open a new query, paste `seed.sql`, and click **Run**. This adds sample players and teams. Skip it for the real pilot, or remove the sample data before launch.
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. These go in `.env.local` locally and in Vercel's environment variables later (see `.env.example`).

## Sign-in setup (step 2, one time)

1. **Run the sign-in migrations.** SQL Editor → New query → paste `migrations/20260928000002_signin.sql` → **Run**. Then do the same with `migrations/20260928000003_grants.sql`.
2. **Tell Supabase where links go.** Authentication → URL Configuration:
   - Site URL: `https://getcolgrid.com`
   - Redirect URLs: add `https://getcolgrid.com/**` (and `http://localhost:3000/**` if you run it locally)
3. **Send email through Resend.** Project Settings → Authentication → SMTP Settings → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key
   - Sender email: `pass@getcolgrid.com` (the domain must be verified in Resend first), sender name `Colgrid`
   - Keep the API key here only. Never put it in GitHub or in a `NEXT_PUBLIC_` variable.
4. **Use the Colgrid emails.** Authentication → Emails. For **Magic Link** and **Confirm signup**, paste the matching file from `templates/` into the message body and use the subject written at the top of the file. These links open `/auth/confirm`, which works even when the email opens in a different browser.
5. **Make yourself the admin.** Sign in once at getcolgrid.com/signin with your email, then run:

   ```sql
   insert into public.staff (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com'
   on conflict (user_id) do update set role = 'admin';
   ```

   Your pass page will show "CREW". The console itself arrives in step 5.

### Try the pass with sample data

If you ran `seed.sql`, give yourself Rosa's pass (sample player, 250 XP, The Night Owls) **before** signing in:

```sql
update public.player set email = 'you@example.com' where email = 'rosa.delgado@example.com';
```

Sign in with that email and the pass opens with her team, level, quests and badges. Seed dates are relative to when you ran it, so Session 02 shows as live.

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
| A code counts once per team; XP to present teammates; points for tournament teams only | `check_in()`, `completion` primary key, `xp_event_once` index |
| No XP awarded twice | unique `(player, reason, source)` on `xp_event` |
| No guessing codes | 8 wrong codes in 10 minutes pauses check-in (`check_in_attempt`) |
| A pass belongs to the ticket's email | `claim_my_pass()` links only a confirmed email to the player row with the same email |

## Run the tests locally (developers)

On any machine with Postgres 15+:

```
createdb colgrid_test
psql -d colgrid_test -f supabase/tests/00_local_supabase_stub.sql
psql -d colgrid_test -f supabase/migrations/20260928000001_init.sql
psql -d colgrid_test -f supabase/migrations/20260928000002_signin.sql
psql -d colgrid_test -f supabase/migrations/20260928000003_grants.sql
psql -d colgrid_test -f supabase/migrations/20260928000004_checkin.sql
psql -d colgrid_test -f supabase/migrations/20260928000005_admin.sql
psql -d colgrid_test -f supabase/migrations/20260928000006_gm.sql
psql -d colgrid_test -f supabase/migrations/20260929000007_add_player.sql
psql -d colgrid_test -f supabase/migrations/20260929000008_team.sql
psql -d colgrid_test -f supabase/migrations/20260930000009_auto_reveal.sql
psql -d colgrid_test -f supabase/migrations/20260930000011_leads.sql
psql -d colgrid_test -f supabase/migrations/20260930000012_guided.sql
psql -d colgrid_test -f supabase/migrations/20260930000013_location.sql
psql -d colgrid_test -f supabase/migrations/20260930000014_contact.sql
psql -d colgrid_test -f supabase/migrations/20260930000015_share.sql
psql -d colgrid_test -f supabase/migrations/20260930000016_start_gps.sql
psql -d colgrid_test -f supabase/seed.sql
psql -d colgrid_test -f supabase/tests/10_rules.test.sql
psql -d colgrid_test -f supabase/tests/20_signin.test.sql
psql -d colgrid_test -f supabase/tests/30_checkin.test.sql
psql -d colgrid_test -f supabase/tests/40_admin.test.sql
psql -d colgrid_test -f supabase/tests/50_gm.test.sql
psql -d colgrid_test -f supabase/tests/60_add_player.test.sql
psql -d colgrid_test -f supabase/tests/70_team.test.sql
psql -d colgrid_test -f supabase/tests/80_auto_reveal.test.sql
psql -d colgrid_test -f supabase/tests/90_leads.test.sql
psql -d colgrid_test -f supabase/tests/95_guided.test.sql
psql -d colgrid_test -f supabase/tests/96_location.test.sql
psql -d colgrid_test -f supabase/tests/97_share.test.sql
psql -d colgrid_test -f supabase/tests/98_start_gps.test.sql
```

Every line should read `PASS`.
