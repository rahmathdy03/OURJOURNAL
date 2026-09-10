"use client";

import { useState } from "react";

const expenseCategories = [
  ["Makanan & Minuman", "🍜 Makanan & Minuman"],
  ["Bensin & Transportasi", "⛽ Bensin & Transportasi"],
  ["Listrik & Tagihan", "💡 Listrik & Tagihan"],
  ["Kebutuhan Rumah", "🏠 Kebutuhan Rumah"],
  ["Belanja Harian", "🛒 Belanja Harian"],
  ["Pakaian & Fashion", "👕 Pakaian & Fashion"],
  ["Perawatan Pribadi", "🧴 Perawatan Pribadi"],
  ["Kesehatan", "💊 Kesehatan"],
  ["Kuliah & Pendidikan", "🎓 Kuliah & Pendidikan"],
  ["Elektronik & Gadget", "📱 Elektronik & Gadget"],
  ["Hiburan", "🎮 Hiburan"],
  ["Hadiah & Sosial", "🎁 Hadiah & Sosial"],
  ["Lainnya", "📦 Lainnya"],
] as const;

const incomeCategories = [
  ["Gaji", "💼 Gaji"],
  ["Usaha & Penjualan", "🏪 Usaha & Penjualan"],
  ["Bonus", "🎉 Bonus"],
  ["Transfer Masuk", "↙️ Transfer Masuk"],
  ["Refund", "↩️ Refund"],
  ["Hadiah", "🎁 Hadiah"],
  ["Investasi", "📈 Investasi"],
  ["Lainnya", "📦 Lainnya"],
] as const;

export function FinanceTransactionFields() {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("");
  const categories = kind === "expense" ? expenseCategories : incomeCategories;

  return (
    <>
      <select
        className="field"
        name="kind"
        value={kind}
        onChange={(event) => {
          setKind(event.target.value as "expense" | "income");
          setCategory("");
        }}
      >
        <option value="expense">Pengeluaran</option>
        <option value="income">Pemasukan</option>
      </select>

      <select
        className="field"
        name="category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        required
      >
        <option value="" disabled>Pilih kategori</option>
        {categories.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {category === "Lainnya" && (
        <input
          className="field"
          name="category_other"
          placeholder="Nama kategori lainnya"
          autoComplete="off"
          required
        />
      )}
    </>
  );
}
