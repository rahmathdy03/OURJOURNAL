import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWebPush,
  WebPushError,
  type PushSubscriptionPayload,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayJakarta() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return NextResponse.json(
      { error: "Konfigurasi VAPID belum lengkap" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const alertDate = todayJakarta();

  const { data: moduleRows, error: moduleError } = await admin
    .from("user_modules")
    .select("user_id")
    .eq("module_key", "kebab")
    .eq("enabled", true);

  if (moduleError) {
    return NextResponse.json({ error: moduleError.message }, { status: 500 });
  }

  let usersChecked = 0;
  let usersNotified = 0;
  let pushesSent = 0;

  for (const moduleRow of moduleRows ?? []) {
    const userId = String(moduleRow.user_id);
    usersChecked += 1;

    const { data: ingredients, error: ingredientError } = await admin
      .from("kebab_ingredients")
      .select("id,name,unit,stock_quantity,low_stock_threshold")
      .eq("user_id", userId)
      .order("name");

    if (ingredientError) {
      console.error("Gagal membaca stok untuk alert", userId, ingredientError);
      continue;
    }

    const lowStock = (ingredients ?? []).filter((item: any) => {
      const stock = Number(item.stock_quantity ?? 0);
      const minimum = Number(item.low_stock_threshold ?? 0);
      return minimum > 0 && stock <= minimum;
    });

    if (!lowStock.length) continue;

    const snapshot = lowStock.map((item: any) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      stock: Number(item.stock_quantity ?? 0),
      minimum: Number(item.low_stock_threshold ?? 0),
    }));

    const { error: reserveError } = await admin
      .from("kebab_stock_alert_runs")
      .insert({
        user_id: userId,
        alert_date: alertDate,
        ingredient_snapshot: snapshot,
      });

    if (reserveError?.code === "23505") continue;

    if (reserveError) {
      console.error("Gagal membuat ledger alert", userId, reserveError);
      continue;
    }

    const lines = snapshot
      .slice(0, 4)
      .map(
        (item) =>
          `${item.name}: ${formatQuantity(item.stock)} ${item.unit}`
      );
    const extra = snapshot.length > 4 ? ` +${snapshot.length - 4} bahan lain` : "";
    const body = `${lines.join(" • ")}${extra}`;

    await admin.from("notifications").insert({
      user_id: userId,
      title: "Stok bahan menipis",
      message: body,
      kind: "kebab_low_stock",
      is_read: false,
    });

    const { data: subscriptions, error: subscriptionError } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", userId);

    if (subscriptionError) {
      console.error("Gagal membaca push subscription", userId, subscriptionError);
      continue;
    }

    let deliveredForUser = false;

    for (const row of subscriptions ?? []) {
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
          body: `⚠️ ${snapshot.length} bahan perlu diperhatikan. ${body}`,
          url: "/kebab-finka",
          tag: `kebab-stock-${alertDate}`,
        });
        pushesSent += 1;
        deliveredForUser = true;
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
          continue;
        }

        console.error("Gagal mengirim push", userId, error);
      }
    }

    if (deliveredForUser) usersNotified += 1;
  }

  return NextResponse.json({
    ok: true,
    alertDate,
    usersChecked,
    usersNotified,
    pushesSent,
  });
}
