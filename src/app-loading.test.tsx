// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Load } from "./data";
import type { DayMenu, MenuIndex } from "./lib/schema";
import type { PlanOption } from "./lib/planner";

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
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
});
