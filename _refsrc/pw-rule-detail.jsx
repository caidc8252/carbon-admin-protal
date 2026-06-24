/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — Rule detail screen
// Three blocks:
//   ① Configuration summary  — terse read-only render of the rule
//   ② Bound terminals        — devices the rule currently runs on,
//                              with a "currently firing" flag inline
//   ③ Recent firings         — last N alerts emitted by this rule
//
// We synthesize the bound-devices list from PW.MERCHANTS' store
// `count` (each store contributes that many SNs). For binding kinds
// `merchant`/`store`/`model` we draw from this synthetic fleet; for
// `sn`, we just stub a representative list.
// ─────────────────────────────────────────────────────────────

const { useState: useStateD, useMemo: useMemoD } = React;

// ─── Synthetic fleet ────────────────────────────────────────
// Built once: for every (merchant, store) pair we generate `count`
// devices with deterministic SNs. Each carries the merchant/store
// pointers + a randomised lastSeen + battery health + model so the
// table renders with realistic variance without needing real data.
PW._fleet = (() => {
  if (PW.__FLEET) return PW.__FLEET;
  const models = ["N950", "S90", "S60", "N750", "X800"];
  const lastSeens = ["just now", "2 min ago", "8 min ago", "31 min ago",
                     "1 h ago", "4 h ago", "yesterday", "2 days ago"];
  const out = [];
  let counter = 0;
  PW.MERCHANTS.forEach(m => {
    m.stores.forEach(s => {
      for (let i = 0; i < s.count; i++) {
        counter++;
        const model = models[counter % models.length];
        out.push({
          sn: `${model}-${String(1000 + counter).padStart(4, "0")}-${String((counter * 31) % 9999).padStart(4, "0")}`,
          model,
          merchantId: m.id, merchantName: m.name,
          storeId: s.id,    storeName: s.name, storeCity: s.city,
          lastSeen: lastSeens[counter % lastSeens.length],
          health: ["good", "good", "good", "fair", "good", "poor", "good"][counter % 7],
        });
      }
    });
  });
  PW.__FLEET = out;
  return out;
})();

// Stitch real alert SNs into the synthetic fleet so the "currently
// firing" badge lines up with actual seed alerts when a rule has them.
PW.boundDevicesFor = (rule) => {
  const fleet = PW._fleet;
  const real = PW.ALERTS
    .filter(a => a.ruleId === rule.id)
    .map(a => ({
      sn: a.deviceSn, model: a.model,
      merchantId: a.merchantId, merchantName: PW.findMerchant(a.merchantId)?.name || "",
      storeId: a.storeId, storeName: PW.findStore(a.storeId)?.name || "",
      storeCity: PW.findStore(a.storeId)?.city || "",
      lastFiredAbs: a.firedAtAbs,
      lastFiredRel: a.firedAt,
      health: "good",
      firingAlert: a,
    }));
  let pool = [];
  const b = rule.binding;
  if (b.kind === "merchant") {
    pool = fleet.filter(d => b.ids.includes(d.merchantId));
  } else if (b.kind === "store") {
    pool = fleet.filter(d => b.ids.includes(d.storeId));
  } else if (b.kind === "model") {
    pool = fleet.filter(d => b.ids.includes(d.model));
  } else if (b.kind === "sn") {
    // SN list — show a representative slice. The first n are picked
    // from the real alerts, rest from the synthetic fleet.
    pool = fleet.slice(0, Math.min(23, rule.matchedDevices || 23));
  }
  // De-dupe by SN (alert rows take priority).
  const seen = new Set(real.map(d => d.sn));
  const merged = [...real, ...pool.filter(d => !seen.has(d.sn))];
  // Cap to matchedDevices to keep the table realistic.
  return merged.slice(0, rule.matchedDevices || merged.length);
};

// Recent firings for a rule.
PW.recentFiringsFor = (rule) => {
  return PW.ALERTS.filter(a => a.ruleId === rule.id);
};

// ═══════════════════════════════════════════════════════════
// RuleDetail
// ═══════════════════════════════════════════════════════════
PW.RuleDetail = function RuleDetail({ ruleId, onBack, onEdit, onOpenAlert, onOpenDeviceHistory, onOpenDeviceProfile }) {
  const rule = useMemoD(() => PW.findRule(ruleId), [ruleId]);
  const [confirmDel, setConfirmDel] = useStateD(false);
  if (!rule) return null;
  const t = PW.TYPES[rule.type];
  const binding = PW.bindingSummary(rule);
  const devices = useMemoD(() => PW.boundDevicesFor(rule), [rule.id]);
  const firings = useMemoD(() => PW.recentFiringsFor(rule), [rule.id]);
  const [tab, setTab] = useStateD("devices");
  const [search, setSearch] = useStateD("");
  const [firingOnly, setFiringOnly] = useStateD(false);

  const filteredDevices = useMemoD(() => {
    return devices.filter(d => {
      if (firingOnly && !d.firingAlert) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return d.sn.toLowerCase().includes(q)
          || d.storeName.toLowerCase().includes(q)
          || d.merchantName.toLowerCase().includes(q);
    });
  }, [devices, search, firingOnly]);

  const firingCount = devices.filter(d => d.firingAlert).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "var(--bg1)" }}>
      {/* Header */}
      <div style={{
        padding: "14px 22px 12px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={{
            padding: 4, color: "var(--fg3)", borderRadius: 5,
            background: "transparent", border: 0, cursor: "pointer",
          }}><PW.Ico name="chevl" size={14} /></button>
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>
            Pre-warnings · <span className="mono">{rule.id}</span>
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={() => onEdit && onEdit(rule)} className="tds-btn tds-btn--sm tds-btn--secondary">
            <PW.Ico name="edit" size={11} />
            Edit rule
          </button>
          <button onClick={() => setConfirmDel(true)} className="tds-btn tds-btn--sm tds-btn--secondary"
            style={{
              color: "var(--color-error-700)",
              borderColor: "color-mix(in oklab, var(--color-error-500) 35%, var(--border-2))",
            }}
            title="Delete this rule">
            <PW.Ico name="trash" size={11} />
            Delete
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{rule.name}</h2>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <PW.TypeChip type={rule.type} size="sm" />
              <span style={{ fontSize: 11, color: "var(--fg3)" }}>
                Created {rule.createdAt} · {rule.createdBy}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14, padding: "14px 22px",
        background: "var(--bg2)", borderBottom: "1px solid var(--border-1)",
      }}>
        <Stat label="Bound devices" value={rule.matchedDevices} />
        <Stat label="Currently firing" value={firingCount}
          tone={firingCount > 0 ? "warning" : "ok"} />
        <Stat label="Notifications"
          value={(
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <PW.Ico name="bell" size={14} style={{ color: "var(--color-primary-700)" }} />
              {rule.notify.email && <PW.Ico name="mail" size={14} style={{ color: "var(--color-primary-700)" }} />}
            </span>
          )}
          hint={`${(rule.notify.recipients || []).length} recipient(s) · ${rule.notify.throttle}`} />
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, padding: "0 22px",
        borderBottom: "1px solid var(--border-1)", background: "var(--bg2)",
      }}>
        {[
          { id: "devices",  label: "Bound terminals" },
          { id: "firings",  label: "All alert records" },
          { id: "config",   label: "Configuration" },
        ].map(o => {
          const active = tab === o.id;
          return (
            <button key={o.id} onClick={() => setTab(o.id)} data-rd-tab={o.id}
              style={{
                padding: "10px 14px", border: 0, background: "transparent",
                fontSize: 12, fontWeight: active ? 500 : 400,
                color: active ? "var(--fg1)" : "var(--fg3)",
                borderBottom: `2px solid ${active ? t.accent : "transparent"}`,
                marginBottom: -1, cursor: "pointer",
              }}>{o.label}</button>
          );
        })}
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
        {tab === "devices" && (
          <DevicesTab devices={filteredDevices} total={devices.length}
            search={search} onSearch={setSearch}
            firingOnly={firingOnly} onToggleFiring={() => setFiringOnly(v => !v)}
            firingCount={firingCount}
            accent={t.accent}
            ruleId={rule.id}
            allDevices={devices}
            onOpenDeviceHistory={onOpenDeviceHistory}
            onOpenDeviceProfile={onOpenDeviceProfile} />
        )}
        {tab === "firings" && (
          <FiringsTab firings={firings} accent={t.accent} onOpenAlert={onOpenAlert}
            onOpenDeviceProfile={onOpenDeviceProfile} />
        )}
        {tab === "config" && (
          <ConfigTab rule={rule} />
        )}
      </div>
      {window.ConfirmDialog && (
        <window.ConfirmDialog open={confirmDel}
          onClose={() => setConfirmDel(false)}
          title={`Delete rule "${rule.name}"?`}
          body="Bound terminals will stop receiving this pre-warning. Alerts already in the inbox stay until handled."
          confirmLabel="Delete rule"
          tone="danger"
          icon="trash"
          onConfirm={() => {
            const name = rule.name;
            setConfirmDel(false);
            PW.deleteRule(rule.id);
            window.showToast?.(`Rule "${name}" deleted`, "warning");
            onBack && onBack();
          }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Pieces
// ═══════════════════════════════════════════════════════════
function Stat({ label, value, hint, tone = "neutral" }) {
  const c = tone === "warning" ? "var(--color-warning-700)"
          : tone === "ok"      ? "var(--color-success-700)"
                                : "var(--fg1)";
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 500,
                    letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div className="mono" style={{
        marginTop: 4, fontSize: 22, fontWeight: 500, color: c, lineHeight: 1.1,
      }}>{value}</div>
      {hint && <div style={{ marginTop: 3, fontSize: 11, color: "var(--fg3)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hint}
                </div>}
    </div>
  );
}

function DevicesTab({ devices, total, search, onSearch, firingOnly, onToggleFiring,
                      firingCount, accent, ruleId, allDevices,
                      onOpenDeviceHistory, onOpenDeviceProfile }) {
  const [page, setPage] = useStateD(1);
  const [pageSize, setPageSize] = useStateD(10);

  // Reset to page 1 whenever the filter set changes (so the user never
  // lands on a non-existent page after narrowing).
  React.useEffect(() => { setPage(1); }, [search, firingOnly, pageSize]);

  const totalPages = Math.max(1, Math.ceil(devices.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageDevices = devices.slice(startIdx, startIdx + pageSize);

  const downloadCsv = () => {
    const rule = PW.findRule(ruleId);
    const rows = [
      ["SN", "Model", "Merchant", "Store", "City", "Last seen", "State"],
      ...(allDevices || devices).map(d => [
        d.sn, d.model,
        d.merchantName || "", d.storeName || "", d.storeCity || "",
        d.lastFiredAbs || "",
        d.firingAlert ? "Pre-warning" : "Normal",
      ]),
    ];
    const csv = rows.map(r =>
      r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rule?.id || "rule"}-bound-terminals.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast?.(`Exported ${(allDevices || devices).length} terminals`, "success");
  };

  return (
    <div style={{
      background: "var(--bg2)", borderRadius: 10,
      border: "1px solid var(--border-1)",
      boxShadow: "var(--shadow-1)", overflow: "hidden",
    }}>
      {(() => {
        const rule = PW.findRule(ruleId);
        if (!rule) return null;
        const isDynamic = rule.binding.kind !== "sn";
        const kindLabel = rule.binding.kind;
        const scopeName = rule.binding.ids?.map(id => {
          if (kindLabel === "merchant") return PW.findMerchant(id)?.name || id;
          if (kindLabel === "store")    return PW.findStore(id)?.name || id;
          return id;
        }).slice(0, 3).join(", ");
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px",
            borderBottom: "1px solid var(--border-1)",
            background: isDynamic
              ? "color-mix(in oklab, var(--color-success-500) 5%, var(--bg2))"
              : "color-mix(in oklab, var(--fg3) 5%, var(--bg2))",
            fontSize: 11, color: "var(--fg2)",
          }}>
            <PW.Ico name={isDynamic ? "reset" : "upload"} size={12}
              style={{ color: isDynamic ? "var(--color-success-700)" : "var(--fg3)", flexShrink: 0 }} />
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: isDynamic ? "var(--color-success-700)" : "var(--fg3)",
              flexShrink: 0,
            }}>
              {isDynamic ? "Dynamic" : "Static"}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>
              {isDynamic
                ? <>New terminals added to <b style={{ color: "var(--fg1)" }}>{scopeName}</b> are auto-bound to this rule. No manual update needed.</>
                : <>Only the <b className="mono" style={{ color: "var(--fg1)" }}>{rule.matchedDevices}</b> serial number{rule.matchedDevices === 1 ? "" : "s"} bound here receive alerts. Click <b>Edit rule</b> to update the list.</>
              }
            </span>
          </div>
        );
      })()}
      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "10px 14px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
      }}>
        <label className="tds-input tds-input--sm" style={{ flex: "0 0 240px" }}>
          <span className="tds-input__addon tds-input__addon--prefix">
            <PW.Ico name="search" size={12} />
          </span>
          <input className="tds-input__el" placeholder="SN, store, or merchant…"
            value={search} onChange={(e) => onSearch(e.target.value)} />
        </label>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 6, cursor: "pointer",
          background: firingOnly ? "color-mix(in oklab, var(--color-warning-500) 10%, transparent)" : "var(--bg3)",
          border: `1px solid ${firingOnly ? "color-mix(in oklab, var(--color-warning-500) 35%, transparent)" : "var(--border-2)"}`,
          color: firingOnly ? "var(--color-warning-700)" : "var(--fg2)",
          fontSize: 11.5, userSelect: "none",
        }}>
          <input type="checkbox" checked={firingOnly} onChange={onToggleFiring}
            style={{ margin: 0, accentColor: "var(--color-warning-500)" }} />
          Currently firing only
          <span className="mono" style={{ marginLeft: 2, opacity: 0.7 }}>({firingCount})</span>
        </label>
        <span style={{ flex: 1 }} />
        <button onClick={downloadCsv}
          className="tds-btn tds-btn--sm tds-btn--secondary"
          title="Download the bound-terminal list as CSV">
          <PW.Ico name="upload" size={11} style={{ transform: "rotate(180deg)" }} />
          Download
        </button>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>
          {devices.length === total ? `${total} devices` : `${devices.length} / ${total}`}
        </span>
      </div>

      {/* Table */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1.4fr) 90px minmax(0, 1.4fr) 100px 110px",
        gap: 12, padding: "9px 14px",
        background: "var(--bg3)",
        borderBottom: "1px solid var(--border-1)",
        fontSize: 10.5, fontWeight: 500, color: "var(--fg3)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span />
        <span>Device · SN</span>
        <span>Model</span>
        <span>Store · merchant</span>
        <span style={{ textAlign: "right" }}>Last fired</span>
        <span style={{ textAlign: "right" }}>State</span>
      </div>

      {devices.length === 0 ? (
        <div style={{ padding: "30px 18px", textAlign: "center",
                      fontSize: 12, color: "var(--fg3)" }}>
          No devices match the current filters.
        </div>
      ) : pageDevices.map((d, idx) => {
        const isFiring = !!d.firingAlert;
        return (
          <div key={d.sn} onClick={() => onOpenDeviceHistory && onOpenDeviceHistory(d.sn, ruleId)}
            style={{
              display: "grid",
              gridTemplateColumns: "24px minmax(0, 1.4fr) 90px minmax(0, 1.4fr) 100px 110px",
              gap: 12, padding: "9px 14px", alignItems: "center",
              borderTop: idx === 0 ? 0 : "1px solid var(--border-1)",
              background: isFiring ? "color-mix(in oklab, var(--color-warning-500) 5%, var(--bg2))" : "var(--bg2)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 4%, var(--bg2))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isFiring ? "color-mix(in oklab, var(--color-warning-500) 5%, var(--bg2))" : "var(--bg2)"; }}>
            <span style={{ display: "flex", justifyContent: "center" }}>
              {isFiring ? (
                <span title="Currently firing" style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)`,
                }} />
              ) : (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--border-2)",
                }} />
              )}
            </span>
            <span style={{ fontSize: 12, color: "var(--fg1)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: isFiring ? 500 : 400,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <PW.SNText sn={d.sn} onJump={onOpenDeviceProfile}
                weight={isFiring ? 500 : 400} />
            </span>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{d.model}</span>
            <span style={{ minWidth: 0, fontSize: 11.5, color: "var(--fg2)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.storeName} · <span style={{ color: "var(--fg3)" }}>{d.merchantName}</span>
            </span>
            <span className="mono"
              title={d.lastFiredRel || ""}
              style={{ fontSize: 11, color: "var(--fg3)", textAlign: "right" }}>
              {d.lastFiredAbs || "—"}
            </span>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {isFiring ? (
                <span title={`Live value: ${d.firingAlert.currentText}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 999,
                    background: `color-mix(in oklab, ${accent} 12%, transparent)`,
                    color: accent, fontSize: 10.5, fontWeight: 500,
                    border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)`,
                  }}>
                  <PW.Ico name="alert" size={9} stroke={2} />
                  Pre-warning
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "var(--fg3)" }}>Normal</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Pagination footer */}
      {devices.length > 0 && (
        <div style={{
          padding: "8px 14px", borderTop: "1px solid var(--border-1)",
          background: "var(--bg2)",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 11, color: "var(--fg3)",
        }}>
          <span>
            <b className="mono" style={{ color: "var(--fg1)" }}>
              {startIdx + 1}–{Math.min(startIdx + pageSize, devices.length)}
            </b> of <b className="mono" style={{ color: "var(--fg1)" }}>{devices.length}</b>
          </span>
          <span style={{ flex: 1 }} />
          <span>Page size</span>
          <select value={pageSize}
            onChange={(e) => setPageSize(+e.target.value)}
            style={{
              padding: "3px 6px", fontSize: 11,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              borderRadius: 5, color: "var(--fg1)", cursor: "pointer",
            }}>
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "3px 8px", borderRadius: 5,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              color: page === 1 ? "var(--fg3)" : "var(--fg1)",
              opacity: page === 1 ? 0.55 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
            }}>
            <PW.Ico name="chevl" size={10} stroke={2} />
            Prev
          </button>
          <span className="mono" style={{ color: "var(--fg1)" }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "3px 8px", borderRadius: 5,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              color: page >= totalPages ? "var(--fg3)" : "var(--fg1)",
              opacity: page >= totalPages ? 0.55 : 1,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
            }}>
            Next
            <PW.Ico name="chevr" size={10} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}

function FiringsTab({ firings, accent, onOpenAlert, onOpenDeviceProfile }) {
  const [page, setPage] = useStateD(1);
  const [pageSize, setPageSize] = useStateD(10);
  const [search, setSearch] = useStateD("");
  const [merchantFilter, setMerchantFilter] = useStateD("all");
  const [modelFilter, setModelFilter] = useStateD("all");

  // Build dropdown options from this rule's alerts
  const merchantOptions = useMemoD(() => {
    const map = new Map();
    firings.forEach(a => {
      if (!map.has(a.merchantId)) {
        map.set(a.merchantId, PW.findMerchant(a.merchantId)?.name || a.merchantId);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [firings]);
  const modelOptions = useMemoD(() => {
    return Array.from(new Set(firings.map(a => a.model).filter(Boolean))).sort();
  }, [firings]);

  const filtered = useMemoD(() => {
    return firings.filter(a => {
      if (merchantFilter !== "all" && a.merchantId !== merchantFilter) return false;
      if (modelFilter !== "all" && a.model !== modelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const merchant = PW.findMerchant(a.merchantId)?.name || "";
        const store = PW.findStore(a.storeId)?.name || "";
        const hay = `${a.deviceSn} ${merchant} ${store} ${a.detail || ""} ${a.currentText || ""} ${a.model || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [firings, search, merchantFilter, modelFilter]);

  React.useEffect(() => { setPage(1); }, [search, merchantFilter, modelFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  const resetFilters = () => {
    setSearch("");
    setMerchantFilter("all");
    setModelFilter("all");
  };
  const anyFilterActive = !!search || merchantFilter !== "all" || modelFilter !== "all";

  if (firings.length === 0) {
    return (
      <div style={{
        padding: "40px 20px", textAlign: "center", fontSize: 12, color: "var(--fg3)",
        background: "var(--bg2)", borderRadius: 10,
        border: "1px solid var(--border-1)",
      }}>
        This rule hasn't fired yet.
      </div>
    );
  }

  const selectStyle = {
    padding: "5px 8px", fontSize: 11.5,
    background: "var(--bg2)", border: "1px solid var(--border-2)",
    borderRadius: 6, color: "var(--fg1)", cursor: "pointer",
    minWidth: 120,
  };

  return (
    <div style={{
      background: "var(--bg2)", borderRadius: 10,
      border: "1px solid var(--border-1)",
      boxShadow: "var(--shadow-1)", overflow: "hidden",
    }}>
      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "10px 14px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
      }}>
        <label className="tds-input tds-input--sm" style={{ flex: "0 0 240px" }}>
          <span className="tds-input__addon tds-input__addon--prefix">
            <PW.Ico name="search" size={12} />
          </span>
          <input className="tds-input__el" placeholder="SN, store, merchant, detail…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select value={merchantFilter}
          onChange={(e) => setMerchantFilter(e.target.value)}
          title="Filter by merchant"
          style={selectStyle}>
          <option value="all">All merchants</option>
          {merchantOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          title="Filter by model"
          style={selectStyle}>
          <option value="all">All models</option>
          {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {anyFilterActive && (
          <button onClick={resetFilters}
            style={{
              padding: "4px 9px", borderRadius: 6, fontSize: 11,
              background: "transparent", border: "1px solid var(--border-2)",
              color: "var(--fg3)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
            <PW.Ico name="x" size={10} stroke={2} />
            Clear
          </button>
        )}
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>
          {filtered.length === firings.length
            ? `${firings.length} record${firings.length === 1 ? "" : "s"}`
            : `${filtered.length} / ${firings.length}`}
        </span>
      </div>

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 0.85fr) minmax(0, 1fr) 70px minmax(0, 1.4fr) minmax(0, 1.1fr) 95px",
        gap: 12, padding: "9px 14px",
        background: "var(--bg3)",
        borderBottom: "1px solid var(--border-1)",
        fontSize: 10.5, fontWeight: 500, color: "var(--fg3)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span />
        <span>Trigger</span>
        <span>Device · SN</span>
        <span>Model</span>
        <span>Store · merchant</span>
        <span>Detail</span>
        <span style={{ textAlign: "right" }}>Fired</span>
      </div>

      {pageRows.length === 0 ? (
        <div style={{ padding: "30px 18px", textAlign: "center",
                      fontSize: 12, color: "var(--fg3)" }}>
          No records match this filter.
        </div>
      ) : pageRows.map((a, idx) => {
        const status = PW.statusOf(a);
        const isUnread = status === "unread";
        const merchant = PW.findMerchant(a.merchantId);
        const store = PW.findStore(a.storeId);
        return (
          <div key={a.id} onClick={() => onOpenAlert && onOpenAlert(a)}
            style={{
              display: "grid",
              gridTemplateColumns: "24px minmax(0, 0.85fr) minmax(0, 1fr) 70px minmax(0, 1.4fr) minmax(0, 1.1fr) 95px",
              gap: 12, padding: "9px 14px", alignItems: "center",
              borderTop: idx === 0 ? 0 : "1px solid var(--border-1)",
              background: isUnread ? "color-mix(in oklab, var(--color-primary-500) 4%, var(--bg2))" : "var(--bg2)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 6%, var(--bg2))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? "color-mix(in oklab, var(--color-primary-500) 4%, var(--bg2))" : "var(--bg2)"; }}>
            <span style={{ display: "flex", justifyContent: "center" }}>
              <PW.ReadDot status={status} size={8} />
            </span>
            <span className="mono" style={{
              fontSize: 11.5, fontWeight: isUnread ? 600 : 500,
              color: accent,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{a.currentText}</span>
            <span style={{
              fontSize: 11.5, color: "var(--fg1)",
              fontFamily: "var(--font-mono)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <PW.SNText sn={a.deviceSn} onJump={onOpenDeviceProfile}
                weight={isUnread ? 600 : 500} />
            </span>
            <span className="mono" style={{
              fontSize: 11.5, color: "var(--fg2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{a.model || "—"}</span>
            <span style={{
              fontSize: 11.5, color: "var(--fg2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {store?.name || "—"}
              <span style={{ color: "var(--fg3)" }}> · {merchant?.name || "—"}</span>
            </span>
            <span style={{
              fontSize: 11.5, color: "var(--fg2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{a.detail || "—"}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg3)", textAlign: "right" }}>
              {a.firedAt}
            </span>
          </div>
        );
      })}

      {/* Pagination footer */}
      {filtered.length > 0 && (
        <div style={{
          padding: "8px 14px", borderTop: "1px solid var(--border-1)",
          background: "var(--bg2)",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 11, color: "var(--fg3)",
        }}>
          <span>
            <b className="mono" style={{ color: "var(--fg1)" }}>
              {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)}
            </b> of <b className="mono" style={{ color: "var(--fg1)" }}>{filtered.length}</b>
          </span>
          <span style={{ flex: 1 }} />
          <span>Page size</span>
          <select value={pageSize}
            onChange={(e) => setPageSize(+e.target.value)}
            style={{
              padding: "3px 6px", fontSize: 11,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              borderRadius: 5, color: "var(--fg1)", cursor: "pointer",
            }}>
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "3px 8px", borderRadius: 5,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              color: page === 1 ? "var(--fg3)" : "var(--fg1)",
              opacity: page === 1 ? 0.55 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
            }}>
            <PW.Ico name="chevl" size={10} stroke={2} />
            Prev
          </button>
          <span className="mono" style={{ color: "var(--fg1)" }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "3px 8px", borderRadius: 5,
              background: "var(--bg2)", border: "1px solid var(--border-2)",
              color: page >= totalPages ? "var(--fg3)" : "var(--fg1)",
              opacity: page >= totalPages ? 0.55 : 1,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
            }}>
            Next
            <PW.Ico name="chevr" size={10} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}

function ConfigTab({ rule }) {
  const t = PW.TYPES[rule.type];
  const binding = PW.bindingSummary(rule);
  // Compact readable summary of the trigger condition.
  let conditionSummary;
  if (t.kind === "multi") {
    conditionSummary = (rule.config.opts || []).join(" or ");
  } else if (t.kind === "threshold") {
    conditionSummary = `${t.label} ${rule.config.dir === "above" ? "≥" : "≤"} ${rule.config.value} %`;
  } else if (t.kind === "geo") {
    const bits = [];
    if (rule.config.mode === "radius" || rule.config.mode === "both") {
      bits.push(`outside ${rule.config.radiusKm} km from store`);
    }
    if (rule.config.mode === "cities" || rule.config.mode === "both") {
      bits.push(`outside city whitelist (${(rule.config.cities || []).length})`);
    }
    conditionSummary = bits.join(" AND/OR ") || "—";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
      <ConfigCard title="Trigger condition"
        icon={t.icon} accent={t.accent}>
        <div style={{ fontSize: 12.5, color: "var(--fg1)", fontWeight: 500 }}>
          {conditionSummary}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg3)" }}>{t.descriptor}</div>
      </ConfigCard>
      <ConfigCard title="Binding" icon={binding.icon} accent="var(--color-primary-500)">
        <div style={{ fontSize: 11.5, color: "var(--fg3)", marginBottom: 2 }}>
          {binding.kindLabel}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg1)", fontWeight: 500 }}>
          {binding.text}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg3)" }}>
          {rule.matchedDevices} device{rule.matchedDevices === 1 ? "" : "s"} matched
        </div>
      </ConfigCard>
      <ConfigCard title="Station letter" icon="bell" accent="var(--color-primary-500)">
        <div style={{ fontSize: 12, color: "var(--fg1)", fontWeight: 500 }}>Always on</div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg3)" }}>
          Surfaces in the Pre-warnings inbox. Counts toward the bell badge.
        </div>
      </ConfigCard>
      <ConfigCard title="Email" icon="mail"
        accent={rule.notify.email ? "var(--color-primary-500)" : "var(--fg3)"}>
        {rule.notify.email ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {(rule.notify.recipients || []).map(r => (
                <span key={r} className="mono" style={{
                  fontSize: 10.5, padding: "1px 7px", borderRadius: 4,
                  background: "color-mix(in oklab, var(--color-primary-500) 8%, transparent)",
                  color: "var(--color-primary-700)",
                }}>{r}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg3)" }}>
              Throttle: <b className="mono">{rule.notify.throttle}</b> · 24 h per-device dedupe applied
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--fg3)" }}>Email channel disabled.</div>
        )}
      </ConfigCard>
    </div>
  );
}

function ConfigCard({ title, icon, accent, children }) {
  return (
    <section style={{
      background: "var(--bg2)", borderRadius: 10,
      border: "1px solid var(--border-1)",
      padding: "14px 16px", boxShadow: "var(--shadow-1)",
    }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6,
          background: `color-mix(in oklab, ${accent} 10%, transparent)`,
          color: accent,
          display: "grid", placeItems: "center",
        }}>
          <PW.Ico name={icon} size={13} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--fg2)",
                        textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
      </header>
      {children}
    </section>
  );
}
