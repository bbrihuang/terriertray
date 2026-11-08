import { z } from "zod";

/** Finite, nonnegative amount or explicitly unknown. Never coerced to 0. */
const amount = z.number().finite().nonnegative().nullable();

export const AllergenStatus = z.enum([
  "allergens_listed",
  "explicitly_none_listed",
  "missing_nutrition_wrapper",
  /** The source gave no allergen list; the upstream scraper does not record why. */
  "reason_not_recorded",
]);
export type AllergenStatus = z.infer<typeof AllergenStatus>;

// ---------- upstream scraper output (aladincrnolic/bumenuscraper, data/current/menus.json, schema 1.0) ----------

export const ScraperRecord = z.object({
  name: z.string().min(1),
  dining_hall: z.string(),
  station: z.string().nullable(),
  meal: z.string(),
  date: z.iso.date(),
  dietary_tags: z.array(z.string()),
  allergens: z.array(z.string()).nullable(),
  serving_size: z.string().nullable(),
  calories: amount,
  total_fat_g: amount,
  saturated_fat_g: amount,
  trans_fat_g: amount,
  cholesterol_mg: amount,
  sodium_mg: amount,
  carbohydrates_g: amount,
  fiber_g: amount,
  sugars_g: amount,
  protein_g: amount,
  vitamin_d_dv: amount,
  potassium_dv: amount,
  calcium_dv: amount,
  iron_dv: amount,
  ingredients: z.string().nullable(),
  source_url: z.url(),
});
export type ScraperRecord = z.infer<typeof ScraperRecord>;

export const ScraperEnvelope = z.object({
  schema_version: z.literal("1.0"),
  run_id: z.string().min(1),
  /** Upstream stamps this at parse time; freshness uses the refresh run's start instead. */
  generated_at_utc: z.string(),
  snapshot_date: z.iso.date(),
  menu_dates: z.array(z.iso.date()),
  dining_halls: z.array(z.string()),
  total_records: z.number().int(),
  allergy_notice: z.string(),
  validation_status: z.literal("passed"),
  sources: z.record(z.string(), z.object({ url: z.url(), raw_html_path: z.string(), raw_html_sha256: z.string() })),
  records: z.array(ScraperRecord),
});
export type ScraperEnvelope = z.infer<typeof ScraperEnvelope>;

/** collector/scripts/meal_hours.py output: hall -> date -> meal -> hours text. */
export const MealHours = z.record(z.string(), z.record(z.string(), z.record(z.string(), z.string())));
export type MealHours = z.infer<typeof MealHours>;

// ---------- public app contract (public/menus) ----------

export const MenuItem = z.object({
  id: z.string(),
  sourceRecipeId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  station: z.string().nullable(),
  /** Source serving text, verbatim. No gram conversion is invented. */
  servingText: z.string().nullable(),
  caloriesKcal: amount,
  proteinG: amount,
  carbsG: amount,
  fatG: amount,
  saturatedFatG: amount,
  transFatG: amount,
  fiberG: amount,
  sugarsG: amount,
  cholesterolMg: amount,
  sodiumMg: amount,
  /** Percent of the label Daily Value as printed by the source; not mg, not a personal target. */
  labelDvPercent: z.object({
    vitaminD: amount,
    potassium: amount,
    calcium: amount,
    iron: amount,
  }),
  dietTags: z.array(z.string()),
  /** null = unknown. [] only when the source explicitly lists none. */
  allergens: z.array(z.string()).nullable(),
  allergenStatus: AllergenStatus,
  ingredients: z.string().nullable(),
  sourceUrl: z.url(),
  /** Data-quality flags from the adapter, e.g. macro/calorie mismatch. */
  issues: z.array(z.string()),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const Meal = z.object({
  name: z.string(),
  /** Hours text as published by the source for this date, or null. */
  hours: z.string().nullable(),
  items: z.array(MenuItem),
});
export type Meal = z.infer<typeof Meal>;

export const DayMenu = z.object({
  schemaVersion: z.literal(1),
  hallId: z.string(),
  date: z.iso.date(),
  meals: z.array(Meal),
});
export type DayMenu = z.infer<typeof DayMenu>;

export const HallStatus = z.enum(["ok", "stale_after_failure", "not_configured", "failed"]);

export const HallEntry = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["bu-html", "sodexo-api"]),
  sourceUrl: z.url(),
  status: HallStatus,
  /** When a refresh was last attempted for this hall. */
  lastAttemptAt: z.string().nullable(),
  /** When the snapshot in use was fetched; null if not recorded. */
  lastSuccessfulFetchAt: z.string().nullable(),
  note: z.string().nullable(),
  dates: z.array(
    z.object({ date: z.iso.date(), file: z.string(), itemCount: z.number().int(), meals: z.array(z.string()) }),
  ),
});
export type HallEntry = z.infer<typeof HallEntry>;

/** Output of collector/scripts/freshness_gate.py (upstream validator) for the BU halls. */
export const Freshness = z.object({
  basis: z.enum(["refresh_run_start", "oldest_hall_fetch"]),
  basisAt: z.string().nullable(),
  checkedAt: z.string().nullable(),
  validatorStatus: z.enum(["fresh", "stale", "expired", "missing_dates", "invalid"]),
  maxAgeHours: z.number().positive(),
  expiryHours: z.number().positive(),
  requestedDates: z.array(z.iso.date()),
  availableDates: z.array(z.iso.date()),
  missingDates: z.array(z.iso.date()),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});
export type Freshness = z.infer<typeof Freshness>;

export const MenuIndex = z.object({
  schemaVersion: z.literal(1),
  /** Content hash; appended to day-file requests so cached files never mix versions. */
  dataVersion: z.string(),
  generatedAt: z.string(),
  timezone: z.literal("America/New_York"),
  allergyNotice: z.string(),
  /** null/absent = BU data was never validated, so suggestions stay off. */
  freshness: Freshness.nullable().optional(),
  halls: z.array(HallEntry),
});
export type MenuIndex = z.infer<typeof MenuIndex>;
