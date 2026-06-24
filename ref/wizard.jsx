/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Upload & Publish wizard (drawer)
// ─────────────────────────────────────────────────────────────

const { useState: useStateW, useEffect: useEffectW, useMemo: useMemoW } = React;

function PublishWizardScreen({ app, onClose, onPublish, toast }) {
  const [step, setStep] = useStateW(0);
  // Once the APK is parsed, we'll auto-resolve which app it belongs to (by package name).
  // When entering with no preselected app, this stays null until upload completes.
  const [resolvedApp, setResolvedApp] = useStateW(app || null);
  const [packageMismatch, setPackageMismatch] = useStateW(null); // null | { detected, expected }

  // Step 1: APK upload (simulated)
  const [uploadState, setUploadState] = useStateW("idle"); // idle | uploading | parsed
  const [uploadPct, setUploadPct] = useStateW(0);
  const [parsed, setParsed] = useStateW(null);

  // Step 2: scan
  const [scanState, setScanState] = useStateW("queued"); // queued | scanning | done
  const [scanPct, setScanPct] = useStateW(0);
  const scanTemplate = "cleanish"; // The scan finds 4 minor issues

  // Step 3: app info
  const [versionNotes, setVersionNotes] = useStateW("");
  const [screenshots, setScreenshots] = useStateW([1, 2, 3]); // placeholder

  // Step 4: scope
  const [scopeMode, setScopeMode] = useStateW("all"); // all | invite
  const [whitelist, setWhitelist] = useStateW(new Set());   // unused; legacy
  const [blacklist, setBlacklist] = useStateW(new Set());   // unused; legacy

  const baseSubscribers = resolvedApp ? resolvedApp.subscriberIds : [];

  const reachCount = useMemoW(() => {
    if (scopeMode === "all") return baseSubscribers.length;
    return 0; // invite-only — no automatic recipients at publish time
  }, [scopeMode, baseSubscribers]);

  // Reset on mount
  useEffectW(() => {
    setStep(0);
    setUploadState("idle");
    setUploadPct(0);
    setParsed(null);
    setResolvedApp(app || null);
    setPackageMismatch(null);
    setScanState("queued");
    setScanPct(0);
    setVersionNotes("");
    setScopeMode("all");
    setWhitelist(new Set());
    setBlacklist(new Set());
  }, [app?.id]);

  // Simulate upload
  useEffectW(() => {
    if (uploadState !== "uploading") return;
    const t = setInterval(() => {
      setUploadPct(p => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(() => {
            // For the demo: when an app is preselected, the APK matches that app's package.
            // When no app is preselected, simulate a manifest with a known package so
            // auto-detection can find it in the catalog.
            const pkg = app ? app.package : "com.acme.pos.pro";
            const parsedInfo = {
              filename: pkg.replace(/\./g, "-") + "_4.3.3.apk",
              size: "28.4 MB",
              version: "4.3.3",
              code: 1433,
              package: pkg,
              minSdk: 24, targetSdk: 34, perms: 18,
              signer: "Acme Software Inc.",
              fingerprint: "SHA-256 d4:e2:8a:91:c2:bb:7f:00:1a:…",
            };
            setParsed(parsedInfo);
            // Resolve which app this APK belongs to by package-name lookup
            const match = window.APPS.find(a => a.package === parsedInfo.package);
            if (app && match && match.package !== app.package) {
              setPackageMismatch({ detected: parsedInfo.package, expected: app.package });
              setResolvedApp(null);
            } else if (match) {
              setResolvedApp(match);
              setPackageMismatch(null);
            } else {
              setResolvedApp(null);
              setPackageMismatch({ detected: parsedInfo.package, expected: null, unknown: true });
            }
            setUploadState("parsed");
          }, 200);
          return 100;
        }
        return Math.min(100, p + 6 + Math.random() * 12);
      });
    }, 90);
    return () => clearInterval(t);
  }, [uploadState, app]);

  // Kick the security scan off as soon as the upload is parsed — it runs in
  // the background while the user fills out version info / visibility, and
  // its result gates the Publish-confirm modal. Demo: completes after 3s
  // with a smooth progress animation.
  useEffectW(() => {
    if (uploadState !== "parsed" || scanState !== "queued") return;
    setScanState("scanning");
    setScanPct(0);
    const SCAN_MS = 3000;
    const t0 = performance.now();
    let raf;
    const tick = () => {
      const pct = Math.min(100, ((performance.now() - t0) / SCAN_MS) * 100);
      setScanPct(pct);
      if (pct >= 100) {
        setScanState("done");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // scanState intentionally omitted — the effect mutates scanState itself.
  }, [uploadState]);

  // Confirmation modal is the new step-after-Visibility. Clicking the
  // Publish button on Step 3 opens the modal; the modal's primary button
  // commits the publish.
  const [confirmOpen, setConfirmOpen] = useStateW(false);

  // Cancel always confirms first — the wizard accumulates a lot of state
  // (APK upload, scan, release notes, screenshots, visibility scope) that
  // would be tedious to redo if the operator misclicked.
  const [cancelOpen, setCancelOpen] = useStateW(false);
  const attemptCancel = () => setCancelOpen(true);

  // Visibility step is skipped when the target app is internal-only.
  // That happens for ISV+ISO tenants who chose "Local pool only" at app
  // creation time (app.status !== "published"). For pure-ISV tenants and
  // ISV+ISO tenants with public apps, the publisher picks All ISOs /
  // Invite-only on the Visibility step.
  const tenant = window.useActiveTenant();
  const isInternalOnly = tenant?.contracts?.includes("ISO") &&
                         resolvedApp && resolvedApp.status !== "published";

  const steps = isInternalOnly
    ? [
        { id: "upload", label: "Upload APK" },
        { id: "info",   label: "Version info" },
      ]
    : [
        { id: "upload", label: "Upload APK" },
        { id: "info",   label: "Version info" },
        { id: "scope",  label: "Visibility" },
      ];

  // Keep scopeMode aligned with the active step set so the onPublish
  // payload reflects what the user actually saw.
  useEffectW(() => {
    if (isInternalOnly && scopeMode !== "internal") setScopeMode("internal");
    if (!isInternalOnly && scopeMode === "internal") setScopeMode("all");
  }, [isInternalOnly]);

  const canNext = (() => {
    if (step === 0) return uploadState === "parsed" && !!resolvedApp && !packageMismatch;
    if (step === 1) return versionNotes.trim().length > 5;
    if (step === 2) return true; // any scopeMode is valid
    return true;
  })();

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const findings = window.SCAN_FINDINGS_TEMPLATES[scanTemplate];
  const scanCounts = window.summariseFindings(findings);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Page header */}
      <div style={{
        background: "var(--color-bg-2)",
        borderBottom: "1px solid var(--color-border-subtle)",
        padding: "14px 24px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={attemptCancel} style={{ color: "var(--color-text-tertiary)", padding: 2 }} title="Back">
            <window.Ico name="chevl" size={16} />
          </button>
          {resolvedApp && <window.AppIcon app={resolvedApp} size={36} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {resolvedApp ? `Upload new version · ${resolvedApp.name}` : "Upload a new version"}
            </h1>
            {resolvedApp ? (
              <div className="mono" style={{ marginTop: 2, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
                {resolvedApp.package}
              </div>
            ) : (
              <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
                Upload an APK to detect the target app
              </div>
            )}
          </div>
          <window.Button onClick={attemptCancel}>Cancel</window.Button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} style={{
                flex: 1, padding: "0 0 12px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    display: "grid", placeItems: "center",
                    background: done ? "var(--color-primary-700)" : active ? "var(--color-bg-2)" : "transparent",
                    border: "1px solid", borderColor: active ? "var(--color-primary-500)" : done ? "transparent" : "var(--color-border-default)",
                    color: done ? "var(--color-text-on-primary)" : active ? "var(--color-primary-600)" : "var(--color-text-tertiary)",
                    fontSize: 10.5, fontWeight: 600, fontFamily: "var(--font-family-mono)",
                  }}>
                    {done ? <window.Ico name="check" size={10} stroke={2.5} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: active ? 500 : 400,
                    color: active ? "var(--color-text-primary)" : done ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{s.label}</span>
                </div>
                <div style={{
                  height: 2, borderRadius: 1,
                  background: done ? "var(--color-primary-700)" : active ? "var(--color-primary-200)" : "var(--color-border-subtle)",
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--color-bg-1)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 24px 32px" }}>
          {step === 0 && <StepUpload preselectedApp={app} resolvedApp={resolvedApp} mismatch={packageMismatch}
            state={uploadState} pct={uploadPct} parsed={parsed}
            onStart={() => setUploadState("uploading")} />}
          {step === 1 && <StepInfo app={resolvedApp} notes={versionNotes} setNotes={setVersionNotes} screenshots={screenshots} setScreenshots={setScreenshots} />}
          {step === 2 && <StepScope app={resolvedApp} subscriberIds={baseSubscribers}
            scopeMode={scopeMode} setScopeMode={setScopeMode}
            whitelist={whitelist} setWhitelist={setWhitelist}
            blacklist={blacklist} setBlacklist={setBlacklist}
            reachCount={reachCount} />}
        </div>
      </div>

      {/* Sticky footer */}
      <footer style={{
        padding: "12px 24px",
        borderTop: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-2)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {step > 0 && <window.Button onClick={prev} icon="chevl">Back</window.Button>}
        <div style={{ flex: 1, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
          Step <span className="mono" style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{step + 1}</span> of {steps.length}
          {" · "}<span>{steps[step].label}</span>
        </div>
        {step < steps.length - 1 ? (
          <window.Button primary disabled={!canNext} onClick={next} iconRight="chevr">Continue</window.Button>
        ) : (
          <window.Button primary icon="bolt" disabled={!canNext}
            onClick={() => setConfirmOpen(true)}>
            Review & publish
          </window.Button>
        )}
      </footer>

      {/* Confirmation modal — final gate before publish. Shows the
          vulnerability scan report; publish is blocked until the scan
          completes. */}
      <PublishConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onPublish && onPublish({ app: resolvedApp, parsed, scanTemplate, versionNotes, scopeMode, whitelist, blacklist, reachCount });
          onClose();
        }}
        app={resolvedApp} parsed={parsed}
        scanState={scanState} scanPct={scanPct}
        scanTemplate={scanTemplate} scanCounts={scanCounts} scanFindings={findings} />

      <window.ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Discard this version upload?"
        body="The APK you uploaded, release notes, screenshots and visibility choices will all be lost."
        confirmLabel="Discard upload"
        tone="danger"
        icon="x"
        onConfirm={() => { setCancelOpen(false); onClose(); }} />
    </div>
  );
}

// ─── Step 1: Upload APK ────────────────────────────────────
function StepUpload({ preselectedApp, resolvedApp, mismatch, state, pct, parsed, onStart }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Upload APK"
        body={preselectedApp
          ? "Drag the signed APK file here, or click to browse. TOMS will verify the package matches this app."
          : "Drag the signed APK file here, or click to browse. TOMS will parse the manifest and auto-detect which app this version belongs to from its package name."} />

      {state === "idle" && (
        <button onClick={onStart} style={{
          padding: "44px 24px",
          border: "1.5px dashed var(--color-border-default)",
          borderRadius: 12,
          background: "var(--color-bg-3)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          width: "100%", cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary-500)"; e.currentTarget.style.background = "var(--color-primary-50)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; e.currentTarget.style.background = "var(--color-bg-3)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 10,
            background: "var(--color-bg-2)", border: "1px solid var(--color-border-default)",
            color: "var(--color-text-secondary)", display: "grid", placeItems: "center" }}>
            <window.Ico name="upload" size={20} />
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>Drag your APK here, or click to browse</div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
            Signed APK · up to 200&nbsp;MB · packages: <span className="mono">com.acme.*</span>
          </div>
        </button>
      )}

      {state === "uploading" && (
        <div style={{ padding: "24px", background: "var(--color-bg-2)",
          border: "1px solid var(--color-border-default)", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8,
              background: "var(--color-primary-50)", color: "var(--color-primary-700)",
              display: "grid", placeItems: "center" }}>
              <window.Ico name="upload" size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>acme-pos-pro_4.3.3.apk</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Uploading… <span className="mono">{Math.round(pct)}%</span></div>
            </div>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>28.4&nbsp;MB</span>
          </div>
          <div style={{ marginTop: 14, height: 4, borderRadius: 999, background: "var(--color-bg-3)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-primary-700)", transition: "width .1s" }} />
          </div>
        </div>
      )}

      {state === "parsed" && parsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px 16px",
            background: "var(--color-success-50)", borderRadius: 8,
            border: "1px solid", borderColor: "color-mix(in oklab, var(--color-success-500) 25%, transparent)",
            display: "flex", alignItems: "center", gap: 10 }}>
            <window.Ico name="check" size={14} style={{ color: "var(--color-success-500)" }} stroke={2.5} />
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--color-success-500)" }}>
              Upload complete · Signature verified · Manifest parsed
            </div>
            <window.Button size="sm" ghost icon="refresh">Re-upload</window.Button>
          </div>

          <div style={{ padding: "10px 14px",
            background: "var(--color-info-50)", borderRadius: 8,
            border: "1px solid", borderColor: "color-mix(in oklab, var(--color-info-500) 22%, transparent)",
            display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--color-info-700)" }}>
            <Spinner size={14} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 500 }}>Security scan started in the background</span>
              <span style={{ color: "var(--color-text-tertiary)" }}> · You can continue. Results will appear on the version detail page when the scan completes (typically 2–4 min).</span>
            </div>
          </div>

          <window.Card title="Detected package information">
            {/* Full-width rows (file, package) then a 2-col grid for short fields */}
            <window.KV label="File" value={
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="mono">{parsed.filename}</span>
                <span className="mono" style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>{parsed.size}</span>
              </span>
            } copy />
            <window.KV label="Package"  value={<span className="mono">{parsed.package}</span>} copy />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24 }}>
              <window.KV label="Version"
                value={<span className="mono">{parsed.version}{" "}
                  <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>· code {parsed.code}</span>
                </span>} />
              <window.KV label="Min / Target SDK" value={<span className="mono">{parsed.minSdk} / {parsed.targetSdk}</span>} />
              <window.KV label="Permissions"      value={
                <PermissionsLink count={parsed.perms} pkg={parsed.package} />
              } />
              <window.KV label="Signer"           value={parsed.signer} />
            </div>
            <window.KV label="Fingerprint" value={<span className="mono" style={{ fontSize: 11 }}>{parsed.fingerprint}</span>} copy />
          </window.Card>

          {/* Detected-app banner (auto-resolution) — also surfaces icon change between versions */}
          {resolvedApp && (() => {
            const currentVersion = (resolvedApp.versions || []).find(v => v.current) || (resolvedApp.versions || [])[0];
            // The new version's iconSeed = parsed package name with a "+<code>" suffix to simulate
            // hash-of-icon-bytes. In production this comes from the APK.
            const newSeed = `${parsed.package}#${parsed.code}`;
            const currentSeed = (currentVersion && currentVersion.iconSeed) || resolvedApp.package;
            const iconChanged = newSeed !== currentSeed;
            // Construct a "synthetic" new-version object for AppIcon
            const newVersion = { iconSeed: newSeed };
            return (
              <div style={{ padding: "12px 14px",
                background: "var(--color-primary-50)", borderRadius: 8,
                border: "1px solid", borderColor: "color-mix(in oklab, var(--color-primary-500) 22%, transparent)",
                display: "flex", alignItems: "center", gap: 12 }}>
                {iconChanged ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <window.AppIcon app={resolvedApp} version={currentVersion} size={32} radius={7} />
                    <window.Ico name="arrowR" size={12} style={{ color: "var(--color-text-tertiary)" }} />
                    <window.AppIcon app={resolvedApp} version={newVersion} size={32} radius={7} />
                  </div>
                ) : (
                  <window.AppIcon app={resolvedApp} version={currentVersion} size={32} radius={7} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {preselectedApp ? "Target app confirmed" : "Detected target app"}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {resolvedApp.name}{" "}
                    <span className="mono" style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-tertiary)" }}>
                      · {resolvedApp.package}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {iconChanged
                      ? <>
                          <span style={{ color: "var(--color-warning-700)", fontWeight: 500 }}>Icon updated in this version.</span>
                          {" "}It will replace the current app icon after publish.
                        </>
                      : <>Icon unchanged from current version <span className="mono">{currentVersion?.name}</span>.</>}
                  </div>
                </div>
                {!preselectedApp && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 500,
                    padding: "3px 8px", borderRadius: 999,
                    background: "var(--color-bg-2)", color: "var(--color-primary-700)",
                    border: "1px solid color-mix(in oklab, var(--color-primary-500) 22%, transparent)",
                  }}>
                    <window.Ico name="check" size={11} stroke={2.5} /> auto-matched
                  </span>
                )}
              </div>
            );
          })()}

          {/* Unknown package — couldn't match to any app in the catalog */}
          {mismatch && mismatch.unknown && (
            <div style={{ padding: "12px 14px",
              background: "var(--color-warning-50)", borderRadius: 8,
              border: "1px solid", borderColor: "color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
              display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "var(--color-warning-700)" }}>
              <window.Ico name="alert" size={15} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Unknown package <span className="mono" style={{ fontWeight: 500 }}>{mismatch.detected}</span></div>
                <div style={{ marginTop: 3, color: "var(--color-text-secondary)" }}>
                  No app in your catalog claims this package name. Create a new app entry first, then upload this version.
                </div>
              </div>
              <window.Button size="sm">Create app…</window.Button>
            </div>
          )}

          {/* Mismatch — user entered the wizard from a specific app but uploaded an APK with a different package */}
          {mismatch && !mismatch.unknown && (
            <div style={{ padding: "12px 14px",
              background: "var(--color-error-50)", borderRadius: 8,
              border: "1px solid", borderColor: "color-mix(in oklab, var(--color-error-500) 30%, transparent)",
              display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--color-error-700)" }}>
              <window.Ico name="alert" size={15} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Package mismatch</div>
                <div style={{ marginTop: 3, color: "var(--color-text-secondary)" }}>
                  This APK declares <span className="mono">{mismatch.detected}</span> but you started the upload from <span className="mono">{mismatch.expected}</span>. Re-upload the correct APK or restart from the matching app.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Vulnerability scan ───────────────────────────
function StepScan({ state, pct, counts, findings }) {
  // Findings list defers into a modal — the in-step view stays a compact
  // summary (counts + severity bar). Operators only drill in when needed.
  const [findingsOpen, setFindingsOpen] = useStateW(false);
  const totalFindings = (findings || []).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Security & vulnerability scan"
        body="TOMS runs a static analysis on your APK — dependency CVEs, manifest issues, embedded secrets, and bundled native libraries. The scan runs asynchronously and typically finishes in 2–4 minutes." />

      {state !== "done" ? (
        <div style={{ padding: "28px",
          background: "var(--color-bg-2)", borderRadius: 10,
          border: "1px solid var(--color-border-default)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Spinner />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Scanning dependencies & manifest…</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                {pct < 30 ? "Decompiling bytecode" : pct < 60 ? "Matching CVE database" : pct < 90 ? "Inspecting permissions" : "Finalising report"}
                {" · "}<span className="mono">{Math.round(pct)}%</span>
              </div>
            </div>
            <window.Pill tone="info" dot>In progress</window.Pill>
          </div>
          <div style={{ marginTop: 14, height: 4, borderRadius: 999, background: "var(--color-bg-3)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-primary-700)", transition: "width .1s" }} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: 14, background: "var(--color-bg-2)",
            borderRadius: 10, border: "1px solid var(--color-border-default)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <window.Pill tone="success" dot size="lg">Scan complete</window.Pill>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Finished in 2m 41s · 4 findings, none blocking</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {Object.entries(counts).map(([k, v]) => (
                <div key={k} style={{
                  padding: "8px 10px", borderRadius: 6,
                  background: v > 0 ? "var(--color-bg-3)" : "transparent",
                  borderLeft: `3px solid ${window.SEVERITY[k].color}`,
                }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em",
                    fontWeight: 500, color: "var(--color-text-tertiary)" }}>{window.SEVERITY[k].label}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500,
                    color: v > 0 ? window.SEVERITY[k].color : "var(--color-text-tertiary)" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}><window.SeverityBar counts={counts} height={6} /></div>
          </div>

          <window.Card title="Findings"
            hint="Recommended fixes are not blocking — you can publish and address them in a future version."
            action={totalFindings > 0 && (
              <window.Button size="sm" iconRight="arrowR" onClick={() => setFindingsOpen(true)}>
                View {totalFindings} finding{totalFindings === 1 ? "" : "s"}
              </window.Button>
            )}>
            {totalFindings === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--color-success-700)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <window.Ico name="check" size={12} /> Clean scan — no findings reported.
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {totalFindings} finding{totalFindings === 1 ? "" : "s"} detected across dependency CVEs, manifest issues, and bundled libraries. Open the report to review each issue individually with its recommended fix.
              </div>
            )}
          </window.Card>
          <window.FindingsModal
            open={findingsOpen}
            onClose={() => setFindingsOpen(false)}
            findings={findings}
            counts={counts} />
        </>
      )}
    </div>
  );
}

function ScanFindingRow({ f }) {
  const sev = window.SEVERITY[f.sev];
  return (
    <div style={{
      padding: "9px 12px",
      border: "1px solid var(--color-border-subtle)",
      borderLeft: "3px solid", borderLeftColor: sev.color,
      borderRadius: 6,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <window.Pill tone={sev.tone} size="sm">{sev.label}</window.Pill>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{f.title}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {f.cve ? <span>{f.cve} · </span> : null}{f.pkg}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Version info ─────────────────────────────────
// Screenshots are version-level (they reflect the build), but they're
// captured per orientation declared on the app. Show one tab per orientation
// the app supports — exactly what the user needs to fill in.
function StepInfo({ app, notes, setNotes, screenshots, setScreenshots }) {
  // `screenshots` is the legacy flat array — wrap it as a per-orientation map.
  // For demo data we just split the same placeholder list across orientations.
  const orientations = (app && app.orientations && app.orientations.length)
    ? app.orientations : ["portrait"];
  const [activeO, setActiveO] = useStateW(orientations[0]);
  // Track shots per orientation in component state. Seed from existing list.
  const [shotsByO, setShotsByO] = useStateW(() => {
    const out = {};
    orientations.forEach(o => { out[o] = (o === orientations[0]) ? (screenshots || [1, 2, 3]) : []; });
    return out;
  });
  const setActiveShots = (next) => {
    const nx = { ...shotsByO, [activeO]: typeof next === "function" ? next(shotsByO[activeO] || []) : next };
    setShotsByO(nx);
    // Mirror the active orientation's array back to the parent so the
    // legacy summary in StepReview still shows a count.
    const total = Object.values(nx).reduce((acc, arr) => acc + arr.length, 0);
    setScreenshots(Array.from({ length: total }, (_, i) => i + 1));
  };
  const active = shotsByO[activeO] || [];
  const isLandscape = activeO === "landscape";
  const tile = isLandscape ? { w: 142, h: 80 } : { w: 80, h: 142 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Version info"
        body="Tell ISOs and downstream operators what changed. Release notes are shown when an ISO subscribes and bundled into the changelog distributed with the app." />

      <window.Field label="Release notes" required
        hint={<span><span className="mono">{notes.length}</span> / 500 characters · Markdown supported</span>}>
        <window.Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
          placeholder={"e.g.\n• Fixes EMV fallback bug on N750P\n• Adds tip suggestion presets\n• Offline queue retry now uses exponential backoff"} />
      </window.Field>

      <window.Field label="Screenshots"
        hint={<>Per orientation · Up to 8 each · PNG or JPG · {isLandscape ? "1920×1080" : "1080×1920"} recommended. Orientations declared on the app: <span className="mono">{orientations.join(", ")}</span>.</>}>
        {orientations.length > 1 && (
          <div role="tablist" style={{
            display: "inline-flex", gap: 2, padding: 3,
            background: "var(--color-bg-3)", border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)", marginBottom: 10,
          }}>
            {orientations.map(o => {
              const on = o === activeO;
              return (
                <button key={o} role="tab" aria-selected={on}
                  onClick={() => setActiveO(o)} style={{
                    padding: "5px 14px", borderRadius: "var(--radius-sm)",
                    fontSize: 12, fontWeight: on ? 500 : 400,
                    background: on ? "var(--color-bg-2)" : "transparent",
                    color: on ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    boxShadow: on ? "var(--shadow-1)" : "none",
                    textTransform: "capitalize",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <span className="mono" style={{
                    fontSize: 10, padding: "1px 5px", borderRadius: 3,
                    background: on ? "var(--color-bg-3)" : "var(--color-bg-2)",
                    color: "var(--color-text-tertiary)",
                  }}>{(shotsByO[o] || []).length}</span>
                  {o}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {active.map((s, i) => (
            <div key={i} style={{
              position: "relative",
              width: tile.w, height: tile.h, borderRadius: 6,
              background: `linear-gradient(135deg, oklch(58% 0.22 ${260 + i * 30}), oklch(48% 0.20 ${280 + i * 30}))`,
              border: "1px solid var(--color-border-default)",
              display: "grid", placeItems: "center",
              color: "white", fontSize: 22, fontWeight: 600,
              fontFamily: "var(--font-family-mono)",
            }}>
              {i + 1}
              <button onClick={() => setActiveShots(active.filter((_, j) => j !== i))} style={{
                position: "absolute", top: 4, right: 4,
                width: 18, height: 18, borderRadius: "50%",
                background: "oklch(0% 0 0 / 0.5)", color: "white",
                display: "grid", placeItems: "center",
              }}>
                <window.Ico name="x" size={10} stroke={2.5} />
              </button>
            </div>
          ))}
          {active.length < 8 && (
            <button onClick={() => setActiveShots([...active, active.length + 1])} style={{
              width: tile.w, height: tile.h, borderRadius: 6,
              border: "1.5px dashed var(--color-border-default)", background: "var(--color-bg-3)",
              color: "var(--color-text-tertiary)", display: "grid", placeItems: "center",
            }}>
              <window.Ico name="plus" size={18} />
            </button>
          )}
        </div>
        {active.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--color-warning-700)",
            display: "inline-flex", alignItems: "center", gap: 6 }}>
            <window.Ico name="alert" size={12} />
            At least one <b>{activeO}</b> screenshot is recommended for review listings.
          </div>
        )}
      </window.Field>
    </div>
  );
}

// ─── Step 4: Visibility (which ISOs get this release) ──────
// Two modes:
//   · all    — every ISO with public-pool access can subscribe.
//   · invite — no automatic visibility; the publisher hand-sends one-time
//              invite links from the Version Detail page (handled in invite.jsx).
function StepScope({ app, subscriberIds, scopeMode, setScopeMode, whitelist, setWhitelist,
                    blacklist, setBlacklist, reachCount }) {
  const tenant = window.useActiveTenant();
  const showDownstreamCounts = tenant.contracts.includes("ISO");
  const isos = subscriberIds.map(id => window.ISO_COMPANIES.find(c => c.id === id)).filter(Boolean);
  const totalMerchants = isos.reduce((s, c) => s + (c.merchants || 0), 0);
  const totalTerminals = isos.reduce((s, c) => s + (c.terminals || 0), 0);

  // Coerce any legacy scopeMode values (whitelist/blacklist) back to "all".
  useEffectW(() => {
    if (scopeMode !== "all" && scopeMode !== "invite") setScopeMode("all");
  }, [scopeMode, setScopeMode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Visibility"
        body="Choose how ISOs discover this release. Publish to everyone for normal releases, or use Invite-only when you want full control over who can subscribe (RC builds, paid partners, early access)." />

      {isos.length === 0 ? (
        <div style={{ padding: "12px 14px",
          background: "var(--color-info-50)",
          border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
          borderRadius: 8,
          display: "flex", alignItems: "flex-start", gap: 12,
          fontSize: 12.5, color: "var(--color-info-700)", lineHeight: 1.55 }}>
          <window.Ico name="info" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600 }}>First publish</div>
            <div style={{ marginTop: 3 }}>
              No ISO has subscribed to <span className="mono">{app?.package || "this app"}</span> yet. Pick <b>All ISOs</b> to make the version publicly discoverable, or <b>Invite-only</b> if you want to onboard ISOs one at a time after publishing.
            </div>
          </div>
        </div>
      ) : (
      <div style={{ padding: "10px 14px",
        background: "var(--color-bg-3)", borderRadius: 8,
        border: "1px solid var(--color-border-subtle)",
        display: "flex", alignItems: "center", gap: 12 }}>
        <window.Ico name="shield" size={15} style={{ color: "var(--color-text-tertiary)" }} />
        <div style={{ fontSize: 12.5 }}>
          <span className="mono" style={{ fontWeight: 600 }}>{isos.length}</span>{" "}
          <span style={{ color: "var(--color-text-secondary)" }}>ISO companies are currently subscribed to this app</span>
          {showDownstreamCounts && (
            <span style={{ color: "var(--color-text-tertiary)" }}> · serving <span className="mono">{totalMerchants}</span> merchants / <span className="mono">{totalTerminals}</span> terminals downstream</span>
          )}
        </div>
      </div>
      )}

      {/* Mode radio cards — All vs Invite-only */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { id: "all",    icon: "users",
            label: "All ISOs",
            body: "Public in your pool. Any ISO with access can discover and subscribe — including ISOs who subscribe later. Best for normal GA releases." },
          { id: "invite", icon: "send",
            label: "Invite-only",
            body: "No ISO sees this version automatically. After publish, send single-use 30-day invite links from the Version Detail page. Best for RC builds, paid partners, and staged rollouts." },
        ].map(opt => {
          const on = scopeMode === opt.id;
          return (
            <button key={opt.id} onClick={() => setScopeMode(opt.id)} style={{
              padding: 14, textAlign: "left",
              background: on ? "var(--color-primary-50)" : "var(--color-bg-2)",
              border: "1px solid",
              borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
              borderRadius: 8,
              boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.08)" : "none",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "1.5px solid",
                  borderColor: on ? "var(--color-primary-600)" : "var(--color-border-strong)",
                  display: "grid", placeItems: "center",
                }}>
                  {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-600)" }} />}
                </div>
                <window.Ico name={opt.icon} size={13}
                  style={{ color: on ? "var(--color-primary-700)" : "var(--color-text-tertiary)" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
                {opt.id === "invite" && (
                  <span style={{ marginLeft: "auto",
                    fontSize: 9, padding: "1px 5px", borderRadius: 3,
                    background: on ? "var(--color-bg-2)" : "var(--color-bg-3)",
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                  }}>No auto-push</span>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
                {opt.body}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live reach / next-step hint */}
      <div style={{
        padding: "12px 16px", borderRadius: 8,
        background: scopeMode === "invite"
          ? "linear-gradient(95deg, var(--color-warning-50) 0%, var(--color-primary-50) 100%)"
          : "linear-gradient(95deg, var(--color-primary-50) 0%, var(--color-accent-50) 100%)",
        border: "1px solid var(--color-border-subtle)",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <window.Ico name={scopeMode === "invite" ? "send" : "bolt"} size={16}
          style={{ color: "var(--color-primary-700)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>
          {scopeMode === "all" ? (
            <>
              <b style={{ color: "var(--color-primary-700)" }}>Visible to every ISO</b> with access to your public pool, including any who subscribe in the future. This is the right choice for normal GA releases.
            </>
          ) : (
            <>
              <b style={{ color: "var(--color-primary-700)" }}>No ISO is notified at publish time.</b>{" "}
              The version enters your pool tagged as <span className="mono">invite-only</span>. After publish, open the version's detail page and use <b>Push to ISO</b> to send each contact a one-time, 30-day invite link.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Publish modal ─────────────────────────────────
// Final gate before publish. Shows the app's basic info and — front and
// centre — the vulnerability scan report. If the scan is still running the
// publish button is disabled; the operator can't ship a version that hasn't
// been cleared by the scanner.
function PublishConfirmModal({ open, onClose, onConfirm, app, parsed,
                               scanState, scanPct, scanCounts, scanFindings }) {
  if (!open) return null;
  const scanDone = scanState === "done";
  const totalFindings = (scanFindings || []).length;
  const blockingFindings = (scanCounts?.critical || 0) + (scanCounts?.high || 0);
  const [findingsOpen, setFindingsOpen] = useStateW(false);

  const scanTone = !scanDone           ? "info"
                 : totalFindings === 0  ? "success"
                 : blockingFindings > 0 ? "danger"
                 :                        "warning";
  const scanLabel = !scanDone           ? "Scanning…"
                  : totalFindings === 0  ? "Clean"
                  : blockingFindings > 0 ? "High/Critical findings"
                  :                        "Findings present";

  return (
    <window.Modal open onClose={onClose} width={680}
      title="Vulnerability scan report"
      subtitle={scanDone
        ? "Review the scan results below, then publish this version to your app pool."
        : "Publishing is blocked until the security scan completes."}
      footer={
        <>
          <span style={{ marginRight: "auto", fontSize: 11.5, color: "var(--color-text-tertiary)",
            display: "inline-flex", alignItems: "center", gap: 6 }}>
            <window.Ico name={scanDone ? "info" : "history"} size={12} />
            <span>
              {scanDone
                ? "Publishing is immediate. Terminals download on next check-in."
                : "Scan typically completes in 2–4 min. You can leave this modal open."}
            </span>
          </span>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="bolt" disabled={!scanDone} onClick={onConfirm}>
            {scanDone ? "Publish now" : "Waiting for scan…"}
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── App basic info (slim summary card) ── */}
        <div style={{
          padding: "14px 16px",
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg-3)",
          border: "1px solid var(--color-border-subtle)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          {app && <window.AppIcon app={app} size={44} radius={10} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {app?.name || "—"}{" "}
              <span className="mono" style={{ fontWeight: 500, color: "var(--color-text-secondary)" }}>
                · {parsed?.version || "—"}
              </span>
            </div>
            <div className="mono" style={{ marginTop: 3, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
              {parsed?.package} · code {parsed?.code} · {parsed?.size}
            </div>
          </div>
        </div>

        {/* ── Vulnerability scan — the focus of this modal ── */}
        {!scanDone ? (
          <div style={{
            padding: "20px 18px",
            background: "var(--color-bg-2)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Spinner size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Scanning dependencies & manifest…</div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                  {scanPct < 30 ? "Decompiling bytecode"
                    : scanPct < 60 ? "Matching CVE database"
                    : scanPct < 90 ? "Inspecting permissions"
                    : "Finalising report"}
                  {" · "}<span className="mono">{Math.round(scanPct || 0)}%</span>
                </div>
              </div>
              <window.Pill tone="info" dot>In progress</window.Pill>
            </div>
            <div style={{ marginTop: 14, height: 4, borderRadius: 999,
              background: "var(--color-bg-3)", overflow: "hidden" }}>
              <div style={{ width: `${scanPct || 0}%`, height: "100%",
                background: "var(--color-primary-700)", transition: "width .15s" }} />
            </div>
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 6,
              background: "var(--color-warning-50)",
              border: "1px solid color-mix(in oklab, var(--color-warning-500) 28%, transparent)",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 12, color: "var(--color-warning-700)" }}>
              <window.Ico name="lock" size={13} />
              <span><b>Publish is locked</b> until the scan finishes. Every published version must pass a vulnerability check.</span>
            </div>
          </div>
        ) : (
          <div style={{
            padding: 14, background: "var(--color-bg-2)",
            borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-default)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <window.Pill tone={scanTone} dot size="lg">{scanLabel}</window.Pill>
              <span className="mono num" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                {totalFindings} finding{totalFindings === 1 ? "" : "s"}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
                Scanned in 2m 41s
              </span>
            </div>

            {totalFindings > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {Object.entries(scanCounts).map(([k, v]) => (
                    <div key={k} style={{
                      padding: "8px 10px", borderRadius: 6,
                      background: v > 0 ? "var(--color-bg-3)" : "transparent",
                      borderLeft: `3px solid ${window.SEVERITY[k].color}`,
                    }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em",
                        fontWeight: 500, color: "var(--color-text-tertiary)" }}>{window.SEVERITY[k].label}</div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 500,
                        color: v > 0 ? window.SEVERITY[k].color : "var(--color-text-tertiary)" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <window.SeverityBar counts={scanCounts} height={6} />
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
                    {blockingFindings > 0
                      ? <>
                          <b style={{ color: "var(--color-error-700)" }}>{blockingFindings} high/critical finding{blockingFindings === 1 ? "" : "s"}.</b>{" "}
                          Recommended fixes are not blocking, but should be addressed in a follow-up release.
                        </>
                      : <>None of the findings are blocking — you can publish and address them in a future version.</>}
                  </span>
                  <window.Button size="sm" iconRight="arrowR" onClick={() => setFindingsOpen(true)}>
                    View {totalFindings} finding{totalFindings === 1 ? "" : "s"}
                  </window.Button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--color-success-700)",
                display: "inline-flex", alignItems: "center", gap: 6 }}>
                <window.Ico name="check" size={12} stroke={2.5} />
                Clean scan — no findings reported.
              </div>
            )}
          </div>
        )}
      </div>

      <window.FindingsModal
        open={findingsOpen}
        onClose={() => setFindingsOpen(false)}
        findings={scanFindings}
        counts={scanCounts} />
    </window.Modal>
  );
}

// ─── Step 4 body (now mounted inside PublishConfirmModal) ─
// The confirmation pane. Designed so a reviewer can scan it in under 10
// seconds and catch the things that matter:
//   1. Version number + app identity   (top hero — large, monospace)
//   2. Signing cert fingerprint        (mismatch = blocked publish)
//   3. Visibility scope                (who actually sees this)
//   4. Permission delta                (vs. current published version)
//   5. Scan results                    (still running OK; findings present?)
//   6. Release notes preview           (full text under a fold)
function StepReview({ app, parsed, scanTemplate, scanCounts, scanFindings,
                     notes, scopeMode, reachCount, subscriberIds, whitelist, blacklist, embedded }) {
  const [findingsOpen, setFindingsOpen] = useStateW(false);
  const [notesExpanded, setNotesExpanded] = useStateW(false);

  // Permission delta vs current published version of this app.
  const currentVersion = app && (app.versions || []).find(v => v.current);
  const newPerms = parsed?.perms || 0;
  const oldPerms = currentVersion?.perms || 0;
  const permDelta = newPerms - oldPerms;

  // Visibility — show as a labelled chip with a count.
  const scopeChip = scopeMode === "all"
    ? { tone: "info",    label: "Public",      count: `${reachCount} ISO${reachCount === 1 ? "" : "s"} in pool`,
        body: "All ISO companies with access to this app pool can subscribe." }
    : { tone: "warning", label: "Invite-only", count: "No automatic visibility",
        body: "No ISO sees this version automatically. Send one-time invite links from the version detail page after publish." };

  // Scan summary — derived from a known fixture (cleanish in this demo).
  const totalFindings = (scanFindings || []).length;
  const scanTone = totalFindings === 0 ? "success"
                 : (scanCounts?.critical || 0) + (scanCounts?.high || 0) > 0 ? "danger"
                 : "warning";
  const scanLabel = totalFindings === 0
    ? "Clean"
    : (scanCounts?.critical || 0) + (scanCounts?.high || 0) > 0
      ? "High/Critical findings"
      : "Findings present";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!embedded && (
        <SectionHead title="Review & publish"
          body="One last check. After you confirm, this version enters your app pool. ISOs in scope are notified by email and can pull the snapshot when they're ready." />
      )}

      {/* ── Hero: app + huge version number, signer & fingerprint ── */}
      <div style={{
        padding: "20px 22px",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-bg-2)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-1)",
        display: "flex", alignItems: "center", gap: 18,
      }}>
        {app && <window.AppIcon app={app} size={64} radius={14} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{app?.name || "—"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{
              fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em",
              color: "var(--color-text-primary)", lineHeight: 1.1,
            }}>{parsed?.version || "—"}</span>
            {currentVersion && (
              <>
                <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
                  replaces <span className="mono" style={{ color: "var(--color-text-secondary)" }}>{currentVersion.name}</span>
                </span>
              </>
            )}
            <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              code {parsed?.code} · {parsed?.size}
            </span>
          </div>
          <div className="mono" style={{ marginTop: 6, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>{parsed?.package}</div>
        </div>
      </div>

      {/* ── Signing certificate — critical for catching wrong-cert builds ── */}
      <window.Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <window.Ico name="shieldCheck" size={14} /> Signing certificate
      </span>}
        hint="Subscribers will refuse to install if this changes between versions">
        <div style={{
          padding: "10px 12px",
          border: "1px solid var(--color-success-500)",
          borderRadius: "var(--radius-md)",
          background: "oklch(96% 0.03 152)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <window.Ico name="check" size={14} stroke={2.5} style={{ color: "var(--color-success-700)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-success-700)" }}>
                {parsed?.signer || "—"}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, wordBreak: "break-all" }}>
                {parsed?.fingerprint || "—"}
              </div>
            </div>
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 999,
              background: "var(--color-bg-2)", color: "var(--color-success-700)",
              fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em",
              border: "1px solid color-mix(in oklab, var(--color-success-500) 28%, transparent)",
              flexShrink: 0,
            }}>matches current</span>
          </div>
        </div>
      </window.Card>

      {/* ── Visibility — large, with the breakdown one click away ── */}
      <window.Card title="Visibility">
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "2px 0" }}>
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: "50%",
            display: "grid", placeItems: "center",
            background: scopeChip.tone === "info"    ? "var(--color-info-50)"
                     : scopeChip.tone === "success" ? "oklch(96% 0.03 152)"
                     :                                  "var(--warning-bg)",
            color: scopeChip.tone === "info"    ? "var(--color-info-700)"
                : scopeChip.tone === "success" ? "var(--color-success-700)"
                :                                  "var(--color-warning-700)",
          }}>
            <window.Ico name={scopeMode === "all" ? "users" : "send"} size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <window.Pill tone={scopeChip.tone} dot size="lg">{scopeChip.label}</window.Pill>
              <span className="mono num" style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                {scopeChip.count}
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-tertiary)" }}>{scopeChip.body}</div>
          </div>
        </div>
      </window.Card>

      {/* ── 2-up: permission delta + scan summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Permissions delta */}
        <window.Card title="Permissions">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono num" style={{
              fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
            }}>{newPerms}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>declared</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            {!currentVersion ? (
              <span style={{ color: "var(--color-text-tertiary)" }}>First version of this app — no baseline to compare against.</span>
            ) : permDelta === 0 ? (
              <span style={{ color: "var(--color-success-700)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <window.Ico name="check" size={12} stroke={2.4} /> No change vs <span className="mono">{currentVersion.name}</span>
              </span>
            ) : permDelta > 0 ? (
              <span style={{ color: "var(--color-warning-700)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <window.Ico name="alert" size={12} /> <b>+{permDelta}</b> new vs <span className="mono">{currentVersion.name}</span> · review carefully
              </span>
            ) : (
              <span style={{ color: "var(--color-success-700)" }}>
                <b>{permDelta}</b> removed vs <span className="mono">{currentVersion.name}</span>
              </span>
            )}
          </div>
        </window.Card>

        {/* Scan summary */}
        <window.Card title="Security scan"
          action={totalFindings > 0 && (
            <window.Button size="sm" iconRight="arrowR" onClick={() => setFindingsOpen(true)}>
              View {totalFindings}
            </window.Button>
          )}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <window.Pill tone={scanTone} dot size="lg">{scanLabel}</window.Pill>
            <span className="mono num" style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {totalFindings} finding{totalFindings === 1 ? "" : "s"}
            </span>
          </div>
          {scanCounts && totalFindings > 0 && (
            <div style={{ marginTop: 10 }}>
              <window.SeverityBar counts={scanCounts} height={6} />
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(scanCounts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <span key={k} style={{
                    fontSize: 10.5, padding: "1px 6px", borderRadius: 999,
                    border: `1px solid ${window.SEVERITY[k].color}`,
                    color: window.SEVERITY[k].color, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}><span className="mono">{v}</span> {window.SEVERITY[k].label}</span>
                ))}
              </div>
            </div>
          )}
        </window.Card>
      </div>

      {/* ── Release notes — collapsed by default ── */}
      <window.Card title="Release notes"
        action={notes && notes.length > 200 && (
          <window.Button size="sm" ghost onClick={() => setNotesExpanded(v => !v)}>
            {notesExpanded ? "Collapse" : "Expand"}
          </window.Button>
        )}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6,
          color: "var(--color-text-secondary)", whiteSpace: "pre-wrap",
          maxHeight: notesExpanded ? "none" : 96, overflow: "hidden",
          maskImage: notesExpanded || (notes || "").length <= 200 ? "none"
                                  : "linear-gradient(180deg, black 60%, transparent)",
        }}>
          {notes || <span style={{ color: "var(--color-text-tertiary)" }}>No release notes provided.</span>}
        </p>
      </window.Card>

      {/* ── Audit checklist + final caution ── */}
      {!embedded && (
      <div style={{
        padding: "12px 14px",
        background: "var(--color-warning-50)",
        borderRadius: 8,
        border: "1px solid", borderColor: "color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
        display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12, color: "var(--color-warning-700)",
      }}>
        <window.Ico name="alert" size={14} style={{ marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 600 }}>Publishing is immediate.</div>
          <div style={{ marginTop: 3, color: "var(--color-text-secondary)" }}>
            ISOs in scope are notified by email. Terminals start downloading on next check-in (15 min poll). Cellular-metered devices defer to Wi-Fi.
          </div>
        </div>
      </div>
      )}

      <window.FindingsModal
        open={findingsOpen}
        onClose={() => setFindingsOpen(false)}
        findings={scanFindings}
        counts={scanCounts} />
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────
function SectionHead({ title, body }) {
  return (
    <div>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
      {body && <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--color-text-tertiary)", maxWidth: 640, lineHeight: 1.55 }}>{body}</p>}
    </div>
  );
}

function Spinner({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${Math.max(2, Math.round(size / 12))}px solid var(--color-bg-3)`,
      borderTopColor: "var(--color-primary-600)",
      animation: "spin .8s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function PermissionsLink({ count, pkg }) {
  const [open, setOpen] = useStateW(false);
  // Realistic sample manifest permissions for a payments / POS app
  const permissions = [
    { name: "android.permission.INTERNET",                   level: "normal", purpose: "Sync orders & transactions with the back office" },
    { name: "android.permission.ACCESS_NETWORK_STATE",       level: "normal", purpose: "Detect connectivity to choose online vs offline payment flow" },
    { name: "android.permission.BLUETOOTH_CONNECT",          level: "dangerous", purpose: "Pair with external pinpads and BLE printers" },
    { name: "android.permission.BLUETOOTH_SCAN",             level: "dangerous", purpose: "Discover nearby BLE peripherals during pairing" },
    { name: "android.permission.NFC",                        level: "normal", purpose: "Contactless card reads on the integrated NFC reader" },
    { name: "android.permission.USE_BIOMETRIC",              level: "normal", purpose: "Manager fingerprint approval for void / refund" },
    { name: "android.permission.CAMERA",                     level: "dangerous", purpose: "Scan QR codes for catalog lookup & wallet payments" },
    { name: "android.permission.ACCESS_FINE_LOCATION",       level: "dangerous", purpose: "Tag each transaction with terminal GPS for fraud rules" },
    { name: "android.permission.RECEIVE_BOOT_COMPLETED",     level: "normal", purpose: "Auto-start the POS service after a power cycle" },
    { name: "android.permission.WAKE_LOCK",                  level: "normal", purpose: "Keep the screen on during a customer signature" },
    { name: "android.permission.FOREGROUND_SERVICE",         level: "normal", purpose: "Run the offline transaction queue in the foreground" },
    { name: "android.permission.POST_NOTIFICATIONS",         level: "normal", purpose: "Show payment confirmation & pending-sync alerts" },
    { name: "android.permission.READ_PHONE_STATE",           level: "dangerous", purpose: "Pull the IMEI for cellular-aware terminal pairing" },
    { name: "android.permission.SYSTEM_ALERT_WINDOW",        level: "signature", purpose: "Show the lockdown overlay during a remote update" },
    { name: "android.permission.WRITE_EXTERNAL_STORAGE",     level: "dangerous", purpose: "Export daily summary CSV to /sdcard/exports" },
    { name: "android.permission.READ_EXTERNAL_STORAGE",      level: "dangerous", purpose: "Import the merchant logo for printed receipts" },
    { name: "android.permission.MANAGE_EXTERNAL_STORAGE",    level: "signature", purpose: "Maintain the encrypted transaction journal in /sdcard" },
    { name: "android.permission.BIND_DEVICE_ADMIN",          level: "signature", purpose: "Enforce screen-timeout & kiosk-mode device policies" },
  ].slice(0, count || 18);
  const dangerousCount = permissions.filter(p => p.level === "dangerous").length;

  const levelColor = (lvl) => lvl === "dangerous" ? "var(--color-warning-700)"
                          : lvl === "signature" ? "var(--color-primary-700)"
                          : "var(--color-text-tertiary)";

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "1px 4px", borderRadius: "var(--radius-sm)",
        color: "var(--color-primary-700)",
        textDecoration: "underline", textUnderlineOffset: 2, textDecorationThickness: 1,
        cursor: "pointer", fontWeight: 500,
      }}>
        {count} declared
      </button>
      {dangerousCount > 0 && (
        <span style={{ fontSize: 11, color: "var(--color-warning-700)" }}>
          (<span className="mono">{dangerousCount}</span> dangerous)
        </span>
      )}
      {open && (
        <window.Modal open onClose={() => setOpen(false)} width={520}
          title="Declared permissions"
          subtitle={<>Parsed from <span className="mono">AndroidManifest.xml</span>{pkg ? <> · {pkg}</> : null}</>}
          padding={0}
          footer={
            <div style={{ flex: 1, fontSize: 11.5, color: "var(--color-text-tertiary)" }}>
              <span className="mono">{permissions.length}</span> total
              {dangerousCount > 0 && <span style={{ color: "var(--color-warning-700)" }}> · <span className="mono">{dangerousCount}</span> dangerous · require runtime user consent on Android 6+</span>}
            </div>
          }>
          {permissions.map((p, i) => (
            <div key={p.name} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", columnGap: 10, alignItems: "start",
              padding: "10px 18px",
              borderBottom: i < permissions.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", marginTop: 6,
                background: levelColor(p.level),
              }} />
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11.5, fontWeight: 500, color: "var(--color-text-primary)", wordBreak: "break-all" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 2, lineHeight: 1.45 }}>
                  {p.purpose}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em",
                padding: "2px 6px", borderRadius: 999,
                background: p.level === "dangerous" ? "var(--color-warning-50)"
                          : p.level === "signature" ? "var(--color-primary-50)"
                          : "var(--color-bg-3)",
                color: levelColor(p.level),
              }}>{p.level}</span>
            </div>
          ))}
        </window.Modal>
      )}
    </span>
  );
}

window.PublishWizardScreen = PublishWizardScreen;
