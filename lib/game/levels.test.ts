// Run with: npm test   (uses Node's built-in test runner; no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { XP, levelFor, formatLevel, formatNumber } from "./levels.ts";

test("a new player starts at level 1", () => {
  assert.equal(levelFor(0).level, 1);
});

test("a first-time player levels up on night one (attend + 3 main quests)", () => {
  const night = XP.attend + 3 * XP.mainQuest; // 125
  assert.equal(levelFor(night).level, 2);
});

test("thresholds from the MVP spec", () => {
  assert.equal(levelFor(99).level, 1);
  assert.equal(levelFor(100).level, 2);
  assert.equal(levelFor(250).level, 3);
  assert.equal(levelFor(449).level, 3);
  assert.equal(levelFor(450).level, 4);
  assert.equal(levelFor(700).level, 5);
});

test("progress toward the next level", () => {
  const p = levelFor(680); // level 4 (450-699), next at 700
  assert.equal(p.level, 4);
  assert.equal(p.nextLevelXp, 700);
  assert.equal(p.xpToNext, 20);
  assert.ok(p.progress > 0.9 && p.progress < 1);
});

test("top level has no next level", () => {
  const p = levelFor(100000);
  assert.equal(p.nextLevelXp, null);
  assert.equal(p.progress, 1);
});

test("negative input never lowers a level", () => {
  assert.equal(levelFor(-50).level, 1);
});

test("formatting", () => {
  assert.equal(formatLevel(4), "LVL 04");
  assert.equal(formatNumber(1), "01");
});
