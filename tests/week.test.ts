import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mealShare, planMeal } from "../src/lib/planner";
import { checkRestrictions, type Restrictions } from "../src/lib/restrictions";
import { DayMenu, type Meal } from "../src/lib/schema";
import { chooseMeals, dayTotals, weekDates } from "../src/lib/week";

const day = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8")));
const meal = (name: string): Meal => ({ name, hours: null, items: [] });

describe("week dates", () => {
  it("are seven calendar days across month ends and the DST change", () => {
    expect(weekDates("2026-10-29")).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(weekDates("2026-12-28").at(-1)).toBe("2027-01-03");
  });
});

describe("choosing which posted meals to plan", () => {
  it("keeps service order and prefers later meals when the user eats fewer", () => {
    const weekday = [meal("Breakfast"), meal("Lunch"), meal("Dinner")];
    expect(chooseMeals(weekday, 2).map((m) => m.name)).toEqual(["Lunch", "Dinner"]);
    expect(chooseMeals(weekday, 3).map((m) => m.name)).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });

  it("never invents meals a day doesn't post", () => {
    expect(chooseMeals([meal("Brunch"), meal("Dinner")], 3).map((m) => m.name)).toEqual(["Brunch", "Dinner"]);
    expect(chooseMeals([], 3)).toEqual([]);
  });

  it("marks a day incomplete when fewer meals were planned than intended", () => {
    expect(dayTotals([[], []], 3).complete).toBe(false);
    expect(dayTotals([[], [], []], 3).complete).toBe(true);
  });
});

describe("weekly planning on a real day", () => {
  const restrictions: Restrictions = { allergyAnswer: "some", avoidAllergens: ["Milk"], requireTags: [], strictUnknown: true };
  const share = mealShare({ caloriesKcal: 2100, proteinG: 120, carbsG: null, fatG: null }, 3);

  it("every option for every planned meal passes the shared gate", () => {
    for (const m of chooseMeals(day.meals, 3)) {
      const result = planMeal(m.items, share, restrictions);
      if (result.kind !== "ok") continue;
      for (const o of result.options) for (const e of o.entries) expect(checkRestrictions(e.item, restrictions).allowed).toBe(true);
    }
  });

  it("a weekly swap removes the dish from that meal only", () => {
    const dinner = day.meals.find((m) => m.name === "Dinner")!;
    const lunch = day.meals.find((m) => m.name === "Lunch")!;
    const first = planMeal(dinner.items, share, restrictions);
    if (first.kind !== "ok") throw new Error("expected options");
    const removed = first.options[0]!.entries[0]!.item.id;
    const swapped = planMeal(dinner.items, share, restrictions, { exclude: new Set([removed]) });
    if (swapped.kind !== "ok") throw new Error("expected options");
    expect(swapped.options.flatMap((o) => o.entries).some((e) => e.item.id === removed)).toBe(false);
    // Lunch ids differ from dinner ids (occurrence-scoped), so excluding a dinner dish can't touch lunch.
    expect(lunch.items.some((i) => i.id === removed)).toBe(false);
  });
});
