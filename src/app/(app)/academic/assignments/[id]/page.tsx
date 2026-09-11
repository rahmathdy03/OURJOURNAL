import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/submit-button";
import { ProgressBar } from "@/components/progress-bar";
import { requireModule } from "@/lib/auth";
import { readableDate, readableDateTime } from "@/lib/format";
import {
  addAssignmentProgressNote,
  addAssignmentStep,
  setAssignmentProgress,
  toggleAssignmentStep,
} from "@/features/academic/actions";

const ASSIGNMENT_PROGRESS_PREFIX = "ourjournal:assignment-progress:";

export default async function AssignmentWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireModule("academic");
  const progressMarker = `${ASSIGNMENT_PROGRESS_PREFIX}${id}`;

  const [{ data: assignment }, { data: steps }, { data: progressNotes }] =
    await Promise.all([
      supabase
        .from("academic_assignments")
        .select(
          `
          id,
          title,
          description,
          due_date,
          priority,
          progress,
          is_done,
          academic_courses(name)
          `
        )
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("academic_assignment_steps")
        .select("id,title,is_done,position")
        .eq("assignment_id", id)
        .order("position")
        .order("created_at"),

      supabase
        .from("academic_notes")
        .select("id,title,content,meeting_no,created_at")
        .eq("resource_url", progressMarker)
        .order("meeting_no", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (!assignment) {
    notFound();
  }

  const list = steps ?? [];
  const progressList = progressNotes ?? [];
  const done = list.filter((step) => step.is_done).length;

  const courseRelation = assignment.academic_courses as
    | { name?: string }
    | Array<{ name?: string }>
    | null;
  const courseName = Array.isArray(courseRelation)
    ? courseRelation[0]?.name ?? "Umum"
    : courseRelation?.name ?? "Umum";

  return (
    <>
      <PageHeader
        eyebrow="Assignment Workspace"
        title={assignment.title}
        description={`${courseName} · deadline ${readableDate(
          assignment.due_date
        )} · prioritas ${assignment.priority}`}
      />

      <SectionCard title="Progress tugas">
        <ProgressBar
          value={Number(assignment.progress)}
          label={`${Number(assignment.progress)}%`}
        />

        <form
          action={setAssignmentProgress}
          className="mt-4 flex max-w-sm gap-2"
        >
          <input type="hidden" name="id" value={assignment.id} />

          <input
            className="field"
            name="progress"
            type="number"
            min="0"
            max="100"
            defaultValue={assignment.progress}
          />

          <SubmitButton>Update</SubmitButton>
        </form>

        {assignment.description && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
            {assignment.description}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Catatan progress"
        description="Simpan perkembangan pengerjaan satu per satu agar riwayat tugas mudah dilihat."
      >
        <form action={addAssignmentProgressNote} className="space-y-3">
          <input type="hidden" name="assignment_id" value={assignment.id} />
          <input
            className="field"
            name="title"
            defaultValue={`Progress ${progressList.length + 1}`}
            placeholder="Progress 1"
            required
          />
          <textarea
            className="field min-h-28"
            name="description"
            placeholder="Deskripsi progress yang sudah dikerjakan"
            required
          />
          <SubmitButton>Simpan progress</SubmitButton>
        </form>

        {progressList.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-black/5 pt-4">
            {progressList.map((note) => (
              <article
                key={note.id}
                className="rounded-xl border border-orange-100 bg-orange-50/50 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-neutral-900">{note.title}</p>
                  <p className="text-[11px] font-semibold text-neutral-400">
                    {readableDateTime(note.created_at)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                  {note.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Checklist pengerjaan"
        description={`${done}/${list.length} langkah selesai`}
      >
        <form action={addAssignmentStep} className="mb-4 flex gap-2">
          <input
            type="hidden"
            name="assignment_id"
            value={assignment.id}
          />

          <input type="hidden" name="position" value={list.length} />

          <input
            className="field"
            name="title"
            placeholder="Contoh: Buat ERD"
            required
          />

          <SubmitButton>Tambah</SubmitButton>
        </form>

        <div className="space-y-2">
          {list.map((step) => (
            <form
              action={toggleAssignmentStep}
              key={step.id}
              className={`flex items-center justify-between rounded-xl p-3 ${
                step.is_done ? "bg-emerald-50" : "bg-neutral-50"
              }`}
            >
              <input type="hidden" name="id" value={step.id} />

              <input
                type="hidden"
                name="assignment_id"
                value={assignment.id}
              />

              <input
                type="hidden"
                name="done"
                value={String(step.is_done)}
              />

              <span
                className={`text-sm font-bold ${
                  step.is_done ? "line-through opacity-60" : ""
                }`}
              >
                {step.title}
              </span>

              <button className="btn-soft">
                {step.is_done ? "Batal" : "Selesai"}
              </button>
            </form>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
