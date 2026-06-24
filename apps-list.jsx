/* global React, Btn, Input, Icon, Badge, CompanyLogo, fmtDate, useToast */
// ─────────────────────────────────────────────────────────────
// Apps list — admin's cross-tenant view of every ISV-published app.
//
// Filter area + table treatment mirrors the top-level Merchants screen:
//   · Sticky condition area pinned to the viewport while scrolling
//   · Draft → Applied filter state, committed by an explicit Search button
//     (Enter in the search input also commits)
//   · Active-filter chip row appears after a search has been committed
//   · Table card uses overflow:visible so a sticky card-head + sticky thead
//     can layer below the toolbar without being clipped
//   · Rows-per-page selector + windowed pager + Go-to input
// ─────────────────────────────────────────────────────────────
const { useState: useStateAL, useMemo: useMemoAL, useRef: useRefAL, useEffect: useEffectAL } = React;

// ── CSV helpers (UTF-8, Excel/Sheets compatible) ──────────
const _alCsvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const _alCsvRow = (cells) => cells.map(_alCsvCell).join(',');
const _alToday = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportAppsCsv(rows, filename) {
  const header = ['App', 'Package', 'Publisher (ISV)', 'Category', 'Latest version', 'Status', 'Mode', 'Subscribers', 'Updated'];
  const lines = [_alCsvRow(header)];
  rows.forEach((a) => {
    const latest = a.latest;
    lines.push(_alCsvRow([
    a.name,
    a.package,
    a.publisherName,
    a.category || '',
    latest ? latest.name : '',
    window.APP_STATUS_TONE?.[a.status]?.label || a.status || '',
    window.APP_MODE_TONE?.[a.publishMode || 'public']?.label || a.publishMode || '',
    a.subscriberCount,
    latest ? latest.publishedAt || latest.uploadedAt || '' : '']
    ));
  });
  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;a.download = filename;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── App icon (square, hue-tinted) ─────────────────────────
const AppIcon = ({ app, size = 36 }) => {
  const hue = app.iconHue || '#5B7CFA';
  const letter = app.name.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.max(6, Math.round(size / 5)),
      background: `linear-gradient(135deg, ${hue}, ${hue}cc)`,
      color: '#fff', flex: 'none',
      display: 'grid', placeItems: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.4),
      letterSpacing: '-0.02em',
      boxShadow: '0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)'
    }}>{letter}</div>);

};

// ── Status pill (label + dot) ─────────────────────────────
const AppStatusPill = ({ app }) => {
  const s = window.APP_STATUS_TONE[app.status] || { label: app.status, tone: 'neutral' };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
};

const AppModePill = ({ app }) => {
  const m = window.APP_MODE_TONE[app.publishMode || 'public'] || { label: '—', tone: 'neutral' };
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
};

// Fallback FilterChip in case merchants-screen hasn't loaded yet.
const _FilterChipFallback = ({ label, onRemove }) =>
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '2px 4px 2px 8px', fontSize: 12, borderRadius: 999,
  background: 'var(--color-primary-50)', color: 'var(--color-primary-700)',
  border: '1px solid var(--color-primary-200, oklch(85% 0.05 265))'
}}>
    {label}
    {onRemove &&
  <button
    type="button"
    onClick={onRemove}
    title="Remove this filter"
    style={{
      display: 'grid', placeItems: 'center',
      width: 16, height: 16, padding: 0, borderRadius: 999,
      background: 'transparent', border: 0, cursor: 'pointer',
      color: 'var(--color-primary-700)', opacity: 0.7
    }}>
        <Icon name="x" size={9} />
      </button>
  }
  </span>;

// ── List screen ───────────────────────────────────────────
const AppList = ({ apps, onOpen, onOpenPublisher }) => {
  const toast = useToast();
  // ── Applied (committed) filter state — only changes on Search ──
  const [applied, setApplied] = useStateAL({
    q: '', publisherId: 'All', status: 'All', mode: 'All', category: 'All'
  });
  // ── Draft state — what the toolbar inputs hold right now ──
  const [draft, setDraft] = useStateAL({
    q: '', publisherId: 'All', status: 'All', mode: 'All', category: 'All'
  });
  const [pageSize, setPageSize] = useStateAL(25);
  const [page, setPage] = useStateAL(1);

  // ── Sticky toolbar ref (ListCard measures its own toolbarRef height) ──
  const toolbarRef = useRefAL(null);

  // Standard pagination bar (pagination.jsx)
  const PaginationBar = window.Pagination;

  // ── Publisher options (only ISV-bearing customers) ────
  const publisherOptions = useMemoAL(() => {
    const ids = new Set(apps.map((a) => a.publisherCustomerId));
    return (window.SEED_CUSTOMERS || []).
    filter((c) => ids.has(c.id)).
    map((c) => ({ id: c.id, name: c.name })).
    sort((a, b) => a.name.localeCompare(b.name));
  }, [apps]);

  // Derived row data (with helper fields for sort)
  const rows = useMemoAL(() => apps.map((a) => {
    const latest = a.versions.find((v) => v.current) || a.versions[0];
    const publisher = window.getAppPublisher(a);
    return {
      ...a,
      latest,
      publisherName: publisher?.name || '—',
      publisherCustomer: publisher,
      subscriberCount: (a.subscriberCustomerIds || []).length,
      updatedAt: latest?.publishedAt || latest?.uploadedAt || a.unpublishedAt || '1970-01-01T00:00:00Z'
    };
  }), [apps]);

  // Apply COMMITTED filters
  const filtered = useMemoAL(() => {
    let r = rows;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      r = r.filter((a) =>
      a.name.toLowerCase().includes(s) ||
      a.package.toLowerCase().includes(s)
      );
    }
    if (applied.status !== 'All') r = r.filter((a) => a.status === applied.status);
    if (applied.mode !== 'All') r = r.filter((a) => (a.publishMode || 'public') === applied.mode);
    if (applied.publisherId !== 'All') r = r.filter((a) => a.publisherCustomerId === applied.publisherId);
    if (applied.category !== 'All') r = r.filter((a) => a.category === applied.category);
    return r;
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffectAL(() => {if (page > totalPages) setPage(totalPages);}, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const hasFilters =
  !!applied.q ||
  applied.publisherId !== 'All' ||
  applied.status !== 'All' ||
  applied.mode !== 'All' ||
  applied.category !== 'All';

  // ListCard re-measures toolbar via ResizeObserver — no manual measurement needed.

  const runSearch = () => {setApplied({ ...draft });setPage(1);};
  const clearAll = () => {
    const blank = { q: '', publisherId: 'All', status: 'All', mode: 'All', category: 'All' };
    setDraft(blank);setApplied(blank);setPage(1);
  };
  const onKey = (e) => {if (e.key === 'Enter') runSearch();};

  // Resolved labels for the chip row.
  const pubLabel = (id) => publisherOptions.find((p) => p.id === id)?.name || id;
  const statusLabel = (s) => window.APP_STATUS_TONE?.[s]?.label || s;
  const modeLabel = (m) => window.APP_MODE_TONE?.[m]?.label || m;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Apps</h1>
          <p className="page__sub">All applications published by ISV customers on the TOMS platform.</p>
        </div>
      </div>

      {/* Sticky condition area — standard SearchBar + ActiveFilters */}
      <div ref={toolbarRef} className="list-toolbar-wrap" data-comment-anchor="1741d1d143-div-205-7">
        <window.SearchBar onSearch={runSearch} sticky={false}>
          <window.SearchInput
            value={draft.q}
            onChange={(v) => setDraft((d) => ({ ...d, q: v }))}
            onSearch={runSearch}
            placeholder="Search by app name or package" />
          <window.SearchCombo
            value={draft.publisherId}
            onChange={(v) => setDraft((d) => ({ ...d, publisherId: v }))}
            width={200}
            searchPlaceholder="Filter publishers…"
            emptyText="No matching ISVs"
            options={[
            { value: 'All', label: 'All publishers (ISVs)' },
            ...publisherOptions.map((p) => ({ value: p.id, label: p.name }))]
            } />
          <window.SearchSelect
            value={draft.status}
            onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
            width={140}
            options={[
            { value: 'All', label: 'All status' },
            { value: 'published', label: 'Published' },
            { value: 'unpublished', label: 'Unpublished' }]
            } />
          <window.SearchSelect
            value={draft.mode}
            onChange={(v) => setDraft((d) => ({ ...d, mode: v }))}
            width={150}
            options={[
            { value: 'All', label: 'All modes' },
            { value: 'public', label: 'All ISOs' },
            { value: 'private', label: 'Specified ISOs' }]
            } />
          <window.SearchSelect
            value={draft.category}
            onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            width={160}
            options={[
            { value: 'All', label: 'All categories' },
            ...(window.APP_CATEGORIES || []).map((c) => ({ value: c, label: c }))]
            } />
        </window.SearchBar>

        <window.ActiveFilters
          onClearAll={clearAll}
          hasFilters={hasFilters}>
          {applied.q ? <window.FilterChip label={`Search: ${applied.q}`} onRemove={() => {setApplied((a) => ({ ...a, q: '' }));setDraft((d) => ({ ...d, q: '' }));setPage(1);}} /> : null}
          {applied.publisherId !== 'All' ? <window.FilterChip label={`Publisher: ${pubLabel(applied.publisherId)}`} onRemove={() => {setApplied((a) => ({ ...a, publisherId: 'All' }));setDraft((d) => ({ ...d, publisherId: 'All' }));setPage(1);}} /> : null}
          {applied.status !== 'All' ? <window.FilterChip label={`Status: ${statusLabel(applied.status)}`} onRemove={() => {setApplied((a) => ({ ...a, status: 'All' }));setDraft((d) => ({ ...d, status: 'All' }));setPage(1);}} /> : null}
          {applied.mode !== 'All' ? <window.FilterChip label={`Mode: ${modeLabel(applied.mode)}`} onRemove={() => {setApplied((a) => ({ ...a, mode: 'All' }));setDraft((d) => ({ ...d, mode: 'All' }));setPage(1);}} /> : null}
          {applied.category !== 'All' ? <window.FilterChip label={`Category: ${applied.category}`} onRemove={() => {setApplied((a) => ({ ...a, category: 'All' }));setDraft((d) => ({ ...d, category: 'All' }));setPage(1);}} /> : null}
        </window.ActiveFilters>
      </div>{/* /sticky condition area */}

      {/* Standard list card — sticky head + sticky thead handled by CSS vars. */}
      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={`app${filtered.length === 1 ? '' : 's'}`}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="app"
            onExport={(scope, rows) => {
              const fname = scope === 'page' ?
              `apps_view_${_alToday()}.csv` :
              `apps_results_${_alToday()}.csv`;
              exportAppsCsv(rows, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} app${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }} />
        </window.ListCardHead>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>App</th>
              <th style={{ width: '22%' }}>Publisher (ISV)</th>
              <th style={{ width: '14%' }}>Category</th>
              <th style={{ width: '16%' }}>Latest version</th>
              <th style={{ width: '11%' }}>Status</th>
              <th style={{ width: '10%' }}>Mode</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ?
            <tr><td colSpan="7">
                <div className="empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  {hasFilters ? 'No apps match your search.' : 'No apps yet.'}
                </div>
              </td></tr> :
            pageRows.map((a) =>
            <tr key={a.id} onClick={() => onOpen(a.id)}>
                <td>
                  <div className="al-app">
                    <AppIcon app={a} />
                    <div style={{ minWidth: 0 }}>
                      <div className="al-app__name">{a.name}</div>
                      <div className="al-app__pkg">{a.package}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="al-pub">
                    <span className="al-pub__name">{a.publisherName}</span>
                    {a.publisherCustomer?.locked &&
                  <span className="cust-lockchip" title={a.publisherCustomer.lockReason || 'Access locked'}>
                        <Icon name="shield" size={10} /> LOCKED
                      </span>
                  }
                  </div>
                </td>
                <td><span style={{ fontSize: 14 }}>{a.category}</span></td>
                <td>
                  {a.latest ?
                <div>
                      <div className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, fontWeight: 500 }}>{a.latest.name}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>
                        {fmtDate(a.latest.publishedAt || a.latest.uploadedAt)}
                      </div>
                    </div> :

                <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>No versions yet</span>
                }
                </td>
                <td><AppStatusPill app={a} /></td>
                <td><AppModePill app={a} /></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="iconbtn" onClick={(e) => {e.stopPropagation();onOpen(a.id);}}>
                    <Icon name="chevR" size={14} />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination — standard shared component (pagination.jsx) */}
        {PaginationBar &&
        <PaginationBar
          total={filtered.length}
          totalUnfiltered={apps.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          unit="apps"
          divider />
        }
      </window.ListCard>
    </div>);

};

window.AppList = AppList;
window.AppIcon = AppIcon;
window.AppStatusPill = AppStatusPill;
window.AppModePill = AppModePill;