"use client";

import { useEffect, useState } from "react";
import { logPlay } from "@/app/pass/play-actions";

// "Add Colgrid to your home screen": shown on the pass until the player installs it or closes the card.
// Colgrid is a web app (no app store), so this is how it gets an icon and opens full-screen.
// Android/Chrome gets a one-tap install button; iPhone gets the two-step Share instructions.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISSED = "colgrid-install-dismissed";

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

export default function InstallCard({ sessionId = null }: { sessionId?: string | null }) {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === "1";
    } catch {
      // Private browsing: just show it.
    }
    if (isStandalone()) {
      void logPlay("installed_open", sessionId); // opened from the home screen (counted once per player)
      return;
    }
    if (dismissed) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setShow(true);
    void logPlay("install_shown", sessionId);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [sessionId]);

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Nothing to remember in private browsing.
    }
  };

  if (!show) return null;

  return (
    <section className="install-card" aria-label="Add Colgrid to your home screen">
      <div className="install-card__text">
        <strong>Put your pass on your home screen.</strong>
        {promptEvent ? (
          <span>One tap, and Colgrid opens like an app. No app store.</span>
        ) : ios ? (
          <span>
            In Safari, tap <b>Share</b> <span aria-hidden="true">(□↑)</span>, then <b>Add to Home Screen</b>. Open it and sign in with the
            code we email you.
          </span>
        ) : (
          <span>
            In your browser menu, choose <b>Add to Home Screen</b> or <b>Install app</b>. It opens like an app.
          </span>
        )}
      </div>
      <div className="install-card__actions">
        {promptEvent && (
          <button
            type="button"
            className="button button--primary"
            onClick={async () => {
              await promptEvent.prompt();
              const choice = await promptEvent.userChoice.catch(() => ({ outcome: "dismissed" }));
              if (choice.outcome === "accepted") {
                void logPlay("install_accepted", sessionId);
                close();
              }
              setPromptEvent(null);
            }}
          >
            Add to home screen
          </button>
        )}
        <button type="button" className="link-button install-card__close" onClick={close}>
          Not now
        </button>
      </div>
    </section>
  );
}
