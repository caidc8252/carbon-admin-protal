/* global React */
// ─────────────────────────────────────────────────────────────
// Factory Images — Day 0 pre-install spec (Docker-style image model).
//
// A Factory Image is the pre-install manifest the factory follows when
// flashing a fresh-off-the-line device:
//   "For model X, flash firmware version F, the mandatory PEP baseline,
//    plus these system + ISV apps."
//
// This is NOT bound to any ISO customer. A customer (or ISO) name may
// appear as the leading text segment of the image NAME for traceability,
// but it is just a label — there is no entity binding.
//
// Shape:
//   id               'FI-2026-NNNN'
//   name             Docker-style label-model-version (see naming rules)
//   payload.byModel  single per-model bundle (exactly one model)
//   qr               { token } — factory scan target
//   ownerEmail       NPT staff who maintains this image
//   createdAt/By, updatedAt/By, events[]
//
// payload.byModel[modelCode]:
//   firmwareRefs:   [{ firmwareId, versionId }]      exactly ONE
//   pepRef:         { appId:'pep', versionId }        MANDATORY baseline
//   systemAppRefs:  [{ appId, versionId }, …]         App-Publish apps (not PEP)
//   isvAppRefs:     [{ appId, versionId }, …]         ISV apps
//
// Constraints (enforced in UI):
//   • Exactly one model + one firmware version per image.
//   • PEP is mandatory — version may change, but PEP can never be removed.
//   • System app & ISV app refs may be multi.
//   • Editing the image at any time is allowed. Devices already provisioned
//     keep their own version snapshot at flash time (see Device.preinstalled).
// ─────────────────────────────────────────────────────────────

// PEP — Newland MTMS client — is identified by these two constants. It is
// sourced from the App-Publish catalog (window.AP.APPS) and is the mandatory
// baseline on every factory image.
const FI_PEP_APP_ID  = 'pep';
const FI_PEP_PACKAGE = 'com.newland.pospp.mtms.client.n900';

// ── Fallback App-Publish catalog ────────────────────────────
// The App-Publish menu owns the live catalog (window.AP.APPS), but it is
// lazy-loaded — it only has data once the user has visited the App Publish
// screen. So factory images carry a small fallback mirror (PEP + the common
// published apps) with keys + version names that match the live catalog, so
// this module runs standalone without requiring App Publish to load first.
const FI_FALLBACK_APP_CATALOG = [
  {
    id: 'pep', name: 'PEP', package: FI_PEP_PACKAGE, iconId: 'pos',
    category: 'Payments', status: 'published',
    description: 'Newland MTMS client (PEP) — the terminal-management agent that registers the device with TOMS, reports health, and brokers OTA. Mandatory baseline on every device.',
    versions: [
      { id: 'pep-v320', code: 3200, name: '3.2.0', size: '9.8 MB', status: 'published', current: true },
      { id: 'pep-v314', code: 3140, name: '3.1.4', size: '9.6 MB', status: 'published' },
      { id: 'pep-v310', code: 3100, name: '3.1.0', size: '9.5 MB', status: 'published' },
    ],
  },
  {
    id: 'pos', name: 'Acme POS Pro', package: 'com.acme.pos.pro', iconId: 'pos',
    category: 'Payments', status: 'published',
    versions: [
      { id: 'v32', code: 1432, name: '4.3.2', size: '28.4 MB', status: 'published', current: true },
      { id: 'v31', code: 1431, name: '4.3.1', size: '28.1 MB', status: 'published' },
      { id: 'v30', code: 1430, name: '4.3.0', size: '27.9 MB', status: 'published' },
    ],
  },
  {
    id: 'inventory', name: 'Stockroom', package: 'com.acme.stockroom', iconId: 'inventory',
    category: 'Inventory', status: 'published',
    versions: [
      { id: 'v12', code: 212, name: '2.1.2', size: '14.2 MB', status: 'published', current: true },
      { id: 'v11', code: 211, name: '2.1.1', size: '14.0 MB', status: 'published' },
    ],
  },
  {
    id: 'loyalty', name: 'Loyalty+', package: 'com.acme.loyalty', iconId: 'loyalty',
    category: 'Loyalty', status: 'published',
    versions: [
      { id: 'v06', code: 106, name: '1.3.4', size: '9.5 MB', status: 'published', current: true },
      { id: 'v05', code: 105, name: '1.3.3', size: '9.4 MB', status: 'published' },
    ],
  },
  {
    id: 'reporting', name: 'Insights', package: 'com.acme.insights', iconId: 'reporting',
    category: 'Reporting', status: 'published',
    versions: [
      { id: 'v04', code: 4, name: '1.2.0', size: '11.1 MB', status: 'published', current: true },
      { id: 'v03', code: 3, name: '1.1.2', size: '10.8 MB', status: 'published' },
    ],
  },
  {
    id: 'catalog', name: 'Catalog Sync', package: 'com.acme.catalog', iconId: 'catalog',
    category: 'Retail', status: 'published',
    versions: [
      { id: 'v09', code: 109, name: '1.0.9', size: '7.4 MB', status: 'published', current: true },
      { id: 'v08', code: 108, name: '1.0.8', size: '7.2 MB', status: 'published' },
    ],
  },
  {
    id: 'timeclock', name: 'Timeclock', package: 'com.summit.timeclock', iconId: 'timeclock',
    category: 'Workforce', status: 'published',
    versions: [
      { id: 'v15', code: 215, name: '2.0.5', size: '5.9 MB', status: 'published', current: true },
      { id: 'v14', code: 214, name: '2.0.4', size: '5.8 MB', status: 'published' },
    ],
  },
];

// ── Seed helpers ────────────────────────────────────────
const __fiT = (daysAgo, hoursAgo = 0) =>
  new Date(Date.UTC(2026, 4, 25, 12) - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

// Pick the single firmware version ref for (modelCode, versionName).
// Firmware is per-model: one record per model, many versions inside it.
const __fiPickFw = (modelCode, versionName) => {
  const fw = (window.SEED_FIRMWARE || []).find(f => f.modelCode === modelCode);
  if (!fw) return null;
  const v = (fw.versions || []).find(v => v.versionName === versionName && v.current)
    || (fw.versions || []).find(v => v.versionName === versionName)
    || (fw.versions || []).find(v => v.current)
    || fw.versions?.[0];
  if (!v) return null;
  return { firmwareId: fw.id, versionId: v.id };
};

// PEP ref against the effective catalog (current version by default).
const __fiPepRef = (versionId) => ({ appId: FI_PEP_APP_ID, versionId: versionId || 'pep-v320' });

const __fiPickIsvApp = (pkg, verName) => {
  const a = (window.SEED_APPS || []).find(x => x.package === pkg);
  if (!a) return null;
  const v = (a.versions || []).find(v => v.name === verName) || a.versions?.[0];
  if (!v) return null;
  return { appId: a.id, versionId: v.id };
};

const __fiQR = (id) => ({
  token: `qr_${id.toLowerCase().replace(/-/g, '')}_${Math.random().toString(36).slice(2, 10)}`,
});

// ── Seed factory images ──────────────────────────────────
(function buildFactoryImageSeed() {
  const seeds = [
    // ── 1 — Active baseline, N950 ──
    {
      id: 'FI-2026-0001',
      name: 'Acme Retail-N950-V2.3.1',
      payload: {
        byModel: {
          'N950': {
            firmwareRefs:  [__fiPickFw('N950', 'V2.3.1')].filter(Boolean),
            pepRef:        __fiPepRef('pep-v320'),
            systemAppRefs: [{ appId: 'inventory', versionId: 'v12' }, { appId: 'catalog', versionId: 'v09' }],
            isvAppRefs:    [__fiPickIsvApp('com.northwind.pos.pro', '4.3.2')].filter(Boolean),
          },
        },
      },
      qr: __fiQR('FI-2026-0001'),
      ownerEmail: 'amelia.singh@carbon',
      createdAt: __fiT(58), createdBy: 'amelia.singh@carbon',
      updatedAt: __fiT(3, 4), updatedBy: 'amelia.singh@carbon',
      events: [
        { at: __fiT(58),    kind: 'created',  actor: 'amelia.singh@carbon', text: 'Created' },
        { at: __fiT(28, 6), kind: 'edited',   actor: 'amelia.singh@carbon', text: 'Bumped firmware V2.3.0 → V2.3.1' },
        { at: __fiT(15, 2), kind: 'edited',   actor: 'amelia.singh@carbon', text: 'Added Northwind POS Pro 4.3.2' },
        { at: __fiT(3, 4),  kind: 'promoted', actor: 'amelia.singh@carbon', text: 'Promoted to Release REL-2026-0001' },
      ],
    },

    // ── 2 — Active, S60 ──
    {
      id: 'FI-2026-0002',
      name: 'Pinegate Apparel-S60-V1.7.2',
      payload: {
        byModel: {
          'S60': {
            firmwareRefs:  [__fiPickFw('S60', 'V1.7.2')].filter(Boolean),
            pepRef:        __fiPepRef('pep-v320'),
            systemAppRefs: [{ appId: 'timeclock', versionId: 'v15' }, { appId: 'loyalty', versionId: 'v06' }],
            isvAppRefs:    [],
          },
        },
      },
      qr: __fiQR('FI-2026-0002'),
      ownerEmail: 'taylor.kim@carbon',
      createdAt: __fiT(42), createdBy: 'taylor.kim@carbon',
      updatedAt: __fiT(11), updatedBy: 'taylor.kim@carbon',
      events: [
        { at: __fiT(42), kind: 'created',  actor: 'taylor.kim@carbon', text: 'Created' },
        { at: __fiT(11), kind: 'edited',   actor: 'taylor.kim@carbon', text: 'Bumped PEP baseline 3.1.4 → 3.2.0' },
      ],
    },

    // ── 3 — Active, X800 RTOS kiosk ──
    {
      id: 'FI-2026-0003',
      name: 'Harbor Kiosks-X800-V1.0.7',
      payload: {
        byModel: {
          'X800': {
            firmwareRefs:  [__fiPickFw('X800', 'V1.0.7')].filter(Boolean),
            pepRef:        __fiPepRef('pep-v320'),
            systemAppRefs: [],
            isvAppRefs:    [],
          },
        },
      },
      qr: __fiQR('FI-2026-0003'),
      ownerEmail: 'amelia.singh@carbon',
      createdAt: __fiT(33), createdBy: 'amelia.singh@carbon',
      updatedAt: __fiT(33), updatedBy: 'amelia.singh@carbon',
      events: [
        { at: __fiT(33), kind: 'created',  actor: 'amelia.singh@carbon', text: 'Created' },
      ],
    },

    // ── 4 — Active, N950 Android 12 ──
    {
      id: 'FI-2026-0004',
      name: 'Northwind-N950-V3.0.1',
      payload: {
        byModel: {
          'N950': {
            firmwareRefs:  [__fiPickFw('N950', 'V3.0.1')].filter(Boolean),
            pepRef:        __fiPepRef('pep-v314'),
            systemAppRefs: [{ appId: 'catalog', versionId: 'v09' }, { appId: 'reporting', versionId: 'v04' }],
            isvAppRefs:    [],
          },
        },
      },
      qr: __fiQR('FI-2026-0004'),
      ownerEmail: 'jordan.diaz@carbon',
      createdAt: __fiT(2, 4), createdBy: 'jordan.diaz@carbon',
      updatedAt: __fiT(0, 8), updatedBy: 'jordan.diaz@carbon',
      events: [
        { at: __fiT(2, 4), kind: 'created', actor: 'jordan.diaz@carbon', text: 'Created' },
        { at: __fiT(0, 8), kind: 'edited',  actor: 'jordan.diaz@carbon', text: 'Added Insights 1.2.0' },
      ],
    },

    // ── 5 — Older S90 baseline ──
    {
      id: 'FI-2026-0005',
      name: 'Lumen POS-S90-V1.0.2',
      payload: {
        byModel: {
          'S90': {
            firmwareRefs:  [__fiPickFw('S90', 'V1.0.2')].filter(Boolean),
            pepRef:        __fiPepRef('pep-v310'),
            systemAppRefs: [{ appId: 'loyalty', versionId: 'v06' }, { appId: 'timeclock', versionId: 'v15' }],
            isvAppRefs:    [],
          },
        },
      },
      qr: __fiQR('FI-2026-0005'),
      ownerEmail: 'taylor.kim@carbon',
      createdAt: __fiT(98), createdBy: 'taylor.kim@carbon',
      updatedAt: __fiT(40), updatedBy: 'taylor.kim@carbon',
      events: [
        { at: __fiT(98), kind: 'created',   actor: 'taylor.kim@carbon', text: 'Created' },
      ],
    },
  ];

  window.SEED_FACTORY_IMAGES = seeds;
})();

// ── Lookups ─────────────────────────────────────────────

const findFactoryImageById = (id) =>
  (window.SEED_FACTORY_IMAGES || []).find(fi => fi.id === id);

// The image's single model code.
const factoryImageModelCode = (fi) => Object.keys(fi?.payload?.byModel || {})[0] || null;

// The single per-model bundle.
const factoryImageBundle = (fi) => {
  const code = factoryImageModelCode(fi);
  return code ? fi.payload.byModel[code] : null;
};

// ── Effective App-Publish catalog (live, else fallback) ──
// The App Publish menu owns the live catalog at window.AP.APPS, but it is
// lazy-loaded. Prefer it when populated; otherwise use the bundled fallback
// so factory images resolve PEP + system apps even before App Publish loads.
const factoryImageSystemAppCatalog = () => {
  const live = (window.AP && window.AP.APPS) || [];
  return live.length ? live : FI_FALLBACK_APP_CATALOG;
};

// The PEP app from the effective catalog.
const getFactoryImagePepApp = () =>
  factoryImageSystemAppCatalog().find(a => a.id === FI_PEP_APP_ID || a.package === FI_PEP_PACKAGE) || null;

// Resolve a firmware {firmwareId, versionId} ref against window.SEED_FIRMWARE.
const resolveFirmwareRef = (ref) => {
  if (!ref) return null;
  const fw = (window.SEED_FIRMWARE || []).find(f => f.id === ref.firmwareId);
  if (!fw) return null;
  const version = (fw.versions || []).find(v => v.id === ref.versionId)
    || (fw.versions || []).find(v => v.current)
    || (fw.versions || [])[0];
  if (!version) return null;
  return { firmware: fw, version };
};

// Resolve the mandatory PEP ref → { app, version }. Version falls back to the
// catalog's current PEP version (or first) when the pinned id can't be found.
const resolvePepRef = (ref) => {
  const app = getFactoryImagePepApp();
  if (!app) return null;
  const versions = app.versions || [];
  const version = (ref && versions.find(v => v.id === ref.versionId))
    || versions.find(v => v.current)
    || versions[0];
  if (!version) return null;
  return { app, version };
};

// Resolve a system app {appId, versionId} ref against the App-Publish catalog.
const resolveSystemAppRef = (ref) => {
  if (!ref) return null;
  const app = factoryImageSystemAppCatalog().find(a => a.id === ref.appId);
  if (!app) return null;
  const version = (app.versions || []).find(v => v.id === ref.versionId);
  if (!version) return null;
  return { app, version };
};

// Resolve an ISV app {appId, versionId} ref against window.SEED_APPS.
const resolveIsvAppRef = (ref) => {
  if (!ref) return null;
  const app = (window.SEED_APPS || []).find(a => a.id === ref.appId);
  if (!app) return null;
  const version = (app.versions || []).find(v => v.id === ref.versionId);
  if (!version) return null;
  return { app, version };
};

// Resolve the whole payload to display-ready records.
// Returns one entry per model (always exactly one): firmwares, pep, apps.
const resolveFactoryImagePayload = (fi) => {
  const out = [];
  for (const [modelCode, bundle] of Object.entries(fi?.payload?.byModel || {})) {
    const firmwares  = (bundle.firmwareRefs || []).map(r => window.resolveFirmwareRef?.(r)).filter(Boolean);
    const pep        = bundle.pepRef ? window.resolvePepRef?.(bundle.pepRef) : null;
    const systemApps = (bundle.systemAppRefs || []).map(r => window.resolveSystemAppRef?.(r)).filter(Boolean);
    const isvApps    = (bundle.isvAppRefs    || []).map(r => window.resolveIsvAppRef?.(r)).filter(Boolean);
    out.push({ modelCode, firmwares, pep, systemApps, isvApps });
  }
  return out;
};

// Firmware version name for the list + detail header.
const factoryImageFirmwareVersionName = (fi) => {
  const b = factoryImageBundle(fi);
  const r = b && window.resolveFirmwareRef?.((b.firmwareRefs || [])[0]);
  return r?.version?.versionName || null;
};

// PEP version name for the list + detail header.
const factoryImagePepVersionName = (fi) => {
  const b = factoryImageBundle(fi);
  const r = b?.pepRef ? window.resolvePepRef?.(b.pepRef) : null;
  return r?.version?.name || null;
};

// Total package count = firmware(s) + PEP (1 if present) + system + ISV apps.
const factoryImageTotalPackageCount = (fi) => {
  const b = factoryImageBundle(fi);
  if (!b) return 0;
  return (b.firmwareRefs || []).length
    + (b.pepRef ? 1 : 0)
    + (b.systemAppRefs || []).length
    + (b.isvAppRefs    || []).length;
};

// Total size across firmware + PEP + system + ISV apps.
const factoryImageTotalSize = (fi) => {
  const b = factoryImageBundle(fi);
  if (!b) return 0;
  let bytes = 0;
  for (const ref of (b.firmwareRefs || [])) {
    const r = window.resolveFirmwareRef?.(ref);
    if (r?.version?.fileSizeBytes) bytes += r.version.fileSizeBytes;
  }
  if (b.pepRef) {
    const r = window.resolvePepRef?.(b.pepRef);
    if (r?.version?.size) bytes += __parseSize(r.version.size);
  }
  for (const ref of (b.systemAppRefs || [])) {
    const r = window.resolveSystemAppRef?.(ref);
    if (r?.version?.size) bytes += __parseSize(r.version.size);
  }
  for (const ref of (b.isvAppRefs || [])) {
    const r = window.resolveIsvAppRef?.(ref);
    if (r?.version?.size) bytes += __parseSize(r.version.size);
  }
  return bytes;
};

function __parseSize(s) {
  const m = String(s).match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  return n * (u === 'KB' ? 1024 : u === 'MB' ? 1024*1024 : 1024*1024*1024);
}

// All known model codes — pulled from the firmware seed (firmware is the
// model-binding source of truth). Drives the per-image model picker.
const getFactoryImageKnownModels = () => {
  const set = new Set();
  for (const fw of (window.SEED_FIRMWARE || [])) {
    if (fw.modelCode) set.add(fw.modelCode);
  }
  return [...set].sort();
};

// The firmware record for a model — drives the firmware-version dropdown.
const getFactoryImageFirmwareForModel = (modelCode) =>
  (window.SEED_FIRMWARE || []).find(f => f.modelCode === modelCode) || null;

// ── Docker-style naming ─────────────────────────────────
// Format: label-model-version (3 segments joined by '-').
//   • label   — any identifier (often a customer / ISO name). Spaces allowed
//               inside, but no leading/trailing space.
//   • model   — the device model code (auto-filled).
//   • version — the firmware version name (auto-filled).
// Rules: exactly 3 non-empty segments, none with leading/trailing space,
//        total length ≤ 128.
//   e.g. "Acme Retail-N950-V2.3.1", "Pinegate Apparel-CPOS X5-V1.1.10"
const FI_NAME_MAX = 128;

const composeFactoryImageName = (label, model, version) =>
  `${(label || '').trim() ? label : ''}-${model || ''}-${version || ''}`;

const isValidFactoryImageName = (name) => {
  if (typeof name !== 'string') return false;
  if (name.length === 0 || name.length > FI_NAME_MAX) return false;
  const parts = name.split('-');
  if (parts.length !== 3) return false;
  return parts.every(p => p.length > 0 && p === p.trim());
};

// Compact byte formatter shared by the factory-images screens.
const fmtBytes = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

Object.assign(window, {
  FI_PEP_APP_ID, FI_PEP_PACKAGE, FI_NAME_MAX,
  findFactoryImageById,
  factoryImageModelCode, factoryImageBundle,
  factoryImageTotalPackageCount, factoryImageTotalSize,
  factoryImageFirmwareVersionName, factoryImagePepVersionName,
  resolveFactoryImagePayload, getFactoryImageKnownModels, getFactoryImageFirmwareForModel,
  resolveFirmwareRef, resolvePepRef, resolveSystemAppRef, resolveIsvAppRef,
  factoryImageSystemAppCatalog, getFactoryImagePepApp,
  composeFactoryImageName, isValidFactoryImageName,
  fmtBytes,
});
