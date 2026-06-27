/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, useToast, DEVICE_MODELS, moneyUSD,
   SearchBar, SearchInput, SearchSelect, SearchActions, ActiveFilters, FilterChip, useSearchBar */
const { useState, useMemo, useRef, useEffect } = React;

// ════════════════════════════════════════════════════════════
// Device Models — strict 7-field model (per business spec):
//   id · vendorPartnerId · modelCode · os · logos[] · attributes[] · description
// No extra columns (no status / orientation / resolution / price / family).
// Hardware specs live in the dynamic `attributes` array, driven by the
// system-defined ATTRIBUTE_CATALOG below.
// ════════════════════════════════════════════════════════════
const OS_TONE = { ANDROID: 'success', LINUX: 'info', RTOS: 'warning' };
const OS_OPTIONS = ['ANDROID', 'LINUX', 'RTOS'];

// ─── Vendor partners (厂家) ──────────────────────────────────
// Default vendor is Newland; structured as a list so the system can grow
// to multiple contract manufacturers later without a schema change.
const DEVICE_VENDORS = [
  { id: 'newland', name: 'Newland' },
];
const DEFAULT_VENDOR_ID = 'newland';
const vendorName = (id) => (DEVICE_VENDORS.find((v) => v.id === id) || {}).name || '—';

// ─── ATTRIBUTE CATALOG (system-defined) ─────────────────────
// Operators pick which of these to add to a model and choose values.
// type drives the editor control + the value shape:
//   multi-enum          → value: string[]   (chips, multi-select)
//   multi-enum-or-other  → value: string[]   (chips + free-text "other")
//   boolean             → value: boolean     (toggle)
//   single-enum         → value: string      (segmented single-select)
const ATTRIBUTE_CATALOG = [
  { key: 'osVersion',    label: 'OS Version',    type: 'multi-enum-or-other', options: ['Android 10', 'Android 12', 'Android 14', 'Android 16'] },
  { key: 'secondScreen', label: 'Second-screen', type: 'multi-enum-or-other', options: ['4-inch', '6-inch', '8-inch', '10-inch', '11-inch', '12-inch'] },
  { key: 'cellular',     label: 'Cellular',      type: 'boolean' },
  { key: 'wifi',         label: 'WiFi',          type: 'boolean' },
  { key: 'storage',      label: 'Storage',       type: 'multi-enum-or-other', options: ['8G', '16G', '32G', '64G'] },
];
const ATTR_BY_KEY = Object.fromEntries(ATTRIBUTE_CATALOG.map((a) => [a.key, a]));

// OS Version presets depend on the selected OS — a LINUX terminal has no
// "Android 10". The osVersion attribute's option list is scoped to the model's
// OS; values that don't belong to the active OS are dropped when the OS changes.
const OS_VERSION_OPTIONS = {
  ANDROID: ['Android 10', 'Android 12', 'Android 14', 'Android 16'],
  LINUX:   ['Linux 5.10', 'Linux 5.15', 'Linux 6.1'],
  RTOS:    ['FreeRTOS', 'RT-Thread', 'Zephyr'],
};
// Return a catalog def with OS-appropriate options (only osVersion is OS-dependent).
const scopeDef = (def, os) => def.key === 'osVersion'
  ? { ...def, options: OS_VERSION_OPTIONS[os] || def.options }
  : def;

const defaultAttrValue = (def) => {
  switch (def.type) {
    case 'boolean':     return true;
    case 'single-enum': return def.options[0];
    default:            return []; // multi-enum / multi-enum-or-other
  }
};

// Enum options shown for an attribute. The catalog ships a default set, but
// operators can add/remove options per model — those edits live on the
// attribute itself (a.options). Selected values that aren't in the option
// list (legacy / hand-typed) are surfaced so nothing silently disappears.
const attrOptions = (def, attr) => {
  const base = Array.isArray(attr && attr.options) ? attr.options : (def.options || []);
  const selectedExtras = Array.isArray(attr && attr.value)
    ? attr.value.filter((v) => !base.includes(v))
    : [];
  return [...base, ...selectedExtras];
};

// Short human-readable chips for the list / preview.
const attrSummaryChips = (model) => {
  const out = [];
  (model.attributes || []).forEach((a) => {
    const def = ATTR_BY_KEY[a.key];
    if (!def) return;
    if (def.type === 'boolean') {
      if (a.value) out.push(def.label);
    } else if (Array.isArray(a.value)) {
      if (a.value.length) out.push(`${def.label}: ${a.value.join(', ')}`);
    } else if (a.value != null && a.value !== '') {
      out.push(`${def.label}: ${a.value}`);
    }
  });
  return out;
};
const attrSummaryText = (model) => attrSummaryChips(model).join(' · ');

// Structured rows for the preview aside: one entry per attribute with its
// values split out, so long value lists wrap as individual tags instead of
// one un-wrappable chip that forces a horizontal scrollbar.
const attrSummaryRows = (model) => {
  const out = [];
  (model.attributes || []).forEach((a) => {
    const def = ATTR_BY_KEY[a.key];
    if (!def) return;
    if (def.type === 'boolean') {
      if (a.value) out.push({ label: def.label, values: ['Yes'] });
    } else if (Array.isArray(a.value)) {
      if (a.value.length) out.push({ label: def.label, values: a.value });
    } else if (a.value != null && a.value !== '') {
      out.push({ label: def.label, values: [String(a.value)] });
    }
  });
  return out;
};

// ─── Logo helpers (logos: Array<{size,url}>) ────────────────
// All four stops (140/70/55/35) share the same cropped master in this mock;
// a real backend would emit four resized files.
const logoUrlOf = (model) =>
  (model.logos && model.logos.length ? model.logos[0].url : null) || model.image || null;
const buildLogos = (url) => (url ? [140, 70, 55, 35].map((size) => ({ size, url })) : []);

// ─── Seed data ──────────────────────────────────────────────
// Project the shared commerce catalog (DEVICE_MODELS, orders-data.jsx) into the
// strict Device Model entity. Commerce fields (price/family/types) stay on the
// order/product side; here we keep only the 7 spec fields + derived attributes.
const SEED_MODEL_META = {
  'm-n950': { os: 'ANDROID', attributes: [
    { key: 'osVersion', value: ['Android 14', 'Android 16'] }, { key: 'wifi', value: true }, { key: 'cellular', value: true }, { key: 'storage', value: ['32G', '64G'] },
  ] },
  'm-s30':  { os: 'LINUX', attributes: [
    { key: 'wifi', value: true }, { key: 'cellular', value: false }, { key: 'storage', value: ['8G'] },
  ] },
  'm-s60':  { os: 'ANDROID', attributes: [
    { key: 'osVersion', value: ['Android 12'] }, { key: 'secondScreen', value: ['4-inch', '6-inch'] }, { key: 'wifi', value: true }, { key: 'cellular', value: true }, { key: 'storage', value: ['64G'] },
  ] },
  'm-s90':  { os: 'ANDROID', attributes: [
    { key: 'osVersion', value: ['Android 14'] }, { key: 'wifi', value: true }, { key: 'cellular', value: true }, { key: 'storage', value: ['32G', '64G'] },
  ] },
  'm-n750': { os: 'ANDROID', attributes: [
    { key: 'osVersion', value: ['Android 12'] }, { key: 'wifi', value: true }, { key: 'cellular', value: true }, { key: 'storage', value: ['16G'] },
  ] },
  'm-x800': { os: 'RTOS', attributes: [
    { key: 'wifi', value: true }, { key: 'cellular', value: true }, { key: 'storage', value: ['16G'] },
  ] },
};

const SEED_DEVICE_MODELS = ((typeof DEVICE_MODELS !== 'undefined' ? DEVICE_MODELS : window.DEVICE_MODELS) || []).map((m) => {
  const meta = SEED_MODEL_META[m.id] || { os: 'ANDROID', attributes: [] };
  return {
    id: m.id,
    vendorPartnerId: DEFAULT_VENDOR_ID,
    modelCode: m.name,
    os: meta.os,
    logos: [],
    attributes: meta.attributes.map((a) => ({ ...a })),
    description: m.desc,
  };
});

// ─── Tile (renders at any px; tolerant of admin model OR commerce catalog item)
const ModelTile = ({ model, px }) => {
  const fontSize = Math.max(8, Math.round(px * 0.22));
  const label = model.modelCode || model.name || '—';
  const url = logoUrlOf(model);
  if (url) {
    return (
      <span className="dm-tile" style={{ width: px, height: px }}>
        <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
      </span>
    );
  }
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return (
    <span className="dm-tile dm-tile--placeholder" style={{ width: px, height: px, background: `oklch(96% 0.03 ${hue})`, color: `oklch(38% 0.08 ${hue})`, fontSize }}>
      {label}
    </span>
  );
};

// ─── List page ──────────────────────────────────────────────
const _dmCsvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const _dmToday = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function exportDeviceModelsCsv(rows, filename) {
  const header = ['Model code', 'Vendor', 'OS', 'Attributes', 'Description'];
  const lines = [header.map(_dmCsvCell).join(',')];
  rows.forEach((m) => {
    lines.push([
      m.modelCode, vendorName(m.vendorPartnerId), m.os, attrSummaryText(m), m.description,
    ].map(_dmCsvCell).join(','));
  });
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DM_SEARCH_DEFAULTS = { q: '', os: 'All' };

// ─── Per-row overflow menu — Edit / Delete behind a kebab ──────
const RowActionsMenu = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 168;
    setPos({ left: r.right - menuW, top: r.bottom + 6, minWidth: menuW });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <div className="dm-rowmenu" ref={wrapRef} style={{ display: 'inline-block' }}>
      <button ref={btnRef} className={`iconbtn ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}
        title="More actions" aria-label="More actions" aria-haspopup="menu" aria-expanded={open}>
        <Icon name="more" size={16}/>
      </button>
      {open && pos && (
        <div className="dm-addmenu" role="menu" style={{ position: 'fixed', left: pos.left, top: pos.top, minWidth: pos.minWidth }}>
          <button type="button" role="menuitem" className="dm-rowmenu__item" onClick={() => { setOpen(false); onEdit(); }}>
            <Icon name="edit" size={15}/> Edit
          </button>
          <button type="button" role="menuitem" className="dm-rowmenu__item dm-rowmenu__item--danger" onClick={() => { setOpen(false); onDelete(); }}>
            <Icon name="trash" size={14}/> Delete
          </button>
        </div>
      )}
    </div>
  );
};

const DeviceModelList = ({ models, onNew, onEdit, onOpenFirmware, onDelete, deleteBlockReason }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [confirmDel, setConfirmDel] = useState(null);
  const [pageSize, setPageSize] = useState(25);
  const toolbarRef = useRef(null);

  const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
    useSearchBar(DM_SEARCH_DEFAULTS, () => setPage(1));

  const filtered = useMemo(() => {
    let rows = models;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      rows = rows.filter((m) =>
        m.modelCode.toLowerCase().includes(s) ||
        (m.description || '').toLowerCase().includes(s) ||
        vendorName(m.vendorPartnerId).toLowerCase().includes(s)
      );
    }
    if (applied.os !== 'All') rows = rows.filter((m) => m.os === applied.os);
    return rows;
  }, [models, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  return (
    <div className="page page--list">
      <window.TitleBar
        title="Device Models"
        subtitle="The hardware catalog. Each model defines its vendor, OS, configurable attributes and the artwork shown across the admin, customer portal and packing slips."
        actions={<Btn variant="primary" icon="plus" size="md" onClick={onNew}>New model</Btn>}
      />

      <div ref={toolbarRef} className="list-toolbar-wrap">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by model code, vendor or description…"/>
          <SearchSelect
            value={draft.os}
            onChange={(v) => setDraft({ os: v })}
            width={160}
            icon="filter"
            options={[
              { value: 'All', label: 'All OS' },
              ...OS_OPTIONS.map((o) => ({ value: o, label: o })),
            ]}/>
        </SearchBar>

        <ActiveFilters
          onClearAll={clearAll}
          hasFilters={hasFilters}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
          {applied.os !== 'All' ? <FilterChip label={`OS: ${applied.os}`} onRemove={() => clearOne('os', 'All')}/> : null}
        </ActiveFilters>
      </div>

      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={`model${filtered.length === 1 ? '' : 's'}`}
          hasFilters={hasFilters}>
          <window.ListExportMenu
            pageRows={pageRows}
            filtered={filtered}
            unit="model"
            onExport={(scope, rows) => {
              const fname = scope === 'page'
                ? `device_models_view_${_dmToday()}.csv`
                : `device_models_results_${_dmToday()}.csv`;
              exportDeviceModelsCsv(rows, fname);
              toast({
                kind: 'success',
                title: 'Export downloaded',
                desc: `${rows.length.toLocaleString()} model${rows.length === 1 ? '' : 's'} · ${fname}`
              });
            }}/>
        </window.ListCardHead>
        <table className="tds-table">
          <colgroup>
            <col style={{ width: '1%' }}/>
            <col/>
            <col/>
            <col style={{ width: '180px' }}/>
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>Model</th>
              <th>Attributes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="4"><div className="empty">No device models match your filters.</div></td></tr>
            ) : pageRows.map((m) => {
              const chips = attrSummaryChips(m);
              return (
                <tr key={m.id} onClick={() => onEdit(m.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ paddingTop: 10, paddingBottom: 10 }}>
                    <ModelTile model={m} px={48}/>
                  </td>
                  <td>
                    <div className="cust-name mono-code">{m.modelCode}</div>
                    <div className="cust-meta">{vendorName(m.vendorPartnerId)} · {m.os}</div>
                  </td>
                  <td>
                    {chips.length === 0 ? (
                      <span className="cust-meta">No attributes</span>
                    ) : (
                      <span className="dm-attrchips">
                        {chips.map((c, i) => <span key={i} className="dm-attrchip">{c}</span>)}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button className="dm-fwbtn" onClick={() => onOpenFirmware(m.id)} title="Firmware">
                        <Icon name="cpu" size={15}/> Firmware
                      </button>
                      <RowActionsMenu
                        onEdit={() => onEdit(m.id)}
                        onDelete={() => setConfirmDel(m)}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <window.Pagination
          total={filtered.length}
          totalUnfiltered={models.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          unit="models" divider/>
      </window.ListCard>

      {(() => {
        const reason = confirmDel && deleteBlockReason && deleteBlockReason(confirmDel);
        return (
          <window.Modal
            open={!!confirmDel}
            onClose={() => setConfirmDel(null)}
            width={520}
            title={`Delete ${confirmDel?.modelCode || 'model'}?`}
            footer={<>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>Cancel</Btn>
              <Btn variant="danger" size="sm" icon="trash" disabled={!!reason}
                onClick={() => { onDelete(confirmDel); setConfirmDel(null); }}>Delete model</Btn>
            </>}>
            {reason ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                            padding: '12px 14px', borderRadius: 'var(--radius-md)',
                            background: 'var(--color-warning-50)',
                            border: '1px solid var(--color-warning-200, var(--color-border-default))' }}>
                <span style={{ color: 'var(--color-warning-600, var(--color-warning-500))', flex: 'none', marginTop: 1 }}>
                  <Icon name="alert" size={16}/>
                </span>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Can’t delete this model — it’s still in use.</strong>
                  <div style={{ marginTop: 4 }}>{reason}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                Permanently removes this device model. This cannot be undone.
              </div>
            )}
          </window.Modal>
        );
      })()}
    </div>
  );
};

// ─── Image upload + interactive crop ───────────────────────
// (Unchanged cropper. Emits a single 140×140 master dataURL; the form wraps it
// into the logos[] array of four stops.)
const FRAME = 280;
const MASTER = 140;

const validateWhiteBackground = (img) => {
  const w = img.width, h = img.height;
  const pts = [
    [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
    [Math.floor(w / 2), 2], [Math.floor(w / 2), h - 3],
    [2, Math.floor(h / 2)], [w - 3, Math.floor(h / 2)],
  ];
  const raw = document.createElement('canvas');
  raw.width = w; raw.height = h;
  const rctx = raw.getContext('2d');
  rctx.clearRect(0, 0, w, h);
  rctx.drawImage(img, 0, 0);
  let bad = 0;
  for (const [x, y] of pts) {
    const d = rctx.getImageData(x, y, 1, 1).data;
    const isTransparent = d[3] < 16;
    const isWhite = d[3] > 240 && d[0] > 240 && d[1] > 240 && d[2] > 240;
    if (!isTransparent && !isWhite) bad++;
  }
  if (bad > 0) {
    return { ok: false, reason: 'Background must be solid white or transparent. Detected a colored background — please re-export the image with a white or transparent backdrop.' };
  }
  return { ok: true };
};

const renderCrop = (img, zoom, offset) => {
  const s = Math.min(FRAME / img.width, FRAME / img.height);
  const dispW = img.width * s * zoom;
  const dispH = img.height * s * zoom;
  const cx = (FRAME - dispW) / 2 + offset.x;
  const cy = (FRAME - dispH) / 2 + offset.y;
  const srcX = -cx / (s * zoom);
  const srcY = -cy / (s * zoom);
  const srcW = FRAME / (s * zoom);
  const srcH = FRAME / (s * zoom);
  const out = document.createElement('canvas');
  out.width = MASTER; out.height = MASTER;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, MASTER, MASTER);
  return out.toDataURL('image/png');
};

const ImageUploader = ({ value, onChange, modelName }) => {
  const [stage, setStage] = useState(value ? 'done' : 'drop');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rawSrc, setRawSrc] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const fileRef = useRef(null);

  const handleFiles = (files) => {
    setError(null);
    const f = files && files[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      setError('Only PNG, JPEG, or WebP images are accepted.');
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const img = new Image();
      img.onload = () => {
        const check = validateWhiteBackground(img);
        if (!check.ok) {
          setBusy(false);
          setError(check.reason);
          return;
        }
        setRawSrc(url);
        setImgEl(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setStage('adjust');
        setBusy(false);
      };
      img.onerror = () => { setBusy(false); setError('Could not decode image.'); };
      img.src = url;
    };
    reader.readAsDataURL(f);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const imgStyle = () => {
    if (!imgEl) return {};
    const s = Math.min(FRAME / imgEl.width, FRAME / imgEl.height);
    const w = imgEl.width * s;
    const h = imgEl.height * s;
    return {
      width: w + 'px',
      height: h + 'px',
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
    };
  };

  const onMouseDown = (e) => {
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.preventDefault();
  };
  useEffect(() => {
    if (stage !== 'adjust') return;
    const onMove = (e) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    };
    const onUp = () => { dragStart.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [stage]);

  const confirm = () => {
    if (!imgEl) return;
    const dataUrl = renderCrop(imgEl, zoom, offset);
    onChange(dataUrl);
    setStage('done');
  };

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const restart = () => {
    setStage('drop');
    setRawSrc(null);
    setImgEl(null);
    setError(null);
    onChange(null);
  };

  const tile = (px) => {
    if (value) {
      return (
        <span className="dm-tile" style={{ width: px, height: px }}>
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
        </span>
      );
    }
    return <ModelTile model={{ modelCode: modelName || '—' }} px={px}/>;
  };

  return (
    <div className="dm-upl">
      {stage === 'drop' && (
        <div
          className={`dm-drop ${dragOver ? 'is-over' : ''} ${error ? 'is-err' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current && fileRef.current.click()}>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)}/>
          <div className="dm-drop__empty">
            <div className="dm-drop__icon"><Icon name="upload" size={22}/></div>
            <div className="dm-drop__title">{busy ? 'Processing…' : 'Drop an image here, or click to browse'}</div>
            <div className="dm-drop__sub">PNG / WebP / JPEG · Background must be solid white or transparent</div>
          </div>
        </div>
      )}

      {stage === 'adjust' && imgEl && (
        <div className="dm-adjust">
          <div className="dm-adjust__head">
            <div>
              <div className="dm-adjust__title">Adjust the crop</div>
              <div className="dm-adjust__sub">Drag to reposition · use the slider (or scroll wheel) to zoom · the area inside the frame is what gets saved.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" variant="ghost" onClick={reset}>Reset</Btn>
              <Btn size="sm" variant="ghost" icon="x" onClick={restart}>Cancel</Btn>
            </div>
          </div>

          <div className="dm-adjust__body">
            <div
              className="dm-frame"
              onMouseDown={onMouseDown}
              onWheel={(e) => {
                e.preventDefault();
                const next = Math.max(1, Math.min(3, zoom - e.deltaY * 0.002));
                setZoom(next);
              }}>
              <img src={rawSrc} alt="" draggable={false} className="dm-frame__img" style={imgStyle()}/>
              <div className="dm-frame__overlay"/>
              <div className="dm-frame__grid"/>
            </div>

            <div className="dm-adjust__controls">
              <label className="dm-zoom">
                <span className="dm-zoom__lbl">Zoom</span>
                <input
                  type="range" min="1" max="3" step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}/>
                <span className="dm-zoom__val">{zoom.toFixed(2)}×</span>
              </label>

              <div className="dm-livepreview">
                <div className="dm-livepreview__lbl">Live preview</div>
                <div className="dm-livepreview__tiles">
                  {[70, 55, 35].map((px) => (
                    <span key={px} className="dm-tile" style={{ width: px, height: px, background: '#fff' }}>
                      <img
                        src={rawSrc}
                        alt=""
                        draggable={false}
                        style={{
                          ...imgStyle(),
                          width: (imgEl.width * Math.min(FRAME / imgEl.width, FRAME / imgEl.height)) * (px / FRAME) + 'px',
                          height: (imgEl.height * Math.min(FRAME / imgEl.width, FRAME / imgEl.height)) * (px / FRAME) + 'px',
                          transform: `translate(calc(-50% + ${offset.x * (px / FRAME)}px), calc(-50% + ${offset.y * (px / FRAME)}px)) scale(${zoom})`,
                          position: 'absolute',
                          left: '50%', top: '50%',
                        }}/>
                    </span>
                  ))}
                </div>
                <div className="dm-livepreview__sub">70 · 55 · 35 px</div>
              </div>
            </div>
          </div>

          <div className="dm-adjust__foot">
            <div className="dm-notice">
              <Icon name="check" size={14}/>
              <span>Valid background detected. The system will crop to 140 × 140 and derive the other sizes from there.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" size="md" onClick={restart}>Re-upload</Btn>
              <Btn variant="primary" size="md" icon="check" onClick={confirm}>Confirm crop</Btn>
            </div>
          </div>
        </div>
      )}

      {stage === 'done' && value && (
        <div className="dm-drop">
          <div className="dm-drop__has">
            <span className="dm-tile dm-tile--check" style={{ width: 140, height: 140, background: '#fff' }}>
              <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
            </span>
            <div className="dm-drop__has-main">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Image saved</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3 }}>Cropped to 140 × 140 · 4 sizes derived below</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn size="sm" variant="secondary" icon="edit" onClick={() => {
                  const img = new Image();
                  img.onload = () => {
                    setRawSrc(value);
                    setImgEl(img);
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                    setStage('adjust');
                  };
                  img.src = value;
                }}>Re-crop</Btn>
                <Btn size="sm" variant="ghost" icon="upload" onClick={restart}>Replace</Btn>
                <Btn size="sm" variant="ghost" icon="trash" onClick={() => { onChange(null); setStage('drop'); }}>Remove</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="dm-err">
          <Icon name="info" size={14}/>
          <span>{error}</span>
        </div>
      )}

      <div className="dm-rules">
        <div className="dm-rules__title">Upload rules</div>
        <ul>
          <li>Background must be <strong>solid white or transparent</strong> — any other color is rejected.</li>
          <li>After upload, <strong>adjust zoom &amp; position</strong> inside the square frame; the visible area is what gets saved.</li>
          <li>Confirmed crop is rendered at <strong>140 × 140</strong>, then the system derives 70 / 55 / 35 px for use across the admin and customer surfaces.</li>
        </ul>
      </div>

      <div className="dm-rules__title" style={{ marginTop: 16 }}>Saved sizes (logos)</div>
      <div className="dm-sizes">
        {[140, 70, 55, 35].map((px) => (
          <div key={px} className="dm-size">
            <div className="dm-size__tile">{tile(px)}</div>
            <div className="dm-size__lbl">{px} × {px}</div>
            <div className="dm-size__use">
              {px === 140 ? 'Detail page hero' :
               px === 70  ? 'Order line items' :
               px === 55  ? 'List rows · packing slip' :
                            'Inline chips · receipts'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── "Add attribute" dropdown ───────────────────────────────
// Add attributes one at a time: the button opens a small dropdown listing the
// attributes not yet on the model. Pick one → it's appended (seeded with a
// sensible default) and you tune its value inline in the editor below.
const AttributeAdder = ({ available, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = Math.min(available.length * 40 + 12, 320);
    const below = window.innerHeight - r.bottom;
    const openUp = below < menuH + 12 && r.top > below;
    setPos({
      left: r.left,
      top: openUp ? undefined : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
      minWidth: Math.max(r.width, 240),
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // Start a new attribute EMPTY — don't pre-select any preset values.
  // The presets stay available so the user adds them one at a time via "Add value".
  const initialValue = (def) => {
    if (def.type === 'boolean') return true;
    if (def.type === 'single-enum') return '';
    return [];
  };
  const add = (def) => {
    const value = initialValue(def);
    const entry = { key: def.key, value };
    if (def.type !== 'boolean') entry.options = [...(def.options || [])];
    onAdd(entry);
    setOpen(false);
  };

  const typeHint = (def) => def.type === 'boolean' ? 'Yes / No'
    : def.type === 'single-enum' ? `${(def.options || []).length} options · pick one`
    : `${(def.options || []).length} options`;

  return (
    <div className="dm-add" ref={wrapRef}>
      <button ref={btnRef} type="button" className={`dm-add__trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} disabled={available.length === 0}>
        <Icon name="plus" size={15}/> Add attribute
      </button>
      {open && available.length > 0 && pos && (
        <div className="dm-addmenu" style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth }}>
          {available.map((def) => (
            <button type="button" key={def.key} className="dm-addmenu__item" onClick={() => add(def)}>
              <span className="dm-addmenu__name">{def.label}</span>
              <span className="dm-addmenu__hint">{typeHint(def)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Attribute editor (dynamic) ─────────────────────────────
const AttributeEditor = ({ value, onChange, os }) => {
  const attrs = value || [];
  const usedKeys = new Set(attrs.map((a) => a.key));
  const available = ATTRIBUTE_CATALOG.filter((d) => !usedKeys.has(d.key)).map((d) => scopeDef(d, os));
  const addEntry = (entry) => onChange([...attrs, entry]);
  const addEntries = (entries) => onChange([...attrs, ...entries]);
  const removeAttr = (key) => onChange(attrs.filter((a) => a.key !== key));
  const patchAttr = (key, patch) => onChange(attrs.map((a) => a.key === key ? { ...a, ...patch } : a));
  const setVal = (key, v) => patchAttr(key, { value: v });

  return (
    <div className="dm-attrs">
      {attrs.length === 0 && (
        <div className="dm-attrs__empty">No attributes yet. Add the specs that apply to this model below.</div>
      )}

      {attrs.map((a) => {
        const def = scopeDef(ATTR_BY_KEY[a.key], os);
        if (!ATTR_BY_KEY[a.key]) return null;
        return (
          <div key={a.key} className="dm-attr">
            <div className="dm-attr__head">
              <span className="dm-attr__name">{def.label}</span>
              <button type="button" className="dm-attr__del" onClick={() => removeAttr(a.key)} title="Remove attribute">
                <Icon name="x" size={13}/>
              </button>
            </div>
            <div className="dm-attr__ctrl">
              <AttrControl
                def={def}
                value={a.value}
                options={attrOptions(def, a)}
                onChange={(v) => setVal(a.key, v)}
                onChangeOptions={(opts) => patchAttr(a.key, { options: opts })}/>
            </div>
          </div>
        );
      })}

      {available.length > 0 && (
        <AttributeAdder available={available} onAdd={addEntry}/>
      )}
    </div>
  );
};

const AttrControl = ({ def, value, options, onChange, onChangeOptions }) => {
  const [picking, setPicking] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newVal, setNewVal] = useState('');
  const opts = options || def.options || [];

  const togglePicker = () => setPicking((p) => {
    if (p) { setAddingCustom(false); setNewVal(''); } // reset custom field when closing
    return !p;
  });

  if (def.type === 'boolean') {
    return (
      <div className="dm-bool">
        <button type="button" className={`up-toggle ${value ? 'is-on' : ''}`} onClick={() => onChange(!value)}>
          <span className="up-toggle__dot"/>
        </button>
        <span className="dm-bool__lbl">{value ? 'Yes' : 'No'}</span>
      </div>
    );
  }

  // ── enum types (multi / multi-or-other / single) ───────────
  // Selected values ARE the attribute — shown as solid tags. The "+ Add value"
  // disclosure reveals the preset defaults (click to add) plus a field to type
  // a brand-new value. No grid of candidates you have to re-toggle.
  const isSingle = def.type === 'single-enum';
  const selected = isSingle
    ? (value != null && value !== '' ? [value] : [])
    : (Array.isArray(value) ? value : []);
  const remaining = opts.filter((o) => !selected.includes(o));

  const selectValue = (v) => {
    if (isSingle) { onChange(v); setPicking(false); }
    else if (!selected.includes(v)) onChange([...selected, v]);
  };
  const removeValue = (v) => {
    if (isSingle) onChange('');
    else onChange(selected.filter((x) => x !== v));
  };
  const removeDefault = (o) => {
    if (onChangeOptions) onChangeOptions(opts.filter((x) => x !== o));
  };
  const addNew = () => {
    const v = newVal.trim();
    if (!v) return;
    if (!opts.includes(v) && onChangeOptions) onChangeOptions([...opts, v]);
    selectValue(v);
    setNewVal('');
  };

  return (
    <div className="dm-vals">
      <div className="dm-vals__tags">
        {selected.length === 0 && <span className="dm-vals__empty">No value yet</span>}
        {selected.map((v) => (
          <span key={v} className="dm-tag">
            {v}
            <button type="button" className="dm-tag__x" title="Remove value" onClick={() => removeValue(v)}>
              <Icon name="x" size={11}/>
            </button>
          </span>
        ))}
        <button type="button" className={`dm-vals__addbtn ${picking ? 'is-open' : ''}`} onClick={togglePicker}>
          <Icon name="plus" size={13}/>{isSingle && selected.length ? 'Change value' : 'Add value'}
        </button>
      </div>

      {picking && (
        <div className="dm-vals__picker">
          <div className="dm-vals__picker-lbl">Preset values</div>
          <div className="dm-cands">
            {remaining.length === 0 && <span className="dm-vals__hint">All presets added — use “Custom value” to add your own.</span>}
            {remaining.map((o) => (
              <span key={o} className="dm-cand" role="button" tabIndex={0} onClick={() => selectValue(o)}>
                <Icon name="plus" size={11}/>{o}
                <button type="button" className="dm-cand__x" title="Remove from presets" onClick={(e) => { e.stopPropagation(); removeDefault(o); }}>
                  <Icon name="x" size={10}/>
                </button>
              </span>
            ))}
          </div>
          {!addingCustom ? (
            <button type="button" className="dm-vals__customtrig" onClick={() => setAddingCustom(true)}>
              <Icon name="plus" size={12}/> Custom value
            </button>
          ) : (
            <div className="dm-vals__new">
              <Input
                autoFocus
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addNew(); }
                  if (e.key === 'Escape') { e.preventDefault(); setAddingCustom(false); setNewVal(''); }
                }}
                placeholder="Type a value and press Enter"/>
              <Btn size="sm" variant="secondary" icon="plus" onClick={addNew} disabled={!newVal.trim()}>Add</Btn>
              <button type="button" className="dm-vals__customclose" title="Cancel" onClick={() => { setAddingCustom(false); setNewVal(''); }}>
                <Icon name="x" size={13}/>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Form (create / edit) ──────────────────────────────────
const blankModel = () => ({
  id: `m-${Math.random().toString(36).slice(2, 7)}`,
  vendorPartnerId: DEFAULT_VENDOR_ID,
  modelCode: '',
  os: '',
  logos: [],
  attributes: [],
  description: '',
});

const DeviceModelForm = ({ initial, allModels, onCancel, onSave }) => {
  const [m, setM] = useState(initial || blankModel());
  const toast = useToast();

  const update = (k, v) => setM((x) => {
    if (k === 'os') {
      // OS Version presets are OS-specific — drop any osVersion values that
      // don't belong to the newly-selected OS and re-scope its option list.
      const opts = OS_VERSION_OPTIONS[v] || [];
      const attributes = (x.attributes || []).map((a) => {
        if (a.key !== 'osVersion') return a;
        const keep = Array.isArray(a.value) ? a.value.filter((val) => opts.includes(val)) : [];
        return { ...a, options: [...opts], value: keep };
      });
      return { ...x, os: v, attributes };
    }
    return { ...x, [k]: v };
  });

  // Uniqueness: modelCode must be unique (case-insensitive), excluding self.
  const codeTrim = m.modelCode.trim();
  const dupCode = (allModels || []).some(
    (x) => x.id !== m.id && x.modelCode.trim().toLowerCase() === codeTrim.toLowerCase() && codeTrim
  );
  const canSave = codeTrim && !dupCode && m.os;

  const submit = () => {
    if (!canSave) {
      toast({ kind: 'error', title: dupCode ? 'Model code already exists.' : (!codeTrim ? 'Model code is required.' : 'Select an OS.') });
      return;
    }
    onSave({ ...m, modelCode: codeTrim });
    toast({ kind: 'success', title: initial ? `${codeTrim} updated` : `${codeTrim} created`, msg: 'Device model saved.' });
  };

  const uploaderValue = logoUrlOf(m);
  const setLogo = (url) => update('logos', buildLogos(url));

  return (
    <div className="page">
      <window.TitleBar
        back
        onBack={onCancel}
        backLabel={initial ? 'Back to device models' : 'Back'}
        title={initial ? `Edit · ${initial.modelCode}` : 'New device model'}
        subtitle="Maintain the vendor, OS, configurable attributes and artwork for this hardware model."
        actions={
          <Btn variant="primary" size="md" icon="check" onClick={submit} disabled={!canSave}>{initial ? 'Save changes' : 'Create model'}</Btn>
        }
      />

      <div className="wizard-grid">
        <div className="stack" style={{ gap: 16 }}>
          {/* Identity */}
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Identity</div></div>
            <div className="info-card__body">
              <Field label="Model code" required hint="Unique identifier for this model. Also used as the display name." error={dupCode ? 'This model code is already in use.' : undefined}>
                <Input value={m.modelCode} onChange={(e) => update('modelCode', e.target.value)} placeholder="e.g. N950" invalid={dupCode}/>
              </Field>
              <Field label="Description" hint="One-line summary shown on order rows and the customer portal.">
                <Textarea value={m.description} onChange={(e) => update('description', e.target.value)} rows={2} placeholder="Smart Android terminal, 5.5″ touch, NFC + magstripe."/>
              </Field>
            </div>
          </div>

          {/* OS */}
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Operating system</div></div>
            <div className="info-card__body">
              <Field label="OS" required hint="Pick the operating system. Attributes become available once an OS is selected.">
                <div className="dm-seg">
                  {OS_OPTIONS.map((o) => (
                    <button key={o} type="button" className={`dm-seg__btn ${m.os === o ? 'is-on' : ''}`} onClick={() => update('os', o)}>
                      {o}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* Attributes — only once an OS is chosen */}
          {m.os && (
          <div className="info-card">
            <div className="info-card__head">
              <div>
                <div className="info-card__title">Attributes</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 3 }}>Add only the specs that apply. Each tag is a value this model supports — use “Add value” to pick from the presets or type a new one.</div>
              </div>
            </div>
            <div className="info-card__body">
              <AttributeEditor value={m.attributes} onChange={(v) => update('attributes', v)} os={m.os}/>
            </div>
          </div>
          )}

          {/* Logos */}
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Model artwork (logos)</div></div>
            <div className="info-card__body">
              <ImageUploader value={uploaderValue} onChange={setLogo} modelName={m.modelCode}/>
            </div>
          </div>
        </div>

        {/* Sidebar preview */}
        <aside className="wizard-aside">
          <h4>Preview</h4>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <ModelTile model={m} px={120}/>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div className="mono-code" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{m.modelCode || 'Model code'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{vendorName(m.vendorPartnerId)}</div>
          </div>
          <dl>
            <dt>OS</dt><dd>{m.os ? <Badge tone={OS_TONE[m.os] || 'neutral'} dot>{m.os}</Badge> : <span className="muted">Not set</span>}</dd>
            <dt>Vendor</dt><dd>{vendorName(m.vendorPartnerId)}</dd>
            <dt>Attributes</dt>
            <dd>
              {attrSummaryRows(m).length === 0
                ? <span className="muted">None</span>
                : <div className="dm-prevattrs">
                    {attrSummaryRows(m).map((r, i) => (
                      <div key={i} className="dm-prevattr">
                        <span className="dm-prevattr__lbl">{r.label}</span>
                        <span className="dm-prevattr__vals">
                          {r.values.map((v, j) => <span key={j} className="dm-prevattr__tag" title={v}>{v}</span>)}
                        </span>
                      </div>
                    ))}
                  </div>}
            </dd>
            <dt>Artwork</dt><dd>{uploaderValue ? <span style={{ color: 'var(--color-success-700)' }}>Uploaded ✓</span> : <span className="muted">Placeholder</span>}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────
const dmStyles = `
.dm-tile { display: grid; place-items: center; border-radius: 10px; overflow: hidden; flex: none; font-weight: 700; letter-spacing: -0.02em; font-family: var(--font-family-sans); background-image:
  linear-gradient(45deg, oklch(94% 0 0 / 0.6) 25%, transparent 25%),
  linear-gradient(-45deg, oklch(94% 0 0 / 0.6) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, oklch(94% 0 0 / 0.6) 75%),
  linear-gradient(-45deg, transparent 75%, oklch(94% 0 0 / 0.6) 75%);
  background-size: 12px 12px; background-position: 0 0, 0 6px, 6px -6px, -6px 0px; border: 1px solid var(--color-border-subtle); }
.dm-tile--placeholder { background-image: none; }
.dm-tile--check { border: 1px solid var(--color-border-default); }

.mono-code { font-family: var(--font-family-mono); font-variant-numeric: tabular-nums; letter-spacing: 0; }
.dm-vendor { font-size: 13px; color: var(--color-text-primary); }

.dm-attrchips { display: flex; flex-wrap: wrap; gap: 4px; }
.dm-attrchip { font-size: 11.5px; line-height: 1; padding: 5px 8px; border-radius: 999px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); white-space: nowrap; }

.dm-upl { display: flex; flex-direction: column; gap: 14px; }

.dm-drop { border: 1.5px dashed var(--color-border-default); border-radius: 12px; padding: 18px; background: var(--color-bg-3); cursor: pointer; transition: all var(--duration-fast); }
.dm-drop:hover { border-color: var(--color-border-strong); background: var(--color-bg-2); }
.dm-drop.is-over { border-color: var(--color-primary-700); background: var(--color-primary-50); }
.dm-drop.is-err { border-color: var(--color-error-500); }
.dm-drop__empty { display: flex; flex-direction: column; align-items: center; padding: 26px 12px; text-align: center; gap: 6px; }
.dm-drop__icon { width: 44px; height: 44px; border-radius: 12px; background: var(--color-bg-2); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; color: var(--color-text-secondary); margin-bottom: 6px; }
.dm-drop__title { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.dm-drop__sub { font-size: 12px; color: var(--color-text-tertiary); }
.dm-drop__has { display: flex; gap: 16px; align-items: center; }
.dm-drop__has-main { flex: 1; min-width: 0; }

.dm-err { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; background: var(--color-error-50); border: 1px solid oklch(70% 0.16 25 / 0.3); border-radius: 8px; font-size: 12.5px; color: var(--color-error-700); }
.dm-err svg { flex: none; margin-top: 2px; }
.dm-notice { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; background: var(--color-success-50); border: 1px solid oklch(58% 0.14 152 / 0.25); border-radius: 8px; font-size: 12.5px; color: var(--color-success-700); }
.dm-notice svg { flex: none; margin-top: 2px; }

.dm-rules { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 8px; padding: 12px 14px; }
.dm-rules__title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 8px; }
.dm-rules ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.6; }
.dm-rules strong { color: var(--color-text-primary); font-weight: 600; }

.dm-sizes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
.dm-size { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 14px 12px; text-align: center; }
.dm-size__tile { display: flex; justify-content: center; align-items: center; height: 150px; }
.dm-size__lbl { font: 600 12px var(--font-family-mono); color: var(--color-text-primary); margin-top: 6px; font-variant-numeric: tabular-nums; }
.dm-size__use { font-size: 11px; color: var(--color-text-tertiary); margin-top: 2px; }

.dm-seg { display: inline-flex; padding: 3px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 8px; gap: 0; }
.dm-seg__btn { padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; color: var(--color-text-secondary); background: transparent; border: 0; cursor: pointer; transition: all var(--duration-fast); display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }
.dm-seg__btn.is-on { background: var(--color-bg-2); color: var(--color-text-primary); box-shadow: var(--shadow-1); }
.dm-seg__hint { font-size: 10px; padding: 2px 6px; border-radius: 999px; background: var(--color-primary-50); color: var(--color-primary-700); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }

/* Dynamic attribute editor */
.dm-attrs { display: flex; flex-direction: column; gap: 12px; }
.dm-attrs__empty { font-size: 12.5px; color: var(--color-text-tertiary); padding: 14px; background: var(--color-bg-3); border: 1px dashed var(--color-border-default); border-radius: 10px; text-align: center; }
.dm-attr { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 12px 14px; }
.dm-attr__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.dm-attr__name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.dm-attr__del { width: 24px; height: 24px; border-radius: 6px; border: 0; background: transparent; color: var(--color-text-tertiary); cursor: pointer; display: grid; place-items: center; transition: all var(--duration-fast); }
.dm-attr__del:hover { background: var(--color-error-50); color: var(--color-error-700); }
.dm-attr-add { margin-top: 2px; }
.dm-attr-add select { max-width: 260px; }

/* Add-attributes modal — flat batch picker */
.dm-add { position: relative; margin-top: 2px; }
.dm-add__trigger { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); color: var(--color-text-primary); font: 500 13px var(--font-family-sans); cursor: pointer; transition: all var(--duration-fast); }
.dm-add__trigger:hover { border-color: var(--color-border-strong); background: var(--color-bg-hover); }
.dm-add__trigger.is-open { border-color: var(--color-primary-700); box-shadow: var(--shadow-focus); }

.dm-add__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.dm-addmenu { z-index: var(--z-popover); max-height: 320px; overflow-y: auto; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; box-shadow: var(--shadow-4); padding: 5px; display: flex; flex-direction: column; gap: 1px; animation: dmMenuIn var(--duration-fast) var(--easing-emphasized); }
@keyframes dmMenuIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.dm-addmenu__item { display: flex; align-items: baseline; gap: 10px; padding: 9px 11px; border: 0; border-radius: 6px; background: transparent; cursor: pointer; text-align: left; font-family: inherit; transition: background var(--duration-fast); }
.dm-addmenu__item:hover { background: var(--color-bg-hover); }
.dm-addmenu__name { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.dm-addmenu__hint { margin-left: auto; font-size: 11px; color: var(--color-text-tertiary); }
.dm-rowmenu__item { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 11px; border: 0; border-radius: 6px; background: transparent; cursor: pointer; text-align: left; font-family: inherit; font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.dm-rowmenu__item:hover { background: var(--color-bg-hover); }
.dm-rowmenu__item--danger { color: var(--color-danger-600, var(--color-danger-500)); }
.dm-rowmenu__item--danger:hover { background: var(--color-danger-50, var(--color-bg-hover)); }
.dm-fwbtn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border: 1px solid var(--color-border-default); border-radius: 7px; background: var(--color-bg-2); cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; }
.dm-fwbtn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); border-color: var(--color-border-strong, var(--color-border-default)); }
.dm-add__empty { padding: 40px 16px; text-align: center; font-size: 12.5px; color: var(--color-text-tertiary); }

.dm-multi { display: flex; flex-direction: column; gap: 10px; }
.dm-other { display: flex; gap: 8px; align-items: center; max-width: 380px; }
.dm-other > :first-child { flex: 1; }

.dm-bool { display: flex; align-items: center; gap: 10px; }
.dm-bool__lbl { font-size: 13px; color: var(--color-text-secondary); }

.dm-checks { display: flex; gap: 8px; flex-wrap: wrap; }
.dm-check { display: inline-flex; align-items: center; gap: 6px; padding: 7px 8px 7px 12px; border-radius: 999px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); font-size: 12.5px; color: var(--color-text-secondary); cursor: pointer; transition: all var(--duration-fast); font-family: inherit; user-select: none; }
.dm-check:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.dm-check.is-on { background: var(--color-primary-50); color: var(--color-primary-700); border-color: oklch(60% 0.14 262 / 0.3); font-weight: 500; }
.dm-check__del { width: 16px; height: 16px; flex: none; border: 0; border-radius: 999px; background: transparent; color: currentColor; opacity: 0.4; cursor: pointer; display: grid; place-items: center; padding: 0; transition: all var(--duration-fast); }
.dm-check__del:hover { opacity: 1; background: var(--color-error-50); color: var(--color-error-700); }

/* Value tags + disclosure picker (card AttrControl) */
.dm-vals { display: flex; flex-direction: column; gap: 10px; }
.dm-vals__tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.dm-vals__empty { font-size: 12.5px; color: var(--color-text-tertiary); }
.dm-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; border-radius: 999px; background: var(--color-primary-50); border: 1px solid oklch(60% 0.14 262 / 0.3); color: var(--color-primary-700); font-size: 12.5px; font-weight: 500; }
.dm-tag__x { width: 16px; height: 16px; flex: none; border: 0; border-radius: 999px; background: transparent; color: currentColor; opacity: 0.55; cursor: pointer; display: grid; place-items: center; padding: 0; transition: all var(--duration-fast); }
.dm-tag__x:hover { opacity: 1; background: var(--color-error-50); color: var(--color-error-700); }
.dm-vals__addbtn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; border: 1px dashed var(--color-border-strong); background: transparent; color: var(--color-text-secondary); font: 500 12.5px var(--font-family-sans); cursor: pointer; transition: all var(--duration-fast); }
.dm-vals__addbtn:hover { border-color: var(--color-primary-700); color: var(--color-primary-700); background: var(--color-primary-50); }
.dm-vals__addbtn.is-open { border-style: solid; border-color: var(--color-primary-700); color: var(--color-primary-700); background: var(--color-primary-50); }

.dm-vals__picker { border: 1px solid var(--color-border-subtle); border-radius: 10px; background: var(--color-bg-3); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.dm-vals__picker-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.dm-vals__hint { font-size: 12px; color: var(--color-text-tertiary); }
.dm-cands { display: flex; flex-wrap: wrap; gap: 8px; }
.dm-cand { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px 6px 10px; border-radius: 999px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); color: var(--color-text-secondary); font-size: 12.5px; cursor: pointer; transition: all var(--duration-fast); user-select: none; }
.dm-cand:hover { border-color: var(--color-primary-700); color: var(--color-primary-700); background: var(--color-primary-50); }
.dm-cand > svg:first-child { opacity: 0.5; }
.dm-cand__x { width: 15px; height: 15px; flex: none; border: 0; border-radius: 999px; background: transparent; color: currentColor; opacity: 0.35; cursor: pointer; display: grid; place-items: center; padding: 0; transition: all var(--duration-fast); }
.dm-cand__x:hover { opacity: 1; background: var(--color-error-50); color: var(--color-error-700); }
.dm-vals__new { display: flex; gap: 8px; align-items: center; max-width: 400px; }
.dm-vals__new > :first-child { flex: 1; }
.dm-vals__customtrig { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin-left: -4px; padding: 4px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--color-text-tertiary); font-size: 12.5px; font-weight: 500; cursor: pointer; }
.dm-vals__customtrig:hover { color: var(--color-primary-700); background: var(--color-primary-50); }
.dm-vals__customclose { width: 28px; height: 28px; flex: none; border: 1px solid var(--color-border-default); border-radius: 6px; background: transparent; color: var(--color-text-tertiary); cursor: pointer; display: grid; place-items: center; }
.dm-vals__customclose:hover { color: var(--color-error-700); border-color: var(--color-border-strong); background: var(--color-error-50); }

/* Cropper */
.dm-adjust { background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 12px; overflow: hidden; }
.dm-adjust__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--color-border-subtle); background: var(--color-bg-3); }
.dm-adjust__title { font-size: 14px; font-weight: 600; }
.dm-adjust__sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 3px; line-height: 1.5; }
.dm-adjust__body { display: grid; grid-template-columns: 280px 1fr; gap: 22px; padding: 22px 18px; align-items: start; }
.dm-adjust__controls { display: flex; flex-direction: column; gap: 22px; padding-top: 8px; }
.dm-adjust__foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; background: var(--color-bg-3); border-top: 1px solid var(--color-border-subtle); }
.dm-adjust__foot .dm-notice { padding: 8px 10px; flex: 1; min-width: 0; }

.dm-frame { width: 280px; height: 280px; position: relative; background: #fff;
  background-image:
    linear-gradient(45deg, oklch(94% 0 0) 25%, transparent 25%),
    linear-gradient(-45deg, oklch(94% 0 0) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, oklch(94% 0 0) 75%),
    linear-gradient(-45deg, transparent 75%, oklch(94% 0 0) 75%);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0px;
  border-radius: 10px; overflow: hidden; cursor: grab; user-select: none; touch-action: none; box-shadow: inset 0 0 0 1px var(--color-border-default); }
.dm-frame:active { cursor: grabbing; }
.dm-frame__img { position: absolute; left: 50%; top: 50%; transform-origin: center; max-width: none; pointer-events: none; }
.dm-frame__overlay { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 0 2px var(--color-primary-700); border-radius: 10px; }
.dm-frame__grid { position: absolute; inset: 0; pointer-events: none; background:
  linear-gradient(to right, transparent calc(33.33% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(33.33% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px)) no-repeat,
  linear-gradient(to right, transparent calc(66.66% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(66.66% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)) no-repeat,
  linear-gradient(to bottom, transparent calc(33.33% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(33.33% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px)) no-repeat,
  linear-gradient(to bottom, transparent calc(66.66% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(66.66% - 0.5px), oklch(40% 0.14 262 / 0.25) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)) no-repeat; }

.dm-zoom { display: flex; align-items: center; gap: 12px; }
.dm-zoom__lbl { font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-tertiary); width: 50px; flex: none; }
.dm-zoom input { flex: 1; accent-color: var(--color-primary-700); height: 6px; }
.dm-zoom__val { font: 500 12.5px var(--font-family-mono); color: var(--color-text-primary); min-width: 48px; text-align: right; font-variant-numeric: tabular-nums; }

.dm-livepreview { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 12px 14px; }
.dm-livepreview__lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-tertiary); margin-bottom: 10px; }
.dm-livepreview__tiles { display: flex; gap: 14px; align-items: flex-end; }
.dm-livepreview__tiles .dm-tile { background-image: none; position: relative; overflow: hidden; flex: none; }
.dm-livepreview__sub { font: 500 11px var(--font-family-mono); color: var(--color-text-tertiary); margin-top: 10px; font-variant-numeric: tabular-nums; }

.wizard-aside { position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto; overflow-x: hidden; }
.wizard-aside dd { min-width: 0; overflow-wrap: anywhere; }
.dm-prevattrs { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.dm-prevattr { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dm-prevattr__lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); }
.dm-prevattr__vals { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.dm-prevattr__tag { max-width: 100%; font-size: 11.5px; line-height: 1.35; padding: 3px 8px; border-radius: 6px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); overflow-wrap: anywhere; }
`;

if (typeof document !== 'undefined' && !document.getElementById('dm-styles')) {
  const s = document.createElement('style');
  s.id = 'dm-styles';
  s.textContent = dmStyles;
  document.head.appendChild(s);
}

Object.assign(window, {
  DeviceModelList, DeviceModelForm, SEED_DEVICE_MODELS, OS_OPTIONS, OS_TONE,
  ModelTile, ATTRIBUTE_CATALOG, DEVICE_VENDORS, vendorName, attrSummaryChips, attrSummaryText,
});
