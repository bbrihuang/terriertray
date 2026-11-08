import type { MealTargets } from "./planner";
import model from "./calorie-model.json";

export const ACTIVITIES = [
  { label: "Mostly seated", factor: 1.2 },
  { label: "Lightly active", factor: 1.375 },
  { label: "Moderately active", factor: 1.55 },
  { label: "Very active", factor: 1.725 },
  { label: "Extremely active", factor: 1.9 },
] as const;
export type CalculatorInput = { age: number; heightCm: number; weightKg: number; category: "female" | "male"; activity: number; goal: "lose" | "maintain" | "gain"; method: "standard" | "dataset" };
export type Estimate = { maintenanceKcal: number; targets: MealTargets; adjustmentPercent: number; method: string };

/** Local estimates only. Activity already contributes to maintenance; never add it twice. */
export function estimateTargets(input: CalculatorInput): Estimate {
  const { age, heightCm, weightKg, activity, category, method, goal } = input;
  for (const [label, value, min, max] of [["Age", age, 18, 78], ["Height", heightCm, 120, 230], ["Weight", weightKg, 35, 250]] as const) {
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} is outside this calculator's supported range (${min}–${max}). Use manual targets instead.`);
  }
  if (!Number.isInteger(age) || !Number.isInteger(activity) || activity < 0 || activity >= ACTIVITIES.length) throw new Error("Choose a whole-number age and a listed activity level.");
  if (!["female", "male"].includes(category) || !["standard", "dataset"].includes(method) || !["lose", "maintain", "gain"].includes(goal)) throw new Error("Choose a listed equation, calculation method and goal.");
  let maintenance: number;
  if (method === "dataset") {
    const ranges = model.ranges;
    if (age < ranges.age[0]! || age > ranges.age[1]! || heightCm < ranges.heightCm[0]! || heightCm > ranges.heightCm[1]! || weightKg < ranges.weightKg[0]! || weightKg > ranges.weightKg[1]!) throw new Error("Your measurements are outside the research dataset's range. Use the standard estimate or manual targets instead.");
    const c = model.coefficients;
    maintenance = c.intercept + c.age * age + c.heightCm * heightCm + c.weightKg * weightKg + c.activity * activity + (category === "male" ? c.male : 0);
  } else {
    const resting = 10 * weightKg + 6.25 * heightCm - 5 * age + (category === "male" ? 5 : -161);
    maintenance = resting * ACTIVITIES[activity]!.factor;
  }
  const adjustmentPercent = goal === "lose" ? -10 : goal === "gain" ? 10 : 0;
  const calories = Math.round(maintenance * (1 + adjustmentPercent / 100) / 10) * 10;
  if (calories < 1200 || calories > 6000) throw new Error("This result is outside the calculator's supported output range. Enter an individualized target manually. These bounds are product limits, not a guarantee of safety.");
  // Editable balanced starting template, not a personalized nutrient prescription.
  const proteinG = Math.round(calories * 0.2 / 4);
  const fatG = Math.round(calories * 0.3 / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  return { maintenanceKcal: Math.round(maintenance / 10) * 10, targets: { caloriesKcal: calories, proteinG, carbsG, fatG }, adjustmentPercent, method: method === "dataset" ? "Research dataset regression (experimental)" : "Mifflin–St Jeor resting estimate × activity factor" };
}

export const poundsToKg = (pounds: number) => pounds * 0.45359237;
export const inchesToCm = (inches: number) => inches * 2.54;
