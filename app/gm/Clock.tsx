"use client";

import { useEffect, useState } from "react";

// Time since the session started, e.g. "1:12". Updates every 20 seconds.
export default function Clock({ since }: { since: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  if (!since) return <>–</>;
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  return (
    <span suppressHydrationWarning>
      {Math.floor(mins / 60)}:{String(mins % 60).padStart(2, "0")}
    </span>
  );
}
