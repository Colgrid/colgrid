import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { formatWhen } from "@/lib/time";
import PrintButton from "./PrintButton";

type ByAsk = { stop: number | null; title: string; sponsor: string | null; needs_photo: boolean; teams_completed: number; first: string | null; last: string | null; photos: number; photos_approved: number };
type Report = {
  challenge: { name: string | null; neighborhood: string | null; client: string | null; objective: string | null; status: string; open_until: string | null };
  participants: number;
  first_time_participants: number;
  teams: number;
  asks: number;
  asks_completed: number;
  teams_finished_all: number;
  completion_rate: number | null;
  first_check_in: string | null;
  last_check_in: string | null;
  by_ask: ByAsk[];
  photos: { submitted: number; approved: number; pending: number };
  rewards: { earned_cents: number; sent_cents: number; people_rewarded: number };
};

const money = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

// The Outcome Report for one challenge: counts and times only, no names or emails, so it can go to
// the client as is. Print it (or save as PDF) from the button.
export default async function OutcomeReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("challenge_report", { p_session_id: id });
  if (error) {
    return (
      <>
        <p className="admin-crumb">
          <Link href={`/admin/sessions/${id}`}>← Back</Link>
        </p>
        <h1 className="admin-title">Outcome Report</h1>
        <p className="admin-empty">
          The database isn&apos;t ready for reports yet. Run <span className="mono">20261002000020_challenges.sql</span> in the Supabase SQL Editor, then reload.
        </p>
      </>
    );
  }
  const r = data as Report | null;
  if (!r) notFound();

  const stats: [string, string][] = [
    ["Residents took part", String(r.participants)],
    ["First time with Colgrid", String(r.first_time_participants)],
    ["Teams", String(r.teams)],
    ["Asks completed", String(r.asks_completed)],
    ["Teams that finished every ask", String(r.teams_finished_all)],
    ["Completion rate", r.completion_rate === null ? "–" : `${Math.round(r.completion_rate * 100)}%`],
    ["Photos approved", `${r.photos.approved} of ${r.photos.submitted}`],
    ["Rewards earned by participants", `${money(r.rewards.earned_cents)} (${r.rewards.people_rewarded} people)`],
  ];

  return (
    <>
      <p className="admin-crumb no-print">
        <Link href={`/admin/sessions/${id}/challenge`}>← Challenge</Link>
      </p>
      <h1 className="admin-title">Outcome Report</h1>
      <p className="admin-meta">
        <strong>{r.challenge.name ?? "Challenge"}</strong>
        {r.challenge.neighborhood ? ` · ${r.challenge.neighborhood}` : ""}
        {r.challenge.client ? ` · for ${r.challenge.client}` : ""}
      </p>
      {r.challenge.objective && <p className="admin-meta">Objective: {r.challenge.objective}</p>}
      {r.first_check_in && r.last_check_in && (
        <p className="admin-meta">
          Field work from {formatWhen(r.first_check_in)} to {formatWhen(r.last_check_in)}.
        </p>
      )}
      <div className="admin-actions no-print">
        <PrintButton />
      </div>

      <section className="admin-section">
        <h2>Results</h2>
        <ul className="admin-list">
          {stats.map(([label, value]) => (
            <li key={label} className="admin-quest">
              <div className="admin-quest__main">
                <strong>{label}</strong>
              </div>
              <div className="admin-quest__side">
                <span className="mono admin-quest__xp">{value}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h2>By ask</h2>
        {r.by_ask.length === 0 ? (
          <p className="admin-empty">No asks.</p>
        ) : (
          <ul className="admin-list">
            {r.by_ask.map((a, i) => (
              <li key={i} className="admin-quest">
                <div className="admin-quest__main">
                  <strong>
                    {a.stop !== null ? `${a.stop}. ` : ""}
                    {a.title}
                  </strong>
                  <span>
                    {[a.sponsor ? `Sponsored by ${a.sponsor}` : null, a.needs_photo ? `${a.photos_approved} of ${a.photos} photos approved` : null, a.first ? `first ${formatWhen(a.first)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="admin-quest__side">
                  <span className="mono admin-quest__xp">
                    {a.teams_completed} of {r.teams}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="admin-hint">Teams that completed each ask, out of the teams that took part. Every check-in was verified by location, an on-site answer or a host code.</p>
      </section>
    </>
  );
}
