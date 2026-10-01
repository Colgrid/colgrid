"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { completeMission, type MissionState } from "./actions";

type Props = { questId: string; needsLocation: boolean; needsAnswer: boolean };

// Finish a stop from the phone: "I'm here" reads the phone's location (and the answer, if the stop
// has one) and the database decides. Nothing about location is saved.
export default function MissionCheck({ questId, needsLocation, needsAnswer }: Props) {
  const [state, action, pending] = useActionState<MissionState, FormData>(completeMission, { error: null, stay: null, attempt: 0 });
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const accRef = useRef<HTMLInputElement>(null);
  const located = useRef(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [stayLeft, setStayLeft] = useState<number | null>(null);

  // Location-only stops ask the team to stay a moment; count down, then check again by itself.
  useEffect(() => {
    if (!state.stay) return;
    setStayLeft(state.stay);
    const t = setInterval(() => {
      setStayLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          clearInterval(t);
          formRef.current?.requestSubmit();
          return null;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state]);

  function onSubmit(e: { preventDefault(): void }) {
    if (!needsLocation || located.current) {
      located.current = false;
      return;
    }
    e.preventDefault();
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("This phone can't share its location. Ask for the host code instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = String(pos.coords.latitude);
        if (lngRef.current) lngRef.current.value = String(pos.coords.longitude);
        if (accRef.current) accRef.current.value = String(Math.round(pos.coords.accuracy));
        setLocating(false);
        located.current = true;
        formRef.current?.requestSubmit();
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow it for getcolgrid.com in your browser settings, then try again."
            : "Couldn't get your location. Step outside and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const busy = pending || locating || stayLeft !== null;
  const label = locating ? "Finding you…" : pending ? "Checking…" : needsAnswer ? "Submit answer" : "I'm here";
  const error = geoError ?? state.error;

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="mission__answer">
      <input type="hidden" name="quest_id" value={questId} />
      <input type="hidden" name="lat" ref={latRef} />
      <input type="hidden" name="lng" ref={lngRef} />
      <input type="hidden" name="accuracy" ref={accRef} />
      {needsAnswer && (
        <>
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
        </>
      )}
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
      {stayLeft !== null && (
        <p className="mission__stay" role="status">
          You&apos;re here. Stay a moment: checking you in in <span className="mono">{stayLeft}s</span>.
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
        {label}
      </button>
    </form>
  );
}
