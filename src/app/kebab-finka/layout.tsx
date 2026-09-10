import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Kebab Finka",
  description: "Quick Input operasional Kebab Finka",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kebab Finka",
  },
  icons: {
    icon: [
      { url: "/icons/kebab-finka-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/kebab-finka-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/kebab-finka-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
  viewportFit: "cover",
};

export default function KebabFinkaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
