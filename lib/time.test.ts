// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isoToLocal, localToIso } from "./time.ts";

test("Salt Lake wall-clock time in October (MDT, UTC-6)", () => {
  assert.equal(localToIso("2026-10-17T18:30"), "2026-10-18T00:30:00.000Z");
  assert.equal(isoToLocal("2026-10-18T00:30:00.000Z"), "2026-10-17T18:30");
});

test("after daylight saving ends (MST, UTC-7)", () => {
  assert.equal(localToIso("2026-11-14T18:00"), "2026-11-15T01:00:00.000Z");
  assert.equal(isoToLocal("2026-11-15T01:00:00.000Z"), "2026-11-14T18:00");
});

test("round trips and rejects junk", () => {
  for (const local of ["2026-03-08T12:00", "2026-11-01T00:30", "2027-01-15T19:45"]) {
    assert.equal(isoToLocal(localToIso(local)), local);
  }
  assert.equal(localToIso(""), null);
  assert.equal(localToIso("next friday"), null);
  assert.equal(isoToLocal(null), "");
});
