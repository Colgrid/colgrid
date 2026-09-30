import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TabBar from "@/app/components/TabBar";
import { loadPass } from "@/app/pass/data";
import { formatNumber } from "@/lib/game/levels";
import { rows } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Standings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = { rank: number; team_id: string; team_name: string; points: number; quests_completed: number };

// Tournament teams only. Casual teams are never ranked (CLAUDE.md rule 1).
const FINALS_CUT = 4; // top 4 play the Chapter Finals (docs/mvp-spec.md, user flow 9)

export default async function StandingsPage() {
  const pass = await loadPass();
  if (!pass) redirect("/signin?next=/standings");
  const season = pass.kind === "pass" ? pass.season : null;
  const myTeam = pass.kind === "pass" ? pass.team?.id : null;

  let table: Row[] = [];
  if (season) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("season_standings", { p_season_id: season.id });
    table = rows<Row>(data);
  }
  const pilot = season?.number === 0;
  const lastClosed = pass.kind === "pass" ? pass.sessions.last : null;
  const live = pass.kind === "pass" ? pass.sessions.live : null;

  return (
    <>
      <main className="page page--tabs">
        <p className="mono eyebrow" style={{ color: pilot ? "var(--ink-subtle)" : "var(--signal-red-text)" }}>
          {pilot ? "SEASON 00 · PILOT" : `TOURNAMENT${season ? ` · SEASON ${formatNumber(season.number)}` : ""}`}
        </p>
        <h1 style={{ fontSize: 34, marginTop: 8 }}>
          Chapter {pass.kind === "pass" && pass.chapter ? formatNumber(pass.chapter.number) : "01"} standings
        </h1>
        {(lastClosed || live) && (
          <p className="lede" style={{ fontSize: 15 }}>
            {lastClosed ? `After Session ${formatNumber(lastClosed.number)}` : ""}
            {lastClosed && live ? " · " : ""}
            {live ? `Session ${formatNumber(live.number)} live` : ""}
          </p>
        )}

        {pilot ? (
          <p className="empty" style={{ marginTop: 20 }}>
            The pilot is casual, so nobody is ranked. Standings start with Season 1.
          </p>
        ) : table.length === 0 ? (
          <p className="empty" style={{ marginTop: 20 }}>
            No tournament teams yet. Teams can opt in from the Team tab before Session 02 starts.
          </p>
        ) : (
          <ol className="standings">
            {table.map((r, i) => (
              <li key={r.team_id} className={r.team_id === myTeam ? "standings__row standings__row--me" : "standings__row"}>
                {i === FINALS_CUT && <span className="standings__cut mono">FINALS CUT</span>}
                <span className="standings__rank mono">{r.rank}</span>
                <span className="standings__team">
                  <strong>
                    {r.team_name}
                    {r.team_id === myTeam ? " · you" : ""}
                  </strong>
                  {i < FINALS_CUT && <span className="chip chip--tournament standings__chip">FINALS</span>}
                </span>
                <span className="standings__pts mono">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="fine-print" style={{ textAlign: "center" }}>
          Casual teams aren&apos;t ranked.
        </p>
      </main>
      <TabBar active="standings" />
    </>
  );
}
