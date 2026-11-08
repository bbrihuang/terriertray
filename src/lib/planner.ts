import { hasCoreNutrition, totals, type TrayEntry } from "./nutrition";
import { allergyAnswered, checkRestrictions, type Restrictions } from "./restrictions";
import type { MenuItem } from "./schema";

/** Targets for ONE meal. null = no target for that nutrient. */
export type MealTargets = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type PlanOption = {
  entries: TrayEntry[];
  /** Mean relative error across the targets that were set (0 = exact). */
  error: number;
  /** True when the best available match is still far from the targets. */
  far: boolean;
};

export type PlanResult =
  | { kind: "ok"; options: PlanOption[]; considered: number; excluded: Exclusions; notes: string[] }
  | { kind: "infeasible"; reason: string; excluded: Exclusions; notes: string[] };

export type Exclusions = { restricted: number; incompleteNutrition: number; buildYourOwn: number; tooSmall: number; userExcluded: number };

const WEIGHTS = { caloriesKcal: 1, proteinG: 1, carbsG: 0.5, fatG: 0.5 } as const;
const SHORTLIST = 30;
const MAX_DISHES = 3;
const SERVINGS = [1, 2] as const;
const FAR_ERROR = 0.25;
// Garnishes, condiments and drinks under this are not offered as plate dishes.
const MIN_DISH_KCAL = 40;

export function validateTargets(t: MealTargets): string[] {
  const notes: string[] = [];
  const { caloriesKcal: kcal, proteinG: p, carbsG: c, fatG: f } = t;
  if (p !== null && c !== null && f !== null && kcal !== null && kcal > 0) {
    const implied = 4 * p + 4 * c + 9 * f;
    if (Math.abs(implied - kcal) / kcal > 0.15) {
      notes.push(
        `Your protein, carb and fat targets add up to about ${Math.round(implied)} kcal, but the calorie target is ${kcal} kcal. Plans aim for all of them, so expect a miss on one side.`,
      );
    }
  }
  return notes;
}

function score(entries: TrayEntry[], t: MealTargets): number {
  const sum = totals(entries);
  let err = 0;
  let weight = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const target = t[key];
    if (target === null || target <= 0) continue;
    err += WEIGHTS[key] * (Math.abs(sum[key].value - target) / target);
    weight += WEIGHTS[key];
  }
  const fit = weight === 0 ? 0 : err / weight;
  // Realism: prefer single servings and different stations.
  const extraServings = entries.reduce((n, e) => n + (e.servings - 1), 0);
  const stations = new Set(entries.map((e) => e.item.station ?? e.item.id));
  const sameStation = entries.length - stations.size;
  return fit + 0.03 * extraServings + 0.05 * sameStation;
}

function* combinations<T>(items: T[], k: number, start = 0, picked: T[] = []): Generator<T[]> {
  if (picked.length === k) {
    yield picked;
    return;
  }
  for (let i = start; i < items.length; i++) yield* combinations(items, k, i + 1, [...picked, items[i]!]);
}

function* servingPlans(n: number): Generator<number[]> {
  if (n === 0) {
    yield [];
    return;
  }
  for (const rest of servingPlans(n - 1)) for (const s of SERVINGS) yield [...rest, s];
}

/** Deterministic, bounded search over 2-3 dish plates. Restrictions are never relaxed. */
export function planMeal(
  items: MenuItem[],
  targets: MealTargets,
  restrictions: Restrictions,
  opts: { exclude?: Set<string>; count?: number } = {},
): PlanResult {
  const notes = validateTargets(targets);
  const excluded: Exclusions = { restricted: 0, incompleteNutrition: 0, buildYourOwn: 0, tooSmall: 0, userExcluded: 0 };

  if (!allergyAnswered(restrictions)) {
    return { kind: "infeasible", reason: "Answer the allergy question in Settings to get suggestions.", excluded, notes };
  }

  if (Object.values(targets).every((v) => v === null || v <= 0)) {
    return { kind: "infeasible", reason: "Set at least a calorie or protein target to get suggestions.", excluded, notes };
  }

  const candidates: MenuItem[] = [];
  for (const item of items) {
    if (opts.exclude?.has(item.id)) excluded.userExcluded++;
    else if (!checkRestrictions(item, restrictions).allowed) excluded.restricted++;
    else if (!hasCoreNutrition(item) || item.issues.includes("macro_energy_mismatch")) excluded.incompleteNutrition++;
    else if (item.issues.includes("build_your_own")) excluded.buildYourOwn++;
    else if ((item.caloriesKcal ?? 0) < MIN_DISH_KCAL) excluded.tooSmall++;
    else candidates.push(item);
  }

  if (candidates.length < 2) {
    return {
      kind: "infeasible",
      reason:
        candidates.length === 0
          ? "No dishes in this meal pass your restrictions with complete nutrition labels."
          : "Only one dish in this meal passes your restrictions with complete nutrition labels.",
      excluded,
      notes,
    };
  }

  // Shortlist: dishes most useful for the targets, ties broken by id for determinism.
  const kcalGoal = targets.caloriesKcal ?? null;
  const proteinGoal = targets.proteinG ?? null;
  const usefulness = (i: MenuItem) => {
    const kcal = i.caloriesKcal!;
    const density = proteinGoal ? (i.proteinG! * 4) / kcal : 0;
    const sizeFit = kcalGoal ? Math.abs(kcal - kcalGoal / 2.5) / kcalGoal : 0;
    return density - sizeFit;
  };
  const shortlist = [...candidates]
    .sort((a, b) => usefulness(b) - usefulness(a) || a.id.localeCompare(b.id))
    .slice(0, SHORTLIST);

  const scored: PlanOption[] = [];
  for (let k = 2; k <= Math.min(MAX_DISHES, shortlist.length); k++) {
    for (const dishes of combinations(shortlist, k)) {
      // The same dish listed at two stations is one dish on a plate.
      if (new Set(dishes.map((d) => d.name.toLowerCase())).size < dishes.length) continue;
      for (const servings of servingPlans(k)) {
        const entries = dishes.map((item, i) => ({ item, servings: servings[i]! }));
        const error = score(entries, targets);
        scored.push({ entries, error, far: error > FAR_ERROR });
      }
    }
  }

  scored.sort(
    (a, b) =>
      a.error - b.error ||
      a.entries.map((e) => e.item.id).join().localeCompare(b.entries.map((e) => e.item.id).join()),
  );

  // Distinct options: each new one shares at most one dish with any option already picked,
  // and no dish appears in more than two options.
  const picked: PlanOption[] = [];
  const uses = new Map<string, number>();
  const want = opts.count ?? 3;
  for (const option of scored) {
    const ids = option.entries.map((e) => e.item.id);
    const distinct =
      picked.every((p) => p.entries.filter((e) => ids.includes(e.item.id)).length <= 1) && ids.every((id) => (uses.get(id) ?? 0) < 2);
    if (distinct) {
      picked.push(option);
      for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
    }
    if (picked.length === want) break;
  }

  if (picked.length === 0) {
    return {
      kind: "infeasible",
      reason: "A suggested plate needs at least two different dishes with complete nutrition labels. Try another meal or dining hall, bring back set-aside dishes, or add dishes from the Menu.",
      excluded,
      notes,
    };
  }
  return { kind: "ok", options: picked, considered: candidates.length, excluded, notes };
}

/** Split daily targets evenly across planned meals. Labelled as a share in the UI. */
export function mealShare(daily: MealTargets, mealsPerDay: number): MealTargets {
  const share = (v: number | null) => (v === null ? null : Math.round(v / mealsPerDay));
  return {
    caloriesKcal: share(daily.caloriesKcal),
    proteinG: share(daily.proteinG),
    carbsG: share(daily.carbsG),
    fatG: share(daily.fatG),
  };
}
