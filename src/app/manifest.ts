import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kebab Finka",
    short_name: "Kebab Finka",
    description: "Quick Input operasional Kebab Finka",
    id: "/kebab-finka",
    start_url: "/kebab-finka",
    scope: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#c2410c",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/kebab-finka-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kebab-finka-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kebab-finka-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
