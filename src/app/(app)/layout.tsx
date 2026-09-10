import { LogOut } from "lucide-react";

import { Sidebar } from "@/components/sidebar";
import { MobileAppChrome } from "@/components/mobile-app-chrome";
import { QueryProvider } from "@/components/query-provider";
import { AppPrefetch } from "@/components/app-prefetch";

import { getProfileAndModules } from "@/lib/auth";
import { logout } from "@/features/auth/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, modules } = await getProfileAndModules();

  const name = profile?.display_name || "Pengguna";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "OURJOURNAL";

  return (
    <QueryProvider>
      <AppPrefetch modules={modules} />

      <div className="flex min-h-screen">
        <Sidebar modules={modules} appName={appName} />

        <div className="min-w-0 flex-1">
          <MobileAppChrome modules={modules} name={name} />

          <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-black/5 bg-[#f7f5f0]/95 px-7 backdrop-blur lg:flex">
            <div>
              <p className="text-xs text-neutral-500">{appName}</p>
              <p className="font-black">Halo, {name}</p>
            </div>

            <form action={logout}>
              <button className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50">
                <LogOut size={16} />
                Keluar
              </button>
            </form>
          </header>

          <main className="mobile-app-main mx-auto max-w-[1500px] space-y-6 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-7 md:pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-7">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
