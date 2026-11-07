import type { MenuIndex } from "./schema";

export type AgeStatus = "fresh" | "stale" | "expired" | "invalid";

const TZ_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;
const SKEW_TOLERANCE_MS = 5 * 60_000;

/**
 * Browser copy of validate_freshness.check_dataset_freshness's age rules (fresh <= 24 h,
 * stale <= 48 h, expired beyond, invalid if missing, timezone-less or > 5 min in the future).
 * Kept in step by tests/fixtures/freshness-cases.json, which both test suites run.
 */
export function ageStatus(basisAt: string | null | undefined, now: Date, maxAgeHours = 24, expiryHours = 48): { status: AgeStatus; ageHours: number | null } {
  if (!basisAt || !TZ_SUFFIX.test(basisAt.trim())) return { status: "invalid", ageHours: null };
  const at = Date.parse(basisAt.trim());
  if (Number.isNaN(at)) return { status: "invalid", ageHours: null };
  const ms = now.getTime() - at;
  if (ms < -SKEW_TOLERANCE_MS) return { status: "invalid", ageHours: null };
  const ageHours = Math.round((Math.max(0, ms) / 3_600_000) * 1e6) / 1e6;
  return { status: ageHours <= maxAgeHours ? "fresh" : ageHours <= expiryHours ? "stale" : "expired", ageHours };
}

export type Eligibility = {
  canRecommend: boolean;
  status: AgeStatus | "missing_date" | "not_validated";
  ageHours: number | null;
  /** Short reason shown when suggestions are off. */
  message: string;
};

/**
 * May automatic suggestions use this hall and date right now? Browsing and manual
 * plates stay available either way. Passing is about data age and coverage only;
 * it says nothing about allergy safety.
 */
export function eligibility(index: MenuIndex, hallId: string, date: string, now: Date): Eligibility {
  const hall = index.halls.find((h) => h.id === hallId);
  const f = index.freshness;
  if (!hall || hall.source !== "bu-html" || !f) {
    return { canRecommend: false, status: "not_validated", ageHours: null, message: "This menu hasn't passed the freshness check, so suggestions are off." };
  }
  if (f.validatorStatus === "invalid" || f.validatorStatus === "expired" || f.validatorStatus === "stale") {
    return { canRecommend: false, status: f.validatorStatus === "invalid" ? "invalid" : f.validatorStatus, ageHours: null, message: "The latest menu check didn't pass, so suggestions are off." };
  }
  const { status, ageHours } = ageStatus(f.basisAt, now, f.maxAgeHours, f.expiryHours);
  if (status !== "fresh") {
    const age = ageHours === null ? "of unknown age" : `${Math.floor(ageHours)} hours old`;
    return { canRecommend: false, status, ageHours, message: `This menu data is ${age} (suggestions need data under ${f.maxAgeHours} hours old).` };
  }
  if (!f.availableDates.includes(date)) {
    return { canRecommend: false, status: "missing_date", ageHours, message: "Not every dining hall has posted this day, so suggestions are off for it." };
  }
  return { canRecommend: true, status: "fresh", ageHours, message: "" };
}
