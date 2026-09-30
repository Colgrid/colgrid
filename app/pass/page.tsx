import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import InstallCard from "@/app/components/InstallCard";
import TabBar from "@/app/components/TabBar";
import { formatLevel, formatNumber, levelFor } from "@/lib/game/levels";
import { activeQuest, allMainDone, questProgress, type PassSession, type QuestView } from "@/lib/game/pass";
import MissionCheck from "./MissionCheck";
import Countdown from "./Countdown";
import { loadPass, type PassData } from "./data";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Your pass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Chapter 01 plays in Salt Lake City. When more chapters open, this moves onto the chapter row.
const CHAPTER_TIME_ZONE = "America/Denver";

type Pass = Extract<PassData, { kind: "pass" }>;

export default async function PassPage({ searchParams }: { searchParams: Promise<{ complete?: string }> }) {
  const { complete } = await searchParams;
  const data = await loadPass();
  if (!data) redirect("/signin");
  if (data.kind === "no-pass") return <NoPass email={data.email} isStaff={data.isStaff} isAdmin={data.isAdmin} />;
  const gained = complete !== undefined ? Math.max(0, Number(complete) || 0) : null;
  return <PlayerPass pass={data} gained={gained} />;
}

// ------------------------------------------------------------------------------------------------

function PlayerPass({ pass, gained }: { pass: Pass; gained: number | null }) {
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

        {gained !== null && (
          <p className="mission-toast" role="status">
            <strong>Mission complete.</strong>
            {gained > 0 && <span className="mono"> +{gained} XP</span>}
          </p>
        )}

        <MissionPanel pass={pass} />

        <NowCard pass={pass} level={level} />

        <InstallCard />

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

        <AccountFooter email={pass.email} isStaff={pass.isStaff} isAdmin={pass.isAdmin} />
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

// ------------------------------------------------------------------------------------------------
// Guided mode: the app tells the team where to go and what to do, one mission at a time.

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: CHAPTER_TIME_ZONE }).format(new Date(iso));
}

function MissionPanel({ pass }: { pass: Pass }) {
  const focus = pass.focus;
  if (!focus || focus.session.status !== "live") return null;
  const guided = focus.guided;

  if (guided && !guided.arrived) {
    return (
      <section className="mission mission--arrive">
        <p className="mono mission__kicker">YOU&apos;RE NOT CHECKED IN YET</p>
        <h2 className="mission__title">Find the Colgrid sign.</h2>
        <p className="mission__text">
          {focus.session.start_location ? `It's at the start: ${focus.session.start_location}. ` : ""}Scan it to check in, meet your team and
          unlock your first mission.
        </p>
        <Link href="/check-in" className="button button--primary">
          Scan the start sign
        </Link>
      </section>
    );
  }

  const main = focus.quests.filter((q) => q.mission !== undefined);
  if (allMainDone(focus.quests)) {
    if (!guided?.finale_name) return null;
    return (
      <section className="mission mission--finale">
        <p className="mono mission__kicker">FINAL MISSION UNLOCKED</p>
        <h2 className="mission__title">Head to {guided.finale_name}.</h2>
        {guided.finale_where && <p className="mission__where">{guided.finale_where}</p>}
        <p className="mission__text">
          Every mission done. Regroup with every team for the finale meal and your first drink
          {guided.finale_at ? `, around ${formatTime(guided.finale_at)}` : ""}. Badges get handed out there.
        </p>
      </section>
    );
  }

  const q = activeQuest(focus.quests);
  if (!q) return null;
  return (
    <section className="mission" aria-labelledby="mission-title">
      <div className="mission__top">
        <p className="mono mission__kicker">
          MISSION {q.mission} OF {main.length}
        </p>
        {q.time_limit_min && guided?.mission_started_at && <Countdown startedAt={guided.mission_started_at} minutes={q.time_limit_min} />}
      </div>
      <h2 id="mission-title" className="mission__title">
        {q.title}
      </h2>
      {(q.where_text || q.host_business) && (
        <p className="mission__where">
          {q.where_text ?? q.host_business}{" "}
          <a
            className="mission__map"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.where_text ?? q.host_business}, ${focus.session.neighborhood ?? ""} Salt Lake City`)}`}
            target="_blank"
            rel="noopener"
          >
            Map
          </a>
        </p>
      )}
      {q.briefing && <p className="mission__text">{q.briefing}</p>}
      {q.verify && q.verify !== "code" ? (
        <>
          <MissionCheck questId={q.id} needsLocation={q.verify.startsWith("location")} needsAnswer={q.verify.endsWith("answer")} />
          <Link href="/check-in" className="mission__fallback">
            Have a host code? Enter it instead
          </Link>
        </>
      ) : (
        <>
          <p className="mission__verify">Done? Your host has the code.</p>
          <Link href="/check-in" className="button button--primary">
            Enter the code
          </Link>
        </>
      )}
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
      {!live && focus.session.survey_url && (
        <a href={focus.session.survey_url} className="button button--primary" target="_blank" rel="noopener" style={{ marginTop: 12 }}>
          How was it? Take the 2-minute survey
        </a>
      )}
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

  const label = quest.mission !== undefined ? `Mission ${quest.mission}` : stop;
  if (quest.state === "locked") {
    // Later missions stay a mystery until they unlock.
    return (
      <li className="quest quest--locked">
        <span className="quest__icon" aria-hidden="true" />
        <div className="quest__body">
          <p className="quest__title">{label ?? "Up next"}</p>
          <p className="quest__meta">Unlocks when you finish the one before.</p>
        </div>
        <div className="quest__reward mono">
          <span className="quest__xp">+{quest.xp}</span>
        </div>
        <span className="visually-hidden">Locked</span>
      </li>
    );
  }

  const meta: Record<Exclude<QuestView["state"], "hidden" | "locked">, string | null> = {
    done: [label, quest.host_business].filter(Boolean).join(" · ") || null,
    active: [label, "Now"].filter(Boolean).join(" · "),
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
        {quest.state === "done" ? "Completed" : quest.state === "active" ? "Current quest" : ""}
      </span>
    </li>
  );
}

// ------------------------------------------------------------------------------------------------

function AccountFooter({ email, isStaff, isAdmin }: { email: string; isStaff: boolean; isAdmin: boolean }) {
  return (
    <footer className="account">
      <p>
        Signed in as <span className="mono">{email}</span>
        {isStaff && <span className="account__crew mono"> · CREW</span>}
      </p>
      {isStaff && <Link href="/gm">Run the night</Link>}
      {isAdmin && <Link href="/admin">Admin</Link>}
      <form action="/auth/signout" method="post">
        <button type="submit" className="link-button">
          Sign out
        </button>
      </form>
    </footer>
  );
}

function NoPass({ email, isStaff, isAdmin }: { email: string; isStaff: boolean; isAdmin: boolean }) {
  return (
    <main className="page">
      <span className="logo-tile logo-tile--sm">
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
      </span>
      <h1 style={{ fontSize: 32, marginTop: 24 }}>{isStaff ? "You’re crew." : "No pass here yet."}</h1>
      {isStaff ? (
        <p className="lede">
          This account runs the game, but it has no player pass.{" "}
          <Link href="/gm">Run the night</Link>
          {isAdmin && (
            <>
              {" · "}
              <Link href="/admin">Admin</Link>
            </>
          )}
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
        <AccountFooter email={email} isStaff={isStaff} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
