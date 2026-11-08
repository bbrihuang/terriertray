# Surface: TerrierTrays app (Plan / Week / Menu / Settings)

Mode: Operate. Scope: the whole single-page app. Audience and constraints: see PRODUCT.md.

## Direction contract

THESIS: A dining-hall plate planner organised as a day of meals. The memorable objects are the meal timeline (what's served when, and what you've planned for each meal) and the plate ring (planned vs target). It refuses the health-app reference's assistant, scanning, booking, supplements and invented progress.

OWN-WORLD: Red and white student identity: a warm off-white page, white rounded cards with soft depth, red pills for actions, soft red washes for selection, and near-black ink. Inter Tight, a two-tone headline, tabular numbers, and authored line icons in round tinted discs. The user-provided square TerrierTrays mascot logo overrides the earlier no-mascot rule; keep the unofficial-BU notice. The logo is a Home link that preserves plates and profile state.

STORY: A student sees which meal is being served now and what they've planned for each meal of the day. They estimate daily calories with the team's unchanged model if they want, review optional Balanced or Muscle-focused macro allocations around that budget, build or accept a plate in real portions, check the label and freshness, and walk to the counter. The calculator starts with feet, inches and pounds. Only an explicit Apply changes targets; applied macro grams are rounded to 0.1 g, and unchecking “Include suggested macros” keeps manual macro targets. Planned is never presented as eaten.

FIRST VIEWPORT: Brand row, two-tone headline (meal and hall / what to do), a compact hall/day card and the meal timeline card. On Plan, the approved daily summary sits below the meal selector and combines planned dishes across all halls for the selected date. The active plate card and suggestions follow. Keep published menu calories distinct from approximate energy from known macros (4 kcal/g protein and carbs, 9 kcal/g fat). Mark partial, loading and unavailable nutrition honestly; incomplete data must not imply exact remaining targets.

FORM: Standard web controls (selects, list buttons with aria-pressed, segmented tabs, native dialog). The world contributes palette, depth, the two-tone headline, the timeline rows and the plate ring. seed: none (pinned by brief: user's reference image, adapted to red and white).

MOTION: Short, purposeful transitions can explain view and meal changes, dialogs, plate contents, calorie rings and macro allocation bars. No decorative loops. Reduced motion shows the same final information without movement; repeated keyboard controls remain immediate.

COMPATIBILITY: The visible name is TerrierTrays. Preserve the established singular profile/theme keys and theme event names rather than migrating storage for the rename.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
