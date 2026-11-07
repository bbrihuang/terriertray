import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toDayMenus, toMenuItem } from "../src/lib/adapter";
import { DayMenu, ScraperEnvelope, type MenuIndex } from "../src/lib/schema";
import { buildMenus } from "../scripts/build-menus";

const envelope = ScraperEnvelope.parse(JSON.parse(readFileSync("tests/fixtures/bu-envelope-sample.json", "utf-8")));
const realDay = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8")));

const find = (name: string, hall = "Warren Towers") => envelope.records.find((r) => r.name === name && r.dining_hall === hall)!;

describe("scraper adapter", () => {
  it("maps snake_case fields without changing values", () => {
    const eggs = toMenuItem(find("Scrambled Eggs"));
    expect(eggs).toMatchObject({
      name: "Scrambled Eggs",
      station: "Grill",
      servingText: "1/2 cup",
      caloriesKcal: 140,
      proteinG: 12,
      carbsG: 0,
      fatG: 9,
      sodiumMg: 595,
      allergens: ["Egg"],
      allergenStatus: "allergens_listed",
      dietTags: ["Vegetarian", "Halal"],
      sourceRecipeId: null,
    });
    // % Daily Value stays a percentage of the label DV.
    expect(eggs.labelDvPercent.vitaminD).toBe(10);
  });

  it("keeps unknown allergens null and missing nutrition null, never zero", () => {
    const sausage = toMenuItem(find("Beef Sausage Links Halal"));
    expect(sausage.allergens).toBeNull();
    expect(sausage.allergenStatus).toBe("empty_allergen_list");
    const soup = toMenuItem(find("Tomato Basil Soup"));
    expect(soup.caloriesKcal).toBeNull();
    expect(soup.proteinG).toBeNull();
    expect(soup.issues).toContain("missing_nutrition");
  });

  it("flags build-your-own stations instead of treating them as dishes", () => {
    expect(toMenuItem(find("Create Your Own Omelet Station", "Marciano Commons")).issues).toContain("build_your_own");
  });

  it("splits by hall and service date, keeps duplicates, attaches published hours", () => {
    const days = toDayMenus(envelope);
    const warren8 = days.find((d) => d.hallId === "warren" && d.date === "2026-11-08")!;
    const brunch = warren8.meals.find((m) => m.name === "Brunch")!;
    expect(brunch.hours).toBe("10:00 AM - 4:00 PM");
    const cheese = brunch.items.filter((i) => i.name === "Chive Cream Cheese");
    expect(cheese).toHaveLength(2);
    expect(new Set(cheese.map((c) => c.id)).size).toBe(2);
    const warren7 = days.find((d) => d.hallId === "warren" && d.date === "2026-11-07")!;
    expect(warren7.meals.map((m) => m.name)).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });

  it("real published day file validates and has unique ids", () => {
    const ids = realDay.meals.flatMap((m) => m.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(realDay.meals.find((m) => m.name === "Breakfast")?.hours).toBe("9:00 AM - 11:00 AM");
  });
});

describe("publication merge", () => {
  const attemptedAt = "2026-11-08T15:00:00.000Z";
  const today = "2026-11-08";

  const first = buildMenus({ bu: envelope, fenway: null, prior: null, attemptedAt: "2026-11-07T22:00:00.000Z", today: "2026-11-07" });
  const priorFiles = first.files;
  const prior = {
    index: { ...first.index, halls: first.index.halls.map((h) => ({ ...h, lastSuccessfulFetchAt: h.id === "warren" ? "2026-11-07T21:00:00+00:00" : h.lastSuccessfulFetchAt })) } as MenuIndex,
    readDay: (file: string) => priorFiles.get(file)!,
  };

  it("first run without prior data marks uncollected halls failed, not empty-ok", () => {
    const partial = { ...envelope, status: "partial" as const, dining_halls: ["West Campus"], failed_halls: ["Warren Towers", "Marciano Commons"] };
    const { index } = buildMenus({ bu: partial, fenway: null, prior: null, attemptedAt, today });
    expect(index.halls.find((h) => h.id === "warren")).toMatchObject({ status: "failed", dates: [] });
    expect(index.halls.find((h) => h.id === "west")?.status).toBe("ok");
  });

  it("a failed hall keeps its previous snapshot and original fetch time", () => {
    const partial = { ...envelope, status: "partial" as const, dining_halls: ["West Campus", "Marciano Commons"], failed_halls: ["Warren Towers"] };
    const { index, files } = buildMenus({ bu: partial, fenway: null, prior, attemptedAt, today });
    const warren = index.halls.find((h) => h.id === "warren")!;
    expect(warren.status).toBe("stale_after_failure");
    expect(warren.lastSuccessfulFetchAt).toBe("2026-11-07T21:00:00+00:00");
    expect(warren.lastAttemptAt).toBe(attemptedAt);
    expect(warren.dates.length).toBeGreaterThan(0);
    for (const d of warren.dates) expect(files.has(d.file)).toBe(true);
  });

  it("legacy snapshots without a recorded fetch time say so", () => {
    const west = first.index.halls.find((h) => h.id === "west")!;
    expect(west.lastSuccessfulFetchAt).toBeNull();
    expect(west.note).toMatch(/not recorded/);
  });

  it("Fenway is listed honestly without dishes until its feed is mapped", () => {
    const fenway = first.index.halls.find((h) => h.id === "fenway")!;
    expect(fenway).toMatchObject({ status: "not_configured", dates: [] });
  });

  it("dataVersion changes when content changes", () => {
    const partial = { ...envelope, dining_halls: ["West Campus"], failed_halls: ["Warren Towers", "Marciano Commons"], status: "partial" as const };
    const other = buildMenus({ bu: partial, fenway: null, prior: null, attemptedAt, today });
    expect(other.index.dataVersion).not.toBe(first.index.dataVersion);
  });
});
