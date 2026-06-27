/* global React */
// ─────────────────────────────────────────────────────────────
// Pull-update Wizard (full-screen, multi-step)
// Launched when an ISO pulls a new snapshot of a subscribed app. Walks the
// operator through: Review → Audience → Rollout → Upgrade options → Confirm.
// ─────────────────────────────────────────────────────────────

const { useState: usePwState, useMemo: usePwMemo } = React;
const { Ico, Badge, Button, Card, Input, KV, Empty, Pill } = window;

// ─── Wizard steps ─────────────────────────────────────────
// The Pull/Rollout wizard now has three steps. Approval (Review release)
// is a separate screen (ApprovalScreen) reached via the `approval` route;
// once an operator approves, they're prompted whether to roll out now —
// "yes" lands them here on step 1.
const STEPS = [
  { id: "scope",   label: "Audience",          hint: "Which merchants receive the update" },
  { id: "rollout", label: "Cadence",           hint: "Gradual or immediate"               },
  { id: "options", label: "Upgrade strategy",  hint: "How the install behaves"            },
];

// Default state for the wizard, applied each time it opens.
// `audience.mode` = "all" | "whitelist"  (blacklist mode removed per spec)
// `rollout.staged` = true (default, 7-day curve) or false (immediate)
// `strategy.preset` = "casual" | "immediate" | "custom"
//   When "custom", `strategy.timing` / `strategy.network` / `strategy.cellCapMb`
//   carry the operator's picks; otherwise the preset's defaults are used.
function makeInitialState() {
  return {
    audience: { mode: "all", whitelist: new Set() },
    rollout:  { staged: true, curve: window.ROLLOUT_DEFAULT_CURVE.map(p => ({ ...p })) },
    strategy: {
      preset:   "casual",      // casual | immediate | custom
      timing:   "reboot",      // immediate | reboot | rebootOrIdle10 | scheduled
      network:  "any",         // any | wired | cellCap
      cellCapMb: 100,
      slots:    [{ start: "02:00", end: "04:00" }],  // used when timing === "scheduled"
    },
    finalAck: true,            // checkbox removed from new UX; defaults true
  };
}

// ─── Stepper bar ───────────────────────────────────────────
function StepperBar({ steps, step, onJump }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
      padding: "10px 24px",
      borderBottom: "1px solid var(--border-1)",
      background: "var(--bg2)",
      overflowX: "auto",
    }}>
      {steps.map((s, i) => {
        const isActive   = i === step;
        const isComplete = i < step;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div style={{
                flex: "0 0 auto", width: 28, height: 1,
                background: isComplete ? "var(--accent)" : "var(--border-2)",
                margin: "0 6px",
              }} />
            )}
            <button onClick={() => onJump && onJump(i)} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: "var(--radius-md)",
              background: isActive ? "var(--bg-active)" : "transparent",
              cursor: onJump ? "pointer" : "default", textAlign: "left",
              whiteSpace: "nowrap",
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: isActive ? "var(--accent)" : isComplete ? "var(--success)" : "var(--bg3)",
                color: isActive || isComplete ? "#fff" : "var(--fg3)",
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 600,
                border: "1px solid",
                borderColor: isActive ? "var(--accent)" : isComplete ? "var(--success)" : "var(--border-2)",
                flexShrink: 0,
              }}>{isComplete ? <Ico name="check" size={11} stroke={3} /> : i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500,
                              color: isActive ? "var(--fg1)" : isComplete ? "var(--fg2)" : "var(--fg3)" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)" }}>{s.hint}</div>
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Section heading helper ────────────────────────────────
function H({ title, sub, action }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 className="h4" style={{ margin: 0, fontSize: 15 }}>{title}</h2>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg3)", lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {action}
    </header>
  );
}

// ─── Step 1: Review release ───────────────────────────────
function PullStepReview({ app, current, next, ack, setAck }) {
  const permDelta = (next.perms || 0) - (current.perms || 0);
  const scan = next.scan;
  const cls = window.classifyPullScan
    ? window.classifyPullScan(next)
    : (() => {
        if (!scan) return { tier: "incomplete" };
        const findings = window.SCAN_FINDINGS_TEMPLATES[scan] || [];
        const counts = window.summariseFindings(findings);
        if ((counts.critical || 0) + (counts.high || 0) > 0) return { tier: "high-risk", counts, findings };
        if ((counts.medium || 0) > 0) return { tier: "moderate", counts, findings };
        return { tier: "clean", counts, findings };
      })();

  const requiresAck = cls.tier === "high-risk" || cls.tier === "incomplete" || cls.tier === "rejected";

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Vulnerability spotlight up top — operator must see this first */}
      <ScanSpotlight version={next} cls={cls} />

      {/* Version transition */}
      <Card title="Version change" hint={<span className="mono" style={{ fontSize: 11 }}>{app.package}</span>}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 32px 1fr",
          alignItems: "center", gap: 8,
        }}>
          <VersionCard label="Your current snapshot" version={current} variant="muted" />
          <div style={{ display: "grid", placeItems: "center" }}>
            <Ico name="arrowR" size={18} style={{ color: "var(--accent)" }} />
          </div>
          <VersionCard label="New version" version={next} variant="primary" />
        </div>
      </Card>

      {/* Release notes */}
      <Card title="Release notes">
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg2)" }}>
          {next.notes || "No release notes provided."}
        </p>
      </Card>

      {/* Permission diff + APK details */}
      <Card title="What's changing">
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "var(--space-3) var(--space-5)",
        }}>
          <KvBox label="APK size"        value={<span className="mono">{next.size}</span>}
                 sub={`was ${current.size}`} />
          <KvBox label="Min Android"
                 value={<>{androidLabel(next.minSdk)} <span className="mono" style={{ color: "var(--fg3)" }}>· API {next.minSdk}</span></>} />
          <KvBox label="Target Android"
                 value={<>{androidLabel(next.targetSdk)} <span className="mono" style={{ color: "var(--fg3)" }}>· API {next.targetSdk}</span></>} />
          <KvBox label="Permissions"
                 value={<span className="mono num">{next.perms || 0}</span>}
                 sub={permDelta === 0 ? "no change"
                      : permDelta > 0 ? <span style={{ color: "var(--color-warning-700)" }}>+{permDelta} new — review</span>
                                       : <span style={{ color: "var(--color-success-700)" }}>{permDelta} removed</span>} />
          <KvBox label="Signing cert"
                 value={<span className="mono" style={{ fontSize: 11 }}>{next.signer ? next.signer.split(" · ")[0] : "Acme Software Inc."}</span>}
                 sub={next.signer ? next.signer.split(" · ")[1] : "SHA-256 d4:e2:8a:…"} />
          <KvBox label="Reach"
                 value={<><span className="mono num">{next.reach || 0}</span> ISOs</>}
                 sub="have approved this version" />
        </div>
      </Card>

      {/* Full findings list — the operator should see every flagged issue */}
      <FindingsListCard version={next} cls={cls} />

      {/* Risk acknowledgement */}
      {requiresAck && (
        <div style={{
          padding: "14px 16px",
          background: cls.tier === "high-risk" || cls.tier === "rejected" ? "var(--error-bg)" : "var(--warning-bg)",
          border: `1px solid ${cls.tier === "high-risk" || cls.tier === "rejected" ? "oklch(58% 0.20 25 / 0.3)" : "oklch(70% 0.16 70 / 0.3)"}`,
          borderRadius: "var(--radius-lg)",
        }}>
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            cursor: "pointer", lineHeight: 1.5,
          }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}
              style={{ marginTop: 2, accentColor: cls.tier === "high-risk" || cls.tier === "rejected" ? "var(--error)" : "var(--warning)" }} />
            <span style={{ fontSize: 12.5, color: cls.tier === "high-risk" || cls.tier === "rejected" ? "var(--color-error-700)" : "var(--color-warning-700)" }}>
              <b>I understand the risks.</b>{" "}
              {cls.tier === "rejected"
                ? "The publisher has rejected this version. Approving it bypasses their safety gate and may break terminals."
                : cls.tier === "incomplete"
                  ? "This snapshot has no completed vulnerability scan. I accept the operational risk of deploying without scan results."
                  : "This snapshot has unresolved critical or high-severity findings. I have reviewed them with my security team and accept the residual risk."}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function VersionCard({ label, version, variant }) {
  const isPrimary = variant === "primary";
  return (
    <div style={{
      padding: 12,
      borderRadius: "var(--radius-md)",
      background: isPrimary ? "var(--color-primary-50)" : "var(--bg2)",
      border: `1px solid ${isPrimary ? "var(--color-primary-500)" : "var(--border-2)"}`,
    }}>
      <div className="overline" style={{ fontSize: 10, marginBottom: 4,
        color: isPrimary ? "var(--color-primary-700)" : "var(--fg3)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="mono" style={{ fontSize: 17, fontWeight: 600,
          color: isPrimary ? "var(--color-primary-700)" : "var(--fg1)" }}>{version.name}</span>
        <span className="mono" style={{ fontSize: 11, opacity: 0.65,
          color: isPrimary ? "var(--color-primary-700)" : "var(--fg3)" }}>code {version.code}</span>
      </div>
      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85,
        color: isPrimary ? "var(--color-primary-700)" : "var(--fg3)" }}>
        {version.publishedAt ? `Published ${version.publishedAt}` : version.uploadedAt}
      </div>
    </div>
  );
}

function ScanSpotlight({ version, cls }) {
  if (cls.tier === "clean" || cls.tier === "moderate") {
    return (
      <div style={{
        padding: "10px 14px",
        borderRadius: "var(--radius-lg)",
        background: cls.tier === "clean" ? "var(--success-bg)" : "var(--info-bg)",
        border: `1px solid ${cls.tier === "clean" ? "oklch(58% 0.14 152 / 0.25)" : "oklch(60% 0.14 230 / 0.25)"}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Ico name="shieldCheck" size={18}
          style={{ color: cls.tier === "clean" ? "var(--success)" : "var(--info)" }} />
        <div style={{ fontSize: 12.5,
          color: cls.tier === "clean" ? "var(--color-success-700)" : "var(--color-info-700)" }}>
          <b>Security scan {cls.tier === "clean" ? "clean" : "mostly clean"}</b>
          {" — "}
          {cls.tier === "clean"
            ? "no findings reported by the publisher."
            : `${cls.counts.medium || 0} medium and ${cls.counts.low || 0} low-severity findings; no critical or high issues.`}
        </div>
      </div>
    );
  }

  const config = cls.tier === "rejected" ? {
    title: "Publisher rejected this version",
    body: "The publisher rejected this build before publishing. Deploying it means going against their recommendation.",
    tone: "error",
  } : cls.tier === "incomplete" ? {
    title: "Security review incomplete",
    body: "This snapshot has no vulnerability scan report. You are deploying without a security baseline.",
    tone: "warning",
  } : {
    title: "Unresolved security findings",
    body: `${cls.counts.critical || 0} critical / ${cls.counts.high || 0} high-severity findings reported by the publisher.`,
    tone: "error",
  };
  const isErr = config.tone === "error";

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--radius-lg)",
      background: isErr ? "var(--error-bg)" : "var(--warning-bg)",
      border: `1px solid ${isErr ? "oklch(58% 0.20 25 / 0.30)" : "oklch(70% 0.16 70 / 0.30)"}`,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{
        width: 30, height: 30, flexShrink: 0,
        borderRadius: "50%", background: "oklch(100% 0 0 / 0.6)",
        display: "grid", placeItems: "center",
        color: isErr ? "var(--color-error-700)" : "var(--color-warning-700)",
      }}><Ico name="alert" size={16} stroke={2} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600,
          color: isErr ? "var(--color-error-700)" : "var(--color-warning-700)" }}>
          {config.title}
        </div>
        <div style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5,
          color: isErr ? "var(--color-error-700)" : "var(--color-warning-700)", opacity: 0.9 }}>
          {config.body}
        </div>
        {cls.findings && cls.findings.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {cls.findings.filter(f => f.sev === "critical" || f.sev === "high").map((f, i) => (
              <span key={i} style={{
                fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-sm)",
                background: "oklch(100% 0 0 / 0.6)",
                border: "1px solid oklch(58% 0.20 25 / 0.25)",
                color: "var(--color-error-700)",
              }}>
                <span className="mono" style={{
                  fontSize: 9.5, padding: "0 4px", borderRadius: 2,
                  background: "var(--error)", color: "#fff", marginRight: 5,
                  letterSpacing: "0.04em",
                }}>{f.sev.toUpperCase()}</span>
                {f.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KvBox({ label, value, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span className="overline" style={{ fontSize: 9.5 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--fg1)" }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--fg3)" }}>{sub}</span>}
    </div>
  );
}

// ─── Full vulnerability findings list (Review step) ─────────
// Critical/high are expanded by default; medium/low/info collapsed and
// disclosed on demand so the operator can drill in only when relevant.
function FindingsListCard({ version, cls }) {
  // No findings to show — either scan is missing/rejected (handled by banner)
  // or genuinely clean.
  if (!version || cls.tier === "incomplete" || cls.tier === "rejected") return null;
  const findings = cls.findings || [];

  // Group by severity for ordered display
  const order = ["critical", "high", "medium", "low", "info"];
  const grouped = order.map(sev => ({ sev, items: findings.filter(f => f.sev === sev) }))
                       .filter(g => g.items.length > 0);

  return (
    <Card padding={0}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Ico name="shieldCheck" size={14}
            style={{ color: cls.tier === "high-risk" ? "var(--error)"
                   : cls.tier === "moderate"   ? "var(--info)"
                   : "var(--success)" }} />
          Vulnerability scan report
        </span>
      }
      hint={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {findings.length === 0
            ? <Pill tone="success" dot size="sm">No findings</Pill>
            : <><span className="mono num" style={{ color: "var(--fg2)" }}>{findings.length}</span> finding{findings.length === 1 ? "" : "s"}</>}
          {findings.length > 0 && (
            <span style={{ marginLeft: 4, display: "inline-flex", gap: 4 }}>
              {order.filter(s => (cls.counts[s] || 0) > 0).map(s => (
                <span key={s} style={{
                  fontSize: 10, padding: "1px 5px", borderRadius: 3,
                  background: window.SEVERITY[s].color, color: "#fff",
                  fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>{cls.counts[s]} {window.SEVERITY[s].label}</span>
              ))}
            </span>
          )}
        </span>
      }>
      {findings.length === 0 ? (
        <div style={{ padding: "var(--space-5)", textAlign: "center", color: "var(--fg3)", fontSize: 12.5 }}>
          The publisher's scan completed without any findings to report.
        </div>
      ) : (
        <div>
          {grouped.map(group => (
            <FindingsGroup key={group.sev} sev={group.sev} items={group.items} />
          ))}
        </div>
      )}
    </Card>
  );
}

function FindingsGroup({ sev, items }) {
  // Critical and high default to expanded — these need eyes on them.
  const [open, setOpen] = usePwState(sev === "critical" || sev === "high");
  const meta = window.SEVERITY[sev];
  return (
    <div style={{ borderTop: "1px solid var(--border-1)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 16px",
        background: open ? "var(--bg2)" : "transparent",
        textAlign: "left", cursor: "pointer",
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4,
          background: meta.color, color: "#fff",
          display: "grid", placeItems: "center",
          fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
          fontFamily: "var(--font-mono)",
        }}>{items.length}</span>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: meta.tone === "danger"  ? "var(--color-error-700)"
               : meta.tone === "warning" ? "var(--color-warning-700)"
               : meta.tone === "info"    ? "var(--color-info-700)"
               : "var(--fg2)",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>{meta.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)" }}>
          {open ? "Hide" : "Show"} {items.length} {items.length === 1 ? "issue" : "issues"}
        </span>
        <Ico name={open ? "chevu" : "chevdown"} size={12} style={{ color: "var(--fg3)" }} />
      </button>
      {open && (
        <div>
          {items.map((f, i) => (
            <div key={i} style={{
              padding: "10px 16px 12px 44px",
              borderTop: i > 0 ? "1px dashed var(--border-1)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)" }}>{f.title}</span>
                {f.cve && (
                  <span className="mono" style={{
                    fontSize: 10.5, padding: "1px 6px", borderRadius: 3,
                    background: "var(--bg3)", color: "var(--fg2)",
                    border: "1px solid var(--border-1)",
                  }}>{f.cve}</span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg3)", marginTop: 3, lineHeight: 1.5 }}>
                {f.desc}
              </div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11 }}>
                <span style={{ color: "var(--fg3)" }}>
                  Package: <span className="mono" style={{ color: "var(--fg2)" }}>{f.pkg}</span>
                  {f.version !== "—" && (
                    <> @ <span className="mono" style={{ color: "var(--fg2)" }}>{f.version}</span></>
                  )}
                </span>
                {f.fix && (
                  <span style={{ color: "var(--fg3)" }}>
                    Fix: <span style={{ color: "var(--color-success-700)", fontWeight: 500 }}>{f.fix}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function androidLabel(api) {
  const map = { 21: "5.0", 22: "5.1", 23: "6.0", 24: "7.0", 25: "7.1", 26: "8.0", 27: "8.1",
                28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15" };
  return map[api] ? `Android ${map[api]}` : `API ${api}`;
}

// ─── Step 2: Audience ─────────────────────────────────────
function PullStepAudience({ tenant, app, merchants, alreadyOnVersionIds, versionLabel, rolloutOnly, state, setState }) {
  const { mode, whitelist } = state;
  const [query, setQuery] = usePwState("");
  const [tagFilter, setTagFilter] = usePwState([]);  // multi-select tag filter
  const [page, setPage] = usePwState(1);
  const [drawerOpen, setDrawerOpen] = usePwState(false);
  const [showDowngrades, setShowDowngrades] = usePwState(false);
  const PAGE_SIZE = 8;

  // Identify "downgrade" merchants: their current version code > target.
  // The target is the version this wizard is configuring, looked up from the
  // app's history of merchant deployments.
  const targetVersion = app.versions.find(v => v.id === ((window.SUBSCRIBED_APPS || {})[tenant.id]?.find(s => s.appId === app.id)?.subscribedVersionId));
  // Actually use latest available — the wizard's `next` is what we're rolling
  // toward; we don't have a direct ref here, so we use the highest version
  // code among merchants in the wizard-supplied list to approximate. The
  // wizard exports `versionLabel`; resolve back to a version by name.
  const wizardVersion = app.versions.find(v => v.name === versionLabel) || app.versions[0];
  const downgradeMap = useMemoS(() => {
    const out = new Map();
    merchants.forEach(m => {
      const cur = window.getMerchantCurrentVersion(tenant.id, app.id, m.id);
      if (cur && wizardVersion && (cur.code || 0) > (wizardVersion.code || 0)) {
        out.set(m.id, cur);
      }
    });
    return out;
  }, [merchants, tenant.id, app.id, wizardVersion?.id]);

  // Hide downgrades by default
  const audienceMerchants = showDowngrades
    ? merchants
    : merchants.filter(m => !downgradeMap.has(m.id));

  // All merchants that already have this version (could be informational or
  // none in non-rollout-only mode).
  const allFleet = window.merchantsConfiguredForApp(tenant.id, app.id);
  const alreadyOnMerchants = allFleet.filter(m => alreadyOnVersionIds && alreadyOnVersionIds.has && alreadyOnVersionIds.has(m.id));

  // Effective targets given mode (these are the rollout candidates)
  const effective = mode === "all"
                  ? audienceMerchants
                  : audienceMerchants.filter(m => whitelist.has(m.id));
  const totalTerminals = effective.reduce((s, m) => s + m.terminals, 0);

  const setMode = (m) => setState({ ...state, mode: m });
  const toggleWhite = (id) => {
    const next = new Set(whitelist); next.has(id) ? next.delete(id) : next.add(id);
    setState({ ...state, whitelist: next });
  };
  // Filtered + paginated merchant list for the picker table
  const q = query.trim().toLowerCase();
  // Distinct tag pool across the audience — feeds the tag filter.
  const audienceTags = usePwMemo(() => {
    const set = new Set();
    audienceMerchants.forEach(m => (m.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [audienceMerchants]);
  const filtered = audienceMerchants.filter(m => {
    if (q && !`${m.name} ${m.region}`.toLowerCase().includes(q)) return false;
    if (tagFilter.length > 0 && !(m.tags || []).some(t => tagFilter.includes(t))) return false;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // The "selected" set (collapsible drawer below)
  const selectedSet = mode === "whitelist" ? whitelist : new Set();
  const selectedMerchants = mode === "all" ? effective : audienceMerchants.filter(m => selectedSet.has(m.id));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <H title="Choose who receives this update"
        sub="Pick the merchants in your fleet that should receive this version. Merchants already on this version are excluded automatically." />

      {/* Already-on-version block — always shown in rollout-only mode so the
          operator can see which merchants are out of scope for this round. */}
      {rolloutOnly && (
        alreadyOnMerchants.length > 0 ? (
          <div style={{
            padding: "10px 14px",
            background: "var(--success-bg)",
            border: "1px solid oklch(58% 0.14 152 / 0.25)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Ico name="check" size={14} stroke={2.4} style={{ color: "var(--success)" }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-success-700)" }}>
                {alreadyOnMerchants.length} merchant{alreadyOnMerchants.length === 1 ? "" : "s"} already on <span className="mono">{versionLabel}</span>
              </span>
              <span style={{ fontSize: 11, color: "var(--color-success-700)", opacity: 0.85 }}>
                · <span className="mono num">{alreadyOnMerchants.reduce((s, m) => s + m.terminals, 0)}</span> terminals covered
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {alreadyOnMerchants.map(m => (
                <span key={m.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 999,
                  background: "var(--bg2)",
                  border: "1px solid oklch(58% 0.14 152 / 0.30)",
                  fontSize: 11, color: "var(--color-success-700)",
                }}>
                  <Ico name="check" size={9} stroke={2.5} />
                  {m.name}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg3)", lineHeight: 1.5 }}>
              These are excluded from the merchant list below. Rollouts only ever add new merchants — to remove the app from a merchant's terminals, manage it from the app's Merchant page.
            </div>
          </div>
        ) : (
          <div style={{
            padding: "10px 14px",
            background: "var(--bg3)",
            border: "1px dashed var(--border-2)",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 12, color: "var(--fg3)",
          }}>
            <Ico name="info" size={14} />
            <span>
              <b style={{ color: "var(--fg2)" }}>First rollout for <span className="mono">{versionLabel}</span></b> — no merchants are running this version yet.
            </span>
          </div>
        )
      )}

      {/* Effective reach summary + downgrade toggle */}
      <div style={{
        padding: "14px 18px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(95deg, var(--color-primary-50) 0%, var(--color-accent-50) 100%)",
        border: "1px solid oklch(60% 0.14 230 / 0.25)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <Ico name="bolt" size={20} style={{ color: "var(--color-primary-700)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5 }}>
            This rollout will reach{" "}
            <b className="mono num" style={{ fontSize: 16, color: "var(--color-primary-700)" }}>{effective.length}</b>{" "}
            of <span className="mono num">{audienceMerchants.length}</span> {rolloutOnly ? "eligible " : ""}merchants
            <span style={{ color: "var(--fg3)" }}> · </span>
            <b className="mono num" style={{ fontSize: 16, color: "var(--color-primary-700)" }}>{totalTerminals}</b>{" "}
            terminals in total
          </div>
          {downgradeMap.size > 0 && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg3)" }}>
              <span className="mono num" style={{ color: "var(--color-warning-700)", fontWeight: 500 }}>{downgradeMap.size}</span>
              {" "}merchant{downgradeMap.size === 1 ? "" : "s"} on a newer version {showDowngrades ? "shown — will be downgraded" : "hidden — would be downgraded"}
            </div>
          )}
        </div>
        {downgradeMap.size > 0 && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={showDowngrades}
              onChange={(e) => setShowDowngrades(e.target.checked)}
              style={{ accentColor: "var(--color-warning-700)" }} />
            <span style={{ fontSize: 11.5, color: "var(--color-warning-700)", fontWeight: 500 }}>
              Show downgrades
            </span>
          </label>
        )}
      </div>

      {/* Mode radio cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { id: "all",       icon: "users",       label: "All eligible merchants",
            body: "Every merchant who doesn't already have this version receives the update." },
          { id: "whitelist", icon: "shieldCheck", label: "Partial — pick merchants",
            body: "Only the merchants you select. Useful for canary or pilot deployments." },
        ].map(opt => {
          const on = mode === opt.id;
          return (
            <button key={opt.id} onClick={() => setMode(opt.id)} style={{
              padding: 14, textAlign: "left",
              background: on ? "var(--color-primary-50)" : "var(--bg2)",
              border: "1px solid",
              borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "1.5px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--border-2)",
                  display: "grid", placeItems: "center",
                }}>
                  {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-600)" }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--fg3)", lineHeight: 1.45 }}>{opt.body}</div>
            </button>
          );
        })}
      </div>

      {/* Merchant list — search + paginated table */}
      <Card padding={0} title={`Eligible merchants${mode !== "all" ? ` — pick to ${mode === "whitelist" ? "include" : "exclude"}` : ""}`}
        hint={`${merchants.length} merchant${merchants.length === 1 ? "" : "s"} · ${merchants.reduce((s, m) => s + m.terminals, 0)} terminals`}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {audienceTags.length > 0 && (
              <window.TagFilterDropdown options={audienceTags} value={tagFilter}
                onChange={(v) => { setTagFilter(v); setPage(1); }} size="sm" />
            )}
            <div style={{ width: 200 }}>
              <Input size="sm" prefix={<Ico name="search" size={12} />}
                placeholder="Search name or region…"
                value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            </div>
          </div>
        }>
        <table className="tds-table num" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {mode !== "all" && <th style={{ width: 36 }}></th>}
              <th>Merchant</th>
              <th>Region</th>
              <th style={{ textAlign: "right" }}>Terminals</th>
              <th>Will receive</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(m => {
              const checked = whitelist.has(m.id);
              const willReceive = mode === "all" || whitelist.has(m.id);
              const rowClickable = mode !== "all";
              const handleRowClick = () => {
                if (!rowClickable) return;
                toggleWhite(m.id);
              };
              return (
                <tr key={m.id}
                  onClick={handleRowClick}
                  style={{
                    cursor: rowClickable ? "pointer" : "default",
                    background: mode !== "all" && checked ? "var(--success-bg)" : undefined,
                  }}>
                  {mode !== "all" && (
                    <td style={{ paddingLeft: 14 }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked}
                        onChange={() => toggleWhite(m.id)}
                        style={{ accentColor: "var(--success)" }} />
                    </td>
                  )}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 5,
                        background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                        display: "grid", placeItems: "center",
                        fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                      }}>{m.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--fg2)", fontSize: 12 }}>{m.region}</td>
                  <td style={{ textAlign: "right" }}><span className="mono num" style={{ fontSize: 12 }}>{m.terminals}</span></td>
                  <td>
                    {willReceive
                      ? <Pill tone="success" dot size="sm">Included</Pill>
                      : <Pill tone="neutral" size="sm">Skipped</Pill>}
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr><td colSpan={mode !== "all" ? 5 : 4}
                style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                {merchants.length === 0
                  ? "No eligible merchants — they're all already on this version."
                  : `No merchants match "${query}".`}
              </td></tr>
            )}
          </tbody>
        </table>
        {pageCount > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px",
            borderTop: "1px solid var(--border-1)",
            fontSize: 12, color: "var(--fg3)",
          }}>
            <span>Page <b className="num" style={{ color: "var(--fg2)" }}>{safePage}</b> of <b className="num">{pageCount}</b> · {filtered.length} merchants</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="tds-pagination__page"
                style={{ opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? "not-allowed" : "pointer" }}>
                <Ico name="chevl" size={12} />
              </button>
              <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}
                className="tds-pagination__page"
                style={{ opacity: safePage >= pageCount ? 0.4 : 1, cursor: safePage >= pageCount ? "not-allowed" : "pointer" }}>
                <Ico name="chevr" size={12} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Selected (N) — collapsible drawer at the bottom */}
      <SelectedDrawer
        mode={mode}
        selectedMerchants={selectedMerchants}
        onClear={() => setState({ ...state, whitelist: new Set() })}
        onRemove={(id) => toggleWhite(id)}
        open={drawerOpen}
        setOpen={setDrawerOpen}
      />
    </div>
  );
}

// Collapsible bottom panel listing the selected/included/excluded merchants
// for the rollout. Paginated 10/page; pagination hidden under 10 items.
function SelectedDrawer({ mode, selectedMerchants, onClear, onRemove, open, setOpen }) {
  const [page, setPage] = usePwState(1);
  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(selectedMerchants.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const slice = selectedMerchants.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showPager = selectedMerchants.length > PAGE_SIZE;

  const removable = mode !== "all";
  const totalTerminals = selectedMerchants.reduce((s, m) => s + m.terminals, 0);

  return (
    <div style={{
      border: "1px solid var(--border-2)",
      borderRadius: "var(--radius-lg)",
      background: "var(--bg2)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: open ? "var(--bg3)" : "transparent",
      }}>
        <button onClick={() => setOpen(o => !o)} style={{
          flex: 1, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          textAlign: "left", cursor: "pointer",
        }}>
          <Ico name={open ? "chevu" : "chevdown"} size={13} style={{ color: "var(--fg3)" }} />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
            {mode === "all" ? "Selected merchants" : "Included merchants"}
          </span>
          <span className="mono num" style={{
            padding: "1px 7px", borderRadius: 999,
            background: "var(--color-primary-50)", color: "var(--color-primary-700)",
            fontSize: 11, fontWeight: 600,
          }}>{selectedMerchants.length}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)" }}>
            {selectedMerchants.length > 0
              ? <><span className="mono num">{totalTerminals}</span> terminals total</>
              : "click to expand"}
          </span>
        </button>
        {removable && selectedMerchants.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              padding: "6px 10px",
              marginRight: 8,
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11.5, color: "var(--fg3)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
            title="Clear all selections">
            <Ico name="x" size={11} stroke={2.2} />
            Clear all
          </button>
        )}
      </div>
      {open && (
        <div style={{ borderTop: "1px solid var(--border-1)" }}>
          {selectedMerchants.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--fg3)", padding: "12px 14px" }}>
              {mode === "whitelist" ? "No merchants selected yet — pick some from the table above."
                                    : "No eligible merchants in scope."}
            </div>
          ) : (
            <>
              {/* Vertical list — one row per merchant. */}
              <div>
                {slice.map((m, i) => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 14px",
                    borderBottom: i < slice.length - 1 ? "1px solid var(--border-1)" : "none",
                    background: mode === "whitelist" ? "var(--success-bg)" : "transparent",
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                      background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                      display: "grid", placeItems: "center",
                      fontSize: 10, fontWeight: 600,
                    }}>{m.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg3)" }}>
                        {m.region}
                      </div>
                    </div>
                    <span className="mono num" style={{
                      fontSize: 11.5, color: "var(--fg2)", flexShrink: 0,
                    }}>{m.terminals} terminals</span>
                    {removable && (
                      <button onClick={() => onRemove(m.id)}
                        style={{ padding: 4, color: "var(--fg3)", flexShrink: 0,
                                 borderRadius: "var(--radius-sm)" }} title="Remove">
                        <Ico name="x" size={12} stroke={2.2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {showPager && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                  borderTop: "1px solid var(--border-1)",
                  fontSize: 11.5, color: "var(--fg3)",
                  background: "var(--bg2)",
                }}>
                  <span>Page <b className="num" style={{ color: "var(--fg2)" }}>{safePage}</b> of <b className="num">{pageCount}</b> · {selectedMerchants.length} merchants</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                      className="tds-pagination__page"
                      style={{ opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? "not-allowed" : "pointer" }}>
                      <Ico name="chevl" size={12} />
                    </button>
                    <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}
                      className="tds-pagination__page"
                      style={{ opacity: safePage >= pageCount ? 0.4 : 1, cursor: safePage >= pageCount ? "not-allowed" : "pointer" }}>
                      <Ico name="chevr" size={12} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Rollout ──────────────────────────────────────
function StepRollout({ state, setState, totalTerminals }) {
  const { staged, curve } = state;
  const setStaged = (v) => setState({ ...state, staged: v });
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <H title="Rollout cadence"
        sub="Choose whether to release to everyone at once or to ramp gradually. Gradual ramps catch regressions before they hit your full fleet." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { id: false, icon: "bolt",     label: "Immediate",          body: "Push the new snapshot to every selected terminal as soon as the rollout is scheduled.", tone: "neutral" },
          { id: true,  icon: "history",  label: "Staged (7-day curve)", body: "Day 1: 1% → 2% → 5% → 10% → 20% → 50% → 100%. Pause or accelerate any time from the Rollouts page.", tone: "primary" },
        ].map(opt => {
          const on = staged === opt.id;
          return (
            <button key={String(opt.id)} onClick={() => setStaged(opt.id)} style={{
              padding: 16, textAlign: "left",
              background: on ? "var(--color-primary-50)" : "var(--bg2)",
              border: "1px solid",
              borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ico name={opt.icon} size={15}
                  style={{ color: on ? "var(--color-primary-700)" : "var(--fg3)" }} />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{opt.label}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--fg3)", lineHeight: 1.5 }}>{opt.body}</div>
            </button>
          );
        })}
      </div>

      {staged && (
        <Card title="Default 7-day curve"
          hint="Edit per-day percentages later from the Rollouts page (Phase 3.2)."
          action={<Button size="sm" ghost icon="refresh"
            onClick={() => setState({ ...state, curve: window.ROLLOUT_DEFAULT_CURVE.map(p => ({ ...p })) })}>Reset</Button>}>
          {/* Bar chart */}
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${curve.length}, 1fr)`,
            gap: 10, padding: "8px 0",
          }}>
            {curve.map((p) => {
              const pct = p.pct;
              const terminals = Math.round((totalTerminals * pct) / 100);
              return (
                <div key={p.day} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6,
                }}>
                  <span className="mono num" style={{ fontSize: 11, fontWeight: 500, color: "var(--fg2)" }}>{pct}%</span>
                  <div style={{
                    width: "100%", height: 88,
                    display: "flex", alignItems: "flex-end",
                  }}>
                    <div style={{
                      width: "100%",
                      height: `${pct}%`,
                      background: "linear-gradient(to top, var(--accent), var(--color-primary-500))",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg3)" }}>Day {p.day}</span>
                  <span className="mono num" style={{ fontSize: 10.5, color: "var(--fg3)" }}>~{terminals}t</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg3)", display: "flex", alignItems: "center", gap: 8 }}>
            <Ico name="info" size={12} />
            Each day's percentage is cumulative against the audience you chose in the previous step ({totalTerminals} terminals).
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Step 3: Upgrade strategy ─────────────────────────────
// Three named presets + a Custom option that exposes the upgrade-timing
// and network dictionaries from data.jsx. The timing/network selectors are
// only shown when preset === "custom"; otherwise the preset's defaults
// drive the rollout.
function StepStrategy({ state, setState }) {
  const setPreset = (id) => {
    const preset = (window.UPGRADE_STRATEGY_PRESETS || []).find(p => p.id === id);
    if (!preset) return;
    if (id === "custom") {
      setState({ ...state, preset: "custom" });
    } else {
      setState({ ...state, preset: id, timing: preset.timing, network: preset.network });
    }
  };
  const isCustom = state.preset === "custom";
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <H title="Pick an upgrade strategy"
         sub="Decide how install behaves on each terminal — when it can install and which network it may use." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {(window.UPGRADE_STRATEGY_PRESETS || []).map(p => {
          const on = state.preset === p.id;
          return (
            <button key={p.id} onClick={() => setPreset(p.id)} style={{
              padding: 16, textAlign: "left",
              background: on ? "var(--color-primary-50)" : "var(--bg2)",
              border: "1px solid",
              borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "1.5px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--border-2)",
                  display: "grid", placeItems: "center",
                }}>
                  {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-600)" }} />}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.label}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--fg3)", lineHeight: 1.5 }}>{p.body}</div>
              {p.id !== "custom" && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <ChipMini label={timingLabel(p.timing)} />
                  <ChipMini label={networkLabel(p.network)} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <Card title="Custom strategy"
          hint="Choose network and timing independently.">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FieldGroup label="Network requirement"
              hint="Which network the terminal may use to download the new version.">
              <RadioRow value={state.network}
                onChange={(v) => setState({ ...state, network: v })}
                options={(window.UPGRADE_NETWORK_OPTIONS || []).map(o => ({
                  id: o.id, label: o.label, body: o.body,
                }))} />
              {state.network === "cellCap" && (
                <div style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--border-2)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg2)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: "var(--fg2)" }}>Cellular cap (MB this month)</span>
                  <input type="number" min={10} step={10}
                    value={state.cellCapMb}
                    onChange={(e) => setState({ ...state, cellCapMb: Number(e.target.value) })}
                    style={{
                      width: 100, padding: "6px 10px",
                      border: "1px solid var(--border-2)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg1)", color: "var(--fg1)",
                      fontFamily: "var(--font-mono)", fontSize: 13,
                    }} />
                  <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>MB</span>
                </div>
              )}
            </FieldGroup>
            <FieldGroup label="Upgrade timing"
              hint="When the install actually starts on the terminal.">
              <RadioRow value={state.timing}
                onChange={(v) => setState({
                  ...state, timing: v,
                  slots: v === "scheduled" && (!state.slots || state.slots.length === 0)
                    ? [{ start: "02:00", end: "04:00" }]
                    : state.slots,
                })}
                options={(window.UPGRADE_TIMING_OPTIONS || []).map(o => ({
                  id: o.id, label: o.label, body: o.body,
                }))} />
              {state.timing === "scheduled" && window.SlotsEditor && (
                <window.SlotsEditor
                  slots={state.slots || []}
                  onChange={(slots) => setState({ ...state, slots })} />
              )}
            </FieldGroup>
          </div>
        </Card>
      )}
    </div>
  );
}

function timingLabel(id) {
  const opt = (window.UPGRADE_TIMING_OPTIONS || []).find(o => o.id === id);
  return opt ? opt.label : id;
}
function networkLabel(id) {
  const opt = (window.UPGRADE_NETWORK_OPTIONS || []).find(o => o.id === id);
  return opt ? opt.label : id;
}

function ChipMini({ label }) {
  return (
    <span style={{
      fontSize: 10.5, padding: "2px 7px", borderRadius: 999,
      background: "var(--bg3)", color: "var(--fg2)",
      border: "1px solid var(--border-1)", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function FieldGroup({ label, hint, children }) {
  return (
    <div>
      <div className="overline" style={{ fontSize: 10, marginBottom: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--fg3)", marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}

function RadioRow({ value, onChange, options, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
      {options.map(opt => {
        const on = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: compact ? "8px 12px" : "12px 14px",
            background: on ? "var(--color-primary-50)" : "var(--bg2)",
            border: "1px solid",
            borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
            borderRadius: "var(--radius-md)",
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
              <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
              {opt.body && (
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg3)", lineHeight: 1.5 }}>{opt.body}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────
// Pull/Rollout wizard. Always rollout-only — Approval is its own screen.
// 3 steps: Audience → Cadence → Strategy. The final step doubles as the
// confirmation surface (summary card + Schedule rollout button).
function PullWizardScreen({ app, version, rolloutOnly, onCancel, onConfirm }) {
  const tenant = window.useActiveTenant();

  // The active subscription is needed only for the "current version" hint
  // on the summary card. The target version is whatever caller passed in.
  const subscriptionRaw = ((window.SUBSCRIBED_APPS || {})[tenant.id] || []).find(s => s.appId === app.id);
  const current = (app.versions || []).find(v => v.id === subscriptionRaw?.subscribedVersionId) || (app.versions || [])[0];
  const next    = version || current || (app.versions || [])[0];

  const [step, setStep] = usePwState(0);
  const [stateBag, setStateBag] = usePwState(makeInitialState());

  const setAudience = (a) => setStateBag({ ...stateBag, audience: a });
  const setRollout  = (r) => setStateBag({ ...stateBag, rollout:  r });
  const setStrategy = (s) => setStateBag({ ...stateBag, strategy: s });

  // Audience math — exclude merchants already on this version.
  const allMerchants = window.merchantsConfiguredForApp(tenant.id, app.id);
  const alreadyOn = window.merchantsAlreadyOnVersion(tenant.id, app.id, next.id);
  const merchants = allMerchants.filter(m => !alreadyOn.has(m.id));
  const effective = stateBag.audience.mode === "all"
                  ? merchants
                  : merchants.filter(m => stateBag.audience.whitelist.has(m.id));
  const totalTerminals = effective.reduce((s, m) => s + m.terminals, 0);

  const stepId = STEPS[step]?.id || "scope";
  const canAdvance = (() => {
    if (stepId === "scope") {
      if (stateBag.audience.mode === "whitelist" && stateBag.audience.whitelist.size === 0) return false;
      if (effective.length === 0) return false;
    }
    return true;
  })();
  // Scheduled-windows timing requires a valid slot list — defer launch
  // until validateSlots passes.
  const slotsErr = stateBag.strategy.timing === "scheduled" && window.validateSlots
    ? window.validateSlots(stateBag.strategy.slots)
    : null;
  const canLaunch = effective.length > 0 && !slotsErr;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 24px",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border-1)",
      }}>
        <button onClick={onCancel} title="Cancel" style={{
          padding: 6, color: "var(--fg3)", borderRadius: "var(--radius-sm)",
        }}><Ico name="x" size={16} /></button>
        <window.AppIcon app={app} size={36} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            Roll out — <span style={{ color: "var(--fg2)" }}>{app.name}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Version <span className="mono" style={{ color: "var(--color-primary-700)", fontWeight: 500 }}>{next.name}</span>
            <span style={{ opacity: 0.5 }}>{" · "}</span>
            <span className="mono">{app.package}</span>
          </div>
        </div>
        <Button ghost onClick={onCancel}>Cancel</Button>
      </header>

      <StepperBar steps={STEPS} step={step} onJump={(i) => i < step && setStep(i)} />

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg1)", padding: "24px 24px 32px" }}>
        {stepId === "scope"   && <PullStepAudience tenant={tenant} app={app}
                                              merchants={merchants}
                                              alreadyOnVersionIds={alreadyOn}
                                              versionLabel={next.name}
                                              rolloutOnly={true}
                                              state={stateBag.audience} setState={setAudience} />}
        {stepId === "rollout" && <StepRollout state={stateBag.rollout} setState={setRollout} totalTerminals={totalTerminals} />}
        {stepId === "options" && (
          <>
            <StepStrategy state={stateBag.strategy} setState={setStrategy} />
            <div style={{ maxWidth: 880, margin: "18px auto 0" }}>
              <RolloutSummaryCard app={app} current={current} next={next}
                state={stateBag} totalReach={effective.length}
                totalTerminals={totalTerminals} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 24px",
        background: "var(--bg2)",
        borderTop: "1px solid var(--border-1)",
      }}>
        <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>
          Step <b className="num" style={{ color: "var(--fg2)" }}>{step + 1}</b> of <b className="num">{STEPS.length}</b> · {STEPS[step].label}
        </span>
        <div style={{ flex: 1 }} />
        {step > 0 && <Button ghost icon="chevl" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < STEPS.length - 1 ? (
          <Button primary iconRight="chevr" disabled={!canAdvance}
            onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button primary icon="bolt" disabled={!canLaunch}
            onClick={() => onConfirm({
              app, current, next, pullOnly: false, rolloutOnly: true,
              ...stateBag, effective, totalTerminals,
              alreadyOnVersionIds: alreadyOn,
            })}>
            Schedule rollout
          </Button>
        )}
      </footer>
    </div>
  );
}

// ─── Rollout summary card ─────────────────────────────────
// Compact card mounted on the final wizard step (and reused in places
// where we want a quick "what's about to happen" recap).
function RolloutSummaryCard({ app, current, next, state, totalReach, totalTerminals }) {
  let timing = timingLabel(state.strategy.timing);
  if (state.strategy.timing === "scheduled") {
    const slots = state.strategy.slots || [];
    timing = slots.length
      ? `Scheduled · ${slots.map(s => `${s.start}–${s.end}`).join(", ")}`
      : "Scheduled (no windows)";
  }
  const network = networkLabel(state.strategy.network);
  return (
    <Card title="Summary"
      hint={`Ready when you are — ${totalReach} merchants · ${totalTerminals} terminals`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <KV label="App / Version" value={<><b>{app.name}</b> <span className="mono">· v{next.name}</span></>} />
        <KV label="Audience" value={
          state.audience.mode === "all"
            ? `All eligible merchants (${totalReach})`
            : `Partial · ${state.audience.whitelist.size} of ${totalReach} merchants selected`} />
        <KV label="Reach" value={<><span className="mono num">{totalReach}</span> merchants · <span className="mono num">{totalTerminals}</span> terminals</>} />
        <KV label="Cadence" value={state.rollout.staged
          ? "Staged · 7-day curve (1% → 100%)"
          : "Immediate — all selected terminals at once"} />
        <KV label="Strategy"
          value={state.strategy.preset === "casual"     ? "Casual upgrade — reboot, any network"
              : state.strategy.preset === "immediate"   ? "Immediate upgrade — install now, any network"
              : `Custom · ${network}${state.strategy.network === "cellCap" ? ` (<${state.strategy.cellCapMb} MB cellular)` : ""} · ${timing}`} />
      </div>
    </Card>
  );
}

// PullWizardScreen has been retired — rollouts are now managed inline
// from the App detail's Deployments tab (target-version edits cached
// then committed via "Save changes", or per-row strategy editing). The
// helpers above (PullStepReview, FindingsListCard, etc.) are still used
// by ApprovalScreen below.

// ─── ApprovalScreen ────────────────────────────────────────
// Standalone Review Release page for subscribers. The flow:
//   1. ISO receives notification (PENDING_APPROVALS) about a new version.
//   2. Click "Review & approve" from the version list → land here.
//   3. Read release notes, scan report, permission diff, etc.
//   4. Click "Approve" → notification cleared, then we ask
//      "Do you want to roll out now?" via RolloutPromptModal.
//   5. "Reject" marks the version as skipped (one-off — next release
//      from this publisher still triggers a fresh notification).
function ApprovalScreen({ app, version, onCancel, onApproveAndRollout, onApproveOnly, route }) {
  const tenant = window.useActiveTenant();
  const subscriptionRaw = ((window.SUBSCRIBED_APPS || {})[tenant.id] || []).find(s => s.appId === app.id);
  const current = (app.versions || []).find(v => v.id === subscriptionRaw?.subscribedVersionId) || (app.versions || [])[0];
  const next = version || (app.versions || []).find(v => v.status === "published") || (app.versions || [])[0];
  const [ack, setAck] = usePwState(false);
  const [rejectOpen, setRejectOpen] = usePwState(false);

  const cls = (() => {
    if (!next || !next.scan) return { tier: "incomplete" };
    const findings = window.SCAN_FINDINGS_TEMPLATES[next.scan] || [];
    const counts = window.summariseFindings(findings);
    if ((counts.critical || 0) + (counts.high || 0) > 0) return { tier: "high-risk", counts, findings };
    if ((counts.medium || 0) > 0) return { tier: "moderate", counts, findings };
    return { tier: "clean", counts, findings };
  })();
  const requiresAck = cls.tier === "high-risk" || cls.tier === "incomplete" || cls.tier === "rejected";
  const canApprove = !requiresAck || ack;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 24px",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border-1)",
      }}>
        <button onClick={onCancel} title="Back" style={{
          padding: 6, color: "var(--fg3)", borderRadius: "var(--radius-sm)",
        }}><Ico name="chevl" size={16} /></button>
        <window.AppIcon app={app} version={next} size={36} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            Approve update — <span style={{ color: "var(--fg2)" }}>{app.name}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Target version <span className="mono" style={{ color: "var(--color-primary-700)", fontWeight: 500 }}>{next.name}</span>
            <span style={{ opacity: 0.5 }}>{" · "}</span>
            <span className="mono">{app.package}</span>
          </div>
        </div>
        <Button ghost onClick={onCancel}>Cancel</Button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg1)", padding: "24px 24px 32px" }}>
        <PullStepReview app={app} current={current} next={next} ack={ack} setAck={setAck} />
      </div>

      <footer style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 24px",
        background: "var(--bg2)",
        borderTop: "1px solid var(--border-1)",
      }}>
        <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>
          {requiresAck && !ack
            ? "Acknowledge the security risk to enable Approve."
            : "Approve to clear the pending notification, then choose whether to roll out now."}
        </span>
        <div style={{ flex: 1 }} />
        <Button danger onClick={() => setRejectOpen(true)}>Reject this version</Button>
        <Button primary icon="shieldCheck" disabled={!canApprove}
          onClick={() => onApproveAndRollout && onApproveAndRollout({ app, next, current })}>
          Approve &amp; continue
        </Button>
      </footer>

      <window.ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${next.name}?`}
        body="This version will be marked as skipped — you won't be prompted to approve it. You can re-consider it later from the Versions tab."
        confirmLabel="Reject version"
        tone="danger"
        icon="x"
        onConfirm={() => {
          setRejectOpen(false);
          window.setRejectionState(tenant.id, app.id, next.id, "skipped");
          window.clearPendingApproval?.(tenant.id, app.id, next.id);
          window.showToast?.(`${app.name} ${next.name} rejected — skipped this version`, "warning");
          onCancel();
        }} />
    </div>
  );
}

window.ApprovalScreen = ApprovalScreen;

// ─── RolloutPromptModal ────────────────────────────────────
// Shared "Do you want to roll out to your merchants now?" gate, opened from:
//   · publish wizard onPublish (ISV+ISO publisher)
//   · browse-pool subscribe complete (new subscriber)
//   · approval screen on Approve (existing subscriber pulling a new version)
// `ctx` is read from `window.__rolloutPrompt` at open time so siblings can
// thread context through without prop-drilling.
function RolloutPromptModal({ open, ctx, onClose, onYes, onNo }) {
  if (!open) return null;
  const app = ctx && (window.APPS || []).find(a => a.id === ctx.appId);
  const version = app && (app.versions || []).find(v => v.id === ctx.versionId);
  return (
    <window.Modal open onClose={onClose} width={560}
      title={<>Roll out to your merchants now?</>}
      subtitle={ctx?.sourceLabel
        ? <>{ctx.sourceLabel} — choose whether to start the merchant rollout immediately, or hold for later.</>
        : <>Choose whether to roll the new version out to your merchant fleet immediately, or hold for later.</>}
      footer={
        <>
          <window.Button onClick={onNo}>No, finish later</window.Button>
          <window.Button primary icon="bolt" onClick={onYes}>Yes, manage rollout</window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {app && version && (
          <div style={{
            padding: "12px 14px",
            background: "var(--bg3)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <window.AppIcon app={app} version={version} size={40} radius={9} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {app.name}{" "}
                <span className="mono" style={{ fontWeight: 400, color: "var(--fg3)" }}>· v{version.name}</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{app.package}</div>
            </div>
          </div>
        )}
        <div style={{
          padding: "12px 14px",
          background: "var(--color-info-50, var(--bg3))",
          border: "1px solid color-mix(in oklab, var(--color-info-500, var(--accent)) 22%, transparent)",
          borderRadius: "var(--radius-md)",
          fontSize: 12.5, lineHeight: 1.6, color: "var(--color-info-700, var(--fg2))",
        }}>
          <b>Yes, configure rollout</b> opens the merchant rollout wizard: pick audience, cadence (gradual or immediate), and an install strategy.
          {" "}
          <b>No, finish later</b> returns to the version detail page; you can start a rollout anytime from there.
        </div>
      </div>
    </window.Modal>
  );
}

window.RolloutPromptModal = RolloutPromptModal;
