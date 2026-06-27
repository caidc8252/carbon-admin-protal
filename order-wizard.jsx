/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, CompanyLogo, useToast, Modal,
   SEED_PRODUCTS, skuLabel, skuFullName, activeSkus, resolveBundleLines,
   ORDER_TYPES, orderItemFromSku, moneyUSD */
const { useState, useMemo } = React;

// ─── Stepper (ui-spec §7.3A 变体 A · 卡片，复用 shared.jsx 的 <StepperCard>) ──
const OrderStepper = ({ step }) => (
  <window.StepperCard
    steps={[
      { label: 'Customer' },
      { label: 'Products & quantities' },
      { label: 'Type & discount' },
      { label: 'Review & create' },
    ]}
    current={step}/>
);

// ─── Step 1 — Customer picker ──────────────────────────────────────────────
const StepCustomer = ({ customers, customerId, setCustomerId, shipping, setShipping }) => {
  const [q, setQ] = useState('');
  const filtered = customers.filter(c =>
    !q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || c.address.toLowerCase().includes(q.toLowerCase())
  );
  const selected = customers.find(c => c.id === customerId);

  // Auto-populate shipping address when a customer is picked (if blank)
  React.useEffect(() => {
    if (selected && !shipping.address) {
      const admin = selected.operators.find(o => o.role === 'Admin') || selected.operators[0];
      setShipping({
        name: admin?.name || '',
        address: selected.address,
        method: 'Standard ground',
      });
    }
  }, [selected]);

  return (
    <div className="tds-card">
      <div className="tds-card__header">
        <div>
          <div className="tds-card__title">Choose customer</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Orders are billed and shipped to the selected customer company.</div>
        </div>
      </div>
      <div className="tds-card__body">
        <Input prefix={<Icon name="search" size={14}/>} placeholder="Search customers…" value={q} onChange={e => setQ(e.target.value)} size="md"/>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflow: 'auto', border: '1px solid var(--color-border-default)', borderRadius: 10, padding: 6 }}>
          {filtered.length === 0 && <div className="empty" style={{ padding: 24 }}>No customers found.</div>}
          {filtered.map(c => {
            const on = c.id === customerId;
            return (
              <button key={c.id}
                onClick={() => setCustomerId(c.id)}
                className={`role-item ${on ? 'is-on' : ''}`}
                style={{ borderBottom: 'none', borderRadius: 8 }}>
                <CompanyLogo name={c.name} size={32}/>
                <div className="role-item__main">
                  <div className="role-item__name">{c.name}</div>
                  <div className="role-item__meta">{c.address.split(',').slice(-2).join(',').trim()} · {c.operators.length} operators</div>
                </div>
                <Badge tone={c.status === 'Active' ? 'success' : c.status === 'Onboarding' ? 'info' : 'error'} dot>{c.status}</Badge>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ marginTop: 18, padding: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={13}/> Shipping address
            </div>
            <div className="form-grid form-grid--2" style={{ gap: 14 }}>
              <Field label="Recipient">
                <Input value={shipping.name} onChange={e => setShipping({ ...shipping, name: e.target.value })} placeholder="Name"/>
              </Field>
              <Field label="Method">
                <Select value={shipping.method} onChange={e => setShipping({ ...shipping, method: e.target.value })}>
                  <option>Standard ground</option>
                  <option>Express overnight</option>
                  <option>International express</option>
                  <option>Freight</option>
                  <option>Customer pickup</option>
                </Select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Address">
                <Textarea value={shipping.address} onChange={e => setShipping({ ...shipping, address: e.target.value })} rows={2}/>
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Product thumb ─────────────────────────────────────────────────────────
const ProdThumb = ({ src, px = 40 }) => (
  src
    ? <span className="ow-thumb" style={{ width: px, height: px }}><img src={src} alt=""/></span>
    : <span className="ow-thumb ow-thumb--empty" style={{ width: px, height: px }}><Icon name="package" size={16}/></span>
);

// ─── Step 2 — Products & quantities (from the catalog) ─────────────────────
// One line per SKU. The adder lists ACTIVE catalog products; products with
// multiple SKUs open a SKU-picker modal, single-SKU products add directly.
const StepItems = ({ items, setItems, products }) => {
  const [picker, setPicker] = useState(null); // { product, skuId, qty }
  const candidates = products.filter((p) => p.status === 'ACTIVE' && activeSkus(p).length > 0);

  const addSku = (product, sku, qty) => {
    const existIdx = items.findIndex((i) => i.skuId === sku.id);
    if (existIdx >= 0) {
      setItems(items.map((i, idx) => idx === existIdx
        ? { ...i, qty: i.qty + qty, amount: Math.round(i.oriPrice * (i.qty + qty) * 100) / 100 }
        : i));
    } else {
      setItems([...items, window.orderItemFromSku(product, sku, qty)]);
    }
  };

  const openProduct = (p) => {
    const skus = activeSkus(p);
    if (skus.length === 1) { addSku(p, skus[0], 1); return; }
    setPicker({ product: p, skuId: skus[0].id, qty: 1 });
  };

  const setQty = (lineId, qty) => setItems(items.map((i) => i.id === lineId
    ? { ...i, qty, amount: Math.round(i.oriPrice * qty * 100) / 100 }
    : i));
  const removeLine = (lineId) => setItems(items.filter((i) => i.id !== lineId));

  return (
    <div className="tds-card">
      <div className="tds-card__header">
        <div>
          <div className="tds-card__title">Products & quantities</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Order lines reference catalog SKUs — pick a product, then its variant.</div>
        </div>
      </div>
      <div className="tds-card__body">

        {/* Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, border: '1px dashed var(--color-border-default)', borderRadius: 10 }}>
              No items yet. Add your first product below.
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} className="ow-line">
              <ProdThumb src={it.image}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.name}{it.variantLabel ? <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}> · {it.variantLabel}</span> : null}
                  </span>
                  {it.bundleItems && <Badge tone="accent">Bundle</Badge>}
                </div>
                <div className="cust-meta" style={{ marginTop: 2 }}>
                  {moneyUSD(it.oriPrice)} ea
                  {it.bundleItems ? ` · ${it.bundleItems.length} components per kit` : ''}
                </div>
              </div>

              {/* Qty stepper */}
              <div className="ow-qty">
                <button className="iconbtn" style={{ borderRadius: '8px 0 0 8px', height: 30 }} onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}><Icon name="minus" size={12}/></button>
                <input value={it.qty}
                  onChange={e => setQty(it.id, Math.max(1, parseInt(e.target.value || '1', 10)))}
                  onFocus={e => e.target.select()}/>
                <button className="iconbtn" style={{ borderRadius: '0 8px 8px 0', height: 30 }} onClick={() => setQty(it.id, it.qty + 1)}><Icon name="plus" size={12}/></button>
              </div>

              {/* Line total */}
              <div style={{ textAlign: 'right', minWidth: 92 }}>
                <div className="num" style={{ fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{moneyUSD(it.oriPrice * it.qty)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {moneyUSD(it.oriPrice)} × {it.qty}
                </div>
              </div>

              <button className="iconbtn" onClick={() => removeLine(it.id)} title="Remove this line">
                <Icon name="trash" size={13}/>
              </button>
            </div>
          ))}
        </div>

        {/* Adder — ACTIVE catalog products */}
        <div style={{ marginTop: items.length > 0 ? 16 : 12, padding: 12, background: 'var(--color-bg-3)', border: '1px dashed var(--color-border-default)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Add a product</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
              Pick a product → choose variant → add to order
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {candidates.map(p => {
              const inOrderQty = items.filter(i => i.productId === p.id).reduce((n, i) => n + i.qty, 0);
              const skus = activeSkus(p);
              return (
                <button key={p.id} onClick={() => openProduct(p)}
                  className="role-item" style={{ borderRadius: 8, borderBottom: 'none', background: 'var(--color-bg-2)', border: '1px solid var(--color-border-default)' }}>
                  <ProdThumb src={p.baseImage} px={35}/>
                  <div className="role-item__main">
                    <div className="role-item__name">{p.name}</div>
                    <div className="role-item__meta">
                      {window.formatPriceRange(p)}{skus.length > 1 ? ` · ${skus.length} variants` : ''}
                      {p.productType === 'BUNDLE' ? ' · Bundle' : ''}
                      {inOrderQty > 0 && <> · <span style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}>{inOrderQty} in order</span></>}
                    </div>
                  </div>
                  <Icon name="plus" size={14}/>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SKU picker modal */}
      {picker && (
        <Modal open onClose={() => setPicker(null)}
          title={`Add ${picker.product.name} to order`}
          width={520}
          footer={(
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setPicker(null)}>Cancel</Btn>
              <Btn variant="primary" icon="plus" onClick={() => {
                const sku = activeSkus(picker.product).find((s) => s.id === picker.skuId);
                if (sku) addSku(picker.product, sku, Math.max(1, picker.qty || 1));
                setPicker(null);
              }}>
                Add {Math.max(1, picker.qty || 1)} to order
              </Btn>
            </div>
          )}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 16px' }}>
            <ProdThumb src={picker.product.baseImage} px={56}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em' }}>{picker.product.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {window.formatPriceRange(picker.product)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
            Variant
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeSkus(picker.product).map((s) => {
              const on = picker.skuId === s.id;
              const label = skuLabel(picker.product, s) || 'Base SKU';
              const inOrder = (window.__owItems || []).find?.((i) => i.skuId === s.id);
              return (
                <button key={s.id} type="button" onClick={() => setPicker({ ...picker, skuId: s.id })}
                  className={`ow-sku ${on ? 'is-on' : ''}`}>
                  <span className="ow-sku__radio"/>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
                  </span>
                  <span className="num" style={{ fontSize: 13.5, fontWeight: 500 }}>{moneyUSD(s.price)}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', flex: 'none' }}>
              Quantity
            </div>
            <div className="ow-qty" style={{ height: 34 }}>
              <button type="button" className="iconbtn" style={{ borderRadius: '8px 0 0 8px', height: 32 }}
                onClick={() => setPicker({ ...picker, qty: Math.max(1, (picker.qty || 1) - 1) })}>
                <Icon name="minus" size={12}/>
              </button>
              <input value={picker.qty}
                onChange={(e) => setPicker({ ...picker, qty: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                onFocus={(e) => e.target.select()}
                style={{ width: 56 }}/>
              <button type="button" className="iconbtn" style={{ borderRadius: '0 8px 8px 0', height: 32 }}
                onClick={() => setPicker({ ...picker, qty: (picker.qty || 1) + 1 })}>
                <Icon name="plus" size={12}/>
              </button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              = <strong style={{ color: 'var(--color-text-primary)', fontSize: 15 }}>
                {moneyUSD((activeSkus(picker.product).find((s) => s.id === picker.skuId)?.price || 0) * Math.max(1, picker.qty || 1))}
              </strong>
            </div>
          </div>

          {/* Bundle component preview */}
          {picker.product.productType === 'BUNDLE' && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Each kit contains</div>
              {resolveBundleLines(picker.product).map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-text-secondary)', padding: '2px 0' }}>
                  <span>{l.name}</span><span className="num">× {l.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ─── Step 3 — Type & discount ──────────────────────────────────────────────
// order_type: SAMPLE DEVICE / PRODUCT DEVICE (an order attribute, mall.md).
// Discount: percent ⊕ amount — strictly one mode active at a time.
const StepTypeDiscount = ({ orderType, setOrderType, discountPercent, setDiscountPercent, oriAmount }) => {
  const discountValue = Math.round(oriAmount * (discountPercent / 100) * 100) / 100;
  const total = Math.max(0, oriAmount - discountValue);
  const free = total <= 0 && oriAmount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Order type */}
      <div className="tds-card">
        <div className="tds-card__header">
          <div>
            <div className="tds-card__title">Order type</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Whether this order ships evaluation samples or production devices.</div>
          </div>
        </div>
        <div className="tds-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {window.ORDER_TYPES.map((t) => {
              const on = orderType === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setOrderType(t.id)}
                  className={`prod-cat-card ${on ? 'is-on' : ''}`}>
                  <div className="prod-cat-card__label">{t.label}</div>
                  <div className="prod-cat-card__hint">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discount — percentage only; amount is the computed value */}
      <div className="tds-card">
        <div className="tds-card__header">
          <div>
            <div className="tds-card__title">Discount</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Percentage off the original amount. The dollar discount is computed automatically.</div>
          </div>
        </div>
        <div className="tds-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input type="number" min="0" max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
                  style={{ width: 80, fontSize: 28, fontWeight: 600, padding: '4px 8px', border: '1px solid var(--color-border-default)', borderRadius: 8, fontFamily: 'inherit', color: 'var(--color-text-primary)', background: 'var(--color-bg-2)', fontVariantNumeric: 'tabular-nums' }}/>
                <span style={{ fontSize: 24, color: 'var(--color-text-secondary)', fontWeight: 500 }}>%</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>off original amount</span>
              </div>
              <input type="range" min="0" max="100" value={discountPercent}
                onChange={e => setDiscountPercent(parseInt(e.target.value, 10))}
                style={{ width: '100%', marginTop: 14, accentColor: 'var(--color-primary-700)' }}/>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {[0, 5, 10, 25, 50, 100].map(p => (
                  <button key={p} type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={`perm-fchip ${discountPercent === p ? 'is-on' : ''}`}>
                    {p === 0 ? 'None' : p === 100 ? 'Free' : `${p}%`}
                  </button>
                ))}
              </div>

              {free && (
                <div className="notice" style={{ marginTop: 16, background: 'var(--color-success-50)', borderColor: 'oklch(58% 0.14 152 / 0.25)', color: 'var(--color-success-700)' }}>
                  <Icon name="sparkles" size={14}/>
                  <div>
                    <strong>Complimentary order.</strong> No payment required — the order skips <em>Pending payment</em> and goes straight to <em>Pending shipment</em>.
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: 16, alignSelf: 'start' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 10 }}>Order total</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Original amount</span>
                  <span className="num">{moneyUSD(oriAmount)}</span>
                </div>
                {discountValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--color-success-700)' }}>
                    <span>Discount ({discountPercent}%)</span>
                    <span className="num">− {moneyUSD(discountValue)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--color-border-default)', margin: '6px 0' }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 600, alignItems: 'baseline' }}>
                  <span>Total</span>
                  <span className="num" style={{ color: free ? 'var(--color-success-700)' : 'var(--color-text-primary)' }}>{free ? 'FREE' : moneyUSD(total)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  Next status: <strong style={{ color: free ? 'var(--color-info-700)' : 'var(--color-warning-700)' }}>{free ? 'Pending shipment' : 'Pending payment'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

};

// ─── Step 4 — Review ───────────────────────────────────────────────────────
const StepReview = ({ customer, items, orderType, discountMode, discountPercent, discountAmount, shipping, remark, setRemark }) => {
  const oriAmount = items.reduce((n, i) => n + i.oriPrice * i.qty, 0);
  const discountValue = Math.round(oriAmount * (discountPercent / 100) * 100) / 100;
  const total = Math.max(0, oriAmount - discountValue);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="tds-card">
        <div className="tds-card__header"><div className="tds-card__title">Review order</div></div>
        <div className="tds-card__body">
          <dl className="kvgrid" style={{ gridTemplateColumns: '120px 1fr' }}>
            <dt>Customer</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CompanyLogo name={customer.name} size={24}/> <strong>{customer.name}</strong>
            </dd>
            <dt>Order type</dt><dd>{window.ORDER_TYPE_LABEL[orderType]}</dd>
            <dt>Ship to</dt><dd>{shipping.name} · {shipping.method}<br/><span style={{ color: 'var(--color-text-tertiary)' }}>{shipping.address}</span></dd>
          </dl>
        </div>
      </div>

      <div className="tds-card">
        <div className="tds-card__header"><div className="tds-card__title">Order items</div></div>
        <div style={{ padding: 0 }}>
          <table className="tds-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <React.Fragment key={i.id}>
                  <tr>
                    <td>
                      <strong>{i.name}</strong>{i.variantLabel ? <span style={{ color: 'var(--color-text-tertiary)' }}> · {i.variantLabel}</span> : null}
                      {i.bundleItems && <Badge tone="accent" style={{ marginLeft: 8 }}>Bundle</Badge>}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{moneyUSD(i.oriPrice)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{i.qty}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{moneyUSD(i.oriPrice * i.qty)}</td>
                  </tr>
                  {(i.bundleItems || []).map((b, bi) => (
                    <tr key={bi} className="ow-bundle-row">
                      <td colSpan="3" style={{ paddingLeft: 34, fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>↳ {b.name}</td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>× {b.qty * i.qty}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>Original amount</td>
                <td className="num" style={{ textAlign: 'right' }}>{moneyUSD(oriAmount)}</td>
              </tr>
              {discountValue > 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', color: 'var(--color-success-700)' }}>
                    Discount ({discountPercent}%)
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--color-success-700)' }}>− {moneyUSD(discountValue)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15 }}>Total</td>
                <td className="num" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }}>
                  {total === 0 ? 'FREE' : moneyUSD(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="tds-card">
        <div className="tds-card__body">
          <Field label="Remark" hint="Visible only to Carbon staff.">
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="Optional — e.g. quarterly refresh batch, evaluation units…"/>
          </Field>
        </div>
      </div>
    </div>
  );
};

// ─── Wizard shell ──────────────────────────────────────────────────────────
const OrderWizard = ({ customers, products, onCancel, onComplete }) => {
  const toast = useToast();
  const prods = products || window.SEED_PRODUCTS || [];
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [shipping, setShipping] = useState({ name: '', address: '', method: 'Standard ground' });
  const [items, setItems] = useState([]);
  const [orderType, setOrderType] = useState('PRODUCT');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [remark, setRemark] = useState('');

  const customer = customers.find(c => c.id === customerId);
  const oriAmount = items.reduce((n, i) => n + i.oriPrice * i.qty, 0);
  const discountValue = Math.round(oriAmount * (discountPercent / 100) * 100) / 100;
  const total = Math.max(0, oriAmount - discountValue);

  const canNext = useMemo(() => {
    if (step === 1) return !!customerId && !!shipping.address.trim();
    if (step === 2) return items.length > 0 && items.every(i => i.qty > 0);
    if (step === 3) return true;
    return true;
  }, [step, customerId, shipping, items]);

  const submit = () => {
    if (!customer) return;
    const num = `SO-2026-${String(200 + Math.floor(Math.random() * 99)).padStart(4, '0')}`;
    const status = total === 0 ? 'PENDING_SHIP' : 'PENDING_PAYMENT';
    const order = {
      id: 'o-' + Math.random().toString(36).slice(2, 8),
      number: num,
      partyId: customer.id,
      customerName: customer.name,
      orderType,
      createdAt: new Date().toISOString(),
      createdBy: 'jordan.d@carbon',
      status,
      items,
      discountPercent: discountPercent > 0 ? discountPercent : null,
      discountAmount: discountPercent > 0 ? Math.round(oriAmount * (discountPercent / 100) * 100) / 100 : null,
      remark,
      shipping,
    };
    toast({ kind: 'success', title: `Order ${num} created`, msg: status === 'PENDING_PAYMENT' ? 'Pending payment' : 'No payment required · ready to ship' });
    onComplete(order);
  };

  return (
    <div className="page">
      <window.TitleBar
        title="New order"
        subtitle="Create a customer order from the product catalog."
        actions={<Btn variant="ghost" onClick={onCancel}>Cancel</Btn>}
      />

      <OrderStepper step={step}/>

      <div className="wizard-grid">
        <div>
          {step === 1 && <StepCustomer customers={customers} customerId={customerId} setCustomerId={setCustomerId} shipping={shipping} setShipping={setShipping}/>}
          {step === 2 && <StepItems items={items} setItems={setItems} products={prods}/>}
          {step === 3 && <StepTypeDiscount
            orderType={orderType} setOrderType={setOrderType}
            discountPercent={discountPercent} setDiscountPercent={setDiscountPercent}
            oriAmount={oriAmount}/>}
          {step === 4 && customer && <StepReview customer={customer} items={items} orderType={orderType}
            discountPercent={discountPercent}
            shipping={shipping} remark={remark} setRemark={setRemark}/>}

          <window.WizardFooter
            step={step} totalSteps={4}
            onBack={() => setStep(s => Math.max(1, s - 1))}
            onNext={() => setStep(s => s + 1)} nextDisabled={!canNext}
            onFinal={submit}
            finalLabel="Create order" />
          </div>

        {/* Summary aside */}
        <aside className="wizard-aside">
          <h4>Order summary</h4>
          <dl>
            <dt>Customer</dt><dd>{customer ? customer.name : <span className="muted">—</span>}</dd>
            <dt>Type</dt><dd>{window.ORDER_TYPE_LABEL[orderType]}</dd>
            <dt>Items</dt><dd>{(() => {
              const distinct = new Set(items.map(i => i.productId)).size;
              return distinct === 0 ? <span className="muted">—</span> : `${distinct} product${distinct === 1 ? '' : 's'}`;
            })()}</dd>
            <dt>Units</dt><dd className="num">{items.reduce((n, i) => n + i.qty, 0)}</dd>
            <dt>Original</dt><dd className="num">{moneyUSD(oriAmount)}</dd>
            {discountValue > 0 && <><dt>Discount</dt><dd className="num" style={{ color: 'var(--color-success-700)' }}>− {moneyUSD(discountValue)}</dd></>}
            <dt style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)' }}>Total</dt>
            <dd style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)', fontWeight: 600, color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }} className="num">
              {total === 0 ? 'FREE' : moneyUSD(total)}
            </dd>
          </dl>
        </aside>
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const orderWizardStyles = `
.ow-thumb { display: inline-grid; place-items: center; border-radius: 8px; background: #fff; border: 1px solid var(--color-border-subtle); overflow: hidden; flex: none; }
.ow-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ow-thumb--empty { background: var(--color-bg-3); color: var(--color-text-tertiary); }
.ow-line { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; }
.ow-qty { display: inline-flex; align-items: center; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-2); height: 32px; width: 124px; flex: none; }
.ow-qty input { flex: 1; width: 0; border: 0; background: transparent; text-align: center; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 600; color: var(--color-text-primary); outline: none; }
.ow-sku { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); cursor: pointer; font-family: inherit; transition: all var(--duration-fast); }
.ow-sku:hover { border-color: var(--color-border-strong); }
.ow-sku.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.08); }
.ow-sku__radio { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid var(--color-border-strong); flex: none; transition: all var(--duration-fast); }
.ow-sku.is-on .ow-sku__radio { border-color: var(--color-primary-700); border-width: 5px; }
.ow-bundle-row td { border-top: 0 !important; padding-top: 0 !important; padding-bottom: 6px !important; }
`;
if (typeof document !== 'undefined' && !document.getElementById('order-wizard-styles')) {
  const s = document.createElement('style');
  s.id = 'order-wizard-styles';
  s.textContent = orderWizardStyles;
  document.head.appendChild(s);
}

window.OrderWizard = OrderWizard;
