import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen, isoToLocal } from "@/lib/time";
import { createQuest, deleteQuest, updateSession } from "../../actions";
import Notice from "../../Notice";

type Session = {
  id: string;
  number: number;
  neighborhood: string | null;
  starts_at: string | null;
  start_location: string | null;
  revealed_at: string | null;
  status: string;
  is_finals: boolean;
  season: { number: number; name: string | null } | null;
};
type Quest = {
  id: string;
  stop_number: number | null;
  title: string;
  type: string;
  xp: number;
  is_hidden: boolean;
  is_judged: boolean;
  code: string;
  max_points: number | null;
  host_fee_cents: number | null;
  host: { business: string } | null;
};

const QUEST_TYPES = ["making", "tasting", "tradition", "performance", "social", "discovery", "puzzle", "multi_stop"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function AdminSession({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  const { supabase } = await requireAdmin();
  const [sessionRes, questRes, hostRes, ticketRes] = await Promise.all([
    supabase
      .from("session")
      .select("id, number, neighborhood, starts_at, start_location, revealed_at, status, is_finals, season:season_id (number, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quest")
      .select("id, stop_number, title, type, xp, is_hidden, is_judged, code, max_points, host_fee_cents, host:host_id (business)")
      .eq("session_id", id),
    supabase.from("host").select("id, business").order("business"),
    supabase.from("ticket").select("id", { count: "exact", head: true }).eq("session_id", id),
  ]);
  const session = sessionRes.data as unknown as Session | null;
  if (!session) notFound();
  const quests = rows<Quest>(questRes.data).sort(
    (a, b) =>
      Number(a.is_hidden) - Number(b.is_hidden) ||
      Number(a.is_judged) - Number(b.is_judged) ||
      (a.stop_number ?? 99) - (b.stop_number ?? 99) ||
      a.title.localeCompare(b.title),
  );
  const hosts = rows<{ id: string; business: string }>(hostRes.data);
  const nextStop = quests.filter((q) => !q.is_hidden && !q.is_judged).reduce((m, q) => Math.max(m, q.stop_number ?? 0), 0) + 1;
  const seasonName = session.season ? `Season ${pad(session.season.number)}${session.season.name ? ` · ${session.season.name}` : ""}` : "";

  return (
    <>
      <p className="admin-crumb">
        <Link href="/admin">← Sessions</Link> · {seasonName}
      </p>
      <h1 className="admin-title">
        Session {pad(session.number)} · {session.neighborhood ?? "Neighborhood not set"}
      </h1>
      <p className="admin-meta">
        {formatWhen(session.starts_at)} · <span className={`status status--${session.status}`}>{session.status.toUpperCase()}</span> ·{" "}
        <Link href={`/admin/players?session=${session.id}`}>{ticketRes.count ?? 0} players</Link>
      </p>
      <Notice msg={msg} />

      <div className="admin-actions">
        <Link href={`/admin/sessions/${session.id}/plaques`} className="button button--primary">
          Print quest QR plaques
        </Link>
        <Link href={`/admin/import?session=${session.id}`} className="button button--dark">
          Import players
        </Link>
      </div>

      <section className="admin-section">
        <h2>Quests</h2>
        {quests.length === 0 ? (
          <p className="admin-empty">No quests yet. Add 3–4 main quests, plus a hidden one if you like.</p>
        ) : (
          <ul className="admin-list">
            {quests.map((q) => (
              <li key={q.id} className={`admin-quest${q.is_hidden ? " admin-quest--hidden" : ""}`}>
                <div className="admin-quest__main">
                  <strong>
                    {q.is_hidden ? "H" : q.is_judged ? "J" : q.stop_number ?? "–"} · {q.title}
                  </strong>
                  <span>
                    {q.host?.business ?? (q.is_judged ? "Scored by the game master" : "No host")}
                    {q.host_fee_cents != null ? ` · $${(q.host_fee_cents / 100).toFixed(0)}` : ""} · {q.type.replace("_", " ")}
                  </span>
                </div>
                <div className="admin-quest__side">
                  <span className="code-chip mono">{q.code}</span>
                  <span className="mono admin-quest__xp">
                    {q.is_judged ? `0–${q.max_points ?? 10} PTS` : `+${q.xp} XP`}
                  </span>
                  <form action={deleteQuest}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="session_id" value={session.id} />
                    <button type="submit" className="link-button link-button--danger">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <details className="admin-form-toggle" open={quests.length === 0}>
          <summary>+ Add quest</summary>
          <form action={createQuest} className="admin-form">
            <input type="hidden" name="session_id" value={session.id} />
            <label>
              Title
              <input name="title" required maxLength={120} placeholder="e.g. The taco that isn't on the menu" />
            </label>
            <label>
              Type
              <select name="type" defaultValue="tasting">
                {QUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Host
              <select name="host_id" defaultValue="">
                <option value="">No host</option>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.business}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stop number
              <input name="stop_number" type="number" min={1} defaultValue={nextStop} />
            </label>
            <label className="admin-check">
              <input name="is_hidden" type="checkbox" /> Hidden quest (stays secret until a team finds it; 30 XP)
            </label>
            <label className="admin-check">
              <input name="is_judged" type="checkbox" /> Judged challenge (scored by the game master; no code check-in)
            </label>
            <label>
              XP (blank = 25, or 30 for hidden)
              <input name="xp" type="number" min={1} max={500} />
            </label>
            <label>
              Tournament points (optional)
              <input name="max_points" type="number" min={1} max={100} placeholder="e.g. 40" />
            </label>
            <label>
              Host fee in dollars (admin only, never shown to players)
              <input name="host_fee" type="number" min={0} step="1" placeholder="e.g. 200" />
            </label>
            <button className="button button--primary" type="submit">
              Add quest
            </button>
            <p className="admin-hint">A unique code like TAC-7Q2 is generated for you.</p>
          </form>
        </details>
      </section>

      <section className="admin-section">
        <h2>Session details</h2>
        <form action={updateSession} className="admin-form">
          <input type="hidden" name="id" value={session.id} />
          <label>
            Neighborhood
            <input name="neighborhood" defaultValue={session.neighborhood ?? ""} />
          </label>
          <label>
            Starts (Salt Lake time)
            <input name="starts_at" type="datetime-local" defaultValue={isoToLocal(session.starts_at)} />
          </label>
          <label>
            Start location (hidden until the reveal)
            <input name="start_location" defaultValue={session.start_location ?? ""} />
          </label>
          <label>
            Reveal the location at (blank = 48 hours before)
            <input name="revealed_at" type="datetime-local" defaultValue={isoToLocal(session.revealed_at)} />
          </label>
          <label className="admin-check">
            <input name="is_finals" type="checkbox" defaultChecked={session.is_finals} /> Chapter Finals
          </label>
          <button className="button button--dark" type="submit">
            Save session
          </button>
        </form>
      </section>
    </>
  );
}
