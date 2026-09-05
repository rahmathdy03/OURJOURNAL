"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function ModuleSubnav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return <div className="flex gap-2 overflow-x-auto pb-1">{items.map(item => { const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${active ? "bg-neutral-950 text-white" : "bg-white text-neutral-600 shadow-sm hover:bg-orange-50 hover:text-orange-700"}`}>{item.label}</Link>; })}</div>;
}
