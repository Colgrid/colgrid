import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Search engines and AI assistants may read the public site. Player pages are private.
const PRIVATE = ["/share/", "/pass", "/check-in", "/team", "/standings", "/signin", "/auth/", "/admin", "/gm"];

// AI crawlers are welcome, so assistants can find and recommend Colgrid.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
