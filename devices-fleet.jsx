/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Devices (production fleet) — ISO-only
// Each device is a physical terminal an ISO has activated and now operates.
// Scope per the product spec:
//   1. Basic identity     — SN, model, OS/firmware, activated/created, last seen
//   2. Hardware posture   — root, dev-mode, security warnings
//   3. Network            — SIM, ethernet, Wi-Fi (SSID)
//   4. Pre-installed apps — name, version, installed-at, system flag, logo
//   5. System settings    — timezone, language, auto-sync flags
// We keep this read-mostly: an ISO inspects a device, occasionally re-binds
// or reboots; we don't replicate the device's own settings UI in here.
// ─────────────────────────────────────────────────────────────

const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD } = React;

// ─── Seed data ──────────────────────────────────────────────
// Six representative devices spanning each Carbon model and most flag
// combinations (root, dev-mode, security alerts) so the detail page shows
// realistic variation.
const DEVICES_SEED = [
  {
    sn: "N950-0014-9281", model: "N950",
    os: "Android 14", firmware: "TOMS 8.2.1-r127",
    activatedAt: "Feb 14, 2025",   createdAt: "Feb 10, 2025",   lastSeenAt: "5 min ago",
    status: "active", merchantId: "m-coffee", storeId: "s-coffee-hq",
    imei: "354782109876541",
    storage: { total: 32, used: 11.4 },        // GB
    battery: { level: 87, health: 96 },
    hardware: { root: false, devMode: false,  securityWarnings: [] },
    network:  { sim: { enabled: true,  carrier: "Bell" },
                ethernet: { enabled: false },
                wifi: { enabled: true,  ssid: "Riverside-POS" } },
    settings: { timezone: "America/Toronto", language: "en-CA",
                autoTimezone: true, autoTime: true },
    apps: [
      { id: "pos",      name: "Acme POS Pro",  version: "4.3.2",   installedAt: "May 10, 2025", system: false },
      { id: "loyalty",  name: "Loyalty+",      version: "1.3.4",   installedAt: "Apr 20, 2025", system: false },
      { id: "toms-mdm", name: "TOMS MDM",      version: "5.1.0",   installedAt: "Feb 14, 2025", system: true  },
      { id: "toms-pay", name: "TOMS PayCore",  version: "3.8.2",   installedAt: "Feb 14, 2025", system: true  },
      { id: "android",  name: "Android System", version: "14",     installedAt: "Feb 14, 2025", system: true  },
    ],
  },
  {
    sn: "N950-0014-3322", model: "N950",
    os: "Android 14", firmware: "TOMS 8.2.1-r127",
    activatedAt: "Nov 04, 2024", createdAt: "Oct 28, 2024", lastSeenAt: "just now",
    status: "active", merchantId: "m-bistro", storeId: "s-bistro-hq",
    imei: "354782109876702",
    storage: { total: 32, used: 14.8 },
    battery: { level: 64, health: 91 },
    hardware: { root: false, devMode: false, securityWarnings: [] },
    network: { sim: { enabled: true, carrier: "Telus" },
               ethernet: { enabled: false },
               wifi: { enabled: true, ssid: "CascadeBistro-Guest" } },
    settings: { timezone: "America/Vancouver", language: "en-CA",
                autoTimezone: true, autoTime: true },
    apps: [
      { id: "pos",      name: "Acme POS Pro",  version: "4.3.2",  installedAt: "May 11, 2025", system: false },
      { id: "loyalty",  name: "Loyalty+",      version: "1.3.4",  installedAt: "Apr 22, 2025", system: false },
      { id: "toms-mdm", name: "TOMS MDM",      version: "5.1.0",  installedAt: "Nov 04, 2024", system: true  },
      { id: "toms-pay", name: "TOMS PayCore",  version: "3.8.2",  installedAt: "Nov 04, 2024", system: true  },
    ],
  },
  {
    sn: "S60-0488-0021", model: "S60",
    os: "Android 13", firmware: "TOMS 7.4.3-r88",
    activatedAt: "Sep 12, 2024", createdAt: "Aug 30, 2024", lastSeenAt: "3 days ago",
    status: "locked", merchantId: "m-coffee", storeId: "s-coffee-pln",
    imei: "354782108821091",
    storage: { total: 16, used: 5.2 },
    battery: { level: 12, health: 58 },
    hardware: { root: false, devMode: true, securityWarnings: ["Developer options enabled"] },
    network: { sim: { enabled: false },
               ethernet: { enabled: false },
               wifi: { enabled: true, ssid: "Plateau-Back-2G" } },
    settings: { timezone: "America/Toronto", language: "fr-CA",
                autoTimezone: true, autoTime: false },
    apps: [
      { id: "pos",      name: "Acme POS Pro",  version: "4.2.5",  installedAt: "Mar 12, 2025", system: false },
      { id: "toms-mdm", name: "TOMS MDM",      version: "5.0.4",  installedAt: "Sep 12, 2024", system: true  },
      { id: "toms-pay", name: "TOMS PayCore",  version: "3.7.1",  installedAt: "Sep 12, 2024", system: true  },
    ],
  },
  {
    sn: "X800-0099-1422", model: "X800",
    os: "Android 14", firmware: "TOMS 8.2.0-r119",
    activatedAt: "Jan 20, 2025", createdAt: "Jan 15, 2025", lastSeenAt: "2 min ago",
    status: "active", merchantId: "m-glacier", storeId: "s-glacier-bby",
    imei: null,
    storage: { total: 64, used: 24.0 },
    battery: null, // kiosk — line-powered
    hardware: { root: false, devMode: false, securityWarnings: [] },
    network: { sim: { enabled: false },
               ethernet: { enabled: true },
               wifi: { enabled: false } },
    settings: { timezone: "America/Vancouver", language: "en-CA",
                autoTimezone: true, autoTime: true },
    apps: [
      { id: "catalog",  name: "Catalog Sync", version: "1.0.9",  installedAt: "Apr 30, 2025", system: false },
      { id: "pos",      name: "Acme POS Pro", version: "4.3.2",  installedAt: "May 10, 2025", system: false },
      { id: "toms-mdm", name: "TOMS MDM",     version: "5.1.0",  installedAt: "Jan 20, 2025", system: true  },
      { id: "android",  name: "Android System", version: "14",   installedAt: "Jan 20, 2025", system: true  },
    ],
  },
  {
    sn: "N750-0099-0040", model: "N750",
    os: "Android 13", firmware: "TOMS 7.4.0-r71",
    activatedAt: "Jul 02, 2024", createdAt: "Jun 28, 2024", lastSeenAt: "11 hours ago",
    status: "active", merchantId: "m-coffee", storeId: "s-coffee-old",
    imei: "354782107770040",
    storage: { total: 16, used: 7.1 },
    battery: { level: 45, health: 88 },
    hardware: { root: true, devMode: false,
                securityWarnings: ["Device appears to be rooted", "Bootloader unlock detected"] },
    network: { sim: { enabled: true, carrier: "Rogers" },
               ethernet: { enabled: false },
               wifi: { enabled: false } },
    settings: { timezone: "America/Toronto", language: "en-CA",
                autoTimezone: false, autoTime: false },
    apps: [
      { id: "pos",      name: "Acme POS Pro",  version: "4.3.1",  installedAt: "Apr 25, 2025", system: false },
      { id: "toms-mdm", name: "TOMS MDM",      version: "5.0.4",  installedAt: "Jul 02, 2024", system: true  },
    ],
  },
  {
    sn: "S90-0822-2007", model: "S90",
    os: "Android 14", firmware: "TOMS 8.2.1-r127",
    activatedAt: null, createdAt: "May 10, 2026", lastSeenAt: "never",
    status: "pending", merchantId: "m-bistro", storeId: "s-bistro-hq",
    imei: "354782108220007",
    storage: { total: 32, used: 1.2 },
    battery: { level: 100, health: 100 },
    hardware: { root: false, devMode: false, securityWarnings: [] },
    network: { sim: { enabled: false },
               ethernet: { enabled: false },
               wifi: { enabled: false } },
    settings: { timezone: "America/Vancouver", language: "en-CA",
                autoTimezone: true, autoTime: true },
    apps: [
      { id: "toms-mdm", name: "TOMS MDM",      version: "5.1.0",  installedAt: "May 10, 2026", system: true },
    ],
  },
];

// ─── Northwind Logistics fleet (20 terminals) ────────────────
// Generated so the New Ticket picker has a realistic "large merchant"
// case to exercise the merchant / store scope filters. The entries
// mirror MERCHANTS_SEED in merchants.jsx (same SN, merchantId, storeId)
// so the device-detail pages render properly.
const NORTHWIND_DEVICES = (() => {
  const STORES = [
    { storeId: "s-nw-hq",  count: 5, prefix: "70" },
    { storeId: "s-nw-yyz", count: 6, prefix: "71" },
    { storeId: "s-nw-yul", count: 5, prefix: "72" },
    { storeId: "s-nw-yyc", count: 4, prefix: "73" },
  ];
  const MODELS = ["N950", "N950", "N950", "S90", "S60", "X800"];
  const carriers = ["Bell", "Telus", "Rogers"];
  const cities = {
    "s-nw-hq":  { tz: "America/Vancouver", lang: "en-CA", ssid: "Northwind-Burnaby-Ops" },
    "s-nw-yyz": { tz: "America/Toronto",   lang: "en-CA", ssid: "YYZ-Cargo-WLAN" },
    "s-nw-yul": { tz: "America/Montreal",  lang: "fr-CA", ssid: "YUL-Cargo-WLAN" },
    "s-nw-yyc": { tz: "America/Edmonton",  lang: "en-CA", ssid: "YYC-Dock-WLAN" },
  };
  const out = [];
  STORES.forEach((s, si) => {
    for (let i = 1; i <= s.count; i++) {
      const model = MODELS[i % MODELS.length];
      const snBase = String(i).padStart(2, "0");
      const sn = `${model}-0210-${s.prefix}${snBase}`;
      const isXpad = model === "X800";
      const c = cities[s.storeId];
      out.push({
        sn, model,
        os: "Android 14", firmware: "TOMS 8.2.1-r127",
        activatedAt: "Mar 04, 2024", createdAt: "Feb 28, 2024",
        lastSeenAt: `${i} min ago`,
        status: "active", merchantId: "m-northwind", storeId: s.storeId,
        imei: isXpad ? null : `35478211000${s.prefix}${snBase}0`,
        storage: { total: isXpad ? 64 : 32, used: 6 + (i % 9) },
        battery: isXpad ? null : { level: 60 + (i * 7) % 35, health: 80 + (i * 3) % 18 },
        hardware: { root: false, devMode: false, securityWarnings: [] },
        network: {
          sim: isXpad ? { enabled: false } : { enabled: true, carrier: carriers[i % carriers.length] },
          ethernet: { enabled: isXpad },
          wifi: { enabled: !isXpad, ssid: c.ssid },
        },
        settings: { timezone: c.tz, language: c.lang, autoTimezone: true, autoTime: true },
        apps: [
          { id: "pos",      name: "Acme POS Pro",   version: "4.3.2",  installedAt: "May 10, 2025", system: false },
          { id: "toms-mdm", name: "TOMS MDM",       version: "5.1.0",  installedAt: "Mar 04, 2024", system: true  },
          { id: "toms-pay", name: "TOMS PayCore",   version: "3.8.2",  installedAt: "Mar 04, 2024", system: true  },
          { id: "android",  name: "Android System", version: "14",     installedAt: "Mar 04, 2024", system: true  },
        ],
      });
    }
  });
  return out;
})();
DEVICES_SEED.push(...NORTHWIND_DEVICES);

window.PROD_DEVICES = window.PROD_DEVICES || DEVICES_SEED.map(d => ({ ...d }));

function findDeviceBySn(sn) {
  return (window.PROD_DEVICES || []).find(d => d.sn === sn) || null;
}

// ─── Last-seen formatting ──────────────────────────────────
// The seed data carries lastSeenAt as a relative string ("5 min ago",
// "just now", "3 days ago") for human readability. For the devices
// table we display the actual timestamp of the terminal's last
// check-in with the platform — relative is recomputed against a fixed
// "now" anchor so the prototype renders stable timestamps across
// reloads.
const LAST_SEEN_NOW_REF = new Date("2026-05-12T14:30:00");
function lastSeenTimestamp(rel) {
  if (!rel || rel === "never") return null;
  let agoMs = 0;
  if (rel === "just now") {
    agoMs = 0;
  } else {
    const m = /^(\d+)\s+(sec|min|minute|hour|day|week|month|year)s?\s+ago$/i.exec(rel);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    const mult = u.startsWith("sec")   ? 1e3
               : u.startsWith("min")   ? 6e4
               : u.startsWith("hour")  ? 36e5
               : u.startsWith("day")   ? 864e5
               : u.startsWith("week")  ? 6048e5
               : u.startsWith("month") ? 2592e6
               :                          31536e6;
    agoMs = n * mult;
  }
  const d = new Date(LAST_SEEN_NOW_REF.getTime() - agoMs);
  return window.fmtDateTimeS(d);
}

// ─── Status pill tone map ──────────────────────────────────
// Driven SOLELY by DEVICE.STATUS (model): 1 = Active, 0 = Locked,
// 9 = Pending activation. LOCK STATUS is no longer a pill driver — it
// surfaces as a read-only detail row under Monitoring · State only.
const DEVICE_STATE = {
  active:   { label: "Active",   tone: "success" },
  locked:   { label: "Locked",   tone: "danger"  },
  pending:  { label: "Pending",  tone: "warning" },
};
// Connectivity pill — Online / Offline, derived from last-seen
// (DEVICE EXTEND.UPDATE TIMESTAMP). Independent of STATUS.
const ONLINE_PILL = {
  online:  { label: "Online",  tone: "success" },
  offline: { label: "Offline", tone: "neutral" },
};

// Online iff the device checked in within the last 15 minutes. Parses
// the seed's relative last-seen string ("just now", "5 min ago", …).
function deviceIsOnline(device) {
  const rel = device.lastSeenAt;
  if (!rel || rel === "never") return false;
  if (rel === "just now") return true;
  const m = /^(\d+)\s+(sec|second|min|minute|hour|day|week|month|year)s?\s+ago$/i.exec(rel);
  if (!m) return false;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  if (u.startsWith("sec")) return true;
  if (u.startsWith("min")) return n <= 15;
  return false; // hours / days / weeks / … → offline
}
function deviceStatusMeta(device) {
  return DEVICE_STATE[device.status] || DEVICE_STATE.locked;
}

// ─── Latest firmware per model (target the fleet should be on) ──
// In a real system this is what the OEM publishes; here we hard-code so
// the Apps & Firmware tab can show an update-available state for some
// devices and "up-to-date" for others.
const TARGET_FIRMWARE = {
  N950: { version: "TOMS 8.2.2-r131", releasedAt: "May 08, 2026", notes: "Wi-Fi 6E driver fix, EMV kernel 1.4.7" },
  N750: { version: "TOMS 7.5.0-r92",  releasedAt: "Apr 22, 2026", notes: "Battery calibration, security patch level 2026-04" },
  S60:  { version: "TOMS 7.4.3-r88",  releasedAt: "Mar 11, 2026", notes: "Printer driver, security patch level 2026-03" },
  S90:  { version: "TOMS 8.2.2-r131", releasedAt: "May 08, 2026", notes: "Wi-Fi 6E driver fix, EMV kernel 1.4.7" },
  X800: { version: "TOMS 8.2.0-r119", releasedAt: "Jan 14, 2026", notes: "Kiosk auto-lock improvements" },
};

// ─── Firmware delta (current vs latest target for the model) ──
// Drives the Apps & Firmware tab's firmware card. Returns null when the
// model has no published target or the device hasn't reported firmware.
function firmwareDeltaFor(device) {
  const target = TARGET_FIRMWARE[device.model];
  if (!target || !device.firmware) return null;
  if (device.firmware === target.version) return { current: device.firmware, target, behind: false };
  const buildOf = (s) => parseInt((String(s).match(/r(\d+)/i) || [])[1] || "0", 10);
  return {
    current: device.firmware,
    target,
    behind: true,
    behindBy: Math.max(0, buildOf(target.version) - buildOf(device.firmware)),
  };
}

// ─── Runtime snapshot (what the device last reported) ─────
function runtimeFor(device) {
  const seed = device.sn.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
  const cpu = 15 + (seed % 50);
  const memTotal = device.model === "X800" ? 6 : 4;
  const memUsed = parseFloat((memTotal * (0.4 + ((seed % 40) / 100))).toFixed(1));
  const diskTotal = device.storage?.total || 32;
  const diskUsed = device.storage?.used ?? diskTotal * 0.35;
  const sampledAt = deviceIsOnline(device)  ? (device.lastSeenAt || "5 min ago")
                  : device.status === "pending" ? "—"
                                              : "3 days ago";
  return {
    cpu, memUsed, memTotal,
    diskUsed: parseFloat(diskUsed.toFixed ? diskUsed.toFixed(1) : diskUsed),
    diskTotal,
    networkMode: device.network.ethernet.enabled ? "Ethernet"
              : device.network.wifi.enabled ? "Wi-Fi"
              : device.network.sim.enabled ? "Cellular"
              : "Offline",
    root: device.hardware.root,
    devMode: device.hardware.devMode,
    sampledAt,
    isOnline: deviceIsOnline(device),
  };
}

// ─── Memory summary (used in the Health strip) ─────────────
// Synthesizes a believable RAM total per device tier (matches the
// hardware we'd realistically ship for that storage class) and
// derives "used" from the same process list the Memory probe shows
// so the two read consistently.
function memSummaryFor(device) {
  const snap = memorySnapshotFor(device);
  const usedMB = snap.usedMb, totalMB = snap.totalMb;
  return {
    usedMB, totalMB,
    pct: snap.pct,
    usedGB:  (usedMB  / 1024).toFixed(1),
    totalGB: (totalMB / 1024).toFixed(1),
  };
}

// ─── Derived per-device metadata ──────────────────────────
// Stable codes/timestamps the UI shows but that we don't store in the
// seed data — derived deterministically from the SN/model so the same
// device always shows the same values.
function deviceMetaFor(device) {
  const seed = device.sn.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
  // Manufacturer (factory) lookup by model — every Carbon model is built
  // by a specific OEM. Cosmetic.
  const MFR = {
    N950: "Wingtech Shenzhen",
    N750: "Wingtech Shenzhen",
    S60:  "Foxconn Chengdu",
    S90:  "Foxconn Chengdu",
    X800: "Pegatron Suzhou",
  };
  // Carbon part-number convention: PN-<model>-<rev>-<sku>
  const rev = ["A1", "A2", "B1"][seed % 3];
  const sku = String(1000 + (seed % 8999)).slice(-4);
  const pn = `PN-${device.model}-${rev}-${sku}`;
  // Hardware identification code (HWID) — 16-hex string, stable per SN.
  // (Distinct from IMEI / MAC. Used by TOMS to fingerprint the SoC.)
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0").slice(-4);
  const hwid = `${hex(seed)}-${hex(seed >> 8)}-${hex(seed >> 4)}-${hex(seed * 31)}`;
  // Hardware configuration code — 6-digit, encodes the RAM/storage tier.
  const ramTier = device.model === "X800" ? "6" : "4";
  const diskTier = device.storage?.total >= 64 ? "C"
                : device.storage?.total >= 32 ? "B"
                                              : "A";
  const cfg = `${device.model.slice(0, 2)}${ramTier}${diskTier}${String(100 + (seed % 900))}`;
  // Last boot time — peg to the most recent "boot" event if we have one,
  // otherwise derive a plausible recent timestamp.
  const lastBoot = deviceIsOnline(device)  ? "May 12, 2026 08:02"
                 : device.status === "pending" ? null
                                              : "May 09, 2026 06:30";
  // Geo coordinates per store id. Real lat/lng would come from a
  // geocode service; this is a hand-curated map so the placeholder map
  // looks correct (right city, right neighbourhood).
  const STORE_COORDS = {
    "s-coffee-hq":  { lat: 45.5088, lng: -73.5544, city: "Montréal, QC" },
    "s-coffee-pln": { lat: 45.5230, lng: -73.5990, city: "Montréal, QC" },
    "s-coffee-old": { lat: 45.5060, lng: -73.5532, city: "Montréal, QC" },
    "s-bistro-hq":  { lat: 49.2900, lng: -123.1320, city: "Vancouver, BC" },
    "s-bistro-pmt": { lat: 49.2818, lng: -122.8460, city: "Port Moody, BC" },
    "s-glacier-bby":{ lat: 49.2780, lng: -122.9970, city: "Burnaby, BC" },
    "s-pharma-hq":  { lat: 53.5193, lng: -113.5300, city: "Edmonton, AB" },
    "s-books-hq":   { lat: 43.6680, lng: -79.3920,  city: "Toronto, ON" },
  };
  const coords = STORE_COORDS[device.storeId] || { lat: 49.2800, lng: -123.1200, city: "Unknown" };
  return { manufacturer: MFR[device.model] || "—",
           pn, hwid, cfg, lastBoot, coords };
}

// ─── Model-aligned detail facts (DEVICE / DEVICE INFO / DEVICE EXTEND /
//     CLIENT CERT) ─────────────────────────────────────────
// Derived deterministically from the SN so every device shows stable,
// varied values. These back the Basic / Monitoring cards introduced by
// the data-model refactor (PCI version, run mode, client cert, version
// info, lifetime usage counters, printer status, SIM slots, RAM).
function _devSeed(device) {
  return device.sn.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
}

// DEVICE identity + CLIENT CERT (TRANSFER KEY intentionally not exposed).
function deviceIdentityFor(device) {
  const seed = _devSeed(device);
  const hex = (n, len) => (n >>> 0).toString(16).toUpperCase().padStart(len, "0").slice(-len);
  const sha1 = `${hex(seed,8)}:${hex(seed*7,8)}:${hex(seed*13,8)}:${hex(seed*17,4)}`;
  // ACTIVE SIM slot's IMEI is the primary; kiosk/no-SIM units fall back to —.
  const primaryImei = device.imei || null;
  const certCn = `${device.sn}.toms.newland`;
  // 9 = pending → not yet provisioned a client cert.
  const provisioned = device.status !== "pending";
  return {
    certCn,
    pciVersion: device.model === "X800" ? "PCI6" : (seed % 3 === 0 ? "PCI6" : "PCI7"),
    runMode: device.model === "X800" ? "UNATTENDED" : (seed % 4 === 0 ? "UNATTENDED" : "ATTENDED"),
    // OA_SYNC rows are system-created (user 0); IMPORT rows carry an operator.
    creationType: seed % 2 === 0 ? "OA_SYNC" : "IMPORT",
    creationUserId: seed % 2 === 0 ? 0 : (1000 + (seed % 8999)),
    primaryImei,
    clientCert: provisioned ? {
      cn: certCn,
      sha1,
      issuerCn: "Newland Payment Technology US Co., Ltd.",
      expiredDate: ["2027-02-14", "2027-08-30", "2026-11-20", "2028-01-05"][seed % 4],
    } : null,
    clientCertChangeTimes: provisioned ? (seed % 3) : 0,
  };
}

// DEVICE EXTEND · version info bundle.
function versionInfoFor(device) {
  const seed = _devSeed(device);
  const fw = device.firmware || "—";
  const r = (fw.match(/r(\d+)/i) || [])[1] || (100 + seed % 40);
  return {
    firmwareId:     `fw-${device.model.toLowerCase()}-${r}`,
    userVersion:    fw,
    financeApp:     `EMV-Core ${["1.4.7","1.4.5","1.3.9"][seed % 3]}`,
    financeFirmware:`FinFW ${["2.8.1","2.7.4","2.6.0"][seed % 3]}`,
    financeBoot:    `Boot ${["1.2.0","1.1.6"][seed % 2]}`,
    signatureLib:   `SigLib ${["3.0.2","2.9.8"][seed % 2]}`,
    bsp:            `BSP ${["8.2.1","7.4.3","8.2.0"][seed % 3]}`,
    paymentModule:  `PayMod ${["5.1.0","5.0.4","3.8.2"][seed % 3]}`,
    baseband:       device.network?.sim?.enabled ? `BB ${["1.18.2","1.17.0"][seed % 2]}` : "—",
  };
}

// DEVICE INFO · lifetime usage counters + PRINTER STATUS (enum).
// Card-read terminology fixed per data-model review:
//   CONTACT = 插卡 (IC) · MAG STRIPE = 刷卡 (swipe) · CONTACTLESS = 挥卡 (tap)
const PRINTER_STATUS_ENUM = {
  0:    { label: "Normal",          tone: "ok"      },
  2:    { label: "Out of paper",    tone: "warning" },
  4:    { label: "Overheated",      tone: "danger"  },
  8:    { label: "Busy",            tone: "neutral" },
  112:  { label: "Voltage abnormal",tone: "danger"  },
  1024: { label: "Temperature low", tone: "warning" },
  2048: { label: "Cover open",      tone: "warning" },
};
function usageCountersFor(device) {
  const seed = _devSeed(device);
  const v = (mult, base) => base + (seed * mult % base);
  const hasPrinter = device.model !== "X800"; // kiosk/tablet has no built-in printer
  // Pending units have barely been used.
  const scale = device.status === "pending" ? 0.01 : 1;
  const ic = Math.round(v(7, 60000) * scale);
  const swipe = Math.round(v(11, 18000) * scale);
  const tap = Math.round(v(13, 90000) * scale);
  const printerStatusCode = !hasPrinter ? null
    : (device.status === "pending" ? 0
      : [0, 0, 0, 2, 8][seed % 5]);
  return {
    contact: ic, magStripe: swipe, contactless: tap,
    powerCycle: Math.round(v(3, 1400) * scale),
    powerButton: Math.round(v(5, 9000) * scale),
    usbPlug: Math.round(v(9, 600) * scale),
    frontCam: Math.round(v(17, 4000) * scale),
    rearCam: Math.round(v(19, 12000) * scale),
    flash: Math.round(v(23, 8000) * scale),
    printLength: hasPrinter ? Math.round(v(29, 250000) * scale) : null, // mm of paper fed
    totalUpTimeSec: Math.round(v(2, 9_000_000) * scale),
    hasPrinter,
    printerStatusCode,
    printerStatus: printerStatusCode == null ? null
      : (PRINTER_STATUS_ENUM[printerStatusCode] || { label: `Code ${printerStatusCode}`, tone: "neutral" }),
  };
}

// DEVICE INFO · SIM slots (dual-slot). ACTIVE slot carries the primary
// IMEI/IMSI/ICCID; the other may be EMPTY. Kiosk/Ethernet units → [].
function simSlotsFor(device) {
  if (!device.network?.sim?.enabled) return [];
  const seed = _devSeed(device);
  const dig = (n, len) => String(Math.abs(n)).padStart(len, "0").slice(-len);
  const carrier = device.network.sim.carrier || "—";
  const slot1 = {
    slotIndex: 1, slotStatus: "ACTIVE", carrier,
    iccid: `8912230${dig(seed, 12)}`,
    imei: device.imei || `35478211${dig(seed * 3, 7)}`,
    imsi: `30272${dig(seed * 7, 10)}`,
    rssi: -(55 + (seed % 35)),
    ip: `10.${seed % 250}.${(seed >> 3) % 250}.${(seed >> 5) % 250}`,
  };
  // Roughly a third of units carry a populated second slot.
  const hasSlot2 = seed % 3 === 0;
  const slot2 = hasSlot2 ? {
    slotIndex: 2, slotStatus: "INACTIVE", carrier: "—",
    iccid: `8912240${dig(seed * 5, 12)}`,
    imei: `35478212${dig(seed * 9, 7)}`,
    imsi: "—", rssi: null, ip: null,
  } : { slotIndex: 2, slotStatus: "EMPTY", carrier: "—", iccid: null, imei: null, imsi: null, rssi: null, ip: null };
  return [slot1, slot2];
}

// DEVICE INFO · RAM snapshot (total / used MB).
function memorySnapshotFor(device) {
  const seed = _devSeed(device);
  const totalMb = device.model === "X800" ? 6144 : 4096;
  const usedMb = Math.round(totalMb * (0.40 + (seed % 40) / 100));
  return { totalMb, usedMb, pct: Math.round((usedMb / totalMb) * 100) };
}

// ─── Device telemetry (system / network / location / settings) ──
// One-stop helper that produces all the categorized telemetry shown
// on the Monitoring tab. Derived from the seed data so it's stable
// per device but varied enough to demo every state.
function deviceTelemetryFor(device) {
  const seed = device.sn.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
  const rng = (n) => { let x = seed ^ (n * 2654435761); x = (x ^ (x >> 16)) >>> 0; return (x % 1000) / 1000; };
  const pick = (arr, n) => arr[Math.abs(seed + n) % arr.length];
  const isOnline = deviceIsOnline(device);
  const isPending = device.status === "pending";
  const isFlagged = device.hardware?.root || device.hardware?.devMode
                 || (device.hardware?.securityWarnings || []).length > 0;

  // ── Security triggers ─────────────────────────────────
  // Flagged devices report a SAFE trigger with one or more reasons.
  const reasons = [];
  if (device.hardware?.root) reasons.push("HARDWARE");
  if (device.hardware?.devMode) reasons.push("SOFTWARE");
  if ((device.hardware?.securityWarnings || []).length >= 2) reasons.push("BATTERY_LOST_POWER");
  const security = {
    status: isFlagged ? 1 : 0,
    reasons,
    hwAttackCount: isFlagged ? 12 + (seed % 30) : seed % 4,
    swAttackCount: isFlagged ? 1 + (seed % 6) : 0,
    rooted: device.hardware.root,
  };

  // ── Uptime statistics ─────────────────────────────────
  // Boot timestamps + various accumulated runtime windows.
  const bootEpoch = isPending ? null : 1767844296 + (seed % 86400);
  const bootDate  = isPending ? null
                  : isOnline  ? "May 12, 2026 08:02:24"
                              : "May 09, 2026 06:30:11";
  const sessionSec   = isPending ? 0
                     : isOnline  ? 35157 + (seed % 7200)    // ~9h45m + jitter
                                 : 12345;
  const todaySec     = isPending ? 0 : 60000 + (seed % 30000);
  const cumulativeSec= 29916101 + (seed % 200000);          // ~346 days
  const uptime = { bootEpoch, bootDate, sessionSec, todaySec, cumulativeSec };

  // ── Network & connectivity ────────────────────────────
  // Switch states + APN + IP. Every active interface has its own IP and
  // (for wireless) a signal-strength reading in dBm.
  const wifiOn = device.network.wifi.enabled;
  const cellOn = device.network.sim.enabled;
  const ethOn  = device.network.ethernet.enabled;
  const network = {
    type: ethOn  ? "Ethernet"
        : wifiOn ? "WIFI"
        : cellOn ? "Cellular"
                 : "Offline",
    wifi: {
      on: wifiOn,
      ssid: wifiOn ? device.network.wifi.ssid : null,
      ip:   wifiOn && isOnline ? `192.168.${(seed >> 4) % 32}.${(seed % 254) + 1}` : null,
      signalDbm: wifiOn ? -42 - ((seed >> 2) % 38) : null,    // -42 … -80 dBm
      linkMbps:  wifiOn ? 144 + ((seed >> 3) % 290) : null,    // 144 … 433 Mbps
      security:  wifiOn ? "WPA2-PSK" : null,
    },
    cellular: {
      on: cellOn,
      carrier:   cellOn ? device.network.sim.carrier : null,
      ip:        cellOn && isOnline ? `100.${(seed >> 8) % 256}.${seed % 256}.${((seed * 7) % 254) + 1}` : null,
      signalDbm: cellOn ? -68 - ((seed >> 5) % 32) : null,    // -68 … -100 dBm
      network:   cellOn ? pick(["LTE Cat-4", "LTE Cat-6", "5G NR (n78)"], 4) : null,
    },
    ethernet: {
      on: ethOn,
      ip:        ethOn && isOnline ? `10.20.${(seed >> 6) % 256}.${seed % 256}` : null,
      linkMbps:  ethOn ? 1000 : null,
      duplex:    ethOn ? "Full" : null,
    },
    bluetooth: { on: true },
    defaultApn: cellOn ? "3gnet" : null,
    apnConfig: cellOn ? {
      name:     "Default Data",
      apn:      "3gnet",
      mcc:      "302",
      mnc:      device.network.sim.carrier === "Bell"   ? "610"
              : device.network.sim.carrier === "Telus"  ? "220"
              : device.network.sim.carrier === "Rogers" ? "720"
                                                        : "001",
      type:     "default,supl",
      proxy:    "",
      port:     "",
      username: "",
      password: "",
      server:   "",
      mmsc:     "",
      authType: "0 (None)",
      protocol: "IPv4/IPv6",
      roamingProtocol: "IPv4",
      bearer:   "Unspecified",
      mvnoType: "None",
      mvnoMatchData: "",
    } : null,
  };

  // ── Location telemetry ────────────────────────────────
  const meta = deviceMetaFor(device);
  const provider = pick(["QUALCOMM", "BAIDU"], 1);
  const todayLoc = {
    date: "20260512",
    sdk: provider,
    successCount: 18 + (seed % 18),
    failCount: 1 + (seed % 5),
  };
  const yesterdayLoc = {
    date: "20260511",
    sdk: provider,
    successCount: 22 + ((seed >> 4) % 12),
    failCount: 2 + ((seed >> 6) % 6),
  };
  const cellTowers = [
    { cid: 2909450 + (seed % 99999), lac: 11290, mcc: 420, mnc: 3 },
    { cid: 98886405 + ((seed >> 4) % 99999), lac: 24074, mcc: 460, mnc: 11 },
  ];
  const nearbyWifi = [
    { mac: "60:3a:7c:a3:16:5f", level: -31 - (seed % 8) },
    { mac: "a0:63:91:22:8f:ae", level: -50 - (seed % 12) },
    { mac: "f4:f5:24:88:01:32", level: -64 - (seed % 10) },
    { mac: "00:1b:11:32:9a:dc", level: -72 - (seed % 8) },
  ];
  const savedWifi = [
    { id: "ca1bd535ce8a", level: -42, ssid: device.network.wifi.ssid || "—" },
    { id: "9f7c20188031", level: -55, ssid: "guest-network" },
  ];
  const location = {
    gpsOn: isOnline && !isPending,
    provider,
    coords: meta.coords,
    today: todayLoc,
    yesterday: yesterdayLoc,
    cellTowers,
    nearbyWifi,
    savedWifi,
  };

  // ── System settings ───────────────────────────────────
  const settings = {
    language:   device.settings.language,
    timezone:   device.settings.timezone,
    inputMethod: pick(["com.google.android.inputmethod.latin", "com.toms.kbd"], 2),
    brightness: 65 + (seed % 30),         // 0-100
    subBrightness: 50 + ((seed >> 3) % 25),
    mediaVolume: 4 + (seed % 8),          // 0-15
    mediaVolumeMax: 15,
    ringVolume:  6 + ((seed >> 4) % 6),
    ringVolumeMax: 15,
    screenTimeoutMs: 60000,
  };

  // ── Security module switches ──────────────────────────
  // Card-reader / printer enable/disable. Most units leave all on; some
  // disable specific paths (e.g., kiosk has no magstripe / printer).
  const isKiosk = device.model === "X800";
  const modules = {
    magstripe:    !isKiosk,
    insertCard:   true,
    contactless:  true,
    printer:      !isKiosk && device.model !== "S60",
  };

  // ── System state (non-standard flags) ────────────────
  const state = {
    terminalLocked:  !isOnline && !isPending,
    statusBarPulldown: !isKiosk,
    unattendedMode:  isKiosk,
    devUnit:         device.hardware.devMode ? 1 : 0,
    sysParams: {
      "ro.epay.adb":             device.hardware.devMode ? "1" : "0",
      "persist.sys.HasSecModule": isKiosk ? "no" : "yes",
      "ro.toms.fleet":            "production",
      "persist.sys.tamper_ack":   security.status ? "pending" : "clean",
    },
  };

  return { security, uptime, network, location, settings, modules, state,
    collectedAt: {
      pretty:  isOnline  ? "May 12, 2026 14:32:08"
             : isPending ? "—"
                         : "May 09, 2026 06:33:21",
      relative: isOnline  ? "3 min ago"
              : isPending ? "Awaiting first check-in"
                          : "3 days ago",
      stale:    !isOnline && !isPending,
    },
  };
}

function fmtDuration(totalSec) {
  if (!totalSec) return "—";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// ─── List ───────────────────────────────────────────────────
function DevicesListScreen({ navigate }) {
  const all = window.PROD_DEVICES || [];
  const [q, setQ] = useStateD("");
  const [modelFilter, setModelFilter] = useStateD("any");
  const [stateFilter, setStateFilter] = useStateD("any");

  const filtered = useMemoD(() => all.filter(d => {
    if (modelFilter !== "any" && d.model !== modelFilter) return false;
    if (stateFilter !== "any" && d.status !== stateFilter) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!`${d.sn} ${d.model} ${d.merchantId} ${d.imei || ""}`.toLowerCase().includes(n)) return false;
    }
    return true;
  }), [all, q, modelFilter, stateFilter]);

  const totals = useMemoD(() => ({
    total: all.length,
    active: all.filter(d => d.status === "active").length,
    flagged: all.filter(d => d.hardware?.root || d.hardware?.devMode
                            || (d.hardware?.securityWarnings || []).length > 0).length,
    pending: all.filter(d => d.status === "pending").length,
  }), [all]);

  const models = useMemoD(() => [...new Set(all.map(d => d.model))], [all]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <window.PageHeader
        title="Devices"
        subtitle="Production fleet — every Carbon terminal you've activated, with its hardware posture, network, and installed apps." />

      <div style={{ flex: 1, overflow: "auto", background: "var(--color-bg-1)" }}>
        <div style={{ padding: "var(--space-5) var(--space-6) var(--space-3)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { label: "Total devices",   value: totals.total,   sub: "in your fleet" },
              { label: "Active",          value: totals.active,  sub: "checked in recently", tone: "success" },
              { label: "Pending activation", value: totals.pending, sub: "awaiting first contact", tone: totals.pending > 0 ? "info" : undefined },
              { label: "Security flagged", value: totals.flagged, sub: "root / dev-mode / warnings", tone: totals.flagged > 0 ? "warning" : undefined },
            ].map(k => (
              <div key={k.label} style={{
                padding: "12px 16px", borderRadius: "var(--radius-lg)",
                background: "var(--bg2)",
                border: "1px solid var(--border-1)",
                boxShadow: "var(--shadow-1)",
              }}>
                <div className="overline" style={{ fontSize: 10.5 }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                  <span className="mono num" style={{
                    fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em",
                    color: k.tone === "success" ? "var(--success)"
                        : k.tone === "warning" ? "var(--warning)"
                        : k.tone === "info"    ? "var(--info)"
                        : "var(--fg1)",
                  }}>{k.value}</span>
                  <span style={{ fontSize: 11, color: "var(--fg3)" }}>{k.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--space-3) var(--space-6)", flexWrap: "wrap" }}>
          <window.Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search SN, model, IMEI, merchant…"
            prefix={<window.Ico name="search" size={12} />}
            style={{ flex: 1, minWidth: 240, maxWidth: 380 }} />
          <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} style={selectStyle}>
            <option value="any">All models</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={selectStyle}>
            <option value="any">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--fg3)" }}>
            {filtered.length} of {all.length} devices
          </div>
        </div>

        <div style={{ padding: "var(--space-3) var(--space-6) var(--space-6)" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", textAlign: "left" }}>
                    {["Serial number", "Model", "OS / Firmware", "Bound merchant", "Last seen", "Posture", "Status", ""].map((h, i) => (
                      <th key={i} className="overline" style={{
                        padding: "10px 14px", fontSize: 10.5,
                        borderBottom: "1px solid var(--border-1)",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                      No devices match those filters.
                    </td></tr>
                  )}
                  {filtered.map(d => {
                    const merchant = window.findMerchantById?.(d.merchantId);
                    const st = DEVICE_STATE[d.status] || DEVICE_STATE.locked;
                    const flagged = d.hardware?.root || d.hardware?.devMode
                                  || (d.hardware?.securityWarnings || []).length > 0;
                    return (
                      <tr key={d.sn}
                        onClick={() => navigate({ screen: "deviceDetail", deviceSn: d.sn })}
                        style={{ cursor: "pointer", borderBottom: "1px solid var(--border-1)" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{d.sn}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{d.model}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 12.5 }}>{d.os}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{d.firmware}</div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--fg2)" }}>
                          {merchant?.name || "—"}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 11.5, color: "var(--fg2)" }}>
                          <span className="mono">{lastSeenTimestamp(d.lastSeenAt) || d.lastSeenAt}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {flagged ? (
                            <window.Pill tone="warning" dot size="sm">
                              {d.hardware?.root ? "Rooted"
                              : d.hardware?.devMode ? "Dev mode"
                              : `${d.hardware.securityWarnings.length} warning${d.hardware.securityWarnings.length === 1 ? "" : "s"}`}
                            </window.Pill>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--fg3)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <window.Pill tone={st.tone} dot size="sm">{st.label}</window.Pill>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <window.Ico name="chevR" size={14} style={{ color: "var(--fg3)" }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail (tabbed) ───────────────────────────────────────
function DeviceDetailScreen({ device, route, navigate }) {
  const tab = route.tab || "basic";
  const st = deviceStatusMeta(device);
  const online = deviceIsOnline(device);
  const onlineMeta = online ? ONLINE_PILL.online : ONLINE_PILL.offline;
  const merchant = window.findMerchantById?.(device.merchantId);
  const store = merchant?.stores?.find(s => s.id === device.storeId);
  // Owning customer (ISO / ISV) — devices belong to a merchant, the merchant
  // is onboarded by an owning ISO/ISV customer (merchant.isoId → SEED_CUSTOMERS).
  const owner = merchant?.isoId ? (window.SEED_CUSTOMERS || []).find(c => c.id === merchant.isoId) : null;
  const flagged = device.hardware?.root || device.hardware?.devMode
                || (device.hardware?.securityWarnings || []).length > 0;

  // Tab list. (Pre-warning tab removed; Apps & Firmware no longer carries a
  // needs-action count badge.)
  const tabs = [
    { id: "basic",      label: "Basic information" },
    { id: "apps",       label: "Apps & Firmware" },
    { id: "monitoring", label: "Monitoring" },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", background: "var(--color-bg-1)" }}>
      <div className="titlebar titlebar--tabs" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div className="titlebar__inner">
          <div className="titlebar__row">
            <button type="button" className="titlebar__back" title="Back to Devices" aria-label="Back to Devices"
              onClick={() => navigate({ screen: "devices" })}>
              <window.Ico name="chevL" size={18} />
            </button>
            <div className="titlebar__icon"><DeviceModelTile model={device.model} size={48} /></div>
            <div className="titlebar__main">
              <h1 className="titlebar__title titlebar__title--lg" style={{ fontFamily: "var(--font-family-mono)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {device.sn}
                <window.Pill tone={st.tone} dot size="lg">{st.label}</window.Pill>
                {flagged && (
                  <window.Pill tone="warning" dot size="lg">Security attention</window.Pill>
                )}
                <button onClick={() => navigate({ screen: "newTicket", deviceSn: device.sn })}
                  title="New ticket for this device"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: "var(--bg2)", color: "var(--fg2)", border: "1px solid var(--border-1)", cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)", transition: "background .12s ease, color .12s ease, border-color .12s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 10%, transparent)"; e.currentTarget.style.color = "var(--color-primary-700)"; e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-primary-500) 30%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--fg2)"; e.currentTarget.style.borderColor = "var(--border-1)"; }}>
                  <window.Ico name="plus" size={12} stroke={2.2} />
                  New ticket
                </button>
              </h1>
              <div className="titlebar__meta">
                <span className="mono">{device.model}</span>
                <span aria-hidden="true">·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <window.Ico name="building" size={13} style={{ color: "var(--fg4)" }} />
                  {owner ? (
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate({ screen: "customerDetail", customerId: owner.id }); }}
                      style={{ color: "var(--fg1)", textDecoration: "none", fontWeight: 500 }}>{owner.name}</a>
                  ) : <span style={{ color: "var(--fg3)" }}>Unassigned owner</span>}
                </span>
                <span aria-hidden="true">·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <StorefrontGlyph />
                  {merchant ? (
                    <span style={{ color: "var(--fg2)" }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate({ screen: "merchantDetail", merchantId: merchant.id, tab: "terminals" }); }}
                        style={{ color: "var(--fg1)", textDecoration: "none", fontWeight: 500 }}>{merchant.name}</a>
                      {store && (<><span style={{ color: "var(--fg4)" }}> / </span>{store.name}{store.isHQ && (<span style={{ marginLeft: 5, fontSize: 9.5, padding: "1px 5px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.04em", background: "var(--bg3)", color: "var(--fg3)" }}>HQ</span>)}</>)}
                    </span>
                  ) : <span style={{ color: "var(--fg3)" }}>{device.status === "pending" ? "Not bound to a store yet" : "Unbound"}</span>}
                </span>
              </div>
            </div>
            <div className="titlebar__actions">
              <HeaderKpis device={device} />
            </div>
          </div>
          <div className="titlebar__tabs" role="tablist">
            {tabs.map(t => (
              <button key={t.id} className={`titlebar__tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => navigate({ ...route, tab: t.id })}>
                <span>{t.label}</span>
                {t.count != null && (
                  <span className="mono num" style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 999, fontWeight: 600, background: "var(--bg3)", color: "var(--fg3)", border: "1px solid var(--border-1)" }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page">
        {/* Body */}
        <div>
          {tab === "basic"      && <DeviceBasicTab device={device} flagged={flagged} />}
          {tab === "apps"       && <DeviceAppsTab  device={device} firmware={firmwareDeltaFor(device)} />}
          {tab === "monitoring" && <DeviceMonitoringTab device={device} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Basic information ─────────────────────────────
// Layout:
//   - 100% width, responsive. Three rows in a top-down cascade:
//       row 1 (3 cards): Device · Deployment · Network
//       row 2 (2 cards): System · Hardware posture
//       row 3 (full): Location
//     Each row uses `repeat(auto-fit, minmax(…))` so cards reflow into
//     fewer columns as the viewport narrows.
//   - State and runtime-y signals (storage / battery / online) live in
//     the header now, so this tab focuses on identity / deployment /
//     system / hardware-posture / location facts.
function DeviceBasicTab({ device, flagged }) {
  const merchant = window.findMerchantById?.(device.merchantId);
  const store = merchant?.stores?.find(s => s.id === device.storeId);
  const warnings = device.hardware?.securityWarnings || [];
  const meta = deviceMetaFor(device);
  const ident = deviceIdentityFor(device);
  const vinfo = versionInfoFor(device);

  return (
    <div className="device-basic">

      {flagged && <SecurityBanner hardware={device.hardware} />}

      {/* Location — first block (full width) */}
      <window.Card title="Location"
        hint="Last known position reported by the device agent."
        action={
          <window.Button size="sm" ghost icon="refresh"
            onClick={() => window.showToast?.("Position refresh queued — will update on next check-in", "info")}>
            Refresh
          </window.Button>
        }>
        <LocationMap coords={meta.coords} state={device.status} />
      </window.Card>

      {/* Device (incl. hardware posture) · System */}
      <div className="device-basic__row-2">
        <window.Card title="Device">
          <KvTable rows={[
            ["PN",             <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{meta.pn}</span>],
            ["PCI version",    <span className="mono" style={{ fontSize: 13 }}>{ident.pciVersion}</span>],
            ["Cert CN",        <span className="mono" style={{ fontSize: 12 }}>{ident.certCn}</span>],
            ["Created via",    <span style={{ fontSize: 13 }}>{ident.creationType === "OA_SYNC" ? "OA Sync · System" : `Import · user ${ident.creationUserId}`}</span>],
            ["Record created", <span className="mono" style={{ fontSize: 13 }}>{device.createdAt}</span>],
            ["Activated",      device.activatedAt
                ? <span className="mono" style={{ fontSize: 13 }}>{device.activatedAt}</span>
                : <span style={{ fontSize: 12.5, color: "var(--color-warning-700)" }}>Pending</span>],
          ]} />

          {/* Hardware posture — folded into the Device card */}
          <SubSection label={warnings.length > 0
            ? `Hardware posture · ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
            : "Hardware posture"} />
          <KvTable rows={[
            ["Config code",    <span className="mono" style={{ fontSize: 13 }}>{meta.cfg}</span>],
            ["Hardware ID",    <span className="mono" style={{ fontSize: 12.5, color: "var(--fg2)" }}>{meta.hwid}</span>],
            ["Root status",
              <Flag positive={!device.hardware.root}
                positiveLabel="Not rooted"
                negativeLabel="Rooted — device integrity compromised" />],
            ["Developer mode",
              <Flag positive={!device.hardware.devMode}
                positiveLabel="Disabled"
                negativeLabel="Enabled — production devices should keep this off"
                tone="warning" />],
          ]} />
          {warnings.length > 0 && (
            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "var(--warning-bg)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 22%, transparent)",
              borderRadius: "var(--radius-md)",
            }}>
              <div className="overline" style={{
                fontSize: 9.5, color: "var(--color-warning-700)", marginBottom: 6,
              }}>Warnings</div>
              <SecurityList warnings={warnings} />
            </div>
          )}
        </window.Card>

        <window.Card title="System">
          <KvTable rows={[
            ["OS version",     <span className="mono" style={{ fontSize: 13 }}>{device.os}</span>],
            ["Firmware",       <span className="mono" style={{ fontSize: 13 }}>{device.firmware}</span>],
            ["Last boot",      meta.lastBoot
                ? <span className="mono" style={{ fontSize: 13 }}>{window.fmtDateTime(meta.lastBoot)}</span>
                : <span style={{ fontSize: 12.5, color: "var(--fg3)" }}>Never booted</span>],
            ["Timezone",       <span className="mono" style={{ fontSize: 13 }}>{device.settings.timezone}</span>],
            ["Language",       <span className="mono" style={{ fontSize: 13 }}>{device.settings.language}</span>],
            ["Auto timezone",  <YesNo on={device.settings.autoTimezone} />],
            ["Auto time",      <YesNo on={device.settings.autoTime}
                                  warnWhenOff="Manual clocks drift — PCI logs may reject" />],
          ]} />
        </window.Card>
      </div>

      {/* Version info · Client cert */}
      <div className="device-basic__row-2">
        <window.Card title="Version info">
          <KvTable rows={[
            ["Firmware ID",       <span className="mono" style={{ fontSize: 13 }}>{vinfo.firmwareId}</span>],
            ["User version",      <span className="mono" style={{ fontSize: 13 }}>{vinfo.userVersion}</span>],
            ["Finance app",       <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.financeApp}</span>],
            ["Finance firmware",  <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.financeFirmware}</span>],
            ["Finance boot",      <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.financeBoot}</span>],
            ["Signature lib",     <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.signatureLib}</span>],
            ["BSP",               <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.bsp}</span>],
            ["Payment module",    <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.paymentModule}</span>],
            ["Baseband",          <span className="mono" style={{ fontSize: 12.5 }}>{vinfo.baseband}</span>],
          ]} />
        </window.Card>

        <window.Card title="Client cert">
          {ident.clientCert ? (
            <KvTable rows={[
              ["Common name",  <span className="mono" style={{ fontSize: 12 }}>{ident.clientCert.cn}</span>],
              ["SHA-1",        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{ident.clientCert.sha1}</span>],
              ["Issuer",       <span style={{ fontSize: 12.5 }}>{ident.clientCert.issuerCn}</span>],
              ["Expires",      <span className="mono" style={{ fontSize: 13 }}>{ident.clientCert.expiredDate}</span>],
              ["Change count", <span className="mono" style={{ fontSize: 13 }}>{ident.clientCertChangeTimes}</span>],
            ]} />
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "4px 0" }}>
              No client certificate yet — provisioned on activation.
            </div>
          )}
        </window.Card>
      </div>
    </div>
  );
}

// ─── Device model tile (header thumbnail) ──────────────────
// A square tile that stands in for an OEM product photo. Renders a
// stylised silhouette of the model — phone-style for handheld POS units,
// tablet/kiosk form for the X800 line. Sizes are 140 / 70 / 55 / 35 px;
// the header uses 70 by default.
function DeviceModelTile({ model, size = 70 }) {
  const isKiosk = model === "X800";
  const screenInset = Math.round(size * 0.085);
  const radius = Math.round(size * 0.13);
  const screenRadius = Math.round(size * 0.075);
  // Tinted gradient per model so the tile reads as a distinct product.
  const HUES = { N950: 232, N750: 200, S60: 162, S90: 268, X800: 26 };
  const hue = HUES[model] ?? 232;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: radius,
      background: `linear-gradient(155deg,
        oklch(28% 0.05 ${hue}) 0%,
        oklch(38% 0.07 ${hue}) 100%)`,
      boxShadow: "0 4px 14px rgba(15,18,28,.12), inset 0 0 0 1px oklch(20% 0.04 " + hue + ")",
      padding: screenInset,
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Top "speaker" notch — phone form factor only */}
      {!isKiosk && (
        <div style={{
          width: Math.round(size * 0.22), height: Math.round(size * 0.04),
          background: "rgba(0,0,0,.55)", borderRadius: 999,
          margin: "0 auto",
          marginBottom: Math.round(size * 0.02),
        }} />
      )}
      {/* Screen */}
      <div style={{
        flex: 1,
        background: "linear-gradient(165deg, #0b0f18 0%, #161c2a 100%)",
        borderRadius: screenRadius,
        padding: Math.round(size * 0.07),
        display: "flex", flexDirection: "column",
        gap: Math.round(size * 0.04),
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.04)",
      }}>
        {size >= 55 && (
          <>
            <div style={{
              color: "#dde2f0",
              fontSize: Math.max(7, Math.round(size * 0.11)),
              fontWeight: 600, lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}>TOMS</div>
            <div style={{
              color: "#6b7388",
              fontSize: Math.max(6, Math.round(size * 0.075)),
              fontFamily: "var(--font-mono)", lineHeight: 1.1,
            }}>{model}</div>
            <div style={{
              marginTop: "auto",
              display: "flex", flexDirection: "column",
              gap: Math.max(1.5, Math.round(size * 0.025)),
            }}>
              {[88, 64, 78].slice(0, size >= 70 ? 3 : 2).map((w, i) => (
                <div key={i} style={{
                  height: Math.max(2, Math.round(size * 0.035)),
                  background: "#2a3245", borderRadius: 1.5,
                  width: `${w}%`, opacity: 0.85 - i * 0.18,
                }} />
              ))}
            </div>
          </>
        )}
        {size < 55 && (
          <div style={{
            margin: "auto",
            color: "#dde2f0", fontWeight: 700,
            fontSize: Math.round(size * 0.32),
            letterSpacing: "-0.04em",
          }}>{model.slice(0, 1)}</div>
        )}
      </div>
      {/* Bottom "home" pill — phone form factor only */}
      {!isKiosk && size >= 55 && (
        <div style={{
          width: Math.round(size * 0.32), height: Math.round(size * 0.025),
          background: "rgba(255,255,255,.18)", borderRadius: 999,
          margin: `${Math.round(size * 0.02)}px auto 0`,
        }} />
      )}
    </div>
  );
}

// ─── Header connectivity cluster (online · signal · battery) ─
// Icon-only, top-right of the detail header. No labels. The signal glyph
// is driven by the device's CURRENT primary network channel: Wi-Fi → arc
// glyph, cellular → bars, Ethernet → port glyph (no strength). Offline →
// signal greyed + broken-link icon. Signal turns green only when > 2 bars.
// The last check-in timestamp sits underneath.
function HeaderKpis({ device }) {
  const isPending = device.status === "pending";
  const online = !isPending && deviceIsOnline(device);
  const tel = deviceTelemetryFor(device);
  const channel = tel.network.type;                 // "Ethernet" | "WIFI" | "Cellular" | "Offline"
  const isWifi = channel === "WIFI";
  const isCell = channel === "Cellular";
  const isEth  = channel === "Ethernet";

  // bars 0-4 from RSSI (dBm) of the active interface
  const rssi = isWifi ? tel.network.wifi.signalDbm
             : isCell ? tel.network.cellular.signalDbm
             : null;
  const bars = rssi == null ? 0
             : rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;

  // signal color: green only when >2 bars AND online; grey when offline
  const sigColor = !online ? "var(--border-2)"
                 : bars > 2 ? "var(--color-success-700)"
                 : bars === 2 ? "var(--color-warning-700)"
                 : "var(--color-error-700)";

  const GREY = "var(--border-2)";
  const itemStyle = { display: "inline-flex", alignItems: "center", gap: 7, color: "var(--fg1)" };
  const ts = lastSeenTimestamp(device.lastSeenAt);

  return (
    <div style={{ marginLeft: "auto", flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Connection state */}
        <span style={{ ...itemStyle, color: online ? "var(--color-success-700)" : "var(--fg3)" }}
          title={online ? "Connected" : isPending ? "Never connected" : "Disconnected"}>
          {online ? <LinkIco /> : <LinkBrokenIco />}
        </span>

        {/* Signal (per channel) */}
        {isEth ? (
          <span style={{ ...itemStyle, color: online ? "var(--fg2)" : GREY }} title="Ethernet">
            <EthernetIco />
          </span>
        ) : (isWifi || isCell) ? (
          <span style={{ ...itemStyle, color: sigColor }} title={`${isWifi ? "Wi-Fi" : "Cellular"} signal`}>
            {isWifi ? <WifiArcs bars={online ? bars : 0} grey={!online} /> : <CellBars bars={online ? bars : 0} grey={!online} />}
          </span>
        ) : (
          <span style={{ ...itemStyle, color: GREY }} title="No network"><CellBars bars={0} grey /></span>
        )}

        {/* Battery */}
        {device.battery ? (
          <span style={{ ...itemStyle, color: kpiBatteryColor(device.battery.level, online) }} title={`Battery ${device.battery.level}%`}>
            <BatteryIco level={device.battery.level} color={kpiBatteryColor(device.battery.level, online)} />
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{device.battery.level}%</span>
          </span>
        ) : (
          <span style={{ ...itemStyle, color: "var(--fg3)" }} title="Line-powered"><BoltIco /></span>
        )}
      </div>

      {/* Last check-in */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg3)", textAlign: "right", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <ClockMiniIco />
        {isPending || !ts
          ? <span>Never reported</span>
          : <span>Updated <span className="mono">{ts.slice(0, 16)}</span> · {device.lastSeenAt}</span>}
      </div>
    </div>
  );
}

function kpiBatteryColor(level, online) {
  if (!online) return "var(--fg3)";
  if (level < 20) return "var(--color-error-700)";
  if (level < 40) return "var(--color-warning-700)";
  return "var(--fg1)";
}

// ─── Inline glyphs for HeaderKpis (TOMS icon spec: 24×24, 1.5 stroke, round) ──
const KpiSVG = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 22} height={props.size || 22}
    fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {props.children}
  </svg>
);
const LinkIco = () => <KpiSVG><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-11.64-1.5A4 4 0 0 0 6.5 19z" /><path d="M9.5 13.5 11 15l3.5-3.5" /></KpiSVG>;
const LinkBrokenIco = () => <KpiSVG><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-9.2-3.3" /><path d="M6.6 8.2A4.9 4.9 0 0 0 5 9.5 4 4 0 0 0 6.5 19h8" /><path d="M3 3l18 18" /></KpiSVG>;
const EthernetIco = () => <KpiSVG><rect x="3" y="9" width="18" height="10" rx="2" /><path d="M7 9V6h10v3M9 19v2M15 19v2" /></KpiSVG>;
const ClockMiniIco = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.5 1.5" /></svg>;
const BoltIco = () => <KpiSVG><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></KpiSVG>;
// Storefront glyph for the location meta line
const StorefrontGlyph = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg4)", flex: "none" }}>
    <path d="M4 9.5 5.2 4h13.6L20 9.5M4 9.5h16M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5.5 11.5V20h13v-8.5M9 20v-5h4v5" />
  </svg>
);

function WifiArcs({ bars, grey }) {
  const on = (n) => grey ? "var(--border-2)" : bars >= n ? "currentColor" : "var(--border-2)";
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 8.5a16 16 0 0 1 20 0" stroke={on(3)} />
      <path d="M5 12a11 11 0 0 1 14 0" stroke={on(2)} />
      <path d="M8.5 15.5a6 6 0 0 1 7 0" stroke={on(1)} />
      <circle cx="12" cy="19" r="1.1" fill={bars >= 1 && !grey ? "currentColor" : "var(--border-2)"} stroke="none" />
    </svg>
  );
}

function CellBars({ bars, grey }) {
  const heights = [6, 10, 14, 18];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      {heights.map((h, i) => (
        <rect key={i} x={3 + i * 5} y={21 - h} width="3.4" height={h} rx="1"
          fill={!grey && bars >= i + 1 ? "currentColor" : "var(--border-2)"} />
      ))}
    </svg>
  );
}

function BatteryIco({ level, color }) {
  const w = Math.max(2, Math.round(level / 100 * 13));
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7.5" width="17" height="10" rx="2.2" />
      <path d="M21.5 11v3" />
      <rect x="4" y="9.5" width={w} height="6" rx="0.8" fill={color} stroke="none" />
    </svg>
  );
}

// ─── Header stats (storage + battery + online) ────────────
// Compact info strip beside the title. Mirrors header KPI patterns from
// MerchantDetailScreen so the three header artefacts (model tile, title
// block, stats) read as a single banner.
// NOTE: superseded in the device-detail header by HeaderKpis (icon cluster);
// kept here as it is still referenced by other surfaces / future reuse.
function HeaderStats({ device }) {
  const isOnline = deviceIsOnline(device);
  const storagePct = device.storage
    ? Math.round((device.storage.used / device.storage.total) * 100)
    : null;
  const cell = {
    padding: "8px 12px",
    minWidth: 96,
    background: "var(--bg2)",
    border: "1px solid var(--border-1)",
    borderRadius: "var(--radius-md)",
    display: "flex", flexDirection: "column", gap: 2,
  };
  const labelStyle = { fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
    color: "var(--fg3)", fontWeight: 500 };
  const valueStyle = { fontSize: 14, fontWeight: 600, color: "var(--fg1)",
    letterSpacing: "-0.01em", whiteSpace: "nowrap",
    fontFamily: "var(--font-mono)" };
  const subStyle = { fontSize: 10.5, color: "var(--fg3)", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0, flexWrap: "wrap" }}>
      <div style={cell}>
        <span style={labelStyle}>Storage</span>
        <span style={{ ...valueStyle,
          color: storagePct >= 90 ? "var(--color-error-700)"
              : storagePct >= 75 ? "var(--color-warning-700)"
              : "var(--fg1)" }}>
          {device.storage
            ? <>{device.storage.used.toFixed(1)}<span style={{ color: "var(--fg3)", fontWeight: 400 }}>/{device.storage.total}</span></>
            : "—"}
          {storagePct != null && <span style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 400, marginLeft: 4 }}>GB</span>}
        </span>
        {storagePct != null && <span style={subStyle}>{storagePct}% used</span>}
      </div>
      <div style={cell}>
        <span style={labelStyle}>Battery</span>
        <span style={{ ...valueStyle,
          color: device.battery && device.battery.level < 20 ? "var(--color-warning-700)" : "var(--fg1)" }}>
          {device.battery ? `${device.battery.level}%` : "Line"}
        </span>
        <span style={subStyle}>{device.battery ? `${device.battery.health}% health` : "Line-powered"}</span>
      </div>
      <div style={cell}>
        <span style={labelStyle}>Status</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13.5, fontWeight: 600,
          color: isOnline ? "var(--color-success-700)" : "var(--fg2)" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isOnline ? "var(--success)" : "var(--border-2)",
            boxShadow: isOnline ? "0 0 0 3px oklch(70% 0.16 152 / 0.18)" : "none",
          }} />
          {isOnline ? "Online" : device.status === "pending" ? "Pending" : "Offline"}
        </span>
        <span style={subStyle}>{device.lastSeenAt}</span>
      </div>
    </div>
  );
}

// ─── Location map (placeholder map screenshot) ──────────────
// Static SVG that fakes a map tile with road lines and a pin. We don't
// have a real map provider in this prototype, so this is a deliberately
// stylised placeholder — clearly readable as "device location preview"
// without pretending to be a real Google/Mapbox screenshot.
function LocationMap({ coords, state }) {
  const isPending = state === "pending";
  // Deterministic road layout so the map looks the same across renders.
  const seed = (coords.lat * 1000 + coords.lng * 1000) | 0;
  const rng = (n) => { let x = seed ^ (n * 2654435761); x = (x ^ (x >> 16)) >>> 0; return (x % 1000) / 1000; };
  const roads = [];
  for (let i = 0; i < 8; i++) {
    const horiz = rng(i) > 0.5;
    const offset = 30 + rng(i + 20) * 240;
    const width = 2 + rng(i + 40) * 2.5;
    roads.push({ horiz, offset, width });
  }
  // Compact info tile — matches HeaderStats so the location card reads
  // as the same vocabulary of "small blocks" used elsewhere on the page.
  const Tile = ({ label, value, sub, mono = true }) => (
    <div style={{
      padding: "10px 12px",
      background: "var(--bg2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-md)",
      display: "flex", flexDirection: "column", gap: 3, minWidth: 0,
    }}>
      <span style={{
        fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
        color: "var(--fg3)", fontWeight: 500,
      }}>{label}</span>
      <span style={{
        fontSize: 13.5, fontWeight: 500, color: "var(--fg1)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        letterSpacing: "-0.005em",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--fg3)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
    </div>
  );
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, 1fr)",
      gap: 14,
    }}>
      {/* Map */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--border-1)",
        background: "linear-gradient(135deg, oklch(96% 0.02 230) 0%, oklch(93% 0.025 145) 100%)",
      }}>
        <svg viewBox="0 0 400 225" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* Park / green patch */}
          <ellipse cx="80" cy="180" rx="55" ry="32" fill="oklch(88% 0.06 145)" />
          <ellipse cx="330" cy="50" rx="48" ry="26" fill="oklch(88% 0.06 145)" opacity="0.7" />
          {/* Water */}
          <path d="M 0 180 Q 80 220, 200 200 T 400 215 L 400 225 L 0 225 Z"
            fill="oklch(85% 0.06 230)" opacity="0.85" />
          {/* Road grid */}
          {roads.map((r, i) => r.horiz
            ? <line key={i} x1="-10" x2="410" y1={r.offset * 0.6} y2={r.offset * 0.6}
                stroke="oklch(98% 0 0)" strokeWidth={r.width} />
            : <line key={i} x1={r.offset * 1.3} x2={r.offset * 1.3} y1="-10" y2="235"
                stroke="oklch(98% 0 0)" strokeWidth={r.width} />)}
          {/* Road outlines */}
          {roads.map((r, i) => r.horiz
            ? <line key={`o${i}`} x1="-10" x2="410" y1={r.offset * 0.6} y2={r.offset * 0.6}
                stroke="oklch(86% 0.02 230)" strokeWidth={r.width + 1} opacity="0.4" />
            : <line key={`o${i}`} x1={r.offset * 1.3} x2={r.offset * 1.3} y1="-10" y2="235"
                stroke="oklch(86% 0.02 230)" strokeWidth={r.width + 1} opacity="0.4" />).reverse()}
          {/* Building blocks */}
          {[
            [40, 30, 30, 20], [110, 25, 28, 22], [180, 38, 32, 18],
            [250, 28, 26, 24], [310, 45, 30, 20], [60, 95, 32, 22],
            [220, 100, 28, 26], [285, 110, 24, 22], [150, 130, 26, 20],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h}
              fill="oklch(94% 0.005 230)"
              stroke="oklch(82% 0.01 230)" strokeWidth="0.5"
              rx="1.5" opacity="0.85" />
          ))}
          {/* Map pin */}
          <g transform="translate(200, 102)">
            <ellipse cx="0" cy="14" rx="9" ry="3" fill="rgba(0,0,0,.18)" />
            <path d="M 0 -18 C -10 -18, -14 -10, -14 -4 C -14 6, 0 14, 0 14 C 0 14, 14 6, 14 -4 C 14 -10, 10 -18, 0 -18 Z"
              fill={isPending ? "oklch(58% 0.15 240)" : "oklch(55% 0.18 24)"}
              stroke="white" strokeWidth="1.5" />
            <circle cx="0" cy="-6" r="4" fill="white" />
          </g>
        </svg>
        {/* Pending overlay */}
        {isPending && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(255,255,255,.55)",
            display: "grid", placeItems: "center",
            fontSize: 12, color: "var(--fg2)",
          }}>
            <span style={{
              padding: "5px 10px", background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--radius-sm)",
            }}>No fix — device not yet activated</span>
          </div>
        )}
      </div>

      {/* Info tiles — small blocks to the right of the map */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <Tile label="City" value={coords.city} mono={false}
          sub="Derived from GPS coordinates" />
        <Tile label="Coordinates"
          value={<>{coords.lat.toFixed(4)},&nbsp;{coords.lng.toFixed(4)}</>}
          sub="GPS latitude / longitude" />
      </div>
    </div>
  );
}

// ─── Telemetry primitives (used by the Monitoring tab) ─────
// StatTile: square-ish tile with overline label + big mono value + sub.
function StatTile({ label, value, sub, tone, mono = true, valueFont }) {
  const color = tone === "danger"  ? "var(--color-error-700)"
              : tone === "warning" ? "var(--color-warning-700)"
              : tone === "success" ? "var(--color-success-700)"
                                   : "var(--fg1)";
  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--bg2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-md)",
      minWidth: 0,
    }}>
      <div className="overline" style={{ fontSize: 10 }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontSize: valueFont != null ? valueFont : 16, fontWeight: 600,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        letterSpacing: "-0.01em",
        color,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>
      {sub && <div style={{
        marginTop: 2, fontSize: 11, color: "var(--fg3)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{sub}</div>}
    </div>
  );
}

// InterfaceRow: one row per network interface — icon + label + ON/OFF
// switch, with optional IP, signal strength and per-interface badges
// (SSID, link speed, carrier, security, etc).
function InterfaceRow({ label, icon, on, primary, ip, signalDbm, badges = [], onEdit }) {
  const sigLabel = signalDbm == null ? null
    : signalDbm > -55 ? "Excellent"
    : signalDbm > -65 ? "Good"
    : signalDbm > -75 ? "Fair"
                      : "Weak";
  const sigColor = signalDbm == null ? "var(--fg3)"
    : signalDbm > -65 ? "var(--color-success-700)"
    : signalDbm > -75 ? "var(--fg2)"
                      : "var(--color-warning-700)";
  return (
    <div style={{
      padding: "10px 12px",
      background: on
        ? (primary ? "var(--color-primary-50)" : "var(--bg2)")
        : "var(--bg2)",
      border: "1px solid",
      borderColor: primary && on
        ? "color-mix(in oklab, var(--color-primary-500) 25%, transparent)"
        : "var(--border-1)",
      borderRadius: "var(--radius-md)",
      display: "grid",
      gridTemplateColumns: onEdit
        ? "32px minmax(120px, 1fr) auto 32px"
        : "32px minmax(120px, 1fr) auto",
      gap: 12, alignItems: "center",
      opacity: on ? 1 : 0.7,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: "var(--radius-sm)",
        background: on ? (primary ? "var(--color-primary-100)" : "var(--bg3)") : "var(--bg3)",
        color: on ? (primary ? "var(--color-primary-700)" : "var(--fg2)") : "var(--fg3)",
        display: "grid", placeItems: "center",
        border: "1px solid", borderColor: "var(--border-1)",
      }}>
        <window.Ico name={icon} size={14} stroke={1.8} />
      </span>

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>{label}</span>
          {primary && on && (
            <span style={{
              fontSize: 9.5, padding: "1px 6px", borderRadius: 3,
              background: "var(--color-primary-100)", color: "var(--color-primary-700)",
              fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.06em",
            }}>PRIMARY</span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
            color: on ? "var(--color-success-700)" : "var(--fg3)",
          }}>{on ? "ON" : "OFF"}</span>
        </div>
        {on && badges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10,
            fontSize: 11.5, color: "var(--fg2)", lineHeight: 1.4 }}>
            {badges.map((b, i) => (
              <span key={i}>
                <span style={{ color: "var(--fg3)" }}>{b.label} </span>
                <span className={b.mono ? "mono" : undefined}
                  style={{ fontWeight: 500, color: "var(--fg1)" }}>{b.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {ip && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 8px",
            background: "var(--bg1)", border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-sm)",
          }}>
            <span className="overline" style={{ fontSize: 9, letterSpacing: "0.06em" }}>IP</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg1)" }}>{ip}</span>
          </span>
        )}
        {signalDbm != null && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11.5 }}>
            <SignalBars dbm={signalDbm} />
            <span className="mono" style={{ fontWeight: 500, color: sigColor }}>{signalDbm} dBm</span>
            <span style={{ color: "var(--fg3)" }}>· {sigLabel}</span>
          </span>
        )}
        {on && !ip && signalDbm == null && (
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>—</span>
        )}
      </div>

      {onEdit && (
        <button type="button" onClick={onEdit}
          title={`Change · ${label}`}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: "transparent", border: "1px solid var(--border-1)",
            cursor: "pointer", display: "grid", placeItems: "center",
            color: "var(--fg2)", flexShrink: 0,
          }}>
          <window.Ico name="edit" size={12} stroke={1.8} />
        </button>
      )}
    </div>
  );
}

// SwitchRow: overline label + value (or ON/OFF chip). Shape matches
// the StatTile so they sit next to each other cleanly.
function SwitchRow({ label, on, value, detail, mono, tone }) {
  const showSwitch = typeof on === "boolean";
  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--bg2)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-md)",
      minWidth: 0,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div className="overline" style={{ fontSize: 10 }}>{label}</div>
      {showSwitch ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: on ? "var(--success)" : "var(--border-2)",
            boxShadow: on ? "0 0 0 3px oklch(70% 0.16 152 / 0.16)" : "none",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 600,
            color: on ? "var(--color-success-700)" : "var(--fg3)" }}>
            {on ? "ON" : "OFF"}
          </span>
          {detail && <span style={{ marginLeft: 4, fontSize: 12, color: "var(--fg2)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>}
        </div>
      ) : (
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: tone === "warning" ? "var(--color-warning-700)" : "var(--fg1)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{value}</div>
      )}
    </div>
  );
}

// ModuleRow: icon + label on the left, ON/OFF pill on the right.
function ModuleRow({ label, icon, on }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: on ? "oklch(96% 0.025 152)" : "var(--bg2)",
      border: "1px solid",
      borderColor: on ? "color-mix(in oklab, var(--color-success-500) 18%, transparent)"
                      : "var(--border-1)",
      borderRadius: "var(--radius-md)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: "var(--radius-sm)",
        background: on ? "var(--color-success-50)" : "var(--bg3)",
        color: on ? "var(--color-success-700)" : "var(--fg3)",
        display: "grid", placeItems: "center",
        border: "1px solid",
        borderColor: on ? "color-mix(in oklab, var(--color-success-500) 25%, transparent)"
                        : "var(--border-1)",
        flexShrink: 0,
      }}>
        <window.Ico name={icon} size={14} stroke={1.8} />
      </span>
      <span style={{ flex: 1, fontSize: 13, color: "var(--fg1)" }}>{label}</span>
      <span style={{
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em",
        padding: "3px 8px", borderRadius: 999,
        background: on ? "var(--color-success-50)" : "var(--bg3)",
        color: on ? "var(--color-success-700)" : "var(--fg3)",
        border: "1px solid",
        borderColor: on ? "color-mix(in oklab, var(--color-success-500) 25%, transparent)"
                        : "var(--border-2)",
      }}>{on ? "ENABLED" : "DISABLED"}</span>
    </div>
  );
}

// SignalBars: 4-bar Wi-Fi/cell signal indicator based on dBm.
function SignalBars({ dbm }) {
  const strength = dbm > -50 ? 4 : dbm > -60 ? 3 : dbm > -70 ? 2 : dbm > -80 ? 1 : 0;
  const color = strength >= 3 ? "var(--color-success-500)"
              : strength === 2 ? "var(--fg2)"
                               : "var(--color-warning-500)";
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 12 }}>
      {[3, 6, 9, 12].map((h, i) => (
        <span key={i} style={{
          width: 2.5, height: h, borderRadius: 1,
          background: i < strength ? color : "var(--border-2)",
        }} />
      ))}
    </span>
  );
}

// Slider: read-only mini progress bar with label + value.
function Slider({ label, value, max, unit }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--fg2)" }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg1)" }}>
          {value}{unit ? unit : <span style={{ color: "var(--fg3)", fontWeight: 400 }}>/{max}</span>}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "var(--color-bg-3)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%",
          background: "var(--color-primary-500)", transition: "width .2s ease" }} />
      </div>
    </div>
  );
}

// Compact KPI tile — matches MerchantDetailScreen's KpiTile style so the
// device detail blends with the rest of the app's KPI strips.
function KpiTile({ label, value, sub, tone, mono }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: "var(--radius-md)",
      background: "var(--bg2)", border: "1px solid var(--border-1)",
      minWidth: 0,
    }}>
      <div className="overline" style={{ fontSize: 10 }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontSize: 17, fontWeight: 500,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        letterSpacing: "-0.01em",
        color: tone === "success" ? "var(--color-success-700)"
            : tone === "danger"  ? "var(--color-error-700)"
            : tone === "warning" ? "var(--color-warning-700)"
            : "var(--fg1)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        display: "flex", alignItems: "baseline", gap: 4,
      }}>{value}</div>
      {sub && <div style={{
        marginTop: 2, fontSize: 11, color: "var(--fg3)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{sub}</div>}
    </div>
  );
}

// Tight key-value table — same shape used in MerchantDetailScreen's
// VarSheet panels (100px label · minmax(0,1fr) value, rowGap 6).
// Sub-section heading inside a card — small overline with a top divider,
// used to fold a related group (Hardware posture, Version info) into a card.
function SubSection({ label }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 8, paddingTop: 12, borderTop: "1px solid var(--color-border-subtle)" }}>
      <div className="overline" style={{ fontSize: 9.5, color: "var(--fg3)", letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

function KvTable({ rows }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "118px minmax(0, 1fr)",
      rowGap: 7, columnGap: 12,
      alignItems: "baseline",
    }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <span className="overline" style={{
            fontSize: 9.5, paddingTop: 2, letterSpacing: "0.06em",
          }}>{k}</span>
          <span style={{
            fontSize: 13, color: "var(--color-text-primary)", minWidth: 0,
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
          }}>{v}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Tab 2: Apps & Firmware ───────────────────────────────
// REQUEST-centric per the data-model refactor: each row is a REQUEST_APP
// the ISO configured for this terminal, joined against the device's
// INSTALLED_APPS + most-recent DEVICE_EVENT to derive a live status
// (window.deriveAppStatus). The device-side event log (DEVICE_EVENT)
// lives at the bottom of this tab — migrated out of Monitoring.
const APP_STATUS_META = {
  installed:     { tone: "success", label: "Installed" },
  needs_upgrade: { tone: "warning", label: "Needs upgrade" },
  not_installed: { tone: "neutral", label: "Not installed" },
  downloading:   { tone: "info",    label: "Downloading" },
  failed:        { tone: "danger",  label: "Failed" },
};
const APP_URGENCY_META = {
  casual:    { label: "Casual",    tone: "neutral" },
  immediate: { label: "Immediate", tone: "danger"  },
  custom:    { label: "Custom",    tone: "info"    },
};
const APP_NETWORK_LABEL = {
  noRestriction: "No restriction",
  wifiOrEthernet: "Wi-Fi / Ethernet only",
  wifiOrEthernetOrCellularUnderCap: "Wi-Fi / Ethernet + Cellular (under cap)",
};
const APP_UPGRADE_TIME_LABEL = {
  immediate: "Immediate",
  onTheNextBoot: "On next boot",
  nextBootOrAfter10MinIdle: "Next boot or 10 min idle",
  sc: "Scheduled (install windows)",
};
const APP_EVENT_META = {
  app_download_started:    { bucket: "download", tone: "info",    label: "Download started" },
  app_download_succeeded:  { bucket: "download", tone: "success", label: "Download succeeded" },
  app_download_failed:     { bucket: "download", tone: "danger",  label: "Download failed" },
  app_install_succeeded:   { bucket: "install",  tone: "success", label: "Installed" },
  app_install_failed:      { bucket: "install",  tone: "danger",  label: "Install failed" },
  user_postponed_upgrade:  { bucket: "user",     tone: "warning", label: "User postponed upgrade" },
  user_confirmed_upgrade:  { bucket: "user",     tone: "info",    label: "User confirmed upgrade" },
  app_uninstalled:         { bucket: "install",  tone: "warning", label: "App uninstalled" },
  firmware_sync_succeeded: { bucket: "ota",      tone: "info",    label: "Firmware sync" },
};
const APP_EVENT_BUCKETS = [
  { id: "all",      label: "All" },
  { id: "install",  label: "Install" },
  { id: "download", label: "Download" },
  { id: "user",     label: "User action" },
  { id: "ota",      label: "OTA" },
];
// Shared input style for the Event log query bar (date inputs + select).
const evtInputStyle = {
  height: 36, padding: "0 10px", width: "100%", boxSizing: "border-box",
  border: "1px solid var(--border-2)", borderRadius: "var(--radius-md)",
  background: "var(--bg2)", color: "var(--fg1)",
  fontSize: 12.5, fontFamily: "inherit",
};

// Searchable select — DS-aligned filterable dropdown for when the option
// set can be long (e.g. event types). Button shows the current choice;
// the open panel has a type-to-filter input above the option list.
function SearchableSelect({ value, options, onChange, placeholder = "Select…", width = "100%" }) {
  const { useState, useRef, useEffect } = React;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const selected = options.find((o) => o.value === value) || null;
  const n = q.trim().toLowerCase();
  const filtered = !n ? options
    : options.filter((o) => o.label.toLowerCase().includes(n));

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ ...evtInputStyle, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: selected ? "var(--fg1)" : "var(--fg3)" }}>
          {selected ? selected.label : placeholder}
        </span>
        <window.Ico name="chevD" size={12} style={{ color: "var(--fg3)", flex: "none" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, width: "100%", minWidth: 220, zIndex: 50,
          background: "var(--bg2)", border: "1px solid var(--border-2)", borderRadius: 8,
          boxShadow: "0 14px 36px -8px oklch(0% 0 0 / 0.18)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg1)",
              border: "1px solid var(--border-1)", borderRadius: 6, padding: "5px 8px" }}>
              <window.Ico name="search" size={11} style={{ color: "var(--fg3)" }} />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Filter types…"
                style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 12.5, fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>No matches</div>
            ) : filtered.map((o) => {
              const on = o.value === value;
              return (
                <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer",
                    color: on ? "var(--color-primary-700)" : "var(--fg1)",
                    background: on ? "var(--color-primary-50)" : "transparent",
                    borderLeft: on ? "2px solid var(--color-primary-500)" : "2px solid transparent" }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--bg3)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                  {o.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const APP_TONE_DOT = {
  info:    "var(--color-info-500)",
  success: "var(--color-success-500)",
  warning: "var(--color-warning-500)",
  danger:  "var(--color-error-500)",
  neutral: "var(--color-border-default)",
};
function fmtEventTime(iso) {
  if (!iso) return "—";
  return window.fmtDateTime(iso);
}

// Strategy detail modal — opens from a REQUEST_APP's strategy chip.
function AppStrategyModal({ app, onClose }) {
  const s = app?.strategy;
  const urg = APP_URGENCY_META[s?.upgradeStrategy] || APP_URGENCY_META.casual;
  return (
    <window.Modal open={!!app} onClose={onClose} width={520}
      title={`Update strategy — ${app?._appName || app?.pkgName || ""}`}>
      {s ? (
        <KvTable rows={[
          ["Urgency",      <window.Pill tone={urg.tone} size="sm" dot>{urg.label}</window.Pill>],
          ["Network",      <span style={{ fontSize: 13 }}>{APP_NETWORK_LABEL[s.networkRequest] || s.networkRequest}</span>],
          ["Upgrade time", <span style={{ fontSize: 13 }}>{APP_UPGRADE_TIME_LABEL[s.upgradeTime] || s.upgradeTime}</span>],
          ...(s.cellularCap != null
            ? [["Cellular cap", <span className="mono" style={{ fontSize: 13 }}>{s.cellularCap} MB</span>]] : []),
          ...((s.installWindows && s.installWindows.length)
            ? [["Install windows", <span className="mono" style={{ fontSize: 12.5 }}>{s.installWindows.map(w => `${window.fmtTime(w.start)} – ${window.fmtTime(w.end)}`).join(", ")}</span>]] : []),
        ]} />
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--fg3)" }}>No strategy configured for this app.</div>
      )}
    </window.Modal>
  );
}

function DeviceAppsTab({ device, firmware }) {
  const da     = window.getDeviceApp?.(device.sn) || null;
  const req    = da?.requestApps || [];
  const synced = !!da?.syncTimestamp;
  const events = useMemoD(() => window.getDeviceEvents?.(device.sn) || [], [device.sn]);
  const vinfo  = useMemoD(() => versionInfoFor(device), [device]);
  const [pushConfirm, setPushConfirm] = useStateD(null);
  const [stratApp, setStratApp] = useStateD(null);
  // Event log — collapsed by default; no data loads until the operator
  // runs a query (date range + type). Results paginate 25 at a time.
  const EVT_PAGE = 25;
  const [evtExpanded, setEvtExpanded] = useStateD(false);
  const [evtDraft, setEvtDraft] = useStateD({ from: "", to: "", type: "all" });
  const [evtQuery, setEvtQuery] = useStateD(null); // null until first Search
  const [evtErr, setEvtErr] = useStateD(null); // { from?, to? } inline validation
  const [evtVisible, setEvtVisible] = useStateD(EVT_PAGE);

  // Join each REQUEST_APP against INSTALLED_APPS + most-recent event.
  const rows = req.map((r) => {
    const inst   = (da?.installedApps || []).find((i) => i.pkgName === r.pkgName) || null;
    const recent = events.find((e) => e.pkgName === r.pkgName) || null;
    const status = window.deriveAppStatus
      ? window.deriveAppStatus(r, inst, recent)
      : (inst && inst.versionCode >= r.versionCode ? "installed" : "not_installed");
    return { r, inst, status };
  });
  const counts = {
    configured:  rows.length,
    installed:   rows.filter((x) => x.status === "installed").length,
    needsAction: rows.filter((x) => ["needs_upgrade", "not_installed", "downloading"].includes(x.status)).length,
    failed:      rows.filter((x) => x.status === "failed").length,
  };

  // Type options for the query — model order, only types present on device.
  const presentTypes = useMemoD(() => {
    const order = Object.keys(APP_EVENT_META);
    const seen = new Set(events.map((e) => e.eventType));
    return order.filter((t) => seen.has(t));
  }, [events]);

  // Results reflect the APPLIED query only. Null query → nothing loaded.
  const queriedEvents = useMemoD(() => {
    if (!evtQuery) return [];
    const fromMs = evtQuery.from ? Date.parse(evtQuery.from + "T00:00:00") : -Infinity;
    const toMs   = evtQuery.to   ? Date.parse(evtQuery.to   + "T23:59:59") :  Infinity;
    return events.filter((e) => {
      if (evtQuery.type !== "all" && e.eventType !== evtQuery.type) return false;
      const t = Date.parse(e.eventTime);
      return t >= fromMs && t <= toMs;
    });
  }, [events, evtQuery]);

  const shownEvents = queriedEvents.slice(0, evtVisible);

  const setEvtField = (key, val) => {
    setEvtDraft((d) => ({ ...d, [key]: val }));
    if (evtErr) setEvtErr(null); // clear stale validation on edit
  };
  const validateEvtDates = (d) => {
    // A range needs a start: an end-only filter is rejected.
    if (d.to && !d.from) return { from: "Enter a start date for the range" };
    if (d.from && d.to && Date.parse(d.from) > Date.parse(d.to)) {
      return { to: "End date is before the start date" };
    }
    return null;
  };
  const runEvtSearch = () => {
    const err = validateEvtDates(evtDraft);
    if (err) { setEvtErr(err); return; }
    setEvtErr(null);
    setEvtQuery({ ...evtDraft });
    setEvtVisible(EVT_PAGE);
  };
  const resetEvtSearch = () => {
    setEvtDraft({ from: "", to: "", type: "all" });
    setEvtErr(null);
    setEvtQuery(null);
    setEvtVisible(EVT_PAGE);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Firmware status card */}
      <window.Card title="Firmware"
        action={firmware?.behind && (
          <window.Button primary size="sm" icon="upload"
            onClick={() => setPushConfirm({
              kind: "firmware",
              title: <>Push firmware update?</>,
              body: <>
                The device will download <b className="mono">{firmware.target.version}</b> on next check-in and reboot
                to install. Active transactions will be drained first.
                {firmware.target.notes && (
                  <div style={{
                    marginTop: 10, padding: "8px 10px",
                    background: "var(--bg2)", border: "1px solid var(--border-1)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12, color: "var(--fg2)", lineHeight: 1.5,
                  }}><b style={{ color: "var(--fg1)" }}>Release notes:</b> {firmware.target.notes}</div>
                )}
              </>,
              confirmLabel: "Queue firmware push",
              toast: `Firmware push queued · ${firmware.target.version}`,
            })}>
            Push update
          </window.Button>
        )}>
        {firmware && !firmware.behind ? (
          /* Up to date — single compact row, no redundant side-by-side */
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px",
            background: "oklch(96% 0.03 152)",
            border: "1px solid color-mix(in oklab, var(--color-success-500) 28%, transparent)",
            borderRadius: "var(--radius-md)",
          }}>
            <span style={{
              display: "grid", placeItems: "center", width: 28, height: 28, flex: "none",
              borderRadius: "50%", background: "color-mix(in oklab, var(--color-success-500) 18%, transparent)",
              color: "var(--color-success-700)",
            }}>
              <window.Ico name="check" size={16} stroke={2.4} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-success-700)" }}>{device.firmware}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-success-700)" }}>Up to date</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 3 }}>
                Latest for this model · released <span className="mono">{firmware.target.releasedAt}</span>
                <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                <span className="mono">{vinfo.firmwareId}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Behind — side-by-side Current → Update available */
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 32px 1fr", alignItems: "center", gap: 8,
          }}>
            <div style={{
              padding: "12px 14px", background: "var(--bg2)",
              border: "1px solid var(--border-2)", borderRadius: "var(--radius-md)",
            }}>
              <div className="overline" style={{ fontSize: 10, marginBottom: 4 }}>Current</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--fg1)" }}>
                {device.firmware}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg3)", marginTop: 4 }}>
                {vinfo.firmwareId}
              </div>
            </div>
            <div style={{ display: "grid", placeItems: "center" }}>
              <window.Ico name="arrowR" size={18} style={{ color: "var(--warning)" }} />
            </div>
            <div style={{
              padding: "12px 14px", background: "var(--warning-bg)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
              borderRadius: "var(--radius-md)",
            }}>
              <div className="overline" style={{ fontSize: 10, marginBottom: 4, color: "var(--color-warning-700)" }}>
                Update available
              </div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-warning-700)" }}>
                {firmware?.target.version || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-warning-700)", marginTop: 4 }}>
                Released <span className="mono">{firmware?.target.releasedAt}</span>
                {firmware?.behindBy > 0 && (
                  <> · <b>{firmware.behindBy}</b> build{firmware.behindBy === 1 ? "" : "s"} behind</>
                )}
              </div>
            </div>
          </div>
        )}
        {firmware?.behind && firmware?.target.notes && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg3)", lineHeight: 1.55 }}>
            <b style={{ color: "var(--fg2)" }}>Release notes:</b> {firmware.target.notes}
          </div>
        )}
      </window.Card>

      {/* Configured apps — one row per REQUEST_APP */}
      <window.Card title="Configured apps">
        {rows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "4px 0" }}>
            No apps configured for this device yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {["App", "Installed", "Target", "Strategy", "Status"].map((h, i) => (
                    <th key={i} style={{
                      padding: "8px 12px", fontSize: 11, fontWeight: 500,
                      color: "var(--fg3)", textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background: "var(--bg3)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r, inst, status }, i) => {
                  const sMeta = APP_STATUS_META[status] || { tone: "neutral", label: status };
                  const urg = APP_URGENCY_META[r.strategy?.upgradeStrategy] || APP_URGENCY_META.casual;
                  const behind = inst && inst.versionCode < r.versionCode;
                  return (
                    <tr key={r.pkgName} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AppLogo seed={r.pkgName} name={r._appName || r.pkgName} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r._appName || r.pkgName}</div>
                            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{r.pkgName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {inst
                          ? <span className="mono" style={{ fontSize: 12,
                              color: behind ? "var(--color-warning-700)" : "var(--fg1)",
                              fontWeight: behind ? 500 : 400 }}>{inst.versionName}</span>
                          : <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--fg3)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{r.versionName}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button type="button"
                          onClick={() => setStratApp(r)}
                          title="View strategy detail"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: "var(--radius-full)",
                            border: `1px solid ${APP_TONE_DOT[urg.tone]}`,
                            background: "transparent", cursor: "pointer",
                            fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
                            textTransform: "uppercase", color: "var(--fg2)",
                            fontFamily: "var(--font-mono)",
                          }}>
                          {urg.label}
                          <window.Ico name="info" size={10} style={{ opacity: 0.7 }} />
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <window.Pill tone={sMeta.tone} dot size="sm">{sMeta.label}</window.Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </window.Card>

      {/* Event log (DEVICE_EVENT) — collapsed by default; query to load */}
      <window.Card title="Event log"
        action={
          <button type="button" onClick={() => setEvtExpanded((o) => !o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-2)", background: "var(--bg2)",
              color: "var(--fg2)", fontSize: 11.5, fontWeight: 500, cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary-500)"; e.currentTarget.style.color = "var(--color-primary-700)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--fg2)"; }}>
            {evtExpanded
              ? <>Collapse <window.Ico name="chevu" size={12} /></>
              : <>Expand <window.Ico name="chevD" size={12} /></>}
          </button>
        }>
        {!evtExpanded ? (
          <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "2px 0" }}>
            Expand to query device events by date range and type.
          </div>
        ) : (
          <>
            {/* Query bar — DS Field (label above, control below); draft
                state, nothing loads until Search. */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 160 }}>
                <window.Field label="From" error={evtErr?.from || null}>
                  <input type="date" value={evtDraft.from}
                    onChange={(e) => setEvtField("from", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runEvtSearch(); }}
                    style={{ ...evtInputStyle, borderColor: evtErr?.from ? "var(--color-error-500)" : "var(--border-2)" }} />
                </window.Field>
              </div>
              <div style={{ width: 160 }}>
                <window.Field label="To" error={evtErr?.to || null}>
                  <input type="date" value={evtDraft.to}
                    onChange={(e) => setEvtField("to", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runEvtSearch(); }}
                    style={{ ...evtInputStyle, borderColor: evtErr?.to ? "var(--color-error-500)" : "var(--border-2)" }} />
                </window.Field>
              </div>
              <div style={{ width: 220 }}>
                <window.Field label="Event type">
                  <SearchableSelect
                    value={evtDraft.type}
                    onChange={(v) => setEvtField("type", v)}
                    options={[
                      { value: "all", label: "All types" },
                      ...presentTypes.map((t) => ({ value: t, label: (APP_EVENT_META[t] || { label: t }).label })),
                    ]} />
                </window.Field>
              </div>
              <window.Button primary icon="search" onClick={runEvtSearch}>Search</window.Button>
              {evtQuery && (
                <button type="button" onClick={resetEvtSearch}
                  style={{
                    height: 36, padding: "0 12px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-2)", background: "transparent",
                    color: "var(--fg2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  Reset
                </button>
              )}
            </div>

            {!evtQuery ? (
              <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "8px 0 4px" }}>
                Set a date range and event type, then click <b style={{ color: "var(--fg2)" }}>Search</b> to load events.
              </div>
            ) : queriedEvents.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "8px 0 4px" }}>
                No events match this query.
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0 }}>
                  {shownEvents.map((e, i) => {
                    const meta = APP_EVENT_META[e.eventType] || { tone: "neutral", label: e.eventTypeLabel || e.eventType };
                    const appName = (req.find((r) => r.pkgName === e.pkgName) || {})._appName || e.pkgName;
                    const isLast = i === shownEvents.length - 1;
                    return (
                      <li key={e.id || i} style={{ display: "flex", gap: 12, alignItems: "flex-start",
                        paddingBottom: isLast ? 0 : 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 3 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: APP_TONE_DOT[meta.tone] || APP_TONE_DOT.neutral }} />
                          {!isLast && (
                            <span style={{ width: 1, flex: 1, marginTop: 2, background: "var(--color-border-subtle)", minHeight: 16 }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)" }}>{meta.label}</span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{fmtEventTime(e.eventTime)}</span>
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, color: "var(--fg3)", lineHeight: 1.5 }}>
                            {e.eventType === "firmware_sync_succeeded"
                              ? <>OTA{e.versionName ? <> · <span className="mono">{e.versionName}</span></> : null}</>
                              : <><span style={{ color: "var(--fg2)" }}>{appName}</span>{e.versionName ? <> · <span className="mono">{e.versionName}</span></> : null}</>}
                            {e.eventDuration != null && e.eventDuration > 0 && (
                              <> · <span className="mono">{e.eventDuration}s</span></>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {queriedEvents.length > evtVisible && (
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                    <button type="button" onClick={() => setEvtVisible((v) => v + EVT_PAGE)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: "var(--radius-full)",
                        border: "1px solid var(--border-2)", background: "var(--bg2)",
                        color: "var(--fg2)", fontSize: 12, fontWeight: 500, cursor: "pointer",
                      }}
                      onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = "var(--color-primary-500)"; ev.currentTarget.style.color = "var(--color-primary-700)"; }}
                      onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "var(--border-2)"; ev.currentTarget.style.color = "var(--fg2)"; }}>
                      <window.Ico name="chevD" size={13} />
                      Load more
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </window.Card>

      {/* Firmware push confirmation */}
      <window.ConfirmDialog
        open={!!pushConfirm}
        onClose={() => setPushConfirm(null)}
        title={pushConfirm?.title}
        body={pushConfirm?.body}
        icon="package"
        confirmLabel={pushConfirm?.confirmLabel || "Confirm"}
        tone="primary"
        onConfirm={() => {
          if (pushConfirm?.toast) window.showToast?.(pushConfirm.toast, "success");
          setPushConfirm(null);
        }} />

      {/* Strategy detail modal */}
      <AppStrategyModal app={stratApp} onClose={() => setStratApp(null)} />
    </div>
  );
}

// ─── Tab 3: Monitoring ─────────────────────────────────────
// Two layouts available; switch via Tweaks → Monitoring tab → Layout.
//   • "current"  — original ordering (kept for comparison)
//   • "proposed" — re-ordered for ticket-handler workflow:
//       Health strip → Security modules + System state → SIM →
//       Security & uptime detail → Network → System settings →
//       Location → Event log → Memory probe.
//     Also: inline "Change…" affordance on Security modules and
//     System state rows, batched into a Pending changes pill.
function DeviceMonitoringTab(props) {
  // The "current vs proposed" A/B comparison was retired during the
  // data-model refactor; the proposed ordering is the single layout.
  return <DeviceMonitoringTabProposed {...props} />;
}

// ─── V2 helpers (only used by DeviceMonitoringTabProposed) ──

// Health strip: a single horizontal row of small status tiles that
// summarizes the most operationally-important signals. Replaces the
// "Last collected" banner's role as the top-of-page status moment.
function MonHealthStrip({ device, runtime, t }) {
  const tiles = [];
  const mem = memSummaryFor(device);

  // Primary network
  const primary = t.network.type;
  const sigDbm = primary === "WIFI" ? t.network.wifi.signalDbm
              : primary === "Cellular" ? t.network.cellular.signalDbm
              : null;
  const sigLabel = sigDbm == null ? null
    : sigDbm > -55 ? "Excellent"
    : sigDbm > -65 ? "Good"
    : sigDbm > -75 ? "Fair"
    : "Weak";
  tiles.push({
    key: "net",
    label: "Primary network",
    value: primary === "Offline" ? "Offline" : primary,
    sub: sigLabel ? `${sigLabel} · ${sigDbm} dBm` : null,
    tone: primary === "Offline" ? "warning"
         : (sigDbm != null && sigDbm < -75) ? "warning" : "neutral",
  });

  // Root state — promoted in front of storage/memory because a rooted
  // device is the single most important security signal.
  tiles.push({
    key: "root",
    label: "Root",
    value: t.security.rooted ? "Rooted" : "Intact",
    sub: t.security.rooted ? "Device compromised" : "Integrity OK",
    tone: t.security.rooted ? "danger" : "ok",
  });

  // Storage — lead with the used ratio (percent), GB as the detail.
  if (device.storage) {
    const used = device.storage.used;
    const total = device.storage.total;
    const pct = Math.round((used / total) * 100);
    tiles.push({
      key: "storage",
      label: "Storage",
      value: `${pct}% used`,
      sub: `${used.toFixed(1)} / ${total} GB`,
      tone: pct > 90 ? "danger" : pct > 75 ? "warning" : "ok",
    });
  }

  // Memory (RAM) — lead with the used ratio (percent), GB as the detail.
  tiles.push({
    key: "ram",
    label: "Memory",
    value: `${mem.pct}% used`,
    sub: `${mem.usedGB} / ${mem.totalGB} GB`,
    tone: mem.pct > 90 ? "danger" : mem.pct > 75 ? "warning" : "ok",
  });

  // Battery health (not charge) — wear level as the headline; charge as detail.
  if (device.battery) {
    const h = device.battery.health;
    tiles.push({
      key: "bat",
      label: "Battery health",
      value: `${h}%`,
      sub: `${device.battery.level}% charge`,
      tone: h < 60 ? "danger" : h < 80 ? "warning" : "ok",
    });
  } else {
    tiles.push({ key: "bat", label: "Battery health", value: "Line-powered", sub: "No battery", tone: "neutral" });
  }

  // (Last check-in tile removed — already shown in the slim
  // "Snapshot collected" banner below the strip.)

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: 0,
      background: "var(--color-bg-1)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-1)",
      overflow: "hidden",
    }}>
      {tiles.map((tile, i) => {
        const color = tile.tone === "danger"  ? "var(--color-error-700)"
                    : tile.tone === "warning" ? "var(--color-warning-700)"
                    : tile.tone === "ok"      ? "var(--color-success-700)"
                                              : "var(--fg1)";
        return (
          <div key={tile.key} style={{
            padding: "11px 14px",
            borderLeft: "1px solid var(--color-border-subtle)",
            display: "flex", flexDirection: "column", gap: 3, minWidth: 0,
          }}>
            <div className="overline" style={{ fontSize: 9.5, color: "var(--fg3)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tile.label}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 14.5, fontWeight: 600, color, lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums", minWidth: 0,
            }}>
              {tile.dot && (
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                  background: tile.dot, flexShrink: 0,
                  boxShadow: `0 0 0 3px color-mix(in oklab, ${tile.dot} 18%, transparent)` }} />
              )}
              <span className={tile.mono ? "mono" : ""} style={{
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                minWidth: 0,
              }}>{tile.value}</span>
            </div>
            {tile.sub && (
              <div style={{ fontSize: 11, color: "var(--fg3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tile.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// (MonPendingBar removed — earlier iteration batched edits into a
// pending list; user feedback moved Monitoring to direct push. Each
// pencil → ConfirmDialog → push, no queue.)

// ─── Per-card pending-changes footer ───────────────────────
// Drops into the bottom of a card whose rows can be staged for batched
// push (Security modules, System state, System settings). When the
// count is 0 it renders nothing — the card stays unchanged. When at
// least one change is staged we show a warning-toned strip with chips
// for each change, a Discard-all link, and a primary Push button.
function PendingFooter({ items, pushing, onDiscardOne, onDiscardAll, onPush }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      marginTop: 12, paddingTop: 12,
      borderTop: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "var(--color-warning-500)",
            color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: 10, fontWeight: 700,
            fontFamily: "var(--font-mono)",
          }}>{items.length}</span>
          <span style={{ fontSize: 12, fontWeight: 600,
            color: "var(--color-warning-700)" }}>
            Pending change{items.length > 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>· not pushed yet</span>
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onDiscardAll} disabled={pushing}
          style={{
            padding: "5px 10px", borderRadius: "var(--radius-sm)",
            background: "transparent",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
            color: "var(--color-warning-700)",
            fontSize: 11.5, fontWeight: 500,
            cursor: pushing ? "not-allowed" : "pointer",
            opacity: pushing ? 0.5 : 1,
            fontFamily: "inherit",
          }}>
          Discard
        </button>
        <window.Button size="sm" primary
          icon={pushing ? null : "upload"}
          disabled={pushing}
          onClick={onPush}>
          {pushing ? "Pushing…" : `Push ${items.length} to terminal`}
        </window.Button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((ch) => {
          const toLabel = ch.kind === "wifi"
            ? (ch.to?.enabled ? `Wi-Fi · ${ch.to.ssid || "—"}` : "Wi-Fi off")
            : `${ch.to}${ch.unit && ch.kind === "slider" ? ch.unit : ""}`;
          return (
            <span key={ch.id} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 4px 3px 10px", borderRadius: 999,
              background: "var(--bg2)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
              fontSize: 11.5, color: "var(--fg1)", maxWidth: "100%",
            }}>
              <span style={{ color: "var(--fg2)" }}>{ch.label}</span>
              <span className="mono" style={{ color: "var(--fg3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 90 }}>{String(ch.from).slice(0, 16)}</span>
              <window.Ico name="arrowR" size={9} stroke={2.2}
                style={{ color: "var(--color-warning-700)", flexShrink: 0 }} />
              <span className="mono" style={{ color: "var(--color-warning-700)",
                fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 130 }}>{toLabel}</span>
              <button type="button"
                onClick={() => onDiscardOne(ch.id)}
                disabled={pushing}
                title={`Discard · ${ch.label}`}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "transparent", border: 0,
                  cursor: pushing ? "not-allowed" : "pointer",
                  display: "grid", placeItems: "center",
                  color: "var(--fg3)", flexShrink: 0, marginLeft: 2,
                }}>
                <window.Ico name="x" size={10} stroke={2.2} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EditableModuleRow({ label, icon, on, onEdit, pending }) {
  const stagedOn = pending ? pending.to === "Enabled" : null;
  const isStaged = pending != null && stagedOn !== on;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px",
      background: isStaged
        ? "color-mix(in oklab, var(--color-warning-500) 8%, var(--bg2))"
        : "var(--bg2)",
      border: "1px solid",
      borderColor: isStaged
        ? "color-mix(in oklab, var(--color-warning-500) 35%, transparent)"
        : "var(--border-1)",
      borderRadius: "var(--radius-md)",
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 6,
        background: on ? "color-mix(in oklab, var(--color-success-500) 14%, transparent)"
                       : "var(--bg3)",
        color: on ? "var(--color-success-700)" : "var(--fg3)",
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <window.Ico name={icon} size={13} stroke={1.8} />
      </span>
      <span style={{ flex: 1, fontSize: 13, color: "var(--fg1)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{
        padding: "2px 8px", borderRadius: 999,
        background: on ? "color-mix(in oklab, var(--color-success-500) 16%, transparent)"
                       : "var(--bg3)",
        color:    on ? "var(--color-success-700)" : "var(--fg3)",
        fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
        textDecoration: isStaged ? "line-through" : "none",
        opacity: isStaged ? 0.6 : 1,
      }}>{on ? "ON" : "OFF"}</span>
      {isStaged && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 999,
          background: "var(--color-warning-50, var(--warning-bg))",
          color: "var(--color-warning-700)",
          border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
        }}>
          <window.Ico name="arrowR" size={9} stroke={2.2} />
          {stagedOn ? "ON" : "OFF"}
        </span>
      )}
      <button type="button" onClick={onEdit}
        title={isStaged ? `Edit staged · ${label}` : `Change · ${label}`}
        style={{
          width: 26, height: 26, borderRadius: 6,
          background: isStaged ? "var(--color-warning-50, var(--warning-bg))" : "transparent",
          border: "1px solid",
          borderColor: isStaged
            ? "color-mix(in oklab, var(--color-warning-500) 40%, transparent)"
            : "var(--border-1)",
          cursor: "pointer", display: "grid", placeItems: "center",
          color: isStaged ? "var(--color-warning-700)" : "var(--fg2)",
          flexShrink: 0,
        }}>
        <window.Ico name="edit" size={12} stroke={1.8} />
      </button>
    </div>
  );
}

// Same visual as the V1 Flag in a KvTable row, plus pencil affordance.
function EditableFlagRow({ label, positive, positiveLabel, negativeLabel, tone, onEdit, readOnly, pending }) {
  const isAlert = !positive;
  const color = isAlert
    ? (tone === "warning" ? "var(--color-warning-700)" : "var(--color-error-700)")
    : "var(--color-success-700)";
  const bg = isAlert
    ? (tone === "warning" ? "var(--warning-bg)" : "var(--error-bg)")
    : "oklch(96% 0.03 152)";
  // A staged value differs from the live one. Show the target as a chip.
  const isStaged = !!pending;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto",
      alignItems: "center", gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <span className="overline" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
        flexWrap: "wrap", minWidth: 0 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 10px", borderRadius: 999,
          background: bg, color,
          fontSize: 12, fontWeight: 500,
          textDecoration: isStaged ? "line-through" : "none",
          opacity: isStaged ? 0.55 : 1,
        }}>
          <window.Ico name={positive ? "check" : "alert"} size={11} stroke={2} />
          {positive ? positiveLabel : negativeLabel}
        </span>
        {isStaged && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 999,
            background: "var(--warning-bg)",
            color: "var(--color-warning-700)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
            fontSize: 12, fontWeight: 600,
          }}>
            <window.Ico name="arrowR" size={10} stroke={2.2} />
            {pending.to}
          </span>
        )}
      </span>
      {readOnly ? (
        <span style={{ fontSize: 10.5, color: "var(--fg3)", letterSpacing: "0.04em" }}>READ-ONLY</span>
      ) : (
        <button type="button" onClick={onEdit}
          title={isStaged ? `Edit staged · ${label}` : `Change · ${label}`}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: isStaged ? "var(--warning-bg)" : "transparent",
            border: "1px solid",
            borderColor: isStaged
              ? "color-mix(in oklab, var(--color-warning-500) 40%, transparent)"
              : "var(--border-1)",
            cursor: "pointer", display: "grid", placeItems: "center",
            color: isStaged ? "var(--color-warning-700)" : "var(--fg2)",
          }}>
          <window.Ico name="edit" size={12} stroke={1.8} />
        </button>
      )}
    </div>
  );
}

// Simple binary toggle row used for "Auto time", "Auto timezone" —
// neutral framing (no warning colors when off).
function EditableToggleRow({ label, on, onLabel, offLabel, onEdit, locked, pending }) {
  const color = on ? "var(--color-success-700)" : "var(--fg2)";
  const bg    = on ? "oklch(96% 0.03 152)"        : "var(--bg3)";
  const isStaged = !!pending;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto",
      alignItems: "center", gap: 12,
      minHeight: 44, boxSizing: "border-box",
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <span className="overline" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
        flexWrap: "nowrap", minWidth: 0 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 10px", borderRadius: 999,
          background: bg, color,
          fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
          textDecoration: isStaged ? "line-through" : "none",
          opacity: isStaged ? 0.55 : 1,
        }}>
          <window.Ico name={on ? "check" : "x"} size={11} stroke={2} />
          {on ? (onLabel || "Enabled") : (offLabel || "Disabled")}
        </span>
        {isStaged && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 999,
            background: "var(--warning-bg)",
            color: "var(--color-warning-700)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
            fontSize: 12, fontWeight: 600,
          }}>
            <window.Ico name="arrowR" size={10} stroke={2.2} />
            {pending.to}
          </span>
        )}
      </span>
      {locked ? (
        <span style={{ fontSize: 10.5, color: "var(--fg3)", letterSpacing: "0.04em" }}>LOCKED</span>
      ) : (
        <button type="button" onClick={onEdit}
          title={isStaged ? `Edit staged · ${label}` : `Change · ${label}`}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: isStaged ? "var(--warning-bg)" : "transparent",
            border: "1px solid",
            borderColor: isStaged
              ? "color-mix(in oklab, var(--color-warning-500) 40%, transparent)"
              : "var(--border-1)",
            cursor: "pointer", display: "grid", placeItems: "center",
            color: isStaged ? "var(--color-warning-700)" : "var(--fg2)",
          }}>
          <window.Ico name="edit" size={12} stroke={1.8} />
        </button>
      )}
    </div>
  );
}

// Setting row variants — used in the System settings card. Same
// grid as EditableFlagRow so they line up.
function SettingRow({ label, value, mono, onEdit, locked, pending }) {
  const isStaged = !!pending;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto",
      alignItems: "center", gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
      minHeight: 44, boxSizing: "border-box",
      opacity: locked ? 0.55 : 1,
    }}>
      <span className="overline" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8,
        flexWrap: "wrap", minWidth: 0 }}>
        <span className={mono ? "mono" : ""} style={{ fontSize: 13,
          color: "var(--fg1)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: isStaged ? "line-through" : "none",
          opacity: isStaged ? 0.55 : 1,
        }}>{value}</span>
        {isStaged && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 999,
            background: "var(--warning-bg)",
            color: "var(--color-warning-700)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
            fontSize: 12, fontWeight: 600,
            fontFamily: mono ? "var(--font-family-mono)" : "inherit",
            maxWidth: "100%",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            <window.Ico name="arrowR" size={10} stroke={2.2} />
            {String(pending.to)}{pending.unit || ""}
          </span>
        )}
      </span>
      {locked ? (
        <span style={{ fontSize: 10.5, color: "var(--fg3)", letterSpacing: "0.04em" }}>AUTO</span>
      ) : (
        <button type="button" onClick={onEdit}
          title={isStaged ? `Edit staged · ${label}` : `Change · ${label}`}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: isStaged ? "var(--warning-bg)" : "transparent",
            border: "1px solid",
            borderColor: isStaged
              ? "color-mix(in oklab, var(--color-warning-500) 40%, transparent)"
              : "var(--border-1)",
            cursor: "pointer", display: "grid", placeItems: "center",
            color: isStaged ? "var(--color-warning-700)" : "var(--fg2)",
          }}>
          <window.Ico name="edit" size={12} stroke={1.8} />
        </button>
      )}
    </div>
  );
}
function SettingSliderRow({ label, value, max, unit, onEdit, pending }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isStaged = !!pending;
  const stagedVal = isStaged ? Number(pending.to) : null;
  const stagedPct = isStaged && max > 0
    ? Math.min(100, Math.round((stagedVal / max) * 100))
    : null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto",
      alignItems: "center", gap: 12,
      minHeight: 44, boxSizing: "border-box",
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <span className="overline" style={{ fontSize: 10 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, height: 4, background: "var(--bg3)",
          borderRadius: 2, overflow: "hidden", minWidth: 60, position: "relative" }}>
          {/* Current value bar (faded when a staged value overrides it) */}
          <div style={{ width: `${pct}%`, height: "100%",
            background: "var(--color-primary-500)",
            opacity: isStaged ? 0.35 : 1 }} />
          {/* Staged value bar — drawn on top in warning tone */}
          {isStaged && (
            <div style={{
              position: "absolute", inset: 0,
              width: `${stagedPct}%`, height: "100%",
              background: "var(--color-warning-500)",
            }} />
          )}
        </div>
        <span className="mono" style={{ fontSize: 11.5,
          color: isStaged ? "var(--fg3)" : "var(--fg2)",
          minWidth: 42, textAlign: "right", flexShrink: 0,
          textDecoration: isStaged ? "line-through" : "none",
        }}>
          {value}{unit ? unit : ""}
        </span>
        {isStaged && (
          <span className="mono" style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 999,
            background: "var(--warning-bg)",
            color: "var(--color-warning-700)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 35%, transparent)",
            fontSize: 11.5, fontWeight: 600, flexShrink: 0,
          }}>
            <window.Ico name="arrowR" size={9} stroke={2.2} />
            {stagedVal}{unit || pending.unit || ""}
          </span>
        )}
      </div>
      <button type="button" onClick={onEdit}
        title={isStaged ? `Edit staged · ${label}` : `Change · ${label}`}
        style={{
          width: 26, height: 26, borderRadius: 6,
          background: isStaged ? "var(--warning-bg)" : "transparent",
          border: "1px solid",
          borderColor: isStaged
            ? "color-mix(in oklab, var(--color-warning-500) 40%, transparent)"
            : "var(--border-1)",
          cursor: "pointer", display: "grid", placeItems: "center",
          color: isStaged ? "var(--color-warning-700)" : "var(--fg2)",
        }}>
        <window.Ico name="edit" size={12} stroke={1.8} />
      </button>
    </div>
  );
}

// Curated value options for each system setting — keeps the change
// dialog deterministic instead of free-form. Edit here to extend.
const TIMEZONE_OPTIONS = [
  "Anchorage (GMT-09:00)",
  "Los Angeles (GMT-08:00)",
  "Vancouver (GMT-08:00)",
  "Denver (GMT-07:00)",
  "Chicago (GMT-06:00)",
  "Toronto (GMT-05:00)",
  "New York (GMT-05:00)",
  "UTC (GMT+00:00)",
  "London (GMT+00:00)",
  "Berlin (GMT+01:00)",
  "Shanghai (GMT+08:00)",
  "Tokyo (GMT+09:00)",
  "Sydney (GMT+10:00)",
];
// Maps a raw IANA id from telemetry to one of the display strings above.
const TZ_DISPLAY_MAP = {
  "America/Toronto":     "Toronto (GMT-05:00)",
  "America/New_York":    "New York (GMT-05:00)",
  "America/Chicago":     "Chicago (GMT-06:00)",
  "America/Los_Angeles": "Los Angeles (GMT-08:00)",
  "America/Vancouver":   "Vancouver (GMT-08:00)",
  "America/Anchorage":   "Anchorage (GMT-09:00)",
  "America/Denver":      "Denver (GMT-07:00)",
  "Europe/London":       "London (GMT+00:00)",
  "Europe/Berlin":       "Berlin (GMT+01:00)",
  "Asia/Shanghai":       "Shanghai (GMT+08:00)",
  "Asia/Tokyo":          "Tokyo (GMT+09:00)",
  "Australia/Sydney":    "Sydney (GMT+10:00)",
  "UTC":                 "UTC (GMT+00:00)",
};
function tzDisplay(tz) { return TZ_DISPLAY_MAP[tz] || tz; }

const SETTING_OPTIONS = {
  language:     ["en-US", "fr-CA", "es-MX", "en-GB", "en-CA", "pt-BR"],
  timezone:     TIMEZONE_OPTIONS,
  inputMethod:  ["com.google.android.inputmethod.latin/.LatinIME",
                 "com.android.inputmethod.pinyin/.PinyinIME",
                 "com.toms.kiosk-ime/.NumericIME"],
  screenTimeout:[15000, 30000, 60000, 120000, 300000, 600000],
};

// System settings card — extracted so the proposed monitoring tab can
// place it right after the Security module switches grid (Tier B)
// instead of buried in Tier D.
function MonSystemSettingsCard({ t, autoTime, autoTz, openEdit, pending,
  pushingScope, discardPending, discardScope, pushScope }) {
  const mediaPct = Math.round((t.settings.mediaVolume / t.settings.mediaVolumeMax) * 100);
  const ringPct  = Math.round((t.settings.ringVolume  / t.settings.ringVolumeMax)  * 100);
  return (
    <window.Card title="System settings">
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div>
          <EditableToggleRow label="Auto time" on={autoTime}
            onLabel="Network-synced"
            offLabel="Manual"
            pending={pending["set.autoTime"]}
            onEdit={() => openEdit({
              id: "set.autoTime", label: "Auto time",
              from: autoTime ? "Enabled" : "Disabled",
              to:   autoTime ? "Disabled" : "Enabled",
            })} />
          <EditableToggleRow label="Auto timezone" on={autoTz}
            onLabel="Network-synced"
            offLabel="Manual"
            pending={pending["set.autoTz"]}
            onEdit={() => openEdit({
              id: "set.autoTz", label: "Auto timezone",
              from: autoTz ? "Enabled" : "Disabled",
              to:   autoTz ? "Disabled" : "Enabled",
            })} />
          <SettingRow label="Timezone"
            value={tzDisplay(t.settings.timezone)}
            locked={autoTz}
            pending={pending["set.timezone"]}
            onEdit={() => openEdit({
              id: "set.timezone", label: "Timezone",
              kind: "select", options: SETTING_OPTIONS.timezone,
              from: tzDisplay(t.settings.timezone),
              to:   tzDisplay(t.settings.timezone),
            })} />
          <SettingRow label="Language" mono value={t.settings.language}
            pending={pending["set.language"]}
            onEdit={() => openEdit({
              id: "set.language", label: "Language",
              kind: "select", options: SETTING_OPTIONS.language,
              from: t.settings.language, to: t.settings.language,
            })} />
          <SettingRow label="Screen timeout"
            value={`${(t.settings.screenTimeoutMs / 1000).toFixed(0)} seconds`}
            pending={pending["set.timeout"]}
            onEdit={() => openEdit({
              id: "set.timeout", label: "Screen timeout",
              kind: "select",
              options: SETTING_OPTIONS.screenTimeout.map(ms => `${ms / 1000}s`),
              from: `${(t.settings.screenTimeoutMs / 1000).toFixed(0)}s`,
              to:   `${(t.settings.screenTimeoutMs / 1000).toFixed(0)}s`,
            })} />
        </div>
        <div>
          <SettingSliderRow label="Screen brightness"
            value={t.settings.brightness} max={100} unit="%"
            pending={pending["set.bright"]}
            onEdit={() => openEdit({
              id: "set.bright", label: "Screen brightness",
              kind: "slider", max: 100, unit: "%",
              from: `${t.settings.brightness}%`, to: t.settings.brightness,
            })} />
          <SettingSliderRow label="Sub-screen"
            value={t.settings.subBrightness} max={100} unit="%"
            pending={pending["set.subBright"]}
            onEdit={() => openEdit({
              id: "set.subBright", label: "Sub-screen brightness",
              kind: "slider", max: 100, unit: "%",
              from: `${t.settings.subBrightness}%`, to: t.settings.subBrightness,
            })} />
          <SettingSliderRow label="Media volume"
            value={mediaPct} max={100} unit="%"
            pending={pending["set.mediaVol"]}
            onEdit={() => openEdit({
              id: "set.mediaVol", label: "Media volume",
              kind: "slider", max: 100, unit: "%",
              from: `${mediaPct}%`, to: mediaPct,
            })} />
          <SettingSliderRow label="Ring volume"
            value={ringPct} max={100} unit="%"
            pending={pending["set.ringVol"]}
            onEdit={() => openEdit({
              id: "set.ringVol", label: "Ring volume",
              kind: "slider", max: 100, unit: "%",
              from: `${ringPct}%`, to: ringPct,
            })} />
        </div>
      </div>
      <PendingFooter
        items={Object.values(pending).filter((c) => c.id.startsWith("set."))}
        pushing={pushingScope === "set."}
        onDiscardOne={discardPending}
        onDiscardAll={() => discardScope("set.")}
        onPush={() => pushScope("set.")} />
    </window.Card>
  );
}

// ─── Proposed ordering for ticket-handler workflow ─────────
function DeviceMonitoringTabProposed({ device, ticket }) {
  const runtime    = useMemoD(() => runtimeFor(device), [device]);
  const t          = useMemoD(() => deviceTelemetryFor(device), [device]);

  const [apnOpen, setApnOpen]   = useStateD(false);
  // Location telemetry is now a low-priority section, collapsed by default.
  const [locOpen, setLocOpen]   = useStateD(false);
  // Detail / secondary cards — collapsed by default to keep the
  // monitoring tab scannable. Tier A health strip + Tier B switches
  // already surface the headline values; expand for raw detail.
  const [secOpen, setSecOpen]   = useStateD(false);
  const [netOpen, setNetOpen]   = useStateD(false);

  // Auto time / auto timezone — typically agent-reported, simulated here.
  // When auto is on, the corresponding manual row is locked.
  const [autoTime, setAutoTime] = useStateD(true);
  const [autoTz,   setAutoTz]   = useStateD(false);

  // Inline edit affordance: each pencil opens a ConfirmDialog. For
  // Security modules, System state and System settings the dialog
  // *stages* the change into a `pending` batch; the operator then
  // reviews the whole batch in the sticky Pending-changes bar and
  // pushes everything to the device in one go. Network / APN edits
  // remain a direct push (one tap → one toast) because they're
  // diagnostic toggles not configuration tuning.
  const [confirm, setConfirm] = useStateD(null);
  const [pending, setPending] = useStateD({});
  const isBatchableId = (id) => /^(mod|state|set)\./.test(id || "");

  // Open the change editor. If a change is already staged for this id,
  // pre-load the dialog with the staged target so the operator picks
  // up where they left off.
  const openEdit = (payload) => {
    if (window.__DEVICES_READONLY) return;
    const staged = pending[payload.id];
    setConfirm(staged ? { ...payload, to: staged.to } : payload);
  };

  // Apply a single non-batchable change (e.g. net.*) directly to
  // the device — preserves the old "one tap → one toast" semantics.
  const pushOne = (ch) => {
    if (window.__DEVICES_READONLY) return;
    let summary;
    if (ch.kind === "wifi") {
      const v = ch.to || {};
      summary = v.enabled ? `Enabled · ${v.ssid || "—"}` : "Disabled";
    } else {
      summary = String(ch.to);
    }
    window.showToast?.(`Pushed · ${ch.label} → ${summary}`, "success");
  };

  // Dialog Confirm: either stage into the batch (for batchable ids)
  // or push immediately (everything else).
  const stageOrPush = () => {
    if (!confirm) return;
    if (!isBatchableId(confirm.id)) {
      pushOne(confirm);
      setConfirm(null);
      return;
    }
    // Stage. If the user "changed" to the same value, drop the entry
    // — it's a no-op.
    const isNoop = confirm.kind !== "wifi"
      && String(confirm.to) === String(confirm.from);
    setPending((p) => {
      const next = { ...p };
      if (isNoop) delete next[confirm.id];
      else next[confirm.id] = { ...confirm, stagedAt: Date.now() };
      return next;
    });
    setConfirm(null);
  };

  // Apply every staged change at once. Simulates a network round-trip
  // so the "Pushing…" state is visible. Scoped — each card pushes only
  // the changes that belong to it (mod.* / state.* / set.*).
  const [pushingScope, setPushingScope] = useStateD(null);
  const pushScope = (scope) => {
    const items = Object.values(pending).filter((ch) => ch.id.startsWith(scope));
    if (items.length === 0) return;
    setPushingScope(scope);
    setTimeout(() => {
      items.forEach((ch) => {
        if (ch.id === "set.autoTime") setAutoTime(ch.to === "Enabled");
        else if (ch.id === "set.autoTz") setAutoTz(ch.to === "Enabled");
      });
      const scopeLabel = scope === "mod." ? "module"
                       : scope === "state." ? "state"
                       : "settings";
      window.showToast?.(
        `Pushed ${items.length} ${scopeLabel} change${items.length > 1 ? "s" : ""} to ${device.sn}`,
        "success");
      setPending((p) => {
        const next = {};
        Object.entries(p).forEach(([k, v]) => {
          if (!k.startsWith(scope)) next[k] = v;
        });
        return next;
      });
      setPushingScope(null);
    }, 700);
  };

  const discardPending = (id) => setPending((p) => {
    const next = { ...p }; delete next[id]; return next;
  });
  const discardScope = (scope) => setPending((p) => {
    const next = {};
    Object.entries(p).forEach(([k, v]) => {
      if (!k.startsWith(scope)) next[k] = v;
    });
    return next;
  });

  const toggleConfirm = (id, label, currentOn) => () => {
    const staged = pending[id];
    setConfirm({
      id, label,
      from: currentOn ? "Enabled" : "Disabled",
      to: staged ? staged.to : (currentOn ? "Disabled" : "Enabled"),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Tier A — at-a-glance health ───────────────────── */}
      <MonHealthStrip device={device} runtime={runtime} t={t} />

      {/* Last-collected (slim variant — strip already shows freshness) */}
      <div style={{
        padding: "8px 14px",
        background: t.collectedAt.stale ? "var(--warning-bg)" : "var(--bg2)",
        border: "1px solid",
        borderColor: t.collectedAt.stale
          ? "color-mix(in oklab, var(--color-warning-500) 25%, transparent)"
          : "var(--border-1)",
        borderRadius: "var(--radius-md)",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        fontSize: 12,
      }}>
        <window.Ico name="clock" size={12} stroke={2} style={{ color: "var(--fg3)" }} />
        <span style={{ color: "var(--fg2)" }}>Snapshot collected</span>
        <span className="mono" style={{ color: "var(--fg1)", fontWeight: 500 }}>
          {window.fmtDateTimeS(t.collectedAt.pretty)}
        </span>
        <span style={{ color: "var(--fg3)" }}>· {t.collectedAt.relative}</span>
        <div style={{ flex: 1 }} />
        {!window.__DEVICES_READONLY && (
          <window.Button size="sm" ghost icon="refresh"
            onClick={() => window.showToast?.("Telemetry refresh queued", "info")}>
            Re-collect
          </window.Button>
        )}
      </div>

      {/* ── Tier B — KB-referenced switches & state ───────── */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <window.Card title="Security module switches">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <EditableModuleRow label="Magstripe"     icon="link"    on={t.modules.magstripe}
              pending={pending["mod.magstripe"]}
              onEdit={toggleConfirm("mod.magstripe",   "Magstripe",     t.modules.magstripe)} />
            <EditableModuleRow label="Insert (chip)" icon="box"     on={t.modules.insertCard}
              pending={pending["mod.insertCard"]}
              onEdit={toggleConfirm("mod.insertCard",  "Insert (chip)", t.modules.insertCard)} />
            <EditableModuleRow label="Contactless"   icon="bolt"    on={t.modules.contactless}
              pending={pending["mod.contactless"]}
              onEdit={toggleConfirm("mod.contactless", "Contactless",   t.modules.contactless)} />
            <EditableModuleRow label="Printer"       icon="package" on={t.modules.printer}
              pending={pending["mod.printer"]}
              onEdit={toggleConfirm("mod.printer",     "Printer",       t.modules.printer)} />
          </div>
          <PendingFooter
            items={Object.values(pending).filter((c) => c.id.startsWith("mod."))}
            pushing={pushingScope === "mod."}
            onDiscardOne={discardPending}
            onDiscardAll={() => discardScope("mod.")}
            onPush={() => pushScope("mod.")} />
        </window.Card>

        <window.Card title="System state">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <EditableFlagRow label="Terminal lock"
              positive={!t.state.terminalLocked}
              positiveLabel="Unlocked"
              negativeLabel="Locked (admin only)"
              tone="warning"
              pending={pending["state.lock"]}
              onEdit={() => openEdit({ id: "state.lock", label: "Terminal lock",
                from: t.state.terminalLocked ? "Locked" : "Unlocked",
                to:   t.state.terminalLocked ? "Unlocked" : "Locked" })} />
            <EditableFlagRow label="Status bar pull"
              positive={t.state.statusBarPulldown}
              positiveLabel="Enabled"
              negativeLabel="Disabled — locked-down"
              pending={pending["state.statusBar"]}
              onEdit={() => openEdit({ id: "state.statusBar", label: "Status bar pull",
                from: t.state.statusBarPulldown ? "Enabled" : "Disabled",
                to:   t.state.statusBarPulldown ? "Disabled" : "Enabled" })} />
            <EditableFlagRow label="Unattended mode"
              positive={!t.state.unattendedMode}
              positiveLabel="Off (attended)"
              negativeLabel="On — kiosk-style"
              pending={pending["state.unattended"]}
              onEdit={() => openEdit({ id: "state.unattended", label: "Unattended mode",
                from: t.state.unattendedMode ? "On" : "Off",
                to:   t.state.unattendedMode ? "Off" : "On" })} />
            <EditableFlagRow label="Dev unit"
              positive={t.state.devUnit === 0}
              positiveLabel="User unit (0)"
              negativeLabel="Dev unit (1)"
              tone="warning"
              readOnly />
          </div>
          <div style={{
            marginTop: 12, paddingTop: 10,
            borderTop: "1px dashed var(--color-border-subtle)",
          }}>
            <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>
              System parameters
            </div>
            <div style={{
              padding: "8px 10px",
              background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--radius-md)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
              rowGap: 5, columnGap: 12,
            }}>
              {Object.entries(t.state.sysParams).map(([k, v]) => (
                <React.Fragment key={k}>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--fg1)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <PendingFooter
            items={Object.values(pending).filter((c) => c.id.startsWith("state."))}
            pushing={pushingScope === "state."}
            onDiscardOne={discardPending}
            onDiscardAll={() => discardScope("state.")}
            onPush={() => pushScope("state.")} />
        </window.Card>
      </div>

      <MonSystemSettingsCard t={t} autoTime={autoTime} autoTz={autoTz}
        openEdit={openEdit} pending={pending}
        pushingScope={pushingScope}
        discardPending={discardPending}
        discardScope={discardScope}
        pushScope={pushScope} />

      <window.Card title="Security & uptime detail"
        action={
          <button type="button" onClick={() => setSecOpen(!secOpen)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--border-1)",
              borderRadius: 6, cursor: "pointer",
              fontSize: 12, color: "var(--fg2)", fontWeight: 500,
            }}>
            <window.Ico name={secOpen ? "chevd" : "chevr"} size={12} />
            {secOpen ? "Collapse" : "Expand"}
          </button>
        }>
        {!secOpen && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "2px 0", fontSize: 12.5, color: "var(--fg3)",
          }}>
            <span>
              <span style={{ color: "var(--fg2)" }}>Triggers</span> · {t.security.status === 1
                ? <span className="mono" style={{ color: "var(--color-warning-700)", fontWeight: 500 }}>
                    Fired{t.security.reasons.length > 0 ? ` · ${t.security.reasons.length}` : ""}
                  </span>
                : <span className="mono" style={{ color: "var(--color-success-700)" }}>OK</span>}
            </span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>HW attacks</span> · <span className="mono num" style={{ color: t.security.hwAttackCount > 10 ? "var(--color-warning-700)" : "var(--fg1)" }}>{t.security.hwAttackCount}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>SW attacks</span> · <span className="mono num" style={{ color: t.security.swAttackCount > 5 ? "var(--color-warning-700)" : "var(--fg1)" }}>{t.security.swAttackCount}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>Root</span> · <span className="mono" style={{ color: t.security.rooted ? "var(--color-error-700)" : "var(--color-success-700)", fontWeight: 500 }}>{t.security.rooted ? "Rooted" : "OK"}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>Session</span> · <span className="mono" style={{ color: "var(--fg1)" }}>{fmtDuration(t.uptime.sessionSec)}</span></span>
          </div>
        )}
        {secOpen && (<>
        {t.security.status === 1 && t.security.reasons.length > 0 && (
          <div style={{
            padding: "8px 12px", marginBottom: 12,
            background: "var(--warning-bg)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
            borderRadius: "var(--radius-md)",
            display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: "var(--color-warning-700)", fontWeight: 500, marginRight: 4 }}>
              Trigger reasons:
            </span>
            {t.security.reasons.map(r => (
              <span key={r} className="mono" style={{
                fontSize: 11, padding: "2px 7px", borderRadius: 4,
                background: "var(--color-bg-1)", color: "var(--color-warning-700)",
                border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
                fontWeight: 500, letterSpacing: "0.02em",
              }}>{r}</span>
            ))}
          </div>
        )}
        <div style={{ display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <StatTile label="Hardware attacks"
            value={t.security.hwAttackCount}
            sub="cumulative"
            tone={t.security.hwAttackCount > 10 ? "warning" : null} />
          <StatTile label="Software attacks"
            value={t.security.swAttackCount}
            sub="cumulative"
            tone={t.security.swAttackCount > 5 ? "warning" : null} />
          <StatTile label="Root state"
            value={t.security.rooted ? "Rooted" : "Not rooted"}
            sub={t.security.rooted ? "Device compromised" : "Integrity intact"}
            tone={t.security.rooted ? "danger" : "success"}
            mono={false} />
        </div>
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: "1px dashed var(--color-border-subtle)",
          display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12,
        }}>
          <StatTile label="Session uptime"
            value={fmtDuration(t.uptime.sessionSec)} sub="since last boot" />
          <StatTile label="Today"
            value={fmtDuration(t.uptime.todaySec)} sub="00:00 → now" />
          <StatTile label="Cumulative"
            value={fmtDuration(t.uptime.cumulativeSec)} sub="lifetime runtime" />
          <StatTile label="Last boot"
            value={t.uptime.bootDate ? window.fmtDateTimeS(t.uptime.bootDate) : "—"}
            sub={t.uptime.bootEpoch ? `epoch ${t.uptime.bootEpoch}` : "Pending activation"}
            mono={false}
            valueFont={11.5} />
        </div>
        </>)}
      </window.Card>

      {/* ── Tier D — detail telemetry & config ────────────── */}
      {/* Available SSIDs for the Wi-Fi edit dialog. Saved networks are
          guaranteed real; we tack on a couple of likely retail-floor
          discovered SSIDs so the picker has variety. */}
      {(() => null)()}
      <window.Card title="Network & connectivity"
        action={
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <window.Pill tone={t.network.type === "Offline" ? "warning" : "info"} dot size="sm">
              Primary · {t.network.type}
            </window.Pill>
            <button type="button" onClick={() => setNetOpen(!netOpen)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px",
                background: "transparent",
                border: "1px solid var(--border-1)",
                borderRadius: 6, cursor: "pointer",
                fontSize: 12, color: "var(--fg2)", fontWeight: 500,
              }}>
              <window.Ico name={netOpen ? "chevd" : "chevr"} size={12} />
              {netOpen ? "Collapse" : "Expand"}
            </button>
          </div>
        }>
        {!netOpen && (() => {
          const rows = [
            t.network.wifi.on && { label: "Wi-Fi",
              tag: t.network.wifi.ssid || null, ip: t.network.wifi.ip,
              primary: t.network.type === "WIFI" },
            t.network.cellular.on && { label: "Cellular",
              tag: t.network.cellular.carrier || null, ip: t.network.cellular.ip,
              primary: t.network.type === "Cellular" },
            t.network.ethernet.on && { label: "Ethernet",
              tag: null, ip: t.network.ethernet.ip,
              primary: t.network.type === "Ethernet" },
            t.network.bluetooth.on && { label: "Bluetooth", tag: null, ip: null, primary: false },
          ].filter(Boolean);
          return (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              padding: "2px 0", fontSize: 12.5, color: "var(--fg3)",
            }}>
              {rows.length === 0 && (
                <span style={{ color: "var(--color-warning-700)", fontWeight: 500 }}>
                  No active interfaces — device offline
                </span>
              )}
              {rows.map((r, i) => (
                <React.Fragment key={r.label}>
                  {i > 0 && <span style={{ color: "var(--color-border-default)" }}>·</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: r.primary ? "var(--color-primary-500)" : "var(--color-success-500)",
                    }} />
                    <span style={{ color: "var(--fg1)", fontWeight: r.primary ? 500 : 400 }}>{r.label}</span>
                    {r.tag && <span className="mono" style={{ color: "var(--fg2)" }}>{r.tag}</span>}
                    {r.ip && <span className="mono" style={{ color: "var(--fg3)" }}>{r.ip}</span>}
                  </span>
                </React.Fragment>
              ))}
            </div>
          );
        })()}
        {netOpen && (<>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InterfaceRow
            label="Wi-Fi" icon="link"
            on={t.network.wifi.on} primary={t.network.type === "WIFI"}
            ip={t.network.wifi.ip} signalDbm={t.network.wifi.signalDbm}
            badges={t.network.wifi.on ? [
              t.network.wifi.ssid && { label: "SSID", value: t.network.wifi.ssid, mono: true },
              t.network.wifi.linkMbps && { label: "Link", value: `${t.network.wifi.linkMbps} Mbps` },
              t.network.wifi.security && { label: "Security", value: t.network.wifi.security },
            ].filter(Boolean) : []}
            onEdit={() => {
              // Build SSID picker from saved networks + a couple of common
              // retail-floor discovered names.
              const saved = (t.location.savedWifi || [])
                .map(w => w.ssid).filter(s => s && s !== "—");
              const discovered = ["TOMS-Public", "Guest"];
              const options = Array.from(new Set(
                [t.network.wifi.ssid, ...saved, ...discovered].filter(Boolean)
              ));
              setConfirm({
                id: "net.wifi", label: "Wi-Fi", kind: "wifi",
                options,
                from: t.network.wifi.on
                  ? `Enabled · ${t.network.wifi.ssid || "—"}`
                  : "Disabled",
                to: {
                  enabled: t.network.wifi.on,
                  ssid: t.network.wifi.ssid || options[0] || "",
                  password: "",
                },
              });
            }} />
          <InterfaceRow
            label="Mobile data" icon="bolt"
            on={t.network.cellular.on} primary={t.network.type === "Cellular"}
            ip={t.network.cellular.ip} signalDbm={t.network.cellular.signalDbm}
            badges={t.network.cellular.on ? [
              t.network.cellular.carrier && { label: "Carrier", value: t.network.cellular.carrier },
              t.network.cellular.network && { label: "Network", value: t.network.cellular.network },
              t.network.defaultApn && { label: "APN", value: t.network.defaultApn, mono: true },
            ].filter(Boolean) : []}
            onEdit={() => setConfirm({
              id: "net.cellular", label: "Mobile data", kind: "toggle",
              from: t.network.cellular.on ? "Enabled" : "Disabled",
              to:   t.network.cellular.on ? "Disabled" : "Enabled",
            })} />
          <InterfaceRow
            label="Ethernet" icon="box"
            on={t.network.ethernet.on} primary={t.network.type === "Ethernet"}
            ip={t.network.ethernet.ip}
            badges={t.network.ethernet.on ? [
              t.network.ethernet.linkMbps && { label: "Link",
                value: `${t.network.ethernet.linkMbps} Mbps ${t.network.ethernet.duplex}-duplex` },
            ].filter(Boolean) : []}
            onEdit={() => setConfirm({
              id: "net.ethernet", label: "Ethernet", kind: "toggle",
              from: t.network.ethernet.on ? "Enabled" : "Disabled",
              to:   t.network.ethernet.on ? "Disabled" : "Enabled",
            })} />
          <InterfaceRow label="Bluetooth" icon="link"
            on={t.network.bluetooth.on} badges={[]}
            onEdit={() => setConfirm({
              id: "net.bluetooth", label: "Bluetooth", kind: "toggle",
              from: t.network.bluetooth.on ? "Enabled" : "Disabled",
              to:   t.network.bluetooth.on ? "Disabled" : "Enabled",
            })} />
        </div>
        {t.network.apnConfig && (
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px dashed var(--color-border-subtle)",
          }}>
            <button type="button" onClick={() => setApnOpen(!apnOpen)}
              style={{
                background: "transparent", border: 0, padding: 0, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "var(--fg2)", fontWeight: 500,
              }}>
              <window.Ico name={apnOpen ? "chevd" : "chevr"} size={12} />
              Full APN configuration
              <span style={{ marginLeft: 4, fontSize: 11, color: "var(--fg3)", fontWeight: 400 }}>
                · {Object.keys(t.network.apnConfig).filter(k => t.network.apnConfig[k] !== "").length} fields set
              </span>
            </button>
            {apnOpen && (
              <div style={{
                marginTop: 10, padding: "10px 12px",
                background: "var(--bg2)",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--radius-md)",
                display: "grid",
                gridTemplateColumns: "120px minmax(0, 1fr)",
                rowGap: 6, columnGap: 12,
              }}>
                {Object.entries(t.network.apnConfig).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span className="overline" style={{ fontSize: 9.5, paddingTop: 1 }}>{k}</span>
                    <span className="mono" style={{ fontSize: 12, color: v ? "var(--fg1)" : "var(--fg3)" }}>
                      {v || "—"}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
        </>)}
      </window.Card>

      {/* ── Tier E — model-grounded hardware facts ──────────
          Lifetime usage counters (DEVICE INFO) + dual SIM slots.
          The device-side event log moved to the Apps & Firmware tab;
          the SIM monthly-plan narrative + live-process probe were
          dropped (over-model) during the data-model refactor. */}
      {(() => {
        const uc = usageCountersFor(device);
        const slots = simSlotsFor(device);
        const fmtNum = (n) => (n == null ? "—" : n.toLocaleString("en-US"));
        const fmtUptime = (s) => {
          if (s == null) return "—";
          const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
          return d > 0 ? `${d}d ${h}h` : `${h}h`;
        };
        return (
          <>
            <window.Card title="Usage counters">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <StatTile label="Insert (chip)" value={fmtNum(uc.contact)}     sub="IC card reads" />
                <StatTile label="Swipe"         value={fmtNum(uc.magStripe)}   sub="Magstripe reads" />
                <StatTile label="Tap"           value={fmtNum(uc.contactless)} sub="Contactless reads" />
                <StatTile label="Power cycles"  value={fmtNum(uc.powerCycle)} />
                <StatTile label="Power button"  value={fmtNum(uc.powerButton)} sub="presses" />
                <StatTile label="USB plug-ins"  value={fmtNum(uc.usbPlug)} />
                <StatTile label="Front camera"  value={fmtNum(uc.frontCam)}    sub="captures" />
                <StatTile label="Rear camera"   value={fmtNum(uc.rearCam)}     sub="captures" />
                <StatTile label="Flash"         value={fmtNum(uc.flash)}       sub="fires" />
                {uc.hasPrinter && (
                  <StatTile label="Print length" value={`${fmtNum(Math.round(uc.printLength / 1000))} m`} sub="paper fed" />
                )}
                <StatTile label="Total uptime"  value={fmtUptime(uc.totalUpTimeSec)} mono={false} />
              </div>
              {uc.hasPrinter && uc.printerStatus && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--color-border-subtle)",
                  display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="overline" style={{ fontSize: 10 }}>Printer status</span>
                  <window.Pill tone={uc.printerStatus.tone === "ok" ? "success" : uc.printerStatus.tone} dot size="sm">
                    {uc.printerStatus.label}
                  </window.Pill>
                </div>
              )}
            </window.Card>

            <window.Card title="SIM slots">
              {slots.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--fg3)", padding: "4px 0" }}>
                  No cellular modem — this unit connects over Wi-Fi / Ethernet only.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {slots.map((s) => {
                    const tone = s.slotStatus === "ACTIVE" ? "success"
                               : s.slotStatus === "INACTIVE" ? "warning" : "neutral";
                    return (
                      <div key={s.slotIndex} style={{ padding: "12px 14px", background: "var(--bg2)",
                        border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Slot {s.slotIndex}</span>
                          <window.Pill tone={tone} dot size="sm">{s.slotStatus}</window.Pill>
                        </div>
                        {s.slotStatus === "EMPTY" ? (
                          <div style={{ fontSize: 12, color: "var(--fg3)" }}>No SIM inserted.</div>
                        ) : (
                          <KvTable rows={[
                            ["Carrier", <span style={{ fontSize: 13 }}>{s.carrier}</span>],
                            ["ICCID",   <span className="mono" style={{ fontSize: 12 }}>{s.iccid || "—"}</span>],
                            ["IMEI",    <span className="mono" style={{ fontSize: 12 }}>{s.imei || "—"}</span>],
                            ["IMSI",    <span className="mono" style={{ fontSize: 12 }}>{s.imsi || "—"}</span>],
                            ...(s.rssi != null ? [["Signal", <span className="mono" style={{ fontSize: 12.5 }}>{s.rssi} dBm</span>]] : []),
                            ...(s.ip ? [["IP", <span className="mono" style={{ fontSize: 12 }}>{s.ip}</span>]] : []),
                          ]} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </window.Card>
          </>
        );
      })()}

      {/* ── Location telemetry (collapsed by default — minor) ─── */}
      <window.Card title="Location telemetry"
        action={
          <button type="button" onClick={() => setLocOpen(!locOpen)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--border-1)",
              borderRadius: 6, cursor: "pointer",
              fontSize: 12, color: "var(--fg2)", fontWeight: 500,
            }}>
            <window.Ico name={locOpen ? "chevd" : "chevr"} size={12} />
            {locOpen ? "Collapse" : "Expand"}
          </button>
        }>
        {!locOpen && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "2px 0", fontSize: 12.5, color: "var(--fg3)",
          }}>
            <span><span style={{ color: "var(--fg2)" }}>Provider</span> · <span className="mono" style={{ color: "var(--fg1)" }}>{t.location.provider}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>Coords</span> · <span className="mono" style={{ color: "var(--fg1)" }}>{t.location.coords.lat.toFixed(4)}, {t.location.coords.lng.toFixed(4)}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>Cell towers</span> · <span className="mono num" style={{ color: "var(--fg1)" }}>{t.location.cellTowers.length}</span></span>
            <span style={{ color: "var(--color-border-default)" }}>·</span>
            <span><span style={{ color: "var(--fg2)" }}>Wi-Fi APs</span> · <span className="mono num" style={{ color: "var(--fg1)" }}>{t.location.nearbyWifi.length}</span></span>
          </div>
        )}
        {locOpen && (<>
          <div style={{ display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <SwitchRow label="Assist provider" value={t.location.provider} />
            <SwitchRow label="Coordinates"
              value={`${t.location.coords.lat.toFixed(4)}, ${t.location.coords.lng.toFixed(4)}`}
              mono />
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px dashed var(--color-border-subtle)",
          }}>
            <div className="overline" style={{ fontSize: 10, marginBottom: 8 }}>Fix success — last 2 days</div>
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    {["Date", "SDK", "Success", "Failed", "Rate"].map((h, i) => (
                      <th key={i} style={{
                        padding: "6px 12px", fontSize: 10.5, fontWeight: 500,
                        color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--color-border-subtle)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[t.location.today, t.location.yesterday].map((d, i) => {
                    const total = d.successCount + d.failCount;
                    const rate = total > 0 ? Math.round((d.successCount / total) * 100) : 0;
                    return (
                      <tr key={i} style={{ borderBottom: i === 0 ? "1px solid var(--color-border-subtle)" : "none" }}>
                        <td style={{ padding: "8px 12px" }}><span className="mono">{d.date}</span></td>
                        <td style={{ padding: "8px 12px" }}>{d.sdk}</td>
                        <td style={{ padding: "8px 12px" }}><span className="mono" style={{ color: "var(--color-success-700)" }}>{d.successCount}</span></td>
                        <td style={{ padding: "8px 12px" }}><span className="mono" style={{ color: "var(--color-error-700)" }}>{d.failCount}</span></td>
                        <td style={{ padding: "8px 12px" }}>
                          <span className="mono" style={{ color: rate >= 80 ? "var(--color-success-700)" : "var(--color-warning-700)" }}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px dashed var(--color-border-subtle)",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14,
          }}>
            <div>
              <div className="overline" style={{ fontSize: 10, marginBottom: 8 }}>
                Cell towers · <span className="mono num">{t.location.cellTowers.length}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none",
                display: "flex", flexDirection: "column", gap: 4 }}>
                {t.location.cellTowers.map((c, i) => (
                  <li key={i} style={{ display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "5px 8px",
                    background: "var(--bg2)", border: "1px solid var(--border-1)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11.5, color: "var(--fg2)",
                  }}>
                    <span><span style={{ color: "var(--fg3)" }}>cid </span><span className="mono">{c.cid}</span></span>
                    <span><span style={{ color: "var(--fg3)" }}>lac </span><span className="mono">{c.lac}</span></span>
                    <span><span style={{ color: "var(--fg3)" }}>mcc </span><span className="mono">{c.mcc}</span></span>
                    <span><span style={{ color: "var(--fg3)" }}>mnc </span><span className="mono">{c.mnc}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="overline" style={{ fontSize: 10, marginBottom: 8 }}>
                Nearby Wi-Fi · <span className="mono num">{t.location.nearbyWifi.length}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none",
                display: "flex", flexDirection: "column", gap: 4 }}>
                {t.location.nearbyWifi.map((w, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "5px 8px",
                    background: "var(--bg2)", border: "1px solid var(--border-1)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11.5, color: "var(--fg2)",
                  }}>
                    <span className="mono" style={{ flex: 1, color: "var(--fg1)" }}>{w.mac}</span>
                    <SignalBars dbm={w.level} />
                    <span className="mono" style={{ width: 48, textAlign: "right",
                      color: w.level > -50 ? "var(--color-success-700)"
                           : w.level > -70 ? "var(--fg2)"
                                           : "var(--color-warning-700)" }}>
                      {w.level} dBm
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {t.location.savedWifi.length > 0 && (
            <div style={{
              marginTop: 14, paddingTop: 12,
              borderTop: "1px dashed var(--color-border-subtle)",
            }}>
              <div className="overline" style={{ fontSize: 10, marginBottom: 8 }}>
                Previously connected · <span className="mono num">{t.location.savedWifi.length}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {t.location.savedWifi.map((w, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 999,
                    background: "var(--bg3)", border: "1px solid var(--border-1)",
                    fontSize: 11.5, color: "var(--fg1)",
                  }}>
                    <window.Ico name="link" size={10} stroke={1.8} style={{ color: "var(--fg3)" }} />
                    {w.ssid}
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{w.level} dBm</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>)}
      </window.Card>

      <window.ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? <>Change · <span className="mono">{confirm.label}</span>?</> : ""}
        body={confirm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* From → To preview (skipped for Wi-Fi multi-field changes) */}
            {confirm.kind !== "wifi" && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "start",
                padding: "10px 14px",
                background: "var(--bg2)",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--radius-md)",
                maxWidth: "100%",
              }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--fg3)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {confirm.from}
                </span>
                <window.Ico name="chevR" size={12} style={{ color: "var(--fg3)", flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 13, fontWeight: 600,
                  color: "var(--color-primary-700)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {String(confirm.to)}{confirm.kind === "slider" && confirm.unit ? confirm.unit : ""}
                </span>
              </div>
            )}

            {/* Toggle kind — Enable / Disable pill pair */}
            {confirm.kind === "toggle" && (
              <div style={{ display: "flex", gap: 8 }}>
                {["Enabled", "Disabled"].map(v => {
                  const on = v === confirm.to;
                  return (
                    <button key={v} type="button"
                      onClick={() => setConfirm(c => c ? { ...c, to: v } : c)}
                      style={{
                        padding: "8px 16px", borderRadius: 999,
                        background: on ? "var(--color-primary-50)" : "var(--bg2)",
                        border: "1px solid",
                        borderColor: on ? "var(--color-primary-500)" : "var(--border-1)",
                        color: on ? "var(--color-primary-700)" : "var(--fg1)",
                        fontSize: 13, fontWeight: on ? 600 : 500,
                        cursor: "pointer",
                      }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Wi-Fi kind — toggle + SSID picker + password */}
            {confirm.kind === "wifi" && (() => {
              const v = confirm.to || {};
              const setTo = (patch) => setConfirm(c =>
                c ? { ...c, to: { ...(c.to || {}), ...patch } } : c);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Enable Wi-Fi */}
                  <div>
                    <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>
                      Wi-Fi
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[{ k: true, l: "On" }, { k: false, l: "Off" }].map(o => {
                        const on = v.enabled === o.k;
                        return (
                          <button key={String(o.k)} type="button"
                            onClick={() => setTo({ enabled: o.k })}
                            style={{
                              padding: "6px 14px", borderRadius: 999,
                              background: on ? "var(--color-primary-50)" : "var(--bg2)",
                              border: "1px solid",
                              borderColor: on ? "var(--color-primary-500)" : "var(--border-1)",
                              color: on ? "var(--color-primary-700)" : "var(--fg1)",
                              fontSize: 12, fontWeight: on ? 600 : 500,
                              cursor: "pointer",
                            }}>
                            {o.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Network picker — only when enabling */}
                  {v.enabled && (
                    <div>
                      <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>
                        Network · pick from discovered
                      </div>
                      <div style={{
                        maxHeight: 180, overflowY: "auto",
                        border: "1px solid var(--border-1)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg2)",
                      }}>
                        {(confirm.options || []).map((s, i) => {
                          const on = s === v.ssid;
                          return (
                            <button key={s} type="button"
                              onClick={() => setTo({ ssid: s })}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                width: "100%", padding: "8px 12px",
                                background: on ? "var(--color-primary-50)" : "transparent",
                                border: 0,
                                borderTop: i === 0 ? "none" : "1px solid var(--color-border-subtle)",
                                cursor: "pointer", textAlign: "left",
                              }}>
                              <span style={{
                                width: 14, height: 14, borderRadius: "50%",
                                border: "2px solid",
                                borderColor: on ? "var(--color-primary-500)" : "var(--border-default)",
                                background: on ? "var(--color-primary-500)" : "transparent",
                                flexShrink: 0,
                                boxShadow: on
                                  ? "inset 0 0 0 3px var(--color-bg-1)" : "none",
                              }} />
                              <span className="mono" style={{ flex: 1, fontSize: 12.5,
                                color: on ? "var(--color-primary-700)" : "var(--fg1)",
                                fontWeight: on ? 600 : 500 }}>
                                {s}
                              </span>
                              <window.Ico name="link" size={10} stroke={1.8}
                                style={{ color: "var(--fg3)" }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Password — only when enabling and a network is selected */}
                  {v.enabled && v.ssid && (
                    <div>
                      <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>
                        Password <span style={{ color: "var(--fg3)",
                          textTransform: "none", letterSpacing: 0, fontSize: 10.5 }}>
                          · leave blank for open networks
                        </span>
                      </div>
                      <input type="password" autoComplete="off"
                        value={v.password || ""}
                        onChange={(e) => setTo({ password: e.target.value })}
                        placeholder="••••••••"
                        style={{
                          width: "100%", padding: "8px 12px", fontSize: 13,
                          background: "var(--color-bg-1)",
                          border: "1px solid var(--border-1)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--fg1)",
                          fontFamily: "var(--font-family-mono)",
                          letterSpacing: "0.1em",
                        }} />
                    </div>
                  )}

                  {/* Summary chip — visual confirmation of the queued change */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", alignSelf: "start",
                    background: "var(--color-primary-50)",
                    border: "1px solid color-mix(in oklab, var(--color-primary-500) 35%, transparent)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                  }}>
                    <span style={{ color: "var(--fg2)" }}>Will push:</span>
                    <span className="mono" style={{ color: "var(--color-primary-700)", fontWeight: 600 }}>
                      {v.enabled
                        ? `Wi-Fi on · ${v.ssid || "—"}${v.password ? " · password set" : ""}`
                        : "Wi-Fi off"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Input control — varies by kind */}
            {confirm.kind === "select" && confirm.options && (
              confirm.options.some(o => String(o).length > 18) ? (
                <select
                  value={confirm.to}
                  onChange={(e) => setConfirm(c => c ? { ...c, to: e.target.value } : c)}
                  style={{
                    padding: "8px 12px", fontSize: 13,
                    background: "var(--color-bg-1)",
                    border: "1px solid var(--border-1)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--fg1)",
                    fontFamily: "var(--font-family-mono)",
                  }}>
                  {confirm.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {confirm.options.map(o => {
                    const on = o === confirm.to;
                    return (
                      <button key={o} type="button"
                        onClick={() => setConfirm(c => c ? { ...c, to: o } : c)}
                        style={{
                          padding: "6px 12px", borderRadius: 999,
                          background: on ? "var(--color-primary-50)" : "var(--bg2)",
                          border: "1px solid",
                          borderColor: on ? "var(--color-primary-500)" : "var(--border-1)",
                          color: on ? "var(--color-primary-700)" : "var(--fg1)",
                          fontSize: 12, fontWeight: on ? 600 : 400,
                          fontFamily: "var(--font-family-mono)",
                          cursor: "pointer",
                        }}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {confirm.kind === "slider" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="range" min={0} max={confirm.max || 100}
                  value={confirm.to}
                  onChange={(e) => setConfirm(c => c ? { ...c, to: Number(e.target.value) } : c)}
                  style={{ flex: 1, accentColor: "var(--color-primary-500)" }} />
                <span className="mono" style={{ fontSize: 13, fontWeight: 500,
                  minWidth: 50, textAlign: "right" }}>
                  {confirm.to}{confirm.unit || ""}
                </span>
              </div>
            )}

            <div style={{ fontSize: 12.5, color: "var(--fg3)", lineHeight: 1.5 }}>
              {isBatchableId(confirm.id) ? (
                <>Stages this change into the pending batch. Review and push
                  all changes to <span className="mono">{device.sn}</span> in
                  one tap.</>
              ) : (
                <>The change is sent to <span className="mono">{device.sn}</span> immediately
                  and recorded on the ticket timeline. Effective on the device within
                  a few seconds.</>
              )}
            </div>
          </div>
        ) : ""}
        confirmLabel={confirm && isBatchableId(confirm.id) ? "Stage change" : "Push"}
        onConfirm={stageOrPush} />
    </div>
  );
}

const EVENT_KIND = {
  boot:            { label: "Boot",            icon: "refresh",  color: "var(--color-info-700)",    bg: "var(--color-info-50)",    border: "color-mix(in oklab, var(--color-info-500) 22%, transparent)" },
  "app-install":   { label: "App installed",   icon: "download", color: "var(--color-success-700)", bg: "oklch(96% 0.03 152)",     border: "color-mix(in oklab, var(--color-success-500) 22%, transparent)" },
  "app-update":    { label: "App updated",     icon: "upload",   color: "var(--color-success-700)", bg: "oklch(96% 0.03 152)",     border: "color-mix(in oklab, var(--color-success-500) 22%, transparent)" },
  "app-uninstall": { label: "App uninstalled", icon: "trash",    color: "var(--color-warning-700)", bg: "var(--warning-bg)",        border: "color-mix(in oklab, var(--color-warning-500) 22%, transparent)" },
  "net-change":    { label: "Network change",  icon: "link",     color: "var(--fg2)",                bg: "var(--color-bg-3)",        border: "var(--color-border-subtle)" },
};

// ─── Reusable bits ─────────────────────────────────────────
function Meter({ label, value, max, unit, subValue, tone = "default" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = tone === "danger"  ? "var(--color-error-500)"
                 : tone === "warning" ? "var(--color-warning-500)"
                 :                       "var(--color-primary-500)";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <span className="overline" style={{ fontSize: 10.5 }}>{label}</span>
        <span className="mono num" style={{ fontSize: 11.5, color: "var(--fg3)" }}>{pct}%</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span className="mono num" style={{ fontSize: 20, fontWeight: 500,
          color: tone === "danger" ? "var(--color-error-700)"
              : tone === "warning" ? "var(--color-warning-700)"
              : "var(--fg1)" }}>{value}</span>
        <span style={{ fontSize: 11, color: "var(--fg3)" }}>{unit}{subValue ? ` · ${subValue}` : ""}</span>
      </div>
      <div style={{ marginTop: 6, height: 5, borderRadius: 999, background: "var(--color-bg-3)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width .2s ease" }} />
      </div>
    </div>
  );
}

function KvCompact({ label, value }) {
  return (
    <div>
      <div className="overline" style={{ fontSize: 10.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "var(--fg1)", display: "inline-flex", alignItems: "center", gap: 6 }}>{value}</div>
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      border: `${Math.max(1.5, Math.round(size / 9))}px solid var(--color-bg-3)`,
      borderTopColor: "var(--color-primary-600)",
      animation: "spin .8s linear infinite",
      display: "inline-block",
    }} />
  );
}

// ─── Sub-bits ──────────────────────────────────────────────
const selectStyle = {
  padding: "7px 10px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border-default)", fontSize: 12,
  fontFamily: "inherit",
  background: "var(--bg2)", color: "var(--fg1)",
};

function KvGrid({ rows, compact }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: compact ? "1fr 1fr" : "160px minmax(0, 1fr)",
      rowGap: compact ? 8 : 10, columnGap: 16,
    }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <span className="overline" style={{ fontSize: 10, paddingTop: 2 }}>{k}</span>
          <span style={{ fontSize: 13, color: "var(--color-text-primary)", minWidth: 0,
            display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>{v}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Dash() { return <span style={{ color: "var(--fg3)" }}>—</span>; }

function Flag({ positive, positiveLabel, negativeLabel, tone }) {
  if (positive) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--color-success-700)" }}>
        <window.Ico name="check" size={12} stroke={2.5} />{positiveLabel}
      </span>
    );
  }
  const color = tone === "warning" ? "var(--color-warning-700)" : "var(--color-error-700)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color, fontWeight: 500 }}>
      <window.Ico name="alert" size={12} />{negativeLabel}
    </span>
  );
}

function SecurityList({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return <Flag positive positiveLabel="None reported" />;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
      {warnings.map((w, i) => (
        <li key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12.5, color: "var(--color-warning-700)" }}>
          <window.Ico name="alert" size={12} stroke={2} />{w}
        </li>
      ))}
    </ul>
  );
}

function SecurityBanner({ hardware }) {
  const warnings = [
    ...(hardware.root ? ["Device appears to be rooted"] : []),
    ...(hardware.devMode ? ["Developer options are enabled"] : []),
    ...(hardware.securityWarnings || []),
  ];
  // Dedupe — root warning may also be in the securityWarnings list.
  const unique = [...new Set(warnings)];
  if (unique.length === 0) return null;
  return (
    <div style={{
      padding: "12px 14px",
      background: "var(--warning-bg)",
      border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
      borderRadius: "var(--radius-lg)",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <window.Ico name="alert" size={16} style={{ color: "var(--color-warning-700)", marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warning-700)" }}>
          Hardware integrity flagged
        </div>
        <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12, color: "var(--color-warning-700)", lineHeight: 1.55 }}>
          {unique.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    </div>
  );
}

function NetRow({ label, enabled, detail }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 0",
      borderBottom: "1px dashed var(--color-border-subtle)",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: enabled ? "var(--success)" : "var(--color-border-strong)",
      }} />
      <span style={{ fontSize: 12.5, fontWeight: 500, minWidth: 70 }}>{label}</span>
      <span style={{ fontSize: 12, color: enabled ? "var(--fg2)" : "var(--fg3)", flex: 1, textAlign: "right" }}>
        {detail}
      </span>
    </div>
  );
}

function YesNo({ on, warnWhenOff }) {
  if (on) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--color-success-700)" }}>
        <window.Ico name="check" size={11} stroke={2.5} /> Auto
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5,
      color: warnWhenOff ? "var(--color-warning-700)" : "var(--fg2)" }}>
      Manual
      {warnWhenOff && (
        <span title={warnWhenOff} style={{ color: "var(--color-warning-700)" }}>
          <window.Ico name="alert" size={11} />
        </span>
      )}
    </span>
  );
}

function AppLogo({ seed, name, system }) {
  // Deterministic gradient like the AppIcon shared helper, but smaller.
  let h = 0; for (const c of (seed || name)) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const hue = h % 360;
  const initials = (name || "").split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
      background: system
        ? "var(--color-bg-3)"
        : `linear-gradient(135deg, oklch(58% 0.18 ${hue}), oklch(48% 0.20 ${(hue + 28) % 360}))`,
      color: system ? "var(--color-text-secondary)" : "#fff",
      border: system ? "1px solid var(--color-border-subtle)" : "none",
      display: "grid", placeItems: "center",
      fontSize: 9.5, fontWeight: 600,
      fontFamily: "Geist, system-ui, sans-serif",
      letterSpacing: "-0.02em",
    }}>{initials || "?"}</div>
  );
}

Object.assign(window, {
  DevicesListScreen, DeviceDetailScreen, DeviceMonitoringTab, findDeviceBySn,
  deviceIsOnline, deviceStatusMeta, deviceIdentityFor, versionInfoFor, deviceMetaFor,
  usageCountersFor, simSlotsFor, memorySnapshotFor,
});
