"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CloudOff, Wifi } from "lucide-react";

function postToWorker(message: unknown) {
  if (!("serviceWorker" in navigator)) return;
  const worker =
    navigator.serviceWorker.controller ||
    navigator.serviceWorker.ready.then((registration) => registration.active);

  if (worker instanceof Promise) {
    void worker.then((active) => active?.postMessage(message));
    return;
  }

  worker?.postMessage(message);
}

function routeFromAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function PWABootstrap() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [writeBlocked, setWriteBlocked] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          await navigator.serviceWorker.ready;
          const active =
            registration.active || registration.waiting || registration.installing;

          if (pathname === "/login") {
            active?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
          } else if (navigator.onLine) {
            active?.postMessage({
              type: "CACHE_ROUTES",
              routes: [pathname, "/dashboard"],
            });
          }
        })
        .catch(() => undefined);
    }

    const handleOnline = () => {
      setOnline(true);
      setWriteBlocked(false);
      if (pathname !== "/login") {
        postToWorker({
          type: "CACHE_ROUTES",
          routes: [pathname, "/dashboard"],
        });
      }
    };
    const handleOffline = () => setOnline(false);

    const handleClick = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const route = routeFromAnchor(event.target);
      if (!route) return;
      event.preventDefault();
      window.location.assign(route);
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (navigator.onLine) return;
      event.preventDefault();
      setWriteBlocked(true);
      window.setTimeout(() => setWriteBlocked(false), 3500);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") {
      postToWorker({ type: "CLEAR_PRIVATE_CACHE" });
    } else if (navigator.onLine) {
      postToWorker({ type: "CACHE_ROUTES", routes: [pathname, "/dashboard"] });
    }
  }, [pathname]);

  if (online) return null;

  return (
    <div className="fixed inset-x-3 top-[calc(.7rem+env(safe-area-inset-top))] z-[200] mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2.5 text-xs font-bold text-amber-900 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <CloudOff size={16} className="shrink-0" />
        <span className="flex-1">
          Mode offline. Halaman yang pernah dibuka tetap tersedia.
        </span>
        <Wifi size={14} className="opacity-50" />
      </div>
      {writeBlocked && (
        <p className="mt-1 pl-6 text-[11px] font-semibold text-amber-800">
          Simpan, hapus, dan perubahan data membutuhkan koneksi internet.
        </p>
      )}
    </div>
  );
}
