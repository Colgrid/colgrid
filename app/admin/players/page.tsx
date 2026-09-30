import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";
import AddPlayerForm from "@/app/components/AddPlayerForm";
import { removeTicket } from "../actions";
import Notice from "../Notice";

type Session = { id: string; number: number; neighborhood: string | null; starts_at: string | null; season: { number: number; name: string | null } | null };
type Ticket = {
  id: string;
  source: string;
  order_ref: string | null;
  player: { id: string; name: string; email: string; coming_with: string | null; user_id: string | null; welcomed_at: string | null } | null;
};

const LABELS: Record<string, string> = {
  friends: "Friends",
  partner: "Partner",
  family: "Family",
  coworkers: "Coworkers",
  solo: "Solo",
  other: "Other",
};

export default async function Players({ searchParams }: { searchParams: Promise<{ session?: string; msg?: string }> }) {
  const { session: sessionParam, msg } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: sessionData } = await supabase
    .from("session")
    .select("id, number, neighborhood, starts_at, season:season_id (number, name)")
    .order("starts_at", { ascending: false });
  const sessions = rows<Session>(sessionData);
  const current = sessions.find((s) => s.id === sessionParam) ?? sessions[0] ?? null;

  let tickets: Ticket[] = [];
  if (current) {
    const { data } = await supabase
      .from("ticket")
      .select("id, source, order_ref, player:player_id (id, name, email, coming_with, user_id, welcomed_at)")
      .eq("session_id", current.id);
    tickets = rows<Ticket>(data).filter((t) => t.player);
    tickets.sort((a, b) => (a.order_ref ?? "").localeCompare(b.order_ref ?? "") || a.player!.name.localeCompare(b.player!.name));
  }

  const counts = tickets.reduce<Record<string, number>>((acc, t) => {
    const k = t.player?.coming_with ?? "none";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const signedIn = tickets.filter((t) => t.player?.user_id).length;
  const welcomed = tickets.filter((t) => t.player?.welcomed_at).length;
  const label = (s: Session) =>
    `${s.season?.name ?? `Season ${String(s.season?.number ?? 0).padStart(2, "0")}`} · Session ${String(s.number).padStart(2, "0")} · ${s.neighborhood ?? ""} · ${formatWhen(s.starts_at)}`;

  return (
    <>
      <h1 className="admin-title">Players</h1>
      <Notice msg={msg} />
      {sessions.length > 1 && (
        <p className="admin-meta">
          {sessions.map((s) => (
            <Link key={s.id} href={`/admin/players?session=${s.id}`} className={s.id === current?.id ? "admin-tab admin-tab--on" : "admin-tab"}>
              {s.season?.name ?? `S${s.season?.number}`} · {String(s.number).padStart(2, "0")}
            </Link>
          ))}
        </p>
      )}
      {!current ? (
        <p className="admin-empty">No sessions yet.</p>
      ) : (
        <>
          <p className="admin-meta">{label(current)}</p>
          <div className="admin-stats">
            <div>
              <span className="mono">PLAYERS</span>
              <strong>{tickets.length}</strong>
            </div>
            <div>
              <span className="mono">WELCOMED</span>
              <strong>{welcomed}</strong>
            </div>
            <div>
              <span className="mono">SIGNED IN</span>
              <strong>{signedIn}</strong>
            </div>
          </div>
          <details className="admin-form-toggle">
            <summary>+ Add a player by hand (comp, invited friend, walk-in)</summary>
            <AddPlayerForm sessionId={current.id} returnTo={`/admin/players?session=${current.id}`} className="admin-form" />
          </details>
          {tickets.length > 0 && (
            <p className="admin-hint">
              Coming with:{" "}
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => `${LABELS[k] ?? "No answer"} ${n}`)
                .join(" · ")}
            </p>
          )}
          {tickets.length === 0 ? (
            <p className="admin-empty">
              No players yet. <Link href={`/admin/import?session=${current.id}`}>Import the Eventbrite export</Link>.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>With</th>
                  <th>Order</th>
                  <th>Pass</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.player!.id}>
                    <td>{t.player!.name}</td>
                    <td>{t.player!.email}</td>
                    <td>{LABELS[t.player!.coming_with ?? ""] ?? "—"}</td>
                    <td>{t.order_ref ?? (t.source === "manual" ? "added" : "—")}</td>
                    <td>{t.player!.user_id ? "Signed in" : t.player!.welcomed_at ? "Emailed" : "Not yet"}</td>
                    <td>
                      <form action={removeTicket}>
                        <input type="hidden" name="ticket_id" value={t.id} />
                        <input type="hidden" name="session_id" value={current.id} />
                        <input type="hidden" name="player_id" value={t.player!.id} />
                        <button type="submit" className="link-button link-button--danger" title="For refunds. Only before they've played.">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
