import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MenuList } from "./features/MenuList";
import { Plate } from "./features/Plate";
import { DEFAULT_RESTRICTIONS } from "./lib/restrictions";
import type { MenuItem } from "./lib/schema";

const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

const item: MenuItem = {
  id: "bu-warren-2026-11-07-lunch-x",
  sourceRecipeId: null,
  name: `Soup ${hostile}`,
  description: hostile,
  station: `"><svg onload=alert(3)>`,
  servingText: hostile,
  caloriesKcal: 100,
  proteinG: 5,
  carbsG: 10,
  fatG: 2,
  saturatedFatG: null,
  transFatG: null,
  fiberG: null,
  sugarsG: null,
  cholesterolMg: null,
  sodiumMg: null,
  labelDvPercent: { vitaminD: null, potassium: null, calcium: null, iron: null },
  dietTags: [],
  allergens: null,
  allergenStatus: "empty_allergen_list",
  ingredients: hostile,
  sourceUrl: "https://www.bu.edu/dining/location/warren/",
  issues: [],
};

describe("scraped text is rendered as text", () => {
  it("never produces live markup from menu strings", () => {
    const html =
      renderToStaticMarkup(<MenuList items={[item]} restrictions={DEFAULT_RESTRICTIONS} onPlate={new Set()} onAdd={() => {}} onOpen={() => {}} />) +
      renderToStaticMarkup(<Plate meal="Lunch" entries={[{ item, servings: 1 }]} target={null} targetLabel={null} onServings={() => {}} onOpen={() => {}} />);
    expect(html).not.toMatch(/<img|<script|<svg onload/i);
    expect(html).toContain("&lt;img");
  });
});
