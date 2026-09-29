import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public pages only. Add new public pages here (e.g. how it works, hosts, FAQ) as they're built.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
