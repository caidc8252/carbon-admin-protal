/* global React, Btn, Input, Field, Textarea, Icon, Badge, CompanyLogo, Modal, useToast,
   fmtDate, fmtDateTime, relTime,
   ORDER_STATUS_LABEL, ORDER_STATUS_TONE, ORDER_TYPE_LABEL, ORDER_FLOW,
   canCancelOrder, canRefundOrder,
   orderOriAmount, orderDiscountValue, orderTotal, orderQty, orderDiscountLabel, moneyUSD */
const { useState, useMemo, useEffect, useRef } = React;

// ─── Device binding (mall.md — bind a device SN to the order via its 6-digit
//     authorization code; the record lives in the device table). Operated at ship
//     time: the operator enters/scans each unit's code and it is bound here. ──
const _acSN = (prefix, n) => `${prefix}-${String(n).padStart(8, '0')}`;
// A line item is bindable when its catalog product is a device (category linked
// to a device model). Services / accessories carry no SN and are skipped.
const isDeviceItem = (item) => {
  const p = (window.SEED_PRODUCTS || []).find((pp) => pp.id === item.productId);
  return !!(p && p.type === 'DEVICE');
};

const DeviceBindingCard = ({ order, onUpdate }) => {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const inputRef = useRef(null);

  const deviceItems = order.items.filter(isDeviceItem);

  const usedCodes = useMemo(() => {
    const s = new Set();
    order.items.forEach((it) => (it.devices || []).forEach((d) => d.code && s.add(d.code)));
    return s;
  }, [order]);

  const editable = order.status === 'PENDING_SHIP';
  const totalUnits = deviceItems.reduce((n, i) => n + i.qty, 0);
  const boundUnits = deviceItems.reduce((n, i) => n + (i.devices || []).length, 0);
  const allBound = totalUnits > 0 && boundUnits >= totalUnits;

  // Resolve + bind once a full 6-digit code is entered.
  useEffect(() => {
    if (!editable) return;
    if (code.length !== 6) { setError(''); return; }
    setResolving(true); setError('');
    const t = setTimeout(() => {
      setResolving(false);
      if (code.startsWith('000')) { setError('No device found for this authorization code.'); return; }
      if (usedCodes.has(code)) { setError('This code is already bound to a device on this order.'); return; }
      const open = deviceItems.filter((it) => (it.devices || []).length < it.qty);
      if (open.length === 0) { setError('All devices on this order are already bound.'); return; }
      const n = parseInt(code, 10);
      const item = open[n % open.length];
      const prefix = (item.name.match(/[A-Z]\d+/) || [])[0] || item.name.slice(0, 3).toUpperCase();
      const sn = _acSN(prefix, 90000 + (n % 99999));
      const nextItems = order.items.map((it) => it.id !== item.id ? it : { ...it, devices: [...(it.devices || []), { sn, code, boundAt: Date.now() }] });
      onUpdate({ ...order, items: nextItems });
      setFlash(sn); setCode('');
      setTimeout(() => setFlash(null), 1600);
    }, 460);
    return () => clearTimeout(t);
  }, [code]);

  if (deviceItems.length === 0) return null;

  const simulateScan = () => {
    const open = deviceItems.find((it) => (it.devices || []).length < it.qty);
    if (!open) return;
    let c;
    do { c = String(100000 + Math.floor(Math.random() * 899999)); } while (usedCodes.has(c) || c.startsWith('000'));
    setCode(c);
  };

  const confirmRemove = () => {
    const { itemId, idx, sn } = removeTarget;
    const nextItems = order.items.map((it) => it.id !== itemId ? it : { ...it, devices: (it.devices || []).filter((_, i) => i !== idx) });
    onUpdate({ ...order, items: nextItems });
    toast({ kind: 'success', title: 'Device unbound', msg: `${sn} unbound from this order.` });
    setRemoveTarget(null);
  };

  const allDevices = [];
  deviceItems.forEach((it) => (it.devices || []).forEach((d, i) => allDevices.push({ ...d, itemId: it.id, modelName: it.name, idx: i })));
  // Newest bound first: sort by bind time (seed devices without boundAt keep
  // their original relative order, treated as oldest).
  allDevices.sort((a, b) => (b.boundAt || 0) - (a.boundAt || 0));

  const codeValid = code.length === 6;

  return (
    <div className="info-card">
      <div className="info-card__head">
        <div>
          <div className="info-card__title">Devices &amp; authorization</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Bind each unit to this order by its 6-digit authorization code. Records are written to the device table.
          </div>
        </div>
        <Badge tone={allBound ? 'success' : 'neutral'} dot>{boundUnits} / {totalUnits} bound</Badge>
      </div>
      <div className="info-card__body">
        {/* Per-model progress */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {deviceItems.map((it) => {
            const done = (it.devices || []).length;
            const complete = done >= it.qty;
            return (
              <div key={it.id} className="od-bindchip">
                <Icon name={complete ? 'check' : 'package'} size={13} style={{ color: complete ? 'var(--color-success-700)' : 'var(--color-text-tertiary)' }}/>
                <span style={{ fontWeight: 500 }}>{it.name}{it.variantLabel ? ` · ${it.variantLabel}` : ''}</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{done}/{it.qty}</span>
              </div>
            );
          })}
        </div>

        {/* Authorization input — only at ship time */}
        {editable ? (
          <div className={`od-acbar ${error ? 'is-error' : ''} ${flash ? 'is-ok' : ''}`}>
            <div className="od-acbar__icon"><Icon name={flash ? 'check' : 'sparkles'} size={16}/></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label className="od-acbar__label">Authorization code</label>
              <input
                ref={inputRef}
                className="od-acbar__input"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                disabled={allBound}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/>
              <div className="od-acbar__hint">
                {resolving ? 'Resolving…'
                  : error ? <span style={{ color: 'var(--color-error-700)' }}>{error}</span>
                  : flash ? <span style={{ color: 'var(--color-success-700)' }}>Bound {flash}</span>
                  : allBound ? 'All units bound.'
                  : codeValid ? `${code.length}/6 digits`
                  : 'Type or scan the code on each device’s boot screen.'}
              </div>
            </div>
            <Btn variant="ghost" size="sm" icon="sparkles" onClick={simulateScan} disabled={allBound} title="Simulate scanning a device">Scan</Btn>
          </div>
        ) : order.status === 'PENDING_PAYMENT' ? (
          <div className="notice" style={{ background: 'var(--color-bg-3)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
            <Icon name="info" size={15}/>
            <div>Devices are bound at shipping. Mark the order paid and ship it to start binding units.</div>
          </div>
        ) : null}

        {/* Bound devices — self-reported SN + model, shown as cards */}
        {allDevices.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-subtle)' }}>
            <div className="od-devgrid">
              {allDevices.map((d) => (
                <div key={`${d.itemId}-${d.idx}`} className={`od-devcard ${flash === d.sn ? 'is-flash' : ''}`}>
                  {editable && (
                    <button className="od-devcard__x" title="Unbind device" onClick={() => setRemoveTarget({ itemId: d.itemId, idx: d.idx, sn: d.sn })}><Icon name="x" size={13}/></button>
                  )}
                  <div className="od-devcard__sn">{d.sn}</div>
                  <div className="od-devcard__model">{d.modelName}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unbind confirmation */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Unbind device"
        width={440}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setRemoveTarget(null)}>Cancel</Btn>
            <Btn variant="danger" icon="trash" onClick={confirmRemove}>Unbind device</Btn>
          </>
        }
      >
        {removeTarget && (
          <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Unbind <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-mono)' }}>{removeTarget.sn}</strong> from this order? The device record is released from the device table and the unit becomes available to bind again.
          </div>
        )}
      </Modal>
    </div>
  );
};

// ─── Status pipeline (mall.md machine) ─────────────────────────────────────
// PENDING_PAYMENT → PENDING_SHIP → SHIPPED (final; no DELIVERED state).
// Terminal states (CANCELLED / REFUNDED) render as a banner instead of a
// pipeline step.
const PIPELINE = [
  { key: 'PENDING_PAYMENT', label: 'Pending payment',  icon: 'cash' },
  { key: 'PENDING_SHIP',    label: 'Pending shipment', icon: 'package' },
  { key: 'SHIPPED',         label: 'Shipped',          icon: 'truck' },
];

const StatusPipeline = ({ order }) => {
  const idx = PIPELINE.findIndex(p => p.key === order.status);
  const paidSkipped = orderTotal(order) === 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 0' }}>
      {PIPELINE.map((p, i) => {
        const done = i < idx || (i === 0 && paidSkipped && idx >= 0);
        const active = i === idx;
        return (
          <React.Fragment key={p.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 50, display: 'grid', placeItems: 'center', flex: 'none',
                background: done ? 'var(--color-success-50)' : active ? 'var(--color-primary-700)' : 'var(--color-bg-3)',
                color: done ? 'var(--color-success-700)' : active ? '#fff' : 'var(--color-text-tertiary)',
                border: `1px solid ${done ? 'oklch(58% 0.14 152 / 0.4)' : active ? 'var(--color-primary-700)' : 'var(--color-border-default)'}`,
                boxShadow: active ? 'var(--shadow-cta)' : 'none',
              }}>
                {done ? <Icon name="check" size={16}/> : <Icon name={p.icon} size={16}/>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <small style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Step {i + 1}</small>
                <strong style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active || done ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                  {paidSkipped && i === 0 ? 'No payment required' : p.label}
                </strong>
              </div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? 'oklch(58% 0.14 152 / 0.4)' : 'var(--color-border-default)', margin: '0 14px' }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Payment methods (Mark paid modal) ─────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'wire',    label: 'Corporate wire transfer',   desc: 'Customer paid via their corporate bank account.' },
  { id: 'cash',    label: 'Cash',                      desc: 'Cash received in person or at warehouse pickup.' },
  { id: 'check',   label: 'Check',                     desc: 'Paper check, deposited into Carbon operating account.' },
  { id: 'card',    label: 'Credit / debit card',       desc: 'Card-present or online card payment.' },
  { id: 'ach',     label: 'ACH / direct debit',        desc: 'US ACH or SEPA direct debit pull.' },
  { id: 'offset',  label: 'Internal offset / credit',  desc: 'Applied against an existing account credit or rebate.' },
  { id: 'other',   label: 'Other',                     desc: 'Specify in the reference note below.' },
];

// ─── Order detail ─────────────────────────────────────────────────────────
const OrderDetail = ({ order, onBack, onUpdate }) => {
  const toast = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('wire');
  const [payRef, setPayRef] = useState('');
  const [payOther, setPayOther] = useState('');
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState(order.shipping?.tracking || '');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [tab, setTab] = useState('overview');

  // Auto-detect payment: once payment is recorded the order leaves PENDING_PAYMENT.
  // Cancelling a paid order must issue a refund; cancelling an unpaid one does not.
  const orderPaid = order.status === 'PENDING_SHIP' || order.status === 'SHIPPED';
  const canClose = canCancelOrder(order) || canRefundOrder(order);

  const oriAmount = orderOriAmount(order);
  const discountValue = orderDiscountValue(order);
  const total = orderTotal(order);
  const terminal = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  // Device-binding progress (mall.md — authorization codes bind units to the order).
  const deviceItems = order.items.filter(isDeviceItem);
  const deviceTotal = deviceItems.reduce((n, i) => n + i.qty, 0);
  const deviceBound = deviceItems.reduce((n, i) => n + (i.devices || []).length, 0);
  const hasDevices = deviceItems.length > 0;
  // 授权（6 位授权码绑定）仅适用于样机订单（SAMPLE）。生产机订单（PRODUCT）
  // 即使含设备项也直接发货、不出授权 Tab。
  const needsAuth = hasDevices && order.orderType === 'SAMPLE';

  // Persist the patch alone — the data model has no activity log.
  const applyPatch = (patch) => onUpdate({ ...order, ...patch });

  // ── Transitions ──
  const confirmPaid = () => {
    const m = PAYMENT_METHODS.find(p => p.id === payMethod);
    const label = m?.label || 'Payment';
    const refTxt = payRef ? ` · ref ${payRef}` : '';
    const otherTxt = payMethod === 'other' && payOther ? ` (${payOther})` : '';
    applyPatch({ status: 'PENDING_SHIP', payment: { method: payMethod, methodLabel: label, reference: payRef, otherNote: payOther, recordedAt: new Date().toISOString(), recordedBy: 'jordan.d@carbon' } });
    setPayOpen(false);
    toast({ kind: 'success', title: 'Marked paid', msg: `Recorded ${label}. Order is now Pending shipment.` });
  };
  const confirmShip = () => {
    const t = trackingDraft.trim();
    applyPatch({ status: 'SHIPPED', shipping: { ...order.shipping, tracking: t || undefined } },
      'ship', `Shipped${t ? ` · ${t}` : ''}`);
    setShipOpen(false);
    toast({ kind: 'success', title: 'Order shipped', msg: t ? `Tracking ${t}` : 'Marked as shipped.' });
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) return;
    if (orderPaid) {
      applyPatch({ status: 'REFUNDED' });
      setCancelOpen(false); setCancelReason('');
      toast({ kind: 'warning', title: 'Order cancelled & refunded', msg: `${moneyUSD(total)} returned to ${order.customerName}.` });
    } else {
      applyPatch({ status: 'CANCELLED' });
      setCancelOpen(false); setCancelReason('');
      toast({ kind: 'warning', title: 'Order cancelled' });
    }
  };


  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to Orders"
        icon={<CompanyLogo name={order.customerName} size={48}/>}
        title={<span style={{ fontFamily: 'var(--font-family-mono)' }}>{order.number}</span>}
        badges={
          <>
            <Badge tone={order.orderType === 'SAMPLE' ? 'info' : 'neutral'}>{ORDER_TYPE_LABEL[order.orderType]}</Badge>
            {orderDiscountLabel(order) && <Badge tone={order.discountPercent === 100 ? 'success' : 'info'} dot>{orderDiscountLabel(order)}</Badge>}
          </>
        }
        meta={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="users" size={13}/> {order.customerName}</span>
            <span aria-hidden="true">·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={13}/> Created {relTime(order.createdAt)}</span>
          </>
        }
        actions={
          <>
            {canClose && (
              <Btn variant="secondary" icon="x" onClick={() => setCancelOpen(true)}>Cancel order</Btn>
            )}
            {order.status === 'PENDING_PAYMENT' && (
              <Btn variant="primary" icon="check" onClick={() => setPayOpen(true)}>Mark paid</Btn>
            )}
            {order.status === 'PENDING_SHIP' && (
              <Btn variant="primary" icon="truck" onClick={() => {
                if (needsAuth && deviceBound < deviceTotal) {
                  setTab('devices');
                  toast({ kind: 'warning', title: 'Bind all devices first', msg: `${deviceTotal - deviceBound} of ${deviceTotal} unit${deviceTotal - deviceBound === 1 ? '' : 's'} still need an authorization code before shipping.` });
                  return;
                }
                setTrackingDraft(order.shipping?.tracking || '');
                setShipOpen(true);
              }}>Ship order</Btn>
            )}
          </>
        }
      />

      {/* Pipeline / terminal banner */}
      {terminal ? (
        <div className="notice" style={{
          marginBottom: 20,
          background: order.status === 'CANCELLED' ? 'var(--color-bg-3)' : 'var(--color-error-50, oklch(96% 0.02 30))',
          borderColor: order.status === 'CANCELLED' ? 'var(--color-border-default)' : 'oklch(62% 0.18 22 / 0.3)',
          color: order.status === 'CANCELLED' ? 'var(--color-text-secondary)' : 'var(--color-error-700)',
        }}>
          <Icon name={order.status === 'CANCELLED' ? 'x' : 'rotate'} size={15}/>
          <div>
            <strong>{ORDER_STATUS_LABEL[order.status]}.</strong>{' '}This order is closed.
          </div>
        </div>
      ) : (
        <div className="info-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: '6px 22px' }}>
            <StatusPipeline order={order}/>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="od-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'overview'}
          className={`od-tab ${tab === 'overview' ? 'is-on' : ''}`}
          onClick={() => setTab('overview')}>Overview</button>
        {needsAuth && (
        <button type="button" role="tab" aria-selected={tab === 'devices'}
          className={`od-tab ${tab === 'devices' ? 'is-on' : ''}`}
          onClick={() => setTab('devices')}>
          Devices &amp; authorization
          <span className="od-tab__count">{deviceBound}/{deviceTotal}</span>
        </button>
        )}
      </div>

      {tab === 'overview' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        {/* Order items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="info-card">
            <div className="info-card__head">
              <div className="info-card__title">Order items</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{order.items.length} item{order.items.length === 1 ? '' : 's'} · {orderQty(order)} units</div>
            </div>
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
                {order.items.map(i => (
                  <React.Fragment key={i.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {i.image
                            ? <span className="od-thumb"><img src={i.image} alt=""/></span>
                            : <span className="od-thumb od-thumb--empty"><Icon name="package" size={14}/></span>}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              {i.name}{i.variantLabel ? <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}> · {i.variantLabel}</span> : null}
                              {i.bundleItems && <Badge tone="accent" style={{ marginLeft: 8 }}>Bundle</Badge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{moneyUSD(i.oriPrice)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{i.qty}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 500 }}>{moneyUSD(i.amount != null ? i.amount : i.oriPrice * i.qty)}</td>
                    </tr>
                    {(i.bundleItems || []).map((b, bi) => (
                      <tr key={bi} className="od-bundle-row">
                        <td colSpan="3" style={{ paddingLeft: 56, fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>↳ {b.name}</td>
                        <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>× {b.qty * i.qty}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', color: 'var(--color-text-secondary)', padding: '10px 16px', borderTop: '1px solid var(--color-border-subtle)' }}>Original amount</td>
                  <td className="num" style={{ textAlign: 'right', padding: '10px 16px', borderTop: '1px solid var(--color-border-subtle)' }}>{moneyUSD(oriAmount)}</td>
                </tr>
                {discountValue > 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '8px 16px' }}>
                      Discount {order.discountPercent != null && order.discountPercent > 0 ? `(${order.discountPercent}%)` : '(fixed amount)'}
                    </td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--color-success-700)', padding: '8px 16px' }}>− {moneyUSD(discountValue)}</td>
                  </tr>
                )}
                <tr style={{ background: 'var(--color-bg-3)' }}>
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, padding: '14px 16px', borderTop: '1px solid var(--color-border-default)' }}>Total amount</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 700, fontSize: 17, padding: '14px 16px', borderTop: '1px solid var(--color-border-default)', color: total === 0 ? 'var(--color-success-700)' : 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                    {total === 0 ? 'FREE' : moneyUSD(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Shipping</div></div>
            <div className="info-card__body">
              <dl className="kvgrid" style={{ gridTemplateColumns: '90px 1fr', rowGap: 10 }}>
                <dt>Recipient</dt><dd>{order.shipping?.name || <span className="muted">—</span>}</dd>
                <dt>Address</dt><dd>{order.shipping?.address}</dd>
                <dt>Method</dt><dd>{order.shipping?.method}</dd>
                {order.shipping?.tracking && <><dt>Tracking</dt><dd style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5 }}>{order.shipping.tracking}</dd></>}
              </dl>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card__head"><div className="info-card__title">Order metadata</div></div>
            <div className="info-card__body">
              <dl className="kvgrid" style={{ gridTemplateColumns: '90px 1fr', rowGap: 10 }}>
                <dt>Customer</dt><dd style={{ fontWeight: 600 }}>{order.customerName}</dd>
                <dt>Type</dt><dd>{ORDER_TYPE_LABEL[order.orderType]}</dd>
                <dt>Created</dt><dd>{fmtDateTime(order.createdAt)}</dd>
                <dt>By</dt><dd style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5 }}>{order.createdBy}</dd>
                {order.payment && <><dt>Payment</dt><dd>{order.payment.methodLabel}{order.payment.reference ? <span style={{ color: 'var(--color-text-tertiary)' }}> · {order.payment.reference}</span> : null}</dd></>}
                {order.remark && <><dt>Remark</dt><dd style={{ color: 'var(--color-text-secondary)' }}>{order.remark}</dd></>}
              </dl>
            </div>
          </div>
        </div>
      </div>
      )}

      {tab === 'devices' && needsAuth && (
        hasDevices
          ? <DeviceBindingCard order={order} onUpdate={onUpdate}/>
          : (
            <div className="info-card">
              <div className="info-card__body">
                <div className="notice" style={{ background: 'var(--color-bg-3)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                  <Icon name="info" size={15}/>
                  <div>This order has no device items — nothing to authorize. Services and accessories carry no serial number.</div>
                </div>
              </div>
            </div>
          )
      )}

      {/* Mark-paid modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
        width={560}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon="check" onClick={confirmPaid}>Confirm payment</Btn>
          </>
        }
      >
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
          How did <strong style={{ color: 'var(--color-text-primary)' }}>{order.customerName}</strong> pay
          {' '}<span className="num">{moneyUSD(total)}</span> for this order?
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {PAYMENT_METHODS.map(m => {
            const active = payMethod === m.id;
            return (
              <label key={m.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '11px 13px', borderRadius: 10,
                border: `1.5px solid ${active ? 'var(--color-primary-700)' : 'var(--color-border-default)'}`,
                background: active ? 'var(--color-primary-50)' : 'var(--color-bg-2)',
                cursor: 'pointer',
              }}>
                <input type="radio" name="payMethod" checked={active} onChange={() => setPayMethod(m.id)} style={{ marginTop: 3 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{m.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
        {payMethod === 'other' && (
          <div style={{ marginTop: 12 }}>
            <Field label="Specify method">
              <Input value={payOther} onChange={e => setPayOther(e.target.value)} placeholder="e.g. crypto, barter, escrow release…"/>
            </Field>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Field label={`Reference / receipt no. ${payMethod === 'cash' ? '(optional)' : ''}`}>
            <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder={
              payMethod === 'wire' ? 'e.g. WT-2026-04-22-118832' :
              payMethod === 'check' ? 'e.g. Check #4421' :
              payMethod === 'card' ? 'Last 4 / auth code' :
              payMethod === 'ach' ? 'ACH trace number' :
              payMethod === 'offset' ? 'Credit memo ID' :
              'Internal reference (optional)'
            }/>
          </Field>
        </div>
      </Modal>

      {/* Ship modal */}
      <Modal
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        title="Ship order"
        width={480}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setShipOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon="truck" onClick={confirmShip}>Confirm shipment</Btn>
          </>
        }
      >
        <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
          Mark this order as shipped to <strong style={{ color: 'var(--color-text-primary)' }}>{order.shipping?.name}</strong> via {order.shipping?.method}?
        </div>
        <Field label="Tracking number (optional)">
          <Input value={trackingDraft} onChange={e => setTrackingDraft(e.target.value)} placeholder="e.g. DHL 4129-8821-7733"/>
        </Field>
      </Modal>

      
      {/* Cancel confirmation — adapts to payment state (auto-detected) */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        width={480}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setCancelOpen(false)}>Keep order</Btn>
            <Btn variant="danger" icon={orderPaid ? 'rotate' : 'x'} onClick={confirmCancel} disabled={!cancelReason.trim()}>
              {orderPaid ? `Cancel & refund ${moneyUSD(total)}` : 'Cancel order'}
            </Btn>
          </>
        }
      >
        <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
          Cancel <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-mono)' }}>{order.number}</strong> for {order.customerName}? This closes the order — it can’t be reopened.
        </div>
        {orderPaid ? (
          <div className="notice" style={{ marginBottom: 14, background: 'var(--color-warning-50)', borderColor: 'oklch(70% 0.14 80 / 0.3)', color: 'var(--color-warning-700)' }}>
            <Icon name="cash" size={15}/>
            <div>This order has been <strong>paid</strong>. Cancelling will issue a refund of <strong>{moneyUSD(total)}</strong> to {order.customerName} and close it as <strong>Refunded</strong>.</div>
          </div>
        ) : (
          <div className="notice" style={{ marginBottom: 14, background: 'var(--color-bg-3)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
            <Icon name="info" size={15}/>
            <div>This order hasn’t been paid — no refund is needed. It will close as <strong>Cancelled</strong>.</div>
          </div>
        )}
        <Field label="Reason (recorded in history)" required>
          <Input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={orderPaid ? 'e.g. units DOA, customer returned batch' : 'e.g. customer paused the rollout'}/>
        </Field>
      </Modal>

          </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const orderDetailStyles = `
.od-thumb { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; background: #fff; border: 1px solid var(--color-border-subtle); overflow: hidden; flex: none; }
.od-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.od-thumb--empty { background: var(--color-bg-3); color: var(--color-text-tertiary); }
.od-bundle-row td { border-top: 0 !important; padding-top: 0 !important; padding-bottom: 6px !important; }

.od-tabs { display: flex; gap: 24px; margin-bottom: 18px; border-bottom: 1px solid var(--color-border-subtle); padding: 0 4px; }
.od-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 9px 0 12px; border: 0; background: transparent; cursor: pointer; font: 500 13.5px var(--font-family-sans, inherit); color: var(--color-text-tertiary); transition: color var(--duration-fast); }
.od-tab:hover { color: var(--color-text-secondary); }
.od-tab.is-on { color: var(--color-text-primary); font-weight: 600; }
.od-tab.is-on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--color-primary-700); border-radius: 2px; }
.od-tab__count { font-family: var(--font-family-mono); font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: var(--color-bg-3); color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle); }
.od-tab.is-on .od-tab__count { background: var(--color-primary-50); color: var(--color-primary-700); border-color: oklch(60% 0.14 262 / 0.25); }

.od-bindchip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--color-bg-3); border: 1px solid var(--color-border-subtle); font-size: 12px; color: var(--color-text-secondary); }
.od-acbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1.5px solid var(--color-border-default); border-radius: 12px; background: var(--color-bg-2); transition: border-color var(--duration-fast), background var(--duration-fast); }
.od-acbar.is-error { border-color: oklch(62% 0.18 22 / 0.5); }
.od-acbar.is-ok { border-color: oklch(58% 0.14 152 / 0.5); background: var(--color-success-50); }
.od-acbar__icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--color-bg-3); color: var(--color-text-secondary); flex: none; }
.od-acbar.is-ok .od-acbar__icon { background: var(--color-success-100, var(--color-success-50)); color: var(--color-success-700); }
.od-acbar__label { display: block; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: 3px; }
.od-acbar__input { width: 160px; max-width: 100%; border: 1px solid var(--color-border-default); border-radius: 7px; background: var(--color-bg-1); padding: 7px 10px; font: 600 15px var(--font-family-mono); letter-spacing: 0.18em; color: var(--color-text-primary); outline: 0; }
.od-acbar__input:focus { border-color: var(--color-primary-700); }
.od-acbar__input:disabled { background: var(--color-bg-3); color: var(--color-text-tertiary); }
.od-acbar__hint { font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 4px; }
.od-devgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
.od-devcard { position: relative; padding: 12px 14px; border: 1px solid var(--color-border-default); border-radius: 10px; background: var(--color-bg-2); transition: border-color var(--duration-fast), background var(--duration-fast); }
.od-devcard.is-flash { border-color: oklch(58% 0.14 152 / 0.5); background: var(--color-success-50); }
.od-devcard__top { display: none; }
.od-devcard__x { position: absolute; top: 8px; right: 8px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; border: 0; background: transparent; color: var(--color-text-tertiary); cursor: pointer; transition: all var(--duration-fast); }
.od-devcard__x:hover { background: var(--color-error-50, oklch(96% 0.02 30)); color: var(--color-error-700); }
.od-devcard__sn { font-family: var(--font-family-mono); font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; word-break: break-all; padding-right: 22px; }
.od-devcard__model { font-size: 12px; color: var(--color-text-tertiary); margin-top: 3px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('order-detail-styles')) {
  const s = document.createElement('style');
  s.id = 'order-detail-styles';
  s.textContent = orderDetailStyles;
  document.head.appendChild(s);
}

window.OrderDetail = OrderDetail;
