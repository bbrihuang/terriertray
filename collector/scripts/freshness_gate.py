"""Run the upstream freshness validator on TerrierTray collector output.

    python scripts/freshness_gate.py --input data/processed/terrier_trays_menus_2026-11-07.json \
        --out data/processed/freshness.json [--start 2026-11-07] [--days 7]

validate_freshness.py (vendored unchanged from upstream) expects the upstream
publication schema. This adapter maps our envelope onto it at the boundary:

- generated_at_utc := the OLDEST real network fetch time of the three halls.
  Never parse/publish time, so re-parsing old HTML cannot look fresh. If any
  hall's fetch time is unknown, freshness is invalid (unknown stays unknown).
- validation_status := "passed" only when every BU hall passed, which keeps the
  upstream all-or-nothing rule for the three halls.

Exit 0 = publishable (fresh; per-date coverage may still be partial),
exit 1 = do not publish new data (invalid, stale or expired), exit 2 = unreadable input.
"""

import argparse
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

from validate_freshness import EXPECTED_HALLS, validate_for_recommendations

MAX_AGE_HOURS = 24
EXPIRY_HOURS = 48


def to_validator_view(envelope):
    sources = envelope.get("sources") or {}
    fetched = [(sources.get(hall) or {}).get("fetched_at_utc") for hall in EXPECTED_HALLS]
    basis = min(fetched) if all(isinstance(t, str) and t for t in fetched) else None
    if basis is not None:
        # min() on ISO strings is only safe once all are normalised to UTC.
        basis = min(datetime.fromisoformat(t).astimezone(timezone.utc) for t in fetched).isoformat()

    run_id = hashlib.sha256(
        "".join(str((sources.get(h) or {}).get("raw_html_sha256")) for h in EXPECTED_HALLS).encode()
    ).hexdigest()[:16]

    return {
        "schema_version": "1.0",  # the validator's input contract, not our envelope version
        "run_id": f"{envelope.get('snapshot_date')}_{run_id}",
        "allergy_notice": envelope.get("allergy_notice"),
        "snapshot_date": envelope.get("snapshot_date"),
        "sources": sources,
        "dining_halls": envelope.get("dining_halls"),
        "total_records": envelope.get("total_records"),
        "records": envelope.get("records"),
        "menu_dates": envelope.get("menu_dates"),
        "generated_at_utc": basis,
        "validation_status": "passed" if envelope.get("status") == "passed" else envelope.get("status"),
    }


def gate(envelope, start, days=7, now=None):
    requested = [(start + timedelta(days=n)).isoformat() for n in range(days)]
    outcome = validate_for_recommendations(
        to_validator_view(envelope), requested, now=now,
        max_age_hours=MAX_AGE_HOURS, expiry_hours=EXPIRY_HOURS,
    )
    freshness = outcome["freshness"]
    return {
        "basis": "oldest_hall_fetch",
        "basisAt": freshness["generated_at_utc"],
        "checkedAt": freshness["checked_at_utc"],
        "validatorStatus": outcome["status"],
        "maxAgeHours": MAX_AGE_HOURS,
        "expiryHours": EXPIRY_HOURS,
        "requestedDates": outcome["coverage"]["requested_dates"],
        "availableDates": outcome["coverage"]["available_dates"],
        "missingDates": outcome["coverage"]["missing_dates"],
        "warnings": outcome["warnings"],
        "errors": outcome["errors"],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--start", help="First requested date (default: today in New York).")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args(argv)

    try:
        envelope = json.loads(args.input.read_text(encoding="utf-8"))
        start = date.fromisoformat(args.start) if args.start else datetime.now(ZoneInfo("America/New_York")).date()
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    result = gate(envelope, start, args.days)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(f"Validator status: {result['validatorStatus']}")
    print(f"Freshness basis (oldest hall fetch): {result['basisAt'] or 'unknown'}")
    print(f"Dates with all three halls: {', '.join(result['availableDates']) or 'none'}")
    for line in result["warnings"] + result["errors"]:
        print(f"  {line}")
    return 0 if result["validatorStatus"] in ("fresh", "missing_dates") else 1


if __name__ == "__main__":
    sys.exit(main())
