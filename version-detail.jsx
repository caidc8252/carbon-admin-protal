/* global React, Btn, Input, Icon, Badge, AppIcon, AppStatusPill, fmtDate, fmtDateTime */
// ─────────────────────────────────────────────────────────────
// Version Detail — admin view of one APK version.
// Mirrors the ISV portal's VersionDetailScreen, read-only:
//   Left:  Build metadata · Vulnerability scan · Release notes · Screenshots
//   Right: Timeline
// Admin doesn't author, so the publish/rollback/unpublish actions in the
// ISV header are omitted — only a passive "Download APK" affordance remains.
// ─────────────────────────────────────────────────────────────
const { useState: useStateVD, useMemo: useMemoVD } = React;

const ANDROID_API_LABEL_VD = {
  21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1',
  28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15'
};
const androidLabelVD = (api) => ANDROID_API_LABEL_VD[api] ? `Android ${ANDROID_API_LABEL_VD[api]}` : `API ${api}`;

const SCAN_META_VD = {
  clean: { tone: 'success', label: 'Clean', sub: 'No findings' },
  dirty: { tone: 'warning', label: 'Findings', sub: 'Review before deploying' }
};

const KV = ({ label, value }) =>
<div className="vd-kv">
    <div className="vd-kv__label">{label}</div>
    <div className="vd-kv__value">{value}</div>
  </div>;

// Vertical label-left / value-right row — matches the published-app version detail.
const OvKV = ({ label, value }) =>
<div className="ov-kv">
    <div className="ov-kv__label">{label}</div>
    <div className="ov-kv__value"><div>{value}</div></div>
  </div>;


const ScreenshotShot = ({ idx, label }) =>
<div className="ov-shot">
    <div className="ov-shot__chrome"><span /><span /><span /></div>
    <div className="ov-shot__body">
      <Icon name="image" size={22} />
      <div className="ov-shot__label">{label} · {idx}</div>
    </div>
  </div>;


// ─── Declared permissions — clickable count opens a modal listing the
// permissions the scanner parsed out of the APK manifest. Sample manifest
// for a payments / POS app; sliced to the version's declared count so the
// list length matches the "N declared" figure on the build-metadata card.
const VD_PERMISSIONS = [
  { name: 'android.permission.INTERNET',                level: 'normal',    purpose: 'Sync orders & transactions with the back office' },
  { name: 'android.permission.ACCESS_NETWORK_STATE',    level: 'normal',    purpose: 'Detect connectivity to choose online vs offline payment flow' },
  { name: 'android.permission.BLUETOOTH_CONNECT',       level: 'dangerous', purpose: 'Pair with external pinpads and BLE printers' },
  { name: 'android.permission.BLUETOOTH_SCAN',          level: 'dangerous', purpose: 'Discover nearby BLE peripherals during pairing' },
  { name: 'android.permission.NFC',                     level: 'normal',    purpose: 'Contactless card reads on the integrated NFC reader' },
  { name: 'android.permission.USE_BIOMETRIC',           level: 'normal',    purpose: 'Manager fingerprint approval for void / refund' },
  { name: 'android.permission.CAMERA',                  level: 'dangerous', purpose: 'Scan QR codes for catalog lookup & wallet payments' },
  { name: 'android.permission.ACCESS_FINE_LOCATION',    level: 'dangerous', purpose: 'Tag each transaction with terminal GPS for fraud rules' },
  { name: 'android.permission.RECEIVE_BOOT_COMPLETED',  level: 'normal',    purpose: 'Auto-start the POS service after a power cycle' },
  { name: 'android.permission.WAKE_LOCK',               level: 'normal',    purpose: 'Keep the screen on during a customer signature' },
  { name: 'android.permission.FOREGROUND_SERVICE',      level: 'normal',    purpose: 'Run the offline transaction queue in the foreground' },
  { name: 'android.permission.POST_NOTIFICATIONS',      level: 'normal',    purpose: 'Show payment confirmation & pending-sync alerts' },
  { name: 'android.permission.READ_PHONE_STATE',        level: 'dangerous', purpose: 'Pull the IMEI for cellular-aware terminal pairing' },
  { name: 'android.permission.SYSTEM_ALERT_WINDOW',     level: 'signature', purpose: 'Show the lockdown overlay during a remote update' },
  { name: 'android.permission.WRITE_EXTERNAL_STORAGE',  level: 'dangerous', purpose: 'Export daily summary CSV to /sdcard/exports' },
  { name: 'android.permission.READ_EXTERNAL_STORAGE',   level: 'dangerous', purpose: 'Import the merchant logo for printed receipts' },
  { name: 'android.permission.MANAGE_EXTERNAL_STORAGE', level: 'signature', purpose: 'Maintain the encrypted transaction journal in /sdcard' },
  { name: 'android.permission.BIND_DEVICE_ADMIN',       level: 'signature', purpose: 'Enforce screen-timeout & kiosk-mode device policies' },
];

const vdPermColor = (lvl) => lvl === 'dangerous' ? 'var(--color-warning-700)'
  : lvl === 'signature' ? 'var(--color-primary-700)'
  : 'var(--color-text-tertiary)';

// ─── Vulnerability findings ──────────────────────────────────
// The scanner reports COUNTS per severity (window.severityCounts). To let a
// reviewer drill into a severity, we expand each count into concrete finding
// rows drawn deterministically from a per-severity template pool — so the
// same (version, severity) always yields the same findings.
const VD_FINDINGS_POOL = {
  critical: [
    { id: 'CVE-2025-30412', title: 'Hardcoded AES key in transaction journal', component: 'libpaycore.so', detail: 'A static 256-bit key is embedded in the native library and used to encrypt the local transaction journal. Recovering the key from the APK allows offline decryption of cardholder data.', cwe: 'CWE-321' },
    { id: 'CVE-2025-28190', title: 'Unauthenticated debug service on TCP 9333', component: 'DebugBridgeService', detail: 'A diagnostic socket binds to 0.0.0.0 and accepts shell-like commands without authentication when the device is on the same LAN.', cwe: 'CWE-306' },
  ],
  high: [
    { id: 'CVE-2025-21877', title: 'Cleartext HTTP fallback for catalog sync', component: 'CatalogSyncWorker', detail: 'When TLS negotiation fails the client retries over plain HTTP, exposing API tokens to network observers.', cwe: 'CWE-319' },
    { id: 'CVE-2024-49901', title: 'Improper certificate validation', component: 'OkHttpClientFactory', detail: 'A custom TrustManager accepts any server certificate, defeating pinning and enabling MITM on payment endpoints.', cwe: 'CWE-295' },
    { id: 'GHSA-7x4m-2q9c', title: 'WebView JavaScript bridge exposed to remote content', component: 'PromoWebView', detail: 'addJavascriptInterface is reachable from externally-loaded promo pages, allowing native method invocation.', cwe: 'CWE-749' },
  ],
  medium: [
    { id: 'CWE-312', title: 'Sensitive data written to logcat', component: 'PaymentLogger', detail: 'PAN-adjacent metadata and auth codes are logged at DEBUG level and remain in logcat on production builds.', cwe: 'CWE-312' },
    { id: 'CWE-200', title: 'Exported activity leaks order intent extras', component: 'OrderDetailActivity', detail: 'An exported activity returns order totals via setResult to any app that starts it.', cwe: 'CWE-200' },
    { id: 'CWE-330', title: 'Weak PRNG for idempotency keys', component: 'IdempotencyKeyGen', detail: 'java.util.Random seeds idempotency tokens, making them predictable across restarts.', cwe: 'CWE-330' },
    { id: 'CWE-530', title: 'Backup allows extraction of shared prefs', component: 'AndroidManifest.xml', detail: 'android:allowBackup="true" permits adb backup of preferences containing the cached session token.', cwe: 'CWE-530' },
    { id: 'CWE-925', title: 'Implicit broadcast for refund events', component: 'RefundBroadcaster', detail: 'Refund completion is announced via an implicit broadcast any app can receive.', cwe: 'CWE-925' },
  ],
  low: [
    { id: 'CWE-326', title: 'Obsolete TLS 1.0 ciphers permitted', component: 'NetworkSecurityConfig', detail: 'The network security config still allows TLS 1.0 for one legacy host.', cwe: 'CWE-326' },
    { id: 'CWE-489', title: 'Debuggable flag present in a build variant', component: 'build.gradle', detail: 'A staging variant ships with android:debuggable, which could reach production if mis-tagged.', cwe: 'CWE-489' },
    { id: 'CWE-209', title: 'Verbose stack traces shown to user', component: 'GlobalErrorHandler', detail: 'Uncaught exceptions render full stack traces in a dialog, leaking class and method names.', cwe: 'CWE-209' },
    { id: 'CWE-354', title: 'Missing integrity check on OTA payload', component: 'OtaInstaller', detail: 'OTA payloads are size-checked but not hash-verified before staging.', cwe: 'CWE-354' },
    { id: 'CWE-1021', title: 'Tap-jacking possible on PIN entry', component: 'PinPadView', detail: 'filterTouchesWhenObscured is not set on the PIN entry surface.', cwe: 'CWE-1021' },
    { id: 'CWE-200b', title: 'Screenshot allowed on receipt screen', component: 'ReceiptActivity', detail: 'FLAG_SECURE is not applied, so receipts with partial PAN can be screenshotted.', cwe: 'CWE-200' },
  ],
  info: [
    { id: 'INFO-001', title: 'Third-party SDK with known telemetry', component: 'analytics-sdk 4.2', detail: 'An analytics SDK collects coarse device identifiers. No action required; documented for review.', cwe: '—' },
    { id: 'INFO-002', title: 'Unused permission declared', component: 'AndroidManifest.xml', detail: 'CAMERA is declared but no call site was found. Consider removing to reduce the manifest surface.', cwe: '—' },
    { id: 'INFO-003', title: 'Minified without source maps', component: 'R8 / ProGuard', detail: 'Release build is minified; no mapping file was bundled (expected for production).', cwe: '—' },
    { id: 'INFO-004', title: 'Large native library increases APK size', component: 'libimageproc.so', detail: 'A 9 MB native lib dominates APK size. Informational only.', cwe: '—' },
  ],
};

// Expand a count into the first N template rows for that severity.
const vdFindingsFor = (sevKey, count) => (VD_FINDINGS_POOL[sevKey] || []).slice(0, count || 0);

const VDPermissionsLink = ({ count, pkg }) => {
  const [open, setOpen] = useStateVD(false);
  const n = count || 0;
  const permissions = VD_PERMISSIONS.slice(0, n);
  const dangerousCount = permissions.filter((p) => p.level === 'dangerous').length;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button type="button" className="vd-perms-link" onClick={() => setOpen(true)}>
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>{n}</span> declared
      </button>
      {dangerousCount > 0 &&
      <span className="muted" style={{ fontSize: 12, color: 'var(--color-warning-700)' }}>
          (<span style={{ fontFamily: 'var(--font-family-mono)' }}>{dangerousCount}</span> dangerous)
        </span>
      }
      {open && window.Modal &&
      <window.Modal open onClose={() => setOpen(false)} width={520}
        title="Declared permissions"
        subtitle={<>Parsed from <span style={{ fontFamily: 'var(--font-family-mono)' }}>AndroidManifest.xml</span>{pkg ? <> · {pkg}</> : null}</>}
        padding={0}
        footer={
          <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <span style={{ fontFamily: 'var(--font-family-mono)' }}>{permissions.length}</span> total
            {dangerousCount > 0 && <span style={{ color: 'var(--color-warning-700)' }}> · <span style={{ fontFamily: 'var(--font-family-mono)' }}>{dangerousCount}</span> dangerous · require runtime user consent on Android 6+</span>}
          </div>
        }>
        {permissions.map((p, i) =>
        <div key={p.name} style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: 10, alignItems: 'start',
          padding: '10px 18px',
          borderBottom: i < permissions.length - 1 ? '1px solid var(--color-border-subtle)' : 'none'
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, background: vdPermColor(p.level) }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, lineHeight: 1.45 }}>
                {p.purpose}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
              padding: '2px 6px', borderRadius: 999,
              background: p.level === 'dangerous' ? 'var(--color-warning-50)' : p.level === 'signature' ? 'var(--color-primary-50)' : 'var(--color-bg-3)',
              color: vdPermColor(p.level)
            }}>{p.level}</span>
          </div>
        )}
      </window.Modal>
      }
    </span>);

};


const VersionDetail = ({ app, version, onBack, onOpenApp }) => {
  const scanMeta = version?.scan ? SCAN_META_VD[version.scan] : null;
  const counts = useMemoVD(() => window.severityCounts(version), [version]);
  const totalFindings = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const highPlus = counts ? (counts.critical || 0) + (counts.high || 0) : 0;
  const vst = window.APP_VERSION_TONE[version?.status] || { label: version?.status || '—', tone: 'neutral' };
  const [shotsOpen, setShotsOpen] = useStateVD(false);
  // Which severity tile's findings drawer is open (null = closed).
  const [openSev, setOpenSev] = useStateVD(null);

  if (!version) {
    return (
      <div className="page">
        <div className="empty">Version not found. <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to app</a></div>
      </div>);

  }

  return (
    <div className="page">
      <div className="det-band det-band--bleed">
        <div className="det-band__inner" style={{ paddingBottom: 14 }}>
      <div className="det-header">
        <button type="button" className="det-back" onClick={onBack} aria-label={`Back to ${app.name} · Versions`} title={`Back to ${app.name} · Versions`}><Icon name="chevL" size={18} /></button>
        <AppIcon app={app} size={56} />
        <div className="det-header__main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <button type="button" className="ad-pub-link" onClick={() => onOpenApp(app.id)} style={{ fontSize: 14 }}>
              {app.name}
            </button>
            <Icon name="chevR" size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            <h1 className="det-header__title" style={{ margin: 0, fontFamily: 'var(--font-family-mono)' }}>
              {version.name}
            </h1>
            <span className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>· code {version.code}</span>
            <Badge tone={vst.tone} dot>{vst.label}</Badge>
            {version.current && <Badge tone="info" dot>Current</Badge>}
          </div>
          <div className="det-header__meta" data-comment-anchor="ffca2a5179-div-88-11">
            <span>
              <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '1px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
                {app.package}
              </code>
            </span>
          </div>
        </div>
        <div className="page__actions">
          <Btn variant="secondary" icon="download">Download APK</Btn>
        </div>
      </div>
        </div>{/* det-band__inner */}
      </div>{/* det-band */}

      <div className="vd-grid" style={{ marginTop: 18 }}>
        {/* LEFT — narrative content */}
        <div className="stack" style={{ gap: 16 }}>
          {/* Build metadata — vertical KV stack, matching the published-app version detail */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Build metadata</div>
            </div>
            <div className="info-card__body" data-comment-anchor="7682d4ebde-div-113-13">
              <div className="ov-kvstack" data-comment-anchor="e7b6df3a70-div-114-15">
                <OvKV label="Version name" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.name}</span>} />
                <OvKV label="Version code" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.code}</span>} />
                <OvKV label="APK size" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.size}</span>} />
                <OvKV label="Permissions" value={<VDPermissionsLink count={version.perms || 0} pkg={app.package} />} />
                <OvKV label="Uploaded" value={fmtDate(version.uploadedAt)} />
                <OvKV label="Published" value={version.publishedAt ? fmtDate(version.publishedAt) : <span className="muted">—</span>} />
                {app.signer &&
                <OvKV label="Signing cert" value={<span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{app.signer}</span>} />
                }
              </div>
            </div>
          </div>

          {/* Release notes */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Release notes</div>
            </div>
            <div className="info-card__body">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
                {version.notes || 'No release notes.'}
              </p>
            </div>
          </div>

          {/* Screenshots — deferred behind a click so the page loads quickly */}
          <div className="info-card">
            <div className="info-card__head" data-comment-anchor="77d4a225ca-div-188-13">
              <div className="info-card__title">Screenshots</div>
              <span className="muted" style={{ fontSize: 12 }}>bundled with this APK</span>
            </div>
            <div className="info-card__body">
              {shotsOpen ?
              <div className="ov-shots">
                  {[1, 2, 3, 4].map((i) => <ScreenshotShot key={i} idx={i} label={app.name} />)}
                </div> :

              <button type="button" className="vd-shots-toggle" onClick={() => setShotsOpen(true)}>
                  <div className="vd-shots-toggle__icon"><Icon name="image" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Show screenshots</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Deferred to keep the page snappy — click to load.</div>
                  </div>
                  <Icon name="chevR" size={13} />
                </button>
              }
            </div>
          </div>
        </div>

        {/* RIGHT — Vulnerability scan */}
        <div className="stack" style={{ gap: 16 }}>
          {counts &&
          <div className="info-card">
              <div className="info-card__head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
                  <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="shield" size={14} /> Vulnerability scan
                  </div>
                  {scanMeta && <Badge tone={scanMeta.tone} dot>{scanMeta.label}</Badge>}
                </div>
                <span className="muted" style={{ fontSize: 12 }}>Last run · {fmtDate(version.uploadedAt)}</span>
              </div>
              <div className="info-card__body" data-comment-anchor="1c1972717e-div-142-15">
                {/* Headline total */}
                <div className="vd-scan-head">
                  <span className="vd-scan-head__num" style={{ color: highPlus > 0 ? 'var(--color-error-700)' : 'var(--color-text-primary)' }}>{totalFindings}</span>
                  <span className="vd-scan-head__lbl">total finding{totalFindings === 1 ? '' : 's'}{highPlus > 0 && <> · <span style={{ color: 'var(--color-error-700)', fontWeight: 500 }}>{highPlus} high/critical</span></>}</span>
                </div>
                {/* Stacked distribution bar */}
                <div className="vd-scan-bar">
                  {['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                  const v = counts[k] || 0;
                  if (!v) return null;
                  return <div key={k} title={`${v} ${window.SEVERITY[k].label}`} style={{ flex: v, background: window.SEVERITY[k].color }} />;
                })}
                  {totalFindings === 0 && <div style={{ flex: 1, background: 'var(--color-success-500, oklch(62% 0.14 152))' }} />}
                </div>
                {/* Per-severity rows */}
                <div className="vd-sevlist">
                  {Object.entries(counts).map(([k, v]) => {
                  const clickable = v > 0;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`vd-sevrow${clickable ? ' is-clickable' : ''}`}
                      disabled={!clickable}
                      onClick={() => clickable && setOpenSev(k)}
                      title={clickable ? `View ${v} ${window.SEVERITY[k].label} finding${v === 1 ? '' : 's'}` : `No ${window.SEVERITY[k].label} findings`}>
                      <span className="vd-sevrow__dot" style={{ background: window.SEVERITY[k].color }} />
                      <span className="vd-sevrow__label">{window.SEVERITY[k].label}</span>
                      <span className="vd-sevrow__val" style={{ color: clickable ? window.SEVERITY[k].color : 'var(--color-text-tertiary)' }}>{v}</span>
                      <Icon name="chevR" size={12} className="vd-sevrow__go" style={{ opacity: clickable ? undefined : 0 }} />
                    </button>
                  );
                })}
                </div>
                {totalFindings === 0 &&
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success-700, oklch(45% 0.12 152))' }}>
                  <Icon name="check" size={12} /> Scan completed with no findings.
                </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      {/* Per-severity findings drawer — opened by clicking a severity tile */}
      {openSev && counts && window.Modal &&
      (() => {
        const sev = window.SEVERITY[openSev];
        const list = vdFindingsFor(openSev, counts[openSev] || 0);
        return (
          <window.Modal open onClose={() => setOpenSev(null)} width={620}
            padding={0}
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: sev.color }} />
                {sev.label} findings
              </span>
            }
            subtitle={<>{(counts[openSev] || 0)} {sev.label.toLowerCase()}-severity finding{(counts[openSev] || 0) === 1 ? '' : 's'} in <span style={{ fontFamily: 'var(--font-family-mono)' }}>{app.name} {version.name}</span></>}
            footer={
              <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                Generated by the static scan at upload · <span style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtDate(version.uploadedAt)}</span>
              </div>
            }>
            {list.length === 0 ?
            <div className="muted" style={{ padding: 24, fontSize: 14 }}>No findings recorded at this severity.</div> :
            list.map((f, i) =>
            <div key={f.id} className="vd-finding" style={{ borderBottom: i < list.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div className="vd-finding__head">
                  <span className="vd-finding__id" style={{ color: sev.color, borderColor: sev.color }}>{f.id}</span>
                  <span className="vd-finding__title">{f.title}</span>
                </div>
                <div className="vd-finding__meta">
                  <span>Component <code>{f.component}</code></span>
                  {f.cwe && f.cwe !== '—' && <span>· {f.cwe}</span>}
                </div>
                <p className="vd-finding__detail">{f.detail}</p>
              </div>
            )}
          </window.Modal>);

      })()
      }

      <style>{`
        .vd-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
        @media (max-width: 980px) { .vd-grid { grid-template-columns: 1fr; } }
        .vd-kvgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 16px; column-gap: 24px; }
        @media (max-width: 1100px) { .vd-kvgrid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) { .vd-kvgrid { grid-template-columns: 1fr; } }
        .vd-kv { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .vd-kv__label { font: 500 12px var(--font-family-sans); color: var(--color-text-tertiary); }
        .vd-kv__value { font-size: 14px; color: var(--color-text-primary); min-width: 0; word-break: break-word; }
        /* Vulnerability scan (right column) */
        .vd-scan-head { display: flex; align-items: baseline; gap: 8px; }
        .vd-scan-head__num { font: 600 28px var(--font-family-mono); letter-spacing: -0.02em; }
        .vd-scan-head__lbl { font-size: 12px; color: var(--color-text-secondary); }
        .vd-scan-bar { margin: 12px 0 4px; display: flex; height: 7px; border-radius: 999px; overflow: hidden; background: var(--color-bg-3); }
        .vd-sevlist { margin-top: 8px; display: flex; flex-direction: column; }
        .vd-sevrow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font-family: inherit; padding: 9px 6px; border: 0; border-bottom: 1px solid var(--color-border-subtle); background: transparent; cursor: default; border-radius: 6px; transition: background 0.12s; }
        .vd-sevrow:last-child { border-bottom: 0; }
        .vd-sevrow.is-clickable { cursor: pointer; }
        .vd-sevrow.is-clickable:hover { background: var(--color-bg-hover, var(--color-bg-3)); }
        .vd-sevrow:not(.is-clickable) { opacity: 0.55; }
        .vd-sevrow__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .vd-sevrow__label { flex: 1; font: 500 11px var(--font-family-sans); color: var(--color-text-secondary); letter-spacing: 0.06em; text-transform: uppercase; }
        .vd-sevrow__val { font: 600 15px var(--font-family-mono); letter-spacing: -0.01em; }
        .vd-sevrow__go { color: var(--color-text-tertiary); opacity: 0; transition: opacity 0.12s; flex: none; }
        .vd-sevrow.is-clickable:hover .vd-sevrow__go { opacity: 1; }
        .vd-perms-link { display: inline-flex; align-items: center; gap: 4px; padding: 1px 4px; margin: 0 -4px; border: 0; background: transparent; font: inherit; font-size: 14px; color: var(--color-primary-700); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; font-weight: 500; }
        .vd-perms-link:hover { color: var(--color-primary-800, var(--color-primary-700)); }
        .vd-finding { padding: 14px 18px; }
        .vd-finding__head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .vd-finding__id { font: 500 11px var(--font-family-mono); padding: 1px 6px; border-radius: 4px; border: 1px solid; background: var(--color-bg-2); white-space: nowrap; }
        .vd-finding__title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .vd-finding__meta { margin-top: 6px; font-size: 12px; color: var(--color-text-tertiary); display: flex; gap: 6px; flex-wrap: wrap; }
        .vd-finding__meta code { font-family: var(--font-family-mono); font-size: 12px; padding: 1px 5px; background: var(--color-bg-3); border-radius: 4px; border: 1px solid var(--color-border-subtle); }
        .vd-finding__detail { margin: 8px 0 0; font-size: 12px; line-height: 1.55; color: var(--color-text-secondary); }
        .vd-shots-toggle { display: flex; align-items: center; gap: 12px; width: 100%; padding: 20px 14px; border: 1px dashed var(--color-border-default); border-radius: 8px; background: var(--color-bg-3); cursor: pointer; transition: background 0.12s, border-color 0.12s; color: var(--color-text-secondary); }
        .vd-shots-toggle:hover { background: var(--color-bg-2); border-color: var(--color-border-strong); }
        .vd-shots-toggle__icon { width: 36px; height: 36px; border-radius: 8px; background: var(--color-bg-2); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; color: var(--color-text-tertiary); flex: none; }
      `}</style>
    </div>);

};

window.VersionDetail = VersionDetail;