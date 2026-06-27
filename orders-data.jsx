/* global React */
// ─── Device model catalog ─────────────────────────────────
// Generic sample POS / payment device lineup. NOTE: orders no longer source
// from this list (they reference catalog Product/SKUs); it remains the seed
// for the Device Models page and contract clause fields.
const DEVICE_MODELS = [
  {
    id: 'm-n950',
    name: 'N950',
    family: 'Smart Android',
    desc: 'Smart Android terminal, 5.5" touch, NFC + magstripe.',
    unitPrice: 459,
    types: ['Semi-integration', 'Stand-alone'],
    image: null,
  },
  {
    id: 'm-s30',
    name: 'S30',
    family: 'Countertop',
    desc: 'Compact countertop terminal, Ethernet + dial-up.',
    unitPrice: 269,
    types: ['Semi-integration', 'Stand-alone'],
    image: null,
  },
  {
    id: 'm-s60',
    name: 'S60',
    family: 'Smart POS',
    desc: 'Dual-screen smart POS, built-in thermal printer.',
    unitPrice: 689,
    types: ['Semi-integration', 'Stand-alone'],
    image: null,
  },
  {
    id: 'm-s90',
    name: 'S90',
    family: 'Portable',
    desc: 'Portable wireless terminal, 4G + Wi-Fi + Bluetooth.',
    unitPrice: 389,
    types: ['Semi-integration', 'Stand-alone'],
    image: null,
  },
  {
    id: 'm-n750',
    name: 'N750',
    family: 'Mobile',
    desc: 'Slim mobile Android handheld, 4G + NFC.',
    unitPrice: 319,
    types: ['Semi-integration', 'Stand-alone'],
    image: null,
  },
  {
    id: 'm-x800',
    name: 'X800',
    family: 'Kiosk',
    desc: 'Unattended kiosk module, QR + NFC, IP54 sealed.',
    unitPrice: 1180,
    types: ['Semi-integration'],
    image: null,
  },
];

// ─── ORDER model (mall.md) ────────────────────────────────
// ORDER:      party_id · order_type(SAMPLE/PRODUCT DEVICE) · ori_amount ·
//             discount_percent ⊕ discount_amount (mutually exclusive) ·
//             total_amount · shipping(jsonb) · remark · status machine
// ORDER ITEM: sku_id · ori_price · quantity · amount · bundle_items(jsonb)
//
// Status machine:
//   PENDING_PAYMENT → PENDING_SHIP → SHIPPED  (final; no DELIVERED state)
//   CANCELLED  ← from PENDING_PAYMENT / PENDING_SHIP
//   REFUNDED   ← from PENDING_SHIP / SHIPPED

const ORDER_TYPES = [
  { id: 'SAMPLE',  label: 'Sample device',  hint: 'Evaluation units for a prospective customer' },
  { id: 'PRODUCT', label: 'Product device', hint: 'Production purchase for deployment' },
];
const ORDER_TYPE_LABEL = { SAMPLE: 'Sample device', PRODUCT: 'Product device' };

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PENDING_SHIP', 'SHIPPED', 'CANCELLED', 'REFUNDED'];
const ORDER_STATUS_LABEL = {
  PENDING_PAYMENT: 'Pending payment',
  PENDING_SHIP:    'Pending shipment',
  SHIPPED:         'Shipped',
  CANCELLED:       'Cancelled',
  REFUNDED:        'Refunded',
};
const ORDER_STATUS_TONE = {
  PENDING_PAYMENT: 'warning',
  PENDING_SHIP:    'info',
  SHIPPED:         'success',
  CANCELLED:       'neutral',
  REFUNDED:        'error',
};
// Main fulfillment pipeline (terminal states render as a banner, not a step).
const ORDER_FLOW = ['PENDING_PAYMENT', 'PENDING_SHIP', 'SHIPPED'];

// Allowed transitions per mall.md.
const canCancelOrder  = (o) => o.status === 'PENDING_PAYMENT' || o.status === 'PENDING_SHIP';
const canRefundOrder  = (o) => o.status === 'PENDING_SHIP' || o.status === 'SHIPPED';

// ─── Money helpers ────────────────────────────────────────
const moneyUSD = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

// ori_amount = Σ item.amount (amount = ori_price × quantity)
const orderOriAmount = (o) => o.items.reduce((n, i) => n + (i.amount != null ? i.amount : i.oriPrice * i.qty), 0);
// Discount value in $. discount_amount is the COMPUTED dollar discount of the
// percent discount — fall back to recomputing from percent if amount isn't set.
const orderDiscountValue = (o) => {
  if (o.discountAmount != null && o.discountAmount > 0) return Math.min(o.discountAmount, orderOriAmount(o));
  if (o.discountPercent != null && o.discountPercent > 0) return Math.round(orderOriAmount(o) * o.discountPercent) / 100;
  return 0;
};
const orderTotal = (o) => Math.max(0, Math.round((orderOriAmount(o) - orderDiscountValue(o)) * 100) / 100);
const orderQty = (o) => o.items.reduce((n, i) => n + i.qty, 0);
// Human label: '5% off' (with the computed amount shown alongside) or Complimentary.
const orderDiscountLabel = (o) => {
  if (o.discountPercent === 100) return 'Complimentary';
  if (o.discountPercent != null && o.discountPercent > 0) return `${o.discountPercent}% off`;
  if (o.discountAmount != null && o.discountAmount > 0) {
    return `${moneyUSD ? moneyUSD(o.discountAmount) : '$' + o.discountAmount.toFixed(2)} off`;
  }
  return '';
};
// Legacy alias (a few summaries still call orderSubtotal).
const orderSubtotal = orderOriAmount;

// ─── Order item factory ───────────────────────────────────
// Builds an ORDER ITEM from a catalog product + SKU. Snapshots the display
// name / attributes / image so historical orders survive catalog edits.
const orderItemFromSku = (product, sku, qty, idSuffix) => {
  const label = window.skuLabel ? window.skuLabel(product, sku) : '';
  const item = {
    id: 'li-' + (idSuffix != null ? idSuffix : Math.random().toString(36).slice(2, 7)),
    skuId: sku.id,
    productId: product.id,
    name: product.name,
    variantLabel: label,
    attributes: { ...(sku.attributes || {}) },
    image: product.baseImage || null,
    oriPrice: sku.price,
    qty,
    amount: Math.round(sku.price * qty * 100) / 100,
  };
  return item;
};

// ─── Seed orders (items reference deterministic catalog SKU ids) ──────────
const _item = (idSuffix, skuId, productId, name, variantLabel, attributes, image, oriPrice, qty) => ({
  id: 'li-' + idSuffix,
  skuId, productId, name, variantLabel, attributes, image,
  oriPrice, qty, amount: Math.round(oriPrice * qty * 100) / 100,
});

const SEED_ORDERS = [
  // 1) PENDING_PAYMENT · PRODUCT · percent discount
  {
    id: 'o-2026-0184',
    number: 'SO-2026-0184',
    partyId: 'c-001',
    customerName: 'Northwind Commerce',
    orderType: 'PRODUCT',
    createdAt: '2026-05-09T14:22:00Z',
    createdBy: 'jordan.d@carbon',
    status: 'PENDING_PAYMENT',
    items: [
      _item('1', 'sku-p-001-64g', 'p-001', 'N950 Smart Terminal', '64G', { storage: '64G' }, 'assets/products/p-001-n950.png', 499, 12),
      _item('2', 'sku-p-007-200rolls', 'p-007', 'Thermal receipt paper', '200 rolls', { packSize: '200 rolls' }, 'assets/products/p-007-paper.png', 200, 2),
    ],
    discountPercent: 5,
    discountAmount: null,
    remark: 'Quarterly refresh batch. Net-30 invoicing.',
    shipping: { name: 'Sarah Chen', address: '1455 Market St, Suite 600, San Francisco, CA 94103', method: 'Standard ground' }
  },

  // 2) PENDING_SHIP · SAMPLE · complimentary (100%)
  {
    id: 'o-2026-0181',
    number: 'SO-2026-0181',
    partyId: 'c-002',
    customerName: 'Helios Payments',
    orderType: 'SAMPLE',
    createdAt: '2026-05-07T11:08:00Z',
    createdBy: 'jordan.d@carbon',
    status: 'PENDING_SHIP',
    items: [
      _item('1', 'sku-p-005-base', 'p-005', 'N750 Mobile Handheld', '', {}, 'assets/products/p-005-n750.png', 319, 4),
      _item('2', 'sku-p-003-4inch', 'p-003', 'S60 Dual-screen POS', '4-inch', { secondScreen: '4-inch' }, 'assets/products/p-003-s60.png', 689, 2),
    ],
    discountPercent: 100,
    discountAmount: null,
    remark: 'Sample units for evaluation — no charge.',
    shipping: { name: 'Elena Rossi', address: '200 W Madison St, Floor 24, Chicago, IL 60606', method: 'Express overnight' }
  },

  // 3) PENDING_SHIP · PRODUCT · amount discount ($150 off)
  {
    id: 'o-2026-0177',
    number: 'SO-2026-0177',
    partyId: 'c-003',
    customerName: 'Brightleaf Retail',
    orderType: 'PRODUCT',
    createdAt: '2026-05-04T16:40:00Z',
    createdBy: 'admin@carbon',
    status: 'PENDING_SHIP',
    items: [
      _item('1', 'sku-p-006-base', 'p-006', 'S30 Countertop Terminal', '', {}, 'assets/products/p-006-s30.png', 269, 6),
      _item('2', 'sku-p-009-fullday', 'p-009', 'On-site setup service', 'Full day', { duration: 'Full day' }, 'assets/products/p-009-onsite.png', 550, 1),
    ],
    discountPercent: 7,
    discountAmount: null,
    remark: '',
    shipping: { name: 'Henry Tremblay', address: '88 King St E, Toronto, ON M5C 1G3, Canada', method: 'Standard ground' }
  },

  // 4) SHIPPED · PRODUCT · bundle item with expanded components
  {
    id: 'o-2026-0152',
    number: 'SO-2026-0152',
    partyId: 'c-004',
    customerName: 'Vanta Software',
    orderType: 'PRODUCT',
    createdAt: '2026-04-21T09:15:00Z',
    createdBy: 'admin@carbon',
    status: 'SHIPPED',
    items: [
      _item('1', 'sku-p-001-64g', 'p-001', 'N950 Smart Terminal', '64G', { storage: '64G' }, 'assets/products/p-001-n950.png', 499, 3),
      _item('2', 'sku-p-007-10rolls', 'p-007', 'Thermal receipt paper', '10 rolls', { packSize: '10 rolls' }, 'assets/products/p-007-paper.png', 12, 3),
    ],
    discountPercent: null,
    discountAmount: null,
    remark: 'Pilot program, Zürich office.',
    shipping: { name: 'Lukas Meier', address: 'Bahnhofstrasse 12, 8001 Zürich, Switzerland', method: 'International express', tracking: 'DHL 4129-8821-7733' }
  },

  // 5) SHIPPED · PRODUCT
  {
    id: 'o-2026-0140',
    number: 'SO-2026-0140',
    partyId: 'c-001',
    customerName: 'Northwind Commerce',
    orderType: 'PRODUCT',
    createdAt: '2026-04-10T13:00:00Z',
    createdBy: 'jordan.d@carbon',
    status: 'SHIPPED',
    items: [
      _item('1', 'sku-p-004-base', 'p-004', 'X800 Kiosk Module', '', {}, 'assets/products/p-004-x800.png', 1180, 2),
      _item('2', 'sku-p-010-base', 'p-010', 'Remote onboarding', '', {}, 'assets/products/p-010-remote.png', 150, 1),
    ],
    discountPercent: null,
    discountAmount: null,
    remark: 'Unattended kiosk pilot, two lobby units.',
    shipping: { name: 'Sarah Chen', address: '1455 Market St, Suite 600, San Francisco, CA 94103', method: 'Standard ground', tracking: 'FX-204-8841' }
  },

  // 6) CANCELLED · SAMPLE (cancelled while pending payment)
  {
    id: 'o-2026-0123',
    number: 'SO-2026-0123',
    partyId: 'c-002',
    customerName: 'Helios Payments',
    orderType: 'SAMPLE',
    createdAt: '2026-03-30T10:05:00Z',
    createdBy: 'jordan.d@carbon',
    status: 'CANCELLED',
    items: [
      _item('1', 'sku-p-002-64g', 'p-002', 'S90 Portable Terminal', '64G', { storage: '64G' }, 'assets/products/p-002-s90.png', 379, 2),
    ],
    discountPercent: null,
    discountAmount: null,
    remark: '',
    shipping: { name: 'Elena Rossi', address: '200 W Madison St, Floor 24, Chicago, IL 60606', method: 'Standard ground' }
  },

  // 7) REFUNDED · PRODUCT (refunded after delivery)
  {
    id: 'o-2026-0098',
    number: 'SO-2026-0098',
    partyId: 'c-003',
    customerName: 'Brightleaf Retail',
    orderType: 'PRODUCT',
    createdAt: '2026-03-18T10:30:00Z',
    createdBy: 'admin@carbon',
    status: 'REFUNDED',
    items: [
      _item('1', 'sku-p-006-base', 'p-006', 'S30 Countertop Terminal', '', {}, 'assets/products/p-006-s30.png', 269, 24),
    ],
    discountPercent: 8,
    discountAmount: null,
    remark: 'Multi-store rollout, batch 2.',
    shipping: { name: 'Henry Tremblay', address: '88 King St E, Toronto, ON M5C 1G3, Canada', method: 'Freight', tracking: 'FX-991-2207' }
  },
];

Object.assign(window, {
  DEVICE_MODELS, SEED_ORDERS,
  ORDER_TYPES, ORDER_TYPE_LABEL,
  ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, ORDER_FLOW,
  canCancelOrder, canRefundOrder,
  orderOriAmount, orderDiscountValue, orderTotal, orderQty, orderDiscountLabel, orderSubtotal,
  orderItemFromSku, moneyUSD,
});
