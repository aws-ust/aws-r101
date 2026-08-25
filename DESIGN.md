# Design System

Source of truth: [Figma — AWS website draft](https://www.figma.com/design/SfU56ovh7ir0ge9cGtTsWo/AWS-website-draft?node-id=47-64)

This file is the design basis for every frontend component in this repo. When a
component's look or copy is unclear, check the Figma file (node IDs are noted
below) before guessing.

## Component library

This repository must use [shadcn/ui](https://ui.shadcn.com) for UI primitives
(buttons, cards, dialogs, inputs, etc.) — already initialized in `frontend/`
(`components.json`, `src/lib/utils.ts`, `src/components/ui/`). Add new
components with `npx shadcn@latest add <component>` rather than hand-rolling
primitives; extend the generated component source directly for one-off
variants instead of wrapping it. Style/theme new components against the
tokens below (`@theme inline` in `globals.css`), not shadcn's defaults.

## Theme

Dark, terminal/dev-inspired. Deep navy-violet background, glassmorphic
(blurred, translucent) cards and pills, monospace "$ command" labels used as
section eyebrows and terminal-flavored copy, Poppins for headings/body,
JetBrains Mono for anything meant to read as a shell/code snippet.

## Tokens

### Color

| Name | Hex | Use |
|---|---|---|
| `haiti` | `#170F33` | Base background (near-black navy) |
| `daisy-bush` | `#46258A` | Accent violet |
| `meteorite` | `#3F247C` | Primary button fill, card overlays (also at 55% opacity: `rgba(63,36,124,0.55)`) |
| `biloba-flower` | `#B78CF0` | Accent/highlight violet (also at 15%: `rgba(183,140,240,0.15)`) |
| `prelude` | `#C6B8E8` | Terminal/mono text on dark backgrounds |
| `blue-chalk` | `#F3EEFF` | Primary body text on dark backgrounds (near-white); also used at 15%/25% opacity for borders |
| `white` | `#FFFFFF` | Emphasis text, icon backgrounds; also at 12%/15% opacity for hairline borders |
| `black` | `#000000` | Shadows, at 12% opacity |

Borders on cards/pills are typically `1px solid` `blue-chalk` at 15–25% opacity.
Overlay panels (nav dropdown, etc.) use `blue-chalk`/`haiti` at low opacity with
a backdrop blur (`4–5px`).

### Typography

Fonts: **Poppins** (headings, body copy, buttons), **JetBrains Mono** (terminal
labels, code snippets, small caps eyebrows).

| Style | Font | Weight | Size |
|---|---|---|---|
| Heading 2 | Poppins | Bold (700) | 44.8px |
| Heading 3 | Poppins | Bold (700) | 17.6px |
| Heading 4 | Poppins | Bold (700) | 16px |
| Body | Poppins | Regular (400) | 14–18px |
| Body (emphasis) | Poppins | SemiBold (600) / Medium (500) | 14.4px |
| Button label | JetBrains Mono | Regular (400) | 11.5px, line-height 15px |
| Terminal / code | JetBrains Mono | Regular (400) | 11.5–15px |

Line-height runs ~1.0 in Figma (manually set per line); translate to a normal
CSS line-height (~1.4–1.6) for body copy in code, matching the visual spacing
in the screenshots, not the raw `100%` value.

### Spacing & radius

- Spacing scale (px): `2, 3, 7, 8, 10, 12, 13, 15, 24, 26, 44`
- Corner radius (px): `4, 9, 13, 14, 20, 22, 23.5, 28, 50, 100` — `100` (fully
  rounded) is the standard pill radius for buttons and nav chips
- Stroke width: `1px`
- Content max-widths: `640` (hero headline), `680` (section intro column),
  `900` (hero content), `1180` (page content), `1856–1920` (full-bleed
  section backgrounds)

## Layout conventions

- Page content is centered in a `1180px` column with generous outer padding.
- Each major section opens with a small pill-shaped "`$ command`" eyebrow
  label in JetBrains Mono (e.g. `$ whoami`, `$ what-we-do`,
  `$ builders --start`, `$ ls committees/`, `$ cat events.log`,
  `$ join --now`), then a Heading 2, then a one-paragraph intro.
- Buttons are pill-shaped (`radius: 100`): **primary** = solid `meteorite`
  fill with `blue-chalk`-25% border; **secondary** = transparent with a
  `blue-chalk`-30% border. Both use the Button text style.
- Cards/panels use `meteorite` (or `blue-chalk`-low-opacity) fills with a
  hairline border and rounded corners (14–28px), sometimes with backdrop
  blur.

## Page sections (top → bottom)

| Section | Figma node | Notes |
|---|---|---|
| **Navbar** | `5:15518` | Logo, `$ nav` dropdown (opens: about-us / the-people / events), primary CTA "Join us! →" |
| **Hero** | `5:15002` | "It's always day one!" headline art, tagline, terminal `git commit -m 'first stack shipped\|` snippet, primary + secondary CTA buttons |
| **Mission and Vision** | `5:15053` (`$ whoami`) | Intro heading "The first cloud org at UST.", two-column `// mission` / `// vision` cards |
| **What we do** | `5:15100` (`$ what-we-do`) | "How our members grow.", 3 feature cards: workshops, certification track, hackathon |
| **Build your Stack** | `5:15147` (`$ builders --start`) | "Build your first stack.", Espi mascot + instructions, interactive 5-service stack builder with a live counter and deploy/reset buttons |
| **Committees** | `5:15224` (`$ ls committees/`) | "Run by builders, for builders.", embedded **Quiz** ("Pick a Saturday activity", 4 options), Executive Board + Committee-member profile cards, 13-button committee picker grid |
| **Quiz** | inside `5:15224` (`5:15233`) | Currently nested inside the Committees section, not a standalone section — "Pick a Saturday activity", 4 answer buttons. Treat as a component the Committees section composes. |
| Events | `5:15399` (`$ cat events.log`) | Draggable/scrollable event cards (emoji icon, date, title, blurb) — not in the original issue list but part of the page flow |
| **Join / CTA** | `5:15472` (`$ join --now`) | "Ready to build with us?", mascot + logo, CTA buttons |
| Footer | `5:15049` | Copyright line only |

**FAQ Section**: not present anywhere in the current Figma draft. There's no
FAQ content or accordion pattern to reference yet — flag with design before
building; a reasonable default is a `blue-chalk`-bordered card list matching
the Mission/Vision or feature-card styling, using an accordion for
expand/collapse.

## Basic components

Component inventory lives in the Figma file's dedicated "Components" canvas
section (frame `5:14930`), each with `default`/`hover` variants:

| Component | Figma | Variants |
|---|---|---|
| **Button** | `Component 1` | primary (solid), secondary (outline) — both pill-shaped, hover state included |
| Nav/footer text link | `Component 2` | single style, hover state (color shift) |
| Stack service row | `Component 3` | 5 variants (one per AWS service row in Build-your-Stack) |
| Quiz option button | `Component 4` | 2 variants (selected/unselected), hover state |
| Avatar / social icon | `Component 5` | 3 variants, hover state |
| Committee icon button | `Component 6` | 1 variant, no hover recorded |
| Small text link / tag | `Component 7` | 1 variant, hover state |
| Nav dropdown item | `Component 8` | 3 variants, hover state |

**Header component**: no single reusable "Header" component exists in Figma —
"Header" in the design refers to the Hero section (node `5:15002`). The
navbar (`5:15518`) is the actual persistent header/nav across the page; build
that as the shared `Header`/`Navbar` component.

**Accordion**: not present in the design. No collapse/expand pattern exists
anywhere in the current draft (including the missing FAQ section). Build one
using the card/border/radius tokens above until Figma has a reference.

## Gaps to flag with design

- No FAQ content or accordion pattern in Figma yet.
- Quiz is embedded in Committees, not a standalone section — confirm whether
  it should be pulled out before building it as its own component per the
  tracked issue.
