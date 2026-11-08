import { describe, expect, it } from "vitest";
import { estimateTargets, poundsToKg, inchesToCm, type CalculatorInput } from "../src/lib/target-calculator";
import model from "../src/lib/calorie-model.json";

const base: CalculatorInput = { age: 25, heightCm: 175, weightKg: 70, category: "male", activity: 2, goal: "maintain", method: "standard" };
describe("local target calculator", () => {
  it("matches the standard equation and produces energy-consistent macros", () => {
    const r = estimateTargets(base);
    expect(r.maintenanceKcal).toBe(2590);
    expect(Math.abs(r.targets.proteinG! * 4 + r.targets.carbsG! * 4 + r.targets.fatG! * 9 - r.targets.caloriesKcal!)).toBeLessThanOrEqual(2);
  });
  it("uses the actual exported dataset coefficients without applying activity twice", () => {
    const r = estimateTargets({ ...base, method: "dataset" });
    const c = model.coefficients;
    const expected = c.intercept + c.age * 25 + c.heightCm * 175 + c.weightKg * 70 + c.activity * 2 + c.male;
    expect(r.maintenanceKcal).toBe(Math.round(expected / 10) * 10);
    const female = estimateTargets({ ...base, method: "dataset", category: "female" });
    expect(female.maintenanceKcal).toBe(Math.round((expected - c.male) / 10) * 10);
  });
  it("changes goal targets without changing maintenance", () => {
    const maintain = estimateTargets(base), loss = estimateTargets({ ...base, goal: "lose" }), gain = estimateTargets({ ...base, goal: "gain" });
    expect(loss.maintenanceKcal).toBe(maintain.maintenanceKcal);
    expect(loss.targets.caloriesKcal!).toBeLessThan(maintain.targets.caloriesKcal!);
    expect(gain.targets.caloriesKcal!).toBeGreaterThan(maintain.targets.caloriesKcal!);
  });
  it("normalizes imperial measurements", () => {
    expect(inchesToCm(70)).toBeCloseTo(177.8);
    expect(poundsToKg(154.3235835)).toBeCloseTo(70);
  });
  it("rejects invalid, unsupported and extrapolated inputs", () => {
    for (const patch of [{ age: 17 }, { age: 22.5 }, { weightKg: NaN }, { heightCm: Infinity }, { activity: 5 }, { activity: 1.5 }]) expect(() => estimateTargets({ ...base, ...patch })).toThrow();
    expect(() => estimateTargets({ ...base, method: "dataset", heightCm: 229 })).toThrow();
  });
});
