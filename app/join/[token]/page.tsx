import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isInviteToken } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { joinTeam } from "@/app/play/actions";

// Private: a team's invite link.
export const metadata: Metadata = { title: "Join the team", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Invite = {
  status: "ok" | "not_found" | "closed";
  team_name: string;
  members: number;
  slug: string;
  route_name: string;
  neighborhood: string | null;
  session_id: string;
  is_member: boolean;
};

const MESSAGES: Record<string, string> = {
  name: "Add your first name.",
  other: "You've already played with another team this season, so your progress stays with that team.",
  closed: "This route isn't open right now.",
  error: "Something went wrong. Try again.",
};

export default async function JoinPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { token } = await params;
  const { msg } = await searchParams;
  if (!isInviteToken(token)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([supabase.rpc("team_invite_info", { p_token: token }), supabase.auth.getUser()]);
  const invite = data as Invite | null;
  if (!invite || invite.status === "not_found") notFound();
  const signedIn = !!auth.user;
  const { data: playerId } = signedIn ? await supabase.rpc("claim_my_pass") : { data: null };

  return (
    <main className="page play">
      <span className="logo-tile logo-tile--sm">
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
      </span>
      <h1 className="play__title">Join {invite.team_name}.</h1>
      <p className="lede">
        {invite.route_name}
        {invite.neighborhood ? ` in ${invite.neighborhood}` : ""}. A Colgrid route you play together.
      </p>

      {invite.status === "closed" ? (
        <p className="empty">This route has closed.</p>
      ) : invite.is_member ? (
        <Link href="/pass" className="button button--primary play__cta">
          You&apos;re on the team. Open my pass
        </Link>
      ) : (
        <div className="play__start">
          {msg && MESSAGES[msg] && (
            <p className="form__error" role="alert">
              {MESSAGES[msg]}
            </p>
          )}
          {!signedIn ? (
            <Link href={`/signin?next=${encodeURIComponent(`/join/${token}`)}`} className="button button--primary play__cta">
              Join the team
            </Link>
          ) : msg === "other" ? (
            <Link href="/pass" className="button button--primary play__cta">
              Open my pass
            </Link>
          ) : (
            <form action={joinTeam} className="form">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="session_id" value={invite.session_id} />
              {!playerId && (
                <>
                  <label className="label mono" htmlFor="name">
                    YOUR FIRST NAME
                  </label>
                  <input id="name" name="name" className="input" required maxLength={60} autoComplete="given-name" />
                </>
              )}
              <button type="submit" className="button button--primary play__cta">
                Join {invite.team_name}
              </button>
            </form>
          )}
        </div>
      )}
      <p className="fine-print">
        <Link href={`/play/${invite.slug}`}>See the route</Link>
      </p>
    </main>
  );
}
