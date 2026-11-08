"""Run the upstream freshness validator on the upstream scraper's published dataset.

    python scripts/freshness_gate.py --input data/current/menus.json \
        --fetched-after 2026-11-08T10:30:00Z --out data/current/freshness.json [--start 2026-11-08] [--days 7]

Both scrape_bu_menus.py and validate_freshness.py are vendored unchanged. The only boundary
rule is about time: upstream stamps generated_at_utc when it *parses*, so an --offline re-run
of old HTML would look brand new. The refresh workflow therefore records when it started its
--refresh run and passes it as --fetched-after, a conservative lower bound on the real fetch time:

- the freshness clock starts at --fetched-after, never at parse time;
- if the dataset was generated before --fetched-after, it did not come from that run: invalid;
- without --fetched-after, the fetch time is unknown: invalid.

Exit 0 = publishable (fresh; per-date coverage may still be partial),
exit 1 = do not publish (invalid, stale or expired), exit 2 = unreadable input.
"""

import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

from validate_freshness import validate_for_recommendations

MAX_AGE_HOURS = 24
EXPIRY_HOURS = 48


def parse_utc(value):
    when = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    if when.tzinfo is None:
        raise ValueError(f"timestamp without timezone: {value!r}")
    return when.astimezone(timezone.utc)


def gate(dataset, start, fetched_after=None, days=7, now=None):
    """Validate as published, with the freshness clock started at the run's fetch time."""
    view = dict(dataset)
    try:
        generated = parse_utc(dataset.get("generated_at_utc"))
        basis = parse_utc(fetched_after) if fetched_after else None
    except (TypeError, ValueError):
        generated = basis = None
    view["generated_at_utc"] = basis.isoformat() if basis and generated and generated >= basis else None

    requested = [(start + timedelta(days=n)).isoformat() for n in range(days)]
    outcome = validate_for_recommendations(view, requested, now=now, max_age_hours=MAX_AGE_HOURS, expiry_hours=EXPIRY_HOURS)
    errors = list(outcome["errors"])
    if view["generated_at_utc"] is None:
        errors.insert(0, "Fetch time not established: the dataset was not produced by a recorded --refresh run.")
    return {
        "basis": "refresh_run_start",
        "basisAt": view["generated_at_utc"],
        "checkedAt": outcome["freshness"]["checked_at_utc"],
        "validatorStatus": outcome["status"],
        "maxAgeHours": MAX_AGE_HOURS,
        "expiryHours": EXPIRY_HOURS,
        "requestedDates": outcome["coverage"]["requested_dates"],
        "availableDates": outcome["coverage"]["available_dates"],
        "missingDates": outcome["coverage"]["missing_dates"],
        "warnings": outcome["warnings"],
        "errors": errors,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--fetched-after", help="When the --refresh run started (ISO 8601 with timezone).")
    parser.add_argument("--start", help="First requested date (default: today in New York).")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args(argv)

    try:
        dataset = json.loads(args.input.read_text(encoding="utf-8"))
        start = date.fromisoformat(args.start) if args.start else datetime.now(ZoneInfo("America/New_York")).date()
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    result = gate(dataset, start, args.fetched_after, args.days)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(f"Validator status: {result['validatorStatus']}")
    print(f"Freshness basis (refresh run start): {result['basisAt'] or 'unknown'}")
    print(f"Dates with all three halls: {', '.join(result['availableDates']) or 'none'}")
    for line in result["warnings"] + result["errors"]:
        print(f"  {line}")
    return 0 if result["validatorStatus"] in ("fresh", "missing_dates") else 1


if __name__ == "__main__":
    sys.exit(main())
