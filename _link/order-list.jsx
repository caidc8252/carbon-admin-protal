/* global React, Btn, Input, Icon, Badge, CompanyLogo, ModelTile, fmtDate, fmtDateTime, relTime, useToast,
   SEED_ORDERS, ORDER_STATUSES, ORDER_STATUS_TONE,
   orderTotal, orderQty, orderSubtotal, deviceProgress, moneyUSD, DEVICE_MODELS,
   SearchBar, SearchInput, SearchSelect, SearchActions, ActiveFilters, FilterChip, useSearchBar */
const { useState, useMemo, useRef } = React;

const ORDER_SEARCH_DEFAULTS = { q: '', status: 'All' };

// ── CSV export (UTF-8 BOM, Excel/Sheets friendly) ──────────
const _olCsvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const _olToday = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportOrdersCsv(rows, filename) {
  const header = ['Order', 'Customer', 'Products', 'Units', 'Total (USD)', 'Discount %', 'Status', 'Created'];
  const lines = [header.map(_olCsvCell).join(',')];
  rows.forEach((o) => {
    const products = (o.items || []).map((i) => `${i.modelName} ×${i.qty}`).join('; ');
    lines.push([
      o.number,
      o.customerName,
      products,
      orderQty(o),
      orderTotal(o),
      o.discountPct || 0,
      o.status,
      fmtDate(o.createdAt),
    ].map(_olCsvCell).join(','));
  });
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const OrderList = ({ orders, onOpen, onNew, onBack, backLabel }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const toolbarRef = useRef(null);

  // Shared pending → applied search pattern (R-01)
  const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
    useSearchBar(ORDER_SEARCH_DEFAULTS, () => setPage(1));

  const filtered = useMemo(() => {
    let rows = orders;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      rows = rows.filter(o => o.customerName.toLowerCase().includes(s));
    }
    if (applied.status !== 'All') rows = rows.filter(o => o.status === applied.status);
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      const r = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return rows;
  }, [orders, applied, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

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
    <div className="page">
      {onBack && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 13 }}>
            <Icon name="chevL" size={14}/> {backLabel || 'Back'}
          </button>
        </div>
      )}
      <div className="page__head">
        <div>
          <h1 className="page__title">Orders</h1>
          <p className="page__sub">Create and track sample device orders for customer companies. Maintain device activation records before shipment.</p>
        </div>
      </div>

      <div ref={toolbarRef} className="list-toolbar-wrap">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by customer name…"/>
          <SearchSelect
            value={draft.status}
            onChange={(v) => setDraft({ status: v })}
            options={[
              { value: 'All', label: 'All statuses' },
              ...ORDER_STATUSES.map(s => ({ value: s, label: s }))
            ]}/>
        </SearchBar>

        <ActiveFilters
          onClearAll={clearAll}
          hasFilters={hasFilters}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
          {applied.status !== 'All' ? <FilterChip label={`Status: ${applied.status}`} onRemove={() => clearOne('status', 'All')}/> : null}
        </ActiveFilters>
      </div>

      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={`order${filtered.length === 1 ? '' : 's'}`}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="order"
            onExport={(scope, rows) => {
              const fname = scope === 'page'
                ? `orders_view_${_olToday()}.csv`
                : `orders_results_${_olToday()}.csv`;
              exportOrdersCsv(rows, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} order${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <colgroup>
            <col style={{ width: '1%' }}/>
            <col/>
            <col/>
            <col style={{ width: '1%' }}/>
            <col style={{ width: '1%' }}/>
            <col style={{ width: '1%' }}/>
            <col style={{ width: '40px' }}/>
          </colgroup>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>{sortCell('number', 'Order')}</th>
              <th>Customer</th>
              <th>Goods</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
              <th style={{ whiteSpace: 'nowrap' }}>{sortCell('status', 'Status')}</th>
              <th style={{ whiteSpace: 'nowrap' }}>{sortCell('createdAt', 'Created')}</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="7"><div className="empty">No orders match your filters.</div></td></tr>
            ) : pageRows.map(o => {
              const prog = deviceProgress(o);
              const showProgress = o.status === 'Awaiting shipment';
              return (
                <tr key={o.id} onClick={() => onOpen(o.id)}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{o.number}</div>
                  </td>
                  <td>
                    <div className="cust-cell">
                      <CompanyLogo name={o.customerName} size={28}/>
                      <div>
                        <div className="cust-name">{o.customerName}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {o.items.slice(0, 2).map((i, idx) => {
                      const mm = DEVICE_MODELS.find(x => x.id === i.modelId) || { name: i.modelName, image: null };
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: idx === 0 && o.items.length > 1 ? 4 : 0 }}>
                          <ModelTile model={mm} px={35}/>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{i.modelName}</span>
                          <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>× {i.qty}</span>
                        </div>
                      );
                    })}
                    {o.items.length > 2 ? (
                      <div className="cust-meta" style={{ marginTop: 4 }}>+{o.items.length - 2} more · {orderQty(o)} units total</div>
                    ) : o.items.length > 1 ? (
                      <div className="cust-meta" style={{ marginTop: 4 }}>{orderQty(o)} units total</div>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="num">
                    <div>
                      {orderTotal(o) === 0
                        ? <span style={{ color: 'var(--color-success-700)', fontWeight: 600 }}>Free</span>
                        : moneyUSD(orderTotal(o))}
                    </div>
                    {o.discountPct > 0 && (
                      <div className="cust-meta" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                        <Icon name="gift" size={10} style={{ verticalAlign: '-1px' }}/>
                        {o.discountPct === 100 ? 'Complimentary' : `${o.discountPct}% off`}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <Badge tone={ORDER_STATUS_TONE[o.status] || 'neutral'} dot>{o.status}</Badge>
                      {showProgress && prog.total > 0 && (
                        <div className="cust-meta num" title="Devices activated / total">
                          {prog.done}/{prog.total} activated
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13 }}>{fmtDate(o.createdAt)}</div>
                    <div className="cust-meta">{relTime(o.createdAt)}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(o.id); }}>
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
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage} totalPages={totalPages} pageSize={pageSize}
          setPage={setPage} setPageSize={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          unit="orders" divider />
      </window.ListCard>
    </div>
  );
};

window.OrderList = OrderList;


