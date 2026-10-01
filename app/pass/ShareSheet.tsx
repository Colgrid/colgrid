"use client";

import { useEffect, useRef, useState } from "react";
import { cardQuery, defaultShareText, type ShareMoment } from "@/lib/share";
import { logShare } from "./share-actions";

// Phase 1 sharing: the branded card + editable text, through the phone's own share sheet.
// No accounts, nothing posted for the player: they pick the app and tap post themselves.
// Falls back to Save image + Copy text where a browser can't share files.
export default function ShareSheet({ moment, onClose }: { moment: ShareMoment; onClose: () => void }) {
  const cardUrl = `/share/card?${cardQuery(moment)}`;
  const [text, setText] = useState(() => defaultShareText(moment));
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const logged = useRef(false);

  // Fetch the card as soon as the sheet opens, so tapping Share opens the share sheet right away
  // (iPhones only allow it straight from the tap).
  useEffect(() => {
    if (!logged.current) {
      logged.current = true;
      void logShare(moment.kind, "opened");
    }
    let url: string | null = null;
    fetch(cardUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const f = new File([blob], "colgrid.png", { type: "image/png" });
        url = URL.createObjectURL(blob);
        setFile(f);
        setBlobUrl(url);
        try {
          setCanShareFiles(Boolean(navigator.canShare?.({ files: [f] })));
        } catch {
          setCanShareFiles(false);
        }
      })
      .catch(() => setNote("Couldn't make the card. Check your connection and try again."));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [cardUrl, moment.kind]);

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text });
      void logShare(moment.kind, "shared");
      onClose();
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") void logShare(moment.kind, "cancelled");
      else setNote("Sharing didn't work here. Save the image instead.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      void logShare(moment.kind, "copied");
      setNote("Text copied.");
    } catch {
      setNote("Couldn't copy. Select the text and copy it.");
    }
  }

  return (
    <div className="share-sheet">
      <div className="share-sheet__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {blobUrl ? <img src={blobUrl} alt="Your Colgrid card" /> : <span className="share-sheet__loading mono">MAKING YOUR CARD…</span>}
      </div>
      <label className="share-sheet__label mono" htmlFor="share-text">
        YOUR CAPTION
      </label>
      <textarea id="share-text" className="share-sheet__text" rows={3} maxLength={300} value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)} />
      {note && (
        <p className="share-sheet__note" role="status">
          {note}
        </p>
      )}
      {canShareFiles ? (
        <button type="button" className="button button--primary" onClick={share} disabled={!file}>
          Share
        </button>
      ) : null}
      <div className="share-sheet__row">
        {blobUrl && (
          <a href={blobUrl} download="colgrid.png" className="button button--dark" onClick={() => void logShare(moment.kind, "saved")}>
            Save image
          </a>
        )}
        <button type="button" className="button button--dark" onClick={copy}>
          Copy caption
        </button>
      </div>
      <button type="button" className="link-button share-sheet__done" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
