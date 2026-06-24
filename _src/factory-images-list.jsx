/* global React, Btn, Input, Icon, Badge, CompanyLogo, fmtDate, relTime, useToast,
   SearchBar, SearchInput, SearchSelect, SearchActions, ActiveFilters, FilterChip, useSearchBar */
// ─────────────────────────────────────────────────────────────
// Factory Images — list view.
//
// Each row is one factory pre-install spec. Columns: name · Models ·
// ISOs · Packages · Updated. Follows the standard list conventions
// (CLAUDE.md): SearchBar + ActiveFilters + ListCard + window.Pagination.
// ─────────────────────────────────────────────────────────────
const { useState: useStateFL, useMemo: useMemoFL, useRef: useRefFL, useEffect: useEffectFL } = React;

// ── CSV export (UTF-8 BOM) ──────────────────────────────────
const _fiCsvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const _fiToday = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportFactoryImagesCsv(rows, isoIndex, filename) {
  const header = ['Factory image', 'Models', 'ISOs', 'Packages', 'Total size', 'Updated', 'Updated by'];
  const lines = [header.map(_fiCsvCell).join(',')];
  rows.forEach((fi) => {
    const models = Object.keys(fi.payload?.byModel || {}).join('; ');
    lines.push([
      fi.name,
      models,
      fi.isoCustomerIds?.length || 0,
      window.factoryImageTotalPackageCount(fi),
      window.fmtBytes(window.factoryImageTotalSize(fi)),
      fmtDate(fi.updatedAt || fi.createdAt),
      fi.updatedBy || fi.createdBy || '',
    ].map(_fiCsvCell).join(','));
  });
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FactoryImageList = ({ images, onOpen, onNew }) => {
  const toast = useToast();
  const [page, setPage] = useStateFL(1);
  const [pageSize, setPageSize] = useStateFL(25);
  const toolbarRef = useRefFL(null);

  // Standard pending → applied search state.
  const { draft, applied, setDraft, runSearch: _runSearch, clearAll: _clearAll, clearOne, hasFilters } =
    useSearchBar({ q: '', model: 'All', iso: 'All' }, () => setPage(1));

  const runSearch = () => { _runSearch(); setPage(1); };
  const clearAll = () => { _clearAll(); setPage(1); };
  const removeOne = (key, reset) => { clearOne(key, reset); setPage(1); };

  const knownModels = window.getFactoryImageKnownModels?.() || [];
  const knownIsos = useMemoFL(
    () => (window.getFactoryImageEligibleIsos?.() || []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const isoName = (id) => knownIsos.find((c) => c.id === id)?.name || id;

  const kpis = useMemoFL(() => {
    const total    = images.length;
    const totalIsos = new Set(images.flatMap(fi => fi.isoCustomerIds || [])).size;
    return { total, totalIsos };
  }, [images]);

  const filtered = useMemoFL(() => {
    let r = images.slice();
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      r = r.filter(fi => fi.name.toLowerCase().includes(s));
    }
    if (applied.model !== 'All') r = r.filter(fi => Object.keys(fi.payload?.byModel || {}).includes(applied.model));
    if (applied.iso !== 'All') r = r.filter(fi => (fi.isoCustomerIds || []).includes(applied.iso));
    r.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    return r;
  }, [images, applied]);

  // ── Pagination slice ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffectFL(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Factory Images</h1>
          <p className="page__sub">
            A factory image is the pre-install spec the factory follows when flashing a fresh device: which firmware, system apps, and ISV apps to load, signed with the correct certificate. Each ISO is provisioned from one or more factory images depending on the batch.
          </p>
        </div>
        <div className="page__actions">
          <Btn variant="primary" icon="plus" onClick={onNew}>New factory image</Btn>
        </div>
      </div>

      <div className="tkt-kpi" style={{ padding: 0, marginBottom: 16, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="tkt-kpi__tile" style={{ cursor: 'default' }}>
          <div className="tkt-kpi__label">Factory images</div>
          <div className="tkt-kpi__val">{kpis.total.toLocaleString()}</div>
          <div className="tkt-kpi__sub">Published pre-install specs</div>
        </div>
        <div className="tkt-kpi__tile" style={{ cursor: 'default' }}>
          <div className="tkt-kpi__label">Bound ISOs</div>
          <div className="tkt-kpi__val">{kpis.totalIsos.toLocaleString()}</div>
          <div className="tkt-kpi__sub">Unique ISO customers</div>
        </div>
      </div>

      {/* Sticky condition area — standard SearchBar + ActiveFilters */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by name…"/>
          <SearchSelect
            value={draft.model}
            onChange={(v) => setDraft({ model: v })}
            width={140}
            options={[
              { value: 'All', label: 'All models' },
              ...knownModels.map((m) => ({ value: m, label: m })),
            ]}/>
          <SearchSelect
            value={draft.iso}
            onChange={(v) => setDraft({ iso: v })}
            width={200}
            options={[
              { value: 'All', label: 'All ISOs' },
              ...knownIsos.map((c) => ({ value: c.id, label: c.name })),
            ]}/>
        </SearchBar>

        <ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => removeOne('q', '')}/> : null}
          {applied.model !== 'All' ? <FilterChip label={`Model: ${applied.model}`} onRemove={() => removeOne('model', 'All')}/> : null}
          {applied.iso !== 'All' ? <FilterChip label={`ISO: ${isoName(applied.iso)}`} onRemove={() => removeOne('iso', 'All')}/> : null}
        </ActiveFilters>
      </div>

      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={filtered.length === 1 ? 'factory image' : 'factory images'}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="factory image"
            onExport={(scope, rows) => {
              const fname = scope === 'page'
                ? `factory_images_view_${_fiToday()}.csv`
                : `factory_images_results_${_fiToday()}.csv`;
              exportFactoryImagesCsv(rows, knownIsos, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} factory image${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Factory image</th>
              <th style={{ width: '20%' }}>Models</th>
              <th style={{ width: '14%' }}>ISOs</th>
              <th style={{ width: '16%' }}>Packages</th>
              <th style={{ width: '14%' }}>Updated</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="6"><div className="empty">No factory images match your filters.</div></td></tr>
            ) : pageRows.map(fi => {
              const models = Object.keys(fi.payload?.byModel || {});
              const isoCount = fi.isoCustomerIds?.length || 0;
              const pkgCount = window.factoryImageTotalPackageCount(fi);
              return (
                <tr key={fi.id} onClick={() => onOpen(fi.id)}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                      {fi.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {models.length === 0
                        ? <span className="muted" style={{ fontSize: 12 }}>None</span>
                        : models.map(m => (
                          <span key={m} className="fi-model-chip">{m}</span>
                        ))}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{isoCount}</span>
                    <span className="muted" style={{ fontSize: 11.5, marginLeft: 4 }}>{isoCount === 1 ? 'ISO' : 'ISOs'}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{pkgCount}</span>
                    <div className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }}>{window.fmtBytes(window.factoryImageTotalSize(fi))}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{relTime(fi.updatedAt || fi.createdAt)}</div>
                    <div className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }}>{fi.updatedBy || fi.createdBy}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(fi.id); }}>
                      <Icon name="chevR" size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <window.Pagination
          total={filtered.length}
          totalUnfiltered={images.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          unit="factory images" divider/>
      </window.ListCard>

      <style>{`
        .fi-model-chip {
          display: inline-flex; align-items: center;
          padding: 2px 7px; border-radius: 4px;
          font: 500 11px var(--font-family-mono); letter-spacing: 0.02em;
          background: var(--color-bg-3); color: var(--color-text-secondary);
          border: 1px solid var(--color-border-subtle);
        }
      `}</style>
    </div>
  );
};

window.FactoryImageList = FactoryImageList;
