import { ArrowDownCircle, ArrowUpCircle, Repeat2, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FinanceTransactionFields } from "@/components/finance-transaction-fields";
import { FinanceTransactionList } from "@/components/finance-transaction-list";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { SubmitButton } from "@/components/submit-button";
import {
  addRecurring,
  addTransaction,
  postRecurringNow,
  saveBudget,
  toggleRecurring,
} from "@/features/finance/actions";
import { requireModule } from "@/lib/auth";
import { currentMonth, monthRange, rupiah, today } from "@/lib/format";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { supabase } = await requireModule("finance");
  const { start, end } = monthRange();

  const [txRes, monthTxRes, budgetRes, recRes] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select(
        "id,kind,amount,category,description,payment_method,transaction_date"
      )
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("finance_transactions")
      .select("kind,amount")
      .gte("transaction_date", start)
      .lt("transaction_date", end),
    supabase
      .from("finance_budgets")
      .select("id,month,category,amount")
      .eq("month", start)
      .order("category"),
    supabase
      .from("finance_recurring")
      .select("id,kind,title,category,amount,day_of_month,active")
      .order("active", { ascending: false })
      .order("day_of_month"),
  ]);

  const tx = txRes.data ?? [];
  const monthTx = monthTxRes.data ?? [];
  const income = monthTx
    .filter((row: any) => row.kind === "income")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const expense = monthTx
    .filter((row: any) => row.kind === "expense")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const budgets = budgetRes.data ?? [];
  const total = Number(
    budgets.find((row: any) => row.category === "Total")?.amount ??
      budgets.reduce(
        (sum: number, row: any) => sum + Number(row.amount),
        0
      )
  );
  const params = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Modul umum · data pribadi"
        title="Keuangan"
        description="Pusat seluruh arus uang. Belanja yang dicatat dari menu Belanja otomatis masuk sebagai pengeluaran di sini."
      />

      {params.success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Data berhasil disimpan.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pemasukan" value={rupiah(income)} icon={ArrowUpCircle} />
        <StatCard
          label="Pengeluaran"
          value={rupiah(expense)}
          icon={ArrowDownCircle}
        />
        <StatCard
          label="Saldo bulan"
          value={rupiah(income - expense)}
          icon={Target}
        />
        <StatCard
          label="Budget"
          value={rupiah(total)}
          note={
            total
              ? `Sisa ${rupiah(Math.max(total - expense, 0))}`
              : "Belum diatur"
          }
          icon={Repeat2}
        />
      </div>

      {total > 0 && (
        <SectionCard title="Pemakaian budget">
          <ProgressBar
            value={(expense / total) * 100}
            label={`${rupiah(expense)} dari ${rupiah(total)}`}
          />
        </SectionCard>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Catat transaksi"
          description="Untuk pemasukan atau pengeluaran yang tidak dicatat lewat menu Belanja."
        >
          <form action={addTransaction} className="space-y-3">
            <FinanceTransactionFields />
            <input
              className="field"
              name="amount"
              type="number"
              min="1"
              placeholder="Nominal"
              required
            />
            <input
              className="field"
              name="description"
              placeholder="Deskripsi"
            />
            <input
              className="field"
              name="payment_method"
              placeholder="Metode bayar"
              defaultValue="Tunai"
            />
            <input
              className="field"
              name="transaction_date"
              type="date"
              defaultValue={today()}
              required
            />
            <SubmitButton>Simpan transaksi</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard
          title="Budget bulanan"
          description="Bisa total atau per kategori."
        >
          <form action={saveBudget} className="space-y-3">
            <input
              className="field"
              name="month"
              type="month"
              defaultValue={currentMonth()}
              required
            />
            <input
              className="field"
              name="category"
              defaultValue="Total"
              placeholder="Kategori"
              required
            />
            <input
              className="field"
              name="amount"
              type="number"
              min="1"
              placeholder="Batas budget"
              required
            />
            <SubmitButton>Simpan budget</SubmitButton>
          </form>

          <div className="mt-4 space-y-2">
            {budgets.map((budget: any) => (
              <div
                key={budget.id}
                className="flex justify-between rounded-xl bg-neutral-50 p-3 text-sm"
              >
                <span>{budget.category}</span>
                <b>{rupiah(budget.amount)}</b>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Transaksi rutin"
          description="Tagihan, cicilan, gaji, langganan, dll."
        >
          <form action={addRecurring} className="space-y-3">
            <select className="field" name="kind">
              <option value="expense">Pengeluaran rutin</option>
              <option value="income">Pemasukan rutin</option>
            </select>
            <input
              className="field"
              name="title"
              placeholder="Nama transaksi"
              required
            />
            <input
              className="field"
              name="category"
              placeholder="Kategori"
              required
            />
            <input
              className="field"
              name="amount"
              type="number"
              min="1"
              placeholder="Nominal"
              required
            />
            <input
              className="field"
              name="day_of_month"
              type="number"
              min="1"
              max="28"
              defaultValue="1"
              required
            />
            <SubmitButton>Tambah rutin</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <FinanceTransactionList transactions={tx} />

      <SectionCard title="Transaksi rutin tersimpan">
        {(recRes.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(recRes.data ?? []).map((recurring: any) => (
              <div
                key={recurring.id}
                className="rounded-xl border border-black/5 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black">{recurring.title}</p>
                    <p className="text-xs text-neutral-500">
                      Tanggal {recurring.day_of_month} · {recurring.category}
                    </p>
                  </div>
                  <span
                    className={`pill ${
                      recurring.active ? "bg-emerald-50 text-emerald-700" : ""
                    }`}
                  >
                    {recurring.active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <p className="mt-3 text-xl font-black">
                  {rupiah(recurring.amount)}
                </p>

                <div className="mt-3 flex gap-2">
                  <form action={postRecurringNow}>
                    <input type="hidden" name="id" value={recurring.id} />
                    <button className="btn-soft">Catat sekarang</button>
                  </form>
                  <form action={toggleRecurring}>
                    <input type="hidden" name="id" value={recurring.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={String(recurring.active)}
                    />
                    <button className="btn-soft">
                      {recurring.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
