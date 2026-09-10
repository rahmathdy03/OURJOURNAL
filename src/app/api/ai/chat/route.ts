import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { monthRange, today } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 12000;
const MAX_APP_CONTEXT_CHARS = 9000;
const DEFAULT_MODEL = "gemini-3.6-flash";
const MODEL_CHOICES = ["gemini-3.6-flash", "gemini-3.1-flash-lite"] as const;

type SupportedModel = (typeof MODEL_CHOICES)[number];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const SYSTEM_PROMPT = `Kamu adalah OJ AI, study buddy di aplikasi pribadi OURJOURNAL.
Utamakan bantuan untuk kuliah dan skripsi: menjelaskan konsep, merangkum teks yang diberikan user, menyusun pertanyaan bimbingan, memecah revisi menjadi target, membuat soal latihan, membantu metodologi penelitian secara umum, dan merapikan rencana belajar.
Jawab dalam Bahasa Indonesia kecuali user meminta bahasa lain. Gaya ramah, ringkas, praktis, dan tidak menggurui.

OURJOURNAL akan mengirim APP_CONTEXT berisi metadata halaman aktif dan APP_DATA berisi ringkasan data privat milik user yang sedang login. Keduanya sengaja diberikan oleh aplikasi dan BOLEH kamu gunakan sebagai fakta.
Jika user bertanya "sekarang halaman apa?", "aku lagi di mana?", atau pertanyaan sejenis, jawab langsung berdasarkan APP_CONTEXT.
Jika user bertanya tentang tugas, jadwal, skripsi, stok, keuangan, belanja, atau notifikasi dan datanya tersedia di APP_DATA, jawab berdasarkan data tersebut. Sebut bahwa informasi itu berasal dari data OURJOURNAL bila membantu kejelasan.
Jangan mengatakan kamu tidak punya akses ke data OURJOURNAL jika data yang ditanyakan memang sudah ada di APP_DATA. Namun jangan mengaku melihat layar, membuka Google Drive, membaca file, atau mengetahui data yang tidak ada di APP_CONTEXT/APP_DATA/percakapan.
Jangan tampilkan ID internal, token, secret, API key, atau detail teknis autentikasi. Jika data tidak tersedia di APP_DATA, katakan singkat bahwa data tersebut belum diberikan ke AI.

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

function isSupportedModel(value: unknown): value is SupportedModel {
  return typeof value === "string" && MODEL_CHOICES.includes(value as SupportedModel);
}

function pageContext(pathname: string) {
  let pageName = "OURJOURNAL";
  let guidance = "Gunakan data aplikasi yang tersedia di APP_DATA tanpa mengarang detail yang tidak diberikan.";

  if (pathname.startsWith("/academic/thesis")) {
    pageName = "Workspace Skripsi";
    guidance = "Prioritaskan bantuan bimbingan, revisi, penelitian, referensi, target, administrasi, dan timeline.";
  } else if (pathname.startsWith("/academic")) {
    pageName = "Kuliah";
    guidance = "Prioritaskan mata kuliah, tugas, jadwal, sesi belajar, dan event akademik.";
  } else if (pathname.startsWith("/dashboard")) {
    pageName = "Dashboard";
    guidance = "Gunakan ringkasan lintas modul yang diberikan di APP_DATA untuk membantu menentukan hal yang perlu perhatian.";
  } else if (pathname.startsWith("/finance")) {
    pageName = "Keuangan";
    guidance = "Gunakan ringkasan pemasukan, pengeluaran, budget, dan transaksi yang diberikan di APP_DATA.";
  } else if (pathname.startsWith("/shopping")) {
    pageName = "Belanja";
    guidance = "Gunakan riwayat belanja dan wishlist yang diberikan di APP_DATA.";
  } else if (pathname.startsWith("/kebab")) {
    pageName = "Kebab";
    guidance = "Gunakan stok, produksi, expired, dan waste yang diberikan di APP_DATA untuk membantu operasional.";
  } else if (pathname.startsWith("/notifications")) {
    pageName = "Notifikasi";
    guidance = "Gunakan notifikasi dan peringatan aktif yang diberikan di APP_DATA.";
  } else if (pathname.startsWith("/reports")) {
    pageName = "Laporan";
    guidance = "Gunakan hanya data ringkasan yang tersedia di APP_DATA.";
  } else if (pathname.startsWith("/settings")) {
    pageName = "Pengaturan";
    guidance = "Ini halaman pengaturan OURJOURNAL.";
  }

  return `APP_CONTEXT (metadata aplikasi yang diberikan OURJOURNAL):\n- Halaman aktif: ${pageName}\n- Path: ${pathname || "/"}\n- Catatan: ${guidance}`;
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

function compactData(label: string, data: unknown) {
  const text = JSON.stringify(data, null, 0);
  const clipped = text.length > MAX_APP_CONTEXT_CHARS ? `${text.slice(0, MAX_APP_CONTEXT_CHARS)}…` : text;
  return `APP_DATA (${label}; data privat user yang sedang login):\n${clipped}`;
}

async function thesisData(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const [workspace, supervisions, tasks, research, references, files, admin, milestones] = await Promise.all([
    supabase.from("thesis_workspaces").select("title,supervisor,co_supervisor,current_stage,progress,target_graduation").maybeSingle(),
    supabase.from("thesis_supervisions").select("scheduled_at,lecturer,mode,location,topic,notes,revision,status").gte("scheduled_at", now).neq("status", "cancelled").order("scheduled_at").limit(4),
    supabase.from("thesis_tasks").select("title,details,due_at,priority,focus_minutes,is_done").eq("is_done", false).order("due_at", { ascending: true, nullsFirst: false }).limit(10),
    supabase.from("thesis_research_steps").select("title,description,target_date,status,position").order("position").limit(20),
    supabase.from("thesis_references").select("title,authors,publication_year,journal,tags,notes,is_read").order("created_at", { ascending: false }).limit(6),
    supabase.from("thesis_files").select("file_name,version_label,category,status,file_size_text,notes,document_date").order("document_date", { ascending: false }).limit(6),
    supabase.from("thesis_admin_items").select("phase,title,due_date,notes,is_done,position").eq("is_done", false).order("due_date", { ascending: true, nullsFirst: false }).limit(10),
    supabase.from("thesis_milestones").select("title,target_date,completed_at,is_done,position").order("position").limit(12),
  ]);

  return compactData("Workspace Skripsi", {
    workspace: workspace.data ?? null,
    upcoming_supervisions: supervisions.data ?? [],
    active_tasks: tasks.data ?? [],
    research_steps: research.data ?? [],
    recent_references: references.data ?? [],
    recent_files: files.data ?? [],
    open_admin_items: admin.data ?? [],
    milestones: milestones.data ?? [],
  });
}

async function academicData(supabase: SupabaseClient) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [courses, assignments, schedules, sessions, events] = await Promise.all([
    supabase.from("academic_courses").select("code,name,lecturer,semester,credits").order("name").limit(20),
    supabase.from("academic_assignments").select("title,description,due_date,priority,progress,is_done,academic_courses(name)").eq("is_done", false).order("due_date").limit(12),
    supabase.from("academic_schedules").select("weekday,start_time,end_time,room,meeting_url,academic_courses(name)").order("weekday").order("start_time").limit(30),
    supabase.from("academic_study_sessions").select("duration_minutes,completed_at").gte("completed_at", sevenDaysAgo).limit(40),
    supabase.from("academic_events").select("title,starts_at,event_type").gte("starts_at", new Date().toISOString()).order("starts_at").limit(8),
  ]);

  const studyMinutes = (sessions.data ?? []).reduce((sum: number, row: any) => sum + Number(row.duration_minutes || 0), 0);
  return compactData("Kuliah", {
    courses: courses.data ?? [],
    active_assignments: assignments.data ?? [],
    weekly_schedules: schedules.data ?? [],
    upcoming_events: events.data ?? [],
    study_minutes_last_7_days: studyMinutes,
  });
}

async function financeData(supabase: SupabaseClient) {
  const { start, end } = monthRange();
  const [monthTransactions, budgets, recent, recurring] = await Promise.all([
    supabase.from("finance_transactions").select("kind,amount,category").gte("transaction_date", start).lt("transaction_date", end).limit(300),
    supabase.from("finance_budgets").select("category,amount").eq("month", start).order("category"),
    supabase.from("finance_transactions").select("kind,amount,category,description,payment_method,transaction_date").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(10),
    supabase.from("finance_recurring").select("kind,title,category,amount,day_of_month,active").eq("active", true).order("day_of_month").limit(12),
  ]);

  const rows = monthTransactions.data ?? [];
  const income = rows.filter((row: any) => row.kind === "income").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const expense = rows.filter((row: any) => row.kind === "expense").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const budgetRows = budgets.data ?? [];
  const budget = Number(budgetRows.find((row: any) => row.category === "Total")?.amount ?? budgetRows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0));

  return compactData("Keuangan", {
    month: start.slice(0, 7),
    income,
    expense,
    balance: income - expense,
    budget,
    budget_remaining: Math.max(budget - expense, 0),
    budgets: budgetRows,
    recent_transactions: recent.data ?? [],
    active_recurring: recurring.data ?? [],
  });
}

async function shoppingData(supabase: SupabaseClient) {
  const { start, end } = monthRange();
  const [monthEntries, recent, wishlist] = await Promise.all([
    supabase.from("shopping_entries").select("total_amount").gte("purchased_at", start).lt("purchased_at", end).limit(300),
    supabase.from("shopping_entries").select("item_name,category,quantity,unit,total_amount,store_name,notes,purchased_at").order("purchased_at", { ascending: false }).order("created_at", { ascending: false }).limit(10),
    supabase.from("shopping_wishlist").select("item_name,category,estimated_amount,priority,notes,is_done,created_at").eq("is_done", false).order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(12),
  ]);

  const monthRows = monthEntries.data ?? [];
  return compactData("Belanja", {
    month: start.slice(0, 7),
    month_total: monthRows.reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0),
    month_item_count: monthRows.length,
    recent_purchases: recent.data ?? [],
    active_wishlist: wishlist.data ?? [],
  });
}

async function kebabData(supabase: SupabaseClient) {
  const todayValue = today();
  const sevenDays = new Date(Date.now() + 7 * 86400000);
  const [ingredients, productions, waste] = await Promise.all([
    supabase.from("kebab_ingredients").select("name,unit,stock_quantity,low_stock_threshold,expires_at,last_unit_cost").order("name").limit(80),
    supabase.from("kebab_productions").select("quantity,production_date,kebab_recipes(name)").eq("production_date", todayValue).limit(50),
    supabase.from("kebab_waste").select("quantity,waste_date,kebab_ingredients(name,unit)").order("waste_date", { ascending: false }).limit(8),
  ]);

  const ingredientRows = ingredients.data ?? [];
  const lowStock = ingredientRows.filter((row: any) => Number(row.stock_quantity) <= Number(row.low_stock_threshold));
  const expiring = ingredientRows.filter((row: any) => row.expires_at && new Date(`${row.expires_at}T23:59:59`) <= sevenDays);
  const productionRows = productions.data ?? [];

  return compactData("Kebab Finka", {
    production_today_pcs: productionRows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0),
    production_today: productionRows,
    low_stock: lowStock,
    expiring_within_7_days: expiring,
    ingredient_count: ingredientRows.length,
    recent_waste: waste.data ?? [],
  });
}

async function notificationsData(supabase: SupabaseClient) {
  const [stored, assignments, ingredients] = await Promise.all([
    supabase.from("notifications").select("title,message,kind,is_read,created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("academic_assignments").select("title,due_date,priority").eq("is_done", false).gte("due_date", today()).order("due_date").limit(8),
    supabase.from("kebab_ingredients").select("name,unit,stock_quantity,low_stock_threshold,expires_at").order("name").limit(80),
  ]);

  const ingredientRows = ingredients.data ?? [];
  return compactData("Notifikasi", {
    recent_notifications: stored.data ?? [],
    upcoming_assignment_deadlines: assignments.data ?? [],
    low_stock: ingredientRows.filter((row: any) => Number(row.stock_quantity) <= Number(row.low_stock_threshold)),
  });
}

async function dashboardData(supabase: SupabaseClient) {
  const { start, end } = monthRange();
  const now = new Date().toISOString();
  const [finance, shopping, assignments, events, ingredients, productions, thesisTasks] = await Promise.all([
    supabase.from("finance_transactions").select("kind,amount").gte("transaction_date", start).lt("transaction_date", end).limit(300),
    supabase.from("shopping_entries").select("total_amount").gte("purchased_at", start).lt("purchased_at", end).limit(300),
    supabase.from("academic_assignments").select("title,due_date,priority").eq("is_done", false).gte("due_date", today()).order("due_date").limit(6),
    supabase.from("academic_events").select("title,starts_at,event_type").gte("starts_at", now).order("starts_at").limit(5),
    supabase.from("kebab_ingredients").select("name,unit,stock_quantity,low_stock_threshold,expires_at").order("name").limit(80),
    supabase.from("kebab_productions").select("quantity").eq("production_date", today()).limit(50),
    supabase.from("thesis_tasks").select("title,due_at,priority").eq("is_done", false).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
  ]);

  const financeRows = finance.data ?? [];
  const income = financeRows.filter((row: any) => row.kind === "income").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const expense = financeRows.filter((row: any) => row.kind === "expense").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const ingredientRows = ingredients.data ?? [];

  return compactData("Dashboard", {
    month_income: income,
    month_expense: expense,
    month_shopping: (shopping.data ?? []).reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0),
    active_assignments: assignments.data ?? [],
    upcoming_academic_events: events.data ?? [],
    active_thesis_tasks: thesisTasks.data ?? [],
    kebab_low_stock: ingredientRows.filter((row: any) => Number(row.stock_quantity) <= Number(row.low_stock_threshold)),
    kebab_production_today_pcs: (productions.data ?? []).reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0),
  });
}

async function buildAppDataContext(supabase: SupabaseClient, pathname: string) {
  try {
    if (pathname.startsWith("/academic/thesis")) return await thesisData(supabase);
    if (pathname.startsWith("/academic")) return await academicData(supabase);
    if (pathname.startsWith("/finance")) return await financeData(supabase);
    if (pathname.startsWith("/shopping")) return await shoppingData(supabase);
    if (pathname.startsWith("/kebab")) return await kebabData(supabase);
    if (pathname.startsWith("/notifications")) return await notificationsData(supabase);
    if (pathname.startsWith("/dashboard") || pathname === "/") return await dashboardData(supabase);
    return "APP_DATA: Tidak ada ringkasan data khusus yang dikirim untuk halaman ini.";
  } catch (caught) {
    console.error("OJ AI app context failed", caught);
    return "APP_DATA: Ringkasan data aplikasi sedang tidak tersedia. Jangan mengarang data.";
  }
}

function sanitizeProviderMessage(message: string, apiKey: string) {
  return message
    .replaceAll(apiKey, "[REDACTED]")
    .replace(/AIza[A-Za-z0-9_-]{20,}/g, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function friendlyProviderError(
  httpStatus: number,
  provider: ProviderError,
  apiKey: string,
  model: string
) {
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
    return `Model Gemini tidak tersedia (${providerStatus}). ${detail || "Pilih model Gemini lain di OJ AI."}`;
  }
  if (httpStatus === 429) {
    return `Kuota ${model} sedang penuh (${providerStatus}). Coba pilih model lain di OJ AI atau tunggu kuotanya reset.`;
  }

  return `Gemini error ${httpStatus} (${providerStatus}). ${detail || "Coba lagi sebentar."}`;
}

async function callGemini({
  apiKey,
  model,
  messages,
  pathname,
  appData,
}: {
  apiKey: string;
  model: string;
  messages: GeminiMessage[];
  pathname: string;
  appData: string;
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
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${pageContext(pathname)}\n\n${appData}` }],
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

  let body: { messages?: IncomingMessage[]; pathname?: unknown; model?: unknown };
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
  const envModel = process.env.GEMINI_MODEL?.trim();
  const selectedModel: SupportedModel = isSupportedModel(body.model)
    ? body.model
    : isSupportedModel(envModel)
      ? envModel
      : DEFAULT_MODEL;

  const appData = await buildAppDataContext(supabase, pathname);

  try {
    let model: SupportedModel = selectedModel;
    let response = await callGemini({ apiKey, model, messages, pathname, appData });

    if (response.status === 404) {
      const alternate = MODEL_CHOICES.find((choice) => choice !== model);
      if (alternate) {
        model = alternate;
        response = await callGemini({ apiKey, model, messages, pathname, appData });
      }
    }

    if (!response.ok) {
      const providerError = await readProviderError(response);
      const safeError = friendlyProviderError(response.status, providerError, apiKey, model);
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
