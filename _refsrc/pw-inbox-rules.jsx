/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — V4 "Rules-first Dashboard" (based on V3)
//
// Same tile rhythm as V3, but the body is grouped by RULE rather
// than flattened to single alerts. Each rule row expands inline to
// reveal its firing devices (no nav), and a single click on a
// "View terminals" button opens a side drawer carrying the full
// Rule Detail (bound terminals + recent firings + config).
//
// Depth from inbox → bound terminals list = ONE jump.
// ─────────────────────────────────────────────────────────────

const { useState: useStateRF, useMemo: useMemoRF, useEffect: useEffectRF } = React;

// ─── HoverTip ────────────────────────────────────────────────
// Lightweight tooltip that appears on hover with no delay (native
// `title` works but waits ~1s before showing — too slow for a quick
// glance at the firing math). Renders an absolutely-positioned bubble
// above the trigger; gracefully falls back to wrap if container is
// narrow. Use sparingly — only where the number alone is ambiguous.
function HoverTip({ tip, children, style }) {
  const [hover, setHover] = useStateRF(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center",
               ...style }}>
      {children}
      {hover && tip && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "var(--fg1)", color: "var(--bg1)",
          fontSize: 11, fontWeight: 400, lineHeight: 1.35,
          padding: "6px 9px", borderRadius: 6,
          whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          zIndex: 60, letterSpacing: 0, textTransform: "none",
        }}>
          {tip}
          <span style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "4px solid var(--fg1)",
          }} />
        </span>
      )}
    </span>
  );
}

// ─── Tile (re-implemented locally to keep this file self-contained) ──
function V4Tile({ type, group, active, onClick }) {
  const t = PW.TYPES[type];
  // Terminal-deduped count (same unit as the rule-row X / Y badge): a
  // terminal alarming three times still counts once.
  const firingTerminals = new Set(
    group.alerts
      .filter(a => !a.selfHealed && !a.ticketId)
      .map(a => a.deviceSn)
  ).size;
  return (
    <button onClick={onClick} style={{
      background: "var(--bg2)", border: "1px solid",
      borderColor: active ? `color-mix(in oklab, ${t.accent} 45%, transparent)` : "var(--border-1)",
      boxShadow: active
        ? `0 0 0 3px color-mix(in oklab, ${t.accent} 14%, transparent), var(--shadow-1)`
        : "var(--shadow-1)",
      borderRadius: 10, padding: "11px 12px 10px",
      textAlign: "left", cursor: "pointer",
      position: "relative", overflow: "hidden",
      transition: "all .12s ease",
    }}>
      <span style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: t.accent, opacity: active ? 1 : 0.55,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <PW.Ico name={t.icon} size={14} stroke={1.7} style={{ color: t.accent }} />
        <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--fg1)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.label}
        </span>
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="mono" style={{
          fontSize: 22, fontWeight: 500, lineHeight: 1,
          // Terminal-deduped — same unit as the X / Y badge on each rule
          // row below. A terminal firing three times still counts once.
          color: firingTerminals > 0 ? "var(--color-warning-700)" : "var(--fg2)",
        }}>{firingTerminals}</span>
        <span style={{ fontSize: 10, color: "var(--fg3)",
                        letterSpacing: "0.04em", textTransform: "uppercase" }}>
          firing terminal{firingTerminals === 1 ? "" : "s"}
        </span>
      </div>

    </button>
  );
}

// ─── Compact firing-terminal row (used inside expanded rule sections) ─
// Same column shape as the rule-detail "Bound terminals" tab so the
// inbox drill-down and the detail-page tab read as the same surface:
//   Device · SN | Model | Store · merchant | Last seen | State
function V4TerminalRow({ device, accent, onOpenDeviceHistory,
                          onOpenDeviceProfile, ruleId }) {
  const isFiring = !!device.firingAlert;
  return (
    <div onClick={() => onOpenDeviceHistory && onOpenDeviceHistory(device.sn, ruleId)}
      style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1.4fr) 90px minmax(0, 1.4fr) 100px 110px",
        gap: 12, padding: "8px 14px 8px 36px", alignItems: "center",
        borderTop: "1px solid var(--border-1)",
        background: isFiring
          ? "color-mix(in oklab, var(--color-warning-500) 5%, var(--bg2))"
          : "var(--bg2)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 4%, var(--bg2))"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isFiring
          ? "color-mix(in oklab, var(--color-warning-500) 5%, var(--bg2))"
          : "var(--bg2)"; }}>
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
        <PW.SNText sn={device.sn} onJump={onOpenDeviceProfile}
          weight={isFiring ? 500 : 400} />
      </span>
      <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{device.model}</span>
      <span style={{ minWidth: 0, fontSize: 11.5, color: "var(--fg2)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {device.storeName} · <span style={{ color: "var(--fg3)" }}>{device.merchantName}</span>
      </span>
      <span className="mono"
        title={device.lastFiredRel || ""}
        style={{ fontSize: 11, color: "var(--fg3)", textAlign: "right" }}>
        {device.lastFiredAbs || "—"}
      </span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {isFiring ? (
          <span title={`Live value: ${device.firingAlert.currentText}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 8px", borderRadius: 999,
              background: `color-mix(in oklab, ${accent} 12%, transparent)`,
              color: accent, fontSize: 10.5, fontWeight: 500,
              border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)`,
              whiteSpace: "nowrap",
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
}

// ─── Rule section: collapsible header + (optionally) firing devices ──
function V4RuleSection({ rule, alerts, expanded, onToggle, onOpenAlert,
                         onOpenRuleDrawer, onConvert,
                         onOpenDeviceHistory,
                         onOpenDeviceProfile }) {
  const t = PW.TYPES[rule.type];
  // "active" = currently firing (not converted, not self-healed). Includes
  // both unread and read-but-still-firing — see Q2 redesign note.
  const activeAlerts = alerts.filter(a => !a.selfHealed && !a.ticketId);
  // X / Y in the header is TERMINAL-on-TERMINAL: dedupe by deviceSn so a
  // terminal that fires three times still counts as one firing terminal.
  // (Alerts carry deviceSn, not deviceId — earlier we keyed off the wrong
  // field and every rule reported "1 firing" no matter how many.)
  const firingTerminals = new Set(activeAlerts.map(a => a.deviceSn)).size;
  const disabled = rule.enabled === false;

  // Expanded body shows the firing TERMINAL list (dedup by SN) using the
  // same column shape as the rule-detail "Bound terminals" tab. Built lazily
  // so collapsed rows stay cheap.
  const firingDevices = useMemoRF(() => {
    if (!expanded) return [];
    const bySn = new Map();
    activeAlerts.forEach(a => {
      if (bySn.has(a.deviceSn)) return;
      const store = PW.findStore(a.storeId);
      const merchant = PW.findMerchant(a.merchantId);
      bySn.set(a.deviceSn, {
        sn: a.deviceSn,
        model: a.model,
        merchantId: a.merchantId,
        merchantName: merchant?.name || "",
        storeId: a.storeId,
        storeName: store?.name || "",
        storeCity: store?.city || "",
        // Absolute timestamp ("May 17, 2026 14:32") so the table reads
        // as a true log — earlier we used the relative string ("8 min
        // ago") which was friendly but ambiguous across days. Tooltip
        // on hover still gives the relative reading for quick glance.
        lastFiredAbs: a.firedAtAbs,
        lastFiredRel: a.firedAt,
        firingAlert: a,
      });
    });
    return Array.from(bySn.values());
  }, [expanded, activeAlerts.length, rule.id]);

  // Inner pagination — firing terminals under this rule.
  const PAGE_SIZE = 5;
  const [page, setPage] = useStateRF(1);
  const totalPages = Math.max(1, Math.ceil(firingDevices.length / PAGE_SIZE));
  React.useEffect(() => { setPage(1); }, [firingDevices.length]);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageDevices = firingDevices.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <section style={{
      background: disabled ? "var(--bg3)" : "var(--bg2)",
      borderRadius: 10,
      border: "1px solid var(--border-1)",
      boxShadow: "var(--shadow-1)",
      overflow: "visible",
      opacity: disabled ? 0.74 : 1,
      // Accent ribbon: active alerts → primary accent; disabled rules
      // get a muted gray ribbon to read as "off" rather than "alarming".
      borderLeft: disabled
        ? "3px solid var(--border-2)"
        : (firingTerminals > 0
            ? `3px solid ${t.accent}`
            : "1px solid var(--border-1)"),
    }}>
      {/* Header (clickable to toggle) */}
      <div style={{
        display: "grid",
        // 5 cells: chevron / type-icon / rule-name(1fr) / firing-stack / details.
        // The trailing two columns use `auto` so they hug the right edge
        // of the row — earlier we had a phantom 132 px trailing column
        // that pulled them visually inward.
        gridTemplateColumns: "16px 32px minmax(0, 1fr) auto auto",
        gap: 14, alignItems: "center",
        padding: "11px 14px",
        cursor: "pointer",
        background: expanded ? (disabled ? "var(--bg3)" : "var(--bg2)") : "transparent",
      }}
        onClick={() => onToggle(rule.id)}>
        <PW.Ico name={expanded ? "chevd" : "chevr"} size={12}
          style={{ color: "var(--fg3)" }} />
        <span style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: t.soft, color: t.accent,
          border: `1px solid color-mix(in oklab, ${t.accent} 24%, transparent)`,
          display: "grid", placeItems: "center",
        }}>
          <PW.Ico name={t.icon} size={14} stroke={1.7} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: disabled ? "var(--fg2)" : "var(--fg1)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {rule.name}
            </span>
            {disabled && (
              <span style={{
                fontSize: 9.5, fontWeight: 600, letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "1px 6px", borderRadius: 4,
                background: "var(--bg2)", color: "var(--fg3)",
                border: "1px solid var(--border-2)",
                flexShrink: 0,
              }}>Disabled</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
            <span style={{
              color: firingTerminals > 0 ? t.accent : "var(--fg2)",
              fontWeight: firingTerminals > 0 ? 600 : 500,
            }}>{firingTerminals}</span>
            <span style={{ color: "var(--fg3)", fontWeight: 400 }}>{` / ${rule.matchedDevices}`}</span>
          </span>
          <span style={{ fontSize: 10, color: "var(--fg3)",
                          letterSpacing: "0.04em", textTransform: "uppercase",
                          whiteSpace: "nowrap" }}>firing&nbsp;· bound</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenRuleDrawer(rule.id); }}
            title="Open the rule detail page (view, edit, and bound terminals)"
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: "var(--bg2)", border: "1px solid var(--border-2)", color: "var(--fg2)",
              display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "color-mix(in oklab, var(--color-primary-500) 6%, transparent)";
              e.currentTarget.style.color = "var(--color-primary-700)";
              e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-primary-500) 30%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg2)";
              e.currentTarget.style.color = "var(--fg2)";
              e.currentTarget.style.borderColor = "var(--border-2)";
            }}>
            <PW.Ico name="external" size={10} stroke={1.7} />
            Details
          </button>
        </div>
      </div>

      {/* Expanded body: firing TERMINAL list (matches Rule detail · Bound terminals). */}
      {expanded && (
        <>
          {/* Column header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "24px minmax(0, 1.4fr) 90px minmax(0, 1.4fr) 100px 110px",
            gap: 12, padding: "7px 14px 7px 36px",
            background: "var(--bg3)",
            borderTop: "1px solid var(--border-1)",
            fontSize: 10, fontWeight: 500, color: "var(--fg3)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <span />
            <span>Device · SN</span>
            <span>Model</span>
            <span>Store · merchant</span>
            <span style={{ textAlign: "right" }}>Last fired</span>
            <span style={{ textAlign: "right" }}>State</span>
          </div>
          {firingDevices.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center",
                          fontSize: 11.5, color: "var(--fg3)",
                          borderTop: "1px solid var(--border-1)" }}>
              {disabled
                ? "Rule is disabled — no terminals are firing."
                : "No terminals are currently firing on this rule."}
            </div>
          ) : (
            <>
              {pageDevices.map(d => (
                <V4TerminalRow key={d.sn} device={d} accent={t.accent}
                  ruleId={rule.id}
                  onOpenDeviceHistory={onOpenDeviceHistory}
                  onOpenDeviceProfile={onOpenDeviceProfile} />
              ))}
              {firingDevices.length > PAGE_SIZE && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 14px",
                  borderTop: "1px solid var(--border-1)",
                  background: "var(--bg2)",
                  fontSize: 10.5, color: "var(--fg3)",
                }}>
                  <span>
                    <b className="mono" style={{ color: "var(--fg2)" }}>
                      {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, firingDevices.length)}
                    </b> of <b className="mono" style={{ color: "var(--fg2)" }}>{firingDevices.length}</b> firing
                  </span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "2px 7px", borderRadius: 4, fontSize: 10.5,
                      background: "var(--bg2)", border: "1px solid var(--border-2)",
                      color: page === 1 ? "var(--fg3)" : "var(--fg1)",
                      opacity: page === 1 ? 0.5 : 1,
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                    <PW.Ico name="chevl" size={9} stroke={2} />
                    Prev
                  </button>
                  <span className="mono" style={{ color: "var(--fg2)" }}>
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: "2px 7px", borderRadius: 4, fontSize: 10.5,
                      background: "var(--bg2)", border: "1px solid var(--border-2)",
                      color: page >= totalPages ? "var(--fg3)" : "var(--fg1)",
                      opacity: page >= totalPages ? 0.5 : 1,
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                    Next
                    <PW.Ico name="chevr" size={9} stroke={2} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

// ─── PW.InboxV4 — the new variant ────────────────────────────
PW.InboxV4 = function RulesFirstInbox({ onOpenAlert, onCreateRule, onOpenRules,
                                         onOpenRuleDrawer, onEditRule,
                                         onOpenDeviceHistory,
                                         onOpenDeviceProfile }) {
  PW.useRulesTick();
  const groups = PW.groupByType(PW.ALERTS);
  // Header pill is in the same unit as the expanded drawer: events that are
  // still firing (not self-healed, not promoted to a ticket). Two rules with
  // 4 and 5 firing alerts read as "9 firing" — matches what you'd see if you
  // expanded both rows and counted.
  const firingEventsTotal = PW.ALERTS
    .filter(a => !a.selfHealed && !a.ticketId).length;

  // Build [{rule, alerts}] for EVERY rule (including ones with no alerts
  // and disabled ones). The home and the old "Manage rules" screen are
  // merged — this is the only rules surface.
  const allRules = useMemoRF(() => {
    const byRule = new Map();
    PW.RULES.forEach(r => byRule.set(r.id, { rule: r, alerts: [] }));
    PW.ALERTS.forEach(a => {
      const g = byRule.get(a.ruleId);
      if (g) g.alerts.push(a);
    });
    return Array.from(byRule.values());
  }, [PW.RULES.length, PW.ALERTS.length]);

  const [typeFilter, setTypeFilter] = useStateRF("all");
  const [expanded, setExpanded] = useStateRF(() => new Set());

  const visibleRules = useMemoRF(() => {
    if (typeFilter === "all") return allRules;
    return allRules.filter(g => g.rule.type === typeFilter);
  }, [allRules, typeFilter]);

  const toggleExpand = (ruleId) => {
    const next = new Set(expanded);
    next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
    setExpanded(next);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "var(--bg3)" }}>
      {/* Header */}
      <div style={{
        padding: "16px 22px 14px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="h2" style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>
              Pre-warnings
            </h1>

          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--fg3)", lineHeight: 1.5 }}>
            Catch fleet issues before customers feel them. Define rules on telemetry &mdash;
            battery health, network drops, geofence breaches &mdash; and triage what's firing
            here before promoting to a ticket.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button className="tds-btn tds-btn--sm tds-btn--primary" onClick={onCreateRule}>
            <PW.Ico name="plus" size={12} stroke={2} />
            New rule
          </button>
        </div>
      </div>

      {/* Tiles — same as V3 */}
      <div style={{ padding: "16px 22px 10px", display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
        {groups.map(g => (
          <V4Tile key={g.type} type={g.type} group={g}
            active={typeFilter === g.type}
            onClick={() => setTypeFilter(typeFilter === g.type ? "all" : g.type)} />
        ))}
      </div>

      {/* Active type filter chip */}
      {typeFilter !== "all" && (
        <div style={{ padding: "4px 22px 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>Showing rules of:</span>
          <PW.TypeChip type={typeFilter} />
          <button onClick={() => setTypeFilter("all")} style={{
            fontSize: 10.5, color: "var(--fg3)", padding: "2px 8px",
            background: "transparent", border: 0, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <PW.Ico name="x" size={10} stroke={2} />Clear
          </button>
        </div>
      )}

      {/* Rules list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px 22px",
                    display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleRules.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", fontSize: 12,
                        color: "var(--fg3)", background: "var(--bg2)",
                        borderRadius: 10, border: "1px solid var(--border-1)" }}>
            No rules match the current filter.
          </div>
        ) : visibleRules.map(g => (
          <V4RuleSection key={g.rule.id} rule={g.rule} alerts={g.alerts}
            expanded={expanded.has(g.rule.id)}
            onToggle={toggleExpand}
            onOpenAlert={onOpenAlert}
            onOpenRuleDrawer={onOpenRuleDrawer}
            onConvert={(a) => window.showToast?.(`Converted ${a.id} to ticket`, "success")}
            onOpenDeviceHistory={onOpenDeviceHistory}
            onOpenDeviceProfile={onOpenDeviceProfile} />
        ))}
      </div>
    </div>
  );
};

// ─── RuleDrawer — wraps RuleDetail in a slide-in drawer ──────
PW.RuleDrawer = function RuleDrawer({ ruleId, onClose, onEdit, onOpenAlert,
                                       onOpenDeviceHistory, onOpenDeviceProfile }) {
  // Escape closes the drawer.
  useEffectRF(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100 }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.32)",
        animation: "v4DrawerFade .15s ease",
      }} />
      <aside style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: 760, maxWidth: "92%",
        background: "var(--bg2)", borderLeft: "1px solid var(--border-1)",
        display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 32px -16px rgba(0,0,0,.2)",
        animation: "v4DrawerSlide .18s cubic-bezier(.2,.7,.2,1)",
      }}>
        <PW.RuleDetail ruleId={ruleId}
          onBack={onClose}
          onEdit={onEdit}
          onOpenAlert={onOpenAlert}
          onOpenDeviceHistory={onOpenDeviceHistory}
          onOpenDeviceProfile={onOpenDeviceProfile} />
      </aside>
      <style>{`
        @keyframes v4DrawerFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes v4DrawerSlide { from { transform: translateX(28px); opacity: .6 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  );
};
