import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ageStatus, eligibility } from "../src/lib/freshness";
import type { MenuIndex } from "../src/lib/schema";

type Case = { name: string; basisAt: string | null; now: string; status: string; ageHours: number | null };
const cases: Case[] = JSON.parse(readFileSync("tests/fixtures/freshness-cases.json", "utf-8"));

describe("freshness parity with the upstream validator", () => {
  // collector/tests/test_freshness_gate.py runs this same table against validate_freshness.py.
  it.each(cases)("$name", (c) => {
    const result = ageStatus(c.basisAt, new Date(c.now));
    expect(result.status).toBe(c.status);
    if (c.ageHours === null) expect(result.ageHours).toBeNull();
    else expect(result.ageHours).toBeCloseTo(c.ageHours, 5);
  });
});

const index = (over: Partial<NonNullable<MenuIndex["freshness"]>> | null): MenuIndex => ({
  schemaVersion: 1,
  dataVersion: "x",
  generatedAt: "2026-11-07T22:30:00Z",
  timezone: "America/New_York",
  allergyNotice: "",
  freshness:
    over === null
      ? null
      : {
          basis: "oldest_hall_fetch",
          basisAt: "2026-11-07T22:28:07Z",
          checkedAt: "2026-11-07T22:30:00Z",
          validatorStatus: "fresh",
          maxAgeHours: 24,
          expiryHours: 48,
          requestedDates: ["2026-11-07", "2026-11-08"],
          availableDates: ["2026-11-07"],
          missingDates: [],
          warnings: [],
          errors: [],
          ...over,
        },
  halls: [
    { id: "warren", name: "Warren Towers", source: "bu-html", sourceUrl: "https://www.bu.edu/dining/location/warren/", status: "ok", lastAttemptAt: null, lastSuccessfulFetchAt: null, note: null, dates: [] },
    { id: "fenway", name: "The Fenway Dining Hall", source: "sodexo-api", sourceUrl: "https://bufenway.sodexomyway.com/", status: "not_configured", lastAttemptAt: null, lastSuccessfulFetchAt: null, note: null, dates: [] },
  ],
});

describe("recommendation eligibility", () => {
  const soon = new Date("2026-11-08T05:00:00Z");

  it("allows a covered date while the data is fresh", () => {
    expect(eligibility(index({}), "warren", "2026-11-07", soon)).toMatchObject({ canRecommend: true, status: "fresh" });
  });

  it("re-ages in an open tab: the same index becomes stale a day later", () => {
    expect(eligibility(index({}), "warren", "2026-11-07", new Date("2026-11-08T23:00:00Z"))).toMatchObject({ canRecommend: false, status: "stale" });
  });

  it("blocks dates the validator did not cover for all three halls", () => {
    expect(eligibility(index({}), "warren", "2026-11-08", soon)).toMatchObject({ canRecommend: false, status: "missing_date" });
  });

  it("fails closed without a validation result, on a failed check, or for halls it doesn't cover", () => {
    expect(eligibility(index(null), "warren", "2026-11-07", soon).canRecommend).toBe(false);
    expect(eligibility(index({ validatorStatus: "invalid" }), "warren", "2026-11-07", soon).canRecommend).toBe(false);
    expect(eligibility(index({ basisAt: null }), "warren", "2026-11-07", soon).status).toBe("invalid");
    expect(eligibility(index({}), "fenway", "2026-11-07", soon).status).toBe("not_validated");
  });
});
