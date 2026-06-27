/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Screens: AppsList · AppDetail · VersionDetail
// ─────────────────────────────────────────────────────────────

const { useState: useStateS, useMemo: useMemoS, useEffect: useEffectS } = React;

// Android API level → human version name (TOMS devices ship 24+ only)
function androidVersionName(api) {
  const map = { 21: "5.0", 22: "5.1", 23: "6.0", 24: "7.0", 25: "7.1", 26: "8.0", 27: "8.1",
                28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15" };
  return map[api] ? `Android ${map[api]}` : `API ${api}`;
}

// ─── Reusable: device-model chip ──────────────────────────
function DeviceChip({ id, removable, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px 2px 8px", borderRadius: 4,
      background: "var(--color-bg-3)",
      border: "1px solid var(--color-border-subtle)",
      fontSize: 11, fontFamily: "var(--font-family-mono)",
      color: "var(--color-text-secondary)", letterSpacing: "0.01em",
    }}>
      {id}
      {removable && (
        <button onClick={onRemove} style={{ color: "var(--color-text-tertiary)", padding: 0, marginLeft: 1 }}>
          <window.Ico name="x" size={10} />
        </button>
      )}
    </span>
  );
}

// ─── App row icon + name ───────────────────────────────────
function AppMeta({ app, size = 36, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <window.AppIcon app={app} size={size} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }} className="truncate">{app.name}</div>
        <div className="mono truncate" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{sub || app.package}</div>
      </div>
    </div>
  );
}

// ─── Apps list screen ─────────────────────────────────────
// Split into two surfaces by `mode`:
//   mode="publish" — App Publish (ISV view). Lists apps the tenant authors.
//   mode="store"   — App Store    (ISO view). Lists apps the tenant has
//                    subscribed to from other ISVs in the public pool.
// Each mode is reached from its own sidebar entry; tenants holding both
// contracts (ISV + ISO) see both sidebar entries and use this same screen
// with different `mode` props.
function AppsListScreen({ mode = "publish", navigate, openNewApp, openPublishWizard }) {
  const tenant = window.useActiveTenant();
  return <PoolAppsList
    mode={mode}
    tenant={tenant}
    navigate={navigate}
    openNewApp={openNewApp}
    openPublishWizard={openPublishWizard} />;
}

// Build the unified pool: own apps + resolved subscriptions, each tagged
// with `kind` and the metadata the table needs.
function buildPoolItems(tenant) {
  const own = (window.APPS || [])
    .filter(a => a.publisherTenantId === tenant.id)
    .map(app => ({
      key: `own-${app.id}`,
      kind: "own",
      app,
      publisherId: app.publisherTenantId,
    }));

  const subs = ((window.SUBSCRIBED_APPS || {})[tenant.id] || [])
    .map(window.resolveSubscription)
    .filter(Boolean)
    .map(sub => ({
      key: `sub-${sub.appId}`,
      kind: "subscribed",
      app: sub.app,
      publisherId: sub.app.publisherTenantId,
      subscription: sub,
    }));

  return [...own, ...subs];
}

function PoolAppsList({ mode, tenant, navigate, openNewApp, openPublishWizard }) {
  const isPublishMode = mode === "publish";
  const isStoreMode   = mode === "store";

  const [q, setQ] = useStateS("");
  // Mode partitions the list, so no kind filter chips anymore.
  const [category, setCategory] = useStateS("all");
  const [statusFilter, setStatusFilter] = useStateS(new Set());
  const [deviceFilter, setDeviceFilter] = useStateS(new Set());
  const [advancedOpen, setAdvancedOpen] = useStateS(false);
  // Store-mode shortcut: filter by "updates available" subscriptions only.
  const [updatesOnly, setUpdatesOnly] = useStateS(false);

  const allPoolItems = buildPoolItems(tenant);
  // Pre-filter by mode so KPIs and table never mix the two kinds.
  const poolItems = useMemoS(
    () => allPoolItems.filter(it => isPublishMode ? it.kind === "own" : it.kind === "subscribed"),
    [allPoolItems, mode]);
  const cats = useMemoS(() => ["all", ...new Set(poolItems.map(it => it.app.category))], [poolItems]);

  const totals = useMemoS(() => ({
    total:      poolItems.length,
    published:  poolItems.filter(it => it.kind === "own" && it.app.status === "published").length,
    private_:   poolItems.filter(it => it.kind === "own" && (it.app.status === "private" || it.app.status === "unpublished")).length,
    subscribed: poolItems.filter(it => it.kind === "subscribed").length,
    updates:    poolItems.filter(it => it.kind === "subscribed" && it.subscription.isOutdated).length,
  }), [poolItems]);

  const filtered = useMemoS(() => poolItems.filter(it => {
    if (updatesOnly && !(it.kind === "subscribed" && it.subscription.isOutdated)) return false;
    if (category !== "all" && it.app.category !== category) return false;
    if (statusFilter.size > 0 && (it.kind !== "own" || !statusFilter.has(it.app.status))) return false;
    if (deviceFilter.size > 0 && !it.app.devices.some(d => deviceFilter.has(d))) return false;
    if (q !== "") {
      const needle = q.toLowerCase();
      const publisher = (window.TENANT_NAMES || {})[it.publisherId] || "";
      if (!`${it.app.name} ${it.app.package} ${publisher}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [poolItems, updatesOnly, category, statusFilter, deviceFilter, q]);

  const pager = window.usePaginated(filtered, 10,
    `${mode}|${updatesOnly}|${category}|${q}|${[...statusFilter].sort().join(",")}|${[...deviceFilter].sort().join(",")}`);

  const activeFilterCount =
    (statusFilter.size > 0 ? 1 : 0)
    + (deviceFilter.size > 0 ? 1 : 0)
    + (category !== "all" ? 1 : 0);
  const toggle = (set, setter, key) => {
    const next = new Set(set); if (next.has(key)) next.delete(key); else next.add(key); setter(next);
  };

  // Pulling launches the full Pull Wizard route so the operator gets the
  // multi-step flow (review → audience → cadence → options → confirm).
  const openPullWizard = (item) => {
    navigate({
      screen: "pullWizard",
      appId: item.app.id,
      versionId: item.subscription.latestVersion.id,
      from: "appStore",
    });
  };

  // ── Header ─────────────────────────────────────────────
  const openBrowsePool = () => navigate({ screen: "browsePool" });

  const titleText = isPublishMode ? "App Publish" : "App Store";
  const subtitle = isPublishMode
    ? "Publish your applications to the TOMS public pool. ISO companies can subscribe to anything you publish here and push it to their merchants."
    : "Browse and manage apps you've subscribed to from the TOMS public pool. Snapshots are fixed at the version you approved — new ISV releases require manual approval.";
  const addLabel = isPublishMode ? "New app" : "Browse pool";
  const addIcon  = isPublishMode ? "plus"    : "search";
  const handleAdd = () => isPublishMode ? openNewApp() : openBrowsePool();

  // KPI tiles split by mode. Publish-mode surfaces ISV lifecycle states;
  // Store-mode surfaces subscription freshness.
  // Pure-ISV tenants have no Self-App Store option, so their apps are
  // always either Published or Unpublished — never Private. The KPI tile
  // and the status filter pill adapt accordingly.
  const isPureISV = !tenant.contracts.includes("ISO");

  const tiles = isPublishMode ? [
    { key: "total",     label: "Total apps", value: totals.total, sub: "in your local pool",  filterTarget: "all" },
    { key: "published", label: "Published",  value: totals.published, sub: "live in public pool", tone: "success", filterStatus: "published" },
    isPureISV
      ? { key: "unpublished", label: "Unpublished", value: poolItems.filter(it => it.kind === "own" && it.app.status === "unpublished").length,
          sub: "withdrawn · re-publish anytime", filterStatus: "unpublished" }
      : { key: "private", label: "Private", value: totals.private_, sub: "local pool · not public", filterStatus: "private" },
  ] : [
    { key: "subscribed",label: "Subscribed",        value: totals.subscribed, sub: "in your store",   filterTarget: "all" },
    { key: "updates",   label: "Updates available", value: totals.updates,
      sub: totals.updates > 0 ? "needs attention" : "all caught up",
      tone: totals.updates > 0 ? "warning" : undefined,
      filterTarget: "updates" },
  ];

  const handleTileClick = (tile) => {
    if (tile.filterStatus) {
      const sameStatus = statusFilter.size === 1 && statusFilter.has(tile.filterStatus);
      if (sameStatus) {
        setStatusFilter(new Set());
      } else {
        setStatusFilter(new Set([tile.filterStatus]));
      }
      return;
    }
    if (!tile.filterTarget) return;
    if (tile.filterTarget === "all") {
      setStatusFilter(new Set());
      setUpdatesOnly(false);
      return;
    }
    if (tile.filterTarget === "updates") {
      setUpdatesOnly(v => !v);
      return;
    }
  };

  const isTileActive = (tile) => {
    if (tile.filterStatus) {
      return statusFilter.size === 1 && statusFilter.has(tile.filterStatus);
    }
    if (tile.filterTarget === "updates") return updatesOnly;
    if (tile.filterTarget === "all") return statusFilter.size === 0 && !updatesOnly;
    return false;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <window.PageHeader
        title={titleText}
        subtitle={subtitle}
        actions={
          <window.Button primary icon={addIcon} onClick={handleAdd}>{addLabel}</window.Button>
        } />

      <div style={{ flex: 1, overflow: "auto", background: "var(--bg1)" }}>
        {/* KPI strip */}
        <div style={{ padding: "var(--space-6) var(--space-6) var(--space-3)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
            {tiles.map(k => {
              const isActive = isTileActive(k);
              const isClickable = !!(k.filterTarget || k.filterStatus);
              return (
              <button key={k.key}
                onClick={() => handleTileClick(k)}
                style={{
                  padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)",
                  background: isActive ? "var(--color-primary-50)" : "var(--bg2)",
                  border: "1px solid",
                  borderColor: isActive ? "var(--color-primary-500)" : "var(--border-1)",
                  boxShadow: isActive ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "var(--shadow-1)",
                  cursor: isClickable ? "pointer" : "default",
                  textAlign: "left",
                  transition: "background var(--duration-fast) var(--easing-standard), border-color var(--duration-fast) var(--easing-standard)",
                }}
                onMouseEnter={(e) => { if (isClickable && !isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (isClickable && !isActive) e.currentTarget.style.background = "var(--bg2)"; }}>
                <div className="overline" style={{ fontSize: 10.5,
                    color: isActive ? "var(--color-primary-700)" : undefined }}>
                  {k.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                  <span className="mono num" style={{ fontSize: 24,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: "-0.02em",
                    color: isActive ? "var(--color-primary-700)"
                         : k.tone === "success" ? "var(--success)"
                         : k.tone === "warning" ? "var(--warning)"
                         : "var(--fg1)" }}>
                    {k.value}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--fg3)" }}>{k.sub}</span>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-6)", flexWrap: "wrap" }}>
          <window.Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps, packages, publishers…"
            style={{ flex: 1, minWidth: 220, maxWidth: 360 }} />
          {/* Kind filter chips removed — mode partitions the list already. */}
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <window.Button size="sm" icon="filter" ghost={!advancedOpen && activeFilterCount === 0}
              onClick={() => setAdvancedOpen(v => !v)}>
              Advanced
              {activeFilterCount > 0 && (
                <span className="mono" style={{
                  marginLeft: "var(--space-1)", padding: "0 var(--space-2)", borderRadius: 999,
                  background: "var(--color-primary-700)", color: "var(--color-text-on-primary)",
                  fontSize: 10, fontWeight: 600, lineHeight: "16px", height: 16,
                }}>{activeFilterCount}</span>
              )}
            </window.Button>
            {advancedOpen && (
              <AdvancedFilters
                category={category} categories={cats} onCategoryChange={setCategory}
                statusFilter={statusFilter} deviceFilter={deviceFilter}
                onToggleStatus={(k) => toggle(statusFilter, setStatusFilter, k)}
                onToggleDevice={(k) => toggle(deviceFilter, setDeviceFilter, k)}
                onClear={() => { setStatusFilter(new Set()); setDeviceFilter(new Set()); setCategory("all"); }}
                onClose={() => setAdvancedOpen(false)}
                isPureISV={!tenant.contracts.includes("ISO")} />
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: "var(--space-3) var(--space-6) var(--space-6)" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", textAlign: "left" }}>
                    {(isStoreMode
                      ? ["App", "Publisher", "Category", "Latest version", "Status", ""]
                      : ["App",              "Category", "Latest version", "Status", ""]
                    ).map((h, i) => (
                      <th key={i} className="overline" style={{
                        padding: "var(--space-2) var(--space-4)", fontSize: 10.5,
                        borderBottom: "1px solid var(--border-1)",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map(it => <PoolRow key={it.key} item={it} tenant={tenant} navigate={navigate} onPull={openPullWizard} showPublisher={isStoreMode} fromEntry={isPublishMode ? "appPublish" : "appStore"} />)}
                  {pager.slice.length === 0 && (
                    <tr><td colSpan={isStoreMode ? 6 : 5} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                      {poolItems.length === 0
                        ? (isPublishMode
                            ? "You haven't created any apps yet. Click “New app” above to start."
                            : "You haven't subscribed to any apps yet. Click “Browse pool” above to find apps to subscribe to.")
                        : "No apps match those filters."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <window.Pagination
              page={pager.page} pageSize={pager.pageSize} total={pager.total}
              onChange={pager.setPage} onPageSizeChange={pager.setPageSize} />
          </div>
        </div>
      </div>

      {/* AddAppDialog removed — the menu is now split by mode so we don't need
          the chooser. The action button directly opens the right flow. */}
    </div>
  );
}

// One row in the unified app pool. Renders different details based on whether
// the row is an owned app or a subscribed snapshot from another ISV.
function PoolRow({ item, tenant, navigate, onPull, showPublisher, fromEntry }) {
  const isOwn = item.kind === "own";
  const isOwnTenant = item.publisherId === tenant.id;
  const publisherName = (window.TENANT_NAMES || {})[item.publisherId] || "—";
  const onClick = () => navigate({ screen: "appDetail", appId: item.app.id, tab: "overview", from: fromEntry });

  // What goes in "Latest version" depends on whether this is your app or a
  // snapshot you pulled. For snapshots we show the version you're running and
  // hint that a newer one is available if applicable.
  let versionCell;
  if (isOwn) {
    const latest = item.app.versions[0];
    if (!latest) {
      versionCell = (
        <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
          No versions yet
        </span>
      );
    } else {
      versionCell = (
        <>
          <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{latest.name}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{latest.publishedAt || latest.uploadedAt}</div>
        </>
      );
    }
  } else {
    const { subscribedVersion, latestVersion, isOutdated } = item.subscription;
    versionCell = (
      <>
        <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{subscribedVersion.name}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {isOutdated
            ? <>v<span className="mono" style={{ color: "var(--color-warning-700)" }}>{latestVersion.name}</span> available</>
            : <>approved {item.subscription.subscribedAt}</>}
        </div>
      </>
    );
  }

  // Status pill
  let statusCell;
  if (isOwn) {
    const st = window.APP_STATUS[item.app.status];
    statusCell = <window.Pill tone={st.tone} dot>{st.label}</window.Pill>;
  } else {
    statusCell = item.subscription.isOutdated
      ? <window.Pill tone="warning" dot>Update available</window.Pill>
      : <window.Pill tone="success" dot>On latest</window.Pill>;
  }

  return (
    <tr
      onClick={onClick}
      style={{ cursor: "pointer", borderBottom: "1px solid var(--border-1)" }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <td style={{ padding: "12px 14px" }}><AppMeta app={item.app} /></td>
      {showPublisher && (
        <td style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 12.5, color: "var(--fg1)", fontWeight: 450 }}>{publisherName}</span>
        </td>
      )}
      <td style={{ padding: "12px 14px", color: "var(--fg2)" }}>{item.app.category}</td>
      <td style={{ padding: "12px" }}>{versionCell}</td>
      <td style={{ padding: "12px" }}>{statusCell}</td>
      <td style={{ padding: "12px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        {item.kind === "subscribed" && item.subscription.isOutdated
          ? <window.Button size="sm" variant="primary" icon="download" onClick={() => onPull(item)}>
              Approve <span className="mono" style={{ marginLeft: 2 }}>{item.subscription.latestVersion.name}</span>
            </window.Button>
          : <window.Ico name="chevr" size={14} style={{ color: "var(--color-text-tertiary)" }} />}
      </td>
    </tr>
  );
}

// Pull-update confirmation modal. Shown when an ISO clicks "Pull vN.N.N" in
// the unified pool table. Displays the version transition, release notes,
// scan status, and a permission diff before the user commits to the pull.
function PullVersionModal({ item, onClose, onConfirm }) {
  const open = !!item;
  if (!open) return null;
  const { app, subscription } = item;
  const cur = subscription.subscribedVersion;
  const next = subscription.latestVersion;
  const permDelta = (next.perms || 0) - (cur.perms || 0);
  const scan = next.scan || "—";
  const scanTone = scan === "clean"     ? "success"
                 : scan === "cleanish"  ? "info"
                 : scan === "dirty"     ? "warning"
                 : "neutral";
  const scanLabel = scan === "clean"     ? "Clean — no findings"
                  : scan === "cleanish"  ? "Mostly clean — low-severity findings only"
                  : scan === "dirty"     ? "Findings present — review before pulling"
                  : "No scan data";

  return (
    <window.Modal open onClose={onClose} width={620}
      title={<>Approve new version — <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{app.name}</span></>}
      subtitle="Once approved, this app's snapshot in your pool flips to the new version. Existing terminal deployments keep running the previous version until you push the update from your device fleet."
      padding={0}
      footer={
        <>
          <span style={{ marginRight: "auto", fontSize: 11.5, color: "var(--fg3)",
                         display: "inline-flex", alignItems: "center", gap: 6 }}>
            <window.Ico name="info" size={12} />
            <span>Approving does not auto-deploy to terminals — handle that from Devices.</span>
          </span>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="download" onClick={onConfirm}>
            Approve update
          </window.Button>
        </>
      }>
      {/* App + version transition */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--border-1)",
      }}>
        <window.AppIcon app={app} size={44} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg1)" }}>{app.name}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{app.package}</div>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 32px 1fr",
        alignItems: "center", gap: 8,
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--border-1)",
        background: "var(--bg2)",
      }}>
        {/* Current */}
        <div style={{
          padding: "10px 12px",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg1)",
        }}>
          <div className="overline" style={{ fontSize: 10, marginBottom: 4 }}>Current snapshot</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--fg1)" }}>{cur.name}</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>code {cur.code}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 4 }}>
            Approved {subscription.subscribedAt}
          </div>
        </div>
        <div style={{ display: "grid", placeItems: "center" }}>
          <window.Ico name="arrowR" size={18} style={{ color: "var(--accent)" }} />
        </div>
        {/* New */}
        <div style={{
          padding: "10px 12px",
          border: "1px solid var(--color-primary-500)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-primary-50)",
        }}>
          <div className="overline" style={{ fontSize: 10, marginBottom: 4, color: "var(--color-primary-700)" }}>New version</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-primary-700)" }}>{next.name}</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--color-primary-700)", opacity: 0.7 }}>code {next.code}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-primary-700)", opacity: 0.85, marginTop: 4 }}>
            Published {next.publishedAt || next.uploadedAt}
          </div>
        </div>
      </div>

      {/* Body — release notes + details */}
      <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Release notes */}
        <section>
          <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>Release notes</div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--fg2)" }}>
            {next.notes || "No release notes provided."}
          </p>
        </section>

        {/* Detail grid */}
        <section>
          <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>Version details</div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "var(--space-3) var(--space-5)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--bg2)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--radius-md)",
          }}>
            <KvCol label="Size"     value={<span className="mono">{next.size}</span>} sub={<span style={{ color: "var(--fg3)" }}>was {cur.size}</span>} />
            <KvCol label="Min Android"    value={<>{androidVersionName(next.minSdk)} <span className="mono" style={{ color: "var(--fg3)" }}>· API {next.minSdk}</span></>} />
            <KvCol label="Target Android" value={<>{androidVersionName(next.targetSdk)} <span className="mono" style={{ color: "var(--fg3)" }}>· API {next.targetSdk}</span></>} />
            <KvCol label="Permissions"
              value={<span className="mono num">{next.perms || 0}</span>}
              sub={permDelta === 0
                ? <span style={{ color: "var(--fg3)" }}>no change</span>
                : permDelta > 0
                  ? <span style={{ color: "var(--color-warning-700)" }}>+{permDelta} new — review</span>
                  : <span style={{ color: "var(--color-success-700)" }}>{permDelta} removed</span>} />
            <KvCol label="Security scan"
              value={<window.Pill tone={scanTone} dot size="sm">{scan === "—" ? "—" : scan.replace(/^\w/, c => c.toUpperCase())}</window.Pill>}
              sub={<span style={{ color: "var(--fg3)" }}>{scanLabel}</span>} />
            <KvCol label="Reach"
              value={<><span className="mono num">{next.reach || 0}</span> ISO {(next.reach || 0) === 1 ? "company" : "companies"}</>}
              sub={<span style={{ color: "var(--fg3)" }}>have approved this version</span>} />
          </div>
        </section>

        {/* Warnings */}
        {(scan === "dirty" || permDelta > 0) && (
          <section style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px",
            background: "var(--warning-bg)",
            border: "1px solid oklch(70% 0.16 70 / 0.25)",
            borderRadius: "var(--radius-md)",
          }}>
            <window.Ico name="alert" size={14} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "var(--color-warning-700)", lineHeight: 1.5 }}>
              {scan === "dirty" && <div>The publisher's security scan flagged this build. Review findings on the version detail page before deploying to terminals.</div>}
              {permDelta > 0 && <div>This version requests <b>{permDelta}</b> new permission{permDelta === 1 ? "" : "s"}. Open the version detail to inspect what's being asked.</div>}
            </div>
          </section>
        )}
      </div>
    </window.Modal>
  );
}

function KvCol({ label, value, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span className="overline" style={{ fontSize: 9.5 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--fg1)", display: "inline-flex", alignItems: "center", gap: 6 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, lineHeight: 1.4 }}>{sub}</span>}
    </div>
  );
}

// Small chooser shown to dual-contract tenants when they click "Add to pool".
function AddAppDialog({ open, onClose, onRegister, onSubscribe }) {
  const cards = [
    { id: "register",  icon: "upload",  label: "Register a new app",        body: "Upload your own APK and publish it to the pool. Available because your tenant holds an ISV contract.", onClick: onRegister },
    { id: "subscribe", icon: "download",label: "Subscribe from app pool",   body: "Browse apps other ISVs have made visible to you and subscribe to a snapshot you can deploy to terminals.", onClick: onSubscribe },
  ];
  return (
    <window.Modal open={open} onClose={onClose} width={620}
      title="Add an app to your pool"
      subtitle="Your pool can hold apps you publish yourself plus snapshots you subscribe to from other ISV publishers."
      footer={<window.Button onClick={onClose}>Cancel</window.Button>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {cards.map(c => (
          <button key={c.id} onClick={c.onClick} style={{
            padding: 16, textAlign: "left",
            background: "var(--bg2)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--easing-standard)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-primary-50)";
            e.currentTarget.style.borderColor  = "var(--color-primary-500)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg2)";
            e.currentTarget.style.borderColor = "var(--border-2)";
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "var(--radius-md)",
                background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                display: "grid", placeItems: "center",
              }}><window.Ico name={c.icon} size={14} stroke={1.7} /></div>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg1)" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.5 }}>{c.body}</div>
          </button>
        ))}
      </div>
    </window.Modal>
  );
}

// ─── Advanced-filter modal for Apps List ────────────────
// Compact device-picker: search + grouped scrollable checklist,
// with currently-selected chips at the top. Scales to 20–40+ models.
function DeviceFilterList({ deviceFilter, onToggleDevice }) {
  const [q, setQ] = useStateS("");
  const models = window.DEVICE_MODELS;

  const filteredModels = useMemoS(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(d =>
      d.id.toLowerCase().includes(needle) ||
      d.label.toLowerCase().includes(needle) ||
      d.family.toLowerCase().includes(needle));
  }, [q, models]);

  // Group by family for visual structure within the list
  const grouped = useMemoS(() => {
    const out = new Map();
    filteredModels.forEach(d => {
      if (!out.has(d.family)) out.set(d.family, []);
      out.get(d.family).push(d);
    });
    return [...out.entries()];
  }, [filteredModels]);

  const selectedItems = [...deviceFilter];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Selected chip strip — only shown when something is selected */}
      {selectedItems.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 4,
          padding: "8px 10px",
          background: "var(--color-primary-50)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-primary-200)",
        }}>
          {selectedItems.map(id => (
            <button key={id} onClick={() => onToggleDevice(id)} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 4px 2px 8px", borderRadius: 999,
              background: "var(--bg2)",
              border: "1px solid var(--color-primary-200)",
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--color-primary-700)", fontWeight: 500,
            }}>
              {id}
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                display: "grid", placeItems: "center",
                color: "var(--color-primary-700)",
              }} title="Remove"><window.Ico name="x" size={9} stroke={2.5} /></span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <window.Input
        size="sm"
        prefix={<window.Ico name="search" size={12} />}
        placeholder={`Search ${models.length} models — name, family, ID…`}
        value={q}
        onChange={(e) => setQ(e.target.value)} />

      {/* Scrollable grouped checklist */}
      <div style={{
        maxHeight: 240, overflowY: "auto",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg2)",
      }}>
        {grouped.length === 0 ? (
          <div style={{
            padding: "20px 12px", textAlign: "center",
            fontSize: 12, color: "var(--fg3)",
          }}>No models match "{q}"</div>
        ) : grouped.map(([family, items]) => (
          <div key={family}>
            <div className="overline" style={{
              position: "sticky", top: 0,
              padding: "4px 10px",
              fontSize: 10,
              background: "var(--bg3)",
              borderBottom: "1px solid var(--border-1)",
            }}>{family} family</div>
            {items.map(d => {
              const on = deviceFilter.has(d.id);
              return (
                <label key={d.id} onClick={(e) => { e.preventDefault(); onToggleDevice(d.id); }} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--border-1)",
                  cursor: "pointer",
                  background: on ? "var(--color-primary-50)" : "transparent",
                  transition: "background var(--duration-fast) var(--easing-standard)",
                }}>
                  <span style={{
                    width: 15, height: 15, flexShrink: 0,
                    borderRadius: 3,
                    border: "1.5px solid",
                    borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
                    background: on ? "var(--color-primary-500)" : "var(--bg1)",
                    display: "grid", placeItems: "center", color: "#fff",
                  }}>
                    {on && <window.Ico name="check" size={9} stroke={3} />}
                  </span>
                  <span className="mono" style={{
                    fontSize: 12, fontWeight: 500,
                    color: on ? "var(--color-primary-700)" : "var(--fg1)",
                    minWidth: 60,
                  }}>{d.id}</span>
                  <span className="truncate" style={{
                    flex: 1, fontSize: 11.5,
                    color: on ? "var(--color-primary-700)" : "var(--fg3)",
                  }}>{d.blurb}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleDevice(d.id)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvancedFilters({ category, categories, onCategoryChange, statusFilter, deviceFilter, onToggleStatus, onToggleDevice, onClear, onClose, isPureISV }) {
  const activeCount =
      statusFilter.size
    + deviceFilter.size
    + (category !== "all" ? 1 : 0);

  const FilterSection = ({ label, hint, count, children }) => (
    <section style={{
      padding: "var(--space-4) var(--space-5)",
      borderBottom: "1px solid var(--border-1)",
    }}>
      <header style={{ marginBottom: "var(--space-3)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          whiteSpace: "nowrap",
        }}>
          <h4 className="h4" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{label}</h4>
          {count > 0 && (
            <span className="mono" style={{
              fontSize: 10.5, padding: "1px 6px", borderRadius: 999,
              background: "var(--color-primary-50)", color: "var(--color-primary-700)",
              fontWeight: 500,
            }}>{count} selected</span>
          )}
        </div>
        {hint && (
          <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--fg3)" }}>{hint}</div>
        )}
      </header>
      {children}
    </section>
  );

  return (
    <window.Modal open onClose={onClose} width={560}
      title="Advanced filters"
      subtitle="Narrow the list by category, lifecycle status, or device compatibility."
      padding={0}
      footer={
        <>
          <span style={{ fontSize: 12, color: "var(--fg3)", whiteSpace: "nowrap" }}>
            {activeCount === 0 ? "No filters applied" :
             <><b className="num" style={{ color: "var(--fg2)" }}>{activeCount}</b> filter{activeCount > 1 ? "s" : ""} applied</>}
          </span>
          <div style={{ flex: 1 }} />
          <window.Button ghost onClick={onClear} disabled={activeCount === 0}>Clear all</window.Button>
          <window.Button primary onClick={onClose}>Apply</window.Button>
        </>
      }>
      {/* ── Category ───────────────────────────────────────── */}
      <FilterSection label="Category"
                     count={category !== "all" ? 1 : 0}
                     hint="Single choice">
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {categories.map(c => {
            const on = c === category;
            return (
              <button key={c} onClick={() => onCategoryChange(c)} style={{
                padding: "5px 12px",
                borderRadius: 999,
                background: on ? "var(--color-primary-50)" : "var(--bg2)",
                color: on ? "var(--color-primary-700)" : "var(--fg2)",
                border: "1px solid",
                borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
                fontSize: 12, fontWeight: on ? 500 : 400,
                textTransform: "capitalize",
                transition: "all var(--duration-fast) var(--easing-standard)",
                boxShadow: on ? "var(--shadow-1)" : "none",
              }}>{c}</button>
            );
          })}
        </div>
      </FilterSection>

      {/* ── Status ─────────────────────────────────────────── */}
      <FilterSection label="Lifecycle status" count={statusFilter.size}
                     hint="Select one or more">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
        }}>
          {/* Pure-ISV tenants never have apps in Private state (no
              Self-App Store option), so we hide the Private filter chip. */}
          {(isPureISV ? ["published", "unpublished"] : ["private", "published", "unpublished"])
            .map(k => [k, window.APP_STATUS[k]])
            .map(([k, v]) => {
              const on = statusFilter.has(k);
              return (
                <button key={k} onClick={() => onToggleStatus(k)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  background: on ? "var(--color-primary-50)" : "var(--bg2)",
                  color: on ? "var(--color-primary-700)" : "var(--fg2)",
                  border: "1px solid",
                  borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
                  fontSize: 12.5, fontWeight: on ? 500 : 400,
                  textAlign: "left",
                  transition: "all var(--duration-fast) var(--easing-standard)",
                  boxShadow: on ? "var(--shadow-1)" : "none",
                }}>
                  <span style={{
                    width: 14, height: 14, flexShrink: 0,
                    borderRadius: 3,
                    border: "1.5px solid",
                    borderColor: on ? "var(--color-primary-500)" : "var(--border-2)",
                    background: on ? "var(--color-primary-500)" : "var(--bg1)",
                    display: "grid", placeItems: "center",
                    color: "#fff",
                  }}>
                    {on && <window.Ico name="check" size={9} stroke={3} />}
                  </span>
                  <span>{v.label}</span>
                </button>
              );
            })}
        </div>
      </FilterSection>

      {/* ── Device compatibility ──────────────────────────── */}
      <FilterSection label="Compatible with device" count={deviceFilter.size}
                     hint={`${window.DEVICE_MODELS.length} models`}>
        <DeviceFilterList
          deviceFilter={deviceFilter}
          onToggleDevice={onToggleDevice} />
      </FilterSection>
    </window.Modal>
  );
}

// ─── App detail screen (tabs) ─────────────────────────────
function AppDetailScreen({ app, route, navigate, openPublishWizard, openEditApp }) {
  const tab = route.tab || "overview";
  const tenant = window.useActiveTenant();
  const publisherName = (window.TENANT_NAMES || {})[app.publisherTenantId] || app.publisherTenantId || "Unknown";
  const isOwnApp = app.publisherTenantId === tenant.id;

  // ISO subscription lookup — if the active tenant has subscribed to this
  // app from another ISV, we render the page in subscriber mode.
  const subscriptionRaw = !isOwnApp
    ? ((window.SUBSCRIBED_APPS || {})[tenant.id] || []).find(s => s.appId === app.id)
    : null;
  // Resolve subscription each render — it's a cheap lookup and stays fresh
  // when the wizard returns and the data has been mutated in place.
  const liveSubscription = subscriptionRaw ? window.resolveSubscription(subscriptionRaw) : null;

  // "Effective version" for the header — own apps show their latest, subscribed
  // apps show the snapshot the ISO is running.
  const ownLatest = app.versions.find(v => v.current) || app.versions[0];
  const headerVersion = liveSubscription ? liveSubscription.subscribedVersion : ownLatest;
  const latest = ownLatest;

  const st = window.APP_STATUS[app.status];

  // Pulling routes to the full Pull Wizard.
  const openPullWizard = (targetVersion) => {
    navigate({
      screen: "pullWizard",
      appId: app.id,
      versionId: targetVersion.id,
      from: route.from || "appStore",
    });
  };

  // Tab list — adapts to whether this is your own app or a subscription.
  // For ISV (own) view we fold Compatibility into Settings to simplify nav.
  const tabs = isOwnApp ? [
    { id: "overview",    label: "Overview" },
    { id: "versions",    label: "Versions" },
    { id: "subscribers", label: "Subscribers" },
    { id: "settings",    label: "Settings" },
  ] : [
    { id: "overview",    label: "Overview" },
    { id: "versions",    label: "Versions" },
    { id: "deployments", label: "Deployments" },
    { id: "devices",     label: "Compatibility" },
  ];
  const validTabIds = new Set(tabs.map(t => t.id));
  const effectiveTab = validTabIds.has(tab) ? tab : "overview";

  // Single publish-state pill for own apps; subscriber freshness pill
  // when viewing as ISO.
  const pillTone  = isOwnApp ? st.tone : (liveSubscription?.isOutdated ? "warning" : "success");
  const pillLabel = isOwnApp ? st.label : (liveSubscription?.isOutdated ? "Update available" : "On latest");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "var(--color-bg-2)", borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <window.AppIcon app={app} size={56} radius={12} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>{app.name}</h1>
              <window.Pill tone={pillTone} dot size="lg">{pillLabel}</window.Pill>
              <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>·</span>
              <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>{app.category}</span>
            </div>
            <div className="mono" style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-secondary)",
              display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>
                {app.package}
                <button style={{ color: "var(--color-text-tertiary)", padding: "0 4px", marginLeft: 4 }} title="Copy package name">
                  <window.Ico name="copy" size={11} />
                </button>
              </span>
              <span style={{ opacity: 0.5 }}>·</span>
              {isOwnApp ? (
                <span style={{ whiteSpace: "nowrap" }}>Latest <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{latest?.name || "—"}</span></span>
              ) : (
                <>
                  <span>Your snapshot <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{liveSubscription?.subscribedVersion.name}</span></span>
                  {liveSubscription?.isOutdated && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span style={{ color: "var(--color-warning-700)" }}>
                        v<span className="mono">{liveSubscription.latestVersion.name}</span> available
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, paddingTop: 4, flexShrink: 0 }}>
            {isOwnApp ? (
              <>
                <window.Button primary icon="upload" onClick={() => openPublishWizard(app)}>Upload new version</window.Button>
              </>
            ) : (
              <>
                <window.Button icon="x" onClick={() => window.showToast?.("Unsubscribe — coming in Phase 3.2", "info")}>Unsubscribe</window.Button>
                {liveSubscription?.isOutdated && (
                  <window.Button primary icon="download"
                    onClick={() => openPullWizard(liveSubscription.latestVersion)}>
                    Approve <span className="mono" style={{ marginLeft: 2 }}>{liveSubscription.latestVersion.name}</span>
                  </window.Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, padding: "16px 16px 0" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => navigate({ ...route, tab: t.id })} style={{
              padding: "7px 12px",
              fontSize: 12.5, fontWeight: effectiveTab === t.id ? 500 : 400,
              color: effectiveTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: "2px solid",
              borderColor: effectiveTab === t.id ? "var(--color-text-primary)" : "transparent",
              marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              {t.label}
              {t.count != null && (
                <span className="mono num" style={{
                  fontSize: 10.5, padding: "0 5px", borderRadius: 999,
                  background: effectiveTab === t.id ? "var(--accent-soft)" : "var(--bg3)",
                  color:      effectiveTab === t.id ? "var(--accent)"      : "var(--fg3)",
                  border: "1px solid",
                  borderColor: effectiveTab === t.id ? "var(--accent-soft)" : "var(--border-1)",
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 28px", background: "var(--color-bg-1)" }}>
        {effectiveTab === "overview" && (isOwnApp
          ? <AppOverview app={app} navigate={navigate} route={route} />
          : <SubscribedAppOverview app={app} subscription={liveSubscription}
              navigate={navigate}
              route={route}
              onPull={() => openPullWizard(liveSubscription.latestVersion)} />)}
        {effectiveTab === "versions"    && <AppVersions app={app} navigate={navigate} openPublishWizard={openPublishWizard}
                                                       currentSubscribedId={liveSubscription?.subscribedVersion.id}
                                                       isOwnApp={isOwnApp}
                                                       route={route}
                                                       onPullVersion={(v) => openPullWizard(v)} />}
        {effectiveTab === "subscribers" && <AppSubscribers app={app} />}
        {effectiveTab === "deployments" && <SubscribedDeployments app={app} subscription={liveSubscription} initialVersionFilter={route.filterVersionId} />}
        {effectiveTab === "devices"     && <AppDevices app={app} readOnly={!isOwnApp} />}
        {effectiveTab === "settings"    && <AppSettings app={app} />}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────
// Publisher row — surfaced inside the Overview's About card so it's part of
// the app's narrative rather than crowding the page header.
function PublisherRow({ publisherName, isOwnApp }) {
  return (
    <div style={{
      marginTop: 14, paddingTop: 12,
      borderTop: "1px dashed var(--color-border-subtle)",
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    }}>
      <window.Ico name="store" size={13} style={{ color: "var(--color-text-tertiary)" }} />
      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Published by</span>
      <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{publisherName}</span>
      {isOwnApp && (
        <span style={{
          fontSize: 11, color: "var(--color-success-700)",
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "1px 8px", borderRadius: 999,
          background: "var(--success-bg)",
          border: "1px solid oklch(58% 0.14 152 / 0.25)",
        }}>
          <window.Ico name="check" size={10} stroke={2.5} />
          your organization
        </span>
      )}
    </div>
  );
}

// ─── App publish state card (own apps only) ───────────
// Three-state model — Private → Published ⇄ Unpublished. No Admin review.
//
// Pure ISV tenants (no ISO contract) never linger in Private — the wizard
// auto-promotes their app on first version upload. ISV+ISO tenants may
// choose to keep an app Private indefinitely (internal-only deployment to
// their own merchants).
function ReviewStatusCard({ app, navigate }) {
  const tenant = window.useActiveTenant();
  const isOwnApp = app.publisherTenantId === tenant.id;
  const [activityOpen, setActivityOpen] = useStateS(false);
  const [publishOpen, setPublishOpen] = useStateS(false);
  const [unpublishOpen, setUnpublishOpen] = useStateS(false);
  if (!isOwnApp) return null;
  const rv = window.APP_STATUS[app.status];
  if (!rv) return null;
  const hasISO = tenant.contracts.includes("ISO");
  const hasVersion = (app.versions || []).length > 0;

  const activity = (app.reviewActivity || []).slice().reverse(); // newest first
  const lastEvent = activity[0];

  const onPublish   = () => setPublishOpen(true);
  const onUnpublish = () => setUnpublishOpen(true);
  const onRepublish = () => setPublishOpen(true);

  // Compact CTA per state.
  const cta = (() => {
    if (app.status === "private") {
      // Private apps belong to ISV+ISO tenants who haven't pushed to the
      // public pool yet. Pure-ISV apps shouldn't linger here, but if they
      // do (e.g. before first version upload) we still surface the action.
      return (
        <window.Button size="sm" primary icon="upload"
          disabled={!hasVersion}
          title={!hasVersion ? "Upload a version before publishing" : undefined}
          onClick={onPublish}>
          Publish to pool
        </window.Button>
      );
    }
    if (app.status === "published") {
      return <window.Button size="sm" ghost icon="alert" onClick={onUnpublish}>Unpublish</window.Button>;
    }
    if (app.status === "unpublished") {
      return <window.Button size="sm" primary icon="upload" onClick={onRepublish}>Re-publish</window.Button>;
    }
    return null;
  })();

  // Short headline for the compact card.
  const headline = (() => {
    if (app.status === "private") {
      if (!hasVersion) return hasISO
        ? "In your local pool. Upload a version to enable public listing."
        : "Upload your first version — the app will auto-publish to the public pool.";
      return hasISO
        ? "In your local pool — visible only to your organization. Push to the public pool when ready to list for ISO subscribers."
        : "Ready to publish. One click lists it in the public pool.";
    }
    if (app.status === "published")   return "Live in the public pool. ISO companies can subscribe.";
    if (app.status === "unpublished") return "Withdrawn from public pool. Existing subscribers keep their snapshot; new device pushes blocked. Re-publish anytime.";
    return rv.description;
  })();

  return (
    <>
    <window.Card title="Publish status"
      action={activity.length > 0 && (
        <button onClick={() => setActivityOpen(true)} style={{
          fontSize: 11, color: "var(--color-text-tertiary)",
          textDecoration: "underline", textUnderlineOffset: 2,
          textDecorationColor: "var(--color-border-default)",
          textDecorationStyle: "dotted",
        }}>
          {activity.length} {activity.length === 1 ? "event" : "events"}
        </button>
      )}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <window.Pill tone={rv.tone} dot size="lg">{rv.label}</window.Pill>
          {cta}
        </div>
        <div style={{
          fontSize: 11.5,
          color: app.status === "unpublished" ? "var(--color-warning-700)"
               : "var(--color-text-tertiary)",
          lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {headline}
        </div>
        {lastEvent && (
          <div style={{
            paddingTop: 8,
            borderTop: "1px dashed var(--color-border-subtle)",
            fontSize: 10.5, color: "var(--color-text-tertiary)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <window.Ico name="clock" size={10} stroke={1.8} />
            <span style={{ whiteSpace: "nowrap" }}>Last: {(REVIEW_KIND[lastEvent.kind] || REVIEW_KIND.created).label.toLowerCase()}</span>
            <span className="mono" style={{ whiteSpace: "nowrap" }}>· {lastEvent.at}</span>
          </div>
        )}
      </div>
    </window.Card>
    <PublishActivityModal app={app} activity={activity} open={activityOpen} onClose={() => setActivityOpen(false)} />
    <PublishToPoolModal app={app} open={publishOpen}
      onClose={() => setPublishOpen(false)}
      onConfirm={() => {
        setPublishOpen(false);
        const target = (window.APPS || []).find(a => a.id === app.id);
        if (target) {
          const wasUnpublished = target.status === "unpublished";
          target.status = "published";
          target.reviewActivity = [...(target.reviewActivity || []), {
            kind: wasUnpublished ? "republished" : "published",
            at: "just now", actor: "You",
            note: wasUnpublished
              ? "Re-listed in the public pool."
              : "Published to the public pool.",
          }];
          window.showToast?.(
            wasUnpublished
              ? `"${app.name}" re-published to the public pool`
              : `"${app.name}" published to the public pool · ISO companies can now subscribe`,
            "success");
        }
      }} />
    <window.ConfirmDialog
      open={unpublishOpen}
      onClose={() => setUnpublishOpen(false)}
      title={`Unpublish "${app.name}"?`}
      body={
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            padding: "10px 12px",
            background: "var(--warning-bg)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 22%, transparent)",
            borderRadius: "var(--radius-md)",
            fontSize: 12, color: "var(--color-warning-700)",
            lineHeight: 1.55,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <window.Ico name="email" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Subscribed ISO companies will receive an <b>email notification</b> that this app has been delisted.</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
            <li>Devices already running the app are <b>not affected</b> — existing installs keep working.</li>
            <li>Subscribed ISO companies <b>can't push to any new device</b> from the moment you unpublish.</li>
            <li>Subscriptions stay on the ISO's records — they can manually unsubscribe or keep them for reference.</li>
            <li>You can re-publish anytime — one click, no review.</li>
          </ul>
        </div>
      }
      confirmLabel="Unpublish from public pool"
      tone="danger"
      icon="alert"
      onConfirm={() => {
        setUnpublishOpen(false);
        const target = (window.APPS || []).find(a => a.id === app.id);
        if (target) {
          target.status = "unpublished";
          target.reviewActivity = [...(target.reviewActivity || []), {
            kind: "unpublished", at: "just now", actor: "You",
            note: "Withdrawn from public pool — subscribers notified by email.",
          }];
        }
        window.showToast?.(`"${app.name}" unpublished · subscribers notified by email`, "warning");
      }} />
    </>
  );
}

// ─── Publish-to-pool confirmation ─────────────────────────
// Surfaces the consequences of pushing an app from the local (private)
// pool into the public pool. Re-publish (after an unpublish) uses the same
// modal — copy adapts.
function PublishToPoolModal({ app, open, onClose, onConfirm }) {
  if (!open) return null;
  const isRepublish = app.status === "unpublished";
  const latest = (app.versions || []).find(v => v.current) || (app.versions || [])[0];
  return (
    <window.Modal open onClose={onClose} width={560}
      title={isRepublish ? `Re-publish "${app.name}"?` : `Publish "${app.name}" to the public pool?`}
      subtitle={isRepublish
        ? "The app will be listed again. New subscriptions become possible immediately."
        : "ISO companies in the marketplace will be able to subscribe and roll the app out to their merchants."}
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="upload" onClick={onConfirm}>
            {isRepublish ? "Re-publish" : "Publish to public pool"}
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          padding: "10px 12px",
          background: "var(--color-bg-3)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <window.AppIcon app={app} size={36} radius={8} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{app.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {app.package}{latest ? <> · <span style={{ color: "var(--color-text-secondary)" }}>{latest.name}</span> latest</> : null}
            </div>
          </div>
        </div>
        <div>
          <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>What happens next</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
            <li>The app appears in the public pool for all ISO tenants browsing the marketplace.</li>
            <li>ISO subscribers can pull any <b>published</b> version and roll it out to their merchant fleets.</li>
            <li>The app's metadata (name, category, description, screenshots) becomes publicly visible.</li>
            <li>You can unpublish at any time — subscribers get an email but existing installs keep running.</li>
          </ul>
        </div>
      </div>
    </window.Modal>
  );
}

// Full activity timeline — mounted from the compact card's "N events" link.
function PublishActivityModal({ app, activity, open, onClose }) {
  if (!open) return null;
  return (
    <window.Modal open onClose={onClose} width={580}
      title={<>Publish history — <span style={{ fontWeight: 500 }}>{app.name}</span></>}
      subtitle="Every create, upload, publish, unpublish, re-publish event for this app.">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="overline" style={{ fontSize: 10, marginBottom: 8 }}>Timeline</div>
          {activity.length === 0 ? (
            <div style={{
              padding: "20px 14px", textAlign: "center",
              fontSize: 12, color: "var(--color-text-tertiary)",
              border: "1px dashed var(--color-border-subtle)",
              borderRadius: "var(--radius-md)",
            }}>No activity yet.</div>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0 }}>
              {activity.map((a, i) => {
                const meta = REVIEW_KIND[a.kind] || REVIEW_KIND.created;
                return (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
                    paddingBottom: i < activity.length - 1 ? 12 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: meta.bg, color: meta.color,
                        display: "grid", placeItems: "center",
                        border: `1px solid ${meta.border}`,
                      }}><window.Ico name={meta.icon} size={11} stroke={2.2} /></span>
                      {i < activity.length - 1 && (
                        <span style={{ width: 1, flex: 1, marginTop: 2,
                          background: "var(--color-border-subtle)", minHeight: 18 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{meta.label}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{a.at}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>· {a.actor}</span>
                      </div>
                      {a.note && (
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>
                          {a.note}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </window.Modal>
  );
}

const REVIEW_KIND = {
  created:           { label: "App created",                  icon: "plus",    color: "var(--color-text-secondary)", bg: "var(--color-bg-3)",     border: "var(--color-border-subtle)" },
  "version-uploaded":{ label: "Version uploaded",             icon: "upload",  color: "var(--color-text-secondary)", bg: "var(--color-bg-3)",     border: "var(--color-border-subtle)" },
  published:         { label: "Published to public pool",     icon: "bolt",    color: "var(--color-success-700)",    bg: "oklch(96% 0.03 152)",   border: "color-mix(in oklab, var(--color-success-500) 28%, transparent)" },
  unpublished:       { label: "Unpublished from pool",        icon: "alert",   color: "var(--color-warning-700)",    bg: "var(--warning-bg)",     border: "color-mix(in oklab, var(--color-warning-500) 28%, transparent)" },
  republished:       { label: "Re-published to pool",         icon: "refresh", color: "var(--color-success-700)",    bg: "oklch(96% 0.03 152)",   border: "color-mix(in oklab, var(--color-success-500) 28%, transparent)" },
  rollback:          { label: "Version rolled back",          icon: "alert",   color: "var(--color-error-700)",      bg: "var(--error-bg)",       border: "color-mix(in oklab, var(--color-error-500) 28%, transparent)" },
};

function Spinner({ size = 12 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${Math.max(1.5, Math.round(size / 10))}px solid var(--color-bg-3)`,
      borderTopColor: "var(--color-primary-600)",
      animation: "spin .8s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function AppOverview({ app, navigate, route }) {
  const tenant = window.useActiveTenant();
  const publisherName = (window.TENANT_NAMES || {})[app.publisherTenantId] || "—";
  const isOwnApp = app.publisherTenantId === tenant.id;
  const latest = app.versions.find(v => v.current) || app.versions[0];
  const findings = latest && latest.scan ? window.SCAN_FINDINGS_TEMPLATES[latest.scan] : null;
  const counts = findings ? window.summariseFindings(findings) : null;
  const fromEntry = route?.from || "appPublish";

  return (
    <div className="app-overview">
      {/* LEFT — narrative content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* About — just the description; the metadata that mattered is already in the header */}
        <window.Card title="About">
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{app.description}</p>
          <PublisherRow publisherName={publisherName} isOwnApp={isOwnApp} />
        </window.Card>

        {/* Screenshots — store-page imagery, captured per version */}
        {latest && (
        <window.Card title="Screenshots"
          hint={<>from <span className="mono">{latest.name}</span> · captured at upload</>}>
          <window.Screenshots app={app} version={latest} count={4} size="md" />
        </window.Card>
        )}

      </div>

      {/* RIGHT — Compact publish status + Latest version */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Publish state lives here as a compact card — small, glanceable,
            full timeline one click away in a modal. */}
        <ReviewStatusCard app={app} navigate={navigate} />

        {latest ? (
        <window.Card title="Latest version"
          hint={<span className="mono">{latest.name}</span>}
          action={
            <window.Button size="sm" ghost iconRight="arrowR"
              onClick={() => navigate({ screen: "versionDetail", appId: app.id, versionId: latest.id, from: fromEntry })}>
              Details
            </window.Button>
          }>
          {/* Vertical KV — easier to scan in a narrow column than a 4-up grid */}
          <div style={{
            display: "flex", flexDirection: "column",
            gap: 0,
            margin: "-4px 0 0",
          }}>
            <OverviewKV label="Version"
              value={<span className="mono" style={{ fontWeight: 500 }}>{latest.name}</span>}
              sub={`code ${latest.code}`} />
            <OverviewKV label="Size" value={latest.size} />
            <OverviewKV label="Reach"
              value={<span className="mono num" style={{ fontWeight: 500 }}>{latest.reach || 0}</span>}
              sub="ISO subscribers" />
            <OverviewKV label="Android"
              value={androidVersionName(latest.targetSdk)}
              sub={`min ${androidVersionName(latest.minSdk)} · API ${latest.minSdk}–${latest.targetSdk}`} />
          </div>

          {/* Release notes */}
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px dashed var(--color-border-subtle)",
          }}>
            <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>Release notes</div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
              {latest.notes}
            </p>
          </div>

          {/* Vulnerability scan */}
          {counts && (
            <div style={{
              marginTop: 14, paddingTop: 12,
              borderTop: "1px dashed var(--color-border-subtle)",
            }}>
              <div className="overline" style={{ fontSize: 10, marginBottom: 6 }}>Vulnerability scan</div>
              <window.SeverityBar counts={counts} height={6} />
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <window.Pill key={k} tone={window.SEVERITY[k].tone} size="sm">
                    <span className="mono" style={{ marginRight: 3 }}>{v}</span> {window.SEVERITY[k].label}
                  </window.Pill>
                ))}
                {Object.values(counts).every(v => v === 0) && (
                  <window.Pill tone="success" dot size="sm">No findings</window.Pill>
                )}
              </div>
            </div>
          )}
        </window.Card>
        ) : (
          <window.Card title="No versions yet"
            hint="Upload an APK to create the first version">
            <div style={{ fontSize: 12.5, color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>
              Once you upload a signed APK, the parsed manifest, security scan results, and store screenshots will appear here.
            </div>
          </window.Card>
        )}
      </div>
    </div>
  );
}

function OverviewKV({ label, value, sub }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: 12,
      padding: "7px 0",
      borderBottom: "1px dashed var(--color-border-subtle)",
    }}>
      <div style={{
        fontSize: 11, color: "var(--color-text-tertiary)",
        textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500,
        whiteSpace: "nowrap",
      }}>{label}</div>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{value}</div>
        {sub && (
          <div className="mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase",
        letterSpacing: "0.05em", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em",
        fontFamily: mono ? "var(--font-family-mono)" : "inherit" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Vulnerability banner (used in subscribed-app overview) ──
// Surfaces high-risk and incomplete scans at the top of the page so an ISO
// can't miss them when deciding whether to deploy the snapshot.
function classifyScan(version) {
  if (!version)                      return { tier: "incomplete" };
  if (!version.scan)                 return { tier: "incomplete" };
  const findings = window.SCAN_FINDINGS_TEMPLATES[version.scan] || [];
  const counts = window.summariseFindings(findings);
  if ((counts.critical || 0) + (counts.high || 0) > 0) return { tier: "high-risk", counts, findings };
  if ((counts.medium || 0) > 0) return { tier: "moderate", counts, findings };
  return { tier: "clean", counts, findings };
}

function VulnerabilityBanner({ version, navigate, app, fromEntry }) {
  const cls = classifyScan(version);
  if (cls.tier === "clean" || cls.tier === "moderate") return null;

  const config = cls.tier === "incomplete" ? {
    bg: "var(--warning-bg)", border: "oklch(70% 0.16 70 / 0.30)", color: "var(--color-warning-700)", icon: "alert",
    title: "Security review incomplete",
    body: "This snapshot does not have a completed vulnerability scan report. Approving and deploying without scan results is risky.",
  } : {
    bg: "var(--error-bg)", border: "oklch(58% 0.20 25 / 0.30)", color: "var(--color-error-700)", icon: "alert",
    title: "Unresolved security findings",
    body: `The publisher's scan flagged ${(cls.counts.critical || 0)} critical and ${(cls.counts.high || 0)} high-severity issue${((cls.counts.critical || 0) + (cls.counts.high || 0)) === 1 ? "" : "s"}. Review the findings before deploying to terminals.`,
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px",
      borderRadius: "var(--radius-lg)",
      background: config.bg,
      border: `1px solid ${config.border}`,
      marginBottom: 16,
    }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        borderRadius: "50%", background: "oklch(100% 0 0 / 0.6)",
        display: "grid", placeItems: "center", color: config.color,
      }}><window.Ico name={config.icon} size={15} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: config.color }}>{config.title}</div>
        <div style={{ fontSize: 12, color: config.color, opacity: 0.9, marginTop: 3, lineHeight: 1.5 }}>{config.body}</div>
      </div>
      {version && cls.tier === "high-risk" && (
        <window.Button size="sm" variant="primary"
          onClick={() => navigate({ screen: "versionDetail", appId: app.id, versionId: version.id, from: fromEntry })}>
          Review findings
        </window.Button>
      )}
    </div>
  );
}

// ─── Subscribed-app overview (replaces AppOverview when viewing as an ISO) ──
function SubscribedAppOverview({ app, subscription, navigate, onPull, route }) {
  const cur = subscription?.subscribedVersion;
  const latest = subscription?.latestVersion;
  const cls = classifyScan(cur);
  const [findingsOpen, setFindingsOpen] = useStateS(false);
  const fromEntry = route?.from || "appStore";

  // Quick severity breakdown for the right-column scan card.
  const severityCounts = cls.counts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <VulnerabilityBanner version={cur} navigate={navigate} app={app} fromEntry={fromEntry} />

      <div className="app-overview">
        {/* LEFT — narrative */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <window.Card title="About">
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{app.description}</p>
            <PublisherRow publisherName={(window.TENANT_NAMES || {})[app.publisherTenantId] || "—"} isOwnApp={false} />
          </window.Card>

          <window.Card title="Screenshots"
            hint={<>from <span className="mono">{cur?.name}</span> · your current snapshot</>}>
            <window.Screenshots app={app} version={cur} count={4} size="md" />
          </window.Card>
        </div>

        {/* RIGHT — subscription state + vuln spotlight + compatibility */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Subscription card. The "Approve <version>" CTA when an update is
              available already lives in the page header — we don't repeat it
              here. The Roll out shortcut (for when the snapshot is current)
              is unique to this card, so we keep that one. */}
          <window.Card title="Subscription"
            action={!subscription?.isOutdated ? (
              <window.Button size="sm" variant="primary" icon="bolt"
                onClick={() => navigate({ screen: "pullWizard", appId: app.id, versionId: cur?.id, rolloutOnly: true, from: fromEntry })}>
                Roll out
              </window.Button>
            ) : null}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <OverviewKV label="Current snapshot"
                value={<span className="mono" style={{ fontWeight: 500 }}>{cur?.name}</span>}
                sub={`code ${cur?.code}`} />
              <OverviewKV label="Latest available"
                value={subscription?.isOutdated
                  ? <span className="mono" style={{ fontWeight: 500, color: "var(--color-warning-700)" }}>{latest.name}</span>
                  : <span className="mono" style={{ fontWeight: 500, color: "var(--color-success-700)" }}>{latest?.name}</span>}
                sub={subscription?.isOutdated ? "new — approve to update" : "you're up to date"} />
              <OverviewKV label="Approved" value={subscription?.subscribedAt || "—"} />
              <OverviewKV label="Deployed"
                value={<span className="mono num">{subscription?.deployedTerminals || 0}</span>}
                sub="terminals in your fleet" />
            </div>
          </window.Card>

          {/* Vulnerability scan card — emphasized for subscribers */}
          <window.Card title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <window.Ico name={cls.tier === "clean" ? "shieldCheck" : "shield"}
                size={14}
                style={{ color: cls.tier === "high-risk" ? "var(--error)"
                       : cls.tier === "incomplete" ? "var(--warning)"
                       : cls.tier === "moderate"   ? "var(--info)"
                       : "var(--success)" }} />
              Vulnerability scan
            </span>
          }
          action={cur && cls.findings && cls.findings.length > 0 ? (
            <window.Button size="sm" iconRight="arrowR"
              onClick={() => setFindingsOpen(true)}>
              View findings
            </window.Button>
          ) : null}>
            {cls.tier === "incomplete" ? (
              <div style={{
                padding: "10px 12px",
                background: "var(--warning-bg)",
                border: "1px solid oklch(70% 0.16 70 / 0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: 12, color: "var(--color-warning-700)",
                lineHeight: 1.5,
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <window.Ico name="alert" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  Scan has not run or has not finished. Treat this snapshot as unreviewed until a report is produced.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <window.SeverityBar counts={severityCounts} height={8} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["critical", "high", "medium", "low", "info"].map(k => {
                    const v = severityCounts[k] || 0;
                    if (v === 0) return null;
                    return (
                      <window.Pill key={k} tone={window.SEVERITY[k].tone}>
                        <span className="mono" style={{ marginRight: 3 }}>{v}</span>
                        {window.SEVERITY[k].label}
                      </window.Pill>
                    );
                  })}
                  {Object.values(severityCounts).every(v => v === 0) && (
                    <window.Pill tone="success" dot>No findings</window.Pill>
                  )}
                </div>
                {cls.tier === "high-risk" && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    background: "var(--error-bg)",
                    border: "1px solid oklch(58% 0.20 25 / 0.25)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 11.5, color: "var(--color-error-700)",
                    lineHeight: 1.5,
                  }}>
                    <b>Action required:</b> Critical/high findings present in this snapshot. Hold deployments until either the publisher releases a fixed version or your security team approves the risk.
                  </div>
                )}
              </>
            )}
          </window.Card>

          {/* Compatibility brief */}
          <window.Card title="Compatibility"
            action={
              <window.Button size="sm" ghost iconRight="arrowR"
                onClick={() => navigate({ screen: "appDetail", appId: app.id, tab: "devices", from: fromEntry })}>
                View
              </window.Button>
            }>
            <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
              Targets <span className="mono" style={{ color: "var(--color-text-secondary)" }}>{app.devices.length}</span> of {window.DEVICE_MODELS.length} TOMS device models
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {app.devices.slice(0, 5).map(d => <DeviceChip key={d} id={d} />)}
              {app.devices.length > 5 && (
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "2px 4px" }}>
                  +{app.devices.length - 5}
                </span>
              )}
            </div>
          </window.Card>
        </div>
      </div>
      <FindingsModal
        open={findingsOpen}
        onClose={() => setFindingsOpen(false)}
        app={app}
        version={cur}
        findings={cls.findings || []}
        counts={cls.counts} />
    </div>
  );
}

// ─── Deployments tab (subscriber view) ─────────────────────
// Lists every merchant that has this app installed for the active tenant,
// what version each is on, and (per-terminal) the actual install state.
function SubscribedDeployments({ app, subscription, initialVersionFilter }) {
  const tenant = window.useActiveTenant();
  const state = window.getAppDeploymentState(tenant.id, app.id);
  const latest = subscription?.latestVersion;

  const [filter, setFilter]   = useStateS("all");     // all | onLatest | behind
  const [q, setQ]             = useStateS("");
  // Seed the version filter from the incoming route param so that arriving
  // from a Version Detail "View deployment details" link lands you with the
  // dropdown already narrowed to that version.
  const [versionFilter, setVf] = useStateS(initialVersionFilter || "any");
  const [expanded, setExpanded] = useStateS(new Set());

  const totals = useMemoS(() => {
    const onLatest = state.filter(s => latest && s.version.id === latest.id).length;
    const behind   = state.length - onLatest;
    const totalTerminals = state.reduce((acc, s) => acc + s.terminals.length, 0);
    const pending = state.reduce((acc, s) => acc + s.terminals.filter(t => t.status === "pending").length, 0);
    const failed  = state.reduce((acc, s) => acc + s.terminals.filter(t => t.status === "failed").length, 0);
    return { covered: state.length, totalTerminals, onLatest, behind, pending, failed };
  }, [state, latest]);

  const versionOptions = useMemoS(() => {
    const seen = new Map();
    state.forEach(s => seen.set(s.version.id, s.version));
    return [...seen.values()].sort((a, b) => (b.code || 0) - (a.code || 0));
  }, [state]);

  const filtered = state.filter(s => {
    if (filter === "onLatest" && !(latest && s.version.id === latest.id)) return false;
    if (filter === "behind"   &&  (latest && s.version.id === latest.id)) return false;
    if (versionFilter !== "any" && s.version.id !== versionFilter) return false;
    if (q && !`${s.merchant.name} ${s.merchant.region}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const tiles = [
    { key: "covered",  label: "Merchants covered", value: totals.covered,  sub: "have this app",  filter: "all" },
    { key: "terminals",label: "Total terminals",   value: totals.totalTerminals, sub: "across covered merchants" },
    { key: "onLatest", label: "On latest",         value: totals.onLatest, sub: `running ${latest?.name || "—"}`, tone: "success", filter: "onLatest" },
    { key: "behind",   label: "Behind latest",     value: totals.behind,   sub: "older than latest", tone: totals.behind > 0 ? "warning" : undefined, filter: "behind" },
  ];

  const toggleExpand = (id) => {
    const next = new Set(expanded); next.has(id) ? next.delete(id) : next.add(id); setExpanded(next);
  };

  return (
    <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {tiles.map(t => {
          const active = t.filter && filter === t.filter && t.filter !== "all";
          const clickable = !!t.filter;
          return (
            <button key={t.key} onClick={() => clickable && setFilter(active ? "all" : t.filter)} style={{
              padding: "12px 16px", borderRadius: "var(--radius-lg)",
              background: active ? "var(--color-primary-50)" : "var(--bg2)",
              border: "1px solid",
              borderColor: active ? "var(--color-primary-500)" : "var(--border-1)",
              boxShadow: active ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "var(--shadow-1)",
              cursor: clickable ? "pointer" : "default", textAlign: "left",
            }}>
              <div className="overline" style={{ fontSize: 10.5,
                color: active ? "var(--color-primary-700)" : undefined }}>{t.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span className="mono num" style={{ fontSize: 24, fontWeight: active ? 600 : 500,
                  letterSpacing: "-0.02em",
                  color: active ? "var(--color-primary-700)"
                       : t.tone === "success" ? "var(--success)"
                       : t.tone === "warning" ? "var(--warning)"
                       : "var(--fg1)" }}>{t.value}</span>
                <span style={{ fontSize: 11, color: "var(--fg3)" }}>{t.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ width: 280 }}>
          <window.Input size="sm" prefix={<window.Ico name="search" size={12} />}
            placeholder="Search merchant or region…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={versionFilter} onChange={(e) => setVf(e.target.value)} style={{
          padding: "6px 8px", borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-2)", fontSize: 12, fontFamily: "inherit",
          background: "var(--bg2)", color: "var(--fg1)",
        }}>
          <option value="any">All versions</option>
          {versionOptions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg3)" }}>
          {filtered.length} of {state.length} merchants
        </div>
      </div>

      {/* Table */}
      <window.Card padding={0}>
        <table className="tds-table num" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Merchant</th>
              <th>Region</th>
              <th>Current version</th>
              <th style={{ textAlign: "right" }}>Terminals</th>
              <th>Last rollout</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                {state.length === 0 ? "No merchants have this app yet. Roll out a version to seed deployments." : "No merchants match those filters."}
              </td></tr>
            )}
            {filtered.map(s => {
              const isOpen = expanded.has(s.merchant.id);
              const onLatest = latest && s.version.id === latest.id;
              const installedCount = s.terminals.filter(t => t.status === "installed").length;
              const pendingCount   = s.terminals.filter(t => t.status === "pending").length;
              const failedCount    = s.terminals.filter(t => t.status === "failed").length;
              return (
                <React.Fragment key={s.merchant.id}>
                  <tr style={{ cursor: "pointer" }} onClick={() => toggleExpand(s.merchant.id)}>
                    <td style={{ paddingLeft: 14 }}>
                      <window.Ico name={isOpen ? "chevu" : "chevdown"} size={12} style={{ color: "var(--fg3)" }} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 5,
                          background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                          display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600,
                        }}>{s.merchant.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.merchant.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--fg2)" }}>{s.merchant.region}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{s.version.name}</span>
                      {!onLatest && latest && (
                        <span style={{ fontSize: 10.5, color: "var(--color-warning-700)", marginLeft: 6 }}>
                          ↑ {latest.name} available
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}><span className="mono num">{s.terminals.length}</span></td>
                    <td style={{ fontSize: 11.5, color: "var(--fg2)" }}><span className="mono">{s.lastRolloutAt}</span></td>
                    <td>
                      {onLatest
                        ? <window.Pill tone="success" dot size="sm">On latest</window.Pill>
                        : <window.Pill tone="warning" dot size="sm">Behind</window.Pill>}
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 14 }} onClick={(e) => e.stopPropagation()}>
                      {!onLatest && latest && (
                        <window.Button size="sm" variant="ghost" iconRight="chevr"
                          onClick={() => window.showToast?.("Roll out to merchant — coming in Phase 3.4", "info")}>
                          Catch up
                        </window.Button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} style={{ padding: "0 14px 12px 44px", background: "var(--bg3)" }}>
                        <div style={{ padding: "8px 0 4px", display: "flex", gap: 12, fontSize: 11.5, color: "var(--fg3)" }}>
                          <span><b className="num" style={{ color: "var(--color-success-700)" }}>{installedCount}</b> installed</span>
                          {pendingCount > 0 && <span><b className="num" style={{ color: "var(--color-info-700)" }}>{pendingCount}</b> pending</span>}
                          {failedCount > 0 && <span><b className="num" style={{ color: "var(--color-error-700)" }}>{failedCount}</b> failed</span>}
                        </div>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: 6, paddingTop: 4,
                        }}>
                          {s.terminals.map(t => (
                            <div key={t.sn} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 10px",
                              background: "var(--bg2)",
                              border: "1px solid var(--border-1)",
                              borderRadius: "var(--radius-sm)",
                            }}>
                              <span style={{
                                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                                background: t.status === "installed" ? "var(--success)"
                                          : t.status === "pending"   ? "var(--info)"
                                                                     : "var(--error)",
                              }} />
                              <span className="mono" style={{ fontSize: 11, fontWeight: 500, flex: 1 }}>{t.sn}</span>
                              <span style={{
                                fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em",
                                color: t.status === "installed" ? "var(--color-success-700)"
                                     : t.status === "pending"   ? "var(--color-info-700)"
                                                                : "var(--color-error-700)",
                              }}>{t.status}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </window.Card>
    </div>
  );
}

// ─── Versions tab ────────────────────────────────────────
function AppVersions({ app, navigate, openPublishWizard, currentSubscribedId, isOwnApp, onPullVersion, route }) {
  const tenant = window.useActiveTenant();
  const versionsPager = window.usePaginated(app.versions, 5, app.id);
  const fromEntry = route?.from || (isOwnApp ? "appPublish" : "appStore");
  // Bump to force re-render after a rejection state change.
  const [rejTick, setRejTick] = useStateS(0);
  const [blockTarget, setBlockTarget] = useStateS(null);

  const rejectVersion = (v, state) => {
    if (state === "blocked") {
      setBlockTarget(v);
      return;
    }
    window.setRejectionState(tenant.id, app.id, v.id, state);
    setRejTick(t => t + 1);
  };
  const confirmBlock = () => {
    if (!blockTarget) return;
    window.setRejectionState(tenant.id, app.id, blockTarget.id, "blocked");
    setRejTick(t => t + 1);
    setBlockTarget(null);
  };
  return (
    <div>
      {app.versions.length === 0 ? (
        <window.Card title="Version history" hint="0 versions">
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--color-bg-3)", color: "var(--color-text-tertiary)",
              display: "grid", placeItems: "center",
              border: "1px solid var(--color-border-subtle)",
            }}>
              <window.Ico name="upload" size={20} stroke={1.5} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>No versions uploaded yet</div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", maxWidth: 360 }}>
                Upload a signed APK to create the first version of <b>{app.name}</b>. Your APK gets a security scan, and then it becomes available in your app pool.
              </div>
            </div>
            {isOwnApp && (
              <window.Button primary icon="upload" onClick={() => openPublishWizard(app)}>
                Upload first version
              </window.Button>
            )}
          </div>
        </window.Card>
      ) : (
      <window.Card title="Version history" hint={`${app.versions.length} versions`}
        padding={0}>
        <div className="table-wrap">
        {/* Visibility column only makes sense for apps in (or once in)
            the public pool. Self-App-Store apps don't have an ISO
            visibility dimension at all. */}
        {(() => null)()}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              {(app.status !== "private"
                  ? ["Version", "Code", "Size", "Uploaded", "Published", "Visibility", "Reach", "Scan", "Status", ""]
                  : ["Version", "Code", "Size", "Uploaded", "Published", "Reach", "Scan", "Status", ""]
                ).map((h, i) => (
                <th key={i} style={{
                  padding: "8px 12px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-tertiary)", textTransform: "uppercase",
                  letterSpacing: "0.05em", borderBottom: "1px solid var(--color-border-subtle)",
                  whiteSpace: "nowrap", background: "var(--color-bg-3)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {versionsPager.slice.map(v => {
              const vst = window.VERSION_STATUS[v.status] || window.APP_STATUS[v.status];
              const findings = v.scan ? window.SCAN_FINDINGS_TEMPLATES[v.scan] : null;
              const counts = findings ? window.summariseFindings(findings) : null;
              const isYourSnapshot = !isOwnApp && currentSubscribedId === v.id;
              const rejection = !isOwnApp ? window.getRejectionState(tenant.id, app.id, v.id) : null;
              const isBlocked = rejection === "blocked";
              const isSkipped = rejection === "skipped";
              const canPullThis = !isOwnApp && !isYourSnapshot && v.status === "published" && !isBlocked && !isSkipped;
              return (
                <tr key={v.id}
                  onClick={() => navigate({ screen: "versionDetail", appId: app.id, versionId: v.id, from: fromEntry })}
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    background: isYourSnapshot ? "var(--color-primary-50)"
                              : isBlocked      ? "var(--bg3)"
                              : undefined,
                    borderLeft: isYourSnapshot ? "3px solid var(--color-primary-500)" : "3px solid transparent",
                    opacity: isBlocked ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isYourSnapshot && !isBlocked) e.currentTarget.style.background = "var(--color-bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isYourSnapshot && !isBlocked) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{v.name}</span>
                      {isYourSnapshot && <window.Pill tone="accent" size="sm">Your snapshot</window.Pill>}
                      {isOwnApp && v.current && <window.Pill tone="accent" size="sm">Current</window.Pill>}
                      {isBlocked && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 10.5, padding: "1px 6px", borderRadius: 999,
                          background: "var(--bg3)", color: "var(--fg2)",
                          border: "1px solid var(--border-2)", fontWeight: 500,
                        }}>
                          <window.Ico name="lock" size={9} stroke={2.4} /> Blocked
                        </span>
                      )}
                      {isSkipped && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 10.5, padding: "1px 6px", borderRadius: 999,
                          background: "var(--bg3)", color: "var(--fg3)",
                          border: "1px solid var(--border-1)", fontWeight: 500,
                        }}>Skipped</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontFamily: "var(--font-family-mono)", color: "var(--color-text-tertiary)" }}>{v.code}</td>
                  <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{v.size}</td>
                  <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{v.uploadedAt}</td>
                  <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{v.publishedAt || <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}</td>
                  {app.status !== "private" && (
                    <td style={{ padding: "12px" }}>
                      {(() => {
                        // Versions uploaded through the wizard carry an
                        // explicit `visibility` field. Older seed versions
                        // default to "all" (listed in the public pool).
                        const vis = v.visibility || "all";
                        if (vis === "invite") {
                          return (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 11, fontWeight: 500,
                              padding: "2px 7px", borderRadius: 999,
                              background: "var(--color-warning-50)",
                              color: "var(--color-warning-700)",
                              border: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
                              whiteSpace: "nowrap",
                            }}>
                              <window.Ico name="send" size={10} /> Invite-only
                            </span>
                          );
                        }
                        return (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11, fontWeight: 500,
                            padding: "2px 7px", borderRadius: 999,
                            background: "var(--color-info-50)",
                            color: "var(--color-info-700)",
                            border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
                            whiteSpace: "nowrap",
                          }}>
                            <window.Ico name="users" size={10} /> All ISOs
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  <td style={{ padding: "12px" }}>
                    <span className="mono" style={{ fontWeight: 500 }}>{v.reach || 0}</span>
                  </td>
                  <td style={{ padding: "12px", minWidth: 140 }}>
                    {counts ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 60 }}><window.SeverityBar counts={counts} height={5} /></div>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {counts.critical + counts.high > 0 && (
                            <span style={{ color: "var(--color-error-500)", fontWeight: 500 }}>{counts.critical + counts.high} high+ </span>
                          )}
                          <span className="mono">{Object.values(counts).reduce((a, b) => a + b, 0)}</span> total
                        </span>
                      </div>
                    ) : <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {isOwnApp
                      ? <window.Pill tone={vst.tone} dot>{vst.label}</window.Pill>
                      : isYourSnapshot ? <window.Pill tone="accent"  dot>Subscribed</window.Pill>
                      : isBlocked      ? <window.Pill tone="neutral" dot>Blocked</window.Pill>
                      : isSkipped      ? <window.Pill tone="neutral" dot>Skipped</window.Pill>
                      : canPullThis    ? <window.Pill tone="success" dot>Available</window.Pill>
                                       : <window.Pill tone="neutral" dot>Unavailable</window.Pill>}
                  </td>
                  <td style={{ padding: "12px", color: "var(--color-text-tertiary)", textAlign: "right" }}
                      onClick={(e) => { if (!isOwnApp) e.stopPropagation(); }}>
                    {isOwnApp ? (
                      <window.Ico name="chevr" size={14} />
                    ) : isBlocked ? (
                      <window.Button size="sm"
                        onClick={() => rejectVersion(v, null)}>
                        Unblock
                      </window.Button>
                    ) : isSkipped ? (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <window.Button size="sm"
                          onClick={() => rejectVersion(v, null)}>
                          Re-consider
                        </window.Button>
                        <window.Button size="sm" ghost icon="lock"
                          onClick={() => rejectVersion(v, "blocked")} title="Block" />
                      </div>
                    ) : canPullThis ? (
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <window.Button size="sm" variant="primary" icon="download"
                          onClick={() => onPullVersion && onPullVersion(v)}>
                          Approve <span className="mono" style={{ marginLeft: 2 }}>{v.name}</span>
                        </window.Button>
                        <button title="Skip this version"
                          onClick={() => rejectVersion(v, "skipped")}
                          style={{ padding: 6, color: "var(--fg3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                          <window.Ico name="arrowR" size={13} />
                        </button>
                        <button title="Block this version"
                          onClick={() => rejectVersion(v, "blocked")}
                          style={{ padding: 6, color: "var(--fg3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                          <window.Ico name="lock" size={13} />
                        </button>
                      </div>
                    ) : (
                      <window.Ico name="chevr" size={14} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <window.Pagination
          page={versionsPager.page}
          pageSize={versionsPager.pageSize}
          total={versionsPager.total}
          onChange={versionsPager.setPage}
          onPageSizeChange={versionsPager.setPageSize}
          pageSizes={[5, 10, 20]}
        />
      </window.Card>
      )}
      <window.ConfirmDialog
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        title={blockTarget ? `Block ${blockTarget.name}?` : "Block version?"}
        body="This version will be hidden from update candidates until you explicitly unblock it."
        confirmLabel="Block version"
        tone="danger"
        icon="lock"
        onConfirm={confirmBlock} />
    </div>
  );
}

// ─── Subscribers tab — ISO companies that subscribed to this app.
// Subscribing = the ISO imports a snapshot of the app into its own pool.
function AppSubscribers({ app }) {
  const tenant = window.useActiveTenant();
  // Pure ISV publishers shouldn't see ISO downstream metrics — that's
  // sensitive business info about other companies' fleets.
  const showDownstreamCounts = tenant.contracts.includes("ISO");
  const isos = app.subscriberIds.map(id => window.ISO_COMPANIES.find(c => c.id === id)).filter(Boolean);
  const totalMerchants = isos.reduce((s, c) => s + (c.merchants || 0), 0);
  const totalTerminals = isos.reduce((s, c) => s + (c.terminals || 0), 0);

  // Filter state — name search + specific-version filter.
  const [q, setQ] = useStateS("");
  const [versionFilter, setVersionFilter] = useStateS("any");

  // Deterministic per-(iso, app) state: which version each ISO is on, and
  // their lifecycle status with this app. Same seed every render, so the
  // demo data is stable. In production this would join SUBSCRIBED_APPS.
  const publishedVersions = useMemoS(
    () => (app.versions || []).filter(v => v.status === "published"),
    [app.versions]);
  const latestPublished = publishedVersions[0] || null;

  const subscriberRow = (iso) => {
    const seed = (iso.id + ":" + app.id).split("").reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) & 0x7fffffff, 0);
    const r = seed % 10;
    if (r >= 9) {
      // Unsubscribed — no current version.
      return { status: { tone: "neutral", label: "Unsubscribed" }, version: null };
    }
    if (r >= 7) {
      // Pending approval — they're behind, on an older version (if exists)
      const olderVersions = publishedVersions.slice(1);
      const fallback = olderVersions[seed % Math.max(1, olderVersions.length)] || latestPublished;
      return { status: { tone: "warning", label: "Pending approval" }, version: fallback };
    }
    // Up to date — on the latest published version.
    return { status: { tone: "success", label: "Up to date" }, version: latestPublished };
  };

  const rows = useMemoS(() => isos.map(iso => ({ iso, ...subscriberRow(iso) })), [isos, publishedVersions]);

  const filtered = useMemoS(() => rows.filter(r => {
    if (versionFilter === "any") { /* keep */ }
    else if (versionFilter === "none") { if (r.version !== null) return false; }
    else { if (!r.version || r.version.id !== versionFilter) return false; }
    if (q && !`${r.iso.name} ${r.iso.region}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, versionFilter]);

  const subsPager = window.usePaginated(filtered, 10,
    `${app.id}|${q}|${versionFilter}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "ISO subscribers",      value: isos.length,                  sub: `of ${window.ISO_COMPANIES.length} ISOs with access` },
          { label: "Downstream merchants",value: totalMerchants.toLocaleString(), sub: "served by these ISOs" },
          { label: "Downstream terminals",value: totalTerminals.toLocaleString(), sub: "managed by these ISOs",     tone: "success" },
        ].map((k, i) => (
          <div key={i} style={{
            padding: "12px 16px", borderRadius: 8,
            background: "var(--color-bg-2)", border: "1px solid var(--color-border-subtle)",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase",
              letterSpacing: "0.05em", fontWeight: 500 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 4,
              color: k.tone === "success" ? "var(--color-success-500)" : "var(--color-text-primary)" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <window.Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ISO name or region…"
          prefix={<window.Ico name="search" size={12} />}
          style={{ flex: 1, minWidth: 220, maxWidth: 360 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="overline" style={{ fontSize: 10 }}>Version</span>
          <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} style={{
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-default)", fontSize: 12,
            fontFamily: "inherit",
            background: "var(--color-bg-2)", color: "var(--color-text-primary)",
          }}>
            <option value="any">All versions</option>
            {publishedVersions.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value="none">Unsubscribed</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
          {filtered.length} of {rows.length} ISO {rows.length === 1 ? "company" : "companies"}
        </div>
      </div>

      <window.Card title="Subscribers" hint={`${isos.length} ISO companies`} padding={0}>
        <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["ISO company", "Region", "Current version", "Subscribed", "Status"].map((h, i) => (
                <th key={i} style={{
                  padding: "8px 12px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-tertiary)", textTransform: "uppercase",
                  letterSpacing: "0.05em", borderBottom: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-3)", textAlign: "left",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subsPager.slice.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-tertiary)" }}>
                No ISOs match the current filters.
              </td></tr>
            )}
            {subsPager.slice.map((row, i) => {
              const { iso: c, status, version } = row;
              const isBehind = version && latestPublished && version.id !== latestPublished.id;
              return (
              <tr key={c.id} style={{ borderBottom: i < subsPager.slice.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5,
                      background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                      display: "grid", placeItems: "center",
                      fontSize: 10.5, fontWeight: 600 }}>
                      {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                    <span style={{
                      fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
                      background: "oklch(94% 0.03 152)", color: "var(--color-success-700)",
                      fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.04em",
                    }}>ISO</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{c.region}</td>
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                  {version ? (
                    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 500,
                        color: isBehind ? "var(--color-warning-700)" : "var(--color-text-primary)" }}>
                        {version.name}
                      </span>
                      {isBehind && latestPublished && (
                        <span style={{ fontSize: 10.5, color: "var(--color-warning-700)" }}>
                          ↑ <span className="mono">{latestPublished.name}</span> available
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>Jan 2025</td>
                <td style={{ padding: "10px 12px" }}>
                  <window.Pill tone={status.tone} dot size="sm">{status.label}</window.Pill>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <window.Pagination
          page={subsPager.page}
          pageSize={subsPager.pageSize}
          total={subsPager.total}
          onChange={subsPager.setPage}
          onPageSizeChange={subsPager.setPageSize}
        />
      </window.Card>
    </div>
  );
}

// ─── Devices/compatibility tab ────────────────────────────
// `readOnly` is set when the active tenant is viewing a subscribed app (ISO
// view) — in that case the device list is informational, not editable.
function AppDevices({ app, readOnly }) {
  const [selected, setSelected] = useStateS(new Set(app.devices));
  const toggle = (id) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <window.Card title="Compatible device models"
        hint={readOnly
          ? "Device models this app supports. Ask the publisher for changes."
          : "Choose which TOMS devices this app supports. ISOs importing this app can only deploy it on these models."}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {window.DEVICE_MODELS.map(d => {
            const on = selected.has(d.id);
            return (
              <button key={d.id} onClick={() => toggle(d.id)}
                disabled={readOnly}
                style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                background: on ? "var(--color-primary-50)" : "var(--color-bg-2)",
                border: "1px solid",
                borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
                borderRadius: 8, textAlign: "left",
                boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
                transition: "all .12s",
                cursor: readOnly ? "default" : "pointer",
                opacity: readOnly && !on ? 0.6 : 1,
              }}>
                <div style={{
                  width: 38, height: 50, borderRadius: 4,
                  background: on ? "var(--color-primary-700)" : "var(--color-bg-3)",
                  border: "1px solid",
                  borderColor: on ? "transparent" : "var(--color-border-default)",
                  display: "grid", placeItems: "center",
                  color: on ? "var(--color-text-on-primary)" : "var(--color-text-tertiary)",
                }}>
                  <window.Ico name="device" size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{d.id}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 1 }}>{d.blurb}</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: on ? "var(--color-primary-600)" : "var(--color-bg-2)",
                  border: "1px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--color-border-default)",
                  display: "grid", placeItems: "center",
                  color: "white", flexShrink: 0,
                }}>
                  {on && <window.Ico name="check" size={11} stroke={2.5} />}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--color-border-subtle)",
          display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--color-text-tertiary)" }}>
          <window.Ico name="info" size={13} />
          <span><span className="mono" style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{selected.size}</span> of {window.DEVICE_MODELS.length} models supported.
            {!readOnly && " Existing installs on unsupported models will keep the previous version."}</span>
          {!readOnly && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <window.Button size="sm" ghost onClick={() => setSelected(new Set(app.devices))}>Revert</window.Button>
              <window.Button size="sm" primary>Save changes</window.Button>
            </div>
          )}
        </div>
      </window.Card>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────
// Consolidated tab — Basic info, Audience (public vs internal), Supported
// orientations, Compatibility (device models), and a Danger zone.
// Compatibility used to be a separate top-level tab; folded in here to keep
// navigation tight.
function AppSettings({ app }) {
  const tenant = window.useActiveTenant();
  const isPublished = app.status === "published";

  // Controlled form state. Mirrors `app` on mount and on app change, then
  // diverges as the user edits. The footer compares against `app` to detect
  // unsaved changes.
  const [name, setName]               = useStateS(app.name);
  const [category, setCategory]       = useStateS(app.category);
  const [description, setDescription] = useStateS(app.description);
  const [orientations, setOrientations] = useStateS(new Set(app.orientations || ["portrait"]));
  const [devices, setDevices]         = useStateS(new Set(app.devices));

  // Reset when navigating between apps without remounting the component.
  useEffectS(() => {
    setName(app.name);
    setCategory(app.category);
    setDescription(app.description);
    setOrientations(new Set(app.orientations || ["portrait"]));
    setDevices(new Set(app.devices));
  }, [app.id]);

  const toggleOrientation = (id) => {
    const next = new Set(orientations);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else next.add(id);
    setOrientations(next);
  };

  const toggleDevice = (id) => {
    const next = new Set(devices);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDevices(next);
  };

  // What changed since we mounted? Drives the sticky save bar.
  const setsEqual = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  const metaChanged   = name !== app.name || category !== app.category || description !== app.description;
  const oriChanged    = !setsEqual(orientations, new Set(app.orientations || ["portrait"]));
  const devChanged    = !setsEqual(devices, new Set(app.devices));
  const dirty = metaChanged || oriChanged || devChanged;

  // Editing metadata no longer triggers Admin review — saves apply directly.
  // We still warn that public-pool listings update visible copy in the
  // marketplace, so subscribers see the new copy next render.
  const willReview = false;

  const onDiscard = () => {
    setName(app.name);
    setCategory(app.category);
    setDescription(app.description);
    setOrientations(new Set(app.orientations || ["portrait"]));
    setDevices(new Set(app.devices));
  };

  const onSave = () => {
    // In production this would persist. Demo: mutate window.APPS so the
    // header / overview reflect changes on next render, then toast.
    const target = (window.APPS || []).find(a => a.id === app.id);
    if (target) {
      target.name = name;
      target.category = category;
      target.description = description;
      target.orientations = [...orientations];
      target.devices = [...devices];
    }
    window.showToast?.(`"${name}" saved`, "success");
  };

  return (
    <div className="page-content page-content--narrow" style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: dirty ? 76 : 0 }}>

      {/* Public-pool visibility note — only relevant when the app is live. */}
      {isPublished && (
        <div style={{
          padding: "10px 14px",
          background: "var(--color-info-50)",
          border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "flex-start", gap: 10,
          fontSize: 12, color: "var(--color-info-700)",
        }}>
          <window.Ico name="info" size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            <b>Heads up.</b> This app is live in the public pool. Changes to <b>name</b>, <b>category</b>, <b>description</b> or screenshots become visible to ISO subscribers as soon as you save.
          </span>
        </div>
      )}

      <window.Card title="Basic information">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <window.Field label="App name" required>
            <window.Input value={name} onChange={(e) => setName(e.target.value)} />
          </window.Field>
          <window.Field label="Package name"
            hint={<span>Globally unique. Cannot be changed once an app has been published.</span>}>
            <window.Input value={app.package} mono disabled />
          </window.Field>
          <window.Field label="Category">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(window.CATEGORIES || []).map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  padding: "5px 11px", borderRadius: 999, fontSize: 12,
                  background: category === c ? "var(--color-primary-50)" : "var(--color-bg-2)",
                  border: "1px solid",
                  borderColor: category === c ? "var(--color-primary-500)" : "var(--color-border-default)",
                  color: category === c ? "var(--color-primary-700)" : "var(--color-text-secondary)",
                  fontWeight: category === c ? 500 : 400,
                }}>{c}</button>
              ))}
            </div>
          </window.Field>
          <window.Field label="Description">
            <window.Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </window.Field>
        </div>
      </window.Card>

      <window.Card title="Supported orientations"
        hint="Declared at the app level. Screenshots are uploaded per orientation when you upload a version.">
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { id: "portrait",  label: "Portrait",  w: 30, h: 50 },
            { id: "landscape", label: "Landscape", w: 50, h: 30 },
          ].map(o => {
            const on = orientations.has(o.id);
            return (
              <button key={o.id} onClick={() => toggleOrientation(o.id)} style={{
                flex: 1, padding: "12px 14px", textAlign: "left",
                display: "flex", alignItems: "center", gap: 12,
                background: on ? "var(--color-primary-50)" : "var(--color-bg-2)",
                border: "1px solid",
                borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
                borderRadius: 8,
                cursor: "pointer",
              }}>
                <div style={{ width: 60, height: 60, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: o.w, height: o.h, borderRadius: 3,
                    background: on ? "var(--color-primary-700)" : "var(--color-bg-3)",
                    border: "1px solid",
                    borderColor: on ? "transparent" : "var(--color-border-default)",
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{o.label}</span>
                  </div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    {on ? "selected" : "tap to enable"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </window.Card>

      <window.Card title="Compatibility · device models"
        hint={`${devices.size} of ${window.DEVICE_MODELS.length} TOMS device models selected — ISOs can only deploy this app to terminals running one of these models.`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {window.DEVICE_MODELS.map(d => {
            const on = devices.has(d.id);
            return (
              <button key={d.id} onClick={() => toggleDevice(d.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 11px",
                background: on ? "var(--color-primary-50)" : "var(--color-bg-2)",
                border: "1px solid",
                borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
                borderRadius: 7, textAlign: "left",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: on ? "var(--color-primary-600)" : "transparent",
                  border: "1px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--color-border-default)",
                  display: "grid", placeItems: "center",
                  color: "white", flexShrink: 0,
                }}>
                  {on && <window.Ico name="check" size={10} stroke={2.5} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{d.id}</div>
                  <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)" }} className="truncate">{d.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </window.Card>

      <window.Card title="Danger zone">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Archive this app</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
              Existing installations keep working. New subscriptions are disabled.
            </div>
          </div>
          <window.Button danger>Archive</window.Button>
        </div>
      </window.Card>

      {/* Sticky save bar — only visible when there are unsaved changes. */}
      {dirty && (
        <div style={{
          position: "sticky", bottom: 0, zIndex: 5,
          margin: "0 -24px -28px",
          padding: "12px 24px",
          background: "var(--color-bg-2)",
          borderTop: "1px solid var(--color-border-subtle)",
          boxShadow: "0 -4px 12px oklch(0% 0 0 / 0.04)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, fontSize: 12, color: "var(--color-text-secondary)",
            display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-warning-500)" }} />
            <b style={{ color: "var(--color-text-primary)" }}>Unsaved changes</b>
          </div>
          <window.Button onClick={onDiscard}>Discard</window.Button>
          <window.Button primary icon="check" onClick={onSave}>Save changes</window.Button>
        </div>
      )}
    </div>
  );
}

// ─── Version detail screen ────────────────────────────────
// Catalog of Android permissions, ordered roughly by exposure.
// We deterministically slice this per-version using version.perms so the
// "View list" modal always shows a realistic, stable set.
const PERMISSIONS_CATALOG = [
  // Dangerous / runtime-prompted — highest scrutiny
  { id: "android.permission.READ_PHONE_STATE",    risk: "dangerous", purpose: "Read device identifiers (IMEI) for fraud detection" },
  { id: "android.permission.ACCESS_FINE_LOCATION",risk: "dangerous", purpose: "Tag transactions with terminal location" },
  { id: "android.permission.CAMERA",              risk: "dangerous", purpose: "Scan barcodes and QR codes at checkout" },
  { id: "android.permission.READ_EXTERNAL_STORAGE", risk: "dangerous", purpose: "Import logo / receipt template files" },
  { id: "android.permission.WRITE_EXTERNAL_STORAGE",risk: "dangerous", purpose: "Export receipts and EOD reports" },
  { id: "android.permission.READ_CONTACTS",       risk: "dangerous", purpose: "Look up customer records by phone" },
  { id: "android.permission.RECORD_AUDIO",        risk: "dangerous", purpose: "Capture customer-service call notes" },
  // Normal — granted at install, lower risk
  { id: "android.permission.INTERNET",            risk: "normal", purpose: "Communicate with the payment processor" },
  { id: "android.permission.ACCESS_NETWORK_STATE",risk: "normal", purpose: "Detect online / offline mode" },
  { id: "android.permission.ACCESS_WIFI_STATE",   risk: "normal", purpose: "Diagnose connectivity for support" },
  { id: "android.permission.WAKE_LOCK",           risk: "normal", purpose: "Keep the screen on during a transaction" },
  { id: "android.permission.VIBRATE",             risk: "normal", purpose: "Haptic feedback on tap-to-pay" },
  { id: "android.permission.FOREGROUND_SERVICE",  risk: "normal", purpose: "Run reconciliation jobs in foreground" },
  { id: "android.permission.POST_NOTIFICATIONS",  risk: "normal", purpose: "Surface payment confirmations" },
  { id: "android.permission.RECEIVE_BOOT_COMPLETED", risk: "normal", purpose: "Restart the POS service after reboot" },
  { id: "android.permission.BLUETOOTH",           risk: "normal", purpose: "Pair with PIN pads and printers" },
  { id: "android.permission.BLUETOOTH_CONNECT",   risk: "normal", purpose: "Bond with new BT peripherals (Android 12+)" },
  { id: "android.permission.NFC",                 risk: "normal", purpose: "Read contactless cards and tag-to-pay" },
  { id: "android.permission.USE_BIOMETRIC",       risk: "normal", purpose: "Manager unlock for refunds and voids" },
  { id: "com.android.vending.BILLING",            risk: "normal", purpose: "Validate Google Play subscriptions" },
  // TOMS-platform — only granted to signed system apps
  { id: "com.toms.permission.PRINT_RECEIPT",      risk: "signature", purpose: "Use the built-in thermal printer" },
  { id: "com.toms.permission.EMV_KERNEL",         risk: "signature", purpose: "Initiate EMV/chip-card transactions" },
  { id: "com.toms.permission.DEVICE_PROVISION",   risk: "signature", purpose: "Provision merchant credentials at first boot" },
];

function permissionsForVersion(version) {
  const n = Math.min(version.perms || 0, PERMISSIONS_CATALOG.length);
  if (n === 0) return [];
  // Stable hash from version.id so each version has a stable subset
  let seed = 0;
  for (const c of (version.id || version.code || "")) seed = (seed * 31 + c.charCodeAt(0)) & 0xffffffff;
  const idxs = Array.from({ length: PERMISSIONS_CATALOG.length }, (_, i) => i);
  // Lightweight Fisher-Yates with seeded RNG
  let state = (seed >>> 0) || 1;
  const rnd = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) % 100000) / 100000; };
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  // Always pull in INTERNET as the first one; it's universal.
  const picked = new Set([PERMISSIONS_CATALOG.findIndex(p => p.id === "android.permission.INTERNET")]);
  for (const i of idxs) {
    if (picked.size >= n) break;
    picked.add(i);
  }
  return [...picked].slice(0, n).map(i => PERMISSIONS_CATALOG[i]);
}

const RISK_META = {
  dangerous: { label: "Dangerous", tone: "warning", desc: "Runtime-prompted — user must approve" },
  signature: { label: "Signature", tone: "info",    desc: "TOMS platform-signed only" },
  normal:    { label: "Normal",    tone: "neutral", desc: "Granted automatically at install" },
};

function PermissionsModal({ open, onClose, version, app }) {
  const [q, setQ] = useStateS("");
  const all = useMemoS(() => permissionsForVersion(version), [version]);
  const filtered = useMemoS(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(p =>
      p.id.toLowerCase().includes(needle) || p.purpose.toLowerCase().includes(needle));
  }, [q, all]);

  // Group by risk so reviewers can scan high-impact ones first
  const grouped = useMemoS(() => {
    const out = { dangerous: [], signature: [], normal: [] };
    filtered.forEach(p => out[p.risk].push(p));
    return out;
  }, [filtered]);

  const totals = useMemoS(() => {
    const out = { dangerous: 0, signature: 0, normal: 0 };
    all.forEach(p => out[p.risk]++);
    return out;
  }, [all]);

  if (!open) return null;
  return (
    <window.Modal open onClose={onClose} width={680}
      title={<>Permissions — <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{app.name} {version.name}</span></>}
      subtitle={`${all.length} permission${all.length !== 1 ? "s" : ""} declared in the APK manifest. Reviewers should focus on Dangerous and Signature scopes.`}
      padding={0}
      footer={
        <>
          <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Pulled from <span className="mono">AndroidManifest.xml</span> at upload time
          </span>
          <div style={{ flex: 1 }} />
          <window.Button onClick={onClose}>Close</window.Button>
        </>
      }>
      {/* Risk summary strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        padding: "var(--space-4) var(--space-5) var(--space-3)",
        borderBottom: "1px solid var(--border-1)",
      }}>
        {["dangerous", "signature", "normal"].map(r => {
          const m = RISK_META[r];
          return (
            <div key={r} style={{
              padding: "10px 12px",
              background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--radius-md)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <window.Pill tone={m.tone} dot size="sm">{m.label}</window.Pill>
                <span className="mono num" style={{
                  marginLeft: "auto", fontSize: 14, fontWeight: 600, color: "var(--fg1)",
                }}>{totals[r]}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg3)", lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-1)" }}>
        <window.Input
          size="sm"
          prefix={<window.Ico name="search" size={12} />}
          placeholder="Search permission name or purpose…"
          value={q}
          onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* Grouped list */}
      <div style={{ maxHeight: 440, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 12.5, color: "var(--fg3)" }}>
            No permissions match "{q}".
          </div>
        ) : (
          ["dangerous", "signature", "normal"].map(r => {
            const items = grouped[r];
            if (items.length === 0) return null;
            const m = RISK_META[r];
            return (
              <section key={r}>
                <header style={{
                  position: "sticky", top: 0, zIndex: 1,
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px var(--space-5)",
                  background: "var(--bg3)",
                  borderBottom: "1px solid var(--border-1)",
                  fontSize: 11,
                }}>
                  <window.Pill tone={m.tone} dot size="sm">{m.label}</window.Pill>
                  <span style={{ color: "var(--fg3)" }}>{items.length}</span>
                </header>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {items.map(p => (
                    <li key={p.id} style={{
                      padding: "10px var(--space-5)",
                      borderBottom: "1px solid var(--border-1)",
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: "2px 12px",
                    }}>
                      <span className="mono" style={{
                        fontSize: 12, color: "var(--fg1)", fontWeight: 500,
                        gridColumn: 1, wordBreak: "break-all",
                      }}>{p.id}</span>
                      <button title="Copy"
                        style={{ color: "var(--fg3)", padding: 2, gridColumn: 2, alignSelf: "start" }}>
                        <window.Ico name="copy" size={12} />
                      </button>
                      <span style={{
                        fontSize: 12, color: "var(--fg3)", lineHeight: 1.4,
                        gridColumn: "1 / -1",
                      }}>{p.purpose}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </window.Modal>
  );
}

function VersionSubscribersCard({ isos, version }) {
  const pager = window.usePaginated(isos, 10, "");
  const showPager = isos.length > 10;

  // Compute each ISO subscriber's status relative to THIS version. Four
  // possible states:
  //   on-version     — current snapshot is this exact version
  //   upgraded       — moved past this version to a newer one
  //   pending        — never approved; still on an older snapshot
  //   unsubscribed   — cancelled the subscription
  // Mock implementation: deterministic by (iso.id + version.id) so each
  // subscriber renders the same status every render.
  const subscriberStatus = (iso) => {
    const seed = (iso.id + ":" + version.id).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0);
    const isLatest = !!version.current;
    if (isLatest) return seed % 6 === 0 ? "pending" : "on-version";
    const r = seed % 10;
    if (r < 5) return "upgraded";
    if (r < 7) return "on-version";
    if (r < 9) return "pending";
    return "unsubscribed";
  };
  const STATUS_META = {
    "on-version":   { tone: "success", label: "On this version" },
    "upgraded":     { tone: "info",    label: "Upgraded" },
    "pending":      { tone: "warning", label: "Pending approval" },
    "unsubscribed": { tone: "neutral", label: "Unsubscribed" },
  };
  return (
    <window.Card title={`Subscribers · ${isos.length}`}
      hint={`${isos.length} of ${version.reach || isos.length} in scope`}
      padding={0}>
      {isos.length === 0 ? (
        <div style={{ padding: 16 }}>
          <window.Empty icon="users" title="No subscribers yet"
            body="This version is held for review. Once published to the pool, ISO companies that subscribe will appear here." />
        </div>
      ) : (
        <>
        <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["ISO company", "Subscribed", "Status"].map((h, i) => (
                <th key={i} style={{
                  padding: "8px 12px", fontSize: 11, fontWeight: 500,
                  color: "var(--color-text-tertiary)", textTransform: "uppercase",
                  letterSpacing: "0.05em", borderBottom: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-3)", textAlign: "left",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((c, i) => {
              const meta = STATUS_META[subscriberStatus(c)];
              return (
              <tr key={c.id} style={{ borderBottom: i < pager.slice.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5,
                      background: "var(--color-primary-50)", color: "var(--color-primary-700)",
                      display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 600 }}>
                      {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                    <span style={{
                      fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
                      background: "oklch(94% 0.03 152)", color: "var(--color-success-700)",
                      fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.04em",
                    }}>ISO</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>
                  <span className="mono">{version.publishedAt || "—"}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <window.Pill tone={meta.tone} dot size="sm">{meta.label}</window.Pill>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {showPager && (
          <window.Pagination page={pager.page} pageSize={pager.pageSize} total={pager.total}
            onChange={pager.setPage} pageSizes={[10]} />
        )}
        </>
      )}
    </window.Card>
  );
}

// Dropdown menu item used inside the VersionDetailScreen "More" menu.
// `tone="danger"` recolors the icon + label; `emphasized` adds a faint
// red wash so destructive actions still stand out inside the menu.
function MenuItem({ icon, label, hint, tone, emphasized, onClick }) {
  const danger = tone === "danger";
  const [hover, setHover] = React.useState(false);
  const fg = danger ? "var(--color-error-700)" : "var(--color-text-primary)";
  return (
    <button role="menuitem" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 10px", borderRadius: "var(--radius-sm)",
        background: hover
          ? (emphasized ? "var(--color-error-50)" : "var(--color-bg-3)")
          : (emphasized ? "color-mix(in oklab, var(--color-error-500) 5%, transparent)" : "transparent"),
        textAlign: "left", cursor: "pointer", width: "100%",
        border: "none",
      }}>
      <window.Ico name={icon} size={14}
        style={{ color: fg, flexShrink: 0, marginTop: 2 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: fg }}>{label}</span>
        {hint && <span style={{ display: "block", marginTop: 2, fontSize: 11,
          color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>{hint}</span>}
      </span>
    </button>
  );
}

function VersionDetailScreen({ app, version, navigate, route }) {
  const tenant = window.useActiveTenant();
  const isOwnApp = app.publisherTenantId === tenant.id;
  const [unpublishOpen, setUnpublishOpen] = useStateS(false);
  const [rollbackOpen, setRollbackOpen] = useStateS(false);
  const [moreOpen, setMoreOpen] = useStateS(false);
  const subscriptionRaw = ((window.SUBSCRIBED_APPS || {})[tenant.id] || []).find(s => s.appId === app.id);
  // Only the version the active tenant has currently pulled is eligible for
  // a Roll out shortcut from this page — older snapshots can't be rolled out
  // directly (you'd have to re-pull or use the Versions tab).
  const isCurrentSnapshot = !!subscriptionRaw && subscriptionRaw.subscribedVersionId === version.id;

  // Subscriber-only: merchants that have already been rolled this exact
  // version. We cross-reference ROLLOUT_HISTORY against the tenant's fleet to
  // recover full merchant records (name / region / terminal count).
  const fleet = !isOwnApp ? (window.MERCHANT_FLEETS[tenant.id] || []) : [];
  const onThisVersionIds = !isOwnApp ? window.merchantsAlreadyOnVersion(tenant.id, app.id, version.id) : new Set();
  const merchantsOnVersion = fleet.filter(m => onThisVersionIds.has(m.id));
  const totalConfigured = !isOwnApp ? window.merchantsConfiguredForApp(tenant.id, app.id).length : 0;
  const showRolloutShortcut = !isOwnApp && isCurrentSnapshot && version.status === "published";

  const findings = version.scan ? window.SCAN_FINDINGS_TEMPLATES[version.scan] : null;
  const counts = findings ? window.summariseFindings(findings) : null;
  const [permsOpen, setPermsOpen] = useStateS(false);
  const [findingsOpen, setFindingsOpen] = useStateS(false);
  const [inviteOpen, setInviteOpen] = useStateS(false);
  const totalFindings = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const vst = window.VERSION_STATUS[version.status] || window.APP_STATUS[version.status];
  const isos = app.subscriberIds.slice(0, version.reach || 0).map(id => window.ISO_COMPANIES.find(c => c.id === id)).filter(Boolean);
  // Resolve effective visibility. Versions uploaded through the new wizard
  // carry an explicit `visibility` field. Legacy seed versions don't —
  // fall back to the parent app's status so a private (local-pool) app's
  // versions show as "Internal only" rather than "All ISOs".
  const effectiveVisibility = version.visibility
    || (app.status === "published" ? "all" : "internal");
  const isInviteOnly = effectiveVisibility === "invite";
  const isInternalOnly = effectiveVisibility === "internal";
  const visibilityPill = isInviteOnly
    ? { tone: "warning", dot: true,  label: "Invite-only" }
    : isInternalOnly
      ? { tone: "neutral", dot: false, label: "Internal only" }
      : { tone: "info", dot: false, label: "All ISOs" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "var(--color-bg-2)", borderBottom: "1px solid var(--color-border-subtle)",
        padding: "14px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate({ screen: "appDetail", appId: app.id, tab: "versions", from: route?.from || (isOwnApp ? "appPublish" : "appStore") })}
            style={{ color: "var(--color-text-tertiary)" }}>
            <window.Ico name="chevl" size={16} />
          </button>
          <window.AppIcon app={app} version={version} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>{app.name}</span>
              <window.Ico name="chevr" size={11} style={{ color: "var(--color-text-tertiary)" }} />
              <h1 className="mono" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{version.name}</h1>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>· code {version.code}</span>
              <window.Pill tone={vst.tone} dot size="lg">{vst.label}</window.Pill>
              {version.current && <window.Pill tone="accent" size="lg">Current</window.Pill>}
              <window.Pill tone={visibilityPill.tone} dot={visibilityPill.dot} size="lg">{visibilityPill.label}</window.Pill>
            </div>
            <div className="mono" style={{ marginTop: 3, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>{app.package}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {isOwnApp && version.status === "published" && isInviteOnly && (
              <window.Button icon="send" onClick={() => setInviteOpen(true)}>
                Push to ISO
              </window.Button>
            )}
            {isCurrentSnapshot && version.status === "published" && (
              <window.Button primary icon="bolt"
                onClick={() => navigate({ screen: "pullWizard", appId: app.id, versionId: version.id, rolloutOnly: true, from: route?.from || "appStore" })}>
                Roll out
              </window.Button>
            )}
            {version.status === "unpublished" && (
              <window.Button icon="refresh"
                onClick={() => window.showToast?.(`${version.name} re-published`, "success")}>
                Re-publish
              </window.Button>
            )}
            {version.status === "draft" && (
              <window.Button primary icon="bolt"
                onClick={() => window.showToast?.(`${version.name} published to app pool`, "success")}>
                Publish now
              </window.Button>
            )}
            <div style={{ position: "relative" }}>
              <window.Button icon="more" onClick={() => setMoreOpen(o => !o)}
                aria-expanded={moreOpen} aria-haspopup="menu">
                More
              </window.Button>
              {moreOpen && (
                <>
                  {/* Click-away backdrop */}
                  <div onClick={() => setMoreOpen(false)} style={{
                    position: "fixed", inset: 0, zIndex: 40,
                  }} />
                  <div role="menu" style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    minWidth: 240, zIndex: 41,
                    background: "var(--color-bg-2)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-2, 0 8px 24px oklch(0% 0 0 / 0.10))",
                    padding: 4,
                    display: "flex", flexDirection: "column",
                  }}>
                    <MenuItem icon="download"
                      label="Download APK"
                      hint={`${version.size || "—"} · signed build`}
                      onClick={() => {
                        setMoreOpen(false);
                        window.showToast?.(`Downloading ${app.name} ${version.name}…`, "success");
                      }} />
                    {version.status === "published" && (
                      <>
                        <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "4px 0" }} />
                        <MenuItem icon="alert" tone="danger"
                          label={window.__takedownTerm === "remove" ? "Remove from pool" : "Unpublish"}
                          hint="Take off the public pool · existing devices keep running"
                          onClick={() => { setMoreOpen(false); setUnpublishOpen(true); }} />
                        <MenuItem icon="alert" tone="danger" emphasized
                          label="Roll back…"
                          hint="Force devices off this version · destructive"
                          onClick={() => { setMoreOpen(false); setRollbackOpen(true); }} />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 28px", background: "var(--color-bg-1)" }}>
        <div className="page-content" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Metadata */}
            <window.Card title="Build metadata">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <window.KV label="Version name"  value={<span className="mono">{version.name}</span>} />
                <window.KV label="Version code"  value={<span className="mono">{version.code}</span>} />
                <window.KV label="APK size"      value={version.size} />
                <window.KV label="Min Android"
                  value={<>{androidVersionName(version.minSdk)}{" "}
                    <span className="mono" style={{ color: "var(--color-text-tertiary)" }}>· API {version.minSdk}</span>
                  </>} />
                <window.KV label="Target Android"
                  value={<>{androidVersionName(version.targetSdk)}{" "}
                    <span className="mono" style={{ color: "var(--color-text-tertiary)" }}>· API {version.targetSdk}</span>
                  </>} />
                <window.KV label="Permissions"
                  value={
                    <button onClick={() => setPermsOpen(true)} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 13, color: "var(--accent)", fontWeight: 500,
                      textDecoration: "underline", textUnderlineOffset: 2,
                      textDecorationStyle: "dotted",
                      textDecorationColor: "var(--border-2)",
                    }}>
                      <span className="mono num">{version.perms}</span> declared
                      <window.Ico name="external" size={11} stroke={1.7} />
                    </button>
                  } />
                <window.KV label="Uploaded"      value={`${version.uploadedAt} · by M. Hassan`} />
                <window.KV label="Published"     value={version.publishedAt || <span style={{ color: "var(--color-text-tertiary)" }}>—</span>} />
                <window.KV label="Signing cert"  value={<span className="mono" style={{ fontSize: 11 }}>{version.signer || "Acme Software Inc. · SHA-256 d4:e2:8a:…"}</span>} mono copy />
              </div>
            </window.Card>

            {/* Vulnerability scan — only shown once the asynchronous scan has completed.
                Defaults to a compact summary (counts grid + severity bar); the full
                findings list is one button away via FindingsModal to keep this card
                glanceable. */}
            {counts && (
              <window.Card title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <window.Ico name="shieldCheck" size={14} /> Vulnerability scan
                </span>
              }
                hint={`Last run · ${version.uploadedAt}`}
                action={totalFindings > 0 && (
                  <window.Button size="sm" iconRight="arrowR" onClick={() => setFindingsOpen(true)}>
                    View {totalFindings} finding{totalFindings === 1 ? "" : "s"}
                  </window.Button>
                )}>
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
                    {Object.entries(counts).map(([k, v]) => (
                      <div key={k} style={{
                        padding: "10px 12px", borderRadius: 7,
                        background: v > 0 ? "var(--color-bg-2)" : "var(--color-bg-3)",
                        border: "1px solid",
                        borderColor: v > 0 && (k === "critical" || k === "high") ? "var(--color-error-500)" : "var(--color-border-subtle)",
                        borderLeftWidth: 3,
                        borderLeftColor: window.SEVERITY[k].color,
                      }}>
                        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em",
                          fontWeight: 500, color: "var(--color-text-tertiary)" }}>{window.SEVERITY[k].label}</div>
                        <div className="mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 2,
                          color: v > 0 ? window.SEVERITY[k].color : "var(--color-text-tertiary)" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <window.SeverityBar counts={counts} height={6} />
                  {totalFindings === 0 && (
                    <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-success-700)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <window.Ico name="check" size={12} /> Scan completed with no findings.
                    </div>
                  )}
                </>
              </window.Card>
            )}

            {/* Release notes */}
            <window.Card title="Release notes">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{version.notes}</p>
            </window.Card>

            {/* Screenshots — captured from this version's APK */}
            <window.Card title="Screenshots" hint="bundled with this APK">
              <window.Screenshots app={app} version={version} count={4} size="md" />
            </window.Card>

            {/* ISO companies that subscribed to this version */}
            <VersionSubscribersCard isos={isos} version={version} />

            {/* Invite history — own-app only, surfaces all push-to-ISO tokens */}
            {isOwnApp && (
              <window.InviteHistoryCard
                app={app} version={version}
                navigate={navigate}
                onInviteAgain={() => setInviteOpen(true)} />
            )}
            {false && (
            <window.Card title={`Subscribers · ${isos.length}`}
              hint={`${isos.length} of ${version.reach || isos.length} in scope`}
              padding={0}>
              {null}
            </window.Card>
            )}
          </div>

          {/* Right rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Subscriber-only: thin pointer card that surfaces *how many*
                merchants are on this version and deep-links to the
                Deployments tab pre-filtered to it. The full merchant list
                with status / search / pagination lives in Deployments — the
                unified drill-down for "app → version → merchants → state".
                We deliberately keep this card minimal (single count + link)
                so it scales to fleets of thousands without breaking the
                right-rail layout. */}
            {!isOwnApp && (
              <button
                onClick={() => navigate({ screen: "appDetail", appId: app.id, tab: "deployments", filterVersionId: version.id, from: route?.from || "appStore" })}
                className="tds-card"
                style={{
                  boxShadow: "var(--shadow-1)",
                  borderRadius: "var(--radius-lg)",
                  textAlign: "left",
                  padding: 0,
                  width: "100%",
                  cursor: "pointer",
                  transition: "background 120ms ease, border-color 120ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                <div className="tds-card__header" style={{ padding: "var(--space-3) var(--space-5)" }}>
                  <h3 className="tds-card__title" style={{ fontSize: 13 }}>Fleet deployment</h3>
                </div>
                <div style={{ padding: "var(--space-4) var(--space-5) var(--space-5)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="mono num" style={{
                      fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em",
                      color: "var(--color-text-primary)",
                    }}>{merchantsOnVersion.length}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
                      / {totalConfigured} merchants
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    on this version
                  </div>
                  <div style={{
                    marginTop: 14,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, color: "var(--accent)", fontWeight: 500,
                  }}>
                    View deployment details
                    <window.Ico name="chevr" size={12} />
                  </div>
                </div>
              </button>
            )}

            <window.Card title="Timeline" padding={0}>
              {[
                { icon: "upload",      t: "APK uploaded",        time: version.uploadedAt, user: "M. Hassan" },
                counts && { icon: "shieldCheck", t: `Scan completed · ${totalFindings} findings`, time: version.uploadedAt },
                version.publishedAt && { icon: "bolt",     t: "Published to app pool", time: version.publishedAt },
                version.publishedAt && { icon: "check",    t: `${version.reach || 0} ISO ${(version.reach || 0) === 1 ? "company" : "companies"} subscribed to this version`, time: "today" },
              ].filter(Boolean).map((a, i, arr) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5,
                    background: "var(--color-bg-3)", color: "var(--color-text-secondary)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                    border: "1px solid var(--color-border-subtle)" }}>
                    <window.Ico name={a.icon} size={11} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 450 }}>{a.t}</div>
                    <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                      <span className="mono">{a.time}</span>{a.user && <span> · {a.user}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </window.Card>
          </div>
        </div>
      </div>
      <PermissionsModal
        open={permsOpen}
        onClose={() => setPermsOpen(false)}
        app={app}
        version={version} />
      <FindingsModal
        open={findingsOpen}
        onClose={() => setFindingsOpen(false)}
        app={app}
        version={version}
        findings={findings}
        counts={counts} />
      <window.InviteIsoModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        app={app}
        version={version}
        onCreated={(rec) => window.showToast?.(`Invite link created for ${rec.email}`, "success")} />
      <window.ConfirmDialog
        open={unpublishOpen}
        onClose={() => setUnpublishOpen(false)}
        title={`Unpublish ${version.name}?`}
        body={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              padding: "10px 12px",
              background: "var(--warning-bg)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 22%, transparent)",
              borderRadius: "var(--radius-md)",
              fontSize: 12, color: "var(--color-warning-700)",
              lineHeight: 1.55,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <window.Ico name="email" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Subscribed ISO companies will receive an <b>email notification</b> that this version has been delisted and can no longer be pushed to new devices.</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
              <li>The version is taken off the public app pool.</li>
              <li>Subscribed ISO companies <b>can't push this version to any new device</b> from the moment you unpublish.</li>
              <li>Devices already running this version are <b>not affected</b> — for that, use <b>Roll back</b>.</li>
              <li>Other versions of this app remain available for subscribers.</li>
            </ul>
          </div>
        }
        confirmLabel={window.__takedownTerm === "remove" ? "Remove from pool" : "Unpublish version"}
        tone="danger"
        icon="alert"
        onConfirm={() => {
          setUnpublishOpen(false);
          // Mutate in-memory state so the UI reflects the new version status.
          const targetVersion = (window.APPS || [])
            .find(a => a.id === app.id)?.versions
            .find(v => v.id === version.id);
          if (targetVersion) {
            targetVersion.status = "unpublished";
            targetVersion.unpublishedAt = "just now";
          }
          window.showToast?.(`${version.name} unpublished · subscribers notified by email`, "warning");
        }} />
      <window.ConfirmDialog
        open={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        title={`⚠️ Roll back ${version.name}?`}
        body={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              padding: "10px 12px",
              background: "var(--error-bg)",
              border: "1px solid color-mix(in oklab, var(--color-error-500) 25%, transparent)",
              borderRadius: "var(--radius-md)",
              fontSize: 12.5, lineHeight: 1.55, color: "var(--color-error-700)",
            }}>
              <b>Destructive action.</b> Rolling back will:
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Send an <b>urgent email</b> to every subscribed ISO flagging the version as risky and recommending immediate uninstall on all terminals.</li>
                <li>Each ISO decides for themselves: uninstall now, or accept the risk and keep the version running. ISVs can't force-uninstall.</li>
                <li>Mark {version.name} as <b>rolled back</b> — it can never be pushed to new devices again, even for ISOs that haven't subscribed yet.</li>
                <li>Cannot be undone.</li>
              </ul>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
              Use this only when a critical defect makes the version unsafe to keep running. For routine take-downs (no emergency alert, no permanent block), use <b>Unpublish</b> instead.
            </div>
          </div>
        }
        confirmLabel="Roll back version"
        tone="danger"
        icon="alert"
        requireText="ROLLBACK"
        hint="Type the phrase to enable confirmation."
        onConfirm={() => {
          setRollbackOpen(false);
          // Mutate in-memory state. The Pull wizard reads this flag to
          // exclude rolled-back versions from the candidate list.
          const target = (window.APPS || []).find(a => a.id === app.id);
          const targetVersion = target?.versions.find(v => v.id === version.id);
          if (targetVersion) {
            targetVersion.status = "rollback";
            targetVersion.rolledBackAt = "just now";
          }
          if (target) {
            target.reviewActivity = [...(target.reviewActivity || []), {
              kind: "rollback", at: "just now", actor: "You",
              note: `${version.name} rolled back — emergency email sent to subscribers.`,
            }];
          }
          window.showToast?.(`⚠️ ${version.name} rolled back · emergency email sent to subscribers`, "warning");
        }} />
    </div>
  );
}

function FindingRow({ f }) {
  const [open, setOpen] = useStateS(false);
  const sev = window.SEVERITY[f.sev];
  return (
    <div style={{
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 7,
      borderLeft: "3px solid", borderLeftColor: sev.color,
      background: "var(--color-bg-2)",
      overflow: "hidden",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", width: "100%", textAlign: "left",
      }}>
        <window.Pill tone={sev.tone} size="sm">{sev.label}</window.Pill>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{f.title}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>
            {f.cve ? <span>{f.cve} · </span> : null}{f.pkg}
          </div>
        </div>
        <window.Ico name={open ? "chevu" : "chevd"} size={13} style={{ color: "var(--color-text-tertiary)" }} />
      </button>
      {open && (
        <div style={{
          padding: "10px 14px 12px 14px",
          background: "var(--color-bg-3)",
          borderTop: "1px solid var(--color-border-subtle)",
          fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55,
        }}>
          <div style={{ marginBottom: 8 }}>{f.desc}</div>
          <div style={{ display: "flex", gap: 18, fontSize: 11.5 }}>
            <div><span style={{ color: "var(--color-text-tertiary)" }}>Detected in:</span> <span className="mono">{f.version}</span></div>
            <div><span style={{ color: "var(--color-text-tertiary)" }}>Recommendation:</span> <span className="mono">{f.fix}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Vulnerability findings modal ──────────────────
// Mounted by any surface that wants to defer the full findings list behind
// a button. Keeps the host page minimal (counts + severity bar) and lets the
// operator drill in only when they actually want to investigate.
function FindingsModal({ open, onClose, app, version, findings, counts }) {
  if (!open) return null;
  const list = findings || [];
  const total = list.length;
  return (
    <window.Modal open onClose={onClose} width={680}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <window.Ico name="shieldCheck" size={14} />
          Vulnerability findings
          {app && version && (
            <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>
              — <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>{app.name} {version.name}</span>
            </span>
          )}
        </span>
      }
      subtitle={total === 0
        ? "Scan completed with no findings."
        : `${total} finding${total === 1 ? "" : "s"} from the latest scan run.`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {counts && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {Object.entries(counts).map(([k, v]) => (
                <div key={k} style={{
                  padding: "8px 10px", borderRadius: 6,
                  background: v > 0 ? "var(--color-bg-2)" : "var(--color-bg-3)",
                  border: "1px solid",
                  borderColor: v > 0 && (k === "critical" || k === "high") ? "var(--color-error-500)" : "var(--color-border-subtle)",
                  borderLeftWidth: 3,
                  borderLeftColor: window.SEVERITY[k].color,
                }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em",
                    fontWeight: 500, color: "var(--color-text-tertiary)" }}>{window.SEVERITY[k].label}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500, marginTop: 1,
                    color: v > 0 ? window.SEVERITY[k].color : "var(--color-text-tertiary)" }}>{v}</div>
                </div>
              ))}
            </div>
            <window.SeverityBar counts={counts} height={6} />
          </>
        )}
        {total > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {list.map((f, i) => (
              <FindingRow key={i} f={f} />
            ))}
          </div>
        )}
      </div>
    </window.Modal>
  );
}

Object.assign(window, {
  AppsListScreen, AppDetailScreen, VersionDetailScreen, AppMeta, DeviceChip,
  FindingsModal, FindingRow,
});
