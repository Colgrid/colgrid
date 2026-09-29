"use client";

export default function PrintButton() {
  return (
    <button type="button" className="button button--primary" onClick={() => window.print()}>
      Print plaques
    </button>
  );
}
