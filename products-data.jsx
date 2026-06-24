/* global React, DEVICE_MODELS */
// ─── Sales · Products data layer ─────────────────────────────
// Single-axis variant model: a Product may have 0 OR 1 spec axis. When the
// axis is present, the product carries N variants (one per axis value),
// each with its own price, SKU, image override and ACTIVE/UNAVAILABLE status.
// 0-axis products carry a single BASE variant priced at `basePrice`.

const SPEC_PRESETS = [
  { name: 'Integration mode', values: ['Semi-integration', 'Stand-alone'] },
  { name: 'Color',            values: ['Black', 'White', 'Silver'] },
  { name: 'Pack size',        values: ['10 rolls', '50 rolls', '200 rolls'] },
  { name: 'Service duration', values: ['Half day', 'Full day', '2 days'] },
  { name: 'Connectivity',     values: ['WiFi', 'WiFi + 4G'] },
  { name: 'Storage',          values: ['32GB', '64GB', '128GB'] },
];

// ─── Device product constants (new product form) ────────────────
// Allowed device model ids for the New product form selector.
const DEVICE_MODEL_IDS_ALLOWED = ['m-n950', 'm-s90', 'm-s30', 'm-x800', 'm-n750'];

// Integration modes that a Device product can advertise. Sales pick one
// at View options time; it is NOT a variant axis (it doesn't multiply price).
const INTEGRATION_MODE_OPTIONS = ['Semi-integration', 'Stand-alone'];

// Device variant nature (sample vs production deployment).
const DEVICE_NATURE_OPTIONS = [
  { id: 'SAMPLE',     label: 'Sample',     hint: 'Development sample unit — for evaluation & integration testing' },
  { id: 'PRODUCTION', label: 'Production', hint: 'Real production unit — for live deployment to merchants' },
];

// Spec axes the New product form offers as opt-in checkboxes.
const NETWORK_AXIS = { key: 'network', name: 'Network',  values: ['WIFI', '4G'] };
const STORAGE_AXIS = { key: 'storage', name: 'Storage',  values: ['8G', '16G', '32G'] };
const DEVICE_SPEC_AXES = [NETWORK_AXIS, STORAGE_AXIS];

// Generic spec presets offered to OTHER-type products (accessories /
// consumables / services). These are just quick-add starting points — the
// merchant can rename categories, edit values, or add fully custom ones.
const OTHER_SPEC_AXES = [
  { key: 'color',    name: 'Color',     values: ['Black', 'White'] },
  { key: 'size',     name: 'Size',      values: ['S', 'M', 'L'] },
  { key: 'length',   name: 'Length',    values: ['1m', '2m', '3m'] },
  { key: 'packsize', name: 'Pack size', values: ['Single', '10-pack', '50-pack'] },
];

// Stock helpers — stock can be a non-negative integer OR null (always available).
const isInfiniteStock = (s) => s == null;
const formatStock = (s) => isInfiniteStock(s) ? '∞' : String(s);

// Stock state for a variant. Drives the variant picker (chip badges) and the
// Add/Order CTA across the Goods page and PDP.
//   INF — unlimited stock (services, virtual goods, infinitely-replenishable)
//   OUT — stock === 0, not orderable
//   LOW — stock > 0 but <= LOW_STOCK_THRESHOLD, or carries a free-text stockNote
//   OK  — healthy stock
const LOW_STOCK_THRESHOLD = 5;
const variantStockState = (v) => {
  if (!v) return 'OUT';
  if (v.stock == null) return 'INF';
  if (v.stock <= 0) return 'OUT';
  if (v.stock <= LOW_STOCK_THRESHOLD) return 'LOW';
  if (v.stockNote && String(v.stockNote).trim()) return 'LOW';
  return 'OK';
};

// ─── ID helpers ─────────────────────────────────────────────────
const newAxisId    = () => 'sa-' + Math.random().toString(36).slice(2, 7);
const newValueId   = () => 'sv-' + Math.random().toString(36).slice(2, 7);
const newVariantId = () => 'v-'  + Math.random().toString(36).slice(2, 7);
const newProductId = () => 'p-'  + Math.random().toString(36).slice(2, 7);

// ─── Builders ───────────────────────────────────────────────────
const buildAxis = (name, valueLabels) => ({
  id: newAxisId(),
  name,
  values: valueLabels.map((label) => ({ id: newValueId(), label })),
});

const buildVariants = (productId, axis, basePrice, overridesByLabel = {}) => {
  if (!axis) {
    return [{
      id: newVariantId(), productId,
      sku: 'BASE', combination: {},
      label: '',
      price: basePrice, image: null,
      status: 'ACTIVE', stockNote: '', stock: null,
    }];
  }
  return axis.values.map((val) => {
    const ovr = overridesByLabel[val.label] || {};
    return {
      id: newVariantId(), productId,
      sku: ovr.sku || 'AUTO',
      combination: { [axis.id]: val.id },
      label: ovr.label || val.label,
      price: ovr.price != null ? ovr.price : basePrice,
      image: ovr.image || null,
      status: ovr.status || 'ACTIVE',
      stockNote: ovr.stockNote || '',
      stock: ovr.stock !== undefined ? ovr.stock : null,
    };
  });
};

// Cartesian product of multiple axes — used by the New product form when the
// user opts into both Network + Storage (or just one of them).
const buildGridVariants = (productId, axes, basePrice) => {
  if (!axes || !axes.length) {
    return [{
      id: newVariantId(), productId, sku: 'BASE', combination: {},
      label: '', price: basePrice, image: null,
      status: 'ACTIVE', stockNote: '', stock: null,
    }];
  }
  // Cartesian product
  const combos = axes.reduce((acc, axis) => {
    const next = [];
    acc.forEach((partial) => {
      axis.values.forEach((val) => {
        next.push([...partial, { axis, val }]);
      });
    });
    return next;
  }, [[]]);
  return combos.map((cells) => ({
    id: newVariantId(), productId, sku: 'AUTO',
    combination: cells.reduce((c, { axis, val }) => ({ ...c, [axis.id]: val.id }), {}),
    label: cells.map((c) => c.val.label).join(' + '),
    price: basePrice, image: null,
    status: 'ACTIVE', stockNote: '', stock: null,
  }));
};

// ─── Seed (12 products covering all 3 categories × all lifecycle states) ──
// ─── Mock product photos ─────────────────────────────────────
// No real photo assets exist, so we generate subtly-striped SVG placeholders
// (data URIs) labelled by view. Used to demo the multi-image gallery on the PDP.
const _imgShot = (label, hue) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'>` +
      `<defs><pattern id='p' width='16' height='16' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>` +
        `<rect width='16' height='16' fill='hsl(${hue} 30% 97%)'/>` +
        `<rect width='8' height='16' fill='hsl(${hue} 24% 93%)'/>` +
      `</pattern></defs>` +
      `<rect width='640' height='640' fill='url(#p)'/>` +
      `<rect x='150' y='130' width='340' height='380' rx='28' fill='hsl(${hue} 14% 100%)' stroke='hsl(${hue} 22% 80%)' stroke-width='3'/>` +
      `<rect x='184' y='176' width='272' height='208' rx='10' fill='hsl(${hue} 26% 90%)'/>` +
      `<circle cx='320' cy='450' r='26' fill='none' stroke='hsl(${hue} 22% 78%)' stroke-width='4'/>` +
      `<text x='320' y='592' font-family='ui-monospace, monospace' font-size='26' letter-spacing='1' fill='hsl(${hue} 18% 52%)' text-anchor='middle'>${label}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};
// Three views for one product, tinted by hue.
const _shots = (hue) => [
  _imgShot('FRONT VIEW', hue),
  _imgShot('ANGLED VIEW', hue),
  _imgShot('PORTS / BACK', hue),
];

const _seedProducts = () => {
  const out = [];
  const ts = (d) => new Date(d).toISOString();
  const push = (p) => { out.push(p); return p; };

  // 1. N950 Sample · LISTED · Connectivity axis + Integration mode (separate)
  {
    const id = 'p-001';
    const axis = buildAxis('Connectivity', ['WiFi', 'WiFi + 4G']);
    push({
      id, name: 'N950 Sample',
      type: 'DEVICE', deviceModelId: 'm-n950', deviceVariant: 'SAMPLE',
      sku: 'PRD-N950-S',
      desc: 'Smart Android terminal (sample). 5.5" touch, NFC + magstripe. Each unit ships with a 6-digit activation code.',
      integrationModes: ['Semi-integration', 'Stand-alone'],
      baseImage: _shots(255)[0], extraImages: _shots(255).slice(1), basePrice: 459, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 459, {
        'WiFi':      { price: 459, stock: 3 },
        'WiFi + 4G': { price: 499, stock: 0 },
      }),
      status: 'LISTED',  listFrom: ts('2026-04-01'),
      createdAt: ts('2026-03-28'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-01'), updatedBy: 'sarah@npt',
    });
  }

  // 2. N950 Production · LISTED · Connectivity axis
  {
    const id = 'p-002';
    const axis = buildAxis('Connectivity', ['WiFi', 'WiFi + 4G']);
    push({
      id, name: 'N950 Production',
      type: 'DEVICE', deviceModelId: 'm-n950', deviceVariant: 'PRODUCTION',
      sku: 'PRD-N950-P',
      desc: 'Smart Android terminal for production deployment. Full SN + IMEI tracking, auto-enrolled into Devices Fleet on activation.',
      baseImage: null, basePrice: 379, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 379, {
        'WiFi':       { price: 379 },
        'WiFi + 4G':  { price: 419 },
      }),
      status: 'LISTED', listFrom: ts('2026-04-01'),
      createdAt: ts('2026-03-28'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-01'), updatedBy: 'sarah@npt',
    });
  }

  // 3. S90 Sample · LISTED · Integration
  {
    const id = 'p-003';
    const axis = buildAxis('Integration mode', ['Semi-integration', 'Stand-alone']);
    push({
      id, name: 'S90 Sample',
      type: 'DEVICE', deviceModelId: 'm-s90', deviceVariant: 'SAMPLE',
      sku: 'PRD-S90-S',
      desc: 'Portable wireless terminal (sample). 4G + Wi-Fi + Bluetooth.',
      baseImage: _shots(180)[0], extraImages: _shots(180).slice(1), basePrice: 389, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 389),
      status: 'LISTED', listFrom: ts('2026-04-05'),
      createdAt: ts('2026-04-05'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-05'), updatedBy: 'sarah@npt',
    });
  }

  // 4. S90 Production · LISTED
  {
    const id = 'p-004';
    const axis = buildAxis('Connectivity', ['WiFi', 'WiFi + 4G']);
    push({
      id, name: 'S90 Production',
      type: 'DEVICE', deviceModelId: 'm-s90', deviceVariant: 'PRODUCTION',
      sku: 'PRD-S90-P',
      desc: 'Portable wireless terminal for production deployment.',
      baseImage: null, basePrice: 329, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 329, {
        'WiFi':       { price: 329 },
        'WiFi + 4G':  { price: 379, stockNote: 'Limited stock' },
      }),
      status: 'LISTED', listFrom: ts('2026-04-05'),
      createdAt: ts('2026-04-05'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-05'), updatedBy: 'sarah@npt',
    });
  }

  // 5. X800 Kiosk · LISTED · no axis
  {
    const id = 'p-005';
    push({
      id, name: 'X800 Kiosk Module',
      type: 'DEVICE', deviceModelId: 'm-x800', deviceVariant: 'PRODUCTION',
      sku: 'PRD-X800',
      desc: 'Unattended kiosk module, QR + NFC, IP54 sealed. Single configuration.',
      baseImage: _shots(30)[0], extraImages: _shots(30).slice(1), basePrice: 1180, allowPriceOverride: true,
      specs: [],
      variants: buildVariants(id, null, 1180),
      status: 'LISTED', listFrom: ts('2026-04-10'),
      createdAt: ts('2026-04-10'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-10'), updatedBy: 'sarah@npt',
    });
  }

  // 6. Thermal receipt paper · LISTED · Pack size axis (OTHER)
  {
    const id = 'p-006';
    const axis = buildAxis('Pack size', ['10 rolls', '50 rolls', '200 rolls']);
    push({
      id, name: 'Thermal receipt paper',
      type: 'OTHER',
      sku: 'PRD-PAPER',
      desc: 'Thermal receipt paper rolls, 80mm × 80m. Bulk discount on larger packs.',
      baseImage: null, basePrice: 12, allowPriceOverride: false,
      specs: [axis],
      variants: buildVariants(id, axis, 12, {
        '10 rolls':  { price: 12 },
        '50 rolls':  { price: 55 },
        '200 rolls': { price: 200 },
      }),
      status: 'LISTED', listFrom: ts('2026-04-12'),
      createdAt: ts('2026-04-12'), createdBy: 'ops@npt',
      updatedAt: ts('2026-04-12'), updatedBy: 'ops@npt',
    });
  }

  // 7. USB-C cable · LISTED · no axis (OTHER)
  {
    const id = 'p-007';
    push({
      id, name: 'USB-C cable 1m',
      type: 'OTHER',
      sku: 'PRD-USBC1M',
      desc: 'Replacement USB-C charging cable, 1 meter, braided.',
      baseImage: null, basePrice: 9, allowPriceOverride: false,
      specs: [],
      variants: buildVariants(id, null, 9),
      status: 'LISTED', listFrom: ts('2026-04-12'),
      createdAt: ts('2026-04-12'), createdBy: 'ops@npt',
      updatedAt: ts('2026-04-12'), updatedBy: 'ops@npt',
    });
  }

  // 8. On-site setup · LISTED · Service duration axis (OTHER)
  {
    const id = 'p-008';
    const axis = buildAxis('Service duration', ['Half day', 'Full day', '2 days']);
    push({
      id, name: 'On-site setup service',
      type: 'OTHER',
      sku: 'PRD-SVC-SETUP',
      desc: 'Engineer on-site visit for device deployment and operator training.',
      baseImage: null, basePrice: 300, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 300, {
        'Half day': { price: 300 },
        'Full day': { price: 550 },
        '2 days':   { price: 1000 },
      }),
      status: 'LISTED', listFrom: ts('2026-04-15'),
      createdAt: ts('2026-04-15'), createdBy: 'ops@npt',
      updatedAt: ts('2026-04-15'), updatedBy: 'ops@npt',
    });
  }

  // 9. N1000 Sample · SCHEDULED — DRAFT + future publishAt
  {
    const id = 'p-009';
    const axis = buildAxis('Integration mode', ['Semi-integration', 'Stand-alone']);
    push({
      id, name: 'N1000 Sample',
      type: 'DEVICE', deviceModelId: 'm-n950', deviceVariant: 'SAMPLE',
      sku: 'PRD-N1000-S',
      desc: 'Next-gen Smart Android terminal (sample). Launches with the May product release.',
      baseImage: null, basePrice: 599, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 599),
      status: 'DRAFT',
      publishAt: ts(new Date(Date.now() + 5 * 86400000)),  // 5 days from now
      createdAt: ts('2026-05-20'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-05-22'), updatedBy: 'sarah@npt',
    });
  }

  // 10. S60 Production · DELISTED (out of stock)
  {
    const id = 'p-010';
    const axis = buildAxis('Connectivity', ['WiFi', 'WiFi + 4G']);
    push({
      id, name: 'S60 Production',
      type: 'DEVICE', deviceModelId: 'm-s60', deviceVariant: 'PRODUCTION',
      sku: 'PRD-S60-P',
      desc: 'Dual-screen smart POS, built-in thermal printer.',
      baseImage: null, basePrice: 689, allowPriceOverride: true,
      specs: [axis],
      variants: buildVariants(id, axis, 689),
      status: 'DELISTED',
      delistReason: 'Out of stock, expected back late June',
      delistedAt: ts('2026-05-10'),
      listFrom:  ts('2026-03-01'),
      createdAt: ts('2026-02-28'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-05-10'), updatedBy: 'ops@npt',
    });
  }

  // 11. S30 Production · ARCHIVED (discontinued)
  {
    const id = 'p-011';
    push({
      id, name: 'S30 Production',
      type: 'DEVICE', deviceModelId: 'm-s30', deviceVariant: 'PRODUCTION',
      sku: 'PRD-S30-P',
      desc: 'Compact countertop terminal. End-of-life model — kept for historical orders only.',
      baseImage: null, basePrice: 269, allowPriceOverride: true,
      specs: [],
      variants: buildVariants(id, null, 269),
      status: 'ARCHIVED',
      archivedAt: ts('2026-04-30'),
      listFrom:  ts('2025-01-01'),
      createdAt: ts('2025-01-01'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-30'), updatedBy: 'sarah@npt',
    });
  }

  // 12. Card reader sleeve · DRAFT (no schedule yet)
  {
    const id = 'p-012';
    push({
      id, name: 'Card reader sleeve',
      type: 'OTHER',
      sku: '',
      desc: '(Draft) Protective sleeve for handheld card readers — pending vendor sample approval.',
      baseImage: null, basePrice: 25, allowPriceOverride: false,
      specs: [],
      variants: buildVariants(id, null, 25),
      status: 'DRAFT',
      createdAt: ts('2026-05-25'), createdBy: 'sarah@npt',
      updatedAt: ts('2026-05-25'), updatedBy: 'sarah@npt',
    });
  }

  // ── Additional LISTED catalog (13–34) ───────────────────────────
  // Bulk listed products so the Mall has a full catalog and the grid
  // paginates (first 20, then "Load more" reveals the rest).
  const _extra = [
    // Device · Sample
    { name: 'N750 Sample',          model: 'm-n750', variant: 'SAMPLE',     axis: 'integ',  base: 349, hue: 200, desc: 'Slim handheld terminal (sample). 4G + NFC, all-day battery.' },
    { name: 'S30 Sample',           model: 'm-s30',  variant: 'SAMPLE',     axis: 'integ',  base: 289, hue: 145, desc: 'Compact countertop terminal (sample). Ethernet + Wi-Fi.' },
    { name: 'X800 Sample',          model: 'm-x800', variant: 'SAMPLE',     axis: null,     base: 999, hue: 35,  desc: 'Unattended kiosk module (sample). QR + NFC, IP54 sealed.' },
    { name: 'S60 Sample',           model: 'm-s60',  variant: 'SAMPLE',     axis: 'integ',  base: 549, hue: 285, desc: 'Dual-screen smart POS (sample). Built-in thermal printer.' },
    { name: 'N950 Sample · 4G',     model: 'm-n950', variant: 'SAMPLE',     axis: 'conn',   base: 489, hue: 255, desc: 'Smart Android terminal (sample) with cellular fallback.' },
    // Device · Production
    { name: 'N750 Production',      model: 'm-n750', variant: 'PRODUCTION', axis: 'conn',   base: 299, hue: 200, desc: 'Slim handheld terminal for production deployment.' },
    { name: 'S30 Production',       model: 'm-s30',  variant: 'PRODUCTION', axis: 'conn',   base: 249, hue: 145, desc: 'Compact countertop terminal for live merchant rollout.' },
    { name: 'X800 Production · 4G', model: 'm-x800', variant: 'PRODUCTION', axis: 'conn',   base: 1240, hue: 35, desc: 'Unattended kiosk module with built-in 4G modem.' },
    { name: 'N950 Production · 4G', model: 'm-n950', variant: 'PRODUCTION', axis: 'conn',   base: 389, hue: 255, desc: 'Smart Android terminal with cellular fallback.' },
    { name: 'S90 Production · 4G',  model: 'm-s90',  variant: 'PRODUCTION', axis: 'conn',   base: 359, hue: 180, desc: 'Portable terminal for production with cellular option.' },
    // Other · accessories & services
    { name: 'Charging dock',        model: null,     variant: null,         axis: null,     base: 39,  hue: 60,  desc: 'Single-bay charging dock for handheld terminals.', other: true },
    { name: 'Spare battery pack',   model: null,     variant: null,         axis: null,     base: 29,  hue: 60,  desc: 'Replacement lithium battery, hot-swappable.', other: true },
    { name: 'Protective case',      model: null,     variant: null,         axis: 'color',  base: 19,  hue: 90,  desc: 'Rugged silicone case with hand strap.', other: true },
    { name: 'Screen protector 3pk', model: null,     variant: null,         axis: null,     base: 14,  hue: 90,  desc: 'Tempered-glass screen protectors, pack of three.', other: true },
    { name: 'USB-C cable 2m',       model: null,     variant: null,         axis: null,     base: 12,  hue: 90,  desc: 'Replacement USB-C charging cable, 2 meter, braided.', other: true },
    { name: 'Ethernet adapter',     model: null,     variant: null,         axis: null,     base: 22,  hue: 90,  desc: 'USB-C to Gigabit Ethernet adapter for wired POS.', other: true },
    { name: 'Receipt paper 80mm',   model: null,     variant: null,         axis: 'pack',   base: 12,  hue: 120, desc: 'Thermal receipt paper, 80mm × 80m, BPA-free.', other: true },
    { name: 'Cleaning kit',         model: null,     variant: null,         axis: null,     base: 16,  hue: 120, desc: 'Screen wipes + card-reader cleaning cards.', other: true },
    { name: 'Extended warranty',    model: null,     variant: null,         axis: 'svc',    base: 49,  hue: 15,  desc: 'Extended hardware warranty coverage per device.', other: true },
    { name: 'Remote onboarding',    model: null,     variant: null,         axis: 'svc',    base: 150, hue: 15,  desc: 'Remote video session for setup and operator training.', other: true },
    { name: 'Wall mount bracket',   model: null,     variant: null,         axis: null,     base: 24,  hue: 90,  desc: 'Steel wall-mount bracket for kiosk and countertop units.', other: true },
    { name: 'Payment sticker pack', model: null,     variant: null,         axis: null,     base: 8,   hue: 120, desc: '"Tap to pay" decals and signage, pack of 20.', other: true },
  ];

  const _axisFor = (kind) => {
    if (kind === 'integ') return buildAxis('Integration mode', ['Semi-integration', 'Stand-alone']);
    if (kind === 'conn')  return buildAxis('Connectivity', ['WiFi', 'WiFi + 4G']);
    if (kind === 'color') return buildAxis('Color', ['Black', 'White', 'Silver']);
    if (kind === 'pack')  return buildAxis('Pack size', ['10 rolls', '50 rolls', '200 rolls']);
    if (kind === 'svc')   return buildAxis('Service duration', ['Half day', 'Full day', '2 days']);
    return null;
  };

  _extra.forEach((x, i) => {
    const n = 13 + i;
    const id = 'p-' + String(n).padStart(3, '0');
    const axis = _axisFor(x.axis);
    const day = String(((i) % 27) + 1).padStart(2, '0');
    push({
      id, name: x.name,
      type: x.other ? 'OTHER' : 'DEVICE',
      ...(x.other ? {} : { deviceModelId: x.model, deviceVariant: x.variant }),
      sku: 'PRD-' + id.toUpperCase(),
      desc: x.desc,
      baseImage: x.hue != null && !x.other ? _shots(x.hue)[0] : null,
      extraImages: x.hue != null && !x.other ? _shots(x.hue).slice(1) : undefined,
      basePrice: x.base, allowPriceOverride: !x.other,
      specs: axis ? [axis] : [],
      variants: buildVariants(id, axis, x.base),
      status: 'LISTED', listFrom: ts('2026-04-' + day),
      createdAt: ts('2026-04-' + day), createdBy: 'sarah@npt',
      updatedAt: ts('2026-04-' + day), updatedBy: 'sarah@npt',
    });
  });

  return out;
};

const SEED_PRODUCTS = _seedProducts();

// ─── Derived status (派生态) ─────────────────────────────────────
// Named `productEffectiveStatus` (not `effectiveStatus`) so it does NOT
// collide with shared.jsx's contract-side window.effectiveStatus —
// products-data.jsx loads after shared.jsx, and a bare `effectiveStatus`
// export would shadow the contract one on window, silently breaking
// every customer-list / customer-detail status filter and stat tile.
const productEffectiveStatus = (p, now = new Date()) => {
  if (!p) return null;
  if (p.status === 'ARCHIVED') return 'ARCHIVED';
  if (p.status === 'DELISTED') return 'DELISTED';
  if (p.status === 'DRAFT' && p.publishAt && new Date(p.publishAt) > now) return 'SCHEDULED';
  if (p.status === 'DRAFT') return 'DRAFT';
  if (p.status === 'LISTED' && p.listTo && new Date(p.listTo) < now) return 'EXPIRED';
  return 'LISTED';
};

const PRODUCT_STATUS_TONE = {
  DRAFT: 'neutral', SCHEDULED: 'info', LISTED: 'success',
  EXPIRED: 'warning', DELISTED: 'warning', ARCHIVED: 'neutral',
};
const PRODUCT_STATUS_LABEL = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', LISTED: 'Published',
  EXPIRED: 'Expired', DELISTED: 'Unpublished', ARCHIVED: 'Archived',
};

const CATEGORY_BADGE = (p) => {
  if (!p) return { label: 'Unknown', tone: 'neutral' };
  if (p.type === 'OTHER') return { label: 'Other', tone: 'neutral' };
  if (p.deviceVariant === 'SAMPLE')     return { label: 'Device · Sample', tone: 'accent' };
  if (p.deviceVariant === 'PRODUCTION') return { label: 'Device · Prod',   tone: 'success' };
  return { label: 'Device', tone: 'info' };
};

// price range / variants summary
const productPriceRange = (p) => {
  if (!p.variants || !p.variants.length) {
    return { min: p.basePrice || 0, max: p.basePrice || 0 };
  }
  const prices = p.variants.filter((v) => v.status === 'ACTIVE').map((v) => v.price);
  if (!prices.length) return { min: p.basePrice, max: p.basePrice };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

const formatPriceRange = (p) => {
  const { min, max } = productPriceRange(p);
  if (min === max) return `$${min.toFixed(2)}`;
  return `$${min.toFixed(2)} – $${max.toFixed(2)}`;
};

const variantsSummary = (p) => {
  if (!p.specs || !p.specs.length) return '—';
  const active = p.variants.filter((v) => v.status === 'ACTIVE').length;
  const total = p.variants.length;
  return active === total
    ? `${total} variants · ${p.specs[0].name}`
    : `${active}/${total} active · ${p.specs[0].name}`;
};

// ─── Integration mode resolution ────────────────────────────────
// A product can advertise integration modes either via the new
// `integrationModes` array OR a legacy `specs[0]` whose name reads
// "Integration mode". The View-options page reads through this helper.
const productIntegrationModes = (p) => {
  if (!p) return [];
  // Business rule: integration mode applies ONLY to SAMPLE devices.
  if (p.type !== 'DEVICE' || p.deviceVariant !== 'SAMPLE') return [];
  if (Array.isArray(p.integrationModes) && p.integrationModes.length) return p.integrationModes;
  const axis = p.specs && p.specs[0];
  if (axis && /^integration\s*mode$/i.test(axis.name)) {
    return axis.values.map((v) => v.label);
  }
  return [];
};

// Friendly variant label for cart / checkout / PDP. Falls back to assembling
// from spec-axis combination if no custom label is stored.
const resolveVariantLabel = (product, variant) => {
  if (!product || !variant) return '';
  if (variant.label) return variant.label;
  if (!product.specs || !product.specs.length) return '';
  return product.specs
    .map((axis) => axis.values.find((v) => v.id === variant.combination?.[axis.id])?.label)
    .filter(Boolean)
    .join(' + ');
};

// blank template for "New product"
const blankProduct = () => {
  const id = newProductId();
  return {
    id, name: '',
    type: 'DEVICE',
    deviceModelId: (window.DEVICE_MODELS || []).find((m) => DEVICE_MODEL_IDS_ALLOWED.includes(m.id))?.id || null,
    deviceVariant: 'PRODUCTION',
    integrationModes: ['Semi-integration', 'Stand-alone'],
    sku: '',
    desc: '',
    baseImage: null, basePrice: 0, allowPriceOverride: true,
    specs: [],
    variants: buildVariants(id, null, 0),
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    createdBy: 'sarah@npt',
    updatedAt: new Date().toISOString(),
    updatedBy: 'sarah@npt',
  };
};

Object.assign(window, {
  SEED_PRODUCTS, SPEC_PRESETS,
  DEVICE_MODEL_IDS_ALLOWED, INTEGRATION_MODE_OPTIONS, DEVICE_NATURE_OPTIONS,
  NETWORK_AXIS, STORAGE_AXIS, DEVICE_SPEC_AXES, OTHER_SPEC_AXES,
  isInfiniteStock, formatStock, variantStockState, LOW_STOCK_THRESHOLD,
  productEffectiveStatus,
  PRODUCT_STATUS_TONE, PRODUCT_STATUS_LABEL,
  CATEGORY_BADGE, productPriceRange, formatPriceRange, variantsSummary,
  productIntegrationModes, resolveVariantLabel,
  newAxisId, newValueId, newVariantId, newProductId,
  buildAxis, buildVariants, buildGridVariants, blankProduct,
});
