/* global React */
// ─────────────────────────────────────────────────────────────
// ISO-side "Subscribed apps" view.
// When an ISO subscribes to an ISV's app it gets a snapshot at a specific
// version. The view here lists those snapshots, surfaces any newer version
// the source ISV has published, and offers a Pull action (mock) to update.
// ─────────────────────────────────────────────────────────────

const { useState: useSubState, useMemo: useSubMemo } = React;
const { Ico, Badge, Button, Card, Input, PageHeader, Pagination, usePaginated } = window;

// Resolve a subscription record (appId + snapshot version id) into the
// information the table needs: app meta, currently-subscribed version, the
// latest available version from the publisher, and whether an update exists.
function resolveSubscription(sub) {
  const app = (window.APPS || []).find(a => a.id === sub.appId);
  if (!app) return null;
  const subscribedVersion = app.versions.find(v => v.id === sub.subscribedVersionId) || app.versions[0];
  // Latest version the ISO can actually pull — skips versions they've blocked
  // or marked as skipped.
  const tenantId = (window.__activeTenant && window.__activeTenant.id) || null;
  const latestVersion = tenantId
    ? window.latestPullableVersion(tenantId, app)
    : (app.versions.find(v => v.status === "published") || app.versions[0]);
  const isOutdated = latestVersion && subscribedVersion && latestVersion.id !== subscribedVersion.id;
  const publisherName = (window.TENANT_NAMES || {})[app.publisherTenantId] || app.publisherTenantId || "—";
  return { ...sub, app, subscribedVersion, latestVersion, isOutdated, publisherName };
}

// ─── KPI tile (mirrors AppsListScreen's strip) ─────────────────
function KpiTile({ label, value, sub, tone }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: "var(--radius-lg)",
      background: "var(--bg2)", border: "1px solid var(--border-1)",
    }}>
      <div className="overline" style={{ fontSize: 10.5 }}>{label}</div>
      <div className="mono" style={{
        fontSize: 22, fontWeight: 500, marginTop: 4,
        color: tone === "success" ? "var(--color-success-500)"
             : tone === "warning" ? "var(--color-warning-700)"
             : "var(--fg1)",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg3)" }}>{sub}</div>
    </div>
  );
}

// ─── Browse-pool drawer (placeholder for Phase 3.2) ────────────
function BrowsePoolButton({ tenant, onSubscribe, navigate }) {
  return (
    <Button icon="plus" onClick={() => navigate
      ? navigate({ screen: "browsePool" })
      : window.showToast?.("Browse app pool — open from App Store", "info")}>
      Browse app pool
    </Button>
  );
}

// ─── Pull-update toast (mock) ──────────────────────────────────
function PullVersionButton({ resolved, onPull }) {
  return (
    <Button size="sm" variant="primary" icon="download" onClick={() => onPull && onPull(resolved)}>
      Pull <span className="mono" style={{ marginLeft: 2 }}>{resolved.latestVersion.name}</span>
    </Button>
  );
}

// ─── Main view ─────────────────────────────────────────────────
// Body renders inline without its own PageHeader so it can be embedded inside
// a dual-contract Apps page that owns the header. Standalone uses get the
// header from <SubscribedAppsView>.
function SubscribedAppsBody({ tenant, header }) {
  const [filter, setFilter] = useSubState("all");   // all | updates | uptodate
  const [query, setQuery] = useSubState("");

  const subscriptions = (window.SUBSCRIBED_APPS || {})[tenant.id] || [];
  const resolved = subscriptions
    .map(resolveSubscription)
    .filter(Boolean);

  const filtered = useSubMemo(() => {
    const q = query.trim().toLowerCase();
    return resolved.filter(r => {
      if (filter === "updates" && !r.isOutdated) return false;
      if (filter === "uptodate" && r.isOutdated) return false;
      if (!q) return true;
      return `${r.app.name} ${r.app.package} ${r.publisherName}`.toLowerCase().includes(q);
    });
  }, [resolved, filter, query]);

  const counts = useSubMemo(() => ({
    all:      resolved.length,
    updates:  resolved.filter(r => r.isOutdated).length,
    uptodate: resolved.filter(r => !r.isOutdated).length,
    totalTerminals: resolved.reduce((s, r) => s + (r.deployedTerminals || 0), 0),
  }), [resolved]);

  const pager = usePaginated(filtered, 10, `${filter}|${query}`);

  // Mock pull action — flip the subscribed version to latest and force a re-resolve via state.
  const [tick, setTick] = useSubState(0);
  const handlePull = (resolvedItem) => {
    const entry = (window.SUBSCRIBED_APPS[tenant.id] || []).find(s => s.appId === resolvedItem.app.id);
    if (entry) {
      entry.subscribedVersionId = resolvedItem.latestVersion.id;
      entry.subscribedAt = "just now";
    }
    setTick(t => t + 1);
  };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg1)" }}>
      <div style={{ padding: "var(--space-5) var(--space-6) var(--space-3)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <KpiTile label="Subscribed apps" value={counts.all}     sub="across all ISVs" />
          <KpiTile label="Updates available" value={counts.updates} sub="new versions from ISVs"
                   tone={counts.updates > 0 ? "warning" : undefined} />
          <KpiTile label="Up to date"     value={counts.uptodate} sub="running latest snapshot" tone="success" />
          <KpiTile label="Deployed"       value={counts.totalTerminals.toLocaleString()} sub="terminals running these apps" />
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--space-3) var(--space-6)", flexWrap: "wrap" }}>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by app, package, or publisher…"
          style={{ flex: 1, minWidth: 220, maxWidth: 360 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "all",      label: "All" },
            { id: "updates",  label: "Updates" },
            { id: "uptodate", label: "Up to date" },
          ].map(c => {
            const on = filter === c.id;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{
                height: 28, padding: "0 var(--space-3)",
                borderRadius: "var(--radius-full)",
                border: "1px solid",
                borderColor: on ? "var(--accent)" : "var(--border-2)",
                background: on ? "var(--accent)" : "var(--bg2)",
                color: on ? "var(--accent-on)" : "var(--fg2)",
                fontSize: 12, fontWeight: on ? 500 : 400,
                boxShadow: on ? "var(--shadow-cta)" : "none",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{c.label}</button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "var(--space-3) var(--space-6) var(--space-6)" }}>
        <Card padding={0}>
          <div style={{ overflowX: "auto" }}>
            <table className="tds-table num">
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>App</th>
                  <th>Publisher</th>
                  <th>Current version</th>
                  <th>Latest available</th>
                  <th>Subscribed</th>
                  <th style={{ textAlign: "right" }}>Deployed</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map(r => (
                  <tr key={r.app.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <window.AppIcon app={r.app} size={28} radius={6} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)" }}>{r.app.name}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>{r.app.package}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "var(--fg2)" }}>{r.publisherName}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)" }}>{r.subscribedVersion.name}</span>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--fg3)" }}>code {r.subscribedVersion.code}</div>
                    </td>
                    <td>
                      {r.isOutdated ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-warning-700)" }}>{r.latestVersion.name}</span>
                          <Badge tone="warning" dot>Update</Badge>
                        </div>
                      ) : (
                        <Badge tone="success" dot>On latest</Badge>
                      )}
                    </td>
                    <td><span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{r.subscribedAt}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <span className="mono num" style={{ fontSize: 12.5, color: "var(--fg1)" }}>{r.deployedTerminals || 0}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.isOutdated
                        ? <PullVersionButton resolved={r} onPull={handlePull} />
                        : <Button size="sm" variant="ghost" iconRight="chevr">Manage</Button>}
                    </td>
                  </tr>
                ))}
                {pager.slice.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--fg3)" }}>
                      {resolved.length === 0
                        ? "Not subscribed to any apps yet. Use “Browse app pool” to discover apps published by ISVs."
                        : "No subscribed apps match those filters."}
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
      </div>
    </div>
  );
}

function SubscribedAppsView({ tenant }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <PageHeader
        title="Subscribed apps"
        subtitle="Apps your organization has subscribed to from ISV publishers. Snapshots stay fixed at the version you pulled; when an ISV publishes a newer version you'll be notified by email and can pull it here."
        actions={
          <>
            <Button icon="refresh">Check for updates</Button>
            <BrowsePoolButton tenant={tenant} />
          </>
        } />
      <SubscribedAppsBody tenant={tenant} />
    </div>
  );
}

window.SubscribedAppsView = SubscribedAppsView;
window.SubscribedAppsBody = SubscribedAppsBody;
window.BrowsePoolButton   = BrowsePoolButton;
window.resolveSubscription = resolveSubscription;
