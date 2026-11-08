"""Read each hall's published meal hours from the raw HTML the upstream scraper archived.

    python scripts/meal_hours.py --input data/current/menus.json --out data/current/hours.json

The upstream scraper (vendored unchanged) does not record opening hours. This adapter reads
only the page's "Upcoming Hours" block from the same run's archived HTML, after checking the
file's SHA-256 against the run's recorded hash. Dish extraction is never repeated here.

Day headings carry no year, so a heading is matched only to a menu date with the same month
and day. Unmatched headings are skipped and nothing is invented.
Output: {"West Campus": {"2026-11-07": {"Breakfast": "7:00 AM - 11:00 AM"}}, ...}
"""

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys

from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"], start=1)}
DAY_RE = re.compile(r"(?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b")


def text(tag):
    return tag.get_text(" ", strip=True) if tag is not None else ""


def parse_meal_hours(html, menu_dates):
    soup = BeautifulSoup(html, "html.parser")
    by_month_day = {(date.fromisoformat(d).month, date.fromisoformat(d).day): d for d in menu_dates}
    hours = {}
    for heading in soup.select(".location-single-hours-day"):
        match = DAY_RE.search(text(heading))
        listing = heading.find_next_sibling()
        if not match or listing is None or "location-single-hours-list" not in listing.get("class", []):
            continue
        service_date = by_month_day.get((MONTHS.get(match.group(1).lower()), int(match.group(2))))
        if service_date is None:
            continue
        for group in listing.select(".location-hours-daygroup"):
            meal, times = text(group.select_one(".daygroup-days")), text(group.select_one(".daygroup-times"))
            if meal and times:
                hours.setdefault(service_date, {})[meal] = times
    return hours


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)

    dataset = json.loads(args.input.read_text(encoding="utf-8"))
    result = {}
    for hall, source in dataset["sources"].items():
        path = PROJECT_ROOT / source["raw_html_path"]
        try:
            html = path.read_bytes()
        except OSError:
            print(f"{hall}: archived HTML not found ({path}); hours left unknown")
            continue
        if hashlib.sha256(html).hexdigest() != source["raw_html_sha256"]:
            print(f"{hall}: archived HTML does not match this run's hash; hours left unknown")
            continue
        result[hall] = parse_meal_hours(html, dataset["menu_dates"])
        print(f"{hall}: hours for {len(result[hall])} dates")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
