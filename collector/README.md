# BU menu collector

`scripts/scrape_bu_menus.py` is the teammate scraper from
<https://github.com/aladincrnolic/bumenuscraper>, vendored at commit
`31ae28101ec88794ec6ec927e460fa814d6c5193` with the integration fixes below. That
repository has no license file; it is reused here with the team's approval. Add a license
or attribution note there before publishing more widely.

## Usage

```bash
pip install -r requirements-dev.txt
python scripts/scrape_bu_menus.py --refresh                       # download (robots.txt honoured, 2 s between pages)
python scripts/scrape_bu_menus.py --offline --snapshot-date 2026-11-07
python -m pytest tests
```

Exit codes: `0` all halls passed, `2` partial (some halls published), `1` every hall failed (nothing written).
Set `COLLECTOR_CONTACT` to put a contact address in the user agent.

## Verified against the upstream snapshot

Running the upstream script and this version `--offline` on the same saved HTML produced
identical records for all 2,404 occurrences (998 West, 712 Warren, 694 Marciano). The only
differences are the added fields below. A live refresh on 2026-11-07 22:28 UTC also passed
(996 / 712 / 694).

## Changes from upstream

1. **Fetch time:** written to `<raw>.fetch.json` at download, with the response's SHA-256.
   `fetched_at_utc` comes only from a sidecar matching the exact bytes, otherwise `null`. File
   modification time is no longer used (a git checkout changed it to the clone time).
2. **Menu windows:** no longer require exactly 7 consecutive dates or identical dates across halls.
   At least one valid date is required; gaps, very long windows and dates far from the snapshot
   become warnings.
3. **Partial failure:** each valid hall is written even if another fails. The combined file lists only
   published halls, with `status: "partial"` and `failed_halls`. Failed halls' earlier files are untouched.
4. **Per-item evidence:** `occurrence_id` (from date/meal/station/name, plus an order index for
   same-scope duplicates), `source_recipe_id` (BU's `data-menu-id` is empty on every observed item,
   so it is `null`), `description` and `allergen_status` on every record. `meal_hours` comes from
   the page's "Upcoming Hours" block, matched to service dates by month and day.
5. **HTTP:** up to 3 attempts for connection errors, 429 and 5xx, honouring `Retry-After` (capped at 120 s).
   Requires `text/html`, rejects off-site redirects and responses over 40 MB, streams the body, and
   keeps at most 6 raw snapshots per hall.
6. **Default snapshot date** is today's date in America/New_York, not the runner's timezone.
7. Pinned `requirements.txt`, tests in `tests/` (a real-HTML excerpt cut by `tests/make_fixture.py`
   plus synthetic edge cases).

## Freshness validation (upstream, unchanged)

`scripts/validate_freshness.py` and `tests/test_freshness.py` are copied unchanged from upstream
`379641d`. `tests/conftest.py` only puts `scripts/` on the import path so they run as-is.
`scripts/freshness_gate.py` adapts our envelope to the validator's input:

- The freshness clock starts at the **oldest real hall fetch time** from the `.fetch.json` sidecars,
  never at parse time. Re-parsing old HTML offline cannot look fresh, and an unknown fetch time is invalid.
- `validation_status` is `passed` only when all three halls passed, keeping upstream's all-or-nothing rule.
- `tests/fixtures/freshness-cases.json` is run by both `tests/test_freshness_gate.py` and the browser
  copy in `src/lib/freshness.ts`, so the two age calculations stay identical.

## Not adopted from upstream (and why)

- **Rewritten `scrape_bu_menus.py` (7b28eb4 and later).** It drops per-item IDs, allergen status,
  descriptions, meal hours, fetch-time provenance (its `generated_at_utc` is parse time) and HTTP retries,
  and it requires exactly seven consecutive dates. The app depends on the first four, and freshness
  depends on provenance. Keeping our integrated copy is the smaller, safer change.
- **`cleanup_archives.py`.** It prunes upstream's `data/archive/<run_id>/` folders, which this pipeline
  never creates. Our raw cache is already bounded (6 snapshots per hall), the CI runner is ephemeral,
  `menu-data` is a single force-pushed commit, and run reports are artifacts with 30-day retention.
