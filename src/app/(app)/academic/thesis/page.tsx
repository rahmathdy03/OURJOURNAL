import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  Circle,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  ListChecks,
  Plus,
  Target,
  Timeline,
  Trash2,
  UserRound,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/submit-button";
import { ThesisIntro } from "@/components/thesis-intro";
import { StudyTimer } from "@/features/academic/study-timer";
import {
  addThesisAdminItem,
  addThesisFile,
  addThesisMilestone,
  addThesisNotification,
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
import { requireModule } from "@/lib/auth";

const tabs = [
  ["overview", "Overview"],
  ["bimbingan", "Bimbingan"],
  ["penelitian", "Penelitian"],
  ["referensi", "Referensi"],
  ["file", "File Skripsi"],
  ["administrasi", "Administrasi Kelulusan"],
  ["target", "Target & Prioritas"],
  ["notifikasi", "Notifikasi"],
  ["timeline", "Timeline Skripsi"],
] as const;

type TabKey = (typeof tabs)[number][0];

function validTab(value?: string): TabKey {
  return tabs.some(([key]) => key === value) ? (value as TabKey) : "overview";
}

function dateLabel(value?: string | null) {
  if (!value) return "Belum ditentukan";
  return new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "Belum ditentukan";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "orange" | "green" | "blue" | "red" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-600",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${tones[tone]}`}>{children}</span>;
}

function DeleteButton({ table, id, tab }: { table: string; id: string; tab: TabKey }) {
  return (
    <form action={deleteThesisItem}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tab" value={tab} />
      <button aria-label="Hapus" className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
    </form>
  );
}

function ToggleButton({ table, id, field, current, tab, label }: { table: string; id: string; field: "is_done" | "is_read"; current: boolean; tab: TabKey; label?: string }) {
  return (
    <form action={updateThesisFlag}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="current" value={String(current)} />
      <input type="hidden" name="tab" value={tab} />
      <button className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black ${current ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
        {current ? <Check size={14} /> : <Circle size={12} />} {label ?? (current ? "Selesai" : "Tandai")}
      </button>
    </form>
  );
}

export default async function ThesisPage({ searchParams }: { searchParams: Promise<{ tab?: string; intro?: string; saved?: string; error?: string }> }) {
  const params = await searchParams;
  const tab = validTab(params.tab);
  const { supabase, profile } = await requireModule("academic");
  const workspaceRes = await supabase.from("thesis_workspaces").select("*").maybeSingle();

  if (workspaceRes.error) {
    return (
      <>
        <Link href="/academic" className="inline-flex items-center gap-2 text-sm font-black text-neutral-600"><ChevronLeft size={17} /> Kembali ke Kuliah</Link>
        <div className="mx-auto max-w-xl rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><GraduationCap /></div>
          <h1 className="text-2xl font-black">Workspace Skripsi siap dipasang</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Tampilan aplikasinya sudah tersedia, tetapi tabel database Skripsi belum aktif di project Supabase OUR_JOURNAL. Jalankan migration Skripsi v1 sekali agar data Rahmat dan Finka tersimpan privat.</p>
        </div>
      </>
    );
  }

  const workspace = workspaceRes.data;
  const firstName = (profile?.display_name || "Kamu").trim().split(/\s+/)[0];
  let rows: any[] = [];
  let overview: Record<string, any[]> = {};

  if (tab === "overview") {
    const now = new Date().toISOString();
    const [supervisions, research, tasks, admin, milestones] = await Promise.all([
      supabase.from("thesis_supervisions").select("*").gte("scheduled_at", now).neq("status", "cancelled").order("scheduled_at").limit(2),
      supabase.from("thesis_research_steps").select("*").order("position").order("created_at").limit(20),
      supabase.from("thesis_tasks").select("*").eq("is_done", false).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
      supabase.from("thesis_admin_items").select("*").eq("is_done", false).order("due_date", { ascending: true, nullsFirst: false }).limit(5),
      supabase.from("thesis_milestones").select("*").order("position").order("target_date").limit(12),
    ]);
    overview = {
      supervisions: supervisions.data ?? [], research: research.data ?? [], tasks: tasks.data ?? [], admin: admin.data ?? [], milestones: milestones.data ?? [],
    };
  } else {
    const queryMap: Record<Exclude<TabKey, "overview">, Promise<any>> = {
      bimbingan: supabase.from("thesis_supervisions").select("*").order("scheduled_at", { ascending: false }).limit(100),
      penelitian: supabase.from("thesis_research_steps").select("*").order("position").order("created_at").limit(100),
      referensi: supabase.from("thesis_references").select("*").order("created_at", { ascending: false }).limit(150),
      file: supabase.from("thesis_files").select("*").order("document_date", { ascending: false }).order("created_at", { ascending: false }).limit(150),
      administrasi: supabase.from("thesis_admin_items").select("*").order("phase").order("position").limit(150),
      target: supabase.from("thesis_tasks").select("*").order("is_done").order("due_at", { ascending: true, nullsFirst: false }).limit(150),
      notifikasi: supabase.from("thesis_notifications").select("*").order("created_at", { ascending: false }).limit(150),
      timeline: supabase.from("thesis_milestones").select("*").order("position").order("target_date").limit(100),
    };
    const result = await queryMap[tab as Exclude<TabKey, "overview">];
    rows = result.data ?? [];
  }

  return (
    <>
      <ThesisIntro show={params.intro === "1"} />

      <div className="flex items-center justify-between gap-3">
        <Link href="/academic" className="inline-flex items-center gap-2 text-sm font-black text-neutral-600"><ChevronLeft size={17} /> Kuliah</Link>
        {workspace?.drive_folder_url && <a href={workspace.drive_folder_url} target="_blank" rel="noreferrer" className="btn-soft"><FolderOpen size={16} /> Drive</a>}
      </div>

      <div className="rounded-[28px] border border-black/5 bg-gradient-to-br from-[#fffaf4] via-white to-orange-50 p-5 shadow-sm md:p-7">
        <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Workspace Skripsi · {firstName}</p>
        <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">{workspace?.title || "Skripsi"}</h1>
            <p className="mt-1 text-sm text-neutral-500">{workspace?.current_stage || "Persiapan"} · ruang kerja privat untuk progres sampai lulus.</p>
          </div>
          <div className="min-w-48 rounded-2xl bg-white/80 p-3 shadow-sm">
            <div className="mb-1 flex justify-between text-xs font-bold"><span>Progress</span><span>{workspace?.progress ?? 0}%</span></div>
            <ProgressBar value={Number(workspace?.progress ?? 0)} />
          </div>
        </div>
      </div>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {tabs.map(([key, label]) => (
          <Link key={key} prefetch href={`/academic/thesis?tab=${key}`} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-black transition ${tab === key ? "bg-orange-500 text-white shadow-sm" : "bg-white text-neutral-600 shadow-sm hover:bg-orange-50"}`}>{label}</Link>
        ))}
      </nav>

      {params.saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Data Skripsi berhasil disimpan.</div>}
      {params.error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{params.error}</div>}

      {tab === "overview" && <Overview workspace={workspace} data={overview} />}
      {tab === "bimbingan" && <Bimbingan rows={rows} />}
      {tab === "penelitian" && <Penelitian rows={rows} />}
      {tab === "referensi" && <Referensi rows={rows} />}
      {tab === "file" && <Files rows={rows} driveFolder={workspace?.drive_folder_url} />}
      {tab === "administrasi" && <Administrasi rows={rows} />}
      {tab === "target" && <TargetPrioritas rows={rows} />}
      {tab === "notifikasi" && <Notifikasi rows={rows} />}
      {tab === "timeline" && <TimelinePage rows={rows} targetGraduation={workspace?.target_graduation} />}
    </>
  );
}

function Overview({ workspace, data }: { workspace: any; data: Record<string, any[]> }) {
  const research = data.research ?? [];
  const doneResearch = research.filter((x) => x.status === "done").length;
  const graduationDays = daysUntil(workspace?.target_graduation);
  const next = data.supervisions?.[0];
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-6">
        <SectionCard title="Progress Skripsi" description={workspace?.target_graduation ? `Target lulus ${dateLabel(workspace.target_graduation)}` : "Atur target lulus dari profil workspace."}>
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-orange-100 bg-white text-2xl font-black text-orange-600">{workspace?.progress ?? 0}%</div>
            <div className="min-w-0"><p className="text-xs text-neutral-500">Dalam proses</p><p className="text-xl font-black">{workspace?.current_stage || "Persiapan"}</p>{graduationDays !== null && <p className="mt-2 text-xs font-bold text-orange-600">{graduationDays} hari menuju target lulus</p>}</div>
          </div>
        </SectionCard>

        <SectionCard title="Bimbingan berikutnya">
          {next ? <div className="rounded-2xl bg-orange-50 p-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 text-orange-600" size={20}/><div><p className="font-black">{next.topic}</p><p className="mt-1 text-sm text-neutral-600">{dateTimeLabel(next.scheduled_at)}</p><p className="mt-1 text-xs text-neutral-500">{next.lecturer || "Dosen pembimbing"} · {next.mode === "online" ? "Online" : (next.location || "Offline")}</p></div></div></div> : <EmptyState>Belum ada jadwal bimbingan mendatang.</EmptyState>}
        </SectionCard>

        <SectionCard title="Target minggu ini" description={`${data.tasks?.filter((x)=>x.is_done).length ?? 0}/${data.tasks?.length ?? 0} selesai`}>
          {data.tasks?.length ? <div className="space-y-2">{data.tasks.map((x)=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-3"><Circle size={15} className="text-neutral-400"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{x.title}</p>{x.due_at&&<p className="text-xs text-neutral-500">{dateTimeLabel(x.due_at)}</p>}</div>{x.priority==="high"&&<StatusPill tone="red">Prioritas</StatusPill>}</div>)}</div> : <EmptyState>Belum ada target aktif.</EmptyState>}
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Status Penelitian" description={`${doneResearch}/${research.length} tahap selesai`}>
          {research.length ? <div className="space-y-3">{research.slice(0,6).map((x)=><div key={x.id} className="flex items-center gap-3"><div className={`flex h-7 w-7 items-center justify-center rounded-full ${x.status==="done"?"bg-emerald-100 text-emerald-700":x.status==="active"?"bg-orange-100 text-orange-700":"bg-neutral-100 text-neutral-400"}`}>{x.status==="done"?<Check size={15}/>:<Circle size={11}/>}</div><div className="flex-1"><p className="text-sm font-bold">{x.title}</p><p className="text-xs text-neutral-400">{x.target_date?dateLabel(x.target_date):"Belum ada target tanggal"}</p></div></div>)}</div> : <EmptyState>Tambahkan tahapan penelitian.</EmptyState>}
        </SectionCard>

        <SectionCard title="Deadline & administrasi">
          {data.admin?.length ? <div className="space-y-2">{data.admin.map((x)=><div key={x.id} className="rounded-xl bg-neutral-50 p-3"><p className="text-sm font-black">{x.title}</p><p className="mt-1 text-xs text-neutral-500">{x.phase.toUpperCase()} · {dateLabel(x.due_date)}</p></div>)}</div> : <EmptyState>Tidak ada administrasi mendesak.</EmptyState>}
        </SectionCard>

        <SectionCard title="Profil & target Skripsi" description="Data ini menjadi sumber ringkasan di semua tab.">
          <form action={saveThesisWorkspace} className="space-y-3">
            <input className="field" name="title" defaultValue={workspace?.title ?? ""} placeholder="Judul skripsi" />
            <div className="grid gap-2 sm:grid-cols-2"><input className="field" name="institution" defaultValue={workspace?.institution ?? ""} placeholder="Universitas"/><input className="field" name="program" defaultValue={workspace?.program ?? ""} placeholder="Program studi"/></div>
            <div className="grid gap-2 sm:grid-cols-2"><input className="field" name="supervisor" defaultValue={workspace?.supervisor ?? ""} placeholder="Pembimbing 1"/><input className="field" name="co_supervisor" defaultValue={workspace?.co_supervisor ?? ""} placeholder="Pembimbing 2"/></div>
            <div className="grid gap-2 sm:grid-cols-2"><input className="field" name="current_stage" defaultValue={workspace?.current_stage ?? "Persiapan"} placeholder="Tahap saat ini"/><input className="field" name="progress" type="number" min="0" max="100" defaultValue={workspace?.progress ?? 0} placeholder="Progress %"/></div>
            <input className="field" name="target_graduation" type="date" defaultValue={workspace?.target_graduation ?? ""}/>
            <input className="field" name="drive_folder_url" type="url" defaultValue={workspace?.drive_folder_url ?? ""} placeholder="Link folder Google Drive Skripsi"/>
            <textarea className="field min-h-20" name="quote" defaultValue={workspace?.quote ?? ""} placeholder="Kalimat penyemangat"/>
            <SubmitButton>Simpan profil Skripsi</SubmitButton>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function Bimbingan({ rows }: { rows: any[] }) {
  return <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
    <SectionCard title="Jadwalkan bimbingan"><form action={addThesisSupervision} className="space-y-3"><input className="field" name="scheduled_at" type="datetime-local" required/><input className="field" name="lecturer" placeholder="Nama dosen pembimbing"/><input className="field" name="topic" placeholder="Topik bimbingan" required/><div className="grid grid-cols-2 gap-2"><select className="field" name="mode"><option value="offline">Offline</option><option value="online">Online</option></select><input className="field" name="location" placeholder="Ruangan / link"/></div><textarea className="field min-h-20" name="notes" placeholder="Catatan pembahasan"/><textarea className="field min-h-20" name="revision" placeholder="Revisi / tindak lanjut"/><input type="hidden" name="status" value="upcoming"/><SubmitButton><Plus size={16}/> Tambah bimbingan</SubmitButton></form></SectionCard>
    <SectionCard title="Riwayat & jadwal Bimbingan">{rows.length===0?<EmptyState>Belum ada jadwal bimbingan.</EmptyState>:<div className="space-y-3">{rows.map((x)=><div key={x.id} className="rounded-2xl border border-black/5 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{x.topic}</p><p className="mt-1 text-xs text-neutral-500">{dateTimeLabel(x.scheduled_at)} · {x.lecturer||"Pembimbing"}</p><p className="mt-1 text-xs text-neutral-500">{x.mode==="online"?"Online":x.location||"Offline"}</p></div><DeleteButton table="thesis_supervisions" id={x.id} tab="bimbingan"/></div>{x.notes&&<p className="mt-3 text-sm text-neutral-600">{x.notes}</p>}{x.revision&&<div className="mt-3 rounded-xl bg-orange-50 p-3 text-sm"><b>Revisi:</b> {x.revision}</div>}<div className="mt-3 flex gap-2"><form action={setSupervisionStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value="done"/><button className="btn-soft">Selesai</button></form>{x.status!=="upcoming"&&<StatusPill tone={x.status==="done"?"green":"red"}>{x.status==="done"?"Selesai":"Dibatalkan"}</StatusPill>}</div></div>)}</div>}</SectionCard>
  </div>;
}

function Penelitian({ rows }: { rows: any[] }) {
  const done = rows.filter((x)=>x.status==="done").length;
  return <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
    <SectionCard title="Tracker Penelitian" description={`${done}/${rows.length} tahap selesai`}><ProgressBar value={rows.length?done/rows.length*100:0}/><div className="mt-5 space-y-3">{rows.length===0?<EmptyState>Tambahkan tahapan penelitian pertama.</EmptyState>:rows.map((x)=><div key={x.id} className="flex gap-3 rounded-2xl border border-black/5 p-4"><div className={`mt-1 h-4 w-4 shrink-0 rounded-full border-4 ${x.status==="done"?"border-emerald-500":x.status==="active"?"border-orange-500":"border-neutral-300"}`}/><div className="min-w-0 flex-1"><p className="font-black">{x.title}</p><p className="mt-1 text-xs text-neutral-500">{x.description||"Belum ada catatan"}</p><p className="mt-1 text-xs font-bold text-neutral-400">Target {dateLabel(x.target_date)}</p><div className="mt-3 flex flex-wrap gap-2">{["todo","active","done"].map(status=><form key={status} action={setResearchStatus}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="status" value={status}/><button className={`rounded-lg px-2.5 py-1 text-xs font-black ${x.status===status?"bg-orange-500 text-white":"bg-neutral-100 text-neutral-500"}`}>{status==="todo"?"Belum mulai":status==="active"?"Berjalan":"Selesai"}</button></form>)}</div></div><DeleteButton table="thesis_research_steps" id={x.id} tab="penelitian"/></div>)}</div></SectionCard>
    <SectionCard title="Tambah tahap penelitian"><form action={addThesisResearchStep} className="space-y-3"><input className="field" name="title" placeholder="Contoh: Pengujian analisis" required/><textarea className="field min-h-20" name="description" placeholder="Catatan tahap"/><input className="field" name="target_date" type="date"/><select className="field" name="status"><option value="todo">Belum mulai</option><option value="active">Sedang berjalan</option><option value="done">Selesai</option></select><input className="field" name="position" type="number" min="0" placeholder="Urutan, mis. 1"/><SubmitButton><Plus size={16}/> Tambah tahap</SubmitButton></form></SectionCard>
  </div>;
}

function Referensi({ rows }: { rows: any[] }) {
  return <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
    <SectionCard title="Tambah Referensi" description="PDF tetap di Google Drive; OURJOURNAL hanya menyimpan metadata dan link."><form action={addThesisReference} className="space-y-3"><input className="field" name="title" placeholder="Judul jurnal / buku" required/><input className="field" name="authors" placeholder="Penulis"/><div className="grid grid-cols-2 gap-2"><input className="field" name="publication_year" type="number" placeholder="Tahun"/><input className="field" name="journal" placeholder="Jurnal / penerbit"/></div><input className="field" name="tags" placeholder="Tag dipisah koma"/><input className="field" name="drive_url" type="url" placeholder="Link file Google Drive"/><input className="field" name="source_url" type="url" placeholder="DOI / link sumber asli"/><textarea className="field min-h-20" name="notes" placeholder="Catatan penting"/><SubmitButton><Plus size={16}/> Simpan referensi</SubmitButton></form></SectionCard>
    <SectionCard title="Pustaka Skripsi" description={`${rows.length} referensi tersimpan`}>{rows.length===0?<EmptyState>Belum ada referensi.</EmptyState>:<div className="space-y-3">{rows.map((x)=><div key={x.id} className="rounded-2xl border border-black/5 bg-white p-4"><div className="flex gap-3"><BookOpen size={19} className="mt-0.5 shrink-0 text-orange-600"/><div className="min-w-0 flex-1"><p className="font-black leading-5">{x.title}</p><p className="mt-1 text-xs text-neutral-500">{x.authors}{x.publication_year?` (${x.publication_year})`:""}{x.journal?` · ${x.journal}`:""}</p>{x.tags?.length>0&&<div className="mt-2 flex flex-wrap gap-1">{x.tags.map((tag:string)=><StatusPill key={tag} tone="blue">{tag}</StatusPill>)}</div>}{x.notes&&<p className="mt-2 text-sm text-neutral-600">{x.notes}</p>}<div className="mt-3 flex flex-wrap gap-2">{x.drive_url&&<a className="btn-soft" href={x.drive_url} target="_blank" rel="noreferrer"><FolderOpen size={15}/> Buka di Drive</a>}{x.source_url&&<a className="btn-soft" href={x.source_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Sumber</a>}<ToggleButton table="thesis_references" id={x.id} field="is_read" current={x.is_read} tab="referensi" label={x.is_read?"Sudah dibaca":"Tandai dibaca"}/></div></div><DeleteButton table="thesis_references" id={x.id} tab="referensi"/></div></div>)}</div>}</SectionCard>
  </div>;
}

function Files({ rows, driveFolder }: { rows: any[]; driveFolder?: string }) {
  const tone=(status:string)=>status==="approved"?"green":status==="revision"?"red":status==="sent"?"blue":"neutral";
  return <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
    <SectionCard title="Catat File Skripsi" description="Upload file ke Drive terlebih dulu, lalu tempel link-nya di sini.">{driveFolder&&<a href={driveFolder} target="_blank" rel="noreferrer" className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-black text-white"><FolderOpen size={17}/> Buka Folder Google Drive</a>}<form action={addThesisFile} className="space-y-3"><input className="field" name="file_name" placeholder="Skripsi_v12_revisi_BAB3.docx" required/><div className="grid grid-cols-2 gap-2"><input className="field" name="version_label" placeholder="v12 / BAB3"/><input className="field" name="file_size_text" placeholder="2.4 MB"/></div><div className="grid grid-cols-2 gap-2"><input className="field" name="category" placeholder="Skripsi / Proposal" defaultValue="Skripsi"/><select className="field" name="status"><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select></div><input className="field" name="document_date" type="date"/><input className="field" name="drive_url" type="url" placeholder="Link file Google Drive" required/><textarea className="field min-h-20" name="notes" placeholder="Catatan file / feedback dosen"/><SubmitButton><Plus size={16}/> Tambah file</SubmitButton></form></SectionCard>
    <SectionCard title="File Skripsi">{rows.length===0?<EmptyState>Belum ada metadata file.</EmptyState>:<div className="space-y-3">{rows.map((x)=><div key={x.id} className="rounded-2xl border border-black/5 bg-white p-4"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={20}/></div><div className="min-w-0 flex-1"><p className="truncate font-black">{x.file_name}</p><p className="mt-1 text-xs text-neutral-500">{dateLabel(x.document_date)}{x.file_size_text?` · ${x.file_size_text}`:""}</p><div className="mt-2 flex flex-wrap gap-1.5"><StatusPill tone={tone(x.status) as any}>{x.status==="approved"?"ACC":x.status==="sent"?"Dikirim":x.status==="revision"?"Revisi":"Draft"}</StatusPill>{x.version_label&&<StatusPill>{x.version_label}</StatusPill>}</div>{x.notes&&<p className="mt-2 text-sm text-neutral-600">{x.notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><a className="btn-soft" href={x.drive_url} target="_blank" rel="noreferrer"><FolderOpen size={15}/> Buka di Drive</a><form action={setFileStatus} className="flex gap-2"><input type="hidden" name="id" value={x.id}/><select name="status" defaultValue={x.status} className="rounded-lg border border-black/10 bg-white px-2 text-xs font-bold"><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select><button className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-black">Update</button></form></div></div><DeleteButton table="thesis_files" id={x.id} tab="file"/></div></div>)}</div>}</SectionCard>
  </div>;
}

function Administrasi({ rows }: { rows: any[] }) {
  const phases=["sempro","semhas","sidang","yudisium","umum"];
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
    <SectionCard title="Administrasi Kelulusan">{rows.length===0?<EmptyState>Belum ada checklist administrasi.</EmptyState>:<div className="space-y-5">{phases.map(phase=>{const items=rows.filter(x=>x.phase===phase);if(!items.length)return null;const done=items.filter(x=>x.is_done).length;return <div key={phase}><div className="mb-2 flex items-center justify-between"><p className="text-sm font-black uppercase tracking-wide">{phase}</p><span className="text-xs font-bold text-neutral-400">{done}/{items.length}</span></div><div className="space-y-2">{items.map(x=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-3"><ToggleButton table="thesis_admin_items" id={x.id} field="is_done" current={x.is_done} tab="administrasi" label=""/><div className="min-w-0 flex-1"><p className={`text-sm font-bold ${x.is_done?"text-neutral-400 line-through":""}`}>{x.title}</p>{x.due_date&&<p className="text-xs text-neutral-400">Deadline {dateLabel(x.due_date)}</p>}</div><DeleteButton table="thesis_admin_items" id={x.id} tab="administrasi"/></div>)}</div></div>})}</div>}</SectionCard>
    <SectionCard title="Tambah checklist"><form action={addThesisAdminItem} className="space-y-3"><select className="field" name="phase"><option value="sempro">Sempro</option><option value="semhas">Semhas</option><option value="sidang">Sidang</option><option value="yudisium">Yudisium</option><option value="umum">Umum</option></select><input className="field" name="title" placeholder="Contoh: Lembar ACC pembimbing" required/><input className="field" name="due_date" type="date"/><textarea className="field min-h-20" name="notes" placeholder="Catatan"/><input className="field" name="position" type="number" min="0" placeholder="Urutan"/><SubmitButton><Plus size={16}/> Tambah checklist</SubmitButton></form></SectionCard>
  </div>;
}

function TargetPrioritas({ rows }: { rows: any[] }) {
  const active=rows.filter(x=>!x.is_done);const priority=active.find(x=>x.priority==="high")??active[0];
  return <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
    <div className="space-y-6"><SectionCard title="Apa yang harus aku kerjakan sekarang?" description="Berdasarkan target dan deadline yang kamu catat.">{priority?<div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-red-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-red-600">Prioritas hari ini</p><p className="mt-2 text-xl font-black">{priority.title}</p>{priority.details&&<p className="mt-2 text-sm text-neutral-600">{priority.details}</p>}{priority.due_at&&<p className="mt-3 text-xs font-black text-red-600">Deadline {dateTimeLabel(priority.due_at)}</p>}<div className="mt-4"><ToggleButton table="thesis_tasks" id={priority.id} field="is_done" current={priority.is_done} tab="target" label="Tandai selesai"/></div></div>:<EmptyState>Belum ada target aktif.</EmptyState>}<div className="mt-4 space-y-2">{rows.filter(x=>x.id!==priority?.id).map(x=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-3"><ToggleButton table="thesis_tasks" id={x.id} field="is_done" current={x.is_done} tab="target" label=""/><div className="min-w-0 flex-1"><p className={`text-sm font-bold ${x.is_done?"line-through text-neutral-400":""}`}>{x.title}</p>{x.due_at&&<p className="text-xs text-neutral-400">{dateTimeLabel(x.due_at)}</p>}</div><DeleteButton table="thesis_tasks" id={x.id} tab="target"/></div>)}</div></SectionCard><StudyTimer/></div>
    <SectionCard title="Tambah target"><form action={addThesisTask} className="space-y-3"><input className="field" name="title" placeholder="Contoh: Revisi latar belakang" required/><textarea className="field min-h-20" name="details" placeholder="Detail target"/><input className="field" name="due_at" type="datetime-local"/><select className="field" name="priority"><option value="normal">Normal</option><option value="high">Prioritas tinggi</option><option value="low">Rendah</option></select><select className="field" name="focus_minutes" defaultValue="45"><option value="25">Fokus 25 menit</option><option value="45">Fokus 45 menit</option><option value="60">Fokus 60 menit</option><option value="90">Fokus 90 menit</option></select><SubmitButton><Target size={16}/> Tambah target</SubmitButton></form></SectionCard>
  </div>;
}

function Notifikasi({ rows }: { rows: any[] }) {
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
    <SectionCard title="Notifikasi Skripsi">{rows.length===0?<EmptyState>Belum ada pengingat Skripsi.</EmptyState>:<div className="space-y-3">{rows.map(x=><div key={x.id} className={`flex gap-3 rounded-2xl border p-4 ${x.is_read?"border-black/5 bg-neutral-50":"border-orange-100 bg-white"}`}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${x.kind==="deadline"?"bg-red-50 text-red-600":x.kind==="supervision"?"bg-orange-50 text-orange-600":"bg-blue-50 text-blue-600"}`}><Bell size={18}/></div><div className="min-w-0 flex-1"><p className="font-black">{x.title}</p><p className="mt-1 text-sm text-neutral-600">{x.message}</p><p className="mt-2 text-xs text-neutral-400">{x.notify_at?`Jadwal ${dateTimeLabel(x.notify_at)}`:dateTimeLabel(x.created_at)}</p><div className="mt-3"><ToggleButton table="thesis_notifications" id={x.id} field="is_read" current={x.is_read} tab="notifikasi" label={x.is_read?"Sudah dibaca":"Tandai dibaca"}/></div></div><DeleteButton table="thesis_notifications" id={x.id} tab="notifikasi"/></div>)}</div>}</SectionCard>
    <SectionCard title="Buat pengingat"><form action={addThesisNotification} className="space-y-3"><input className="field" name="title" placeholder="Judul pengingat" required/><textarea className="field min-h-20" name="message" placeholder="Pesan"/><select className="field" name="kind"><option value="info">Info</option><option value="supervision">Bimbingan</option><option value="deadline">Deadline</option><option value="feedback">Feedback</option><option value="system">Sistem</option></select><input className="field" name="notify_at" type="datetime-local"/><SubmitButton><Bell size={16}/> Simpan pengingat</SubmitButton></form></SectionCard>
  </div>;
}

function TimelinePage({ rows, targetGraduation }: { rows: any[]; targetGraduation?: string }) {
  const days=daysUntil(targetGraduation);const done=rows.filter(x=>x.is_done).length;
  return <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
    <SectionCard title="Timeline Skripsi" description={days!==null?`${days} hari lagi menuju target lulus`:"Atur target kelulusan di Overview."}>{rows.length===0?<EmptyState>Belum ada milestone.</EmptyState>:<div className="mt-2 space-y-0">{rows.map((x,index)=><div key={x.id} className="relative flex gap-4 pb-6 last:pb-0">{index<rows.length-1&&<div className="absolute left-[15px] top-8 h-[calc(100%-18px)] w-0.5 bg-neutral-200"/>}<ToggleButton table="thesis_milestones" id={x.id} field="is_done" current={x.is_done} tab="timeline" label=""/><div className="min-w-0 flex-1 pt-1"><p className={`font-black ${x.is_done?"text-emerald-700":""}`}>{x.title}</p><p className="mt-1 text-xs text-neutral-400">{dateLabel(x.target_date)}</p></div><DeleteButton table="thesis_milestones" id={x.id} tab="timeline"/></div>)}</div>}<div className="mt-6 rounded-2xl bg-orange-50 p-4 text-center text-sm font-bold text-orange-800">“Setiap progres kecil tetaplah progres. Kamu sudah sejauh ini.”</div></SectionCard>
    <SectionCard title="Tambah milestone"><form action={addThesisMilestone} className="space-y-3"><input className="field" name="title" placeholder="Contoh: Seminar Hasil" required/><input className="field" name="target_date" type="date"/><input className="field" name="position" type="number" min="0" placeholder="Urutan"/><SubmitButton><Timeline size={16}/> Tambah milestone</SubmitButton></form></SectionCard>
  </div>;
}
