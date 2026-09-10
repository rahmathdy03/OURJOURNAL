"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AppPrefetch({
  modules,
}: {
  modules: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const routes = [
      "/dashboard",
      ...(modules.includes("kebab") ? ["/kebab"] : []),
      ...(modules.includes("finance") ? ["/finance"] : []),
      ...(modules.includes("academic") ? ["/academic"] : []),
      ...(modules.includes("shopping") ? ["/shopping"] : []),
      "/reports",
      "/notifications",
      "/settings",
    ].filter((route, index, list) => route !== pathname && list.indexOf(route) === index);

    // Dashboard is the heaviest and most frequently revisited page, so warm it first.
    const prioritized = routes.sort((a, b) => {
      if (a === "/dashboard") return -1;
      if (b === "/dashboard") return 1;
      return 0;
    });

    const timers = prioritized.map((route, index) =>
      window.setTimeout(() => router.prefetch(route), index * 90)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [modules, pathname, router]);

  return null;
}
