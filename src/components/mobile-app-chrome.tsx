"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  ChartNoAxesCombined,
  GraduationCap,
  Home,
  LogOut,
  MoreHorizontal,
  Settings,
  ShoppingCart,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import { logout } from "@/features/auth/actions";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Home;
  module?: string;
};

const allItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Beranda", icon: Home },
  { href: "/finance", label: "Keuangan", shortLabel: "Keuangan", icon: WalletCards, module: "finance" },
  { href: "/shopping", label: "Belanja", shortLabel: "Belanja", icon: ShoppingCart, module: "shopping" },
  { href: "/academic", label: "Kuliah", shortLabel: "Kuliah", icon: GraduationCap, module: "academic" },
  { href: "/kebab", label: "Operasional Finka", shortLabel: "Kebab", icon: BookOpenCheck, module: "kebab" },
  { href: "/reports", label: "Laporan", shortLabel: "Laporan", icon: ChartNoAxesCombined },
  { href: "/notifications", label: "Notifikasi", shortLabel: "Notifikasi", icon: Bell },
  { href: "/settings", label: "Pengaturan", shortLabel: "Pengaturan", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileAppChrome({
  modules,
  name,
}: {
  modules: string[];
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const available = allItems.filter(
    (item) => !item.module || modules.includes(item.module)
  );

  const dashboard = available.find((item) => item.href === "/dashboard")!;
  const finance = available.find((item) => item.href === "/finance");
  const shopping = available.find((item) => item.href === "/shopping");
  const academic = available.find((item) => item.href === "/academic");
  const kebab = available.find((item) => item.href === "/kebab");

  const primaryCandidates = kebab
    ? [dashboard, kebab, finance, academic || shopping]
    : [dashboard, finance, shopping, academic];

  const primary = primaryCandidates.filter(Boolean).slice(0, 4) as NavItem[];
  const primaryHrefs = new Set(primary.map((item) => item.href));
  const secondary = available.filter((item) => !primaryHrefs.has(item.href));
  const activePath = pendingHref || pathname;

  const current =
    available.find((item) => isActive(activePath, item.href)) ?? dashboard;
  const CurrentIcon = current.icon;
  const firstName = name.trim().split(/\s+/)[0] || "Kamu";

  function warmRoute(href: string) {
    if (!isActive(pathname, href)) router.prefetch(href);
  }

  function beginNavigation(href: string) {
    if (!isActive(pathname, href)) setPendingHref(href);
    setMoreOpen(false);
  }

  return (
    <>
      {pendingHref && (
        <div className="fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden bg-orange-100 lg:hidden">
          <div className="h-full w-2/3 animate-pulse bg-orange-600" />
        </div>
      )}

      <header className="mobile-app-header sticky top-0 z-40 border-b border-black/5 bg-[#f7f5f0]/92 px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-neutral-950 text-xs font-black tracking-tight text-white shadow-sm">
              OJ
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                OURJOURNAL
              </p>
              <div className="flex items-center gap-1.5">
                <CurrentIcon size={16} className="shrink-0 text-neutral-500" />
                <p className="truncate text-base font-black text-neutral-900">
                  {current.label}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              prefetch
              onPointerEnter={() => warmRoute("/notifications")}
              onTouchStart={() => warmRoute("/notifications")}
              onClick={() => beginNavigation("/notifications")}
              aria-label="Buka notifikasi"
              className={`flex h-10 w-10 items-center justify-center rounded-[14px] border shadow-sm transition ${
                isActive(activePath, "/notifications")
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-black/5 bg-white text-neutral-700"
              }`}
            >
              <Bell size={18} />
            </Link>
            <div
              className="flex h-10 min-w-10 items-center justify-center rounded-[14px] bg-orange-100 px-2 text-xs font-black text-orange-800"
              title={`Halo, ${firstName}`}
            >
              {firstName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/94 px-2 pb-[calc(.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,.06)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(activePath, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onPointerEnter={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                onClick={() => beginNavigation(item.href)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition active:scale-95 ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-neutral-500"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.6 : 2} />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition active:scale-95 ${
              secondary.some((item) => isActive(activePath, item.href))
                ? "bg-orange-50 text-orange-700"
                : "text-neutral-500"
            }`}
          >
            <MoreHorizontal size={21} />
            Lainnya
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[30px] bg-[#f7f5f0] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-neutral-300" />
            <div className="mx-auto max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">
                    OURJOURNAL
                  </p>
                  <h2 className="text-xl font-black">Semua menu</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
                >
                  <X size={19} />
                </button>
              </div>

              {modules.includes("kebab") && (
                <Link
                  href="/kebab-finka"
                  prefetch
                  onPointerEnter={() => router.prefetch("/kebab-finka")}
                  onTouchStart={() => router.prefetch("/kebab-finka")}
                  onClick={() => setMoreOpen(false)}
                  className="mb-4 flex items-center justify-between rounded-2xl bg-neutral-950 p-4 text-white shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="font-black">Quick Input Kebab Finka</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        Produksi dan stok tanpa banyak langkah
                      </p>
                    </div>
                  </div>
                  <span className="text-xl text-neutral-500">›</span>
                </Link>
              )}

              <div className="grid grid-cols-2 gap-2">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(activePath, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onPointerEnter={() => warmRoute(item.href)}
                      onTouchStart={() => warmRoute(item.href)}
                      onClick={() => beginNavigation(item.href)}
                      className={`flex min-h-24 flex-col justify-between rounded-2xl border p-3.5 shadow-sm transition active:scale-[.98] ${
                        active
                          ? "border-orange-200 bg-orange-50 text-orange-800"
                          : "border-black/5 bg-white text-neutral-800"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-sm font-black">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <form action={logout} className="mt-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-black text-red-700">
                  <LogOut size={17} />
                  Keluar dari akun
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
