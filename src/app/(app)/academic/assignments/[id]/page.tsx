import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/submit-button";
import { ProgressBar } from "@/components/progress-bar";
import { requireModule } from "@/lib/auth";
import { readableDate } from "@/lib/format";
import {
  addAssignmentStep,
  setAssignmentProgress,
  toggleAssignmentStep,
} from "@/features/academic/actions";

export default async function AssignmentWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireModule("academic");

  const [{ data: assignment }, { data: steps }] = await Promise.all([
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
  ]);

  if (!assignment) {
    notFound();
  }

  const list = steps ?? [];
  const done = list.filter((step) => step.is_done).length;

  const courseRelation = assignment.academic_courses;

  const courseName = Array.isArray(courseRelation)
    ? courseRelation[0]?.name ?? "Umum"
    : "Umum";

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
        title="Checklist pengerjaan"
        description={`${done}/${list.length} langkah selesai`}
      >
        <form action={addAssignmentStep} className="mb-4 flex gap-2">
          <input
            type="hidden"
            name="assignment_id"
            value={assignment.id}
          />

          <input
            type="hidden"
            name="position"
            value={list.length}
          />

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