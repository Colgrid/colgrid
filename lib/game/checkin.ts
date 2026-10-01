// Turns the database's check_in() result into what the Check in screen says.
// Pure (no React, no database) so it can be unit-tested (checkin.test.ts).
import type { LevelProgress } from "./levels";

export type CheckInStatus =
  | "ok"
  | "already"
  | "bad_code"
  | "not_live"
  | "judged"
  | "no_team"
  | "no_pass"
  | "too_many"
  | "arrived"      // start code: checked in for the night
  | "already_here" // start code scanned again
  | "too_early"    // start code more than 30 minutes before the start
  | "wrong_answer" // puzzle stop
  | "error";

export type XpReason = "attend" | "quest" | "hidden_quest" | "all_main_quests" | "adjustment";

export type CheckInResult = {
  status: CheckInStatus;
  quest_title?: string;
  quest_xp?: number;
  is_hidden?: boolean;
  stop_number?: number | null;
  team_name?: string;
  team_mode?: "casual" | "tournament";
  points?: number | null;
  xp_before?: number;
  xp_after?: number;
  breakdown?: { reason: XpReason; amount: number }[];
  new_badges?: { key: string; name: string }[];
  session_number?: number;
  starts_at?: string | null;
};

export type CheckInView =
  | { kind: "error"; title: string; message: string }
  | {
      kind: "success";
      headline: string;
      questTitle: string;
      xpGained: number;
      lines: { label: string; amount: number }[];
      points: number | null; // tournament teams only
      before: LevelProgress;
      after: LevelProgress;
      leveledUp: boolean;
      badges: string[];
      note: string | null;
    };

const REASON_LABEL: Record<XpReason, string> = {
  attend: "You showed up",
  quest: "Quest complete",
  hidden_quest: "Hidden quest found",
  all_main_quests: "Every main quest done",
  adjustment: "Bonus from the game master",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// levelFor is passed in (from ./levels) so this file has no runtime imports.
export function describeCheckIn(r: CheckInResult, levelFor: (xp: number) => LevelProgress): CheckInView {
  switch (r.status) {
    case "bad_code":
      return { kind: "error", title: "That code didn't work.", message: "Check it and try again." };
    case "not_live":
      return {
        kind: "error",
        title: "That mission is over.",
        message: "That session has ended.",
      };
    case "judged":
      return {
        kind: "error",
        title: "No code needed.",
        message: "This one is scored by the crew.",
      };
    case "no_team":
      return { kind: "error", title: "No team yet.", message: "Check in at the start first." };
    case "no_pass":
      return { kind: "error", title: "We can't find your pass.", message: "Sign in and try again." };
    case "too_many":
      return {
        kind: "error",
        title: "Too many wrong codes.",
        message: "Wait a few minutes, then try again.",
      };
    case "error":
      return { kind: "error", title: "Something went wrong.", message: "Try again." };
    case "too_early":
      return { kind: "error", title: "Not yet.", message: "Check-in opens 30 minutes before the start." };
    case "wrong_answer":
      return { kind: "error", title: "Not quite.", message: "Look again." };
    case "arrived":
    case "already_here": {
      const beforeXp = r.xp_before ?? 0;
      const afterXp = r.xp_after ?? beforeXp;
      const before = levelFor(beforeXp);
      const after = levelFor(afterXp);
      return {
        kind: "success",
        headline: r.status === "arrived" ? "You're in." : "You're already checked in.",
        questTitle: r.team_name ? `Your team: ${r.team_name}` : "",
        xpGained: Math.max(0, afterXp - beforeXp),
        lines: (r.breakdown ?? []).map((b) => ({ label: REASON_LABEL[b.reason] ?? "XP", amount: b.amount })),
        points: null,
        before,
        after,
        leveledUp: after.level > before.level,
        badges: [],
        note: null,
      };
    }
    case "ok":
    case "already": {
      const beforeXp = r.xp_before ?? 0;
      const afterXp = r.xp_after ?? beforeXp;
      const before = levelFor(beforeXp);
      const after = levelFor(afterXp);
      const lines = (r.breakdown ?? []).map((b) => ({ label: REASON_LABEL[b.reason] ?? "XP", amount: b.amount }));
      const already = r.status === "already";
      return {
        kind: "success",
        headline: already ? "Already checked in." : r.is_hidden ? "Hidden quest found." : "Quest complete.",
        questTitle: r.quest_title ?? "",
        xpGained: Math.max(0, afterXp - beforeXp),
        lines,
        points: r.team_mode === "tournament" && !already && typeof r.points === "number" ? r.points : null,
        before,
        after,
        leveledUp: after.level > before.level,
        badges: (r.new_badges ?? []).map((b) => b.name),
        note: already ? "Your team already has this one." : null,
      };
    }
  }
}
