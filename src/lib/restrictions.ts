import type { MenuItem } from "./schema";

/** Allergen labels exactly as BU publishes them. */
export const ALLERGENS = ["Milk", "Egg", "Wheat", "Soy", "Sesame", "Fish", "Shellfish", "Peanuts", "Tree Nuts"] as const;
/** Source-reported diet labels a user can require. ("Coolfood" is a climate label, not a restriction.) */
export const DIET_TAGS = ["Vegetarian", "Vegan", "Halal", "Gluten Free"] as const;

export type Restrictions = {
  /** "unanswered" until the user says whether they have allergens to avoid. Never assumed "none". */
  allergyAnswer: "unanswered" | "none" | "some";
  avoidAllergens: string[];
  requireTags: string[];
  /** Exclude dishes whose allergen information is missing or unclear. */
  strictUnknown: boolean;
};

export const DEFAULT_RESTRICTIONS: Restrictions = {
  allergyAnswer: "unanswered",
  avoidAllergens: [],
  requireTags: [],
  strictUnknown: true,
};

// Extra flags from ingredient text. These can only add a conflict, never clear one.
const INGREDIENT_HINTS: Record<string, RegExp> = {
  Milk: /\b(milk|cheese|butter|cream|whey|casein|yogurt|ghee|lactose)\b/i,
  Egg: /\b(eggs?|mayonnaise|albumin)\b/i,
  Wheat: /\b(wheat|flour|semolina|durum|farina)\b/i,
  Soy: /\b(soy\w*|tofu|edamame|tempeh|miso)\b/i,
  Sesame: /\b(sesame|tahini)\b/i,
  Fish: /\b(fish|salmon|tuna|cod|pollock|tilapia|haddock|anchov\w*)\b/i,
  Shellfish: /\b(shrimp|crab|lobster|clams?|mussels?|oysters?|scallops?)\b/i,
  Peanuts: /\bpeanuts?\b/i,
  "Tree Nuts": /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamia)\b/i,
};

/** True once the user has said "no allergens" or ticked at least one to avoid. */
export const allergyAnswered = (r: Restrictions) => r.allergyAnswer === "none" || (r.allergyAnswer === "some" && r.avoidAllergens.length > 0);

export type AllergenFinding = "contains" | "unknown" | "none_reported" | "not_checked";

export type Verdict = {
  /** Whether this dish may be added or recommended under the current restrictions. */
  allowed: boolean;
  allergen: AllergenFinding;
  reasons: string[];
};

/**
 * The one restriction gate used by the menu, manual add, swaps and the planner.
 * Best-effort against source-reported data; it does not certify anything.
 */
export function checkRestrictions(item: MenuItem, r: Restrictions): Verdict {
  const reasons: string[] = [];
  let allowed = true;
  let allergen: AllergenFinding = "not_checked";

  if (r.allergyAnswer === "some" && r.avoidAllergens.length > 0) {
    const listed = (item.allergens ?? []).filter((a) => r.avoidAllergens.includes(a));
    const hinted = r.avoidAllergens.flatMap((a) => {
      if (listed.includes(a) || !item.ingredients) return [];
      const match = INGREDIENT_HINTS[a]?.exec(item.ingredients);
      return match ? [`Ingredients mention “${match[0].toLowerCase()}” (${a})`] : [];
    });

    if (listed.length > 0 || hinted.length > 0) {
      allergen = "contains";
      allowed = false;
      if (listed.length > 0) reasons.push(`Contains ${listed.join(", ")} (source label)`);
      reasons.push(...hinted);
    } else if (item.allergens === null) {
      allergen = "unknown";
      if (r.strictUnknown) {
        allowed = false;
        reasons.push("Allergen information unavailable");
      }
    } else {
      allergen = "none_reported";
    }
  } else if (r.allergyAnswer === "none") {
    allergen = "none_reported";
  } else {
    // Unanswered (or "yes" with nothing ticked) is not "no allergies": nothing passes until answered.
    allowed = false;
    reasons.push(r.allergyAnswer === "some" ? "Choose which allergens to avoid in Settings" : "Answer the allergy question in Settings first");
  }

  for (const tag of r.requireTags) {
    if (!item.dietTags.includes(tag)) {
      allowed = false;
      reasons.push(`Not labeled ${tag} by the source`);
    }
  }

  return { allowed, allergen, reasons };
}

export function allergenHeadline(v: Verdict, r: Restrictions): string {
  switch (v.allergen) {
    case "contains":
      return "Contains a selected allergen";
    case "unknown":
      return "Allergen information unavailable";
    case "none_reported":
      return r.allergyAnswer === "none" ? "No allergens selected" : "No selected allergens reported";
    case "not_checked":
      return "Allergies not set";
  }
}
