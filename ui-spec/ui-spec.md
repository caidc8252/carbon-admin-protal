# 列表页 & 框架公共规范（TOMS Design System 2.0）

> 适用范围：所有中后台列表页、表单页、以及应用外壳（Shell）。
> 本规范基于 TOMS Design System 2.0 的 token 与组件，**不引入任何新颜色/字号/间距**。
> 标签含义：**KEEP** 维持现状 · **NEW** 新增约束 · **FIX** 需修正现状。
> 所有尺寸单位为 px；token 名（`--color-*` / `--space-*` / `--shadow-*`）保持原样引用。
>
> 📐 **配套示意图**：`ui-spec/diagrams/index.html`（按章节拆分的可编辑 HTML，各节末附对应链接）。

---

## 0. 基础对齐

- **断点（对齐 DS token，不自立标准）**
  - 小屏 `< 768`（`--breakpoint-md`）
  - 中屏 `768 – 1024`（`--breakpoint-md` → `--breakpoint-lg`）
  - 宽屏 `≥ 1024`（`--breakpoint-lg` 及以上）
- **动效**：过渡 `120 / 200ms` + `--easing-standard`；`prefers-reduced-motion: reduce` 时全部归零。
- **CTA 唯一性**：每个界面**只能有一个实心主 CTA**（`--color-primary-700`）。强调色（`--color-accent-*`）只用于图表描边与 `✦` AI 标记，**永不上按钮**。

---

## 1. 标题 & 页面外壳

| 标签 | 约束 |
|---|---|
| FIX | 全站**只保留一层主标题**：页面标题由**标题栏**（§5.0 ②，导航栏正下方的独立横带）承载，**不在内容区里再写一个 26px `.page__head` 大标题**。面包屑只给路径，不重复页面标题。 |
| FIX | **内容布局分两类**：① **列表页 / 仪表盘 → 横向拉满**（撑满 `.content` 可用宽度，左右留统一 `--space-*` 边距，**不设 max-width、不居中**）；② **表单 / 详情页 Tab 下的内容 / 卡片内的内容 → 居中**（**max-width 1200 居中，禁止铺满**；如多列表单可在卡片内居中其内容列）。禁止页面内裸写宽度数字。 |

---

## 2. 新建 / 编辑表单

| 标签 | 约束 |
|---|---|
| NEW | 统一 `<FormPage>` / `<FormWizard>` 外壳：一律走 `.page`，**禁止自画整屏头栏**（修正 New App 子包模式）。 |
| NEW | 操作按钮统一放**标题栏右侧**：`Cancel`（secondary）+ 主操作（primary）并列在标题栏最右，与详情页（§6.3）一致。不再用 sticky 底栏，也不再有的在顶有的在底。 |
| NEW | 逻辑分组 **≥3 用 Stepper（分步向导）**，否则单页表单。Summary 侧栏要么所有向导都带、要么都不带。 |
| NEW | 标题策略与第 1 节一致：表单页不再写 26px 大标题，由面包屑承载。 |

### 2.1 分步向导底部导航（**NEW：统一 `WizardFooter` 组件**）

> 全页分步向导（New customer / New product / New sample order / Checkout / Upload firmware…）底部的「上一步 / 下一步 / 末步主操作」**统一收敛到 `wizard-footer.jsx` 的 `<window.WizardFooter>`**，各页不再各写各的。退出/取消由标题栏左侧返回箭头（§6）承担——向导底栏**不再放 Cancel**。

```
内容（当前步）
─────────────────────────────────  ← 1px 顶部分隔线
                       [ ‹ Back ]  [ Next › ]      ← 右对齐
```

| 标签 | 约束 |
|---|---|
| NEW | **容器**：`.wizard-foot` —— `padding-top:16px` + `border-top:1px solid var(--color-border-subtle)`，与上方内容有清晰分隔。 |
| NEW | **对齐（方案 B）**：**全部右对齐**（`justify-content:flex-end`，gap 10），上一步紧邻主操作，置于内容区右下。 |
| NEW | **上一步**：`variant="secondary"` + 前置 `chevL` + 文案 **"Back"**；在**第 1 步 disabled 并保留**（不隐藏，保持布局稳定）。 |
| NEW | **下一步**：`variant="primary"` + **后置** `chevR` + 文案统一 **"Next"**（弃用 "Continue" / "Next step"）。 |
| NEW | **末步主操作**：`variant="primary"` + `check` 图标 + **上下文动词短语**（如 `Create customer` / `Publish` / `Create order` / `Upload firmware version`）——此处保留各向导自有文案，不强行统一。 |
| NEW | **尺寸**统一 `md`。 |
| NEW | 用法：`<window.WizardFooter step totalSteps onBack onNext nextDisabled onFinal finalDisabled finalLabel [finalIcon] />`；`step >= totalSteps` 时自动切换为末步主操作。已接入：customer-wizard / product-form / order-wizard / shop-checkout / firmware-upload。⏵ 示意图：`ui-spec/diagrams/02-forms.html`。 |

---

## 3. 列表卡 & 分页

> **列表解剖（结构自上而下）**——所有列表页统一为这 4 段，由 `ListCard` 组件承载，各页不自画：
>
> ```
> ┌─────────────────────────────────────────────┐
> │ ① list-head   左：<N> <unit>  ·····  右：Export │  计数行（sticky）
> ├─────────────────────────────────────────────┤
> │ ② thead       列标题；可排序列带 ▲▼ 指示器       │  表头（sticky）
> │   ─────────────────────────────────────────  │
> │   行 …（横向铺满，撑满可用宽度，不设 max-width） │  ③ 表体
> │   行 …                                        │
> ├─────────────────────────────────────────────┤
> │ ④ Pagination  Rows/page · Showing X–Y of N · 页码器 │  分页（卡片页脚）
> └─────────────────────────────────────────────┘
> ```
>
> | # | 段 | 规约 |
> |---|---|---|
> | ① | 表头之上：左总数 / 右 Export | §3.1 |
> | ② | 表头 + 排序（按业务决定哪些列可排） | §3.1 / **§3.4** |
> | ③ | 表体横向铺满 + 列宽/横向滚动兜底 | §1 / §3.3 |
> | ④ | 底部分页栏（页码分页 **或** Load more，二选一） | §3.2 / **§3.6** |

### 3.1 列表卡

| 标签 | 约束 |
|---|---|
| KEEP | 统一 `SearchBar` + `ListCard` + `Pagination` 组合（7 个核心页已合规：Customers / Orders / Goods / Catalog / Device Models / Factory Images / Published Apps）。 |
| FIX | Tickets / Devices / Users / Roles / Audit / App Publish 收敛到标准件。 |
| KEEP | `ListCard` 顶部 sticky 头：左「`<N> <unit>`」、右 Export / 自定义按钮；滚动时 list-head 与 thead 同时吸顶，偏移由 CSS 变量自动计算。 |
| **NEW** | **list-head 尺寸（2026-06-10 固化，基准 = Admin Portal `ListCardHead`）**：`padding: 10px 16px 10px 20px`（上下 10、左 20 与表格首列对齐）、文字 `12px`（计数数字 mono 500 主文字色、单位词次要色）、右侧按钮用 `sm`（28）——总高 ≈ **49px**。不取 12px 垂直内边距（会到 53，偏高）。 |
| NEW | **list-head 计数行不加前置图标**：左侧只放纯文本「`<N> <unit>`」，**计数前不放任何装饰图标**（如 box / device / package）。图标与计数并置属噪音，计数文本本身已足够标识列表内容。已落地：App Publish、Sample Orders、Sample Devices。 |
| FIX | **计数行不附「filtered from N」过滤说明**：计数行恒为纯 `<N> <unit>`（`<N>` = 当前过滤后条数）。「正在按什么过滤」一律交给 Active filters 芯片（§4.5）承载，计数行不再追加 `· filtered from <总数>`。理由：芯片已逐条列出生效条件且可单独移除，计数行再写一遍总数属信息重复。已落地：App Publish、Sample Orders、Sample Devices。 |

### 3.2 分页（**FIX：移除“跳转到第 N 页”**）

分页组件**只保留三个区块**，按从左到右顺序：

1. **Rows per page** — 下拉，高 26。
2. **Showing `X–Y` of `N` rows** — 数字一律 `tabular-nums` 等宽；过滤时追加 “filtered from `N` total”。
3. **页码器** — `« ‹ 1 2 3 … 52 › »`，按钮 min-width 28 / 高 28。

| 标签 | 约束 |
|---|---|
| FIX | **去掉 “Go to page ___ Go” 跳页输入框**。理由：页码器 + 首末快捷已足够；跳页输入在常规列表是低频、易误操作的噪音。需要精确定位时用搜索/过滤，而非页码跳转。 |
| NEW | **每页行数统一**：默认 `25`，选项 `[10, 25, 50, 100]`。去掉很少用的 `200` 与子包里的 oddball `20`。设为 `Pagination` 组件默认值，各页不再各传各的。 |
| NEW | 页码窗口：≤7 页全展开；更多时只显示「首 / 末 / 当前 ±2」，中间用 `…` 省略。 |
| NEW | 改每页行数时自动回到第 1 页。 |
| **NEW** | **分页栏继承卡片底部圆角（2026-06-10 固化）**：分页栏是列表卡的**页脚**，其容器须 `border-radius: 0 0 var(--radius-lg) var(--radius-lg)` **并加 `overflow: hidden`** 裁切内层——分页组件自带不透明方角背景，卡片又是 `overflow: visible`，不裁切时方角白底会盖出卡片圆角边框之外，左右下角出现「缺口」（已在 App Publish 修复，属 bug 而非样式选择）。 |
| FIX | Audit Log 的手写 `.al-pag` 分页换成标准 `Pagination`。 |

### 3.3 列宽与横向滚动（**列表显示不下时**）

> 列表页已横向拉满（§1），列尽量在可用宽度内自适应；但列很多/很宽时仍可能放不下。规则如下：

| 标签 | 约束 |
|---|---|
| NEW | **竖向滚动 = 外层 `.content`（参考 Customers）**：列表竖向滚动条始终是主区 `.content` 那根（搜索/条件区随之滚走），**list-head 计数行 + thead 表头吸顶**到 `.content` 顶部（见 §5.2）。这是列表的**默认且优先**行为。 |
| NEW | **优先级 1：列内截断 + 列开关**。文本列用单行省略号（`text-overflow: ellipsis; white-space: nowrap`），完整内容走 `title` tooltip；次要列在窄屏按断点隐藏（`hide-md` / `hide-lg`），列多时由 **Columns 菜单**让用户自行收起。**这是“放不下”的首选解**——靠截断 + 收列适配，不默认上横向滚动。 |
| FIX | **横向滚动与“表头吸顶到外层”互斥（纯 CSS 限制）**：要把横向滚动**收在表格内**，必须给表格外层加 `overflow-x`，而该容器会成为 `sticky` 的定位上下文——表头会改吸到这个横向容器、**竖向滚动时不再吸顶到页面**。因此**默认不开**表格内横向滚动；保 §5.2 的「外层竖向 + 表头吸顶」。（修正原条目“只开 overflow-x、thead 仍随页面吸顶”的错误表述——纯 CSS 做不到。） |
| NEW | **确需表格内横向滚动时（例外）→ 数据网格**：个别列极多、且必须横向滚动的列表，可改为**有界数据网格**——表格区自身带横/纵双向滚动、表头 `sticky top:0` 吸在该视口内。代价：竖向滚动条变成**列表自己的内层**滚动条（非最外层），由各列表显式选择，不作默认。 |
| NEW | **首列冻结（可选，仅数据网格内）**。横向滚动时，标识列（名称/ID）可 `position: sticky; left: 0` 冻结，方便对照。 |
| NEW | **移动端可选替代**：极窄屏（`<768`）信息密集的列表，可改用**卡片式行**（每行堆叠为一张小卡）替代横向滚动，二选一由各列表自行决定。 |

### 3.4 表头与排序

> 排序是列表的标准能力，但**不是每列都排**——由业务决定哪些列可排（如 Customers 仅「Registered」可排）。统一为 thead 内的点击排序，组件即规范。

| 标签 | 约束 |
|---|---|
| NEW | **按列声明可排序**：可排序列的 `<th>` 用排序单元（`tds-table__sort`：列名 + ▲▼ 指示器）；不可排序列写纯文本 `<th>`。是否可排**按业务决定**——标识/时间/金额/数量等有序量优先可排；状态、操作、富文本/多值列（如 Contracts 徽章列）默认不排。 |
| NEW | **三态交互**：点未激活列 → 以该列**升序**激活（`asc`）；再点同列 → 在 `asc ⇄ desc` 间切换。同一时刻**仅一个排序列**（单列排序，不做多列）。 |
| NEW | **指示器**：激活列 ▲（asc）/ ▼（desc），满不透明度；未激活列指示器淡显（opacity ≈ 0.3）以提示「可排」。 |
| NEW | **默认排序**：每个列表声明一个默认 `sortBy + sortDir`（如 Customers = `registeredAt` / `desc`，最新在前）。进入页面即按此排，不留「无序」初始态。 |
| NEW | **作用于全量过滤结果再分页**：排序对 `applied.*` 过滤后的完整结果集生效，**先排序后分页**（不是只排当前页）。改排序回到第 1 页。 |
| NEW | **类型感知比较**：数字/日期按数值与时间比较（不按字符串），文本用 `localeCompare`；空值统一沉底。 |
| NEW | **可访问性**：可排序 `<th>` 加 `aria-sort="ascending|descending|none"`，整列标题可键盘聚焦并以 `Enter/Space` 触发。 |

### 3.5 列表行操作（**NEW：图标 + 悬浮 tooltip + 受控动词词表**）

> 行内空间有限，行右侧操作统一为**纯图标按钮 + 鼠标悬浮 tooltip**；动词收敛到一张词表（每词唯一语义，禁止近义混用）。⏵ 示意图：`ui-spec/diagrams/03-list-pagination.html`。

**① 承载形态（由操作数量 + 是否破坏性决定）**

| 标签 | 约束 |
|---|---|
| NEW | **0 个次级操作** → 整行可点打开详情，行尾放 `chevR`（`›`）作为唯一允许的纯图标“进入”提示。 |
| NEW | **1–2 个操作** → 行内纯图标按钮并排（30×30、`iconbtn`），顺序**中性在前、破坏性在最后**。 |
| NEW | **≥3 个操作，或破坏性与 ≥2 个其他操作并存，或操作需要解释** → 收进 `more`（**竖向三点**）kebab 菜单（`PortalDropdown`，右对齐 `bottom-end`、宽 ≥200px）。 |
| NEW | **一行只用一种承载**：行内图标 *或* kebab，**不混用**；空间紧张时优先 kebab。 |
| NEW | 每个图标按钮必带 `title` + `aria-label`（= tooltip 文案 = 动词）。**除行尾 `chevR` 外，禁止无 tooltip 的纯图标。** |

**② 受控动词词表（动词 → 图标 → 语义）**

| 动词 | 图标(`Icon name`) | 语义 | 可逆 | 配对/恢复 |
|---|---|---|---|---|
| Edit | `edit` | 编辑字段 | — | — |
| Details | `eye` | 查看详情（不跳页的轻量入口） | — | — |
| Copy | `copy` | 复制 ID / 包名 / 链接 | — | — |
| Resend invite | `mail` | 重发邀请邮件 | — | — |
| Reset password | `key` | 重置密码 | — | — |
| Lock / Unlock | `lock` / `unlock` | 锁定 / 解锁账号 | 可逆 | 互为配对 |
| Promote to Admin | `arrowU` | 提升为 Admin | — | — |
| Suspend / Resume | `pause` / `play` | 暂停 / 恢复访问（合同等） | 可逆 | 互为配对 |
| Unpublish | `download` | 下架已发布对象 | 可逆 | Publish / Re-publish |
| Bind / Unbind | `link` / `unlink` | 设备↔App 绑定 / 解绑 | 可逆 | 互为配对 |
| Assign / Unassign | `link` / `unlink` | App↔商户 指派 / 取消（图标同上，tooltip 区分） | 可逆 | 互为配对 |
| Cancel | `x` | 取消进行中 / 待处理项（如待激活邀请） | — | — |
| Revoke | `ban` | 作废凭证 / 令牌 | 不可逆 | Regenerate（另发） |
| Terminate | `ban` | 终止合同并归档（tooltip 区分 Revoke） | 不可逆 | — |
| Delete | `trash` | 永久删除记录 | 不可逆 | — |
| Firmware | `cpu` | 进入固件管理（Device Models 行内入口） | — | — |
| More | `more`（竖向三点） | 展开 kebab 菜单 | — | — |

> 新增图标已加入 `shared.jsx` 的 `Icon` 集：`unlock` `unlink` `pause` `play` `ban`（24×24 / 1.5px / round）。`trash` 现为“带盖+两竖线”款、`more` 现为竖向三点，均已是现状。

**③ tone 与二次确认**

| 标签 | 约束 |
|---|---|
| NEW | **红色（danger）tone**：直接生效且中断服务/收回访问的操作 —— `Unpublish` / `Revoke` / `Terminate` / `Cancel`。 |
| NEW | **`Delete` 例外用中性**：删除必走二次确认弹窗（确认框即安全闸），行内图标不标红，避免一列全红。 |
| NEW | **不可逆操作（`Revoke`/`Terminate`/`Delete`）必走确认弹窗**；高危项要求输入确认词（复用 `ConfirmDialog` 的 `requireText`）。可逆开关（`Suspend`/`Disable`/`Unpublish`/`Lock`）可直接执行或轻确认。 |

**④ kebab 菜单内部规则**

| 标签 | 约束 |
|---|---|
| NEW | 触发器 `more`（竖向三点），30×30、tooltip “More”。 |
| NEW | 每项 = **图标 + 文字 label（Title Case 动词）**，**不加描述说明行**。 |
| NEW | 顺序：中性/常用在上（Edit、Details…）→ 状态切换（Lock、Suspend…）→ 破坏性置底，上方加 1px 分隔线、红字。 |
| NEW | **按行状态隐藏/置灰**：与当前状态互斥的项直接隐藏（如未锁定不显示 Unlock）；因权限/依赖暂不可用的项置灰 + tooltip 说明原因。 |
| NEW | 不嵌套子菜单；选中 / 点外 / `Esc` 即关闭。 |

---

### 3.6 Load more（**NEW：分页的替代选型**）

> 列表卡页脚的「翻页」除 §3.2 的页码分页外，另设一种 **Load more（加载更多）** 形态——**两者二选一，不并存**。页码分页是**默认**；Load more 仅用于「信息流式 / 次级 / 总数不重要 / 以连续浏览为主」的列表（如活动流、通知、详情页内的关联子列表）。
>
> **唯一基准实现**：`tickets.jsx` 的 `CommentsCard`（Tickets → Details → Comments）——新增 Load more 一律复用它的参数与交互，不再各写各的。

```
区块标题   Comments · 24            ← 总数放标题（· N），不在页脚重复
   项 …（已加载 10）
   项 …
   项 …
            [ ⌄ Load more ]                 ← sm 按钮 + chevron-down，居中
```

| 标签 | 约束 |
|---|---|
| NEW | **默认仍是页码分页（§3.2）**：主数据表（可排序 / 可跳页 / 需精确定位）一律用页码分页。Load more 只在上述「流式 / 次级」列表启用，由各列表显式选择。**同一列表二选一，绝不与页码器并存。** |
| NEW | **承载**：列表 / 区块底部居中（`justify-content:center`，与上方内容间距 `12`）放一个 **`size="sm"` 的中性（secondary）按钮**——前置 **chevron-down（`chevd`）图标** + 文案 `Load more`。遵循 CTA 唯一性（§0），**不用主色实心**，也不在按钮上加余量数字。 |
| NEW | **批量大小**：初始显示 **10**、每次追加 **+10**（对齐 Comments 基准 `useState(10)` / `v + 10`）。 |
| NEW | **加载态**：点击后按钮走 `loading` 转圈、**去掉 chevron 图标**、文案换为 **`Loading…`** 并 `disabled`（保留宽度）；加完恢复 `⌄ Load more`。 |
| NEW | **无进度读出**：页脚**只放按钮**，不显示 `Showing X of N` 一类的进度行。总数放在**区块 / 卡片标题**（如 `Comments · 24`）或 §3.1 表头上方的 `<N> <unit>`。 |
| NEW | **追加而非翻页**：点击把下一批**追加**到当前视图（`visible += 10`），**不清空已加载**。 |
| NEW | **改排序 / 过滤回到第 1 批**：排序或过滤条件变化时，重置为首批 10（对齐 §3.4「先排序后分页」「改条件回第 1 页」）。feed 语境默认**最新在前**（对齐 Comments 的 `at` 降序）。 |
| NEW | **全部加载完 → 留空**：所有行加载完后**移除按钮**，页脚留空，不再显示 “All N loaded” 之类的尾行。 |
| NEW | **不做自动无限滚动**：必须**显式点击**按钮才加载下一批；不在滚动到底时自动拉取（避免滚动劫持，保 §5.2 单一滚动容器）。 |
| NEW | **可访问性**：按钮可 Tab 聚焦、`Enter/Space` 触发；加载期间 `disabled` + `loading`（Spinner 配 `aria-label="Loading"`）。 |

> 配套示意图：`ui-spec/diagrams/03-list-pagination.html`（Load more 三态 + 与页码分页的二选一对照）。基准实现见 `tickets.jsx` 的 `CommentsCard`。已落地：**App Publish → Details → Versions**（详情页关联子列表——list-head 纯 `<N> versions` 计数 + Load more，初始 10 / +10 / 改过滤回首批 / 全部加载完移除按钮，取代原页码分页）。

---

## 4. 搜索与筛选（Search & Filtering）

> 📐 示意图：`ui-spec/diagrams/04-search.html`

> **本章合并**旧「搜索栏 + 高级搜索 + Active filters」三节为单一章节。三者本是同一条件区的两层（常驻快捷栏 + 进阶抽屉）+ 一个统一出口（芯片），共用同一套 `draft/applied`（R-01）、同一套控件样式。控件库统一为 **4 类：搜索框 / 选择框 / 多选框 / 级联**，全部 `md`（高 `36`），**点 Search 才生效**。

### 4.1 条件区容器（**FIX：无背景、无底部分隔线**）

> 内联条件区（SearchBar + 选择器所在的那一块）是内容区的一部分，不是一条独立色带——**容器透明、无填充背景、无底部分隔线**，直接坐落在内容底色 `--color-bg-1` 上。修正此前把条件区画成 `--color-bg-2` 白色带 + `1px` 底线、与白色标题栏（§6.1）糊成一块的做法。

| 标签 | 约束 |
|---|---|
| FIX | **容器透明**：条件区**不设** `background`（继承内容区 `--color-bg-1`），**不设** `border` / `border-bottom` 分隔线。与上方标题栏的区分由标题栏自身的底线（§6.1）完成，条件区不再重复画线。 |
| NEW | **间距**：条件区与其下列表卡之间仅留 `16`（`--space-4`，§5.4），靠留白分隔、不靠线；条件区到上一区块（标题栏，或其上的 KPI / 状态区）按 §5.4 的 `24` 节奏留白。 |
| NEW | **吸顶**：条件区**随内容滚走、不吸顶**（§5.2）；只有 list-head 计数行 + thead 吸顶。 |

> 已落地：App Publish、Sample Devices。其余列表页改造时一并对齐。

### 4.2 行为（R-01）

- **点 Search 才出结果**：输入框/下拉只更新 `draft`，不影响表格。
- **Enter = Search**：任意输入框回车等价于点击 Search。
- `runSearch` 时调用 `setPage(1)`（如有分页）。
- 过滤用 `applied.*`，**不要**用 `draft.*`。
- 进阶抽屉、多选、级联**全部遵循 R-01**：只改 `draft`，提交时一次性生效。

### 4.3 按钮层级与顺序（**FIX：Search → secondary；Advanced 在 Search 左侧**）

> 修正“双主色”问题：此前 New X（创建）与 Search 同为 `--color-primary-700 + --shadow-cta`，一页出现两个实心主 CTA，违反 CTA 唯一性。

| 按钮 | 样式 | 类 |
|---|---|---|
| **New X（创建）** | 唯一实心主 CTA（保持 `--color-primary-700` + `--shadow-cta`） | `.tds-btn--primary` |
| **Search（搜索）** | **secondary**：`bg-2` 底 + 1px `--color-border-default` 边框 + `--shadow-1`，主文字色 | `.tds-btn--secondary` |
| **Advanced（进阶）** | secondary，前置 filter 图标，挂「已生效进阶条件数」badge | `.tds-btn--secondary` |

| 标签 | 约束 |
|---|---|
| KEEP | Search 配 `Enter` kbd 提示，secondary 样式不再与创建按钮抢焦点；落在 `SearchBar` 的 `.sb__primary` 一处，全站生效。 |
| **NEW** | **顺序固定：`[输入] [选择…] [Advanced] [Search]`**。Advanced 归入「输入条件」簇、**置于 Search 左侧**；**Search 恒为条件行最末位**（唯一终点提交），全站列表页统一此规则。 |

### 4.4 控件库（**NEW：5 类统一控件**）

> 全站条件区 / 进阶抽屉的字段控件统一收敛为 5 类，**禁止手写原生 `<input>/<select>`**。落到 `list-kit.jsx`（`ListSearchInput` / `ListFilterSelect` / `ListSearchableSelect` / `MultiSelect` / `CascadeSelect`），列表页经 `ListConditionPanel` 复用。lect`），列表页经 `ListConditionPanel` 复用。

**4.4.0 基线（全部控件共用）**：高 `36`（`--control-height-md`）、圆角 `7`、`bg-2` 底 + `1px --color-border-default` 边 + `--shadow-1`；聚焦 `--shadow-focus`（3px primary 环）；行内 `gap: var(--space-3)`（12），窄屏可换行。

**4.4.1 搜索框 `SearchInput`**

| 标签 | 约束 |
|---|---|
| KEEP | 左置放大镜（13px，`--fg3`）；占位符 `--fg3`；最右常驻 `Enter` kbd 提示。 |
| NEW | 有值时在 `Enter` 提示左侧出现清空 `×`；清空回到空串并保留焦点。 |
| KEEP | 默认宽 `320`（区间 `280–360`，按字段长度）。 |

**4.4.2 选择框 `SearchSelect`（含选中态）**

| 标签 | 约束 |
|---|---|
| KEEP | 结构：可选左置图标 + label + 右置 `chevron-down`（11px，`--fg3`）；默认宽 `170`（区间 `160–200`）。 |
| KEEP | **未选中态**（值 = 默认 `any` / 第一项）：label `--fg2`、图标/箭头 `--fg3`，无强调色。 |
| **NEW** | **选中态（值 ≠ 默认）= 方案 A「克制」**：① label → `--color-text-primary`（`--fg1`）+ 字重 `500`；② 左置图标（若有）→ `--color-primary-700`；③ 箭头位置出现清空 `×`（hover 显，命中区 16、`--color-primary-700`、hover 底 `--color-primary-100`）。**边框 / 底色不变**。 |
| NEW | 选中即进 §4.5 Active filters 芯片；选中态仅影响选择框自身视觉、不改行为。 |

**4.4.3 多选搜索框 `MultiSelect`（NEW）**

| 标签 | 约束 |
|---|---|
| NEW | **触发器**同 4.4.0 基线 + 4.4.2 选中态：无选 → 占位符（如 “All statuses”）；有选 → `<Label>: <N>`（应用选中态 A）。 |
| NEW | **popover**：卡片 `radius 8` + `--shadow-2` + 1px 边；顶部 **Select all** 行（含 `indeterminate` 半选态）+ 复选列表。 |
| NEW | **复选框** = 现有 `SelectCheckbox`（App Store / Firmware 同款）：`16×16`、圆角 4；选中 = `--color-primary-700` 实底 + 白勾；半选 = 主色底 + 白横杠。 |
| **NEW** | **行为 = 方案 a「即时 R-01」**：勾选只改 `draft`，**popover 无 Apply/Clear 底栏**；关闭 popover 后点条件行 **Search** 才生效（与全站 R-01 一致）。 |

**4.4.4 级联搜索 `CascadeSelect`（NEW · 典型：商户 → 门店）**

| 标签 | 约束 |
|---|---|
| **NEW** | **实现 = 方案 A「双联动 Select」**：两个相邻 `SearchSelect`（父 / 子）。父选项变化**动态过滤**子选项。 |
| NEW | **父未选**（= All）时**子级禁用置灰**（`--fg4` 文字 + `--bg3` 底）并固定为 “All …”；选定父级后子级启用。 |
| NEW | **清空父级** → 子级自动回 “All …”；父 / 子各自的选中态走 4.4.2 方案 A。 |
| NEW | 遵循 R-01：父 / 子都只改 `draft`，点 Search 生效；两条件分别进 §4.5 芯片、可逐条移除。 |

**4.4.5 可搜索选择框 `ListSearchableSelect`（NEW · 单选 + typeahead）**

> 📐 示意图：`proposals/searchable-select.html`。已落地：Devices 的 Merchant / Store。

| 标签 | 约束 |
|---|---|
| **NEW** | **定位 = `SearchSelect` 的「长列表」版**：单选，选项可能多且需要打字找（商户 / 门店 / 机型 / OS / 发布方）时用它替原生 select。**不卡固定阈值，按用途判断**（固定短枚举仍用 `ListFilterSelect`）。 |
| NEW | **触发器与 `SearchSelect` 视觉零差异**：复用 4.4.0 基线 + 4.4.2 选中态方案 A（label→`fg1`+500、左图标→主色、箭头位出现清空 ×）。默认宽 `190`（区间 180–220）。 |
| **NEW** | **popover**：卡片 `radius 8` + `--shadow-2` + 1px 边，锚触发器正下方 offset 4，min-width=触发器宽（可增宽至内容、上限 320）。**顶部一行内嵌搜索框**（放大镜 13px + 输入，打开自动聚焦）——与 `SearchSelect` 的唯一结构差异。 |
| **NEW** | **列表一次最多 12 行、不滚动**：命中 &gt;12 时只渲染前 12（**不显示溢出提示**），其余项**只能继续打字缩小**才能选到。 |
| NEW | **行**：高 34 / padding `8 12` / `fg1`；hover 或键盘高亮底 `--color-bg-hover`；选中行右侧 `check`（13px 主色）+ 字重 500。空态 `No matches` 单行居中 `fg3`。 |
| **NEW** | **行为 = R-01**：选中只改 `draft`、点 Search 才生效；点选项 = 选中 + 关闭 popover（单选）。**查询词仅用于过滤、不是过滤值**，关闭时清空、不进芯片。键盘：↑/↓ 移高亮· Enter 选中 · Esc 关闭 · 打字即过滤。 |
| NEW | **清空 = 只靠触发器选中态的 ×**（同 4.4.2）；popover 列表**不放「All …」默认行**。选中值进 §4.5 芯片，× 可逐条撤销并同步触发器回默认。 |
| NEW | **与 MultiSelect 共用 popover 外壳**（搜索头 + 滚动列表）；差异仅在：单选无复选框、点行=「选中+关闭」、右侧勾选标记。级联父级选项多时父级即换成本控件。 |

### 4.5 Active filters（活动过滤芯片 · 原 §6 并入）

> 📐 示意图：`ui-spec/diagrams/06-active-filters.html`

> **无论页面有无高级搜索**，只要存在已生效（`applied`）过滤条件，就在条件区与列表卡之间渲染一行 Active filters 芯片，把「当前正在过滤什么」显性化，并提供逐条 `×` 的撤销入口。

**渲染条件 & 行为**

| 标签 | 约束 |
|---|---|
| FIX | **始终渲染（不再以高级搜索为前提）**：只要有 **≥1 个 `applied` 条件**（搜索词 / 内联下拉 / 多选 / 级联 / 高级抽屉字段，任一生效），就渲染 Active filters 区域。 |
| NEW | **空态不占位**：无任何 `applied` 条件时整行 `display:none`，不留空白、不占垂直节奏。 |
| **NEW** | **行前缀 `ACTIVE FILTERS:`**：芯片行最左**固定渲染** overline 前缀「`ACTIVE FILTERS:`」（uppercase `10px / 600 / letter-spacing 0.08em`、`--fg3`，含冒号），与芯片同行垂直居中，前缀与首枚芯片间距 = 行内 gap（8）。前缀随整行一同显隐，自身**不可点击、不可移除**。 |
| NEW | **位置**：条件区下方、列表卡上方，单独成行。与上方条件区间距 `var(--space-3)`（12）、与下方列表卡间距 `var(--space-4)`（16，§5.4）。**随内容滚走、不吸顶**（§5.2）。 |
| NEW | 芯片代表 **`applied`（已生效）** 状态，不是 `draft`。 |
| FIX | **去掉 “Clear all”，保留每条芯片的 `×` 单独移除**。`clearAll` 会一键重置 `applied` 并触发无条件空查询，与“重搭条件”意图不符（大数据/受控列表上还会误拉全量）；逐条 `×` 是对单个已生效条件的有意识编辑。 |
| NEW | **移除一条芯片** = 立即把该条 `applied` 重置为默认并重查（回第 1 页），同时**同步对应 `draft` 控件**（下拉/输入/多选/级联回默认值），保持条件区与芯片一致。 |

**芯片样式（组件即规范，禁止手写）**

> 统一为 `AppliedChip` 组件：**主色淡底（primary-50）+ `Label: Value` 同行文本** + 行前缀。视觉基准 `ACTIVE FILTERS: ⟨Publisher: Helios Payments ×⟩`。

| 维度 | 值 | 说明 |
|---|---|---|
| 行前缀 | `ACTIVE FILTERS:`，uppercase overline `10px / 600 / 0.08em`、`--fg3` | 行最左、垂直居中 |
| 芯片高度 | `24` | `inline-flex` 居中 |
| 圆角 | `--radius-full` | 全圆角 pill |
| 内边距 | `0 4px 0 10px`（右 4 / 左 10） | 右侧窄留给 `×` |
| 底色 | `--color-primary-50` | 主色淡底 |
| 边框 | `1px color-mix(in oklab, var(--color-primary-500) 30%, transparent)` | 主色淡边 |
| 文字色 | `--color-primary-700` | label / value / `×` 同色 |
| label（字段名） | `12px / 500`，格式 **`<Label>:`**（含冒号，与 value 同行同尺寸） | 如 “Publisher:” |
| value（取值） | `12px / 400`，紧随 label；纯数字 / ID / 包名类仍用 `mono` | 如 “Helios Payments” |
| 移除按钮 `×` | 命中区 `16×16` 圆形、无描边、`x` 图标 `9–10`；hover 底 `--color-primary-100` | `title="Remove <label> filter"` |
| 内部 gap | `6` | label · value · × |
| 芯片间距（行内） | `gap: var(--space-2)`(8) | 前缀与多芯片横向排列、可换行 |

> 已落地：**App Publish、App Store**（共用 `AppAppliedChip`）。其余页面（Sample Orders / Sample Devices / Customers / `ListConditionPanel` 等）改造时一并对齐，**不再手写芯片**，统一收敛到共享 `AppliedChip`。

### 4.6 高级搜索（**统一为单一 `<AdvancedSheet>`**）

> 📐 示意图：`ui-spec/diagrams/05-advanced-search.html`

> 修正现状的 3 套手写实现（Devices 原生输入 Sheet / Tickets 标准件 Sheet / Apps 居中 Modal），抽成单一组件收进 `search-bar.jsx`。字段控件一律用 §4.4 控件库。

| 标签 | 约束 |
|---|---|
| NEW | **容器**：内联**下拉 Sheet**（不用居中 Modal）。卡片 `radius 12` + `--shadow-2` + 1px 边框，从 Advanced 按钮正下方展开。 |
| **NEW** | **锚定**：抽屉**默认右边缘与 Advanced 按钮右边缘齐平**；空间不足（会越过侧栏/视口左缘）时整体**向右收拢**，不越界、不被遮挡。 |
| NEW | **Header**：filter 图标 + “Advanced filters” 标题 + `×` 关闭。 |
| **NEW** | **`APPLIES WITH` 回显**：Header 下方加一条只读条，以芯片回显当前常驻条件（SN / Model / Status…），表明进阶项与常驻项是**叠加**（点 Search 一并生效）。 |
| FIX | **字段控件用 §4.4 标准件（高 36）**，禁止原生 `<input>/<select>` + 本地样式（修正 Devices）。 |
| NEW | **布局**：3 列网格，按语义分组（每组带 overline 小标题）。 |
| **FIX** | **底栏（右对齐）**：`Reset advanced`（secondary，左）+ `Search`（primary，**最右、末位提交**，与 §4.3 顺序一致）。**移除实时 match 数**；`Reset advanced` **仅重置进阶字段**（常驻项由 §4.5 芯片 `×` 撤销）。（取代旧「Search 在左 + Reset 紧随 + 右侧 match 数」） |
| **FIX** | **触发按钮在 Search 左侧**（§4.3 顺序），挂「已生效进阶条件数」badge。 |
| NEW | **行为遵循 R-01**：抽屉内所有控件只改 `draft`，点 Search 才生效；关闭抽屉保留 `draft`。 |

> 已落地：Devices（Advanced 在左、右缘齐平、APPLIES WITH、无 match 数、Reset advanced）。其余列表页改造时对齐。

---

## 5. 框架 / Shell

> 📐 示意图：`ui-spec/diagrams/07-shell-scroll.html`（§5.0–5.2）· `07-stepper.html`（§5.3）· `07-spacing.html`（§5.4）

### 5.0 内容结构（Shell 三区）

> 全站统一为「左侧菜单 + 右侧上下两段」的骨架。右侧从上到下依次为 **① 顶部导航栏 → ② 标题栏 → ③ 内容区**。三者职责互不重叠。

```
┌──────────┬────────────────────────────────────────────┐
│          │ ① 顶部导航栏 TopNav   固定·不滚             │  面包屑 / 全局搜索(⌘K) / 通知 / 账户
│  左侧    ├────────────────────────────────────────────┤
│  菜单栏  │ ② 标题栏 TitleBar     固定·不滚             │  页面标题(或详情头 §6统一模板) ··· 页面级操作
│ Sidebar  ├────────────────────────────────────────────┤
│ (§5.1)   │ ③ 内容区 Content      唯一 overflow:auto ↕  │  列表/表单/详情主体
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

| 区 | 职责（只放这些） | 不放什么 |
|---|---|---|
| **① 顶部导航栏 TopNav** | 面包屑（当前位置路径）· 全局搜索 ⌘K · 通知铃 · 账户菜单 · 侧栏 toggle | ❌ 页面标题、❌ 页面级操作按钮 |
| **② 标题栏 TitleBar** | 左：页面标题（列表/表单）或详情头（返回+实体+标题，**统一模板 §6**）；右：**页面级操作**（New X / Edit / Export…） | ❌ 全局 chrome、❌ 表单字段 |
| **③ 内容区 Content** | 列表卡 / 表单 / 详情主体 | ❌ 第二个纵向滚动容器（见 §5.2） |

| 标签 | 约束 |
|---|---|
| NEW | **顶部导航栏只承载全局元素**（面包屑 + 全局搜索 + 通知 + 账户 + 侧栏 toggle）；**绝不放页面标题或页面级操作**。 |
| NEW | **标题栏是页面标题 + 页面级操作的唯一归属**，位于导航栏正下方、内容区正上方，**固定不滚**（内容在其下滚动）。标题栏统一为一套模板（§6）：列表页=形态 D，详情页=形态 B/C/E，表单/向导=标题 + Cancel/主操作。 |
| NEW | 标题栏与导航栏共两条横带：**导航栏= 路径/全局，标题栏= 页面**。二者标题不重复——面包屑给“在哪”，标题栏给“这是什么页”。 |
| NEW | 标题栏背景**纯白**（`--color-bg-2`，surface 纯白；叠在略带暖调的 app 底色 `--color-bg-1` 之上，因此读作白色横带）、非卡片；**底部一条 1px `--color-border-default` 横线**；左右内边距与内容区对齐。详见 §6。 |
| FIX | 此条**取代** §1 中“由顶部面包屑承载标题、删除正文 26px 标题”的旧表述：页面标题改由**标题栏**承载（仍是单一标题层级，不在内容区里再写一个大标题）。 |

### 5.1 侧栏三态（响应式可收起）

| 断点 | 默认 | 可手动 | 形态 |
|---|---|---|---|
| 宽屏 `≥1024` | 展开 `248` | 收成图标条 `64` | 全宽 ↔ 图标条 |
| 中屏 `768–1024` | **图标条 `64`** | 临时展开 | 图标条；有子项的图标 **hover 出 flyout（悬浮二级菜单）** |
| 小屏 `<768` | **完全收起** | 汉堡点开 | overlay 抽屉（`--color-bg-overlay` scrim + `blur(2px)`） |

| 标签 | 约束 |
|---|---|
| NEW | topbar 左侧统一加 toggle（汉堡 / `«`），所有断点通用。 |
| NEW | 侧栏状态存 localStorage；切换过渡 `200ms --easing-standard`，reduced-motion 归零。 |
| NEW | **收起态（64）**：仅图标 + active 高亮；label 走 tooltip；section label 隐藏；二级菜单走 flyout（不就地展开撑高侧栏）。 |
| NEW | 小屏抽屉点击 scrim 或选中项后自动收起。 |

### 5.2 滚动唯一性（标题栏以下）

```
.main            100vh · flex column · 不滚
├─ .topbar       ① 顶部导航栏（面包屑 + 全局搜索 + 通知）· 固定 · 不滚
├─ .titlebar     ② 标题栏（页面标题 + 页面级操作）· 固定 · 不滚
└─ .content      ③ 唯一 overflow:auto ↕  ← 页面在此滚动
   ├─ search/conditions          随内容滚走（不 sticky）
   ├─ list-head               sticky（pin 到 .content 顶部）
   ├─ thead                    sticky（pin 在 list-head 之下）
   └─ wizard stepper           sticky（可选）
```

| 标签 | 约束 |
|---|---|
| NEW | 常规路由固定为上述结构：`.content` 是**唯一**的 `overflow:auto` 容器。 |
| FIX | **搜索 / 条件区（SearchBar + Active filters）不置顶**：随内容一起滚走，不用 `position: sticky`。只有 **list-head（计数行）与 thead 吸顶**，pin 在 `.content` 顶部（紧贴标题栏下沿）。此前框架的 `.list-toolbar-wrap` 设了 `sticky; top:0`，使搜索栏常驻顶部——**移除它**；list-head 改为 `top:0` 直接 pin 到顶，thead 的吸顶偏移相应去掉工具栏高度（仅留 list-head 高度）。 |
| NEW | 所有页面级 sticky 头（list-head / thead / stepper）都吸在 `.content` 滚动上下文里。 |
| FIX | **禁止** `.content` 之下再出现第二个 `overflow:auto` 祖先（双滚动条 / 标题跟着滚）。**App Publish 子包**去掉内层 `height:100%; overflow:auto`，滚动交还主壳。 |
| NEW | **豁免**：沉浸式全屏页（workbench / onboard / invite-email）无 topbar，但内部仍须**单一滚动容器**。 |

### 5.3 Stepper（**两种变体，按放置位置二选一**）

> 现状 5 套 stepper 收敛为 **两种**变体——**不是一套**。选哪种**由放置位置决定、互斥**：进入页面正文、独立成卡 ⇒ **变体 A**；挂在标题栏底部（§6.2 底部行 / §6.3 形态 E′）⇒ **变体 B**。**同一页面不得两种并存**。
> 抽成 `<Stepper variant="card|bar" steps current onJump?>`，A=`card`、B=`bar`。两者**画法不同、语义可同**（都可承载向导进度或生命周期状态）；差异只为匹配「主内容 vs 二级 chrome」两种视觉权重。

#### 7.3A 卡片 Stepper（变体 `card`）— 正文承载，以 **Order detail `StatusPipeline`** 为原型

| 标签 | 约束 |
|---|---|
| NEW | **用于**：**独立成卡、置于页面正文**的向导进度 / 生命周期进度（分步表单如 Factory Image、New order；Order detail 的订单生命周期）。它是用户正在操作的主内容，视觉权重更重。 |
| KEEP | **画法以 Order detail `StatusPipeline` 为基准**：每步 `36` 圆点 + 图标（或序号）；**当前 = 实心 `--color-primary-700` 底 + 白色图标 + `--shadow-cta`**；已完成 = `--color-success-50` 底 + `--color-success-700` + `✓`；未达 = `--color-bg-3` 底 + 1px `--color-border-default`，tertiary。 |
| KEEP | **两行标签**：`STEP N` overline（uppercase `10.5`、letter-spacing `0.06em`、tertiary）+ 步骤标题（`13.5`，当前/完成加粗 `600`）。 |
| KEEP | 连接条 **`flex:1` 等分撑满**整行（`height 2`），已过段染 `success-500@40%`。 |
| FIX | **卡片容器**：标准卡（`--color-bg-2` + 1px `--color-border-default` + `radius 12` + `--shadow-1`）或 Order detail 的 `.info-card`；置于标题栏之下、表单/正文之上。 |
| **NEW** | **实现注记（2026-06-10）**：Stepper 复用 `.tds-card` 作容器时**必须显式写 `flex-direction: row`** —— `.tds-card` 基类默认 `display:flex; flex-direction:column`（为卡片 header/body/footer 纵向堆叠设计），内联只写 `display:flex` 不写方向会被基类的 `column` 竖排（Publish 向导已踩坑并修复）。 |
| NEW | **已完成步可点回退**（`onJump`）。小屏 `<768` 退化为「当前步标题 + `N / 总数`」文字条，不横排挤压。 |

#### 7.3B 标题底部 Stepper / StatusTrack（变体 `bar`）— **仅限标题栏底部**，以 **Ticket `StatusTrack`** 为原型

| 标签 | 约束 |
|---|---|
| FIX | **放置受限**：此变体**只能挂在标题栏最底部**（§6.2 底部行 / §6.3 形态 E′），**不得**单独放进页面正文。它与 Tab 共用同一槽位、属二级 chrome，故视觉刻意更轻，不与标题抢焦点。 |
| KEEP | **画法以 Ticket `StatusTrack`（`.tkt-stepper`）为基准**：每步 `22` 圆点（序号 mono `10.5`，`✓` 11px）+ **单行标签（`11.5`）**，**无 `STEP N` overline**，各步左对齐紧凑。 |
| KEEP | **三态柔和、非实心**：当前 = `--color-primary-50/100` 柔和底 + `--color-primary-700` + `primary-200/500@35%` 边（**不用 `--shadow-cta` 实心填充**）/ 已过 = `--color-success-50` 底 + `--color-success-700` + `✓` / 未达 = `--color-bg-3` + 1px `--color-border-default`，tertiary。 |
| KEEP | 连接条**紧凑固定**（约 `24–32`，**不撑满**）。底部 1px 横线移到该行之下；当前 / active 段对齐主色（`2px --color-primary-700` 下划线或主色实心点，§6.2）。 |
| KEEP | **StatusTrack 语义独立** = 实体生命周期状态机（如工单 `New → Working → Replied → Closed`），非向导导航；逻辑不并入，仅与变体 B **共用画法**。 |
| NEW | **弹窗内** `compact`：`16` 圆点、去标签、紧凑间距，同源于变体 B。 |

#### 选型一句话

| 放置 | 变体 | 原型 | 画法要点 |
|---|---|---|---|
| 页面正文、独立成卡 | **A `card`** | Order detail `StatusPipeline` | 36 圆点 + 图标 · 实心当前点 + shadow-cta · 两行标签 · 撑满连接条 |
| 标题栏底部（形态 E′） | **B `bar`** | Ticket `StatusTrack` | 22 圆点 · 柔和当前点 · 单行标签 · 紧凑连接条 |

### 5.4 内容区块间距（统一节奏）

> 内容区各功能块（标题栏 ↔ 搜索/条件区 ↔ 列表卡 ↔ 分页…）间距统一走 4px 栅格的 `--space-*`，**禁止各页手写裸数字 margin**。

| 块关系 | 间距 | 承担者 / token |
|---|---|---|
| 标题栏 ↓ 内容首块（搜索区 / 表单 / 详情主体） | `24` | `.content` / `.page` 顶部内边距（`--space-6`） |
| 搜索 / 条件区 ↓ 列表卡 | `16` | `.list-toolbar-wrap` 的 `padding-bottom`（`--space-4`） |
| Active filters 行（条件区下方，单独成行）↓ 列表卡 | `16` | 与「搜索/条件区 ↓ 列表卡」同一节奏（`--space-4`） |
| Active filters 行 ↑ 条件区（上方留白） | `12` | `--space-3`（对齐 §4.5：芯片行 `padding-top` / 条件区 `gap`） |
| 列表卡 ↔ 卡内分页 | 分页为卡片页脚，无外间距 | — |
| 相邻独立卡片 / 区块 | `16` | `--space-4` |
| 内容区底部留白 | `64` | `.page` 底部内边距 |

| 标签 | 约束 |
|---|---|
| FIX | 修正“搜索栏与标题栏间距不对”：标题栏与首块固定 `24`（由 `.content` / `.page` 顶部内边距承担），**搜索区自身不再叠加 sticky 的 `padding-top`**。此前 `.list-toolbar-wrap` 的 `padding-top:16` 叠加 `.page` 的 28 顶距 ≈ 44，过大；现 `.page` 顶距收为 `24`、`.list-toolbar-wrap` 去掉 `padding-top`。 |
| NEW | 搜索区到列表卡固定 `16`（`.list-toolbar-wrap` 的 `padding-bottom`）。 |
| NEW | 块间距一律取 `--space-*` token，不写裸数字 margin。 |

---

## 6. 标题栏（TitleBar）统一模板

> 📐 示意图：`ui-spec/diagrams/01-titlebar.html`（五个标准形态 A/B/C/D/E + E′）

> **全站标题栏统一为一套模板**（以 Ticket 详情标题栏为原型）。列表页、表单页、各类详情页都用它——按需启用插槽，缺省自动收起。**取代**原“详情页返回按钮”独立规约：返回、实体图标、操作位置全部并入本模板。

### 6.1 基底（所有标题栏共用）

| 标签 | 约束 |
|---|---|
| NEW | **背景纯白**（`--color-bg-2`，surface 纯白；坐落在略带暖调的 app 底色 `--color-bg-1` 之上，读作白色横带），**非卡片**（无边框卡 / 无 shadow）；**底部一条 1px `--color-border-default` 横线**与内容区分隔。 |
| NEW | 固定不滚（属 §5.0 ② / §5.2 `.titlebar`）；左右内边距与内容区对齐。 |
| NEW | **标题栏不设最大宽度（无 max-width）**：标题栏横向铺满 `.content` 可用宽度，不居中、不封顶于 1200（参考 App Publish），左右只留统一 gutter（`--space-*` 内边距）。**但其下的正文区分两类**（§1②）：**列表页 / 仪表盘铺满**；**表单与详情页（含形态 E 的 Tab 下）的内容居中（max-width 1200），不铺满**，使正文成列居中、不过宽。标题栏（含 Tab 行）仍铺满，故与居中正文左缘可不对齐——以正文可读性优先。 |
| NEW | 行布局：`[返回] [实体图标] [主区：eyebrow/「标题 + 徽章」同行/副标题/meta行] ········ [操作]`，操作恒在最右。 |
| NEW | **形态 D（列表/首页）操作按钮垂直居底**：行 `align-items: flex-end`，右侧按钮底部与「标题 + 副标题」块的底部对齐（参考 App Publish 的标题栏），**不要顶对齐/居中**。详情形态（B/C/E）因含返回按钮/实体图标仍用顶对齐（`flex-start`）。 |
| NEW | **高度随内容自适应，单行更紧凑**：行内上下内边距取 `10`（形态 D / 仅「标题 + 操作」的单行标题栏）；当带徽章行 / meta 行 / 实体图标等多行内容时用 `16`；带 Tab 的形态 E 行底部内边距收紧到 `12`。**禁止给单行标题栏固定 16 上下内边距**——那会让它和导航栏一样高、显得过高。 |

### 6.2 插槽（除标题外均可选）

| 插槽 | 说明 |
|---|---|
| **返回按钮** | **纯图标** `36×36`（chevron-left 18，圆角 6，`bg-2` + 1px `--color-border-default`；hover→`--color-bg-hover`，focus→`--shadow-focus`）。去向放 `title` tooltip，**不带长文案**。列表/首页无返回（从侧栏进入）。 |
| **eyebrow（编号）** | 记录号（如 `TK-1042`），mono `12.5px` tertiary，置于标题上方一行。**默认隐藏（B）**——编号放面包屑/meta；仅当编号是用户高频引用的主标识时才显示（A）。 |
| **实体图标** | 有 logo/头像的实体（如 Customer）在返回按钮后插入 `48×48`（radius 10）。**有图标 ⇒ 用本模板**。 |
| **标题** | `20–22px / 600 / -0.02em`；**允许换行 2+ 行**（长标题如工单主题）。**标题两行以上 ⇒ 用本模板**。 |
| **副标题** | 标题下方一行描述性文案（`13.5px` secondary），说明该页是什么 / 能做什么（参考 App Publish：“Publish your applications to the TOMS public pool…”）。**形态 D（仅标题 + 操作）必须带副标题**；带实体图标 / 徽章行 / meta 行 的详情形态（B/C/E）由那几行提供上下文，副标题可省。 |
| **徽章行** | **与标题同处一行**（标题右侧，`gap 10`，可换行）的 badge（状态/优先级/SLA 等），`--color-*-50/500/700` 语义三件套；可接 `·` 引导的补充文字。**不再单列于标题下方**——状态与标题同行，一眼读到「这是什么 + 什么状态」。 |
| **meta 行** | 「标题 + 徽章」行下方，`·` 分隔的元信息（请求人/处理人/时间…），`12px` tertiary。 |
| **操作** | 页面级操作恒在最右。遵循 CTA 唯一性（§0）：最多一个实心主 CTA，其余 secondary；溢出收进 `⋯`。**字号与 Search 按钮一致（`--font-size-sm` = 13px），按钮高度仍 36（md）**——不用 14px，避免标题栏按钮文字过大。 |
| **底部行（Tab / 步骤 / 状态轨）** | 标题栏最底部可挂一行二级内容，**三选一**：**Tab**（二级分区导航，形态 E）· **步骤 Stepper**（分步表单 / 向导进度）· **状态轨 StatusTrack**（实体生命周期，如工单 `New → Working → Replied → Closed`）。三者同处标题栏底部、占用同一槽位，底部 1px 横线移到该行之下；当前 / active 段用 `2px --color-primary-700` 下划线或主色实心点标识。**同一时刻只放一种**；此处 Stepper / StatusTrack **一律用 §5.3B 变体（标题底部画法：22 圆点 / 柔和 / 单行 / 紧凑连接条）**，**不用** §5.3A 卡片画法。该行留在固定标题栏内，内容在其下滚动（§5.2）。 |

### 6.3 五个标准形态（全部纳入标准）

| # | 形态 | 启用插槽 | 用于 |
|---|---|---|---|
| A | eyebrow 显示 | 返回 + eyebrow + 标题 + 徽章 + meta + 操作 | 编号为主标识的详情（少数） |
| **B** | **eyebrow 隐藏（默认）** | 返回 + 标题 + 徽章 + meta + 操作 | **详情页默认形态** |
| C | 带实体图标 | 返回 + 图标 + 标题 + 徽章 + meta + 操作 | 有 logo 的实体（Customer） |
| D | 列表 / 首页 | 标题 + **副标题** + 操作 | 列表/仪表盘（无返回/eyebrow；**单行标题配副标题**） |
| E | 带底部 Tab 栏 | 上述任一 + 底部 Tab 行 | 带二级分区的详情（Customer/Ticket/Device） |
| **E′** | **带底部 步骤 / 状态轨** | 上述任一 + 底部 Stepper / StatusTrack 行 | 分步表单（向导进度）· 生命周期实体（工单状态机 New→Working→Replied→Closed） |

| 标签 | 约束 |
|---|---|
| NEW | **eyebrow 默认 B（隐藏）**；A 仅在编号是高频主标识时启用。 |
| NEW | **形态 D 必带副标题**：列表/首页只有标题时，标题下补一行副标题（§6.2），避免单标题的标题栏显空——参考 App Publish 的「标题 + 一句话说明」。详情形态（B/C/E）已有徽章行/meta 行提供上下文，副标题可省。 |
| NEW | **形态 E（Tab 栏）**：Tab 行附在**同一条标题栏底部**，底部横线移到 Tab 行之下；active tab 带 `2px --color-primary-700` 下划线。Tab 留在固定标题栏内，内容在其下滚动（§5.2）。 |
| **NEW** | **Tab 行水平位置与解剖（2026-06-10 固化，基准 = Admin Portal `TitleBar`）**：① Tab 行与标题栏内容行**共用同一左右 gutter**（同一 inner 容器，不得比内容行更靠左，也不向标题文字缩进）；② Tab 按钮内边距 `8px 12px`、字号 `13/500`、圆角 `6 6 0 0`、hover 底 `--color-bg-hover`；③ **active 下划线两侧 inset 8px**（`left:8; right:8; bottom:-1; height:2` 主色，圆角 2）——因此**标签距 gutter +12、下划线距 gutter +8，刻意不与返回按钮左缘齐平**；④ active 文字用主文字色（下划线承担主色），非 active 次要色。修正 App Publish Details 此前「行内边距 16 偏左 + 下划线按钮整宽顶到边缘」的问题。 |
| NEW | **形态 E′（底部步骤 / 状态轨）**：标题栏底部行除 Tab 外，也可放**步骤 Stepper**（向导进度）或**状态轨 StatusTrack**（实体生命周期，如工单 `New → Working → Replied → Closed`）。三者占据同一底部槽位、同内边距（底部行 `12`），当前段对齐主色（`2px` 下划线或主色实心点）；**同一时刻只放一种**。此处 Stepper / StatusTrack **一律用 §5.3B 变体**（标题底部画法）；StatusTrack 语义独立（生命周期状态机而非分步导航），仅与变体 B 共用画法。**正文里独立成卡的向导进度则用 §5.3A 变体**（Order detail 画法）。 |
| FIX | **取代**原 §6“详情页返回按钮独立一行”：返回/图标/操作全部并入本模板，不再单列规约。 |

---

## 7. Loading（加载态）

> 📐 示意图：`ui-spec/diagrams/09-loading.html`

> 修正现状：加载提示散落多套（`Spinner` 各处自写、`SkeletonRows`、裸 “Loading…” 文字）。统一为「按区域选型 + 单一组件」。

### 7.1 选型规则（按加载范围）

| 场景 | 用什么 | 说明 |
|---|---|---|
| **整页首次加载**（路由切换、详情首开） | **骨架屏 Skeleton** | 用与真实布局同构的灰块占位（标题/卡片/表格行），避免空屏跳动。**不要**整页大转圈。 |
| **区块/卡片内加载**（tab 切换、懒加载列表） | **骨架屏** 或 **局部 Spinner** | 区块小用居中 Spinner（≤24）；区块大且结构固定用骨架。 |
| **行内 / 按钮内加载**（校验中、提交中） | **小 Spinner**（12–16） | 放输入框 suffix / 按钮内左侧；按钮进入 loading 时禁用并保留宽度。 |
| **后台静默刷新**（轮询、保存草稿） | **顶部细进度条 / 无可见态** | 不打断操作；最多 topbar 下方一条 2px 进度条。 |

### 7.2 统一约束

| 标签 | 约束 |
|---|---|
| FIX | 抽**单一 `<Spinner size>`** 与 **`<Skeleton variant>`**（variant：`text` / `card` / `table-rows` / `avatar`），删除各文件自写的 Spinner / SkeletonRows。 |
| NEW | **配色**：Spinner 轨道 `--color-border-default`、活动段 `--color-primary-700`；骨架块 `--color-bg-3`，微光（shimmer）用 `--color-bg-2`，动画 1.2s。 |
| NEW | **延迟出现**：加载 < 300ms 不显示任何 loading（避免闪烁）；> 300ms 才显示骨架/Spinner。 |
| NEW | **reduced-motion**：关闭骨架 shimmer 与 Spinner 旋转，改为静态占位。 |
| NEW | **占位即布局**：骨架尺寸/列数与真实内容一致，加载完成时不发生布局跳动（CLS=0）。 |
| NEW | **可访问性**：加载容器 `aria-busy="true"`，Spinner 配 `aria-label="Loading"`。 |

---

## 8. 卡片头部（Card header band）

> **2026-06-10 新增**，基准 = Admin Portal `.info-card__head`（Published Apps → Details → Overview 的 About / Latest version / Activity timeline 等卡）。此前规约只约束了列表卡的 list-head（§3.1），通用内容卡的头带无约束，导致出现 71px 的超高头带。

| 标签 | 约束 |
|---|---|
| NEW | **头带尺寸**：总高恒 **≈ 49–50px** + 底部 1px `--color-border-subtle` 分隔线。纯文本头带 `padding: 14px 20px`；**右侧带 action 按钮（28px sm）时垂直内边距收为 `10px`**（10+28+10+1 ≈ 49），保证带不带按钮高度一致。 |
| NEW | **标题**：`14px / 600` 主文字色，**`margin: 0`**——标题元素（h3/div）**必须显式清零浏览器默认外边距**（修正 App Publish About 卡 `<h3>` 默认 13px 上下外边距把头带撑到 71px 的 bug）。 |
| NEW | **布局**：`display:flex; align-items:center; justify-content:space-between; gap 10`；左 = 标题（可跟 hint 次要文字），右 = 可选 action（sm 按钮 / 计数文字）。 |
| NEW | **卡体**：`padding: 20px`（`--space-5`）；头带与卡体之间只靠那条 1px 分隔线，不额外留白。 |
| NEW | **承载**：统一走共享 `Card` 组件（`window.Card`，title/hint/action 插槽），各页不手画卡头。 |

---

## 9. 日期与时间格式（Date & Time）

> 📐 示意图：`ui-spec/diagrams/11-datetime.html`（三形态对照，待补）

> 全站日期 / 时间显示统一为**美式（en-US）格式**，分三种形态，按「是否需要日期 / 时间」二选一或组合。数字部分沿用 DS 数据语态：`font-variant-numeric: tabular-nums` 等宽（对齐品牌指南「IDs / timestamps → mono tabular」）。
> **本章为该门户的唯一时间格式事实来源**——**取代**品牌 README 中 ISO 风格示例（`2026-05-19 14:22:08`）；与历史代码冲突时以本章为准。

### 9.1 三种形态

| 形态 | 格式 | 示例 | 模式串（day.js / date-fns 风格） |
|---|---|---|---|
| **仅时间** Time only | `h:mm AM/PM` | `3:35 PM` | `h:mm A` |
| **仅日期** Date only | `M/D/YYYY` | `6/13/2026` | `M/D/YYYY` |
| **日期 + 时间** | `M/D/YYYY h:mm AM/PM` | `6/13/2026 3:45 PM` | `M/D/YYYY h:mm A` |

### 9.2 规则

| 标签 | 约束 |
|---|---|
| NEW | **12 小时制 + AM/PM**：一律用 12 小时制并带大写 `AM` / `PM`，**不用 24 小时制**（弃用 `14:25` 写法）。 |
| NEW | **小时不补前导 0**：`3:45`、`9:05`，非 `03:45`；**分钟恒两位**：`:05` 非 `:5`。 |
| NEW | **日期 = `月/日/四位年`**：月与日**不补前导 0**（`6/13/2026`、`7/1/2026`，非 `06/13/2026`），年用四位。 |
| NEW | **空格规则（全站统一）**：① 日期与时间之间留**一个空格**（`6/13/2026 3:45 PM`）；② 时间与 `AM/PM` 之间留**一个空格**（`3:45 PM`、`3:35 PM`）。三形态一致带空格，不写无空格的 `3:35PM`。 |
| NEW | **等宽数字**：日期 / 时间数字一律 `font-variant-numeric: tabular-nums`（mono 数据语态），列表 / 表格中纵向对齐。 |
| NEW | **不带秒、不带时区后缀**：默认形态**不显示秒**，也不在文本里拼 `UTC` / `EST` 等后缀；需要精确到秒或标注时区的审计 / 日志场景，由该场景单独声明，不进通用三形态。 |
| NEW | **相对时间为辅助、非替代**：列表「Last seen」等可继续用相对时间（如 `5 min ago`）作主显，但其 tooltip / 详情页的**绝对时间**一律走本章三形态（日期+时间）。 |
| FIX | **迁移现存 ISO 显示**：当前以 ISO `YYYY-MM-DD HH:mm:ss`（24h）渲染的时间（如 Devices 列表 `lastSeenTimestamp`、新增的 Activated 列等）改造时统一切到本章格式。 |

> 落地建议：抽一处共享格式化工具（如 `fmtTime` / `fmtDate` / `fmtDateTime`），各页不再各写各的 `toLocale*` / 手拼字符串；全站一处生效。

---

## 附录：落地切入点（按投入产出从高到低）

1. **分页去 Go-to + 统一每页 25 / [10,25,50,100]** — 改 `Pagination` 组件默认，一处生效。
2. **Search → secondary** — 改 `SearchBar` 的 `.sb__primary` 一处。
3. **Audit 换标准 `Pagination`** — 删自写 `.al-pag`。
4. **Active filters：始终渲染（≥1 `applied` 即显）+ 逐条 × 移除（去 Clear all）** — 改 `useSearchBar` / `ActiveFilters`（§4.5）。
5. **标题栏统一模板（§6）** — 抽 `<TitleBar>`（基底白底/无卡片/底部横线 + 插槽：返回纯图标/eyebrow默认隐藏/实体图标/标题可换行/徽章/meta/操作/底部Tab），列表与各类详情页统一接入。
6. **统一 `<Spinner>` / `<Skeleton>`** — 合并各处 Loading，全站一处生效。
7. **Stepper 两变体（§5.3）** — A 卡片（正文，Order detail 画法）/ B 标题底部（Ticket 画法），按放置位置二选一；合并旧 5 套。
8. **统一 `<AdvancedSheet>`（§4.6）** — 合并 3 套高级搜索；Advanced 移到 Search 左、抽屉右缘与按钮齐平、加 `APPLIES WITH` 回显、去实时 match 数、`Reset`→`Reset advanced`。
9. **侧栏三态 + 滚动唯一性** — 改 Shell 布局（`.app` grid + `@media`）。
10. **统一新建表单外壳 + 标题单层 + 宽度 token** — 影响面最大，最后做。
11. **日期 / 时间格式（§9）** — 抽 `fmtTime` / `fmtDate` / `fmtDateTime` 共享工具，迁移现存 ISO `YYYY-MM-DD HH:mm:ss` 显示，一处生效。
12. **§4.4 搜索控件库** — 选择框「选中态」（方案 A：`fg1`+500 / 图标主色 / 清空 ×）、`MultiSelect`（popover + 即时 R-01）、`CascadeSelect`（商户→门店双联动）统一落到 `search-bar.jsx`，全站列表 / 高级搜索复用。
