/* global React, window */
// ─────────────────────────────────────────────────────────────
// list-kit — shared condition + list area (SPEC SOURCE)
//
// The canonical condition+list vocabulary for list pages, extracted from the
// App Publish list (PublishAppsList). Use it so every list page filters and
// lists the same way:
//   • a bg2 condition panel with DRAFT inputs that only filter the list on
//     Search (or chip-removal / clear-all); applied filters render as
//     removable chips below a dashed separator;
//   • a list card with a toolbar (result count [+ optional actions]), the
//     table, and a pagination footer.
//
// Exports (all on window so other files can read them):
//   useListFilters(defaults)  → { draft, applied, setDraft, runSearch,
//                                 clearKey, resetAll, hasApplied, defaults }
//   <ListSearchInput value onChange onEnter onClear placeholder width? />
//   <ListFilterSelect value onChange onClear defaultValue width?>…options…</…>
//   <ListAppliedChip label value onRemove />
//   <ListConditionPanel innerRef? sticky? stickyTop? chips onClearAll>…controls…</…>
//   <ListCard icon? count total? noun? hasApplied? actions? footer>…table…</…>
//
// This is the readable twin of compiled/list-kit.js (what actually runs).
// Edit BOTH and keep them in sync.
//
// STICKY condition + table header (so neither scrolls off the screen):
//   const condRef = React.useRef(null);
//   const condH = window.useElementHeight(condRef);
//   <window.ListConditionPanel innerRef={condRef} sticky …>…</…>
//   <window.ListCard stickyTop={condH} …>
//     {(theadTop) =>
//       <table>   {/* NO .table-wrap wrapper — overflow-x:auto creates a new
//                    scroll context that breaks the page-level sticky header */}
//         <thead style={{ position: "sticky", top: theadTop, zIndex: 10 }}>…</thead>
//         …</table>}
//   </window.ListCard>
//   (each <th> needs its own opaque background for the sticky header to read.)
//
// USAGE (mirrors App Publish / Subscribers):
//   const lf = window.useListFilters({ q: "", status: "any", version: "any" });
//   const { q, status, version } = lf.applied;            // list reads applied
//   …filter rows by lf.applied…
//   <window.ListConditionPanel
//     chips={[ lf.applied.q && { key:"q", label:"Search", value:lf.applied.q,
//                                onRemove:()=>lf.clearKey("q") }, … ].filter(Boolean)}
//     onClearAll={lf.resetAll}>
//     <window.ListSearchInput value={lf.draft.q} onChange={(v)=>lf.setDraft("q",v)}
//       onEnter={lf.runSearch} onClear={()=>lf.clearKey("q")} placeholder="Search…" />
//     <window.ListFilterSelect value={lf.draft.status} defaultValue="any"
//       onChange={(v)=>lf.setDraft("status",v)} onClear={()=>lf.clearKey("status")}>
//       <option value="any">All statuses</option>…
//     </window.ListFilterSelect>
//     <window.Button size="sm" icon="search" onClick={lf.runSearch}>Search</window.Button>
//   </window.ListConditionPanel>
//   <window.ListCard count={filtered.length} total={rows.length} hasApplied={lf.hasApplied}
//     noun="subscriber" icon="company"
//     footer={<window.Pagination …/>}>
//     <table className="tds-table num">…</table>
//   </window.ListCard>
// ─────────────────────────────────────────────────────────────

// ── useListFilters: draft ↔ applied state machine ──────────
window.useListFilters = function useListFilters(defaults) {
  const ds = React.useRef(defaults).current;
  const [draft, setDraftState] = React.useState(ds);
  const [applied, setApplied] = React.useState(ds);
  const setDraft = (key, val) => setDraftState((d) => ({ ...d, [key]: val }));
  const runSearch = () => setApplied({ ...draft });
  const clearKey = (key) => {
    setDraftState((d) => ({ ...d, [key]: ds[key] }));
    setApplied((a) => ({ ...a, [key]: ds[key] }));
  };
  const resetAll = () => { setDraftState(ds); setApplied(ds); };
  const hasApplied = Object.keys(ds).some((k) => applied[k] !== ds[k]);
  return { draft, applied, setDraft, runSearch, clearKey, resetAll, hasApplied, defaults: ds };
};

// ── useElementHeight: live offsetHeight of a ref'd element ───
// Used to pin sticky siblings directly below a measured element (e.g. the
// condition panel) so the condition area + table header never scroll off.
window.useElementHeight = function useElementHeight(ref) {
  const [h, setH] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setH(el.offsetHeight);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", update);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return h;
};

// ── ListAppliedChip ────────────────────────────────────────
window.ListAppliedChip = function ListAppliedChip({ label, value, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 24,
      padding: "0 4px 0 var(--space-3)", borderRadius: "var(--radius-full)",
      fontSize: 11.5, border: "1px solid var(--border-2)", background: "var(--bg2)",
      color: "var(--fg2)", whiteSpace: "nowrap", flexShrink: 0
    }}>
      <span className="overline" style={{ fontSize: 9.5, color: "var(--fg3)", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ color: "var(--fg1)", fontWeight: 500 }}>{value}</span>
      <button onClick={onRemove} title={`Remove ${label} filter`}
        style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: "var(--radius-full)", color: "var(--fg3)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
        <window.Ico name="x" size={11} />
      </button>
    </span>
  );
};

// ── ListSearchInput ────────────────────────────────────────
window.ListSearchInput = function ListSearchInput({ value, onChange, onEnter, onClear, placeholder, width = 300 }) {
  return (
    <div style={{ flex: `0 0 ${width}px`, minWidth: 220 }}>
      <window.Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        placeholder={placeholder} size="sm"
        prefix={<window.Ico name="search" size={13} />}
        suffix={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {value &&
              <button type="button" title="Clear"
                onClick={(e) => { e.preventDefault(); if (onClear) onClear(); }}
                style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: "var(--radius-full)", color: "var(--fg3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                <window.Ico name="x" size={11} />
              </button>
            }
            <kbd style={{
              fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: "14px",
              padding: "1px 5px", border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-sm)", background: "var(--bg1)",
              color: "var(--fg3)", whiteSpace: "nowrap"
            }}>↵ Enter</kbd>
          </span>
        } />
    </div>
  );
};

// ── ListFilterSelect — inline select with a one-click reset ─
window.ListFilterSelect = function ListFilterSelect({ value, onChange, onClear, defaultValue, width = 170, children }) {
  const dirty = value !== defaultValue;
  return (
    <label className="tds-select tds-select--sm" style={{ flex: `0 0 ${width}px`, position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", WebkitAppearance: "none", flex: 1, height: "100%", background: "transparent",
          border: 0, outline: 0, fontSize: 13, color: "var(--fg1)", paddingRight: dirty ? 22 : "var(--space-5)" }}>
        {children}
      </select>
      {dirty ?
        <button type="button" title="Reset"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onClear) onClear(); }}
          style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: "var(--radius-full)", color: "var(--fg3)", marginLeft: -18, zIndex: 2 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
          <window.Ico name="x" size={12} />
        </button> :
        <window.Ico name="chevd" size={12} className="tds-select__chevron" />}
    </label>
  );
};

// ── ListConditionPanel ─────────────────────────────────────
// Pass `sticky` + an `innerRef` (measured via useElementHeight) so it pins to
// the top of the scroll container; feed that height into <ListCard stickyTop>
// so the toolbar + table header stack directly beneath it.
window.ListConditionPanel = function ListConditionPanel({ innerRef, sticky, stickyTop, chips = [], onClearAll, children }) {
  const base = { background: "var(--bg2)", display: "flex", flexDirection: "column", gap: "var(--space-3)" };
  const shape = sticky
    ? { position: "sticky", top: stickyTop || 0, zIndex: 20, padding: "var(--space-4)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-2)" }
    : { padding: "var(--space-4)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)" };
  return (
    <div ref={innerRef} style={{ ...base, ...shape }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        {children}
      </div>
      {chips.length > 0 &&
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap",
          paddingTop: "var(--space-2)", borderTop: "1px dashed var(--border-1)"
        }}>
          <span className="overline" style={{ fontSize: 10, color: "var(--fg3)", letterSpacing: "0.08em" }}>Applied</span>
          {chips.map((c) => <window.ListAppliedChip key={c.key} label={c.label} value={c.value} onRemove={c.onRemove} />)}
          <button onClick={onClearAll}
            style={{ marginLeft: "var(--space-1)", fontSize: 11.5, color: "var(--fg3)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg3)"; }}>
            Clear all
          </button>
        </div>
      }
    </div>
  );
};

// ── ListCard — card shell: toolbar (count + actions) + table + footer ──
// When `stickyTop` is set (the condition panel height), the toolbar pins at
// that offset and the table is rendered via a function child that receives
// `theadTop` (= stickyTop + toolbar height) — apply it as the <thead>'s sticky
// `top` so column headers pin directly under the toolbar. Each <th> needs its
// own opaque background for the sticky header to read cleanly.
window.ListCard = function ListCard({ icon = "package", count, total, noun = "result", hasApplied, actions, children, footer, stickyTop }) {
  const toolbarRef = React.useRef(null);
  const toolbarH = window.useElementHeight(toolbarRef);
  const sticky = stickyTop != null;
  const theadTop = sticky ? stickyTop + toolbarH : 0;
  const toolbarSticky = sticky ? { position: "sticky", top: stickyTop, zIndex: 15 } : {};
  return (
    <div className="tds-card" style={{
      display: "flex", flexDirection: "column", overflow: "visible",
      boxShadow: "var(--shadow-1)", borderRadius: "var(--radius-lg)"
    }}>
      <div ref={toolbarRef} style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)", borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)",
        ...toolbarSticky
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <window.Ico name={icon} size={14} style={{ color: "var(--fg3)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>
            <span className="mono num">{count}</span>
            <span style={{ color: "var(--fg3)", marginLeft: 6, fontWeight: 400 }}>
              {` ${noun}${count === 1 ? "" : "s"}`}
              {hasApplied && total != null && <> · filtered from <span className="mono num">{total}</span></>}
            </span>
          </span>
        </div>
        {actions && <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>{actions}</div>}
      </div>
      {typeof children === "function" ? children(theadTop) : children}
      {footer &&
        <div style={{
          borderTop: "1px solid var(--border-1)", background: "var(--bg2)",
          borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)"
        }}>{footer}</div>
      }
    </div>
  );
};
