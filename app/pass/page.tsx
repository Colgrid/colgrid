import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import InstallCard from "@/app/components/InstallCard";
import SupportLine from "@/app/components/SupportLine";
import TabBar from "@/app/components/TabBar";
import { formatLevel, formatNumber, levelFor } from "@/lib/game/levels";
import type { ShareMoment } from "@/lib/share";
import { SITE } from "@/lib/site";
import { activeQuest, allMainDone, arrivalOpen, questProgress, type PassSession, type QuestView } from "@/lib/game/pass";
import CompleteOverlay from "./CompleteOverlay";
import FirstRun from "./FirstRun";
import MissionCheck from "./MissionCheck";
import { loadPass, type PassData } from "./data";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "Your pass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Chapter 01 plays in Salt Lake City. When more chapters open, this moves onto the chapter row.
const CHAPTER_TIME_ZONE = "America/Denver";

type Pass = Extract<PassData, { kind: "pass" }>;

export default async function PassPage({ searchParams }: { searchParams: Promise<{ complete?: string; kind?: string }> }) {
  const { complete, kind } = await searchParams;
  const data = await loadPass();
  if (!data) redirect("/signin");
  if (data.kind === "no-pass") return <NoPass email={data.email} isStaff={data.isStaff} isAdmin={data.isAdmin} />;
  const gained = complete !== undefined ? Math.max(0, Number(complete) || 0) : null;
  return <PlayerPass pass={data} gained={gained} kind={kind ?? "mission"} />;
}

// ------------------------------------------------------------------------------------------------

function PlayerPass({ pass, gained, kind }: { pass: Pass; gained: number | null; kind: string }) {
  const level = levelFor(pass.totalXp);
  const mode = pass.team?.mode ?? "casual";
  const tournament = SITE.tournamentOpen && mode === "tournament";
  const live = pass.sessions.live;

  return (
    <>
      <main className="page page--tabs">
        {gained !== null ? <Celebration pass={pass} gained={gained} kind={kind} /> : <FirstRun />}

        <header className="pass-header">
          <span className="logo-tile logo-tile--sm">
            {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
            <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={40} height={40} priority style={{ transform: "scale(1.7)" }} />
          </span>
          <div className="pass-header__chips">
            <span className="chip chip--level">{formatLevel(level.level)}</span>
            {SITE.tournamentOpen && <span className={`chip chip--${mode}`}>{mode.toUpperCase()}</span>}
          </div>
        </header>

        <section className="identity">
          <div>
            <h1 className="identity__name">{pass.player.name}</h1>
            <p className="identity__team">{pass.team?.name ?? "Your team drops at the start."}</p>
          </div>
          {tournament && pass.standing && (
            <div className="rank-box" aria-label={`Rank ${pass.standing.rank}, ${pass.standing.points} points`}>
              <span className="rank-box__rank">#{pass.standing.rank}</span>
              <span className="mono rank-box__pts">{pass.standing.points} PTS</span>
            </div>
          )}
        </section>

        {/* What matters right now: the session and your progress, then the mission. */}
        <NowCard pass={pass} level={level} />

        <MissionPanel pass={pass} />

        {(live || pass.sessions.next) && <SupportLine />}


        {/* During a session the mission card is the whole story; the list comes back as a recap. */}
        {!live && <QuestSection pass={pass} tournament={tournament} />}

        {!live && <InstallCard />}

        <AccountFooter email={pass.email} isStaff={pass.isStaff} isAdmin={pass.isAdmin} />
      </main>
      <TabBar active="pass" />
    </>
  );
}

// The mission-complete moment. Before/after XP comes from the pass (the XP just earned is already in).
function Celebration({ pass, gained, kind }: { pass: Pass; gained: number; kind: string }) {
  const after = levelFor(pass.totalXp);
  const before = levelFor(Math.max(0, pass.totalXp - gained));
  const focus = pass.focus;
  let next: string | null = null;
  if (focus && focus.session.status === "live") {
    const active = activeQuest(focus.quests);
    if (allMainDone(focus.quests)) next = focus.guided?.finale_name ? "Final mission unlocked" : "Every mission done";
    else if (active?.mission) next = `Mission ${active.mission} unlocked`;
  }
  const headline = kind === "arrived" ? "You're in." : kind === "hidden" ? "Hidden quest found." : "Mission complete.";
  // What can be shared from this moment: never the arrival, never a mission's name or place (lib/share.ts).
  let share: ShareMoment | null = null;
  if (kind !== "arrived" && focus) {
    const main = focus.quests.filter((q) => q.mission !== undefined);
    const done = main.filter((q) => q.state === "done").length;
    const leveled = after.level > before.level;
    share = {
      kind: kind === "hidden" ? "hidden" : main.length > 0 && done === main.length ? "all" : "mission",
      mission: kind === "hidden" ? null : done || null,
      of: main.length || null,
      xp: gained,
      level: leveled ? after.level : null,
      place: focus.session.neighborhood,
      date: focus.session.starts_at
        ? new Intl.DateTimeFormat("en-CA", { timeZone: CHAPTER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(focus.session.starts_at))
        : null,
    };
  }
  return (
    <CompleteOverlay
      headline={headline}
      sub={kind === "arrived" && pass.team ? `Your team: ${pass.team.name}` : null}
      gained={gained}
      fromXp={before.totalXp}
      toXp={after.totalXp}
      levelStart={after.levelStartXp}
      levelEnd={after.nextLevelXp}
      levelLabel={formatLevel(after.level)}
      leveledUp={after.level > before.level}
      next={next}
      share={share}
    />
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

function NowCard({ pass, level }: { pass: Pass; level: ReturnType<typeof levelFor> }) {
  const { live, next } = pass.sessions;
  const shown = live ?? next;
  const pct = Math.round(level.progress * 100);

  let detail: string | null = null;
  if (shown) {
    const when = live ? null : formatWhen(shown.starts_at);
    const where = shown.revealed && shown.start_location ? `Start: ${shown.start_location}` : "Location drops 48 hours before.";
    detail = when ? `${when} · ${where}` : where;
  }

  return (
    <section className={`now-card${live ? " now-card--live" : ""}`}>
      <p className="mono now-card__tag">{shown ? `SESSION ${formatNumber(shown.number)}${live ? " · NOW" : ""}` : "SEASON"}</p>
      <p className="now-card__name">{shown ? shown.neighborhood ?? "Colgrid" : "See you next season."}</p>
      {!live && detail && <p className="now-card__detail">{detail}</p>}

      <p className="now-card__xp mono">{level.totalXp.toLocaleString("en-US")} XP</p>
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
      <p className="now-card__to">{level.xpToNext !== null ? `${level.xpToNext.toLocaleString("en-US")} to Level ${formatNumber(level.level + 1)}` : "Top level"}</p>
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
  // Nobody has started the session yet, but it's time: point the player to the start.
  const arriving = !pass.sessions.live && arrivalOpen(pass.sessions.next) ? pass.sessions.next : null;
  if (arriving) {
    return (
      <section className="mission mission--arrive">
        <h2 className="mission__title">Head to the start.</h2>
        {arriving.revealed && arriving.start_location && <p className="mission__where">{arriving.start_location}</p>}
        {arriving.revealed ? (
          <>
            <MissionCheck sessionId={arriving.id} needsLocation needsAnswer={false} />
            <Link href="/check-in" className="mission__fallback">
              Have a start code? Enter it
            </Link>
          </>
        ) : (
          <p className="mission__text">Location drops 48 hours before.</p>
        )}
      </section>
    );
  }
  if (!focus || focus.session.status !== "live") return null;
  const guided = focus.guided;

  if (guided && !guided.arrived) {
    return (
      <section className="mission mission--arrive">
        <h2 className="mission__title">Head to the start.</h2>
        {focus.session.start_location && <p className="mission__where">{focus.session.start_location}</p>}
        <MissionCheck sessionId={focus.session.id} needsLocation needsAnswer={false} />
        <Link href="/check-in" className="mission__fallback">
          Have a start code? Enter it
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
          Every mission done. Finale meal{guided.finale_at ? ` at ${formatTime(guided.finale_at)}` : ""}.
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
          {next
            ? arrivalOpen(next)
              ? "Check in at the start."
              : "Missions unlock when the session starts."
            : "No quests right now."}
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
