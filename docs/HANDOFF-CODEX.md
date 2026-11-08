# TerrierTrays: handoff for Codex

Repository: `C:\Users\Brian\code\terriertrays` (GitHub `bbrihuang/terriertrays`), branch `main`.
Stack: React 19 + TypeScript + Vite + Tailwind 4, static on Vercel. All planning and calorie inference run in the browser; there is no backend, account system or database.

Read first: `PRODUCT.md`, `DESIGN.md`, `docs/DEVELOPMENT.md` (developer guide), `docs/REFERENCE_DATA.md`. `README.md` is the user-facing guide.

## Critique and polish — November 8, 2026

User requested Impeccable critique/polish and Ponytail, then chose compact mobile layout and inline replacement Undo. Independent design/browser assessments and a separate code audit produced the before-polish26/40 archive in `.impeccable/critique/2026-11-08T06-18-06Z__src-app-tsx.md`. The detector's13 existing font/palette/radius observations were reviewed; they did not justify replacing the pinned visual direction.

- Calculator Apply uses the existing shared profile maximum without changing model prediction/adjustment logic; invalid storage writes preserve the previous valid profile rather than causing settings loss on reload.
- Menu station filtering and select display agree when the selected station disappears. Duplicate-only planner candidates return a useful infeasible state. Unanswered allergy setup is neutral; genuine conflicts, unknown-allergen handling and blocked adds remain intact.
- Public menu index revalidates on tab return, retains validated data after refresh failure and avoids overlapping requests. Day loads are tagged by request/version so a new index cannot briefly expose old-version payloads under unchanged file paths.
- Manual target, allergy and calculator shortcuts focus the correct Settings heading. Week blocked states include contextual actions and generated meals are labelled suggestions. Filled-plate actions say Replace my plate; Undo restores the prior portions and disappears after a manual edit or restriction change.
- Mobile header/hero/meal rows are more compact, both planning shortcuts stay visible, hall/day controls fit at320px, and the48px field minimum now wins over utilities. Removed the unused Atkinson dependency; the self-hosted Inter Tight asset/license stay unchanged.

Final checks: **197 tests in17 files**, TypeScript, direct Vite build, built-output secret scan and whitespace checks pass. Browser checks verified direct heading focus, replacement Undo/focus return, weekly suggestion wording, light/dark mobile layout,48px fields and no horizontal overflow. A clean reload was used after hook changes to discard stale development hot-reload state. No new overlay server or detector injection was possible/needed; evidence used CLI scan, source, native browser snapshots/geometry and interaction. No live Vercel verification, real touch-device/screen-reader audit, OS reduced-motion emulation, or scheduled collector run was performed. Original model artifacts, inference helper, original datasets and collector are unchanged. New commits remain local until asked to push.

## Background appearance update — November 8, 2026

The user rejected the heavy red light-mode gradient and requested a very subtle animated background, then clarified that the gradient itself must move rather than fade/change colors. Light mode uses porcelain, pale blue and lavender, with scarlet reserved for actions/progress; the existing dark hero palette remains intact. Noninteractive `body::before` and `.planner-hero::before` layers overscan their containers by 10% and slowly translate ±3% horizontally / ±1.5% vertically over 28 seconds in each direction, starting 7 seconds into the cycle. Colors and opacity stay fixed (page layer 0.55). There are no JavaScript timers or background-position animation. Content stays stationary. Input/select focus and open dialogs pause both layers without restarting; reduced motion makes them static, and forced colors hides them. Working cards remain opaque. The original color-only implementation was committed/pushed as `558d363`; this movement correction is local until the user asks to push. No models, datasets, scraper, planner or profile logic changed.

Movement verification: browser readings showed both layer transforms changing while opacity and headline coordinates stayed identical. Focused-input checks froze both transform matrices exactly and resumed afterward. Light/dark views at desktop/320px had no horizontal overflow or browser warnings/errors. Direct Vite build and whitespace checks passed. Reduced-motion selectors were reviewed; OS preference emulation was not performed.

The movement correction was pushed as `45c481d`. The user then requested clearer shadows on the boxes: the hero and existing cards now share a soft contact shadow plus a broader neutral falloff, with deeper black shadows in dark mode. Mobile's transparent context card remains shadow-free. Light/dark desktop and 320px checks, production build and whitespace checks passed. No layout, motion, model, dataset, scraper or planner behavior changed for the shadow update.

## Motion and daily-summary repair — November 8, 2026

The user reported rushed/replaying animation and a cluttered summary. This repair supersedes the earlier outline indicator and derived-energy summary:

- Removed document-wide keyboard/pointer animation toggles. They restarted the main entrance on each typing-to-clicking switch; the browser reproduced the animation changing from `none` to `surface-enter` without a React remount. A regression now protects stable Settings/input nodes, focus and page motion configuration.
- Gated plate optimization to Plan. Settings target edits previously ran `planMeal()` per character; Week keeps its existing separate planning path.
- Added a calmer 700ms header/hero/meal intro. View arrival is 460ms, the clipped scarlet navigation pill 480ms and ring progress 650ms. Decorative white nav labels counter-translate to retain alignment and contrast. Keyboard navigation is immediate; the view captures its animation choice on mount, so field focus cannot replay it. Active range controls remain immediate. Reduced-motion CSS keeps the final state without movement.
- Replaced daily-stat paragraphs and derived-energy material with four target rings: published calories, protein, carbs and fat. Rings cap visually at 100% while retaining actual totals, use dashed partial progress with coverage and stay empty when nutrition/targets are unknown. No derived-energy explanation, percentage legend or repeated remaining amounts in this summary. The existing allocation wrapper, calorie model, datasets, aggregation and scraper remain unchanged.

Verified: **171 tests in 16 files**, TypeScript, direct Vite production build and built-output secret checks passed on Node 24.22.1. Browser checks confirmed stable animation/opacity while switching between typing and clicking, immediate keyboard navigation, exact overlay-label alignment, and light/dark rings at desktop and 320px. No full screen-reader or OS reduced-motion emulation was run. Existing font/palette/radius detector advisories remain intentional/out of scope. Changes are local; push only when asked.

## Current continuation — motion, macros, branding and daily totals

The current approved behavior supersedes the historical calories-only and no-mascot constraints below:

- The visible name is **TerrierTrays**. The user-provided square mascot logo is the approved asset and links home to Plan without clearing profile or plates. Preserve the unofficial-BU notice. Keep the singular `terriertray.profile.v1`, `terriertray-theme` and `terriertray:*` identifiers for compatibility.
- The calculator starts with feet, inches and pounds; unit switching converts existing values. The original regression, its exports and parity fixtures, source datasets, scraper and normalization remain unchanged.
- Optional Balanced (20% protein / 30% fat / rest carbs) and Muscle-focused (0.8 g protein/lb / 30% fat / rest carbs) allocations wrap the final calorie budget. Native protein/fat sliders never alter calories. Custom shares persist across body, calorie and goal changes; choosing a preset or Reset split restores defaults. Reject impossible splits rather than silently reducing protein. These are planning starting points, not model predictions or guarantees.
- Preview calories, grams, kcal and percentages before explicit Apply. Included macro targets are applied at 0.1 g precision; uncheck “Include suggested macros” to preserve manual macros and apply calories only. Draft measurements and controls remain temporary; only applied targets enter the existing opt-in profile flow.
- The approved daily summary sits below the meal selector on Plan. It combines planned plates across all halls for the selected date. Four rings compare published calories and macro grams with daily targets; derived-energy statistics are omitted. Partial, loading and unavailable nutrition stay labelled; incomplete totals must not imply exact remaining targets. All totals are planned, not eaten.
- Purposeful introductions and transitions are allowed for view/meal changes, dialogs, plate contents, rings and allocation bars. Preserve stable fields, immediate keyboard feedback and reduced-motion equivalents; no decorative loops.

The current changes are local; do not push without the user's instruction. Run the current verification commands below rather than relying on historical test counts.

Historical verification (November 7): **167 tests across 16 files passed** on bundled Node 24.22.1, along with TypeScript, direct Vite production build, built-output secret checks and whitespace checks. Browser checks covered light/dark desktop views, 320px reflow, keyboard sliders, explicit macro Apply, Home focus/state preservation and two dining halls contributing to the same day's total. Reduced-motion behavior was reviewed in the guarded CSS; no operating-system preference emulation or complete screen-reader audit was performed. The detector's Inter warning conflicts with the user's explicit Inter Tight choice; existing palette/radius advisories remain outside this task. The former transparent-outline navigation treatment was superseded by the November 8 repair. Protected model, original dataset and collector paths had an empty diff from `8bcc670`.

## Codex continuation — November 7, 2026

The user approved continuing the suggested work and selected **Inter Tight** after a separate interactive font preview. The original handoff below is historical. These continuation commits are local and have **not** been pushed:

- `42c51cf`: self-hosted Inter Tight with its OFL license, stronger approved weights, and updated typography guidance.
- `d5563e1`: async headline accessibility state and calculator disclosure/error coverage; clarified that the 111 kcal error is from held-out dataset rows.
- `36d58da`: Settings → Appearance restores discoverable Light/Dark/System choices while keeping the header icon; tests execute the unchanged theme bootstrap.
- `88e7ab6`: compact menu rows keep name and per-serving calories prominent, detail access, missing nutrition and restriction warnings, and Added state.
- `9591f0e`: applying a weekly meal moves focus and scroll to its own plate after rendering, including when another day must load.

The phone verification also refined the populated plate at 320px: the calorie summary stacks clearly, and all three macro cells retain equal columns.

Original model artifacts, source datasets, scraper and normalization code remain unchanged. Appearance is still separate from opt-in personal profile storage. The font experiment is isolated outside this repository; the selected font alone was applied to the app.

That continuation was verified using the bundled **Node 24.22.1**, resolving the old Node-26-only verification limitation. At that point the suite contained **119 tests in 12 files**. Browser checks covered compact menus, native dish dialogs, weekly meals and a populated plate at phone/desktop sizes, light/dark appearance, keyboard opening/closing and focus return. These checks do not constitute a full assistive-software audit.

The remaining external item is a confirmed live deployment URL for the README. No URL was invented. Detector-wide palette/radius drift remains advisory; this continuation updated relevant typography and appearance guidance rather than rewriting unrelated design tokens.

## State at handoff

All commits below are **pushed to `origin/main`**. Do not amend or rewrite them, and push new work only when the user asks.

| Commit | What it did |
| --- | --- |
| `0b15b8e` | Scarlet-and-white redesign: soft gradient hero, rounded surfaces, responsive layouts |
| `289a693` | Light / Dark / System appearance (`public/theme.js` resolves before first paint) |
| `bec88a6` | Maintaining / Cutting / Bulking labels with visible kcal differences |
| `9dd8f0d` | Central `planTarget()` adjustment helper plus validation tests |
| `7306e59` | Editable kcal/day adjustment UI for Cutting/Bulking; old % presets removed |
| `41dadd6` | Fix: hero headline flashed "Your next BU meal…" before "Dinner at <hall>" on reload |
| `10fba51` | Copy declutter (impeccable critique), removed "BU dining, planned" tagline, sun/moon icon theme toggle |
| `4e97374` | This handoff |
| (latest) | User-facing README; old developer README moved to `docs/DEVELOPMENT.md` |

A local, untracked `.claude/launch.json` exists so Claude's browser pane can run `npx vite`. It is not part of the project. Ignore it or delete it.

## What was done this session

### 1. Editable calorie adjustments (around the unchanged model)
- `src/lib/target-calculator.ts`
  - `predictCalories()` is **unchanged**. It is the team's exported regression.
  - New `Goal` type, `GOALS` and `defaultAdjustmentKcal()` (10% of the estimate, rounded).
  - New `planTarget(modelKcal, goal, amountText)`. It is the only place a goal turns the prediction into a target:
    - Maintaining applies 0.
    - Cutting subtracts the typed nonnegative whole-kcal magnitude; Bulking adds it.
    - It returns `{estimate, adjustment, target}` or `{error}`.
    - It rejects blank, negative (including the Unicode minus), fractional, exponent, nonfinite, non-numeric and unsafe-integer amounts, and any target ≤ 0.
    - `0 - 0` is used so that "0" never displays as −0.
  - The old `PLANNING_GOALS` and `applyAdjustment` were deleted, so there are no competing percentage and kcal states.
- `src/features/TargetCalculator.tsx`
  - The goal is a radio group.
  - Cutting/Bulking show a text input with `inputMode="numeric"`, so invalid input keeps what was typed.
  - While unedited (`amount === null`), the amount follows the current estimate. Once edited, it is preserved across goal changes and body-input changes.
  - A `<dl>` shows the model estimate, the signed adjustment and the proposed target, which reconcile exactly.
  - When the amount is invalid, the error is linked with `aria-describedby`, `aria-invalid` is set, and Apply is hidden.
  - Any edit clears the "Applied" status.
  - Reset in Settings remounts the component through `key`, which clears all state.
- Verification case: 25 y, Male, 175 cm, 70 kg, activity 2.
  - Unrounded estimate is 2717.80; it displays as 2,718.
  - Default Cutting gives 2,446; default Bulking gives 2,990.
  - Cutting 400 gives 2,318.

### 2. Hero headline flash
`src/App.tsx`: `heroLoading = tab === "plan" && day?.state === "loading"`. While it is true, the headline is wrapped in `invisible`, which keeps the space and avoids layout shift. The index-loading state was already covered by a skeleton early return.

### 3. README rewrite
- `README.md` is now written for students using the app: what it does, getting started, the calorie estimate and its limits, an allergy warning, data freshness, and privacy. It avoids developer detail.
- All previous developer content (commands, data flow, deployment, Fenway, model export) moved unchanged to `docs/DEVELOPMENT.md`. Relative links were fixed, and `docs/REFERENCE_DATA.md` now points there.
- The README links to BU Dining, not to a deployed URL, because none was confirmed. Add the live Vercel URL once the user gives it.
- Keep the README's claims in sync with the UI copy: the 10% default, the ~111 kcal error, diet tags (`DIET_TAGS` in `src/lib/restrictions.ts`), strict handling of unknown allergens, and the 24-hour freshness rule.

### 4. Declutter, tagline and theme toggle
- The `impeccable` critique ran as two isolated reviews:
  - The design review scored 25/40, with "Aesthetic & minimalist" at 1/4.
  - The detector found that 56–80% of visible words were muted subtext.
- Each caveat is now said once, where it applies. Removed or shortened:
  - The hero descriptions on Plan, Week and Settings. Menu keeps only "Dinner · N dishes".
  - The repeated privacy and "not advice" lines.
  - The duplicate cross-contact sentence in `DishDialog`.
  - Verbose onboarding, notice, plate and settings helper text.
  - The two footer paragraphs, merged into one and capped at `70ch`.
- In Plate, the two muted meta lines for each dish are merged into one.
- The calculator's provenance (dataset size, held-out error, "Other" gender coefficient, undefined activity levels, model/data hashes) moved into an "About this model" `<details>`.
- In Settings, the "Allergies not set · Edit" row is hidden, because it linked to the page itself.
- The header tagline "BU dining, planned" is removed, along with its CSS.
- `src/components/ThemeSwitcher.tsx` is now a single `IconButton`. It shows a moon in light mode and a sun in dark mode, and dispatches the existing `terriertray:theme-change` event. `public/theme.js` is unchanged. `DESIGN.md` is updated.

## Contracts to keep (do not break)
- **Model and data are the source of truth.** Do not retrain, edit coefficients, regenerate or replace any of these:
  - `research/models/dietary_cal_model.joblib`
  - `src/lib/calorie-model.json`
  - `tests/fixtures/calorie-model-parity.json`
  - The source CSVs in `data/reference/`
  - The scraper and normalization code in `collector/`

  Do not add a second model or standard equation either.
- Adjustments and the approved optional macro allocations are user-chosen planning rules, not predictions. No weight-change claims, timelines, "safe minimums", AI goal models or automatic exercise calories. Macro allocations must wrap the unchanged final calorie budget.
- Measurements stay in component memory: never saved, sent, logged or put in URLs. Profile storage stays opt-in. Theme storage (`terriertray-theme`) is separate and nonpersonal.
- Apply changes daily calories and, when “Include suggested macros” is checked, the previewed macro targets at 0.1 g precision, only on an explicit click. Unchecking preserves manual macro targets.
- Keep these visible:
  - Allergy-answer gating, unknown-allergen text and cross-contact "Ingredient notes".
  - Freshness pill and stale-menu labels, plus freshness checks at recommendation time and at action time.
  - "Planned, not eaten" and the per-meal target share.
  - The unofficial-BU notice and "not medical advice".
  - The measurement privacy line, the scope checkbox and the warning that remembered settings are stored unencrypted.
- Fenway/Sodexo stays deferred.
- Design:
  - Keep the scarlet/white light palette and the charcoal/rose dark palette.
  - Inputs ≥16px, targets ≥44px, visible focus.
  - Work at 320px with no horizontal scroll.
  - Use the approved square TerrierTrays mascot logo and retain the unofficial notice. Short, purposeful, reduced-motion-aware transitions are allowed; no loops.
  - Keep the four-ring daily summary below the meal selector, scoped to all planned halls for the selected date. Use published calories and macro grams against daily targets; label partial data honestly and omit derived-energy clutter.

## Verify
Use Node 24 (`.nvmrc`); the bundled Node 24.22.1 has been used for continuation verification.

```bash
npm run typecheck
npm test                 # run the current suite; historical counts above are snapshots
npm exec vite build      # avoid `npm run build`: its prebuild refetches menu data
npm run check:secrets
git diff --check
```

## Original suggested next steps (see continuation status above)
1. **Menu view density.** It is still ~80% muted/small text, because each dish lists station, serving, calories and tags. Consider a compact row (name and kcal) with details in the dish dialog. This is a design change, so confirm with the user first.
2. **Way back to System theme.** The icon button can't return to "follow system" once clicked. Options: long-press or context menu, a "Use system" link in Settings → Privacy, or leave it as is. Ask the user.
3. **Unverified views.** The Week view and the DishDialog weren't checked in a browser after the declutter, and neither was a plate with dishes on it (ring, "known for" lines, merged meta line). Do a light and dark pass at 320px and at desktop width.
4. **Accessibility pass.** No keyboard-only or screen-reader run-through yet: radio goals, adjustment error, "About this model" disclosure, icon toggle label.
5. **Detector drift** (advisory, `impeccable detect --json src`):
   - Six colors and seven radii in `src/index.css` aren't in `DESIGN.md` (mostly dark-theme tones and pill radii). Decide whether to add them to DESIGN.md or remap them.
   - The `radial-halo` and nested `context-card` findings are intentional per DESIGN.md.
6. **Test gaps.** There is no UI test for the hero-loading `invisible` wrapper or for `ThemeSwitcher`. `tests/theme.test.ts` covers `public/theme.js` only.
7. **README live link.** Add the deployed app URL to the top of `README.md` once the user confirms it.
