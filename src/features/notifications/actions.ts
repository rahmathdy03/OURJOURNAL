"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
export async function markNotificationRead(fd:FormData){const {supabase,userId}=await requireUser();const {error}=await supabase.from("notifications").update({is_read:true}).eq("id",String(fd.get("id"))).eq("user_id",userId);if(error)throw new Error(error.message);revalidatePath("/notifications");}
export async function markAllNotificationsRead(){const {supabase,userId}=await requireUser();const {error}=await supabase.from("notifications").update({is_read:true}).eq("user_id",userId).eq("is_read",false);if(error)throw new Error(error.message);revalidatePath("/notifications");}
