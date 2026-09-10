import Link from "next/link";
import { AlertTriangle, BookOpenCheck, CalendarClock, CircleDollarSign, GraduationCap, ShoppingBasket, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { getProfileAndModules } from "@/lib/auth";
import { monthRange, readableDate, rupiah, today } from "@/lib/format";

export default async function DashboardPage() {
  const { supabase, profile, modules } = await getProfileAndModules();
  const { start, end } = monthRange();

  // Keep every dashboard data request in the same parallel batch. Previously the
  // kebab cards waited for all other modules first, adding a full extra round trip.
  const [
    financeRes,
    shoppingRes,
    assignmentsRes,
    budgetsRes,
    eventsRes,
    ingredientsRes,
    prodRes,
  ] = await Promise.all([
    modules.includes("finance")
      ? supabase.from("finance_transactions").select("id,kind,amount,description,category,transaction_date").gte("transaction_date", start).lt("transaction_date", end).order("transaction_date", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("shopping")
      ? supabase.from("shopping_entries").select("id,total_amount,item_name,purchased_at").gte("purchased_at", start).lt("purchased_at", end).order("purchased_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("academic")
      ? supabase.from("academic_assignments").select("id,title,due_date,is_done,priority").eq("is_done", false).gte("due_date", today()).order("due_date").limit(5)
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("finance")
      ? supabase.from("finance_budgets").select("amount,category").eq("month", start)
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("academic")
      ? supabase.from("academic_events").select("id,title,starts_at,event_type").gte("starts_at", new Date().toISOString()).order("starts_at").limit(4)
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("kebab")
      ? supabase.from("kebab_ingredients").select("id,name,unit,stock_quantity,low_stock_threshold,expires_at").order("name")
      : Promise.resolve({ data: [] as any[] }),
    modules.includes("kebab")
      ? supabase.from("kebab_productions").select("quantity").eq("production_date", today())
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const finance = financeRes.data ?? [];
  const shopping = shoppingRes.data ?? [];
  const income = finance.filter((x:any)=>x.kind==="income").reduce((s:number,x:any)=>s+Number(x.amount),0);
  const expense = finance.filter((x:any)=>x.kind==="expense").reduce((s:number,x:any)=>s+Number(x.amount),0);
  const shoppingTotal = shopping.reduce((s:number,x:any)=>s+Number(x.total_amount),0);
  const budgetRows = budgetsRes.data ?? [];
  const totalBudget = Number(budgetRows.find((x:any)=>x.category==="Total")?.amount ?? budgetRows.reduce((s:number,x:any)=>s+Number(x.amount),0));
  const used = expense + shoppingTotal;

  const ingredients = ingredientsRes.data ?? [];
  const lowStock = ingredients.filter((x:any)=>Number(x.stock_quantity)<=Number(x.low_stock_threshold));
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate()+7);
  const expiring = ingredients.filter((x:any)=>x.expires_at && new Date(`${x.expires_at}T23:59:59`)<=sevenDays);
  const productionToday = (prodRes.data??[]).reduce((s:number,x:any)=>s+Number(x.quantity),0);

  return <>
    <PageHeader eyebrow="Ringkasan pribadi" title={`Dashboard ${profile?.display_name ?? ""}`} description="Dashboard utama netral. Keuangan, kuliah, belanja, dan modul khusus hanya tampil sesuai akses akun." action={<span className="pill">Bulan berjalan</span>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {modules.includes("finance") && <StatCard label="Pemasukan bulan ini" value={rupiah(income)} icon={CircleDollarSign}/>} 
      {modules.includes("finance") && <StatCard label="Pengeluaran bulan ini" value={rupiah(expense)} note="Transaksi keuangan pribadi" icon={WalletCards}/>} 
      {modules.includes("shopping") && <StatCard label="Belanja bulan ini" value={rupiah(shoppingTotal)} note={`${shopping.length} item tercatat bulan ini`} icon={ShoppingBasket}/>} 
      {modules.includes("academic") && <StatCard label="Tugas aktif" value={String((assignmentsRes.data??[]).length)} note="Deadline terdekat" icon={GraduationCap}/>} 
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <SectionCard title="Modul Saya" description="Setiap modul bisa berkembang tanpa mengubah fondasi aplikasi.">
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.includes("finance")&&<Module href="/finance" title="Keuangan" text="Pemasukan, pengeluaran, budget, transaksi rutin." icon={<WalletCards size={19}/>}/>} 
          {modules.includes("shopping")&&<Module href="/shopping" title="Belanja" text="Pencatatan belanja bulanan dan wishlist." icon={<ShoppingBasket size={19}/>}/>} 
          {modules.includes("academic")&&<Module href="/academic" title="Kuliah" text="Jadwal, tugas, materi, nilai, study session." icon={<GraduationCap size={19}/>}/>} 
          {modules.includes("kebab")&&<Module href="/kebab" title="Operasional Finka" text="Stok, resep, pembelian, produksi, waste, opname." icon={<BookOpenCheck size={19}/>}/>} 
        </div>
      </SectionCard>

      <SectionCard title="Perlu perhatian" description="Deadline, budget, dan kondisi operasional penting.">
        <div className="space-y-2">
          {(assignmentsRes.data??[]).map((x:any)=><Alert key={x.id} tone="amber" title={x.title} text={`Deadline ${readableDate(x.due_date)}`}/>) }
          {(eventsRes.data??[]).slice(0,2).map((x:any)=><Alert key={x.id} tone="blue" title={x.title} text={new Date(x.starts_at).toLocaleString("id-ID")}/>) }
          {totalBudget>0 && used/totalBudget>=.8 && <Alert tone="amber" title="Budget hampir penuh" text={`${Math.round((used/totalBudget)*100)}% dari ${rupiah(totalBudget)} sudah terpakai.`}/>} 
          {lowStock.map((x:any)=><Alert key={x.id} tone="red" title={`Stok ${x.name} menipis`} text={`Tersisa ${x.stock_quantity} ${x.unit}`}/>) }
          {expiring.slice(0,3).map((x:any)=><Alert key={`exp-${x.id}`} tone="red" title={`${x.name} mendekati kedaluwarsa`} text={`Expired ${readableDate(x.expires_at)}`}/>) }
          {modules.includes("kebab")&&<Alert tone="orange" title="Produksi hari ini" text={`${productionToday} porsi tercatat.`}/>} 
          {(assignmentsRes.data??[]).length===0 && (eventsRes.data??[]).length===0 && lowStock.length===0 && expiring.length===0 && !(totalBudget>0&&used/totalBudget>=.8) && <EmptyState>Tidak ada hal mendesak saat ini.</EmptyState>}
        </div>
      </SectionCard>
    </div>

    <SectionCard title="Aktivitas cepat" description="Masuk ke modul yang paling sering dipakai.">
      <div className="grid gap-3 md:grid-cols-3">
        {modules.includes("finance")&&<Quick href="/finance" label="Catat transaksi" detail="Pemasukan atau pengeluaran"/>}
        {modules.includes("academic")&&<Quick href="/academic" label="Tambah tugas" detail="Deadline, jadwal, dan materi"/>}
        {modules.includes("kebab")&&<Quick href="/kebab/production" label="Catat produksi" detail="Produksi otomatis mengurangi stok resep"/>}
      </div>
    </SectionCard>
  </>;
}

function Module({href,title,text,icon}:{href:string;title:string;text:string;icon:React.ReactNode}) { return <Link href={href} className="group rounded-2xl border border-black/5 bg-neutral-50 p-4 transition hover:-translate-y-0.5 hover:bg-orange-50"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">{icon}</div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-5 text-neutral-500">{text}</p><p className="mt-3 text-xs font-bold text-orange-600">Buka modul →</p></Link>; }
function Quick({href,label,detail}:{href:string;label:string;detail:string}) { return <Link href={href} className="rounded-xl border border-black/5 p-4 hover:bg-neutral-50"><div className="flex items-center gap-2"><CalendarClock size={17} className="text-orange-600"/><p className="font-bold">{label}</p></div><p className="mt-1 text-xs text-neutral-500">{detail}</p></Link>; }
function Alert({tone,title,text}:{tone:"amber"|"red"|"orange"|"blue";title:string;text:string}) { const styles={amber:"bg-amber-50 text-amber-800",red:"bg-red-50 text-red-800",orange:"bg-orange-50 text-orange-800",blue:"bg-blue-50 text-blue-800"}; return <div className={`rounded-xl p-3 ${styles[tone]}`}><div className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0"/><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs opacity-80">{text}</p></div></div></div>; }
