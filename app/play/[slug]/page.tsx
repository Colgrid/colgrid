import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isRouteSlug, openThrough } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { startRoute } from "../actions";

export const dynamic = "force-dynamic";

type Route = {
  status: "ok" | "not_found" | "not_open" | "closed";
  id: string;
  route_name: string;
  neighborhood: string | null;
  open_until: string | null;
  stops: { stop: number | null; title: string; where: string | null; hours: string | null }[];
  signed_in: boolean;
  has_pass: boolean;
  team_name: string | null;
  started: boolean;
  done: boolean;
};

async function load(slug: string, count: boolean): Promise<Route | null> {
  if (!isRouteSlug(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("open_route", { p_slug: slug, p_count: count });
  const r = data as Route | null;
  return r && r.status !== "not_found" ? r : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug, false);
  if (!r) return { title: "Route" };
  return {
    title: `${r.route_name}${r.neighborhood ? ` · ${r.neighborhood}` : ""}`,
    description: `A Colgrid route: ${r.stops.length} stops to play with friends, no host needed.`,
  };
}

const MESSAGES: Record<string, string> = {
  name: "Add your first name.",
  team: "Name your team.",
  taken: "That team name is taken. Try another.",
  closed: "This route isn't open right now.",
  error: "Something went wrong. Try again.",
};

export default async function PlayRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { slug } = await params;
  const { msg } = await searchParams;
  const r = await load(slug, true);
  if (!r) notFound();
  const open = r.status === "ok";

  return (
    <main className="page play">
      <Link href="/pass" className="logo-tile logo-tile--sm" aria-label="Colgrid">
        <Image src="/brand/colgrid-logo.png" alt="" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
      </Link>
      <h1 className="play__title">{r.route_name}</h1>
      <p className="lede">
        {open
          ? `${r.stops.length} stops${r.neighborhood ? ` in ${r.neighborhood}` : ""}. Go with friends, any time the places are open. No host, no ticket.`
          : r.status === "not_open"
            ? "Opens soon."
            : "This route has closed."}
      </p>
      {open && r.open_until && <p className="play__window">{openThrough(r.open_until)}</p>}

      <ol className="play__stops">
        {r.stops.map((s, i) => (
          <li key={i}>
            <span className="mono play__num">{String(s.stop ?? i + 1).padStart(2, "0")}</span>
            <span>
              <strong>{s.title}</strong>
              {s.where && <span className="play__where">{s.where}</span>}
              {s.hours && <span className="play__hours">{s.hours}</span>}
            </span>
          </li>
        ))}
      </ol>

      {open && (
        <div className="play__start">
          {msg && MESSAGES[msg] && (
            <p className="form__error" role="alert">
              {MESSAGES[msg]}
            </p>
          )}
          {!r.signed_in ? (
            <Link href={`/signin?next=${encodeURIComponent(`/play/${slug}`)}`} className="button button--primary play__cta">
              Start with friends
            </Link>
          ) : r.started ? (
            <Link href="/pass" className="button button--primary play__cta">
              {r.done ? "See my pass" : "Keep playing"}
            </Link>
          ) : (
            <form action={startRoute} className="form">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="session_id" value={r.id} />
              {!r.has_pass && (
                <>
                  <label className="label mono" htmlFor="name">
                    YOUR FIRST NAME
                  </label>
                  <input id="name" name="name" className="input" required maxLength={60} autoComplete="given-name" />
                </>
              )}
              {!r.team_name && (
                <>
                  <label className="label mono" htmlFor="team" style={{ marginTop: r.has_pass ? 0 : 16 }}>
                    TEAM NAME
                  </label>
                  <input id="team" name="team" className="input" required maxLength={40} placeholder="e.g. The Night Owls" />
                </>
              )}
              <button type="submit" className="button button--primary play__cta">
                {r.team_name ? `Play with ${r.team_name}` : "Start with friends"}
              </button>
              <p className="fine-print">Next, you&apos;ll get a link to text your friends so they join your team.</p>
            </form>
          )}
        </div>
      )}
      {!open && (
        <Link href="/pass" className="button button--primary play__cta">
          Open my pass
        </Link>
      )}
    </main>
  );
}
