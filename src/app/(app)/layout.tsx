import { LogOut } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { getProfileAndModules } from "@/lib/auth";
import { logout } from "@/features/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, modules } = await getProfileAndModules();
  const name = profile?.display_name || "Pengguna";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Personal Hub";
  return <div className="flex min-h-screen"><Sidebar modules={modules} appName={appName}/><div className="min-w-0 flex-1"><header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/5 bg-[#f7f5f0]/95 px-4 backdrop-blur md:px-7"><div><p className="text-xs text-neutral-500">{appName}</p><p className="font-black">Halo, {name}</p></div><div className="flex items-center gap-2"><MobileNav modules={modules}/><form action={logout}><button className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50"><LogOut size={16}/><span className="hidden sm:inline">Keluar</span></button></form></div></header><main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-7">{children}</main></div></div>;
}
