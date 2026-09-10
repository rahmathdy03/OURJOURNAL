"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModule } from "@/lib/auth";

const basePath = "/academic/thesis";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalDate(value: string) {
  return value || null;
}

function optionalDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toInt(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function go(tab: string, ok = true, message = "") {
  revalidatePath(basePath);
  const params = new URLSearchParams({ tab });
  params.set(ok ? "saved" : "error", message || (ok ? "1" : "Gagal menyimpan data."));
  redirect(`${basePath}?${params.toString()}`);
}

async function insertRow(table: string, payload: Record<string, unknown>, tab: string) {
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from(table).insert({ ...payload, user_id: userId });
  if (error) go(tab, false, error.message);
  go(tab, true);
}

export async function saveThesisWorkspace(formData: FormData) {
  const { supabase, userId } = await requireModule("academic");
  const progress = Math.max(0, Math.min(100, toInt(text(formData, "progress"), 0)));
  const payload = {
    user_id: userId,
    title: text(formData, "title"),
    institution: text(formData, "institution"),
    program: text(formData, "program"),
    supervisor: text(formData, "supervisor"),
    co_supervisor: text(formData, "co_supervisor"),
    current_stage: text(formData, "current_stage") || "Persiapan",
    progress,
    target_graduation: optionalDate(text(formData, "target_graduation")),
    quote: text(formData, "quote") || "Sedikit progres tetap progres.",
    drive_folder_url: text(formData, "drive_folder_url"),
  };
  const { error } = await supabase.from("thesis_workspaces").upsert(payload, { onConflict: "user_id" });
  if (error) go("overview", false, error.message);
  go("overview", true);
}

export async function addThesisSupervision(formData: FormData) {
  await insertRow("thesis_supervisions", {
    scheduled_at: optionalDateTimeLocal(text(formData, "scheduled_at")) || new Date().toISOString(),
    lecturer: text(formData, "lecturer"),
    mode: text(formData, "mode") || "offline",
    location: text(formData, "location"),
    topic: text(formData, "topic"),
    notes: text(formData, "notes"),
    revision: text(formData, "revision"),
    status: text(formData, "status") || "upcoming",
  }, "bimbingan");
}

export async function updateThesisSupervisionDetail(formData: FormData) {
  const id = text(formData, "id");
  const field = text(formData, "field");
  const content = text(formData, "content");
  if (!id || !["notes", "revision"].includes(field) || !content) {
    go("bimbingan", false, "Pilih bimbingan dan isi catatan terlebih dahulu.");
  }

  const { supabase, userId } = await requireModule("academic");
  const { data: supervision, error: readError } = await supabase
    .from("thesis_supervisions")
    .select("id,topic,scheduled_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !supervision) go("bimbingan", false, readError?.message || "Bimbingan tidak ditemukan.");

  const { error } = await supabase
    .from("thesis_supervisions")
    .update({ [field]: content })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) go("bimbingan", false, error.message);

  if (field === "revision" && formData.get("create_task") === "on") {
    const dueAt = optionalDateTimeLocal(text(formData, "due_at"));
    const title = text(formData, "task_title") || content.split(/\n/)[0].slice(0, 120) || "Revisi bimbingan";
    const { error: taskError } = await supabase.from("thesis_tasks").insert({
      user_id: userId,
      title,
      details: `Dari bimbingan: ${supervision.topic || "Bimbingan Skripsi"}`,
      due_at: dueAt,
      priority: "high",
      focus_minutes: 45,
    });
    if (taskError) go("bimbingan", false, taskError.message);
  }

  go("bimbingan", true);
}

export async function addThesisResearchStep(formData: FormData) {
  await insertRow("thesis_research_steps", {
    title: text(formData, "title"),
    description: text(formData, "description"),
    target_date: optionalDate(text(formData, "target_date")),
    status: text(formData, "status") || "todo",
    position: toInt(text(formData, "position"), 0),
  }, "penelitian");
}

export async function updateThesisResearchDescription(formData: FormData) {
  const id = text(formData, "id");
  const description = text(formData, "description");
  if (!id || !description) go("penelitian", false, "Pilih tahap penelitian dan isi catatan.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase
    .from("thesis_research_steps")
    .update({ description })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) go("penelitian", false, error.message);
  go("penelitian", true);
}

export async function addThesisReference(formData: FormData) {
  const rawTags = text(formData, "tags");
  const tags = rawTags ? rawTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const yearRaw = text(formData, "publication_year");
  await insertRow("thesis_references", {
    title: text(formData, "title"),
    authors: text(formData, "authors"),
    publication_year: yearRaw ? toInt(yearRaw) : null,
    journal: text(formData, "journal"),
    tags,
    notes: text(formData, "notes"),
    drive_url: text(formData, "drive_url"),
    source_url: text(formData, "source_url"),
    is_read: false,
  }, "referensi");
}

export async function addThesisFile(formData: FormData) {
  await insertRow("thesis_files", {
    file_name: text(formData, "file_name"),
    version_label: text(formData, "version_label"),
    category: text(formData, "category") || "Skripsi",
    status: text(formData, "status") || "draft",
    drive_url: text(formData, "drive_url"),
    file_size_text: text(formData, "file_size_text"),
    notes: text(formData, "notes"),
    document_date: optionalDate(text(formData, "document_date")) || new Date().toISOString().slice(0, 10),
  }, "file");
}

export async function addThesisAdminItem(formData: FormData) {
  await insertRow("thesis_admin_items", {
    phase: text(formData, "phase") || "umum",
    title: text(formData, "title"),
    due_date: optionalDate(text(formData, "due_date")),
    notes: text(formData, "notes"),
    position: toInt(text(formData, "position"), 0),
  }, "administrasi");
}

export async function addThesisTask(formData: FormData) {
  await insertRow("thesis_tasks", {
    title: text(formData, "title"),
    details: text(formData, "details"),
    due_at: optionalDateTimeLocal(text(formData, "due_at")),
    priority: text(formData, "priority") || "normal",
    focus_minutes: Math.max(5, Math.min(240, toInt(text(formData, "focus_minutes"), 45))),
  }, "target");
}

export async function addThesisNotification(formData: FormData) {
  await insertRow("thesis_notifications", {
    title: text(formData, "title"),
    message: text(formData, "message"),
    kind: text(formData, "kind") || "info",
    notify_at: optionalDateTimeLocal(text(formData, "notify_at")),
  }, "notifikasi");
}

export async function addThesisMilestone(formData: FormData) {
  await insertRow("thesis_milestones", {
    title: text(formData, "title"),
    target_date: optionalDate(text(formData, "target_date")),
    position: toInt(text(formData, "position"), 0),
  }, "timeline");
}

const allowedTables = new Set([
  "thesis_supervisions",
  "thesis_research_steps",
  "thesis_references",
  "thesis_files",
  "thesis_admin_items",
  "thesis_tasks",
  "thesis_notifications",
  "thesis_milestones",
]);

export async function updateThesisFlag(formData: FormData) {
  const table = text(formData, "table");
  const id = text(formData, "id");
  const field = text(formData, "field");
  const tab = text(formData, "tab") || "overview";
  const current = text(formData, "current") === "true";
  if (!allowedTables.has(table) || !["is_done", "is_read"].includes(field) || !id) go(tab, false, "Aksi tidak valid.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from(table).update({ [field]: !current }).eq("id", id).eq("user_id", userId);
  if (error) go(tab, false, error.message);
  go(tab, true);
}

export async function setResearchStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["todo", "active", "done"].includes(status)) go("penelitian", false, "Status tidak valid.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from("thesis_research_steps").update({ status }).eq("id", id).eq("user_id", userId);
  if (error) go("penelitian", false, error.message);
  go("penelitian", true);
}

export async function setSupervisionStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["upcoming", "done", "cancelled"].includes(status)) go("bimbingan", false, "Status tidak valid.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from("thesis_supervisions").update({ status }).eq("id", id).eq("user_id", userId);
  if (error) go("bimbingan", false, error.message);
  go("bimbingan", true);
}

export async function setFileStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["draft", "sent", "revision", "approved"].includes(status)) go("file", false, "Status tidak valid.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from("thesis_files").update({ status }).eq("id", id).eq("user_id", userId);
  if (error) go("file", false, error.message);
  go("file", true);
}

export async function deleteThesisItem(formData: FormData) {
  const table = text(formData, "table");
  const id = text(formData, "id");
  const tab = text(formData, "tab") || "overview";
  if (!allowedTables.has(table) || !id) go(tab, false, "Aksi tidak valid.");
  const { supabase, userId } = await requireModule("academic");
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
  if (error) go(tab, false, error.message);
  go(tab, true);
}
