/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, useToast,
   blankProduct, finalizeProduct, buildSkus, newSkuId,
   skuLabel, skuFullName, formatPriceRange, productPriceRange,
   PRODUCT_STATUS_TONE, PRODUCT_STATUS_LABEL,
   SEED_CATEGORIES, categoryById, categoryAttributeOptions, isCategoryLinked,
   flattenCategoryTree, isLeafCategory, categoryPathLabel,
   activeSkus */
const { useState, useRef, useEffect, useMemo } = React;

// ─── Category cascader (drill-down column picker for the category tree) ──
// Tree can be 3+ levels deep (e.g. POS → Handheld → N750), so a flat select
// doesn't scale. Columns drill left→right; groups navigate, leaves select.
const CategoryCascader = ({ cats, value, onChange, placeholder = 'Select a category…' }) => {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState([]); // drilled-into group ids, left→right
  const wrapRef = useRef(null);

  const openIt = () => {
    if (value) {
      const anc = window.categoryPath(cats, value).map((c) => c.id);
      setPath(anc.slice(0, -1));
    } else setPath([]);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Build columns: top level + one column per drilled group.
  const columns = [window.childCategories(cats, null)];
  path.forEach((id) => {
    const kids = window.childCategories(cats, id);
    if (kids.length) columns.push(kids);
  });

  const clickItem = (c, depth) => {
    if (window.isLeafCategory(cats, c.id)) { onChange(c.id); setOpen(false); }
    else setPath([...path.slice(0, depth), c.id]);
  };

  const pathLabel = value ? window.categoryPathLabel(cats, value) : '';
  return (
    <div className="catpick" ref={wrapRef}>
      <button type="button" className={`catpick__trigger ${open ? 'is-open' : ''}`} onClick={() => (open ? setOpen(false) : openIt())}>
        {pathLabel
          ? <span className="catpick__value">{window.categoryPath(cats, value).map((c, i, arr) => (
              <React.Fragment key={c.id}>
                {i < arr.length - 1 ? <span className="catpick__seg">{c.name}</span> : <strong>{c.name}</strong>}
                {i < arr.length - 1 && <span className="catpick__sep">/</span>}
              </React.Fragment>
            ))}</span>
          : <span className="catpick__placeholder">{placeholder}</span>}
        <Icon name="chevD" size={14}/>
      </button>
      {open && (
        <div className="catpick__pop">
          {columns.map((col, depth) => (
            <div key={depth} className="catpick__col">
              {col.map((c) => {
                const leaf = window.isLeafCategory(cats, c.id);
                const inPath = path[depth] === c.id;
                const selected = value === c.id;
                return (
                  <button key={c.id} type="button"
                    className={`catpick__item ${inPath ? 'is-open' : ''} ${selected ? 'is-selected' : ''}`}
                    onClick={() => clickItem(c, depth)}>
                    <span className="catpick__item-lbl">{c.name}</span>
                    {leaf
                      ? (selected && <Icon name="check" size={13}/>)
                      : <Icon name="chevR" size={13}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Wizard stepper (re-uses .stepper classes from the main stylesheet) ──
// ─── Stepper (ui-spec §7.3A 变体 A · 卡片，复用 shared.jsx 的 <StepperCard>) ──
const ProductStepper = ({ steps, step, onJump }) => (
  <window.StepperCard
    steps={steps.map((it) => ({ label: it.label }))}
    current={step}
    onJump={onJump}
  />
);

// ─── Image picker (up to 3 images) ──────────────────────────────
const MAX_PRODUCT_IMAGES = 3;
// Sample pool for the one-click “Use a sample image” action — fills the slot
// with a ready-made mock product image instead of uploading.
const SAMPLE_PRODUCT_IMAGES = [
  'assets/products/p-001-n950.png',
  'assets/products/p-002-s90.png',
  'assets/products/p-003-s60.png',
  'assets/products/p-004-x800.png',
  'assets/products/p-005-n750.png',
  'assets/products/p-006-s30.png',
  'assets/products/p-007-paper.png',
  'assets/products/p-008-cable.png',
  'assets/products/p-009-onsite.png',
  'assets/products/p-010-remote.png',
  'assets/products/p-011-kit.png',
  'assets/products/p-012-svcpack.png',
];
const ImagePicker = ({ images = [], onChange, disabled, max = MAX_PRODUCT_IMAGES }) => {
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
  // One-click sample: add the next unused mock image from the pool.
  const addSample = () => {
    const next = SAMPLE_PRODUCT_IMAGES.find((src) => !images.includes(src))
      || SAMPLE_PRODUCT_IMAGES[Math.floor(Math.random() * SAMPLE_PRODUCT_IMAGES.length)];
    onChange([...images, next].slice(0, max));
  };
  const fileInput = (
    <input ref={ref} type="file" accept="image/*" multiple hidden
      onChange={(e) => { readFiles(e.target.files); e.target.value = ''; }}/>
  );
  if (images.length === 0) {
    return (
      <div className="prod-img-picker">
        <div className={`prod-img-picker__empty ${disabled ? 'is-disabled' : ''}`} onClick={() => canAdd && ref.current?.click()}>
          <Icon name="upload" size={22}/>
          <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6 }}>Click to upload images</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>PNG / JPG / WebP · Up to {max} · 1:1 recommended</div>
          {canAdd && (
            <button type="button" className="prod-img-sample"
              onClick={(e) => { e.stopPropagation(); addSample(); }}>
              <Icon name="image" size={13}/> Use a sample image
            </button>
          )}
        </div>
        {fileInput}
      </div>
    );
  }
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
        {canAdd && (
          <button type="button" className="prod-img-add prod-img-add--sample" onClick={addSample} title="Add a sample image">
            <Icon name="image" size={18}/>
            <span>Sample</span>
          </button>
        )}
      </div>
      {fileInput}
    </div>
  );
};

// ─── Attribute picker (SELECT from the category's attributes; no add) ─────
// catAttrs = full attribute set defined on the category. The product may offer
// a subset of attributes and, within each, a subset of declared values —
// but never values the category doesn't declare.
const AttributePicker = ({ catAttrs, chosen, readOnly, onToggleAttr, onToggleValue }) => {
  if (!catAttrs.length) {
    return <div className="prod-empty">This category defines no attributes — the product is sold as a single SKU. Add attributes on the category to offer variants.</div>;
  }
  const chosenFor = (key) => chosen.find((a) => a.key === key);
  return (
    <div className="prod-mspec">
      {catAttrs.map((attr) => {
        const ca = chosenFor(attr.key);
        const on = !!ca;
        const selected = ca ? ca.values : [];
        return (
          <div key={attr.key} className={`prod-mspec__row ${on ? 'is-on' : ''}`}>
            <div className="prod-mspec__head">
              <button type="button" className={`up-toggle ${on ? 'is-on' : ''}`}
                disabled={readOnly}
                onClick={() => onToggleAttr(attr)}>
                <span className="up-toggle__dot"/>
              </button>
              <span className="prod-mspec__name">{attr.label}</span>
              <span className="prod-mspec__hint">offer as variants</span>
            </div>
            {on && (
              <div className="prod-mspec__opts">
                {attr.values.map((opt) => (
                  <button key={opt} type="button"
                    className={`prod-mchip ${selected.includes(opt) ? 'is-on' : ''}`}
                    disabled={readOnly}
                    onClick={() => onToggleValue(attr, opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── SKU matrix (price + availability switch; name derived from attributes) ─
const SkuMatrix = ({ product, onUpdateSku, readOnly, newIds }) => {
  // Only current, valid combinations appear here; orphaned-but-referenced SKUs
  // (no longer a valid attribute combination) are shown read-only below.
  const list = (product.skus || []).filter((s) => !window.isOrphanSku(product, s));
  if (!list.length) return null;
  const hasAttrs = (product.attributeOptions || []).some((a) => a.values && a.values.length);
  const allActive = list.every((s) => s.status === 'ACTIVE');
  const toggleAll = () => {
    const target = allActive ? 'INACTIVE' : 'ACTIVE';
    list.forEach((s) => onUpdateSku(s.id, { status: target }));
  };
  return (
    <table className="prod-variant-table">
      <thead>
        <tr>
          <th>SKU {hasAttrs && <span className="prod-th-hint">(named from its attributes)</span>}</th>
          <th style={{ textAlign: 'right', width: 150 }}>Price</th>
          {!readOnly && (
            <th style={{ width: 96, textAlign: 'right' }}>
              <button type="button" className="sku-allbtn" onClick={toggleAll}
                title={allActive ? 'Disable all SKUs' : 'Enable all SKUs'}>
                {allActive ? 'Disable all' : 'Enable all'}
              </button>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {list.map((sku) => {
          const isOn = sku.status === 'ACTIVE';
          const rowDisabled = readOnly || !isOn;
          const label = skuLabel(product, sku);
          const isNew = newIds && newIds.has(sku.id);
          return (
            <tr key={sku.id} className={`prod-variant-row ${isOn ? 'is-on' : 'is-off'}`}>
              <td>
                <div className="prod-variant-cell">
                  <span className="prod-variant-cell__name" style={{ fontWeight: 500, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {label || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Base SKU</span>}
                    {isNew && <span className="prod-sku-tag prod-sku-tag--new">New</span>}
                  </span>
                  {label && <span className="prod-variant-cell__alias">{skuFullName(product, sku)}</span>}
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className="prod-cell-money" style={{ width: 130, marginLeft: 'auto' }}>
                  <span>$</span>
                  <input className="prod-cell-input prod-cell-input--right" type="number" step="0.01" min="0"
                    value={sku.price}
                    onChange={(e) => onUpdateSku(sku.id, { price: parseFloat(e.target.value) || 0 })}
                    disabled={rowDisabled}/>
                </div>
              </td>
              {!readOnly && (
                <td style={{ textAlign: 'right' }}>
                  <div className="sku-switch-wrap">
                    <button type="button" role="switch" aria-checked={isOn}
                      className={`up-toggle ${isOn ? 'is-on' : ''}`}
                      onClick={() => onUpdateSku(sku.id, { status: isOn ? 'INACTIVE' : 'ACTIVE' })}
                      title={isOn ? 'Available — switch off to disable this SKU' : 'Disabled — switch on to make available'}>
                      <span className="up-toggle__dot"/>
                    </button>
                    <span className={`sku-switch-lbl ${isOn ? 'is-on' : ''}`}>{isOn ? 'Available' : 'Off'}</span>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Archived SKUs (read-only) ────────────────────────────────────────────
// Combinations no longer offered but retained because an order references them.
// Immutable: shown for context only.
const ArchivedSkus = ({ product }) => {
  const archived = (product.skus || []).filter((s) => window.isOrphanSku(product, s));
  if (!archived.length) return null;
  return (
    <div className="prod-archived">
      <div className="prod-archived__head">
        <Icon name="folder" size={13}/>
        <span>No longer sold · kept for past orders</span>
      </div>
      <div className="prod-archived__list">
        {archived.map((sku) => (
          <div key={sku.id} className="prod-archived__row">
            <span className="prod-archived__name">{skuLabel(product, sku) || 'Base SKU'}</span>
            <span className="prod-archived__price">${(sku.price || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main form ──────────────────────────────────────────────────
const ProductForm = ({ initial, categories, products, onCancel, onSave, onDelete }) => {
  const [p, setP] = useState(() => initial || blankProduct());
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const isNew = !initial;
  const originalSkuIds = useMemo(() => new Set((initial && initial.skus ? initial.skus : []).map((s) => s.id)), [initial]);
  const newSkuIds = useMemo(() => {
    if (isNew) return new Set();
    return new Set((p.skus || []).filter((s) => !window.isOrphanSku(p, s) && !originalSkuIds.has(s.id)).map((s) => s.id));
  }, [p.skus, originalSkuIds, isNew]);
  const toast = useToast();
  const cats = categories || window.SEED_CATEGORIES || [];
  const allProducts = products || window.SEED_PRODUCTS || [];

  const wizard = isNew;
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [basePrice, setBasePrice] = useState(() => productPriceRange(p).min || 0);

  const isReadOnly = false;
  // RULE-PRD-14: product names must be unique (case-insensitive, trimmed).
  const nameTrim = (p.name || '').trim();
  const dupName = !!nameTrim && allProducts.some(
    (o) => o.id !== p.id && (o.name || '').trim().toLowerCase() === nameTrim.toLowerCase()
  );
  const category = categoryById(cats, p.categoryId);
  const catAttrs = useMemo(() => categoryAttributeOptions(category), [category]);
  const linked = isCategoryLinked(category);
  const eff = p.status;

  const update = (k, v) => setP((x) => ({ ...x, [k]: v, updatedAt: new Date().toISOString() }));

  // ── Category / type ──
  const catOptions = useMemo(() => {
    const flat = window.flattenCategoryTree ? window.flattenCategoryTree(cats) : cats.map((c) => ({ ...c, depth: 0 }));
    return flat.map((c) => ({
      value: c.id,
      label: `${'\u00A0\u00A0'.repeat(c.depth)}${c.name}`,
      leaf: window.isLeafCategory ? window.isLeafCategory(cats, c.id) : true,
    }));
  }, [cats]);

  const setCategory = (categoryId) => {
    setP((x) => {
      // Reset attribute selections — they must come from the NEW category.
      const next = { ...x, categoryId, attributeOptions: [], updatedAt: new Date().toISOString() };
      next.skus = window.buildSkus(x.id, [], basePrice, x.skus);
      return next;
    });
  };

  // ── Attribute selection (subset of category attributes) ──
  const rebuildSkus = (attributeOptions) => window.buildSkus(p.id, attributeOptions, basePrice, p.skus);
  const toggleAttr = (attr) => {
    setP((x) => {
      const exists = (x.attributeOptions || []).some((a) => a.key === attr.key);
      const attributeOptions = exists
        ? x.attributeOptions.filter((a) => a.key !== attr.key)
        : [...(x.attributeOptions || []), { key: attr.key, label: attr.label, values: [...attr.values] }];
      return { ...x, attributeOptions, skus: window.buildSkus(x.id, attributeOptions, basePrice, x.skus), updatedAt: new Date().toISOString() };
    });
  };
  const toggleValue = (attr, value) => {
    setP((x) => {
      const cur = (x.attributeOptions || []).find((a) => a.key === attr.key);
      let attributeOptions;
      if (!cur) {
        attributeOptions = [...(x.attributeOptions || []), { key: attr.key, label: attr.label, values: [value] }];
      } else {
        const has = cur.values.includes(value);
        const values = has ? cur.values.filter((v) => v !== value) : [...cur.values, value];
        attributeOptions = values.length
          ? x.attributeOptions.map((a) => a.key === attr.key ? { ...a, values } : a)
          : x.attributeOptions.filter((a) => a.key !== attr.key);
      }
      return { ...x, attributeOptions, skus: window.buildSkus(x.id, attributeOptions, basePrice, x.skus), updatedAt: new Date().toISOString() };
    });
  };

  const updateSku = (skuId, patch) => {
    setP((x) => ({ ...x, skus: x.skus.map((s) => s.id === skuId ? { ...s, ...patch } : s), updatedAt: new Date().toISOString() }));
  };
  const onBasePriceChange = (price) => {
    setBasePrice(price);
    setP((x) => ({ ...x, skus: x.skus.map((s) => (s.price === 0 || s.price === basePrice) ? { ...s, price } : s), updatedAt: new Date().toISOString() }));
  };

  // ── Validation ──
  const hasImage = !!p.baseImage;
  const step1Valid = !!p.categoryId && !!nameTrim && !dupName && hasImage;
  const step2Valid = (p.skus.length > 0 && p.skus.every((s) => s.price >= 0) && activeSkus(p).length >= 1);
  const stepValidNow = step === 1 ? step1Valid : step === 2 ? step2Valid : true;
  const canActivate = step1Valid && step2Valid;

  const goNext = () => {
    if (!stepValidNow) {
      toast({ kind: 'error', title: 'Please complete this step',
        msg: step === 1
          ? (!p.categoryId ? 'Pick a category' : !nameTrim ? 'Product name is required' : dupName ? 'Another product already uses this name' : 'At least one image is required')
          : 'Add at least one active SKU with a valid price' });
      return;
    }
    const n = Math.min(stepDefs.length, step + 1);
    setStep(n); setMaxStep((m) => Math.max(m, n));
  };

  // ── Save / lifecycle ──
  const saveWith = (patch) => onSave(window.finalizeProduct({ ...p, ...patch, updatedAt: new Date().toISOString() }));
  const activateNow = () => {
    if (!canActivate) { toast({ kind: 'error', title: 'Fill in required fields', msg: 'Category, name and at least one SKU are required' }); return; }
    saveWith({ status: 'ACTIVE' });
    toast({ kind: 'success', title: `${p.name} is now Active` });
  };
  const saveChanges = () => {
    if (dupName) { toast({ kind: 'error', title: 'Duplicate name', msg: 'Another product already uses this name' }); return; }
    saveWith({}); toast({ kind: 'success', title: 'Changes saved' });
  };
  const deactivate = () => { setConfirmDeactivate(false); saveWith({ status: 'INACTIVE' }); toast({ kind: 'warning', title: `${p.name} set to Inactive`, msg: 'Removed from the storefront. Historical orders unaffected.' }); };
  const activate = () => { if (!canActivate) { toast({ kind: 'error', title: 'Cannot activate', msg: 'Complete name, category and SKUs first' }); return; } saveWith({ status: 'ACTIVE' }); toast({ kind: 'success', title: `${p.name} is now Active` }); };

  const renderTopActions = () => {
    if (eff === 'ACTIVE') {
      return (
        <>
          <Btn variant="secondary" size="md" icon="check" onClick={saveChanges}>Save changes</Btn>
          <Btn variant="danger" size="md" icon="package" onClick={() => setConfirmDeactivate(true)}>Deactivate</Btn>
        </>
      );
    }
    return (
      <>
        <Btn variant="secondary" size="md" icon="check" onClick={saveChanges}>Save changes</Btn>
        <Btn variant="primary" size="md" icon="check" onClick={activate} disabled={!canActivate}>Activate</Btn>
      </>
    );
  };

  const statusBanner = () => {
    if (eff === 'INACTIVE' && !isNew) {
      return (
        <div className="prod-banner prod-banner--warn">
          <Icon name="alert" size={14}/>
          <span><strong>Inactive</strong> — not shown in the storefront. Historical orders unaffected.</span>
        </div>
      );
    }
    return null;
  };

  // ── Wizard step config ──
  const stepDefs = [
    { n: 1, sub: 'Step 1', label: 'Details' },
    { n: 2, sub: 'Step 2', label: 'Attributes & pricing' },
    { n: 3, sub: 'Step 3', label: 'Review & activate' },
  ];
  const cardStepMap = { details: 1, specs: 2, review: 3 };
  const vis = (card) => !wizard || step === cardStepMap[card];

  const priceRange = productPriceRange(p);

  return (
    <div className="page">
      <window.TitleBar
        back onBack={onCancel} backLabel="Back to Products"
        title={isNew ? 'New product' : p.name}
        badges={!isNew ? (
          <>
            {category && (() => {
              const path = (window.categoryPath ? window.categoryPath(cats, p.categoryId) : []).slice(0, 2);
              if (!path.length) return null;
              return (
                <span className="prod-cat-badge" title={categoryPathLabel(cats, p.categoryId)}>
                  <Icon name="folder" size={12}/>
                  {path.map((c, i) => (
                    <React.Fragment key={c.id}>
                      {i > 0 && <span className="prod-cat-badge__sep">/</span>}
                      <span>{c.name}</span>
                    </React.Fragment>
                  ))}
                </span>
              );
            })()}
            <Badge tone={PRODUCT_STATUS_TONE[eff]} dot>{PRODUCT_STATUS_LABEL[eff]}</Badge>
          </>
        ) : null}
        subtitle={isNew ? 'Create a product in a few steps. Attributes come from its category — pick which to offer.' : null}
        meta={!isNew ? <span>updated {new Date(p.updatedAt).toLocaleDateString()}</span> : null}
        actions={!wizard ? renderTopActions() : null}
      />

      {statusBanner()}

      {wizard && <ProductStepper steps={stepDefs} step={step} maxStep={maxStep} onJump={setStep} />}

      <div className="wizard-grid">
        <div className="stack" style={{ gap: 16 }}>

          {/* Details — category + basics */}
          {vis('details') && (
            <div className="info-card">
              <div className="info-card__head">
                <div>
                  <div className="info-card__title">Details</div>
                  <div className="prod-section-hint">The category decides which attributes this product can use.</div>
                </div>
              </div>
              <div className="info-card__body">
                <Field label="Category" required>
                  <CategoryCascader cats={cats} value={p.categoryId || null} onChange={setCategory}/>
                </Field>
                {category && linked && (
                  <div className="prod-banner prod-banner--info" style={{ marginTop: 10, marginBottom: 4 }}>
                    <Icon name="info" size={14}/>
                    <span>Attributes for <strong>{category.name}</strong> come from its linked target — you choose which to offer, but can’t add new ones.</span>
                  </div>
                )}
                <Field label="Product name" required>
                  <Input value={p.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. N950 Smart Terminal" disabled={isReadOnly}/>
                  {dupName && (
                    <div className="prod-field-error"><Icon name="alert" size={12}/> Another product already uses this name.</div>
                  )}
                </Field>
                <Field label="Description">
                  <Textarea value={p.desc || ''} onChange={(e) => update('desc', e.target.value)} rows={2}
                    placeholder="One-line summary shown on cart cards and order rows." disabled={isReadOnly}/>
                </Field>
                <Field label="Product images" required hint="1–3 images · the first one is the primary.">
                  <ImagePicker
                    images={[p.baseImage, ...(p.extraImages || [])].filter(Boolean)}
                    onChange={(imgs) => setP((x) => ({ ...x, baseImage: imgs[0] || null, extraImages: imgs.slice(1), updatedAt: new Date().toISOString() }))}
                    disabled={isReadOnly}/>
                </Field>
              </div>
            </div>
          )}

          {/* Attributes & pricing */}
          {vis('specs') && (
            <>
              <div className="info-card">
                <div className="info-card__head">
                  <div>
                    <div className="info-card__title">Attributes</div>
                    <div className="prod-section-hint">Choose which of the category’s attributes this product offers. You can offer fewer values, but can’t add values the category doesn’t have.</div>
                  </div>
                </div>
                <div className="info-card__body">
                  {!category ? (
                    <div className="prod-empty">Pick a category first — its attributes appear here.</div>
                  ) : (
                    <AttributePicker
                      catAttrs={catAttrs}
                      chosen={p.attributeOptions || []}
                      readOnly={isReadOnly}
                      onToggleAttr={toggleAttr}
                      onToggleValue={toggleValue}/>
                  )}
                </div>
              </div>

              <div className="info-card">
                <div className="info-card__head">
                  <div>
                    <div className="info-card__title">Pricing</div>
                    <div className="prod-section-hint">{(p.attributeOptions || []).length ? 'One SKU per attribute combination.' : 'Single SKU price.'}</div>
                  </div>
                  <div className="prod-base-price">
                    <span className="prod-base-price__lbl">Default price</span>
                    <div className="prod-cell-money" style={{ width: 130 }}>
                      <span>$</span>
                      <input className="prod-cell-input prod-cell-input--right" type="number" step="0.01" min="0"
                        value={basePrice} onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)} disabled={isReadOnly}/>
                    </div>
                  </div>
                </div>
                <div className="info-card__body">
                  <SkuMatrix product={p} onUpdateSku={updateSku} readOnly={isReadOnly} newIds={newSkuIds}/>
                  <ArchivedSkus product={p}/>
                </div>
              </div>
            </>
          )}

          {/* Review */}
          {wizard && step === 3 && (
            <div className="info-card">
              <div className="info-card__head">
                <div>
                  <div className="info-card__title">Review &amp; activate</div>
                  <div className="prod-section-hint">Confirm the details, then activate to list this product.</div>
                </div>
              </div>
              <div className="info-card__body">
                <dl className="prod-review">
                  <dt>Name</dt><dd>{p.name || '—'}</dd>
                  <dt>Category</dt><dd>{categoryPathLabel(cats, p.categoryId) || '—'}</dd>
                  {(p.attributeOptions || []).length > 0 && (
                    <>
                      <dt>Options</dt>
                      <dd>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {p.attributeOptions.map((a) => (
                            <div key={a.key}><span style={{ color: 'var(--color-text-tertiary)' }}>{a.label}:</span> {a.values.join(', ')}</div>
                          ))}
                        </div>
                      </dd>
                    </>
                  )}
                </dl>
                <div className="prod-review-skus">
                  <div className="prod-review-skus__head">
                    <span>{(p.attributeOptions || []).length ? 'SKUs for sale' : 'For sale'}</span>
                    <span className="prod-review-skus__count">{(p.skus || []).filter((s) => !window.isOrphanSku(p, s) && s.status === 'ACTIVE').length} active</span>
                  </div>
                  {(p.skus || []).filter((s) => !window.isOrphanSku(p, s)).map((s) => {
                    const lbl = skuLabel(p, s);
                    const on = s.status === 'ACTIVE';
                    return (
                      <div key={s.id} className={`prod-review-skus__row ${on ? '' : 'is-off'}`}>
                        <span className="prod-review-skus__name">
                          {lbl || p.name}
                          {!on && <span className="prod-review-skus__off">Off</span>}
                        </span>
                        <span className="prod-review-skus__price num">${(s.price || 0).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="prod-banner prod-banner--ok" style={{ marginBottom: 0 }}>
                  <Icon name="check" size={14}/>
                  <span>Activating lists this product immediately — it appears in the storefront.</span>
                </div>
              </div>
            </div>
          )}

          {wizard && (
            <window.WizardFooter
              step={step} totalSteps={stepDefs.length}
              onBack={() => setStep(step - 1)}
              onNext={goNext} nextDisabled={!stepValidNow}
              onFinal={activateNow} finalDisabled={!canActivate}
              finalLabel="Activate" />
          )}
        </div>

        {/* Sidebar preview */}
        <aside className="wizard-aside">
          <h4>Preview</h4>
          <div className="prod-preview">
            <div className="prod-preview__image">
              {p.baseImage ? <img src={p.baseImage} alt=""/> : (
                <div className="prod-tile-other" style={{ width: 140, height: 140, fontSize: 48 }}>📦</div>
              )}
            </div>
            <div className="prod-preview__name">{p.name || 'Untitled product'}</div>
            <div className="prod-preview__cat" style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>
              {category ? categoryPathLabel(cats, p.categoryId) : 'No category'}
            </div>
            <div className="prod-preview__price num">{formatPriceRange(p)}</div>
            {(p.attributeOptions || []).length > 0 && (
              <div className="prod-preview__variants">{p.skus.length} SKU{p.skus.length === 1 ? '' : 's'}</div>
            )}
          </div>
        </aside>
      </div>

      <window.ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title={<>Deactivate <strong>{p.name}</strong>?</>}
        body="This product will be removed from the storefront and can no longer be ordered. Historical orders are unaffected. You can reactivate it at any time."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        tone="danger"
        icon="package"
        onConfirm={deactivate} />
    </div>
  );
};

// ─── Styles (kept from prior version; classes reused across the form) ─────
const productFormStyles = `
.prod-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; }
.prod-banner svg { flex: none; }
.prod-banner strong { font-weight: 600; }
.prod-banner--ok { background: var(--color-success-50); color: var(--color-success-700); border: 1px solid oklch(58% 0.14 152 / 0.25); }
.prod-banner--info { background: var(--color-info-50); color: var(--color-info-700); border: 1px solid oklch(60% 0.14 230 / 0.25); }
.prod-banner--warn { background: var(--color-warning-50); color: var(--color-warning-700); border: 1px solid oklch(70% 0.14 80 / 0.3); }
.prod-banner--muted { background: var(--color-bg-3); color: var(--color-text-secondary); border: 1px solid var(--color-border-default); }
.prod-section-hint { font-size: 12px; color: var(--color-text-tertiary); margin-top: 3px; line-height: 1.5; }
.prod-field-error { display: flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 12px; color: var(--color-error-700); }
.prod-field-error svg { flex: none; }
.prod-cat-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: var(--color-bg-3); border: 1px solid var(--color-border-default); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }
.prod-cat-badge svg { color: var(--color-text-tertiary); }
.prod-cat-badge__sep { color: var(--color-text-tertiary); opacity: 0.6; }

.prod-mspec__row { padding: 12px 14px; border: 1px solid var(--color-border-subtle); border-radius: 10px; background: var(--color-bg-3); margin-bottom: 10px; }
.prod-mspec__row.is-on { border-color: oklch(60% 0.14 262 / 0.3); background: var(--color-primary-50); }
.prod-mspec__head { display: flex; align-items: center; gap: 10px; }
.prod-mspec__name { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.prod-mspec__hint { font-size: 11.5px; color: var(--color-text-tertiary); margin-left: auto; }
.prod-mspec__opts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-left: 2px; }
.prod-mchip { font-size: 12.5px; padding: 6px 12px; border-radius: 999px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); color: var(--color-text-secondary); cursor: pointer; font-family: inherit; transition: all var(--duration-fast); }
.prod-mchip:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.prod-mchip.is-on { background: var(--color-primary-700); border-color: var(--color-primary-700); color: var(--color-text-on-primary, #fff); font-weight: 500; }
.prod-mchip:disabled { opacity: 0.6; cursor: default; }

.up-toggle { width: 38px; height: 22px; border-radius: 999px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); position: relative; cursor: pointer; flex: none; transition: all var(--duration-fast); padding: 0; }
.up-toggle__dot { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--color-text-tertiary); transition: all var(--duration-fast); }
.up-toggle.is-on { background: var(--color-primary-700); border-color: var(--color-primary-700); }
.up-toggle.is-on .up-toggle__dot { left: 18px; background: #fff; }
.up-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

.prod-legacy-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed var(--color-border-default); border-radius: 8px; background: var(--color-bg-3); }
.prod-legacy-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-right: 8px; }
.prod-legacy-vals { font-size: 12px; color: var(--color-text-tertiary); }
.prod-section-sublabel { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 8px; }
.prod-section-sublabel__hint { font-weight: 500; letter-spacing: 0; text-transform: none; margin-left: 6px; color: var(--color-text-tertiary); }

.prod-type-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.prod-cat-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 16px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: all var(--duration-fast); }
.prod-cat-card:hover:not(:disabled) { border-color: var(--color-border-strong); }
.prod-cat-card.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.prod-cat-card__label { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.prod-cat-card__hint { font-size: 11.5px; color: var(--color-text-tertiary); line-height: 1.4; }

.prod-empty { padding: 18px; text-align: center; color: var(--color-text-tertiary); border: 1.5px dashed var(--color-border-default); border-radius: 10px; font-size: 12.5px; background: var(--color-bg-3); margin-bottom: 10px; }

.prod-base-price { display: flex; align-items: center; gap: 10px; }
.prod-base-price__lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.prod-preset-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 999px; padding: 6px 12px; cursor: pointer; font-family: inherit; font-size: 12px; color: var(--color-text-primary); transition: all var(--duration-fast); }
.prod-preset-btn:hover:not(:disabled) { border-color: var(--color-primary-700); background: var(--color-primary-50); color: var(--color-primary-700); }
.prod-preset-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.prod-variant-table { width: 100%; border-collapse: collapse; }
.prod-variant-cell { display: flex; flex-direction: column; gap: 3px; max-width: 360px; }
.prod-variant-cell__alias { font-size: 11.5px; color: var(--color-text-tertiary); font-family: var(--font-family-mono); padding-left: 2px; letter-spacing: -0.01em; }
.prod-variant-table th { text-align: left; padding: 10px 12px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); background: var(--color-bg-3); border-bottom: 1px solid var(--color-border-default); }
.prod-variant-table th input[type="checkbox"], .prod-variant-table td input[type="checkbox"] { accent-color: var(--color-primary-700); cursor: pointer; }
.prod-variant-table td { padding: 8px 12px; border-bottom: 1px solid var(--color-border-subtle); vertical-align: middle; }
.prod-variant-row:hover td { background: var(--color-bg-3); }
.prod-variant-row.is-off td { background: var(--color-bg-3); color: var(--color-text-tertiary); }
.prod-variant-row.is-off .prod-cell-input, .prod-variant-row.is-off .prod-cell-money { opacity: 0.55; }
.prod-th-hint { font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--color-text-tertiary); margin-left: 4px; }
.sku-allbtn { border: 0; background: transparent; color: var(--color-primary-700); font: 600 11px inherit; cursor: pointer; padding: 2px 4px; border-radius: 5px; text-transform: none; letter-spacing: 0; }
.sku-allbtn:hover { background: var(--color-primary-50); }
.sku-switch-wrap { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; }
.sku-switch-lbl { font-size: 11px; font-weight: 600; color: var(--color-text-tertiary); min-width: 54px; text-align: left; }
.sku-switch-lbl.is-on { color: var(--color-success-700); }
.prod-sku-tag { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 1px 6px; border-radius: 5px; }
.prod-sku-tag--new { color: var(--color-primary-700); background: var(--color-primary-50); border: 1px solid oklch(60% 0.14 262 / 0.25); }
.prod-archived { margin-top: 16px; border: 1px solid var(--color-border-subtle); border-radius: 10px; background: var(--color-bg-3); overflow: hidden; }
.prod-archived__head { display: flex; align-items: center; gap: 6px; padding: 9px 14px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); border-bottom: 1px solid var(--color-border-subtle); }
.prod-archived__list { padding: 4px 0; }
.prod-archived__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 14px; font-size: 12.5px; }
.prod-archived__name { color: var(--color-text-secondary); }
.prod-archived__price { font-family: var(--font-family-mono); font-size: 12px; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }

.prod-cell-input { width: 100%; border: 1px solid var(--color-border-default); border-radius: 6px; background: var(--color-bg-2); padding: 5px 8px; font: inherit; font-size: 12.5px; color: var(--color-text-primary); outline: 0; }
.prod-cell-input:focus { border-color: var(--color-primary-700); }
.prod-cell-input--right { text-align: right; font-variant-numeric: tabular-nums; }
.prod-cell-input:disabled { background: var(--color-bg-3); color: var(--color-text-tertiary); cursor: not-allowed; }
.prod-cell-money { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-border-default); border-radius: 6px; background: var(--color-bg-2); padding: 0 6px 0 8px; }
.prod-cell-money > span { font-size: 12.5px; color: var(--color-text-tertiary); }
.prod-cell-money .prod-cell-input { border: 0; padding: 5px 0; background: transparent; }
.prod-cell-money:focus-within { border-color: var(--color-primary-700); }

.prod-img-picker__empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 36px 12px; border: 1.5px dashed var(--color-border-default); border-radius: 10px; background: var(--color-bg-3); cursor: pointer; transition: all var(--duration-fast); color: var(--color-text-secondary); }
.prod-img-picker__empty:hover { border-color: var(--color-border-strong); background: var(--color-bg-2); }
.prod-img-picker__empty.is-disabled { cursor: not-allowed; opacity: 0.5; }
.prod-img-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.prod-img-cell { position: relative; width: 110px; height: 110px; }
.prod-img-cell img { width: 110px; height: 110px; object-fit: contain; background: #fff; border: 1px solid var(--color-border-default); border-radius: 10px; padding: 6px; }
.prod-img-cell__badge { position: absolute; left: 6px; top: 6px; font: 600 9.5px var(--font-family-mono); letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border-radius: 5px; background: var(--color-primary-700); color: #fff; }
.prod-img-cell__x { position: absolute; right: -6px; top: -6px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--color-border-default); background: var(--color-bg-1); color: var(--color-text-secondary); cursor: pointer; box-shadow: var(--shadow-1); }
.prod-img-cell__x:hover { color: var(--color-error-700); border-color: var(--color-error-700); }
.prod-img-add { width: 110px; height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1.5px dashed var(--color-border-default); border-radius: 10px; background: var(--color-bg-2); color: var(--color-text-secondary); cursor: pointer; font: 500 12px inherit; }
.prod-img-add:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.prod-img-sample { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 12px; border: 1px solid var(--color-border-default); border-radius: 999px; background: var(--color-bg-2); font: 500 12px inherit; color: var(--color-text-primary); cursor: pointer; transition: all var(--duration-fast); }
.prod-img-sample:hover { border-color: var(--color-primary-700); background: var(--color-primary-50); color: var(--color-primary-700); }
.prod-img-hint { display: none; }

/* Category cascader ────────────────────────────────────── */
.prod-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
@media (max-width: 560px) { .prod-field-grid { grid-template-columns: 1fr; } }
.catpick { position: relative; }
.catpick__trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; height: var(--control-height-md, 36px); padding: 0 12px; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-2); font: inherit; font-size: 13.5px; color: var(--color-text-primary); cursor: pointer; text-align: left; transition: border-color var(--duration-fast); }
.catpick__trigger:hover { border-color: var(--color-border-strong); }
.catpick__trigger.is-open { border-color: var(--color-primary-700); }
.catpick__trigger > svg { color: var(--color-text-tertiary); flex: none; }
.catpick__placeholder { color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.catpick__value { display: inline-flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; white-space: nowrap; }
.catpick__seg { color: var(--color-text-secondary); }
.catpick__sep { color: var(--color-text-tertiary); opacity: 0.7; }
.catpick__pop { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; display: flex; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; box-shadow: var(--shadow-2); overflow: hidden; }
.catpick__col { min-width: 156px; max-height: 264px; overflow-y: auto; padding: 5px; border-right: 1px solid var(--color-border-subtle); }
.catpick__col:last-child { border-right: 0; }
.catpick__item { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 10px; border: 0; border-radius: 6px; background: transparent; font: inherit; font-size: 13px; color: var(--color-text-primary); cursor: pointer; text-align: left; }
.catpick__item:hover { background: var(--color-bg-3); }
.catpick__item.is-open { background: var(--color-primary-50); color: var(--color-primary-700); font-weight: 500; }
.catpick__item.is-selected { color: var(--color-primary-700); font-weight: 600; }
.catpick__item > svg { color: var(--color-text-tertiary); flex: none; }
.catpick__item.is-selected > svg, .catpick__item.is-open > svg { color: var(--color-primary-700); }

.prod-tile-other { border-radius: 10px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); display: grid; place-items: center; }

.prod-preview { padding: 4px 0 0; }
.prod-preview__image { display: flex; justify-content: center; padding: 8px 0 12px; }
.prod-preview__image img { max-width: 140px; max-height: 140px; object-fit: contain; background: #fff; border-radius: 10px; padding: 6px; border: 1px solid var(--color-border-subtle); }
.prod-preview__name { text-align: center; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
.prod-preview__cat { text-align: center; margin-top: 6px; }
.prod-preview__price { text-align: center; margin-top: 6px; font-size: 14px; color: var(--color-text-secondary); }
.prod-preview__variants { text-align: center; margin-top: 6px; font-size: 11.5px; color: var(--color-text-tertiary); }

.stepper__item.is-clickable { cursor: pointer; }
.prod-review { display: grid; grid-template-columns: 150px 1fr; gap: 10px 16px; margin-bottom: 16px; }
.prod-review dt { font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); }
.prod-review dd { font-size: 13px; color: var(--color-text-primary); }
.prod-review-skus { border: 1px solid var(--color-border-subtle); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.prod-review-skus__head { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; background: var(--color-bg-3); border-bottom: 1px solid var(--color-border-subtle); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.prod-review-skus__count { font-family: var(--font-family-mono); letter-spacing: 0; text-transform: none; color: var(--color-text-secondary); }
.prod-review-skus__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 14px; border-bottom: 1px solid var(--color-border-subtle); }
.prod-review-skus__row:last-child { border-bottom: 0; }
.prod-review-skus__row.is-off { background: var(--color-bg-3); }
.prod-review-skus__name { font-size: 13px; color: var(--color-text-primary); display: inline-flex; align-items: center; gap: 8px; }
.prod-review-skus__row.is-off .prod-review-skus__name { color: var(--color-text-tertiary); }
.prod-review-skus__off { font: 600 10px var(--font-family-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-text-tertiary); background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 4px; padding: 1px 6px; }
.prod-review-skus__price { font-size: 13px; font-weight: 500; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.prod-review-skus__row.is-off .prod-review-skus__price { color: var(--color-text-tertiary); }
`;
if (typeof document !== 'undefined' && !document.getElementById('product-form-styles')) {
  const s = document.createElement('style');
  s.id = 'product-form-styles';
  s.textContent = productFormStyles;
  document.head.appendChild(s);
}

window.ProductForm = ProductForm;
