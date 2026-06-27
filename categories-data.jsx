/* global React, SEED_DEVICE_MODELS, ATTRIBUTE_CATALOG */
// ─── Sales · Category data layer (mall.md · CATEGORY) ─────────────────────
// 分类，支持树型。类目层定义该类别商品「可能用到的全部属性」(attribute_options)；
// 商品只能从分类属性中选择子集，不能新增（业务约束）。
//
// CATEGORY 字段（对齐 mall.md）：
//   id (category_id)            UUID
//   parentId (parent_category_id)  null = 顶层（默认 0 的语义用 null 表达）
//   name (category_name)        唯一
//   linkTargetType              null | 'DEVICE_MODEL'  —— 该类属性由 link 目标实体管理
//   linkTargetId                null | <device model id>
//   attributeOptions            [{ key, label, values:[str] }]  —— 本类目全部可用属性
//
// 约束：当 linkTargetType 存在时，attributeOptions 由 link 目标（如 DeviceModels 的某型号）
// 派生且只读 —— 「LINK TARGET TYPE 标识本类别属性由 link 目标实体管理」。

const newCategoryId = () => 'cat-' + Math.random().toString(36).slice(2, 7);
const newAttrKey    = () => 'attr_' + Math.random().toString(36).slice(2, 6);

// ── Link-target registry (mall.md · LINK TARGET TYPE / LINK TARGET ID) ────
// The data model keeps the link generic: any entity type can manage a
// category's attributes. Each registry entry supplies its option list and
// attribute derivation; new target types plug in here without UI changes.
// DEVICE_MODEL is the default (and currently only) type.
const CATEGORY_LINK_TARGETS = [
  {
    type: 'DEVICE_MODEL',
    label: 'Device model',
    source: 'Device Models',
    options: () => (window.SEED_DEVICE_MODELS || []).map((m) => ({ value: m.id, label: m.modelCode })),
    attributes: (id) => deviceModelAttributeOptions(id),
  },
];
const linkTargetDef = (type) => CATEGORY_LINK_TARGETS.find((t) => t.type === type) || null;
const DEFAULT_LINK_TARGET_TYPE = CATEGORY_LINK_TARGETS[0].type;
// Display label for a category's link target instance (e.g. "N950").
const linkTargetLabel = (cat) => {
  const def = cat && linkTargetDef(cat.linkTargetType);
  if (!def) return null;
  const opt = def.options().find((o) => o.value === cat.linkTargetId);
  return opt ? opt.label : def.label;
};

// ─── Resolve a category's attribute options ──────────────────────────────
// If linked to a device model, the options come (read-only) from that model's
// multi-value attributes. Otherwise the category's own attributeOptions stand.
const deviceModelAttributeOptions = (modelId) => {
  const model = (window.SEED_DEVICE_MODELS || []).find((m) => m.id === modelId);
  if (!model) return [];
  const catalog = window.ATTRIBUTE_CATALOG || [];
  return (model.attributes || [])
    .filter((a) => Array.isArray(a.value) && a.value.length >= 1)
    .map((a) => {
      const def = catalog.find((d) => d.key === a.key);
      return { key: a.key, label: def ? def.label : a.key, values: [...a.value] };
    });
};

const categoryAttributeOptions = (cat) => {
  if (!cat) return [];
  const def = linkTargetDef(cat.linkTargetType);
  if (def && cat.linkTargetId) return def.attributes(cat.linkTargetId);
  return cat.attributeOptions || [];
};

const isCategoryLinked = (cat) => !!(cat && cat.linkTargetType && cat.linkTargetId);

// ─── Tree helpers ────────────────────────────────────────────────────────
const categoryById = (cats, id) => (cats || []).find((c) => c.id === id) || null;

const childCategories = (cats, parentId) =>
  (cats || []).filter((c) => (c.parentId || null) === (parentId || null));

const categoryPath = (cats, id) => {
  const path = [];
  let cur = categoryById(cats, id);
  let guard = 0;
  while (cur && guard < 20) {
    path.unshift(cur);
    cur = cur.parentId ? categoryById(cats, cur.parentId) : null;
    guard++;
  }
  return path;
};

const categoryPathLabel = (cats, id, sep = ' / ') =>
  categoryPath(cats, id).map((c) => c.name).join(sep);

// All descendant ids (inclusive) — used to filter products under a branch.
const categoryDescendantIds = (cats, id) => {
  const out = [id];
  const walk = (pid) => childCategories(cats, pid).forEach((c) => { out.push(c.id); walk(c.id); });
  walk(id);
  return out;
};

// Ordered, depth-tagged flat list for tree rendering.
const flattenCategoryTree = (cats) => {
  const out = [];
  const walk = (parentId, depth) => {
    childCategories(cats, parentId).forEach((c) => {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    });
  };
  walk(null, 0);
  return out;
};

// True when a category is a leaf (products attach to leaves; parents organise).
const isLeafCategory = (cats, id) => childCategories(cats, id).length === 0;

// ─── Seed categories (tree) ──────────────────────────────────────────────
// 设备(parent) → 各型号(link 到 DeviceModels)；配件/服务/套装为顶层叶子(自管属性)。
const SEED_CATEGORIES = [
  // ── POS (level-1 group) → Handheld / Countertop / Self-service (level-2) → models (leaves) ──
  { id: 'cat-dev', parentId: null, name: 'POS', linkTargetType: null, linkTargetId: null, attributeOptions: [] },
  { id: 'cat-hand',    parentId: 'cat-dev', name: 'Handheld',     linkTargetType: null, linkTargetId: null, attributeOptions: [] },
  { id: 'cat-counter', parentId: 'cat-dev', name: 'Countertop',   linkTargetType: null, linkTargetId: null, attributeOptions: [] },
  { id: 'cat-self',    parentId: 'cat-dev', name: 'Self-service', linkTargetType: null, linkTargetId: null, attributeOptions: [] },
  { id: 'cat-n750', parentId: 'cat-hand', name: 'N750', linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-n750', attributeOptions: [] },
  { id: 'cat-s90',  parentId: 'cat-hand', name: 'S90',  linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-s90',  attributeOptions: [] },
  { id: 'cat-n950', parentId: 'cat-counter', name: 'N950', linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-n950', attributeOptions: [] },
  { id: 'cat-s60',  parentId: 'cat-counter', name: 'S60',  linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-s60',  attributeOptions: [] },
  { id: 'cat-s30',  parentId: 'cat-counter', name: 'S30',  linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-s30',  attributeOptions: [] },
  { id: 'cat-x800', parentId: 'cat-self', name: 'X800', linkTargetType: 'DEVICE_MODEL', linkTargetId: 'm-x800', attributeOptions: [] },

  // ── Accessories (self-managed attributes) ──
  { id: 'cat-acc', parentId: null, name: 'Accessories', linkTargetType: null, linkTargetId: null,
    attributeOptions: [
      { key: 'color',    label: 'Color',     values: ['Black', 'White', 'Silver'] },
      { key: 'packSize', label: 'Pack size', values: ['10 rolls', '50 rolls', '200 rolls'] },
      { key: 'length',   label: 'Length',    values: ['1m', '2m', '3m'] },
    ] },

  // ── Services ──
  { id: 'cat-svc', parentId: null, name: 'Services', linkTargetType: null, linkTargetId: null,
    attributeOptions: [
      { key: 'duration', label: 'Service duration', values: ['Half day', 'Full day', '2 days'] },
    ] },
];

// Blank category template for the "New category" form.
const blankCategory = (parentId = null) => ({
  id: newCategoryId(),
  parentId,
  name: '',
  linkTargetType: null,
  linkTargetId: null,
  attributeOptions: [],
});

// Count of products in a category (and optionally its descendants).
const categoryProductCount = (cats, products, id, includeDescendants = true) => {
  const ids = includeDescendants ? categoryDescendantIds(cats, id) : [id];
  const set = new Set(ids);
  return (products || []).filter((p) => set.has(p.categoryId)).length;
};

Object.assign(window, {
  SEED_CATEGORIES,
  CATEGORY_LINK_TARGETS, linkTargetDef, linkTargetLabel, DEFAULT_LINK_TARGET_TYPE,
  newCategoryId, newAttrKey, blankCategory,
  categoryById, childCategories, categoryPath, categoryPathLabel,
  categoryDescendantIds, flattenCategoryTree, isLeafCategory,
  categoryAttributeOptions, deviceModelAttributeOptions, isCategoryLinked,
  categoryProductCount,
});
