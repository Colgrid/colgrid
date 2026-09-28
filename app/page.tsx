import Image from "next/image";

// Placeholder home page for the foundation step. The full public home page is step 7 of
// docs/mvp-spec.md; this one exists so the first deploy shows the brand is wired up.
export default function Home() {
  return (
    <main className="page">
      <span className="logo-tile">
        {/* Scaled inside the tile to trim the file's white margin, as in the mockups. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={96} height={96} priority style={{ transform: "scale(1.7)" }} />
      </span>

      <p className="mono" style={{ color: "var(--chapter-teal)", letterSpacing: "0.12em", fontSize: 13, marginTop: 28 }}>
        CHAPTER 01 · SALT LAKE CITY
      </p>
      <h1 style={{ fontSize: 44, marginTop: 8 }}>Your city has missions.</h1>
      <p style={{ fontSize: 18, lineHeight: 1.45, color: "var(--ink-muted)", marginTop: 16 }}>
        Meet your team in one walkable neighborhood. Take on missions hosted by local makers, kitchens and guides.
        Your XP follows you to every city.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <span className="chip chip--casual">CASUAL</span>
        <span className="chip chip--tournament">TOURNAMENT</span>
      </div>

      <p style={{ fontSize: 16, lineHeight: 1.45, color: "var(--ink-subtle)", marginTop: 32 }}>
        The pilot season is being built. Tickets open soon.
      </p>
    </main>
  );
}
