import json
import shutil
import sys
from pathlib import Path

import pytest
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import scrape_bu_menus as bu  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "warren_excerpt.html"
WARREN = "Warren Towers"


def warren():
    soup = BeautifulSoup(FIXTURE.read_bytes(), "html.parser")
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    return soup, records, report


def by_name(records, name):
    return [r for r in records if r["name"] == name]


def page(dates_html, title="Warren Towers"):
    return BeautifulSoup(
        f"<html><head><title>{title}</title></head><body>{dates_html}</body></html>",
        "html.parser",
    )


def day(menu_date, items_html, meal="lunch"):
    return (
        f'<ol class="js-menu-bydate" data-menudate="{menu_date}">'
        f'<li class="menu-meal-period js-meal-period-{meal}">'
        f'<ol class="menu-dishes">{items_html}</ol></li></ol>'
    )


def item(name, nutrition=""):
    return (
        f'<li class="menu-item"><div class="menu-item-wrapper" data-menu-id="">'
        f'<h4 class="menu-item-title">{name}</h4>'
        f'<strong class="js-sortby-station">Grill</strong></div>{nutrition}</li>'
    )


# ---------- real excerpt: dish-to-label association ----------

def test_real_item_keeps_its_own_label_date_and_meal():
    _, records, _ = warren()
    [eggs] = by_name(records, "Scrambled Eggs")
    assert (eggs["date"], eggs["meal"], eggs["station"]) == ("2026-11-07", "Breakfast", "Grill")
    assert eggs["calories"] == 140
    assert eggs["protein_g"] == 12
    assert eggs["sodium_mg"] == 595
    assert eggs["vitamin_d_dv"] == 10  # a % Daily Value, not a mass
    assert eggs["allergens"] == ["Egg"]
    assert eggs["allergen_status"] == "allergens_listed"
    assert eggs["dietary_tags"] == ["Vegetarian", "Halal"]
    assert eggs["description"].startswith("Cage Free eggs")
    assert eggs["source_recipe_id"] is None  # BU leaves data-menu-id empty


def test_real_evidence_states_stay_distinct():
    _, records, _ = warren()
    [sausage] = by_name(records, "Beef Sausage Links Halal")
    [rendang] = by_name(records, "Singaporean Beef Rendang")
    # Real page lists it at both Soup and Deli: two occurrences, both kept.
    soups = by_name(records, "Tomato Basil Soup")
    assert sorted(s["station"] for s in soups) == ["Deli", "Soup"]
    soup = soups[0]

    # Empty <ul> is NOT a declaration of no allergens.
    assert sausage["allergen_status"] == "empty_allergen_list"
    assert sausage["allergens"] is None
    assert sausage["calories"] == 170

    assert rendang["allergen_status"] == "explicitly_unavailable"
    assert rendang["allergens"] is None

    # No nutrition wrapper: everything unknown, nothing zero.
    assert soup["allergen_status"] == "missing_nutrition_wrapper"
    assert soup["calories"] is None and soup["protein_g"] is None
    assert soup["allergens"] is None


def test_real_duplicates_are_kept_with_distinct_stable_ids():
    _, records, _ = warren()
    dupes = by_name(records, "Chive Cream Cheese")
    assert len(dupes) == 2
    assert dupes[0]["occurrence_id"] != dupes[1]["occurrence_id"]

    _, again, _ = warren()
    assert [r["occurrence_id"] for r in records] == [r["occurrence_id"] for r in again]
    assert all(r["occurrence_id"].startswith("bu-warren-") for r in records)


def test_real_hours_are_matched_to_service_dates():
    soup, _, report = warren()
    hours = bu.parse_meal_hours(soup, report["dates"])
    assert hours["2026-11-07"]["Breakfast"] == "9:00 AM - 11:00 AM"
    assert hours["2026-11-08"] == {"Brunch": "10:00 AM - 4:00 PM", "Dinner": "4:00 PM - 9:00 PM"}
    # Headings for days without a menu date are not guessed into one.
    assert set(hours) <= set(report["dates"])


def test_real_two_day_window_is_valid():
    soup, records, report = warren()
    assert report["dates"] == ["2026-11-07", "2026-11-08"]
    assert bu.validate_hall(soup, records, report, WARREN, "2026-11-07")
    assert report["errors"] == []


# ---------- numbers ----------

@pytest.mark.parametrize("raw,unit,expected", [
    ("8g", "g", 8),
    ("0.5g", "g", 0.5),
    ("1,200mg", "mg", 1200),
    (" 23% ", "%", 23),
    ("8mg", "g", None),     # wrong unit
    ("8 g extra", "g", None),
    ("-5g", "g", None),
    ("", "g", None),
    (None, "g", None),
])
def test_parse_amount_is_exact(raw, unit, expected):
    assert bu.parse_amount(raw, unit) == expected


def test_conflicting_nutrient_cells_become_unknown():
    html = (
        '<div class="nutrition-wrapper"><table class="nutrition-label">'
        '<tr><td class="nutrition-label-nutrient">Protein</td><td class="nutrition-label-amount">5g</td></tr>'
        '<tr><td class="nutrition-label-nutrient">Protein</td><td class="nutrition-label-amount">9g</td></tr>'
        '<tr><td class="nutrition-label-nutrient">Sodium</td><td class="nutrition-label-amount">12 grams</td></tr>'
        "</table></div>"
    )
    soup = BeautifulSoup(html, "html.parser")
    values = bu.read_nutrient_table(soup.div, "table.nutrition-label", bu.NUTRIENTS, "nutrition-label-amount")
    assert values["protein_g"] is None
    assert values["sodium_mg"] is None


def test_explicit_none_is_the_only_empty_list():
    nutrition = '<div class="nutrition-wrapper"><div class="nutrition-facts-allergens"><ul><li>None</li></ul></div></div>'
    soup = page(day("2026-11-09", item("Rice", nutrition)))
    records, _ = bu.extract_all_with_diagnostics(soup, WARREN)
    assert records[0]["allergens"] == []
    assert records[0]["allergen_status"] == "explicitly_none_listed"


# ---------- validation windows ----------

def test_non_consecutive_window_warns_but_passes():
    soup = page(day("2026-11-09", item("Rice")) + day("2026-11-12", item("Rice")))
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    assert bu.validate_hall(soup, records, report, WARREN, "2026-11-09")
    assert any("not consecutive" in w for w in report["warnings"])


def test_empty_page_fails():
    soup = page("")
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    assert not bu.validate_hall(soup, records, report, WARREN, "2026-11-09")
    assert any("No recognizable" in e for e in report["errors"])


def test_malformed_page_without_dates_fails():
    soup = page('<ol class="js-menu-bydate" data-menudate="not-a-date">'
                '<li class="menu-meal-period js-meal-period-lunch"><ol class="menu-dishes">'
                + item("Rice") + "</ol></li></ol>")
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    assert not bu.validate_hall(soup, records, report, WARREN, "2026-11-09")


def test_wrong_hall_page_fails():
    soup = page(day("2026-11-09", item("Rice")), title="Marciano Commons")
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    assert not bu.validate_hall(soup, records, report, WARREN, "2026-11-09")


# ---------- freshness provenance ----------

def test_fetch_time_comes_from_matching_sidecar_only(tmp_path, monkeypatch):
    monkeypatch.setattr(bu, "PROJECT_ROOT", tmp_path)
    raw = tmp_path / "warren_2026-11-07.html"
    raw.write_bytes(b"<html>menu</html>")

    assert bu.source_metadata(raw, raw.read_bytes(), WARREN)["fetched_at_utc"] is None

    sha = bu.hashlib.sha256(raw.read_bytes()).hexdigest()
    bu.write_json(bu.fetch_meta_path(raw), {"sha256": sha, "fetched_at_utc": "2026-11-07T20:58:00+00:00"})
    assert bu.source_metadata(raw, raw.read_bytes(), WARREN)["fetched_at_utc"] == "2026-11-07T20:58:00+00:00"

    bu.write_json(bu.fetch_meta_path(raw), {"sha256": "other", "fetched_at_utc": "2026-11-07T20:58:00+00:00"})
    assert bu.source_metadata(raw, raw.read_bytes(), WARREN)["fetched_at_utc"] is None


# ---------- HTTP ----------

class FakeResponse:
    def __init__(self, status=200, body=b"<html>ok</html>", headers=None,
                 url="https://www.bu.edu/dining/location/warren/"):
        self.status_code = status
        self.headers = {"Content-Type": "text/html; charset=UTF-8", **(headers or {})}
        self.url = url
        self._body = body

    def iter_content(self, chunk_size):
        for i in range(0, len(self._body), chunk_size):
            yield self._body[i:i + chunk_size]

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def close(self):
        pass


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0

    def get(self, url, **kwargs):
        self.calls += 1
        result = self.responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


URL = "https://www.bu.edu/dining/location/warren/"


def test_429_honors_retry_after_then_succeeds():
    slept = []
    session = FakeSession([FakeResponse(429, headers={"Retry-After": "3"}), FakeResponse()])
    html, meta = bu.http_get(session, URL, WARREN, sleep=slept.append)
    assert html == b"<html>ok</html>"
    assert slept == [3.0]
    assert meta["fetched_at_utc"] and meta["sha256"]


def test_retry_after_is_capped_and_attempts_are_bounded():
    slept = []
    session = FakeSession([FakeResponse(503, headers={"Retry-After": "99999"})] * 3)
    with pytest.raises(requests.HTTPError):
        bu.http_get(session, URL, WARREN, sleep=slept.append)
    assert session.calls == bu.MAX_ATTEMPTS
    assert slept == [bu.MAX_RETRY_AFTER_SECONDS] * (bu.MAX_ATTEMPTS - 1)


def test_client_errors_are_not_retried():
    session = FakeSession([FakeResponse(404)])
    with pytest.raises(requests.HTTPError):
        bu.http_get(session, URL, WARREN, sleep=lambda s: None)
    assert session.calls == 1


@pytest.mark.parametrize("response", [
    FakeResponse(headers={"Content-Type": "application/json"}),
    FakeResponse(url="https://evil.example/warren/"),
    FakeResponse(body=b""),
])
def test_unexpected_responses_are_rejected(response):
    with pytest.raises(ValueError):
        bu.http_get(FakeSession([response]), URL, WARREN, sleep=lambda s: None)


def test_oversized_response_is_rejected(monkeypatch):
    monkeypatch.setattr(bu, "MAX_RESPONSE_BYTES", 10)
    with pytest.raises(ValueError, match="exceeds"):
        bu.http_get(FakeSession([FakeResponse(body=b"x" * 11)]), URL, WARREN, sleep=lambda s: None)


def test_cache_retention_keeps_current_file(tmp_path, monkeypatch):
    monkeypatch.setattr(bu, "RAW_DIR", tmp_path)
    names = [f"warren_2026-11-0{i}.html" for i in range(1, 8)]
    for name in names:
        (tmp_path / name).write_text("x")
    current = tmp_path / "warren_2026-11-01.html"  # oldest name, but in use
    bu.prune_raw_cache("warren", current, keep=3)
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "warren_2026-11-01.html", "warren_2026-11-06.html", "warren_2026-11-07.html"]


# ---------- partial publication ----------

def test_one_failed_hall_does_not_block_the_others(tmp_path, monkeypatch):
    raw = tmp_path / "data" / "raw"
    out = tmp_path / "data" / "processed"
    raw.mkdir(parents=True)
    out.mkdir(parents=True)
    monkeypatch.setattr(bu, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(bu, "RAW_DIR", raw)
    monkeypatch.setattr(bu, "OUTPUT_DIR", out)

    prior_west = out / "west_2026-11-07.json"
    prior_west.write_text('["prior west data"]')

    def fake_fetch(hall, snapshot_date, *args):
        if hall == "West Campus":
            raise requests.ConnectionError("network down")
        # Marciano gets Warren's page: must fail the hall-title check.
        path = raw / f"{bu.HALL_SLUGS[hall]}_{snapshot_date}.html"
        shutil.copy(FIXTURE, path)
        return path.read_bytes(), path

    monkeypatch.setattr(bu, "read_or_fetch_html", fake_fetch)
    monkeypatch.setattr(sys, "argv", ["scrape", "--offline", "--snapshot-date", "2026-11-07"])

    assert bu.main() == 2

    combined = json.loads((out / "terrier_trays_menus_2026-11-07.json").read_text(encoding="utf-8"))
    assert combined["status"] == "partial"
    assert combined["dining_halls"] == [WARREN]
    assert set(combined["failed_halls"]) == {"West Campus", "Marciano Commons"}
    assert {r["dining_hall"] for r in combined["records"]} == {WARREN}
    assert combined["sources"][WARREN]["fetched_at_utc"] is None
    assert prior_west.read_text() == '["prior west data"]'
    assert not (out / "marciano_2026-11-07.json").exists()
