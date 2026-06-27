/* global React, Ico, Badge, Button, Card, Input, PageHeader */
// ─────────────────────────────────────────────────────────────
// Sample Orders — list view
// Columns: Order · Models & units · Status · Created · Total
// No KPI tiles. No carrier/owner/received/activation progress.
// ─────────────────────────────────────────────────────────────

const { useState: useStateO, useMemo: useMemoO, useRef: useRefO, useEffect: useEffectO } = React;

// Pull shell primitives off window — Babel scripts don't share scope.
const { Ico, Badge, Button, Card, PageHeader, Pagination, usePaginated, PortalDropdown, Toast } = window;

// ─── CSV helpers ────────────────────────────────────────────
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function ordersToCsv(orders) {
  const headers = ["Order #", "Status", "Created", "Models", "Units", "Total (USD)"];
  const rows = orders.map(o => [
    o.id,
    (window.STATUS_META || {})[o.status]?.label || o.status,
    o.createdAt,
    o.items.map(it => `${it.model} × ${it.qty}`).join("; "),
    o.items.reduce((s, it) => s + it.qty, 0),
    o.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
  ]);
  return [headers, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
}
function downloadCsv(filename, csv) {
  // BOM so Excel opens UTF-8 cleanly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Adapter — bridge source's TextInput(value: string) onto current shell's Input(event).
function TextInput({ value, onChange, size, prefix, suffix, placeholder, mono, onKeyDown }) {
  return (
    <window.Input
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      size={size}
      prefix={prefix}
      suffix={suffix}
      placeholder={placeholder}
      mono={mono}
      onKeyDown={onKeyDown}
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

// ─── Applied-filter chip (removable) ────────────────────────
function AppliedChip({ label, value, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 24,
      padding: "0 4px 0 var(--space-3)",
      borderRadius: "var(--radius-full)",
      fontSize: 11.5,
      border: "1px solid var(--border-2)",
      background: "var(--bg2)",
      color: "var(--fg2)",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      <span className="overline" style={{ fontSize: 9.5, color: "var(--fg3)", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span className="mono" style={{ color: "var(--fg1)", fontWeight: 500 }}>{value}</span>
      <button
        onClick={onRemove}
        title={`Remove ${label} filter`}
        style={{
          display: "grid", placeItems: "center",
          width: 18, height: 18, borderRadius: "var(--radius-full)",
          color: "var(--fg3)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}
      >
        <Ico name="x" size={11} />
      </button>
    </span>
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

// ─── Export menu item ───────────────────────────────────────
function ExportMenuItem({ icon, title, subtitle, tag, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", textAlign: "left",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        color: disabled ? "var(--fg3)" : "var(--fg1)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        borderRadius: "var(--radius-sm)",
        background: "var(--bg3)",
        display: "grid", placeItems: "center",
        color: "var(--fg2)",
      }}>
        <Ico name={icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{title}</span>
          {tag && (
            <span style={{
              fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "1px 5px", borderRadius: "var(--radius-sm)",
              background: tag === "Server" ? "var(--accent-soft)" : "var(--bg3)",
              color: tag === "Server" ? "var(--accent)" : "var(--fg3)",
              border: "1px solid",
              borderColor: tag === "Server" ? "transparent" : "var(--border-1)",
            }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 1 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function SampleOrdersPage() {
  // Form state (live as user types — does NOT filter)
  const [inputOrderId, setInputOrderId] = useStateO("");
  const [inputStatus,  setInputStatus]  = useStateO("all");

  // Applied state (only changes on Enter / Search click — this is what the list reads)
  const [appliedOrderId, setAppliedOrderId] = useStateO("");
  const [appliedStatus,  setAppliedStatus]  = useStateO("all");

  const [detailOrder, setDetailOrder] = useStateO(null);

  // Export dropdown + toast
  const exportBtnRef = useRefO(null);
  const [exportOpen, setExportOpen] = useStateO(false);
  const [exporting, setExporting]   = useStateO(false); // backend mode busy flag
  const [toast, setToast]           = useStateO(null);
  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  };

  const runSearch = () => {
    setAppliedOrderId(inputOrderId.trim());
    setAppliedStatus(inputStatus);
  };
  const resetAll = () => {
    setInputOrderId(""); setInputStatus("all");
    setAppliedOrderId(""); setAppliedStatus("all");
  };
  const clearOrderId = () => { setInputOrderId(""); setAppliedOrderId(""); };
  const clearStatus  = () => { setInputStatus("all"); setAppliedStatus("all"); };

  const hasApplied = appliedOrderId || appliedStatus !== "all";

  const filtered = useMemoO(() => {
    return SAMPLE_ORDERS.filter(o => {
      if (appliedStatus !== "all" && o.status !== appliedStatus) return false;
      if (appliedOrderId && !o.id.toLowerCase().includes(appliedOrderId.toLowerCase())) return false;
      return true;
    });
  }, [appliedOrderId, appliedStatus]);

  // Pagination — resets to page 1 when applied filters change
  const pager = usePaginated(filtered, 10, `${appliedOrderId}|${appliedStatus}`);

  // ─── Export handlers ────────────────────────────────────
  const exportVisible = () => {
    setExportOpen(false);
    const csv = ordersToCsv(pager.slice);
    const ts  = new Date().toISOString().slice(0, 10);
    downloadCsv(`sample-orders_page-${pager.page}_${ts}.csv`, csv);
    showToast(`Exported ${pager.slice.length} visible order${pager.slice.length === 1 ? "" : "s"}`, "success");
  };
  const exportAll = () => {
    setExportOpen(false);
    if (exporting) return;
    setExporting(true);
    showToast("Preparing file on the server…", "info");
    // Mock backend round-trip: in reality, this would POST the query and
    // download a server-generated file. Here we simulate latency + return
    // the same CSV from the full filtered set.
    setTimeout(() => {
      const csv = ordersToCsv(filtered);
      const ts  = new Date().toISOString().slice(0, 10);
      downloadCsv(`sample-orders_query_${ts}.csv`, csv);
      setExporting(false);
      showToast(`Exported ${filtered.length} order${filtered.length === 1 ? "" : "s"} from query result`, "success");
    }, 1400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg1)" }}>
      <PageHeader
        title="Sample Orders"
        subtitle="View your sample shipments from Newland and track activation status per order."
      />

      {/* ─── Condition area (sticky at top of page) ─── */}
      <div style={{
        flexShrink: 0,
        padding: "var(--space-4) var(--space-6)",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border-1)",
        display: "flex", flexDirection: "column", gap: "var(--space-3)",
      }}>
        {/* Form row */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {/* Order ID input with Enter-to-search hint */}
          <div style={{ flex: "0 0 340px" }}>
            <TextInput
              prefix={<Ico name="search" size={13} />}
              placeholder="Order number (e.g. SO-2026-0418)"
              value={inputOrderId}
              onChange={setInputOrderId}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              size="sm"
              mono
              suffix={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {inputOrderId && (
                    <button
                      type="button"
                      title="Clear"
                      onClick={(e) => { e.preventDefault(); clearOrderId(); }}
                      style={{
                        display: "grid", placeItems: "center",
                        width: 16, height: 16, borderRadius: "var(--radius-full)",
                        color: "var(--fg3)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}
                    >
                      <Ico name="x" size={11} />
                    </button>
                  )}
                  <kbd style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10, lineHeight: "14px",
                    padding: "1px 5px",
                    border: "1px solid var(--border-2)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg1)",
                    color: "var(--fg3)",
                    whiteSpace: "nowrap",
                  }}>↵ Enter</kbd>
                </span>
              }
            />
          </div>

          {/* Status select with inline clear when active */}
          <label className="tds-select tds-select--sm" style={{ flex: "0 0 180px", position: "relative" }}>
            <select
              value={inputStatus}
              onChange={(e) => setInputStatus(e.target.value)}
              style={{
                appearance: "none", WebkitAppearance: "none",
                flex: 1, height: "100%", background: "transparent",
                border: 0, outline: 0, fontSize: 13, color: "var(--fg1)",
                paddingRight: inputStatus !== "all" ? 22 : "var(--space-5)",
              }}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready to activate</option>
              <option value="activating">Activating</option>
              <option value="done">All activated</option>
            </select>
            {inputStatus !== "all" ? (
              <button
                type="button"
                title="Reset status"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearStatus(); }}
                style={{
                  display: "grid", placeItems: "center",
                  width: 18, height: 18, borderRadius: "var(--radius-full)",
                  color: "var(--fg3)", marginLeft: -18, zIndex: 2,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}
              >
                <Ico name="x" size={12} />
              </button>
            ) : (
              <Ico name="chevd" size={12} className="tds-select__chevron" />
            )}
          </label>

          {/* Search — sits immediately after the conditions */}
          <Button size="sm" icon="search" onClick={runSearch}>Search</Button>
        </div>

        {/* Applied-filters row — only shown when something is applied */}
        {hasApplied && (
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap",
            paddingTop: "var(--space-2)",
            borderTop: "1px dashed var(--border-1)",
          }}>
            <span className="overline" style={{ fontSize: 10, color: "var(--fg3)", letterSpacing: "0.08em" }}>
              Applied
            </span>
            {appliedOrderId && (
              <AppliedChip label="Order #" value={appliedOrderId} onRemove={clearOrderId} />
            )}
            {appliedStatus !== "all" && (
              <AppliedChip
                label="Status"
                value={STATUS_META[appliedStatus]?.label || appliedStatus}
                onRemove={clearStatus}
              />
            )}
            <button
              onClick={resetAll}
              style={{
                marginLeft: "var(--space-1)",
                fontSize: 11.5, color: "var(--fg3)",
                padding: "2px 6px", borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg3)"; }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ─── List area (fills remaining height; toolbar + thead + pagination stay pinned, only rows scroll) ─── */}
      <div style={{
        flex: 1, minHeight: 0,
        padding: "var(--space-5) var(--space-6)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <Card padding={0} style={{
          flex: 1, minHeight: 0,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-1)",
            background: "var(--bg2)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ico name="box" size={14} style={{ color: "var(--fg3)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>
                <span className="mono num">{filtered.length}</span>
                <span style={{ color: "var(--fg3)", marginLeft: 6, fontWeight: 400 }}>
                  order{filtered.length === 1 ? "" : "s"}
                  {hasApplied && <> · filtered from <span className="mono num">{SAMPLE_ORDERS.length}</span></>}
                </span>
              </span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <div ref={exportBtnRef} style={{ display: "inline-flex" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={exporting ? "refresh" : "download"}
                  iconRight="chevdown"
                  onClick={() => setExportOpen(v => !v)}
                  disabled={exporting}
                >
                  {exporting ? "Preparing…" : "Export"}
                </Button>
              </div>
            </div>
          </div>

          {/* Export menu */}
          <PortalDropdown
            anchorRef={exportBtnRef}
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            placement="bottom-end"
            minWidth={280}
          >
            <div style={{
              background: "var(--bg2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-3)",
              padding: 4,
              animation: "fade-in var(--duration-fast) var(--easing-standard)",
            }}>
              <ExportMenuItem
                icon="download"
                title="Export visible rows"
                subtitle={`Current page · ${pager.slice.length} order${pager.slice.length === 1 ? "" : "s"}`}
                tag="Local"
                onClick={exportVisible}
                disabled={pager.slice.length === 0}
              />
              <div style={{ height: 1, background: "var(--border-1)", margin: "2px 4px" }} />
              <ExportMenuItem
                icon="upload"
                title="Export all query results"
                subtitle={`Full filtered set · ${filtered.length} order${filtered.length === 1 ? "" : "s"}`}
                tag="Server"
                onClick={exportAll}
                disabled={filtered.length === 0}
              />
              <div style={{
                padding: "6px 10px 4px",
                fontSize: 10.5, color: "var(--fg3)",
                borderTop: "1px solid var(--border-1)",
                marginTop: 4,
              }}>
                <Ico name="info" size={10} /> Server export may take a moment for large result sets.
              </div>
            </div>
          </PortalDropdown>

          {/* Scrollable table body */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <table className="tds-table num" style={{ width: "100%" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--bg2)" }}>
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
                {pager.slice.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--space-8) var(--space-4)", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--fg3)" }}>
                        <Ico name="search" size={20} />
                        <div style={{ fontSize: 13, color: "var(--fg2)" }}>No orders match your search</div>
                        <button
                          onClick={resetAll}
                          style={{ fontSize: 12, color: "var(--accent)", padding: "4px 8px" }}
                        >Clear filters</button>
                      </div>
                    </td>
                  </tr>
                )}
                {pager.slice.map((o) => {
                  const total = orderTotal(o);
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

          {/* Pagination — stays pinned at bottom of card */}
          <div style={{ flexShrink: 0, borderTop: "1px solid var(--border-1)", background: "var(--bg2)" }}>
            <Pagination
              page={pager.page}
              pageSize={pager.pageSize}
              total={pager.total}
              onChange={pager.setPage}
              onPageSizeChange={pager.setPageSize}
            />
          </div>
        </Card>
      </div>

      <OrderDetailDrawer
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { SampleOrdersPage, SAMPLE_ORDERS, STATUS_META, orderTotal, orderQty, orderActivated });
