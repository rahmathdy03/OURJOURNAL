"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
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

function fmtDate(value?: string | null) {
  if (!value) return "Belum ditentukan";
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return "Belum ditentukan";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(value?: string | null) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function Progress({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${safe}%` }} /></div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-6 py-10 text-center text-sm font-semibold text-neutral-400">{children}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
    <button aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
    <div className="relative z-10 max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-[#faf8f4] p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function Submit({ children = "Simpan" }: { children?: ReactNode }) {
  return <button type="submit" className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm">{children}</button>;
}

function Delete({ table, id, tab }: { table: string; id: string; tab: ThesisTab }) {
  return <form action={deleteThesisItem}><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /><input type="hidden" name="tab" value={tab} /><button aria-label="Hapus" className="rounded-lg p-2 text-neutral-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button></form>;
}

export function ThesisDesktopWorkspace({ tab, firstName, workspace, rows, overview, saved, error }: Props) {
  const [modal, setModal] = useState<"settings" | "add" | null>(null);
  const title = thesisTabs.find(([key]) => key === tab)?.[1] || "Skripsi";
  const canAdd = ["bimbingan", "penelitian", "referensi", "file", "administrasi", "target"].includes(tab);

  return <div className="w-full space-y-6">
    <div className="flex items-start justify-between gap-6">
      <div className="flex items-start gap-4">
        <Link href="/academic" prefetch className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50"><ArrowLeft size={18} /></Link>
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Kuliah / Workspace Skripsi</p>
          <h1 className="mt-1 text-3xl font-black text-neutral-950">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{workspace?.title || `Ruang kerja skripsi ${firstName}`} · {workspace?.current_stage || "Persiapan"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {workspace?.drive_folder_url && <a href={workspace.drive_folder_url} target="_blank" rel="noreferrer" className="btn-soft"><FolderOpen size={16} /> Buka Drive</a>}
        {tab === "overview" && <button onClick={() => setModal("settings")} className="btn-soft">Atur Workspace</button>}
        {canAdd && <button onClick={() => setModal("add")} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"><Plus size={17} /> Tambah</button>}
      </div>
    </div>

    <nav className="flex flex-wrap gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
      {thesisTabs.map(([key, label]) => <Link key={key} href={`/academic/thesis?tab=${key}`} prefetch className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === key ? "bg-orange-500 text-white shadow-sm" : "text-neutral-600 hover:bg-orange-50 hover:text-orange-700"}`}>{label}</Link>)}
    </nav>

    {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Data berhasil disimpan.</div>}
    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

    {tab === "overview" && <DesktopOverview workspace={workspace} data={overview} firstName={firstName} />}
    {tab === "bimbingan" && <DesktopBimbingan rows={rows} />}
    {tab === "penelitian" && <DesktopPenelitian rows={rows} />}
    {tab === "referensi" && <DesktopReferensi rows={rows} />}
    {tab === "file" && <DesktopFiles rows={rows} />}
    {tab === "administrasi" && <DesktopAdmin rows={rows} />}
    {tab === "target" && <DesktopTarget rows={rows} />}
    {tab === "notifikasi" && <DesktopNotifications rows={rows} />}
    {tab === "timeline" && <DesktopTimeline rows={rows} target={workspace?.target_graduation} quote={workspace?.quote} />}

    {modal === "settings" && <Modal title="Atur Workspace Skripsi" onClose={() => setModal(null)}><WorkspaceForm workspace={workspace} /></Modal>}
    {modal === "add" && <Modal title={`Tambah ${title}`} onClose={() => setModal(null)}><AddForm tab={tab} /></Modal>}
  </div>;
}

function DesktopOverview({ workspace, data, firstName }: { workspace: any; data: OverviewData; firstName: string }) {
  const progress = Number(workspace?.progress || 0);
  const next = data.supervisions[0];
  const tasks = data.tasks.filter((x) => !x.is_done);
  const doneResearch = data.research.filter((x) => x.status === "done").length;
  const researchProgress = data.research.length ? Math.round(doneResearch / data.research.length * 100) : 0;
  const nearest = tasks.filter((x) => x.due_at).sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))[0];

  return <div className="grid grid-cols-12 gap-5">
    <Card className="col-span-12 border-orange-100 bg-gradient-to-r from-orange-50 via-white to-white"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">🎓</div><div><p className="font-black">{workspace?.current_stage || "Semester Akhir"}</p><p className="mt-1 text-sm text-neutral-500">Tetap konsisten, {firstName}. Kamu pasti bisa! ✨</p></div></div><span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700">{progress}% selesai</span></div></Card>

    <Card className="col-span-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Progress Skripsi</h2><p className="mt-1 text-sm text-neutral-500">Target lulus: {workspace?.target_graduation ? fmtDate(workspace.target_graduation) : "Belum diatur"}</p></div><ChevronRight className="text-neutral-300" /></div><div className="flex items-center gap-6"><div className="relative flex h-32 w-32 items-center justify-center rounded-full" style={{ background: `conic-gradient(#f97316 ${progress * 3.6}deg,#f5e9dc 0deg)` }}><div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-black">{progress}%</div></div><div><p className="text-sm text-neutral-500">Dalam proses</p><p className="mt-1 text-2xl font-black">{workspace?.current_stage || "Persiapan"}</p><p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">Atur progress, target lulus, pembimbing, dan folder Drive dari tombol Atur Workspace.</p></div></div></Card>

    <Card className="col-span-5"><div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><CalendarClock size={22} /></div><div className="min-w-0 flex-1"><p className="text-sm font-black text-neutral-500">Bimbingan berikutnya</p>{next ? <><p className="mt-2 text-lg font-black">{fmtDate(next.scheduled_at)}</p><p className="mt-1 text-sm text-neutral-600">{fmtTime(next.scheduled_at)} · {next.lecturer || "Dosen pembimbing"}</p><p className="mt-3 text-sm text-neutral-500">{next.topic}</p></> : <p className="mt-3 text-sm text-neutral-400">Belum ada jadwal bimbingan.</p>}</div></div></Card>

    <Card className="col-span-7"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">Target minggu ini</h2><span className="text-xs font-bold text-neutral-400">{tasks.length} aktif</span></div><Progress value={tasks.length ? 45 : 0} /><div className="mt-4 space-y-2">{tasks.length ? tasks.slice(0, 6).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3"><form action={updateThesisFlag}><input type="hidden" name="table" value="thesis_tasks" /><input type="hidden" name="id" value={task.id} /><input type="hidden" name="field" value="is_done" /><input type="hidden" name="current" value={String(Boolean(task.is_done))} /><input type="hidden" name="tab" value="overview" /><button className="flex h-5 w-5 items-center justify-center rounded border border-neutral-300 bg-white">{task.is_done && <Check size={12} />}</button></form><span className="flex-1 text-sm font-bold">{task.title}</span>{task.due_at && <span className="text-xs text-neutral-400">{fmtDate(task.due_at)}</span>}</div>) : <p className="text-sm text-neutral-400">Belum ada target aktif.</p>}</div></Card>

    <div className="col-span-5 grid gap-5">
      <Card><div className="flex items-center gap-2"><FlaskConical className="text-orange-500" size={18} /><h2 className="font-black">Progress Penelitian</h2></div><div className="mt-4 flex items-end justify-between"><span className="text-3xl font-black">{researchProgress}%</span><span className="text-xs text-neutral-400">{doneResearch}/{data.research.length} selesai</span></div><div className="mt-3"><Progress value={researchProgress} /></div></Card>
      <Card><div className="flex items-center gap-2"><Clock className="text-orange-500" size={18} /><h2 className="font-black">Deadline terdekat</h2></div>{nearest ? <><p className="mt-4 text-lg font-black">{nearest.title}</p><p className="mt-1 text-sm text-neutral-500">{fmtDate(nearest.due_at)}</p></> : <p className="mt-4 text-sm text-neutral-400">Belum ada deadline.</p>}</Card>
    </div>

    <Card className="col-span-12 bg-gradient-to-r from-[#fff7ea] to-white text-center"><Sparkles className="mx-auto text-orange-400" /><p className="mt-3 text-lg font-black italic">“{workspace?.quote || "Setiap progres kecil tetaplah progres."}”</p><p className="mt-2 text-sm text-neutral-400">Kamu sudah sejauh ini. Lanjut sedikit lagi.</p></Card>
  </div>;
}

function DesktopBimbingan({ rows }: { rows: any[] }) {
  const upcoming = rows.filter((x) => x.status === "upcoming");
  const done = rows.filter((x) => x.status === "done");
  return <div className="grid grid-cols-12 gap-5"><Card className="col-span-8"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Jadwal Bimbingan</h2><p className="mt-1 text-sm text-neutral-500">Semua jadwal, catatan, dan status bimbingan.</p></div><span className="text-xs font-black text-blue-600">{upcoming.length} akan datang</span></div>{rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center gap-4 rounded-2xl border border-black/5 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><CalendarClock size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-black">{row.topic || "Bimbingan Skripsi"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{row.status === "done" ? "Selesai" : "Akan datang"}</span></div><p className="mt-1 text-sm text-neutral-500">{fmtDate(row.scheduled_at)} · {fmtTime(row.scheduled_at)} · {row.lecturer || "Dosen pembimbing"}</p>{row.notes && <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{row.notes}</p>}</div><form action={setSupervisionStatus} className="flex gap-1"><input type="hidden" name="id" value={row.id} /><button name="status" value="upcoming" className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700">Akan datang</button><button name="status" value="done" className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">Selesai</button></form><Delete table="thesis_supervisions" id={row.id} tab="bimbingan" /></div>)}</div> : <Empty>Belum ada jadwal bimbingan.</Empty>}</Card><div className="col-span-4 space-y-5"><Card><h3 className="font-black">Ringkasan</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-2xl font-black text-blue-700">{upcoming.length}</p><p className="mt-1 text-xs font-bold text-blue-700">Akan datang</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-700">{done.length}</p><p className="mt-1 text-xs font-bold text-emerald-700">Selesai</p></div></div></Card><Card><h3 className="font-black">Catatan terakhir</h3>{rows.find((x) => x.notes) ? <p className="mt-3 text-sm leading-6 text-neutral-500">{rows.find((x) => x.notes)?.notes}</p> : <p className="mt-3 text-sm text-neutral-400">Belum ada catatan.</p>}</Card></div></div>;
}

function DesktopPenelitian({ rows }: { rows: any[] }) {
  const done = rows.filter((x) => x.status === "done").length;
  const progress = rows.length ? Math.round(done / rows.length * 100) : 0;
  return <div className="grid grid-cols-12 gap-5"><Card className="col-span-8"><div className="mb-5 flex items-end justify-between"><div><h2 className="text-lg font-black">Tracker Penelitian</h2><p className="mt-1 text-sm text-neutral-500">Tahapan penelitian dari awal sampai analisis.</p></div><span className="text-2xl font-black">{progress}%</span></div><Progress value={progress} /><div className="mt-6 space-y-1">{rows.length ? rows.map((row, index) => <div key={row.id} className="relative flex gap-4 pb-6">{index < rows.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200" />}<span className={`relative z-10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${row.status === "done" ? "bg-emerald-500 text-white" : row.status === "active" ? "border-[6px] border-orange-500 bg-white" : "bg-neutral-200"}`}>{row.status === "done" && <Check size={13} />}</span><div className="flex-1"><div className="flex items-center justify-between gap-4"><div><p className="font-black">{row.title}</p><p className="mt-1 text-sm text-neutral-500">{row.description || "Belum ada catatan."}</p></div><span className="text-sm text-neutral-400">{row.target_date ? fmtDate(row.target_date) : "-"}</span></div><form action={setResearchStatus} className="mt-3 flex gap-2"><input type="hidden" name="id" value={row.id} /><button name="status" value="todo" className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600">Belum</button><button name="status" value="active" className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">Proses</button><button name="status" value="done" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Selesai</button></form></div></div>) : <Empty>Belum ada tahapan penelitian.</Empty>}</div></Card><Card className="col-span-4"><FlaskConical className="text-orange-500" /><h3 className="mt-3 text-lg font-black">Progress Penelitian</h3><p className="mt-1 text-sm text-neutral-500">{done}/{rows.length} tahapan selesai.</p><div className="mt-5"><Progress value={progress} /></div></Card></div>;
}

function DesktopReferensi({ rows }: { rows: any[] }) {
  const [q, setQ] = useState("");
  const visible = useMemo(() => rows.filter((r) => `${r.title || ""} ${r.authors || ""} ${r.journal || ""}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  return <div className="space-y-5"><div className="flex max-w-xl items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-3 shadow-sm"><Search size={17} className="text-neutral-400" /><input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Cari jurnal, topik, atau penulis..." /></div>{visible.length ? <div className="grid grid-cols-2 gap-4">{visible.map((row) => <Card key={row.id}><div className="flex items-start gap-3"><form action={updateThesisFlag}><input type="hidden" name="table" value="thesis_references" /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="field" value="is_read" /><input type="hidden" name="current" value={String(Boolean(row.is_read))} /><input type="hidden" name="tab" value="referensi" /><button className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${row.is_read ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white"}`}>{row.is_read && <Check size={12} />}</button></form><div className="min-w-0 flex-1"><h3 className="font-black leading-6">{row.title}</h3><p className="mt-1 text-sm text-neutral-500">{row.authors || "Tanpa penulis"}{row.publication_year ? ` (${row.publication_year})` : ""}</p><p className="text-sm text-neutral-400">{row.journal}</p><div className="mt-3 flex flex-wrap gap-1.5">{(row.tags || []).map((tag: string) => <span key={tag} className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700">{tag}</span>)}</div><div className="mt-4 flex gap-2">{row.drive_url && <a href={row.drive_url} target="_blank" rel="noreferrer" className="btn-soft text-xs"><FolderOpen size={14} /> Drive</a>}{row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="btn-soft text-xs"><ExternalLink size={14} /> Sumber</a>}</div></div><Delete table="thesis_references" id={row.id} tab="referensi" /></div></Card>)}</div> : <Empty>Belum ada referensi.</Empty>}</div>;
}

function DesktopFiles({ rows }: { rows: any[] }) {
  return rows.length ? <div className="grid grid-cols-2 gap-4">{rows.map((row) => <Card key={row.id}><div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileText size={21} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-black">{row.file_name}</h3><p className="mt-1 text-sm text-neutral-500">{fmtDate(row.document_date)}{row.file_size_text ? ` · ${row.file_size_text}` : ""}</p><div className="mt-3 flex items-center gap-2"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black text-neutral-600">{row.status}</span>{row.version_label && <span className="text-xs text-neutral-400">{row.version_label}</span>}</div><div className="mt-4 flex items-center gap-2">{row.drive_url && <a href={row.drive_url} target="_blank" rel="noreferrer" className="btn-soft text-xs"><ExternalLink size={14} /> Buka di Drive</a>}<form action={setFileStatus} className="flex gap-1"><input type="hidden" name="id" value={row.id} /><button name="status" value="draft" className="rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-black">Draft</button><button name="status" value="approved" className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">ACC</button></form></div></div><Delete table="thesis_files" id={row.id} tab="file" /></div></Card>)}</div> : <Empty>Belum ada file skripsi.</Empty>;
}

function DesktopAdmin({ rows }: { rows: any[] }) {
  const phases = ["sempro", "semhas", "sidang", "yudisium"];
  return <div className="grid grid-cols-4 gap-4">{phases.map((phase) => { const items = rows.filter((x) => String(x.phase).toLowerCase() === phase); const done = items.filter((x) => x.is_done).length; return <Card key={phase}><div className="mb-4"><p className="text-xs font-black uppercase tracking-[.12em] text-orange-600">{phase}</p><h3 className="mt-1 text-lg font-black">Checklist</h3><p className="mt-1 text-sm text-neutral-400">{done}/{items.length} selesai</p></div><Progress value={items.length ? done / items.length * 100 : 0} /><div className="mt-4 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="flex items-start gap-2"><form action={updateThesisFlag}><input type="hidden" name="table" value="thesis_admin_items" /><input type="hidden" name="id" value={item.id} /><input type="hidden" name="field" value="is_done" /><input type="hidden" name="current" value={String(Boolean(item.is_done))} /><input type="hidden" name="tab" value="administrasi" /><button className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${item.is_done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300"}`}>{item.is_done && <Check size={12} />}</button></form><span className={`flex-1 text-sm ${item.is_done ? "text-neutral-400 line-through" : "font-semibold"}`}>{item.title}</span></div>) : <p className="text-sm text-neutral-400">Belum ada item.</p>}</div></Card>; })}</div>;
}

function DesktopTarget({ rows }: { rows: any[] }) {
  const active = rows.filter((x) => !x.is_done);
  const priority = active.find((x) => x.priority === "high") || active[0];
  return <div className="grid grid-cols-12 gap-5"><Card className="col-span-5 border-orange-100 bg-gradient-to-br from-orange-50 to-white"><Target className="text-orange-500" /><h2 className="mt-3 text-lg font-black">Apa yang harus aku kerjakan sekarang?</h2>{priority ? <><p className="mt-5 text-2xl font-black">{priority.title}</p><p className="mt-2 text-sm leading-6 text-neutral-500">{priority.details || "Fokus pada satu target terpenting dulu."}</p>{priority.due_at && <p className="mt-3 text-sm font-bold text-red-500">Deadline {fmtDate(priority.due_at)}</p>}</> : <p className="mt-4 text-sm text-neutral-400">Belum ada target aktif.</p>}</Card><Card className="col-span-7"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">Tugas aktif</h2><span className="text-sm text-neutral-400">{active.length} tugas</span></div><div className="space-y-2">{active.length ? active.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-black/5 px-4 py-3"><form action={updateThesisFlag}><input type="hidden" name="table" value="thesis_tasks" /><input type="hidden" name="id" value={task.id} /><input type="hidden" name="field" value="is_done" /><input type="hidden" name="current" value="false" /><input type="hidden" name="tab" value="target" /><button className="flex h-5 w-5 rounded border border-neutral-300" /></form><div className="flex-1"><p className="font-bold">{task.title}</p>{task.due_at && <p className="mt-1 text-xs text-neutral-400">{fmtDate(task.due_at)}</p>}</div>{task.priority === "high" && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">Prioritas</span>}<Delete table="thesis_tasks" id={task.id} tab="target" /></div>) : <Empty>Belum ada target aktif.</Empty>}</div></Card></div>;
}

function DesktopNotifications({ rows }: { rows: any[] }) {
  return <Card><div className="mb-5 flex items-center gap-3"><Bell className="text-orange-500" /><div><h2 className="text-lg font-black">Notifikasi Skripsi</h2><p className="text-sm text-neutral-500">Pengingat bimbingan, deadline, file, dan progres.</p></div></div>{rows.length ? <div className="divide-y divide-black/5">{rows.map((row) => <div key={row.id} className="flex gap-4 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Bell size={17} /></div><div className="flex-1"><p className="font-black">{row.title}</p><p className="mt-1 text-sm text-neutral-500">{row.message}</p></div><span className="text-xs text-neutral-400">{fmtDate(row.created_at)}</span></div>)}</div> : <Empty>Belum ada notifikasi skripsi.</Empty>}</Card>;
}

function DesktopTimeline({ rows, target, quote }: { rows: any[]; target?: string | null; quote?: string | null }) {
  const days = target ? Math.max(0, Math.ceil((new Date(`${target}T23:59:59`).getTime() - Date.now()) / 86400000)) : null;
  return <div className="grid grid-cols-12 gap-5"><Card className="col-span-4 border-orange-100 bg-gradient-to-br from-orange-50 to-white"><GraduationCap className="text-orange-500" size={30} /><p className="mt-4 text-4xl font-black">{days ?? "—"}{days !== null && <span className="ml-2 text-lg">hari lagi</span>}</p><p className="mt-2 text-sm text-neutral-500">Menuju target lulus {target ? fmtDate(target) : "yang belum diatur"}</p><p className="mt-8 text-base font-black italic">“{quote || "Setiap progres kecil tetaplah progres."}”</p></Card><Card className="col-span-8"><h2 className="mb-6 text-lg font-black">Timeline Skripsi</h2>{rows.length ? <div className="space-y-1">{rows.map((row, index) => <div key={row.id} className="relative flex gap-4 pb-6">{index < rows.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-neutral-200" />}<span className="relative z-10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white"><Check size={12} /></span><div className="flex flex-1 items-start justify-between"><div><p className="font-black">{row.title}</p><p className="mt-1 text-sm text-neutral-500">Milestone skripsi</p></div><span className="text-sm text-neutral-400">{row.target_date ? fmtDate(row.target_date) : "-"}</span></div></div>)}</div> : <Empty>Belum ada milestone.</Empty>}</Card></div>;
}

function WorkspaceForm({ workspace }: { workspace: any }) {
  return <form action={saveThesisWorkspace} className="space-y-3"><input className="field" name="title" defaultValue={workspace?.title || ""} placeholder="Judul skripsi" /><input className="field" name="institution" defaultValue={workspace?.institution || ""} placeholder="Universitas" /><input className="field" name="program" defaultValue={workspace?.program || ""} placeholder="Program studi" /><div className="grid grid-cols-2 gap-3"><input className="field" name="supervisor" defaultValue={workspace?.supervisor || ""} placeholder="Pembimbing 1" /><input className="field" name="co_supervisor" defaultValue={workspace?.co_supervisor || ""} placeholder="Pembimbing 2" /></div><div className="grid grid-cols-2 gap-3"><input className="field" name="current_stage" defaultValue={workspace?.current_stage || "Persiapan"} placeholder="Tahap sekarang" /><input className="field" name="progress" type="number" min="0" max="100" defaultValue={workspace?.progress || 0} placeholder="Progress %" /></div><input className="field" name="target_graduation" type="date" defaultValue={workspace?.target_graduation || ""} /><input className="field" name="drive_folder_url" type="url" defaultValue={workspace?.drive_folder_url || ""} placeholder="Link folder Google Drive" /><input className="field" name="quote" defaultValue={workspace?.quote || ""} placeholder="Kalimat penyemangat" /><Submit /></form>;
}

function AddForm({ tab }: { tab: ThesisTab }) {
  if (tab === "bimbingan") return <form action={addThesisSupervision} className="space-y-3"><input className="field" name="topic" placeholder="Topik bimbingan" required /><div className="grid grid-cols-2 gap-3"><input className="field" type="datetime-local" name="scheduled_at" required /><input className="field" name="lecturer" placeholder="Dosen pembimbing" /></div><div className="grid grid-cols-2 gap-3"><select className="field" name="mode"><option value="offline">Offline</option><option value="online">Online</option></select><input className="field" name="location" placeholder="Lokasi / link meeting" /></div><textarea className="field min-h-24" name="notes" placeholder="Catatan persiapan" /><input type="hidden" name="status" value="upcoming" /><Submit>Tambah Bimbingan</Submit></form>;
  if (tab === "penelitian") return <form action={addThesisResearchStep} className="space-y-3"><input className="field" name="title" placeholder="Tahap penelitian" required /><textarea className="field min-h-24" name="description" placeholder="Catatan / detail" /><div className="grid grid-cols-2 gap-3"><input className="field" type="date" name="target_date" /><select className="field" name="status"><option value="todo">Belum mulai</option><option value="active">Sedang berjalan</option><option value="done">Selesai</option></select></div><input className="field" name="position" type="number" min="0" placeholder="Urutan" /><Submit>Tambah Tahap</Submit></form>;
  if (tab === "referensi") return <form action={addThesisReference} className="space-y-3"><input className="field" name="title" placeholder="Judul jurnal / referensi" required /><div className="grid grid-cols-2 gap-3"><input className="field" name="authors" placeholder="Penulis" /><input className="field" name="publication_year" type="number" placeholder="Tahun" /></div><input className="field" name="journal" placeholder="Nama jurnal / publisher" /><input className="field" name="tags" placeholder="Tag, pisahkan dengan koma" /><input className="field" name="drive_url" type="url" placeholder="Link file Google Drive" /><input className="field" name="source_url" type="url" placeholder="DOI / link sumber" /><textarea className="field min-h-24" name="notes" placeholder="Catatan / ringkasan" /><Submit>Tambah Referensi</Submit></form>;
  if (tab === "file") return <form action={addThesisFile} className="space-y-3"><input className="field" name="file_name" placeholder="Nama file" required /><div className="grid grid-cols-2 gap-3"><input className="field" name="version_label" placeholder="Versi, mis. v12" /><input className="field" name="category" placeholder="Kategori, mis. BAB 3" /></div><div className="grid grid-cols-2 gap-3"><select className="field" name="status"><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select><input className="field" name="document_date" type="date" /></div><input className="field" name="file_size_text" placeholder="Ukuran, mis. 2.4 MB" /><input className="field" name="drive_url" type="url" placeholder="Link Google Drive" required /><textarea className="field min-h-20" name="notes" placeholder="Catatan" /><Submit>Tambah File</Submit></form>;
  if (tab === "administrasi") return <form action={addThesisAdminItem} className="space-y-3"><select className="field" name="phase"><option value="sempro">Sempro</option><option value="semhas">Semhas</option><option value="sidang">Sidang</option><option value="yudisium">Yudisium</option></select><input className="field" name="title" placeholder="Item administrasi" required /><input className="field" name="due_date" type="date" /><textarea className="field min-h-20" name="notes" placeholder="Catatan" /><input className="field" name="position" type="number" min="0" placeholder="Urutan" /><Submit>Tambah Checklist</Submit></form>;
  if (tab === "target") return <form action={addThesisTask} className="space-y-3"><input className="field" name="title" placeholder="Target / tugas" required /><textarea className="field min-h-24" name="details" placeholder="Detail" /><div className="grid grid-cols-2 gap-3"><input className="field" name="due_at" type="datetime-local" /><select className="field" name="priority"><option value="normal">Normal</option><option value="high">Prioritas tinggi</option><option value="low">Rendah</option></select></div><input className="field" name="focus_minutes" type="number" min="5" max="240" defaultValue="45" /><Submit>Tambah Target</Submit></form>;
  return <Empty>Tidak ada form tambahan untuk tab ini.</Empty>;
}
