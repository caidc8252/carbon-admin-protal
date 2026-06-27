# TOMS Design System — 新项目开局规范（精简版）

> 新建项目时把这份贴进项目的 `CLAUDE.md` 作为常驻设计约定。
> 配合绑定 TOMS Design System2.0（提供真实组件）效果最佳。只留通用规则，无单页特例。

## 字体（Typography）
- 仅 **Geist**（sans）+ **Geist Mono**（数据：ID/序列号/时间戳/金额/版本号）。走 `var(--font-family-sans)` / `var(--font-family-mono)`。
- 字重仅 `400 / 500 / 600`（700 极少量）；**禁止 300 / 800 / 900**。
- 字号**全偶数**：`10 / 12 / 14 / 16 / 18 / 24`（大标题可 22/28/36/48）。**禁止奇数与半像素**；层级靠字重区分。
  - 大标题 24 · 区块标题 18 · 卡片标题 14 · 正文 14 · 次要/label 12 · overline 12 大写 · 数据微标签 10 mono。
- 数字/ID/时间戳一律 mono + `tabular-nums`。

## 颜色（Color · 全走 token）
- 主色/CTA `--color-primary-700`（午夜靛蓝），hover `-600`，active `-800`。**一屏一个 primary CTA。**
- accent（`--color-accent-600`）只用于图表描边 + ✦ AI，**不上按钮**。
- 语义色 success/warning/error/info：`-50` 底 + `-700` 文，只用于 pill/内联提示，不做页面底色。
- 中性面 `--color-bg-1/2/3`，文字 `--color-text-primary/secondary/tertiary`，边框 `--color-border-subtle/default/strong`。
- **无渐变、无背景图。** 深色模式 token 已内置。

## 圆角（Radius · 6 档按层级）
| token | px | 用途 |
|---|---|---|
| sm | 4 | Tag/kbd/复选框 |
| md | 6 | Button/Input/Select/图标按钮/搜索框 |
| lg | 8 | 卡内提示框/图标块/分段控件/嵌套小块 |
| xl | 12 | **Card/Modal/Drawer/表格容器/统计卡** |
| 2xl | 16 | 大特性卡 |
| full | — | Pill/头像/状态点 |

禁止 5/7/9/10/11/13/14/15/18 中间档。控件 6 与容器 12 不同是有意层级区分。

## 间距（Spacing · 4px 栅格）
- 页面左右留白 / 栏间距 **24**；大区块 / 页头→KPI / KPI→搜索 **24**；搜索栏→表格 **16**；卡片内边距 **20**；卡头 14·20；统计卡间距 12。
- 页头：白底满宽条（bg-2 + 底部 1px 线）+ 16·24，操作按钮右侧垂直居中；详情页 Tabs(42px) 贴页头下沿。
- **布局密度锁定**：不为单页改 padding/gap 去挤或撑内容；内容多就分区/分页。

## 组件尺寸（同级必须一致）
| 组件 | 高度 | 圆角 | 字号 |
|---|---|---|---|
| Button | 36（sm 28） | 6 | 14/600 |
| Input/Select/搜索框 | 36 | 6 | 14 |
| Card/表格容器/Modal/Drawer | — | 12 | 卡头 14 · 内边距 20 · 1px 边 + shadow-1 |
| 统计卡（StatCard） | min 92 | 12 | label 12/500 · 值 24/600 mono |
| Tabs | 42 | 下划线式 | 14/600，不加计数 tag |
| Badge/状态/Pill | — | full | 12 |
| Tag小芯片/kbd | — | 4 | 12 mono |

State：hover→边框加深+bg-1；active 不缩放；focus→`--shadow-focus`（3px 主色环，不可去除）。

## 统计卡（Stats Card · 唯一组件）
统计/KPI/概览/汇总磁贴只用一个组件，禁止各页手写。规格：圆角 12、内边距 14·16、min-height 92、1px 边 + shadow-1、卡间距 12；label 12/500、value 24/600 mono、desc 12。Slots：label·value·description·trend·icon。Variants：default/success/warning/error。States：default/hover/Selected（主色 1px 环+边+底）。

## 详情页字段（Vertical Field · Grid）
字段一律**竖排**（Label 在上、Value 在下）+ **横向多列 Grid**。禁止左右结构（label:value 同行）。
- 列数随容器宽：≥920→4 · ≥660→3 · ≥400→2 · 更窄→1。默认 4，降级 2，移动端 1；字段永远 Label 在上，不因屏宽变左右。
- 长文本（地址/备注）整行通栏 + 自动换行。数字/ID mono。

## 列表页
1. 点 Search 才出结果（输入只改 draft）；Enter = Search；下方 Active filters 可逐条移除 + Clear all。
2. 列表卡 sticky 头部（计数 + Export），滚动时列表头 + thead 同时吸顶；底部用标准分页。
3. 搜索框/下拉 36 高 6 圆角 14 字号；下拉统一带自定义箭头。

## 分页（Pagination · 唯一组件）
底部分页只用标准组件，禁止手写。布局 `[Rows per page ▾] · [Showing 1–25 of 66] … [« ‹ 1 2 3 › »] · [Go to __ Go]`。四种翻页形态共用同一数据层，**COUNT 只跑一次**。标准列表用 Numbered（可跳页），超长连续浏览才用 Infinite。

## 动效
时长 80/120/200/320ms；两条缓动（standard / emphasized）；`prefers-reduced-motion` 时全归 0。无弹跳、无视差、无循环动画。

## 内容/文案
工程师口吻、简洁事实、不营销。句首大写用于正文/标题，Title Case 用于按钮/标签，ALL-CAPS 12 用于 overline/表头。动作动词开头（"Push Update" 而非 "Submit"）。**禁止 emoji**（唯一例外 ✦ AI sparkle）。分隔符用 `·`，"查看更多"用 `→`。
