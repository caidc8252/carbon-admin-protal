/* global React, Btn, Input, Icon, Badge, AppIcon, AppStatusPill, fmtDate, fmtDateTime */
// ─────────────────────────────────────────────────────────────
// Version Detail — admin view of one APK version.
// Layout mirrors the customer portal's VersionDetailScreen:
//   Left:  Build metadata · Release notes · Screenshots
//   Right: Vulnerability scan
// The admin top-bar (back button + det-header with breadcrumb / status pills)
// stays as-is — admin doesn't expose publish/unpublish so only a passive
// "Download APK" sits in the header.
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

// VDKv — matches the published-apps version detail's KV row:
// baseline-aligned flex row, 150px label, dashed bottom border.
const VDKv = ({ label, value }) =>
<div className="vd-kvrow">
    <div className="vd-kvrow__label">{label}</div>
    <div className="vd-kvrow__value">{value}</div>
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
{ name: 'android.permission.INTERNET', level: 'normal', purpose: 'Sync orders & transactions with the back office' },
{ name: 'android.permission.ACCESS_NETWORK_STATE', level: 'normal', purpose: 'Detect connectivity to choose online vs offline payment flow' },
{ name: 'android.permission.BLUETOOTH_CONNECT', level: 'dangerous', purpose: 'Pair with external pinpads and BLE printers' },
{ name: 'android.permission.BLUETOOTH_SCAN', level: 'dangerous', purpose: 'Discover nearby BLE peripherals during pairing' },
{ name: 'android.permission.NFC', level: 'normal', purpose: 'Contactless card reads on the integrated NFC reader' },
{ name: 'android.permission.USE_BIOMETRIC', level: 'normal', purpose: 'Manager fingerprint approval for void / refund' },
{ name: 'android.permission.CAMERA', level: 'dangerous', purpose: 'Scan QR codes for catalog lookup & wallet payments' },
{ name: 'android.permission.ACCESS_FINE_LOCATION', level: 'dangerous', purpose: 'Tag each transaction with terminal GPS for fraud rules' },
{ name: 'android.permission.RECEIVE_BOOT_COMPLETED', level: 'normal', purpose: 'Auto-start the POS service after a power cycle' },
{ name: 'android.permission.WAKE_LOCK', level: 'normal', purpose: 'Keep the screen on during a customer signature' },
{ name: 'android.permission.FOREGROUND_SERVICE', level: 'normal', purpose: 'Run the offline transaction queue in the foreground' },
{ name: 'android.permission.POST_NOTIFICATIONS', level: 'normal', purpose: 'Show payment confirmation & pending-sync alerts' },
{ name: 'android.permission.READ_PHONE_STATE', level: 'dangerous', purpose: 'Pull the IMEI for cellular-aware terminal pairing' },
{ name: 'android.permission.SYSTEM_ALERT_WINDOW', level: 'signature', purpose: 'Show the lockdown overlay during a remote update' },
{ name: 'android.permission.WRITE_EXTERNAL_STORAGE', level: 'dangerous', purpose: 'Export daily summary CSV to /sdcard/exports' },
{ name: 'android.permission.READ_EXTERNAL_STORAGE', level: 'dangerous', purpose: 'Import the merchant logo for printed receipts' },
{ name: 'android.permission.MANAGE_EXTERNAL_STORAGE', level: 'signature', purpose: 'Maintain the encrypted transaction journal in /sdcard' },
{ name: 'android.permission.BIND_DEVICE_ADMIN', level: 'signature', purpose: 'Enforce screen-timeout & kiosk-mode device policies' }];


const vdPermColor = (lvl) => lvl === 'dangerous' ? 'var(--color-warning-700)' :
lvl === 'signature' ? 'var(--color-primary-700)' :
'var(--color-text-tertiary)';

// ─── Vulnerability findings ──────────────────────────────────
// The scanner reports COUNTS per severity (window.severityCounts). To let a
// reviewer drill into a severity, we expand each count into concrete finding
// rows drawn deterministically from a per-severity template pool — so the
// same (version, severity) always yields the same findings.
const VD_FINDINGS_POOL = {
  critical: [
  { id: 'CVE-2025-30412', title: 'Hardcoded AES key in transaction journal', component: 'libpaycore.so', detail: 'A static 256-bit key is embedded in the native library and used to encrypt the local transaction journal. Recovering the key from the APK allows offline decryption of cardholder data.', cwe: 'CWE-321' },
  { id: 'CVE-2025-28190', title: 'Unauthenticated debug service on TCP 9333', component: 'DebugBridgeService', detail: 'A diagnostic socket binds to 0.0.0.0 and accepts shell-like commands without authentication when the device is on the same LAN.', cwe: 'CWE-306' }],

  high: [
  { id: 'CVE-2025-21877', title: 'Cleartext HTTP fallback for catalog sync', component: 'CatalogSyncWorker', detail: 'When TLS negotiation fails the client retries over plain HTTP, exposing API tokens to network observers.', cwe: 'CWE-319' },
  { id: 'CVE-2024-49901', title: 'Improper certificate validation', component: 'OkHttpClientFactory', detail: 'A custom TrustManager accepts any server certificate, defeating pinning and enabling MITM on payment endpoints.', cwe: 'CWE-295' },
  { id: 'GHSA-7x4m-2q9c', title: 'WebView JavaScript bridge exposed to remote content', component: 'PromoWebView', detail: 'addJavascriptInterface is reachable from externally-loaded promo pages, allowing native method invocation.', cwe: 'CWE-749' }],

  medium: [
  { id: 'CWE-312', title: 'Sensitive data written to logcat', component: 'PaymentLogger', detail: 'PAN-adjacent metadata and auth codes are logged at DEBUG level and remain in logcat on production builds.', cwe: 'CWE-312' },
  { id: 'CWE-200', title: 'Exported activity leaks order intent extras', component: 'OrderDetailActivity', detail: 'An exported activity returns order totals via setResult to any app that starts it.', cwe: 'CWE-200' },
  { id: 'CWE-330', title: 'Weak PRNG for idempotency keys', component: 'IdempotencyKeyGen', detail: 'java.util.Random seeds idempotency tokens, making them predictable across restarts.', cwe: 'CWE-330' },
  { id: 'CWE-530', title: 'Backup allows extraction of shared prefs', component: 'AndroidManifest.xml', detail: 'android:allowBackup="true" permits adb backup of preferences containing the cached session token.', cwe: 'CWE-530' },
  { id: 'CWE-925', title: 'Implicit broadcast for refund events', component: 'RefundBroadcaster', detail: 'Refund completion is announced via an implicit broadcast any app can receive.', cwe: 'CWE-925' }],

  low: [
  { id: 'CWE-326', title: 'Obsolete TLS 1.0 ciphers permitted', component: 'NetworkSecurityConfig', detail: 'The network security config still allows TLS 1.0 for one legacy host.', cwe: 'CWE-326' },
  { id: 'CWE-489', title: 'Debuggable flag present in a build variant', component: 'build.gradle', detail: 'A staging variant ships with android:debuggable, which could reach production if mis-tagged.', cwe: 'CWE-489' },
  { id: 'CWE-209', title: 'Verbose stack traces shown to user', component: 'GlobalErrorHandler', detail: 'Uncaught exceptions render full stack traces in a dialog, leaking class and method names.', cwe: 'CWE-209' },
  { id: 'CWE-354', title: 'Missing integrity check on OTA payload', component: 'OtaInstaller', detail: 'OTA payloads are size-checked but not hash-verified before staging.', cwe: 'CWE-354' },
  { id: 'CWE-1021', title: 'Tap-jacking possible on PIN entry', component: 'PinPadView', detail: 'filterTouchesWhenObscured is not set on the PIN entry surface.', cwe: 'CWE-1021' },
  { id: 'CWE-200b', title: 'Screenshot allowed on receipt screen', component: 'ReceiptActivity', detail: 'FLAG_SECURE is not applied, so receipts with partial PAN can be screenshotted.', cwe: 'CWE-200' }],

  info: [
  { id: 'INFO-001', title: 'Third-party SDK with known telemetry', component: 'analytics-sdk 4.2', detail: 'An analytics SDK collects coarse device identifiers. No action required; documented for review.', cwe: '—' },
  { id: 'INFO-002', title: 'Unused permission declared', component: 'AndroidManifest.xml', detail: 'CAMERA is declared but no call site was found. Consider removing to reduce the manifest surface.', cwe: '—' },
  { id: 'INFO-003', title: 'Minified without source maps', component: 'R8 / ProGuard', detail: 'Release build is minified; no mapping file was bundled (expected for production).', cwe: '—' },
  { id: 'INFO-004', title: 'Large native library increases APK size', component: 'libimageproc.so', detail: 'A 9 MB native lib dominates APK size. Informational only.', cwe: '—' }]

};

// Expand a count into the first N template rows for that severity.
const vdFindingsFor = (sevKey, count) => (VD_FINDINGS_POOL[sevKey] || []).slice(0, count || 0);

const VDPermissionsLink = ({ count, pkg }) => {
  const [open, setOpen] = useStateVD(false);
  const n = count || 0;
  const permissions = VD_PERMISSIONS.slice(0, n);
  const dangerousCount = permissions.filter((p) => p.level === 'dangerous').length;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" className="vd-perms-link" onClick={() => setOpen(true)}>
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>{n}</span> declared
      </button>
      {dangerousCount > 0 &&
      <span className="muted" style={{ fontSize: 11.5, color: 'var(--color-warning-700)' }}>
          (<span style={{ fontFamily: 'var(--font-family-mono)' }}>{dangerousCount}</span> dangerous)
        </span>
      }
      {open && window.Modal &&
      <window.Modal open onClose={() => setOpen(false)} width={520}
      title="Declared permissions"
      subtitle={<>Parsed from <span style={{ fontFamily: 'var(--font-family-mono)' }}>AndroidManifest.xml</span>{pkg ? <> · {pkg}</> : null}</>}
      padding={0}
      footer={
      <div style={{ flex: 1, fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
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
              <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5, fontWeight: 500, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 2, lineHeight: 1.45 }}>
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
  const [findingsOpen, setFindingsOpen] = useStateVD(false);

  // Flatten the per-severity finding pool down to the (severity, finding)
  // rows the current scan COUNTS support — so the unified findings modal
  // shows everything across severities, ordered worst → least.
  const allFindings = useMemoVD(() => {
    if (!counts) return [];
    return ['critical', 'high', 'medium', 'low', 'info'].flatMap((sev) =>
    vdFindingsFor(sev, counts[sev] || 0).map((f) => ({ ...f, sev }))
    );
  }, [counts]);

  // Total / high-plus counts — used by the scan card.
  if (!version) {
    return (
      <div className="page">
        <div className="empty">Version not found. <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to app</a></div>
      </div>);

  }

  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel={`Back to ${app.name} · Versions`}
        icon={<AppIcon app={app} size={48} />}
        eyebrow={<button type="button" className="ad-pub-link" onClick={() => onOpenApp(app.id)} style={{ fontSize: 13 }}>{app.name}</button>}
        title={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.name}</span>}
        badges={<><Badge tone={vst.tone} dot>{vst.label}</Badge>{version.current && <Badge tone="info" dot>Current</Badge>}</>}
        meta={<code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '1px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>{app.package}</code>}
        actions={<Btn variant="secondary" icon="download">Download APK</Btn>}
      />

      <div className="vd-grid" style={{ marginTop: 18 }}>
        {/* LEFT — main content */}
        <div className="stack" style={{ gap: 16 }}>
          {/* Build metadata — 2-col KV grid, mirrors the customer portal */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Build metadata</div>
            </div>
            <div className="info-card__body" data-comment-anchor="7682d4ebde-div-113-13">
              <div className="vd-kvgrid" data-comment-anchor="e7b6df3a70-div-114-15">
                <VDKv label="Version name" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.name}</span>} />
                <VDKv label="Version code" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.code}</span>} />
                <VDKv label="APK size" value={version.size} />
                <VDKv label="Permissions" value={<VDPermissionsLink count={version.perms || 0} pkg={app.package} />} />
                <VDKv label="Uploaded" value={<>{fmtDate(version.uploadedAt)}{version.uploadedBy && <span className="muted"> · by {version.uploadedBy}</span>}</>} />
                <VDKv label="Published" value={version.publishedAt ? fmtDate(version.publishedAt) : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>} />
                {app.signer && <VDKv label="Signing cert" value={<span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>{app.signer}</span>} />}
              </div>
            </div>
          </div>

          {/* Release notes */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Release notes</div>
            </div>
            <div className="info-card__body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
                {version.notes || 'No release notes.'}
              </p>
            </div>
          </div>

          {/* Screenshots — deferred behind a click so the page loads quickly */}
          <div className="info-card">
            <div className="info-card__head" data-comment-anchor="77d4a225ca-div-188-13">
              <div className="info-card__title">Screenshots</div>
              <span className="muted" style={{ fontSize: 11.5 }}>bundled with this APK</span>
            </div>
            <div className="info-card__body">
              {shotsOpen ?
              <div className="ov-shots">
                  {[1, 2, 3, 4].map((i) => <ScreenshotShot key={i} idx={i} label={app.name} />)}
                </div> :

              <button type="button" className="vd-shots-toggle" onClick={() => setShotsOpen(true)}>
                  <div className="vd-shots-toggle__icon"><Icon name="image" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Show screenshots</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Deferred to keep the page snappy — click to load.</div>
                  </div>
                  <Icon name="chevR" size={13} />
                </button>
              }
            </div>
          </div>
        </div>

        {/* RIGHT — Vulnerability scan (styled to match the customer portal's
              app-publish version detail). */}
        <div className="stack" style={{ gap: 16 }}>
          {counts &&
          <div className="info-card">
              <div className="info-card__head" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Icon name={highPlus > 0 ? 'shield' : 'shieldCheck'} size={14}
                style={{ color: highPlus > 0 ? 'var(--color-error-500, var(--error))' :
                  (counts.medium || 0) > 0 ? 'var(--color-info-500, var(--info))' :
                  'var(--color-success-500, var(--success))' }} />
                  Vulnerability scan
                </div>
                <span className="muted" style={{ fontSize: 11.5 }}>Last run · {fmtDate(version.uploadedAt)}</span>
              </div>
              <div className="info-card__body" data-comment-anchor="1c1972717e-div-142-15" style={{ padding: 0 }}>
                {/* Headline — total + status line */}
                <div className="vd-scan-head" data-comment-anchor="f9940aa6b5-div-317-17">
                  <div>
                    <div className="vd-scan-head__num" style={{ color: highPlus > 0 ? 'var(--color-error-700)' :
                    (counts.medium || 0) > 0 ? 'var(--color-text-primary)' :
                    totalFindings === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }}>
                      {totalFindings}
                    </div>
                    <div className="vd-scan-head__lbl">total finding{totalFindings === 1 ? '' : 's'}</div>
                  </div>
                  <div className="vd-scan-head__status">
                    {totalFindings === 0 ?
                  <Badge tone="success" dot>Clean</Badge> :
                  highPlus > 0 ?
                  <Badge tone="error" dot>Action required</Badge> :
                  null
                  }
                  </div>
                </div>

                {/* Clickable stacked distribution bar — each segment opens findings filtered to its severity */}
                <div className="vd-scan-bar vd-scan-bar--clickable">
                  {['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                  const v = counts[k] || 0;
                  if (!v) return null;
                  const meta = window.SEVERITY[k] || { label: k, color: 'var(--color-text-tertiary)' };
                  return (
                    <button
                      key={k}
                      type="button"
                      className="vd-scan-bar__seg"
                      title={`${v} ${meta.label} — click to view`}
                      onClick={() => setFindingsOpen(k)}
                      style={{ flex: v, background: meta.color }}>
                      </button>);
                })}
                  {totalFindings === 0 && <div style={{ flex: 1, background: 'color-mix(in oklab, var(--color-success-500) 65%, transparent)' }} />}
                </div>

                {/* Per-severity rows — clickable when count > 0, drills into the modal pre-filtered */}
                <div className="vd-sevlist">
                  {['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                  const v = counts[k] || 0;
                  const meta = window.SEVERITY[k] || { label: k, color: 'var(--color-text-tertiary)' };
                  const clickable = v > 0;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`vd-sevrow${clickable ? ' is-clickable' : ' is-empty'}`}
                      disabled={!clickable}
                      onClick={() => clickable && setFindingsOpen(k)}
                      title={clickable ? `View ${v} ${meta.label} finding${v === 1 ? '' : 's'}` : `No ${meta.label} findings`}>
                        <span className="vd-sevrow__dot" style={{ background: meta.color }} />
                        <span className="vd-sevrow__label">{meta.label}</span>
                        <span className="vd-sevrow__val" style={{ color: clickable ? meta.color : 'var(--color-text-tertiary)' }}>{v}</span>
                        <Icon name="chevR" size={12} className="vd-sevrow__go" />
                      </button>);
                })}
                </div>

                {/* Footer — primary action: view all findings */}
                {totalFindings > 0 &&
              <button type="button" className="vd-scan-foot" onClick={() => setFindingsOpen(true)}>
                  <span>View all findings</span>
                  <Icon name="chevR" size={12} />
                </button>
              }

                {/* Critical/high callout */}
                {highPlus > 0 &&
              <div className="vd-scan-callout">
                  <Icon name="alert" size={12} />
                  <span><b>Action required.</b> Resolve {highPlus} critical/high finding{highPlus === 1 ? '' : 's'} or document an exception before publishing.</span>
                </div>
              }
              </div>
            </div>
          }
        </div>
      </div>

      {/* All-findings modal — opened by clicking a severity row, bar segment, or "View all findings" */}
      {findingsOpen && counts && window.Modal && (() => {
        const sevFilter = typeof findingsOpen === 'string' ? findingsOpen : null;
        const shownFindings = sevFilter ? allFindings.filter((f) => f.sev === sevFilter) : allFindings;
        const sevMeta = sevFilter ? window.SEVERITY[sevFilter] : null;
        return (
          <window.Modal open onClose={() => setFindingsOpen(false)} width={680}
          padding={0}
          title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="shield" size={14} />
              {sevFilter ? <>{sevMeta?.label || sevFilter} findings</> : <>Vulnerability findings</>}
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                — <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{app.name} {version.name}</span>
              </span>
            </span>
          }
          subtitle={shownFindings.length === 0 ? 'No findings at this severity.' : `${shownFindings.length} ${sevFilter ? (sevMeta?.label || sevFilter) + ' ' : ''}finding${shownFindings.length === 1 ? '' : 's'} from the latest scan run.`}
          footer={
          <div style={{ flex: 1, fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
              Generated by the static scan at upload · <span style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtDate(version.uploadedAt)}</span>
            </div>
          }>
          {/* Severity filter chips — let user pivot between subsets without closing the modal */}
          <div style={{ padding: '12px 18px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className={`vd-sevchip${!sevFilter ? ' is-active' : ''}`} onClick={() => setFindingsOpen(true)}>
              All <span style={{ fontFamily: 'var(--font-family-mono)', marginLeft: 4, opacity: 0.7 }}>{totalFindings}</span>
            </button>
            {['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                const v = counts[k] || 0;
                if (v === 0) return null;
                const meta = window.SEVERITY[k] || { label: k, color: 'var(--color-text-tertiary)' };
                const active = sevFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`vd-sevchip${active ? ' is-active' : ''}`}
                    onClick={() => setFindingsOpen(k)}
                    style={active ? { borderColor: meta.color, color: meta.color, background: `color-mix(in oklab, ${meta.color} 10%, transparent)` } : null}>
                  <span className="vd-sevchip__dot" style={{ background: meta.color }} />
                  {meta.label}
                  <span style={{ fontFamily: 'var(--font-family-mono)', marginLeft: 4, opacity: 0.7 }}>{v}</span>
                </button>);
              })}
          </div>
          {shownFindings.length > 0 ?
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: 12 }}>
              {shownFindings.map((f, i) => {
                const sev = window.SEVERITY[f.sev] || { label: f.sev, color: 'var(--color-text-tertiary)' };
                return (
                  <div key={f.id + i} className="vd-finding" style={{ borderBottom: i < shownFindings.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                    <div className="vd-finding__head">
                      <span className="vd-finding__id" style={{ color: sev.color, borderColor: sev.color }}>{sev.label}</span>
                      <span className="vd-finding__title">{f.title}</span>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{f.id}</span>
                    </div>
                    <div className="vd-finding__meta">
                      <span>Component <code>{f.component}</code></span>
                      {f.cwe && f.cwe !== '—' && <span>· {f.cwe}</span>}
                    </div>
                    <p className="vd-finding__detail">{f.detail}</p>
                  </div>);
              })}
            </div> :
            <div style={{ padding: '28px 18px', color: 'var(--color-text-tertiary)', fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--color-border-subtle)', marginTop: 12 }}>
              No findings at this severity.
            </div>
            }
        </window.Modal>);
      })()}

      <style>{`
        .vd-grid { display: grid; grid-template-columns: 1fr 320px; gap: 18px; align-items: start; }
        @media (max-width: 980px) { .vd-grid { grid-template-columns: 1fr; } }
        /* Build metadata — auto-collapse to 1 col when each KV would be too narrow.
           Mirrors the customer portal's 2-col layout at wider widths. */
        .vd-kvgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); row-gap: 0; column-gap: 36px; }
        .vd-kvrow { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--color-border-subtle); min-width: 0; }
        .vd-kvrow__label { width: 150px; flex-shrink: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .vd-kvrow__value { flex: 1; min-width: 0; font-size: 13px; font-weight: 450; color: var(--color-text-primary); overflow-wrap: anywhere; word-break: normal; }
        /* legacy alias (unused but kept for older anchors) */
        .vd-kv { display: contents; }
        .vd-kv__label { font: 500 11px var(--font-family-sans); color: var(--color-text-tertiary); letter-spacing: 0.06em; text-transform: uppercase; align-self: center; }
        .vd-kv__value { font-size: 13px; color: var(--color-text-primary); align-self: center; }
        /* Vulnerability scan — redesigned interactive card */
        .vd-scan-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 14px 16px 12px; }
        .vd-scan-head__num { font: 500 32px var(--font-family-mono); letter-spacing: -0.03em; line-height: 1; }
        .vd-scan-head__lbl { font-size: 11px; color: var(--color-text-tertiary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .vd-scan-head__status { padding-bottom: 2px; }
        .vd-scan-bar { display: flex; height: 6px; border-radius: 999px; overflow: hidden; background: var(--color-bg-3); margin: 0 16px; }
        .vd-scan-bar--clickable .vd-scan-bar__seg { border: 0; padding: 0; cursor: pointer; height: 100%; transition: filter 0.12s, transform 0.12s; transform-origin: center; }
        .vd-scan-bar--clickable .vd-scan-bar__seg:hover { filter: brightness(1.12); transform: scaleY(1.6); }
        .vd-sevlist { display: flex; flex-direction: column; margin-top: 6px; padding: 0 8px 4px; }
        .vd-sevrow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font-family: inherit; padding: 8px 8px; border: 0; background: transparent; border-radius: 6px; cursor: default; transition: background 0.12s; min-height: 32px; }
        .vd-sevrow.is-clickable { cursor: pointer; }
        .vd-sevrow.is-clickable:hover { background: var(--color-bg-hover, var(--color-bg-3)); }
        .vd-sevrow.is-clickable:focus-visible { outline: 2px solid var(--accent, var(--color-primary-700)); outline-offset: -2px; }
        .vd-sevrow.is-empty { opacity: 0.45; }
        .vd-sevrow__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .vd-sevrow__label { flex: 1; font-size: 12.5px; color: var(--color-text-secondary); }
        .vd-sevrow.is-clickable .vd-sevrow__label { color: var(--color-text-primary); font-weight: 450; }
        .vd-sevrow__val { font: 500 14px var(--font-family-mono); letter-spacing: -0.01em; min-width: 24px; text-align: right; }
        .vd-sevrow__go { color: var(--color-text-tertiary); opacity: 0; transition: opacity 0.12s, transform 0.12s; flex: none; }
        .vd-sevrow.is-clickable:hover .vd-sevrow__go { opacity: 1; transform: translateX(2px); }
        .vd-scan-foot { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; padding: 10px 12px; border: 0; border-top: 1px solid var(--color-border-subtle); background: transparent; color: var(--accent, var(--color-primary-700)); font: 500 12.5px var(--font-family-sans); cursor: pointer; transition: background 0.12s; }
        .vd-scan-foot:hover { background: var(--color-bg-hover, var(--color-bg-3)); }
        .vd-scan-foot:focus-visible { outline: 2px solid var(--accent, var(--color-primary-700)); outline-offset: -2px; }
        .vd-scan-callout { display: flex; align-items: flex-start; gap: 8px; margin: 0 12px 12px; padding: 9px 11px; background: color-mix(in oklab, var(--color-error-500) 8%, transparent); border: 1px solid color-mix(in oklab, var(--color-error-500) 25%, transparent); border-radius: var(--radius-md, 6px); font-size: 11.5px; color: var(--color-error-700); line-height: 1.5; }
        .vd-scan-callout svg { margin-top: 2px; flex: none; }
        /* Severity filter chips (in modal) */
        .vd-sevchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border: 1px solid var(--color-border-default); border-radius: 999px; background: var(--color-bg-2); font: 500 12px var(--font-family-sans); color: var(--color-text-secondary); cursor: pointer; transition: border-color 0.12s, background 0.12s, color 0.12s; }
        .vd-sevchip:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .vd-sevchip.is-active { border-color: var(--accent, var(--color-primary-700)); background: color-mix(in oklab, var(--accent, var(--color-primary-700)) 10%, transparent); color: var(--accent, var(--color-primary-700)); }
        .vd-sevchip__dot { width: 7px; height: 7px; border-radius: 50%; }
        /* Vulnerability scan — 5-tile severity grid (legacy, kept for any callers) */
        .vd-sevtiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .vd-sevtile { padding: 10px 12px; border-radius: 7px; border: 1px solid var(--color-border-subtle); border-left: 3px solid; min-width: 0; }
        .vd-sevtile__lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; color: var(--color-text-tertiary); }
        .vd-sevtile__num { font: 500 22px var(--font-family-mono); margin-top: 2px; letter-spacing: -0.02em; }
        .vd-scan-bar { display: flex; height: 6px; border-radius: 999px; overflow: hidden; background: var(--color-bg-3); }
        .vd-findings-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 6px 4px 8px; margin: -4px -6px -4px 0; border: 0; background: transparent; font: 500 12px var(--font-family-sans); color: var(--color-text-primary); cursor: pointer; border-radius: 6px; transition: background 0.12s; }
        .vd-findings-btn:hover { background: var(--color-bg-hover, var(--color-bg-3)); }
        .vd-perms-link { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; font: inherit; font-size: 13px; color: var(--accent, var(--color-primary-700)); cursor: pointer; font-weight: 500; text-decoration: underline; text-underline-offset: 2px; text-decoration-style: dotted; text-decoration-color: var(--color-border-default); }
        .vd-perms-link:hover { color: var(--color-primary-800, var(--color-primary-700)); text-decoration-color: currentColor; }
        /* Findings rows (modal) */
        .vd-finding { padding: 14px 18px; }
        .vd-finding__head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .vd-finding__id { font: 500 10px var(--font-family-sans); text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 999px; border: 1px solid; background: var(--color-bg-2); white-space: nowrap; }
        .vd-finding__title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); flex: 1; min-width: 0; }
        .vd-finding__meta { margin-top: 6px; font-size: 11.5px; color: var(--color-text-tertiary); display: flex; gap: 6px; flex-wrap: wrap; }
        .vd-finding__meta code { font-family: var(--font-family-mono); font-size: 11px; padding: 1px 5px; background: var(--color-bg-3); border-radius: 4px; border: 1px solid var(--color-border-subtle); }
        .vd-finding__detail { margin: 8px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--color-text-secondary); }
        .vd-shots-toggle { display: flex; align-items: center; gap: 12px; width: 100%; padding: 20px 14px; border: 1px dashed var(--color-border-default); border-radius: 10px; background: var(--color-bg-3); cursor: pointer; transition: background 0.12s, border-color 0.12s; color: var(--color-text-secondary); }
        .vd-shots-toggle:hover { background: var(--color-bg-2); border-color: var(--color-border-strong); }
        .vd-shots-toggle__icon { width: 36px; height: 36px; border-radius: 8px; background: var(--color-bg-2); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; color: var(--color-text-tertiary); flex: none; }
      `}</style>
    </div>);

};

window.VersionDetail = VersionDetail;