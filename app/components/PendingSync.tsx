"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isNetworkError, outcomeFor, readPending, removePending, retryLater, timeout } from "@/lib/offline-queue";
import { syncPending } from "@/app/pass/sync-actions";

const store = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const FAILED: Record<string, string> = {
  wrong_answer: "A saved answer wasn't right. Look again.",
  too_far: "A saved check-in was too far from the stop.",
  bad_code: "A saved code didn't work.",
  not_live: "A saved check-in was for a session that ended.",
};

// Sends check-ins that waited for signal: on open, when the phone comes back online, and every
// 15 seconds while anything is waiting. Shows one quiet line while it waits.
export default function PendingSync() {
  const router = useRouter();
  const [waiting, setWaiting] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const busy = useRef(false);

  const flush = useCallback(async () => {
    if (busy.current) return;
    const s = store();
    const list = readPending(s);
    setWaiting(list.length);
    if (!list.length || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    busy.current = true;
    const celebrate = { gained: 0, kind: "mission" };
    try {
      for (const item of list) {
        if (item.retryAt && item.retryAt > Date.now()) continue;
        try {
          const r = await timeout(syncPending(item), 20000);
          const outcome = outcomeFor(r.status);
          if (outcome === "done") {
            removePending(s, item.key);
            if (r.gained > 0) {
              celebrate.gained += r.gained;
              celebrate.kind = r.kind;
            }
          } else if (outcome === "retry") {
            retryLater(s, item.key, Date.now() + Math.max(5, r.seconds_left ?? 15) * 1000);
          } else {
            removePending(s, item.key);
            setNote(FAILED[r.status ?? ""] ?? "A saved check-in didn't count.");
          }
        } catch (e) {
          if (!isNetworkError(e)) removePending(s, item.key);
          break; // still no signal: try again later
        }
      }
    } finally {
      busy.current = false;
      setWaiting(readPending(s).length);
    }
    if (celebrate.gained > 0) router.push(`/pass?complete=${celebrate.gained}&kind=${celebrate.kind}`);
    else router.refresh();
  }, [router]);

  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    const onQueued = () => setWaiting(readPending(store()).length);
    window.addEventListener("online", onOnline);
    window.addEventListener("colgrid:queued", onQueued);
    const t = setInterval(() => {
      if (readPending(store()).length) void flush();
    }, 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("colgrid:queued", onQueued);
      clearInterval(t);
    };
  }, [flush]);

  if (!waiting && !note) return null;
  return (
    <p className="pending-line" role="status">
      {waiting ? `No signal. ${waiting === 1 ? "1 check-in" : `${waiting} check-ins`} saved, sending when you're back online.` : note}
    </p>
  );
}

// Used by the check-in screens: save an action that couldn't be sent, and tell PendingSync.
export function queueForLater(save: () => void) {
  save();
  try {
    window.dispatchEvent(new Event("colgrid:queued"));
  } catch {}
}
