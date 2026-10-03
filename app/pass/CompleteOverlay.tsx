"use client";

import { useEffect, useState } from "react";
import type { ShareMoment } from "@/lib/share";
import { SITE } from "@/lib/site";
import ShareSheet from "./ShareSheet";

type Props = {
  headline: string; // "Mission complete" / "You're in" / "Hidden quest found"
  sub: string | null; // e.g. the team name on arrival
  gained: number;
  fromXp: number;
  toXp: number;
  levelStart: number; // XP where the (new) level starts
  levelEnd: number | null; // XP for the next level (null at the top)
  levelLabel: string; // "LVL 02"
  leveledUp: boolean;
  next: string | null; // "Mission 2 unlocked" / "Final mission unlocked"
  share: ShareMoment | null; // meaningful moments only (not the start-sign check-in)
};

// The "something happened" moment after finishing a mission: XP counts up, the bar fills, a level-up
// shows if it happened, then it gets out of the way and the next mission is right there.
export default function CompleteOverlay(p: Props) {
  const [open, setOpen] = useState(true);
  const [shownXp, setShownXp] = useState(p.fromXp);
  const [filled, setFilled] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    // Don't replay it on refresh.
    try {
      window.history.replaceState(null, "", "/pass");
    } catch {}
    try {
      navigator.vibrate?.([30, 40, 60]);
    } catch {}
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShownXp(Math.round(p.fromXp + (p.toXp - p.fromXp) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const fill = setTimeout(() => setFilled(true), 60);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fill);
    };
  }, [p.fromXp, p.toXp]);

  // Closes by itself, a beat longer when the moment can be shared, and never while sharing.
  useEffect(() => {
    if (sharing) return;
    const close = setTimeout(() => setOpen(false), p.share ? 6000 : 3600);
    return () => clearTimeout(close);
  }, [sharing, p.share]);

  if (!open) return null;
  if (sharing && p.share) {
    return (
      <div className="complete" role="dialog" aria-modal="true" aria-label="Share your moment">
        <div className="complete__card">
          <ShareSheet moment={p.share} onClose={() => setOpen(false)} />
        </div>
      </div>
    );
  }
  const span = p.levelEnd === null ? 1 : p.levelEnd - p.levelStart;
  const pctFrom = p.levelEnd === null ? 100 : Math.max(0, Math.min(100, ((p.fromXp - p.levelStart) / span) * 100));
  const pctTo = p.levelEnd === null ? 100 : Math.max(0, Math.min(100, ((p.toXp - p.levelStart) / span) * 100));

  return (
    <div className="complete" role="dialog" aria-modal="true" aria-label={p.headline} onClick={() => setOpen(false)}>
      <div className="complete__card">
        {SITE.pointsVisible && p.leveledUp && <p className="complete__kicker mono">LEVEL UP</p>}
        <h2 className="complete__headline">{p.headline}</h2>
        {p.sub && <p className="complete__sub">{p.sub}</p>}
        {SITE.pointsVisible && (
          <>
          {p.gained > 0 && <p className="complete__xp mono">+{p.gained} XP</p>}
          <div className="complete__bar" aria-hidden="true">
            <span style={{ width: `${filled ? pctTo : p.leveledUp ? 0 : pctFrom}%` }} />
          </div>
          <p className="complete__nums mono">
            {p.levelLabel} · {shownXp}
            {p.levelEnd !== null ? ` / ${p.levelEnd} XP` : " XP"}
          </p>
          </>
        )}
        {p.next && <p className="complete__next mono">{p.next.toUpperCase()}</p>}
        <button type="button" className="button button--primary" onClick={(e: { stopPropagation(): void }) => (e.stopPropagation(), setOpen(false))}>
          {p.next ? "Let's go" : "Back to my pass"}
        </button>
        {p.share && (
          <button
            type="button"
            className="link-button complete__share"
            onClick={(e: { stopPropagation(): void }) => {
              e.stopPropagation();
              setSharing(true);
            }}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
