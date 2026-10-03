"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordPhoto } from "./photo-actions";

const MAX_BYTES = 8 * 1024 * 1024;
const MESSAGES: Record<string, string> = {
  not_open: "This challenge isn't open right now.",
  no_team: "Join a team first.",
  too_many: "Your team has already sent the most photos allowed for this ask.",
  no_pass: "Sign in again, then retry.",
};

// Photo proof for an ask that needs one. The photo goes straight from the phone to private storage
// (into the participant's own folder), then the app records it against the ask. Only the person who
// took it and Colgrid staff can open the file.
export default function PhotoProof({ questId, sent }: { questId: string; sent: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a photo.");
    if (file.size > MAX_BYTES) return setError("That photo is too large (8 MB at most).");
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setError(MESSAGES.no_pass);
        return;
      }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/heic" ? "heic" : "jpg";
      const path = `${userId}/${questId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("proof").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError("The photo didn't upload. Check your signal and try again.");
        return;
      }
      const status = await recordPhoto(questId, path);
      if (status !== "ok") {
        setError(MESSAGES[status] ?? "The photo didn't save. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("The photo didn't upload. Check your signal and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mission__answer">
      <p className="mission__stay" role="status">
        {sent > 0 ? `Photo sent${sent > 1 ? ` (${sent})` : ""}. Now check in below.` : "This ask needs a photo first."}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e: { target: { files: FileList | null } }) => onPick(e.target.files?.[0])}
      />
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className={`button ${sent > 0 ? "button--secondary" : "button--primary"}`}
        disabled={busy}
        style={{ width: "100%", marginTop: 12 }}
        onClick={() => input.current?.click()}
      >
        {busy ? "Sending…" : sent > 0 ? "Add another photo" : "Take a photo"}
      </button>
    </div>
  );
}
