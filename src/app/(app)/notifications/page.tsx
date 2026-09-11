import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, Clock3, History } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/actions";
import { getProfileAndModules } from "@/lib/auth";
import {
  monthRange,
  readableDate,
  readableDateTime,
  rupiah,
  today,
} from "@/lib/format";

export default async function NotificationsPage() {
  const { supabase, modules } = await getProfileAndModules();
  const { start, end } = monthRange();

  const [{ data: stored }, { data: assignments }, { data: tx }, { data: budgets }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("id,title,message,kind,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(80),
      modules.includes("academic")
        ? supabase
            .from("academic_assignments")
            .select("id,title,due_date")
            .eq("is_done", false)
            .gte("due_date", today())
            .order("due_date")
            .limit(10)
        : Promise.resolve({ data: [] as any[] }),
      modules.includes("finance")
        ? supabase
            .from("finance_transactions")
            .select("kind,amount")
            .gte("transaction_date", start)
            .lt("transaction_date", end)
        : Promise.resolve({ data: [] as any[] }),
      modules.includes("finance")
        ? supabase
            .from("finance_budgets")
            .select("category,amount")
            .eq("month", start)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  let ingredients: any[] = [];
  if (modules.includes("kebab")) {
    const result = await supabase
      .from("kebab_ingredients")
      .select("id,name,unit,stock_quantity,low_stock_threshold,expires_at")
      .order("name");
    ingredients = result.data ?? [];
  }

  const expense = (tx ?? [])
    .filter((row: any) => row.kind === "expense")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const budgetRows = budgets ?? [];
  const budget = Number(
    budgetRows.find((row: any) => row.category === "Total")?.amount ??
      budgetRows.reduce(
        (sum: number, row: any) => sum + Number(row.amount),
        0
      )
  );
  const low = ingredients.filter(
    (row: any) => Number(row.stock_quantity) <= Number(row.low_stock_threshold)
  );
  const soon = ingredients.filter(
    (row: any) =>
      row.expires_at &&
      new Date(`${row.expires_at}T23:59:59`) <=
        new Date(Date.now() + 7 * 86_400_000)
  );
  const unread = (stored ?? []).filter((row: any) => !row.is_read).length;

  const headerAction = (
    <div className="flex flex-wrap gap-2">
      <Link href="/activity" className="btn-soft">
        <History size={16} /> Aktivitas
      </Link>
      {unread > 0 && (
        <form action={markAllNotificationsRead}>
          <button className="btn-soft">
            <CheckCheck size={16} /> Tandai semua dibaca
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Pusat perhatian"
        title="Notifikasi"
        description="Gabungan notifikasi tersimpan, smart reminder, dan peringatan langsung dari kondisi data."
        action={headerAction}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Peringatan langsung"
          description="Dihitung dari data terbaru setiap halaman dibuka."
        >
          <div className="space-y-2">
            {budget > 0 && expense / budget >= 0.8 && (
              <Notice
                icon={<AlertTriangle />}
                title="Budget bulan ini hampir habis"
                text={`${Math.round((expense / budget) * 100)}% terpakai · ${rupiah(
                  expense
                )} dari ${rupiah(budget)}`}
              />
            )}
            {(assignments ?? []).map((assignment: any) => (
              <Notice
                key={assignment.id}
                icon={<Clock3 />}
                title={`Deadline: ${assignment.title}`}
                text={readableDate(assignment.due_date)}
              />
            ))}
            {low.map((ingredient: any) => (
              <Notice
                key={`low-${ingredient.id}`}
                icon={<AlertTriangle />}
                title={`Stok ${ingredient.name} hampir habis`}
                text={`Sisa ${ingredient.stock_quantity} ${ingredient.unit}`}
              />
            ))}
            {soon.map((ingredient: any) => (
              <Notice
                key={`exp-${ingredient.id}`}
                icon={<AlertTriangle />}
                title={`${ingredient.name} mendekati expired`}
                text={readableDate(ingredient.expires_at)}
              />
            ))}
            {!(budget > 0 && expense / budget >= 0.8) &&
              (assignments ?? []).length === 0 &&
              low.length === 0 &&
              soon.length === 0 && (
                <EmptyState>Tidak ada peringatan langsung.</EmptyState>
              )}
          </div>
        </SectionCard>

        <SectionCard
          title="Riwayat notifikasi"
          description="Pengingat otomatis termasuk H-1, tindak lanjut overdue, dan peringatan budget."
        >
          {(stored ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {(stored ?? []).map((notification: any) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border border-black/5 p-4 ${
                    notification.is_read ? "bg-neutral-50 opacity-70" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <Bell size={17} className="mt-0.5 text-orange-600" />
                      <div>
                        <p className="font-black">{notification.title}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-neutral-400">
                          {readableDateTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={notification.id} />
                        <button className="btn-soft">Dibaca</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function Notice({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-amber-900">
      <div className="mt-0.5 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs opacity-80">{text}</p>
      </div>
    </div>
  );
}
