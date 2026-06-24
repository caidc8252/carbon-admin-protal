/* global React */
// ─────────────────────────────────────────────────────────────
// Pre-warnings — Portal host wrappers
//
// Bridges the design-canvas variants into the main Carbon portal:
//   · PreWarningsScreen        — V4 inbox + drawers (alert + rule)
//   · PreWarningsRulesScreen   — Rules list (mgmt) + drawer + open editor
//   · PreWarningsRuleEditorScreen — Rule editor (new or edit)
//
// All three navigate via the portal's setRoute (passed in as `navigate`),
// so the back-button / breadcrumbs in TopBar stay consistent with the
// rest of the app.
// ─────────────────────────────────────────────────────────────

const { useState: useStatePWH } = React;

// Shared wrapper so drawers (which are `position: absolute`) scope to
// the main-content area, not the viewport — keeps the sidebar visible
// while a drawer is open, matching the "Linear / Notion" side-panel
// pattern instead of the older full-screen modal.
function PWHostWrap({ children }) {
  return (
    <div style={{
      position: "relative", height: "100%", width: "100%",
      overflow: "hidden", background: "var(--bg1)",
    }}>{children}</div>
  );
}

// ─── 1. Inbox (V4 Rules-first) ───────────────────────────────
window.PreWarningsScreen = function PreWarningsScreen({ navigate }) {
  const [detail, setDetail] = useStatePWH(null);
  const [ruleDrawer, setRuleDrawer] = useStatePWH(null);
  const [deviceHistory, setDeviceHistory] = useStatePWH(null); // { deviceSn, ruleId }

  const openDeviceProfile = (deviceSn) => {
    setDeviceHistory(null);
    setRuleDrawer(null);
    navigate({ screen: "deviceDetail", deviceSn });
  };

  return (
    <PWHostWrap>
      <window.PW.InboxV4
        onOpenAlert={(a) => setDetail(a.id)}
        onCreateRule={() => navigate({ screen: "preWarningsRuleEditor" })}
        onOpenRuleDrawer={(ruleId) => setRuleDrawer(ruleId)}
        onOpenDeviceHistory={(sn, ruleId) => setDeviceHistory({ deviceSn: sn, ruleId })}
        onOpenDeviceProfile={openDeviceProfile} />
      {detail && (
        <window.PW.AlertDetail
          alertId={detail}
          onClose={() => setDetail(null)}
          onOpenRule={(r) => { setDetail(null); setRuleDrawer(r.id); }}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
      {ruleDrawer && (
        <window.PW.RuleDrawer
          ruleId={ruleDrawer}
          onClose={() => setRuleDrawer(null)}
          onEdit={(r) => {
            setRuleDrawer(null);
            navigate({ screen: "preWarningsRuleEditor", ruleId: r.id });
          }}
          onOpenAlert={(a) => setDetail(a.id)}
          onOpenDeviceHistory={(sn, ruleId) => setDeviceHistory({ deviceSn: sn, ruleId })}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
      {deviceHistory && (
        <window.PW.DeviceHistoryDrawer
          deviceSn={deviceHistory.deviceSn}
          ruleId={deviceHistory.ruleId}
          onClose={() => setDeviceHistory(null)}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
    </PWHostWrap>
  );
};

// ─── 2. Rules management list ────────────────────────────────
window.PreWarningsRulesScreen = function PreWarningsRulesScreen({ navigate }) {
  const [ruleDrawer, setRuleDrawer] = useStatePWH(null);
  const [detail, setDetail] = useStatePWH(null);
  const [deviceHistory, setDeviceHistory] = useStatePWH(null);

  const openDeviceProfile = (deviceSn) => {
    setDeviceHistory(null);
    setRuleDrawer(null);
    navigate({ screen: "deviceDetail", deviceSn });
  };

  return (
    <PWHostWrap>
      <window.PW.RulesList
        onCreate={() => navigate({ screen: "preWarningsRuleEditor" })}
        onView={(r) => setRuleDrawer(r.id)}
        onEdit={(r) => navigate({ screen: "preWarningsRuleEditor", ruleId: r.id })}
        onOpenInbox={() => navigate({ screen: "preWarnings" })} />
      {ruleDrawer && (
        <window.PW.RuleDrawer
          ruleId={ruleDrawer}
          onClose={() => setRuleDrawer(null)}
          onEdit={(r) => {
            setRuleDrawer(null);
            navigate({ screen: "preWarningsRuleEditor", ruleId: r.id });
          }}
          onOpenAlert={(a) => setDetail(a.id)}
          onOpenDeviceHistory={(sn, ruleId) => setDeviceHistory({ deviceSn: sn, ruleId })}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
      {detail && (
        <window.PW.AlertDetail
          alertId={detail}
          onClose={() => setDetail(null)}
          onOpenRule={(r) => { setDetail(null); setRuleDrawer(r.id); }}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
      {deviceHistory && (
        <window.PW.DeviceHistoryDrawer
          deviceSn={deviceHistory.deviceSn}
          ruleId={deviceHistory.ruleId}
          onClose={() => setDeviceHistory(null)}
          onOpenDeviceProfile={openDeviceProfile} />
      )}
    </PWHostWrap>
  );
};

// ─── 3. Rule editor (new or edit) ────────────────────────────
// `ruleId` (optional) → edit mode; otherwise new-rule mode.
window.PreWarningsRuleEditorScreen = function PreWarningsRuleEditorScreen({ navigate, ruleId }) {
  const initial = ruleId ? window.PW.findRule(ruleId) : null;
  return (
    <window.PW.RuleEditor
      initial={initial}
      onCancel={() => navigate({ screen: "preWarnings" })}
      onSave={(draft) => {
        const today = new Date().toLocaleDateString("en-US",
          { month: "short", day: "2-digit", year: "numeric" });
        const matched = window.PW.computeMatchedDevices(draft.binding);

        if (ruleId) {
          // Edit: mutate the existing rule in place so all references
          // (alerts referencing ruleId) keep pointing at it.
          const existing = window.PW.findRule(ruleId);
          if (existing) {
            Object.assign(existing, {
              name: draft.name || existing.name,
              type: draft.type,
              config: draft.config,
              binding: draft.binding,
              notify: draft.notify,
              enabled: draft.enabled !== false,
              matchedDevices: matched,
              updatedAt: today,
            });
          }
          window.dispatchEvent(new CustomEvent("pw:rules-changed",
            { detail: { kind: "edit", id: ruleId } }));
          window.showToast?.(`Updated rule "${draft.name || "—"}"`, "success");
        } else {
          // Create: generate a fresh R-NNN id (highest + 1).
          const maxNum = window.PW.RULES.reduce((m, r) => {
            const n = parseInt(String(r.id).replace(/[^0-9]/g, ""), 10);
            return Number.isFinite(n) && n > m ? n : m;
          }, 0);
          const newId = `R-${String(maxNum + 1).padStart(3, "0")}`;
          const newRule = {
            id: newId,
            name: draft.name || `Untitled rule ${newId}`,
            type: draft.type,
            config: draft.config,
            binding: draft.binding,
            notify: draft.notify,
            enabled: draft.enabled !== false,
            createdAt: today,
            createdBy: "Maya Hassan",
            matchedDevices: matched,
          };
          window.PW.RULES.push(newRule);
          window.dispatchEvent(new CustomEvent("pw:rules-changed",
            { detail: { kind: "create", id: newId, rule: newRule } }));
          window.showToast?.(`Created rule "${newRule.name}" (${newId}) · ${matched} device${matched === 1 ? "" : "s"} bound`, "success");
        }
        navigate({ screen: "preWarnings" });
      }} />
  );
};

// ─── Sidebar unread badge ────────────────────────────────────
// Called by shell.jsx on every render to compute the count shown
// next to the sidebar entry. Excludes alerts already converted to
// a ticket (they're now tracked under Tickets) and self-healed.
window.preWarningsUnreadCount = () => {
  const alerts = window.PW?.ALERTS || [];
  return alerts.filter(a => !a.read && !a.selfHealed && !a.ticketId).length;
};

// True if the active route belongs to the Pre-warnings module.
window.isPreWarningsRoute = (screen) =>
  ["preWarnings", "preWarningsRules", "preWarningsRuleEditor"].includes(screen);
