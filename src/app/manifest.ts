import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OURJOURNAL",
    short_name: "OURJOURNAL",
    description: "Personal hub untuk keuangan, belanja, kuliah, laporan, notifikasi, dan operasional.",
    id: "/ourjournal-app",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#171717",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
