import { saveOpenRoute } from "../../actions";
import { requireAdmin } from "@/lib/admin/guard";
import { routeStats } from "@/lib/route-stats";
import { rows } from "@/lib/rows";
import { SITE } from "@/lib/site";
import { isoToLocal } from "@/lib/time";

type Props = {
  session: { id: string; number: number; status: string; route_name: string | null; slug: string | null; open_until: string | null };
  mainQuestIds: string[];
};

// Open route (self-guided test): set it up, open or close it, and see the test counts.
export default async function OpenRoute({ session, mainQuestIds }: Props) {
  const { supabase } = await requireAdmin();
  const isRoute = !!session.open_until;
  let stats: ReturnType<typeof routeStats> | null = null;
  if (isRoute) {
    const [events, completions, present] = await Promise.all([
      supabase.from("play_event").select("kind, team_id, player_id, quest_id").eq("session_id", session.id).limit(20000),
      mainQuestIds.length ? supabase.from("completion").select("team_id, quest_id").in("quest_id", mainQuestIds) : Promise.resolve({ data: [] }),
      supabase.from("attendance").select("player_id, team_id").eq("session_id", session.id),
    ]);
    stats = routeStats(rows(events.data), rows(completions.data), rows(present.data), mainQuestIds.length);
  }
  const link = session.slug ? `${SITE.appUrl}/play/${session.slug}` : null;

  return (
    <section className="admin-section">
      <h2>Open route</h2>
      <p className="admin-meta">
        {isRoute
          ? "Self-guided: anyone with the link signs up, names a team, invites friends and plays when the places are open. No start pin, no host. The first finished stop starts a team's route."
          : "Make this session a self-guided route anyone can play during a test window. Leave blank for a normal gathering."}
      </p>
      {link && (
        <p className="admin-meta">
          Link: <a href={link}>{link}</a> · Status: <span className={`status status--${session.status}`}>{session.status.toUpperCase()}</span>
        </p>
      )}
      <form action={saveOpenRoute} className="admin-form">
        <input type="hidden" name="id" value={session.id} />
        <label>
          Route name
          <input name="route_name" maxLength={80} defaultValue={session.route_name ?? `Route ${String(session.number).padStart(2, "0")}`} />
        </label>
        <label>
          Link (colgrid.app/play/…)
          <input name="slug" maxLength={40} defaultValue={session.slug ?? `route-${String(session.number).padStart(2, "0")}`} />
        </label>
        <label>
          Closes at (Salt Lake time)
          <input name="open_until" type="datetime-local" defaultValue={isoToLocal(session.open_until)} />
        </label>
        <div className="admin-actions">
          <button className="button button--dark" type="submit" name="action" value="save">
            Save route
          </button>
          {session.status !== "live" && (
            <button className="button button--primary" type="submit" name="action" value="open">
              Open now
            </button>
          )}
          {session.status === "live" && isRoute && (
            <button className="button button--dark" type="submit" name="action" value="close">
              Close now
            </button>
          )}
        </div>
        <p className="admin-hint">It also closes by itself at the closing time (no badge, no emails). Give each stop its hours below.</p>
      </form>

      {stats && (
        <ul className="admin-list" style={{ marginTop: 16 }}>
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
      )}
    </section>
  );
}
