"""Export the team's trained calorie model for browser-local inference, at full precision.

    pip install -r research/requirements.txt
    python scripts/export-calorie-model.py

Reads research/models/dietary_cal_model.joblib (the team's fitted sklearn pipeline from
research/scripts/dietary_database.py) after checking its SHA-256 against
data/reference/IMPORT.json, and writes:

- src/lib/calorie-model.json: every fitted parameter the prediction uses (median
  imputer statistics, StandardScaler mean/scale, one-hot categories with drop='first',
  LinearRegression coefficients and intercept), plus the dataset's observed ranges.
- tests/fixtures/calorie-model-parity.json: predictions from the ORIGINAL pipeline for
  representative and boundary inputs; the browser implementation must match them.

Nothing is retrained and no other formula is used. Loading a joblib file runs pickle
code, so only the hash-verified team artifact is loaded.
"""
import csv
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "research/models/dietary_cal_model.joblib"
DATA = ROOT / "data/reference/healthy_diet_calorie_intake.csv"
MANIFEST = json.loads((ROOT / "data/reference/IMPORT.json").read_text(encoding="utf-8"))

# Same strings and order as research/scripts/dietary_database.py.
ACTIVITY = ["sedentary", "lightly active", "moderately active", "very active", "extremely active"]
NUMERIC = ["Age", "Height_cm", "Weight_kg", "Activity_Level"]

expected = next(f["sha256"] for f in MANIFEST["files"] if f["path"].endswith("dietary_cal_model.joblib"))
actual = hashlib.sha256(MODEL.read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit(f"Model hash {actual} does not match IMPORT.json ({expected}); refusing to load.")

pipeline = joblib.load(MODEL)
pre = pipeline.named_steps["preprocessor"]
reg = pipeline.named_steps["regressor"]
num = pre.named_transformers_["num"]
cat = pre.named_transformers_["cat"]
encoder = cat.named_steps["encoder"]

# The export below assumes exactly the training script's structure; stop if it differs.
if [list(c) for _, _, c in pre.transformers_[:2]] != [NUMERIC, ["Gender"]]:
    raise SystemExit(f"Unexpected column layout: {pre.transformers_}")
if encoder.drop != "first" or list(encoder.categories_[0]) != ["Female", "Male", "Other"]:
    raise SystemExit(f"Unexpected Gender encoding: drop={encoder.drop}, categories={encoder.categories_}")

scaler = num.named_steps["scaler"]
coef = reg.coef_.astype(float)

with DATA.open(encoding="utf-8", newline="") as f:
    rows = list(csv.DictReader(f))
span = lambda key: [float(min(float(r[key]) for r in rows)), float(max(float(r[key]) for r in rows))]

export = {
    "sourceRevision": MANIFEST["revision"],
    "modelSha256": actual,
    "sklearnVersion": sklearn.__version__,
    "trainingScript": "research/scripts/dietary_database.py",
    "provenance": "Team research dataset of unrecorded origin; no clinical validation.",
    "numericFeatures": NUMERIC,
    "numericMedians": num.named_steps["imputer"].statistics_.astype(float).tolist(),
    "scalerMean": scaler.mean_.astype(float).tolist(),
    "scalerScale": scaler.scale_.astype(float).tolist(),
    "genderCategories": list(encoder.categories_[0]),
    "genderDropped": "Female",
    "genderMostFrequent": str(cat.named_steps["imputer"].statistics_[0]),
    "coefficients": coef.tolist(),  # [Age, Height_cm, Weight_kg, Activity_Level, Gender_Male, Gender_Other] in scaled space
    "intercept": float(reg.intercept_),
    "activityLevels": ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"],
    "ranges": {
        "age": span("Age"),
        "heightCm": span("Height_cm"),
        "weightKg": span("Weight_kg"),
        "kcal": span("Daily_Calorie_Requirement"),
    },
}
(ROOT / "src/lib/calorie-model.json").write_text(json.dumps(export, indent=2) + "\n", encoding="utf-8")

# Parity cases: typical people plus every range boundary, each activity level and category.
r = export["ranges"]
cases = [
    (25, "Male", 175, 70, 2), (25, "Female", 165, 60, 1), (40, "Other", 170, 80, 3),
    (r["age"][0], "Female", r["heightCm"][0], r["weightKg"][0], 0),
    (r["age"][1], "Male", r["heightCm"][1], r["weightKg"][1], 4),
    (19, "Male", 198.6, 40, 4), (80, "Female", 145, 116.6, 0), (33, "Male", 181.3, 77.7, 3),
]
cases += [(30, g, 170, 70, a) for g in ("Female", "Male", "Other") for a in range(5)]
frame = pd.DataFrame(
    [{"Age": a, "Gender": g, "Height_cm": h, "Weight_kg": w, "Activity_Level": l} for a, g, h, w, l in cases]
)
predicted = pipeline.predict(frame)
parity = [
    {"age": a, "gender": g, "heightCm": h, "weightKg": w, "activity": l, "kcal": float(p)}
    for (a, g, h, w, l), p in zip(cases, predicted)
]
(ROOT / "tests/fixtures/calorie-model-parity.json").write_text(json.dumps(parity, indent=2) + "\n", encoding="utf-8")

# Show how far the 4-decimal text equation drifts from the real model.
text = ROOT / "research/models/dietary_cal_model.regression.txt"
print(f"Exported full-precision parameters (sklearn {sklearn.__version__}) and {len(parity)} parity cases.")
print(f"Model: {text.read_text(encoding='utf-8').strip()}")
print(f"Sample (25, Male, 175 cm, 70 kg, Moderately Active): {predicted[0]:.6f} kcal/day")
