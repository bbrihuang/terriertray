"""Export the team's text regression and dataset bounds without loading joblib.

Run from any directory. No training or clinical validation is implied.
"""
import csv
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
equation = (ROOT / "research/models/dietary_cal_model.regression.txt").read_text(encoding="utf-8").strip()
match = re.fullmatch(r"Daily Calorie Requirement = (-?[\d.]+)((?: [+-] [\d.]+ \* [A-Za-z_]+)+)", equation)
if not match:
    raise ValueError("Unsupported regression export; review rather than guessing coefficients")
terms = {name: float(value) * (-1 if sign == "-" else 1) for sign, value, name in re.findall(r"([+-]) ([\d.]+) \* ([A-Za-z_]+)", match[2])}
if set(terms) != {"Age", "Height_cm", "Weight_kg", "Activity_Level", "Gender_Male", "Gender_Other"}:
    raise ValueError("Unexpected features; review the model before export")
with (ROOT / "data/reference/healthy_diet_calorie_intake.csv").open(encoding="utf-8", newline="") as file:
    rows = list(csv.DictReader(file))
if not rows:
    raise ValueError("Dataset is empty")
manifest = json.loads((ROOT / "data/reference/IMPORT.json").read_text(encoding="utf-8"))
def span(key):
    values = [float(row[key]) for row in rows]
    return [min(values), max(values)]
export = {
    "sourceRevision": manifest["revision"], "rowCount": len(rows),
    "provenance": "Unverified team research dataset; no clinical accuracy claim.",
    "coefficientSource": "research/models/dietary_cal_model.regression.txt (rounded original-scale export)",
    "coefficients": {"intercept": float(match[1]), "age": terms["Age"], "heightCm": terms["Height_cm"], "weightKg": terms["Weight_kg"], "activity": terms["Activity_Level"], "male": terms["Gender_Male"]},
    "ranges": {"age": span("Age"), "heightCm": span("Height_cm"), "weightKg": span("Weight_kg")},
    "activityEncoding": ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"],
    "omittedCategory": "Gender_Other is intentionally unsupported for physiological target estimation."
}
(ROOT / "src/lib/calorie-model.json").write_text(json.dumps(export, indent=2) + "\n", encoding="utf-8")
print(f"Exported coefficients and ranges for {len(rows)} rows; no binary model loaded.")
