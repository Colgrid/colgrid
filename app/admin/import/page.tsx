import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";
import ImportForm from "./ImportForm";

type Session = { id: string; number: number; neighborhood: string | null; starts_at: string | null; status: string; season: { number: number; name: string | null } | null };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session: preselected } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("session")
    .select("id, number, neighborhood, starts_at, status, season:season_id (number, name)")
    .neq("status", "closed")
    .order("starts_at");
  const sessions = rows<Session>(data).map((s) => ({
    id: s.id,
    label: `${s.season?.name ?? `Season ${String(s.season?.number ?? 0).padStart(2, "0")}`} · Session ${String(s.number).padStart(2, "0")} · ${s.neighborhood ?? ""} · ${formatWhen(s.starts_at)}`,
  }));

  return (
    <>
      <h1 className="admin-title">Import players</h1>
      <p className="admin-meta">
        From Eventbrite: <strong>Manage attendees → Orders / Attendee summary → Export (CSV)</strong>. Each attendee gets a pass under
        their email. Importing the same file twice is safe.
      </p>
      {sessions.length === 0 ? (
        <p className="admin-empty">Create a session first, then import its ticket buyers.</p>
      ) : (
        <ImportForm sessions={sessions} preselected={preselected ?? null} />
      )}
    </>
  );
}
