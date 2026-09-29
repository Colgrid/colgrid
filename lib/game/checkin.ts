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
      return { kind: "error", title: "That code didn't work.", message: "Check it with your host and try again." };
    case "not_live":
      return {
        kind: "error",
        title: "That mission is over.",
        message: r.session_number ? `That code is from Session ${pad(r.session_number)}, which has closed.` : "That session has closed.",
      };
    case "judged":
      return {
        kind: "error",
        title: "No code needed.",
        message: `${r.quest_title ?? "This challenge"} is scored by the game master. Just bring your best.`,
      };
    case "no_team":
      return { kind: "error", title: "You're not on a team yet.", message: "Find a game master. They'll put you on one." };
    case "no_pass":
      return { kind: "error", title: "We can't find your pass.", message: "Sign in with the email on your ticket." };
    case "too_many":
      return {
        kind: "error",
        title: "Too many wrong codes.",
        message: "Check-in is paused for a few minutes. Get the code from your host, then try again.",
      };
    case "error":
      return { kind: "error", title: "Something went wrong.", message: "Your code wasn't counted. Try again in a moment." };
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
        note: already ? "Your team already got credit for this one." : null,
      };
    }
  }
}
