/**
 * Publish phone-sized public menu data from collector output.
 *
 *   tsx scripts/build-menus.ts --bu collector/data/processed/terrier_trays_menus_2026-11-07.json \
 *     [--fenway collector/data/processed/fenway_status.json] [--out public/menus] [--today 2026-11-07] \
 *     [--coverage docs/data-coverage.md]
 *
 * - Halls that refreshed successfully replace their previous dates.
 * - Halls that failed keep their previous files and original fetch time, marked stale.
 * - Everything is written to a staging directory, then swapped in, so readers never
 *   see a mix of old and new files. index.json carries a content-hash dataVersion.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { BU_HALLS, toDayMenus } from "../src/lib/adapter.ts";
import { DayMenu, Freshness, MenuIndex, ScraperEnvelope, type HallEntry } from "../src/lib/schema.ts";
import { nyDate } from "../src/lib/time.ts";
import { FenwayStatus, FENWAY } from "./sodexo.ts";

const KEEP_STALE_DAYS = 7;

export type BuildInput = {
  bu: ScraperEnvelope | null;
  fenway: FenwayStatus | null;
  /** freshness_gate.py result for this run's BU data; required for suggestions. */
  freshness?: Freshness | null;
  prior: { index: MenuIndex; readDay: (file: string) => DayMenu } | null;
  attemptedAt: string;
  today: string;
};

export type BuildOutput = { index: MenuIndex; files: Map<string, DayMenu> };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Pure merge step (tested); I/O lives in main(). */
export function buildMenus({ bu, fenway, freshness = null, prior, attemptedAt, today }: BuildInput): BuildOutput {
  const files = new Map<string, DayMenu>();
  const halls: HallEntry[] = [];
  const fresh = bu ? toDayMenus(bu) : [];

  for (const [name, { id, url }] of Object.entries(BU_HALLS)) {
    const published = bu?.dining_halls.includes(name) ?? false;
    const before = prior?.index.halls.find((h) => h.id === id);

    if (published) {
      const days = fresh.filter((d) => d.hallId === id);
      const fetchedAt = bu!.sources[name]?.fetched_at_utc ?? null;
      for (const day of days) files.set(`${id}/${day.date}.json`, day);
      halls.push({
        id,
        name,
        source: "bu-html",
        sourceUrl: url,
        status: "ok",
        lastAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: fetchedAt,
        note: fetchedAt ? null : "The fetch time was not recorded for this snapshot. Service dates come from the page itself.",
        dates: days.map((d) => ({
          date: d.date,
          file: `${id}/${d.date}.json`,
          itemCount: d.meals.reduce((n, m) => n + m.items.length, 0),
          meals: d.meals.map((m) => m.name),
        })),
      });
    } else if (before && before.dates.length > 0 && prior) {
      const cutoff = addDays(today, -KEEP_STALE_DAYS);
      const kept = before.dates.filter((d) => d.date >= cutoff);
      for (const d of kept) files.set(d.file, prior.readDay(d.file));
      halls.push({
        ...before,
        status: "stale_after_failure",
        lastAttemptAt: attemptedAt,
        note: "The latest refresh failed, so this is the previous snapshot.",
        dates: kept,
      });
    } else {
      halls.push({
        id,
        name,
        source: "bu-html",
        sourceUrl: url,
        status: "failed",
        lastAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: null,
        note: "No menu could be collected yet.",
        dates: [],
      });
    }
  }

  // Fenway: status only until an authenticated response's schema is verified (see scripts/sodexo.ts).
  const fenwayBefore = prior?.index.halls.find((h) => h.id === FENWAY.id);
  halls.push({
    id: FENWAY.id,
    name: FENWAY.name,
    source: "sodexo-api",
    sourceUrl: FENWAY.pageUrl,
    status: fenway?.status === "failed" ? "failed" : "not_configured",
    lastAttemptAt: fenway?.attemptedAt ?? fenwayBefore?.lastAttemptAt ?? null,
    lastSuccessfulFetchAt: null,
    note: fenway?.message ?? fenwayBefore?.note ?? "The Fenway menu feed is not connected yet.",
    dates: [],
  });

  const hash = createHash("sha256");
  for (const [file, day] of [...files].sort(([a], [b]) => a.localeCompare(b))) hash.update(file).update(JSON.stringify(day));
  hash.update(JSON.stringify(halls.map((h) => [h.id, h.status, h.lastSuccessfulFetchAt])));

  const index: MenuIndex = {
    schemaVersion: 1,
    dataVersion: hash.digest("hex").slice(0, 16),
    generatedAt: attemptedAt,
    timezone: "America/New_York",
    // User-facing wording of BU's warning (the scraper's notice also carries developer notes).
    allergyNotice:
      "BU Dining warns that ingredient substitutions, formulation changes and kitchen cross-contact can occur, and no menu item is guaranteed allergen-free. If you have a food allergy, talk with BU Dining staff before eating.",
    // New BU data must bring its own validation; without new data the previous result is kept and simply ages.
    freshness: bu ? freshness : (prior?.index.freshness ?? null),
    halls,
  };

  return { index: MenuIndex.parse(index), files };
}

function coverageReport(files: Map<string, DayMenu>, index: MenuIndex): string {
  const fields = [
    ["caloriesKcal", "Calories"],
    ["proteinG", "Protein"],
    ["carbsG", "Carbohydrate"],
    ["fatG", "Total fat"],
    ["fiberG", "Fiber"],
    ["sodiumMg", "Sodium"],
  ] as const;
  const dv = ["vitaminD", "potassium", "calcium", "iron"] as const;
  const lines = [
    "# Menu data coverage",
    "",
    `Generated ${index.generatedAt} from data version \`${index.dataVersion}\`. Counts are food occurrences (a dish served at two meals counts twice).`,
    "",
    "Micronutrients are published by BU only as % of the label Daily Value, so TerrierTray shows them as printed and does not score them against personal targets.",
    "",
    `| Hall | Items | ${fields.map(([, l]) => l).join(" | ")} | Allergens known | ${dv.map((d) => `${d} %DV`).join(" | ")} |`,
    `|---|---:|${fields.map(() => "---:").join("|")}|---:|${dv.map(() => "---:").join("|")}|`,
  ];
  for (const hall of index.halls) {
    const items = hall.dates.flatMap((d) => files.get(d.file)?.meals.flatMap((m) => m.items) ?? []);
    if (items.length === 0) {
      lines.push(`| ${hall.name} | 0 | ${fields.map(() => "–").join(" | ")} | – | ${dv.map(() => "–").join(" | ")} |`);
      continue;
    }
    const pct = (n: number) => `${((100 * n) / items.length).toFixed(1)}%`;
    lines.push(
      `| ${hall.name} | ${items.length} | ${fields.map(([k]) => pct(items.filter((i) => i[k] !== null).length)).join(" | ")} | ${pct(
        items.filter((i) => i.allergens !== null).length,
      )} | ${dv.map((k) => pct(items.filter((i) => i.labelDvPercent[k] !== null).length)).join(" | ")} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function main() {
  const { values } = parseArgs({
    options: {
      bu: { type: "string" },
      fenway: { type: "string" },
      freshness: { type: "string" },
      out: { type: "string", default: "public/menus" },
      today: { type: "string" },
      coverage: { type: "string" },
    },
  });
  const out = resolve(values.out!);
  const attemptedAt = new Date().toISOString();
  const today = z.iso.date().parse(values.today ?? nyDate());

  let bu: ScraperEnvelope | null = null;
  if (values.bu && existsSync(values.bu)) {
    bu = ScraperEnvelope.parse(readJson(values.bu));
  } else {
    console.warn(`No BU collector output${values.bu ? ` at ${values.bu}` : ""}; BU halls keep prior data.`);
  }

  const fenway = values.fenway && existsSync(values.fenway) ? FenwayStatus.parse(readJson(values.fenway)) : null;

  let prior: BuildInput["prior"] = null;
  const priorIndexPath = join(out, "index.json");
  if (existsSync(priorIndexPath)) {
    const parsed = MenuIndex.safeParse(readJson(priorIndexPath));
    if (parsed.success) {
      prior = { index: parsed.data, readDay: (file) => DayMenu.parse(readJson(join(out, file))) };
    } else {
      console.warn("Prior index.json is invalid; continuing without prior data.");
    }
  }

  const freshness = values.freshness && existsSync(values.freshness) ? Freshness.parse(readJson(values.freshness)) : null;
  const { index, files } = buildMenus({ bu, fenway, freshness, prior, attemptedAt, today });

  if (!bu && !prior) throw new Error("Nothing to publish: no collector output and no prior data.");

  const staging = `${out}.staging`;
  rmSync(staging, { recursive: true, force: true });
  for (const [file, day] of files) {
    const target = join(staging, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(DayMenu.parse(day)));
  }
  mkdirSync(staging, { recursive: true });
  writeFileSync(join(staging, "index.json"), JSON.stringify(index, null, 1));

  const old = `${out}.old`;
  rmSync(old, { recursive: true, force: true });
  try {
    if (existsSync(out)) renameSync(out, old);
    renameSync(staging, out);
  } catch (err) {
    // shortcut: Windows refuses to rename a directory a dev server or OneDrive is watching;
    // fall back to replacing files with index.json last. CI (Linux) takes the atomic path.
    if (!(err instanceof Error && "code" in err && (err.code === "EPERM" || err.code === "EBUSY"))) throw err;
    if (existsSync(old) && !existsSync(out)) renameSync(old, out);
    for (const entry of readdirSync(out)) if (entry !== "index.json") rmSync(join(out, entry), { recursive: true, force: true });
    for (const entry of readdirSync(staging)) if (entry !== "index.json") cpSync(join(staging, entry), join(out, entry), { recursive: true });
    cpSync(join(staging, "index.json"), join(out, "index.json"));
    rmSync(staging, { recursive: true, force: true });
  }
  rmSync(old, { recursive: true, force: true });

  if (values.coverage) writeFileSync(values.coverage, coverageReport(files, index));

  for (const h of index.halls) console.log(`${h.name}: ${h.status}, ${h.dates.length} dates`);
  console.log(`dataVersion ${index.dataVersion}, ${files.size} day files`);

  // Visible failure for CI when any BU hall did not refresh.
  if (index.halls.some((h) => h.source === "bu-html" && h.status !== "ok")) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main();
