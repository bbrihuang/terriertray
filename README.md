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
| Fenway (Sodexo API) | Keyed collector client written and tested, **not connected**: no `SODEXO_API_KEY` was available, and the response format is unverified |
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
cd .. && npx tsx scripts/build-menus.ts --bu collector/data/processed/terrier_trays_menus_<date>.json \
  --fenway collector/data/processed/fenway_status.json --coverage docs/data-coverage.md
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
2. Repository secrets for the refresh workflow: `SODEXO_API_KEY` (Fenway), optionally `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for redeploys after each refresh. Repository variable: `COLLECTOR_CONTACT` (email or URL for the scraper's user agent).
3. Run `refresh-menus` once manually; it creates the `menu-data` branch.

Nothing has been deployed or pushed yet.

## Fenway

`npm run collect:fenway` reads `SODEXO_API_KEY` from the environment only. It calls the fixed Sodexo URL with the key in a header, and classifies the result (auth failure, unavailable, empty/closed, malformed, ok). With `--inspect` it writes a **keys-and-types-only** shape file, so the response can be mapped to `MenuItem` without exposing data or the key. Until that mapping is written from a real response, Fenway shows as "not connected yet" and no dishes are invented.

## More

- [docs/SECURITY.md](docs/SECURITY.md): threat model and implemented controls
- [docs/REFERENCE_DATA.md](docs/REFERENCE_DATA.md): what the nutrition and activity datasets are, and why they are not used yet
- [collector/README.md](collector/README.md): scraper provenance and changes made for integration
- The Python research files (`dietary_database.py`, CSVs, `dietary_cal_model.*`) live on the `data` branch and are not used by the website.
