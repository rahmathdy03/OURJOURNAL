import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWebPush,
  WebPushError,
  type PushSubscriptionPayload,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shouldDeleteSubscription(error: unknown) {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 ||
      error.statusCode === 410 ||
      (error.statusCode === 400 && error.message.includes("VapidPkHashMismatch")))
  );
}

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: moduleRow } = await admin
    .from("user_modules")
    .select("user_id")
    .eq("user_id", userId)
    .eq("module_key", "kebab")
    .eq("enabled", true)
    .maybeSingle();

  if (!moduleRow) {
    return NextResponse.json({ error: "Modul kebab tidak aktif." }, { status: 403 });
  }

  const { data: subscriptions, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json(
      { error: "Belum ada perangkat yang terdaftar untuk push notification." },
      { status: 404 }
    );
  }

  let sent = 0;
  const failures: Array<{ status?: number; message: string }> = [];

  for (const row of subscriptions) {
    const subscription: PushSubscriptionPayload = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await sendWebPush(subscription, {
        title: "Kebab Finka",
        body: "✅ Notifikasi tes berhasil. Push notification di HP sudah aktif.",
        url: "/kebab-finka",
        tag: `kebab-finka-test-${Date.now()}`,
      });
      sent += 1;
    } catch (caught) {
      if (shouldDeleteSubscription(caught)) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      }

      failures.push({
        status: caught instanceof WebPushError ? caught.statusCode : undefined,
        message: caught instanceof Error ? caught.message : "Push gagal.",
      });
    }
  }

  if (sent === 0) {
    return NextResponse.json(
      {
        error: failures[0]?.message || "Tidak ada push yang berhasil dikirim.",
        failures,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, sent, failures });
}
