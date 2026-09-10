import { requireModule } from "@/lib/auth";
import { KebabFinkaQuickClient } from "./quick-client";
import { PushTestButton } from "./push-test-button";

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

export default async function KebabFinkaPage() {
  const { supabase, profile, userId } = await requireModule("kebab");
  const today = todayJakarta();

  const [ingredientRes, recipeRes, recipeItemRes, productionRes] =
    await Promise.all([
      supabase
        .from("kebab_ingredients")
        .select("id,name,unit,stock_quantity,low_stock_threshold")
        .eq("user_id", userId)
        .order("name"),
      supabase
        .from("kebab_recipes")
        .select("id,name")
        .eq("user_id", userId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("kebab_recipe_items")
        .select("ingredient_id")
        .eq("user_id", userId),
      supabase
        .from("kebab_productions")
        .select("quantity")
        .eq("user_id", userId)
        .eq("production_date", today),
    ]);

  const ingredients = (ingredientRes.data ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    unit: String(item.unit),
    stockQuantity: Number(item.stock_quantity ?? 0),
    lowStockThreshold: Number(item.low_stock_threshold ?? 0),
  }));

  const recipes = (recipeRes.data ?? []).map((recipe) => ({
    id: String(recipe.id),
    name: String(recipe.name),
  }));

  const fixedIngredientIds = Array.from(
    new Set((recipeItemRes.data ?? []).map((row) => String(row.ingredient_id)))
  );

  const todayProduction = (productionRes.data ?? []).reduce(
    (total, row) => total + Number(row.quantity ?? 0),
    0
  );

  return (
    <>
      <KebabFinkaQuickClient
        displayName={profile?.display_name || "Finka"}
        initialIngredients={ingredients}
        recipes={recipes}
        fixedIngredientIds={fixedIngredientIds}
        initialTodayProduction={todayProduction}
        today={today}
      />
      <PushTestButton />
    </>
  );
}
