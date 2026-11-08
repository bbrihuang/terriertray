export type MacroPreferences = {
  preset: "balanced" | "muscle";
  proteinPercent: number | null;
  fatPercent: number | null;
};

export const DEFAULT_MACRO_PREFERENCES: MacroPreferences = {
  preset: "balanced",
  proteinPercent: null,
  fatPercent: null,
};

export type MacroGrams = { proteinG: number; carbsG: number; fatG: number };

type MacroResult =
  | {
      ok: true;
      grams: MacroGrams;
      percent: { protein: number; carbs: number; fat: number };
      kcal: { protein: number; carbs: number; fat: number };
      proteinPerLb: number;
    }
  | { ok: false; message: string };

const KG_PER_POUND = 0.45359237;

/** Planning allocations only. This wrapper never changes or predicts calories. */
export function macroTargets(calories: number, weightKg: number, preferences: MacroPreferences): MacroResult {
  if (!Number.isFinite(calories) || calories <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
    return { ok: false, message: "Enter positive, finite calories and weight to calculate a macro split." };
  }
  if (!preferences || !["balanced", "muscle"].includes(preferences.preset)) {
    return { ok: false, message: "Choose a macro starting point." };
  }
  for (const share of [preferences.proteinPercent, preferences.fatPercent]) {
    if (share !== null && (!Number.isFinite(share) || share <= 0 || share >= 100)) {
      return { ok: false, message: "Protein and fat shares must each be greater than 0% and less than 100%." };
    }
  }

  const weightLb = weightKg / KG_PER_POUND;
  const usesWeightProtein = preferences.preset === "muscle" && preferences.proteinPercent === null;
  const protein = usesWeightProtein ? weightLb * 0.8 * 4 : calories * ((preferences.proteinPercent ?? 20) / 100);
  const fat = calories * ((preferences.fatPercent ?? 30) / 100);
  const carbs = calories - protein - fat;
  if (![protein, fat, carbs].every((value) => Number.isFinite(value) && value > 0)) {
    return {
      ok: false,
      message: usesWeightProtein
        ? "The weight-based protein starting point and fat share do not fit this calorie budget with room for carbs. Choose Balanced or revise the calorie budget."
        : "This split leaves no calories for carbs. Reduce protein or fat, or reset the split.",
    };
  }

  const proteinPercent = protein / calories * 100;
  const fatPercent = fat / calories * 100;
  return {
    ok: true,
    grams: { proteinG: protein / 4, carbsG: carbs / 4, fatG: fat / 9 },
    percent: { protein: proteinPercent, carbs: 100 - proteinPercent - fatPercent, fat: fatPercent },
    kcal: { protein, carbs, fat },
    proteinPerLb: protein / 4 / weightLb,
  };
}
