import type { Load } from "../data";
import { totals, type TrayEntry } from "./nutrition";
import type { DayMenu } from "./schema";

export type DailyPick = { id: string; servings: number };

/** Resolve only each plate's own public menu, keeping unavailable dishes in coverage counts. */
export function aggregateDailyTrays(
  trays: Record<string, DailyPick[]>,
  date: string,
  loadsByHall: Record<string, Load<DayMenu> | undefined>,
) {
  const entries: TrayEntry[] = [];
  let selectedDishes = 0;
  let pendingDishes = 0;
  let unavailableDishes = 0;

  for (const [context, picks] of Object.entries(trays)) {
    const [hallId, plateDate, ...mealParts] = context.split("/");
    if (plateDate !== date || picks.length === 0) continue;
    selectedDishes += picks.length;
    const load = hallId ? loadsByHall[hallId] : undefined;
    if (load?.state === "loading") {
      pendingDishes += picks.length;
      continue;
    }
    if (load?.state !== "ready" || load.data.hallId !== hallId || load.data.date !== date) {
      unavailableDishes += picks.length;
      continue;
    }
    const meal = load.data.meals.find((m) => m.name === mealParts.join("/"));
    const items = new Map((meal?.items ?? []).map((item) => [item.id, item]));
    for (const pick of picks) {
      const item = items.get(pick.id);
      if (item) entries.push({ item, servings: pick.servings });
      else unavailableDishes++;
    }
  }

  const sum = totals(entries);
  const unresolvedDishes = pendingDishes + unavailableDishes;
  for (const total of Object.values(sum)) total.entries += unresolvedDishes;
  return {
    sum,
    selectedDishes,
    resolvedDishes: entries.length,
    unresolvedDishes,
    pendingDishes,
    unavailableDishes,
  };
}

export type DailySummaryData = ReturnType<typeof aggregateDailyTrays>;
