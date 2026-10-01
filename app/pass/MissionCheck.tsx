"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { queueForLater } from "@/app/components/PendingSync";
import { enqueue, isNetworkError, timeout } from "@/lib/offline-queue";
import { arriveHere, completeMission, type MissionState } from "./actions";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// questId for a mission; sessionId for checking in at the start (location only).
type Props = { questId?: string; sessionId?: string; needsLocation: boolean; needsAnswer: boolean };

// Finish a stop from the phone: "I'm here" reads the phone's location (and the answer, if the stop
// has one) and the database decides. Nothing about location is saved.
export default function MissionCheck({ questId, sessionId, needsLocation, needsAnswer }: Props) {
  // No signal (or it drops mid-send): keep the check-in on the phone and send it when signal is back.
  const send = async (prev: MissionState, form: FormData): Promise<MissionState> => {
    const save = () =>
      queueForLater(() => {
        const store = window.localStorage;
        const at = Date.now();
        const lat = num(form.get("lat"));
        const lng = num(form.get("lng"));
        const accuracy = num(form.get("accuracy"));
        if (sessionId) enqueue(store, { kind: "arrive", sessionId, lat, lng, accuracy, at });
        else if (questId) enqueue(store, { kind: "mission", questId, answer: String(form.get("answer") ?? "").trim() || null, lat, lng, accuracy, at });
      });
    if (navigator.onLine === false) {
      save();
      return { ...prev, error: null, stay: null, queued: true };
    }
    try {
      const next = await timeout((sessionId ? arriveHere : completeMission)(prev, form), 20000);
      return next ?? prev;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      save();
      return { ...prev, error: null, stay: null, queued: true };
    }
  };
  const [state, action, pending] = useActionState<MissionState, FormData>(send, { error: null, stay: null, attempt: 0 });
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
      setGeoError("Location isn't available. Use a host code.");
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
            ? "Location is off. Turn it on in settings."
            : "Can't find you. Step outside and try again.",
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
      <input type="hidden" name="quest_id" value={questId ?? ""} />
      <input type="hidden" name="session_id" value={sessionId ?? ""} />
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
      {state.queued && !error && (
        <p className="mission__stay" role="status">
          Saved. It&apos;ll send when you&apos;re back online.
        </p>
      )}
      {stayLeft !== null && (
        <p className="mission__stay" role="status">
          Stay here… <span className="mono">{stayLeft}s</span>
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
        {label}
      </button>
    </form>
  );
}
