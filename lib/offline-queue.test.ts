// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueue, isNetworkError, outcomeFor, readPending, removePending, retryLater, timeout } from "./offline-queue.ts";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("a check-in made without signal waits, once, until it's sent", () => {
  const s = memory();
  enqueue(s, { kind: "code", code: "tac-7q2", at: Date.now() });
  enqueue(s, { kind: "code", code: "TAC7Q2", at: Date.now() }); // same code typed again
  enqueue(s, { kind: "mission", questId: "q1", answer: "1912", lat: 40.75, lng: -111.86, accuracy: 12, at: Date.now() });
  enqueue(s, { kind: "mission", questId: "q1", answer: "1912", lat: 40.75, lng: -111.86, accuracy: 8, at: Date.now() }); // tapped twice
  const list = readPending(s);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((p) => p.key).sort(), ["code:TAC7Q2", "mission:q1"]);
  assert.equal(removePending(s, "code:TAC7Q2").length, 1);
  assert.equal(retryLater(s, "mission:q1", 123)[0].retryAt, 123);
});

test("old items expire and a broken store never breaks the pass", () => {
  const s = memory();
  enqueue(s, { kind: "arrive", sessionId: "s1", lat: null, lng: null, accuracy: null, at: Date.now() - 13 * 3600_000 });
  assert.equal(readPending(s).length, 0);
  s.setItem("colgrid.pending.v1", "not json");
  assert.deepEqual(readPending(s), []);
  assert.deepEqual(readPending(null), []);
});

test("network failures are recognized; redirects are not", () => {
  assert.equal(isNetworkError(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkError(Object.assign(new Error("Load failed"), { name: "TypeError" })), true);
  assert.equal(isNetworkError(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/pass;307;" })), false);
  assert.equal(isNetworkError(new Error("Something else")), false);
});

test("sync results: counted is done, waiting retries, a real no is reported once", () => {
  assert.equal(outcomeFor("ok"), "done");
  assert.equal(outcomeFor("already"), "done"); // the duplicate case: nothing extra is awarded
  assert.equal(outcomeFor("arrived"), "done");
  assert.equal(outcomeFor("stay"), "retry");
  assert.equal(outcomeFor(undefined), "retry");
  assert.equal(outcomeFor("wrong_answer"), "failed");
  assert.equal(outcomeFor("too_far"), "failed");
});

test("a request that hangs counts as no signal", async () => {
  await assert.rejects(timeout(new Promise(() => {}), 10), { name: "TimeoutError" });
  assert.equal(await timeout(Promise.resolve(7), 50), 7);
});
