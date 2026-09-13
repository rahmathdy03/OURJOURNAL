import { Truck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { KebabPurchaseForm } from "@/components/kebab-purchase-form";
import { ModuleSubnav } from "@/components/module-subnav";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/submit-button";
import { addSupplier } from "@/features/kebab/actions";
import { kebabNav } from "@/features/kebab/nav";
import { requireModule } from "@/lib/auth";
import { readableDate, rupiah, today } from "@/lib/format";

export default async function PurchasesPage() {
  const { supabase } = await requireModule("kebab");
  const [ingredientsRes, suppliersRes, purchasesRes] = await Promise.all([
    supabase.from("kebab_ingredients").select("id,name,unit").order("name"),
    supabase.from("kebab_suppliers").select("id,name,phone,notes").order("name"),
    supabase
      .from("kebab_purchases")
      .select(
        "id,quantity,total_cost,purchased_at,expires_at,note,kebab_ingredients(name,unit),kebab_suppliers(name)"
      )
      .order("purchased_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const ingredients = ingredientsRes.data ?? [];
  const suppliers = suppliersRes.data ?? [];
  const purchases = purchasesRes.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Operasional Finka"
        title="Pembelian Bahan"
        description="Catat bahan dengan satuan belanja yang praktis. Stok tetap otomatis tersimpan dalam satuan bahan seperti pcs, Kg, atau Liter."
      />
      <ModuleSubnav items={kebabNav} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Catat pembelian"
          description="Ekomie, Kulit Kebab, dan Beef punya pilihan input kemasan agar pencatatan lebih cepat."
        >
          <KebabPurchaseForm
            ingredients={ingredients}
            suppliers={suppliers}
            initialDate={today()}
          />
        </SectionCard>

        <SectionCard title="Supplier">
          <form action={addSupplier} className="space-y-3">
            <input className="field" name="name" placeholder="Nama supplier" required />
            <input className="field" name="phone" placeholder="No. WhatsApp/telepon" />
            <textarea className="field min-h-20" name="notes" placeholder="Catatan supplier" />
            <SubmitButton>Tambah supplier</SubmitButton>
          </form>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {suppliers.map((supplier: any) => (
              <div key={supplier.id} className="rounded-xl bg-neutral-50 p-3">
                <div className="flex gap-2">
                  <Truck size={16} className="text-orange-600" />
                  <p className="font-bold">{supplier.name}</p>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {supplier.phone || "Tanpa nomor"}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Riwayat pembelian">
        {purchases.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Bahan</th>
                  <th>Jumlah</th>
                  <th>Supplier</th>
                  <th>Biaya</th>
                  <th>Expired</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase: any) => (
                  <tr key={purchase.id}>
                    <td>{readableDate(purchase.purchased_at)}</td>
                    <td className="font-bold">{purchase.kebab_ingredients?.name}</td>
                    <td>
                      {purchase.quantity} {purchase.kebab_ingredients?.unit}
                    </td>
                    <td>{purchase.kebab_suppliers?.name || "-"}</td>
                    <td className="font-black">{rupiah(purchase.total_cost)}</td>
                    <td>
                      {purchase.expires_at ? readableDate(purchase.expires_at) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
