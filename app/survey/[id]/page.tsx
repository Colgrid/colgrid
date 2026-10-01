import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitSurvey } from "../actions";

// Private page: keep it out of search results.
export const metadata: Metadata = { title: "How was it?", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Answers = Partial<Record<"enjoyed" | "easy" | "quests_fun" | "neighborhood" | "web_pass", number>> & {
  best_quest_id?: string | null;
  worst_quest_id?: string | null;
  again?: string | null;
  recommend?: string | null;
  change_one?: string | null;
  comment?: string | null;
};
type Survey =
  | { status: "ok"; number: number; neighborhood: string | null; quests: { id: string; title: string }[]; answers: Answers | null }
  | { status: "not_found" | "not_attended" | "not_started" };

const SCALE = ["1", "2", "3", "4", "5"];
const YES_NO = [
  ["yes", "Yes"],
  ["maybe", "Maybe"],
  ["no", "No"],
];

function Scale({ name, q, low, high, value }: { name: string; q: string; low: string; high: string; value?: number | null }) {
  return (
    <fieldset className="survey__q">
      <legend>{q}</legend>
      <div className="survey__choices survey__choices--scale">
        {SCALE.map((v) => (
          <label key={v} className="survey__choice">
            <input type="radio" name={name} value={v} defaultChecked={String(value ?? "") === v} />
            <span>{v}</span>
          </label>
        ))}
      </div>
      <div className="survey__ends" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

function Pick({ name, q, options, value, stack }: { name: string; q: string; options: string[][]; value?: string | null; stack?: boolean }) {
  return (
    <fieldset className="survey__q">
      <legend>{q}</legend>
      <div className={`survey__choices${stack ? " survey__choices--stack" : ""}`}>
        {options.map(([v, label]) => (
          <label key={v} className="survey__choice survey__choice--wide">
            <input type="radio" name={name} value={v} defaultChecked={value === v} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function SurveyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/survey/${id}`)}`);

  const { data } = /^[0-9a-f-]{36}$/i.test(id) ? await supabase.rpc("my_survey", { p_session_id: id }) : { data: null };
  const survey = (data as Survey | null) ?? { status: "not_found" as const };

  if (msg === "thanks") {
    return (
      <main className="page survey">
        <h1>Thanks.</h1>
        <p className="lede">That shapes the next one.</p>
        <Link href="/pass" className="button button--primary" style={{ marginTop: 28, width: "100%" }}>
          Back to my pass
        </Link>
        <p className="survey__fine">
          <Link href={`/survey/${id}`}>Change my answers</Link>
        </p>
      </main>
    );
  }

  if (survey.status !== "ok") {
    return (
      <main className="page survey">
        <h1>How was it?</h1>
        <p className="lede">
          {survey.status === "not_started" ? "The survey opens once the gathering starts." : "This survey is for players who checked in."}
        </p>
        <Link href="/pass" className="button button--primary" style={{ marginTop: 28, width: "100%" }}>
          Back to my pass
        </Link>
      </main>
    );
  }

  const a = survey.answers ?? {};
  const quests = survey.quests.map((q) => [q.id, q.title]);
  return (
    <main className="page survey">
      <h1>How was it?</h1>
      <p className="lede">10 quick questions. Skip any you like.</p>
      {msg === "empty" && <p className="form__error">Pick at least one answer.</p>}
      {msg === "error" && <p className="form__error">Didn&apos;t save. Try again.</p>}

      <form action={submitSurvey} className="survey__form">
        <input type="hidden" name="session_id" value={id} />
        <Scale name="enjoyed" q="Did you enjoy the gathering?" low="Not really" high="Loved it" value={a.enjoyed} />
        <Scale name="easy" q="Was it easy to understand what you were supposed to do?" low="Confusing" high="Very easy" value={a.easy} />
        <Scale name="quests_fun" q="Were the quests fun?" low="Not really" high="Very fun" value={a.quests_fun} />
        {quests.length > 0 && <Pick name="best_quest_id" q="Which quest did you like most?" options={quests} value={a.best_quest_id} stack />}
        {quests.length > 0 && <Pick name="worst_quest_id" q="Which quest did you like least?" options={quests} value={a.worst_quest_id} stack />}
        <Scale name="neighborhood" q="Did the neighborhood and locations add to the experience?" low="Not really" high="A lot" value={a.neighborhood} />
        <Scale name="web_pass" q="Did you enjoy using the Colgrid web pass?" low="Not really" high="Loved it" value={a.web_pass} />
        <Pick name="again" q="Would you attend another Colgrid gathering?" options={YES_NO} value={a.again} />
        <Pick name="recommend" q="Would you recommend Colgrid to a friend?" options={YES_NO} value={a.recommend} />
        <fieldset className="survey__q">
          <legend>What is one thing you would change?</legend>
          <textarea className="input" name="change_one" rows={3} maxLength={500} defaultValue={a.change_one ?? ""} />
        </fieldset>
        <fieldset className="survey__q">
          <legend>Anything else? (optional)</legend>
          <textarea className="input" name="comment" rows={3} maxLength={1000} defaultValue={a.comment ?? ""} />
        </fieldset>
        <button type="submit" className="button button--primary" style={{ width: "100%" }}>
          Send
        </button>
      </form>
    </main>
  );
}
