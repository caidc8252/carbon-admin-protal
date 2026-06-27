/* global React, SEED_CATEGORIES, categoryById, categoryAttributeOptions, isCategoryLinked, SEED_DEVICE_MODELS */
// ─── Sales · Product / SKU data layer (mall.md) ───────────────────────────
// Canonical model (source of truth):
//   PRODUCT : { id, categoryId, name, desc, productType:'SINGLE',
//               status:'ACTIVE'|'INACTIVE', attributeOptions:[{key,label,values[]}],
//               skus:[SKU], baseImage, extraImages }
//   SKU     : { id, productId, price, attributes:{key:value}, status:'ACTIVE'|'INACTIVE' }
//
// 约束：attributeOptions 只能取自该商品所属分类的属性（categoryAttributeOptions），
// 新建商品时只能选择，不能新增（在 product-form 强制）。SKU 无库存、无人读编码——
// SKU 展示名由「商品名 + 属性取值」组合而出（skuLabel）。
//
// 兼容层：storefront / cart / PDP 仍读取旧形状字段（type / deviceVariant / specs /
// variants[].combination / stock 等）。finalizeProduct() 从 canonical 字段派生这些
// 兼容字段，使旧 UI 无需改动即可渲染新模型数据。

// ─── ID helpers ──────────────────────────────────────────────────────────
const newProductId = () => 'p-'  + Math.random().toString(36).slice(2, 7);
const newSkuId     = () => 'sku-' + Math.random().toString(36).slice(2, 7);

const PRODUCT_TYPES = ['SINGLE'];
const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE'];

const PRODUCT_STATUS_TONE  = { ACTIVE: 'success', INACTIVE: 'neutral' };
const PRODUCT_STATUS_LABEL = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

// ─── SKU display name (Q7: no human code / no UUID shown) ─────────────────
// Compose "<product name> · <attr value> · <attr value>" from the SKU's
// attribute values (in the product's attributeOptions order). No attributes
// → just the product name.
const skuAttrValues = (product, sku) => {
  if (!product || !sku || !sku.attributes) return [];
  const order = (product.attributeOptions || []).map((a) => a.key);
  const keys = order.length ? order : Object.keys(sku.attributes);
  return keys.map((k) => sku.attributes[k]).filter((v) => v != null && v !== '');
};
const skuLabel = (product, sku) => {
  const vals = skuAttrValues(product, sku);
  return vals.length ? vals.join(' · ') : '';
};
const skuFullName = (product, sku) => {
  const tail = skuLabel(product, sku);
  return tail ? `${product.name} · ${tail}` : product.name;
};

// ─── Price helpers ────────────────────────────────────────────────────────
const activeSkus = (p) => (p.skus || []).filter((s) => s.status === 'ACTIVE');
const productPriceRange = (p) => {
  const prices = activeSkus(p).map((s) => s.price);
  if (!prices.length) {
    const all = (p.skus || []).map((s) => s.price);
    if (!all.length) return { min: 0, max: 0 };
    return { min: Math.min(...all), max: Math.max(...all) };
  }
  return { min: Math.min(...prices), max: Math.max(...prices) };
};
const formatPriceRange = (p) => {
  const { min, max } = productPriceRange(p);
  if (min === max) return `$${(min || 0).toFixed(2)}`;
  return `$${min.toFixed(2)} – $${max.toFixed(2)}`;
};

// SKU count / attribute summary for list rows.
const skusSummary = (p) => {
  const total = (p.skus || []).filter((s) => !isOrphanSku(p, s)).length;
  if (!p.attributeOptions || !p.attributeOptions.length) {
    return total <= 1 ? 'Single SKU' : `${total} SKUs`;
  }
  const names = p.attributeOptions.map((a) => a.label).join(' · ');
  return `${total} SKU${total === 1 ? '' : 's'} · ${names}`;
};

// ─── Cartesian product of chosen attribute values → SKUs ───────────────────
// attributeOptions = [{key,label,values:[...]}] (already a CHOSEN subset of the
// category's attributes). Returns one SKU per value-combination. Existing SKUs
// matched by attribute signature keep their price/status.
//
// SKU lifecycle (mall.md SKU.STATUS + referential integrity):
//   • A SKU referenced by any order (ORDER ITEM.skuId or a bundle component
//     skuId) is IMMUTABLE — never change its attributes, never delete it. Price
//     edits are safe (orders snapshot oriPrice); status may toggle.
//   • When the attribute set changes, each existing SKU is reclassified:
//       - still a valid full combination  → kept (id/price/status preserved)
//       - no longer valid + order-referenced → archived (INACTIVE, archived:true)
//       - no longer valid + never ordered  → dropped
//   • New combinations are created ACTIVE; price inherits from the existing SKU
//     matching on the previously-defined keys (so adding an axis keeps prices),
//     else falls back to the base price.
const _attrSig = (attrs) => Object.entries(attrs || {}).map(([k, v]) => `${k}=${v}`).sort().join('|');

// Is this SKU referenced by any order (line item or bundle component)?
const isSkuReferenced = (skuId, orders) => {
  if (!skuId) return false;
  const list = orders || window.SEED_ORDERS || [];
  return list.some((o) => (o.items || []).some((it) =>
    it.skuId === skuId || (it.bundleItems || []).some((b) => b.skuId === skuId)
  ));
};

// Valid attribute-combination signatures for a product's CURRENT attributes.
const _validSignatures = (attributeOptions) => {
  const axes = (attributeOptions || []).filter((a) => a.values && a.values.length);
  const combos = !axes.length ? [{}] : axes.reduce((acc, axis) => {
    const next = [];
    acc.forEach((partial) => axis.values.forEach((val) => next.push({ ...partial, [axis.key]: val })));
    return next;
  }, [{}]);
  return new Set(combos.map(_attrSig));
};
// A SKU is "orphaned" when its attribute combination is no longer one the
// product offers (attributes changed) — it survives only because an order
// references it. This is DERIVED, not a stored status: SKU.status is strictly
// ACTIVE / INACTIVE (mall.md). Orphaned SKUs are shown read-only, never sold.
const isOrphanSku = (product, sku) => {
  if (!product || !sku) return false;
  return !_validSignatures(product.attributeOptions).has(_attrSig(sku.attributes));
};

// Price continuity: a freshly-created combo inherits the price of the existing
// SKU that matches on all previously-defined keys (used when an axis is added).
const _inheritPrice = (existing, combo, oldKeys) => {
  if (!oldKeys.length) return null;
  const m = (existing || []).find((s) => oldKeys.every((k) => s.attributes && s.attributes[k] === combo[k]));
  return m ? m.price : null;
};

const buildSkus = (productId, attributeOptions, basePrice, existing = []) => {  const bySig = {};
  (existing || []).forEach((s) => { bySig[_attrSig(s.attributes)] = s; });
  const axes = (attributeOptions || []).filter((a) => a.values && a.values.length);
  const combos = !axes.length ? [{}] : axes.reduce((acc, axis) => {
    const next = [];
    acc.forEach((partial) => axis.values.forEach((val) => next.push({ ...partial, [axis.key]: val })));
    return next;
  }, [{}]);

  const oldKeys = Array.from(new Set((existing || []).flatMap((s) => Object.keys(s.attributes || {}))));
  const validSigs = new Set(combos.map(_attrSig));

  // 1) Every valid combination → keep matching SKU (immutable) or create new.
  const out = combos.map((attributes) => {
    const prior = bySig[_attrSig(attributes)];
    if (prior) return { ...prior, attributes };
    const inherited = _inheritPrice(existing, attributes, oldKeys);
    return { id: newSkuId(), productId, price: inherited != null ? inherited : (basePrice || 0), attributes, status: 'ACTIVE' };
  });

  // 2) Existing SKUs that fell out of the valid set: keep (INACTIVE) if an order
  //    references them — they become orphaned (derived), shown read-only; else drop.
  (existing || []).forEach((s) => {
    if (validSigs.has(_attrSig(s.attributes))) return;
    if (isSkuReferenced(s.id)) out.push({ ...s, status: 'INACTIVE' });
  });

  return out;
};

// ─── Category attribute sync (flows RULE-PRD-01 / 02 / 05) ────────────────
// When a category's attributes change, products under it must stay a valid
// SUBSET of the category's attributes, and their SKUs re-derived:
//   • a chosen attribute the category dropped       → removed from the product
//   • a chosen value the category dropped           → removed from that attribute
//   • SKUs of combinations that fall out of the set → kept read-only if an order
//     references them (archived), else dropped (orphan)
// Adding attributes/values to the category never auto-expands a product (the
// product still offers a subset) — only removals "动到" its SKUs.
const syncProductToCategoryAttrs = (product, catAttrs) => {
  const byKey = {};
  (catAttrs || []).forEach((a) => { byKey[a.key] = a; });
  const pruned = (product.attributeOptions || [])
    .map((a) => {
      const ca = byKey[a.key];
      if (!ca) return null; // attribute removed from the category
      const values = a.values.filter((v) => ca.values.includes(v));
      return values.length ? { ...a, values } : null;
    })
    .filter(Boolean);

  const basePrice = productPriceRange(product).min || 0;
  const rebuilt = buildSkus(product.id, pruned, basePrice, product.skus);

  // Diff against SKUs that were valid BEFORE (ignore pre-existing archived ones).
  const oldValid = _validSignatures(product.attributeOptions);
  const newValid = _validSignatures(pruned);
  const rebuiltIds = new Set(rebuilt.map((s) => s.id));
  const dropped = [];
  const archived = [];
  (product.skus || []).forEach((s) => {
    const sig = _attrSig(s.attributes);
    if (!oldValid.has(sig)) return;     // already orphaned before — not newly affected
    if (newValid.has(sig)) return;      // still a valid combination
    if (rebuiltIds.has(s.id)) archived.push(s); // referenced → kept read-only
    else dropped.push(s);               // never ordered → removed
  });

  return {
    product: finalizeProduct({ ...product, attributeOptions: pruned, skus: rebuilt }),
    dropped,
    archived,
  };
};

// Impact of saving a category whose attributes are `catAttrs`: the list of
// products under `catId` whose options/SKUs would change. Each entry carries
// the rebuilt product plus the SKUs dropped / archived, for the preview modal.
const categoryAttrImpact = (catId, catAttrs, products) => {
  const affected = [];
  (products || []).forEach((p) => {
    if (p.categoryId !== catId) return;
    const r = syncProductToCategoryAttrs(p, catAttrs);
    const optsChanged = JSON.stringify(r.product.attributeOptions) !== JSON.stringify(p.attributeOptions || []);
    if (r.dropped.length || r.archived.length || optsChanged) {
      affected.push({ original: p, product: r.product, dropped: r.dropped, archived: r.archived });
    }
  });
  return affected;
};
// Derives the legacy fields the shop UI still reads from the canonical model.
const deriveCompat = (p) => {
  const cats = window.SEED_CATEGORIES || [];
  const cat = cats.find((c) => c.id === p.categoryId) || null;
  const linkModelId = cat && cat.linkTargetType === 'DEVICE_MODEL' ? cat.linkTargetId : null;
  // Legacy "specs" axes built from this product's attributeOptions.
  const specs = (p.attributeOptions || []).filter((a) => a.values && a.values.length).map((a) => ({
    id: 'attr:' + a.key, key: a.key, name: a.label,
    values: a.values.map((label) => ({ id: a.key + ':' + label, label })),
  }));
  // Legacy "variants" = SKUs with combination/label/stock for the shop pickers.
  // Orphaned SKUs (no longer a valid combination) are never offered.
  const variants = (p.skus || []).filter((s) => !isOrphanSku(p, s)).map((s) => ({
    id: s.id, productId: p.id, sku: '', price: s.price,
    status: s.status,
    attributes: s.attributes,
    combination: Object.fromEntries(
      Object.entries(s.attributes || {}).map(([k, v]) => ['attr:' + k, k + ':' + v])
    ),
    label: skuLabel(p, s),
    image: null, stock: null, stockNote: '',
  }));
  const { min } = productPriceRange(p);
  return {
    ...p,
    type: linkModelId ? 'DEVICE' : 'OTHER',
    deviceModelId: linkModelId,
    deviceVariant: null,          // sample/production now lives on ORDER.order_type
    integrationModes: [],         // dropped (decision)
    specs,
    variants,
    basePrice: min,
    allowPriceOverride: true,
  };
};

// Public: normalise a canonical product for storage/consumption.
const finalizeProduct = (p) => deriveCompat(p);

// ─── Seed products (new model) ────────────────────────────────────────────
const _ts = (d) => new Date(d).toISOString();
// Deterministic seed SKU ids — seed orders reference catalog SKUs by id, so
// ids must be stable across reloads: 'sku-<productId>-<attr values slug>'.
const _skuSlug = (attributes) => {
  const vals = Object.values(attributes || {});
  return vals.length ? vals.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '') : 'base';
};
const _sku = (productId, price, attributes = {}, status = 'ACTIVE') =>
  ({ id: `sku-${productId}-${_skuSlug(attributes)}`, productId, price, attributes, status });

const _seedRaw = () => {
  const P = [];

  // 1 · N950 — Storage variants (attributes from linked model)
  P.push({
    id: 'p-001', categoryId: 'cat-n950', name: 'N950 Smart Terminal', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Smart Android terminal, 5.5" touch, NFC + magstripe.',
    attributeOptions: [{ key: 'storage', label: 'Storage', values: ['32G', '64G'] }],
    skus: [
      _sku('p-001', 459, { storage: '32G' }),
      _sku('p-001', 499, { storage: '64G' }),
    ],
    baseImage: 'assets/products/p-001-n950.png', extraImages: [],
    createdAt: _ts('2026-03-28'), createdBy: 'sarah@npt', updatedAt: _ts('2026-04-01'), updatedBy: 'sarah@npt',
  });

  // 2 · S90 — Storage variants
  P.push({
    id: 'p-002', categoryId: 'cat-s90', name: 'S90 Portable Terminal', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Portable wireless terminal, 4G + Wi-Fi + Bluetooth.',
    attributeOptions: [{ key: 'storage', label: 'Storage', values: ['32G', '64G'] }],
    skus: [
      _sku('p-002', 329, { storage: '32G' }),
      _sku('p-002', 379, { storage: '64G' }),
    ],
    baseImage: 'assets/products/p-002-s90.png', extraImages: [],
    createdAt: _ts('2026-04-05'), createdBy: 'sarah@npt', updatedAt: _ts('2026-04-05'), updatedBy: 'sarah@npt',
  });

  // 3 · S60 — Second-screen variants
  P.push({
    id: 'p-003', categoryId: 'cat-s60', name: 'S60 Dual-screen POS', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Dual-screen smart POS, built-in thermal printer.',
    attributeOptions: [{ key: 'secondScreen', label: 'Second-screen', values: ['4-inch', '6-inch'] }],
    skus: [
      _sku('p-003', 689, { secondScreen: '4-inch' }),
      _sku('p-003', 739, { secondScreen: '6-inch' }),
    ],
    baseImage: 'assets/products/p-003-s60.png', extraImages: [],
    createdAt: _ts('2026-04-05'), createdBy: 'sarah@npt', updatedAt: _ts('2026-04-05'), updatedBy: 'sarah@npt',
  });

  // 4 · X800 — single SKU (no chosen attributes)
  P.push({
    id: 'p-004', categoryId: 'cat-x800', name: 'X800 Kiosk Module', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Unattended kiosk module, QR + NFC, IP54 sealed.',
    attributeOptions: [],
    skus: [ _sku('p-004', 1180, {}) ],
    baseImage: 'assets/products/p-004-x800.png', extraImages: [],
    createdAt: _ts('2026-04-10'), createdBy: 'sarah@npt', updatedAt: _ts('2026-04-10'), updatedBy: 'sarah@npt',
  });

  // 5 · N750 — single SKU
  P.push({
    id: 'p-005', categoryId: 'cat-n750', name: 'N750 Mobile Handheld', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Slim mobile Android handheld, 4G + NFC, all-day battery.',
    attributeOptions: [],
    skus: [ _sku('p-005', 319, {}) ],
    baseImage: 'assets/products/p-005-n750.png', extraImages: [],
    createdAt: _ts('2026-04-12'), createdBy: 'sarah@npt', updatedAt: _ts('2026-04-12'), updatedBy: 'sarah@npt',
  });

  // 6 · S30 — single SKU · INACTIVE (off sale)
  P.push({
    id: 'p-006', categoryId: 'cat-s30', name: 'S30 Countertop Terminal', productType: 'SINGLE', status: 'INACTIVE',
    desc: 'Compact countertop terminal, Ethernet + dial-up.',
    attributeOptions: [],
    skus: [ _sku('p-006', 269, {}) ],
    baseImage: 'assets/products/p-006-s30.png', extraImages: [],
    createdAt: _ts('2025-12-01'), createdBy: 'sarah@npt', updatedAt: _ts('2026-05-10'), updatedBy: 'ops@npt',
  });

  // 7 · Thermal receipt paper — Pack size variants (Accessories)
  P.push({
    id: 'p-007', categoryId: 'cat-acc', name: 'Thermal receipt paper', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Thermal receipt paper rolls, 80mm × 80m. Bulk discount on larger packs.',
    attributeOptions: [{ key: 'packSize', label: 'Pack size', values: ['10 rolls', '50 rolls', '200 rolls'] }],
    skus: [
      _sku('p-007', 12,  { packSize: '10 rolls' }),
      _sku('p-007', 55,  { packSize: '50 rolls' }),
      _sku('p-007', 200, { packSize: '200 rolls' }),
    ],
    baseImage: 'assets/products/p-007-paper.png', extraImages: [],
    createdAt: _ts('2026-04-12'), createdBy: 'ops@npt', updatedAt: _ts('2026-04-12'), updatedBy: 'ops@npt',
  });

  // 8 · USB-C cable — Color variants (Accessories)
  P.push({
    id: 'p-008', categoryId: 'cat-acc', name: 'USB-C cable 1m', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Replacement USB-C charging cable, 1 meter, braided.',
    attributeOptions: [{ key: 'color', label: 'Color', values: ['Black', 'White'] }],
    skus: [
      _sku('p-008', 9, { color: 'Black' }),
      _sku('p-008', 9, { color: 'White' }),
    ],
    baseImage: 'assets/products/p-008-cable.png', extraImages: [],
    createdAt: _ts('2026-04-12'), createdBy: 'ops@npt', updatedAt: _ts('2026-04-12'), updatedBy: 'ops@npt',
  });

  // 9 · On-site setup — Duration variants (Services)
  P.push({
    id: 'p-009', categoryId: 'cat-svc', name: 'On-site setup service', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Engineer on-site visit for device deployment and operator training.',
    attributeOptions: [{ key: 'duration', label: 'Service duration', values: ['Half day', 'Full day', '2 days'] }],
    skus: [
      _sku('p-009', 300,  { duration: 'Half day' }),
      _sku('p-009', 550,  { duration: 'Full day' }),
      _sku('p-009', 1000, { duration: '2 days' }),
    ],
    baseImage: 'assets/products/p-009-onsite.png', extraImages: [],
    createdAt: _ts('2026-04-15'), createdBy: 'ops@npt', updatedAt: _ts('2026-04-15'), updatedBy: 'ops@npt',
  });

  // 10 · Remote onboarding — single SKU (Services)
  P.push({
    id: 'p-010', categoryId: 'cat-svc', name: 'Remote onboarding', productType: 'SINGLE', status: 'ACTIVE',
    desc: 'Remote video session for setup and operator training.',
    attributeOptions: [],
    skus: [ _sku('p-010', 150, {}) ],
    baseImage: 'assets/products/p-010-remote.png', extraImages: [],
    createdAt: _ts('2026-04-15'), createdBy: 'ops@npt', updatedAt: _ts('2026-04-15'), updatedBy: 'ops@npt',
  });

  return P;
};

const SEED_PRODUCTS = _seedRaw().map(finalizeProduct);

// ─── Derived status (storefront expects productEffectiveStatus) ───────────
// Map canonical ACTIVE/INACTIVE → legacy LISTED/DELISTED so shop filters work.
const productEffectiveStatus = (p) => (p && p.status === 'ACTIVE' ? 'LISTED' : 'DELISTED');

// Category badge (replaces old DEVICE/sample/OTHER badge): shows category name.
const CATEGORY_BADGE = (p) => {
  const cat = (window.SEED_CATEGORIES || []).find((c) => c.id === (p && p.categoryId));
  if (!cat) return { label: 'Uncategorised', tone: 'neutral' };
  return { label: cat.name, tone: 'info' };
};

// Integration modes dropped — keep a no-op for storefront compatibility.
const productIntegrationModes = () => [];

// Variant label for cart / checkout / PDP — derive from SKU attributes.
const resolveVariantLabel = (product, variant) => {
  if (!product || !variant) return '';
  if (variant.label) return variant.label;
  const sku = (product.skus || []).find((s) => s.id === variant.id);
  return sku ? skuLabel(product, sku) : '';
};

// No stock concept (decision) — every SKU reads as available.
const variantStockState = () => 'INF';
const isInfiniteStock = () => true;
const formatStock = () => '∞';

// ─── Blank product for "New product" ───────────────────────────────────────
const blankProduct = () => {
  const id = newProductId();
  return finalizeProduct({
    id,
    categoryId: null,
    name: '',
    desc: '',
    productType: 'SINGLE',
    status: 'INACTIVE',
    attributeOptions: [],
    skus: [{ id: newSkuId(), productId: id, price: 0, attributes: {}, status: 'ACTIVE' }],
    baseImage: null, extraImages: [],
    createdAt: new Date().toISOString(), createdBy: 'sarah@npt',
    updatedAt: new Date().toISOString(), updatedBy: 'sarah@npt',
  });
};

Object.assign(window, {
  SEED_PRODUCTS,
  PRODUCT_TYPES, PRODUCT_STATUSES, PRODUCT_STATUS_TONE, PRODUCT_STATUS_LABEL,
  newProductId, newSkuId,
  skuLabel, skuFullName, skuAttrValues,
  activeSkus, productPriceRange, formatPriceRange, skusSummary,
  buildSkus, deriveCompat, finalizeProduct, isSkuReferenced, isOrphanSku,
  syncProductToCategoryAttrs, categoryAttrImpact,
  productEffectiveStatus, CATEGORY_BADGE, productIntegrationModes, resolveVariantLabel,
  variantStockState, isInfiniteStock, formatStock,
  blankProduct,
});
