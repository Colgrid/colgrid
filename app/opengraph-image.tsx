// The picture shown when someone shares getcolgrid.com (texts, Slack, social posts).
// Built once at deploy time. The logo is used as provided, on its white tile.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline} Hosted nights for meeting new people in Salt Lake City.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand fonts from Google Fonts. If they can't be fetched, the image still builds with the default font.
async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    return await (await fetch(src)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [logo, display, body, mono] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/colgrid-logo.png")),
    googleFont("Chakra Petch", 700),
    googleFont("Space Grotesk", 500),
    googleFont("JetBrains Mono", 700),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  const fonts = [
    display && { name: "Chakra Petch", data: display, weight: 700 as const, style: "normal" as const },
    body && { name: "Space Grotesk", data: body, weight: 500 as const, style: "normal" as const },
    mono && { name: "JetBrains Mono", data: mono, weight: 700 as const, style: "normal" as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "#1A1D20",
          color: "#F4F5F7",
          fontFamily: "Space Grotesk",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 26,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={224} height={224} alt="" />
        </div>
        <div style={{ marginTop: 44, fontFamily: "JetBrains Mono", fontSize: 26, letterSpacing: 4, color: "#2EC4B6" }}>
          SALT LAKE CITY
        </div>
        <div style={{ marginTop: 14, fontFamily: "Chakra Petch", fontSize: 92, fontWeight: 700, lineHeight: 1 }}>
          {SITE.tagline}
        </div>
        <div style={{ marginTop: 26, fontSize: 32, color: "#C9CDD2", maxWidth: 980, lineHeight: 1.35 }}>
          Hosted nights for meeting new people in Salt Lake City. Small teams, quick games, new people.
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 12, background: "#FF9F1C" }} />
      </div>
    ),
    { ...size, fonts },
  );
}
