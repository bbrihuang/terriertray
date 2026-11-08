"""Tests for the vendored upstream scraper (aladincrnolic/bumenuscraper@90c2ca6, unchanged)
and TerrierTray's hours adapter, against a real BU page excerpt (tests/make_fixture.py)."""

from pathlib import Path

import pytest
from bs4 import BeautifulSoup

import meal_hours
import scrape_bu_menus as bu

FIXTURE = Path(__file__).parent / "fixtures" / "warren_excerpt.html"
WARREN = "Warren Towers"


def warren():
    soup = BeautifulSoup(FIXTURE.read_bytes(), "html.parser")
    records, report = bu.extract_all_with_diagnostics(soup, WARREN)
    return soup, records, report


def by_name(records, name):
    return [r for r in records if r["name"] == name]


def test_real_item_keeps_its_own_label_date_and_meal():
    _, records, _ = warren()
    [eggs] = by_name(records, "Scrambled Eggs")
    assert (eggs["date"], eggs["meal"], eggs["station"]) == ("2026-11-07", "Breakfast", "Grill")
    assert eggs["calories"] == 140 and eggs["protein_g"] == 12 and eggs["sodium_mg"] == 595
    assert eggs["vitamin_d_dv"] == 10  # % Daily Value
    assert eggs["allergens"] == ["Egg"]
    assert eggs["dietary_tags"] == ["Vegetarian", "Halal"]


def test_real_unknowns_stay_unknown():
    _, records, _ = warren()
    [sausage] = by_name(records, "Beef Sausage Links Halal")
    assert sausage["allergens"] is None  # empty <ul> is not "no allergens"
    assert sausage["calories"] == 170
    soups = by_name(records, "Tomato Basil Soup")
    assert sorted(s["station"] for s in soups) == ["Deli", "Soup"]  # both occurrences kept
    assert all(s["calories"] is None and s["allergens"] is None for s in soups)


def test_real_duplicates_are_not_merged():
    _, records, _ = warren()
    assert len(by_name(records, "Chive Cream Cheese")) == 2


def test_upstream_requires_a_full_week():
    # Upstream's documented rule: a hall must cover 7 consecutive dates (the excerpt has 2).
    soup, records, report = warren()
    assert not bu.validate_hall(soup, records, report, WARREN)
    assert any("7 menu dates" in e for e in report["errors"])


@pytest.mark.parametrize("raw,unit,expected", [
    ("8g", "g", 8), ("0.5g", "g", 0.5), ("1,200mg", "mg", 1200), (" 23% ", "%", 23),
    ("8mg", "g", None), ("8 g extra", "g", None), ("-5g", "g", None), (None, "g", None),
])
def test_parse_amount_is_exact(raw, unit, expected):
    assert bu.parse_amount(raw, unit) == expected


def test_conflicting_nutrient_cells_become_unknown():
    html = (
        '<div><table class="nutrition-label">'
        '<tr><td class="nutrition-label-nutrient">Protein</td><td class="nutrition-label-amount">5g</td></tr>'
        '<tr><td class="nutrition-label-nutrient">Protein</td><td class="nutrition-label-amount">9g</td></tr>'
        "</table></div>"
    )
    soup = BeautifulSoup(html, "html.parser")
    assert bu.read_nutrient_table(soup.div, "table.nutrition-label", bu.NUTRIENTS, "nutrition-label-amount")["protein_g"] is None


# ---------- hours adapter ----------

def test_hours_are_read_from_the_page_and_matched_to_service_dates():
    hours = meal_hours.parse_meal_hours(FIXTURE.read_bytes(), ["2026-11-07", "2026-11-08"])
    assert hours["2026-11-07"]["Breakfast"] == "9:00 AM - 11:00 AM"
    assert hours["2026-11-08"] == {"Brunch": "10:00 AM - 4:00 PM", "Dinner": "4:00 PM - 9:00 PM"}
    assert set(hours) == {"2026-11-07", "2026-11-08"}  # other headings are not guessed into dates


def test_hours_adapter_refuses_html_from_another_run(tmp_path, monkeypatch):
    import json

    monkeypatch.setattr(meal_hours, "PROJECT_ROOT", tmp_path)
    (tmp_path / "warren.html").write_bytes(FIXTURE.read_bytes())
    dataset = {
        "menu_dates": ["2026-11-07"],
        "sources": {WARREN: {"raw_html_path": "warren.html", "raw_html_sha256": "not-this-file"}},
    }
    (tmp_path / "menus.json").write_text(json.dumps(dataset))
    meal_hours.main(["--input", str(tmp_path / "menus.json"), "--out", str(tmp_path / "hours.json")])
    assert json.loads((tmp_path / "hours.json").read_text()) == {}
