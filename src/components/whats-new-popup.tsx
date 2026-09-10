"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  ShoppingCart,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

const UPDATE_VERSION = "2026-09-11-v1";

const updates = [
  {
    icon: LayoutDashboard,
    title: "Navbar iOS Liquid Glass",
    description:
      "Bottom navbar mobile sekarang mengambang, punya efek kaca/cair, animasi spring, dan bisa digeser antar tab seperti pengalaman iPhone modern.",
  },
  {
    icon: Sparkles,
    title: "Navigasi terasa lebih instan",
    description:
      "Prefetch dan perpindahan tab dipercepat, termasuk Dashboard, supaya pindah menu terasa jauh lebih responsif.",
  },
  {
    icon: GraduationCap,
    title: "Workspace Skripsi lengkap",
    description:
      "Skripsi punya Overview, Bimbingan, Penelitian, Referensi, File Skripsi, Administrasi, Target & Prioritas, Notifikasi, dan Timeline dengan UI khusus mobile maupun desktop.",
  },
  {
    icon: Bot,
    title: "OJ AI hadir",
    description:
      "Pet ungu OJ AI bisa dipindahkan, memakai Gemini 3.1 Flash-Lite atau 3.6 Flash, tahu halaman aktif, dan bisa memakai ringkasan data OURJOURNAL milik akun yang sedang login.",
  },
  {
    icon: BookOpen,
    title: "Kuliah lebih ringkas",
    description:
      "Form tambah mata kuliah disederhanakan. Kode mata kuliah dihapus agar input lebih cepat.",
  },
  {
    icon: ShoppingCart,
    title: "Belanja lebih cepat",
    description:
      "Kategori Belanja dan Wishlist sekarang berupa dropdown terstruktur, termasuk pilihan Lainnya untuk kategori custom.",
  },
  {
    icon: WalletCards,
    title: "Belanja & Keuangan terhubung",
    description:
      "Pembelian baru dari menu Belanja otomatis masuk sebagai Pengeluaran di Keuangan. Keuangan menjadi pusat arus uang sehingga tidak perlu input dua kali.",
  },
] as const;

export function WhatsNewPopup({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const storageKey = useMemo(
    () => `ourjournal-whats-new:${UPDATE_VERSION}:${firstName.trim().toLowerCase() || "user"}`,
    [firstName],
  );

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    try {
      if (window.localStorage.getItem(storageKey) !== "seen") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
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

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "seen");
    } catch {
      // Jika localStorage tidak tersedia, cukup tutup untuk sesi ini.
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
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
        if (event.target === event.currentTarget) dismiss();
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
              Hai {firstName}, ini rangkuman perubahan terbaru sejak navbar mobile iOS sampai integrasi Belanja & Keuangan.
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-neutral-600 shadow-sm"
            aria-label="Tutup update terbaru"
          >
            <X size={21} />
          </button>
        </div>

        <div className="max-h-[calc(88dvh-210px)] space-y-2 overflow-y-auto px-4 pb-4 overscroll-contain">
          {updates.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="flex gap-3 rounded-[22px] border border-black/[.055] bg-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,.035)]"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                <Icon size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-neutral-300">{String(index + 1).padStart(2, "0")}</span>
                  <p className="font-black text-neutral-900">{title}</p>
                </div>
                <p className="mt-1 text-[13px] leading-[1.45rem] text-neutral-500">{description}</p>
              </div>
            </div>
          ))}

          <div className="rounded-[22px] bg-gradient-to-r from-orange-50 to-[#fff8ef] p-4 text-sm leading-5 text-neutral-600">
            <b className="text-neutral-900">Tetap dipertahankan:</b> Kebab Finka Quick Input masih menjadi shortcut terpisah untuk input produksi dan stok dengan cepat.
          </div>
        </div>

        <div className="border-t border-black/5 bg-[#fbfaf7]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={dismiss}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-base font-black text-white shadow-[0_10px_28px_rgba(249,115,22,.25)] active:scale-[.99]"
          >
            Siap, lanjut pakai OURJOURNAL
            <ChevronRight size={19} />
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            Pop-up ini hanya muncul satu kali untuk update ini di perangkatmu.
          </p>
        </div>
      </section>
    </div>
  );
}
