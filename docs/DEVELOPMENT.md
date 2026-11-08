# TerrierTrays: developer guide

For what the app does and how to use it, see the [README](../README.md).

Plan practical portions from Boston University dining-hall menus. Pick a hall and meal, enter your own daily targets and allergens, and TerrierTrays suggests plates built from that meal's real dishes, in whole dining-hall servings, with published menu nutrition traceable to the official label.

Unofficial student project for Hackcessability (Information Access track). Not affiliated with Boston University.

## What works

| Feature | Status |
| --- | --- |
| West, Warren, Marciano menus (7 days, ~2,400 dish occurrences) | Collected from bu.edu by the teammate scraper in `collector/` |
| Manual meal builder | Whole-serving amounts, totals vs your meal target, incomplete totals shown as "at least X, known for N of M dishes" |
| Daily summary | Below the meal selector on Plan; combines planned plates across all halls for the selected date. Published menu calories stay separate from approximate known macro energy using 4/4/9; loading, unavailable and partial data are explicit |
| Optional target calculator | US units first, convertible measurements, unchanged calorie model, editable planning adjustment and optional Balanced/Muscle-focused macro allocations; preview before explicit Apply |
| Local suggestions | Deterministic search over 2–3-dish plates, up to 3 distinct options, "Not this" swaps, "Why this plan?". Off until the allergy question is answered and while menu data fails the freshness check |
| Week view | Seven calendar days for one hall from the selected date, using the same planner, gate and per-day freshness; incomplete or unposted days are labelled |
| Restrictions | One shared gate for menu, add, swap and suggestions. Unknown allergen info is excluded in strict mode (default) |
| Dish details | Accessible `<dialog>`: restrictions first, then the label, ingredients, cross-contact notes and the official source link |
| Privacy | Profile stays in the browser; saving to `localStorage` is opt-in, with a delete control |
| Fenway (Sodexo API) | **Deferred.** Client code and tests are kept, but Fenway is hidden from the hall picker and not collected on schedule (see below) |
| Scheduled refresh | `.github/workflows/refresh-menus.yml`, daily at 05:30 New York and on demand (not yet run on GitHub) |
| Freshness gate | The upstream `validate_freshness.py` checks each refresh; suggestions need data under 24 hours old with all three halls posted for that day |

The approved square TerrierTrays mascot logo is supplied by the user and replaces the earlier no-mascot direction. It links home to Plan without clearing profile or tray state; the unofficial notice remains. Short transitions explain views, meals, dialogs, plate contents, rings and allocations, with reduced-motion equivalents and no decorative loops. The visible rename does not migrate the existing `terriertray.profile.v1` or `terriertray-theme` keys or `terriertray:*` event names.

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
- The daily summary loads nutrition for planned plates across halls on the selected date. Its menu-calorie total uses published calories. The separate macro-energy bar uses known protein and carbohydrate grams × 4 plus fat grams × 9; it may differ from menu calories. Missing values remain unknown or “at least,” with coverage and loading/unavailable states; exact target differences require complete totals.

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

- [docs/SECURITY.md](SECURITY.md): threat model and implemented controls
- [docs/REFERENCE_DATA.md](REFERENCE_DATA.md): what the nutrition and activity datasets are, and why they are not used yet
- [collector/README.md](../collector/README.md): scraper provenance and changes made for integration
- Research files are preserved in data/reference and research/ on main. The calorie estimator uses the team's trained model only (see below).

## Calorie estimate from our model

Plan → “Estimate my calories”, or Settings → “Estimate calories with our model”. Flow: measurements → our model’s prediction → review → **Apply** → Plan and Week use it.

- **Model:** the team’s trained regression (`research/scripts/dietary_database.py` → `research/models/dietary_cal_model.joblib`, SHA-256 `60ef9abb…`, sklearn 1.9.1). Inputs: age, gender (Female or Male, as the dataset records them), height, weight and the dataset’s five activity levels. It predicts **daily calories only**.
- **Export:** `python scripts/export-calorie-model.py` (needs `research/requirements.txt`) writes every fitted parameter at full precision to `src/lib/calorie-model.json` and the original pipeline’s own predictions to `tests/fixtures/calorie-model-parity.json`. The browser matches those within 1e-6 kcal. Re-running the training script reproduces the committed model exactly.
- **Limits:** inputs outside the dataset’s observed ranges are refused (no extrapolation); manual entry is always available. The dataset’s “Other” category is not applied (team decision, explained in the UI). On held-out rows of its own dataset the model’s MAE is about 111 kcal; that is not clinical validation.
- **Measurements and adjustment:** feet, inches and pounds are the initial units; switching units converts existing measurements without changing the underlying physical values. Planning goals go through `planTarget()`: Maintaining applies no adjustment; Cutting subtracts and Bulking adds an editable kcal/day amount (starting at 10% of the estimate). The UI shows the model estimate, signed adjustment and final calorie budget together, and blocks Apply for blank, negative, fractional or non-numeric adjustments or a nonpositive target. These are explicit planning adjustments, not goal-specific trained models or validated maintenance/weight-change predictions. Measurements stay in component memory: never saved, sent or put in the URL.
- **Optional macros:** `macroTargets()` in `src/lib/macro-targets.ts` divides that final calorie budget using 4 kcal/g protein and carbs and 9 kcal/g fat. Balanced starts at 20% protein and 30% fat. Muscle-focused starts at 0.8 g protein/lb and 30% fat. Carbs take the remainder; impossible/nonpositive splits return an error rather than trimming protein or changing calories. Native protein/fat sliders edit percentage allocations; custom shares persist across body, budget and goal changes, while preset selection or Reset split restores defaults. These are planning starting points with expandable references, not trained predictions or clinical limits.
- **Applying:** the complete proposal is reviewed before an explicit click. “Include suggested macros” is initially checked; unchecking it applies calories only and preserves manual macros. Included macro targets are rounded to 0.1 g to match the preview; the pure allocation retains unrounded arithmetic. Invalid splits, including those that would round a macro to 0 g, cannot be applied as macro targets. Only applied targets enter the existing opt-in profile flow; measurements and draft preferences remain temporary.

The data branch is preserved under data/reference and research/ on main. src/lib/calorie-model.json contains only the coefficient export, dataset bounds and provenance; raw CSV/model artifacts stay outside public/ and dist. See docs/REFERENCE_DATA.md.

Regenerate the browser model export without loading joblib: python scripts/export-calorie-model.py (standard-library Python). Original research scripts are preserved snapshots; they are not part of app startup.
