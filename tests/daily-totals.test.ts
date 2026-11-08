import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aggregateDailyTrays } from "../src/lib/daily-totals";
import { DayMenu, type MenuItem } from "../src/lib/schema";

const date = "2026-11-07";
const source = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8"))).meals[0]!.items[0]!;
const item = (id: string, caloriesKcal: number, proteinG: number | null = 10): MenuItem => ({
  ...source, id, caloriesKcal, proteinG, carbsG: 20, fatG: 5,
});
const ready = (hallId: string, meal: string, items: MenuItem[], day = date) => ({
  state: "ready" as const,
  data: { schemaVersion: 1 as const, hallId, date: day, meals: [{ name: meal, hours: null, items }] },
});

describe("daily planned totals", () => {
  it("combines the selected date's plates across halls and scales servings", () => {
    const summary = aggregateDailyTrays({
      [`warren/${date}/Breakfast`]: [{ id: "eggs", servings: 2 }],
      [`west/${date}/Dinner`]: [{ id: "rice", servings: 1 }],
      "west/2026-11-08/Dinner": [{ id: "rice", servings: 6 }],
    }, date, {
      warren: ready("warren", "Breakfast", [item("eggs", 100)]),
      west: ready("west", "Dinner", [item("rice", 300, 30)]),
    });
    expect(summary.sum.caloriesKcal).toEqual({ value: 500, known: 2, entries: 2 });
    expect(summary.sum.proteinG.value).toBe(50);
    expect(summary).toMatchObject({ selectedDishes: 2, resolvedDishes: 2, unresolvedDishes: 0 });
  });

  it("retains pending and unavailable selections in each nutrient's completeness", () => {
    const summary = aggregateDailyTrays({
      [`warren/${date}/Dinner`]: [{ id: "pending", servings: 1 }],
      [`west/${date}/Dinner`]: [{ id: "failed", servings: 1 }],
      [`marciano/${date}/Dinner`]: [{ id: "unposted", servings: 1 }],
      [`other/${date}/Dinner`]: [{ id: "missing", servings: 1 }],
    }, date, {
      warren: { state: "loading" },
      west: { state: "error", message: "Offline" },
      other: ready("other", "Dinner", []),
    });
    expect(summary).toMatchObject({ selectedDishes: 4, resolvedDishes: 0, unresolvedDishes: 4, pendingDishes: 1, unavailableDishes: 3 });
    for (const total of Object.values(summary.sum)) expect(total).toEqual({ value: 0, known: 0, entries: 4 });
  });

  it("keeps resolved subtotals and missing nutrients separate from missing dishes", () => {
    const summary = aggregateDailyTrays({
      [`warren/${date}/Dinner`]: [{ id: "known", servings: 2 }, { id: "missing", servings: 1 }],
    }, date, { warren: ready("warren", "Dinner", [item("known", 125, null)]) });
    expect(summary.sum.caloriesKcal).toEqual({ value: 250, known: 1, entries: 2 });
    expect(summary.sum.proteinG).toEqual({ value: 0, known: 0, entries: 2 });
    expect(summary).toMatchObject({ resolvedDishes: 1, unresolvedDishes: 1, unavailableDishes: 1 });
  });

  it.each([
    ready("west", "Dinner", [item("dish", 100)]),
    ready("warren", "Dinner", [item("dish", 100)], "2026-11-08"),
    ready("warren", "Lunch", [item("dish", 100)]),
  ])("does not resolve an ID from another hall, date, or meal", (load) => {
    const summary = aggregateDailyTrays({ [`warren/${date}/Dinner`]: [{ id: "dish", servings: 1 }] }, date, { warren: load });
    expect(summary).toMatchObject({ resolvedDishes: 0, unavailableDishes: 1 });
    expect(summary.sum.caloriesKcal).toEqual({ value: 0, known: 0, entries: 1 });
  });

  it("preserves a meal name containing a slash", () => {
    const summary = aggregateDailyTrays({ [`warren/${date}/Lunch/Brunch`]: [{ id: "dish", servings: 1 }] }, date, {
      warren: ready("warren", "Lunch/Brunch", [item("dish", 100)]),
    });
    expect(summary.sum.caloriesKcal.value).toBe(100);
    expect(summary.unresolvedDishes).toBe(0);
  });

  it("treats empty trays as an empty day without waiting for files", () => {
    const summary = aggregateDailyTrays({ [`warren/${date}/Dinner`]: [] }, date, { warren: { state: "loading" } });
    expect(summary).toMatchObject({ selectedDishes: 0, resolvedDishes: 0, unresolvedDishes: 0, pendingDishes: 0, unavailableDishes: 0 });
    expect(summary.sum.caloriesKcal).toEqual({ value: 0, known: 0, entries: 0 });
  });
});
