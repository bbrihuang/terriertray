import { describe, expect, it } from "vitest";
import { clearProfile, DEFAULT_PROFILE, loadProfile, saveProfile, STORAGE_KEY } from "../src/lib/profile-storage";
import { nyDate, parseHours, pickMealIndex } from "../src/lib/time";
import { describe as describeOutcome, fenwayUrl, fetchFenway, shapeSummary } from "../scripts/sodexo";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe("profile storage", () => {
  it("round-trips a valid profile", () => {
    const s = new MemoryStorage();
    const profile = { ...DEFAULT_PROFILE, daily: { caloriesKcal: 2200, proteinG: 120, carbsG: null, fatG: null } };
    expect(saveProfile(profile, s)).toBe(true);
    expect(loadProfile(s)).toEqual(profile);
  });

  it("round-trips the maximum daily calories and decimal macro targets", () => {
    const s = new MemoryStorage();
    const profile = { ...DEFAULT_PROFILE, daily: { caloriesKcal: 20000, proteinG: 135.9, carbsG: 339.8, fatG: 90.6 } };
    expect(saveProfile(profile, s)).toBe(true);
    expect(loadProfile(s)).toEqual(profile);
  });

  it.each([20001, 0, -1, NaN, Infinity])("rejects an invalid daily target without replacing saved allergy settings: %s", (caloriesKcal) => {
    const s = new MemoryStorage();
    const profile = {
      ...DEFAULT_PROFILE,
      restrictions: { ...DEFAULT_PROFILE.restrictions, allergyAnswer: "some" as const, avoidAllergens: ["Milk"] },
      daily: { caloriesKcal: 2200, proteinG: 120.5, carbsG: null, fatG: null },
    };
    saveProfile(profile, s);
    const prior = s.getItem(STORAGE_KEY);
    expect(saveProfile({ ...profile, daily: { ...profile.daily, caloriesKcal } }, s)).toBe(false);
    expect(s.getItem(STORAGE_KEY)).toBe(prior);
    expect(loadProfile(s)).toEqual(profile);
  });

  it("discards corrupt or tampered data instead of crashing", () => {
    const s = new MemoryStorage();
    s.setItem(STORAGE_KEY, "{not json");
    expect(loadProfile(s)).toBeNull();
    expect(s.getItem(STORAGE_KEY)).toBeNull();
    s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, restrictions: { allergyAnswer: "none" }, daily: {}, mealsPerDay: 99 }));
    expect(loadProfile(s)).toBeNull();
  });

  it("survives storage that throws (disabled or private mode)", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(loadProfile(broken)).toBeNull();
    expect(saveProfile(DEFAULT_PROFILE, broken)).toBe(false);
    expect(clearProfile(broken)).toBe(false);
    expect(loadProfile(null)).toBeNull();
  });

  it("delete removes the app-owned key", () => {
    const s = new MemoryStorage();
    saveProfile(DEFAULT_PROFILE, s);
    expect(clearProfile(s)).toBe(true);
    expect(s.data.size).toBe(0);
  });
});

describe("New York time", () => {
  it("uses the New York date, not UTC, near midnight", () => {
    expect(nyDate(new Date("2026-11-08T03:30:00Z"))).toBe("2026-11-07");
    expect(nyDate(new Date("2026-11-08T05:30:00Z"))).toBe("2026-11-08");
  });

  it("parses published hour ranges and picks the current or next meal", () => {
    expect(parseHours("7:00 AM - 11:00 AM")).toEqual([420, 660]);
    expect(parseHours("12:00 PM - 4:00 PM")).toEqual([720, 960]);
    expect(parseHours("Closed")).toBeNull();
    const meals = [{ hours: "10:00 AM - 4:00 PM" }, { hours: "4:00 PM - 9:00 PM" }];
    expect(pickMealIndex(meals, 9 * 60)).toBe(0); // before brunch: next is brunch
    expect(pickMealIndex(meals, 17 * 60)).toBe(1);
    expect(pickMealIndex(meals, 23 * 60)).toBe(1); // after close: last meal
  });
});

describe("Fenway Sodexo client", () => {
  const KEY = "test-key-not-real-123";
  const respond = (status: number, body: string, type = "application/json") =>
    (async () => new Response(body, { status, headers: { "Content-Type": type } })) as unknown as typeof fetch;

  it("only builds URLs for the fixed host with a bounded date", () => {
    expect(fenwayUrl("2026-11-09", "2026-11-07")).toBe("https://api-prd.sodexomyway.net/v0.2/data/menu/31992001/152621?date=2026-11-09");
    expect(() => fenwayUrl("2026-12-30", "2026-11-07")).toThrow();
    expect(() => fenwayUrl("2026-11-07&x=1", "2026-11-07")).toThrow();
  });

  it("classifies auth, unavailable, empty, malformed and ok responses", async () => {
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(401, ""))).kind).toBe("auth_failed");
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(404, ""))).kind).toBe("unavailable");
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(200, "[]"))).kind).toBe("empty");
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(200, "<html>", "text/html"))).kind).toBe("malformed");
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(200, "{bad"))).kind).toBe("malformed");
    expect((await fetchFenway("2026-11-07", "2026-11-07", KEY, respond(200, '[{"name":"Lunch"}]'))).kind).toBe("ok");
  });

  it("sends the key only as a header and never echoes it", async () => {
    let seen: RequestInit | undefined;
    let seenUrl = "";
    const spy = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seen = init;
      return new Response("", { status: 403 });
    }) as unknown as typeof fetch;
    const outcome = await fetchFenway("2026-11-07", "2026-11-07", KEY, spy);
    expect((seen?.headers as Record<string, string>)["API-Key"]).toBe(KEY);
    expect(seenUrl).not.toContain(KEY);
    expect(JSON.stringify(describeOutcome(outcome))).not.toContain(KEY);
  });

  it("shape summaries contain keys and types, not values", () => {
    const summary = JSON.stringify(shapeSummary([{ name: "Secret Lunch", calories: 420, items: [{ id: "abc" }] }]));
    expect(summary).not.toContain("Secret Lunch");
    expect(summary).not.toContain("420");
    expect(summary).toContain('"calories":"number"');
  });
});

describe("hours display", async () => {
  const { formatHours } = await import("../src/lib/time");
  it("shortens published ranges without changing them", () => {
    expect(formatHours("7:00 AM - 11:00 AM")).toBe("7–11 AM");
    expect(formatHours("11:00 AM - 5:00 PM")).toBe("11 AM–5 PM");
    expect(formatHours("4:30 PM - 9:00 PM")).toBe("4:30–9 PM");
    expect(formatHours("Closed today")).toBe("Closed today");
  });
});
