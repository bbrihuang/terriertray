import type { MenuItem } from "./schema";

export type TrayEntry = { item: MenuItem; servings: number };

export const MACROS = ["caloriesKcal", "proteinG", "carbsG", "fatG"] as const;
export const TOTAL_KEYS = [...MACROS, "fiberG", "sugarsG", "saturatedFatG", "sodiumMg"] as const;
export type TotalKey = (typeof TOTAL_KEYS)[number];

export type Total = {
  /** Sum of known values only. */
  value: number;
  /** Entries whose value for this nutrient is known. */
  known: number;
  entries: number;
};

export const isComplete = (t: Total) => t.known === t.entries;

/** Scale by whole source servings. Unknown values stay out of the sum and are counted. */
export function totals(entries: TrayEntry[]): Record<TotalKey, Total> {
  const out = {} as Record<TotalKey, Total>;
  for (const key of TOTAL_KEYS) {
    let value = 0;
    let known = 0;
    for (const { item, servings } of entries) {
      const v = item[key];
      if (v !== null) {
        value += v * servings;
        known += 1;
      }
    }
    out[key] = { value: Math.round(value * 10) / 10, known, entries: entries.length };
  }
  return out;
}

export function hasCoreNutrition(item: MenuItem): boolean {
  return MACROS.every((k) => item[k] !== null);
}

/** Approximate macro energy shares (4/4/9) for the plate visual only; never a calorie total. */
export function macroEnergyShares(t: Record<TotalKey, Total>) {
  const p = t.proteinG.value * 4;
  const c = t.carbsG.value * 4;
  const f = t.fatG.value * 9;
  const sum = p + c + f;
  if (sum === 0) return null;
  return { protein: p / sum, carbs: c / sum, fat: f / sum };
}

export function formatAmount(value: number, unit: string) {
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("en-US")}${unit}`;
}
