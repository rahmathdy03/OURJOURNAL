"use client";

import { Bell, BellOff, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Status = "checking" | "unsupported" | "blocked" | "disabled" | "enabled";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function keyToBase64Url(key: ArrayBuffer) {
  const bytes = new Uint8Array(key);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function normalizedKey(value: string) {
  return value.replace(/=+$/g, "");
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Gagal menyimpan pengaturan notifikasi.");
  }
}

export function PushNotificationControl() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }
      if (Notification.permission !== "granted") {
        setStatus("disabled");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          setStatus("disabled");
          return;
        }
        await saveSubscription(subscription);
        setStatus("enabled");
      } catch {
        setStatus("disabled");
      }
    }

    void check();
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Konfigurasi push notification belum tersedia.");

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("blocked");
        setMessage("Izin notifikasi diblokir. Aktifkan kembali dari pengaturan browser/perangkat.");
        return;
      }
      if (permission !== "granted") {
        setStatus("disabled");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription?.options.applicationServerKey) {
        const activeKey = keyToBase64Url(subscription.options.applicationServerKey);
        if (normalizedKey(activeKey) !== normalizedKey(publicKey)) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await saveSubscription(subscription);
      setStatus("enabled");
      setMessage("Notifikasi aktif. OURJOURNAL akan mengecek pengingat setiap pukul 09.00 WIB.");
    } catch (caught) {
      setStatus("disabled");
      setMessage(caught instanceof Error ? caught.message : "Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setStatus("disabled");
      setMessage("Push notification dinonaktifkan di perangkat ini.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Gagal menonaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  const enabled = status === "enabled";

  return (
    <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
          {enabled ? <CheckCircle2 size={20} /> : <Bell size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-neutral-900">Notifikasi pengingat</p>
          <p className="mt-1 text-sm leading-5 text-neutral-500">
            Cek otomatis pukul 09.00 WIB: H-2, hari jatuh tempo, dan lewat tempo untuk data yang punya deadline.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {status === "checking" ? (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500"><LoaderCircle className="animate-spin" size={15}/> Mengecek…</span>
            ) : enabled ? (
              <button type="button" onClick={disable} disabled={busy} className="btn-soft">
                {busy ? <LoaderCircle className="animate-spin" size={15}/> : <BellOff size={15}/>} Nonaktifkan push
              </button>
            ) : status === "unsupported" ? (
              <span className="text-xs font-bold text-neutral-500">Push notification belum didukung di browser ini.</span>
            ) : status === "blocked" ? (
              <span className="text-xs font-bold text-amber-700">Izin notifikasi sedang diblokir oleh browser/perangkat.</span>
            ) : (
              <button type="button" onClick={enable} disabled={busy} className="btn-soft">
                {busy ? <LoaderCircle className="animate-spin" size={15}/> : <Bell size={15}/>} Aktifkan push
              </button>
            )}
          </div>

          {message && <p className="mt-2 text-xs leading-5 text-neutral-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}
