import { MessageCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PushNotificationControl } from "@/components/push-notification-control";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/submit-button";
import { VersionHistoryButton } from "@/components/whats-new-popup";
import { getProfileAndModules } from "@/lib/auth";
import { updateProfile } from "@/features/settings/actions";

export default async function SettingsPage({searchParams}:{searchParams:Promise<{success?:string}>}){
 const {profile,modules,claims}=await getProfileAndModules();
 const params=await searchParams;
 return <>
  <PageHeader eyebrow="Akun" title="Pengaturan" description="Profil, notifikasi, nomor WhatsApp, serta daftar modul yang aktif untuk akun ini."/>
  {params.success&&<div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Profil berhasil diperbarui.</div>}
  <div className="grid gap-6 xl:grid-cols-2">
   <SectionCard title="Profil"><form action={updateProfile} className="space-y-4"><div><label className="label">Nama tampilan</label><input className="field" name="display_name" defaultValue={profile?.display_name||""} required/></div><div><label className="label">Nomor WhatsApp</label><input className="field" name="whatsapp_number" defaultValue={profile?.whatsapp_number||""} placeholder="62812..."/><p className="mt-1 text-xs leading-5 text-neutral-400">Gunakan format internasional tanpa tanda +. Nomor ini menghubungkan pesan WhatsApp dengan akun yang benar.</p></div><SubmitButton>Simpan profil</SubmitButton></form></SectionCard>
   <SectionCard title="Akses & keamanan"><div className="space-y-4"><div className="flex gap-3 rounded-xl bg-neutral-50 p-4"><ShieldCheck className="text-emerald-600"/><div><p className="font-black">Data privat per user</p><p className="mt-1 text-sm text-neutral-500">Supabase Row Level Security membatasi setiap data berdasarkan user ID.</p></div></div><div className="flex gap-3 rounded-xl bg-neutral-50 p-4"><MessageCircle className="text-orange-600"/><div><p className="font-black">Integrasi WhatsApp</p><p className="mt-1 text-sm text-neutral-500">Opsional. Website tetap berfungsi penuh tanpa WhatsApp.</p></div></div><div><p className="label">Email akun</p><p className="rounded-xl bg-neutral-50 p-3 text-sm font-bold">{String(claims?.email||"-")}</p></div><div><p className="label">Modul aktif</p><div className="flex flex-wrap gap-2">{modules.map(m=><span key={m} className="pill bg-orange-50 text-orange-700">{m}</span>)}</div></div></div></SectionCard>
  </div>
  <SectionCard title="Notifikasi & pengingat" description="OURJOURNAL mengecek deadline setiap hari pukul 09.00 WIB. Riwayat notifikasi tetap tersimpan walau push dimatikan di perangkat.">
   <PushNotificationControl/>
  </SectionCard>
  <SectionCard title="Tentang & update" description="Riwayat perubahan OURJOURNAL selalu bisa dibuka lagi dari sini, meski popup update otomatis hanya muncul sekali.">
   <VersionHistoryButton/>
  </SectionCard>
 </>;
}
