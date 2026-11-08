# Handoff follow-up implementation plan

> For agentic workers: implement independent tasks in parallel where file ownership does not overlap; verify each deliverable before committing.

**Goal:** Apply the selected Inter Tight typography and complete the actionable interface and accessibility items in `docs/HANDOFF-CODEX.md`.

**Architecture:** Preserve browser-local inference, the existing scraper and dataset pipeline, current theme bootstrap, and all planning/restriction gates. Work in this checkout and commit coherent tested steps without pushing. The font comparison remains a separate temporary snapshot.

**Stack:** Existing React, TypeScript, Vite, Tailwind and Vitest. Prefer existing dependencies; self-host the selected font.

**Spec:** `docs/HANDOFF-CODEX.md`, plus the user's explicit approval to apply Inter Tight.

## Constraints

- Do not change the model coefficients/artifacts, original datasets, scraper, normalization, or medical/weight-change claims.
- Preserve explicit Apply, temporary body inputs, opt-in profile saving, freshness and allergy gates, unknown nutrition, and unofficial status.
- Preserve scarlet/white and charcoal/rose palettes. Maintain 16px fields, 44px controls, focus visibility and 320px reflow.
- Do not overwrite the untracked `.claude/` directory or concurrent user edits.
- Do not invent a deployed URL or redesign unrelated views.

## Review focus

- Long dish names and unknown nutrition must remain legible in compact rows.
- Restriction reasons and missing allergen information must survive density changes.
- Returning to System must restore OS following and remove the explicit theme key.
- Async menu loading must not flash a misleading hero title or lose its layout space.
- New typography must match the approved preview without leaking fonts into model/data behavior.

## Tasks

### 1. Restore discoverable System appearance

Files: `src/components/ThemeSwitcher.tsx`, `src/features/Settings.tsx`, new theme UI tests.

- Add a labelled Light/Dark/System control in Settings; retain the compact header icon.
- Reuse the current `terriertray:theme-change` and `theme-applied` events and bootstrap storage handling.
- Test icon labels/events, the System choice, and synchronization after external theme changes.
- Run relevant tests/typecheck, review, then commit only this task's files.

### 2. Compact menu rows without hiding safety information

Files: `src/features/MenuList.tsx`, new menu interaction tests.

- Lead with dish name and kcal per serving; keep the existing detail button and Add action.
- Move ordinary serving/station/protein detail to the existing dialog, retaining station filtering/search.
- Keep unknown-allergen and restriction reasons visible when relevant; missing calories remain explicit.
- Test detail opening, adding restrictions, filtering, unknown labels, and hostile source strings.
- Run relevant tests/typecheck, review, then commit only this task's files.

### 3. Apply Inter Tight and close regression gaps

Files: `public/fonts/`, `src/index.css`, `DESIGN.md`, targeted App/calculator tests.

- Self-host the already-previewed Latin variable font with its license and source attribution.
- Use 700 display headings and 600 section/button/nutrition emphasis, preserving 400 body text and tabular numerals.
- Cover the async hero loading state and calculator disclosure/error semantics without replacing model logic.
- Update only relevant typography/theme tokens in the design guide.
- Verify 320px and desktop, light/dark, populated plate, Week and dialog when browser access is available.
- Run the full suite, typecheck, direct Vite build, secret checks and diff checks; commit coherent steps.

### 4. Closeout

- Reconcile the handoff with completed work and remaining external dependencies.
- Keep the live README URL pending until a real deployment URL is supplied or verified.
- Report actual checks, commit IDs and any browser verification that could not run.

## Completion

- Typography: `42c51cf` (selected Inter Tight, self-hosted with license).
- Loading/calculator accessibility: `d5563e1`.
- Appearance: `36d58da`.
- Compact menu: `88e7ab6`.
- Week-to-plate focus found during browser verification: `9591f0e`.
- Original model, datasets and collector files were preserved. Node 24.22.1 is available and was used for the continuation checks.
- Deployment README URL still needs a confirmed real deployment; unrelated detector token drift remains advisory.
