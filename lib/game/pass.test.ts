// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSessions, questViews, questProgress } from "./pass.ts";
import type { PassQuest, PassSession } from "./pass.ts";

function session(number: number, status: PassSession["status"]): PassSession {
  return {
    id: `s${number}`, number, status, starts_at: null, neighborhood: null,
    start_location: null, revealed: false, is_finals: false,
  };
}

function quest(id: string, stop: number | null, opts: Partial<PassQuest> = {}): PassQuest {
  return {
    id, stop_number: stop, title: `Quest ${id}`, type: "tasting", xp: 25, host_business: "Host",
    is_hidden: false, is_judged: false, unlocked: true, completed: false, points: null, ...opts,
  };
}

test("picks the live session, the next scheduled one and the last closed one", () => {
  const pick = pickSessions([session(3, "scheduled"), session(1, "closed"), session(2, "live"), session(4, "scheduled")]);
  assert.equal(pick.live?.number, 2);
  assert.equal(pick.next?.number, 3);
  assert.equal(pick.last?.number, 1);
});

test("between sessions there is no live session", () => {
  const pick = pickSessions([session(1, "closed"), session(2, "closed"), session(3, "scheduled")]);
  assert.equal(pick.live, null);
  assert.equal(pick.next?.number, 3);
  assert.equal(pick.last?.number, 2);
});

test("before the season, only the next session", () => {
  const pick = pickSessions([session(1, "scheduled"), session(2, "scheduled")]);
  assert.equal(pick.live, null);
  assert.equal(pick.last, null);
  assert.equal(pick.next?.number, 1);
});

test("live session: done, then exactly one active, then locked, in stop order", () => {
  const views = questViews(
    [quest("c", 3), quest("a", 1, { completed: true }), quest("b", 2), quest("d", 4)],
    "live",
  );
  assert.deepEqual(views.map((v) => [v.id, v.state]), [
    ["a", "done"], ["b", "active"], ["c", "locked"], ["d", "locked"],
  ]);
});

test("hidden quests stay masked until found or revealed, and come last", () => {
  const views = questViews(
    [
      quest("h1", null, { is_hidden: true, unlocked: false, title: null, host_business: null }),
      quest("h2", null, { is_hidden: true, unlocked: true }),
      quest("h3", null, { is_hidden: true, unlocked: true, completed: true }),
      quest("m", 1),
    ],
    "live",
  );
  assert.deepEqual(views.map((v) => [v.id, v.state]), [["m", "active"], ["h2", "open"], ["h3", "done"], ["h1", "hidden"]]);
  const masked = views.find((v) => v.id === "h1")!;
  assert.equal(masked.title, null);
  assert.equal(masked.host_business, null);
});

test("a masked hidden quest never shows a title, even if one slips through", () => {
  const [v] = questViews([quest("h", null, { is_hidden: true, unlocked: false, title: "Secret" })], "live");
  assert.equal(v.state, "hidden");
  assert.equal(v.title, null);
});

test("after the session closes, unfinished quests are missed and unfound hidden ones stay hidden", () => {
  const views = questViews(
    [quest("a", 1, { completed: true }), quest("b", 2), quest("h", null, { is_hidden: true, unlocked: false, title: null })],
    "closed",
  );
  assert.deepEqual(views.map((v) => v.state), ["done", "missed", "hidden"]);
  assert.deepEqual(questProgress(views), { done: 1, total: 3 });
});

test("all quests done: nothing active", () => {
  const views = questViews([quest("a", 1, { completed: true }), quest("b", 2, { completed: true })], "live");
  assert.ok(views.every((v) => v.state === "done"));
});
