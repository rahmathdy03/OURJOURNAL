"use client";

import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { recordPurchase } from "@/features/kebab/actions";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
};

type Supplier = {
  id: string;
  name: string;
};

type PackPreset = {
  label: string;
  factor: number;
};

const PACK_PRESETS: Array<{ match: RegExp; preset: PackPreset }> = [
  { match: /^ekomie$/i, preset: { label: "kardus", factor: 40 } },
  { match: /^kulit\s*kebab$/i, preset: { label: "bungkus", factor: 20 } },
  { match: /^beef$/i, preset: { label: "bungkus", factor: 20 } },
];

function packPresetFor(name: string) {
  const normalized = name.trim();
  return PACK_PRESETS.find((item) => item.match.test(normalized))?.preset ?? null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

export function KebabPurchaseForm({
  ingredients,
  suppliers,
  initialDate,
}: {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  initialDate: string;
}) {
  const [ingredientId, setIngredientId] = useState("");
  const [inputMode, setInputMode] = useState<"pack" | "base">("base");
  const [amount, setAmount] = useState("1");

  const ingredient = useMemo(
    () => ingredients.find((item) => item.id === ingredientId) ?? null,
    [ingredientId, ingredients]
  );
  const preset = ingredient ? packPresetFor(ingredient.name) : null;
  const numericAmount = Number(amount);
  const quantity =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount * (inputMode === "pack" && preset ? preset.factor : 1)
      : 0;

  function chooseIngredient(nextId: string) {
    setIngredientId(nextId);
    const nextIngredient = ingredients.find((item) => item.id === nextId);
    const nextPreset = nextIngredient ? packPresetFor(nextIngredient.name) : null;
    setInputMode(nextPreset ? "pack" : "base");
    setAmount("1");
  }

  return (
    <form action={recordPurchase} className="space-y-3">
      <select
        className="field"
        name="ingredient_id"
        value={ingredientId}
        onChange={(event) => chooseIngredient(event.target.value)}
        required
      >
        <option value="">Pilih bahan</option>
        {ingredients.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.unit})
          </option>
        ))}
      </select>

      <select className="field" name="supplier_id">
        <option value="">Tanpa supplier</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </select>

      {ingredient && preset ? (
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
          <div className="flex items-start gap-2">
            <PackageCheck size={18} className="mt-0.5 shrink-0 text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-neutral-900">Input cepat kemasan</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                1 {preset.label} {ingredient.name} = {preset.factor} {ingredient.unit}. Stok tetap disimpan dalam {ingredient.unit}.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInputMode("pack");
                setAmount("1");
              }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                inputMode === "pack"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 ring-1 ring-black/5"
              }`}
            >
              {preset.label.charAt(0).toUpperCase() + preset.label.slice(1)} ({preset.factor} {ingredient.unit})
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode("base");
                setAmount(String(quantity || preset.factor));
              }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                inputMode === "base"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white text-neutral-600 ring-1 ring-black/5"
              }`}
            >
              Langsung {ingredient.unit}
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label className="label">
          {ingredient && preset && inputMode === "pack"
            ? `Jumlah ${preset.label}`
            : `Jumlah dibeli${ingredient ? ` (${ingredient.unit})` : ""}`}
        </label>
        <input
          className="field"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          step={ingredient && preset && inputMode === "pack" ? "1" : "0.001"}
          min={ingredient && preset && inputMode === "pack" ? "1" : "0.001"}
          placeholder="Jumlah dibeli"
          required
        />
        {ingredient && quantity > 0 ? (
          <p className="mt-1.5 text-xs font-semibold text-neutral-500">
            Stok akan bertambah <span className="font-black text-neutral-800">{formatQuantity(quantity)} {ingredient.unit}</span>.
          </p>
        ) : null}
      </div>

      <input type="hidden" name="quantity" value={quantity > 0 ? String(quantity) : ""} />
      <input className="field" name="total_cost" type="number" min="1" placeholder="Total biaya" required />
      <label className="label">Tanggal beli</label>
      <input className="field" name="purchased_at" type="date" defaultValue={initialDate} required />
      <label className="label">Expired opsional</label>
      <input className="field" name="expires_at" type="date" />
      <input className="field" name="note" placeholder="Catatan" />
      <SubmitButton>Simpan pembelian</SubmitButton>
    </form>
  );
}
