/* global React, Btn, Input, Icon, ModelTile, DEVICE_MODELS, Badge, useToast,
   SEED_PRODUCTS, effectiveStatus,
   formatPriceRange, variantsSummary,
   SearchBar, SearchInput, SearchSelect, SearchActions, ActiveFilters, FilterChip, useSearchBar */
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
function exportProductsCsv(rows, filename) {
  const header = ['Product', 'SKU', 'Description', 'Variants', 'Status', 'Price'];
  const lines = [header.map(_plCsvCell).join(',')];
  rows.forEach((p) => {
    lines.push([
      p.name,
      p.sku || '',
      p.desc || '',
      variantsSummary(p),
      window.PRODUCT_STATUS_LABEL[p._eff] || p._eff,
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

// ─── Product thumbnail: filled color-block glyph tile ───────────
// Delegates to the shared DS object-icon (window.ObjectTile). Category drives
// color + glyph: device vs accessory vs service.
const _prodCat = (p) => {
  if (p.type === 'DEVICE') return 'device';
  if (/onboard|warrant|service|training|setup|support|install/i.test(p.name || '')) return 'service';
  return 'accessory';
};
const ProdGlyphTile = ({ product }) => {
  const cat = window.productObjectCat(product);
  if (cat === 'device') {
    const m = (window.DEVICE_MODELS || []).find((x) => x.id === product.deviceModelId);
    return <window.ObjectTile glyph="device" hue={window.modelHue(m?.name || product.name)} size={42}/>;
  }
  return <window.ObjectTile cat={cat} size={42}/>;
};

const ProductList = ({ products, onOpen, onNew, onDelete }) => {
  const toast = useToast();
  // Shared pending → applied search pattern (R-01)
  const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
    useSearchBar({ q: '', status: 'ALL' }, () => setPage(1));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const toolbarRef = useRef(null);

  // "New product" lives in the page header by default; once that header
  // scrolls out of view, it slides into the (sticky) search toolbar so it
  // stays reachable while scrolling a long catalog.
  const headRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const newProductBtn = <Btn variant="primary" icon="plus" size="md" onClick={onNew}>New product</Btn>;

  // Catalog view — products live in one of two states: Listed or Delisted.
  const catalogRows = useMemo(
    () => products
      .map((p) => ({ ...p, _eff: effectiveStatus(p) }))
      .filter((p) => p._eff === 'LISTED' || p._eff === 'DELISTED'),
    [products]
  );

  const filtered = useMemo(() => {
    let rows = catalogRows;
    if (applied.status !== 'ALL') rows = rows.filter((p) => p._eff === applied.status);
    const s = applied.q.trim().toLowerCase();
    if (s) {
      rows = rows.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku || '').toLowerCase().includes(s) ||
        (p.desc || '').toLowerCase().includes(s)
      );
    }
    return rows;
  }, [catalogRows, applied]);

  // ── Pagination math ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  return (
    <div className="page">
      <div className="page__head" ref={headRef}>
        <div>
          <h1 className="page__title">Catalog</h1>
          <p className="page__sub">Create, edit, and control which goods are available to order.</p>
        </div>
        <div className="page__actions">{newProductBtn}</div>
      </div>

      {/* Sticky condition area — standard SearchBar + ActiveFilters */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by name or description…"/>
          <SearchSelect
            value={draft.status}
            onChange={(v) => setDraft({ status: v })}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'LISTED', label: 'Published' },
              { value: 'DELISTED', label: 'Unpublished' }
            ]}/>
          {stuck ? <SearchActions>{newProductBtn}</SearchActions> : null}
        </SearchBar>

        <ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
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
              exportProductsCsv(rows, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} product${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <colgroup>
            <col style={{ width: '1%' }}/>
            <col/>
            <col style={{ width: '150px' }}/>
            <col style={{ width: '104px' }}/>
            <col style={{ width: '120px' }}/>
            <col style={{ width: '40px' }}/>
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Variants</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="6"><div className="empty">{hasFilters ? 'No goods match your filters.' : 'No goods yet.'}</div></td></tr>
            ) : pageRows.map((p) => {
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)}>
                  <td style={{ paddingTop: 10, paddingBottom: 10 }}>
                    {(p.baseImage && !/^data:image\/svg\+xml/.test(p.baseImage)) ? (
                      <span className="prod-list-img"><img src={p.baseImage} alt=""/></span>
                    ) : (
                      <ProdGlyphTile product={p}/>
                    )}
                  </td>
                  <td>
                    <div className="cust-name">{p.name}</div>
                    <div className="cust-meta" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.desc}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{variantsSummary(p)}</div>
                  </td>
                  <td>
                    <Badge tone={window.PRODUCT_STATUS_TONE[p._eff]} dot>{window.PRODUCT_STATUS_LABEL[p._eff]}</Badge>
                  </td>
                  <td style={{ textAlign: 'right' }} className="num">
                    <div style={{ fontWeight: 500 }}>{formatPriceRange(p)}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {p._eff === 'DELISTED' && onDelete ? (
                      <button className="iconbtn prod-del-btn" title="Delete product"
                        onClick={(e) => { e.stopPropagation(); onDelete(p); }}>
                        <Icon name="trash" size={14}/>
                      </button>
                    ) : (
                      <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>
                        <Icon name="chevR" size={14}/>
                      </button>
                    )}
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
.prod-list-img { width: 42px; height: 42px; border-radius: 8px; overflow: hidden; background: #fff; border: 1px solid var(--color-border-default); display: grid; place-items: center; flex: none; }
.prod-list-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.prod-thumb { width: 42px; height: 42px; border-radius: 8px; background: var(--avatar-bg); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; color: var(--avatar-fg); flex: none; }
.prod-del-btn:hover { color: var(--color-error-700); background: var(--color-error-50, oklch(96% 0.02 30)); }
`;
if (typeof document !== 'undefined' && !document.getElementById('product-list-styles')) {
  const s = document.createElement('style');
  s.id = 'product-list-styles';
  s.textContent = productListStyles;
  document.head.appendChild(s);
}

window.ProductList = ProductList;
