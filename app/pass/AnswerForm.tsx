"use client";

import { useActionState } from "react";
import { answerMission, type AnswerState } from "./actions";

export default function AnswerForm({ questId }: { questId: string }) {
  const [state, action, pending] = useActionState<AnswerState, FormData>(answerMission, { error: null });
  return (
    <form action={action} className="mission__answer">
      <input type="hidden" name="quest_id" value={questId} />
      <label className="label mono" htmlFor={`answer-${questId}`}>
        YOUR ANSWER
      </label>
      <input
        id={`answer-${questId}`}
        name="answer"
        className="input"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        maxLength={80}
        required
      />
      {state.error && (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={pending} style={{ width: "100%", marginTop: 12 }}>
        {pending ? "Checking…" : "Submit answer"}
      </button>
    </form>
  );
}
