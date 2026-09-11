import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ModuleSubnav } from "@/components/module-subnav";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { requireModule } from "@/lib/auth";
import { readableDate, today, weekdayName } from "@/lib/format";
import { academicNav } from "@/features/academic/nav";
import {
  addAssignment,
  addAssignmentProgressNote,
  addCourse,
  addSchedule,
  toggleAssignment,
} from "@/features/academic/actions";

const ASSIGNMENT_PROGRESS_PREFIX = "ourjournal:assignment-progress:";

export default async function AcademicPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { supabase } = await requireModule("academic");
  const [coursesRes, assignRes, scheduleRes, sessionsRes, progressNotesRes] =
    await Promise.all([
      supabase
        .from("academic_courses")
        .select("id,name,lecturer,semester,credits")
        .order("name"),
      supabase
        .from("academic_assignments")
        .select(
          "id,course_id,title,description,due_date,priority,progress,is_done,academic_courses(name)"
        )
        .order("is_done")
        .order("due_date")
        .limit(80),
      supabase
        .from("academic_schedules")
        .select(
          "id,weekday,start_time,end_time,room,meeting_url,academic_courses(name)"
        )
        .order("weekday")
        .order("start_time"),
      supabase
        .from("academic_study_sessions")
        .select("duration_minutes,completed_at")
        .gte(
          "completed_at",
          new Date(Date.now() - 7 * 86400000).toISOString()
        ),
      supabase
        .from("academic_notes")
        .select("id,title,content,meeting_no,resource_url,created_at")
        .like("resource_url", `${ASSIGNMENT_PROGRESS_PREFIX}%`)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

  const courses = coursesRes.data ?? [];
  const assignments = assignRes.data ?? [];
  const active = assignments.filter((x: any) => !x.is_done);
  const schedules = scheduleRes.data ?? [];
  const study = (sessionsRes.data ?? []).reduce(
    (sum: number, x: any) => sum + Number(x.duration_minutes),
    0
  );
  const params = await searchParams;

  const progressByAssignment = new Map<string, any[]>();
  for (const note of progressNotesRes.data ?? []) {
    const marker = String(note.resource_url ?? "");
    if (!marker.startsWith(ASSIGNMENT_PROGRESS_PREFIX)) continue;
    const assignmentId = marker.slice(ASSIGNMENT_PROGRESS_PREFIX.length);
    const current = progressByAssignment.get(assignmentId) ?? [];
    current.push(note);
    progressByAssignment.set(assignmentId, current);
  }

  return (
    <>
      <PageHeader
        eyebrow="Modul Kuliah"
        title="Akademik"
        description="Jadwal, mata kuliah, tugas, workspace, catatan, materi, study session, nilai, target semester, dan kalender akademik."
      />
      <ModuleSubnav items={academicNav} />

      <Link
        href="/academic/thesis?tab=overview&intro=1"
        prefetch
        className="group flex items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-[#fff8ef] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm">
            <GraduationCap size={24} />
            <Sparkles
              size={13}
              className="absolute -right-1 -top-1 text-orange-500"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">
              Workspace khusus
            </p>
            <p className="mt-0.5 text-lg font-black">Skripsi</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Bimbingan, penelitian, jurnal, file Drive, administrasi, target,
              notifikasi, dan timeline sampai lulus.
            </p>
          </div>
        </div>
        <ArrowRight
          className="shrink-0 text-orange-600 transition group-hover:translate-x-1"
          size={20}
        />
      </Link>

      {params.success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Data akademik berhasil disimpan.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Mata kuliah"
          value={String(courses.length)}
          icon={GraduationCap}
        />
        <StatCard
          label="Tugas aktif"
          value={String(active.length)}
          icon={CheckCircle2}
        />
        <StatCard
          label="Jadwal mingguan"
          value={String(schedules.length)}
          icon={CalendarDays}
        />
        <StatCard
          label="Belajar 7 hari"
          value={`${study} menit`}
          icon={BookOpen}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Tambah mata kuliah">
          <form action={addCourse} className="space-y-3">
            <input
              className="field"
              name="name"
              placeholder="Nama mata kuliah"
              required
            />
            <input className="field" name="lecturer" placeholder="Dosen" />
            <input
              className="field"
              name="semester"
              placeholder="Semester, mis. 2026/1"
            />
            <input
              className="field"
              name="credits"
              type="number"
              min="0"
              max="12"
              placeholder="SKS"
            />
            <SubmitButton>Tambah mata kuliah</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Tambah tugas">
          <form action={addAssignment} className="space-y-3">
            <select className="field" name="course_id">
              <option value="">Tanpa mata kuliah</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <input
              className="field"
              name="title"
              placeholder="Judul tugas"
              required
            />
            <textarea
              className="field min-h-20"
              name="description"
              placeholder="Deskripsi"
            />
            <input
              className="field"
              name="due_date"
              type="date"
              min={today()}
              required
            />
            <select className="field" name="priority">
              <option value="normal">Prioritas normal</option>
              <option value="high">Tinggi</option>
              <option value="low">Rendah</option>
            </select>
            <input type="hidden" name="progress" value="0" />
            <SubmitButton>Tambah tugas</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Tambah jadwal">
          <form action={addSchedule} className="space-y-3">
            <select className="field" name="course_id">
              <option value="">Pilih mata kuliah</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <select className="field" name="weekday">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <option key={day} value={day}>
                  {weekdayName(day)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="field" name="start_time" type="time" required />
              <input className="field" name="end_time" type="time" required />
            </div>
            <input className="field" name="room" placeholder="Ruangan" />
            <input
              className="field"
              name="meeting_url"
              type="url"
              placeholder="Link Meet/Zoom"
            />
            <SubmitButton>Tambah jadwal</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard
          title="Tugas & deadline"
          description="Tambahkan catatan progress tanpa perlu membuka workspace tugas."
        >
          {assignments.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment: any) => {
                const notes =
                  progressByAssignment.get(String(assignment.id)) ?? [];
                const latest = notes[0];
                const nextProgress = notes.length + 1;

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-xl border border-black/5 p-4 ${
                      assignment.is_done
                        ? "bg-neutral-50 opacity-60"
                        : "bg-white"
                    }`}
                  >
                    <div>
                      <Link
                        href={`/academic/assignments/${assignment.id}`}
                        className="font-black hover:text-orange-600"
                      >
                        {assignment.title}
                      </Link>
                      <p className="mt-1 text-xs text-neutral-500">
                        {assignment.academic_courses?.name || "Umum"} · deadline{" "}
                        {readableDate(assignment.due_date)}
                      </p>
                      <div className="mt-2 w-56 max-w-full">
                        <ProgressBar value={Number(assignment.progress)} />
                      </div>

                      {latest && (
                        <div className="mt-3 rounded-xl bg-orange-50/70 px-3 py-2.5">
                          <p className="text-xs font-black text-orange-700">
                            {latest.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-600">
                            {latest.content}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                      <details className="min-w-0 flex-1 rounded-xl bg-neutral-50 open:bg-orange-50/60">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-black text-orange-700 marker:hidden">
                          + Progress
                          {notes.length > 0 && (
                            <span className="ml-2 text-xs font-bold text-neutral-400">
                              ({notes.length})
                            </span>
                          )}
                        </summary>
                        <form
                          action={addAssignmentProgressNote}
                          className="space-y-2 border-t border-orange-100 px-3 pb-3 pt-3"
                        >
                          <input
                            type="hidden"
                            name="assignment_id"
                            value={assignment.id}
                          />
                          <input
                            className="field"
                            name="title"
                            defaultValue={`Progress ${nextProgress}`}
                            placeholder="Progress 1"
                            required
                          />
                          <textarea
                            className="field min-h-24"
                            name="description"
                            placeholder="Deskripsi progress yang sudah dikerjakan"
                            required
                          />
                          <SubmitButton>Simpan progress</SubmitButton>
                        </form>
                      </details>

                      <form action={toggleAssignment}>
                        <input type="hidden" name="id" value={assignment.id} />
                        <input
                          type="hidden"
                          name="done"
                          value={String(assignment.is_done)}
                        />
                        <input
                          type="hidden"
                          name="progress"
                          value={assignment.progress}
                        />
                        <button className="btn-soft">
                          {assignment.is_done ? "Buka lagi" : "Selesai"}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Jadwal mingguan">
          {schedules.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule: any) => (
                <div
                  key={schedule.id}
                  className="rounded-xl bg-neutral-50 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {schedule.academic_courses?.name || "Kegiatan"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {weekdayName(schedule.weekday)} ·{" "}
                        {String(schedule.start_time).slice(0, 5)}–
                        {String(schedule.end_time).slice(0, 5)}
                      </p>
                    </div>
                    <span className="pill">{schedule.room || "Online"}</span>
                  </div>
                  {schedule.meeting_url && (
                    <a
                      href={schedule.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-orange-600"
                    >
                      Buka link kelas →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
