# Carbon Admin Portal — UI 约定

## 头像 / 首字母方块（Avatar · Initials Tile · 锁定）

所有「人 / 客户 / 商户 / 应用」头像统一用**中性方块**(组件 `window.CompanyLogo`,定义在 `shared.jsx`;商户/设备/应用各处的 `MerchantAvatar`/`AppIcon` 等同款规格)。**不引入任何彩色哈希**——只用中性 token。

- **规格**:方块圆角 12(头像可传 `square={false}` 出圆形);白字改为 `--avatar-fg`;`1px` 细边;首字母取前两个词首字母大写。默认 `40×40`(DS 2.0 图标容器规格)。
- **颜色 = 两个主题感知 token**(定义在 index.html `:root` / `[data-theme="dark"]`):
  - `--avatar-bg`:浅色 = `var(--color-bg-3)`;**深色 = `oklch(30% 0.006 260)`**(比卡片亮一档,避免在深色画布上隐没)。
  - `--avatar-fg`:浅色 = `var(--color-text-secondary)`;深色 = `oklch(84% 0.005 260)`。
- 前端接入:用这两个 token 作头像底/字色即可自动适配明暗;**不要写死 `bg-3` 或 `#fff`**(深色会看不见)。
- 设备型号方块是**另一个组件** `ModelTile`(浅彩底 + 同色相深字 + 显示型号全称),是标签语义,保持不动,不要和头像混用。
  - **深色模式**:`.dm-tile--placeholder` 用 `--dm-h`(名字哈希出的色相)做 CSS 变量,浅色 = `oklch(96% 0.03 var(--dm-h))` 底 + `oklch(38% 0.08)` 字;**深色 = `oklch(30% 0.035 var(--dm-h))` 底 + `oklch(80% 0.06)` 字**(降亮、保留色相识别,避免在深色画布上扎眼)。不要在深色下沿用浅色的 96% 高亮底。

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

## 圆角体系（统一梯度 · 按层级分配 · 锁定 · DS 2.0）

**只允许这一套圆角梯度，按组件层级分配；禁止出现 5/6/7/8/9/11/13/14/15/18px 这类中间档随手值。**
（对应 DS token：sm=4 / md=10 / lg=12 / xl=16 / 2xl=20 / full）

| 层级 | 圆角 | token | 适用组件 |
|---|---|---|---|
| 控件 | `10` | `--radius-md` | Button、Input、Select、图标按钮、菜单项、搜索框 |
| 小芯片 | `4` | `--radius-sm` | Tag、kbd、复选框、细条 |
| 内层/小块·图标容器 | `12` | `--radius-lg` | KPI/统计磁贴、卡内提示框、分段控件、图标容器(40×40)、嵌套小卡 |
| 容器 | `16` | `--radius-xl` | **Card、表格容器、列表卡、详情区块卡** |
| Modal / Drawer / 大特性卡 | `20` | `--radius-2xl` | Modal、Drawer、少量大卡 |
| 药丸 | full | `--radius-full` | Pill、状态点、徽章 |

要点：
- **控件(10)和容器(16)圆角不同是有意的层级区分**（Stripe/Linear/Notion 同款做法），不是 bug；搜索框紧贴列表卡时二者圆角不一致属正常。
- App Publish 子应用的卡片必须用 `16`（`--radius-xl`），不要用 `8/12`，与外壳其它页面保持一致。
- 新增任何卡片/容器一律 `16`、Modal/Drawer `20`、控件 `10`、图标容器 `12`；不要自定义中间档。

## 组件尺寸规范（锁定）

同级组件的尺寸 / 圆角 / 字号 / 字重必须一致：

| 组件 | 高度 | 圆角 | 字号 | 备注 |
|---|---|---|---|---|
| Button | 36（sm 28） | 10 | 14 / 600 | 一屏一个 primary CTA |
| Input / Select / 搜索框 | 36 | 10 | 14 | Select 统一用 `dsSelect` |
| Card / 表格容器 / 列表卡 | — | 16 | 卡头标题 14 | 内边距 20、卡头 14·20、1px 边 + `--shadow-1` |
| Modal / Drawer | — | 20 | 卡头标题 14 | `--radius-2xl` |
| KPI / 统计磁贴 | — | 8 | 标签 11–12 / 值 24 | |
| Tabs | 42 高 | 下划线式 | 标签 13.5 / 600 | 不加计数 tag |
| Badge / 状态 / Pill | — | full | 11–12 | |
| Tag 小芯片 / kbd | — | 4 | 11–12 mono | |

新增组件一律继承上表，不要自定义尺寸 / 圆角 / 字号。

## Stats Card（统计/KPI/概览磁贴 · 唯一组件 · 锁定）

所有「统计/KPI/概览/汇总」磁贴**只能用 `<StatCard>` / `<StatGrid>`**（定义在 `shared.jsx`，全局挂在 `window`）。禁止页面再手写 `.tkt-kpi__tile` / `.up-stat` / `.pu-stat` 之类的平行实现。

- **统一规格**：圆角 `16`（`--radius-xl`，与列表卡同级，因为它是页面级独立卡）、内边距 `14·16`、最小高度 `92`、`1px` 边 + `--shadow-1`、卡间距 `12`（`StatGrid`）。
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
