import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen, isoToLocal } from "@/lib/time";
import { createQuest, deleteQuest, updateQuest, updateSession } from "../../actions";
import Notice from "../../Notice";
import PinInput from "../../PinInput";
import OpenRoute from "./OpenRoute";

type Session = {
  id: string;
  number: number;
  neighborhood: string | null;
  starts_at: string | null;
  start_location: string | null;
  revealed_at: string | null;
  reveal_emailed_at: string | null;
  start_code: string;
  start_lat: number | null;
  start_lng: number | null;
  start_radius_m: number;
  finale_name: string | null;
  finale_where: string | null;
  finale_at: string | null;
  status: string;
  is_finals: boolean;
  route_name: string | null;
  slug: string | null;
  open_until: string | null;
  season: { number: number; name: string | null } | null;
};
type Quest = {
  id: string;
  host_id: string | null;
  stop_number: number | null;
  title: string;
  type: string;
  xp: number;
  is_hidden: boolean;
  is_judged: boolean;
  code: string;
  max_points: number | null;
  host_fee_cents: number | null;
  where_text: string | null;
  briefing: string | null;
  time_limit_min: number | null;
  answer: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  dwell_sec: number;
  hours_text: string | null;
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
      .select("id, number, neighborhood, starts_at, start_location, revealed_at, reveal_emailed_at, start_code, start_lat, start_lng, start_radius_m, finale_name, finale_where, finale_at, status, is_finals, route_name, slug, open_until, season:season_id (number, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quest")
      .select("id, host_id, stop_number, title, type, xp, is_hidden, is_judged, code, max_points, host_fee_cents, where_text, briefing, time_limit_min, answer, lat, lng, radius_m, dwell_sec, hours_text, host:host_id (business)")
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

      {!session.open_until && (
      <p className="admin-meta">
        Players check in by tapping I&apos;m here at the start pin (from 30 minutes before; it starts the session by itself). Backup start code
        to say out loud: <span className="code-chip mono">{session.start_code}</span>
      </p>
      )}

      <div className="admin-actions">
        <Link href={`/admin/sessions/${session.id}/plaques`} className="button button--primary">
          Print quest QR plaques
        </Link>
        <Link href={`/admin/import?session=${session.id}`} className="button button--dark">
          Import players
        </Link>
        <Link href={`/admin/sessions/${session.id}/survey`} className="button button--dark">
          Survey answers
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
                    {" · "}
                    {q.is_judged ? "judged" : q.lat !== null && q.answer ? "pin + answer" : q.lat !== null ? "pin" : q.answer ? "answer" : "host code"}
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
                <details className="admin-quest__edit">
                  <summary>Edit</summary>
                  <form action={updateQuest} className="admin-form">
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="session_id" value={session.id} />
                    <label>
                      Title
                      <input name="title" required maxLength={120} defaultValue={q.title} />
                    </label>
                    <label>
                      Type
                      <select name="type" defaultValue={q.type}>
                        {QUEST_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Host
                      <select name="host_id" defaultValue={q.host_id ?? ""}>
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
                      <input name="stop_number" type="number" min={1} defaultValue={q.stop_number ?? ""} />
                    </label>
                    <label className="admin-check">
                      <input name="is_hidden" type="checkbox" defaultChecked={q.is_hidden} /> Hidden quest
                    </label>
                    <label className="admin-check">
                      <input name="is_judged" type="checkbox" defaultChecked={q.is_judged} /> Judged challenge
                    </label>
                    <label>
                      Where to go (shown when the mission unlocks)
                      <input name="where_text" maxLength={300} defaultValue={q.where_text ?? ""} />
                    </label>
                    <label>
                      Hours (open routes; shown to players, e.g. Tue–Sat 10–6)
                      <input name="hours_text" maxLength={120} defaultValue={q.hours_text ?? ""} />
                    </label>
                    <label>
                      What to do
                      <textarea name="briefing" rows={3} maxLength={1500} defaultValue={q.briefing ?? ""} />
                    </label>
                    <label>
                      Target minutes (optional countdown)
                      <input name="time_limit_min" type="number" min={1} max={240} defaultValue={q.time_limit_min ?? ""} />
                    </label>
                    <fieldset className="admin-verify">
                      <legend>How players prove they did it (no one needs to be there)</legend>
                      <label>
                        Map pin: the phone must be here
                        <PinInput defaultValue={q.lat !== null && q.lng !== null ? `${q.lat}, ${q.lng}` : ""} />
                      </label>
                      <label>
                        Radius in meters
                        <input name="radius_m" type="number" min={10} max={500} defaultValue={q.radius_m} />
                      </label>
                      <label>
                        Stay, in seconds (pin-only stops, so walking past doesn&apos;t count)
                        <input name="dwell_sec" type="number" min={0} max={1800} defaultValue={q.dwell_sec} />
                      </label>
                      <label>
                        Answer: something you only know by being there (separate options with |)
                        <input name="answer" maxLength={200} defaultValue={q.answer ?? ""} />
                      </label>
                      <p className="admin-hint">Pin + answer is best. The host code ({q.code}) always works too, as a backup.</p>
                    </fieldset>
                    <label>
                      XP
                      <input name="xp" type="number" min={1} max={500} defaultValue={q.xp} />
                    </label>
                    <label>
                      Tournament points (optional)
                      <input name="max_points" type="number" min={1} max={100} defaultValue={q.max_points ?? ""} />
                    </label>
                    <label>
                      Host fee in dollars (admin only)
                      <input name="host_fee" type="number" min={0} step="1" defaultValue={q.host_fee_cents != null ? q.host_fee_cents / 100 : ""} />
                    </label>
                    <button className="button button--dark" type="submit">
                      Save quest
                    </button>
                    <p className="admin-hint">The code ({q.code}) stays the same, so printed plaques still work.</p>
                  </form>
                </details>
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
              Where to go (shown when the mission unlocks)
              <input name="where_text" maxLength={300} placeholder="e.g. Kiln & Co, 912 E 900 S (green door)" />
            </label>
            <label>
              Hours (open routes; shown to players)
              <input name="hours_text" maxLength={120} placeholder="e.g. Tue–Sat 10–6, or Any time" />
            </label>
            <label>
              What to do
              <textarea name="briefing" rows={3} maxLength={1500} placeholder="e.g. Ask the counter for the Colgrid craft kit. Build your team's badge together." />
            </label>
            <label>
              Target minutes (optional countdown)
              <input name="time_limit_min" type="number" min={1} max={240} placeholder="e.g. 20" />
            </label>
            <fieldset className="admin-verify">
              <legend>How players prove they did it (no one needs to be there)</legend>
              <label>
                Map pin: the phone must be here
                <PinInput defaultValue="" />
              </label>
              <label>
                Radius in meters
                <input name="radius_m" type="number" min={10} max={500} defaultValue={40} />
              </label>
              <label>
                Stay, in seconds (pin-only stops, so walking past doesn&apos;t count)
                <input name="dwell_sec" type="number" min={0} max={1800} defaultValue={90} />
              </label>
              <label>
                Answer: something you only know by being there (separate options with |)
                <input name="answer" maxLength={200} placeholder="e.g. 1912|nineteen twelve" />
              </label>
              <p className="admin-hint">Pin + answer is best. Leave both blank to use the host code only.</p>
            </fieldset>
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

      <OpenRoute session={session} mainQuestIds={quests.filter((q) => !q.is_hidden && !q.is_judged).map((q) => q.id)} />

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
            Start pin: players must be here to check in (stand there and tap Use my location)
            <PinInput name="start_pin" defaultValue={session.start_lat !== null && session.start_lng !== null ? `${session.start_lat}, ${session.start_lng}` : ""} />
          </label>
          <label>
            Start radius in meters
            <input name="start_radius_m" type="number" min={10} max={500} defaultValue={session.start_radius_m} />
          </label>
          <label>
            Reveal the location at (blank = 48 hours before)
            <input name="revealed_at" type="datetime-local" defaultValue={isoToLocal(session.revealed_at)} />
          </label>
          <p className="admin-hint">
            {session.reveal_emailed_at
              ? `Reveal email sent ${formatWhen(session.reveal_emailed_at)}.`
              : session.revealed_at && session.start_location
                ? `The reveal email goes to every ticket holder automatically at ${formatWhen(session.revealed_at)}.`
                : "Add the start location and the reveal email goes out automatically at the reveal time."}
          </p>
          <label>
            Finale place (shown once a team finishes every mission)
            <input name="finale_name" maxLength={120} defaultValue={session.finale_name ?? ""} placeholder="e.g. Pago" />
          </label>
          <label>
            Finale address
            <input name="finale_where" maxLength={300} defaultValue={session.finale_where ?? ""} />
          </label>
          <label>
            Finale time (Salt Lake time)
            <input name="finale_at" type="datetime-local" defaultValue={isoToLocal(session.finale_at)} />
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
