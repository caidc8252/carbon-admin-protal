/* global React, ReactDOM */
// ─────────────────────────────────────────────────────────────
// Carbon ISV Console — top-level app + routing
// ─────────────────────────────────────────────────────────────

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

// Tweakable defaults — host can rewrite these via __edit_mode_set_keys
const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "comfortable",
  "scenario": "active",
  "accent": "indigo",
  "activationStage": "list",
  "takedownTerm": "unpublish"
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

  // Find current app from route
  const currentApp = route.appId ? apps.find(a => a.id === route.appId) : null;
  const currentVersion = currentApp && route.versionId
    ? currentApp.versions.find(v => v.id === route.versionId) : null;

  // Merchant module lookups
  const currentMerchant = route.merchantId ? window.findMerchantById(route.merchantId) : null;
  const goMerchants    = () => setRoute({ screen: "merchants" });
  const goMerchantDetail = (id, tab = "overview") => setRoute({ screen: "merchantDetail", merchantId: id, tab });
  const openNewMerchant = () => setRoute({ screen: "newMerchant" });

  // Device module lookups
  const currentDevice = route.deviceSn ? window.findDeviceBySn?.(route.deviceSn) : null;

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
    <div className="carbon-root" style={{ fontSize: densityFontSize, display: "flex", flexDirection: "row" }}>
      <window.Sidebar route={route} navigate={setRoute} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <window.TopBar
          crumbs={makeCrumbs(route, currentApp, currentVersion, setRoute)}
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
              onSave={({ name, pkg, category, description, devices, orientations, publishToPool }) => {
                const tenant = window.__activeTenant;
                const isPureISV = tenant && !tenant.contracts.includes("ISO");
                // Initial status:
                //   pure ISV → "published" (no Private option for pure ISV;
                //     the app's destination is always the public pool)
                //   ISV+ISO  → publisher's choice from the form
                const initialStatus = isPureISV ? "published"
                                                : (publishToPool ? "published" : "private");
                const initialNote = isPureISV
                  ? "Created and listed in the public pool. Upload a version to make it available to ISO subscribers."
                  : (publishToPool
                      ? "Created and listed in the public pool."
                      : "Created in your local pool (private).");
                const newApp = {
                  id: pkg.replace(/\./g, "_"),
                  name, package: pkg, category, description,
                  devices: [...devices],
                  orientations: [...(orientations || ["portrait"])],
                  status: initialStatus,
                  publisherTenantId: tenant?.id || "acme-sw",
                  subscriberIds: [],
                  versions: [],
                  reviewActivity: [
                    { kind: "created", at: "just now", actor: "You",
                      note: initialNote },
                    ...(initialStatus === "published" ? [{
                      kind: "published", at: "just now", actor: "You",
                      note: "Listed in the public pool at creation time.",
                    }] : []),
                  ],
                };
                commitApps([newApp, ...apps]);
                showToast(isPureISV
                  ? `${name} created · listed in the public pool — upload a version to publish it`
                  : (publishToPool
                      ? `${name} created and listed in the public pool`
                      : `${name} created in your local pool`));
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
                // The wizard hands us a parsed APK + release notes +
                // visibility + a fixture scan template. Build a version
                // object that matches the seed-data shape and push it
                // onto the target app's versions array so all downstream
                // screens (version list, detail, store) see it.
                const isFirstVersionPreCheck = target.status === "private" &&
                                               (target.versions || []).length <= 1;
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
                  visibility: payload.scopeMode === "invite" ? "invite"
                            : payload.scopeMode === "internal" ? "internal"
                            : "all",
                };
                // Clear `current` on every existing version, prepend new one.
                const nextVersions = [
                  newVersion,
                  ...(target.versions || []).map(v => ({ ...v, current: false })),
                ];
                // Build a new app object with the appended version + a
                // review-activity entry; we'll mutate it further below for
                // first-version branching and then commit via setApps.
                const nextApp = {
                  ...target,
                  versions: nextVersions,
                  reviewActivity: [...(target.reviewActivity || []), {
                    kind: "version-uploaded", at: "just now", actor: "You",
                    note: `${newVersion.name} uploaded${payload.scopeMode === "invite" ? " · invite-only" : ""}.`,
                  }],
                };

                // ─── First-version branching ───────────────────────
                // For PURE-ISV tenants only: when the first version is
                // uploaded for a private app, auto-promote the app to the
                // public pool. ISV+ISO tenants already made the public/
                // private choice at app-creation time, so no prompt fires
                // here — we just respect target.status as-is.
                const tenant = window.__activeTenant;
                const isPureISV = tenant && !tenant.contracts.includes("ISO");
                const isFirstVersion = isFirstVersionPreCheck;

                if (isFirstVersion && isPureISV && target.status === "private") {
                  // Auto-publish to public pool.
                  const published = {
                    ...nextApp,
                    status: "published",
                    reviewActivity: [...nextApp.reviewActivity, {
                      kind: "published", at: "just now", actor: "You",
                      note: "First version uploaded — auto-published to public pool.",
                    }],
                  };
                  commitApps(apps.map(a => a.id === target.id ? published : a));
                  showToast(`${target.name} · first version uploaded and auto-published to the public pool`, "success");
                  goAppDetail(target.id, "versions");
                  return;
                }

                // All other cases (subsequent uploads, ISV+ISO with explicit
                // status set at creation): just commit and navigate.
                commitApps(apps.map(a => a.id === target.id ? nextApp : a));
                const visibilityLabel = payload.scopeMode === "invite"
                  ? " · invite-only"
                  : payload.scopeMode === "internal"
                    ? " · internal only"
                    : "";
                showToast(`${payload.parsed?.version} of ${target.name} uploaded${visibilityLabel}`);
                goAppDetail(target.id, "versions");
              }} />
          )}
          {route.screen === "pullWizard" && currentApp && (
            <window.PullWizardScreen
              app={currentApp}
              version={route.versionId ? currentApp.versions.find(v => v.id === route.versionId) : null}
              rolloutOnly={!!route.rolloutOnly}
              onCancel={() => goAppDetail(currentApp.id, "overview")}
              onConfirm={(payload) => {
                // Mock: actually flip the subscribed version, then bounce back to detail.
                const tenant = window.__activeTenant;
                if (tenant) {
                  const arr = (window.SUBSCRIBED_APPS || {})[tenant.id] || [];
                  const entry = arr.find(s => s.appId === payload.app.id);
                  if (entry) {
                    // Pull-only flips the snapshot pointer but doesn't deploy.
                    // A real rollout also flips the pointer (so the Subscription
                    // card shows the new "current") AND writes to ROLLOUT_HISTORY
                    // so the Deployments tab and Version Detail "Merchants on
                    // this version" card reflect the new coverage.
                    entry.subscribedVersionId = payload.next.id;
                    entry.subscribedAt = "just now";
                  }
                  // Persist the rollout: write the (tenant, app, version) →
                  // merchantIds mapping so downstream views can answer
                  // "which merchants are on this version?"
                  if (!payload.pullOnly && payload.effective && payload.effective.length > 0) {
                    window.recordRollout(
                      tenant.id,
                      payload.app.id,
                      payload.next.id,
                      payload.effective.map(m => m.id),
                    );
                  }
                }
                if (payload.pullOnly) {
                  showToast(`${payload.app.name} ${payload.next.name} approved for your pool · roll out from the app's Versions tab when ready`);
                } else {
                  const audienceLabel = payload.audience.mode === "all"
                    ? "all merchants"
                    : payload.audience.mode === "whitelist"
                      ? `${payload.audience.whitelist.size} merchant${payload.audience.whitelist.size === 1 ? "" : "s"} (whitelist)`
                      : `${payload.effective.length} merchant${payload.effective.length === 1 ? "" : "s"} (blacklist)`;
                  showToast(`Rollout scheduled — ${payload.app.name} ${payload.next.name} → ${audienceLabel}, ${payload.totalTerminals} terminals${payload.rollout.staged ? " (7-day staged)" : ""}`);
                }
                goAppDetail(currentApp.id, "overview");
              }} />
          )}
          {route.screen === "sample-activation" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <window.SampleDevicesPage
                presetState={(window.ACTIVATION_PRESETS || {})[t.activationStage]?.presetState ?? "list"}
                presetCode={(window.ACTIVATION_PRESETS || {})[t.activationStage]?.code ?? ""}
              />
            </div>
          )}
          {route.screen === "sample-orders" && (
            <div style={{ height: "100%", overflow: "auto" }}>
              <window.SampleOrdersPage />
            </div>
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
              onSave={({ name, country, tags, notes }) => {
                const id = `m-${Date.now().toString(36)}`;
                const now = "just now";
                const hq = {
                  id: `s-${id.replace(/^m-/, "")}-hq`,
                  isHQ: true, name, address: "", country, notes: "",
                  createdAt: now, updatedAt: now,
                };
                const newM = {
                  id, name, country, tags: tags || [], notes: notes || "",
                  createdAt: now, updatedAt: now,
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
            <window.DeviceDetailScreen device={currentDevice} route={route} navigate={setRoute} />
          )}
          {(route.screen === "home"      || route.screen === "versions"
         || route.screen === "settings") && (
            <PlaceholderScreen route={route} />
          )}
        </div>
      </main>

      <window.Toast toast={toast} onClose={() => setToast(null)} />

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
        <window.TweakSection label="Demo data" />
        <window.TweakSelect label="Scenario" value={t.scenario}
                            options={["fresh", "active", "audit"]}
                            onChange={(v) => setTweak("scenario", v)} />
        <window.TweakSection label="Copywriting" />
        <window.TweakRadio  label="Take-down term"
                            value={t.takedownTerm}
                            options={["unpublish", "remove"]}
                            onChange={(v) => setTweak("takedownTerm", v)} />
        <window.TweakSection label="Jump to" />
        <window.TweakButton onClick={() => setRoute({ screen: "appPublish" })}>App Publish list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "appStore" })}>App Store list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "browsePool" })}>Subscribe from pool</window.TweakButton>
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
        <window.TweakSection label="Merchants" />
        <window.TweakButton onClick={() => setRoute({ screen: "merchants" })}>Merchants list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "merchantDetail", merchantId: "m-coffee", tab: "overview" })}>Multi-store · Riverside Coffee Co.</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "merchantDetail", merchantId: "m-pharma", tab: "overview" })}>Single-location · Cedar Park Pharmacy</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "merchantDetail", merchantId: "m-glacier", tab: "terminals" })}>Enterprise terminals · Glacier Grocers</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "newMerchant" })}>New merchant form</window.TweakButton>
        <window.TweakSection label="Devices (ISO)" />
        <window.TweakButton onClick={() => setRoute({ screen: "devices" })}>Devices list</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "N950-0014-9281" })}>Clean N950</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "N750-0099-0040" })}>Flagged N750 (rooted)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "S60-0488-0021" })}>Dev-mode S60 (inactive)</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "X800-0099-1422" })}>Ethernet kiosk X800</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "deviceDetail", deviceSn: "S90-0822-2007" })}>Pending activation S90</window.TweakButton>
        <window.TweakSection label="Sample Lifecycle" />
        <window.TweakButton onClick={() => setRoute({ screen: "sample-activation" })}>Sample Devices</window.TweakButton>
        <window.TweakButton onClick={() => setRoute({ screen: "sample-orders" })}>Sample Orders</window.TweakButton>
        <window.TweakSelect label="Activation modal" value={t.activationStage}
                            options={["list", "modal-empty", "modal-match", "modal-other", "modal-unknown"]}
                            onChange={(v) => setTweak({ activationStage: v })} />
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
  if (route.screen === "devices")       return [{ label: "Device Models" }];
  if (route.screen === "devices")       return [{ label: "Devices" }];
  if (route.screen === "deviceDetail") {
    const d = window.findDeviceBySn ? window.findDeviceBySn(route.deviceSn) : null;
    return [
      { label: "Devices", href: true, onClick: () => navigate({ screen: "devices" }) },
      { label: d?.sn || route.deviceSn, mono: true },
    ];
  }
  if (route.screen === "newMerchant") {
    return [{ label: "Merchants", href: true, onClick: () => navigate({ screen: "merchants" }) }, { label: "New merchant" }];
  }
  if (route.screen === "merchantDetail") {
    const m = window.findMerchantById ? window.findMerchantById(route.merchantId) : null;
    return [
      { label: "Merchants", href: true, onClick: () => navigate({ screen: "merchants" }) },
      { label: m?.name || route.merchantId },
    ];
  }
  if (route.screen === "settings")      return [{ label: "Settings" }];
  if (route.screen === "sample-activation") return [{ label: "Devices" }, { label: "Sample Devices" }];
  if (route.screen === "sample-orders")     return [{ label: "Devices" }, { label: "Sample Orders" }];
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
    devices: "Device Models",
    merchants: "Merchants",
    settings: "Settings",
  };
  return (
    <div style={{ padding: 40, height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-1)" }}>
      <window.Empty
        icon={route.screen === "devices" ? "device" : route.screen === "merchants" ? "store" : route.screen === "settings" ? "settings" : "doc"}
        title={`${labels[route.screen] || route.screen} — coming next`}
        body={`This area is part of the TOMS ISV Console roadmap. The Apps experience is the focus of this preview.`} />
    </div>
  );
}

// ─── First-version publish-to-pool prompt removed ─────────
// The ISV+ISO publish-destination choice now happens in the new-app
// form (see modals.jsx → "Publish destination" card) so this prompt
// is no longer needed.

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
