/* global React, window */
// ─────────────────────────────────────────────────────────────
// Pagination — 列表页统一分页组件
// ─────────────────────────────────────────────────────────────
//
// 提取自 Devices 列表页底部分页条，作为所有列表页（Devices / Tickets /
// Orders / Customers …）的标准分页组件，禁止各页自行手写。
//
// 布局：[Rows per page ▾] [Showing 1–25 of 66] …spacer… [« ‹ 1 2 3 › »]
//        （ui-spec §3.2：仅 Rows per page · Showing X–Y of N · 页码器三区块）
//
// 用法（最小例子）：
// ```jsx
//   const PAGE_SIZE = 25;
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(PAGE_SIZE);
//   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//   const safePage = Math.min(page, totalPages);
//   const pageStart = (safePage - 1) * pageSize;
//   const pageEnd = Math.min(pageStart + pageSize, filtered.length);
//   const pageRows = filtered.slice(pageStart, pageEnd);
//
//   <window.Pagination
//     total={filtered.length} totalUnfiltered={all.length}
//     pageStart={pageStart} pageEnd={pageEnd}
//     page={safePage} totalPages={totalPages} pageSize={pageSize}
//     setPage={setPage} setPageSize={setPageSize} />
// ```
//
// Props
//   total           当前过滤后的总行数（翻页基于它）
//   totalUnfiltered 未过滤的总行数（用于 "filtered from N total"）— 可选
//   pageStart       当前页起始 index（0-based）
//   pageEnd         当前页结束 index（exclusive）
//   page            当前页码（1-based）
//   totalPages      总页数
//   pageSize        每页行数
//   setPage(n)      切页回调
//   setPageSize(n)  改每页行数回调（自身会顺带 setPage(1)）
//   pageSizeOptions 每页行数选项，默认 [10, 25, 50, 100]（ui-spec §3.2）
//   unit            摘要里的名词，默认 "rows"（可传 "tickets" / "devices"）
//   divider         顶部是否加分隔线，默认 false（与 Devices 现状一致）
//   showRowsPerPage / showSummary  各区块开关，默认 true
//   （ui-spec §3.2 FIX：已移除 "Go to page ___ Go" 跳页输入框）
// ─────────────────────────────────────────────────────────────

(function () {
  const { useState } = React;

  // ── Page-number window ─────────────────────────────────────
  // Always show first, last, current ±2, with … between gaps.
  function pagerWindow(page, totalPages) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("...");
      out.push(sorted[i]);
    }
    return out;
  }

  // ── Chevron glyphs (inline, self-contained) ────────────────
  function Chev({ dir }) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>);
  }
  function DoubleChev({ dir }) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ?
        <path d="M11 18l-6-6 6-6M18 18l-6-6 6-6" /> :
        <path d="M13 18l6-6-6-6M6 18l6-6-6-6" />}
      </svg>);
  }

  // ── Single pager button ────────────────────────────────────
  function PagerBtn({ active, disabled, onClick, title, children }) {
    return (
      <button onClick={onClick} disabled={disabled} title={title} style={{
        minWidth: 28, height: 28, padding: "0 8px", border: 0, borderRadius: 6,
        background: active ? "var(--color-primary-700)" : "transparent",
        color: active ? "#fff" : disabled ? "var(--fg4)" : "var(--fg2)",
        fontSize: 12, fontWeight: active ? 600 : 500,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.4 : 1
      }}
      onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.background = "transparent"; }}>
        {children}
      </button>);
  }

  const selStyle = {
    height: 26, padding: "0 22px 0 8px", fontSize: 12,
    border: "1px solid var(--border-2)", borderRadius: 6,
    background: "var(--bg2)", color: "var(--fg1)", outline: "none",
    fontFamily: "inherit", cursor: "pointer"
  };

  // ── Pagination bar ─────────────────────────────────────────
  function Pagination({
    total, pageStart, pageEnd, totalUnfiltered,
    page, totalPages, pageSize, setPage, setPageSize,
    pageSizeOptions = [10, 25, 50, 100],
    unit = "rows", divider = false,
    showRowsPerPage = true, showSummary = true
  }) {
    const filtered = totalUnfiltered != null && total !== totalUnfiltered;
    const pages = pagerWindow(page, totalPages);

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        background: "var(--bg2)", flexWrap: "wrap",
        borderTop: divider ? "1px solid var(--border-1)" : undefined
      }}>
        {showRowsPerPage &&
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg2)" }}>
          <span>Rows per page</span>
          <select value={pageSize}
            onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}
            style={selStyle}>
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        }

        {showSummary &&
        <div style={{ fontSize: 12, color: "var(--fg2)" }}>
          Showing{" "}
          <span className="mono num">{total === 0 ? 0 : pageStart + 1}</span>
          –<span className="mono num">{pageEnd}</span>{" "}
          of <strong className="mono num">{total.toLocaleString()}</strong>{" "}{unit}
          {filtered &&
          <span style={{ color: "var(--fg4)" }}> · filtered from {totalUnfiltered.toLocaleString()} total</span>
          }
        </div>
        }

        <div style={{ flex: 1 }} />

        {/* Pager */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <PagerBtn disabled={page === 1} onClick={() => setPage(1)} title="First"><DoubleChev dir="left" /></PagerBtn>
          <PagerBtn disabled={page === 1} onClick={() => setPage(page - 1)} title="Previous"><Chev dir="left" /></PagerBtn>
          {pages.map((p, i) =>
          p === "..." ?
          <span key={`e${i}`} style={{ padding: "0 6px", color: "var(--fg4)", fontSize: 12 }}>…</span> :
          <PagerBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PagerBtn>
          )}
          <PagerBtn disabled={page === totalPages} onClick={() => setPage(page + 1)} title="Next"><Chev dir="right" /></PagerBtn>
          <PagerBtn disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last"><DoubleChev dir="right" /></PagerBtn>
        </div>
      </div>);
  }

  Object.assign(window, { Pagination, pagerWindow });
})();
