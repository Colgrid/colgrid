// Sends the location-reveal email automatically. Supabase pings this every 5 minutes
// (supabase/migrations/20260930000010_reveal_schedule.sql) with a secret that only the database
// knows; the database checks it, hands over the sessions that just revealed, and marks each one
// so it's emailed once. The same ping closes open routes whose window has ended.
import { NextResponse } from "next/server";
import { revealEmail, type Recipient } from "@/lib/email/notices";
import { sendBatch } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { formatWhen } from "@/lib/time";

export const dynamic = "force-dynamic";

type Due = {
  id: string;
  number: number;
  season_number: number;
  neighborhood: string | null;
  starts_at: string | null;
  start_location: string;
  recipients: Recipient[];
};

export async function POST(req: Request) {
  const secret = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!secret) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cron_due_reveals", { p_secret: secret });
  if (error) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  // Open routes whose play window has ended close here too (no badge, no emails).
  const { data: closedRoutes } = await supabase.rpc("cron_close_routes", { p_secret: secret });

  const results = [];
  for (const s of (Array.isArray(data) ? data : []) as Due[]) {
    const label = `Colgrid ${s.season_number === 0 ? "Pilot " : ""}Session ${String(s.number).padStart(2, "0")}`;
    const info = { label, neighborhood: s.neighborhood, when: formatWhen(s.starts_at) };
    const { sent, error: mailError } = await sendBatch(s.recipients.map((r) => revealEmail(r, info, s.start_location)));
    if (mailError && sent.length === 0) {
      console.error("Reveal email failed; will retry on the next ping", s.id, mailError);
      await supabase.rpc("cron_reveal_failed", { p_secret: secret, p_session_id: s.id });
    }
    results.push({ session: s.number, sent: sent.length, error: mailError });
  }
  return NextResponse.json({ ok: true, results, closedRoutes: closedRoutes ?? 0 });
}
