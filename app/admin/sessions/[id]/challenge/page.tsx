import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import Notice from "../../../Notice";
import { addPerformanceReward, awardRewards, reviewPhoto, saveAsk, saveChallenge, setRewardStatus } from "../../../challenge-actions";

type Session = {
  id: string;
  number: number;
  route_name: string | null;
  is_challenge: boolean;
  client_name: string | null;
  client_objective: string | null;
  base_reward_cents: number;
  base_reward_form: string;
  base_reward_min_asks: number | null;
};
type Ask = { id: string; title: string; stop_number: number | null; is_hidden: boolean; needs_photo: boolean; sponsor_name: string | null; sponsor_reward_cents: number | null };
type Photo = { id: string; quest_id: string; team_id: string; player_id: string; storage_path: string; status: string; created_at: string };
type Reward = { id: string; player_id: string; quest_id: string | null; kind: string; amount_cents: number; form: string; status: string; note: string | null; sent_at: string | null };
type Person = { id: string; name: string; email: string };

const dollars = (c: number | null) => (c === null ? "" : (c / 100).toFixed(c % 100 === 0 ? 0 : 2));
const KIND: Record<string, string> = { guaranteed: "Guaranteed", sponsored: "Business-sponsored", performance: "Performance pool" };
const FORM: Record<string, string> = { gift_card: "gift card", cash: "cash" };

// Everything for running a paid challenge in one place: settings, which asks need a photo or carry a
// business reward, photos to review, and the rewards list (who earned what, sent or not).
// Rewards are paid outside the app; this page is the record.
export default async function ChallengeAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  const { supabase } = await requireAdmin();

  const sessionRes = await supabase
    .from("session")
    .select("id, number, route_name, is_challenge, client_name, client_objective, base_reward_cents, base_reward_form, base_reward_min_asks")
    .eq("id", id)
    .maybeSingle();
  if (sessionRes.error) {
    return (
      <>
        <p className="admin-crumb">
          <Link href={`/admin/sessions/${id}`}>← Back</Link>
        </p>
        <h1 className="admin-title">Challenge</h1>
        <p className="admin-empty">
          The database isn&apos;t ready for challenges yet. Run <span className="mono">20261002000020_challenges.sql</span> and{" "}
          <span className="mono">20261002000021_photo_asks.sql</span> in the Supabase SQL Editor, then reload this page.
        </p>
      </>
    );
  }
  const session = sessionRes.data as Session | null;
  if (!session) notFound();

  const askRes = await supabase.from("quest").select("id, title, stop_number, is_hidden, needs_photo, sponsor_name, sponsor_reward_cents").eq("session_id", id);
  const asks = rows<Ask>(askRes.data).sort((a, b) => (a.stop_number ?? 99) - (b.stop_number ?? 99));
  const askIds = asks.map((a) => a.id);
  const askTitle = new Map(asks.map((a) => [a.id, a.title]));

  const [photoRes, rewardRes, completionRes] = await Promise.all([
    askIds.length ? supabase.from("photo_proof").select("id, quest_id, team_id, player_id, storage_path, status, created_at").in("quest_id", askIds).order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    supabase.from("reward").select("id, player_id, quest_id, kind, amount_cents, form, status, note, sent_at").eq("session_id", id).order("earned_at", { ascending: true }).limit(2000),
    askIds.length ? supabase.from("completion").select("team_id").in("quest_id", askIds) : Promise.resolve({ data: [] }),
  ]);
  const photos = rows<Photo>(photoRes.data);
  const rewards = rows<Reward>(rewardRes.data);

  // Everyone on a team that finished at least one ask (for names on the lists and the performance form).
  const teamIds = [...new Set(rows<{ team_id: string }>(completionRes.data).map((c) => c.team_id))];
  const memberRes = teamIds.length ? await supabase.from("team_member").select("player_id").in("team_id", teamIds) : { data: [] };
  const playerIds = [...new Set([...rows<{ player_id: string }>(memberRes.data).map((m) => m.player_id), ...rewards.map((r) => r.player_id), ...photos.map((p) => p.player_id)])];
  const peopleRes = playerIds.length ? await supabase.from("player").select("id, name, email").in("id", playerIds) : { data: [] };
  const people = rows<Person>(peopleRes.data).sort((a, b) => a.name.localeCompare(b.name));
  const person = new Map(people.map((p) => [p.id, p]));

  // Short-lived links so the photos can be shown here (the bucket is private).
  const pending = photos.filter((p) => p.status === "pending");
  const signed = pending.length ? await supabase.storage.from("proof").createSignedUrls(pending.map((p) => p.storage_path), 3600) : { data: [] };
  const photoUrl = new Map<string, string>();
  for (const s of rows<{ path: string | null; signedUrl: string | null }>(signed.data)) if (s.path && s.signedUrl) photoUrl.set(s.path, s.signedUrl);

  const live = rewards.filter((r) => r.status !== "void");
  const owed = live.filter((r) => r.status === "earned").reduce((n, r) => n + r.amount_cents, 0);
  const sent = live.filter((r) => r.status !== "earned").reduce((n, r) => n + r.amount_cents, 0);

  return (
    <>
      <p className="admin-crumb">
        <Link href={`/admin/sessions/${id}`}>← {session.route_name ?? `Session ${String(session.number).padStart(2, "0")}`}</Link>
      </p>
      <h1 className="admin-title">Challenge</h1>
      <Notice msg={msg} />
      <div className="admin-actions">
        <Link href={`/admin/sessions/${id}/report`} className="button button--primary">
          Outcome Report
        </Link>
      </div>

      <section className="admin-section">
        <h2>Settings</h2>
        <form action={saveChallenge} className="admin-form">
          <input type="hidden" name="id" value={session.id} />
          <label className="admin-check">
            <input type="checkbox" name="is_challenge" defaultChecked={session.is_challenge} /> This is a client challenge
          </label>
          <label>
            Client
            <input name="client_name" maxLength={120} defaultValue={session.client_name ?? ""} />
          </label>
          <label>
            Client&apos;s objective
            <input name="client_objective" maxLength={500} defaultValue={session.client_objective ?? ""} />
          </label>
          <label>
            Guaranteed reward per participant, in dollars (0 = none)
            <input name="base_reward" inputMode="decimal" maxLength={8} defaultValue={dollars(session.base_reward_cents)} />
          </label>
          <label>
            Paid as
            <select name="base_reward_form" defaultValue={session.base_reward_form}>
              <option value="gift_card">Gift card</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <label>
            Asks a team must finish to earn it (blank = all of them)
            <input name="base_reward_min_asks" inputMode="numeric" maxLength={3} defaultValue={session.base_reward_min_asks ?? ""} />
          </label>
          <div className="admin-actions">
            <button className="button button--dark" type="submit">
              Save settings
            </button>
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>Asks</h2>
        <p className="admin-meta">Titles, places and answers are edited on the session page. Here: which asks need a photo, and which a business is paying a reward for.</p>
        {asks.length === 0 ? (
          <p className="admin-empty">No asks yet.</p>
        ) : (
          asks.map((a) => (
            <form action={saveAsk} className="admin-form" key={a.id}>
              <input type="hidden" name="session_id" value={id} />
              <input type="hidden" name="quest_id" value={a.id} />
              <strong>
                {a.stop_number !== null ? `${a.stop_number}. ` : ""}
                {a.title}
                {a.is_hidden ? " (hidden)" : ""}
              </strong>
              <label className="admin-check">
                <input type="checkbox" name="needs_photo" defaultChecked={a.needs_photo} /> Needs a photo
              </label>
              <label>
                Sponsoring business (optional)
                <input name="sponsor_name" maxLength={120} defaultValue={a.sponsor_name ?? ""} />
              </label>
              <label>
                Sponsored reward per participant, in dollars (blank = none)
                <input name="sponsor_reward" inputMode="decimal" maxLength={8} defaultValue={dollars(a.sponsor_reward_cents)} />
              </label>
              <div className="admin-actions">
                <button className="button button--dark" type="submit">
                  Save ask
                </button>
              </div>
            </form>
          ))
        )}
      </section>

      <section className="admin-section">
        <h2>Photos to review</h2>
        <p className="admin-meta">
          {photos.length} sent · {photos.filter((p) => p.status === "approved").length} approved · {pending.length} waiting
        </p>
        {pending.length === 0 ? (
          <p className="admin-empty">Nothing waiting.</p>
        ) : (
          <ul className="admin-list">
            {pending.map((p) => (
              <li key={p.id} className="admin-quest">
                <div className="admin-quest__main">
                  <strong>{askTitle.get(p.quest_id) ?? "Ask"}</strong>
                  <span>{person.get(p.player_id)?.name ?? "Participant"}</span>
                  {photoUrl.get(p.storage_path) && (
                    <a href={photoUrl.get(p.storage_path)} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl.get(p.storage_path)} alt="Photo sent for this ask" style={{ maxWidth: 260, width: "100%", borderRadius: 12, marginTop: 8 }} />
                    </a>
                  )}
                </div>
                <div className="admin-quest__side">
                  <form action={reviewPhoto}>
                    <input type="hidden" name="session_id" value={id} />
                    <input type="hidden" name="photo_id" value={p.id} />
                    <button className="button button--primary" type="submit" name="decision" value="approve">
                      Approve
                    </button>
                    <button className="button button--dark" type="submit" name="decision" value="reject" style={{ marginTop: 8 }}>
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section">
        <h2>Rewards</h2>
        <p className="admin-meta">
          ${dollars(owed) || "0"} still to send · ${dollars(sent) || "0"} sent. Rewards are paid outside the app (gift cards or cash); this list is the record.
        </p>
        <form action={awardRewards} className="admin-actions">
          <input type="hidden" name="session_id" value={id} />
          <button className="button button--primary" type="submit">
            Work out who has earned rewards
          </button>
        </form>
        <p className="admin-hint">Safe to press again: nobody is added twice. Every member of a team that finished the asks earns the reward.</p>
        {rewards.length === 0 ? (
          <p className="admin-empty">No rewards yet.</p>
        ) : (
          <ul className="admin-list" style={{ marginTop: 16 }}>
            {rewards.map((r) => (
              <li key={r.id} className="admin-quest">
                <div className="admin-quest__main">
                  <strong>
                    {person.get(r.player_id)?.name ?? "Participant"} · ${dollars(r.amount_cents)} {FORM[r.form] ?? r.form}
                  </strong>
                  <span>{person.get(r.player_id)?.email ?? ""}</span>
                  <span>
                    {KIND[r.kind] ?? r.kind}
                    {r.quest_id ? ` · ${askTitle.get(r.quest_id) ?? "ask"}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </div>
                <div className="admin-quest__side">
                  <span className={`status status--${r.status === "earned" ? "scheduled" : r.status === "void" ? "closed" : "live"}`}>{r.status.toUpperCase()}</span>
                  <form action={setRewardStatus} style={{ marginTop: 8 }}>
                    <input type="hidden" name="session_id" value={id} />
                    <input type="hidden" name="reward_id" value={r.id} />
                    {r.status === "earned" && (
                      <button className="button button--primary" type="submit" name="status" value="sent">
                        Mark sent
                      </button>
                    )}
                    {r.status === "sent" && (
                      <button className="button button--dark" type="submit" name="status" value="claimed">
                        Mark claimed
                      </button>
                    )}
                    {r.status !== "void" && r.status !== "claimed" && (
                      <button className="button button--dark" type="submit" name="status" value="void" style={{ marginTop: 8 }}>
                        Void
                      </button>
                    )}
                    {r.status === "void" && (
                      <button className="button button--dark" type="submit" name="status" value="earned">
                        Restore
                      </button>
                    )}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <details className="admin-form-toggle" style={{ marginTop: 16 }}>
          <summary>Add a performance pool share</summary>
          <form action={addPerformanceReward} className="admin-form">
            <input type="hidden" name="session_id" value={id} />
            <label>
              Participant
              <select name="player_id" defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount, in dollars
              <input name="amount" inputMode="decimal" maxLength={8} />
            </label>
            <label>
              Paid as
              <select name="form" defaultValue="gift_card">
                <option value="gift_card">Gift card</option>
                <option value="cash">Cash</option>
              </select>
            </label>
            <label>
              Note (optional)
              <input name="note" maxLength={300} placeholder="e.g. target hit: 400 first-time visits" />
            </label>
            <div className="admin-actions">
              <button className="button button--dark" type="submit">
                Add reward
              </button>
            </div>
          </form>
        </details>
      </section>
    </>
  );
}
