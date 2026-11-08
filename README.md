# TerrierTray

Plan practical portions from Boston University dining-hall menus. Pick a hall and meal, enter your own daily targets and allergens, and TerrierTray suggests plates built from that meal's real dishes, in whole dining-hall servings, with every number traceable to the official label.

Unofficial student project for Hackcessability (Information Access track). Not affiliated with Boston University.

## What works

| Feature | Status |
| --- | --- |
| West, Warren, Marciano menus (7 days, ~2,400 dish occurrences) | Collected from bu.edu by the teammate scraper in `collector/` |
| Manual meal builder | Whole-serving amounts, totals vs your meal target, incomplete totals shown as "at least X, known for N of M dishes" |
| Local suggestions | Deterministic search over 2–3-dish plates, up to 3 distinct options, "Not this" swaps, "Why this plan?". Off until the allergy question is answered and while menu data fails the freshness check |
| Week view | Seven calendar days for one hall from the selected date, using the same planner, gate and per-day freshness; incomplete or unposted days are labelled |
| Restrictions | One shared gate for menu, add, swap and suggestions. Unknown allergen info is excluded in strict mode (default) |
| Dish details | Accessible `<dialog>`: restrictions first, then the label, ingredients, cross-contact notes and the official source link |
| Privacy | Profile stays in the browser; saving to `localStorage` is opt-in, with a delete control |
| Fenway (Sodexo API) | **Deferred.** Client code and tests are kept, but Fenway is hidden from the hall picker and not collected on schedule (see below) |
| Scheduled refresh | `.github/workflows/refresh-menus.yml`, daily at 05:30 New York and on demand (not yet run on GitHub) |
| Freshness gate | The upstream `validate_freshness.py` checks each refresh; suggestions need data under 24 hours old with all three halls posted for that day |

## Commands

Node 24 LTS (`.nvmrc`) and Python 3.10+.

```bash
npm ci
npm run dev            # http://localhost:5173
npm test               # Vitest: adapter, planner, restrictions, storage, merge, Sodexo client, XSS rendering
npm run typecheck
npm run build          # dist/ for Vercel
npm run check:secrets  # fails if dist/ contains key names, the Sodexo host, or research files
```

Collect and publish menu data:

```bash
cd collector && python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
python scripts/scrape_bu_menus.py --refresh          # live (3 requests, robots-checked)
python scripts/scrape_bu_menus.py --offline          # re-parse cached HTML
python -m pytest tests
python scripts/meal_hours.py --input data/current/menus.json --out data/current/hours.json
python scripts/freshness_gate.py --input data/current/menus.json --fetched-after <time the --refresh run started> \
  --out data/current/freshness.json
cd .. && npx tsx scripts/build-menus.ts --bu collector/data/current/menus.json --hours collector/data/current/hours.json \
  --freshness collector/data/current/freshness.json --coverage docs/data-coverage.md
```

## How data flows

```text
bu.edu menu pages ──(collector/scripts/scrape_bu_menus.py, Actions only)──▶ snake_case JSON
   ──(scripts/build-menus.ts + src/lib/adapter.ts)──▶ public/menus/index.json + <hall>/<date>.json (~25 KB gzipped each)
   ──(static Vercel site)──▶ browser loads the index, then only the selected hall-day
profile (allergens, targets) ── stays in the browser ──▶ local planner
```

- Raw HTML (12–16 MB per hall) and collector output stay in `collector/data/` (git-ignored), never in `public/`.
- New BU data is published only if all three halls collect and the upstream validator says it is fresh (all-or-nothing). Otherwise the previous snapshot stays, with its original fetch time, and ages into "stale". Each run writes a summary, keeps its JSON reports as 30-day artifacts, and opens (or updates) one `menu-refresh` issue on failure. That issue closes after the next full success; delivery follows your GitHub notification settings.
- `index.json` carries a content-hash `dataVersion`; day files are requested with `?v=dataVersion`, so cached files never mix versions.
- `docs/data-coverage.md` reports field coverage per hall. BU lists allergens for only about half of dishes; vitamins and minerals appear only as % Daily Value, so they are shown as printed and not scored.

## Deployment (Vercel)

`vercel.json` sets framework `vite`, output `dist`, and security headers (CSP `default-src 'self'`, no framing, `nosniff`, `no-referrer`). Still required from the team:

1. Import the repo in Vercel (git integration). Builds run `prebuild`, which pulls the latest `menu-data` branch if it exists.
2. Optional repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for redeploys after each refresh.
3. Run `refresh-menus` once manually; it creates the `menu-data` branch.

Nothing has been deployed yet.

## Fenway (deferred)

**Open question for the team:** the organisers asked for at least one API key, and the only keyed source here is Sodexo's Fenway menu API. No authorised `SODEXO_API_KEY` has been available, so its response format has never been verified. Until that is resolved, Fenway is not offered in the app and the scheduled refresh does not call Sodexo. Nothing else has replaced it.

To resume, `npm run collect:fenway` (manual only) reads `SODEXO_API_KEY` from the environment only. It calls the fixed Sodexo URL with the key in a header, and classifies the result (auth failure, unavailable, empty/closed, malformed, ok). With `--inspect` it writes a **keys-and-types-only** shape file, so the response can be mapped to `MenuItem` without exposing data or the key. Until that mapping is written from a real response, Fenway shows as "not connected yet" and no dishes are invented.

## More

- [docs/SECURITY.md](docs/SECURITY.md): threat model and implemented controls
- [docs/REFERENCE_DATA.md](docs/REFERENCE_DATA.md): what the nutrition and activity datasets are, and why they are not used yet
- [collector/README.md](collector/README.md): scraper provenance and changes made for integration
- Research files are preserved in data/reference and research/ on main. The calorie estimator uses the team's trained model only (see below).

## Calorie estimate from our model

Plan → “Estimate my calories”, or Settings → “Estimate calories with our model”. Flow: measurements → our model’s prediction → review → **Apply** → Plan and Week use it.

- **Model:** the team’s trained regression (`research/scripts/dietary_database.py` → `research/models/dietary_cal_model.joblib`, SHA-256 `60ef9abb…`, sklearn 1.9.1). Inputs: age, gender (Female or Male, as the dataset records them), height, weight and the dataset’s five activity levels. It predicts **daily calories only**.
- **Export:** `python scripts/export-calorie-model.py` (needs `research/requirements.txt`) writes every fitted parameter at full precision to `src/lib/calorie-model.json` and the original pipeline’s own predictions to `tests/fixtures/calorie-model-parity.json`. The browser matches those within 1e-6 kcal. Re-running the training script reproduces the committed model exactly.
- **Limits:** inputs outside the dataset’s observed ranges are refused (no extrapolation); manual entry is always available. The dataset’s “Other” category is not applied (team decision, explained in the UI). On held-out rows of its own dataset the model’s MAE is about 111 kcal; that is not clinical validation.
- **Applying:** only daily calories change; manual protein, carb and fat targets are kept. Planning goals go through one helper, `planTarget()`: Maintaining applies no adjustment; Cutting subtracts and Bulking adds an editable kcal/day amount (starting at 10% of the estimate). The UI shows the model estimate, the signed adjustment and the proposed target together, and blocks Apply for blank, negative, fractional or non-numeric amounts or a nonpositive target. These are explicit planning adjustments, not goal-specific trained models or validated maintenance/weight-change predictions. Measurements stay in component memory: never saved, sent or put in the URL.

The data branch is preserved under data/reference and research/ on main. src/lib/calorie-model.json contains only the coefficient export, dataset bounds and provenance; raw CSV/model artifacts stay outside public/ and dist. See docs/REFERENCE_DATA.md.

Regenerate the browser model export without loading joblib: python scripts/export-calorie-model.py (standard-library Python). Original research scripts are preserved snapshots; they are not part of app startup.
