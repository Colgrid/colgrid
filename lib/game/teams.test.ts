// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { planTeams } from "./teams.ts";

const p = (id: string, order: string | null = null) => ({ id, order_ref: order });

test("people in one order stay together", () => {
  const teams = planTeams([p("a", "1"), p("b", "1"), p("c", "2"), p("d", "2"), p("e", "2"), p("f")], 5);
  const withA = teams.find((t) => t.includes("a"))!;
  assert.ok(withA.includes("b"));
  const withC = teams.find((t) => t.includes("c"))!;
  assert.ok(withC.includes("d") && withC.includes("e"));
  assert.ok(teams.every((t) => t.length <= 5));
  assert.equal(teams.flat().length, 6);
});

test("solo players are grouped, nobody is left alone", () => {
  const teams = planTeams(["a", "b", "c", "d", "e", "f", "g"].map((id) => p(id)), 5);
  assert.deepEqual(teams.map((t) => t.length).sort(), [2, 5]);
});

test("a big order is split into team-sized pieces", () => {
  const teams = planTeams(Array.from({ length: 7 }, (_, i) => p(`x${i}`, "big")), 4);
  assert.ok(teams.every((t) => t.length <= 4));
  assert.equal(teams.flat().length, 7);
});

test("empty in, empty out", () => {
  assert.deepEqual(planTeams([]), []);
});
