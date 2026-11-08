# Repair motion and simplify daily targets

The user reported a full-page flash when moving between typing and clicking, rushed animations, poor navigation motion, absent introductions and cluttered daily totals. Requested outcome: calmer arrivals and four daily target rings, with no approximate-energy explanation in that summary. Preserve all original model, dataset, scraper, privacy, freshness and restriction behavior.

## Evidence and repairs

- The document-level keyboard/pointer listeners switched the main animation between `none` and `surface-enter`; the browser reproduced that switch without any React remount. Remove these global motion triggers. A regression checks that editing and focusing fields keeps the same main/input nodes and does not rewrite document motion configuration.
- Daily-target edits reran `planMeal()` in Settings. The regression failed before adding a Plan-only guard; optimization now runs on Plan while Week keeps its own existing planning path.
- Replace the chasing outline with a clipped scarlet navigation pill. Its white decorative labels counter-translate with the pill, staying aligned with the stationary accessible buttons and retaining contrast throughout movement. Native button focus and keyboard activation remain intact; keyboard navigation is immediate.
- Use one calmer initial sequence for header, hero and meal selector, with shorter content arrivals during deliberate view changes. The choice to animate a view is captured when it mounts and never changes on field focus or typing. Use existing easing conventions, native CSS, reduced-motion alternatives, no new dependency and no decorative loops.
- Four daily rings show published calories and protein/carbs/fat grams versus the existing daily targets. Remove derived macro energy, percentage legend and repeated remaining amounts from this summary. Keep unknown, missing-target, partial and over-target states honest. Preserve all-hall/date aggregation unchanged.

## Verification

Run regression tests, the full current suite, TypeScript, direct Vite build, secret checks and protected-path diff. Verify typing/clicking before and after, navigation label alignment, light/dark rings and mobile reflow in the browser. Commit coherent fixes; do not push without another user instruction.

## Results

Both bug regressions failed before the source fixes and passed afterward. The full suite now has 171 passing tests across 16 files; TypeScript, direct Vite build and built-output secret checks passed. Browser before/after readings confirmed the whole-view animation no longer toggles during typing/clicking; keyboard navigation is immediate. The navigation's decorative/base icon positions match exactly at desktop and 320px, and both themes show four clear target rings without horizontal overflow. Reduced-motion behavior was reviewed in guarded CSS; OS preference emulation and full assistive-software testing were not performed. No model, original dataset, inference or scraper changes were made.
