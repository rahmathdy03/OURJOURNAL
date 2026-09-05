import type { LucideIcon } from "lucide-react";
export function StatCard({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon?: LucideIcon }) {
  return <div className="panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-2 text-2xl font-black tracking-tight">{value}</p>{note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}</div>{Icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon size={19}/></div>}</div></div>;
}
