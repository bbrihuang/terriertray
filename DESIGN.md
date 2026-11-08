---
name: TerrierTray
description: Soft glass plate planner for BU dining halls
colors:
  page: "#f4f3f8"
  surface-glass: "rgba(255,255,255,0.72)"
  surface-solid: "#fbfbfd"
  field: "rgba(255,255,255,0.9)"
  ink: "#111114"
  muted: "#56556a"
  control: "#7e7d90"
  action: "#111114"
  on-action: "#ffffff"
  accent-ink: "#4f35c2"
  accent-soft: "#eeeafe"
  blob-lavender: "#b9a8ff"
  blob-peach: "#ffc7a3"
  blob-sky: "#a9d4ff"
  blob-pink: "#ffb3c1"
  danger: "#b42318"
  danger-soft: "#fde7e4"
  warn: "#8a3b0a"
  warn-soft: "#ffebdc"
  ok: "#1f7a3f"
  ok-soft: "#ddf3e4"
  night-page: "#14121c"
  night-surface-glass: "rgba(32,28,46,0.74)"
  night-ink: "#f3f1fa"
  night-muted: "#b9b6cc"
  night-accent-ink: "#c9b8ff"
typography:
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.6875rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline-desktop:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  big-number:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  section-title:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  card: "22px"
  inner: "14px"
  chip: "18px"
  pill: "999px"
spacing:
  gutter: "20px"
  card-padding: "20px"
  gap: "8px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  icon-button:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  meal-chip-selected:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.chip}"
  card:
    backgroundColor: "{colors.surface-glass}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
    height: "44px"
---

# Design System: TerrierTray

## Overview

**Creative North Star: "A plate on soft light."**

A working planner for students walking to a dining hall. Content floats in frosted cards over a faint lavender-white ground lit by four large, blurred pastel blobs. The one memorable object is the **plate ring**: planned calories drawn as a pastel ring against the meal's share of the student's own target. Everything else is a standard control in quiet clothes, so the tool reads as a tool first.

**Key Characteristics:**
- Two-tone headline opens every view: a statement in ink, then a quieter line in muted, at the same size.
- Black means "act": one black pill per view (and the selected meal chip).
- Big numbers, small units; tabular figures everywhere numbers compare.
- Planned is never shown as eaten; unknown values are labelled, never zero.

## Colors

Restrained pastel world: colour comes from the light behind the glass, not from fills.

### Primary
- **Ink** (`#111114`): text and the action pill. White on it is 18.85:1.

### Secondary
- **Accent ink** (`#4f35c2`): links and quiet buttons. 7.14:1 on glass over the strongest blob.

### Neutral
- **Page** (`#f4f3f8`), **glass** (white at 72%), **field** (white at 90%) for inputs and pills.
- **Muted** (`#56556a`): second headline line, meta, units. 6.45:1 on glass and 4.69:1 directly on the page over a blob. The handoff's `#9a99a6` failed and is not used.
- **Control** (`#7e7d90`): input borders, ≥3.58:1 against glass.

### Status (always words plus a tinted pill or box, never colour alone)
- Danger `#b42318` on `#fde7e4`, warn `#8a3b0a` on `#ffebdc`, ok `#1f7a3f` on `#ddf3e4`.

### Night
A dark variant follows the OS setting with the same roles (`#14121c` page, night glass, ink `#f3f1fa`, muted `#b9b6cc` at ≥7.6:1). In the dark the action pill inverts to light.

### Named Rules
**The Light-Not-Paint Rule.** Pastels appear as blurred light behind glass and in the plate ring, never as large flat fills behind text.

## Typography

One family: **Atkinson Hyperlegible Next** (self-hosted), chosen over the handoff's Inter Tight for low-vision legibility. Inputs stay at 16 px or larger.

### Hierarchy
- **Headline** 27 px / 500 / −0.02em (40 px on desktop), two lines, the second muted.
- **Big number** 34 px / 600 / −0.03em with a 12 px muted unit.
- **Section title** 18 px / 600.
- **Body** 16 px / 1.5. **Meta** 14 px, muted.

### Named Rules
**The Same-Size Pair Rule.** Both headline lines share size and weight; only colour differs.

## Layout

Single column with 20 px gutters on phones. From 1024 px wide, a 1024 px-max layout: headline beside the hall/day card, then on Plan a sticky 25 rem plate column beside the suggestions, and on Week a two-column grid of day cards. Every grid uses a `minmax(0, 1fr)` minimum, and views reflow at 320 px with 200% text.

## Elevation & Depth

Depth comes from translucency, not shadow. Cards use `backdrop-filter: blur(20px) saturate(140%)`, a 1 px white rim and at most `0 8px 24px rgb(30 20 60 / 0.06)`. Dialogs are solid (`surface-solid`) over a softly blurred backdrop, for reading. With `prefers-reduced-transparency`, cards turn solid and the blobs disappear; in forced-colours mode the blobs are removed.

## Shapes

Cards 22 px, inner tiles and inputs 14 px, meal chips 18 px, and buttons and pills fully round. No sharp corners.

## Components

### Buttons
- **Primary:** black pill, white text, 44 px. One per view.
- **Secondary:** field-white pill with a rim and a whisper shadow.
- **Quiet:** accent-ink text with a soft lavender hover.
- All buttons scale to 0.97 when pressed (motion-safe only).

### Chips
Meal chips are two-line (name with "now/next", then compact hours) with `aria-pressed`. The selected chip is black.

### Cards / Containers
One `glass` utility for every card. No nested cards: inner groupings use the sunken 4% tint (macro tiles, "Why this plan?").

### Plate ring (signature)
A 128-unit SVG ring with an 11-unit stroke, a peach to pink to lavender gradient and round caps over a `line` track. The centre shows a big number with "kcal planned", plus "at least" when data is incomplete. It is `role="img"` with a full sentence label, and the stroke eases over 700 ms only when motion is allowed.

### View tabs
A segmented glass track. The selected tab is white (light) or a 16% white wash (dark) with `aria-current="page"`.

## Do's and Don'ts

- **Do** label every planned total as planned, and show "at least … known for N of M" when values are missing.
- **Do** keep stale, missing and unposted states as visible notices with words.
- **Don't** add an assistant orb, chat, scanning, reservations, reminders, odometer counters or invented metrics. There is no AI here.
- **Don't** use grey text lighter than `#56556a` on the light theme.
- **Don't** animate layout. Only opacity, transform and the ring's `stroke-dashoffset` move, and only when motion is allowed.
