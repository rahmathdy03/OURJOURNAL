"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
export function MobileNav({ modules }: { modules: string[] }) {
  const [open,setOpen]=useState(false);
  const items=[{href:"/dashboard",label:"Dashboard"},...(modules.includes("finance")?[{href:"/finance",label:"Keuangan"}]:[]),...(modules.includes("shopping")?[{href:"/shopping",label:"Belanja"}]:[]),...(modules.includes("academic")?[{href:"/academic",label:"Kuliah"}]:[]),...(modules.includes("kebab")?[{href:"/kebab",label:"Operasional Finka"}]:[]),{href:"/reports",label:"Laporan"},{href:"/notifications",label:"Notifikasi"},{href:"/settings",label:"Pengaturan"}];
  return <div className="lg:hidden"><button onClick={()=>setOpen(!open)} className="rounded-xl border border-black/10 bg-white p-2.5">{open?<X size={18}/>:<Menu size={18}/>}</button>{open&&<div className="absolute left-4 right-4 top-16 z-50 panel p-2">{items.map(x=><Link key={x.href} onClick={()=>setOpen(false)} href={x.href} className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-orange-50">{x.label}</Link>)}</div>}</div>;
}
