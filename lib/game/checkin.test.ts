// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeCheckIn as describe } from "./checkin.ts";
import { levelFor } from "./levels.ts";
import type { CheckInResult } from "./checkin.ts";

const describeCheckIn = (r: CheckInResult) => describe(r, levelFor);

test("a first-night check-in that crosses 100 XP is a level up", () => {
  const v = describeCheckIn({
    status: "ok", quest_title: "The map room", xp_before: 75, xp_after: 145, team_mode: "casual", points: null,
    breakdown: [{ reason: "quest", amount: 25 }, { reason: "all_main_quests", amount: 20 }, { reason: "attend", amount: 25 }],
  });
  assert.equal(v.kind, "success");
  if (v.kind !== "success") return;
  assert.equal(v.xpGained, 70);
  assert.equal(v.leveledUp, true);
  assert.equal(v.before.level, 1);
  assert.equal(v.after.level, 2);
  assert.equal(v.points, null);
  assert.deepEqual(v.lines.map((l) => l.label), ["Ask complete", "Every main quest done", "You showed up"]);
});

test("tournament points show for tournament teams only", () => {
  const t = describeCheckIn({ status: "ok", xp_before: 0, xp_after: 25, team_mode: "tournament", points: 40 });
  const c = describeCheckIn({ status: "ok", xp_before: 0, xp_after: 25, team_mode: "casual", points: 40 });
  assert.equal(t.kind === "success" && t.points, 40);
  assert.equal(c.kind === "success" && c.points, null);
});

test("hidden quests get their own headline", () => {
  const v = describeCheckIn({ status: "ok", is_hidden: true, xp_before: 0, xp_after: 30 });
  assert.equal(v.kind === "success" && v.headline, "Hidden ask found.");
});

test("a repeat code gives no points and says so", () => {
  const v = describeCheckIn({ status: "already", xp_before: 200, xp_after: 200, team_mode: "tournament", points: 40 });
  assert.equal(v.kind, "success");
  if (v.kind !== "success") return;
  assert.equal(v.xpGained, 0);
  assert.equal(v.points, null);
  assert.equal(v.leveledUp, false);
  assert.ok(v.note);
});

test("every failure has plain words", () => {
  for (const status of ["bad_code", "not_live", "judged", "no_team", "no_pass", "too_many", "error"] as const) {
    const v = describeCheckIn({ status });
    assert.equal(v.kind, "error");
    if (v.kind === "error") assert.ok(v.title.length > 0 && v.message.length > 0);
  }
});

test("checking in at the start and points to the first mission", () => {
  const v = describeCheckIn({ status: "arrived", team_name: "The Night Owls", xp_before: 0, xp_after: 50, breakdown: [{ reason: "attend", amount: 50 }] });
  assert.equal(v.kind, "success");
  if (v.kind !== "success") return;
  assert.equal(v.headline, "You're in.");
  assert.equal(v.questTitle, "Your team: The Night Owls");
  assert.equal(v.xpGained, 50);
  assert.equal(describeCheckIn({ status: "too_early" }).kind, "error");
  assert.equal(describeCheckIn({ status: "wrong_answer" }).kind, "error");
});
