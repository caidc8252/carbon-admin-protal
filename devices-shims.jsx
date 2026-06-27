/* global React, ReactDOM, Icon */
// ─────────────────────────────────────────────────────────────
// Carbon devices module — primitive shims
// Provides window.Ico / Pill / Card / Button / Input / Modal /
// PageHeader / AppIcon so the imported devices-fleet.jsx renders
// against this project's TOMS Design System.
// Also wires stubs for the cross-module references that don't
// exist in this admin (merchants, tickets).
// ─────────────────────────────────────────────────────────────

// ─── Icon name compatibility map ─────────────────────────────
// The source uses lowercase variants and a few names the existing
// Icon component doesn't yet cover. Wire those through.
const ICO_ALIASES = {
  chevr: 'chevR', chevl: 'chevL', chevd: 'chevD',
  chevdown: 'chevD', chevu: 'arrowU',
  arrowU2: 'arrowU', arrowD2: 'chevD',
  doc:   'file',
  refresh: 'rotate',
  device: 'cpu',
  comment: 'mail',
  upload: 'arrowU',
};

// Inline SVGs for icons not in shared.jsx
const EXTRA_PATHS = {
  alert: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <path d="M12 9v4M12 17h.01"/>
  </g>,
  arrowR: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </g>,
  arrowL: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M11 6l-6 6 6 6"/>
  </g>,
  wifi: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>
  </g>,
  ethernet: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="3" width="10" height="14" rx="1"/>
    <path d="M10 17v3M14 17v3M9 7h.01M12 7h.01M15 7h.01M9 10h.01M12 10h.01M15 10h.01"/>
  </g>,
  smartphone: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/>
  </g>,
  battery: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2"/>
  </g>,
  map: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>
  </g>,
  pin: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s7-7.6 7-12a7 7 0 1 0-14 0c0 4.4 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>
  </g>,
  ticket: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
    <path d="M13 6v12"/>
  </g>,
  bolt: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>
  </g>,
  external: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6"/>
    <path d="M10 14 20 4"/>
    <path d="M14 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V12"/>
    <path d="M4 8a2 2 0 0 1 2-2h6"/>
  </g>,
  building: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="1.5"/>
    <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>
    <path d="M10 21v-4h4v4"/>
  </g>,
  sparkle: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6" opacity="0.6"/>
    <path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" opacity="0.6"/>
  </g>,
  sun: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
  </g>,
  moon: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
  </g>,
  volume: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z"/>
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>
  </g>,
  plane: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 3.5 2 11l6 2.5L11 20l2.5-6z"/>
  </g>,
  signal: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18v-2M9 18v-5M14 18v-8M19 18V6"/>
  </g>,
  power: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v9"/><path d="M6.6 7.6a8 8 0 1 0 10.8 0"/>
  </g>,
  grid: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>
  </g>,
  server: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/>
    <path d="M7 7.5h.01M7 16.5h.01"/>
  </g>,
  accessibility: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.6" r="1.1"/>
    <path d="M7.5 10.2h9M12 10.2v4.2M12 14.4l-2.2 3.2M12 14.4l2.2 3.2"/>
  </g>,
  save: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <path d="M17 21v-7H7v7"/><path d="M7 3v4h7"/>
  </g>,
  cloud: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-11.64-1.2A4 4 0 0 0 6.5 19z"/>
  </g>,
};

const Ico = ({ name, size = 14, stroke = 1.6, style, ...rest }) => {
  const mapped = ICO_ALIASES[name] || name;
  if (EXTRA_PATHS[name]) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24"
           style={{ display: 'inline-block', verticalAlign: '-2px', strokeWidth: stroke, ...style }} {...rest}>
        {EXTRA_PATHS[name]}
      </svg>
    );
  }
  return <Icon name={mapped} size={size} style={{ display: 'inline-block', verticalAlign: '-2px', ...style }} {...rest} />;
};
window.Ico = Ico;

// ─── Pill (tone-tinted badge) ────────────────────────────────
const PILL_TONES = {
  success: { fg: 'var(--color-success-700)', bg: 'var(--color-success-50)', dot: 'var(--color-success-500)', bd: 'color-mix(in oklab, var(--color-success-500) 25%, transparent)' },
  warning: { fg: 'var(--color-warning-700)', bg: 'var(--color-warning-50)', dot: 'var(--color-warning-500)', bd: 'color-mix(in oklab, var(--color-warning-500) 28%, transparent)' },
  error:   { fg: 'var(--color-error-700)',   bg: 'var(--color-error-50)',   dot: 'var(--color-error-500)',   bd: 'color-mix(in oklab, var(--color-error-500) 25%, transparent)' },
  danger:  { fg: 'var(--color-error-700)',   bg: 'var(--color-error-50)',   dot: 'var(--color-error-500)',   bd: 'color-mix(in oklab, var(--color-error-500) 25%, transparent)' },
  info:    { fg: 'var(--color-info-700)',    bg: 'var(--color-info-50)',    dot: 'var(--color-info-500)',    bd: 'color-mix(in oklab, var(--color-info-500) 25%, transparent)' },
  neutral: { fg: 'var(--color-text-secondary)', bg: 'var(--color-bg-3)',   dot: 'var(--color-text-tertiary)', bd: 'var(--color-border-subtle)' },
};
const Pill = ({ tone = 'neutral', size = 'sm', dot, children }) => {
  const c = PILL_TONES[tone] || PILL_TONES.neutral;
  const pad = size === 'lg' ? '4px 10px' : size === 'md' ? '3px 9px' : '2px 8px';
  const fz = size === 'lg' ? 12 : size === 'md' ? 11.5 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, fontSize: fz, fontWeight: 600,
      color: c.fg, background: c.bg, border: `1px solid ${c.bd}`,
      borderRadius: 999, whiteSpace: 'nowrap',
      letterSpacing: '-0.005em',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />}
      {children}
    </span>
  );
};
window.Pill = Pill;
window.Badge = window.Badge || Pill;

// ─── Card (titled section) ──────────────────────────────────
const Card = ({ title, hint, action, padding, children, style }) => {
  // In read-only admin mode, drop write affordances (Push update,
  // Push install, Push an app, etc.). Those are always rendered as
  // <window.Button> elements. Raw <button> elements (Expand /
  // Collapse toggles, custom inline buttons) and composite actions
  // (a <div> wrapping a Pill + toggle button) pass through, so
  // collapsible sections still expand and pill chips still show.
  if (window.__DEVICES_READONLY && action && action.type === Button) {
    action = null;
  }
  return (
  <section style={{
    background: 'var(--color-bg-2)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-1)',
    overflow: 'hidden',
    ...style,
  }}>
    {(title || action) && (
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}>{title}</div>}
          {hint && <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{hint}</div>}
        </div>
        {action && <div style={{ flex: 'none' }}>{action}</div>}
      </header>
    )}
    <div style={{ padding: padding != null ? padding : 14 }}>{children}</div>
  </section>
  );
};
window.Card = Card;

// ─── Button (lightweight; maps to tds-btn variants) ──────────
const Button = ({ primary, danger, ghost, size = 'md', icon, iconRight, loading,
                  disabled, type = 'button', onClick, children, style, ...rest }) => {
  const variant = primary ? 'primary' : danger ? 'danger' : ghost ? 'ghost' : 'secondary';
  const sz = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick}
      className={`tds-btn tds-btn--${variant} tds-btn--${sz}`}
      style={style} {...rest}>
      {loading && <span className="tds-btn__spinner" />}
      {!loading && icon && <Ico name={icon} size={sz === 'sm' ? 12 : 14} />}
      {children}
      {iconRight && <Ico name={iconRight} size={sz === 'sm' ? 12 : 14} />}
    </button>
  );
};
window.Button = Button;

// ─── Date helpers + custom calendar popover ──────────────────
// The preview renders inside a cross-origin iframe, where Chrome BLOCKS the
// browser's native date popup entirely (showPicker() throws SecurityError and
// clicking the native glyph silently no-ops). So we cannot rely on <input
// type="date"> opening anything — we ship our own popover calendar that keeps
// the identical value / onChange contract ('YYYY-MM-DD' string in & out).
const _MONTHS = ['January','February','March','April','May','June','July',
                 'August','September','October','November','December'];
const _DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const _parseISO = (s) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
};
const _toISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const _fmtDisplay = (d) =>
  `${_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
const _sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const ShimDatePicker = ({ size = 'md', invalid, disabled, style, value, onChange,
                          min, max, placeholder = 'Select date' }) => {
  const { useState, useRef, useEffect } = React;
  const selected = _parseISO(value);
  const minD = _parseISO(min);
  const maxD = _parseISO(max);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date());
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  // Calendar is portaled to <body> with position:fixed so it floats above any
  // modal / drawer / overflow container and is never clipped. coords are
  // measured from the trigger and kept fresh on scroll/resize.
  const [coords, setCoords] = useState(null);

  const POP_W = 252, POP_H = 320;
  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flipUp = r.bottom + 6 + POP_H > window.innerHeight && r.top - 6 - POP_H > 0;
    let left = r.left;
    left = Math.min(left, window.innerWidth - POP_W - 8);
    left = Math.max(8, left);
    setCoords({
      left,
      top: flipUp ? r.top - 6 - POP_H : r.bottom + 6,
      // When flipping up we anchor by top using the known popup height; the
      // popup's own height is ~POP_H so this stays visually correct.
    });
  };

  useEffect(() => { if (selected) setView(selected); }, [value]);
  useEffect(() => {
    if (!open) { setCoords(null); return; }
    place();
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const onReflow = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onReflow);
    // capture-phase scroll so we follow scrolling inside the modal body too
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emit = (d) => {
    const v = d ? _toISO(d) : '';
    onChange && onChange({ target: { value: v }, currentTarget: { value: v } });
  };
  const disabledDay = (d) => (minD && d < minD) || (maxD && d > maxD);
  const pick = (d) => { if (disabledDay(d)) return; emit(d); setOpen(false); };

  // Build the 6×7 grid for `view`.
  const y = view.getFullYear(), mo = view.getMonth();
  const first = new Date(y, mo, 1);
  const startDow = first.getDay();
  const today = new Date();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, mo, 1 - startDow + i);
    cells.push(d);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      <button type="button" disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`tds-input tds-input--${size} ${invalid ? 'tds-input--invalid' : ''} ${disabled ? 'tds-input--disabled' : ''}`}
        style={{ width: '100%', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
                 background: 'var(--color-bg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, color: selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
          {selected ? _fmtDisplay(selected) : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
             style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </button>
      {open && coords && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9000,
                      background: 'var(--color-bg-2)', border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--card-radius-md, 12px)', boxShadow: 'var(--shadow-5)',
                      padding: 12, width: 252 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={() => setView(new Date(y, mo - 1, 1))} style={_navBtn}>‹</button>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {_MONTHS[mo]} {y}
            </div>
            <button type="button" onClick={() => setView(new Date(y, mo + 1, 1))} style={_navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {_DOW.map((w, i) => (
              <div key={'w' + i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600,
                   letterSpacing: '0.04em', color: 'var(--color-text-tertiary)', padding: '2px 0' }}>{w}</div>
            ))}
            {cells.map((d, i) => {
              const out = d.getMonth() !== mo;
              const isSel = _sameDay(d, selected);
              const isToday = _sameDay(d, today);
              const dis = disabledDay(d);
              return (
                <button key={i} type="button" disabled={dis}
                  onClick={() => pick(d)}
                  style={{
                    height: 30, borderRadius: 6, border: 'none', cursor: dis ? 'not-allowed' : 'pointer',
                    fontSize: 12.5, fontVariantNumeric: 'tabular-nums',
                    background: isSel ? 'var(--color-primary-700)' : 'transparent',
                    color: isSel ? 'var(--color-text-on-primary, #fff)'
                         : dis ? 'var(--color-text-disabled)'
                         : out ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    fontWeight: isToday && !isSel ? 700 : 400,
                    outline: isToday && !isSel ? '1px solid var(--color-border-strong)' : 'none',
                    opacity: out && !isSel ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isSel && !dis) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8,
                        borderTop: '1px solid var(--color-border-subtle)' }}>
            <button type="button" onClick={() => { emit(''); setOpen(false); }} style={_linkBtn}>Clear</button>
            <button type="button" onClick={() => pick(new Date())} style={_linkBtn}>Today</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
const _navBtn = { width: 26, height: 26, border: '1px solid var(--color-border-subtle)', borderRadius: 6,
  background: 'var(--color-bg-2)', cursor: 'pointer', color: 'var(--color-text-secondary)',
  fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const _linkBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
  fontWeight: 500, color: 'var(--color-primary-700)', padding: 0 };

// ─── Input (with prefix/suffix) ──────────────────────────────
const ShimInput = ({ size = 'md', prefix, suffix, invalid, mono, disabled,
                     style, onChange, onClick, ...rest }) => {
  // Date fields can't use the native popup in this iframe — delegate to the
  // custom calendar popover, preserving the value/onChange contract.
  if (rest.type === 'date') {
    return (
      <ShimDatePicker size={size} invalid={invalid} disabled={disabled} style={style}
        value={rest.value} onChange={onChange} min={rest.min} max={rest.max}
        placeholder={rest.placeholder} />
    );
  }
  return (
    <div className={`tds-input tds-input--${size} ${invalid ? 'tds-input--invalid' : ''} ${disabled ? 'tds-input--disabled' : ''}`}
         style={style}>
      {prefix && <span className="tds-input__addon tds-input__addon--prefix">{prefix}</span>}
      <input className="tds-input__el"
             style={mono ? { fontFamily: 'var(--font-family-mono)' } : undefined}
             disabled={disabled} onChange={onChange} onClick={onClick} {...rest} />
      {suffix && <span className="tds-input__addon tds-input__addon--suffix">{suffix}</span>}
    </div>
  );
};
window.Input = ShimInput;
window.DatePicker = ShimDatePicker;

// ─── Modal ──────────────────────────────────────────────────
// `placement` controls the layout:
//   'center' (default) — classic centered modal capped at `width` px
//   'right'            — slides in from the right edge, fills viewport height
const Modal = ({ open, onClose, width = 560, title, subtitle, footer, padding, children, placement = 'center' }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const isDrawer = placement === 'right';
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'oklch(0% 0 0 / 0.35)',
      display: isDrawer ? 'flex' : 'grid',
      placeItems: isDrawer ? undefined : 'center',
      justifyContent: isDrawer ? 'flex-end' : undefined,
      padding: isDrawer ? 0 : 24,
      animation: 'devShimFade .15s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div style={{
        width: isDrawer ? width : '100%',
        maxWidth: isDrawer ? 'none' : width,
        height: isDrawer ? '100vh' : undefined,
        maxHeight: isDrawer ? '100vh' : 'calc(100vh - 48px)',
        background: 'var(--color-bg-2)',
        border: isDrawer ? 'none' : '1px solid var(--color-border-default)',
        borderLeft: isDrawer ? '1px solid var(--color-border-default)' : undefined,
        borderRadius: isDrawer ? 0 : 'var(--radius-xl)',
        boxShadow: 'var(--shadow-5)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: isDrawer ? 'devShimDrawer .22s cubic-bezier(.2,.7,.3,1)' : 'devShimPop .18s ease',
      }}>
        {(title || subtitle) && (
          <header style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</div>}
              {subtitle && <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>{subtitle}</div>}
            </div>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: 0, padding: 6, cursor: 'pointer',
              color: 'var(--color-text-tertiary)', borderRadius: 6,
            }} title="Close" aria-label="Close">
              <Ico name="x" size={15} />
            </button>
          </header>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto',
                      padding: padding != null ? padding : 18 }}>
          {children}
        </div>
        {footer && (
          <footer style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-3)',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
          }}>{footer}</footer>
        )}
      </div>
      <style>{`
        @keyframes devShimFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes devShimPop  { from { opacity: 0; transform: translateY(6px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes devShimDrawer { from { transform: translateX(24px); opacity: .6 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
};
window.Modal = Modal;

// ─── ConfirmDialog (built on Modal) ─────────────────────────
const ConfirmDialog = ({ open, onClose, title, body, confirmLabel = 'Confirm',
                         cancelLabel = 'Cancel', tone = 'primary', icon,
                         onConfirm }) => {
  const isDanger = tone === 'danger';
  return (
    <Modal open={open} onClose={onClose} width={520} title={title}
      footer={
        <>
          <Button onClick={onClose}>{cancelLabel}</Button>
          <Button primary={!isDanger} danger={isDanger} icon={icon} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }>
      {body && (
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          {body}
        </div>
      )}
    </Modal>
  );
};
window.ConfirmDialog = ConfirmDialog;

// ─── PageHeader ─────────────────────────────────────────────
// The source ticket module passes `tabs` as a pre-rendered React node
// (a flex row of tab <button>s). Render it as a third row beneath the
// title so the source's Mine / All scope toggle shows up.
const PageHeader = ({ title, subtitle, actions, tabs }) => (
  <div className={`titlebar${tabs ? ' titlebar--tabs' : ''}${!tabs ? ' titlebar--compact' : ''}`}>
    <div className="titlebar__inner">
      <div className="titlebar__row">
        <div className="titlebar__main">
          <h1 className="titlebar__title">{title}</h1>
          {subtitle && <p className="titlebar__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="titlebar__actions">{actions}</div>}
      </div>
      {tabs && <div className="titlebar__tabs" role="tablist">{tabs}</div>}
    </div>
  </div>
);
window.PageHeader = PageHeader;

// ─── AppIcon (deterministic gradient) ───────────────────────
const AppIcon = ({ app, size = 36 }) => {
  const seed = (app?.id || app?.name || '').toString();
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const hue = h % 360;
  const initials = (app?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: `linear-gradient(135deg, oklch(58% 0.18 ${hue}), oklch(46% 0.20 ${(hue + 28) % 360}))`,
      color: '#fff', display: 'grid', placeItems: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 600,
      letterSpacing: '-0.02em', flex: 'none',
    }}>{initials}</div>
  );
};
window.AppIcon = AppIcon;

// ─── Cross-module stubs ─────────────────────────────────────
// This admin doesn't have merchants or tickets modules — keep the
// references inert so the imported file renders cleanly. The
// Deployment card will show "—" for merchant/store and the ticket
// chip will show "No open tickets".
window.findMerchantById   = window.findMerchantById   || (() => null);
window.openTicketsForDevice = window.openTicketsForDevice || (() => []);
window.findTicketById     = window.findTicketById     || (() => null);
// Read-only admin: device list + detail are inspection-only. Hides write
// affordances (Push update, Push install, Re-collect, inline Change…).
window.__DEVICES_READONLY = true;
window.SEVERITY = window.SEVERITY || {
  critical: { label: 'Critical', color: 'var(--color-error-500)' },
  high:     { label: 'High',     color: 'var(--color-warning-500)' },
  medium:   { label: 'Medium',   color: 'var(--color-warning-500)' },
  low:      { label: 'Low',      color: 'var(--color-info-500)' },
  info:     { label: 'Info',     color: 'var(--color-text-tertiary)' },
};
