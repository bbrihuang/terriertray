// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Load } from "./data";
import type { DayMenu, MenuIndex } from "./lib/schema";

const loads = vi.hoisted(() => ({ index: { state: "loading" } as Load<MenuIndex>, day: { state: "loading" } as Load<DayMenu> }));
vi.mock("./data", () => ({
  useMenuIndex: () => loads.index,
  useDayMenu: () => loads.day,
  useNow: () => new Date("2026-11-08T01:00:00Z"),
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
afterEach(cleanup);

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
});
