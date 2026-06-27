/* global React, Btn, Input, Icon, Badge, CompanyLogo, AppIcon, AppStatusPill, AppModePill, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// App Detail — admin view of one ISV-published app.
//
// READ-ONLY across the board: admin doesn't author or edit apps.
// 3 tabs: Overview · Versions · Subscribers
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

// ─── Load more (ui-spec §3.6 — mirrors tickets.jsx CommentsCard) ──
// Centered sm secondary button under a list/block. Initial 10, +10 per
// click; loading state swaps the chevron for a spinner + "Loading…".
// Caller owns the `visible` count and removes <LoadMore> once all loaded.
const LoadMore = ({ onLoad }) => {
  const [loading, setLoading] = useStateAD(false);
  const click = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => { onLoad(); setLoading(false); }, 1000);
  };
  return (
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
      <Btn size="sm" onClick={click} loading={loading} disabled={loading}
        icon={loading ? undefined : 'chevD'}>
        {loading ? 'Loading…' : 'Load more'}
      </Btn>
    </div>);
};

// ─── Overview tab ─────────────────────────────────────────
// Mirrors the ISV portal's AppOverview shape:
//   Left:  About (description + Published-by + metadata) · Screenshots
//   Right: Latest version (vertical KV + release notes + scan)
const OverviewKV = ({ label, value, sub }) =>
<div className="ov-kv">
    <div className="ov-kv__label">{label}</div>
    <div className="ov-kv__value">
      <div>{value}</div>
      {sub && <div className="ov-kv__sub">{sub}</div>}
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
      <div className="stack" style={{ gap: 16 }}>
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">About</div>
          </div>
          <div className="info-card__body">
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
              {app.description}
            </p>
            {publisher &&
            <div className="ad-pubrow">
                <span className="muted" style={{ fontSize: 12.5 }}>Published by</span>
                <button type="button" className="ad-pub-link" onClick={() => onOpenPublisher(publisher.id)}>
                  {publisher.name}
                  <Icon name="link" size={11} />
                </button>
              </div>
            }
            {/* Supported devices — merged into About to mirror App Publish */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div className="ov-section-label" style={{ margin: 0 }}>Supported devices</div>
                {(app.devices || []).length > 0 &&
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{app.devices.length}</span> model{app.devices.length === 1 ? '' : 's'} declared
                </span>
                }
              </div>
              {(app.devices || []).length > 0 ?
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {app.devices.map((d) =>
                  <span key={d} className="ad-chip">{d}</span>
                )}
              </div> :
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No device models declared.</span>
              }
            </div>
          </div>
        </div>

        {/* Screenshots placeholder — bundled with the latest APK */}
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">Screenshots</div>
            {latest &&
            <span className="muted" style={{ fontSize: 11.5 }}>
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
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Show screenshots</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Collapsed by default — click to load.</div>
                </div>
                <Icon name="chevR" size={13} />
              </button>
            ) :

            <div className="muted" style={{ fontSize: 13 }}>No version uploaded — screenshots will appear once an APK is published.</div>
            }
          </div>
        </div>
      </div>

      {/* RIGHT — Latest version snapshot */}
      <div className="stack" style={{ gap: 16 }}>
        {latest ?
        <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                Latest version
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{latest.name}</span>
              </div>
              {onOpenVersion &&
              <button type="button" onClick={() => onOpenVersion(latest.id)}
                style={{ background: 'transparent', border: 0, padding: 0, font: '500 12.5px var(--font-family-sans)', color: 'var(--color-text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-700)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}>
                Details <span aria-hidden="true">→</span>
              </button>
              }
            </div>
            <div className="info-card__body">
              <div className="ov-kvstack">
                <OverviewKV label="Version"
              value={<span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, fontSize: 14 }}>{latest.name}</span>}
              sub={<span style={{ fontFamily: 'var(--font-family-mono)' }}>code {latest.code}</span>} />
                <OverviewKV label="Size"
              value={<span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, fontSize: 14 }}>{latest.size}</span>} />
                <OverviewKV label="Uploaded"
              value={<span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, fontSize: 14 }}>{fmtDate(latest.uploadedAt)}</span>} />
                <OverviewKV label="Published"
              value={latest.publishedAt ?
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, fontSize: 14 }}>{fmtDate(latest.publishedAt)}</span> :
              <span className="muted">—</span>
              } />
              </div>

              <div className="ov-divider" />
              <div className="ov-section-label">Release notes</div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {latest.notes || 'No release notes.'}
              </p>

              {counts &&
            <>
                  <div className="ov-divider" />
                  <div className="ov-section-label">Vulnerability scan</div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--color-bg-3)' }}>
                    {totalFindings === 0 ?
                <div style={{ flex: 1, background: 'color-mix(in oklab, var(--color-success-500) 65%, transparent)' }} /> :
                ['critical', 'high', 'medium', 'low', 'info'].map((k) => {
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
                  </div>
                </>
            }
            </div>
          </div> :

        <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">No versions yet</div>
            </div>
            <div className="info-card__body">
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
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
  if (!counts) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
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
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        {highPlus > 0 &&
        <span style={{ color: 'var(--color-error-700)', fontWeight: 500, marginRight: 4 }}>{highPlus} high+</span>
        }
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>{total}</span> total
      </span>
    </div>);

};

const TabAppVersions = ({ app, onOpenVersion }) => {
  // Most-recent first; no search/filter on this tab — default 10 then
  // Load more (+10), per ui-spec §3.6.
  const versions = useMemoAD(
    () => [...(app.versions || [])].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    [app]
  );
  const [visible, setVisible] = useStateAD(10);
  React.useEffect(() => { setVisible(10); }, [app.id]);
  if (versions.length === 0) {
    return <div className="empty">No versions uploaded yet for this app.</div>;
  }
  const shown = versions.slice(0, visible);
  const hasMore = versions.length > visible;
  return (
    <>
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
            {shown.map((v) => {
              const status = window.APP_VERSION_TONE[v.status] || { label: v.status, tone: 'neutral' };
              return (
                <tr key={v.id} onClick={() => onOpenVersion && onOpenVersion(v.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{v.name}</span>
                      {v.current && <Badge tone="info" dot>Current</Badge>}
                    </div>
                  </td>
                  <td><span className="num muted" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{v.code}</span></td>
                  <td><span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{v.size}</span></td>
                  <td><span style={{ fontSize: 12.5 }}>{fmtDate(v.uploadedAt)}</span></td>
                  <td>{v.publishedAt ? <span style={{ fontSize: 12.5 }}>{fmtDate(v.publishedAt)}</span> : <span className="muted">—</span>}</td>
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
      </div>
      {hasMore && <LoadMore onLoad={() => setVisible((v) => v + 10)} />}
    </>);

};

// ─── Subscribers tab ──────────────────────────────────────
// Subscribers list: App store · Current version · Subscribed · Status.
// (First column renamed from "ISO company" — we're de-emphasizing the
// ISO concept across the product.)
const TabAppSubscribers = ({ app, onOpenSubscriber }) => {
  // Most-recently-subscribed first; query conditions (name + version)
  // kept per §4, presented feed-style: default 10 then Load more (+10)
  // over the FILTERED rows, per ui-spec §3.6.
  const subscriptions = useMemoAD(
    () => [...window.getAppSubscriptions(app)].sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt)),
    [app]
  );
  const latest = app.versions.find((v) => v.current) || app.versions[0];

  // §4 search — draft (live) → applied (on Search / Enter).
  const [q, setQ] = useStateAD('');
  const [versionFilter, setVersionFilter] = useStateAD('any');
  const [aQ, setAQ] = useStateAD('');
  const [aVersion, setAVersion] = useStateAD('any');
  const runSearch = () => { setAQ(q.trim()); setAVersion(versionFilter); };

  const filtered = useMemoAD(() => subscriptions.filter((s) => {
    if (aVersion === 'none') { if (s.subscribedVersion) return false; }
    else if (aVersion !== 'any') { if (!s.subscribedVersion || s.subscribedVersion.id !== aVersion) return false; }
    if (aQ) {
      const hay = s.customer.name.toLowerCase();
      if (!hay.includes(aQ.toLowerCase())) return false;
    }
    return true;
  }), [subscriptions, aQ, aVersion]);
  const hasApplied = !!aQ || aVersion !== 'any';

  const [visible, setVisible] = useStateAD(10);
  React.useEffect(() => { setVisible(10); }, [app.id, aQ, aVersion]);
  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;
  return (
    <>
      {/* Condition area — standard SearchBar (§4) */}
      <window.SearchBar onSearch={runSearch} sticky={false}>
        <window.SearchInput value={q} onChange={setQ} onSearch={runSearch}
          placeholder="Search app store name" width={240} />
        <window.SearchSelect value={versionFilter} onChange={setVersionFilter} width={180}
          options={[
            { value: 'any', label: 'All versions' },
            ...app.versions.map((v) => ({ value: v.id, label: v.name })),
            { value: 'none', label: 'Unsubscribed' }]} />
      </window.SearchBar>

      <div className="table-card" style={{ marginTop: 16 }}>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>App store</th>
              <th style={{ width: '24%' }}>Current version</th>
              <th style={{ width: '18%' }}>Subscribed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 &&
              <tr><td colSpan={4} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                {subscriptions.length === 0 ? 'No subscribers for this app yet.' : 'No subscribers match those filters.'}
              </td></tr>
            }
            {shown.map((s) => {
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
                <td>
                  {s.subscribedVersion ?
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, fontWeight: 500, color: behind ? 'var(--color-warning-700)' : 'var(--color-text-primary)' }}>
                        {s.subscribedVersion.name}
                      </span>
                      {behind && latest ?
                    <span style={{ fontSize: 11, color: 'var(--color-warning-700)' }}>
                          ↑ <span style={{ fontFamily: 'var(--font-family-mono)' }}>{latest.name}</span>
                        </span> :
                    null}
                    </div> :

                  <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>—</span>
                  }
                </td>
                <td><span style={{ fontSize: 12.5 }}>{relTime(s.subscribedAt)}</span></td>
                <td><Badge tone={s.status.tone} dot>{s.status.label}</Badge></td>
              </tr>);

          })}
          </tbody>
        </table>
      </div>
      {hasMore && <LoadMore onLoad={() => setVisible((v) => v + 10)} />}
    </>);

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
  { id: 'subscribers', label: 'Subscribers', count: subscriberCount }];


  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to Apps"
        icon={<AppIcon app={app} size={48} />}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {app.name}
            <AppStatusPill app={app} />
            <AppModePill app={app} />
          </span>
        }
        titleSize="lg"
        meta={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '1px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>{app.package}</code>
              <button
                type="button"
                title="Copy package name"
                onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(app.package); } catch (e) {} window.showToast && window.showToast('Package name copied', 'success'); }}
                style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, padding: 0, border: 0, background: 'transparent', borderRadius: 4, cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                <Icon name="copy" size={12} />
              </button>
            </span>
            <span aria-hidden="true">·</span>
            <span>{app.category}</span>
          </>
        }
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, active: tab === t.id, onClick: () => setTab(t.id) }))}
      />

      {tab === 'overview' && <TabAppOverview app={app} publisher={publisher} onOpenPublisher={onOpenPublisher} onOpenVersion={onOpenVersion} />}
      {tab === 'versions' && <TabAppVersions app={app} onOpenVersion={onOpenVersion} />}
      {tab === 'subscribers' && <TabAppSubscribers app={app} onOpenSubscriber={onOpenSubscriber} />}
    </div>);

};

window.AppDetail = AppDetail;