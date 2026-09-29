"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { describeCheckIn } from "@/lib/game/checkin";
import { formatLevel, levelFor } from "@/lib/game/levels";
import { submitCheckIn, type CheckInState } from "./actions";
import QrScanner from "./QrScanner";

// "tac7q2" -> "TAC-7Q2" as the player types.
function formatCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}

export default function CheckInForm({ initialCode }: { initialCode: string }) {
  const [state, formAction, pending] = useActionState<CheckInState, FormData>(submitCheckIn, {
    result: null,
    code: formatCode(initialCode),
  });
  const [code, setCode] = useState(formatCode(initialCode));
  const [dismissed, setDismissed] = useState<CheckInState | null>(null);
  const [submitSoon, setSubmitSoon] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // A scanned QR fills the code and checks in straight away.
  const onScan = useCallback((scanned: string) => {
    setCode(formatCode(scanned));
    setSubmitSoon(true);
  }, []);
  useEffect(() => {
    if (submitSoon) {
      setSubmitSoon(false);
      formRef.current?.requestSubmit();
    }
  }, [submitSoon]);

  const view = state.result && dismissed !== state ? describeCheckIn(state.result, levelFor) : null;

  if (view?.kind === "success") {
    const { after } = view;
    return (
      <div className="checkin-success" role="status">
        {view.xpGained > 0 && <p className="checkin-success__xp mono">+{view.xpGained} XP</p>}
        <h2 className="checkin-success__headline">{view.headline}</h2>
        <p className="checkin-success__quest">{view.questTitle}</p>
        {view.note && <p className="fine-print">{view.note}</p>}

        {view.lines.length > 0 && (
          <ul className="xp-lines">
            {view.lines.map((l, i) => (
              <li key={i}>
                <span>{l.label}</span>
                <span className="mono">+{l.amount}</span>
              </li>
            ))}
            {view.points !== null && (
              <li className="xp-lines__pts">
                <span>Tournament points</span>
                <span className="mono">+{view.points}</span>
              </li>
            )}
          </ul>
        )}

        <div className={`level-card${view.leveledUp ? " level-card--up" : ""}`}>
          <p className="level-card__top mono">
            {view.leveledUp ? (
              <>
                <span className="level-card__tag">LEVEL UP</span> {formatLevel(view.before.level)} → <strong>{formatLevel(after.level)}</strong>
              </>
            ) : (
              <strong>{formatLevel(after.level)}</strong>
            )}
          </p>
          <div className="xp-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(after.progress * 100)}%` }} />
          </div>
          <p className="level-card__nums mono">
            {after.totalXp.toLocaleString("en-US")}
            {after.nextLevelXp !== null ? ` / ${after.nextLevelXp.toLocaleString("en-US")} XP` : " XP · TOP LEVEL"}
          </p>
        </div>

        {view.badges.length > 0 && (
          <p className="checkin-success__badge">
            New badge: <strong>{view.badges.join(", ")}</strong>
          </p>
        )}

        <Link href="/pass" className="button button--primary" style={{ marginTop: 28 }}>
          Back to pass
        </Link>
        <button
          type="button"
          className="button button--secondary"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => {
            setDismissed(state);
            setCode("");
          }}
        >
          Check in another code
        </button>
      </div>
    );
  }

  const error = view?.kind === "error" ? view : null;

  return (
    <>
      <form ref={formRef} action={formAction} className="form">
        <label className="label mono" htmlFor="code">
          QUEST CODE
        </label>
        <input
          id="code"
          name="code"
          className="input input--code mono"
          value={code}
          onChange={(e: { target: { value: string } }) => setCode(formatCode(e.target.value))}
          placeholder="ABC-123"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          aria-describedby={error ? "checkin-error" : undefined}
        />
        {error && (
          <div id="checkin-error" className="form__error" role="alert">
            <strong>{error.title}</strong> {error.message}
          </div>
        )}
        <button className="button button--primary" type="submit" disabled={pending || code.replace("-", "").length !== 6} style={{ width: "100%", marginTop: 16 }}>
          {pending ? "Checking…" : "Check in"}
        </button>
      </form>

      <div className="divider mono" aria-hidden="true">
        OR
      </div>

      <QrScanner onCode={onScan} />
    </>
  );
}
