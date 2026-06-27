# TOMS Design System — Writeback Patch (2.0 → 2.1)

> 来源:Carbon Admin Portal 项目实战收敛。本补丁把项目里锁定的实施约定回写进 TOMS 官方设计系统。
> 性质:**实施规范收敛**,不是新设计语言 —— 品牌色 / 字体 / 中性色 / infra 气质均不变。
> 维护者按下面四节改 `tokens/tokens.css` + `styles/components.css` + 文档即可。

---

## 1. Typography — 字号刻度改为「全偶数」（破坏性小）

**现状(`tokens/tokens.css`)**:刻度含一个奇数档 `--font-size-sm: 13px`,且产品里散落 11 / 11.5 / 13 / 13.5 等奇数与半像素值。

**改为**:全偶数刻度,层级靠字重区分,不靠 1px 差异。

```diff
  --font-size-xs:   12px;
- --font-size-sm:   13px;
+ --font-size-sm:   14px;   /* 偶数化;13 已并入 14（次级正文用字重区分） */
  --font-size-md:   14px;   /* base body */
  --font-size-lg:   16px;
  --font-size-xl:   18px;
  --font-size-2xl:  22px;   /* 偶数,保留 */
  --font-size-3xl:  28px;
  --font-size-4xl:  36px;
  --font-size-5xl:  48px;
```

**规则(写入 docs/tokens.md)**:产品字号只用 **10 / 12 / 14 / 16 / 18 / 24**(+22/28/36/48 用于大标题/营销)。**禁止奇数和半像素字号**;11→12、13/13.5→14、9.5/10.5→10。
迁移:把组件里所有 `font-size`/`fontSize` 的奇数、半像素值 snap 到最近偶数(本项目已对全量 ~2600 处执行)。

**字重**:产品面只用 400/500/600(700 极少量)。`450` 仅 Terminal Manager 皮肤保留,不进通用产品页;`@import` 里的 `wght@…;450;…` 维持现状即可。

---

## 2. 新增组件:StatCard / StatGrid（统计·KPI·概览·汇总磁贴）

**问题**:官方 DS 没有统计卡组件,各产品自画(`.tkt-kpi__tile` / `.up-stat` / `.pu-stat` / 内联 `.stat`),出现"同层级不同规格"。

**收敛为唯一组件**,加入 `styles/components.css` + `components/DataDisplay.tsx`:

| 维度 | 规格(token)|
|---|---|
| 圆角 | `--radius-xl`(12,与数据卡同级)|
| 内边距 | `14·16`(`--card-head-py` 近似)|
| 最小高度 | `92px`(同行等高)|
| 边 / 阴影 | `1px --color-border-default` + `--shadow-1` |
| 卡间距 | `12`(StatGrid gap)|
| label | `12 / 500` `--color-text-secondary` |
| value | `24 / 600` mono · tabular-nums |
| description | `12` `--color-text-tertiary` |

- **Slots**:`label · value · description · trend({dir:'up'|'down'|'flat', label}) · icon`
- **Variants**:`default / success / warning / error`(着色 value,用 `--color-{semantic}-700`)
- **States**:default · hover(可点)· **Selected**(`--color-primary-500` 1px 实线环 + 边 + `--color-primary-50` 底)

```css
.tds-stat { background: var(--color-bg-2); border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl); padding: 14px 16px; box-shadow: var(--shadow-1);
  min-height: 92px; position: relative; }
.tds-stat.is-clickable:hover { border-color: var(--color-border-strong); background: var(--color-bg-1); }
.tds-stat.is-active { border-color: var(--color-primary-500);
  box-shadow: 0 0 0 1px var(--color-primary-500), var(--shadow-1); background: var(--color-primary-50); }
.tds-stat__label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }
.tds-stat__val   { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.tds-stat__desc  { font-size: 12px; color: var(--color-text-tertiary); }
```

**作废**:`.tkt-kpi*` / `.up-stat*` / `.pu-stat*` 等平行实现(产品端已全部迁移到本组件)。

---

## 3. 圆角 — 明确「按层级分配」的用法规则（无 token 变更）

token 刻度不变(`sm 4 / md 6 / lg 8 / xl 12 / 2xl 16 / full`)。补一条**分配规则**进 docs,杜绝随手用中间档:

| 层级 | 圆角 | 适用 |
|---|---|---|
| 控件 | `md` 6 | Button / Input / Select / 图标按钮 / 搜索框 |
| 小芯片 | `sm` 4 | Tag / kbd / 复选框 |
| 内层小块 | `lg` 8 | 卡内提示框 / 图标块 / 分段控件 / 嵌套小卡 |
| 容器 | `xl` 12 | **Card / Modal / Drawer / 表格容器 / StatCard** |
| 大卡 | `2xl` 16 | 少量大特性卡 |
| 药丸 | `full` | Pill / 头像 / 状态点 |

**禁止 5/7/9/10/11/13/14/15/18px 中间档。** "控件 6 与容器 12 不同"是有意的层级区分,非 bug。

---

## 4. 间距 — 页面布局密度锁定（无 token 变更，补用法约定）

token 不变(4px 栅格)。补"页面节奏"约定进 docs:

| 场景 | 值 |
|---|---|
| 页面左右留白 / 栏间距 | `--space-6` 24 |
| 大区块 / 页头→KPI / KPI→搜索 | 24 |
| 搜索栏 → 表格 | `--space-4` 16 |
| 卡片内边距 | `--card-padding-md` 20 |
| 卡头 | 14·20 |
| StatGrid 间距 | 12 |
| 页头条 | 16·24,白底满宽 + 底部 1px 线,操作按钮右侧垂直居中;详情页 Tabs(42px)贴页头下沿 |

**密度锁定**:不允许为单页改 padding/gap 去挤或撑内容;内容多就分区/分页。

---

## 应用清单(维护者)

1. `tokens/tokens.css`:`--font-size-sm: 13px → 14px`。
2. `styles/components.css`:加入 `.tds-stat` / `.tds-stat__*` / `.tds-stat-grid`;标注 `.tkt-kpi*`/`.up-stat*` 作废。
3. `components/DataDisplay.tsx` + `index.ts`:导出 `StatCard` / `StatGrid`(props 见 §2)。
4. `docs/tokens.md`:加「偶数字号刻度」「圆角层级分配」「间距密度」三节。
5. 版本号 2.0 → **2.1**;CHANGELOG 记录上述四项。

> 完整 token 现值与组件 CSS 见同包 `tokens.css` / `components.css`。
