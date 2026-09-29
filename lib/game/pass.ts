// Pure logic for the player pass: which session to show and what state each quest is in.
// Rules: docs/mvp-spec.md (screen 3, "Rules to enforce in code") and design/README.md (quest states).
// No database or React here, so it can be unit-tested (pass.test.ts).

export type SessionStatus = "scheduled" | "live" | "closed";

// Shape returned by the database function player_sessions(). Location is null until revealed.
export type PassSession = {
  id: string;
  number: number;
  starts_at: string | null;
  neighborhood: string | null;
  start_location: string | null;
  revealed: boolean;
  status: SessionStatus;
  is_finals: boolean;
};

// Shape returned by player_quests(). Hidden quests arrive with title and host masked (null).
export type PassQuest = {
  id: string;
  stop_number: number | null;
  title: string | null;
  type: string;
  xp: number;
  host_business: string | null;
  is_hidden: boolean;
  is_judged: boolean;
  unlocked: boolean;
  completed: boolean;
  points: number | null;
};

export type QuestState =
  | "done"    // completed by the team (teal check)
  | "active"  // the team's next main quest, one at a time (amber)
  | "locked"  // a later main quest (dashed)
  | "open"    // a hidden quest the game master revealed, not done yet
  | "hidden"  // a hidden quest still hidden (striped); title never shown
  | "judged"  // a challenge the game master scores; nothing to check in
  | "missed"; // after the session closed: a quest the team didn't complete

export type QuestView = PassQuest & { state: QuestState };

export type SessionPick = {
  live: PassSession | null; // happening now
  next: PassSession | null; // next scheduled session
  last: PassSession | null; // most recent closed session
};

export function pickSessions(sessions: readonly PassSession[]): SessionPick {
  const byNumber = [...sessions].sort((a, b) => a.number - b.number);
  const live = byNumber.find((s) => s.status === "live") ?? null;
  const next = byNumber.find((s) => s.status === "scheduled" && (!live || s.number > live.number)) ?? null;
  const closed = byNumber.filter((s) => s.status === "closed");
  const last = closed.length ? closed[closed.length - 1] : null;
  return { live, next, last };
}

function byStop(a: PassQuest, b: PassQuest): number {
  const sa = a.stop_number ?? Number.MAX_SAFE_INTEGER;
  const sb = b.stop_number ?? Number.MAX_SAFE_INTEGER;
  if (sa !== sb) return sa - sb;
  return (a.title ?? "").localeCompare(b.title ?? "");
}

// Main quests in stop order, then judged challenges, then hidden quests. While a session is live, the
// first unfinished main quest is active and later ones are locked. After it closes, unfinished quests
// show as missed, and hidden quests nobody found stay hidden for good.
export function questViews(quests: readonly PassQuest[], sessionStatus: "live" | "closed"): QuestView[] {
  const main = quests.filter((q) => !q.is_hidden && !q.is_judged).sort(byStop);
  const judged = quests.filter((q) => !q.is_hidden && q.is_judged).sort(byStop);
  const hidden = quests.filter((q) => q.is_hidden).sort(byStop);
  let activeGiven = false;

  const mainViews: QuestView[] = main.map((q) => {
    if (q.completed) return { ...q, state: "done" };
    if (sessionStatus === "closed") return { ...q, state: "missed" };
    if (!activeGiven) {
      activeGiven = true;
      return { ...q, state: "active" };
    }
    return { ...q, state: "locked" };
  });

  const judgedViews: QuestView[] = judged.map((q) => {
    if (q.completed) return { ...q, state: "done" };
    return { ...q, state: sessionStatus === "closed" ? "missed" : "judged" };
  });

  // Found or revealed hidden quests first; ones still hidden go last.
  const hiddenViews: QuestView[] = hidden
    .map((q): QuestView => {
      if (q.completed) return { ...q, state: "done" };
      if (!q.unlocked) return { ...q, title: null, host_business: null, state: "hidden" };
      return { ...q, state: sessionStatus === "closed" ? "missed" : "open" };
    })
    .sort((a, b) => Number(a.state === "hidden") - Number(b.state === "hidden"));

  return [...mainViews, ...judgedViews, ...hiddenViews];
}

// The quest the team is on right now, if any.
export function activeQuest(views: readonly QuestView[]): QuestView | null {
  return views.find((v) => v.state === "active") ?? null;
}

export function questProgress(views: readonly QuestView[]): { done: number; total: number } {
  return { done: views.filter((v) => v.state === "done").length, total: views.length };
}
