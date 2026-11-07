import { totals, type TrayEntry } from "./nutrition";
import type { Meal } from "./schema";

/** Seven consecutive calendar dates from `start` (YYYY-MM-DD), independent of the device timezone. */
export function weekDates(start: string): string[] {
  const base = Date.parse(`${start}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, n) => new Date(base + n * 86_400_000).toISOString().slice(0, 10));
}

// When a day lists more meals than the user eats, plan the later ones first.
const PREFERENCE = ["Dinner", "Lunch", "Brunch", "Breakfast"];

/** The posted meals to plan, up to `mealsPerDay`, returned in service order. */
export function chooseMeals(meals: Meal[], mealsPerDay: number): Meal[] {
  const rank = (m: Meal) => {
    const i = PREFERENCE.indexOf(m.name);
    return i === -1 ? PREFERENCE.length : i;
  };
  const picked = new Set([...meals].sort((a, b) => rank(a) - rank(b)).slice(0, mealsPerDay));
  return meals.filter((m) => picked.has(m));
}

/** Known totals for a day's planned meals; `complete` is false when fewer meals than intended were planned. */
export function dayTotals(plannedMeals: TrayEntry[][], mealsPerDay: number) {
  const sum = totals(plannedMeals.flat());
  return { sum, plannedMeals: plannedMeals.length, complete: plannedMeals.length >= mealsPerDay };
}
