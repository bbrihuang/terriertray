import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allergenStatus, toDayMenus, toMenuItem } from "../src/lib/adapter";
import { eligibility } from "../src/lib/freshness";
import { planMeal } from "../src/lib/planner";
import { checkRestrictions, DEFAULT_RESTRICTIONS, type Restrictions } from "../src/lib/restrictions";
import { DayMenu, MealHours, MenuIndex, ScraperEnvelope, type Freshness } from "../src/lib/schema";
import { buildMenus } from "../scripts/build-menus";

// Cut from a live run of the unchanged upstream scraper (aladincrnolic/bumenuscraper@90c2ca6).
const envelope = ScraperEnvelope.parse(JSON.parse(readFileSync("tests/fixtures/bu-envelope-sample.json", "utf-8")));
const hours = MealHours.parse(JSON.parse(readFileSync("tests/fixtures/bu-hours-sample.json", "utf-8")));
const realDay = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8")));

const find = (name: string, hall = "Warren Towers") => envelope.records.find((r) => r.name === name && r.dining_hall === hall)!;

const freshFor = (dates: string[]): Freshness => ({
  basis: "refresh_run_start",
  basisAt: "2026-11-08T01:03:52+00:00",
  checkedAt: "2026-11-08T01:05:00+00:00",
  validatorStatus: "fresh",
  maxAgeHours: 24,
  expiryHours: 48,
  requestedDates: dates,
  availableDates: dates,
  missingDates: [],
  warnings: [],
  errors: [],
});

describe("adapter for the upstream scraper's output", () => {
  it("maps snake_case fields without changing values", () => {
    const eggs = toMenuItem(find("Scrambled Eggs"), "x");
    expect(eggs).toMatchObject({
      name: "Scrambled Eggs",
      station: "Grill",
      servingText: "1/2 cup",
      caloriesKcal: 140,
      proteinG: 12,
      fatG: 9,
      sodiumMg: 595,
      allergens: ["Egg"],
      allergenStatus: "allergens_listed",
      dietTags: ["Vegetarian", "Halal"],
      sourceRecipeId: null,
      description: null, // upstream doesn't capture descriptions
    });
    expect(eggs.labelDvPercent.vitaminD).toBe(10); // % Daily Value, not a mass
  });

  it("keeps unknown allergens and nutrition unknown, and only claims what the record proves", () => {
    const sausage = find("Beef Sausage Links Halal");
    expect(sausage.allergens).toBeNull();
    expect(allergenStatus(sausage)).toBe("reason_not_recorded");
    const soup = find("Tomato Basil Soup");
    expect(allergenStatus(soup)).toBe("missing_nutrition_wrapper");
    expect(toMenuItem(soup, "x")).toMatchObject({ caloriesKcal: null, proteinG: null, issues: ["missing_nutrition"] });
  });

  it("flags build-your-own stations instead of treating them as dishes", () => {
    expect(toMenuItem(find("Create Your Own Omelet Station", "Marciano Commons"), "x").issues).toContain("build_your_own");
  });

  it("splits by hall and date, keeps duplicates with distinct stable ids, attaches published hours", () => {
    const days = toDayMenus(envelope, hours);
    const brunch = days.find((d) => d.hallId === "warren" && d.date === "2026-11-08")!.meals.find((m) => m.name === "Brunch")!;
    expect(brunch.hours).toBe("10:00 AM - 4:00 PM");
    const cheese = brunch.items.filter((i) => i.name === "Chive Cream Cheese");
    expect(cheese).toHaveLength(2);
    expect(new Set(cheese.map((c) => c.id)).size).toBe(2);
    expect(toDayMenus(envelope, hours).flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.id)))).toEqual(
      days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.id))),
    );
    const warren7 = days.find((d) => d.hallId === "warren" && d.date === "2026-11-07")!;
    expect(warren7.meals.map((m) => m.name)).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });

  it("leaves hours unknown when the hours adapter found none", () => {
    expect(toDayMenus(envelope, {})[0]!.meals[0]!.hours).toBeNull();
  });
});

describe("scraper output → public files → displayed dishes → recommendations", () => {
  const today = "2026-11-07";
  const { index, files } = buildMenus({ bu: envelope, hours, fenway: null, freshness: freshFor([today]), prior: null, attemptedAt: "2026-11-08T01:05:00Z", today });

  it("publishes valid public files whose dishes are the scraper's records", () => {
    MenuIndex.parse(index);
    const warren = index.halls.find((h) => h.id === "warren")!;
    const day = DayMenu.parse(files.get(warren.dates.find((d) => d.date === today)!.file));
    const shown = day.meals.flatMap((m) => m.items.map((i) => `${m.name}|${i.name}|${i.caloriesKcal}`)).sort();
    const source = envelope.records
      .filter((r) => r.dining_hall === "Warren Towers" && r.date === today)
      .map((r) => `${r.meal}|${r.name}|${r.calories}`)
      .sort();
    expect(shown).toEqual(source);
    expect(warren.lastSuccessfulFetchAt).toBe("2026-11-08T01:03:52+00:00");
  });

  it("recommends from those dishes only through the freshness check and the restriction gate", () => {
    const restrictions: Restrictions = { ...DEFAULT_RESTRICTIONS, allergyAnswer: "some", avoidAllergens: ["Egg"] };
    const day = files.get(index.halls.find((h) => h.id === "warren")!.dates[0]!.file)!;
    const items = day.meals.flatMap((m) => m.items);
    expect(eligibility(index, "warren", today, new Date("2026-11-08T02:00:00Z")).canRecommend).toBe(true);
    expect(eligibility(index, "warren", today, new Date("2026-11-10T02:00:00Z")).canRecommend).toBe(false);
    const result = planMeal(items, { caloriesKcal: 300, proteinG: 15, carbsG: null, fatG: null }, restrictions);
    if (result.kind === "ok") for (const o of result.options) for (const e of o.entries) expect(checkRestrictions(e.item, restrictions).allowed).toBe(true);
    // Eggs are listed with Egg, so they can never be recommended to someone avoiding Egg.
    expect(items.find((i) => i.name === "Scrambled Eggs") && checkRestrictions(items.find((i) => i.name === "Scrambled Eggs")!, restrictions).allowed).toBe(false);
  });

  it("the real published Warren day validates with unique ids and real hours", () => {
    const ids = realDay.meals.flatMap((m) => m.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(realDay.meals.find((m) => m.name === "Breakfast")?.hours).toBe("9:00 AM - 11:00 AM");
  });
});

describe("publication merge", () => {
  const attemptedAt = "2026-11-08T15:00:00.000Z";
  const today = "2026-11-08";
  const first = buildMenus({ bu: envelope, hours, fenway: null, prior: null, attemptedAt: "2026-11-07T22:00:00.000Z", today: "2026-11-07" });
  const prior = { index: first.index, readDay: (file: string) => first.files.get(file)! };

  it("a failed run (no new data) keeps every hall's previous snapshot, marked stale", () => {
    const { index, files } = buildMenus({ bu: null, fenway: null, prior, attemptedAt, today });
    for (const id of ["west", "warren", "marciano"]) {
      const hall = index.halls.find((h) => h.id === id)!;
      expect(hall.status).toBe("stale_after_failure");
      expect(hall.lastAttemptAt).toBe(attemptedAt);
      for (const d of hall.dates) expect(files.has(d.file)).toBe(true);
    }
  });

  it("new data without a validation result is never marked fresh or given a fetch time", () => {
    expect(first.index.freshness).toBeNull();
    const west = first.index.halls.find((h) => h.id === "west")!;
    expect(west.lastSuccessfulFetchAt).toBeNull();
    expect(west.note).toMatch(/not established/);
  });

  it("a failed run keeps the previous validation result so its age keeps counting", () => {
    const validated = buildMenus({ bu: envelope, hours, fenway: null, freshness: freshFor(["2026-11-07"]), prior: null, attemptedAt, today });
    const failedRun = buildMenus({ bu: null, fenway: null, prior: { index: validated.index, readDay: (f) => validated.files.get(f)! }, attemptedAt: "2026-11-09T10:00:00Z", today: "2026-11-09" });
    expect(failedRun.index.freshness?.basisAt).toBe("2026-11-08T01:03:52+00:00");
  });

  it("Fenway stays listed without dishes (deferred)", () => {
    expect(first.index.halls.find((h) => h.id === "fenway")).toMatchObject({ status: "not_configured", dates: [] });
  });
});
