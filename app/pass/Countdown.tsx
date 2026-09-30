"use client";

import { useEffect, useState } from "react";

// Target pace for the current mission. A guide, not a rule: nothing locks when it runs out.
export default function Countdown({ startedAt, minutes }: { startedAt: string; minutes: number }) {
  const end = new Date(startedAt).getTime() + minutes * 60_000;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span className="mono mission__clock">{minutes} MIN</span>;
  const left = Math.round((end - now) / 1000);
  if (left <= 0) {
    return <span className="mono mission__clock mission__clock--over">+{Math.ceil(-left / 60)} MIN · KEEP GOING</span>;
  }
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return (
    <span className={`mono mission__clock${left < 180 ? " mission__clock--soon" : ""}`} aria-label={`${m} minutes ${s} seconds left`}>
      {m}:{s} LEFT
    </span>
  );
}
