"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Sparkles } from "lucide-react";

const quotes = [
  "Skripsi selesai, bukan cuma mimpi lagi.",
  "Sedikit progres tetap progres.",
  "Satu revisi lebih dekat ke lulus.",
  "Pelan boleh, berhenti jangan.",
];

export function ThesisIntro({ show }: { show: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(show);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    if (!show) return;
    const fade = window.setTimeout(() => setVisible(false), 1450);
    const done = window.setTimeout(() => router.replace("/academic/thesis?tab=overview", { scroll: false }), 1750);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
  }, [router, show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#fbf4ea] px-6 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      aria-hidden={!visible}
    >
      <div className="relative mx-auto w-full max-w-sm text-center">
        <div className="thesis-float mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[34px] border border-orange-100 bg-white/85 shadow-[0_24px_60px_rgba(194,65,12,.12)] backdrop-blur-xl">
          <GraduationCap size={58} className="text-neutral-900" strokeWidth={1.7} />
          <Sparkles size={22} className="absolute right-[26%] top-3 text-orange-500 thesis-spark" />
        </div>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-orange-600">OURJOURNAL</p>
        <h1 className="mx-auto max-w-xs text-3xl font-black leading-tight text-neutral-900">{quote}</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-500">Satu langkah lagi menuju versi terbaik dirimu.</p>

        <div className="mt-10 flex justify-center gap-1.5">
          <span className="h-1.5 w-8 rounded-full bg-orange-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-orange-200" />
          <span className="h-1.5 w-1.5 rounded-full bg-orange-200" />
        </div>
      </div>
    </div>
  );
}
