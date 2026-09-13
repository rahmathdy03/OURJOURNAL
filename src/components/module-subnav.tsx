"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ModuleSubnav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    for (const item of items) {
      if (item.href !== pathname) router.prefetch(item.href);
    }
  }, [items, pathname, router]);

  const activePath = pendingHref || pathname;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = activePath === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onPointerEnter={() => router.prefetch(item.href)}
            onTouchStart={() => router.prefetch(item.href)}
            onClick={() => setPendingHref(item.href)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-[.98] ${
              active
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white text-neutral-700 shadow-sm hover:bg-orange-50 hover:text-orange-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
