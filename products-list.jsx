/* global React, Btn, Icon, Badge, useToast,
   SEED_PRODUCTS, SEED_CATEGORIES, categoryPathLabel,
   formatPriceRange, skusSummary, PRODUCT_STATUS_TONE, PRODUCT_STATUS_LABEL,
   SearchBar, SearchInput, SearchSelect, ActiveFilters, FilterChip, useSearchBar */
const { useState, useMemo, useEffect, useRef } = React;

// ─── CSV export (UTF-8 BOM, Excel/Sheets friendly) ──────────────
const _plCsvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const _plToday = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportProductsCsv(rows, cats, filename) {
  const header = ['Product', 'Category', 'Status', 'Price'];
  const lines = [header.map(_plCsvCell).join(',')];
  rows.forEach((p) => {
    lines.push([
      p.name,
      window.categoryPathLabel ? window.categoryPathLabel(cats, p.categoryId) : '',
      window.PRODUCT_STATUS_LABEL[p.status] || p.status,
      formatPriceRange(p),
    ].map(_plCsvCell).join(','));
  });
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ProductList = ({ products, categories, onOpen, onNew, onDelete, onManageCategories }) => {
  const toast = useToast();
  const cats = categories || window.SEED_CATEGORIES || [];
  // Category options (flattened, indented) for the filter.
  const catOptions = useMemo(() => {
    const flat = window.flattenCategoryTree ? window.flattenCategoryTree(cats) : cats.map((c) => ({ ...c, depth: 0 }));
    return [{ value: 'ALL', label: 'All categories' }].concat(
      flat.map((c) => ({ value: c.id, label: `${'\u00A0\u00A0'.repeat(c.depth)}${c.name}` }))
    );
  }, [cats]);

  const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
    useSearchBar({ q: '', status: 'ALL', category: 'ALL' }, () => setPage(1));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const toolbarRef = useRef(null);

  const newProductBtn = (
    <div style={{ display: 'flex', gap: 8 }}>
      {onManageCategories && <Btn variant="secondary" icon="settings" size="md" onClick={onManageCategories}>Categories</Btn>}
      <Btn variant="primary" icon="plus" size="md" onClick={onNew}>New product</Btn>
    </div>
  );

  const filtered = useMemo(() => {
    let rows = products;
    if (applied.status !== 'ALL') rows = rows.filter((p) => p.status === applied.status);
    if (applied.category !== 'ALL') {
      const ids = window.categoryDescendantIds
        ? new Set(window.categoryDescendantIds(cats, applied.category))
        : new Set([applied.category]);
      rows = rows.filter((p) => ids.has(p.categoryId));
    }
    const s = applied.q.trim().toLowerCase();
    if (s) {
      rows = rows.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        (p.desc || '').toLowerCase().includes(s)
      );
    }
    return rows;
  }, [products, applied, cats]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const catName = (id) => (window.categoryPathLabel ? window.categoryPathLabel(cats, id) : (cats.find((c) => c.id === id)?.name || '—'));

  return (
    <div className="page page--list">
      <window.TitleBar
        title="Products"
        subtitle="Create, edit, and control which products are available to order."
        actions={newProductBtn}
      />

      <div ref={toolbarRef} className="list-toolbar-wrap">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by name or description…"/>
          <SearchSelect
            value={draft.category}
            onChange={(v) => setDraft({ category: v })}
            options={catOptions}/>
          <SearchSelect
            value={draft.status}
            onChange={(v) => setDraft({ status: v })}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}/>
        </SearchBar>

        <ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
          {applied.category !== 'ALL' ? <FilterChip label={`Category: ${catName(applied.category)}`} onRemove={() => clearOne('category', 'ALL')}/> : null}
          {applied.status !== 'ALL' ? <FilterChip label={`Status: ${window.PRODUCT_STATUS_LABEL[applied.status]}`} onRemove={() => clearOne('status', 'ALL')}/> : null}
        </ActiveFilters>
      </div>

      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={`product${filtered.length === 1 ? '' : 's'}`}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="product"
            onExport={(scope, rows) => {
              const fname = scope === 'page'
                ? `products_view_${_plToday()}.csv`
                : `products_results_${_plToday()}.csv`;
              exportProductsCsv(rows, cats, fname);
              toast({ kind: 'success', title: 'Export downloaded', desc: `${rows.length} product${rows.length === 1 ? '' : 's'} · ${fname}` });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <colgroup>
            <col style={{ width: '1%' }}/>
            <col/>
            <col style={{ width: '200px' }}/>
            <col style={{ width: '110px' }}/>
            <col style={{ width: '160px' }}/>
            <col style={{ width: '40px' }}/>
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="6"><div className="empty">{hasFilters ? 'No products match your filters.' : 'No products yet.'}</div></td></tr>
            ) : pageRows.map((p) => (
              <tr key={p.id} onClick={() => onOpen(p.id)}>
                <td style={{ paddingTop: 10, paddingBottom: 10 }}>
                  {p.baseImage ? (
                    <span className="prod-list-img"><img src={p.baseImage} alt=""/></span>
                  ) : (
                    <div className="prod-tile-other">📦</div>
                  )}
                </td>
                <td>
                  <div className="cust-name">{p.name}</div>
                  <div className="cust-meta" style={{ maxWidth: 460, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.desc}
                  </div>
                </td>
                <td>
                  {(() => {
                    const path = window.categoryPath ? window.categoryPath(cats, p.categoryId) : [];
                    const leaf = path[path.length - 1];
                    const parents = path.slice(0, -1).map((c) => c.name).join(' / ');
                    return (
                      <>
                        <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{leaf ? leaf.name : '—'}</div>
                        {parents && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{parents}</div>}
                      </>
                    );
                  })()}
                </td>
                <td>
                  <Badge tone={window.PRODUCT_STATUS_TONE[p.status]} dot>{window.PRODUCT_STATUS_LABEL[p.status]}</Badge>
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatPriceRange(p)}</div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>
                    <Icon name="chevR" size={14}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <window.Pagination
          total={filtered.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          unit="products" divider/>
      </window.ListCard>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────
const productListStyles = `
.prod-tile-other { width: 42px; height: 42px; border-radius: 10px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; font-size: 22px; flex: none; }
.prod-list-img { width: 42px; height: 42px; border-radius: 10px; overflow: hidden; background: #fff; border: 1px solid var(--color-border-default); display: grid; place-items: center; flex: none; }
.prod-list-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.prod-del-btn:hover { color: var(--color-error-700); background: var(--color-error-50, oklch(96% 0.02 30)); }
`;
if (typeof document !== 'undefined' && !document.getElementById('product-list-styles')) {
  const s = document.createElement('style');
  s.id = 'product-list-styles';
  s.textContent = productListStyles;
  document.head.appendChild(s);
}

window.ProductList = ProductList;
