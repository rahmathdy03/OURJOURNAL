import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      name: "Kebab Finka",
      short_name: "Kebab Finka",
      description: "Quick Input operasional Kebab Finka",
      id: "/kebab-finka-app",
      start_url: "/kebab-finka",
      scope: "/",
      display: "standalone",
      background_color: "#fff7ed",
      theme_color: "#c2410c",
      orientation: "portrait-primary",
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
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
