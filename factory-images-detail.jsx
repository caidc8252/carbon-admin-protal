/* global React, Btn, Input, Field, Icon, Badge, Modal, CompanyLogo, useToast, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// Factory Image Detail.
//
// Header meta (audit, not flash logic): firmware version · PEP version ·
// maintainer · updated. No ISO block, no jump-to-ISO button.
//
// Tabs: Payload · QR & Bundle · History.
//
// Edit happens in a modal that reuses the wizard's three building-block
// cards (model + firmware, PEP, apps).
// ─────────────────────────────────────────────────────────────
const { useState: useStateFD } = React;

const CURRENT_USER_EMAIL_FD = 'jordan.diaz@carbon';

// ── Payload tab ─────────────────────────────────────────
const TabFiPayload = ({ factoryImage }) => {
  const rows = window.resolveFactoryImagePayload(factoryImage);
  if (rows.length === 0) {
    return <div className="empty">No payload configured. Use <strong>Edit</strong> to set the firmware, PEP, and apps.</div>;
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      {rows.map(({ modelCode, firmwares, pep, systemApps, isvApps }) => {
        return (
          <div key={modelCode} className="info-card">
            <div className="info-card__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="fi-model-chip" style={{ fontSize: 12.5, padding: '3px 10px' }}>{modelCode}</span>
                <div className="info-card__title" style={{ margin: 0 }}>Bundle</div>
              </div>
            </div>
            <div className="info-card__body" style={{ padding: 0 }}>
              <table className="tds-table" style={{ marginBottom: 0 }}>
                <thead><tr>
                  <th style={{ width: '34%' }}>Item</th>
                  <th style={{ width: '32%' }}>Identifier</th>
                  <th>Version</th>
                  <th style={{ width: '14%' }}>Size</th>
                </tr></thead>
                <tbody>
                  {firmwares.map(({ firmware, version }, i) => (
                    <tr key={`fw-${i}`}>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{firmware.modelCode}</span> <span className="muted">· {version.hardwareId}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5 }}>{firmware.id}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.versionName}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.fileSize}</span></td>
                    </tr>
                  ))}
                  {pep && (
                    <tr key="pep" className="fi-pep-row">
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 500 }}>{pep.app.name}</span>
                          <Badge tone="info" dot>Baseline</Badge>
                        </span>
                      </td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5 }}>{pep.app.package}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{pep.version.name}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{pep.version.size}</span></td>
                    </tr>
                  )}
                  {systemApps.map(({ app, version }, i) => (
                    <tr key={`sys-${i}`}>
                      <td>{app.name}</td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5 }}>{app.package || app.pkg}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.name}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.size}</span></td>
                    </tr>
                  ))}
                  {isvApps.map(({ app, version }, i) => (
                    <tr key={`isv-${i}`}>
                      <td>{app.name}</td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11.5 }}>{app.package}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.name}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.size}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── QR & Bundle tab ─────────────────────────────────────
const TabFiQR = ({ factoryImage }) => {
  const toast = useToast();
  const { qr } = factoryImage;
  const url = `https://factory.npt.example/preinstall/${qr?.token}`;

  return (
    <div className="ad-grid">
      <div className="stack" style={{ gap: 16 }}>
        <div className="info-card">
          <div className="info-card__head"><div className="info-card__title">Factory QR endpoint</div></div>
          <div className="info-card__body">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Factory operators scan this QR on the assembly-line tablet. The endpoint returns this image&apos;s pre-install manifest — firmware, PEP baseline, and apps.
            </p>

            <div className="fid-qr-grid">
              <div className="fid-qr-glyph" aria-hidden="true">
                {Array.from({ length: 21 }).map((_, r) => (
                  <div key={r} style={{ display: 'flex' }}>
                    {Array.from({ length: 21 }).map((_, c) => {
                      const seed = (qr?.token || '').charCodeAt((r * 7 + c * 13) % (qr?.token?.length || 1)) || 0;
                      const corner = (r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7);
                      const on = corner ? ((r === 0 || c === 0 || r === 6 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))) : (seed + r * c) % 3 === 0;
                      return <div key={c} className={on ? 'fid-qr-cell fid-qr-cell--on' : 'fid-qr-cell'}/>;
                    })}
                  </div>
                ))}
              </div>
              <div className="fid-qr-meta">
                <Field label="Endpoint URL">
                  <Input value={url} readOnly size="md"
                    suffix={
                      <button type="button" className="iconbtn"
                        onClick={() => { navigator.clipboard?.writeText(url); toast({ kind: 'success', title: 'URL copied' }); }}
                        title="Copy URL">
                        <Icon name="copy" size={13}/>
                      </button>
                    }/>
                </Field>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <div className="info-card">
          <div className="info-card__head"><div className="info-card__title">Offline bundle (.zip)</div></div>
          <div className="info-card__body">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              If the factory installs offline instead of scanning the QR, download this image as a signed zip — the manifest plus every firmware, PEP, and app binary.
            </p>
            <Btn variant="primary" icon="download" onClick={() => toast({ kind: 'success', title: 'Bundle exported (mock)', msg: 'In production this would download a signed zip.' })}>
              Download .zip bundle
            </Btn>
          </div>
        </div>
      </div>

      <style>{`
        .fid-qr-grid { display: grid; grid-template-columns: 230px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 760px) { .fid-qr-grid { grid-template-columns: 1fr; } }
        .fid-qr-glyph {
          width: 210px; height: 210px;
          padding: 14px; background: white; border-radius: 12px;
          border: 1px solid var(--color-border-default);
          display: flex; flex-direction: column;
        }
        .fid-qr-cell { width: 8px; height: 8px; background: transparent; }
        .fid-qr-cell--on { background: oklch(20% 0.01 252); }
        .fid-qr-meta { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
      `}</style>
    </div>
  );
};

// ── History tab ─────────────────────────────────────────
const FI_KIND_TONE = {
  created:   { tone: 'neutral', label: 'Created' },
  edited:    { tone: 'info',    label: 'Edited' },
  promoted:  { tone: 'info',    label: 'Promoted' },
};

const TabFiHistory = ({ factoryImage }) => {
  const events = (factoryImage.events || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <div className="info-card">
      <div className="info-card__head">
        <div className="info-card__title">Change history</div>
        <span className="muted" style={{ fontSize: 12 }}>{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="info-card__body">
        <div className="timeline">
          {events.map((e, i) => {
            const meta = FI_KIND_TONE[e.kind] || { tone: 'neutral', label: e.kind };
            return (
              <div key={i} className="tl-row">
                <div className={`tl-row__dot tl-row__dot--${meta.tone}`}></div>
                <div className="tl-row__title">
                  <Badge tone={meta.tone} dot>{meta.label}</Badge>
                  <span style={{ marginLeft: 8 }}>{e.text}</span>
                </div>
                <div className="tl-row__meta">
                  <span>{fmtDateTime(e.at)}</span>
                  <span>·</span>
                  <span>by <strong style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{e.actor}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Edit modal — reuses the wizard's three building-block cards ──
const EditFactoryImageModal = ({ open, factoryImage, onClose, onSave }) => {
  const [form, setForm] = useStateFD(() => buildEditForm(factoryImage));

  React.useEffect(() => {
    if (open) setForm(buildEditForm(factoryImage));
  }, [open, factoryImage]);

  if (!factoryImage) return null;

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  // Firmware version name → drives live name compose.
  const fwVersionName = (() => {
    if (!form.model || !form.firmwareVersionId) return '';
    const { versions } = window.fiFirmwareVersionsForModel(form.model);
    return versions.find(v => v.id === form.firmwareVersionId)?.versionName || '';
  })();
  const previewName = window.composeFactoryImageName(form.label, form.model, fwVersionName);
  const nameValid = window.isValidFactoryImageName(previewName);

  const canSave = !!form.label.trim() && !!form.model && !!form.firmwareVersionId && !!form.pepVersionId && nameValid;

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

  const handleSave = () => {
    const fw = window.getFactoryImageFirmwareForModel(form.model);
    onSave({
      name: previewName,
      model: form.model,
      byModel: {
        [form.model]: {
          firmwareRefs:  [{ firmwareId: fw.id, versionId: form.firmwareVersionId }],
          pepRef:        { appId: window.FI_PEP_APP_ID, versionId: form.pepVersionId },
          systemAppRefs: form.systemAppRefs,
          isvAppRefs:    form.isvAppRefs,
        },
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} width={920}
      title={`Edit factory image · ${factoryImage.name}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon="check" disabled={!canSave} onClick={handleSave}>Save changes</Btn>
        </>
      }>
      <div style={{ maxHeight: '66vh', overflow: 'auto', paddingRight: 4 }} className="stack">
        {/* Model + firmware */}
        <window.FiModelFirmwareFields
          model={form.model}
          firmwareVersionId={form.firmwareVersionId}
          onChange={({ model, firmwareVersionId }) => set({ model, firmwareVersionId })}/>

        {/* Label + name preview */}
        <Field label="Label" required hint="Leading text segment of the image name. Spaces allowed; no leading or trailing space.">
          <Input value={form.label} onChange={e => set({ label: e.target.value })} size="md" placeholder="e.g. Acme Retail"/>
        </Field>
        <div className="fi-name-preview" style={{ marginTop: -4 }}>
          <span className="fi-name-preview__lbl">Image name</span>
          <div className="fi-name-preview__val">
            <span className="fi-name-preview__name">{previewName}</span>
          </div>
          {!nameValid && form.label.trim() && form.model && form.firmwareVersionId &&
            <div className="fi-name-preview__hint"><span className="fi-name-preview__err">Name must be exactly three segments and ≤ {window.FI_NAME_MAX} chars.</span></div>}
        </div>

        {/* PEP baseline */}
        <div>
          <div className="fi-edit-sec">PEP baseline</div>
          <window.FiPepCard pepVersionId={form.pepVersionId} onChange={(v) => set({ pepVersionId: v })}/>
        </div>

        {/* Apps */}
        <div>
          <div className="fi-edit-sec">Apps <span className="muted" style={{ fontWeight: 400 }}>· {form.systemAppRefs.length + form.isvAppRefs.length} selected</span></div>
          <window.FiAppsSelector
            model={form.model}
            systemRefs={form.systemAppRefs}
            isvRefs={form.isvAppRefs}
            onToggleSystem={toggleSystem}
            onChangeSystemVersion={changeSystemVersion}
            onToggleIsv={toggleIsv}
            onChangeIsvVersion={changeIsvVersion}/>
        </div>
      </div>

      <style>{`
        .fi-edit-sec {
          font: 600 11.5px var(--font-family-sans); letter-spacing: 0.04em; text-transform: uppercase;
          color: var(--color-text-secondary); margin-bottom: 8px;
        }
      `}</style>
    </Modal>
  );
};

function buildEditForm(fi) {
  const pepApp = window.getFactoryImagePepApp?.();
  const defaultPepId = (pepApp?.versions || []).find(v => v.current)?.id || (pepApp?.versions || [])[0]?.id || '';
  if (!fi) return { label: '', model: '', firmwareVersionId: '', pepVersionId: defaultPepId, systemAppRefs: [], isvAppRefs: [] };

  const model = window.factoryImageModelCode(fi);
  const bundle = window.factoryImageBundle(fi) || {};
  // Derive the leading label segment from the name (label-model-version).
  const parts = (fi.name || '').split('-');
  const label = parts.length === 3 ? parts[0] : (fi.name || '');

  return {
    label,
    model: model || '',
    firmwareVersionId: (bundle.firmwareRefs || [])[0]?.versionId || (model ? window.fiDefaultFirmwareVersionId(model) : ''),
    pepVersionId: bundle.pepRef?.versionId || defaultPepId,
    systemAppRefs: (bundle.systemAppRefs || []).map(r => ({ ...r })),
    isvAppRefs:    (bundle.isvAppRefs    || []).map(r => ({ ...r })),
  };
}

// ── Detail shell ────────────────────────────────────────
const FactoryImageDetail = ({
  factoryImage, initialTab,
  onBack, onUpdate, onOpenCustomer,
}) => {
  const toast = useToast();
  const [tab, setTab] = useStateFD(initialTab || 'payload');
  const [editOpen, setEditOpen] = useStateFD(false);

  const pushEvent = (kind, text) => ({
    at: new Date().toISOString(), kind, actor: CURRENT_USER_EMAIL_FD, text,
  });

  const tabs = [
    { id: 'payload', label: 'Payload', count: window.factoryImageTotalPackageCount(factoryImage) },
    { id: 'qr',      label: 'QR & Bundle' },
  ];

  const handleSaveEdit = ({ name, model, byModel }) => {
    const now = new Date().toISOString();
    const summary = describeFiEdit(factoryImage, { name, byModel });
    onUpdate({
      ...factoryImage,
      name,
      payload: { byModel },
      updatedAt: now,
      updatedBy: CURRENT_USER_EMAIL_FD,
      events: [...(factoryImage.events || []), pushEvent('edited', summary)],
    });
    toast({ kind: 'success', title: 'Saved', msg: 'Future flashes use the new manifest. Devices already shipped keep their own snapshot.' });
    setEditOpen(false);
  };

  const model    = window.factoryImageModelCode(factoryImage);
  const fwName    = window.factoryImageFirmwareVersionName(factoryImage);
  const pepName   = window.factoryImagePepVersionName(factoryImage);
  const pkgCount  = window.factoryImageTotalPackageCount(factoryImage);

  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to Factory Images"
        icon={<div className="fid-bigicon" style={{ width: 48, height: 48 }}><Icon name="package" size={20}/></div>}
        title={factoryImage.name}
        titleSize="lg"
        badges={
          <>
            {model && <span className="fi-model-chip" style={{ fontSize: 12, padding: '3px 10px' }}>{model}</span>}
            <Badge tone="info" dot>{pkgCount} package{pkgCount === 1 ? '' : 's'}</Badge>
            <span className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>{factoryImage.id}</span>
          </>
        }
        meta={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>FIRMWARE</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>{fwName || '—'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>PEP</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>{pepName || '—'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>MAINTAINER</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>{factoryImage.ownerEmail}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>UPDATED</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{relTime(factoryImage.updatedAt || factoryImage.createdAt)} by {factoryImage.updatedBy || factoryImage.createdBy}</span>
            </span>
          </>
        }
        actions={<Btn variant="secondary" icon="settings" onClick={() => setEditOpen(true)}>Edit</Btn>}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count, active: tab === t.id, onClick: () => setTab(t.id) }))}
      />

      {tab === 'payload' && <TabFiPayload factoryImage={factoryImage}/>}
      {tab === 'qr'      && <TabFiQR      factoryImage={factoryImage}/>}

      <EditFactoryImageModal
        open={editOpen}
        factoryImage={factoryImage}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />

      <style>{`
        .fid-bigicon {
          width: 56px; height: 56px; border-radius: 12px;
          display: grid; place-items: center; flex: none;
          background: oklch(94% 0.04 252); color: oklch(45% 0.16 252);
          border: 1px solid oklch(58% 0.18 252 / 0.20);
        }
        [data-theme="dark"] .fid-bigicon { background: oklch(28% 0.04 252); color: oklch(75% 0.14 252); }
        .fi-pep-row td { background: var(--color-info-50, oklch(97% 0.02 240 / 0.4)); }
        [data-theme="dark"] .fi-pep-row td { background: oklch(26% 0.03 240 / 0.3); }
      `}</style>
    </div>
  );
};

function describeFiEdit(prev, next) {
  const parts = [];
  if (prev.name !== next.name) parts.push('name');
  const mB = window.factoryImageModelCode(prev);
  const mA = Object.keys(next.byModel || {})[0];
  if (mB !== mA) parts.push('model');
  const payB = JSON.stringify(prev.payload?.byModel || {});
  const payA = JSON.stringify(next.byModel || {});
  if (payB !== payA && mB === mA) parts.push('payload');
  if (parts.length === 0) return 'No-op edit';
  return `Updated ${parts.join(', ')}`;
}

window.FactoryImageDetail = FactoryImageDetail;
