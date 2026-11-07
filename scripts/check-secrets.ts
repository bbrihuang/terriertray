/**
 * Fail the build if the browser bundle or public data could leak secrets or research files.
 * Prints only file names and rule names, never matched content.
 *
 *   tsx scripts/check-secrets.ts [dist]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] ?? "dist";
const key = process.env.SODEXO_API_KEY?.trim();

const forbiddenFiles = [/\.env/i, /\.csv$/i, /\.joblib$/i, /\.py$/i, /\.html?$/i];
const rules: [string, (text: string) => boolean][] = [
  ["collector env var name", (t) => t.includes("SODEXO_API_KEY")],
  ["API-Key request header", (t) => /API-Key/.test(t)],
  ["Sodexo API host (browser must not call it)", (t) => t.includes("api-prd.sodexomyway.net")],
];
if (key && key.length >= 8) rules.push(["the configured SODEXO_API_KEY value", (t) => t.includes(key)]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const problems: string[] = [];
for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel !== "index.html" && forbiddenFiles.some((r) => r.test(rel))) problems.push(`${rel}: file type must not be published`);
  if (/\.(woff2?|png|ico)$/i.test(rel)) continue;
  const text = readFileSync(file, "utf-8");
  for (const [name, test] of rules) if (test(text)) problems.push(`${rel}: contains ${name}`);
}

if (problems.length) {
  console.error(`Secret/leak check failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Secret/leak check passed for ${root}${key ? " (including the configured key value)" : ""}.`);
