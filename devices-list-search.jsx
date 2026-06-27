/* global React */
// ─────────────────────────────────────────────────────────────
// Devices · List page — condition area replaced with the standard
// SearchBar pattern (SN / Status / Model / Owner / Merchant / Store),
// matching the rest of the admin (Orders / Customers …) and the
// project's CLAUDE.md "按照搜索样式 / 标准列表样式" conventions.
//
//   · 点击 Search（或 Enter）才出结果 —— useSearchBar(draft→applied)
//   · 三段关系筛选：Owner → Operating merchant → Operating store（级联）
//   · 下方 Active filters 可单条移除 + Clear all
//   · 列与「数据模型」对齐：SN · Model · Owner · Merchant·Store ·
//     OS/Firmware · Last seen · Connectivity · Status
//     （POSTURE 列已去除；电量 / 存储 / 信号 / 打印机等"超出模型"的列一并移除）
//
// Overrides window.DevicesListScreen defined in devices-fleet.jsx.
// Works directly on window.PROD_DEVICES (the canonical seed) —— owner is
// resolved through merchant.isoId → SEED_CUSTOMERS, not a separate map.
// ─────────────────────────────────────────────────────────────

(function () {
  const { useState, useMemo, useEffect, useRef } = React;
  const Pill = window.Pill, Ico = window.Ico;

  // Scoped override: the devices list no longer pins its count row / header
  // (per request — everything scrolls with content; thead already un-pinned via scrollX).
  if (typeof document !== "undefined" && !document.getElementById("devices-list-overrides")) {
    const s = document.createElement("style");
    s.id = "devices-list-overrides";
    s.textContent = ".devices-list-card .list-card__head { position: static; }"
      + " .devices-list-card .list-card__scroll > table.tds-table thead th { position: static; }"
      + " .devices-toolbar { position: static; }"
      + " .sb__select-like:hover:not(:disabled) { border-color: var(--color-border-strong, var(--color-border-default)); }"
      + " .sb__select-like:focus-visible { outline: none; border-color: var(--color-primary-500); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary-500) 18%, transparent); }";
    document.head.appendChild(s);
  }

  // ─── Status (DEVICE.STATUS) ──────────────────────────────
  // Three-state, decoupled from connectivity. Seed rows carry `status`,
  // merchant-synthesized rows carry `state`; normalize through devStatus().
  const DEVICE_STATE = {
    active:  { label: "Active",  tone: "success" },
    locked:  { label: "Locked",  tone: "error"   },
    pending: { label: "Pending", tone: "warning" },
  };
  const ONLINE_PILL = {
    online:  { label: "Online",  tone: "success" },
    offline: { label: "Offline", tone: "neutral" },
  };
  const devStatus = (d) => d.status || d.state || "active";

  // Advanced-Sheet field label + sub-group heading styles (ui-spec §5).
  const advLblStyle = { display: "block", marginBottom: 6, fontSize: 10.5, fontWeight: 600, color: "var(--fg3)", letterSpacing: "0.06em", textTransform: "uppercase" };
  const advSubStyle = { marginBottom: 10, fontSize: 10.5, fontWeight: 600, color: "var(--fg2)", letterSpacing: "0.06em", textTransform: "uppercase" };

  // Read-only echo chip for the AdvancedSheet "APPLIES WITH" row (§4.6).
  function AdvEchoChip({ label, value }) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 8px",
        borderRadius: 999, background: "var(--color-bg-3)",
        border: "1px solid var(--color-border-default)",
        color: "var(--fg2)", fontSize: 11.5,
      }}>
        <span>{label}</span>
        <span className="mono" style={{ color: "var(--fg1)", fontWeight: 600 }}>{value}</span>
      </span>
    );
  }

  // ─── Last-seen derivation ────────────────────────────────
  const LAST_SEEN_REF = new Date("2026-05-12T14:30:00");
  function lastSeenMinutes(rel) {
    if (!rel || rel === "never") return Infinity;
    if (/just now/i.test(rel)) return 0;
    const m = rel.match(/(\d+)\s*(min|minute|hour|day|hr|h|d|m)/i);
    if (!m) return Infinity;
    const v = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    if (u.startsWith("d")) return v * 1440;
    if (u.startsWith("h")) return v * 60;
    return v;
  }
  // Absolute time per ui-spec §9: `M/D/YYYY h:mm AM/PM` — no leading zero on
  // month/day/hour, minutes 2-digit, 12h + AM/PM, no seconds, no timezone.
  function fmtClock(dt) {
    let h = dt.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()} ${h}:${mm} ${ampm}`;
  }
  function fmtLastSeen(rel) {
    if (!rel || rel === "never") return "Never";
    const mins = lastSeenMinutes(rel);
    if (!isFinite(mins)) return rel;
    return fmtClock(new Date(LAST_SEEN_REF - mins * 60000));
  }
  function relLastSeen(rel) {
    if (!rel || rel === "never") return rel === "never" ? "never" : "—";
    if (/just now/i.test(rel)) return "just now";
    const m = rel.match(/(\d+)\s*(min|minute|hour|day|hr|h|d|m)/i);
    if (!m) return rel;
    const v = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    if (u.startsWith("d")) return `${v} d ago`;
    if (u.startsWith("h") || u.startsWith("hr")) return `${v} h ago`;
    return `${v} min ago`;
  }
  function deviceOnline(d) {
    if (devStatus(d) === "pending") return false;
    return lastSeenMinutes(d.lastSeenAt) <= 15;
  }

  // ─── Ownership (DEVICE.PARTNER) ──────────────────────────
  // A device's owner is the ISO/ISV that operates the merchant it is
  // bound to: device.merchantId → MERCHANTS[].isoId → SEED_CUSTOMERS.
  function ownerOf(d) {
    const m = window.findMerchantById ? window.findMerchantById(d.merchantId) : null;
    if (!m || !m.isoId) return null;
    return (window.SEED_CUSTOMERS || []).find((c) => c.id === m.isoId)
        || { id: m.isoId, name: m.isoId };
  }

  // ─── Cascading picker ────────────────────────────────────
  // Fuzzy-search dropdown with recents, "type-more" guidance, async
  // search, and a cascade-disabled state. (Ported from the Devices v2
  // list — single source for Owner / Merchant / Store / Model pickers.)
  function loadRecents(key) {
    if (!key) return [];
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(raw) ? raw.filter((r) => r && r.id) : [];
    } catch (e) { return []; }
  }
  function pushRecent(key, item, max = 5) {
    if (!key) return [];
    const prev = loadRecents(key);
    const next = [{ id: item.id, name: item.name, sub: item.sub || null }, ...prev.filter((r) => r.id !== item.id)].slice(0, max);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { /* ignore */ }
    return next;
  }

  const MAX_RESULTS = 15;
  const TYPE_MORE_THRESHOLD = 10;

  function CascadingPicker({ value, onChange, options = [], placeholder, icon, width = 200,
                            recentKey, disabled, disabledHint, requireQuery = false,
                            confirmToFilter = false, searchFn = null, valueLabel = null }) {
    const isAsync = typeof searchFn === "function";
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [committedQ, setCommittedQ] = useState("");
    const [recents, setRecents] = useState(() => loadRecents(recentKey));
    const [asyncResults, setAsyncResults] = useState([]);
    const [asyncLoading, setAsyncLoading] = useState(false);
    const [asyncSearched, setAsyncSearched] = useState(false);
    const reqIdRef = useRef(0);
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [open]);
    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
    useEffect(() => { if (!open) { setQ(""); setCommittedQ(""); setAsyncResults([]); setAsyncSearched(false); setAsyncLoading(false); } }, [open]);

    useEffect(() => {
      if (!isAsync || !open) return;
      const term = (confirmToFilter ? committedQ : q).trim();
      if (!term) { setAsyncResults([]); setAsyncSearched(false); setAsyncLoading(false); return; }
      const myReq = ++reqIdRef.current;
      setAsyncLoading(true);
      const delay = confirmToFilter ? 0 : 220;
      const tid = setTimeout(async () => {
        try {
          const rows = await searchFn(term);
          if (myReq !== reqIdRef.current) return;
          setAsyncResults(Array.isArray(rows) ? rows : []);
          setAsyncSearched(true);
        } catch (err) {
          if (myReq !== reqIdRef.current) return;
          setAsyncResults([]); setAsyncSearched(true);
        } finally {
          if (myReq === reqIdRef.current) setAsyncLoading(false);
        }
      }, delay);
      return () => clearTimeout(tid);
    }, [isAsync, open, q, committedQ, confirmToFilter]);

    const selected = isAsync
      ? (value != null ? { id: value, name: valueLabel || value } : null)
      : (options.find((o) => o.id === value) || (value != null ? recents.find((r) => r.id === value) : null));
    const effectiveQ = confirmToFilter ? committedQ : q;
    const isDirty = confirmToFilter && q.trim() !== committedQ.trim();

    const filtered = useMemo(() => {
      if (isAsync) return asyncResults;
      const n = effectiveQ.trim().toLowerCase();
      if (!n) return options;
      return options
        .filter((o) => o.name.toLowerCase().includes(n) || (o.id || "").toLowerCase().includes(n))
        .sort((a, b) => {
          const ap = a.name.toLowerCase().startsWith(n) ? 0 : 1;
          const bp = b.name.toLowerCase().startsWith(n) ? 0 : 1;
          return ap - bp || a.name.localeCompare(b.name);
        });
    }, [options, effectiveQ, isAsync, asyncResults]);

    const shown = filtered.slice(0, MAX_RESULTS);
    const truncated = filtered.length > MAX_RESULTS;
    const showRecentsList = effectiveQ.trim() === "" && recents.length > 0;
    const showTypeMore = effectiveQ.trim() === "" && !showRecentsList && (requireQuery || isAsync || options.length > TYPE_MORE_THRESHOLD);

    const pick = (o) => {
      setRecents(pushRecent(recentKey, o, 5));
      onChange(o.id);
      setOpen(false); setQ(""); setCommittedQ("");
    };
    const commitQuery = () => { if (confirmToFilter) setCommittedQ(q); };
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (confirmToFilter && isDirty) commitQuery();
        else if (shown.length > 0) pick(shown[0]);
      } else if (e.key === "Escape") { setOpen(false); }
    };
    const clearValue = (e) => { e.stopPropagation(); onChange(null); setQ(""); setCommittedQ(""); };
    const removeRecent = (id, e) => {
      e.stopPropagation();
      const next = recents.filter((r) => r.id !== id);
      try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch (err) { /* ignore */ }
      setRecents(next);
    };
    const clearAllRecents = () => {
      try { localStorage.setItem(recentKey, "[]"); } catch (err) { /* ignore */ }
      setRecents([]);
    };

    return (
      <div ref={ref} style={{ position: "relative", width }}>
        <button type="button" disabled={disabled}
          onClick={() => !disabled && setOpen((x) => !x)}
          className="sb__select-like"
          style={{
            width: "100%", height: 36, padding: "0 10px",
            border: "1px solid var(--color-border-default)",
            borderRadius: 7,
            background: disabled ? "var(--color-bg-3)" : "var(--color-bg-2)",
            color: "var(--color-text-primary)", fontSize: 13, fontFamily: "inherit",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            opacity: disabled ? 0.6 : 1,
            transition: "border-color 120ms, box-shadow 120ms",
          }}
          title={disabled ? disabledHint : ""}>
          {icon && <Ico name={icon} size={13} style={{ color: selected ? "var(--color-primary-700)" : "var(--color-text-tertiary)", flex: "none" }} />}
          <span style={{
            flex: 1, textAlign: "left", minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: selected ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            fontWeight: selected ? 500 : 400,
          }}>
            {selected ? selected.name : placeholder}
          </span>
          {selected && !disabled && (
            <span onMouseDown={clearValue} title="Clear"
              style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, color: "var(--color-text-tertiary)", cursor: "pointer", flex: "none" }}>
              <Ico name="x" size={11} />
            </span>
          )}
          <Ico name="chevD" size={11} style={{ color: "var(--color-text-tertiary)", flex: "none" }} />
        </button>
        {open && !disabled && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            width: typeof width === "number" ? Math.max(width, 320) : 360, zIndex: 50,
            background: "var(--bg2)", border: "1px solid var(--border-2)",
            borderRadius: 8, boxShadow: "0 14px 36px -8px oklch(0% 0 0 / 0.18)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-1)" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--bg1)",
                border: `1px solid ${isDirty ? "var(--color-primary-500)" : "var(--border-1)"}`,
                borderRadius: 6, padding: "5px 8px",
              }}>
                <Ico name="search" size={11} style={{ color: "var(--fg3)" }} />
                <input ref={inputRef} value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={confirmToFilter ? "Type and press Enter to search" : `Type to filter \u2014 top ${MAX_RESULTS} shown`}
                  style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 12.5 }} />
                {q && (
                  <span onClick={() => { setQ(""); if (confirmToFilter) setCommittedQ(""); }}
                    style={{ cursor: "pointer", color: "var(--fg3)" }}>
                    <Ico name="x" size={10} />
                  </span>
                )}
                {confirmToFilter && (
                  <button type="button" onClick={commitQuery} disabled={!isDirty}
                    title="Search (Enter)"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 4,
                      border: "1px solid " + (isDirty ? "var(--color-primary-500)" : "var(--border-1)"),
                      background: isDirty ? "var(--color-primary-500)" : "transparent",
                      color: isDirty ? "#fff" : "var(--fg3)",
                      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
                      cursor: isDirty ? "pointer" : "not-allowed",
                    }}>
                    Enter
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              {showRecentsList && (
                <>
                  <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 4px" }}>
                    <span style={{ flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg3)" }}>
                      Recent · {recents.length}
                    </span>
                    <span onClick={clearAllRecents} style={{ fontSize: 10.5, color: "var(--fg3)", cursor: "pointer" }}>Clear</span>
                  </div>
                  {recents.map((r) => {
                    const m = options.find((o) => o.id === r.id) || r;
                    const isOn = value === r.id;
                    return (
                      <div key={r.id} onClick={() => pick(m)}
                        style={{
                          padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                          background: isOn ? "var(--color-primary-50)" : "transparent",
                          borderLeft: isOn ? "2px solid var(--color-primary-500)" : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => { if (!isOn) e.currentTarget.style.background = "var(--bg-hover, var(--bg3))"; }}
                        onMouseLeave={(e) => { if (!isOn) e.currentTarget.style.background = "transparent"; }}>
                        <Ico name="clock" size={11} style={{ color: "var(--fg3)", flex: "none" }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.name}
                        </span>
                        <span onClick={(e) => removeRecent(r.id, e)} title="Remove"
                          style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 4, color: "var(--fg4)", cursor: "pointer", flex: "none" }}>
                          <Ico name="x" size={10} />
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: "1px solid var(--border-1)", margin: "4px 0" }} />
                </>
              )}

              {showTypeMore && (
                <div style={{ padding: "18px 16px", textAlign: "center" }}>
                  <Ico name="search" size={18} style={{ color: "var(--fg4)" }} />
                  {!requireQuery && !isAsync && (
                    <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 500, color: "var(--fg2)" }}>
                      {options.length.toLocaleString()} entries available
                    </div>
                  )}
                  <div style={{ marginTop: 3, fontSize: 11, color: "var(--fg3)" }}>
                    {isAsync
                      ? (confirmToFilter ? "Type and press Enter to search" : "Type a few characters to search")
                      : requireQuery
                        ? (confirmToFilter ? "Type and press Enter to search" : "Type a few characters to search")
                        : "Type a few characters to narrow down"}
                  </div>
                </div>
              )}

              {isAsync && asyncLoading && !showRecentsList && (
                <div style={{ padding: "18px 16px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>
                  Searching…
                </div>
              )}
              {isAsync && !asyncLoading && asyncSearched && shown.length === 0 && (
                <div style={{ padding: "18px 16px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>
                  No matches
                </div>
              )}

              {!showTypeMore && !(isAsync && asyncLoading) && !(isAsync && asyncSearched && shown.length === 0) && !isAsync && shown.length === 0 && (
                <div style={{ padding: "18px 16px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>
                  No matches
                </div>
              )}
              {!showTypeMore && !(isAsync && asyncLoading) && shown.map((o) => {
                const isOn = value === o.id;
                return (
                  <div key={o.id} onClick={() => pick(o)}
                    style={{
                      padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      background: isOn ? "var(--color-primary-50)" : "transparent",
                      borderLeft: isOn ? "2px solid var(--color-primary-500)" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isOn) e.currentTarget.style.background = "var(--bg-hover, var(--bg3))"; }}
                    onMouseLeave={(e) => { if (!isOn) e.currentTarget.style.background = "transparent"; }}>
                    {icon && <Ico name={icon} size={12} style={{ color: "var(--fg3)", flex: "none" }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--fg1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
                      {o.sub && <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{o.sub}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "6px 10px", fontSize: 10.5, color: "var(--fg3)", borderTop: "1px solid var(--border-1)", background: "var(--bg1)" }}>
              {isAsync
                ? (asyncLoading
                    ? "Querying…"
                    : effectiveQ
                      ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
                      : showRecentsList ? "Showing recent selections" : "Type to search")
                : truncated
                  ? `Showing top ${MAX_RESULTS} of ${filtered.length.toLocaleString()} matches — type more to narrow`
                  : effectiveQ
                    ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
                    : showRecentsList ? "Showing recent selections"
                      : requireQuery ? "Type to search" : `${options.length} entr${options.length === 1 ? "y" : "ies"} available`}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Column catalog ──────────────────────────────────────
  // Flat list (no group headers) — mirrors the reference Devices column
  // chooser. Order here is the canonical table order. Owner is admin-only
  // (the reference is ISO-scoped) and shown by default.
  const COLUMN_GROUPS = [
    { name: "", items: [
      { id: "sn", label: "SN / Model", locked: true },
      { id: "owner", label: "Owner" },
      { id: "merchantStore", label: "Merchant / Store" },
      { id: "osFirmware", label: "OS / Firmware" },
      { id: "imei", label: "IMEI" },
      { id: "manufacturer", label: "Manufacturer" },
      { id: "lastSeen", label: "Last seen" },
      { id: "activatedAt", label: "Activated" },
      { id: "online", label: "Connectivity" },
      { id: "network", label: "Network" },
      { id: "status", label: "Status" },
      { id: "lockStatus", label: "Lock status" },
    ] },
  ];
  // Canonical table order = catalog order; defaults match the reference's
  // shown set plus Owner.
  const COL_ALL = [
    "sn", "owner", "merchantStore", "osFirmware", "imei", "manufacturer",
    "lastSeen", "activatedAt", "online", "network", "status", "lockStatus",
  ];
  const COL_DEFAULTS = ["sn", "owner", "merchantStore", "osFirmware", "lastSeen", "online", "status"];
  const COL_LOCKED = ["sn"];
  const COL_LABEL = Object.fromEntries(
    COLUMN_GROUPS.flatMap((g) => g.items.map((it) => [it.id, it.label])));

  // Active interface, in priority order (matches device-detail telemetry).
  function networkModeOf(d) {
    const n = d.network || {};
    if (n.ethernet && n.ethernet.enabled) return "Ethernet";
    if (n.wifi && n.wifi.enabled) return "Wi-Fi";
    if (n.sim && n.sim.enabled) return "Cellular";
    return "Offline";
  }

  // Hardware posture bucket — mirrors the fleet "flagged" logic.
  function postureOf(d) {
    const h = d.hardware || {};
    if (h.root) return "rooted";
    if (h.devMode) return "devmode";
    if ((h.securityWarnings || []).length) return "warnings";
    return "healthy";
  }
  const POSTURE_LABEL = { healthy: "Healthy", rooted: "Rooted", devmode: "Dev mode", warnings: "Warnings" };

  // ─── Merchant / Store cell — supports multi-binding devices ──
  // A terminal can be bound to several merchants/stores (device.bindings[]).
  // The cell shows the primary binding + a “+N” badge; hovering reveals a
  // popover listing every merchant·store the device is bound to.
  function resolveBinding(b) {
    const m = window.findMerchantById ? window.findMerchantById(b.merchantId) : null;
    const s = m && m.stores ? m.stores.find((x) => x.id === b.storeId) : null;
    return { merchantName: m ? m.name : (b.merchantId || "—"), storeName: s ? s.name : null };
  }
  function deviceBindings(d) {
    if (Array.isArray(d.bindings) && d.bindings.length) return d.bindings;
    if (d.merchantId) return [{ merchantId: d.merchantId, storeId: d.storeId, primary: true }];
    return [];
  }
  // Some terminals are shared — physically operated by more than one merchant
  // (e.g. a counter device a landlord rotates between tenants). The fleet seed
  // models this via device.bindings[], but the synthesized merchant terminals
  // are single-bound. Deterministically promote a subset to shared terminals
  // using REAL neighbouring merchant/store pairs so the multi-binding cell is
  // exercised. Idempotent + stable per SN.
  function ensureSharedTerminals() {
    if (window.__DEVICE_SHARED_SEEDED__) return;
    const all = window.PROD_DEVICES || [];
    if (all.length < 4) return; // data not ready yet — try again next render
    window.__DEVICE_SHARED_SEEDED__ = true;
    if (all.some((d) => Array.isArray(d.bindings) && d.bindings.length > 1)) return;
    const pool = all.filter((d) => d.merchantId && d.storeId)
      .map((d) => ({ merchantId: d.merchantId, storeId: d.storeId }));
    if (pool.length < 3) return;
    all.forEach((d, i) => {
      if (!d.merchantId || !d.storeId) return;
      if (i % 4 !== 1) return; // ~1 in 4 becomes a shared terminal
      const primary = { merchantId: d.merchantId, storeId: d.storeId, primary: true };
      const extras = [];
      const want = (i % 3 === 1) ? 2 : 1;
      for (let k = 1; k <= want; k++) {
        const cand = pool[(i * 7 + k * 13) % pool.length];
        if (cand && cand.merchantId !== d.merchantId && !extras.some((e) => e.merchantId === cand.merchantId)) {
          extras.push({ merchantId: cand.merchantId, storeId: cand.storeId });
        }
      }
      if (extras.length) d.bindings = [primary, ...extras];
    });
  }
  function MerchantStoreCell({ device }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const binds = deviceBindings(device);
    // Close on outside click / Esc.
    useEffect(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      const k = (e) => { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("mousedown", h);
      document.addEventListener("keydown", k);
      return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
    }, [open]);
    if (!binds.length) return <span style={{ color: "var(--fg3)" }}>—</span>;
    const primary = binds.find((b) => b.primary) || binds[0];
    const p = resolveBinding(primary);
    const extra = binds.length - 1;
    const nMerchants = new Set(binds.map((b) => b.merchantId)).size;
    const nStores = new Set(binds.map((b) => b.storeId).filter(Boolean)).size;
    return (
      <div ref={ref} style={{ minWidth: 0, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: "var(--fg1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{p.merchantName}</span>
          {extra > 0 && (
            <button type="button" title="Show all merchants / stores"
              onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
              className="num" style={{ flex: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, color: open ? "#fff" : "var(--color-primary-700)", background: open ? "var(--color-primary-600)" : "var(--color-primary-50)", border: "1px solid color-mix(in oklab, var(--color-primary-500) 22%, transparent)", borderRadius: 999, padding: "0 6px", height: 16, lineHeight: "14px" }}>+{extra}</button>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{p.storeName || "—"}</div>
        {open && extra > 0 && (
          <div onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, minWidth: 240, maxWidth: 340,
              background: "var(--bg2)", border: "1px solid var(--border-2)", borderRadius: 8, boxShadow: "0 14px 36px -8px oklch(0% 0 0 / 0.18)", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-1)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg3)" }}>
              {nMerchants} merchant{nMerchants === 1 ? "" : "s"} · {nStores} store{nStores === 1 ? "" : "s"}
            </div>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              {binds.map((b, i) => {
                const r = resolveBinding(b);
                return (
                  <div key={i} style={{ padding: "8px 12px", borderBottom: i < binds.length - 1 ? "1px solid var(--border-1)" : "none" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg1)" }}>{r.merchantName}</div>
                    <div style={{ fontSize: 11, color: "var(--fg3)" }}>{r.storeName || "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Per-row model-fact accessors (derived helpers exposed by devices-fleet).
  const metaOf  = (d) => (window.deviceMetaFor ? window.deviceMetaFor(d) : {});
  const identOf = (d) => (window.deviceIdentityFor ? window.deviceIdentityFor(d) : {});
  const vinfoOf = (d) => (window.versionInfoFor ? window.versionInfoFor(d) : {});

  function renderCell(key, d) {
    switch (key) {
      case "sn":
        return (
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)", whiteSpace: "nowrap" }}>{d.sn}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)", whiteSpace: "nowrap" }}>{d.model || "—"}</div>
          </div>
        );
      case "owner": {
        const o = ownerOf(d);
        if (!o) return <span style={{ color: "var(--fg3)" }}>—</span>;
        return (
          <span style={{
            fontSize: 12.5, color: "var(--fg1)", fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: 200, display: "inline-block",
          }}>{o.name}</span>
        );
      }
      case "merchantStore":
        return <MerchantStoreCell device={d} />;
      case "osFirmware":
        return (
          <div>
            <div style={{ fontSize: 12.5 }}>{d.os || "—"}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{d.firmware || "—"}</div>
          </div>
        );
      case "lastSeen": {
        const abs = fmtLastSeen(d.lastSeenAt);
        if (abs === "Never") return <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>Never</span>;
        return (
          <span className="mono" title={relLastSeen(d.lastSeenAt)}
            style={{ fontSize: 12, color: "var(--fg2)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{abs}</span>
        );
      }
      case "online": {
        if (devStatus(d) === "pending") return <span style={{ fontSize: 11, color: "var(--fg3)" }}>—</span>;
        const o = deviceOnline(d) ? ONLINE_PILL.online : ONLINE_PILL.offline;
        return <Pill tone={o.tone} dot size="sm">{o.label}</Pill>;
      }
      case "status": {
        const st = DEVICE_STATE[devStatus(d)] || DEVICE_STATE.active;
        return <Pill tone={st.tone} dot size="sm">{st.label}</Pill>;
      }
      case "pn":
        return <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{metaOf(d).pn || "—"}</span>;
      case "configCode":
        return <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{metaOf(d).cfg || "—"}</span>;
      case "hwid":
        return <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{metaOf(d).hwid || "—"}</span>;
      case "pciVersion":
        return <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{identOf(d).pciVersion || "—"}</span>;
      case "runMode":
        return <span style={{ fontSize: 12.5 }}>{identOf(d).runMode === "UNATTENDED" ? "Unattended" : "Attended"}</span>;
      case "firmwareId":
        return <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{vinfoOf(d).firmwareId || "—"}</span>;
      case "financeApp":
        return <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{vinfoOf(d).financeApp || "—"}</span>;
      case "imei":
        return <span className="mono" style={{ fontSize: 11.5, color: d.imei ? "var(--fg2)" : "var(--fg3)" }}>{d.imei || "—"}</span>;
      case "manufacturer":
        return <span style={{ fontSize: 12.5, color: "var(--fg2)" }}>{metaOf(d).manufacturer || "—"}</span>;
      case "network": {
        if (devStatus(d) === "pending") return <span style={{ fontSize: 11, color: "var(--fg3)" }}>—</span>;
        const net = networkModeOf(d);
        return <span style={{ fontSize: 12.5, color: net === "Offline" ? "var(--fg3)" : "var(--fg2)" }}>{net}</span>;
      }
      case "lockStatus": {
        if (devStatus(d) === "pending") return <span style={{ fontSize: 11, color: "var(--fg3)" }}>—</span>;
        const locked = devStatus(d) === "locked";
        return <Pill tone={locked ? "danger" : "neutral"} dot size="sm">{locked ? "Locked" : "Unlocked"}</Pill>;
      }
      case "storage": {
        if (!d.storage) return <span style={{ color: "var(--fg3)" }}>—</span>;
        const pct = Math.round((d.storage.used / d.storage.total) * 100);
        return <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{pct}% · {d.storage.used}/{d.storage.total} GB</span>;
      }
      case "battery":
        return d.battery
          ? <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{d.battery.health}%</span>
          : <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>Line-powered</span>;
      case "createdAt":
        return <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{d.createdAt || "—"}</span>;
      case "activatedAt":
        return d.activatedAt
          ? <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{d.activatedAt}</span>
          : <span style={{ fontSize: 11.5, color: "var(--color-warning-700)" }}>Pending</span>;
      case "certCn": {
        const c = identOf(d).clientCert;
        return c ? <span className="mono" style={{ fontSize: 11, color: "var(--fg2)" }}>{c.cn}</span>
                 : <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>—</span>;
      }
      case "certExpires": {
        const c = identOf(d).clientCert;
        return c ? <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{c.expiredDate}</span>
                 : <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>—</span>;
      }
      default:
        return null;
    }
  }

  // Plain-text value for CSV export (mirrors renderCell).
  function cellText(key, d) {
    const m = window.findMerchantById ? window.findMerchantById(d.merchantId) : null;
    const s = m && m.stores ? m.stores.find((x) => x.id === d.storeId) : null;
    switch (key) {
      case "sn": return `${d.sn}${d.model ? " / " + d.model : ""}`;
      case "owner": { const o = ownerOf(d); return o ? o.name : ""; }
      case "merchantStore": {
        const binds = deviceBindings(d);
        if (!binds.length) return "";
        return binds.map((b) => { const r = resolveBinding(b); return `${r.merchantName}${r.storeName ? " · " + r.storeName : ""}`; }).join("; ");
      }
      case "osFirmware": return `${d.os || ""}${d.firmware ? " / " + d.firmware : ""}`;
      case "lastSeen": return fmtLastSeen(d.lastSeenAt);
      case "online": return devStatus(d) === "pending" ? "" : (deviceOnline(d) ? "Online" : "Offline");
      case "status": return (DEVICE_STATE[devStatus(d)] || DEVICE_STATE.active).label;
      case "pn": return metaOf(d).pn || "";
      case "configCode": return metaOf(d).cfg || "";
      case "hwid": return metaOf(d).hwid || "";
      case "pciVersion": return identOf(d).pciVersion || "";
      case "runMode": return identOf(d).runMode === "UNATTENDED" ? "Unattended" : "Attended";
      case "firmwareId": return vinfoOf(d).firmwareId || "";
      case "financeApp": return vinfoOf(d).financeApp || "";
      case "imei": return d.imei || "";
      case "manufacturer": return metaOf(d).manufacturer || "";
      case "network": return devStatus(d) === "pending" ? "" : networkModeOf(d);
      case "lockStatus": return devStatus(d) === "pending" ? "" : (devStatus(d) === "locked" ? "Locked" : "Unlocked");
      case "storage": return d.storage ? `${d.storage.used}/${d.storage.total} GB` : "";
      case "battery": return d.battery ? `${d.battery.health}%` : "Line-powered";
      case "createdAt": return d.createdAt || "";
      case "activatedAt": return d.activatedAt || "Pending";
      case "certCn": { const c = identOf(d).clientCert; return c ? c.cn : ""; }
      case "certExpires": { const c = identOf(d).clientCert; return c ? c.expiredDate : ""; }
      default: return "";
    }
  }

  // ─── CSV export ──────────────────────────────────────────
  function _csvCell(v) { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function _today() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function exportDevicesCsv(rows, columns, filename) {
    const cols = (columns && columns.length ? columns : COL_DEFAULTS);
    const header = cols.map((c) => COL_LABEL[c] || c);
    const lines = [header.map(_csvCell).join(",")];
    rows.forEach((d) => {
      lines.push(cols.map((c) => _csvCell(cellText(c, d))).join(","));
    });
    const csv = "\ufeff" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Search defaults ─────────────────────────────────────
  const SEARCH_DEFAULTS = { q: "", status: "All", model: "All", online: "All", os: "All", posture: "All", network: "All", tid: "All", ownerId: null, merchantId: null, storeId: null };

  // ─── Main screen ─────────────────────────────────────────
  function DevicesListScreen({ navigate }) {
    ensureSharedTerminals();
    const all = window.PROD_DEVICES || [];
    const toast = window.useToast ? window.useToast() : null;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const toolbarRef = useRef(null);
    const [advOpen, setAdvOpen] = useState(false);
    const [advMaxW, setAdvMaxW] = useState(600);
    const advRef = useRef(null);
    // Close the Advanced popover on outside click / Esc (matches CascadingPicker behavior).
    useEffect(() => {
      if (!advOpen) return;
      const h = (e) => { if (advRef.current && !advRef.current.contains(e.target)) setAdvOpen(false); };
      const k = (e) => { if (e.key === "Escape") setAdvOpen(false); };
      document.addEventListener("mousedown", h);
      document.addEventListener("keydown", k);
      return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
    }, [advOpen]);
    // Right edge stays flush with the Advanced button; clamp width so the left never crosses the toolbar.
    useEffect(() => {
      if (!advOpen) return;
      const measure = () => {
        const tb = toolbarRef.current, btn = advRef.current;
        if (!tb || !btn) return;
        const avail = btn.getBoundingClientRect().right - tb.getBoundingClientRect().left;
        setAdvMaxW(Math.max(300, Math.min(600, Math.floor(avail))));
      };
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }, [advOpen]);

    const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
      window.useSearchBar(SEARCH_DEFAULTS, () => setPage(1));

    const cols = window.useColumnPrefs({
      allIds: COL_ALL, defaultIds: COL_DEFAULTS, lockedIds: COL_LOCKED,
      storageKey: "carbon.devices.columns.v2",
    });

    // Cascade: owner change clears merchant + store; merchant change clears store
    function setOwnerDraft(oid) { setDraft((s) => ({ ...s, ownerId: oid, merchantId: null, storeId: null })); }
    function setMerchantDraft(mid) { setDraft((s) => ({ ...s, merchantId: mid, storeId: null })); }

    // TID isn't stored on the device; resolve it from the bound merchant
    // terminal (matched by serial number) so the TID filter can work.
    const tidBySn = useMemo(() => {
      const map = {};
      (window.MERCHANTS || []).forEach((m) => (m.stores || []).forEach((s) => (s.terminals || []).forEach((t) => {
        if (t.sn && t.tid) map[t.sn] = t.tid;
      })));
      return map;
    }, []);
    const deviceTidOf = (d) => tidBySn[d.sn] || null;

    // ─── Filter (single matcher, reused by applied + draft preview) ──
    const matchDevice = (d, f) => {
      const q = (f.q || "").trim().toLowerCase();
      if (q && !d.sn.toLowerCase().includes(q)) return false;
      if (f.status !== "All" && devStatus(d) !== f.status) return false;
      if (f.model !== "All" && d.model !== f.model) return false;
      if (f.online && f.online !== "All") {
        if (devStatus(d) === "pending") return false;
        const on = deviceOnline(d);
        if (f.online === "online" && !on) return false;
        if (f.online === "offline" && on) return false;
      }
      if (f.ownerId) {
        const m = window.findMerchantById ? window.findMerchantById(d.merchantId) : null;
        if (!m || m.isoId !== f.ownerId) return false;
      }
      if (f.merchantId && d.merchantId !== f.merchantId) return false;
      if (f.storeId && d.storeId !== f.storeId) return false;
      if (f.os && f.os !== "All" && (d.os || "") !== f.os) return false;
      if (f.network && f.network !== "All" && networkModeOf(d) !== f.network) return false;
      if (f.posture && f.posture !== "All" && postureOf(d) !== f.posture) return false;
      if (f.tid && f.tid !== "All" && deviceTidOf(d) !== f.tid) return false;
      return true;
    };
    const filtered = useMemo(() => all.filter((d) => matchDevice(d, applied)), [all, applied]);
    // Live preview count for the Advanced-sheet footer (over the DRAFT).
    const draftMatchCount = useMemo(() => all.reduce((n, d) => n + (matchDevice(d, draft) ? 1 : 0), 0), [all, draft]);

    // Advanced-sheet condition counts (status / model / connectivity live in the sheet now;
    // owner / merchant / store are resident on the quick bar).
    const advAppliedCount =
      (applied.status !== "All" ? 1 : 0) + (applied.model !== "All" ? 1 : 0) + (applied.online !== "All" ? 1 : 0)
      + (applied.os !== "All" ? 1 : 0) + (applied.posture !== "All" ? 1 : 0) + (applied.network !== "All" ? 1 : 0) + (applied.tid !== "All" ? 1 : 0);
    const advDraftCount =
      (draft.status !== "All" ? 1 : 0) + (draft.model !== "All" ? 1 : 0) + (draft.online !== "All" ? 1 : 0)
      + (draft.os !== "All" ? 1 : 0) + (draft.posture !== "All" ? 1 : 0) + (draft.network !== "All" ? 1 : 0) + (draft.tid !== "All" ? 1 : 0);
    const runSearchAndClose = () => { runSearch(); setAdvOpen(false); };
    const resetAdvanced = () => {
      clearOne("status", "All"); clearOne("model", "All"); clearOne("online", "All");
      clearOne("os", "All"); clearOne("posture", "All"); clearOne("network", "All"); clearOne("tid", "All");
    };

    // Sort: most-recently seen first
    const sortedRows = useMemo(
      () => [...filtered].sort((a, b) => lastSeenMinutes(a.lastSeenAt) - lastSeenMinutes(b.lastSeenAt)),
      [filtered]);

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, sortedRows.length);
    const pageRows = sortedRows.slice(pageStart, pageEnd);

    // ─── Picker option sets ─────────────────────────────────
    const allModels = useMemo(() => [...new Set(all.map((d) => d.model))].sort(), [all]);
    const allOs = useMemo(() => [...new Set(all.map((d) => d.os).filter(Boolean))].sort(), [all]);
    const allTids = useMemo(() => {
      const set = new Set();
      all.forEach((d) => { const t = tidBySn[d.sn]; if (t) set.add(t); });
      return [...set].sort();
    }, [all, tidBySn]);

    // Owner options — distinct ISO/ISV that own merchants in the fleet
    const ownerOptions = useMemo(() => {
      const seen = new Map();
      all.forEach((d) => {
        const o = ownerOf(d);
        if (o && !seen.has(o.id)) seen.set(o.id, o.name);
      });
      return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [all]);

    // Merchant picker — fuzzy search over MERCHANTS, scoped to the chosen owner
    const merchantSearchFn = useMemo(() => (term) => {
      const n = (term || "").trim().toLowerCase();
      let pool = window.MERCHANTS || [];
      if (draft.ownerId) pool = pool.filter((m) => m.isoId === draft.ownerId);
      const hits = n
        ? pool.filter((m) => m.name.toLowerCase().includes(n) || (m.id || "").toLowerCase().includes(n))
        : pool;
      return Promise.resolve(hits.slice(0, 50).map((m) => ({ id: m.id, name: m.name })));
    }, [draft.ownerId]);

    // Store picker — sync options scoped to the chosen merchant
    const storeOptions = useMemo(() => {
      const m = draft.merchantId && window.findMerchantById ? window.findMerchantById(draft.merchantId) : null;
      return (m && m.stores ? m.stores : []).map((s) => ({ id: s.id, name: s.name, sub: s.isHQ ? "HQ" : (s.address ? s.address.slice(0, 36) : null) }));
    }, [draft.merchantId]);

    const merchantName = (mid) => {
      const m = mid && window.findMerchantById ? window.findMerchantById(mid) : null;
      return m ? m.name : mid;
    };
    const storeName = (mid, sid) => {
      const m = mid && window.findMerchantById ? window.findMerchantById(mid) : null;
      const s = m && m.stores ? m.stores.find((x) => x.id === sid) : null;
      return s ? s.name : sid;
    };
    const ownerName = (oid) => {
      const c = (window.SEED_CUSTOMERS || []).find((x) => x.id === oid);
      return c ? c.name : oid;
    };

    return (
      <div className="page page--list">
        <window.TitleBar
          title="Devices"
          subtitle="Production fleet — every Carbon terminal you've activated, with its owner, operating location, OS / firmware, and connectivity."
        />

        {/* Condition area: search (scrolls with content per §7.2) */}
        <div ref={toolbarRef} className="list-toolbar-wrap devices-toolbar">
          {/* Quick bar — SN keyword + Status + Search + Advanced toggle (§4) */}
          <div className="sb__row" style={{ position: "relative" }} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}>
            <window.SearchInput
              value={draft.q}
              onChange={(v) => setDraft({ q: v })}
              onSearch={runSearch}
              placeholder="Search by serial number"
              width={240} />
            {/* Resident cascade: Owner → Merchant → Store (§4.4.4, R-01 — stages into draft) */}
            <CascadingPicker value={draft.ownerId} onChange={(v) => setOwnerDraft(v)} options={ownerOptions}
              placeholder="Any owner" icon="building" width={170} recentKey="carbon.devices.recent.owner" />
            <CascadingPicker value={draft.merchantId} onChange={(v) => setMerchantDraft(v)}
              searchFn={merchantSearchFn} valueLabel={draft.merchantId ? merchantName(draft.merchantId) : null}
              placeholder={draft.ownerId ? `Merchant under ${ownerName(draft.ownerId)}` : "Any merchant"}
              disabled={!draft.ownerId} disabledHint="Pick an owner first"
              icon="building" width={180} requireQuery confirmToFilter recentKey="carbon.devices.recent.merchant" />
            <CascadingPicker value={draft.storeId} onChange={(v) => setDraft({ storeId: v })} options={storeOptions}
              placeholder="Any store" disabled={!draft.merchantId} disabledHint="Pick a merchant first"
              icon="home" width={160} recentKey="carbon.devices.recent.store" />
            {/* Advanced toggle + anchored popover — §4.6: popover right edge flush with this button */}
            <span ref={advRef} style={{ position: "relative", display: "inline-flex" }}>
            <button type="button" onClick={() => setAdvOpen((o) => !o)} aria-expanded={advOpen}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, position: "relative",
                height: 36, padding: "0 12px", borderRadius: 7,
                border: "1px solid " + (advOpen ? "var(--color-primary-500)" : "var(--color-border-default)"),
                background: advOpen ? "var(--color-primary-50)" : "var(--bg2)",
                color: advOpen ? "var(--color-primary-700)" : "var(--fg1)",
                fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer",
                transition: "border-color .12s ease, background .12s ease",
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              Advanced
              {advAppliedCount > 0 &&
              <span className="num" style={{
                minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999,
                background: "var(--color-primary-600)", color: "#fff",
                fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1,
              }}>{advAppliedCount}</span>}
              <Ico name="chevD" size={11}
                style={{ color: advOpen ? "var(--color-primary-700)" : "var(--fg3)",
                  transform: advOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
            </button>
            {/* Advanced Sheet — anchored to the Advanced button's right edge; capped so it never crosses content (§4.6) */}
            {advOpen &&
            <div onKeyDown={(e) => { if (e.key === "Enter") runSearchAndClose(); }}
              style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, left: "auto", zIndex: 40,
                width: advMaxW }}>
            <div style={{
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-2)", overflow: "visible",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border-1)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--fg1)" }}>
                  <Ico name="filter" size={14} style={{ color: "var(--fg3)" }} />
                  Advanced filters
                </span>
                <button type="button" onClick={() => setAdvOpen(false)} title="Close"
                  style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer", color: "var(--fg3)", display: "grid", placeItems: "center", padding: 4, borderRadius: 6 }}>
                  <Ico name="x" size={14} />
                </button>
              </div>

              {/* APPLIES WITH — echoes the resident quick-bar conditions; advanced stacks onto these (§4.6) */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border-1)", background: "var(--bg1)" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg3)" }}>Applies with</span>
                {draft.q ? <AdvEchoChip label="SN" value={draft.q} /> : null}
                {draft.ownerId ? <AdvEchoChip label="Owner" value={ownerName(draft.ownerId)} /> : null}
                {draft.merchantId ? <AdvEchoChip label="Merchant" value={merchantName(draft.merchantId)} /> : null}
                {draft.storeId ? <AdvEchoChip label="Store" value={storeName(draft.merchantId, draft.storeId)} /> : null}
                {!draft.q && !draft.ownerId && !draft.merchantId && !draft.storeId ? <span style={{ fontSize: 12, color: "var(--fg3)" }}>no quick filters</span> : null}
              </div>

              <div style={{ padding: 16, display: "grid", gap: 18 }}>
                {/* TID */}
                <div>
                  <div style={advSubStyle}>TID</div>
                  <window.SearchSelect value={draft.tid} onChange={(v) => setDraft({ tid: v })} width="100%"
                    options={[{ value: "All", label: "All TIDs" }, ...allTids.map((t) => ({ value: t, label: t }))]} />
                </div>

                {/* Model, status & OS */}
                <div>
                  <div style={advSubStyle}>Model, status &amp; OS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 18px" }}>
                    <window.SearchSelect value={draft.model} onChange={(v) => setDraft({ model: v })} width="100%"
                      options={[{ value: "All", label: "All models" }, ...allModels.map((m) => ({ value: m, label: m }))]} />
                    <window.SearchSelect value={draft.status} onChange={(v) => setDraft({ status: v })} width="100%"
                      options={[{ value: "All", label: "All statuses" }, { value: "active", label: "Active" }, { value: "locked", label: "Locked" }, { value: "pending", label: "Pending" }]} />
                    <window.SearchSelect value={draft.os} onChange={(v) => setDraft({ os: v })} width="100%"
                      options={[{ value: "All", label: "All OS versions" }, ...allOs.map((o) => ({ value: o, label: o }))]} />
                  </div>
                </div>

                {/* Connectivity & posture */}
                <div>
                  <div style={advSubStyle}>Connectivity &amp; posture</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 18px" }}>
                    <window.SearchSelect value={draft.online} onChange={(v) => setDraft({ online: v })} width="100%"
                      options={[{ value: "All", label: "Any connectivity" }, { value: "online", label: "Online" }, { value: "offline", label: "Offline" }]} />
                    <window.SearchSelect value={draft.posture} onChange={(v) => setDraft({ posture: v })} width="100%"
                      options={[{ value: "All", label: "Any posture" }, { value: "healthy", label: "Healthy" }, { value: "rooted", label: "Rooted" }, { value: "devmode", label: "Dev mode" }, { value: "warnings", label: "Warnings" }]} />
                    <window.SearchSelect value={draft.network} onChange={(v) => setDraft({ network: v })} width="100%"
                      options={[{ value: "All", label: "Any network" }, { value: "Wi-Fi", label: "Wi-Fi" }, { value: "Ethernet", label: "Ethernet" }, { value: "Cellular", label: "Cellular" }, { value: "Offline", label: "Offline" }]} />
                  </div>
                </div>
              </div>

              {/* Footer — §4.6: right-aligned, Reset advanced (secondary) + Search (primary, last); no match count */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border-1)", background: "var(--bg1)" }}>
                <button type="button" onClick={resetAdvanced} disabled={advDraftCount === 0 && advAppliedCount === 0}
                  style={{
                    height: 36, padding: "0 14px", borderRadius: 7,
                    border: "1px solid var(--color-border-default)", background: "var(--bg2)",
                    color: "var(--fg2)", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                    cursor: (advDraftCount === 0 && advAppliedCount === 0) ? "default" : "pointer",
                    opacity: (advDraftCount === 0 && advAppliedCount === 0) ? 0.5 : 1,
                  }}>
                  Reset advanced
                </button>
                <button type="button" onClick={runSearchAndClose} className="tds-btn tds-btn--primary"
                  style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Ico name="search" size={13} />
                  Search
                </button>
              </div>
            </div>
            </div>}
            </span>
            {/* Search — §4.3: secondary style, 恒为条件行最末位 */}
            <button type="button" className="sb__primary" onClick={runSearch}>
              <Ico name="search" size={13} />
              Search
            </button>
          </div>

          <window.ActiveFilters
            onClearAll={clearAll}
            hasFilters={hasFilters}>
            {applied.q ? <window.FilterChip label={`SN: ${applied.q}`} onRemove={() => clearOne("q", "")} /> : null}
            {applied.status !== "All" ? <window.FilterChip label={`Status: ${(DEVICE_STATE[applied.status] || {}).label || applied.status}`} onRemove={() => clearOne("status", "All")} /> : null}
            {applied.online !== "All" ? <window.FilterChip label={`Connectivity: ${applied.online === "online" ? "Online" : "Offline"}`} onRemove={() => clearOne("online", "All")} /> : null}
            {applied.model !== "All" ? <window.FilterChip label={`Model: ${applied.model}`} onRemove={() => clearOne("model", "All")} /> : null}
            {applied.os !== "All" ? <window.FilterChip label={`OS: ${applied.os}`} onRemove={() => clearOne("os", "All")} /> : null}
            {applied.network !== "All" ? <window.FilterChip label={`Network: ${applied.network}`} onRemove={() => clearOne("network", "All")} /> : null}
            {applied.posture !== "All" ? <window.FilterChip label={`Posture: ${POSTURE_LABEL[applied.posture] || applied.posture}`} onRemove={() => clearOne("posture", "All")} /> : null}
            {applied.tid !== "All" ? <window.FilterChip label={`TID: ${applied.tid}`} onRemove={() => clearOne("tid", "All")} /> : null}
            {applied.ownerId ? <window.FilterChip label={`Owner: ${ownerName(applied.ownerId)}`} onRemove={() => { clearOne("ownerId", null); clearOne("merchantId", null); clearOne("storeId", null); }} /> : null}
            {applied.merchantId ? <window.FilterChip label={`Merchant: ${merchantName(applied.merchantId)}`} onRemove={() => { clearOne("merchantId", null); clearOne("storeId", null); }} /> : null}
            {applied.storeId ? <window.FilterChip label={`Store: ${storeName(applied.merchantId, applied.storeId)}`} onRemove={() => clearOne("storeId", null)} /> : null}
          </window.ActiveFilters>
        </div>

        <window.ListCard toolbarRef={toolbarRef} scrollX className="devices-list-card">
          <window.ListCardHead
            count={filtered.length}
            unit={`device${filtered.length === 1 ? "" : "s"}`}
            hasFilters={hasFilters}>
            <window.ColumnsMenu
              groups={COLUMN_GROUPS}
              isOn={cols.isOn}
              toggle={cols.toggle}
              reset={cols.reset}
              selectAll={cols.selectAll}
              count={cols.count} />
            <window.ListExportMenu
              pageRows={pageRows}
              filtered={filtered}
              unit="device"
              onExport={(scope, rows) => {
                const fname = `devices_${scope === "page" ? "view" : "results"}_${_today()}.csv`;
                exportDevicesCsv(rows, cols.visible, fname);
                if (toast) toast({ kind: "success", title: "Export downloaded", desc: `${rows.length.toLocaleString()} device${rows.length === 1 ? "" : "s"} · ${fname}` });
              }} />
          </window.ListCardHead>

          <table className="tds-table">
            <thead>
              <tr>
                {cols.visible.map((c) => (
                  <th key={c} style={{ textAlign: "left", whiteSpace: "nowrap" }}>{COL_LABEL[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={cols.visible.length} style={{ padding: "32px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "var(--fg2)" }}>No devices match the current filters.</div>
                    {hasFilters && (
                      <button onClick={clearAll}
                        style={{ marginTop: 6, padding: "4px 10px", border: "1px solid var(--border-1)", background: "var(--bg2)", borderRadius: 6, fontSize: 12, color: "var(--color-primary-700)", cursor: "pointer" }}>
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {pageRows.map((d) => (
                <tr key={d.sn}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate({ screen: "deviceDetail", deviceSn: d.sn })}>
                  {cols.visible.map((c) => (
                    <td key={c} style={{ verticalAlign: "middle" }}>{renderCell(c, d)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <window.Pagination
            total={filtered.length}
            totalUnfiltered={all.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={(s) => { setPageSize(s); setPage(1); }}
            pageSizeOptions={[10, 25, 50, 100]}
            unit="devices" divider />
        </window.ListCard>
      </div>
    );
  }

  // ─── Override the export ─────────────────────────────────
  window.DevicesListScreen = DevicesListScreen;
})();
