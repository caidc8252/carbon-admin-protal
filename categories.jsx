/* global React, Btn, Input, Field, Select, Icon, Badge, Modal, useToast,
   SEED_CATEGORIES, blankCategory, newAttrKey, categoryById, childCategories,
   flattenCategoryTree, categoryAttributeOptions, isCategoryLinked, isLeafCategory,
   categoryDescendantIds, categoryProductCount, CATEGORY_LINK_TARGETS, SEED_DEVICE_MODELS */
const { useState, useMemo, useEffect } = React;

const cloneCat = (c) => JSON.parse(JSON.stringify(c));

// ─── Attribute editor (self-managed categories) ──────────────────────────
const AttrEditor = ({ attr, onRename, onRemove, onAddValue, onRenameValue, onRemoveValue }) => {
  const [newVal, setNewVal] = useState('');
  const submit = () => { if (newVal.trim()) { onAddValue(newVal.trim()); setNewVal(''); } };
  return (
    <div className="prod-axis-editor">
      <div className="prod-axis-editor__head">
        <input className="prod-axis-editor__name" value={attr.label}
          placeholder="Attribute name (e.g. Color)" onChange={(e) => onRename(e.target.value)}/>
        <button type="button" className="prod-axis-editor__remove" onClick={onRemove} title="Remove attribute">
          <Icon name="trash" size={12}/>
        </button>
      </div>
      <div className="prod-axis-editor__values">
        {attr.values.map((v, i) => (
          <div key={i} className="prod-axis-chip">
            <input value={v} onChange={(e) => onRenameValue(i, e.target.value)}/>
            <button type="button" className="prod-axis-chip__x" onClick={() => onRemoveValue(i)} title="Remove value">
              <Icon name="x" size={10}/>
            </button>
          </div>
        ))}
        <div className="prod-axis-add">
          <input value={newVal} placeholder="+ Add value"
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            onBlur={submit}/>
        </div>
      </div>
    </div>
  );
};

// ─── Category manager (master-detail · add & edit on one page) ────────────
const CategoryManager = ({ categories, products, models, onBack, onSave, onDelete }) => {
  const toast = useToast();
  const cats = categories || window.SEED_CATEGORIES || [];
  const modelList = models || window.SEED_DEVICE_MODELS || [];
  const allRows = useMemo(() => window.flattenCategoryTree(cats), [cats]);
  // Which parent ids have children (drive the collapse chevron).
  const parentIds = useMemo(() => new Set(cats.filter((c) => window.childCategories(cats, c.id).length).map((c) => c.id)), [cats]);
  // Collapse state — default ALL parents expanded.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleCollapse = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  // A row is visible only when none of its ancestors are collapsed.
  const rows = useMemo(() => allRows.filter((c) => {
    const path = window.categoryPath(cats, c.id) || [];
    return path.slice(0, -1).every((a) => !collapsed.has(a.id));
  }), [allRows, collapsed, cats]);

  // selId: a category id, '__new__', or null. draft: the working copy.
  const [selId, setSelId] = useState(() => rows[0]?.id || null);
  const [draft, setDraft] = useState(() => (rows[0] ? cloneCat(rows[0]) : null));
  const isNew = selId === '__new__';
  // delTarget: { cat, pc, leaf, can } — drives the delete modal (confirm or blocked).
  const [delTarget, setDelTarget] = useState(null);
  // delAttrTarget: attribute pending removal from the draft — drives a confirm modal.
  const [delAttrTarget, setDelAttrTarget] = useState(null);
  // impactTarget: { saved, impact } — drives the "apply attribute changes" preview
  // (RULE-PRD-01): which products' SKUs auto-sync when this category is saved.
  const [impactTarget, setImpactTarget] = useState(null);

  // Keep the draft in sync when selecting an existing category.
  useEffect(() => {
    if (selId === '__new__') return;
    if (!selId) { setDraft(null); return; }
    const c = cats.find((x) => x.id === selId);
    setDraft(c ? cloneCat(c) : null);
  }, [selId, categories]);

  const startNew = (parentId = null) => {
    setDraft(window.blankCategory(parentId));
    setSelId('__new__');
  };

  const linked = !!(draft && draft.linkTargetType);
  const linkDef = linked ? window.linkTargetDef(draft.linkTargetType) : null;
  const linkOptions = linkDef ? linkDef.options() : [];
  const derivedAttrs = useMemo(() => (draft ? window.categoryAttributeOptions(draft) : []), [draft]);

  const parentOptions = useMemo(() => {
    if (!draft) return [];
    const banned = new Set(window.categoryDescendantIds(cats, draft.id));
    const flat = window.flattenCategoryTree(cats).filter((x) => !banned.has(x.id));
    return [{ value: '', label: 'Top level' }].concat(flat.map((x) => ({ value: x.id, label: `${'\u00A0\u00A0'.repeat(x.depth)}${x.name}` })));
  }, [cats, draft]);

  const upd = (patch) => setDraft((x) => ({ ...x, ...patch }));
  // Toggle source: '' = self-managed; otherwise a registry type (default first).
  const setLinkSource = (on) => {
    if (on) {
      const def = window.linkTargetDef(draft.linkTargetType) || window.CATEGORY_LINK_TARGETS[0];
      const first = def.options()[0];
      upd({ linkTargetType: def.type, linkTargetId: draft.linkTargetId || (first ? first.value : null), attributeOptions: [] });
    } else {
      upd({ linkTargetType: null, linkTargetId: null });
    }
  };
  const setLinkTargetType = (type) => {
    const def = window.linkTargetDef(type);
    if (!def) return;
    const first = def.options()[0];
    upd({ linkTargetType: type, linkTargetId: first ? first.value : null });
  };
  const addAttr = () => {
    upd({ attributeOptions: [...(draft.attributeOptions || []), { key: window.newAttrKey(), label: 'New attribute', values: ['Option 1'] }] });
    // Reveal the new editor: it lands below the sticky footer, so scroll the
    // page container to bring it into view, then focus its name input.
    setTimeout(() => {
      const content = document.querySelector('.content');
      const editors = document.querySelectorAll('.prod-axis-editor');
      const last = editors[editors.length - 1];
      const foot = document.querySelector('.cat-mgr__foot');
      if (!content || !last) return;
      const cr = content.getBoundingClientRect();
      const lr = last.getBoundingClientRect();
      const footH = foot ? foot.offsetHeight : 0;
      const delta = lr.bottom - (cr.bottom - footH - 12);
      if (delta > 0) content.scrollTo({ top: content.scrollTop + delta, behavior: 'smooth' });
      const nameInput = last.querySelector('.prod-axis-editor__name');
      if (nameInput) { nameInput.focus(); nameInput.select(); }
    }, 60);
  };
  const renameAttr = (key, label) => upd({ attributeOptions: draft.attributeOptions.map((a) => a.key === key ? { ...a, label } : a) });
  const removeAttr = (key) => upd({ attributeOptions: draft.attributeOptions.filter((a) => a.key !== key) });
  const confirmRemoveAttr = () => {
    if (delAttrTarget) removeAttr(delAttrTarget.key);
    setDelAttrTarget(null);
  };
  const addValue = (key, val) => upd({ attributeOptions: draft.attributeOptions.map((a) => a.key === key ? { ...a, values: [...a.values, val] } : a) });
  const renameValue = (key, i, val) => upd({ attributeOptions: draft.attributeOptions.map((a) => a.key === key ? { ...a, values: a.values.map((v, idx) => idx === i ? val : v) } : a) });
  const removeValue = (key, i) => upd({ attributeOptions: draft.attributeOptions.map((a) => a.key === key ? { ...a, values: a.values.filter((_, idx) => idx !== i) } : a).filter((a) => a.values.length > 0) });

  const canSave = !!(draft && draft.name && draft.name.trim()) && (!linked || !!draft.linkTargetId);
  const commitSave = (saved, affected) => {
    onSave(saved, (affected || []).map((a) => a.product));
    toast({ kind: 'success', title: isNew ? `${saved.name} created` : 'Category saved' });
    setSelId(saved.id);
  };
  const save = () => {
    if (!canSave) { toast({ kind: 'error', title: 'Category name is required' }); return; }
    const attributeOptions = linked ? [] : (draft.attributeOptions || [])
      .map((a) => ({ ...a, values: a.values.map((v) => String(v).trim()).filter(Boolean) }))
      .filter((a) => a.label.trim() && a.values.length);
    const saved = { ...draft, name: draft.name.trim(), parentId: draft.parentId || null, attributeOptions };
    // RULE-PRD-01: before applying, work out which products' SKUs this changes;
    // if any, preview the impact and let the operator confirm.
    const newCatAttrs = window.categoryAttributeOptions(saved);
    const impact = isNew ? [] : (window.categoryAttrImpact ? window.categoryAttrImpact(saved.id, newCatAttrs, products || []) : []);
    if (impact.length) { setImpactTarget({ saved, impact }); return; }
    commitSave(saved, []);
  };

  const delInfo = (c) => {
    const pc = window.categoryProductCount(cats, products || [], c.id);
    const leaf = window.isLeafCategory(cats, c.id);
    const childCount = window.childCategories(cats, c.id).length;
    return { cat: c, pc, leaf, childCount, can: pc === 0 && leaf };
  };
  const requestDelete = (c) => setDelTarget(delInfo(c));
  const confirmDelete = () => {
    if (!delTarget || !delTarget.can) return;
    onDelete(delTarget.cat);
    if (selId === delTarget.cat.id) setSelId(null);
    setDelTarget(null);
  };

  return (
    <div className="page">
      <window.TitleBar
        back onBack={onBack} backLabel="Back to Products"
        title="Categories"
        subtitle="Organise products into a tree. Each category defines the full set of attributes its products may use."
      />

      <div className="cat-mgr">
        {/* ── Tree list ── */}
        <div className="info-card cat-mgr__list">
          <div className="cat-mgr__list-head">
            <span>{rows.length} categor{rows.length === 1 ? 'y' : 'ies'}</span>
            <button className="cat-mgr__list-new" onClick={() => startNew(null)} title="New top-level category"><Icon name="plus" size={13}/> New</button>
          </div>
          <div className="cat-tree-rows">
            {rows.map((c) => {
              const cLinked = window.isCategoryLinked(c);
              const leaf = window.isLeafCategory(cats, c.id);
              const hasKids = parentIds.has(c.id);
              const isCollapsed = collapsed.has(c.id);
              const on = selId === c.id;
              const linkModel = cLinked ? (window.linkTargetLabel(c) || 'entity') : null;
              return (
                <div key={c.id} className={`cat-tree-row ${on ? 'is-on' : ''}`} onClick={() => setSelId(c.id)}>
                  <div className="cat-tree-row__main" style={{ paddingLeft: c.depth * 18 }}>
                    {hasKids ? (
                      <button type="button" className="cat-tree-row__caret"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(c.id); }}>
                        <Icon name="chevR" size={13} style={{ transform: isCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform var(--duration-fast) var(--easing-standard)' }}/>
                      </button>
                    ) : (
                      <span className="cat-tree-row__caret cat-tree-row__caret--spacer"/>
                    )}
                    <Icon name={leaf ? 'package' : 'folder'} size={15} style={{ color: on ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)', flex: 'none' }}/>
                    <span className="cat-tree-row__name">{c.name}</span>
                    {cLinked && (
                      <span className="cat-tree-row__link" title={`Linked to ${linkModel}`}><Icon name="link" size={11}/></span>
                    )}
                  </div>
                  <div className="cat-tree-row__actions">
                    <button className="iconbtn" title="Add subcategory"
                      onClick={(e) => { e.stopPropagation(); startNew(c.id); }}>
                      <Icon name="plus" size={13}/>
                    </button>
                    <button className="iconbtn cat-tree-row__del" title="Delete category"
                      onClick={(e) => { e.stopPropagation(); requestDelete(c); }}>
                      <Icon name="trash" size={13}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Editor ── */}
        <div className="info-card cat-mgr__editor">
          {!draft ? (
            <div className="cat-mgr__blank">
              <div className="cat-mgr__blank-icon"><Icon name="folder" size={26}/></div>
              <div className="cat-mgr__blank-title">Select a category</div>
              <div className="cat-mgr__blank-sub">Pick one on the left to edit it, or create a new category.</div>
              <Btn size="sm" variant="secondary" icon="plus" onClick={() => startNew(null)}>New category</Btn>
            </div>
          ) : (
            <>
              <div className="info-card__head cat-mgr__ehead">
                <div style={{ minWidth: 0 }}>
                  {!isNew && draft.parentId && (
                    <div className="cat-mgr__crumb">{window.categoryById(cats, draft.parentId)?.name || ''} <span>/</span></div>
                  )}
                  <div className="info-card__title">{isNew ? 'New category' : draft.name || 'Category'}</div>
                </div>
                {linked
                  ? <Badge tone="info">Linked</Badge>
                  : <Badge tone="neutral">Defined here</Badge>}
              </div>
              <div className="info-card__body">
                <Field label="Category name" required>
                  <Input value={draft.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Accessories"/>
                </Field>
                <Field label="Category">
                  <Select value={draft.parentId || ''} onChange={(e) => upd({ parentId: e.target.value || null })}>
                    {parentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>

                <Field label="Where attributes come from">
                  <div className="cat-src">
                    <button type="button" className={`cat-src__opt ${!linked ? 'is-on' : ''}`} onClick={() => setLinkSource(false)}>
                      <span className="cat-src__radio"/>
                      <span className="cat-src__icon"><Icon name="edit" size={15}/></span>
                      <span className="cat-src__body">
                        <span className="cat-src__title">Defined here</span>
                        <span className="cat-src__hint">Set attributes on this category</span>
                      </span>
                    </button>
                    <button type="button" className={`cat-src__opt ${linked ? 'is-on' : ''}`} onClick={() => setLinkSource(true)}>
                      <span className="cat-src__radio"/>
                      <span className="cat-src__icon"><Icon name="link" size={15}/></span>
                      <span className="cat-src__body">
                        <span className="cat-src__title">Linked</span>
                        <span className="cat-src__hint">From a linked target</span>
                      </span>
                    </button>
                  </div>
                </Field>
                {linked && (
                  <div className="cat-link-panel">
                    <div className="cat-link-panel__head">
                      <Icon name="link" size={13}/>
                      <span>Linked to</span>
                    </div>
                    <div className="cat-link-panel__path">
                      <Select value={draft.linkTargetType} onChange={(e) => setLinkTargetType(e.target.value)}
                        title="Which entity manages the attributes" disabled={window.CATEGORY_LINK_TARGETS.length === 1}>
                        {window.CATEGORY_LINK_TARGETS.map((t) => <option key={t.type} value={t.type}>{t.source}</option>)}
                      </Select>
                      <span className="cat-link-panel__sep">›</span>
                      <Select value={draft.linkTargetId || ''} onChange={(e) => upd({ linkTargetId: e.target.value })}
                        title={`Which ${linkDef ? linkDef.label.toLowerCase() : 'item'}`}>
                        {!draft.linkTargetId && <option value="">Select…</option>}
                        {linkOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    </div>
                    <div className="cat-link-panel__note">
                      {draft.linkTargetId
                        ? <>Attributes come from <strong>{window.linkTargetLabel(draft)}</strong> and stay in sync — read-only here.</>
                        : <>Pick which {linkDef ? linkDef.label.toLowerCase() : 'item'} manages this category’s attributes.</>}
                    </div>
                  </div>
                )}

                <div className="cat-attr-head">
                  <div>
                    <div className="prod-section-sublabel" style={{ marginBottom: 2 }}>Attributes</div>
                    <div className="prod-section-hint">
                      {linked ? 'Come from the linked target — read-only here.' : 'Every attribute products here may use. Products choose from these; they cannot add new ones.'}
                    </div>
                  </div>
                  {!linked && <Btn size="sm" variant="ghost" icon="plus" onClick={addAttr}>Add attribute</Btn>}
                </div>

                {linked ? (
                  derivedAttrs.length === 0 ? (
                    <div className="prod-empty">{draft.linkTargetId ? 'The linked target has no multi-value attributes.' : 'Pick a linked target to load its attributes.'}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {derivedAttrs.map((a) => (
                        <div key={a.key} className="prod-legacy-row" style={{ borderStyle: 'solid' }}>
                          <span className="prod-legacy-name">{a.label}</span>
                          <span className="prod-legacy-vals">{a.values.join(' · ')}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  (draft.attributeOptions || []).length === 0 ? (
                    <div className="prod-empty">No attributes yet. Products here sell as a single SKU. Add an attribute to offer variants.</div>
                  ) : (
                    (draft.attributeOptions || []).map((a) => (
                      <AttrEditor key={a.key} attr={a}
                        onRename={(label) => renameAttr(a.key, label)}
                        onRemove={() => setDelAttrTarget(a)}
                        onAddValue={(v) => addValue(a.key, v)}
                        onRenameValue={(i, v) => renameValue(a.key, i, v)}
                        onRemoveValue={(i) => removeValue(a.key, i)}/>
                    ))
                  )
                )}
              </div>
              <div className="cat-mgr__foot">
                <Btn size="md" variant="primary" icon="check" onClick={save} disabled={!canSave}>{isNew ? 'Create category' : 'Save changes'}</Btn>
              </div>
            </>
          )}
        </div>
      </div>
      {_delModal(delTarget, () => setDelTarget(null), confirmDelete)}
      {impactTarget && (() => {
        const totalDropped = impactTarget.impact.reduce((n, a) => n + a.dropped.length, 0);
        const totalArchived = impactTarget.impact.reduce((n, a) => n + a.archived.length, 0);
        return (
          <window.Modal
            open={true}
            onClose={() => setImpactTarget(null)}
            title="Apply attribute changes?"
            width={520}
            footer={
              <>
                <Btn variant="secondary" onClick={() => setImpactTarget(null)}>Cancel</Btn>
                <Btn variant="primary" icon="check" onClick={() => { const t = impactTarget; setImpactTarget(null); commitSave(t.saved, t.impact); }}>Apply changes</Btn>
              </>
            }
          >
            <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              This attribute change affects <strong style={{ color: 'var(--color-text-primary)' }}>{impactTarget.impact.length} live product{impactTarget.impact.length === 1 ? '' : 's'}</strong>. Their SKUs will update automatically when you save.
            </div>
            <div className="cat-impact-list">
              {impactTarget.impact.map((a) => (
                <div key={a.original.id} className="cat-impact-row">
                  <div className="cat-impact-row__name">{a.original.name}</div>
                  <div className="cat-impact-row__counts">
                    {a.dropped.length > 0 && <span className="cat-impact-tag cat-impact-tag--drop">{a.dropped.length} SKU{a.dropped.length === 1 ? '' : 's'} removed</span>}
                    {a.archived.length > 0 && <span className="cat-impact-tag cat-impact-tag--arch">{a.archived.length} archived for past orders</span>}
                    {a.dropped.length === 0 && a.archived.length === 0 && <span className="cat-impact-tag">options updated</span>}
                  </div>
                </div>
              ))}
            </div>
            {(totalArchived > 0) && (
              <div className="notice" style={{ marginTop: 14, background: 'var(--color-bg-3)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                <Icon name="info" size={14}/>
                <div>SKUs referenced by existing orders aren’t deleted — they’re kept read-only (“no longer sold · kept for past orders”).</div>
              </div>
            )}
          </window.Modal>
        );
      })()}
      {delAttrTarget && (
        <window.Modal
          open={true}
          onClose={() => setDelAttrTarget(null)}
          title="Remove attribute?"
          width={460}
          footer={
            <>
              <Btn variant="secondary" onClick={() => setDelAttrTarget(null)}>Cancel</Btn>
              <Btn variant="danger" icon="trash" onClick={confirmRemoveAttr}>Remove attribute</Btn>
            </>
          }
        >
          <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Remove <strong style={{ color: 'var(--color-text-primary)' }}>{delAttrTarget.label || 'this attribute'}</strong>
            {delAttrTarget.values && delAttrTarget.values.length > 0 && <> and its {delAttrTarget.values.length} value{delAttrTarget.values.length === 1 ? '' : 's'} ({delAttrTarget.values.join(', ')})</>}
            ? Products in this category will no longer be able to offer it.
          </div>
          <div className="notice" style={{ marginTop: 14, background: 'var(--color-warning-50)', borderColor: 'oklch(70% 0.14 80 / 0.3)', color: 'var(--color-warning-700)' }}>
            <Icon name="alert" size={14}/>
            <div>The change applies when you save this category.</div>
          </div>
        </window.Modal>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────
const categoryStyles = `
.cat-mgr { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 880px) { .cat-mgr { grid-template-columns: 1fr; } }
.cat-mgr__list { padding: 0; overflow: hidden; position: sticky; top: 0; }
.cat-mgr__list-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 12px 11px 16px; font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); border-bottom: 1px solid var(--color-border-subtle); }
.cat-mgr__list-new { display: inline-flex; align-items: center; gap: 4px; font: 600 12px inherit; color: var(--color-primary-700); background: transparent; border: 0; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
.cat-mgr__list-new:hover { background: var(--color-primary-50); }
.cat-tree-rows { padding: 6px; display: flex; flex-direction: column; gap: 1px; }
.cat-tree-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.cat-tree-row:hover { background: var(--color-bg-3); }
.cat-tree-row.is-on { background: var(--color-primary-50); }
.cat-tree-row__main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.cat-tree-row__caret { display: grid; place-items: center; width: 18px; height: 18px; flex: none; border: 0; background: transparent; border-radius: 4px; color: var(--color-text-tertiary); cursor: pointer; padding: 0; }
.cat-tree-row__caret:hover { background: var(--color-bg-2); color: var(--color-text-primary); }
.cat-tree-row__caret--spacer { cursor: default; }
.cat-tree-row__caret--spacer:hover { background: transparent; }
.cat-tree-row__name { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-tree-row__link { display: inline-grid; place-items: center; color: var(--color-info-700); flex: none; opacity: 0.8; }
.cat-tree-row__actions { display: flex; gap: 2px; flex: none; opacity: 0; margin-left: 4px; }
.cat-tree-row:hover .cat-tree-row__actions, .cat-tree-row.is-on .cat-tree-row__actions { opacity: 1; }
.cat-tree-row__del:hover { color: var(--color-error-700); background: var(--color-error-50, oklch(96% 0.02 30)); }
.cat-mgr__ehead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.cat-mgr__crumb { font-size: 11.5px; color: var(--color-text-tertiary); margin-bottom: 2px; }
.cat-mgr__crumb span { opacity: 0.6; }
.cat-mgr__blank { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 64px 24px; min-height: 320px; }
.cat-mgr__blank-icon { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; background: var(--color-bg-3); color: var(--color-text-tertiary); margin-bottom: 4px; }
.cat-mgr__blank-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.cat-mgr__blank-sub { font-size: 12.5px; color: var(--color-text-tertiary); max-width: 280px; line-height: 1.5; margin-bottom: 10px; }
.cat-src { display: flex; flex-wrap: wrap; gap: 10px; }
.cat-link-panel { border: 1px solid var(--color-border-subtle); background: var(--color-bg-3); border-radius: 10px; padding: 12px 14px; margin: 12px 0 14px; }
.cat-link-panel__head { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 10px; }
.cat-link-panel__path { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.cat-link-panel__path > * { flex: 1 1 130px; min-width: 0; }
.cat-link-panel__path select:disabled { opacity: 1; color: var(--color-text-secondary); background: var(--color-bg-3); cursor: default; }
.cat-link-panel__sep { flex: 0 0 auto; font-size: 15px; color: var(--color-text-tertiary); line-height: 1; }
.cat-link-panel__note { font-size: 11.5px; color: var(--color-text-tertiary); line-height: 1.5; }
.cat-link-panel__note strong { color: var(--color-text-secondary); font-weight: 600; }
.cat-src__opt { flex: 1 1 160px; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 11px 12px; border: 1px solid var(--color-border-default); border-radius: 10px; background: var(--color-bg-2); cursor: pointer; text-align: left; font-family: inherit; transition: all var(--duration-fast); }
.cat-src__opt:hover { border-color: var(--color-border-strong); }
.cat-src__opt.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.cat-src__radio { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid var(--color-border-strong); flex: none; transition: all var(--duration-fast); }
.cat-src__opt.is-on .cat-src__radio { border-color: var(--color-primary-700); border-width: 5px; }
.cat-src__icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--color-bg-3); color: var(--color-text-secondary); flex: none; }
.cat-src__opt.is-on .cat-src__icon { background: var(--color-primary-100, var(--color-primary-50)); color: var(--color-primary-700); }
.cat-src__body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cat-src__title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; }
.cat-src__hint { font-size: 11px; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-mgr__editor { padding: 0; display: flex; flex-direction: column; min-width: 0; overflow: visible; }
.cat-mgr__editor > .info-card__head { border-top-left-radius: inherit; border-top-right-radius: inherit; }
.cat-mgr__editor .info-card__body { flex: 1; }
.cat-mgr__foot { position: sticky; bottom: 0; z-index: 2; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--color-border-subtle); background: var(--color-bg-2); border-bottom-left-radius: inherit; border-bottom-right-radius: inherit; box-shadow: 0 -6px 12px -8px oklch(20% 0.02 262 / 0.12); }
.cat-attr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin: 18px 0 10px; }

.prod-empty { padding: 18px; text-align: center; color: var(--color-text-tertiary); border: 1.5px dashed var(--color-border-default); border-radius: 10px; font-size: 12.5px; background: var(--color-bg-3); margin-bottom: 10px; }
.prod-section-sublabel { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.prod-section-hint { font-size: 12px; color: var(--color-text-tertiary); margin-top: 3px; line-height: 1.5; max-width: 520px; }
.prod-legacy-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed var(--color-border-default); border-radius: 8px; background: var(--color-bg-3); }
.prod-legacy-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-right: 8px; }
.prod-legacy-vals { font-size: 12px; color: var(--color-text-tertiary); }

.prod-axis-editor { background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.prod-axis-editor__head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.prod-axis-editor__name { flex: 1; border: 1px solid transparent; background: transparent; padding: 6px 8px; border-radius: 6px; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); outline: 0; }
.prod-axis-editor__name:hover { background: var(--color-bg-2); }
.prod-axis-editor__name:focus { background: var(--color-bg-2); border-color: var(--color-primary-700); }
.prod-axis-editor__remove { width: 28px; height: 28px; border-radius: 6px; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--color-text-tertiary); }
.prod-axis-editor__remove:hover { background: var(--color-error-50, oklch(96% 0.02 30)); color: var(--color-error-700); }
.prod-axis-editor__values { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.prod-axis-chip { display: inline-flex; align-items: center; gap: 2px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 8px; padding: 3px 4px 3px 10px; }
.prod-axis-chip input { border: 0; background: transparent; outline: 0; font: inherit; font-size: 12.5px; color: var(--color-text-primary); padding: 3px 0; width: 110px; }
.prod-axis-chip__x { width: 22px; height: 22px; border-radius: 6px; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--color-text-tertiary); }
.prod-axis-chip__x:hover { background: var(--color-bg-3); color: var(--color-error-700); }
.prod-axis-add input { border: 1px dashed var(--color-border-default); background: transparent; border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 12.5px; color: var(--color-text-secondary); outline: 0; width: 140px; }
.prod-axis-add input:focus { border-style: solid; border-color: var(--color-primary-700); color: var(--color-text-primary); }

.cat-impact-list { margin-top: 14px; border: 1px solid var(--color-border-subtle); border-radius: 10px; overflow: hidden; max-height: 260px; overflow-y: auto; }
.cat-impact-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--color-border-subtle); }
.cat-impact-row:last-child { border-bottom: 0; }
.cat-impact-row__name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-impact-row__counts { display: flex; flex-wrap: wrap; gap: 6px; flex: none; justify-content: flex-end; }
.cat-impact-tag { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 999px; background: var(--color-bg-3); border: 1px solid var(--color-border-default); color: var(--color-text-secondary); white-space: nowrap; }
.cat-impact-tag--drop { background: var(--color-error-50, oklch(96% 0.02 30)); border-color: oklch(70% 0.14 28 / 0.3); color: var(--color-error-700); }
.cat-impact-tag--arch { background: var(--color-warning-50); border-color: oklch(70% 0.14 80 / 0.3); color: var(--color-warning-700); }
`;
if (typeof document !== 'undefined' && !document.getElementById('category-styles')) {
  const s = document.createElement('style');
  s.id = 'category-styles';
  s.textContent = categoryStyles;
  document.head.appendChild(s);
}

// ── Delete modal (confirm if deletable, otherwise explain why not) ──
const _delModal = (delTarget, onClose, onConfirm) => {
  if (!delTarget) return null;
  const { cat, pc, childCount, can } = delTarget;
  const B = window.Btn;
  return (
    <window.Modal
      open={true}
      onClose={onClose}
      title={can ? 'Delete category?' : 'Cannot delete category'}
      width={460}
      footer={can ? (
        <>
          <B variant="secondary" onClick={onClose}>Cancel</B>
          <B variant="danger" icon="trash" onClick={onConfirm}>Delete category</B>
        </>
      ) : (
        <B variant="primary" onClick={onClose}>Got it</B>
      )}
    >
      {can ? (
        <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Delete <strong style={{ color: 'var(--color-text-primary)' }}>{cat.name}</strong>? This can’t be undone.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{cat.name}</strong> can’t be deleted while it’s in use.
          </div>
          <div className="notice" style={{ marginTop: 14, background: 'var(--color-warning-50)', borderColor: 'oklch(70% 0.14 80 / 0.3)', color: 'var(--color-warning-700)' }}>
            <Icon name="alert" size={14}/>
            <div>
              {pc > 0 && <div>{pc} product{pc === 1 ? '' : 's'} still belong to this category.</div>}
              {childCount > 0 && <div>{childCount} subcategor{childCount === 1 ? 'y' : 'ies'} sit under it.</div>}
              <div style={{ marginTop: 6 }}>Reassign or remove them first, then try again.</div>
            </div>
          </div>
        </>
      )}
    </window.Modal>
  );
};

Object.assign(window, { CategoryManager });
