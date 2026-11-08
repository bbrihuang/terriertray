import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { totals } from "../src/lib/nutrition";
import { mealShare, planMeal, validateTargets, type MealTargets } from "../src/lib/planner";
import { checkRestrictions, DEFAULT_RESTRICTIONS, type Restrictions } from "../src/lib/restrictions";
import { DayMenu, type MenuItem } from "../src/lib/schema";

const day = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8")));
const lunch = day.meals.find((m) => m.name === "Lunch")!.items;
const dinner = day.meals.find((m) => m.name === "Dinner")!.items;

const targets: MealTargets = { caloriesKcal: 700, proteinG: 40, carbsG: 80, fatG: 22 };
const noAllergies: Restrictions = { ...DEFAULT_RESTRICTIONS, allergyAnswer: "none" };
const avoidMilkEgg: Restrictions = { allergyAnswer: "some", avoidAllergens: ["Milk", "Egg"], requireTags: [], strictUnknown: true };

const item = (over: Partial<MenuItem>): MenuItem => ({
  id: "x",
  sourceRecipeId: null,
  name: "Test",
  description: null,
  station: "Grill",
  servingText: "1 each",
  caloriesKcal: 100,
  proteinG: 5,
  carbsG: 10,
  fatG: 4,
  saturatedFatG: 1,
  transFatG: 0,
  fiberG: 1,
  sugarsG: 1,
  cholesterolMg: 0,
  sodiumMg: 100,
  labelDvPercent: { vitaminD: 0, potassium: 0, calcium: 0, iron: 0 },
  dietTags: [],
  allergens: [],
  allergenStatus: "explicitly_none_listed",
  ingredients: null,
  sourceUrl: "https://www.bu.edu/dining/location/warren/",
  issues: [],
  ...over,
});

describe("restriction gate", () => {
  const avoid = (a: string[], strictUnknown = true): Restrictions => ({ allergyAnswer: "some", avoidAllergens: a, requireTags: [], strictUnknown });

  it("blocks a listed allergen", () => {
    const v = checkRestrictions(item({ allergens: ["Milk", "Wheat"] }), avoid(["Milk"]));
    expect(v).toMatchObject({ allowed: false, allergen: "contains" });
  });

  it("ingredient text can add a conflict the label missed", () => {
    const v = checkRestrictions(item({ allergens: ["Wheat"], ingredients: "Flour, Butter, Salt" }), avoid(["Milk"]));
    expect(v.allowed).toBe(false);
    expect(v.reasons.join()).toMatch(/butter/);
  });

  it("unknown allergen info is excluded in strict mode only", () => {
    const unknown = item({ allergens: null, allergenStatus: "reason_not_recorded" });
    expect(checkRestrictions(unknown, avoid(["Milk"])).allowed).toBe(false);
    expect(checkRestrictions(unknown, avoid(["Milk"], false))).toMatchObject({ allowed: true, allergen: "unknown" });
  });

  it("wheat and gluten-free stay separate concepts", () => {
    const gf = item({ dietTags: ["Gluten Free"], allergens: ["Soy"] });
    expect(checkRestrictions(gf, { ...noAllergies, requireTags: ["Gluten Free"] }).allowed).toBe(true);
    expect(checkRestrictions(item({ allergens: ["Soy"] }), { ...noAllergies, requireTags: ["Gluten Free"] }).allowed).toBe(false);
  });

  it("an unanswered allergy question is not treated as no allergies, and blocks adding", () => {
    const v = checkRestrictions(item({ allergens: [] }), DEFAULT_RESTRICTIONS);
    expect(v).toMatchObject({ allergen: "not_checked", allowed: false });
    expect(v.reasons[0]).toMatch(/allergy question/);
  });

  it("'yes' with no allergen ticked is also not an answer", () => {
    const v = checkRestrictions(item({ allergens: [] }), { ...DEFAULT_RESTRICTIONS, allergyAnswer: "some" });
    expect(v.allowed).toBe(false);
    expect(v.reasons[0]).toMatch(/Choose which allergens/);
  });
});

describe("totals", () => {
  it("scales by servings and counts unknowns instead of adding zero", () => {
    const t = totals([
      { item: item({ caloriesKcal: 200, proteinG: 10 }), servings: 2 },
      { item: item({ caloriesKcal: null, proteinG: null }), servings: 1 },
    ]);
    expect(t.caloriesKcal).toEqual({ value: 400, known: 1, entries: 2 });
    expect(t.proteinG.value).toBe(20);
  });
});

describe("planner on the real Warren Nov 7 menu", () => {
  it("returns distinct options whose every dish passes the same gate", () => {
    for (const restrictions of [noAllergies, avoidMilkEgg, { ...noAllergies, requireTags: ["Vegetarian"] }]) {
      const result = planMeal(dinner, targets, restrictions);
      expect(result.kind).toBe("ok");
      if (result.kind !== "ok") continue;
      expect(result.options.length).toBeGreaterThan(0);
      for (const option of result.options) {
        expect(option.entries.length).toBeGreaterThanOrEqual(2);
        for (const { item } of option.entries) {
          expect(checkRestrictions(item, restrictions).allowed).toBe(true);
          expect(item.caloriesKcal).not.toBeNull();
          expect(item.issues).not.toContain("build_your_own");
        }
      }
      const counts = new Map<string, number>();
      for (const o of result.options) for (const e of o.entries) counts.set(e.item.id, (counts.get(e.item.id) ?? 0) + 1);
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
      for (let i = 0; i < result.options.length; i++)
        for (let j = i + 1; j < result.options.length; j++) {
          const a = new Set(result.options[i]!.entries.map((e) => e.item.id));
          expect(result.options[j]!.entries.filter((e) => a.has(e.item.id)).length).toBeLessThanOrEqual(1);
        }
    }
  });

  it("is deterministic and bounded in time", () => {
    const t0 = performance.now();
    const a = planMeal(lunch, targets, noAllergies);
    const elapsed = performance.now() - t0;
    const b = planMeal(lunch, targets, noAllergies);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(elapsed).toBeLessThan(2000);
  });

  it("gets reasonably close to an ordinary target", () => {
    const result = planMeal(dinner, targets, noAllergies);
    if (result.kind !== "ok") throw new Error("expected options");
    const best = totals(result.options[0]!.entries);
    expect(Math.abs(best.caloriesKcal.value - 700)).toBeLessThan(175);
  });

  it("excluding a dish (swap) removes it from every option", () => {
    const first = planMeal(dinner, targets, noAllergies);
    if (first.kind !== "ok") throw new Error("expected options");
    const removed = first.options[0]!.entries[0]!.item.id;
    const next = planMeal(dinner, targets, noAllergies, { exclude: new Set([removed]) });
    if (next.kind !== "ok") throw new Error("expected options");
    for (const o of next.options) expect(o.entries.some((e) => e.item.id === removed)).toBe(false);
  });

  it("reports infeasible restrictions honestly and never relaxes them", () => {
    const impossible: Restrictions = { allergyAnswer: "some", avoidAllergens: ["Milk", "Egg", "Wheat", "Soy"], requireTags: ["Vegan", "Halal", "Gluten Free"], strictUnknown: true };
    const result = planMeal(dinner, targets, impossible);
    if (result.kind === "ok") {
      for (const o of result.options) for (const e of o.entries) expect(checkRestrictions(e.item, impossible).allowed).toBe(true);
    } else {
      expect(result.reason).toMatch(/restrictions/);
      expect(result.excluded.restricted).toBeGreaterThan(0);
    }
  });

  it("gives no suggestions or swaps until allergies are answered", () => {
    const result = planMeal(dinner, targets, DEFAULT_RESTRICTIONS);
    expect(result).toMatchObject({ kind: "infeasible", reason: expect.stringMatching(/allergy question/) });
    const swapped = planMeal(dinner, targets, DEFAULT_RESTRICTIONS, { exclude: new Set([dinner[0]!.id]) });
    expect(swapped.kind).toBe("infeasible");
  });

  it("asks for targets instead of guessing them", () => {
    const result = planMeal(dinner, { caloriesKcal: null, proteinG: null, carbsG: null, fatG: null }, noAllergies);
    expect(result.kind).toBe("infeasible");
  });

  it("an absurd target marks the best match as far rather than failing", () => {
    const result = planMeal(dinner, { caloriesKcal: 6000, proteinG: 400, carbsG: null, fatG: null }, noAllergies);
    if (result.kind !== "ok") throw new Error("expected options");
    expect(result.options[0]!.far).toBe(true);
  });

  it("notes inconsistent macro targets without rewriting them", () => {
    expect(validateTargets({ caloriesKcal: 500, proteinG: 60, carbsG: 100, fatG: 40 })[0]).toMatch(/add up to about 1000 kcal/);
    expect(validateTargets(targets)).toEqual([]);
  });

  it("splits daily targets into a labelled meal share", () => {
    expect(mealShare({ caloriesKcal: 2100, proteinG: 120, carbsG: null, fatG: null }, 3)).toEqual({ caloriesKcal: 700, proteinG: 40, carbsG: null, fatG: null });
  });
});
