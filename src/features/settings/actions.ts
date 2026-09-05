"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
export async function updateProfile(fd:FormData){const {supabase,userId}=await requireUser();const displayName=String(fd.get("display_name")||"").trim();const whatsapp=String(fd.get("whatsapp_number")||"").replace(/[^0-9]/g,"");const {error}=await supabase.from("profiles").update({display_name:displayName,whatsapp_number:whatsapp||null}).eq("id",userId);if(error)throw new Error(error.message);revalidatePath("/","layout");redirect("/settings?success=1");}
