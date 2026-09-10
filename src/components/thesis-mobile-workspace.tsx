"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  addThesisAdminItem,
  addThesisFile,
  addThesisReference,
  addThesisResearchStep,
  addThesisSupervision,
  addThesisTask,
  deleteThesisItem,
  saveThesisWorkspace,
  setFileStatus,
  setResearchStatus,
  setSupervisionStatus,
  updateThesisFlag,
  updateThesisResearchDescription,
  updateThesisSupervisionDetail,
} from "@/features/academic/thesis-actions";

export const thesisTabs = [
  ["overview", "Overview"],
  ["bimbingan", "Bimbingan"],
  ["penelitian", "Penelitian"],
  ["referensi", "Referensi"],
  ["file", "File Skripsi"],
  ["administrasi", "Administrasi"],
  ["target", "Target & Prioritas"],
  ["notifikasi", "Notifikasi"],
  ["timeline", "Timeline Skripsi"],
] as const;

export type ThesisTab = (typeof thesisTabs)[number][0];

type Props = {
  tab: ThesisTab;
  firstName: string;
  workspace: any;
  rows: any[];
  overview: {
    supervisions: any[];
    research: any[];
    tasks: any[];
    admin: any[];
    milestones: any[];
  };
  saved?: string;
  error?: string;
};

type SheetKind =
  | "workspace"
  | "bimbingan-jadwal"
  | "bimbingan-catatan"
  | "bimbingan-revisi"
  | "penelitian-tahap"
  | "penelitian-jadwal"
  | "penelitian-catatan"
  | "referensi"
  | "file"
  | "administrasi"
  | "target"
  | null;

const addableTabs: ThesisTab[] = ["bimbingan", "penelitian", "referensi", "file", "administrasi", "target"];

function safeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateLabel(value?: string | null, withYear = false) {
  const d = safeDate(value);
  if (!d) return "Belum ditentukan";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

function timeLabel(value?: string | null) {
  const d = safeDate(value);
  if (!d) return "--.--";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
}

function monthYear(value?: string | null) {
  const d = safeDate(value);
  if (!d) return "Tanpa tanggal";
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function weekdayShort(value?: string | null) {
  const d = safeDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", { weekday: "short" });
}

function dayNumber(value?: string | null) {
  const d = safeDate(value);
  return d ? String(d.getDate()) : "--";
}

function monthShort(value?: string | null) {
  const d = safeDate(value);
  return d ? d.toLocaleDateString("id-ID", { month: "short" }) : "-";
}

function daysUntil(value?: string | null) {
  const d = safeDate(value);
  if (!d) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function MiniTabs({ items, value, onChange }: { items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-2 rounded-[14px] bg-white/80 p-1 shadow-[0_1px_5px_rgba(0,0,0,.05)] ring-1 ring-black/5">
      {items.map(([key, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "min-w-0 rounded-[11px] px-2 py-2 text-[11px] font-black transition",
            value === key ? "bg-orange-500 text-white shadow-sm" : "text-neutral-600 active:bg-neutral-100"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChipRow({ items, value, onChange }: { items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(([key, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "shrink-0 rounded-[11px] border px-3 py-2 text-[10px] font-black transition",
            value === key
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-black/5 bg-white text-neutral-600 shadow-sm"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[18px] border border-black/[.045] bg-white shadow-[0_4px_18px_rgba(35,28,20,.045)] ${className}`}>{children}</div>;
}

function Empty({ children = "Belum ada data." }: { children?: ReactNode }) {
  return <div className="rounded-[18px] border border-dashed border-black/10 bg-white/60 px-5 py-8 text-center text-xs font-bold text-neutral-400">{children}</div>;
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "orange" | "green" | "blue" | "red" }) {
  const style = {
    neutral: "bg-neutral-100 text-neutral-600",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-600",
  }[tone];
  return <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-black ${style}`}>{children}</span>;
}

function ToggleForm({ table, id, field, current, tab, children }: { table: string; id: string; field: "is_done" | "is_read"; current: boolean; tab: ThesisTab; children: ReactNode }) {
  return (
    <form action={updateThesisFlag}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="current" value={String(current)} />
      <input type="hidden" name="tab" value={tab} />
      <button className="contents">{children}</button>
    </form>
  );
}

function DeleteForm({ table, id, tab }: { table: string; id: string; tab: ThesisTab }) {
  return (
    <form action={deleteThesisItem}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tab" value={tab} />
      <button aria-label="Hapus" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-red-50 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </form>
  );
}

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[110] lg:flex lg:items-center lg:justify-center">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
      <section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[30px] bg-[#faf8f4] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl lg:relative lg:inset-auto lg:w-full lg:max-w-lg lg:rounded-[28px] lg:p-5">
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-neutral-300 lg:hidden" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-5 text-neutral-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5">
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-neutral-500">{children}</label>;
}

function Submit({ children = "Simpan" }: { children?: ReactNode }) {
  return <button type="submit" className="mt-2 flex w-full items-center justify-center rounded-[14px] bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[.98]">{children}</button>;
}

export function ThesisMobileWorkspace({ tab, firstName, workspace, rows, overview, saved, error }: Props) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const title = thesisTabs.find(([key]) => key === tab)?.[1] ?? "Skripsi";

  return (
    <div className="thesis-app-shell mx-auto w-full max-w-3xl space-y-4 pb-3">
      <header className="relative flex min-h-11 items-center justify-center">
        <Link href="/academic" prefetch className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 active:bg-black/5" aria-label="Kembali ke Kuliah">
          <ArrowLeft size={21} strokeWidth={2.2} />
        </Link>
        <div className="px-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-orange-500 md:hidden">Skripsi</p>
          <h1 className="text-[17px] font-black text-neutral-950">{title}</h1>
        </div>
        {addableTabs.includes(tab) ? (
          <button type="button" onClick={() => setSheet(defaultSheet(tab))} className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 active:bg-black/5" aria-label="Tambah data">
            <Plus size={23} strokeWidth={2.1} />
          </button>
        ) : tab === "overview" ? (
          <button type="button" onClick={() => setSheet("workspace")} className="absolute right-0 rounded-full px-3 py-2 text-[11px] font-black text-orange-600 active:bg-orange-50">Atur</button>
        ) : null}
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {thesisTabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/academic/thesis?tab=${key}`}
            prefetch
            className={cn(
              "shrink-0 rounded-[11px] border px-3 py-2 text-[10px] font-black transition",
              tab === key ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-black/5 bg-white text-neutral-600 shadow-sm"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {saved && <div className="rounded-[14px] bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">Data berhasil disimpan.</div>}
      {error && <div className="rounded-[14px] bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

      {tab === "overview" && <Overview workspace={workspace} overview={overview} firstName={firstName} onSettings={() => setSheet("workspace")} />}
      {tab === "bimbingan" && <Bimbingan rows={rows} onAdd={setSheet} />}
      {tab === "penelitian" && <Penelitian rows={rows} onAdd={setSheet} />}
      {tab === "referensi" && <Referensi rows={rows} />}
      {tab === "file" && <Files rows={rows} driveFolder={workspace?.drive_folder_url} />}
      {tab === "administrasi" && <Administrasi rows={rows} />}
      {tab === "target" && <TargetPrioritas rows={rows} />}
      {tab === "notifikasi" && <Notifikasi rows={rows} />}
      {tab === "timeline" && <Timeline rows={rows} target={workspace?.target_graduation} quote={workspace?.quote} />}

      {sheet && <AddSheet kind={sheet} onClose={() => setSheet(null)} rows={rows} workspace={workspace} />}
    </div>
  );
}

function defaultSheet(tab: ThesisTab): SheetKind {
  if (tab === "bimbingan") return "bimbingan-jadwal";
  if (tab === "penelitian") return "penelitian-tahap";
  if (tab === "referensi") return "referensi";
  if (tab === "file") return "file";
  if (tab === "administrasi") return "administrasi";
  if (tab === "target") return "target";
  return null;
}

function Overview({ workspace, overview, firstName, onSettings }: { workspace: any; overview: Props["overview"]; firstName: string; onSettings: () => void }) {
  const progress = Number(workspace?.progress ?? 0);
  const next = overview.supervisions[0];
  const activeTasks = overview.tasks.filter((x) => !x.is_done);
  const doneResearch = overview.research.filter((x) => x.status === "done").length;
  const researchPct = overview.research.length ? Math.round((doneResearch / overview.research.length) * 100) : 0;
  const nearest = [...activeTasks].filter((x) => x.due_at).sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];

  return (
    <div className="space-y-3">
      <Surface className="overflow-hidden border-orange-100/80 bg-gradient-to-r from-[#fff9ef] to-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-orange-50 text-2xl">🎓</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-neutral-900">{workspace?.current_stage || "Semester Akhir"}</p>
            <p className="mt-0.5 truncate text-[10px] text-neutral-500">{workspace?.title || `Tetap konsisten, ${firstName}. Kamu pasti bisa! ✨`}</p>
          </div>
          <button type="button" onClick={onSettings} className="text-[10px] font-black text-orange-600">Edit</button>
        </div>
      </Surface>

      <Surface className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black">Progress Skripsi</h2>
          <ChevronRight size={17} className="text-neutral-500" />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#f97316 ${progress * 3.6}deg, #f5e9dc 0deg)` }}>
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white text-xl font-black">{progress}%</div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-neutral-500">Dalam proses</p>
            <p className="mt-0.5 text-base font-black">{workspace?.current_stage || "Persiapan"}</p>
            <p className="mt-2 text-[10px] text-neutral-500">Target lulus: {workspace?.target_graduation ? dateLabel(workspace.target_graduation, true) : "Belum diatur"}</p>
          </div>
        </div>
      </Surface>

      <Surface className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-orange-50 text-orange-500"><Calendar size={21} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-neutral-500">Bimbingan berikutnya</p>
            {next ? <>
              <p className="mt-1 text-sm font-black">{dateLabel(next.scheduled_at)} · {timeLabel(next.scheduled_at)}</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">{next.lecturer || "Dosen pembimbing"}</p>
              <p className="mt-0.5 truncate text-[10px] text-neutral-500">{next.topic}</p>
            </> : <p className="mt-2 text-xs font-bold text-neutral-400">Belum ada jadwal bimbingan.</p>}
          </div>
          <ChevronRight size={17} className="mt-1 text-neutral-400" />
        </div>
      </Surface>

      <Surface className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black">Target minggu ini</h2>
          <span className="text-[10px] font-bold text-neutral-400">{activeTasks.length} aktif</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#f4e8db]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, activeTasks.length ? 45 : 0)}%` }} /></div>
        {activeTasks.length ? <div className="space-y-2.5">{activeTasks.slice(0, 5).map((task) => (
          <div key={task.id} className="flex items-center gap-2.5">
            <ToggleForm table="thesis_tasks" id={task.id} field="is_done" current={Boolean(task.is_done)} tab="overview">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-neutral-300 bg-white" />
            </ToggleForm>
            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">{task.title}</p>
          </div>
        ))}</div> : <p className="text-[11px] text-neutral-400">Belum ada target. Tambahkan dari Target & Prioritas.</p>}
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2">
        <Surface className="p-4">
          <div className="mb-2 flex items-center gap-2"><FlaskConical size={17} className="text-orange-500" /><h2 className="text-xs font-black">Progress Penelitian</h2></div>
          <div className="flex items-end justify-between"><span className="text-2xl font-black">{researchPct}%</span><span className="text-[10px] text-neutral-400">{doneResearch}/{overview.research.length} selesai</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4e8db]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${researchPct}%` }} /></div>
        </Surface>
        <Surface className="p-4">
          <div className="mb-2 flex items-center gap-2"><Clock size={17} className="text-orange-500" /><h2 className="text-xs font-black">Deadline terdekat</h2></div>
          {nearest ? <><p className="truncate text-sm font-black">{nearest.title}</p><p className="mt-1 text-[10px] text-neutral-500">{dateLabel(nearest.due_at, true)}</p></> : <p className="text-[11px] text-neutral-400">Belum ada deadline.</p>}
        </Surface>
      </div>

      <Surface className="overflow-hidden bg-gradient-to-br from-[#fff7ea] to-[#fffdf9] p-5 text-center">
        <Sparkles size={20} className="mx-auto text-orange-400" />
        <p className="mt-2 text-sm font-black italic leading-6 text-neutral-800">“{workspace?.quote || "Setiap progres kecil tetaplah progres."}”</p>
        <p className="mt-1 text-[10px] text-neutral-400">Kamu sudah sejauh ini. Lanjut sedikit lagi.</p>
      </Surface>
    </div>
  );
}

function Bimbingan({ rows, onAdd }: { rows: any[]; onAdd: (kind: SheetKind) => void }) {
  const [sub, setSub] = useState("jadwal");
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => rows.filter((row) => {
    if (sub === "catatan") return Boolean(row.notes);
    if (sub === "revisi") return Boolean(row.revision);
    if (filter === "upcoming") return row.status === "upcoming";
    if (filter === "done") return row.status === "done";
    return row.status !== "cancelled";
  }), [rows, sub, filter]);
  const groups = useMemo(() => groupBy(filtered, (row) => monthYear(row.scheduled_at)), [filtered]);

  return (
    <div className="space-y-4">
      <MiniTabs items={[["jadwal", "Jadwal"], ["catatan", "Catatan"], ["revisi", "Revisi"]]} value={sub} onChange={setSub} />
      {sub === "jadwal" && <ChipRow items={[["all", "Semua"], ["upcoming", "Akan Datang"], ["done", "Selesai"]]} value={filter} onChange={setFilter} />}
      {sub !== "jadwal" && <button type="button" onClick={() => onAdd(sub === "catatan" ? "bimbingan-catatan" : "bimbingan-revisi")} className="hidden" />}
      {!filtered.length ? <Empty>{sub === "jadwal" ? "Belum ada jadwal bimbingan." : sub === "catatan" ? "Belum ada catatan bimbingan." : "Belum ada revisi bimbingan."}</Empty> : (
        <div className="space-y-5">
          {Object.entries(groups).map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-2 text-sm font-black">{label}</h2>
              <div className="space-y-2.5">
                {(items as any[]).map((row) => sub === "jadwal" ? <SupervisionCard key={row.id} row={row} /> : <SupervisionNoteCard key={row.id} row={row} revision={sub === "revisi"} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SupervisionCard({ row }: { row: any }) {
  return (
    <Surface className="p-3.5">
      <div className="flex gap-3">
        <div className="w-11 shrink-0 text-center">
          <p className="text-[10px] font-black text-neutral-600">{weekdayShort(row.scheduled_at)}</p>
          <p className="text-xl font-black leading-6">{dayNumber(row.scheduled_at)}</p>
          <p className="text-[9px] font-bold text-neutral-500">{monthShort(row.scheduled_at)}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-black/5 pl-3">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-xs font-black">{row.topic || "Bimbingan Skripsi"}</p>
            <StatusPill tone={row.status === "done" ? "green" : row.status === "upcoming" ? "blue" : "neutral"}>{row.status === "done" ? "Selesai" : row.status === "upcoming" ? "Akan datang" : "Batal"}</StatusPill>
          </div>
          <div className="mt-2 space-y-1 text-[10px] text-neutral-500">
            <p className="flex items-center gap-1.5"><Clock size={12} /> {timeLabel(row.scheduled_at)}</p>
            <p className="flex items-center gap-1.5"><UserRound size={12} /> {row.lecturer || "Dosen pembimbing"}</p>
            <p className="flex items-center gap-1.5"><MapPin size={12} /> {row.mode === "online" ? (row.location || "Online") : (row.location || "Offline")}</p>
          </div>
          {row.notes && <p className="mt-2 line-clamp-2 text-[10px] text-neutral-500">{row.notes}</p>}
          <div className="mt-3 flex items-center justify-between gap-2">
            <form action={setSupervisionStatus} className="flex gap-1.5">
              <input type="hidden" name="id" value={row.id} />
              <button name="status" value="upcoming" className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">Akan datang</button>
              <button name="status" value="done" className="rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">Selesai</button>
            </form>
            <DeleteForm table="thesis_supervisions" id={row.id} tab="bimbingan" />
          </div>
        </div>
      </div>
    </Surface>
  );
}

function SupervisionNoteCard({ row, revision }: { row: any; revision: boolean }) {
  return (
    <Surface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-orange-600">{dateLabel(row.scheduled_at, true)}</p>
          <p className="mt-1 text-xs font-black">{row.topic || "Bimbingan Skripsi"}</p>
          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-600">{revision ? row.revision : row.notes}</p>
        </div>
        {revision && <Target size={17} className="shrink-0 text-orange-500" />}
      </div>
    </Surface>
  );
}

function Penelitian({ rows, onAdd }: { rows: any[]; onAdd: (kind: SheetKind) => void }) {
  const [sub, setSub] = useState("tracker");
  const done = rows.filter((row) => row.status === "done").length;
  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const scheduled = rows.filter((row) => row.target_date);
  const notes = rows.filter((row) => row.description);

  return (
    <div className="space-y-4">
      <MiniTabs items={[["tracker", "Tracker"], ["jadwal", "Jadwal"], ["catatan", "Catatan"]]} value={sub} onChange={setSub} />
      {sub === "tracker" && <>
        <Surface className="p-4">
          <div className="flex items-end justify-between"><div><p className="text-sm font-black">Progress Penelitian</p><p className="mt-1 text-[10px] text-neutral-400">{done}/{rows.length} selesai</p></div><p className="text-sm font-black">{progress}%</p></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e5d8]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></div>
        </Surface>
        {!rows.length ? <Empty>Belum ada tahapan penelitian.</Empty> : <Surface className="p-4">
          <div className="relative space-y-0 pl-1">
            {rows.map((row, index) => <ResearchStep key={row.id} row={row} last={index === rows.length - 1} />)}
          </div>
        </Surface>}
      </>}
      {sub === "jadwal" && <>
        <div className="flex items-center justify-between"><h2 className="text-sm font-black">Jadwal Penelitian</h2><button type="button" onClick={() => onAdd("penelitian-jadwal")} className="text-[10px] font-black text-orange-600">Tambah</button></div>
        {!scheduled.length ? <Empty>Belum ada jadwal penelitian.</Empty> : <div className="space-y-2">{scheduled.map((row) => (
          <Surface key={row.id} className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-orange-50 text-orange-500"><FlaskConical size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{row.title}</p><p className="mt-1 text-[10px] text-neutral-500">{dateLabel(row.target_date, true)}</p></div><ChevronRight size={16} className="text-neutral-300" /></Surface>
        ))}</div>}
      </>}
      {sub === "catatan" && <>
        <div className="flex items-center justify-between"><h2 className="text-sm font-black">Catatan Penelitian</h2><button type="button" onClick={() => onAdd("penelitian-catatan")} className="text-[10px] font-black text-orange-600">Tambah</button></div>
        {!notes.length ? <Empty>Belum ada catatan penelitian.</Empty> : <div className="space-y-2">{notes.map((row) => <Surface key={row.id} className="p-4"><p className="text-xs font-black">{row.title}</p><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-600">{row.description}</p></Surface>)}</div>}
      </>}
    </div>
  );
}

function ResearchStep({ row, last }: { row: any; last: boolean }) {
  const done = row.status === "done";
  const active = row.status === "active";
  return (
    <div className="relative flex gap-3 pb-5">
      {!last && <div className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-px bg-neutral-200" />}
      <div className={cn("relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-500 text-white" : active ? "border-[5px] border-orange-500 bg-white" : "bg-neutral-200 text-neutral-400")}>{done && <Check size={11} strokeWidth={3} />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black">{row.title}</p><p className={cn("mt-0.5 text-[10px] font-bold", done ? "text-emerald-600" : active ? "text-orange-600" : "text-neutral-400")}>{done ? "Selesai" : active ? "Sedang berjalan" : "Belum mulai"}</p></div><p className="shrink-0 text-[9px] text-neutral-400">{row.target_date ? dateLabel(row.target_date) : "-"}</p></div>
        {row.description && <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-neutral-500">{row.description}</p>}
        <form action={setResearchStatus} className="mt-2 flex gap-1.5">
          <input type="hidden" name="id" value={row.id} />
          <button name="status" value="todo" className="rounded-md bg-neutral-100 px-2 py-1 text-[8px] font-black text-neutral-500">Belum</button>
          <button name="status" value="active" className="rounded-md bg-orange-50 px-2 py-1 text-[8px] font-black text-orange-600">Proses</button>
          <button name="status" value="done" className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-600">Selesai</button>
        </form>
      </div>
    </div>
  );
}

function Referensi({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const preset = ["Semua", "Jurnal Utama", "Metode", "Latar Belakang", "Penelitian Terdahulu"];
  const visible = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.authors} ${row.journal} ${(row.tags || []).join(" ")}`.toLowerCase();
    const searchOk = !search || haystack.includes(search.toLowerCase());
    const filterOk = filter === "Semua" || (row.tags || []).some((tag: string) => tag.toLowerCase() === filter.toLowerCase());
    return searchOk && filterOk;
  }), [rows, search, filter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[13px] bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5"><Search size={16} className="text-neutral-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400" placeholder="Cari jurnal, topik, atau penulis..." /></div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{preset.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={cn("shrink-0 rounded-[10px] px-3 py-2 text-[9px] font-black", filter === item ? "bg-orange-500 text-white" : "bg-white text-neutral-500 shadow-sm ring-1 ring-black/5")}>{item}</button>)}</div>
      {!visible.length ? <Empty>Belum ada referensi yang cocok.</Empty> : <div className="space-y-2">{visible.map((row) => <ReferenceCard key={row.id} row={row} />)}</div>}
    </div>
  );
}

function ReferenceCard({ row }: { row: any }) {
  return (
    <Surface className="p-3.5">
      <div className="flex gap-3">
        <ToggleForm table="thesis_references" id={row.id} field="is_read" current={Boolean(row.is_read)} tab="referensi"><span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", row.is_read ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white")}>{row.is_read && <Check size={11} strokeWidth={3} />}</span></ToggleForm>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2"><p className="min-w-0 flex-1 text-[11px] font-black leading-4">{row.title}</p><MoreVertical size={15} className="shrink-0 text-neutral-400" /></div>
          <p className="mt-1 text-[9px] text-neutral-500">{row.authors || "Penulis belum diisi"}{row.publication_year ? ` (${row.publication_year})` : ""}</p>
          {row.journal && <p className="mt-0.5 text-[9px] text-neutral-400">{row.journal}</p>}
          {!!row.tags?.length && <div className="mt-2 flex flex-wrap gap-1.5">{row.tags.slice(0, 5).map((tag: string) => <StatusPill key={tag} tone={tag.toLowerCase().includes("metode") ? "orange" : "blue"}>{tag}</StatusPill>)}</div>}
          <div className="mt-2 flex items-center gap-3">{row.drive_url && <a href={row.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-orange-600"><FolderOpen size={12} /> Drive</a>}{row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-neutral-500"><ExternalLink size={12} /> Sumber</a>}<div className="ml-auto"><DeleteForm table="thesis_references" id={row.id} tab="referensi" /></div></div>
        </div>
      </div>
    </Surface>
  );
}

function Files({ rows, driveFolder }: { rows: any[]; driveFolder?: string }) {
  const [filter, setFilter] = useState("all");
  const visible = rows.filter((row) => filter === "all" || row.status === filter);
  return (
    <div className="space-y-3">
      <MiniTabs items={[["all", "Semua"], ["draft", "Draft"], ["sent", "Dikirim"], ["revision", "Revisi"], ["approved", "ACC"]]} value={filter} onChange={setFilter} />
      {driveFolder && <a href={driveFolder} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-[14px] bg-orange-50 px-4 py-3 text-[11px] font-black text-orange-700"><span className="inline-flex items-center gap-2"><FolderOpen size={16} /> Buka folder Skripsi di Drive</span><ExternalLink size={14} /></a>}
      {!visible.length ? <Empty>Belum ada file pada kategori ini.</Empty> : <div className="space-y-2">{visible.map((row) => <FileCard key={row.id} row={row} />)}</div>}
    </div>
  );
}

function FileCard({ row }: { row: any }) {
  const tone = row.status === "approved" ? "green" : row.status === "revision" ? "red" : row.status === "sent" ? "blue" : "neutral";
  const label = row.status === "approved" ? "ACC" : row.status === "revision" ? "Revisi" : row.status === "sent" ? "Dikirim" : "Draft";
  return (
    <Surface className="p-3.5">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]", row.status === "approved" ? "bg-emerald-50 text-emerald-600" : row.status === "revision" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600")}><FileText size={19} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2"><p className="min-w-0 flex-1 break-words text-[11px] font-black leading-4">{row.file_name}</p><MoreVertical size={15} className="shrink-0 text-neutral-400" /></div>
          <p className="mt-1 text-[9px] text-neutral-400">{dateLabel(row.document_date, true)}{row.file_size_text ? ` · ${row.file_size_text}` : ""}{row.version_label ? ` · ${row.version_label}` : ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill tone={tone as any}>{label}</StatusPill>{row.notes && <span className="text-[9px] text-neutral-500">{row.notes}</span>}</div>
          <div className="mt-3 flex items-center gap-2"><a href={row.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1.5 text-[9px] font-black text-orange-700"><ExternalLink size={11} /> Buka Drive</a><form action={setFileStatus} className="flex gap-1"><input type="hidden" name="id" value={row.id} /><button name="status" value="sent" className="rounded-lg bg-blue-50 px-2 py-1.5 text-[8px] font-black text-blue-600">Dikirim</button><button name="status" value="approved" className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[8px] font-black text-emerald-600">ACC</button></form><div className="ml-auto"><DeleteForm table="thesis_files" id={row.id} tab="file" /></div></div>
        </div>
      </div>
    </Surface>
  );
}

function Administrasi({ rows }: { rows: any[] }) {
  const [phase, setPhase] = useState("sempro");
  const visible = rows.filter((row) => row.phase === phase || (phase === "sempro" && row.phase === "umum"));
  const done = visible.filter((row) => row.is_done).length;
  const pct = visible.length ? Math.round((done / visible.length) * 100) : 0;
  return (
    <div className="space-y-4">
      <MiniTabs items={[["sempro", "Sempro"], ["semhas", "Semhas"], ["sidang", "Sidang"], ["yudisium", "Yudisium"]]} value={phase} onChange={setPhase} />
      <Surface className="p-4">
        <div className="flex items-end justify-between"><div><h2 className="text-sm font-black">Checklist {phase.charAt(0).toUpperCase() + phase.slice(1)}</h2><p className="mt-1 text-[10px] text-neutral-400">{done}/{visible.length} selesai</p></div><span className="text-[11px] font-black text-neutral-500">{pct}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2e5d8]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 space-y-3">{visible.length ? visible.map((row) => <div key={row.id} className="flex items-center gap-3"><ToggleForm table="thesis_admin_items" id={row.id} field="is_done" current={Boolean(row.is_done)} tab="administrasi"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", row.is_done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white")}>{row.is_done && <Check size={11} strokeWidth={3} />}</span></ToggleForm><div className="min-w-0 flex-1"><p className={cn("text-[11px] font-semibold", row.is_done && "text-neutral-400 line-through")}>{row.title}</p>{row.due_date && <p className="text-[9px] text-neutral-400">Deadline {dateLabel(row.due_date, true)}</p>}</div><DeleteForm table="thesis_admin_items" id={row.id} tab="administrasi" /></div>) : <p className="text-[11px] text-neutral-400">Belum ada checklist.</p>}</div>
      </Surface>
      <div className="flex items-start gap-3 rounded-[15px] bg-emerald-50/70 p-4 text-emerald-800"><div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black">i</div><p className="text-[10px] leading-5">Pastikan semua berkas lengkap sesuai ketentuan kampus/fakultas. File pendukung tetap bisa disimpan di Google Drive.</p></div>
    </div>
  );
}

function TargetPrioritas({ rows }: { rows: any[] }) {
  const [period, setPeriod] = useState("today");
  const today = new Date();
  const endWeek = new Date(today.getTime() + 7 * 86400000);
  const visible = rows.filter((row) => {
    if (period === "all") return true;
    if (!row.due_at) return period === "week";
    const due = new Date(row.due_at);
    if (period === "today") return due.toDateString() === today.toDateString();
    return due <= endWeek;
  });
  const priority = rows.find((row) => !row.is_done && row.priority === "high") || rows.find((row) => !row.is_done);

  return (
    <div className="space-y-4">
      <MiniTabs items={[["today", "Hari Ini"], ["week", "Minggu Ini"], ["all", "Semua"]]} value={period} onChange={setPeriod} />
      <Surface className="border-orange-100 bg-gradient-to-br from-[#fffaf4] to-white p-4">
        <div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Target size={22} /></div><div><p className="text-xs font-black">Apa yang harus aku kerjakan sekarang?</p><p className="mt-1 text-[10px] leading-4 text-neutral-500">Berdasarkan deadline dan prioritasmu.</p></div></div>
      </Surface>
      {priority && !priority.is_done && <Surface className="border-red-100 bg-[#fff9f8] p-4">
        <p className="text-[10px] font-black text-red-500">Prioritas hari ini</p>
        <div className="mt-2 flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-red-500" /><div><p className="text-sm font-black">{priority.title}</p>{priority.details && <p className="mt-1 text-[10px] leading-4 text-neutral-500">{priority.details}</p>}{priority.due_at && <p className="mt-2 text-[10px] font-bold text-red-500">Deadline {dateLabel(priority.due_at, true)}</p>}</div></div>
        <Link href="/academic/study" prefetch className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-xs font-black text-white"><span className="text-[10px]">▶</span> Mulai fokus {priority.focus_minutes || 45} menit</Link>
      </Surface>}
      <section><h2 className="mb-2 text-sm font-black">Tugas lainnya</h2>{!visible.length ? <Empty>Tidak ada target pada periode ini.</Empty> : <div className="space-y-2">{visible.map((row) => <Surface key={row.id} className="flex items-center gap-3 p-3.5"><ToggleForm table="thesis_tasks" id={row.id} field="is_done" current={Boolean(row.is_done)} tab="target"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", row.is_done ? "border-orange-500 bg-orange-500 text-white" : "border-neutral-300 bg-white")}>{row.is_done && <Check size={11} strokeWidth={3} />}</span></ToggleForm><div className="min-w-0 flex-1"><p className={cn("truncate text-[11px] font-bold", row.is_done && "text-neutral-400 line-through")}>{row.title}</p>{row.due_at && <p className="mt-0.5 text-[9px] text-neutral-400">{dateLabel(row.due_at, true)}</p>}</div>{row.priority === "high" && <StatusPill tone="red">Penting</StatusPill>}<DeleteForm table="thesis_tasks" id={row.id} tab="target" /></Surface>)}</div>}</section>
    </div>
  );
}

function Notifikasi({ rows }: { rows: any[] }) {
  const [filter, setFilter] = useState("all");
  const visible = rows.filter((row) => filter === "all" || row.kind === filter);
  const groups = groupBy(visible, (row) => {
    const d = safeDate(row.created_at);
    if (!d) return "Lainnya";
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) return "Hari ini";
    if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
    return monthYear(row.created_at);
  });
  return (
    <div className="space-y-4">
      <ChipRow items={[["all", "Semua"], ["supervision", "Bimbingan"], ["deadline", "Deadline"], ["feedback", "Feedback"], ["system", "Sistem"]]} value={filter} onChange={setFilter} />
      {!visible.length ? <Empty>Belum ada notifikasi Skripsi.</Empty> : Object.entries(groups).map(([label, items]) => <section key={label}><h2 className="mb-2 text-sm font-black">{label}</h2><Surface className="divide-y divide-black/5">{(items as any[]).map((row) => <div key={row.id} className="flex gap-3 p-4"><ToggleForm table="thesis_notifications" id={row.id} field="is_read" current={Boolean(row.is_read)} tab="notifikasi"><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", row.kind === "deadline" ? "bg-red-50 text-red-500" : row.kind === "supervision" ? "bg-orange-50 text-orange-500" : row.kind === "feedback" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-600")}><Bell size={16} /></span></ToggleForm><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className={cn("text-[11px] font-black", row.is_read && "text-neutral-500")}>{row.title}</p><span className="shrink-0 text-[8px] text-neutral-400">{timeLabel(row.created_at)}</span></div><p className="mt-1 text-[10px] leading-4 text-neutral-500">{row.message}</p></div></div>)}</Surface></section>)}
    </div>
  );
}

function Timeline({ rows, target, quote }: { rows: any[]; target?: string; quote?: string }) {
  const [sub, setSub] = useState("timeline");
  const days = daysUntil(target);
  return (
    <div className="space-y-4">
      <Surface className="overflow-hidden p-4">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-orange-50 text-orange-500"><Calendar size={23} /></div><div className="min-w-0 flex-1"><p className="text-2xl font-black">{days !== null ? `${days} hari lagi` : "Atur target lulus"}</p><p className="text-[10px] text-neutral-500">Menuju target lulus{target ? ` · ${dateLabel(target, true)}` : ""}</p></div><div className="rounded-full bg-orange-50 px-3 py-2 text-center text-[9px] font-black text-orange-700">Kamu bisa<br />pasti bisa!</div></div>
      </Surface>
      <MiniTabs items={[["timeline", "Timeline"], ["calendar", "Kalender"]]} value={sub} onChange={setSub} />
      {sub === "timeline" ? (!rows.length ? <Empty>Belum ada milestone Skripsi.</Empty> : <Surface className="p-4"><div className="space-y-0">{rows.map((row, index) => <MilestoneRow key={row.id} row={row} last={index === rows.length - 1} />)}</div></Surface>) : <CalendarMilestones rows={rows} />}
      <Surface className="bg-[#fff7eb] p-5 text-center"><p className="text-sm font-black italic leading-6 text-neutral-700">“{quote || "Setiap progres kecil tetaplah progres. Kamu sudah sejauh ini."}”</p></Surface>
    </div>
  );
}

function MilestoneRow({ row, last }: { row: any; last: boolean }) {
  const done = Boolean(row.is_done);
  return <div className="relative flex gap-3 pb-5">{!last && <div className="absolute left-[9px] top-5 h-[calc(100%-7px)] w-px bg-neutral-200" />}<div className={cn("relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400")}>{done && <Check size={11} strokeWidth={3} />}</div><div className="flex min-w-0 flex-1 items-start justify-between gap-4"><div><p className="text-xs font-black">{row.title}</p>{row.target_date && <p className="mt-1 text-[9px] text-neutral-400">{dateLabel(row.target_date, true)}</p>}</div><ToggleForm table="thesis_milestones" id={row.id} field="is_done" current={done} tab="timeline"><span className="text-[9px] font-black text-orange-600">{done ? "Selesai" : "Tandai"}</span></ToggleForm></div></div>;
}

function CalendarMilestones({ rows }: { rows: any[] }) {
  const groups = groupBy(rows.filter((r) => r.target_date), (r) => monthYear(r.target_date));
  return <div className="space-y-4">{Object.keys(groups).length ? Object.entries(groups).map(([month, items]) => <section key={month}><h2 className="mb-2 text-xs font-black">{month}</h2><Surface className="divide-y divide-black/5">{(items as any[]).map((row) => <div key={row.id} className="flex items-center gap-3 p-3.5"><Calendar size={15} className="text-orange-500" /><div className="min-w-0 flex-1"><p className="text-[11px] font-black">{row.title}</p><p className="text-[9px] text-neutral-400">{dateLabel(row.target_date, true)}</p></div>{row.is_done && <CheckCircle2 size={16} className="text-emerald-500" />}</div>)}</Surface></section>) : <Empty>Belum ada tanggal milestone.</Empty>}</div>;
}

function AddSheet({ kind, onClose, rows, workspace }: { kind: Exclude<SheetKind, null>; onClose: () => void; rows: any[]; workspace: any }) {
  if (kind === "workspace") return <Sheet title="Atur Workspace Skripsi" subtitle="Data ini privat untuk akunmu." onClose={onClose}><form action={saveThesisWorkspace} className="space-y-3"><div><FieldLabel>Judul Skripsi</FieldLabel><textarea name="title" defaultValue={workspace?.title || ""} className="field min-h-20" placeholder="Judul penelitian" /></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Institusi</FieldLabel><input name="institution" defaultValue={workspace?.institution || ""} className="field" /></div><div><FieldLabel>Program Studi</FieldLabel><input name="program" defaultValue={workspace?.program || ""} className="field" /></div></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Pembimbing 1</FieldLabel><input name="supervisor" defaultValue={workspace?.supervisor || ""} className="field" /></div><div><FieldLabel>Pembimbing 2</FieldLabel><input name="co_supervisor" defaultValue={workspace?.co_supervisor || ""} className="field" /></div></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Tahap sekarang</FieldLabel><input name="current_stage" defaultValue={workspace?.current_stage || "Persiapan"} className="field" /></div><div><FieldLabel>Progress %</FieldLabel><input name="progress" type="number" min="0" max="100" defaultValue={workspace?.progress ?? 0} className="field" /></div></div><div><FieldLabel>Target lulus</FieldLabel><input name="target_graduation" type="date" defaultValue={workspace?.target_graduation || ""} className="field" /></div><div><FieldLabel>Folder utama Google Drive</FieldLabel><input name="drive_folder_url" type="url" defaultValue={workspace?.drive_folder_url || ""} className="field" placeholder="https://drive.google.com/..." /></div><div><FieldLabel>Kalimat penyemangat</FieldLabel><input name="quote" defaultValue={workspace?.quote || ""} className="field" /></div><Submit /></form></Sheet>;

  if (kind.startsWith("bimbingan-")) {
    const mode = kind.split("-")[1];
    return <Sheet title="Tambah Bimbingan" subtitle="Pilih jenis input tanpa memenuhi halaman utama." onClose={onClose}><div className="mb-4 grid grid-cols-3 gap-2">{[["jadwal", "Jadwal"], ["catatan", "Catatan"], ["revisi", "Revisi"]].map(([key, label]) => <button key={key} type="button" onClick={() => window.location.assign(`#thesis-sheet-${key}`)} className={cn("rounded-[11px] px-2 py-2 text-[10px] font-black", mode === key ? "bg-orange-500 text-white" : "bg-white text-neutral-500 ring-1 ring-black/5")}>{label}</button>)}</div>{mode === "jadwal" ? <SupervisionForm /> : <SupervisionDetailForm rows={rows} revision={mode === "revisi"} />}</Sheet>;
  }

  if (kind.startsWith("penelitian-")) {
    const mode = kind.split("-")[1];
    return <Sheet title="Tambah Penelitian" subtitle="Tracker, jadwal, dan catatan tetap satu alur." onClose={onClose}>{mode === "catatan" ? <ResearchNoteForm rows={rows} /> : <ResearchStepForm schedule={mode === "jadwal"} />}</Sheet>;
  }

  if (kind === "referensi") return <Sheet title="Tambah Referensi" subtitle="PDF tetap di Google Drive; OURJOURNAL menyimpan metadata dan link." onClose={onClose}><form action={addThesisReference} className="space-y-3"><div><FieldLabel>Judul jurnal / referensi</FieldLabel><textarea name="title" className="field min-h-20" required /></div><div><FieldLabel>Penulis</FieldLabel><input name="authors" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Tahun</FieldLabel><input name="publication_year" type="number" min="1800" max="2200" className="field" /></div><div><FieldLabel>Jurnal / Publisher</FieldLabel><input name="journal" className="field" /></div></div><div><FieldLabel>Tag</FieldLabel><input name="tags" className="field" placeholder="Jurnal Utama, Metode, BAB 2" /></div><div><FieldLabel>Catatan</FieldLabel><textarea name="notes" className="field min-h-20" /></div><div><FieldLabel>Link Google Drive</FieldLabel><input name="drive_url" type="url" className="field" placeholder="https://drive.google.com/..." /></div><div><FieldLabel>Link sumber / DOI</FieldLabel><input name="source_url" type="url" className="field" /></div><Submit /></form></Sheet>;

  if (kind === "file") return <Sheet title="Tambah File Skripsi" subtitle="File asli tetap di Drive. Di sini hanya dicatat versinya." onClose={onClose}><form action={addThesisFile} className="space-y-3"><div><FieldLabel>Nama file</FieldLabel><input name="file_name" className="field" required placeholder="Skripsi_v12_revisi_BAB3.docx" /></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Versi</FieldLabel><input name="version_label" className="field" placeholder="v12" /></div><div><FieldLabel>Kategori</FieldLabel><select name="category" className="field"><option>Skripsi</option><option>Proposal</option><option>BAB 1</option><option>BAB 2</option><option>BAB 3</option><option>BAB 4</option><option>BAB 5</option><option>Lampiran</option><option>Administrasi</option></select></div></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Status</FieldLabel><select name="status" className="field"><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select></div><div><FieldLabel>Tanggal</FieldLabel><input name="document_date" type="date" className="field" /></div></div><div><FieldLabel>Ukuran (opsional)</FieldLabel><input name="file_size_text" className="field" placeholder="2.4 MB" /></div><div><FieldLabel>Link Google Drive</FieldLabel><input name="drive_url" type="url" required className="field" placeholder="https://drive.google.com/..." /></div><div><FieldLabel>Catatan</FieldLabel><input name="notes" className="field" placeholder="Menunggu review" /></div><Submit /></form></Sheet>;

  if (kind === "administrasi") return <Sheet title="Tambah Checklist Administrasi" subtitle="Dokumen fisik tetap bisa disimpan di Drive." onClose={onClose}><form action={addThesisAdminItem} className="space-y-3"><div><FieldLabel>Tahap</FieldLabel><select name="phase" className="field"><option value="sempro">Sempro</option><option value="semhas">Semhas</option><option value="sidang">Sidang</option><option value="yudisium">Yudisium</option><option value="umum">Umum</option></select></div><div><FieldLabel>Checklist</FieldLabel><input name="title" required className="field" /></div><div><FieldLabel>Deadline</FieldLabel><input name="due_date" type="date" className="field" /></div><div><FieldLabel>Catatan</FieldLabel><textarea name="notes" className="field min-h-20" /></div><input type="hidden" name="position" value="0" /><Submit /></form></Sheet>;

  if (kind === "target") return <Sheet title="Tambah Target" subtitle="Buat tugas yang jelas, punya deadline, dan mudah dikerjakan." onClose={onClose}><form action={addThesisTask} className="space-y-3"><div><FieldLabel>Target / tugas</FieldLabel><input name="title" required className="field" /></div><div><FieldLabel>Detail</FieldLabel><textarea name="details" className="field min-h-20" /></div><div><FieldLabel>Deadline</FieldLabel><input name="due_at" type="datetime-local" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Prioritas</FieldLabel><select name="priority" className="field"><option value="normal">Normal</option><option value="high">Tinggi</option><option value="low">Rendah</option></select></div><div><FieldLabel>Fokus</FieldLabel><select name="focus_minutes" className="field"><option value="25">25 menit</option><option value="45">45 menit</option><option value="60">60 menit</option><option value="90">90 menit</option></select></div></div><Submit /></form></Sheet>;

  return null;
}

function SupervisionForm() {
  return <form action={addThesisSupervision} className="space-y-3"><div><FieldLabel>Topik bimbingan</FieldLabel><input name="topic" required className="field" placeholder="Pembahasan metode penelitian" /></div><div><FieldLabel>Tanggal & jam</FieldLabel><input name="scheduled_at" type="datetime-local" required className="field" /></div><div><FieldLabel>Dosen pembimbing</FieldLabel><input name="lecturer" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><FieldLabel>Mode</FieldLabel><select name="mode" className="field"><option value="offline">Offline</option><option value="online">Online</option></select></div><div><FieldLabel>Lokasi / Link</FieldLabel><input name="location" className="field" /></div></div><div><FieldLabel>Persiapan / Catatan awal</FieldLabel><textarea name="notes" className="field min-h-20" /></div><input type="hidden" name="revision" value="" /><input type="hidden" name="status" value="upcoming" /><Submit>Tambah Jadwal</Submit></form>;
}

function SupervisionDetailForm({ rows, revision }: { rows: any[]; revision: boolean }) {
  return <form action={updateThesisSupervisionDetail} className="space-y-3"><div><FieldLabel>Pilih bimbingan</FieldLabel><select name="id" className="field" required><option value="">Pilih jadwal...</option>{rows.map((row) => <option key={row.id} value={row.id}>{dateLabel(row.scheduled_at, true)} · {row.topic}</option>)}</select></div><input type="hidden" name="field" value={revision ? "revision" : "notes"} /><div><FieldLabel>{revision ? "Revisi dari dosen" : "Catatan hasil bimbingan"}</FieldLabel><textarea name="content" required className="field min-h-28" /></div>{revision && <><div><FieldLabel>Judul task (opsional)</FieldLabel><input name="task_title" className="field" placeholder="Revisi latar belakang" /></div><div><FieldLabel>Deadline revisi</FieldLabel><input name="due_at" type="datetime-local" className="field" /></div><label className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-[10px] font-bold text-orange-800"><input type="checkbox" name="create_task" defaultChecked /> Masukkan revisi ini ke Target & Prioritas</label></>}<Submit>{revision ? "Simpan Revisi" : "Simpan Catatan"}</Submit></form>;
}

function ResearchStepForm({ schedule }: { schedule: boolean }) {
  return <form action={addThesisResearchStep} className="space-y-3"><div><FieldLabel>{schedule ? "Kegiatan penelitian" : "Nama tahap"}</FieldLabel><input name="title" required className="field" placeholder={schedule ? "Persiapan sampel" : "Penelitian utama"} /></div><div><FieldLabel>{schedule ? "Catatan kegiatan" : "Deskripsi"}</FieldLabel><textarea name="description" className="field min-h-20" /></div><div><FieldLabel>{schedule ? "Tanggal kegiatan" : "Target selesai"}</FieldLabel><input name="target_date" type="date" className="field" /></div><div><FieldLabel>Status</FieldLabel><select name="status" className="field"><option value="todo">Belum mulai</option><option value="active">Sedang berjalan</option><option value="done">Selesai</option></select></div><input type="hidden" name="position" value="0" /><Submit>{schedule ? "Tambah Jadwal" : "Tambah Tahap"}</Submit></form>;
}

function ResearchNoteForm({ rows }: { rows: any[] }) {
  return <form action={updateThesisResearchDescription} className="space-y-3"><div><FieldLabel>Tahap penelitian</FieldLabel><select name="id" required className="field"><option value="">Pilih tahap...</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></div><div><FieldLabel>Catatan penelitian</FieldLabel><textarea name="description" required className="field min-h-32" placeholder="Hasil, kendala, keputusan berikutnya..." /></div><Submit>Simpan Catatan</Submit></form>;
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = keyFn(row);
    (acc[key] ||= []).push(row);
    return acc;
  }, {});
}
