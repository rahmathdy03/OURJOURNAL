"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function PushTestButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function syncSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notification belum didukung di perangkat ini.");
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      throw new Error("Subscription push belum ada. Aktifkan notifikasi terlebih dahulu.");
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || `Gagal sinkronkan subscription (${response.status}).`);
    }
  }

  async function testPush() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await syncSubscription();

      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `Tes push gagal (${response.status}).`);
      }

      setMessage(`Tes dikirim ke ${result.sent ?? 1} perangkat. Cek notifikasi HP.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tes push gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
      <div className="rounded-2xl bg-stone-950 p-3 text-white shadow-2xl ring-1 ring-white/10">
        <button
          type="button"
          onClick={() => void testPush()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-black disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <BellRing size={18} />}
          {busy ? "Menyinkronkan & mengirim..." : "Kirim Notifikasi Tes"}
        </button>
        {message && <p className="mt-2 text-center text-xs font-bold text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-center text-xs font-bold text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
