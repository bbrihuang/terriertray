/**
 * Fenway (Sodexo) keyed menu API, collector side only.
 *
 * The request shape was supplied by the team; the response schema has NOT been
 * verified with an authenticated call. Until it is, this module fetches, classifies
 * the outcome and summarises the response shape (keys and types, no values) so the
 * mapping to MenuItem can be written from real data, not guesses.
 */
import { z } from "zod";

export const FENWAY = {
  id: "fenway",
  name: "The Fenway Dining Hall",
  pageUrl: "https://bufenway.sodexomyway.com/en-us/locations/the-fenway-dining-hall",
  // Path IDs as supplied; their meaning must be confirmed against returned location metadata.
  apiBase: "https://api-prd.sodexomyway.net/v0.2/data/menu/31992001/152621",
} as const;

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_DAYS_AWAY = 14;

export const FenwayStatus = z.object({
  status: z.enum(["not_configured", "failed", "awaiting_mapping"]),
  attemptedAt: z.string(),
  message: z.string(),
});
export type FenwayStatus = z.infer<typeof FenwayStatus>;

export type FetchOutcome =
  | { kind: "ok"; body: unknown; bytes: number }
  | { kind: "empty" } // valid response with no menu content: not posted or closed
  | { kind: "auth_failed"; status: number }
  | { kind: "unavailable"; status: number }
  | { kind: "rate_limited"; retryAfter: string | null }
  | { kind: "malformed"; detail: string }
  | { kind: "network"; detail: string };

/** Fixed host and path; only a validated, bounded date is interpolated. */
export function fenwayUrl(date: string, today: string): string {
  z.iso.date().parse(date);
  const days = Math.abs(Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000;
  if (days > MAX_DAYS_AWAY) throw new Error(`Date ${date} is more than ${MAX_DAYS_AWAY} days from ${today}`);
  const url = new URL(FENWAY.apiBase);
  url.searchParams.set("date", date);
  return url.toString();
}

const isEmpty = (v: unknown) =>
  v === null || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && v !== null && Object.keys(v).length === 0);

export async function fetchFenway(
  date: string,
  today: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchOutcome> {
  const url = fenwayUrl(date, today);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { "API-Key": apiKey, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Error text from fetch never includes request headers.
    return { kind: "network", detail: err instanceof Error ? err.name : "fetch failed" };
  }

  if (response.status === 401 || response.status === 403) return { kind: "auth_failed", status: response.status };
  if (response.status === 429) return { kind: "rate_limited", retryAfter: response.headers.get("Retry-After") };
  if (response.status === 404 || response.status >= 500) return { kind: "unavailable", status: response.status };
  if (response.status === 204) return { kind: "empty" };
  if (!response.ok) return { kind: "unavailable", status: response.status };

  const type = response.headers.get("Content-Type") ?? "";
  if (!type.includes("json")) return { kind: "malformed", detail: `unexpected content type ${type || "(none)"}` };

  const text = await response.text();
  if (text.length > MAX_BYTES) return { kind: "malformed", detail: "response too large" };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { kind: "malformed", detail: "invalid JSON" };
  }
  return isEmpty(body) ? { kind: "empty" } : { kind: "ok", body, bytes: text.length };
}

/** Keys and value types only, arrays collapsed to their first element. Safe to share. */
export function shapeSummary(value: unknown, depth = 0): unknown {
  if (depth > 8) return "…";
  if (Array.isArray(value)) return value.length === 0 ? [] : [shapeSummary(value[0], depth + 1), `(${value.length} items)`];
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shapeSummary(v, depth + 1)]));
  }
  return value === null ? "null" : typeof value;
}

export function describe(outcome: FetchOutcome): Omit<FenwayStatus, "attemptedAt"> {
  switch (outcome.kind) {
    case "ok":
      return { status: "awaiting_mapping", message: "The Fenway feed answered, but its menu format still has to be checked before dishes are shown." };
    case "empty":
      return { status: "awaiting_mapping", message: "The Fenway feed returned no menu for this date (closed or not posted)." };
    case "auth_failed":
      return { status: "failed", message: `The Fenway feed rejected the API key (HTTP ${outcome.status}).` };
    case "rate_limited":
      return { status: "failed", message: "The Fenway feed asked us to slow down; the next refresh will retry." };
    case "unavailable":
      return { status: "failed", message: `The Fenway feed was unavailable (HTTP ${outcome.status}).` };
    case "malformed":
      return { status: "failed", message: `The Fenway feed sent an unexpected response (${outcome.detail}).` };
    case "network":
      return { status: "failed", message: `The Fenway feed could not be reached (${outcome.detail}).` };
  }
}
