"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
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
import { thesisTabs, type ThesisTab } from "@/features/academic/thesis-nav";

type OverviewData = {
  supervisions: any[];
  research: any[];
  tasks: any[];
  admin: any[];
  milestones: any[];
};

type Props = {
  tab: ThesisTab;
  firstName: string;
  workspace: any;
  rows: any[];
  overview: OverviewData;
  saved?: string;
  error?: string;
};

type SheetKind =
  | "workspace"
  | "bimbingan-menu"
  | "bimbingan-jadwal"
  | "bimbingan-catatan"
  | "bimbingan-revisi"
  | "penelitian-menu"
  | "penelitian-tahap"
  | "penelitian-jadwal"
  | "penelitian-catatan"
  | "referensi"
  | "file"
  | "administrasi"
  | "target"
  | null;

const addableTabs: ThesisTab[] = ["bimbingan", "penelitian", "referensi", "file", "administrasi", "target"];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null, year = false) {
  const date = parseDate(value);
  if (!date) return "Belum ditentukan";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
  });
}

function formatTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "--:--";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
}

function monthTitle(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Tanpa tanggal";
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function daysTo(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[18px] border border-black/[.045] bg-white shadow-[0_4px_18px_rgba(35,28,20,.045)] ${className}`}>{children}</div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[18px] border border-dashed border-black/10 bg-white/60 px-5 py-8 text-center text-xs font-bold text-neutral-400">{children}</div>;
}

function MiniTabs({ items, value, onChange }: { items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1.5 rounded-[14px] bg-white/80 p-1 shadow-sm ring-1 ring-black/5">
      {items.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={cx("rounded-[11px] px-2 py-2 text-[10px] font-black transition", value === key ? "bg-orange-500 text-white shadow-sm" : "text-neutral-600 active:bg-neutral-100")}>{label}</button>
      ))}
    </div>
  );
}

function ChipRow({ items, value, onChange }: { items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={cx("shrink-0 rounded-[11px] border px-3 py-2 text-[9px] font-black", value === key ? "border-orange-200 bg-orange-50 text-orange-700" : "border-black/5 bg-white text-neutral-600 shadow-sm")}>{label}</button>
      ))}
    </div>
  );
}

function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "orange" | "green" | "blue" | "red" }) {
  const classes = {
    neutral: "bg-neutral-100 text-neutral-600",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-600",
  };
  return <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-black ${classes[tone]}`}>{children}</span>;
}

function Toggle({ table, id, field, current, tab, children }: { table: string; id: string; field: "is_done" | "is_read"; current: boolean; tab: ThesisTab; children: ReactNode }) {
  return (
    <form action={updateThesisFlag}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="current" value={String(current)} />
      <input type="hidden" name="tab" value={tab} />
      <button className="block">{children}</button>
    </form>
  );
}

function DeleteButton({ table, id, tab }: { table: string; id: string; tab: ThesisTab }) {
  return (
    <form action={deleteThesisItem}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tab" value={tab} />
      <button aria-label="Hapus" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
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
          <div><h2 className="text-xl font-black">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-neutral-500">{subtitle}</p>}</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-black/5"><X size={17} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-neutral-500">{children}</label>;
}

function Submit({ children = "Simpan" }: { children?: ReactNode }) {
  return <button type="submit" className="mt-2 flex w-full items-center justify-center rounded-[14px] bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm active:scale-[.98]">{children}</button>;
}

function defaultSheet(tab: ThesisTab): SheetKind {
  if (tab === "bimbingan") return "bimbingan-menu";
  if (tab === "penelitian") return "penelitian-menu";
  if (tab === "referensi") return "referensi";
  if (tab === "file") return "file";
  if (tab === "administrasi") return "administrasi";
  if (tab === "target") return "target";
  return null;
}

export function ThesisMobileWorkspace({ tab, firstName, workspace, rows, overview, saved, error }: Props) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const title = thesisTabs.find(([key]) => key === tab)?.[1] || "Skripsi";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-3">
      <header className="relative flex min-h-11 items-center justify-center">
        <Link href="/academic" prefetch className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 active:bg-black/5" aria-label="Kembali"><ArrowLeft size={21} /></Link>
        <div className="px-12 text-center"><p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-500 md:hidden">Skripsi</p><h1 className="text-[17px] font-black">{title}</h1></div>
        {addableTabs.includes(tab) ? <button type="button" onClick={() => setSheet(defaultSheet(tab))} className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 active:bg-black/5" aria-label="Tambah"><Plus size={23} /></button> : tab === "overview" ? <button type="button" onClick={() => setSheet("workspace")} className="absolute right-0 rounded-full px-3 py-2 text-[10px] font-black text-orange-600">Atur</button> : null}
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {thesisTabs.map(([key, label]) => <Link key={key} href={`/academic/thesis?tab=${key}`} prefetch className={cx("shrink-0 rounded-[11px] border px-3 py-2 text-[9px] font-black", tab === key ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-black/5 bg-white text-neutral-600 shadow-sm")}>{label}</Link>)}
      </nav>

      {saved && <div className="rounded-[14px] bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">Data berhasil disimpan.</div>}
      {error && <div className="rounded-[14px] bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

      {tab === "overview" && <Overview workspace={workspace} data={overview} firstName={firstName} onSettings={() => setSheet("workspace")} />}
      {tab === "bimbingan" && <Bimbingan rows={rows} />}
      {tab === "penelitian" && <Penelitian rows={rows} />}
      {tab === "referensi" && <Referensi rows={rows} />}
      {tab === "file" && <Files rows={rows} driveFolder={workspace?.drive_folder_url} />}
      {tab === "administrasi" && <Administrasi rows={rows} />}
      {tab === "target" && <TargetPrioritas rows={rows} />}
      {tab === "notifikasi" && <Notifikasi rows={rows} />}
      {tab === "timeline" && <Timeline rows={rows} target={workspace?.target_graduation} quote={workspace?.quote} />}

      {sheet && <AddSheet kind={sheet} rows={rows} workspace={workspace} onClose={() => setSheet(null)} onChange={setSheet} />}
    </div>
  );
}

function Overview({ workspace, data, firstName, onSettings }: { workspace: any; data: OverviewData; firstName: string; onSettings: () => void }) {
  const progress = Number(workspace?.progress || 0);
  const next = data.supervisions[0];
  const tasks = data.tasks.filter((row) => !row.is_done);
  const doneResearch = data.research.filter((row) => row.status === "done").length;
  const researchProgress = data.research.length ? Math.round((doneResearch / data.research.length) * 100) : 0;
  const nearest = tasks.filter((row) => row.due_at).sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];

  return <div className="space-y-3">
    <Surface className="border-orange-100 bg-gradient-to-r from-[#fff9ef] to-white p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-orange-50 text-2xl">🎓</div><div className="min-w-0 flex-1"><p className="text-[11px] font-black">{workspace?.current_stage || "Semester Akhir"}</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{workspace?.title || `Tetap konsisten, ${firstName}. Kamu pasti bisa! ✨`}</p></div><button type="button" onClick={onSettings} className="text-[10px] font-black text-orange-600">Edit</button></div></Surface>

    <Surface className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">Progress Skripsi</h2><ChevronRight size={17} className="text-neutral-400" /></div><div className="flex items-center gap-4"><div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#f97316 ${progress * 3.6}deg, #f5e9dc 0deg)` }}><div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white text-xl font-black">{progress}%</div></div><div><p className="text-[10px] text-neutral-500">Dalam proses</p><p className="mt-0.5 text-base font-black">{workspace?.current_stage || "Persiapan"}</p><p className="mt-2 text-[10px] text-neutral-500">Target lulus: {workspace?.target_graduation ? formatDate(workspace.target_graduation, true) : "Belum diatur"}</p></div></div></Surface>

    <Surface className="p-4"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-orange-50 text-orange-500"><Calendar size={21} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black text-neutral-500">Bimbingan berikutnya</p>{next ? <><p className="mt-1 text-sm font-black">{formatDate(next.scheduled_at)} · {formatTime(next.scheduled_at)}</p><p className="mt-0.5 text-[10px] text-neutral-500">{next.lecturer || "Dosen pembimbing"}</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{next.topic}</p></> : <p className="mt-2 text-xs font-bold text-neutral-400">Belum ada jadwal bimbingan.</p>}</div><ChevronRight size={17} className="mt-1 text-neutral-400" /></div></Surface>

    <Surface className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">Target minggu ini</h2><span className="text-[10px] font-bold text-neutral-400">{tasks.length} aktif</span></div><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#f4e8db]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${tasks.length ? 45 : 0}%` }} /></div>{tasks.length ? <div className="space-y-2.5">{tasks.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-2.5"><Toggle table="thesis_tasks" id={task.id} field="is_done" current={Boolean(task.is_done)} tab="overview"><span className="flex h-4 w-4 rounded border border-neutral-300 bg-white" /></Toggle><p className="min-w-0 flex-1 truncate text-[11px] font-semibold">{task.title}</p></div>)}</div> : <p className="text-[11px] text-neutral-400">Belum ada target aktif.</p>}</Surface>

    <div className="grid gap-3 sm:grid-cols-2"><Surface className="p-4"><div className="mb-2 flex items-center gap-2"><FlaskConical size={17} className="text-orange-500" /><h2 className="text-xs font-black">Progress Penelitian</h2></div><div className="flex items-end justify-between"><span className="text-2xl font-black">{researchProgress}%</span><span className="text-[9px] text-neutral-400">{doneResearch}/{data.research.length} selesai</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4e8db]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${researchProgress}%` }} /></div></Surface><Surface className="p-4"><div className="mb-2 flex items-center gap-2"><Clock size={17} className="text-orange-500" /><h2 className="text-xs font-black">Deadline terdekat</h2></div>{nearest ? <><p className="truncate text-sm font-black">{nearest.title}</p><p className="mt-1 text-[10px] text-neutral-500">{formatDate(nearest.due_at, true)}</p></> : <p className="text-[11px] text-neutral-400">Belum ada deadline.</p>}</Surface></div>

    <Surface className="bg-gradient-to-br from-[#fff7ea] to-[#fffdf9] p-5 text-center"><Sparkles size={20} className="mx-auto text-orange-400" /><p className="mt-2 text-sm font-black italic leading-6">“{workspace?.quote || "Setiap progres kecil tetaplah progres."}”</p><p className="mt-1 text-[10px] text-neutral-400">Kamu sudah sejauh ini. Lanjut sedikit lagi.</p></Surface>
  </div>;
}

function Bimbingan({ rows }: { rows: any[] }) {
  const [sub, setSub] = useState("jadwal");
  const [filter, setFilter] = useState("all");
  const visible = useMemo(() => rows.filter((row) => {
    if (sub === "catatan") return Boolean(row.notes);
    if (sub === "revisi") return Boolean(row.revision);
    if (filter === "upcoming") return row.status === "upcoming";
    if (filter === "done") return row.status === "done";
    return row.status !== "cancelled";
  }), [rows, sub, filter]);
  const groups = groupBy(visible, (row) => monthTitle(row.scheduled_at));

  return <div className="space-y-4"><MiniTabs items={[["jadwal", "Jadwal"], ["catatan", "Catatan"], ["revisi", "Revisi"]]} value={sub} onChange={setSub} />{sub === "jadwal" && <ChipRow items={[["all", "Semua"], ["upcoming", "Akan Datang"], ["done", "Selesai"]]} value={filter} onChange={setFilter} />}{!visible.length ? <Empty>{sub === "jadwal" ? "Belum ada jadwal bimbingan." : sub === "catatan" ? "Belum ada catatan bimbingan." : "Belum ada revisi bimbingan."}</Empty> : Object.entries(groups).map(([month, items]) => <section key={month}><h2 className="mb-2 text-sm font-black">{month}</h2><div className="space-y-2.5">{items.map((row) => sub === "jadwal" ? <SupervisionCard key={row.id} row={row} /> : <Surface key={row.id} className="p-4"><p className="text-[9px] font-black text-orange-600">{formatDate(row.scheduled_at, true)}</p><p className="mt-1 text-xs font-black">{row.topic}</p><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-600">{sub === "revisi" ? row.revision : row.notes}</p></Surface>)}</div></section>)}</div>;
}

function SupervisionCard({ row }: { row: any }) {
  const date = parseDate(row.scheduled_at);
  return <Surface className="p-3.5"><div className="flex gap-3"><div className="w-11 shrink-0 text-center"><p className="text-[9px] font-black text-neutral-500">{date ? date.toLocaleDateString("id-ID", { weekday: "short" }) : "-"}</p><p className="text-xl font-black leading-6">{date ? date.getDate() : "--"}</p><p className="text-[9px] font-bold text-neutral-500">{date ? date.toLocaleDateString("id-ID", { month: "short" }) : "-"}</p></div><div className="min-w-0 flex-1 border-l border-black/5 pl-3"><div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-black">{row.topic || "Bimbingan Skripsi"}</p><Status tone={row.status === "done" ? "green" : "blue"}>{row.status === "done" ? "Selesai" : "Akan datang"}</Status></div><div className="mt-2 space-y-1 text-[10px] text-neutral-500"><p className="flex items-center gap-1.5"><Clock size={12} /> {formatTime(row.scheduled_at)}</p><p className="flex items-center gap-1.5"><UserRound size={12} /> {row.lecturer || "Dosen pembimbing"}</p><p className="flex items-center gap-1.5"><MapPin size={12} /> {row.location || (row.mode === "online" ? "Online" : "Offline")}</p></div><div className="mt-3 flex items-center justify-between"><form action={setSupervisionStatus} className="flex gap-1.5"><input type="hidden" name="id" value={row.id} /><button name="status" value="upcoming" className="rounded-lg bg-blue-50 px-2 py-1 text-[8px] font-black text-blue-700">Akan datang</button><button name="status" value="done" className="rounded-lg bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">Selesai</button></form><DeleteButton table="thesis_supervisions" id={row.id} tab="bimbingan" /></div></div></div></Surface>;
}

function Penelitian({ rows }: { rows: any[] }) {
  const [sub, setSub] = useState("tracker");
  const done = rows.filter((row) => row.status === "done").length;
  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const scheduled = rows.filter((row) => row.target_date);
  const notes = rows.filter((row) => row.description);
  return <div className="space-y-4"><MiniTabs items={[["tracker", "Tracker"], ["jadwal", "Jadwal"], ["catatan", "Catatan"]]} value={sub} onChange={setSub} />{sub === "tracker" && <><Surface className="p-4"><div className="flex items-end justify-between"><div><p className="text-sm font-black">Progress Penelitian</p><p className="mt-1 text-[10px] text-neutral-400">{done}/{rows.length} selesai</p></div><p className="text-sm font-black">{progress}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e5d8]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></div></Surface>{!rows.length ? <Empty>Belum ada tahapan penelitian.</Empty> : <Surface className="p-4">{rows.map((row, index) => <ResearchRow key={row.id} row={row} last={index === rows.length - 1} />)}</Surface>}</>}{sub === "jadwal" && (!scheduled.length ? <Empty>Belum ada jadwal penelitian.</Empty> : <div className="space-y-2">{scheduled.map((row) => <Surface key={row.id} className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-orange-50 text-orange-500"><FlaskConical size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{row.title}</p><p className="mt-1 text-[10px] text-neutral-500">{formatDate(row.target_date, true)}</p></div><ChevronRight size={16} className="text-neutral-300" /></Surface>)}</div>)}{sub === "catatan" && (!notes.length ? <Empty>Belum ada catatan penelitian.</Empty> : <div className="space-y-2">{notes.map((row) => <Surface key={row.id} className="p-4"><p className="text-xs font-black">{row.title}</p><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-600">{row.description}</p></Surface>)}</div>)}</div>;
}

function ResearchRow({ row, last }: { row: any; last: boolean }) {
  const done = row.status === "done";
  const active = row.status === "active";
  return <div className="relative flex gap-3 pb-5">{!last && <div className="absolute left-[9px] top-5 h-[calc(100%-7px)] w-px bg-neutral-200" />}<div className={cx("relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-500 text-white" : active ? "border-[5px] border-orange-500 bg-white" : "bg-neutral-200")}>{done && <Check size={11} />}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><p className="text-xs font-black">{row.title}</p><p className={cx("mt-0.5 text-[9px] font-bold", done ? "text-emerald-600" : active ? "text-orange-600" : "text-neutral-400")}>{done ? "Selesai" : active ? "Sedang berjalan" : "Belum mulai"}</p></div><p className="shrink-0 text-[9px] text-neutral-400">{row.target_date ? formatDate(row.target_date) : "-"}</p></div>{row.description && <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-neutral-500">{row.description}</p>}<form action={setResearchStatus} className="mt-2 flex gap-1.5"><input type="hidden" name="id" value={row.id} /><button name="status" value="todo" className="rounded-md bg-neutral-100 px-2 py-1 text-[8px] font-black text-neutral-500">Belum</button><button name="status" value="active" className="rounded-md bg-orange-50 px-2 py-1 text-[8px] font-black text-orange-600">Proses</button><button name="status" value="done" className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-600">Selesai</button></form></div></div>;
}

function Referensi({ rows }: { rows: any[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const filters = ["Semua", "Jurnal Utama", "Metode", "Latar Belakang", "Penelitian Terdahulu"];
  const visible = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title || ""} ${row.authors || ""} ${row.journal || ""} ${(row.tags || []).join(" ")}`.toLowerCase();
    const searchOk = !search || haystack.includes(search.toLowerCase());
    const filterOk = filter === "Semua" || (row.tags || []).some((tag: string) => tag.toLowerCase() === filter.toLowerCase());
    return searchOk && filterOk;
  }), [rows, search, filter]);
  return <div className="space-y-3"><div className="flex items-center gap-2 rounded-[13px] bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5"><Search size={16} className="text-neutral-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" placeholder="Cari jurnal, topik, atau penulis..." /></div><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={cx("shrink-0 rounded-[10px] px-3 py-2 text-[9px] font-black", filter === item ? "bg-orange-500 text-white" : "bg-white text-neutral-500 shadow-sm ring-1 ring-black/5")}>{item}</button>)}</div>{!visible.length ? <Empty>Belum ada referensi yang cocok.</Empty> : <div className="space-y-2">{visible.map((row) => <Surface key={row.id} className="p-3.5"><div className="flex gap-3"><Toggle table="thesis_references" id={row.id} field="is_read" current={Boolean(row.is_read)} tab="referensi"><span className={cx("mt-0.5 flex h-4 w-4 items-center justify-center rounded border", row.is_read ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white")}>{row.is_read && <Check size={11} />}</span></Toggle><div className="min-w-0 flex-1"><div className="flex gap-2"><p className="min-w-0 flex-1 text-[11px] font-black leading-4">{row.title}</p><MoreVertical size={15} className="text-neutral-400" /></div><p className="mt-1 text-[9px] text-neutral-500">{row.authors || "Penulis belum diisi"}{row.publication_year ? ` (${row.publication_year})` : ""}</p>{row.journal && <p className="mt-0.5 text-[9px] text-neutral-400">{row.journal}</p>}<div className="mt-2 flex flex-wrap gap-1.5">{(row.tags || []).slice(0, 5).map((tag: string) => <Status key={tag} tone="blue">{tag}</Status>)}</div><div className="mt-2 flex items-center gap-3">{row.drive_url && <a href={row.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-orange-600"><FolderOpen size={12} /> Drive</a>}{row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-neutral-500"><ExternalLink size={12} /> Sumber</a>}<div className="ml-auto"><DeleteButton table="thesis_references" id={row.id} tab="referensi" /></div></div></div></div></Surface>)}</div>}</div>;
}

function Files({ rows, driveFolder }: { rows: any[]; driveFolder?: string }) {
  const [filter, setFilter] = useState("all");
  const visible = rows.filter((row) => filter === "all" || row.status === filter);
  return <div className="space-y-3"><MiniTabs items={[["all", "Semua"], ["draft", "Draft"], ["sent", "Dikirim"], ["revision", "Revisi"], ["approved", "ACC"]]} value={filter} onChange={setFilter} />{driveFolder && <a href={driveFolder} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-[14px] bg-orange-50 px-4 py-3 text-[10px] font-black text-orange-700"><span className="inline-flex items-center gap-2"><FolderOpen size={16} /> Buka folder Skripsi di Drive</span><ExternalLink size={14} /></a>}{!visible.length ? <Empty>Belum ada file pada kategori ini.</Empty> : <div className="space-y-2">{visible.map((row) => <FileCard key={row.id} row={row} />)}</div>}</div>;
}

function FileCard({ row }: { row: any }) {
  const label = row.status === "approved" ? "ACC" : row.status === "revision" ? "Revisi" : row.status === "sent" ? "Dikirim" : "Draft";
  const tone: "green" | "red" | "blue" | "neutral" = row.status === "approved" ? "green" : row.status === "revision" ? "red" : row.status === "sent" ? "blue" : "neutral";
  return <Surface className="p-3.5"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-50 text-blue-600"><FileText size={19} /></div><div className="min-w-0 flex-1"><div className="flex gap-2"><p className="min-w-0 flex-1 break-words text-[11px] font-black leading-4">{row.file_name}</p><MoreVertical size={15} className="text-neutral-400" /></div><p className="mt-1 text-[9px] text-neutral-400">{formatDate(row.document_date, true)}{row.file_size_text ? ` · ${row.file_size_text}` : ""}{row.version_label ? ` · ${row.version_label}` : ""}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><Status tone={tone}>{label}</Status>{row.notes && <span className="text-[9px] text-neutral-500">{row.notes}</span>}</div><div className="mt-3 flex items-center gap-2"><a href={row.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1.5 text-[9px] font-black text-orange-700"><ExternalLink size={11} /> Buka Drive</a><form action={setFileStatus} className="flex gap-1"><input type="hidden" name="id" value={row.id} /><button name="status" value="sent" className="rounded-lg bg-blue-50 px-2 py-1.5 text-[8px] font-black text-blue-600">Dikirim</button><button name="status" value="approved" className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[8px] font-black text-emerald-600">ACC</button></form><div className="ml-auto"><DeleteButton table="thesis_files" id={row.id} tab="file" /></div></div></div></div></Surface>;
}

function Administrasi({ rows }: { rows: any[] }) {
  const [phase, setPhase] = useState("sempro");
  const visible = rows.filter((row) => row.phase === phase || (phase === "sempro" && row.phase === "umum"));
  const done = visible.filter((row) => row.is_done).length;
  const progress = visible.length ? Math.round((done / visible.length) * 100) : 0;
  return <div className="space-y-4"><MiniTabs items={[["sempro", "Sempro"], ["semhas", "Semhas"], ["sidang", "Sidang"], ["yudisium", "Yudisium"]]} value={phase} onChange={setPhase} /><Surface className="p-4"><div className="flex items-end justify-between"><div><h2 className="text-sm font-black">Checklist {phase.charAt(0).toUpperCase() + phase.slice(1)}</h2><p className="mt-1 text-[10px] text-neutral-400">{done}/{visible.length} selesai</p></div><span className="text-[10px] font-black text-neutral-500">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2e5d8]"><div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></div><div className="mt-4 space-y-3">{visible.length ? visible.map((row) => <div key={row.id} className="flex items-center gap-3"><Toggle table="thesis_admin_items" id={row.id} field="is_done" current={Boolean(row.is_done)} tab="administrasi"><span className={cx("flex h-4 w-4 items-center justify-center rounded border", row.is_done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white")}>{row.is_done && <Check size={11} />}</span></Toggle><div className="min-w-0 flex-1"><p className={cx("text-[11px] font-semibold", row.is_done && "text-neutral-400 line-through")}>{row.title}</p>{row.due_date && <p className="text-[9px] text-neutral-400">Deadline {formatDate(row.due_date, true)}</p>}</div><DeleteButton table="thesis_admin_items" id={row.id} tab="administrasi" /></div>) : <p className="text-[11px] text-neutral-400">Belum ada checklist.</p>}</div></Surface><div className="rounded-[15px] bg-emerald-50/70 p-4 text-[10px] leading-5 text-emerald-800">Pastikan semua berkas lengkap sesuai ketentuan kampus/fakultas. Dokumen pendukung tetap bisa disimpan di Google Drive.</div></div>;
}

function TargetPrioritas({ rows }: { rows: any[] }) {
  const [period, setPeriod] = useState("today");
  const today = new Date();
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const visible = rows.filter((row) => {
    if (period === "all") return true;
    if (!row.due_at) return period === "week";
    const due = new Date(row.due_at);
    return period === "today" ? due.toDateString() === today.toDateString() : due <= nextWeek;
  });
  const priority = rows.find((row) => !row.is_done && row.priority === "high") || rows.find((row) => !row.is_done);
  return <div className="space-y-4"><MiniTabs items={[["today", "Hari Ini"], ["week", "Minggu Ini"], ["all", "Semua"]]} value={period} onChange={setPeriod} /><Surface className="border-orange-100 bg-gradient-to-br from-[#fffaf4] to-white p-4"><div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Target size={22} /></div><div><p className="text-xs font-black">Apa yang harus aku kerjakan sekarang?</p><p className="mt-1 text-[10px] text-neutral-500">Berdasarkan deadline dan prioritasmu.</p></div></div></Surface>{priority && <Surface className="border-red-100 bg-[#fff9f8] p-4"><p className="text-[10px] font-black text-red-500">Prioritas hari ini</p><p className="mt-2 text-sm font-black">{priority.title}</p>{priority.details && <p className="mt-1 text-[10px] leading-4 text-neutral-500">{priority.details}</p>}{priority.due_at && <p className="mt-2 text-[10px] font-bold text-red-500">Deadline {formatDate(priority.due_at, true)}</p>}<Link href="/academic/study" prefetch className="mt-4 flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-xs font-black text-white">▶ Mulai fokus {priority.focus_minutes || 45} menit</Link></Surface>}<section><h2 className="mb-2 text-sm font-black">Tugas lainnya</h2>{!visible.length ? <Empty>Tidak ada target pada periode ini.</Empty> : <div className="space-y-2">{visible.map((row) => <Surface key={row.id} className="flex items-center gap-3 p-3.5"><Toggle table="thesis_tasks" id={row.id} field="is_done" current={Boolean(row.is_done)} tab="target"><span className={cx("flex h-4 w-4 items-center justify-center rounded border", row.is_done ? "border-orange-500 bg-orange-500 text-white" : "border-neutral-300 bg-white")}>{row.is_done && <Check size={11} />}</span></Toggle><div className="min-w-0 flex-1"><p className={cx("truncate text-[11px] font-bold", row.is_done && "text-neutral-400 line-through")}>{row.title}</p>{row.due_at && <p className="mt-0.5 text-[9px] text-neutral-400">{formatDate(row.due_at, true)}</p>}</div>{row.priority === "high" && <Status tone="red">Penting</Status>}<DeleteButton table="thesis_tasks" id={row.id} tab="target" /></Surface>)}</div>}</section></div>;
}

function Notifikasi({ rows }: { rows: any[] }) {
  const [filter, setFilter] = useState("all");
  const visible = rows.filter((row) => filter === "all" || row.kind === filter);
  return <div className="space-y-4"><ChipRow items={[["all", "Semua"], ["supervision", "Bimbingan"], ["deadline", "Deadline"], ["feedback", "Feedback"], ["system", "Sistem"]]} value={filter} onChange={setFilter} />{!visible.length ? <Empty>Belum ada notifikasi Skripsi.</Empty> : <Surface className="divide-y divide-black/5">{visible.map((row) => <div key={row.id} className="flex gap-3 p-4"><Toggle table="thesis_notifications" id={row.id} field="is_read" current={Boolean(row.is_read)} tab="notifikasi"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Bell size={16} /></span></Toggle><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="text-[11px] font-black">{row.title}</p><span className="text-[8px] text-neutral-400">{formatTime(row.created_at)}</span></div><p className="mt-1 text-[10px] leading-4 text-neutral-500">{row.message}</p></div></div>)}</Surface>}</div>;
}

function Timeline({ rows, target, quote }: { rows: any[]; target?: string; quote?: string }) {
  const [sub, setSub] = useState("timeline");
  const days = daysTo(target);
  const grouped = groupBy(rows.filter((row) => row.target_date), (row) => monthTitle(row.target_date));
  return <div className="space-y-4"><Surface className="p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-orange-50 text-orange-500"><Calendar size={23} /></div><div className="min-w-0 flex-1"><p className="text-2xl font-black">{days === null ? "Atur target lulus" : `${days} hari lagi`}</p><p className="text-[10px] text-neutral-500">Menuju target lulus{target ? ` · ${formatDate(target, true)}` : ""}</p></div><div className="rounded-full bg-orange-50 px-3 py-2 text-center text-[8px] font-black text-orange-700">Kamu bisa<br />pasti bisa!</div></div></Surface><MiniTabs items={[["timeline", "Timeline"], ["calendar", "Kalender"]]} value={sub} onChange={setSub} />{sub === "timeline" ? (!rows.length ? <Empty>Belum ada milestone Skripsi.</Empty> : <Surface className="p-4">{rows.map((row, index) => <div key={row.id} className="relative flex gap-3 pb-5">{index < rows.length - 1 && <div className="absolute left-[9px] top-5 h-[calc(100%-7px)] w-px bg-neutral-200" />}<div className={cx("relative z-10 mt-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full", row.is_done ? "bg-emerald-500 text-white" : "bg-neutral-200")}>{row.is_done && <Check size={11} />}</div><div className="flex min-w-0 flex-1 justify-between gap-4"><div><p className="text-xs font-black">{row.title}</p>{row.target_date && <p className="mt-1 text-[9px] text-neutral-400">{formatDate(row.target_date, true)}</p>}</div><Toggle table="thesis_milestones" id={row.id} field="is_done" current={Boolean(row.is_done)} tab="timeline"><span className="text-[9px] font-black text-orange-600">{row.is_done ? "Selesai" : "Tandai"}</span></Toggle></div></div>)}</Surface>) : (Object.keys(grouped).length ? <div className="space-y-4">{Object.entries(grouped).map(([month, items]) => <section key={month}><h2 className="mb-2 text-xs font-black">{month}</h2><Surface className="divide-y divide-black/5">{items.map((row) => <div key={row.id} className="flex items-center gap-3 p-3.5"><Calendar size={15} className="text-orange-500" /><div className="min-w-0 flex-1"><p className="text-[11px] font-black">{row.title}</p><p className="text-[9px] text-neutral-400">{formatDate(row.target_date, true)}</p></div>{row.is_done && <CheckCircle2 size={16} className="text-emerald-500" />}</div>)}</Surface></section>)}</div> : <Empty>Belum ada tanggal milestone.</Empty>)}<Surface className="bg-[#fff7eb] p-5 text-center"><p className="text-sm font-black italic leading-6 text-neutral-700">“{quote || "Setiap progres kecil tetaplah progres. Kamu sudah sejauh ini."}”</p></Surface></div>;
}

function AddSheet({ kind, rows, workspace, onClose, onChange }: { kind: Exclude<SheetKind, null>; rows: any[]; workspace: any; onClose: () => void; onChange: (kind: SheetKind) => void }) {
  if (kind === "bimbingan-menu") return <Sheet title="Tambah Bimbingan" subtitle="Pilih jenis data yang ingin ditambahkan." onClose={onClose}><div className="grid gap-2"><Choice icon={<Calendar size={18} />} title="Jadwal Bimbingan" subtitle="Tanggal, dosen, lokasi, dan topik." onClick={() => onChange("bimbingan-jadwal")} /><Choice icon={<FileText size={18} />} title="Catatan Bimbingan" subtitle="Tempelkan hasil pembahasan ke jadwal yang sudah ada." onClick={() => onChange("bimbingan-catatan")} /><Choice icon={<Target size={18} />} title="Revisi Dosen" subtitle="Catat revisi dan opsional jadikan target otomatis." onClick={() => onChange("bimbingan-revisi")} /></div></Sheet>;
  if (kind === "penelitian-menu") return <Sheet title="Tambah Penelitian" subtitle="Pilih data penelitian yang ingin dicatat." onClose={onClose}><div className="grid gap-2"><Choice icon={<FlaskConical size={18} />} title="Tahap Penelitian" subtitle="Tambah langkah baru pada tracker." onClick={() => onChange("penelitian-tahap")} /><Choice icon={<Calendar size={18} />} title="Jadwal Penelitian" subtitle="Kegiatan penelitian dengan target tanggal." onClick={() => onChange("penelitian-jadwal")} /><Choice icon={<FileText size={18} />} title="Catatan Penelitian" subtitle="Tambahkan hasil atau kendala pada tahap." onClick={() => onChange("penelitian-catatan")} /></div></Sheet>;

  if (kind === "workspace") return <Sheet title="Atur Workspace Skripsi" subtitle="Data ini privat untuk akunmu." onClose={onClose}><form action={saveThesisWorkspace} className="space-y-3"><div><Label>Judul Skripsi</Label><textarea name="title" defaultValue={workspace?.title || ""} className="field min-h-20" /></div><div className="grid grid-cols-2 gap-2"><div><Label>Institusi</Label><input name="institution" defaultValue={workspace?.institution || ""} className="field" /></div><div><Label>Program Studi</Label><input name="program" defaultValue={workspace?.program || ""} className="field" /></div></div><div className="grid grid-cols-2 gap-2"><div><Label>Pembimbing 1</Label><input name="supervisor" defaultValue={workspace?.supervisor || ""} className="field" /></div><div><Label>Pembimbing 2</Label><input name="co_supervisor" defaultValue={workspace?.co_supervisor || ""} className="field" /></div></div><div className="grid grid-cols-2 gap-2"><div><Label>Tahap sekarang</Label><input name="current_stage" defaultValue={workspace?.current_stage || "Persiapan"} className="field" /></div><div><Label>Progress %</Label><input name="progress" type="number" min="0" max="100" defaultValue={workspace?.progress || 0} className="field" /></div></div><div><Label>Target lulus</Label><input name="target_graduation" type="date" defaultValue={workspace?.target_graduation || ""} className="field" /></div><div><Label>Folder utama Google Drive</Label><input name="drive_folder_url" type="url" defaultValue={workspace?.drive_folder_url || ""} className="field" placeholder="https://drive.google.com/..." /></div><div><Label>Kalimat penyemangat</Label><input name="quote" defaultValue={workspace?.quote || ""} className="field" /></div><Submit /></form></Sheet>;

  if (kind === "bimbingan-jadwal") return <Sheet title="Tambah Jadwal Bimbingan" onClose={onClose}><form action={addThesisSupervision} className="space-y-3"><div><Label>Topik bimbingan</Label><input name="topic" required className="field" /></div><div><Label>Tanggal & jam</Label><input name="scheduled_at" type="datetime-local" required className="field" /></div><div><Label>Dosen pembimbing</Label><input name="lecturer" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><Label>Mode</Label><select name="mode" className="field"><option value="offline">Offline</option><option value="online">Online</option></select></div><div><Label>Lokasi / link</Label><input name="location" className="field" /></div></div><div><Label>Catatan persiapan</Label><textarea name="notes" className="field min-h-20" /></div><input type="hidden" name="revision" value="" /><input type="hidden" name="status" value="upcoming" /><Submit>Tambah Jadwal</Submit></form></Sheet>;

  if (kind === "bimbingan-catatan" || kind === "bimbingan-revisi") {
    const revision = kind === "bimbingan-revisi";
    return <Sheet title={revision ? "Tambah Revisi Dosen" : "Tambah Catatan Bimbingan"} onClose={onClose}><form action={updateThesisSupervisionDetail} className="space-y-3"><div><Label>Pilih bimbingan</Label><select name="id" className="field" required><option value="">Pilih jadwal...</option>{rows.map((row) => <option key={row.id} value={row.id}>{formatDate(row.scheduled_at, true)} · {row.topic}</option>)}</select></div><input type="hidden" name="field" value={revision ? "revision" : "notes"} /><div><Label>{revision ? "Revisi dari dosen" : "Catatan hasil bimbingan"}</Label><textarea name="content" required className="field min-h-28" /></div>{revision && <><div><Label>Judul target</Label><input name="task_title" className="field" placeholder="Revisi latar belakang" /></div><div><Label>Deadline revisi</Label><input name="due_at" type="datetime-local" className="field" /></div><label className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-[10px] font-bold text-orange-800"><input type="checkbox" name="create_task" defaultChecked /> Masukkan ke Target & Prioritas</label></>}<Submit>{revision ? "Simpan Revisi" : "Simpan Catatan"}</Submit></form></Sheet>;
  }

  if (kind === "penelitian-tahap" || kind === "penelitian-jadwal") {
    const schedule = kind === "penelitian-jadwal";
    return <Sheet title={schedule ? "Tambah Jadwal Penelitian" : "Tambah Tahap Penelitian"} onClose={onClose}><form action={addThesisResearchStep} className="space-y-3"><div><Label>{schedule ? "Kegiatan penelitian" : "Nama tahap"}</Label><input name="title" required className="field" /></div><div><Label>Catatan / deskripsi</Label><textarea name="description" className="field min-h-20" /></div><div><Label>{schedule ? "Tanggal kegiatan" : "Target selesai"}</Label><input name="target_date" type="date" className="field" /></div><div><Label>Status</Label><select name="status" className="field"><option value="todo">Belum mulai</option><option value="active">Sedang berjalan</option><option value="done">Selesai</option></select></div><input type="hidden" name="position" value="0" /><Submit /></form></Sheet>;
  }

  if (kind === "penelitian-catatan") return <Sheet title="Tambah Catatan Penelitian" onClose={onClose}><form action={updateThesisResearchDescription} className="space-y-3"><div><Label>Tahap penelitian</Label><select name="id" required className="field"><option value="">Pilih tahap...</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></div><div><Label>Catatan penelitian</Label><textarea name="description" required className="field min-h-32" placeholder="Hasil, kendala, keputusan berikutnya..." /></div><Submit /></form></Sheet>;

  if (kind === "referensi") return <Sheet title="Tambah Referensi" subtitle="PDF tetap di Google Drive." onClose={onClose}><form action={addThesisReference} className="space-y-3"><div><Label>Judul jurnal / referensi</Label><textarea name="title" className="field min-h-20" required /></div><div><Label>Penulis</Label><input name="authors" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><Label>Tahun</Label><input name="publication_year" type="number" min="1800" max="2200" className="field" /></div><div><Label>Jurnal / publisher</Label><input name="journal" className="field" /></div></div><div><Label>Tag</Label><input name="tags" className="field" placeholder="Jurnal Utama, Metode, BAB 2" /></div><div><Label>Catatan</Label><textarea name="notes" className="field min-h-20" /></div><div><Label>Link Google Drive</Label><input name="drive_url" type="url" className="field" /></div><div><Label>Link sumber / DOI</Label><input name="source_url" type="url" className="field" /></div><Submit /></form></Sheet>;

  if (kind === "file") return <Sheet title="Tambah File Skripsi" subtitle="File asli tetap tersimpan di Drive." onClose={onClose}><form action={addThesisFile} className="space-y-3"><div><Label>Nama file</Label><input name="file_name" className="field" required /></div><div className="grid grid-cols-2 gap-2"><div><Label>Versi</Label><input name="version_label" className="field" placeholder="v12" /></div><div><Label>Kategori</Label><select name="category" className="field"><option>Skripsi</option><option>Proposal</option><option>BAB 1</option><option>BAB 2</option><option>BAB 3</option><option>BAB 4</option><option>BAB 5</option><option>Lampiran</option><option>Administrasi</option></select></div></div><div className="grid grid-cols-2 gap-2"><div><Label>Status</Label><select name="status" className="field"><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select></div><div><Label>Tanggal</Label><input name="document_date" type="date" className="field" /></div></div><div><Label>Ukuran</Label><input name="file_size_text" className="field" placeholder="2.4 MB" /></div><div><Label>Link Google Drive</Label><input name="drive_url" type="url" required className="field" /></div><div><Label>Catatan status</Label><input name="notes" className="field" placeholder="Menunggu review" /></div><Submit /></form></Sheet>;

  if (kind === "administrasi") return <Sheet title="Tambah Checklist Administrasi" onClose={onClose}><form action={addThesisAdminItem} className="space-y-3"><div><Label>Tahap</Label><select name="phase" className="field"><option value="sempro">Sempro</option><option value="semhas">Semhas</option><option value="sidang">Sidang</option><option value="yudisium">Yudisium</option><option value="umum">Umum</option></select></div><div><Label>Checklist</Label><input name="title" required className="field" /></div><div><Label>Deadline</Label><input name="due_date" type="date" className="field" /></div><div><Label>Catatan</Label><textarea name="notes" className="field min-h-20" /></div><input type="hidden" name="position" value="0" /><Submit /></form></Sheet>;

  if (kind === "target") return <Sheet title="Tambah Target" onClose={onClose}><form action={addThesisTask} className="space-y-3"><div><Label>Target / tugas</Label><input name="title" required className="field" /></div><div><Label>Detail</Label><textarea name="details" className="field min-h-20" /></div><div><Label>Deadline</Label><input name="due_at" type="datetime-local" className="field" /></div><div className="grid grid-cols-2 gap-2"><div><Label>Prioritas</Label><select name="priority" className="field"><option value="normal">Normal</option><option value="high">Tinggi</option><option value="low">Rendah</option></select></div><div><Label>Durasi fokus</Label><select name="focus_minutes" className="field"><option value="25">25 menit</option><option value="45">45 menit</option><option value="60">60 menit</option><option value="90">90 menit</option></select></div></div><Submit /></form></Sheet>;

  return null;
}

function Choice({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-[16px] bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[.99]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-orange-50 text-orange-600">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-black">{title}</span><span className="mt-1 block text-[10px] leading-4 text-neutral-500">{subtitle}</span></span><ChevronRight size={17} className="text-neutral-300" /></button>;
}

function groupBy(rows: any[], keyFn: (row: any) => string) {
  const result: Record<string, any[]> = {};
  for (const row of rows) {
    const key = keyFn(row);
    if (!result[key]) result[key] = [];
    result[key].push(row);
  }
  return result;
}
