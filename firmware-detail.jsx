/* global React, Btn, Input, Field, Icon, Badge, Modal, CompanyLogo, useToast, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// Firmware Detail — admin view of ONE device model's firmware.
//
// Entered from a Device Model row (no standalone Firmware homepage).
// 2 tabs:  Versions · Deployments
//
// The Versions tab is ONE flat, normally-paginated table listing every
// version across ALL hardware IDs of the model — with OS + Hardware ID
// columns — never grouped/split by OS.
// ─────────────────────────────────────────────────────────────
const { useState: useStateFD, useMemo: useMemoFD } = React;

const FW_OS_TONE_DETAIL = { ANDROID: 'success', LINUX: 'info', RTOS: 'warning' };

// ─── Versions tab ─────────────────────────────────────────
const CURRENT_USER_FW = 'ops@carbon';
const FWV_PAGE_SIZE_DEFAULT = 10;

const TabFwVersions = ({ firmware, onOpenVersion, onGoDeployments }) => {
  const vs = useMemoFD(() => firmware.versions || [], [firmware.versions]);

  // ── Search: fuzzy version + hardware ID dropdown ──
  const hardwareIds = useMemoFD(() => window.getFirmwareHardwareIds(firmware), [firmware]);
  const { draft, applied, setDraft, runSearch, clearAll, clearOne } =
    window.useSearchBar({ q: '' });

  // Each hardware ID is an independent firmware track. The left rail lists
  // every track; the right pane shows the selected track's history (newest
  // first) with the version search applied and normal pagination.
  const allByHw = useMemoFD(() => {
    const m = {};
    for (const v of vs) (m[v.hardwareId] = m[v.hardwareId] || []).push(v);
    Object.keys(m).forEach(k => m[k].sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0)));
    return m;
  }, [vs]);

  const [splitHwid, setSplitHwid] = useStateFD(hardwareIds[0] || null);
  React.useEffect(() => {
    if (!hardwareIds.includes(splitHwid)) setSplitHwid(hardwareIds[0] || null);
  }, [hardwareIds, splitHwid]);

  const q = (applied.q || '').trim().toLowerCase();
  const railVersions = allByHw[splitHwid] || [];
  const paneVersions = q ? railVersions.filter(v => (v.versionName || '').toLowerCase().includes(q)) : railVersions;

  if (vs.length === 0) {
    return (
      <div className="empty" style={{ padding: '40px 24px' }}>
        No firmware versions uploaded yet for this model. Use <strong>Upload firmware</strong> to add the first one.
      </div>
    );
  }

  const pubCell = (v) => {
    const firstPub = (v.publishEvents || []).find(e => e.action === 'publish');
    return firstPub ? <span style={{ fontSize: 12.5 }}>{fmtDate(firstPub.at)}</span> : <span className="muted">—</span>;
  };
  const versionRow = (v) => {
    const st = window.FW_VERSION_TONE[v.status] || { label: v.status, tone: 'neutral' };
    return (
      <tr key={v.id} onClick={() => onOpenVersion(v.id)}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{v.versionName}</span>
            {v.current && <Badge tone="info" dot>Current</Badge>}
          </div>
        </td>
        <td><span style={{ fontSize: 12.5 }}>{fmtDate(v.uploadedAt)}</span></td>
        <td>{pubCell(v)}</td>
        <td><Badge tone={st.tone} dot>{st.label}</Badge></td>
      </tr>
    );
  };

  return (
    <>
      <style>{`
        .fwv-hwid { font-family: var(--font-family-mono); font-size: 12.5px; padding: 2px 7px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 4px; white-space: nowrap; }
        .fwv-split { display: flex; align-items: stretch; min-height: 320px; }
        .fwv-rail { width: 232px; flex: none; border-right: 1px solid var(--color-border-subtle); padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .fwv-railitem { text-align: left; border: 1px solid transparent; background: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; width: 100%; transition: background 120ms var(--easing-standard, ease); }
        .fwv-railitem:hover { background: var(--color-bg-hover); }
        .fwv-railitem.is-active { background: var(--color-bg-3); border-color: var(--color-border-subtle); }
        .fwv-railitem__cur { font-size: 12px; color: var(--color-text-secondary); margin-top: 7px; }
        .fwv-railpane { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <window.SearchBar onSearch={runSearch} sticky={false}>
          <window.SearchInput
            value={draft.q}
            onChange={(v) => setDraft(d => ({ ...d, q: v }))}
            onSearch={runSearch}
            placeholder="Search by version…"
            width={280}/>
        </window.SearchBar>
        <window.ActiveFilters onClearAll={clearAll} hasFilters={!!applied.q}>
          {applied.q ? <window.FilterChip label={`Version: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
        </window.ActiveFilters>
      </div>

      <div className="table-card" style={{ padding: 0, overflow: 'clip' }}>
        <div className="fwv-split">
          <div className="fwv-rail">
            {hardwareIds.map(h => {
              const vers = allByHw[h] || [];
              const cur = vers.find(v => v.current);
              return (
                <button key={h} className={`fwv-railitem ${h === splitHwid ? 'is-active' : ''}`} onClick={() => setSplitHwid(h)}>
                  <span className="fwv-hwid">{h}</span>
                  <div className="fwv-railitem__cur">Current <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)' }}>{cur ? cur.versionName : '—'}</span></div>
                </button>
              );
            })}
          </div>
          <div className="fwv-railpane">
            <table className="tds-table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Version</th>
                  <th style={{ width: '24%' }}>Uploaded</th>
                  <th style={{ width: '22%' }}>Published</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paneVersions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty" style={{ padding: '32px 24px' }}>
                        No versions match your search. <a onClick={clearAll} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Clear filters</a>
                      </div>
                    </td>
                  </tr>
                ) : paneVersions.map(v => versionRow(v))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Detail shell ─────────────────────────────────────────
// `model` is the device model; `firmware` is its per-model firmware record
// (may be a synthetic empty one when nothing has been uploaded yet).
const FirmwareDetail = ({ model, firmware, initialTab, onBack, onUpload, onEditModel, onOpenVersion, onMutateFirmware }) => {
  const [tab, setTab] = useStateFD(initialTab === 'deployments' ? 'deployments' : 'versions');
  const versions = firmware.versions || [];
  const hardwareIds = window.getFirmwareHardwareIds(firmware);
  const modelCode = model?.modelCode || firmware.modelCode;
  const os = model?.os || firmware.os;

  const tabs = [
    { id: 'versions', label: 'Versions', count: versions.length },
    { id: 'deployments', label: 'Deployments', count: window.fwDeployedIsoCount ? window.fwDeployedIsoCount(firmware) : undefined },
  ];

  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to Device Models"
        icon={<div className="fw-bigtile" style={{ width: 48, height: 48 }}>{modelCode}</div>}
        title={`${modelCode} firmware`}
        titleSize="lg"
        badges={<Badge tone={FW_OS_TONE_DETAIL[os] || 'neutral'} dot>{os}</Badge>}
        meta={
          <>
            <span><strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{versions.length}</strong> version{versions.length === 1 ? '' : 's'}</span>
            <span aria-hidden="true">·</span>
            <span><strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{hardwareIds.length}</strong> hardware ID{hardwareIds.length === 1 ? '' : 's'}</span>
            {hardwareIds.length > 0 && (<>
              <span aria-hidden="true">·</span>
              <span className="fw-hwids">{hardwareIds.map(h => <code key={h} className="fw-code">{h}</code>)}</span>
            </>)}
          </>
        }
        actions={onUpload ? <Btn variant="primary" icon="upload" onClick={onUpload}>Upload firmware</Btn> : null}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, active: tab === t.id, onClick: () => setTab(t.id) }))}
      />

      {tab === 'versions' && <TabFwVersions  firmware={firmware} onOpenVersion={onOpenVersion} onGoDeployments={() => setTab('deployments')}/>}
      {tab === 'deployments' && window.TabFwDeployments && <window.TabFwDeployments firmware={firmware} onMutateFirmware={onMutateFirmware} onOpenVersion={onOpenVersion}/>}

      <style>{`
        .fw-bigtile { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center;
          background: linear-gradient(135deg, oklch(70% 0.06 250), oklch(58% 0.10 250));
          color: #fff; font: 700 14px var(--font-family-mono); letter-spacing: -0.01em;
          box-shadow: 0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18);
          flex: none; }
        .fw-code { font-family: var(--font-family-mono); font-size: 12px; padding: 1px 6px;
          background: var(--color-bg-3); border-radius: 4px; border: 1px solid var(--color-border-subtle); }
        .fw-hwids { display: inline-flex; gap: 5px; flex-wrap: wrap; align-items: center; }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Version Detail — distinct page (firmware-version route).
// Specialised for firmware semantics: sub-package list (Android/RTOS) or
// hidden for Linux; full build metadata incl. Hardware ID + OS version.
// ─────────────────────────────────────────────────────────────
const FirmwareVersionDetail = ({ model, firmware, version, onBack, onOpenFirmware, onMutateFirmware }) => {
  const toast = useToast();
  const [vtab, setVtab] = useStateFD('overview');
  const [confirmUnpub, setConfirmUnpub] = useStateFD(false);
  const [audPage, setAudPage] = useStateFD(1);
  const [audDraft, setAudDraft] = useStateFD(''); // input text
  const [audQ, setAudQ] = useStateFD('');          // applied query
  const [actionsOpen, setActionsOpen] = useStateFD(false);
  const actionsRef = React.useRef(null);
  React.useEffect(() => {
    if (!actionsOpen) return undefined;
    const onDoc = (e) => { if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [actionsOpen]);
  const runAudSearch = () => { setAudQ(audDraft.trim()); setAudPage(1); };
  const clearAudSearch = () => { setAudDraft(''); setAudQ(''); setAudPage(1); };
  if (!version) {
    return (
      <div className="page">
        <div className="empty">Version not found. <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to firmware</a></div>
      </div>
    );
  }
  const modelCode = model?.modelCode || firmware.modelCode;
  const meta = window.FW_OS_META[version.os || firmware.os];
  const st = window.FW_VERSION_TONE[version.status] || { label: version.status, tone: 'neutral' };
  const audience = window.getVersionAudience(version);
  const audCount = audience.length;
  const AUD_PAGE_SIZE = 6;
  const audSearchable = audCount > AUD_PAGE_SIZE;
  const audQNorm = audQ.trim().toLowerCase();
  const audFiltered = audQNorm ? audience.filter(c => (c.name || '').toLowerCase().includes(audQNorm)) : audience;
  const audFilteredCount = audFiltered.length;
  const audPaged = audFilteredCount > AUD_PAGE_SIZE;
  const audTotalPages = Math.max(1, Math.ceil(audFilteredCount / AUD_PAGE_SIZE));
  const audSafePage = Math.min(audPage, audTotalPages);
  const audStart = (audSafePage - 1) * AUD_PAGE_SIZE;
  const audEnd = Math.min(audStart + AUD_PAGE_SIZE, audFilteredCount);
  const audPageItems = audFiltered.slice(audStart, audEnd);
  const isPublished = version.status === 'published';
  const isPending = version.status === 'unpublished';
  const wasPreviouslyPublished = isPending && (version.publishEvents || []).some(e => e.action === 'publish');

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
    toast({ kind: 'warning', title: `Unpublished · ${version.versionName}`, msg: 'Taken down from every ISO customer. Re-publish to make it deployable again.' });
  };
  const doRepublish = () => {
    onMutateFirmware && onMutateFirmware((fw) => ({
      ...fw,
      versions: fw.versions.map((s) => s.id === version.id ? { ...s, status: 'published' } : s),
    }));
    toast({ kind: 'success', title: `Re-published · ${version.versionName}`, msg: 'Available again — assign it to ISO customers from the Deployments tab.' });
  };

  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel={`Back to ${modelCode} firmware`}
        icon={<div className="fw-bigtile" style={{ width: 48, height: 48 }}>{modelCode}</div>}
        eyebrow={<button type="button" className="ad-pub-link" onClick={() => onOpenFirmware(firmware.id)} style={{ fontSize: 13 }}>{modelCode} firmware</button>}
        title={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.versionName}</span>}
        badges={
          <>
            <Badge tone={st.tone} dot>{st.label}</Badge>
            {version.current && <Badge tone="info" dot>Current</Badge>}
            <Badge tone={window.FW_OS_TONE[version.os] || 'neutral'} dot>{version.osVersion || version.os}</Badge>
          </>
        }
        meta={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11.5 }}>HWID</span>
              <code className="fw-code">{version.hardwareId}</code>
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, wordBreak: 'break-all' }}>{version.fileName}</span>
            {version.os === 'LINUX' && version.versionStart && (
              <>
                <span aria-hidden="true">·</span>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.versionStart} → {version.versionEnd}</span>
              </>
            )}
          </>
        }
        actions={
          <div ref={actionsRef} className="fwvd-actions">
            <button type="button" className={`fwvd-actions__trigger ${actionsOpen ? 'is-open' : ''}`}
              aria-haspopup="menu" aria-expanded={actionsOpen}
              onClick={() => setActionsOpen((o) => !o)}>
              <Icon name="more" size={18}/>
            </button>
            {actionsOpen ? (
              <div className="fwvd-actions__menu" role="menu">
                {isPublished ? (
                  <button type="button" role="menuitem" className="fwvd-actions__item fwvd-actions__item--danger"
                    onClick={() => { setActionsOpen(false); setConfirmUnpub(true); }}>
                    <Icon name="x" size={15}/> Unpublish
                  </button>
                ) : (
                  <button type="button" role="menuitem" className="fwvd-actions__item"
                    onClick={() => { setActionsOpen(false); doRepublish(); }}>
                    <Icon name="bolt" size={15}/> Re-publish
                  </button>
                )}
                <button type="button" role="menuitem" className="fwvd-actions__item"
                  onClick={() => setActionsOpen(false)}>
                  <Icon name="download" size={15}/> Download
                </button>
              </div>
            ) : null}
          </div>
        }
        tabs={[{ id: 'overview', label: 'Overview' }, { id: 'publish', label: 'Publish audience' }].map((tb) => ({ id: tb.id, label: tb.label, active: vtab === tb.id, onClick: () => setVtab(tb.id) }))}
      />

      {vtab === 'overview' && (
      <div className="vd-grid" style={{ marginTop: 18, gridTemplateColumns: '1fr' }}>
        <div className="stack" style={{ gap: 16 }}>

          {/* Sub-package list (Android / RTOS only — Linux has none) */}
          {meta.hasSubPackages ? (
            <div className="info-card">
              <div className="info-card__head">
                <div className="info-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="package" size={14}/> Sub-packages
                </div>
              </div>
              <div className="info-card__body" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="tds-table" style={{ marginBottom: 0, minWidth: 440 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%', whiteSpace: 'nowrap' }}>Version</th>
                      <th style={{ width: '18%', whiteSpace: 'nowrap' }}>Size</th>
                      <th style={{ whiteSpace: 'nowrap' }}>MD5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {version.packages.map((p, i) => (
                      <tr key={i}>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.name}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{p.size}</span></td>
                        <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{p.md5}</span></td>
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
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
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
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
                {version.changelog || 'No changelog.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {vtab === 'publish' && (
      <div style={{ marginTop: 18 }}>
        {/* Heading */}
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Published to</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5 }}>
            The ISO customers that can see <span style={{ fontFamily: 'var(--font-family-mono)' }}>{version.versionName}</span> in their OTA management menu. Manage who sees which versions from the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab.
          </p>
        </div>

        {isPending && !wasPreviouslyPublished && (
          <div className="fwvd-pub-empty">
            <Icon name="info" size={14}/>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>Unpublished — not visible to any ISO customer yet</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>Open the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab to assign this firmware to ISO customers and pick which versions each one sees.</div>
            </div>
          </div>
        )}
        {isPending && wasPreviouslyPublished && (
          <div className="fwvd-pub-empty fwvd-pub-empty--warn">
            <Icon name="info" size={14}/>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>Previously released — currently hidden from all ISO customers</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>Already-rolled-out terminals keep running this version. Re-add it to an ISO customer from the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab.</div>
            </div>
          </div>
        )}
        {isPublished && audCount === 0 && (
          <div className="fwvd-pub-empty fwvd-pub-empty--warn">
            <Icon name="info" size={14}/>
            <div>Published with no audience. Assign ISO customers from the <button type="button" className="fwvd-link" onClick={() => onOpenFirmware(firmware.id, 'deployments')}>Deployments</button> tab.</div>
          </div>
        )}

        {isPublished && audCount > 0 && (
          <>
            {/* Filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ width: 240 }}>
                <Input size="sm" prefix={<Icon name="search" size={12}/>}
                  placeholder="Search ISO customer…"
                  value={audDraft}
                  onChange={(e) => setAudDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runAudSearch(); } }}/>
              </div>
              <Btn size="sm" variant="primary" onClick={runAudSearch}>Search</Btn>
              {audQ && <Btn size="sm" variant="ghost" onClick={clearAudSearch}>Clear</Btn>}
            </div>

            {/* Table */}
            <div className="table-card">
              <table className="tds-table">
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>ISO customer</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {audFilteredCount === 0 ? (
                    <tr><td colSpan={2}><div className="empty">No ISO customer matches “{audQ.trim()}”.</div></td></tr>
                  ) : audPageItems.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CompanyLogo name={c.name} size={32}/>
                          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{c.name}</div>
                        </div>
                      </td>
                      <td><span className="muted" style={{ fontSize: 12.5 }}>{c.country || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {audPaged && audFilteredCount > 0 && window.Pagination && (
                <window.Pagination
                  total={audFilteredCount} totalUnfiltered={audCount}
                  pageStart={audStart} pageEnd={audEnd}
                  page={audSafePage} totalPages={audTotalPages} pageSize={AUD_PAGE_SIZE}
                  setPage={setAudPage} setPageSize={() => {}}
                  unit="ISO customers" divider
                  showRowsPerPage={false} showGoTo={false} />
              )}
            </div>
          </>
        )}
      </div>
      )}

      {confirmUnpub && (
        <Modal open={true} onClose={() => setConfirmUnpub(false)} width={480}
          title="Unpublish this version?"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setConfirmUnpub(false)}>Cancel</Btn>
              <Btn variant="danger" icon="x" onClick={doUnpublish}>Unpublish</Btn>
            </>
          }>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            About to unpublish <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-primary)', fontWeight: 600 }}>{version.versionName}</strong> from <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{audCount} ISO customer{audCount === 1 ? '' : 's'}</strong>.<br/><br/>
            The version will no longer be visible in any ISO customer's OTA management menu. Already-rolled-out terminals keep running it. Release history is preserved — you can re-publish later.
          </div>
        </Modal>
      )}

      <style>{`
        .fw-bigtile { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center;
          background: linear-gradient(135deg, oklch(70% 0.06 250), oklch(58% 0.10 250));
          color: #fff; font: 700 14px var(--font-family-mono); letter-spacing: -0.01em;
          box-shadow: 0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18); flex: none; }
        .fw-code { font-family: var(--font-family-mono); font-size: 12.5px; padding: 2px 7px;
          background: var(--color-bg-3); border-radius: 4px; border: 1px solid var(--color-border-subtle); }

        .fwvd-kvgrid { display: grid; grid-template-columns: 160px 1fr 160px 1fr; row-gap: 14px; column-gap: 24px; }
        @media (max-width: 720px) { .fwvd-kvgrid { grid-template-columns: 140px 1fr; } }

        .fwvd-pub-empty {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 8px;
          background: oklch(96% 0.02 252 / 0.5);
          border: 1px solid oklch(58% 0.10 252 / 0.20);
          color: oklch(40% 0.14 252);
          font-size: 12.5px; line-height: 1.55;
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

        .fwvd-actions { position: relative; display: inline-flex; }
        .fwvd-actions__trigger {
          width: 36px; height: 36px; display: grid; place-items: center;
          border-radius: 8px; cursor: pointer;
          background: var(--color-bg-2); border: 1px solid var(--color-border-default);
          color: var(--color-text-secondary); transition: background 120ms var(--easing-standard, ease), border-color 120ms var(--easing-standard, ease), color 120ms var(--easing-standard, ease);
        }
        .fwvd-actions__trigger:hover { background: var(--color-bg-hover); border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwvd-actions__trigger.is-open { background: var(--color-bg-active); border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwvd-actions__menu {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: var(--z-dropdown, 50);
          min-width: 184px; padding: 6px;
          background: var(--color-bg-2); border: 1px solid var(--color-border-default);
          border-radius: 10px; box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.10));
        }
        .fwvd-actions__item {
          width: 100%; text-align: left; display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 6px; border: 0; background: transparent; cursor: pointer;
          font: 500 13px var(--font-family-sans); color: var(--color-text-primary);
        }
        .fwvd-actions__item:hover { background: var(--color-bg-hover); }
        .fwvd-actions__item--danger { color: var(--color-error-700, oklch(45% 0.22 25)); }
        .fwvd-actions__item--danger:hover { background: var(--color-error-50, oklch(96% 0.04 25)); }
      `}</style>
    </div>
  );
};

const KVCell = ({ label, value, wide }) => (
  <>
    <div style={{ font: '500 11px var(--font-family-sans)', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'center' }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', alignSelf: 'center', gridColumn: wide ? 'span 3' : 'auto' }}>{value}</div>
  </>
);

Object.assign(window, { FirmwareDetail, FirmwareVersionDetail });
