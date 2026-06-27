# TOMS Design System 2.0 — 完整规范（设计基础 + 实施约定 + Tokens）

> 一份总文件：**第一部分** = TOMS 官方设计系统 2.0 基础（品牌/内容/视觉/图标）；
> **第二部分** = 本产品（Carbon Admin Portal）实战收敛的实施约定（锁定，优先级最高，与第一部分冲突时以此为准）；
> **附录** = tokens.css / components.css，前端直接 import。

═══════════════════════════════════════════════════════
# 第一部分 · TOMS 设计系统 2.0 基础（官方）
═══════════════════════════════════════════════════════

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


═══════════════════════════════════════════════════════
# 第二部分 · 实施约定（本产品锁定 · 优先级最高）
═══════════════════════════════════════════════════════

# Carbon Admin Portal — UI 约定

## 分页规范（Pagination · 锁定）

所有列表页底部分页**只用标准 `<window.Pagination>`**（定义在 `pagination.jsx`），禁止各页手写。

- **布局**：`[Rows per page ▾] · [Showing 1–25 of 66] …spacer… [« ‹ 1 2 3 … › »] · [Go to ___ Go]`。
- **规格**：控件高 36 / 圆角 6（继承控件规范）；摘要与 label `12`；页码 mono tabular-nums。
- **Props**：`total · pageStart · pageEnd · totalUnfiltered · page · totalPages · pageSize · setPage · setPageSize · pageSizeOptions(默认 [25,50,100,200]) · unit(摘要名词，默认 "rows") · divider(顶部分隔线，默认 false) · showRowsPerPage / showSummary / showGoTo(各区块开关，默认 true)`。
- **COUNT 只跑一次**：四种翻页形态（Numbered / Compact / Load more / Infinite）共用同一数据层，统计只计算一次，不重复 count。
- 标准列表页用 **Numbered**（可跳页）；超长连续浏览场景才换 Infinite。配合 `ListCard` 时传 `unit` + `divider`。

## 详情页字段布局规范（Vertical Field · Grid · 锁定）

所有详情页（Detail Page）的信息字段**只能用竖排字段（Label 在上、Value 在下）+ 多列 Grid**，统一用全局类 `.kv2-wrap` > `.kv2` > `.kv2__row`（定义在 index.html）。**禁止左右结构**（`Label：Value` 同行 / `.kvgrid` 那种 label-left）。

- **字段内部**：上下结构 —— `dt`（label `12 / 500` tertiary，sentence case 或 ALL-CAPS overline）在上，`dd`（value `14`）在下。
- **页面排列**：横向多列 Grid（容器查询）—— 卡片宽度 ≥920 → 4 列、≥660 → 3 列、≥400 → 2 列、更窄 → 1 列。**默认 4 列，降级到 2 列、移动端 1 列；字段永远 Label 在上、不因屏宽变左右。**
- **长文本 / 整行字段**：加 `kv2__row--full`（`grid-column: 1 / -1`），如 Address、Remark、Notes。
- **数字/ID/时间戳**：value 用 mono + tabular-nums。

```jsx
<div className="kv2-wrap"><dl className="kv2">
  <div className="kv2__row"><dt>Manufacturer</dt><dd>Wingtech Shenzhen</dd></div>
  <div className="kv2__row"><dt>IMEI</dt><dd className="mono">354782110007101</dd></div>
  <div className="kv2__row kv2__row--full"><dt>Address</dt><dd>…长文本自动换行…</dd></div>
</dl></div>
```

新增任何详情页字段一律套 `.kv2`，不要再用 `.kvgrid` / 内联 `label:value`。（firmware/version 详情的 `KVCell`、bundle 的 `KvGrid` 已对齐为同款竖排多列。）

## 字体规范（Typography · 锁定）

- **字体家族**：只用 Geist（sans，正文/标题）+ Geist Mono（数据：ID、序列号、时间戳、金额、百分比、版本号）。一律走 `var(--font-family-sans)` / `var(--font-family-mono)` / `inherit`，不要写死其它字体。
  - 唯一允许的例外：`.signer-sig__preview` 电子签名预览用 `Caveat` 手写体（语义化特例）。
- **字重**：只用 `400 / 500 / 600`；`700` 仅用于极少量强调；**禁止 300 和 800/900**。
- **字号（全偶数刻度：10 / 12 / 14 / 16 / 18 / 24；同级必须一致，由共享类驱动）**：
  - 页面/详情大标题 `24`（`.page__title` / `.det-header__title`）
  - 区块大标题 `18`；卡片标题 `14`（`.info-card__title` / `.tds-card__title`）
  - 正文 `14`；次要/辅助/label `12`；overline 全大写 `12`（letter-spacing 0.06em，靠字重 600 区分）
  - 数据微标签 `10`（mono）——仅限密集表格/副标签场景
  - **禁止奇数和半像素字号**（11/13/13.5/11.5 等已全部 snap 到最近偶数）。
- 数字、ID、时间戳、金额一律 mono + `font-variant-numeric: tabular-nums`。

## 圆角体系（统一梯度 · 按层级分配 · 锁定）

**只允许这一套圆角梯度，按组件层级分配；禁止出现 5/7/9/10/11/13/14/15/18px 这类中间档随手值。**
（对应 DS token：sm=4 / md=6 / lg=8 / xl=12 / 2xl=16 / full）

| 层级 | 圆角 | token | 适用组件 |
|---|---|---|---|
| 控件 | `6` | `--radius-md` | Button、Input、Select、图标按钮、菜单项、搜索框 |
| 小芯片 | `4` | `--radius-sm` | Tag、kbd、复选框、细条 |
| 内层/小块 | `8` | `--radius-lg` | KPI/统计磁贴、卡内提示框、分段控件、图标方块(≤44px)、嵌套小卡 |
| 容器 | `12` | `--radius-xl` | **Card、Modal、Drawer、表格容器、列表卡、详情区块卡** |
| 大特性卡 | `16` | `--radius-2xl` | 少量大卡 |
| 药丸 | full | `--radius-full` | Pill、状态点、头像、徽章 |

要点：
- **控件(6)和容器(12)圆角不同是有意的层级区分**（Stripe/Linear/Notion 同款做法），不是 bug；搜索框紧贴列表卡时二者圆角不一致属正常。
- App Publish 子应用的卡片必须用 `12`（`--radius-xl`），不要用 `8`，与外壳其它页面保持一致。
- 新增任何卡片/容器一律 `12`；新增控件一律 `6`；不要自定义中间档。

## 组件尺寸规范（锁定）

同级组件的尺寸 / 圆角 / 字号 / 字重必须一致：

| 组件 | 高度 | 圆角 | 字号 | 备注 |
|---|---|---|---|---|
| Button | 36（sm 28） | 6 | 14 / 600 | 一屏一个 primary CTA |
| Input / Select / 搜索框 | 36 | 6 | 14 | Select 统一用 `dsSelect` |
| Card / 表格容器 / Modal / Drawer | — | 12 | 卡头标题 14 | 内边距 20、卡头 14·20、1px 边 + `--shadow-1` |
| KPI / 统计磁贴 | — | 8 | 标签 11–12 / 值 24 | |
| Tabs | 42 高 | 下划线式 | 标签 13.5 / 600 | 不加计数 tag |
| Badge / 状态 / Pill | — | full | 11–12 | |
| Tag 小芯片 / kbd | — | 4 | 11–12 mono | |

新增组件一律继承上表，不要自定义尺寸 / 圆角 / 字号。

## Stats Card（统计/KPI/概览磁贴 · 唯一组件 · 锁定）

所有「统计/KPI/概览/汇总」磁贴**只能用 `<StatCard>` / `<StatGrid>`**（定义在 `shared.jsx`，全局挂在 `window`）。禁止页面再手写 `.tkt-kpi__tile` / `.up-stat` / `.pu-stat` 之类的平行实现。

- **统一规格**：圆角 `12`（`--radius-xl`，与列表卡同级，因为它是页面级独立卡）、内边距 `14·16`、最小高度 `92`、`1px` 边 + `--shadow-1`、卡间距 `12`（`StatGrid`）。
- **字体**：label `12 / 500` secondary；value `24 / 600` tabular-nums；description `12` tertiary。
- **Slots**：`label` · `value` · `description` · `trend`（`{dir:'up'|'down'|'flat', label}`）· `icon`（DS 图标名或节点，右上角）。
- **Variants**：`default / success / warning / error`（着色 value）。
- **States**：默认 / hover（传 `onClick` 即可点）/ **Selected**（`selected` → 靛蓝边 + 环 + bg）。

```jsx
<window.StatGrid cols={4}>
  <window.StatCard label="Active" value={42} variant="success"
    description="online now" selected={f==='active'} onClick={()=>setF('active')} />
</window.StatGrid>
```

App Publish 子应用（IIFE bundle）内部自带一套 `KpiTile`，与本组件视觉对齐（同 12 圆角规格）；新页面一律用 `<StatCard>`，不要新建卡片样式。

## 「Show screenshots」折叠加载样式（统一约定）

所有「延迟加载截图」的折叠入口（app 详情 / 版本详情 / Published Apps 详情等任何出现处）必须统一为同一个样式 —— 全局类 `.vd-shots-toggle`（定义在 index.html）：

- 容器：整行按钮，`1px dashed` 边框 + `10` 圆角 + `bg-3` 底 + `20·14` 内边距，hover 时 `bg-2` + 加深边框。
- 左侧 `.vd-shots-toggle__icon`：`36×36`、`8` 圆角、`bg-2` + `1px` 细边、居中放 `image` 图标。
- 文案：标题 `13px / 600`「Show screenshots」；副标题 `11.5px` tertiary「Deferred to keep the page snappy — click to load.」；右侧 `chevR` 箭头。

新增任何 show-screenshots 入口一律套 `.vd-shots-toggle`，不要自写 inline 样式或改文案。

## 页面布局规范（布局密度锁定 · 最高优先级）**所有页面优先继承以下规则。允许调整内容，不允许调整布局密度。**
（基准 = App Publish 页面；新页面/改页面一律照此，不要自创间距。）

- **横向**：`24px`（`--space-6`）是统一的左右留白和栏间距基准。
- **纵向节奏**：大区块之间 `24px`；搜索栏贴着表格用 `16px`（`--space-4`）；卡片内部用 `20px`。
- **卡片**：圆角 `12`、内边距 `20`、卡头 `14·20`（上下 14 / 左右 20）、`1px` 边 + `--shadow-1` 轻阴影。
- **页头**：白底满宽条（`bg-2` + 底部 1px 细线）+ `16·24` 内边距（`--space-4 --space-6`），按钮在右、垂直居中；详情页的 Tabs（`42px` 高）贴在页头条下沿。
  - 实现：列表/表单页用 `.page__head`（已内置满宽白条 + 负 margin 出血 + 居中按钮）；详情页用 `.det-band` / `.det-band__inner`。
- **不允许**：为单个页面改 padding / gap / 卡片密度去"挤"或"撑"内容；内容多就分区/分页，不靠压缩间距。

## 列表页搜索栏（"按照搜索样式"）

所有列表页（Customers / Orders / Devices / Apps / Merchants …）的顶部搜索区域必须遵循以下三条约束：

1. **点击 Search 按钮才出结果。** 输入框、下拉框、复选框都只更新 `draft` 状态，不影响表格。
2. **Enter = Search。** 在任何输入框里按 Enter 等价于点击 Search 按钮。
3. **下方有 Active filters 区域**，展示已生效的过滤条件，每条可单独移除，并提供 "Clear all"。无过滤条件时显示一个 hint（解释 Search 行为）。

### 实现：使用 `search-bar.jsx`

`search-bar.jsx` 暴露以下全局 API，新页面直接复用，禁止自行手写搜索栏样式：

- `useSearchBar(defaults, onApply?)` — 管理 `draft` / `applied` 双状态，提供 `runSearch / clearAll / clearOne / hasFilters`
- `<SearchBar onSearch>` — 容器（自带 Search 按钮，监听 Enter）
- `<SearchInput value onChange onSearch placeholder width?>` — 标准输入框（320×36，自带 Enter kbd + 清空按钮）
- `<SearchSelect value onChange options width? icon?>` — 标准下拉（36 高，与输入框对齐）
- `<SearchActions>` — 右对齐插槽（Export / 自定义按钮）
- `<ActiveFilters onClearAll hasFilters hint?>` — 过滤芯片行
- `<FilterChip label onRemove>` — 单个可移除芯片

样板：见 `order-list.jsx` 的 `OrderList` 组件。

新增列表页时：
1. `const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } = useSearchBar({ q: '', status: 'All' });`
2. 用 `applied.*` 做过滤，不要用 `draft.*`。
3. `runSearch` 时调用 `setPage(1)`（如果有分页）。

## 列表卡片样式（"按照标准列表样式"）

每个列表页除了搜索栏，还要遵循统一的列表卡片样式：

1. **卡片顶部 sticky 头部**：左边显示 "<N> <unit>"（过滤生效时附 "matching filters"），右边塞 Export / 自定义按钮。
2. **滚动时**，"列表头部" 和 "表头（thead）" 同时 sticky 置顶；表头的 top 偏移自动避开搜索栏 + list-head 高度。
3. **底部**使用标准 `<window.Pagination>`（来自 `pagination.jsx`），传 `unit="..."` + `divider`。

### 实现：使用 `search-bar.jsx` 提供的 `ListCard` / `ListCardHead` / `ListExportMenu`

> `ListExportMenu` 是 list-card 右侧的标准 Export 按钮：自动处理"无数据 → 禁用"、"当前页 == 全部 → 单按钮"、"当前页 < 全部 → 下拉两个选项"。调用方只在 `onExport(scope, rows)` 里做实际的 CSV / toast。

```jsx
const toolbarRef = useRef(null);
return (
  <div className="page">
    {/* …page__head / stats… */}

    {/* sticky 工具栏（搜索 + active filters）— 必须包在同一个 ref 容器里 */}
    <div ref={toolbarRef} className="list-toolbar-wrap">
      <SearchBar onSearch={runSearch} sticky={false}>…</SearchBar>
      <ActiveFilters …/>
    </div>

    <window.ListCard toolbarRef={toolbarRef}>
      <window.ListCardHead count={filtered.length} unit="customers" hasFilters={hasFilters}>
        <window.ListExportMenu
          pageRows={pageRows} filtered={filtered} unit="customer"
          onExport={(scope, rows) => exportCustomersCsv(rows, `customers_${scope}.csv`)} />
      </window.ListCardHead>
      <table className="tds-table">…</table>
      <window.Pagination unit="customers" divider … />
    </window.ListCard>
  </div>
);
```

要点：
- 不要再给 `<th>` 写 `style={{ top: ... }}`；`ListCard` 通过 CSS 变量自动算偏移。
- 工具栏（搜索 + 芯片）必须 sticky 在 `top: 0`，且 **包在 `toolbarRef` 容器里**，否则 `ListCardHead` / `thead` 会算错偏移、贴在错误位置。
- 用 `className="list-toolbar-wrap"`：内置 sticky + bg-1 + 上下各 16px padding，**滚动时也会在搜索栏上方（避免贴住内容区顶部）和下方（与列表卡之间）各保留 16px 视觉间隙**。不要再手写 `style={{position:'sticky',top:0,...}}`。
- `<ListCard>` 是一个白底圆角卡片，关键在 `overflow: clip`：它把直角的行/表头/表格背景裁进卡片的圆角轮廓，所以滚动时没有任何东西会从圆角处透出来（之前的 bug：表格白底填进了 sticky 头部圆角的透明三角区，把顶部圆角"填方"了）。`clip` 不同于 `hidden/auto/scroll`，**不会**生成滚动容器，所以 sticky head/thead 仍相对页面滚动容器吸顶。注意：在 `<style>` 模板字符串里写 CSS 注释时**绝不能**用反引号，会提前终止模板字符串导致整个文件语法错误。
- 不再使用 `.table-card`；用 `<ListCard>` 替代（视觉一致，但允许 sticky）。


═══════════════════════════════════════════════════════
# 附录 A · tokens.css（复制存为 tokens.css）
═══════════════════════════════════════════════════════

```css
/* ─────────────────────────────────────────────────────────────
   TOMS Design System — Tokens v1.0
   Engineering-grade · Light + Dark · OKLCH color space
   Single source of truth; do not hardcode values in components.
   ───────────────────────────────────────────────────────────── */

:root, [data-theme="light"] {
  /* ─── Color · Brand ───────────────────────────────────── */
  --color-brand-mono:        oklch(22% 0.015 270);
  --color-brand-mono-strong: oklch(14% 0.012 270);
  --color-brand-mono-soft:   oklch(28% 0.02  270);

  /* ─── Color · Primary (CTA — midnight indigo) ─────────── */
  --color-primary-50:  oklch(97%  0.012 262);
  --color-primary-100: oklch(94%  0.025 262);
  --color-primary-200: oklch(86%  0.06  262);
  --color-primary-300: oklch(72%  0.10  262);
  --color-primary-400: oklch(55%  0.14  262);
  --color-primary-500: oklch(40%  0.14  262);
  --color-primary-600: oklch(32%  0.10  262);
  --color-primary-700: oklch(24%  0.06  262);  /* default CTA bg */
  --color-primary-800: oklch(18%  0.04  262);
  --color-primary-900: oklch(12%  0.025 262);

  /* ─── Color · Secondary (cool steel — secondary actions) */
  --color-secondary-50:  oklch(97%  0.005 250);
  --color-secondary-100: oklch(94%  0.008 250);
  --color-secondary-500: oklch(56%  0.02  250);
  --color-secondary-700: oklch(38%  0.018 250);
  --color-secondary-900: oklch(22%  0.012 250);

  /* ─── Color · Accent (interactive highlights) ─────────── */
  --color-accent-50:  oklch(97% 0.02 265);
  --color-accent-100: oklch(93% 0.05 265);
  --color-accent-200: oklch(86% 0.10 265);
  --color-accent-500: oklch(58% 0.22 270);
  --color-accent-600: oklch(52% 0.24 272);
  --color-accent-700: oklch(46% 0.24 274);

  /* ─── Color · Semantic ────────────────────────────────── */
  --color-success-50:  oklch(96% 0.03  152);
  --color-success-500: oklch(58% 0.14  152);
  --color-success-700: oklch(46% 0.13  152);

  --color-warning-50:  oklch(96.5% 0.04 80);
  --color-warning-500: oklch(70%   0.16 70);
  --color-warning-700: oklch(56%   0.15 60);

  --color-error-50:  oklch(96% 0.04 25);
  --color-error-500: oklch(58% 0.20 25);
  --color-error-700: oklch(46% 0.19 25);

  --color-info-50:  oklch(96% 0.03 230);
  --color-info-500: oklch(60% 0.14 230);
  --color-info-700: oklch(48% 0.13 230);

  /* ─── Color · Surfaces ────────────────────────────────── */
  --color-bg-1: oklch(99%   0.003 90);   /* app bg */
  --color-bg-2: oklch(100%  0     0);    /* surface / card */
  --color-bg-3: oklch(97.2% 0.004 90);   /* sunken / sidebar */
  --color-bg-hover:    oklch(95.8% 0.005 90);
  --color-bg-active:   oklch(93.5% 0.006 90);
  --color-bg-overlay:  oklch(15% 0.01 270 / 0.45);

  /* ─── Color · Text ────────────────────────────────────── */
  --color-text-primary:    oklch(18% 0.01  270);
  --color-text-secondary:  oklch(42% 0.008 270);
  --color-text-tertiary:   oklch(58% 0.006 270);
  --color-text-disabled:   oklch(72% 0.005 270);
  --color-text-inverse:    oklch(99% 0     0);
  --color-text-on-primary: oklch(99% 0     0);

  /* ─── Color · Border ──────────────────────────────────── */
  --color-border-subtle:  oklch(93% 0.005 90);
  --color-border-default: oklch(89% 0.005 90);
  --color-border-strong:  oklch(80% 0.006 90);
  --color-border-focus:   oklch(40% 0.14  262);

  /* ─── Typography ──────────────────────────────────────── */
  --font-family-sans: "Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-family-mono: "Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-md:   14px;   /* base body */
  --font-size-lg:   16px;
  --font-size-xl:   18px;
  --font-size-2xl:  22px;
  --font-size-3xl:  28px;
  --font-size-4xl:  36px;
  --font-size-5xl:  48px;

  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --line-height-tight:   1.2;
  --line-height-snug:    1.35;
  --line-height-normal:  1.5;
  --line-height-relaxed: 1.7;

  --letter-spacing-tight:  -0.02em;
  --letter-spacing-normal: -0.005em;
  --letter-spacing-wide:    0.04em;

  /* ─── Spacing (4px grid) ──────────────────────────────── */
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* Semantic spacing aliases */
  --space-xs: var(--space-1);
  --space-sm: var(--space-2);
  --space-md: var(--space-4);
  --space-lg: var(--space-6);
  --space-xl: var(--space-10);

  /* ─── Radius ──────────────────────────────────────────── */
  --radius-none: 0;
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  /* ─── Border width ────────────────────────────────────── */
  --border-width-thin:    1px;
  --border-width-default: 1px;
  --border-width-thick:   2px;

  /* ─── Shadows · 5 elevations ──────────────────────────── */
  --shadow-1: 0 1px 0 oklch(0% 0 0 / 0.04);
  --shadow-2: 0 1px 2px oklch(0% 0 0 / 0.05), 0 1px 0 oklch(0% 0 0 / 0.02);
  --shadow-3: 0 4px 12px oklch(0% 0 0 / 0.06), 0 1px 0 oklch(0% 0 0 / 0.03);
  --shadow-4: 0 12px 24px oklch(0% 0 0 / 0.08), 0 2px 4px oklch(0% 0 0 / 0.04);
  --shadow-5: 0 24px 48px oklch(0% 0 0 / 0.12), 0 4px 8px oklch(0% 0 0 / 0.06);

  /* CTA inset highlight (midnight indigo button) */
  --shadow-cta: inset 0 1px 0 oklch(100% 0 0 / 0.12),
                0 1px 2px oklch(0% 0 0 / 0.25),
                0 0 0 0.5px oklch(0% 0 0 / 0.4);

  /* Focus ring */
  --shadow-focus: 0 0 0 3px oklch(40% 0.14 262 / 0.25);

  /* ─── Z-index scale ───────────────────────────────────── */
  --z-base:     0;
  --z-dropdown: 1000;
  --z-sticky:   1020;
  --z-overlay:  1040;   /* drawer / fixed sidebar */
  --z-modal:    1050;
  --z-popover:  1060;
  --z-tooltip:  1070;
  --z-toast:    1080;
  --z-cmdk:     1090;

  /* ─── Breakpoints (reference; use in JS or @media) ────── */
  --breakpoint-xs: 480px;
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;

  /* ─── Motion ──────────────────────────────────────────── */
  --duration-instant:  80ms;
  --duration-fast:    120ms;
  --duration-normal:  200ms;
  --duration-slow:    320ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --easing-emphasized: cubic-bezier(0.3, 0, 0, 1);

  /* ─── Component sizing tokens (avoid magic numbers) ───── */
  --control-height-sm: 28px;
  --control-height-md: 36px;
  --control-height-lg: 44px;
  --control-padding-x-sm: 10px;
  --control-padding-x-md: 14px;
  --control-padding-x-lg: 18px;
}

[data-theme="dark"] {
  --color-brand-mono:        oklch(82% 0.008 270);
  --color-brand-mono-strong: oklch(96% 0.005 270);
  --color-brand-mono-soft:   oklch(72% 0.01  270);

  --color-primary-50:  oklch(20% 0.04 262);
  --color-primary-100: oklch(24% 0.05 262);
  --color-primary-200: oklch(30% 0.07 262);
  --color-primary-300: oklch(40% 0.10 262);
  --color-primary-400: oklch(55% 0.13 262);
  --color-primary-500: oklch(70% 0.13 262);
  --color-primary-600: oklch(76% 0.12 262);
  --color-primary-700: oklch(82% 0.10 262);  /* CTA bg */
  --color-primary-800: oklch(88% 0.07 262);
  --color-primary-900: oklch(94% 0.04 262);

  --color-secondary-50:  oklch(22% 0.012 250);
  --color-secondary-100: oklch(26% 0.014 250);
  --color-secondary-500: oklch(64% 0.02  250);
  --color-secondary-700: oklch(80% 0.018 250);
  --color-secondary-900: oklch(94% 0.005 250);

  --color-bg-1: oklch(15% 0.005 270);
  --color-bg-2: oklch(18% 0.006 270);
  --color-bg-3: oklch(13% 0.005 270);
  --color-bg-hover:   oklch(22% 0.008 270);
  --color-bg-active:  oklch(26% 0.01  270);
  --color-bg-overlay: oklch(0% 0 0 / 0.55);

  --color-text-primary:    oklch(96% 0.005 270);
  --color-text-secondary:  oklch(74% 0.008 270);
  --color-text-tertiary:   oklch(58% 0.008 270);
  --color-text-disabled:   oklch(42% 0.008 270);
  --color-text-inverse:    oklch(18% 0.01  270);
  --color-text-on-primary: oklch(15% 0.01  270);

  --color-border-subtle:  oklch(22% 0.006 270);
  --color-border-default: oklch(28% 0.008 270);
  --color-border-strong:  oklch(38% 0.01  270);
  --color-border-focus:   oklch(70% 0.13  262);

  --color-success-50:  oklch(28% 0.05 152);
  --color-success-500: oklch(70% 0.15 152);
  --color-success-700: oklch(80% 0.13 152);

  --color-warning-50:  oklch(30% 0.06 70);
  --color-warning-500: oklch(78% 0.15 70);
  --color-warning-700: oklch(86% 0.13 70);

  --color-error-50:  oklch(30% 0.07 25);
  --color-error-500: oklch(70% 0.18 25);
  --color-error-700: oklch(80% 0.16 25);

  --color-info-50:  oklch(28% 0.06 230);
  --color-info-500: oklch(72% 0.14 230);
  --color-info-700: oklch(82% 0.12 230);

  --shadow-1: 0 1px 0 oklch(0% 0 0 / 0.4);
  --shadow-2: 0 1px 2px oklch(0% 0 0 / 0.4);
  --shadow-3: 0 4px 12px oklch(0% 0 0 / 0.5);
  --shadow-4: 0 12px 24px oklch(0% 0 0 / 0.55);
  --shadow-5: 0 24px 48px oklch(0% 0 0 / 0.6);

  --shadow-cta: inset 0 1px 0 oklch(100% 0 0 / 0.18),
                0 1px 2px oklch(0% 0 0 / 0.5),
                0 0 0 0.5px oklch(100% 0 0 / 0.1);
  --shadow-focus: 0 0 0 3px oklch(70% 0.13 262 / 0.35);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}

```

═══════════════════════════════════════════════════════
# 附录 B · components.css（复制存为 components.css）
═══════════════════════════════════════════════════════

```css
/* ─────────────────────────────────────────────────────────────
   Component styles — TOMS Design System
   Pure CSS, all values from tokens.css. No magic numbers.
   ───────────────────────────────────────────────────────────── */

/* ═══ Button ═══ */
.tds-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
  border-radius: var(--radius-md);
  border: var(--border-width-thin) solid transparent;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background var(--duration-fast) var(--easing-standard),
              border-color var(--duration-fast) var(--easing-standard),
              color var(--duration-fast) var(--easing-standard),
              box-shadow var(--duration-fast) var(--easing-standard);
}
.tds-btn:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.tds-btn[disabled],
.tds-btn[aria-disabled="true"] {
  opacity: 0.5; cursor: not-allowed; pointer-events: none;
}

/* sizes */
.tds-btn--sm { height: var(--control-height-sm); padding: 0 var(--control-padding-x-sm); font-size: var(--font-size-sm); }
.tds-btn--md { height: var(--control-height-md); padding: 0 var(--control-padding-x-md); font-size: var(--font-size-md); }
.tds-btn--lg { height: var(--control-height-lg); padding: 0 var(--control-padding-x-lg); font-size: var(--font-size-lg); }
.tds-btn--block { width: 100%; }

/* variants */
.tds-btn--primary {
  background: var(--color-primary-700);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-cta);
}
.tds-btn--primary:hover { background: var(--color-primary-600); }
.tds-btn--primary:active { background: var(--color-primary-800); }

.tds-btn--secondary {
  background: var(--color-bg-2);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
  box-shadow: var(--shadow-1);
}
.tds-btn--secondary:hover { background: var(--color-bg-hover); border-color: var(--color-border-strong); }
.tds-btn--secondary:active { background: var(--color-bg-active); }

.tds-btn--ghost {
  background: transparent; color: var(--color-text-primary);
}
.tds-btn--ghost:hover { background: var(--color-bg-hover); }
.tds-btn--ghost:active { background: var(--color-bg-active); }

.tds-btn--danger {
  background: var(--color-error-500); color: #fff;
  box-shadow: var(--shadow-cta);
}
.tds-btn--danger:hover  { filter: brightness(1.05); }
.tds-btn--danger:active { filter: brightness(0.95); }

.tds-btn--link {
  background: transparent; color: var(--color-primary-500);
  height: auto; padding: 0; border: 0;
}
.tds-btn--link:hover { text-decoration: underline; }

/* loading spinner */
.tds-btn__spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: tds-spin 0.7s linear infinite;
}
@keyframes tds-spin { to { transform: rotate(360deg); } }

/* ═══ Input / Select ═══ */
.tds-input,
.tds-select {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  background: var(--color-bg-2);
  border: var(--border-width-thin) solid var(--color-border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--easing-standard),
              box-shadow var(--duration-fast) var(--easing-standard);
}
.tds-input:hover,
.tds-select:hover { border-color: var(--color-border-strong); }
.tds-input:focus-within,
.tds-select:focus-within {
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-focus);
  outline: none;
}
.tds-input--invalid,
.tds-select--invalid {
  border-color: var(--color-error-500);
}
.tds-input--invalid:focus-within,
.tds-select--invalid:focus-within {
  box-shadow: 0 0 0 3px oklch(58% 0.20 25 / 0.25);
}
.tds-input[disabled],
.tds-input--disabled,
.tds-select--disabled { background: var(--color-bg-3); color: var(--color-text-disabled); cursor: not-allowed; }

.tds-input--sm,
.tds-select--sm { height: var(--control-height-sm); padding: 0 var(--control-padding-x-sm); font-size: var(--font-size-sm); }
.tds-input--md,
.tds-select--md { height: var(--control-height-md); padding: 0 var(--control-padding-x-md); }
.tds-input--lg,
.tds-select--lg { height: var(--control-height-lg); padding: 0 var(--control-padding-x-lg); font-size: var(--font-size-lg); }

.tds-input__el {
  flex: 1; min-width: 0; height: 100%;
  background: transparent; border: 0; outline: 0; padding: 0;
  font: inherit; color: inherit;
}
.tds-input__el::placeholder { color: var(--color-text-tertiary); }
.tds-input__addon { color: var(--color-text-tertiary); display: inline-flex; align-items: center; }
.tds-input__addon--prefix { margin-right: var(--space-2); }
.tds-input__addon--suffix { margin-left: var(--space-2); }

.tds-select select {
  appearance: none; -webkit-appearance: none;
  flex: 1; height: 100%; background: transparent; border: 0; outline: 0;
  font: inherit; color: inherit; padding-right: var(--space-5);
}
/* Native <select> doesn't get :placeholder styling for free — when the
   selected option has an empty value, paint the visible text in tertiary
   so the placeholder option ("Select country…", "Code…", "Select
   currency…") reads as a hint rather than a real value. Uses :has()
   which is now broadly supported in evergreen browsers; falls back to
   normal text color elsewhere, which is acceptable. */
.tds-select:has(select option[value=""]:checked) select { color: var(--color-text-tertiary); }
.tds-select__chevron { color: var(--color-text-tertiary); margin-left: -16px; pointer-events: none; }

/* ═══ Field (label / hint / error) ═══ */
.tds-field { display: flex; flex-direction: column; gap: var(--space-2); }
.tds-field__label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); }
.tds-field__label--required::after { content: " *"; color: var(--color-error-500); }
.tds-field__hint  { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.tds-field__error { font-size: var(--font-size-xs); color: var(--color-error-500); }

/* ═══ Checkbox / Radio / Switch ═══ */
.tds-checkbox,
.tds-radio {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-size: var(--font-size-md); color: var(--color-text-primary); cursor: pointer;
  user-select: none;
}
.tds-checkbox input,
.tds-radio input { position: absolute; opacity: 0; pointer-events: none; }
.tds-checkbox__box,
.tds-radio__box {
  width: 16px; height: 16px; flex: none;
  border: var(--border-width-thin) solid var(--color-border-strong);
  background: var(--color-bg-2);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background var(--duration-fast) var(--easing-standard),
              border-color var(--duration-fast) var(--easing-standard);
}
.tds-checkbox__box { border-radius: var(--radius-sm); }
.tds-radio__box    { border-radius: var(--radius-full); }
.tds-checkbox input:focus-visible + .tds-checkbox__box,
.tds-radio    input:focus-visible + .tds-radio__box   { box-shadow: var(--shadow-focus); }
.tds-checkbox input:checked + .tds-checkbox__box,
.tds-radio    input:checked + .tds-radio__box {
  background: var(--color-primary-700); border-color: var(--color-primary-700);
}
.tds-checkbox__check { color: #fff; width: 10px; height: 10px; }
.tds-radio__dot  { width: 6px; height: 6px; border-radius: 50%; background: #fff; transform: scale(0); transition: transform var(--duration-fast); }
.tds-radio input:checked + .tds-radio__box .tds-radio__dot { transform: scale(1); }

.tds-switch {
  position: relative; display: inline-flex; align-items: center;
  width: 36px; height: 20px;
  background: var(--color-border-strong);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background var(--duration-normal) var(--easing-emphasized),
              border-color var(--duration-fast) var(--easing-standard);
  flex: none;
  padding: 0;
  box-shadow: inset 0 1px 1px oklch(0% 0 0 / 0.06);
}
.tds-switch::after {
  content: ''; position: absolute; top: 1px; left: 1px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.18), 0 0 0 0.5px oklch(0% 0 0 / 0.08);
  transition: transform var(--duration-normal) var(--easing-emphasized),
              background var(--duration-fast) var(--easing-standard);
}
.tds-switch:hover { background: oklch(72% 0.008 270); }
.tds-switch--on {
  background: var(--color-primary-700);
  box-shadow: var(--shadow-cta);
}
.tds-switch--on:hover { background: var(--color-primary-600); }
.tds-switch--on::after { transform: translateX(16px); }
.tds-switch:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.tds-switch[aria-disabled="true"],
.tds-switch:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══ Card ═══ */
.tds-card {
  background: var(--color-bg-2);
  border: var(--border-width-thin) solid var(--color-border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2);
  display: flex; flex-direction: column;
}
.tds-card__header,
.tds-card__footer { padding: var(--space-4) var(--space-6); }
.tds-card__header { border-bottom: var(--border-width-thin) solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.tds-card__footer { border-top: var(--border-width-thin) solid var(--color-border-subtle); }
.tds-card__body   { padding: var(--space-6); }
.tds-card__title  { margin: 0; font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }

/* ═══ Badge / Tag ═══ */
.tds-badge {
  display: inline-flex; align-items: center; gap: var(--space-1);
  height: 20px; padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  border: 1px solid transparent;
  white-space: nowrap;
}
.tds-badge--neutral { background: var(--color-bg-3); color: var(--color-text-secondary); border-color: var(--color-border-default); }
.tds-badge--success { background: var(--color-success-50); color: var(--color-success-700); border-color: oklch(58% 0.14 152 / 0.25); }
.tds-badge--warning { background: var(--color-warning-50); color: var(--color-warning-700); border-color: oklch(70% 0.16 70 / 0.25); }
.tds-badge--error   { background: var(--color-error-50);   color: var(--color-error-700);   border-color: oklch(58% 0.20 25 / 0.25); }
/* PILOT — indigo. Distinct from success-green (active) and warning-amber */
/* (expired). Reads "in progress / trial" at a glance. */
.tds-badge--pilot   { background: oklch(95% 0.04 280);    color: oklch(40% 0.16 280);      border-color: oklch(80% 0.10 280 / 0.35); }
.tds-badge--info    { background: var(--color-info-50);    color: var(--color-info-700);    border-color: oklch(60% 0.14 230 / 0.25); }
/* Ghost overlay — applied to terminated contract chips so they read */
/* as 'historical' next to live ones. Strikethrough + dimmed text + dashed   */
/* border. Works on top of any base tone (usually neutral).                  */
.tds-badge--ghost { opacity: 0.55; text-decoration: line-through; border-style: dashed; }
.tds-badge--ghost > span:first-child { text-decoration: none; }

/* Lapsed overlay — applied to chips whose contract has passed its       */
/* effectiveTo date (derived EXPIRED). Dashed border draws the eye, but  */
/* no strikethrough — EXPIRED is recoverable (extend the term to revive),*/
/* whereas TERMINATED is permanent.                                       */
.tds-badge--lapsed { border-style: dashed; }

/* Floating tooltip for ContractBadge — portal-rendered to <body> with        */
/* position: fixed so it escapes any overflow:hidden ancestor (such as the   */
/* table-card that clips its own contents). Positioned by JS via inline      */
/* left/top set to the chip's top-center; CSS handles the upward offset      */
/* and the arrow.                                                            */
.tds-floating-tip {
  position: fixed;
  transform: translate(-50%, calc(-100% - 8px));
  background: var(--color-text-primary, #1a1a1a);
  color: var(--color-bg-1, #fff);
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
  font-family: var(--font-family-sans, system-ui);
  line-height: 1.35;
  letter-spacing: 0;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
  animation: tds-floating-tip-in 90ms ease-out;
}
.tds-floating-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--color-text-primary, #1a1a1a);
}
@keyframes tds-floating-tip-in {
  from { opacity: 0; transform: translate(-50%, calc(-100% - 4px)); }
  to   { opacity: 1; transform: translate(-50%, calc(-100% - 8px)); }
}

/* ═══ Tabs ═══ */
.tds-tabs {
  position: relative;
  display: inline-flex;
  gap: var(--space-1);
  padding: 0;
  box-shadow: inset 0 -1px 0 var(--color-border-default);
}
.tds-tab {
  position: relative;
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  margin-bottom: -1px;
  background: transparent; border: 0; cursor: pointer;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
  color: var(--color-text-secondary);
  white-space: nowrap;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  transition: color var(--duration-fast) var(--easing-standard),
              background var(--duration-fast) var(--easing-standard);
}
.tds-tab::after {
  content: '';
  position: absolute; left: var(--space-3); right: var(--space-3); bottom: 0;
  height: 2px; border-radius: 2px 2px 0 0;
  background: var(--color-primary-700);
  transform: scaleX(0); transform-origin: center;
  transition: transform var(--duration-normal) var(--easing-emphasized);
}
.tds-tab:hover:not([disabled]):not(.tds-tab--active) {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}
.tds-tab:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  border-radius: var(--radius-md);
}
.tds-tab[disabled] {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
.tds-tab--active {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}
.tds-tab--active::after { transform: scaleX(1); }
.tds-tab__count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 6px;
  font-size: 11px; font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-tertiary);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
}
.tds-tab--active .tds-tab__count {
  color: var(--color-primary-700);
  background: var(--color-primary-50);
  border-color: transparent;
}

/* ═══ Modal ═══ */
.tds-modal-overlay {
  position: fixed; inset: 0; background: var(--color-bg-overlay);
  z-index: var(--z-modal);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-6);
  animation: tds-fade-in var(--duration-normal) var(--easing-standard);
}
.tds-modal {
  background: var(--color-bg-2); border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-5);
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column; max-height: calc(100vh - 96px);
  animation: tds-modal-in var(--duration-normal) var(--easing-emphasized);
}
.tds-modal__header { padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between; }
.tds-modal__title  { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }
.tds-modal__body   { padding: var(--space-6); overflow: auto; flex: 1; }
.tds-modal__footer { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border-subtle); display: flex; justify-content: flex-end; gap: var(--space-2); }
@keyframes tds-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes tds-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }

/* Drawer variant — same overlay + header/body/footer chrome, but slides
   in from the right edge and fills the viewport height. Used by
   ContractDetailView so admins can keep the contracts list visible while
   editing clauses. */
.tds-modal-overlay--drawer {
  justify-content: flex-end;
  padding: 0;
}
.tds-modal--drawer {
  width: 100%;
  max-width: none;
  max-height: 100vh;
  height: 100vh;
  border-radius: 0;
  box-shadow: var(--shadow-5);
  animation: tds-drawer-in var(--duration-normal) var(--easing-emphasized);
}
.tds-modal--drawer .tds-modal__body { padding: var(--space-5) var(--space-6); }
@keyframes tds-drawer-in { from { transform: translateX(24px); opacity: 0.6 } to { transform: translateX(0); opacity: 1 } }

/* ═══ Toast ═══ */
.tds-toast-stack {
  position: fixed; bottom: var(--space-6); right: var(--space-6);
  z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--space-2);
}
.tds-toast {
  display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-4);
  background: var(--color-bg-2); border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-4);
  min-width: 280px; max-width: 400px;
  animation: tds-toast-in var(--duration-normal) var(--easing-emphasized);
}
.tds-toast__icon { flex: none; }
.tds-toast__body { flex: 1; min-width: 0; }
.tds-toast__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }
.tds-toast__msg   { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }
.tds-toast--success .tds-toast__icon { color: var(--color-success-500); }
.tds-toast--error   .tds-toast__icon { color: var(--color-error-500); }
.tds-toast--warning .tds-toast__icon { color: var(--color-warning-500); }
.tds-toast--info    .tds-toast__icon { color: var(--color-info-500); }
@keyframes tds-toast-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }

/* ═══ Tooltip / Popover ═══ */
.tds-tooltip {
  position: absolute; z-index: var(--z-tooltip);
  background: oklch(18% 0.01 270); color: #fff;
  font-size: var(--font-size-xs); padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-3);
  white-space: nowrap; pointer-events: none;
}
.tds-popover {
  position: absolute; z-index: var(--z-popover);
  background: var(--color-bg-2); border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-4);
  padding: var(--space-3); min-width: 200px;
}

/* ═══ Table ═══ */
.tds-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  font-size: var(--font-size-md); color: var(--color-text-primary);
}
.tds-table thead th {
  text-align: left; font-weight: var(--font-weight-medium);
  font-size: var(--font-size-xs); color: var(--color-text-tertiary);
  text-transform: uppercase; letter-spacing: var(--letter-spacing-wide);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-3);
  border-bottom: 1px solid var(--color-border-default);
  position: sticky; top: 0;
}
.tds-table tbody td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}
.tds-table tbody tr:hover td { background: var(--color-bg-hover); }
.tds-table__sort { display: inline-flex; align-items: center; gap: var(--space-1); cursor: pointer; user-select: none; }
.tds-table__sort:hover { color: var(--color-text-primary); }

/* ═══ Pagination ═══ */
.tds-pagination { display: inline-flex; align-items: center; gap: var(--space-1); }
.tds-pagination__page {
  min-width: 28px; height: 28px; padding: 0 var(--space-2);
  border-radius: var(--radius-md); border: 1px solid transparent;
  font-size: var(--font-size-sm); color: var(--color-text-secondary);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.tds-pagination__page:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.tds-pagination__page--active {
  background: var(--color-bg-2); border-color: var(--color-border-default);
  color: var(--color-text-primary); font-weight: var(--font-weight-medium);
}

/* ═══ Layout shell ═══ */
.tds-layout { display: flex; height: 100vh; background: var(--color-bg-1); }
.tds-layout__sidebar { width: 240px; background: var(--color-bg-3); border-right: 1px solid var(--color-border-default); display: flex; flex-direction: column; }
.tds-layout__main    { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.tds-layout__header  { height: 56px; background: var(--color-bg-2); border-bottom: 1px solid var(--color-border-default); display: flex; align-items: center; padding: 0 var(--space-6); gap: var(--space-4); }
.tds-layout__content { flex: 1; padding: var(--space-6); overflow: auto; }

/* ═══ Customer wizard · Step 2 (B2 layout) ═══
   Two-column layout: left rail of contract type rows, right pane with
   the clause form for whichever type is currently focused. */
.cw-step2 { display: grid; grid-template-columns: 260px 1fr; min-height: 460px; }
.cw-step2__rail { border-right: 1px solid var(--color-border-subtle); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); background: var(--color-bg-1); }
.cw-step2__hint { margin-top: auto; padding: var(--space-3); background: var(--color-bg-3); border-radius: var(--radius-md); font-size: 11.5px; color: var(--color-text-tertiary); display: flex; gap: 6px; align-items: flex-start; line-height: 1.5; }
.cw-step2__hint svg { margin-top: 1px; flex: none; }

.cw-railrow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-md); cursor: pointer; border: 1px solid transparent; transition: background var(--duration-fast), border-color var(--duration-fast); }
.cw-railrow:hover { background: var(--color-bg-hover); }
.cw-railrow.is-focused { background: var(--color-bg-2); border-color: var(--color-border-default); box-shadow: var(--shadow-1); }
.cw-railrow.is-on { background: var(--color-primary-50); border-color: oklch(60% 0.14 262 / 0.25); }
.cw-railrow.is-on.is-focused { background: var(--color-primary-50); border-color: var(--color-primary-700); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.cw-railrow__title { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); line-height: 1.2; }
.cw-railrow__sub   { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.3; }

.cw-tog { width: 30px; height: 18px; border-radius: 999px; border: 0; background: var(--color-border-strong); position: relative; cursor: pointer; padding: 0; flex: none; transition: background var(--duration-fast); }
.cw-tog__dot { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px oklch(0% 0 0 / 0.2); transition: left var(--duration-fast); }
.cw-tog.is-on { background: var(--color-success-500); }
.cw-tog.is-on .cw-tog__dot { left: 14px; }

.cw-step2__main { padding: var(--space-5) var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.cw-step2__mainhead { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border-subtle); }
.cw-step2__form { display: flex; flex-direction: column; gap: var(--space-4); }

```
