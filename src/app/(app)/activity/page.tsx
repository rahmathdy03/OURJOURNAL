import Link from "next/link";
import { Bell, BookOpenCheck, GraduationCap, History, ShoppingCart, WalletCards } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getProfileAndModules } from "@/lib/auth";
import { readableDateTime, rupiah } from "@/lib/format";

type ActivityArea = "finance" | "shopping" | "academic" | "kebab" | "system";

type ActivityItem = {
  id: string;
  at: string;
  area: ActivityArea;
  title: string;
  detail: string;
  href: string;
};

const areaMeta: Record<
  ActivityArea,
  { label: string; icon: typeof History; className: string }
> = {
  finance: {
    label: "Keuangan",
    icon: WalletCards,
    className: "bg-emerald-50 text-emerald-700",
  },
  shopping: {
    label: "Belanja",
    icon: ShoppingCart,
    className: "bg-sky-50 text-sky-700",
  },
  academic: {
    label: "Kuliah",
    icon: GraduationCap,
    className: "bg-violet-50 text-violet-700",
  },
  kebab: {
    label: "Kebab Finka",
    icon: BookOpenCheck,
    className: "bg-orange-50 text-orange-700",
  },
  system: {
    label: "Sistem",
    icon: Bell,
    className: "bg-neutral-100 text-neutral-700",
  },
};

function timeValue(value: string) {
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : 0;
}

export default async function ActivityPage() {
  const { supabase, modules } = await getProfileAndModules();
  const financeEnabled = modules.includes("finance");
  const shoppingEnabled = modules.includes("shopping");
  const academicEnabled = modules.includes("academic");
  const kebabEnabled = modules.includes("kebab");

  const [
    financeResult,
    shoppingResult,
    assignmentResult,
    studyResult,
    notificationResult,
    productionResult,
    stockResult,
  ] = await Promise.all([
    financeEnabled
      ? supabase
          .from("finance_transactions")
          .select(
            "id,kind,amount,category,description,payment_method,transaction_date,created_at,updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(35)
      : Promise.resolve({ data: [] as any[] }),
    shoppingEnabled
      ? supabase
          .from("shopping_entries")
          .select("id,item_name,total_amount,purchased_at,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as any[] }),
    academicEnabled
      ? supabase
          .from("academic_assignments")
          .select(
            "id,title,due_date,is_done,progress,created_at,updated_at"
          )
          .order("updated_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    academicEnabled
      ? supabase
          .from("academic_study_sessions")
          .select("id,title,duration_minutes,completed_at,created_at")
          .order("completed_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("notifications")
      .select("id,title,message,kind,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    kebabEnabled
      ? supabase
          .from("kebab_productions")
          .select("id,quantity,production_date,notes,created_at")
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as any[] }),
    kebabEnabled
      ? supabase
          .from("kebab_stock_movements")
          .select(
            "id,direction,quantity,movement_type,note,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const items: ActivityItem[] = [];

  for (const row of financeResult.data ?? []) {
    const income = row.kind === "income";
    items.push({
      id: `finance-${row.id}`,
      at: row.created_at,
      area: "finance",
      title: income ? "Pemasukan dicatat" : "Pengeluaran dicatat",
      detail: `${row.category} · ${rupiah(row.amount)}${
        row.description ? ` · ${row.description}` : ""
      }`,
      href: "/finance",
    });
  }

  for (const row of shoppingResult.data ?? []) {
    items.push({
      id: `shopping-${row.id}`,
      at: row.created_at,
      area: "shopping",
      title: "Belanja dicatat",
      detail: `${row.item_name} · ${rupiah(row.total_amount)}`,
      href: "/shopping",
    });
  }

  for (const row of assignmentResult.data ?? []) {
    items.push({
      id: `assignment-${row.id}`,
      at: row.is_done ? row.updated_at : row.created_at,
      area: "academic",
      title: row.is_done ? "Tugas diselesaikan" : "Tugas ditambahkan",
      detail: `${row.title} · progres ${Number(row.progress || 0)}%`,
      href: `/academic/assignments/${row.id}`,
    });
  }

  for (const row of studyResult.data ?? []) {
    items.push({
      id: `study-${row.id}`,
      at: row.completed_at || row.created_at,
      area: "academic",
      title: "Sesi belajar selesai",
      detail: `${row.title} · ${Number(row.duration_minutes || 0)} menit`,
      href: "/academic/study",
    });
  }

  for (const row of productionResult.data ?? []) {
    items.push({
      id: `production-${row.id}`,
      at: row.created_at,
      area: "kebab",
      title: "Produksi dicatat",
      detail: `${Number(row.quantity || 0)} pcs${
        row.notes ? ` · ${row.notes}` : ""
      }`,
      href: "/kebab/production",
    });
  }

  for (const row of stockResult.data ?? []) {
    const direction = row.direction === "in" ? "bertambah" : "berkurang";
    items.push({
      id: `stock-${row.id}`,
      at: row.created_at,
      area: "kebab",
      title: `Stok ${direction}`,
      detail: `${Number(row.quantity || 0)} · ${row.movement_type}${
        row.note ? ` · ${row.note}` : ""
      }`,
      href: "/kebab/stock",
    });
  }

  for (const row of notificationResult.data ?? []) {
    items.push({
      id: `notification-${row.id}`,
      at: row.created_at,
      area: "system",
      title: row.title,
      detail: row.message || "Notifikasi otomatis dibuat.",
      href: "/notifications",
    });
  }

  items.sort((a, b) => timeValue(b.at) - timeValue(a.at));
  const recent = items.slice(0, 120);

  return (
    <>
      <PageHeader
        eyebrow="Riwayat aktivitas"
        title="Aktivitas"
        description="Jejak ringkas aktivitas terbaru dari Keuangan, Belanja, Kuliah, Kebab Finka, dan pengingat otomatis."
      />

      <SectionCard
        title="Aktivitas terbaru"
        description="Data disusun dari catatan yang sudah ada, jadi tidak menambah penyimpanan database baru."
      >
        {recent.length === 0 ? (
          <EmptyState>Belum ada aktivitas yang bisa ditampilkan.</EmptyState>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => {
              const meta = areaMeta[item.area];
              const Icon = meta.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex gap-3 rounded-2xl border border-black/5 bg-white p-3.5 transition hover:border-orange-100 hover:bg-orange-50/30"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.className}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="font-black text-neutral-900">
                        {item.title}
                      </p>
                      <span className="text-[11px] font-semibold text-neutral-400">
                        {readableDateTime(item.at)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">
                      {item.detail}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-black text-neutral-500 group-hover:bg-white">
                      {meta.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
