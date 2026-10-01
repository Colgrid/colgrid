"use client";

import { useRef, useState } from "react";

// A stop's map pin. Paste "40.7503, -111.8650" from Google Maps (right-click the spot, click the
// numbers to copy them), or stand at the stop and tap "Use my location".
export default function PinInput({ defaultValue, name = "pin" }: { defaultValue: string; name?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  function here() {
    if (!("geolocation" in navigator)) return setNote("This browser can't share its location.");
    setNote("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (ref.current) ref.current.value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`;
        setNote(`Pinned (accurate to about ${Math.round(p.coords.accuracy)} m). Save the quest to keep it.`);
      },
      () => setNote("Couldn't get your location. Allow location for this site, or paste the pin from Google Maps."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <div className="pin-input">
      <input name={name} ref={ref} defaultValue={defaultValue} placeholder="e.g. 40.750300, -111.865000" inputMode="decimal" />
      <button type="button" className="button button--dark" onClick={here}>
        Use my location
      </button>
      {note && <p className="admin-hint">{note}</p>}
    </div>
  );
}
