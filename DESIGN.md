---
name: TerrierTrays
description: A BU dining planner with cool porcelain surfaces and scarlet actions
colors:
  page: "#f7f7f9"
  surface: "#ffffff"
  field: "#ffffff"
  ink: "#202024"
  muted: "#65636e"
  control: "#98949f"
  action: "#cc0000"
  on-action: "#ffffff"
  accent-ink: "#b00000"
  accent-soft: "#fff0f0"
  hero-lavender: "#eeeaf6"
  hero-ice: "#e4ecf7"
  hero-ground: "#f7f8fc"
  hero-copy: "#4d5261"
  hero-muted: "#656978"
  onboarding-ice: "#eef2fa"
  ambient-dark-violet: "#313041"
  ambient-dark-slate: "#252f36"
  danger: "#a72821"
  danger-soft: "#fff0ed"
  warn: "#86420e"
  warn-soft: "#fff5e8"
  ok: "#246540"
  ok-soft: "#eaf5ee"
  focus: "#34343a"
typography:
  family: "Inter Tight, ui-sans-serif, system-ui, sans-serif"
  headline: "36–52px / 1.08 / 700"
  figure: "40px / 1 / 600; tabular numerals"
  section: "20px / 1.4 / 600"
  body: "16px / 1.5 / 400"
  meta: "12–14px / 1.5 / 400"
rounded:
  hero: "36px"
  card: "28px"
  inner: "16px"
  button: "999px"
spacing:
  grid: "4px"
  card-padding: "24px"
  section: "24–32px"
components:
  control-height: "44px minimum"
  field-height: "48px minimum"
  card: "Opaque white with one quiet, neutral shadow"
  primary: "Scarlet fill, white text"
  focus: "Visible neutral outline"
---

# TerrierTrays design system

**Direction:** Put the day's real dining-hall choices on a calm white surface, with BU scarlet guiding the next action.

Visual inspiration: [AI Healthcare Assistant App](https://dribbble.com/shots/27870676-AI-Healthcare-Assistant-App) by **NexUX Product / Nexux Lab**. This is an adaptation for a student dining planner, not a healthcare interface or a BU-endorsed product.

## Reference and adaptation

Observed reference traits: broad rounded white panels, large two-tone headings, circular line-icon controls, compact numeric summaries, generous grouping, and a soft multicolor gradient material.

Adaptation choices: the user requested the reference's gradient quality alongside BU scarlet and white, then rejected the heavy red gradient in light mode. Use a bright porcelain hero with pale ice blue and lavender; reserve scarlet for actions, progress and selection. Working cards stay opaque. A fixed ambient gradient behind the page slowly changes opacity over 32 seconds in each direction, without panning or moving content. It pauses while inputs/selects are focused or a dialog is open and stays static with reduced motion. Dark mode keeps its existing hero material with a quiet violet/slate ambient layer. There are no drifting blobs or frosted cards.

The user-provided square TerrierTrays mascot logo is the approved brand asset, replacing the earlier no-mascot direction. Keep its original design and text; do not substitute official BU artwork or imply endorsement. The unofficial student-project notice remains visible.

## Appearance

A single sun/moon icon button in the header switches between Light and Dark. Settings → Appearance offers Light, Dark, and System; System removes the explicit choice and resumes following OS changes. Explicit choices persist under `terriertray-theme`, independently of personal profile storage. The small `public/theme.js` script resolves appearance before the app paints and updates native control color-scheme and browser theme color. Storage failures fall back gracefully; appearance changes never read or store measurements.

Dark mode uses a charcoal page (#171619), raised panels (#242227), light ink (#f6f2f5), and muted labels (#beb6c2). The hero uses plum, scarlet, and warm charcoal gradients. Primary buttons stay scarlet with white text; links and progress use brighter rose tones for contrast. Theme switches suppress color transitions so surfaces change together.

## Composition

The header holds the square TerrierTrays logo and view navigation. The logo is a Home link that returns to Plan without clearing plates or profile state. The hero groups the current hall, date, and next planning action. The real meal schedule follows, then the approved daily summary below the meal selector, followed by the active plate and suggested dishes. Desktop uses complementary columns; mobile stacks the same information with usable controls and no horizontal overflow.

The signature is the **actual plate total**: a scarlet ring shows planned calories against the student's meal share. The ring never invents progress. Unknown nutrition remains labelled, including “at least” and coverage counts. Totals are planned, never eaten.

The daily summary combines planned dishes from all halls for the selected date. Four scarlet rings show published calories and protein/carbs/fat grams against the existing daily targets. Keep the total, target, unit and nutrient label; omit derived energy, percentage legends and repeated remaining amounts. Cap arcs at a full circle without hiding over-target totals. Partial progress is dashed and labelled with coverage; unknown or missing-target rings stay unfilled. Empty, loading and unavailable states remain explicit. Macro allocation arithmetic and its expandable explanation stay in the calculator.

## Interface rules

- Use the self-hosted Inter Tight Latin variable family: 700 display headings, 600 section/button/nutrition emphasis, 400 body, and tabular numbers. Inputs stay at 16px or larger. Its license and source are in `public/fonts/`.
- Group with spacing before adding lines or containers. Keep one depth cue per white surface.
- Keep controls at least 44px and fields at least 48px tall. Preserve labels, keyboard focus, and native dialog behavior.
- Keep body and label contrast at least 4.5:1 over their actual backgrounds; use words with semantic status colors.
- Selected meals use a blush row and scarlet icon well. Published hours and planned totals remain visible.
- Use a 700ms header/hero introduction with 80–160ms grouping delays, 460ms content arrivals, a 480ms clipped navigation pill and 650ms target-ring progress. The pill's decorative white labels counter-translate so they stay aligned and retain contrast. Capture each view's animation choice on mount: field focus or typing must never toggle document-wide motion styles. Keyboard navigation and active range controls are immediate. No looping decoration. Reduced motion reaches the same final state without movement.
- The sole background-motion exception, explicitly requested by the user, is the low-contrast ambient opacity cycle. Its layer is noninteractive and separate from content, pauses during form entry/dialogs, and has a static reduced-motion equivalent. Never animate gradient positions, text or cards for this effect.
- Do not add healthcare claims, assistant chat, fake proof, reminders, or other unsupported features.
- Menu rows lead with name and kcal per serving; ordinary nutrition/station/serving detail is available in the existing dish dialog. Keep missing nutrition and item-specific allergy/restriction warnings visible. The unanswered allergy gate is stated once above the list, with Add disabled until answered.

## Product contracts

Planning remains local. Measurements are neither saved nor sent; profile storage is opt-in. Use the existing trained calorie regression with an explicit Apply step, not replacement equations or invented models.

The calculator starts with feet, inches and pounds, with unit switching converting existing measurements. Optional Balanced and Muscle-focused macro allocations divide the final calorie budget without changing the model. Preview grams, kcal and percentages before Apply; applied grams are rounded to 0.1 g. “Include suggested macros” can be unchecked to preserve manual macro targets. Keep the preset and slider explanations distinct from model predictions and clinical limits.

The visible name is TerrierTrays; existing `terriertray-theme`, `terriertray.profile.v1` and `terriertray:*` event names retain their singular spelling for compatibility.

Use the completed BU HTML scraper data. Preserve freshness checks before automatic recommendations and again at action time; stale menus remain visibly labelled and browsable. Fenway stays deferred.

Keep allergy-answer gating, unknown-allergen handling, deliberate filter-removal confirmation, restriction conflicts, and cross-contact guidance. Preserve weekly plans, meal swaps, missing-data states, and the unofficial BU notice.
