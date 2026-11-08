import type { AllergenStatus, DayMenu, MealHours, Meal, MenuItem, ScraperEnvelope, ScraperRecord } from "./schema";

/**
 * Adapter from the upstream scraper's published dataset (aladincrnolic/bumenuscraper,
 * schema 1.0, vendored unchanged) to the app's per-hall, per-day files. Upstream does not
 * emit IDs, allergen-status reasons, descriptions or hours, so this adapter derives what it
 * can and leaves the rest explicitly unknown.
 */

export const BU_HALLS: Record<string, { id: string; url: string }> = {
  "West Campus": { id: "west", url: "https://www.bu.edu/dining/location/west/" },
  "Warren Towers": { id: "warren", url: "https://www.bu.edu/dining/location/warren/" },
  "Marciano Commons": { id: "marciano", url: "https://www.bu.edu/dining/location/marciano/" },
};

const MEAL_ORDER = ["Breakfast", "Brunch", "Lunch", "Dinner"];
const BUILD_YOUR_OWN = /\b(create|build)\s+your\s+own\b/i;

/** Small stable hash (FNV-1a) so IDs don't depend on Node crypto. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * What the record proves about allergens. Only an explicit list or an explicit empty
 * list is evidence; null without a nutrition panel means the panel was missing, and any
 * other null keeps "reason not recorded".
 */
export function allergenStatus(r: ScraperRecord): AllergenStatus {
  if (r.allergens !== null) return r.allergens.length > 0 ? "allergens_listed" : "explicitly_none_listed";
  if (r.calories === null && r.serving_size === null && r.ingredients === null) return "missing_nutrition_wrapper";
  return "reason_not_recorded";
}

/** Flags only; nothing is corrected or dropped. */
export function itemIssues(r: ScraperRecord): string[] {
  const issues: string[] = [];
  if (r.calories === null) issues.push("missing_nutrition");
  if (BUILD_YOUR_OWN.test(r.name)) issues.push("build_your_own");
  const { calories: kcal, protein_g: p, carbohydrates_g: c, total_fat_g: f } = r;
  if (kcal !== null && p !== null && c !== null && f !== null && kcal >= 50) {
    // 4/4/9 is approximate (fiber, alcohol, rounding), so only large gaps are flagged.
    const estimate = 4 * p + 4 * c + 9 * f;
    if (Math.abs(estimate - kcal) > 60 && Math.abs(estimate - kcal) / kcal > 0.35) issues.push("macro_energy_mismatch");
  }
  return issues;
}

export function toMenuItem(r: ScraperRecord, id: string): MenuItem {
  return {
    id,
    sourceRecipeId: null, // BU publishes no recipe IDs
    name: r.name,
    description: null, // not captured by the upstream scraper
    station: r.station,
    servingText: r.serving_size,
    caloriesKcal: r.calories,
    proteinG: r.protein_g,
    carbsG: r.carbohydrates_g,
    fatG: r.total_fat_g,
    saturatedFatG: r.saturated_fat_g,
    transFatG: r.trans_fat_g,
    fiberG: r.fiber_g,
    sugarsG: r.sugars_g,
    cholesterolMg: r.cholesterol_mg,
    sodiumMg: r.sodium_mg,
    labelDvPercent: { vitaminD: r.vitamin_d_dv, potassium: r.potassium_dv, calcium: r.calcium_dv, iron: r.iron_dv },
    dietTags: r.dietary_tags,
    allergens: r.allergens, // null stays null: unknown is not "none"
    allergenStatus: allergenStatus(r),
    ingredients: r.ingredients,
    sourceUrl: r.source_url,
    issues: itemIssues(r),
  };
}

/**
 * Split the dataset into one DayMenu per hall and service date, in source order.
 * IDs come from the occurrence's real scope; same-name dishes in one scope get a
 * document-order index instead of being merged.
 */
export function toDayMenus(envelope: ScraperEnvelope, hours: MealHours = {}): DayMenu[] {
  const days = new Map<string, { hallId: string; date: string; meals: Map<string, Meal> }>();
  const seen = new Map<string, number>();

  for (const record of envelope.records) {
    const hall = BU_HALLS[record.dining_hall];
    if (!hall) throw new Error(`Unknown BU hall in scraper output: ${record.dining_hall}`);
    const key = `${hall.id}/${record.date}`;
    let day = days.get(key);
    if (!day) {
      day = { hallId: hall.id, date: record.date, meals: new Map() };
      days.set(key, day);
    }
    let meal = day.meals.get(record.meal);
    if (!meal) {
      meal = { name: record.meal, hours: hours[record.dining_hall]?.[record.date]?.[record.meal] ?? null, items: [] };
      day.meals.set(record.meal, meal);
    }
    const scope = [hall.id, record.date, record.meal, record.station ?? "", record.name].join("|");
    const n = (seen.get(scope) ?? 0) + 1;
    seen.set(scope, n);
    meal.items.push(toMenuItem(record, `bu-${hall.id}-${record.date}-${record.meal.toLowerCase()}-${fnv1a(`${scope}|${n}`)}`));
  }

  const rank = (name: string) => {
    const i = MEAL_ORDER.indexOf(name);
    return i === -1 ? MEAL_ORDER.length : i;
  };

  return [...days.values()].map((day) => ({
    schemaVersion: 1 as const,
    hallId: day.hallId,
    date: day.date,
    meals: [...day.meals.values()].sort((a, b) => rank(a.name) - rank(b.name)),
  }));
}
