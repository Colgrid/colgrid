// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("keeps paths on this site", () => {
  assert.equal(safeNext("/check-in?code=TAC-7Q2"), "/check-in?code=TAC-7Q2");
  assert.equal(safeNext("/pass"), "/pass");
});

test("refuses other sites and odd input", () => {
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "pass", "", null, undefined, "/a\nb"]) {
    assert.equal(safeNext(bad), null, String(bad));
  }
});
