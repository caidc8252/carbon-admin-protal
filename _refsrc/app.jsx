/* global React, ReactDOM */
// ─────────────────────────────────────────────────────────────
// Carbon ISV Console — top-level app + routing
// ─────────────────────────────────────────────────────────────

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

// Tweakable defaults — host can rewrite these via __edit_mode_set_keys
const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "comfortable",
  "scenario": "active",
  "accent": "indigo",
  "activationStage": "list",
  "takedownTerm": "unpublish",
  "monitoringLayout": "proposed",
  "snLinkMode": false
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  indigo: { p50: "oklch(97% 0.012 262)", p200: "oklch(86% 0.06 262)", p500: "oklch(40% 0.14 262)",
            p600: "oklch(32% 0.10 262)", p700: "oklch(24% 0.06 262)" },
  cyan:   { p50: "oklch(97% 0.02 220)",  p200: "oklch(86% 0.08 220)", p500: "oklch(56% 0.14 220)",
            p600: "oklch(42% 0.12 220)", p700: "oklch(30% 0.10 220)" },
  emerald:{ p50: "oklch(96% 0.03 160)",  p200: "oklch(86% 0.08 160)", p500: "oklch(54% 0.14 158)",
            p600: "oklch(42% 0.13 158)", p700: "oklch(30% 0.10 158)" },
  graphite:{p50: "oklch(96% 0.005 270)", p200: "oklch(82% 0.008 270)", p500: "oklch(36% 0.01 270)",
            p600: "oklch(28% 0.01 270)", p700: "oklch(22% 0.01 270)" },
};

function App() {
  const [t, setTweak] = window.useTweaks(DEFAULTS);
  // Initial route picks whichever app surface the active tenant has access
  // to. Dual-contract tenants start in App Publish (workflow order).
  const initialTenant = (window.TENANTS || []).find(x => x.id === "acme-sw") || (window.TENANTS || [])[0];
  const initialEntry = (initialTenant?.contracts || ["ISV"]).includes("ISV") ? "appPublish" : "appStore";
  const [route, setRoute] = useStateA({ screen: initialEntry });
  const [apps, setApps] = useStateA(window.APPS);
  // Helper: write to both React state AND the module-scoped window.APPS
  // array. Several screens (PoolAppsList → buildPoolItems, dialogs) read
  // from window.APPS directly, so we have to keep them in lockstep for the
  // demo to feel real — new apps appear in the list, new versions appear
  // on app detail without a page refresh.
  const commitApps = (nextApps) => {
    setApps(nextApps);
    if (Array.isArray(window.APPS)) {
      window.APPS.length = 0;
      window.APPS.push(...nextApps);
    }
  };

  const [toast, setToast] = useStateA(null);
  const [rolloutPromptOpen, setRolloutPromptOpen] = useStateA(false);

  // ─── Sidebar collapse state ─────────────────────────────────
  // Persisted to localStorage so the user's preference survives a
  // reload. Toggle from the TopBar button or the `[` keyboard shortcut.
  const [sidebarCollapsed, setSidebarCollapsed] = useStateA(() => {
    try { return localStorage.getItem("carbon.sidebarCollapsed") === "1"; }
    catch { return false; }
  });
  useEffectA(() => {
    try { localStorage.setItem("carbon.sidebarCollapsed", sidebarCollapsed ? "1" : "0"); }
    catch {}
  }, [sidebarCollapsed]);
  useEffectA(() => {
    const onKey = (e) => {
      // Don't steal `[` while the user is typing in a field
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSidebarCollapsed(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // browse-pool fires this after a successful Subscribe so the prompt
  // opens on top of the BrowsePool screen.
  useEffectA(() => {
    const onOpen = () => setRolloutPromptOpen(true);
    window.addEventListener("__open_rollout_prompt", onOpen);
    return () => window.removeEventListener("__open_rollout_prompt", onOpen);
  }, []);

  // Apply accent preset
  useEffectA(() => {
    const p = ACCENT_PRESETS[t.accent] || ACCENT_PRESETS.indigo;
    const root = document.documentElement;
    root.style.setProperty("--color-primary-50",  p.p50);
    root.style.setProperty("--color-primary-200", p.p200);
    root.style.setProperty("--color-primary-500", p.p500);
    root.style.setProperty("--color-primary-600", p.p600);
    root.style.setProperty("--color-primary-700", p.p700);
  }, [t.accent]);

  // Publish the take-down terminology choice so shared components can branch.
  useEffectA(() => {
    window.__takedownTerm = t.takedownTerm || "unpublish";
  }, [t.takedownTerm]);

  // Propagate Monitoring-tab layout choice ("current" | "proposed") to a
  // window global + a custom event, so DeviceMonitoringTab (deep in
  // devices.jsx, reused inside the Workbench's Monitoring tab) can
  // subscribe without prop-drilling.
  useEffectA(() => {
    window.__monitoringLayout = t.monitoringLayout || "proposed";
    window.dispatchEvent(new CustomEvent("monitoring-layout:change",
      { detail: window.__monitoringLayout }));
  }, [t.monitoringLayout]);

  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", t.theme === "dark" ? "dark" : "light");
  }, [t.theme]);

  // Showing a toast
  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  };

  // Expose to other JSX modules so deep children (settings, status card,
  // version detail) can fire toasts without prop-drilling. This is the
  // canonical user-feedback channel for actions in the prototype — prefer
  // it over native alert() / confirm() unless the action is destructive
  // enough to require an explicit yes/no.
  useEffectA(() => { window.showToast = showToast; });

  // Expose navigation globally so deep children that aren't passed a
  // `navigate` prop (e.g. DeviceBasicTab → Deployment merchant link)
  // can fall back to window.__navigate. Set on every render so the
  // closure always points at the freshest setRoute.
  useEffectA(() => { window.__navigate = setRoute; });

  // ─── In-app tab system ───────────────────────────────
  // A single "Carbon Console" main tab plus 0+ workbench tabs.
  // Each workbench tab keeps its own ticket id; closing returns
  // the user to the tab they came from (usually main).
  const MAIN_TAB_ID = "main";
  const [tabs, setTabs] = useStateA([
    { id: MAIN_TAB_ID, kind: "main", label: "Carbon Console" },
  ]);
  const [activeTabId, setActiveTabId] = useStateA(MAIN_TAB_ID);
  const tabOriginRef = useRefA({});

  const openWorkbenchTab = (ticketId) => {
    if (!ticketId) return;
    const id = "wb-" + ticketId;
    setTabs(prev => prev.find(x => x.id === id) ? prev
      : [...prev, { id, kind: "workbench", ticketId, label: ticketId }]);
    setActiveTabId(prevActive => {
      tabOriginRef.current[id] = tabOriginRef.current[id] || prevActive || MAIN_TAB_ID;
      return id;
    });
  };

  const closeTab = (id) => {
    if (id === MAIN_TAB_ID) return;
    setTabs(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx < 0) return prev;
      const next = prev.filter(x => x.id !== id);
      setActiveTabId(curr => {
        if (curr !== id) return curr;
        const origin = tabOriginRef.current[id];
        if (origin && next.find(x => x.id === origin)) return origin;
        return (next[idx - 1] || next[0])?.id || MAIN_TAB_ID;
      });
      delete tabOriginRef.current[id];
      return next;
    });
  };

  // Expose the workbench opener for tickets.jsx (Take handler +
  // "Open Workbench" button). Set on every render so the closure
  // always points at the freshest setters. The `openWorkbenchInNewWindow`
  // alias is kept for tickets.jsx callers that still use the old name.
  useEffectA(() => {
    window.openWorkbenchTab = openWorkbenchTab;
    window.openWorkbenchInNewWindow = openWorkbenchTab;
  });

  const activeTab = tabs.find(x => x.id === activeTabId) || tabs[0];
  const onWorkbench = activeTab?.kind === "workbench";

  // From a workbench tab, navigating to a route should close the
  // workbench tab and put main on that route.
  const navigateFromWorkbench = (target) => {
    setRoute(target);
    const origin = tabOriginRef.current[activeTabId] || MAIN_TAB_ID;
    setActiveTabId(origin);
    closeTab(activeTabId);
  };

  // Find current app from route
  const currentApp = route.appId ? apps.find(a => a.id === route.appId) : null;
  const currentVersion = currentApp && route.versionId
    ? currentApp.versions.find(v => v.id === route.versionId) : null;

  // Merchant module lookups
  const currentMerchant = route.merchantId ? window.findMerchantById?.(route.merchantId) : null;
  const goMerchants      = () => setRoute({ screen: "merchants" });
  const goMerchantDetail = (id, tab = "overview") => setRoute({ screen: "merchantDetail", merchantId: id, tab });
  const openNewMerchant  = () => setRoute({ screen: "newMerchant" });

  // Device module lookups
  const currentDevice = route.deviceSn ? window.findDeviceBySn?.(route.deviceSn) : null;

  // Ticket module lookups
  const currentTicket = route.ticketId ? window.findTicketById?.(route.ticketId) : null;

  // Which app-list entry sent us into a detail route? Used for breadcrumbs
  // + sidebar highlight + the "back" target.
  const fromEntry = route.from || "appPublish";

  // Navigation helpers
  const goApps      = () => setRoute({ screen: fromEntry });
  const goAppDetail = (appId, tab = "overview") => setRoute({ screen: "appDetail", appId, tab, from: fromEntry });
  const openNewApp  = () => setRoute({ screen: "newApp", from: "appPublish" });
  const openEditApp = (a) => setRoute({ screen: "editApp", appId: a.id, from: fromEntry });
  const openPublishWizard = (a) => setRoute({ screen: "publishWizard", appId: a ? a.id : null, from: "appPublish" });

  // Density var
  const densityFontSize = t.density === "compact" ? 12.5 : t.density === "spacious" ? 14 : 13;

  return (
    <div className="carbon-root" style={{ fontSize: densityFontSize,
      display: "flex", flexDirection: "column" }}>
      {tabs.length > 1 && (
        <TabStrip tabs={tabs} activeTabId={activeTabId}
          onSelect={setActiveTabId} onClose={closeTab} />
      )}
      {onWorkbench ? (
        // Active workbench tab. Keep the main tree mounted (display:none)
        // so its state survives a round-trip.
        <>
          <div style={{ display: "none" }}>
            <window.Sidebar route={route} navigate={setRoute} collapsed={sidebarCollapsed} />
          </div>
          <WorkbenchTabHost
            key={activeTab.id}
            ticketId={activeTab.ticketId}
            onClose={() => closeTab(activeTab.id)}
            onNavigateMain={navigateFromWorkbench} />
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
          <window.Sidebar route={route} navigate={setRoute} collapsed={sidebarCollapsed} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <window.TopBar
          crumbs={makeCrumbs(route, currentApp, currentVersion, setRoute)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
          onBellClick={() => setRoute({ screen: "deviceHealth" })}
          bellCount={window.deviceHealthWarningCount?.() || 0}
          actions={null} />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Apps list — split into two routes by entry point. */}
          {(route.screen === "appPublish" || route.screen === "appStore" || route.screen === "apps") && (
            <window.AppsListScreen
              mode={route.screen === "appStore" ? "store" : "publish"}
              navigate={setRoute}
              openNewApp={openNewApp}
              openPublishWizard={openPublishWizard} />
          )}
          {route.screen === "appDetail" && currentApp && (
            <window.AppDetailScreen
              app={currentApp} route={route} navigate={setRoute}
              openPublishWizard={openPublishWizard}
              openEditApp={openEditApp} />
          )}
          {route.screen === "versionDetail" && currentApp && currentVersion && (
            <window.VersionDetailScreen
              app={currentApp} version={currentVersion}
              route={route} navigate={setRoute} />
          )}
          {route.screen === "newApp" && (
            <window.AppFormScreen mode="new" onClose={goApps}
              onSave={({ name, pkg, category, description, devices, orientations, publishMode }) => {
                const tenant = window.__activeTenant;
                const isPureISV = tenant && !tenant.contracts.includes("ISO");
                // New model: every freshly-created app is "published"
                // (lifecycle). publishMode decides whether it's listed
                // publicly (All ISOs) or hidden (Specified ISOs).
                const isPublic = publishMode === "public";
                const initialNote = isPublic
                  ? "Created and listed in the public pool — all ISOs can subscribe."
                  : isPureISV
                    ? "Created in Specified ISOs mode — generate invite links from the app detail page to grant access."
                    : "Created in Specified ISOs mode — only ISOs you pick can subscribe. Your own tenant is included by default.";
                const newApp = {
                  id: pkg.replace(/\./g, "_"),
                  name, package: pkg, category, description,
                  devices: [...devices],
                  orientations: [...(orientations || ["portrait"])],
                  status: "published",
                  publishMode,                       // "public" | "private"
                  publisherTenantId: tenant?.id || "acme-sw",
                  subscriberIds: [],
                  versions: [],
                  reviewActivity: [
                    { kind: "created", at: "just now", actor: "You",
                      note: initialNote },
                    { kind: "published", at: "just now", actor: "You",
                      note: isPublic
                        ? "Published with All ISOs visibility."
                        : "Published with Specified ISOs visibility." },
                  ],
                };
                commitApps([newApp, ...apps]);
                showToast(isPublic
                  ? `${name} created · listed in the public pool — upload a version to make it available`
                  : (isPureISV
                      ? `${name} created · Specified ISOs mode — generate invite links from the app detail page`
                      : `${name} created · Specified ISOs mode — only the ISOs you pick can subscribe`));
                goAppDetail(newApp.id);
              }} />
          )}
          {route.screen === "editApp" && currentApp && (
            <window.AppFormScreen mode="edit" app={currentApp}
              onClose={() => goAppDetail(currentApp.id)}
              onSave={({ name, pkg, category, description, devices, orientations }) => {
                // Metadata edits save immediately — no review in the new model.
                commitApps(apps.map(a => a.id === currentApp.id
                  ? { ...a, name, package: pkg, category, description,
                      devices: [...devices],
                      orientations: [...(orientations || ["portrait"])],
                    }
                  : a));
                showToast(`${name} updated`);
                goAppDetail(currentApp.id);
              }} />
          )}
          {route.screen === "browsePool" && (
            <window.BrowsePoolScreen
              onClose={() => setRoute({ screen: "appStore" })}
              presetAppId={route.presetAppId}
              inviteToken={route.inviteToken}
              navigate={setRoute} />
          )}
          {route.screen === "publishWizard" && (
            <window.PublishWizardScreen app={currentApp || null}
              onClose={() => currentApp ? goAppDetail(currentApp.id, "versions") : goApps()}
              onPublish={(payload) => {
                const target = payload.app;
                if (!target) {
                  showToast(`Version ${payload.parsed?.version} uploaded`);
                  goApps();
                  return;
                }

                // ─── Mock-cache write: append the new version ──────
                // The wizard hands us a parsed APK + release notes + a
                // fixture scan template. Build a version object that
                // matches the seed-data shape and push it onto the target
                // app's versions array so all downstream screens (version
                // list, detail, store) see it.
                const isFirstVersion = (target.versions || []).length === 0;
                const newVersionId = `v-${Date.now().toString(36)}`;
                const today = new Date().toLocaleDateString("en-US",
                  { month: "short", day: "2-digit", year: "numeric" });
                const newVersion = {
                  id: newVersionId,
                  code: payload.parsed?.code,
                  name: payload.parsed?.version,
                  iconSeed: `${payload.parsed?.package}#${payload.parsed?.code}`,
                  size: payload.parsed?.size,
                  uploadedAt: today,
                  publishedAt: today,
                  status: "published",
                  scan: payload.scanTemplate || "cleanish",
                  current: true,
                  notes: payload.versionNotes || "",
                  signer: payload.parsed?.signer
                    ? `${payload.parsed.signer} · ${payload.parsed.fingerprint || ""}`.trim()
                    : undefined,
                  perms: payload.parsed?.perms,
                  minSdk: payload.parsed?.minSdk,
                  targetSdk: payload.parsed?.targetSdk,
                  rolloutPct: 0,
                  reach: (target.subscriberIds || []).length,
                };
                // Clear `current` on every existing version, prepend new one.
                const nextVersions = [
                  newVersion,
                  ...(target.versions || []).map(v => ({ ...v, current: false })),
                ];
                const nextApp = {
                  ...target,
                  versions: nextVersions,
                  reviewActivity: [...(target.reviewActivity || []), {
                    kind: "version-uploaded", at: "just now", actor: "You",
                    note: `${newVersion.name} uploaded.`,
                  }],
                };

                // ─── First-version handling ─────────────────────────
                // In the new model every app is "published" lifecycle-wise
                // from creation, regardless of publishMode. No auto-promote
                // dance needed — just commit the version and move on.
                const tenant = window.__activeTenant;
                const isPureISV = tenant && !tenant.contracts.includes("ISO");

                commitApps(apps.map(a => a.id === target.id ? nextApp : a));

                // ─── Rollout prompt for ISV+ISO operators ──────────
                // If the publisher's tenant is also an ISO (their own
                // merchants need the app too) AND the operator has
                // merchant-rollout permission, ask whether to immediately
                // roll out to merchants. Fires for BOTH All-ISOs and
                // Specified-ISOs apps — the point of a Specified-ISOs app
                // IS that the publisher wants to install it on their own
                // merchants. Pure-ISV publishers skip the prompt (no
                // merchant fleet).
                const perms = window.TENANT_PERMISSIONS?.[tenant?.id] || {};
                const canRollout = !!perms.canRolloutMerchants;
                const hasIsoContract = tenant?.contracts?.includes("ISO");

                if (canRollout && hasIsoContract) {
                  // Ask before navigating; "yes" routes to the Rollout
                  // wizard, "no" routes to the version detail page.
                  window.__rolloutPrompt = {
                    appId: target.id,
                    versionId: newVersionId,
                    fromEntry: "appPublish",
                    fallback: { screen: "versionDetail", appId: target.id, versionId: newVersionId, from: "appPublish" },
                    sourceLabel: `${target.name} ${newVersion.name} published`,
                  };
                  setRolloutPromptOpen(true);
                  showToast(`${newVersion.name} of ${target.name} published`, "success");
                  return;
                }

                if (isFirstVersion) {
                  showToast(`${target.name} · first version uploaded`, "success");
                } else {
                  showToast(`${payload.parsed?.version} of ${target.name} uploaded`);
                }
                goAppDetail(target.id, "versions");
              }} />
          )}
          {route.screen === "approval" && currentApp && currentVersion && (
            <window.ApprovalScreen
              app={currentApp} version={currentVersion} route={route}
              onCancel={() => goAppDetail(currentApp.id, "versions")}
              onApproveAndRollout={({ app: ap, next }) => {
                const tenant = window.__activeTenant;
                // Clear the pending notification (the operator has now reviewed).
                window.clearPendingApproval?.(tenant?.id, ap.id, next.id);
                // Flip the subscribed version to the just-approved one so
                // "current" reflects what the operator just approved.
                const subs = (window.SUBSCRIBED_APPS || {})[tenant?.id] || [];
                const entry = subs.find(s => s.appId === ap.id);
                if (entry) {
                  entry.subscribedVersionId = next.id;
                  entry.subscribedAt = "just now";
                }
                showToast(`${ap.name} ${next.name} approved`, "success");
                // Ask whether to roll out now. Yes → Rollout wizard;
                // No → Version detail page.
                const perms = window.TENANT_PERMISSIONS?.[tenant?.id] || {};
                if (perms.canRolloutMerchants) {
                  window.__rolloutPrompt = {
                    appId: ap.id,
                    versionId: next.id,
                    fromEntry: "appStore",
                    fallback: { screen: "versionDetail", appId: ap.id, versionId: next.id, from: "appStore" },
                    sourceLabel: `${ap.name} ${next.name} approved`,
                  };
                  setRolloutPromptOpen(true);
                } else {
                  setRoute({ screen: "versionDetail", appId: ap.id, versionId: next.id, from: "appStore" });
                }
              }} />
          )}
          {route.screen === "pullWizard" && (
            // Rollouts are now managed inline from App detail → Deployments.
            // Any stale `screen: "pullWizard"` route lands the operator
            // there instead (defensive — should not normally fire).
            (() => {
              setTimeout(() => setRoute({
                screen: "appDetail",
                appId: route.appId,
                tab: "deployments",
                filterVersionId: route.versionId,
                from: route.from || "appStore",
              }), 0);
              return null;
            })()
          )}
          {(route.screen === "home"      || route.screen === "versions"
         || route.screen === "settings") && (
            <PlaceholderScreen route={route} />
          )}
          {route.screen === "merchants" && (
            <window.MerchantsListScreen
              navigate={setRoute}
              openNewMerchant={openNewMerchant} />
          )}
          {route.screen === "merchantDetail" && currentMerchant && (
            <window.MerchantDetailScreen
              merchant={currentMerchant} route={route} navigate={setRoute} />
          )}
          {route.screen === "newMerchant" && (
            <window.NewMerchantScreen
              onClose={goMerchants}
              onSave={({ name, country, tags, notes, address, phoneCountryCode, phone, email }) => {
                const id = `m-${Date.now().toString(36)}`;
                const now = "just now";
                // HQ store is created as a one-time COPY of the merchant
                // fields the user just entered (name + country + address).
                // After creation the HQ store lives independently —
                // editing the merchant later doesn't sync back to the
                // store, per spec.
                const hq = {
                  id: `s-${id.replace(/^m-/, "")}-hq`,
                  isHQ: true,
                  name,
                  address: address || "",
                  country,
                  notes: "",
                  createdAt: now, updatedAt: now,
                };
                const operator = window.currentOperatorName?.() || "M. Hassan";
                const newM = {
                  id, name, country,
                  address:          address          || "",
                  phoneCountryCode: phoneCountryCode || "",
                  phone:            phone            || "",
                  email:            email            || "",
                  tags: tags || [], notes: notes || "",
                  createdAt: now, updatedAt: now,
                  // Default MERCHANT contract — the merchant is active on
                  // create. ISO operators can then bind MERCHANT_PORTAL
                  // separately from the Contracts tab.
                  contracts: window.defaultMerchantContracts
                    ? window.defaultMerchantContracts(now, operator)
                    : [{ type: "MERCHANT", grantedAt: now, expiresAt: null, status: "active", operator }],
                  apps: [],
                  operators: [],
                  stores: [hq],
                  terminals: [],
                };
                (window.MERCHANTS || []).unshift(newM);
                window.bumpMerchants?.();
                showToast(`${name} created · headquarter store auto-created`, "success");
                goMerchantDetail(id);
              }} />
          )}
          {route.screen === "devices" && (
            <window.DevicesListScreen navigate={setRoute} />
          )}
          {route.screen === "deviceDetail" && currentDevice && (
            <window.DeviceDetailScreen
              device={currentDevice} route={route} navigate={setRoute} />
          )}
          {route.screen === "firmware" && (
            <window.FirmwareListScreen navigate={setRoute} />
          )}
          {route.screen === "firmwareDetail" && (() => {
            const fw = window.findFirmwareById?.(route.firmwareId);
            if (!fw) {
              return (
                <div style={{ padding: 40, height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--color-bg-1)" }}>
                  <window.Empty icon="alert" title="Firmware not found"
                    body={<>The firmware id <code>{route.firmwareId}</code> isn't in the catalog.</>}
                    action={<window.Button onClick={() => setRoute({ screen: "firmware" })}>Back to firmware list</window.Button>} />
                </div>
              );
            }
            return <window.FirmwareDetailScreen firmware={fw} route={route} navigate={setRoute} />;
          })()}
          {route.screen === "firmwareVersionDetail" && (() => {
            const fw = window.findFirmwareById?.(route.firmwareId);
            const v = fw && window.findFirmwareVersion?.(fw, route.versionId);
            if (!fw || !v) {
              return (
                <div style={{ padding: 40, height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--color-bg-1)" }}>
                  <window.Empty icon="alert" title="Version not found"
                    body={<>That firmware version isn't in the catalog.</>}
                    action={<window.Button onClick={() => setRoute({ screen: "firmware" })}>Back to firmware list</window.Button>} />
                </div>
              );
            }
            return <window.FirmwareVersionDetailScreen firmware={fw} version={v} route={route} navigate={setRoute} />;
          })()}
          {route.screen === "tickets" && (
            <window.TicketsListScreen navigate={setRoute} />
          )}
          {route.screen === "newTicket" && (
            <window.NewTicketScreen navigate={setRoute} presetSn={route.deviceSn} />
          )}
          {route.screen === "ticketDetail" && currentTicket && (
            <window.TicketDetailScreen ticket={currentTicket} navigate={setRoute} />
          )}
          {route.screen === "deviceHealth" && (
            <window.DeviceHealthScreen navigate={setRoute} />
          )}
          {route.screen === "batteryHealth" && (
            <window.BatteryHealthScreen navigate={setRoute} />
          )}
          {route.screen === "notifications" && (
            <window.NotificationsScreen navigate={setRoute} />
          )}
          {route.screen === "sample-activation" && (
            <window.SampleDevicesPage
              presetState={route.presetState}
              presetCode={route.presetCode} />
          )}
          {route.screen === "sample-orders" && (
            <window.SampleOrdersPage />
          )}
        </div>
      </main>
        </div>
      )}

      <window.Toast toast={toast} onClose={() => setToast(null)} />

      {/* Rollout prompt — opened by publish-wizard onPublish and by
          browse-pool handleSubscribed. window.__rolloutPrompt holds the
          target {appId, versionId, fallback, sourceLabel}; clicking Yes
          jumps to the App detail's Deployments tab where the operator
          edits target versions / strategies and saves via "Save changes".
          No falls back to fallback. */}
      <window.RolloutPromptModal
        open={rolloutPromptOpen}
        ctx={window.__rolloutPrompt}
        onClose={() => setRolloutPromptOpen(false)}
        onYes={() => {
          const ctx = window.__rolloutPrompt;
          setRolloutPromptOpen(false);
          if (!ctx) return;
          // Force the subscriber tab set ("appStore" entry) so the
          // Deployments tab actually exists — publisher view (appPublish)
          // doesn't have a Deployments tab and would silently fall back
          // to Overview.
          setRoute({ screen: "appDetail", appId: ctx.appId, tab: "deployments",
                     filterVersionId: ctx.versionId, from: "appStore" });
        }}
        onNo={() => {
          const ctx = window.__rolloutPrompt;
          setRolloutPromptOpen(false);
          if (ctx?.fallback) setRoute(ctx.fallback);
        }} />

      {/* First-version publish-to-pool prompt removed — ISV+ISO tenants
          now choose their publish destination at app-creation time. */}

      <window.TweaksPanel>
        <window.TweakSection label="Appearance" />
        <window.TweakRadio  label="Theme"   value={t.theme}   options={["light", "dark"]}
                            onChange={(v) => setTweak("theme", v)} />
        <window.TweakSelect label="Density" value={t.density} options={["compact", "comfortable", "spacious"]}
                            onChange={(v) => setTweak("density", v)} />
        <window.TweakSelect label="Accent"  value={t.accent}  options={["indigo", "cyan", "emerald", "graphite"]}
                            onChange={(v) => setTweak("accent", v)} />
        <window.TweakSection label="Monitoring tab" />
        <window.TweakRadio  label="Layout"
                            value={t.monitoringLayout}
                            options={["current", "proposed"]}
                            onChange={(v) => setTweak("monitoringLayout", v)} />
        <window.TweakSection label="Copywriting" />
        <window.TweakRadio  label="Take-down term"
                            value={t.takedownTerm}
                            options={["unpublish", "remove"]}
                            onChange={(v) => setTweak("takedownTerm", v)} />
        <window.TweakSection label="Permissions (mock)" />
        <window.TweakSelect label="Northbay · Rollout merchants"
                            value={(window.TENANT_PERMISSIONS?.northbay?.canRolloutMerchants ?? true) ? "Yes" : "No"}
                            options={["Yes", "No"]}
                            onChange={(v) => {
                              if (window.TENANT_PERMISSIONS) {
                                window.TENANT_PERMISSIONS.northbay = window.TENANT_PERMISSIONS.northbay || {};
                                window.TENANT_PERMISSIONS.northbay.canRolloutMerchants = v === "Yes";
                              }
                            }} />
        <window.TweakSelect label="Summit · Rollout merchants"
                            value={(window.TENANT_PERMISSIONS?.summit?.canRolloutMerchants ?? true) ? "Yes" : "No"}
                            options={["Yes", "No"]}
                            onChange={(v) => {
                              if (window.TENANT_PERMISSIONS) {
                                window.TENANT_PERMISSIONS.summit = window.TENANT_PERMISSIONS.summit || {};
                                window.TENANT_PERMISSIONS.summit.canRolloutMerchants = v === "Yes";
                              }
                            }} />

        <window.TweakSection label="Jump to" />
        <window.TweakButton onClick={() => setRoute({ screen: "appPublish" })}>App Publish list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appStore" })}>App Store list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "browsePool" })}>Subscribe from pool</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "approval", appId: "pos", versionId: "v32", from: "appStore" })}>Approval · POS v32 (waiting)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "approval", appId: "inventory", versionId: "v12", from: "appStore" })}>Approval · Stockroom v12 (waiting)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "versionDetail", appId: "pos", versionId: "v32", from: "appPublish" })}>Version detail · POS Pro v32 (invite history)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "versionDetail", appId: "loyalty", versionId: "v07", from: "appPublish" })}>Version detail · Loyalty rc1 (invite-only)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "pos", tab: "overview", from: "appPublish" })}>App detail · Acme POS Pro</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "delivery", tab: "overview", from: "appPublish" })}>Private · Curbside (ISV+ISO)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "timeclock", tab: "overview", from: "appPublish" })}>Published · Timeclock</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "giftcard", tab: "overview", from: "appPublish" })}>Private · Giftcards (ISV+ISO)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "tablemanager", tab: "overview", from: "appPublish" })}>Private · no versions yet</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "pos", tab: "settings", from: "appPublish" })}>App settings · Acme POS Pro</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appDetail", appId: "pos", tab: "versions", from: "appPublish" })}>Version history</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "versionDetail", appId: "loyalty", versionId: "v07", from: "appPublish" })}>Version detail · Loyalty+ rc1</window.TweakButton>
        <window.TweakButton onClick={() => { setRoute({ screen: "publishWizard", appId: "pos", from: "appPublish" }); }}>Open publish wizard</window.TweakButton>
        <window.TweakButton onClick={() => { setRoute({ screen: "publishWizard", appId: "delivery", from: "appPublish" }); }}>Publish wizard · first publish (Curbside)</window.TweakButton>
        <window.TweakButton onClick={() => { setRoute({ screen: "newApp", from: "appPublish" }); }}>Open "new app" form</window.TweakButton>
        <window.TweakSection label="Device Health (new)" />
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "deviceHealth" }); }}>Device Health · monitor</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "batteryHealth" }); }}>Battery Health · charts + terminals</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "notifications" }); }}>Notifications · event routing</window.TweakButton>
        <window.TweakSection label="Tickets" />
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "tickets" }); }}>Tickets list</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "newTicket" }); }}>New ticket form</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "ticketDetail", ticketId: "T-2026-001" }); }}>Auto-created · awaiting triage</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "ticketDetail", ticketId: "T-2026-008" }); }}>ISO working · running detect</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "ticketDetail", ticketId: "T-2026-003" }); }}>Critical · escalated to NPT</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "ticketDetail", ticketId: "T-2026-005" }); }}>NPT replied · POS Pro hotfix</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "ticketDetail", ticketId: "T-2026-006" }); }}>Closed · how-to question</window.TweakButton>
        <window.TweakSection label="Workbench" />
        <window.TweakButton onClick={() => openWorkbenchTab("T-2026-008")}>Workbench · ISO Working ticket</window.TweakButton>
        <window.TweakButton onClick={() => openWorkbenchTab("T-2026-003")}>Workbench · Escalated (Critical)</window.TweakButton>
        <window.TweakButton onClick={() => openWorkbenchTab("T-2026-004")}>Workbench · NPT working</window.TweakButton>
        <window.TweakSection label="Firmware" />
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmware" }); }}>Firmware list</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmwareDetail", firmwareId: "fw-n950-a12" }); }}>Firmware detail · N950 / A12</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmwareDetail", firmwareId: "fw-x800-std" }); }}>Detail · X800 / STD (RTOS)</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmwareDetail", firmwareId: "fw-n950-a12", tab: "deployments" }); }}>Detail · N950 / A12 · Deployments tab</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmwareVersionDetail", firmwareId: "fw-n950-a12", versionId: "fwv-n950-a12-v231" }); }}>Version detail · N950 / A12 / V2.3.1</window.TweakButton>
        <window.TweakButton onClick={() => { setActiveTabId(MAIN_TAB_ID); setRoute({ screen: "firmwareVersionDetail", firmwareId: "fw-s60-a12", versionId: "fwv-s60-a12-v170" }); }}>Version detail · S60 / A12 / V1.7.0 (withdrawn)</window.TweakButton>
        <window.TweakSection label="Devices" />
        <window.TweakButton onClick={() => setRoute({ screen: "devices" })}>Devices list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "N950-0014-9281" })}>Clean N950 · Riverside HQ</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "N750-0099-0040" })}>Flagged N750 (rooted)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "S60-0488-0021" })}>Dev-mode S60</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "X800-0099-1422" })}>Ethernet kiosk X800</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "S90-0822-2007" })}>Pending activation S90</window.TweakButton>
      </window.TweaksPanel>
    </div>
  );
}

// ─── Breadcrumbs ──────────────────────────────────────────
function makeCrumbs(route, app, version, navigate) {
  // Detail routes carry a `from` field to remember which app-list entry
  // they were reached from; that drives the breadcrumb's first link.
  const fromEntry = route.from || "appPublish";
  const homeLabel = fromEntry === "appStore" ? "App Store" : "App Publish";
  const home = { label: homeLabel, href: true, onClick: () => navigate({ screen: fromEntry }) };
  if (route.screen === "appPublish")    return [{ label: "App Publish" }];
  if (route.screen === "appStore")      return [{ label: "App Store" }];
  if (route.screen === "apps")          return [{ label: "App Publish" }];
  if (route.screen === "home")          return [{ label: "Home" }];
  if (route.screen === "versions")      return [{ label: "Versions" }];
  if (route.screen === "settings")      return [{ label: "Settings" }];
  if (route.screen === "merchants")     return [{ label: "Merchants" }];
  if (route.screen === "newMerchant")
    return [
      { label: "Merchants", href: true, onClick: () => navigate({ screen: "merchants" }) },
      { label: "New merchant" },
    ];
  if (route.screen === "merchantDetail") {
    const m = window.findMerchantById ? window.findMerchantById(route.merchantId) : null;
    return [
      { label: "Merchants", href: true, onClick: () => navigate({ screen: "merchants" }) },
      { label: m?.name || route.merchantId },
    ];
  }
  if (route.screen === "devices") return [{ label: "Devices" }];
  if (route.screen === "firmware") return [{ label: "Firmware" }];
  if (route.screen === "firmwareDetail") {
    const fw = window.findFirmwareById ? window.findFirmwareById(route.firmwareId) : null;
    return [
      { label: "Firmware", href: true, onClick: () => navigate({ screen: "firmware" }) },
      { label: fw ? `${fw.modelCode} · ${fw.deviceFlag}` : route.firmwareId, mono: true },
    ];
  }
  if (route.screen === "firmwareVersionDetail") {
    const fw = window.findFirmwareById ? window.findFirmwareById(route.firmwareId) : null;
    const v  = fw && window.findFirmwareVersion ? window.findFirmwareVersion(fw, route.versionId) : null;
    return [
      { label: "Firmware", href: true, onClick: () => navigate({ screen: "firmware" }) },
      { label: fw ? `${fw.modelCode} · ${fw.deviceFlag}` : route.firmwareId, mono: true,
        href: true, onClick: () => navigate({ screen: "firmwareDetail", firmwareId: route.firmwareId }) },
      { label: "Versions", href: true, onClick: () => navigate({ screen: "firmwareDetail", firmwareId: route.firmwareId, tab: "versions" }) },
      { label: v ? v.versionName : route.versionId, mono: true },
    ];
  }
  if (route.screen === "deviceDetail") {
    const d = window.findDeviceBySn ? window.findDeviceBySn(route.deviceSn) : null;
    return [
      { label: "Devices", href: true, onClick: () => navigate({ screen: "devices" }) },
      { label: d?.sn || route.deviceSn, mono: true },
    ];
  }
  if (route.screen === "tickets") return [{ label: "Tickets" }];
  if (route.screen === "deviceHealth") return [{ label: "Device Health" }];
  if (route.screen === "batteryHealth") return [{ label: "Battery Health" }];
  if (route.screen === "notifications") return [{ label: "Notifications" }];
  if (route.screen === "sample-activation") return [{ label: "Sample Devices" }];
  if (route.screen === "sample-orders")     return [{ label: "Sample Orders" }];
  if (route.screen === "newTicket") {
    return [
      { label: "Tickets", href: true, onClick: () => navigate({ screen: "tickets" }) },
      { label: "New ticket" },
    ];
  }
  if (route.screen === "ticketDetail") {
    const tk = window.findTicketById ? window.findTicketById(route.ticketId) : null;
    return [
      { label: "Tickets", href: true, onClick: () => navigate({ screen: "tickets" }) },
      { label: tk?.id || route.ticketId, mono: true },
    ];
  }
  if (route.screen === "browsePool") {
    return [
      { label: "App Store", href: true, onClick: () => navigate({ screen: "appStore" }) },
      { label: "Subscribe from pool" },
    ];
  }
  if (route.screen === "newApp")        return [home, { label: "New app" }];
  if (route.screen === "editApp" && app)
    return [home,
      { label: app.name, href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "overview", from: fromEntry }) },
      { label: "Edit details" }];
  if (route.screen === "publishWizard")
    return app ? [home,
      { label: app.name, href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "overview", from: fromEntry }) },
      { label: "Versions", href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "versions", from: fromEntry }) },
      { label: "Upload new version" }]
    : [home, { label: "Upload new version" }];
  if (route.screen === "approval" && app)
    return [home,
      { label: app.name, href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "overview", from: fromEntry }) },
      { label: "Approve version" }];
  if (route.screen === "appDetail" && app)
    return [home, { label: app.name, href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "overview", from: fromEntry }) }];
  if (route.screen === "versionDetail" && app && version)
    return [
      home,
      { label: app.name, href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "overview", from: fromEntry }) },
      { label: "Versions", href: true, onClick: () => navigate({ screen: "appDetail", appId: app.id, tab: "versions", from: fromEntry }) },
      { label: version.name, mono: true },
    ];
  return [home];
}

// ─── Placeholder for unfocused sidebar routes ─────────────
function PlaceholderScreen({ route }) {
  const labels = {
    home: "Home",
    versions: "Versions",
    settings: "Settings",
  };
  return (
    <div style={{ padding: 40, height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-1)" }}>
      <window.Empty
        icon={route.screen === "settings" ? "settings" : "doc"}
        title={`${labels[route.screen] || route.screen} — coming next`}
        body={`This area is part of the TOMS Customer Portal roadmap. The Apps experience is the focus of this preview.`} />
    </div>
  );
}

// ─── First-version publish-to-pool prompt removed ─────────
// The ISV+ISO publish-destination choice now happens in the new-app
// form (see modals.jsx → "Publish destination" card) so this prompt
// is no longer needed.

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// ─── Browser-style tab strip (Console + workbench tabs) ───
function TabStrip({ tabs, activeTabId, onSelect, onClose }) {
  const MAIN_TAB_ID = "main";
  return (
    <div role="tablist" style={{
      display: "flex", alignItems: "flex-end", gap: 0,
      height: 38, minHeight: 38,
      padding: "0 8px",
      background: "linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%)",
      borderBottom: "1px solid var(--border-1)",
      overflowX: "auto", overflowY: "hidden", flexShrink: 0,
    }}>
      {tabs.map((t) => {
        const on = t.id === activeTabId;
        const closable = t.id !== MAIN_TAB_ID;
        return (
          <div key={t.id}
            role="tab" aria-selected={on}
            onClick={() => onSelect(t.id)}
            onMouseDown={(e) => {
              if (e.button === 1 && closable) { e.preventDefault(); onClose(t.id); }
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 32, marginBottom: -1,
              padding: closable ? "0 6px 0 12px" : "0 14px",
              maxWidth: 240, minWidth: 120,
              background: on ? "var(--color-bg-1)" : "transparent",
              border: "1px solid",
              borderColor: on ? "var(--border-1)" : "transparent",
              borderBottomColor: on ? "var(--color-bg-1)" : "transparent",
              borderTopLeftRadius: 7, borderTopRightRadius: 7,
              color: on ? "var(--fg1)" : "var(--fg3)",
              fontSize: 12, fontWeight: on ? 600 : 500,
              cursor: "pointer",
              transition: "background .12s ease, color .12s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "color-mix(in oklab, var(--color-bg-1) 55%, transparent)"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
            <window.Ico name={t.kind === "main" ? "home" : "external"} size={12} stroke={1.8}
              style={{ color: on
                ? (t.kind === "main" ? "var(--fg2)" : "var(--color-primary-600)")
                : "var(--fg3)", flexShrink: 0 }} />
            <span style={{
              flex: 1, minWidth: 0, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: t.kind === "workbench" ? "var(--font-family-mono)" : "inherit",
              letterSpacing: t.kind === "workbench" ? "0.01em" : 0,
            }}>
              {t.kind === "workbench" ? "Workbench · " : ""}{t.label}
            </span>
            {closable && (
              <button onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
                aria-label={`Close ${t.label}`}
                style={{
                  display: "inline-grid", placeItems: "center",
                  width: 18, height: 18, borderRadius: "50%",
                  background: "transparent", border: 0,
                  color: "var(--fg3)", cursor: "pointer", padding: 0, flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg3)";
                  e.currentTarget.style.color = "var(--fg1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--fg3)";
                }}>
                <window.Ico name="x" size={10} stroke={2.2} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Workbench tab host ───────────────────────────────────
function WorkbenchTabHost({ ticketId, onClose, onNavigateMain }) {
  const ticket = window.findTicketById ? window.findTicketById(ticketId) : null;
  if (!ticket) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center",
        background: "var(--color-bg-1)", color: "var(--fg2)", padding: 40,
        textAlign: "center" }}>
        <window.Empty icon="alert" title="Ticket not found"
          body={<>The ticket id <code>{ticketId}</code> is not in this build.</>} />
      </div>
    );
  }
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
      <window.WorkbenchScreen
        ticket={ticket}
        navigate={onNavigateMain}
        onCloseTab={onClose} />
    </div>
  );
}
