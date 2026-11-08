---
name: TerrierTray
description: A BU dining planner with white surfaces and a soft scarlet atmosphere
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
  hero-blush: "#edb8bc"
  hero-peach: "#f9d9c8"
  hero-ice: "#e4e7f7"
  hero-ground: "#f1eef3"
  danger: "#a72821"
  danger-soft: "#fff0ed"
  warn: "#86420e"
  warn-soft: "#fff5e8"
  ok: "#246540"
  ok-soft: "#eaf5ee"
  focus: "#34343a"
typography:
  family: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  headline: "36–52px / 1.08 / 500"
  figure: "40px / 1 / 500; tabular numerals"
  section: "20px / 1.4 / 500"
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

# TerrierTray design system

**Direction:** Put the day's real dining-hall choices on a calm white surface, with BU scarlet guiding the next action.

Visual inspiration: [AI Healthcare Assistant App](https://dribbble.com/shots/27870676-AI-Healthcare-Assistant-App) by **NexUX Product / Nexux Lab**. This is an adaptation for a student dining planner, not a healthcare interface or a BU-endorsed product.

## Reference and adaptation

Observed reference traits: broad rounded white panels, large two-tone headings, circular line-icon controls, compact numeric summaries, generous grouping, and a soft multicolor gradient material.

Adaptation choices: the user explicitly requested the gradient quality alongside BU scarlet and white. Confine the blush, peach, and ice-blue wash to the meal-context hero. Working surfaces stay opaque; scarlet marks primary actions. There are no drifting blobs or frosted cards.

## Appearance

A single sun/moon icon button in the header switches between Light and Dark. Until it is used, the app follows the system appearance, including OS changes. Explicit choices persist under `terriertray-theme`, independently of personal profile storage. The small `public/theme.js` script resolves appearance before the app paints and updates native control color-scheme and browser theme color. Storage failures fall back gracefully; appearance changes never read or store measurements.

Dark mode uses a charcoal page (#171619), raised panels (#242227), light ink (#f6f2f5), and muted labels (#beb6c2). The hero uses plum, scarlet, and warm charcoal gradients. Primary buttons stay scarlet with white text; links and progress use brighter rose tones for contrast. Theme switches suppress color transitions so surfaces change together.

## Composition

The header holds the plate-and-cutlery identity and view navigation. The hero groups the current hall, date, and next planning action. The real meal schedule follows, then plate totals and suggested dishes. Desktop uses complementary columns; mobile stacks the same information with usable controls and no horizontal overflow.

The signature is the **actual plate total**: a scarlet ring shows planned calories against the student's meal share. The ring never invents progress. Unknown nutrition remains labelled, including “at least” and coverage counts. Totals are planned, never eaten.

## Interface rules

- Use the system sans family, medium-weight headings, and tabular numbers. Inputs stay at 16px or larger.
- Group with spacing before adding lines or containers. Keep one depth cue per white surface.
- Keep controls at least 44px and fields at least 48px tall. Preserve labels, keyboard focus, and native dialog behavior.
- Keep body and label contrast at least 4.5:1 over their actual backgrounds; use words with semantic status colors.
- Selected meals use a blush row and scarlet icon well. Published hours and planned totals remain visible.
- Buttons use short, named color/press transitions. No looping decoration or page-entry animation. Reduced motion reaches the same final state without movement.
- Do not add healthcare claims, assistant chat, fake proof, reminders, or other unsupported features.

## Product contracts

Planning remains local. Measurements are neither saved nor sent; profile storage is opt-in. Use the existing trained calorie regression with an explicit Apply step, not replacement equations or invented models.

Use the completed BU HTML scraper data. Preserve freshness checks before automatic recommendations and again at action time; stale menus remain visibly labelled and browsable. Fenway stays deferred.

Keep allergy-answer gating, unknown-allergen handling, deliberate filter-removal confirmation, restriction conflicts, and cross-contact guidance. Preserve weekly plans, meal swaps, missing-data states, and the unofficial BU notice.
