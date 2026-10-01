// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { upcomingGathering } from "./next-gathering.ts";

const g = { when: "Saturday, November 14 · 4–7 PM", neighborhood: "Sugar House", ticketUrl: "https://example.com/t", startsAt: "2026-11-14T16:00:00-07:00", ticketsOpen: true };

test("the next gathering shows only while it's ahead, and never as the one just played", () => {
  const before = Date.parse("2026-10-18T00:00:00Z");
  const after = Date.parse("2026-11-15T00:00:00Z");
  assert.ok(upcomingGathering(g, null, before));
  assert.equal(upcomingGathering(g, null, after), null);
  assert.equal(upcomingGathering(g, "2026-11-14T16:00:00-07:00", before), null);
  assert.equal(upcomingGathering({ ...g, ticketsOpen: false }, null, before), null);
});
