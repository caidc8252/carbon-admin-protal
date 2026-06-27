/* global React, Btn, Icon, Badge, ModelTile, DEVICE_MODELS, useToast,
   CATEGORY_BADGE, resolveVariantLabel, variantStockState,
   productIntegrationModes */
// ─── Shop Cart ───────────────────────────────────────────────
// useCart() — persistent shopping cart hook (mock cloud-sync via localStorage).
// CartDrawer — right slide-in drawer, grouped by fulfillment category.
// CartTrigger — top-bar "🛒 Cart (n)" button that opens the drawer.

const CART_STORE_KEY = '__commerce_cart_v1__';

// ─── Hook: cart state, persisted ─────────────────────────────
const genLineUid = () => 'cl-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const sameMode = (a, b) => (a || null) === (b || null);

const useCart = () => {
  const [lines, setLines] = React.useState(() => {
    try {
      const raw = localStorage.getItem(CART_STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      // Backfill a stable uid for older persisted lines.
      return parsed.map((l) => (l.uid ? l : { ...l, uid: genLineUid() }));
    } catch { return []; }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(CART_STORE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  // Each line: { uid, productId, variantId, integrationMode, qty, unitPriceOverride, addedAt }
  // A line is uniquely identified by `uid`. Two lines may share the same
  // variant but differ by integration mode.

  const add = (product, variant, qty = 1, meta = {}) => {
    if (!variant) return;
    // Stock cap — null = unlimited. Clamp qty (existing + new) to stock so
    // adding from anywhere (browse popup, PDP, "Add another" sheet, Buy Now
    // fallback) can never push a line past the variant's available stock.
    const cap = variant.stock != null ? variant.stock : Infinity;
    setLines((curr) => {
      const mode = meta.integrationMode || null;
      // Merge only when product + variant + integration mode all match.
      const i = curr.findIndex((l) =>
        l.productId === product.id && l.variantId === variant.id && sameMode(l.integrationMode, mode));
      if (i >= 0) {
        const next = [...curr];
        const newQty = Math.min(cap, next[i].qty + qty);
        next[i] = { ...next[i], qty: newQty, unitPriceOverride: variant.price };
        return next;
      }
      return [
        ...curr,
        {
          uid: genLineUid(),
          productId: product.id, variantId: variant.id,
          qty: Math.min(cap, qty),
          unitPriceOverride: variant.price,
          integrationMode: mode,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  };

  const setQty = (uid, qty) => {
    setLines((curr) => qty <= 0
      ? curr.filter((l) => l.uid !== uid)
      : curr.map((l) => (l.uid === uid ? { ...l, qty } : l)));
  };

  const remove = (uid) => setQty(uid, 0);

  // Per-line unit price override (editable at checkout).
  const setUnitPrice = (uid, price) => {
    const p = Math.max(0, Number.isFinite(price) ? price : 0);
    setLines((curr) => curr.map((l) => (l.uid === uid ? { ...l, unitPriceOverride: p } : l)));
  };

  const clear = () => setLines([]);

  // Merge in a list of lines (e.g. from a Buy Now express-checkout that the
  // user converted into a cart via "Continue shopping"). Matching key is the
  // same as add() — (productId, variantId, integrationMode). Existing lines'
  // qty is incremented; the incoming line's unitPriceOverride wins so any
  // price adjustments made during Buy Now are preserved.
  const merge = (incomingLines) => {
    if (!Array.isArray(incomingLines) || incomingLines.length === 0) return;
    setLines((curr) => {
      const next = [...curr];
      for (const inc of incomingLines) {
        const mode = inc.integrationMode || null;
        const i = next.findIndex((l) =>
          l.productId === inc.productId && l.variantId === inc.variantId && sameMode(l.integrationMode, mode));
        if (i >= 0) {
          next[i] = {
            ...next[i],
            qty: next[i].qty + (inc.qty || 1),
            unitPriceOverride: inc.unitPriceOverride ?? next[i].unitPriceOverride,
          };
        } else {
          next.push({
            uid: genLineUid(),
            productId: inc.productId,
            variantId: inc.variantId,
            qty: inc.qty || 1,
            unitPriceOverride: inc.unitPriceOverride,
            integrationMode: mode,
            addedAt: new Date().toISOString(),
          });
        }
      }
      return next;
    });
  };

  // Update the integration mode on a line (no variant swap).
  // If the change collides with another line (same variant + mode), merge them.
  const setIntegrationMode = (uid, mode) => {
    setLines((curr) => {
      const i = curr.findIndex((l) => l.uid === uid);
      if (i < 0) return curr;
      const src = curr[i];
      const j = curr.findIndex((l) =>
        l.uid !== uid && l.productId === src.productId && l.variantId === src.variantId && sameMode(l.integrationMode, mode));
      if (j >= 0) {
        return curr.filter((_, k) => k !== i)
          .map((l) => (l.uid === curr[j].uid ? { ...l, qty: l.qty + src.qty } : l));
      }
      return curr.map((l) => (l.uid === uid ? { ...l, integrationMode: mode } : l));
    });
  };

  // Swap a line to a different variant of the same product.
  // Merge into an existing line if one matches the same variant + integration mode.
  const changeVariant = (uid, newVariantId, newPrice) => {
    setLines((curr) => {
      const i = curr.findIndex((l) => l.uid === uid);
      if (i < 0) return curr;
      const src = curr[i];
      if (src.variantId === newVariantId) return curr;
      const j = curr.findIndex((l) =>
        l.uid !== uid && l.productId === src.productId && l.variantId === newVariantId && sameMode(l.integrationMode, src.integrationMode));
      if (j >= 0) {
        return curr.filter((_, k) => k !== i)
          .map((l) => (l.uid === curr[j].uid ? { ...l, qty: l.qty + src.qty } : l));
      }
      return curr.map((l) => (l.uid === uid
        ? { ...l, variantId: newVariantId, unitPriceOverride: newPrice != null ? newPrice : l.unitPriceOverride }
        : l));
    });
  };

  const totalQty = lines.reduce((n, l) => n + l.qty, 0);

  return { lines, add, merge, setQty, remove, clear, totalQty, setUnitPrice, changeVariant, setIntegrationMode };
};

// Resolve a cart line → { product, variant } from live data
const resolveLine = (line, products) => {
  const product = products.find((p) => p.id === line.productId);
  if (!product) return null;
  const variant = product.variants.find((v) => v.id === line.variantId);
  if (!variant) return null;
  return { product, variant };
};

// Fulfillment category for grouping
const fulfillmentOf = (product) => {
  if (product.type === 'OTHER') return 'OTHER';
  if (product.deviceVariant === 'SAMPLE') return 'SAMPLE';
  if (product.deviceVariant === 'PRODUCTION') return 'PRODUCTION';
  return 'OTHER';
};

const FULFILL_LABEL = {
  SAMPLE:     '6-digit activation code',
  PRODUCTION: 'SN/IMEI · Fleet enrollment',
  OTHER:      'Shipping only',
};
const FULFILL_TONE = {
  SAMPLE: 'accent', PRODUCTION: 'success', OTHER: 'neutral',
};

// ─── CartTrigger (top-bar button) ─────────────────────────────
const CartTrigger = ({ totalQty, subtotal, onOpen }) => (
  <button type="button" className="cart-trigger" onClick={onOpen}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/>
      <circle cx="10" cy="21" r="1.2"/>
      <circle cx="18" cy="21" r="1.2"/>
    </svg>
    <span className="cart-trigger__lbl">Cart</span>
    {totalQty > 0 && <span className="cart-trigger__count">{totalQty}</span>}
  </button>
);

// ─── CartDrawer ───────────────────────────────────────────────
const CartVariantPopup = ({ line, product, variant, anchorRect, onClose, onSave, onAddNew, otherLinesInCart = [] }) => {
  const specs = product.specs || [];
  const primaryAxis = specs[0] || null;
  // Integration-mode UI only applies to SAMPLE devices.
  const isSample = product.type === 'DEVICE' && product.deviceVariant === 'SAMPLE';
  const isIntAxis = isSample && primaryAxis && /^integration\s*mode$/i.test(primaryAxis.name);
  const standaloneIntModes = (isSample && Array.isArray(product.integrationModes) && product.integrationModes.length > 1)
    ? product.integrationModes : [];
  const activeVariants = product.variants.filter((v) => v.status === 'ACTIVE');

  const [pickedVariantId, setPickedVariantId] = React.useState(variant.id);
  const [pickedIntMode, setPickedIntMode] = React.useState(
    line.integrationMode || (standaloneIntModes[0] || null)
  );

  const pickedVariant = product.variants.find((v) => v.id === pickedVariantId) || variant;
  const changedVariant = pickedVariantId !== variant.id;
  const initialMode = line.integrationMode || (standaloneIntModes[0] || null);
  const changedIntMode = standaloneIntModes.length > 0 && initialMode !== pickedIntMode;
  const dirty = changedVariant || changedIntMode;
  // Add another & Save share the same enable rule: any change to the picked
  // variant OR integration mode (vs. the current line) makes them available.
  const canAddAsNew = !!onAddNew && dirty;

  // Position the popup relative to the anchor element (Android PopupWindow style).
  const POP_WIDTH = 340;
  const GAP = 6;
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState(() => {
    const r = anchorRect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(vw - POP_WIDTH - 8, r.left + r.width / 2 - POP_WIDTH / 2));
    // Prefer below the anchor; flip above if it would overflow.
    const estHeight = 260;
    const showAbove = (r.bottom + GAP + estHeight) > vh && (r.top - GAP - estHeight) > 8;
    const top = showAbove ? Math.max(8, r.top - GAP - estHeight) : r.bottom + GAP;
    const arrowLeft = Math.max(12, Math.min(POP_WIDTH - 24, r.left + r.width / 2 - left));
    return { top, left, arrowLeft, showAbove };
  });

  // After mount, re-measure actual height and adjust if it would overflow.
  React.useEffect(() => {
    if (!popRef.current) return;
    const h = popRef.current.offsetHeight;
    const r = anchorRect;
    const vh = window.innerHeight;
    const wouldOverflow = (r.bottom + GAP + h) > vh;
    if (wouldOverflow && (r.top - GAP - h) > 8) {
      setPos((p) => ({ ...p, top: Math.max(8, r.top - GAP - h), showAbove: true }));
    }
  }, [anchorRect]);

  // Click-outside + Esc to close
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    // Defer to next tick so the opening click doesn't fire it.
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

  const handleSave = () => {
    onSave({
      variantId: pickedVariantId,
      integrationMode: pickedIntMode,
      price: pickedVariant.price,
      changedVariant,
      changedIntMode,
    });
  };

  const handleAddAsNew = () => {
    if (!canAddAsNew) return;
    onAddNew({
      variant: pickedVariant,
      integrationMode: pickedIntMode,
    });
  };

  return ReactDOM.createPortal(
    <div ref={popRef}
      className={`cart-pop ${pos.showAbove ? 'cart-pop--above' : ''}`}
      style={{ top: pos.top, left: pos.left, width: POP_WIDTH }}
      role="dialog" aria-modal="false">
      <span className="cart-pop__arrow" style={{ left: pos.arrowLeft }}/>
      <div className="cart-pop__head">
        <div className="cart-pop__title">{product.name}</div>
        <button type="button" className="cart-pop__close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={13}/>
        </button>
      </div>
      <div className="cart-pop__body">
        {standaloneIntModes.length > 0 && (
          <section className="cart-pop__section">
            <div className="cart-pop__lbl">Integration mode</div>
            <div className="cart-pop__chips">
              {standaloneIntModes.map((m) => (
                <button key={m} type="button"
                  className={`cart-pop__chip ${pickedIntMode === m ? 'is-active' : ''}`}
                  onClick={() => setPickedIntMode(m)}>{m}</button>
              ))}
            </div>
          </section>
        )}
        {activeVariants.length > 1 && (
          <section className="cart-pop__section">
            <div className="cart-pop__lbl">
              {isIntAxis ? 'Integration mode' : (primaryAxis?.name || 'Variant')}
            </div>
            <div className="cart-pop__chips">
              {activeVariants.map((v) => {
                const label = resolveVariantLabel(product, v) || v.label || v.id;
                const active = v.id === pickedVariantId;
                const ss = typeof variantStockState === 'function' ? variantStockState(v) : null;
                const isOut = ss === 'OUT';
                const isLow = ss === 'LOW';
                return (
                  <button key={v.id} type="button"
                    disabled={isOut && !active}
                    title={isOut ? (active ? 'Currently in cart — sold out' : 'Sold out') : undefined}
                    className={`cart-pop__chip cart-pop__chip--variant ${active ? 'is-active' : ''} ${isOut ? 'is-out' : ''} ${isLow ? 'is-low' : ''}`}
                    onClick={() => { if (!(isOut && !active)) setPickedVariantId(v.id); }}>
                    <span className="cart-pop__chip-lbl">{label}</span>
                    <span className="cart-pop__chip-price num">${v.price.toFixed(2)}</span>
                    {isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--out">Sold out</span>}
                    {isLow && !isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--low" aria-label={`Only ${v.stock != null ? v.stock : ''} left`.trim()}>{v.stock != null ? `${v.stock} left` : 'Limited'}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <div className="cart-pop__foot">
        <button type="button" className="cart-pop__btn cart-pop__btn--ghost" onClick={onClose}>Cancel</button>
        {onAddNew && (
          <button type="button" className="cart-pop__btn cart-pop__btn--secondary"
            disabled={!canAddAsNew}
            title={canAddAsNew ? 'Add picked option as a new line in cart' : 'Pick a different variant to add as new'}
            onClick={handleAddAsNew}>
            <Icon name="plus" size={11}/> Add another
          </button>
        )}
        <button type="button" className="cart-pop__btn cart-pop__btn--primary" disabled={!dirty} onClick={handleSave}>Save</button>
      </div>
    </div>,
    document.body
  );
};

const CartAddAnotherPopup = ({ product, anchorRect, existingVariantIds, onClose, onAdd }) => {
  const specs = product.specs || [];
  const primaryAxis = specs[0] || null;
  // Integration-mode UI only applies to SAMPLE devices.
  const isSample = product.type === 'DEVICE' && product.deviceVariant === 'SAMPLE';
  const isIntAxis = isSample && primaryAxis && /^integration\s*mode$/i.test(primaryAxis.name);
  const standaloneIntModes = (isSample && Array.isArray(product.integrationModes) && product.integrationModes.length > 1)
    ? product.integrationModes : [];
  const activeVariants = product.variants.filter((v) => v.status === 'ACTIVE');
  const availableVariant = activeVariants.find((v) => !existingVariantIds.includes(v.id)) || activeVariants[0];

  const [pickedVariantId, setPickedVariantId] = React.useState(availableVariant?.id);
  const [pickedIntMode, setPickedIntMode] = React.useState(standaloneIntModes[0] || null);

  const pickedVariant = product.variants.find((v) => v.id === pickedVariantId);
  const canAdd = !!pickedVariant && !existingVariantIds.includes(pickedVariantId);

  const POP_WIDTH = 340;
  const GAP = 6;
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState(() => {
    const r = anchorRect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(vw - POP_WIDTH - 8, r.left + r.width / 2 - POP_WIDTH / 2));
    const estHeight = 280;
    const showAbove = (r.bottom + GAP + estHeight) > vh && (r.top - GAP - estHeight) > 8;
    const top = showAbove ? Math.max(8, r.top - GAP - estHeight) : r.bottom + GAP;
    const arrowLeft = Math.max(12, Math.min(POP_WIDTH - 24, r.left + r.width / 2 - left));
    return { top, left, arrowLeft, showAbove };
  });

  React.useEffect(() => {
    if (!popRef.current) return;
    const h = popRef.current.offsetHeight;
    const r = anchorRect;
    const vh = window.innerHeight;
    const wouldOverflow = (r.bottom + GAP + h) > vh;
    if (wouldOverflow && (r.top - GAP - h) > 8) {
      setPos((p) => ({ ...p, top: Math.max(8, r.top - GAP - h), showAbove: true }));
    }
  }, [anchorRect]);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    };
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

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ variant: pickedVariant, integrationMode: pickedIntMode });
  };

  return ReactDOM.createPortal(
    <div ref={popRef}
      className={`cart-pop ${pos.showAbove ? 'cart-pop--above' : ''}`}
      style={{ top: pos.top, left: pos.left, width: POP_WIDTH }}
      role="dialog" aria-modal="false">
      <span className="cart-pop__arrow" style={{ left: pos.arrowLeft }}/>
      <div className="cart-pop__head">
        <div className="cart-pop__title">Add another option</div>
        <button type="button" className="cart-pop__close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={13}/>
        </button>
      </div>
      <div className="cart-pop__body">
        {standaloneIntModes.length > 0 && (
          <section className="cart-pop__section">
            <div className="cart-pop__lbl">Integration mode</div>
            <div className="cart-pop__chips">
              {standaloneIntModes.map((m) => (
                <button key={m} type="button"
                  className={`cart-pop__chip ${pickedIntMode === m ? 'is-active' : ''}`}
                  onClick={() => setPickedIntMode(m)}>{m}</button>
              ))}
            </div>
          </section>
        )}
        {activeVariants.length > 1 && (
          <section className="cart-pop__section">
            <div className="cart-pop__lbl">
              {isIntAxis ? 'Integration mode' : (primaryAxis?.name || 'Variant')}
            </div>
            <div className="cart-pop__chips">
              {activeVariants.map((v) => {
                const label = resolveVariantLabel(product, v) || v.label || v.id;
                const active = v.id === pickedVariantId;
                const inCart = existingVariantIds.includes(v.id);
                const ss = typeof variantStockState === 'function' ? variantStockState(v) : null;
                const isOut = ss === 'OUT';
                const isLow = ss === 'LOW';
                const disabled = inCart || isOut;
                const title = inCart ? 'Already in cart' : (isOut ? 'Sold out' : undefined);
                return (
                  <button key={v.id} type="button"
                    disabled={disabled}
                    title={title}
                    className={`cart-pop__chip cart-pop__chip--variant ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''} ${isOut ? 'is-out' : ''} ${isLow ? 'is-low' : ''}`}
                    onClick={() => { if (!disabled) setPickedVariantId(v.id); }}>
                    <span className="cart-pop__chip-lbl">{label}</span>
                    <span className="cart-pop__chip-price num">${v.price.toFixed(2)}</span>
                    {isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--out">Sold out</span>}
                    {isLow && !isOut && <span className="cart-pop__chip-tag cart-pop__chip-tag--low" aria-label={`Only ${v.stock != null ? v.stock : ''} left`.trim()}>{v.stock != null ? `${v.stock} left` : 'Limited'}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <div className="cart-pop__foot">
        <button type="button" className="cart-pop__btn cart-pop__btn--ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cart-pop__btn cart-pop__btn--primary" disabled={!canAdd}
          onClick={handleAdd}>Add to cart</button>
      </div>
    </div>,
    document.body
  );
};

const CartDrawer = ({ open, onClose, lines, products, onSetQty, onRemove, onClear, onCheckout, onChangeVariant, onChangeIntegrationMode, onOpenProduct, onAddLine }) => {
  const [editing, setEditing] = React.useState(null); // { rowKey, anchorRect }
  const [adding, setAdding] = React.useState(null);   // { rowKey, anchorRect }
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false);
  const editingKey = editing?.rowKey || null;
  const items = lines
    .map((l) => ({ line: l, ...resolveLine(l, products) }))
    .filter((x) => x.product && x.variant);

  const grouped = {
    SAMPLE: items.filter((x) => fulfillmentOf(x.product) === 'SAMPLE'),
    PRODUCTION: items.filter((x) => fulfillmentOf(x.product) === 'PRODUCTION'),
    OTHER: items.filter((x) => fulfillmentOf(x.product) === 'OTHER'),
  };

  const subtotal = items.reduce((s, { variant, line }) => {
    const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
    return s + unit * line.qty;
  }, 0);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="cart-backdrop" onClick={onClose}/>
      <aside className="cart-drawer">
        <div className="cart-drawer__head">
          <div>
            <div className="cart-drawer__title">Cart</div>
            <div className="cart-drawer__sub">{items.length === 0 ? 'Empty' : `${items.reduce((n, x) => n + x.line.qty, 0)} items`}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty__icon"><Icon name="package" size={28}/></div>
              <div className="cart-empty__title">Your cart is empty</div>
              <div className="cart-empty__sub">Browse Goods to add items.</div>
            </div>
          ) : (
            ['SAMPLE', 'PRODUCTION', 'OTHER'].map((key) => {
              const rows = grouped[key];
              if (!rows.length) return null;
              return (
                <div key={key} className="cart-group">
                  {rows.map(({ line, product, variant }) => {
                    const model = (window.DEVICE_MODELS || []).find((m) => m.id === product.deviceModelId);
                    const img = variant.image || product.baseImage;
                    const variantLabel = resolveVariantLabel(product, variant);
                    const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
                    const isOverridden = line.unitPriceOverride != null && line.unitPriceOverride !== variant.price;
                    const specs = product.specs || [];
                    const primaryAxis = specs[0] || null;
                    const isSampleRow = product.type === 'DEVICE' && product.deviceVariant === 'SAMPLE';
                    const isIntAxis = isSampleRow && primaryAxis && /^integration\s*mode$/i.test(primaryAxis.name);
                    const activeVariants = product.variants.filter((v) => v.status === 'ACTIVE');
                    const intModesList = (typeof productIntegrationModes === 'function')
                      ? productIntegrationModes(product)
                      : (Array.isArray(product.integrationModes) ? product.integrationModes : []);
                    // Separate integration-mode chips ONLY when product carries a
                    // standalone integrationModes list (not derived from the variant axis).
                    const standaloneIntModes = (Array.isArray(product.integrationModes) && product.integrationModes.length > 1)
                      ? product.integrationModes : [];
                    const canChangeVariant = !!onChangeVariant && activeVariants.length > 1;
                    const canChangeIntMode = !!onChangeIntegrationMode && standaloneIntModes.length > 1;
                    // "Add another" is available when the product has more active variants
                    // than the user currently has in the cart for it. Filter to active variants
                    // so stale localStorage lines don't block the action.
                    const activeVariantIdSet = new Set(activeVariants.map((v) => v.id));
                    const existingVariantIds = lines
                      .filter((l) => l.productId === product.id && activeVariantIdSet.has(l.variantId))
                      .map((l) => l.variantId);
                    const canAddAnother = activeVariants.length > existingVariantIds.length;
                    const rowKey = line.uid;
                    // Display label: prefix with axis name when meaningful.
                    const displayBits = [];
                    if (line.integrationMode) {
                      displayBits.push(`Integration mode: ${line.integrationMode}`);
                    } else if (isIntAxis && variantLabel) {
                      displayBits.push(`Integration mode: ${variantLabel}`);
                    }
                    if (!isIntAxis && variantLabel) {
                      displayBits.push(primaryAxis ? `${primaryAxis.name}: ${variantLabel}` : variantLabel);
                    }
                    const displayText = displayBits.join(' · ') || (activeVariants.length > 1 ? 'Default' : '');
                    // Stock cap — Infinity when variant.stock is null (unlimited).
                    // Clamp the qty stepper / input by this so the user can't
                    // bump a cart line past the variant's available stock.
                    const maxQty = variant.stock != null ? variant.stock : Infinity;
                    const atMax = line.qty >= maxQty;
                    const overMax = line.qty > maxQty;
                    return (
                      <div key={rowKey} className="cart-row">
                        <div className="cart-row__img">
                          {img
                            ? <img src={img} alt=""/>
                            : product.type === 'DEVICE' && model
                              ? <ModelTile model={model} px={56}/>
                              : <div className="cart-row__placeholder">📦</div>}
                        </div>
                        <div className="cart-row__main">
                          <div className="cart-row__name">
                            {onOpenProduct ? (
                              <button type="button" className="cart-row__name-link"
                                onClick={() => { onOpenProduct(product.id); onClose(); }}
                                title="View product details">
                                <span className="cart-row__name-txt">{product.name}</span>
                              </button>
                            ) : (
                              <span className="cart-row__name-txt">{product.name}</span>
                            )}
                            <Badge tone={FULFILL_TONE[key]} dot>
                              {key === 'SAMPLE' ? 'Sample' : key === 'PRODUCTION' ? 'Production' : 'Other'}
                            </Badge>
                          </div>
                          {(displayText || canChangeVariant || canChangeIntMode) && (
                            <div className="cart-row__variant">
                              <span title={displayText}>{displayText}</span>
                              {(canChangeVariant || canChangeIntMode) && (
                                <button
                                  type="button"
                                  className="cart-row__variant-edit"
                                  onClick={(e) => {
                                    if (editingKey === rowKey) { setEditing(null); return; }
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setEditing({
                                      rowKey,
                                      anchorRect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, height: r.height, width: r.width },
                                    });
                                  }}
                                  aria-expanded={editingKey === rowKey}>
                                  <Icon name="edit" size={10}/> Change
                                </button>
                              )}
                            </div>
                          )}
                          <div className="cart-row__qty-wrap">
                            <div className="cart-row__qty">
                              <button className="cart-qty-btn" onClick={() => onSetQty(line.uid, line.qty - 1)} aria-label="Decrease" disabled={line.qty <= 1}>
                                <Icon name="minus" size={11}/>
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="cart-qty-input"
                                value={line.qty}
                                aria-label="Quantity"
                                size={Math.max(2, String(line.qty).length + 1)}
                                onChange={(e) => {
                                  // Allow empty / partial typing — only commit valid integers ≥ 1,
                                  // clamped to the variant's stock cap.
                                  const v = e.target.value.replace(/[^0-9]/g, '');
                                  if (v === '') return;
                                  const n = parseInt(v, 10);
                                  if (n >= 1) onSetQty(line.uid, Math.min(maxQty, n));
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value.replace(/[^0-9]/g, '');
                                  const n = parseInt(v, 10);
                                  if (!Number.isFinite(n) || n < 1) onSetQty(line.uid, 1);
                                  else if (n > maxQty) onSetQty(line.uid, maxQty);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowUp')   { e.preventDefault(); onSetQty(line.uid, Math.min(maxQty, line.qty + 1)); }
                                  if (e.key === 'ArrowDown') { e.preventDefault(); onSetQty(line.uid, Math.max(1, line.qty - 1)); }
                                  if (e.key === 'Enter')     e.currentTarget.blur();
                                }}
                                onFocus={(e) => e.currentTarget.select()}
                              />
                              <button className="cart-qty-btn"
                                onClick={() => onSetQty(line.uid, Math.min(maxQty, line.qty + 1))}
                                aria-label="Increase"
                                disabled={atMax}
                                title={atMax && maxQty !== Infinity ? `Only ${maxQty} in stock` : undefined}>
                                <Icon name="plus" size={11}/>
                              </button>
                            </div>
                            {maxQty !== Infinity && (atMax || overMax) && (
                              <span className={`cart-qty-cap ${overMax ? 'is-over' : ''}`}
                                title={overMax ? `${line.qty} ordered but only ${maxQty} in stock` : `Only ${maxQty} in stock`}>
                                {overMax ? `Only ${maxQty} left` : `Max ${maxQty}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="cart-row__price">
                          <div className="cart-row__line num">${(unit * line.qty).toFixed(2)}</div>
                          <div className="cart-row__unit num">
                            ${unit.toFixed(2)} ea
                            {isOverridden && <span className="cart-row__ovr" title={`List price $${variant.price.toFixed(2)}`}> · overridden</span>}
                          </div>
                          <button className="cart-row__remove" onClick={() => onRemove(line.uid)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer__foot">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span className="num">${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="md" onClick={() => setConfirmClearOpen(true)}>Clear</Btn>
              <Btn variant="primary" size="md" icon="check" onClick={onCheckout} style={{ flex: 1 }}>Order</Btn>
            </div>
          </div>
        )}
      </aside>
      {editing && (() => {
        const it = items.find(({ line }) => line.uid === editing.rowKey);
        if (!it) return null;
        return (
          <CartVariantPopup
            line={it.line}
            product={it.product}
            variant={it.variant}
            anchorRect={editing.anchorRect}
            otherLinesInCart={lines
              .filter((l) => l.productId === it.product.id && l.uid !== it.line.uid)
              .map((l) => ({ variantId: l.variantId, integrationMode: l.integrationMode || null }))}
            onClose={() => setEditing(null)}
            onAddNew={onAddLine ? ({ variant: v, integrationMode }) => {
              onAddLine(it.product, v, integrationMode);
              setEditing(null);
            } : null}
            onSave={({ variantId, integrationMode, changedVariant, changedIntMode, price }) => {
              const uid = it.line.uid;
              // Apply integration-mode change first (keeps same uid), then variant swap.
              if (changedIntMode && onChangeIntegrationMode) {
                onChangeIntegrationMode(uid, integrationMode);
              }
              if (changedVariant && onChangeVariant) {
                onChangeVariant(uid, variantId, price);
              }
              setEditing(null);
            }}
          />
        );
      })()}
      {confirmClearOpen && (
        // The cart drawer sits at z-index 9100 (above the standard --z-modal 1050),
        // so a default <window.Modal> would render *behind* the drawer and become
        // unclickable. We render the confirm dialog with the same tds-modal
        // markup but bump its z-index above the drawer.
        <div className="tds-modal-overlay" onClick={() => setConfirmClearOpen(false)}
          style={{ zIndex: 9300 }}>
          <div className="tds-modal" style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="tds-modal__header">
              <h3 className="tds-modal__title">Clear your cart?</h3>
              <button className="iconbtn" onClick={() => setConfirmClearOpen(false)}>
                <Icon name="x"/>
              </button>
            </div>
            <div className="tds-modal__body">
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                This removes all <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{lines.length}</strong> item{lines.length === 1 ? '' : 's'} from your cart. You can re-add them anytime from <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Products</strong>.
              </div>
            </div>
            <div className="tds-modal__footer">
              <Btn variant="ghost" onClick={() => setConfirmClearOpen(false)}>Cancel</Btn>
              <Btn variant="danger" icon="trash" onClick={() => { onClear(); setConfirmClearOpen(false); }}>Clear cart</Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────
const cartStyles = `
.cart-trigger { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px; border-radius: 8px; background: var(--color-bg-3); border: 1px solid var(--color-border-default); cursor: pointer; font-family: inherit; color: var(--color-text-primary); transition: all var(--duration-fast); }
.cart-trigger:hover { background: var(--color-bg-2); border-color: var(--color-border-strong); }
.cart-trigger__lbl { font-size: 12.5px; font-weight: 500; }
.cart-trigger__count { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--color-primary-700); color: #fff; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cart-trigger__sub { font-size: 11.5px; color: var(--color-text-tertiary); padding-left: 4px; border-left: 1px solid var(--color-border-subtle); margin-left: 2px; }

.cart-backdrop { position: fixed; inset: 0; background: oklch(0% 0 0 / 0.35); z-index: 9050; animation: cartFade 160ms ease; }
.cart-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 92vw); background: var(--color-bg-1); border-left: 1px solid var(--color-border-default); box-shadow: -16px 0 48px oklch(0% 0 0 / 0.2); display: flex; flex-direction: column; z-index: 9051; animation: cartSlide 200ms ease; }
@keyframes cartFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cartSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }

.cart-drawer__head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--color-border-default); flex: none; }
.cart-drawer__title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.cart-drawer__sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }
.cart-drawer__body { flex: 1; overflow: auto; padding: 8px 0; }
.cart-drawer__foot { padding: 16px 18px; border-top: 1px solid var(--color-border-default); background: var(--color-bg-2); flex: none; display: flex; flex-direction: column; gap: 12px; }

.cart-empty { text-align: center; padding: 60px 24px; }
.cart-empty__icon { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 14px; background: var(--color-bg-3); color: var(--color-text-tertiary); margin-bottom: 12px; }
.cart-empty__title { font-size: 14.5px; font-weight: 500; color: var(--color-text-primary); }
.cart-empty__sub { font-size: 12.5px; color: var(--color-text-tertiary); margin-top: 4px; }

.cart-group { padding: 8px 18px 4px; }
.cart-group__head { display: flex; align-items: center; gap: 8px; padding: 10px 0 6px; }
.cart-group__hint { font-size: 11px; color: var(--color-text-tertiary); }

.cart-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle); }
.cart-row:last-child { border-bottom: 0; }
.cart-row__img { flex: none; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: #fff; border: 1px solid var(--color-border-default); display: grid; place-items: center; }
.cart-row__img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.cart-row__placeholder { font-size: 24px; }
.cart-row__main { flex: 1; min-width: 0; }
.cart-row__name { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.cart-row__name-link { background: transparent; border: 0; padding: 0; flex: 1; min-width: 0; cursor: pointer; text-align: left; font: inherit; color: inherit; }
.cart-row__name-link:hover { color: var(--color-primary-700); }
.cart-row__name-link:hover .cart-row__name-txt { text-decoration: underline; text-underline-offset: 2px; }
.cart-row__name-txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cart-row__variant { font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 2px; display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.cart-row__variant > span { flex: 1; min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; word-break: break-word; }
.cart-row__variant-edit { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border: 0; border-radius: 4px; background: transparent; color: var(--color-primary-700); font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; }
.cart-row__variant-edit:hover { background: var(--color-primary-50); }
.cart-row__variant-picker { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; padding: 8px; background: var(--color-bg-1); border: 1px solid var(--color-border-default); border-radius: 6px; }
.cart-row__variant-section { display: flex; flex-direction: column; gap: 4px; }
.cart-row__variant-section-lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.cart-row__variant-section-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.cart-row__variant-picker-foot { display: flex; justify-content: flex-end; padding-top: 2px; border-top: 1px solid var(--color-border-subtle); }
.cart-row__variant-done { padding: 3px 12px; border: 0; background: transparent; color: var(--color-primary-700); font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; border-radius: 4px; }
.cart-row__variant-done:hover { background: var(--color-primary-50); }
.cart-row__variant-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); border-radius: 999px; font-size: 11.5px; color: var(--color-text-primary); cursor: pointer; font-family: inherit; }
.cart-row__variant-chip:hover { border-color: var(--color-primary-500); }
.cart-row__variant-chip.is-active { background: var(--color-primary-700); border-color: var(--color-primary-700); color: #fff; }
.cart-row__variant-chip-lbl { font-weight: 500; }
.cart-row__variant-chip-price { font-size: 10.5px; opacity: 0.8; }

/* Android-style PopupWindow anchored to the Change button ──── */
.cart-pop { position: fixed; z-index: 9200; background: var(--color-bg-1); border: 1px solid var(--color-border-default); border-radius: 10px; box-shadow: 0 12px 32px oklch(0% 0 0 / 0.25), 0 2px 6px oklch(0% 0 0 / 0.1); display: flex; flex-direction: column; overflow: hidden; animation: cartPopRise 140ms cubic-bezier(0.2, 0.7, 0.3, 1); }
@keyframes cartPopRise { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: none; } }
.cart-pop__arrow { position: absolute; top: -6px; width: 12px; height: 12px; background: var(--color-bg-1); border-top: 1px solid var(--color-border-default); border-left: 1px solid var(--color-border-default); transform: rotate(45deg); }
.cart-pop--above .cart-pop__arrow { top: auto; bottom: -6px; border-top: 0; border-left: 0; border-bottom: 1px solid var(--color-border-default); border-right: 1px solid var(--color-border-default); }
.cart-pop__head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--color-border-subtle); }
.cart-pop__title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cart-pop__close { width: 22px; height: 22px; border-radius: 5px; border: 0; background: transparent; color: var(--color-text-tertiary); cursor: pointer; display: grid; place-items: center; flex: none; }
.cart-pop__close:hover { background: var(--color-bg-3); color: var(--color-text-primary); }
.cart-pop__body { padding: 10px 12px; display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow-y: auto; }
.cart-pop__section { display: flex; flex-direction: column; gap: 6px; }
.cart-pop__lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.cart-pop__chips { display: flex; flex-wrap: wrap; gap: 4px; }
.cart-pop__chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); border-radius: 999px; font-size: 11.5px; color: var(--color-text-primary); cursor: pointer; font-family: inherit; transition: all var(--duration-fast); }
.cart-pop__chip:hover { border-color: var(--color-primary-500); }
.cart-pop__chip.is-active { background: var(--color-primary-700); border-color: var(--color-primary-700); color: #fff; }
.cart-pop__chip:disabled, .cart-pop__chip.is-disabled { opacity: 0.45; cursor: not-allowed; background: var(--color-bg-3); border-color: var(--color-border-subtle); color: var(--color-text-tertiary); text-decoration: line-through; }
.cart-pop__chip:disabled:hover, .cart-pop__chip.is-disabled:hover { border-color: var(--color-border-subtle); }
.cart-pop__chip--variant { padding: 4px 9px 4px 10px; }
.cart-pop__chip-lbl { font-weight: 500; }
.cart-pop__chip-price { font-size: 10.5px; opacity: 0.8; font-variant-numeric: tabular-nums; }
.cart-pop__foot { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 10px 10px; border-top: 1px solid var(--color-border-subtle); }
.cart-pop__btn { padding: 7px 14px; border: 1px solid transparent; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all var(--duration-fast); display: inline-flex; align-items: center; gap: 4px; }
.cart-pop__btn--ghost { background: transparent; color: var(--color-text-secondary); border-color: var(--color-border-default); }
.cart-pop__btn--ghost:hover { background: var(--color-bg-3); color: var(--color-text-primary); border-color: var(--color-border-strong); }
.cart-pop__btn--primary { background: var(--color-primary-700); color: #fff; }
.cart-pop__btn--primary:hover:not(:disabled) { background: var(--color-primary-800, oklch(40% 0.16 255)); }
.cart-pop__btn--primary:disabled { opacity: 0.4; cursor: not-allowed; }
.cart-pop__btn--secondary { background: var(--color-bg-1); color: var(--color-primary-700); border-color: var(--color-primary-500); }
.cart-pop__btn--secondary:hover:not(:disabled) { background: var(--color-primary-50); }
.cart-pop__btn--secondary:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--color-border-default); color: var(--color-text-tertiary); }
.cart-row__qty-wrap { display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.cart-row__qty { display: inline-flex; align-items: center; gap: 4px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 6px; padding: 1px; }
.cart-qty-cap { font-size: 10.5px; font-weight: 500; padding: 2px 7px; border-radius: 999px; color: var(--color-warning-700); background: var(--color-warning-50, oklch(96% 0.04 80)); border: 1px solid color-mix(in oklab, var(--color-warning-700) 18%, transparent); line-height: 1.3; white-space: nowrap; }
.cart-qty-cap.is-over { color: var(--color-danger-700, oklch(48% 0.18 25)); background: var(--color-danger-50, oklch(96% 0.04 25)); border-color: color-mix(in oklab, var(--color-danger-700, oklch(48% 0.18 25)) 18%, transparent); }
.cart-qty-btn { width: 22px; height: 22px; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.cart-qty-btn:hover { background: var(--color-bg-3); color: var(--color-text-primary); }
.cart-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; background: transparent; color: var(--color-text-tertiary); }
.cart-qty-btn:disabled:hover { background: transparent; color: var(--color-text-tertiary); }
.cart-qty-val { min-width: 22px; text-align: center; font-size: 12.5px; font-weight: 500; font-variant-numeric: tabular-nums; }
.cart-qty-input { width: auto; min-width: 30px; max-width: 80px; height: 22px; padding: 0 4px; border: 0; background: transparent; text-align: center; font-family: inherit; font-size: 12.5px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--color-text-primary); outline: none; border-radius: 3px; box-sizing: content-box; }
.cart-qty-input:focus { background: var(--color-bg-3); box-shadow: inset 0 0 0 1px var(--color-primary-500); }
.cart-qty-input::-webkit-outer-spin-button, .cart-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cart-row__price { text-align: right; min-width: 80px; }
.cart-row__line { font-size: 13.5px; font-weight: 500; color: var(--color-text-primary); }
.cart-row__unit { font-size: 11px; color: var(--color-text-tertiary); margin-top: 2px; }
.cart-row__ovr { color: var(--color-warning-700); }
.cart-row__remove { background: transparent; border: 0; color: var(--color-text-tertiary); cursor: pointer; font-size: 11px; padding: 4px 0 0; text-decoration: underline; font-family: inherit; }
.cart-row__remove:hover { color: var(--color-error-700); }

.cart-subtotal { display: flex; justify-content: space-between; align-items: baseline; font-size: 14.5px; font-weight: 600; }
.cart-fulfill-preview { background: var(--color-bg-3); border-radius: 8px; padding: 10px 12px; font-size: 11.5px; color: var(--color-text-secondary); line-height: 1.6; }
.cart-fulfill-preview__lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 4px; }
.cart-cloud-hint { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--color-text-tertiary); align-self: flex-end; }
.cart-cloud-hint svg { color: var(--color-success-700); }
`;

if (typeof document !== 'undefined' && !document.getElementById('cart-styles')) {
  const s = document.createElement('style');
  s.id = 'cart-styles';
  s.textContent = cartStyles;
  document.head.appendChild(s);
}

Object.assign(window, { useCart, CartTrigger, CartDrawer, resolveLine, fulfillmentOf, FULFILL_LABEL });
