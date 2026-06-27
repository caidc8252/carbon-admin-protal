/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Device detail · Monitoring tab
//
// Overrides window.DeviceMonitoringTab. Visually mirrors the
// product mock (snapshot banner, health strip, payment / system /
// menu-visibility / network cards, then collapsible Security &
// uptime / SIM usage / Location detail cards).
//
// READ-ONLY: this is the admin portal — operators inspect, they
// do not push changes. Every switch / slider / select / pencil
// renders as a faithful *display* of the device's current value
// but is non-interactive (no mutation, no handlers). The expand /
// collapse controls on the three detail cards are the only
// interactive elements.
//
// Data: window.deviceTelemetryFor(device) + memSummaryFor(device).
// Icons restricted to the project's Ico set (shared + shims).
// ─────────────────────────────────────────────────────────────

(function () {
  const { useState, useMemo } = React;
  const Ico = window.Ico, Pill = window.Pill, Card = window.Card;

  const LINE = "1px solid var(--color-border-subtle)";
  const GREEN = "var(--color-success-700)";
  const PRIMARY = "var(--color-primary-600)";

  // ── Read-only switch (greyed / disabled — shows state, locked) ──
  // Non-editable: rendered in a muted neutral palette + reduced opacity so
  // it clearly reads as locked rather than an interactive toggle.
  function Switch({ on }) {
    return (
      <span aria-hidden="true" style={{
        display: "inline-block", width: 34, height: 19, borderRadius: 999,
        background: on ? "var(--color-text-tertiary)" : "var(--color-bg-3)",
        border: "1px solid var(--color-border-default)",
        position: "relative", flex: "none", verticalAlign: "middle",
        opacity: 0.55, cursor: "not-allowed",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "var(--color-bg-2)",
          boxShadow: "0 1px 1px rgba(0,0,0,0.18)",
        }} />
      </span>
    );
  }

  // On / Off state — neutral (greyed) label + locked switch.
  function OnState({ on, onLabel = "On", offLabel = "Off" }) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-secondary)" }}>
          {on ? onLabel : offLabel}
        </span>
        <Switch on={on} />
      </span>
    );
  }

  // Read-only value box (disabled input look) — no chevron, not a dropdown.
  // Fixed uniform width so the column lines up across rows.
  function ReadField({ value, width = 180 }) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center",
        width, height: 32, padding: "0 10px",
        border: "1px solid var(--color-border-subtle)", borderRadius: 7,
        background: "var(--color-bg-3)", color: "var(--color-text-secondary)",
        fontSize: 12.5, fontVariantNumeric: "tabular-nums", cursor: "default",
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      </span>
    );
  }

  // Slider rendered as a static read-only filled track + value (no edit button).
  function SliderRO({ pct }) {
    const v = Math.max(0, Math.min(100, pct || 0));
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 12, width: 240 }}>
        <span style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--color-bg-3)", position: "relative" }}>
          <span style={{ position: "absolute", left: 0, top: 0, height: "100%", width: v + "%", background: "var(--color-text-tertiary)", borderRadius: 2 }} />
        </span>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--color-text-secondary)", minWidth: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}%</span>
      </span>
    );
  }

  // One label/value row. Label left (icon + overline), value right.
  function Row({ icon, label, children, last }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? "none" : LINE, minHeight: 40 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 150, flex: "0 0 auto" }}>
          {icon ? <Ico name={icon} size={13} style={{ color: "var(--color-text-tertiary)", flex: "none" }} /> : null}
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{label}</span>
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, minWidth: 0 }}>
          {children}
        </div>
      </div>
    );
  }

  function Val({ children, mono, muted }) {
    return (
      <span className={mono ? "mono" : undefined} style={{
        fontSize: 12.5, color: muted ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
        fontVariantNumeric: mono ? "tabular-nums" : "normal",
      }}>{children}</span>
    );
  }

  function GroupHeader({ text, first }) {
    return <div style={{
      padding: first ? "4px 0 6px" : "14px 0 6px",
      marginTop: first ? 0 : 6,
      borderTop: first ? "none" : "1px solid var(--color-border-subtle)",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      color: "var(--color-text-tertiary)",
    }}>{text}</div>;
  }

  function Grid2({ children }) {
    return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 40 }}>{children}</div>;
  }

  // ── Duration: seconds → "Xd Yh Zm" / "Yh Zm Ws" ──
  function fmtDur(sec) {
    if (!sec) return "—";
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600),
      m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  // ════════════════════════════════════════════════════════
  function DeviceMonitoringTab({ device }) {
    const t = useMemo(() => (window.deviceTelemetryFor ? window.deviceTelemetryFor(device) : null), [device]);
    if (!t) return <div style={{ padding: 14, color: "var(--color-text-tertiary)", fontSize: 12 }}>Telemetry unavailable.</div>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SnapshotBanner t={t} />
        <HealthStrip device={device} t={t} />
        <PaymentModules t={t} />
        <SystemSettings device={device} t={t} />
        <MenuVisibility />
        <NetworkConnectivity t={t} />
        <SecurityUptime t={t} />
        <SimDataUsage device={device} t={t} />
        <LocationTelemetry t={t} />
      </div>
    );
  }

  // ── Snapshot banner ─────────────────────────────────────
  function SnapshotBanner({ t }) {
    const ca = t.collectedAt || {};
    const stale = !!ca.stale;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 9, padding: "9px 14px",
        background: "var(--color-bg-2)", border: LINE, borderRadius: "var(--radius-lg)",
      }}>
        <Ico name="clock" size={13} style={{ color: stale ? "var(--color-warning-700)" : "var(--color-text-tertiary)" }} />
        <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>Snapshot collected</span>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--color-text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{ca.pretty || "—"}</span>
        {ca.relative ? <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>· {ca.relative}</span> : null}
        {stale ? <Pill tone="warning" size="sm" dot>Stale</Pill> : null}
        <span aria-hidden="true" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-tertiary)" }}>
          <Ico name="refresh" size={12} /> Re-collect
        </span>
      </div>
    );
  }

  // ── Health strip ────────────────────────────────────────
  function HealthStrip({ device, t }) {
    const net = t.network || {};
    const channel = net.type;
    const sig = channel === "WIFI" ? (net.wifi && net.wifi.signalDbm)
      : channel === "Cellular" ? (net.cellular && net.cellular.signalDbm) : null;
    const sigWord = sig == null ? null
      : sig > -55 ? "Excellent" : sig > -65 ? "Good" : sig > -75 ? "Fair" : "Weak";
    const tiles = [];
    tiles.push({ label: "Network", value: channel === "WIFI" ? "Wi-Fi" : channel || "Offline",
      sub: sigWord ? `${sigWord} · ${sig} dBm` : (channel === "Ethernet" ? "Wired link" : "No link"),
      tone: channel === "Offline" ? "warning" : "ok" });
    const rooted = !!(t.security && t.security.rooted);
    tiles.push({ label: "Root", value: rooted ? "Rooted" : "Intact", sub: rooted ? "Integrity broken" : "Integrity OK", tone: rooted ? "danger" : "ok" });
    if (device.storage) {
      const pct = Math.round((device.storage.used / device.storage.total) * 100);
      tiles.push({ label: "Storage", value: `${device.storage.used.toFixed(1)} / ${device.storage.total} GB`, sub: `${pct}% used`, tone: pct > 90 ? "danger" : pct > 75 ? "warning" : "ok" });
    }
    const mem = (window.memSummaryFor && window.memSummaryFor(device)) || { usedGB: 0.8, totalGB: 3, pct: 27 };
    tiles.push({ label: "Memory", value: `${mem.usedGB} / ${mem.totalGB} GB`, sub: `${mem.pct}% used`, tone: mem.pct > 90 ? "danger" : mem.pct > 75 ? "warning" : "ok" });
    if (device.battery) {
      tiles.push({ label: "Battery", value: `${device.battery.level}%`,
        sub: typeof device.battery.health === "number" ? (device.battery.health > 80 ? "good" : "fair") : (device.battery.health || ""),
        tone: device.battery.level < 20 ? "danger" : device.battery.level < 50 ? "warning" : "ok" });
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {tiles.map((tile) => {
          const color = tile.tone === "danger" ? "var(--color-error-700)"
            : tile.tone === "warning" ? "var(--color-warning-700)"
            : tile.tone === "ok" ? GREEN : "var(--color-text-primary)";
          return (
            <div key={tile.label} style={{ padding: "12px 14px", background: "var(--color-bg-2)", border: LINE, borderRadius: "var(--radius-lg)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{tile.label}</div>
              <div className="mono" style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{tile.value}</div>
              {tile.sub ? <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-tertiary)" }}>{tile.sub}</div> : null}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Payment modules ─────────────────────────────────────
  function PaymentModules({ t }) {
    const m = t.modules || {};
    return (
      <Card title="Payment modules settings" padding="0 16px">
        <Grid2>
          <Row icon="bolt" label="NFC / Contactless"><OnState on={!!m.contactless} /></Row>
          <Row icon="cpu"  label="IC card reader"><OnState on={!!m.insertCard} /></Row>
          <Row icon="link" label="Magnetic stripe" last><OnState on={!!m.magstripe} /></Row>
          <Row icon="lock" label="PIN pad" last><OnState on={true} /></Row>
        </Grid2>
      </Card>
    );
  }

  // ── System settings ─────────────────────────────────────
  function SystemSettings({ device, t }) {
    const s = t.settings || {};
    const st = t.state || {};
    const ds = device.settings || {};
    const mediaPct = s.mediaVolumeMax ? Math.round((s.mediaVolume / s.mediaVolumeMax) * 100) : 0;
    const ringPct = s.ringVolumeMax ? Math.round((s.ringVolume / s.ringVolumeMax) * 100) : 0;
    const sleep = s.screenTimeoutMs >= 60000 ? `${Math.round(s.screenTimeoutMs / 60000)} minute` : `${Math.round((s.screenTimeoutMs || 0) / 1000)} seconds`;
    return (
      <Card title="System settings" padding="0 16px">
        <Grid2>
          <div>
            <Row icon="clock"  label="Time"><ReadField value={ds.autoTime ? "Auto" : "Manual"} /></Row>
            <Row icon="cloud"  label="Timezone mode"><ReadField value={ds.autoTimezone ? "Auto" : "Manual"} /></Row>
            <Row icon="pin"    label="Timezone"><ReadField value={s.timezone || "—"} /></Row>
            <Row icon="globe"  label="Language"><ReadField value={s.language || "—"} /></Row>
            <Row icon="moon"   label="Sleep" last><ReadField value={sleep} /></Row>
          </div>
          <div>
            <Row icon="sun"     label="Screen brightness"><SliderRO pct={s.brightness} /></Row>
            <Row icon="volume"  label="Media volume"><SliderRO pct={mediaPct} /></Row>
            <Row icon="bell"    label="Ring volume"><SliderRO pct={ringPct} /></Row>
            <Row icon="lock"    label="Terminal lock"><OnState on={!st.terminalLocked} onLabel="Unlocked" offLabel="Locked" /></Row>
            <Row icon="smartphone" label="Unattended mode" last><OnState on={!!st.unattendedMode} /></Row>
          </div>
        </Grid2>
      </Card>
    );
  }

  // ── Settings menu visibility ────────────────────────────
  // Mirrors which OS settings panes are exposed on the unit. The
  // platform ships this as a fixed posture today (no per-device flag),
  // so admins read the canonical set here — they don't change it.
  function MenuVisibility() {
    const V = {
      mobileNetwork: true, airplaneMode: true, hotspot: true,
      wallpaper: true, battery: true, storage: true, functionKey: true,
      appsNotifs: true, accessibility: true, scheduledPower: true, resetOptions: true,
      securityLocation: true, screenshot: true, settingsPasscode: false,
    };
    // Visual row = two cells + ONE continuous full-width divider underneath.
    // Inner Rows pass `last` so they never draw their own (split) border.
    const VRow = ({ left, right, last }) => (
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 40,
        borderBottom: last ? "none" : "1px solid var(--color-border-subtle)",
      }}>
        <div>{left}</div>
        <div>{right || null}</div>
      </div>
    );
    return (
      <Card title="Settings menu visibility" padding="0 16px">
        <GroupHeader text="Network" first />
        <VRow
          left={<Row icon="signal" label="Mobile network" last><OnState on={V.mobileNetwork} /></Row>}
          right={<Row icon="plane" label="Airplane mode" last><OnState on={V.airplaneMode} /></Row>} />
        <VRow last
          left={<Row icon="link" label="Hotspot & tethering" last><OnState on={V.hotspot} /></Row>} />
        <GroupHeader text="Display & storage" />
        <VRow
          left={<Row icon="image" label="Wallpaper" last><OnState on={V.wallpaper} /></Row>}
          right={<Row icon="battery" label="Battery" last><OnState on={V.battery} /></Row>} />
        <VRow last
          left={<Row icon="save" label="Storage" last><OnState on={V.storage} /></Row>}
          right={<Row icon="server" label="Function key" last><OnState on={V.functionKey} /></Row>} />
        <GroupHeader text="System" />
        <VRow
          left={<Row icon="grid" label="Apps & notifications" last><OnState on={V.appsNotifs} /></Row>}
          right={<Row icon="accessibility" label="Accessibility" last><OnState on={V.accessibility} /></Row>} />
        <VRow last
          left={<Row icon="power" label="Scheduled power on/off" last><OnState on={V.scheduledPower} /></Row>}
          right={<Row icon="refresh" label="Reset options" last><OnState on={V.resetOptions} /></Row>} />
        <GroupHeader text="Security" />
        <VRow
          left={<Row icon="shield" label="Security & location" last><OnState on={V.securityLocation} /></Row>}
          right={<Row icon="image" label="Screenshot" last><OnState on={V.screenshot} /></Row>} />
        <VRow last
          left={<Row icon="lock" label="Settings passcode" last><OnState on={V.settingsPasscode} onLabel="Required" offLabel="Not required" /></Row>}
          right={
            <Row icon="key" label="Passcode" last>
              <span className="mono" style={{ fontSize: 13, color: "var(--color-text-tertiary)", letterSpacing: "0.2em" }}>······</span>
            </Row>
          } />
      </Card>
    );
  }

  // ── Network & connectivity ──────────────────────────────
  function NetworkConnectivity({ t }) {
    const n = t.network || {};
    return (
      <Card title="Network & connectivity" padding="0 16px">
        <Grid2>
          <div>
            <Row icon="wifi" label="Wi-Fi"><OnState on={!!(n.wifi && n.wifi.on)} /></Row>
            <Row icon="ethernet" label="Ethernet" last><OnState on={!!(n.ethernet && n.ethernet.on)} /></Row>
          </div>
          <div>
            <Row icon="signal" label="Mobile data"><OnState on={!!(n.cellular && n.cellular.on)} /></Row>
            <Row icon="link" label="Bluetooth" last><OnState on={!!(n.bluetooth && n.bluetooth.on)} /></Row>
          </div>
        </Grid2>
      </Card>
    );
  }

  // ── Collapsible detail card ─────────────────────────────
  function CollapsibleCard({ title, badge, summary, children }) {
    const [open, setOpen] = useState(false);
    const action = (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {badge ? <Pill tone={badge.tone || "info"} size="sm" dot>{badge.text}</Pill> : null}
        <button type="button" onClick={() => setOpen((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", border: "1px solid var(--color-border-default)", background: "var(--color-bg-2)", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", fontFamily: "inherit", cursor: "pointer" }}>
          <Ico name={open ? "chevD" : "chevR"} size={11} />
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
    );
    return (
      <Card title={title} action={action} padding={0}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {summary}
        </div>
        {open ? <div style={{ borderTop: LINE, padding: 16 }}>{children}</div> : null}
      </Card>
    );
  }

  function SummaryItem({ label, value, tone }) {
    const color = tone === "danger" ? "var(--color-error-700)" : tone === "warning" ? "var(--color-warning-700)" : tone === "ok" ? GREEN : "var(--color-text-primary)";
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{label} ·</span>
        <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </span>
    );
  }

  // Metric tile (used in expanded Security & uptime).
  function MetricTile({ label, value, sub, tone }) {
    const color = tone === "danger" ? "var(--color-error-700)" : tone === "ok" ? GREEN : "var(--color-text-primary)";
    return (
      <div style={{ padding: "12px 14px", background: "var(--color-bg-1)", border: LINE, borderRadius: "var(--radius-md, 8px)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{label}</div>
        <div className="mono" style={{ marginTop: 5, fontSize: 16, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        {sub ? <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-tertiary)" }}>{sub}</div> : null}
      </div>
    );
  }

  // ── Security & uptime detail ────────────────────────────
  function SecurityUptime({ t }) {
    const sec = t.security || {};
    const up = t.uptime || {};
    const rootOk = !sec.rooted;
    const triggersOk = sec.status === 0;
    const summary = (
      <>
        <SummaryItem label="Triggers" value={triggersOk ? "OK" : "Flagged"} tone={triggersOk ? "ok" : "warning"} />
        <SummaryItem label="HW attacks" value={String(sec.hwAttackCount ?? 0)} tone={(sec.hwAttackCount ?? 0) > 0 ? "warning" : undefined} />
        <SummaryItem label="SW attacks" value={String(sec.swAttackCount ?? 0)} tone={(sec.swAttackCount ?? 0) > 0 ? "warning" : undefined} />
        <SummaryItem label="Root" value={rootOk ? "OK" : "Rooted"} tone={rootOk ? "ok" : "danger"} />
        <SummaryItem label="Session" value={fmtDur(up.sessionSec)} />
      </>
    );
    const epoch = up.bootEpoch ? `epoch ${up.bootEpoch}` : null;
    return (
      <CollapsibleCard title="Security & uptime detail" summary={summary}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
          <MetricTile label="Hardware attacks" value={String(sec.hwAttackCount ?? 0)} sub="cumulative" tone={(sec.hwAttackCount ?? 0) > 0 ? "danger" : undefined} />
          <MetricTile label="Software attacks" value={String(sec.swAttackCount ?? 0)} sub="cumulative" tone={(sec.swAttackCount ?? 0) > 0 ? "danger" : undefined} />
          <MetricTile label="Root state" value={rootOk ? "Not rooted" : "Rooted"} sub={rootOk ? "Integrity intact" : "Integrity broken"} tone={rootOk ? "ok" : "danger"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <MetricTile label="Session uptime" value={fmtDur(up.sessionSec)} sub="since last boot" />
          <MetricTile label="Today" value={fmtDur(up.todaySec)} sub="00:00 → now" />
          <MetricTile label="Cumulative" value={fmtDur(up.cumulativeSec)} sub="lifetime runtime" />
          <MetricTile label="Last boot" value={up.bootDate || "—"} sub={epoch} />
        </div>
      </CollapsibleCard>
    );
  }

  // ── SIM data usage ──────────────────────────────────────
  function SimDataUsage({ device, t }) {
    const cellOn = !!(t.network && t.network.cellular && t.network.cellular.on);
    if (!cellOn) {
      return (
        <Card title="SIM data usage" padding="0">
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-text-tertiary)" }}>Cellular interface is off — no SIM data to report.</div>
        </Card>
      );
    }
    const seed = device.sn.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
    const cap = 5.0;
    const used = +(1.2 + ((seed % 38) / 10)).toFixed(2);
    const dl = +(used * 0.78).toFixed(2);
    const ulMB = Math.round((used - dl) * 1024);
    const pct = Math.min(100, Math.round((used / cap) * 100));
    const dayOfCycle = (seed % 26) + 2;
    const rate = used / dayOfCycle;
    const daysToCap = Math.max(1, Math.round((cap - used) / Math.max(rate, 0.001)));
    const avgPerDay = Math.round(rate * 1024);
    const tone = pct >= 90 ? "danger" : pct >= 75 ? "warning" : undefined;
    const summary = (
      <>
        <SummaryItem label="Used" value={`${used.toFixed(2)} GB / ${cap.toFixed(2)} GB`} tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : undefined} />
        <SummaryItem label="Download" value={`${dl.toFixed(2)} GB`} />
        <SummaryItem label="Upload" value={`${ulMB} MB`} />
        <SummaryItem label="At current rate" value={`${daysToCap}d to cap`} />
      </>
    );
    const barColor = tone === "danger" ? "var(--color-error-500)" : tone === "warning" ? "var(--color-warning-500)" : PRIMARY;

    // Cumulative 30-day area path (monotonic up to `used`).
    const W = 920, H = 90;
    const pts = [];
    let acc = 0;
    for (let i = 0; i <= 30; i++) {
      const step = (rate * 1024) * (0.5 + ((seed >> (i % 12)) & 7) / 7); // jittered daily MB
      acc += step;
      pts.push(acc);
    }
    const maxAcc = pts[pts.length - 1] || 1;
    const capMB = cap * 1024;
    const yFor = (v) => H - (v / Math.max(maxAcc, capMB)) * (H - 6) - 3;
    const xFor = (i) => (i / 30) * W;
    let line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
    const area = `${line} L${W},${H} L0,${H} Z`;
    const capY = yFor(capMB);

    return (
      <CollapsibleCard title="SIM data usage" badge={{ text: `${pct}% of cap`, tone: tone === "danger" ? "danger" : tone === "warning" ? "warning" : "info" }} summary={summary}>
        {/* Metric columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Used</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{used.toFixed(2)} GB <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-tertiary)" }}>of {cap.toFixed(2)} GB</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Download</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}><Ico name="arrowR" size={13} style={{ color: "var(--color-text-tertiary)" }} /> {dl.toFixed(2)} GB</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Upload</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}><Ico name="arrowU" size={13} style={{ color: "var(--color-text-tertiary)" }} /> {ulMB} MB</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>At current rate</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: daysToCap <= 5 ? "var(--color-warning-700)" : "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{daysToCap}d to cap</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 8, borderRadius: 4, background: "var(--color-bg-3)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: barColor }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--color-text-tertiary)" }}>
          <span>0</span><span>50%</span><span className="mono">{cap.toFixed(2)} GB</span>
        </div>
        {/* 30-day cumulative chart */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Last 30 days · cumulative</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>avg {avgPerDay} MB/day</span>
          </div>
          <div style={{ position: "relative", border: LINE, borderRadius: 8, padding: "8px 8px 4px", background: "var(--color-bg-1)" }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="96" preserveAspectRatio="none" style={{ display: "block" }}>
              <defs>
                <linearGradient id="simfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {capY > 0 && capY < H ? <line x1="0" y1={capY} x2={W} y2={capY} stroke="var(--color-text-tertiary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" /> : null}
              <path d={area} fill="url(#simfill)" />
              <path d={line} fill="none" stroke={PRIMARY} strokeWidth="2" />
            </svg>
            <span className="mono" style={{ position: "absolute", top: 6, right: 10, fontSize: 10, color: "var(--color-text-tertiary)" }}>Cap · {cap.toFixed(2)} GB</span>
          </div>
        </div>
      </CollapsibleCard>
    );
  }

  // ── Location telemetry ──────────────────────────────────
  function LocationTelemetry({ t }) {
    const loc = t.location || {};
    const c = loc.coords || {};
    const lat = c.lat != null ? c.lat.toFixed(4) : "—";
    const lng = c.lng != null ? c.lng.toFixed(4) : "—";
    const today = loc.today || {};
    const yest = loc.yesterday || {};
    const towers = loc.cellTowers || [];
    const wifis = loc.nearbyWifi || [];
    const saved = loc.savedWifi || [];
    const rate = (r) => { const tot = (r.successCount || 0) + (r.failCount || 0); return tot ? Math.round((r.successCount / tot) * 100) : 0; };
    const summary = (
      <>
        <SummaryItem label="Provider" value={loc.provider || "—"} />
        <SummaryItem label="Coords" value={`${lat}, ${lng}`} />
        <SummaryItem label="Cell towers" value={String(towers.length)} />
        <SummaryItem label="Wi-Fi APs" value={String(wifis.length)} />
      </>
    );
    const th = { textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-tertiary)", borderBottom: LINE };
    const td = { padding: "7px 10px", fontSize: 12, fontVariantNumeric: "tabular-nums", borderBottom: LINE };
    const bars = (dbm) => {
      const n = dbm > -45 ? 4 : dbm > -60 ? 3 : dbm > -72 ? 2 : 1;
      const col = n >= 3 ? GREEN : n === 2 ? "var(--color-warning-700)" : "var(--color-error-700)";
      return (
        <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 12 }}>
          {[4, 7, 10, 13].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 1, background: i < n ? col : "var(--color-bg-3)" }} />)}
        </span>
      );
    };
    return (
      <CollapsibleCard title="Location telemetry" summary={summary}>
        <Grid2>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Assist provider</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{loc.provider || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Coordinates</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{lat}, {lng}</div>
          </div>
        </Grid2>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 6 }}>Fix success — last 2 days</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Date</th><th style={th}>SDK</th><th style={{ ...th, textAlign: "right" }}>Success</th><th style={{ ...th, textAlign: "right" }}>Failed</th><th style={{ ...th, textAlign: "right" }}>Rate</th></tr></thead>
            <tbody>
              {[today, yest].map((r, i) => (
                <tr key={i}>
                  <td className="mono" style={td}>{r.date || "—"}</td>
                  <td className="mono" style={td}>{r.sdk || "—"}</td>
                  <td className="mono" style={{ ...td, textAlign: "right", color: GREEN }}>{r.successCount ?? 0}</td>
                  <td className="mono" style={{ ...td, textAlign: "right", color: "var(--color-error-700)" }}>{r.failCount ?? 0}</td>
                  <td className="mono" style={{ ...td, textAlign: "right", color: rate(r) >= 85 ? GREEN : "var(--color-warning-700)" }}>{rate(r)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Grid2>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 6 }}>Cell towers · {towers.length}</div>
            {towers.map((tw, i) => (
              <div key={i} className="mono" style={{ display: "flex", gap: 16, padding: "6px 0", fontSize: 11.5, borderBottom: i < towers.length - 1 ? LINE : "none", color: "var(--color-text-secondary)" }}>
                <span>cid <b style={{ color: "var(--color-text-primary)" }}>{tw.cid}</b></span>
                <span>lac <b style={{ color: "var(--color-text-primary)" }}>{tw.lac}</b></span>
                <span>mcc <b style={{ color: "var(--color-text-primary)" }}>{tw.mcc}</b></span>
                <span>mnc <b style={{ color: "var(--color-text-primary)" }}>{tw.mnc}</b></span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 6 }}>Nearby Wi-Fi · {wifis.length}</div>
            {wifis.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < wifis.length - 1 ? LINE : "none" }}>
                <span className="mono" style={{ flex: 1, fontSize: 11.5, color: "var(--color-text-primary)" }}>{w.mac}</span>
                {bars(w.level)}
                <span className="mono" style={{ fontSize: 11, color: w.level > -60 ? GREEN : w.level > -72 ? "var(--color-warning-700)" : "var(--color-error-700)", minWidth: 52, textAlign: "right" }}>{w.level} dBm</span>
              </div>
            ))}
          </div>
        </Grid2>

        {saved.length ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 8 }}>Previously connected · {saved.length}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {saved.map((sw, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 26, padding: "0 10px", border: LINE, borderRadius: 999, background: "var(--color-bg-1)", fontSize: 12 }}>
                  <Ico name="wifi" size={11} style={{ color: "var(--color-text-tertiary)" }} />
                  <span>{sw.ssid}</span>
                  <span className="mono" style={{ color: "var(--color-text-tertiary)" }}>{sw.level} dBm</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CollapsibleCard>
    );
  }

  // ── Export ──────────────────────────────────────────────
  window.DeviceMonitoringTab = DeviceMonitoringTab;
})();
