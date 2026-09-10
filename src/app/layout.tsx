import type { Metadata, Viewport } from "next";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "OURJOURNAL";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Personal management hub untuk keuangan, belanja, kuliah, laporan, notifikasi, dan operasional.",
  applicationName: "OURJOURNAL",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OURJOURNAL",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
