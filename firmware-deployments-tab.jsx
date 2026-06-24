/* global React, Btn, Badge, Input, Icon, Modal, CompanyLogo, useToast, fmtDate */
// ─────────────────────────────────────────────────────────────
// Firmware — Deployments tab.
//
// ISO-centric view of publishing. Mirrors the System-App "Deployments"
// (rollouts) table visual language: one row per ISO customer, ISO avatar
// + meta on the left, staged-vs-synced status on the right.
//
// KEY DIFFERENCE vs. System Apps:
//   A System-App rollout pins ONE target version per ISO. Firmware is
//   different — an ISO can have MANY firmware versions visible at once
//   (the ISO's OTA menu lists every version we've published to them, and
//   the ISO independently decides which to roll out). So each ISO row here
//   carries a LIST of published versions, and Assign / Edit lets you add &
//   remove versions from that list (pre-selected with what's already
//   published to that ISO).
//
// Data model is unchanged: each firmware *version* still owns
// `publishedToIsoIds`. This tab just flips the index (group by ISO) and
// writes back through `onMutateFirmware`. Publishing logic lives ONLY
// here now — the Versions tab is read-only w.r.t. audience.
// ─────────────────────────────────────────────────────────────

const { useState: useStateFDep, useMemo: useMemoFDep, useEffect: useEffectFDep } = React;

const CURRENT_USER_FWDEP = 'ops@carbon';

// ── Core mutation: set the exact version-set published to one ISO. ──
// Walks every version, flipping this ISO in/out of publishedToIsoIds to
// match `nextVersionIds`, and appends a publishEvents row per touched
// version so the Activity timeline stays accurate.
const applyIsoVersionSet = (fw, isoId, nextVersionIds, note) => {
  const now = new Date().toISOString();
  const nextSet = new Set(nextVersionIds);
  return {
    ...fw,
    versions: fw.versions.map((v) => {
      const oldIds = v.publishedToIsoIds || [];
      const wasOn = oldIds.includes(isoId);
      const nowOn = nextSet.has(v.id);
      if (wasOn === nowOn) return v;                       // untouched
      const ids = nowOn ? [...oldIds, isoId] : oldIds.filter((id) => id !== isoId);
      const action = (nowOn && oldIds.length === 0) ? 'publish'
                   : (!nowOn && ids.length === 0)    ? 'unpublish'
                   : 'audience-edit';
      const ev = { at: now, by: CURRENT_USER_FWDEP, action, isoIds: ids, ...(note ? { note } : {}) };
      // Status stays 'published' — assigning/unassigning ISOs only changes the
      // audience, never takes the version down. (Takedown is a separate,
      // explicit action on the Versions tab.)
      return {
        ...v,
        publishedToIsoIds: ids,
        publishEvents: [...(v.publishEvents || []), ev],
      };
    }),
  };
};

// All ISO-contract customers (the deployment targets).
const fwAllIsos = () =>
  (window.SEED_CUSTOMERS || [])
    .filter((c) => (c.contracts || []).some((k) => k.kind === 'ISO'))
    .sort((a, b) => a.name.localeCompare(b.name));

// Sort versions newest-first using versionCode (falls back to authored order).
const fwSortVersions = (vs) =>
  [...vs].sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0));

// ─── Version chip ─────────────────────────────────────────
const FwVerChip = ({ v, onClick }) => (
  <button
    type="button"
    className="fwdep-chip"
    onClick={onClick}
    title={`${v.versionName} · ${v.fileSize}`}>
    <span className="fwdep-chip__name">{v.versionName}</span>
  </button>
);

// ─── Published-versions cell ──────────────────────────────
// An ISO can hold many versions. To keep the row compact we show the
// newest few chips and collapse the rest behind a "+N more" toggle; the
// "current" version is always surfaced first so it never hides.
const FwVerChips = ({ versions, onOpenVersion, max = 4 }) => {
  const [expanded, setExpanded] = useStateFDep(false);
  // Versions arrive newest-first; show them in that order.
  const ordered = versions;

  const overflow = ordered.length - max;
  const shown = expanded ? ordered : ordered.slice(0, max);

  return (
    <div className="fwdep-chips">
      {shown.map((v) => (
        <FwVerChip key={v.id} v={v} onClick={() => onOpenVersion(v.id)}/>
      ))}
      {!expanded && overflow > 0 && (
        <button type="button" className="fwdep-chip fwdep-chip--more" onClick={() => setExpanded(true)}>
          +{overflow} more
        </button>
      )}
      {expanded && ordered.length > max && (
        <button type="button" className="fwdep-chip fwdep-chip--more" onClick={() => setExpanded(false)}>
          Show less
        </button>
      )}
    </div>
  );
};

// ─── Deployments tab ──────────────────────────────────────
const TabFwDeployments = ({ firmware, onMutateFirmware, onOpenVersion }) => {
  const toast = useToast();
  const [q, setQ] = useStateFDep('');
  const [editCtx, setEditCtx]   = useStateFDep(null);  // { mode:'assign'|'edit', isoId? }
  const [removeCtx, setRemoveCtx] = useStateFDep(null); // { iso, versions }

  const allIsos = useMemoFDep(fwAllIsos, []);
  const allVersions = useMemoFDep(() => fwSortVersions(firmware.versions || []), [firmware.versions]);

  // isoId → [versions published to it]  (newest first)
  const isoToVersions = useMemoFDep(() => {
    const map = {};
    for (const v of firmware.versions || []) {
      for (const id of (v.publishedToIsoIds || [])) {
        (map[id] = map[id] || []).push(v);
      }
    }
    Object.keys(map).forEach((id) => { map[id] = fwSortVersions(map[id]); });
    return map;
  }, [firmware.versions]);

  // Rows = ISOs that currently have ≥1 published version.
  const deployedIsos = useMemoFDep(
    () => allIsos.filter((iso) => (isoToVersions[iso.id] || []).length > 0),
    [allIsos, isoToVersions]
  );

  const filtered = useMemoFDep(
    () => deployedIsos.filter((iso) => !q.trim() || iso.name.toLowerCase().includes(q.toLowerCase())),
    [deployedIsos, q]
  );

  // ISOs not yet deployed (for the Assign picker).
  const undeployedIsos = useMemoFDep(
    () => allIsos.filter((iso) => (isoToVersions[iso.id] || []).length === 0),
    [allIsos, isoToVersions]
  );

  const totalDeployments = useMemoFDep(
    () => deployedIsos.reduce((n, iso) => n + (isoToVersions[iso.id] || []).length, 0),
    [deployedIsos, isoToVersions]
  );

  // ── Apply a version-set to one or many ISOs ──────────────
  // `isoIds` is always an array. Edit mode passes a single ISO (and we
  // detect a no-op); assign mode may pass many, applying the same version
  // set to each in one mutation.
  const applySet = (isoIds, versionIds) => {
    const ids = (Array.isArray(isoIds) ? isoIds : [isoIds]).filter(Boolean);
    if (ids.length === 0) { setEditCtx(null); return; }

    // Edit mode — single existing ISO, detect "no change".
    if (editCtx?.mode === 'edit' && ids.length === 1) {
      const isoId = ids[0];
      const iso = allIsos.find((i) => i.id === isoId);
      const before = (isoToVersions[isoId] || []).map((v) => v.id);
      const beforeSet = new Set(before);
      const afterSet = new Set(versionIds);
      const added = versionIds.filter((id) => !beforeSet.has(id)).length;
      const removed = before.filter((id) => !afterSet.has(id)).length;
      if (added === 0 && removed === 0) {
        setEditCtx(null);
        toast({ kind: 'info', title: 'No changes', msg: 'Version set is unchanged.' });
        return;
      }
      onMutateFirmware && onMutateFirmware((fw) => applyIsoVersionSet(fw, isoId, versionIds, null));
      setEditCtx(null);
      if (versionIds.length === 0) {
        toast({ kind: 'warning', title: `Unpublished · ${iso?.name || 'ISO'}`, msg: 'No firmware versions are published to this ISO anymore.' });
      } else {
        toast({
          kind: 'success',
          title: `Deployment updated · ${iso?.name || 'ISO'}`,
          msg: `${versionIds.length} version${versionIds.length === 1 ? '' : 's'} published${added || removed ? ` (${[added && `+${added}`, removed && `−${removed}`].filter(Boolean).join(' ')})` : ''}.`,
        });
      }
      return;
    }

    // Assign mode — one or many ISOs get the same version set.
    onMutateFirmware && onMutateFirmware((fw) => {
      let next = fw;
      for (const isoId of ids) next = applyIsoVersionSet(next, isoId, versionIds, null);
      return next;
    });
    setEditCtx(null);
    const only = ids.length === 1 ? allIsos.find((i) => i.id === ids[0]) : null;
    toast({
      kind: 'success',
      title: only ? `Assigned · ${only.name}` : `Assigned to ${ids.length} ISOs`,
      msg: `${versionIds.length} version${versionIds.length === 1 ? '' : 's'} published to ${ids.length} ISO${ids.length === 1 ? '' : 's'}.`,
    });
  };

  const doRemoveIso = (isoId) => {
    const iso = allIsos.find((i) => i.id === isoId);
    onMutateFirmware && onMutateFirmware((fw) => applyIsoVersionSet(fw, isoId, [], null));
    setRemoveCtx(null);
    toast({ kind: 'warning', title: `Unpublished · ${iso?.name || 'ISO'}`, msg: 'All firmware versions unpublished from this ISO. Already-rolled-out terminals are unaffected.' });
  };

  const hasAnyVersions = (firmware.versions || []).length > 0;

  return (
    <div>
      {/* Heading + Assign */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>ISO deployments</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5 }}>
            Each ISO sees the firmware versions published to it in their OTA menu. Assign an ISO and pick which versions it can see — add or remove versions any time.
          </p>
        </div>
        <Btn variant="primary" icon="plus"
          disabled={!hasAnyVersions || undeployedIsos.length === 0}
          onClick={() => setEditCtx({ mode: 'assign' })}>Assign ISO</Btn>
      </div>

      {/* Empty state */}
      {deployedIsos.length === 0 ? (
        <div style={{
          padding: '40px 24px', borderRadius: 8,
          background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-default)',
          textAlign: 'center',
        }}>
          <Icon name="bolt" size={28} style={{ color: 'var(--color-text-tertiary)' }}/>
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 500 }}>No ISO deployments yet</div>
          <p style={{ marginTop: 4, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            {hasAnyVersions
              ? 'Assign this firmware to an ISO and pick which versions it can see in its OTA management menu.'
              : 'Upload a firmware version first, then assign it to ISOs here.'}
          </p>
          {hasAnyVersions && (
            <div style={{ marginTop: 14, display: 'inline-flex' }}>
              <Btn variant="primary" icon="plus" onClick={() => setEditCtx({ mode: 'assign' })}>Assign ISO</Btn>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ width: 240 }}>
              <Input size="sm" prefix={<Icon name="search" size={12}/>}
                placeholder="Search ISO…" value={q} onChange={(e) => setQ(e.target.value)}/>
            </div>
            <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
              <strong style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{deployedIsos.length}</strong> ISO{deployedIsos.length === 1 ? '' : 's'} ·{' '}
              <strong style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{totalDeployments}</strong> version assignment{totalDeployments === 1 ? '' : 's'}
            </span>
          </div>

          {/* Table */}
          <div className="table-card">
            <table className="tds-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>ISO</th>
                  <th>Published versions</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Versions</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4}><div className="empty">No ISOs match “{q}”.</div></td></tr>
                )}
                {filtered.map((iso) => {
                  const vs = isoToVersions[iso.id] || [];
                  return (
                    <tr key={iso.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CompanyLogo name={iso.name} size={32}/>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em' }}>{iso.name}</div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{iso.country || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <FwVerChips versions={vs} onOpenVersion={onOpenVersion}/>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="num" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 500 }}>{vs.length}</span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button type="button" className="fwdep-act" onClick={() => setEditCtx({ mode: 'edit', isoId: iso.id })}>
                            <Icon name="settings" size={11}/> Edit versions
                          </button>
                          <button type="button" className="fwdep-act fwdep-act--danger" onClick={() => setRemoveCtx({ iso, versions: vs })}>
                            <Icon name="x" size={11}/> Unpublish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Assign / Edit modal */}
      {editCtx && (
        <FwDeployModal
          mode={editCtx.mode}
          firmware={firmware}
          allVersions={allVersions}
          undeployedIsos={undeployedIsos}
          allIsos={allIsos}
          fixedIsoId={editCtx.isoId}
          currentVersionIds={editCtx.isoId ? (isoToVersions[editCtx.isoId] || []).map((v) => v.id) : []}
          onClose={() => setEditCtx(null)}
          onApply={applySet}/>
      )}

      {/* Remove confirm */}
      {removeCtx && (
        <Modal open onClose={() => setRemoveCtx(null)} width={480}
          title={`Unpublish from ${removeCtx.iso.name}?`}
          footer={<>
            <Btn variant="ghost" onClick={() => setRemoveCtx(null)}>Cancel</Btn>
            <Btn variant="danger" icon="x" onClick={() => doRemoveIso(removeCtx.iso.id)}>Unpublish</Btn>
          </>}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            About to unpublish all <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{removeCtx.versions.length} version{removeCtx.versions.length === 1 ? '' : 's'}</strong> from <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{removeCtx.iso.name}</strong>.<br/><br/>
            This ISO will no longer see this firmware in its OTA management menu. Already-rolled-out terminals keep running their installed version. Release history is preserved — you can re-assign later.
          </div>
        </Modal>
      )}

      <style>{`
        .fwdep-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .fwdep-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px; border-radius: 999px; cursor: pointer;
          background: var(--color-bg-2); border: 1px solid var(--color-border-default);
          color: var(--color-text-secondary); transition: all 0.12s;
        }
        .fwdep-chip:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwdep-chip__name { font-family: var(--font-family-mono); font-size: 12px; font-weight: 500; }
        .fwdep-chip--more {
          font: 500 11px var(--font-family-sans);
          color: var(--color-text-tertiary);
          background: transparent; border-style: dashed;
        }
        .fwdep-chip--more:hover { color: var(--color-text-primary); border-color: var(--color-border-strong); background: var(--color-bg-2); }

        .fwdep-act {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 9px; border-radius: 6px;
          border: 1px solid var(--color-border-default); background: var(--color-bg-2);
          color: var(--color-text-secondary); font: 500 11.5px var(--font-family-sans);
          cursor: pointer; transition: all 0.12s;
        }
        .fwdep-act:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwdep-act--danger:hover { border-color: var(--color-error-500, oklch(58% 0.22 25)); color: var(--color-error-700, oklch(45% 0.22 25)); }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Assign / Edit modal — pick an ISO (assign mode) + a version-set.
// Pre-selects the versions already published to the ISO.
// ─────────────────────────────────────────────────────────────
const FwDeployModal = ({
  mode,               // 'assign' | 'edit'
  firmware,
  allVersions,        // newest-first
  undeployedIsos,     // for assign picker
  allIsos,
  fixedIsoId,         // edit mode
  currentVersionIds,  // pre-selected
  onClose,
  onApply,            // (isoIds[], versionIds[]) => void
}) => {
  const isEdit = mode === 'edit';
  const [selectedIsos, setSelectedIsos] = useStateFDep(() => new Set());  // assign mode (multi)
  const [selected, setSelected] = useStateFDep(() => new Set(currentVersionIds || []));
  const [isoQ, setIsoQ] = useStateFDep('');
  const [isoPage, setIsoPage] = useStateFDep(0);
  const ISO_PAGE_SIZE = 7;

  useEffectFDep(() => {
    setSelected(new Set(currentVersionIds || []));
  }, [fixedIsoId]);

  useEffectFDep(() => { setIsoPage(0); }, [isoQ]);

  const fixedIso = isEdit ? allIsos.find((i) => i.id === fixedIsoId) : null;
  const eligibleIsos = undeployedIsos.filter((i) => !isoQ.trim() || i.name.toLowerCase().includes(isoQ.toLowerCase()));

  // Pagination over the (search-filtered) eligible ISO list.
  const isoTotalPages = Math.max(1, Math.ceil(eligibleIsos.length / ISO_PAGE_SIZE));
  const isoPageClamped = Math.min(isoPage, isoTotalPages - 1);
  const pagedIsos = eligibleIsos.slice(isoPageClamped * ISO_PAGE_SIZE, isoPageClamped * ISO_PAGE_SIZE + ISO_PAGE_SIZE);
  const allEligibleSelected = eligibleIsos.length > 0 && eligibleIsos.every((i) => selectedIsos.has(i.id));

  const toggleIso = (id) => {
    const next = new Set(selectedIsos);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIsos(next);
  };
  // Select-all toggles every ISO that matches the current search (across pages).
  const toggleAllIsos = () => {
    const next = new Set(selectedIsos);
    if (allEligibleSelected) eligibleIsos.forEach((i) => next.delete(i.id));
    else eligibleIsos.forEach((i) => next.add(i.id));
    setSelectedIsos(next);
  };

  const toggleVersion = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  // Taken-down ('unpublished') versions can't be assigned — only published
  // ones are selectable.
  const selectableVersions = useMemoFDep(() => allVersions.filter((v) => v.status !== 'unpublished'), [allVersions]);
  const allSelected = selectableVersions.length > 0 && selectableVersions.every((v) => selected.has(v.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableVersions.map((v) => v.id)));
  };

  const baseSet = new Set(currentVersionIds || []);
  const added = [...selected].filter((id) => !baseSet.has(id)).length;
  const removed = (currentVersionIds || []).filter((id) => !selected.has(id)).length;
  const willClear = isEdit && selected.size === 0;
  const canConfirm = isEdit
    ? (added > 0 || removed > 0)
    : (selectedIsos.size > 0 && selected.size > 0);

  const submit = () => onApply(isEdit ? [fixedIsoId] : [...selectedIsos], [...selected]);

  return (
    <Modal open onClose={onClose} width={isEdit ? 600 : 760}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>{isEdit ? 'Edit published versions' : 'Assign ISO'}</span>
          <span className="fwdep-vchip">
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>{firmware.modelCode} · {firmware.deviceFlag}</span>
            {fixedIso && <><span style={{ opacity: 0.5 }}>/</span><span style={{ fontWeight: 600 }}>{fixedIso.name}</span></>}
          </span>
        </div>
      }
      footer={<>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {!isEdit && (
            <><strong style={{ color: 'var(--color-text-secondary)' }}>{selectedIsos.size}</strong> ISO{selectedIsos.size === 1 ? '' : 's'} · </>
          )}
          <strong style={{ color: 'var(--color-text-secondary)' }}>{selected.size}</strong> version{selected.size === 1 ? '' : 's'} selected
          {isEdit && added > 0 && <span> · <span style={{ color: 'oklch(50% 0.16 152)' }}>+{added}</span></span>}
          {isEdit && removed > 0 && <span> · <span style={{ color: 'oklch(50% 0.18 25)' }}>−{removed}</span></span>}
        </div>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant={willClear ? 'danger' : 'primary'} icon={willClear ? 'x' : 'check'}
          disabled={!canConfirm} onClick={submit}>
          {willClear ? 'Unpublish'
            : isEdit ? 'Save versions'
            : `Publish to ${selectedIsos.size} ISO${selectedIsos.size === 1 ? '' : 's'}`}
        </Btn>
      </>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="fwdep-help">
          <Icon name="info" size={13}/>
          <span>
            {isEdit
              ? 'Tick the versions this ISO can see. Unticking a version unpublishes it from this ISO; clearing everything unassigns the ISO. Terminals already running a version are unaffected.'
              : 'Pick one or more ISOs, then tick which firmware versions they can see in their OTA menu. The same version set is published to every selected ISO — you can change each one later.'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr' : 'minmax(0,1fr) minmax(0,1.1fr)', gap: 12 }}>
          {/* ISO picker (assign mode only) — multi-select */}
          {!isEdit && (
            <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', background: 'var(--color-bg-3)', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="overline" style={{ fontSize: 10 }}>ISOs ({eligibleIsos.length}{selectedIsos.size > 0 ? ` · ${selectedIsos.size} selected` : ''})</span>
                {eligibleIsos.length > 0 && (
                  <button type="button" className="fwdep-link" onClick={toggleAllIsos}>{allEligibleSelected ? 'Deselect all' : 'Select all'}</button>
                )}
              </div>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <Input size="sm" prefix={<Icon name="search" size={12}/>} placeholder="Search ISOs…" value={isoQ} onChange={(e) => setIsoQ(e.target.value)}/>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', flex: 1 }}>
                {eligibleIsos.length === 0 ? (
                  <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                    {undeployedIsos.length === 0 ? 'Every ISO already has a deployment. Use Edit on a row to change versions.' : 'No ISOs match.'}
                  </div>
                ) : pagedIsos.map((iso) => {
                  const on = selectedIsos.has(iso.id);
                  return (
                    <label key={iso.id} className={`fwdep-vrow ${on ? 'is-on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleIso(iso.id)}/>
                      <CompanyLogo name={iso.name} size={26}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{iso.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{iso.country || '—'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {isoTotalPages > 1 && (
                <div className="fwdep-pager">
                  <button type="button" className="fwdep-pager__btn" disabled={isoPageClamped === 0} onClick={() => setIsoPage(isoPageClamped - 1)}>
                    <Icon name="chevL" size={12}/> Prev
                  </button>
                  <span className="fwdep-pager__label">Page {isoPageClamped + 1} of {isoTotalPages}</span>
                  <button type="button" className="fwdep-pager__btn" disabled={isoPageClamped >= isoTotalPages - 1} onClick={() => setIsoPage(isoPageClamped + 1)}>
                    Next <Icon name="chevR" size={12}/>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Version checklist */}
          <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', background: 'var(--color-bg-3)', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="overline" style={{ fontSize: 10 }}>Versions ({allVersions.length})</span>
              {allVersions.length > 0 && (
                <button type="button" className="fwdep-link" onClick={toggleAll}>{allSelected ? 'Deselect all' : 'Select all'}</button>
              )}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {allVersions.length === 0 ? (
                <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                  No versions uploaded yet.
                </div>
              ) : allVersions.map((v) => {
                const on = selected.has(v.id);
                const wasOn = baseSet.has(v.id);
                const isUnpub = v.status === 'unpublished';
                const diff = isEdit ? (on && !wasOn ? 'added' : !on && wasOn ? 'removed' : '') : '';
                const st = window.FW_VERSION_TONE[v.status] || { label: v.status, tone: 'neutral' };
                return (
                  <label key={v.id} className={`fwdep-vrow ${on ? 'is-on' : ''} ${diff} ${isUnpub ? 'is-disabled' : ''}`}>
                    <input type="checkbox" checked={on} disabled={isUnpub} onChange={() => !isUnpub && toggleVersion(v.id)}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 500 }}>{v.versionName}</span>
                        {v.current && <Badge tone="info" dot>Current</Badge>}
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {isUnpub ? (
                          <span>Taken down — re-publish from the Versions tab to deploy it again.</span>
                        ) : (
                          <>
                            <span style={{ fontFamily: 'var(--font-family-mono)' }}>{v.fileSize}</span> · uploaded {fmtDate(v.uploadedAt)} ·{' '}
                            {(v.publishedToIsoIds || []).length} ISO{(v.publishedToIsoIds || []).length === 1 ? '' : 's'}
                          </>
                        )}
                      </div>
                    </div>
                    {diff === 'added'   && <span className="fwdep-tag fwdep-tag--add">+ Add</span>}
                    {diff === 'removed' && <span className="fwdep-tag fwdep-tag--rm">− Remove</span>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fwdep-vchip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 9px; border-radius: 999px;
          background: var(--color-bg-3); border: 1px solid var(--color-border-subtle);
          color: var(--color-text-secondary); font-size: 12px;
        }
        .fwdep-help {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 14px; border-radius: 8px;
          background: oklch(96% 0.02 252 / 0.5);
          border: 1px solid oklch(58% 0.10 252 / 0.20);
          color: oklch(40% 0.14 252);
          font-size: 12px; line-height: 1.55;
        }
        [data-theme="dark"] .fwdep-help { background: oklch(28% 0.04 252 / 0.4); color: oklch(78% 0.10 252); }
        .fwdep-link { border: 0; background: transparent; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--color-text-secondary); padding: 2px 6px; border-radius: 4px; }
        .fwdep-link:hover { background: var(--color-bg-1); color: var(--color-text-primary); }
        .fwdep-vrow {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid var(--color-border-subtle);
          cursor: pointer; transition: background 0.1s;
        }
        .fwdep-vrow:last-child { border-bottom: 0; }
        .fwdep-vrow:hover { background: var(--color-bg-3); }
        .fwdep-vrow.is-on { background: var(--color-primary-50, oklch(96% 0.02 262)); }
        .fwdep-vrow.is-disabled { opacity: 0.5; cursor: not-allowed; }
        .fwdep-vrow.is-disabled:hover { background: transparent; }
        .fwdep-vrow input { accent-color: var(--color-primary-700); cursor: pointer; }
        .fwdep-vrow input:disabled { cursor: not-allowed; }
        .fwdep-vrow.added   { background: oklch(96% 0.04 152 / 0.6); }
        .fwdep-vrow.removed {
          background: oklch(96% 0.04 25 / 0.5);
          text-decoration: line-through; text-decoration-color: oklch(60% 0.12 25); text-decoration-thickness: 1px;
        }
        [data-theme="dark"] .fwdep-vrow.added   { background: oklch(28% 0.08 152 / 0.4); }
        [data-theme="dark"] .fwdep-vrow.removed { background: oklch(28% 0.08 25 / 0.4); }
        .fwdep-tag { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 999px; letter-spacing: 0.02em; }
        .fwdep-tag--add { background: oklch(94% 0.06 152); color: oklch(38% 0.14 152); }
        .fwdep-tag--rm  { background: oklch(94% 0.06 25);  color: oklch(40% 0.18 25); }
        [data-theme="dark"] .fwdep-tag--add { background: oklch(30% 0.10 152); color: oklch(85% 0.10 152); }
        [data-theme="dark"] .fwdep-tag--rm  { background: oklch(30% 0.10 25);  color: oklch(85% 0.10 25); }
        .fwdep-pager {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 7px 10px; border-top: 1px solid var(--color-border-subtle);
          background: var(--color-bg-3);
        }
        .fwdep-pager__label { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-family-mono); }
        .fwdep-pager__btn {
          display: inline-flex; align-items: center; gap: 4px;
          border: 1px solid var(--color-border-default); background: var(--color-bg-1);
          color: var(--color-text-secondary); font: 500 11.5px var(--font-family-sans);
          padding: 4px 9px; border-radius: 6px; cursor: pointer; transition: all 0.1s;
        }
        .fwdep-pager__btn:hover:not(:disabled) { border-color: var(--color-border-strong); color: var(--color-text-primary); }
        .fwdep-pager__btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
};

Object.assign(window, { TabFwDeployments });

// Count of ISOs that have ≥1 published version (for the tab badge).
window.fwDeployedIsoCount = (fw) => {
  const ids = new Set();
  for (const v of (fw.versions || [])) {
    for (const id of (v.publishedToIsoIds || [])) ids.add(id);
  }
  return ids.size;
};
