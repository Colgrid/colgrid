// The branded share card: a 1080×1920 image (Stories size; feeds crop it to the middle).
// Built from a few numbers only (see lib/share.ts): no mission titles, places or answers, ever.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { cardLevelLine, cardTitle, formatCardDate, parseCardQuery } from "@/lib/share";

export const runtime = "nodejs";

// Brand fonts, fetched once per server instance. If they can't be fetched, the card still renders.
let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 700 | 500; style: "normal" }[]> | null = null;
async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return src ? await (await fetch(src)).arrayBuffer() : null;
  } catch {
    return null;
  }
}
function brandFonts() {
  fontsPromise ??= Promise.all([googleFont("Chakra Petch", 700), googleFont("Space Grotesk", 500), googleFont("JetBrains Mono", 700)]).then(
    ([display, body, mono]) =>
      [
        display && { name: "Chakra Petch", data: display, weight: 700 as const, style: "normal" as const },
        body && { name: "Space Grotesk", data: body, weight: 500 as const, style: "normal" as const },
        mono && { name: "JetBrains Mono", data: mono, weight: 700 as const, style: "normal" as const },
      ].filter((f): f is NonNullable<typeof f> => Boolean(f)),
  );
  return fontsPromise;
}

export async function GET(request: Request) {
  const m = parseCardQuery(new URL(request.url).searchParams);
  const [logo, fonts] = await Promise.all([readFile(join(process.cwd(), "public/brand/colgrid-logo.png")), brandFonts()]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const title = cardTitle(m);
  const levelLine = cardLevelLine(m);
  const date = formatCardDate(m.date);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "120px 96px",
          background: "#1A1D20",
          color: "#F4F5F7",
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ width: 120, height: 120, borderRadius: 26, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={204} height={204} alt="" />
          </div>
          <div style={{ fontFamily: "Chakra Petch", fontSize: 64, fontWeight: 700, letterSpacing: 6 }}>COLGRID</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 120, height: 14, background: "#FF9F1C", marginBottom: 56 }} />
          <div style={{ fontFamily: "Chakra Petch", fontSize: 128, fontWeight: 700, lineHeight: 1.0, display: "flex", flexWrap: "wrap" }}>{title}</div>
          {m.place && <div style={{ marginTop: 48, fontSize: 48, color: "#C9CDD2" }}>{`${m.place} · Salt Lake City`}</div>}
          {m.xp > 0 && (
            <div style={{ marginTop: 72, fontFamily: "JetBrains Mono", fontSize: 150, fontWeight: 700, color: "#FF9F1C" }}>{`+${m.xp} XP`}</div>
          )}
          {levelLine && (
            <div style={{ marginTop: 24, fontFamily: "JetBrains Mono", fontSize: 44, fontWeight: 700, color: "#2EC4B6", letterSpacing: 4 }}>{levelLine}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "JetBrains Mono", fontSize: 36, color: "#8A9097", letterSpacing: 3 }}>
          <div>{date ?? ""}</div>
          <div style={{ color: "#F4F5F7" }}>getcolgrid.com</div>
        </div>
      </div>
    ),
    // Same numbers, same card: let phones and the CDN keep it.
    { width: 1080, height: 1920, fonts, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
  return image;
}
