/* global React, Ico, Badge, Button, Card, Input, PageHeader */
// ─────────────────────────────────────────────────────────────
// Sample Orders — list view
// Columns: Order · Models & units · Status · Created · Total
// No KPI tiles. No carrier/owner/received/activation progress.
// ─────────────────────────────────────────────────────────────

const { useState: useStateO, useMemo: useMemoO } = React;

// Pull shell primitives off window — Babel scripts don't share scope.
const { Ico, Badge, Button, Card, PageHeader, Pagination, usePaginated } = window;

// Adapter — bridge source's TextInput(value: string) onto current shell's Input(event).
function TextInput({ value, onChange, size, prefix, suffix, placeholder, mono }) {
  return (
    <window.Input
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      size={size}
      prefix={prefix}
      suffix={suffix}
      placeholder={placeholder}
      mono={mono}
    />
  );
}

// Mock data — one order can contain multiple models
const SAMPLE_ORDERS = [
  {
    id: "SO-2026-0418",
    items: [
      { model: "Newland N910 Pro",   sku: "N910P-EU", type: "Semi-integration", qty: 8, activated: 0, unitPrice: 480 },
      { model: "Newland N750P",      sku: "N750P-EU", type: "Stand-alone",      qty: 4, activated: 0, unitPrice: 320 },
    ],
    createdAt: "Apr 18, 2026 · 14:32",
    status: "ready",
  },
  {
    id: "SO-2026-0411",
    items: [
      { model: "Newland N750P",      sku: "N750P-NA", type: "Stand-alone",      qty: 6, activated: 6, unitPrice: 320 },
    ],
    createdAt: "Apr 11, 2026 · 10:08",
    status: "done",
  },
  {
    id: "SO-2026-0407",
    items: [
      { model: "Newland N910 Pro",   sku: "N910P-EU", type: "Semi-integration", qty: 8, activated: 3, unitPrice: 480 },
    ],
    createdAt: "Apr 07, 2026 · 16:51",
    status: "activating",
  },
  {
    id: "SO-2026-0402",
    items: [
      { model: "Newland NQuire 1000",sku: "NQ1000-APAC", type: "Semi-integration", qty: 4, activated: 0, unitPrice: 260 },
    ],
    createdAt: "Apr 02, 2026 · 09:24",
    status: "ready",
  },
  {
    id: "SO-2026-0329",
    items: [
      { model: "Newland N950",       sku: "N950-EU",  type: "Stand-alone",      qty: 6, activated: 6, unitPrice: 390 },
      { model: "Newland NPT-G6",     sku: "NPT-G6-EU",type: "Semi-integration", qty: 4, activated: 3, unitPrice: 420 },
    ],
    createdAt: "Mar 29, 2026 · 11:47",
    status: "activating",
  },
  {
    id: "SO-2026-0320",
    items: [
      { model: "Newland N910 Pro",   sku: "N910P-NA", type: "Semi-integration", qty: 5, activated: 2, unitPrice: 480 },
    ],
    createdAt: "Mar 20, 2026 · 13:12",
    status: "activating",
  },
  {
    id: "SO-2026-0314",
    items: [
      { model: "Newland NPT-G6",     sku: "NPT-G6-EU",type: "Semi-integration", qty: 3, activated: 3, unitPrice: 420 },
    ],
    createdAt: "Mar 14, 2026 · 15:38",
    status: "done",
  },
  {
    id: "SO-2026-0301",
    items: [
      { model: "Newland N910 Pro",   sku: "N910P-NA", type: "Semi-integration", qty: 4, activated: 0, unitPrice: 480 },
      { model: "Newland NQuire 1000",sku: "NQ1000-NA",type: "Stand-alone",      qty: 2, activated: 0, unitPrice: 260 },
    ],
    createdAt: "Mar 01, 2026 · 09:51",
    status: "ready",
  },
];

function orderTotal(o) {
  return o.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
}
function orderQty(o)       { return o.items.reduce((s, it) => s + it.qty, 0); }
function orderActivated(o) { return o.items.reduce((s, it) => s + it.activated, 0); }

const STATUS_META = {
  "ready":      { tone: "warning", label: "Ready to activate" },
  "activating": { tone: "info",    label: "Activating"        },
  "done":       { tone: "success", label: "All activated"     },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META["ready"];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// ─── Filter chips ───────────────────────────────────────────
function FilterChip({ active, onClick, children, count }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 28,
      padding: "0 var(--space-3)",
      borderRadius: "var(--radius-full)",
      fontSize: 12, fontWeight: 500,
      border: "1px solid",
      borderColor: active ? "var(--accent)" : "var(--border-2)",
      background: active ? "var(--accent)" : "var(--bg2)",
      color: active ? "var(--accent-on)" : "var(--fg2)",
      boxShadow: active ? "var(--shadow-cta)" : "none",
      transition: "all var(--duration-fast) var(--easing-standard)",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {children}
      {count != null && (
        <span className="mono num" style={{
          fontSize: 10.5, padding: "0 5px", borderRadius: "var(--radius-full)",
          background: active ? "oklch(100% 0 0 / 0.18)" : "var(--bg3)",
          color: active ? "oklch(100% 0 0 / 0.85)" : "var(--fg3)",
          minWidth: 18, textAlign: "center", lineHeight: "16px",
        }}>{count}</span>
      )}
    </button>
  );
}

// ─── The Sample Orders list page ────────────────────────────
// ─── Order detail drawer ───────────────────────────
function OrderDetailDrawer({ open, order, onClose }) {
  if (!open || !order) return null;
  const total = orderTotal(order);
  const totalQty = orderQty(order);
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        zIndex: "var(--z-overlay)",
        background: "var(--color-bg-overlay)",
        animation: "fade-in var(--duration-normal) var(--easing-standard)",
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(820px, 92vw)",
        zIndex: "var(--z-modal)",
        background: "var(--bg1)",
        boxShadow: "var(--shadow-5)",
        display: "flex", flexDirection: "column",
        animation: "fade-in var(--duration-normal) var(--easing-emphasized)",
        borderLeft: "1px solid var(--border-2)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--border-1)",
          background: "var(--bg2)",
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            borderRadius: "var(--radius-md)",
            background: "var(--accent)", color: "var(--accent-on)",
            display: "grid", placeItems: "center",
            boxShadow: "var(--shadow-cta)",
          }}>
            <Ico name="box" size={17} stroke={1.7} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h4" style={{ fontSize: 15 }}>Order detail</div>
            <div style={{ fontSize: 12, color: "var(--fg3)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span className="mono" style={{ color: "var(--fg2)" }}>{order.id}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{totalQty} unit{totalQty > 1 ? "s" : ""}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <button onClick={onClose} className="tds-btn tds-btn--secondary tds-btn--sm" style={{ width: 32, padding: 0 }} title="Close">
            <Ico name="x" size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
          {/* Summary card */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-3) var(--space-5)",
            marginBottom: "var(--space-5)",
            padding: "var(--space-4) var(--space-5)",
            background: "var(--bg2)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--radius-lg)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="overline" style={{ fontSize: 10 }}>Order ID</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{order.id}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="overline" style={{ fontSize: 10 }}>Created</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{order.createdAt}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="overline" style={{ fontSize: 10 }}>Models / Units</span>
              <span className="mono num" style={{ fontSize: 13, fontWeight: 500 }}>
                {order.items.length} <span style={{ color: "var(--fg3)" }}>/ {totalQty}</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="overline" style={{ fontSize: 10 }}>Total</span>
              <span className="mono num" style={{ fontSize: 14, fontWeight: 600 }}>
                ${total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Failed reason banner */}
          {order.failedReason && (
            <div style={{
              marginBottom: "var(--space-4)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--error-bg)",
              border: "1px solid oklch(58% 0.20 25 / 0.25)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Ico name="alert" size={14} style={{ color: "var(--error)" }} />
              <span style={{ fontSize: 12, color: "var(--color-error-700)" }}>
                {order.failedReason}
              </span>
            </div>
          )}

          {/* Line items table */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: "var(--space-3)",
          }}>
            <Ico name="box" size={14} style={{ color: "var(--fg3)" }} />
            <h4 className="h4" style={{ fontSize: 13, margin: 0 }}>Line items</h4>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)" }}>
              {order.items.length} model{order.items.length > 1 ? "s" : ""} · {totalQty} unit{totalQty > 1 ? "s" : ""}
            </span>
          </div>

          <Card padding={0}>
            <div style={{ overflowX: "auto" }}>
              <table className="tds-table num">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Unit</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, flexShrink: 0,
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg3)",
                            border: "1px solid var(--border-1)",
                            display: "grid", placeItems: "center",
                            color: "var(--fg3)",
                          }}>
                            <Ico name="device" size={14} />
                          </div>
                          <span style={{ fontSize: 12.5, color: "var(--fg1)", whiteSpace: "nowrap" }}>{it.model}</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={it.type === "Semi-integration" ? "info" : "neutral"}>
                          {it.type}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>
                          ${it.unitPrice.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg1)" }}>{it.qty}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono num" style={{ fontSize: 13, fontWeight: 500 }}>
                          ${(it.unitPrice * it.qty).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg3)" }}>
                    <td colSpan={3} style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderTop: "1px solid var(--border-2)",
                    }}></td>
                    <td style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderTop: "1px solid var(--border-2)",
                      textAlign: "right",
                      fontSize: 11.5, color: "var(--fg3)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>Total</td>
                    <td style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderTop: "1px solid var(--border-2)",
                      textAlign: "right",
                    }}>
                      <span className="mono num" style={{ fontSize: 15, fontWeight: 600, color: "var(--fg1)" }}>
                        ${total.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "var(--space-3) var(--space-6)",
          borderTop: "1px solid var(--border-1)",
          background: "var(--bg2)",
        }}>
          <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Activate units via <b style={{ color: "var(--fg2)" }}>Sample Activation</b> with the 6-digit code on each device.
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button icon="download">Download invoice</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function SampleOrdersPage() {
  const [filter, setFilter] = useStateO("all");
  const [query, setQuery]   = useStateO("");
  const [detailOrder, setDetailOrder] = useStateO(null);

  const filtered = useMemoO(() => {
    return SAMPLE_ORDERS.filter(o => {
      if (filter === "ready"      && o.status !== "ready") return false;
      if (filter === "activating" && o.status !== "activating") return false;
      if (filter === "done"       && o.status !== "done") return false;
      if (query) {
        const haystack = `${o.id} ${o.items.map(it => `${it.model} ${it.sku}`).join(" ")}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [filter, query]);

  // Pagination — resets to page 1 when filter/query changes
  const pager = usePaginated(filtered, 10, `${filter}|${query}`);

  const counts = useMemoO(() => ({
    all:        SAMPLE_ORDERS.length,
    ready:      SAMPLE_ORDERS.filter(o => o.status === "ready").length,
    activating: SAMPLE_ORDERS.filter(o => o.status === "activating").length,
    done:       SAMPLE_ORDERS.filter(o => o.status === "done").length,
  }), []);

  return (
    <div style={{ background: "var(--bg1)", minHeight: "100%" }}>
      <PageHeader
        title="Sample Orders"
        subtitle="View your sample shipments from Newland and track activation status per order."
        actions={
          <>
            <Button icon="filter">Filters</Button>
            <Button icon="download">Export</Button>
          </>
        }
      />

      <div style={{
        padding: "var(--space-5) var(--space-6)",
        display: "flex", flexDirection: "column", gap: "var(--space-4)",
      }}>

        {/* Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 300px" }}>
            <TextInput
              prefix={<Ico name="search" size={13} />}
              placeholder="Search orders, SKUs…"
              value={query}
              onChange={setQuery}
              size="sm"
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: 4, flexWrap: "wrap" }}>
            <FilterChip active={filter === "all"}        onClick={() => setFilter("all")}>All</FilterChip>
            <FilterChip active={filter === "ready"}      onClick={() => setFilter("ready")}>Ready to activate</FilterChip>
            <FilterChip active={filter === "activating"} onClick={() => setFilter("activating")}>Activating</FilterChip>
            <FilterChip active={filter === "done"}       onClick={() => setFilter("done")}>All activated</FilterChip>
          </div>
        </div>

        {/* Orders table */}
        <Card padding={0}>
          <div style={{ overflowX: "auto" }}>
            <table className="tds-table num">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Order</th>
                  <th style={{ minWidth: 260 }}>Models &amp; units</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right", width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((o) => {
                  const total = orderTotal(o);
                  const totalQty = orderQty(o);
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className="mono" style={{ fontWeight: 500, color: "var(--fg1)", whiteSpace: "nowrap" }}>{o.id}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {o.items.map((it, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 26, height: 26, flexShrink: 0,
                                borderRadius: "var(--radius-sm)",
                                background: "var(--bg3)",
                                border: "1px solid var(--border-1)",
                                display: "grid", placeItems: "center",
                                color: "var(--fg3)",
                              }}>
                                <Ico name="device" size={13} />
                              </div>
                              <span style={{
                                fontWeight: 450, color: "var(--fg1)", fontSize: 12.5,
                                whiteSpace: "nowrap",
                              }}>
                                {it.model}
                                <span className="mono num" style={{ color: "var(--fg3)", marginLeft: 6, fontSize: 11.5 }}>
                                  × {it.qty}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={{ fontSize: 12, color: "var(--fg2)", whiteSpace: "nowrap" }}>
                        <span className="mono">{o.createdAt}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono num" style={{ fontWeight: 500, color: "var(--fg1)", fontSize: 13 }}>
                          ${total.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button variant="ghost" size="sm" iconRight="chevr" onClick={() => setDetailOrder(o)}>View</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pager.page}
            pageSize={pager.pageSize}
            total={pager.total}
            onChange={pager.setPage}
            onPageSizeChange={pager.setPageSize}
          />
        </Card>

        {/* Footer hint */}
        <div className="caption" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 4px var(--space-2)",
        }}>
          <Ico name="info" size={12} />
          <span>To activate a sample unit, go to <b style={{ color: "var(--fg2)" }}>Sample Activation</b> and enter the 6-digit code shown on the device.</span>
        </div>
      </div>

      <OrderDetailDrawer
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}

Object.assign(window, { SampleOrdersPage, SAMPLE_ORDERS, STATUS_META, orderTotal, orderQty, orderActivated });
