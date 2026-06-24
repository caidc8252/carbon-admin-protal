/* global React */
// ─────────────────────────────────────────────────────────────
// Pagination Styles — comparison demo on the TOMS design system.
//
// Four interchangeable pagination patterns over the SAME mock data source,
// plus live instrumentation that proves the leader's requirement:
//   · the total IS counted (shown everywhere), but
//   · COUNT(*) runs ONCE and is cached — paging / scrolling never re-counts;
//     it re-runs only when the filter changes (the only time the total can move).
//
// Styles:
//   A. Numbered      — full pager (rows-per-page + summary + go-to). Current std.
//   B. Compact       — ‹ Page X of Y › + summary. Minimal toolbar footer.
//   C. Load more     — append-on-click; "Showing N of TOTAL".
//   D. Infinite (无极) — auto-load on scroll via IntersectionObserver; count-once.
// ─────────────────────────────────────────────────────────────
const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useC } = React;

// ── Mock dataset ─────────────────────────────────────────────
const MODELS = ["N950", "N910", "X800", "X700", "P300", "ME60"];
const MERCHANTS = ["Cascade Bistro Group", "Pinegate Apparel", "Aurora Freight", "Loomis Industrial",
  "Helios Payments", "Northwind Retail", "Acme Coffee", "Vertex Foods", "Bluejay Markets", "Stonebridge Co."];
const STATUSES = [
  { id: "active",   label: "Active",   tone: "success" },
  { id: "pending",  label: "Pending",  tone: "warning" },
  { id: "offline",  label: "Offline",  tone: "neutral" },
  { id: "flagged",  label: "Flagged",  tone: "error" },
];
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const RNG = mulberry32(42);
const ALL_ROWS = Array.from({ length: 1284 }, (_, i) => {
  const model = MODELS[Math.floor(RNG() * MODELS.length)];
  const st = STATUSES[Math.floor(RNG() * STATUSES.length)];
  const mins = Math.floor(RNG() * 4000);
  return {
    id: i + 1,
    sn: `${model}-${String(Math.floor(RNG() * 9000) + 1000)}-${String(Math.floor(RNG() * 9000) + 1000)}`,
    model,
    merchant: MERCHANTS[Math.floor(RNG() * MERCHANTS.length)],
    status: st.id,
    lastSeenMin: mins,
  };
});
const fmtSeen = (m) => m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
const toneOf = (id) => (STATUSES.find(s => s.id === id) || STATUSES[2]).tone;
const labelOf = (id) => (STATUSES.find(s => s.id === id) || STATUSES[2]).label;

// ── Mock data-access layer with COUNT-once semantics ─────────
// getTotal() caches its result keyed by the current filter signature; it only
// runs a real "COUNT(*)" when the cache is cold (first load / filter changed).
// fetchPage() is the cheap windowed read used by every pagination style.
function makeDao(onStat) {
  let cachedKey = null, cachedTotal = 0;
  let countCalls = 0, fetchCalls = 0;
  // Report stats OUT of the render phase. getTotal/fetchPage are invoked from
  // useMemo during render; calling setState synchronously there would update a
  // parent mid-render (React error) and loop. queueMicrotask defers it to after
  // commit, and because the reads are memoised they don't re-run on that
  // re-render — so the counters settle instead of spinning.
  function report() { queueMicrotask(() => onStat({ countCalls, fetchCalls })); }
  function applyFilter(rows, f) {
    return rows.filter(r =>
      (f.status === "all" || r.status === f.status) &&
      (!f.q || r.sn.toLowerCase().includes(f.q.toLowerCase()) || r.merchant.toLowerCase().includes(f.q.toLowerCase()))
    );
  }
  return {
    key: (f) => `${f.status}|${(f.q || "").toLowerCase()}`,
    getTotal(f) {
      const k = this.key(f);
      if (k !== cachedKey) {            // cold cache → run the expensive COUNT once
        countCalls++;
        cachedKey = k;
        cachedTotal = applyFilter(ALL_ROWS, f).length;
        report();
      }
      return cachedTotal;               // every later call is free
    },
    fetchPage(f, offset, limit) {       // cheap windowed read (no COUNT)
      fetchCalls++;
      report();
      return applyFilter(ALL_ROWS, f).slice(offset, offset + limit);
    },
    stats: () => ({ countCalls, fetchCalls }),
    resetStats() { countCalls = 0; fetchCalls = 0; cachedKey = null; onStat({ countCalls, fetchCalls }); },
  };
}

// ── Small UI atoms ───────────────────────────────────────────
const Chev = ({ dir, size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {dir === "left" ? <path d="M15 18l-6-6 6-6" /> :
     dir === "right" ? <path d="M9 18l6-6-6-6" /> :
     dir === "dleft" ? <path d="M11 18l-6-6 6-6M18 18l-6-6 6-6" /> :
     <path d="M13 18l6-6-6-6M6 18l6-6-6-6" />}
  </svg>
);
const Spinner = ({ size = 15 }) => (
  <svg className="pg-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
);
const StatusPill = ({ id }) => (
  <span className={`pg-pill pg-pill--${toneOf(id)}`}><span className="pg-pill__dot" />{labelOf(id)}</span>
);

// ── Shared table ─────────────────────────────────────────────
function DeviceRows({ rows }) {
  return rows.map(r => (
    <tr key={r.id}>
      <td className="pg-mono pg-strong">{r.sn}</td>
      <td>{r.model}</td>
      <td className="pg-trunc">{r.merchant}</td>
      <td><StatusPill id={r.status} /></td>
      <td className="pg-mono pg-dim pg-right">{fmtSeen(r.lastSeenMin)}</td>
    </tr>
  ));
}
const TableHead = () => (
  <thead><tr>
    <th>Serial</th><th>Model</th><th>Merchant</th><th>Status</th><th className="pg-right">Last seen</th>
  </tr></thead>
);

// ─────────────────────────────────────────────────────────────
// STYLE A — Numbered (current standard)
// ─────────────────────────────────────────────────────────────
function pagerWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set([1, totalPages, page - 1, page, page + 1]);
  const s = [...set].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) { if (i > 0 && s[i] - s[i - 1] > 1) out.push("…"); out.push(s[i]); }
  return out;
}
function NumberedStyle({ dao, filter }) {
  const [pageSize, setPageSize] = useS(25);
  const [page, setPage] = useS(1);
  const total = useM(() => dao.getTotal(filter), [dao, filter]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, totalPages);
  const start = (safe - 1) * pageSize;
  const rows = useM(() => dao.fetchPage(filter, start, pageSize), [dao, filter, start, pageSize]);
  const end = Math.min(start + pageSize, total);
  const [goTo, setGoTo] = useS("");
  useE(() => { setPage(1); }, [filter, pageSize]);
  const go = () => { const n = parseInt(goTo, 10); if (n >= 1 && n <= totalPages) { setPage(n); setGoTo(""); } };
  const win = pagerWindow(safe, totalPages);
  return (
    <div className="pg-card">
      <table className="pg-table"><TableHead /><tbody><DeviceRows rows={rows} /></tbody></table>
      <div className="pg-bar">
        <div className="pg-bar__group">
          <span className="pg-bar__lbl">Rows per page</span>
          <select className="pg-select" value={pageSize} onChange={e => setPageSize(+e.target.value)}>
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="pg-summary">Showing <b>{total === 0 ? 0 : start + 1}–{end}</b> of <b>{total.toLocaleString()}</b> devices</div>
        <div className="pg-spacer" />
        <div className="pg-pager">
          <button className="pg-pbtn" disabled={safe === 1} onClick={() => setPage(1)} title="First"><Chev dir="dleft" /></button>
          <button className="pg-pbtn" disabled={safe === 1} onClick={() => setPage(safe - 1)} title="Previous"><Chev dir="left" /></button>
          {win.map((p, i) => p === "…"
            ? <span key={`e${i}`} className="pg-ellipsis">…</span>
            : <button key={p} className={`pg-pbtn ${p === safe ? "is-active" : ""}`} onClick={() => setPage(p)}>{p}</button>)}
          <button className="pg-pbtn" disabled={safe === totalPages} onClick={() => setPage(safe + 1)} title="Next"><Chev dir="right" /></button>
          <button className="pg-pbtn" disabled={safe === totalPages} onClick={() => setPage(totalPages)} title="Last"><Chev dir="dright" /></button>
        </div>
        <div className="pg-goto">
          <span>Go to</span>
          <input className="pg-input pg-mono" value={goTo} placeholder={String(safe)}
            onChange={e => setGoTo(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") go(); }} />
          <button className="pg-btn" onClick={go}>Go</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE B — Compact ( ‹ Page X of Y › )
// ─────────────────────────────────────────────────────────────
function CompactStyle({ dao, filter }) {
  const pageSize = 25;
  const [page, setPage] = useS(1);
  const total = useM(() => dao.getTotal(filter), [dao, filter]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, totalPages);
  const start = (safe - 1) * pageSize;
  const rows = useM(() => dao.fetchPage(filter, start, pageSize), [dao, filter, start, pageSize]);
  const end = Math.min(start + pageSize, total);
  useE(() => { setPage(1); }, [filter]);
  return (
    <div className="pg-card">
      <table className="pg-table"><TableHead /><tbody><DeviceRows rows={rows} /></tbody></table>
      <div className="pg-bar pg-bar--compact">
        <div className="pg-summary">Showing <b>{total === 0 ? 0 : start + 1}–{end}</b> of <b>{total.toLocaleString()}</b> devices</div>
        <div className="pg-spacer" />
        <div className="pg-compact">
          <button className="pg-btn pg-btn--icon" disabled={safe === 1} onClick={() => setPage(safe - 1)} title="Previous"><Chev dir="left" /></button>
          <span className="pg-compact__lbl">Page <b className="pg-mono">{safe}</b> of <b className="pg-mono">{totalPages.toLocaleString()}</b></span>
          <button className="pg-btn pg-btn--icon" disabled={safe === totalPages} onClick={() => setPage(safe + 1)} title="Next"><Chev dir="right" /></button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE C — Load more (append on click)
// ─────────────────────────────────────────────────────────────
const BATCH = 25;
function LoadMoreStyle({ dao, filter }) {
  const [count, setCount] = useS(BATCH);
  const [loading, setLoading] = useS(false);
  const total = useM(() => dao.getTotal(filter), [dao, filter]);
  const shown = Math.min(count, total);
  const rows = useM(() => dao.fetchPage(filter, 0, shown), [dao, filter, shown]);
  useE(() => { setCount(BATCH); }, [filter]);
  const more = () => {
    setLoading(true);
    setTimeout(() => { setCount(c => c + BATCH); setLoading(false); }, 280);
  };
  const done = shown >= total;
  return (
    <div className="pg-card">
      <table className="pg-table"><TableHead /><tbody><DeviceRows rows={rows} /></tbody></table>
      <div className="pg-loadmore">
        <div className="pg-loadmore__count">Showing <b>{shown.toLocaleString()}</b> of <b>{total.toLocaleString()}</b> devices</div>
        {done
          ? <div className="pg-end">You've reached the end</div>
          : <button className="pg-btn pg-btn--lg" onClick={more} disabled={loading}>
              {loading ? <><Spinner /> Loading…</> : <>Load {Math.min(BATCH, total - shown)} more</>}
            </button>}
        <div className="pg-progress"><div className="pg-progress__bar" style={{ width: `${total ? (shown / total) * 100 : 0}%` }} /></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE D — Infinite scroll (无极翻页) — count-once
// ─────────────────────────────────────────────────────────────
function InfiniteStyle({ dao, filter }) {
  const [count, setCount] = useS(BATCH);
  const [loading, setLoading] = useS(false);
  const scrollRef = useR(null);
  const sentinelRef = useR(null);
  const total = useM(() => dao.getTotal(filter), [dao, filter]);          // counted ONCE, then cached
  const shown = Math.min(count, total);
  const rows = useM(() => dao.fetchPage(filter, 0, shown), [dao, filter, shown]);
  const done = shown >= total;

  useE(() => { setCount(BATCH); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [filter]);

  const loadMore = useC(() => {
    setLoading(true);
    setTimeout(() => { setCount(c => c + BATCH); setLoading(false); }, 320);
  }, []);

  useE(() => {
    const root = scrollRef.current, sentinel = sentinelRef.current;
    if (!root || !sentinel || done) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) loadMore();
    }, { root, rootMargin: "120px" });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [done, loading, shown, loadMore]);

  return (
    <div className="pg-card">
      <div className="pg-infinite-head">
        <span className="pg-infinite-head__count">Loaded <b className="pg-mono">{shown.toLocaleString()}</b> of <b className="pg-mono">{total.toLocaleString()}</b> devices</span>
        {!done && <span className="pg-infinite-head__hint">Scroll to load more</span>}
      </div>
      <div className="pg-scroll" ref={scrollRef}>
        <table className="pg-table pg-table--sticky"><TableHead /><tbody><DeviceRows rows={rows} /></tbody></table>
        <div ref={sentinelRef} className="pg-sentinel">
          {loading && <><Spinner /> <span>Loading more…</span></>}
          {!loading && done && <span className="pg-end">End of list · {total.toLocaleString()} devices</span>}
        </div>
      </div>
      <div className="pg-infinite-foot">
        <div className="pg-progress"><div className="pg-progress__bar" style={{ width: `${total ? (shown / total) * 100 : 0}%` }} /></div>
      </div>
    </div>
  );
}

window.PG = { makeDao, NumberedStyle, CompactStyle, LoadMoreStyle, InfiniteStyle, STATUSES };
