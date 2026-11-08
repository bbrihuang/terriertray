import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatQty, portionLabel } from "../src/lib/portion";

const p = (name: string, servingText: string | null, servings = 1) => portionLabel({ name, servingText }, servings);

describe("portionLabel: words a student uses in line", () => {
  it("names the thing instead of 'each' or 'piece'", () => {
    expect(p("Pepperoni Pizza", "1/8 cut")).toBe("1 slice · plate");
    expect(p("Pepperoni Pizza", "1/8 cut", 2)).toBe("2 slices · plate");
    expect(p("Danish Pastry", "1 each")).toBe("1 pastry · plate");
    expect(p("Hard-Boiled Egg", "1 each", 2)).toBe("2 eggs · plate");
    expect(p("Cluck Chicken Tenders", "3 each")).toBe("3 tenders · plate");
    expect(p("Buttermilk Pancakes", "2 each")).toBe("2 pancakes · plate");
    expect(p("Dulce De Leche Brownie", "1/64 cut")).toBe("1 brownie · plate");
    expect(p("Rosemary Focaccia", "1/24 each")).toBe("1 slice · plate");
    expect(p("Turkey Bacon Ranch Wrap", "1/2 sandwich")).toBe("½ sandwich · plate");
    expect(p("Vietnamese Roast Beef Wrap", "1/2 each")).toBe("½ wrap · plate");
    expect(p("Vietnamese Roast Beef Wrap", "1/2 each", 2)).toBe("1 wrap · plate");
    expect(p("Turkey Sausage Patty", "1 patty", 2)).toBe("2 patties · plate");
    expect(p("Shrimp & Grits", "1 serving")).toBe("1 serving · plate");
    expect(p("Asian Grain Bowl", "1 each")).toBe("1 bowl");
    expect(p("Blueberry Cobbler", "1 each")).toBe("1 mini bowl");
    expect(p("Classic Hot Dog", "1 each")).toBe("1 hot dog · plate");
    expect(p("Spicy Orange Chicken With Broccoli", "1 serving")).toBe("1 serving · plate");
    expect(p("Banana Bread Plant Based", "1 each")).toBe("1 slice · plate");
    expect(p("Fresh Banana", "1 each")).toBe("1 piece of fruit · plate");
  });

  it("puts soups and drinks in bowls, mini bowls and cups; sauces in tablespoons", () => {
    expect(p("Buffalo Chicken Soup", "6 fl oz")).toBe("6 fl oz · mini bowl");
    expect(p("Mac And Cheese", "22 fl oz")).toBe("22 fl oz · bowl");
    expect(p("Butter Chicken", "4 fl oz")).toBe("4 fl oz · mini bowl");
    expect(p("Blueberry-Banana Smoothie", "8 fl oz")).toBe("8 fl oz · cup");
    expect(p("Hot Honey", "1 fl oz")).toBe("2 tbsp");
    expect(p("Barbecue Sauce", "2 Tablespoon")).toBe("2 tbsp");
    expect(p("Vegetable Stew", "3/4 cup")).toBe("¾ cup · mini bowl");
    expect(p("Vegetable Stew", "3/4 cup", 2)).toBe("1½ cups · bowl");
    expect(p("Sweet Chili Noodle Stir Fry", "1 cup")).toBe("1 cup · plate");
    expect(p("Chili", "1 each")).toBe("1 bowl");
    expect(p("Scrambled Eggs", "1/2 cup")).toBe("½ cup · plate");
    expect(p("Lemon Grilled Chicken Breast", "4 ozw")).toBe("4 oz · plate");
    expect(p("Chocolate Chips", "1 Ounce")).toBe("1 oz");
  });

  it("falls back to servings when the label has no amount", () => {
    expect(p("Tomato Basil Soup", null)).toBe("1 bowl");
    expect(p("Tomato Basil Soup", null, 2)).toBe("2 bowls");
    expect(p("Create Your Own Egg Scramble", null)).toBe("1 serving");
  });

  it("formats quantities as fractions", () => {
    expect([formatQty(0.5), formatQty(1.5), formatQty(0.75), formatQty(3), formatQty(1 / 3)]).toEqual(["½", "1½", "¾", "3", "⅓"]);
  });

  it("never shows 'each', 'cut', 'piece(s) of nothing' or NaN for any real menu item", () => {
    const labels = new Set<string>();
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const path = join(d, f);
        if (statSync(path).isDirectory()) walk(path);
        else if (f.endsWith(".json") && f !== "index.json") {
          for (const meal of JSON.parse(readFileSync(path, "utf-8")).meals ?? []) for (const it of meal.items ?? []) labels.add(portionLabel(it));
        }
      }
    };
    walk("public/menus");
    for (const l of labels) expect(l).not.toMatch(/\beach\b|\bcut\b|NaN|undefined|ozw/i);
  });
});
