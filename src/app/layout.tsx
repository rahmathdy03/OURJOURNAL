import type { Metadata } from "next";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Personal Hub";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Personal management hub untuk keuangan, belanja, kuliah, dan modul operasional.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
