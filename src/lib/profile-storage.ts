import { z } from "zod";
import { DEFAULT_RESTRICTIONS, type Restrictions } from "./restrictions";
import type { MealTargets } from "./planner";

/** Everything personal the app holds. It never leaves the browser. */
export type Profile = {
  restrictions: Restrictions;
  /** Daily targets the user typed in. */
  daily: MealTargets;
  mealsPerDay: number;
};

export const DEFAULT_PROFILE: Profile = {
  restrictions: DEFAULT_RESTRICTIONS,
  daily: { caloriesKcal: null, proteinG: null, carbsG: null, fatG: null },
  mealsPerDay: 3,
};

const target = z.number().finite().positive().max(20000).nullable();

const StoredProfile = z.object({
  version: z.literal(1),
  restrictions: z.object({
    allergyAnswer: z.enum(["unanswered", "none", "some"]),
    avoidAllergens: z.array(z.string().max(40)).max(40),
    requireTags: z.array(z.string().max(40)).max(20),
    strictUnknown: z.boolean(),
  }),
  daily: z.object({ caloriesKcal: target, proteinG: target, carbsG: target, fatG: target }),
  mealsPerDay: z.number().int().min(1).max(6),
});

/** The only app-owned key. Clearing it deletes everything saved. */
export const STORAGE_KEY = "terriertray.profile.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // blocked by browser settings
  }
}

/** Returns the saved profile, or null if none, corrupt, or storage is unavailable. */
export function loadProfile(store: StorageLike | null = storage()): Profile | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = StoredProfile.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      store.removeItem(STORAGE_KEY);
      return null;
    }
    const { version: _v, ...profile } = parsed.data;
    return profile;
  } catch {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      /* storage unusable */
    }
    return null;
  }
}

/** Saves only when called; the UI calls it only after the user opts in. */
export function saveProfile(profile: Profile, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...profile }));
    return true;
  } catch {
    return false; // quota or disabled
  }
}

export function clearProfile(store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
