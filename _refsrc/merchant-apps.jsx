/* global React */
// ─────────────────────────────────────────────────────────────
// Merchant Apps tab — per-merchant app + version assignments.
//
// Data model (on window.MERCHANTS[*].apps):
//
//   { packageId, versionId, targetVersionId, assignedAt, flag }
//
//     · packageId       — app id from window.APPS (e.g. "pos"). Field name
//                          stays "packageId" to match the spec.
//     · versionId       — the version actually running on this merchant's
//                          terminals today. Read-only here; flips when a
//                          rollout completes (not yet wired).
//     · targetVersionId — the version the operator wants installed. Editable
//                          inline. When current and target differ, terminals
//                          will pick up the new version on their next sync.
//                          When unset, falls back to versionId.
//     · assignedAt      — when this assignment was first created.
//     · flag            — null | "version-unpublished" | "app-unsubscribed".
//
// Editing model: all edits, removals AND new assignments accumulate as a
// local DRAFT in this component. They show in the table with a coloured
// gutter + badge but do not touch window.MERCHANTS until the operator hits
// "Save changes" — that opens a summary modal listing every pending change
// before commit. "Discard" wipes the draft.
//
// Tenant scoping: assign modal picks from the active tenant's LOCAL POOL
// only (apps the tenant subscribes to OR publishes themselves). The target-
// version dropdown is also constrained to the local pool versions for that
// app.
//
// Lifecycle (per product spec — flagged but NOT removed):
//   · App unsubscribed:    relation stays, no further updates can land.
//   · Version unpublished: relation stays. New terminals can't pick up the
//                          version; existing installs run it.
//
// Both states are visually flagged; operators remove assignments manually
// from the row action.
// ─────────────────────────────────────────────────────────────

const { useState: useStateMA, useMemo: useMemoMA } = React;

function MerchantAppsTab({ merchant }) {
  window.useMerchantTick?.();
  const tenant = window.useActiveTenant ? window.useActiveTenant() : null;
  const disabled = window.isMerchantDisabled?.(merchant);

  // ─── Draft (uncommitted) state ───────────────────────────
  // edits             — packageId → new targetVersionId
  // removals          — Set<packageId> marked for deletion on save
  // additions         — assignment objects added but not yet committed
  // strategyOverrides — packageId → strategy record staged in this session
  //                     (set when Assign modal pre-selects, or via RolloutModal commit)
  const [draft, setDraft] = useStateMA({ edits: {}, removals: new Set(), additions: [], strategyOverrides: {} });
  const [assignOpen, setAssignOpen] = useStateMA(false);
  const [saveOpen, setSaveOpen] = useStateMA(false);
  const [rolloutCtx, setRolloutCtx] = useStateMA(null);
  // Inline unassign confirm — { row, app } | null.
  const [unassignCtx, setUnassignCtx] = useStateMA(null);

  // ─── Filter / expand state ───
  const [expanded,       setExpanded]       = useStateMA(new Set());
  const toggleExpand = (pkgId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId); else next.add(pkgId);
      return next;
    });
  };

  const pendingCount = Object.keys(draft.edits).length + draft.removals.size + draft.additions.length;

  // ─── Row composition: committed apps overlaid with draft state +
  // pending additions on top of the list.
  const rows = useMemoMA(() => {
    const committed = (merchant.apps || []).map(a => {
      const editTarget = draft.edits[a.packageId];
      const baselineTarget = a.targetVersionId || a.versionId;
      return {
        kind: draft.removals.has(a.packageId)
          ? "pending-remove"
          : (editTarget && editTarget !== baselineTarget)
            ? "pending-edit"
            : "committed",
        merchantId: merchant.id,
        packageId: a.packageId,
        currentVersionId: a.versionId,
        targetVersionId: editTarget || baselineTarget,
        baselineTargetVersionId: baselineTarget,
        assignedAt: a.assignedAt,
        flag: a.flag,
        // Surface a draft strategy override if one was staged this session.
        draftStrategy: draft.strategyOverrides?.[a.packageId] || null,
      };
    });
    const adds = draft.additions.map(a => ({
      kind: "pending-add",
      merchantId: merchant.id,
      packageId: a.packageId,
      currentVersionId: a.versionId,
      targetVersionId: a.versionId,
      baselineTargetVersionId: a.versionId,
      assignedAt: a.assignedAt,
      flag: null,
      draftStrategy: a.strategy || null,
    }));
    return [...adds, ...committed];
  }, [merchant.apps, draft]);

  // A merchant runs only a handful of apps — show them all, no filter / pager.

  // ─── Mutators ────────────────────────────────────────────
  const editTarget = (packageId, versionId) => {
    setDraft(d => ({ ...d, edits: { ...d.edits, [packageId]: versionId } }));
  };
  const togglePendingRemove = (packageId) => {
    setDraft(d => {
      const next = new Set(d.removals);
      if (next.has(packageId)) next.delete(packageId); else next.add(packageId);
      return { ...d, removals: next };
    });
  };
  const cancelPendingAdd = (packageId) => {
    setDraft(d => ({ ...d, additions: d.additions.filter(a => a.packageId !== packageId) }));
  };
  // Inline strategy edit — opens RolloutModal for one row only, bypassing
  // the pending-draft flow. Writes directly to MERCHANT_APP_UPGRADE_STRATEGY,
  // so the change is visible to the Deployments tab (App Store side) and
  // any other view that reads from the global store, immediately.
  const openStrategyEdit = (row) => {
    const ap = (window.APPS || []).find(a => a.id === row.packageId);
    if (!ap?.package) return;
    const versionId = row.targetVersionId || row.versionId;
    const versionObj = ap.versions?.find(v => v.id === versionId) || { id: versionId, name: versionId };
    const current = window.getMerchantStrategy?.(merchant.id, ap.package, versionId) || null;
    setRolloutCtx({
      open: true,
      title: `Edit upgrade strategy · ${ap.name}`,
      confirmLabel: "Save strategy",
      changes: [{
        kind: "strategy-change",
        merchant, app: ap,
        fromVersion: versionObj, toVersion: versionObj,
        currentStrategy: current,
      }],
      onCommit: (strategy) => {
        window.setMerchantStrategy?.(merchant.id, ap.package, versionId, strategy);
        // Broadcast so every merchant-aware view re-reads the global store.
        window.bumpMerchants?.();
        setRolloutCtx(null);
        const STRAT_LABEL = { casual: "Casual", immediate: "Immediate", custom: "Custom" };
        window.showToast?.(
          `Strategy updated · ${ap.name} → ${STRAT_LABEL[strategy.strategy] || strategy.strategy}`,
          "success");
      },
    });
  };
  const addPendingAssign = ({ app, version }) => {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    setDraft(d => ({
      ...d,
      additions: [...d.additions, {
        packageId: app.id,
        versionId: version.id,
        targetVersionId: version.id,
        assignedAt: today,
        flag: null,
      }],
    }));
    setAssignOpen(false);
  };
  const discardAll = () => {
    setDraft({ edits: {}, removals: new Set(), additions: [], strategyOverrides: {} });
  };
  // commitSave now takes the strategy picked in the RolloutModal and writes
  // it to MERCHANT_APP_UPGRADE_STRATEGY for every non-removal change. Per PRD,
  // one strategy is applied to all changes in a single commit.
  const commitSave = (strategy) => {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    let apps = (merchant.apps || []).slice();
    apps = apps.map(a => draft.edits[a.packageId] != null
      ? { ...a, targetVersionId: draft.edits[a.packageId], assignedAt: today }
      : a);
    apps = apps.filter(a => !draft.removals.has(a.packageId));
    apps = [
      ...draft.additions.map(a => ({
        packageId: a.packageId,
        versionId: a.versionId,
        targetVersionId: a.targetVersionId || a.versionId,
        assignedAt: today,
        flag: null,
      })),
      ...apps,
    ];
    // Persist strategy for each non-removal row (additions + edits).
    // NB: strategy is keyed by APP PACKAGE NAME (com.acme.pos.pro), not by
    // the internal packageId ("pos"). Look up the real package from APPS.
    if (strategy && window.setMerchantStrategy) {
      apps.forEach(a => {
        const wasAdded  = draft.additions.some(x => x.packageId === a.packageId);
        const wasEdited = draft.edits[a.packageId] != null;
        if (!wasAdded && !wasEdited) return;
        const appDef = (window.APPS || []).find(x => x.id === a.packageId);
        if (!appDef?.package) return;
        const vId = a.targetVersionId || a.versionId;
        window.setMerchantStrategy(merchant.id, appDef.package, vId, strategy);
      });
    }
    // Drop strategy records for removed (mrch, pkg, *). Same package-name fix.
    if (window.deleteMerchantStrategy) {
      draft.removals.forEach(pkgId => {
        const oldApp = (merchant.apps || []).find(a => a.packageId === pkgId);
        const appDef = (window.APPS || []).find(x => x.id === pkgId);
        if (oldApp && appDef?.package) {
          window.deleteMerchantStrategy(merchant.id, appDef.package, oldApp.targetVersionId || oldApp.versionId);
        }
      });
    }
    merchant.apps = apps;
    merchant.updatedAt = "just now";
    window.bumpMerchants?.();
    setDraft({ edits: {}, removals: new Set(), additions: [], strategyOverrides: {} });
    setSaveOpen(false);
    setRolloutCtx(null);
    window.showToast?.(`${merchant.name} · apps & strategy updated`, "success");
  };

  // ─── Already-assigned packages (for the Assign modal) ────
  // Includes committed assignments minus pending removals, plus pending
  // additions — so the modal won't let you queue the same app twice.
  const alreadyTakenIds = useMemoMA(() => {
    const s = new Set();
    (merchant.apps || []).forEach(a => { if (!draft.removals.has(a.packageId)) s.add(a.packageId); });
    draft.additions.forEach(a => s.add(a.packageId));
    return s;
  }, [merchant.apps, draft]);

  // Open the 2-step Rollout modal with the entire draft batch.
  const openSaveModal = () => {
    const allApps = window.APPS || [];
    const appOf = (pid) => allApps.find(x => x.id === pid);
    const verOf = (app, vid) => app?.versions?.find(v => v.id === vid);
    const changes = [
      ...draft.additions.map(a => {
        const ap = appOf(a.packageId);
        return {
          kind: "add", merchant, app: ap,
          fromVersion: null, toVersion: verOf(ap, a.versionId),
          currentStrategy: window.getMerchantStrategy?.(merchant.id, ap?.package, a.versionId) || null,
        };
      }),
      ...Object.entries(draft.edits).map(([pkgId, newVid]) => {
        const aRec = (merchant.apps || []).find(x => x.packageId === pkgId);
        if (!aRec) return null;
        const baseline = aRec.targetVersionId || aRec.versionId;
        if (newVid === baseline) return null;
        const ap = appOf(pkgId);
        return {
          kind: "version-change", merchant, app: ap,
          fromVersion: verOf(ap, baseline), toVersion: verOf(ap, newVid),
          currentStrategy: window.getMerchantStrategy?.(merchant.id, ap?.package, baseline) || null,
        };
      }).filter(Boolean),
      ...[...draft.removals].map(pkgId => {
        const aRec = (merchant.apps || []).find(x => x.packageId === pkgId);
        const ap = appOf(pkgId);
        return {
          kind: "remove", merchant, app: ap,
          fromVersion: aRec ? verOf(ap, aRec.targetVersionId || aRec.versionId) : null,
          toVersion: null,
          currentStrategy: aRec
            ? (window.getMerchantStrategy?.(merchant.id, ap?.package, aRec.targetVersionId || aRec.versionId) || null)
            : null,
        };
      }),
    ];
    setRolloutCtx({
      open: true,
      changes,
      title: `Save changes · ${merchant.name}`,
      confirmLabel: `Apply & save (${pendingCount})`,
    });
  };

  // Counts for the sticky bottom save bar (mirrors Deployments tab copy).
  const addCount    = draft.additions.length;
  const editCount   = Object.keys(draft.edits).length;
  const removeCount = draft.removals.size;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 16,
      maxWidth: 1280, margin: "0 auto",
      paddingBottom: pendingCount > 0 ? 80 : 0,
    }}>
      {/* Section heading + Assign button (Save/Discard moved to sticky bar) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>App assignments</h2>
          <p className="body-sm" style={{ margin: "2px 0 0", color: "var(--fg3)", fontSize: 12 }}>
            Apps and versions this merchant has been configured to run. Edit a target version, queue removals, or assign new apps — changes are staged in the table and apply on Save.
          </p>
        </div>
        <window.Button primary={pendingCount === 0} icon="plus" disabled={disabled}
          onClick={() => setAssignOpen(true)}>Assign app</window.Button>
      </div>

      {/* Empty state — when no committed AND no pending */}
      {rows.length === 0 && (
        <div style={{
          padding: "40px 24px", borderRadius: "var(--radius-lg)",
          background: "var(--bg2)", border: "1px dashed var(--border-2)",
          textAlign: "center",
        }}>
          <window.Ico name="package" size={28} style={{ color: "var(--fg3)" }} />
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 500, color: "var(--fg1)" }}>
            No apps assigned yet
          </div>
          <p className="body-sm" style={{ marginTop: 4, color: "var(--fg3)", fontSize: 12 }}>
            Pick an app from your App Store to stage an assignment for this merchant.
          </p>
          <div style={{ marginTop: 14, display: "inline-flex" }}>
            <window.Button primary icon="plus" disabled={disabled}
              onClick={() => setAssignOpen(true)}>Assign app</window.Button>
          </div>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", textAlign: "left" }}>
                  {[
                    { label: "",                  w: 30 },
                    { label: "App"                       },
                    { label: "Target version"            },
                    { label: "Upgrade strategy"          },
                    { label: "Terminals", align: "right" },
                    { label: "Assigned"                  },
                    { label: "Status"                    },
                    { label: "",                  w: 36 },
                  ].map((h, i) => (
                    <th key={i} className="overline" style={{
                      padding: "10px 14px", fontSize: 10.5,
                      borderBottom: "1px solid var(--border-1)",
                      whiteSpace: "nowrap",
                      width: h.w,
                      textAlign: h.align || "left",
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ap = (window.APPS || []).find(x => x.id === r.packageId);
                  return (
                  <AssignmentRow key={`${r.kind}:${r.packageId}`}
                    row={r} tenant={tenant} merchant={merchant} disabled={disabled}
                    isExpanded={expanded.has(r.packageId)}
                    onToggleExpand={() => toggleExpand(r.packageId)}
                    onEditTarget={(vid) => editTarget(r.packageId, vid)}
                    onTogglePendingRemove={() => togglePendingRemove(r.packageId)}
                    onCancelPendingAdd={() => cancelPendingAdd(r.packageId)}
                    onEditStrategy={() => openStrategyEdit(r)}
                    onUnassign={() => setUnassignCtx({ row: r, app: ap })}
                    onUninstall={() => {
                      // Open RolloutModal in uninstall mode so the operator
                      // picks a timing (network is hidden — see RMStepStrategy).
                      // On commit we hit the data helper and broadcast.
                      const versionId = r.targetVersionId || r.currentVersionId;
                      const versionObj = ap?.versions?.find(v => v.id === versionId)
                                       || { id: versionId, name: versionId };
                      const termCount = (merchant.terminals || []).filter(t => t?.sn).length;
                      setRolloutCtx({
                        open: true,
                        title: `Uninstall ${ap?.name || r.packageId} · ${merchant.name}`,
                        confirmLabel: `Uninstall on ${termCount} terminal${termCount === 1 ? "" : "s"}`,
                        changes: [{
                          kind: "uninstall",
                          merchant, app: ap,
                          fromVersion: versionObj, toVersion: null,
                          currentStrategy: window.getMerchantStrategy?.(merchant.id, ap?.package, versionId) || null,
                        }],
                        onCommit: (strategy) => {
                          if (tenant?.id && ap?.id) {
                            window.uninstallMerchantApp(tenant.id, ap.id, merchant.id);
                          }
                          window.bumpMerchants?.();
                          setRolloutCtx(null);
                          window.showToast?.(
                            `Uninstalling ${ap?.name || r.packageId} on ${merchant.name} · ${window.strategyLabel(strategy.strategy)} · ${window.timingLabel(strategy.timing)}`,
                            "success");
                        },
                      });
                    }} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sticky bottom save bar — appears whenever there are unsaved draft
          changes. Mirrors the Deployments tab pattern. */}
      {pendingCount > 0 && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          padding: "12px 24px",
          background: "var(--bg-surface, #fff)",
          borderTop: "1px solid var(--border-2)",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center", gap: 12,
          zIndex: "var(--z-sticky)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--color-warning-50)",
              color: "var(--color-warning-700)",
              display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600,
            }}>{pendingCount}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Unsaved changes</div>
              <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
                {[
                  addCount    > 0 && `${addCount} addition${addCount === 1 ? "" : "s"}`,
                  editCount   > 0 && `${editCount} version change${editCount === 1 ? "" : "s"}`,
                  removeCount > 0 && `${removeCount} removal${removeCount === 1 ? "" : "s"}`,
                ].filter(Boolean).join(" · ")}
                {" — review and submit to apply."}
              </div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <window.Button size="sm" variant="ghost" onClick={discardAll}>Discard</window.Button>
            <window.Button size="sm" primary icon="check" onClick={openSaveModal}>
              Save changes ({pendingCount})
            </window.Button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignOpen && (
        <AssignAppModal
          merchant={merchant}
          tenant={tenant}
          takenIds={alreadyTakenIds}
          onClose={() => setAssignOpen(false)}
          onAssign={addPendingAssign} />
      )}

      {/* Save-changes summary modal */}
      {saveOpen && (
        <SaveChangesModal
          merchant={merchant}
          draft={draft}
          onClose={() => setSaveOpen(false)}
          onConfirm={commitSave} />
      )}

      {/* 2-step Rollout Modal — strategy picker for staged app-assignment
          changes. Replaces the legacy SaveChangesModal in the primary flow. */}
      {rolloutCtx?.open && window.RolloutModal && (
        <window.RolloutModal
          open={rolloutCtx.open}
          changes={rolloutCtx.changes}
          title={rolloutCtx.title}
          confirmLabel={rolloutCtx.confirmLabel}
          initialStep={rolloutCtx.initialStep || 0}
          onClose={() => setRolloutCtx(null)}
          onConfirm={(strategy) => {
            // Per-context override (used by inline strategy-only edits);
            // otherwise the default batch commit folds the whole draft.
            if (rolloutCtx.onCommit) rolloutCtx.onCommit(strategy);
            else commitSave(strategy);
          }} />
      )}

      {/* Unassign confirm modal — soft remove. Reuses the component
          exported by screens.jsx so the copy stays in sync with the
          App Store side of the same operation. */}
      {unassignCtx && window.UnassignConfirmModal && (
        <window.UnassignConfirmModal
          merchant={merchant}
          currentVersion={unassignCtx.app?.versions?.find(v => v.id === (unassignCtx.row.targetVersionId || unassignCtx.row.currentVersionId)) || null}
          app={unassignCtx.app}
          onClose={() => setUnassignCtx(null)}
          onConfirm={() => {
            const ap = unassignCtx.app;
            if (tenant?.id && ap?.id) {
              window.unassignMerchantFromApp(tenant.id, ap.id, merchant.id);
            }
            window.bumpMerchants?.();
            setUnassignCtx(null);
            window.showToast?.(`Unassigned ${ap?.name || unassignCtx.row.packageId} from ${merchant.name}`, "success");
          }} />
      )}
    </div>
  );
}

// ─── One row in the assignments table ─────────────────────
// Mirrors the SubscribedDeployments row pattern: expand-on-click shows
// per-terminal status (On target / Behind) for that (merchant, app) pair.
function AssignmentRow({ row, tenant, merchant, disabled, isExpanded, onToggleExpand,
                        onEditTarget, onTogglePendingRemove, onCancelPendingAdd, onEditStrategy,
                        onUnassign, onUninstall }) {
  const app = (window.APPS || []).find(x => x.id === row.packageId);
  // Terminal-events modal — opened by clicking a row inside ExpandedTerminals.
  // Mirrors SubscribedDeployments' wiring so the "View events" affordance
  // works the same way from the merchant Apps tab.
  const [terminalOpen, setTerminalOpen] = React.useState(null);
  const versions = useMemoMA(() => {
    if (!app) return [];
    return window.getLocalPoolVersions
      ? window.getLocalPoolVersions(tenant?.id, app)
      : (app.versions || []);
  }, [app, tenant?.id]);
  const currentV = app?.versions?.find(v => v.id === row.currentVersionId);
  const targetV  = app?.versions?.find(v => v.id === row.targetVersionId);

  const isRemove = row.kind === "pending-remove";
  const isAdd    = row.kind === "pending-add";
  const isEdit   = row.kind === "pending-edit";

  // Row decoration: a coloured 3px gutter on the left tells the operator
  // at a glance what's pending without scanning the badge column.
  const gutter = isRemove ? "var(--error)"
              : isAdd    ? "var(--success)"
              : isEdit   ? "var(--accent)"
              : "transparent";

  const rowBg = isRemove ? "oklch(98% 0.02 25)"
             : isAdd    ? "oklch(98% 0.02 158)"
             : isEdit   ? "oklch(98% 0.02 262)"
             : "transparent";

  const strike = isRemove ? "line-through" : "none";
  const muted = isRemove ? "var(--fg3)" : "var(--fg1)";

  // Compute terminals + statuses for the expanded view. Terminals belong
  // to the merchant; the per-app status is derived from each terminal's
  // currentVersionCode vs. the row's targetVersionId. We synthesise the
  // per-terminal currentVersionCode from the sn for deterministic mock data.
  // Pending (unbound) terminals without an sn are filtered out — they don't
  // have an installed version to report against.
  const terminals = useMemoMA(() => {
    if (!app || isAdd || !merchant?.terminals) return [];
    const baseCode = targetV?.code || 0;
    return merchant.terminals
      .filter(t => t && t.sn)
      .map((t, i) => {
        let h = 0; for (const c of t.sn) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
        const r = (h + i * 17) % 100;
        const behindBy = r < 75 ? 0 : r < 95 ? 1 : 2;
        return { sn: t.sn, currentVersionCode: Math.max(0, baseCode - behindBy) };
      });
  }, [merchant?.id, app?.id, targetV?.id, isAdd]);
  const termStatuses = useMemoMA(() => terminals.map(t => ({
    t, st: window.computeTerminalStatus
      ? window.computeTerminalStatus(t, targetV)
      : { status: "installed", tone: "success", short: "—", label: "—" },
  })), [terminals, targetV?.id]);

  const strategyRecord = !isRemove && app?.package && row.merchantId
    ? (window.getMerchantStrategy?.(row.merchantId, app.package, row.targetVersionId) || null)
    : null;

  // Click row to expand (but not when clicking interactive cells).
  const handleRowClick = () => { if (!isAdd) onToggleExpand && onToggleExpand(); };

  return (
    <React.Fragment>
      <tr style={{ borderBottom: "1px solid var(--border-1)", background: rowBg,
        borderLeft: `3px solid ${gutter}`, cursor: isAdd ? "default" : "pointer" }}
        onClick={handleRowClick}>
        {/* Expand chevron */}
        <td style={{ paddingLeft: 14 }}>
          {!isAdd && (
            <window.Ico name={isExpanded ? "chevu" : "chevdown"} size={12} style={{ color: "var(--fg3)" }} />
          )}
        </td>

        {/* App column: logo + name + package, stacked */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {window.AppIcon && app
              ? <window.AppIcon app={app} size={32} />
              : <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--bg3)" }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: muted,
                textDecoration: strike, letterSpacing: "-0.005em" }}>
                {app?.name || row.packageId}
              </div>
              <div className="mono truncate" style={{ fontSize: 11, color: "var(--fg3)",
                textDecoration: strike }}>
                {app?.package || row.packageId}
              </div>
            </div>
          </div>
        </td>

        {/* Target version — editable dropdown */}
        <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
          {isRemove ? (
            <span className="mono num" style={{ fontSize: 12.5, color: "var(--fg3)", textDecoration: strike }}>
              {targetV?.name || row.targetVersionId}
            </span>
          ) : window.TargetVersionDropdown ? (
            <window.TargetVersionDropdown
              value={row.targetVersionId}
              options={versions.find(v => v.id === row.targetVersionId)
                ? versions
                : [{ id: row.targetVersionId, name: targetV?.name || row.targetVersionId, code: 0 }, ...versions]}
              latestId={versions[0]?.id}
              isDirty={isEdit}
              disabled={disabled || versions.length === 0}
              onChange={(vid) => onEditTarget(vid)} />
          ) : (
            <select
              value={row.targetVersionId}
              disabled={disabled || versions.length === 0}
              onChange={(e) => onEditTarget(e.target.value)}
              style={{
                padding: "5px 8px", borderRadius: "var(--radius-sm)",
                border: `1px solid ${isEdit ? "var(--accent)" : "var(--color-border-default)"}`,
                fontSize: 12.5, fontFamily: "var(--font-family-mono)",
                fontVariantNumeric: "tabular-nums",
                background: "var(--bg2)", color: "var(--fg1)",
                fontWeight: isEdit ? 600 : 500,
                minWidth: 100,
              }}>
              {versions.find(v => v.id === row.targetVersionId)
                ? null
                : <option value={row.targetVersionId}>{targetV?.name || row.targetVersionId}</option>}
              {versions.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
          {isEdit && currentV && (
            <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 2 }}>
              was <span className="mono">{app?.versions?.find(v => v.id === row.baselineTargetVersionId)?.name || row.baselineTargetVersionId}</span>
            </div>
          )}
        </td>

        {/* Upgrade strategy — coloured Tag. Click to edit (writes
            directly to the global store; refreshes immediately). */}
        <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
          {isRemove ? (
            <span style={{ fontSize: 12, color: "var(--fg3)", textDecoration: strike }}>—</span>
          ) : (
            window.StrategyCell
              ? <window.StrategyCell record={strategyRecord} disabled={disabled || isAdd}
                  onClick={(disabled || isAdd) ? null : onEditStrategy} />
              : <span style={{ fontSize: 12, color: "var(--fg3)" }}>{strategyRecord ? "Set" : "Not set"}</span>
          )}
        </td>

        {/* Terminals count */}
        <td style={{ padding: "12px 14px", textAlign: "right" }}>
          <span className="mono num" style={{ fontSize: 12, color: isRemove ? "var(--fg3)" : "var(--fg1)",
            textDecoration: strike }}>
            {isAdd ? "—" : terminals.length}
          </span>
        </td>

        {/* Assignment time */}
        <td style={{ padding: "12px 14px", color: "var(--fg3)", fontSize: 12,
          textDecoration: strike }}>
          {row.assignedAt || "—"}
        </td>

        {/* Status — pending badge takes precedence over the flag */}
        <td style={{ padding: "12px 14px" }}>
          {isAdd    && <PendingBadge tone="add">Pending add</PendingBadge>}
          {isEdit   && <PendingBadge tone="edit">Pending change</PendingBadge>}
          {isRemove && <PendingBadge tone="remove">Pending removal</PendingBadge>}
          {!isAdd && !isEdit && !isRemove && <AppFlagBadge flag={row.flag} />}
        </td>

        {/* Action: Remove / Undo (or for pending-add: Cancel) */}
        <td style={{ padding: "12px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
          {isAdd ? (
            <button onClick={onCancelPendingAdd} disabled={disabled}
              style={{ color: "var(--fg3)", padding: "4px 8px", fontSize: 12 }}>
              Cancel
            </button>
          ) : isRemove ? (
            <button onClick={onTogglePendingRemove}
              style={{ color: "var(--accent)", padding: "4px 8px", fontSize: 12, fontWeight: 500 }}>
              Undo
            </button>
          ) : (
            <window.RowKebabMenu
              merchantName={app?.name || row.packageId}
              terminalCount={(merchant.terminals || []).filter(t => t?.sn).length}
              onUnassign={onUnassign}
              onUninstall={onUninstall} />
          )}
        </td>
      </tr>

      {/* Expanded row — terminals split into On target / Behind groups */}
      {isExpanded && !isAdd && (
        <tr>
          <td colSpan={8} style={{ padding: "0 14px 14px 44px", background: "var(--bg3)" }}>
            {window.ExpandedTerminals && targetV ? (
              <window.ExpandedTerminals
                merchant={merchant}
                app={app}
                target={targetV}
                termStatuses={termStatuses}
                strategyRecord={strategyRecord}
                onTerminalOpen={(t) => setTerminalOpen({ merchant, terminal: t, version: targetV })} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--fg3)", padding: 12 }}>
                Terminal detail unavailable.
              </div>
            )}
            {/* Per-terminal upgrade-log panel — same modal SubscribedDeployments uses */}
            {window.TerminalEventsModal && (
              <window.TerminalEventsModal
                info={terminalOpen}
                app={app}
                onClose={() => setTerminalOpen(null)}
                onRetry={(sn) => {
                  if (terminalOpen) {
                    const tgtCode = terminalOpen.version?.code || 0;
                    terminalOpen.terminal.currentVersionCode = tgtCode;
                    window.showToast?.(`Update command sent — ${sn} → ${terminalOpen.version?.name || "target"}`, "info");
                    setTerminalOpen(null);
                  }
                }} />
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

// ─── Save summary modal ───────────────────────────────────
function SaveChangesModal({ merchant, draft, onClose, onConfirm }) {
  const allApps = window.APPS || [];
  const appOf = (pid) => allApps.find(x => x.id === pid);
  const verOf = (app, vid) => app?.versions?.find(v => v.id === vid);

  const editLines = Object.entries(draft.edits).map(([packageId, newVid]) => {
    const a = (merchant.apps || []).find(x => x.packageId === packageId);
    if (!a) return null;
    const baseline = a.targetVersionId || a.versionId;
    if (newVid === baseline) return null;
    const app = appOf(packageId);
    return {
      kind: "edit",
      key: `edit:${packageId}`,
      title: app?.name || packageId,
      detail: <>target version <span className="mono">{verOf(app, baseline)?.name || baseline}</span> → <span className="mono">{verOf(app, newVid)?.name || newVid}</span></>,
    };
  }).filter(Boolean);

  const removeLines = [...draft.removals].map(packageId => {
    const a = (merchant.apps || []).find(x => x.packageId === packageId);
    const app = appOf(packageId);
    const v = a ? verOf(app, a.targetVersionId || a.versionId) : null;
    return {
      kind: "remove",
      key: `remove:${packageId}`,
      title: app?.name || packageId,
      detail: <>remove from merchant{v ? <> · was <span className="mono">{v.name}</span></> : null}</>,
    };
  });

  const addLines = draft.additions.map(a => {
    const app = appOf(a.packageId);
    const v = verOf(app, a.versionId);
    return {
      kind: "add",
      key: `add:${a.packageId}`,
      title: app?.name || a.packageId,
      detail: <>assign at <span className="mono">{v?.name || a.versionId}</span></>,
    };
  });

  const lines = [...addLines, ...editLines, ...removeLines];

  return (
    <window.Modal open onClose={onClose} width={560}
      title={`Save ${lines.length} change${lines.length === 1 ? "" : "s"}`}
      subtitle={`Review the staged updates to ${merchant.name}'s app assignments before applying.`}
      footer={
        <>
          <window.Button onClick={onClose}>Back</window.Button>
          <window.Button primary icon="check" onClick={onConfirm}>
            Apply changes
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map(l => (
          <div key={l.key} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-1)",
            background: l.kind === "remove" ? "oklch(98% 0.02 25)"
              : l.kind === "add" ? "oklch(98% 0.02 158)"
              : "oklch(98% 0.02 262)",
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 4,
              display: "grid", placeItems: "center",
              background: l.kind === "remove" ? "var(--error)"
                : l.kind === "add" ? "var(--success)"
                : "var(--accent)",
              color: "white",
              fontSize: 11, fontWeight: 700,
            }}>
              {l.kind === "remove" ? "−" : l.kind === "add" ? "+" : "·"}
            </span>
            <div style={{ flex: 1, fontSize: 12.5 }}>
              <div style={{ fontWeight: 500 }}>{l.title}</div>
              <div style={{ color: "var(--fg3)", fontSize: 11.5, marginTop: 2 }}>{l.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </window.Modal>
  );
}

// ─── Flag + pending badges ────────────────────────────────
function AppFlagBadge({ flag }) {
  if (!flag) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "1px 8px", borderRadius: 999,
        background: "var(--success-bg, oklch(96% 0.05 158))",
        color: "var(--success, oklch(42% 0.13 158))",
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        Synced
      </span>
    );
  }
  const config = {
    "version-unpublished": {
      label: "Version unpublished",
      bg: "var(--warning-bg, oklch(96% 0.05 80))",
      fg: "var(--warning, oklch(54% 0.14 80))",
      tooltip: "Upstream publisher removed this version. Installed terminals keep using it; new terminals can no longer pick it up.",
    },
    "app-unsubscribed": {
      label: "App unsubscribed",
      bg: "var(--bg3)",
      fg: "var(--fg3)",
      tooltip: "Your tenant unsubscribed from this app. The assignment stays on file; no further updates can be delivered.",
    },
  }[flag];
  if (!config) return null;
  return (
    <span title={config.tooltip} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 8px", borderRadius: 999,
      background: config.bg, color: config.fg,
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
      textTransform: "uppercase",
      border: "1px solid var(--color-border-subtle)",
    }}>
      <window.Ico name="alert" size={10} stroke={2.5} />
      {config.label}
    </span>
  );
}

function PendingBadge({ tone, children }) {
  const palette = {
    add:    { bg: "var(--success-bg, oklch(96% 0.05 158))", fg: "var(--success, oklch(42% 0.13 158))" },
    edit:   { bg: "var(--accent-soft, oklch(94% 0.04 262))", fg: "var(--accent, oklch(40% 0.14 262))" },
    remove: { bg: "var(--error-bg, oklch(96% 0.04 25))",    fg: "var(--error, oklch(52% 0.18 25))"     },
  }[tone] || { bg: "var(--bg3)", fg: "var(--fg3)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 8px", borderRadius: 999,
      background: palette.bg, color: palette.fg,
      border: "1px solid var(--color-border-subtle)",
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
      textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {children}
    </span>
  );
}

// ─── Assign-app modal ──────────────────────────────────────
// Two-column picker: app on the left (from active tenant's local pool,
// minus apps already assigned OR pending-add), versions on the right.
// Confirm queues the pick into the parent's draft state.
function AssignAppModal({ merchant, tenant, takenIds, onClose, onAssign }) {
  const allApps = window.APPS || [];
  const [appId, setAppId] = useStateMA(null);
  const [versionId, setVersionId] = useStateMA(null);

  const localPoolApps = useMemoMA(() => {
    if (!tenant) return allApps;
    return allApps.filter(app => {
      if (app.publisherTenantId === tenant.id) return true;
      const subs = window.SUBSCRIBED_APPS?.[tenant.id] || [];
      return subs.some(s => s.appId === app.id);
    });
  }, [allApps, tenant?.id]);

  const eligibleApps = localPoolApps.filter(a => !takenIds.has(a.id));
  const pickedApp = eligibleApps.find(a => a.id === appId);
  const versions = useMemoMA(() => {
    if (!pickedApp) return [];
    return window.getLocalPoolVersions
      ? window.getLocalPoolVersions(tenant?.id, pickedApp)
      : (pickedApp.versions || []);
  }, [pickedApp, tenant?.id]);

  const pickedVersion = versions.find(v => v.id === versionId);

  return (
    <window.Modal open onClose={onClose} width={720}
      title="Assign app"
      subtitle={`Pick an app and version from your App Store. The change is staged — confirm "Save changes" to apply.`}
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="check"
            disabled={!pickedApp || !pickedVersion}
            onClick={() => onAssign({ app: pickedApp, version: pickedVersion })}>
            Stage assignment
          </window.Button>
        </>
      }>
      {eligibleApps.length === 0 && (
        <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--fg3)", fontSize: 12.5 }}>
          {localPoolApps.length === 0
            ? "Your App Store is empty. Subscribe to an app from the public pool, or publish one of your own, then come back here."
            : "All apps in your App Store are already assigned (or staged) for this merchant."}
        </div>
      )}
      {eligibleApps.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
          {/* Apps column */}
          <div style={{ border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div className="overline" style={{ padding: "8px 12px",
              fontSize: 10, background: "var(--bg3)",
              borderBottom: "1px solid var(--border-1)" }}>App ({eligibleApps.length})</div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {eligibleApps.map(a => {
                const active = a.id === appId;
                return (
                  <button key={a.id}
                    onClick={() => {
                      setAppId(a.id);
                      // Default to the highest version in the tenant's local
                      // pool — operator can still change it from the right
                      // column before staging.
                      const vs = window.getLocalPoolVersions
                        ? window.getLocalPoolVersions(tenant?.id, a)
                        : (a.versions || []);
                      setVersionId(vs[0]?.id || null);
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
                      background: active ? "var(--bg-active)" : "transparent",
                      borderBottom: "1px solid var(--border-1)",
                    }}>
                    {window.AppIcon
                      ? <window.AppIcon app={a} size={28} />
                      : <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg3)" }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                      <div className="mono truncate" style={{ fontSize: 11, color: "var(--fg3)" }}>{a.package}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Versions column */}
          <div style={{ border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div className="overline" style={{ padding: "8px 12px",
              fontSize: 10, background: "var(--bg3)",
              borderBottom: "1px solid var(--border-1)" }}>
              Version {pickedApp ? `(${versions.length})` : ""}
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {!pickedApp && (
                <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--fg3)", fontSize: 12 }}>
                  Pick an app to see its versions.
                </div>
              )}
              {pickedApp && versions.length === 0 && (
                <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--fg3)", fontSize: 12 }}>
                  No published versions in your App Store yet.
                </div>
              )}
              {pickedApp && versions.map(v => {
                const active = v.id === versionId;
                return (
                  <button key={v.id}
                    onClick={() => setVersionId(v.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "10px 12px",
                      background: active ? "var(--bg-active)" : "transparent",
                      borderBottom: "1px solid var(--border-1)",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    }}>
                    <span className="mono num" style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</span>
                    <span style={{ fontSize: 11, color: "var(--fg3)" }}>{v.publishedAt || v.uploadedAt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </window.Modal>
  );
}

Object.assign(window, {
  MerchantAppsTab,
});
