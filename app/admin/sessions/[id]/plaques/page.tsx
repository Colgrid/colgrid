import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { encodeQr, qrSvgPath } from "@/lib/qr";
import { rows } from "@/lib/rows";
import { SITE } from "@/lib/site";
import PrintButton from "./PrintButton";

// Printable host plaques: one per quest. Hosts show it only after a team finishes the quest
// (docs/mvp-spec.md). The QR opens the check-in page with the code filled in.
type Quest = { id: string; stop_number: number | null; title: string; is_hidden: boolean; is_judged: boolean; code: string; host: { business: string } | null };

export default async function Plaques({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [sessionRes, questRes] = await Promise.all([
    supabase.from("session").select("number, neighborhood").eq("id", id).maybeSingle(),
    supabase.from("quest").select("id, stop_number, title, is_hidden, is_judged, code, host:host_id (business)").eq("session_id", id),
  ]);
  const session = sessionRes.data as { number: number; neighborhood: string | null } | null;
  if (!session) notFound();
  const quests = rows<Quest>(questRes.data)
    .filter((q) => !q.is_judged) // judged challenges are scored by the game master, no code
    .sort((a, b) => Number(a.is_hidden) - Number(b.is_hidden) || (a.stop_number ?? 99) - (b.stop_number ?? 99));

  return (
    <>
      <div className="no-print admin-actions">
        <Link href={`/admin/sessions/${id}`}>← Back to the session</Link>
        <PrintButton />
      </div>
      <p className="no-print admin-hint">
        {quests.length} plaques, two per page. Keep them face down until the team finishes the quest. Judged challenges don&apos;t get one.
      </p>

      <div className="plaques">
        {quests.map((q) => {
          const url = `${SITE.url}/check-in?code=${q.code}`;
          const { path, viewBox } = qrSvgPath(encodeQr(url, "Q"), 4);
          return (
            <article key={q.id} className="plaque">
              <header className="plaque__head">
                <span className="logo-tile logo-tile--sm">
                  <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} style={{ transform: "scale(1.7)" }} />
                </span>
                <span className="mono plaque__kicker">
                  SESSION {String(session.number).padStart(2, "0")} · {q.is_hidden ? "HIDDEN QUEST" : q.stop_number ? `STOP ${q.stop_number}` : "QUEST"}
                </span>
              </header>
              <p className="plaque__lead">Quest complete. Scan to check in.</p>
              <svg className="plaque__qr" viewBox={`0 0 ${viewBox} ${viewBox}`} role="img" aria-label={`QR code for ${q.code}`} shapeRendering="crispEdges">
                <rect width={viewBox} height={viewBox} fill="#fff" />
                <path d={path} fill="#1A1D20" />
              </svg>
              <p className="plaque__code mono">{q.code}</p>
              <p className="plaque__or">or type the code at getcolgrid.com/check-in</p>
              <footer className="plaque__foot">
                <span>{q.host?.business ?? session.neighborhood ?? ""}</span>
                <span>{q.title}</span>
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}
