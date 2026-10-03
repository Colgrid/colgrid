"use client";

import { useEffect, useState } from "react";

// v2: the Find, Play, Progress wording. A new key so it shows once on phones that saw the earlier draft.
const KEY = "colgrid.intro.v2";

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
        <ol className="first-run__steps">
          <li>
            <span className="mono">1</span>
            <span>
              <strong>Find</strong>
              <br />
              Go to the location.
            </span>
          </li>
          <li>
            <span className="mono">2</span>
            <span>
              <strong>Do</strong>
              <br />
              Complete the ask.
            </span>
          </li>
          <li>
            <span className="mono">3</span>
            <span>
              <strong>Earn</strong>
              <br />
              Rewards are sent once your work is verified.
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
