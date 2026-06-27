/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, ContractBadge, Modal, CompanyLogo, CONTRACT_INFO, COUNTRIES, COUNTRY_BY_CODE, useToast, maskEmail, maskPhone, maskName, fmtDate, fmtDateTime, relTime, SEED_ROLES, ALL_CONTRACT_KINDS, CUSTOMER_CONTRACT_KINDS, PERMISSION_GROUPS, permAppliesToContract, permissionGroupsForContract, ALL_PERMISSION_IDS, ORDER_STATUSES, ORDER_STATUS_TONE, orderTotal, orderQty, deviceProgress, moneyUSD */
const { useState, useMemo } = React;

// Helpers for the contract-status-aware UI changes. The underlying
// ENTITY_CONTRACT.status enum is UPPERCASE (ACTIVE/PENDING/SUSPENDED/
// TERMINATED) but some legacy call sites emit Pascal-case ('Active') —
// _CS normalizes for comparison.
const _CS = (s) => String(s || '').toUpperCase();

// Returns counts grouped by lifecycle bucket for the Overview stat.
// Uses effectiveStatus() so an ACTIVE contract whose effectiveTo has
// passed is correctly counted as `expired` (not `active`). All four
// buckets are always present so consumers don't get NaN when adding.
const _contractBuckets = (contracts, tz) => {
  const out = { active: 0, suspended: 0, expired: 0, terminated: 0 };
  contracts.forEach((c) => {
    const s = String((window.effectiveStatus && window.effectiveStatus(c, tz)) || c.status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'SIGNED') out.active++;
    else if (s === 'SUSPENDED') out.suspended++;
    else if (s === 'EXPIRED') out.expired++;
    else if (s === 'TERMINATED') out.terminated++;
    else out.active++;
  });
  return out;
};

// Status-aware subtitle lines for a contract row. Returns an array of
// React fragments rendered as separate <div> lines — keeps each piece of
// info on its own line for scannability.
//   Line 1 (always)  : Authorized by … · Configured by …
//   Line 2 (per state):
//     ACTIVE     → Effective {from} → {to|No end date}
//     PENDING    → Activates when customer's Admin operator signs in
//     SUSPENDED  → Suspended · access blocked, contract on file
//     TERMINATED → Terminated {date} by {who}
const _contractRowSubtitle = (c, customer) => {
  const tz      = customer.timezone;
  const s       = window.effectiveStatus(c, tz);
  const effFrom = c.effectiveFrom || c.signedAt || customer.registeredAt;
  const effTo   = c.effectiveTo;
  const issuer  = c.authorizingEntityName || (c.authorizingEntityId === 'e-npt' ? 'NPT' : c.authorizingEntityId) || 'NPT';
  const who     = maskEmail(c.signedBy || 'admin@carbon');

  const line1 = <>Authorized by <strong>{issuer}</strong> · Configured by {who}</>;

  let line2;
  if (s === 'SUSPENDED') {
    line2 = <span style={{ color: 'var(--color-error-700)' }}>Suspended — access blocked, contract still on file</span>;
  } else if (s === 'TERMINATED') {
    const tAt  = c.terminatedAt || c.effectiveTo;
    const tBy  = c.terminatedByEntityId === 'e-npt' ? 'NPT admin' : (c.terminatedByEntityId || 'admin@carbon');
    line2 = <>Terminated {tAt ? fmtDate(tAt) : '—'} by {maskEmail(tBy)} · originally effective {fmtDate(effFrom)}</>;
  } else if (s === 'EXPIRED') {
    const days = effTo ? Math.max(0, -window.tzDaysUntil(effTo, tz)) : null;
    line2 = <span style={{ color: 'var(--color-warning-700)' }}>Expired{days != null ? ` ${days} day${days === 1 ? '' : 's'} ago` : ''} — effective-to {effTo ? fmtDate(effTo) : '—'} has passed. Extend the term or terminate.</span>;
  } else {
    // ACTIVE / SIGNED — in force
    line2 = <>Effective {fmtDate(effFrom)} → {effTo ? fmtDate(effTo) : <strong style={{ color: 'var(--color-text-secondary)' }}>No end date</strong>}</>;
  }

  return (
    <>
      <div>{line1}</div>
      <div style={{ marginTop: 2 }}>{line2}</div>
    </>
  );
};

// Per-kind entitlements schema (revised contract spec). ISO carries the
// full priced entitlements; ISO-PILOT carries a distinct trial shape
// (toggle-only, no prices, no basic service); MERCHANT carries payment +
// e-receipt services; ISV / ISV-PILOT / ADMIN are `{}`. Each clause is one of:
//   'models'   — string[] of device-model ids (multi-select)
//   'currency' — single currency code (USD/EUR/CNY/…); contract-level
//   'price'    — { price: number } — denominated in settlementCurrency
//   'feature'  — { enable: boolean, price: number | null } — price uses
//                 settlementCurrency; if enable=true, price required
//                 (0 = free)
//   'toggle'   — { enable: boolean } — enable-only switch (pilot services)
//   'payment'  — { enable, appItems: [{ pkgName, price }] } — MERCHANT
//   'ereceipt' — { enable, price, options: string[] } — MERCHANT
//
// Field order is intentional: device coverage first, then the contract
// currency that drives all subsequent prices, then the base device fee,
// then the value-added features.
const CONTRACT_ENTITLEMENT_SCHEMA = {
  ISO: [
    { key: 'settlementCurrency', label: 'Settlement currency',   type: 'currency', required: true, help: 'All prices below are denominated in this currency.' },
    { key: 'deviceBasicService', label: 'Device basic service',  type: 'price',    required: true, unit: 'per device per month', help: 'Base monthly fee charged per active device' },
    { key: 'FlyDesk',            label: 'FlyDesk',               type: 'feature',  unit: 'per device per month', help: 'Remote desktop access. Price required when enabled (0 = free).' },
    { key: 'GeoLocation',        label: 'GeoLocation',           type: 'feature',  unit: 'per device per month', help: 'Real-time device location. Price required when enabled (0 = free).' },
    { key: 'GeoFencing',         label: 'GeoFencing',            type: 'feature',  unit: 'per device per month', requires: 'GeoLocation', help: 'Zone-based alerts. Requires GeoLocation. Price required when enabled (0 = free).' },
    { key: 'Pre-warning',        label: 'Pre-warning',           type: 'feature',  unit: 'per device per month', help: 'Battery / storage / health alerts. Price required when enabled (0 = free).' },
  ],
  // ISO-PILOT carries a DISTINCT entitlements shape (revised contract spec):
  // no device basic service, and the value-added services are enable-only
  // switches with no price — everything is free during the trial. The
  // model + settlement currency are still captured so a later Convert can
  // re-use them when re-pricing the formal ISO contract.
  'ISO-PILOT': [
    { key: 'settlementCurrency', label: 'Settlement currency',   type: 'currency', required: true, help: 'Carried over to the formal ISO contract on conversion.' },
    { key: 'FlyDesk',            label: 'FlyDesk',               type: 'toggle', help: 'Remote desktop access. Free for the duration of the trial.' },
    { key: 'GeoLocation',        label: 'GeoLocation',           type: 'toggle', help: 'Real-time device location. Free for the duration of the trial.' },
    { key: 'GeoFencing',         label: 'GeoFencing',            type: 'toggle', requires: 'GeoLocation', help: 'Zone-based alerts. Requires GeoLocation. Free for the duration of the trial.' },
    { key: 'Pre-warning',        label: 'Pre-warning',           type: 'toggle', help: 'Battery / storage / health alerts. Free for the duration of the trial.' },
  ],
  // MERCHANT entitlements (revised contract spec): settlement currency +
  // two compound services. Payment is per-device/month; e-receipt is a flat
  // monthly fee with a closed set of delivery channels.
  MERCHANT: [
    { key: 'settlementCurrency', label: 'Settlement currency', type: 'currency', required: true, help: 'Currency for the merchant service fees below.' },
    { key: 'PAYMENT SERVICE',    label: 'Payment service',     type: 'payment',  help: 'Per-device monthly fee for the bundled payment app(s). 0 = free.' },
    { key: 'E-RECEIPT SERVICE',  label: 'E-receipt service',   type: 'ereceipt', help: 'Flat monthly e-receipt delivery fee + the channels offered. 0 = free.' },
  ],
  // ISV / ADMIN carry no entitlements in the current model.
  ISV:         [],
  ADMIN:       [],
};
// Expose so the customer wizard (and other call sites) can render the
// same clause form without duplicating the schema. Lookup callers must
// normalize the kind to upper-case (e.g. 'Iso-Pilot' → 'ISO-PILOT').
// ISV-PILOT mirrors ISV (no entitlements); ISO-PILOT has its own shape
// above (NOT an alias of ISO — pilot entitlements differ structurally).
CONTRACT_ENTITLEMENT_SCHEMA['ISV-PILOT'] = CONTRACT_ENTITLEMENT_SCHEMA.ISV;
window.CONTRACT_ENTITLEMENT_SCHEMA = CONTRACT_ENTITLEMENT_SCHEMA;

// Returns expiry state for an ACTIVE / PILOT contract — drives the warning chip
// on rows and the banner in the detail modal.
//   { kind: 'expiring',       days: 12 } → ACTIVE within 30 days of effectiveTo
//   { kind: 'expired',        days:  3 } → past effectiveTo but raw status ACTIVE
//   { kind: 'pilot-active',   days: 47 } → PILOT in progress, any days left
//   { kind: 'pilot-expiring', days:  7 } → PILOT ≤30 days from expiry (amber tone)
//   { kind: 'pilot-expired',  days:  2 } → PILOT past effectiveTo
//   null                                 → no concern (ACTIVE >30d out, etc.)
const _expiryState = (c, tz) => {
  if (!c.effectiveTo) return null;
  const eff = window.effectiveStatus(c, tz);
  const rawIsPilot = window.contractIsPilot(c);
  // Days left judged against "today" in the partner's timezone, date-only.
  const daysLeft = window.tzDaysUntil(c.effectiveTo, tz);
  if (rawIsPilot) {
    // PILOT contracts always surface their countdown — admins need
    // continuous visibility into how much trial time is left.
    if (eff === 'EXPIRED') return { kind: 'pilot-expired',  days: Math.abs(daysLeft) };
    if (daysLeft <= 30)    return { kind: 'pilot-expiring', days: daysLeft };
    return { kind: 'pilot-active', days: daysLeft };
  }
  // ACTIVE/SIGNED: only the pre-expiry warning lives here (EXPIRED
  // upstream is handled by StatusChip's amber+dashed treatment).
  if (eff !== 'ACTIVE' && eff !== 'SIGNED') return null;
  if (daysLeft <= 30) return { kind: 'expiring', days: daysLeft };
  return null;
};
// ContractBadge shows the kind in text; on the detail page the icon +
// row title already carry the kind, so the chip just shows the status
// word with the matching tone.
// Constants for the contract state machine:
//   ACTIVE      — in force, entitlements granted
//   PILOT       — trial period, all fees forced to $0, +180d auto end
//   SUSPENDED   — access blocked, contract on file (reversible)
//   TERMINATED  — ended, historical (soft delete)
//   EXPIRED     — derived state: ACTIVE/PILOT past effectiveTo
// (PENDING was a vestige of an older client-side-signing flow and is
//  no longer used. Any leftover PENDING in legacy data is rendered as
//  Active so the UI never shows a dangling raw enum.)
const _STATUS_TONES = {
  ACTIVE: 'success', SIGNED: 'success', PENDING: 'success',
  PILOT: 'pilot',
  EXPIRED: 'warning',
  SUSPENDED: 'error',
  TERMINATED: 'neutral',
};
const _STATUS_WORDS = {
  ACTIVE: 'Active', SIGNED: 'Active', PENDING: 'Active',
  PILOT: 'Pilot',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
};
const StatusChip = ({ status, effectiveTo, tz, kind }) => {
  // Use effectiveStatus so an ACTIVE contract past its effectiveTo
  // renders as Expired (amber + dashed) rather than Active (solid green).
  // tz = partner timezone. Pilot-ness is a property of the TYPE (kind ends
  // in -PILOT), shown as a distinct "Pilot" chip while in force.
  const s = window.effectiveStatus({ status, effectiveTo }, tz);
  const isPilot = window.contractIsPilot(kind);
  const inForce = s === 'ACTIVE' || s === 'SIGNED';
  const tone = (isPilot && inForce) ? 'pilot' : (_STATUS_TONES[s] || 'neutral');
  const word = (isPilot && inForce) ? 'Pilot' : (_STATUS_WORDS[s] || status);
  const isExpired = s === 'EXPIRED';
  const isTerminated = s === 'TERMINATED';
  // PILOT can have a days-left tail when there's an effectiveTo and the
  // chip is rendered in a context that doesn't have its own countdown.
  // We keep this chip terse — "Pilot" — and let the contract row /
  // detail-modal banner carry the day count.
  return (
    <span className={`tds-badge tds-badge--${tone} ${isTerminated ? 'tds-badge--ghost' : ''} ${isExpired ? 'tds-badge--lapsed' : ''}`}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>
      {word}
    </span>
  );
};

// ─── Shared company-info bits (used by Overview / Info / Edit modal) ──
const formatPhone = (c) => {
  if (!c?.phone) return null;
  return [c.phoneCountryCode, c.phone].filter(Boolean).join(' ');
};
const countryName = (code) => code && COUNTRY_BY_CODE?.[code]?.name || code || '';

const CompanyInfoView = ({ customer, maskOn, revealed, onToggleReveal }) => {
  const phone = formatPhone(customer);
  const displayPhone = !phone ? null : maskOn && !revealed?.phone ? maskPhone(phone) : phone;
  const displayEmail = !customer.email ? null : maskOn && !revealed?.email ? maskEmail(customer.email) : customer.email;
  const notProvided = <span className="muted">Not provided</span>;
  return (
    <dl className="kvgrid">
      <dt>Name</dt>          <dd>{customer.name}</dd>
      <dt>License</dt>       <dd>{customer.license || notProvided}</dd>
      <dt>Country</dt>       <dd>{customer.country ? countryName(customer.country) : notProvided}</dd>
      <dt>Address</dt>       <dd style={{ whiteSpace: 'pre-line' }}>{customer.address || notProvided}</dd>
      <dt>Phone</dt>         <dd>
        {phone ?
        <>
            <span className="op-mask">{displayPhone}</span>
            {maskOn && onToggleReveal && <button className="reveal-btn" onClick={() => onToggleReveal('phone')}>{revealed?.phone ? 'Hide' : 'Reveal'}</button>}
          </> :
        notProvided}
      </dd>
      <dt>Email</dt>         <dd>
        {customer.email ?
        <>
            <span className="op-mask">{displayEmail}</span>
            {maskOn && onToggleReveal && <button className="reveal-btn" onClick={() => onToggleReveal('email')}>{revealed?.email ? 'Hide' : 'Reveal'}</button>}
          </> :
        notProvided}
      </dd>
      <dt>Remark</dt>        <dd style={{ whiteSpace: 'pre-line', color: 'var(--color-text-secondary)' }}>{customer.remark || notProvided}</dd>
      <dt>Registered</dt>    <dd>{fmtDateTime(customer.registeredAt)}</dd>
    </dl>);
};

const EMAIL_RE_DETAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE_DETAIL = /^[\d\s\-().]{4,}$/;
// Customer info validation: only Company Name + Country are mandatory.
// Address / License are optional with no format rules. Email + Phone are
// optional but must still pass format checks when filled in.
// Timezone + Contact name removed from Customer detail per UI request —
// timezone is still required at wizard time (where it drives contract
// effective-date calculation), but the detail edit form no longer
// exposes it, so we don't gate Save on it here.
const companyFormValid = (f) =>
!!(f?.name?.trim() && f?.country) &&
(!f?.email?.trim() || EMAIL_RE_DETAIL.test(f.email)) &&
(!f?.phone?.trim() || (PHONE_RE_DETAIL.test(f.phone) && f?.phoneCountryCode?.trim()));

const CompanyInfoEdit = ({ form, onChange }) => {
  const handleCountryChange = (code) => {
    const prev = COUNTRY_BY_CODE?.[form.country];
    const next = COUNTRY_BY_CODE?.[code];
    const shouldSyncDial = !form.phoneCountryCode || prev && form.phoneCountryCode === prev.dial;
    onChange({ ...form, country: code, ...(shouldSyncDial && next ? { phoneCountryCode: next.dial } : {}) });
  };
  const phoneInvalid = !!(form.phone && !PHONE_RE_DETAIL.test(form.phone));
  const emailInvalid = !!(form.email && !EMAIL_RE_DETAIL.test(form.email));
  // Timezone + Contact name dropped from this form by request — timezone
  // is now captured only in the create-customer wizard. The stored value
  // (customer.timezone) is preserved silently across edits.
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Field label="Company name" required>
        <Input value={form.name || ''} onChange={(e) => onChange({ ...form, name: e.target.value })} />
      </Field>
      <Field label="License">
        <Input value={form.license || ''} onChange={(e) => onChange({ ...form, license: e.target.value })} placeholder="e.g. NW-2024-08831-CA" />
      </Field>
      <Field label="Country" required>
        <Select value={form.country || ''} onChange={(e) => handleCountryChange(e.target.value)}>
          <option value="">Select country…</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Address">
        <Textarea rows={2} value={form.address || ''} onChange={(e) => onChange({ ...form, address: e.target.value })} placeholder="Street, city, region, postal code" />
      </Field>
      <Field label="Email" error={emailInvalid ? 'Invalid email address' : null}>
        <Input type="email" value={form.email || ''} onChange={(e) => onChange({ ...form, email: e.target.value })} placeholder="contact@company.com" prefix={<Icon name="mail" size={14} />} invalid={emailInvalid} />
      </Field>
      <Field label="Phone" error={phoneInvalid ? 'Invalid phone number' : null}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
          <Select value={form.phoneCountryCode || ''} onChange={(e) => onChange({ ...form, phoneCountryCode: e.target.value })}>
            <option value="">Code…</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.dial} · {c.code}</option>)}
          </Select>
          <Input value={form.phone || ''} onChange={(e) => onChange({ ...form, phone: e.target.value })} placeholder="e.g. 415 226 4800" invalid={phoneInvalid} />
        </div>
      </Field>
      <Field label="Remark" hint="Internal note — not visible to the customer.">
        <Textarea rows={2} value={form.remark || ''} onChange={(e) => onChange({ ...form, remark: e.target.value })} placeholder="Internal note" />
      </Field>
    </div>);
};

// ─── Overview tab ────────────────────────────────────────
const TabOverview = ({ customer, onSave, maskOn }) => {
  const buckets = _contractBuckets(customer.contracts, customer.timezone);
  const liveCount = buckets.active + buckets.expired + buckets.suspended;
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(customer);
  const [revealed, setRevealed] = useState({});
  const toast = useToast();
  React.useEffect(() => {setForm(customer);}, [customer]);
  const toggleReveal = (field) => {
    setRevealed((r) => ({ ...r, [field]: !r[field] }));
    if (!revealed[field]) toast({ kind: 'info', title: 'Sensitive field revealed', msg: 'This action is recorded in the audit log.' });
  };
  const handleSave = () => {
    onSave(form);
    setEdit(false);
    toast({ kind: 'success', title: 'Customer info updated' });
  };
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 20 }}>
        <div className="info-card">
          <div className="info-card__head">
            <div className="info-card__title">Company</div>
            {edit &&
            <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" onClick={() => {setForm(customer);setEdit(false);}}>Cancel</Btn>
                <Btn variant="primary" size="sm" icon="check" disabled={!companyFormValid(form)} onClick={handleSave}>Save changes</Btn>
              </div>
            }
          </div>
          <div className="info-card__body">
            {!edit ?
            <CompanyInfoView customer={customer} maskOn={maskOn} revealed={revealed} onToggleReveal={toggleReveal} /> :
            <CompanyInfoEdit form={form} onChange={setForm} />}
          </div>
        </div>
      </div>
    </div>);

};

// ─── Information tab (Scene 3) ────────────────────────────
const TabInfo = ({ customer, onSave }) => {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(customer);
  const toast = useToast();

  React.useEffect(() => {setForm(customer);}, [customer]);

  const handleSave = () => {
    onSave(form);
    setEdit(false);
    toast({ kind: 'success', title: 'Customer info updated' });
  };

  return (
    <div className="info-card" style={{ maxWidth: 760 }}>
      <div className="info-card__head">
        <div className="info-card__title">Basic information</div>
        {!edit ?
        <Btn variant="secondary" size="sm" icon="edit" onClick={() => setEdit(true)}>Edit</Btn> :

        <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="ghost" size="sm" onClick={() => {setForm(customer);setEdit(false);}}>Cancel</Btn>
            <Btn variant="primary" size="sm" icon="check" disabled={!companyFormValid(form)} onClick={handleSave}>Save changes</Btn>
          </div>
        }
      </div>
      <div className="info-card__body">
        {!edit ?
        <CompanyInfoView customer={customer} /> :
        <CompanyInfoEdit form={form} onChange={setForm} />}
      </div>
    </div>);

};

// ─── Contract detail view (modal body) ──────────────────────────
// Self-contained component so its edit-mode state resets when the user
// opens a different contract — drive that with `key={contract.id}` at
// the call site.
const ContractDetailView = ({
  contract: c,
  customer,
  onUpdateContract,
  // When true, the entitlements section starts in edit mode (no extra
  // "View → Edit" click). Used by the row-level Edit entry point.
  initialEdit = false,
  // When true, force the whole view read-only regardless of status — used
  // for MERCHANT contracts, which the platform admin can view but not edit.
  readOnly = false,
  // Notifies the parent whenever the entitlements editor goes dirty /
  // clean — parent uses this to gate the close handler with a "discard
  // unsaved changes?" confirm.
  onDirtyChange,
  // Publishes the entitlements-editor action state up to a host modal so it
  // can render Cancel / Save in its FOOTER instead of inside the body.
  // Called with { editing, canSave, save, cancel } whenever that state
  // changes. Used by the single-contract Edit modal.
  onActions,
  // Called after a successful Save so the host can close the modal.
  onSaved,
}) => {
  const toast   = useToast();
  const s       = _CS(c.status);
  // Derived contract status — dominant everywhere except where we need to
  // know the raw enum (e.g. soft delete sets raw to TERMINATED). Use this
  // for UI decisions (banner, actions, read-only gate).
  const derived = window.effectiveStatus(c, customer.timezone);
  const effFrom = c.effectiveFrom || c.signedAt;
  const effTo   = c.effectiveTo;
  const issuer  = c.authorizingEntityName || (c.authorizingEntityId === 'e-npt' ? 'NPT' : c.authorizingEntityId) || 'NPT';
  // Operator nickname (not email) — resolve c.signedBy against the user roster,
  // falling back to the local-part of the email if not found.
  const operatorName = (() => {
    const email = c.signedBy;
    if (!email) return null;
    const u = (window.SEED_USERS || []).find((s) => (s.email || '').toLowerCase() === email.toLowerCase());
    return (u && u.nickname) || email.split('@')[0];
  })();
  const expiry  = _expiryState(c, customer.timezone);
  // Fully read-only only for TERMINATED. EXPIRED stays editable so admins
  // can extend the term to revive the contract.
  const isReadOnly = readOnly || derived === 'TERMINATED';

  // ── Unified edit form: effective window + entitlements ────────
  // One form, one Save. `editing` is on only when the host opens this view in
  // edit mode (the single-contract Edit modal); read-only views never edit.
  const schema = CONTRACT_ENTITLEMENT_SCHEMA[String(c.kind || '').toUpperCase()] || [];
  const editing = !!initialEdit && !isReadOnly;
  const initialTerm = {
    effectiveFrom: effFrom ? String(effFrom).slice(0, 10) : '',
    effectiveTo: effTo ? String(effTo).slice(0, 10) : '',
  };
  const [termForm, setTermForm] = useState(initialTerm);
  // Snapshot of the form on entry so we can compute "dirty" by comparing
  // the current entForm against this baseline. Updated after a successful
  // save so subsequent edits are measured from the saved state.
  const initialFormJsonRef = React.useRef(null);
  // Initialize the form mirroring the JSON shape ClauseInput expects.
  //   'models'   → string[]
  //   'currency' → string (e.g. "USD") — drives display of all price rows
  //   'price'    → { price: string }                    (string while editing)
  //   'feature'  → { enable: boolean, price: string }   (string while editing)
  // saveEntitlements() coerces price strings back to numbers on commit.
  // Legacy data shapes ({ price, currency }, { enable, priceStrategy }) are
  // accepted and migrated to the flat shape on load.
  const initEntForm = () => {
    const out = {};
    schema.forEach((f) => {
      const v = c.entitlements?.[f.key];
      if (f.type === 'models') {
        out[f.key] = Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
      } else if (f.type === 'currency') {
        out[f.key] = typeof v === 'string' && v ? v : (c.entitlements?.settlementCurrency || 'USD');
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
      } else {
        out[f.key] = v ?? '';
      }
    });
    return out;
  };
  const [entForm, setEntForm] = useState(() => {
    const form = initEntForm();
    initialFormJsonRef.current = JSON.stringify({ ent: form, term: initialTerm });
    return form;
  });

  // Tell the parent whenever the form goes dirty / clean so it can guard
  // the modal close with a "discard?" confirm.
  React.useEffect(() => {
    if (!onDirtyChange) return;
    const isDirty = editing && JSON.stringify({ ent: entForm, term: termForm }) !== initialFormJsonRef.current;
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entForm, termForm]);

  // ── Status banner content ────────────────────────────────────
  const banner = (() => {
    if (derived === 'ACTIVE' || derived === 'SIGNED') {
      if (expiry?.kind === 'expiring') return {
        tone: 'warning', icon: 'clock',
        title: `Expires in ${expiry.days} day${expiry.days === 1 ? '' : 's'}`,
        msg: 'Consider extending the effective-to date before access lapses.',
      };
      // Healthy active/signed contract: the status chip in the header already
      // says "Active" — a second "Active / full access" banner is redundant,
      // so show nothing here. Banners are reserved for states that carry
      // extra, actionable context (expiring / expired / suspended / ended).
      return null;
    }
    if (derived === 'EXPIRED') {
      const days = effTo ? Math.floor((new Date() - new Date(effTo)) / 86400000) : null;
      return {
        tone: 'warning', icon: 'alert',
        title: days != null ? `Expired ${days} day${days === 1 ? '' : 's'} ago` : 'Expired',
        msg: `Effective-to date (${effTo ? fmtDate(effTo) : '—'}) has passed. The contract is no longer in force. Extend the term below to revive it, or terminate to close it out.`,
      };
    }
    if (derived === 'SUSPENDED') return {
      tone: 'error', icon: 'minus',
      title: 'Suspended',
      msg: 'Customer access is blocked. The contract record stays on file and can be resumed or terminated.',
    };
    if (derived === 'TERMINATED') {
      const by = c.terminatedByEntityId === 'e-npt' ? 'NPT admin' : (c.terminatedByEntityId || null);
      return {
        tone: 'neutral', icon: 'x',
        title: 'Terminated',
        msg: `Ended ${c.terminatedAt ? fmtDateTime(c.terminatedAt) : '—'}${by ? ` by ${by}` : ''}. This is a read-only historical record.`,
      };
    }
    return null;
  })();


  // ── Audit timeline (events) ──────────────────────────────────
  // Contract events (audit timeline). Per the new domain model, events
  // live on the contract itself with schema { statusFrom, statusTo,
  // description }. statusFrom/To may be null for descriptive events.
  const timeline = Array.isArray(c.events) ? c.events : [];

  // ── Save (one form: effective window + entitlements, together) ──
  const saveAll = () => {
    // Validate via clauseError before committing so we don't write a bad
    // shape (e.g. enabled feature with no price). UI already shows red
    // borders + Save button is disabled when entErrors is non-empty.
    const errs = {};
    schema.forEach((f) => {
      const e = window.clauseError ? window.clauseError(f, entForm[f.key], entForm) : null;
      if (e) errs[f.key] = e;
    });
    if (Object.keys(errs).length > 0 || termError) {
      toast({ kind: 'error', title: 'Cannot save', msg: termError || 'Fix the highlighted clauses first.' });
      return;
    }
    // Convert form values back to typed values per schema.
    const out = {};
    schema.forEach((f) => {
      const v = entForm[f.key];
      if (f.type === 'models') {
        out[f.key] = Array.isArray(v) ? v.slice() : [];
      } else if (f.type === 'currency') {
        out[f.key] = typeof v === 'string' && v ? v : 'USD';
      } else if (f.type === 'price') {
        const p = v?.price;
        out[f.key] = {
          price: p === '' || p == null ? 0 : Number(p),
        };
      } else if (f.type === 'feature') {
        const p = v?.price;
        out[f.key] = {
          enable: !!v?.enable,
          price: p === '' || p == null ? null : Number(p),
        };
      } else if (f.type === 'number') {
        if (v !== '' && v != null && !isNaN(Number(v))) out[f.key] = Number(v);
      } else {
        if (String(v ?? '').trim()) out[f.key] = String(v).trim();
      }
    });
    // Single patch: entitlements (when the kind has a schema) + any
    // effective-window change, committed together.
    const newFrom = termForm.effectiveFrom || null;
    const newTo = termForm.effectiveTo || null;
    const patch = {};
    if (schema.length > 0) patch.entitlements = out;
    if (newFrom !== (effFrom || null)) patch.effectiveFrom = newFrom;
    if (newTo !== (effTo || null)) patch.effectiveTo = newTo;
    if (Object.keys(patch).length > 0) {
      onUpdateContract(c, patch, `${c.kind} contract updated`);
      toast({ kind: 'success', title: 'Contract updated' });
    }
    // Re-baseline the dirty snapshot so the next edit starts clean.
    initialFormJsonRef.current = JSON.stringify({ ent: entForm, term: termForm });
    if (onDirtyChange) onDirtyChange(false);
    if (onSaved) onSaved();
  };
  const entErrors = (() => {
    if (!editing) return {};
    const out = {};
    schema.forEach((f) => {
      const e = window.clauseError ? window.clauseError(f, entForm[f.key], entForm) : null;
      if (e) out[f.key] = e;
    });
    return out;
  })();
  // Effective-window validation (part of the same form).
  const termError = !editing ? null : (() => {
    if (!termForm.effectiveFrom) return 'Effective-from date is required.';
    if (termForm.effectiveTo && termForm.effectiveTo < termForm.effectiveFrom) return 'Effective-to must be on or after effective-from.';
    return null;
  })();

  // Publish editor actions to a host modal footer (see onActions prop).
  React.useEffect(() => {
    if (!onActions) return;
    onActions({
      editing: editing,
      canSave: Object.keys(entErrors).length === 0 && !termError,
      save: saveAll,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, entForm, termForm]);

  const bannerStyle = {
    success:  { background: 'var(--color-success-50)', color: 'var(--color-success-700)', border: '1px solid oklch(58% 0.14 152 / 0.25)' },
    warning:  { background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', border: '1px solid oklch(70% 0.16 70 / 0.25)' },
    error:    { background: 'var(--color-error-50)',   color: 'var(--color-error-700)',   border: '1px solid oklch(58% 0.20 25 / 0.25)' },
    info:     { background: 'var(--color-info-50)',    color: 'var(--color-info-700)',    border: '1px solid oklch(60% 0.14 230 / 0.25)' },
    neutral:  { background: 'var(--color-bg-3)',       color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' },
  }[banner?.tone || 'neutral'];

  const SectionHead = ({ title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      {action}
    </div>
  );

  return (
    <div className="stack" style={{ gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className={`pick-card__icon pick-card__icon--${window.baseKind(c.kind).toLowerCase()}`} style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}>
          <Icon name={iconForKind(c.kind)} size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {c.kind} Contract
            <StatusChip status={c.status} effectiveTo={c.effectiveTo} tz={customer.timezone} kind={c.kind}/>
          </div>
          <code style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{c.id || `CT-${c.kind.toUpperCase()}-${String(customer.id || '0000').padStart(4, '0')}`}</code>
        </div>
      </div>

      {/* Status banner */}
      {banner && (
        <div style={{ ...bannerStyle, display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 8, alignItems: 'flex-start' }}>
          <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={banner.icon} size={16}/></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{banner.title}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2, color: 'inherit', opacity: 0.85 }}>{banner.msg}</div>
          </div>
        </div>
      )}

      {/* Authorizing — entity + operator + time on one compact row */}
      <div>
        <SectionHead title="Authorizing"/>
        <div className="cv-issuer">
          <div className="cv-issuer__avatar">{(issuer || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cv-issuer__name">{issuer}</div>
            <div className="cv-issuer__role">{operatorName ? <>Operated by <strong>{operatorName}</strong></> : <span className="muted">No operator recorded</span>}</div>
          </div>
          <div className="cv-issuer__when">
            <div className="cv-issuer__when-k">Authorized</div>
            <div className="cv-issuer__when-v">{c.authorizedAt ? fmtDateTime(c.authorizedAt) : (c.signedAt ? fmtDateTime(c.signedAt) : '—')}</div>
          </div>
        </div>
      </div>

      {/* Effective window — read-only span, or date inputs while editing */}
      <div>
        <SectionHead title="Effective window"/>
        {editing ? (
          <div className="cab-termrow">
            <Field label="Effective from" hint="Date the contract takes effect." error={!termForm.effectiveFrom ? 'Required' : null}>
              <Input type="date" value={termForm.effectiveFrom}
                onChange={(e) => setTermForm((p) => ({ ...p, effectiveFrom: e.target.value }))}/>
            </Field>
            <Field label="Effective to" hint="Leave blank for no end date." error={termError && termForm.effectiveTo ? termError : null}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input type="date" value={termForm.effectiveTo} style={{ flex: 1 }}
                  onChange={(e) => setTermForm((p) => ({ ...p, effectiveTo: e.target.value }))}/>
                {termForm.effectiveTo && <Btn variant="ghost" size="sm" onClick={() => setTermForm((p) => ({ ...p, effectiveTo: '' }))}>Clear</Btn>}
              </div>
            </Field>
          </div>
        ) : (
          <div className="cv-span">
            <div className="cv-spancell">
              <div className="cv-spancell__k">Effective from</div>
              <div className="cv-spancell__v">{effFrom ? fmtDate(effFrom) : '—'}</div>
            </div>
            <span className="cv-span__arrow"><Icon name="chevR" size={18}/></span>
            <div className="cv-spancell">
              <div className="cv-spancell__k">Effective to</div>
              <div className={`cv-spancell__v ${effTo ? '' : 'cv-spancell__v--muted'}`}>{effTo ? fmtDate(effTo) : 'No end date'}</div>
            </div>
          </div>
        )}

      </div>

      {/* Entitlements (schema-driven editor) */}
      <div>
        <SectionHead title="Entitlements"/>
        {editing ? (
          <>
            {schema.length === 0 ? (
              <div style={{ padding: '18px 14px', textAlign: 'center', background: 'var(--color-bg-3)', borderRadius: 8, fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                {c.kind} contracts have no configurable entitlements — the effective window above is all that applies.
              </div>
            ) : (
            <div className="stack" style={{ gap: 12 }}>
              {schema.map((f) => {
                const err = entErrors[f.key];
                // Contract-level currency drives display of all price /
                // feature rows. Read from the live form value of the
                // settlementCurrency clause (fallback: USD).
                const settlementCurrency = entForm.settlementCurrency || 'USD';
                return (
                  <Field
                    key={f.key}
                    label={<>{f.label}{f.required && <span style={{ color: 'var(--color-error-700)' }}> *</span>}</>}
                    hint={`${f.help || ''}${f.unit ? ` · ${f.unit}` : ''}`}
                    error={err}
                  >
                    <window.ClauseInput
                      clause={f}
                      value={entForm[f.key]}
                      onChange={(v) => setEntForm({ ...entForm, [f.key]: v })}
                      error={err}
                      currency={settlementCurrency}
                      ctx={entForm}
                    />
                  </Field>
                );
              })}
            </div>
            )}
          </>
        ) : (
          (() => {
            // Empty state #1: contract type has no entitlement schema
            // (ISV / ISV-PILOT / ADMIN). No CTA — this is by design.
            if (schema.length === 0) {
              return (
                <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-3)', borderRadius: 8, fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  {c.kind} contracts have no configurable entitlements in the current model.
                </div>
              );
            }
            // Empty state #2: ISO contract with no values set yet.
            const ents = c.entitlements && typeof c.entitlements === 'object' ? Object.entries(c.entitlements) : [];
            if (ents.length === 0) {
              return (
                <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-3)', borderRadius: 8, fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  No entitlements configured.
                  {!isReadOnly && <> Click <strong>Configure</strong> above to set the {c.kind}-specific scope.</>}
                </div>
              );
            }
            // Render each entitlement by schema type for nice formatting.
            return (
              <div className="cv-ents">
                {schema.map((f) => {
                  const v = c.entitlements?.[f.key];
                  if (v == null) return null;
                  // Contract-level currency for price/feature display.
                  const settlementCurrency = c.entitlements?.settlementCurrency || 'USD';
                  let display;
                  if (f.type === 'currency') {
                    display = <strong>{String(v)}</strong>;
                  } else if (f.type === 'price') {
                    const price = v && typeof v === 'object' ? v.price : v;
                    display = price != null
                      ? <span><strong>{Number(price).toFixed(2)} {settlementCurrency}</strong> <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>· {f.unit}</span></span>
                      : '—';
                  } else if (f.type === 'feature') {
                    if (!v?.enable) {
                      display = <span className="muted">Disabled</span>;
                    } else {
                      // Tolerate legacy { priceStrategy: { price } } shape.
                      const p = v.price != null ? v.price : v.priceStrategy?.price;
                      display = <span>
                        <span className="tds-badge tds-badge--success" style={{ marginRight: 8 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>Enabled
                        </span>
                        {p != null
                          ? <><strong>{Number(p).toFixed(2)} {settlementCurrency}</strong><span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}> · {f.unit}</span></>
                          : <span className="muted">Price not set</span>}
                      </span>;
                    }
                  } else if (f.type === 'toggle') {
                    const on = !!(v && typeof v === 'object' ? v.enable : v);
                    display = on
                      ? <span className="tds-badge tds-badge--success"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>Enabled</span>
                      : <span className="muted">Disabled</span>;
                  } else if (f.type === 'payment') {
                    if (!v?.enable) {
                      display = <span className="muted">Disabled</span>;
                    } else {
                      const items = Array.isArray(v.appItems) ? v.appItems : [];
                      display = <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
                        {items.map((it, i) => (
                          <span key={i}>
                            <code style={{ fontSize: 12 }}>{it.pkgName}</code>{' '}
                            <strong>{Number(it.price || 0).toFixed(2)} {settlementCurrency}</strong>
                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}> · per device / mo</span>
                          </span>
                        ))}
                      </span>;
                    }
                  } else if (f.type === 'ereceipt') {
                    if (!v?.enable) {
                      display = <span className="muted">Disabled</span>;
                    } else {
                      display = <span>
                        <strong>{Number(v.price || 0).toFixed(2)} {settlementCurrency}</strong>
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}> · per month</span>
                        {Array.isArray(v.options) && v.options.length > 0 && (
                          <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                            {v.options.map((o, i) => <span key={i} className="tds-badge tds-badge--neutral" style={{ padding: '2px 7px', fontSize: 11.5 }}>{o}</span>)}
                          </span>
                        )}
                      </span>;
                    }
                  } else if (f.type === 'models' || Array.isArray(v)) {
                    // Resolve model ids → display names so admins see
                    // human-friendly chips (e.g. "N950" instead of "m-n950").
                    const arr = Array.isArray(v) ? v : [];
                    const lookup = (window.DEVICE_MODELS || []);
                    display = arr.length === 0
                      ? <span className="muted">—</span>
                      : <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                          {arr.map((id, i) => {
                            const m = lookup.find((x) => x.id === id);
                            return <span key={i} className="tds-badge tds-badge--neutral" style={{ padding: '2px 7px', fontSize: 11.5 }} title={id}>{m ? (m.name || id) : id}</span>;
                          })}
                        </span>;
                  } else if (typeof v === 'object') {
                    display = <code style={{ fontSize: 12 }}>{JSON.stringify(v)}</code>;
                  } else {
                    display = String(v);
                  }
                  return (
                    <React.Fragment key={f.key}>
                      <div className="cv-ents__k">{f.label}</div>
                      <div className="cv-ents__v">{display}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Audit timeline */}
      {timeline.length > 0 && (
        <div>
          <SectionHead title={`Timeline (${timeline.length})`}/>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {timeline.slice().reverse().slice(0, 8).map((ev, idx) => {
              const hasTransition = ev.statusFrom != null || ev.statusTo != null;
              // Tone for the transition badge. PILOT gets its own
              // indigo tone; everything else falls back to info.
              const toTone = ({
                ACTIVE:     'success',
                PILOT:      'pilot',
                SUSPENDED:  'error',
                TERMINATED: 'neutral',
              }[String(ev.statusTo || '').toUpperCase()]) || 'info';
              // Derive a one-line label for new event-typed entries —
              // PILOT_EXTEND / PILOT_CONVERT / BIND_PILOT. Falls back
              // to ev.description for legacy/non-typed events.
              const eventTitle = (() => {
                const t = ev.eventType;
                if (!t) return null;
                const info = ev.eventInfo || {};
                if (t === 'BIND_PILOT')    return `Pilot started · expires ${info.initialEffectiveTo ? fmtDate(info.initialEffectiveTo) : '—'}`;
                if (t === 'PILOT_EXTEND')  return `Pilot extended +${info.days || '?'} days · new expiry ${info.toEffectiveTo ? fmtDate(info.toEffectiveTo) : '—'}${info.reason ? ' · ' + info.reason : ''}`;
                return null;
              })();
              return (
                <li key={idx} style={{ padding: '8px 0', borderBottom: idx === Math.min(timeline.length, 8) - 1 ? 'none' : '1px solid var(--color-border-subtle)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {hasTransition && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, flexShrink: 0, marginTop: 1 }}>
                      {ev.statusFrom
                        ? <span className="tds-badge tds-badge--neutral" style={{ padding: '1px 6px' }}>{ev.statusFrom}</span>
                        : <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>—</span>}
                      <Icon name="arrowR" size={10}/>
                      <span className={`tds-badge tds-badge--${toTone}`} style={{ padding: '1px 6px' }}>{ev.statusTo}</span>
                    </span>
                  )}
                  <span style={{ flex: 1, lineHeight: 1.5 }}>
                    {eventTitle ? (
                      <>
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{eventTitle}</span>
                        {ev.description && (
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                            {ev.description}
                          </span>
                        )}
                      </>
                    ) : (
                      ev.description
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── PILOT action modals (used by TabContracts) ────────────
// Both modals are intentionally self-contained — they don't reach into
// shared.jsx prototype helpers. After integration we can lift them out
// of this file, but co-locating with TabContracts keeps the scope tight.

const _PILOT_EXTEND_OPTS = [30, 60, 90];

// Extend pilot modal — pick +N days, optional reason. The new
// effectiveTo is computed from "today" (NOT additive to current
// effectiveTo, per spec).
const ExtendPilotModal = ({ target, onClose, onConfirm }) => {
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  useEffect(() => { if (target) { setDays(30); setReason(''); } }, [target]);
  if (!target) return null;

  const newTo = new Date(Date.now() + days * 86400000);
  const curTo = target.effectiveTo ? new Date(target.effectiveTo) : null;

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Extend pilot +${days} days`}
      width={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={() => onConfirm({ days, reason: reason.trim() })}>Confirm extension</Btn>
      </>}
    >
      <div className="stack">
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          Pilot expiry becomes <b style={{ color: 'var(--color-text-primary)' }}>today + {days} days</b>. It doesn't stack on the current expiry. Each extension is recorded as a <code>PILOT_EXTEND</code> event.
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Duration</div>
          <div style={{ display: 'inline-flex', padding: 3, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, gap: 2 }}>
            {_PILOT_EXTEND_OPTS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDays(opt)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 0, cursor: 'pointer',
                  font: '500 13px var(--font-family-sans)',
                  background: days === opt ? 'var(--color-bg-2)' : 'transparent',
                  color: days === opt ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow: days === opt ? 'var(--shadow-1)' : 'none',
                }}
              >+{opt} days</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 12, alignItems: 'center', padding: 12, background: 'var(--color-bg-3)', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.08 }}>Current</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{curTo ? fmtDate(curTo.toISOString()) : '—'}</div>
          </div>
          <Icon name="arrowR" size={14}/>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.08 }}>After</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-success-700)' }}>{fmtDate(newTo.toISOString())}</div>
          </div>
        </div>

        <Field label="Reason (optional)" hint="Saved on the PILOT_EXTEND event.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer needs more time to evaluate"/>
        </Field>
      </div>
    </Modal>
  );
};

// ─── Contracts tab (Scene 4) ──────────────────────────────
const _RENEW_OPTS = [90, 180, 365];

// Renew contract modal — for EXPIRED formal contracts. Picks a new term
// length counted from today (the old effective-to has already passed, so
// stacking on it would back-date the renewal). Writes the new effectiveTo
// via onUpdateContract; EXPIRED is a derived state, so once the date is in
// the future the contract reads ACTIVE again.
const RenewContractModal = ({ target, customer, onClose, onConfirm }) => {
  const [days, setDays] = useState(365);
  const [reason, setReason] = useState('');
  useEffect(() => { if (target) { setDays(365); setReason(''); } }, [target]);
  if (!target) return null;

  const newTo = new Date(Date.now() + days * 86400000);
  const curTo = target.effectiveTo ? new Date(target.effectiveTo) : null;
  const label = days === 365 ? '1 year' : `${days} days`;

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Renew ${target.kind} contract`}
      width={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={() => onConfirm({ days, reason: reason.trim() })}>Renew contract</Btn>
      </>}
    >
      <div className="stack">
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          New term runs <b style={{ color: 'var(--color-text-primary)' }}>today → today + {label}</b>. The contract returns to force immediately; the renewal is recorded on the audit timeline.
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>New term</div>
          <div style={{ display: 'inline-flex', padding: 3, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, gap: 2 }}>
            {_RENEW_OPTS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDays(opt)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 0, cursor: 'pointer',
                  font: '500 13px var(--font-family-sans)',
                  background: days === opt ? 'var(--color-bg-2)' : 'transparent',
                  color: days === opt ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow: days === opt ? 'var(--shadow-1)' : 'none',
                }}
              >{opt === 365 ? '+1 year' : `+${opt} days`}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 12, alignItems: 'center', padding: 12, background: 'var(--color-bg-3)', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.08 }}>Expired</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-warning-700)' }}>{curTo ? fmtDate(curTo.toISOString()) : '—'}</div>
          </div>
          <Icon name="arrowR" size={14}/>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.08 }}>New effective-to</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-success-700)' }}>{fmtDate(newTo.toISOString())}</div>
          </div>
        </div>

        <Field label="Reason (optional)" hint="Saved on the renewal event.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual renewal — terms unchanged"/>
        </Field>
      </div>
    </Modal>
  );
};

const TabContracts = ({ customer, onAdd, onRemove, onStatusChange, onUpdateContract, onConvertContract }) => {
  const [removeTarget, setRemoveTarget] = useState(null);
  // viewTarget: read-only contract view — terminated history + MERCHANT
  // contracts (which the platform admin can view but not edit).
  const [viewTarget, setViewTarget] = useState(null);
  // editTarget: the single live contract being edited in its own modal.
  // editDirty gates a discard-confirm on close.
  const [editTarget, setEditTarget] = useState(null);
  const [editDirty, setEditDirty] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  // Entitlements-editor action state lifted out of the Edit modal body so the
  // Cancel / Save buttons live in the modal FOOTER. Functions in the ref,
  // editing/canSave flags in state to drive footer re-render.
  const editActionsRef = React.useRef({});
  const [editUi, setEditUi] = useState({ editing: false, canSave: false });
  // Reset footer action state whenever the Edit modal closes.
  React.useEffect(() => { if (!editTarget) setEditUi({ editing: false, canSave: false }); }, [editTarget]);
  // addOpen: the single "Add a contract" modal. convertCtx: the pilot→formal
  // authorization flow, { pilot, formalKind }.
  const [addOpen, setAddOpen] = useState(false);
  const [convertCtx, setConvertCtx] = useState(null);
  // statusTarget = { contract, next }. Drives the Suspend/Resume confirm.
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [extendTarget, setExtendTarget] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  // Per-row kebab menu — { contract, anchor } when open.
  const [rowMenu, setRowMenu] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  // The acting operator's entity — auto-filled as the authorizing entity on
  // new / converted contracts. The platform admin acts as NPT.
  const actorEntityName = 'NPT';

  const openStatusConfirm = (contract, next) => {
    setStatusReason('');
    setStatusTarget({ contract, next });
  };

  // Split contracts into live (anything not TERMINATED) and history.
  const liveContracts    = customer.contracts.filter((c) => _CS(c.status) !== 'TERMINATED');
  const historyContracts = customer.contracts.filter((c) => _CS(c.status) === 'TERMINATED');

  // MERCHANT contracts are authorized + maintained by the customer's ISO,
  // never by the platform admin — they're view-only here (no add/edit/remove).
  const isMerchant = (c) => String(window.baseKind(c.kind)).toUpperCase() === 'MERCHANT';

  // Options available to add right now (family-aware: hides held formals,
  // offers "convert" when a pilot is live, never offers MERCHANT/ADMIN).
  // Drives the Add-contract button's enabled state.
  const addOptions = window.contractAddOptions
    ? window.contractAddOptions(customer.contracts, customer.timezone)
    : [];

  // Close the edit modal, guarding unsaved entitlement edits.
  const requestCloseEdit = () => {
    if (editDirty) setPendingClose(true);
    else { setEditTarget(null); setEditDirty(false); }
  };

  // A picked add-option: convert → authorization flow; otherwise add directly.
  const onPickConvert = (opt) => { setAddOpen(false); setConvertCtx({ pilot: opt.convert, formalKind: opt.kind }); };
  const addOne = (kind, formEnts, terms) => {
    const sch = (window.CONTRACT_ENTITLEMENT_SCHEMA && window.CONTRACT_ENTITLEMENT_SCHEMA[String(kind).toUpperCase()]) || [];
    const outEnts = window.formToEntitlements ? window.formToEntitlements(formEnts || {}, sch) : {};
    onAdd([kind], { [kind]: outEnts }, { [kind]: terms || {} });
    toast({ kind: 'success', title: `${kind} contract added` });
    setAddOpen(false);
  };

  return (
    <>
      <div className="info-card">
        <div className="info-card__head">
          <div className="info-card__title" data-comment-anchor="6c62b1b966-div-206-11">Contracts</div>
          <Btn variant="primary" size="sm" icon="plus"
            disabled={addOptions.length === 0}
            title={addOptions.length === 0 ? 'No contract types available to add' : undefined}
            onClick={() => setAddOpen(true)}>
            Add contract
          </Btn>
        </div>
        <div>
          {customer.contracts.length === 0 ? <div className="empty">No contracts yet. Click <strong>Add contract</strong> to assign one.</div> :
          liveContracts.length === 0 ? <div className="empty">No active contracts. All {historyContracts.length} contract{historyContracts.length === 1 ? ' is' : 's are'} terminated — see history below.</div> :
          liveContracts.map((c, i) => {
            const eff = window.effectiveStatus(c, customer.timezone);
            const merchant = isMerchant(c);
            const canEdit = eff !== 'TERMINATED' && !merchant;
            return (
              <div
                key={i}
                className={`crow ${canEdit ? 'crow--clickable' : ''}`}
                role={canEdit ? 'button' : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onClick={canEdit ? () => setEditTarget(c) : undefined}
                onKeyDown={canEdit ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditTarget(c); } } : undefined}
              >
                <div className={`pick-card__icon pick-card__icon--${window.baseKind(c.kind).toLowerCase()}`} style={{ width: 40, height: 40, borderRadius: 10 }}>
                  <Icon name={iconForKind(c.kind)} size={18} />
                </div>
                <div className="crow__main">
                  <div className="crow__title">
                    {c.kind}
                    <StatusChip status={c.status} effectiveTo={c.effectiveTo} tz={customer.timezone} kind={c.kind}/>
                    {(() => {
                      const ex = _expiryState(c, customer.timezone);
                      if (!ex) return null;
                      const isPilot = ex.kind === 'pilot-active' || ex.kind === 'pilot-expiring' || ex.kind === 'pilot-expired';
                      const isPast = ex.kind === 'expired' || ex.kind === 'pilot-expired';
                      const isWarn = ex.kind === 'expiring' || ex.kind === 'pilot-expiring';
                      const cls = isPast ? 'tds-badge tds-badge--error' : (isWarn ? 'tds-badge tds-badge--warning' : 'tds-badge tds-badge--pilot');
                      const text = ex.kind === 'expired' ? ('Expired ' + ex.days + 'd ago')
                                 : ex.kind === 'pilot-expired' ? ('Pilot expired ' + ex.days + 'd ago')
                                 : isPilot ? (ex.days + 'd left')
                                 : ('Expires in ' + ex.days + 'd');
                      return (
                        <span className={cls}>
                          <Icon name={isPast ? 'alert' : 'clock'} size={11}/>
                          {text}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="crow__sub">
                    {_contractRowSubtitle(c, customer)}
                    {merchant && <span style={{ display: 'block', marginTop: 2, color: 'var(--color-text-tertiary)' }}>Maintained by the customer's ISO — view only.</span>}
                  </div>
                </div>
                <div className="crow__actions">
                  {merchant ? (
                    <button type="button" className="iconbtn" title="View details" aria-label="View details" onClick={(e) => { e.stopPropagation(); setViewTarget(c); }}>
                      <Icon name="eye" size={14}/>
                    </button>
                  ) : (<>
                  {/* Edit is the whole row — no separate button. The
                      kebab menu holds state-machine actions (Suspend /
                      Resume / Extend pilot / Terminate). stopPropagation on
                      the menu trigger so the row's click doesn't fire too. */}
                  <div className="opmenu-wrap" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="iconbtn"
                      title="More actions"
                      aria-label="More actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        setRowMenu((m) => m?.id === c.id ? null : {
                          id: c.id,
                          contract: c,
                          anchor: { right: window.innerWidth - r.right, top: r.bottom + 4 },
                        });
                      }}
                    >
                      <Icon name="more" size={14}/>
                    </button>
                  </div>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {historyContracts.length > 0 && (
        <div className="info-card" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="info-card__head"
            onClick={() => setShowHistory((v) => !v)}
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}
          >
            <div className="info-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={showHistory ? 'chevD' : 'chevR'} size={12}/>
              History
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({historyContracts.length} terminated)</span>
            </div>
          </button>
          {showHistory && (
            <div>
              {historyContracts.map((c, i) => (
                <div key={i} className="crow" style={{ opacity: 0.7 }}>
                  <div className={`pick-card__icon pick-card__icon--${window.baseKind(c.kind).toLowerCase()}`} style={{ width: 40, height: 40, borderRadius: 10, filter: 'grayscale(0.6)' }}>
                    <Icon name={iconForKind(c.kind)} size={18} />
                  </div>
                  <div className="crow__main">
                    <div className="crow__title" style={{ textDecoration: 'line-through', textDecorationColor: 'var(--color-text-tertiary)' }}>
                      {c.kind}
                      <StatusChip status={c.status} effectiveTo={c.effectiveTo} tz={customer.timezone} kind={c.kind}/>
                    </div>
                    <div className="crow__sub">
                      {_contractRowSubtitle(c, customer)}
                    </div>
                  </div>
                  <div className="crow__actions">
                    <button type="button" className="iconbtn" title="View" aria-label="View" onClick={() => setViewTarget(c)}>
                      <Icon name="eye" size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Row kebab menu — rendered here (not inside .crow__actions) so it
          escapes the info-card's overflow:hidden. Positioned via fixed
          coords captured when the trigger was clicked. */}
      {rowMenu && (() => {
        const c = rowMenu.contract;
        const eff = window.effectiveStatus(c, customer.timezone);
        // PILOT and SUSPENDED both go to TERMINATED via the separator;
        // ACTIVE/SIGNED also get a status action above the separator.
        const showStateAction =
          eff === 'ACTIVE' || eff === 'SIGNED' || eff === 'SUSPENDED' ||
          eff === 'EXPIRED';
        return (
          <>
            <div
              onClick={() => setRowMenu(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 7000 }}
            />
            <div
              className="opmenu"
              style={{
                position: 'fixed',
                top: rowMenu.anchor.top,
                right: rowMenu.anchor.right,
                zIndex: 7001,
              }}
            >
              {(eff === 'ACTIVE' || eff === 'SIGNED') && (
                <button className="opmenu__item" onClick={() => { setRowMenu(null); openStatusConfirm(c, 'SUSPENDED'); }}>
                  <Icon name="pause" size={14}/> Suspend
                </button>
              )}
              {eff === 'SUSPENDED' && (
                <button className="opmenu__item" onClick={() => { setRowMenu(null); openStatusConfirm(c, 'ACTIVE'); }}>
                  <Icon name="play" size={14}/> Resume
                </button>
              )}
              {window.contractIsPilot(c) && (
                <button className="opmenu__item" onClick={() => { setRowMenu(null); setExtendTarget(c); }}>
                  <Icon name="refresh" size={14}/> Extend pilot
                </button>
              )}
              {eff === 'EXPIRED' && !window.contractIsPilot(c) && (
                <button className="opmenu__item" onClick={() => { setRowMenu(null); setRenewTarget(c); }}>
                  <Icon name="refresh" size={14}/> Renew contract
                </button>
              )}
              {showStateAction && <div className="opmenu__sep"/>}
              <button className="opmenu__item opmenu__item--danger" onClick={() => { setRowMenu(null); setRemoveTarget(c); }}>
                <Icon name="ban" size={14}/> Terminate
              </button>
            </div>
          </>
        );
      })()}

      {/* ── Add a contract (single) ── */}
      {addOpen && window.AddContractModal && (
        <window.AddContractModal
          customer={customer}
          onClose={() => setAddOpen(false)}
          onAddOne={addOne}
          onConvert={onPickConvert}
        />
      )}

      {/* ── Edit one contract ── */}
      <Modal
        open={!!editTarget}
        onClose={requestCloseEdit}
        title={editTarget ? `${editTarget.kind} contract` : 'Contract'}
        width={720}
        footer={editUi.editing ? <>
          <div style={{ flex: 1 }}/>
          <Btn variant="ghost" onClick={requestCloseEdit}>Cancel</Btn>
          <Btn variant="primary" icon="check" disabled={!editUi.canSave} onClick={() => editActionsRef.current.save?.()}>Save changes</Btn>
        </> : <>
          <div style={{ flex: 1 }}/>
          <Btn variant="secondary" onClick={requestCloseEdit}>Close</Btn>
        </>}
      >
        {editTarget && (
          <ContractDetailView
            key={editTarget.id || editTarget.kind}
            contract={editTarget}
            customer={customer}
            initialEdit
            onUpdateContract={onUpdateContract}
            onDirtyChange={setEditDirty}
            onActions={(a) => { editActionsRef.current = a; setEditUi({ editing: a.editing, canSave: a.canSave }); }}
            onSaved={() => { setEditTarget(null); setEditDirty(false); }}
          />
        )}
      </Modal>

      {/* ── Pilot → formal authorization flow ── */}
      {convertCtx && window.ContractAuthorizeFlow && (
        <window.ContractAuthorizeFlow
          customer={customer}
          pilot={convertCtx.pilot}
          formalKind={convertCtx.formalKind}
          actorEntityName={actorEntityName}
          onClose={() => setConvertCtx(null)}
          onAuthorize={({ ents, terms, reason }) => {
            onConvertContract(convertCtx.pilot, convertCtx.formalKind, ents, terms, reason, actorEntityName);
          }}
        />
      )}

      {/* Read-only contract view — TERMINATED history + MERCHANT contracts. */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget ? `${viewTarget.kind} contract${_CS(viewTarget.status) === 'TERMINATED' ? ' · history' : ''}` : 'Contract'}
        width={720}
        footer={<>
          <div style={{ flex: 1 }}/>
          <Btn variant="secondary" onClick={() => setViewTarget(null)}>Close</Btn>
        </>}
      >
        {viewTarget && (
          <ContractDetailView
            key={viewTarget.id || viewTarget.kind}
            contract={viewTarget}
            customer={customer}
            readOnly
            onUpdateContract={onUpdateContract}
          />
        )}
      </Modal>

      {/* Discard-changes confirm — fires from the Edit modal when entitlements
          are dirty and the admin tries to close. */}
      <Modal
        open={pendingClose}
        onClose={() => setPendingClose(false)}
        title="Discard unsaved changes?"
        width={420}
        footer={<>
          <Btn variant="ghost" onClick={() => setPendingClose(false)}>Keep editing</Btn>
          <Btn variant="danger" icon="trash" onClick={() => {
            setPendingClose(false);
            setEditTarget(null);
            setEditDirty(false);
          }}>Discard changes</Btn>
        </>}
      >
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          You have unsaved contract changes. Closing now will discard them.
        </p>
      </Modal>

      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.next === 'SUSPENDED' ? 'Suspend contract' : 'Resume contract'}
        width={460}
        footer={<>
          <Btn variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Btn>
          <Btn
            variant={statusTarget?.next === 'SUSPENDED' ? 'danger' : 'primary'}
            icon={statusTarget?.next === 'SUSPENDED' ? 'minus' : 'check'}
            disabled={statusTarget?.next === 'SUSPENDED' && !statusReason.trim()}
            onClick={() => {
              const { contract, next } = statusTarget;
              onStatusChange(contract, next, statusReason.trim() || undefined);
              toast({
                kind: next === 'SUSPENDED' ? 'warning' : 'success',
                title: `${contract.kind} contract ${next === 'SUSPENDED' ? 'suspended' : 'resumed'}`,
                msg: statusReason.trim() ? `Reason: ${statusReason.trim()}` : undefined,
              });
              setStatusTarget(null);
            }}>
            {statusTarget?.next === 'SUSPENDED' ? 'Suspend contract' : 'Resume contract'}
          </Btn>
        </>}>
        {statusTarget && (() => {
          const isSuspend = statusTarget.next === 'SUSPENDED';
          return (
            <div className="stack">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
                {isSuspend ? (
                  <>You're about to suspend the <strong>{statusTarget.contract.kind}</strong> contract.
                  The customer will immediately lose access to features granted by this contract.
                  The contract record stays on file and can be resumed later.</>
                ) : (
                  <>Resume the <strong>{statusTarget.contract.kind}</strong> contract?
                  The customer will regain access to features granted by this contract.</>
                )}
              </p>
              <Field label={isSuspend ? 'Reason (required, written to audit log)' : 'Note (optional)'}>
                <Textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={isSuspend
                    ? 'e.g. Payment overdue 60+ days · pending dispute resolution'
                    : 'e.g. Payment received · dispute resolved'}
                />
              </Field>
              {isSuspend && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5, marginTop: -4 }}>
                  This appears in the customer's audit timeline and the contract detail view.
                  Suspended contracts can be resumed or terminated later.
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title={(() => {
          if (!removeTarget) return '';
          const s = _CS(removeTarget.status);
          if (s === 'SUSPENDED') return 'Terminate suspended contract';
          return 'Terminate contract';
        })()}
        width={440}
        footer={<>
          <Btn variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Btn>
          <Btn variant="danger" icon="ban" onClick={() => {
            onRemove(removeTarget);
            toast({ kind: 'warning', title: `${removeTarget.kind} contract terminated` });
            setRemoveTarget(null);
          }}>
            Terminate contract
          </Btn>
        </>}>
        {removeTarget && (() => {
          const s = _CS(removeTarget.status);
          const needsReason = s === 'ACTIVE' || s === 'SIGNED' || s === 'SUSPENDED';
          return (
            <div className="stack">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
                {s === 'SUSPENDED' && (
                  <>The <strong>{removeTarget.kind}</strong> contract is currently suspended. Terminating it makes the change permanent — the contract becomes a historical record and cannot be reactivated.</>
                )}
                {(s === 'ACTIVE' || s === 'SIGNED') && (
                  <>You're about to terminate <strong>{removeTarget.kind}</strong>. The customer will lose access to features granted by this contract.</>
                )}
              </p>
              {needsReason && (
                <Field label="Reason (audit log)">
                  <Textarea rows={2} placeholder="e.g. customer requested transition to PayFac model" defaultValue="" />
                </Field>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Extend pilot modal ───────────────────────────────────
          Single-step. Lets admin pick +30/+60/+90 days (relative to
          today, NOT additive to current effectiveTo). Writes a
          PILOT_EXTEND event + updates effectiveTo via onUpdateContract. */}
      <ExtendPilotModal
        target={extendTarget}
        onClose={() => setExtendTarget(null)}
        onConfirm={({ days, reason }) => {
          // New expiry = today + N days, as a calendar DATE in the partner's tz.
          const newTo = window.addDaysDate(window.todayDate(customer.timezone), days);
          const audit = reason
            ? `Pilot extended +${days} days — reason: ${reason}`
            : `Pilot extended +${days} days`;
          onUpdateContract(
            extendTarget,
            { effectiveTo: newTo },
            audit,
            {
              eventType: 'PILOT_EXTEND',
              eventInfo: { fromEffectiveTo: extendTarget.effectiveTo, toEffectiveTo: newTo, days, reason: reason || null },
            }
          );
          toast({ kind: 'success', title: `Pilot extended +${days} days`, msg: `New expiry: ${fmtDate(newTo)}` });
          setExtendTarget(null);
        }}
      />

      {/* ── Renew contract modal ─────────────────────────────────
          For EXPIRED formal contracts. New term runs from today
          (+90/+180/+1y). Writing a future effectiveTo is enough to
          revive the contract — EXPIRED is derived, not persisted. */}
      <RenewContractModal
        target={renewTarget}
        customer={customer}
        onClose={() => setRenewTarget(null)}
        onConfirm={({ days, reason }) => {
          const newTo = new Date(Date.now() + days * 86400000).toISOString();
          const label = days === 365 ? '+1 year' : `+${days} days`;
          const audit = reason
            ? `${renewTarget.kind} contract renewed ${label} — reason: ${reason}`
            : `${renewTarget.kind} contract renewed ${label}`;
          onUpdateContract(
            renewTarget,
            { effectiveTo: newTo },
            audit,
            {
              eventType: 'CONTRACT_RENEW',
              eventInfo: { fromEffectiveTo: renewTarget.effectiveTo, toEffectiveTo: newTo, days, reason: reason || null },
            }
          );
          toast({ kind: 'success', title: `${renewTarget.kind} contract renewed`, msg: `In force again until ${fmtDate(newTo)}` });
          setRenewTarget(null);
        }}
      />
    </>);

};

// ─── Invite link details modal — opens after FIRST mint or REGENERATE ────────
// In v3 this is the only "big" popup. It exists because right after a link is
// minted/regenerated, the user needs to see/copy/QR-scan/email the new link —
// there's no other time the card alone isn't enough. Once closed, the
// PendingInviteCard carries all the same info inline.
const InviteLinkDetailsModal = ({ open, onClose, onSendEmail, freshlyMinted, invite, customer }) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  // Inline email send lifecycle: 'idle' → 'sending' → 'sent' | 'error'.
  const [sendState, setSendState] = useState('idle');
  const [sentTo, setSentTo] = useState('');
  const [sendErr, setSendErr] = useState('');
  const sendTimer = React.useRef(null);
  // Mock delivery. Demo hook: addresses containing "fail"/"bounce" reproduce
  // the rejection path so the failure feedback is reviewable; others succeed.
  const doSendEmail = () => {
    if (!validEmail || sendState === 'sending') return;
    setSendState('sending'); setSendErr('');
    sendTimer.current = setTimeout(() => {
      if (/fail|bounce/i.test(email)) {
        setSendState('error');
        setSendErr('The mail server rejected the message (550 mailbox unavailable). The link is unchanged — fix the address and retry, or copy it above.');
      } else {
        if (onSendEmail) onSendEmail(email);
        setSentTo(email);
        setSendState('sent');
      }
    }, 950);
  };

  const inviteUrl = invite?.url || '';
  const expiresLabel = React.useMemo(() => {
    if (!invite?.expiresAt) return '';
    return new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [invite?.expiresAt]);
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  React.useEffect(() => {
    if (open) {
      setEmail(invite?.recipientEmail || customer?.email || '');
      setCopied(false);
      setSendState('idle'); setSentTo(''); setSendErr('');
    }
    return () => { if (sendTimer.current) clearTimeout(sendTimer.current); };
  }, [open, invite, customer?.email]);

  if (!invite) return null;

  return (
    <Modal open={open} onClose={onClose} title="Admin invite link" width={580}
      footer={<Btn variant="ghost" onClick={onClose}>Close</Btn>}>

      {/* Fresh-mint banner */}
      {freshlyMinted &&
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', marginBottom: 14,
          background: 'var(--color-success-50, var(--color-bg-3))',
          border: '1px solid oklch(58% 0.14 152 / 0.25)',
          borderRadius: 8, fontSize: 12.5, color: 'var(--color-success-700)'
        }}>
          <Icon name="check" size={13} />
          <span>
            <strong style={{ fontWeight: 600 }}>New activation link generated</strong>
            {' · expires '}<strong style={{ fontWeight: 600 }}>{expiresLabel}</strong>.
          </span>
        </div>
      }

      {/* Link + QR */}
      <div className="stack" style={{ gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
            Invite link
          </div>
          <div className="link-box">
            <Icon name="link" size={14} />
            <span className="link-box__url">{inviteUrl}</span>
            <Btn variant="secondary" size="sm" icon={copied ? 'check' : 'copy'}
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl);
                setCopied(true);
                toast({ kind: 'success', title: 'Link copied to clipboard' });
                setTimeout(() => setCopied(false), 1800);
              }}>
              {copied ? 'Copied' : 'Copy'}
            </Btn>
          </div>
        </div>
        <div className="qr-block">
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden>
            <rect width="92" height="92" fill="#fff" />
            {Array.from({ length: 11 * 11 }).map((_, i) => {
              const x = i % 11, y = Math.floor(i / 11);
              const filled = (x * 7 + y * 13 + (inviteUrl.charCodeAt(i % inviteUrl.length) || 0)) % 3 === 0 || x < 3 && y < 3 || x > 7 && y < 3 || x < 3 && y > 7;
              return filled ? <rect key={i} x={6 + x * 7} y={6 + y * 7} width="6" height="6" fill="#18181B" /> : null;
            })}
            <rect x="6" y="6" width="20" height="20" fill="none" stroke="#18181B" strokeWidth="2" />
            <rect x="66" y="6" width="20" height="20" fill="none" stroke="#18181B" strokeWidth="2" />
            <rect x="6" y="66" width="20" height="20" fill="none" stroke="#18181B" strokeWidth="2" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Or scan the QR code</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              The recipient will set their password and enroll 2FA before first login.
            </div>
          </div>
        </div>
      </div>

      {/* Send by email — inline */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '4px 0 14px',
        color: 'var(--color-text-tertiary)',
        fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
        <span>Send by email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
      </div>

      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSendEmail(); }}
              disabled={sendState === 'sending'}
              prefix={<Icon name="mail" size={14} />} />
          </div>
          <Btn
            variant="primary"
            icon="mail"
            disabled={!validEmail || sendState === 'sending'}
            onClick={doSendEmail}>
            {sendState === 'sending' ? 'Sending…' : (sendState === 'error' ? 'Try Again' : 'Send')}
          </Btn>
        </div>
        {sendState === 'sending' &&
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 12, height: 12, border: '2px solid var(--color-border-strong)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'tds-spin 0.7s linear infinite' }} />
            Sending to {email}…
          </div>
        }
        {sendState === 'sent' &&
          <div style={{
            marginTop: 8, fontSize: 12,
            color: 'var(--color-success-700)',
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <Icon name="check" size={13} /> Sent to {sentTo}.
          </div>
        }
        {sendState === 'error' &&
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-error-700)', display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.5 }}>
            <Icon name="alert" size={13} style={{ flex: 'none', marginTop: 1 }} /> <span>{sendErr}</span>
          </div>
        }
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
          {invite?.recipientEmail
            ? <>Pre-filled with the previous recipient — edit if it should go somewhere else.</>
            : <>Pre-filled with the customer's contact email — edit if needed.</>
          }
        </div>
      </div>
    </Modal>);

};

// ─── Send invite via email — small confirm dialog ────────
// Opened from PendingInviteCard's "Send via email" button. Single email field;
// editing the recipient happens here, not on the card. Same dialog serves
// first-time send (link-only state) and re-send (recipient already on file).
const SendInviteEmailDialog = ({ open, onClose, onSend, invite, customer }) => {
  const [email, setEmail] = useState('');
  // Send lifecycle so the operator gets explicit feedback in-dialog rather
  // than a fire-and-forget close: 'idle' → 'sending' → 'sent' | 'error'.
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setEmail(invite?.recipientEmail || customer?.email || '');
      setStatus('idle');
      setErrMsg('');
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, invite, customer?.email]);

  // Mock delivery. Real wiring would await the mail service; here we simulate
  // latency and a deliverability outcome. Demo hook: any address containing
  // "fail" (e.g. bounce@fail.test) reproduces the rejection path so operators
  // can see the failure feedback; everything else succeeds.
  const doSend = () => {
    if (!validEmail || status === 'sending') return;
    setStatus('sending');
    setErrMsg('');
    timerRef.current = setTimeout(() => {
      const willFail = /fail|bounce/i.test(email);
      if (willFail) {
        setStatus('error');
        setErrMsg('The mail server rejected the message (550 mailbox unavailable). The activation link is unchanged — fix the address and try again, or copy the link and share it another way.');
      } else {
        // Commit on success only — parent records the event + fires its toast.
        onSend(email);
        setStatus('sent');
      }
    }, 950);
  };

  let footer;
  if (status === 'sent') {
    footer = <Btn variant="primary" icon="check" onClick={onClose}>Done</Btn>;
  } else if (status === 'error') {
    footer = <>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" icon="refresh" disabled={!validEmail} onClick={doSend}>Try again</Btn>
    </>;
  } else {
    footer = <>
      <Btn variant="ghost" onClick={onClose} disabled={status === 'sending'}>Cancel</Btn>
      <Btn variant="primary" icon="mail" disabled={!validEmail || status === 'sending'} onClick={doSend}>
        {status === 'sending' ? 'Sending…' : 'Send'}
      </Btn>
    </>;
  }

  return (
    <Modal open={open} onClose={onClose} title="Send activation email" width={480} footer={footer}>
      {status === 'sent' ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}>
            <Icon name="check" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>Activation email sent</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              The invitation link was emailed to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>. The link itself is unchanged, so any copy already shared still works.
            </div>
          </div>
        </div>
      ) : status === 'error' ? (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--color-error-50)', color: 'var(--color-error-700)' }}>
              <Icon name="alert" size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3, color: 'var(--color-error-700)' }}>Couldn't send the email</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{errMsg}</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
            Recipient email
          </div>
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefix={<Icon name="mail" size={14} />}
            autoFocus />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            The invitation link will be emailed to the address below. The link itself <strong style={{ color: 'var(--color-text-primary)' }}>doesn't change</strong> — anyone who already received it can still use the same link.
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
            Recipient email
          </div>
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSend(); }}
            prefix={<Icon name="mail" size={14} />}
            disabled={status === 'sending'}
            autoFocus />
          {status === 'sending' && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 13, height: 13, border: '2px solid var(--color-border-strong)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'tds-spin 0.7s linear infinite' }} />
              Sending to {email}…
            </div>
          )}
        </>
      )}
    </Modal>);

};

// ─── Regenerate confirm — destructive warning before minting a new link ────────
// Step 1 of the 2-step regenerate flow. Lists the concrete damage (which
// emailed link goes dead, who's affected) so the user can't fire it blindly.
// On confirm, parent mints a new token and opens InviteLinkDetailsModal.
const RegenerateConfirmDialog = ({ open, onClose, onConfirm, invite }) => {
  return (
    <Modal open={open} onClose={onClose} title="Regenerate activation link?" width={480}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" icon="refresh" onClick={onConfirm}>Regenerate &amp; invalidate old</Btn>
      </>}>
      <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        A new single-use link will be created with a fresh 7-day expiry.
      </div>
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '11px 13px',
        background: 'var(--color-error-50, var(--color-bg-3))',
        border: '1px solid oklch(60% 0.18 25 / 0.3)',
        borderRadius: 8, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.55
      }}>
        <Icon name="alert" size={14} style={{ flex: 'none', marginTop: 1, color: 'var(--color-error-700)' }} />
        <div>
          <div style={{ color: 'var(--color-error-700)', fontWeight: 600, marginBottom: 4 }}>
            The current link will stop working immediately.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {invite?.recipientEmail
              ? <li>The email previously sent to <strong style={{ color: 'var(--color-text-primary)' }}>{invite.recipientEmail}</strong> will become useless</li>
              : <li>Anyone with the previous link will see "link expired"</li>
            }
            <li>You'll need to share the new link separately</li>
          </ul>
        </div>
      </div>
    </Modal>);

};

// ─── Operator action menu ─────────────────────────────────
const OP_ACTIONS = {
  lock: { label: 'Lock account', icon: 'lock' },
  unlock: { label: 'Unlock account', icon: 'unlock' },
  reset: { label: 'Reset password', icon: 'key' },
  resend: { label: 'Resend activation', icon: 'mail' },
};

const OperatorMenu = ({ op, onAction }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const pick = (a) => {setOpen(false);onAction(a);};

  return (
    <div className="opmenu-wrap">
      <button ref={btnRef} className="iconbtn" onClick={() => setOpen((o) => !o)} aria-label="Operator actions"><Icon name="more" /></button>
      {open && pos && ReactDOM.createPortal(
        <div ref={menuRef} className="opmenu" role="menu" style={{ position: 'fixed', top: pos.top, right: pos.right }}>
          {op.pending && <button className="opmenu__item" onClick={() => pick('resend')}><Icon name="mail" size={14} />{OP_ACTIONS.resend.label}</button>}
          {!op.pending && op.locked &&
            <button className="opmenu__item" onClick={() => pick('unlock')}>
              <Icon name="unlock" size={14} />{OP_ACTIONS.unlock.label}
            </button>
          }
          {!op.pending && !op.locked && <>
            <button className="opmenu__item" onClick={() => pick('reset')}>
              <Icon name="key" size={14} />{OP_ACTIONS.reset.label}
            </button>
            <button className="opmenu__item" onClick={() => pick('lock')}>
              <Icon name="lock" size={14} />{OP_ACTIONS.lock.label}
            </button>
          </>}
        </div>,
        document.body
      )}
    </div>);

};

// ─── Devices tab (sample devices + sample orders for this customer) ──
const deviceRowStatus = (order, item, dev) => {
  const activated = !!(dev.sn && dev.code && dev.code.length === 6);
  const shipped = item.shipped === true || order.status === 'SHIPPED' || order.status === 'DELIVERED';
  if (!activated) return { label: 'Pending activation', tone: 'warning' };
  if (shipped) return { label: 'Deployed', tone: 'success' };
  return { label: 'Activated', tone: 'info' };
};

const TabDevices = ({ customer, orders, onOpenOrder, onNewOrder }) => {
  const [view, setView] = useState('devices'); // 'devices' | 'orders'

  const customerOrders = useMemo(
    () => orders.filter((o) => (o.partyId || o.customerId) === customer.id),
    [orders, customer.id]
  );

  // Flatten every device line across all orders for this customer
  const allDevices = useMemo(() => {
    const rows = [];
    customerOrders.forEach((o) => {
      o.items.forEach((item) => {
        (item.devices || []).forEach((dev, idx) => {
          rows.push({
            key: `${o.id}:${item.id}:${idx}`,
            order: o,
            item,
            dev,
            slot: idx + 1,
            status: deviceRowStatus(o, item, dev)
          });
        });
        // If an item's qty exceeds its devices array length, surface remaining slots as pending
        const missing = item.qty - (item.devices || []).length;
        for (let i = 0; i < missing; i++) {
          rows.push({
            key: `${o.id}:${item.id}:empty:${i}`,
            order: o,
            item,
            dev: { sn: '', code: '', type: item.variantLabel || item.type || '' },
            slot: (item.devices || []).length + i + 1,
            status: { label: 'Pending activation', tone: 'warning' }
          });
        }
      });
    });
    return rows;
  }, [customerOrders]);

  // Combined stats across both worlds
  const stats = useMemo(() => {
    const totalDevices = allDevices.length;
    const activated = allDevices.filter((r) => r.dev.sn && r.dev.code && r.dev.code.length === 6).length;
    const deployed = allDevices.filter((r) => r.status.label === 'Deployed').length;
    const pending = totalDevices - activated;
    return {
      totalDevices,
      activated,
      deployed,
      pending,
      ordersTotal: customerOrders.length,
      ordersActive: customerOrders.filter((o) => o.status === 'SHIPPED' || o.status === 'PENDING_SHIP' || o.status === 'PENDING_PAYMENT').length
    };
  }, [allDevices, customerOrders]);

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Shared summary across both sub-views */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 0 }}>
        <div className="stat" style={{ padding: '14px 16px' }}>
          <div className="stat__label">Sample devices</div>
          <div className="stat__val">{stats.totalDevices}</div>
          <div className="stat__delta">across {stats.ordersTotal} order{stats.ordersTotal === 1 ? '' : 's'}</div>
        </div>
        <div className="stat" style={{ padding: '14px 16px' }}>
          <div className="stat__label">Deployed</div>
          <div className="stat__val" style={{ color: 'var(--color-success-700)' }}>{stats.deployed}</div>
          <div className="stat__delta">activated &amp; shipped</div>
        </div>
        <div className="stat" style={{ padding: '14px 16px' }}>
          <div className="stat__label">Pending activation</div>
          <div className="stat__val" style={{ color: 'var(--color-warning-700)' }}>{stats.pending}</div>
          <div className="stat__delta">awaiting SN + code</div>
        </div>
        <div className="stat" style={{ padding: '14px 16px' }}>
          <div className="stat__label">Orders in flight</div>
          <div className="stat__val" style={{ color: 'var(--color-info-700)' }}>{stats.ordersActive}</div>
          <div className="stat__delta">unpaid or unshipped</div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-card__head" style={{ padding: 0, paddingRight: 16, alignItems: 'stretch' }}>
          <div className="tds-tabs" role="tablist" style={{ border: 0, boxShadow: 'none', marginBottom: -1 }}>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'devices'}
              className={`tds-tab ${view === 'devices' ? 'tds-tab--active' : ''}`}
              onClick={() => setView('devices')}>
              Sample devices
              <span className="tds-tab__count">{stats.totalDevices}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'orders'}
              className={`tds-tab ${view === 'orders' ? 'tds-tab--active' : ''}`}
              onClick={() => setView('orders')}>
              Sample orders
              <span className="tds-tab__count">{stats.ordersTotal}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn variant="secondary" size="sm" icon="link" onClick={() => onOpenOrder && onOpenOrder('__all__')}>View in Orders</Btn>
            <Btn variant="primary" size="sm" icon="plus" onClick={() => onNewOrder && onNewOrder(customer)}>New order</Btn>
          </div>
        </div>

        {view === 'devices' ?
        <DevicesView rows={allDevices} customer={customer} onOpenOrder={onOpenOrder} onNewOrder={onNewOrder} /> :
        <OrdersView orders={customerOrders} customer={customer} onOpenOrder={onOpenOrder} onNewOrder={onNewOrder} />
        }
      </div>
    </div>);

};

// ─── Devices sub-view ─────────────────────────────────────
const DevicesView = ({ rows, customer, onOpenOrder, onNewOrder }) => {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((row) =>
      (row.dev.sn || '').toLowerCase().includes(s) ||
      (row.dev.code || '').toLowerCase().includes(s) ||
      (row.item.name || row.item.modelName || '').toLowerCase().includes(s) ||
      row.order.number.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'All') r = r.filter((row) => row.status.label === statusFilter);
    return r;
  }, [rows, q, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (rows.length === 0) {
    return (
      <div className="empty" style={{ padding: '48px 20px' }}>
        <div style={{ marginBottom: 10, color: 'var(--color-text-secondary)' }}>No sample devices for this customer yet.</div>
        <Btn variant="secondary" size="sm" icon="plus" onClick={() => onNewOrder && onNewOrder(customer)}>Create first order</Btn>
      </div>);

  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input prefix={<Icon name="search" size={14} />} placeholder="Search SN, code, model or order…" value={q} onChange={(e) => {setQ(e.target.value);setPage(1);}} size="sm" />
        </div>
        <div className="tds-select tds-select--sm" style={{ width: 180 }}>
          <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value);setPage(1);}}>
            <option>All</option>
            <option>Pending activation</option>
            <option>Activated</option>
            <option>Deployed</option>
          </select>
          <span className="tds-select__chevron"><Icon name="chevD" size={14} /></span>
        </div>
      </div>

      <table className="tds-table">
        <colgroup>
          <col style={{ width: '1%' }} />
          <col />
          <col style={{ width: '1%' }} />
          <col style={{ width: '1%' }} />
          <col style={{ width: '1%' }} />
          <col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ whiteSpace: 'nowrap' }}>SN</th>
            <th>Model</th>
            <th style={{ whiteSpace: 'nowrap' }}>Activation code</th>
            <th style={{ whiteSpace: 'nowrap' }}>Status</th>
            <th style={{ whiteSpace: 'nowrap' }}>Source order</th>
            <th style={{ textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ?
          <tr><td colSpan="6"><div className="empty">No devices match your filters.</div></td></tr> :
          pageRows.map((row) =>
          <tr key={row.key} onClick={() => onOpenOrder(row.order.id)} style={{ cursor: 'pointer' }}>
              <td style={{ whiteSpace: 'nowrap' }}>
                {row.dev.sn ?
              <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{row.dev.sn}</div> :
              <div className="muted" style={{ fontSize: 12.5 }}>— not assigned —</div>}
              </td>
              <td>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{row.item.name || row.item.modelName}{row.item.variantLabel ? ` · ${row.item.variantLabel}` : ''}</div>
                <div className="cust-meta">{row.dev.type || row.item.variantLabel || '—'}</div>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {row.dev.code ?
              <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, letterSpacing: 1 }}>{row.dev.code}</code> :
              <span className="muted" style={{ fontSize: 12.5 }}>—</span>}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <Badge tone={row.status.tone} dot>{row.status.label}</Badge>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, color: 'var(--color-primary-600)' }}>{row.order.number}</div>
                <div className="cust-meta">{fmtDate(row.order.createdAt)}</div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="iconbtn" onClick={(e) => {e.stopPropagation();onOpenOrder(row.order.id);}}>
                  <Icon name="chevR" size={14} />
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 &&
      <div className="table-foot">
          <div className="table-foot__meta">
            Showing <strong>{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong>–<strong>{(page - 1) * pageSize + pageRows.length}</strong> of <strong>{filtered.length}</strong>
          </div>
          <div className="tds-pagination">
            <button className="tds-pagination__page" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><Icon name="chevL" size={12} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
          <button key={p} className={`tds-pagination__page ${p === page ? 'tds-pagination__page--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          )}
            <button className="tds-pagination__page" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><Icon name="chevR" size={12} /></button>
          </div>
        </div>
      }
    </>);

};

// ─── Orders sub-view ──────────────────────────────────────
const OrdersView = ({ orders, customer, onOpenOrder, onNewOrder }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    let rows = orders;
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((o) =>
      o.number.toLowerCase().includes(s) ||
      o.items.some((i) => (i.name || i.modelName || '').toLowerCase().includes(s))
      );
    }
    if (status === 'In transit') rows = rows.filter((o) => o.status === 'SHIPPED');else
    if (status !== 'All') rows = rows.filter((o) => o.status === status);
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy],bv = b[sortBy];
      const r = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return rows;
  }, [orders, q, status, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const sortCell = (key, label) =>
  <span className="tds-table__sort" onClick={() => {
    if (sortBy === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');else
    {setSortBy(key);setSortDir('asc');}
  }}>
      {label}
      <span style={{ opacity: sortBy === key ? 1 : 0.3, fontSize: 9 }}>{sortBy === key && sortDir === 'asc' ? '▲' : '▼'}</span>
    </span>;


  if (orders.length === 0) {
    return (
      <div className="empty" style={{ padding: '48px 20px' }}>
        <div style={{ marginBottom: 10, color: 'var(--color-text-secondary)' }}>No sample orders for this customer yet.</div>
        <Btn variant="secondary" size="sm" icon="plus" onClick={() => onNewOrder && onNewOrder(customer)}>Create first order</Btn>
      </div>);

  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input prefix={<Icon name="search" size={14} />} placeholder="Search order # or model…" value={q} onChange={(e) => {setQ(e.target.value);setPage(1);}} size="sm" />
        </div>
        <div className="tds-select tds-select--sm" style={{ width: 160 }}>
          <select value={status} onChange={(e) => {setStatus(e.target.value);setPage(1);}}>
            <option value="All">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{window.ORDER_STATUS_LABEL[s] || s}</option>)}
            <option value="In transit">In transit</option>
          </select>
          <span className="tds-select__chevron"><Icon name="chevD" size={14} /></span>
        </div>
      </div>

      <table className="tds-table">
        <colgroup>
          <col style={{ width: '1%' }} />
          <col />
          <col style={{ width: '1%' }} />
          <col style={{ width: '1%' }} />
          <col style={{ width: '1%' }} />
          <col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ whiteSpace: 'nowrap' }}>{sortCell('number', 'Order')}</th>
            <th>Models &amp; units</th>
            <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
            <th style={{ whiteSpace: 'nowrap' }}>{sortCell('status', 'Status')}</th>
            <th style={{ whiteSpace: 'nowrap' }}>{sortCell('createdAt', 'Created')}</th>
            <th style={{ textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ?
          <tr><td colSpan="6"><div className="empty">No orders match your filters.</div></td></tr> :
          pageRows.map((o) => {
            const discount = window.orderDiscountLabel ? window.orderDiscountLabel(o) : '';
            return (
              <tr key={o.id} onClick={() => onOpenOrder(o.id)} style={{ cursor: 'pointer' }}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 500 }}>{o.number}</div>
                </td>
                <td>
                  {o.items.slice(0, 2).map((i, idx) =>
                  <div key={idx} style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{i.name || i.modelName}{i.variantLabel ? ` · ${i.variantLabel}` : ''}</span>
                      <span style={{ marginLeft: 6 }}>× {i.qty}</span>
                    </div>
                  )}
                  {o.items.length > 2 ?
                  <div className="cust-meta">+{o.items.length - 2} more · {orderQty(o)} units total</div> :
                  o.items.length > 1 ?
                  <div className="cust-meta">{orderQty(o)} units total</div> :
                  null}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="num">
                  <div>
                    {orderTotal(o) === 0 ?
                    <span style={{ color: 'var(--color-success-700)', fontWeight: 600 }}>Free</span> :
                    moneyUSD(orderTotal(o))}
                  </div>
                  {discount &&
                  <div className="cust-meta" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                      <Icon name="gift" size={10} style={{ verticalAlign: '-1px' }} />
                      {discount}
                    </div>
                  }
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <Badge tone={ORDER_STATUS_TONE[o.status] || 'neutral'} dot>{window.ORDER_STATUS_LABEL[o.status] || o.status}</Badge>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 13 }}>{fmtDate(o.createdAt)}</div>
                  <div className="cust-meta">{relTime(o.createdAt)}</div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="iconbtn" onClick={(e) => {e.stopPropagation();onOpenOrder(o.id);}}>
                    <Icon name="chevR" size={14} />
                  </button>
                </td>
              </tr>);

          })}
        </tbody>
      </table>

      {totalPages > 1 &&
      <div className="table-foot">
          <div className="table-foot__meta">
            Showing <strong>{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong>–<strong>{(page - 1) * pageSize + pageRows.length}</strong> of <strong>{filtered.length}</strong>
          </div>
          <div className="tds-pagination">
            <button className="tds-pagination__page" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><Icon name="chevL" size={12} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
          <button key={p} className={`tds-pagination__page ${p === page ? 'tds-pagination__page--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          )}
            <button className="tds-pagination__page" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><Icon name="chevR" size={12} /></button>
          </div>
        </div>
      }
    </>);

};

// ─── Roles tab (system + custom) ─────────────────────────
// Returns the set of customer contracts a role effectively applies to,
// given this customer's currently active contract kinds.
const computeRoleAllowed = (role, activeKinds) => {
  // Legacy support (deny/allow lists) — kept as a safety net for any role
  // still using the old shape (e.g. customer-local custom roles created
  // before the schema change).
  if (role.contractsAllowed !== undefined) {
    const sel = role.contractsAllowed || [];
    const mode = role.contractMode || 'allow';
    const all = mode === 'allow' ? sel : ALL_CONTRACT_KINDS.filter((k) => !sel.includes(k));
    return all.filter((k) => !activeKinds || activeKinds.includes(k));
  }
  // New shape: single contractDefineCode (null = applies to all the customer's contracts)
  if (role.contractDefineCode === null || role.contractDefineCode === undefined) {
    return activeKinds ? [...activeKinds] : [];
  }
  // Specific contract — only effective if the customer holds it
  return activeKinds && activeKinds.includes(role.contractDefineCode) ?
  [role.contractDefineCode] :
  [];
};

const TabRoles = ({ customer, onUpdate, systemRoles }) => {
  // System roles come from the App-level shared state so edits in
  // Customer Role Definitions are reflected here immediately. Fall back to
  // window.SEED_ROLES if mounted standalone (e.g. in tests).
  const seedRoles = systemRoles || SEED_ROLES;
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // custom role being edited
  const [confirmDel, setConfirmDel] = useState(null);
  const [permsPreview, setPermsPreview] = useState(null);

  const activeKinds = customer.contracts.map((c) => c.kind);
  const activeSet = new Set(activeKinds);

  const customRoles = customer.customRoles || [];

  // System roles whose effective allowed-contracts intersect this customer's active contracts.
  // We also exclude ADMIN-contract roles entirely — those are platform-staff-only.
  const visibleSystem = seedRoles.
  filter((r) => r.contractDefineCode !== 'ADMIN' && (r.roleType || 'global') === 'global').
  map((r) => {
    const scope = computeRoleAllowed(r, activeKinds);
    return { ...r, _scope: scope };
  }).
  filter((r) => r._scope.length > 0);

  const saveCustomRole = (role) => {
    const exists = customRoles.find((r) => r.id === role.id);
    const next = exists ?
    customRoles.map((r) => r.id === role.id ? role : r) :
    [...customRoles, role];
    onUpdate({
      ...customer,
      customRoles: next,
      events: [...customer.events, {
        at: new Date().toISOString(), kind: 'role',
        by: 'admin@carbon',
        text: `${exists ? 'Updated' : 'Added'} custom role "${role.name}"`
      }]
    });
    toast(`Custom role "${role.name}" saved`);
    setEditing(null);
    setShowAdd(false);
  };

  const deleteCustomRole = (role) => {
    onUpdate({
      ...customer,
      customRoles: customRoles.filter((r) => r.id !== role.id),
      events: [...customer.events, {
        at: new Date().toISOString(), kind: 'role',
        by: 'admin@carbon',
        text: `Removed custom role "${role.name}"`
      }]
    });
    toast(`Custom role "${role.name}" removed`);
    setConfirmDel(null);
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* System roles */}
      <div className="info-card">
        <div className="info-card__head">
          <div>
            <div className="info-card__title">System roles</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              All system-defined roles whose contract scope overlaps this customer's contracts.
            </div>
          </div>
        </div>

        {activeKinds.length === 0 &&
        <div className="empty" style={{ padding: '40px 20px' }}>
            No active contracts yet. Roles will appear here once a contract is signed.
          </div>
        }

        {activeKinds.length > 0 && visibleSystem.length === 0 &&
        <div className="empty" style={{ padding: '40px 20px' }}>
            No system roles match this customer's contract types.
          </div>
        }

        <div>
          {visibleSystem.map((r) => {
            return (
              <div key={r.id} className="crow cust-role-row">
                <div className="pick-card__icon" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-bg-3)', color: 'var(--color-text-secondary)' }}>
                  <Icon name="shield" size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{r.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="muted" style={{ fontSize: 11.5 }}>Scope:</span>
                    {r._scope.map((k) =>
                    <span key={k} className={`perm-chip perm-chip--${k.toLowerCase()}`}>{k}</span>
                    )}
                  </div>
                </div>
              </div>);

          })}
        </div>
      </div>

      {/* Custom roles */}
      <div className="info-card">
        <div className="info-card__head">
          <div>
            <div className="info-card__title">Custom roles</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Customer-specific roles. Only visible to operators of <strong>{customer.name}</strong>.
            </div>
          </div>
          <Btn variant="primary" size="sm" icon="plus" onClick={() => {setEditing(null);setShowAdd(true);}}>Add custom role</Btn>
        </div>
        <div>
          {customRoles.length === 0 ?
          <div className="empty" style={{ padding: '32px 20px' }}>
              No custom roles. Add one to extend permissions beyond the system roles.
            </div> :
          customRoles.map((r) =>
          <div key={r.id} className="crow">
              <div className="pick-card__icon" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
                <Icon name="star" size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  <Badge tone="info">Custom</Badge>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{r.description || 'No description'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {(() => {
                  const scope = computeRoleAllowed(r, activeKinds);
                  if (scope.length === 0) return null;
                  return <>
                      <span className="muted" style={{ fontSize: 11.5 }}>Scope:</span>
                      {r.contractDefineCode === null && scope.length > 1 ?
                    <span className="role-item__contract role-item__contract--generic">all contracts</span> :
                    scope.map((k) =>
                    <span key={k} className={`perm-chip perm-chip--${k.toLowerCase()}`}>{k}</span>
                    )}
                    </>;
                })()}
                </div>
              </div>
              <div className="crow__actions">
                <button type="button" className="iconbtn" title="Edit" aria-label="Edit" onClick={() => {setEditing(r);setShowAdd(true);}}>
                  <Icon name="edit" size={15} />
                </button>
                <button type="button" className="iconbtn iconbtn--danger" title="Delete" aria-label="Delete" onClick={() => setConfirmDel(r)}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomRoleModal
        open={showAdd}
        onClose={() => {setShowAdd(false);setEditing(null);}}
        onSave={saveCustomRole}
        role={editing}
        activeKinds={activeKinds}
        customerName={customer.name}
        customerId={customer.id}
        customRoles={customRoles}
        systemRoles={seedRoles} />
      

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Remove custom role?" width={420}
      footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>Cancel</Btn>
          <Btn variant="danger" size="sm" icon="trash" onClick={() => deleteCustomRole(confirmDel)}>Remove role</Btn>
        </>}>
        <p style={{ margin: 0, fontSize: 13.5 }}>
          <strong>{confirmDel?.name}</strong> will be removed from this customer. Operators using it will fall back to <strong>Viewer</strong>.
        </p>
      </Modal>

      <Modal open={!!permsPreview} onClose={() => setPermsPreview(null)} title={permsPreview ? `${permsPreview.name} — permissions` : ''} width={560}
      footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setPermsPreview(null)}>Close</Btn>
        </>}>
        {permsPreview && (() => {
          const ownedIds = new Set(permsPreview.permissions || []);
          const ownedScope = permsPreview._scope && permsPreview._scope.length ?
          permsPreview._scope :
          computeRoleAllowed(permsPreview, activeKinds);
          // Group all owned permissions under PERMISSION_GROUPS structure
          const grouped = PERMISSION_GROUPS.map((g) => ({
            ...g,
            items: g.items.filter((it) => ownedIds.has(it.id))
          })).filter((g) => g.items.length > 0);
          return (
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                {permsPreview.description || 'System-defined role.'}
              </div>
              {ownedScope.length > 0 &&
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span className="muted" style={{ fontSize: 11.5 }}>Effective on this customer:</span>
                  {ownedScope.map((k) => <span key={k} className={`perm-chip perm-chip--${k.toLowerCase()}`}>{k}</span>)}
                </div>
              }
              {grouped.length === 0 && <div className="empty">No permissions granted.</div>}
              <div className="perm-preview">
                {grouped.map((g) =>
                <div key={g.id} className="perm-preview__group">
                    <div className="perm-preview__grouphead">
                      <span>{g.label}</span>
                      <span className="perm-preview__count">{g.items.length}</span>
                    </div>
                    <ul className="perm-preview__list">
                      {g.items.map((it) =>
                    <li key={it.id} className="perm-preview__item">
                          <div className="perm-preview__check"><Icon name="check" size={11} /></div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="perm-preview__lbl">
                              {it.label}
                              <code className="perm-preview__id">{it.id}</code>
                            </div>
                            <div className="perm-preview__desc">{it.desc}</div>
                          </div>
                        </li>
                    )}
                    </ul>
                  </div>
                )}
              </div>
            </div>);

        })()}
      </Modal>
    </div>);

};

const CustomRoleModal = ({ open, onClose, onSave, role, activeKinds, customerName, customRoles = [], customerId, systemRoles }) => {
  const seedRoles = systemRoles || SEED_ROLES;
  // Custom roles are PRIVATE to this customer and always bound to ONE of the
  // contract types the customer holds. They can never be "Generic" — that
  // semantics belongs to platform-level common roles in SEED_ROLES.
  const customerKinds = (activeKinds || []).filter((k) => k !== 'ADMIN');
  const defaultContract = customerKinds[0] || null;
  const blankDraft = () => ({
    id: 'cr-' + Math.random().toString(36).slice(2, 7),
    name: '',
    description: '',
    roleType: 'private',
    entityId: customerId || null,
    contractDefineCode: defaultContract,
    permissions: [],
    builtin: false,
    operatorCount: 0
  });
  const [draft, setDraft] = useState(role || blankDraft());
  const [copyFromId, setCopyFromId] = useState('');
  React.useEffect(() => {setDraft(role || blankDraft());setCopyFromId(''); /* eslint-disable-next-line */}, [open, role]);

  if (!open) return null;

  const copyFrom = (srcId) => {
    setCopyFromId(srcId);
    if (!srcId) return;
    const src = [...seedRoles, ...customRoles].find((r) => r.id === srcId);
    if (!src) return;
    // Keep the current draft's contract — the picker upstream already
    // restricts sources to this contract, so permissions copy cleanly.
    const validPerms = (src.permissions || []).filter((pid) =>
    permAppliesToContract(pid, draft.contractDefineCode)
    );
    setDraft((d) => ({
      ...d,
      description: d.description || src.description || '',
      permissions: validPerms
    }));
  };

  const togglePerm = (id) => {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(id) ?
      d.permissions.filter((p) => p !== id) :
      [...d.permissions, id]
    }));
  };

  const setContract = (code) => {
    setDraft((d) => {
      const nextPerms = d.permissions.filter((pid) => permAppliesToContract(pid, code));
      return { ...d, contractDefineCode: code, permissions: nextPerms };
    });
  };

  // Permission menus visible under the chosen contract (null = generic only)
  const groups = permissionGroupsForContract(draft.contractDefineCode).
  filter((g) => g.contractDefineCode !== 'ADMIN'); // never show platform-only menus here

  const valid = draft.name.trim().length > 0 && activeKinds.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={role ? 'Edit custom role' : `Add custom role for ${customerName}`} width={660}
    footer={<>
        <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" size="sm" icon="check" onClick={() => onSave(draft)} disabled={!valid}>Save role</Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        {!role && (() => {
          // Filter Copy-from sources by the current draft contract so the
          // operator never copies a role whose permissions get half-stripped.
          const compatibleSeed = seedRoles.filter((r) =>
          r.contractDefineCode !== 'ADMIN' &&
          r.contractDefineCode === draft.contractDefineCode);
          const compatibleCustom = customRoles.filter((r) =>
          r.contractDefineCode === draft.contractDefineCode);
          const hasAny = compatibleSeed.length + compatibleCustom.length > 0;
          return (
            <Field label="Copy from"
            hint={hasAny ?
            `Optional — seed permissions from an existing ${draft.contractDefineCode || 'compatible'} role.` :
            `No existing ${draft.contractDefineCode || ''} roles to copy from. Start blank.`}>
              <div className="tds-select tds-select--md">
                <select value={copyFromId} onChange={(e) => copyFrom(e.target.value)} disabled={!hasAny}>
                  <option value="">— Start blank —</option>
                  {compatibleSeed.length > 0 &&
                  <optgroup label="System roles">
                      {compatibleSeed.map((r) =>
                    <option key={r.id} value={r.id}>{r.name} · {r.permissions.length} perms</option>
                    )}
                    </optgroup>
                  }
                  {compatibleCustom.length > 0 &&
                  <optgroup label="This customer's custom roles">
                      {compatibleCustom.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.permissions.length} perms</option>)}
                    </optgroup>
                  }
                </select>
                <span className="tds-select__chevron"><Icon name="chevD" size={14} /></span>
              </div>
            </Field>);

        })()}
        <Field label="Role name" required>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Onboarding Specialist" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this role is for…" />
        </Field>

        <Field label="Contract type" required
        hint="This role applies to one contract only. Permissions below are filtered accordingly.">
          {customerKinds.length === 0 ?
          <span className="muted" style={{ fontSize: 12 }}>No active contracts yet.</span> :
          customerKinds.length === 1 ?
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`perm-fchip perm-fchip--${customerKinds[0].toLowerCase()} is-on`}>{customerKinds[0]}</span>
              <span className="muted" style={{ fontSize: 12 }}>· only contract on this customer</span>
            </div> :

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {customerKinds.map((k) => {
              const on = draft.contractDefineCode === k;
              return (
                <button key={k} type="button"
                className={`perm-fchip perm-fchip--${k.toLowerCase()} ${on ? 'is-on' : ''}`}
                onClick={() => setContract(k)}>{k}</button>);

            })}
            </div>
          }
        </Field>

        <Field label={`Permissions (${draft.permissions.length} selected)`}>
          <div className="cust-role-perms">
            {groups.length === 0 &&
            <div className="muted" style={{ fontSize: 12, padding: 12 }}>
                No permissions available for this contract type.
              </div>
            }
            {groups.map((g) =>
            <details key={g.id} className="cust-role-perms__group">
                <summary>
                  <Icon name="chevR" size={12} />
                  <span>{g.label}</span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {g.items.filter((i) => draft.permissions.includes(i.id)).length}/{g.items.length}
                  </span>
                </summary>
                <div>
                  {g.items.map((it) => {
                  const on = draft.permissions.includes(it.id);
                  return (
                    <label key={it.id} className={`cust-role-perms__row ${on ? 'is-on' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => togglePerm(it.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{it.desc}</div>
                        </div>
                      </label>);

                })}
                </div>
              </details>
            )}
          </div>
        </Field>
      </div>
    </Modal>);

};

// ─── Pending invite card (v3: fixed action set, expired disables Copy/Send) ──
// Fixed button order across all states: Copy link · Send via email · Regenerate · Revoke.
// View details is gone — the card already shows everything you need to know.
// Editing the recipient happens inside the Send via email dialog, not here.
const PendingInviteCard = ({ invite, status, onCopy, onSendEmail, onRegenerate, onRevoke }) => {
  const expiresLabel = invite?.expiresAt
    ? new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const generatedLabel = invite?.generatedAt ? relTime(invite.generatedAt) : '—';
  const isExpired = invite?.expiresAt ? new Date(invite.expiresAt).getTime() < Date.now() : false;
  const expiresWhen = invite?.expiresAt ? relTime(invite.expiresAt) : '';
  const hasRecipient = !!invite?.recipientEmail;
  return (
    <div style={{
      border: `1px solid ${isExpired ? 'var(--color-error-200, var(--color-border-subtle))' : 'var(--color-border-subtle)'}`,
      borderRadius: 12,
      background: isExpired ? 'var(--color-error-50, var(--color-bg-2, var(--color-bg-1)))' : 'var(--color-bg-2, var(--color-bg-1))',
      padding: 18,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isExpired
          ? 'var(--color-error-100, var(--color-bg-3))'
          : hasRecipient ? 'var(--color-warning-50, var(--color-bg-3))' : 'var(--color-bg-3)',
        color: isExpired
          ? 'var(--color-error-700, var(--color-text-secondary))'
          : hasRecipient ? 'var(--color-warning-700, var(--color-text-secondary))' : 'var(--color-text-secondary)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        border: `1px solid ${
          isExpired ? 'var(--color-error-200, var(--color-border-subtle))'
            : hasRecipient ? 'var(--color-warning-200, var(--color-border-subtle))' : 'var(--color-border-subtle)'
        }`
      }}>
        <Icon name={isExpired ? 'alert' : 'link'} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {isExpired ? 'Admin activation link expired' : 'Admin activation link issued'}
          </div>
          {isExpired
            ? <Badge tone="error" dot>Expired</Badge>
            : <Badge tone="warning" dot>Awaiting activation</Badge>}
          {!isExpired && !hasRecipient && <Badge tone="neutral">Link-only</Badge>}
          {status === 'Onboarding' && <Badge tone="info" dot>Onboarding</Badge>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
          {hasRecipient
            ? <>Recipient: <strong style={{ color: 'var(--color-text-primary)' }}>{invite.recipientEmail}</strong></>
            : <>No recipient email recorded — link shared manually.</>}
          <br />
          Generated {generatedLabel} by <span style={{ color: 'var(--color-text-secondary)' }}>{maskEmail(invite?.generatedBy || 'admin@carbon')}</span> ·{' '}
          {isExpired
            ? <>expired <strong style={{ color: 'var(--color-error-700, var(--color-text-primary))' }}>{expiresWhen}</strong> ({expiresLabel}).</>
            : <>expires <strong style={{ color: 'var(--color-text-primary)' }}>{expiresLabel}</strong>.</>
          }
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', background: 'var(--color-bg-3)',
          border: '1px solid var(--color-border-subtle)', borderRadius: 8,
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 12, color: 'var(--color-text-secondary)',
          marginBottom: 12, overflow: 'hidden',
          opacity: isExpired ? 0.55 : 1,
          textDecoration: isExpired ? 'line-through' : 'none'
        }}>
          <Icon name="link" size={13} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invite?.url}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginBottom: 14 }}>
          {isExpired
            ? <>The link is no longer valid. Anyone who tries it will see <em style={{ color: 'var(--color-error-700)', fontStyle: 'normal' }}>"link expired"</em>. <strong style={{ color: 'var(--color-text-secondary)' }}>Regenerate</strong> to issue a fresh link, or <strong style={{ color: 'var(--color-text-secondary)' }}>Revoke</strong> to cancel the invitation entirely.</>
            : <>An operator will be created when the recipient sets a password and enrolls 2FA. The customer will move to <strong style={{ color: 'var(--color-text-secondary)' }}>Active</strong> at that moment.</>
          }
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="secondary" size="sm" icon="copy" disabled={isExpired} onClick={onCopy}>Copy link</Btn>
          <Btn variant="secondary" size="sm" icon="mail" disabled={isExpired} onClick={onSendEmail}>Send via email</Btn>
          <div style={{ width: 1, height: 18, background: 'var(--color-border-subtle)', margin: '0 2px' }} />
          <Btn variant="ghost" size="sm" icon="refresh" onClick={onRegenerate}>Regenerate</Btn>
          <Btn variant="ghost" size="sm" icon="ban" onClick={onRevoke}>Revoke</Btn>
        </div>
      </div>
    </div>);

};

// ─── Operators tab ────────────────────────────────────────
const TabOperators = ({ customer, onUpdate, maskOn, setMaskOn }) => {
  const toast = useToast();
  const [revealed, setRevealed] = useState({});
  // v3 invite flow state:
  //   inviteDetailsOpen  — big modal (link + QR + inline email) shown ONLY after
  //                        first mint or after regenerate
  //   inviteFreshlyMinted — toggles the green "new link generated" banner in
  //                        the details modal; cleared when the modal closes
  //   sendEmailOpen      — small Send-via-email confirm dialog (from card)
  //   regenConfirmOpen   — destructive Regenerate warning (from card)
  const [inviteDetailsOpen, setInviteDetailsOpen] = useState(false);
  const [inviteFreshlyMinted, setInviteFreshlyMinted] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { op, action }
  const toggle = (idx, field) => {
    setRevealed((r) => ({ ...r, [`${idx}.${field}`]: !r[`${idx}.${field}`] }));
    if (!revealed[`${idx}.${field}`]) toast({ kind: 'info', title: 'Sensitive field revealed', msg: 'This action is recorded in the audit log.' });
  };

  const mintInvite = () => {
    const token = Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 6);
    return {
      token,
      url: `https://app.carbon.toms/invite/${token}`,
      expiresAt: new Date(Date.now() + 7 * 86400e3).toISOString()
    };
  };

  // Start (or resume) an Admin invite. If no pendingInvite exists, mint and
  // persist one first; then open the InviteLinkDetailsModal with the fresh
  // banner. After the user closes the modal, the PendingInviteCard takes over
  // and all subsequent actions go through the small per-action dialogs.
  const startInvite = () => {
    if (!customer.pendingInvite) {
      const nowIso = new Date().toISOString();
      const minted = mintInvite();
      onUpdate({
        ...customer,
        pendingInvite: {
          token: minted.token,
          url: minted.url,
          role: 'Admin',
          method: 'link',
          recipientEmail: null,
          generatedAt: nowIso,
          expiresAt: minted.expiresAt,
          generatedBy: 'admin@carbon'
        },
        events: [
          ...customer.events,
          { at: nowIso, kind: 'operator+', by: 'admin@carbon', text: 'Admin activation link generated' }
        ]
      });
    }
    setInviteFreshlyMinted(true);
    setInviteDetailsOpen(true);
  };

  // Copy current invite link straight to clipboard — no modal, just a toast.
  // Called from PendingInviteCard's first action button.
  const handleCopyLink = () => {
    if (!customer.pendingInvite?.url) return;
    navigator.clipboard?.writeText(customer.pendingInvite.url);
    toast({ kind: 'success', title: 'Link copied to clipboard' });
  };

  // Email the existing invite link to a recipient. Records the audit event
  // and persists `method` + `recipientEmail` on the pending invite. Called
  // from SendInviteEmailDialog's onSend.
  const handleSendEmail = (email) => {
    if (!customer.pendingInvite || !email) return;
    const nowIso = new Date().toISOString();
    onUpdate({
      ...customer,
      pendingInvite: {
        ...customer.pendingInvite,
        method: 'email',
        recipientEmail: email
      },
      events: [
        ...customer.events,
        { at: nowIso, kind: 'operator+', by: 'admin@carbon', text: `Admin invite emailed to ${email}` }
      ]
    });
    toast({ kind: 'success', title: 'Activation email sent', msg: `Sent to ${email}` });
  };

  // Step 2 of the regenerate flow: actually mint the new token. Step 1 (the
  // destructive warning) lives in RegenerateConfirmDialog and just calls this
  // on confirm. After regeneration we open the details modal with the fresh
  // banner so the user can immediately copy/QR/email the new link.
  const handleRegenerateInvite = () => {
    const nowIso = new Date().toISOString();
    const minted = mintInvite();
    const oldToken = customer.pendingInvite?.token;
    const events = [...customer.events];
    if (oldToken) {
      events.push({ at: nowIso, kind: 'warn', by: 'admin@carbon', text: `Previous Admin invite revoked · token ${oldToken.slice(-4)}` });
    }
    events.push({ at: nowIso, kind: 'operator+', by: 'admin@carbon', text: 'Admin activation link regenerated' });
    onUpdate({
      ...customer,
      pendingInvite: {
        token: minted.token,
        url: minted.url,
        role: 'Admin',
        method: 'link',
        recipientEmail: null,
        generatedAt: nowIso,
        expiresAt: minted.expiresAt,
        generatedBy: 'admin@carbon'
      },
      events
    });
    setRegenConfirmOpen(false);
    setInviteFreshlyMinted(true);
    setInviteDetailsOpen(true);
  };

  const handleRevokeInvite = () => {
    const nowIso = new Date().toISOString();
    const oldToken = customer.pendingInvite?.token;
    const events = [...customer.events];
    if (oldToken) {
      events.push({ at: nowIso, kind: 'warn', by: 'admin@carbon', text: `Admin invite revoked · token ${oldToken.slice(-4)}` });
    }
    onUpdate({ ...customer, pendingInvite: null, events });
    toast({ kind: 'warning', title: 'Invite revoked', msg: 'The activation link is no longer valid.' });
    setConfirm(null);
  };

  const handleOpAction = (op, idx, action) => {
    if (action === 'lock' || action === 'unlock') {setConfirm({ op, idx, action });return;}
    if (action === 'reset') toast({ kind: 'success', title: 'Password reset email sent', msg: `Sent to ${op.email}` });
    if (action === 'resend') toast({ kind: 'success', title: 'Activation link resent', msg: `Sent to ${op.email}` });
  };


  return (
    <>
    <div className="info-card">
      <div className="info-card__head">
        <div>
          <div className="info-card__title">Operators</div>
        </div>
      </div>
      <div>
        {customer.pendingInvite && customer.operators.length === 0 ?
          <div style={{ padding: 20 }}>
            <PendingInviteCard
              invite={customer.pendingInvite}
              status={customer.status}
              onCopy={handleCopyLink}
              onSendEmail={() => setSendEmailOpen(true)}
              onRegenerate={() => setRegenConfirmOpen(true)}
              onRevoke={() => setConfirm({ action: 'revoke-invite' })} />
          </div> :
        customer.operators.length === 0 ?
          <div className="empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
            {customer.status === 'Onboarding' ?
            <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Badge tone="info" dot>Onboarding</Badge>
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: 4 }}>
                  Invite the first Admin to finish onboarding.
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', maxWidth: 420, marginInline: 'auto', lineHeight: 1.5 }}>
                  Once the Admin completes activation, this customer becomes <strong style={{ color: 'var(--color-text-secondary)' }}>Active</strong>. The admin can then sign in and add the rest of their team.
                </div>
                <div style={{ marginTop: 16 }}>
                  <Btn variant="primary" icon="plus" onClick={startInvite}>Invite Admin</Btn>
                </div>
              </> :

            <span>No operators yet.</span>
            }
          </div> :

          <table className="tds-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last login</th>
                <th style={{ paddingRight: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {customer.operators.map((op, i) => {
                const showEmail = !maskOn || revealed[`${i}.email`];
                const showName = !maskOn || revealed[`${i}.name`];
                const isAdmin = (op.role || 'Admin') === 'Admin';
                const isLocked = !!op.locked;
                return (
                  <tr key={i} style={{
                    cursor: 'default',
                    background: isLocked
                      ? 'color-mix(in oklab, var(--color-error-500) 8%, transparent)'
                      : isAdmin ? 'color-mix(in oklab, var(--color-info-500) 5%, transparent)' : undefined
                  }}>
                    <td style={{ paddingLeft: 20 }}>
                      <div className="cust-cell" style={isLocked ? { opacity: 0.78 } : undefined}>
                        <div style={{ position: 'relative' }}>
                          <CompanyLogo name={op.name || op.email} size={28} />
                          {isAdmin && !isLocked &&
                            <span title="Admin" style={{
                              position: 'absolute', bottom: -2, right: -2,
                              width: 14, height: 14, borderRadius: '50%',
                              background: 'var(--color-info-700, #1F6FA8)',
                              color: '#fff',
                              display: 'grid', placeItems: 'center',
                              border: '2px solid var(--color-bg-1, #fff)'
                            }}>
                              <Icon name="shield" size={8} />
                            </span>
                          }
                          {isLocked &&
                            <span title="Locked" style={{
                              position: 'absolute', bottom: -2, right: -2,
                              width: 14, height: 14, borderRadius: '50%',
                              background: 'var(--color-error-700, #B42318)',
                              color: '#fff',
                              display: 'grid', placeItems: 'center',
                              border: '2px solid var(--color-bg-1, #fff)'
                            }}>
                              <Icon name="shield" size={8} />
                            </span>
                          }
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {op.name ?
                            <div className="cust-name" style={isLocked ? { textDecoration: 'line-through', textDecorationThickness: 1 } : undefined}>{showName ? op.name : maskName(op.name)}</div> :
                            <div className="cust-name muted" style={{ fontStyle: 'italic', fontWeight: 400 }}>Not yet provided</div>}
                          </div>
                          <div className="cust-meta" style={{ display: 'flex', gap: 6 }}>
                            {op.pending && <Badge tone="warning" dot>Pending activation</Badge>}
                            {isLocked && <Badge tone="error" dot>Locked</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={isLocked ? { opacity: 0.78 } : undefined}>
                      <span className="op-mask">{showEmail ? op.email : maskEmail(op.email)}</span>
                      {maskOn && <button className="reveal-btn" onClick={() => toggle(i, 'email')}>{revealed[`${i}.email`] ? 'Hide' : 'Reveal'}</button>}
                    </td>
                    <td style={isLocked ? { opacity: 0.78 } : undefined}>
                      {isAdmin ?
                        <Badge tone="info">
                          <Icon name="shield" size={11} /> Admin
                        </Badge> :
                        <Badge tone="neutral">{op.role || 'Operator'}</Badge>
                      }
                    </td>
                    <td style={isLocked ? { opacity: 0.78 } : undefined}>
                      <span className="num" style={{ fontSize: 13 }}>{op.lastLogin ? relTime(op.lastLogin) : <span className="muted">Never</span>}</span>
                    </td>
                    <td style={{ paddingRight: 20, textAlign: 'right' }}>
                      <OperatorMenu op={op}
                        onAction={(a) => handleOpAction(op, i, a)} />
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
          }
      </div>
    </div>
    <InviteLinkDetailsModal
      open={inviteDetailsOpen}
      onClose={() => { setInviteDetailsOpen(false); setInviteFreshlyMinted(false); }}
      onSendEmail={handleSendEmail}
      freshlyMinted={inviteFreshlyMinted}
      invite={customer.pendingInvite}
      customer={customer} />

    <SendInviteEmailDialog
      open={sendEmailOpen}
      onClose={() => setSendEmailOpen(false)}
      onSend={handleSendEmail}
      invite={customer.pendingInvite}
      customer={customer} />

    <RegenerateConfirmDialog
      open={regenConfirmOpen}
      onClose={() => setRegenConfirmOpen(false)}
      onConfirm={handleRegenerateInvite}
      invite={customer.pendingInvite} />

    <Modal open={!!confirm} onClose={() => setConfirm(null)}
      title={
        confirm?.action === 'remove' ? 'Remove operator' :
        confirm?.action === 'lock' ? 'Lock account' :
        confirm?.action === 'unlock' ? 'Unlock account' :
        confirm?.action === 'promote' ? 'Promote to Admin' :
        confirm?.action === 'revoke-invite' ? 'Revoke activation link' :
        ''
      }
      width={420}
      footer={confirm?.action === 'revoke-invite' ?
        <>
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="danger" icon="ban" onClick={handleRevokeInvite}>Revoke link</Btn>
        </> :
        <>
        <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
        <Btn variant={confirm?.action === 'remove' ? 'danger' : 'primary'} icon={confirm?.action === 'remove' ? 'trash' : confirm?.action === 'promote' ? 'shield' : 'check'}
        onClick={() => {
          const action = confirm.action;
          const idx = confirm.idx;
          const op = confirm.op;
          const nowIso = new Date().toISOString();
          if (action === 'lock' || action === 'unlock') {
            const operators = customer.operators.map((o, i) =>
              i === idx ? {
                ...o,
                locked: action === 'lock',
                lockedAt: action === 'lock' ? nowIso : null,
                lockedBy: action === 'lock' ? 'admin@carbon' : null
              } : o
            );
            const events = [...customer.events, {
              at: nowIso, kind: action === 'lock' ? 'warn' : 'info', by: 'admin@carbon',
              text: action === 'lock'
                ? `Operator locked · ${op.email}`
                : `Operator unlocked · ${op.email}`
            }];
            onUpdate({ ...customer, operators, events });
          }
          if (action === 'promote') {
            const operators = customer.operators.map((o, i) =>
              i === idx ? { ...o, role: 'Admin' } : o
            );
            const events = [...customer.events, {
              at: nowIso, kind: 'operator+', by: 'admin@carbon',
              text: `Operator promoted to Admin · ${op.email}`
            }];
            onUpdate({ ...customer, operators, events });
            toast({ kind: 'success', title: 'Promoted to Admin', msg: `${op.name || op.email} is now an Admin.` });
            setConfirm(null);
            return;
          }
          const verb = action === 'remove' ? 'removed' : action === 'lock' ? 'locked' : 'unlocked';
          toast({ kind: action === 'remove' || action === 'lock' ? 'warning' : 'success', title: `Operator ${verb}`, msg: op.email });
          setConfirm(null);
        }}>
          {confirm?.action === 'remove' ? 'Remove operator' : confirm?.action === 'lock' ? 'Lock account' : confirm?.action === 'promote' ? 'Promote to Admin' : 'Unlock account'}
        </Btn>
        </>
      }>
      {confirm &&
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          {confirm.action === 'remove' && <>Remove <strong>{confirm.op.name}</strong> from this customer? They will lose access immediately. This action is audited.</>}
          {confirm.action === 'lock' && <>Lock <strong>{confirm.op.name}</strong>? They won't be able to sign in until you unlock the account.</>}
          {confirm.action === 'unlock' && <>Unlock <strong>{confirm.op.name}</strong>? They'll regain sign-in access immediately.</>}
          {confirm.action === 'revoke-invite' && <>Revoke the current activation link? Anyone who received it will see "link no longer valid" when they try to use it. This action is audited.</>}
        </p>
        }
    </Modal>
    </>);

};

// ─── History tab ─────────────────────────────────────────
const KIND_META = {
  created: { tone: 'success', label: 'Created' },
  'contract+': { tone: 'info', label: 'Contract added' },
  'contract✓': { tone: 'success', label: 'Contract signed' },
  'contract-': { tone: 'warning', label: 'Contract removed' },
  'operator+': { tone: 'info', label: 'Operator invited' },
  info: { tone: 'neutral', label: 'Info updated' },
  reveal: { tone: 'warning', label: 'Sensitive data revealed' },
  warn: { tone: 'warning', label: 'Status changed' }
};

const TabHistory = ({ customer }) =>
<div className="info-card">
    <div className="info-card__head">
      <div className="info-card__title">History ({customer.events.length})</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="ghost" size="sm" icon="filter">Filter</Btn>
        <Btn variant="ghost" size="sm" icon="download">Export</Btn>
      </div>
    </div>
    <div className="info-card__body">
      <div className="timeline">
        {[...customer.events].reverse().map((ev, i) => {
        const meta = KIND_META[ev.kind] || { tone: 'neutral', label: ev.kind };
        return (
          <div key={i} className="tl-row">
              <div className={`tl-row__dot tl-row__dot--${meta.tone}`} />
              <div className="tl-row__title">{ev.text}</div>
              <div className="tl-row__meta">
                <span>{fmtDateTime(ev.at)}</span>
                <span>·</span>
                <span>by {ev.by}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
            </div>);

      })}
      </div>
    </div>
  </div>;


// ─── Detail shell ────────────────────────────────────────
const CustomerDetail = ({ customer, orders = [], initialTab, onBack, onUpdate, onOpenOrder, onNewOrder, maskOn, setMaskOn, systemRoles }) => {
  const [tab, setTab] = useState(initialTab || 'overview');
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();
  const isISO = (customer.contracts || []).some(
    (c) => c.kind === 'ISO' || c.kind === 'ISO-PILOT'
  );
  // Merchants merge — surface a single Devices tab for customers that
  // actually hold a live MERCHANT contract. The data source is the
  // bridged legacy MERCHANT row + the App Pool DEVICE_APPLICATION /
  // DEVICE_EVENT seed (apps-pool-data.jsx).
  const hasMerchantContract = (customer.contracts || []).some(
    (c) => c.kind === 'MERCHANT'
  );
  const merchantBridge = hasMerchantContract && window.findMerchantByCustomerId
    ? window.findMerchantByCustomerId(customer.id)
    : null;
  const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'operators', label: 'Operators' },
  { id: 'roles', label: 'Roles' },
  ...(isISO ? [{ id: 'merchants', label: 'Merchants' }] : []),
  ...(hasMerchantContract ? [
    // Stores = per-store VarSheet view (TID slots / binding info)
    // Devices = per-terminal view with apps + events. Distinct concerns.
    { id: 'stores',  label: 'Stores' },
    { id: 'devices', label: 'Devices' },
  ] : [])];


  const handleSaveInfo = (next) => onUpdate({ ...next, events: [...customer.events, { at: new Date().toISOString(), kind: 'info', by: 'admin@carbon', text: 'Basic information updated' }] });
  // Helper: build a contract event matching the new schema
  // { statusFrom, statusTo, description }. description must self-contain
  // operator and timestamp so it reads on its own in the timeline.
  const _mkContractEvent = (statusFrom, statusTo, what, reason) => {
    const when = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const desc = reason
      ? `${what} on ${when} by admin@carbon — ${reason}`
      : `${what} on ${when} by admin@carbon`;
    return { statusFrom, statusTo, description: desc };
  };

  const handleAddContracts = (kinds, perKindEntitlements = {}, perKindTerms = {}, modeByKind = {}) => onUpdate({
    ...customer,
    // New contracts go to either PILOT or ACTIVE depending on the
    // segmented [Pilot | Active] toggle the admin set in the Manage
    // Contracts modal. Default: ISO → PILOT, others → ACTIVE.
    contracts: [...customer.contracts, ...kinds.map((k) => {
      const t = perKindTerms[k] || {};
      const nowIso = new Date().toISOString();
      // Pilot-ness is a property of the TYPE ('*-PILOT') — independent
      // contract type, no pilot↔active linkage.
      const isPilot = window.contractIsPilot(k);
      // PILOT contracts: dates auto-fixed (today → +180d), fees zeroed
      // defensively in case the admin somehow typed something into a
      // disabled input. ACTIVE contracts use the admin's term + ents.
      const effFrom = isPilot ? window.todayDate(customer.timezone) : (t.effectiveFrom || window.todayDate(customer.timezone));
      const effTo = isPilot
        ? window.addDaysDate(effFrom, 180)
        : (t.effectiveTo || null);
      const ents = (() => {
        const src = perKindEntitlements[k] || {};
        if (!isPilot) return src;
        const out = { ...src };
        Object.keys(out).forEach((key) => {
          const v = out[key];
          if (v && typeof v === 'object' && 'price' in v && !('enable' in v)) {
            out[key] = { ...v, price: 0 };
          } else if (v && typeof v === 'object' && 'enable' in v) {
            const inner = v.priceStrategy ? { priceStrategy: { ...v.priceStrategy, price: 0 } } : { price: 0 };
            out[key] = { ...v, ...inner };
          }
        });
        return out;
      })();
      return {
        kind: k,
        status: 'ACTIVE',
        signedAt: nowIso,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        signedBy: 'admin@carbon',
        authorizingEntityName: 'NPT',
        authorizingEntityId: 'e-npt',
        entitlements: ents,
        events: [
          isPilot
            ? {
                ..._mkContractEvent(null, 'ACTIVE', `${k} pilot started · 180-day trial · all fees locked at $0`),
                eventType: 'BIND_PILOT', at: nowIso, by: 'admin@carbon',
                eventInfo: { initialEffectiveTo: effTo },
              }
            : _mkContractEvent(null, 'ACTIVE', `${k} contract bound`),
        ],
      };
    })],
    events: [...customer.events, ...kinds.map((k) => {
      const isPilot = window.contractIsPilot(k);
      return {
        at: new Date().toISOString(),
        kind: 'contract+',
        by: 'admin@carbon',
        text: isPilot
          ? `${k} pilot started · 180-day trial · all fees locked at $0`
          : `${k} contract added`,
      };
    })],
  });
  // Pilot → formal authorization: in ONE update, close the pilot (TERMINATED
  // with a PILOT_CONVERT event) and append the new formal contract (ACTIVE)
  // with the configured clauses + term. `formEnts`/`formTerms` are the
  // authorization flow's form-shape values; reshaped to JSONB here.
  const handleConvertContract = (pilot, formalKind, formEnts, formTerms, reason, actorName = 'NPT') => {
    const now = new Date().toISOString();
    const sch = (window.CONTRACT_ENTITLEMENT_SCHEMA && window.CONTRACT_ENTITLEMENT_SCHEMA[String(formalKind).toUpperCase()]) || [];
    const ents = window.formToEntitlements ? window.formToEntitlements(formEnts || {}, sch) : {};
    const effFrom = (formTerms && formTerms.effectiveFrom) || window.todayDate(customer.timezone);
    const effTo = (formTerms && formTerms.effectiveTo) || null;
    const convertDesc = `${formalKind} authorized — converted from ${pilot.kind}${reason ? ` · ${reason}` : ''}`;
    const formal = {
      kind: formalKind,
      status: 'ACTIVE',
      signedAt: now,
      authorizedAt: now,
      effectiveFrom: effFrom,
      effectiveTo: effTo,
      signedBy: 'admin@carbon',
      authorizingEntityName: actorName,
      authorizingEntityId: 'e-npt',
      entitlements: ents,
      events: [{
        ..._mkContractEvent(null, 'ACTIVE', convertDesc),
        eventType: 'PILOT_CONVERT', at: now, by: 'admin@carbon',
        eventInfo: { fromKind: pilot.kind, pilotStartedAt: pilot.effectiveFrom || pilot.signedAt, reason: reason || null },
      }],
    };
    onUpdate({
      ...customer,
      contracts: [
        ...customer.contracts.map((x) => x === pilot ? {
          ...x,
          status: 'TERMINATED',
          terminatedAt: now,
          terminatedByEntityId: 'e-npt',
          events: [...(x.events || []), {
            ..._mkContractEvent(String(x.status).toUpperCase(), 'TERMINATED', `${x.kind} closed — converted to formal ${formalKind}`),
            eventType: 'PILOT_CONVERT', at: now, by: 'admin@carbon',
          }],
        } : x),
        formal,
      ],
      events: [
        ...customer.events,
        { at: now, kind: 'contract-', by: 'admin@carbon', text: `${pilot.kind} closed (converted to ${formalKind})` },
        { at: now, kind: 'contract+', by: 'admin@carbon', text: `${formalKind} contract authorized (converted from ${pilot.kind})` },
      ],
    });
  };
  const handleRemoveContract = (c) => {
    const now = new Date().toISOString();
    // Soft delete → TERMINATED with terminatedAt/By set + a terminate
    // event appended to the contract's own events array.
    onUpdate({
      ...customer,
      contracts: customer.contracts.map((x) => x === c ? {
        ...x,
        status: 'TERMINATED',
        terminatedAt: now,
        terminatedByEntityId: 'e-npt',
        events: [...(x.events || []), _mkContractEvent(String(x.status).toUpperCase(), 'TERMINATED', `${x.kind} contract terminated`)],
      } : x),
      events: [...customer.events, { at: now, kind: 'contract-', by: 'admin@carbon', text: `${c.kind} contract terminated` }]
    });
  };
  const handleUpdateContract = (c, patch, auditText, eventExtra) => {
    const now = new Date().toISOString();
    // Non-status edits (effectiveTo, entitlements) still write to the
    // contract's events array, with null statusFrom/To since no
    // transition happened. Description carries the human summary.
    //
    // `eventExtra` lets PILOT actions (extend / convert) record their
    // structured payload: { eventType, eventInfo }. They're merged into
    // the same event object so legacy readers see the description and
    // new readers (activity feed) can branch on eventType.
    const baseEv = _mkContractEvent(
      eventExtra?.statusFrom ?? null,
      eventExtra?.statusTo ?? (patch.status ? String(patch.status).toUpperCase() : null),
      auditText || `${c.kind} contract updated`,
    );
    const ev = eventExtra
      ? { ...baseEv, at: now, by: 'admin@carbon', eventType: eventExtra.eventType, eventInfo: eventExtra.eventInfo }
      : baseEv;
    onUpdate({
      ...customer,
      contracts: customer.contracts.map((x) => x === c ? {
        ...x,
        ...patch,
        events: [...(x.events || []), ev],
      } : x),
      events: [...customer.events, { at: now, kind: 'info', by: 'admin@carbon', text: auditText || `${c.kind} contract updated` }]
    });
  };
  // State-machine transitions (corrected 3-state model):
  //   ACTIVE    → SUSPENDED       (Suspend)
  //   SUSPENDED → ACTIVE          (Resume)
  //   {anything} → TERMINATED     (Terminate — via handleRemoveContract)
  // `reason` is optional copy from the confirm modal; threaded into the
  // audit event text so admins can read 'why' on the timeline. Suspend
  // requires it (enforced by modal); Resume treats it as a free note.
  const handleContractStatusChange = (c, nextStatus, reason) => {
    const now = new Date().toISOString();
    const fromUpper = String(c.status || '').toUpperCase();
    const wasSuspended = fromUpper === 'SUSPENDED';
    const verb = nextStatus === 'ACTIVE' && wasSuspended
      ? 'resumed'
      : nextStatus === 'SUSPENDED' ? 'suspended'
      : 'changed';
    const baseText = `${c.kind} contract ${verb}`;
    const text = reason ? `${baseText} — reason: ${reason}` : baseText;
    onUpdate({
      ...customer,
      contracts: customer.contracts.map((x) => x === c ? {
        ...x,
        status: nextStatus,
        events: [...(x.events || []), _mkContractEvent(fromUpper, nextStatus, baseText, reason)],
      } : x),
      events: [...customer.events, { at: now, kind: nextStatus === 'SUSPENDED' ? 'warn' : 'info', by: 'admin@carbon', text }]
    });
  };

  // (The in-customer Merchants tab has been retired — merchants now live
  // as a standalone top-level section.)

  // Live contract badges for the TitleBar badge row (§8.2) — TERMINATED /
  // EXPIRED kept in the Contracts tab history only.
  const liveHeaderContracts = customer.contracts.filter((c) => _CS(c.status) !== 'TERMINATED' && _CS(c.status) !== 'EXPIRED');

  return (
    <div className="page page--detail cust-detail-page">
      {/* ui-spec §8 form E — unified TitleBar (back + entity icon + title +
          badges + meta + actions + bottom tabs), rendered into the fixed
          shell band so the tab row stays put while content scrolls (§7.2). */}
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to customers"
        icon={<CompanyLogo name={customer.name} size={48} />}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {customer.name}
            {/* Entity-level status: Active (has operators) or Onboarding. */}
            <Badge tone={customer.status === 'Onboarding' ? 'info' : 'success'} dot>{customer.status}</Badge>
            {liveHeaderContracts.map((c, i) => (
              <ContractBadge
                key={i}
                kind={c.kind}
                status={c.status}
                effectiveFrom={c.effectiveFrom || c.signedAt}
                effectiveTo={c.effectiveTo}
                terminatedAt={c.terminatedAt}
              />
            ))}
          </span>
        }
        titleSize="lg"
        meta={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={13} /> Registered {fmtDate(customer.registeredAt)}</span>
            {customer.license && (
              <>
                <span aria-hidden="true">·</span>
                <span title="License" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="shield" size={13} /> License: {customer.license}</span>
              </>
            )}
          </>
        }
        actions={<Btn variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Edit info</Btn>}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count, active: tab === t.id, onClick: () => setTab(t.id) }))}
      />

      {tab === 'overview' && <TabOverview customer={customer} onSave={handleSaveInfo} maskOn={maskOn} />}
      {tab === 'contracts' && <TabContracts customer={customer} onAdd={handleAddContracts} onRemove={handleRemoveContract} onStatusChange={handleContractStatusChange} onUpdateContract={handleUpdateContract} onConvertContract={handleConvertContract} />}
      {tab === 'operators' &&
      <TabOperators customer={customer} onUpdate={onUpdate} maskOn={maskOn} setMaskOn={setMaskOn} />
      }
      {tab === 'roles' &&
      <TabRoles customer={customer} onUpdate={onUpdate} systemRoles={systemRoles} />
      }
      {tab === 'history' && <TabHistory customer={customer} />}
      {tab === 'merchants' && (
        window.TabCustomerMerchants ? (
          <window.TabCustomerMerchants customer={customer} />
        ) : null
      )}
      {tab === 'stores' && (
        merchantBridge && window.MerchantStoresTab ? (
          window.MerchantTerminalCtx ? (
            <window.MerchantTerminalCtx.Provider value={{
              openTerminal: (sn) => {
                if (window.__openTerminalFromCustomer) {
                  window.__openTerminalFromCustomer(sn, customer.id, 'stores');
                } else if (window.__navigate) {
                  window.__navigate({ screen: 'deviceDetail', deviceSn: sn });
                }
              }
            }}>
              <window.MerchantStoresTab merchant={merchantBridge} />
            </window.MerchantTerminalCtx.Provider>
          ) : (
            <window.MerchantStoresTab merchant={merchantBridge} />
          )
        ) : (
          <div className="info-card">
            <div className="empty" style={{ padding: '32px 24px', textAlign: 'center' }}>
              No stores recorded for this merchant yet.
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                Stores and VarSheets are provisioned by the owning ISO from their portal.
              </div>
            </div>
          </div>
        )
      )}
      {tab === 'devices' && (
        window.DevicesTab ? (
          <window.DevicesTab customer={customer} />
        ) : (
          <div className="info-card">
            <div className="empty" style={{ padding: '32px 24px', textAlign: 'center' }}>
              Devices module not loaded.
            </div>
          </div>
        )
      )}

      <EditInfoModal open={editOpen} customer={customer} onClose={() => setEditOpen(false)} onSave={(next) => {handleSaveInfo(next);setEditOpen(false);}} />

    </div>);

};

const EditInfoModal = ({ open, customer, onClose, onSave }) => {
  const [form, setForm] = useState(customer);
  const toast = useToast();
  React.useEffect(() => {if (open) setForm(customer);}, [open, customer]);
  const valid = companyFormValid(form);
  return (
    <Modal open={open} onClose={onClose} title="Edit customer info" width={620}
    footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" disabled={!valid} onClick={() => {onSave(form);toast({ kind: 'success', title: 'Customer info updated' });}}>Save changes</Btn>
      </>}>
      <CompanyInfoEdit form={form} onChange={setForm} />
    </Modal>);

};

window.CustomerDetail = CustomerDetail;