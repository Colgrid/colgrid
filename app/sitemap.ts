import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public pages only. Add new public pages here (e.g. how it works, hosts, FAQ) as they're built.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/companies", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/hosts", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/accessibility", priority: 0.3, changeFrequency: "yearly" as const },
  ];
  return pages.map((p) => ({ url: `${SITE.url}${p.path}`, lastModified: new Date(), changeFrequency: p.changeFrequency, priority: p.priority }));
}
