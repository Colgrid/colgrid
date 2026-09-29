import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";

export const metadata: Metadata = { title: "Game master", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Session = { id: string; number: number; neighborhood: string | null; starts_at: string | null; status: string; season: { number: number; name: string | null } | null };

export default async function GmHome() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("session")
    .select("id, number, neighborhood, starts_at, status, season:season_id (number, name)")
    .order("starts_at", { ascending: true });
  const sessions = rows<Session>(data);
  const open = sessions.filter((s) => s.status !== "closed");
  const closed = sessions.filter((s) => s.status === "closed").reverse().slice(0, 5);
  const label = (s: Session) =>
    `${s.season?.name ?? `Season ${String(s.season?.number ?? 0).padStart(2, "0")}`} · Session ${String(s.number).padStart(2, "0")}`;

  const list = (items: Session[]) => (
    <ul className="gm-list">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={`/gm/${s.id}`} className="gm-session">
            <span>
              <strong>{label(s)}</strong>
              <span>
                {s.neighborhood ?? ""} · {formatWhen(s.starts_at)}
              </span>
            </span>
            <span className={`status status--${s.status}`}>{s.status.toUpperCase()}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="page gm">
      <p className="mono eyebrow">GAME MASTER</p>
      <h1 style={{ fontSize: 34, marginTop: 8 }}>Run the night</h1>
      {open.length === 0 ? <p className="empty" style={{ marginTop: 20 }}>No upcoming sessions. Create one in the admin.</p> : list(open)}
      {closed.length > 0 && (
        <>
          <h2 className="section__title" style={{ marginTop: 32 }}>
            Recent
          </h2>
          {list(closed)}
        </>
      )}
      <p className="fine-print">
        <Link href="/admin">Admin</Link> · <Link href="/pass">My pass</Link>
      </p>
    </main>
  );
}
