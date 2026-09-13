"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const kebabRoutes = [
  "/kebab",
  "/kebab/ingredients",
  "/kebab/recipes",
  "/kebab/production",
  "/kebab/purchases",
  "/kebab/stock",
];

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
      ...(modules.includes("kebab") ? kebabRoutes : []),
      ...(modules.includes("finance") ? ["/finance"] : []),
      ...(modules.includes("academic") ? ["/academic"] : []),
      ...(modules.includes("shopping") ? ["/shopping"] : []),
      "/reports",
      "/notifications",
      "/settings",
    ].filter((route, index, list) => route !== pathname && list.indexOf(route) === index);

    const inKebab = pathname === "/kebab" || pathname.startsWith("/kebab/");
    const prioritized = routes.sort((a, b) => {
      const score = (route: string) => {
        if (inKebab && route.startsWith("/kebab")) return 0;
        if (route === "/dashboard") return 1;
        if (route === "/kebab") return 2;
        return 3;
      };
      return score(a) - score(b);
    });

    const timers = prioritized.map((route, index) =>
      window.setTimeout(() => router.prefetch(route), index * 60)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [modules, pathname, router]);

  return null;
}
