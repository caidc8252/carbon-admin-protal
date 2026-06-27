/* global React */
// ─────────────────────────────────────────────────────────────
// Browse pool → Subscribe
// Full-screen two-pane view:
//   · Left  — list of apps in the public pool available to subscribe to
//     (logo · package · name · publisher · published · version)
//   · Right — full details for the highlighted app
// Subscribe button opens a Subscription config modal (update reminders,
// targets, channels). On confirm: writes to SUBSCRIBED_APPS and routes
// the user straight to the new app's detail page.
// ─────────────────────────────────────────────────────────────

const { useState: useStateBP, useMemo: useMemoBP, useEffect: useEffectBP } = React;

// ─── Mock external publishers / pool inventory ────────────
// The existing APPS catalog is mostly authored by `acme-sw`, with a couple by
// `northbay` / `summit`. To make the Browse Pool view feel like a real
// marketplace regardless of the active tenant, we layer a handful of
// external-publisher apps on top of the catalog. These are display-only —
// they don't roundtrip through the publish wizard.
const POOL_EXTRA_PUBLISHERS = {
  "northwind-labs":   { name: "Northwind Labs",       region: "Seattle, US" },
  "pinetree-pos":     { name: "Pinetree POS",         region: "Vancouver, CA" },
  "harbor-fintech":   { name: "Harbor Fintech",       region: "Singapore" },
  "lighthouse-soft":  { name: "Lighthouse Software",  region: "Dublin, IE" },
  "redwood-systems":  { name: "Redwood Systems",      region: "Austin, US" },
};

const POOL_EXTRA_APPS = [
  {
    id: "kds-orders", name: "Kitchen Display", package: "io.northwind.kds",
    category: "Food & Beverage", iconId: "delivery",
    publisherTenantId: "northwind-labs",
    description: "Real-time kitchen display system. Routes orders to prep stations by item type, tracks ticket time, and shows expo summaries on a wall-mounted X800.",
    devices: ["X800", "N950"], orientations: ["landscape"],
    status: "published",
    versions: [
      { id: "kds-v23", code: 223, name: "2.2.3", size: "12.1 MB", uploadedAt: "May 06, 2026", publishedAt: "May 08, 2026", status: "published", scan: "clean",
        notes: "Adds station load balancing, fixes ticket reorder bug on multi-printer setups.", perms: 9, minSdk: 24, targetSdk: 34 },
      { id: "kds-v22", code: 222, name: "2.2.2", size: "12.0 MB", uploadedAt: "Apr 14, 2026", publishedAt: "Apr 15, 2026", status: "published",
        notes: "Performance: 40% lower CPU on idle.", perms: 9, minSdk: 24, targetSdk: 34 },
      { id: "kds-v21", code: 221, name: "2.2.1", size: "11.8 MB", uploadedAt: "Mar 21, 2026", publishedAt: "Mar 22, 2026", status: "published",
        notes: "i18n: ja-JP, ko-KR. Tablet keypad refinements.", perms: 9, minSdk: 24, targetSdk: 34 },
    ],
  },
  {
    id: "self-order", name: "Self-Order Kiosk", package: "com.pinetree.selfserve",
    category: "Self-Service", iconId: "kiosk",
    publisherTenantId: "pinetree-pos",
    description: "Customer-facing self-order kiosk with menu builder, modifiers and tipping. Works in attended and unattended modes; pairs with the kitchen display.",
    devices: ["X800"], orientations: ["portrait", "landscape"],
    status: "published",
    versions: [
      { id: "ss-v17", code: 117, name: "1.7.0", size: "22.4 MB", uploadedAt: "May 11, 2026", publishedAt: "May 12, 2026", status: "published", scan: "cleanish",
        notes: "Adds attract-loop video, accessibility theme, and Apple Wallet pass-back.", perms: 12, minSdk: 26, targetSdk: 34 },
      { id: "ss-v16", code: 116, name: "1.6.4", size: "22.1 MB", uploadedAt: "Apr 09, 2026", publishedAt: "Apr 10, 2026", status: "published",
        notes: "Hotfix: split-tender confirmation on slow networks.", perms: 12, minSdk: 26, targetSdk: 34 },
    ],
  },
  {
    id: "tap-to-pay", name: "TapToPay SDK Sample", package: "com.harborfin.tap",
    category: "Payments", iconId: "payments",
    publisherTenantId: "harbor-fintech",
    description: "Reference contactless reader that demonstrates Tap-on-Phone integration. Useful as a baseline for in-house payment apps and certifier walkthroughs.",
    devices: ["N950", "S90", "S60"], orientations: ["portrait"],
    status: "published",
    versions: [
      { id: "tap-v08", code: 108, name: "1.8.0", size: "6.4 MB", uploadedAt: "May 02, 2026", publishedAt: "May 04, 2026", status: "published", scan: "clean",
        notes: "Visa MDES v3 support. New offline cap workflow.", perms: 7, minSdk: 24, targetSdk: 34 },
      { id: "tap-v07", code: 107, name: "1.7.2", size: "6.3 MB", uploadedAt: "Apr 01, 2026", publishedAt: "Apr 02, 2026", status: "published",
        notes: "Switched to AndroidX biometric. Sample card data updated.", perms: 7, minSdk: 24, targetSdk: 34 },
    ],
  },
  {
    id: "queue-mgr", name: "Queue Manager", package: "ie.lighthouse.queue",
    category: "Retail", iconId: "queue",
    publisherTenantId: "lighthouse-soft",
    description: "Virtual queue ticketing for service counters: pharmacies, in-store deli, click & collect. Companion app to the POS — tickets print at the existing receipt printer.",
    devices: ["N950", "S90", "N750"], orientations: ["portrait"],
    status: "published",
    versions: [
      { id: "q-v05", code: 105, name: "1.5.1", size: "4.8 MB", uploadedAt: "May 09, 2026", publishedAt: "May 10, 2026", status: "published", scan: "cleanish",
        notes: "Adds SMS-callback for ticket holders, multi-counter operator console.", perms: 5, minSdk: 24, targetSdk: 34 },
      { id: "q-v04", code: 104, name: "1.5.0", size: "4.7 MB", uploadedAt: "Apr 12, 2026", publishedAt: "Apr 13, 2026", status: "published",
        notes: "GA of multi-language ticket prompts.", perms: 5, minSdk: 24, targetSdk: 34 },
    ],
  },
  {
    id: "fleet-monitor", name: "Fleet Monitor", package: "com.redwood.fleet",
    category: "Reporting", iconId: "reporting",
    publisherTenantId: "redwood-systems",
    description: "Read-only operational dashboard for terminal fleet health. Surfaces battery, signal, last-checkin and configuration drift. Designed for back-office use on X800.",
    devices: ["X800", "N950"], orientations: ["landscape"],
    status: "published",
    versions: [
      { id: "fm-v12", code: 312, name: "3.1.2", size: "8.9 MB", uploadedAt: "May 07, 2026", publishedAt: "May 09, 2026", status: "published", scan: "dirty",
        notes: "New geo heatmap, CSV export of unhealthy devices.", perms: 6, minSdk: 26, targetSdk: 34 },
      { id: "fm-v11", code: 311, name: "3.1.1", size: "8.8 MB", uploadedAt: "Apr 17, 2026", publishedAt: "Apr 18, 2026", status: "published",
        notes: "Daily digest email; webhook reliability fixes.", perms: 6, minSdk: 26, targetSdk: 34 },
    ],
  },
];

// Lazy registration so publisher names resolve in shared TENANT_NAMES lookups.
function ensurePoolPublishers() {
  const names = window.TENANT_NAMES || {};
  Object.entries(POOL_EXTRA_PUBLISHERS).forEach(([id, info]) => {
    if (!names[id]) names[id] = info.name;
  });
  window.TENANT_NAMES = names;
}

// Mock team members for the reminder-target picker. The Carbon prototype
// doesn't have a user directory, so a small inline list is enough to show
// the picker UI works.
const POOL_TEAM_MEMBERS = [
  { id: "u-alex",  name: "Alex Tan",        role: "Fleet ops lead",   email: "alex.tan@northbay.example",    self: true  },
  { id: "u-jamie", name: "Jamie Park",      role: "Deployment manager", email: "jamie.park@northbay.example" },
  { id: "u-rosa",  name: "Rosa Martinez",   role: "Security",         email: "rosa@northbay.example" },
  { id: "u-dev",   name: "Dev Patel",       role: "App reviewer",     email: "dev.p@northbay.example" },
  { id: "u-mira",  name: "Mira Chen",       role: "Support",          email: "mira.c@northbay.example" },
  { id: "u-omar",  name: "Omar Haddad",     role: "Operations",       email: "omar.h@northbay.example" },
];

// ─── Build pool inventory (filter + sort) ─────────────────
function buildPoolInventory(tenant) {
  ensurePoolPublishers();

  const subscribedIds = new Set(((window.SUBSCRIBED_APPS || {})[tenant.id] || []).map(s => s.appId));

  // From the existing catalog: anything published, not owned by this tenant,
  // and not already subscribed.
  const fromCatalog = (window.APPS || [])
    .filter(a => a.status === "published")
    .filter(a => a.publisherTenantId !== tenant.id)
    .filter(a => !subscribedIds.has(a.id))
    .map(a => ({
      app: a,
      latestVersion: a.versions.find(v => v.status === "published" && v.current) || a.versions.find(v => v.status === "published") || a.versions[0],
    }));

  // Mock external apps.
  const fromExtras = POOL_EXTRA_APPS
    .filter(a => !subscribedIds.has(a.id))
    .map(a => ({
      app: a,
      latestVersion: a.versions[0],
    }));

  // Sort by latest published date (rough — string comparison on month names).
  // We use the version's publishedAt as a proxy for freshness.
  return [...fromCatalog, ...fromExtras].sort((x, y) => {
    const ax = Date.parse(x.latestVersion?.publishedAt || x.latestVersion?.uploadedAt || "Jan 1, 2000");
    const ay = Date.parse(y.latestVersion?.publishedAt || y.latestVersion?.uploadedAt || "Jan 1, 2000");
    return ay - ax;
  });
}

// ─── Subscribe screen ─────────────────────────────────────
function BrowsePoolScreen({ onClose, navigate, presetAppId, inviteToken }) {
  const tenant = window.useActiveTenant();

  // Resolve the invite token (if any) and validate it.
  const inviteRec = useMemoBP(() => {
    if (!inviteToken) return null;
    return (window.findInvite && window.findInvite(inviteToken)) || null;
  }, [inviteToken]);
  const inviteApp = useMemoBP(() => {
    if (!inviteRec) return null;
    return (window.APPS || []).find(a => a.id === inviteRec.appId) || null;
  }, [inviteRec]);
  const inviteVersion = useMemoBP(() => {
    if (!inviteRec || !inviteApp) return null;
    return (inviteApp.versions || []).find(v => v.id === inviteRec.versionId) || null;
  }, [inviteRec, inviteApp]);
  const inviteValid = inviteRec && inviteRec.status === "active";

  // For an invite-only context: inject the invited app at the top of inventory
  // (even if it's not already subscribed — though normally it wouldn't be).
  const inventory = useMemoBP(() => {
    const base = buildPoolInventory(tenant);
    if (inviteValid && inviteApp && inviteVersion) {
      const already = base.some(it => it.app.id === inviteApp.id);
      if (!already) {
        return [{ app: inviteApp, latestVersion: inviteVersion, invited: true }, ...base];
      }
      // Tag the matching entry as invited
      return base.map(it => it.app.id === inviteApp.id ? { ...it, invited: true } : it);
    }
    return base;
  }, [tenant.id, inviteValid, inviteApp?.id, inviteVersion?.id]);

  const [q, setQ] = useStateBP("");
  const [category, setCategory] = useStateBP("all");
  const [selectedId, setSelectedId] = useStateBP(
    presetAppId || inventory[0]?.app.id || null
  );
  const [subscribeOpen, setSubscribeOpen] = useStateBP(false);

  // If we landed with a valid invite token, auto-open the Subscribe modal so
  // the recipient lands directly on the confirmation flow.
  useEffectBP(() => {
    if (inviteValid && presetAppId) {
      setSelectedId(presetAppId);
      setSubscribeOpen(true);
    }
  }, [inviteValid, presetAppId]);

  // Categories present in the inventory (deduped).
  const cats = useMemoBP(() => ["all", ...Array.from(new Set(inventory.map(it => it.app.category)))], [inventory]);

  // Apply search + category filters.
  const filtered = useMemoBP(() => inventory.filter(it => {
    if (category !== "all" && it.app.category !== category) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const publisher = (window.TENANT_NAMES || {})[it.app.publisherTenantId] || "";
      const hay = `${it.app.name} ${it.app.package} ${publisher} ${it.app.category}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  }), [inventory, q, category]);

  // Keep selection valid relative to the filtered list. If the highlighted
  // app is filtered out, fall back to the first visible result.
  useEffectBP(() => {
    if (!filtered.length) { setSelectedId(null); return; }
    if (!filtered.some(it => it.app.id === selectedId)) {
      setSelectedId(filtered[0].app.id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find(it => it.app.id === selectedId) || filtered[0] || null;

  const handleSubscribed = (config) => {
    // Mock: write the subscription into SUBSCRIBED_APPS so the app shows up
    // on the App Store list and detail pages.
    if (!selected) return;
    const subs = (window.SUBSCRIBED_APPS = window.SUBSCRIBED_APPS || {});
    subs[tenant.id] = subs[tenant.id] || [];
    // Make sure the external app is in window.APPS so AppDetailScreen can
    // render it (it looks up by appId from the global catalog).
    const isExternal = !window.APPS.some(a => a.id === selected.app.id);
    if (isExternal) {
      // Append publisher metadata + clone so the catalog has the app.
      window.APPS.push({
        ...selected.app,
        subscriberIds: [],
        reviewActivity: [],
      });
    }
    subs[tenant.id].push({
      appId: selected.app.id,
      subscribedVersionId: selected.latestVersion?.id,
      subscribedAt: "just now",
      deployedTerminals: 0,
      // Stash the subscription preferences on the record so detail screens
      // could surface them later.
      notifyPrefs: config,
    });

    setSubscribeOpen(false);
    // Burn the invite token if one was presented and it's valid.
    if (inviteValid && inviteRec) {
      window.consumeInvite?.(inviteRec.token, tenant.id);
    }
    const methodLabels = config.notify
      ? Object.entries({ inapp: "in-app", email: "email", slack: "Slack" })
          .filter(([k]) => config.methods.has(k)).map(([, v]) => v).join(", ")
      : null;
    window.showToast?.(
      config.notify
        ? `Subscribed to ${selected.app.name} · update reminders on (${methodLabels})`
        : `Subscribed to ${selected.app.name}`,
      "success");
    // Navigate straight to the new app's detail page (App Store side).
    navigate({ screen: "appDetail", appId: selected.app.id, tab: "overview", from: "appStore" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "var(--color-bg-2)",
        borderBottom: "1px solid var(--color-border-subtle)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onClose} style={{ color: "var(--color-text-tertiary)", padding: 2 }} title="Back">
          <window.Ico name="chevl" size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Subscribe from app pool
          </h1>
          <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Browse published apps from other ISVs and subscribe to a snapshot you can deploy to your merchants.
          </div>
        </div>
        <window.Button onClick={onClose}>Cancel</window.Button>
      </div>

      {/* Invite-token banner — only shown when the user arrived via an
          invite link. Lets the recipient see exactly what they were invited
          to before subscribing. */}
      {inviteToken && (
        <InviteBanner
          rec={inviteRec}
          app={inviteApp} version={inviteVersion}
          valid={inviteValid} />
      )}

      {/* Body — two-pane split. Sidebar list on the left, detail on the right.*/}
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", background: "var(--color-bg-1)" }}>
        {/* List pane */}
        <div style={{
          width: 520, flexShrink: 0,
          borderRight: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-2)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search + category filter */}
          <div style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--color-border-subtle)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <window.Input
              value={q} onChange={(e) => setQ(e.target.value)}
              prefix={<window.Ico name="search" size={13} />}
              placeholder="Search by app name, package, or publisher…" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {cats.map(c => {
                const on = category === c;
                return (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: "3px 10px", borderRadius: 999, fontSize: 11.5,
                    background: on ? "var(--color-primary-700)" : "transparent",
                    border: "1px solid",
                    borderColor: on ? "var(--color-primary-700)" : "var(--color-border-default)",
                    color: on ? "var(--color-text-on-primary)" : "var(--color-text-secondary)",
                    fontWeight: on ? 500 : 400,
                  }}>{c === "all" ? "All categories" : c}</button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <window.Empty icon="search" title="No matches"
                  body="Try a different search or clear the category filter." />
              </div>
            ) : (
              <div role="list">
                {filtered.map((it, i) => (
                  <PoolListRow
                    key={it.app.id}
                    item={it}
                    active={it.app.id === (selected?.app.id)}
                    onClick={() => setSelectedId(it.app.id)}
                    last={i === filtered.length - 1} />
                ))}
              </div>
            )}
          </div>
          <div style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--color-border-subtle)",
            fontSize: 11, color: "var(--color-text-tertiary)",
            background: "var(--color-bg-3)",
          }}>
            <span className="mono num">{filtered.length}</span> of <span className="mono num">{inventory.length}</span> apps in pool
          </div>
        </div>

        {/* Detail pane */}
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          {selected
            ? <PoolDetailPane item={selected} onSubscribe={() => setSubscribeOpen(true)} />
            : <div style={{ padding: 80, color: "var(--color-text-tertiary)", textAlign: "center" }}>
                <window.Empty icon="doc" title="Nothing to show"
                  body="Pick an app from the list to see its details." />
              </div>}
        </div>
      </div>

      {/* Subscribe config modal */}
      {selected && (
        <SubscribeConfigModal
          open={subscribeOpen}
          onClose={() => setSubscribeOpen(false)}
          item={selected}
          onConfirm={handleSubscribed} />
      )}
    </div>
  );
}

// ─── Invite banner ────────────────────────────────────────
// Shown above the pool list when the user arrived via an invite link. Lays
// out who invited them, what app/version they were invited to, and the
// token's status / validity window.
function InviteBanner({ rec, app, version, valid }) {
  if (!rec || !app) {
    // Token doesn't resolve to any known invite — likely tampered or expired
    // long enough that the seed lost it.
    return (
      <div style={{
        padding: "12px 24px",
        background: "var(--color-error-50)",
        borderBottom: "1px solid color-mix(in oklab, var(--color-error-500) 28%, transparent)",
        display: "flex", alignItems: "center", gap: 12,
        color: "var(--color-error-700)", fontSize: 12.5, lineHeight: 1.5,
      }}>
        <window.Ico name="alert" size={15} />
        <div>
          <b>Invite link not valid.</b> The token wasn't recognised. Ask the publisher to resend a fresh invite.
        </div>
      </div>
    );
  }

  if (!valid) {
    const isUsed = rec.status === "used";
    return (
      <div style={{
        padding: "12px 24px",
        background: isUsed ? "var(--color-info-50)" : "var(--color-warning-50)",
        borderBottom: `1px solid color-mix(in oklab, ${isUsed ? "var(--color-info-500)" : "var(--color-warning-500)"} 28%, transparent)`,
        display: "flex", alignItems: "center", gap: 12,
        color: isUsed ? "var(--color-info-700)" : "var(--color-warning-700)",
        fontSize: 12.5, lineHeight: 1.5,
      }}>
        <window.Ico name="alert" size={15} />
        <div style={{ flex: 1 }}>
          <b>This invite link has {isUsed ? "already been used" : "expired"}.</b>{" "}
          {isUsed
            ? "Subscriptions are single-use. The app may already be in your store — check the App Store list."
            : "Invite tokens are valid for 30 days. Ask the publisher to issue a fresh one if you still need access."}
        </div>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.round((rec.expiresAt - Date.parse("May 14, 2026")) / 86400000));

  return (
    <div style={{
      padding: "12px 24px",
      background: "linear-gradient(95deg, var(--color-primary-50) 0%, var(--color-accent-50) 100%)",
      borderBottom: "1px solid var(--color-primary-500)",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <window.AppIcon app={app} version={version} size={40} radius={9} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <window.Pill tone="accent" size="sm" dot>Invite-only</window.Pill>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary-700)" }}>
            You've been invited to subscribe to {app.name}
          </span>
          <span className="mono" style={{
            fontSize: 11, padding: "1px 6px", borderRadius: 3,
            background: "var(--color-bg-2)",
            border: "1px solid var(--color-primary-500)",
            color: "var(--color-primary-700)",
          }}>v{version?.name || "—"}</span>
        </div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--color-primary-700)", opacity: 0.85 }}>
          Sent to <span className="mono">{rec.email}</span>{" "}
          · Valid for {daysLeft} more day{daysLeft === 1 ? "" : "s"}{" "}
          · Token <span className="mono">{rec.token.slice(0, 12)}…</span>
        </div>
      </div>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────
function PoolListRow({ item, active, onClick, last }) {
  const { app, latestVersion, invited } = item;
  const publisher = (window.TENANT_NAMES || {})[app.publisherTenantId] || "—";
  return (
    <button onClick={onClick} role="listitem" style={{
      display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 12,
      width: "100%", padding: "14px 16px",
      textAlign: "left",
      background: active ? "var(--color-primary-50)" : "transparent",
      borderBottom: last ? "none" : "1px solid var(--color-border-subtle)",
      borderLeft: "3px solid",
      borderLeftColor: active ? "var(--color-primary-700)" : "transparent",
      cursor: "pointer",
      transition: "background var(--duration-fast) var(--easing-standard)",
    }}>
      <window.AppIcon app={app} size={44} radius={10} />
      <div style={{ minWidth: 0 }}>
        {/* Row 1: name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 500,
            color: active ? "var(--color-primary-700)" : "var(--color-text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{app.name}</span>
          {invited && (
            <span style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 3,
              background: "oklch(96% 0.05 320)", color: "var(--color-warning-700)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
              textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
              flexShrink: 0,
            }}>Invited</span>
          )}
        </div>
        {/* Row 2: package */}
        <div className="mono truncate" style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>
          {app.package}
        </div>
        {/* Row 3: publisher · category · published date */}
        <div style={{
          marginTop: 5, fontSize: 11, color: "var(--color-text-secondary)",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <window.Ico name="users" size={11} style={{ color: "var(--color-text-tertiary)" }} />
            <span>{publisher}</span>
          </span>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          <span style={{ color: "var(--color-text-tertiary)" }}>{app.category}</span>
          {latestVersion?.publishedAt && (
            <>
              <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
              <span style={{ color: "var(--color-text-tertiary)" }}>Published {latestVersion.publishedAt}</span>
            </>
          )}
        </div>
      </div>
      {/* Version pill — top-right (took over the category slot) */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {latestVersion && (
          <span className="mono" style={{
            padding: "3px 8px", borderRadius: 999,
            background: active ? "var(--color-primary-100, var(--color-primary-50))" : "var(--color-bg-3)",
            border: "1px solid",
            borderColor: active ? "var(--color-primary-500)" : "var(--color-border-subtle)",
            fontSize: 11, fontWeight: 500,
            color: active ? "var(--color-primary-700)" : "var(--color-text-secondary)",
            whiteSpace: "nowrap",
          }}>v{latestVersion.name}</span>
        )}
      </div>
    </button>
  );
}

// ─── Detail pane ──────────────────────────────────────────
function PoolDetailPane({ item, onSubscribe }) {
  const { app, latestVersion } = item;
  const publisher = (window.TENANT_NAMES || {})[app.publisherTenantId] || "—";
  const publishedVersions = (app.versions || []).filter(v => v.status === "published");
  // Recent versions to surface (most recent 4).
  const recentVersions = publishedVersions.slice(0, 4);

  return (
    <div style={{ padding: "24px 28px 32px", maxWidth: 880, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Hero */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <window.AppIcon app={app} size={72} radius={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{app.name}</h2>
          <div className="mono" style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-tertiary)" }}>{app.package}</div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <window.Pill tone="neutral" size="sm">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <window.Ico name="users" size={10} />
                {publisher}
              </span>
            </window.Pill>
            <window.Pill tone="accent" size="sm">{app.category}</window.Pill>
            {latestVersion && (
              <window.Pill tone="success" size="sm" dot>
                Latest v<span className="mono" style={{ marginLeft: 2 }}>{latestVersion.name}</span>
              </window.Pill>
            )}
          </div>
        </div>
        <window.Button primary icon="bookmark" onClick={onSubscribe}>Subscribe</window.Button>
      </div>

      {/* About */}
      <window.Card title="About">
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
          {app.description || "No description provided."}
        </p>
      </window.Card>

      {/* Metadata grid */}
      <window.Card title="Quick facts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px 24px" }}>
          <DetailKV label="Publisher" value={publisher} />
          <DetailKV label="Category"  value={app.category} />
          <DetailKV label="Latest version"
            value={latestVersion ? (
              <span className="mono">v{latestVersion.name} <span style={{ color: "var(--color-text-tertiary)" }}>· code {latestVersion.code}</span></span>
            ) : "—"} />
          <DetailKV label="Published"
            value={latestVersion?.publishedAt || "—"} />
          <DetailKV label="APK size"
            value={latestVersion ? <span className="mono">{latestVersion.size}</span> : "—"} />
          <DetailKV label="Permissions"
            value={latestVersion ? <span className="mono num">{latestVersion.perms}</span> : "—"} />
          <DetailKV label="Supported devices"
            value={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(app.devices || []).map(d => (
                  <span key={d} className="mono" style={{
                    padding: "1px 7px", borderRadius: 3,
                    background: "var(--color-bg-3)",
                    border: "1px solid var(--color-border-subtle)",
                    fontSize: 10.5, color: "var(--color-text-secondary)",
                  }}>{d}</span>
                ))}
              </div>
            } />
          <DetailKV label="Orientations"
            value={(app.orientations || []).map(o => o.charAt(0).toUpperCase() + o.slice(1)).join(" · ")} />
          <DetailKV label="Total versions"
            value={<span className="mono num">{publishedVersions.length}</span>} />
        </div>
      </window.Card>

      {/* What's in the latest version */}
      {latestVersion && (
        <window.Card title={<>What's new in <span className="mono" style={{ fontWeight: 500 }}>v{latestVersion.name}</span></>}
          hint={latestVersion.publishedAt ? `Published ${latestVersion.publishedAt}` : null}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
            {latestVersion.notes || "No release notes provided."}
          </p>
        </window.Card>
      )}

      {/* Screenshots — captured from the latest version's APK */}
      {latestVersion && (
        <window.Card title="Screenshots"
          hint={<>from <span className="mono">v{latestVersion.name}</span> · {(app.orientations || ["portrait"]).join(" · ")}</>}>
          <window.Screenshots app={app} version={latestVersion} count={4} size="md" />
        </window.Card>
      )}

      {/* Security scan — surfaces vulnerability report ahead of subscribe */}
      {latestVersion && <PoolScanCard app={app} version={latestVersion} />}

      {/* Version history (recent 4) */}
      {recentVersions.length > 1 && (
        <window.Card title="Recent versions" padding={0}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-bg-3)" }}>
                <th className="overline" style={{ padding: "8px 14px", fontSize: 10 }}>Version</th>
                <th className="overline" style={{ padding: "8px 14px", fontSize: 10 }}>Published</th>
                <th className="overline" style={{ padding: "8px 14px", fontSize: 10 }}>Size</th>
                <th className="overline" style={{ padding: "8px 14px", fontSize: 10 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {recentVersions.map((v, i) => (
                <tr key={v.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none" }}>
                  <td style={{ padding: "8px 14px", verticalAlign: "top" }}>
                    <span className="mono" style={{ fontWeight: 500 }}>v{v.name}</span>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 1 }}>code {v.code}</div>
                  </td>
                  <td className="mono" style={{ padding: "8px 14px", verticalAlign: "top", color: "var(--color-text-secondary)" }}>
                    {v.publishedAt || v.uploadedAt}
                  </td>
                  <td className="mono" style={{ padding: "8px 14px", verticalAlign: "top", color: "var(--color-text-secondary)" }}>
                    {v.size}
                  </td>
                  <td style={{ padding: "8px 14px", color: "var(--color-text-secondary)", maxWidth: 360 }}>
                    <span style={{
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>{v.notes || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </window.Card>
      )}

      {/* Floating subscribe CTA at the bottom for long pages */}
      <div style={{
        position: "sticky", bottom: 0, marginTop: 4,
        background: "linear-gradient(180deg, transparent, var(--color-bg-1) 30%)",
        padding: "20px 0 0",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          background: "var(--color-bg-2)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-1)",
        }}>
          <window.AppIcon app={app} size={32} radius={8} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Subscribe to {app.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
              Snapshot will be pinned at v{latestVersion?.name} · you control when to pull future updates
            </div>
          </div>
          <window.Button primary icon="bookmark" onClick={onSubscribe}>Subscribe</window.Button>
        </div>
      </div>
    </div>
  );
}

function DetailKV({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span className="overline" style={{ fontSize: 9.5 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

// ─── Security scan card ──────────────────────────────────
// Mirrors the version-detail scan summary: severity bar + per-severity counts
// + a "View findings" button (opens the existing FindingsModal). Handles the
// no-scan-data case explicitly so external pool apps without a `scan` tag
// don't look broken.
function PoolScanCard({ app, version }) {
  const [open, setOpen] = useStateBP(false);
  const scanKey = version.scan;
  const findings = scanKey && window.SCAN_FINDINGS_TEMPLATES
    ? (window.SCAN_FINDINGS_TEMPLATES[scanKey] || [])
    : null;
  const counts = findings && window.summariseFindings ? window.summariseFindings(findings) : null;

  // Classify so the card adapts tone + headline to the result.
  const tier = !counts ? "incomplete"
    : (counts.critical || 0) + (counts.high || 0) > 0 ? "high-risk"
    : (counts.medium || 0) > 0 ? "moderate"
    : "clean";

  const tone = tier === "high-risk" ? "danger"
            : tier === "moderate"   ? "info"
            : tier === "clean"      ? "success"
            : "warning";
  const toneColor = tier === "high-risk" ? "var(--color-error-700)"
                  : tier === "moderate"   ? "var(--color-info-700)"
                  : tier === "clean"      ? "var(--color-success-700)"
                  : "var(--color-warning-700)";
  const bgColor = tier === "high-risk" ? "var(--error-bg)"
               : tier === "moderate"   ? "var(--info-bg)"
               : tier === "clean"      ? "var(--success-bg)"
               : "var(--warning-bg)";

  const headline = tier === "high-risk" ? "Unresolved high-severity findings"
                : tier === "moderate"   ? "Mostly clean — minor findings only"
                : tier === "clean"      ? "Security scan clean"
                : "Scan report unavailable";

  return (
    <>
      <window.Card title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <window.Ico name="shieldCheck" size={14} style={{ color: toneColor }} />
          Security scan
        </span>
      }
      hint={<>scanned at upload · <span className="mono">v{version.name}</span></>}
      action={counts && counts.critical + counts.high + counts.medium + counts.low + counts.info > 0 && (
        <window.Button size="sm" iconRight="arrowR" onClick={() => setOpen(true)}>
          View findings
        </window.Button>
      )}>
        {/* Headline pill */}
        <div style={{
          padding: "10px 12px", marginBottom: 12,
          background: bgColor,
          border: "1px solid",
          borderColor: "var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <window.Pill tone={tone} dot size="sm">{tier === "high-risk" ? "High risk"
            : tier === "moderate" ? "Moderate"
            : tier === "clean" ? "Clean"
            : "Incomplete"}</window.Pill>
          <span style={{ fontSize: 12.5, color: toneColor, fontWeight: 500 }}>{headline}</span>
        </div>

        {!counts ? (
          <div style={{ fontSize: 12.5, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            No vulnerability scan has been published for this version yet. The publisher may release the report later, or you can request one in the app's detail page after subscribing.
          </div>
        ) : (
          <>
            {/* Counts grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
              marginBottom: 10,
            }}>
              {["critical", "high", "medium", "low", "info"].map(k => {
                const v = counts[k] || 0;
                const meta = (window.SEVERITY || {})[k] || { label: k, color: "var(--color-text-tertiary)" };
                return (
                  <div key={k} style={{
                    padding: "6px 8px", borderRadius: 6,
                    background: v > 0 ? "var(--color-bg-3)" : "transparent",
                    borderLeft: `3px solid ${meta.color}`,
                  }}>
                    <div style={{ fontSize: 9.5, textTransform: "uppercase",
                      letterSpacing: "0.06em", fontWeight: 500,
                      color: "var(--color-text-tertiary)" }}>{meta.label}</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 500,
                      color: v > 0 ? meta.color : "var(--color-text-tertiary)" }}>{v}</div>
                  </div>
                );
              })}
            </div>
            {window.SeverityBar && <window.SeverityBar counts={counts} height={6} />}
            {tier === "clean" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-success-700)",
                display: "inline-flex", alignItems: "center", gap: 6 }}>
                <window.Ico name="check" size={12} /> No findings reported on this version.
              </div>
            )}
          </>
        )}
      </window.Card>

      {open && window.FindingsModal && (
        <window.FindingsModal
          open
          onClose={() => setOpen(false)}
          findings={findings}
          counts={counts} />
      )}
    </>
  );
}

// ─── Subscribe config modal ───────────────────────────────
// Asks the user how they want to be notified of new versions from this
// publisher. Defaults to in-app notifications enabled, with the active
// operator as the target.
function SubscribeConfigModal({ open, onClose, item, onConfirm }) {
  // State is keyed to the current item — reset when it changes.
  const [notify, setNotify] = useStateBP(true);
  const [targets, setTargets] = useStateBP(() => new Set(["u-alex"]));
  const [methods, setMethods] = useStateBP(() => new Set(["inapp"]));
  const [targetSearch, setTargetSearch] = useStateBP("");

  useEffectBP(() => {
    if (open) {
      setNotify(true);
      setTargets(new Set(["u-alex"]));
      setMethods(new Set(["inapp"]));
      setTargetSearch("");
    }
  }, [open, item?.app.id]);

  if (!open) return null;
  const { app, latestVersion } = item;

  const toggleTarget = (id) => {
    setTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleMethod = (id) => {
    setMethods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredMembers = POOL_TEAM_MEMBERS.filter(m => {
    if (!targetSearch.trim()) return true;
    const n = targetSearch.toLowerCase();
    return `${m.name} ${m.role} ${m.email}`.toLowerCase().includes(n);
  });

  const canConfirm = !notify || (targets.size > 0 && methods.size > 0);

  const methodOptions = [
    { id: "inapp", label: "In-app message",
      sub: "Notification bell in the Carbon console",
      icon: "bell", available: true },
    { id: "email", label: "Email",
      sub: "Sent to each target's account email",
      icon: "mail", available: true },
    { id: "slack", label: "Slack",
      sub: "Posted to a workspace channel — requires workspace integration",
      icon: "chat", available: false },
  ];

  return (
    <window.Modal open onClose={onClose} width={620}
      title={<>Subscribe to <span style={{ fontWeight: 600 }}>{app.name}</span></>}
      subtitle={<>Snapshot pinned at <span className="mono">v{latestVersion?.name}</span> from {(window.TENANT_NAMES || {})[app.publisherTenantId] || "—"}. Configure new-version reminders below.</>}
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="bookmark" disabled={!canConfirm}
            onClick={() => onConfirm({ notify, targets, methods })}>
            Subscribe
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Notify toggle */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px",
          background: notify ? "var(--color-primary-50)" : "var(--color-bg-3)",
          border: "1px solid",
          borderColor: notify ? "var(--color-primary-500)" : "var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: notify ? "var(--color-primary-700)" : "var(--color-bg-2)",
            color: notify ? "var(--color-text-on-primary)" : "var(--color-text-tertiary)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <window.Ico name="bell" size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Notify me of new versions</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 2, lineHeight: 1.45 }}>
              When {(window.TENANT_NAMES || {})[app.publisherTenantId] || "the publisher"} ships a newer version, send a heads-up so the team can review and pull it.
            </div>
          </div>
          <button
            role="switch" aria-checked={notify}
            onClick={() => setNotify(v => !v)}
            className={`tds-switch ${notify ? "tds-switch--on" : ""}`}
            style={{ flexShrink: 0 }} />
        </div>

        {/* Targets */}
        <Section title="Reminder targets" required
          disabled={!notify}
          hint={notify
            ? `Pick the teammates who should get the heads-up. ${targets.size} selected.`
            : "Enable reminders to pick targets."}>
          {notify && (
            <>
              <window.Input size="sm" value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                prefix={<window.Ico name="search" size={12} />}
                placeholder="Search teammates by name or role…" />
              <div style={{
                marginTop: 8, maxHeight: 200, overflow: "auto",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-2)",
              }}>
                {filteredMembers.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    No teammates match "{targetSearch}".
                  </div>
                ) : filteredMembers.map((m, i) => {
                  const on = targets.has(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleTarget(m.id)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "8px 12px",
                      borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : "none",
                      background: on ? "var(--color-primary-50)" : "transparent",
                      textAlign: "left", cursor: "pointer",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: on ? "var(--color-primary-700)" : "var(--color-bg-3)",
                        border: "1px solid",
                        borderColor: on ? "transparent" : "var(--color-border-default)",
                        display: "grid", placeItems: "center",
                        color: "var(--color-text-on-primary)", flexShrink: 0,
                      }}>
                        {on && <window.Ico name="check" size={11} stroke={2.5} />}
                      </div>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "var(--color-bg-3)",
                        color: "var(--color-text-secondary)",
                        display: "grid", placeItems: "center",
                        fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                      }}>{m.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 500,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <span>{m.name}</span>
                          {m.self && (
                            <span style={{
                              fontSize: 9, padding: "1px 5px", borderRadius: 3,
                              background: "var(--color-bg-3)",
                              color: "var(--color-text-tertiary)",
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}>You</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {m.role} · <span className="mono">{m.email}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        {/* Methods */}
        <Section title="Reminder methods" required multi
          disabled={!notify}
          hint={notify ? "Pick one or more channels — we'll send through each." : null}>
          {notify && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {methodOptions.map(opt => {
                const on = methods.has(opt.id);
                const disabled = !opt.available;
                return (
                  <button key={opt.id}
                    disabled={disabled}
                    onClick={() => !disabled && toggleMethod(opt.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px",
                      background: disabled ? "var(--color-bg-3)" : on ? "var(--color-primary-50)" : "var(--color-bg-2)",
                      border: "1px solid",
                      borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
                      borderRadius: "var(--radius-md)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.7 : 1,
                      textAlign: "left",
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      background: on ? "var(--color-primary-700)" : "var(--color-bg-2)",
                      border: "1px solid",
                      borderColor: on ? "transparent" : "var(--color-border-default)",
                      display: "grid", placeItems: "center", color: "var(--color-text-on-primary)",
                      flexShrink: 0,
                    }}>
                      {on && <window.Ico name="check" size={11} stroke={2.5} />}
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: on ? "var(--color-primary-100, var(--color-primary-50))" : "var(--color-bg-3)",
                      color: on ? "var(--color-primary-700)" : "var(--color-text-secondary)",
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      <window.Ico name={opt.icon} size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span>{opt.label}</span>
                        {opt.id === "inapp" && (
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 3,
                            background: "var(--color-success-50)", color: "var(--color-success-700)",
                            border: "1px solid color-mix(in oklab, var(--color-success-500) 22%, transparent)",
                            textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                          }}>Default</span>
                        )}
                        {disabled && (
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 3,
                            background: "var(--color-warning-50)", color: "var(--color-warning-700)",
                            border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
                            textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                          }}>Needs setup</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                        {opt.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Helper note */}
        {notify && methods.has("slack") && (
          <div style={{
            padding: "10px 12px",
            background: "var(--color-warning-50)",
            border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
            borderRadius: "var(--radius-md)",
            display: "flex", gap: 10, alignItems: "flex-start",
            fontSize: 12, color: "var(--color-warning-700)", lineHeight: 1.5,
          }}>
            <window.Ico name="alert" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              Slack delivery is not yet configured for your organization. Subscribe now and finish the integration later in Settings — reminders will start once the workspace is linked.
            </div>
          </div>
        )}
      </div>
    </window.Modal>
  );
}

// Small wrapper around a labeled section in the modal. Greys out + disables
// the body when `disabled` is true.
function Section({ title, hint, required, multi, disabled, children }) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</span>
        {required && <span style={{ fontSize: 10, color: "var(--color-error-500)" }}>required</span>}
        {multi && (
          <span style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 3,
            background: "var(--color-bg-3)", color: "var(--color-text-tertiary)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>multi-select</span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}

// Expose
window.BrowsePoolScreen = BrowsePoolScreen;
