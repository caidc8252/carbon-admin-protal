/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, useToast,
   DEVICE_MODELS, ModelTile, DEVICE_MODEL_IDS_ALLOWED,
   INTEGRATION_MODE_OPTIONS, DEVICE_NATURE_OPTIONS, DEVICE_SPEC_AXES,
   NETWORK_AXIS, STORAGE_AXIS, isInfiniteStock,
   productEffectiveStatus, PRODUCT_STATUS_TONE, PRODUCT_STATUS_LABEL,
   formatPriceRange, blankProduct, buildGridVariants,
   newAxisId, newValueId, newVariantId, productIntegrationModes,
   DEVICE_SPEC_AXES, OTHER_SPEC_AXES */
const { useState, useRef, useEffect, useMemo } = React;

// ─── Wizard stepper (re-uses .stepper classes from the main stylesheet) ──
const ProductStepper = ({ steps, step, maxStep, onJump }) => (
  <div className="stepper">
    {steps.map((it, i) => (
      <React.Fragment key={it.n}>
        <div
          className={`stepper__item ${step === it.n ? 'is-active' : ''} ${step > it.n ? 'is-done' : ''} ${it.n <= maxStep ? 'is-clickable' : ''}`}
          onClick={() => { if (it.n <= maxStep) onJump(it.n); }}>
          <div className="stepper__dot">{step > it.n ? <Icon name="check" size={14} /> : it.n}</div>
          <div className="stepper__lbl"><small>{it.sub}</small><strong>{it.label}</strong></div>
        </div>
        {i < steps.length - 1 && <div className={`stepper__bar ${step > it.n ? 'is-done' : ''}`} />}
      </React.Fragment>
    ))}
  </div>
);

// ─── Image picker (up to 3 images) ──────────────────────────────
// First image is the primary (stored as baseImage); extras live in `extraImages`.
// For a Device product without uploads, we show the linked model artwork
// as a fallback preview (matches "use device default image" requirement).
const MAX_PRODUCT_IMAGES = 3;
const ImagePicker = ({ images = [], fallback, onChange, disabled, max = MAX_PRODUCT_IMAGES }) => {
  const ref = useRef(null);
  const readFiles = (fileList) => {
    const slots = Math.max(0, max - images.length);
    const files = Array.from(fileList || []).slice(0, slots);
    if (!files.length) return;
    Promise.all(files.map((file) => new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => res(e.target.result);
      reader.readAsDataURL(file);
    }))).then((urls) => onChange([...images, ...urls].slice(0, max)));
  };
  const removeAt = (i) => onChange(images.filter((_, idx) => idx !== i));
  const canAdd = !disabled && images.length < max;
  const fileInput = (
    <input ref={ref} type="file" accept="image/*" multiple hidden
      onChange={(e) => { readFiles(e.target.files); e.target.value = ''; }}/>
  );

  // No uploads yet, but a device fallback exists
  if (images.length === 0 && fallback) {
    return (
      <div className="prod-img-picker">
        <div className="prod-img-picker__has">
          <div className="prod-img-picker__fallback">{fallback}</div>
          {!disabled && (
            <div className="prod-img-picker__actions">
              <div className="prod-img-picker__fallback-lbl">
                Using device default image.<br/>
                Upload up to {max} images to override.
              </div>
              <Btn size="sm" variant="ghost" icon="upload" onClick={() => ref.current?.click()}>Upload images</Btn>
            </div>
          )}
          {fileInput}
        </div>
      </div>
    );
  }

  // No uploads and no fallback — empty dropzone
  if (images.length === 0) {
    return (
      <div className="prod-img-picker">
        <div className={`prod-img-picker__empty ${disabled ? 'is-disabled' : ''}`} onClick={() => canAdd && ref.current?.click()}>
          <Icon name="upload" size={22}/>
          <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6 }}>Click to upload images</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>PNG / JPG / WebP · Up to {max} · 1:1 recommended</div>
        </div>
        {fileInput}
      </div>
    );
  }

  // One or more uploaded images — thumbnail grid + add tile
  return (
    <div className="prod-img-picker">
      <div className="prod-img-grid">
        {images.map((src, i) => (
          <div key={i} className="prod-img-cell">
            <img src={src} alt=""/>
            {i === 0 && <span className="prod-img-cell__badge">Primary</span>}
            {!disabled && (
              <button type="button" className="prod-img-cell__x" onClick={() => removeAt(i)} title="Remove">
                <Icon name="x" size={12}/>
              </button>
            )}
          </div>
        ))}
        {canAdd && (
          <button type="button" className="prod-img-add" onClick={() => ref.current?.click()}>
            <Icon name="plus" size={18}/>
            <span>Add</span>
          </button>
        )}
      </div>
      <div className="prod-img-hint muted">{images.length} / {max} images · the first image is the primary</div>
      {fileInput}
    </div>
  );
};

// ─── Variant pricing matrix (grid of all combinations) ──────────
// Auto-generates one row per spec combination. The checkbox marks whether
// the combination is OFFERED (status=ACTIVE) — unchecked rows are dimmed
// in the editor and hidden from View options.
const VariantsMatrix = ({ product, onUpdateVariant, readOnly }) => {
  const axes = product.specs || [];
  if (!product.variants.length) return null;

  const allActive = product.variants.every((v) => v.status === 'ACTIVE');
  const anyActive = product.variants.some((v) => v.status === 'ACTIVE');

  const toggleAll = () => {
    const target = allActive ? 'UNAVAILABLE' : 'ACTIVE';
    product.variants.forEach((v) => onUpdateVariant(v.id, { status: target }));
  };
  const toggleOne = (variant) => {
    onUpdateVariant(variant.id, {
      status: variant.status === 'ACTIVE' ? 'UNAVAILABLE' : 'ACTIVE',
    });
  };

  return (
    <div>
      <table className="prod-variant-table">
        <thead>
          <tr>
            {!readOnly && (
              <th style={{ width: 36, paddingRight: 0 }}>
                <input type="checkbox"
                  checked={allActive}
                  ref={(el) => { if (el) el.indeterminate = anyActive && !allActive; }}
                  onChange={toggleAll}
                  title="Toggle all"/>
              </th>
            )}
            {axes.length === 0 ? (
              <th>Variant</th>
            ) : (
              <th>Variant <span className="prod-th-hint">(rename · maps to {axes.map((a) => a.name).join(' · ')})</span></th>
            )}
            <th style={{ textAlign: 'right', width: 130 }}>Price</th>
            <th style={{ width: 200 }}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {product.variants.map((variant) => {
            const cells = axes.map((axis) =>
              axis.values.find((v) => v.id === variant.combination[axis.id])?.label || '—'
            );
            const isOn = variant.status === 'ACTIVE';
            const rowDisabled = readOnly || !isOn;
            return (
              <tr key={variant.id} className={`prod-variant-row ${isOn ? 'is-on' : 'is-off'}`}>
                {!readOnly && (
                  <td style={{ paddingRight: 0 }}>
                    <input type="checkbox"
                      checked={isOn}
                      onChange={() => toggleOne(variant)}
                      title={isOn ? 'Offered — uncheck to hide from View options' : 'Not offered — check to include'}/>
                  </td>
                )}
                {axes.length === 0 ? (
                  <td style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Base</td>
                ) : (
                  <td>
                    <div className="prod-variant-cell">
                      <input className="prod-cell-input prod-variant-cell__name"
                        value={variant.label || ''}
                        placeholder={cells.filter((c) => c !== '—').join(' · ')}
                        onChange={(e) => onUpdateVariant(variant.id, { label: e.target.value })}
                        disabled={rowDisabled}/>
                      {variant.label && variant.label.trim() && (
                        <span className="prod-variant-cell__alias">{cells.filter((c) => c !== '—').join(' · ')}</span>
                      )}
                    </div>
                  </td>
                )}
                <td style={{ textAlign: 'right' }}>
                  <div className="prod-cell-money">
                    <span>$</span>
                    <input className="prod-cell-input prod-cell-input--right" type="number" step="0.01" min="0"
                      value={variant.price}
                      onChange={(e) => onUpdateVariant(variant.id, { price: parseFloat(e.target.value) || 0 })}
                      disabled={rowDisabled}/>
                  </div>
                </td>
                <td>
                  <StockEditor
                    variant={variant}
                    onChange={(patch) => onUpdateVariant(variant.id, patch)}
                    disabled={rowDisabled}/>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Stock = positive integer | null (null = "Always in stock")
const StockEditor = ({ variant, onChange, disabled }) => {
  const infinite = isInfiniteStock(variant.stock);
  return (
    <div className="prod-stock-cell">
      <input
        type="number" min="0" step="1"
        className="prod-cell-input prod-cell-input--right"
        style={{ width: 80, opacity: infinite ? 0.4 : 1 }}
        value={infinite ? '' : variant.stock}
        placeholder="0"
        disabled={disabled || infinite}
        onChange={(e) => onChange({ stock: Math.max(0, parseInt(e.target.value || '0', 10)) })}/>
      <label className="prod-stock-toggle">
        <input type="checkbox" checked={infinite}
          disabled={disabled}
          onChange={(e) => onChange({ stock: e.target.checked ? null : 0 })}/>
        <span>Always in stock</span>
      </label>
    </div>
  );
};

// ─── Spec axis editor (a single category card) ──────────────────
// Editable category name + chip list of values. Each value chip is
// inline-editable; an "Add value" input at the end appends a new value.
const SpecAxisEditor = ({ axis, readOnly, onRenameAxis, onRemoveAxis, onAddValue, onRenameValue, onRemoveValue }) => {
  const [newVal, setNewVal] = useState('');
  const submitNew = () => {
    if (!newVal.trim()) return;
    onAddValue(newVal);
    setNewVal('');
  };
  return (
    <div className="prod-axis-editor">
      <div className="prod-axis-editor__head">
        <input
          className="prod-axis-editor__name"
          value={axis.name}
          placeholder="Category name (e.g. Network)"
          onChange={(e) => onRenameAxis(e.target.value)}
          disabled={readOnly}/>
        {!readOnly && (
          <button type="button" className="prod-axis-editor__remove" onClick={onRemoveAxis} title="Remove category">
            <Icon name="trash" size={12}/>
          </button>
        )}
      </div>
      <div className="prod-axis-editor__values">
        {axis.values.map((v) => (
          <div key={v.id} className="prod-axis-chip">
            <input
              value={v.label}
              onChange={(e) => onRenameValue(v.id, e.target.value)}
              disabled={readOnly}/>
            {!readOnly && (
              <button type="button" className="prod-axis-chip__x" onClick={() => onRemoveValue(v.id)} title="Remove value">
                <Icon name="x" size={10}/>
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <div className="prod-axis-add">
            <input
              value={newVal}
              placeholder="+ Add value"
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitNew(); } }}
              onBlur={submitNew}/>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main form ──────────────────────────────────────────────────
const isDeviceModelOutOfSync = (prod, model) =>
  window.isModelOutOfSync ? window.isModelOutOfSync(prod, model) : false;

const ProductForm = ({ initial, models, onCancel, onSave, onDelete }) => {
  const [p, setP] = useState(initial || blankProduct());
  const isNew = !initial;
  const eff = productEffectiveStatus(p);
  const toast = useToast();

  // New products use a 4-step wizard; editing an existing product shows all
  // sections on one page (so status actions like Delist/Archive stay reachable).
  const wizard = isNew;
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [modelQuery, setModelQuery] = useState('');

  const isReadOnly = p.status === 'ARCHIVED';
  const isListed   = p.status === 'LISTED';

  // Selectable device models — sourced from the admin Device Model entity
  // (live `models` prop, falling back to the seed). All device models are
  // selectable, including ones created in the Device Models page.
  const allowedModels = useMemo(
    () => (models || window.SEED_DEVICE_MODELS || []),
    [models]
  );
  const linkedModel = allowedModels.find((m) => m.id === p.deviceModelId)
    || (window.SEED_DEVICE_MODELS || []).find((m) => m.id === p.deviceModelId);

  // Model picker is searchable + bounded once the lineup grows past ~8, so the
  // grid never blows up the page when there are many device models.
  const filteredModels = (allowedModels.length > 8 && modelQuery.trim())
    ? allowedModels.filter((m) =>
        `${m.modelCode || ''} ${m.description || ''}`.toLowerCase().includes(modelQuery.toLowerCase().trim()))
    : allowedModels;

  // Selecting a model binds its id AND captures a fresh snapshot
  // (modelCode + os + attributes).
  const selectModel = (mid) => {
    const model = allowedModels.find((m) => m.id === mid);
    setP((x) => ({
      ...x,
      deviceModelId: mid,
      deviceModelSnapshot: window.buildDeviceModelSnapshot
        ? window.buildDeviceModelSnapshot(model)
        : x.deviceModelSnapshot,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Manual re-sync: refresh the snapshot from the live model.
  const syncModel = () => {
    if (!linkedModel) return;
    setP((x) => window.syncProductSnapshot ? window.syncProductSnapshot(x, linkedModel) : x);
    toast({ kind: 'success', title: 'Synced to device model', msg: `Snapshot refreshed from ${linkedModel.modelCode}.` });
  };
  const outOfSync = isDeviceModelOutOfSync(p, linkedModel);

  // ─── Generic field update
  const update = (k, v) =>
    setP((x) => ({ ...x, [k]: v, updatedAt: new Date().toISOString() }));

  // ─── Type switch (Device vs Other)
  const setType = (t) => {
    if (isListed) {
      toast({ kind: 'warning', title: 'Cannot change type on a Published product', msg: 'Unpublish this product first.' });
      return;
    }
    setP((x) => {
      const next = { ...x, type: t, updatedAt: new Date().toISOString() };
      if (t === 'DEVICE') {
        next.deviceModelId = x.deviceModelId || allowedModels[0]?.id || null;
        next.deviceModelSnapshot = window.buildDeviceModelSnapshot
          ? window.buildDeviceModelSnapshot(allowedModels.find((m) => m.id === next.deviceModelId))
          : x.deviceModelSnapshot;
        next.deviceVariant = x.deviceVariant || 'PRODUCTION';
        // Integration mode only applies to Sample devices.
        next.integrationModes = next.deviceVariant === 'SAMPLE'
          ? ((x.integrationModes && x.integrationModes.length) ? x.integrationModes : ['Semi-integration', 'Stand-alone'])
          : [];
      } else {
        next.deviceModelId = null;
        next.deviceVariant = null;
        next.integrationModes = [];
        // Other products keep their spec axes & variants — accessories,
        // consumables and services frequently have variants (color, size,
        // length, pack size…). We only strip the device-only fields above.
      }
      return next;
    });
  };

  // ─── Integration modes (multi-select)
  const toggleIntegration = (mode) => {
    setP((x) => {
      const set = new Set(x.integrationModes || []);
      if (set.has(mode)) set.delete(mode); else set.add(mode);
      // Keep declared order
      const next = INTEGRATION_MODE_OPTIONS.filter((m) => set.has(m));
      return { ...x, integrationModes: next, updatedAt: new Date().toISOString() };
    });
  };

  // ─── Device nature switch. Integration mode is Sample-only, so seed it on
  // Sample and clear it on Production.
  const setDeviceVariant = (id) => {
    setP((x) => ({
      ...x,
      deviceVariant: id,
      integrationModes: id === 'SAMPLE'
        ? ((x.integrationModes && x.integrationModes.length) ? x.integrationModes : ['Semi-integration', 'Stand-alone'])
        : [],
      updatedAt: new Date().toISOString(),
    }));
  };

  // ─── Spec axes — fully editable (add category / add values / rename / remove)
  const rebuildVariants = (specs, basePrice) => buildGridVariants(p.id, specs, basePrice);

  // Add a new axis. If preset is supplied, populate values; otherwise blank.
  const addAxis = (preset) => {
    setP((x) => {
      const newAxis = preset
        ? { id: newAxisId(), key: preset.key, name: preset.name,
            values: preset.values.map((label) => ({ id: newValueId(), label })) }
        : { id: newAxisId(), key: null, name: `Spec ${(x.specs?.length || 0) + 1}`,
            values: [{ id: newValueId(), label: 'Option 1' }] };
      const specs = [...(x.specs || []), newAxis];
      return { ...x, specs, variants: rebuildVariants(specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };
  const removeAxis = (axisId) => {
    setP((x) => {
      const specs = (x.specs || []).filter((a) => a.id !== axisId);
      return { ...x, specs, variants: rebuildVariants(specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };
  const renameAxis = (axisId, name) => {
    setP((x) => ({
      ...x,
      specs: (x.specs || []).map((a) => a.id === axisId ? { ...a, name } : a),
      updatedAt: new Date().toISOString(),
    }));
  };
  const addValue = (axisId, label) => {
    if (!label || !label.trim()) return;
    setP((x) => {
      const specs = (x.specs || []).map((a) =>
        a.id === axisId
          ? { ...a, values: [...a.values, { id: newValueId(), label: label.trim() }] }
          : a
      );
      return { ...x, specs, variants: rebuildVariants(specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };
  const renameValue = (axisId, valueId, label) => {
    setP((x) => ({
      ...x,
      specs: (x.specs || []).map((a) =>
        a.id === axisId
          ? { ...a, values: a.values.map((v) => v.id === valueId ? { ...v, label } : v) }
          : a
      ),
      updatedAt: new Date().toISOString(),
    }));
  };
  const removeValue = (axisId, valueId) => {
    setP((x) => {
      const specs = (x.specs || []).map((a) =>
        a.id === axisId
          ? { ...a, values: a.values.filter((v) => v.id !== valueId) }
          : a
      ).filter((a) => a.values.length > 0);
      return { ...x, specs, variants: rebuildVariants(specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };

  const updateVariant = (variantId, patch) => {
    setP((x) => ({
      ...x,
      variants: x.variants.map((v) => v.id === variantId ? { ...v, ...patch } : v),
      updatedAt: new Date().toISOString(),
    }));
  };

  const onBasePriceChange = (price) => {
    setP((x) => ({
      ...x,
      basePrice: price,
      variants: x.variants.map((v) =>
        (v.price === 0 || v.price === x.basePrice) ? { ...v, price } : v
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  // ─── Save / lifecycle actions ─────────────────────────────
  const canPublish = p.name && p.name.trim() && p.variants.every((v) => v.price >= 0);

  const publishNow = () => {
    if (!canPublish) { toast({ kind: 'error', title: 'Fill in required fields', msg: 'Product name is required' }); return; }
    onSave({ ...p, allowPriceOverride: true, status: 'LISTED', listFrom: new Date().toISOString(), publishAt: null });
    toast({ kind: 'success', title: `${p.name} is now Published` });
  };
  const saveChanges = () => { onSave({ ...p, allowPriceOverride: true }); toast({ kind: 'success', title: 'Changes saved' }); };
  // Unpublish flow — opens a custom modal that collects the required reason.
  // (Replaces the legacy window.prompt — the modal matches the rest of the app's
  // confirmation dialogs and lets us validate input inline.)
  const [delistOpen, setDelistOpen] = useState(false);
  const [delistReason, setDelistReason] = useState('');
  const [delistError, setDelistError] = useState('');
  const openDelist = () => {
    setDelistReason('Out of stock');
    setDelistError('');
    setDelistOpen(true);
  };
  const closeDelist = () => { setDelistOpen(false); setDelistError(''); };
  const confirmDelist = () => {
    const reason = delistReason.trim();
    if (!reason) { setDelistError('Please enter a reason.'); return; }
    onSave({ ...p, status: 'DELISTED', delistReason: reason, delistedAt: new Date().toISOString() });
    toast({ kind: 'warning', title: `${p.name} unpublished`, msg: reason });
    setDelistOpen(false);
  };
  const relist = () => {
    onSave({ ...p, status: 'LISTED', delistReason: null, delistedAt: null });
    toast({ kind: 'success', title: `${p.name} is back online` });
  };
  const archive = () => {
    if (!window.confirm(`Archive "${p.name}"?\n\nArchiving is irreversible.`)) return;
    onSave({ ...p, status: 'ARCHIVED', archivedAt: new Date().toISOString() });
    toast({ kind: 'success', title: `${p.name} archived` });
  };

  // ─── Top actions (edit mode only — new products publish from the wizard) ─
  const renderTopActions = () => {
    if (isReadOnly) return null;
    if (eff === 'DRAFT') {
      return <Btn variant="primary" size="md" icon="check" onClick={publishNow} disabled={!canPublish}>Publish now</Btn>;
    }
    if (isListed) {
      return (
        <>
          <Btn variant="secondary" size="md" icon="check" onClick={saveChanges}>Save changes</Btn>
          <Btn variant="danger" size="md" icon="package" onClick={openDelist}>Unpublish</Btn>
        </>
      );
    }
    if (p.status === 'DELISTED') {
      return (
        <>
          <Btn variant="secondary" size="md" icon="check" onClick={saveChanges}>Save changes</Btn>
          <Btn variant="primary" size="md" icon="check" onClick={relist}>Publish</Btn>
          {onDelete && (
            <Btn variant="danger" size="md" icon="trash" onClick={() => onDelete(p)}>Delete</Btn>
          )}
        </>
      );
    }
    return null;
  };

  const statusBanner = () => {
    if (p.status === 'DELISTED') {
      return (
        <div className="prod-banner prod-banner--warn">
          <Icon name="alert" size={14}/>
          <span><strong>Unpublished</strong>: {p.delistReason}. Historical orders unaffected.</span>
        </div>
      );
    }
    if (p.status === 'ARCHIVED') {
      return (
        <div className="prod-banner prod-banner--muted">
          <Icon name="package" size={14}/>
          <span><strong>Archived · read-only</strong></span>
        </div>
      );
    }
    return null;
  };

  const isDevice = p.type === 'DEVICE';
  const fallbackArt = (!p.baseImage && isDevice && linkedModel)
    ? <ModelTile model={linkedModel} px={100}/> : null;
  const integrationModes = p.integrationModes || [];

  // ─── DEVICE specs bound to model attributes (Rule A) ──────────
  const variantAttrs = (isDevice && window.modelVariantAttrs) ? window.modelVariantAttrs(linkedModel) : [];
  const fixedSpecs   = (isDevice && window.modelFixedSpecs)   ? window.modelFixedSpecs(linkedModel)   : [];
  // Capabilities with an actual sellable value (a present boolean / a real
  // single value). Absent ones (e.g. Cellular = No) have nothing to offer.
  const offerableCaps = fixedSpecs.filter((f) => f.options && f.options.length > 0);
  const legacyAxes   = isDevice ? (p.specs || []).filter((a) => !window.isModelBoundAxis(a)) : [];
  const modelAxisFor = (key) => (p.specs || []).find((a) => a.attrKey === key);

  // Rewrite the axis for one model attribute to exactly `selectedLabels`
  // (subset of the model's declared options). Empty selection removes the axis.
  // `isCapability` marks single-value boolean capabilities (WiFi, Cellular, …)
  // so the grid enumerates the non-empty SUBSETS across them (WiFi / Cellular /
  // WiFi + Cellular) instead of forcing every SKU to carry all of them.
  const setModelAxis = (attrDef, selectedLabels, isCapability = false) => {
    setP((x) => {
      let specs = (x.specs || []).filter((a) => a.attrKey !== attrDef.key);
      if (selectedLabels.length >= 1) {
        specs = [...specs, {
          id: newAxisId(), attrKey: attrDef.key, key: 'attr:' + attrDef.key, name: attrDef.label,
          ...(isCapability ? { isCapability: true } : {}),
          values: selectedLabels.map((l) => ({ id: newValueId(), label: l })),
        }];
      }
      return { ...x, specs, variants: buildGridVariants(x.id, specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };
  const toggleModelAxisValue = (attrDef, label) => {
    const ax = modelAxisFor(attrDef.key);
    const current = ax ? ax.values.map((v) => v.label) : [];
    const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
    setModelAxis(attrDef, next);
  };
  const removeLegacyAxis = (axisId) => {
    setP((x) => {
      const specs = (x.specs || []).filter((a) => a.id !== axisId);
      return { ...x, specs, variants: buildGridVariants(x.id, specs, x.basePrice || 0), updatedAt: new Date().toISOString() };
    });
  };

  // ─── Fixed specs (single-value capabilities) ─────────────────
  // Strictly model-faithful: every single-value attribute the model declares is
  // its OWN independent fixed spec. Nothing is merged into invented groupings.
  // Each can be toggled into the variant grid on its own as a constant
  // dimension (e.g. "Android 14 + 32G + WiFi").

  // ─── Wizard step config / validation ───────────────────────
  // Order: Type first → (Device) model → Basics (so the image has a default) →
  // Specs & pricing → Review.
  const stepDefs = [
    { n: 1, sub: 'Step 1', label: isDevice ? 'Type & device' : 'Type' },
    { n: 2, sub: 'Step 2', label: 'Basics' },
    { n: 3, sub: 'Step 3', label: 'Specs & pricing' },
    { n: 4, sub: 'Step 4', label: 'Review & publish' },
  ];
  const cardStepMap = { type: 1, device: 1, basics: 2, specs: 3, pricing: 3, review: 4 };
  const vis = (card) => !wizard || step === cardStepMap[card];
  const specPresets = isDevice ? DEVICE_SPEC_AXES : OTHER_SPEC_AXES;
  const step1Valid = !isDevice || (!!p.deviceModelId && (p.deviceVariant !== 'SAMPLE' || integrationModes.length > 0));
  const step2Valid = !!(p.name && p.name.trim());
  const step3Valid = p.variants.every((v) => v.price >= 0);
  const stepValidNow = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true;
  const goNext = () => {
    if (!stepValidNow) {
      toast({ kind: 'error', title: 'Please complete this step',
        msg: step === 1 ? 'Pick a device model (and an integration mode for Sample devices)'
          : step === 2 ? 'Product name is required'
          : 'Prices must be 0 or greater' });
      return;
    }
    const n = Math.min(stepDefs.length, step + 1);
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
  };

  return (
    <div className="page">
      <button type="button" className="prod-back" onClick={onCancel}>
        <Icon name="chevL" size={14}/> Back to Catalog
      </button>
      <div className={`page__head ${!wizard ? 'prod-edit-sticky' : ''}`}>
        <div>
          <h1 className="page__title">
            {isNew ? 'New product' : p.name}
            {!isNew && (
              <span style={{ marginLeft: 12, verticalAlign: 'middle', display: 'inline-block' }}>
                <Badge tone={PRODUCT_STATUS_TONE[eff]} dot>{PRODUCT_STATUS_LABEL[eff]}</Badge>
              </span>
            )}
          </h1>
          <p className="page__sub">
            {isNew
              ? 'Create a new product in a few steps. Devices link to a hardware model; other products can still carry their own spec variants.'
              : <>
                  Created {new Date(p.createdAt).toLocaleDateString()} · last updated {new Date(p.updatedAt).toLocaleDateString()} by {p.updatedBy}
                </>}
          </p>
        </div>
        {!wizard && <div className="page__actions">{renderTopActions()}</div>}
      </div>

      {statusBanner()}

      {wizard && (
        <div className="prod-stepper-sticky">
          <ProductStepper steps={stepDefs} step={step} maxStep={maxStep} onJump={setStep} />
        </div>
      )}

      <div className="wizard-grid">
        <div className="stack" style={{ gap: 16 }}>

          {vis('type') && (
          <div className="info-card">
            <div className="info-card__head">
              <div>
                <div className="info-card__title">Type</div>
                <div className="prod-section-hint">Decides which fields you fill in next.</div>
              </div>
            </div>
            <div className="info-card__body">
              <div className="prod-type-row">
                {[
                  { id: 'DEVICE', label: 'Device type',
                    hint: 'Hardware terminal · linked to a device model · with integration & spec options' },
                  { id: 'OTHER',  label: 'Other type',
                    hint: 'Accessory / consumable / service · optional spec variants + price' },
                ].map((opt) => (
                  <button key={opt.id} type="button"
                    className={`prod-cat-card ${p.type === opt.id ? 'is-on' : ''}`}
                    disabled={isReadOnly || isListed}
                    onClick={() => setType(opt.id)}>
                    <div className="prod-cat-card__label">{opt.label}</div>
                    <div className="prod-cat-card__hint">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Device details (DEVICE only) — comes before Basics so the image has a model default */}
          {vis('device') && isDevice && (
            <div className="info-card">
              <div className="info-card__head">
                <div>
                  <div className="info-card__title">Device details</div>
                  <div className="prod-section-hint">Pick a hardware model, supported integration modes, and the device's nature.</div>
                </div>
              </div>
              <div className="info-card__body">
                {outOfSync && (
                  <div className="prod-sync-banner">
                    <Icon name="refresh" size={16}/>
                    <div className="prod-sync-banner__main">
                      <div className="prod-sync-banner__title">Device model has changed</div>
                      <div className="prod-sync-banner__sub">
                        {linkedModel ? linkedModel.modelCode : 'The linked model'} was updated after this product was last synced. Review and pull the latest model code, OS and attributes into this product.
                      </div>
                    </div>
                    <Btn size="sm" variant="secondary" icon="refresh" onClick={syncModel} disabled={isReadOnly}>Sync now</Btn>
                  </div>
                )}
                <div className="prod-section-sublabel">
                  Device model
                  {allowedModels.length > 8 && (
                    <span className="prod-section-sublabel__hint">{filteredModels.length} of {allowedModels.length}</span>
                  )}
                </div>
                {allowedModels.length > 8 && (
                  <div className="prod-model-search">
                    <Icon name="search" size={13}/>
                    <input
                      value={modelQuery}
                      placeholder="Search models by name…"
                      onChange={(e) => setModelQuery(e.target.value)}
                      disabled={isReadOnly || isListed}/>
                    {modelQuery && (
                      <button type="button" className="prod-model-search__x" onClick={() => setModelQuery('')} title="Clear">
                        <Icon name="x" size={11}/>
                      </button>
                    )}
                  </div>
                )}
                <div className={`prod-model-tiles ${allowedModels.length > 8 ? 'prod-model-tiles--scroll' : ''}`}>
                  {filteredModels.map((m) => (
                    <button key={m.id} type="button"
                      className={`prod-model-tile ${p.deviceModelId === m.id ? 'is-on' : ''}`}
                      disabled={isReadOnly || isListed}
                      onClick={() => selectModel(m.id)}>
                      <div className="prod-model-tile__art">
                        <ModelTile model={m} px={64}/>
                      </div>
                      <div className="prod-model-tile__name">{m.modelCode}</div>
                    </button>
                  ))}
                </div>
                {allowedModels.length > 8 && filteredModels.length === 0 && (
                  <div className="prod-empty" style={{ marginTop: 8 }}>No models match “{modelQuery}”.</div>
                )}

                <div className="prod-section-sublabel" style={{ marginTop: 18 }}>Device nature</div>
                <div className="prod-variant-pick__row">
                  {DEVICE_NATURE_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`prod-variant-pick__opt ${p.deviceVariant === opt.id ? 'is-on' : ''}`}>
                      <input type="radio" name="deviceVariant"
                        checked={p.deviceVariant === opt.id}
                        disabled={isReadOnly || isListed}
                        onChange={() => setDeviceVariant(opt.id)}/>
                      <div>
                        <div className="prod-variant-pick__lbl">{opt.label}</div>
                        <div className="prod-variant-pick__hint">{opt.hint}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {p.deviceVariant === 'SAMPLE' && (
                  <>
                    <div className="prod-section-sublabel" style={{ marginTop: 18 }}>
                      Integration mode <span className="prod-section-sublabel__hint">Sample only · multi-select · shown at View options</span>
                    </div>
                    <div className="prod-chk-row">
                      {INTEGRATION_MODE_OPTIONS.map((mode) => (
                        <label key={mode} className={`prod-chk ${integrationModes.includes(mode) ? 'is-on' : ''}`}>
                          <input type="checkbox"
                            checked={integrationModes.includes(mode)}
                            disabled={isReadOnly}
                            onChange={() => toggleIntegration(mode)}/>
                          <span>{mode}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Basics — image shows the device default once a model is picked */}
          {vis('basics') && (
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Basics</div></div>
            <div className="info-card__body">
              <Field label="Product name" required>
                <Input value={p.name} onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. N950 Sample" disabled={isReadOnly}/>
              </Field>
              <Field label="Description">
                <Textarea value={p.desc || ''} onChange={(e) => update('desc', e.target.value)} rows={2}
                  placeholder="One-line summary shown on cart cards and order rows."
                  disabled={isReadOnly}/>
              </Field>
              <Field label="Product images" hint={isDevice ? "Up to 3 images. If empty, the linked device's default image is used." : "Up to 3 images."}>
                <ImagePicker
                  images={[p.baseImage, ...(p.extraImages || [])].filter(Boolean)}
                  fallback={fallbackArt}
                  onChange={(imgs) => setP((x) => ({
                    ...x,
                    baseImage: imgs[0] || null,
                    extraImages: imgs.slice(1),
                    updatedAt: new Date().toISOString(),
                  }))}
                  disabled={isReadOnly}/>
              </Field>
            </div>
          </div>
          )}

          {/* Specifications */}
          {vis('specs') && isDevice && (
            <div className="info-card">
              <div className="info-card__head">
                <div>
                  <div className="info-card__title">Specifications</div>
                  <div className="prod-section-hint">
                    Bound to the device model. Variant options come from the model’s attributes — you can offer a subset, but never values the model doesn’t declare.
                  </div>
                </div>
              </div>
              <div className="info-card__body">
                {!linkedModel && (
                  <div className="prod-empty">Pick a device model first — its attributes define the available specs.</div>
                )}

                {linkedModel && (
                  <>
                    {/* Variant-eligible attributes (multi-value) */}
                    {(variantAttrs.length === 0 && offerableCaps.length === 0) && (
                      <div className="prod-empty">
                        {linkedModel.modelCode} has no variant-eligible attributes, so it’s sold as a single variant. Declare ≥2 values on an attribute in the device model to offer variants.
                      </div>
                    )}
                    {variantAttrs.length > 0 && (
                      <div className="prod-mspec">
                        <div className="prod-section-sublabel">Variant attributes</div>
                        {variantAttrs.map((attr) => {
                          const ax = modelAxisFor(attr.key);
                          const selected = ax ? ax.values.map((v) => v.label) : [];
                          const on = !!ax;
                          return (
                            <div key={attr.key} className={`prod-mspec__row ${on ? 'is-on' : ''}`}>
                              <div className="prod-mspec__head">
                                <button type="button"
                                  className={`up-toggle ${on ? 'is-on' : ''}`}
                                  disabled={isReadOnly}
                                  onClick={() => on ? setModelAxis(attr, []) : setModelAxis(attr, attr.options.slice())}>
                                  <span className="up-toggle__dot"/>
                                </button>
                                <span className="prod-mspec__name">{attr.label}</span>
                                <span className="prod-mspec__hint">offer as variants</span>
                              </div>
                              {on && (
                                <div className="prod-mspec__opts">
                                  {attr.options.map((opt) => (
                                    <button key={opt} type="button"
                                      className={`prod-mchip ${selected.includes(opt) ? 'is-on' : ''}`}
                                      disabled={isReadOnly}
                                      onClick={() => toggleModelAxisValue(attr, opt)}>
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Single-value capabilities (WiFi, Cellular, …) — shown as
                        independent variant toggles alongside the other variant
                        attributes. Toggle one ON and it folds into the Pricing
                        combinations (when 2+ are on, as non-empty subsets).
                        Capabilities the model doesn't have (e.g. Cellular = No)
                        have nothing to offer and are not shown. */}
                    {offerableCaps.length > 0 && (
                      <div className="prod-mspec-fixed">
                        {offerableCaps.map((f) => {
                          const on = !!modelAxisFor(f.key);
                          return (
                            <div key={f.key} className={`prod-mspec__row prod-mspec__row--fixed ${on ? 'is-on' : ''}`}>
                              <div className="prod-mspec__head">
                                <button type="button"
                                  className={`up-toggle ${on ? 'is-on' : ''}`}
                                  disabled={isReadOnly}
                                  onClick={() => on ? setModelAxis(f, [], true) : setModelAxis(f, f.options.slice(), true)}>
                                  <span className="up-toggle__dot"/>
                                </button>
                                <span className="prod-mspec__name">{f.label}</span>
                                {!f.bool && <span className="prod-mspec__fixedval">{f.display}</span>}
                                <span className="prod-mspec__hint">{on ? 'in every variant' : 'include in variants'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Legacy axes not backed by the model — read-only */}
                    {legacyAxes.length > 0 && (
                      <div className="prod-mspec-legacy">
                        <div className="prod-section-sublabel" style={{ marginTop: 16 }}>Legacy specifications <span className="prod-section-sublabel__hint">not backed by the device model</span></div>
                        {legacyAxes.map((a) => (
                          <div key={a.id} className="prod-legacy-row">
                            <div>
                              <span className="prod-legacy-name">{a.name}</span>
                              <span className="prod-legacy-vals">{a.values.map((v) => v.label).join(' · ')}</span>
                            </div>
                            {!isReadOnly && (
                              <Btn size="sm" variant="ghost" icon="trash" onClick={() => removeLegacyAxis(a.id)}>Remove</Btn>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Specifications (OTHER products — free-form axes) */}
          {vis('specs') && !isDevice && (
            <div className="info-card">
              <div className="info-card__head">
                <div>
                  <div className="info-card__title">Specifications</div>
                  <div className="prod-section-hint">
                    Optional. Add spec categories (Color, Size, Length, Pack size, or your own) if this product comes in variants. Each combination generates a priceable variant below.
                  </div>
                </div>
                {!isReadOnly && (
                  <Btn size="sm" variant="ghost" icon="plus" onClick={() => addAxis(null)}>Add custom category</Btn>
                )}
              </div>
              <div className="info-card__body">
                {(p.specs || []).length === 0 && (
                  <div className="prod-empty">
                    No spec categories — this product will be sold as a single variant. Add a category below (or a preset) to offer options.
                  </div>
                )}

                {(p.specs || []).map((axis) => (
                  <SpecAxisEditor
                    key={axis.id}
                    axis={axis}
                    readOnly={isReadOnly}
                    onRenameAxis={(name) => renameAxis(axis.id, name)}
                    onRemoveAxis={() => removeAxis(axis.id)}
                    onAddValue={(label) => addValue(axis.id, label)}
                    onRenameValue={(vid, label) => renameValue(axis.id, vid, label)}
                    onRemoveValue={(vid) => removeValue(axis.id, vid)}
                  />
                ))}

                {!isReadOnly && (
                  <div className="prod-preset-row">
                    <div className="prod-preset-row__lbl">Quick add:</div>
                    {specPresets.map((preset) => {
                      const exists = (p.specs || []).some(
                        (a) => a.key === preset.key || a.name.toLowerCase() === preset.name.toLowerCase()
                      );
                      return (
                        <button key={preset.key} type="button"
                          className="prod-preset-btn"
                          disabled={exists}
                          onClick={() => addAxis(preset)}>
                          <Icon name="plus" size={11}/> {preset.name}
                          <span className="prod-preset-btn__hint">{preset.values.join(' · ')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {vis('pricing') && (
          <div className="info-card">
            <div className="info-card__head">
              <div>
                <div className="info-card__title">Pricing &amp; stock</div>
                <div className="prod-section-hint">
                  {(p.specs && p.specs.length)
                    ? 'One row per spec combination. Name shown in View options is editable.'
                    : 'Single base price + stock.'}
                </div>
              </div>
              <div className="prod-base-price">
                <span className="prod-base-price__lbl">Base price</span>
                <div className="prod-cell-money" style={{ width: 130 }}>
                  <span>$</span>
                  <input className="prod-cell-input prod-cell-input--right" type="number" step="0.01" min="0"
                    value={p.basePrice}
                    onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}/>
                </div>
              </div>
            </div>
            <div className="info-card__body">
              <VariantsMatrix
                product={p}
                onUpdateVariant={updateVariant}
                readOnly={isReadOnly}/>
            </div>
          </div>
          )}

          {wizard && step === 4 && (
          <div className="info-card">
            <div className="info-card__head">
              <div>
                <div className="info-card__title">Review &amp; publish</div>
                <div className="prod-section-hint">Confirm the details below, then publish to make this product available to sales.</div>
              </div>
            </div>
            <div className="info-card__body">
              <dl className="prod-review">
                <dt>Name</dt><dd>{p.name || '—'}</dd>
                <dt>Type</dt><dd>{isDevice ? 'Device' : 'Other'}</dd>
                {isDevice && <><dt>Device model</dt><dd>{linkedModel ? linkedModel.modelCode : (p.deviceModelSnapshot ? p.deviceModelSnapshot.modelCode : '—')}</dd></>}
                {isDevice && p.deviceVariant === 'SAMPLE' && <><dt>Integration</dt><dd>{integrationModes.length ? integrationModes.join(', ') : '—'}</dd></>}
                {isDevice && <><dt>Nature</dt><dd>{p.deviceVariant === 'SAMPLE' ? 'Sample' : 'Production'}</dd></>}
                <dt>Specifications</dt><dd>{(p.specs && p.specs.length) ? p.specs.map((a) => a.name).join(' × ') : 'None (single variant)'}</dd>
                <dt>Variants</dt><dd>{p.variants.length} · {formatPriceRange(p)}</dd>
              </dl>
              <div className="prod-banner prod-banner--ok" style={{ marginBottom: 0 }}>
                <Icon name="check" size={14}/>
                <span>Publishing lists this product immediately — sales can add it to their cart.</span>
              </div>
            </div>
          </div>
          )}

          {wizard && (
            <div className="prod-wizard-nav">
              <Btn variant="secondary" size="md" icon="chevL" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Btn>
              {step < stepDefs.length
                ? <Btn variant="primary" size="md" iconRight="chevR" onClick={goNext} disabled={!stepValidNow}>Next</Btn>
                : <Btn variant="primary" size="md" icon="check" onClick={publishNow} disabled={!canPublish}>Publish</Btn>}
            </div>
          )}
        </div>

        {/* Sidebar preview */}
        <aside className="wizard-aside">
          <h4>Preview</h4>
          <div className="prod-preview">
            <div className="prod-preview__image">
              {p.baseImage ? (
                <img src={p.baseImage} alt=""/>
              ) : isDevice && linkedModel ? (
                <ModelTile model={linkedModel} px={140}/>
              ) : (
                <div className="prod-tile-other" style={{ width: 140, height: 140, fontSize: 48 }}>📦</div>
              )}
            </div>
            <div className="prod-preview__name">{p.name || 'Untitled product'}</div>
            {isDevice && linkedModel && (
              <div className="prod-preview__cat" style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>
                {linkedModel.modelCode} · {p.deviceVariant === 'SAMPLE' ? 'Sample' : 'Production'}
              </div>
            )}
            <div className="prod-preview__price num">{formatPriceRange(p)}</div>
            {isDevice && p.deviceVariant === 'SAMPLE' && integrationModes.length > 0 && (
              <div className="prod-preview__chips">
                {integrationModes.map((m) => <span key={m} className="prod-preview__chip">{m}</span>)}
              </div>
            )}
            <div className="prod-preview__variants">
              {!p.specs || !p.specs.length
                ? <span className="muted">No variants</span>
                : `${p.variants.length} variants · ${p.specs.map((a) => a.name).join(' × ')}`}
            </div>
          </div>
        </aside>
      </div>

      {delistOpen && (
        <window.Modal open={true} onClose={closeDelist} width={480}
          title={`Unpublish ${p.name}?`}
          footer={
            <>
              <Btn variant="ghost" onClick={closeDelist}>Cancel</Btn>
              <Btn variant="danger" icon="package" onClick={confirmDelist}>Unpublish</Btn>
            </>
          }>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            The product will be removed from the Goods store and no longer purchasable. Historical orders are unaffected — you can re-publish later.
          </div>
          <label className="pf-delist-label">
            Reason <span className="pf-delist-required">*</span>
          </label>
          <input
            type="text"
            className="pf-delist-input"
            autoFocus
            value={delistReason}
            onChange={(e) => { setDelistReason(e.target.value); if (delistError) setDelistError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmDelist(); }}
            placeholder="e.g. Out of stock, EOL, replaced by …"
          />
          {delistError && <div className="pf-delist-error">{delistError}</div>}
          <div className="pf-delist-hint">Customers and downstream order history will see this reason.</div>
        </window.Modal>
      )}
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────
const productFormStyles = `
.pf-delist-label { display: block; font-size: 12px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 6px; letter-spacing: 0.02em; }
.pf-delist-required { color: var(--color-error-500); margin-left: 2px; }
.pf-delist-input { width: 100%; padding: 9px 12px; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-1); color: var(--color-text-primary); font-size: 13.5px; font-family: inherit; transition: border-color 120ms; }
.pf-delist-input:focus { outline: none; border-color: var(--color-primary-500); box-shadow: 0 0 0 3px oklch(70% 0.12 230 / 0.18); }
.pf-delist-error { color: var(--color-error-700); font-size: 12px; margin-top: 6px; }
.pf-delist-hint { color: var(--color-text-tertiary); font-size: 12px; margin-top: 8px; }
.prod-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; }
.prod-banner svg { flex: none; }
.prod-banner strong { font-weight: 600; }
.prod-banner--ok { background: var(--color-success-50); color: var(--color-success-700); border: 1px solid oklch(58% 0.14 152 / 0.25); }
.prod-banner--info { background: var(--color-info-50); color: var(--color-info-700); border: 1px solid oklch(60% 0.14 230 / 0.25); }
.prod-banner--warn { background: var(--color-warning-50); color: var(--color-warning-700); border: 1px solid oklch(70% 0.14 80 / 0.3); }
.prod-banner--muted { background: var(--color-bg-3); color: var(--color-text-secondary); border: 1px solid var(--color-border-default); }

.prod-sync-banner { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; margin-bottom: 16px; background: var(--color-warning-50); border: 1px solid oklch(75% 0.13 75 / 0.35); border-radius: 10px; }
.prod-sync-banner > svg { flex: none; margin-top: 1px; color: var(--color-warning-700); }
.prod-sync-banner__main { flex: 1; min-width: 0; }
.prod-sync-banner__title { font-size: 13px; font-weight: 600; color: var(--color-warning-700); }
.prod-sync-banner__sub { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.5; }
.prod-section-hint { font-size: 12px; color: var(--color-text-tertiary); margin-top: 3px; line-height: 1.5; }

/* DEVICE specs bound to model attributes */
.prod-mspec__row { padding: 12px 14px; border: 1px solid var(--color-border-subtle); border-radius: 10px; background: var(--color-bg-3); margin-bottom: 10px; }
.prod-mspec__row.is-on { border-color: oklch(60% 0.14 262 / 0.3); background: var(--color-primary-50); }
.prod-mspec__head { display: flex; align-items: center; gap: 10px; }
.prod-mspec__name { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.prod-mspec__hint { font-size: 11.5px; color: var(--color-text-tertiary); }
.prod-mspec__fixedval { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); font-family: var(--font-family-mono); padding: 2px 8px; border-radius: 999px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); }
.prod-mspec__row--fixed .prod-mspec__hint { margin-left: auto; }
.prod-conn__preview { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-left: 2px; }
.prod-conn__preview-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-right: 2px; }
.prod-mspec__opts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-left: 2px; }
.prod-mchip { font-size: 12.5px; padding: 6px 12px; border-radius: 999px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); color: var(--color-text-secondary); cursor: pointer; font-family: inherit; transition: all var(--duration-fast); }
.prod-mchip:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.prod-mchip.is-on { background: var(--color-primary-700); border-color: var(--color-primary-700); color: var(--color-text-on-primary, #fff); font-weight: 500; }
.prod-mchip:disabled { opacity: 0.6; cursor: default; }
.prod-fixed-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.prod-fixed-chip { font-size: 12px; padding: 6px 10px; border-radius: 8px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); }
.prod-fixed-chip strong { color: var(--color-text-primary); font-weight: 600; margin-right: 4px; }
.prod-mspec-legacy { margin-top: 4px; }
.prod-legacy-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed var(--color-border-default); border-radius: 8px; background: var(--color-bg-3); margin-bottom: 8px; }
.prod-legacy-name { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-right: 8px; }
.prod-legacy-vals { font-size: 12px; color: var(--color-text-tertiary); }
.prod-section-sublabel { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 8px; }
.prod-section-sublabel__hint { font-weight: 500; letter-spacing: 0; text-transform: none; margin-left: 6px; color: var(--color-text-tertiary); }

.prod-type-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.prod-cat-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 16px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: all var(--duration-fast); }
.prod-cat-card:hover:not(:disabled) { border-color: var(--color-border-strong); }
.prod-cat-card.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.prod-cat-card:disabled { opacity: 0.55; cursor: not-allowed; }
.prod-cat-card__label { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.prod-cat-card__hint { font-size: 11.5px; color: var(--color-text-tertiary); line-height: 1.4; }

.prod-model-tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
@media (max-width: 1100px) { .prod-model-tiles { grid-template-columns: repeat(3, 1fr); } }
.prod-model-tiles--scroll { max-height: 236px; overflow-y: auto; padding: 2px; }
.prod-model-search { display: flex; align-items: center; gap: 8px; padding: 7px 10px; margin-bottom: 10px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 8px; color: var(--color-text-tertiary); }
.prod-model-search:focus-within { border-color: var(--color-primary-700); color: var(--color-text-secondary); }
.prod-model-search input { flex: 1; border: 0; background: transparent; outline: 0; font: inherit; font-size: 13px; color: var(--color-text-primary); }
.prod-model-search__x { border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--color-text-tertiary); padding: 2px; border-radius: 4px; }
.prod-model-search__x:hover { background: var(--color-bg-3); color: var(--color-text-primary); }
.prod-model-tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; background: var(--color-bg-2); border: 1.5px solid var(--color-border-default); border-radius: 10px; cursor: pointer; font-family: inherit; transition: all var(--duration-fast); }
.prod-model-tile:hover:not(:disabled) { border-color: var(--color-border-strong); }
.prod-model-tile.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.10); }
.prod-model-tile:disabled { opacity: 0.55; cursor: not-allowed; }
.prod-model-tile__art { padding: 4px 0; }
.prod-model-tile__name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.prod-model-tile__family { font-size: 10.5px; color: var(--color-text-tertiary); }

.prod-chk-row { display: flex; flex-wrap: wrap; gap: 8px; }
.prod-chk { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 999px; cursor: pointer; font-size: 12.5px; transition: all var(--duration-fast); }
.prod-chk:hover { border-color: var(--color-border-strong); }
.prod-chk.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); color: var(--color-primary-700); font-weight: 500; }
.prod-chk input[type="checkbox"] { accent-color: var(--color-primary-700); }

.prod-variant-pick__row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.prod-variant-pick__opt { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; cursor: pointer; transition: all var(--duration-fast); }
.prod-variant-pick__opt:hover { border-color: var(--color-border-strong); }
.prod-variant-pick__opt.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); }
.prod-variant-pick__opt input[type="radio"] { accent-color: var(--color-primary-700); margin-top: 2px; flex: none; }
.prod-variant-pick__lbl { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.prod-variant-pick__hint { font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 2px; line-height: 1.4; }

.prod-spec-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle); }
.prod-spec-row:last-child { border-bottom: 0; }
.prod-spec-row__lbl { font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); width: 110px; flex: none; }

.prod-empty { padding: 18px; text-align: center; color: var(--color-text-tertiary); border: 1.5px dashed var(--color-border-default); border-radius: 10px; font-size: 12.5px; background: var(--color-bg-3); margin-bottom: 10px; }

.prod-axis-editor { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.prod-axis-editor__head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.prod-axis-editor__name { flex: 1; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 6px; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); outline: 0; }
.prod-axis-editor__name:hover:not(:disabled) { background: var(--color-bg-2); }
.prod-axis-editor__name:focus { background: var(--color-bg-2); border-color: var(--color-primary-700); }
.prod-axis-editor__remove { width: 28px; height: 28px; border-radius: 6px; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--color-text-tertiary); }
.prod-axis-editor__remove:hover { background: var(--color-error-50, oklch(96% 0.02 30)); color: var(--color-error-700); }
.prod-axis-editor__values { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

.prod-axis-chip { display: inline-flex; align-items: center; gap: 2px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 8px; padding: 3px 4px 3px 10px; }
.prod-axis-chip input { border: 0; background: transparent; outline: 0; font: inherit; font-size: 12.5px; color: var(--color-text-primary); padding: 3px 0; width: 110px; }
.prod-axis-chip input:disabled { color: var(--color-text-tertiary); }
.prod-axis-chip__x { width: 22px; height: 22px; border-radius: 6px; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--color-text-tertiary); }
.prod-axis-chip__x:hover { background: var(--color-bg-3); color: var(--color-error-700); }
.prod-axis-add input { border: 1px dashed var(--color-border-default); background: transparent; border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 12.5px; color: var(--color-text-secondary); outline: 0; width: 140px; }
.prod-axis-add input:focus { border-style: solid; border-color: var(--color-primary-700); color: var(--color-text-primary); }

.prod-preset-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--color-border-subtle); }
.prod-preset-row__lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-right: 4px; }
.prod-preset-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 12px; cursor: pointer; font-family: inherit; font-size: 12.5px; color: var(--color-text-primary); transition: all var(--duration-fast); }
.prod-preset-btn:hover:not(:disabled) { border-color: var(--color-primary-700); background: var(--color-primary-50); color: var(--color-primary-700); }
.prod-preset-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.prod-preset-btn__hint { font-size: 11px; color: var(--color-text-tertiary); }
.prod-preset-btn:hover:not(:disabled) .prod-preset-btn__hint { color: var(--color-primary-700); opacity: 0.75; }

.prod-base-price { display: flex; align-items: center; gap: 10px; }
.prod-base-price__lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }

.prod-fixed-chip--rm { display: inline-flex; align-items: center; gap: 5px; padding-right: 5px; }
.prod-fixed-chip__x { width: 15px; height: 15px; flex: none; border: 0; border-radius: 999px; background: transparent; color: currentColor; opacity: 0.45; cursor: pointer; display: grid; place-items: center; padding: 0; transition: all var(--duration-fast); }
.prod-fixed-chip__x:hover { opacity: 1; background: var(--color-error-50); color: var(--color-error-700); }

.prod-variant-table { width: 100%; border-collapse: collapse; }
.prod-variant-cell { display: flex; flex-direction: column; gap: 3px; max-width: 360px; }
.prod-variant-cell__name { width: 100%; }
.prod-variant-cell__alias { font-size: 11.5px; color: var(--color-text-tertiary); font-family: var(--font-family-mono); padding-left: 2px; letter-spacing: -0.01em; }
.prod-variant-table th { text-align: left; padding: 10px 12px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); background: var(--color-bg-3); border-bottom: 1px solid var(--color-border-default); }
.prod-variant-table th input[type="checkbox"], .prod-variant-table td input[type="checkbox"] { accent-color: var(--color-primary-700); cursor: pointer; }
.prod-variant-table td { padding: 8px 12px; border-bottom: 1px solid var(--color-border-subtle); vertical-align: middle; }
.prod-variant-row:hover td { background: var(--color-bg-3); }
.prod-variant-row.is-off td { background: var(--color-bg-3); color: var(--color-text-tertiary); }
.prod-variant-row.is-off:hover td { background: oklch(94% 0.005 250); }
.prod-variant-row.is-off .prod-cell-input,
.prod-variant-row.is-off .prod-cell-money { opacity: 0.55; }
.prod-th-hint { font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--color-text-tertiary); margin-left: 4px; }

.prod-cell-input { width: 100%; border: 1px solid var(--color-border-default); border-radius: 6px; background: var(--color-bg-2); padding: 5px 8px; font: inherit; font-size: 12.5px; color: var(--color-text-primary); outline: 0; }
.prod-cell-input:focus { border-color: var(--color-primary-700); }
.prod-cell-input--right { text-align: right; font-variant-numeric: tabular-nums; }
.prod-cell-input:disabled { background: var(--color-bg-3); color: var(--color-text-tertiary); cursor: not-allowed; }
.prod-cell-money { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-border-default); border-radius: 6px; background: var(--color-bg-2); padding: 0 6px 0 8px; }
.prod-cell-money > span { font-size: 12.5px; color: var(--color-text-tertiary); }
.prod-cell-money .prod-cell-input { border: 0; padding: 5px 0; background: transparent; }
.prod-cell-money:focus-within { border-color: var(--color-primary-700); }

.prod-stock-cell { display: flex; align-items: center; gap: 10px; }
.prod-stock-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--color-text-secondary); cursor: pointer; white-space: nowrap; }
.prod-stock-toggle input[type="checkbox"] { accent-color: var(--color-primary-700); }

.prod-img-picker__empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 36px 12px; border: 1.5px dashed var(--color-border-default); border-radius: 10px; background: var(--color-bg-3); cursor: pointer; transition: all var(--duration-fast); color: var(--color-text-secondary); }
.prod-img-picker__empty:hover { border-color: var(--color-border-strong); background: var(--color-bg-2); }
.prod-img-picker__empty.is-disabled { cursor: not-allowed; opacity: 0.5; }
.prod-img-picker__has { display: flex; align-items: center; gap: 16px; }
.prod-img-picker__has img { width: 110px; height: 110px; object-fit: contain; background: #fff; border: 1px solid var(--color-border-default); border-radius: 10px; padding: 6px; }
.prod-img-picker__fallback { width: 110px; height: 110px; display: grid; place-items: center; background: #fff; border: 1px dashed var(--color-border-default); border-radius: 10px; padding: 6px; }
.prod-img-picker__fallback-lbl { font-size: 11.5px; color: var(--color-text-tertiary); line-height: 1.5; margin-right: 6px; }
.prod-img-picker__actions { display: flex; align-items: center; gap: 6px; }

.prod-img-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.prod-img-cell { position: relative; width: 110px; height: 110px; }
.prod-img-cell img { width: 110px; height: 110px; object-fit: contain; background: #fff; border: 1px solid var(--color-border-default); border-radius: 10px; padding: 6px; }
.prod-img-cell__badge { position: absolute; left: 6px; top: 6px; font: 600 9.5px var(--font-family-mono); letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border-radius: 5px; background: var(--color-primary-700); color: #fff; }
.prod-img-cell__x { position: absolute; right: -6px; top: -6px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--color-border-default); background: var(--color-bg-1); color: var(--color-text-secondary); cursor: pointer; box-shadow: var(--shadow-1); }
.prod-img-cell__x:hover { color: var(--color-error-700); border-color: var(--color-error-700); }
.prod-img-add { width: 110px; height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1.5px dashed var(--color-border-default); border-radius: 10px; background: var(--color-bg-2); color: var(--color-text-secondary); cursor: pointer; font: 500 12px inherit; }
.prod-img-add:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.prod-img-hint { font-size: 11.5px; margin-top: 8px; }

.prod-radio-group { display: flex; flex-direction: column; gap: 8px; }
.prod-radio { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-primary); cursor: pointer; }
.prod-radio input[type="radio"] { accent-color: var(--color-primary-700); }
.prod-dt { margin-left: 8px; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); font: inherit; font-size: 12.5px; color: var(--color-text-primary); }
.prod-dt:focus { border-color: var(--color-primary-700); outline: 0; }

.prod-toggle-line { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; cursor: pointer; padding: 10px 12px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 8px; }
.prod-toggle-line input[type="checkbox"] { accent-color: var(--color-primary-700); margin-top: 1px; }
.prod-toggle-line strong { font-weight: 600; }

.prod-preview { padding: 4px 0 0; }
.prod-preview__image { display: flex; justify-content: center; padding: 8px 0 12px; }
.prod-preview__image img { max-width: 140px; max-height: 140px; object-fit: contain; background: #fff; border-radius: 10px; padding: 6px; border: 1px solid var(--color-border-subtle); }
.prod-preview__name { text-align: center; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
.prod-preview__cat { text-align: center; margin-top: 6px; }
.prod-preview__price { text-align: center; margin-top: 6px; font-size: 14px; color: var(--color-text-secondary); }
.prod-preview__chips { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 8px; }
.prod-preview__chip { font-size: 11px; padding: 2px 8px; background: var(--color-bg-3); color: var(--color-text-secondary); border-radius: 999px; border: 1px solid var(--color-border-subtle); }
.prod-preview__variants { text-align: center; margin-top: 6px; font-size: 11.5px; color: var(--color-text-tertiary); }
.prod-preview hr { border: 0; border-top: 1px solid var(--color-border-subtle); margin: 14px 0; }

.stepper__item.is-clickable { cursor: pointer; }
.prod-stepper-sticky { position: sticky; top: 0; z-index: 6; background: var(--color-bg-1); padding: 6px 0 10px; margin: -6px 0 0; }
.prod-edit-sticky { position: sticky; top: 0; z-index: 18; background: var(--color-bg-1); padding: 6px 0 12px; box-shadow: 0 5px 6px -6px oklch(0% 0 0 / 0.18); }
.prod-back { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: 0; padding: 4px 8px; margin: 0 0 8px -8px; border-radius: 6px; cursor: pointer; font: 500 12.5px var(--font-family-sans); color: var(--color-text-secondary); }
.prod-back:hover { background: var(--color-bg-hover, var(--color-bg-3)); color: var(--color-text-primary); }
.prod-wizard-nav { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 4px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
.prod-review { display: grid; grid-template-columns: 150px 1fr; gap: 10px 16px; margin-bottom: 16px; }
.prod-review dt { font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); }
.prod-review dd { font-size: 13px; color: var(--color-text-primary); }
`;

if (typeof document !== 'undefined' && !document.getElementById('product-form-styles')) {
  const s = document.createElement('style');
  s.id = 'product-form-styles';
  s.textContent = productFormStyles;
  document.head.appendChild(s);
}

window.ProductForm = ProductForm;
