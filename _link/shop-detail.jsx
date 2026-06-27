/* global React, Btn, Icon, Badge, ModelTile, DEVICE_MODELS, useToast,
   productEffectiveStatus, CATEGORY_BADGE, FULFILL_LABEL, fulfillmentOf,
   productIntegrationModes, resolveVariantLabel, variantStockState, CartTrigger */
const { useState, useMemo, useEffect, useRef } = React;

// ─── Product Detail Page (PDP) ─────────────────────────────
// Two-column layout (simpler than Amazon's 3-col):
//   Left  (45%): image gallery
//   Right (55%): title, info, variant picker, qty, Add to cart, fulfillment
//   Below: tabs (Description / Specifications / Variants)
//
// Reuses live product data so any cart-side price snapshot is always current
// at click-add time.

const ProductDetail = ({ productId, products, onBack, onAddToCart, cartQty = 0, cartSubtotal = 0, onOpenCart, onOpenOrders, onCheckout, onOrderNow }) => {
  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [priceOverride, setPriceOverride] = useState(null);  // null = use variant price
  const [editingPrice, setEditingPrice] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const toast = useToast();

  // Pick a default variant + integration mode when product loads
  const integrationModes = useMemo(
    () => product ? productIntegrationModes(product) : [],
    [product]
  );
  useEffect(() => {
    if (!product) return;
    const active = product.variants.find((v) => v.status === 'ACTIVE') || product.variants[0];
    setSelectedVariantId(active?.id || null);
    setSelectedIntegration(integrationModes[0] || null);
    setPriceOverride(null);
    setEditingPrice(false);
    setSelectedImage(0);
    setQty(1);
  }, [productId]);

  // Legacy compat: if specs[0] is "Integration mode", picking an integration
  // should also select the matching variant (since those variants ARE the
  // integration modes for old seed products).
  useEffect(() => {
    if (!product || !selectedIntegration) return;
    const specs = product.specs || [];
    if (specs[0] && /^integration\s*mode$/i.test(specs[0].name)) {
      const axis = specs[0];
      const match = axis.values.find((v) => v.label === selectedIntegration);
      if (match) {
        const v = product.variants.find((x) => x.combination[axis.id] === match.id);
        if (v && v.id !== selectedVariantId) {
          setSelectedVariantId(v.id);
          setPriceOverride(null);
        }
      }
    }
  }, [selectedIntegration, product]);

  // Auto-advance the image gallery every 1.5s (only when there are 2+ images).
  const galleryLen = useMemo(() => {
    if (!product) return 0;
    const v = product.variants.find((x) => x.id === selectedVariantId) || product.variants[0];
    let n = 0;
    if (v && v.image) n++;
    if (product.baseImage) n++;
    (product.extraImages || []).forEach((s) => { if (s) n++; });
    product.variants.forEach((x) => { if (x.image && x.image !== v?.image) n++; });
    return n;
  }, [product, selectedVariantId]);
  useEffect(() => {
    if (galleryLen <= 1) return undefined;
    const t = setInterval(() => {
      setSelectedImage((i) => (i + 1) % galleryLen);
    }, 1500);
    return () => clearInterval(t);
  }, [galleryLen, productId]);

  // When the top of the page scrolls out of view, the sticky bar swaps its
  // left label from "Back to Products" to the product title.
  const topSentinelRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [productId]);

  if (!product) {
    return (
      <div className="page">
        <div className="empty">Product not found.
          <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer', marginLeft: 6 }}>Back to Products</a>
        </div>
      </div>
    );
  }

  const eff = productEffectiveStatus(product);
  const isListed = eff === 'LISTED';
  const model = (window.DEVICE_MODELS || []).find((m) => m.id === product.deviceModelId);
  // The spec axis used as the displayed variant picker — skip a leading
  // legacy "Integration mode" axis since that's now picked separately.
  const axis = (() => {
    const specs = product.specs || [];
    if (specs[0] && /^integration\s*mode$/i.test(specs[0].name)) return specs[1] || null;
    return specs[0] || null;
  })();
  const variant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const variantLabel = resolveVariantLabel(product, variant);
  const cat = CATEGORY_BADGE(product);
  const fulfill = fulfillmentOf(product);
  const effectivePrice = priceOverride != null ? priceOverride : (variant?.price || 0);

  // Build image gallery — variant image first if present, then product baseImage,
  // then variant images for other variants (preview), then model artwork as fallback.
  const gallery = [];
  if (variant && variant.image) gallery.push({ src: variant.image, label: 'variant', kind: 'img' });
  if (product.baseImage) gallery.push({ src: product.baseImage, label: 'base', kind: 'img' });
  (product.extraImages || []).forEach((src) => {
    if (src) gallery.push({ src, label: 'extra', kind: 'img' });
  });
  product.variants.forEach((v) => {
    if (v.image && v.image !== variant?.image) gallery.push({ src: v.image, label: 'alt', kind: 'img' });
  });
  if (gallery.length === 0) {
    if (product.type === 'DEVICE' && model) gallery.push({ kind: 'model', model });
    else gallery.push({ kind: 'placeholder' });
  }
  const mainImg = gallery[Math.min(selectedImage, gallery.length - 1)] || gallery[0];

  const integrationOk = integrationModes.length === 0 || !!selectedIntegration;
  const stockState = variant ? variantStockState(variant) : null;
  // Stock cap (Infinity = unlimited). Clamp qty to it so the user can't
  // request more than is in stock.
  const maxQty = variant && variant.stock != null ? variant.stock : Infinity;
  useEffect(() => {
    if (qty > maxQty) setQty(Math.max(1, maxQty));
  }, [maxQty, qty]);
  const canAdd = isListed && variant && variant.status === 'ACTIVE' && qty > 0 && qty <= maxQty && integrationOk && stockState !== 'OUT';

  const flyToCart = (srcEl, imgSrc) => {
    if (!srcEl) return;
    const cart = document.querySelector('.cart-trigger');
    if (!cart) return;
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

  const handleAdd = (srcEl, silent = false) => {
    if (!canAdd) return false;
    const patched = priceOverride != null ? { ...variant, price: priceOverride } : variant;
    onAddToCart(product, patched, qty, { integrationMode: selectedIntegration });
    flyToCart(srcEl, product.baseImage || variant?.image);
    if (!silent) {
      const bits = [variantLabel, selectedIntegration].filter(Boolean).join(' · ');
      toast({ kind: 'success', title: 'Added to cart', msg: `${product.name}${bits ? ' · ' + bits : ''} × ${qty}` });
    }
    setQty(1);
    return true;
  };

  const handleOrder = () => {
    if (!canAdd) return;
    const patched = priceOverride != null ? { ...variant, price: priceOverride } : variant;
    if (onOrderNow) {
      onOrderNow(product, patched, qty, { integrationMode: selectedIntegration });
    } else if (onCheckout) {
      onAddToCart(product, patched, qty, { integrationMode: selectedIntegration });
      onCheckout();
    }
  };

  return (
    <div className="page page--wide">
      <div ref={topSentinelRef} style={{ height: 1 }}/>
      <div className="pdp-back">
        <button type="button" className={`pdp-back__btn ${scrolled ? 'is-title' : ''}`} onClick={onBack}>
          <Icon name="chevL" size={14}/> {scrolled ? product.name : 'Back to Products'}
        </button>
        {onOpenCart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenOrders && <Btn variant="secondary" size="md" icon="file" onClick={onOpenOrders}>Orders</Btn>}
            <CartTrigger totalQty={cartQty} subtotal={cartSubtotal} onOpen={onOpenCart} />
          </div>
        )}
      </div>

      {!isListed && (
        <div className="prod-banner prod-banner--warn" style={{ marginBottom: 16 }}>
          <Icon name="info" size={14}/>
          <span>
            This product is currently <strong>{eff}</strong> — not orderable. Visit{' '}
            <em>Catalog</em> to manage its status.
          </span>
        </div>
      )}

      <div className="pdp-main">
        {/* LEFT · Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-gallery__main">
            {mainImg.kind === 'img' && <img src={mainImg.src} alt={product.name}/>}
            {mainImg.kind === 'model' && <ModelTile model={mainImg.model} px={210}/>}
            {mainImg.kind === 'placeholder' && (
              <div className="pdp-placeholder">📦</div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="pdp-gallery__thumbs">
              {gallery.map((g, i) => (
                <button key={i} type="button"
                  className={`pdp-thumb ${i === selectedImage ? 'is-on' : ''}`}
                  onClick={() => setSelectedImage(i)}>
                  {g.kind === 'img' && <img src={g.src} alt=""/>}
                  {g.kind === 'model' && <ModelTile model={g.model} px={60}/>}
                  {g.kind === 'placeholder' && <div style={{ fontSize: 22 }}>📦</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT · Info + Buy box */}
        <div className="pdp-info">
          <h1 className="pdp-title">{product.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <Badge tone="success" dot>
              {product.type === 'DEVICE'
                ? (product.deviceVariant === 'SAMPLE' ? 'Sample' : 'Production')
                : 'Other'}
            </Badge>
            {model && <Badge tone="info">{model.name}</Badge>}
          </div>

          <div className="pdp-buy-box">
            {integrationModes.length > 0 && (
              <div className="pdp-variant-section">
                <div className="pdp-variant-label">
                  Integration mode:
                  {selectedIntegration && <strong> {selectedIntegration}</strong>}
                </div>
                <div className="pdp-variant-options">
                  {integrationModes.map((mode) => (
                    <button key={mode} type="button"
                      className={`pdp-variant-opt ${selectedIntegration === mode ? 'is-on' : ''}`}
                      onClick={() => setSelectedIntegration(mode)}>
                      <span className="pdp-variant-opt__lbl">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}


            {axis && product.variants.filter((v) => v.status === 'ACTIVE').length > 0 && (
              <div className="pdp-variant-section">
                <div className="pdp-variant-label">
                  Spec:
                  {variantLabel && <strong> {variantLabel}</strong>}
                </div>
                <div className="pdp-variant-options">
                  {product.variants.filter((v) => v.status === 'ACTIVE').map((v) => {
                    const lbl = resolveVariantLabel(product, v);
                    const on = v.id === selectedVariantId;
                    const ss = variantStockState(v);
                    const isOut = ss === 'OUT';
                    const isLow = ss === 'LOW';
                    return (
                      <button key={v.id} type="button"
                        className={`pdp-variant-opt ${on ? 'is-on' : ''} ${isOut ? 'is-out' : ''} ${isLow ? 'is-low' : ''}`}
                        onClick={() => { setSelectedVariantId(v.id); setPriceOverride(null); }}>
                        <span className="pdp-variant-opt__lbl">{lbl || '—'}</span>
                        <span className="pdp-variant-opt__price num">${v.price.toFixed(2)}</span>
                        {isOut && <span className="pdp-variant-opt__tag pdp-variant-opt__tag--out">Sold out</span>}
                        {isLow && !isOut && (
                          <span className="pdp-variant-opt__tag">{v.stock != null ? `Only ${v.stock} left` : (v.stockNote || 'Limited stock')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pdp-price">
              <span className="pdp-price__val num">${effectivePrice.toFixed(2)}</span>
              {stockState === 'OUT' && (
                <span className="pdp-stock-msg pdp-stock-msg--err">
                  <Icon name="info" size={12}/> This option is sold out.
                </span>
              )}
              {stockState === 'LOW' && (
                <span className="pdp-stock-msg pdp-stock-msg--warn">
                  <Icon name="info" size={12}/> Only {variant.stock != null ? variant.stock : 'a few'} left{variant.stockNote ? ` — ${variant.stockNote}` : ''}.
                </span>
              )}
            </div>

            <div className="pdp-qty-row">
              <div className="pdp-qty">
                <button className="pdp-qty__btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" disabled={qty <= 1}>
                  <Icon name="minus" size={13}/>
                </button>
                <input className="pdp-qty__input num" type="number" min="1"
                  max={maxQty === Infinity ? undefined : maxQty} value={qty}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value || '1', 10);
                    if (Number.isNaN(raw)) { setQty(1); return; }
                    setQty(Math.min(maxQty, Math.max(1, raw)));
                  }}/>
                <button className="pdp-qty__btn" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  aria-label="Increase"
                  disabled={qty >= maxQty}
                  title={qty >= maxQty && maxQty !== Infinity ? `Only ${maxQty} in stock` : undefined}>
                  <Icon name="plus" size={13}/>
                </button>
              </div>
              <div className="pdp-line-total num">
                {maxQty !== Infinity && qty >= maxQty && (
                  <span style={{ marginRight: 10, color: 'var(--color-warning-700)', fontSize: 12, fontWeight: 500 }}>
                    Max {maxQty}
                  </span>
                )}
                Line total <strong>${(effectivePrice * qty).toFixed(2)}</strong>
              </div>
            </div>

            <div className="pdp-buy-actions">
              <Btn variant="primary" size="lg"
                onClick={handleOrder} disabled={!canAdd}>
                {stockState === 'OUT' ? 'Sold out' : 'Order'}
              </Btn>
              <button type="button" className="pdp-add-iconbtn"
                onClick={(e) => handleAdd(e.currentTarget)} disabled={!canAdd}
                aria-label="Add to cart" title="Add to cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/>
                  <circle cx="10" cy="21" r="1.2"/>
                  <circle cx="18" cy="21" r="1.2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs below */}
      {/* Description */}
      <div className="pdp-desc">
        <h3 className="pdp-desc__title">Description</h3>
        <div className="pdp-prose">
          {product.desc ? <p>{product.desc}</p> : <p className="muted">No description.</p>}
        </div>
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────
const pdpStyles = `
.pdp-back { position: sticky; top: 0; z-index: 30; background: var(--color-bg-1); margin-bottom: 14px; padding: 8px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pdp-back__btn { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: 0; color: var(--color-text-secondary); font-family: inherit; font-size: 13px; cursor: pointer; padding: 4px 0; }
.pdp-back__btn:hover { color: var(--color-text-primary); }
.pdp-back__btn.is-title { color: var(--color-text-primary); font-weight: 600; font-size: 15px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pdp-main { display: grid; grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr); gap: 32px; align-items: stretch; margin-bottom: 32px; }
@media (max-width: 880px) { .pdp-main { grid-template-columns: 1fr; } }

.pdp-gallery { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.pdp-gallery__main { flex: 1; min-height: 240px; background: #fff; border: 1px solid var(--color-border-default); border-radius: 14px; padding: 22px; display: grid; place-items: center; overflow: hidden; box-shadow: var(--shadow-1); }
.pdp-gallery__main img { max-width: 100%; max-height: 100%; object-fit: contain; }
.pdp-placeholder { font-size: 140px; opacity: 0.4; }
.pdp-gallery__thumbs { display: flex; gap: 8px; }
.pdp-thumb { width: 56px; height: 56px; border: 1.5px solid var(--color-border-default); background: #fff; border-radius: 8px; display: grid; place-items: center; padding: 4px; cursor: pointer; overflow: hidden; transition: all var(--duration-fast); }
.pdp-thumb:hover { border-color: var(--color-border-strong); }
.pdp-thumb.is-on { border-color: var(--color-primary-700); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.12); }
.pdp-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }

.pdp-info { display: flex; flex-direction: column; gap: 12px; }
.pdp-title { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 0; line-height: 1.2; }
.pdp-sku { font: 500 12px var(--font-family-mono); color: var(--color-text-tertiary); }

.pdp-model-link { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; background: var(--color-info-50); color: var(--color-info-700); border-radius: 8px; font-size: 12px; cursor: pointer; align-self: flex-start; }
.pdp-model-link strong { font-weight: 600; }

.pdp-buy-box { background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 14px; padding: 20px; box-shadow: var(--shadow-1); display: flex; flex-direction: column; gap: 16px; margin-top: 6px; }

.pdp-price { display: flex; flex-direction: column; gap: 2px; }
.pdp-price__val { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; display: inline-flex; align-items: center; }
.pdp-price__hint { font-size: 11.5px; color: var(--color-text-tertiary); }
.pdp-price__edit { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1.5px solid var(--color-primary-700); border-radius: 10px; background: var(--color-bg-1); width: fit-content; }
.pdp-price__currency { font-size: 20px; color: var(--color-text-tertiary); }
.pdp-price__input { border: 0; outline: 0; background: transparent; font-size: 28px; font-weight: 600; letter-spacing: -0.02em; width: 140px; font-family: inherit; color: var(--color-text-primary); }
.pdp-price__input::-webkit-inner-spin-button, .pdp-price__input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.pdp-price__reset { font-size: 11.5px; background: transparent; border: 0; color: var(--color-primary-700); cursor: pointer; padding: 4px 8px; font-family: inherit; }
.pdp-price__reset:hover { text-decoration: underline; }

.pdp-variant-section { display: flex; flex-direction: column; gap: 8px; }
.pdp-variant-label { font-size: 13px; color: var(--color-text-secondary); }
.pdp-variant-label strong { color: var(--color-text-primary); font-weight: 600; }
.pdp-variant-options { display: flex; flex-wrap: wrap; gap: 8px; }
.pdp-variant-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 14px; background: var(--color-bg-1); border: 1.5px solid var(--color-border-default); border-radius: 10px; cursor: pointer; font-family: inherit; transition: all var(--duration-fast); min-width: 120px; text-align: left; }
.pdp-variant-opt:hover:not(:disabled) { border-color: var(--color-border-strong); }
.pdp-variant-opt.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.12); }
.pdp-variant-opt.is-unav { opacity: 0.5; cursor: not-allowed; background: var(--color-bg-3); }
.pdp-variant-opt.is-out { background: var(--color-bg-3); border-color: var(--color-border-subtle); }
.pdp-variant-opt.is-out .pdp-variant-opt__lbl { color: var(--color-text-tertiary); text-decoration: line-through; }
.pdp-variant-opt.is-out .pdp-variant-opt__price { color: var(--color-text-tertiary); text-decoration: line-through; }
.pdp-variant-opt.is-out.is-on { border-color: var(--color-border-strong); background: var(--color-bg-3); box-shadow: none; }
.pdp-variant-opt__lbl { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.pdp-variant-opt__price { font-size: 12.5px; color: var(--color-text-secondary); }
.pdp-variant-opt__tag { font-size: 10.5px; color: var(--color-warning-700); margin-top: 2px; }
.pdp-variant-opt__tag--out { color: var(--color-text-tertiary); text-decoration: none; font-weight: 600; }

.pdp-stock-msg { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 0 0; }
.pdp-stock-msg--warn { color: var(--color-warning-700); }
.pdp-stock-msg--err { color: var(--color-danger-700, oklch(48% 0.18 25)); font-weight: 500; }

.pdp-qty-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pdp-qty { display: inline-flex; align-items: center; background: var(--color-bg-1); border: 1.5px solid var(--color-border-default); border-radius: 10px; padding: 2px; }
.pdp-qty__btn { width: 36px; height: 36px; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; border-radius: 8px; color: var(--color-text-secondary); }
.pdp-qty__btn:hover { background: var(--color-bg-3); color: var(--color-text-primary); }
.pdp-qty__input { width: 56px; height: 36px; text-align: center; border: 0; background: transparent; font-size: 15px; font-weight: 500; color: var(--color-text-primary); font-variant-numeric: tabular-nums; outline: 0; font-family: inherit; }
.pdp-qty__input::-webkit-inner-spin-button, .pdp-qty__input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.pdp-line-total { font-size: 13px; color: var(--color-text-secondary); }
.pdp-line-total strong { font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin-left: 6px; }

.pdp-fulfill { padding: 12px 14px; background: var(--color-bg-3); border-radius: 10px; border: 1px solid var(--color-border-subtle); }
.pdp-fulfill__lbl { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: 4px; }
.pdp-fulfill__txt { font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.5; }

.pdp-desc { background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 14px; box-shadow: var(--shadow-1); padding: 22px 24px; }
.pdp-desc__title { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.pdp-prose p { margin: 0; line-height: 1.65; font-size: 13.5px; color: var(--color-text-primary); }

.pdp-buy-actions { display: flex; gap: 10px; align-items: stretch; justify-content: flex-start; }
.pdp-buy-actions > .tds-btn { min-width: 140px; }
.pdp-add-iconbtn { width: 48px; min-height: 40px; padding: 0; border-radius: 8px; border: 1px solid var(--color-border-default); background: var(--color-bg-1); color: var(--color-text-primary); cursor: pointer; display: grid; place-items: center; flex: none; transition: all var(--duration-fast); }
.pdp-add-iconbtn:hover:not(:disabled) { background: var(--color-bg-3); border-color: var(--color-border-strong); color: var(--color-primary-700); }
.pdp-add-iconbtn:active:not(:disabled) { transform: scale(0.96); }
.pdp-add-iconbtn:disabled { opacity: 0.5; cursor: not-allowed; }
`;

if (typeof document !== 'undefined' && !document.getElementById('pdp-styles')) {
  const s = document.createElement('style');
  s.id = 'pdp-styles';
  s.textContent = pdpStyles;
  document.head.appendChild(s);
}

window.ProductDetail = ProductDetail;
