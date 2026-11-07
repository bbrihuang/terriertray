"""Adapter and browser-parity tests for freshness_gate.py (validator itself is tested upstream)."""

import copy
from datetime import date, datetime, timezone
import json
from pathlib import Path

import pytest

from freshness_gate import gate, to_validator_view
from validate_freshness import check_dataset_freshness

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "tests" / "fixtures" / "freshness-cases.json").read_text(encoding="utf-8"))
SAMPLE = json.loads((ROOT / "tests" / "fixtures" / "bu-envelope-sample.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 11, 7, 23, 0, tzinfo=timezone.utc)


def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_python_side_of_parity_table(case):
    """src/lib/freshness.ts runs the same table; both must agree with the upstream validator."""
    result = check_dataset_freshness(
        {"generated_at_utc": case["basisAt"], "validation_status": "passed"}, now=parse(case["now"])
    )
    assert result["status"] == case["status"]
    if case["ageHours"] is None:
        assert result["age_hours"] is None
    else:
        assert result["age_hours"] == pytest.approx(case["ageHours"], abs=1e-5)


def with_fetch_times(envelope, times):
    env = copy.deepcopy(envelope)
    env["status"] = "passed"
    env["dining_halls"] = ["West Campus", "Warren Towers", "Marciano Commons"]
    for hall, ts in zip(env["dining_halls"], times):
        env["sources"].setdefault(hall, {"url": "https://www.bu.edu/", "raw_html_sha256": "x"})["fetched_at_utc"] = ts
    return env


def test_basis_is_oldest_real_fetch_not_parse_time():
    env = with_fetch_times(SAMPLE, ["2026-11-07T22:28:07+00:00", "2026-11-07T22:28:46+00:00", "2026-11-07T17:29:45-05:00"])
    env["generated_at_utc"] = "2030-01-01T00:00:00+00:00"  # parse time must be ignored
    view = to_validator_view(env)
    assert view["generated_at_utc"] == "2026-11-07T22:28:07+00:00"


def test_unknown_fetch_time_is_never_fresh():
    env = with_fetch_times(SAMPLE, ["2026-11-07T22:28:07+00:00", None, "2026-11-07T22:29:45+00:00"])
    result = gate(env, date(2026, 11, 7), now=NOW)
    assert result["validatorStatus"] == "invalid"
    assert result["basisAt"] is None


def test_partial_bu_publication_is_rejected():
    env = with_fetch_times(SAMPLE, ["2026-11-07T22:28:07+00:00"] * 3)
    env["status"] = "partial"
    assert gate(env, date(2026, 11, 7), now=NOW)["validatorStatus"] == "invalid"


def test_per_date_coverage_is_reported():
    # The sample has all three halls on Nov 7; Nov 8 lacks West, Nov 9 has nothing.
    env = with_fetch_times(SAMPLE, ["2026-11-07T22:28:07+00:00"] * 3)
    result = gate(env, date(2026, 11, 7), days=3, now=NOW)
    assert result["availableDates"] == ["2026-11-07"]
    assert result["missingDates"] == ["2026-11-09"]  # Nov 8 is a missing hall, not a missing date
    assert result["validatorStatus"] == "missing_dates"


def test_stale_data_blocks_publication():
    env = with_fetch_times(SAMPLE, ["2026-11-05T22:00:00+00:00"] * 3)
    assert gate(env, date(2026, 11, 7), now=NOW)["validatorStatus"] == "expired"
