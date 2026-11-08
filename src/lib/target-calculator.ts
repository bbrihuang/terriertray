import model from "./calorie-model.json";

/**
 * Browser-local inference for the team's calorie regression
 * (research/scripts/dietary_database.py -> research/models/dietary_cal_model.joblib),
 * exported at full precision by scripts/export-calorie-model.py. The model predicts
 * daily calories only. No other equation, multiplier or macro template is used.
 */

/** Activity labels exactly as the dataset records them, encoded 0-4 like the training script. */
export const ACTIVITY_LEVELS = model.activityLevels;

/**
 * Gender categories offered. The dataset also records "Other"; the team chose not to apply
 * that category's coefficient, so it is explained in the UI rather than offered.
 */
export const GENDERS = ["Female", "Male"] as const;
export type Gender = (typeof GENDERS)[number];

export type ModelInput = { age: number; gender: Gender; heightCm: number; weightKg: number; activity: number };

export const RANGES = model.ranges;

/** Goal presets are explicit planning choices, not additional trained models. */
export const PLANNING_GOALS = [
  { adjustmentPercent: 0, label: "Maintaining — use model estimate" },
  { adjustmentPercent: -10, label: "Cutting — 10% below estimate" },
  { adjustmentPercent: 10, label: "Bulking — 10% above estimate" },
] as const;

/** Why an input can't be used, or null. Inputs outside the training data are never extrapolated. */
export function unsupportedReason(i: ModelInput): string | null {
  const within = (v: number, [lo, hi]: number[]) => Number.isFinite(v) && v >= lo! && v <= hi!;
  if (!Number.isInteger(i.age) || !within(i.age, RANGES.age)) return `Age must be a whole number from ${RANGES.age[0]} to ${RANGES.age[1]}, the ages in our dataset.`;
  if (!within(i.heightCm, RANGES.heightCm)) return `Height must be ${RANGES.heightCm[0]}–${RANGES.heightCm[1]} cm, the range in our dataset.`;
  if (!within(i.weightKg, RANGES.weightKg)) return `Weight must be ${RANGES.weightKg[0]}–${RANGES.weightKg[1]} kg, the range in our dataset.`;
  if (!Number.isInteger(i.activity) || i.activity < 0 || i.activity >= ACTIVITY_LEVELS.length) return "Choose one of the listed activity levels.";
  if (!GENDERS.includes(i.gender)) return "Choose one of the listed categories.";
  return null;
}

/** The model's prediction in kcal/day, unrounded. Throws on unsupported input. */
export function predictCalories(i: ModelInput): number {
  const reason = unsupportedReason(i);
  if (reason) throw new Error(reason);
  const raw = [i.age, i.heightCm, i.weightKg, i.activity];
  // StandardScaler, then one-hot Gender with the first category (Female) dropped.
  const scaled = raw.map((v, k) => (v - model.scalerMean[k]!) / model.scalerScale[k]!);
  const onehot = [i.gender === "Male" ? 1 : 0, 0 /* Gender_Other: not offered */];
  const kcal = [...scaled, ...onehot].reduce((sum, x, k) => sum + x * model.coefficients[k]!, model.intercept);
  const [lo, hi] = RANGES.kcal;
  if (kcal < lo! || kcal > hi!) throw new Error("This combination falls outside the calories seen in our dataset, so the model can't be used for it.");
  return kcal;
}

/** A user-chosen adjustment, kept separate from (and never folded into) the model's prediction. */
export function applyAdjustment(modelKcal: number, adjustmentPercent: number): number {
  return Math.round(modelKcal * (1 + adjustmentPercent / 100));
}

export type Goal = "maintain" | "cut" | "bulk";

/** Goals set only the direction of a user-entered kcal/day adjustment; none is a trained model. */
export const GOALS: readonly { value: Goal; label: string }[] = [
  { value: "maintain", label: "Maintaining" },
  { value: "cut", label: "Cutting" },
  { value: "bulk", label: "Bulking" },
];

/** Starting magnitude for Cutting/Bulking: the app's earlier 10% preset, now shown and editable in kcal. */
export const defaultAdjustmentKcal = (modelKcal: number) => Math.round(modelKcal * 0.1);

export type PlannedTarget = { estimate: number; adjustment: number; target: number } | { error: string };

/**
 * The one place a goal turns the model's prediction into a proposed target.
 * `amountText` is the nonnegative kcal/day magnitude as typed; the goal sets the sign.
 * Display values reconcile exactly: target = estimate + adjustment, all whole kcal.
 */
export function planTarget(modelKcal: number, goal: Goal, amountText: string): PlannedTarget {
  const estimate = Math.round(modelKcal);
  if (goal === "maintain") return { estimate, adjustment: 0, target: estimate };
  const text = amountText.trim();
  if (text === "") return { error: "Enter an adjustment in kcal per day." };
  const amount = Number(text);
  if (/^[-−]/.test(text) && Number.isFinite(amount)) return { error: "Enter the amount without a minus sign; the goal sets the direction." };
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(amount)) return { error: "Enter the adjustment as a whole number of kcal, such as 300." };
  const adjustment = goal === "cut" ? 0 - amount : amount; // 0 - 0 is +0, so "0" never shows as −0
  const target = estimate + adjustment;
  if (!Number.isSafeInteger(target) || target <= 0) return { error: "That adjustment would leave no calories. Enter a smaller amount." };
  return { estimate, adjustment, target };
}

// Same factors as research/scripts/conversions.py.
export const poundsToKg = (pounds: number) => pounds * 0.45359237;
export const feetAndInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;
