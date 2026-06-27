/* global React, Btn, Input, Icon, Badge, ContractBadge, CompanyLogo, fmtDate, useToast */
const { useState: useStateCL, useMemo: useMemoCL, useRef: useRefCL, useEffect: useEffectCL } = React;

// Normalize contract status casing — seed data uses UPPERCASE, the wizard
// emits Pascal-case. We compare on uppercase throughout this file.
const _CS = (s) => String(s || '').toUpperCase();

// Customer-level status filter. Status dropdown operates on the underlying
// contract states (Active / Suspended / Terminated, plus derived Expired)
// and the entity status (ONBOARDING = no operators yet). Entity has no
// LOCKED state in the corrected domain model — admins manage access via
// per-contract suspension.
const STATUS_FILTERS = [
  { value: 'All',            label: 'All statuses' },
  { value: 'HAS_ACTIVE',     label: 'With active contract' },
  { value: 'HAS_PILOT',      label: 'In pilot' },
  { value: 'HAS_EXPIRED',    label: 'With expired contract' },
  { value: 'HAS_SUSPENDED',  label: 'With suspended contract' },
  { value: 'ONBOARDING',     label: 'Onboarding' },
  { value: 'ALL_TERMINATED', label: 'All terminated' },
];

const _statusLabel = (v) => STATUS_FILTERS.find(f => f.value === v)?.label || v;

// Fallback FilterChip if merchants-screen hasn't loaded yet.
const _CLFilterChip = ({ label, onRemove }) =>
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '2px 4px 2px 8px', fontSize: 11, borderRadius: 999,
    background: 'var(--color-primary-50)', color: 'var(--color-primary-700)',
    border: '1px solid var(--color-primary-200, oklch(85% 0.05 265))'
  }}>
    {label}
    {onRemove && (
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
    )}
  </span>;

// Single-select with inline "clear" affordance when value !== 'All'.
const CLFilterSelect = ({ value, onChange, options, width, minWidth }) => {
  const isCleared = value === 'All';
  const style = width ? { width } : { minWidth };
  return (
    <div className="tds-select tds-select--md" style={{ ...style, position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {!isCleared ? (
        <button
          type="button"
          title="Clear"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange('All'); }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, padding: 0,
            background: 'var(--color-bg-3)', border: 0, borderRadius: 4,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', zIndex: 1
          }}>
          <Icon name="x" size={10} />
        </button>
      ) : (
        <span className="tds-select__chevron"><Icon name="chevD" size={14}/></span>
      )}
    </div>
  );
};

// ─── CSV export helpers (mirror merchants-screen) ───────────
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
function exportCustomersCsv(rows, filename) {
  const header = ['Customer', 'Entity status', 'Registered', 'Address', 'License', 'Live contracts'];
  const lines = [_csvRow(header)];
  rows.forEach((c) => {
    const live = (c.contracts || []).filter(k => _CS(k.status) !== 'TERMINATED');
    const liveDesc = live.map(k => `${k.kind}:${window.effectiveStatus ? window.effectiveStatus(k, c.timezone) : k.status}`);
    const es = window.entityStatus ? window.entityStatus(c) : '';
    lines.push(_csvRow([c.name, es, c.registeredAt, c.address || '', c.license || '', liveDesc]));
  });
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Export menu — now provided by the shared <window.ListExportMenu>. ──


const CustomerList = ({ customers, onOpen, onNew }) => {
  const toast = useToast();
  // ── Applied (committed) vs Draft filter state ──
  const [applied, setApplied] = useStateCL({ q: '', status: 'All', contract: 'All' });
  const [draft, setDraft]     = useStateCL({ q: '', status: 'All', contract: 'All' });

  const [sortBy, setSortBy] = useStateCL('registeredAt');
  const [sortDir, setSortDir] = useStateCL('desc');

  // ── Pagination (merchants pattern) ──
  const [pageSize, setPageSize] = useStateCL(25);
  const [page, setPage] = useStateCL(1);

  // ── Sticky band measurement ──
  const toolbarRef = useRefCL(null);
  const cardHeadRef = useRefCL(null);
  const [toolbarH, setToolbarH] = useStateCL(0);
  const [cardHeadH, setCardHeadH] = useStateCL(0);

  const FilterChip = window.MerchantsFilterChip || _CLFilterChip;
  // Standard pagination bar (pagination.jsx)
  const PaginationBar = window.Pagination;

  const filtered = useMemoCL(() => {
    let rows = customers;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      rows = rows.filter(c => c.name.toLowerCase().includes(s) || (c.address || '').toLowerCase().includes(s));
    }
    if (applied.contract !== 'All') rows = rows.filter(c => c.contracts.some(k => _CS(k.kind) === _CS(applied.contract) && window.effectiveStatus(k, c.timezone) !== 'TERMINATED'));
    if (applied.status !== 'All') {
      rows = rows.filter(c => {
        const live = c.contracts.filter(k => {
          const eff = window.effectiveStatus(k, c.timezone);
          return eff !== 'TERMINATED' && eff !== 'EXPIRED';
        });
        switch (applied.status) {
          case 'HAS_ACTIVE':     return window.entityStatus(c) === 'ACTIVE';
          case 'HAS_PILOT':      return c.contracts.some(k => window.contractIsPilot(k) && window.effectiveStatus(k, c.timezone) !== 'TERMINATED');
          case 'HAS_EXPIRED':    return c.contracts.some(k => window.effectiveStatus(k, c.timezone) === 'EXPIRED');
          case 'HAS_SUSPENDED':  return live.some(k => _CS(k.status) === 'SUSPENDED');
          case 'ONBOARDING':     return window.entityStatus(c) === 'ONBOARDING';
          case 'ALL_TERMINATED': return c.contracts.length > 0 && c.contracts.every(k => _CS(k.status) === 'TERMINATED');
          default: return true;
        }
      });
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      const r = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return rows;
  }, [customers, applied, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffectCL(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const hasFilters = !!applied.q || applied.status !== 'All' || applied.contract !== 'All';

  useEffectCL(() => {
    const measure = () => {
      setToolbarH(toolbarRef.current?.offsetHeight || 0);
      setCardHeadH(cardHeadRef.current?.offsetHeight || 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [hasFilters, filtered.length]);

  const runSearch = () => { setApplied({ ...draft }); setPage(1); };
  const onKey = (e) => { if (e.key === 'Enter') runSearch(); };
  // Per ui-spec §6: remove one applied condition = reset that field on BOTH
  // applied + draft (keep condition area in sync) and return to page 1.
  const removeOne = (key, blank) => {
    setApplied(a => ({ ...a, [key]: blank }));
    setDraft(d => ({ ...d, [key]: blank }));
    setPage(1);
  };
  const contractChipLabel = (v) => ({ ISV: 'ISV', ISO: 'ISO', MERCHANT: 'Merchant' }[v] || v);
  const statusChipLabel = (v) => (STATUS_FILTERS.find(f => f.value === v) || {}).label || v;

  const sortCell = (key, label) => (
    <span className="tds-table__sort" onClick={() => {
      if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortBy(key); setSortDir('asc'); }
    }}>
      {label}
      <span style={{ opacity: sortBy === key ? 1 : 0.3, fontSize: 9 }}>{sortBy === key && sortDir === 'asc' ? '▲' : '▼'}</span>
    </span>
  );

  return (
    <div className="page page--list cust-list-page">
      <window.TitleBar
        title="Customers"
        subtitle="Maintain customer companies, their contracts and operators."
        actions={<Btn variant="primary" icon="plus" size="md" onClick={onNew}>New customer</Btn>}
      />

      {/* Condition area — standard SearchBar. Per ui-spec §7.2 it scrolls with
          the content (not sticky). Per ui-spec §6 (始终渲染): whenever ≥1
          condition is applied — even with inline, always-visible controls — an
          Active filters chip row renders below the condition area, each chip
          removable via × (no "Clear all"). */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
        <window.SearchBar onSearch={runSearch} sticky={false}>
          <window.SearchInput
            value={draft.q}
            onChange={(v) => setDraft(d => ({ ...d, q: v }))}
            onSearch={runSearch}
            placeholder="Search by customer name or address"/>
          <window.SearchSelect
            value={draft.contract}
            onChange={(v) => setDraft(d => ({ ...d, contract: v }))}
            width={150}
            options={[
              { value: 'All', label: 'All contracts' },
              { value: 'ISV', label: 'ISV' },
              { value: 'ISO', label: 'ISO' },
              // Seed data stores contract.kind UPPERCASE (see data-tables.jsx
              // CONTRACT_TYPES). Filter values must match that casing — the
              // comparison is normalized via _CS() in the filter, but using
              // the canonical UPPERCASE value here keeps things consistent
              // across the wire (chip labels still render Title-cased).
              { value: 'MERCHANT', label: 'Merchant' },
            ]}/>
          <window.SearchSelect
            value={draft.status}
            onChange={(v) => setDraft(d => ({ ...d, status: v }))}
            width={240}
            options={STATUS_FILTERS.map(f => ({ value: f.value, label: f.label }))}/>
        </window.SearchBar>

        <window.ActiveFilters hasFilters={hasFilters}>
          {applied.q ? <window.FilterChip label={`Search: ${applied.q}`} onRemove={() => removeOne('q', '')}/> : null}
          {applied.contract !== 'All' ? <window.FilterChip label={`Contract: ${contractChipLabel(applied.contract)}`} onRemove={() => removeOne('contract', 'All')}/> : null}
          {applied.status !== 'All' ? <window.FilterChip label={`Status: ${statusChipLabel(applied.status)}`} onRemove={() => removeOne('status', 'All')}/> : null}
        </window.ActiveFilters>
      </div>{/* /condition area */}

      <div className="list-card-wrap">
        <window.ListCard toolbarRef={toolbarRef}>
          <window.ListCardHead
            count={filtered.length}
            unit={`customer${filtered.length === 1 ? '' : 's'}`}
            hasFilters={hasFilters}>
            <window.ListExportMenu
              pageRows={pageRows}
              filtered={filtered}
              unit="customer"
              onExport={(scope, rows) => {
                const fname = scope === 'page'
                  ? `customers_view_${_today()}.csv`
                  : `customers_results_${_today()}.csv`;
                exportCustomersCsv(rows, fname);
                toast({
                  kind: 'success',
                  title: 'Export downloaded',
                  desc: `${rows.length.toLocaleString()} customer${rows.length === 1 ? '' : 's'} · ${fname}`
                });
              }}/>
          </window.ListCardHead>
          <table className="tds-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Customer</th>
                <th style={{ width: '13%' }}>Status</th>
                <th style={{ width: '16%' }}>{sortCell('registeredAt', 'Registered')}</th>
                <th>Contracts</th>
                <th style={{ width: 60, textAlign: 'right' }}></th>
              </tr>
            </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5">
                <div className="empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  {hasFilters ? 'No customers match your search.' : 'No customers yet.'}
                </div>
              </td></tr>
            ) : pageRows.map(c => {
              const liveContracts = c.contracts.filter(k => _CS(k.status) !== 'TERMINATED');
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)}>
                  <td>
                    <div className="cust-cell">
                      <CompanyLogo name={c.name}/>
                      <div>
                        <div className="cust-name">{c.name}</div>
                        <div className="cust-meta">{c.address.split(',').slice(-2).join(',').trim()}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const es = window.entityStatus(c);
                      const meta = window.entityStatusMeta(es);
                      const live = c.contracts.filter(k => window.effectiveStatus(k, c.timezone) !== 'TERMINATED');
                      const allPilot = live.length > 0 && live.every(k => window.contractIsPilot(k));
                      return (
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                          <Badge tone={meta.tone} dot>{meta.label}</Badge>
                          {allPilot && (
                            <span
                              className="tds-badge tds-badge--pilot"
                              style={{ fontSize: 10.5 }}
                              title="All live contracts are PILOT — trial-to-active candidate">
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>
                              Pilot
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ fontSize: 13.5 }}>{fmtDate(c.registeredAt)}</div>
                  </td>
                  <td>
                    <div className="badge-row">
                      {liveContracts.length === 0 ? (
                        <span className="muted" style={{ fontSize: 12.5 }} title="No live contracts">—</span>
                      ) : liveContracts.map((k, i) => (
                        <ContractBadge
                          key={i}
                          kind={k.kind}
                          status={k.status}
                          effectiveFrom={k.effectiveFrom}
                          effectiveTo={k.effectiveTo}
                          terminatedAt={k.terminatedAt}
                        />
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}>
                      <Icon name="chevR" size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {PaginationBar && (
          <PaginationBar
            total={filtered.length}
            totalUnfiltered={customers.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
            unit="customers"
            divider/>
        )}
        </window.ListCard>
      </div>
    </div>
  );
};

window.CustomerList = CustomerList;
