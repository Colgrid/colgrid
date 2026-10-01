// Signal-drop protection: if a check-in or answer can't reach us, it waits on the phone and is sent
// again when the connection is back. Re-sending is always safe: the database awards each XP once
// (check_in / complete_mission / arrive return "already" for anything that already counted).
// Pure (storage is passed in) so it can be tested; the UI lives in app/components/PendingSync.tsx.

export type Pending =
  | { kind: "code"; code: string; at: number }
  | { kind: "mission"; questId: string; answer: string | null; lat: number | null; lng: number | null; accuracy: number | null; at: number }
  | { kind: "arrive"; sessionId: string; lat: number | null; lng: number | null; accuracy: number | null; at: number };

export type PendingItem = Pending & { key: string; retryAt?: number };

export type KeyValueStore = { getItem(k: string): string | null; setItem(k: string, v: string): void };

const STORE_KEY = "colgrid.pending.v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // a night out; older items are dropped

export function pendingKey(p: Pending): string {
  switch (p.kind) {
    case "code":
      return `code:${p.code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
    case "mission":
      return `mission:${p.questId}`;
    case "arrive":
      return `arrive:${p.sessionId}`;
  }
}

export function readPending(store: KeyValueStore | null, now: number = Date.now()): PendingItem[] {
  if (!store) return [];
  try {
    const list = JSON.parse(store.getItem(STORE_KEY) ?? "[]") as PendingItem[];
    return Array.isArray(list) ? list.filter((p) => p && typeof p.key === "string" && now - p.at < MAX_AGE_MS) : [];
  } catch {
    return [];
  }
}

function write(store: KeyValueStore | null, list: PendingItem[]) {
  try {
    store?.setItem(STORE_KEY, JSON.stringify(list));
  } catch {}
}

// Add (or replace) one waiting action. The same mission tapped twice offline is kept once.
export function enqueue(store: KeyValueStore | null, p: Pending): PendingItem[] {
  const key = pendingKey(p);
  const list = readPending(store).filter((x) => x.key !== key);
  list.push({ ...p, key });
  write(store, list);
  return list;
}

export function removePending(store: KeyValueStore | null, key: string): PendingItem[] {
  const list = readPending(store).filter((x) => x.key !== key);
  write(store, list);
  return list;
}

export function retryLater(store: KeyValueStore | null, key: string, retryAt: number): PendingItem[] {
  const list = readPending(store).map((x) => (x.key === key ? { ...x, retryAt } : x));
  write(store, list);
  return list;
}

// Network failures look different on each phone ("Failed to fetch", "Load failed", "NetworkError").
// Never treat a page redirect as a network failure: that's how a successful check-in moves on.
export function isNetworkError(e: unknown): boolean {
  const err = e as { name?: string; message?: string; digest?: string } | null;
  if (!err) return false;
  if (typeof err.digest === "string" && err.digest.startsWith("NEXT_")) return false;
  if (err.name === "TimeoutError" || err.name === "AbortError") return true;
  const msg = String(err.message ?? "");
  return err.name === "TypeError" || /fetch|network|load failed|offline|timed out/i.test(msg);
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error("timed out");
      e.name = "TimeoutError";
      reject(e);
    }, ms);
    promise.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

// What the sync result means for a waiting item.
export type SyncOutcome = "done" | "retry" | "failed";
export function outcomeFor(status: string | undefined): SyncOutcome {
  if (!status) return "retry";
  if (["ok", "already", "arrived", "already_here"].includes(status)) return "done";
  if (["stay", "too_many", "error"].includes(status)) return "retry";
  return "failed"; // wrong answer, too far, closed session…: tell the player once, then drop it
}
