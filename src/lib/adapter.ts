import type { DayMenu, Meal, MenuItem, ScraperEnvelope, ScraperRecord } from "./schema";

export const BU_HALLS: Record<string, { id: string; url: string }> = {
  "West Campus": { id: "west", url: "https://www.bu.edu/dining/location/west/" },
  "Warren Towers": { id: "warren", url: "https://www.bu.edu/dining/location/warren/" },
  "Marciano Commons": { id: "marciano", url: "https://www.bu.edu/dining/location/marciano/" },
};

const MEAL_ORDER = ["Breakfast", "Brunch", "Lunch", "Dinner"];

const BUILD_YOUR_OWN = /\b(create|build)\s+your\s+own\b/i;

/** Flags only; nothing is corrected or dropped. */
export function itemIssues(r: ScraperRecord): string[] {
  const issues: string[] = [];
  if (r.calories === null) issues.push("missing_nutrition");
  if (BUILD_YOUR_OWN.test(r.name)) issues.push("build_your_own");
  const { calories: kcal, protein_g: p, carbohydrates_g: c, total_fat_g: f } = r;
  if (kcal !== null && p !== null && c !== null && f !== null && kcal >= 50) {
    // 4/4/9 is approximate (fiber, alcohol, rounding), so only large gaps are flagged.
    const estimate = 4 * p + 4 * c + 9 * f;
    if (Math.abs(estimate - kcal) > 60 && Math.abs(estimate - kcal) / kcal > 0.35) {
      issues.push("macro_energy_mismatch");
    }
  }
  return issues;
}

export function toMenuItem(r: ScraperRecord): MenuItem {
  return {
    id: r.occurrence_id,
    sourceRecipeId: r.source_recipe_id,
    name: r.name,
    description: r.description,
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
    labelDvPercent: {
      vitaminD: r.vitamin_d_dv,
      potassium: r.potassium_dv,
      calcium: r.calcium_dv,
      iron: r.iron_dv,
    },
    dietTags: r.dietary_tags,
    allergens: r.allergens, // null stays null: unknown is not "none"
    allergenStatus: r.allergen_status,
    ingredients: r.ingredients,
    sourceUrl: r.source_url,
    issues: itemIssues(r),
  };
}

/** Split a scraper envelope into one DayMenu per hall and service date, in source order. */
export function toDayMenus(envelope: ScraperEnvelope): DayMenu[] {
  const days = new Map<string, { hallId: string; date: string; meals: Map<string, Meal> }>();

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
      const hours = envelope.meal_hours[record.dining_hall]?.[record.date]?.[record.meal] ?? null;
      meal = { name: record.meal, hours, items: [] };
      day.meals.set(record.meal, meal);
    }
    meal.items.push(toMenuItem(record));
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
