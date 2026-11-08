"""Boundary rules of freshness_gate.py and browser parity (the validator is tested upstream)."""

from datetime import date, datetime, timezone
import json
from pathlib import Path

import pytest

from freshness_gate import gate
from validate_freshness import check_dataset_freshness

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "tests" / "fixtures" / "freshness-cases.json").read_text(encoding="utf-8"))
# Real upstream-format output (cut from a live run of the unchanged scraper).
SAMPLE = json.loads((ROOT / "tests" / "fixtures" / "bu-envelope-sample.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 11, 8, 3, 0, tzinfo=timezone.utc)
RUN_START = "2026-11-08T01:03:52Z"


def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_python_side_of_parity_table(case):
    """src/lib/freshness.ts runs the same table; both must agree with the upstream validator."""
    result = check_dataset_freshness({"generated_at_utc": case["basisAt"], "validation_status": "passed"}, now=parse(case["now"]))
    assert result["status"] == case["status"]
    if case["ageHours"] is None:
        assert result["age_hours"] is None
    else:
        assert result["age_hours"] == pytest.approx(case["ageHours"], abs=1e-5)


def test_clock_starts_at_the_refresh_run_not_parse_time():
    result = gate(SAMPLE, date(2026, 11, 7), fetched_after=RUN_START, days=1, now=NOW)
    assert result["basisAt"] == "2026-11-08T01:03:52+00:00"
    assert result["validatorStatus"] == "fresh"


def test_unknown_fetch_time_is_never_fresh():
    result = gate(SAMPLE, date(2026, 11, 7), fetched_after=None, days=1, now=NOW)
    assert result["validatorStatus"] == "invalid" and result["basisAt"] is None
    assert "not produced by a recorded --refresh run" in result["errors"][0]


def test_data_older_than_the_run_is_rejected():
    # e.g. a leftover current/menus.json that this run did not replace
    result = gate(SAMPLE, date(2026, 11, 7), fetched_after="2026-11-09T00:00:00Z", days=1, now=NOW)
    assert result["validatorStatus"] == "invalid"


def test_per_date_coverage_is_reported():
    # The sample has all three halls on Nov 7; Nov 8 lacks West; Nov 9 has nothing.
    result = gate(SAMPLE, date(2026, 11, 7), fetched_after=RUN_START, days=3, now=NOW)
    assert result["availableDates"] == ["2026-11-07"]
    assert result["missingDates"] == ["2026-11-09"]
    assert result["validatorStatus"] == "missing_dates"


def test_old_runs_expire():
    later = datetime(2026, 11, 10, 3, 0, tzinfo=timezone.utc)
    assert gate(SAMPLE, date(2026, 11, 7), fetched_after=RUN_START, days=1, now=later)["validatorStatus"] == "expired"
