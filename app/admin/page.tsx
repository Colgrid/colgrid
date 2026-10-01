import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";
import { createSession } from "./actions";
import Notice from "./Notice";

type Season = { id: string; number: number; name: string | null; chapter: { number: number; city: string; neighborhood_default: string | null } | null };
type Session = { id: string; season_id: string; number: number; neighborhood: string | null; starts_at: string | null; status: string; is_finals: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const seasonLabel = (s: Season) => `Season ${pad(s.number)}${s.name ? ` · ${s.name}` : ""}`;

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const { supabase } = await requireAdmin();
  const [seasonRes, sessionRes, ticketRes, questRes, shareRes] = await Promise.all([
    supabase.from("season").select("id, number, name, chapter:chapter_id (number, city, neighborhood_default)").order("number"),
    supabase.from("session").select("id, season_id, number, neighborhood, starts_at, status, is_finals").order("number"),
    supabase.from("ticket").select("session_id"),
    supabase.from("quest").select("session_id"),
    // Basic share counts (phase 1 sharing), last 30 days.
    supabase.from("share_event").select("action").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);
  const shares = rows<{ action: string }>(shareRes.data);
  const shareCount = (a: string) => shares.filter((s) => s.action === a).length;
  const seasons = rows<Season>(seasonRes.data);
  const sessions = rows<Session>(sessionRes.data);
  const count = (list: { session_id: string }[], id: string) => list.filter((t) => t.session_id === id).length;
  const tickets = rows<{ session_id: string }>(ticketRes.data);
  const quests = rows<{ session_id: string }>(questRes.data);

  return (
    <>
      <Notice msg={msg} />
      <div className="admin-actions">
        <Link href="/admin/import" className="button button--dark">
          Import players (CSV)
        </Link>
        <Link href="/admin/hosts" className="button button--primary">
          Hosts
        </Link>
      </div>

      <p className="admin-meta">
        Sharing, last 30 days: {shareCount("opened")} opened the share sheet · {shareCount("shared")} shared · {shareCount("saved")} saved the
        image · {shareCount("copied")} copied the caption. Visits from shared links show up in your site analytics as utm_source=share.
      </p>

      {seasons.length === 0 && <p className="admin-empty">No seasons yet. Run the step 6 database update first.</p>}

      {seasons.map((season) => {
        const list = sessions.filter((s) => s.season_id === season.id);
        const nextNumber = list.reduce((m, s) => Math.max(m, s.number), 0) + 1;
        return (
          <section key={season.id} className="admin-section">
            <h2>{seasonLabel(season)}</h2>
            {list.length === 0 ? (
              <p className="admin-empty">No sessions yet.</p>
            ) : (
              <ul className="admin-list">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/sessions/${s.id}`} className="admin-row">
                      <span className="mono admin-row__num">{pad(s.number)}</span>
                      <span className="admin-row__main">
                        <strong>
                          {s.neighborhood ?? "Neighborhood not set"}
                          {s.is_finals ? " · Finals" : ""}
                        </strong>
                        <span>
                          {formatWhen(s.starts_at)} · {count(tickets, s.id)} players · {count(quests, s.id)} quests
                        </span>
                      </span>
                      <span className={`status status--${s.status}`}>{s.status.toUpperCase()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <details className="admin-form-toggle">
              <summary>+ New session in {seasonLabel(season)}</summary>
              <form action={createSession} className="admin-form">
                <input type="hidden" name="season_id" value={season.id} />
                <label>
                  Session number
                  <input name="number" type="number" min={1} defaultValue={nextNumber} required />
                </label>
                <label>
                  Neighborhood
                  <input name="neighborhood" defaultValue={season.chapter?.neighborhood_default ?? ""} />
                </label>
                <label>
                  Starts (Salt Lake time)
                  <input name="starts_at" type="datetime-local" required />
                </label>
                <label>
                  Start location (hidden until the reveal)
                  <input name="start_location" placeholder="e.g. Corner of 900 S and 900 E" />
                </label>
                <label>
                  Reveal the location at (blank = 48 hours before)
                  <input name="revealed_at" type="datetime-local" />
                </label>
                <label className="admin-check">
                  <input name="is_finals" type="checkbox" /> Chapter Finals
                </label>
                <button className="button button--primary" type="submit">
                  Create session
                </button>
              </form>
            </details>
          </section>
        );
      })}
    </>
  );
}
