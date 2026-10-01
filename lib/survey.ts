// Post-gathering survey results (admin only). Pure so it can be tested.

export type SurveyRow = {
  enjoyed: number | null;
  easy: number | null;
  quests_fun: number | null;
  neighborhood: number | null;
  web_pass: number | null;
  best_quest_id: string | null;
  worst_quest_id: string | null;
  again: string | null;
  recommend: string | null;
  change_one: string | null;
  comment: string | null;
};

const SCALES = [
  ["enjoyed", "Enjoyed the gathering"],
  ["easy", "Easy to understand what to do"],
  ["quests_fun", "Quests were fun"],
  ["neighborhood", "Neighborhood and locations added to it"],
  ["web_pass", "Enjoyed the web pass"],
] as const;

export function summarizeSurvey(answers: SurveyRow[], quests: { id: string; title: string }[]) {
  const scales = SCALES.map(([key, question]) => {
    const vals = answers.map((a) => a[key]).filter((v): v is number => typeof v === "number");
    return { key, question, count: vals.length, average: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null };
  });
  const tally = (pick: (a: SurveyRow) => string | null, options: [string, string][]) =>
    options.map(([v, label]) => [label, answers.filter((a) => pick(a) === v).length] as [string, number]);
  const yn: [string, string][] = [
    ["yes", "Yes"],
    ["maybe", "Maybe"],
    ["no", "No"],
  ];
  const q: [string, string][] = quests.map((x) => [x.id, x.title]);
  const choices = [
    { key: "best", question: "Liked most", counts: tally((a) => a.best_quest_id, q) },
    { key: "worst", question: "Liked least", counts: tally((a) => a.worst_quest_id, q) },
    { key: "again", question: "Would attend another", counts: tally((a) => a.again, yn) },
    { key: "recommend", question: "Would recommend to a friend", counts: tally((a) => a.recommend, yn) },
  ];
  const texts = (pick: (a: SurveyRow) => string | null) => answers.map(pick).filter((t): t is string => !!t && !!t.trim());
  return { scales, choices, changes: texts((a) => a.change_one), comments: texts((a) => a.comment) };
}
