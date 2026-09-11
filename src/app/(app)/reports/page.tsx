import { BarChart3, BookOpenCheck, ShoppingCart, WalletCards } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { getProfileAndModules } from "@/lib/auth";
import { monthRange, rupiah } from "@/lib/format";

export default async function ReportsPage() {
  const { supabase, modules } = await getProfileAndModules();
  const { start, end } = monthRange();

  const [txRes, shopRes, assignRes, studyRes] = await Promise.all([
    modules.includes("finance")
      ? supabase
          .from("finance_transactions")
          .select("id,kind,amount,category,payment_method")
          .gte("transaction_date", start)
          .lt("transaction_date", end)
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("shopping")
      ? supabase
          .from("shopping_entries")
          .select("id,total_amount,category")
          .gte("purchased_at", start)
          .lt("purchased_at", end)
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("academic")
      ? supabase.from("academic_assignments").select("is_done")
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("academic")
      ? supabase
          .from("academic_study_sessions")
          .select("duration_minutes")
          .gte("completed_at", `${start}T00:00:00`)
          .lt("completed_at", `${end}T00:00:00`)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const tx = txRes.data ?? [];
  const shop = shopRes.data ?? [];

  const income = tx
    .filter((item: any) => item.kind === "income")
    .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const expense = tx
    .filter((item: any) => item.kind === "expense")
    .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const shopping = shop.reduce(
    (sum: number, item: any) => sum + Number(item.total_amount),
    0
  );

  const assignments = assignRes.data ?? [];
  const completed = assignments.filter((item: any) => item.is_done).length;
  const study = (studyRes.data ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.duration_minutes),
    0
  );

  const category = new Map<string, number>();
  const expenseTransactions = tx.filter((item: any) => item.kind === "expense");

  for (const item of expenseTransactions) {
    const name = String(item.category || "Lainnya");
    category.set(name, (category.get(name) || 0) + Number(item.amount));
  }

  // Belanja baru sudah otomatis masuk ke Keuangan dengan ID yang sama.
  // Hanya tambahkan catatan belanja lama yang belum punya pasangan transaksi
  // supaya laporan tetap lengkap tanpa menghitung pengeluaran dua kali.
  const syncedShoppingIds = new Set(
    expenseTransactions
      .filter((item: any) => item.payment_method === "Belanja otomatis")
      .map((item: any) => String(item.id))
  );

  for (const item of shop) {
    if (syncedShoppingIds.has(String(item.id))) continue;
    const name = String(item.category || "Lainnya");
    category.set(name, (category.get(name) || 0) + Number(item.total_amount));
  }

  const rows = [...category.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((item) => item[1]), 1);

  let kebabSpend = 0;
  let kebabProduction = 0;
  let kebabWaste = 0;

  if (modules.includes("kebab")) {
    const [purchaseRes, productionRes, wasteRes] = await Promise.all([
      supabase
        .from("kebab_purchases")
        .select("total_cost")
        .gte("purchased_at", start)
        .lt("purchased_at", end),
      supabase
        .from("kebab_productions")
        .select("quantity")
        .gte("production_date", start)
        .lt("production_date", end),
      supabase
        .from("kebab_waste")
        .select("quantity")
        .gte("waste_date", start)
        .lt("waste_date", end),
    ]);

    kebabSpend = (purchaseRes.data ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.total_cost),
      0
    );
    kebabProduction = (productionRes.data ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.quantity),
      0
    );
    kebabWaste = (wasteRes.data ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.quantity),
      0
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Ringkasan lintas modul"
        title="Laporan"
        description="Laporan personal mengikuti modul yang tersedia pada akun. Data kedua user tidak dicampur."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.includes("finance") && (
          <StatCard
            label="Arus bersih"
            value={rupiah(income - expense)}
            note={`Masuk ${rupiah(income)} · keluar ${rupiah(expense)}`}
            icon={WalletCards}
          />
        )}
        {modules.includes("shopping") && (
          <StatCard label="Belanja" value={rupiah(shopping)} icon={ShoppingCart} />
        )}
        {modules.includes("academic") && (
          <StatCard
            label="Tugas selesai"
            value={`${completed}/${assignments.length}`}
            note={`Belajar ${study} menit bulan ini`}
            icon={BookOpenCheck}
          />
        )}
        {modules.includes("kebab") && (
          <StatCard
            label="Produksi"
            value={`${kebabProduction} pcs`}
            note={`Belanja bahan ${rupiah(kebabSpend)} · waste ${kebabWaste}`}
            icon={BarChart3}
          />
        )}
      </div>

      <SectionCard
        title="Distribusi pengeluaran bulan ini"
        description="Pengeluaran digabung per kategori tanpa menghitung ulang belanja yang sudah tersinkron otomatis ke Keuangan."
      >
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada pengeluaran bulan ini.</p>
          ) : (
            rows.map(([name, value]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{name}</span>
                  <b>{rupiah(value)}</b>
                </div>
                <div className="h-2 rounded-full bg-neutral-100">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}
