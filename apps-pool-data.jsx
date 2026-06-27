/* global React */
// =====================================================================
// apps-pool-data.jsx — Mock data for the App Pool model (4-table model:
// APPLICATIONS · APPLICATION_VERSIONS · PARTNER_APPLICATION ·
// PARTNER_APPLICATION_VERSION) plus the two not-yet-formalized tables
// the Merchant detail's Apps tab depends on:
//   · MERCHANT_APPLICATION       — which apps an ISO has provisioned
//                                  to a specific Merchant customer
//   · DEVICE_INSTALLED_APP /
//     DEVICE_APP_STRATEGY        — per-terminal install state + update
//                                  strategy (supports per-terminal AND
//                                  bulk-across-terminals patterns)
//
// All data is read-only mock — `window.AppPool` exposes both the raw
// tables and helper accessors the customer-detail Apps tab consumes.
// Loaded AFTER merchants-data.jsx so the terminal SNs we generate
// can pull from window.findMerchantByCustomerId().
// =====================================================================

(function seedAppPool() {
  if (typeof window === 'undefined') return;
  if (window.AppPool) return; // idempotent

  // ─── APP_CATEGORY (taxonomy) ───────────────────────────────
  const SEED_APP_CATEGORIES = [
    { id: 'cat-payment',  name: 'PAYMENT'         },
    { id: 'cat-retail',   name: 'RETAIL'          },
    { id: 'cat-fb',       name: 'Food & Beverage' },
    { id: 'cat-hosp',     name: 'Hospitality'     },
    { id: 'cat-loyalty',  name: 'Loyalty'         },
    { id: 'cat-ops',      name: 'Operations'      },
  ];

  // ─── APPLICATIONS ──────────────────────────────────────────
  // Each row = an ISV-published app. PARTNER ID points to the ISV
  // entity (must hold an ISV contract). LATEST APP VERSION ID lags
  // APPLICATION_VERSIONS' newest published row for that pkg.
  const SEED_APPLICATIONS = [
    {
      id: 'app-pos-pro', partnerId: 'c-001',
      pkgName: 'com.northwind.pos.pro', appName: 'Northwind POS Pro',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'PAYMENT',
      description: {
        defaultLang: 'en_US',
        en_US: 'Full-featured point of sale with split tender, refunds, and offline queueing.',
        zh_CN: '完整收银台 · 分单 · 退款 · 离线队列。',
      },
      countrys: [], // empty = all countries
      latestAppVersionId: 'appv-pos-pro-4-3-2',
      publishMode: 'PUBLIC',
      downloadCount: 84212,
      status: 'PUBLISHED',
    },
    {
      id: 'app-smart-receipt', partnerId: 'c-001',
      pkgName: 'com.northwind.smartreceipt', appName: 'Smart Receipt',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'PAYMENT',
      description: {
        defaultLang: 'en_US',
        en_US: 'Digital receipts via email and QR code, customer-side opt-in.',
      },
      countrys: [],
      latestAppVersionId: 'appv-smart-receipt-1-1-8',
      publishMode: 'PUBLIC',
      downloadCount: 23904,
      status: 'PUBLISHED',
    },
    {
      id: 'app-loyalty-plus', partnerId: 'c-002',
      pkgName: 'com.helios.loyaltyplus', appName: 'Loyalty+',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'Loyalty',
      description: {
        defaultLang: 'en_US',
        en_US: 'Points, tiers, and offers wired into the cart total.',
      },
      countrys: [],
      latestAppVersionId: 'appv-loyalty-plus-1-3-4',
      publishMode: 'PUBLIC',
      downloadCount: 17428,
      status: 'PUBLISHED',
    },
    {
      id: 'app-curbside', partnerId: 'c-002',
      pkgName: 'com.helios.curbside', appName: 'Curbside',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'RETAIL',
      description: {
        defaultLang: 'en_US',
        en_US: 'Curbside pickup queue + handoff signing.',
      },
      countrys: [],
      latestAppVersionId: 'appv-curbside-0-9-0',
      publishMode: 'PRIVATE',
      downloadCount: 4811,
      status: 'PUBLISHED',
    },
    {
      id: 'app-insights', partnerId: 'c-004',
      pkgName: 'com.vanta.insights', appName: 'Insights',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'Operations',
      description: {
        defaultLang: 'en_US',
        en_US: 'Per-store and per-terminal analytics dashboard.',
      },
      countrys: [],
      latestAppVersionId: 'appv-insights-1-2-0',
      publishMode: 'PUBLIC',
      downloadCount: 9420,
      status: 'PUBLISHED',
    },
    {
      id: 'app-timeclock', partnerId: 'c-004',
      pkgName: 'com.vanta.timeclock', appName: 'Timeclock',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'Operations',
      description: {
        defaultLang: 'en_US',
        en_US: 'Staff clock-in/clock-out with shift summary.',
      },
      countrys: [],
      latestAppVersionId: 'appv-timeclock-2-0-5',
      publishMode: 'PUBLIC',
      downloadCount: 14302,
      status: 'PUBLISHED',
    },
    {
      id: 'app-tablefire', partnerId: 'c-011',
      pkgName: 'com.westport.tablefire', appName: 'TableFire KDS',
      logoUrl: null,
      supportOs: ['ANDROID'],
      category: 'Food & Beverage',
      description: {
        defaultLang: 'en_US',
        en_US: 'Kitchen display system for restaurant terminals.',
      },
      countrys: [],
      latestAppVersionId: 'appv-tablefire-3-1-0',
      publishMode: 'PUBLIC',
      downloadCount: 6204,
      status: 'PUBLISHED',
    },
  ];

  // ─── APPLICATION_VERSIONS ──────────────────────────────────
  // 2-3 versions per app. permissions/scanInfo/release/ordinaryFileInfo
  // schemas mirror the spec; values are illustrative.
  const _permTone = (count, level) => Array.from({ length: count }, (_, i) => ({
    permission: `permission.demo_${level}_${i + 1}`,
    riskLevel: level,
    description: `Demo ${level.toLowerCase()}-risk permission #${i + 1}`,
  }));
  const _file = (md5 = 'd4e28a7c91f0', size = 27_500_000, name = 'app.apk') => ({
    name, md5, fileSize: size, googleCertCn: 'Newland Payment Technology US Co., Ltd.',
    path: `s3://carbon-app-pool/${md5.slice(0, 8)}/${name}`,
  });
  const _scan = (high, medium, secure, info, score, ts) => ({
    scanStatus: 1, scanStartTimestamp: ts, scanFinishedTimestamp: ts,
    report: {
      path: `s3://carbon-app-scans/r-${ts.slice(0,10)}.json`,
      bucketId: 'carbon-app-scans',
      secureCount: secure, infoCount: info,
      mediumCount: medium, highCount: high,
      securityScore: score,
    },
  });
  const _release = (log) => ({
    defaultLang: { log, screenshots: [] },
    en_US: { log, screenshots: [] },
  });

  const SEED_APP_VERSIONS = [
    // ── Northwind POS Pro
    { id: 'appv-pos-pro-4-3-2', pkgName: 'com.northwind.pos.pro', appName: 'Northwind POS Pro',
      uploadUserId: 'u-c001-1', logoUrl: null,
      versionCode: 1432, versionName: '4.3.2',
      permissions: [..._permTone(2, 'HIGH'), ..._permTone(7, 'MEDIUM'), ..._permTone(9, 'LOW')],
      scanInfo: _scan(0, 2, 14, 6, 92, '2026-05-09T10:14:00Z'),
      release: _release('### 4.3.2\n- Fix EMV fallback bug on N750P\n- Add tip-suggestion presets\n- Backoff retry on offline queue (exponential)'),
      ordinaryFileInfo: _file('d4e28a7c91f0', 28_400_000, 'pos_pro_4_3_2.apk'),
      downloadCount: 12471,
      status: 'PUBLISHED',
    },
    { id: 'appv-pos-pro-4-3-1', pkgName: 'com.northwind.pos.pro', appName: 'Northwind POS Pro',
      uploadUserId: 'u-c001-1', logoUrl: null,
      versionCode: 1431, versionName: '4.3.1',
      permissions: [..._permTone(2, 'HIGH'), ..._permTone(7, 'MEDIUM'), ..._permTone(9, 'LOW')],
      scanInfo: _scan(0, 3, 14, 6, 89, '2026-04-22T09:00:00Z'),
      release: _release('### 4.3.1\n- Patch: Bluetooth pinpad pairing timeout'),
      ordinaryFileInfo: _file('a91c33d18811', 28_100_000, 'pos_pro_4_3_1.apk'),
      downloadCount: 8211,
      status: 'PUBLISHED',
    },
    // ── Smart Receipt
    { id: 'appv-smart-receipt-1-1-8', pkgName: 'com.northwind.smartreceipt', appName: 'Smart Receipt',
      uploadUserId: 'u-c001-2', logoUrl: null,
      versionCode: 118, versionName: '1.1.8',
      permissions: [..._permTone(1, 'HIGH'), ..._permTone(4, 'MEDIUM'), ..._permTone(5, 'LOW')],
      scanInfo: _scan(0, 1, 8, 3, 95, '2026-03-12T15:00:00Z'),
      release: _release('### 1.1.8\n- QR receipt page layout fix on portrait terminals\n- Email throughput +30%'),
      ordinaryFileInfo: _file('77b201ea5044', 6_100_000, 'smart_receipt_1_1_8.apk'),
      downloadCount: 4011,
      status: 'PUBLISHED',
    },
    // ── Loyalty+
    { id: 'appv-loyalty-plus-1-3-4', pkgName: 'com.helios.loyaltyplus', appName: 'Loyalty+',
      uploadUserId: 'u-c002-1', logoUrl: null,
      versionCode: 134, versionName: '1.3.4',
      permissions: [..._permTone(1, 'HIGH'), ..._permTone(5, 'MEDIUM'), ..._permTone(7, 'LOW')],
      scanInfo: _scan(0, 2, 10, 4, 90, '2026-04-20T11:00:00Z'),
      release: _release('### 1.3.4\n- Tier downgrade grace period\n- Apple Wallet pass refresh'),
      ordinaryFileInfo: _file('b41dd9c83100', 12_300_000, 'loyaltyplus_1_3_4.apk'),
      downloadCount: 3221,
      status: 'PUBLISHED',
    },
    { id: 'appv-loyalty-plus-1-3-2', pkgName: 'com.helios.loyaltyplus', appName: 'Loyalty+',
      uploadUserId: 'u-c002-1', logoUrl: null,
      versionCode: 132, versionName: '1.3.2',
      permissions: [..._permTone(1, 'HIGH'), ..._permTone(5, 'MEDIUM'), ..._permTone(7, 'LOW')],
      scanInfo: _scan(0, 3, 9, 4, 87, '2026-03-08T09:00:00Z'),
      release: _release('### 1.3.2\n- Bug fixes'),
      ordinaryFileInfo: _file('8e2f4011b022', 12_000_000, 'loyaltyplus_1_3_2.apk'),
      downloadCount: 1980,
      status: 'PUBLISHED',
    },
    // ── Curbside
    { id: 'appv-curbside-0-9-0', pkgName: 'com.helios.curbside', appName: 'Curbside',
      uploadUserId: 'u-c002-1', logoUrl: null,
      versionCode: 90, versionName: '0.9.0-beta',
      permissions: [..._permTone(2, 'HIGH'), ..._permTone(3, 'MEDIUM'), ..._permTone(4, 'LOW')],
      scanInfo: _scan(1, 2, 6, 3, 78, '2026-05-12T14:00:00Z'),
      release: _release('### 0.9.0-beta\n- Beta: handoff signing on tablet kiosk'),
      ordinaryFileInfo: _file('2c01d4880917', 9_400_000, 'curbside_0_9_0_beta.apk'),
      downloadCount: 312,
      status: 'PUBLISHED',
    },
    // ── Insights
    { id: 'appv-insights-1-2-0', pkgName: 'com.vanta.insights', appName: 'Insights',
      uploadUserId: 'u-c004-1', logoUrl: null,
      versionCode: 120, versionName: '1.2.0',
      permissions: [..._permTone(0, 'HIGH'), ..._permTone(2, 'MEDIUM'), ..._permTone(6, 'LOW')],
      scanInfo: _scan(0, 1, 11, 5, 96, '2026-04-12T10:00:00Z'),
      release: _release('### 1.2.0\n- Per-terminal hourly comparison view\n- Export to CSV'),
      ordinaryFileInfo: _file('a45fe09f1188', 15_800_000, 'insights_1_2_0.apk'),
      downloadCount: 2280,
      status: 'PUBLISHED',
    },
    { id: 'appv-insights-1-1-3', pkgName: 'com.vanta.insights', appName: 'Insights',
      uploadUserId: 'u-c004-1', logoUrl: null,
      versionCode: 113, versionName: '1.1.3',
      permissions: [..._permTone(0, 'HIGH'), ..._permTone(2, 'MEDIUM'), ..._permTone(6, 'LOW')],
      scanInfo: _scan(0, 1, 11, 5, 94, '2026-02-22T10:00:00Z'),
      release: _release('### 1.1.3\n- Cohort filter UX tweaks'),
      ordinaryFileInfo: _file('77eaa12c3300', 15_400_000, 'insights_1_1_3.apk'),
      downloadCount: 1610,
      status: 'PUBLISHED',
    },
    // ── Timeclock
    { id: 'appv-timeclock-2-0-5', pkgName: 'com.vanta.timeclock', appName: 'Timeclock',
      uploadUserId: 'u-c004-1', logoUrl: null,
      versionCode: 205, versionName: '2.0.5',
      permissions: [..._permTone(0, 'HIGH'), ..._permTone(3, 'MEDIUM'), ..._permTone(5, 'LOW')],
      scanInfo: _scan(0, 0, 9, 4, 98, '2026-04-21T08:00:00Z'),
      release: _release('### 2.0.5\n- PIN entry hardening\n- Shift summary PDF'),
      ordinaryFileInfo: _file('e2a008be9911', 8_200_000, 'timeclock_2_0_5.apk'),
      downloadCount: 4912,
      status: 'PUBLISHED',
    },
    // ── TableFire KDS
    { id: 'appv-tablefire-3-1-0', pkgName: 'com.westport.tablefire', appName: 'TableFire KDS',
      uploadUserId: 'u-c011-1', logoUrl: null,
      versionCode: 310, versionName: '3.1.0',
      permissions: [..._permTone(1, 'HIGH'), ..._permTone(4, 'MEDIUM'), ..._permTone(6, 'LOW')],
      scanInfo: _scan(0, 2, 9, 4, 91, '2026-04-30T12:00:00Z'),
      release: _release('### 3.1.0\n- Bump rail orientation\n- Sound profile per station'),
      ordinaryFileInfo: _file('19abf32f4400', 22_700_000, 'tablefire_3_1_0.apk'),
      downloadCount: 1881,
      status: 'PUBLISHED',
    },
  ];

  // ─── PARTNER_APPLICATION ───────────────────────────────────
  // Each ISO (subscriberPartnerId) has a catalog of apps — either
  // UPLOAD (self-published, only if the ISO also holds ISV contract,
  // e.g. c-001 Northwind, c-002 Helios) or SUBSCRIPTION.
  //
  // We seed catalogs for the 3 authorizing ISOs of our 5 MERCHANT
  // customers: c-001, c-002, c-003.
  const _today = () => new Date().toISOString();
  const SEED_PARTNER_APPLICATIONS = [
    // ── c-001 Northwind (also ISV) — uploads its own POS + Smart Receipt
    { id: 'pa-c001-pos',    subscriberPartnerId: 'c-001', appId: 'app-pos-pro',
      pkgName: 'com.northwind.pos.pro', paymentFlag: true,
      latestVersionId: 'appv-pos-pro-4-3-2',
      source: 'UPLOAD',
      subscribeUserId: null, subscribeUserName: null, subscribeTimestamp: null,
      notifications: [], // upload rows skip notifications (you publish your own)
      downloadCount: 8221, status: 'ACTIVE' },
    { id: 'pa-c001-receipt',subscriberPartnerId: 'c-001', appId: 'app-smart-receipt',
      pkgName: 'com.northwind.smartreceipt', paymentFlag: true,
      latestVersionId: 'appv-smart-receipt-1-1-8',
      source: 'UPLOAD',
      subscribeUserId: null, subscribeUserName: null, subscribeTimestamp: null,
      notifications: [],
      downloadCount: 3211, status: 'ACTIVE' },
    { id: 'pa-c001-insights',subscriberPartnerId: 'c-001', appId: 'app-insights',
      pkgName: 'com.vanta.insights', paymentFlag: false,
      latestVersionId: 'appv-insights-1-2-0',
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c001-1', subscribeUserName: 'Sarah Chen',
      subscribeTimestamp: '2026-04-13T10:11:00Z',
      notifications: [{ method: ['in-app', 'email'], target: ['u-c001-1', 'u-c001-3'] }],
      downloadCount: 980, status: 'ACTIVE' },
    { id: 'pa-c001-loyalty',subscriberPartnerId: 'c-001', appId: 'app-loyalty-plus',
      pkgName: 'com.helios.loyaltyplus', paymentFlag: false,
      latestVersionId: 'appv-loyalty-plus-1-3-4',
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c001-1', subscribeUserName: 'Sarah Chen',
      subscribeTimestamp: '2026-04-21T15:30:00Z',
      notifications: [{ method: ['in-app'], target: ['u-c001-1'] }],
      downloadCount: 712, status: 'ACTIVE' },

    // ── c-002 Helios (also ISV) — uploads Loyalty+ + Curbside
    { id: 'pa-c002-loyalty',subscriberPartnerId: 'c-002', appId: 'app-loyalty-plus',
      pkgName: 'com.helios.loyaltyplus', paymentFlag: false,
      latestVersionId: 'appv-loyalty-plus-1-3-4',
      source: 'UPLOAD',
      subscribeUserId: null, subscribeUserName: null, subscribeTimestamp: null,
      notifications: [],
      downloadCount: 6210, status: 'ACTIVE' },
    { id: 'pa-c002-curbside',subscriberPartnerId: 'c-002', appId: 'app-curbside',
      pkgName: 'com.helios.curbside', paymentFlag: false,
      latestVersionId: 'appv-curbside-0-9-0',
      source: 'UPLOAD',
      subscribeUserId: null, subscribeUserName: null, subscribeTimestamp: null,
      notifications: [],
      downloadCount: 480, status: 'ACTIVE' },
    { id: 'pa-c002-receipt',subscriberPartnerId: 'c-002', appId: 'app-smart-receipt',
      pkgName: 'com.northwind.smartreceipt', paymentFlag: true,
      latestVersionId: 'appv-smart-receipt-1-1-8',
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c002-1', subscribeUserName: 'Elena Rossi',
      subscribeTimestamp: '2026-04-25T09:00:00Z',
      notifications: [{ method: ['email'], target: ['u-c002-1'] }],
      downloadCount: 145, status: 'ACTIVE' },

    // ── c-003 Brightleaf (ISO-only) — pure subscriber
    { id: 'pa-c003-pos',    subscriberPartnerId: 'c-003', appId: 'app-pos-pro',
      pkgName: 'com.northwind.pos.pro', paymentFlag: true,
      latestVersionId: 'appv-pos-pro-4-3-1', // approved one behind upstream — demo case
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c003-1', subscribeUserName: 'Henry Tremblay',
      subscribeTimestamp: '2025-08-01T12:00:00Z',
      notifications: [{ method: ['in-app', 'email'], target: ['u-c003-1', 'u-c003-2'] }],
      downloadCount: 1340, status: 'ACTIVE' },
    { id: 'pa-c003-timeclock',subscriberPartnerId: 'c-003', appId: 'app-timeclock',
      pkgName: 'com.vanta.timeclock', paymentFlag: false,
      latestVersionId: 'appv-timeclock-2-0-5',
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c003-1', subscribeUserName: 'Henry Tremblay',
      subscribeTimestamp: '2026-04-22T14:00:00Z',
      notifications: [{ method: ['in-app'], target: ['u-c003-1'] }],
      downloadCount: 820, status: 'ACTIVE' },
    { id: 'pa-c003-tablefire',subscriberPartnerId: 'c-003', appId: 'app-tablefire',
      pkgName: 'com.westport.tablefire', paymentFlag: false,
      latestVersionId: 'appv-tablefire-3-1-0',
      source: 'SUBSCRIPTION',
      subscribeUserId: 'u-c003-2', subscribeUserName: 'Jasmine Park',
      subscribeTimestamp: '2026-05-02T10:00:00Z',
      notifications: [{ method: ['in-app'], target: ['u-c003-1', 'u-c003-2'] }],
      downloadCount: 380, status: 'ACTIVE' },
  ];

  // ─── PARTNER_APPLICATION_VERSION ────────────────────────────
  // Each row = the partner-side approval/subscription decision for a
  // specific upstream APP VERSION. SKIP rows demonstrate "I saw this
  // version but chose not to take it".
  const _sig = (md5, pci, size) => ({
    certCn: 'NPT Carbon Sign · TOMS Subscribe Bundle',
    md5, pciVersion: pci, fileSize: size,
    path: `s3://carbon-app-pool-signed/${md5.slice(0, 8)}.apk`,
  });
  const SEED_PARTNER_APP_VERSIONS = [
    // c-001 (UPLOAD rows — no approval needed)
    { id: 'pav-c001-pos-432',     partnerAppId: 'pa-c001-pos',     pkgName: 'com.northwind.pos.pro',
      appVersionId: 'appv-pos-pro-4-3-2',     versionName: '4.3.2', versionCode: 1432,
      approvalUserId: null, approvalUserName: null, approvalTimestamp: null,
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-05-09T10:14:00Z',
      nptSignature: [_sig('d4e28a7c91f0', 'PCI6+7', 28_400_000)],
      downloadCount: 12471 },
    { id: 'pav-c001-receipt-118', partnerAppId: 'pa-c001-receipt', pkgName: 'com.northwind.smartreceipt',
      appVersionId: 'appv-smart-receipt-1-1-8', versionName: '1.1.8', versionCode: 118,
      approvalUserId: null, approvalUserName: null, approvalTimestamp: null,
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-03-12T15:00:00Z',
      nptSignature: [_sig('77b201ea5044', 'PCI7', 6_100_000)],
      downloadCount: 4011 },
    { id: 'pav-c001-insights-120', partnerAppId: 'pa-c001-insights', pkgName: 'com.vanta.insights',
      appVersionId: 'appv-insights-1-2-0',    versionName: '1.2.0', versionCode: 120,
      approvalUserId: 'u-c001-1', approvalUserName: 'Sarah Chen',
      approvalTimestamp: '2026-04-13T10:18:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-13T10:18:00Z',
      nptSignature: [_sig('a45fe09f1188', 'PCI7', 15_800_000)],
      downloadCount: 980 },
    { id: 'pav-c001-loyalty-134', partnerAppId: 'pa-c001-loyalty', pkgName: 'com.helios.loyaltyplus',
      appVersionId: 'appv-loyalty-plus-1-3-4', versionName: '1.3.4', versionCode: 134,
      approvalUserId: 'u-c001-1', approvalUserName: 'Sarah Chen',
      approvalTimestamp: '2026-04-21T15:36:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-21T15:36:00Z',
      nptSignature: [_sig('b41dd9c83100', 'PCI7', 12_300_000)],
      downloadCount: 712 },

    // c-002 (UPLOAD + 1 subscribe)
    { id: 'pav-c002-loyalty-134', partnerAppId: 'pa-c002-loyalty', pkgName: 'com.helios.loyaltyplus',
      appVersionId: 'appv-loyalty-plus-1-3-4', versionName: '1.3.4', versionCode: 134,
      approvalUserId: null, approvalUserName: null, approvalTimestamp: null,
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-20T11:00:00Z',
      nptSignature: [_sig('b41dd9c83100', 'PCI7', 12_300_000)],
      downloadCount: 6210 },
    { id: 'pav-c002-curbside-090',partnerAppId: 'pa-c002-curbside', pkgName: 'com.helios.curbside',
      appVersionId: 'appv-curbside-0-9-0',    versionName: '0.9.0-beta', versionCode: 90,
      approvalUserId: null, approvalUserName: null, approvalTimestamp: null,
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-05-12T14:00:00Z',
      nptSignature: [_sig('2c01d4880917', 'PCI7', 9_400_000)],
      downloadCount: 480 },
    { id: 'pav-c002-receipt-118', partnerAppId: 'pa-c002-receipt', pkgName: 'com.northwind.smartreceipt',
      appVersionId: 'appv-smart-receipt-1-1-8', versionName: '1.1.8', versionCode: 118,
      approvalUserId: 'u-c002-1', approvalUserName: 'Elena Rossi',
      approvalTimestamp: '2026-04-25T09:08:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-25T09:08:00Z',
      nptSignature: [_sig('77b201ea5044', 'PCI7', 6_100_000)],
      downloadCount: 145 },

    // c-003 — POS Pro pinned at 4.3.1 (skipped 4.3.2)
    { id: 'pav-c003-pos-431',     partnerAppId: 'pa-c003-pos',     pkgName: 'com.northwind.pos.pro',
      appVersionId: 'appv-pos-pro-4-3-1',     versionName: '4.3.1', versionCode: 1431,
      approvalUserId: 'u-c003-1', approvalUserName: 'Henry Tremblay',
      approvalTimestamp: '2026-04-23T11:00:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-23T11:00:00Z',
      nptSignature: [_sig('a91c33d18811', 'PCI6+7', 28_100_000)],
      downloadCount: 1340 },
    { id: 'pav-c003-pos-432-skip',partnerAppId: 'pa-c003-pos',     pkgName: 'com.northwind.pos.pro',
      appVersionId: 'appv-pos-pro-4-3-2',     versionName: '4.3.2', versionCode: 1432,
      approvalUserId: 'u-c003-1', approvalUserName: 'Henry Tremblay',
      approvalTimestamp: '2026-05-11T09:00:00Z',
      status: 'SKIP',
      creationTimestamp: '2026-05-11T09:00:00Z',
      nptSignature: [],
      downloadCount: 0 },
    { id: 'pav-c003-timeclock-205',partnerAppId: 'pa-c003-timeclock', pkgName: 'com.vanta.timeclock',
      appVersionId: 'appv-timeclock-2-0-5',    versionName: '2.0.5', versionCode: 205,
      approvalUserId: 'u-c003-1', approvalUserName: 'Henry Tremblay',
      approvalTimestamp: '2026-04-22T14:08:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-04-22T14:08:00Z',
      nptSignature: [_sig('e2a008be9911', 'PCI7', 8_200_000)],
      downloadCount: 820 },
    { id: 'pav-c003-tablefire-310',partnerAppId: 'pa-c003-tablefire', pkgName: 'com.westport.tablefire',
      appVersionId: 'appv-tablefire-3-1-0',    versionName: '3.1.0', versionCode: 310,
      approvalUserId: 'u-c003-2', approvalUserName: 'Jasmine Park',
      approvalTimestamp: '2026-05-02T10:08:00Z',
      status: 'SUBSCRIPTION',
      creationTimestamp: '2026-05-02T10:08:00Z',
      nptSignature: [_sig('19abf32f4400', 'PCI7', 22_700_000)],
      downloadCount: 380 },
  ];

  // ─── DEVICE_APPLICATION ─────────────────────────────────────
  // Per-device row matching the corrected model:
  //   { id, deviceSn,
  //     installedApps[]   — what the terminal reports it has
  //     syncTimestamp     — when installedApps was last updated
  //     requestApps[]     — what the ISO configured for this terminal,
  //                         each with embedded STRATEGY
  //   }
  // DIFF_APPS is intentionally NOT seeded — derived at render time by
  // walking requestApps against installedApps (spec rule).

  const _strat = (urgency, network, upgradeTime, cellCap, windows) => ({
    upgradeStrategy: urgency,        // 'casual' | 'immediate' | 'custom'
    networkRequest:  network,        // 'noRestriction' | 'wifiOrEthernet' | 'wifiOrEthernetOrCellularUnderCap'
    upgradeTime:     upgradeTime,    // 'immediate' | 'onTheNextBoot' | 'nextBootOrAfter10MinIdle' | 'sc'
    cellularCap:     cellCap,        // MB, only meaningful with cellular network mode
    installWindows:  windows,        // [{ start, end }] — device-local time, no cross-midnight
  });
  const _win = (...ranges) => ranges.map(([start, end]) => ({ start, end }));

  const STRAT_CASUAL_NIGHT  = _strat('casual',    'wifiOrEthernet',                  'sc',                   null, _win(['02:00','04:00']));
  const STRAT_CASUAL_ANY    = _strat('casual',    'noRestriction',                   'onTheNextBoot',        null, []);
  const STRAT_CASUAL_WIRED  = _strat('casual',    'wifiOrEthernet',                  'sc',                   null, []);
  const STRAT_IMMEDIATE_ANY = _strat('immediate', 'noRestriction',                   'immediate',            null, []);
  const STRAT_CUSTOM_CAP    = _strat('custom',    'wifiOrEthernetOrCellularUnderCap','nextBootOrAfter10MinIdle', 200, _win(['22:00','01:00']));

  // Which apps + strategies the ISO has configured for each MERCHANT customer.
  // Same shape for every terminal in that merchant — strategy on REQUEST_APPS
  // is per terminal, but in this mock we use the merchant-level preset.
  const _MERCHANT_APP_CONFIG = {
    'c-007': [ // Bluefin Market — under c-001 Northwind
      { pav: 'pav-c001-pos-432',     strategy: STRAT_CASUAL_NIGHT },
      { pav: 'pav-c001-receipt-118', strategy: STRAT_CASUAL_ANY },
      { pav: 'pav-c001-loyalty-134', strategy: STRAT_CUSTOM_CAP },
    ],
    'c-008': [ // Pinegate Apparel — under c-002 Helios
      { pav: 'pav-c002-loyalty-134', strategy: STRAT_CASUAL_WIRED },
      { pav: 'pav-c002-receipt-118', strategy: STRAT_CASUAL_WIRED },
    ],
    'c-010': [ // Sandstone Bistro — under c-003 Brightleaf
      { pav: 'pav-c003-pos-431',       strategy: STRAT_CASUAL_NIGHT },
      { pav: 'pav-c003-tablefire-310', strategy: STRAT_IMMEDIATE_ANY },
      { pav: 'pav-c003-timeclock-205', strategy: STRAT_CASUAL_WIRED },
    ],
    'c-013': [ // Sunbreak Cafe Group — under c-001 Northwind
      { pav: 'pav-c001-pos-432',      strategy: STRAT_CASUAL_NIGHT },
      { pav: 'pav-c001-receipt-118',  strategy: STRAT_CASUAL_ANY },
      { pav: 'pav-c001-loyalty-134',  strategy: STRAT_CUSTOM_CAP },
      { pav: 'pav-c001-insights-120', strategy: STRAT_CASUAL_WIRED },
    ],
    'c-014': [ // Stonefield Auto Parts — under c-003 Brightleaf
      { pav: 'pav-c003-pos-431',       strategy: STRAT_CASUAL_NIGHT },
      { pav: 'pav-c003-timeclock-205', strategy: STRAT_CASUAL_WIRED },
    ],
  };

  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff; return h; };
  const _bumpDown = (versionName) => {
    const m = String(versionName).match(/^(.*?)(\d+)$/);
    return m ? `${m[1]}${Math.max(0, parseInt(m[2], 10) - 1)}` : versionName;
  };

  // Bare-minimum event factory — used by the per-device seed loop below.
  const _ev = (sn, ms, label, req, type, dur = null, descSuffix = null) => ({
    id: `dev-ev-${sn}-${type}-${ms}`,
    deviceSn: sn,
    eventType: type,                 // 'app_download_started' | 'app_download_succeeded' | 'app_download_failed' | 'app_install_succeeded' | 'app_install_failed' | 'user_postponed_upgrade' | 'user_confirmed_upgrade' | 'app_uninstalled' | 'firmware_sync_succeeded'
    eventTypeLabel: label,           // human label, matches the Chinese enum in the spec
    pkgName: req.pkgName,
    versionName: req.versionName,
    eventTime: new Date(ms).toISOString(),
    eventDuration: dur,
    description: descSuffix ? `${label} · ${descSuffix}` : label,
    target1: req.pkgName,
    target2: req._appName || null,
    target3: req.versionName,
  });

  const SEED_DEVICE_APPLICATIONS = [];
  const SEED_DEVICE_EVENTS = [];

  // Resolve a config entry ({ pav, strategy }) into a concrete REQUEST_APPS row.
  function _resolveRequestApp(cfg) {
    const pav = SEED_PARTNER_APP_VERSIONS.find((v) => v.id === cfg.pav);
    if (!pav) return null;
    const av = SEED_APP_VERSIONS.find((v) => v.id === pav.appVersionId) || null;
    return {
      pkgName:         pav.pkgName,
      appVersionId:    pav.appVersionId,
      versionCode:     pav.versionCode,
      versionName:     pav.versionName,
      configTimestamp: '2026-05-08T10:00:00Z',
      strategy:        cfg.strategy,
      _appName:        av?.appName || pav.pkgName, // mock-only display helper
    };
  }

  // Single per-terminal synthesis used by BOTH the merchant loop and the
  // deferred fleet pass — keeps DEVICE_APPLICATION / DEVICE_EVENT a single
  // source of truth (no per-screen divergence). Pushes into the two SEED
  // arrays and returns the device-app record.
  function _synthDeviceApp({ sn, requestApps, hashKey, merchantEntityId, store, idx = 0 }) {
    const h = hash(hashKey);
    // Deterministic outcome buckets so the demo data spans every state.
    //   r 0..63  → all OK
    //   r 64..78 → 1 stale (needs upgrade)
    //   r 79..86 → 1 missing (not installed)
    //   r 87..91 → 1 failed (install failure event)
    //   r 92..95 → 1 downloading (download in flight)
    //   r 96..99 → never synced
    const r = h % 100;
    const everSynced = r < 96;
    const installState = !everSynced ? 'never'
      : r < 64 ? 'allOk'
      : r < 79 ? 'stale'
      : r < 87 ? 'missing'
      : r < 92 ? 'failed'
      : 'downloading';
    const offIdx = requestApps.length === 0 ? -1 : h % requestApps.length;

    const baseMs = Date.parse('2026-05-12T08:00:00Z');
    const dayMs = 24 * 60 * 60 * 1000;
    const installedApps = [];
    const events = [];

    requestApps.forEach((req, ai) => {
      if (!everSynced) return;

      let inst = {
        pkgName:               req.pkgName,
        appName:               req._appName,
        versionCode:           req.versionCode,
        versionName:           req.versionName,
        installationTimestamp: new Date(baseMs - (3 + ai) * dayMs).toISOString(),
        isUninstallable:       false,
        isAutoStartOnBoot:     ai === 0,
        isKioskMode:           ai === 0,
        isAppLaunchDisabled:   false,
        isLauncherIconHidden:  false,
      };

      if (ai === offIdx) {
        if (installState === 'stale') {
          inst = { ...inst, versionCode: req.versionCode - 1, versionName: _bumpDown(req.versionName) };
          events.push(_ev(sn, baseMs - 0.4 * dayMs, '应用开始下载', req, 'app_download_started'));
        } else if (installState === 'missing') {
          inst = null;
          events.push(_ev(sn, baseMs - 0.25 * dayMs, '应用开始下载', req, 'app_download_started'));
        } else if (installState === 'failed') {
          inst = { ...inst, versionCode: req.versionCode - 1, versionName: _bumpDown(req.versionName) };
          events.push(_ev(sn, baseMs - 1.0 * dayMs, '应用下载成功', req, 'app_download_succeeded', '38 s'));
          events.push(_ev(sn, baseMs - 0.9 * dayMs, '应用安装失败', req, 'app_install_failed', null, 'disk full'));
        } else if (installState === 'downloading') {
          inst = null;
          events.push(_ev(sn, baseMs - 0.1 * dayMs, '应用开始下载', req, 'app_download_started'));
        }
      }
      if (inst) installedApps.push(inst);

      // Sprinkle a few "happy path" install events as ambient noise.
      if (ai !== offIdx && (h + ai) % 3 === 0) {
        events.push(_ev(sn, baseMs - (5 + ai) * dayMs, '应用安装成功', req, 'app_install_succeeded', '41 s'));
      }
    });

    if (everSynced && h % 3 === 0) {
      const otaReq = { pkgName: 'OTA', versionName: 'n750-base 1.18.2', _appName: 'OTA' };
      events.push({
        id: `dev-ev-${sn}-ota-${idx}`,
        deviceSn: sn,
        eventType: 'firmware_sync_succeeded',
        eventTypeLabel: 'OTA',
        pkgName: 'OTA',
        versionName: otaReq.versionName,
        eventTime: new Date(baseMs - 6 * dayMs).toISOString(),
        eventDuration: '2m 04 s',
        description: 'Firmware sync',
        target1: 'OTA',
        target2: 'OTA',
        target3: otaReq.versionName,
      });
    }

    events.sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime));
    events.forEach((ev) => SEED_DEVICE_EVENTS.push(ev));

    const rec = {
      id:            `dev-app-${sn}`,
      deviceSn:      sn,
      installedApps: everSynced ? installedApps : [],
      syncTimestamp: everSynced ? new Date(baseMs - (h % 240) * 60 * 1000).toISOString() : null,
      requestApps,
      _merchantEntityId: merchantEntityId,
      _store: store,
    };
    SEED_DEVICE_APPLICATIONS.push(rec);
    return rec;
  }

  Object.entries(_MERCHANT_APP_CONFIG).forEach(([cid, config]) => {
    const m = window.findMerchantByCustomerId ? window.findMerchantByCustomerId(cid) : null;
    if (!m) return;
    const terminals = (m.stores || []).flatMap((s) =>
      (s.terminals || []).filter((t) => t.sn).map((t) => ({ ...t, storeId: s.id, storeName: s.name }))
    );
    const requestApps = config.map(_resolveRequestApp).filter(Boolean);
    terminals.forEach((t, idx) => {
      _synthDeviceApp({
        sn: t.sn, requestApps, hashKey: `${cid}:${t.sn}`,
        merchantEntityId: cid, store: { id: t.storeId, name: t.storeName }, idx,
      });
    });
  });

  // ─── Fleet device-app coverage (deferred) ───────────────────
  // The Devices → Devices fleet (PROD_DEVICES, seeded by devices-fleet.jsx
  // which loads AFTER this file) uses its own merchant ids (m-coffee,
  // m-bistro, …) that are NOT App Pool customer entities. So those SNs are
  // absent from the merchant loop above. To keep the fleet Apps tab and the
  // customer-detail Devices tab reading the SAME DEVICE_APPLICATION source,
  // we synthesize records for every fleet SN not already covered, using the
  // same per-terminal algorithm. setTimeout(0) defers until PROD_DEVICES
  // exists (mirrors merchants-data.jsx's bridge).
  const _FLEET_APP_CONFIG = [
    { pav: 'pav-c001-pos-432',     strategy: STRAT_CASUAL_NIGHT },
    { pav: 'pav-c001-receipt-118', strategy: STRAT_CASUAL_ANY },
    { pav: 'pav-c001-loyalty-134', strategy: STRAT_CUSTOM_CAP },
  ];
  function _seedFleetDeviceApps() {
    const fleet = window.PROD_DEVICES || [];
    if (fleet.length === 0) return;
    const fleetRequestApps = _FLEET_APP_CONFIG.map(_resolveRequestApp).filter(Boolean);
    fleet.forEach((d, idx) => {
      if (getDeviceApp(d.sn)) return; // already covered by a merchant terminal
      // Tablet/kiosk units (no SIM, Ethernet) get a catalog-only config.
      const reqs = d.model === 'X800'
        ? fleetRequestApps.filter((r) => r.pkgName === 'com.northwind.pos.pro')
        : fleetRequestApps;
      _synthDeviceApp({
        sn: d.sn, requestApps: reqs, hashKey: `fleet:${d.sn}`,
        merchantEntityId: d.merchantId,
        store: { id: d.storeId, name: d.storeId }, idx,
      });
    });
    _backfillDemoEventHistory(fleetRequestApps);
  }

  // ─── Demo: one device with a long, varied event history ─────
  // The synthesized per-device logs are short (≤3 events), so the Apps &
  // Firmware event log never exercises its "load more" / type-filter
  // overflow. Give a single representative fleet terminal a deterministic
  // ~30-event history spanning every DEVICE_EVENT type defined in the model.
  const DEMO_EVENT_SN = 'N950-0014-3322';
  function _backfillDemoEventHistory(fleetRequestApps) {
    if (!fleetRequestApps || fleetRequestApps.length === 0) return;
    if (!(window.PROD_DEVICES || []).some((d) => d.sn === DEMO_EVENT_SN)) return;
    // Wipe any short auto-generated history for this SN first.
    for (let i = SEED_DEVICE_EVENTS.length - 1; i >= 0; i--) {
      if (SEED_DEVICE_EVENTS[i].deviceSn === DEMO_EVENT_SN) SEED_DEVICE_EVENTS.splice(i, 1);
    }
    const baseMs = Date.parse('2026-05-12T09:30:00Z');
    const hourMs = 60 * 60 * 1000;
    const app = (i) => fleetRequestApps[i % fleetRequestApps.length];
    // [hoursAgo, type, label, duration, descSuffix]
    const script = [
      [2,   'app_download_started',    '应用开始下载',   null,    null],
      [3,   'user_confirmed_upgrade',  '用户确认升级',   null,    null],
      [9,   'app_install_succeeded',   '应用安装成功',   '37 s',  null],
      [10,  'app_download_succeeded',  '应用下载成功',   '44 s',  null],
      [16,  'user_postponed_upgrade',  '用户推迟升级',   null,    'snooze 4h'],
      [22,  'app_install_failed',      '应用安装失败',   null,    'signature mismatch'],
      [23,  'app_download_succeeded',  '应用下载成功',   '51 s',  null],
      [30,  'firmware_sync_succeeded', 'OTA',           '2m 11 s', null],
      [38,  'app_install_succeeded',   '应用安装成功',   '33 s',  null],
      [46,  'app_download_failed',     '应用下载失败',   null,    'network timeout'],
      [47,  'app_download_started',    '应用开始下载',   null,    null],
      [55,  'app_uninstalled',         '应用卸载',       null,    null],
      [63,  'user_confirmed_upgrade',  '用户确认升级',   null,    null],
      [64,  'app_install_succeeded',   '应用安装成功',   '40 s',  null],
      [72,  'app_download_succeeded',  '应用下载成功',   '39 s',  null],
      [88,  'user_postponed_upgrade',  '用户推迟升级',   null,    'snooze 1d'],
      [96,  'firmware_sync_succeeded', 'OTA',           '1m 58 s', null],
      [104, 'app_install_succeeded',   '应用安装成功',   '36 s',  null],
      [112, 'app_download_started',    '应用开始下载',   null,    null],
      [120, 'app_install_failed',      '应用安装失败',   null,    'disk full'],
      [121, 'app_download_succeeded',  '应用下载成功',   '47 s',  null],
      [138, 'user_confirmed_upgrade',  '用户确认升级',   null,    null],
      [150, 'app_install_succeeded',   '应用安装成功',   '42 s',  null],
      [168, 'firmware_sync_succeeded', 'OTA',           '2m 30 s', null],
      [180, 'app_download_succeeded',  '应用下载成功',   '45 s',  null],
      [192, 'app_uninstalled',         '应用卸载',       null,    null],
      [205, 'app_install_succeeded',   '应用安装成功',   '38 s',  null],
      [220, 'app_download_started',    '应用开始下载',   null,    null],
    ];
    script.forEach(([hrs, type, label, dur, suffix], i) => {
      if (type === 'firmware_sync_succeeded') {
        const ms = baseMs - hrs * hourMs;
        SEED_DEVICE_EVENTS.push({
          id: `dev-ev-${DEMO_EVENT_SN}-ota-${i}`,
          deviceSn: DEMO_EVENT_SN, eventType: 'firmware_sync_succeeded',
          eventTypeLabel: 'OTA', pkgName: 'OTA', versionName: 'n950-base 8.2.2',
          eventTime: new Date(ms).toISOString(), eventDuration: dur,
          description: 'Firmware sync', target1: 'OTA', target2: 'OTA', target3: 'n950-base 8.2.2',
        });
      } else {
        SEED_DEVICE_EVENTS.push(_ev(DEMO_EVENT_SN, baseMs - hrs * hourMs, label, app(i), type, dur, suffix));
      }
    });
  }

  // ─── Helpers for the Devices tab ────────────────────────────
  function getDeviceApp(sn) {
    return SEED_DEVICE_APPLICATIONS.find((d) => d.deviceSn === sn) || null;
  }
  function getDeviceEvents(sn, { since = null, limit = null, type = null } = {}) {
    let evs = SEED_DEVICE_EVENTS.filter((e) => e.deviceSn === sn);
    if (since) evs = evs.filter((e) => Date.parse(e.eventTime) >= since);
    if (type)  evs = evs.filter((e) => (Array.isArray(type) ? type : [type]).includes(e.eventType));
    evs.sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime));
    return limit ? evs.slice(0, limit) : evs;
  }
  function listDevicesForMerchant(merchantEntityId) {
    const m = window.findMerchantByCustomerId ? window.findMerchantByCustomerId(merchantEntityId) : null;
    if (!m) return [];
    const allTerminals = (m.stores || []).flatMap((s) =>
      (s.terminals || []).filter((t) => t.sn).map((t) => ({ ...t, storeId: s.id, storeName: s.name }))
    );
    return allTerminals.map((t) => ({ ...t, deviceApp: getDeviceApp(t.sn) }));
  }

  // Per-app derived status against a single device. Centralizes the
  // "is this installed?" logic so the row, expansion, and summary all
  // read from the same source.
  function deriveAppStatus(request, installed, recentEvent) {
    if (recentEvent) {
      if (recentEvent.eventType === 'app_install_failed' || recentEvent.eventType === 'app_download_failed') return 'failed';
      if (recentEvent.eventType === 'app_download_started') {
        if (!installed || installed.versionCode < request.versionCode) return 'downloading';
      }
    }
    if (!installed) return 'not_installed';
    if (installed.versionCode >= request.versionCode) return 'installed';
    return 'needs_upgrade';
  }

  // Rollup for the "Configured apps" cell.
  function summarizeDeviceApps(device) {
    const req = device.deviceApp?.requestApps || [];
    if (!device.deviceApp || !device.deviceApp.syncTimestamp) {
      return { count: req.length, hint: 'no sync yet', tone: 'muted' };
    }
    let failed = 0, pending = 0;
    const events = getDeviceEvents(device.sn);
    req.forEach((r) => {
      const inst = device.deviceApp.installedApps.find((i) => i.pkgName === r.pkgName);
      const recent = events.find((e) => e.pkgName === r.pkgName) || null;
      const s = deriveAppStatus(r, inst, recent);
      if (s === 'failed') failed++;
      else if (s !== 'installed') pending++;
    });
    if (failed > 0)  return { count: req.length, hint: `${failed} install failed`, tone: 'danger' };
    if (pending > 0) return { count: req.length, hint: `${pending} to install`,     tone: 'warn' };
    return { count: req.length, hint: 'all installed', tone: 'ok' };
  }

  // ─── Expose ─────────────────────────────────────────────────
  window.AppPool = {
    SEED_APP_CATEGORIES,
    SEED_APPLICATIONS,
    SEED_APP_VERSIONS,
    SEED_PARTNER_APPLICATIONS,
    SEED_PARTNER_APP_VERSIONS,
    SEED_DEVICE_APPLICATIONS,
    SEED_DEVICE_EVENTS,
    getDeviceApp,
    getDeviceEvents,
    listDevicesForMerchant,
    deriveAppStatus,
    summarizeDeviceApps,
  };
  window.getDeviceApp          = getDeviceApp;
  window.getDeviceEvents       = getDeviceEvents;
  window.listDevicesForMerchant = listDevicesForMerchant;
  window.deriveAppStatus       = deriveAppStatus;
  window.summarizeDeviceApps   = summarizeDeviceApps;

  // Defer fleet coverage until PROD_DEVICES is seeded (devices-fleet.jsx
  // loads after this file). Mirrors merchants-data.jsx's setTimeout bridge.
  setTimeout(_seedFleetDeviceApps, 0);
})();
