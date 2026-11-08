# Reference data inventory

Inspected on 2026-11-07. The data branch has been integrated into main: CSVs live in data/reference, scripts in research/scripts, and model artifacts in research/models. IMPORT.json records the source revision and file checksums. The calorie estimator uses the trained regression exclusively, via a full-precision export of its fitted parameters (see the README); raw CSVs and binary models are not bundled. Each would need a documented source and licence first, and the reasons below would need resolving.

| File | What it is | Source / licence | Why it is not used yet |
| --- | --- | --- | --- |
| `vitamins-RDAs.csv` → `cleaned_vitamins.csv` (`clean_rda.py`) | 21 life-stage groups × 14 vitamins (µg/mg), reshaped to rows of age group, sex, nutrient and amount | Not recorded. Values resemble the NASEM Dietary Reference Intakes tables ([NIH ODS](https://ods.od.nih.gov/healthinformation/nutrientrecommendations.aspx)). | (1) The cleaned table merges RDA and AI values (the source marks AIs separately) and has no UL column. (2) BU labels give no vitamin amounts except vitamin D, and that only as % Daily Value. There is nothing on the menu side to compare against. |
| `exercise_dataset.csv` → `cleaned_activity.csv` (`clean_activity.py`) | 248 activities with kcal per hour at 130/155/180/205 lb, plus kcal/kg | Not recorded. The layout resembles widely republished MET-based tables. | Activity energy would double-count if combined with a calorie model that already includes activity level. The calculator already includes usual activity, so this activity table is not added again. |
| `healthy_diet_calorie_intake.csv`, `dietary_database.py`, `dietary_cal_model.*` | 6,000-row dataset and a linear regression for daily calories | Provenance, consent and whether the data is synthetic are unknown. | The only calorie estimator. The hash-verified joblib was loaded in an isolated environment to export full-precision parameters, and predictions are parity-tested against it. Inputs outside the dataset's ranges are refused. Not evidence of clinical validity. The Other-category coefficient is not applied (team decision). |
| `bu_dining_menu.csv` (local file, not in this repo) | 504 rows by weekday (no dates) for the three halls | Unknown | It does not match the scraped labels (for example, Marciano scrambled eggs show 160 kcal there vs 140 kcal on bu.edu), and only 58 of 504 names match. Treated as illustrative, not seed data. |

## What the site uses instead

- **Targets:** typed in by the user or explicitly applied from the model estimate (calories only), split evenly across their chosen number of dining-hall meals and labelled as a share.
- **Micronutrients:** BU's % Daily Value is shown as printed ("general reference, not a personal target"). It is not scored. See [data-coverage.md](data-coverage.md).
