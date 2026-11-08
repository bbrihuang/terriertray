# Motion, macros and TerrierTrays branding

**Approved scope:** More interface animation; feet/inches/pounds first; automatic, editable macros around the unchanged calorie model; square supplied logo; TerrierTrays name; working top-left Home navigation. Commit coherent verified steps, do not push.

## Invariants

- Do not edit regression inference, model exports/artifacts/parity fixtures, original datasets, scraper or normalization. Calorie prediction and existing user-chosen calorie adjustment remain the source of the calorie budget.
- Macro rules divide that final budget; changing a macro slider cannot alter the calorie target or refit the model.
- Measurements and draft controls remain component-local; only explicitly applied calorie/macro targets enter the existing opt-in profile flow.
- Review the complete proposal before Apply. Offer calories-only application so manual macro targets can remain untouched when desired.
- Keep allergy/freshness gates, unofficial status, 320px layout, keyboard access and reduced motion.

## Implementation choices

1. Pure macro wrapper and a controlled UI: Balanced starts at 20% protein / 30% fat / remainder carbs; Muscle-focused starts at approximately 0.8g protein per pound and 30% fat / remainder carbs. These are clearly labelled planning starting points, not outputs of the trained model or promises of muscle gain. NIH ODS describes athlete protein needs around 0.55–0.9g/lb and fat 20–35% of calories; National Academies adult reference ranges are provided in expandable explanatory copy, not treated as universally safe cutoffs.
2. Two labelled native sliders edit protein and fat calorie shares, with carbohydrates as the remainder. Show all grams, kcal and percentages, with a three-segment calorie bar. Reject impossible/nonpositive splits rather than changing calories or silently trimming a weight-based protein target. Keep edited splits until explicitly reset.
3. Calculator defaults to US units and lists them first. Convert existing values when switching units rather than relabelling numbers. Integrate optional macro targets with the existing explicit Apply callback; reset clears all new drafts.
4. Add purposeful motion: view/meal transitions, dialog entrance/exit where practical, plate/ring updates, new dish feedback and controlled bar changes. Keep keyboard/rapid repeated controls responsive; no permanent decorative loops. Reduced motion shows the same final information without movement.
5. Prepare a square version of the supplied logo, keep the original design/text, integrate accessible raster assets and favicon. Use TerrierTrays throughout visible UI. Top-left brand is a real link that returns to Plan without clearing current profile/tray state and moves focus appropriately.

## Work ownership

- Macro worker: new `src/lib/macro-targets.ts`, `src/features/MacroTargets.tsx`, associated tests; no calculator/settings files.
- Calculator worker: `TargetCalculator.tsx`, `Settings.tsx`, calculator interaction tests and US-unit behavior; imports the agreed macro interfaces.
- Asset worker: square transparent supplied-logo asset only, no source files.
- Parent: shared CSS/motion, App/home/brand, UI helpers, docs, final integration, browser checks and commits.

## Daily totals addition — placement approved by user

Use a full-width daily summary directly below the meal selector and before the current plate/suggestions. It combines all planned plates for the selected date across BU halls, using the current published day files through existing cached hooks. Preserve existing tray and menu schemas. Show the daily calorie and macro totals against whole-day targets, and a separate approximate 4/4/9 calorie breakdown from known macros. Provider calorie labels remain the source for menu calorie totals; do not force those to equal derived macro calories. Missing/unresolved dishes produce partial/loading/unavailable states, never a misleading complete zero. Nothing is described as eaten. Review hierarchy, label contrast, empty/partial states and 320px reflow using the current design guidance.

## Verification

Run meaningful macro arithmetic/invalid-split tests, US conversion and calculator Apply/privacy/reset tests, Home-navigation regression tests, and all existing tests on Node 24. Build directly with Vite and run secret/diff checks. Verify both themes at phone/desktop sizes, pointer/keyboard sliders, motion/reduced-motion behavior, logo readability, unchanged calorie prediction as sliders move, and git diff of protected source paths.

Sources: https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/ ; https://www.nationalacademies.org/read/27957/chapter/5

## Completed verification

167 tests in 16 files, TypeScript, direct Vite production build and built-output secret check passed using Node 24.22.1. Browser checks covered both themes, 320px reflow, native keyboard sliders, explicit target application, Home focus/state preservation and cumulative totals from two halls. CSS contains reduced-motion equivalents; OS preference emulation and a full screen-reader audit were not run. The selected tab retains a stationary solid fill during the outline animation so label contrast remains stable. The macro bar animates transforms rather than layout. The daily summary is the first content inside the main landmark, below the meal selector. Original inference, model artifacts, parity fixtures, datasets and collector paths remain unchanged.
