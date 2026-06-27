/* global React */
// ─────────────────────────────────────────────────────────────
// Rollout Modal — 2-step strategy picker
//
// Replaces the old full-screen pull-wizard. Opens whenever the operator
// commits a batch of changes that need an upgrade strategy attached:
//
//   • SubscribedDeployments → Save changes (per-row target/strategy edits)
//   • MerchantAppsTab       → Save changes (assign/edit/remove apps)
//   • Batch "Edit strategy" action on Deployments table
//
// Props
//   changes — array of change records:
//       { kind, merchant, app, fromVersion, toVersion, currentStrategy }
//     kind:
//       "add"             — new merchant+app assignment
//       "version-change"  — target version edited on existing assignment
//       "strategy-change" — strategy changed but version is the same
//       "remove"          — assignment removed
//   initialStrategy   — optional preset to start with
//   onClose, onConfirm(strategy)
//
// The strategy applies uniformly to every change in the batch (per PRD —
// one operation, one strategy). When all changes already share a strategy
// we pre-fill it; otherwise default to "casual".
// ─────────────────────────────────────────────────────────────

const { useState: useStateRM, useMemo: useMemoRM, useEffect: useEffectRM } = React;

const STRAT_STEPS = [
  { id: "review",   label: "Review changes", hint: "Everything in this batch" },
  { id: "strategy", label: "Pick strategy",   hint: "Applies to all changes" },
];

function RolloutModal({ open, changes, initialStrategy, onClose, onConfirm,
                       title = "Save changes · Upgrade strategy", confirmLabel,
                       initialStep = 0,
                       largeBatchHint = false }) {
  // Reset state every time the modal re-opens
  const [step, setStep]         = useStateRM(initialStep);
  const [strategy, setStrategy] = useStateRM(initialStrategy || {
    strategy: "casual", timing: "reboot", network: "any", cellCapMb: 100,
    slots: [{ start: "02:00", end: "04:00" }],
  });

  useEffectRM(() => {
    if (open) {
      setStep(initialStep);
      // If every change shares a strategy preset, seed it; else default
      const all = (changes || []).map(c => c.currentStrategy?.strategy).filter(Boolean);
      const consistent = all.length === (changes || []).length && all.every(s => s === all[0]);
      if (consistent && all[0]) {
        const rec = (changes || []).find(c => c.currentStrategy)?.currentStrategy;
        setStrategy({
          strategy: rec.strategy || "casual",
          timing:   rec.timing   || "reboot",
          network:  rec.network  || "any",
          cellCapMb: rec.cellCapMb || 100,
          slots: Array.isArray(rec.slots) && rec.slots.length
            ? rec.slots
            : [{ start: "02:00", end: "04:00" }],
        });
      } else {
        setStrategy(initialStrategy || { strategy: "casual", timing: "reboot", network: "any", cellCapMb: 100,
          slots: [{ start: "02:00", end: "04:00" }] });
      }
    }
  }, [open]);

  const setPreset = (id) => {
    const p = window.UPGRADE_STRATEGY_PRESETS.find(x => x.id === id);
    if (!p) return;
    if (id === "custom") {
      setStrategy(s => ({ ...s, strategy: "custom" }));
    } else {
      setStrategy(s => ({ ...s, strategy: id, timing: p.timing, network: p.network }));
    }
  };

  if (!open) return null;

  const count = (changes || []).length;
  const isReview   = step === 0;
  const isStrategy = step === 1;

  return (
    <window.Modal open={open} onClose={onClose} width={760} padding={0}
      title={title}
      subtitle={`${count} change${count === 1 ? "" : "s"} — pick one strategy to apply to this batch. Persists per (merchant, app, version).`}
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <RMStepper step={step} steps={STRAT_STEPS} />
          <div style={{ flex: 1 }} />
          {isStrategy && (
            <window.Button onClick={() => setStep(0)}>← Back to changes</window.Button>
          )}
          <window.Button onClick={onClose}>Cancel</window.Button>
          {isReview && (
            <window.Button primary iconRight="chevr"
              onClick={() => setStep(1)} disabled={count === 0}>Next · Pick strategy</window.Button>
          )}
          {isStrategy && (
            <window.Button primary icon="check"
              onClick={() => onConfirm && onConfirm(strategy)}
              disabled={strategy.timing === "scheduled" && !!validateSlots(strategy.slots)}>
              {confirmLabel || `Apply & save (${count})`}
            </window.Button>
          )}
        </div>
      }>
      <div style={{ padding: "16px 20px 8px", maxHeight: "60vh", overflowY: "auto" }}>
        {isReview   && <RMStepReview changes={changes || []} largeBatchHint={largeBatchHint} />}
        {isStrategy && <RMStepStrategy strategy={strategy} setStrategy={setStrategy} setPreset={setPreset} changes={changes || []} />}
      </div>
    </window.Modal>
  );
}

// ─── Step indicator embedded in footer ─────────────────────
function RMStepper({ step, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {steps.map((s, i) => {
        const on = i === step;
        const done = i < step;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <span style={{ width: 18, height: 1,
                background: done ? "var(--color-primary-500)" : "var(--color-border-default)" }} />
            )}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 8px", borderRadius: 6,
              background: on ? "var(--color-primary-50)" : "transparent",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: on ? "var(--color-primary-500)" : done ? "var(--success, oklch(58% 0.14 152))" : "var(--color-bg-3)",
                color: on || done ? "#fff" : "var(--color-text-tertiary)",
                display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 600,
                border: "1px solid",
                borderColor: on ? "var(--color-primary-500)" : done ? "var(--success, oklch(58% 0.14 152))" : "var(--color-border-default)",
              }}>{done ? "✓" : i + 1}</span>
              <span style={{ fontSize: 11.5, fontWeight: on ? 600 : 500,
                color: on ? "var(--color-primary-700)" : done ? "var(--color-text-secondary)" : "var(--color-text-tertiary)" }}>
                {s.label}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Review the change set ─────────────────────────
function RMStepReview({ changes, largeBatchHint = false }) {
  if (changes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
        Nothing to confirm.
      </div>
    );
  }

  // ── Summary stats — what's actually IN this batch?  ────────
  // For small batches this is barely useful; at 100+ rows it's the
  // primary surface, so we always render it.
  const stats = useMemoRM(() => {
    const byKind = { add: 0, "version-change": 0, "strategy-change": 0, remove: 0, uninstall: 0 };
    const byApp  = new Map();        // appName → count
    const byTgt  = new Map();        // versionName → count
    const byPub  = new Map();        // publisherTenantId → count (mocked here as app.publisherTenantId)
    let withStrategy = 0;
    changes.forEach(c => {
      byKind[c.kind] = (byKind[c.kind] || 0) + 1;
      if (c.app?.name)     byApp.set(c.app.name, (byApp.get(c.app.name) || 0) + 1);
      if (c.toVersion?.name) byTgt.set(c.toVersion.name, (byTgt.get(c.toVersion.name) || 0) + 1);
      if (c.currentStrategy) withStrategy++;
    });
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return { byKind, topApp: top(byApp, 3), topTgt: top(byTgt, 3), withStrategy };
  }, [changes]);

  // ── Filter / search / paginate ─────────────────────────────
  const [q, setQ]         = useStateRM("");
  const [kindFilter, setKindFilter] = useStateRM("any");
  const [page, setPage]   = useStateRM(0);
  const PAGE_SIZE = 15;

  const filtered = useMemoRM(() => changes.filter(c => {
    if (kindFilter !== "any" && c.kind !== kindFilter) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (c.merchant?.name || "").toLowerCase().includes(needle) ||
      (c.merchant?.region || "").toLowerCase().includes(needle) ||
      (c.app?.name || "").toLowerCase().includes(needle) ||
      (c.toVersion?.name || "").toLowerCase().includes(needle)
    );
  }), [changes, q, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const KIND_LABEL = {
    add: "Add", "version-change": "Version change",
    "strategy-change": "Strategy change", remove: "Remove",
    uninstall: "Uninstall",
  };

  // Compact kind-summary chips, always shown.
  const kindChips = ["add", "version-change", "strategy-change", "remove", "uninstall"]
    .filter(k => stats.byKind[k] > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Large-batch advisory ───────────────────────────
          Surfaces only when we've been told the calling surface is
          batch-prone (App Store · Deployments) AND the batch is big
          enough that submitting it as a single strategy is risky. */}
      {largeBatchHint && changes.length > 500 && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 12px",
          background: "var(--color-warning-50, oklch(96.5% 0.04 80))",
          color: "var(--color-warning-700, oklch(56% 0.15 60))",
          border: "1px solid oklch(70% 0.16 70 / 0.30)",
          borderRadius: "var(--radius-md)",
          fontSize: 12, lineHeight: 1.55,
        }}>
          <window.Ico name="alert" size={14} stroke={2}
            style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Large batch · consider splitting
            </div>
            <div>
              You're about to apply <span className="mono num"><b>one strategy</b></span> to{" "}
              <span className="mono num">{changes.length.toLocaleString()}</span> changes. If
              different cohorts (regions, store sizes, business hours) need
              different timing/network rules, submit them as separate
              batches — filter the Deployments table first, save those, then
              repeat. This batch is still valid; the warning is advisory.
            </div>
          </div>
        </div>
      )}

      {/* ── Summary header ─────────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "12px 14px",
        background: "var(--bg2)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span className="mono num" style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
          }}>{changes.length.toLocaleString()}</span>
          <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>
            change{changes.length === 1 ? "" : "s"} in this batch
            {stats.withStrategy > 0 && (
              <> · <span className="mono num">{stats.withStrategy}</span> already have a strategy (will be overwritten)</>
            )}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {kindChips.map(k => (
            <button key={k}
              onClick={() => { setKindFilter(kindFilter === k ? "any" : k); setPage(0); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 999,
                fontSize: 11.5, fontWeight: 500,
                background: kindFilter === k ? "var(--color-primary-50)" : "var(--bg3)",
                color: kindFilter === k ? "var(--color-primary-700)" : "var(--fg2)",
                border: "1px solid",
                borderColor: kindFilter === k ? "var(--color-primary-500)" : "var(--border-1)",
                cursor: "pointer",
              }}>
              <span>{KIND_LABEL[k]}</span>
              <span className="mono num" style={{ opacity: 0.85 }}>{stats.byKind[k]}</span>
            </button>
          ))}
          {kindFilter !== "any" && (
            <button onClick={() => { setKindFilter("any"); setPage(0); }} style={{
              fontSize: 11.5, color: "var(--color-text-tertiary)", padding: "3px 6px",
            }}>Clear</button>
          )}
        </div>
        {(stats.topApp.length > 1 || stats.topTgt.length > 0) && (
          <div style={{
            display: "grid", gridTemplateColumns: stats.topTgt.length > 0 && stats.topApp.length > 1
                                                  ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
            gap: 12,
            paddingTop: 8, borderTop: "1px dashed var(--border-1)",
          }}>
            {stats.topApp.length > 1 && (
              <div>
                <div className="overline" style={{ fontSize: 10, marginBottom: 4 }}>Top apps</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {stats.topApp.map(([name, n], i) => (
                    <span key={name}>
                      {i > 0 && " · "}
                      <b style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{name}</b>
                      {" "}<span className="mono num" style={{ color: "var(--color-text-tertiary)" }}>×{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stats.topTgt.length > 0 && (
              <div>
                <div className="overline" style={{ fontSize: 10, marginBottom: 4 }}>Top target versions</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {stats.topTgt.map(([name, n], i) => (
                    <span key={name}>
                      {i > 0 && " · "}
                      <span className="mono" style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{name}</span>
                      {" "}<span className="mono num" style={{ color: "var(--color-text-tertiary)" }}>×{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Search bar ───────────────────────────────────── */}
      {changes.length > 8 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search merchant, region, app, version…"
              style={{
                width: "100%", padding: "7px 10px 7px 30px",
                fontSize: 12.5, borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-2)", color: "var(--color-text-primary)",
              }} />
            <window.Ico name="search" size={12} style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
            }} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
            {filtered.length.toLocaleString()} of {changes.length.toLocaleString()}
          </div>
        </div>
      )}

      {/* ── Page of rows ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12.5, color: "var(--color-text-tertiary)" }}>
          No changes match the current filter.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col />
            <col />
            <col style={{ width: 160 }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--bg3)" }}>
              <th style={rmTh}>Type</th>
              <th style={rmTh}>Merchant</th>
              <th style={rmTh}>App · target</th>
              <th style={rmTh}>Current strategy</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c, i) => (
              <tr key={safePage * PAGE_SIZE + i}
                  style={{ borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none" }}>
                <td style={rmTd}><ChangeKindPill kind={c.kind} /></td>
                <td style={rmTd}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 5,
                      background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                      display: "grid", placeItems: "center",
                      fontSize: 10, fontWeight: 600, flexShrink: 0,
                    }}>{(c.merchant?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 12.5, fontWeight: 500 }}>{c.merchant?.name || "—"}</div>
                      <div className="truncate" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)" }}>
                        {c.merchant?.region || ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={rmTd}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {window.AppIcon && c.app
                      ? <window.AppIcon app={c.app} size={22} />
                      : <div style={{ width: 22, height: 22, borderRadius: 4, background: "var(--bg3)", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 12.5 }}>{c.app?.name || "—"}</div>
                      <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)" }}>
                        {c.kind === "add" && (
                          <><span>—</span> → <span className="mono" style={{ fontWeight: 500, color: "var(--color-primary-700)" }}>{c.toVersion?.name || "?"}</span></>
                        )}
                        {c.kind === "version-change" && (
                          <><span className="mono">{c.fromVersion?.name || "?"}</span> → <span className="mono" style={{ fontWeight: 500, color: "var(--color-primary-700)" }}>{c.toVersion?.name || "?"}</span></>
                        )}
                        {c.kind === "strategy-change" && (
                          <span className="mono">{c.toVersion?.name || "—"}</span>
                        )}
                        {c.kind === "remove" && (
                          <span className="mono" style={{ textDecoration: "line-through" }}>{c.fromVersion?.name || "—"}</span>
                        )}
                        {c.kind === "uninstall" && (
                          <>uninstall <span className="mono" style={{ textDecoration: "line-through" }}>{c.fromVersion?.name || "—"}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={rmTd}>
                  {c.currentStrategy
                    ? <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {window.strategyLabel(c.currentStrategy)}
                      </span>
                    : <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Not set</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Pagination ───────────────────────────────────── */}
      {filtered.length > PAGE_SIZE && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 4px 2px", fontSize: 12, color: "var(--color-text-secondary)",
        }}>
          <span>
            Showing{" "}
            <span className="mono num" style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
              {(safePage * PAGE_SIZE) + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
            </span>
            {" "}of <span className="mono num">{filtered.length.toLocaleString()}</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}
              style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--fg2)", opacity: safePage === 0 ? 0.5 : 1 }}>
              ← Prev
            </button>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--fg3)" }}>
              {safePage + 1} / {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}
              style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--fg2)", opacity: safePage >= totalPages - 1 ? 0.5 : 1 }}>
              Next →
            </button>
          </div>
        </div>
      )}

      <div style={{
        marginTop: 2,
        padding: "10px 12px", borderRadius: 6,
        background: "var(--color-info-50, oklch(96% 0.04 230))",
        color: "var(--color-info-700, oklch(40% 0.12 230))",
        fontSize: 12, lineHeight: 1.5,
      }}>
        The selected strategy will be <strong>applied uniformly</strong> to all {changes.length.toLocaleString()} change{changes.length === 1 ? "" : "s"} above. Submit in separate batches if different merchants need different strategies.
      </div>
    </div>
  );
}

const rmTh = {
  padding: "8px 12px", fontSize: 10.5,
  textTransform: "uppercase", letterSpacing: "0.04em",
  color: "var(--color-text-tertiary)", fontWeight: 600,
};
const rmTd = { padding: "10px 12px", verticalAlign: "middle", fontSize: 12.5 };

function ChangeKindPill({ kind }) {
  const config = {
    "add":             { label: "Add",      bg: "var(--success-bg, oklch(96% 0.05 152))", fg: "var(--color-success-700, oklch(40% 0.12 152))", border: "oklch(58% 0.14 152 / 0.4)" },
    "version-change":  { label: "Version",  bg: "var(--mod-bg, oklch(96% 0.04 262))", fg: "var(--color-primary-700, oklch(38% 0.14 262))", border: "oklch(60% 0.14 262 / 0.4)" },
    "strategy-change": { label: "Strategy", bg: "oklch(96% 0.04 262)", fg: "var(--color-primary-700)", border: "oklch(60% 0.14 262 / 0.4)" },
    "remove":          { label: "Remove",   bg: "var(--error-bg, oklch(96% 0.04 25))", fg: "var(--color-error-700, oklch(40% 0.14 25))", border: "oklch(58% 0.20 25 / 0.4)" },
    "uninstall":       { label: "Uninstall", bg: "var(--error-bg, oklch(96% 0.04 25))", fg: "var(--color-error-700, oklch(40% 0.14 25))", border: "oklch(58% 0.20 25 / 0.4)" },
  }[kind] || { label: kind, bg: "var(--bg3)", fg: "var(--fg3)", border: "var(--border-1)" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      background: config.bg, color: config.fg,
      border: `1px solid ${config.border}`,
      fontSize: 10, fontWeight: 600,
      letterSpacing: "0.04em",
    }}>{config.label}</span>
  );
}

// ─── Step 2: Pick strategy ────────────────────────────────
function RMStepStrategy({ strategy, setStrategy, setPreset, changes }) {
  const isCustom = strategy.strategy === "custom";
  const [helpOpen, setHelpOpen] = useStateRM(false);
  // Uninstall mode: network requirement is irrelevant (command, not download).
  // Hide the network field, preset chip, and summary segment.
  const isUninstall = changes.length > 0 && changes.every(c => c.kind === "uninstall");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row — heading + Strategy help entry point */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {isUninstall ? "Pick the uninstall strategy" : "Pick the strategy applied to this batch"}
          </div>
          <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {isUninstall
              ? "Controls when the uninstall command lands on each terminal. Network requirement is omitted \u2014 uninstall is a command, not a download."
              : "The same strategy applies to every (merchant, app, version) change above."}
          </div>
        </div>
        <button onClick={() => setHelpOpen(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 8px",
          fontSize: 11.5, fontWeight: 500,
          color: "var(--color-primary-700)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          flexShrink: 0,
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-primary-50)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <window.Ico name="info" size={12} />
          What do these mean?
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {window.UPGRADE_STRATEGY_PRESETS.map(p => {
          const on = strategy.strategy === p.id;
          return (
            <button key={p.id} onClick={() => setPreset(p.id)} style={{
              padding: 14, textAlign: "left",
              background: on ? "var(--color-primary-50)" : "var(--bg2)",
              border: "1px solid",
              borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "1.5px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--border-2)",
                  display: "grid", placeItems: "center",
                  flexShrink: 0,
                }}>
                  {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-600)" }} />}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.label}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--fg3)", lineHeight: 1.5 }}>
                {isUninstall ? (
                  p.id === "casual" ? "No rush — uninstall on next reboot."
                  : p.id === "immediate" ? "Urgent — uninstall right away."
                  : p.id === "custom" ? "Tune timing independently."
                  : p.body
                ) : p.body}
              </div>
              {p.id !== "custom" && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <RMChip>{window.timingLabel(p.timing)}</RMChip>
                  {!isUninstall && <RMChip>{window.networkLabel(p.network)}</RMChip>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div style={{
          padding: 14, borderRadius: 10,
          border: "1px solid var(--color-border-default)",
          background: "var(--bg2)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10,
            color: "var(--color-text-secondary)" }}>Custom parameters</div>

          {!isUninstall && (
          <FieldRow label="Network requirement">
            <RMRadioGroup value={strategy.network}
              onChange={(v) => setStrategy(s => ({ ...s, network: v }))}
              options={window.UPGRADE_NETWORK_OPTIONS} />
            {strategy.network === "cellCap" && (
              <div style={{
                marginTop: 10, padding: "10px 12px",
                border: "1px solid var(--border-2)",
                borderRadius: 6, background: "var(--bg1)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 12, color: "var(--fg2)" }}>Monthly cellular cap</span>
                <input type="number" min={10} step={10}
                  value={strategy.cellCapMb}
                  onChange={(e) => setStrategy(s => ({ ...s, cellCapMb: Number(e.target.value) }))}
                  style={{
                    width: 100, padding: "6px 10px",
                    border: "1px solid var(--border-2)", borderRadius: 4,
                    background: "var(--bg1)", color: "var(--fg1)",
                    fontFamily: "var(--font-mono)", fontSize: 13,
                  }} />
                <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>MB</span>
              </div>
            )}
          </FieldRow>
          )}

          <FieldRow label="Upgrade timing">
            <RMRadioGroup value={strategy.timing}
              onChange={(v) => setStrategy(s => ({
                ...s, timing: v,
                // Seed default slot the first time the operator picks Scheduled.
                slots: v === "scheduled" && (!s.slots || s.slots.length === 0)
                  ? [{ start: "02:00", end: "04:00" }]
                  : s.slots,
              }))}
              options={window.UPGRADE_TIMING_OPTIONS} />
            {strategy.timing === "scheduled" && (
              <SlotsEditor
                slots={strategy.slots || []}
                onChange={(slots) => setStrategy(s => ({ ...s, slots }))} />
            )}
          </FieldRow>
        </div>
      )}

      {/* Summary preview */}
      <div style={{
        padding: "10px 12px",
        background: "var(--success-bg, oklch(96% 0.05 152))",
        border: "1px solid oklch(58% 0.14 152 / 0.30)",
        borderRadius: 6, fontSize: 12, lineHeight: 1.6,
        color: "var(--color-success-700, oklch(35% 0.10 152))",
      }}>
        Strategy preview: <strong>{window.strategyLabel(strategy.strategy)}</strong>
        {!isUninstall && <>
          {" · "}
          Network <strong>
            {strategy.network === "cellCap"
              ? `Cellular < ${strategy.cellCapMb} MB / mo`
              : window.networkLabel(strategy.network)}
          </strong>
        </>}
        {" · "}
        Timing <strong>
          {strategy.timing === "scheduled"
            ? ((strategy.slots || []).length
                ? `Scheduled · ${(strategy.slots || []).map(sl => `${sl.start}–${sl.end}`).join(", ")}`
                : "Scheduled (no windows yet)")
            : window.timingLabel(strategy.timing)}
        </strong>
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.85 }}>
          Applies to {changes.length} {isUninstall ? "uninstall" : "change"}{changes.length === 1 ? "" : "s"}.
        </div>
      </div>

      {/* Strategy help reference — single entry point for full param descriptions */}
      <StrategyHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ─── StrategyHelpModal · single-entry-point reference for params ──
// One place where every timing / network option's full PRD description is
// surfaced — operators read here when they're uncertain which option to pick.
// Triggered from "What do these mean?" link in RMStepStrategy, but can also
// be opened from any other surface via window.StrategyHelpModal.
function StrategyHelpModal({ open, onClose }) {
  if (!open) return null;
  const presets  = window.UPGRADE_STRATEGY_PRESETS || [];
  const timings  = window.UPGRADE_TIMING_OPTIONS || [];
  const networks = window.UPGRADE_NETWORK_OPTIONS || [];

  return (
    <window.Modal open onClose={onClose} width={720} padding={0}
      title="Upgrade strategy reference"
      subtitle="What each option means and when to use it."
      footer={
        <window.Button primary onClick={onClose}>Got it</window.Button>
      }>
      <div style={{ padding: "16px 20px 4px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Strategy presets */}
        <HelpSection
          title="Strategy presets"
          subtitle="Short-hand combinations. Pick Custom when you need to tune timing and network independently.">
          {presets.map(p => (
            <HelpItem key={p.id}
              label={p.label}
              body={p.body}
              chips={p.id === "custom" ? null : [
                window.timingLabel(p.timing),
                window.networkLabel(p.network),
              ]} />
          ))}
        </HelpSection>

        {/* Upgrade timing */}
        <HelpSection
          title="Upgrade timing"
          subtitle="When the terminal performs the upgrade after receiving the rollout notification.">
          {timings.map(t => (
            <HelpItem key={t.id} label={t.label} body={t.detail || t.body} />
          ))}
        </HelpSection>

        {/* Network requirement */}
        <HelpSection
          title="Network requirement"
          subtitle="Which network the terminal may use to download the new version.">
          {networks.map(n => (
            <HelpItem key={n.id} label={n.label} body={n.detail || n.body}
              note={n.needsCap ? "Custom strategies can set the monthly cap (MB)." : null} />
          ))}
        </HelpSection>

      </div>
    </window.Modal>
  );
}

function HelpSection({ title, subtitle, children }) {
  return (
    <section>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)",
                       textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </section>
  );
}

function HelpItem({ label, body, chips, note }) {
  return (
    <div style={{
      padding: "10px 12px",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 6,
      background: "var(--bg-surface, #fff)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</div>
        {chips && (
          <div style={{ display: "inline-flex", gap: 4 }}>
            {chips.map((c, i) => (
              <RMChip key={i}>{c}</RMChip>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
        {body}
      </div>
      {note && (
        <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function RMChip({ children }) {
  return (
    <span style={{
      fontSize: 10.5, padding: "2px 7px", borderRadius: 999,
      background: "var(--bg3)", color: "var(--fg2)",
      border: "1px solid var(--border-1)",
    }}>{children}</span>
  );
}

// ─── SlotsEditor · multi-window time picker ────────────────
// Surfaces when the operator picks Upgrade timing = "Scheduled windows".
// Each slot is { start: "HH:MM", end: "HH:MM" }. Constraints:
//   • end strictly after start (no zero-length, no cross-midnight)
//   • no two slots may overlap
// Renders an inline validation row that explains what's wrong; the
// parent disables Apply when validateSlots(slots) returns a string.
function toMin(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function validateSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return "Add at least one time window.";
  }
  const ranges = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const a = toMin(s.start), b = toMin(s.end);
    if (a == null || b == null) return `Window ${i + 1}: invalid time.`;
    if (b <= a) return `Window ${i + 1}: end must be after start (windows can't cross midnight).`;
    ranges.push([a, b, i]);
  }
  // Overlap check via sort
  const sorted = [...ranges].sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    if (cur[0] < prev[1]) {
      return `Windows ${prev[2] + 1} and ${cur[2] + 1} overlap.`;
    }
  }
  return null;
}

function SlotsEditor({ slots, onChange }) {
  const list = Array.isArray(slots) && slots.length
    ? slots
    : [{ start: "02:00", end: "04:00" }];
  const err = validateSlots(list);

  const update = (i, patch) => {
    const next = list.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange(next);
  };
  const add = () => {
    // Suggest the next free 2-hour block after the latest window, wrapping at 22:00.
    const ends = list.map(s => toMin(s.end) || 0);
    const latest = ends.length ? Math.max(...ends) : 0;
    let startMin = Math.min(Math.max(latest + 30, 0), 22 * 60); // pad 30 min, cap so end fits
    let endMin   = Math.min(startMin + 120, 23 * 60 + 59);
    if (endMin <= startMin) { startMin = 22 * 60; endMin = 23 * 60; }
    const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    onChange([...list, { start: fmt(startMin), end: fmt(endMin) }]);
  };
  const remove = (i) => {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [{ start: "02:00", end: "04:00" }]);
  };

  return (
    <div style={{
      marginTop: 10, padding: "12px 14px",
      border: "1px solid var(--border-2)",
      borderRadius: 6, background: "var(--bg1)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Reserved install windows
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2, lineHeight: 1.5 }}>
            Install only inside these windows. Multiple windows per day are allowed; they must not overlap and can't cross midnight.
          </div>
        </div>
        <span className="mono num" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {list.length} window{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((s, i) => (
          <SlotRow key={i} index={i}
            value={s}
            onChange={(patch) => update(i, patch)}
            onRemove={list.length > 1 ? () => remove(i) : null} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
        <button onClick={add} disabled={list.length >= 6} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          fontSize: 11.5, fontWeight: 500,
          color: list.length >= 6 ? "var(--color-text-tertiary)" : "var(--color-primary-700)",
          background: list.length >= 6 ? "var(--bg2)" : "var(--color-primary-50)",
          border: "1px dashed",
          borderColor: list.length >= 6 ? "var(--border-1)" : "oklch(60% 0.14 262 / 0.40)",
          borderRadius: 4,
          cursor: list.length >= 6 ? "not-allowed" : "pointer",
        }}>
          + Add window{list.length >= 6 ? " (max 6)" : ""}
        </button>
        {err
          ? <div style={{
              fontSize: 11.5, color: "var(--color-error-700, oklch(40% 0.16 25))",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <window.Ico name="alert" size={11} stroke={2} />
              {err}
            </div>
          : <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
              <span className="mono">{list.map(sl => `${sl.start}–${sl.end}`).join(" · ")}</span>
            </div>}
      </div>
    </div>
  );
}

function SlotRow({ index, value, onChange, onRemove }) {
  const inputStyle = {
    width: 96, padding: "6px 8px",
    border: "1px solid var(--border-2)", borderRadius: 4,
    background: "var(--bg1)", color: "var(--fg1)",
    fontFamily: "var(--font-mono)", fontSize: 13,
  };
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "22px 1fr auto",
      alignItems: "center", gap: 10,
      padding: "6px 8px",
      background: "var(--bg2)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 4,
    }}>
      <span className="mono num" style={{
        fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center",
      }}>#{index + 1}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="time" value={value.start}
          onChange={(e) => onChange({ start: e.target.value })}
          style={inputStyle} />
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>→</span>
        <input type="time" value={value.end}
          onChange={(e) => onChange({ end: e.target.value })}
          style={inputStyle} />
      </div>
      {onRemove
        ? <button onClick={onRemove} title="Remove window" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 4,
            color: "var(--color-text-tertiary)",
            background: "transparent", cursor: "pointer",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--error-bg, oklch(96% 0.04 25))";
              e.currentTarget.style.color = "var(--color-error-700, oklch(40% 0.14 25))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-tertiary)";
            }}>
            <window.Ico name="trash" size={13} />
          </button>
        : <span style={{ width: 26 }} />}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 500,
        color: "var(--color-text-secondary)",
        textTransform: "uppercase", letterSpacing: "0.04em",
        marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

function RMRadioGroup({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(opt => {
        const on = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px",
            background: on ? "var(--color-primary-50)" : "#fff",
            border: "1px solid",
            borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
            borderRadius: 6,
            textAlign: "left", cursor: "pointer",
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "1.5px solid",
              borderColor: on ? "var(--color-primary-600)" : "var(--border-2)",
              display: "grid", placeItems: "center", marginTop: 2,
              flexShrink: 0,
            }}>
              {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-600)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{opt.label}</div>
              {opt.body && (
                <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 2, lineHeight: 1.5 }}>{opt.body}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Compact text-form rendering of a strategy record ──────
// Used in expanded rows + cells where we need to show what timing/network
// a (merchant, app, version) tuple inherits. Display-only.
function StrategyTextLine({ record, layout }) {
  const STRAT_LABEL_EN  = { casual: "Casual", immediate: "Immediate", custom: "Custom" };
  const TIMING_LABEL_EN = { immediate: "Immediate", reboot: "On next reboot", rebootOrIdle10: "On reboot or after 10 min idle", idle10: "After 10 min idle", scheduled: "Scheduled windows" };
  const NETWORK_LABEL_EN = { any: "Any network", wired: "WiFi / Ethernet only", cellCap: "WiFi/Ethernet or cellular under cap" };

  if (!record) {
    return (
      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
        No strategy set
      </span>
    );
  }
  const presetId = window.resolveStrategyPreset(record);
  const presetLabel = STRAT_LABEL_EN[presetId] || presetId;
  let t = TIMING_LABEL_EN[record.timing] || record.timing;
  if (record.timing === "scheduled") {
    const slots = Array.isArray(record.slots) ? record.slots : [];
    t = slots.length
      ? `Scheduled · ${slots.map(sl => `${sl.start}–${sl.end}`).join(", ")}`
      : "Scheduled (no windows)";
  }
  let n = NETWORK_LABEL_EN[record.network] || record.network;
  if (record.network === "cellCap") n = `Cellular < ${record.cellCapMb} MB / mo`;

  if (layout === "inline") {
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{presetLabel}</span>
        <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{t}</span>
        <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{n}</span>
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{presetLabel}</div>
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--color-text-secondary)" }}>
        <span><span style={{ color: "var(--color-text-tertiary)" }}>Timing</span>　{t}</span>
        <span><span style={{ color: "var(--color-text-tertiary)" }}>Network</span>　{n}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  RolloutModal,
  StrategyTextLine,
  StrategyHelpModal,
  SlotsEditor,
  validateSlots,
});
