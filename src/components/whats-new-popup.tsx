"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Bot,
  BookOpen,
  ChevronRight,
  GraduationCap,
  History,
  LayoutDashboard,
  ShoppingCart,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

const UPDATE_VERSION = "2026-09-11-v2";

const updates = [
  {
    version: "v1.0",
    icon: LayoutDashboard,
    title: "Navbar iOS Liquid Glass",
    description:
      "Bottom navbar mobile sekarang mengambang, punya efek kaca/cair, animasi spring, dan bisa digeser antar tab seperti pengalaman iPhone modern.",
  },
  {
    version: "v1.1",
    icon: Sparkles,
    title: "Navigasi terasa lebih instan",
    description:
      "Prefetch dan perpindahan tab dipercepat, termasuk Dashboard, supaya pindah menu terasa jauh lebih responsif.",
  },
  {
    version: "v1.2",
    icon: GraduationCap,
    title: "Workspace Skripsi lengkap",
    description:
      "Skripsi punya Overview, Bimbingan, Penelitian, Referensi, File Skripsi, Administrasi, Target & Prioritas, Notifikasi, dan Timeline dengan UI khusus mobile maupun desktop.",
  },
  {
    version: "v1.3",
    icon: Bot,
    title: "OJ AI hadir",
    description:
      "Pet ungu OJ AI bisa dipindahkan, memakai Gemini 3.1 Flash-Lite atau 3.6 Flash, tahu halaman aktif, dan bisa memakai ringkasan data OURJOURNAL milik akun yang sedang login.",
  },
  {
    version: "v1.4",
    icon: BookOpen,
    title: "Kuliah lebih ringkas",
    description:
      "Form tambah mata kuliah disederhanakan. Kode mata kuliah dihapus agar input lebih cepat.",
  },
  {
    version: "v1.5",
    icon: ShoppingCart,
    title: "Belanja lebih cepat",
    description:
      "Kategori Belanja dan Wishlist sekarang berupa dropdown terstruktur, termasuk pilihan Lainnya untuk kategori custom.",
  },
  {
    version: "v1.6",
    icon: WalletCards,
    title: "Belanja & Keuangan terhubung",
    description:
      "Pembelian baru dari menu Belanja otomatis masuk sebagai Pengeluaran di Keuangan. Keuangan menjadi pusat arus uang sehingga tidak perlu input dua kali.",
  },
  {
    version: "v1.7",
    icon: BellRing,
    title: "Pengingat otomatis jam 09.00",
    description:
      "OURJOURNAL mengecek deadline setiap pagi: mengingatkan H-2, hari jatuh tempo, dan data yang sudah lewat tempo. Finka juga mendapat pengingat Kebab harian Senin–Sabtu untuk produksi dan Minggu untuk belanja bahan.",
  },
] as const;

function UpdateList({ showVersion = false }: { showVersion?: boolean }) {
  return (
    <div className="space-y-2">
      {updates.map(({ version, icon: Icon, title, description }, index) => (
        <div
          key={title}
          className="flex gap-3 rounded-[22px] border border-black/[.055] bg-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,.035)]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600">
            <Icon size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {showVersion ? (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.12em] text-purple-700">
                  {version}
                </span>
              ) : (
                <span className="text-[10px] font-black text-neutral-300">{String(index + 1).padStart(2, "0")}</span>
              )}
              <p className="font-black text-neutral-900">{title}</p>
              {showVersion && index === updates.length - 1 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-700">
                  Terbaru
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-[1.45rem] text-neutral-500">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WhatsNewPopup({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const storageKey = useMemo(
    () => `ourjournal-whats-new:${UPDATE_VERSION}:${firstName.trim().toLowerCase() || "user"}`,
    [firstName],
  );

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    try {
      if (window.localStorage.getItem(storageKey) === "seen") return;
      window.localStorage.setItem(storageKey, "seen");
      setOpen(true);
    } catch {
      // Jika localStorage diblokir, jangan membuat popup berulang yang mengganggu aplikasi.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end bg-black/30 backdrop-blur-[2px] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section className="max-h-[88dvh] w-full overflow-hidden rounded-t-[32px] border border-white/70 bg-[#fbfaf7] shadow-[0_-24px_70px_rgba(0,0,0,.18)]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-black/15" />

        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[.14em] text-orange-600">
              <Sparkles size={13} /> Update terbaru
            </div>
            <h2 id="whats-new-title" className="text-2xl font-black tracking-tight text-neutral-950">
              OURJOURNAL makin lengkap ✨
            </h2>
            <p className="mt-1.5 text-sm leading-5 text-neutral-500">
              Hai {firstName}, ini rangkuman perubahan sejak navbar mobile Liquid Glass sampai pengingat otomatis pukul 09.00 WIB.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-neutral-600 shadow-sm"
            aria-label="Tutup update terbaru"
          >
            <X size={21} />
          </button>
        </div>

        <div className="max-h-[calc(88dvh-210px)] overflow-y-auto px-4 pb-4 overscroll-contain">
          <UpdateList />

          <div className="mt-2 rounded-[22px] bg-gradient-to-r from-orange-50 to-[#fff8ef] p-4 text-sm leading-5 text-neutral-600">
            <b className="text-neutral-900">Tetap dipertahankan:</b> Kebab Finka Quick Input masih menjadi shortcut terpisah untuk input produksi dan stok dengan cepat.
          </div>
        </div>

        <div className="border-t border-black/5 bg-[#fbfaf7]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-base font-black text-white shadow-[0_10px_28px_rgba(249,115,22,.25)] active:scale-[.99]"
          >
            Siap, lanjut pakai OURJOURNAL
            <ChevronRight size={19} />
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            Popup update ini hanya muncul otomatis satu kali untuk versi terbaru di perangkatmu.
          </p>
        </div>
      </section>
    </div>
  );
}

export function VersionHistoryButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-neutral-50 p-4 text-left transition hover:bg-neutral-100 active:scale-[.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-700">
            <History size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-neutral-900">Riwayat versi & update</p>
            <p className="mt-0.5 text-xs leading-5 text-neutral-500">
              Lihat perubahan dari navbar Liquid Glass sampai versi terbaru.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-black text-purple-600">Buka</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="version-history-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-white/60 bg-[#fbfaf7] shadow-2xl sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/75 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[.16em] text-purple-600">OURJOURNAL</p>
                <h2 id="version-history-title" className="mt-1 text-xl font-black text-neutral-950">
                  Riwayat versi
                </h2>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Perjalanan update aplikasi dari awal navbar mobile baru sampai fitur terbaru.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5 text-neutral-600 transition hover:bg-black/10"
                aria-label="Tutup riwayat versi"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4 sm:px-6">
              <UpdateList showVersion />
              <div className="mt-2 rounded-[22px] bg-gradient-to-r from-orange-50 to-[#fff8ef] p-4 text-sm leading-5 text-neutral-600">
                <b className="text-neutral-900">Kebab Finka Quick Input</b> tetap berdiri sebagai shortcut terpisah supaya produksi, pakai bahan, tambah stok, dan cek stok tetap bisa dilakukan secepat mungkin.
              </div>
            </div>

            <div className="border-t border-black/5 bg-white/80 p-4 backdrop-blur-xl sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-black text-white active:scale-[.99]"
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
