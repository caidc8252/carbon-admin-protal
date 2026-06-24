/* global React, ReactDOM, Btn, Input, Icon, Badge, ModelTile, DEVICE_MODELS,
   productEffectiveStatus, CATEGORY_BADGE, formatPriceRange, useToast, CartTrigger,
   variantStockState,
   SearchBar, SearchInput, SearchSelect, SearchActions, ActiveFilters, FilterChip, useSearchBar */
const { useState, useMemo, useRef, useEffect } = React;

// ─── Shop browse (Products page for sales) ──────────────────
// Top filter bar + responsive card grid.
// Filters are deferred — user edits pending values and clicks Search to apply.
// Only LISTED products show. 0-axis products get a Quick Add button.

const CATEGORY_OPTIONS = [
  { id: 'all',    label: 'All categories' },
  { id: 'sample', label: 'Sample devices' },
  { id: 'prod',   label: 'Production devices' },
  { id: 'other',  label: 'Other' },
];

// ─── Spec picker popup (Android PopupWindow style, anchored to trigger) ───
const SpecPickerModal = ({ product, action, anchorRect, onClose, onConfirm }) => {
  const specs = product.specs || [];
  const intModes = (product.deviceVariant === 'SAMPLE' && Array.isArray(product.integrationModes) && product.integrationModes.length > 0)
    ? product.integrationModes
    : [];
  const [combo, setCombo] = useState(() => {
    const v0 = product.variants[0];
    const c = {};
    specs.forEach((a) => { c[a.id] = v0 && v0.combination ? v0.combination[a.id] : a.values[0]?.id; });
    return c;
  });
  const [integrationMode, setIntegrationMode] = useState(intModes[0] || null);
  // Quantity — stock-aware. Resets to 1 whenever the selected variant changes,
  // and is clamped to the variant's stock when finite. `null` stock = unlimited.
  const [qty, setQty] = useState(1);

  // Find the variant that matches the current combo selection.
  const variant = useMemo(() => {
    if (specs.length === 0) return product.variants[0];
    return product.variants.find((v) =>
      specs.every((a) => v.combination && v.combination[a.id] === combo[a.id])
    ) || null;
  }, [combo, product, specs]);

  // Stock cap (Infinity = unlimited). Used to clamp the qty input.
  const maxQty = variant && variant.stock != null ? variant.stock : Infinity;
  // Reset qty to 1 when the variant changes so a stale qty from a more-stocked
  // sibling can't survive across the switch.
  useEffect(() => { setQty(1); }, [variant?.id]);
  // Defensive clamp in case stock was edited under us.
  useEffect(() => {
    if (qty > maxQty) setQty(Math.max(1, maxQty));
  }, [maxQty, qty]);

  const canConfirm = !!variant && variant.status !== 'INACTIVE' && variantStockState(variant) !== 'OUT' && qty >= 1 && qty <= maxQty;
  const stockState = variant ? variantStockState(variant) : null;

  // Resolve which variant a given (axisId, valueId) combination would land on,
  // holding all OTHER axes at the current selection. Used to label chips with
  // stock state.
  const variantForValue = (axisId, valueId) =>
    product.variants.find((v) =>
      v.combination && v.combination[axisId] === valueId &&
      specs.every((a) => a.id === axisId || v.combination[a.id] === combo[a.id])
    ) || null;

  const valueAvailable = (axisId, valueId) =>
    product.variants.some((v) =>
      v.combination && v.combination[axisId] === valueId &&
      specs.every((a) => a.id === axisId || v.combination[a.id] === combo[a.id])
    );

  // ── Anchored positioning (same behaviour as the cart popups) ──
  const POP_WIDTH = 340;
  const GAP = 6;
  const popRef = useRef(null);
  const [pos, setPos] = useState(() => {
    const r = anchorRect || { top: 80, left: 80, right: 120, bottom: 110, width: 40, height: 30 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Horizontally center the popup on the anchor's center, clamped to viewport.
    const left = Math.max(8, Math.min(vw - POP_WIDTH - 8, r.left + r.width / 2 - POP_WIDTH / 2));
    const estHeight = 300;
    const showAbove = (r.bottom + GAP + estHeight) > vh && (r.top - GAP - estHeight) > 8;
    const top = showAbove ? Math.max(8, r.top - GAP - estHeight) : r.bottom + GAP;
    const arrowLeft = Math.max(12, Math.min(POP_WIDTH - 24, r.left + r.width / 2 - left));
    return { top, left, arrowLeft, showAbove };
  });

  useEffect(() => {
    if (!popRef.current || !anchorRect) return;
    const h = popRef.current.offsetHeight;
    const r = anchorRect;
    const vh = window.innerHeight;
    if ((r.bottom + GAP + h) > vh && (r.top - GAP - h) > 8) {
      setPos((p) => ({ ...p, top: Math.max(8, r.top - GAP - h), showAbove: true }));
    }
  }, [anchorRect]);

  useEffect(() => {
    const onDocClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div ref={popRef}
      className={`cart-pop ${pos.showAbove ? 'cart-pop--above' : ''}`}
      style={{ top: pos.top, left: pos.left, width: POP_WIDTH }}
      role="dialog" aria-modal="false">
      <span className="cart-pop__arrow" style={{ left: pos.arrowLeft }}/>
      <div className="cart-pop__head">
        <div className="spec-pop__title-wrap">
          <div className="cart-pop__title">{product.name}</div>
          <div className="spec-pop__price num">
            {variant ? `$${variant.price.toFixed(2)}` : formatPriceRange(product)}
          </div>
        </div>
        <button type="button" className="cart-pop__close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={13}/>
        </button>
      </div>
      <div className="cart-pop__body">
        {intModes.length > 0 && (
          <section className="cart-pop__section">
            <div className="cart-pop__lbl">Integration mode</div>
            <div className="cart-pop__chips">
              {intModes.map((mode) => (
                <button key={mode} type="button"
                  className={`cart-pop__chip ${integrationMode === mode ? 'is-active' : ''}`}
                  onClick={() => setIntegrationMode(mode)}>
                  {mode}
                </button>
              ))}
            </div>
          </section>
        )}
        {specs.map((axis) => (
          <section key={axis.id} className="cart-pop__section">
            <div className="cart-pop__lbl">{axis.name}</div>
            <div className="cart-pop__chips">
              {axis.values.map((val) => {
                const isActive = combo[axis.id] === val.id;
                const ok = valueAvailable(axis.id, val.id);
                const vForVal = ok ? variantForValue(axis.id, val.id) : null;
                const ss = vForVal ? variantStockState(vForVal) : null;
                const isOut = ss === 'OUT';
                const isLow = ss === 'LOW';
                return (
                  <button key={val.id} type="button"
                    disabled={!ok}
                    className={`cart-pop__chip ${isActive ? 'is-active' : ''} ${!ok ? 'is-disabled' : ''} ${isOut ? 'is-out' : ''} ${isLow ? 'is-low' : ''}`}
                    onClick={() => { if (ok) setCombo((c) => ({ ...c, [axis.id]: val.id })); }}>
                    {val.label}
                    {isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--out">Sold out</span>}
                    {isLow && !isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--low" aria-label={`Only ${vForVal.stock != null ? vForVal.stock : ''} left`.trim()}>{vForVal.stock != null ? `${vForVal.stock} left` : 'Limited'}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {!variant && (
          <div className="spec-pop__warn">
            <Icon name="info" size={12}/> This combination isn’t available.
          </div>
        )}
        {variant && stockState === 'OUT' && (
          <div className="spec-pop__warn spec-pop__warn--err">
            <Icon name="info" size={12}/> This option is sold out.
          </div>
        )}
        {variant && stockState === 'LOW' && (
          <div className="spec-pop__warn">
            <Icon name="info" size={12}/> Only {variant.stock != null ? variant.stock : 'a few'} left{variant.stockNote ? ` — ${variant.stockNote}` : ''}.
          </div>
        )}
        {variant && stockState !== 'OUT' && (
          <section className="cart-pop__section spec-pop__qty-section">
            <div className="cart-pop__lbl">Quantity</div>
            <div className="spec-pop__qty-row">
              <div className="spec-pop__stepper" role="group" aria-label="Quantity">
                <button type="button" className="spec-pop__stepper-btn"
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Icon name="minus" size={11}/>
                </button>
                <input type="number" className="spec-pop__stepper-input num"
                  value={qty}
                  min={1}
                  max={maxQty === Infinity ? undefined : maxQty}
                  aria-label="Quantity"
                  onChange={(e) => {
                    const raw = parseInt(e.target.value || '1', 10);
                    if (Number.isNaN(raw)) { setQty(1); return; }
                    setQty(Math.min(maxQty, Math.max(1, raw)));
                  }}/>
                <button type="button" className="spec-pop__stepper-btn"
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                  title={qty >= maxQty && maxQty !== Infinity ? `Only ${maxQty} in stock` : undefined}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
                  <Icon name="plus" size={11}/>
                </button>
              </div>
              <div className="spec-pop__qty-meta num">
                {maxQty === Infinity
                  ? <span className="spec-pop__qty-cap">In stock</span>
                  : <span className={`spec-pop__qty-cap ${qty >= maxQty ? 'is-max' : ''}`}>
                      {qty >= maxQty ? `Max ${maxQty}` : `${maxQty} in stock`}
                    </span>}
                {variant && (
                  <span className="spec-pop__qty-total">
                    · ${(variant.price * qty).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
      <div className="cart-pop__foot">
        <button type="button" className="cart-pop__btn cart-pop__btn--ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cart-pop__btn cart-pop__btn--primary" disabled={!canConfirm}
          onClick={() => canConfirm && onConfirm(variant, { integrationMode, qty })}>
          {stockState === 'OUT' ? 'Sold out' : (action === 'order' ? `Order${qty > 1 ? ` · ${qty}` : ''}` : `Add to cart${qty > 1 ? ` · ${qty}` : ''}`)}
        </button>
      </div>
    </div>,
    document.body
  );
};

const ProductsBrowse = ({ products, onOpen, onQuickAdd, cartQty = 0, cartSubtotal = 0, onOpenCart, onOpenOrders, onCheckout, onOrderNow }) => {
  // Shared pending → applied search pattern (R-01)
  const {
    draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters: hasFilter
  } = useSearchBar({ q: '', category: 'all', modelId: 'all' });
  const toast = useToast();

  // Cart shows in the page title by default; once the filter bar pins to the top
  // (header scrolled out of view) the cart appears in the filter row instead.
  const headRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = headRef.current;
    if (!el || !onOpenCart) return undefined;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [onOpenCart]);

  // Paginate the grid — show a page at a time, "Load more" reveals the next batch.
  const INITIAL_COUNT = 20;
  const LOAD_STEP = 10;
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((n) => n + LOAD_STEP);
      setLoadingMore(false);
    }, 1500);
  };

  // Only show LISTED products (storefront semantics)
  const listed = useMemo(
    () => products.filter((p) => productEffectiveStatus(p) === 'LISTED'),
    [products]
  );

  const filtered = useMemo(() => {
    let rows = listed;
    if (applied.q.trim()) {
      const s = applied.q.toLowerCase();
      // Match name + description only (SKU is intentionally NOT searched here)
      rows = rows.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        (p.desc || '').toLowerCase().includes(s)
      );
    }
    if (applied.category === 'sample')      rows = rows.filter((p) => p.deviceVariant === 'SAMPLE');
    else if (applied.category === 'prod')   rows = rows.filter((p) => p.deviceVariant === 'PRODUCTION');
    else if (applied.category === 'other')  rows = rows.filter((p) => p.type === 'OTHER');
    if (applied.modelId !== 'all')          rows = rows.filter((p) => p.deviceModelId === applied.modelId);
    return rows;
  }, [listed, applied]);

  // Reset pagination whenever the applied filters change.
  useEffect(() => { setVisibleCount(INITIAL_COUNT); }, [applied]);

  const visibleRows = filtered.slice(0, visibleCount);

  // Models that appear in current listing (for the model filter)
  const availableModels = useMemo(() => {
    const ids = new Set(listed.map((p) => p.deviceModelId).filter(Boolean));
    return (window.DEVICE_MODELS || []).filter((m) => ids.has(m.id));
  }, [listed]);

  const handleQuickAdd = (product) => {
    if (product.specs.length > 0) {
      onOpen(product.id);  // multi-variant → open PDP
      return;
    }
    onQuickAdd(product, product.variants[0], 1);
    toast({ kind: 'success', title: 'Added to cart', msg: product.name });
  };

  // ─── Picker modal + fly-to-cart animation ────────────────────
  const [picker, setPicker] = useState(null); // { product, action: 'add' | 'order' }

  const flyToCart = (srcEl, imgSrc) => {
    if (!srcEl) return;
    // There can be TWO .cart-trigger nodes in the DOM at once: one in the
    // page header (visible while scrolled to the top) and one in the sticky
    // filter bar (visible after the header scrolls out). Pick whichever is
    // actually on-screen so the fly path lands at the right target after
    // the user scrolls.
    const carts = Array.from(document.querySelectorAll('.cart-trigger'));
    if (carts.length === 0) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const isOnScreen = (r) => r.bottom > 0 && r.top < vh && r.width > 0 && r.height > 0;
    const onScreen = carts.filter((el) => isOnScreen(el.getBoundingClientRect()));
    // Prefer on-screen targets; if both header + sticky are on-screen during
    // the brief transition, the sticky bar comes later in DOM order and wins.
    const cart = onScreen.length > 0 ? onScreen[onScreen.length - 1] : carts[carts.length - 1];
    const start = srcEl.getBoundingClientRect();
    const end = cart.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'shop-fly';
    if (imgSrc) {
      const im = document.createElement('img');
      im.src = imgSrc;
      fly.appendChild(im);
    } else {
      const dot = document.createElement('span');
      dot.textContent = '+1';
      fly.appendChild(dot);
    }
    const sx = start.left + start.width / 2;
    const sy = start.top + start.height / 2;
    fly.style.left = (sx - 24) + 'px';
    fly.style.top = (sy - 24) + 'px';
    document.body.appendChild(fly);
    // force reflow then animate
    void fly.offsetWidth;
    const dx = (end.left + end.width / 2) - sx;
    const dy = (end.top + end.height / 2) - sy;
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
    fly.style.opacity = '0.2';
    setTimeout(() => {
      fly.remove();
      cart.classList.add('cart-trigger--bump');
      setTimeout(() => cart.classList.remove('cart-trigger--bump'), 420);
    }, 650);
  };

  const doAdd = (product, variant, srcEl, silent = false, opts = {}, qty = 1) => {
    flyToCart(srcEl, product.baseImage);
    onQuickAdd(product, variant, qty, opts);
    if (!silent) toast({ kind: 'success', title: 'Added to cart', msg: qty > 1 ? `${product.name} × ${qty}` : product.name });
  };

  const needsPicker = (product) => {
    if (product.specs && product.specs.length > 0) return true;
    if (product.deviceVariant === 'SAMPLE' && Array.isArray(product.integrationModes) && product.integrationModes.length > 1) return true;
    return false;
  };

  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };

  const handleAddRequest = (product, srcEl) => {
    if (needsPicker(product)) {
      setPicker({ product, action: 'add', srcEl, anchorRect: rectOf(srcEl) });
      return;
    }
    doAdd(product, product.variants[0], srcEl);
  };

  const handleBuyNow = (product, srcEl) => {
    if (needsPicker(product)) {
      setPicker({ product, action: 'order', srcEl, anchorRect: rectOf(srcEl) });
      return;
    }
    if (onOrderNow) onOrderNow(product, product.variants[0], 1);
    else if (onCheckout) { onQuickAdd(product, product.variants[0], 1); onCheckout(); }
  };

  const onPickerConfirm = (variant, opts = {}) => {
    const { product, action, srcEl } = picker;
    const qty = Math.max(1, opts.qty || 1);
    // Strip qty from opts so it doesn't leak into the cart-line `opts` object
    // (qty is a top-level arg downstream, not a per-line option).
    const lineOpts = { ...opts };
    delete lineOpts.qty;
    if (action === 'order') {
      if (onOrderNow) { setPicker(null); onOrderNow(product, variant, qty, lineOpts); return; }
      // Fallback if no onOrderNow wired
      doAdd(product, variant, srcEl, true, lineOpts, qty);
      setPicker(null);
      if (onCheckout) setTimeout(() => onCheckout(), 120);
      return;
    }
    doAdd(product, variant, srcEl, false, lineOpts, qty);
    setPicker(null);
  };

  return (
    <div className="page">
      <div className="shop-head" ref={headRef}>
        <div>
          <h1 className="page__title">Goods</h1>
          <p className="page__sub">Browse goods and add them to your cart to place a customer order.</p>
        </div>
        {onOpenCart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenOrders && <Btn variant="secondary" size="md" icon="file" onClick={onOpenOrders}>Orders</Btn>}
            <CartTrigger totalQty={cartQty} subtotal={cartSubtotal} onOpen={onOpenCart} />
          </div>
        )}
      </div>

      <div className="shop-filters">
        <SearchBar onSearch={runSearch} sticky={false}>
          <SearchInput
            value={draft.q}
            onChange={(v) => setDraft({ q: v })}
            onSearch={runSearch}
            placeholder="Search by name or description…"/>
          <SearchSelect
            value={draft.category}
            onChange={(v) => setDraft({ category: v })}
            options={CATEGORY_OPTIONS.map(c => ({ value: c.id, label: c.label }))}/>
          {onOpenCart && stuck ? (
            <SearchActions>
              {onOpenOrders ? <Btn variant="secondary" size="md" icon="file" onClick={onOpenOrders}>Orders</Btn> : null}
              <CartTrigger totalQty={cartQty} subtotal={cartSubtotal} onOpen={onOpenCart} />
            </SearchActions>
          ) : null}
        </SearchBar>

        <ActiveFilters onClearAll={clearAll} hasFilters={hasFilter}>
          {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')}/> : null}
          {applied.category !== 'all' ? (
            <FilterChip
              label={`Category: ${(CATEGORY_OPTIONS.find(c => c.id === applied.category) || {}).label || applied.category}`}
              onRemove={() => clearOne('category', 'all')}/>
          ) : null}
          {applied.modelId !== 'all' ? <FilterChip label={`Model: ${applied.modelId}`} onRemove={() => clearOne('modelId', 'all')}/> : null}
        </ActiveFilters>
      </div>

      <div className="shop-result-bar">
        <div>
          Showing <strong>{visibleRows.length}</strong> goods
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty" style={{ padding: '60px 20px' }}>
          No goods match your filters.
          <div style={{ marginTop: 10 }}>
            <Btn size="sm" variant="ghost" onClick={clearAll}>Clear filters</Btn>
          </div>
        </div>
      ) : (
        <div className="shop-grid">
          {visibleRows.map((p) => {
            const cat = CATEGORY_BADGE(p);
            const model = (window.DEVICE_MODELS || []).find((m) => m.id === p.deviceModelId);
            const hasVariants = p.specs.length > 0;
            const img = p.baseImage || null;
            return (
              <article key={p.id} className={`shop-card shop-card--${p.type === 'DEVICE' ? (p.deviceVariant === 'SAMPLE' ? 'sample' : 'production') : 'other'}`} onClick={() => onOpen(p.id)}>
                <div className="shop-card__img">
                  {img && !/^data:image\/svg\+xml/.test(img) ? (
                    <img src={img} alt={p.name}/>
                  ) : (() => {
                    const cat = window.productObjectCat(p);
                    const gk = cat === 'device' ? 'device' : (window.OBJ_PRESET[cat]?.glyph || 'accessory');
                    const hue = cat === 'device' ? window.modelHue(model?.name || p.name) : (window.OBJ_PRESET[cat]?.hue ?? 250);
                    return (
                      <svg className="shop-card__glyph" viewBox="0 0 24 24" width="92" height="92"
                        fill="currentColor" aria-hidden="true" style={{ '--g-hue': hue }}>
                        {window.OBJ_GLYPH[gk] || window.OBJ_GLYPH.accessory}
                      </svg>
                    );
                  })()}
                </div>
                <div className="shop-card__body">
                  <div className="shop-card__name">{p.name}</div>
                  {p.sku && <div className="shop-card__sku">{p.sku}</div>}
                  <div className="shop-card__desc">{p.desc}</div>
                  <div className="shop-card__price-row">
                    <div className="shop-card__price num">{formatPriceRange(p)}</div>
                    {hasVariants && (
                      <div className="shop-card__opts">{p.variants.length} options</div>
                    )}
                  </div>
                  <div className="shop-card__cta">
                    <Btn variant="primary" size="sm"
                      onClick={(e) => { e.stopPropagation(); handleBuyNow(p, e.currentTarget); }}>
                      Order
                    </Btn>
                    <button type="button" className="shop-card__addbtn"
                      title={hasVariants ? 'Choose options & add to cart' : 'Add to cart'}
                      aria-label="Add to cart"
                      onClick={(e) => { e.stopPropagation(); handleAddRequest(p, e.currentTarget); }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/>
                        <circle cx="10" cy="21" r="1.2"/>
                        <circle cx="18" cy="21" r="1.2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="shop-loadmore">
          <Btn variant="secondary" size="md"
            disabled={loadingMore}
            onClick={loadMore}>
            {loadingMore ? <><span className="shop-loadmore__spinner"/> Loading…</> : 'Load more'}
          </Btn>
        </div>
      )}

      {picker && (
        <SpecPickerModal
          product={picker.product}
          action={picker.action}
          anchorRect={picker.anchorRect}
          onClose={() => setPicker(null)}
          onConfirm={onPickerConfirm}
        />
      )}
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────
const shopBrowseStyles = `
.page--wide { max-width: none; }
.shop-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-2); padding: var(--space-4) var(--space-6); background: var(--color-bg-2); border-bottom: 1px solid var(--color-border-subtle); }

.shop-filters { position: sticky; top: 0; z-index: 20; background: var(--color-bg-1); padding: var(--space-4) 0 12px; margin-bottom: 4px; }

.shop-result-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 14px; color: var(--color-text-tertiary); font-size: 12px; }
.shop-result-bar strong { color: var(--color-text-primary); font-weight: 600; }

.shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.shop-loadmore { display: flex; justify-content: center; padding: 24px 0 4px; }
.shop-loadmore__spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: shop-spin 0.7s linear infinite; vertical-align: -2px; margin-right: 2px; }
@keyframes shop-spin { to { transform: rotate(360deg); } }

.shop-card { display: flex; flex-direction: column; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all var(--duration-fast); box-shadow: var(--shadow-1); }
.shop-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-2); transform: translateY(-1px); }
.shop-card__img { position: relative; height: 150px; min-height: 0; background: var(--color-bg-2); display: grid; place-items: center; padding: 12px; border-bottom: 1px solid var(--color-border-subtle); overflow: hidden; }
.shop-card__img img { max-width: 100%; max-height: 100%; min-height: 0; object-fit: contain; }
/* Dark mode — muted surface so product cards read as quiet (clean plain panel, no tint). */
[data-theme="dark"] .shop-card__img { background: var(--color-bg-3); }
[data-theme="dark"] .spec-modal__thumb, [data-theme="dark"] .shop-fly img { background: var(--color-bg-3); }
.shop-card__placeholder { font-size: 64px; opacity: 0.55; }
.shop-card__glyph { width: 60%; height: auto; max-width: 96px; color: oklch(56% 0.13 var(--g-hue, 250)); filter: drop-shadow(0 3px 10px oklch(50% 0.10 var(--g-hue, 250) / 0.18)); }
[data-theme="dark"] .shop-card__glyph { color: oklch(72% 0.12 var(--g-hue, 250)); filter: none; }

.shop-card__corner { position: absolute; top: 14px; right: -36px; width: 130px; padding: 4px 0; transform: rotate(45deg); text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; box-shadow: 0 1px 3px oklch(0% 0 0 / 0.2); pointer-events: none; z-index: 2; }
.shop-card__corner--sample { background: oklch(58% 0.14 152); }

.shop-card__body { padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
.shop-card__name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.005em; line-height: 1.3; }
.shop-card__sku { font: 500 11px var(--font-family-mono); color: var(--color-text-tertiary); }
.shop-card__desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-top: 1px; min-height: 1.4em; }
.shop-card__price-row { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; margin-top: auto; padding-top: 10px; }
.shop-card__price { font-size: 16px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; }
.shop-card__opts { font-size: 12px; color: var(--color-text-tertiary); }
.shop-card__cta { margin-top: 8px; display: flex; gap: 6px; align-items: stretch; }
.shop-card__cta > .tds-btn { flex: 1; justify-content: center; }
.shop-card__addbtn { width: 32px; min-height: 28px; padding: 0; border-radius: 10px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); color: var(--color-text-primary); cursor: pointer; display: grid; place-items: center; flex: none; transition: all var(--duration-fast); }
.shop-card__addbtn:hover { background: var(--color-bg-3); border-color: var(--color-border-strong); color: var(--color-primary-700); }
.shop-card__addbtn:active { transform: scale(0.94); }

/* Fly-to-cart animation ──────────────────────────────────────── */
.shop-fly { position: fixed; width: 48px; height: 48px; border-radius: 50%; background: var(--color-primary-700); color: #fff; display: grid; place-items: center; box-shadow: 0 6px 18px oklch(0% 0 0 / 0.28); z-index: 9999; pointer-events: none; transition: transform 640ms cubic-bezier(0.5, -0.05, 0.6, 0.7), opacity 640ms ease; font-weight: 700; font-size: 14px; overflow: hidden; }
.shop-fly img { width: 100%; height: 100%; object-fit: contain; background: #fff; padding: 4px; box-sizing: border-box; border-radius: 50%; }
.cart-trigger--bump { animation: cartBump 420ms ease; }
@keyframes cartBump { 0% { transform: scale(1); } 25% { transform: scale(1.18); } 55% { transform: scale(0.94); } 100% { transform: scale(1); } }

/* Spec picker modal ────────────────────────────────────────── */
.spec-modal__backdrop { position: fixed; inset: 0; background: oklch(0% 0 0 / 0.42); z-index: 9100; display: grid; place-items: center; padding: 24px; animation: specModalFade 160ms ease; }
@keyframes specModalFade { from { opacity: 0; } to { opacity: 1; } }
.spec-modal { width: 100%; max-width: 460px; background: var(--color-bg-1); border-radius: 20px; box-shadow: 0 24px 60px oklch(0% 0 0 / 0.35); overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 48px); animation: specModalRise 200ms cubic-bezier(0.2, 0.7, 0.3, 1); }
@keyframes specModalRise { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
.spec-modal__head { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid var(--color-border-subtle); }
.spec-modal__thumb { width: 56px; height: 56px; border-radius: 12px; background: #fff; border: 1px solid var(--color-border-subtle); display: grid; place-items: center; padding: 4px; flex: none; overflow: hidden; }
.spec-modal__thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.spec-modal__thumb-ph { font-size: 28px; opacity: 0.55; }
.spec-modal__heading { flex: 1; min-width: 0; }
.spec-modal__title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; }
.spec-modal__price { font-size: 18px; font-weight: 600; color: var(--color-primary-700); margin-top: 2px; }
.spec-modal__close { width: 32px; height: 32px; border-radius: 10px; border: 0; background: transparent; color: var(--color-text-tertiary); cursor: pointer; display: grid; place-items: center; flex: none; }
.spec-modal__close:hover { background: var(--color-bg-3); color: var(--color-text-primary); }
.spec-modal__body { padding: 16px 18px 8px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.spec-modal__axis-name { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 8px; }
.spec-modal__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.spec-modal__chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); color: var(--color-text-primary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all var(--duration-fast); }
.spec-modal__chip:hover { border-color: var(--color-border-strong); }
.spec-modal__chip.is-active { background: var(--color-primary-700); border-color: var(--color-primary-700); color: #fff; }
.spec-modal__chip.is-disabled { opacity: 0.4; text-decoration: line-through; }
.spec-modal__warn { font-size: 12px; color: var(--color-warning-700); display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; background: var(--color-warning-50, oklch(96% 0.04 80)); border-radius: 6px; }
.spec-modal__foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px 16px; border-top: 1px solid var(--color-border-subtle); }

.spec-pop__title-wrap { flex: 1; min-width: 0; }
.spec-pop__price { font-size: 14px; font-weight: 600; color: var(--color-primary-700); margin-top: 2px; font-variant-numeric: tabular-nums; }
.spec-pop__warn { font-size: 12px; color: var(--color-warning-700); display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px; background: var(--color-warning-50, oklch(96% 0.04 80)); border-radius: 6px; }
.spec-pop__warn--err { color: var(--color-danger-700, oklch(48% 0.18 25)); background: var(--color-danger-50, oklch(96% 0.04 25)); }

/* Quantity stepper inside the spec picker ───────────────── */
.spec-pop__qty-section { padding-top: 4px; }
.spec-pop__qty-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.spec-pop__stepper { display: inline-flex; align-items: center; background: var(--color-bg-1); border: 1px solid var(--color-border-default); border-radius: 10px; padding: 2px; }
.spec-pop__stepper-btn { width: 26px; height: 26px; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; border-radius: 6px; color: var(--color-text-secondary); }
.spec-pop__stepper-btn:hover:not(:disabled) { background: var(--color-bg-3); color: var(--color-text-primary); }
.spec-pop__stepper-btn:active:not(:disabled) { transform: scale(0.92); }
.spec-pop__stepper-btn:disabled { color: var(--color-text-quaternary, var(--color-text-tertiary)); opacity: 0.45; cursor: not-allowed; }
.spec-pop__stepper-input { width: 42px; height: 26px; text-align: center; border: 0; background: transparent; font-size: 14px; font-weight: 500; color: var(--color-text-primary); font-variant-numeric: tabular-nums; -moz-appearance: textfield; }
.spec-pop__stepper-input::-webkit-inner-spin-button, .spec-pop__stepper-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.spec-pop__stepper-input:focus { outline: none; }
.spec-pop__qty-meta { font-size: 12px; color: var(--color-text-tertiary); display: inline-flex; align-items: baseline; gap: 4px; font-variant-numeric: tabular-nums; }
.spec-pop__qty-cap.is-max { color: var(--color-warning-700); font-weight: 500; }
.spec-pop__qty-total { color: var(--color-text-secondary); font-weight: 500; }

/* Stock state on chips ─────────────────────────────────────── */
.cart-pop__chip.is-out { background: var(--color-bg-3); color: var(--color-text-tertiary); border-color: var(--color-border-subtle); }
.cart-pop__chip.is-out .cart-pop__chip-lbl,
.cart-pop__chip.is-out > :first-child { text-decoration: line-through; }
.cart-pop__chip.is-out:hover { border-color: var(--color-border-subtle); }
.cart-pop__chip.is-out.is-active { background: var(--color-bg-3); color: var(--color-text-secondary); border-color: var(--color-border-strong); }
.cart-pop__chip-tag { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.4; }
.cart-pop__chip-tag--out { background: var(--color-bg-1); color: var(--color-text-tertiary); border: 1px solid var(--color-border-default); }
.cart-pop__chip-tag--low { background: var(--color-warning-50, oklch(96% 0.04 80)); color: var(--color-warning-700); }
.cart-pop__chip.is-active .cart-pop__chip-tag--low { background: oklch(100% 0 0 / 0.18); color: #fff; }
`;

if (typeof document !== 'undefined' && !document.getElementById('shop-browse-styles')) {
  const s = document.createElement('style');
  s.id = 'shop-browse-styles';
  s.textContent = shopBrowseStyles;
  document.head.appendChild(s);
}

window.ProductsBrowse = ProductsBrowse;
