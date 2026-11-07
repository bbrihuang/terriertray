"""Cut a small excerpt of a real BU page into tests/fixtures/.

Keeps the page title/h1, the "Upcoming Hours" block and selected
real menu items inside their original date and meal containers, so
parser tests run against genuine markup without the 12 MB page.

    python tests/make_fixture.py data/raw/warren_2026-11-07.html
"""

import sys
from pathlib import Path

from bs4 import BeautifulSoup

# (date, meal, item name) kept from the Warren 2026-11-07 snapshot.
KEEP = {
    ("2026-11-07", "breakfast", "Scrambled Eggs"),
    ("2026-11-07", "breakfast", "Beef Sausage Links Halal"),
    ("2026-11-07", "lunch", "Singaporean Beef Rendang"),
    ("2026-11-07", "lunch", "Tomato Basil Soup"),
    ("2026-11-08", "brunch", "Chive Cream Cheese"),
}

source = Path(sys.argv[1])
soup = BeautifulSoup(source.read_bytes(), "html.parser")

out = BeautifulSoup("<html><head></head><body></body></html>", "html.parser")
out.head.append(soup.title)
out.body.append(soup.select_one("h1"))
out.body.append(soup.select_one("section.location-single-hoursprices"))

for day in soup.select("ol.js-menu-bydate"):
    for period in day.select("li.menu-meal-period"):
        meal = next(
            c.removeprefix("js-meal-period-")
            for c in period["class"] if c.startswith("js-meal-period-")
        )
        for item in period.select("ol.menu-dishes > li.menu-item"):
            title = item.select_one(".menu-item-title").get_text(strip=True)
            if (day["data-menudate"], meal, title) not in KEEP:
                item.decompose()
        if not period.select("li.menu-item"):
            period.decompose()
    if not day.select("li.menu-item"):
        day.decompose()

menus = soup.select("ol.js-menu-bydate")
wrapper = out.new_tag("div", attrs={"class": "menu-wrapper"})
for day in menus:
    wrapper.append(day)
out.body.append(wrapper)

target = Path(__file__).parent / "fixtures" / "warren_excerpt.html"
target.parent.mkdir(exist_ok=True)
target.write_text(str(out), encoding="utf-8")
print(target, target.stat().st_size, "bytes")
