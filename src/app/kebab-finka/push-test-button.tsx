"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useState } from "react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function applicationServerKeyMatches(
  existing: ArrayBuffer | null,
  expected: Uint8Array
) {
  if (!existing) return false;
  const current = new Uint8Array(existing);
  if (current.length !== expected.length) return false;
  return current.every((byte, index) => byte === expected[index]);
}

export function PushTestButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function syncSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notification belum didukung di perangkat ini.");
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("VAPID public key belum tersedia di aplikasi.");
    }

    const expectedKey = urlBase64ToUint8Array(publicKey);
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    let recreated = false;

    if (
      subscription &&
      !applicationServerKeyMatches(
        subscription.options.applicationServerKey,
        expectedKey
      )
    ) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);

      const removed = await subscription.unsubscribe();
      if (!removed) {
        throw new Error(
          "Subscription lama memakai VAPID key berbeda dan gagal dihapus. Hapus izin notifikasi Kebab Finka lalu aktifkan kembali."
        );
      }

      subscription = null;
      recreated = true;
    }

    if (!subscription) {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Izin notifikasi belum diberikan.");
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKey,
      });
      recreated = true;
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

    return recreated;
  }

  async function testPush() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const recreated = await syncSubscription();

      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `Tes push gagal (${response.status}).`);
      }

      setMessage(
        `${recreated ? "Subscription diperbarui. " : ""}Tes dikirim ke ${result.sent ?? 1} perangkat. Cek notifikasi HP.`
      );
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
          {busy ? "Memperbarui & mengirim..." : "Kirim Notifikasi Tes"}
        </button>
        {message && <p className="mt-2 text-center text-xs font-bold text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-center text-xs font-bold text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
