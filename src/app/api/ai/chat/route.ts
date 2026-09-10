import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 12000;

const SYSTEM_PROMPT = `Kamu adalah OJ AI, study buddy di aplikasi pribadi OURJOURNAL.
Utamakan bantuan untuk kuliah dan skripsi: menjelaskan konsep, merangkum teks yang diberikan user, menyusun pertanyaan bimbingan, memecah revisi menjadi target, membuat soal latihan, membantu metodologi penelitian secara umum, dan merapikan rencana belajar.
Jawab dalam Bahasa Indonesia kecuali user meminta bahasa lain. Gaya ramah, ringkas, praktis, dan tidak menggurui.
Jangan mengaku bisa membaca Google Drive, file, database, atau data OURJOURNAL yang tidak diberikan dalam percakapan. Jika user ingin analisis dokumen, minta isi dokumen atau bagian yang ingin dianalisis.
Untuk topik akademik, bantu berpikir dan menyusun, tetapi jangan mengarang sumber, DOI, kutipan, data penelitian, atau hasil eksperimen.
Gunakan poin-poin hanya saat memang membantu keterbacaan.`;

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

type GeminiMessage = {
  role: "user" | "model";
  content: string;
};

function pageContext(pathname: string) {
  if (pathname.startsWith("/academic/thesis")) {
    return "Konteks layar saat ini: Workspace Skripsi. Prioritaskan bantuan bimbingan, revisi, penelitian, referensi, target, dan timeline bila relevan.";
  }
  if (pathname.startsWith("/academic")) {
    return "Konteks layar saat ini: modul Kuliah. Prioritaskan penjelasan materi, rangkuman, soal latihan, tugas, dan jadwal belajar bila relevan.";
  }
  return "Konteks layar saat ini: OURJOURNAL. AI versi pertama terutama difokuskan untuk Kuliah dan Skripsi.";
}

function normalizeMessages(rawMessages: IncomingMessage[]) {
  const normalized: GeminiMessage[] = rawMessages
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      content: typeof message.content === "string" ? message.content.trim().slice(0, MAX_MESSAGE_CHARS) : "",
    }))
    .filter((message) => message.content.length > 0);

  while (normalized[0]?.role === "model") normalized.shift();
  return normalized;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OJ AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY di Vercel." },
      { status: 503 }
    );
  }

  let body: { messages?: IncomingMessage[]; pathname?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const messages = normalizeMessages(Array.isArray(body.messages) ? body.messages : []);

  if (!messages.length) {
    return NextResponse.json({ error: "Tulis pertanyaan dulu ya." }, { status: 400 });
  }

  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json(
      { error: "Percakapan terlalu panjang untuk satu permintaan. Mulai topik baru atau ringkas pertanyaannya." },
      { status: 413 }
    );
  }

  const pathname = typeof body.pathname === "string" ? body.pathname.slice(0, 200) : "";
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${pageContext(pathname)}` }],
          },
          contents: messages.map((message) => ({
            role: message.role,
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700,
          },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      let detail = "";
      try {
        const providerError = await response.json();
        detail = providerError?.error?.message || "";
      } catch {
        // Provider response is not JSON.
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Kuota Gemini sedang penuh. Coba lagi sebentar." },
          { status: 429 }
        );
      }

      console.error("Gemini API error", response.status, detail);
      return NextResponse.json(
        { error: "Gemini belum bisa menjawab sekarang. Coba lagi sebentar." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const answer = (result?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return NextResponse.json(
        { error: "Gemini tidak mengembalikan jawaban. Coba ubah pertanyaannya." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (caught) {
    console.error("Gemini request failed", caught);
    return NextResponse.json(
      { error: "Koneksi ke Gemini gagal. Coba lagi sebentar." },
      { status: 502 }
    );
  }
}
