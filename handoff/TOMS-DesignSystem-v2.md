# TOMS Design System v2.0 — 前端交付规范

> Carbon Admin Portal 的唯一设计标准。所有新页面 / 改页面必须继承本规范。
> 配套文件：`tokens.css`（CSS 变量，直接 import）· `components.css`（`tds-*` 类）。

---

## 0. 怎么接入

```html
<!-- 1) 设计令牌（颜色/字号/间距/圆角/阴影，OKLCH + CSS 变量，含 light/dark） -->
<link rel="stylesheet" href="tokens.css">
<!-- 2) 组件类（tds-btn / tds-input / tds-card / tds-table / tds-badge …） -->
<link rel="stylesheet" href="components.css">
```

之后所有样式用 `var(--*)` 引用 token，**不要写死数值**。

---

## 1. Typography（字体）

- **字体家族**：仅 **Geist**（sans，标题+正文）+ **Geist Mono**（数据：ID/序列号/时间戳/金额/百分比/版本号）。用 `var(--font-family-sans)` / `var(--font-family-mono)`。禁止混入其它字体。
- **字重**：仅 `400 / 500 / 600`，`700` 仅极少量强调。**禁止 300 / 800 / 900**。
- **数字、ID、时间戳、金额**：一律 mono + `font-variant-numeric: tabular-nums`。

| 级别 | size / weight / line-height | 用途 |
|---|---|---|
| Display | 24 / 600 / 1.15 | 页面 & 详情大标题 |
| H1 | 18 / 600 | 区块大标题（少量）|
| 卡头 / H2 | 16 / 600 | 卡片标题（强调时）|
| Body / 卡头 | 14 / 400–600 | 正文、表格、卡片标题；字重区分层级 |
| Caption | 12 / 500 | 次要 / 辅助 / label |
| Overline | 12 / 600 · 大写 · letter-spacing 0.06em | 表头、分组标签 |
| Micro | 10 / mono | 密集表格副标签 |

> **全偶数刻度:10 / 12 / 14 / 16 / 18 / 24。禁止奇数与半像素字号**（层级靠字重区分，不靠 1px 差异）。

---

## 2. Color（颜色 Token）

| 角色 | Token | 值（light）|
|---|---|---|
| 主色 / CTA | `--color-primary-700` | oklch(24% 0.06 262) |
| 主色 hover / active | `--color-primary-600` / `-800` | |
| 强调色（仅图表 + ✦ AI）| `--color-accent-600` | oklch(52% 0.24 272) |
| 成功 | `--color-success-50/500/700` | oklch(…152) |
| 警告 | `--color-warning-50/500/700` | oklch(…70) |
| 错误 | `--color-error-50/500/700` | oklch(…25) |
| 背景面 | `--color-bg-1/2/3` | 99% / 100% / 97.2%（暖白阶）|
| 文字 | `--color-text-primary/secondary/tertiary` | |
| 边框 | `--color-border-subtle/default/strong` | |

规则：**一屏一个 primary CTA**；accent 不上按钮；语义色只用于 pill / 内联提示；**无渐变、无背景图**。深色模式 token 已在 `tokens.css` 内（`[data-theme="dark"]`）。

---

## 3. Radius（圆角，6 档梯度，按层级分配）

| 值 | Token | 适用 |
|---|---|---|
| 4 | `--radius-sm` | Tag、kbd、复选框 |
| 6 | `--radius-md` | Button、Input、Select、图标按钮、搜索框 |
| 8 | `--radius-lg` | 卡内提示框、图标块(≤44px)、分段控件、嵌套小块 |
| 12 | `--radius-xl` | **Card、Modal、Drawer、表格容器、统计卡** |
| 16 | `--radius-2xl` | 大特性卡（少量）|
| full | `--radius-full` | Pill、头像、状态点 |

禁止 5 / 7 / 9 / 10 / 11 / 14 / 18 这类中间档随手值。**控件 6 与容器 12 的差异是有意的层级区分，不是 bug。**

---

## 4. Spacing（间距，4px 栅格 `--space-N`）

`4 / 8 / 12 / 16 / 20 / 24`（+32/40/48 用于空状态）

| 场景 | 值 |
|---|---|
| 页面左右留白 / 栏间距 | 24 (`--space-6`) |
| 大区块 / 页头→KPI / KPI→搜索 | 24 |
| 搜索栏 → 表格 | 16 (`--space-4`) |
| 卡片内边距 | 20 |
| 卡头 | 14·20（上下14 / 左右20）|
| 统计卡间距 | 12 |
| 页头条 | 16·24 |

**布局密度锁定**：不允许为单个页面改 padding / gap 去挤或撑内容；内容多就分区 / 分页。

---

## 5. Components（尺寸 / 圆角 / 字号 · 同级必须一致）

| 组件 | 高度 | 圆角 | 字号 | 备注 |
|---|---|---|---|---|
| Button | 36（sm 28）| 6 | 14 / 600 | 一屏一个 primary CTA |
| Input / Select / 搜索框 | 36 | 6 | 14 | |
| Card / 表格容器 / Modal / Drawer | — | 12 | 卡头 14 | 内边距 20、卡头 14·20、1px 边 + `--shadow-1` |
| KPI / 统计磁贴（StatCard）| min 92 | 12 | label 12 / 值 24 | 见 §6 |
| Tabs | 42 高 | 下划线式 | 13.5 / 600 | 不加计数 tag |
| Badge / 状态 / Pill | — | full | 11–12 | |
| Tag 小芯片 / kbd | — | 4 | 11–12 mono | |

States 通用：hover → 边框加深 + bg-1；active → 不缩放（infra 风格）；focus → `--shadow-focus`（3px 主色环，不可去除）。

---

## 6. Stats Card（统计/KPI/概览磁贴 · 唯一组件）

所有「统计 / KPI / 概览 / 汇总」磁贴**只用一个组件**，禁止页面各画各的。

- **规格**：圆角 12、内边距 14·16、min-height 92、1px 边 + `--shadow-1`、卡间距 12。
- **字体**：label `12 / 500` secondary；value `24 / 600` tabular-nums；description `12` tertiary。
- **Slots**：`label · value · description · trend({dir,label}) · icon`
- **Variants**：`default / success / warning / error`（着色 value）
- **States**：default / hover（可点）/ **Selected**（靛蓝 1px 实线环 + 靛蓝边 + 靛蓝底）

```jsx
<StatGrid cols={4}>
  <StatCard label="Active" value={42} variant="success"
    description="online now" selected={f==='active'} onClick={()=>setF('active')} />
</StatGrid>
```

---

## 7. 列表页约定

1. **点 Search 才出结果**（输入只改 draft）；**Enter = Search**；下方有可逐条移除的 Active filters + Clear all。
2. 列表卡：sticky 头部（计数 + Export），滚动时列表头 + thead 同时吸顶，底部标准分页。
3. 页头：白底满宽条（bg-2 + 底部 1px 线）+ 16·24 内边距，操作按钮右侧垂直居中；详情页 Tabs(42px) 贴页头条下沿。

---

## 8. 动效

时长 `80 / 120 / 200 / 320ms`，两条缓动（standard / emphasized）。`prefers-reduced-motion` 时全部归 0。无弹跳、无视差、无循环动画（唯一例外：地图脉冲点）。

---

*本规范由项目实测收敛而来：圆角已归一到 6 档、统计卡收敛为单一组件、间距统一 24/16/20、字体单一 Geist。完整 token 数值见 `tokens.css`。*
