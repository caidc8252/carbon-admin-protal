/* global React, Icon, Input, Select, Btn */
// ─────────────────────────────────────────────────────────────
// clause-fields.jsx — shared clause input controls + validation
// Used by both customer-wizard.jsx (Step 2) and customer-detail.jsx
// (ContractDetailView entitlements editor) so the two stay in sync.
//
// Exposed on window:
//   ClauseInput       — <ClauseInput clause value onChange disabled error/>
//   ModelMultiSelect  — multi-select chip picker for DEVICE_MODELS
//   clauseError       — clauseError(clause, value) → string | null
//   normalizePrice    — coerces a price string to <=2-decimal numeric
// ─────────────────────────────────────────────────────────────

const { useState, useRef, useEffect } = React;

// ─── Price helpers ──────────────────────────────────────────
// Allow only digits + a single dot + up to two fractional digits. Negative
// values are rejected outright. Returns the cleaned string (still a string
// so the input stays controlled while the user is typing — "" / "0" /
// "0." are all valid intermediate states).
const sanitizePriceInput = (raw) => {
  if (raw == null) return '';
  let s = String(raw);
  // Drop anything that isn't a digit or a dot.
  s = s.replace(/[^\d.]/g, '');
  // Collapse multiple dots to the first.
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  // Cap fractional to 2 digits.
  const dotIdx = s.indexOf('.');
  if (dotIdx !== -1 && s.length - dotIdx - 1 > 2) {
    s = s.slice(0, dotIdx + 3);
  }
  return s;
};
const normalizePrice = (raw) => {
  const s = sanitizePriceInput(raw);
  if (s === '' || s === '.') return '';
  // Strip trailing dot ("12." → "12"). Don't reformat "0.10" → "0.1"
  // (preserve what the user typed; we only normalize on submit / save).
  return s.replace(/\.$/, '');
};

// ─── Price input ────────────────────────────────────────────
// Numeric text input with: min 0, max 2 decimals, no negative sign, no
// scientific notation. Uses type="text" + inputMode="decimal" rather than
// type="number" so we have full control over the keystrokes.
const PriceInput = ({ value, onChange, disabled, invalid, placeholder = '0.00', style }) => (
  <Input
    type="text"
    inputMode="decimal"
    value={value ?? ''}
    placeholder={placeholder}
    disabled={disabled}
    invalid={invalid}
    onChange={(e) => onChange(sanitizePriceInput(e.target.value))}
    onBlur={(e) => onChange(normalizePrice(e.target.value))}
    style={style}
  />
);

// ─── Model multi-select ─────────────────────────────────────
// Dropdown picker with searchable list + selected chips. Source is
// window.DEVICE_MODELS (seeded in orders-data.jsx).
const ModelMultiSelect = ({ value = [], onChange, disabled, invalid }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  // Popup is portaled to <body> (position:fixed) so it floats above the modal
  // and is never clipped by the modal body's overflow.
  const [coords, setCoords] = useState(null);
  const models = (window.DEVICE_MODELS || []);

  const POP_H = 340;
  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flipUp = r.bottom + 4 + POP_H > window.innerHeight && r.top - 4 - POP_H > 0;
    setCoords({ left: r.left, width: r.width, top: flipUp ? r.top - 4 - POP_H : r.bottom + 4 });
  };

  useEffect(() => {
    if (!open) { setCoords(null); return; }
    place();
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onReflow = () => place();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = Array.isArray(value) ? value : [];
  const filtered = models.filter((m) => {
    const text = `${m.id} ${m.name || ''} ${m.family || ''}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });

  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next);
  };
  const remove = (id) => onChange(selected.filter((x) => x !== id));
  const selectAll = () => onChange(models.map((m) => m.id));
  const clear = () => onChange([]);

  // Resolve a model id → display name (falls back to the id when not found
  // in the catalog, so legacy data still renders something).
  const labelFor = (id) => {
    const m = models.find((x) => x.id === id);
    return m ? (m.name || m.id) : id;
  };

  return (
    <div ref={wrapRef} className="cf-models" data-invalid={invalid || undefined}>
      <button
        type="button"
        className={`cf-models__trigger ${disabled ? 'is-disabled' : ''} ${invalid ? 'is-invalid' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        {selected.length === 0 ? (
          <span className="cf-models__placeholder">Select device models…</span>
        ) : (
          <span className="cf-models__chips">
            {selected.slice(0, 4).map((id) => (
              <span key={id} className="cf-models__chip">
                {labelFor(id)}
                {!disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="cf-models__chip-x"
                    onClick={(e) => { e.stopPropagation(); remove(id); }}
                  >
                    <Icon name="x" size={10}/>
                  </span>
                )}
              </span>
            ))}
            {selected.length > 4 && (
              <span className="cf-models__chip cf-models__chip--more">+{selected.length - 4} more</span>
            )}
          </span>
        )}
        <span className="cf-models__count">{selected.length}/{models.length}</span>
        <Icon name="chevD" size={12}/>
      </button>
      {open && coords && ReactDOM.createPortal(
        <div ref={popRef} className="cf-models__pop cf-models__pop--fixed"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}>
          <div className="cf-models__search">
            <Icon name="search" size={13}/>
            <input
              autoFocus
              placeholder="Search models…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="cf-models__list">
            {filtered.length === 0 ? (
              <div className="cf-models__empty">No matching models</div>
            ) : filtered.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`cf-models__opt ${on ? 'is-on' : ''}`}
                  onClick={() => toggle(m.id)}
                >
                  <span className={`cf-models__check ${on ? 'is-on' : ''}`}>
                    {on && <Icon name="check" size={11}/>}
                  </span>
                  <span className="cf-models__opt-main">
                    <span className="cf-models__opt-name">{m.name || m.id}</span>
                    <span className="cf-models__opt-id">{m.id}{m.family ? ` · ${m.family}` : ''}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="cf-models__foot">
            <button type="button" className="cf-models__action" onClick={selectAll}>Select all</button>
            <button type="button" className="cf-models__action" onClick={clear}>Clear</button>
            <span style={{ flex: 1 }}/>
            <button type="button" className="cf-models__action is-primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Fixed option sets for MERCHANT entitlements (per revised contract spec).
//   • Payment service bundles a known app package (currently a single SKU).
//   • E-receipt delivery channels are a closed set.
const PAYMENT_PKG_OPTIONS = ['com.newland.payexplorer'];
const ERECEIPT_OPTIONS = ['EMAIL', 'QR CODE'];

// ─── Validation ─────────────────────────────────────────────
// Returns an error string when the value is invalid, else null. Empty +
// not-required is considered valid; "0" is explicitly valid (= free).
// `ctx` is the full entitlement form for the contract — used to enforce
// cross-clause dependencies (e.g. GeoFencing requires GeoLocation).
const clauseError = (clause, value, ctx) => {
  if (!clause) return null;
  // Dependency guard: a clause with `requires: 'OtherKey'` is only valid
  // when that other feature/toggle is enabled. If the dependency is off,
  // this clause must be off too.
  if (clause.requires && ctx) {
    const dep = ctx[clause.requires];
    const depOn = !!(dep && typeof dep === 'object' && dep.enable);
    const selfOn = !!(value && typeof value === 'object' && value.enable);
    if (selfOn && !depOn) return `Requires ${clause.requires} to be enabled first`;
  }
  if (clause.type === 'toggle') {
    // Enable-only switch (pilot value-added services). Always valid.
    return null;
  }
  if (clause.type === 'payment') {
    // { enable, appItems: [{ pkgName, price }] }
    const fv = value && typeof value === 'object' ? value : null;
    if (!fv?.enable) return null;
    const items = Array.isArray(fv.appItems) ? fv.appItems : [];
    if (items.length === 0) return 'Add at least one app item when enabled';
    for (const it of items) {
      if (!it.pkgName) return 'Each app item needs a package';
      const p = it.price;
      if (p === '' || p == null) return 'Price required for each app (use 0 for free)';
      const n = Number(p);
      if (!Number.isFinite(n) || n < 0) return 'Invalid app price';
    }
    return null;
  }
  if (clause.type === 'ereceipt') {
    // { enable, price, options: [] }
    const fv = value && typeof value === 'object' ? value : null;
    if (!fv?.enable) return null;
    const p = fv.price;
    if (p === '' || p == null) return 'Price required when enabled (use 0 for free)';
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) return 'Price must be ≥ 0';
    if (!Array.isArray(fv.options) || fv.options.length === 0) return 'Pick at least one delivery channel';
    return null;
  }
  if (clause.type === 'models') {
    const arr = Array.isArray(value) ? value : [];
    if (clause.required && arr.length === 0) return 'Select at least one device model';
    return null;
  }
  if (clause.type === 'currency') {
    if (!value) return clause.required ? 'Select a currency' : null;
    return null;
  }
  if (clause.type === 'price') {
    // New shape: { price } (currency comes from contract-level
    // settlementCurrency). Tolerate legacy { price, currency } shape too.
    const v = value && typeof value === 'object' ? value.price : value;
    if (v === '' || v == null) {
      return clause.required ? 'Required' : null;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Invalid number';
    if (n < 0) return 'Must be ≥ 0';
    return null;
  }
  if (clause.type === 'feature') {
    // New shape: { enable, price }. Legacy shape priceStrategy.price is
    // unwrapped for backwards-compat.
    const fv = value && typeof value === 'object' ? value : null;
    if (!fv?.enable) return null;            // disabled features don't need a price
    const p = fv.price != null ? fv.price : fv.priceStrategy?.price;
    if (p === '' || p == null) return 'Price required when enabled (use 0 for free)';
    const n = Number(p);
    if (!Number.isFinite(n)) return 'Invalid price';
    if (n < 0) return 'Price must be ≥ 0';
    return null;
  }
  return null;
};

// ─── ClauseInput ────────────────────────────────────────────
// Renders the input control for a single clause based on clause.type.
// The wrapping <Field> (label/hint/error) is owned by the caller — this
// component is just the control. `error` is read so we can paint
// invalid borders on the control.
//
// `currency` is the contract-level settlement currency (e.g. "USD"),
// shown next to the unit on price / feature rows so admins know which
// currency they're entering. Caller passes the focused contract's
// settlementCurrency value.
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'CAD', 'AUD', 'JPY', 'HKD', 'SGD'];

const ClauseInput = ({ clause, value, onChange, disabled, error, currency, ctx }) => {
  if (!clause) return null;
  const invalid = !!error;
  const cur = currency || 'USD';
  // Dependency: a `requires` clause is locked off until its prerequisite
  // feature/toggle is enabled.
  const depBlocked = !!(clause.requires && ctx && !(ctx[clause.requires] && ctx[clause.requires].enable));
  const ctlDisabled = disabled || depBlocked;

  if (clause.type === 'models') {
    return (
      <ModelMultiSelect
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        disabled={disabled}
        invalid={invalid}
      />
    );
  }

  if (clause.type === 'currency') {
    // Contract-level currency picker. Single dropdown — drives display
    // of all subsequent price / feature rows in the same contract.
    return (
      <Select
        value={value || ''}
        disabled={disabled}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 200 }}
      >
        <option value="">Select currency…</option>
        {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
    );
  }

  if (clause.type === 'price') {
    // New shape: { price }. Tolerate legacy { price, currency }.
    const pv = value && typeof value === 'object' ? value : { price: value || '' };
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <PriceInput
          value={pv.price}
          disabled={disabled}
          invalid={invalid}
          onChange={(s) => onChange({ price: s })}
          style={{ flex: 1, maxWidth: 200 }}
        />
        <span className="cf-curlbl">{cur}</span>
        {clause.unit && <span className="cf-unitlbl">{clause.unit}</span>}
      </div>
    );
  }

  if (clause.type === 'feature') {
    // New shape: { enable, price }. Legacy: { enable, priceStrategy: { price } }
    // — unwrap to flat shape on read.
    const flat = value && typeof value === 'object'
      ? { enable: !!value.enable, price: value.price != null ? value.price : (value.priceStrategy?.price ?? '') }
      : { enable: false, price: '' };
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: 'var(--color-bg-3)',
        borderRadius: 6,
        border: invalid ? '1px solid var(--color-error-500)' : '1px solid transparent',
        opacity: disabled ? 0.5 : 1,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={flat.enable}
            disabled={disabled}
            onChange={(e) => onChange({ enable: e.target.checked, price: flat.price })}
          />
          Enable
        </label>
        <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
          <PriceInput
            value={flat.price}
            disabled={!flat.enable || disabled}
            invalid={invalid && flat.enable}
            placeholder="Price (0 = free)"
            onChange={(s) => onChange({ enable: flat.enable, price: s })}
            style={{ flex: 1, maxWidth: 160 }}
          />
          <span className="cf-curlbl">{cur}</span>
          <span className="cf-unitlbl">{clause.unit}</span>
        </div>
      </div>
    );
  }

  if (clause.type === 'toggle') {
    // Enable-only switch — value-added service during a pilot (no price).
    const on = !!(value && typeof value === 'object' ? value.enable : value);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: 'var(--color-bg-3)',
        borderRadius: 6,
        border: invalid ? '1px solid var(--color-error-500)' : '1px solid transparent',
        opacity: ctlDisabled ? 0.5 : 1,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: ctlDisabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={on}
            disabled={ctlDisabled}
            onChange={(e) => onChange({ enable: e.target.checked })}
          />
          Enable
        </label>
        <span className="cf-unitlbl">
          {depBlocked ? `Enable ${clause.requires} first` : 'Free during trial'}
        </span>
      </div>
    );
  }

  if (clause.type === 'payment') {
    // { enable, appItems: [{ pkgName, price }] } — per-device monthly fee
    // for bundled payment apps.
    const fv = value && typeof value === 'object'
      ? { enable: !!value.enable, appItems: Array.isArray(value.appItems) ? value.appItems : [] }
      : { enable: false, appItems: [] };
    const setItems = (items) => onChange({ enable: fv.enable, appItems: items });
    const toggleEnable = (en) => onChange({
      enable: en,
      appItems: en && fv.appItems.length === 0
        ? [{ pkgName: PAYMENT_PKG_OPTIONS[0], price: '' }]
        : fv.appItems,
    });
    return (
      <div style={{
        padding: '10px 10px',
        background: 'var(--color-bg-3)',
        borderRadius: 6,
        border: invalid ? '1px solid var(--color-error-500)' : '1px solid transparent',
        opacity: disabled ? 0.5 : 1,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input type="checkbox" checked={fv.enable} disabled={disabled} onChange={(e) => toggleEnable(e.target.checked)} />
          Enable payment service
        </label>
        {fv.enable && (
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {fv.appItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Select
                  value={it.pkgName || ''}
                  disabled={disabled}
                  onChange={(e) => setItems(fv.appItems.map((x, j) => j === i ? { ...x, pkgName: e.target.value } : x))}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {PAYMENT_PKG_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
                <PriceInput
                  value={it.price}
                  disabled={disabled}
                  placeholder="0.00"
                  onChange={(s) => setItems(fv.appItems.map((x, j) => j === i ? { ...x, price: s } : x))}
                  style={{ width: 96 }}
                />
                <span className="cf-curlbl">{cur}</span>
                <span className="cf-unitlbl">per device / mo</span>
                {fv.appItems.length > 1 && !disabled && (
                  <span role="button" tabIndex={0} className="cf-models__chip-x" style={{ width: 18, height: 18 }}
                    onClick={() => setItems(fv.appItems.filter((_, j) => j !== i))}>
                    <Icon name="x" size={11}/>
                  </span>
                )}
              </div>
            ))}
            {!disabled && fv.appItems.length < PAYMENT_PKG_OPTIONS.length && (
              <button type="button" className="cf-models__action" style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  const used = new Set(fv.appItems.map((x) => x.pkgName));
                  const next = PAYMENT_PKG_OPTIONS.find((p) => !used.has(p)) || PAYMENT_PKG_OPTIONS[0];
                  setItems([...fv.appItems, { pkgName: next, price: '' }]);
                }}>
                + Add app
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (clause.type === 'ereceipt') {
    // { enable, price, options: [] } — monthly e-receipt delivery.
    const fv = value && typeof value === 'object'
      ? { enable: !!value.enable, price: value.price != null ? value.price : '', options: Array.isArray(value.options) ? value.options : [] }
      : { enable: false, price: '', options: [] };
    const patch = (p) => onChange({ enable: fv.enable, price: fv.price, options: fv.options, ...p });
    const toggleOpt = (o) => patch({ options: fv.options.includes(o) ? fv.options.filter((x) => x !== o) : [...fv.options, o] });
    return (
      <div style={{
        padding: '10px 10px',
        background: 'var(--color-bg-3)',
        borderRadius: 6,
        border: invalid ? '1px solid var(--color-error-500)' : '1px solid transparent',
        opacity: disabled ? 0.5 : 1,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input type="checkbox" checked={fv.enable} disabled={disabled} onChange={(e) => patch({ enable: e.target.checked })} />
          Enable e-receipt service
        </label>
        {fv.enable && (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <PriceInput
                value={fv.price}
                disabled={disabled}
                placeholder="Price (0 = free)"
                onChange={(s) => patch({ price: s })}
                style={{ width: 160 }}
              />
              <span className="cf-curlbl">{cur}</span>
              <span className="cf-unitlbl">per month</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ERECEIPT_OPTIONS.map((o) => (
                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  <input type="checkbox" checked={fv.options.includes(o)} disabled={disabled} onChange={() => toggleOpt(o)} />
                  {o}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// ─── Styles ─────────────────────────────────────────────────
// One-time injection. cf- prefix to avoid collisions.
const CSS = `
.cf-models { position: relative; }
.cf-models__trigger {
  width: 100%;
  min-height: 36px;
  padding: 5px 10px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-2);
  border-radius: var(--radius-md);
  display: flex; align-items: center; gap: 8px;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--duration-fast);
}
.cf-models__trigger:hover:not(.is-disabled) { border-color: var(--color-border-strong); }
.cf-models__trigger.is-invalid { border-color: var(--color-error-500); box-shadow: 0 0 0 3px oklch(70% 0.16 25 / 0.12); }
.cf-models__trigger.is-disabled { background: var(--color-bg-3); cursor: not-allowed; opacity: 0.6; }
.cf-models__placeholder { color: var(--color-text-tertiary); font-size: 13px; flex: 1; }
.cf-models__chips { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
.cf-models__chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 4px 2px 8px;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  border-radius: 4px;
  font: 500 11.5px var(--font-family-sans);
  border: 1px solid oklch(60% 0.14 262 / 0.2);
}
.cf-models__chip--more {
  background: var(--color-bg-3);
  color: var(--color-text-tertiary);
  border-color: var(--color-border-subtle);
  padding: 2px 7px;
}
.cf-models__chip-x {
  display: inline-grid; place-items: center;
  width: 14px; height: 14px;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-tertiary);
}
.cf-models__chip-x:hover { background: oklch(70% 0.14 262 / 0.2); color: var(--color-error-700); }
.cf-models__count {
  margin-left: auto;
  font: 500 11px var(--font-family-mono);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.cf-models__pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  z-index: 100;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-4);
  max-height: 320px;
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: cfFadeIn 0.12s var(--easing-standard);
}
.cf-models__pop--fixed { z-index: 9000; right: auto; box-shadow: var(--shadow-5); animation: none; opacity: 1; }
@keyframes cfFadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
.cf-models__search {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex; align-items: center; gap: 8px;
  color: var(--color-text-tertiary);
  flex: none;
}
.cf-models__search input {
  flex: 1; border: 0; outline: 0; background: transparent;
  font: inherit; font-size: 13px;
  color: var(--color-text-primary);
}
.cf-models__list { overflow-y: auto; padding: 4px 0; flex: 1; min-height: 0; }
.cf-models__empty {
  padding: 18px 12px;
  text-align: center;
  font-size: 12.5px;
  color: var(--color-text-tertiary);
}
.cf-models__opt {
  width: 100%;
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--color-text-primary);
}
.cf-models__opt:hover { background: var(--color-bg-hover); }
.cf-models__opt.is-on { background: var(--color-primary-50); }
.cf-models__check {
  width: 16px; height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border-strong);
  display: grid; place-items: center;
  flex: none;
  background: var(--color-bg-2);
}
.cf-models__check.is-on {
  background: var(--color-primary-700);
  border-color: var(--color-primary-700);
  color: #fff;
}
.cf-models__opt-main { flex: 1; min-width: 0; }
.cf-models__opt-name { font-size: 13px; font-weight: 500; }
.cf-models__opt-id { font: 500 11px var(--font-family-mono); color: var(--color-text-tertiary); margin-top: 1px; display: block; }
.cf-models__foot {
  padding: 6px 8px;
  border-top: 1px solid var(--color-border-subtle);
  display: flex; align-items: center; gap: 4px;
  background: var(--color-bg-3);
  flex: none;
}
.cf-models__action {
  padding: 5px 9px;
  border-radius: 5px;
  border: 0;
  background: transparent;
  font: 500 12px var(--font-family-sans);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.cf-models__action:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.cf-models__action.is-primary {
  background: var(--color-primary-700);
  color: #fff;
}
.cf-models__action.is-primary:hover { background: var(--color-primary-700); opacity: 0.92; }

/* Currency + unit pill labels next to price inputs. Compact, monospace,
   no background — they're informational, not interactive. */
.cf-curlbl {
  font: 600 11.5px var(--font-family-mono);
  color: var(--color-text-secondary);
  padding: 2px 6px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  white-space: nowrap;
}
.cf-unitlbl {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('cf-styles')) {
  const el = document.createElement('style');
  el.id = 'cf-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ─── Entitlements ↔ form-shape converters ──────────────────
// `entitlementsToForm(entitlements, schema)` — read a saved JSONB shape
// into a form-friendly shape (prices become strings so they're editable
// as controlled inputs; legacy {price, currency} / priceStrategy nesting
// is flattened to the current model).
// `formToEntitlements(form, schema)` — the inverse: numbers, trimmed,
// settlement currency defaulted to USD. Used by Save handlers.
const entitlementsToForm = (entitlements, schema) => {
  const out = {};
  (schema || []).forEach((f) => {
    const v = entitlements?.[f.key];
    if (f.type === 'models') {
      out[f.key] = Array.isArray(v)
        ? v
        : (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
    } else if (f.type === 'currency') {
      out[f.key] = typeof v === 'string' && v ? v : (entitlements?.settlementCurrency || 'USD');
    } else if (f.type === 'price') {
      const price = v && typeof v === 'object'
        ? (v.price == null ? '' : String(v.price))
        : (v == null ? '' : String(v));
      out[f.key] = { price };
    } else if (f.type === 'feature') {
      const p = v && typeof v === 'object'
        ? (v.price != null ? v.price : v.priceStrategy?.price)
        : null;
      out[f.key] = {
        enable: !!v?.enable,
        price: p == null ? '' : String(p),
      };
    } else if (f.type === 'toggle') {
      out[f.key] = { enable: !!(v && typeof v === 'object' ? v.enable : v) };
    } else if (f.type === 'payment') {
      const items = (v && Array.isArray(v.appItems)) ? v.appItems : [];
      out[f.key] = {
        enable: !!v?.enable,
        appItems: items.map((it) => ({
          pkgName: it.pkgName || PAYMENT_PKG_OPTIONS[0],
          price: it.price == null ? '' : String(it.price),
        })),
      };
    } else if (f.type === 'ereceipt') {
      out[f.key] = {
        enable: !!v?.enable,
        price: v?.price == null ? '' : String(v.price),
        options: Array.isArray(v?.options) ? v.options.slice() : [],
      };
    } else {
      out[f.key] = v ?? '';
    }
  });
  return out;
};

const formToEntitlements = (form, schema) => {
  const out = {};
  (schema || []).forEach((f) => {
    const v = form?.[f.key];
    if (f.type === 'models') {
      out[f.key] = Array.isArray(v) ? v.slice() : [];
    } else if (f.type === 'currency') {
      out[f.key] = typeof v === 'string' && v ? v : 'USD';
    } else if (f.type === 'price') {
      const p = v?.price;
      out[f.key] = { price: p === '' || p == null ? 0 : Number(p) };
    } else if (f.type === 'feature') {
      const p = v?.price;
      out[f.key] = {
        enable: !!v?.enable,
        price: p === '' || p == null ? null : Number(p),
      };
    } else if (f.type === 'toggle') {
      out[f.key] = { enable: !!v?.enable };
    } else if (f.type === 'payment') {
      const items = Array.isArray(v?.appItems) ? v.appItems : [];
      out[f.key] = {
        enable: !!v?.enable,
        appItems: items.map((it) => ({
          pkgName: it.pkgName || PAYMENT_PKG_OPTIONS[0],
          price: it.price === '' || it.price == null ? 0 : Number(it.price),
        })),
      };
    } else if (f.type === 'ereceipt') {
      const p = v?.price;
      out[f.key] = {
        enable: !!v?.enable,
        price: p === '' || p == null ? 0 : Number(p),
        options: Array.isArray(v?.options) ? v.options.slice() : [],
      };
    } else if (f.type === 'number') {
      if (v !== '' && v != null && !isNaN(Number(v))) out[f.key] = Number(v);
    } else {
      if (String(v ?? '').trim()) out[f.key] = String(v).trim();
    }
  });
  return out;
};

Object.assign(window, { ClauseInput, ModelMultiSelect, PriceInput, clauseError, normalizePrice, sanitizePriceInput, entitlementsToForm, formToEntitlements, PAYMENT_PKG_OPTIONS, ERECEIPT_OPTIONS });
