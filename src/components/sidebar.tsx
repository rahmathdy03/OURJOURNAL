"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  ChartNoAxesCombined,
  GraduationCap,
  History,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

const base = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finance", label: "Keuangan", icon: WalletCards, module: "finance" },
  { href: "/shopping", label: "Belanja", icon: ShoppingCart, module: "shopping" },
  { href: "/academic", label: "Kuliah", icon: GraduationCap, module: "academic" },
  { href: "/reports", label: "Laporan", icon: ChartNoAxesCombined },
  { href: "/activity", label: "Aktivitas", icon: History },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
];

export function Sidebar({
  modules,
  appName,
}: {
  modules: string[];
  appName: string;
}) {
  const path = usePathname();
  const items = [
    ...base.filter((item) => !item.module || modules.includes(item.module)),
    ...(modules.includes("kebab")
      ? [
          {
            href: "/kebab",
            label: "Operasional Finka",
            icon: BookOpenCheck,
          },
        ]
      : []),
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/5 bg-neutral-950 px-4 py-6 text-white lg:block">
      <div className="mb-8 px-3">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-black">
          H
        </div>
        <p className="text-lg font-black">{appName}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-400">
          Satu tempat untuk aktivitas pribadi yang terus berkembang.
        </p>
      </div>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 rounded-2xl bg-white/5 p-4 text-xs leading-5 text-neutral-400">
        Modular: fitur umum tetap privat per user. Modul khusus hanya muncul untuk akun yang diberi akses.
      </div>
    </aside>
  );
}
