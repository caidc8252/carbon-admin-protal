/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — shared module
// Types, seed data, icons, and small primitives reused across all
// three inbox variants + the rule editor + the detail drawer.
// Everything is exposed on `window.PW.*` so each variant file can pull
// what it needs without import gymnastics in Babel-standalone.
// ─────────────────────────────────────────────────────────────

const PW = window.PW = window.PW || {};

// ─── Type catalog ────────────────────────────────────────────
// Each of the 6 rule types declares (a) its label/icon/accent for UI,
// (b) the rule-shape it edits (`multi` / `threshold` / `geo`), and
// (c) presentational metadata for an alert (how to format the value).
PW.TYPES = {
  battery: {
    label: "Battery", icon: "battery",
    accent: "oklch(56% 0.20 28)", soft: "oklch(96% 0.04 28)",
    kind: "multi", options: ["Red", "Yellow"],
    descriptor: "Battery health drops into Red / Yellow",
  },
  module: {
    label: "Module wear", icon: "plug",
    accent: "oklch(50% 0.17 282)", soft: "oklch(96% 0.03 282)",
    kind: "threshold", unit: "%", dir: "above", defaultValue: 85,
    descriptor: "Hardware module usage exceeds %",
  },
  storage: {
    label: "Storage", icon: "storage",
    accent: "oklch(52% 0.14 250)", soft: "oklch(96% 0.03 250)",
    kind: "threshold", unit: "%", dir: "above", defaultValue: 90,
    descriptor: "Storage usage exceeds %",
  },
  traffic: {
    label: "Mobile data", icon: "wave",
    accent: "oklch(50% 0.16 200)", soft: "oklch(95% 0.03 200)",
    kind: "threshold", unit: "%", dir: "above", defaultValue: 80,
    descriptor: "Mobile data quota usage exceeds %",
  },
  simApn: {
    label: "SIM / APN switch", icon: "sim",
    accent: "oklch(50% 0.15 145)", soft: "oklch(95% 0.04 145)",
    kind: "multi", options: ["SIM changed", "APN changed"],
    descriptor: "Carrier SIM or APN config changed",
  },
  geofence: {
    label: "Geo-fencing", icon: "pin",
    accent: "oklch(54% 0.18 60)", soft: "oklch(96% 0.05 60)",
    kind: "geo",
    descriptor: "Device leaves allowed zone",
  },
};
PW.TYPE_ORDER = ["battery", "module", "storage", "traffic", "simApn", "geofence"];

// ─── Merchants / stores / devices (self-contained mock) ─────
// Mirrors the structure used elsewhere in the portal so screenshots
// look coherent; intentionally a small subset — we only need ~5
// merchants with enough stores to demo store-level binding.
PW.MERCHANTS = [
  {
    id: "m-coffee", name: "Riverside Coffee Co.",
    stores: [
      { id: "s-coffee-hq",  name: "Plateau (HQ)",     city: "Montréal",  count: 4 },
      { id: "s-coffee-pln", name: "Plateau-Mont-Royal", city: "Montréal", count: 3 },
      { id: "s-coffee-old", name: "Old Port",         city: "Montréal",  count: 2 },
    ],
  },
  {
    id: "m-bistro", name: "Cascade Bistro Group",
    stores: [
      { id: "s-bistro-hq",  name: "Robson Street (HQ)", city: "Vancouver", count: 3 },
      { id: "s-bistro-pmt", name: "Park Royal",         city: "Vancouver", count: 2 },
      { id: "s-bistro-wbr", name: "West Broadway",      city: "Vancouver", count: 2 },
    ],
  },
  {
    id: "m-glacier", name: "Glacier Grocers",
    stores: [
      { id: "s-glacier-hq",  name: "Downtown (HQ)",  city: "Vancouver", count: 6 },
      { id: "s-glacier-bby", name: "Burnaby Lougheed", city: "Burnaby", count: 5 },
      { id: "s-glacier-ric", name: "Richmond Centre", city: "Richmond", count: 4 },
      { id: "s-glacier-cal", name: "Calgary 17th Ave", city: "Calgary",  count: 3 },
    ],
  },
  {
    id: "m-northwind", name: "Northwind Logistics",
    stores: [
      { id: "s-nw-hq",  name: "Burnaby Ops",  city: "Burnaby",   count: 5 },
      { id: "s-nw-yyz", name: "Toronto Cargo", city: "Toronto",  count: 6 },
      { id: "s-nw-yul", name: "Montréal Cargo", city: "Montréal", count: 5 },
      { id: "s-nw-yyc", name: "Calgary Dock", city: "Calgary",   count: 4 },
    ],
  },
  {
    id: "m-pharma", name: "Cedar Park Pharmacy",
    stores: [
      { id: "s-pharma-hq", name: "Whyte Ave", city: "Edmonton", count: 2 },
    ],
  },
];

// Flatten merchants → store rows with merchant pointer for store-binding UI.
PW.ALL_STORES = PW.MERCHANTS.flatMap(m =>
  m.stores.map(s => ({ ...s, merchantId: m.id, merchantName: m.name }))
);

// ─── Org users (sub-accounts under the active tenant) ───────
// Used as the recipient pool for the in-app (station letter)
// channel on a pre-warning rule. The first entry is "you",
// always pre-selected.
PW.ORG_USERS = [
  { id: "u-maya",     name: "Maya Hassan",     role: "Tier-2 ISO Lead",  self: true },
  { id: "u-hossein",  name: "Hossein Naderi",  role: "Operations" },
  { id: "u-jordan",   name: "Jordan Park",     role: "Tier-1 Support" },
  { id: "u-priya",    name: "Priya Iyer",      role: "On-call engineer" },
  { id: "u-rahim",    name: "Rahim El-Tahir",  role: "Field ops" },
  { id: "u-sandra",   name: "Sandra Vu",       role: "Account manager" },
];
PW.findUser = (id) => PW.ORG_USERS.find(u => u.id === id);

PW.MODELS = [
  { id: "N950", label: "N950 · Smart POS",    fleet: 68 },
  { id: "S90",  label: "S90 · Mobile POS",    fleet: 24 },
  { id: "S60",  label: "S60 · Pinpad",        fleet: 18 },
  { id: "N750", label: "N750 · Compact POS",  fleet: 9  },
  { id: "X800", label: "X800 · Kiosk",        fleet: 12 },
];

PW.findMerchant = (id) => PW.MERCHANTS.find(m => m.id === id);
PW.findStore = (id) => PW.ALL_STORES.find(s => s.id === id);

// Resolve an SN to whatever fleet info we have (model / store / merchant).
// Today we derive this from PW.ALERTS — any alert involving this SN exposes
// the device's identity. SNs that have never alerted yield null fields.
PW.deviceFromSn = (sn) => {
  const hit = PW.ALERTS.find(a => a.deviceSn === sn);
  if (!hit) return { sn, model: null, storeId: null, storeName: null, merchantId: null, merchantName: null };
  const store = PW.findStore(hit.storeId);
  const merch = PW.findMerchant(hit.merchantId);
  return {
    sn,
    model: hit.model || null,
    storeId: hit.storeId, storeName: store?.name || null,
    merchantId: hit.merchantId, merchantName: merch?.name || null,
  };
};

// Headcount of terminals a binding currently resolves to. Mirrors the
// matchedDevices on persisted rules, but recomputed live for the
// Edit Rule diff strip. Kept here so callers don't duplicate the logic.
PW.computeMatchedDevices = (binding) => {
  if (!binding || !binding.ids?.length) return 0;
  if (binding.kind === "merchant") {
    return binding.ids.reduce((sum, id) => {
      const m = PW.findMerchant(id);
      return sum + (m?.stores || []).reduce((s, st) => s + (st.count || 0), 0);
    }, 0);
  }
  if (binding.kind === "store") {
    return binding.ids.reduce((sum, id) => sum + (PW.findStore(id)?.count || 0), 0);
  }
  if (binding.kind === "model") {
    return binding.ids.reduce((sum, id) => sum + (PW.MODELS.find(x => x.id === id)?.fleet || 0), 0);
  }
  if (binding.kind === "sn") return binding.ids.length;
  return 0;
};

// ─── Rules ──────────────────────────────────────────────────
// Each rule has: type, the rule-shape config (`opts` for multi,
// `value` + `dir` for threshold, `geo` shape for geofence),
// a binding (one of four), and notify config including a throttle.
PW.RULES = [
  {
    id: "R-001", name: "Battery health — Riverside Coffee",
    type: "battery", config: { opts: ["Red", "Yellow"] },
    binding: { kind: "merchant", ids: ["m-coffee"] },
    notify: { station: true, email: true, recipients: ["ops@riverside.ca", "maya@acme.io"], throttle: "digest-daily" },
    enabled: true, createdAt: "Mar 12, 2026", createdBy: "Maya Hassan",
    matchedDevices: 9,
  },
  {
    id: "R-002", name: "Module wear · all N950",
    type: "module", config: { value: 85, dir: "above" },
    binding: { kind: "model", ids: ["N950"] },
    notify: { station: true, email: false, recipients: [], throttle: "digest-daily" },
    enabled: true, createdAt: "Feb 02, 2026", createdBy: "Maya Hassan",
    matchedDevices: 68,
  },
  {
    id: "R-003", name: "Storage low · Cascade Bistro pilot",
    type: "storage", config: { value: 90, dir: "above" },
    binding: { kind: "store", ids: ["s-bistro-hq", "s-bistro-pmt"] },
    notify: { station: true, email: true, recipients: ["pos-ops@cascade.com"], throttle: "instant" },
    enabled: true, createdAt: "Apr 04, 2026", createdBy: "Hossein Naderi",
    matchedDevices: 5,
  },
  {
    id: "R-004", name: "Mobile data ceiling — Northwind fleet",
    type: "traffic", config: { value: 80, dir: "above" },
    binding: { kind: "merchant", ids: ["m-northwind"] },
    notify: { station: true, email: true, recipients: ["fleet@northwind.io", "finance@northwind.io"], throttle: "digest-daily" },
    enabled: true, createdAt: "Jan 22, 2026", createdBy: "Maya Hassan",
    matchedDevices: 20,
  },
  {
    id: "R-005", name: "SIM / APN change watch",
    type: "simApn", config: { opts: ["SIM changed", "APN changed"] },
    // Static SN list — each entry is a real terminal serial. New SNs are
    // appended via the Edit Rule · Bound devices section (no other entry
    // point). Removing one stops alerts for that terminal immediately.
    binding: { kind: "sn", ids: [
      "N950-0014-9281", "N950-0014-9282", "N950-0014-9311",
      "N950-0014-3322", "N950-0014-5510", "N950-0014-5520",
      "N950-0210-7001", "N950-0210-7104", "S90-0822-1102",
      "S60-0488-0021",
    ] },
    notify: { station: true, email: true, recipients: ["security@acme.io"], throttle: "instant" },
    enabled: true, createdAt: "May 03, 2026", createdBy: "Hossein Naderi",
    matchedDevices: 10,
  },
  {
    id: "R-006", name: "Out-of-zone alarm — Glacier Grocers",
    type: "geofence",
    config: { mode: "radius", radiusKm: 5, cities: [] },
    binding: { kind: "merchant", ids: ["m-glacier"] },
    notify: { station: true, email: true, recipients: ["loss-prevention@glacier.ca"], throttle: "instant", urgent: true },
    enabled: true, createdAt: "Apr 28, 2026", createdBy: "Maya Hassan",
    matchedDevices: 18,
  },
];

PW.findRule = (id) => PW.RULES.find(r => r.id === id);

// ─── Mutators + subscription ─────────────────────────────────
// Components that render PW.RULES directly need a re-render when the
// list changes (delete/disable/edit). Use a tiny event-based hook to
// avoid prop-drilling — call `useRulesTick()` in any list-rendering
// component and it'll re-render on rule mutations.
PW.deleteRule = (id) => {
  const idx = PW.RULES.findIndex(r => r.id === id);
  if (idx >= 0) {
    const removed = PW.RULES[idx];
    PW.RULES.splice(idx, 1);
    // Drop associated alerts — they're meaningless once the rule is gone
    for (let i = PW.ALERTS.length - 1; i >= 0; i--) {
      if (PW.ALERTS[i].ruleId === id) PW.ALERTS.splice(i, 1);
    }
    window.dispatchEvent(new CustomEvent("pw:rules-changed", {
      detail: { kind: "delete", id, rule: removed },
    }));
  }
};
PW.useRulesTick = () => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("pw:rules-changed", onChange);
    return () => window.removeEventListener("pw:rules-changed", onChange);
  }, []);
};
PW.toggleRule = (id) => {
  const r = PW.findRule(id);
  if (!r) return;
  r.enabled = !r.enabled;
  window.dispatchEvent(new CustomEvent("pw:rules-changed", {
    detail: { kind: "toggle", id, enabled: r.enabled },
  }));
};
PW.duplicateRule = (id) => {
  const r = PW.findRule(id);
  if (!r) return null;
  const maxNum = PW.RULES.reduce((m, x) => {
    const n = parseInt(String(x.id).replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const newId = `R-${String(maxNum + 1).padStart(3, "0")}`;
  const today = new Date().toLocaleDateString("en-US",
    { month: "short", day: "2-digit", year: "numeric" });
  const copy = JSON.parse(JSON.stringify(r));
  copy.id = newId;
  copy.name = `${r.name} (copy)`;
  copy.enabled = false;
  copy.createdAt = today;
  copy.matchedDevices = 0;
  PW.RULES.push(copy);
  window.dispatchEvent(new CustomEvent("pw:rules-changed", {
    detail: { kind: "duplicate", id: newId, rule: copy, sourceId: id },
  }));
  return copy;
};

// ─── Pre-warnings UI settings (Tweaks-driven) ────────────────
// Lightweight settings bus so the Tweaks panel in app.jsx can flip
// UI-level toggles (e.g. "SN clicks jump to device profile") without
// prop-drilling through every screen. App writes to PW.SETTINGS and
// dispatches `pw:settings-changed`; components subscribe via
// PW.usePWSettings() the same way they subscribe to rule mutations.
PW.SETTINGS = PW.SETTINGS || { snLinkMode: false };
PW.usePWSettings = () => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("pw:settings-changed", onChange);
    return () => window.removeEventListener("pw:settings-changed", onChange);
  }, []);
  return PW.SETTINGS;
};

// ─── SN text helper ─────────────────────────────────────────
// Renders a serial number cell. When the global "snLinkMode" tweak
// is OFF (default), this is plain mono text — identical to the old
// inline <span className="mono">. When ON, the cell becomes a real
// link: hover styling, ↗ glyph, and a click that bypasses the row's
// onClick to jump straight to the device profile.
PW.SNText = function SNText({ sn, onJump, style, weight }) {
  const settings = PW.usePWSettings();
  const linkMode = settings.snLinkMode && typeof onJump === "function";
  const [hover, setHover] = React.useState(false);
  const base = {
    fontFamily: "var(--font-mono)",
    fontSize: "inherit",
    fontWeight: weight,
    color: "inherit",
    ...(style || {}),
  };
  if (!linkMode) {
    return <span style={base}>{sn}</span>;
  }
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onJump(sn); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Open device profile · ${sn}`}
      style={{
        ...base,
        color: "var(--color-primary-700)",
        textDecoration: hover ? "underline" : "none",
        textUnderlineOffset: 2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}>
      {sn}
      <span aria-hidden="true" style={{
        fontSize: "0.85em",
        opacity: hover ? 1 : 0.5,
        transform: hover ? "translate(1px, -1px)" : "none",
        transition: "all .12s ease",
      }}>↗</span>
    </span>
  );
};

// ─── Alerts ────────────────────────────────────────────────
// Each alert = one rule firing on one device. `read=false` means the
// row hasn't been opened yet (the only "disposition" we keep besides
// "convert to ticket" and "self-healed").
let _alertSeed = 100;
const A = (ruleId, deviceSn, merchantId, storeId, model, currentText, firedAt, opts = {}) => ({
  id: "A-" + (++_alertSeed),
  ruleId, deviceSn, merchantId, storeId, model,
  currentText,                 // small string for the row: "8% free", "Red", "92 % above plan"
  firedAt,                     // "12 min ago", "May 17 09:42", etc
  firedAtAbs: opts.abs || "May 17, 2026 09:42",
  read: opts.read || false,
  ticketId: opts.ticketId || null,
  selfHealed: opts.selfHealed || false,
  detail: opts.detail || null, // optional one-line context
});

PW.ALERTS = [
  // R-001 Battery (Riverside Coffee, 9 devices, 6 firing, 3 unread)
  A("R-001", "N950-0014-9282", "m-coffee", "s-coffee-hq",  "N950", "Red",    "8 min ago",  { abs: "May 17, 2026 14:32", detail: "Health 47% · 612 cycles" }),
  A("R-001", "N750-0099-0040", "m-coffee", "s-coffee-old", "N750", "Red",    "32 min ago", { abs: "May 17, 2026 14:08", detail: "Health 51% · 540 cycles" }),
  A("R-001", "S60-0488-0021",  "m-coffee", "s-coffee-pln", "S60",  "Yellow", "1 h ago",    { abs: "May 17, 2026 13:38", detail: "Health 68% · 412 cycles" }),
  A("R-001", "N950-0014-9311", "m-coffee", "s-coffee-pln", "N950", "Yellow", "3 h ago",    { abs: "May 17, 2026 11:21", read: true, detail: "Health 72% · 388 cycles" }),
  A("R-001", "N950-0014-9312", "m-coffee", "s-coffee-pln", "N950", "Yellow", "yesterday",  { abs: "May 16, 2026 18:02", read: true, detail: "Health 71% · 392 cycles" }),
  A("R-001", "N950-0014-9281", "m-coffee", "s-coffee-hq",  "N950", "Yellow", "2 days ago", { abs: "May 15, 2026 22:14", read: true, selfHealed: true, detail: "Health recovered to 81% after swap" }),

  // R-002 Module wear (N950 fleet) — 4 firing, all unread
  A("R-002", "N950-0014-3322", "m-bistro",  "s-bistro-hq",  "N950", "Printer 92%", "14 min ago", { abs: "May 17, 2026 14:26", detail: "Printer head usage 92% · ~410 km printed" }),
  A("R-002", "N950-0014-5510", "m-glacier", "s-glacier-bby", "N950", "MSR 88%",    "1 h ago",    { abs: "May 17, 2026 13:30", detail: "Magstripe reader use 88%" }),
  A("R-002", "N950-0014-3401", "m-bistro",  "s-bistro-pmt", "N950", "NFC 87%",    "4 h ago",    { abs: "May 17, 2026 10:15", detail: "NFC antenna failure rate 0.4 %" }),
  A("R-002", "N950-0014-5520", "m-glacier", "s-glacier-ric", "N950", "Printer 86%", "yesterday", { abs: "May 16, 2026 11:08", read: true, detail: "Printer head usage 86%" }),

  // R-003 Storage low (Cascade Bistro pilot) — 3 firing, 2 unread
  A("R-003", "N950-0014-3322", "m-bistro", "s-bistro-hq",  "N950", "8 % free",  "22 min ago", { abs: "May 17, 2026 14:18", detail: "2.6 GB free of 32 GB" }),
  A("R-003", "N950-0014-3401", "m-bistro", "s-bistro-pmt", "N950", "6 % free",  "2 h ago",    { abs: "May 17, 2026 12:42", detail: "1.9 GB free of 32 GB" }),
  A("R-003", "N950-0014-3323", "m-bistro", "s-bistro-hq",  "N950", "9 % free",  "yesterday",  { abs: "May 16, 2026 19:50", read: true, detail: "2.8 GB free of 32 GB" }),

  // R-004 Mobile data ceiling — 5 firing, 3 unread
  A("R-004", "N950-0210-7001", "m-northwind", "s-nw-hq",  "N950", "94 % of 5 GB", "9 min ago",  { abs: "May 17, 2026 14:31", detail: "4.70 GB used · cycle ends in 4 d" }),
  A("R-004", "N950-0210-7104", "m-northwind", "s-nw-yyz", "N950", "88 % of 5 GB", "1 h ago",    { abs: "May 17, 2026 13:30", detail: "4.40 GB used" }),
  A("R-004", "S90-0210-7205",  "m-northwind", "s-nw-yul", "S90",  "85 % of 5 GB", "2 h ago",    { abs: "May 17, 2026 12:05", detail: "4.25 GB used" }),
  A("R-004", "N950-0210-7106", "m-northwind", "s-nw-yyz", "N950", "82 % of 5 GB", "yesterday",  { abs: "May 16, 2026 22:09", read: true, ticketId: "T-2026-038", detail: "4.10 GB used · escalated" }),
  A("R-004", "N950-0210-7301", "m-northwind", "s-nw-yyc", "N950", "81 % of 5 GB", "3 days ago", { abs: "May 14, 2026 09:14", read: true, selfHealed: true, detail: "Cycle reset — back to 4 %" }),

  // R-005 SIM / APN change — 2 firing, 2 unread
  A("R-005", "N950-0014-9281", "m-coffee", "s-coffee-hq", "N950", "SIM changed", "26 min ago", { abs: "May 17, 2026 14:14", detail: "Bell ICCID · 89148000…012 → 89148000…044" }),
  A("R-005", "S90-0822-1102",  "m-pharma", "s-pharma-hq", "S90",  "APN changed", "5 h ago",    { abs: "May 17, 2026 09:42", detail: "carrier.bell.ca → custom-apn.local" }),

  // R-006 Geo-fencing (Glacier Grocers) — 1 firing, urgent
  A("R-006", "N950-0014-5510", "m-glacier", "s-glacier-bby", "N950", "8.4 km from store", "4 min ago", { abs: "May 17, 2026 14:36", detail: "Last seen: 49.2641° N, 122.9201° W (Coquitlam)" }),

  // ─── Historical alerts (already closed) — give a few terminals a
  // track record so the device-history drawer has something to show.
  // All carry read=true; status comes from ticketId / selfHealed.
  A("R-001", "N950-0014-9282", "m-coffee", "s-coffee-hq",  "N950", "Yellow", "5 days ago",   { abs: "May 12, 2026 09:21", read: true, ticketId: "T-2026-018", detail: "Yellow → Red over 30 min · escalated to NPT" }),
  A("R-001", "N950-0014-9282", "m-coffee", "s-coffee-hq",  "N950", "Yellow", "2 weeks ago",  { abs: "May 02, 2026 14:08", read: true, selfHealed: true, detail: "Battery health 79% → recovered after a full discharge cycle" }),
  A("R-001", "N950-0014-9282", "m-coffee", "s-coffee-hq",  "N950", "Yellow", "4 weeks ago",  { abs: "Apr 15, 2026 11:03", read: true, selfHealed: true, detail: "Single Yellow event · self-healed within 1 h" }),
  A("R-001", "N950-0014-9282", "m-coffee", "s-coffee-hq",  "N950", "Yellow", "8 weeks ago",  { abs: "Mar 20, 2026 18:55", read: true, selfHealed: true, detail: "Self-healed within 4 h" }),

  A("R-002", "N950-0014-3322", "m-bistro",  "s-bistro-hq", "N950", "Printer 87%", "1 week ago",  { abs: "May 10, 2026 14:18", read: true, selfHealed: true, detail: "Threshold floated back below cutoff after printhead clean" }),
  A("R-002", "N950-0014-3322", "m-bistro",  "s-bistro-hq", "N950", "Printer 86%", "3 weeks ago", { abs: "Apr 25, 2026 09:42", read: true, ticketId: "T-2026-009", detail: "Escalated to NPT · cartridge replaced" }),
  A("R-002", "N950-0014-3322", "m-bistro",  "s-bistro-hq", "N950", "Printer 85%", "7 weeks ago", { abs: "Mar 28, 2026 16:32", read: true, selfHealed: true, detail: "Self-healed after kernel reboot" }),

  A("R-004", "N950-0210-7001", "m-northwind", "s-nw-hq",   "N950", "85 % of 5 GB", "Last cycle",     { abs: "Apr 17, 2026 23:59", read: true, selfHealed: true, detail: "End of billing cycle — reset to 4 %" }),
  A("R-004", "N950-0210-7001", "m-northwind", "s-nw-hq",   "N950", "82 % of 5 GB", "Two cycles ago", { abs: "Mar 17, 2026 22:14", read: true, selfHealed: true, detail: "End of billing cycle — reset" }),
];

// Disposition derived state for an alert. `urgent` is rule-level
// (geofence default true) but we elevate the visual on the row.
PW.statusOf = (alert) => {
  if (alert.ticketId) return "converted";
  if (alert.selfHealed) return "self-healed";
  if (alert.read) return "read";
  return "unread";
};

// All alerts for one (device, rule) pair, sorted newest-first.
// Used by the device-history drawer.
PW.alertsForDevice = (deviceSn, ruleId) => {
  return PW.ALERTS
    .filter(a => a.deviceSn === deviceSn && a.ruleId === ruleId)
    .sort((a, b) => new Date(b.firedAtAbs) - new Date(a.firedAtAbs));
};

// Helper: alerts grouped by rule type, with per-type counts.
PW.groupByType = (alerts) => {
  const out = {};
  // `firing` is the same definition used in the rule rows + page-header pill
  // — events still triggering (not self-healed, not promoted to a ticket).
  // Tiles show this number so the type-level total ties out with the sum of
  // the firing events shown when you expand each rule of that type.
  PW.TYPE_ORDER.forEach(t => { out[t] = { type: t, alerts: [], unread: 0, total: 0, firing: 0 }; });
  alerts.forEach(a => {
    const rule = PW.findRule(a.ruleId);
    if (!rule) return;
    const g = out[rule.type];
    g.alerts.push(a);
    g.total++;
    if (PW.statusOf(a) === "unread") g.unread++;
    if (!a.selfHealed && !a.ticketId) g.firing++;
  });
  return PW.TYPE_ORDER.map(t => out[t]);
};

// ─── Icon set ────────────────────────────────────────────────
// Small inline-SVG set; no dependency on the portal shell's Ico.
// Each icon is a JSX fragment of <path>/<rect>/etc., rendered into a
// 24-viewBox canvas at any pixel size.
const PWI = {
  battery:  <><rect x="3" y="8" width="14" height="9" rx="2"/><path d="M17 11h2v3h-2"/></>,
  plug:     <><path d="M9 3v6"/><path d="M15 3v6"/><rect x="6" y="9" width="12" height="6" rx="2"/><path d="M12 15v3a3 3 0 0 0 3 3"/></>,
  storage:  <><rect x="3" y="4" width="18" height="5" rx="2"/><rect x="3" y="11" width="18" height="5" rx="2"/><path d="M3 18v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"/><circle cx="7" cy="6.5" r="0.6" fill="currentColor"/><circle cx="7" cy="13.5" r="0.6" fill="currentColor"/></>,
  wave:     <><path d="M3 17h2l2-9 2 14 2-11 2 7 2-4 2 3h4"/></>,
  sim:      <><path d="M8 3h7l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 10h6v8H9z"/><path d="M11 10v3M13 10v3M9 14h6"/></>,
  pin:      <><path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
  bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  mail:     <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  filter:   <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
  chevd:    <path d="m6 9 6 6 6-6"/>,
  chevr:    <path d="m9 6 6 6-6 6"/>,
  chevl:    <path d="m15 6-6 6 6 6"/>,
  chevu:    <path d="m6 15 6-6 6 6"/>,
  plus:     <path d="M12 5v14M5 12h14"/>,
  check:    <path d="m4.5 12.5 5 5 10-11"/>,
  x:        <path d="M6 6l12 12M18 6 6 18"/>,
  ticket:   <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12"/></>,
  more:     <><circle cx="5"  cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></>,
  bolt:     <path d="m13 3-9 12h7l-1 6 9-12h-7z"/>,
  alert:    <><path d="M12 9v4M12 17h0"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></>,
  device:   <><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17.5" r="0.7" fill="currentColor"/></>,
  store:    <><path d="M3 9l1.5-5h15L21 9"/><path d="M5 9v11h14V9"/><path d="M9 20v-5h6v5"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/></>,
  globe:    <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  upload:   <><path d="M12 20V8"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/></>,
  reset:    <><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 4v4h-4"/></>,
  edit:     <><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m14 6 4 4"/></>,
  external: <><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
  cog:      <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  trash:    <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/></>,
  copy:     <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></>,
  pause:    <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
};

PW.Ico = function Ico({ name, size = 14, stroke = 1.6, style, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color || "currentColor"} strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PWI[name] || null}
    </svg>
  );
};

// ─── TypeChip — small badge with icon for one of the 6 types ─
PW.TypeChip = function TypeChip({ type, size = "md" }) {
  const t = PW.TYPES[type];
  if (!t) return null;
  const isSm = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isSm ? 4 : 6,
      padding: isSm ? "1px 6px 1px 5px" : "2px 8px 2px 6px",
      borderRadius: 999,
      background: t.soft, color: t.accent,
      border: `1px solid color-mix(in oklab, ${t.accent} 28%, transparent)`,
      fontSize: isSm ? 10.5 : 11.5, fontWeight: 500,
      letterSpacing: "0.005em", whiteSpace: "nowrap",
    }}>
      <PW.Ico name={t.icon} size={isSm ? 10 : 12} stroke={1.7} />
      {t.label}
    </span>
  );
};

// ─── ReadDot — left-edge unread indicator ────────────────────
PW.ReadDot = function ReadDot({ status, size = 8 }) {
  // unread → filled accent dot
  // converted → ticket-icon mini
  // self-healed → ring (auto-closed)
  // read → empty hollow ring
  if (status === "unread") {
    return <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: "var(--color-primary-500)",
      boxShadow: `0 0 0 3px color-mix(in oklab, var(--color-primary-500) 18%, transparent)`,
    }} />;
  }
  if (status === "converted") {
    return <span title="Converted to ticket" style={{
      display: "inline-grid", placeItems: "center",
      width: size + 4, height: size + 4, borderRadius: 3,
      background: "color-mix(in oklab, var(--color-info-500) 14%, transparent)",
      color: "var(--color-info-700)",
    }}><PW.Ico name="ticket" size={9} stroke={2} /></span>;
  }
  if (status === "self-healed") {
    return <span title="Self-healed" style={{
      display: "inline-grid", placeItems: "center",
      width: size + 4, height: size + 4, borderRadius: "50%",
      background: "color-mix(in oklab, var(--color-success-500) 12%, transparent)",
      color: "var(--color-success-700)",
    }}><PW.Ico name="check" size={8} stroke={2.4} /></span>;
  }
  // read: hollow ring
  return <span style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    background: "transparent",
    border: "1.5px solid color-mix(in oklab, var(--fg3) 50%, transparent)",
  }} />;
};

// ─── StatusPill — terse text label for converted / self-healed ─
PW.StatusPill = function StatusPill({ status, ticketId }) {
  if (status === "converted") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "1px 6px", borderRadius: 4,
        background: "color-mix(in oklab, var(--color-info-500) 12%, transparent)",
        color: "var(--color-info-700)",
        fontSize: 10.5, fontWeight: 500,
        fontFamily: "var(--font-mono)",
      }}>
        <PW.Ico name="ticket" size={9} stroke={2} />
        {ticketId || "Converted"}
      </span>
    );
  }
  if (status === "self-healed") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "1px 6px", borderRadius: 4,
        background: "color-mix(in oklab, var(--color-success-500) 12%, transparent)",
        color: "var(--color-success-700)",
        fontSize: 10.5, fontWeight: 500,
      }}>
        <PW.Ico name="check" size={9} stroke={2.4} />
        Self-healed
      </span>
    );
  }
  return null;
};

// ─── Binding summary string ──────────────────────────────────
PW.bindingSummary = (rule) => {
  const b = rule.binding;
  if (b.kind === "merchant") {
    const names = b.ids.map(id => PW.findMerchant(id)?.name || id);
    return { icon: "store", text: names.join(", "), kindLabel: "Merchant" };
  }
  if (b.kind === "store") {
    const names = b.ids.map(id => PW.findStore(id)?.name || id);
    return { icon: "building", text: names.length <= 2 ? names.join(", ") : `${names.length} stores`, kindLabel: "Stores" };
  }
  if (b.kind === "model") {
    return { icon: "device", text: b.ids.join(", "), kindLabel: "Model" };
  }
  if (b.kind === "sn") {
    return { icon: "upload",
             text: `${b.ids.length} SN${b.ids.length === 1 ? "" : "s"}`,
             kindLabel: "SN list" };
  }
  return { icon: "store", text: "—", kindLabel: "—" };
};
