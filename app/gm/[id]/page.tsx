import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";
import Clock from "../Clock";
import AddPlayerForm from "@/app/components/AddPlayerForm";
import {
  assignTeam,
  autoTeams,
  closeSession,
  createTeam,
  markPresent,
  renameTeam,
  revealLocation,
  saveSurvey,
  scoreJudged,
  startSession,
} from "../actions";

export const metadata: Metadata = { title: "Run sheet", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Session = {
  id: string;
  number: number;
  season_id: string;
  neighborhood: string | null;
  starts_at: string | null;
  start_location: string | null;
  revealed_at: string | null;
  status: "scheduled" | "live" | "closed";
  survey_url: string | null;
  season: { number: number; name: string | null } | null;
};
type Ticket = { order_ref: string | null; player: { id: string; name: string; email: string } | null };
type Team = { id: string; name: string; mode: "casual" | "tournament"; team_member: { player_id: string }[] };
type Quest = { id: string; title: string; stop_number: number | null; is_hidden: boolean; is_judged: boolean; max_points: number | null };
type Completion = { quest_id: string; team_id: string; points: number | null };

const pad = (n: number) => String(n).padStart(2, "0");

export default async function RunSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  const { supabase } = await requireStaff();

  const { data: sessionData } = await supabase
    .from("session")
    .select("id, number, season_id, neighborhood, starts_at, start_location, revealed_at, status, survey_url, season:season_id (number, name)")
    .eq("id", id)
    .maybeSingle();
  const session = sessionData as unknown as Session | null;
  if (!session) notFound();

  const [ticketRes, attendanceRes, teamRes, questRes] = await Promise.all([
    supabase.from("ticket").select("order_ref, player:player_id (id, name, email)").eq("session_id", id),
    supabase.from("attendance").select("player_id").eq("session_id", id),
    supabase.from("team").select("id, name, mode, team_member (player_id)").eq("season_id", session.season_id).order("name"),
    supabase.from("quest").select("id, title, stop_number, is_hidden, is_judged, max_points").eq("session_id", id),
  ]);
  const tickets = rows<Ticket>(ticketRes.data).filter((t) => t.player);
  const present = new Set(rows<{ player_id: string }>(attendanceRes.data).map((a) => a.player_id));
  const teams = rows<Team>(teamRes.data);
  const quests = rows<Quest>(questRes.data);
  const { data: completionData } = quests.length
    ? await supabase.from("completion").select("quest_id, team_id, points").in("quest_id", quests.map((q) => q.id))
    : { data: [] };
  const completions = rows<Completion>(completionData);

  const teamOf = new Map<string, Team>();
  teams.forEach((t) => t.team_member.forEach((m) => teamOf.set(m.player_id, t)));
  const ticketIds = new Set(tickets.map((t) => t.player!.id));
  // Teams with someone holding a ticket for tonight (the season can have teams from other nights).
  const tonightTeams = teams.filter((t) => t.team_member.some((m) => ticketIds.has(m.player_id)) || t.team_member.length === 0);
  const unassigned = tickets.filter((t) => !teamOf.has(t.player!.id));
  const mainQuests = quests.filter((q) => !q.is_judged);
  const judged = quests.filter((q) => q.is_judged);
  const tournamentTeams = tonightTeams.filter((t) => t.mode === "tournament");
  const revealed = !!session.revealed_at && new Date(session.revealed_at).getTime() <= Date.now();
  const sessionName = `${session.season?.number === 0 ? "Pilot " : ""}Session ${pad(session.number)}`;

  const playerRow = (t: Ticket) => {
    const p = t.player!;
    const here = present.has(p.id);
    const team = teamOf.get(p.id);
    return (
      <li key={p.id} className="gm-player">
        <div className="gm-player__who">
          <strong>{p.name}</strong>
          <span>
            {p.email}
            {t.order_ref ? ` · order ${t.order_ref}` : ""}
          </span>
        </div>
        {!here && session.status !== "closed" && (
          <form action={assignTeam} className="gm-inline">
            <input type="hidden" name="session_id" value={id} />
            <input type="hidden" name="player_id" value={p.id} />
            <select name="team_id" defaultValue={team?.id ?? ""} aria-label={`Team for ${p.name}`}>
              <option value="">No team</option>
              {tonightTeams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
            <button type="submit" className="gm-small">
              Move
            </button>
          </form>
        )}
        {here ? (
          <span className="gm-here">✓ Here</span>
        ) : session.status !== "closed" ? (
          <form action={markPresent}>
            <input type="hidden" name="session_id" value={id} />
            <input type="hidden" name="player_id" value={p.id} />
            <button type="submit" className="gm-present" disabled={!team}>
              {team ? "Here" : "Needs team"}
            </button>
          </form>
        ) : (
          <span className="gm-absent">Didn&apos;t come</span>
        )}
      </li>
    );
  };

  return (
    <main className="page gm">
      <p className="mono eyebrow">
        <Link href="/gm">← RUN SHEETS</Link>
      </p>
      <h1 style={{ fontSize: 30, marginTop: 8 }}>Run sheet · {sessionName}</h1>
      <p className="mono gm-sub">
        {(session.neighborhood ?? "").toUpperCase()} · {formatWhen(session.starts_at).toUpperCase()}
      </p>

      {msg && (
        <p className="gm-msg" role="status">
          {msg}
        </p>
      )}

      <div className="gm-stats">
        <div className="gm-stat gm-stat--light">
          <span className="mono">CHECKED IN</span>
          <strong className="mono">
            {present.size}
            <small>/{tickets.length}</small>
          </strong>
        </div>
        <div className="gm-stat">
          <span className="mono">TEAMS</span>
          <strong className="mono">{tonightTeams.length}</strong>
        </div>
        <div className="gm-stat">
          <span className="mono">CLOCK</span>
          <strong className="mono gm-clock">{session.status === "live" ? <Clock since={session.starts_at} /> : session.status === "closed" ? "DONE" : "–"}</strong>
        </div>
      </div>

      {/* Start / status */}
      {session.status === "scheduled" && (
        <form action={startSession} className="gm-card gm-card--amber">
          <input type="hidden" name="session_id" value={id} />
          <div>
            <strong>Not started</strong>
            <p>Starting opens check-in: quest codes work and passes show tonight&apos;s quests.</p>
          </div>
          <button type="submit" className="button button--primary">
            Start session
          </button>
        </form>
      )}

      {/* Location reveal */}
      <section className="gm-card">
        <div style={{ flex: 1 }}>
          <strong>Start location</strong>
          <p>
            {revealed
              ? `Revealed: ${session.start_location}`
              : session.revealed_at
                ? `Hidden. Reveals automatically ${formatWhen(session.revealed_at)}, or reveal it now.`
                : "Hidden from players until you reveal it."}
          </p>
          {session.status !== "closed" && (
            <form action={revealLocation} className="gm-form">
              <input type="hidden" name="session_id" value={id} />
              <input name="start_location" defaultValue={session.start_location ?? ""} placeholder="e.g. Corner of 900 S and 900 E" aria-label="Start location" />
              <label className="gm-check">
                <input type="checkbox" name="send_email" defaultChecked={!revealed} /> Email all {tickets.length} ticket holders
              </label>
              <button type="submit" className="button button--primary">
                {revealed ? "Update and resend" : "Reveal location now"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Teams */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Teams</h2>
          <span className="mono section__count">QUESTS 1–{mainQuests.length}</span>
        </div>
        {tonightTeams.length === 0 && <p className="empty">No teams yet. Make them from orders below, or create one.</p>}
        <ul className="gm-teams">
          {tonightTeams.map((team) => {
            const members = tickets.filter((t) => teamOf.get(t.player!.id)?.id === team.id);
            const done = new Set(completions.filter((c) => c.team_id === team.id).map((c) => c.quest_id));
            return (
              <li key={team.id} className="gm-team">
                <div className="gm-team__head">
                  <span className={`gm-dot gm-dot--${team.mode}`} aria-label={team.mode} />
                  <form action={renameTeam} className="gm-rename">
                    <input type="hidden" name="session_id" value={id} />
                    <input type="hidden" name="team_id" value={team.id} />
                    <input name="name" defaultValue={team.name} aria-label="Team name" />
                    <button type="submit" className="gm-small">
                      Save
                    </button>
                  </form>
                  <span className="gm-squares" aria-label={`${[...done].filter((q) => mainQuests.some((m) => m.id === q)).length} of ${mainQuests.length} quests`}>
                    {mainQuests.map((q) => (
                      <span key={q.id} className={done.has(q.id) ? "on" : ""} />
                    ))}
                  </span>
                </div>
                <p className="gm-team__members">
                  {members.length === 0 ? "No players yet" : members.map((m) => `${m.player!.name}${present.has(m.player!.id) ? " ✓" : ""}`).join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
        {session.status !== "closed" && (
          <div className="gm-row">
            {unassigned.length > 0 && (
              <form action={autoTeams} className="gm-form gm-form--row">
                <input type="hidden" name="session_id" value={id} />
                <label>
                  Max per team
                  <input name="size" type="number" min={2} max={8} defaultValue={5} />
                </label>
                <button type="submit" className="button button--primary">
                  Make teams for {unassigned.length} without one
                </button>
              </form>
            )}
            <form action={createTeam} className="gm-form gm-form--row">
              <input type="hidden" name="session_id" value={id} />
              <input name="name" placeholder="New team name" aria-label="New team name" required maxLength={60} />
              <button type="submit" className="button button--secondary">
                Create team
              </button>
            </form>
          </div>
        )}
        <p className="fine-print">
          <span className="gm-dot gm-dot--tournament" /> Tournament <span className="gm-dot gm-dot--casual" style={{ marginLeft: 12 }} /> Casual (default)
        </p>
      </section>

      {/* Attendance */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Players</h2>
          <span className="mono section__count">
            {present.size}/{tickets.length} HERE
          </span>
        </div>
        {session.status !== "closed" && (
          <details className="gm-walkin">
            <summary>+ Add a walk-in or comp</summary>
            <AddPlayerForm sessionId={id} returnTo={`/gm/${id}`} className="gm-form" />
          </details>
        )}
        {tickets.length === 0 ? (
          <p className="empty">
            No ticket holders yet. <Link href={`/admin/import?session=${id}`}>Import them from Eventbrite</Link>.
          </p>
        ) : (
          <ul className="gm-players">
            {unassigned.map(playerRow)}
            {tickets.filter((t) => teamOf.has(t.player!.id)).sort((a, b) => a.player!.name.localeCompare(b.player!.name)).map(playerRow)}
          </ul>
        )}
      </section>

      {/* Judged challenges */}
      {judged.length > 0 && (
        <section className="section">
          <h2 className="section__title">Judged challenges</h2>
          {judged.map((q) => (
            <div key={q.id} className="gm-judged">
              <p className="gm-judged__title">
                <strong>{q.title}</strong> <span className="mono">0–{q.max_points ?? 10} · TOURNAMENT</span>
              </p>
              {tournamentTeams.length === 0 ? (
                <p className="fine-print">No tournament teams tonight. Casual teams aren&apos;t scored.</p>
              ) : (
                tournamentTeams.map((team) => {
                  const current = completions.find((c) => c.quest_id === q.id && c.team_id === team.id)?.points;
                  return (
                    <form key={team.id} action={scoreJudged} className="gm-score">
                      <input type="hidden" name="session_id" value={id} />
                      <input type="hidden" name="quest_id" value={q.id} />
                      <input type="hidden" name="team_id" value={team.id} />
                      <span>{team.name}</span>
                      <input name="points" type="number" min={0} max={q.max_points ?? 10} defaultValue={current ?? ""} aria-label={`Score for ${team.name}`} />
                      <button type="submit" className="gm-small">
                        Save
                      </button>
                    </form>
                  );
                })
              )}
            </div>
          ))}
        </section>
      )}

      {/* Survey */}
      <section className="section">
        <h2 className="section__title">Survey</h2>
        <form action={saveSurvey} className="gm-form">
          <input type="hidden" name="session_id" value={id} />
          <input name="survey_url" type="url" defaultValue={session.survey_url ?? ""} placeholder="https://forms.gle/…" aria-label="Survey link" />
          <button type="submit" className="button button--secondary">
            Save survey link
          </button>
        </form>
        <p className="fine-print">Shown on players&apos; passes after the session, and in the thank-you email.</p>
      </section>

      {/* Close */}
      {session.status === "live" && (
        <form action={closeSession} className="gm-card gm-card--danger">
          <input type="hidden" name="session_id" value={id} />
          <div style={{ flex: 1 }}>
            <strong>Close session</strong>
            <p>Ends check-in and gives everyone who came the {sessionName} badge. This can&apos;t be undone.</p>
            <label className="gm-check">
              <input type="checkbox" name="send_thanks" defaultChecked /> Email a thank-you{session.survey_url ? " with the survey" : ""} to the {present.size} who came
            </label>
            <label className="gm-check">
              <input type="checkbox" name="confirm" required /> Yes, close {sessionName}
            </label>
          </div>
          <button type="submit" className="button gm-danger">
            Close session
          </button>
        </form>
      )}
      {session.status === "closed" && <p className="empty">This session is closed. Passes show the recap and survey.</p>}
    </main>
  );
}
