# Sales（商城）数据模型重构方案

> 依据：业务方提供的 `uploads/mall.md`（数据字段为准）+ ERD（实体关系）。
> 目标：**保持现有样式与布局不变**，把新数据模型套进现有 Sales 功能的数据元素；列出现有功能中**多余的数据元素 / 冲突 / 疑问**。
> 性质：**方案与差异梳理，待确认。本文不含代码改动。**
> 约束（业务方强调）：**新建分类时要把该类别商品可能用到的属性全部定义；新建商品时只能在分类已定义的属性中选择，不能新增。**

---

## 0. 新模型实体（mall.md）速览

| 实体 | 关键字段 | 作用 |
|---|---|---|
| **CATEGORY** | category_id · parent_category_id(默认0) · category_name(唯一) · **LINK TARGET TYPE/ID** · **attribute_options(jsonb)** | 分类，支持树型；类目层定义全部可用属性；可 link 到外部实体（如 DeviceModels 的 N950）由其管理属性 |
| **PRODUCT** | product_id · category_id(FK) · name(唯一) · description(jsonb) · attribute_options(jsonb) · **product_type(BUNDLE/SINGLE)** · status(ACTIVE/INACTIVE) | 产品，归属一个分类；属性只能取自分类 |
| **SKU** | sku_id · product_id(FK) · price · attributes(jsonb) · status(ACTIVE/INACTIVE) | 库存单元；attributes = 该 SKU 的具体属性取值 |
| **BUNDLE ITEM** | bundle_item_id · bundle_sku_id(FK) · component_sku_id(FK) · quantity | 组合商品清单：bundle SKU 由若干 component SKU 组成 |
| **ORDER** | order_id · party_id(FK) · **order_type(SAMPLE DEVICE/PRODUCT DEVICE)** · ori_amount · discount_percent · discount_amount · total_amount · shipping(jsonb) · remark · **status(状态机)** | 订单 |
| **ORDER ITEM** | order_item_id · order_id · sku_id · ori_price · quantity · amount · **bundle_items(jsonb 数组)** | 订单明细，引用 SKU；组合商品展开明细含 sns |

**ORDER 状态机**：`PENDING PAYMENT → PENDING SHIP → SHIPPED → DELIVERED`，另有 `CANCELLED`（自 PENDING PAYMENT/PENDING SHIP）、`REFUNDED`（自 PENDING SHIP/DELIVERED）。
**约束**：discount_percent 与 discount_amount **二选一**，不能同时生效。

---

## 1. 现状盘点（现有 Sales 功能）

Sales 当前为三块，且**订单与目录是两套互不相通的数据**：

| 现有功能 | 文件 | 现状数据模型 |
|---|---|---|
| **Catalog（后台目录）** | `products-data.jsx` / `products-list.jsx` / `product-form.jsx` | Product 有 `type: DEVICE\|OTHER`（**硬编码两类，无 Category 实体**）；DEVICE 绑定 Device Model 并从型号 attributes 派生变体轴；OTHER 在商品表单内**自由增删规格轴/值**；`variants[]` 为各轴笛卡尔积，每个变体带 price/stock/status。 |
| **Storefront（商城前台）** | `shop-browse.jsx` / `shop-detail.jsx` / `shop-cart.jsx` / `shop-checkout.jsx` | 消费同一份 `SEED_PRODUCTS`；按 `deviceVariant`(sample/prod)/`type`(other) 过滤；变体选择弹窗。 |
| **Orders（订单）** | `orders-data.jsx` / `order-list.jsx` / `order-detail.jsx` / `order-wizard.jsx` | **自带一份独立 `DEVICE_MODELS`（6 个型号）**；订单向导从**型号**下单；`ORDER ITEM` 存 `modelId + type`，**完全不引用目录 Product/SKU**；订单仅有 `discountPct`；SN+6 位激活码存在 `item.devices[]`。 |

> 关键观察：**现有订单链路绕过了目录**。新模型 `ORDER ITEM.sku_id` 必须来自 Product/SKU，所以这是本次最大的结构性改动点。

---

## 2. 新模型 → 现有数据元素 映射

### 2.1 CATEGORY（🔴 全新，现状无此实体）
| 新字段 | 落到现有 | 处理 |
|---|---|---|
| category_id / parent_category_id / category_name | — | **新增 `categories-data.jsx` + 分类管理页**；树型；列表页加分类树导航/筛选（替代现 `type=DEVICE/OTHER` 的硬编码筛选）。 |
| attribute_options(jsonb) | 现 product-form 内的"规格轴 + 值"被**上移到分类层** | 在分类层定义该类目**全部**属性及候选值（满足业务约束）。 |
| LINK TARGET TYPE/ID | 现 DEVICE 商品"属性来自 Device Model 快照"的机制 | **改为：分类 link 到 DeviceModels（如 N950），attribute_options 只读来自型号**——这正好替代现有 `deviceModelSnapshot` 逻辑，语义更顺。 |

### 2.2 PRODUCT
| 新字段 | 现有字段 | 处理 |
|---|---|---|
| category_id (FK) | `type: DEVICE\|OTHER`（硬编码） | 🔴 用 category_id 取代硬编码两类。 |
| product_type (BUNDLE/SINGLE) | 无 | 🔴 新增；SINGLE = 现有普通商品，BUNDLE = 新组合商品。 |
| attribute_options(jsonb) | `specs[]`（轴+值，可在商品内自由增删） | 🟠 改为**从分类 attribute_options 勾选子集**，**禁止在商品内新增属性/值**（业务约束）。 |
| name(唯一) / description(jsonb) / status(ACTIVE/INACTIVE) | name / desc(string) / 6 态生命周期 | 见 §3 冲突项。 |

### 2.3 SKU
| 新字段 | 现有字段 | 处理 |
|---|---|---|
| sku_id / product_id / price / status | `variants[].id / productId / price / status(ACTIVE/UNAVAILABLE)` | ✅ 基本对应；status 值对齐 ACTIVE/INACTIVE。 |
| attributes(jsonb) | `variant.combination`(轴→值id) + `label` | 🟠 改存"属性键→值"的具体取值（取自分类属性）。 |

### 2.4 BUNDLE ITEM（🔴 全新）
| 新字段 | 现有 | 处理 |
|---|---|---|
| bundle_sku_id / component_sku_id / quantity | 无 | 🔴 BUNDLE 商品的 SKU 由若干 component SKU × 数量 组成；product-form 增加"组合装配"区（从已有 SKU 选）。 |

### 2.5 ORDER
| 新字段 | 现有字段 | 处理 |
|---|---|---|
| party_id (FK) | `customerId / customerName` | 改名映射。 |
| order_type (SAMPLE/PRODUCT DEVICE) | 无显式（隐含在商品 deviceVariant） | 见 §3 疑问 Q2。 |
| ori_amount / discount_percent / discount_amount / total_amount | 仅 `discountPct`（百分比） | 🟠 显式存四个金额字段；新增**金额折扣**且与百分比**二选一互斥**。 |
| shipping(jsonb) / remark | `shipping` / `notes` | ✅ 对应（remark↔notes）。 |
| status(状态机) | Awaiting payment/shipment/Shipped/Partially complete/Complete | 🟠 见 §3 冲突 C7。 |

### 2.6 ORDER ITEM
| 新字段 | 现有字段 | 处理 |
|---|---|---|
| sku_id | `modelId + type`（指向独立 DEVICE_MODELS） | 🔴 改为引用目录 SKU（见 C1）。 |
| ori_price / quantity / amount | `unitPrice / qty`（无 amount 小计字段） | 🟠 补 ori_price/amount。 |
| bundle_items(jsonb: name/qty/attributes/skuId/productId/sns) | `devices[]`(sn+code) | 🟠 组合商品展开明细 + sns；见 C8。 |

---

## 3. 冲突 · 多余数据元素 · 疑问（业务方让"批出来"）

### 🔴 结构性冲突
- **C1 · 订单不走目录（两套体系并存）**：`orders-data.jsx` 自带 `DEVICE_MODELS`，订单向导从型号下单，ORDER ITEM 存 `modelId`，**不引用目录 Product/SKU**。新模型 `ORDER ITEM.sku_id` 要求来自目录。→ 需把订单源改为**消费目录 Product/SKU**，废弃独立 DEVICE_MODELS。**改动最大**。
- **C2 · 无 Category 实体 / 无分类树**：现用硬编码 `type=DEVICE/OTHER`。新模型要分类树（parent + attribute_options + link target）。→ 新建分类管理页 + 列表树导航。
- **C3 · 属性定义位置颠倒**：现状属性在**商品层**自由增删（OTHER）或来自型号（DEVICE）。新模型 + 业务约束要求属性在**分类层**定义、商品只能选子集不能新增。→ 必须**移除 product-form 的"加分类/加值/改名"能力**，改为从分类属性勾选。
- **C5 · Bundle 全新**：现状无组合商品概念。需在 product-form 增 BUNDLE 装配、购物车/订单显示组合明细。

### 🟠 字段级冲突 / 收窄
- **C4 · 商品状态收窄**：现 6 态（DRAFT/SCHEDULED/LISTED/EXPIRED/DELISTED/ARCHIVED + `publishAt` 定时上架）→ 新模型仅 `ACTIVE/INACTIVE`。**多余数据元素**：`publishAt / listFrom / listTo / delistReason / delistedAt / archivedAt / SCHEDULED/EXPIRED 派生态`。
- **C6 · 折扣模型**：现仅 `discountPct`。新增 `discount_amount`（金额折扣）+ 与百分比**互斥**；显式存 `ori_amount / total_amount`。
- **C7 · 订单状态机不一致**：
  - 映射：Awaiting payment→`PENDING PAYMENT`、Awaiting shipment→`PENDING SHIP`、Shipped→`SHIPPED`、Complete→`DELIVERED`。
  - **多余**：`Partially complete`（部分完成）在新模型**无对应态**。
  - **缺失**：需新增 `CANCELLED` / `REFUNDED` 动作与转移。
- **C9 · 多余字段（新模型未出现）**：变体 `stock / stockNote`（库存）、`allowPriceOverride`、商品顶层人读 `sku` 码（PRD-…）、`integrationModes`、`deviceModelSnapshot`。需逐项确认去留。

### ❓ 待澄清疑问
- **Q1 · 商品状态**：收窄到 ACTIVE/INACTIVE（丢弃草稿/定时/归档），还是保留富生命周期 UI 但存储映射到两态？
- **Q2 · 样机/生产机 + 集成形态归属**：现 `deviceVariant=SAMPLE/PRODUCTION`（商品上）+ `integrationModes`（样机专属）。新模型把 sample/prod 放在 **ORDER.order_type** 上。到底是：① 商品/SKU 属性、② 订单属性、③ 两者都要？`integrationModes` 在新模型未出现——并入 SKU.attributes / 分类属性 / 还是丢弃？
- **Q3 · 单品 SN/激活码归属**：新模型 ORDER ITEM 顶层无 sns 字段，仅 `bundle_items[].sns` 有。**非组合单品 SKU 的 SN 存哪？**是否给 ORDER ITEM 顶层也加 sns 数组？
- **Q4 · 订单改走目录**：确认把下单源从独立 DEVICE_MODELS 改为目录 Product/SKU？（C1，大改）
- **Q5 · description 多语言**：`description` 为 jsonb——是真多语言/富文本，还是仅用 jsonb 包裹单串文案？
- **Q6 · 库存**：新模型 SKU 无库存字段——现有 stock/stockNote 保留还是移除？
- **Q7 · 人读 SKU 编码**：新模型 SKU 只有 UUID + attributes，无人读编码（PRD-…）。保留人读码（作展示）还是移除？
- **Q8 · 分类 LINK TARGET**：确认"设备类目 link 到 DeviceModels，其属性只读来自型号"就是你想要的"属性来自型号"表达方式？

---

## 4. 改造分块（确认后执行）

> 严格不改样式/布局，仅重映射数据元素 + 增补新模型必需的最小 UI。

1. **数据层** `categories-data.jsx`（新）+ 改造 `products-data.jsx`：Category 树 / Product.category_id / product_type / SKU.attributes；统一 status 枚举。
2. **分类管理页**（新，复用 ListCard / TitleBar / 表单外壳）：树型 + 类目属性(attribute_options)编辑 + LINK TARGET。
3. **Catalog 列表/表单**：分类树筛选；product-form 属性改为"从分类勾选"（去自由增删）；新增 BUNDLE 装配区。
4. **Storefront**：按分类/属性过滤；组合商品展示。
5. **Orders**：下单源改目录 SKU；折扣双模式互斥；状态机对齐（含 CANCELLED/REFUNDED）；ORDER ITEM 用 sku_id + amount + bundle_items/sns。
6. **种子数据**：按新模型回填（分类树 + 含 BUNDLE 的商品 + 订单引用 SKU）。

---

_本文档为方案与差异梳理，待业务方确认 §3 的冲突处理与 Q1–Q8 后再进入实现。_
