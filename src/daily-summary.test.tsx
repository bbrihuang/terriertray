// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DailySummary } from "./features/DailySummary";
import type { DailySummaryData } from "./lib/daily-totals";
import type { Total } from "./lib/nutrition";

afterEach(cleanup);

const amount = (value: number, known = 2, entries = 2): Total => ({ value, known, entries });
const complete: DailySummaryData = {
  sum: {
    caloriesKcal: amount(600), proteinG: amount(20), carbsG: amount(50), fatG: amount(10),
    fiberG: amount(3), sugarsG: amount(4), saturatedFatG: amount(2), sodiumMg: amount(500),
  },
  selectedDishes: 2, resolvedDishes: 2, unresolvedDishes: 0, pendingDishes: 0, unavailableDishes: 0,
};
const targets = { caloriesKcal: 2400, proteinG: 120, carbsG: 300, fatG: 80 };
const renderSummary = (summary = complete, dailyTargets: typeof targets | { caloriesKcal: null; proteinG: null; carbsG: null; fatG: null } = targets) => render(<DailySummary date="2026-11-07" summary={summary} targets={dailyTargets} />);

describe("daily summary", () => {
  it("shows four accessible rings comparing planned totals with whole-day targets", () => {
    renderSummary();
    const section = screen.getByRole("region", { name: "Your daily totals" });
    expect(section.textContent).toMatch(/all BU dining halls/i);
    expect(section.textContent).toMatch(/planned, not eaten/i);
    expect(within(section).getAllByRole("img")).toHaveLength(4);
    expect(within(section).getByRole("img", { name: /Calories: 600 of 2,400 kcal planned/i })).toBeTruthy();
    expect(within(section).getByRole("img", { name: /Protein: 20 of 120 g planned/i })).toBeTruthy();
    expect(within(section).getByRole("img", { name: /Carbs: 50 of 300 g planned/i })).toBeTruthy();
    expect(within(section).getByRole("img", { name: /Fat: 10 of 80 g planned/i })).toBeTruthy();
    expect(within(section).getByText("600")).toBeTruthy();
    expect(section.textContent).toContain("/ 2,400");
  });

  it("keeps the summary focused on totals and targets without derived energy or remaining amounts", () => {
    renderSummary();
    expect(screen.queryByRole("figure")).toBeNull();
    expect(screen.queryByText(/calories from known macros|approximate energy|kcal left|g left/i)).toBeNull();
    expect(screen.getByText("600")).toBeTruthy();
  });

  it("caps visual progress at a full ring while preserving the actual over-target total", () => {
    renderSummary({ ...complete, sum: { ...complete.sum, caloriesKcal: amount(3000) } });
    const ring = screen.getByRole("img", { name: /Calories: 3,000 of 2,400 kcal planned/i });
    expect(ring.querySelector(".daily-ring-progress")?.getAttribute("stroke-dashoffset")).toBe("0");
    expect(screen.getByText("3,000")).toBeTruthy();
    expect(screen.getByText("600 kcal above target")).toBeTruthy();
  });

  it("marks partial sums with a dashed arc and coverage without suggesting an exact amount left", () => {
    renderSummary({ ...complete, sum: { ...complete.sum, caloriesKcal: amount(600, 1), proteinG: amount(0, 0) } });
    const partial = screen.getByRole("img", { name: /Calories: at least 600 of 2,400 kcal planned.*known for 1 of 2/i });
    expect(partial.querySelector(".daily-ring-progress")?.getAttribute("stroke-dasharray")).toBe("4 4");
    expect(screen.getByText("≥ 600")).toBeTruthy();
    expect(screen.getAllByText(/Known for 1 of 2 dishes/)).toHaveLength(1);
    const unknown = screen.getByRole("img", { name: /Protein: unknown/i });
    expect(unknown.querySelector(".daily-ring-progress")).toBeNull();
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.queryByText(/kcal left|g left/i)).toBeNull();
  });

  it("retains known totals without filling rings when daily targets are missing", () => {
    renderSummary(complete, { caloriesKcal: null, proteinG: null, carbsG: null, fatG: null });
    const rings = screen.getAllByRole("img", { name: /no daily target set/i });
    expect(rings).toHaveLength(4);
    for (const ring of rings) {
      expect(ring.querySelector(".daily-ring-progress")).toBeNull();
      expect(ring.querySelector(".daily-ring-track")?.getAttribute("stroke-dasharray")).toBe("4 4");
    }
    expect(screen.getByText("600")).toBeTruthy();
  });

  it.each([
    { pendingDishes: 2, unavailableDishes: 0, state: /Loading totals/i },
    { pendingDishes: 0, unavailableDishes: 2, state: /Totals unavailable/i },
  ])("does not display unresolved selected dishes as zero nutrition", ({ pendingDishes, unavailableDishes, state }) => {
    const sum = Object.fromEntries(Object.keys(complete.sum).map((key) => [key, amount(0, 0)])) as DailySummaryData["sum"];
    renderSummary({ ...complete, sum, resolvedDishes: 0, unresolvedDishes: 2, pendingDishes, unavailableDishes });
    expect(screen.getByText(state)).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByRole("figure")).toBeNull();
  });

  it("explains that a day with no selections has nothing planned", () => {
    const sum = Object.fromEntries(Object.keys(complete.sum).map((key) => [key, amount(0, 0, 0)])) as DailySummaryData["sum"];
    renderSummary({ ...complete, sum, selectedDishes: 0, resolvedDishes: 0 });
    expect(screen.getByText(/Nothing planned for this day yet/i)).toBeTruthy();
    expect(screen.queryByRole("figure")).toBeNull();
  });
});
