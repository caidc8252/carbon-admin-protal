/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — Device-history drawer
//
// Opened from "Bound terminals" tab in a rule's detail. Differs
// from AlertDetail (which is single-event focused) by showing:
//   · the device identity card + link to main-portal device page,
//   · the currently-firing alert (if any) with "Convert to ticket",
//   · the full history of (device × rule) firings, oldest at the
//     bottom — read / converted / self-healed.
// ─────────────────────────────────────────────────────────────

const { useState: useStateDH, useEffect: useEffectDH, useMemo: useMemoDH } = React;

PW.DeviceHistoryDrawer = function DeviceHistoryDrawer({
  deviceSn, ruleId, onClose, onOpenDeviceProfile,
}) {
  // Esc to close
  useEffectDH(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rule = PW.findRule(ruleId);
  const all = useMemoDH(() => PW.alertsForDevice(deviceSn, ruleId), [deviceSn, ruleId]);
  // Read-but-still-firing entries: treat as historical too if not in
  // current (defensive — current already covers them).

  if (!rule) {
    return null;
  }

  // Pull merchant / store from any seed alert (they all share the same
  // identity tuple for one device, so the first is fine).
  const seedAlert = all[0];
  const merchant = seedAlert ? PW.findMerchant(seedAlert.merchantId) : null;
  const store    = seedAlert ? PW.findStore(seedAlert.storeId) : null;
  const model    = seedAlert?.model || "—";
  const t = PW.TYPES[rule.type];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 120,
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.32)",
        animation: "dhDrawerFade .15s ease",
      }} />
      <aside style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: "92%",
        background: "var(--bg2)", borderLeft: "1px solid var(--border-1)",
        display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 32px -16px rgba(0,0,0,.22)",
        animation: "dhDrawerSlide .18s cubic-bezier(.2,.7,.2,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 22px 12px", borderBottom: "1px solid var(--border-1)",
          background: "var(--bg2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button onClick={onClose} title="Back" style={{
              padding: 4, color: "var(--fg3)", borderRadius: 5,
              background: "transparent", border: 0, cursor: "pointer",
            }}><PW.Ico name="chevl" size={14} /></button>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>
              {rule.name} · device history
            </span>
            <span style={{ flex: 1 }} />
            <button onClick={() => onOpenDeviceProfile?.(deviceSn)}
              className="tds-btn tds-btn--sm tds-btn--secondary">
              <PW.Ico name="external" size={11} />
              Open device profile
            </button>
          </div>
          {/* Device identity card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 14px",
            background: "var(--bg1)", border: "1px solid var(--border-2)",
            borderRadius: 9,
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: "var(--bg3)", color: "var(--fg2)",
              display: "grid", placeItems: "center",
              border: "1px solid var(--border-1)",
            }}>
              <PW.Ico name="device" size={20} stroke={1.6} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{
                fontSize: 14, fontWeight: 600, color: "var(--fg1)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{deviceSn}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: "var(--fg3)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span className="mono">{model}</span>
                <span style={{ opacity: 0.5 }}> · </span>
                <span>{store?.name || "—"}, {store?.city || ""}</span>
                <span style={{ opacity: 0.5 }}> · </span>
                <span>{merchant?.name || "—"}</span>
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 9px", borderRadius: 999,
              background: t.soft, color: t.accent,
              border: `1px solid color-mix(in oklab, ${t.accent} 28%, transparent)`,
              fontSize: 10.5, fontWeight: 500,
            }}>
              <PW.Ico name={t.icon} size={10} stroke={1.7} />
              {t.label}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px",
                      display: "flex", flexDirection: "column", gap: 16 }}>
          {/* All records on this rule, newest first */}
          <section>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8,
            }}>
              <span style={{
                fontSize: 10.5, color: "var(--fg3)", fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>Records on this rule</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>
                {all.length}
              </span>
            </div>
            {all.length === 0 ? (
              <div style={{
                padding: "20px 16px", textAlign: "center",
                fontSize: 11.5, color: "var(--fg3)",
                background: "var(--bg1)", border: "1px solid var(--border-2)",
                borderRadius: 8,
              }}>
                No records yet. The first firing will appear here.
              </div>
            ) : (
              <HistoryTimeline events={all} accent={t.accent} />
            )}
          </section>
        </div>
      </aside>
      <style>{`
        @keyframes dhDrawerFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dhDrawerSlide { from { transform: translateX(28px); opacity: .6 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  );
};

// ─── Currently-firing card (top of body) ────────────────────
function CurrentFiringCard({ alert, accent }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: `color-mix(in oklab, ${accent} 6%, var(--bg2))`,
      border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
      borderRadius: 9,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: accent,
        boxShadow: `0 0 0 4px color-mix(in oklab, ${accent} 22%, transparent)`,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{
            fontSize: 14, fontWeight: 600, color: accent,
          }}>{alert.currentText}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>
            {alert.firedAt}
          </span>
        </div>
        {alert.detail && (
          <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--fg2)" }}>
            {alert.detail}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History timeline ──────────────────────────────────────
function HistoryTimeline({ events, accent }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }}>
      <span style={{
        position: "absolute", top: 8, bottom: 8, left: 7, width: 1.5,
        background: "var(--border-2)",
      }} />
      {events.map(e => {
        const status = PW.statusOf(e);
        return (
          <li key={e.id} style={{ position: "relative", paddingLeft: 28, paddingBottom: 12 }}>
            <HistoryDot status={status} accent={accent} />
            <div style={{
              padding: "10px 12px",
              background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              borderRadius: 8, boxShadow: "var(--shadow-1)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="mono" style={{
                  fontSize: 12, fontWeight: 600, color: accent,
                }}>{e.currentText}</span>
                <PW.StatusPill status={status} ticketId={e.ticketId} />
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>
                  {e.firedAtAbs}
                </span>
              </div>
              {e.detail && (
                <div style={{ marginTop: 5, fontSize: 11, color: "var(--fg3)" }}>
                  {e.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HistoryDot({ status, accent }) {
  let bg, border, icon, color;
  if (status === "converted") {
    bg = "color-mix(in oklab, var(--color-info-500) 16%, transparent)";
    color = "var(--color-info-700)";
    icon = "ticket";
  } else if (status === "self-healed") {
    bg = "color-mix(in oklab, var(--color-success-500) 16%, transparent)";
    color = "var(--color-success-700)";
    icon = "check";
  } else {
    bg = "var(--bg3)";
    color = "var(--fg3)";
    icon = null;
  }
  border = `2px solid color-mix(in oklab, ${color} 50%, transparent)`;
  return (
    <span style={{
      position: "absolute", left: 0, top: 8,
      width: 16, height: 16, borderRadius: "50%",
      background: bg, color, border,
      display: "grid", placeItems: "center",
    }}>
      {icon && <PW.Ico name={icon} size={9} stroke={2.4} />}
    </span>
  );
}
