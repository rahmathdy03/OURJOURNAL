"use client";

import { useState } from "react";

const categories = [
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

export function ShoppingCategoryField({ className = "" }: { className?: string }) {
  const [category, setCategory] = useState("");

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <select
        className="field"
        name="category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        required
      >
        <option value="" disabled>
          Pilih kategori
        </option>
        {categories.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
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
    </div>
  );
}
