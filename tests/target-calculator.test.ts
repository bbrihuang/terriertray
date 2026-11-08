import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyAdjustment, defaultAdjustmentKcal, feetAndInchesToCm, planTarget, poundsToKg, predictCalories, RANGES, unsupportedReason, type ModelInput } from "../src/lib/target-calculator";
import { mealShare, planMeal } from "../src/lib/planner";
import { DEFAULT_RESTRICTIONS } from "../src/lib/restrictions";
import { DayMenu } from "../src/lib/schema";

type Case = { age: number; gender: string; heightCm: number; weightKg: number; activity: number; kcal: number };
// Written by scripts/export-calorie-model.py from the ORIGINAL sklearn pipeline's predict().
const parity: Case[] = JSON.parse(readFileSync("tests/fixtures/calorie-model-parity.json", "utf-8"));

describe("browser inference matches the team's trained pipeline", () => {
  it.each(parity.filter((c) => c.gender !== "Other"))("$age y, $gender, $heightCm cm, $weightKg kg, activity $activity", (c) => {
    const kcal = predictCalories({ age: c.age, gender: c.gender as ModelInput["gender"], heightCm: c.heightCm, weightKg: c.weightKg, activity: c.activity });
    expect(Math.abs(kcal - c.kcal)).toBeLessThan(1e-6);
  });

  it("matches the training script's own sample prediction", () => {
    expect(predictCalories({ age: 25, gender: "Male", heightCm: 175, weightKg: 70, activity: 2 })).toBeCloseTo(2717.80, 2);
  });
});

describe("input encoding and supported range", () => {
  const base: ModelInput = { age: 25, gender: "Male", heightCm: 175, weightKg: 70, activity: 2 };

  it("encodes Female as the dropped baseline and activity as 0-4", () => {
    const male = predictCalories(base);
    const female = predictCalories({ ...base, gender: "Female" });
    expect(male - female).toBeGreaterThan(0); // Gender_Male coefficient applies only to Male
    const steps = [0, 1, 2, 3, 4].map((activity) => predictCalories({ ...base, activity }));
    const diffs = steps.slice(1).map((v, i) => v - steps[i]!);
    for (const d of diffs) expect(d).toBeCloseTo(diffs[0]!, 9); // one linear term per level
  });

  it("refuses to extrapolate and explains why", () => {
    for (const patch of [{ age: RANGES.age[0]! - 1 }, { age: 30.5 }, { heightCm: RANGES.heightCm[1]! + 0.1 }, { weightKg: RANGES.weightKg[0]! - 0.1 }, { activity: 5 }, { activity: 1.5 }, { weightKg: NaN }]) {
      expect(unsupportedReason({ ...base, ...patch })).toBeTruthy();
      expect(() => predictCalories({ ...base, ...patch })).toThrow();
    }
    expect(() => predictCalories({ ...base, gender: "Other" as never })).toThrow();
  });

  it("accepts the exact range boundaries", () => {
    expect(unsupportedReason({ ...base, age: RANGES.age[0]!, heightCm: RANGES.heightCm[0]!, weightKg: RANGES.weightKg[1]! })).toBeNull();
  });

  it("converts units with the team's research factors", () => {
    expect(poundsToKg(154.3235835)).toBeCloseTo(70, 6);
    expect(feetAndInchesToCm(5, 9)).toBeCloseTo(175.26, 6);
  });

  it("keeps a user-chosen adjustment separate from the model's output", () => {
    const kcal = predictCalories(base);
    expect(applyAdjustment(kcal, 0)).toBe(Math.round(kcal));
    expect(applyAdjustment(kcal, -10)).toBe(Math.round(kcal * 0.9));
    expect(predictCalories(base)).toBe(kcal); // prediction unchanged by adjustments
  });
});

describe("planTarget: goal direction and editable kcal adjustment", () => {
  const kcal = predictCalories({ age: 25, gender: "Male", heightCm: 175, weightKg: 70, activity: 2 });

  it("maintaining uses zero regardless of any typed amount", () => {
    expect(planTarget(kcal, "maintain", "400")).toEqual({ estimate: 2718, adjustment: 0, target: 2718 });
    expect(planTarget(kcal, "maintain", "garbage")).toEqual({ estimate: 2718, adjustment: 0, target: 2718 });
  });

  it("cutting subtracts and bulking adds the entered magnitude, reconciling with the rounded estimate", () => {
    expect(planTarget(kcal, "cut", "400")).toEqual({ estimate: 2718, adjustment: -400, target: 2318 });
    expect(planTarget(kcal, "bulk", " 400 ")).toEqual({ estimate: 2718, adjustment: 400, target: 3118 });
    expect(planTarget(kcal, "cut", "0")).toEqual({ estimate: 2718, adjustment: 0, target: 2718 });
  });

  it("the default magnitude reproduces the earlier 10% presets", () => {
    const d = String(defaultAdjustmentKcal(kcal));
    expect(d).toBe("272");
    expect(planTarget(kcal, "cut", d)).toMatchObject({ target: 2446 });
    expect(planTarget(kcal, "bulk", d)).toMatchObject({ target: 2990 });
  });

  it("rejects blank, negative, fractional, nonfinite and non-numeric amounts, and nonpositive targets", () => {
    for (const bad of ["", "  ", "-100", "−100", "12.5", "1e3", "Infinity", "NaN", "abc", "100kcal", "99999999999999999999"]) {
      expect(planTarget(kcal, "cut", bad)).toHaveProperty("error");
      expect(planTarget(kcal, "bulk", bad)).toHaveProperty("error");
    }
    expect(planTarget(kcal, "cut", "-100")).toEqual({ error: expect.stringContaining("minus sign") });
    expect(planTarget(kcal, "cut", "2718")).toHaveProperty("error");
    expect(planTarget(kcal, "cut", "2717")).toMatchObject({ target: 1 });
    expect(predictCalories({ age: 25, gender: "Male", heightCm: 175, weightKg: 70, activity: 2 })).toBe(kcal); // inference untouched
  });
});

describe("applied targets drive the planner", () => {
  const day = DayMenu.parse(JSON.parse(readFileSync("tests/fixtures/warren-2026-11-07.day.json", "utf-8")));
  const dinner = day.meals.find((m) => m.name === "Dinner")!.items;
  const restrictions = { ...DEFAULT_RESTRICTIONS, allergyAnswer: "none" as const };

  it("a model-derived daily calorie target produces a meal plan near its share", () => {
    const daily = { caloriesKcal: applyAdjustment(predictCalories({ age: 25, gender: "Female", heightCm: 165, weightKg: 60, activity: 1 }), 0), proteinG: null, carbsG: null, fatG: null };
    const share = mealShare(daily, 3);
    const result = planMeal(dinner, share, restrictions);
    if (result.kind !== "ok") throw new Error("expected options");
    const kcal = result.options[0]!.entries.reduce((n, e) => n + e.item.caloriesKcal! * e.servings, 0);
    expect(Math.abs(kcal - share.caloriesKcal!) / share.caloriesKcal!).toBeLessThan(0.2);
  });
});
