import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TabBar from "@/app/components/TabBar";
import { loadPass } from "@/app/pass/data";
import { activeQuest } from "@/lib/game/pass";
import CheckInForm from "./CheckInForm";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Check in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const data = await loadPass();
  if (!data) redirect(`/signin?next=${encodeURIComponent(`/check-in${code ? `?code=${encodeURIComponent(code)}` : ""}`)}`);

  const live = data.kind === "pass" ? data.sessions.live : null;
  const current = data.kind === "pass" && data.focus?.session.status === "live" ? activeQuest(data.focus.quests) : null;
  const where = [current?.stop_number != null ? `STOP ${current.stop_number}` : null, live?.neighborhood?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <main className="page page--tabs">
        {where && <p className="mono eyebrow">{where}</p>}
        <h1 style={{ fontSize: 36, marginTop: where ? 8 : 0 }}>Check in</h1>

        {data.kind === "no-pass" ? (
          <p className="lede">
            There&apos;s no player pass on this account. <Link href="/pass">See why</Link>.
          </p>
        ) : !live ? (
          <p className="empty" style={{ marginTop: 20 }}>
            No session is live right now. Check-in opens when the next session starts.
          </p>
        ) : (
          <>
            <p className="lede">
              {data.focus?.guided && !data.focus.guided.arrived
                ? "Just got here? Scan the Colgrid sign at the start to check in and unlock your first mission."
                : "Your host has the code. Ask for it, or scan the QR at the counter."}
            </p>
            <div style={{ marginTop: 28 }}>
              <CheckInForm initialCode={code ?? ""} />
            </div>
          </>
        )}
      </main>
      <TabBar active="checkin" />
    </>
  );
}
