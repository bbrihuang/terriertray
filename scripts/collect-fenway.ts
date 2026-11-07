/**
 * Check the Fenway Sodexo feed and write a status file for build-menus.
 *
 *   SODEXO_API_KEY=... tsx scripts/collect-fenway.ts [--date YYYY-MM-DD] [--out collector/data/processed/fenway_status.json] [--inspect]
 *
 * --inspect also writes collector/data/raw/fenway_<date>.shape.json: keys and types
 * only, no values, so the response format can be mapped without exposing data or the key.
 * The key is read from the environment only and is never printed or written.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { nyDate } from "../src/lib/time.ts";
import { describe, fetchFenway, shapeSummary, type FenwayStatus } from "./sodexo.ts";

const { values } = parseArgs({
  options: {
    date: { type: "string" },
    out: { type: "string", default: "collector/data/processed/fenway_status.json" },
    inspect: { type: "boolean", default: false },
  },
});

const today = nyDate();
const date = values.date ?? today;
const attemptedAt = new Date().toISOString();
const key = process.env.SODEXO_API_KEY?.trim();

let status: FenwayStatus;

if (!key) {
  status = { status: "not_configured", attemptedAt, message: "The Fenway menu feed is not connected yet (no API key configured for the collector)." };
} else {
  const outcome = await fetchFenway(date, today, key);
  status = { ...describe(outcome), attemptedAt };
  console.log(`Fenway ${date}: ${outcome.kind}`);
  if (outcome.kind === "ok" && values.inspect) {
    const shapePath = `collector/data/raw/fenway_${date}.shape.json`;
    mkdirSync(dirname(shapePath), { recursive: true });
    writeFileSync(shapePath, JSON.stringify(shapeSummary(outcome.body), null, 2));
    console.log(`Wrote response shape (no values) to ${shapePath}`);
  }
}

mkdirSync(dirname(values.out!), { recursive: true });
writeFileSync(values.out!, JSON.stringify(status, null, 2));
console.log(`Fenway status: ${status.status} — ${status.message}`);
