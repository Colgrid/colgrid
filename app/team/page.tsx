import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TabBar from "@/app/components/TabBar";
import { loadPass } from "@/app/pass/data";
import { formatLevel, formatNumber, levelFor } from "@/lib/game/levels";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { formatWhen } from "@/lib/time";
import { setTeamMode } from "./actions";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Team = {
  id: string;
  name: string;
  mode: "casual" | "tournament";
  opt_in_closed: boolean;
  members: { name: string; is_me: boolean; xp: number }[];
  history: {
    number: number;
    neighborhood: string | null;
    starts_at: string | null;
    status: "scheduled" | "live" | "closed";
    quests_total: number;
    quests_done: number;
    hidden_found: number;
    players: number;
    i_was_there: boolean;
  }[];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const pass = await loadPass();
  if (!pass) redirect("/signin?next=/team");

  let team: Team | null = null;
  const season = pass.kind === "pass" ? pass.season : null;
  if (season) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("my_team", { p_season_id: season.id });
    team = (data as Team | null) ?? null;
  }
  const pilot = season?.number === 0;
  const chapter = pass.kind === "pass" && pass.chapter ? `CHAPTER ${formatNumber(pass.chapter.number)}` : "";

  return (
    <>
      <main className="page page--tabs">
        <p className="mono eyebrow" style={{ color: "var(--ink-subtle)" }}>
          YOUR TEAM{chapter ? ` · ${chapter}` : ""}
        </p>

        {!team ? (
          <>
            <h1 style={{ fontSize: 34, marginTop: 8 }}>No team yet.</h1>
            <p className="lede">Your team drops at the opening ritual. Solo? You&apos;ll be placed on one, and they&apos;ll be waiting for you next time too.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 34, marginTop: 8 }}>{team.name}</h1>
            {msg && (
              <p className="gm-msg" role="status">
                {msg}
              </p>
            )}

            <ul className="roster">
              {team.members.map((m, i) => (
                <li key={i} className={m.is_me ? "roster__me" : ""}>
                  <span className="roster__dot" aria-hidden="true">
                    {initials(m.name)}
                  </span>
                  <span className="roster__name">{m.is_me ? "You" : m.name.split(" ")[0]}</span>
                  <span className="roster__lvl mono">{formatLevel(levelFor(m.xp).level)}</span>
                </li>
              ))}
            </ul>

{SITE.tournamentOpen && (
            <section className="mode-card">
              <h2 className="section__title">How your team plays</h2>
              {pilot ? (
                <p className="mode-card__rules">
                  The pilot is casual: you earn XP, levels and badges, and nobody is ranked. The tournament opens with Season 1.
                </p>
              ) : (
                <>
                  <div className="mode-toggle" role="group" aria-label="Play mode">
                    <form action={setTeamMode}>
                      <input type="hidden" name="team_id" value={team.id} />
                      <input type="hidden" name="mode" value="casual" />
                      <button type="submit" className={team.mode === "casual" ? "on on--casual" : ""} aria-pressed={team.mode === "casual"}>
                        Casual
                      </button>
                    </form>
                    <form action={setTeamMode}>
                      <input type="hidden" name="team_id" value={team.id} />
                      <input type="hidden" name="mode" value="tournament" />
                      <button
                        type="submit"
                        className={team.mode === "tournament" ? "on on--tournament" : ""}
                        aria-pressed={team.mode === "tournament"}
                        disabled={team.mode !== "tournament" && team.opt_in_closed}
                      >
                        Tournament
                      </button>
                    </form>
                  </div>
                  <p className="mode-card__rules">
                    {team.mode === "tournament"
                      ? team.opt_in_closed
                        ? "You're in the tournament: points, standings and a shot at the Chapter Finals. You can drop to casual any time, but sign-up is closed, so you couldn't rejoin this season."
                        : "You're in the tournament: points, standings and a shot at the Chapter Finals. You can switch back to casual any time."
                      : team.opt_in_closed
                        ? "You earn XP and badges. No ranking. Tournament sign-up closed when Session 02 started."
                        : "You earn XP and badges. No ranking. Anyone on the team can join the tournament before Session 02 starts, and you can switch back to casual any time."}
                  </p>
                </>
              )}
            </section>
            )}

            <section className="section">
              <h2 className="section__title">Team history</h2>
              <ol className="history">
                {team.history.map((h) => {
                  const label = h.neighborhood ?? `Session ${formatNumber(h.number)}`;
                  return (
                    <li key={h.number} className={`history__row history__row--${h.status}`}>
                      <span className="history__num mono">{formatNumber(h.number)}</span>
                      <span className="history__main">
                        <strong>{label}</strong>
                        <span>
                          {h.status === "scheduled"
                            ? `${formatWhen(h.starts_at)} · location sealed until 48h before`
                            : `${h.status === "live" ? "Tonight" : formatWhen(h.starts_at).split(",").slice(0, 2).join(",")} · ${h.quests_done} of ${h.quests_total} quests${h.hidden_found ? ` · ${h.hidden_found} hidden found` : ""} · ${h.players} players${h.status === "closed" && !h.i_was_there ? " · you missed this one" : ""}`}
                        </span>
                      </span>
                      {h.status === "live" && <span className="status status--live">LIVE</span>}
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </main>
      <TabBar active="team" />
    </>
  );
}
