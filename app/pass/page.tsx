import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import TabBar from "@/app/components/TabBar";
import { formatLevel, formatNumber, levelFor } from "@/lib/game/levels";
import { questProgress, type PassSession, type QuestView } from "@/lib/game/pass";
import { loadPass, type PassData } from "./data";

export const metadata: Metadata = { title: "Your pass · Colgrid" };
export const dynamic = "force-dynamic";

// Chapter 01 plays in Salt Lake City. When more chapters open, this moves onto the chapter row.
const CHAPTER_TIME_ZONE = "America/Denver";

type Pass = Extract<PassData, { kind: "pass" }>;

export default async function PassPage() {
  const data = await loadPass();
  if (!data) redirect("/signin");
  if (data.kind === "no-pass") return <NoPass email={data.email} isStaff={data.isStaff} />;
  return <PlayerPass pass={data} />;
}

// ------------------------------------------------------------------------------------------------

function PlayerPass({ pass }: { pass: Pass }) {
  const level = levelFor(pass.totalXp);
  const mode = pass.team?.mode ?? "casual";
  const tournament = mode === "tournament";
  const finals = pass.sessions.next?.is_finals ? pass.sessions.next : null;

  return (
    <>
      <main className="page page--tabs">
        <header className="pass-header">
          <span className="logo-tile logo-tile--sm">
            {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
            <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
          </span>
          <div className="pass-header__chips">
            <span className="chip chip--level">{formatLevel(level.level)}</span>
            <span className={`chip chip--${mode}`}>{mode.toUpperCase()}</span>
          </div>
        </header>

        <section className="identity">
          <div>
            <h1 className="identity__name">{pass.player.name}</h1>
            <p className="identity__team">{pass.team?.name ?? "Your team drops at the opening ritual."}</p>
            {pass.chapter && (
              <p className="mono identity__chapter">
                Chapter {formatNumber(pass.chapter.number)}: {pass.chapter.city}
              </p>
            )}
          </div>
          {tournament && pass.standing && (
            <div className="rank-box" aria-label={`Rank ${pass.standing.rank}, ${pass.standing.points} points`}>
              <span className="rank-box__rank">#{pass.standing.rank}</span>
              <span className="mono rank-box__pts">{pass.standing.points} PTS</span>
            </div>
          )}
        </section>

        <NowCard pass={pass} level={level} />

        <QuestSection pass={pass} tournament={tournament} />

        <section className="section">
          <h2 className="section__title">{tournament ? "Road to the Championship" : "Road to the flagship"}</h2>
          <div className="path-card">
            {tournament ? (
              <>
                <p>
                  The top 4 tournament teams play the Chapter Finals{finals ? ` at Session ${formatNumber(finals.number)}` : ""}. The
                  finals decide who goes on to the Championship at the flagship.
                </p>
                <dl className="stats">
                  <div>
                    <dt className="mono">RANK</dt>
                    <dd>{pass.standing ? `#${pass.standing.rank} of ${pass.standing.teamCount}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="mono">POINTS</dt>
                    <dd>{pass.standing?.points ?? 0}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <p>
                  Casual players can be drawn for the Explorer weekend at the flagship. Showing up and finding hidden quests earn
                  lottery entries. No ranking, ever.
                </p>
                <dl className="stats">
                  <div>
                    <dt className="mono">SESSIONS</dt>
                    <dd>
                      {pass.sessionsAttended} / {pass.sessionCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono">HIDDEN FOUND</dt>
                    <dd>{pass.hiddenFound}</dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Badges</h2>
            <span className="mono section__count">
              {pass.badges.filter((b) => b.earned).length} / {pass.badges.length}
            </span>
          </div>
          <ul className="badges">
            {pass.badges.map((b) => (
              <li key={b.key} className={`badge${b.earned ? " badge--earned" : ""}`} title={b.description ?? undefined}>
                <span className="badge__mark" aria-hidden="true">
                  {b.earned ? "★" : "?"}
                </span>
                <span className="badge__name">{b.name}</span>
                <span className="visually-hidden">{b.earned ? "earned" : "not earned yet"}</span>
              </li>
            ))}
          </ul>
        </section>

        <AccountFooter email={pass.email} isStaff={pass.isStaff} />
      </main>
      <TabBar active="pass" />
    </>
  );
}

// ------------------------------------------------------------------------------------------------

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CHAPTER_TIME_ZONE,
  }).format(new Date(iso));
}

function sessionLabel(s: PassSession): string {
  const name = s.is_finals ? `Session ${formatNumber(s.number)} · Finals` : `Session ${formatNumber(s.number)}`;
  return s.neighborhood ? `${name} · ${s.neighborhood}` : name;
}

function NowCard({ pass, level }: { pass: Pass; level: ReturnType<typeof levelFor> }) {
  const { live, next } = pass.sessions;
  const shown = live ?? next;
  const tag = live ? "NOW" : next ? "NEXT" : "SEASON";
  const pct = Math.round(level.progress * 100);

  let detail: string | null = null;
  if (shown) {
    const when = live ? null : formatWhen(shown.starts_at);
    const where = shown.revealed && shown.start_location ? `Start: ${shown.start_location}` : "Start location drops 24–48 hours before.";
    detail = when ? `${when} · ${where}` : where;
  }

  return (
    <section className={`now-card${live ? " now-card--live" : ""}`}>
      <p className="now-card__session">
        <span className="now-card__dot" aria-hidden="true" />
        <span className="mono now-card__tag">{tag}</span>
        <span>{shown ? sessionLabel(shown) : "Season complete. See you next season."}</span>
      </p>
      {detail && <p className="now-card__detail">{detail}</p>}

      <div className="xp-row">
        <span className="mono xp-row__total">
          {level.totalXp.toLocaleString("en-US")}
          {level.nextLevelXp !== null && <span className="xp-row__of"> / {level.nextLevelXp.toLocaleString("en-US")} XP</span>}
          {level.nextLevelXp === null && <span className="xp-row__of"> XP</span>}
        </span>
        <span className="mono xp-row__to">
          {level.xpToNext !== null ? `${level.xpToNext.toLocaleString("en-US")} TO ${formatLevel(level.level + 1)}` : "TOP LEVEL"}
        </span>
      </div>
      <div
        className="xp-bar"
        role="progressbar"
        aria-label={`Progress to ${formatLevel(level.level + 1)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function QuestSection({ pass, tournament }: { pass: Pass; tournament: boolean }) {
  const focus = pass.focus;

  if (!focus) {
    const next = pass.sessions.next;
    return (
      <section className="section">
        <h2 className="section__title">Quests</h2>
        <p className="empty">
          {next ? `Quests unlock when Session ${formatNumber(next.number)} starts. Keep your phone charged.` : "No quests right now."}
        </p>
      </section>
    );
  }

  const live = focus.session.status === "live";
  const { done, total } = questProgress(focus.quests);

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{live ? "Tonight’s quests" : `Session ${formatNumber(focus.session.number)} recap`}</h2>
        <span className="mono section__count">
          {done} / {total}
        </span>
      </div>
      {total === 0 ? (
        <p className="empty">No quests posted yet.</p>
      ) : (
        <ol className="quests">
          {focus.quests.map((q) => (
            <QuestItem key={q.id} quest={q} tournament={tournament} />
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestItem({ quest, tournament }: { quest: QuestView; tournament: boolean }) {
  const stop = quest.stop_number !== null ? `Stop ${quest.stop_number}` : null;

  if (quest.state === "hidden") {
    return (
      <li className="quest quest--hidden">
        <span className="quest__icon" aria-hidden="true">
          ?
        </span>
        <div className="quest__body">
          <p className="quest__title mono">??? ???</p>
          <p className="quest__meta">Hidden quest. Find it to unlock.</p>
        </div>
      </li>
    );
  }

  const meta: Record<Exclude<QuestView["state"], "hidden">, string | null> = {
    done: [quest.host_business, stop].filter(Boolean).join(" · ") || null,
    active: [quest.host_business, stop].filter(Boolean).join(" · ") || null,
    locked: [stop, "Up next"].filter(Boolean).join(" · "),
    open: "Revealed. Find it before the night ends.",
    judged: "Scored by the game master",
    missed: "Not completed",
  };

  return (
    <li className={`quest quest--${quest.state}`} aria-current={quest.state === "active" ? "step" : undefined}>
      <span className="quest__icon" aria-hidden="true">
        {quest.state === "done" ? "✓" : quest.state === "open" ? "!" : quest.state === "judged" ? "★" : ""}
      </span>
      <div className="quest__body">
        <p className="quest__title">{quest.title}</p>
        {meta[quest.state] && <p className="quest__meta">{meta[quest.state]}</p>}
      </div>
      <div className="quest__reward mono">
        <span className="quest__xp">+{quest.xp}</span>
        {tournament && quest.state === "done" && quest.points !== null && <span className="quest__pts">+{quest.points}</span>}
      </div>
      <span className="visually-hidden">
        {quest.state === "done" ? "Completed" : quest.state === "active" ? "Current quest" : quest.state === "locked" ? "Locked" : ""}
      </span>
      {quest.state === "active" && (
        <Link href="/check-in" className="button button--primary quest__cta">
          {quest.stop_number !== null ? `Check in at Stop ${quest.stop_number}` : "Check in"}
        </Link>
      )}
    </li>
  );
}

// ------------------------------------------------------------------------------------------------

function AccountFooter({ email, isStaff }: { email: string; isStaff: boolean }) {
  return (
    <footer className="account">
      <p>
        Signed in as <span className="mono">{email}</span>
        {isStaff && <span className="account__crew mono"> · CREW</span>}
      </p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="link-button">
          Sign out
        </button>
      </form>
    </footer>
  );
}

function NoPass({ email, isStaff }: { email: string; isStaff: boolean }) {
  return (
    <main className="page">
      <span className="logo-tile logo-tile--sm">
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
      </span>
      <h1 style={{ fontSize: 32, marginTop: 24 }}>{isStaff ? "You’re crew." : "No pass here yet."}</h1>
      {isStaff ? (
        <p className="lede">
          This account runs the game, but it has no player pass. The game master console arrives in a later update.
        </p>
      ) : (
        <>
          <p className="lede">
            We couldn&apos;t find a ticket for <strong>{email}</strong>.
          </p>
          <p className="lede">
            Bought with a different email? Sign out and use that one. Just bought? Your pass opens once your ticket is in. We&apos;ll
            email you.
          </p>
        </>
      )}
      <div style={{ marginTop: 32 }}>
        <AccountFooter email={email} isStaff={isStaff} />
      </div>
    </main>
  );
}
