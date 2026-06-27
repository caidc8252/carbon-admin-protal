/* global React */
// ─────────────────────────────────────────────────────────────
// Firmware seed data + helpers.  (per-MODEL model)
//
// A firmware now belongs to ONE device model. Its versions[] array holds
// every uploaded version across ALL hardware IDs of that model. Each
// version carries its own:
//    hardwareId   — internal device-characteristic id, e.g. "A105G"
//                   (Android 10 · 5G chip) or "A10" (Android 10 · standard chip)
//    osVersion    — human OS label shown in the OS column, e.g. "ANDROID 10"
//    os           — OS family (ANDROID · LINUX · RTOS)
//
// The model-firmware detail page lists firmware.versions as ONE flat,
// normally-paginated table (no per-OS grouping); the OS + Hardware ID
// columns let an operator scan every hardware variant in one place.
//
// Each version has a `status` of:
//   published    — the default the moment a version is uploaded. Available
//                  and deployable to ISOs from the Deployments tab.
//   unpublished  — explicitly taken down via the Versions-tab action.
//
// File-format conventions (validated client-side on upload):
//   ANDROID : {model}_{hardware id}_OTA_{version}.zip
//   RTOS    : {model}_{hardware id}_OTA_{version}.zip
//   LINUX   : [{Model}]MAN_Patch_{startVersion}-{endVersion}_{customer}_{date}.NLD
// ─────────────────────────────────────────────────────────────

const FW_OS_OPTIONS = ['ANDROID', 'LINUX', 'RTOS'];

const FW_OS_TONE = {
  ANDROID: 'success',
  LINUX:   'info',
  RTOS:    'warning',
};

// Per-OS upload metadata: filename pattern, hint text, mime-style ext.
const FW_OS_META = {
  ANDROID: {
    label:   'Android',
    ext:     '.zip',
    pattern: '{model}_{hardware id}_OTA_{version}.zip',
    hint:    'Example: N950_A105G_OTA_V2.3.1.zip',
    regex:   /^([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_OTA_(V?[A-Za-z0-9.]+)\.zip$/i,
    parse:   (m) => ({
      modelCode:   m[1].toUpperCase(),
      hardwareId:  m[2].toUpperCase(),
      versionName: m[3].startsWith('V') ? m[3] : 'V' + m[3],
      isRange:     false,
    }),
    hasSubPackages: true,
  },
  LINUX: {
    label:   'Linux',
    ext:     '.NLD',
    pattern: '[{Model}]MAN_Patch_{start version}-{end version}_{customer name}_{date}.NLD',
    hint:    'Example: [S30]MAN_Patch_V1.2-V1.4_AcmeISO_20260524.NLD',
    regex:   /^\[([A-Za-z0-9-]+)\]MAN_Patch_(V?[A-Za-z0-9.]+)-(V?[A-Za-z0-9.]+)_([A-Za-z0-9-]+)_(\d{6,8})\.NLD$/i,
    parse:   (m) => ({
      modelCode:    m[1].toUpperCase(),
      hardwareId:   'MAN',                          // Linux NLD = MAN patch; hardwareId is the filename literal.
      versionStart: m[2].startsWith('V') ? m[2] : 'V' + m[2],
      versionEnd:   m[3].startsWith('V') ? m[3] : 'V' + m[3],
      versionName:  (m[2].startsWith('V') ? m[2] : 'V' + m[2]) + '→' + (m[3].startsWith('V') ? m[3] : 'V' + m[3]),
      customer:     m[4],
      date:         m[5],
      isRange:      true,
    }),
    hasSubPackages: false,
  },
  RTOS: {
    label:   'RTOS',
    ext:     '.zip',
    pattern: '{model}_{hardware id}_OTA_{version}.zip',
    hint:    'Example: X800_STD_OTA_V1.0.7.zip',
    regex:   /^([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_OTA_(V?[A-Za-z0-9.]+)\.zip$/i,
    parse:   (m) => ({
      modelCode:   m[1].toUpperCase(),
      hardwareId:  m[2].toUpperCase(),
      versionName: m[3].startsWith('V') ? m[3] : 'V' + m[3],
      isRange:     false,
    }),
    hasSubPackages: true,
  },
};

// Status tones for version chips.
const FW_VERSION_TONE = {
  unpublished: { tone: 'neutral', label: 'Unpublished' },
  published:   { tone: 'success', label: 'Published' },
};

// Derive an integer-ish "version code" from a name like V2.3.1 → 20301.
const __versionNameToCode = (name) => {
  const m = (name || '').replace(/^V/i, '').match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return 1;
  const a = parseInt(m[1] || '0', 10);
  const b = parseInt(m[2] || '0', 10);
  const c = parseInt(m[3] || '0', 10);
  return a * 10000 + b * 100 + c;
};

// Fake md5 for seed data; backend computes real ones. 32-char uppercase hex.
const __fakeMd5 = (s) => {
  let out = '';
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < 8; i++) {
    for (const ch of (s + ':' + i)) h = ((h ^ ch.charCodeAt(0)) * 0x01000193) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 32).toUpperCase();
};

const __pkgHash = (s) => {
  let h = 0xdeadbeef >>> 0;
  for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h >>> 0;
};

// Incremental OTA sub-packages: one diff per supported start build, all
// converging on the model's current end build. Displayed as a version range
// (e.g. V1.0.58->V1.0.69); larger gaps ship larger patches.
const __incPkgs = (modelCode, version) => {
  const h = __pkgHash(modelCode + version);
  const end = 60 + (h % 30);                 // end build 60..89
  const deltas = [11, 9, 7, 4];              // descending → smaller, lighter patches
  return deltas.map((d, i) => {
    const start = end - d;
    const jitter = (__pkgHash(version + ':' + i) % 100) / 100;
    const sizeMb = 8 + d * 1.75 + jitter;
    return {
      name: `V1.0.${start} → V1.0.${end}`,
      size: `${sizeMb.toFixed(2)} MB`,
      md5:  __fakeMd5(modelCode + version + start + '-' + end),
    };
  });
};

const __androidPkgs = (modelCode, version) => __incPkgs(modelCode, version);
const __rtosPkgs    = (modelCode, version) => __incPkgs(modelCode, version);

const __t = (daysAgo) => new Date(Date.UTC(2026, 4, 21) - daysAgo * 86400000).toISOString();

// First N ISO customers as believable seed release targets.
const __seedIsoIds = () =>
  (window.SEED_CUSTOMERS || [])
    .filter(c => (c.contracts || []).some(k => k.kind === 'ISO'))
    .map(c => c.id);

// Build a single version row. hardwareId + osVersion live on the version.
const __mkVersion = ({ os, modelCode, hardwareId, osVersion, name, daysAgo, current, published, sizeMb, fileNameOverride, changelog, audienceIds }) => {
  const code = __versionNameToCode(name);
  const meta = FW_OS_META[os];
  const fileName = fileNameOverride || `${modelCode}_${hardwareId}_OTA_${name}.zip`;
  const publishedAt = __t(Math.max(0, daysAgo - 1));
  const aud = published ? (audienceIds || []) : [];
  return {
    id:            `fwv-${modelCode}-${hardwareId}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    versionName:   name,
    versionCode:   code,
    hardwareId,
    osVersion,
    os,
    fileName,
    fileSize:      `${sizeMb.toFixed(1)} MB`,
    fileSizeBytes: Math.round(sizeMb * 1024 * 1024),
    md5:           __fakeMd5(fileName),
    uploadedAt:    __t(daysAgo),
    uploadedBy:    'fw-pipeline@carbon',
    publishedAt,
    publishedBy:   'ops@carbon',
    status:        'published',
    current:       !!current,
    changelog:     changelog || 'Routine maintenance · security patches · bug fixes.',
    publishedToIsoIds: aud,
    publishEvents: aud.length
      ? [{ at: publishedAt, by: 'ops@carbon', action: 'publish', isoIds: aud }]
      : [],
    packages:      meta.hasSubPackages
      ? (os === 'RTOS' ? __rtosPkgs(modelCode, name) : __androidPkgs(modelCode, name))
      : [],
  };
};

// Materialise at script-load. Other modules re-read window.SEED_FIRMWARE.
(function buildSeed() {
  const isoIds   = __seedIsoIds();
  const audAll    = isoIds;
  const audMost   = isoIds.slice(0, Math.max(1, isoIds.length - 2));
  const audFirst3 = isoIds.slice(0, 3);
  const audFirst1 = isoIds.slice(0, 1);
  const AUD = { all: audAll, most: audMost, first3: audFirst3, first1: audFirst1, none: [] };

  // Spec → seed. Each model has hardware-id groups; each group has versions.
  const SPEC = [
    {
      modelId: 'm-n950', modelCode: 'N950', os: 'ANDROID',
      hw: [
        { hardwareId: 'A105G', osVersion: 'ANDROID 10', versions: [
          { name: 'V2.3.1', daysAgo: 3,  current: true,  published: true,  sizeMb: 184.2, aud: 'first3', changelog: 'New EMV L2 kernel · NFC stability fixes · TLS 1.3 support.' },
          { name: 'V2.3.0', daysAgo: 21, current: false, published: true,  sizeMb: 183.6, aud: 'all',    changelog: 'Initial 2.3 line · OS upgrade to Android 10 QPR3.' },
          { name: 'V2.2.4', daysAgo: 62, current: false, published: false, sizeMb: 181.0,                changelog: 'Hotfix · printer queue race condition.' },
        ] },
        { hardwareId: 'A10', osVersion: 'ANDROID 10', versions: [
          { name: 'V2.3.1', daysAgo: 5,  current: true,  published: true,  sizeMb: 186.4, aud: 'most',   changelog: 'EMV contactless kernel updated to L2 4.3a.' },
          { name: 'V2.3.0', daysAgo: 32, current: false, published: true,  sizeMb: 185.1, aud: 'all' },
          { name: 'V2.2.4', daysAgo: 70, current: false, published: false, sizeMb: 182.7 },
        ] },
        { hardwareId: 'A125G', osVersion: 'ANDROID 12', versions: [
          { name: 'V3.0.1', daysAgo: 2,  current: true,  published: true,  sizeMb: 196.8, aud: 'first3', changelog: 'Android 12 baseline · scoped storage · new SafetyNet attest.' },
          { name: 'V3.0.0', daysAgo: 18, current: false, published: true,  sizeMb: 195.2, aud: 'all' },
        ] },
        { hardwareId: 'A145G', osVersion: 'ANDROID 14', versions: [
          { name: 'V4.0.0', daysAgo: 1,  current: true,  published: true,  sizeMb: 212.5, aud: 'first1', changelog: 'Android 14 preview build · 5G modem firmware bump.' },
        ] },
      ],
    },
    {
      modelId: 'm-s60', modelCode: 'S60', os: 'ANDROID',
      hw: [
        { hardwareId: 'A12', osVersion: 'ANDROID 12', versions: [
          { name: 'V1.7.2', daysAgo: 9,  current: true,  published: true,  sizeMb: 142.3, aud: 'all' },
          { name: 'V1.7.1', daysAgo: 45, current: false, published: true,  sizeMb: 141.7, aud: 'all' },
          { name: 'V1.7.0', daysAgo: 88, current: false, published: false, sizeMb: 140.9 },
        ] },
        { hardwareId: 'A105G', osVersion: 'ANDROID 10', versions: [
          { name: 'V1.7.2', daysAgo: 12, current: true,  published: true,  sizeMb: 144.1, aud: 'most' },
        ] },
      ],
    },
    {
      modelId: 'm-s90', modelCode: 'S90', os: 'ANDROID',
      hw: [
        { hardwareId: 'A145G', osVersion: 'ANDROID 14', versions: [
          { name: 'V1.0.2', daysAgo: 6,  current: true,  published: true,  sizeMb: 158.9, aud: 'first3', changelog: 'Dual-screen tuning · battery-saver thresholds.' },
          { name: 'V1.0.1', daysAgo: 30, current: false, published: true,  sizeMb: 157.4, aud: 'all' },
        ] },
      ],
    },
    {
      modelId: 'm-n750', modelCode: 'N750', os: 'ANDROID',
      hw: [
        { hardwareId: 'A105G', osVersion: 'ANDROID 10', versions: [
          { name: 'V1.2.0', daysAgo: 7,  current: true,  published: true,  sizeMb: 96.8, aud: 'most',  changelog: 'Receipt printer driver · kernel CVE-2024-0049 fix.' },
          { name: 'V1.1.3', daysAgo: 43, current: false, published: true,  sizeMb: 95.2, aud: 'all' },
        ] },
      ],
    },
    {
      modelId: 'm-s30', modelCode: 'S30', os: 'LINUX',
      hw: [
        { hardwareId: 'MAN', osVersion: 'LINUX 5.10', linux: true, versions: [
          {
            name: 'V1.2→V1.4', versionStart: 'V1.2', versionEnd: 'V1.4',
            fileName: '[S30]MAN_Patch_V1.2-V1.4_AcmeISO_20260518.NLD',
            daysAgo: 7, current: true, published: true, sizeMb: 38.6, aud: 'first1',
            changelog: 'Incremental patch · receipt printer driver · kernel CVE-2024-0049.',
          },
          {
            name: 'V1.1→V1.3', versionStart: 'V1.1', versionEnd: 'V1.3',
            fileName: '[S30]MAN_Patch_V1.1-V1.3_AcmeISO_20260411.NLD',
            daysAgo: 43, current: false, published: true, sizeMb: 36.9, aud: 'first1',
            changelog: 'Cumulative patch · TLS update · NFC firmware.',
          },
        ] },
      ],
    },
    {
      modelId: 'm-x800', modelCode: 'X800', os: 'RTOS',
      hw: [
        { hardwareId: 'STD', osVersion: 'RT-Thread 4.1', versions: [
          { name: 'V1.0.7', daysAgo: 11, current: true,  published: true,  sizeMb: 12.4, aud: 'all' },
          { name: 'V1.0.6', daysAgo: 73, current: false, published: true,  sizeMb: 12.3, aud: 'all' },
        ] },
        { hardwareId: 'EMV', osVersion: 'RT-Thread 4.1', versions: [
          { name: 'V1.0.7', daysAgo: 13, current: true,  published: false, sizeMb: 12.8 },
        ] },
      ],
    },
  ];

  const buildLinuxVersion = (modelCode, hardwareId, osVersion, v) => {
    const aud = v.published ? (AUD[v.aud] || []) : [];
    const publishedAt = __t(Math.max(0, v.daysAgo - 1));
    return {
      id:            `fwv-${modelCode}-${hardwareId}-${v.name}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      versionName:   v.name,
      versionCode:   __versionNameToCode(v.versionEnd || v.name),
      hardwareId,
      osVersion,
      os:            'LINUX',
      versionStart:  v.versionStart,
      versionEnd:    v.versionEnd,
      fileName:      v.fileName,
      fileSize:      `${v.sizeMb.toFixed(1)} MB`,
      fileSizeBytes: Math.round(v.sizeMb * 1024 * 1024),
      md5:           __fakeMd5(v.fileName),
      uploadedAt:    __t(v.daysAgo),
      uploadedBy:    'fw-pipeline@carbon',
      publishedAt,
      publishedBy:   'ops@carbon',
      status:        'published',
      current:       !!v.current,
      changelog:     v.changelog || 'No changelog provided.',
      publishedToIsoIds: aud,
      publishEvents: aud.length ? [{ at: publishedAt, by: 'ops@carbon', action: 'publish', isoIds: aud }] : [],
      packages:      [],
    };
  };

  const fw = SPEC.map((spec) => {
    const versions = [];
    spec.hw.forEach((group) => {
      group.versions.forEach((v) => {
        if (group.linux) {
          versions.push(buildLinuxVersion(spec.modelCode, group.hardwareId, group.osVersion, v));
        } else {
          versions.push(__mkVersion({
            os: spec.os, modelCode: spec.modelCode,
            hardwareId: group.hardwareId, osVersion: group.osVersion,
            name: v.name, daysAgo: v.daysAgo, current: v.current, published: v.published,
            sizeMb: v.sizeMb, changelog: v.changelog, audienceIds: AUD[v.aud] || [],
          }));
        }
      });
    });
    // Newest-first overall (by upload time).
    versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return {
      id:        `fw-${spec.modelCode}`.toLowerCase(),
      modelId:   spec.modelId,
      modelCode: spec.modelCode,
      os:        spec.os,
      versions,
    };
  });

  window.SEED_FIRMWARE = fw;
})();

// ─── Helpers ─────────────────────────────────────────────
// "Latest" version of a firmware = the newest one tagged current, else the
// first (versions[] is sorted newest-first).
const getFirmwareLatest = (fw) =>
  (fw.versions || []).find(v => v.current) || (fw.versions || [])[0];

// Distinct hardware IDs present in a firmware (in first-seen order).
const getFirmwareHardwareIds = (fw) => {
  const seen = [];
  for (const v of (fw.versions || [])) if (!seen.includes(v.hardwareId)) seen.push(v.hardwareId);
  return seen;
};

// Build an activity timeline by flattening every version's lifecycle events.
const buildFirmwareActivity = (fw) => {
  const events = [];
  for (const v of fw.versions) {
    events.push({ kind: 'uploaded', text: `Version ${v.versionName} uploaded`, at: v.uploadedAt, actor: v.uploadedBy });
    if (Array.isArray(v.publishEvents) && v.publishEvents.length) {
      for (const ev of v.publishEvents) {
        const isoCount = (ev.isoIds || []).length;
        if (ev.action === 'publish') {
          events.push({ kind: 'published', actor: ev.by, at: ev.at, text: `Version ${v.versionName} published to ${isoCount} ISO customer${isoCount === 1 ? '' : 's'}` });
        } else if (ev.action === 'audience-edit') {
          events.push({ kind: 'audience-edit', actor: ev.by, at: ev.at, text: `Version ${v.versionName} audience updated · now ${isoCount} ISO customer${isoCount === 1 ? '' : 's'}` });
        } else if (ev.action === 'unpublish') {
          events.push({ kind: 'unpublished', actor: ev.by, at: ev.at, text: `Version ${v.versionName} unpublished` });
        }
      }
    } else {
      if (v.publishedAt) events.push({ kind: 'published', text: `Version ${v.versionName} published`, at: v.publishedAt, actor: v.publishedBy });
      if (v.unpublishedAt) events.push({ kind: 'unpublished', text: `Version ${v.versionName} unpublished`, at: v.unpublishedAt, actor: v.unpublishedBy });
    }
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  return events;
};

// Resolve a version's audience to customer records (in seed order).
const getVersionAudience = (version) => {
  const ids = version?.publishedToIsoIds || [];
  if (ids.length === 0) return [];
  const customers = window.SEED_CUSTOMERS || [];
  return ids.map(id => customers.find(c => c.id === id)).filter(Boolean);
};
const versionAudienceCount = (version) => (version?.publishedToIsoIds || []).length;

const findFirmwareById = (id) => (window.SEED_FIRMWARE || []).find(f => f.id === id);
const findFirmwareByModelId = (modelId) => (window.SEED_FIRMWARE || []).find(f => f.modelId === modelId);
const findFirmwareByModelCode = (modelCode) => (window.SEED_FIRMWARE || []).find(f => f.modelCode === modelCode);
const findFirmwareVersion = (fw, vid) => (fw?.versions || []).find(v => v.id === vid);

Object.assign(window, {
  FW_OS_OPTIONS, FW_OS_TONE, FW_OS_META, FW_VERSION_TONE,
  getFirmwareLatest, getFirmwareHardwareIds,
  buildFirmwareActivity, findFirmwareById, findFirmwareByModelId, findFirmwareByModelCode, findFirmwareVersion,
  getVersionAudience, versionAudienceCount,
});
