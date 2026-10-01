"use client";

import { useEffect, useState } from "react";

const KEY = "colgrid.intro.v1";

// First time on the pass: three steps, once. Remembered on this phone only.
export default function FirstRun() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };
  return (
    <div className="complete" role="dialog" aria-modal="true" aria-label="How Colgrid works">
      <div className="complete__card first-run">
        <p className="complete__kicker mono">HOW IT WORKS</p>
        <ol className="first-run__steps">
          <li>
            <span className="mono">1</span>
            <span>
              <strong>Find</strong> the spot your mission points to.
            </span>
          </li>
          <li>
            <span className="mono">2</span>
            <span>
              <strong>Complete</strong> it, then tap the button to check in.
            </span>
          </li>
          <li>
            <span className="mono">3</span>
            <span>
              <strong>Level up.</strong> Your XP and badges stay with you, every time you play.
            </span>
          </li>
        </ol>
        <button type="button" className="button button--primary" onClick={done}>
          Got it
        </button>
      </div>
    </div>
  );
}
