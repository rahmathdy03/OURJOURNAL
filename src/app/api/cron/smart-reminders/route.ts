import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWebPush,
  WebPushError,
  type PushSubscriptionPayload,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const DAY_MS = 86_400_000;

type AdminClient = ReturnType<typeof createAdminClient>;

type SmartReminder = {
  kind: string;
  title: string;
  message: string;
  url: string;
};

function jakartaDate(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(typeof value === "string" ? new Date(value) : value);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function dayDifference(date: string, today: string) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS
  );
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function dueCandidate(input: {
  source: string;
  id: string;
  label: string;
  name: string;
  date: string | null | undefined;
  today: string;
  url: string;
}) {
  if (!input.date) return null;
  const days = dayDifference(input.date, input.today);

  if (days === 1) {
    return {
      kind: `smart:${input.source}:${input.id}:h1:${input.date}`,
      title: `Besok · ${input.name}`,
      message: `${input.label} “${input.name}” jatuh tempo besok, ${readableDate(
        input.date
      )}.`,
      url: input.url,
    } satisfies SmartReminder;
  }

  if (days === -7) {
    return {
      kind: `smart:${input.source}:${input.id}:late7:${input.date}`,
      title: `Sudah lewat 7 hari · ${input.name}`,
      message: `${input.label} “${input.name}” masih belum selesai 7 hari setelah ${readableDate(
        input.date
      )}.`,
      url: input.url,
    } satisfies SmartReminder;
  }

  return null;
}

function shouldDeleteSubscription(error: unknown) {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 ||
      error.statusCode === 410 ||
      (error.statusCode === 400 &&
        error.message.includes("VapidPkHashMismatch")))
  );
}

async function pushToUser(
  admin: AdminClient,
  userId: string,
  payload: { title: string; body: string; url: string; tag: string }
) {
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);

  let sent = 0;

  for (const row of subscriptions ?? []) {
    const subscription: PushSubscriptionPayload = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };

    try {
      await sendWebPush(subscription, payload);
      sent += 1;
    } catch (error) {
      if (shouldDeleteSubscription(error)) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      } else {
        console.error("Smart reminder push gagal", userId, error);
      }
    }
  }

  return sent;
}

async function collectAcademic(
  admin: AdminClient,
  userId: string,
  today: string
) {
  const reminders: SmartReminder[] = [];
  const tomorrowStart = new Date(
    `${addDays(today, 1)}T00:00:00+07:00`
  ).toISOString();
  const dayAfterTomorrowStart = new Date(
    `${addDays(today, 2)}T00:00:00+07:00`
  ).toISOString();

  const events = await admin
    .from("academic_events")
    .select("id,title,event_type,starts_at")
    .eq("user_id", userId)
    .gte("starts_at", tomorrowStart)
    .lt("starts_at", dayAfterTomorrowStart)
    .limit(100);

  for (const row of events.data ?? []) {
    const date = jakartaDate(String(row.starts_at));
    const label =
      row.event_type === "exam"
        ? "Ujian"
        : row.event_type === "presentation"
          ? "Presentasi"
          : row.event_type === "practicum"
            ? "Praktikum"
            : "Agenda kuliah";
    const candidate = dueCandidate({
      source: "academic_event",
      id: String(row.id),
      label,
      name: String(row.title),
      date,
      today,
      url: "/academic",
    });
    if (candidate) reminders.push(candidate);
  }

  return reminders;
}

async function collectThesis(
  admin: AdminClient,
  userId: string,
  today: string
) {
  const reminders: SmartReminder[] = [];

  const [tasks, adminItems, milestones, research, supervisions] =
    await Promise.all([
      admin
        .from("thesis_tasks")
        .select("id,title,due_at")
        .eq("user_id", userId)
        .eq("is_done", false)
        .not("due_at", "is", null)
        .limit(200),
      admin
        .from("thesis_admin_items")
        .select("id,title,due_date")
        .eq("user_id", userId)
        .eq("is_done", false)
        .not("due_date", "is", null)
        .limit(200),
      admin
        .from("thesis_milestones")
        .select("id,title,target_date")
        .eq("user_id", userId)
        .eq("is_done", false)
        .not("target_date", "is", null)
        .limit(200),
      admin
        .from("thesis_research_steps")
        .select("id,title,target_date,status")
        .eq("user_id", userId)
        .neq("status", "done")
        .not("target_date", "is", null)
        .limit(200),
      admin
        .from("thesis_supervisions")
        .select("id,topic,scheduled_at,status")
        .eq("user_id", userId)
        .eq("status", "upcoming")
        .limit(100),
    ]);

  const sources = [
    ...(tasks.data ?? []).map((row: any) => ({
      source: "thesis_task",
      id: String(row.id),
      label: "Target/revisi skripsi",
      name: String(row.title),
      date: jakartaDate(String(row.due_at)),
    })),
    ...(adminItems.data ?? []).map((row: any) => ({
      source: "thesis_admin",
      id: String(row.id),
      label: "Administrasi skripsi",
      name: String(row.title),
      date: String(row.due_date),
    })),
    ...(milestones.data ?? []).map((row: any) => ({
      source: "thesis_milestone",
      id: String(row.id),
      label: "Milestone skripsi",
      name: String(row.title),
      date: String(row.target_date),
    })),
    ...(research.data ?? []).map((row: any) => ({
      source: "thesis_research",
      id: String(row.id),
      label: "Target penelitian",
      name: String(row.title),
      date: String(row.target_date),
    })),
    ...(supervisions.data ?? []).map((row: any) => ({
      source: "thesis_supervision",
      id: String(row.id),
      label: "Jadwal bimbingan",
      name: String(row.topic || "Bimbingan skripsi"),
      date: jakartaDate(String(row.scheduled_at)),
    })),
  ];

  for (const source of sources) {
    const candidate = dueCandidate({
      ...source,
      today,
      url: "/academic/thesis",
    });
    if (candidate) reminders.push(candidate);
  }

  return reminders;
}

async function collectFinance(
  admin: AdminClient,
  userId: string,
  today: string
) {
  const reminders: SmartReminder[] = [];
  const month = today.slice(0, 7);
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1))
    .toISOString()
    .slice(0, 10);

  const [recurring, posted, transactions, budgets] = await Promise.all([
    admin
      .from("finance_recurring")
      .select("id,kind,title,day_of_month")
      .eq("user_id", userId)
      .eq("active", true)
      .limit(200),
    admin
      .from("finance_transactions")
      .select("description")
      .eq("user_id", userId)
      .eq("payment_method", "Rutin")
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth)
      .limit(300),
    admin
      .from("finance_transactions")
      .select("kind,amount")
      .eq("user_id", userId)
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth)
      .limit(1000),
    admin
      .from("finance_budgets")
      .select("category,amount")
      .eq("user_id", userId)
      .eq("month", monthStart)
      .limit(200),
  ]);

  const postedTitles = new Set(
    (posted.data ?? [])
      .map((row: any) => String(row.description || "").trim().toLowerCase())
      .filter(Boolean)
  );

  for (const row of recurring.data ?? []) {
    const name = String(row.title || "Transaksi rutin");
    if (postedTitles.has(name.trim().toLowerCase())) continue;

    const date = `${month}-${String(Number(row.day_of_month || 1)).padStart(
      2,
      "0"
    )}`;
    const candidate = dueCandidate({
      source: "finance_recurring",
      id: String(row.id),
      label:
        row.kind === "income" ? "Pemasukan rutin" : "Tagihan/pengeluaran rutin",
      name,
      date,
      today,
      url: "/finance",
    });
    if (candidate) reminders.push(candidate);
  }

  const expense = (transactions.data ?? [])
    .filter((row: any) => row.kind === "expense")
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const budgetRows = budgets.data ?? [];
  const budget = Number(
    budgetRows.find((row: any) => row.category === "Total")?.amount ??
      budgetRows.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      )
  );

  if (budget > 0) {
    const ratio = expense / budget;
    const threshold = ratio >= 1 ? 100 : ratio >= 0.8 ? 80 : 0;

    if (threshold) {
      reminders.push({
        kind: `smart:finance_budget:${month}:${threshold}`,
        title:
          threshold === 100
            ? "Budget bulan ini terlampaui"
            : "Budget bulan ini sudah 80%",
        message: `${Math.round(
          ratio * 100
        )}% budget terpakai · pengeluaran ${new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(expense)} dari ${new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(budget)}.`,
        url: "/finance",
      });
    }
  }

  return reminders;
}

async function collectKebab(
  admin: AdminClient,
  userId: string,
  today: string
) {
  const reminders: SmartReminder[] = [];
  const result = await admin
    .from("kebab_ingredients")
    .select("id,name,expires_at")
    .eq("user_id", userId)
    .not("expires_at", "is", null)
    .limit(300);

  for (const row of result.data ?? []) {
    const candidate = dueCandidate({
      source: "kebab_expiry",
      id: String(row.id),
      label: "Masa simpan bahan kebab",
      name: String(row.name),
      date: String(row.expires_at),
      today,
      url: "/kebab-finka",
    });
    if (candidate) reminders.push(candidate);
  }

  return reminders;
}

async function processUser(
  admin: AdminClient,
  userId: string,
  modules: Set<string>,
  today: string,
  pushConfigured: boolean
) {
  const groups = await Promise.all([
    modules.has("academic")
      ? collectAcademic(admin, userId, today)
      : Promise.resolve([]),
    modules.has("academic")
      ? collectThesis(admin, userId, today)
      : Promise.resolve([]),
    modules.has("finance")
      ? collectFinance(admin, userId, today)
      : Promise.resolve([]),
    modules.has("kebab")
      ? collectKebab(admin, userId, today)
      : Promise.resolve([]),
  ]);

  const candidates = groups.flat();
  if (!candidates.length) {
    return { found: 0, created: 0, pushed: 0 };
  }

  const since = new Date(Date.now() - 62 * DAY_MS).toISOString();
  const existingResult = await admin
    .from("notifications")
    .select("kind")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(1000);
  const existing = new Set(
    (existingResult.data ?? []).map((row: any) => String(row.kind))
  );
  const fresh = candidates.filter((reminder) => !existing.has(reminder.kind));

  if (!fresh.length) {
    return { found: candidates.length, created: 0, pushed: 0 };
  }

  const { error } = await admin.from("notifications").insert(
    fresh.map((reminder) => ({
      user_id: userId,
      title: reminder.title,
      message: reminder.message,
      kind: reminder.kind,
      is_read: false,
    }))
  );

  if (error) {
    console.error("Gagal menyimpan smart reminder", userId, error);
    return { found: candidates.length, created: 0, pushed: 0 };
  }

  let pushed = 0;
  if (pushConfigured) {
    const first = fresh[0];
    pushed = await pushToUser(admin, userId, {
      title:
        fresh.length === 1
          ? first.title
          : `${fresh.length} pengingat pintar`,
      body:
        fresh.length === 1
          ? first.message
          : `${first.title} · +${fresh.length - 1} lainnya`,
      url: first.url,
      tag: `smart-${today}-${userId}`,
    });
  }

  return {
    found: candidates.length,
    created: fresh.length,
    pushed,
  };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = jakartaDate();
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );

  const [profiles, moduleRows] = await Promise.all([
    admin.from("profiles").select("id").limit(1000),
    admin
      .from("user_modules")
      .select("user_id,module_key")
      .eq("enabled", true)
      .limit(5000),
  ]);

  if (profiles.error) {
    return NextResponse.json(
      { error: profiles.error.message },
      { status: 500 }
    );
  }

  const modulesByUser = new Map<string, Set<string>>();
  for (const row of moduleRows.data ?? []) {
    const userId = String(row.user_id);
    const set = modulesByUser.get(userId) ?? new Set<string>();
    set.add(String(row.module_key));
    modulesByUser.set(userId, set);
  }

  let found = 0;
  let created = 0;
  let pushed = 0;

  for (const profile of profiles.data ?? []) {
    const userId = String(profile.id);
    try {
      const result = await processUser(
        admin,
        userId,
        modulesByUser.get(userId) ?? new Set<string>(),
        today,
        pushConfigured
      );
      found += result.found;
      created += result.created;
      pushed += result.pushed;
    } catch (error) {
      console.error("Smart reminder user gagal", userId, error);
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    usersChecked: profiles.data?.length ?? 0,
    remindersFound: found,
    remindersCreated: created,
    pushesSent: pushed,
    pushConfigured,
  });
}
