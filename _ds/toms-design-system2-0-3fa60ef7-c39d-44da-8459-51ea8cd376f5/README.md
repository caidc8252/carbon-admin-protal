# TOMS Design System

The canonical token + component + product-UI library for **TOMS** — Newland Payment Technology's terminal-fleet management product (think back-office for tens of thousands of POS payment terminals). This repo is both a working design system **and** a design-agent skill: it gives an LLM enough scaffolding to produce on-brand TOMS interfaces (real or throwaway) without having to invent any visual decisions.

> **Brand context.** Newland Payment Technology US Co., Ltd. is the US arm of one of the world's largest manufacturers of payment terminals. TOMS is the SaaS / 中后台 admin surface for everything they ship — provision a device, push a firmware build, run remote diagnostics, audit PCI compliance, manage fleets at the merchant/store/terminal level. The system has the temperament of B2B SaaS infra (Linear, Stripe, Vercel) — quiet, dense, mono-numeric, single CTA per surface — applied to payment hardware.

## Sources

This system was built from the design-system repo the user attached:

- **GitHub:** [Newland-Payment-Technology-US-Co-Ltd/Design-System](https://github.com/Newland-Payment-Technology-US-Co-Ltd/Design-System) (`main`)
  Mirrored into this project as-is. If you have access, explore the upstream for the most current version — anything in this skill is a snapshot.

If you need to recreate the actual product UI in higher fidelity than what's in `ui_kits/terminal-manager/`, ask for source-code access or a Figma link to the live TOMS product.

---

## CONTENT FUNDAMENTALS

How copy is written across the product. **Pull these from `SKILL.md` if you only read one section.**

| Aspect              | Rule                                                                                                                                                                                                                                  | Example                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Voice**           | Engineer-to-engineer. Terse, factual, never marketing. Treat the reader as someone running a fleet — they want the answer, not the pitch.                                                                                             | "12 terminals pending update" — not "Stay on top of your fleet!"                         |
| **Person**          | Second-person only when giving the operator an instruction. Most UI is third-person about the device: "Terminal NL750 hasn't synced in 14 min."                                                                                       | "Push update" (imperative). "You'll need an admin token for this." (when instructive)    |
| **Casing**          | **Sentence case** for body, card titles, page titles, descriptions. **Title Case** for buttons and tab labels. **ALL-CAPS small** (11.5px, letter-spacing 0.06em) for overlines and table headers.                                    | Tab: "Basic Info" · Button: "Push Update" · Title: "Recent activity" · Overline: "STATUS"|
| **Action labels**   | Verb-first. Specific over generic. "Push Update" not "Submit". "Reboot Terminal" not "Confirm".                                                                                                                                       | "Refresh" · "Push Update" · "Delete Terminal" · "View Plan →"                            |
| **Numbers + IDs**   | Always mono with `font-variant-numeric: tabular-nums`. IMEIs, serials, hashes, timestamps, percentages — anything numeric is the data voice.                                                                                          | `NL750-K9F2H7B3` · `99.94%` · `2026-05-19 14:22:08`                                       |
| **Separators**      | `·` (middle dot) for tight metadata. `→` only as a "view more" suffix on link buttons. Never the em-dash for separation inside chips.                                                                                                 | "MTL Store #4 · Acme Coffee · last sync 2m ago"                                          |
| **Emoji**           | **None.** Anywhere. Use the `<Ico>` SVG set or a tone-dot pill.                                                                                                                                                                       | ❌ "✅ Online"   ✅ green dot + "Online"                                                  |
| **Empty states**    | One line of state + one verb-first action. No illustrations. No hand-holding.                                                                                                                                                         | "No alerts. · Configure alerts →"                                                        |
| **Errors / status** | Calm, factual, machine-shaped. Show the symptom + the proximate cause + the next step. Never apologize.                                                                                                                                | "Sync failed · last attempt 03:14 UTC · Retry"                                           |
| **AI surfaces**     | Prefixed with `✦` (the sparkle glyph). Questions, not statements. Suggestions, not answers. AI lives in the Cmd+K palette and the Overview "AI insight" banner — nowhere else.                                                          | "✦ Why has this terminal's transaction volume dropped 12%?"                              |

**Vibe:** quiet, infra-grade, technical. Not "delightful." Not "playful." The product earns trust by being legible at 2 a.m. when a store can't take payments.

---

## VISUAL FOUNDATIONS

### Color
- **One CTA color** — midnight indigo (`--color-primary-700`, ≈ `oklch(24% 0.06 262)`). Hover → `-600`, active → `-800`. **One primary CTA per surface, ever.**
- **Vivid accent** (`--color-accent-*`, brighter indigo at ≈ `oklch(52% 0.24 272)`) is **reserved for chart strokes and the `✦` AI sparkle**. Never on buttons.
- **Neutrals are warm-ish off-whites** (`oklch(99% 0.003 90)` for `bg-1`, `oklch(100%)` for `bg-2/card`). Pure black/white avoided — there's a barely-there 90° hue across the neutral ramp.
- **Semantic** = success/warning/error/info, each as a `-50` background + `-500` foreground + `-700` text-on-tint trio. Used in pills and inline alerts — never as page chrome.
- **Dark mode** is Linear-influenced: deep near-black (`bg-1 = oklch(14% 0.003 260)`), card *one step lighter*, sidebar *one step deeper*. Borders are hairlines; depth comes from surface tone, not shadow.

### Typography
- **Geist** (sans) + **Geist Mono** — the entire system. No serif. No display face. Sans does display duty.
- **Weights used:** 400 (regular), 450 (Terminal Manager skin only), 500, 600. 700 reserved for rare emphasis. Weight 800/900 never used.
- **Scale:** 12 / 13 / 14 (base) / 16 / 18 / 22 / 28 / 36 / 48 — all hand-picked, no math ramp.
- **Hero numbers, KPIs, IDs, timestamps → mono.** Tabular nums. That's the data voice. Sans = prose; mono = data.
- **Letter-spacing** is tighter at large sizes (`-0.02em` at 28+ px, `0` at 14px).

### Spacing, radius, elevation
- **4px grid.** `--space-N` where N is the value in 4px units (`--space-4` = 16px).
- **Radius:** `sm 4 / md 6 / lg 8 / xl 12 / 2xl 16 / full`. Controls use `sm`/`md`; cards use `lg`–`2xl`; pills are `full`.
- **Card system is strict:** `--card-radius-sm/md/lg` = 8/12/16, `--card-padding-sm/md/lg` = 12/20/24, `--card-elev-0/1/2` = none/`shadow-2`/`shadow-3`. **Default = radius-md + padding-md + elev-1.** Don't invent ad-hoc card values.
- **5-step shadow ramp** (`--shadow-1`…`-5`). Plus `--shadow-cta` (the signature: inset white highlight + 0.5px black edge + drop) and `--shadow-focus` (3px primary-tinted ring).

### Backgrounds
- **Flat.** Always. **No gradients.** The only thing that *looks* like a gradient is `--accent-gradient-soft`, which now resolves to a flat tinted surface — the name is legacy.
- **No background imagery** in the product. No hand-drawn illustrations. No repeating patterns. No textures. The visual texture comes from **type + data**, not from chrome.
- Marketing surfaces (logos, login screen) sit on `bg-2` cards with a 1px subtle border — no decorative background.

### Animation
- **Conservative.** Durations are `80 / 120 / 200 / 320 ms`. Two easings: `--easing-standard` (cubic-bezier(0.2,0,0,1)) for most things, `--easing-emphasized` for entrance/exit.
- **All durations collapse to 0** under `prefers-reduced-motion: reduce`.
- **The only continuously-animating element in the product is the map-pin pulse** in the Terminal Manager overview (`<animate r 14;30;14 2.4s>`). Nothing else loops.
- No bounce. No spring. No parallax. Crossfades and 4px translates only.

### Hover / press / focus
- **Hover on buttons:** background steps to `-600`, no scale change, transition `120ms standard`.
- **Hover on neutral surfaces** (rows, ghost buttons): bg → `--color-bg-hover` (a 1.5% darker step).
- **Active / pressed:** bg → `--color-bg-active` (3% darker), or `-800` for primary buttons. **No scale-down** (no `transform: scale(0.96)` — that's playful, not infra).
- **Focus ring:** `--shadow-focus`, a 3px primary-700 at 25% opacity. Visible on every focusable control. Never removed.

### Borders + transparency
- **Borders carry the system.** 1px hairlines in `--color-border-subtle` separate everything. Cards have a border *and* a shadow — borders for definition, shadow for depth.
- **Transparency:** only used in overlays (`bg-overlay` = `oklch(15% 0.01 270 / 0.45)` modal scrim) and the focus ring. Components themselves are opaque.
- **Blur:** only on the modal scrim's `backdrop-filter: blur(2px)`. Not used anywhere else.

### Cards
The default card: `background: var(--bg2)` · `border: 1px solid var(--border-1)` · `border-radius: 12px` · `padding: 20px` · `box-shadow: var(--shadow-2)`. Header band (when present) is `padding: 16px 20px` with a 1px bottom divider.

### Imagery
- The product itself **has none** beyond the logo, the wordmark, and one schematic terminal SVG.
- When a screenshot or device photo is needed in marketing, it's shot on a clean off-white background — warm-neutral, no gradient, no studio shadow. (See `uploads/` for the brand-supplied references.)
- No avatars beyond initials-in-circle (1.5px mono initials on a `bg-3` background).

### Layout
- **Sidebar 220px fixed left.** Sticky tabs. Content max-width 1280 with 24px gutters on wide viewports.
- **Tables are the dominant data display** — header row uppercase 11.5px tertiary, cells `padding: 16px 8px` (28px on first/last column), numbers right-aligned + mono.
- **Charts are hand-rolled SVG** — `Sparkline · AreaChart · BarPair · HBar · Heatmap · Donut · StackedBar`. Stroke 1.4–1.5px, dashed grid lines, mono axis labels at 9.5px. **Never import a chart library.**

---

## ICONOGRAPHY

The product has a **hand-written icon set** — about 50 glyphs — defined inline as SVG paths in `ui_kits/terminal-manager/shell.jsx` (look for the `I` map and the `<Ico name="…">` component).

### The rules

| Aspect           | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Box**          | 24×24 viewBox                                               |
| **Stroke**       | 1.5px, `round` caps + joins, `currentColor`                 |
| **Fill**         | `none` (stroke-only) — never solid fills, never two-tone    |
| **Color**        | Inherits via `currentColor`. Tinted by parent text color.   |
| **Size on page** | Usually rendered at 18px or 20px. Never above 24px.         |
| **Source**       | Hand-paths inline in `shell.jsx`. No icon font. No sprite.  |
| **Style match**  | Closest CDN equivalent is **Lucide** (same stroke + caps).  |

### The set (~50 glyphs, all in `shell.jsx`'s `I` map)

`home · device · store · merchant · card · settings · search · wifi · cell · battery · shield · sparkle · download · upload · refresh · power · lock · flash · check · x · alert · info · command · gear · plus · minus · arrow-up · arrow-down · arrow-left · arrow-right · chevron · ellipsis · clock · calendar · pin · pulse · play · pause · stop · file · folder · trash · copy · share · external · key · user · users · bell · filter · sort`

### Substitution policy

If you need an icon that isn't in the set: **add it inline** to `shell.jsx`'s `I` map in the same style (24×24, 1.5px stroke, round, currentColor) before using it. Do **not**:
- import an icon font (no Font Awesome, no Material Symbols)
- drop in a Lucide / Heroicon SVG with different stroke metrics
- use emoji as a substitute
- use unicode glyphs as icons (✓ ✗ ⚙ are sometimes used as *typography* in mono contexts, never as UI icons)

The one allowed unicode-as-glyph: **`✦`** — the AI sparkle. Used in the Cmd+K palette and the Overview "AI insight" banner. Tinted with `--color-accent-600`. Nothing else gets the sparkle.

### Logo + wordmark
Live in `assets/`:
- `toms-logo.png` — square mark, used at 22–56px. Sidebar lockup + favicon size.
- `toms-wordmark.png` — used only on marketing surfaces and the login screen.
- For inverse / on-dark: place the mark on `--color-brand-mono` (≈ `oklch(22%)`) and apply `filter: invert(1)` to a black mark — there is no separate dark-mode logo file.

---

## Index

A manifest of what's in this repo.

### Root
- **`README.md`** (this file) — context, content fundamentals, visual foundations, iconography, manifest.
- **`SKILL.md`** — Agent Skill metadata, for use as a downloadable Claude Code skill. The user-facing entry point.
- **`colors_and_type.css`** — single-import surface. Pulls primitives from `tokens/tokens.css` and exposes a flat semantic API (`--fg1` / `--bg1` / `.h1` / `.body` / `.mono` etc). Use this if you don't want to learn the full token system.
- **`color-cleanup-preview.html`** — internal reference page from the color-cleanup pass; safe to ignore.
- **`dark-preview.html`** — full-page light/dark side-by-side preview.

### `tokens/`
- `tokens.css` — **single source of truth.** OKLCH color, type, spacing, radius, shadow, z-index, motion, breakpoints, card system tokens. Light + dark.
- `tokens.json` — same values as a flat JSON tree (style-dictionary-compatible).
- `tailwind.preset.js` — Tailwind v4 preset mapping the tokens.

### `styles/`
- `components.css` — the entire `tds-*` class API: `tds-btn`, `tds-input`, `tds-card`, `tds-badge`, `tds-tabs`, `tds-table`, `tds-toast`, etc. Read this when building markup without React.

### `components/`
- `Button.tsx · Card.tsx · DataDisplay.tsx · Feedback.tsx · Field.tsx · Input.tsx · Layout.tsx · Select.tsx · Toggles.tsx · index.ts` — TypeScript React wrappers around the `tds-*` classes. Drop into a host app via `import {Button, Card, …} from './components'`.

### `assets/`
- `toms-logo.png` · `toms-wordmark.png` — the brand marks. (See ICONOGRAPHY above.)

### `docs/`
- `tokens.md` — human-readable cross-reference of every token.
- `components.md` — components API + per-class rules.

### `preview/` (Design System tab)
89 small HTML cards — one per token group / component / block. Each is a self-contained 700×~150 px specimen that loads `_card.css` (which loads `colors_and_type.css`). These are what populate the **Design System tab** of this project. Sections include:
- `colors-*` · `type-*` · `typography` — foundations
- `spacing-scale` · `radii` · `shadows` · `motion` — spacing & elevation
- `buttons` · `inputs` · `badges` · `avatars` · `card` · `tabs` · `table` · all the standard primitives
- `chart-*` — the seven hand-rolled chart specimens
- `block-*` — full composed blocks (dashboard, login, signup, sidebar, settings)
- `logo · icons` — brand marks + the icon set

### `dark-mode/`
A standalone dark-mode delivery — its own `index.html`, `tokens.html`, `buttons.html`, `cards.html`, `components.html`, `principles.html`, `qa.html`, `engineering.html`, `pages.html`. Open `dark-mode/index.html` to navigate it. This is the receipts for the dark-mode pass: tokens, principles, QA matrix, engineering notes.

### `ui_kits/`
- **`component-showcase/`** — the canonical TDS sandbox. Every `tds-*` class rendered in default + variants alongside its token values. The reference when in doubt.
  - `index.html` · `components.jsx` · `assets/toms-logo.png`
- **`terminal-manager/`** — hi-fi recreation of the actual TOMS product (one-device detail view). Sidebar + topbar + breadcrumb + six tabs + Cmd+K palette. Two density variants.
  - `index.html` (default density) · `index-spacious.html` (executive variant)
  - `tokens.css` (tm-* skin) · `app.jsx` · `shell.jsx` (sidebar/topbar/icons) · `cmdk.jsx` · `charts.jsx`
  - `tab-overview.jsx` · `tabs-rest.jsx` · `tab-overview-spacious.jsx` · `tabs-rest-spacious.jsx`
  - `design-canvas.jsx` · `tweaks-panel.jsx` · `README.md`

### `uploads/`
Reference photos / screenshots the user supplied — terminal hardware shots, prior-art screenshots. Useful as input, not as output.

---

## Getting started (for a design agent)

1. **Read `SKILL.md`** first — it has the binding visual rules in their tersest form.
2. **For a quick mock** of a TOMS-flavored surface (no real product fidelity needed): link `colors_and_type.css` + `styles/components.css` from the project root, use the `tds-*` class API, copy `assets/toms-logo.png`.
3. **For a recreation** of the actual product UI: copy `ui_kits/terminal-manager/` wholesale and edit. The shell, charts, and Cmd+K are already there.
4. **For production handoff** to a host app: copy `tokens/`, `styles/`, and `components/`. Re-export from `components/index.ts`. Keep the `--color-*` / `--space-*` / `--shadow-*` token names intact — the component CSS depends on them.

---

## Caveats

- The icon set lives inline in `shell.jsx` (not in `assets/`). If you need it as standalone SVGs, you'll have to extract it.
- `ui_kits/terminal-manager/` is the **only** recreated product surface — the merchant/store list routes, billing, the actual real backend wiring are all out of scope.
- Reference photos in `uploads/` are **not** licensed for redistribution; treat as comp-only.
