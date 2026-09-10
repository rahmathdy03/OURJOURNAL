"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  Gauge,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  Settings2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
};

type Recipe = {
  id: string;
  name: string;
};

type Screen = "home" | "production" | "use" | "add" | "stock";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}

function parseQuantity(value: string) {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function KebabFinkaQuickClient({
  displayName,
  initialIngredients,
  recipes,
  fixedIngredientIds,
  initialTodayProduction,
  today,
}: {
  displayName: string;
  initialIngredients: Ingredient[];
  recipes: Recipe[];
  fixedIngredientIds: string[];
  initialTodayProduction: number;
  today: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [screen, setScreen] = useState<Screen>("home");
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [todayProduction, setTodayProduction] = useState(initialTodayProduction);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deferredInstall, setDeferredInstall] = useState<DeferredInstallPrompt | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<
    "checking" | "unsupported" | "disabled" | "enabled"
  >("checking");

  const fixedSet = useMemo(() => new Set(fixedIngredientIds), [fixedIngredientIds]);
  const variableIngredients = useMemo(
    () => ingredients.filter((ingredient) => !fixedSet.has(ingredient.id)),
    [ingredients, fixedSet]
  );
  const lowStock = useMemo(
    () =>
      ingredients.filter(
        (ingredient) =>
          ingredient.lowStockThreshold > 0 &&
          ingredient.stockQuantity <= ingredient.lowStockThreshold
      ),
    [ingredients]
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${today}T12:00:00+07:00`)),
    [today]
  );

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const handleInstall = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event as DeferredInstallPrompt);
    };

    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    async function checkNotification() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotificationStatus("unsupported");
        return;
      }

      if (Notification.permission !== "granted") {
        setNotificationStatus("disabled");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setNotificationStatus(subscription ? "enabled" : "disabled");
      } catch {
        setNotificationStatus("disabled");
      }
    }

    void checkNotification();
  }, []);

  async function refreshData() {
    const [ingredientResult, productionResult] = await Promise.all([
      supabase
        .from("kebab_ingredients")
        .select("id,name,unit,stock_quantity,low_stock_threshold")
        .order("name"),
      supabase
        .from("kebab_productions")
        .select("quantity")
        .eq("production_date", today),
    ]);

    if (ingredientResult.data) {
      setIngredients(
        ingredientResult.data.map((item) => ({
          id: String(item.id),
          name: String(item.name),
          unit: String(item.unit),
          stockQuantity: Number(item.stock_quantity ?? 0),
          lowStockThreshold: Number(item.low_stock_threshold ?? 0),
        }))
      );
    }

    if (productionResult.data) {
      setTodayProduction(
        productionResult.data.reduce(
          (total, item) => total + Number(item.quantity ?? 0),
          0
        )
      );
    }
  }

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function enableNotifications() {
    clearFeedback();

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotificationStatus("unsupported");
      setError("Push notification belum didukung di browser ini.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError("Push notification belum dikonfigurasi di server.");
      return;
    }

    setBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationStatus("disabled");
        setError("Izin notifikasi belum diberikan.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Gagal menyimpan push subscription.");
      }

      setNotificationStatus("enabled");
      setMessage("Notifikasi aktif. Pengecekan stok otomatis dijadwalkan pukul 13.00 WIB.");
    } catch (caught) {
      setNotificationStatus("disabled");
      setError(caught instanceof Error ? caught.message : "Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  async function installApp() {
    clearFeedback();

    if (deferredInstall) {
      await deferredInstall.prompt();
      const choice = await deferredInstall.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
        setDeferredInstall(null);
        setMessage("Kebab Finka ditambahkan ke Home Screen.");
      }
      return;
    }

    setMessage(
      "iPhone/iPad: buka menu Share di Safari lalu pilih Add to Home Screen. Android: buka menu browser lalu pilih Install app / Add to Home screen."
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_#ffedd5_0,_#fff7ed_38%,_#f5f5f4_100%)] text-stone-900">
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        {screen === "home" ? (
          <HomeScreen
            displayName={displayName}
            formattedDate={formattedDate}
            todayProduction={todayProduction}
            lowStock={lowStock}
            isStandalone={isStandalone}
            notificationStatus={notificationStatus}
            busy={busy}
            message={message}
            error={error}
            onInstall={installApp}
            onEnableNotifications={enableNotifications}
            onOpen={setScreen}
          />
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                clearFeedback();
                setScreen("home");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-extrabold shadow-sm ring-1 ring-black/5"
            >
              <ArrowLeft size={17} />
              Kembali
            </button>

            {screen === "production" && (
              <ProductionScreen
                recipes={recipes}
                busy={busy}
                setBusy={setBusy}
                setMessage={setMessage}
                setError={setError}
                clearFeedback={clearFeedback}
                onRefresh={refreshData}
                supabase={supabase}
                today={today}
              />
            )}

            {screen === "use" && (
              <IngredientMovementScreen
                mode="use"
                ingredients={variableIngredients}
                busy={busy}
                setBusy={setBusy}
                setMessage={setMessage}
                setError={setError}
                clearFeedback={clearFeedback}
                onRefresh={refreshData}
                supabase={supabase}
              />
            )}

            {screen === "add" && (
              <IngredientMovementScreen
                mode="add"
                ingredients={ingredients}
                busy={busy}
                setBusy={setBusy}
                setMessage={setMessage}
                setError={setError}
                clearFeedback={clearFeedback}
                onRefresh={refreshData}
                supabase={supabase}
              />
            )}

            {screen === "stock" && <StockScreen ingredients={ingredients} />}

            {(message || error) && <Feedback message={message} error={error} />}
          </div>
        )}
      </div>
    </main>
  );
}

function HomeScreen({
  displayName,
  formattedDate,
  todayProduction,
  lowStock,
  isStandalone,
  notificationStatus,
  busy,
  message,
  error,
  onInstall,
  onEnableNotifications,
  onOpen,
}: {
  displayName: string;
  formattedDate: string;
  todayProduction: number;
  lowStock: Ingredient[];
  isStandalone: boolean;
  notificationStatus: "checking" | "unsupported" | "disabled" | "enabled";
  busy: boolean;
  message: string | null;
  error: string | null;
  onInstall: () => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  onOpen: (screen: Screen) => void;
}) {
  const actions = [
    {
      key: "production" as Screen,
      title: "Produksi",
      subtitle: "Catat kebab hari ini",
      icon: UtensilsCrossed,
      accent: "bg-orange-600 text-white",
    },
    {
      key: "use" as Screen,
      title: "Pakai Bahan",
      subtitle: "Mayo, saus, minyak, dll.",
      icon: PackageMinus,
      accent: "bg-rose-100 text-rose-700",
    },
    {
      key: "add" as Screen,
      title: "Tambah Stok",
      subtitle: "Barang baru masuk",
      icon: PackagePlus,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "stock" as Screen,
      title: "Cek Stok",
      subtitle: "Lihat semua bahan",
      icon: Boxes,
      accent: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-stone-950 p-5 text-white shadow-xl shadow-orange-950/10">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-orange-50 ring-4 ring-white/10">
            <Image
              src="/icons/kebab-finka-192.png"
              alt="Logo Kebab Finka"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
              <Sparkles size={14} />
              Quick Input
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Kebab Finka</h1>
            <p className="mt-1 truncate text-sm text-stone-300">Halo, {displayName}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-white/8 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Hari ini</p>
          <p className="mt-1 text-sm font-bold capitalize">{formattedDate}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Gauge size={19} />
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight">{todayProduction}</p>
          <p className="mt-1 text-xs font-bold text-stone-500">Produksi hari ini</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${lowStock.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {lowStock.length ? <CircleAlert size={19} /> : <Check size={19} />}
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight">{lowStock.length}</p>
          <p className="mt-1 text-xs font-bold text-stone-500">Bahan menipis</p>
        </div>
      </section>

      {lowStock.length > 0 && (
        <button
          type="button"
          onClick={() => onOpen("stock")}
          className="flex w-full items-center justify-between rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-left"
        >
          <div className="min-w-0">
            <p className="font-black text-amber-950">Stok perlu perhatian</p>
            <p className="mt-1 truncate text-sm text-amber-800">
              {lowStock.slice(0, 3).map((item) => item.name).join(", ")}
              {lowStock.length > 3 ? ` +${lowStock.length - 3} lainnya` : ""}
            </p>
          </div>
          <ChevronRight className="shrink-0 text-amber-700" size={20} />
        </button>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Input cepat</p>
            <h2 className="mt-1 text-xl font-black">Mau catat apa?</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => onOpen(action.key)}
                className="min-h-40 rounded-[1.6rem] bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition active:scale-[0.98]"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.accent}`}>
                  <Icon size={22} />
                </div>
                <p className="mt-5 text-base font-black">{action.title}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">{action.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-[1.6rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-black">Aplikasi di HP</p>
        {!isStandalone && (
          <button
            type="button"
            onClick={() => void onInstall()}
            className="flex w-full items-center gap-3 rounded-2xl bg-stone-100 p-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
              <Download size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Tambah ke Home Screen</p>
              <p className="mt-0.5 text-xs text-stone-500">Buka seperti aplikasi tanpa masuk dashboard.</p>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>
        )}

        <button
          type="button"
          disabled={busy || notificationStatus === "unsupported" || notificationStatus === "enabled"}
          onClick={() => void onEnableNotifications()}
          className="flex w-full items-center gap-3 rounded-2xl bg-orange-50 p-3 text-left disabled:opacity-70"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
            {notificationStatus === "enabled" ? <BellRing size={19} /> : <Bell size={19} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">
              {notificationStatus === "enabled" ? "Notifikasi sudah aktif" : "Aktifkan notifikasi stok"}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {notificationStatus === "enabled"
                ? "Pengecekan harian pukul 13.00 WIB."
                : notificationStatus === "unsupported"
                ? "Browser ini belum mendukung push notification."
                : "Dapatkan ringkasan bahan menipis jam 13.00 WIB."}
            </p>
          </div>
          {notificationStatus === "enabled" ? (
            <Check size={18} className="text-emerald-600" />
          ) : (
            <ChevronRight size={18} className="text-orange-500" />
          )}
        </button>
      </section>

      {(message || error) && <Feedback message={message} error={error} />}

      <Link
        href="/kebab"
        className="flex items-center justify-center gap-2 py-2 text-sm font-extrabold text-stone-500"
      >
        <Settings2 size={16} />
        Buka operasional lengkap
      </Link>
    </div>
  );
}

function ProductionScreen({
  recipes,
  busy,
  setBusy,
  setMessage,
  setError,
  clearFeedback,
  onRefresh,
  supabase,
  today,
}: {
  recipes: Recipe[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  setMessage: (value: string | null) => void;
  setError: (value: string | null) => void;
  clearFeedback: () => void;
  onRefresh: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
  today: string;
}) {
  const presets = [20, 30, 40, 50, 60];
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [quantity, setQuantity] = useState("50");

  async function submit() {
    clearFeedback();
    const qty = Number(quantity);

    if (!recipeId) {
      setError("Belum ada resep aktif. Buat resep tetap dari website utama terlebih dahulu.");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Jumlah produksi harus berupa angka bulat lebih dari 0.");
      return;
    }

    setBusy(true);
    const recipe = recipes.find((item) => item.id === recipeId);

    try {
      const { error } = await supabase.rpc("record_kebab_production", {
        p_recipe_id: recipeId,
        p_quantity: qty,
        p_production_date: today,
        p_notes: "Quick Input Kebab Finka",
      });

      if (error) throw new Error(error.message);
      await onRefresh();
      setMessage(
        `Produksi ${qty} ${recipe?.name ?? "kebab"} berhasil dicatat. Bahan tetap pada resep sudah otomatis dikurangi.`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mencatat produksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-stone-950/5 ring-1 ring-black/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
        <UtensilsCrossed size={23} />
      </div>
      <h2 className="mt-4 text-2xl font-black">Catat Produksi</h2>
      <p className="mt-1 text-sm leading-6 text-stone-500">
        Beef, kulit, kertas, dan bahan tetap lain yang ada di resep akan berkurang otomatis.
      </p>

      <label className="mt-6 block text-sm font-extrabold">Produk</label>
      <select
        value={recipeId}
        onChange={(event) => setRecipeId(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base font-bold outline-none focus:border-orange-500"
      >
        {recipes.length === 0 && <option value="">Belum ada resep</option>}
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>
            {recipe.name}
          </option>
        ))}
      </select>

      <label className="mt-5 block text-sm font-extrabold">Jumlah produksi</label>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuantity(String(preset))}
            className={`h-12 rounded-xl text-sm font-black transition active:scale-95 ${quantity === String(preset) ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-800"}`}
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        className="mt-3 h-16 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-center text-2xl font-black outline-none focus:border-orange-500"
        placeholder="Jumlah lain"
      />

      <button
        type="button"
        disabled={busy || recipes.length === 0}
        onClick={() => void submit()}
        className="mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 text-base font-black text-white shadow-lg shadow-orange-600/20 transition active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
        Catat Produksi
      </button>
    </section>
  );
}

function IngredientMovementScreen({
  mode,
  ingredients,
  busy,
  setBusy,
  setMessage,
  setError,
  clearFeedback,
  onRefresh,
  supabase,
}: {
  mode: "use" | "add";
  ingredients: Ingredient[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  setMessage: (value: string | null) => void;
  setError: (value: string | null) => void;
  clearFeedback: () => void;
  onRefresh: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const selected = ingredients.find((item) => item.id === ingredientId);
  const isUse = mode === "use";

  useEffect(() => {
    if (!ingredients.some((item) => item.id === ingredientId)) {
      setIngredientId(ingredients[0]?.id ?? "");
    }
  }, [ingredients, ingredientId]);

  async function submit() {
    clearFeedback();
    const qty = parseQuantity(quantity);

    if (!ingredientId || !selected) {
      setError(isUse ? "Belum ada bahan variabel yang bisa dipilih." : "Belum ada bahan yang bisa dipilih.");
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Jumlah harus lebih dari 0. Angka desimal boleh memakai koma, misalnya 1,2.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.rpc("record_kebab_stock_movement", {
        p_ingredient_id: ingredientId,
        p_direction: isUse ? "out" : "in",
        p_quantity: qty,
        p_unit_cost: 0,
        p_note: isUse ? "Pemakaian aktual via Quick Input" : "Tambah stok via Quick Input",
      });

      if (error) throw new Error(error.message);
      await onRefresh();
      setQuantity("");
      setMessage(
        isUse
          ? `${selected.name} terpakai ${formatQuantity(qty)} ${selected.unit}. Stok sudah diperbarui.`
          : `Stok ${selected.name} bertambah ${formatQuantity(qty)} ${selected.unit}.`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memperbarui stok.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-stone-950/5 ring-1 ring-black/5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isUse ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
        {isUse ? <PackageMinus size={23} /> : <PackagePlus size={23} />}
      </div>
      <h2 className="mt-4 text-2xl font-black">{isUse ? "Pakai Bahan" : "Tambah Stok"}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-500">
        {isUse
          ? "Khusus bahan yang pemakaiannya tidak pasti dan tidak masuk komposisi tetap resep."
          : "Gunakan untuk stok baru yang masuk. Harga/pembelian detail tetap bisa dicatat dari website utama."}
      </p>

      <label className="mt-6 block text-sm font-extrabold">Bahan</label>
      <select
        value={ingredientId}
        onChange={(event) => setIngredientId(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base font-bold outline-none focus:border-orange-500"
      >
        {ingredients.length === 0 && <option value="">Belum ada bahan</option>}
        {ingredients.map((ingredient) => (
          <option key={ingredient.id} value={ingredient.id}>
            {ingredient.name} — {formatQuantity(ingredient.stockQuantity)} {ingredient.unit}
          </option>
        ))}
      </select>

      <label className="mt-5 block text-sm font-extrabold">Jumlah</label>
      <div className="mt-2 flex h-16 items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-orange-500">
        <input
          type="text"
          inputMode="decimal"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-2xl font-black outline-none"
          placeholder="0"
        />
        <span className="ml-3 shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-black text-stone-600 ring-1 ring-black/5">
          {selected?.unit ?? "-"}
        </span>
      </div>

      {selected && (
        <p className="mt-2 text-xs font-bold text-stone-400">
          Stok sekarang: {formatQuantity(selected.stockQuantity)} {selected.unit}
        </p>
      )}

      <button
        type="button"
        disabled={busy || ingredients.length === 0}
        onClick={() => void submit()}
        className={`mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 ${isUse ? "bg-rose-600 shadow-rose-600/20" : "bg-emerald-600 shadow-emerald-600/20"}`}
      >
        {busy ? <RefreshCw className="animate-spin" size={20} /> : isUse ? <PackageMinus size={20} /> : <PackagePlus size={20} />}
        {isUse ? "Kurangi Stok" : "Tambah Stok"}
      </button>
    </section>
  );
}

function StockScreen({ ingredients }: { ingredients: Ingredient[] }) {
  const [search, setSearch] = useState("");
  const filtered = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-stone-950/5 ring-1 ring-black/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <Boxes size={23} />
      </div>
      <h2 className="mt-4 text-2xl font-black">Cek Stok</h2>
      <p className="mt-1 text-sm text-stone-500">Stok terbaru dari Supabase.</p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari bahan..."
        className="mt-5 h-13 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm font-bold outline-none focus:border-orange-500"
      />

      <div className="mt-4 space-y-2">
        {filtered.map((ingredient) => {
          const isLow =
            ingredient.lowStockThreshold > 0 &&
            ingredient.stockQuantity <= ingredient.lowStockThreshold;

          return (
            <div
              key={ingredient.id}
              className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${isLow ? "bg-amber-50 ring-1 ring-amber-200" : "bg-stone-50"}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{ingredient.name}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {ingredient.lowStockThreshold > 0
                    ? `Minimum ${formatQuantity(ingredient.lowStockThreshold)} ${ingredient.unit}`
                    : "Minimum belum diatur"}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-base font-black ${isLow ? "text-amber-700" : "text-stone-900"}`}>
                  {formatQuantity(ingredient.stockQuantity)}
                </p>
                <p className="text-xs font-bold text-stone-400">{ingredient.unit}</p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-stone-50 p-6 text-center text-sm font-bold text-stone-400">
            Bahan tidak ditemukan.
          </div>
        )}
      </div>
    </section>
  );
}

function Feedback({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  if (!message && !error) return null;

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${error ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"}`}
    >
      {error ?? message}
    </div>
  );
}
