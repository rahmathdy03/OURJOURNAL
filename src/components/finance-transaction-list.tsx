"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { deleteTransaction } from "@/features/finance/actions";
import { readableDate, rupiah } from "@/lib/format";

type Transaction = {
  id: string;
  kind: string;
  amount: number | string;
  category: string;
  description: string;
  payment_method: string;
  transaction_date: string;
};

type Period = "day" | "week" | "month" | "all";

const periodOptions: { value: Period; label: string }[] = [
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "all", label: "Semua" },
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodRange(period: Period) {
  const now = new Date();

  if (period === "day") {
    const key = localDateKey(now);
    return { start: key, end: key };
  }

  if (period === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: localDateKey(monday), end: localDateKey(sunday) };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: localDateKey(start), end: localDateKey(end) };
  }

  return null;
}

export function FinanceTransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const filtered = useMemo(() => {
    const range = periodRange(period);
    if (!range) return transactions;
    return transactions.filter(
      (transaction) =>
        transaction.transaction_date >= range.start &&
        transaction.transaction_date <= range.end
    );
  }, [period, transactions]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (result, transaction) => {
          const amount = Number(transaction.amount || 0);
          if (transaction.kind === "income") result.income += amount;
          else result.expense += amount;
          return result;
        },
        { income: 0, expense: 0 }
      ),
    [filtered]
  );

  const description =
    period === "day"
      ? "Transaksi hari ini."
      : period === "week"
        ? "Transaksi minggu ini (Senin–Minggu)."
        : period === "month"
          ? "Transaksi bulan berjalan."
          : "Semua transaksi terbaru yang dimuat.";

  return (
    <SectionCard title="Daftar transaksi" description={description}>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
                period === option.value
                  ? "bg-neutral-950 text-white"
                  : "bg-white text-neutral-600 shadow-sm ring-1 ring-black/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-right text-[11px] sm:min-w-[310px]">
          <div>
            <p className="text-neutral-400">Data</p>
            <p className="font-black text-neutral-800">{filtered.length}</p>
          </div>
          <div>
            <p className="text-neutral-400">Masuk</p>
            <p className="font-black text-emerald-600">{rupiah(totals.income)}</p>
          </div>
          <div>
            <p className="text-neutral-400">Keluar</p>
            <p className="font-black text-red-600">{rupiah(totals.expense)}</p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Tidak ada transaksi pada periode ini.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th>Nominal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((transaction) => {
                const fromShopping =
                  transaction.payment_method === "Belanja otomatis";
                const income = transaction.kind === "income";

                return (
                  <tr key={transaction.id}>
                    <td>{readableDate(transaction.transaction_date)}</td>
                    <td>
                      <span
                        className={`pill ${
                          income
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {income ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td>{transaction.category}</td>
                    <td>
                      <b>{transaction.description || "-"}</b>
                      <div className="text-xs text-neutral-400">
                        {fromShopping
                          ? "Dari menu Belanja"
                          : transaction.payment_method}
                      </div>
                    </td>
                    <td
                      className={`font-black ${
                        income ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {income ? "+" : "-"}
                      {rupiah(transaction.amount)}
                    </td>
                    <td>
                      {fromShopping ? (
                        <span className="pill bg-orange-50 text-orange-700">
                          Otomatis
                        </span>
                      ) : (
                        <form action={deleteTransaction}>
                          <input
                            type="hidden"
                            name="id"
                            value={transaction.id}
                          />
                          <button className="btn-danger">Hapus</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
