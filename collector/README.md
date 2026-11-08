# BU menu collector

## Exact versions

| File | Source |
| --- | --- |
| `scripts/scrape_bu_menus.py` | [aladincrnolic/bumenuscraper](https://github.com/aladincrnolic/bumenuscraper) at `90c2ca63fd93fefbb6f861ef7851172f2bc250e6`, **unchanged** (content last changed in `7b28eb4`) |
| `scripts/validate_freshness.py`, `tests/test_freshness.py` | same repository and revision, **unchanged** (content from `6b61692`) |
| `scripts/meal_hours.py`, `scripts/freshness_gate.py` | TerrierTray adapters (below) |

The upstream repository has no license file; reuse here is with the team's approval. Its
`.github/workflows/update_menus.yml` (added in `90c2ca6`) is empty, so upstream publishes nothing
that TerrierTray could consume instead of running the scraper.

## Pipeline

```bash
pip install -r requirements-dev.txt
START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
python scripts/scrape_bu_menus.py --refresh --snapshot-date 2026-11-08    # -> data/current/menus.json (all 3 halls or nothing)
python scripts/meal_hours.py --input data/current/menus.json --out data/current/hours.json
python scripts/freshness_gate.py --input data/current/menus.json --fetched-after "$START" --out data/current/freshness.json
python -m pytest tests
```

`.github/workflows/refresh-menus.yml` runs exactly this daily at 05:30 New York time, then
`scripts/build-menus.ts` turns the three files into `public/menus/`.

## Adapters (why, and what they do)

Upstream publishes the 24 label fields per dish. It has no IDs, allergen-status reasons, descriptions,
meal hours or fetch time, and it stamps `generated_at_utc` when it **parses**, so an `--offline`
re-run of old HTML looks new.

- **Fetch time:** the workflow records when its `--refresh` run starts. `freshness_gate.py` starts the
  validator's clock there and rejects data generated before it. Without that time the data is never
  "fresh". The validator itself is unchanged.
- **Hours:** `meal_hours.py` reads only the "Upcoming Hours" block from the raw HTML that upstream
  archived for the same run, after matching its SHA-256 to the run's record. Dishes are never re-extracted.
- **IDs and allergen status** are derived in `src/lib/adapter.ts`. IDs are a hash of hall, date, meal,
  station and name plus a duplicate index. Allergen status is an explicit list, an explicit empty
  list, a missing nutrition panel, or "reason not recorded".
- **Descriptions:** not captured upstream, so the app shows none.

## What changed from TerrierTray's earlier modified copy (and why)

The earlier copy (upstream `31ae281` plus local fixes) has been replaced by the finalized upstream
scraper, as the team requested. That gives up partial-hall publication, bounded retries with
`Retry-After`, response size and content-type checks, the contact in the user agent, and per-dish
descriptions. The provenance, ID, allergen-status and hours behaviours are kept through the adapters above.
