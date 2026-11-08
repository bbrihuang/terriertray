<!-- impeccable:product-schema 1 -->
# Product

Inferred from the team's handoff brief (2026-11-07) without an interview. Items marked *(inferred)* need confirmation.

## Platform
web

## Stack
React 19, TypeScript, Vite, Tailwind CSS 4, static hosting on Vercel. Python collector runs in GitHub Actions.

## Users
BU students heading to a dining hall, usually on a phone, often minutes before a meal. Includes students managing food allergies, religious diets (halal) or vegetarian/vegan diets, and students with protein or calorie goals. Screen-reader and low-vision users are first-class (Hackcessability).

## Product Purpose
Turn published dining-hall menus into actionable plates: which dishes, how many servings, and how they add up against the student's own targets.

## Positioning
A calm utility, not a tracker or a diet coach. It complements BU's own menu pages and does not replace them. Unofficial.

## Operating Context
Standing in line or walking to a hall, on a small screen and possibly in bright light, with one hand. *(inferred)*

## Capabilities and Constraints
Menu data refreshes a few times a day, not live. About half of dishes lack allergen lists. Micronutrients are available only as % Daily Value. No accounts and no server-side profile.

## Brand Commitments
TerrierTrays name. Red and white student identity: white surfaces, red actions and accents, soft red ambient light, and readable text (see DESIGN.md). The user-provided square TerrierTrays mascot logo overrides the earlier no-mascot rule; the unofficial BU notice remains. No AI assistant imagery or "safe for you" claims. The logo links home to Plan without clearing current planning state.

## Evidence on Hand
Real scraped menus for West, Warren and Marciano (Nov 7–13, 2026). No user research. *(inferred)*

## Product Principles
Real data only; unknown stays unknown. One primary action per meal. Explain every suggestion. Restrictions are never relaxed automatically.

The approved daily summary sits below the meal selector and combines planned plates across all halls for the selected date. Published menu calories stay separate from approximate known macro energy calculated with 4/4/9 kcal per gram. Partial, loading and unavailable data stay labelled; incomplete totals do not produce exact remaining-target claims. Planned is never presented as eaten.

## Accessibility & Inclusion
WCAG 2.2 AA: measured contrast, 44 px targets, 16 px inputs, keyboard and screen-reader paths, reflow at 320 px and 200% text, reduced motion and reduced transparency. Inter Tight as the single typeface, selected by the user after an isolated font preview.

Short transitions may explain changes to views, meals, dialogs, plate contents and allocation bars. No decorative loops; reduced motion preserves the same information without movement.

## Optional target estimates
The team's unchanged trained calorie regression is the only calorie estimator: measurements → prediction → planning adjustment → review → explicit Apply. Feet, inches and pounds appear first; unit changes convert existing values. Runs on the device; inputs are temporary; out-of-range inputs are refused. No clinical accuracy claim.

Optional macro allocations wrap the final calorie budget. Balanced defaults to 20% protein and 30% fat; Muscle-focused defaults to 0.8 g protein per pound and 30% fat; carbs take the remainder. Native sliders edit protein and fat calorie shares without changing calories. Reject impossible splits instead of silently trimming protein. Edited shares persist across measurement, calorie and goal changes; selecting a preset or Reset split restores defaults. These are planning starting points, not model predictions or weight-change guarantees.

Preview the complete proposal before Apply. Optional macro targets are applied at 0.1 g precision; unchecking “Include suggested macros” preserves manual macro targets. Measurements and draft controls remain temporary; only explicitly applied targets enter the existing opt-in profile flow. Preserve singular storage keys (`terriertray.profile.v1`, `terriertray-theme`) for compatibility.
