// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Load } from "./data";
import type { DayMenu, MenuIndex, MenuItem } from "./lib/schema";
import type { PlanOption } from "./lib/planner";
import * as planner from "./lib/planner";

const loads = vi.hoisted(() => ({ index: { state: "loading" } as Load<MenuIndex>, day: { state: "loading" } as Load<DayMenu> }));
vi.mock("./data", () => ({
  useMenuIndex: () => loads.index,
  useDayMenu: () => loads.day,
  useDayMenus: () => ({}),
  useNow: () => new Date("2026-11-08T01:00:00Z"),
}));
vi.mock("./features/Week", () => ({
  Week: ({ onUse }: { onUse: (date: string, meal: string, option: PlanOption) => void }) => (
    <button onClick={() => onUse("2026-11-07", "Dinner", { entries: [], error: 0, far: false })}>Use test weekly meal</button>
  ),
}));
import App from "./App";

const index: MenuIndex = {
  schemaVersion: 1, dataVersion: "loading-test", generatedAt: "2026-11-07T22:00:00Z",
  timezone: "America/New_York", allergyNotice: "Confirm allergies with dining staff.", freshness: null,
  halls: [{
    id: "west", name: "West Campus", source: "bu-html", sourceUrl: "https://www.bu.edu/dining/location/west/",
    status: "ok", lastAttemptAt: null, lastSuccessfulFetchAt: null, note: null,
    dates: [{ date: "2026-11-07", file: "west/2026-11-07.json", itemCount: 0, meals: ["Dinner"] }],
  }],
};
const day: DayMenu = { schemaVersion: 1, hallId: "west", date: "2026-11-07", meals: [{ name: "Dinner", hours: "5:00 PM - 9:00 PM", items: [] }] };

beforeEach(() => {
  loads.index = { state: "ready", data: index };
  loads.day = { state: "loading" };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("menu headline loading", () => {
  it("keeps the fallback out of the accessibility tree until the selected meal is known", () => {
    const { rerender } = render(<App />);
    expect(screen.queryByRole("heading", { name: /Your next BU meal/ })).toBeNull();
    const loadingTitle = screen.getByText("Your next BU meal,").closest("h2")?.parentElement;
    expect(loadingTitle?.classList.contains("invisible")).toBe(true); // space is retained rather than removing the heading
    loads.day = { state: "ready", data: day };
    rerender(<App />);
    expect(screen.getByRole("heading", { name: "Dinner at West Campus." })).toBeTruthy();
    expect(screen.queryByText("Your next BU meal,")).toBeNull();
  });

  it("announces a load failure instead of leaving the view hidden", () => {
    loads.day = { state: "error", message: "Menu request failed." };
    render(<App />);
    expect(screen.getByRole("alert").textContent).toContain("Menu request failed.");
    expect(screen.getByRole("heading", { name: /Your next BU meal/ })).toBeTruthy();
  });

  it("returns Home to Plan without discarding targets or reloading the page", () => {
    loads.day = { state: "ready", data: day };
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      fireEvent.change(screen.getByLabelText(/^Calories \(/), { target: { value: "2500" } });
      const home = screen.getByRole("link", { name: "TerrierTrays home" });
      expect(home.getAttribute("href")).toBe("?view=plan");
      fireEvent.click(home);
      expect(screen.getByRole("button", { name: "Plan" }).getAttribute("aria-current")).toBe("page");
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Dinner at West Campus." }));
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByLabelText<HTMLInputElement>(/^Calories \(/).value).toBe("2500");
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });

  it("keeps Settings mounted and focused without changing page motion when typing and clicking fields", () => {
    loads.day = { state: "ready", data: day };
    const initialModality = document.documentElement.dataset.input;
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      const main = screen.getByRole("main");
      const age = screen.getByLabelText<HTMLInputElement>(/^Age/);
      const weight = screen.getByLabelText<HTMLInputElement>(/^Weight/);

      age.focus();
      fireEvent.keyDown(age, { key: "2" });
      fireEvent.change(age, { target: { value: "25" } });
      expect(screen.getByRole("main")).toBe(main);
      expect(document.activeElement).toBe(age);
      expect(age.value).toBe("25");
      expect(document.documentElement.dataset.input).toBe(initialModality);

      fireEvent.pointerDown(weight);
      weight.focus();
      fireEvent.keyDown(weight, { key: "7" });
      fireEvent.change(weight, { target: { value: "175" } });
      expect(screen.getByRole("main")).toBe(main);
      expect(document.activeElement).toBe(weight);
      expect(weight.value).toBe("175");
      expect(age.value).toBe("25");
      expect(document.documentElement.dataset.input).toBe(initialModality);
    } finally {
      if (initialModality === undefined) delete document.documentElement.dataset.input;
      else document.documentElement.dataset.input = initialModality;
    }
  });

  it("runs plate optimization on Plan rather than while editing daily targets in Settings", () => {
    const recent = "2026-11-08T00:59:00Z"; // one minute before the mocked useNow timestamp
    loads.index = { state: "ready", data: { ...index, freshness: {
      basis: "oldest_hall_fetch", basisAt: recent, checkedAt: recent, validatorStatus: "fresh",
      maxAgeHours: 24, expiryHours: 48, requestedDates: [day.date], availableDates: [day.date], missingDates: [], warnings: [], errors: [],
    } } };
    loads.day = { state: "ready", data: day };
    const optimize = vi.spyOn(planner, "planMeal");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("radio", { name: "No allergens to filter" }));
    const calories = screen.getByLabelText<HTMLInputElement>(/^Calories \(/);
    fireEvent.change(calories, { target: { value: "2500" } });
    optimize.mockClear();

    fireEvent.change(calories, { target: { value: "2600" } });
    expect(calories.value).toBe("2600");
    expect(optimize).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    expect(optimize).toHaveBeenCalledTimes(1);
  });

  it("moves keyboard focus to the plate after applying a weekly meal", () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    loads.index = { state: "ready", data: { ...index, freshness: {
      basis: "oldest_hall_fetch", basisAt: recent, checkedAt: recent, validatorStatus: "fresh",
      maxAgeHours: 24, expiryHours: 48, requestedDates: [day.date], availableDates: [day.date], missingDates: [], warnings: [], errors: [],
    } } };
    loads.day = { state: "ready", data: day };
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Week" }));
      const use = screen.getByRole("button", { name: "Use test weekly meal" });
      use.focus();
      fireEvent.click(use);
      const plate = screen.getByRole("heading", { name: "Your dinner plate" });
      expect(document.activeElement).toBe(plate);
      expect(scroll).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });

  it("takes the manual-target shortcut directly to its focused heading", () => {
    loads.day = { state: "ready", data: day };
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Type my own targets" }));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Daily targets" }));
      expect(screen.getByLabelText(/^Calories \(/)).toBeTruthy();
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });

  it("can undo a plate replacement including custom portions, but not after a later manual edit", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T01:00:00Z"));
    const items: MenuItem[] = ["Lemon lentils", "Roasted potato", "Garden tofu"].map((name, i) => ({
      id: `dish-${i}`, sourceRecipeId: null, name, description: null, station: "Kitchen", servingText: "1 serving",
      caloriesKcal: 300, proteinG: 20, carbsG: 40, fatG: 7, saturatedFatG: null, transFatG: null, fiberG: null, sugarsG: null,
      cholesterolMg: null, sodiumMg: null, labelDvPercent: { vitaminD: null, potassium: null, calcium: null, iron: null },
      dietTags: [], allergens: [], allergenStatus: "explicitly_none_listed", ingredients: null,
      sourceUrl: "https://www.bu.edu/dining/location/west/", issues: [],
    }));
    loads.day = { state: "ready", data: { ...day, meals: [{ ...day.meals[0]!, items }] } };
    const recent = "2026-11-08T00:59:00Z";
    loads.index = { state: "ready", data: { ...index, freshness: {
      basis: "oldest_hall_fetch", basisAt: recent, checkedAt: recent, validatorStatus: "fresh", maxAgeHours: 24, expiryHours: 48,
      requestedDates: [day.date], availableDates: [day.date], missingDates: [], warnings: [], errors: [],
    } } };
    const options = [[items[0]!, items[1]!], [items[1]!, items[2]!]].map((dishes) => ({ entries: dishes.map((item) => ({ item, servings: 1 })), error: 0, far: false }));
    vi.spyOn(planner, "planMeal").mockReturnValue({ kind: "ok", options, considered: 3, notes: [], excluded: { restricted: 0, incompleteNutrition: 0, buildYourOwn: 0, tooSmall: 0, userExcluded: 0 } });
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      fireEvent.click(screen.getByRole("radio", { name: "No allergens to filter" }));
      fireEvent.change(screen.getByLabelText(/^Calories \(/), { target: { value: "2400" } });
      fireEvent.click(screen.getByRole("button", { name: "Plan" }));
      fireEvent.click(screen.getAllByRole("button", { name: "Use this plate" })[0]!);
      const plate = screen.getByRole("region", { name: "Your dinner plate" });
      fireEvent.click(within(plate).getByRole("button", { name: "One more serving of Lemon lentils" }));
      fireEvent.click(screen.getAllByRole("button", { name: "Replace my plate" })[1]!);
      expect(within(plate).queryByRole("button", { name: "Lemon lentils" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Undo replacement" }));
      expect(within(plate).getByRole("button", { name: "Lemon lentils" })).toBeTruthy();
      expect(within(plate).getByRole("button", { name: "One less serving of Lemon lentils" })).toBeTruthy();
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your dinner plate" }));
      expect(screen.queryByRole("button", { name: "Undo replacement" })).toBeNull();
      fireEvent.click(screen.getAllByRole("button", { name: "Replace my plate" })[1]!);
      fireEvent.click(within(plate).getByRole("button", { name: "One more serving of Garden tofu" }));
      expect(screen.queryByRole("button", { name: "Undo replacement" })).toBeNull();
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });
});
