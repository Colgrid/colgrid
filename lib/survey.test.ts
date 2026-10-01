import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeSurvey, type SurveyRow } from "./survey.ts";

const row = (r: Partial<SurveyRow>): SurveyRow => ({
  enjoyed: null, easy: null, quests_fun: null, neighborhood: null, web_pass: null,
  best_quest_id: null, worst_quest_id: null, again: null, recommend: null, change_one: null, comment: null, ...r,
});

test("survey summary averages only answered scales and counts choices", () => {
  const s = summarizeSurvey(
    [row({ enjoyed: 5, again: "yes", best_quest_id: "a", change_one: "More food" }), row({ enjoyed: 4, again: "maybe", best_quest_id: "a" }), row({ comment: " " })],
    [{ id: "a", title: "Mural" }, { id: "b", title: "Tasting" }],
  );
  assert.equal(s.scales[0]!.average, 4.5);
  assert.equal(s.scales[0]!.count, 2);
  assert.equal(s.scales[1]!.average, null);
  assert.deepEqual(s.choices[0]!.counts, [["Mural", 2], ["Tasting", 0]]);
  assert.deepEqual(s.choices[2]!.counts, [["Yes", 1], ["Maybe", 1], ["No", 0]]);
  assert.deepEqual(s.changes, ["More food"]);
  assert.deepEqual(s.comments, []);
});
