/* global React, ReactDOM */
const { useState, useEffect, useRef, createContext, useContext } = React;

// ─── Icons (inline SVG, currentColor) ──────────────────────
const Icon = ({ name, size = 16, ...rest }) => {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    users:        <g {...stroke}><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9.5" r="2.4"/><path d="M21 17.5c0-2.2-1.8-4-4-4"/></g>,
    file:         <g {...stroke}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></g>,
    operator:     <g {...stroke}><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></g>,
    audit:        <g {...stroke}><path d="M4 5h12l4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M7 11h8M7 15h5"/></g>,
    settings:     <g {...stroke}><circle cx="12" cy="12" r="2.6"/><path d="M19.4 14a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>,
    home:         <g {...stroke}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></g>,
    search:       <g {...stroke}><circle cx="11" cy="11" r="6"/><path d="m20 20-4.3-4.3"/></g>,
    plus:         <g {...stroke}><path d="M12 5v14M5 12h14"/></g>,
    chevR:        <g {...stroke}><path d="m9 6 6 6-6 6"/></g>,
    chevL:        <g {...stroke}><path d="m15 6-6 6 6 6"/></g>,
    chevD:        <g {...stroke}><path d="m6 9 6 6 6-6"/></g>,
    check:        <g {...stroke}><path d="m5 12 4.5 4.5L19 7"/></g>,
    x:            <g {...stroke}><path d="m6 6 12 12M18 6 6 18"/></g>,
    more:         <g {...stroke}><circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/></g>,
    edit:         <g {...stroke}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></g>,
    copy:         <g {...stroke}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></g>,
    mail:         <g {...stroke}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></g>,
    message:      <g {...stroke}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></g>,
    link:         <g {...stroke}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></g>,
    info:         <g {...stroke}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></g>,
    trash:        <g {...stroke}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></g>,
    eye:          <g {...stroke}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g>,
    eyeOff:       <g {...stroke}><path d="M3 3l18 18"/><path d="M10.6 6.1A10.3 10.3 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.1 6.1A17 17 0 0 0 2 12s4 6 10 6a10 10 0 0 0 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></g>,
    shield:       <g {...stroke}><path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6z"/></g>,
    clock:        <g {...stroke}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    download:     <g {...stroke}><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></g>,
    bell:         <g {...stroke}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></g>,
    filter:       <g {...stroke}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></g>,
    package:      <g {...stroke}><path d="m3.3 7 8.7 5 8.7-5M12 22V12M21 7v10l-9 5-9-5V7l9-5z"/><path d="m7.5 4.5 9 5"/></g>,
    truck:        <g {...stroke}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7.5" cy="18" r="1.7"/><circle cx="17" cy="18" r="1.7"/></g>,
    cash:         <g {...stroke}><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M5.5 9.5h.01M18.5 14.5h.01"/></g>,
    pos:          <g {...stroke}><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 7h14M8 11h8M8 15h5"/></g>,
    minus:        <g {...stroke}><path d="M5 12h14"/></g>,
    gift:         <g {...stroke}><rect x="3.5" y="9" width="17" height="5"/><path d="M5 14v7h14v-7M12 9v12M12 9c-2 0-4-1-4-3a2 2 0 0 1 4 0c0 2 2 3 4 3a2 2 0 1 0-4-3"/></g>,
    sparkles:     <g {...stroke}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></g>,
    monitor:      <g {...stroke}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6M12 17v4"/></g>,
    upload:       <g {...stroke}><path d="M12 4v12M7 9l5-5 5 5M5 20h14"/></g>,
    image:        <g {...stroke}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 6"/></g>,
    rotate:       <g {...stroke}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></g>,
    cpu:          <g {...stroke}><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></g>,
    user:         <g {...stroke}><circle cx="12" cy="8" r="3.6"/><path d="M4 20c0-3.6 3.5-6.4 8-6.4s8 2.8 8 6.4"/></g>,
    globe:        <g {...stroke}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></g>,
    key:          <g {...stroke}><circle cx="8" cy="15" r="3.5"/><path d="m10.5 12.5 9-9M17 6l2 2M14.5 8.5l2 2"/></g>,
    lock:         <g {...stroke}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g>,
    building:     <g {...stroke}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M9 19v-2h6v2"/></g>,
    lifebuoy:     <g {...stroke}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M19.1 4.9l-4.3 4.3M9.2 14.8l-4.3 4.3"/></g>,
    ticket:       <g {...stroke}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 6v12" strokeDasharray="2 2"/></g>,
    alert:        <g {...stroke}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></g>,
    bolt:         <g {...stroke}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></g>,
    refresh:      <g {...stroke}><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5"/></g>,
    arrowR:       <g {...stroke}><path d="M5 12h14M13 5l7 7-7 7"/></g>,
    arrowU:       <g {...stroke}><path d="M12 19V5M5 12l7-7 7 7"/></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>{paths[name] || null}</svg>;
};

// ─── Badge ────────────────────────────────────────────────
const Badge = ({ tone = 'neutral', children, dot }) => (
  <span className={`tds-badge tds-badge--${tone}`}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 2 }}/>}
    {children}
  </span>
);

// ─── Contract badge w/ status ─────────────────────────────
// Icon name for a contract kind. Used in the picker grid and in the
// contract detail header. Centralized so adding new kinds means one edit.
const iconForKind = (kind) => {
  const k = String(kind || '').toLowerCase();
  if (k === 'isv') return 'file';
  if (k === 'iso') return 'shield';
  if (k === 'merchant') return 'pos';
  if (k === 'distributor') return 'truck';
  if (k === 'admin') return 'key';
  return 'link';
};
window.iconForKind = iconForKind;

const CONTRACT_INFO = {
  ISV:         { label: 'ISV',         desc: 'Independent Software Vendor',    icon: 'isv',         hue: 'accent' },
  ISO:         { label: 'ISO',         desc: 'Independent Sales Organization', icon: 'iso',         hue: 'info' },
  Merchant:    { label: 'Merchant',    desc: 'Direct merchant agreement',      icon: 'merchant',    hue: 'merchant' },
  Distributor: { label: 'Distributor', desc: 'Authorized distribution partner', icon: 'distributor', hue: 'warning' },
  ADMIN:       { label: 'ADMIN',       desc: 'Carbon platform internal',       icon: 'admin',       hue: 'admin', internal: true },
};

// ── Date-only / timezone helpers for contract validity ──────────
// effectiveFrom / effectiveTo are calendar DATES (YYYY-MM-DD), not instants.
// Validity is judged against "today in the PARTNER's timezone"
// (Entity.timezone) — not the browser's — so a contract ending 2026-06-03
// stays in force through the whole of June 3 in the partner's locale even
// when the operator's machine sits in a different zone.
const _dateOnly = (v) => (v ? String(v).slice(0, 10) : '');
// 'YYYY-MM-DD' for an instant rendered in `tz` (IANA). Falls back to the
// browser-local calendar date when tz is missing or invalid.
const tzDateStr = (date = new Date(), tz) => {
  try {
    if (tz) {
      // en-CA renders as YYYY-MM-DD
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }
  } catch (_) { /* invalid tz → fall through to local */ }
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};
window.tzDateStr = tzDateStr;
// Whole calendar days from today (in tz) until `dateStr`. Negative = past.
const tzDaysUntil = (dateStr, tz) => {
  if (!dateStr) return null;
  const a = new Date(tzDateStr(new Date(), tz) + 'T00:00:00Z').getTime();
  const b = new Date(_dateOnly(dateStr) + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
};
window.tzDaysUntil = tzDaysUntil;
// Today's calendar date ('YYYY-MM-DD') in tz (or browser-local).
const todayDate = (tz) => tzDateStr(new Date(), tz);
window.todayDate = todayDate;
// Date-only string + n calendar days, returned as 'YYYY-MM-DD'.
const addDaysDate = (dateStr, n) =>
  _dateOnly(new Date(new Date(_dateOnly(dateStr) + 'T00:00:00Z').getTime() + n * 86400000).toISOString());
window.addDaysDate = addDaysDate;

// Derived contract status that accounts for the effective-to DATE, judged
// in the partner's timezone. Raw status is dominant for
// SUSPENDED/TERMINATED; an ACTIVE/SIGNED/PILOT contract whose effective-to
// calendar day has fully passed (in `tz`) is reported as EXPIRED (a derived
// state — not persisted server-side, but treated as "not in force"
// everywhere in the UI). Pass the partner's Entity.timezone as the 2nd arg
// so the boundary lands at the partner's local midnight; omit it to fall
// back to the browser-local date.
// Use this everywhere instead of c.status when you care about whether the
// contract is effectively binding right now.
const effectiveStatus = (c, tz) => {
  if (!c) return null;
  const s = String(c.status || '').toUpperCase();
  if (s !== 'ACTIVE' && s !== 'SIGNED' && s !== 'PILOT') return s;
  if (c.effectiveTo && tzDateStr(new Date(), tz) > _dateOnly(c.effectiveTo)) return 'EXPIRED';
  return s;
};
window.effectiveStatus = effectiveStatus;

// ─── Derived Entity status (per public spec §2.1) ────────────
// Entity.status is persisted as ONBOARDING / ACTIVE only. The "Locked"
// label is purely a derivation — applied when every live contract is
// SUSPENDED. UI should always go through this helper instead of reading
// the raw `customer.status` field, since the raw field can lag behind
// reality (operator just got invited, contract just got suspended, etc).
//
// Returns one of: 'ONBOARDING' | 'ACTIVE' | 'LOCKED'.
//   ONBOARDING — no live contracts, OR no usable operator yet
//   ACTIVE     — ≥1 (ACTIVE|PILOT) contract + ≥1 usable operator
//   LOCKED     — every live (non-TERMINATED) contract is SUSPENDED or
//                EXPIRED (gateway blocks login in either case)
const entityStatus = (customer) => {
  if (!customer) return null;
  const tz = customer.timezone;
  const contracts = customer.contracts || [];
  // Live = anything not TERMINATED. SUSPENDED and EXPIRED both count as
  // live because admin still needs to act on them.
  const live = contracts.filter((c) => effectiveStatus(c, tz) !== 'TERMINATED');
  if (live.length === 0) return 'ONBOARDING';
  // Locked: every live contract is in a state that blocks operator
  // sign-in. EXPIRED PILOT is gateway-blocked same as SUSPENDED.
  if (live.every((c) => {
    const eff = effectiveStatus(c, tz);
    return eff === 'SUSPENDED' || eff === 'EXPIRED';
  })) return 'LOCKED';
  const operators = (customer.operators || []).filter((o) => !o.pending);
  // PILOT counts as "having an active contract" — pilot customers are
  // operationally indistinguishable from active ones from the UX side.
  const hasActive = live.some((c) => {
    const eff = effectiveStatus(c, tz);
    return eff === 'ACTIVE' || eff === 'PILOT';
  });
  if (hasActive && operators.length > 0) return 'ACTIVE';
  return 'ONBOARDING';
};
window.entityStatus = entityStatus;

// Display label + tone for a derived entity status.
const entityStatusMeta = (s) => ({
  ACTIVE:     { label: 'Active',     tone: 'success' },
  ONBOARDING: { label: 'Onboarding', tone: 'info' },
  LOCKED:     { label: 'Locked',     tone: 'error' },
}[s] || { label: s || '—', tone: 'neutral' });
window.entityStatusMeta = entityStatusMeta;

// ─── Timezones (IANA-formatted) ──────────────────────────────
// Spec §1.1: Entity.timezone is stored as IANA tz string (not UTC
// offset). Curated list of the most common business locations.
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Zurich',
  'Europe/Amsterdam', 'Europe/Stockholm',
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Singapore',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Dubai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  'UTC',
];
window.TIMEZONES = TIMEZONES;

// ─── Country → settlement currency ───────────────────────────
// Default ISO-4217 currency for each ISO 3166-1 alpha-2 country code.
// Curated to match COUNTRIES list above. Used to pre-fill
// settlementCurrency on new contracts so admins don't have to think
// about it for the 99% case.
const CURRENCY_BY_COUNTRY = {
  AE: 'AED', AR: 'ARS', AT: 'EUR', AU: 'AUD', BE: 'EUR', BR: 'BRL',
  CA: 'CAD', CH: 'CHF', CL: 'CLP', CN: 'CNY', CO: 'COP', DE: 'EUR',
  DK: 'DKK', EG: 'EGP', ES: 'EUR', FI: 'EUR', FR: 'EUR', GB: 'GBP',
  HK: 'HKD', ID: 'IDR', IE: 'EUR', IN: 'INR', IT: 'EUR', JP: 'JPY',
  KR: 'KRW', LU: 'EUR', MX: 'MXN', MY: 'MYR', NL: 'EUR', NO: 'NOK',
  NZ: 'NZD', PE: 'PEN', PH: 'PHP', PL: 'PLN', PT: 'EUR', SA: 'SAR',
  SE: 'SEK', SG: 'SGD', TH: 'THB', TR: 'TRY', TW: 'TWD', US: 'USD',
  VN: 'VND', ZA: 'ZAR',
};
const currencyForCountry = (countryCode) => CURRENCY_BY_COUNTRY[countryCode] || 'USD';
window.CURRENCY_BY_COUNTRY = CURRENCY_BY_COUNTRY;
window.currencyForCountry = currencyForCountry;

// Contract status tones. The underlying ENTITY_CONTRACT table uses UPPERCASE
// (ACTIVE/SUSPENDED/TERMINATED); some legacy code paths emit Pascal case
// ('Active'/'Suspended'/...). EXPIRED is a derived state (not persisted)
// produced by effectiveStatus() above. Both casings accepted.
const STATUS_TONE = {
  Active:     'success',
  ACTIVE:     'success',
  Signed:     'success',
  // PILOT — indigo accent. Visually distinct from Active (green) and
  // Expired (amber) so admins can recognize "trial in progress" at a
  // glance. Same tone used for BIND_PILOT events in the activity feed.
  Pilot:      'pilot',
  PILOT:      'pilot',
  Suspended:  'error',
  SUSPENDED:  'error',
  // Derived: effective-to passed but raw status was ACTIVE or PILOT.
  // Amber so the admin's eye is drawn to it (it's not in force, but
  // unlike TERMINATED it can be revived by extending the term).
  Expired:    'warning',
  EXPIRED:    'warning',
  Terminated: 'neutral',
  TERMINATED: 'neutral',
};

const STATUS_LABEL = {
  Active: 'Active',         ACTIVE: 'Active',
  Signed: 'Signed',
  Pilot: 'Pilot',           PILOT: 'Pilot',
  Suspended: 'Suspended',   SUSPENDED: 'Suspended',
  Expired: 'Expired',       EXPIRED: 'Expired',
  Terminated: 'Terminated', TERMINATED: 'Terminated',
};

const _fmtBadgeDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ContractBadge = ({ kind, status = 'Active', effectiveFrom, effectiveTo, terminatedAt }) => {
  // Apply the derived-effective rule so an ACTIVE contract past its
  // effectiveTo renders as Expired wherever ContractBadge is used.
  const derived = effectiveStatus({ status, effectiveTo });
  const tone     = STATUS_TONE[derived] || 'neutral';
  const niceSt   = STATUS_LABEL[derived] || derived;
  const isTerminated = /TERMINATED|Terminated/.test(derived);
  const isExpired    = /EXPIRED|Expired/.test(derived);
  const [tipPos, setTipPos] = useState(null);

  // Tooltip shows only the human status word. Kind is already on the chip
  // itself; effective/terminated dates are shown elsewhere on the page
  // (Registered column, detail view) so we don't repeat them here.
  const title = niceSt;

  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTipPos({ x: r.left + r.width / 2, y: r.top });
  };
  const onLeave = () => setTipPos(null);

  return (
    <span
      className={`tds-badge tds-badge--${tone} ${isTerminated ? 'tds-badge--ghost' : ''} ${isExpired ? 'tds-badge--lapsed' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>
      {kind}
      {tipPos && ReactDOM.createPortal(
        <div className="tds-floating-tip" style={{ left: tipPos.x, top: tipPos.y }}>
          {title}
        </div>,
        document.body
      )}
    </span>
  );
};

// ─── Buttons ──────────────────────────────────────────────
const Btn = ({ variant = 'secondary', size = 'md', loading, icon, iconRight, children, onClick, onMouseDown, onMouseEnter, onMouseLeave, onFocus, onBlur, type, disabled, title, style, id, ...rest }) => (
  // NOTE: pull common handlers out of `...rest` so they're passed as named JSX
  // props. The platform's element-tagger drops spread props on host elements,
  // which previously caused onClick to be silently lost on every <Btn>.
  <button
    type={type}
    className={`tds-btn tds-btn--${variant} tds-btn--${size}`}
    onClick={onClick}
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onFocus={onFocus}
    onBlur={onBlur}
    disabled={disabled}
    title={title}
    style={style}
    id={id}
    {...rest}>
    {loading && <span className="tds-btn__spinner"/>}
    {!loading && icon && <Icon name={icon} size={size === 'sm' ? 13 : 14}/>}
    {children}
    {iconRight && <Icon name={iconRight} size={size === 'sm' ? 13 : 14}/>}
  </button>
);

// ─── Input + Field ───────────────────────────────────────
const Input = ({ size = 'md', invalid, prefix, suffix, ...rest }) => (
  <div className={`tds-input tds-input--${size} ${invalid ? 'tds-input--invalid' : ''} ${rest.disabled ? 'tds-input--disabled' : ''}`}>
    {prefix && <span className="tds-input__addon tds-input__addon--prefix">{prefix}</span>}
    <input className="tds-input__el" {...rest}/>
    {suffix && <span className="tds-input__addon tds-input__addon--suffix">{suffix}</span>}
  </div>
);

const Field = ({ label, hint, error, required, children }) => (
  <label className="tds-field">
    {label && <span className={`tds-field__label ${required ? 'tds-field__label--required' : ''}`}>{label}</span>}
    {children}
    {error && <span className="tds-field__error">{error}</span>}
    {!error && hint && <span className="tds-field__hint">{hint}</span>}
  </label>
);

const Textarea = ({ invalid, ...rest }) => (
  <textarea className="textarea" style={invalid ? { borderColor: 'var(--color-error-500)' } : null} {...rest}/>
);

const Select = ({ size = 'md', invalid, children, ...rest }) => (
  <div className={`tds-select tds-select--${size} ${invalid ? 'tds-select--invalid' : ''}`}>
    <select {...rest}>{children}</select>
    <span className="tds-select__chevron"><Icon name="chevD" size={14}/></span>
  </div>
);

// ─── PanelHeader ──────────────────────────────────────────
// THE system-standard header for every overlay surface: Modal, Drawer,
// config Panel, Advanced Filters. Three-part structure — icon (optional) +
// title + description (optional) + close action — with locked height, padding
// (16·24), title (14/600), description (12 tertiary), close button (.iconbtn
// top-right) and a 1px bottom divider. Never hand-roll an overlay header;
// always use this so every panel reads identically.
//   icon: a glyph name (resolved via window.Ico) or a React node, optional
//   title: string · description: string|node (optional) · onClose: fn
const PanelHeader = ({ icon, title, description, onClose, closeTitle = 'Close' }) => {
  let iconNode = null;
  if (icon) {
    iconNode = typeof icon === 'string'
      ? (window.Ico ? <window.Ico name={icon} size={16}/> : <Icon name={icon} size={16}/>)
      : icon;
  }
  return (
    <div className="panel-header">
      {iconNode ? <span className="panel-header__icon">{iconNode}</span> : null}
      <div className="panel-header__text">
        <div className="panel-header__title">{title}</div>
        {description ? <div className="panel-header__desc">{description}</div> : null}
      </div>
      {onClose ? (
        <button type="button" className="iconbtn panel-header__close" onClick={onClose} title={closeTitle} aria-label="Close">
          {window.Ico ? <window.Ico name="x" size={14}/> : <Icon name="x" size={14}/>}
        </button>
      ) : null}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────
// `placement` controls layout:
//   'center' (default) — classic centered modal, capped at `width` px
//   'right'            — right-side drawer, fills viewport height, `width` is the drawer width
const Modal = ({ open, onClose, title, description, icon, children, footer, width = 480, placement = 'center' }) => {
  if (!open) return null;
  const isDrawer = placement === 'right';
  return (
    <div className={`tds-modal-overlay ${isDrawer ? 'tds-modal-overlay--drawer' : ''}`} onClick={onClose}>
      <div
        className={`tds-modal ${isDrawer ? 'tds-modal--drawer' : ''}`}
        style={isDrawer ? { width } : { maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <PanelHeader icon={icon} title={title} description={description} onClose={onClose}/>
        <div className="tds-modal__body">{children}</div>
        {footer && <div className="tds-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

// ─── Toasts ───────────────────────────────────────────────
const ToastCtx = createContext(null);
const ToastProvider = ({ children }) => {
  const [list, setList] = useState([]);
  const push = (t) => {
    const id = Math.random().toString(36).slice(2);
    setList(l => [...l, { id, ...t }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), t.timeout || 3200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="tds-toast-stack">
        {list.map(t => (
          <div key={t.id} className={`tds-toast tds-toast--${t.kind || 'info'}`}>
            <div className="tds-toast__icon">
              <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'x' : t.kind === 'warning' ? 'info' : 'info'} size={18}/>
            </div>
            <div className="tds-toast__body">
              <div className="tds-toast__title">{t.title}</div>
              {t.msg && <div className="tds-toast__msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => useContext(ToastCtx);

// ─── Avatar / company logo ────────────────────────────────
// Token-only neutral tile — no new colors. Uses the DS neutral surface +
// secondary text + hairline border. One quiet treatment for every entity.
const hueFor = () => 'var(--color-bg-3)';
const CompanyLogo = ({ name, size = 32, square = true }) => {
  const safe = (name && String(name).trim()) || '';
  const initials = safe
    ? safe.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
    : '?';
  return (
    <span className="cust-avatar" style={{ width: size, height: size, borderRadius: square ? 12 : '50%', background: 'var(--avatar-bg)', color: 'var(--avatar-fg)', border: '1px solid var(--color-border-subtle)', fontSize: size * 0.36 }}>{initials}</span>
  );
};

// ─── Masking helpers (EO 14117 / GDPR) ────────────────────
const maskEmail = (e) => {
  if (!e) return '';
  const [u, d] = e.split('@');
  const head = u.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(3, u.length - 1))}@${d}`;
};
const maskPhone = (p) => {
  if (!p) return '';
  return p.replace(/(\+?\d{1,3})[\s-]?(\d{2,4})[\s-]?(\d{2,4})[\s-]?(\d{2,4})/, (_, a, _b, _c, d) => `${a} ••• ••• ${d}`);
};
const maskName = (n) => {
  if (!n) return '';
  const parts = n.split(' ');
  return parts.map((p, i) => i === 0 ? p : p[0] + '.').join(' ');
};

// ─── Relative time ───────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '';
  // Date-only 'YYYY-MM-DD' → parse as LOCAL midnight so the calendar day
  // renders unchanged regardless of the viewer's timezone (a bare UTC
  // parse would shift it a day in negative-offset zones).
  const s = String(iso);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const relTime = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff/86400)}d ago`;
  return fmtDate(iso);
};

// ─── StatCard — THE single statistic/KPI/summary tile (DS component) ──
// Slots: icon · label · value · trend · description.  Variants: default |
// success | warning | error.  States: default · hover (when onClick) ·
// selected. Pages MUST use this — never hand-roll a stat tile.
//   <StatGrid cols={4}>
//     <StatCard label="Active" value={42} variant="success"
//               description="online now" trend={{dir:'up',label:'+3'}}
//               icon="device" selected={f==='active'} onClick={()=>setF('active')} />
//   </StatGrid>
const StatCard = ({ label, value, description, trend, icon, variant = 'default',
                    selected = false, onClick, action, className = '', ...rest }) => {
  const clickable = typeof onClick === 'function';
  const cls = ['stat',
    clickable && 'is-clickable',
    selected && 'is-active',
    variant && variant !== 'default' && `stat--${variant}`,
    className].filter(Boolean).join(' ');
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag {...(clickable ? { type: 'button' } : {})} className={cls} onClick={onClick} {...rest}>
      {icon ? <span className="stat__icon">{typeof icon === 'string' ? <Icon name={icon} size={16}/> : icon}</span> : null}
      <div className="stat__label">{label}</div>
      <div className="stat__val">
        <span>{value}</span>
        {trend ? <span className={`stat__trend stat__trend--${trend.dir || 'flat'}`}>{trend.label}</span> : null}
      </div>
      {description ? <div className="stat__desc">{description}</div> : null}
      {action ? <div className="stat__action">{action}</div> : null}
    </Tag>
  );
};
const StatGrid = ({ cols = 4, children, style, className = '' }) =>
  <div className={`stats ${className}`.trim()} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...style }}>{children}</div>;

// ─── ObjectTile — THE unified object/entity icon tile (DS component) ──
// Filled-glyph, color-block thumbnail for "a thing" (product / device / app /
// merchant / customer / firmware …). Light tinted same-hue surface + soft
// same-hue SOLID glyph, fixed 8-radius, glyph ≈ 0.52× tile. This is the ONLY
// sanctioned object-icon style — functional UI icons stay stroke (<Icon>).
// Forbidden for object tiles: outline / stroke-only glyphs, mixed styles.
//   <ObjectTile cat="device" />            preset (color + glyph by category)
//   <ObjectTile glyph="app" hue={300} />   custom glyph + hue
const OBJ_GLYPH = {
  // Smart terminal — body (soft) + screen + home dot (solid).
  device: <g><rect x="5" y="2" width="14" height="20" rx="3.2" opacity=".32"/><rect x="7.3" y="4.4" width="9.4" height="8.6" rx="1.6"/><circle cx="12" cy="18.4" r="1.35"/></g>,
  // Isometric package — top (solid) + two graded side faces.
  accessory: <g><path d="M12 2.5 20.6 7 12 11.5 3.4 7 12 2.5Z"/><path d="M3.4 7 12 11.5v9.9L3.4 16.9V7Z" opacity=".34"/><path d="M20.6 7 12 11.5v9.9l8.6-4.5V7Z" opacity=".55"/></g>,
  // Wrench — solid head + soft handle knob.
  service: <g><path d="M16.9 2.2a5.2 5.2 0 0 0-5.06 6.35L3.6 16.85a2.4 2.4 0 0 0 3.4 3.4l8.28-8.27A5.2 5.2 0 0 0 21.8 7.1a.8.8 0 0 0-1.34-.36l-2.42 2.42a1.3 1.3 0 0 1-1.84 0l-.86-.86a1.3 1.3 0 0 1 0-1.84l2.42-2.42a.8.8 0 0 0-.36-1.34 5.3 5.3 0 0 0-1.5-.26Z"/><circle cx="5.4" cy="18.45" r="1.15" opacity=".42"/></g>,
  // App — four rounded tiles, checkerboard depth.
  app: <g><rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2.3"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2.3" opacity=".4"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2.3" opacity=".4"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2.3"/></g>,
  // Storefront — awning (solid) + soft body + door.
  merchant: <g><path d="M3.6 3.4h16.8l1.2 4.1a2.7 2.7 0 0 1-5.2 1.02 2.7 2.7 0 0 1-5.2 0 2.7 2.7 0 0 1-5.2 0A2.7 2.7 0 0 1 2.4 7.5l1.2-4.1Z"/><path d="M5 11.3a3.8 3.8 0 0 0 3.5-1.05 3.8 3.8 0 0 0 7 0A3.8 3.8 0 0 0 19 11.3v8.4a1.7 1.7 0 0 1-1.7 1.7H6.7A1.7 1.7 0 0 1 5 19.7v-8.4Z" opacity=".34"/><rect x="9.7" y="14.2" width="4.6" height="7.2" rx="1"/></g>,
  // Person — head (solid) + soft shoulders.
  customer: <g><circle cx="12" cy="8" r="4.2"/><path d="M3.8 20.4c0-3.8 3.7-6.2 8.2-6.2s8.2 2.4 8.2 6.2a1.3 1.3 0 0 1-1.3 1.3H5.1a1.3 1.3 0 0 1-1.3-1.3Z" opacity=".4"/></g>,
  // Chip — soft body + solid core + solid pins.
  firmware: <g><rect x="5" y="5" width="14" height="14" rx="3.2" opacity=".32"/><rect x="8.7" y="8.7" width="6.6" height="6.6" rx="1.9"/><g><rect x="9" y="1.6" width="1.7" height="3" rx=".85"/><rect x="13.3" y="1.6" width="1.7" height="3" rx=".85"/><rect x="9" y="19.4" width="1.7" height="3" rx=".85"/><rect x="13.3" y="19.4" width="1.7" height="3" rx=".85"/><rect x="1.6" y="9" width="3" height="1.7" rx=".85"/><rect x="1.6" y="13.3" width="3" height="1.7" rx=".85"/><rect x="19.4" y="9" width="3" height="1.7" rx=".85"/><rect x="19.4" y="13.3" width="3" height="1.7" rx=".85"/></g></g>,
  // Card — soft body + solid magnetic stripe + solid chip.
  card: <g><rect x="2.4" y="5" width="19.2" height="14" rx="3" opacity=".32"/><rect x="2.4" y="8.2" width="19.2" height="2.8"/><rect x="5" y="14" width="5" height="2.2" rx="1.1"/></g>,
  // File — soft sheet + solid folded corner + solid lines.
  file: <g><path d="M6 2.2h6.4L18 7.8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.2a2 2 0 0 1 2-2Z" opacity=".32"/><path d="M12.4 2.4 18 8h-4.2a1.4 1.4 0 0 1-1.4-1.4V2.4Z"/><rect x="7.2" y="12.2" width="7.6" height="1.6" rx=".8"/><rect x="7.2" y="15.4" width="5.2" height="1.6" rx=".8"/></g>,
  // Shopping bag — solid bag + punched handle.
  order: <g><path fillRule="evenodd" clipRule="evenodd" d="M7.1 7.2V6.4a4.9 4.9 0 0 1 9.8 0v.8h2.1a1.4 1.4 0 0 1 1.4 1.5l-.88 10.2A2.5 2.5 0 0 1 16.5 21.2h-9A2.5 2.5 0 0 1 5.05 18.9L4.17 8.7A1.4 1.4 0 0 1 5.57 7.2H7.1Zm2.2 0h5.4V6.4a2.7 2.7 0 0 0-5.4 0v.8Z"/></g>,
};
const OBJ_PRESET = {
  device:    { glyph: 'device',    hue: 262 },
  accessory: { glyph: 'accessory', hue: 230 },
  service:   { glyph: 'service',   hue: 70 },
  app:       { glyph: 'app',       hue: 264 },
  merchant:  { glyph: 'merchant',  hue: 152 },
  customer:  { glyph: 'customer',  hue: 230 },
  firmware:  { glyph: 'firmware',  hue: 25 },
  card:      { glyph: 'card',      hue: 262 },
  file:      { glyph: 'file',      hue: 262 },
  order:     { glyph: 'order',     hue: 152 },
};
// Map a catalog product → ObjectTile category. Shared by every product
// surface (list, mall/Goods, pickers) so categorization never drifts.
const productObjectCat = (p) => {
  if (!p) return 'order';
  if (p.type === 'DEVICE') return 'device';
  if (/onboard|warrant|service|training|setup|support|install/i.test(p.name || '')) return 'service';
  return 'accessory';
};
// Per-model hue (0–359) hashed from a model code/name. SAME formula as the
// Device Models ModelTile placeholder, so a model is the same color on every
// page (Device Models · Catalog · Goods · Firmware).
const modelHue = (s) => {
  let h = 0; const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
};
const ObjectTile = ({ cat, glyph, hue, size = 40, title, className = '', style }) => {
  const preset = OBJ_PRESET[cat] || {};
  const g = glyph || preset.glyph || 'accessory';
  const h = hue != null ? hue : (preset.hue != null ? preset.hue : 250);
  const gs = Math.round(size * 0.5);
  return (
    <span className={`obj-tile ${className}`.trim()} title={title}
      style={{ '--ot-h': h, width: size, height: size, ...style }}>
      <svg viewBox="0 0 24 24" width={gs} height={gs} fill="currentColor" aria-hidden="true">{OBJ_GLYPH[g] || OBJ_GLYPH.accessory}</svg>
    </span>
  );
};

Object.assign(window, {
  Icon, Badge, ContractBadge, Btn, Input, Field, Textarea, Select, Modal,
  TdsModal: Modal,
  ToastProvider, useToast, CompanyLogo, StatCard, StatGrid, ObjectTile, OBJ_GLYPH, OBJ_PRESET, productObjectCat, modelHue,
  PanelHeader,
  CONTRACT_INFO, STATUS_TONE,
  maskEmail, maskPhone, maskName, fmtDate, fmtDateTime, relTime,
});
