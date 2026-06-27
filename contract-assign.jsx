/* global React, Icon, Field, Btn, ClauseInput, clauseError, iconForKind, CONTRACT_INFO */
// ─────────────────────────────────────────────────────────────
// contract-assign.jsx — Contract picker + clause configurator
//
// Shared B2-layout component used by:
//   • customer-wizard.jsx (Step 2 — new customer wizard)
//   • customer-detail.jsx (Add contract modal in the Contracts tab)
//
// Layout:
//   ┌───────────────┬─────────────────────────────────┐
//   │ Contract rail │ Clauses for the focused type    │
//   │ (toggle rows) │ (rendered via <ClauseInput>)    │
//   └───────────────┴─────────────────────────────────┘
//
// Props
//   availableKinds   — string[] of kinds the user is allowed to pick.
//                       Wizard passes ['ISV','ISO','Distributor'];
//                       Add-contract passes the kinds the customer
//                       doesn't already hold live.
//   selectedKinds    — currently picked kinds.
//   onTogglePick     — (kind) => void; toggles membership.
//   entitlements     — { [kind]: entitlementValues } shared state.
//   setEntitlements  — setter for above.
//   focusedKind      — which kind's clause form is shown in the right pane.
//   setFocusedKind   — setter for above.
//   errorsByKind     — optional { [kind]: { [clauseKey]: errorString } }
//   compact          — when true, the rail uses a shorter padding scheme
//                      (used inside the Add modal where vertical space is
//                      tighter than the wizard).
//
// Exposes:
//   window.ContractAssignBoard
//   window.collectAssignErrors(kinds, entitlements) → { [kind]: { [key]: err } }
//   window.kindToSchemaKey(k) — 'Distributor' → 'DISTRIBUTOR', etc.
// ─────────────────────────────────────────────────────────────

const kindToSchemaKey = (k) => String(k || '').toUpperCase();
const schemaFor = (kind) => {
  const k = kindToSchemaKey(kind);
  return (window.CONTRACT_ENTITLEMENT_SCHEMA && window.CONTRACT_ENTITLEMENT_SCHEMA[k]) || [];
};

// Walk every kind's schema and produce a per-clause error map. Used by
// callers to gate Save/Continue.
const collectAssignErrors = (selectedKinds, entitlements) => {
  const out = {};
  (selectedKinds || []).forEach((kind) => {
    const sch = schemaFor(kind);
    const e = entitlements?.[kind] || {};
    const map = {};
    sch.forEach((f) => {
      const err = clauseError(f, e[f.key], e);
      if (err) map[f.key] = err;
    });
    if (Object.keys(map).length > 0) out[kind] = map;
  });
  return out;
};

// Counts per kind for rail subtitle: e.g. "3/6 clauses set"
const fillCount = (kind, entitlements) => {
  const sch = schemaFor(kind);
  if (sch.length === 0) return null;
  const e = entitlements?.[kind] || {};
  const set = sch.filter((f) => {
    const v = e[f.key];
    if (f.type === 'price')    return v && v.price !== '' && v.price != null;
    if (f.type === 'feature')  return v && (v.enable || (v.price !== '' && v.price != null));
    if (f.type === 'models')   return Array.isArray(v) && v.length > 0;
    if (f.type === 'currency') return typeof v === 'string' && v.length > 0;
    return v != null && v !== '';
  }).length;
  return { set, total: sch.length };
};

// Kind → meta lookup for icon + label color. Falls back to ISO styling
// if the kind isn't in CONTRACT_INFO (shouldn't happen in practice).
const kindMeta = (kind) => {
  const info = (CONTRACT_INFO || {})[kind] || (CONTRACT_INFO || {})[kindToSchemaKey(kind)] || {};
  return {
    iconClass: (info.hue || 'iso').toLowerCase(),
    iconName: iconForKind(kind),
    title: info.label || kind,
    desc: info.desc || '',
  };
};

const ContractAssignBoard = ({
  availableKinds,
  selectedKinds,
  onTogglePick,
  entitlements,
  setEntitlements,
  // Optional: explicit per-kind mode override map { ISO: 'PILOT'|'ACTIVE', ... }.
  // If unset, defaults apply (ISO → PILOT, others → ACTIVE). The wizard / Manage
  // Contracts modal passes through state + setter to let admins flip the
  // segmented [Pilot | Active] control on new contracts.
  modeByKind,
  setModeByKind,
  focusedKind,
  setFocusedKind,
  errorsByKind,
  compact = false,
  // 'pick' (default) — multi-pick + toggle, used by the legacy Add
  // Contract modal + Wizard.
  // 'edit'           — single contract focus, no toggle, rail shows the
  //                    contract's status + effective range.
  // 'manage'         — unified Add + Edit: rail splits into "Active"
  //                    (existing contracts, no toggle, focus to edit) and
  //                    "Available to add" (toggleable kinds). Right pane
  //                    shows effective dates + clauses for the focused
  //                    contract / kind.
  mode = 'pick',
  // For mode='edit' — the live EntityContract being edited (rail meta).
  contract = null,
  // For mode='manage' — map of kind → live contract object the customer
  // already holds. These rows are non-toggleable in the rail and show a
  // status chip. Keyed by kind (e.g. {'ISO': contract, ...}).
  existingByKind = null,
  // Optional per-kind terms state: { [kind]: { effectiveFrom, effectiveTo } }
  // Drives the date inputs in the right pane. When omitted, dates are
  // hidden (legacy callers).
  terms = null,
  setTerms = null,
}) => {
  const isEditMode = mode === 'edit';
  const isManageMode = mode === 'manage';

  // Auto-focus the first available kind if nothing is focused yet. In
  // manage mode, prefer focusing an existing contract first so admins
  // land on something familiar (not a blank "available to add" row).
  React.useEffect(() => {
    if (!focusedKind && availableKinds && availableKinds.length > 0) {
      if (isManageMode && existingByKind) {
        const firstExisting = availableKinds.find((k) => existingByKind[k]);
        setFocusedKind(firstExisting || availableKinds[0]);
      } else {
        setFocusedKind(availableKinds[0]);
      }
    }
  }, [focusedKind, availableKinds, setFocusedKind, isManageMode, existingByKind]);

  const focused = focusedKind || (availableKinds || [])[0];
  const focusedSchema = focused ? schemaFor(focused) : [];
  // Which "kinds" are selected (i.e. the customer either has them or has
  // toggled them on in this session).
  //   edit   — always true (single contract)
  //   manage — existing OR newly toggled on
  //   pick   — checked toggle
  const isKindSelected = (kind) => {
    if (isEditMode) return true;
    if (isManageMode && existingByKind && existingByKind[kind]) return true;
    return (selectedKinds || []).includes(kind);
  };
  const focusedSelected = focused ? isKindSelected(focused) : false;
  const focusedEnts = focused ? (entitlements[focused] || {}) : {};
  const focusedTerms = (terms && focused) ? (terms[focused] || {}) : {};
  const focusedErrors = focused ? (errorsByKind?.[focused] || {}) : {};
  const focusedMeta = focused ? kindMeta(focused) : null;
  const focusedExistingContract = (isManageMode && focused && existingByKind) ? existingByKind[focused] : null;

  // PILOT determination — drives lockdown of fees + auto-fill of dates.
  // Pilot-ness is a property of the contract TYPE (kind ends in '-PILOT').
  // Each type is independent — there is no pilot↔active mode toggle.
  const focusedIsPilot = window.contractIsPilot(focusedExistingContract || focused);

  // Auto-fill PILOT dates when a focused kind enters PILOT mode for
  // the first time (idempotent — only writes if effectiveFrom is
  // blank). MUST live at the top level of the component (not inside
  // the conditional term-editor JSX) so React's hook-call order stays
  // stable across focus changes. Otherwise toggling between
  // selected/unselected kinds drops the hook count and React refuses
  // to render → blank pane / crash.
  React.useEffect(() => {
    if (!terms || !setTerms) return;
    if (!focused || !focusedIsPilot || focusedExistingContract) return;
    const cur = (terms && terms[focused]) || {};
    // Pilots: lock to today → +180 days. Fill whichever boundary is missing
    // (effectiveFrom may already be seeded today by the picker toggle).
    const from = cur.effectiveFrom || window.todayDate();
    if (!cur.effectiveFrom) setTermField('effectiveFrom', from);
    if (!cur.effectiveTo) setTermField('effectiveTo', window.addDaysDate(from, 180));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, focusedIsPilot]);

  const setField = (key, next) => {
    setEntitlements((prev) => ({
      ...prev,
      [focused]: { ...(prev[focused] || {}), [key]: next },
    }));
  };
  const setTermField = (key, next) => {
    if (!setTerms || !focused) return;
    setTerms((prev) => ({
      ...prev,
      [focused]: { ...(prev[focused] || {}), [key]: next },
    }));
  };

  // ─── Rail row factories ─────────────────────────────────────
  // Render a single rail row. Variants:
  //   • picker (existing pick mode): icon + name + sub + toggle
  //   • existing-ro (manage / edit mode for held contracts): status chip, no toggle
  //   • addable (manage mode for unheld kinds): icon + name + sub + toggle
  const renderPickRow = (kind) => {
    const meta = kindMeta(kind);
    const on = (selectedKinds || []).includes(kind);
    const isFocused = focused === kind;
    const fc = fillCount(kind, entitlements);
    const kindErrs = errorsByKind?.[kind];
    const hasErr = on && kindErrs && Object.keys(kindErrs).length > 0;
    return (
      <div
        key={kind}
        className={`cab-railrow ${on ? 'is-on' : ''} ${isFocused ? 'is-focused' : ''} ${hasErr ? 'has-error' : ''}`}
        onClick={() => setFocusedKind(kind)}
        role="button" tabIndex={0}
      >
        <div className={`pick-card__icon pick-card__icon--${meta.iconClass}`} style={{ width: 32, height: 32, borderRadius: 7 }}>
          <Icon name={meta.iconName} size={15}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cab-railrow__title">{kind}</div>
          <div className="cab-railrow__sub">
            {!on
              ? <span className="muted">Not selected</span>
              : hasErr
                ? <span style={{ color: 'var(--color-error-700)', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    <Icon name="alert" size={10}/> {Object.keys(kindErrs).length} error{Object.keys(kindErrs).length === 1 ? '' : 's'}
                  </span>
                : fc
                  ? <>{fc.set}/{fc.total} clauses set</>
                  : <span className="muted">No clauses</span>}
          </div>
        </div>
        <button
          type="button"
          className={`cab-tog ${on ? 'is-on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onTogglePick(kind); setFocusedKind(kind); }}
          aria-label={on ? 'Disable' : 'Enable'}
        >
          <span className="cab-tog__dot"/>
        </button>
      </div>
    );
  };

  // Render an existing-contract rail row (no toggle, status chip).
  const renderExistingRow = (kind, contractObj) => {
    const meta = kindMeta(kind);
    const isFocused = focused === kind;
    const eff = (window.effectiveStatus && contractObj) ? window.effectiveStatus(contractObj) : 'ACTIVE';
    const statusTone = { ACTIVE: 'success', SIGNED: 'success', SUSPENDED: 'error', EXPIRED: 'warning' }[String(eff).toUpperCase()] || 'neutral';
    const statusWord = { ACTIVE: 'Active', SIGNED: 'Active', SUSPENDED: 'Suspended', EXPIRED: 'Expired' }[String(eff).toUpperCase()] || eff;
    const kindErrs = errorsByKind?.[kind];
    const hasErr = kindErrs && Object.keys(kindErrs).length > 0;
    return (
      <div
        key={kind}
        className={`cab-railrow is-on ${isFocused ? 'is-focused' : ''} ${hasErr ? 'has-error' : ''}`}
        onClick={() => setFocusedKind(kind)}
        role="button" tabIndex={0}
      >
        <div className={`pick-card__icon pick-card__icon--${meta.iconClass}`} style={{ width: 32, height: 32, borderRadius: 7 }}>
          <Icon name={meta.iconName} size={15}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cab-railrow__title">{kind}</div>
          <div className="cab-railrow__sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`tds-badge tds-badge--${statusTone}`} style={{ padding: '1px 6px', fontSize: 10.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>{statusWord}
            </span>
            {hasErr && (
              <span style={{ color: 'var(--color-error-700)', fontSize: 11, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="alert" size={10}/>{Object.keys(kindErrs).length} error{Object.keys(kindErrs).length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`cab ${compact ? 'cab--compact' : ''}`}>
      {/* ── Left rail ──────────────────────────────────────── */}
      <aside className="cab__rail">
        {isManageMode && existingByKind ? (() => {
          // Existing contracts come from the customer's actual contract
          // list — INCLUDING kinds that may no longer be addable (e.g.
          // legacy MERCHANT contracts when ADMIN can no longer issue
          // MERCHANT directly). Those still render in the Active section
          // so admins can edit clauses / terminate them.
          // Addable kinds are filtered by availableKinds AND must NOT be
          // already held by the customer.
          const existingKinds = Object.keys(existingByKind);
          const addableKinds  = (availableKinds || []).filter((k) => !existingByKind[k]);
          return (
            <>
              {existingKinds.length > 0 && (
                <>
                  <div className="cab__group">Active <span className="cab__group-count">{existingKinds.length}</span></div>
                  {existingKinds.map((k) => renderExistingRow(k, existingByKind[k]))}
                </>
              )}
              {addableKinds.length > 0 && (
                <>
                  <div className="cab__group" style={{ marginTop: existingKinds.length > 0 ? 12 : 0 }}>
                    Available to add <span className="cab__group-count">{addableKinds.length}</span>
                  </div>
                  {addableKinds.map((k) => renderPickRow(k))}
                </>
              )}
            </>
          );
        })() : isEditMode ? (
          <>
            {focused && contract && renderExistingRow(focused, contract)}
          </>
        ) : (
          (availableKinds || []).map((kind) => renderPickRow(kind))
        )}
        <div className="cab__hint">
          <Icon name="info" size={12}/>
          <span>
            {isManageMode
              ? 'Click any row to edit · toggle a row to add a new contract.'
              : isEditMode
                ? 'Modify the clauses on the right · click Save to apply.'
                : 'Click a row to view its clauses · use the switch to enable/disable.'}
          </span>
        </div>
      </aside>

      {/* ── Right pane: term + clauses for focused kind ─────── */}
      <div className="cab__main">
        {!focused ? (
          <div className="empty" style={{ padding: '32px 20px', fontSize: 12.5 }}>
            No contract types available.
          </div>
        ) : (
          <>
            <div className="cab__mainhead">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div className={`pick-card__icon pick-card__icon--${focusedMeta.iconClass}`} style={{ width: 30, height: 30, borderRadius: 7, flex: 'none' }}>
                  <Icon name={focusedMeta.iconName} size={14}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {focused} <span className="muted" style={{ fontWeight: 400 }}>
                      · {focusedExistingContract ? 'edit clauses' : (isManageMode ? 'configure new' : 'clauses')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {focusedSchema.length === 0
                      ? 'No configurable clauses for this contract type.'
                      : `${focusedSchema.length} field${focusedSchema.length === 1 ? '' : 's'}`}
                  </div>
                </div>
              </div>
              {!isEditMode && !isManageMode && !focusedSelected && (
                <span style={{ fontSize: 11.5, color: 'var(--color-warning-700)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert" size={11}/>Type is disabled — toggle on to include it
                </span>
              )}
              {isManageMode && !focusedSelected && (
                <span style={{ fontSize: 11.5, color: 'var(--color-warning-700)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert" size={11}/>Toggle on in the rail to add this contract
                </span>
              )}
            </div>

            <div className="cab__form">
              {/* PILOT info banner — surfaces above the term editor so admins
                  know why the dates / fees are locked. Pilot-ness comes from
                  the contract TYPE ('*-PILOT'); pick the pilot type from the
                  list on the left if you want a trial. */}
              {focusedSelected && focusedIsPilot && (
                <div style={{
                  display: 'flex', gap: 10, padding: '10px 12px',
                  background: 'oklch(95% 0.04 280)',
                  border: '1px solid oklch(80% 0.10 280 / 0.4)',
                  color: 'oklch(38% 0.15 280)',
                  borderRadius: 8, fontSize: 12.5, lineHeight: 1.5,
                }}>
                  <Icon name="sparkles" size={14} style={{ flex: 'none', marginTop: 2 }}/>
                  <div>
                    <b>Pilot contract</b> — 180-day trial · all fees locked at $0. Devices and feature toggles can still be configured below. Use <b>Extend</b> from the contract row to lengthen the trial window.
                  </div>
                </div>
              )}

              {/* Term editor — every contract has an effective date range,
                  independent of whether it has clauses. So we render it
                  for ANY selected kind, even ISV / Distributor whose
                  schema is empty. Only hidden in legacy callers that
                  don't pass `terms`/`setTerms`.
                  PILOT contracts auto-lock both dates (effectiveFrom =
                  today, effectiveTo = +180d). Admins extend via the
                  contract row menu later. */}
              {terms && setTerms && focusedSelected && (() => {
                const pilotLockEffFrom = focusedIsPilot;
                const pilotLockEffTo   = focusedIsPilot;
                return (
                  <div className="cab-termrow">
                    <Field label="Effective from date" hint={pilotLockEffFrom ? 'Pilot starts today.' : 'Date the contract takes effect.'}>
                      <Input
                        type="date"
                        disabled={pilotLockEffFrom}
                        value={focusedTerms.effectiveFrom ? String(focusedTerms.effectiveFrom).slice(0, 10) : ''}
                        onChange={(e) => setTermField('effectiveFrom', e.target.value || '')}
                        style={!focusedTerms.effectiveFrom ? { color: 'var(--color-text-tertiary)' } : undefined}
                      />
                    </Field>
                    <Field label="Effective to date" hint={pilotLockEffTo ? 'Auto-set to +180 days. Use Extend to change.' : 'Leave blank for no end date.'}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Input
                          type="date"
                          disabled={pilotLockEffTo}
                          value={focusedTerms.effectiveTo ? String(focusedTerms.effectiveTo).slice(0, 10) : ''}
                          onChange={(e) => setTermField('effectiveTo', e.target.value || null)}
                          style={!focusedTerms.effectiveTo ? { flex: 1, color: 'var(--color-text-tertiary)' } : { flex: 1 }}
                        />
                        {focusedTerms.effectiveTo && !pilotLockEffTo && (
                          <Btn variant="ghost" size="sm" onClick={() => setTermField('effectiveTo', null)}>Clear</Btn>
                        )}
                      </div>
                    </Field>
                  </div>
                );
              })()}

              {focusedSchema.length === 0 ? (
                <div className="empty" style={{ padding: '20px 14px', fontSize: 12.5 }}>
                  {focused} contracts have no configurable clauses in the current model.
                  {!isEditMode && !isManageMode && !focusedSelected && ' Toggle the type on to create it with default settings.'}
                  {focusedSelected && ' Set the effective dates above — that\'s all that\'s required.'}
                </div>
              ) : (
                focusedSchema.map((f) => {
                  const err = focusedSelected ? focusedErrors[f.key] : null;
                  // Contract-level currency drives price/feature row labels.
                  // Defaults to USD until the admin picks one.
                  const settlementCurrency = focusedEnts.settlementCurrency || 'USD';
                  // PILOT mode disables price + feature fields (forces $0
                  // per spec §1.2). currency + models stay editable.
                  const pilotLocked = focusedIsPilot && (f.type === 'price' || f.type === 'feature');
                  return (
                    <Field
                      key={f.key}
                      label={<>{f.label}{f.required && <span style={{ color: 'var(--color-error-700)' }}> *</span>}</>}
                      hint={pilotLocked ? 'Pilot · locked at $0' : `${f.help || ''}${f.unit ? ` · ${f.unit}` : ''}`}
                      error={err}
                    >
                      <ClauseInput
                        clause={f}
                        value={focusedEnts[f.key]}
                        onChange={(v) => setField(f.key, v)}
                        disabled={!focusedSelected || pilotLocked}
                        error={err}
                        currency={settlementCurrency}
                        ctx={focusedEnts}
                      />
                    </Field>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────
const CSS = `
.cab { display: grid; grid-template-columns: 240px 1fr; min-height: 380px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-bg-2); }
.cab--compact { min-height: 340px; }
.cab__rail {
  border-right: 1px solid var(--color-border-subtle);
  padding: var(--space-3) var(--space-3) var(--space-2);
  display: flex; flex-direction: column; gap: 4px;
  background: var(--color-bg-1);
}
.cab__hint {
  margin-top: auto;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-3);
  border-radius: var(--radius-md);
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: flex; gap: 6px; align-items: flex-start;
  line-height: 1.45;
}
.cab__hint svg { margin-top: 1px; flex: none; }

.cab-railrow {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 9px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.cab-railrow:hover { background: var(--color-bg-hover); }
.cab-railrow.is-focused { background: var(--color-bg-2); border-color: var(--color-border-default); box-shadow: var(--shadow-1); }
.cab-railrow.is-on { background: var(--color-primary-50); border-color: oklch(60% 0.14 262 / 0.25); }
.cab-railrow.is-on.is-focused { background: var(--color-primary-50); border-color: var(--color-primary-700); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.cab-railrow.has-error { border-color: var(--color-error-500); }
.cab-railrow__title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); line-height: 1.2; }
.cab-railrow__sub   { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.cab-tog {
  width: 28px; height: 16px; border-radius: 999px;
  border: 0; background: var(--color-border-strong);
  position: relative; cursor: pointer; padding: 0; flex: none;
  transition: background var(--duration-fast);
}
.cab-tog__dot {
  position: absolute; top: 2px; left: 2px;
  width: 12px; height: 12px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.2);
  transition: left var(--duration-fast);
}
.cab-tog.is-on { background: var(--color-success-500); }
.cab-tog.is-on .cab-tog__dot { left: 14px; }

.cab__main {
  padding: var(--space-4) var(--space-5);
  display: flex; flex-direction: column; gap: var(--space-3);
  min-width: 0;
  overflow-y: auto;
  max-height: 70vh;
}
.cab__mainhead {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}
.cab__form {
  display: flex; flex-direction: column;
  gap: var(--space-3);
}

/* Edit-mode meta strip: lives in the rail below the single contract row,
   shows authorizing entity / effective range / id without crowding the
   row itself. */
.cab-editmeta {
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-3);
  background: var(--color-bg-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  display: flex; flex-direction: column; gap: 6px;
}
.cab-editmeta__row {
  display: flex; flex-direction: column; gap: 1px;
  font-size: 11.5px;
}
.cab-editmeta__lbl {
  font: 500 10px var(--font-family-mono);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cab-editmeta__val {
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 1.3;
  word-break: break-word;
}

/* Manage-mode rail group headers (Active / Available to add). Compact
   mono caps separator between the two row groups. */
.cab__group {
  font: 600 10px var(--font-family-mono);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 8px 4px;
  display: flex; align-items: center; gap: 6px;
}
.cab__group-count {
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: 999px;
  padding: 0 6px;
  font-size: 10px;
}

/* Term editor row — Effective from / Effective to side-by-side above
   the clauses form. Compact two-column grid that collapses on narrow. */
.cab-termrow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-1);
  border-bottom: 1px dashed var(--color-border-subtle);
}

/* Single-contract add/authorize UX */
.ccform { display: flex; flex-direction: column; gap: var(--space-3); }
.ccform__pilot {
  display: flex; gap: 10px; padding: 10px 12px;
  background: oklch(95% 0.04 280); border: 1px solid oklch(80% 0.10 280 / 0.4);
  color: oklch(38% 0.15 280); border-radius: 8px; font-size: 12.5px; line-height: 1.5;
}
.addc-list { display: flex; flex-direction: column; gap: 8px; }
.addc-opt {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 12px 14px; border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg); background: var(--color-bg-2); cursor: pointer;
  color: inherit; font: inherit;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.addc-opt:hover { background: var(--color-bg-hover); border-color: var(--color-border-strong); }
.addc-opt svg:last-child { color: var(--color-text-tertiary); flex: none; }
.addc-opt__title { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px; }
.addc-opt__tag {
  font: 600 10px var(--font-family-mono); text-transform: uppercase; letter-spacing: 0.04em;
  color: oklch(38% 0.15 280); background: oklch(95% 0.04 280); border: 1px solid oklch(80% 0.10 280 / 0.4);
  border-radius: 999px; padding: 1px 7px;
}
.addc-opt__desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.45; }
.authz-list { margin: 4px 0 14px; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.5; color: var(--color-text-secondary); }
.authz-list strong { color: var(--color-text-primary); }
.authz-summary {
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px;
  background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 8px; margin-bottom: 14px;
}
.authz-summary > div { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; }
.authz-summary span { color: var(--color-text-tertiary); }
.authz-summary strong { color: var(--color-text-primary); font-weight: 600; }
.flow-check { display: flex; gap: 9px; align-items: flex-start; font-size: 12.5px; color: var(--color-text-secondary); cursor: pointer; line-height: 1.45; }
.flow-check input { width: 15px; height: 15px; margin-top: 1px; accent-color: var(--color-primary-700); flex: none; }
`;
if (typeof document !== 'undefined' && !document.getElementById('cab-styles')) {
  const el = document.createElement('style');
  el.id = 'cab-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

Object.assign(window, { ContractAssignBoard, collectAssignErrors, kindToSchemaKey });

// ═══════════════════════════════════════════════════════════════
// Single-contract management — replaces the unified board for the
// "one contract at a time" UX:
//   • ContractClauseForm   — term + clauses for ONE kind (reused below)
//   • AddContractModal     — pick one type → configure → add (or route to
//                            the authorization flow when converting a pilot)
//   • ContractAuthorizeFlow— guided pilot → formal authorization
// ═══════════════════════════════════════════════════════════════

// Single-kind term + clause editor. `ents`/`terms` are flat objects for ONE
// kind; setEnts/setTerms are their setters.
const ContractClauseForm = ({ kind, ents, setEnts, terms, setTerms, errors = {}, pilot }) => {
  const schema = schemaFor(kind);
  const isPilot = pilot != null ? pilot : window.contractIsPilot(kind);
  const setField = (key, next) => setEnts((p) => ({ ...(p || {}), [key]: next }));
  const setTermField = (key, next) => setTerms((p) => ({ ...(p || {}), [key]: next }));

  React.useEffect(() => {
    if (!isPilot || !setTerms) return;
    const cur = terms || {};
    const from = cur.effectiveFrom || window.todayDate();
    if (!cur.effectiveFrom) setTermField('effectiveFrom', from);
    if (!cur.effectiveTo) setTermField('effectiveTo', window.addDaysDate(from, 180));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, isPilot]);

  const currency = (ents && ents.settlementCurrency) || 'USD';
  const t = terms || {};
  return (
    <div className="ccform">
      {isPilot && (
        <div className="ccform__pilot">
          <Icon name="sparkles" size={14} style={{ flex: 'none', marginTop: 2 }}/>
          <div><b>Pilot contract</b> — 180-day trial · all fees locked at $0. Device models and feature toggles are still configurable below.</div>
        </div>
      )}
      <div className="cab-termrow">
        <Field label="Effective from date" hint={isPilot ? 'Pilot starts today.' : 'Date the contract takes effect.'}>
          <Input type="date" disabled={isPilot}
            value={t.effectiveFrom ? String(t.effectiveFrom).slice(0, 10) : ''}
            onChange={(e) => setTermField('effectiveFrom', e.target.value || '')}/>
        </Field>
        <Field label="Effective to date" hint={isPilot ? 'Auto-set to +180 days.' : 'Leave blank for no end date.'}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input type="date" disabled={isPilot}
              value={t.effectiveTo ? String(t.effectiveTo).slice(0, 10) : ''}
              onChange={(e) => setTermField('effectiveTo', e.target.value || null)} style={{ flex: 1 }}/>
            {t.effectiveTo && !isPilot && <Btn variant="ghost" size="sm" onClick={() => setTermField('effectiveTo', null)}>Clear</Btn>}
          </div>
        </Field>
      </div>
      {schema.length === 0 ? (
        <div className="empty" style={{ padding: '18px 14px', fontSize: 12.5 }}>
          {kind} contracts have no configurable clauses — the effective dates above are all that's required.
        </div>
      ) : schema.map((f) => {
        const err = errors[f.key];
        const pilotLocked = isPilot && (f.type === 'price' || f.type === 'feature');
        return (
          <Field key={f.key}
            label={<>{f.label}{f.required && <span style={{ color: 'var(--color-error-700)' }}> *</span>}</>}
            hint={pilotLocked ? 'Pilot · locked at $0' : `${f.help || ''}${f.unit ? ` · ${f.unit}` : ''}`}
            error={err}>
            <ClauseInput clause={f} value={(ents || {})[f.key]} onChange={(v) => setField(f.key, v)}
              disabled={pilotLocked} error={err} currency={currency} ctx={ents || {}}/>
          </Field>
        );
      })}
    </div>
  );
};

// Add ONE contract: pick a type, then configure it. Converting a live pilot
// to its formal type routes out via onConvert(option) instead of adding.
const AddContractModal = ({ customer, onClose, onAddOne, onConvert, options: optionsProp }) => {
  const Modal = window.Modal;
  const options = optionsProp || window.contractAddOptions(customer.contracts, customer.timezone);
  const [picked, setPicked] = React.useState(null);
  const [ents, setEnts] = React.useState({});
  const [terms, setTerms] = React.useState({});

  const choose = (opt) => {
    if (opt.convert) { onConvert(opt); return; }
    const cur = window.currencyForCountry ? window.currencyForCountry(customer.country) : 'USD';
    setEnts({ settlementCurrency: cur });
    setTerms({ effectiveFrom: window.todayDate(customer.timezone), effectiveTo: null });
    setPicked(opt);
  };

  const errors = picked ? ((window.collectAssignErrors([picked.kind], { [picked.kind]: ents }) || {})[picked.kind] || {}) : {};
  const canSave = picked && Object.keys(errors).length === 0;

  const title = picked ? `Add ${(CONTRACT_INFO[picked.kind] || {}).label || picked.kind} contract` : 'Add a contract';
  const footer = picked
    ? <>
        <Btn variant="ghost" onClick={() => setPicked(null)}>Back</Btn>
        <Btn variant="primary" icon="check" disabled={!canSave} onClick={() => canSave && onAddOne(picked.kind, ents, terms)}>Add contract</Btn>
      </>
    : <Btn variant="ghost" onClick={onClose}>Cancel</Btn>;

  return (
    <Modal open onClose={onClose} title={title} width={560} footer={<div className="flow-foot">{footer}</div>}>
      {!picked ? (
        options.length === 0 ? (
          <div className="empty" style={{ padding: '28px 16px', fontSize: 13, lineHeight: 1.6 }}>
            No contract types are available to add. A live ISO/ISV must be terminated before adding another, and Merchant contracts are maintained by the customer's ISO — not the platform.
          </div>
        ) : (
          <div className="addc-list">
            {options.map((opt) => (
              <button type="button" key={opt.kind} className="addc-opt" onClick={() => choose(opt)}>
                <div className={`pick-card__icon pick-card__icon--${window.baseKind(opt.kind).toLowerCase()}`} style={{ width: 38, height: 38, borderRadius: 8, flex: 'none' }}>
                  <Icon name={iconForKind(opt.kind)} size={18}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="addc-opt__title">
                    {opt.label}
                    {opt.convert && <span className="addc-opt__tag">Convert from pilot</span>}
                  </div>
                  <div className="addc-opt__desc">
                    {opt.convert
                      ? `Authorize a formal ${opt.family} — closes the live ${opt.family}-Pilot and starts billing.`
                      : opt.desc}
                  </div>
                </div>
                <Icon name="chevR" size={16}/>
              </button>
            ))}
          </div>
        )
      ) : (
        <ContractClauseForm kind={picked.kind} ents={ents} setEnts={setEnts} terms={terms} setTerms={setTerms} errors={errors}/>
      )}
    </Modal>
  );
};

// Guided pilot → formal authorization. intro → configure → authorize → done.
const ContractAuthorizeFlow = ({ customer, pilot, formalKind, actorEntityName = 'NPT', onClose, onAuthorize }) => {
  const Modal = window.Modal;
  const fam = window.contractFamily(formalKind) || formalKind;
  const schema = schemaFor(formalKind);
  const [step, setStep] = React.useState('intro');
  const [ents, setEnts] = React.useState(() => {
    const pf = window.entitlementsToForm ? window.entitlementsToForm(pilot.entitlements || {}, schema) : {};
    const cur = pf.settlementCurrency || (window.currencyForCountry ? window.currencyForCountry(customer.country) : 'USD');
    const seed = { settlementCurrency: cur };
    schema.forEach((f) => {
      if (f.type === 'models') seed[f.key] = Array.isArray(pf[f.key]) ? pf[f.key] : [];
      if (f.type === 'currency') seed[f.key] = pf[f.key] || cur;
    });
    return seed;
  });
  const [terms, setTerms] = React.useState({ effectiveFrom: window.todayDate(customer.timezone), effectiveTo: null });
  const [ack, setAck] = React.useState(false);
  const [authAck, setAuthAck] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const errors = (window.collectAssignErrors([formalKind], { [formalKind]: ents }) || {})[formalKind] || {};
  const configOk = Object.keys(errors).length === 0;
  const fmtD = (d) => (window.fmtDate ? window.fmtDate(d) : String(d || '').slice(0, 10));

  const titles = {
    intro: `Authorize formal ${fam} · convert from pilot`,
    configure: `Configure ${fam} terms`,
    authorize: 'Authorize & activate',
    done: `${fam} authorized`,
  };

  let body, footer;
  if (step === 'intro') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">You're converting <strong>{customer.name}</strong>'s <strong>{pilot.kind}</strong> into a formal <strong>{fam}</strong> contract.</p>
        <ul className="authz-list">
          <li>The pilot is <strong>closed</strong> and replaced by a formal {fam} contract.</li>
          <li>Fees move from <strong>$0 (pilot)</strong> to the rates you set next — billing becomes live.</li>
          <li>This is <strong>irreversible</strong> — a pilot can't be re-created after conversion.</li>
        </ul>
        <div className="authz-summary">
          <div><span>Current pilot</span><strong>{pilot.kind}</strong></div>
          <div><span>Pilot started</span><strong>{fmtD(pilot.effectiveFrom || pilot.signedAt)}</strong></div>
          <div><span>Authorizing entity</span><strong>{actorEntityName}</strong></div>
        </div>
        <label className="flow-check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}/><span>I understand the pilot will be closed and replaced.</span></label>
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" disabled={!ack} onClick={() => setStep('configure')}>Continue</Btn>
    </>;
  } else if (step === 'configure') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">Set the formal {fam} terms. Device models carry over from the pilot; fees were $0 and must be set now.</p>
        <ContractClauseForm kind={formalKind} ents={ents} setEnts={setEnts} terms={terms} setTerms={setTerms} errors={errors} pilot={false}/>
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => setStep('intro')}>Back</Btn>
      <Btn variant="primary" disabled={!configOk} onClick={() => setStep('authorize')}>Continue</Btn>
    </>;
  } else if (step === 'authorize') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">Confirm the authorization. This activates the formal {fam} contract and closes <strong>{pilot.kind}</strong> immediately.</p>
        <div className="authz-summary">
          <div><span>Contract</span><strong>{fam}</strong></div>
          <div><span>Effective from</span><strong>{fmtD(terms.effectiveFrom)}</strong></div>
          <div><span>Effective to</span><strong>{terms.effectiveTo ? fmtD(terms.effectiveTo) : 'No end date'}</strong></div>
          <div><span>Authorizing entity</span><strong>{actorEntityName}</strong></div>
        </div>
        <Field label="Authorization note (optional)" hint="Saved on the conversion audit event.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Signed MSA #4821 on file"/>
        </Field>
        <label className="flow-check"><input type="checkbox" checked={authAck} onChange={(e) => setAuthAck(e.target.checked)}/><span>I authorize this conversion on behalf of <strong>{actorEntityName}</strong>.</span></label>
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => setStep('configure')}>Back</Btn>
      <Btn variant="primary" icon="check" disabled={!authAck} onClick={() => { onAuthorize({ ents, terms, reason: reason.trim() || null }); setStep('done'); }}>Authorize &amp; activate</Btn>
    </>;
  } else {
    body =
      <div className="flow-step flow-step--done">
        <div className="flow-done__icon"><Icon name="check" size={22}/></div>
        <p className="flow-step__desc">The formal <strong>{fam}</strong> contract is now active. <strong>{pilot.kind}</strong> has been closed.</p>
      </div>;
    footer = <Btn variant="primary" onClick={onClose}>Done</Btn>;
  }

  return (
    <Modal open onClose={onClose} title={titles[step]} width={step === 'configure' ? 600 : 480} footer={<div className="flow-foot">{footer}</div>}>
      {body}
    </Modal>);
};

Object.assign(window, { ContractClauseForm, AddContractModal, ContractAuthorizeFlow });
