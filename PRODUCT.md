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
TerrierTray name. Red and white student identity: white surfaces, red actions and accents, soft red ambient light, and readable text (see DESIGN.md). No AI assistant imagery. No BU logo or mascot. No "safe for you" claims.

## Evidence on Hand
Real scraped menus for West, Warren and Marciano (Nov 7–13, 2026). No user research. *(inferred)*

## Product Principles
Real data only; unknown stays unknown. One primary action per meal. Explain every suggestion. Restrictions are never relaxed automatically.

## Accessibility & Inclusion
WCAG 2.2 AA: measured contrast, 44 px targets, 16 px inputs, keyboard and screen-reader paths, reflow at 320 px and 200% text, reduced motion and reduced transparency. Atkinson Hyperlegible Next as the single typeface.

## Optional target estimates
The team's trained calorie regression is the only automatic estimator: measurements → prediction → review → explicit Apply (calories only). Runs on the device; inputs are temporary; out-of-range inputs are refused. No clinical accuracy claim.
