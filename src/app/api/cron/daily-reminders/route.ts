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

type ReminderStage = "h2" | "h1" | "due" | "p1" | "p2" | "overdue";

type Reminder = {
  source: string;
  sourceId: string;
  name: string;
  sourceLabel: string;
  dueDate: string;
  stage: ReminderStage;
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
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dayDifference(dueDate: string, today: string) {
  return Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS
  );
}

function stageForDate(dueDate: string | null | undefined, today: string, allowOverdue = true) {
  if (!dueDate) return null;
  const days = dayDifference(dueDate, today);
  if (days === 2) return "h2" as const;
  if (days === 0) return "due" as const;
  if (days < 0 && allowOverdue) return "overdue" as const;
  return null;
}

function stageForAssignmentDate(dueDate: string | null | undefined, today: string) {
  if (!dueDate) return null;
  const days = dayDifference(dueDate, today);
  if (days === 2) return "h2" as const;
  if (days === 1) return "h1" as const;
  if (days === 0) return "due" as const;
  if (days === -1) return "p1" as const;
  if (days === -2) return "p2" as const;
  return null;
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function reminderTitle(reminder: Reminder, today: string) {
  if (reminder.stage === "h2") return `2 hari lagi · ${reminder.name}`;
  if (reminder.stage === "h1") return `Besok jatuh tempo · ${reminder.name}`;
  if (reminder.stage === "due") return `Jatuh tempo hari ini · ${reminder.name}`;
  if (reminder.stage === "p1") return `Lewat tempo 1 hari · ${reminder.name}`;
  if (reminder.stage === "p2") return `Lewat tempo 2 hari · ${reminder.name}`;
  const daysLate = Math.abs(dayDifference(reminder.dueDate, today));
  return `Lewat tempo ${daysLate} hari · ${reminder.name}`;
}

function reminderMessage(reminder: Reminder, today: string) {
  const date = readableDate(reminder.dueDate);
  if (reminder.stage === "h2") {
    return `${reminder.sourceLabel} “${reminder.name}” jatuh tempo 2 hari lagi, ${date}.`;
  }
  if (reminder.stage === "h1") {
    return `${reminder.sourceLabel} “${reminder.name}” jatuh tempo besok, ${date}.`;
  }
  if (reminder.stage === "due") {
    return `${reminder.sourceLabel} “${reminder.name}” jatuh tempo hari ini, ${date}.`;
  }
  if (reminder.stage === "p1") {
    return `${reminder.sourceLabel} “${reminder.name}” sudah lewat tempo 1 hari sejak ${date}.`;
  }
  if (reminder.stage === "p2") {
    return `${reminder.sourceLabel} “${reminder.name}” sudah lewat tempo 2 hari sejak ${date}.`;
  }
  const daysLate = Math.abs(dayDifference(reminder.dueDate, today));
  return `${reminder.sourceLabel} “${reminder.name}” sudah lewat tempo ${daysLate} hari sejak ${date}.`;
}

function reminderKind(reminder: Reminder) {
  return `deadline:${reminder.source}:${reminder.sourceId}:${reminder.stage}`;
}

function shouldDeleteSubscription(error: unknown) {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 ||
      error.statusCode === 410 ||
      (error.statusCode === 400 && error.message.includes("VapidPkHashMismatch")))
  );
}

async function pushToUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  payload: { title: string; body: string; url: string; tag: string; icon?: string }
) {
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);

  if (error) {
    console.error("Gagal membaca push subscription", userId, error);
    return 0;
  }

  let sent = 0;
  for (const row of subscriptions ?? []) {
    const subscription: PushSubscriptionPayload = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };

    try {
      await sendWebPush(subscription, payload);
      sent += 1;
    } catch (caught) {
      if (shouldDeleteSubscription(caught)) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
        continue;
      }
      console.error("Gagal mengirim push reminder", userId, caught);
    }
  }

  return sent;
}

function addReminder(
  reminders: Reminder[],
  input: Omit<Reminder, "stage">,
  today: string,
  allowOverdue = true
) {
  const stage = stageForDate(input.dueDate, today, allowOverdue);
  if (!stage) return;
  reminders.push({ ...input, stage });
}

async function collectAcademicReminders(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  today: string
) {
  const reminders: Reminder[] = [];
  const todayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
  const threeDaysStart = new Date(`${addDays(today, 3)}T00:00:00+07:00`).toISOString();

  const [assignments, events] = await Promise.all([
    admin
      .from("academic_assignments")
      .select("id,title,due_date")
      .eq("user_id", userId)
      .eq("is_done", false)
      .order("due_date")
      .limit(200),
    admin
      .from("academic_events")
      .select("id,title,event_type,starts_at")
      .eq("user_id", userId)
      .gte("starts_at", todayStart)
      .lt("starts_at", threeDaysStart)
      .order("starts_at")
      .limit(100),
  ]);

  if (assignments.error) console.error("Reminder academic_assignments", userId, assignments.error);
  for (const row of assignments.data ?? []) {
    const dueDate = String(row.due_date);
    const stage = stageForAssignmentDate(dueDate, today);
    if (!stage) continue;
    reminders.push({
      source: "academic_assignment",
      sourceId: String(row.id),
      name: String(row.title),
      sourceLabel: "Tugas kuliah",
      dueDate,
      stage,
      url: "/academic",
    });
  }

  if (events.error) console.error("Reminder academic_events", userId, events.error);
  for (const row of events.data ?? []) {
    const dueDate = jakartaDate(String(row.starts_at));
    const eventLabel = row.event_type === "exam" ? "Ujian" : row.event_type === "presentation" ? "Presentasi" : row.event_type === "practicum" ? "Praktikum" : row.event_type === "deadline" ? "Deadline akademik" : "Agenda kuliah";
    addReminder(
      reminders,
      {
        source: "academic_event",
        sourceId: String(row.id),
        name: String(row.title),
        sourceLabel: eventLabel,
        dueDate,
        url: "/academic",
      },
      today,
      false
    );
  }

  return reminders;
}

async function collectThesisReminders(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  today: string
) {
  const reminders: Reminder[] = [];
  const [tasks, adminItems, milestones, research, supervisions, workspace] = await Promise.all([
    admin.from("thesis_tasks").select("id,title,due_at").eq("user_id", userId).eq("is_done", false).not("due_at", "is", null).limit(200),
    admin.from("thesis_admin_items").select("id,title,due_date").eq("user_id", userId).eq("is_done", false).not("due_date", "is", null).limit(200),
    admin.from("thesis_milestones").select("id,title,target_date").eq("user_id", userId).eq("is_done", false).not("target_date", "is", null).limit(200),
    admin.from("thesis_research_steps").select("id,title,target_date,status").eq("user_id", userId).neq("status", "done").not("target_date", "is", null).limit(200),
    admin.from("thesis_supervisions").select("id,topic,scheduled_at,status").eq("user_id", userId).eq("status", "upcoming").limit(100),
    admin.from("thesis_workspaces").select("user_id,target_graduation").eq("user_id", userId).maybeSingle(),
  ]);

  const queryErrors = [tasks.error, adminItems.error, milestones.error, research.error, supervisions.error, workspace.error].filter(Boolean);
  if (queryErrors.length) console.error("Sebagian data skripsi gagal dibaca untuk reminder", userId, queryErrors);

  for (const row of tasks.data ?? []) {
    addReminder(reminders, { source: "thesis_task", sourceId: String(row.id), name: String(row.title), sourceLabel: "Target/revisi skripsi", dueDate: jakartaDate(String(row.due_at)), url: "/academic/thesis" }, today);
  }
  for (const row of adminItems.data ?? []) {
    addReminder(reminders, { source: "thesis_admin", sourceId: String(row.id), name: String(row.title), sourceLabel: "Administrasi skripsi", dueDate: String(row.due_date), url: "/academic/thesis" }, today);
  }
  for (const row of milestones.data ?? []) {
    addReminder(reminders, { source: "thesis_milestone", sourceId: String(row.id), name: String(row.title), sourceLabel: "Milestone skripsi", dueDate: String(row.target_date), url: "/academic/thesis" }, today);
  }
  for (const row of research.data ?? []) {
    addReminder(reminders, { source: "thesis_research", sourceId: String(row.id), name: String(row.title), sourceLabel: "Target penelitian", dueDate: String(row.target_date), url: "/academic/thesis" }, today);
  }
  for (const row of supervisions.data ?? []) {
    addReminder(reminders, { source: "thesis_supervision", sourceId: String(row.id), name: String(row.topic || "Bimbingan skripsi"), sourceLabel: "Jadwal bimbingan", dueDate: jakartaDate(String(row.scheduled_at)), url: "/academic/thesis" }, today);
  }
  if (workspace.data?.target_graduation) {
    addReminder(reminders, { source: "thesis_graduation", sourceId: String(workspace.data.user_id), name: "Target kelulusan", sourceLabel: "Target kelulusan skripsi", dueDate: String(workspace.data.target_graduation), url: "/academic/thesis" }, today, false);
  }

  return reminders;
}

async function collectFinanceReminders(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  today: string
) {
  const reminders: Reminder[] = [];
  const monthStart = `${today.slice(0, 7)}-01`;
  const [recurring, posted] = await Promise.all([
    admin.from("finance_recurring").select("id,kind,title,day_of_month,active").eq("user_id", userId).eq("active", true).limit(200),
    admin.from("finance_transactions").select("description,payment_method,transaction_date").eq("user_id", userId).eq("payment_method", "Rutin").gte("transaction_date", monthStart).lte("transaction_date", today).limit(300),
  ]);

  if (recurring.error) console.error("Reminder finance_recurring", userId, recurring.error);
  if (posted.error) console.error("Reminder finance_transactions", userId, posted.error);

  const postedTitles = new Set((posted.data ?? []).map((row: any) => String(row.description || "").trim().toLowerCase()).filter(Boolean));
  const month = today.slice(0, 7);

  for (const row of recurring.data ?? []) {
    const title = String(row.title || "Transaksi rutin");
    if (postedTitles.has(title.trim().toLowerCase())) continue;
    const dueDate = `${month}-${String(Number(row.day_of_month || 1)).padStart(2, "0")}`;
    addReminder(
      reminders,
      {
        source: "finance_recurring",
        sourceId: String(row.id),
        name: title,
        sourceLabel: row.kind === "income" ? "Pemasukan rutin" : "Tagihan/pengeluaran rutin",
        dueDate,
        url: "/finance",
      },
      today
    );
  }

  return reminders;
}

async function collectKebabReminders(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  today: string
) {
  const reminders: Reminder[] = [];
  const ingredients = await admin
    .from("kebab_ingredients")
    .select("id,name,expires_at")
    .eq("user_id", userId)
    .not("expires_at", "is", null)
    .limit(300);

  if (ingredients.error) console.error("Reminder kebab_ingredients", userId, ingredients.error);
  for (const row of ingredients.data ?? []) {
    addReminder(
      reminders,
      {
        source: "kebab_expiry",
        sourceId: String(row.id),
        name: String(row.name),
        sourceLabel: "Masa simpan bahan kebab",
        dueDate: String(row.expires_at),
        url: "/kebab-finka",
      },
      today
    );
  }
  return reminders;
}

async function processUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  modules: Set<string>,
  today: string,
  weekday: string,
  pushConfigured: boolean
) {
  const reminderGroups = await Promise.all([
    modules.has("academic") ? collectAcademicReminders(admin, userId, today) : Promise.resolve([]),
    modules.has("academic") ? collectThesisReminders(admin, userId, today) : Promise.resolve([]),
    modules.has("finance") ? collectFinanceReminders(admin, userId, today) : Promise.resolve([]),
    modules.has("kebab") ? collectKebabReminders(admin, userId, today) : Promise.resolve([]),
  ]);
  const reminders = reminderGroups.flat();

  const todayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
  const tomorrowStart = new Date(`${addDays(today, 1)}T00:00:00+07:00`).toISOString();
  const existing = await admin
    .from("notifications")
    .select("kind")
    .eq("user_id", userId)
    .gte("created_at", todayStart)
    .lt("created_at", tomorrowStart)
    .limit(1000);

  if (existing.error) console.error("Gagal membaca dedupe reminder", userId, existing.error);
  const existingKinds = new Set((existing.data ?? []).map((row: any) => String(row.kind)));
  const fresh = reminders.filter((reminder) => !existingKinds.has(reminderKind(reminder)));

  if (fresh.length) {
    const { error: insertError } = await admin.from("notifications").insert(
      fresh.map((reminder) => ({
        user_id: userId,
        title: reminderTitle(reminder, today),
        message: reminderMessage(reminder, today),
        kind: reminderKind(reminder),
        is_read: false,
      }))
    );

    if (insertError) {
      console.error("Gagal menyimpan daily reminder", userId, insertError);
    } else if (pushConfigured) {
      const first = fresh[0];
      const body = fresh.length === 1
        ? reminderMessage(first, today)
        : `${fresh.length} pengingat perlu diperhatikan. ${reminderTitle(first, today)}${fresh.length > 1 ? ` · +${fresh.length - 1} lainnya` : ""}`;
      await pushToUser(admin, userId, {
        title: "OURJOURNAL · Pengingat 09.00",
        body,
        url: "/notifications",
        tag: `ourjournal-daily-${today}`,
        icon: "/icon",
      });
    }
  }

  let kebabReminderCreated = false;
  if (modules.has("kebab")) {
    const specialKind = `kebab_daily_reminder:${today}`;
    if (!existingKinds.has(specialKind)) {
      const sunday = weekday === "Sun";
      const message = sunday
        ? "jangan lupa belanja bahan kebab hari ini yaa"
        : "jangan lupa isi produksi kebab hari ini yaa";
      const { error } = await admin.from("notifications").insert({
        user_id: userId,
        title: sunday ? "Belanja bahan Kebab Finka" : "Produksi Kebab Finka",
        message,
        kind: specialKind,
        is_read: false,
      });

      if (error) {
        console.error("Gagal menyimpan reminder Kebab Finka", userId, error);
      } else {
        kebabReminderCreated = true;
        if (pushConfigured) {
          await pushToUser(admin, userId, {
            title: "Kebab Finka",
            body: message,
            url: "/kebab-finka",
            tag: `kebab-daily-${today}`,
            icon: "/icons/kebab-finka-192.png",
          });
        }
      }
    }
  }

  return { remindersFound: reminders.length, remindersCreated: fresh.length, kebabReminderCreated };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = jakartaDate(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: JAKARTA_TIME_ZONE, weekday: "short" }).format(now);
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );

  const [profiles, moduleRows] = await Promise.all([
    admin.from("profiles").select("id").limit(1000),
    admin.from("user_modules").select("user_id,module_key,enabled").eq("enabled", true).limit(5000),
  ]);

  if (profiles.error) return NextResponse.json({ error: profiles.error.message }, { status: 500 });
  if (moduleRows.error) return NextResponse.json({ error: moduleRows.error.message }, { status: 500 });

  const modulesByUser = new Map<string, Set<string>>();
  for (const row of moduleRows.data ?? []) {
    const userId = String(row.user_id);
    const modules = modulesByUser.get(userId) ?? new Set<string>();
    modules.add(String(row.module_key));
    modulesByUser.set(userId, modules);
  }

  let remindersFound = 0;
  let remindersCreated = 0;
  let kebabRemindersCreated = 0;

  for (const profile of profiles.data ?? []) {
    const userId = String(profile.id);
    try {
      const result = await processUser(
        admin,
        userId,
        modulesByUser.get(userId) ?? new Set<string>(),
        today,
        weekday,
        pushConfigured
      );
      remindersFound += result.remindersFound;
      remindersCreated += result.remindersCreated;
      if (result.kebabReminderCreated) kebabRemindersCreated += 1;
    } catch (caught) {
      console.error("Daily reminder gagal untuk user", userId, caught);
    }
  }

  return NextResponse.json({
    ok: true,
    timezone: JAKARTA_TIME_ZONE,
    date: today,
    usersChecked: profiles.data?.length ?? 0,
    remindersFound,
    remindersCreated,
    kebabRemindersCreated,
    pushConfigured,
  });
}