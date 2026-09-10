"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  GripVertical,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Point = {
  x: number;
  y: number;
};

const PET_SIZE = 78;
const STORAGE_KEY = "ourjournal-ai-pet-position-v1";

function clampPosition(x: number, y: number, width: number, height: number): Point {
  const sidePadding = 10;
  const topPadding = width < 1024 ? 88 : 20;
  const bottomPadding = width < 1024 ? 118 : 20;

  return {
    x: Math.max(sidePadding, Math.min(width - PET_SIZE - sidePadding, x)),
    y: Math.max(topPadding, Math.min(height - PET_SIZE - bottomPadding, y)),
  };
}

function quickPrompts(pathname: string) {
  if (pathname.startsWith("/academic/thesis")) {
    return [
      { icon: GraduationCap, label: "Pertanyaan bimbingan", prompt: "Bantu aku menyiapkan pertanyaan untuk bimbingan skripsi berikutnya." },
      { icon: Target, label: "Pecah revisi", prompt: "Bantu aku memecah revisi skripsi menjadi target kecil yang realistis." },
      { icon: BrainCircuit, label: "Metode penelitian", prompt: "Bantu aku memahami dan mengecek logika metode penelitian skripsiku." },
    ];
  }

  if (pathname.startsWith("/academic")) {
    return [
      { icon: BookOpen, label: "Jelaskan materi", prompt: "Bantu jelaskan materi kuliah yang sedang kupelajari dengan bahasa sederhana." },
      { icon: BrainCircuit, label: "Buat soal latihan", prompt: "Buatkan 5 soal latihan untuk materi yang akan kukirim setelah ini." },
      { icon: Target, label: "Susun belajar", prompt: "Bantu aku menyusun sesi belajar yang realistis untuk hari ini." },
    ];
  }

  return [
    { icon: GraduationCap, label: "Bantu skripsi", prompt: "Aku mau lanjut skripsi. Bantu tentukan langkah kecil yang bisa kukerjakan sekarang." },
    { icon: BookOpen, label: "Bantu kuliah", prompt: "Bantu aku belajar lebih efektif untuk kuliah hari ini." },
    { icon: Target, label: "Susun prioritas", prompt: "Bantu aku menentukan tiga prioritas paling penting hari ini." },
  ];
}

function PetAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={compact ? "h-11 w-11" : "h-[78px] w-[78px] drop-shadow-[0_12px_20px_rgba(109,40,217,.28)]"}
    >
      <defs>
        <radialGradient id="ojPetBody" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
        <linearGradient id="ojPetEar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="ojPetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="100%" stopColor="#ddd6fe" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="54" r="39" fill="#ede9fe" opacity=".55" />
      <path d="M22 34 25 12 43 27Z" fill="url(#ojPetEar)" />
      <path d="M78 34 75 12 57 27Z" fill="url(#ojPetEar)" />
      <path d="M28 27 29 18 38 29Z" fill="#f0abfc" opacity=".75" />
      <path d="M72 27 71 18 62 29Z" fill="#f0abfc" opacity=".75" />
      <circle cx="50" cy="54" r="34" fill="url(#ojPetBody)" />
      <ellipse cx="50" cy="66" rx="22" ry="16" fill="#7c3aed" opacity=".65" />

      <ellipse cx="38" cy="50" rx="8" ry="10" fill="#171126" />
      <ellipse cx="62" cy="50" rx="8" ry="10" fill="#171126" />
      <circle cx="35.5" cy="46" r="3" fill="white" />
      <circle cx="59.5" cy="46" r="3" fill="white" />
      <circle cx="40.5" cy="52" r="1.3" fill="#ddd6fe" />
      <circle cx="64.5" cy="52" r="1.3" fill="#ddd6fe" />

      <path d="M45 61 Q50 66 55 61" fill="none" stroke="#24113d" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M48 59.5 50 61 52 59.5" fill="#f5d0fe" />
      <ellipse cx="28" cy="61" rx="5" ry="2.6" fill="#f0abfc" opacity=".5" />
      <ellipse cx="72" cy="61" rx="5" ry="2.6" fill="#f0abfc" opacity=".5" />

      <ellipse cx="28" cy="75" rx="9" ry="7" fill="#8b5cf6" transform="rotate(24 28 75)" />
      <ellipse cx="72" cy="75" rx="9" ry="7" fill="#8b5cf6" transform="rotate(-24 72 75)" />

      <circle cx="33" cy="35" r="14" fill="url(#ojPetGlow)" opacity=".42" />
      <path d="M84 23v8M80 27h8" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 51v6M15 54h6" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" />
      <circle cx="84" cy="40" r="2.2" fill="#f0abfc" />
    </svg>
  );
}

export function OJAIPet({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 20, y: 180 });
  const [viewportWidth, setViewportWidth] = useState(390);
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content: `Hai ${firstName || "kamu"}! ✨ Aku OJ AI. Mau belajar atau lanjut skripsi bareng?`,
    },
  ]);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const prompts = useMemo(() => quickPrompts(pathname), [pathname]);

  useEffect(() => {
    function initialPosition() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportWidth(width);

      let next = clampPosition(width - PET_SIZE - 16, height - PET_SIZE - (width < 1024 ? 220 : 50), width, height);
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Point;
          if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
            next = clampPosition(parsed.x, parsed.y, width, height);
          }
        } catch {
          // Ignore a malformed saved position.
        }
      }

      setPosition(next);
      setMounted(true);
    }

    initialPosition();

    function onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportWidth(width);
      setPosition((current) => clampPosition(current.x, current.y, width, height));
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(() => setShowHint(false), 6500);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 20);
  }, [messages, loading, open]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    setShowHint(false);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
    if (!drag.moved) return;

    event.preventDefault();
    setPosition(
      clampPosition(
        drag.startX + dx,
        drag.startY + dy,
        window.innerWidth,
        window.innerHeight
      )
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    if (drag.moved) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      return;
    }

    setOpen(true);
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content: `Mulai dari awal ya, ${firstName || "kamu"}. Apa yang mau kita kerjakan? ✨`,
      },
    ]);
    setInput("");
  }

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || loading) return;

    const outgoing: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(outgoing);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname,
          messages: outgoing.slice(-10),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "OJ AI belum bisa menjawab.");
      }

      setMessages([...outgoing, { role: "assistant", content: result.answer }]);
    } catch (caught) {
      setMessages([
        ...outgoing,
        {
          role: "assistant",
          content: caught instanceof Error ? caught.message : "OJ AI lagi bermasalah. Coba lagi sebentar ya.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (!mounted) return null;

  const hintOnLeft = position.x > viewportWidth / 2;

  return (
    <>
      {!open && (
        <div
          className="fixed z-[65] select-none"
          style={{ left: position.x, top: position.y }}
        >
          {showHint && (
            <div
              className={`pointer-events-none absolute top-0 z-[-1] whitespace-nowrap rounded-2xl border border-violet-100 bg-white/95 px-3 py-2 text-[11px] font-black text-violet-700 shadow-[0_10px_30px_rgba(76,29,149,.16)] backdrop-blur-xl ${
                hintOnLeft ? "right-[68px]" : "left-[68px]"
              }`}
            >
              AI siap bantu! ✨
            </div>
          )}

          <button
            type="button"
            aria-label="Buka OJ AI. Tahan dan geser untuk memindahkan pet."
            title="Tap untuk chat · geser untuk pindahkan"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            className="relative block cursor-grab rounded-full active:cursor-grabbing"
            style={{ touchAction: "none" }}
          >
            <span className="absolute inset-2 -z-10 rounded-full bg-violet-500/20 blur-xl animate-pulse" />
            <PetAvatar />
            <span className="absolute -right-0.5 bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-violet-700 text-white shadow-md">
              <GripVertical size={12} />
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[105] flex items-end justify-center lg:items-center lg:p-6">
          <button
            type="button"
            aria-label="Tutup OJ AI"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <section className="relative flex max-h-[82dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] border border-violet-100 bg-[#faf8f4] shadow-[0_-20px_60px_rgba(37,20,60,.16)] lg:max-h-[760px] lg:rounded-[30px]">
            <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-neutral-300 lg:hidden" />

            <header className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0 rounded-2xl bg-violet-100 p-0.5">
                  <PetAvatar compact />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#faf8f4] bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-base font-black text-neutral-950">OJ AI</h2>
                    <Sparkles size={14} className="text-violet-600" />
                  </div>
                  <p className="truncate text-[10px] font-bold text-neutral-400">Study buddy · powered by Gemini</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetChat}
                  aria-label="Mulai chat baru"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5 active:scale-95"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-600 shadow-sm ring-1 ring-black/5 active:scale-95"
                >
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="border-b border-black/5 px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {prompts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendMessage(item.prompt)}
                      className="flex shrink-0 items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-[11px] font-black text-violet-700 shadow-sm transition active:scale-[.98] disabled:opacity-50"
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={scrollRef} className="min-h-[240px] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:min-h-[320px]">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2.5 text-[13px] leading-5 ${
                      message.role === "user"
                        ? "rounded-br-md bg-violet-600 font-semibold text-white shadow-sm"
                        : "rounded-bl-md border border-black/5 bg-white text-neutral-700 shadow-sm"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md border border-violet-100 bg-white px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-600 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-black/5 bg-white/80 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:pb-3"
            >
              <div className="flex items-end gap-2 rounded-[20px] border border-black/5 bg-[#f5f3ef] p-2 pl-3 shadow-inner">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (input.trim()) void sendMessage(input);
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder="Tanya OJ AI..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Kirim"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition active:scale-95 disabled:bg-neutral-300"
                >
                  <ArrowUp size={18} strokeWidth={2.6} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[9px] font-medium text-neutral-400">V1 · chat tidak disimpan ke database · cek kembali informasi penting</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
