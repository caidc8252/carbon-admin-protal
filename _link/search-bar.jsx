/* global React, Icon, Btn */
// ─────────────────────────────────────────────────────────────
// SearchBar — 列表页统一搜索栏样式组件
// ─────────────────────────────────────────────────────────────
//
// 约定（与 Devices / Customers / Orders 一致）：
//   1. 点击 Search 按钮才出结果（pending → applied 模式）
//   2. 所有输入框 + 下拉框都"暂存"在 draft 里，不影响表格
//      —— Enter 键等价于点击 Search
//   3. 搜索栏下方有 Active filters 区域，展示已生效条件、可单条移除
//
// 使用方式（最小例子）：
// ```jsx
//   const { draft, applied, setDraft, runSearch, clearAll, hasFilters } =
//     useSearchBar({ q: '', status: 'All' });
//
//   // 用 applied.* 来 filter 你的数据
//   const filtered = useMemo(() => rows.filter(r => ...applied), [rows, applied]);
//
//   <SearchBar onSearch={runSearch}>
//     <SearchInput value={draft.q} onChange={(v) => setDraft(d => ({...d, q: v}))}
//                   placeholder="Search by name…" />
//     <SearchSelect value={draft.status} onChange={(v) => setDraft(d => ({...d, status: v}))}
//                    options={[{value:'All',label:'All statuses'}, ...]} />
//     <SearchActions>
//       <Btn variant="secondary" icon="download">Export</Btn>
//     </SearchActions>
//   </SearchBar>
//   <ActiveFilters onClearAll={clearAll} hasFilters={hasFilters}>
//     {applied.q && <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q','')} />}
//     {applied.status !== 'All' && <FilterChip label={`Status: ${applied.status}`} onRemove={() => clearOne('status','All')} />}
//   </ActiveFilters>
// ```
// ─────────────────────────────────────────────────────────────

const { useState, useCallback } = React;

// ─── Hook: pending vs applied state ──────────────────────────
//   defaults = 初始字段值，e.g. { q: '', status: 'All' }
//   返回的 setDraft 接收 updater function 或 patch object
//   runSearch() 把 draft 提交为 applied
function useSearchBar(defaults, onApply) {
  const [draft, setDraftRaw] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const setDraft = useCallback((updater) => {
    setDraftRaw(prev => typeof updater === 'function' ? updater(prev) : { ...prev, ...updater });
  }, []);
  const runSearch = useCallback(() => {
    setApplied(draft);
    if (onApply) onApply(draft);
  }, [draft, onApply]);
  const clearAll = useCallback(() => {
    setDraftRaw(defaults);
    setApplied(defaults);
    if (onApply) onApply(defaults);
  }, [defaults, onApply]);
  const clearOne = useCallback((key, resetValue) => {
    setDraftRaw(d => ({ ...d, [key]: resetValue }));
    setApplied(a => {
      const next = { ...a, [key]: resetValue };
      if (onApply) onApply(next);
      return next;
    });
  }, [onApply]);
  const hasFilters = React.useMemo(() => {
    return Object.keys(applied).some(k => {
      const v = applied[k];
      const def = defaults[k];
      if (Array.isArray(v)) return v.length !== (Array.isArray(def) ? def.length : 0);
      return v !== def && v !== '' && v != null;
    });
  }, [applied, defaults]);
  return { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters };
}

// ─── Container ───────────────────────────────────────────────
// Renders the toolbar shell. Layout: [fields] [Search] [spacer] [actions].
// SearchActions children (Export etc.) are pulled to the far right;
// the Search button always sits immediately after the fields.
function SearchBar({ children, onSearch, sticky = true, stickyTop = 0 }) {
  const onKey = (e) => { if (e.key === 'Enter') onSearch && onSearch(); };
  const arr = React.Children.toArray(children).filter(Boolean);
  const actions = arr.filter(c => c.type === SearchActions);
  const fields = arr.filter(c => c.type !== SearchActions);
  return (
    <div
      onKeyDown={onKey}
      className="sb"
      style={{
        position: sticky ? 'sticky' : undefined,
        top: sticky ? stickyTop : undefined,
        zIndex: sticky ? 30 : undefined,
        background: 'var(--color-bg-1)',
        paddingTop: sticky ? 4 : 0,
      }}>
      <div className="sb__row">
        <div className="sb__cluster">
          {fields}
          <button type="button" onClick={onSearch} className="sb__primary">
            <Icon name="search" size={13}/>
            Search
          </button>
        </div>
        {actions.length > 0 ? actions : null}
      </div>
    </div>
  );
}

// ─── Search input — fixed width, inline Enter kbd ────────────
function SearchInput({ value, onChange, onSearch, placeholder = 'Search…', width = 320, showClear = true }) {
  return (
    <div className="sb__input" style={{ width }}>
      <Icon name="search" size={13} style={{ color: 'var(--color-text-tertiary)', flex: 'none' }}/>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSearch) onSearch(); }}
        placeholder={placeholder}
        autoComplete="off"/>
      {showClear && value ? (
        <button type="button" title="Clear"
          onMouseDown={(e) => { e.preventDefault(); onChange(''); }}
          className="sb__input-clear">
          <Icon name="x" size={10}/>
        </button>
      ) : null}
      <span className="sb__kbd">Enter</span>
    </div>
  );
}

// ─── Select — same height/styling as input ───────────────────
// Set `icon` to a name (e.g. 'filter', 'building') if you want a leading icon;
// omit it for a clean dropdown that matches the Customer-list look.
function SearchSelect({ value, onChange, options, width = 200, icon, placeholder }) {
  const active = options && options[0] && value !== options[0].value;
  const hasIcon = !!icon;
  return (
    <div className={`sb__select${hasIcon ? ' sb__select--icon' : ''}`} style={{ width }}>
      {hasIcon ? <Icon name={icon} size={13} className="sb__select-ico" style={{ color: active ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)' }}/> : null}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevD" size={11} className="sb__select-chev" style={{ color: 'var(--color-text-tertiary)' }}/>
    </div>
  );
}

// ─── Slot for ad-hoc actions (Export, etc.) on the far right ─
function SearchActions({ children }) {
  return <div className="sb__actions">{children}</div>;
}

// ─── Active filters chip row ─────────────────────────────────
function ActiveFilters({ children, onClearAll, hasFilters, hint }) {
  // Render nothing if no filters AND no children — caller's choice
  const arr = React.Children.toArray(children).filter(Boolean);
  if (!hasFilters && arr.length === 0) {
    // Show a hint row instead — about how the search works
    if (hint) return <div className="sb__hint">{hint}</div>;
    return null;
  }
  return (
    <div className="sb__chips">
      <span className="sb__chips-label">Active filters:</span>
      {arr}
      {onClearAll ? (
        <button type="button" onClick={onClearAll} className="sb__clear-all">
          Clear all
        </button>
      ) : null}
    </div>
  );
}

// ─── A single removable chip ─────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="sb__chip">
      {label}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="sb__chip-x" title="Remove">
          <Icon name="x" size={9}/>
        </button>
      ) : null}
    </span>
  );
}

// ─── ListCard ────────────────────────────────────────────────
// 标准列表卡片容器。提供：
//   • <ListCardHead count, unit, hasFilters, children> — 卡顶 sticky 行
//        左边显示 "<N> <unit>"；右边塞 Export / 自定义按钮。
//   • 卡片内 <table.tds-table thead th> 自动 sticky 到 list-head 下方。
//   • toolbarOffset：上方 sticky 工具栏（SearchBar + ActiveFilters）高度
//        — 由 ResizeObserver 测量调用方传入的 toolbarRef 自动算出，
//        不必手写 top: 偏移。
//
// 用法：
//   const toolbarRef = useRef(null);
//   <div ref={toolbarRef}>
//     <SearchBar onSearch={runSearch} sticky stickyTop={0}>…</SearchBar>
//     <ActiveFilters …/>
//   </div>
//   <ListCard toolbarRef={toolbarRef}>
//     <ListCardHead count={filtered.length} unit="customers" hasFilters={hasFilters}>
//       <Btn icon="download" variant="secondary">Export</Btn>
//     </ListCardHead>
//     <table className="tds-table">…</table>
//     <Pagination …/>
//   </ListCard>
function ListCard({ toolbarRef, children, className = '', style }) {
  const cardRef = React.useRef(null);
  const headRef = React.useRef(null);

  // Measure the upstream toolbar (search bar + active filters) and our own
  // head row; expose both as CSS vars on the card so the sticky thead can
  // pin at the right offset.
  React.useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const toolbarH = toolbarRef && toolbarRef.current ? toolbarRef.current.offsetHeight : 0;
      const headH = headRef.current ? headRef.current.offsetHeight : 0;
      card.style.setProperty('--lc-toolbar-h', toolbarH + 'px');
      card.style.setProperty('--lc-head-h', headH + 'px');
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (toolbarRef && toolbarRef.current) ro.observe(toolbarRef.current);
    if (headRef.current) ro.observe(headRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [toolbarRef]);

  // Walk children: render <ListCardHead> with our ref so it can be measured.
  const arr = React.Children.toArray(children).filter(Boolean);
  const decorated = arr.map((child, i) => {
    if (child && child.type === ListCardHead) {
      return React.cloneElement(child, { _headRef: headRef, key: child.key || `h${i}` });
    }
    return child;
  });

  return (
    <div ref={cardRef} className={`list-card ${className}`} style={style}>
      {decorated}
    </div>
  );
}

function ListCardHead({ count, unit = 'rows', hasFilters, children, _headRef }) {
  const n = typeof count === 'number' ? count.toLocaleString() : count;
  return (
    <div ref={_headRef} className="list-card__head">
      <span className="list-card__count">
        <strong>{n}</strong> {unit}
        {hasFilters ? <span className="list-card__count-suffix"> matching filters</span> : null}
      </span>
      <div className="list-card__actions">{children}</div>
    </div>
  );
}

// ─── ListExportMenu ──────────────────────────────────────────
// Standard Export-CSV button for the list-card head right side.
//
//   • If nothing to export → disabled button.
//   • If current page === full filtered set → single "Export" button.
//   • Otherwise → dropdown offering "Export current view" / "Export all
//     filtered results" with row counts.
//
// The caller does the actual CSV generation + toast in `onExport(scope)`
// where scope is 'page' | 'results'. Use `unit` to label the rows
// (e.g. "customer", "app", "device").
function ListExportMenu({ pageRows = [], filtered = [], unit = 'row', onExport, label = 'Export' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const disabled = filtered.length === 0;
  const sameScope = pageRows.length === filtered.length;
  const pluralize = (n) => `${n.toLocaleString()} ${unit}${n === 1 ? '' : 's'}`;

  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const fire = (scope) => {
    const rows = scope === 'page' ? pageRows : filtered;
    if (rows.length === 0) { setOpen(false); return; }
    onExport && onExport(scope, rows);
    setOpen(false);
  };

  if (disabled) {
    return (
      <Btn variant="ghost" icon="download" size="sm" disabled title={`No ${unit}s in the current view`}>
        {label}
      </Btn>
    );
  }
  if (sameScope) {
    return (
      <Btn variant="ghost" icon="download" size="sm"
        title={`Export ${pluralize(filtered.length)} as CSV`}
        onClick={() => fire('results')}>
        {label}
      </Btn>
    );
  }
  return (
    <div ref={ref} className="list-export">
      <Btn variant="ghost" icon="download" size="sm" onClick={() => setOpen((o) => !o)}>
        {label}
        <Icon name="chevD" size={10} style={{ marginLeft: 4, opacity: 0.7 }}/>
      </Btn>
      {open ? (
        <div className="list-export__menu" role="menu">
          <button type="button" className="list-export__item" onClick={() => fire('page')}>
            <span className="list-export__item-primary">Export current view</span>
            <span className="list-export__item-secondary">{pluralize(pageRows.length)} on this page · CSV</span>
          </button>
          <button type="button" className="list-export__item" onClick={() => fire('results')}>
            <span className="list-export__item-primary">Export search results</span>
            <span className="list-export__item-secondary">{pluralize(filtered.length)} across all pages · CSV</span>
          </button>
          <div className="list-export__foot">UTF-8 CSV · opens in Excel / Sheets</div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Expose globally ─────────────────────────────────────────
Object.assign(window, {
  SearchBar, SearchInput, SearchSelect, SearchActions,
  ActiveFilters, FilterChip, useSearchBar,
  ListCard, ListCardHead, ListExportMenu
});

// ─── Inject styles once ──────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('search-bar-styles')) {
  const s = document.createElement('style');
  s.id = 'search-bar-styles';
  s.textContent = `
.sb__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sb__cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}
.sb__spacer { flex: 1; min-width: 0; }

/* Search input — 320×36 with inline Enter kbd */
.sb__input {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  transition: border-color 120ms, box-shadow 120ms;
  flex: 0 1 auto;
  min-width: 180px;
}
.sb__input:focus-within {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary-500) 18%, transparent);
}
.sb__input input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font: inherit;
  font-size: 13px;
  color: var(--color-text-primary);
}
.sb__input input::placeholder { color: var(--color-text-tertiary); }
.sb__input-clear {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-tertiary);
  flex: none;
}
.sb__input-clear:hover { background: var(--color-bg-3); color: var(--color-text-secondary); }

/* Select — same height/visual as input. Icon + chevron are absolutely
   positioned so the (absolute, full-bleed) <select> can sit behind them. */
.sb__select {
  position: relative;
  display: block;
  height: 36px;
  border-radius: 7px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  cursor: pointer;
  transition: border-color 120ms, box-shadow 120ms;
}
.sb__select:focus-within {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary-500) 18%, transparent);
}
.sb__select select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  font: inherit;
  font-size: 13px;
  color: var(--color-text-primary);
  padding: 0 28px 0 10px;
  cursor: pointer;
}
.sb__select--icon select { padding-left: 32px; }
.sb__select-ico {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.sb__select-chev {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

/* Primary Search button */
.sb__primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  background: var(--color-primary-700);
  color: #fff;
  box-shadow: var(--shadow-cta, 0 1px 2px rgba(0,0,0,0.1));
  transition: background 120ms;
}
.sb__primary:hover { background: var(--color-primary-800, var(--color-primary-700)); }
.sb__primary:active { transform: translateY(0.5px); }

/* Slot for ad-hoc actions */
.sb__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* Enter kbd hint */
.sb__kbd {
  font-family: var(--font-family-mono, ui-monospace);
  font-size: 10px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-bg-3);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border-subtle);
  letter-spacing: 0.02em;
  flex: none;
}

/* Active filters chip row */
.sb__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.sb__chips-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
.sb__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px 2px 8px;
  border-radius: 999px;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  border: 1px solid color-mix(in oklab, var(--color-primary-500) 25%, transparent);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}
.sb__chip-x {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-primary-700);
  cursor: pointer;
}
.sb__chip-x:hover { background: color-mix(in oklab, var(--color-primary-500) 12%, transparent); }
.sb__clear-all {
  background: transparent;
  border: 0;
  padding: 2px 4px;
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-style: dotted;
  font-family: inherit;
}

/* Hint row (shown when no filters applied) */
.sb__hint {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  padding-left: 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  flex-wrap: wrap;
  align-items: center;
}
.sb__hint > span { display: inline-flex; gap: 4px; align-items: center; }

/* ─── ListCard ──────────────────────────────────────────────
   Standard list table wrapper. Card-shape (border + radius),
   with a sticky header strip on top and the table thead pinned
   beneath it. CSS vars --lc-toolbar-h / --lc-head-h are written
   by the React component via ResizeObserver. */
/* The card itself carries NO border — only background + radius (for the
   shadow / bg silhouette). The outline is drawn by the head (top + sides
   + rounded top), the table (sides), and the pagination footer (sides +
   bottom + rounded bottom). This is the key to a clean sticky head in ALL
   browsers (notably Firefox): a card border would run the full height and,
   once the head sticks past the card's real top, its straight side edges
   poke up through the head's rounded-corner gaps. Letting each band own its
   slice of the outline means the rounded top travels WITH the sticky head. */
/* The card is a SHADOW + radius shell only — it paints NO background and no
   border. Reason: the table rows are transparent, so a white card background
   would be the thing carrying the rounded corners, and a rounded background
   under square sticky rows is exactly what bleeds past the corners while
   scrolling (Firefox especially). Instead the white fill is painted by the
   pieces that own each corner: the head (rounded top) and the pagination
   footer (rounded bottom), with the table filling the straight middle. No
   overflow clipping needed, so the sticky head/thead are never at risk. */
.list-card {
  --lc-toolbar-h: 0px;
  --lc-head-h: 0px;
  position: relative;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-2);
  /* overflow:clip clips the square-cornered rows/thead/table-bg to the
     card's rounded silhouette, so nothing pokes past the rounded corners
     while scrolling (the bug: the table's white bg filled the sticky head's
     transparent corner triangles, squaring off the top corners). Crucially,
     clip — unlike hidden/auto/scroll — does NOT create a scroll container,
     so the sticky head/thead still pin relative to the page scroller. */
  overflow: clip;
}
.list-card > table.tds-table { background: var(--color-bg-2); }

/* Sticky toolbar wrapper — holds <SearchBar> + <ActiveFilters>.
   Built into the standard pattern so a visual gap is preserved BOTH above
   the search band (padding-top) AND below it (padding-bottom) while
   scrolling — the paddings are part of the sticky band, painted in page-bg,
   so the bar never sits flush against the content top or the list card.
   Pages wrap their toolbar in <div className="list-toolbar-wrap" ref={toolbarRef}>. */
.list-toolbar-wrap {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--color-bg-1);
  padding-top: 16px;
  padding-bottom: 16px;
}
.list-card > table.tds-table thead th:first-child,
.list-card > table.tds-table tbody td:first-child { padding-left: 20px; }
.list-card__head {
  position: sticky;
  top: var(--lc-toolbar-h);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 20px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-bg-2);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.list-card > table.tds-table { box-sizing: border-box; }
.list-card__count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.list-card__count strong {
  font-family: var(--font-family-mono);
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.list-card__count-suffix { color: var(--color-text-tertiary); }
.list-card__actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

/* Pin the table thead just under the head strip.
   Keep the default tds-table look — bg-3 with the bottom border —
   so it matches Merchants/other list pages. */
.list-card > table.tds-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.list-card > table.tds-table thead th {
  position: sticky;
  top: calc(var(--lc-toolbar-h) + var(--lc-head-h));
  z-index: 15;
  background: var(--color-bg-3);
}

/* Standard Export menu (ListExportMenu) ───────────────────── */
.list-export { position: relative; display: inline-flex; }
.list-export__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  min-width: 260px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  box-shadow: var(--shadow-3, 0 8px 24px rgba(0,0,0,0.10));
  padding: 6px;
}
.list-export__item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: inherit;
}
.list-export__item:hover { background: var(--color-bg-hover); }
.list-export__item-primary { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.list-export__item-secondary { font-size: 11.5px; color: var(--color-text-tertiary); }
.list-export__foot {
  padding: 8px 10px 4px;
  margin-top: 4px;
  border-top: 1px solid var(--color-border-subtle);
  font-size: 10.5px;
  color: var(--color-text-tertiary);
}
`;
  document.head.appendChild(s);
}
