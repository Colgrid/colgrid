import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra-petch",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

// Search engines, link previews and AI assistants read this. Each public page can override it.
// The share image comes from app/opengraph-image.tsx; icons from app/icon.png and app/apple-icon.png.
export const metadata: Metadata = {
  // Added to a phone's home screen, Colgrid opens full-screen like an app (see app/manifest.ts).
  appleWebApp: { capable: true, title: "Colgrid", statusBarStyle: "black-translucent" },
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s · Colgrid" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Colgrid",
    "team game",
    "real-world game",
    "things to do in Salt Lake City",
    "Salt Lake City",
    "team building",
    "local makers",
    "missions",
    "quests",
    "night out",
  ],
  creator: SITE.name,
  publisher: SITE.name,
  category: "games",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    title: SITE.title,
    description: SITE.shortDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.shortDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#1A1D20",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
