"use client";

import { useState } from "react";
import { logPlay } from "./play-actions";

// Sends the team's invite link: the phone's share sheet (text it to friends), else copy.
export default function InviteButton({ url, team, sessionId }: { url: string; team: string; sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Join ${team} on Colgrid:`;

  const send = async () => {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Colgrid", text, url });
        void logPlay("invite_sent", sessionId);
      } catch {
        // Closed the share sheet: nothing sent.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      void logPlay("invite_sent", sessionId);
    } catch {
      window.prompt("Copy your team link:", url);
    }
  };

  return (
    <button type="button" className="button button--secondary" onClick={send} style={{ width: "100%" }}>
      {copied ? "Link copied" : "Invite friends"}
    </button>
  );
}
