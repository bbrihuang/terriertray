# Surface: TerrierTrays app (Plan / Week / Menu / Settings)

Mode: Operate. Scope: the whole single-page app. Audience and constraints: see PRODUCT.md.

## Direction contract

THESIS: A dining-hall plate planner organised as a day of meals. The memorable objects are the meal timeline (what's served when, and what you've planned for each meal) and the plate ring (planned vs target). It refuses the health-app reference's assistant, scanning, booking, supplements and invented progress.

OWN-WORLD: Red and white student identity: a warm off-white page, white rounded cards with soft depth, red pills for actions, soft red washes for selection, and near-black ink. Inter Tight, a two-tone headline, tabular numbers, and authored line icons in round tinted discs. The user-provided square TerrierTrays mascot logo overrides the earlier no-mascot rule; keep the unofficial-BU notice. The logo is a Home link that preserves plates and profile state.

STORY: A student sees which meal is being served now and what they've planned for each meal of the day. They estimate daily calories with the team's unchanged model if they want, review optional Balanced or Muscle-focused macro allocations around that budget, build or accept a plate in real portions, check the label and freshness, and walk to the counter. The calculator starts with feet, inches and pounds. Only an explicit Apply changes targets; applied macro grams are rounded to 0.1 g, and unchecking “Include suggested macros” keeps manual macro targets. Planned is never presented as eaten.

FIRST VIEWPORT: Brand row, two-tone headline (meal and hall / what to do), a compact hall/day card and the meal timeline card. On Plan, the approved daily summary sits below the meal selector and combines planned dishes across all halls for the selected date. Show four compact target rings for published calories and protein/carbs/fat grams, with the active plate and suggestions following. Omit derived macro energy, the percentage legend and repeated remaining amounts. Mark partial, loading and unavailable nutrition honestly; incomplete rings are dashed and labelled with coverage.

FORM: Standard web controls (selects, list buttons with aria-pressed, segmented tabs, native dialog). The world contributes palette, depth, the two-tone headline, the timeline rows and the plate ring. seed: none (pinned by brief: user's reference image, adapted to red and white).

MOTION: A calm 700ms initial sequence introduces header, hero and meals. Content arrives over 460ms; a clipped scarlet navigation pill moves over 480ms with counter-translated white labels; rings update over 650ms. No document-level keyboard/pointer animation toggles: field focus and typing must leave the current view steady. Keyboard navigation and active range controls are immediate. No decorative loops. Reduced motion shows the same final information without movement.

COMPATIBILITY: The visible name is TerrierTrays. Preserve the established singular profile/theme keys and theme event names rather than migrating storage for the rename.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
