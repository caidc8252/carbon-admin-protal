/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, useToast,
   CompanyLogo, ModelTile, resolveLine, resolveVariantLabel */
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
// ─── Stepper (ui-spec §7.3A 变体 A · 卡片，复用 shared.jsx 的 <StepperCard>) ──
const CheckoutStepper = ({ step }) => (
  <window.StepperCard
    steps={[
      { label: 'Items & quantities' },
      { label: 'Customer' },
      { label: 'Review & create' },
    ]}
    current={step}/>
);

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
      
    </div>
    <div className="tds-card__body">
      {items.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, border: '1px dashed var(--color-border-default)', borderRadius: 10 }}>
          Your cart is empty. <a onClick={onBackToMall} style={{ color: 'var(--color-primary-700)', cursor: 'pointer' }}>Browse the Catalog</a> to add items.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ line, product, variant }) => {
            const model = (window.DEVICE_MODELS || []).find((m) => m.id === product.deviceModelId);
            const img = variant.image || product.baseImage;
            const variantLabel = resolveVariantLabel(product, variant);
            const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
            const bits = variantLabel;
            const maxQty = Infinity;
            const atMax = false;
            const overMax = false;
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
                    {product.productType === 'BUNDLE' && <Badge tone="accent">Bundle</Badge>}
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
const CkStepPricing = ({ subtotal, discountMode, setDiscountMode, discountPct, setDiscountPct, discountAmt, setDiscountAmt }) => {
  const pctValue = subtotal * (discountPct / 100);
  const amtValue = Math.min(discountAmt, subtotal);
  const discountValue = discountMode === 'AMOUNT' ? amtValue : pctValue;
  const total = Math.max(0, subtotal - discountValue);
  const free = subtotal > 0 && total <= 0;
  const effPct = subtotal > 0 ? Math.round((discountValue / subtotal) * 100) : 0;
  const pickPercent = () => { setDiscountMode('PERCENT'); setDiscountAmt(0); };
  const pickAmount  = () => { setDiscountMode('AMOUNT'); setDiscountPct(0); };
  return (
    <div className="tds-card">
      <div className="tds-card__header">
        <div>
          <div className="tds-card__title">Price &amp; discount</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Apply a discount by percentage <em>or</em> a fixed amount — only one can be used.</div>
        </div>
      </div>
      <div className="tds-card__body">
        <div className="ckw-dmode" role="radiogroup" aria-label="Discount type">
          <button type="button" role="radio" aria-checked={discountMode === 'PERCENT'}
            className={`ckw-dmode__opt ${discountMode === 'PERCENT' ? 'is-on' : ''}`} onClick={pickPercent}>
            <span className="ckw-dmode__radio"/><span>By percentage</span>
          </button>
          <button type="button" role="radio" aria-checked={discountMode === 'AMOUNT'}
            className={`ckw-dmode__opt ${discountMode === 'AMOUNT' ? 'is-on' : ''}`} onClick={pickAmount}>
            <span className="ckw-dmode__radio"/><span>By amount</span>
          </button>
        </div>

        {discountMode === 'PERCENT' ? (
          <>
            <div className="ckw-discount">
              <div className="ckw-discount__chips">
                {[0, 5, 10, 25, 50, 100].map((p) => (
                  <button key={p} type="button" onClick={() => setDiscountPct(p)}
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
          </>
        ) : (
          <div className="ckw-discount">
            <div className="ckw-discount__chips">
              {[0, 50, 100, 250].map((a) => (
                <button key={a} type="button" onClick={() => setDiscountAmt(a)}
                  className={`perm-fchip ${discountAmt === a && !free ? 'is-on' : ''}`}>
                  ${a}
                </button>
              ))}
              <button type="button" onClick={() => setDiscountAmt(Math.round(subtotal * 100) / 100)}
                className={`perm-fchip ${free ? 'is-on' : ''}`} disabled={subtotal <= 0}>Free</button>
            </div>
            <div className="ckw-discount__custom">
              <span style={{ marginRight: 2 }}>$</span>
              <input type="number" min="0" max={subtotal} step="0.01" value={discountAmt}
                onChange={(e) => setDiscountAmt(Math.max(0, Math.min(subtotal, parseFloat(e.target.value || '0'))))}
                aria-label="Custom discount amount"/>
              <span>off</span>
            </div>
          </div>
        )}

        <div className="ckw-dsum">
          <div className="ckw-dsum__row"><span>Subtotal</span><span className="num">{money(subtotal)}</span></div>
          {discountValue > 0 && (
            <div className="ckw-dsum__row ckw-dsum__row--disc">
              <span>Discount{discountMode === 'AMOUNT' ? (effPct > 0 ? ` (≈${effPct}%)` : '') : ` (${discountPct}%)`}</span>
              <span className="num">− {money(discountValue)}</span>
            </div>
          )}
          <div className="ckw-dsum__row ckw-dsum__row--total">
            <span>Total</span>
            <span className="num" style={{ color: free ? 'var(--color-success-700)' : 'var(--color-text-primary)' }}>{free ? 'Complimentary' : money(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 4 — Review ───────────────────────────────────────────
// ─── Order-type choice — "Is this a sample order?" · REQUIRED, no default ──
const CkOrderTypeChoice = ({ orderType, setOrderType }) => {
  const chose = orderType === 'SAMPLE' || orderType === 'PRODUCT';
  const opts = [
    { id: 'PRODUCT', answer: 'No',  hint: null },
    { id: 'SAMPLE',  answer: 'Yes', hint: 'Sample / eval units' },
  ];
  return (
    <div className={`otc ${chose ? 'is-chose' : 'is-blank'}`}>
      <div className="otc__head">
        <span className="otc__label">Is this a sample order?<span className="otc__star" aria-hidden="true">*</span></span>
        <span className={`otc__pill ${chose ? 'is-chose' : ''}`}>
          {chose ? <Icon name="check" size={11}/> : <Icon name="alert" size={11}/>}
          <span>{chose ? 'Answered' : 'Please select'}</span>
        </span>
      </div>
      <div className="otc__cards" role="radiogroup" aria-label="Is this a sample order?" aria-required="true">
        {opts.map((opt) => {
          const on = orderType === opt.id;
          return (
            <button key={opt.id} type="button" role="radio" aria-checked={on}
              className={`otc__card ${on ? 'is-on' : ''}`}
              onClick={() => setOrderType(opt.id)}>
              <span className="otc__radio" aria-hidden="true"/>
              <span className="otc__card-ans">{opt.answer}</span>
              {opt.hint && <span className="otc__card-hint">{opt.hint}</span>}
              {on && <span className="otc__card-check"><Icon name="check" size={14}/></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};


const CkStepReview = ({ customer, items, discountValue, discountMode, discountPct, shipping, notes, setNotes, orderType }) => {
  const subtotal = items.reduce((n, { line, variant }) => {
    const unit = line.unitPriceOverride != null ? line.unitPriceOverride : variant.price;
    return n + unit * line.qty;
  }, 0);
  const disc = Math.min(discountValue || 0, subtotal);
  const total = Math.max(0, subtotal - disc);
  const effPct = subtotal > 0 ? Math.round((disc / subtotal) * 100) : 0;
  const discLabel = discountMode === 'AMOUNT' ? (effPct > 0 ? `Discount (≈${effPct}%)` : 'Discount') : `Discount (${discountPct}%)`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="tds-card">
        <div className="tds-card__header"><div className="tds-card__title">Review order</div></div>
        <div className="tds-card__body">
          <dl className="kvgrid" style={{ gridTemplateColumns: '120px 1fr' }}>
            <dt>Customer</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CompanyLogo name={customer.name} size={24}/> <strong>{customer.name}</strong>
            </dd>
            <dt>Order type</dt><dd>
              <Badge tone={orderType === 'SAMPLE' ? 'info' : 'neutral'}>{(window.ORDER_TYPE_LABEL || {})[orderType] || orderType}</Badge>
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
                const bits = resolveVariantLabel(product, variant);
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
              {disc > 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '10px 14px' }}>{discLabel}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '10px 14px' }}>− {money(disc)}</td>
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
  const [discountMode, setDiscountMode] = useState('PERCENT');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [orderType, setOrderType] = useState(null);
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
  const discountValue = discountMode === 'AMOUNT' ? Math.min(discountAmt, subtotal) : subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountValue);

  const canNext = useMemo(() => {
    if (step === 1) return items.length > 0 && (orderType === 'SAMPLE' || orderType === 'PRODUCT');
    if (step === 2) return !!customerId && !!shipping.address.trim() && !!shipping.name.trim();
    return true;
  }, [step, customerId, shipping, items, orderType]);

  const submit = () => {
    if (!customer) return;
    // Build new-model ORDER ITEMs: each cart line references a catalog SKU.
    const orderItems = items.map(({ line, product, variant }, idx) => {
      const sku = (product.skus || []).find((s) => s.id === variant.id)
        || { id: variant.id, price: variant.price, attributes: variant.attributes || {} };
      const unitPrice = line.unitPriceOverride != null ? line.unitPriceOverride : sku.price;
      return window.orderItemFromSku(product, { ...sku, price: unitPrice }, line.qty, idx + 1);
    });

    const now = new Date();
    const num = `SO-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const status = total === 0 ? 'PENDING_SHIP' : 'PENDING_PAYMENT';
    const order = {
      id: 'o-' + Math.random().toString(36).slice(2, 9),
      number: num,
      partyId: customer.id,
      customerName: customer.name,
      orderType: orderType || 'PRODUCT',
      createdAt: now.toISOString(),
      createdBy: 'sarah@npt',
      status,
      items: orderItems,
      discountPercent: discountMode === 'PERCENT' && discountPct > 0 ? discountPct : null,
      discountAmount: discountValue > 0 ? Math.round(discountValue * 100) / 100 : null,
      remark: notes,
      shipping: { ...shipping },
    };
    onCreateOrder(order);
    onClearCart();
    toast({ kind: 'success', title: `Order ${num} created`, msg: status === 'PENDING_PAYMENT' ? 'Pending payment' : 'No payment required · ready to ship' });
  };

  return (
    <div className="page">
      <window.TitleBar
        back
        onBack={onCancel}
        backLabel="Back to Catalog"
        title="New order"
        subtitle="Create an order for the items in your cart."
      />

      <div className="ckw-stepper-sticky">
        <CheckoutStepper step={step}/>
      </div>

      <div className="wizard-grid">
        <div>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CkOrderTypeChoice orderType={orderType} setOrderType={setOrderType}/>
              <CkStepItems items={items} onSetQty={onSetQty} onRemove={onRemove} onSetUnitPrice={onSetUnitPrice} onBackToMall={onBackToMall} isBuyNow={isBuyNow}/>
              <CkStepPricing subtotal={subtotal} discountMode={discountMode} setDiscountMode={setDiscountMode} discountPct={discountPct} setDiscountPct={setDiscountPct} discountAmt={discountAmt} setDiscountAmt={setDiscountAmt}/>
            </div>
          )}
          {step === 2 && <CkStepCustomer customers={customers} customerId={customerId} setCustomerId={setCustomerId} shipping={shipping} setShipping={setShipping}/>}
          {step === 3 && customer && <CkStepReview customer={customer} items={items} discountValue={discountValue} discountMode={discountMode} discountPct={discountPct} shipping={shipping} notes={notes} setNotes={setNotes} orderType={orderType}/>}

          <window.WizardFooter
            step={step} totalSteps={3}
            onBack={() => setStep((s) => Math.max(1, s - 1))}
            onNext={() => setStep((s) => s + 1)} nextDisabled={!canNext}
            onFinal={submit} finalDisabled={items.length === 0}
            finalLabel="Create order" />
        </div>

        {/* Summary aside */}
        <aside className="wizard-aside">
          <h4>Order summary</h4>
          <dl>
            <dt>Customer</dt><dd>{customer ? customer.name : <span className="muted">—</span>}</dd>
            <dt>Type</dt><dd>{orderType ? (window.ORDER_TYPE_LABEL || {})[orderType] || orderType : <span className="muted">Not chosen</span>}</dd>
            <dt>Lines</dt><dd className="num">{items.length}</dd>
            <dt>Units</dt><dd className="num">{items.reduce((n, x) => n + x.line.qty, 0)}</dd>
            <dt>Subtotal</dt><dd className="num">{money(subtotal)}</dd>
            {discountValue > 0 && <><dt>Discount</dt><dd className="num" style={{ color: 'var(--color-success-700)' }}>− {money(discountValue)}</dd></>}
            <dt style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)' }}>Total</dt>
            <dd style={{ paddingTop: 6, borderTop: '1px solid var(--color-border-subtle)', fontWeight: 600, color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)' }} className="num">
              {total === 0 ? 'FREE' : money(total)}
            </dd>
          </dl>
          <div style={{ marginTop: 14, padding: 10, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Next:</strong> once created, the order moves to {total === 0 ? 'Pending shipment' : 'Pending payment'} and appears under Commerce → Orders.
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
.ckw-dmode { display: inline-flex; gap: 4px; padding: 3px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); border-radius: 9px; margin-bottom: 14px; }
.ckw-dmode__opt { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; font: 500 12.5px inherit; color: var(--color-text-secondary); transition: all var(--duration-fast); }
.ckw-dmode__opt:hover { color: var(--color-text-primary); }
.ckw-dmode__opt.is-on { background: var(--color-bg-1); color: var(--color-text-primary); font-weight: 600; box-shadow: var(--shadow-1); }
.ckw-dmode__radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--color-border-strong); flex: none; transition: all var(--duration-fast); }
.ckw-dmode__opt.is-on .ckw-dmode__radio { border-color: var(--color-primary-700); border-width: 4px; }
.ckw-dsum { margin-top: 16px; padding: 12px 14px; border: 1px solid var(--color-border-subtle); border-radius: 10px; background: var(--color-bg-3); display: flex; flex-direction: column; gap: 7px; }
.ckw-dsum__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-text-secondary); }
.ckw-dsum__row .num { font-variant-numeric: tabular-nums; }
.ckw-dsum__row--disc { color: var(--color-success-700); }
.ckw-dsum__row--total { padding-top: 8px; margin-top: 1px; border-top: 1px solid var(--color-border-default); font-weight: 600; font-size: 14.5px; color: var(--color-text-primary); }
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

.otc { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--color-border-default); background: var(--color-bg-2); transition: border-color var(--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast); }--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast); }
.otc.is-blank { border: 1.5px solid oklch(70% 0.17 60); background: oklch(97.5% 0.03 80); box-shadow: 0 0 0 3px oklch(70% 0.17 60 / 0.13); }
.otc.is-chose { border-color: var(--color-border-default); background: var(--color-bg-2); box-shadow: none; }
.otc__head { display: flex; align-items: center; gap: 8px; }
.otc__label { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.otc__star { color: oklch(55% 0.18 28); margin-left: 3px; font-weight: 700; }
.otc__pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: oklch(45% 0.17 50); background: oklch(94% 0.06 75); border: 1px solid oklch(70% 0.17 60 / 0.5); margin-left: auto; }
.otc__pill.is-chose { color: var(--color-success-700); background: var(--color-success-50); border-color: oklch(58% 0.14 152 / 0.4); margin-left: auto; }
.otc__cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 520px) { .otc__cards { grid-template-columns: 1fr; } }
.otc__card { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1.5px solid var(--color-border-default); border-radius: 9px; background: var(--color-bg-1); cursor: pointer; font-family: inherit; text-align: left; transition: all var(--duration-fast); }
.otc__card:hover { border-color: var(--color-border-strong); background: var(--color-bg-2); }
.otc.is-blank .otc__card { border-color: oklch(72% 0.16 70 / 0.55); }
.otc.is-blank .otc__card:hover { border-color: oklch(64% 0.18 55); }
.otc__card.is-on { border-color: var(--color-primary-700); background: var(--color-primary-50); box-shadow: 0 0 0 3px oklch(40% 0.14 262 / 0.1); }
.otc__radio { width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--color-border-strong); flex: none; transition: all var(--duration-fast); }
.otc__card.is-on .otc__radio { border-color: var(--color-primary-700); border-width: 5px; }
.otc__card-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--color-bg-3); color: var(--color-text-secondary); flex: none; }
.otc__card.is-on .otc__card-icon { background: var(--color-primary-100, var(--color-primary-50)); color: var(--color-primary-700); }
.otc__card-ans { font-size: 14.5px; font-weight: 600; color: var(--color-text-primary); }
.otc__card-hint { font-size: 11.5px; color: var(--color-text-tertiary); margin-left: 8px; }
.otc__card.is-on .otc__card-hint { color: var(--color-primary-700); }
.otc__card-check { margin-left: auto; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary-700); color: #fff; flex: none; }
`;

if (typeof document !== 'undefined') {
  const id = 'checkout-styles-v3';
  let s = document.getElementById(id);
  if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
  s.textContent = checkoutStyles;
  // Drop any older versioned tag whose rules would otherwise linger.
  ['checkout-styles', 'checkout-styles-v2'].forEach((oldId) => {
    const old = document.getElementById(oldId);
    if (old) old.remove();
  });
}

window.CheckoutWizard = CheckoutWizard;
