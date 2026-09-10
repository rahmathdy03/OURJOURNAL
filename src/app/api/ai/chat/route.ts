import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 12000;
const DEFAULT_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

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

type ProviderError = {
  status?: string;
  message?: string;
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
  const normalized = rawMessages
    .slice(-MAX_MESSAGES)
    .map<GeminiMessage>((message) => {
      const role: GeminiMessage["role"] = message.role === "assistant" ? "model" : "user";
      return {
        role,
        content: typeof message.content === "string" ? message.content.trim().slice(0, MAX_MESSAGE_CHARS) : "",
      };
    })
    .filter((message) => message.content.length > 0);

  while (normalized[0]?.role === "model") normalized.shift();
  return normalized;
}

function sanitizeProviderMessage(message: string, apiKey: string) {
  return message
    .replaceAll(apiKey, "[REDACTED]")
    .replace(/AIza[A-Za-z0-9_-]{20,}/g, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function friendlyProviderError(httpStatus: number, provider: ProviderError, apiKey: string) {
  const providerStatus = provider.status || `HTTP_${httpStatus}`;
  const detail = sanitizeProviderMessage(provider.message || "", apiKey);

  if (httpStatus === 400) {
    return `Gemini menolak konfigurasi/request (${providerStatus}). ${detail || "Periksa model Gemini yang dipakai."}`;
  }
  if (httpStatus === 401) {
    return `Gemini menolak API key (${providerStatus}). Buat/copy ulang API key dari Google AI Studio lalu simpan sebagai GEMINI_API_KEY.`;
  }
  if (httpStatus === 403) {
    return `Gemini tidak mengizinkan API key ini (${providerStatus}). ${detail || "Periksa restriction/API access pada key di Google AI Studio."}`;
  }
  if (httpStatus === 404) {
    return `Model Gemini tidak tersedia (${providerStatus}). ${detail || "Coba model default OURJOURNAL."}`;
  }
  if (httpStatus === 429) {
    return `Kuota Gemini sedang penuh (${providerStatus}). Coba lagi sebentar.`;
  }

  return `Gemini error ${httpStatus} (${providerStatus}). ${detail || "Coba lagi sebentar."}`;
}

async function callGemini({
  apiKey,
  model,
  messages,
  pathname,
}: {
  apiKey: string;
  model: string;
  messages: GeminiMessage[];
  pathname: string;
}) {
  return fetch(
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
}

async function readProviderError(response: Response): Promise<ProviderError> {
  try {
    const body = await response.json();
    return {
      status: typeof body?.error?.status === "string" ? body.error.status : undefined,
      message: typeof body?.error?.message === "string" ? body.error.message : undefined,
    };
  } catch {
    return {};
  }
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
  const configuredModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  try {
    let model = configuredModel;
    let response = await callGemini({ apiKey, model, messages, pathname });

    if (response.status === 404 && model !== DEFAULT_MODEL) {
      model = DEFAULT_MODEL;
      response = await callGemini({ apiKey, model, messages, pathname });
    }

    if (response.status === 404 && model !== FALLBACK_MODEL) {
      model = FALLBACK_MODEL;
      response = await callGemini({ apiKey, model, messages, pathname });
    }

    if (!response.ok) {
      const providerError = await readProviderError(response);
      const safeError = friendlyProviderError(response.status, providerError, apiKey);
      console.error("Gemini API error", {
        httpStatus: response.status,
        providerStatus: providerError.status,
        model,
        message: sanitizeProviderMessage(providerError.message || "", apiKey),
      });

      return NextResponse.json(
        { error: safeError, providerStatus: providerError.status || null, model },
        { status: response.status === 429 ? 429 : 502 }
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

    return NextResponse.json({ answer, model });
  } catch (caught) {
    console.error("Gemini request failed", caught);
    return NextResponse.json(
      { error: "Koneksi ke Gemini gagal sebelum mendapat respons. Coba lagi sebentar." },
      { status: 502 }
    );
  }
}
