/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — Rule editor, Rules list, Alert detail drawer
//
//   RuleEditor      Long form: name, type picker, condition shape
//                   (varies per type), binding (4 modes), notification
//                   config (channel, recipients, throttle).
//   RulesList       Plain table of rules, with binding + notify summary
//                   and enable/disable toggles.
//   AlertDetail     Drawer that opens when a row is clicked in any
//                   inbox variant — shows snapshot, recent value
//                   trend (mock), and the lone "Convert to ticket".
// ─────────────────────────────────────────────────────────────

const { useState: useStateR, useMemo: useMemoR, useRef: useRefR } = React;

// ─── Small primitives reused across these screens ───────────
function Section({ title, hint, children, style }) {
  return (
    <section style={{
      background: "var(--bg2)", borderRadius: 10,
      border: "1px solid var(--border-1)",
      padding: "16px 18px 18px",
      boxShadow: "var(--shadow-1)",
      ...style,
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg1)",
                      letterSpacing: "0.005em" }}>{title}</div>
        {hint && <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg3)" }}>{hint}</div>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{
          fontSize: 11, color: "var(--fg2)", marginBottom: 6,
          fontWeight: 500, letterSpacing: "0.005em",
        }}>
          {label}{required && <span style={{ color: "var(--color-error-500)", marginLeft: 3 }}>*</span>}
        </div>
      )}
      {children}
      {hint && <div style={{ marginTop: 5, fontSize: 10.5, color: "var(--fg3)" }}>{hint}</div>}
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div style={{
      display: "inline-flex", padding: 2, gap: 2,
      background: "var(--bg3)", borderRadius: 7,
      border: "1px solid var(--border-1)",
    }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              padding: "5px 12px", fontSize: 11.5, fontWeight: active ? 500 : 400,
              color: active ? "var(--fg1)" : "var(--fg3)",
              background: active ? "var(--bg2)" : "transparent",
              boxShadow: active ? "var(--shadow-1)" : "none",
              borderRadius: 5, border: 0, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            {o.icon && <PW.Ico name={o.icon} size={11} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, onRemove, accent }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 4px 3px 9px", borderRadius: 5, fontSize: 11.5,
      background: accent ? `color-mix(in oklab, ${accent} 10%, transparent)` : "var(--bg3)",
      color: accent || "var(--fg2)",
      border: `1px solid ${accent ? `color-mix(in oklab, ${accent} 24%, transparent)` : "var(--border-1)"}`,
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{
          padding: 2, color: "currentColor", opacity: 0.6,
          background: "transparent", border: 0, cursor: "pointer", borderRadius: 3,
        }}>
          <PW.Ico name="x" size={10} stroke={2} />
        </button>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Condition editor — switches sub-form by rule type
// ═══════════════════════════════════════════════════════════
function ConditionEditor({ type, config, onChange }) {
  const t = PW.TYPES[type];
  if (!t) return null;

  // ── multi-select (Battery, SIM/APN) ───────────────────────
  if (t.kind === "multi") {
    const opts = config.opts || [];
    const toggle = (v) => {
      const next = opts.includes(v) ? opts.filter(x => x !== v) : [...opts, v];
      onChange({ ...config, opts: next });
    };
    // Battery options carry a colour-coded chip; SIM/APN are plain.
    // For battery, the raw option key ("Red"/"Yellow") still drives the
    // palette + persisted config — only the on-screen label is expanded
    // to clarify what triggers each level.
    const labelMap = type === "battery" ? {
      "Red":    "Red Alarm (damaged; overvoltage;)",
      "Yellow": "Yellow Alarm (unspecified failure; life expired;)",
    } : {};
    const palette = {
      "Red": {
        bg: "color-mix(in oklab, oklch(60% 0.22 25) 12%, transparent)",
        fg: "oklch(48% 0.20 25)",
        border: "color-mix(in oklab, oklch(60% 0.22 25) 35%, transparent)",
        dot: "oklch(60% 0.22 25)",
      },
      "Yellow": {
        bg: "color-mix(in oklab, oklch(85% 0.18 95) 22%, transparent)",
        fg: "oklch(48% 0.14 85)",
        border: "color-mix(in oklab, oklch(82% 0.18 92) 45%, transparent)",
        dot: "oklch(80% 0.20 92)",
      },
    };
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 8 }}>
          {type === "battery"
            ? "Fire when the battery health rating drops to any of these:"
            : "Fire when any of these events is detected:"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {t.options.map(o => {
            const on = opts.includes(o);
            const p = palette[o] || {};
            return (
              <label key={o} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 12px 7px 10px", borderRadius: 7,
                cursor: "pointer", userSelect: "none",
                background: on ? (p.bg || "color-mix(in oklab, var(--color-primary-500) 8%, transparent)") : "var(--bg2)",
                border: `1px solid ${on ? (p.border || "color-mix(in oklab, var(--color-primary-500) 30%, transparent)") : "var(--border-2)"}`,
                color: on ? (p.fg || "var(--color-primary-700)") : "var(--fg2)",
              }}>
                <input type="checkbox" checked={on} onChange={() => toggle(o)}
                  style={{ margin: 0, accentColor: p.dot || p.fg || "var(--color-primary-500)" }} />
                {(p.dot || p.fg) && (
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: p.dot || p.fg,
                    boxShadow: on ? `0 0 0 2px color-mix(in oklab, ${p.dot || p.fg} 25%, transparent)` : "none",
                  }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 500 }}>{labelMap[o] || o}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // ── threshold (Module / Storage / Traffic) ────────────────
  // All three are "above" semantics today — module wear, storage usage,
  // mobile-data quota usage all alarm when the measured percentage climbs
  // past the threshold. No "below" path, no direction toggle.
  if (t.kind === "threshold") {
    const value = config.value ?? t.defaultValue ?? 50;
    // Guard against legacy stored configs that still say { dir: "below" } —
    // we silently coerce to "above" on first edit.
    const dir = "above";
    const hint = type === "module"
      ? "Fire when wear life consumed on any tracked counter — card insert / swipe / wave, print length, touch screen, USB plug, memory erase — exceeds this percentage of its rated lifetime."
      : type === "storage"
        ? "Fire when storage usage on the device climbs above this percentage."
        : "Fire when mobile data plan usage climbs above this percentage of the monthly quota.";
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 10 }}>
          {hint}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "var(--bg1)", border: "1px solid var(--border-2)",
          borderRadius: 8, padding: "10px 14px",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 500, color: "var(--fg2)",
            letterSpacing: "0.04em", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            Above
          </span>
          <input type="range" min="0" max="100" step="1" value={value}
            onChange={(e) => onChange({ ...config, dir, value: +e.target.value })}
            style={{ flex: 1, accentColor: "var(--color-primary-500)" }} />
          <div className="mono" style={{
            fontSize: 14, fontWeight: 500, color: "var(--fg1)",
            width: 64, textAlign: "right",
            padding: "5px 8px", border: "1px solid var(--border-2)", borderRadius: 5,
            background: "var(--bg2)",
          }}>{value} %</div>
        </div>
      </div>
    );
  }

  // ── geofence (radius OR region whitelist — pick one) ──────
  // Two mutually-exclusive modes. We don't have geocoded store
  // coordinates yet, so the radius mode renders a stylised, clickable
  // map surface where the user drops a pin; the whitelist mode uses
  // a level selector (Country / State / City) with cascading pickers.
  if (t.kind === "geo") {
    const mode = config.mode || "radius";
    const radiusKm = config.radiusKm ?? 5;
    const center = config.center || { x: 0.42, y: 0.55 };
    const level = config.level || "state";
    const regions = config.regions || [];
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 10 }}>
          Fire when the device leaves the allowed zone. Choose one fencing method.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Seg value={mode} onChange={(v) => onChange({ ...config, mode: v })}
            options={[
              { value: "radius", label: "Radius on map", icon: "pin" },
              { value: "regions", label: "Region whitelist", icon: "globe" },
            ]} />
        </div>

        {mode === "radius" && (
          <GeoRadiusPicker center={center} radiusKm={radiusKm}
            onChange={(patch) => onChange({ ...config, ...patch })} />
        )}

        {mode === "regions" && (
          <GeoRegionPicker level={level} regions={regions}
            onChange={(patch) => onChange({ ...config, ...patch })} />
        )}
      </div>
    );
  }
  return null;
}

// ─── Geo · Radius mode ──────────────────────────────────────
// Stylised map surface — abstract land/water shapes with a graticule
// grid. Click anywhere to drop the center pin; the circle around it
// scales with the radius slider. Lat/lng under the map is a derived
// fake reading from the (x, y) so the user sees something concrete.
//
// Drag affordances:
//   · Hover near the circle stroke → cursor changes to ew-resize and
//     the ring brightens. Drag away from / toward the center to
//     grow / shrink the radius.
//   · Click anywhere else → drops the center pin at that point.
//   · Drag the center pin itself (within ~12 px) → moves the center.
const GEO_MAP_W = 540, GEO_MAP_H = 280;
// Pixels per kilometre on this stylised map. Tuned so 50 km ≈ a
// quarter of the map width — keeps the largest setting still
// visually contained.
const GEO_PX_PER_KM = 2.4;
const GEO_EDGE_TOL = 8;       // ± px around the ring counted as "on the edge"
const GEO_CENTER_GRAB = 12;   // px around the pin counted as "grab the center"

function GeoRadiusPicker({ center, radiusKm, onChange }) {
  const svgRef = React.useRef(null);
  const cx = center.x * GEO_MAP_W;
  const cy = center.y * GEO_MAP_H;
  const radiusPx = Math.max(8, radiusKm * GEO_PX_PER_KM);

  // What the pointer is currently capable of:
  //   "idle"   — generic crosshair, click drops center
  //   "edge"   — near the ring stroke, click+drag resizes radius
  //   "center" — near the pin, click+drag moves center
  const [hover, setHover] = useStateR("idle");
  // While dragging we lock the interaction mode to whatever the
  // user grabbed; if we re-derived it from pointer distance on every
  // frame, the mode could flip mid-drag and feel jittery.
  const [drag, setDrag] = useStateR(null);

  const toSvg = (evt) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width)  * GEO_MAP_W,
      y: ((evt.clientY - rect.top)  / rect.height) * GEO_MAP_H,
    };
  };

  const distanceFromCenter = (p) => Math.hypot(p.x - cx, p.y - cy);
  const cursorFor = (mode) =>
    mode === "edge"   ? "ew-resize" :
    mode === "center" ? "grabbing"  :
                         "crosshair";

  const onPointerMove = (evt) => {
    if (drag) {
      const p = toSvg(evt);
      if (drag === "edge") {
        // Distance to the center, converted back to km. Clamp to the
        // same 1..50 range as the slider so the two stay coherent.
        const km = Math.round(distanceFromCenter(p) / GEO_PX_PER_KM);
        onChange({ radiusKm: Math.max(1, Math.min(50, km)) });
      } else if (drag === "center") {
        onChange({ center: {
          x: Math.max(0.03, Math.min(0.97, p.x / GEO_MAP_W)),
          y: Math.max(0.05, Math.min(0.95, p.y / GEO_MAP_H)),
        }});
      }
      return;
    }
    // Pure-hover: derive the affordance from pointer distance.
    const p = toSvg(evt);
    const d = distanceFromCenter(p);
    if (d <= GEO_CENTER_GRAB) setHover("center");
    else if (Math.abs(d - radiusPx) <= GEO_EDGE_TOL) setHover("edge");
    else setHover("idle");
  };

  const onPointerDown = (evt) => {
    const p = toSvg(evt);
    const d = distanceFromCenter(p);
    if (d <= GEO_CENTER_GRAB) {
      setDrag("center");
    } else if (Math.abs(d - radiusPx) <= GEO_EDGE_TOL) {
      setDrag("edge");
    } else {
      // Plain click → drop the center where the user clicked, no drag.
      onChange({ center: {
        x: Math.max(0.03, Math.min(0.97, p.x / GEO_MAP_W)),
        y: Math.max(0.05, Math.min(0.95, p.y / GEO_MAP_H)),
      }});
    }
    evt.currentTarget.setPointerCapture(evt.pointerId);
  };

  const onPointerUp = (evt) => {
    setDrag(null);
    try { evt.currentTarget.releasePointerCapture(evt.pointerId); } catch (e) {}
  };

  // Faked geo readout — purely for show.
  const lat = (50 - center.y * 22).toFixed(4);
  const lng = (-130 + center.x * 56).toFixed(4);

  const onEdge = (drag === "edge") || (!drag && hover === "edge");
  const onCenter = (drag === "center") || (!drag && hover === "center");

  return (
    <div>
      <div style={{ position: "relative",
                     background: "var(--bg1)",
                     border: "1px solid var(--border-2)",
                     borderRadius: 8, overflow: "hidden",
                     userSelect: "none" }}>
        <svg ref={svgRef}
          viewBox={`0 0 ${GEO_MAP_W} ${GEO_MAP_H}`}
          width="100%" preserveAspectRatio="none"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { if (!drag) setHover("idle"); }}
          style={{ display: "block",
                    cursor: cursorFor(drag || hover),
                    touchAction: "none",
                    background: "linear-gradient(180deg, color-mix(in oklab, var(--color-info-500) 6%, var(--bg1)), color-mix(in oklab, var(--color-info-500) 3%, var(--bg1)))" }}>
          <defs>
            <pattern id="geoGrid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M36 0H0V36" fill="none"
                stroke="color-mix(in oklab, var(--fg3) 14%, transparent)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="land" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--color-success-500) 18%, var(--bg2))" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--color-success-500) 6%, var(--bg2))" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#geoGrid)" />
          {/* Abstract landmass shapes — purely decorative */}
          <path d="M-10 90 C 80 70, 160 110, 220 95 S 360 50, 460 100 L 560 130 L 560 0 L -10 0 Z"
                fill="url(#land)" opacity="0.85" />
          <path d="M-10 240 C 100 220, 180 270, 280 250 S 460 220, 560 250 L 560 290 L -10 290 Z"
                fill="url(#land)" opacity="0.7" />
          <path d="M180 180 q 30 -25 60 0 t 50 -10 t 50 10 q 30 25 -10 35 q -50 10 -90 -5 q -40 -15 -60 -30 Z"
                fill="url(#land)" opacity="0.65" />
          {/* Fill — always the same soft tint */}
          <circle cx={cx} cy={cy} r={radiusPx}
            fill="color-mix(in oklab, var(--color-primary-500) 14%, transparent)"
            pointerEvents="none" />
          {/* Thick invisible ring used as the drag target — gives the
              cursor a forgiving ~16 px band to land on regardless of
              the actual stroke width below. */}
          <circle cx={cx} cy={cy} r={radiusPx}
            fill="none"
            stroke="transparent"
            strokeWidth={GEO_EDGE_TOL * 2} />
          {/* Visible ring — brightens when the pointer is on or
              dragging the edge so the user knows the resize handle
              is engaged. */}
          <circle cx={cx} cy={cy} r={radiusPx}
            fill="none"
            stroke="var(--color-primary-500)"
            strokeWidth={onEdge ? 2.5 : 1.5}
            strokeDasharray={onEdge ? "0" : "4 3"}
            style={{ transition: "stroke-width .12s ease" }}
            pointerEvents="none" />
          {/* Resize handles — 4 small ticks on the cardinal points;
              also pointerEvents="none" so the wider invisible ring
              above is what actually catches the cursor. */}
          {onEdge && [0, 90, 180, 270].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const hx = cx + Math.cos(rad) * radiusPx;
            const hy = cy + Math.sin(rad) * radiusPx;
            return (
              <circle key={deg} cx={hx} cy={hy} r="4"
                fill="var(--color-primary-500)"
                stroke="var(--bg1)" strokeWidth="1.5"
                pointerEvents="none" />
            );
          })}
          {/* Center indicator: pin + crosshairs */}
          <circle cx={cx} cy={cy}
            r={onCenter ? 7 : 6}
            fill="var(--color-primary-500)"
            stroke="var(--bg1)" strokeWidth="2"
            style={{ transition: "r .12s ease" }}
            pointerEvents="none" />
          <line x1={cx-10} y1={cy} x2={cx+10} y2={cy}
            stroke="var(--bg1)" strokeWidth="1.5"
            pointerEvents="none" />
          <line x1={cx} y1={cy-10} x2={cx} y2={cy+10}
            stroke="var(--bg1)" strokeWidth="1.5"
            pointerEvents="none" />
        </svg>
        <div style={{
          position: "absolute", left: 10, bottom: 10,
          padding: "4px 9px", borderRadius: 5,
          background: "color-mix(in oklab, var(--bg1) 85%, transparent)",
          backdropFilter: "blur(4px)",
          border: "1px solid var(--border-2)",
          fontSize: 10, color: "var(--fg2)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.03em",
          pointerEvents: "none",
        }}>
          {lat}° N · {lng}° W
        </div>
        <div style={{
          position: "absolute", right: 10, top: 10,
          padding: "4px 9px", borderRadius: 5,
          background: "color-mix(in oklab, var(--bg1) 85%, transparent)",
          backdropFilter: "blur(4px)",
          border: "1px solid var(--border-2)",
          fontSize: 10,
          color: onEdge ? "var(--color-primary-700)"
                : onCenter ? "var(--color-primary-700)"
                : "var(--fg3)",
          pointerEvents: "none",
          transition: "color .15s ease",
        }}>
          {onEdge ? "Drag to resize"
            : onCenter ? "Drag to move"
            : "Click to set center · drag the ring to resize"}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12,
                     background: "var(--bg1)", border: "1px solid var(--border-2)",
                     borderRadius: 8, padding: "10px 14px" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg2)",
                        letterSpacing: "0.04em", textTransform: "uppercase",
                        whiteSpace: "nowrap" }}>
          Radius
        </span>
        <input type="range" min="1" max="50" step="1" value={radiusKm}
          onChange={(e) => onChange({ radiusKm: +e.target.value })}
          style={{ flex: 1, accentColor: "var(--color-primary-500)" }} />
        {/* Typed input — types into here and the circle on the map
            grows / shrinks live. Clamped to the slider range (1..50)
            on commit so the two stay in sync. */}
        <div style={{ display: "flex", alignItems: "center",
                       border: "1px solid var(--border-2)", borderRadius: 5,
                       background: "var(--bg2)", overflow: "hidden" }}>
          <input type="number" min="1" max="50" step="1" value={radiusKm}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              const n = Math.max(1, Math.min(50, Math.round(+raw) || 1));
              onChange({ radiusKm: n });
            }}
            className="mono"
            style={{
              width: 48, padding: "5px 6px",
              fontSize: 14, fontWeight: 500, color: "var(--fg1)",
              textAlign: "right", background: "transparent",
              border: 0, outline: 0,
              MozAppearance: "textfield",
            }} />
          <span className="mono" style={{
            fontSize: 11, color: "var(--fg3)",
            padding: "0 8px 0 2px",
          }}>km</span>
        </div>
      </div>
    </div>
  );
}

// ─── Geo · Region whitelist mode ────────────────────────────
// Three granularity levels: Country / State / City. Each level picks
// from a known reference list; selections cascade (state requires
// country, city requires state). Stored shape:
//   regions: [{ level: "state", path: ["US", "CA"], label: "California, USA" }, …]
const GEO_REF = {
  countries: [
    { id: "US", label: "United States" },
    { id: "CA", label: "Canada" },
    { id: "MX", label: "Mexico" },
  ],
  states: {
    US: [
      { id: "CA", label: "California" },  { id: "NY", label: "New York" },
      { id: "TX", label: "Texas" },       { id: "WA", label: "Washington" },
      { id: "OR", label: "Oregon" },      { id: "FL", label: "Florida" },
      { id: "IL", label: "Illinois" },    { id: "MA", label: "Massachusetts" },
      { id: "AZ", label: "Arizona" },     { id: "CO", label: "Colorado" },
    ],
    CA: [
      { id: "BC", label: "British Columbia" }, { id: "AB", label: "Alberta" },
      { id: "ON", label: "Ontario" },          { id: "QC", label: "Quebec" },
    ],
    MX: [
      { id: "BCN", label: "Baja California" }, { id: "CMX", label: "Ciudad de México" },
    ],
  },
  cities: {
    "US-CA": ["San Francisco", "Los Angeles", "San Diego", "San Jose", "Sacramento"],
    "US-NY": ["New York City", "Buffalo", "Rochester", "Albany"],
    "US-TX": ["Austin", "Dallas", "Houston", "San Antonio"],
    "US-WA": ["Seattle", "Spokane", "Tacoma", "Bellevue"],
    "US-OR": ["Portland", "Eugene", "Salem"],
    "US-FL": ["Miami", "Tampa", "Orlando", "Jacksonville"],
    "US-IL": ["Chicago", "Springfield"],
    "US-MA": ["Boston", "Cambridge", "Worcester"],
    "US-AZ": ["Phoenix", "Tucson"],
    "US-CO": ["Denver", "Boulder", "Colorado Springs"],
    "CA-BC": ["Vancouver", "Victoria", "Burnaby"],
    "CA-AB": ["Calgary", "Edmonton"],
    "CA-ON": ["Toronto", "Ottawa", "Mississauga"],
    "CA-QC": ["Montréal", "Québec City"],
    "MX-BCN": ["Tijuana", "Mexicali", "Ensenada"],
    "MX-CMX": ["Mexico City"],
  },
};

function regionKey(r) { return `${r.level}:${(r.path || []).join("-")}`; }

// Approximate positions on a 540×280 canvas (same as the radius
// map). Numbers are hand-tuned for a recognisable North-America
// layout — nothing here is geodesically correct. Each state carries
// a centre point; cities fan out around their state centre so
// multiple cities per state don't overlap.
const GEO_COUNTRY_BOX = {
  CA: { x: 0.08, y: 0.05, w: 0.78, h: 0.22 },
  US: { x: 0.12, y: 0.30, w: 0.58, h: 0.30 },
  MX: { x: 0.13, y: 0.63, w: 0.30, h: 0.22 },
};
const GEO_STATE_POS = {
  US: {
    WA: [0.18, 0.33], OR: [0.18, 0.40], CA: [0.17, 0.47],
    AZ: [0.23, 0.52], CO: [0.30, 0.44], TX: [0.36, 0.55],
    IL: [0.45, 0.42], FL: [0.56, 0.58], NY: [0.57, 0.36],
    MA: [0.64, 0.34],
  },
  CA: {
    BC: [0.16, 0.13], AB: [0.27, 0.13],
    ON: [0.50, 0.18], QC: [0.63, 0.16],
  },
  MX: {
    BCN: [0.18, 0.66], CMX: [0.30, 0.79],
  },
};
function cityPosition(country, state, cityName) {
  const base = GEO_STATE_POS[country]?.[state];
  if (!base) return null;
  const list = GEO_REF.cities[`${country}-${state}`] || [];
  const i = Math.max(0, list.indexOf(cityName));
  const angle = (i / Math.max(1, list.length)) * Math.PI * 2;
  const r = 0.024;
  return [base[0] + Math.cos(angle) * r, base[1] + Math.sin(angle) * r];
}

function GeoRegionPicker({ level, regions, onChange }) {
  const [country, setCountry] = useStateR("US");
  const [state, setState]     = useStateR("CA");
  const stateList = GEO_REF.states[country] || [];
  const cityList  = GEO_REF.cities[`${country}-${state}`] || [];

  const addRegion = (r) => {
    if (regions.some(x => regionKey(x) === regionKey(r))) return;
    onChange({ regions: [...regions, r] });
  };
  const removeRegion = (key) => {
    onChange({ regions: regions.filter(r => regionKey(r) !== key) });
  };
  // Map click handler — toggles a region in the whitelist. Same shape
  // as `addRegion` but flips off if already present.
  const toggleRegion = (r) => {
    const k = regionKey(r);
    regions.some(x => regionKey(x) === k) ? removeRegion(k) : addRegion(r);
  };

  // When the user changes granularity, clear cascading selectors so
  // they re-pick. We keep already-added regions of any level intact.
  const setLevel = (next) => {
    onChange({ level: next });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 10.5, color: "var(--fg3)",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        fontWeight: 500 }}>
          Granularity
        </span>
        <Seg value={level} onChange={setLevel}
          options={[
            { value: "country", label: "Country" },
            { value: "state",   label: "State" },
            { value: "city",    label: "City" },
          ]} />
      </div>

      {/* Stylised map. Click targets switch with the current level.
          At state/city level, clicking a country or state acts as
          a focus switch (so the user can drill into another region
          without going through the cascading dropdowns). */}
      <GeoRegionMap level={level}
        focusCountry={country} focusState={state}
        regions={regions}
        onToggle={toggleRegion}
        onZoomCountry={(c) => { setCountry(c);
                                 setState(GEO_REF.states[c]?.[0]?.id || ""); }}
        onZoomState={(c, s) => { setCountry(c); setState(s); }} />

      <div style={{
        background: "var(--bg1)", border: "1px solid var(--border-2)",
        borderRadius: 8, padding: 10, marginBottom: 10,
      }}>
        <div style={{ fontSize: 10.5, color: "var(--fg3)",
                       textTransform: "uppercase", letterSpacing: "0.06em",
                       marginBottom: 6 }}>
          Allowed regions ({regions.length})
        </div>
        {regions.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--fg3)", padding: "10px 4px" }}>
            None yet. Pick from the controls below to start the whitelist.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {regions.map(r => (
              <Pill key={regionKey(r)} accent="oklch(54% 0.18 60)"
                onRemove={() => removeRegion(regionKey(r))}>
                <span style={{ fontSize: 10, opacity: 0.7, marginRight: 4,
                                textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {r.level}
                </span>
                {r.label}
              </Pill>
            ))}
          </div>
        )}
      </div>

      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border-2)",
        borderRadius: 8, padding: 12,
      }}>
        <div style={{ fontSize: 10.5, color: "var(--fg3)",
                       textTransform: "uppercase", letterSpacing: "0.06em",
                       marginBottom: 8 }}>
          Add {level}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {/* Country selector — present for all levels */}
          <select value={country}
            onChange={(e) => { setCountry(e.target.value);
                                setState(GEO_REF.states[e.target.value]?.[0]?.id || ""); }}
            style={geoSelectStyle}>
            {GEO_REF.countries.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {level !== "country" && (
            <select value={state}
              onChange={(e) => setState(e.target.value)}
              style={geoSelectStyle}>
              {stateList.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          )}
          {level === "country" && (
            <button onClick={() => {
                const c = GEO_REF.countries.find(x => x.id === country);
                if (!c) return;
                addRegion({ level: "country", path: [country], label: c.label });
              }} className="tds-btn tds-btn--sm tds-btn--primary">
              <PW.Ico name="plus" size={11} stroke={2} />
              Add country
            </button>
          )}
          {level === "state" && (
            <button onClick={() => {
                const c = GEO_REF.countries.find(x => x.id === country);
                const s = stateList.find(x => x.id === state);
                if (!s) return;
                addRegion({ level: "state", path: [country, state],
                            label: `${s.label}, ${c?.label || country}` });
              }} className="tds-btn tds-btn--sm tds-btn--primary">
              <PW.Ico name="plus" size={11} stroke={2} />
              Add state
            </button>
          )}
          {level === "city" && (
            <CityAdder country={country} state={state} cityList={cityList}
              onAdd={(cityName) => {
                const c = GEO_REF.countries.find(x => x.id === country);
                const s = stateList.find(x => x.id === state);
                addRegion({ level: "city", path: [country, state, cityName],
                            label: `${cityName}, ${s?.label || state}` });
              }} />
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--fg3)" }}>
          {level === "country" && <>Devices leaving any allowed country trigger the alert.</>}
          {level === "state"   && <>Devices leaving the allowed states (within their countries) trigger the alert.</>}
          {level === "city"    && <>Devices leaving the allowed cities trigger the alert. Pick from the dropdown or type a custom city name.</>}
        </div>
      </div>
    </div>
  );
}

const geoSelectStyle = {
  appearance: "none",
  fontSize: 12, padding: "6px 28px 6px 10px",
  background: "var(--bg1) url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2398a' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\") no-repeat right 8px center / 12px",
  border: "1px solid var(--border-2)",
  borderRadius: 6, color: "var(--fg1)",
  minWidth: 140, cursor: "pointer",
};

// ─── Geo region map ─────────────────────────────────────────
// Stylised, abstract North-America map (same canvas as the radius
// picker). What's clickable depends on the current granularity:
//   · Country → three big country shapes
//   · State   → state markers inside the currently-focused country;
//               clicking another country switches the focus
//   · City    → city dots inside the currently-focused state;
//               clicking another state switches the focus
function GeoRegionMap({ level, focusCountry, focusState, regions,
                        onToggle, onZoomCountry, onZoomState }) {
  const W = GEO_MAP_W, H = GEO_MAP_H;
  const px = (nx) => nx * W;
  const py = (ny) => ny * H;
  const has = (path) => regions.some(r =>
    r.path.length === path.length && r.path.every((p, i) => p === path[i]));

  const countryShape = (id, { x, y, w, h }) => {
    const selected = has([id]);
    const isFocus  = focusCountry === id && level !== "country";
    return (
      <g key={id}>
        <rect x={px(x)} y={py(y)} width={px(w)} height={py(h)} rx="14"
          fill={selected
            ? "color-mix(in oklab, var(--color-primary-500) 28%, transparent)"
            : isFocus
              ? "color-mix(in oklab, var(--color-primary-500) 12%, transparent)"
              : "color-mix(in oklab, var(--color-success-500) 10%, var(--bg2))"}
          stroke={selected
            ? "var(--color-primary-500)"
            : isFocus
              ? "color-mix(in oklab, var(--color-primary-500) 50%, transparent)"
              : "color-mix(in oklab, var(--fg3) 30%, transparent)"}
          strokeWidth={selected ? 2 : isFocus ? 1.5 : 1}
          style={{ cursor: "pointer",
                    transition: "fill .15s ease, stroke .15s ease" }}
          onClick={() => {
            if (level === "country") {
              const c = GEO_REF.countries.find(x => x.id === id);
              onToggle({ level: "country", path: [id], label: c?.label || id });
            } else {
              onZoomCountry(id);
            }
          }} />
        <text x={px(x + w/2)} y={py(y + h/2) + 4}
          textAnchor="middle"
          style={{ fontSize: 11, fontWeight: 600, pointerEvents: "none",
                    fill: selected ? "var(--color-primary-700)"
                          : isFocus ? "var(--color-primary-700)"
                          : "var(--fg2)",
                    fontFamily: "var(--font-family-sans)",
                    textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {GEO_REF.countries.find(x => x.id === id)?.label || id}
        </text>
      </g>
    );
  };

  const stateChip = (country, stateId) => {
    const pos = GEO_STATE_POS[country]?.[stateId];
    if (!pos) return null;
    const selected = has([country, stateId]);
    const isFocus  = level === "city" && country === focusCountry && stateId === focusState;
    const sLabel = GEO_REF.states[country]?.find(x => x.id === stateId)?.label || stateId;
    return (
      <g key={`${country}-${stateId}`}
        style={{ cursor: "pointer" }}
        onClick={() => {
          if (level === "state") {
            const c = GEO_REF.countries.find(x => x.id === country);
            onToggle({ level: "state", path: [country, stateId],
                        label: `${sLabel}, ${c?.label || country}` });
          } else {
            onZoomState(country, stateId);
          }
        }}>
        <rect x={px(pos[0]) - 14} y={py(pos[1]) - 8} width={28} height={16} rx="8"
          fill={selected
            ? "var(--color-primary-500)"
            : isFocus
              ? "color-mix(in oklab, var(--color-primary-500) 28%, var(--bg1))"
              : "var(--bg1)"}
          stroke={selected
            ? "var(--color-primary-500)"
            : isFocus
              ? "var(--color-primary-500)"
              : "color-mix(in oklab, var(--fg3) 40%, transparent)"}
          strokeWidth={selected || isFocus ? 1.5 : 1}
          style={{ transition: "fill .15s ease, stroke .15s ease" }} />
        <text x={px(pos[0])} y={py(pos[1]) + 3.5} textAnchor="middle"
          style={{ fontSize: 9.5, fontWeight: 700, pointerEvents: "none",
                    fill: selected ? "#fff" : "var(--fg1)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em" }}>
          {stateId}
        </text>
      </g>
    );
  };

  const cityDot = (country, stateId, cityName) => {
    const pos = cityPosition(country, stateId, cityName);
    if (!pos) return null;
    const selected = has([country, stateId, cityName]);
    return (
      <g key={`${country}-${stateId}-${cityName}`}
        style={{ cursor: "pointer" }}
        onClick={() => {
          const sLabel = GEO_REF.states[country]?.find(x => x.id === stateId)?.label || stateId;
          onToggle({ level: "city", path: [country, stateId, cityName],
                      label: `${cityName}, ${sLabel}` });
        }}>
        <circle cx={px(pos[0])} cy={py(pos[1])} r={selected ? 5 : 3.5}
          fill={selected ? "var(--color-primary-500)" : "var(--bg1)"}
          stroke="var(--color-primary-500)" strokeWidth="1.5"
          style={{ transition: "r .12s ease" }} />
        <text x={px(pos[0]) + 7} y={py(pos[1]) + 3}
          style={{ fontSize: 9, fontWeight: 500, pointerEvents: "none",
                    fill: selected ? "var(--color-primary-700)" : "var(--fg2)",
                    fontFamily: "var(--font-family-sans)" }}>
          {cityName}
        </text>
      </g>
    );
  };

  const focusCountryLabel = GEO_REF.countries.find(c => c.id === focusCountry)?.label || focusCountry;
  const focusStateLabel = GEO_REF.states[focusCountry]?.find(s => s.id === focusState)?.label || focusState;
  const hint =
    level === "country" ? "Click a country to add or remove it from the whitelist."
    : level === "state" ? `Click a state to toggle. Click another country to switch focus (currently: ${focusCountryLabel}).`
    : `Click a city to toggle. Click another state to switch focus (currently: ${focusStateLabel}).`;

  return (
    <div style={{ position: "relative",
                   background: "var(--bg1)",
                   border: "1px solid var(--border-2)",
                   borderRadius: 8, overflow: "hidden",
                   marginBottom: 10, userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none"
        style={{ display: "block",
                  background: "linear-gradient(180deg, color-mix(in oklab, var(--color-info-500) 6%, var(--bg1)), color-mix(in oklab, var(--color-info-500) 3%, var(--bg1)))" }}>
        <defs>
          <pattern id="geoGridR" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M36 0H0V36" fill="none"
              stroke="color-mix(in oklab, var(--fg3) 12%, transparent)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geoGridR)" />

        {/* Country outlines — always drawn. At country level they're
            also the click target; at lower levels they only act as
            a "zoom in" affordance via onZoomCountry. */}
        {Object.entries(GEO_COUNTRY_BOX).map(([id, box]) =>
          countryShape(id, box)
        )}

        {/* State markers — visible at state and city levels for the
            focused country (so the user can switch state on the map). */}
        {(level === "state" || level === "city") &&
          (GEO_REF.states[focusCountry] || []).map(s =>
            stateChip(focusCountry, s.id))}

        {/* City dots — shown at city level for the focused state. */}
        {level === "city" && (GEO_REF.cities[`${focusCountry}-${focusState}`] || [])
          .map(c => cityDot(focusCountry, focusState, c))}
      </svg>
      <div style={{
        position: "absolute", right: 10, top: 10,
        padding: "4px 9px", borderRadius: 5,
        background: "color-mix(in oklab, var(--bg1) 88%, transparent)",
        backdropFilter: "blur(4px)",
        border: "1px solid var(--border-2)",
        fontSize: 10, color: "var(--fg3)",
        pointerEvents: "none", maxWidth: "62%",
      }}>
        {hint}
      </div>
    </div>
  );
}

function CityAdder({ country, state, cityList, onAdd }) {
  const [pick, setPick] = useStateR(cityList[0] || "");
  const [custom, setCustom] = useStateR("");
  // Keep the picker fresh when state changes.
  React.useEffect(() => { setPick(cityList[0] || ""); setCustom(""); }, [country, state]);
  const cityName = custom.trim() || pick;
  return (
    <>
      <select value={pick} onChange={(e) => setPick(e.target.value)}
        style={{ ...geoSelectStyle, minWidth: 170 }}>
        {cityList.length === 0 ? (
          <option value="">No presets — use custom →</option>
        ) : cityList.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input value={custom} onChange={(e) => setCustom(e.target.value)}
        placeholder="Or type a city…"
        style={{
          fontSize: 12, padding: "6px 10px",
          background: "var(--bg1)",
          border: "1px solid var(--border-2)", borderRadius: 6,
          color: "var(--fg1)", minWidth: 150, outline: 0,
        }} />
      <button onClick={() => cityName && onAdd(cityName)}
        disabled={!cityName}
        className="tds-btn tds-btn--sm tds-btn--primary"
        style={!cityName ? { opacity: 0.55, cursor: "not-allowed" } : undefined}>
        <PW.Ico name="plus" size={11} stroke={2} />
        Add city
      </button>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Binding editor — 4 modes (merchant / store / model / sn-list)
// ═══════════════════════════════════════════════════════════
// Each mode follows the same double-region pattern:
//   ▣ Currently bound (above) — what's already attached, with ✕ to remove
//   ▣ Add … (below)            — what's still selectable, with + or ☐
// Removing or adding immediately updates draft.binding.ids; the form's
// footer "Save & enable" commits everything together. For SN mode the
// upper region is a table (raw SN strings are unreadable without
// store/model context); the lower region is a paste-and-import box.
function BindingEditor({ binding, onChange, ruleId }) {
  const kind = binding.kind || "merchant";
  const ids = binding.ids || [];
  const [showSwitchHint, setShowSwitchHint] = useStateR(false);
  const empty = ids.length === 0;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {[
          { v: "merchant", l: "By merchant", i: "store" },
          { v: "store",    l: "By store",    i: "building" },
          { v: "model",    l: "By model",    i: "device" },
          { v: "sn",       l: "By SN",       i: "upload" },
        ].map(o => {
          const active = kind === o.v;
          return (
            <button key={o.v}
              onClick={() => {
                if (kind === o.v) return;
                if (ids.length > 0) setShowSwitchHint(true);
                onChange({ kind: o.v, ids: [] });
              }}
              style={{
                padding: "7px 12px", borderRadius: 7, cursor: "pointer",
                fontSize: 11.5, fontWeight: active ? 500 : 400,
                color: active ? "var(--color-primary-700)" : "var(--fg2)",
                background: active ? "color-mix(in oklab, var(--color-primary-500) 8%, transparent)" : "var(--bg2)",
                border: `1px solid ${active ? "color-mix(in oklab, var(--color-primary-500) 38%, transparent)" : "var(--border-2)"}`,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <PW.Ico name={o.i} size={12} />
              {o.l}
            </button>
          );
        })}
      </div>
      {showSwitchHint && (
        <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 10,
                       fontStyle: "italic" }}>
          Switching method clears the current selection.
        </div>
      )}

      {empty && (
        <div style={{
          padding: "18px 20px", marginBottom: 14,
          background: "var(--bg1)", border: "1px dashed var(--border-2)",
          borderRadius: 8, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)", marginBottom: 4 }}>
            No terminals bound yet.
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Pick from the list below to start binding terminals to this rule.
          </div>
        </div>
      )}

      {kind === "merchant" && <BindMerchant ids={ids} onChange={(next) => onChange({ kind, ids: next })} />}
      {kind === "store"    && <BindStore    ids={ids} onChange={(next) => onChange({ kind, ids: next })} />}
      {kind === "model"    && <BindModel    ids={ids} onChange={(next) => onChange({ kind, ids: next })} />}
      {kind === "sn"       && <BindSn       ids={ids} onChange={(next) => onChange({ kind, ids: next })} ruleId={ruleId} />}
    </div>
  );
}

// ─── Shared primitives for the double-region pattern ─────────
function RegionHeader({ children, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 6, gap: 10, minHeight: 24, fontSize: 11,
      color: "var(--fg2)", fontWeight: 500,
    }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
      {right}
    </div>
  );
}

function BoundList({ children }) {
  return (
    <div style={{
      background: "var(--bg1)", border: "1px solid var(--border-2)",
      borderRadius: 8, padding: 6, marginBottom: 14,
    }}>{children}</div>
  );
}

function BoundRow({ icon, label, meta, firing, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 6,
      background: "color-mix(in oklab, var(--color-primary-500) 5%, transparent)",
      marginBottom: 2,
    }}>
      {firing != null && (firing ? (
        <span title="Currently firing — unbinding will stop alerts for this terminal"
          style={{ width: 7, height: 7, borderRadius: "50%",
                    background: "var(--color-warning-500)",
                    boxShadow: "0 0 0 2.5px color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
                    flexShrink: 0 }} />
      ) : <span style={{ width: 7, flexShrink: 0 }} />)}
      <PW.Ico name={icon} size={13} style={{ color: "var(--fg3)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: "var(--fg1)",
                     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </div>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)", whiteSpace: "nowrap" }}>{meta}</span>
      <button onClick={onRemove} type="button"
        title="Remove from this rule"
        style={{
          padding: 4, color: "var(--fg3)", borderRadius: 5,
          background: "transparent", border: 0, cursor: "pointer", lineHeight: 0,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "color-mix(in oklab, var(--color-error-500) 12%, transparent)";
          e.currentTarget.style.color = "var(--color-error-700)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--fg3)";
        }}>
        <PW.Ico name="x" size={12} stroke={2} />
      </button>
    </div>
  );
}

function AddRow({ icon, label, meta, onAdd }) {
  return (
    <button onClick={onAdd} type="button"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 6, width: "100%",
        background: "transparent", border: 0, cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 5%, transparent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <PW.Ico name="plus" size={11} style={{ color: "var(--fg3)", flexShrink: 0 }} />
      <PW.Ico name={icon} size={13} style={{ color: "var(--fg3)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--fg1)",
                     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </div>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{meta}</span>
    </button>
  );
}

function isSnFiring(sn, ruleId) {
  if (!ruleId) return false;
  return PW.ALERTS.some(a =>
    a.deviceSn === sn && a.ruleId === ruleId && !a.selfHealed && !a.ticketId
  );
}

// ─── By merchant ────────────────────────────────────────────
function BindMerchant({ ids, onChange }) {
  const all = PW.MERCHANTS;
  const [search, setSearch] = useStateR("");
  const bound = all.filter(m => ids.includes(m.id));
  const available = all.filter(m => !ids.includes(m.id));
  const filteredAvailable = !search ? available : available.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()));
  const totalDevices = bound.reduce(
    (sum, m) => sum + m.stores.reduce((s, st) => s + (st.count || 0), 0), 0);

  return (
    <div>
      {bound.length > 0 && (
        <>
          <RegionHeader>
            Currently bound
            <span style={{ color: "var(--fg3)", fontWeight: 400 }}>
              {" · "}{bound.length} merchant{bound.length === 1 ? "" : "s"}
            </span>
          </RegionHeader>
          <BoundList>
            {bound.map(m => (
              <BoundRow key={m.id} icon="store" label={m.name}
                onRemove={() => onChange(ids.filter(x => x !== m.id))} />
            ))}
          </BoundList>
        </>
      )}
      <RegionHeader>
        Add merchant{available.length === 1 ? "" : "s"}
      </RegionHeader>
      {available.length > 4 && (
        <label className="tds-input tds-input--sm" style={{ marginBottom: 6, width: "100%" }}>
          <span className="tds-input__addon tds-input__addon--prefix">
            <PW.Ico name="search" size={12} />
          </span>
          <input className="tds-input__el" placeholder="Search merchants…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      )}
      <div style={{
        background: "var(--bg1)", border: "1px solid var(--border-2)",
        borderRadius: 8, padding: 6, minHeight: 48,
      }}>
        {filteredAvailable.length === 0 ? (
          <div style={{ padding: "14px 10px", fontSize: 11.5, color: "var(--fg3)", textAlign: "center" }}>
            {available.length === 0 ? "All merchants already bound." : "No matches."}
          </div>
        ) : filteredAvailable.map(m => (
          <AddRow key={m.id} icon="store" label={m.name}
            onAdd={() => onChange([...ids, m.id])} />
        ))}
      </div>
    </div>
  );
}

// ─── By store ───────────────────────────────────────────────
// Upper: bound stores grouped by merchant (collapsible).
// Lower: cascading merchant → store tree of stores NOT yet bound.
function BindStore({ ids, onChange }) {
  const [search, setSearch] = useStateR("");
  const [expLower, setExpLower] = useStateR(() => new Set(
    PW.MERCHANTS.filter(m => m.stores.some(s => !ids.includes(s.id))).map(m => m.id)
  ));

  const matches = (s) => !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase());

  // Flat list of bound stores, with merchant context carried on each row.
  // Earlier this view collapsed by merchant — readable in theory, but it
  // hid each store behind an extra click. Pattern now mirrors BindMerchant:
  // one row per bound item, no grouping headers.
  const boundStores = PW.MERCHANTS.flatMap(m =>
    m.stores.filter(s => ids.includes(s.id))
            .map(s => ({ ...s, merchantName: m.name, merchantId: m.id }))
  );

  const availableGroups = PW.MERCHANTS.map(m => ({
    merchant: m,
    stores: m.stores.filter(s => !ids.includes(s.id)),
  })).filter(g => g.stores.length > 0 &&
    (!search ||
      g.merchant.name.toLowerCase().includes(search.toLowerCase()) ||
      g.stores.some(matches)));

  return (
    <div>
      {boundStores.length > 0 && (
        <>
          <RegionHeader>
            Currently bound
            <span style={{ color: "var(--fg3)", fontWeight: 400 }}>
              {" · "}{ids.length} store{ids.length === 1 ? "" : "s"}
            </span>
          </RegionHeader>
          <BoundList>
            {boundStores.map(s => (
              <BoundRow key={s.id} icon="building" label={s.name}
                meta={`${s.merchantName} · ${s.city}`}
                onRemove={() => onChange(ids.filter(x => x !== s.id))} />
            ))}
          </BoundList>
        </>
      )}
      <RegionHeader>Add stores</RegionHeader>
      <label className="tds-input tds-input--sm" style={{ marginBottom: 6, width: "100%" }}>
        <span className="tds-input__addon tds-input__addon--prefix">
          <PW.Ico name="search" size={12} />
        </span>
        <input className="tds-input__el" placeholder="Search store name or city…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div style={{
        background: "var(--bg1)", border: "1px solid var(--border-2)",
        borderRadius: 8, maxHeight: 320, overflowY: "auto",
      }}>
        {availableGroups.length === 0 ? (
          <div style={{ padding: "16px 10px", fontSize: 11.5, color: "var(--fg3)", textAlign: "center" }}>
            {ids.length > 0 ? "All stores already bound." : "No stores match."}
          </div>
        ) : availableGroups.map((g, idx) => {
          const open = expLower.has(g.merchant.id);
          const merchStoreIds = g.stores.map(s => s.id);
          const visibleStores = g.stores.filter(matches);
          return (
            <div key={g.merchant.id} style={{
              borderTop: idx === 0 ? 0 : "1px solid var(--border-1)",
            }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => {
                    const next = new Set(expLower);
                    next.has(g.merchant.id) ? next.delete(g.merchant.id) : next.add(g.merchant.id);
                    setExpLower(next);
                  }} type="button"
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", textAlign: "left",
                    background: "transparent", border: 0, cursor: "pointer",
                  }}>
                  <PW.Ico name={open ? "chevd" : "chevr"} size={11} style={{ color: "var(--fg3)" }} />
                  <PW.Ico name="store" size={13} style={{ color: "var(--fg3)" }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--fg1)" }}>
                    {g.merchant.name}
                  </span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>
                    {g.stores.length} store{g.stores.length === 1 ? "" : "s"}
                  </span>
                </button>
                <button onClick={(e) => {
                    e.stopPropagation();
                    onChange([...new Set([...ids, ...merchStoreIds])]);
                  }} type="button"
                  style={{
                    marginRight: 10,
                    fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
                    background: "transparent",
                    border: "1px solid color-mix(in oklab, var(--color-primary-500) 30%, transparent)",
                    color: "var(--color-primary-700)", cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 8%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  Add all
                </button>
              </div>
              {open && (
                <div style={{ padding: "2px 0 8px 36px",
                              background: "color-mix(in oklab, var(--bg1) 70%, var(--bg2))" }}>
                  {visibleStores.map(s => (
                    <button key={s.id} onClick={() => onChange([...ids, s.id])} type="button"
                      style={{
                        width: "100%", display: "grid",
                        gridTemplateColumns: "12px 14px minmax(0, 1fr) auto",
                        gap: 8, alignItems: "center",
                        padding: "5px 12px 5px 0", borderRadius: 5,
                        background: "transparent", border: 0, cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 5%, transparent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <PW.Ico name="plus" size={10} style={{ color: "var(--fg3)" }} />
                      <PW.Ico name="building" size={11} style={{ color: "var(--fg3)" }} />
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 11.5, color: "var(--fg1)",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--fg3)" }}>{s.city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── By model ───────────────────────────────────────────────
function BindModel({ ids, onChange }) {
  const all = PW.MODELS;
  const bound = all.filter(m => ids.includes(m.id));
  const available = all.filter(m => !ids.includes(m.id));
  const totalDevices = bound.reduce((s, m) => s + (m.fleet || 0), 0);

  return (
    <div>
      {bound.length > 0 && (
        <>
          <RegionHeader>
            Currently bound
            <span style={{ color: "var(--fg3)", fontWeight: 400 }}>
              {" · "}{bound.length} model{bound.length === 1 ? "" : "s"}
            </span>
          </RegionHeader>
          <BoundList>
            {bound.map(m => (
              <BoundRow key={m.id} icon="device" label={m.label}
                onRemove={() => onChange(ids.filter(x => x !== m.id))} />
            ))}
          </BoundList>
        </>
      )}
      {available.length > 0 && (
        <>
          <RegionHeader>
            Add model{available.length === 1 ? "" : "s"}
          </RegionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
            {available.map(m => (
              <button key={m.id} onClick={() => onChange([...ids, m.id])} type="button"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 7, cursor: "pointer",
                  background: "var(--bg2)",
                  border: "1px solid var(--border-2)",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 6%, transparent)";
                  e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-primary-500) 30%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg2)";
                  e.currentTarget.style.borderColor = "var(--border-2)";
                }}>
                <PW.Ico name="plus" size={11} style={{ color: "var(--fg3)" }} />
                <PW.Ico name="device" size={13} style={{ color: "var(--fg3)" }} />
                <div style={{ flex: 1, fontSize: 11.5, fontWeight: 500 }}>{m.label}</div>
              </button>
            ))}
          </div>
        </>
      )}
      {available.length === 0 && bound.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--fg3)", textAlign: "center", padding: 10 }}>
          All models already bound.
        </div>
      )}
    </div>
  );
}

// ─── By SN ──────────────────────────────────────────────────
// Upper: table of bound SNs with Model / Store / Merchant / firing dot / ✕.
// Lower: paste box + Add to list + Upload .csv / .txt.
function BindSn({ ids, onChange, ruleId }) {
  const [text, setText] = useStateR("");
  const [snSearch, setSnSearch] = useStateR("");
  const [page, setPage] = useStateR(1);
  const [pageSize, setPageSize] = useStateR(10);
  // Each id should be a real SN. Legacy seed data may carry placeholder
  // summary strings like "23 SNs imported" — guard so an edit doesn't blow up.
  const isRealList = (ids || []).every(s => /^[A-Z0-9-]+$/i.test(s));
  const bound = isRealList ? ids.map(sn => ({
    ...PW.deviceFromSn(sn),
    firing: isSnFiring(sn, ruleId),
  })) : [];
  const matchesRow = (d) => {
    if (!snSearch) return true;
    const q = snSearch.toLowerCase();
    return (d.sn || "").toLowerCase().includes(q)
        || (d.model || "").toLowerCase().includes(q)
        || (d.storeName || "").toLowerCase().includes(q)
        || (d.merchantName || "").toLowerCase().includes(q);
  };
  const filteredBound = bound.filter(matchesRow);
  // Reset to page 1 when the filter narrows the list (avoid landing on
  // an empty page after typing a query that excludes the current page).
  React.useEffect(() => { setPage(1); }, [snSearch, pageSize, ids.length]);
  const totalBound  = filteredBound.length;
  const pageCount   = Math.max(1, Math.ceil(totalBound / pageSize));
  const safePage    = Math.min(Math.max(1, page), pageCount);
  const pageRows    = filteredBound.slice((safePage - 1) * pageSize, safePage * pageSize);

  const parsed = text.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const dedupedNew = parsed.filter(sn => !ids.includes(sn));
  const doImport = () => {
    if (dedupedNew.length === 0) return;
    const next = isRealList ? [...ids, ...dedupedNew] : dedupedNew;
    onChange(next);
    setText("");
    window.showToast?.(
      `Added ${dedupedNew.length} SN${dedupedNew.length === 1 ? "" : "s"}${parsed.length !== dedupedNew.length ? ` (${parsed.length - dedupedNew.length} duplicate skipped)` : ""}`,
      "success"
    );
  };

  return (
    <div>
      {isRealList && bound.length > 0 && (
        <>
          <RegionHeader right={
            <label className="tds-input tds-input--sm" style={{ width: 180 }}>
              <span className="tds-input__addon tds-input__addon--prefix">
                <PW.Ico name="search" size={11} />
              </span>
              <input className="tds-input__el" placeholder="Search SN / store…"
                value={snSearch} onChange={(e) => setSnSearch(e.target.value)} />
            </label>
          }>
            Currently bound
            <span style={{ color: "var(--fg3)", fontWeight: 400 }}>
              {" · "}{bound.length} SN{bound.length === 1 ? "" : "s"}
            </span>
          </RegionHeader>
          <div style={{
            background: "var(--bg1)", border: "1px solid var(--border-2)",
            borderRadius: 8, overflow: "hidden", marginBottom: 14,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "18px minmax(0, 1.2fr) 70px minmax(0, 1.4fr) 28px",
              gap: 10, padding: "8px 12px",
              background: "var(--bg3)",
              borderBottom: "1px solid var(--border-1)",
              fontSize: 10, fontWeight: 500, color: "var(--fg3)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              <span />
              <span>SN</span>
              <span>Model</span>
              <span>Store · Merchant</span>
              <span />
            </div>
            <div>
              {filteredBound.length === 0 ? (
                <div style={{ padding: "16px 10px", fontSize: 11.5, color: "var(--fg3)", textAlign: "center" }}>
                  No SNs match your search.
                </div>
              ) : pageRows.map((d, idx) => (
                <div key={d.sn} style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0, 1.2fr) 70px minmax(0, 1.4fr) 28px",
                  gap: 10, padding: "7px 12px", alignItems: "center",
                  borderTop: idx === 0 ? 0 : "1px solid var(--border-1)",
                  background: d.firing
                    ? "color-mix(in oklab, var(--color-warning-500) 4%, transparent)"
                    : "transparent",
                }}>
                  <span style={{ display: "flex", justifyContent: "center" }}>
                    {d.firing ? (
                      <span title="Currently firing — unbinding will stop alerts for this terminal"
                        style={{ width: 7, height: 7, borderRadius: "50%",
                                  background: "var(--color-warning-500)",
                                  boxShadow: "0 0 0 2.5px color-mix(in oklab, var(--color-warning-500) 28%, transparent)" }} />
                    ) : (
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                                      background: "var(--border-2)" }} />
                    )}
                  </span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--fg1)",
                                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.sn}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: d.model ? "var(--fg2)" : "var(--fg3)" }}>
                    {d.model || "—"}
                  </span>
                  <span style={{ fontSize: 11.5,
                                  color: d.storeName ? "var(--fg2)" : "var(--fg3)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.storeName
                      ? <>{d.storeName} · <span style={{ color: "var(--fg3)" }}>{d.merchantName}</span></>
                      : <span title="Never seen — will bind on first contact">⚠ Unknown SN</span>}
                  </span>
                  <button onClick={() => onChange(ids.filter(x => x !== d.sn))}
                    type="button" title="Remove from this rule"
                    style={{
                      padding: 3, color: "var(--fg3)", borderRadius: 4,
                      background: "transparent", border: 0, cursor: "pointer", lineHeight: 0,
                      justifySelf: "end",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "color-mix(in oklab, var(--color-error-500) 12%, transparent)";
                      e.currentTarget.style.color = "var(--color-error-700)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--fg3)";
                    }}>
                    <PW.Ico name="x" size={12} stroke={2} />
                  </button>
                </div>
              ))}
            </div>
            {totalBound > pageSize && (
              <div style={{
                padding: "8px 12px",
                borderTop: "1px solid var(--border-1)",
                background: "var(--bg2)",
              }}>
                <window.Pagination
                  page={safePage} pageSize={pageSize} total={totalBound}
                  onChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizes={[10, 20, 50]} />
              </div>
            )}
          </div>
        </>
      )}

      {!isRealList && ids.length > 0 && (
        <div style={{
          padding: "12px 14px", marginBottom: 14,
          background: "color-mix(in oklab, var(--color-warning-500) 7%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
          borderRadius: 8, fontSize: 11.5, color: "var(--color-warning-700)",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <PW.Ico name="alert" size={13} stroke={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Legacy import: <b className="mono">{ids.join(", ")}</b> is a summary placeholder, not a real SN list.
            Saving this rule with any change below will replace it with the new list.
          </span>
        </div>
      )}

      <RegionHeader>Add SNs</RegionHeader>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"N950-0014-9281\nN950-0014-3322\nN950-0014-5510\n…"}
        rows={5} style={{
        width: "100%", boxSizing: "border-box",
        padding: "9px 11px", fontFamily: "var(--font-mono)", fontSize: 11.5,
        background: "var(--bg1)", border: "1px solid var(--border-2)",
        borderRadius: 6, color: "var(--fg1)", resize: "vertical", outline: 0,
      }} />
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={doImport}
          disabled={dedupedNew.length === 0}
          className="tds-btn tds-btn--sm tds-btn--secondary"
          style={dedupedNew.length === 0
            ? { opacity: 0.55, cursor: "not-allowed" }
            : undefined}>
          <PW.Ico name="plus" size={11} stroke={2} />
          Add to list {parsed.length > 0 ? `(${dedupedNew.length}${parsed.length !== dedupedNew.length ? ` of ${parsed.length}` : ""})` : ""}
        </button>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 5, cursor: "pointer",
          background: "var(--bg2)", border: "1px solid var(--border-2)",
          color: "var(--fg2)", fontSize: 11.5,
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 6%, transparent)";
            e.currentTarget.style.color = "var(--color-primary-700)";
            e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-primary-500) 30%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg2)";
            e.currentTarget.style.color = "var(--fg2)";
            e.currentTarget.style.borderColor = "var(--border-2)";
          }}>
          <PW.Ico name="upload" size={11} />
          Upload .csv / .txt
          <input type="file" accept=".csv,.txt,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const content = String(ev.target?.result || "");
                const tokens = content
                  .split(/[\s,;]+/)
                  .map(s => s.trim())
                  .filter(s => s && /^[A-Z0-9-]+$/i.test(s) && s.length >= 4)
                  .filter(s => !/^(SN|SERIAL|MODEL|DEVICE|HEADER)$/i.test(s));
                setText(prev => prev
                  ? prev.replace(/\s+$/, "") + "\n" + tokens.join("\n")
                  : tokens.join("\n"));
                window.showToast?.(`Loaded ${tokens.length} SN${tokens.length === 1 ? "" : "s"} from ${file.name}`, "success");
              };
              reader.onerror = () => window.showToast?.("Failed to read file", "danger");
              reader.readAsText(file);
              e.target.value = "";
            }} />
        </label>
        {parsed.length > 0 && parsed.length !== dedupedNew.length && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>
            {parsed.length - dedupedNew.length} already bound · ignored
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Notification editor — channels, recipients, throttle
// ═══════════════════════════════════════════════════════════
function NotificationEditor({ notify, onChange }) {
  const set = (patch) => onChange({ ...notify, ...patch });
  const stationUsers = notify.stationUsers || ["u-maya"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Station letter — required channel, with sub-account multi-select */}
      <div style={{
        background: "var(--bg1)", border: "1px solid var(--border-2)",
        borderRadius: 8, padding: "12px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <input type="checkbox" checked readOnly
            style={{ accentColor: "var(--color-primary-500)", cursor: "not-allowed" }} />
          <PW.Ico name="bell" size={13} />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Station letter</span>
          <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
                          background: "var(--bg3)", color: "var(--fg3)" }}>Required</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 8 }}>
          Sub-accounts who'll see this alert in their Pre-warnings inbox.
        </div>
        <UserMultiSelect value={stationUsers}
          onChange={(next) => set({ stationUsers: next })} />
      </div>

      {/* Email — optional external delivery */}
      <div style={{
        background: notify.email ? "color-mix(in oklab, var(--color-primary-500) 5%, transparent)" : "var(--bg1)",
        border: `1px solid ${notify.email ? "color-mix(in oklab, var(--color-primary-500) 30%, transparent)" : "var(--border-2)"}`,
        borderRadius: 8, padding: "12px 14px",
        transition: "background .12s ease, border-color .12s ease",
      }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          marginBottom: notify.email ? 8 : 0,
        }}>
          <input type="checkbox" checked={!!notify.email}
            onChange={(e) => set({ email: e.target.checked })}
            style={{ accentColor: "var(--color-primary-500)" }} />
          <PW.Ico name="mail" size={13} />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Email</span>
          {!notify.email && (
            <span style={{ fontSize: 11, color: "var(--fg3)", marginLeft: 4 }}>
              Send the alert to external mailboxes as well
            </span>
          )}
        </label>
        {notify.email && (
          <>
            <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 6 }}>
              Email recipients — type, then press Enter to add.
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6,
              padding: "8px 10px", minHeight: 38,
              background: "var(--bg2)", border: "1px solid var(--border-2)", borderRadius: 6,
            }}>
              {(notify.recipients || []).map(r => (
                <Pill key={r} accent="var(--color-primary-700)"
                  onRemove={() => set({ recipients: notify.recipients.filter(x => x !== r) })}>
                  {r}
                </Pill>
              ))}
              <input placeholder="add@example.com  ↵"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    set({ recipients: [...(notify.recipients || []), e.target.value.trim()] });
                    e.target.value = "";
                  }
                }}
                style={{
                  flex: "1 1 200px", minWidth: 120, border: 0, outline: 0,
                  background: "transparent", fontSize: 11.5, color: "var(--fg1)",
                }} />
            </div>
          </>
        )}
      </div>

      <Field label="Anti-flood throttle"
        hint="Same device + same rule fires only once per 24 h. Multi-device firings are aggregated per the mode below.">
        <Seg value={notify.throttle || "digest-daily"}
          onChange={(v) => set({ throttle: v })}
          options={[
            { value: "digest-daily",  label: "Daily digest" },
            { value: "digest-weekly", label: "Weekly digest" },
            { value: "instant",       label: "Instant" },
          ]} />
      </Field>
    </div>
  );
}

// ─── UserMultiSelect — chip picker drawing from PW.ORG_USERS ──
// Used for the station-letter recipient list on a rule.
function UserMultiSelect({ value, onChange }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      padding: "8px 10px", minHeight: 38,
      background: "var(--bg2)", border: "1px solid var(--border-2)", borderRadius: 6,
    }}>
      {(value || []).map(uid => {
        const u = PW.findUser(uid);
        if (!u) return null;
        const initials = u.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
        return (
          <Pill key={uid} accent="var(--color-primary-700)"
            onRemove={() => onChange(value.filter(x => x !== uid))}>
            <Avatar initials={initials} />
            <span>{u.name}{u.self ? " (you)" : ""}</span>
          </Pill>
        );
      })}
      <AddUserMenu picked={value || []}
        onAdd={(uid) => onChange([...(value || []), uid])} />
    </div>
  );
}

function Avatar({ initials }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: "50%",
      background: "color-mix(in oklab, var(--color-primary-500) 18%, transparent)",
      color: "var(--color-primary-700)",
      fontSize: 9, fontWeight: 600, lineHeight: 1,
      display: "inline-grid", placeItems: "center",
    }}>{initials}</span>
  );
}

function AddUserMenu({ picked, onAdd }) {
  const [open, setOpen] = useStateR(false);
  const remaining = PW.ORG_USERS.filter(u => !picked.includes(u.id));
  if (remaining.length === 0) return null;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} type="button" style={{
        fontSize: 11, color: "var(--fg2)", padding: "3px 9px",
        background: "transparent", border: "1px dashed var(--border-2)", borderRadius: 5,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        <PW.Ico name="plus" size={10} stroke={2} />
        Add user
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 19 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "var(--bg2)", border: "1px solid var(--border-2)",
            borderRadius: 7, boxShadow: "var(--shadow-3)", padding: 4,
            width: 260, zIndex: 20,
          }}>
            {remaining.map(u => {
              const initials = u.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <button key={u.id} type="button"
                  onClick={() => { onAdd(u.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 9px", borderRadius: 5, cursor: "pointer",
                    background: "transparent", border: 0, width: "100%", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <Avatar initials={initials} />
                  <span style={{ flex: 1, fontSize: 12, color: "var(--fg1)" }}>{u.name}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg3)" }}>{u.role}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Rule editor — full form (uses the three editors above)
// ═══════════════════════════════════════════════════════════

PW.RuleEditor = function RuleEditor({ initial, onCancel, onSave }) {
  const [draft, setDraft] = useStateR(() => initial || {
    name: "",
    type: "battery",
    config: { opts: ["Red"] },
    binding: { kind: "merchant", ids: [] },
    notify: { station: true, email: true, recipients: [], throttle: "digest-daily" },
    enabled: true,
  });
  const t = PW.TYPES[draft.type];

  const changeType = (type) => {
    const tt = PW.TYPES[type];
    let cfg = {};
    if (tt.kind === "multi") cfg = { opts: [tt.options[0]] };
    else if (tt.kind === "threshold") cfg = { value: tt.defaultValue, dir: tt.dir };
    else if (tt.kind === "geo") cfg = { mode: "radius", radiusKm: 5, cities: [] };
    setDraft({ ...draft, type, config: cfg });
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "var(--bg1)" }}>
      {/* Header */}
      <div style={{
        padding: "14px 22px 12px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onCancel} style={{
          padding: 4, color: "var(--fg3)", borderRadius: 5,
          background: "transparent", border: 0, cursor: "pointer",
        }}><PW.Ico name="chevl" size={14} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--fg3)" }}>
            Pre-warnings · {initial ? "Edit" : "New"}
          </div>
          <h2 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {initial ? `Edit · ${initial.name}` : "Create pre-warning rule"}
          </h2>
        </div>
        <button onClick={onCancel} className="tds-btn tds-btn--sm tds-btn--secondary">Cancel</button>
        <button onClick={() => onSave && onSave(draft)} className="tds-btn tds-btn--sm tds-btn--primary">
          <PW.Ico name="check" size={11} stroke={2} />
          Save & enable
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
        <div style={{ maxWidth: 880, margin: "0 auto",
                      display: "flex", flexDirection: "column", gap: 14 }}>
          <Section title="① Basics">
            <Field label="Rule name" required>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Battery health — Riverside Coffee fleet"
                className="tds-input__el"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 11px", fontSize: 12.5,
                  background: "var(--bg1)", border: "1px solid var(--border-2)",
                  borderRadius: 6, color: "var(--fg1)", outline: 0,
                }} />
            </Field>
            <Field label="Type">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                {PW.TYPE_ORDER.map(typeId => {
                  const tt = PW.TYPES[typeId];
                  const on = draft.type === typeId;
                  return (
                    <button key={typeId} onClick={() => changeType(typeId)}
                      style={{
                        padding: "9px 11px", borderRadius: 8, cursor: "pointer",
                        background: on ? tt.soft : "var(--bg2)",
                        border: `1px solid ${on ? `color-mix(in oklab, ${tt.accent} 45%, transparent)` : "var(--border-2)"}`,
                        textAlign: "left",
                        display: "flex", alignItems: "center", gap: 9,
                      }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: on ? `color-mix(in oklab, ${tt.accent} 16%, transparent)` : "var(--bg3)",
                        color: tt.accent,
                        display: "grid", placeItems: "center", flexShrink: 0,
                      }}>
                        <PW.Ico name={tt.icon} size={13} stroke={1.7} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 500,
                                        color: on ? "var(--fg1)" : "var(--fg2)" }}>{tt.label}</span>
                        <span style={{ display: "block", marginTop: 1, fontSize: 10, color: "var(--fg3)",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tt.descriptor}
                        </span>
                      </span>
                      {on && <PW.Ico name="check" size={12} stroke={2.2}
                                     style={{ color: tt.accent, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          <Section title="② Trigger condition" hint={t?.descriptor}>
            <ConditionEditor type={draft.type} config={draft.config}
              onChange={(cfg) => setDraft({ ...draft, config: cfg })} />
          </Section>

          <Section title="③ Bound devices"
            hint="The rule runs on every device that matches the binding below. Bindings by merchant / store / model are dynamic — new devices joining the scope are picked up automatically.">
            <BindingEditor binding={draft.binding}
              ruleId={initial?.id}
              onChange={(b) => setDraft({ ...draft, binding: b })} />
          </Section>

          <Section title="④ Notifications"
            hint="Station letter is always on. Email is optional. Throttle controls how aggressive multi-device firings get bundled.">
            <NotificationEditor notify={draft.notify}
              onChange={(n) => setDraft({ ...draft, notify: n })} />
          </Section>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Rules list — table of configured rules
// ═══════════════════════════════════════════════════════════
PW.RulesList = function RulesList({ onCreate, onEdit, onView, onOpenInbox }) {
  PW.useRulesTick();
  const rules = PW.RULES;
  const [confirmDel, setConfirmDel] = useStateR(null);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "var(--bg1)" }}>
      <div style={{
        padding: "14px 22px 12px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onOpenInbox} style={{
          padding: 4, color: "var(--fg3)", borderRadius: 5,
          background: "transparent", border: 0, cursor: "pointer",
        }}><PW.Ico name="chevl" size={14} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--fg3)" }}>Pre-warnings · Rules</div>
          <h2 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 600 }}>Rules</h2>
        </div>
        <button onClick={onCreate} className="tds-btn tds-btn--sm tds-btn--primary">
          <PW.Ico name="plus" size={11} stroke={2} />
          New rule
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
        <div style={{ overflowX: "auto" }}>
        <div style={{
          background: "var(--bg2)", border: "1px solid var(--border-1)",
          borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-1)",
          minWidth: 920,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) 130px minmax(0, 1.2fr) 110px 110px 60px",
            gap: 12, padding: "9px 14px",
            background: "var(--bg3)",
            borderBottom: "1px solid var(--border-1)",
            fontSize: 10.5, fontWeight: 500, color: "var(--fg3)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <span>Rule</span>
            <span>Type</span>
            <span>Binding</span>
            <span>Notify</span>
            <span style={{ textAlign: "right" }}>Devices</span>
            <span />
          </div>
          {rules.map((r, idx) => {
            const t = PW.TYPES[r.type];
            const b = PW.bindingSummary(r);
            return (
              <div key={r.id} style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.6fr) 130px minmax(0, 1.2fr) 110px 110px 60px",
                gap: 12, padding: "11px 14px", alignItems: "center",
                borderTop: idx === 0 ? 0 : "1px solid var(--border-1)",
                background: r.enabled ? "var(--bg2)" : "var(--bg3)",
                opacity: r.enabled ? 1 : 0.72,
                cursor: "pointer",
              }}
              onClick={() => onView && onView(r)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 10.5, color: "var(--fg3)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="mono">{r.id}</span> · created {r.createdAt} · {r.createdBy}
                  </div>
                </div>
                <PW.TypeChip type={r.type} size="sm" />
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <PW.Ico name={b.icon} size={11} style={{ color: "var(--fg3)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: "var(--fg2)",
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.text}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <span title="Station letter" style={{
                    width: 22, height: 22, borderRadius: 5,
                    display: "grid", placeItems: "center",
                    background: "color-mix(in oklab, var(--color-primary-500) 10%, transparent)",
                    color: "var(--color-primary-700)",
                  }}>
                    <PW.Ico name="bell" size={11} />
                  </span>
                  {r.notify.email && (
                    <span title={`Email · ${(r.notify.recipients || []).length} recipient(s) · ${r.notify.throttle}`} style={{
                      width: 22, height: 22, borderRadius: 5,
                      display: "grid", placeItems: "center",
                      background: "color-mix(in oklab, var(--color-primary-500) 10%, transparent)",
                      color: "var(--color-primary-700)",
                    }}>
                      <PW.Ico name="mail" size={11} />
                    </span>
                  )}
                  <span title="Throttle" style={{
                    padding: "3px 6px", borderRadius: 4,
                    fontSize: 10, color: "var(--fg3)",
                    background: "var(--bg3)", border: "1px solid var(--border-1)",
                    fontFamily: "var(--font-mono)",
                  }}>{(r.notify.throttle || "").replace("digest-", "")}</span>
                </div>
                <span className="mono" style={{ fontSize: 12, color: "var(--fg1)", textAlign: "right" }}>
                  {r.matchedDevices}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit && onEdit(r); }}
                    title="Edit rule"
                    style={{
                      padding: 5, color: "var(--fg3)", borderRadius: 5,
                      background: "transparent", border: 0, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--fg1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                    <PW.Ico name="edit" size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}
                    title="Delete rule"
                    style={{
                      padding: 5, color: "var(--fg3)", borderRadius: 5,
                      background: "transparent", border: 0, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-error-500) 12%, transparent)"; e.currentTarget.style.color = "var(--color-error-700)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                    <PW.Ico name="trash" size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
      {window.ConfirmDialog && (
        <window.ConfirmDialog open={!!confirmDel}
          onClose={() => setConfirmDel(null)}
          title={`Delete rule "${confirmDel?.name || ""}"?`}
          body="Bound terminals will stop receiving this pre-warning. Alerts already in the inbox stay until handled."
          confirmLabel="Delete rule"
          tone="danger"
          icon="trash"
          onConfirm={() => {
            const name = confirmDel?.name;
            const id = confirmDel?.id;
            setConfirmDel(null);
            if (id) {
              PW.deleteRule(id);
              window.showToast?.(`Rule "${name}" deleted`, "warning");
            }
          }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Alert detail drawer / panel
// Shows the firing alert in detail; reads the rule for context.
// ═══════════════════════════════════════════════════════════
PW.AlertDetail = function AlertDetail({ alertId, onClose, onOpenRule, onOpenDeviceProfile, embedded = false }) {
  const alert = useMemoR(() => PW.ALERTS.find(a => a.id === alertId) || PW.ALERTS[0], [alertId]);
  if (!alert) return null;
  const rule = PW.findRule(alert.ruleId);
  const t = PW.TYPES[rule.type];
  const status = PW.statusOf(alert);
  const merchant = PW.findMerchant(alert.merchantId);
  const store = PW.findStore(alert.storeId);

  const Wrap = ({ children }) => embedded ? (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "var(--bg2)", border: "1px solid var(--border-1)",
                  borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
      {children}
    </div>
  ) : (
    <div style={{
      position: "absolute", inset: 0, zIndex: 130,
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0,
        background: "rgba(0,0,0,.35)" }} />
      <aside style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 480,
        background: "var(--bg2)", borderLeft: "1px solid var(--border-1)",
        display: "flex", flexDirection: "column",
      }}>
        {children}
      </aside>
    </div>
  );

  return (
    <Wrap>
      {/* Header */}
      <header style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border-1)",
        background: t.soft,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "var(--bg2)", color: t.accent,
            border: `1px solid color-mix(in oklab, ${t.accent} 35%, transparent)`,
            display: "grid", placeItems: "center",
          }}>
            <PW.Ico name={t.icon} size={16} stroke={1.7} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: t.accent, fontWeight: 500,
                          letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {t.label}
            </div>
            <div className="mono" style={{ marginTop: 1, fontSize: 12.5,
                                            fontWeight: 600, color: "var(--fg1)" }}>
              {alert.currentText}
            </div>
          </div>
          {!embedded && (
            <button onClick={onClose} style={{
              padding: 6, color: "var(--fg3)", borderRadius: 5,
              background: "transparent", border: 0, cursor: "pointer",
            }}><PW.Ico name="x" size={14} /></button>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>
          {alert.detail}
        </div>
        {status !== "unread" && status !== "read" && (
          <div style={{ marginTop: 8 }}>
            <PW.StatusPill status={status} ticketId={alert.ticketId} />
          </div>
        )}
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px",
                    display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{
            fontSize: 10.5, color: "var(--fg3)", fontWeight: 500,
            letterSpacing: "0.05em", textTransform: "uppercase",
            marginBottom: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>Device</span>
            {onOpenDeviceProfile && (
              <>
                <span style={{ flex: 1 }} />
                <button onClick={() => onOpenDeviceProfile(alert.deviceSn)}
                  title="Open the full device profile page"
                  style={{
                    padding: "2px 6px", borderRadius: 4,
                    fontSize: 10.5, fontWeight: 500,
                    letterSpacing: "0.02em", textTransform: "none",
                    background: "transparent",
                    border: "1px solid color-mix(in oklab, var(--color-primary-500) 28%, transparent)",
                    color: "var(--color-primary-700)",
                    display: "inline-flex", alignItems: "center", gap: 3,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 10%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}>
                  View profile
                  <span aria-hidden="true">↗</span>
                </button>
              </>
            )}
          </div>
          <KvRow label="Serial" value={
            <PW.SNText sn={alert.deviceSn} onJump={onOpenDeviceProfile} weight={500} />
          } />
          <KvRow label="Model"  value={<span className="mono">{alert.model}</span>} />
          <KvRow label="Merchant" value={merchant?.name || "—"} />
          <KvRow label="Store"  value={`${store?.name || "—"} · ${store?.city || ""}`} />
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 500,
                        letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
            Triggered by rule
          </div>
          <div style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            background: "var(--bg1)", border: "1px solid var(--border-2)",
            display: "flex", alignItems: "center", gap: 10,
            textAlign: "left",
          }}>
            <PW.TypeChip type={rule.type} size="sm" />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--fg1)" }}>{rule.name}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 500,
                        letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
            Timeline
          </div>
          <Timeline events={[
            { at: alert.firedAtAbs, label: "Pre-warning fired", current: status === "unread" },
            { at: alert.firedAtAbs, label: "Notification dispatched (station + email)" },
            ...(status === "read" ? [{ at: "just now", label: "Marked as read" }] : []),
            ...(alert.ticketId ? [{ at: "May 17, 2026 09:21", label: `Converted to ticket ${alert.ticketId}` }] : []),
            ...(alert.selfHealed ? [{ at: alert.firedAtAbs, label: "Self-healed — telemetry recovered", tone: "success" }] : []),
          ]} />
        </div>
      </div>

      {/* Footer actions */}
      <footer style={{
        padding: "10px 14px", borderTop: "1px solid var(--border-1)",
        background: "var(--bg3)",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
      }}>
        {!alert.ticketId && (
          <button onClick={() => window.showToast?.(`Converted ${alert.id} to ticket`, "success")}
            className="tds-btn tds-btn--sm tds-btn--primary">
            <PW.Ico name="ticket" size={11} />
            Convert to ticket
          </button>
        )}
      </footer>
    </Wrap>
  );
};

function KvRow({ label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 12,
      padding: "5px 0", borderBottom: "1px dashed var(--border-1)",
      fontSize: 11.5,
    }}>
      <div style={{ width: 80, color: "var(--fg3)", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, color: "var(--fg1)", fontWeight: 450 }}>{value}</div>
    </div>
  );
}

function Timeline({ events }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }}>
      <span style={{
        position: "absolute", top: 6, bottom: 6, left: 5,
        width: 1.5, background: "var(--border-2)",
      }} />
      {events.map((e, i) => (
        <li key={i} style={{ position: "relative", paddingLeft: 22,
                              padding: "5px 0 5px 22px" }}>
          <span style={{
            position: "absolute", left: 0, top: 8,
            width: 11, height: 11, borderRadius: "50%",
            background: e.tone === "success" ? "var(--color-success-500)"
                       : e.current ? "var(--color-primary-500)"
                                   : "var(--bg3)",
            border: e.current ? "2px solid color-mix(in oklab, var(--color-primary-500) 30%, transparent)" : "2px solid var(--border-2)",
            boxShadow: e.current ? "0 0 0 3px color-mix(in oklab, var(--color-primary-500) 18%, transparent)" : "none",
          }} />
          <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--fg1)" }}>{e.label}</div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{e.at}</div>
        </li>
      ))}
    </ol>
  );
}
