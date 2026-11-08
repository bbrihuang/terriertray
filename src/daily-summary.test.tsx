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
const renderSummary = (summary = complete) => render(<DailySummary date="2026-11-07" summary={summary} targets={targets} />);

describe("daily summary", () => {
  it("compares planned menu calories and grams with whole-day targets", () => {
    renderSummary();
    const section = screen.getByRole("region", { name: "Your daily totals" });
    expect(section.textContent).toMatch(/all BU dining halls/i);
    expect(section.textContent).toMatch(/planned, not eaten/i);
    expect(within(section).getByText("600")).toBeTruthy();
    expect(section.textContent).toContain("of 2,400 kcal");
    expect(section.textContent).toContain("of 120 g");
    expect(section.textContent).toContain("1,800 kcal left");
  });

  it("keeps provider calories separate from approximate energy derived from macros", () => {
    renderSummary();
    const figure = screen.getByRole("figure", { name: /Calories from known macros/ });
    expect(figure.textContent).toContain("370 kcal");
    expect(figure.textContent).toContain("Protein 22%");
    expect(figure.textContent).toContain("Carbs 54%");
    expect(figure.textContent).toContain("Fat 24%");
    expect(figure.textContent).toMatch(/4.*4.*9/);
    expect(screen.getByText("600")).toBeTruthy();
  });

  it("labels partial nutrient sums without claiming an exact amount left", () => {
    renderSummary({ ...complete, sum: { ...complete.sum, caloriesKcal: amount(600, 1), proteinG: amount(0, 0) } });
    expect(screen.getByText("at least 600")).toBeTruthy();
    expect(screen.getAllByText(/Known for 1 of 2 dishes/)).toHaveLength(1);
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.queryByText("1,800 kcal left")).toBeNull();
    expect(screen.getByRole("figure").textContent).toMatch(/partial/i);
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
