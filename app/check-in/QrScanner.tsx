"use client";

import { useEffect, useRef, useState } from "react";

// Scans a host's QR code with the phone camera where the browser can (Chrome on Android).
// Everywhere else (iPhone Safari), the phone's own Camera app reads the QR and opens
// getcolgrid.com/check-in?code=... with the code filled in, so we explain that instead.

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;

// Accepts either a check-in link (…/check-in?code=TAC-7Q2) or a bare code.
export function codeFromQr(raw: string): string | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const code = url.searchParams.get("code");
    return code ? code.slice(0, 16) : null;
  } catch {
    return /^[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}$/.test(text) ? text : null;
  }
}

export default function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!open || !supported) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const found = await detector.detect(videoRef.current);
            const code = found.map((f) => codeFromQr(f.rawValue)).find((c): c is string => !!c);
            if (code) {
              setOpen(false);
              onCode(code);
            }
          } catch {
            // A frame that can't be read; try the next one.
          }
        }, 300);
      } catch {
        setProblem("We couldn't open the camera. Allow camera access, or type the code instead.");
        setOpen(false);
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, supported, onCode]);

  if (open && supported) {
    return (
      <div className="scanner">
        <video ref={videoRef} className="scanner__video" playsInline muted />
        <span className="scanner__frame" aria-hidden="true" />
        <button type="button" className="button button--secondary" onClick={() => setOpen(false)} style={{ width: "100%", marginTop: 12 }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="scan-button"
        onClick={() => {
          setProblem(null);
          if (supported) setOpen(true);
          else setProblem("Open your phone's Camera app and point it at the QR. It opens this page with the code filled in.");
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" strokeLinecap="round" />
          <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
        </svg>
        <span>Scan QR</span>
      </button>
      {problem && (
        <p className="fine-print" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}
