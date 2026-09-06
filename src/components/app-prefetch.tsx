"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AppPrefetch({
  modules,
}: {
  modules: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const routes: string[] = [];

    if (modules.includes("finance")) {
      routes.push("/finance");
    }

    if (modules.includes("shopping")) {
      routes.push("/shopping");
    }

    if (modules.includes("academic")) {
      routes.push("/academic");
    }

    if (modules.includes("kebab")) {
      routes.push("/kebab");
    }

    const timer = window.setTimeout(() => {
      routes.forEach((route) => {
        router.prefetch(route);
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [modules, router]);

  return null;
}