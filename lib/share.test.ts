// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardLevelLine, cardQuery, cardTitle, defaultShareText, formatCardDate, parseCardQuery } from "./share.ts";

const moment = { kind: "mission" as const, mission: 3, of: 4, xp: 25, level: null, place: "9th & 9th", date: "2026-10-17" };

test("the card query round-trips", () => {
  assert.deepEqual(parseCardQuery(new URLSearchParams(cardQuery(moment))), moment);
});

test("nothing unexpected gets onto a card", () => {
  const m = parseCardQuery(new URLSearchParams("k=evil&xp=99999&n=-4&of=abc&lvl=7&place=<script>The mural on 900 S, code TAC-7Q2</script>&d=tomorrow"));
  assert.equal(m.kind, "mission");
  assert.equal(m.xp, 500);
  assert.equal(m.mission, 1);
  assert.equal(m.of, null);
  assert.equal(m.date, null);
  assert.ok(!m.place?.includes("<"), "no markup");
  assert.ok((m.place ?? "").length <= 40, "place is capped");
});

test("cards and share text never carry a mission's title or place, only the number", () => {
  assert.equal(cardTitle(moment), "MISSION 3 COMPLETE");
  assert.equal(cardLevelLine(moment), null);
  const text = defaultShareText(moment);
  assert.match(text, /^Mission 3 of 4 done at Colgrid in 9th & 9th\. \+25 XP\./);
  assert.match(text, /\nhttps:\/\/getcolgrid\.com\/\?utm_source=share&utm_medium=player&utm_campaign=mission$/);
});

test("level ups, all missions and hidden quests read right", () => {
  assert.equal(cardLevelLine({ ...moment, level: 2 }), "LEVEL 02 UNLOCKED");
  assert.equal(cardTitle({ ...moment, kind: "all" }), "ALL MISSIONS COMPLETE");
  assert.equal(cardTitle({ ...moment, kind: "hidden" }), "HIDDEN QUEST FOUND");
  assert.match(defaultShareText({ ...moment, kind: "hidden" }), /Not telling where\./);
  assert.equal(formatCardDate("2026-10-17"), "OCTOBER 17, 2026");
});
