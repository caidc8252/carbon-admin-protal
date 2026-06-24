/* global React, Btn, Input, Icon, Badge, fmtDate, relTime */
// ─────────────────────────────────────────────────────────────
// Firmware list — homepage for the Firmware sub-menu.
//
// One row per (modelCode, deviceFlag) tuple. Each row shows that tuple's
// LATEST version (current === true, else first) plus aggregate stats.
//
// Follows the standard list conventions (CLAUDE.md):
//   · search-bar.jsx → SearchBar / SearchInput / SearchSelect / ActiveFilters
//   · search-bar.jsx → ListCard / ListCardHead
//   · pagination.jsx → window.Pagination
// The KPI tiles are OS quick-filters: clicking one applies immediately
// (an explicit commit, like the Customers "Total / Show all" tiles).
// ─────────────────────────────────────────────────────────────
const { useState: useStateFL, useMemo: useMemoFL, useRef: useRefFL } = React;

const FirmwareList = ({ firmwares, onOpen, onUpload }) => {
  // ── Standard search-bar state (draft vs applied) ──────────
  const { draft, applied, setDraft, runSearch: _runSearch, clearAll: _clearAll, clearOne, hasFilters } =
  window.useSearchBar({ q: '', os: 'All', model: 'All', flag: 'All' });

  const [page, setPage] = useStateFL(1);
  const [pageSize, setPageSize] = useStateFL(25);
  const toolbarRef = useRefFL(null);

  const runSearch = () => {_runSearch();setPage(1);};
  const clearAll = () => {_clearAll();setPage(1);};
  const removeOne = (key, reset) => {clearOne(key, reset);setPage(1);};

  // KPI tile click → apply an OS quick-filter immediately (both draft+applied).
  const toggleOsKpi = (os) => {
    const next = applied.os === os ? 'All' : os;
    clearOne('os', next);
    setPage(1);
  };

  // ── Per-row derived shape: collapse to latest version ──
  const rows = useMemoFL(() => firmwares.map(fw => {
    const latest = window.getFirmwareLatest(fw);
    return {
      ...fw,
      latest,
      versionCount: fw.versions.length,
      updatedAt: latest?.uploadedAt || '1970-01-01T00:00:00Z',
    };
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)), [firmwares]);

  // ── KPI counts (by OS) ──────────────────────────────────
  const kpis = useMemoFL(() => ({
    total:   firmwares.length,
    android: firmwares.filter(f => f.os === 'ANDROID').length,
    linux:   firmwares.filter(f => f.os === 'LINUX').length,
    rtos:    firmwares.filter(f => f.os === 'RTOS').length,
  }), [firmwares]);

  // ── Distinct option lists for filters ───────────────────
  const modelOptions = useMemoFL(() => Array.from(new Set(firmwares.map(f => f.modelCode))).sort(), [firmwares]);
  // Device flags are scoped to the model picked in the DRAFT (toolbar) state.
  const flagOptions  = useMemoFL(() => {
    if (draft.model === 'All') return [];
    return Array.from(new Set(firmwares.filter(f => f.modelCode === draft.model).map(f => f.deviceFlag))).sort();
  }, [firmwares, draft.model]);

  // Auto-reset the draft flag if the draft model changes and the previously
  // picked flag isn't valid for the new model.
  React.useEffect(() => {
    if (draft.flag !== 'All' && !flagOptions.includes(draft.flag)) {
      setDraft({ flag: 'All' });
    }
  }, [flagOptions, draft.flag, setDraft]);

  // ── Filter rows using the APPLIED (committed) state ──────
  const filtered = useMemoFL(() => {
    let r = rows;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      r = r.filter(f =>
        f.modelCode.toLowerCase().includes(s) ||
        f.deviceFlag.toLowerCase().includes(s) ||
        (f.latest?.versionName || '').toLowerCase().includes(s) ||
        (f.latest?.fileName    || '').toLowerCase().includes(s)
      );
    }
    if (applied.os    !== 'All') r = r.filter(f => f.os === applied.os);
    if (applied.model !== 'All') r = r.filter(f => f.modelCode === applied.model);
    if (applied.flag  !== 'All') r = r.filter(f => f.deviceFlag === applied.flag);
    return r;
  }, [rows, applied]);

  // ── Pagination slice ─────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  React.useEffect(() => {if (page > totalPages) setPage(totalPages);}, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const osLabel = (os) => ({ ANDROID: 'Android', LINUX: 'Linux', RTOS: 'RTOS' }[os] || os);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Firmware</h1>
          <p className="page__sub">OTA firmware bundles, grouped by model code and device flag. Each row shows the latest version uploaded for that tuple.</p>
        </div>
        <div className="page__actions">
          <Btn variant="primary" icon="plus" onClick={onUpload}>Upload firmware</Btn>
        </div>
      </div>

      {/* KPI tiles — clickable as OS filters (apply immediately) */}
      <window.StatGrid cols={4} style={{ marginBottom: 8 }}>
        <window.StatCard label="Total firmware" value={kpis.total.toLocaleString()}
          description="Across all OS & flags" selected={!hasFilters} onClick={clearAll} />
        <window.StatCard label="Android" value={kpis.android.toLocaleString()}
          description=".zip OTA bundles" selected={applied.os === 'ANDROID'} onClick={() => toggleOsKpi('ANDROID')} />
        <window.StatCard label="Linux" value={kpis.linux.toLocaleString()}
          description=".NLD MAN patches" selected={applied.os === 'LINUX'} onClick={() => toggleOsKpi('LINUX')} />
        <window.StatCard label="RTOS" value={kpis.rtos.toLocaleString()}
          description=".zip OTA bundles" selected={applied.os === 'RTOS'} onClick={() => toggleOsKpi('RTOS')} />
      </window.StatGrid>

      {/* Sticky condition area — standard SearchBar + ActiveFilters */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
        <window.SearchBar onSearch={runSearch} sticky={false}>
          <window.SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search model, flag, version, file…"/>
          <window.SearchSelect
            value={draft.os}
            onChange={(v) => setDraft({ os: v })}
            width={130}
            options={[
              { value: 'All', label: 'All OS' },
              { value: 'ANDROID', label: 'Android' },
              { value: 'LINUX', label: 'Linux' },
              { value: 'RTOS', label: 'RTOS' },
            ]}/>
          <window.SearchSelect
            value={draft.model}
            onChange={(v) => setDraft({ model: v })}
            width={140}
            options={[
              { value: 'All', label: 'All models' },
              ...modelOptions.map((m) => ({ value: m, label: m })),
            ]}/>
          <window.SearchSelect
            value={draft.flag}
            onChange={(v) => setDraft({ flag: v })}
            width={170}
            options={[
              { value: 'All', label: 'All device flags' },
              ...flagOptions.map((f) => ({ value: f, label: f })),
            ]}/>
        </window.SearchBar>

        <window.ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
          {applied.q ? <window.FilterChip label={`Search: ${applied.q}`} onRemove={() => removeOne('q', '')}/> : null}
          {applied.os !== 'All' ? <window.FilterChip label={`OS: ${osLabel(applied.os)}`} onRemove={() => removeOne('os', 'All')}/> : null}
          {applied.model !== 'All' ? <window.FilterChip label={`Model: ${applied.model}`} onRemove={() => removeOne('model', 'All')}/> : null}
          {applied.flag !== 'All' ? <window.FilterChip label={`Flag: ${applied.flag}`} onRemove={() => removeOne('flag', 'All')}/> : null}
        </window.ActiveFilters>
      </div>{/* /sticky condition area */}

      {/* Standard list card — sticky head + sticky thead handled by CSS vars. */}
      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={filtered.length === 1 ? 'firmware bundle' : 'firmware bundles'}
          hasFilters={hasFilters}/>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '14%' }}>Model</th>
              <th style={{ width: '11%' }}>Device flag</th>
              <th style={{ width: '8%' }}>OS</th>
              <th style={{ width: '22%' }}>Latest version</th>
              <th style={{ width: '12%' }}>Size</th>
              <th style={{ width: '16%' }}>Uploaded</th>
              <th>Status</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="8"><div className="empty">No firmware matches your filters.</div></td></tr>
            ) : pageRows.map(fw => {
              const latest = fw.latest;
              const st = latest ? window.FW_VERSION_TONE[latest.status] || { label: latest.status, tone: 'neutral' } : null;
              return (
                <tr key={fw.id} onClick={() => onOpen(fw.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="fw-modeltile" style={{ '--fw-h': window.modelHue(fw.modelCode) }}>{fw.modelCode}</div>
                      <div>
                        <div className="cust-name" style={{ fontFamily: 'var(--font-family-mono)' }}>{fw.modelCode}</div>
                        <div className="cust-meta">{fw.versionCount} version{fw.versionCount === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, padding: '2px 7px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 4 }}>
                      {fw.deviceFlag}
                    </span>
                  </td>
                  <td><Badge tone={window.FW_OS_TONE[fw.os] || 'neutral'} dot>{fw.os}</Badge></td>
                  <td>
                    {latest ? (
                      <div className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 500 }}>
                        {latest.versionName}
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td><span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{latest?.fileSize || '—'}</span></td>
                  <td><span style={{ fontSize: 12 }}>{latest ? relTime(latest.uploadedAt) : '—'}</span></td>
                  <td>{st && <Badge tone={st.tone} dot>{st.label}</Badge>}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(fw.id); }}>
                      <Icon name="chevR" size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination — standard shared component (pagination.jsx) */}
        <window.Pagination
          total={filtered.length}
          totalUnfiltered={rows.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          unit="firmware"
          divider/>
      </window.ListCard>

      <style>{`
        .fw-modeltile {
          width: 38px; height: 38px; flex: none; display: grid; place-items: center;
          border-radius: 8px;
          background: oklch(96% 0.03 var(--fw-h, 262)); border: 1px solid var(--color-border-subtle);
          color: oklch(42% 0.10 var(--fw-h, 262)); font: 600 11px var(--font-family-mono); letter-spacing: -0.01em;
        }
        [data-theme="dark"] .fw-modeltile {
          background: oklch(29% 0.04 var(--fw-h, 262)); color: oklch(80% 0.08 var(--fw-h, 262));
        }
      `}</style>
    </div>
  );
};

window.FirmwareList = FirmwareList;
