/* global React, Btn, Input, Icon, Badge, CompanyLogo, AppIcon, AppStatusPill, AppModePill, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// App Detail — admin view of one ISV-published app.
//
// READ-ONLY across the board: admin doesn't author or edit apps.
// 4 tabs: Overview · Versions · Subscribers · Activity
// ─────────────────────────────────────────────────────────────
const { useState: useStateAD, useMemo: useMemoAD } = React;

const ANDROID_API_LABEL = {
  21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1',
  28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14',
  35: '15'
};
const androidLabel = (api) => ANDROID_API_LABEL[api] ? `Android ${ANDROID_API_LABEL[api]}` : `API ${api}`;

const SCAN_META = {
  clean: { tone: 'success', label: 'Clean', sub: 'No findings' },
  dirty: { tone: 'warning', label: 'Findings', sub: 'Review before deploying' }
};

// ─── Overview tab ─────────────────────────────────────────
// Mirrors the ISV portal's AppOverview shape:
//   Left:  About (description + Published-by + metadata) · Screenshots
//   Right: Latest version (vertical KV + release notes + scan)
const OverviewKV = ({ label, value, sub }) =>
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '7px 0' }}>
    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>;


const ScreenshotPlaceholder = ({ label, idx }) =>
<div className="ov-shot">
    <div className="ov-shot__chrome">
      <span /><span /><span />
    </div>
    <div className="ov-shot__body">
      <Icon name="image" size={22} />
      <div className="ov-shot__label">{label} · {idx}</div>
    </div>
  </div>;


const TabAppOverview = ({ app, publisher, onOpenPublisher, onOpenVersion }) => {
  const latest = app.versions.find((v) => v.current) || app.versions[0];
  const reach = latest?.reach || 0;
  const scanMeta = latest?.scan ? SCAN_META[latest.scan] : null;
  const counts = window.severityCounts(latest);
  const totalFindings = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  // Screenshots are collapsed by default on this read-only detail page —
  // operator expands them on demand to keep the overview compact.
  const [shotsOpen, setShotsOpen] = useStateAD(false);

  return (
    <div className="ad-grid">
      {/* LEFT — narrative */}
      <div className="stack" style={{ gap: 24 }}>
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">About</div>
          </div>
          <div className="info-card__body">
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
              {app.description}
            </p>
            {publisher &&
            <div className="ad-pubrow">
                <span className="muted" style={{ fontSize: 12 }}>Published by</span>
                <button type="button" className="ad-pub-link" onClick={() => onOpenPublisher(publisher.id)}>
                  {publisher.name}
                  <Icon name="link" size={11} />
                </button>
              </div>
            }
            <div className="kv2-wrap" style={{ marginTop: 18 }}>
            <dl className="kv2">
              <div className="kv2__row"><dt>Category</dt><dd>{app.category}</dd></div>
              <div className="kv2__row"><dt>Package</dt>
              <dd>
                <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '2px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
                  {app.package}
                </code>
              </dd></div>
              <div className="kv2__row"><dt>Supported devices</dt>
              <dd>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {app.devices.map((d) =>
                  <span key={d} className="ad-chip">{d}</span>
                  )}
                </div>
              </dd></div>
              <div className="kv2__row"><dt>Orientations</dt>
              <dd style={{ textTransform: 'capitalize' }}>{(app.orientations || ['portrait']).join(' · ')}</dd></div>
              {app.signer && <div className="kv2__row"><dt>Signer</dt>
                <dd style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{app.signer}</dd>
              </div>}
            </dl>
            </div>
          </div>
        </div>

        {/* Screenshots placeholder — bundled with the latest APK */}
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">Screenshots</div>
            {latest &&
            <span className="muted" style={{ fontSize: 12 }}>
                from <span style={{ fontFamily: 'var(--font-family-mono)' }}>{latest.name}</span> · captured at upload
              </span>
            }
          </div>
          <div className="info-card__body">
            {latest ?
            (shotsOpen ?
              <div className="ov-shots">
                {[1, 2, 3, 4].map((i) => <ScreenshotPlaceholder key={i} idx={i} label={app.name} />)}
              </div> :

              <button type="button" className="vd-shots-toggle" onClick={() => setShotsOpen(true)}>
                <div className="vd-shots-toggle__icon"><Icon name="image" size={16} /></div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Show screenshots</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Deferred to keep the page snappy — click to load.</div>
                </div>
                <Icon name="chevR" size={13} />
              </button>
            ) :

            <div className="muted" style={{ fontSize: 14 }}>No version uploaded — screenshots will appear once an APK is published.</div>
            }
          </div>
        </div>
      </div>

      {/* RIGHT — Latest version snapshot */}
      <div className="stack" style={{ gap: 24 }}>
        {latest ?
        <div className="info-card">
            <div className="info-card__head">
              <div>
                <div className="info-card__title">Latest version</div>
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{latest.name}</div>
              </div>
              {onOpenVersion &&
              <Btn size="sm" variant="ghost" iconRight="arrowR" onClick={() => onOpenVersion(latest.id)}>
                Details
              </Btn>
              }
            </div>
            <div className="info-card__body">
              <div className="ov-statgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 16px' }}>
                <OverviewKV label="Version"
              value={<span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{latest.name}</span>}
              sub={<span style={{ fontFamily: 'var(--font-family-mono)' }}>code {latest.code}</span>} />
                <OverviewKV label="Size"
              value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{latest.size}</span>} />
                <OverviewKV label="Reach"
              value={<span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{reach}</span>}
              sub="ISO subscribers" />
              </div>

              <div className="ov-divider" />
              <div className="ov-section-label">Release notes</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {latest.notes || 'No release notes.'}
              </p>

              {counts &&
            <>
                  <div className="ov-divider" />
                  <div className="ov-section-label">Vulnerability scan</div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--color-bg-3)' }}>
                    {['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                  const v = counts[k] || 0;
                  if (!v) return null;
                  return <div key={k} title={`${v} ${window.SEVERITY[k].label}`} style={{ flex: v, background: window.SEVERITY[k].color }} />;
                })}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }} data-comment-anchor="60ecfae32a-div-168-19">
                    {totalFindings === 0 ?
                <Badge tone="success" dot>No findings</Badge> :
                ['critical', 'high', 'medium', 'low', 'info'].map((k) => {
                  const v = counts[k] || 0;
                  if (!v) return null;
                  return (
                    <Badge key={k} tone={window.SEVERITY[k].tone}>
                              <span style={{ fontFamily: 'var(--font-family-mono)', marginRight: 3 }}>{v}</span>
                              {window.SEVERITY[k].label}
                            </Badge>);

                })}
                    {scanMeta && <Badge tone={scanMeta.tone} dot>{scanMeta.label}</Badge>}
                  </div>
                </>
            }

              {scanMeta && null}
            </div>
          </div> :

        <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">No versions yet</div>
            </div>
            <div className="info-card__body">
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                Once the publisher uploads a signed APK, the parsed manifest, security scan, and store screenshots will appear here.
              </div>
            </div>
          </div>
        }
      </div>
    </div>);

};

// ─── Versions tab ─────────────────────────────────────────
// Columns mirror the ISV portal: Version · Code · Size · Uploaded ·
// Published · Scan · Status.
const ScanCell = ({ version }) => {
  const counts = window.severityCounts(version);
  if (!counts) return <span className="muted" style={{ fontSize: 12 }}>—</span>;
  const order = ['critical', 'high', 'medium', 'low', 'info'];
  const total = order.reduce((a, k) => a + (counts[k] || 0), 0);
  const highPlus = (counts.critical || 0) + (counts.high || 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', width: 64, height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--color-bg-3)' }}>
        {order.map((k) => {
          const v = counts[k] || 0;
          if (!v) return null;
          return <div key={k} title={`${v} ${window.SEVERITY[k].label}`} style={{ flex: v, background: window.SEVERITY[k].color }} />;
        })}
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {highPlus > 0 &&
        <span style={{ color: 'var(--color-error-700)', fontWeight: 500, marginRight: 4 }}>{highPlus} high+</span>
        }
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>{total}</span> total
      </span>
    </div>);

};

const TabAppVersions = ({ app, onOpenVersion }) => {
  const versions = app.versions || [];
  if (versions.length === 0) {
    return <div className="empty">No versions uploaded yet for this app.</div>;
  }
  return (
    <div className="table-card">
      <table className="tds-table">
        <thead>
          <tr>
            <th style={{ width: '14%' }}>Version</th>
            <th style={{ width: '9%' }}>Code</th>
            <th style={{ width: '10%' }}>Size</th>
            <th style={{ width: '13%' }}>Uploaded</th>
            <th style={{ width: '13%' }}>Published</th>
            <th style={{ width: '22%' }}>Scan</th>
            <th data-comment-anchor="6554b79f00-th-254-13">Status</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const status = window.APP_VERSION_TONE[v.status] || { label: v.status, tone: 'neutral' };
            return (
              <tr key={v.id} onClick={() => onOpenVersion && onOpenVersion(v.id)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 500 }}>{v.name}</span>
                    {v.current && <Badge tone="info" dot>Current</Badge>}
                  </div>
                </td>
                <td><span className="num muted" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{v.code}</span></td>
                <td><span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{v.size}</span></td>
                <td><span style={{ fontSize: 12 }}>{fmtDate(v.uploadedAt)}</span></td>
                <td>{v.publishedAt ? <span style={{ fontSize: 12 }}>{fmtDate(v.publishedAt)}</span> : <span className="muted">—</span>}</td>
                <td><ScanCell version={v} /></td>
                <td><Badge tone={status.tone} dot>{status.label}</Badge></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="iconbtn" onClick={(e) => {e.stopPropagation();onOpenVersion && onOpenVersion(v.id);}}>
                    <Icon name="chevR" size={14} />
                  </button>
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

};

// ─── Subscribers tab ──────────────────────────────────────
// Mirrors the ISV portal's Subscribers list:
// ISO company · Country/region · Current version · Subscribed · Status
const TabAppSubscribers = ({ app, onOpenSubscriber }) => {
  const subscriptions = useMemoAD(() => window.getAppSubscriptions(app), [app]);
  const latest = app.versions.find((v) => v.current) || app.versions[0];
  if (subscriptions.length === 0) {
    return <div className="empty">No ISOs have subscribed to this app yet.</div>;
  }
  return (
    <div className="table-card">
      <table className="tds-table">
        <thead>
          <tr>
            <th style={{ width: '34%' }}>ISO company</th>
            <th style={{ width: '18%' }}>Country / region</th>
            <th style={{ width: '20%' }}>Current version</th>
            <th style={{ width: '14%' }}>Subscribed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((s) => {
            const behind = !!(s.subscribedVersion && latest && s.subscribedVersion.id !== latest.id);
            return (
              <tr key={s.customerId} onClick={() => onOpenSubscriber(s.customerId)}>
                <td>
                  <div className="al-app">
                    <CompanyLogo name={s.customer.name} />
                    <div style={{ minWidth: 0 }}>
                      <div className="al-app__name">{s.customer.name}</div>
                      <div className="al-app__pkg" style={{ fontFamily: 'inherit' }}>
                        {s.customer.contracts.map((k) => k.kind).join(' · ')}
                      </div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontSize: 14 }}>{s.customer.country}</span></td>
                <td>
                  {s.subscribedVersion ?
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, fontWeight: 500, color: behind ? 'var(--color-warning-700)' : 'var(--color-text-primary)' }}>
                        {s.subscribedVersion.name}
                      </span>
                      {behind && latest ?
                    <span style={{ fontSize: 12, color: 'var(--color-warning-700)' }}>
                          ↑ <span style={{ fontFamily: 'var(--font-family-mono)' }}>{latest.name}</span> available
                        </span> :
                    null}
                    </div> :

                  <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>—</span>
                  }
                </td>
                <td><span style={{ fontSize: 12 }}>{relTime(s.subscribedAt)}</span></td>
                <td><Badge tone={s.status.tone} dot>{s.status.label}</Badge></td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

};

// ─── Activity tab ─────────────────────────────────────────
const ACTIVITY_TONE = {
  'created': { tone: 'success', label: 'Created' },
  'version-uploaded': { tone: 'info', label: 'Version uploaded' },
  'version-published': { tone: 'success', label: 'Version published' },
  'version-unpublished': { tone: 'warning', label: 'Version unpublished' },
  'published': { tone: 'success', label: 'App published' },
  'unpublished': { tone: 'warning', label: 'App unpublished' },
  'mode-changed': { tone: 'info', label: 'Mode changed' }
};

const TabAppActivity = ({ app }) => {
  const events = useMemoAD(() => window.buildAppActivity(app), [app]);
  return (
    <div className="info-card">
      <div className="info-card__head">
        <div className="info-card__title">Activity timeline</div>
        <span className="muted" style={{ fontSize: 12 }}>{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="info-card__body">
        <div className="timeline">
          {events.map((e, i) => {
            const meta = ACTIVITY_TONE[e.kind] || { tone: 'neutral', label: e.kind };
            return (
              <div key={i} className="tl-row">
                <div className={`tl-row__dot tl-row__dot--${meta.tone}`}></div>
                <div className="tl-row__title">
                  <Badge tone={meta.tone} dot>{meta.label}</Badge>
                  <span style={{ marginLeft: 8 }}>{e.text}</span>
                </div>
                <div className="tl-row__meta">
                  <span>{fmtDateTime(e.at)}</span>
                  <span>·</span>
                  <span>by <strong style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{e.actor}</strong></span>
                </div>
              </div>);

          })}
        </div>
      </div>
    </div>);

};

// ─── Detail shell ─────────────────────────────────────────
const AppDetail = ({ app, initialTab, onBack, onOpenPublisher, onOpenSubscriber, onOpenVersion }) => {
  const [tab, setTab] = useStateAD(initialTab || 'overview');
  const publisher = window.getAppPublisher(app);
  const latest = app.versions.find((v) => v.current) || app.versions[0];
  const subscriberCount = (app.subscriberCustomerIds || []).length;

  const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'versions', label: 'Versions', count: app.versions.length },
  { id: 'subscribers', label: 'Subscribers', count: subscriberCount },
  { id: 'activity', label: 'Activity' }];


  return (
    <div className="page">
      <div className="det-band">
        <div className="det-band__inner">
      <div className="det-header">
        <button type="button" className="det-back" onClick={onBack} aria-label="Back to Apps" title="Back to Apps"><Icon name="chevL" size={18} /></button>
        <AppIcon app={app} size={56} />
        <div className="det-header__main">
          <h1 className="det-header__title">
            {app.name}
            <AppStatusPill app={app} />
            <AppModePill app={app} />
          </h1>
          <div className="det-header__meta" data-comment-anchor="d633299fff-div-428-11">
            <span>
              <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '1px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
                {app.package}
              </code>
            </span>
            <span>·</span>
            <span>{app.category}</span>
          </div>
        </div>
      </div>
        </div>{/* det-band__inner */}

      <div className="det-tabs">
        {tabs.map((t) =>
        <button key={t.id} className={`tds-tab ${tab === t.id ? 'tds-tab--active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        )}
      </div>
      </div>{/* det-band */}

      {tab === 'overview' && <TabAppOverview app={app} publisher={publisher} onOpenPublisher={onOpenPublisher} onOpenVersion={onOpenVersion} />}
      {tab === 'versions' && <TabAppVersions app={app} onOpenVersion={onOpenVersion} />}
      {tab === 'subscribers' && <TabAppSubscribers app={app} onOpenSubscriber={onOpenSubscriber} />}
      {tab === 'activity' && <TabAppActivity app={app} />}
    </div>);

};

window.AppDetail = AppDetail;