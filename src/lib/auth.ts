import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId, claims: data.claims };
}

export async function getProfileAndModules() {
  const { supabase, userId, claims } = await requireUser();
  const [{ data: profile }, { data: moduleRows }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,whatsapp_number,avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("user_modules").select("module_key,enabled").eq("user_id", userId).eq("enabled", true),
  ]);
  return {
    supabase,
    userId,
    claims,
    profile,
    modules: (moduleRows ?? []).map((row: any) => row.module_key as string),
  };
}

export async function requireModule(moduleKey: string) {
  const ctx = await getProfileAndModules();
  if (!ctx.modules.includes(moduleKey)) notFound();
  return ctx;
}
