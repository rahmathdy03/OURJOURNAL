import { LockKeyhole } from "lucide-react";
import { login } from "@/features/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Personal Hub";
  return <main className="grid min-h-screen place-items-center bg-[#f7f5f0] p-4"><div className="w-full max-w-md panel p-6 md:p-8"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white"><LockKeyhole/></div><p className="text-sm font-bold text-orange-600">{appName}</p><h1 className="mt-1 text-3xl font-black">Masuk ke akun</h1><p className="mt-2 text-sm leading-6 text-neutral-500">Rahmat dan Finka menggunakan akun masing-masing. Data pribadi otomatis terpisah oleh Supabase RLS.</p>{params.error&&<div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>}<form action={login} className="mt-6 space-y-4"><div><label className="label">Email</label><input name="email" type="email" autoComplete="email" className="field" required/></div><div><label className="label">Password</label><input name="password" type="password" autoComplete="current-password" className="field" required/></div><SubmitButton className="btn-primary w-full">Masuk</SubmitButton></form><p className="mt-5 text-center text-xs leading-5 text-neutral-400">Registrasi publik sengaja tidak disediakan. User dibuat dari Supabase Authentication.</p></div></main>;
}
