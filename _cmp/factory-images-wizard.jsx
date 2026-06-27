/* global React, Btn, Input, Field, Icon, Badge, CompanyLogo, useToast */
// ─────────────────────────────────────────────────────────────
// New Factory Image — two-step wizard.
//
//   Step 1 · Name & model
//     Pick model → firmware version dropdown auto-populates (defaults to
//     current). Firmware version required. Enter a label; the Docker-style
//     image name (label-model-version) previews live.
//
//   Step 2 · PEP & apps
//     The mandatory PEP baseline card (version selectable, never removable),
//     then a merged, searchable, paginated picker for App-Publish system apps
//     and ISV apps.
//
// Navigation uses the shared <Stepper> drawing (.stepper classes) and the
// shared window.WizardFooter — never hand-rolled.
//
// The three building-block cards (FiModelFirmwareFields · FiPepCard ·
// FiAppsSelector) are exposed on window so the detail Edit modal reuses them.
// ─────────────────────────────────────────────────────────────
const { useState: useStateFW, useMemo: useMemoFW } = React;

// Shared styles for the factory-image building blocks (model/firmware fields,
// PEP card, apps selector, name preview). Injected once, globally, so they
// apply whether they're rendered inside the full-page wizard OR the detail
// page's Edit modal (which reuses the same components).
(function injectFiSharedStyles() {
  if (typeof document === 'undefined' || document.getElementById('fi-shared-styles')) return;
  const s = document.createElement('style');
  s.id = 'fi-shared-styles';
  s.textContent = `
    .fi-wizard { padding-bottom: 40px; }
    .fi-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .fi-grid2 { grid-template-columns: 1fr; } }
    .fi-field-hint {
      font-size: 12.5px; color: var(--color-text-tertiary);
      padding: 9px 0; line-height: 1.4;
    }

    .fi-name-preview {
      border: 1px solid var(--color-border-subtle); border-radius: 8px;
      background: var(--color-bg-3); padding: 12px 14px;
    }
    .fi-name-preview__lbl {
      font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--color-text-tertiary);
    }
    .fi-name-preview__val { margin-top: 6px; }
    .fi-name-preview__name {
      font-family: var(--font-family-mono); font-size: 15px; font-weight: 500;
      color: var(--color-text-primary); word-break: break-all;
    }
    .fi-name-preview__hint { margin-top: 6px; font-size: 11.5px; color: var(--color-text-tertiary); line-height: 1.5; }
    .fi-name-preview__hint code { font-family: var(--font-family-mono); font-size: 11px; background: var(--color-bg-1); padding: 1px 4px; border-radius: 3px; }
    .fi-name-preview__err { color: var(--color-error-700, oklch(45% 0.16 25)); font-weight: 500; }

    /* PEP card */
    .fi-pep-card {
      border: 1px solid color-mix(in oklab, var(--color-info-500, oklch(58% 0.13 240)) 30%, var(--color-border-default));
      border-radius: 10px; overflow: hidden;
      background: var(--color-info-50, oklch(97% 0.02 240));
    }
    [data-theme="dark"] .fi-pep-card { background: oklch(26% 0.04 240 / 0.4); }
    .fi-pep-card__main { display: flex; align-items: center; gap: 12px; padding: 14px; }
    .fi-pep-card__icon {
      width: 40px; height: 40px; border-radius: 9px; flex: none;
      display: grid; place-items: center;
      background: var(--color-info-100, oklch(92% 0.04 240)); color: var(--color-info-700, oklch(42% 0.13 240));
    }
    .fi-pep-card__meta { flex: 1; min-width: 0; }
    .fi-pep-card__name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
    .fi-pep-card__pkg { font-family: var(--font-family-mono); font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fi-pep-card__ver { display: flex; align-items: center; gap: 8px; flex: none; }
    .fi-pep-card__ver-lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-text-tertiary); }
    .fi-pep-card__note {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 9px 14px; border-top: 1px solid color-mix(in oklab, var(--color-info-500, oklch(58% 0.13 240)) 20%, transparent);
      font-size: 12px; line-height: 1.5; color: var(--color-info-700, oklch(40% 0.12 240));
    }
    [data-theme="dark"] .fi-pep-card__note { color: oklch(80% 0.10 240); }

    /* Apps selector */
    .fi-apps__toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .fi-apps__toolbar > :first-child { flex: 1; min-width: 200px; }
    .fi-apps__chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 999px;
      border: 1px solid var(--color-border-subtle); background: var(--color-bg-1);
      font-size: 12px; color: var(--color-text-secondary); cursor: pointer; user-select: none;
    }
    .fi-apps__chip input { display: none; }
    .fi-apps__chip.is-on { border-color: var(--color-text-primary); background: var(--color-primary-50, oklch(96% 0.02 262)); color: var(--color-text-primary); }
    .fi-apps__count {
      display: inline-block; min-width: 18px; padding: 0 5px;
      background: var(--color-bg-3); border-radius: 999px;
      font-size: 10.5px; font-weight: 600; text-align: center; line-height: 16px; color: var(--color-text-secondary);
    }
    .fi-apps__chip.is-on .fi-apps__count { background: var(--color-text-primary); color: var(--color-bg-1); }

    .fi-apps__list {
      border: 1px solid var(--color-border-subtle); border-radius: 8px;
      background: var(--color-bg-1); max-height: 420px; overflow: auto;
    }
    .fi-apps__row {
      display: grid;
      grid-template-columns: auto 32px minmax(0, 1fr) auto auto auto;
      align-items: center; gap: 12px;
      padding: 9px 14px; border-bottom: 1px solid var(--color-border-subtle);
      cursor: pointer; transition: background 0.1s;
    }
    .fi-apps__row:last-child { border-bottom: 0; }
    .fi-apps__row:hover { background: var(--color-bg-3); }
    .fi-apps__row.is-on { background: var(--color-primary-50, oklch(96% 0.02 262)); }
    .fi-apps__row input[type="checkbox"] { accent-color: var(--color-primary-700); cursor: pointer; }
    .fi-apps__icon { width: 32px; height: 32px; border-radius: 7px; background: var(--color-bg-3); }
    .fi-apps__meta { min-width: 0; }
    .fi-apps__name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fi-apps__sub { display: flex; align-items: center; gap: 5px; margin-top: 1px; font-size: 11px; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; }
    .fi-apps__pkg { font-family: var(--font-family-mono); }
    .fi-apps__dot { opacity: 0.5; }
    .fi-apps__cat { text-transform: uppercase; letter-spacing: 0.03em; font-weight: 500; }
    .fi-apps__kind {
      font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      padding: 2px 7px; border-radius: 999px; white-space: nowrap;
    }
    .fi-apps__kind--system { background: var(--color-bg-3); color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle); }
    .fi-apps__kind--isv { background: oklch(95% 0.05 295 / 0.6); color: oklch(45% 0.16 295); border: 1px solid oklch(60% 0.16 295 / 0.25); }
    [data-theme="dark"] .fi-apps__kind--isv { background: oklch(35% 0.08 295 / 0.4); color: oklch(80% 0.12 295); }
    .fi-apps__pub {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 8px; border-radius: 999px;
      background: var(--color-bg-2); border: 1px solid var(--color-border-subtle);
      font-size: 11px; color: var(--color-text-secondary); max-width: 150px;
    }
    .fi-apps__pub-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fi-apps__row.is-on .fi-apps__pub { background: var(--color-bg-1); }
    .fi-apps__ver { display: inline-flex; align-items: center; min-width: 60px; justify-content: flex-end; }

    .fi-apps__more {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin-top: 10px;
    }
    .fi-apps__more-count { font-size: 12px; color: var(--color-text-tertiary); }

    @media (max-width: 760px) {
      .fi-apps__row { grid-template-columns: auto 32px minmax(0, 1fr) auto auto; }
      .fi-apps__pub { display: none; }
    }
  `;
  document.head.appendChild(s);
})();

// ── Shared step-progress (canonical .stepper drawing) ───────
const FI_WIZARD_STEPS = [
  { n: 1, label: 'Name & model' },
  { n: 2, label: 'PEP & apps' },
];

const FiStepper = ({ step, onJump }) => (
  <div className="stepper">
    {FI_WIZARD_STEPS.map((it, i) => {
      const done = step > it.n;
      const clickable = done && typeof onJump === 'function';
      return (
        <React.Fragment key={it.n}>
          <div
            className={`stepper__item ${step === it.n ? 'is-active' : ''} ${done ? 'is-done' : ''} ${clickable ? 'is-clickable' : ''}`}
            onClick={clickable ? () => onJump(it.n) : undefined}>
            <div className="stepper__dot">{done ? <Icon name="check" size={14}/> : it.n}</div>
            <div className="stepper__lbl"><small>Step {it.n}</small><strong>{it.label}</strong></div>
          </div>
          {i < FI_WIZARD_STEPS.length - 1 && <div className={`stepper__bar ${done ? 'is-done' : ''}`}/>}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Firmware version options for a model ────────────────────
const fiFirmwareVersionsForModel = (modelCode) => {
  const fw = window.getFactoryImageFirmwareForModel?.(modelCode);
  if (!fw) return { firmware: null, versions: [] };
  const versions = (fw.versions || []).filter(v => v.status === 'published' || v.current);
  return { firmware: fw, versions };
};
const fiDefaultFirmwareVersionId = (modelCode) => {
  const { versions } = fiFirmwareVersionsForModel(modelCode);
  const def = versions.find(v => v.current) || versions[0];
  return def ? def.id : '';
};

// ── Model + firmware fields ─────────────────────────────────
// Controlled: parent owns { model, firmwareVersionId }. Changing the model
// resets the firmware version to that model's current build.
const FiModelFirmwareFields = ({ model, firmwareVersionId, onChange }) => {
  const allModels = window.getFactoryImageKnownModels?.() || [];
  const { versions } = fiFirmwareVersionsForModel(model);

  const pickModel = (m) => {
    onChange({ model: m, firmwareVersionId: m ? fiDefaultFirmwareVersionId(m) : '' });
  };

  return (
    <div className="fi-grid2">
      <Field label="Model" required>
        <div className="tds-select tds-select--md">
          <select value={model} onChange={e => pickModel(e.target.value)}>
            <option value="">Select a model…</option>
            {allModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="tds-select__chevron"><Icon name="chevD" size={14}/></span>
        </div>
      </Field>
      <Field label="Firmware version" required>
        {!model ? (
          <div className="fi-field-hint">Pick a model first.</div>
        ) : versions.length === 0 ? (
          <div className="fi-field-hint">No published firmware for {model}.</div>
        ) : (
          <div className="tds-select tds-select--md">
            <select value={firmwareVersionId} onChange={e => onChange({ model, firmwareVersionId: e.target.value })}>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.versionName} · {v.hardwareId}{v.current ? ' · Current' : ''}
                </option>
              ))}
            </select>
            <span className="tds-select__chevron"><Icon name="chevD" size={14}/></span>
          </div>
        )}
      </Field>
    </div>
  );
};

// ── PEP baseline card ───────────────────────────────────────
// PEP is mandatory and can never be removed — only its version may change.
const FiPepCard = ({ pepVersionId, onChange }) => {
  const pep = window.getFactoryImagePepApp?.();
  const versions = (pep?.versions || []).filter(v => v.status === 'published');

  return (
    <div className="fi-pep-card">
      <div className="fi-pep-card__main">
        {window.AppIcon
          ? <window.AppIcon app={pep} size={40} radius={9}/>
          : <div className="fi-pep-card__icon"><Icon name="shield" size={20}/></div>}
        <div className="fi-pep-card__meta">
          <div className="fi-pep-card__name">
            {pep?.name || 'PEP'}
            <Badge tone="info" dot>Baseline</Badge>
          </div>
          <div className="fi-pep-card__pkg">{window.FI_PEP_PACKAGE}</div>
        </div>
        <div className="fi-pep-card__ver">
          <span className="fi-pep-card__ver-lbl">Version</span>
          <div className="tds-select tds-select--sm" style={{ width: 150 }}>
            <select value={pepVersionId} onChange={e => onChange(e.target.value)}>
              {versions.map(v => (
                <option key={v.id} value={v.id}>{v.name}{v.current ? ' · Current' : ''}</option>
              ))}
            </select>
            <span className="tds-select__chevron"><Icon name="chevD" size={12}/></span>
          </div>
        </div>
      </div>
      <div className="fi-pep-card__note">
        <Icon name="lock" size={13}/>
        <span>PEP is the mandatory baseline on every factory image. You can change its version, but it can&apos;t be removed.</span>
      </div>
    </div>
  );
};

// ── Merged apps selector (App-Publish system apps + ISV apps) ──
const FiAppsSelector = ({
  model,
  systemRefs, isvRefs,
  onToggleSystem, onChangeSystemVersion,
  onToggleIsv, onChangeIsvVersion,
}) => {
  const [q, setQ] = React.useState('');
  const [appliedQ, setAppliedQ] = React.useState('');
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);
  const FI_APPS_STEP = 25;
  const [visibleCount, setVisibleCount] = React.useState(FI_APPS_STEP);

  const runSearch = () => { setAppliedQ(q.trim()); setVisibleCount(FI_APPS_STEP); };
  const pending = q.trim() !== appliedQ;

  // Merge: App-Publish apps (minus PEP) + ISV apps, each tagged with its kind.
  const merged = useMemoFW(() => {
    const sys = (window.factoryImageSystemAppCatalog?.() || [])
      .filter(a => a.id !== window.FI_PEP_APP_ID && a.package !== window.FI_PEP_PACKAGE)
      .filter(a => (a.versions || []).some(v => v.status === 'published'))
      .map(a => ({ app: a, kind: 'system' }));
    const isv = (window.SEED_APPS || [])
      .filter(a => a.id !== 'app-pep' && a.package !== window.FI_PEP_PACKAGE)
      .filter(a => (a.versions || []).some(v => v.status === 'published'))
      .map(a => ({ app: a, kind: 'isv' }));
    return [...sys, ...isv];
  }, []);

  const sysIds = React.useMemo(() => new Set(systemRefs.map(r => r.appId)), [systemRefs]);
  const isvIds = React.useMemo(() => new Set(isvRefs.map(r => r.appId)), [isvRefs]);
  const isSelected = (item) => item.kind === 'system' ? sysIds.has(item.app.id) : isvIds.has(item.app.id);
  const refFor = (item) => item.kind === 'system'
    ? systemRefs.find(r => r.appId === item.app.id)
    : isvRefs.find(r => r.appId === item.app.id);
  const selectedCount = sysIds.size + isvIds.size;

  const filtered = useMemoFW(() => {
    return merged.filter(item => {
      if (showSelectedOnly && !isSelected(item)) return false;
      if (appliedQ) {
        const s = appliedQ.toLowerCase();
        const pub = item.kind === 'isv' ? window.getAppPublisher?.(item.app) : null;
        return (
          item.app.name.toLowerCase().includes(s) ||
          (item.app.package || '').toLowerCase().includes(s) ||
          (item.app.category || '').toLowerCase().includes(s) ||
          (pub?.name || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [merged, appliedQ, showSelectedOnly, sysIds, isvIds]);

  const visibleRows = filtered.slice(0, visibleCount);

  const toggle = (item) => {
    const pub = (item.app.versions || []).filter(v => v.status === 'published');
    const ref = refFor(item);
    const defV = pub.find(v => v.current) || pub[0];
    if (item.kind === 'system') ref ? onToggleSystem(item.app.id, ref.versionId) : onToggleSystem(item.app.id, defV.id);
    else ref ? onToggleIsv(item.app.id, ref.versionId) : onToggleIsv(item.app.id, defV.id);
  };
  const changeVer = (item, vId) => {
    if (item.kind === 'system') onChangeSystemVersion(item.app.id, vId);
    else onChangeIsvVersion(item.app.id, vId);
  };

  return (
    <div className="fi-apps">
      <div className="fi-apps__toolbar">
        <Input prefix={<Icon name="search" size={13}/>} placeholder="Search by app name, package, category, or publisher…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
          size="sm"/>
        <Btn variant={pending ? 'primary' : 'secondary'} icon="search" onClick={runSearch}>Search</Btn>
        <label className={`fi-apps__chip ${showSelectedOnly ? 'is-on' : ''}`}>
          <input type="checkbox" checked={showSelectedOnly} onChange={e => { setShowSelectedOnly(e.target.checked); setVisibleCount(FI_APPS_STEP); }}/>
          Selected only
          <span className="fi-apps__count">{selectedCount}</span>
        </label>
      </div>

      <div className="fi-apps__list">
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: 18, fontSize: 12.5 }}>
            {showSelectedOnly && selectedCount === 0 ? 'No apps selected yet.' : 'No apps match your search.'}
          </div>
        ) : visibleRows.map(item => {
          const app = item.app;
          const pubVers = (app.versions || []).filter(v => v.status === 'published');
          const ref = refFor(item);
          const on = !!ref;
          const publisher = item.kind === 'isv' ? window.getAppPublisher?.(app) : null;
          return (
            <label key={`${item.kind}-${app.id}`} className={`fi-apps__row ${on ? 'is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(item)}/>
              {window.AppIcon
                ? <window.AppIcon app={app} size={32}/>
                : <div className="fi-apps__icon"/>}
              <div className="fi-apps__meta">
                <div className="fi-apps__name">{app.name}</div>
                <div className="fi-apps__sub">
                  <span className="fi-apps__pkg">{app.package}</span>
                  {app.category && <span className="fi-apps__dot">·</span>}
                  {app.category && <span className="fi-apps__cat">{app.category}</span>}
                </div>
              </div>
              <span className={`fi-apps__kind fi-apps__kind--${item.kind}`}>{item.kind === 'system' ? 'System' : 'ISV'}</span>
              {publisher && (
                <div className="fi-apps__pub" title={`Publisher: ${publisher.name}`}>
                  <CompanyLogo name={publisher.name} size={18}/>
                  <span className="fi-apps__pub-name">{publisher.name}</span>
                </div>
              )}
              <div className="fi-apps__ver" onClick={e => e.preventDefault()}>
                {on && (
                  <div className="tds-select tds-select--sm" style={{ width: 130 }}>
                    <select value={ref.versionId}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); changeVer(item, e.target.value); }}>
                      {pubVers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <span className="tds-select__chevron"><Icon name="chevD" size={12}/></span>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <div className="fi-apps__more">
          <span className="fi-apps__more-count">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'app' : 'apps'}
          </span>
          {visibleCount < filtered.length && (
            <Btn variant="secondary" size="sm" icon="chevD"
              onClick={() => setVisibleCount(c => c + FI_APPS_STEP)}>
              Load {Math.min(FI_APPS_STEP, filtered.length - visibleCount)} more
            </Btn>
          )}
        </div>
      )}
    </div>
  );
};

// ── Wizard ──────────────────────────────────────────────────
const FactoryImageWizard = ({ existingImages, onCancel, onComplete }) => {
  const toast = useToast();
  const pepApp = window.getFactoryImagePepApp?.();
  const defaultPepId = (pepApp?.versions || []).find(v => v.current)?.id
    || (pepApp?.versions || [])[0]?.id || '';

  const [step, setStep] = useStateFW(1);
  const [form, setForm] = useStateFW({
    label: '',
    model: '',
    firmwareVersionId: '',
    pepVersionId: defaultPepId,
    systemAppRefs: [],
    isvAppRefs: [],
  });

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  // Firmware version name for the live name preview.
  const fwVersionName = useMemoFW(() => {
    if (!form.model || !form.firmwareVersionId) return '';
    const { versions } = fiFirmwareVersionsForModel(form.model);
    return versions.find(v => v.id === form.firmwareVersionId)?.versionName || '';
  }, [form.model, form.firmwareVersionId]);

  const previewName = useMemoFW(
    () => window.composeFactoryImageName(form.label, form.model, fwVersionName),
    [form.label, form.model, fwVersionName]
  );
  const nameValid = window.isValidFactoryImageName?.(previewName);

  const step1Valid = !!form.label.trim() && !!form.model && !!form.firmwareVersionId && nameValid;
  const step2Valid = !!form.pepVersionId;
  const canCreate = step1Valid && step2Valid;

  // App ref mutators.
  const toggleSystem = (appId, versionId) => set({
    systemAppRefs: form.systemAppRefs.some(r => r.appId === appId)
      ? form.systemAppRefs.filter(r => r.appId !== appId)
      : [...form.systemAppRefs, { appId, versionId }],
  });
  const changeSystemVersion = (appId, versionId) => set({
    systemAppRefs: form.systemAppRefs.map(r => r.appId === appId ? { ...r, versionId } : r),
  });
  const toggleIsv = (appId, versionId) => set({
    isvAppRefs: form.isvAppRefs.some(r => r.appId === appId)
      ? form.isvAppRefs.filter(r => r.appId !== appId)
      : [...form.isvAppRefs, { appId, versionId }],
  });
  const changeIsvVersion = (appId, versionId) => set({
    isvAppRefs: form.isvAppRefs.map(r => r.appId === appId ? { ...r, versionId } : r),
  });

  const submit = () => {
    const now = new Date().toISOString();
    const nextNum = String(((window.SEED_FACTORY_IMAGES || []).length + (existingImages?.length || 0) + 10)).padStart(4, '0');
    const id = `FI-2026-${nextNum}`;
    const token = `qr_${id.toLowerCase().replace(/-/g, '')}_${Math.random().toString(36).slice(2, 10)}`;
    const fw = window.getFactoryImageFirmwareForModel(form.model);

    const fi = {
      id,
      name: previewName,
      payload: {
        byModel: {
          [form.model]: {
            firmwareRefs:  [{ firmwareId: fw.id, versionId: form.firmwareVersionId }],
            pepRef:        { appId: window.FI_PEP_APP_ID, versionId: form.pepVersionId },
            systemAppRefs: form.systemAppRefs,
            isvAppRefs:    form.isvAppRefs,
          },
        },
      },
      qr: { token },
      ownerEmail: 'jordan.diaz@carbon',
      createdAt: now, createdBy: 'jordan.diaz@carbon',
      updatedAt: now, updatedBy: 'jordan.diaz@carbon',
      events: [{ at: now, kind: 'created', actor: 'jordan.diaz@carbon', text: 'Created' }],
    };

    onComplete(fi);
    toast({ kind: 'success', title: `${id} created`, msg: `Factory image for ${form.model} ready.` });
  };

  const pkgCount = 1 /* fw */ + 1 /* pep */ + form.systemAppRefs.length + form.isvAppRefs.length;

  return (
    <div className="page fi-wizard">
      <window.TitleBar
        back
        onBack={onCancel}
        backLabel="Back to Factory Images"
        title="New factory image"
        subtitle="Declare what the factory pre-installs on this batch: one model, one firmware version, the mandatory PEP baseline, plus the apps to load."
      />

      <FiStepper step={step} onJump={(n) => { if (n < step) setStep(n); }}/>

      <div className="stack" style={{ gap: 16 }}>
        {step === 1 && (
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Name &amp; model</div></div>
            <div className="info-card__body stack" style={{ gap: 16 }}>
              <FiModelFirmwareFields
                model={form.model}
                firmwareVersionId={form.firmwareVersionId}
                onChange={({ model, firmwareVersionId }) => set({ model, firmwareVersionId })}/>

              <Field label="Label" required hint="A free-text identifier — a customer name, or a common template label for a shared baseline. Spaces allowed; no leading or trailing space.">
                <Input
                  value={form.label}
                  onChange={e => set({ label: e.target.value })}
                  placeholder="e.g. Acme Retail"
                  size="md"
                  autoFocus/>
              </Field>

              <div className="fi-name-preview">
                <span className="fi-name-preview__lbl">Image name</span>
                <div className="fi-name-preview__val">
                  {form.label.trim() || form.model
                    ? <span className="fi-name-preview__name">{previewName}</span>
                    : <span className="muted">label-model-version</span>}
                </div>
                <div className="fi-name-preview__hint">
                  Docker-style <code>label-model-version</code>. Model &amp; version fill in from your selections above.
                  {form.label.trim() && form.model && form.firmwareVersionId && !nameValid &&
                    <span className="fi-name-preview__err"> · Name must be exactly three segments and ≤ {window.FI_NAME_MAX} chars.</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="info-card">
              <div className="info-card__head"><div className="info-card__title">PEP baseline</div><span className="muted" style={{ fontSize: 12 }}>Required</span></div>
              <div className="info-card__body">
                <FiPepCard pepVersionId={form.pepVersionId} onChange={(v) => set({ pepVersionId: v })}/>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card__head">
                <div className="info-card__title">Apps</div>
              </div>
              <div className="info-card__body">
                <FiAppsSelector
                  model={form.model}
                  systemRefs={form.systemAppRefs}
                  isvRefs={form.isvAppRefs}
                  onToggleSystem={toggleSystem}
                  onChangeSystemVersion={changeSystemVersion}
                  onToggleIsv={toggleIsv}
                  onChangeIsvVersion={changeIsvVersion}/>
              </div>
            </div>
          </>
        )}

        <window.WizardFooter
          step={step} totalSteps={2}
          onBack={() => setStep(s => Math.max(1, s - 1))}
          backLabel="Previous"
          onNext={() => setStep(s => s + 1)} nextDisabled={!step1Valid}
          onFinal={submit} finalDisabled={!canCreate}
          finalLabel="Create factory image"/>
      </div>
    </div>
  );
};

window.FactoryImageWizard       = FactoryImageWizard;
window.FiStepper                = FiStepper;
window.FiModelFirmwareFields    = FiModelFirmwareFields;
window.FiPepCard                = FiPepCard;
window.FiAppsSelector           = FiAppsSelector;
window.fiFirmwareVersionsForModel = fiFirmwareVersionsForModel;
window.fiDefaultFirmwareVersionId = fiDefaultFirmwareVersionId;
