/* global React, Btn, Input, Icon, Badge, useToast */
// ─────────────────────────────────────────────────────────────
// Top-level Merchants module — standalone sidebar item after Customers.
//
// Lists ALL merchants across every ISO. Follows the standard list
// conventions from CLAUDE.md:
//   · search-bar.jsx  → SearchBar / SearchInput / SearchSelect / ActiveFilters
//   · search-bar.jsx  → ListCard / ListCardHead / ListExportMenu
//   · pagination.jsx  → window.Pagination
// The TagsMultiSelect is a bespoke control (no standard multi-select yet)
// and is dropped into the SearchBar as a normal field child.
//
// The drill-in detail view reuses MerchantViewReadonly so behavior is
// identical to the customer-side view.
// ─────────────────────────────────────────────────────────────
const { useState: useStateMS, useMemo: useMemoMS, useRef: useRefMS, useEffect: useEffectMS } = React;

// ─── ISO lookup ────────────────────────────────────────────
// Map c-XXX → ISO customer name. SEED_CUSTOMERS holds all customers.
const useIsoIndex = () => useMemoMS(() => {
  const customers = window.SEED_CUSTOMERS || [];
  const index = new Map();
  customers.forEach((c) => index.set(c.id, c));
  return index;
}, []);


// ─── CSV export helpers ────────────────────────────────────
const _csvCell = (v) => {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
const _csvRow = (cells) => cells.map(_csvCell).join(',');
const _today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportMerchantsCsv(rows, isoIndex, filename) {
  const header = ['Merchant', 'MID', 'Country', 'Owning ISO', 'ISO ID', 'Tags'];
  const lines = [_csvRow(header)];
  rows.forEach((m) => {
    const isoName = m.isoId ? isoIndex.get(m.isoId)?.name || m.isoId : '';
    lines.push(_csvRow([m.name, m.mid || '', m.country || '', isoName, m.isoId || '', m.tags || []]));
  });
  const csv = '\ufeff' + lines.join('\r\n'); // BOM so Excel reads UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;a.download = filename;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ─── Multi-select tags dropdown (bespoke — kept) ───────────
const TagsMultiSelect = ({ allTags, value, onChange }) => {
  const [open, setOpen] = useStateMS(false);
  const ref = useRefMS(null);
  useEffectMS(() => {
    if (!open) return;
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (t) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));else
    onChange([...value, t]);
  };
  const summary = value.length === 0 ?
  'All tags' :
  value.length === 1 ?
  value[0] :
  `${value.length} tags`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tds-select tds-select--md"
        style={{
          width: 180, padding: '0 10px', height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-bg-2)', cursor: 'pointer',
          border: '1px solid var(--color-border-default)', borderRadius: 8,
          fontSize: 14, color: value.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        {value.length > 0 ?
        <span
          role="button"
          title="Clear tags"
          onMouseDown={(e) => {e.preventDefault();e.stopPropagation();onChange([]);}}
          style={{
            display: 'grid', placeItems: 'center', width: 16, height: 16,
            borderRadius: 4, color: 'var(--color-text-tertiary)', cursor: 'pointer',
            marginLeft: 6, flex: 'none'
          }}
          onMouseEnter={(e) => {e.currentTarget.style.background = 'var(--color-bg-hover)';e.currentTarget.style.color = 'var(--color-text-primary)';}}
          onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';e.currentTarget.style.color = 'var(--color-text-tertiary)';}}>
            <Icon name="x" size={10} />
          </span> :

        <Icon name="chevD" size={14} />
        }
      </button>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
        minWidth: 220, maxHeight: 320, overflowY: 'auto',
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-default)',
        borderRadius: 8, boxShadow: 'var(--shadow-3, 0 8px 24px rgba(0,0,0,0.10))',
        padding: 6
      }}>
          {value.length > 0 &&
        <button
          type="button"
          onClick={() => onChange([])}
          style={{
            width: '100%', textAlign: 'left',
            padding: '7px 10px', borderRadius: 6, border: 0,
            background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: 'var(--color-text-tertiary)'
          }}>
              Clear selection
            </button>
        }
          {allTags.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '7px 10px', borderRadius: 6, border: 0,
                background: on ? 'var(--color-primary-50)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 14, color: 'var(--color-text-primary)'
              }}
              onMouseEnter={(e) => {if (!on) e.currentTarget.style.background = 'var(--color-bg-hover)';}}
              onMouseLeave={(e) => {if (!on) e.currentTarget.style.background = 'transparent';}}>
                <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: '1px solid ' + (on ? 'var(--color-primary-500)' : 'var(--color-border-default)'),
                background: on ? 'var(--color-primary-500)' : 'var(--color-bg-2)',
                display: 'grid', placeItems: 'center', color: '#fff', flex: 'none'
              }}>
                  {on && <Icon name="check" size={10} />}
                </span>
                <span>{t}</span>
              </button>);

        })}
        </div>
      }
    </div>);

};


// ─── Merchants list (top-level screen) ─────────────────────
const MerchantsListScreen = ({ onOpen }) => {
  const merchants = window.MERCHANTS || [];
  const isoIndex = useIsoIndex();
  const toast = useToast();

  // ─── Standard search-bar state (draft vs applied) ──────────
  const { draft, applied, setDraft, runSearch: _runSearch, clearAll: _clearAll, clearOne, hasFilters } =
  window.useSearchBar({ q: '', isoId: 'All', tags: [] });

  // ─── Pagination state ──────────────────────────────────────
  const [pageSize, setPageSize] = useStateMS(25);
  const [page, setPage] = useStateMS(1);

  // Sticky toolbar ref — ListCard measures its height to offset thead.
  const toolbarRef = useRefMS(null);

  const runSearch = () => {_runSearch();setPage(1);};
  const clearAll = () => {_clearAll();setPage(1);};
  const removeOne = (key, reset) => {clearOne(key, reset);setPage(1);};

  // ISOs that own at least one merchant (only offer options with results).
  const isoOptions = useMemoMS(() => {
    const ids = new Set();
    merchants.forEach((m) => {if (m.isoId) ids.add(m.isoId);});
    return [...ids].
    map((id) => ({ id, name: isoIndex.get(id)?.name || id })).
    sort((a, b) => a.name.localeCompare(b.name));
  }, [merchants, isoIndex]);

  // All distinct tags across all merchants.
  const allTags = useMemoMS(() => {
    const s = new Set();
    merchants.forEach((m) => (m.tags || []).forEach((t) => s.add(t)));
    return [...s].sort();
  }, [merchants]);

  // Filter rows using the APPLIED (committed) state.
  const filtered = useMemoMS(() => {
    return merchants.filter((m) => {
      if (applied.q.trim()) {
        if (!m.name.toLowerCase().includes(applied.q.trim().toLowerCase())) return false;
      }
      if (applied.isoId !== 'All' && m.isoId !== applied.isoId) return false;
      if (applied.tags.length > 0) {
        if (!applied.tags.every((t) => (m.tags || []).includes(t))) return false;
      }
      return true;
    });
  }, [merchants, applied]);

  // ─── Pagination slice ──────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  React.useEffect(() => {if (page > totalPages) setPage(totalPages);}, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Merchants</h1>
          <p className="page__sub">All merchants onboarded by ISO customers. Read-only — edit from each ISO's portal.</p>
        </div>
      </div>

      {/* Sticky condition area — standard SearchBar + ActiveFilters */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
        <window.SearchBar onSearch={runSearch} sticky={false}>
          <window.SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by merchant name"/>
          <window.SearchSelect
            value={draft.isoId}
            onChange={(v) => setDraft({ isoId: v })}
            width={200}
            options={[
              { value: 'All', label: 'All ISOs' },
              ...isoOptions.map((o) => ({ value: o.id, label: o.name })),
            ]}/>
          <TagsMultiSelect
            allTags={allTags}
            value={draft.tags}
            onChange={(tags) => setDraft({ tags })}/>
        </window.SearchBar>

        <window.ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
          {applied.q ? <window.FilterChip label={`Name: ${applied.q}`} onRemove={() => removeOne('q', '')}/> : null}
          {applied.isoId !== 'All' ? <window.FilterChip label={`ISO: ${isoIndex.get(applied.isoId)?.name || applied.isoId}`} onRemove={() => removeOne('isoId', 'All')}/> : null}
          {applied.tags.map((t) =>
            <window.FilterChip key={t} label={`Tag: ${t}`} onRemove={() => removeOne('tags', applied.tags.filter((x) => x !== t))}/>
          )}
        </window.ActiveFilters>
      </div>{/* /sticky condition area */}

      {/* Standard list card — sticky head + sticky thead handled by CSS vars. */}
      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={filtered.length === 1 ? 'merchant' : 'merchants'}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="merchant"
            onExport={(scope, rows) => {
              const fname = scope === 'page'
                ? `merchants_view_${_today()}.csv`
                : `merchants_results_${_today()}.csv`;
              exportMerchantsCsv(rows, isoIndex, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} merchant${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Merchant</th>
              <th style={{ width: '14%' }}>Country</th>
              <th style={{ width: '22%' }}>Owning ISO</th>
              <th>Tags</th>
              <th style={{ width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ?
            <tr><td colSpan="5">
                <div className="empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  {hasFilters ?
                  'No merchants match your search.' :
                  'No merchants yet. They will appear here once ISOs onboard them.'}
                </div>
              </td></tr> :
            pageRows.map((m) => {
              const iso = m.isoId ? isoIndex.get(m.isoId) : null;
              return (
                <tr key={m.id} onClick={() => onOpen(m)}>
                  <td>
                    <div className="al-app">
                      {window.MerchantMonogram ?
                      <window.MerchantMonogram name={m.name} size={32} /> :
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--color-bg-3)' }} />
                      }
                      <div style={{ minWidth: 0 }}>
                        <div className="al-app__name">{m.name}</div>
                        <div className="al-app__pkg" style={{ fontFamily: 'var(--font-family-mono)' }}>{m.mid}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 14 }}>{m.country}</span></td>
                  <td>
                    {iso ?
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                        <Icon name="building" size={12} />
                        {iso.name}
                      </span> :

                    <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>Unassigned</span>
                    }
                  </td>
                  <td>
                    {(m.tags || []).length === 0 ?
                    <span className="muted" style={{ fontSize: 12 }}>—</span> :

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(m.tags || []).map((t) =>
                      window.CMTagChip ?
                      <window.CMTagChip key={t} t={t} /> :
                      <span key={t} style={{
                        fontSize: 12, padding: '2px 8px', borderRadius: 999,
                        background: 'var(--color-bg-3)', color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-subtle)'
                      }}>{t}</span>
                      )}
                      </div>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(e) => {e.stopPropagation();onOpen(m);}}>
                      <Icon name="chevR" size={14} />
                    </button>
                  </td>
                </tr>);

            })}
          </tbody>
        </table>

        {/* Pagination — standard shared component (pagination.jsx) */}
        <window.Pagination
          total={filtered.length}
          totalUnfiltered={merchants.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          unit="merchants"
          divider/>
      </window.ListCard>
    </div>);

};


// ─── Detail wrapper — reuse the customer-side read-only view ─
const MerchantsDetailScreen = ({ merchant, onBack, maskOn = false }) => {
  const isoIndex = useIsoIndex();
  const customerName = merchant.isoId ?
  isoIndex.get(merchant.isoId)?.name || merchant.isoId :
  '—';
  if (!window.MerchantViewReadonly) {
    return <div className="page"><div className="empty">Merchant view component not loaded.</div></div>;
  }
  return (
    <div className="page">
      <window.MerchantViewReadonly
        merchant={merchant}
        customerName={customerName}
        maskOn={maskOn}
        standalone
        onBack={onBack} />
    </div>);

};

window.MerchantsListScreen = MerchantsListScreen;
window.MerchantsDetailScreen = MerchantsDetailScreen;
