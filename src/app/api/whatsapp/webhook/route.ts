import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type AdminClient = ReturnType<typeof createAdminClient>;

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number | string;
  low_stock_threshold: number | string;
};

type Recipe = {
  id: string;
  name: string;
};

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.slice(7);

  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();

  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const messages =
    payload?.entry
      ?.flatMap((entry: any) => entry.changes ?? [])
      .flatMap((change: any) => change.value?.messages ?? []) ?? [];

  if (!messages.length) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  for (const msg of messages) {
    const messageId = String(msg.id ?? "").trim();
    const from = String(msg.from ?? "").replace(/[^0-9]/g, "");
    const text = String(msg.text?.body ?? "").trim();

    if (!from || !text) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("id,display_name")
      .eq("whatsapp_number", from)
      .maybeSingle();

    if (!profile?.id) {
      await sendWhatsAppText(
        from,
        "Nomor ini belum terhubung ke akun Personal Hub. Tambahkan nomor WhatsApp dari halaman Pengaturan."
      );
      continue;
    }

    try {
      const shouldProcess = await reserveMessage(
        admin,
        messageId,
        profile.id,
        from,
        text
      );

      if (!shouldProcess) continue;

      const response = await executeCommand(admin, profile.id, text);
      await sendWhatsAppText(from, response);
    } catch (error) {
      if (messageId) {
        await admin
          .from("whatsapp_processed_messages")
          .delete()
          .eq("message_id", messageId);
      }

      console.error("WhatsApp webhook command failed", error);
      await sendWhatsAppText(
        from,
        "Terjadi kendala saat memproses perintah. Coba kirim ulang beberapa saat lagi."
      );
    }
  }

  return NextResponse.json({ ok: true });
}

async function reserveMessage(
  admin: AdminClient,
  messageId: string,
  userId: string,
  from: string,
  text: string
) {
  if (!messageId) return true;

  const { error } = await admin.from("whatsapp_processed_messages").insert({
    message_id: messageId,
    user_id: userId,
    from_number: from,
    command_text: text,
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  throw new Error(`Gagal mengunci message WhatsApp: ${error.message}`);
}

async function hasModule(
  admin: AdminClient,
  userId: string,
  moduleKey: string
) {
  const { data } = await admin
    .from("user_modules")
    .select("module_key")
    .eq("user_id", userId)
    .eq("module_key", moduleKey)
    .eq("enabled", true)
    .maybeSingle();

  return Boolean(data);
}

async function executeCommand(
  admin: AdminClient,
  userId: string,
  text: string
) {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  if (["help", "bantuan", "menu"].includes(lower)) return helpText();

  const money = normalized.match(
    /^(pengeluaran|pemasukan|belanja)\s+([0-9.,]+\s*(?:rb|ribu|jt|juta)?)\s+(.+)$/i
  );

  if (money) {
    const type = money[1].toLowerCase();
    const amount = parseMoney(money[2]);
    const description = money[3].trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Nominal belum terbaca. Contoh: pengeluaran 50rb bensin";
    }

    const date = todayJakarta();

    if (type === "belanja") {
      if (!(await hasModule(admin, userId, "shopping"))) {
        return "Modul Belanja tidak aktif di akun ini.";
      }

      const { error } = await admin.from("shopping_entries").insert({
        user_id: userId,
        item_name: description,
        category: "WhatsApp",
        quantity: 1,
        unit: "item",
        total_amount: amount,
        purchased_at: date,
        notes: "Dicatat via WhatsApp",
      });

      if (error) return `Gagal mencatat: ${error.message}`;
      return `✅ Belanja ${rupiahPlain(amount)} — ${description} berhasil dicatat.`;
    }

    if (!(await hasModule(admin, userId, "finance"))) {
      return "Modul Keuangan tidak aktif di akun ini.";
    }

    const { error } = await admin.from("finance_transactions").insert({
      user_id: userId,
      kind: type === "pemasukan" ? "income" : "expense",
      amount,
      category: "WhatsApp",
      description,
      payment_method: "WhatsApp",
      transaction_date: date,
    });

    if (error) return `Gagal mencatat: ${error.message}`;

    return `✅ ${
      type === "pemasukan" ? "Pemasukan" : "Pengeluaran"
    } ${rupiahPlain(amount)} — ${description} berhasil dicatat.`;
  }

  if (lower.startsWith("tugas minggu")) {
    if (!(await hasModule(admin, userId, "academic"))) {
      return "Modul Kuliah tidak aktif di akun ini.";
    }

    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);

    const { data } = await admin
      .from("academic_assignments")
      .select("title,due_date")
      .eq("user_id", userId)
      .eq("is_done", false)
      .gte("due_date", todayJakarta())
      .lte("due_date", end.toISOString().slice(0, 10))
      .order("due_date");

    if (!data?.length) return "📚 Tidak ada deadline dalam 7 hari ke depan.";

    return (
      "📚 Deadline 7 hari:\n" +
      data.map((item: any) => `• ${item.due_date} — ${item.title}`).join("\n")
    );
  }

  const task = normalized.match(
    /^tugas\s+(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})$/i
  );

  if (task) {
    if (!(await hasModule(admin, userId, "academic"))) {
      return "Modul Kuliah tidak aktif di akun ini.";
    }

    const { error } = await admin.from("academic_assignments").insert({
      user_id: userId,
      title: task[1].trim(),
      due_date: task[2],
      priority: "normal",
      progress: 0,
      is_done: false,
      description: "Dicatat via WhatsApp",
    });

    if (error) return `Gagal mencatat tugas: ${error.message}`;
    return `✅ Tugas “${task[1].trim()}” dicatat. Deadline ${task[2]}.`;
  }

  const addIngredient = normalized.match(
    /^bahan\s*\|\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)(?:\s*\|\s*([^|]+?))?\s*$/i
  );

  if (addIngredient) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const name = addIngredient[1].trim();
    const unit = addIngredient[2].trim();
    const initialStock = parseQuantity(addIngredient[3]);
    const minimum = addIngredient[4] ? parseQuantity(addIngredient[4]) : 0;

    if (!name || !unit) {
      return "Nama bahan dan satuan wajib diisi. Contoh: bahan | Mayones | Kg | 5";
    }

    if (!Number.isFinite(initialStock) || initialStock < 0) {
      return "Stok awal belum terbaca. Contoh: bahan | Mayones | Kg | 5";
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      return "Batas minimum belum terbaca. Contoh: bahan | Mayones | Kg | 5 | 1";
    }

    const { error } = await admin.rpc("admin_add_kebab_ingredient", {
      p_user_id: userId,
      p_name: name,
      p_unit: unit,
      p_initial_stock: initialStock,
      p_low_stock_threshold: minimum,
    });

    if (error) {
      if (error.message.toLowerCase().includes("bahan sudah ada")) {
        return `Bahan “${name}” sudah ada. Gunakan *tambah stok | ${name} | jumlah* untuk menambah stok.`;
      }
      return `Gagal menambah bahan: ${error.message}`;
    }

    return `✅ Bahan ${name} berhasil ditambahkan.\nStok awal: ${formatQuantity(
      initialStock
    )} ${unit}${
      minimum > 0 ? `\nBatas minimum: ${formatQuantity(minimum)} ${unit}` : ""
    }.`;
  }

  const useIngredient = normalized.match(
    /^(?:pakai|terpakai)\s*\|\s*(.+?)\s*\|\s*([^|]+?)\s*$/i
  );

  if (useIngredient) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const name = useIngredient[1].trim();
    const quantity = parseQuantity(useIngredient[2]);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Jumlah belum terbaca. Contoh: pakai | Mayones | 1,2";
    }

    const resolved = await resolveIngredient(admin, userId, name);
    if (resolved.error) return resolved.error;

    const ingredient = resolved.ingredient!;

    const { error } = await admin.rpc("admin_record_kebab_stock_movement", {
      p_user_id: userId,
      p_ingredient_id: ingredient.id,
      p_direction: "out",
      p_quantity: quantity,
      p_unit_cost: 0,
      p_note: "Pemakaian aktual via WhatsApp",
    });

    if (error) return `Pemakaian gagal: ${error.message}`;

    const updated = await getIngredient(admin, userId, ingredient.id);
    const remaining = Number(updated?.stock_quantity ?? 0);
    const minimum = Number(updated?.low_stock_threshold ?? 0);

    return `✅ Pemakaian aktual tercatat.\n${ingredient.name}: -${formatQuantity(
      quantity
    )} ${ingredient.unit}\nSisa stok: ${formatQuantity(remaining)} ${
      ingredient.unit
    }${remaining <= minimum ? "\n⚠️ Stok sudah menyentuh batas minimum." : ""}`;
  }

  const addStock = normalized.match(
    /^tambah\s+stok\s*\|\s*(.+?)\s*\|\s*([^|]+?)\s*$/i
  );

  if (addStock) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const name = addStock[1].trim();
    const quantity = parseQuantity(addStock[2]);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Jumlah belum terbaca. Contoh: tambah stok | Kulit Kebab | 100";
    }

    const resolved = await resolveIngredient(admin, userId, name);
    if (resolved.error) return resolved.error;

    const ingredient = resolved.ingredient!;

    const { error } = await admin.rpc("admin_record_kebab_stock_movement", {
      p_user_id: userId,
      p_ingredient_id: ingredient.id,
      p_direction: "in",
      p_quantity: quantity,
      p_unit_cost: 0,
      p_note: "Penambahan stok via WhatsApp",
    });

    if (error) return `Penambahan stok gagal: ${error.message}`;

    const updated = await getIngredient(admin, userId, ingredient.id);
    const current = Number(updated?.stock_quantity ?? 0);

    return `✅ Stok ${ingredient.name} bertambah ${formatQuantity(quantity)} ${
      ingredient.unit
    }.\nStok sekarang: ${formatQuantity(current)} ${ingredient.unit}.`;
  }

  if (/^stok\s*$/i.test(normalized)) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const { data } = await admin
      .from("kebab_ingredients")
      .select("id,name,unit,stock_quantity,low_stock_threshold")
      .eq("user_id", userId)
      .order("name")
      .limit(20);

    if (!data?.length) return "Belum ada bahan kebab.";
    return formatStockList(data);
  }

  const stock = normalized.match(/^stok(?:\s*\|\s*|\s+)(.+)$/i);

  if (stock) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const query = cleanSearch(stock[1]);
    if (!query) return "Contoh: stok | Mayones";

    const { data } = await admin
      .from("kebab_ingredients")
      .select("id,name,unit,stock_quantity,low_stock_threshold")
      .eq("user_id", userId)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(8);

    if (!data?.length) return "Bahan tidak ditemukan.";
    return formatStockList(data);
  }

  const productionPipe = normalized.match(
    /^produksi\s*\|\s*(.+?)\s*\|\s*(\d+)\s*$/i
  );
  const productionLegacy = normalized.match(/^produksi\s+(.+?)\s+(\d+)$/i);
  const production = productionPipe ?? productionLegacy;

  if (production) {
    if (!(await hasModule(admin, userId, "kebab"))) {
      return "Modul Operasional Finka tidak aktif di akun ini.";
    }

    const name = production[1].trim();
    const qty = Number(production[2]);

    if (!Number.isInteger(qty) || qty <= 0) {
      return "Jumlah produksi harus bilangan bulat lebih dari 0.";
    }

    const recipeResult = await resolveRecipe(admin, userId, name);
    if (recipeResult.error) return recipeResult.error;

    const recipe = recipeResult.recipe!;
    const fixedUsage = await getFixedRecipeUsage(admin, userId, recipe.id, qty);

    if (fixedUsage.error) return fixedUsage.error;

    const { error } = await admin.rpc("admin_record_kebab_production", {
      p_user_id: userId,
      p_recipe_id: recipe.id,
      p_quantity: qty,
      p_production_date: todayJakarta(),
      p_notes: "Dicatat via WhatsApp",
    });

    if (error) return `Produksi gagal: ${error.message}`;

    const usageText = fixedUsage.items
      .map(
        (item) =>
          `• ${item.name}: -${formatQuantity(item.quantity)} ${item.unit}`
      )
      .join("\n");

    return `✅ Produksi ${qty} ${recipe.name} berhasil dicatat.\n\nBahan tetap yang otomatis berkurang:\n${usageText}\n\nBahan yang pemakaiannya berubah-ubah tidak dikurangi otomatis. Catat jumlah aktual, contoh:\n*pakai | Mayones | 1,2*`;
  }

  return "Perintah belum dikenali. Ketik *bantuan* untuk melihat contoh.";
}

async function resolveIngredient(
  admin: AdminClient,
  userId: string,
  rawName: string
): Promise<{ ingredient?: Ingredient; error?: string }> {
  const name = cleanSearch(rawName);
  if (!name) return { error: "Nama bahan belum diisi." };

  const { data: exact } = await admin
    .from("kebab_ingredients")
    .select("id,name,unit,stock_quantity,low_stock_threshold")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (exact) return { ingredient: exact as Ingredient };

  const { data } = await admin
    .from("kebab_ingredients")
    .select("id,name,unit,stock_quantity,low_stock_threshold")
    .eq("user_id", userId)
    .ilike("name", `%${name}%`)
    .order("name")
    .limit(5);

  if (!data?.length) {
    return { error: `Bahan “${rawName.trim()}” tidak ditemukan.` };
  }

  if (data.length > 1) {
    return {
      error:
        "Nama bahan masih ambigu. Pilih salah satu nama berikut:\n" +
        data.map((item: any) => `• ${item.name}`).join("\n"),
    };
  }

  return { ingredient: data[0] as Ingredient };
}

async function getIngredient(
  admin: AdminClient,
  userId: string,
  ingredientId: string
) {
  const { data } = await admin
    .from("kebab_ingredients")
    .select("id,name,unit,stock_quantity,low_stock_threshold")
    .eq("user_id", userId)
    .eq("id", ingredientId)
    .maybeSingle();

  return data as Ingredient | null;
}

async function resolveRecipe(
  admin: AdminClient,
  userId: string,
  rawName: string
): Promise<{ recipe?: Recipe; error?: string }> {
  const name = cleanSearch(rawName);
  if (!name) return { error: "Nama resep belum diisi." };

  const { data: exact } = await admin
    .from("kebab_recipes")
    .select("id,name")
    .eq("user_id", userId)
    .eq("active", true)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (exact) return { recipe: exact as Recipe };

  const { data } = await admin
    .from("kebab_recipes")
    .select("id,name")
    .eq("user_id", userId)
    .eq("active", true)
    .ilike("name", `%${name}%`)
    .order("name")
    .limit(5);

  if (!data?.length) {
    return { error: `Resep “${rawName.trim()}” tidak ditemukan.` };
  }

  if (data.length > 1) {
    return {
      error:
        "Nama resep masih ambigu. Pilih salah satu nama berikut:\n" +
        data.map((item: any) => `• ${item.name}`).join("\n"),
    };
  }

  return { recipe: data[0] as Recipe };
}

async function getFixedRecipeUsage(
  admin: AdminClient,
  userId: string,
  recipeId: string,
  productionQuantity: number
): Promise<{
  items: Array<{ name: string; unit: string; quantity: number }>;
  error?: string;
}> {
  const { data: recipeItems, error } = await admin
    .from("kebab_recipe_items")
    .select("ingredient_id,quantity_per_unit")
    .eq("user_id", userId)
    .eq("recipe_id", recipeId);

  if (error) return { items: [], error: `Gagal membaca resep: ${error.message}` };

  if (!recipeItems?.length) {
    return {
      items: [],
      error:
        "Resep belum memiliki komposisi tetap. Tambahkan Beef, Kulit, Kertas, atau bahan lain yang jumlahnya benar-benar pasti melalui website.",
    };
  }

  const ingredientIds = recipeItems.map((item: any) => item.ingredient_id);
  const { data: ingredients, error: ingredientError } = await admin
    .from("kebab_ingredients")
    .select("id,name,unit")
    .eq("user_id", userId)
    .in("id", ingredientIds);

  if (ingredientError) {
    return { items: [], error: `Gagal membaca bahan resep: ${ingredientError.message}` };
  }

  const ingredientById = new Map(
    (ingredients ?? []).map((item: any) => [item.id, item])
  );

  const items = recipeItems.flatMap((item: any) => {
    const ingredient = ingredientById.get(item.ingredient_id);
    if (!ingredient) return [];

    return [
      {
        name: ingredient.name,
        unit: ingredient.unit,
        quantity: Number(item.quantity_per_unit) * productionQuantity,
      },
    ];
  });

  return { items };
}

function formatStockList(data: any[]) {
  return (
    "📦 Stok bahan:\n" +
    data
      .map(
        (item) =>
          `• ${item.name}: ${formatQuantity(Number(item.stock_quantity))} ${
            item.unit
          }${
            Number(item.stock_quantity) <= Number(item.low_stock_threshold)
              ? " ⚠️"
              : ""
          }`
      )
      .join("\n")
  );
}

function cleanSearch(value: string) {
  return value.trim().replace(/[%_]/g, "");
}

function parseQuantity(raw: string) {
  const value = raw.trim().replace(/\s+/g, "");
  if (!value) return Number.NaN;

  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(value)) {
    return Number(value.replace(/\./g, "").replace(",", "."));
  }

  return Number(value.replace(",", "."));
}

function parseMoney(raw: string) {
  const value = raw.toLowerCase().replace(/\s+/g, "");
  const multiplier =
    value.endsWith("juta") || value.endsWith("jt")
      ? 1_000_000
      : value.endsWith("ribu") || value.endsWith("rb")
      ? 1_000
      : 1;

  const numeric = value.replace(/(juta|ribu|jt|rb)$/i, "");
  const normalized =
    multiplier > 1
      ? numeric.replace(/\./g, "").replace(",", ".")
      : numeric.replace(/[.,]/g, "");

  return Number(normalized) * multiplier;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}

function rupiahPlain(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function helpText() {
  return `WHATSAPP KEBAB V1

PRODUKSI
• produksi | Kebab Pcs | 50
Hanya komposisi tetap yang ada di Resep website yang berkurang otomatis, misalnya Beef, Kulit Kebab, dan Kertas Kebab.

PEMAKAIAN AKTUAL
• pakai | Mayones | 1,2
• pakai | Saus | 0,8
• pakai | Minyak Goreng | 1,5
Gunakan ini untuk bahan yang pemakaiannya berubah-ubah. Jumlah mengikuti satuan bahan di website.

STOK
• stok
• stok | Mayones
• tambah stok | Kulit Kebab | 100

TAMBAH BAHAN
• bahan | Mayones | Kg | 5
• bahan | Mayones | Kg | 5 | 1
Format terakhir: nama | satuan | stok awal | batas minimum (opsional).

LAINNYA
• pengeluaran 50rb bensin
• pemasukan 250rb freelance
• belanja 75rb beras
• tugas Laporan Basis Data | 2026-09-20
• tugas minggu ini

Angka desimal boleh memakai koma, contoh 1,5.
Website tetap menjadi pusat utama untuk mengatur resep dan melihat detail data.`;
}

async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) return;

  const version = process.env.META_GRAPH_API_VERSION || "v23.0";

  await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  }).catch(() => undefined);
}
