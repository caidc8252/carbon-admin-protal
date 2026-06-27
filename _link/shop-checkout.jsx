/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, useToast,
   CompanyLogo, ModelTile, resolveLine, fulfillmentOf, resolveVariantLabel,
   emptyDevices, FULFILL_TONE */
const { useState, useMemo, useEffect } = React;

// ─── Checkout wizard ───────────────────────────────────────────
// Full-page flow that mirrors the Orders → New Order wizard:
//   1. Customer          (search + pick + shipping address)
//   2. Items & quantities (pre-filled from the cart; edit qty / remove)
//   3. Pricing & discount (0–100% discount; 100% = complimentary)
//   4. Review & create    (line items + notes → builds the order)
// Submit → builds an Order from cart lines + customer + shipping + discount,
//          calls onCreateOrder, clears cart, navigates to OrderDetail.

const money = (n) => '$' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Stepper (re-uses .stepper classes from the main stylesheet) ───
const CheckoutStepper = ({ step }) => {
  const items = [
    { n: 1, sub: 'Step 1', label: 'Items & quantities' },
    { n: 2, sub: 'Step 2', label: 'Customer' },
    { n: 3, sub: 'Done',   label: 'Review & create' },
  ];
  return (
    <div className="stepper">
      {items.map((it, i) => (
        <React.Fragment key={it.n}>
          <div className={`stepper__item ${step === it.n ? 'is-active' : ''} ${step > it.n ? 'is-done' : ''}`}>
            <div className="stepper__dot">{step > it.n ? <Icon name="check" size={14}/> : it.n}</div>
            <div className="stepper__lbl"><small>{it.sub}</small><strong>{it.label}</strong></div>
          </div>
          {i < items.length - 1 && <div className={`stepper__bar ${step > it.n ? 'is-done' : ''}`}/>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Step 1 — Customer + shipping ──────────────────────────────
const CkStepCustomer = ({ customers, customerId, setCustomerId, shipping, setShipping }) => {
  const [q, setQ] = useState('');
  const filtered = customers.filter((c) =>
    !q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || (c.address || '').toLowerCase().includes(q.toLowerCase())
  );
  const selected = customers.find((c) => c.id === customerId);

  useEffect(() => {
    if (selected && !shipping.address) {
      const admin = (selected.operators || []).find((o) => o.role === 'Admin') || (selected.operators || [])[0];
      setShipping({ name: admin?.name || '', address: selected.address || '', method: 'Standard ground' });
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
        {!selected ? (
          <>
            <Input prefix={<Icon name="search" size={14}/>} placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} size="md"/>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflow: 'auto', border: '1px solid var(--color-border-default)', borderRadius: 10, padding: 6 }}>
              {filtered.length === 0 && <div className="empty" style={{ padding: 24 }}>No customers found.</div>}
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setCustomerId(c.id)}
                  className="role-item"
                  style={{ borderBottom: 'none', borderRadius: 8 }}>
                  <CompanyLogo name={c.name} size={32}/>
                  <div className="role-item__main">
                    <div className="role-item__name">{c.name}</div>
                    <div className="role-item__meta">{(c.address || '').split(',').slice(-2).join(',').trim()} · {(c.operators || []).length} operators</div>
                  </div>
                  <Badge tone={c.status === 'Active' ? 'success' : c.status === 'Onboarding' ? 'info' : 'error'} dot>{c.status}</Badge>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--color-primary-700)', borderRadius: 10, background: 'var(--color-bg-2)' }}>
            <CompanyLogo name={selected.name} size={36}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{(selected.address || '').split(',').slice(-2).join(',').trim()} · {(selected.operators || []).length} operators</div>
            </div>
            <Badge tone={selected.status === 'Active' ? 'success' : selected.status === 'Onboarding' ? 'info' : 'error'} dot>{selected.status}</Badge>
            <Btn variant="secondary" size="sm" icon="refresh" onClick={() => { setCustomerId(''); setShipping({ name: '', address: '', method: 'Standard ground' }); setQ(''); }}>Change</Btn>
          </div>
        )}

        {selected && (
          <div style={{ marginTop: 18, padding: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={13}/> Shipping address
            </div>
            <div className="form-grid form-grid--2" style={{ gap: 14 }}>
              <Field label="Recipient">
                <Input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} placeholder="Name"/>
              </Field>
              <Field label="Method">
                <Select value={shipping.method} onChange={(e) => setShipping({ ...shipping, method: e.target.value })}>
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
                <Textarea value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} rows={2}/>
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Step 2 — Items & quantities (from cart) ───────────────────
const CkStepItems = ({ items, onSetQty, onRemove, onSetUnitPrice, onBackToMall, isBuyNow }) => (
  <div className="tds-card">
    <div className="tds-card__header">
      <div>
        <div className="tds-card__title">Items & quantities</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>These are the items in your cart. Adjust quantities or remove lines before checkout.</div>
      </div>
      <div className="page__actions">
        <Btn variant="ghost" size="sm" icon={isBuyNow ? 'cart' : 'chevL'} onClick={onBackToMall}>
          {isBuyNow ? 'Add to cart & continue order' : 'Continue order'}
        </Btn>
      </div>
    </div>
    <div className="tds-card__body">
      {items.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, border: '1px dashed var(--color-border-default)', borderRadius: 10 }}>
          Your cart is empty. <a onClick={onBackToMall} style={{ color: 'var(--color-primary-700)', cursor: 'pointer' }}>Browse Goods</a> to add items.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ line, product, variant }) => {
            const model = (window.DEVICE_MODELS || []).find((m) => m.id === product.deviceModelId);
            const img = variant.image || product.baseImage;
            const variantLabel = resolveVariantLabel(product, variant);
            const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
            const bits = [line.integrationMode, variantLabel].filter(Boolean).join(' · ');
            const fk = fulfillmentOf(product);
            // Stock cap — null = unlimited. Clamps the +/input so the user can't
            // request more than the variant has in stock.
            const maxQty = variant.stock != null ? variant.stock : Infinity;
            const atMax = line.qty >= maxQty;
            const overMax = line.qty > maxQty;
            return (
              <div key={line.uid} className="ckw-item">
                <div className="ckw-item__img">
                  {img ? <img src={img} alt=""/>
                    : product.type === 'DEVICE' && model ? <ModelTile model={model} px={46}/>
                    : <div className="ckw-item__ph">📦</div>}
                </div>
                <div className="ckw-item__main">
                  <div className="ckw-item__name">
                    <span className="ckw-item__name-txt">{product.name}</span>
                    <Badge tone={fk === 'SAMPLE' ? 'accent' : fk === 'PRODUCTION' ? 'success' : 'neutral'} dot>
                      {fk === 'SAMPLE' ? 'Sample' : fk === 'PRODUCTION' ? 'Production' : 'Other'}
                    </Badge>
                  </div>
                  {bits && <div className="ckw-item__variant">{bits}</div>}
                </div>
                <div className="ckw-item__controls">
                  <div className="ckw-item__inputs">
                    <div className="ckw-qty">
                      <button className="iconbtn" style={{ borderRadius: '8px 0 0 8px', height: 30 }}
                        disabled={line.qty <= 1}
                        onClick={() => { if (line.qty > 1) onSetQty(line.uid, line.qty - 1); }} aria-label="Decrease"><Icon name="minus" size={12}/></button>
                      <input value={line.qty}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value || '1', 10);
                          if (Number.isNaN(raw)) { onSetQty(line.uid, 1); return; }
                          onSetQty(line.uid, Math.min(maxQty, Math.max(1, raw)));
                        }}
                        style={{ width: 0, flex: 1, border: 0, background: 'transparent', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none' }}/>
                      <button className="iconbtn" style={{ borderRadius: '0 8px 8px 0', height: 30 }}
                        disabled={atMax}
                        title={atMax && maxQty !== Infinity ? `Only ${maxQty} in stock` : undefined}
                        onClick={() => onSetQty(line.uid, Math.min(maxQty, line.qty + 1))} aria-label="Increase"><Icon name="plus" size={12}/></button>
                    </div>
                    <div className="ckw-price-edit" title="Unit price — editable">
                      <span>$</span>
                      <input type="number" min="0" step="0.01" value={unit}
                        onChange={(e) => onSetUnitPrice(line.uid, parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        aria-label="Unit price"/>
                    </div>
                  </div>
                  <div className="ckw-item__line-total">
                    {money(unit * line.qty)} · {line.qty} ea
                    {maxQty !== Infinity && (atMax || overMax) && (
                      <span className={`ckw-qty-cap ${overMax ? 'is-over' : ''}`}
                        title={overMax ? `${line.qty} ordered but only ${maxQty} in stock` : `Only ${maxQty} in stock`}>
                        {overMax ? `Only ${maxQty} left` : `Max ${maxQty}`}
                      </span>
                    )}
                  </div>
                </div>
                <button className="iconbtn" onClick={() => onRemove(line.uid)}
                  disabled={items.length <= 1}
                  title={items.length <= 1 ? "Can't remove the last item — at least one is required to check out" : 'Remove'}><Icon name="trash" size={13}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

// ─── Step 3 — Pricing & discount ───────────────────────────────
const CkStepPricing = ({ subtotal, discountPct, setDiscountPct }) => {
  const discountAmount = subtotal * (discountPct / 100);
  const total = subtotal - discountAmount;
  const free = total <= 0;
  return (
    <div className="tds-card">
      <div className="tds-card__header">
        <div>
          <div className="tds-card__title">Pricing & discount</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>You may apply any discount from 0% up to 100% (complimentary).</div>
        </div>
      </div>
      <div className="tds-card__body">
        <div className="ckw-discount">
          <span className="ckw-discount__lbl">Discount</span>
          <div className="ckw-discount__chips">
            {[0, 5, 10, 25, 50, 100].map((p) => (
              <button key={p} onClick={() => setDiscountPct(p)}
                className={`perm-fchip ${discountPct === p ? 'is-on' : ''}`}>
                {p === 100 ? 'Free' : `${p}%`}
              </button>
            ))}
          </div>
          <div className="ckw-discount__custom">
            <input type="number" min="0" max="100" value={discountPct}
              onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
              aria-label="Custom discount percent"/>
            <span>% off</span>
          </div>
        </div>
        <input type="range" min="0" max="100" value={discountPct}
          onChange={(e) => setDiscountPct(parseInt(e.target.value, 10))}
          className="ckw-discount__slider" aria-label="Discount slider"/>
      </div>
    </div>
  );
};

// ─── Step 4 — Review ───────────────────────────────────────────
const CkStepReview = ({ customer, items, discountPct, shipping, notes, setNotes }) => {
  const subtotal = items.reduce((n, { line, variant }) => {
    const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
    return n + unit * line.qty;
  }, 0);
  const total = subtotal * (1 - discountPct / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="tds-card">
        <div className="tds-card__header"><div className="tds-card__title">Review order</div></div>
        <div className="tds-card__body">
          <dl className="kvgrid" style={{ gridTemplateColumns: '120px 1fr' }}>
            <dt>Customer</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CompanyLogo name={customer.name} size={24}/> <strong>{customer.name}</strong>
            </dd>
            <dt>Ship to</dt><dd>{shipping.name} · {shipping.method}<br/><span style={{ color: 'var(--color-text-tertiary)' }}>{shipping.address}</span></dd>
          </dl>
        </div>
      </div>

      <div className="tds-card">
        <div className="tds-card__header"><div className="tds-card__title">Line items</div></div>
        <div style={{ padding: 0 }}>
          <table className="tds-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th style={{ textAlign: 'right' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ line, product, variant }) => {
                const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
                const bits = [line.integrationMode, resolveVariantLabel(product, variant)].filter(Boolean).join(' · ');
                return (
                  <tr key={line.uid}>
                    <td><strong>{product.name}</strong></td>
                    <td>{bits || '—'}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{money(unit)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{line.qty}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{money(unit * line.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', color: 'var(--color-text-secondary)', padding: '10px 14px' }}>Subtotal</td>
                <td className="num" style={{ textAlign: 'right', padding: '10px 14px' }}>{money(subtotal)}</td>
              </tr>
              {discountPct > 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '10px 14px' }}>Discount ({discountPct}%)</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '10px 14px' }}>− {money(subtotal * discountPct / 100)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, padding: '12px 14px', borderTop: '1px solid var(--color-border-subtle)' }}>Total</td>
                <td className="num" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, padding: '12px 14px', borderTop: '1px solid var(--color-border-subtle)', color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }}>
                  {total === 0 ? 'FREE' : money(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="tds-card">
        <div className="tds-card__body">
          <Field label="Internal notes" hint="Visible only to Carbon staff.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional — e.g. quarterly refresh batch, evaluation units…"/>
          </Field>
        </div>
      </div>
    </div>
  );
};

// ─── Wizard shell ──────────────────────────────────────────────
const CheckoutWizard = ({ lines, products, customers, onSetQty, onRemove, onSetUnitPrice, onCreateOrder, onClearCart, onCancel, onBackToMall, isBuyNow }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [shipping, setShipping] = useState({ name: '', address: '', method: 'Standard ground' });
  const [discountPct, setDiscountPct] = useState(0);
  const [notes, setNotes] = useState('');

  const customer = customers.find((c) => c.id === customerId);

  // Resolve cart contents (live from the cart)
  const items = useMemo(
    () => lines.map((l) => ({ line: l, ...resolveLine(l, products) })).filter((x) => x.product && x.variant),
    [lines, products]
  );
  const subtotal = items.reduce((n, { line, variant }) => {
    const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
    return n + unit * line.qty;
  }, 0);
  const total = subtotal * (1 - discountPct / 100);

  const canNext = useMemo(() => {
    if (step === 1) return items.length > 0;
    if (step === 2) return !!customerId && !!shipping.address.trim() && !!shipping.name.trim();
    return true;
  }, [step, customerId, shipping, items]);

  const submit = () => {
    if (!customer) return;
    const orderItems = items.map(({ line, product, variant }, idx) => {
      const variantLabel = resolveVariantLabel(product, variant) || null;
      const integrationMode = line.integrationMode || null;
      const unitPrice = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
      const typeLabel = [integrationMode, variantLabel].filter(Boolean).join(' · ') || 'Stand-alone';
      return {
        id: 'li-' + (idx + 1),
        productId: product.id,
        productNameSnapshot: product.name,
        variantId: variant.id,
        variantLabelSnapshot: variantLabel,
        integrationModeSnapshot: integrationMode,
        productType: product.type,
        deviceVariant: product.deviceVariant,
        modelId: product.deviceModelId || `non-device-${product.id}`,
        modelName: product.name + (variantLabel ? ` · ${variantLabel}` : '') + (integrationMode ? ` · ${integrationMode}` : ''),
        unitPrice,
        qty: line.qty,
        type: typeLabel,
        devices: product.type === 'DEVICE' ? (window.emptyDevices ? window.emptyDevices(line.qty) : []) : [],
      };
    });

    const now = new Date();
    const num = `SO-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const status = total === 0 ? 'Awaiting shipment' : 'Awaiting payment';
    const order = {
      id: 'o-' + Math.random().toString(36).slice(2, 9),
      number: num,
      customerId: customer.id,
      customerName: customer.name,
      createdAt: now.toISOString(),
      createdBy: 'sarah@npt',
      status,
      items: orderItems,
      discountPct,
      notes,
      shipping: { ...shipping },
      events: [
        { at: now.toISOString(), kind: 'created', by: 'sarah@npt', text: `Order created from cart · ${items.length} line items` },
        ...(total === 0
          ? [{ at: now.toISOString(), kind: 'free', by: 'sarah@npt', text: 'Marked as complimentary · 100% discount' }]
          : [{ at: now.toISOString(), kind: 'invoice', by: 'system', text: 'Invoice issued' }]),
      ],
    };
    onCreateOrder(order);
    onClearCart();
    toast({ kind: 'success', title: `Order ${num} created`, msg: status === 'Awaiting payment' ? 'Invoice issued · awaiting payment' : 'No payment required · ready to ship' });
  };

  return (
    <div className="page">
      <button type="button" className="ckw-back" onClick={onCancel}>
        <Icon name="chevL" size={14}/> Back to Goods
      </button>
      <div className="page__head">
        <div>
          <h1 className="page__title">New order</h1>
          <p className="page__sub">Create an order for the items in your cart.</p>
        </div>
      </div>

      <div className="ckw-stepper-sticky">
        <CheckoutStepper step={step}/>
      </div>

      <div className="wizard-grid">
        <div>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CkStepItems items={items} onSetQty={onSetQty} onRemove={onRemove} onSetUnitPrice={onSetUnitPrice} onBackToMall={onBackToMall} isBuyNow={isBuyNow}/>
              <CkStepPricing subtotal={subtotal} discountPct={discountPct} setDiscountPct={setDiscountPct}/>
            </div>
          )}
          {step === 2 && <CkStepCustomer customers={customers} customerId={customerId} setCustomerId={setCustomerId} shipping={shipping} setShipping={setShipping}/>}
          {step === 3 && customer && <CkStepReview customer={customer} items={items} discountPct={discountPct} shipping={shipping} notes={notes} setNotes={setNotes}/>}

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))} icon="chevL">Previous step</Btn>
            {step < 3 ? (
              <Btn variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)} iconRight="chevR">Next step</Btn>
            ) : (
              <Btn variant="primary" icon="check" onClick={submit} disabled={items.length === 0}>Create order</Btn>
            )}
          </div>
        </div>

        {/* Summary aside */}
        <aside className="wizard-aside">
          <h4>Order summary</h4>
          <dl>
            <dt>Customer</dt><dd>{customer ? customer.name : <span className="muted">—</span>}</dd>
            <dt>Lines</dt><dd className="num">{items.length}</dd>
            <dt>Units</dt><dd className="num">{items.reduce((n, x) => n + x.line.qty, 0)}</dd>
            <dt>Subtotal</dt><dd className="num">{money(subtotal)}</dd>
            {discountPct > 0 && <><dt>Discount</dt><dd className="num" style={{ color: 'var(--color-success-700)' }}>− {money(subtotal * discountPct / 100)}</dd></>}
            <dt style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)' }}>Total</dt>
            <dd style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)', fontWeight: 600, color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }} className="num">
              {total === 0 ? 'FREE' : money(total)}
            </dd>
          </dl>
          <div style={{ marginTop: 14, padding: 10, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Next:</strong> once created, the order moves to {total === 0 ? 'Awaiting shipment' : 'Awaiting payment'} and appears under Commerce → Orders.
          </div>
        </aside>
      </div>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────
const checkoutStyles = `
.ckw-back { display: inline-flex; align-items: center; gap: 4px; background: transparent; border: 0; color: var(--color-text-secondary); font-family: inherit; font-size: 13px; cursor: pointer; padding: 4px 0; margin-bottom: 10px; }
.ckw-back:hover { color: var(--color-text-primary); }
.ckw-discount { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ckw-discount__lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
.ckw-discount__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ckw-discount__custom { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; height: 32px; padding: 0 10px; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-2); }
.ckw-discount__custom input { width: 42px; border: 0; background: transparent; outline: none; text-align: right; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.ckw-discount__custom input::-webkit-inner-spin-button, .ckw-discount__custom input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.ckw-discount__custom span { font-size: 12.5px; color: var(--color-text-tertiary); }
.ckw-discount__slider { width: 100%; margin-top: 14px; accent-color: var(--color-primary-700); }
.ckw-stepper-sticky { position: sticky; top: 0; z-index: 30; background: var(--color-bg-1); padding: 6px 0 10px; margin-bottom: 4px; }
.ckw-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 10px; }
.ckw-item__img { width: 56px; height: 56px; flex: none; display: grid; place-items: center; background: #fff; border: 1px solid var(--color-border-subtle); border-radius: 8px; overflow: hidden; }
.ckw-item__img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ckw-item__ph { font-size: 24px; }
.ckw-item__main { flex: 1; min-width: 0; }
.ckw-item__name { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
.ckw-item__name-txt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ckw-item__variant { font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 3px; }
.ckw-qty { display: inline-flex; align-items: center; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-2); height: 32px; width: 132px; flex: none; }
.ckw-item__controls { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
.ckw-item__inputs { display: flex; align-items: center; gap: 10px; }
.ckw-item__line-total { font-size: 10.5px; color: var(--color-text-tertiary); text-align: right; font-variant-numeric: tabular-nums; }
.ckw-qty-cap { display: inline-block; margin-left: 8px; font-size: 10px; font-weight: 500; padding: 1px 6px; border-radius: 999px; color: var(--color-warning-700); background: var(--color-warning-50, oklch(96% 0.04 80)); border: 1px solid color-mix(in oklab, var(--color-warning-700) 18%, transparent); line-height: 1.4; }
.ckw-qty-cap.is-over { color: var(--color-danger-700, oklch(48% 0.18 25)); background: var(--color-danger-50, oklch(96% 0.04 25)); border-color: color-mix(in oklab, var(--color-danger-700, oklch(48% 0.18 25)) 18%, transparent); }
.ckw-item__price { text-align: right; min-width: 116px; flex: none; }
.ckw-price-edit { display: inline-flex; align-items: stretch; height: 32px; border: 1px solid var(--color-border-default); border-radius: 8px; background: var(--color-bg-2); overflow: hidden; width: 116px; }
.ckw-price-edit span { width: 28px; height: 100%; display: grid; place-items: center; font-size: 12px; font-weight: 500; color: var(--color-text-tertiary); background: var(--color-bg-3); border-right: 1px solid var(--color-border-default); flex: none; }
.ckw-price-edit input { flex: 1; width: auto; min-width: 0; border: 0; background: transparent; outline: none; text-align: center; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; padding: 0 6px; }
.ckw-price-edit input::-webkit-inner-spin-button, .ckw-price-edit input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
`;

if (typeof document !== 'undefined' && !document.getElementById('checkout-styles')) {
  const s = document.createElement('style');
  s.id = 'checkout-styles';
  s.textContent = checkoutStyles;
  document.head.appendChild(s);
}

window.CheckoutWizard = CheckoutWizard;
