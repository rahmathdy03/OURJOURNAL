import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

import { ThesisIntro } from "@/components/thesis-intro";
import { ThesisMobileWorkspace } from "@/components/thesis-mobile-workspace";
import { validThesisTab } from "@/features/academic/thesis-nav";
import { requireModule } from "@/lib/auth";

export default async function ThesisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; intro?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tab = validThesisTab(params.tab);
  const { supabase, profile } = await requireModule("academic");
  const workspaceRes = await supabase.from("thesis_workspaces").select("*").maybeSingle();

  if (workspaceRes.error) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link href="/academic" className="inline-flex items-center gap-2 text-sm font-black text-neutral-600">
          <ArrowLeft size={17} /> Kembali ke Kuliah
        </Link>
        <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><GraduationCap /></div>
          <h1 className="text-2xl font-black">Workspace Skripsi siap dipasang</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Jalankan migration Skripsi v1 di project Supabase OUR_JOURNAL agar data Rahmat dan Finka tersimpan privat. Setelah itu halaman ini langsung aktif.</p>
        </div>
      </div>
    );
  }

  const workspace = workspaceRes.data;
  const firstName = (profile?.display_name || "Kamu").trim().split(/\s+/)[0];
  let rows: any[] = [];
  let overview = {
    supervisions: [] as any[],
    research: [] as any[],
    tasks: [] as any[],
    admin: [] as any[],
    milestones: [] as any[],
  };

  if (tab === "overview") {
    const now = new Date().toISOString();
    const [supervisions, research, tasks, admin, milestones] = await Promise.all([
      supabase.from("thesis_supervisions").select("*").gte("scheduled_at", now).neq("status", "cancelled").order("scheduled_at").limit(3),
      supabase.from("thesis_research_steps").select("*").order("position").order("created_at").limit(30),
      supabase.from("thesis_tasks").select("*").eq("is_done", false).order("due_at", { ascending: true, nullsFirst: false }).limit(8),
      supabase.from("thesis_admin_items").select("*").eq("is_done", false).order("due_date", { ascending: true, nullsFirst: false }).limit(8),
      supabase.from("thesis_milestones").select("*").order("position").order("target_date").limit(20),
    ]);
    overview = {
      supervisions: supervisions.data ?? [],
      research: research.data ?? [],
      tasks: tasks.data ?? [],
      admin: admin.data ?? [],
      milestones: milestones.data ?? [],
    };
  } else if (tab === "bimbingan") {
    rows = (await supabase.from("thesis_supervisions").select("*").order("scheduled_at", { ascending: false }).limit(120)).data ?? [];
  } else if (tab === "penelitian") {
    rows = (await supabase.from("thesis_research_steps").select("*").order("position").order("created_at").limit(120)).data ?? [];
  } else if (tab === "referensi") {
    rows = (await supabase.from("thesis_references").select("*").order("created_at", { ascending: false }).limit(180)).data ?? [];
  } else if (tab === "file") {
    rows = (await supabase.from("thesis_files").select("*").order("document_date", { ascending: false }).limit(180)).data ?? [];
  } else if (tab === "administrasi") {
    rows = (await supabase.from("thesis_admin_items").select("*").order("phase").order("position").limit(180)).data ?? [];
  } else if (tab === "target") {
    rows = (await supabase.from("thesis_tasks").select("*").order("is_done").order("due_at", { ascending: true, nullsFirst: false }).limit(180)).data ?? [];
  } else if (tab === "notifikasi") {
    rows = (await supabase.from("thesis_notifications").select("*").order("created_at", { ascending: false }).limit(180)).data ?? [];
  } else if (tab === "timeline") {
    rows = (await supabase.from("thesis_milestones").select("*").order("position").order("target_date").limit(120)).data ?? [];
  }

  return (
    <>
      <ThesisIntro show={params.intro === "1"} />
      <ThesisMobileWorkspace
        tab={tab}
        firstName={firstName}
        workspace={workspace}
        rows={rows}
        overview={overview}
        saved={params.saved}
        error={params.error}
      />
    </>
  );
}
