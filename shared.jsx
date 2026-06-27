/* global React, ReactDOM */
const { useState, useEffect, useRef, createContext, useContext } = React;

// ─── Icons (inline SVG, currentColor) ──────────────────────
const Icon = ({ name, size = 16, ...rest }) => {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    users:        <g {...stroke}><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9.5" r="2.4"/><path d="M21 17.5c0-2.2-1.8-4-4-4"/></g>,
    file:         <g {...stroke}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></g>,
    cart:         <g {...stroke}><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M2.5 4h2.3l2.1 11.4a1.5 1.5 0 0 0 1.5 1.2h7.8a1.5 1.5 0 0 0 1.5-1.2L19.5 8H6"/></g>,
    receipt:      <g {...stroke}><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></g>,
    tag:          <g {...stroke}><path d="M3.5 3.5h7.6a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0L4.1 12.5a2 2 0 0 1-.6-1.4z"/><circle cx="8" cy="8" r="1.3"/></g>,
    folder:       <g {...stroke}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g>,
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
    smartphone:   <g {...stroke}><rect x="6.5" y="3" width="11" height="18" rx="2.2"/><path d="M10.5 18h3"/></g>,
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
    unlock:       <g {...stroke}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-1.9"/></g>,
    unlink:       <g {...stroke}><path d="M9.5 14.5 8 16a3.5 3.5 0 0 1-5-5l2-2"/><path d="M14.5 9.5 16 8a3.5 3.5 0 0 1 5 5l-2 2"/><path d="M8 3.5v2M3.5 8h2M20.5 16h-2M16 20.5v-2"/></g>,
    pause:        <g {...stroke}><rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/></g>,
    play:         <g {...stroke}><path d="M7 5 19 12 7 19z"/></g>,
    ban:          <g {...stroke}><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></g>,
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
  const k = String(kind || '').toLowerCase().replace(/-pilot$/, '');
  if (k === 'isv') return 'file';
  if (k === 'iso') return 'shield';
  if (k === 'merchant') return 'pos';
  if (k === 'admin') return 'key';
  return 'link';
};
window.iconForKind = iconForKind;

// Strip the '-PILOT' suffix to get the base contract kind ('ISO-PILOT' →
// 'ISO'). Used for schema / icon / CSS lookups that key off the base type.
const baseKind = (k) => String(k || '').replace(/-PILOT$/i, '');
window.baseKind = baseKind;
// True when a contract (object or kind string) is a pilot. Pilot-ness is a
// property of the contract TYPE ('*-PILOT'), not a separate status — there
// is no pilot↔active linkage; each contract type is independent.
const contractIsPilot = (c) => {
  if (!c) return false;
  if (typeof c === 'string') return /-PILOT$/i.test(c);
  if (c.isPilot != null) return !!c.isPilot;
  return /-PILOT$/i.test(String(c.kind || c.contractType || ''));
};
window.contractIsPilot = contractIsPilot;

// Contract "family" — the formal type and its pilot variant are mutually
// exclusive members of one family. ISO ⇄ ISO-PILOT and ISV ⇄ ISV-PILOT.
// Returns 'ISO' | 'ISV' | null (MERCHANT / ADMIN have no pilot variant).
const contractFamily = (c) => {
  const t = typeof c === 'string' ? c : String(c?.kind || c?.contractType || '');
  const u = t.toUpperCase();
  if (u === 'ISO' || u === 'ISO-PILOT') return 'ISO';
  if (u === 'ISV' || u === 'ISV-PILOT') return 'ISV';
  return null;
};
window.contractFamily = contractFamily;

// Cross-type rule (revised contract spec): a partner may not hold a formal
// type and its pilot variant at the same time, and conversion is one-way
// (pilot → formal terminates the pilot and bars re-creating it).
//   • Can't add a PILOT if any contract of the same family already exists
//     (live OR terminated) — covers "formal exists → no pilot" and
//     "after convert, can't revert to pilot".
//   • Can't add a FORMAL if a pilot of the same family is still live —
//     the pilot must be terminated (converted) first.
// `existing` is an array of contract rows ({ kind|contractType, status,
// effectiveTo }) for the partner; `tz` is the partner timezone.
// Returns a reason string when blocked, else null.
const pilotExclusionReason = (kind, existing, tz) => {
  const fam = contractFamily(kind);
  if (!fam) return null;
  const adding = String(kind).toUpperCase();
  const addingIsPilot = /-PILOT$/.test(adding);
  const sameFamily = (existing || []).filter((c) => contractFamily(c) === fam);
  if (addingIsPilot) {
    const any = sameFamily.find((c) => true);
    if (any) {
      const liveFormal = sameFamily.find((c) => !contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED');
      if (liveFormal) return `${fam} already holds a formal ${fam} contract — pilots aren't available once a paid contract exists.`;
      const everFormal = sameFamily.find((c) => !contractIsPilot(c));
      if (everFormal) return `${fam} previously held a formal ${fam} contract — a pilot can't be re-created after conversion.`;
      const livePilot = sameFamily.find((c) => contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED');
      if (livePilot) return `A ${fam}-Pilot is already in force — extend it instead of adding another.`;
    }
  } else {
    const livePilot = sameFamily.find((c) => contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED');
    if (livePilot) return `Terminate the live ${fam}-Pilot first — converting a pilot replaces it with the formal ${fam} contract.`;
  }
  return null;
};
window.pilotExclusionReason = pilotExclusionReason;

// When ADDING a FORMAL kind (ISO/ISV) while a live pilot of the same family
// exists (and no formal was ever created), return that live pilot contract —
// the caller routes into the authorization/convert flow (terminate pilot +
// create formal) instead of a plain add. Returns null otherwise.
const pilotConvertTarget = (kind, existing, tz) => {
  const fam = contractFamily(kind);
  if (!fam) return null;
  if (/-PILOT$/i.test(String(kind))) return null; // only when adding the formal type
  const sameFamily = (existing || []).filter((c) => contractFamily(c) === fam);
  if (sameFamily.find((c) => !contractIsPilot(c))) return null; // had/has a formal → blocked elsewhere
  return sameFamily.find((c) => contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED') || null;
};
window.pilotConvertTarget = pilotConvertTarget;

// Build the list of contract options offerable in the single "Add contract"
// picker for a partner, given their existing contracts. Admins never issue
// MERCHANT (maintained by the ISO) or ADMIN. Per family (ISO / ISV):
//   • live formal exists        → family unavailable (omitted)
//   • live pilot exists         → offer the FORMAL only, flagged convert
//   • formal existed (terminated) → offer the FORMAL only (no pilot re-create)
//   • nothing                   → offer PILOT + FORMAL as fresh adds
// Each option: { kind, family, convert: <pilotContract|null>, label, desc }.
const contractAddOptions = (existing, tz) => {
  const out = [];
  ['ISO', 'ISV'].forEach((fam) => {
    const sameFamily = (existing || []).filter((c) => contractFamily(c) === fam);
    const liveFormal = sameFamily.find((c) => !contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED');
    if (liveFormal) return;
    const livePilot = sameFamily.find((c) => contractIsPilot(c) && effectiveStatus(c, tz) !== 'TERMINATED');
    const everFormal = sameFamily.find((c) => !contractIsPilot(c));
    const meta = (k) => ({ kind: k, family: fam, label: (CONTRACT_INFO[k] || {}).label || k, desc: (CONTRACT_INFO[k] || {}).desc || '' });
    if (livePilot) { out.push({ ...meta(fam), convert: livePilot }); return; }
    if (everFormal) { out.push({ ...meta(fam), convert: null }); return; }
    out.push({ ...meta(fam + '-PILOT'), convert: null });
    out.push({ ...meta(fam), convert: null });
  });
  return out;
};
window.contractAddOptions = contractAddOptions;

const CONTRACT_INFO = {
  ISV:          { label: 'ISV',       desc: 'Independent Software Vendor',    icon: 'isv', hue: 'accent' },
  ISO:          { label: 'ISO',       desc: 'Independent Sales Organization', icon: 'iso', hue: 'info' },
  'ISO-PILOT':  { label: 'ISO-Pilot', desc: 'ISO trial · 180-day · fees locked at $0', icon: 'iso', hue: 'info' },
  'ISV-PILOT':  { label: 'ISV-Pilot', desc: 'ISV trial · 180-day · fees locked at $0', icon: 'isv', hue: 'accent' },
  Merchant:     { label: 'Merchant',  desc: 'Direct merchant agreement',      icon: 'merchant', hue: 'merchant' },
  ADMIN:        { label: 'ADMIN',     desc: 'Carbon platform internal',       icon: 'admin', hue: 'admin', internal: true },
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
// Returns one of: 'ONBOARDING' | 'ACTIVE'.
//   ONBOARDING — no live contracts, OR no usable operator yet
//   ACTIVE     — ≥1 (ACTIVE|PILOT) contract + ≥1 usable operator
// There is NO customer-level LOCKED — access control is per-contract Suspend.
const entityStatus = (customer) => {
  if (!customer) return null;
  const tz = customer.timezone;
  const contracts = customer.contracts || [];
  // Live = anything not TERMINATED.
  const live = contracts.filter((c) => effectiveStatus(c, tz) !== 'TERMINATED');
  if (live.length === 0) return 'ONBOARDING';
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
  return fmtDate(iso);
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

// ─── Modal ────────────────────────────────────────────────
// `placement` controls layout:
//   'center' (default) — classic centered modal, capped at `width` px
//   'right'            — right-side drawer, fills viewport height, `width` is the drawer width
const Modal = ({ open, onClose, title, children, footer, width = 480, placement = 'center' }) => {
  if (!open) return null;
  const isDrawer = placement === 'right';
  return (
    <div className={`tds-modal-overlay ${isDrawer ? 'tds-modal-overlay--drawer' : ''}`} onClick={onClose}>
      <div
        className={`tds-modal ${isDrawer ? 'tds-modal--drawer' : ''}`}
        style={isDrawer ? { width } : { maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="tds-modal__header">
          <h3 className="tds-modal__title">{title}</h3>
          <button className="iconbtn" onClick={onClose}><Icon name="x"/></button>
        </div>
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
const HUES = [
  ['#5B7CFA', '#3D5BC9'],
  ['#7A5BFA', '#5A3DC9'],
  ['#13A47A', '#0F8060'],
  ['#D17A3A', '#A65A22'],
  ['#3A99D1', '#1F6FA8'],
  ['#C24E8B', '#962F66'],
];
const hueFor = (name) => {
  const safe = name || '?';
  let h = 0;
  for (const c of safe) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
};
const CompanyLogo = ({ name, size = 32, square = true }) => {
  const safe = (name && String(name).trim()) || '';
  const [a, b] = hueFor(safe || '?');
  const initials = safe
    ? safe.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
    : '?';
  return (
    <span className="cust-avatar" style={{ width: size, height: size, borderRadius: square ? 8 : '50%', background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.36 }}>{initials}</span>
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

// ─── Date & time formatting (ui-spec §11 · en-US) ───────────
// 三形态：仅日期 M/D/YYYY · 仅时间 h:mm AM/PM · 日期+时间 M/D/YYYY h:mm AM/PM。
// 12 小时制、小时/月/日不补前导 0、分钟两位、AM/PM 前留一个空格、不带时区后缀。
// 带秒变体 fmtTimeS / fmtDateTimeS 仅用于日志 / 审计 / 设备遥测等需要秒的场景。
const _pad2 = (n) => String(n).padStart(2, '0');
// date-only 'YYYY-MM-DD' → LOCAL midnight（避免时区把日历日偏移一天）；Date 实例直接用；其余交给原生解析。
const _parseWhen = (v) => {
  if (v instanceof Date) return v;
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
};
// 裸时钟串，如 '14:31' / '14:31:52'（无日期部分）。
const _bareClock = (v) => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(v).trim());
  return m ? { h: +m[1], min: +m[2], sec: m[3] != null ? +m[3] : null } : null;
};
const _clock12 = (h, min, sec) => {
  const ap = h < 12 ? 'AM' : 'PM';
  const hr = (h % 12) || 12;
  const base = `${hr}:${_pad2(min)}`;
  return sec == null ? `${base} ${ap}` : `${base}:${_pad2(sec)} ${ap}`;
};
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = _parseWhen(iso);
  if (isNaN(d)) return String(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};
// withSec=true 时保留秒（裸串本身无秒则不补 :00）。
const fmtTime = (iso, withSec = false) => {
  if (!iso) return '';
  const bc = _bareClock(iso);
  if (bc) return _clock12(bc.h, bc.min, withSec ? bc.sec : null);
  const d = _parseWhen(iso);
  if (isNaN(d)) return String(iso);
  return _clock12(d.getHours(), d.getMinutes(), withSec ? d.getSeconds() : null);
};
const fmtTimeS = (iso) => fmtTime(iso, true);
const fmtDateTime = (iso, withSec = false) => {
  if (!iso) return '';
  const d = _parseWhen(iso);
  if (isNaN(d)) return String(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} `
       + `${_clock12(d.getHours(), d.getMinutes(), withSec ? d.getSeconds() : null)}`;
};
const fmtDateTimeS = (iso) => fmtDateTime(iso, true);

// ─── Relative time ───────────────────────────────────────
const relTime = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff/86400)}d ago`;
  return fmtDate(iso);
};

// ─── StepperCard (ui-spec §7.3 变体 A · 卡片，正文承载) ───────
// 分步向导进度，画法对齐 Order detail StatusPipeline：标准卡承载 ·
// 36 圆点（序号 / ✓）· 实心当前点 + shadow-cta · 两行标签（STEP N + 标题）·
// flex:1 撑满连接条。current 为 1-based 当前步；已完成步可点回退（onJump(n)）。
const StepperCard = ({ steps, current, onJump }) => (
  <div className="stepper-card">
    <div className="pipe">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        const state = done ? 'done' : active ? 'active' : 'future';
        const clickable = done && typeof onJump === 'function';
        return (
          <React.Fragment key={s.label || i}>
            <div
              className={`pipe__step ${state} ${clickable ? 'is-clickable' : ''}`}
              onClick={clickable ? () => onJump(n) : undefined}>
              <div className="pipe__dot">{done ? <Icon name="check" size={16}/> : n}</div>
              <div className="pipe__lbl">
                <span className="pipe__over">Step {n}</span>
                <span className="pipe__name">{s.label}</span>
              </div>
            </div>
            {i < steps.length - 1 && <div className={`pipe__bar ${done ? 'is-done' : ''}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

Object.assign(window, {
  Icon, Badge, ContractBadge, Btn, Input, Field, Textarea, Select, Modal,
  ToastProvider, useToast, CompanyLogo, StepperCard,
  CONTRACT_INFO, STATUS_TONE,
  maskEmail, maskPhone, maskName, fmtDate, fmtTime, fmtTimeS, fmtDateTime, fmtDateTimeS, relTime,
});
