/* global React */
// ─────────────────────────────────────────────────────────────
// Sample Devices — primary list + Activate modal
// • Main view: all sample devices (pending + activated)
// • Right-rail action: "Activate Sample Device" opens a modal
//   that lets the operator enter 6-digit codes back-to-back —
//   each successful code flips one row from pending → active
//   and appends a record to the session log inside the modal.
// • Activations are irreversible.
// ─────────────────────────────────────────────────────────────

const { useState, useEffect, useRef, useMemo } = React;
const { Ico, Badge, Button, Card, PageHeader, Modal, Input, Pagination, usePaginated } = window;

// ── Master device list ─────────────────────────────────────
const INITIAL_DEVICES = [
  // ── PENDING (have activation codes; can be redeemed in the modal) ──
  { sn: "TM950K9F2H7B30042", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0418", code: "482915", status: "pending", issuedAt: "Apr 18, 2026" },
  { sn: "TM950K9F2H7B30043", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0418", code: "739264", status: "pending", issuedAt: "Apr 18, 2026" },
  { sn: "TM750PM7P2H4N80019",model: "TOMS N750P", sku: "N750P-EU",  orderId: "SO-2026-0418", code: "104857", status: "pending", issuedAt: "Apr 18, 2026" },
  { sn: "TMX800X3Y8Z2K70007", model: "TOMS X800",  sku: "X800-APAC", orderId: "SO-2026-0402", code: "356821", status: "pending", issuedAt: "Apr 02, 2026" },
  { sn: "TMS90LQ5R9V8B0014",  model: "TOMS S90",   sku: "S90-NA",    orderId: "SO-2026-0402", code: "618307", status: "pending", issuedAt: "Apr 02, 2026" },

  // ── ALREADY ACTIVATED (history) ──
  { sn: "TM750PM7P2H4N80018",model: "TOMS N750P", sku: "N750P-NA",  orderId: "SO-2026-0411", code: "104853", status: "active", activatedAt: "Apr 12, 2026 · 09:22", activatedBy: "Maya Hassan" },
  { sn: "TM750PM7P2H4N80017",model: "TOMS N750P", sku: "N750P-NA",  orderId: "SO-2026-0411", code: "104852", status: "active", activatedAt: "Apr 12, 2026 · 09:21", activatedBy: "Maya Hassan" },
  { sn: "TM750PM7P2H4N80016",model: "TOMS N750P", sku: "N750P-NA",  orderId: "SO-2026-0411", code: "104851", status: "active", activatedAt: "Apr 12, 2026 · 09:19", activatedBy: "Maya Hassan" },
  { sn: "TM950K9F2H7B30041", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0407", code: "482912", status: "active", activatedAt: "Apr 09, 2026 · 14:08", activatedBy: "Marcus Lin" },
  { sn: "TM950K9F2H7B30040", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0407", code: "482911", status: "active", activatedAt: "Apr 09, 2026 · 14:06", activatedBy: "Marcus Lin" },
  { sn: "TMS60G6XR0011",      model: "TOMS S60",   sku: "S60-EU",    orderId: "SO-2026-0329", code: "672341", status: "active", activatedAt: "Apr 02, 2026 · 11:34", activatedBy: "Priya Rao" },
  { sn: "TM950J3K2L9M50028", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0329", code: "551203", status: "active", activatedAt: "Apr 01, 2026 · 16:52", activatedBy: "Priya Rao" },
  { sn: "TM950J3K2L9M50027", model: "TOMS N950",  sku: "N950-EU",   orderId: "SO-2026-0329", code: "551202", status: "active", activatedAt: "Apr 01, 2026 · 16:51", activatedBy: "Priya Rao" },
  { sn: "TMS60G6XR0009",      model: "TOMS S60",   sku: "S60-EU",    orderId: "SO-2026-0314", code: "672334", status: "active", activatedAt: "Mar 18, 2026 · 10:20", activatedBy: "Marcus Lin" },
  { sn: "TMS60G6XR0008",      model: "TOMS S60",   sku: "S60-EU",    orderId: "SO-2026-0314", code: "672333", status: "active", activatedAt: "Mar 17, 2026 · 15:44", activatedBy: "Maya Hassan" },
];

// Codes that resolve but do NOT belong to this ISV
const OTHER_ISV_CODES = new Set(["999111", "999222"]);

const CODE_LENGTH = 6;
const stripCode = (raw) => (raw || "").replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);

function nowStamp() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── 6-digit boxed code input ───────────────────────────────
function CodeInput({ value, onChange, error, disabled, autoFocus }) {
  const ref = useRef(null);
  const stripped = stripCode(value);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus, disabled]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
      <input
        ref={ref}
        value={stripped}
        onChange={(e) => onChange(stripCode(e.target.value))}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        inputMode="numeric"
        pattern="[0-9]*"
        style={{
          position: "absolute", inset: 0, opacity: 0, border: 0,
          background: "transparent", padding: 0,
          width: "100%", height: "100%",
          cursor: disabled ? "not-allowed" : "text",
        }}
        aria-label="6-digit activation code"
      />
      <div
        onClick={() => ref.current && ref.current.focus()}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "var(--space-2)",
          cursor: disabled ? "not-allowed" : "text",
        }}>
        {[0,1,2,3,4,5].map((i) => {
          const ch = stripped[i];
          const isCurrent = i === stripped.length && !disabled;
          const isFilled = ch != null;
          const extraMargin = i === 3 ? "var(--space-2)" : undefined;
          return (
            <div key={i} style={{
              marginLeft: extraMargin,
              height: 56,
              borderRadius: "var(--radius-md)",
              background: disabled ? "var(--bg3)" : "var(--bg2)",
              border: "1px solid",
              borderColor: error      ? "var(--error)"
                         : isCurrent  ? "var(--accent)"
                         : "var(--border-2)",
              boxShadow: error     ? "0 0 0 3px oklch(58% 0.20 25 / 0.18)"
                       : isCurrent ? "var(--shadow-focus)"
                       : "var(--shadow-1)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 26, fontWeight: 500,
              color: error ? "var(--error)" : "var(--fg1)",
              transition: "all var(--duration-fast) var(--easing-standard)",
            }}>
              {isFilled
                ? ch
                : (isCurrent
                    ? <span className="a-caret" style={{
                        width: 2, height: 24, background: "var(--accent)", display: "block",
                      }} />
                    : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────
function Avatar({ name, size = 22 }) {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, oklch(70% 0.13 268), oklch(50% 0.18 282))",
      color: "#fff", flexShrink: 0,
      display: "grid", placeItems: "center",
      fontSize: size <= 22 ? 9.5 : 11, fontWeight: 600,
    }}>{initials}</div>
  );
}

// ─── Status pill ───────────────────────────────────────────
function StatusPill({ status }) {
  if (status === "active") return <Badge tone="success" dot>Activated</Badge>;
  return <Badge tone="warning" dot>Pending</Badge>;
}

// ─── Activate modal (multi-scan flow) ──────────────────────
function ActivateModal({ open, onClose, devices, onActivate, presetCode }) {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState({ kind: "idle" });    // idle | validating | success | error
  const [sessionLog, setSessionLog] = useState([]);         // SNs activated in this open
  const codeRef = useRef(null);

  // Lookup pending device by code (fast)
  const pendingByCode = useMemo(() => {
    const m = {};
    devices.forEach(d => { if (d.status === "pending") m[d.code] = d; });
    return m;
  }, [devices]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCode(presetCode || "");
      setPhase({ kind: "idle" });
      setSessionLog([]);
    }
  }, [open]);

  // Auto-validate when 6 digits typed
  useEffect(() => {
    if (!open) return;
    const stripped = stripCode(code);
    if (stripped.length < CODE_LENGTH) {
      if (phase.kind !== "idle" && phase.kind !== "validating") setPhase({ kind: "idle" });
      return;
    }
    setPhase({ kind: "validating" });
    const t = setTimeout(() => {
      const dev = pendingByCode[stripped];
      if (dev) {
        const stamp = nowStamp();
        const activated = {
          ...dev,
          status: "active",
          activatedAt: stamp,
          activatedBy: "Maya Hassan",
        };
        onActivate(activated);
        setSessionLog(prev => [{ ...activated, _key: stripped + "-" + Date.now() }, ...prev]);
        setPhase({ kind: "success", device: activated });
        // Auto-clear after a beat so the operator can keep scanning
        setTimeout(() => {
          setCode("");
          setPhase({ kind: "idle" });
        }, 1100);
      } else if (OTHER_ISV_CODES.has(stripped)) {
        setPhase({ kind: "error", reason: "This activation code does not belong to your ISV." });
      } else {
        // Already activated?
        const already = devices.find(d => d.code === stripped && d.status === "active");
        if (already) {
          setPhase({ kind: "error", reason: `${already.sn} is already activated — activations cannot be undone.` });
        } else {
          setPhase({ kind: "error", reason: "No matching device. Verify the code shown on the device screen." });
        }
      }
    }, 600);
    return () => clearTimeout(t);
  }, [code, open]);

  const handleClear = () => {
    setCode("");
    setPhase({ kind: "idle" });
    codeRef.current && codeRef.current.focus();
  };

  return (
    <Modal open={open} onClose={onClose} width={620}
      title="Activate Sample Device"
      subtitle="Enter the 6-digit code shown on the device. Scan one after another — each successful code binds a single unit."
      padding={0}
      footer={
        <>
          <div style={{ marginRight: "auto", fontSize: 11.5, color: "var(--fg3)",
                        display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Ico name="lock" size={12} />
            <span>Activations are permanent · ISV ownership re-checked server-side</span>
          </div>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {/* TOP — code entry */}
      <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-3)" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "var(--radius-md)",
            background: "var(--accent)", color: "var(--accent-on)",
            display: "grid", placeItems: "center",
            boxShadow: "var(--shadow-cta)",
          }}>
            <Ico name="key" size={14} stroke={1.7} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Activation code</div>
            <div style={{ fontSize: 11, color: "var(--fg3)" }}>
              6-digit numeric · shown on device first boot
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {sessionLog.length > 0 && (
              <Badge tone="success" dot>
                {sessionLog.length} activated this session
              </Badge>
            )}
          </div>
        </div>

        <CodeInput
          value={code}
          onChange={setCode}
          error={phase.kind === "error"}
          disabled={phase.kind === "validating" || phase.kind === "success"}
          autoFocus
        />

        {/* Status line */}
        <div style={{ marginTop: "var(--space-3)", minHeight: 40 }}>
          {phase.kind === "idle" && (
            <div style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg3)",
              border: "1px dashed var(--border-2)",
              fontSize: 12, color: "var(--fg3)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Ico name="info" size={13} />
              <span>Type or paste the 6-digit code. Codes match against your ISV's pending devices.</span>
            </div>
          )}
          {phase.kind === "validating" && (
            <div className="a-fade" style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--info-bg)",
              border: "1px solid oklch(60% 0.14 230 / 0.25)",
              fontSize: 12, color: "var(--info)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg className="a-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span>Checking ISV ownership…</span>
            </div>
          )}
          {phase.kind === "success" && (
            <div className="a-fade" style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--success-bg)",
              border: "1px solid oklch(58% 0.14 152 / 0.25)",
              fontSize: 12, color: "var(--color-success-700)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div className="a-pop" style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--success)", color: "#fff",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <Ico name="check" size={12} stroke={2.6} />
              </div>
              <span>
                <b className="mono">{phase.device.sn}</b> bound · ready for the next scan
              </span>
            </div>
          )}
          {phase.kind === "error" && (
            <div className="a-fade" style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--error-bg)",
              border: "1px solid oklch(58% 0.20 25 / 0.25)",
              fontSize: 12, color: "var(--color-error-700)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Ico name="alert" size={14} style={{ color: "var(--error)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{phase.reason}</span>
              <button onClick={handleClear} style={{
                fontSize: 11.5, fontWeight: 500, color: "var(--color-error-700)",
                textDecoration: "underline",
              }}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM — session log */}
      <div style={{
        borderTop: "1px solid var(--border-1)",
        background: "var(--bg3)",
        padding: "var(--space-3) var(--space-5) var(--space-4)",
        maxHeight: 280, overflowY: "auto",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: "var(--space-2)",
        }}>
          <div className="overline" style={{ fontSize: 10 }}>Activated this session</div>
          <span style={{
            marginLeft: "auto", fontSize: 11, color: "var(--fg3)",
          }}>{sessionLog.length} device{sessionLog.length === 1 ? "" : "s"}</span>
        </div>

        {sessionLog.length === 0 ? (
          <div style={{
            padding: "var(--space-5) 0", textAlign: "center", color: "var(--fg3)",
            fontSize: 12,
          }}>
            <Ico name="scan" size={20} style={{ opacity: 0.6, marginBottom: 4 }} />
            <div>No activations yet — enter a code above.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sessionLog.map((d) => (
              <div key={d._key} className="a-fade" style={{
                display: "grid",
                gridTemplateColumns: "26px minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1fr) auto",
                alignItems: "center", gap: 10,
                padding: "6px 8px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg2)",
                border: "1px solid var(--border-1)",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "var(--radius-sm)",
                  background: "var(--success-bg)", color: "var(--success)",
                  display: "grid", placeItems: "center",
                }}>
                  <Ico name="check" size={11} stroke={2.6} />
                </div>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--fg1)" }}>{d.sn}</span>
                <span style={{ fontSize: 11.5, color: "var(--fg2)" }}>{d.model}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{d.orderId}</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{d.activatedAt.split(" · ")[1]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Filter chip ───────────────────────────────────────────
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

// ─── Main page ─────────────────────────────────────────────
function SampleDevicesPage({ presetState, presetCode }) {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [filter, setFilter] = useState("all");          // all | pending | active
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPresetCode, setModalPresetCode] = useState("");

  // Open modal automatically when a preset stage is requested via Tweaks
  useEffect(() => {
    if (presetState === "modal-open") {
      setModalPresetCode(presetCode || "");
      setModalOpen(true);
    }
  }, [presetState, presetCode]);

  const counts = useMemo(() => ({
    all:     devices.length,
    pending: devices.filter(d => d.status === "pending").length,
    active:  devices.filter(d => d.status === "active").length,
  }), [devices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter(d => {
      if (filter !== "all" && d.status !== filter) return false;
      if (!q) return true;
      return `${d.sn} ${d.model} ${d.sku} ${d.orderId} ${d.code} ${d.activatedBy || ""}`
        .toLowerCase().includes(q);
    });
  }, [devices, filter, query]);

  // Pagination — resets to page 1 when filter/query changes
  const pager = usePaginated(filtered, 10, `${filter}|${query}`);

  function handleActivate(activated) {
    setDevices(prev => prev.map(d => d.sn === activated.sn
      ? { ...d, status: "active",
          activatedAt: activated.activatedAt,
          activatedBy: activated.activatedBy,
          _justActivated: true }
      : d));
    // Drop the highlight after a beat
    setTimeout(() => {
      setDevices(prev => prev.map(d => d._justActivated ? { ...d, _justActivated: false } : d));
    }, 5000);
  }

  return (
    <div style={{ background: "var(--bg1)", minHeight: "100%" }}>
      <PageHeader
        title="Sample Devices"
        subtitle="All sample units issued to your ISV. Activate new units with the 6-digit code shown on each device — activations are permanent."
        actions={
          <>
            <Button icon="download">Export</Button>
            <Button
              variant="primary"
              icon="scan"
              onClick={() => { setModalPresetCode(""); setModalOpen(true); }}
            >
              Activate Sample Device
            </Button>
          </>
        }
      />

      <div style={{
        padding: "var(--space-5) var(--space-6)",
        display: "flex", flexDirection: "column", gap: "var(--space-4)",
      }}>
        {/* Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 280px" }}>
            <Input
              size="sm"
              prefix={<Ico name="search" size={13} />}
              placeholder="Search SN, model, code, order…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: 4, flexWrap: "wrap" }}>
            <FilterChip active={filter === "all"}     onClick={() => setFilter("all")}>All</FilterChip>
            <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")}>Pending</FilterChip>
            <FilterChip active={filter === "active"}  onClick={() => setFilter("active")}>Activated</FilterChip>
          </div>
        </div>

        {/* Devices table */}
        <Card padding={0}>
          <div style={{ overflowX: "auto" }}>
            <table className="tds-table num">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Serial number</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Activated</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((d) => (
                  <tr key={d.sn} style={d._justActivated ? { background: "var(--success-bg)" } : undefined}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                        <span className="mono" style={{ fontSize: 12, color: "var(--fg1)", whiteSpace: "nowrap" }}>{d.sn}</span>
                        {d._justActivated && <Badge tone="success">just now</Badge>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "var(--fg1)" }}>{d.model}</span>
                    </td>
                    <td><StatusPill status={d.status} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {d.status === "active"
                        ? <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{d.activatedAt}</span>
                        : <span style={{ fontSize: 12, color: "var(--fg3)" }}>—</span>}
                    </td>
                    <td>
                      {d.status === "active" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar name={d.activatedBy} size={20} />
                          <span style={{ fontSize: 12, color: "var(--fg2)" }}>{d.activatedBy}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--fg3)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {pager.slice.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--fg3)" }}>
                      No matching devices.
                    </td>
                  </tr>
                )}
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

        <div className="caption" style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 4px",
        }}>
          <Ico name="info" size={12} />
          <span>Activations are <b style={{ color: "var(--fg2)" }}>permanent</b> — once a sample device is bound to your ISV it cannot be undone.</span>
        </div>
      </div>

      <ActivateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        devices={devices}
        onActivate={handleActivate}
        presetCode={modalPresetCode}
      />
    </div>
  );
}

// Tweaks-facing presets: stage values that should auto-open the modal
window.ACTIVATION_PRESETS = {
  "list":         { presetState: "list",        code: "" },
  "modal-empty":  { presetState: "modal-open",  code: "" },
  "modal-match":  { presetState: "modal-open",  code: "482915" },
  "modal-other":  { presetState: "modal-open",  code: "999111" },
  "modal-unknown":{ presetState: "modal-open",  code: "000000" },
};

Object.assign(window, { SampleDevicesPage, SampleActivationPage: SampleDevicesPage });
