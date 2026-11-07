export const TIMEZONE = "America/New_York";

/** YYYY-MM-DD in New York, whatever the device timezone. */
export function nyDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Minutes since midnight in New York. */
export function nyMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

const CLOCK = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;

/** "7:00 AM - 11:00 AM" -> [420, 660]; null if the text is not a simple range. */
export function parseHours(text: string | null): [number, number] | null {
  if (!text) return null;
  const times = [...text.matchAll(CLOCK)].map((m) => {
    const h = Number(m[1]) % 12;
    return (m[3]!.toUpperCase() === "PM" ? h + 12 : h) * 60 + Number(m[2]);
  });
  return times.length === 2 ? [times[0]!, times[1]!] : null;
}

/** "7:00 AM - 11:00 AM" -> "7–11 AM"; "11:00 AM - 5:00 PM" -> "11 AM–5 PM". Unparseable text is shown as published. */
export function formatHours(text: string | null): string | null {
  const range = parseHours(text);
  if (!range) return text;
  const part = (m: number) => {
    const h = Math.floor(m / 60) % 12 || 12;
    const min = m % 60;
    return { clock: min ? `${h}:${String(min).padStart(2, "0")}` : `${h}`, half: m < 720 ? "AM" : "PM" };
  };
  const [a, b] = [part(range[0]), part(range[1])];
  return a.half === b.half ? `${a.clock}–${b.clock} ${b.half}` : `${a.clock} ${a.half}–${b.clock} ${b.half}`;
}

/** Index of the meal being served now, else the next one today, else the last. */
export function pickMealIndex(meals: { hours: string | null }[], minutes: number): number {
  let next = -1;
  for (let i = 0; i < meals.length; i++) {
    const range = parseHours(meals[i]!.hours);
    if (!range) continue;
    if (minutes >= range[0] && minutes < range[1]) return i;
    if (next === -1 && minutes < range[0]) next = i;
  }
  return next !== -1 ? next : Math.max(0, meals.length - 1);
}

export function formatDate(iso: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Noon UTC avoids the date shifting in any display timezone.
  const date = new Date(Date.UTC(y!, m! - 1, d!, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  }).format(date);
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
