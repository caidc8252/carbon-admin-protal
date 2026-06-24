/* global React, Btn, Input, Field, Icon, Badge, Modal, CompanyLogo, useToast, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// Firmware Detail — admin view of one (modelCode, deviceFlag) firmware.
//
// 3 tabs:
//   Overview · Versions · Activity
//
// This screen is asset-management only: see what firmware bundles we
// have and what versions exist per tuple. Once a version is uploaded
// it automatically appears in the ISV/ISO platform's App Store + OTA
// management menu — each ISO decides whether and how to adopt it.
// ─────────────────────────────────────────────────────────────
const { useState: useStateFD, useMemo: useMemoFD } = React;

// ─── Overview tab ─────────────────────────────────────────
const TabFwOverview = ({ firmware, onOpenVersion }) => {
  const latest = window.getFirmwareLatest(firmware);
  const meta = window.FW_OS_META[firmware.os];

  return (
    <div className="ad-grid">
      {/* LEFT */}
      <div className="stack" style={{ gap: 16 }}>
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">Firmware identity</div>
          </div>
          <div className="info-card__body">
            <div className="kv2-wrap">
            <dl className="kv2">
              <div className="kv2__row"><dt>Model code</dt>
              <dd><code className="fw-code">{firmware.modelCode}</code></dd></div>
              <div className="kv2__row"><dt>Device flag</dt>
              <dd><code className="fw-code">{firmware.deviceFlag}</code></dd></div>
              <div className="kv2__row"><dt>Operating system</dt>
              <dd><Badge tone={window.FW_OS_TONE[firmware.os]} dot>{firmware.os}</Badge></dd></div>
              <div className="kv2__row"><dt>File format</dt>
              <dd>
                <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '2px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
                  {meta.pattern}
                </code>
              </dd></div>
              <div className="kv2__row"><dt>Total versions</dt>
              <dd><span style={{ fontFamily: 'var(--font-family-mono)' }}>{firmware.versions.length}</span></dd></div>
              {firmware.customerScope && (
                <div className="kv2__row kv2__row--full"><dt>Customer scope</dt>
                  <dd style={{ fontSize: 12 }}>{firmware.customerScope}</dd>
                </div>
              )}
            </dl>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Latest version snapshot */}
      <div className="stack" style={{ gap: 16 }}>
        {latest ? (
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Latest version</div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, fontWeight: 500 }}>{latest.versionName}</span>
            </div>
            <div className="info-card__body">
              <div className="ov-kvstack">
                <div className="ov-kv">
                  <div className="ov-kv__label">Version</div>
                  <div className="ov-kv__value">
                    <div><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{latest.versionName}</span></div>
                  </div>
                </div>
                <div className="ov-kv">
                  <div className="ov-kv__label">File size</div>
                  <div className="ov-kv__value"><span style={{ fontFamily: 'var(--font-family-mono)' }}>{latest.fileSize}</span></div>
                </div>
                <div className="ov-kv">
                  <div className="ov-kv__label">Uploaded</div>
                  <div className="ov-kv__value">{fmtDate(latest.uploadedAt)}</div>
                </div>
              </div>

              <div className="ov-divider"/>
              <div className="ov-section-label">Changelog</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {latest.changelog || 'No changelog provided.'}
              </p>

              <button type="button" className="ad-link-btn" onClick={() => onOpenVersion(latest.id)}>
                Open version details <Icon name="chevR" size={12}/>
              </button>
            </div>
          </div>
        ) : (
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">No versions yet</div></div>
            <div className="info-card__body">
              <div className="muted" style={{ fontSize: 12 }}>Once a firmware bundle is uploaded, the parsed manifest will appear here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Audience summary (used in Versions tab + Version detail) ────
// Renders a compact label like "Northwind +2" with a tooltip listing all
// ISO names. Click expands inline. Used wherever a list of audience ISOs
// needs to be shown in a small space.
const FwAudienceSummary = ({ audience, max = 1 }) => {
  if (!audience || audience.length === 0) {
    return <span className="muted" style={{ fontSize: 12 }}>—</span>;
  }
  const head = audience.slice(0, max);
  const rest = audience.length - head.length;
  const titleAll = audience.map(c => c.name).join('\n');
  return (
    <span className="fwv-aud" title={titleAll}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {head.map(c => <CompanyLogo key={c.id} name={c.name} size={18}/>)}
      </span>
      <span className="fwv-aud__name">
        {head.map(c => c.name).join(', ')}
        {rest > 0 && <span className="fwv-aud__plus"> +{rest}</span>}
      </span>
    </span>
  );
};

// ─── Versions tab ─────────────────────────────────────────
// The firmware asset inventory: upload history + status. Publishing the
// audience (which ISOs see which version) lives in the Deployments tab.
// The one action here is Unpublish — pull a version from every ISO at
// once (clears its audience); per-ISO control stays in Deployments.
const CURRENT_USER_FW = 'ops@carbon';

const TabFwVersions = ({ firmware, onOpenVersion, onGoDeployments }) => {
  const vs = firmware.versions || [];
  if (vs.length === 0) return <div className="empty">No versions uploaded yet for this firmware.</div>;

  return (
    <>
      <div className="fwv-hint">
        <Icon name="info" size={13}/>
        <span>
          Per-ISO publishing is managed from the <button type="button" className="fwv-hint__link" onClick={onGoDeployments}>Deployments</button> tab. Open a version to <strong>re-publish</strong>, <strong>unpublish</strong>, or download it.
        </span>
      </div>
      <div className="table-card">
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Version</th>
              <th style={{ width: '14%' }}>Size</th>
              <th style={{ width: '20%' }}>Uploaded</th>
              <th style={{ width: '20%' }}>Published</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vs.map(v => {
              const st = window.FW_VERSION_TONE[v.status] || { label: v.status, tone: 'neutral' };
              const firstPub = (v.publishEvents || []).find(e => e.action === 'publish');
              return (
                <tr key={v.id} onClick={() => onOpenVersion(v.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 500 }}>{v.versionName}</span>
                      {v.current && <Badge tone="info" dot>Current</Badge>}
                    </div>
                  </td>
                  <td><span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{v.fileSize}</span></td>
                  <td><span style={{ fontSize: 12 }}>{fmtDate(v.uploadedAt)}</span></td>
                  <td>{firstPub ? <span style={{ fontSize: 12 }}>{fmtDate(firstPub.at)}</span> : <span className="muted">—</span>}</td>
                  <td><Badge tone={st.tone} dot>{st.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .fwv-hint {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 14px; margin-bottom: 14px; border-radius: 8px;
          background: oklch(96% 0.02 252 / 0.5);
          border: 1px solid oklch(58% 0.10 252 / 0.20);
          color: oklch(40% 0.14 252);
          font-size: 12px; line-height: 1.55;
        }
        [data-theme="dark"] .fwv-hint { background: oklch(28% 0.04 252 / 0.4); color: oklch(78% 0.10 252); }
        .fwv-hint__link {
          border: 0; background: transparent; padding: 0; cursor: pointer;
          font: inherit; font-weight: 600; color: inherit; text-decoration: underline;
        }
        .fwv-act { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 6px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); color: var(--color-text-secondary); font: 500 12px var(--font-family-sans); cursor: pointer; transition: all 0.12s; }
        .fwv-act:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwv-act:disabled { opacity: 0.4; cursor: not-allowed; }
        .fwv-act:disabled:hover { border-color: var(--color-border-default); color: var(--color-text-secondary); }
        .fwv-act--primary { background: var(--color-primary-700, oklch(45% 0.16 262)); border-color: var(--color-primary-700, oklch(45% 0.16 262)); color: #fff; }
        .fwv-act--primary:hover { background: oklch(40% 0.18 262); color: #fff; }
        .fwv-act--danger:hover { border-color: var(--color-error-500, oklch(58% 0.22 25)); color: var(--color-error-700, oklch(45% 0.22 25)); }

        .fwv-aud { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
        .fwv-aud__name {
          font-size: 12px; color: var(--color-text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          min-width: 0;
        }
        .fwv-aud__plus {
          margin-left: 4px; color: var(--color-text-tertiary);
          font-family: var(--font-family-mono); font-size: 12px;
        }
      `}</style>
    </>
  );
};

// ─── Activity tab ─────────────────────────────────────────
const FW_ACTIVITY_TONE = {
  uploaded:        { tone: 'info',    label: 'Uploaded' },
  published:       { tone: 'success', label: 'Published' },
  'audience-edit': { tone: 'info',    label: 'Audience edited' },
  unpublished:     { tone: 'warning', label: 'Unpublished' },  // event in publishEvents, not a status
};

const TabFwActivity = ({ firmware }) => {
  const events = useMemoFD(() => window.buildFirmwareActivity(firmware), [firmware]);
  return (
    <div className="info-card">
      <div className="info-card__head">
        <div className="info-card__title">Activity timeline</div>
        <span className="muted" style={{ fontSize: 12 }}>{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="info-card__body">
        <div className="timeline">
          {events.map((e, i) => {
            const meta = FW_ACTIVITY_TONE[e.kind] || { tone: 'neutral', label: e.kind };
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Detail shell ─────────────────────────────────────────
const FirmwareDetail = ({ firmware, initialTab, onBack, onOpenVersion, onMutateVersion, onMutateFirmware }) => {
  const [tab, setTab] = useStateFD(initialTab || 'overview');
  const latest = window.getFirmwareLatest(firmware);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'versions', label: 'Versions', count: firmware.versions.length },
    { id: 'deployments', label: 'Deployments', count: window.fwDeployedIsoCount ? window.fwDeployedIsoCount(firmware) : undefined },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="page">
      <div className="det-band">
        <div className="det-band__inner">
      <div className="det-header">
        <button type="button" className="det-back" onClick={onBack} aria-label="Back to Firmware" title="Back to Firmware"><Icon name="chevL" size={18}/></button>
        <div className="fw-bigtile">{firmware.modelCode}</div>
        <div className="det-header__main">
          <h1 className="det-header__title">
            {firmware.modelCode} · {firmware.deviceFlag}
            <Badge tone={window.FW_OS_TONE[firmware.os]} dot>{firmware.os}</Badge>
          </h1>
          <div className="det-header__meta">
            <span>
              <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '1px 6px', background: 'var(--color-bg-3)', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
                {window.FW_OS_META[firmware.os].pattern}
              </code>
            </span>
            {latest && (<>
              <span>·</span>
              <span>Latest <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{latest.versionName}</strong></span>
            </>)}
            <span>·</span>
            <span><strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{firmware.versions.length}</strong> version{firmware.versions.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>
        </div>{/* det-band__inner */}

      <div className="det-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tds-tab ${tab === t.id ? 'tds-tab--active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count !== undefined && <span style={{ marginLeft: 6, fontFamily: 'var(--font-family-mono)', fontWeight: 400, opacity: 0.7 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      </div>{/* det-band */}

      {tab === 'overview' && <TabFwOverview  firmware={firmware} onOpenVersion={onOpenVersion}/>}
      {tab === 'versions' && <TabFwVersions  firmware={firmware} onOpenVersion={onOpenVersion} onGoDeployments={() => setTab('deployments')}/>}
      {tab === 'deployments' && window.TabFwDeployments && <window.TabFwDeployments firmware={firmware} onMutateFirmware={onMutateFirmware} onOpenVersion={onOpenVersion}/>}
      {tab === 'activity' && <TabFwActivity  firmware={firmware}/>}

      <style>{`
        .vd-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
        @media (max-width: 980px) { .vd-grid { grid-template-columns: 1fr; } }
        .fw-bigtile { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center;
          background: linear-gradient(135deg, oklch(70% 0.06 250), oklch(58% 0.10 250));
          color: #fff; font: 700 14px var(--font-family-mono); letter-spacing: -0.01em;
          box-shadow: 0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18);
          flex: none; }
        .fw-code { font-family: var(--font-family-mono); font-size: 12px; padding: 2px 7px;
          background: var(--color-bg-3); border-radius: 4px; border: 1px solid var(--color-border-subtle); }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Version Detail — distinct page (firmware-version route).
// Mirrors version-detail.jsx (the App-version page) but specialised for
// firmware semantics: shows the sub-package list explicitly (the user-
// requested "子包列表 (文件名称, 文件大小, md5)"), or hides it for Linux.
// ─────────────────────────────────────────────────────────────
const FirmwareVersionDetail = ({ firmware, version, onBack, onOpenFirmware, onMutateFirmware }) => {
  const toast = useToast();
  const [confirmUnpub, setConfirmUnpub] = useStateFD(false);
  if (!version) {
    return (
      <div className="page">
        <div className="empty">Version not found. <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to firmware</a></div>
      </div>
    );
  }
  const meta = window.FW_OS_META[firmware.os];
  const st = window.FW_VERSION_TONE[version.status] || { label: version.status, tone: 'neutral' };
  const audience = window.getVersionAudience(version);
  const audCount = audience.length;
  const isPublished = version.status === 'published';
  const isPending = version.status === 'unpublished';
  // "Was previously published" — derived from history, not state.
  const wasPreviouslyPublished = isPending && (version.publishEvents || []).some(e => e.action === 'publish');

  // Top-right header actions — re-publish / unpublish a version across every
  // ISO at once (per-ISO control lives in the Deployments tab).
  const doUnpublish = () => {
    const now = new Date().toISOString();
    const ev = { at: now, by: CURRENT_USER_FW, action: 'unpublish', isoIds: [] };
    onMutateFirmware && onMutateFirmware((fw) => ({
      ...fw,
      versions: fw.versions.map((s) => s.id === version.id
        ? { ...s, status: 'unpublished', current: false, publishedToIsoIds: [], publishEvents: [...(s.publishEvents || []), ev] }
        : s),
    }));
    setConfirmUnpub(false);
    toast({ kind: 'warning', title: `Unpublished · ${version.versionName}`, msg: 'Taken down from every ISO. Re-publish to make it deployable again.' });
  };
  const doRepublish = () => {
    onMutateFirmware && onMutateFirmware((fw) => ({
      ...fw,
      versions: fw.versions.map((s) => s.id === version.id ? { ...s, status: 'published' } : s),
    }));
    toast({ kind: 'success', title: `Re-published · ${version.versionName}`, msg: 'Available again — assign it to ISOs from the Deployments tab.' });
  };

  // Publish/audience events from the version's history — surfaced in the
  // Timeline panel alongside upload/manifest rows.
  const publishHistoryRows = (version.publishEvents || []).map(ev => {
    if (ev.action === 'publish') {
      return { icon: 'bolt', at: ev.at, who: ev.by, text: `Published to ${ev.isoIds.length} ISO${ev.isoIds.length === 1 ? '' : 's'}`, note: ev.note };
    }
    if (ev.action === 'audience-edit') {
      return { icon: 'settings', at: ev.at, who: ev.by, text: `Audience updated · ${ev.isoIds.length} ISO${ev.isoIds.length === 1 ? '' : 's'}`, note: ev.note };
    }
    return { icon: 'x', at: ev.at, who: ev.by, text: 'Unpublished', note: ev.note };
  });

  const timeline = [
    version.uploadedAt && { icon: 'upload',  text: 'Firmware bundle uploaded',                                                                                          at: version.uploadedAt, who: version.uploadedBy },
    version.uploadedAt && { icon: 'shield',  text: `Manifest parsed · ${version.packages.length} sub-package${version.packages.length === 1 ? '' : 's'}, MD5 verified`, at: version.uploadedAt, who: 'system' },
    ...publishHistoryRows,
  ].filter(Boolean).sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <div className="page">
      <div className="det-band">
        <div className="det-band__inner">
      <div className="det-header">
        <button type="button" className="det-back" onClick={onBack} aria-label="Back" title={`Back to ${firmware.modelCode} · ${firmware.deviceFlag}`}><Icon name="chevL" size={18}/></button>
        <div className="fw-bigtile">{firmware.modelCode}</div>
        <div className="det-header__main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <button type="button" className="ad-pub-link" onClick={() => onOpenFirmware(firmware.id)} style={{ fontSize: 14 }}>
              {firmware.modelCode} · {firmware.deviceFlag}
            </button>
            <Icon name="chevR" size={11} style={{ color: 'var(--color-text-tertiary)' }}/>
            <h1 className="det-header__title" style={{ margin: 0, fontFamily: 'var(--font-family-mono)' }}>
              {version.versionName}
            </h1>
            <Badge tone={st.tone} dot>{st.label}</Badge>
            {version.current && <Badge tone="info" dot>Current</Badge>}
            <Badge tone={window.FW_OS_TONE[firmware.os]} dot>{firmware.os}</Badge>
          </div>
          <div className="det-header__meta">
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.fileName}</span>
          </div>
        </div>
        <div className="page__actions" style={{ display: 'flex', gap: 8 }}>
          {isPublished ? (
            <Btn variant="ghost" icon="x" onClick={() => setConfirmUnpub(true)}>Unpublish</Btn>
          ) : (
            <Btn variant="primary" icon="bolt" onClick={doRepublish}>Re-publish</Btn>
          )}
          <Btn variant="ghost" icon="download">Download</Btn>
        </div>
      </div>
        </div>{/* det-band__inner */}
      </div>{/* det-band */}

      <div className="vd-grid">
        {/* LEFT — narrative */}
        <div className="stack" style={{ gap: 16 }}>

          {/* Publish audience */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="bolt" size={14}/> Publish audience
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {isPublished
                  ? <><strong style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>{audCount}</strong> ISO{audCount === 1 ? '' : 's'}</>
                  : wasPreviouslyPublished ? 'Previously released'
                  : 'Not yet released'}
              </span>
            </div>
            <div className="info-card__body">
              {isPending && !wasPreviouslyPublished && (
                <div className="fwvd-pub-empty">
                  <Icon name="info" size={14}/>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>Unpublished — not visible to any ISO yet</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Open the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab to assign this firmware to ISOs and pick which versions each one sees.</div>
                  </div>
                </div>
              )}
              {isPending && wasPreviouslyPublished && (
                <div className="fwvd-pub-empty fwvd-pub-empty--warn">
                  <Icon name="info" size={14}/>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>Previously released — currently hidden from all ISOs</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Already-rolled-out terminals keep running this version. Re-add it to an ISO from the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab. Activity tab shows the full release history.</div>
                  </div>
                </div>
              )}
              {isPublished && audCount === 0 && (
                <div className="fwvd-pub-empty fwvd-pub-empty--warn">
                  <Icon name="info" size={14}/>
                  <div>Published with no audience. Assign ISOs from the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab.</div>
                </div>
              )}
              {isPublished && audCount > 0 && (
                <div className="fwvd-aud-grid">
                  {audience.map(c => (
                    <div key={c.id} className="fwvd-aud-card">
                      <CompanyLogo name={c.name} size={32}/>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{c.country || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Build metadata — ALL of the user-requested fields */}
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Build metadata</div>
            </div>
            <div className="info-card__body">
              <div className="fwvd-kvgrid">
                <KVCell label="Version name" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.versionName}</span>}/>
                <KVCell label="Model code"   value={<code className="fw-code">{firmware.modelCode}</code>}/>
                <KVCell label="Device flag"  value={<code className="fw-code">{firmware.deviceFlag}</code>}/>
                <KVCell label="File size"    value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.fileSize}</span>}/>
                <KVCell label="File name"    value={<span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, wordBreak: 'break-all' }}>{version.fileName}</span>} wide/>
                <KVCell label="MD5"          value={<span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{version.md5}</span>} wide/>
                <KVCell label="Uploaded"     value={fmtDateTime(version.uploadedAt)}/>
                {firmware.os === 'LINUX' && version.versionStart && (
                  <>
                    <KVCell label="Start version" value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.versionStart}</span>}/>
                    <KVCell label="End version"   value={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.versionEnd}</span>}/>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub-package list (Android / RTOS only — Linux has none) */}
          {meta.hasSubPackages ? (
            <div className="info-card">
              <div className="info-card__head">
                <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="package" size={14}/> Sub-packages
                </div>
                <span className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>{version.packages.length} files</span>
              </div>
              <div className="info-card__body" style={{ padding: 0 }}>
                <table className="tds-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>File name</th>
                      <th style={{ width: '18%' }}>Size</th>
                      <th>MD5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {version.packages.map((p, i) => (
                      <tr key={i}>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="file" size={11}/> {p.name}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{p.size}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.md5}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="info-card">
              <div className="info-card__head">
                <div className="info-card__title">Sub-packages</div>
              </div>
              <div className="info-card__body">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
                  <Icon name="info" size={14} style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}/>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                    Linux MAN patches ship as a single monolithic <code style={{ fontFamily: 'var(--font-family-mono)' }}>.NLD</code> bundle. There is no sub-package breakdown — the file's overall MD5 above is the integrity check.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Changelog */}
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Changelog</div></div>
            <div className="info-card__body">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
                {version.changelog || 'No changelog.'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — timeline */}
        <div className="stack" style={{ gap: 16 }}>
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Timeline</div></div>
            <div className="info-card__body" style={{ padding: 0 }}>
              {timeline.map((e, i) => (
                <div key={i} className="vd-tl-row">
                  <div className="vd-tl-row__icon"><Icon name={e.icon} size={11}/></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{e.text}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>
                      <span style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtDateTime(e.at)}</span> · by <strong style={{ fontWeight: 500 }}>{e.who}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {confirmUnpub && (
        <Modal open={true} onClose={() => setConfirmUnpub(false)} width={480}
          title="Unpublish this version?"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setConfirmUnpub(false)}>Cancel</Btn>
              <Btn variant="danger" icon="x" onClick={doUnpublish}>Unpublish</Btn>
            </>
          }>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            About to unpublish <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 600 }}>{version.versionName}</strong> from <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{audCount} ISO{audCount === 1 ? '' : 's'}</strong>.<br/><br/>
            The version will no longer be visible in any ISO's OTA management menu. Already-rolled-out terminals keep running it. Release history is preserved — you can re-publish later.
          </div>
        </Modal>
      )}

      <style>{`
        .fwvd-kvgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 16px; column-gap: 24px; }
        @media (max-width: 1100px) { .fwvd-kvgrid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) { .fwvd-kvgrid { grid-template-columns: 1fr; } }

        .fwvd-pub-empty {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 8px;
          background: oklch(96% 0.02 252 / 0.5);
          border: 1px solid oklch(58% 0.10 252 / 0.20);
          color: oklch(40% 0.14 252);
          font-size: 12px; line-height: 1.55;
        }
        .fwvd-pub-empty--warn {
          background: oklch(96% 0.04 80 / 0.5);
          border-color: oklch(60% 0.14 80 / 0.30);
          color: oklch(42% 0.16 80);
        }
        [data-theme="dark"] .fwvd-pub-empty { background: oklch(28% 0.04 252 / 0.4); color: oklch(78% 0.10 252); }
        [data-theme="dark"] .fwvd-pub-empty--warn { background: oklch(28% 0.06 80 / 0.4); color: oklch(82% 0.12 80); }

        .fwvd-aud-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
        }
        .fwvd-aud-card {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 8px;
          background: var(--color-bg-1); border: 1px solid var(--color-border-subtle);
        }
        .fwvd-link {
          border: 0; background: transparent; padding: 0; cursor: pointer;
          font: inherit; font-weight: 600; color: inherit; text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

const KVCell = ({ label, value, wide }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: wide ? '1 / -1' : 'auto' }}>
    <div style={{ font: '500 12px var(--font-family-sans)', color: 'var(--color-text-tertiary)' }}>{label}</div>
    <div style={{ fontSize: 14, color: 'var(--color-text-primary)', minWidth: 0, wordBreak: 'break-word' }}>{value}</div>
  </div>
);

Object.assign(window, { FirmwareDetail, FirmwareVersionDetail });
