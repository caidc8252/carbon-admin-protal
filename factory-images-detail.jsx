/* global React, Btn, Input, Field, Icon, Badge, Modal, CompanyLogo, useToast, fmtDate, fmtDateTime, relTime */
// ─────────────────────────────────────────────────────────────
// Factory Image Detail.
//
// Top action bar:
//   Edit · QR / Bundle
//
// Tabs:
//   Overview · Payload · ISO customers · QR & Bundle · History
//
// The detail page reuses the ModelBundleCard from the wizard via Edit
// modal (single editable form, all sections).
// ─────────────────────────────────────────────────────────────
const { useState: useStateFD } = React;

const CURRENT_USER_EMAIL_FD = 'jordan.diaz@carbon';

// ── Header card (merchant-detail style: icon + title + meta row) ──
const FiHeaderCard = ({ factoryImage, onOpenCustomer, onEdit, onBack }) => {
  const iso = (factoryImage.isoCustomerIds || [])
    .map(id => (window.SEED_CUSTOMERS || []).find(c => c.id === id))
    .filter(Boolean)[0];
  const modelCount = Object.keys(factoryImage.payload?.byModel || {}).length;
  const pkgCount = window.factoryImageTotalPackageCount(factoryImage);

  const isoStatusTone = iso && (iso.status === 'Active' ? 'success' : iso.status === 'Onboarding' ? 'info' : 'neutral');

  return (
    <div className="det-header fi-head">
      {onBack &&
        <button type="button" className="det-back" onClick={onBack} aria-label="Back to Factory Images" title="Back to Factory Images" style={{ alignSelf: 'flex-start' }}><Icon name="chevL" size={18}/></button>}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
        <div className="fid-bigicon">
          <Icon name="package" size={22}/>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{factoryImage.name}</h2>
            <Badge tone="neutral" dot>{modelCount} model{modelCount === 1 ? '' : 's'}</Badge>
            <Badge tone="info" dot>{pkgCount} package{pkgCount === 1 ? '' : 's'}</Badge>
            <span className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>· {factoryImage.id}</span>
          </div>

          {/* Meta row */}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', rowGap: 8, columnGap: 20, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {/* Bound ISO — clickable */}
            {iso ? (
              <button type="button"
                onClick={() => onOpenCustomer && onOpenCustomer(iso.id)}
                className="fi-head__iso"
                style={{ cursor: onOpenCustomer ? 'pointer' : 'default' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>ISO</span>
                <CompanyLogo name={iso.name} size={18}/>
                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{iso.name}</span>
                <Badge tone={isoStatusTone} dot>{iso.status || '—'}</Badge>
                {onOpenCustomer && <Icon name="chevR" size={12}/>}
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>ISO</span>
                <span className="muted">None bound</span>
              </span>
            )}
          </div>

          {/* Governance row — owner + last updated (audit, not part of flash logic) */}
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', rowGap: 6, columnGap: 22, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>OWNER</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>{factoryImage.ownerEmail}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>UPDATED</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{relTime(factoryImage.updatedAt || factoryImage.createdAt)} by {factoryImage.updatedBy || factoryImage.createdBy}</span>
            </span>
          </div>
        </div>

        <div style={{ flex: 'none' }}>
          <Btn variant="secondary" icon="settings" onClick={onEdit}>Edit</Btn>
        </div>
      </div>

      <style>{`
        .fi-head__iso {
          display: inline-flex; align-items: center; gap: 7px;
          background: transparent; border: 1px solid var(--color-border-subtle);
          border-radius: 999px; padding: 3px 10px 3px 8px;
          font-size: 12px; color: var(--color-text-secondary);
        }
        .fi-head__iso:hover { background: var(--color-bg-subtle, oklch(97% 0.005 252)); border-color: var(--color-border-default); }
      `}</style>
    </div>
  );
};

// ── Payload tab ─────────────────────────────────────────
const TabFiPayload = ({ factoryImage }) => {
  const rows = window.resolveFactoryImagePayload(factoryImage);
  if (rows.length === 0) {
    return <div className="empty">No payload configured. Use <strong>Edit</strong> to add models and packages.</div>;
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      {rows.map(({ modelCode, firmwares, systemApps, isvApps }) => (
        <div key={modelCode} className="info-card">
          <div className="info-card__head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="fi-model-chip" style={{ fontSize: 12, padding: '3px 10px' }}>{modelCode}</span>
              <div className="info-card__title" style={{ margin: 0 }}>Bundle</div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {firmwares.length + systemApps.length + isvApps.length} package{(firmwares.length + systemApps.length + isvApps.length) === 1 ? '' : 's'}
            </span>
          </div>
          <div className="info-card__body" style={{ padding: 0 }}>
            <table className="tds-table" style={{ marginBottom: 0 }}>
              <thead><tr>
                <th style={{ width: '14%' }}>Type</th>
                <th style={{ width: '28%' }}>Item</th>
                <th style={{ width: '28%' }}>Identifier</th>
                <th>Version</th>
                <th style={{ width: '14%' }}>Size</th>
              </tr></thead>
              <tbody>
                {firmwares.map(({ firmware, version }, i) => (
                  <tr key={`fw-${i}`}>
                    <td><Badge tone="info" dot>Firmware</Badge></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{firmware.modelCode}</span> <span className="muted">· {firmware.deviceFlag}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{firmware.id}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.versionName}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.fileSize}</span></td>
                  </tr>
                ))}
                {systemApps.map(({ app, version }, i) => (
                  <tr key={`sys-${i}`}>
                    <td><Badge tone="neutral" dot>System app</Badge></td>
                    <td>{app.name}</td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{app.package || app.pkg}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.name}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.size}</span></td>
                  </tr>
                ))}
                {isvApps.map(({ app, version }, i) => (
                  <tr key={`isv-${i}`}>
                    <td><Badge tone="accent" dot>ISV app</Badge></td>
                    <td>{app.name}</td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{app.package}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>{version.name}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{version.size}</span></td>
                  </tr>
                ))}
                {firmwares.length === 0 && systemApps.length === 0 && isvApps.length === 0 && (
                  <tr><td colSpan="5"><div className="empty" style={{ padding: 18 }}>No packages for {modelCode}.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ISOs tab ────────────────────────────────────────────
const TabFiIsos = ({ factoryImage, onOpenCustomer }) => {
  const isos = (factoryImage.isoCustomerIds || [])
    .map(id => (window.SEED_CUSTOMERS || []).find(c => c.id === id))
    .filter(Boolean);

  return (
    <div className="info-card">
      <div className="info-card__head">
        <div className="info-card__title">Bound ISO customers</div>
        <span className="muted" style={{ fontSize: 12 }}>{isos.length}</span>
      </div>
      <div className="info-card__body" style={{ padding: 0 }}>
        {isos.length === 0 ? (
          <div className="empty" style={{ padding: 18 }}>No ISOs bound.</div>
        ) : (
          <table className="tds-table" style={{ marginBottom: 0 }}>
            <thead><tr>
              <th style={{ width: '50%' }}>ISO</th>
              <th style={{ width: '15%' }}>Country</th>
              <th style={{ width: '15%' }}>Status</th>
              <th>Registered</th>
              <th style={{ width: '40px' }}></th>
            </tr></thead>
            <tbody>
              {isos.map(c => (
                <tr key={c.id} onClick={() => onOpenCustomer && onOpenCustomer(c.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CompanyLogo name={c.name} size={28}/>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                    </div>
                  </td>
                  <td>{c.country}</td>
                  <td>
                    {c.status === 'Active'
                      ? <Badge tone="success" dot>Active</Badge>
                      : c.status === 'Onboarding'
                      ? <Badge tone="info" dot>Onboarding</Badge>
                      : <Badge tone="neutral" dot>{c.status || '—'}</Badge>}
                  </td>
                  <td>
                    <span style={{ fontSize: 12 }}>{c.registeredAt ? fmtDate(c.registeredAt) : '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Icon name="chevR" size={14}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Factory operators scan this QR on the assembly-line tablet. The endpoint returns the per-model package manifest for the bound ISO context.
            </p>

            <div className="fid-qr-grid">
              <div className="fid-qr-glyph" aria-hidden="true">
                {/* synthetic QR glyph */}
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
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              If the factory installs offline instead of scanning the QR, download the full per-model archive as a zip. Each model is a sub-folder containing its manifest and signed binaries.
            </p>
            <Btn variant="primary" icon="download" onClick={() => toast({ kind: 'success', title: 'Bundle exported (mock)', msg: 'In production this would download a signed zip.' })}>
              Download .zip bundle
            </Btn>
          </div>
        </div>
      </div>

      <style>{`
        .fid-qr-grid {
          display: grid; grid-template-columns: 230px 1fr; gap: 24px; align-items: start;
        }
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

// ── Edit modal ──────────────────────────────────────────
// Reuses the per-model bundle UI from the wizard via a controlled form.
const EditFactoryImageModal = ({ open, factoryImage, onClose, onSave }) => {
  const [form, setForm] = useStateFD(() => buildEditForm(factoryImage));
  const allModels  = window.getFactoryImageKnownModels?.() || [];
  const firmwares  = window.SEED_FIRMWARE || [];
  const systemApps = (window.factoryImageSystemAppCatalog?.() || []).filter(a => a.status === 'published');
  const isvApps    = (window.SEED_APPS || []).filter(a => a.status === 'published');
  const isos       = window.getFactoryImageEligibleIsos();

  React.useEffect(() => {
    if (open) setForm(buildEditForm(factoryImage));
  }, [open, factoryImage]);

  if (!factoryImage) return null;

  const [tab, setTab] = useStateFD('details');
  const [isoQ, setIsoQ] = useStateFD('');

  const selectedIsoId = form.isoCustomerIds[0] || '';
  const addedModels = Object.keys(form.byModel);
  const selectedModel = addedModels[0] || '';

  const pickIso = (id) => {
    setForm({ ...form, isoCustomerIds: id ? [id] : [] });
  };
  const filteredIsos = isos.filter(c => !isoQ.trim() || c.name.toLowerCase().includes(isoQ.toLowerCase()));

  const pickModel = (m) => {
    if (!m) { setForm({ ...form, byModel: {} }); return; }
    if (form.byModel[m]) return;
    setForm({ ...form, byModel: { [m]: { firmwareRefs: [], systemAppRefs: [], isvAppRefs: [] } } });
  };
  const removeModel = () => {
    setForm({ ...form, byModel: {} });
  };
  // Single-select: at most one firmware (one device flag) per model.
  const toggleFw = (m, fwId, defaultVId) => {
    const b = form.byModel[m];
    if (!b) return;
    const current = (b.firmwareRefs || [])[0];
    const isSame = current && current.firmwareId === fwId;
    const next = isSame ? [] : [{ firmwareId: fwId, versionId: defaultVId }];
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, firmwareRefs: next } } });
  };
  const changeFwVersion = (m, fwId, newVId) => {
    const b = form.byModel[m];
    if (!b) return;
    const next = (b.firmwareRefs || []).map(r => r.firmwareId === fwId ? { ...r, versionId: newVId } : r);
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, firmwareRefs: next } } });
  };
  const toggleSys = (m, appId, versionId) => {
    const b = form.byModel[m];
    if (!b) return;
    const has = b.systemAppRefs.some(r => r.appId === appId);
    const next = has ? b.systemAppRefs.filter(r => r.appId !== appId) : [...b.systemAppRefs, { appId, versionId }];
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, systemAppRefs: next } } });
  };
  const changeSysVersion = (m, appId, newVId) => {
    const b = form.byModel[m];
    if (!b) return;
    const next = b.systemAppRefs.map(r => r.appId === appId ? { ...r, versionId: newVId } : r);
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, systemAppRefs: next } } });
  };
  const toggleIsv = (m, appId, versionId) => {
    const b = form.byModel[m];
    if (!b) return;
    const has = b.isvAppRefs.some(r => r.appId === appId);
    const next = has ? b.isvAppRefs.filter(r => r.appId !== appId) : [...b.isvAppRefs, { appId, versionId }];
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, isvAppRefs: next } } });
  };
  const changeIsvVersion = (m, appId, newVId) => {
    const b = form.byModel[m];
    if (!b) return;
    const next = b.isvAppRefs.map(r => r.appId === appId ? { ...r, versionId: newVId } : r);
    setForm({ ...form, byModel: { ...form.byModel, [m]: { ...b, isvAppRefs: next } } });
  };

  return (
    <Modal open={open} onClose={onClose} width={900}
      title={`Edit factory image · ${factoryImage.name}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon="check" disabled={!form.name.trim()}
            onClick={() => onSave({ name: form.name.trim(), isoCustomerIds: form.isoCustomerIds, byModel: form.byModel })}>
            Save changes
          </Btn>
        </>
      }>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--color-border-subtle)' }}>
        {[
          { id: 'details', label: 'Details' },
          { id: 'isos',    label: 'ISO customer' },
          { id: 'bundles', label: selectedModel ? `Model · ${selectedModel}` : 'Model' },
        ].map(t => (
          <button key={t.id} type="button"
            onClick={() => setTab(t.id)}
            style={{
              border: 0, background: 'transparent', cursor: 'pointer',
              padding: '8px 14px', fontSize: 14, fontWeight: 500,
              color: tab === t.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              borderBottom: tab === t.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 380, maxHeight: '64vh', overflow: 'auto', paddingRight: 4 }}>
        {tab === 'details' && (
          <Field label="Image name" required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} size="md"/>
          </Field>
        )}

        {tab === 'isos' && (
          <div className="stack" style={{ gap: 12 }}>
            <style>{`
              .fi-iso-list { max-height: 380px; overflow: auto; border: 1px solid var(--color-border-subtle); border-radius: 12px; background: var(--color-bg-2); }
              .fi-iso-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--color-border-subtle); cursor: pointer; transition: background .12s; }
              .fi-iso-row:last-child { border-bottom: 0; }
              .fi-iso-row:hover { background: var(--color-bg-hover); }
              .fi-iso-row.is-on { background: var(--color-primary-50); }
              .fi-iso-row input { accent-color: var(--color-primary-700); cursor: pointer; width: 16px; height: 16px; flex: none; margin: 0; }
              .fi-iso-row__name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
              .fi-iso-row__sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 1px; }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12 }}>One ISO per factory image.</span>
              {selectedIsoId && (
                <button type="button" onClick={() => pickIso('')}
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                  Clear
                </button>
              )}
            </div>
            <Input prefix={<Icon name="search" size={14}/>} placeholder="Search ISOs…" value={isoQ} onChange={e => setIsoQ(e.target.value)} size="md"/>
            <div className="fi-iso-list">
              {filteredIsos.map(c => {
                const on = selectedIsoId === c.id;
                return (
                  <label key={c.id} className={`fi-iso-row ${on ? 'is-on' : ''}`}>
                    <input type="radio" name="fi-edit-iso" checked={on}
                      onChange={() => pickIso(c.id)}
                      onClick={() => { if (on) pickIso(''); }}/>
                    <CompanyLogo name={c.name} size={28}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fi-iso-row__name">{c.name}</div>
                      <div className="fi-iso-row__sub">{c.country}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'bundles' && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="muted" style={{ fontSize: 12 }}>One model per factory image — multiple firmware variants and apps are allowed within that model.</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="tds-select tds-select--md" style={{ flex: 1, maxWidth: 320 }}>
                <select value={selectedModel} onChange={e => pickModel(e.target.value)}>
                  <option value="">Select a model…</option>
                  {allModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="tds-select__chevron"><Icon name="chevD" size={14}/></span>
              </div>
              {selectedModel && (
                <Btn variant="ghost" icon="x" onClick={removeModel}>Clear</Btn>
              )}
            </div>
            {!selectedModel ? (
              <div className="empty" style={{ padding: 24 }}>No model selected.</div>
            ) : (
              <window.ModelBundleCard
                key={selectedModel}
                modelCode={selectedModel}
                bundle={form.byModel[selectedModel]}
                firmwares={firmwares}
                systemApps={systemApps}
                isvApps={isvApps}
                expanded={true}
                singleMode={true}
                onToggle={() => {}}
                onRemove={removeModel}
                onToggleFirmware={(fwId, vId) => toggleFw(selectedModel, fwId, vId)}
                onChangeFirmwareVersion={(fwId, vId) => changeFwVersion(selectedModel, fwId, vId)}
                onToggleSysApp={(appId, vId) => toggleSys(selectedModel, appId, vId)}
                onChangeSysAppVersion={(appId, vId) => changeSysVersion(selectedModel, appId, vId)}
                onToggleIsvApp={(appId, vId) => toggleIsv(selectedModel, appId, vId)}
                onChangeIsvAppVersion={(appId, vId) => changeIsvVersion(selectedModel, appId, vId)}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

function buildEditForm(fi) {
  if (!fi) return { name: '', isoCustomerIds: [], byModel: {} };
  // Enforce single-ISO + single-model on load: keep first of each.
  const firstIso   = (fi.isoCustomerIds || [])[0];
  const modelEntry = Object.entries(fi.payload?.byModel || {})[0];
  return {
    name: fi.name,
    isoCustomerIds: firstIso ? [firstIso] : [],
    byModel: modelEntry ? {
      [modelEntry[0]]: {
        firmwareRefs:  (modelEntry[1].firmwareRefs  || []).slice(0, 1).map(r => ({ ...r })),
        systemAppRefs: (modelEntry[1].systemAppRefs || []).map(r => ({ ...r })),
        isvAppRefs:    (modelEntry[1].isvAppRefs    || []).map(r => ({ ...r })),
      },
    } : {},
  };
}

// ── Detail shell ────────────────────────────────────────
const FactoryImageDetail = ({
  factoryImage, initialTab,
  onBack, onUpdate, onOpenCustomer,
}) => {
  const toast = useToast();
  const [tab, setTab] = useStateFD(initialTab || 'payload');
  const [editOpen, setEditOpen]       = useStateFD(false);

  const pushEvent = (kind, text) => ({
    at: new Date().toISOString(), kind, actor: CURRENT_USER_EMAIL_FD, text,
  });

  const tabs = [
    { id: 'payload',  label: 'Payload',  count: window.factoryImageTotalPackageCount(factoryImage) },
    { id: 'qr',       label: 'QR & Bundle' },
  ];

  const handleSaveEdit = ({ name, isoCustomerIds, byModel }) => {
    const now = new Date().toISOString();
    const summary = describeFiEdit(factoryImage, { name, isoCustomerIds, byModel });
    onUpdate({
      ...factoryImage,
      name,
      isoCustomerIds,
      payload: { byModel },
      updatedAt: now,
      updatedBy: CURRENT_USER_EMAIL_FD,
      events: [...(factoryImage.events || []), pushEvent('edited', summary)],
    });
    toast({ kind: 'success', title: 'Saved', msg: 'Future installs will use the new payload. Devices already provisioned keep their own snapshot.' });
    setEditOpen(false);
  };

  return (
    <div className="page">
      <div className="det-band">
        <div className="det-band__inner">
      <FiHeaderCard
        factoryImage={factoryImage}
        onOpenCustomer={onOpenCustomer}
        onEdit={() => setEditOpen(true)}
        onBack={onBack}
      />
        </div>{/* det-band__inner */}

      <div className="det-tabs" style={{ marginBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} type="button"
            className={`tds-tab ${tab === t.id ? 'tds-tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
            {t.count != null && <span style={{ marginLeft: 6, fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t.count}</span>}
          </button>
        ))}
      </div>
      </div>{/* det-band */}

      {tab === 'payload'  && <TabFiPayload  factoryImage={factoryImage}/>}
      {tab === 'qr'       && <TabFiQR       factoryImage={factoryImage}/>}

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
      `}</style>
    </div>
  );
};

function describeFiEdit(prev, next) {
  const parts = [];
  if (prev.name !== next.name) parts.push('name');
  const isoB = (prev.isoCustomerIds || []).slice().sort().join(',');
  const isoA = (next.isoCustomerIds || []).slice().sort().join(',');
  if (isoB !== isoA) parts.push('ISO bindings');
  const mB = Object.keys(prev.payload?.byModel || {}).sort().join(',');
  const mA = Object.keys(next.byModel || {}).sort().join(',');
  if (mB !== mA) parts.push('model coverage');
  const payB = JSON.stringify(prev.payload?.byModel || {});
  const payA = JSON.stringify(next.byModel || {});
  if (payB !== payA && mB === mA) parts.push('payload');
  if (parts.length === 0) return 'No-op edit';
  return `Updated ${parts.join(', ')}`;
}

window.FactoryImageDetail = FactoryImageDetail;
// Expose the wizard's ModelBundleCard for re-use in the edit modal.
// (factory-images-wizard.jsx defines it as a local const; we publish it
// onto window from there.)
