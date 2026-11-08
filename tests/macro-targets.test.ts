import { describe, expect, it } from "vitest";
import { DEFAULT_MACRO_PREFERENCES, macroTargets, type MacroPreferences } from "../src/lib/macro-targets";

describe("macro allocation around the calorie budget", () => {
  it("allocates the balanced starting split using 4/4/9 without rounding grams", () => {
    const result = macroTargets(2400, 70, DEFAULT_MACRO_PREFERENCES);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.percent).toEqual({ protein: 20, carbs: 50, fat: 30 });
    expect(result.kcal).toEqual({ protein: 480, carbs: 1200, fat: 720 });
    expect(result.grams).toEqual({ proteinG: 120, carbsG: 300, fatG: 80 });
    expect(result.proteinPerLb).toBeCloseTo(0.77758692, 7);
  });

  it("uses 0.8 grams per pound for the muscle starting point and leaves the remainder to carbs", () => {
    const result = macroTargets(2400, 90.718474, { preset: "muscle", proteinPercent: null, fatPercent: null });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.grams.proteinG).toBeCloseTo(160, 10);
    expect(result.grams.fatG).toBe(80);
    expect(result.grams.carbsG).toBeCloseTo(260, 10);
    expect(result.proteinPerLb).toBeCloseTo(0.8, 12);
  });

  it("keeps custom shares across budgets and uses the exact remaining energy", () => {
    const custom: MacroPreferences = { preset: "muscle", proteinPercent: 26.5, fatPercent: 28.5 };
    for (const calories of [1739, 2718, 3199.25]) {
      const result = macroTargets(calories, 80, custom);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.percent.protein).toBeCloseTo(26.5, 10);
      expect(result.percent.fat).toBeCloseTo(28.5, 10);
      expect(result.percent.carbs).toBeCloseTo(45, 10);
      const { proteinG, carbsG, fatG } = result.grams;
      expect(4 * proteinG + 4 * carbsG + 9 * fatG).toBeCloseTo(calories, 10);
      expect(result.kcal.protein + result.kcal.carbs + result.kcal.fat).toBeCloseTo(calories, 10);
    }
    const fractional = macroTargets(1739, 80, custom);
    if (!fractional.ok) throw new Error(fractional.message);
    expect(fractional.grams.proteinG).toBeCloseTo(115.20875, 10);
  });

  it("allows a custom fat share with the weight-based protein starting point", () => {
    const result = macroTargets(2400, 90.718474, { preset: "muscle", proteinPercent: null, fatPercent: 25 });
    if (!result.ok) throw new Error(result.message);
    expect(result.grams.proteinG).toBeCloseTo(160, 10);
    expect(result.kcal.fat).toBe(600);
    expect(result.kcal.carbs).toBeCloseTo(1160, 10);
  });

  it("rejects a muscle starting point that cannot fit rather than trimming protein", () => {
    const result = macroTargets(800, 90.718474, { preset: "muscle", proteinPercent: null, fatPercent: null });
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/protein.*fit|fit.*protein/i) });
    expect(macroTargets(800, 90.718474, DEFAULT_MACRO_PREFERENCES).ok).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])("rejects nonpositive or nonfinite calories or weight: %s", (bad) => {
    expect(macroTargets(bad, 70, DEFAULT_MACRO_PREFERENCES).ok).toBe(false);
    expect(macroTargets(2400, bad, DEFAULT_MACRO_PREFERENCES).ok).toBe(false);
  });

  it.each([
    { preset: "unsupported", proteinPercent: null, fatPercent: null },
    { preset: "balanced", proteinPercent: NaN, fatPercent: 30 },
    { preset: "balanced", proteinPercent: 20, fatPercent: Infinity },
    { preset: "balanced", proteinPercent: 0, fatPercent: 30 },
    { preset: "balanced", proteinPercent: 20, fatPercent: -5 },
    { preset: "balanced", proteinPercent: 70, fatPercent: 30 },
    { preset: "balanced", proteinPercent: 70, fatPercent: 40 },
  ])("rejects invalid preferences or a nonpositive carb remainder: %o", (preferences) => {
    expect(macroTargets(2400, 70, preferences as MacroPreferences).ok).toBe(false);
  });
});
