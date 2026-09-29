import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Lets players add their pass to the home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.shortDescription,
    start_url: "/pass",
    display: "standalone",
    background_color: "#1A1D20",
    theme_color: "#1A1D20",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
