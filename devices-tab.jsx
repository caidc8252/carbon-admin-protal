/* global React, Btn, Badge, Icon, Modal, fmtDateTime */
// =====================================================================
// devices-tab.jsx — Customer Detail · Devices tab (MERCHANT customers).
//
// Renders one row per terminal under the customer's bridged legacy
// MERCHANTS entry. Each row expands into a "Configured apps" sub-table
// joining REQUEST_APPS with INSTALLED_APPS + recent DEVICE_EVENTs;
// each app surfaces a strategy chip (click → strategy modal) and a
// status pill derived by window.deriveAppStatus().
//
// Per-row "View events" link opens a per-device events modal.
//
// All read-only — admins observe, ISO operators configure on the
// customer-side portal.
// =====================================================================

const { useState: useStateDT, useMemo: useMemoDT, useContext: useContextDT } = React;

// ─── Static label maps ───────────────────────────────────────────────
const _STATUS_META = {
  installed:     { tone: 'success', label: 'Installed' },
  needs_upgrade: { tone: 'warning', label: 'Needs upgrade' },
  not_installed: { tone: 'neutral', label: 'Not installed' },
  downloading:   { tone: 'info',    label: 'Downloading' },
  failed:        { tone: 'danger',  label: 'Failed' },
};
const _URGENCY_META = {
  casual:    { cls: 'dt-strat dt-strat--casual',    label: 'CASUAL' },
  immediate: { cls: 'dt-strat dt-strat--immediate', label: 'IMMEDIATE' },
  custom:    { cls: 'dt-strat dt-strat--custom',    label: 'CUSTOM' },
};
const _NETWORK_LABEL = {
  noRestriction: 'No restriction',
  wifiOrEthernet: 'Wi-Fi / Ethernet only',
  wifiOrEthernetOrCellularUnderCap: 'Wi-Fi / Ethernet + Cellular (under cap)',
};
const _UPGRADE_TIME_LABEL = {
  immediate:                'Immediate',
  onTheNextBoot:            'On next boot',
  nextBootOrAfter10MinIdle: 'Next boot or 10 min idle',
  sc:                       'Scheduled (within install windows)',
};
const _SUMMARY_TONE_CSS = {
  ok:     'var(--color-success-700)',
  warn:   'var(--color-warning-700)',
  danger: 'var(--color-error-700)',
  muted:  'var(--color-text-tertiary)',
};
// Event type → grouping bucket + dot color + readable label.
const _EVENT_META = {
  app_download_started:     { bucket: 'download',   tone: 'info',    label: 'Download started' },
  app_download_succeeded:   { bucket: 'download',   tone: 'success', label: 'Download succeeded' },
  app_download_failed:      { bucket: 'download',   tone: 'danger',  label: 'Download failed' },
  app_install_succeeded:    { bucket: 'install',    tone: 'success', label: 'Installed' },
  app_install_failed:       { bucket: 'install',    tone: 'danger',  label: 'Install failed' },
  user_postponed_upgrade:   { bucket: 'user',       tone: 'warning', label: 'User postponed upgrade' },
  user_confirmed_upgrade:   { bucket: 'user',       tone: 'info',    label: 'User confirmed upgrade' },
  app_uninstalled:          { bucket: 'install',    tone: 'warning', label: 'App uninstalled' },
  firmware_sync_succeeded:  { bucket: 'ota',        tone: 'info',    label: 'Firmware sync' },
};
const _EVENT_BUCKETS = [
  { id: 'all',      label: 'All' },
  { id: 'install',  label: 'Install' },
  { id: 'download', label: 'Download' },
  { id: 'user',     label: 'User action' },
  { id: 'ota',      label: 'OTA' },
];

const _fmtLastSeen = (iso) => {
  if (!iso) return 'never';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'never';
  const delta = Date.now() - ms;
  if (delta < 60_000)             return 'just now';
  if (delta < 60 * 60_000)        return `${Math.floor(delta / 60_000)} min ago`;
  if (delta < 24 * 60 * 60_000)   return `${Math.floor(delta / 3_600_000)} h ago`;
  if (delta < 30 * 86_400_000)    return `${Math.floor(delta / 86_400_000)} d ago`;
  return new Date(ms).toISOString().slice(0, 10);
};
const _fmtEventTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  const mm = d.toLocaleString('en-US', { month: 'short' });
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mn = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${mm} ${dd} · ${hh}:${mn}:${ss}`;
};

// ─── Strategy modal ──────────────────────────────────────────────────
const StrategyModal = ({ open, onClose, ctx }) => {
  if (!open || !ctx) return null;
  const { device, app } = ctx;
  const s = app?.strategy;
  const urgency = _URGENCY_META[s?.upgradeStrategy] || _URGENCY_META.casual;
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={`Update strategy — ${app._appName || app.pkgName}`}
      footer={<Btn variant="secondary" onClick={onClose}>Close</Btn>}>
      <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>{app.pkgName}</span>
        <span> · target <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{app.versionName}</span></span>
        <span> · for <span style={{ fontFamily: 'var(--font-family-mono)' }}>{device.sn}</span></span>
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 12px', alignItems: 'baseline' }}>
        <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Urgency</dt>
        <dd style={{ margin: 0 }}>
          <span className={urgency.cls} style={{ cursor: 'default' }}>{urgency.label}</span>
        </dd>

        <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Network</dt>
        <dd style={{ margin: 0, fontSize: 13 }}>{_NETWORK_LABEL[s?.networkRequest] || '—'}</dd>

        {s?.cellularCap != null && (
          <>
            <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Cellular cap</dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>{s.cellularCap} MB</dd>
          </>
        )}

        <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Upgrade time</dt>
        <dd style={{ margin: 0, fontSize: 13 }}>{_UPGRADE_TIME_LABEL[s?.upgradeTime] || '—'}</dd>

        {(s?.installWindows || []).length > 0 && (
          <>
            <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Install windows</dt>
            <dd style={{ margin: 0 }}>
              {s.installWindows.map((w, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, marginRight: 8 }}>
                  {w.start} – {w.end}
                </span>
              ))}
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11.5, marginLeft: 4 }}>device-local time</span>
            </dd>
          </>
        )}

        <dt className="overline" style={{ color: 'var(--color-text-tertiary)' }}>Configured</dt>
        <dd style={{ margin: 0, fontSize: 13 }}>
          {fmtDateTime(app.configTimestamp)}
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11.5, marginLeft: 4 }}>by ISO operator</span>
        </dd>
      </dl>
    </Modal>
  );
};

// ─── Events modal ────────────────────────────────────────────────────
const EventsModal = ({ open, onClose, device }) => {
  const [bucket, setBucket] = useStateDT('all');
  const [shown, setShown] = useStateDT(50);
  if (!open || !device) return null;

  const allEvents = window.getDeviceEvents ? window.getDeviceEvents(device.sn) : [];
  const filtered = bucket === 'all'
    ? allEvents
    : allEvents.filter((e) => (_EVENT_META[e.eventType]?.bucket || '') === bucket);
  const visible = filtered.slice(0, shown);

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={680}
      title={
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>Device events — <span style={{ fontFamily: 'var(--font-family-mono)' }}>{device.sn}</span></span>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', fontWeight: 400, marginTop: 2 }}>
            {device.model || '—'} · {device.tid || '—'} · {device._store?.name || device.storeName || '—'}
            {device.deviceApp?.syncTimestamp
              ? <> · last seen {_fmtLastSeen(device.deviceApp.syncTimestamp)}</>
              : <> · never synced</>}
          </span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
            Showing {visible.length} of {filtered.length} events
          </span>
          {visible.length < filtered.length
            ? <Btn variant="secondary" size="sm" onClick={() => setShown((n) => n + 50)}>Load more</Btn>
            : <Btn variant="secondary" size="sm" onClick={onClose}>Close</Btn>}
        </div>
      }>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '6px 0 12px', marginBottom: 12, borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginRight: 4 }}>Filter</span>
        {_EVENT_BUCKETS.map((b) => (
          <button key={b.id} type="button" onClick={() => { setBucket(b.id); setShown(50); }}
                  style={{
                    padding: '3px 10px', borderRadius: 999,
                    background: bucket === b.id ? 'var(--color-primary-50, oklch(95% 0.04 268))' : 'var(--color-bg-3)',
                    color:      bucket === b.id ? 'var(--color-primary-700)' : 'var(--color-text-secondary)',
                    border: 0, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: bucket === b.id ? 500 : 400,
                    fontFamily: 'inherit',
                  }}>
            {b.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
          {allEvents.length} total
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="empty" style={{ padding: '28px 12px', textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>
          No events in this category.
        </div>
      ) : (
        <div>
          {visible.map((e) => {
            const meta = _EVENT_META[e.eventType] || { tone: 'neutral', label: e.eventTypeLabel || e.eventType };
            const dotColor = {
              info:    'var(--color-info-500)',
              success: 'var(--color-success-500)',
              danger:  'var(--color-error-500)',
              warning: 'var(--color-warning-500)',
              neutral: 'var(--color-text-tertiary)',
            }[meta.tone] || 'var(--color-text-tertiary)';
            return (
              <div key={e.id} style={{
                display: 'grid', gridTemplateColumns: '140px 16px 1fr auto', gap: 10,
                padding: '9px 4px', borderBottom: '1px solid var(--color-border-subtle)',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, color: 'var(--color-text-tertiary)', paddingTop: 2 }}>
                  {_fmtEventTime(e.eventTime)}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, marginTop: 6, justifySelf: 'center' }}/>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {meta.label}
                  {e.target2 && e.target2 !== 'OTA' && (
                    <> · <strong style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{e.target2} {e.target3}</strong></>
                  )}
                  {e.eventType === 'firmware_sync_succeeded' && (
                    <> · <strong style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>OTA</strong></>
                  )}
                  {e.description && e.description !== meta.label && !e.description.startsWith(e.eventTypeLabel) && (
                    <span style={{ color: 'var(--color-text-tertiary)' }}> · {e.description.replace(/^[^·]+·\s*/, '')}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                    {e.pkgName}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
                  {e.eventDuration || '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

// ─── Configured-apps sub-table inside an expanded device row ────────
const ConfiguredAppsTable = ({ device, onOpenStrategy }) => {
  const req = device.deviceApp?.requestApps || [];
  if (req.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--color-text-tertiary)', fontSize: 12.5 }}>
        No apps configured for this device yet.
      </div>
    );
  }
  const events = window.getDeviceEvents ? window.getDeviceEvents(device.sn) : [];

  return (
    <div style={{
      background: 'var(--color-bg-1)', padding: '14px 20px',
      borderTop: '1px solid var(--color-border-subtle)',
    }}>
      <div style={{
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-subtle)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        <table className="tds-table" style={{ background: 'transparent', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '34%' }}>App</th>
              <th style={{ width: '14%' }}>Installed</th>
              <th style={{ width: '14%' }}>Target</th>
              <th style={{ width: '16%' }}>Strategy</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {req.map((r) => {
              const inst = (device.deviceApp?.installedApps || []).find((i) => i.pkgName === r.pkgName) || null;
              const recent = events.find((e) => e.pkgName === r.pkgName) || null;
              const status = window.deriveAppStatus
                ? window.deriveAppStatus(r, inst, recent)
                : (inst && inst.versionCode >= r.versionCode ? 'installed' : 'not_installed');
              const sMeta = _STATUS_META[status] || { tone: 'neutral', label: status };
              const urgency = _URGENCY_META[r.strategy?.upgradeStrategy] || _URGENCY_META.casual;

              const installedDisplay = inst
                ? <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, color: inst.versionCode < r.versionCode ? 'var(--color-warning-700)' : 'var(--color-text-primary)', fontWeight: inst.versionCode < r.versionCode ? 500 : 400 }}>{inst.versionName}</span>
                : <span style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>;

              return (
                <tr key={r.pkgName}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r._appName || r.pkgName}</div>
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 10.5, color: 'var(--color-text-tertiary)' }}>{r.pkgName}</div>
                  </td>
                  <td>{installedDisplay}</td>
                  <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, fontWeight: 500 }}>{r.versionName}</span></td>
                  <td>
                    <button type="button"
                            className={urgency.cls}
                            onClick={() => onOpenStrategy({ device, app: r })}
                            title="View strategy detail">
                      {urgency.label}
                      <Icon name="info" size={10} style={{ marginLeft: 4, opacity: 0.7 }} />
                    </button>
                  </td>
                  <td><Badge tone={sMeta.tone} dot>{sMeta.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Device row + expansion ──────────────────────────────────────────
const DeviceRow = ({ device, isOpen, onToggle, onOpenStrategy, onOpenEvents, onOpenTerminalSn }) => {
  const summary = window.summarizeDeviceApps ? window.summarizeDeviceApps(device) : { count: 0, hint: '—', tone: 'muted' };
  const synced = !!device.deviceApp?.syncTimestamp;
  const onlineTone = synced ? 'success' : 'neutral';

  return (
    <>
      <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--color-bg-hover)' : undefined }}
          onClick={onToggle}>
        <td style={{ paddingLeft: 14, color: 'var(--color-text-tertiary)' }}>
          <Icon name={isOpen ? 'chevD' : 'chevR'} size={12}/>
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <a onClick={(e) => { e.stopPropagation(); onOpenTerminalSn(device.sn); }}
                 style={{
                   fontFamily: 'var(--font-family-mono)', fontSize: 12.5, fontWeight: 500,
                   color: 'var(--color-primary-700)', cursor: 'pointer',
                   textDecoration: 'underline', textUnderlineOffset: 2,
                 }}>{device.sn}</a>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
                {device.model || '—'} · {device.tid || '—'}
              </div>
            </div>
          </div>
        </td>
        <td><span style={{ fontSize: 12.5 }}>{device.storeName || '—'}</span></td>
        <td><Badge tone={onlineTone} dot>{synced ? 'Online' : 'Offline'}</Badge></td>
        <td>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{summary.count}</span>
            <span style={{ fontSize: 11, color: _SUMMARY_TONE_CSS[summary.tone] || 'var(--color-text-tertiary)' }}>
              {summary.hint}
            </span>
          </div>
        </td>
        <td><span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{_fmtLastSeen(device.deviceApp?.syncTimestamp)}</span></td>
        <td style={{ textAlign: 'right' }}>
          {synced ? (
            <a onClick={(e) => { e.stopPropagation(); onOpenEvents(device); }}
               style={{
                 color: 'var(--color-primary-700)', cursor: 'pointer', fontSize: 12,
                 textDecoration: 'none', borderBottom: '1px solid transparent',
               }}
               onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'currentColor'}
               onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}>
              View events
            </a>
          ) : (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12, cursor: 'default' }}>View events</span>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="device-expansion-row">
          <td colSpan="7" style={{ padding: 0, background: 'var(--color-bg-1)' }}>
            <ConfiguredAppsTable device={device} onOpenStrategy={onOpenStrategy}/>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main tab ─────────────────────────────────────────────────────────
const DevicesTab = ({ customer }) => {
  const devices = useMemoDT(
    () => (window.listDevicesForMerchant ? window.listDevicesForMerchant(customer.id) : []),
    [customer.id]
  );
  const [openId, setOpenId] = useStateDT(null);
  const [stratCtx, setStratCtx] = useStateDT(null);
  const [eventsDevice, setEventsDevice] = useStateDT(null);

  // SN → device-detail navigation; uses the already-wired bridge.
  const openTerminalSn = (sn) => {
    if (window.__openTerminalFromCustomer) {
      window.__openTerminalFromCustomer(sn, customer.id, 'devices');
    } else if (window.__navigate) {
      window.__navigate({ screen: 'deviceDetail', deviceSn: sn });
    }
  };

  if (devices.length === 0) {
    return (
      <div className="info-card">
        <div className="empty" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}>未添加任何终端</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Terminals are registered on the customer-side ISO portal — they'll appear here once the first device reports in.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tds-table" style={{ width: '100%' }}>
          <colgroup>
            <col style={{ width: 30 }}/>
            <col style={{ width: '28%' }}/>
            <col style={{ width: '16%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: '20%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: 110 }}/>
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>Terminal</th>
              <th>Store</th>
              <th>Status</th>
              <th>Deployment</th>
              <th>Last seen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <DeviceRow
                key={d.sn}
                device={d}
                isOpen={openId === d.sn}
                onToggle={() => setOpenId((id) => id === d.sn ? null : d.sn)}
                onOpenStrategy={setStratCtx}
                onOpenEvents={setEventsDevice}
                onOpenTerminalSn={openTerminalSn}/>
            ))}
          </tbody>
        </table>
      </div>

      <StrategyModal open={!!stratCtx} onClose={() => setStratCtx(null)} ctx={stratCtx}/>
      <EventsModal open={!!eventsDevice} onClose={() => setEventsDevice(null)} device={eventsDevice}/>
    </>
  );
};

// ─── Local styles for the strategy chip (no equivalent in TDS) ───────
(function injectStrategyChipCss() {
  if (document.getElementById('devices-tab-css')) return;
  const css = `
    .dt-strat {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 999px;
      font-size: 11px; font-weight: 500; letter-spacing: 0.03em;
      border: 0; cursor: pointer; font-family: inherit;
      transition: filter 120ms;
    }
    .dt-strat:hover { filter: brightness(0.96); }
    .dt-strat--casual    { background: var(--color-bg-3);        color: var(--color-text-secondary); }
    .dt-strat--immediate { background: var(--color-error-50);    color: var(--color-error-700); }
    .dt-strat--custom    { background: var(--color-info-50);     color: var(--color-info-700); }
  `;
  const tag = document.createElement('style');
  tag.id = 'devices-tab-css';
  tag.textContent = css;
  document.head.appendChild(tag);
})();

window.DevicesTab = DevicesTab;
