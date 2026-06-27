/* @ds-bundle: {"format":3,"namespace":"TOMSDesignSystem20_3fa60e","components":[{"name":"Button","sourcePath":"components/Button.tsx"},{"name":"Card","sourcePath":"components/Card.tsx"},{"name":"Badge","sourcePath":"components/Card.tsx"},{"name":"Tabs","sourcePath":"components/DataDisplay.tsx"},{"name":"Pagination","sourcePath":"components/DataDisplay.tsx"},{"name":"Table","sourcePath":"components/DataDisplay.tsx"},{"name":"Modal","sourcePath":"components/Feedback.tsx"},{"name":"ToastProvider","sourcePath":"components/Feedback.tsx"},{"name":"Tooltip","sourcePath":"components/Feedback.tsx"},{"name":"Popover","sourcePath":"components/Feedback.tsx"},{"name":"Field","sourcePath":"components/Field.tsx"},{"name":"Input","sourcePath":"components/Input.tsx"},{"name":"Layout","sourcePath":"components/Layout.tsx"},{"name":"Grid","sourcePath":"components/Layout.tsx"},{"name":"GridItem","sourcePath":"components/Layout.tsx"},{"name":"Stack","sourcePath":"components/Layout.tsx"},{"name":"Select","sourcePath":"components/Select.tsx"},{"name":"Checkbox","sourcePath":"components/Toggles.tsx"},{"name":"Radio","sourcePath":"components/Toggles.tsx"},{"name":"Switch","sourcePath":"components/Toggles.tsx"}],"sourceHashes":{"components/Button.tsx":"e3f9232ed240","components/Card.tsx":"eb842f45fad1","components/DataDisplay.tsx":"8f2cc7dd3fe4","components/Feedback.tsx":"4ffa75a647ec","components/Field.tsx":"9928dc19b317","components/Input.tsx":"f928c8fa1773","components/Layout.tsx":"11c55207a577","components/Select.tsx":"0d20907b8d78","components/Toggles.tsx":"37d033ae5e69","components/index.ts":"28d02fe2d5a7","dark-mode/chrome.js":"adcc3c80b475","dark-mode/tailwind.config.js":"cb5ff2065778","tokens/tailwind.preset.js":"586d2a962160","ui_kits/component-showcase/components.jsx":"5f70924dc140","ui_kits/terminal-manager/app.jsx":"5b4aa7906667","ui_kits/terminal-manager/charts.jsx":"4997f4d99b42","ui_kits/terminal-manager/cmdk.jsx":"95fc1a0dbd10","ui_kits/terminal-manager/design-canvas.jsx":"5d0e39003628","ui_kits/terminal-manager/shell.jsx":"36c3d501876c","ui_kits/terminal-manager/tab-overview-spacious.jsx":"77ac58d69804","ui_kits/terminal-manager/tab-overview.jsx":"e90e292271b4","ui_kits/terminal-manager/tabs-rest-spacious.jsx":"5ed8d625e159","ui_kits/terminal-manager/tabs-rest.jsx":"ca2d5b214d83","ui_kits/terminal-manager/tweaks-panel.jsx":"ea982af775f0","uploads/handoff-data.js":"0e647c1dbf9e"},"inlinedExternals":[],"unexposedExports":[{"name":"cx","sourcePath":"components/index.ts"},{"name":"useToast","sourcePath":"components/Feedback.tsx"}]} */

(() => {

const __ds_ns = (window.TOMSDesignSystem20_3fa60e = window.TOMSDesignSystem20_3fa60e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Button.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — primary action surface.
 *
 * Variants
 * - `primary` — midnight indigo CTA. Use for the single most important action per view.
 * - `secondary` — neutral-bordered. Default for most actions.
 * - `ghost` — transparent. Toolbar / dense rows.
 * - `danger` — destructive (delete, factory reset). Always pair with confirmation.
 * - `link` — inline navigation. No padding, no background.
 */
const Button = React.forwardRef(function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  block = false,
  iconLeft,
  iconRight,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}, ref) {
  const isDisabled = disabled || loading;
  return /*#__PURE__*/React.createElement("button", _extends({
    ref: ref,
    type: type,
    disabled: isDisabled,
    "aria-busy": loading || undefined,
    className: __ds_scope.cx('tds-btn', `tds-btn--${variant}`, `tds-btn--${size}`, block && 'tds-btn--block', className)
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "tds-btn__spinner",
    "aria-hidden": true
  }) : iconLeft, children, iconRight);
});
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button.tsx", error: String((e && e.message) || e) }); }

// components/Card.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const Card = ({
  title,
  actions,
  footer,
  flush,
  className,
  children,
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  className: __ds_scope.cx('tds-card', className)
}, rest), (title || actions) && /*#__PURE__*/React.createElement("div", {
  className: "tds-card__header"
}, /*#__PURE__*/React.createElement("div", {
  className: "tds-card__title"
}, title), actions && /*#__PURE__*/React.createElement("div", null, actions)), /*#__PURE__*/React.createElement("div", {
  className: __ds_scope.cx('tds-card__body', flush && 'tds-card__body--flush'),
  style: flush ? {
    padding: 0
  } : undefined
}, children), footer && /*#__PURE__*/React.createElement("div", {
  className: "tds-card__footer"
}, footer));

/** Badge / Tag for status, counts, semantic meaning. */

const Badge = ({
  tone = 'neutral',
  className,
  ...rest
}) => /*#__PURE__*/React.createElement("span", _extends({
  className: __ds_scope.cx('tds-badge', `tds-badge--${tone}`, className)
}, rest));
Object.assign(__ds_scope, { Card, Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card.tsx", error: String((e && e.message) || e) }); }

// components/DataDisplay.tsx
try { (() => {
/** Tabs — top-level switcher between sibling views. */
const Tabs = ({
  items,
  value,
  onChange,
  className
}) => /*#__PURE__*/React.createElement("div", {
  role: "tablist",
  className: __ds_scope.cx('tds-tabs', className)
}, items.map(it => /*#__PURE__*/React.createElement("button", {
  key: it.key,
  role: "tab",
  "aria-selected": value === it.key,
  disabled: it.disabled,
  className: __ds_scope.cx('tds-tab', value === it.key && 'tds-tab--active'),
  onClick: () => onChange(it.key)
}, it.label)));
const Pagination = ({
  page,
  pageCount,
  onChange,
  siblingCount = 1
}) => {
  const pages = React.useMemo(() => {
    const out = [];
    const push = n => out.push(n);
    const start = Math.max(2, page - siblingCount);
    const end = Math.min(pageCount - 1, page + siblingCount);
    push(1);
    if (start > 2) push('…');
    for (let i = start; i <= end; i++) push(i);
    if (end < pageCount - 1) push('…');
    if (pageCount > 1) push(pageCount);
    return out;
  }, [page, pageCount, siblingCount]);
  return /*#__PURE__*/React.createElement("nav", {
    className: "tds-pagination",
    "aria-label": "Pagination"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tds-pagination__page",
    disabled: page <= 1,
    onClick: () => onChange(page - 1)
  }, "\u2039"), pages.map((p, i) => p === '…' ? /*#__PURE__*/React.createElement("span", {
    key: `e${i}`,
    className: "tds-pagination__page",
    "aria-hidden": true
  }, "\u2026") : /*#__PURE__*/React.createElement("button", {
    key: p,
    className: __ds_scope.cx('tds-pagination__page', p === page && 'tds-pagination__page--active'),
    "aria-current": p === page ? 'page' : undefined,
    onClick: () => onChange(p)
  }, p)), /*#__PURE__*/React.createElement("button", {
    className: "tds-pagination__page",
    disabled: page >= pageCount,
    onClick: () => onChange(page + 1)
  }, "\u203A"));
};
/** Table — sortable, header-stickied data grid. Sort is optional. */
function Table({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  empty = 'No data'
}) {
  const handleSort = col => {
    if (!col.sortable || !onSortChange) return;
    if (!sort || sort.key !== col.key) onSortChange({
      key: col.key,
      dir: 'asc'
    });else if (sort.dir === 'asc') onSortChange({
      key: col.key,
      dir: 'desc'
    });else onSortChange(null);
  };
  return /*#__PURE__*/React.createElement("table", {
    className: "tds-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      width: c.width,
      textAlign: c.align ?? 'left'
    }
  }, c.sortable ? /*#__PURE__*/React.createElement("span", {
    className: "tds-table__sort",
    onClick: () => handleSort(c)
  }, c.title, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: sort?.key === c.key ? 1 : 0.3
    }
  }, sort?.key === c.key && sort.dir === 'desc' ? '▼' : '▲')) : c.title)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      textAlign: 'center',
      padding: 32,
      color: 'var(--color-text-tertiary)'
    }
  }, empty)) : rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: rowKey(r, i)
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align ?? 'left'
    }
  }, c.render ? c.render(r) : c.field != null ? String(r[c.field] ?? '') : null))))));
}
Object.assign(__ds_scope, { Tabs, Pagination, Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/DataDisplay.tsx", error: String((e && e.message) || e) }); }

// components/Feedback.tsx
try { (() => {
/* ═══════════════ Modal ═══════════════ */

const Modal = ({
  open,
  onClose,
  title,
  footer,
  width = 480,
  closeOnOverlay = true,
  children
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "tds-modal-overlay",
    onClick: () => closeOnOverlay && onClose(),
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tds-modal",
    style: {
      maxWidth: width
    },
    onClick: e => e.stopPropagation()
  }, title && /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__title"
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    className: "tds-btn tds-btn--ghost tds-btn--sm",
    style: {
      height: 28,
      width: 28,
      padding: 0
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__footer"
  }, footer)));
};

/* ═══════════════ Toast ═══════════════ */

const ToastContext = React.createContext(null);
const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};
const ToastProvider = ({
  children
}) => {
  const [items, setItems] = React.useState([]);
  const dismiss = React.useCallback(id => setItems(xs => xs.filter(x => x.id !== id)), []);
  const push = React.useCallback(t => {
    const id = t.id ?? Math.random().toString(36).slice(2);
    const tone = t.tone ?? 'info';
    setItems(xs => [...xs, {
      ...t,
      id,
      tone
    }]);
    const dur = t.duration ?? 3500;
    if (dur > 0) setTimeout(() => dismiss(id), dur);
    return id;
  }, [dismiss]);
  return /*#__PURE__*/React.createElement(ToastContext.Provider, {
    value: {
      push,
      dismiss
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    className: "tds-toast-stack",
    role: "region",
    "aria-label": "Notifications"
  }, items.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: __ds_scope.cx('tds-toast', `tds-toast--${t.tone}`),
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tds-toast__icon",
    "aria-hidden": true
  }, toneGlyph(t.tone)), /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__body"
  }, t.title && /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__title"
  }, t.title), t.message && /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__msg"
  }, t.message))))));
};
function toneGlyph(t) {
  switch (t) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '!';
    default:
      return 'i';
  }
}

/* ═══════════════ Tooltip ═══════════════ */

/** Tooltip — hover/focus-triggered transient label. Wrap a single focusable child. */
const Tooltip = ({
  content,
  side = 'top',
  delay = 250,
  children
}) => {
  const [visible, setVisible] = React.useState(false);
  const [pos, setPos] = React.useState({
    top: 0,
    left: 0
  });
  const anchorRef = React.useRef(null);
  const timer = React.useRef();
  const measure = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const offset = 6;
    let top = r.top,
      left = r.left + r.width / 2;
    if (side === 'top') top = r.top - offset;
    if (side === 'bottom') top = r.bottom + offset;
    if (side === 'left') {
      top = r.top + r.height / 2;
      left = r.left - offset;
    }
    if (side === 'right') {
      top = r.top + r.height / 2;
      left = r.right + offset;
    }
    setPos({
      top,
      left
    });
  }, [side]);
  const show = () => {
    timer.current = window.setTimeout(() => {
      measure();
      setVisible(true);
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setVisible(false);
  };
  const child = React.cloneElement(children, {
    ref: n => {
      anchorRef.current = n;
    },
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide
  });
  const transform = side === 'top' ? 'translate(-50%, -100%)' : side === 'bottom' ? 'translate(-50%, 0)' : side === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
  return /*#__PURE__*/React.createElement(React.Fragment, null, child, visible && /*#__PURE__*/React.createElement("div", {
    className: "tds-tooltip",
    style: {
      top: pos.top,
      left: pos.left,
      transform
    },
    role: "tooltip"
  }, content));
};

/* ═══════════════ Popover ═══════════════ */

const Popover = ({
  open,
  onOpenChange,
  trigger,
  children,
  side = 'bottom',
  align = 'start'
}) => {
  const anchorRef = React.useRef(null);
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState({
    top: 0,
    left: 0
  });
  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let top = side === 'bottom' ? r.bottom + 4 : r.top - 4;
      let left = align === 'start' ? r.left : align === 'center' ? r.left + r.width / 2 : r.right;
      setPos({
        top,
        left
      });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, side, align]);
  React.useEffect(() => {
    if (!open) return;
    const onClick = e => {
      const t = e.target;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onOpenChange]);
  const transform = side === 'top' ? align === 'center' ? 'translate(-50%, -100%)' : align === 'end' ? 'translate(-100%, -100%)' : 'translate(0, -100%)' : align === 'center' ? 'translate(-50%, 0)' : align === 'end' ? 'translate(-100%, 0)' : 'translate(0, 0)';
  const triggerWithRef = React.cloneElement(trigger, {
    ref: n => {
      anchorRef.current = n;
    },
    onClick: e => {
      trigger.props.onClick?.(e);
      onOpenChange(!open);
    }
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, triggerWithRef, open && /*#__PURE__*/React.createElement("div", {
    ref: popRef,
    className: "tds-popover",
    style: {
      top: pos.top,
      left: pos.left,
      transform
    },
    role: "dialog"
  }, children));
};
Object.assign(__ds_scope, { Modal, useToast, ToastProvider, Tooltip, Popover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Feedback.tsx", error: String((e && e.message) || e) }); }

// components/Field.tsx
try { (() => {
/**
 * Field — labelled wrapper around any input/select. Renders label, hint and error in
 * a consistent column. The error message replaces the hint when present.
 */
const Field = ({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: __ds_scope.cx('tds-field', className)
}, label && /*#__PURE__*/React.createElement("label", {
  htmlFor: htmlFor,
  className: __ds_scope.cx('tds-field__label', required && 'tds-field__label--required')
}, label), children, error ? /*#__PURE__*/React.createElement("div", {
  className: "tds-field__error",
  role: "alert"
}, error) : hint ? /*#__PURE__*/React.createElement("div", {
  className: "tds-field__hint"
}, hint) : null);
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Field.tsx", error: String((e && e.message) || e) }); }

// components/Input.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — single-line text field. Supports `type="text" | "password" | "search" | "email" | ...`.
 * Wrap in `<Field>` for label + hint + error UI.
 */
const Input = React.forwardRef(function Input({
  size = 'md',
  invalid = false,
  prefix,
  suffix,
  disabled,
  wrapperClassName,
  className,
  ...rest
}, ref) {
  return /*#__PURE__*/React.createElement("div", {
    className: __ds_scope.cx('tds-input', `tds-input--${size}`, invalid && 'tds-input--invalid', disabled && 'tds-input--disabled', wrapperClassName)
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "tds-input__addon tds-input__addon--prefix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    className: __ds_scope.cx('tds-input__el', className)
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "tds-input__addon tds-input__addon--suffix"
  }, suffix));
});
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Input.tsx", error: String((e && e.message) || e) }); }

// components/Layout.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Layout shell — fixed sidebar + sticky header + scrollable content. */
const Layout = ({
  sidebar,
  header,
  children,
  className
}) => /*#__PURE__*/React.createElement("div", {
  className: __ds_scope.cx('tds-layout', className)
}, sidebar && /*#__PURE__*/React.createElement("aside", {
  className: "tds-layout__sidebar"
}, sidebar), /*#__PURE__*/React.createElement("main", {
  className: "tds-layout__main"
}, header && /*#__PURE__*/React.createElement("header", {
  className: "tds-layout__header"
}, header), /*#__PURE__*/React.createElement("div", {
  className: "tds-layout__content"
}, children)));

/** Grid — responsive 12-col grid backed by CSS grid. */

const Grid = ({
  columns = 12,
  gap = 'var(--space-4)',
  style,
  children,
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  style: {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap,
    ...style
  }
}, rest), children);
const GridItem = ({
  span = 1,
  style,
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  style: {
    gridColumn: `span ${span} / span ${span}`,
    minWidth: 0,
    ...style
  }
}, rest));

/** Stack — flex column or row with gap. */

const Stack = ({
  direction = 'column',
  gap = 'var(--space-3)',
  align,
  justify,
  wrap,
  style,
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  style: {
    display: 'flex',
    flexDirection: direction,
    gap,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : undefined,
    ...style
  }
}, rest));
Object.assign(__ds_scope, { Layout, Grid, GridItem, Stack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Layout.tsx", error: String((e && e.message) || e) }); }

// components/Select.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Select — native `<select>` with custom chrome. Accessible by default. */
function Select({
  size = 'md',
  invalid,
  options,
  value,
  placeholder,
  onChange,
  disabled,
  className,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: __ds_scope.cx('tds-select', `tds-select--${size}`, invalid && 'tds-select--invalid', disabled && 'tds-select--disabled', className)
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    disabled: disabled,
    onChange: e => onChange?.(e.target.value)
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true,
    hidden: true
  }, placeholder), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: String(o.value),
    value: o.value,
    disabled: o.disabled
  }, o.label))), /*#__PURE__*/React.createElement("svg", {
    className: "tds-select__chevron",
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 4.5L6 7.5L9 4.5",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Select.tsx", error: String((e && e.message) || e) }); }

// components/Toggles.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const Checkbox = React.forwardRef(function Checkbox({
  label,
  indeterminate,
  className,
  ...rest
}, forwardedRef) {
  const innerRef = React.useRef(null);
  React.useImperativeHandle(forwardedRef, () => innerRef.current);
  React.useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return /*#__PURE__*/React.createElement("label", {
    className: __ds_scope.cx('tds-checkbox', className)
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: innerRef,
    type: "checkbox"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "tds-checkbox__box",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("svg", {
    className: "tds-checkbox__check",
    viewBox: "0 0 10 10",
    fill: "none"
  }, indeterminate ? /*#__PURE__*/React.createElement("path", {
    d: "M2 5h6",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M2 5l2 2 4-4",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
});
const Radio = React.forwardRef(function Radio({
  label,
  className,
  ...rest
}, ref) {
  return /*#__PURE__*/React.createElement("label", {
    className: __ds_scope.cx('tds-radio', className)
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: "radio"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "tds-radio__box",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("span", {
    className: "tds-radio__dot"
  })), label && /*#__PURE__*/React.createElement("span", null, label));
});
/** Switch — instant on/off. Use for settings (e.g. enable APN). */
const Switch = ({
  checked,
  defaultChecked,
  onChange,
  disabled,
  ...aria
}) => {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : internal;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-disabled": disabled || undefined,
    disabled: disabled,
    onClick: () => {
      if (disabled) return;
      if (!isControlled) setInternal(!value);
      onChange?.(!value);
    },
    className: __ds_scope.cx('tds-switch', value && 'tds-switch--on')
  }, aria));
};
Object.assign(__ds_scope, { Checkbox, Radio, Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Toggles.tsx", error: String((e && e.message) || e) }); }

// components/index.ts
try { (() => {

Object.assign(__ds_scope, { cx: __ds_scope.cx });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/index.ts", error: String((e && e.message) || e) }); }

// dark-mode/chrome.js
try { (() => {
// Dark Mode Delivery — shared chrome builder
// Renders sidebar + topbar inline. Each page sets window.__DM_PAGE = 'tokens' etc before this loads.

(function () {
  const PAGES = [{
    id: 'index',
    n: '00',
    label: 'Overview',
    href: 'index.html'
  }, {
    id: 'principles',
    n: '01',
    label: 'Principles',
    href: 'principles.html'
  }, {
    id: 'tokens',
    n: '02',
    label: 'Tokens',
    href: 'tokens.html'
  }, {
    id: 'components',
    n: '03',
    label: 'Components',
    href: 'components.html'
  }, {
    id: 'pages',
    n: '04',
    label: 'Pages',
    href: 'pages.html'
  }, {
    id: 'engineering',
    n: '05',
    label: 'Engineering',
    href: 'engineering.html'
  }, {
    id: 'qa',
    n: '06',
    label: 'QA Checklist',
    href: 'qa.html'
  }, {
    id: 'buttons',
    n: '07',
    label: 'Buttons',
    href: 'buttons.html'
  }, {
    id: 'cards',
    n: '08',
    label: 'Cards',
    href: 'cards.html'
  }];
  const RESOURCES = [{
    label: 'design-tokens.json',
    href: 'design-tokens.json',
    mono: true
  }, {
    label: 'tailwind.config.js',
    href: 'tailwind.config.js',
    mono: true
  }, {
    label: 'theme.css',
    href: 'theme.css',
    mono: true
  }];
  const current = window.__DM_PAGE || 'index';
  const crumbs = window.__DM_CRUMBS || ['Overview'];
  const ChevronRight = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`;
  const Search = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  const sideHTML = `
    <aside class="side">
      <div class="side__brand">
        <div class="side__mark">T</div>
        <div>
          <div class="side__name">TOMS Design System</div>
          <div class="side__sub">Dark Mode · v1.0</div>
        </div>
      </div>

      <div class="side__section">
        <p class="side__h">Delivery</p>
        ${PAGES.map(p => `
          <a class="side__link ${p.id === current ? 'side__link--active' : ''}" href="${p.href}">
            <span class="side__num">${p.n}</span>
            <span>${p.label}</span>
          </a>
        `).join('')}
      </div>

      <div class="side__section">
        <p class="side__h">Resources</p>
        ${RESOURCES.map(r => `
          <a class="side__link" href="${r.href}" target="_blank">
            <span class="side__num" style="font-size:11px;">↗</span>
            <span style="font-family: var(--font-mono); font-size: 12px;">${r.label}</span>
          </a>
        `).join('')}
      </div>

      <div style="margin-top:auto; padding: 10px 8px; border-top: 1px solid var(--color-border-subtle); font-family: var(--font-mono); font-size: 10.5px; color: var(--color-text-tertiary); letter-spacing: 0.04em;">
        TDS · DARK · OKLCH
      </div>
    </aside>
  `;
  const crumbsHTML = crumbs.map((c, i) => i === crumbs.length - 1 ? `<strong>${c}</strong>` : `<span>${c}</span>${ChevronRight}`).join('');
  const topHTML = `
    <header class="topbar">
      <div class="crumbs">
        <span>Dark Mode</span>${ChevronRight}${crumbsHTML}
      </div>
      <div class="tools">
        <div class="kbd">${Search}<span>Search</span><span style="opacity:0.6">⌘K</span></div>
        <div class="theme-toggle" role="radiogroup" aria-label="Theme">
          <button class="tt-btn" data-tt="light" aria-pressed="false" title="Light"><span class="tt-ico">☀</span><span>Light</span></button>
          <button class="tt-btn" data-tt="dark"  aria-pressed="true"  title="Dark"><span class="tt-ico">☾</span><span>Dark</span></button>
        </div>
      </div>
    </header>
  `;

  // Inject. Page must have <div id="app" class="app"></div>
  const root = document.getElementById('app');
  if (!root) return;
  root.insertAdjacentHTML('afterbegin', sideHTML);
  const main = document.createElement('div');
  main.className = 'main';
  main.innerHTML = topHTML + '<div id="page-slot"></div>';
  root.appendChild(main);

  // Move any pre-existing <main class="page"> contents into slot
  const placeholder = document.getElementById('page-content');
  if (placeholder) {
    document.getElementById('page-slot').appendChild(placeholder);
  }

  // ─── Theme toggle ─ single source of truth: <html data-theme> ───
  (function initTheme() {
    const root = document.documentElement;
    const KEY = 'tds-dm-theme';
    let cur = root.getAttribute('data-theme') || 'dark';
    try {
      const s = localStorage.getItem(KEY);
      if (s === 'light' || s === 'dark') cur = s;
    } catch (_) {}
    root.setAttribute('data-theme', cur);
    root.style.colorScheme = cur;
    const btns = document.querySelectorAll('.tt-btn');
    function sync() {
      const t = root.getAttribute('data-theme');
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tt === t)));
    }
    sync();
    btns.forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.tt;
      root.setAttribute('data-theme', t);
      root.style.colorScheme = t;
      try {
        localStorage.setItem(KEY, t);
      } catch (_) {}
      sync();
    }));
  })();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "dark-mode/chrome.js", error: String((e && e.message) || e) }); }

// dark-mode/tailwind.config.js
try { (() => {
/**
 * TOMS Design System · Tailwind preset (Dark + Light)
 * Drop-in: tailwind.config.{js,ts} → presets: [require('./dark-mode/tailwind.config')]
 *
 * All colours resolve via CSS variables (theme.css). Dark mode is class-based
 * to play nicely with next-themes (`<html class="dark">`).
 */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // shadcn semantic tokens
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'oklch(var(--card) / <alpha-value>)',
          foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
          foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
        },
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
        },
        success: 'oklch(var(--success) / <alpha-value>)',
        warning: 'oklch(var(--warning) / <alpha-value>)',
        info: 'oklch(var(--info) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        input: 'oklch(var(--input) / <alpha-value>)',
        ring: 'oklch(var(--ring) / <alpha-value>)',
        sidebar: {
          DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
          foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
          accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'oklch(var(--sidebar-border) / <alpha-value>)',
          ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
        },
        chart: {
          1: 'oklch(var(--chart-1) / <alpha-value>)',
          2: 'oklch(var(--chart-2) / <alpha-value>)',
          3: 'oklch(var(--chart-3) / <alpha-value>)',
          4: 'oklch(var(--chart-4) / <alpha-value>)',
          5: 'oklch(var(--chart-5) / <alpha-value>)',
          6: 'oklch(var(--chart-6) / <alpha-value>)',
          7: 'oklch(var(--chart-7) / <alpha-value>)',
          8: 'oklch(var(--chart-8) / <alpha-value>)'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        DEFAULT: 'var(--shadow-3)',
        sm: 'var(--shadow-2)',
        md: 'var(--shadow-3)',
        lg: 'var(--shadow-4)',
        xl: 'var(--shadow-5)',
        focus: 'var(--shadow-focus)'
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      transitionDuration: {
        instant: '80ms',
        fast: '120ms',
        DEFAULT: '180ms',
        slow: '320ms'
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.3, 0, 0, 1)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "dark-mode/tailwind.config.js", error: String((e && e.message) || e) }); }

// tokens/tailwind.preset.js
try { (() => {
/**
 * TOMS Design System — Tailwind v3+ preset
 *
 * Usage in tailwind.config.js:
 *   const tomsPreset = require('@toms/design-system/tokens/tailwind.preset');
 *   module.exports = { presets: [tomsPreset], content: [...] };
 *
 * All colors map to CSS variables so dark mode is automatic via [data-theme].
 */
const v = name => `var(--${name})`;
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          mono: v('color-brand-mono'),
          monoStrong: v('color-brand-mono-strong'),
          monoSoft: v('color-brand-mono-soft')
        },
        primary: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(k => [k, v(`color-primary-${k}`)])),
        secondary: {
          50: v('color-secondary-50'),
          100: v('color-secondary-100'),
          500: v('color-secondary-500'),
          700: v('color-secondary-700'),
          900: v('color-secondary-900')
        },
        success: {
          DEFAULT: v('color-success-500'),
          bg: v('color-success-50'),
          strong: v('color-success-700')
        },
        warning: {
          DEFAULT: v('color-warning-500'),
          bg: v('color-warning-50'),
          strong: v('color-warning-700')
        },
        error: {
          DEFAULT: v('color-error-500'),
          bg: v('color-error-50'),
          strong: v('color-error-700')
        },
        info: {
          DEFAULT: v('color-info-500'),
          bg: v('color-info-50'),
          strong: v('color-info-700')
        },
        bg: {
          1: v('color-bg-1'),
          2: v('color-bg-2'),
          3: v('color-bg-3'),
          hover: v('color-bg-hover'),
          active: v('color-bg-active'),
          overlay: v('color-bg-overlay')
        },
        text: {
          primary: v('color-text-primary'),
          secondary: v('color-text-secondary'),
          tertiary: v('color-text-tertiary'),
          disabled: v('color-text-disabled'),
          inverse: v('color-text-inverse'),
          onPrimary: v('color-text-on-primary')
        },
        border: {
          subtle: v('color-border-subtle'),
          DEFAULT: v('color-border-default'),
          strong: v('color-border-strong'),
          focus: v('color-border-focus')
        }
      },
      fontFamily: {
        sans: v('font-family-sans').split(','),
        mono: v('font-family-mono').split(',')
      },
      fontSize: {
        xs: v('font-size-xs'),
        sm: v('font-size-sm'),
        md: v('font-size-md'),
        lg: v('font-size-lg'),
        xl: v('font-size-xl'),
        '2xl': v('font-size-2xl'),
        '3xl': v('font-size-3xl'),
        '4xl': v('font-size-4xl'),
        '5xl': v('font-size-5xl')
      },
      spacing: {
        0: v('space-0'),
        1: v('space-1'),
        2: v('space-2'),
        3: v('space-3'),
        4: v('space-4'),
        5: v('space-5'),
        6: v('space-6'),
        8: v('space-8'),
        10: v('space-10'),
        12: v('space-12'),
        16: v('space-16'),
        20: v('space-20')
      },
      borderRadius: {
        none: v('radius-none'),
        sm: v('radius-sm'),
        md: v('radius-md'),
        lg: v('radius-lg'),
        xl: v('radius-xl'),
        '2xl': v('radius-2xl'),
        full: v('radius-full')
      },
      boxShadow: {
        1: v('shadow-1'),
        2: v('shadow-2'),
        3: v('shadow-3'),
        4: v('shadow-4'),
        5: v('shadow-5'),
        cta: v('shadow-cta'),
        focus: v('shadow-focus')
      },
      zIndex: {
        dropdown: v('z-dropdown'),
        sticky: v('z-sticky'),
        overlay: v('z-overlay'),
        modal: v('z-modal'),
        popover: v('z-popover'),
        tooltip: v('z-tooltip'),
        toast: v('z-toast')
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.3, 0, 0, 1)'
      },
      transitionDuration: {
        instant: '80ms',
        fast: '120ms',
        normal: '200ms',
        slow: '320ms'
      }
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "tokens/tailwind.preset.js", error: String((e && e.message) || e) }); }

// ui_kits/component-showcase/components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* eslint-disable */
/* Babel-loaded mirror of design-system/components/*.tsx
   Same logic, types stripped. Used by the showcase only — production
   code consumes the .tsx files via a normal build. */

const cx = (...a) => a.filter(Boolean).join(' ');

/* ─── Button ───────────────────────────── */
const Button = React.forwardRef(function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  block,
  iconLeft,
  iconRight,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}, ref) {
  const isDisabled = disabled || loading;
  return /*#__PURE__*/React.createElement("button", _extends({
    ref: ref,
    type: type,
    disabled: isDisabled,
    "aria-busy": loading || undefined,
    className: cx('tds-btn', `tds-btn--${variant}`, `tds-btn--${size}`, block && 'tds-btn--block', className)
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "tds-btn__spinner",
    "aria-hidden": true
  }) : iconLeft, children, iconRight);
});

/* ─── Input ────────────────────────────── */
const Input = React.forwardRef(function Input({
  size = 'md',
  invalid,
  prefix,
  suffix,
  disabled,
  wrapperClassName,
  className,
  ...rest
}, ref) {
  return /*#__PURE__*/React.createElement("div", {
    className: cx('tds-input', `tds-input--${size}`, invalid && 'tds-input--invalid', disabled && 'tds-input--disabled', wrapperClassName)
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "tds-input__addon tds-input__addon--prefix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    className: cx('tds-input__el', className)
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "tds-input__addon tds-input__addon--suffix"
  }, suffix));
});

/* ─── Select ───────────────────────────── */
const Select = ({
  size = 'md',
  invalid,
  options,
  value,
  placeholder,
  onChange,
  disabled,
  className,
  ...rest
}) => /*#__PURE__*/React.createElement("div", {
  className: cx('tds-select', `tds-select--${size}`, invalid && 'tds-select--invalid', disabled && 'tds-select--disabled', className)
}, /*#__PURE__*/React.createElement("select", _extends({
  value: value,
  disabled: disabled,
  onChange: e => onChange?.(e.target.value)
}, rest), placeholder && /*#__PURE__*/React.createElement("option", {
  value: "",
  disabled: true,
  hidden: true
}, placeholder), options.map(o => /*#__PURE__*/React.createElement("option", {
  key: o.value,
  value: o.value,
  disabled: o.disabled
}, o.label))), /*#__PURE__*/React.createElement("svg", {
  className: "tds-select__chevron",
  width: "12",
  height: "12",
  viewBox: "0 0 12 12",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 4.5L6 7.5L9 4.5",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round"
})));

/* ─── Checkbox / Radio / Switch ───────── */
const Checkbox = React.forwardRef(function Checkbox({
  label,
  indeterminate,
  className,
  ...rest
}, fwd) {
  const r = React.useRef(null);
  React.useImperativeHandle(fwd, () => r.current);
  React.useEffect(() => {
    if (r.current) r.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return /*#__PURE__*/React.createElement("label", {
    className: cx('tds-checkbox', className)
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: r,
    type: "checkbox"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "tds-checkbox__box",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("svg", {
    className: "tds-checkbox__check",
    viewBox: "0 0 10 10",
    fill: "none"
  }, indeterminate ? /*#__PURE__*/React.createElement("path", {
    d: "M2 5h6",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M2 5l2 2 4-4",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
});
const Radio = ({
  label,
  className,
  ...rest
}) => /*#__PURE__*/React.createElement("label", {
  className: cx('tds-radio', className)
}, /*#__PURE__*/React.createElement("input", _extends({
  type: "radio"
}, rest)), /*#__PURE__*/React.createElement("span", {
  className: "tds-radio__box",
  "aria-hidden": true
}, /*#__PURE__*/React.createElement("span", {
  className: "tds-radio__dot"
})), label && /*#__PURE__*/React.createElement("span", null, label));
const Switch = ({
  checked,
  defaultChecked,
  onChange,
  disabled,
  ...aria
}) => {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : internal;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": value,
    disabled: disabled,
    className: cx('tds-switch', value && 'tds-switch--on'),
    onClick: () => {
      if (disabled) return;
      if (!isControlled) setInternal(!value);
      onChange?.(!value);
    }
  }, aria));
};

/* ─── Field ─────────────────────────────── */
const Field = ({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: cx('tds-field', className)
}, label && /*#__PURE__*/React.createElement("label", {
  htmlFor: htmlFor,
  className: cx('tds-field__label', required && 'tds-field__label--required')
}, label), children, error ? /*#__PURE__*/React.createElement("div", {
  className: "tds-field__error",
  role: "alert"
}, error) : hint ? /*#__PURE__*/React.createElement("div", {
  className: "tds-field__hint"
}, hint) : null);

/* ─── Card / Badge ─────────────────────── */
const Card = ({
  title,
  actions,
  footer,
  flush,
  className,
  children,
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  className: cx('tds-card', className)
}, rest), (title || actions) && /*#__PURE__*/React.createElement("div", {
  className: "tds-card__header"
}, /*#__PURE__*/React.createElement("div", {
  className: "tds-card__title"
}, title), actions && /*#__PURE__*/React.createElement("div", null, actions)), /*#__PURE__*/React.createElement("div", {
  className: "tds-card__body",
  style: flush ? {
    padding: 0
  } : undefined
}, children), footer && /*#__PURE__*/React.createElement("div", {
  className: "tds-card__footer"
}, footer));
const Badge = ({
  tone = 'neutral',
  className,
  ...rest
}) => /*#__PURE__*/React.createElement("span", _extends({
  className: cx('tds-badge', `tds-badge--${tone}`, className)
}, rest));

/* ─── Tabs / Pagination / Table ────────── */
const Tabs = ({
  items,
  value,
  onChange,
  className
}) => /*#__PURE__*/React.createElement("div", {
  role: "tablist",
  className: cx('tds-tabs', className)
}, items.map(it => /*#__PURE__*/React.createElement("button", {
  key: it.key,
  role: "tab",
  "aria-selected": value === it.key,
  disabled: it.disabled,
  className: cx('tds-tab', value === it.key && 'tds-tab--active'),
  onClick: () => onChange(it.key)
}, it.label)));
const Pagination = ({
  page,
  pageCount,
  onChange,
  siblingCount = 1
}) => {
  const pages = [];
  const start = Math.max(2, page - siblingCount);
  const end = Math.min(pageCount - 1, page + siblingCount);
  pages.push(1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < pageCount - 1) pages.push('…');
  if (pageCount > 1) pages.push(pageCount);
  return /*#__PURE__*/React.createElement("nav", {
    className: "tds-pagination",
    "aria-label": "Pagination"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tds-pagination__page",
    disabled: page <= 1,
    onClick: () => onChange(page - 1)
  }, "\u2039"), pages.map((p, i) => p === '…' ? /*#__PURE__*/React.createElement("span", {
    key: `e${i}`,
    className: "tds-pagination__page",
    "aria-hidden": true
  }, "\u2026") : /*#__PURE__*/React.createElement("button", {
    key: p,
    className: cx('tds-pagination__page', p === page && 'tds-pagination__page--active'),
    onClick: () => onChange(p)
  }, p)), /*#__PURE__*/React.createElement("button", {
    className: "tds-pagination__page",
    disabled: page >= pageCount,
    onClick: () => onChange(page + 1)
  }, "\u203A"));
};
const Table = ({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  empty = 'No data'
}) => {
  const handleSort = col => {
    if (!col.sortable || !onSortChange) return;
    if (!sort || sort.key !== col.key) onSortChange({
      key: col.key,
      dir: 'asc'
    });else if (sort.dir === 'asc') onSortChange({
      key: col.key,
      dir: 'desc'
    });else onSortChange(null);
  };
  return /*#__PURE__*/React.createElement("table", {
    className: "tds-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      width: c.width,
      textAlign: c.align ?? 'left'
    }
  }, c.sortable ? /*#__PURE__*/React.createElement("span", {
    className: "tds-table__sort",
    onClick: () => handleSort(c)
  }, c.title, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: sort?.key === c.key ? 1 : 0.3
    }
  }, sort?.key === c.key && sort.dir === 'desc' ? '▼' : '▲')) : c.title)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      textAlign: 'center',
      padding: 32,
      color: 'var(--color-text-tertiary)'
    }
  }, empty)) : rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: rowKey(r, i)
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align ?? 'left'
    }
  }, c.render ? c.render(r) : c.field != null ? String(r[c.field] ?? '') : null))))));
};

/* ─── Modal / Toast / Tooltip ──────────── */
const Modal = ({
  open,
  onClose,
  title,
  footer,
  width = 480,
  closeOnOverlay = true,
  children
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "tds-modal-overlay",
    onClick: () => closeOnOverlay && onClose(),
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tds-modal",
    style: {
      maxWidth: width
    },
    onClick: e => e.stopPropagation()
  }, title && /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__title"
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    className: "tds-btn tds-btn--ghost tds-btn--sm",
    style: {
      height: 28,
      width: 28,
      padding: 0
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "tds-modal__footer"
  }, footer)));
};
const ToastContext = React.createContext(null);
const useToast = () => React.useContext(ToastContext);
const ToastProvider = ({
  children
}) => {
  const [items, setItems] = React.useState([]);
  const dismiss = React.useCallback(id => setItems(xs => xs.filter(x => x.id !== id)), []);
  const push = React.useCallback(t => {
    const id = t.id ?? Math.random().toString(36).slice(2);
    const tone = t.tone ?? 'info';
    setItems(xs => [...xs, {
      ...t,
      id,
      tone
    }]);
    const dur = t.duration ?? 3500;
    if (dur > 0) setTimeout(() => dismiss(id), dur);
    return id;
  }, [dismiss]);
  const glyph = t => t === 'success' ? '✓' : t === 'error' ? '✕' : t === 'warning' ? '!' : 'i';
  return /*#__PURE__*/React.createElement(ToastContext.Provider, {
    value: {
      push,
      dismiss
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    className: "tds-toast-stack",
    role: "region",
    "aria-label": "Notifications"
  }, items.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: cx('tds-toast', `tds-toast--${t.tone}`),
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tds-toast__icon",
    "aria-hidden": true
  }, glyph(t.tone)), /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__body"
  }, t.title && /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__title"
  }, t.title), t.message && /*#__PURE__*/React.createElement("div", {
    className: "tds-toast__msg"
  }, t.message))))));
};
const Tooltip = ({
  content,
  side = 'top',
  delay = 200,
  children
}) => {
  const [visible, setVisible] = React.useState(false);
  const [pos, setPos] = React.useState({
    top: 0,
    left: 0
  });
  const anchorRef = React.useRef(null);
  const timer = React.useRef();
  const measure = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const off = 6;
    let top = r.top,
      left = r.left + r.width / 2;
    if (side === 'top') top = r.top - off;
    if (side === 'bottom') top = r.bottom + off;
    if (side === 'left') {
      top = r.top + r.height / 2;
      left = r.left - off;
    }
    if (side === 'right') {
      top = r.top + r.height / 2;
      left = r.right + off;
    }
    setPos({
      top,
      left
    });
  };
  const show = () => {
    timer.current = setTimeout(() => {
      measure();
      setVisible(true);
    }, delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setVisible(false);
  };
  const transform = side === 'top' ? 'translate(-50%, -100%)' : side === 'bottom' ? 'translate(-50%, 0)' : side === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
  return /*#__PURE__*/React.createElement(React.Fragment, null, React.cloneElement(children, {
    ref: n => {
      anchorRef.current = n;
    },
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide
  }), visible && /*#__PURE__*/React.createElement("div", {
    className: "tds-tooltip",
    style: {
      top: pos.top,
      left: pos.left,
      transform
    },
    role: "tooltip"
  }, content));
};
Object.assign(window, {
  cx,
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  Switch,
  Field,
  Card,
  Badge,
  Tabs,
  Pagination,
  Table,
  Modal,
  ToastContext,
  ToastProvider,
  useToast,
  Tooltip
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/component-showcase/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/app.jsx
try { (() => {
/* global React, ReactDOM, Sidebar, Header, OverviewTab, BasicTab, AppsTab, SettingsTab, RemoteTab, FilesTab, CmdK, DesignCanvas, DCSection, DCArtboard, TweaksPanel, useTweaks, TweakSection, TweakRadio */

const {
  useState,
  useEffect
} = React;

// A standalone artboard that contains the full Terminal Detail UI, locked to a tab.
function TerminalDetail({
  initialTab = "overview",
  themeOverride,
  showCmdK
}) {
  const [tab, setTab] = useState(initialTab);
  const [cmd, setCmd] = useState(!!showCmdK);
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd(c => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const Body = tab === "overview" ? OverviewTab : tab === "basic" ? BasicTab : tab === "apps" ? AppsTab : tab === "settings" ? SettingsTab : tab === "remote" ? RemoteTab : tab === "files" ? FilesTab : OverviewTab;
  return /*#__PURE__*/React.createElement("div", {
    className: `tm-root theme-${themeOverride || "light"}`,
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: "terminals"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      background: "var(--bg-app)"
    }
  }, /*#__PURE__*/React.createElement(Header, {
    tab: tab,
    setTab: setTab,
    onCmdK: () => setCmd(true)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement(Body, null)))), /*#__PURE__*/React.createElement(CmdK, {
    open: cmd,
    onClose: () => setCmd(false)
  }));
}

// ─── Tweaks ─────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light"
} /*EDITMODE-END*/;
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme to <body> for any chrome outside artboards
  useEffect(() => {
    document.body.classList.toggle("theme-dark", tweaks.theme === "dark");
    document.body.classList.toggle("theme-light", tweaks.theme !== "dark");
  }, [tweaks.theme]);
  const W = 1440,
    H = 900;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DesignCanvas, {
    title: "TOMS \xB7 Terminal Manager",
    subtitle: "Terminal Detail \xB7 2026 \xB7 Light + Dark \xB7 Cmd+K"
  }, /*#__PURE__*/React.createElement(DCSection, {
    id: "primary",
    title: "Terminal Detail",
    subtitle: "Six tabs covering the full spec \u2014 switchable inside each artboard"
  }, /*#__PURE__*/React.createElement(DCArtboard, {
    id: "overview",
    label: "A \xB7 Overview \xB7 Real-time monitoring",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "overview",
    themeOverride: tweaks.theme
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "basic",
    label: "B \xB7 Basic Info \xB7 Hardware & compliance",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "basic",
    themeOverride: tweaks.theme
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "apps",
    label: "C \xB7 App & Firmware \xB7 OTA + matrix",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "apps",
    themeOverride: tweaks.theme
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "settings",
    label: "D \xB7 Settings \xB7 Remote policy",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "settings",
    themeOverride: tweaks.theme
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "remote",
    label: "E \xB7 Remote Assistance \xB7 Diagnostics",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "remote",
    themeOverride: tweaks.theme
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "files",
    label: "F \xB7 Files \xB7 Task center",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "files",
    themeOverride: tweaks.theme
  }))), /*#__PURE__*/React.createElement(DCSection, {
    id: "overlays",
    title: "Overlays",
    subtitle: "Cmd+K command palette \xB7 always available with \u2318K"
  }, /*#__PURE__*/React.createElement(DCArtboard, {
    id: "cmdk",
    label: "G \xB7 Command Palette \xB7 \u2318K",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "overview",
    themeOverride: tweaks.theme,
    showCmdK: true
  })), /*#__PURE__*/React.createElement(DCArtboard, {
    id: "dark",
    label: "H \xB7 Dark mode \xB7 Overview",
    width: W,
    height: H
  }, /*#__PURE__*/React.createElement(TerminalDetail, {
    initialTab: "overview",
    themeOverride: "dark"
  })))), /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Tweaks"
  }, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Theme"
  }, /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Mode",
    value: tweaks.theme,
    onChange: v => setTweak("theme", v),
    options: [{
      value: "light",
      label: "Light"
    }, {
      value: "dark",
      label: "Dark"
    }]
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "var(--tw-text-muted, #888)",
      margin: "8px 0 0",
      lineHeight: 1.5
    }
  }, "Artboard H always renders dark for comparison.", /*#__PURE__*/React.createElement("br", null), "Press ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "\u2318K"), " in any artboard to open the palette."))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/charts.jsx
try { (() => {
/* global React */
// ─────────────────────────────────────────────────────────────
// TOMS — Charts (real SVG charts, restrained styling)
// Sparkline · Area · Bar · Heatmap · Donut · Battery curve
// ─────────────────────────────────────────────────────────────

const {
  useMemo: useChartMemo
} = React;

// Deterministic pseudo-random (so layouts are stable across renders)
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function Sparkline({
  data,
  w = 90,
  h = 26,
  stroke = "var(--accent-600)",
  fill
}) {
  const min = Math.min(...data),
    max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * (w - 2) + 1;
    const y = h - 2 - (v - min) / span * (h - 4);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = `${path} L ${(w - 1).toFixed(1)},${h - 1} L 1,${h - 1} Z`;
  return /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: h,
    style: {
      display: "block"
    }
  }, fill && /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: fill
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: stroke,
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }));
}
function AreaChart({
  data,
  w = 580,
  h = 140,
  color = "var(--accent-600)",
  fill = "var(--accent-100)"
}) {
  const padL = 28,
    padR = 8,
    padT = 10,
    padB = 22;
  const min = 0,
    max = Math.max(...data) * 1.1;
  const innerW = w - padL - padR,
    innerH = h - padT - padB;
  const pts = data.map((v, i) => {
    const x = padL + i / (data.length - 1) * innerW;
    const y = padT + innerH - (v - min) / (max - min || 1) * innerH;
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)},${padT + innerH} L ${pts[0][0].toFixed(1)},${padT + innerH} Z`;
  const ticks = [0, 0.5, 1].map(p => padT + innerH - p * innerH);
  return /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: h,
    viewBox: `0 0 ${w} ${h}`,
    style: {
      display: "block"
    }
  }, ticks.map((y, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: padL,
    x2: w - padR,
    y1: y,
    y2: y,
    stroke: "var(--border-subtle)",
    strokeDasharray: "2 3"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: fill,
    opacity: "0.7"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: pts[pts.length - 1][0],
    cy: pts[pts.length - 1][1],
    r: "3",
    fill: color
  }), /*#__PURE__*/React.createElement("circle", {
    cx: pts[pts.length - 1][0],
    cy: pts[pts.length - 1][1],
    r: "6",
    fill: color,
    opacity: "0.18"
  }), [0, 0.5, 1].map((p, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: padL - 6,
    y: padT + innerH - p * innerH + 3,
    textAnchor: "end",
    fontSize: "9.5",
    fill: "var(--fg-quaternary)",
    fontFamily: "var(--font-mono)"
  }, Math.round(max * p))), ["00", "06", "12", "18", "24"].map((l, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: padL + i / 4 * innerW,
    y: h - 6,
    textAnchor: "middle",
    fontSize: "9.5",
    fill: "var(--fg-quaternary)",
    fontFamily: "var(--font-mono)"
  }, l, ":00")));
}
function BarPair({
  data,
  w = 580,
  h = 160
}) {
  // data: [{label, app, device}]
  const padL = 32,
    padR = 8,
    padT = 8,
    padB = 28;
  const innerW = w - padL - padR,
    innerH = h - padT - padB;
  const max = Math.max(...data.flatMap(d => [d.app, d.device])) * 1.15;
  const groupW = innerW / data.length;
  return /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: h,
    viewBox: `0 0 ${w} ${h}`,
    style: {
      display: "block"
    }
  }, [0, 0.5, 1].map((p, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: padL,
    x2: w - padR,
    y1: padT + innerH - p * innerH,
    y2: padT + innerH - p * innerH,
    stroke: "var(--border-subtle)",
    strokeDasharray: "2 3"
  })), data.map((d, i) => {
    const cx = padL + i * groupW + groupW / 2;
    const bw = Math.min(14, groupW * 0.35);
    const ha = d.app / max * innerH;
    const hd = d.device / max * innerH;
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: cx - bw - 1,
      y: padT + innerH - ha,
      width: bw,
      height: ha,
      fill: "var(--accent-500)",
      rx: "2"
    }), /*#__PURE__*/React.createElement("rect", {
      x: cx + 1,
      y: padT + innerH - hd,
      width: bw,
      height: hd,
      fill: "var(--bg-active)",
      stroke: "var(--border-strong)",
      rx: "2"
    }), /*#__PURE__*/React.createElement("text", {
      x: cx,
      y: h - 10,
      textAnchor: "middle",
      fontSize: "9.5",
      fill: "var(--fg-tertiary)",
      fontFamily: "var(--font-mono)"
    }, d.label));
  }), [0, 0.5, 1].map((p, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: padL - 6,
    y: padT + innerH - p * innerH + 3,
    textAnchor: "end",
    fontSize: "9.5",
    fill: "var(--fg-quaternary)",
    fontFamily: "var(--font-mono)"
  }, Math.round(max * p), "h")));
}
function HBar({
  label,
  real,
  predict,
  max
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      padding: "6px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontWeight: 450
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--fg-tertiary)",
      fontSize: 11
    }
  }, real, "MB ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-quaternary)"
    }
  }, "/ ", predict, "MB"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 6,
      background: "var(--bg-sunken)",
      borderRadius: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: `${predict / max * 100}%`,
      background: "var(--bg-active)",
      borderRadius: 3,
      borderRight: "1px dashed var(--border-strong)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      height: "100%",
      width: `${real / max * 100}%`,
      background: "var(--accent-600)",
      borderRadius: 3
    }
  })));
}
function Heatmap({
  data,
  w = 7,
  h = 5
}) {
  // data is w*h cells with 0..1 values
  const cell = 16,
    gap = 3;
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const wks = ["W1", "W2", "W3", "W4", "W5"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: gap,
      paddingTop: 18
    }
  }, wks.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: cell,
      display: "flex",
      alignItems: "center",
      fontSize: 10,
      color: "var(--fg-quaternary)",
      fontFamily: "var(--font-mono)"
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: gap
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: gap
    }
  }, days.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: cell,
      textAlign: "center",
      fontSize: 10,
      color: "var(--fg-quaternary)",
      fontFamily: "var(--font-mono)"
    }
  }, d))), Array.from({
    length: h
  }).map((_, r) => /*#__PURE__*/React.createElement("div", {
    key: r,
    style: {
      display: "flex",
      gap: gap
    }
  }, Array.from({
    length: w
  }).map((_, c) => {
    const v = data[r * w + c] ?? 0;
    return /*#__PURE__*/React.createElement("div", {
      key: c,
      style: {
        width: cell,
        height: cell,
        borderRadius: 3,
        background: v === 0 ? "var(--bg-sunken)" : `oklch(${100 - v * 35}% ${0.04 + v * 0.18} 278)`,
        border: "1px solid var(--border-subtle)"
      }
    });
  })))));
}
function Donut({
  value,
  size = 76,
  stroke = 8,
  color = "var(--accent-600)",
  track = "var(--bg-active)"
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: track,
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: `${value / 100 * c} ${c}`,
    transform: `rotate(-90 ${size / 2} ${size / 2})`
  }), /*#__PURE__*/React.createElement("text", {
    x: size / 2,
    y: size / 2 + 4,
    textAnchor: "middle",
    fontSize: "14",
    fontFamily: "var(--font-mono)",
    fontWeight: "500",
    fill: "var(--fg-primary)"
  }, value, "%"));
}
function StackedBar({
  segments,
  h = 8
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: h,
      borderRadius: 4,
      overflow: "hidden",
      background: "var(--bg-sunken)"
    }
  }, segments.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    title: `${s.label}: ${s.value}`,
    style: {
      width: `${s.value / total * 100}%`,
      background: s.color
    }
  })));
}
window.TomsCharts = {
  Sparkline,
  AreaChart,
  BarPair,
  HBar,
  Heatmap,
  Donut,
  StackedBar,
  rng
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/charts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/cmdk.jsx
try { (() => {
/* global React, Ico, Pill */
// Command Palette — Cmd+K

function CmdK({
  open,
  onClose
}) {
  const [q, setQ] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      setQ("");
      setIdx(0);
    }
  }, [open]);
  if (!open) return null;
  const sections = [{
    title: "✦ AI suggestions",
    ai: true,
    items: [{
      i: "sparkle",
      l: `Show terminals with battery cycles > 300`,
      t: "Smart filter",
      k: "AI"
    }, {
      i: "sparkle",
      l: `Push v4.3.0 to MTL Store #4 tonight at 02:00`,
      t: "Schedule",
      k: "AI"
    }, {
      i: "sparkle",
      l: `Why is NL750-K9F2H7B3 using more cellular data?`,
      t: "Diagnose",
      k: "AI"
    }]
  }, {
    title: "Jump to",
    items: [{
      i: "device",
      l: "NL750-K9F2H7B3",
      t: "Terminal · Acme Coffee",
      k: "↵"
    }, {
      i: "device",
      l: "NL750-J8M3K2A1",
      t: "Terminal · Acme Coffee · TOR #1",
      k: ""
    }, {
      i: "store",
      l: "Acme Coffee — MTL Store #4",
      t: "Merchant",
      k: ""
    }, {
      i: "card",
      l: "ORD-2026-04-088421",
      t: "Order · CAD $4.85",
      k: ""
    }, {
      i: "ticket",
      l: "TICKET-1182 — Printer jam",
      t: "Ticket · open",
      k: ""
    }]
  }, {
    title: "Actions on this terminal",
    items: [{
      i: "refresh",
      l: "Refresh snapshot",
      t: "Pull latest data from device",
      k: "R"
    }, {
      i: "log",
      l: "Tail real-time log",
      t: "Stream journalctl",
      k: "L"
    }, {
      i: "flash",
      l: "Push firmware update",
      t: "v4.3.0 differential",
      k: ""
    }, {
      i: "lock",
      l: "Lock screen",
      t: "Remote lock with offline code",
      k: ""
    }, {
      i: "power",
      l: "Restart terminal",
      t: "Graceful · ~45s",
      k: "⇧R"
    }, {
      i: "trash",
      l: "Mark as lost",
      t: "Initiate remote lock + alert",
      k: "",
      danger: true
    }]
  }, {
    title: "Create",
    items: [{
      i: "plus",
      l: "New deployment",
      t: "Push apps to many terminals"
    }, {
      i: "plus",
      l: "New ticket",
      t: "From this terminal"
    }, {
      i: "plus",
      l: "New extract task",
      t: "Pull files from device"
    }]
  }];
  const flat = sections.flatMap(s => s.items.map(it => ({
    ...it,
    _section: s.title
  })));
  const filtered = q ? flat.filter(it => (it.l + " " + it.t).toLowerCase().includes(q.toLowerCase())) : flat;
  const onKey = e => {
    if (e.key === "Escape") onClose();else if (e.key === "ArrowDown") {
      setIdx(i => Math.min(filtered.length - 1, i + 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setIdx(i => Math.max(0, i - 1));
      e.preventDefault();
    } else if (e.key === "Enter") {
      onClose();
    }
  };
  let counter = -1;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 100,
      background: "oklch(15% 0.005 270 / 0.32)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      paddingTop: 80,
      backdropFilter: "blur(2px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 580,
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: 12,
      boxShadow: "var(--shadow-lg)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      maxHeight: "70%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "search",
    size: 15,
    style: {
      color: "var(--fg-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setIdx(0);
    },
    onKeyDown: onKey,
    placeholder: "Search terminals, merchants, tickets\u2026 or run a command",
    style: {
      flex: 1,
      border: 0,
      outline: 0,
      background: "transparent",
      fontSize: 14,
      color: "var(--fg-primary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10.5,
      color: "var(--fg-quaternary)",
      padding: "2px 6px",
      border: "1px solid var(--border-subtle)",
      borderRadius: 4
    }
  }, "esc")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "auto",
      flex: 1,
      padding: "4px 4px 8px"
    }
  }, sections.map(s => {
    const items = s.items.filter(it => (it.l + " " + it.t).toLowerCase().includes(q.toLowerCase()));
    if (items.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: s.title,
      style: {
        padding: "6px 4px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 12px 4px",
        fontSize: 10.5,
        fontWeight: 500,
        color: s.ai ? "var(--accent-700)" : "var(--fg-quaternary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em"
      }
    }, s.title), items.map((it, i) => {
      counter++;
      const active = counter === idx;
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onMouseEnter: () => setIdx(counter),
        onClick: onClose,
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "7px 12px",
          borderRadius: 7,
          textAlign: "left",
          background: active ? "var(--bg-active)" : "transparent"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 6,
          flexShrink: 0,
          background: s.ai ? "var(--accent-100)" : it.danger ? "var(--danger-bg)" : "var(--bg-sunken)",
          color: s.ai ? "var(--accent-700)" : it.danger ? "var(--danger)" : "var(--fg-secondary)",
          display: "grid",
          placeItems: "center"
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        name: it.i,
        size: 13
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 450,
          color: it.danger ? "var(--danger)" : "var(--fg-primary)"
        },
        className: "tm-truncate"
      }, it.l), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--fg-tertiary)"
        },
        className: "tm-truncate"
      }, it.t)), it.k && /*#__PURE__*/React.createElement("span", {
        className: "mono",
        style: {
          fontSize: 10.5,
          color: "var(--fg-quaternary)",
          padding: "1px 6px",
          border: "1px solid var(--border-subtle)",
          borderRadius: 4
        }
      }, it.k));
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 14px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--bg-sunken)",
      fontSize: 10.5,
      color: "var(--fg-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "\u2191\u2193"), " navigate"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "\u21B5"), " open"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "\u2318+\u21B5"), " open in new pane"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "sparkle",
    size: 11,
    style: {
      color: "var(--accent-700)"
    }
  }), "AI suggestions ranked by relevance"))));
}
window.CmdK = CmdK;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/cmdk.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), labels/titles are inline-editable,
// and any artboard can be opened in a fullscreen focus overlay (←/→/Esc).
// State persists to a .design-canvas.state.json sidecar via the host
// bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}', '.dc-card{transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px}', '.dc-grip{cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{cursor:pointer;border-radius:4px;padding:3px 6px;display:flex;align-items:center;transition:background .12s}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-expand{position:absolute;bottom:100%;right:0;margin-bottom:5px;z-index:2;opacity:0;transition:opacity .12s,background .12s;', '  width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center}', '.dc-expand:hover{background:rgba(0,0,0,.06);color:#2a251f}', '[data-dc-slot]:hover .dc-expand{opacity:1}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, focused
// artboard). Order/titles/labels persist to a .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const srcIds = [];
    React.Children.forEach(sec.props.children, ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (!aid) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if (e.ctrlKey) {
        // trackpad pinch (or explicit ctrl+wheel)
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const srcOrder = artboards.map(a => a.props.id ?? a.props.label);
  const sec = ctx && sid && ctx.section(sid) || {};
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 80,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px 56px'
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow",
    style: {
      position: 'absolute',
      bottom: '100%',
      left: -4,
      marginBottom: 4,
      color: DC.label
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    onPointerDown: e => e.stopPropagation(),
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    const ns = sectionOrder[(secIdx + d + sectionOrder.length) % sectionOrder.length];
    const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
    if (first) ctx.setFocus(`${ns}/${first}`);
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/design-canvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/shell.jsx
try { (() => {
/* global React */
// ─────────────────────────────────────────────────────────────
// TOMS Terminal Manager — Shell components
// Sidebar · Header · Tabs · Action menu · Icons · Primitives
// ─────────────────────────────────────────────────────────────

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

// ─── Icons (1.5px stroke, original geometric set) ───────────
const Icon = ({
  d,
  size = 16,
  stroke = 1.5,
  fill = "none",
  style
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: fill,
  stroke: "currentColor",
  strokeWidth: stroke,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: style
}, typeof d === "string" ? /*#__PURE__*/React.createElement("path", {
  d: d
}) : d);
const I = {
  home: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 11l8-7 8 7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 10v9h12v-9"
  })),
  grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "4",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "13",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "13",
    width: "7",
    height: "7",
    rx: "1"
  })),
  device: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "3",
    width: "12",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "17.5",
    r: "0.6",
    fill: "currentColor"
  })),
  store: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l1.5-5h15L21 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 9v11h14V9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 20v-5h6v5"
  })),
  card: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "6",
    width: "18",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18"
  })),
  ticket: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 6v12"
  })),
  settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
  })),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 20-3.5-3.5"
  })),
  bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 21a2 2 0 0 0 4 0"
  })),
  more: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1.2",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1.2",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1.2",
    fill: "currentColor"
  })),
  chevd: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })),
  chevr: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m9 6 6 6-6 6"
  })),
  chevl: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m15 6-6 6 6 6"
  })),
  plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  check: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m4.5 12.5 5 5 10-11"
  })),
  x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6 6 18"
  })),
  external: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 4h6v6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 4 10 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"
  })),
  download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 4v12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m7 11 5 5 5-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 20h14"
  })),
  upload: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 20V8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m7 13 5-5 5 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 4h14"
  })),
  refresh: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 0 1 15.5-6.3L21 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 4v4h-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 1-15.5 6.3L3 16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 20v-4h4"
  })),
  power: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 4v9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.5 9a8 8 0 1 0 13 0"
  })),
  lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V8a4 4 0 0 1 8 0v3"
  })),
  wifi: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2 9a16 16 0 0 1 20 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5a11 11 0 0 1 14 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 16a6 6 0 0 1 7 0"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "19",
    r: "0.8",
    fill: "currentColor"
  })),
  signal: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 18h2v3H3z",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14h2v7H8z",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 9h2v12h-2z",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 4h2v17h-2z",
    fill: "currentColor",
    opacity: "0.3"
  })),
  battery: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "8",
    width: "18",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 11v3"
  })),
  pin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.5"
  })),
  cpu: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "6",
    width: "12",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "6",
    height: "6",
    rx: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"
  })),
  hdd: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "18",
    height: "6",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 14V8l3-4h8l3 4v6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "17",
    r: "0.8",
    fill: "currentColor"
  })),
  mod: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "4",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "13",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 16.5h7M16.5 13v7"
  })),
  doc: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3v5h5"
  })),
  log: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h14v16H5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 9h8M8 13h8M8 17h5"
  })),
  diag: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 12h4l2-7 4 14 2-7h6"
  })),
  flash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m13 3-9 12h7l-1 6 9-12h-7z"
  })),
  app: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "6",
    height: "6",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "4",
    width: "6",
    height: "6",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "14",
    width: "6",
    height: "6",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "6",
    height: "6",
    rx: "1.5"
  })),
  shield: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"
  })),
  remote: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 5h14v10H5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 19h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 15v4"
  })),
  sparkle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v6M12 15v6M3 12h6M15 12h6",
    opacity: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
    opacity: "0.6"
  })),
  command: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M9 9V6.5a2.5 2.5 0 1 0-2.5 2.5H9zM9 9h6m-6 0v6m6-6V6.5a2.5 2.5 0 1 1 2.5 2.5H15zm0 6h2.5a2.5 2.5 0 1 1-2.5 2.5V15zm-6 0v2.5a2.5 2.5 0 1 1-2.5-2.5H9z"
  })),
  filter: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 5h18l-7 9v6l-4-2v-4z"
  })),
  copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "12",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"
  })),
  edit: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 20h4l11-11-4-4L4 16z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m14 6 4 4"
  })),
  trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 7h16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 7V4h6v3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"
  })),
  history: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 1 0 3-6.7L3 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 3v5h5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h0M11 12h1v5h1"
  })),
  arrowR: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  })),
  thermometer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 14V6a2 2 0 1 0-4 0v8a4 4 0 1 0 4 0z"
  })),
  globe: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
  }))
};
const Ico = ({
  name,
  size = 16,
  stroke = 1.5,
  style
}) => /*#__PURE__*/React.createElement(Icon, {
  d: I[name],
  size: size,
  stroke: stroke,
  style: style
});
window.Ico = Ico;

// ─── Sidebar ────────────────────────────────────────────────
function Sidebar({
  active = "terminals"
}) {
  const items = [{
    id: "home",
    icon: "home",
    label: "Home"
  }, {
    id: "terminals",
    icon: "device",
    label: "Terminals",
    count: "2,481"
  }, {
    id: "merchants",
    icon: "store",
    label: "Merchants"
  }, {
    id: "orders",
    icon: "card",
    label: "Orders"
  }, {
    id: "tickets",
    icon: "ticket",
    label: "Tickets",
    count: 12
  }, {
    id: "deployments",
    icon: "flash",
    label: "Deployments"
  }, {
    id: "settings",
    icon: "settings",
    label: "Settings"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 220,
      flexShrink: 0,
      background: "var(--bg-sunken)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      padding: "12px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 8px 14px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.tomsLogo || "assets/toms-logo.png",
    alt: "TOMS",
    width: "22",
    height: "22",
    style: {
      flexShrink: 0,
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: "-0.01em",
      color: "var(--brand-mono)"
    }
  }, "TOMS"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 11,
      color: "var(--fg-tertiary)",
      padding: "2px 6px",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 4
    }
  }, "Acme\xA0Coffee")), /*#__PURE__*/React.createElement("button", {
    style: {
      margin: "2px 4px 12px",
      padding: "6px 8px 6px 10px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: 6,
      color: "var(--fg-tertiary)",
      fontSize: 12.5,
      textAlign: "left",
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "Search\u2026"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-quaternary)",
      padding: "1px 5px",
      border: "1px solid var(--border-subtle)",
      borderRadius: 4
    }
  }, "\u2318K")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.id,
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "5.5px 10px",
      borderRadius: 6,
      fontSize: 12.5,
      fontWeight: it.id === active ? 500 : 400,
      color: it.id === active ? "var(--fg-primary)" : "var(--fg-secondary)",
      background: it.id === active ? "var(--bg-active)" : "transparent",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: it.icon,
    size: 15,
    stroke: it.id === active ? 1.7 : 1.5
  }), /*#__PURE__*/React.createElement("span", null, it.label), it.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 11,
      color: "var(--fg-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, it.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      padding: "6px 10px 4px",
      fontSize: 10.5,
      color: "var(--fg-quaternary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, "Pinned"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, [{
    id: "p1",
    label: "T-7K2H · MTL Store #4",
    state: "online"
  }, {
    id: "p2",
    label: "Deployment · v4.2.1",
    state: "running"
  }, {
    id: "p3",
    label: "Acme Coffee · 142 SNs",
    state: null
  }].map(p => /*#__PURE__*/React.createElement("a", {
    key: p.id,
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 10px",
      borderRadius: 6,
      fontSize: 12,
      color: "var(--fg-secondary)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: p.state === "online" ? "var(--success)" : p.state === "running" ? "var(--accent-500)" : "var(--fg-quaternary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "tm-truncate",
    style: {
      flex: 1
    }
  }, p.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      padding: "10px 8px",
      borderTop: "1px solid var(--border-subtle)",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "var(--brand-mono)",
      color: "white",
      display: "grid",
      placeItems: "center",
      fontSize: 11,
      fontWeight: 600
    }
  }, "EC"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500
    },
    className: "tm-truncate"
  }, "Elena Costa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: "var(--fg-tertiary)"
    }
  }, "Admin \xB7 TOMS")), /*#__PURE__*/React.createElement("button", {
    style: {
      color: "var(--fg-tertiary)",
      padding: 4
    },
    title: "Account"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "chevd",
    size: 13
  }))));
}

// ─── Header / Breadcrumb / Actions ──────────────────────────
function ActionButton({
  children,
  primary,
  danger,
  onClick,
  icon
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      borderRadius: 6,
      fontSize: 12.5,
      fontWeight: 500,
      border: "1px solid",
      borderColor: primary ? "transparent" : "var(--border-default)",
      background: primary ? "var(--accent-gradient)" : danger ? "transparent" : "var(--bg-surface)",
      color: primary ? "var(--fg-on-accent)" : danger ? "var(--danger)" : "var(--fg-primary)",
      boxShadow: primary ? "inset 0 1px 0 oklch(100% 0 0 / .12), 0 1px 2px oklch(0% 0 0 / .25), 0 0 0 0.5px oklch(0% 0 0 / .4)" : "var(--shadow-xs)"
    }
  }, icon && /*#__PURE__*/React.createElement(Ico, {
    name: icon,
    size: 14
  }), children);
}
function ActionMenu({
  open,
  onClose
}) {
  if (!open) return null;
  const groups = [{
    title: "Administration",
    items: [{
      icon: "edit",
      label: "Edit details",
      hint: "E"
    }, {
      icon: "refresh",
      label: "Refresh snapshot"
    }, {
      icon: "bell",
      label: "Send message"
    }, {
      icon: "lock",
      label: "Offline auth code",
      hint: "⇧A"
    }, {
      icon: "trash",
      label: "Delete terminal",
      danger: true
    }]
  }, {
    title: "Lifecycle",
    items: [{
      icon: "alert",
      label: "Mark as lost"
    }, {
      icon: "diag",
      label: "Send to repair"
    }]
  }, {
    title: "Quick commands",
    items: [{
      icon: "log",
      label: "Real-time log",
      hint: "L"
    }, {
      icon: "diag",
      label: "Hardware diagnostics"
    }, {
      icon: "lock",
      label: "Lock screen"
    }, {
      icon: "power",
      label: "Restart",
      hint: "⇧R"
    }, {
      icon: "power",
      label: "Shutdown",
      danger: true
    }]
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 44,
      right: 16,
      zIndex: 41,
      width: 256,
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      borderRadius: 10,
      boxShadow: "var(--shadow-lg)",
      padding: 4,
      fontSize: 12.5
    }
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      padding: "4px 0",
      borderTop: gi === 0 ? "none" : "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 10px 4px",
      fontSize: 10.5,
      color: "var(--fg-quaternary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, g.title), g.items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: onClose,
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 10px",
      borderRadius: 6,
      textAlign: "left",
      color: it.danger ? "var(--danger)" : "var(--fg-primary)"
    },
    onMouseEnter: e => e.currentTarget.style.background = "var(--bg-hover)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: it.icon,
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, it.label), it.hint && /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10.5,
      color: "var(--fg-quaternary)"
    }
  }, it.hint)))))));
}
function Header({
  tab,
  setTab,
  onCmdK
}) {
  const [menu, setMenu] = useState(false);
  const tabs = [{
    id: "overview",
    label: "Overview"
  }, {
    id: "basic",
    label: "Basic Info"
  }, {
    id: "apps",
    label: "App & Firmware"
  }, {
    id: "settings",
    label: "Settings"
  }, {
    id: "remote",
    label: "Remote Assistance"
  }, {
    id: "files",
    label: "Files"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 16px",
      fontSize: 12,
      color: "var(--fg-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Terminals"), /*#__PURE__*/React.createElement(Ico, {
    name: "chevr",
    size: 11,
    style: {
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, "Acme Coffee"), /*#__PURE__*/React.createElement(Ico, {
    name: "chevr",
    size: 11,
    style: {
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--fg-secondary)"
    }
  }, "NL750-K9F2H7B3"), /*#__PURE__*/React.createElement("button", {
    onClick: onCmdK,
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 8px",
      borderRadius: 5,
      background: "var(--bg-sunken)",
      color: "var(--fg-tertiary)",
      fontSize: 11.5,
      border: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "search",
    size: 12
  }), /*#__PURE__*/React.createElement("span", null, "Search anything"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      marginLeft: 6,
      opacity: 0.7
    }
  }, "\u2318K")), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: 4,
      color: "var(--fg-tertiary)"
    },
    title: "Notifications"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "bell",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 16,
      padding: "4px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      color: "var(--fg-tertiary)"
    },
    title: "Back"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "chevl",
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 19,
      fontWeight: 600,
      margin: 0,
      letterSpacing: "-0.01em"
    },
    className: "mono"
  }, "NL750-K9F2H7B3"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 7px",
      borderRadius: 999,
      background: "var(--success-bg)",
      color: "var(--success)",
      fontSize: 11,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--success)",
      boxShadow: "0 0 0 3px oklch(58% 0.14 152 / .25)"
    }
  }), "Online"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 7px",
      borderRadius: 4,
      background: "var(--bg-sunken)",
      color: "var(--fg-secondary)",
      border: "1px solid var(--border-subtle)"
    }
  }, "Newland \xB7 N750P"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      padding: "2px 7px",
      borderRadius: 4,
      color: "var(--fg-secondary)"
    }
  }, "Acme Coffee \xB7 MTL Store #4")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginTop: 4,
      fontSize: 11.5,
      color: "var(--fg-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "signal",
    size: 12
  }), " LTE\xA0\xB7\xA0-67\xA0dBm"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "wifi",
    size: 12
  }), " office-5g"), /*#__PURE__*/React.createElement("span", null, "Today 142\xA0MB"), /*#__PURE__*/React.createElement("span", null, "Last seen 3s\xA0ago"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "pin",
    size: 12
  }), " 26.023, 119.416")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 6,
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement(ActionButton, {
    icon: "refresh"
  }, "Refresh"), /*#__PURE__*/React.createElement(ActionButton, {
    icon: "log"
  }, "Live log"), /*#__PURE__*/React.createElement(ActionButton, {
    primary: true,
    icon: "flash"
  }, "Push command"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenu(m => !m),
    style: {
      padding: 5,
      borderRadius: 6,
      border: "1px solid var(--border-default)",
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "more",
    size: 15
  }))), /*#__PURE__*/React.createElement(ActionMenu, {
    open: menu,
    onClose: () => setMenu(false)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      padding: "10px 12px 0",
      marginTop: 8
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab && setTab(t.id),
    style: {
      padding: "7px 10px",
      fontSize: 12.5,
      fontWeight: tab === t.id ? 500 : 400,
      color: tab === t.id ? "var(--fg-primary)" : "var(--fg-secondary)",
      borderBottom: "2px solid",
      borderColor: tab === t.id ? "var(--fg-primary)" : "transparent",
      marginBottom: -1
    }
  }, t.label))));
}

// ─── Card primitive ─────────────────────────────────────────
function Card({
  title,
  hint,
  action,
  children,
  padding = 16,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 10,
      ...style
    }
  }, (title || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 14px 10px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      margin: 0,
      letterSpacing: "-0.005em"
    }
  }, title), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--fg-tertiary)"
    }
  }, hint), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto"
    }
  }, action)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}

// ─── Stat / KPI primitive ──────────────────────────────────
function Stat({
  label,
  value,
  unit,
  sub,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      fontWeight: 500
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 24,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      color: accent || "var(--fg-primary)"
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)"
    }
  }, unit)), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--fg-tertiary)"
    }
  }, sub));
}

// ─── Toggle, Field row ──────────────────────────────────────
function Toggle({
  on,
  onChange,
  size = 18
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange && onChange(!on),
    style: {
      width: size * 1.7,
      height: size,
      borderRadius: 999,
      background: on ? "var(--accent-600)" : "var(--border-default)",
      transition: "background .15s",
      position: "relative",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: on ? size * 0.74 : 2,
      width: size - 4,
      height: size - 4,
      borderRadius: "50%",
      background: "white",
      boxShadow: "0 1px 2px oklch(0% 0 0 / .25)",
      transition: "left .15s"
    }
  }));
}
function FieldRow({
  label,
  children,
  mono,
  copy
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "7px 0",
      borderBottom: "1px dashed var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 140,
      fontSize: 11.5,
      color: "var(--fg-tertiary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: 450,
      fontFamily: mono ? "var(--font-mono)" : undefined,
      color: "var(--fg-primary)"
    }
  }, children), copy && /*#__PURE__*/React.createElement("button", {
    style: {
      color: "var(--fg-quaternary)",
      padding: 2,
      opacity: 0.6
    },
    title: "Copy"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "copy",
    size: 12
  })));
}

// ─── Status pill ────────────────────────────────────────────
function Pill({
  tone = "neutral",
  children,
  dot
}) {
  const toneMap = {
    success: {
      bg: "var(--success-bg)",
      fg: "var(--success)"
    },
    warning: {
      bg: "var(--warning-bg)",
      fg: "var(--warning)"
    },
    danger: {
      bg: "var(--danger-bg)",
      fg: "var(--danger)"
    },
    info: {
      bg: "var(--info-bg)",
      fg: "var(--info)"
    },
    accent: {
      bg: "var(--accent-50)",
      fg: "var(--accent-700)"
    },
    neutral: {
      bg: "var(--bg-sunken)",
      fg: "var(--fg-secondary)"
    }
  };
  const t = toneMap[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "1.5px 7px",
      borderRadius: 999,
      fontSize: 10.5,
      fontWeight: 500,
      background: t.bg,
      color: t.fg,
      lineHeight: 1.4
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: "50%",
      background: t.fg
    }
  }), children);
}
Object.assign(window, {
  Sidebar,
  Header,
  Card,
  Stat,
  Toggle,
  FieldRow,
  Pill,
  ActionButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/tab-overview-spacious.jsx
try { (() => {
/* global React, Card, Pill, Ico, TomsCharts */
// ─────────────────────────────────────────────────────────────
// TOMS — Overview tab (EXTRA SPACIOUS · less content, more whitespace)
// ─────────────────────────────────────────────────────────────

const {
  Sparkline: SparkO,
  AreaChart,
  rng: rngO
} = TomsCharts;
const PAD_O = "56px 64px";
const GAP_O = 32;
const trafficData = (() => {
  const r = rngO(7);
  return Array.from({
    length: 48
  }, (_, i) => {
    const base = 30 + 25 * Math.sin(i / 6) + 15 * Math.cos(i / 3);
    return Math.max(2, Math.round(base + r() * 18));
  });
})();
function OverviewTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD_O,
      display: "grid",
      gap: GAP_O,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 12",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 500,
      marginBottom: 10
    }
  }, "Terminal \xB7 Overview"), /*#__PURE__*/React.createElement("h1", {
    className: "mono",
    style: {
      fontSize: 28,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      margin: 0,
      lineHeight: 1.1
    }
  }, "NL750-K9F2H7B3"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "var(--fg-tertiary)"
    }
  }, "Acme Coffee \xB7 MTL Store #4 \xB7 last sync 3 seconds ago")), /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Online")), /*#__PURE__*/React.createElement(Card, {
    style: {
      gridColumn: "span 6"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 500
    }
  }, "Battery health"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 56,
      fontWeight: 500,
      letterSpacing: "-0.025em",
      lineHeight: 1
    }
  }, "86", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24,
      color: "var(--fg-tertiary)"
    }
  }, "%")), /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Healthy")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)"
    }
  }, "312 cycles \xB7 charging"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      gridColumn: "span 6"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 500
    }
  }, "Transactions today"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 56,
      fontWeight: 500,
      letterSpacing: "-0.025em",
      lineHeight: 1
    }
  }, "1,043"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--success)"
    }
  }, "\u2191 8.4%")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)"
    }
  }, "Peak 78 / hour \xB7 CAD $312K processed"))), /*#__PURE__*/React.createElement(Card, {
    title: "Data consumption",
    hint: "Last 24 hours \xB7 MB / hour",
    style: {
      gridColumn: "span 12"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(AreaChart, {
    data: trafficData,
    h: 260
  }))));
}
window.OverviewTab = OverviewTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/tab-overview-spacious.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/tab-overview.jsx
try { (() => {
/* global React, Sidebar, Header, Card, Stat, Toggle, FieldRow, Pill, ActionButton, Ico, TomsCharts */
// ─────────────────────────────────────────────────────────────
// TOMS — Overview tab (Calm density · less content, more whitespace)
// ─────────────────────────────────────────────────────────────

const {
  Sparkline: SparkO,
  AreaChart,
  BarPair,
  HBar,
  Donut,
  StackedBar,
  rng: rngO
} = TomsCharts;

// Stable sample data
const trafficData = (() => {
  const r = rngO(7);
  return Array.from({
    length: 48
  }, (_, i) => {
    const base = 30 + 25 * Math.sin(i / 6) + 15 * Math.cos(i / 3);
    return Math.max(2, Math.round(base + r() * 18));
  });
})();
const uptimeData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
  const r = rngO(11 + i);
  const device = 16 + r() * 6;
  const app = device * (0.55 + r() * 0.3);
  return {
    label,
    app: Math.round(app * 10) / 10,
    device: Math.round(device * 10) / 10
  };
});
function OverviewTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "32px 40px",
      display: "grid",
      gap: 24,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 12",
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "16px 22px",
      borderRadius: 12,
      background: "var(--accent-gradient-soft)",
      border: "1px solid var(--accent-200)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      flexShrink: 0,
      background: "var(--bg-surface)",
      color: "var(--accent-700)",
      display: "grid",
      placeItems: "center",
      border: "1px solid var(--accent-200)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "sparkle",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      color: "var(--fg-primary)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, "Battery cycles trending high."), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-secondary)"
    }
  }, "\xA0312 of 500 warrantied cycles used in 8 months \u2014 replacement recommended by", " ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "Q2 2027"), ".")), /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 13,
      color: "var(--accent-700)",
      fontWeight: 500
    }
  }, "View plan \u2192")), /*#__PURE__*/React.createElement(Card, {
    style: {
      gridColumn: "span 4"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, "Battery health"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Donut, {
    value: 86,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 30,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1.05
    }
  }, "86%"), /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Healthy"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      paddingTop: 12,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, "312 cycles \xB7 31.2\xB0C \xB7 charging on AC"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      gridColumn: "span 4"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, "Transactions today"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 30,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1.05
    }
  }, "1,043"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--success)"
    }
  }, "\u2191 8.4%")), /*#__PURE__*/React.createElement(SparkO, {
    data: trafficData.slice(-30),
    w: 240,
    h: 36,
    stroke: "var(--accent-600)",
    fill: "var(--accent-100)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      paddingTop: 12,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, "Peak 78 / hour at 14:00 \xB7 avg 32/hour"))), /*#__PURE__*/React.createElement(Card, {
    style: {
      gridColumn: "span 4"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, "Data this month"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 30,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1.05
    }
  }, "4.21"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--fg-tertiary)"
    }
  }, "GB"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--success)",
      marginLeft: "auto"
    }
  }, "\u2191 12%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      fontSize: 12,
      color: "var(--fg-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: 2,
      background: "var(--accent-600)",
      marginRight: 6
    }
  }), "Cellular 2.84"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: 2,
      background: "var(--bg-active)",
      border: "1px solid var(--border-strong)",
      marginRight: 6
    }
  }), "WiFi 1.37")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      paddingTop: 12,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, "Forecast ~218 MB tomorrow"))), /*#__PURE__*/React.createElement(Card, {
    title: "Data consumption \xB7 last 24h",
    hint: "MB / hour",
    style: {
      gridColumn: "span 12"
    },
    padding: 24,
    action: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        padding: 3,
        background: "var(--bg-sunken)",
        borderRadius: 7,
        fontSize: 12
      }
    }, ["Cellular", "WiFi", "All"].map((s, i) => /*#__PURE__*/React.createElement("button", {
      key: s,
      style: {
        padding: "5px 14px",
        borderRadius: 5,
        background: i === 2 ? "var(--bg-surface)" : "transparent",
        color: i === 2 ? "var(--fg-primary)" : "var(--fg-tertiary)",
        fontWeight: i === 2 ? 500 : 400,
        boxShadow: i === 2 ? "var(--shadow-xs)" : "none"
      }
    }, s)))
  }, /*#__PURE__*/React.createElement(AreaChart, {
    data: trafficData,
    h: 200
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Uptime \xB7 last 7 days",
    hint: "App vs. device \xB7 hours",
    style: {
      gridColumn: "span 7"
    },
    padding: 24,
    action: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--fg-tertiary)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        background: "var(--accent-500)",
        borderRadius: 2
      }
    }), "App"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--fg-tertiary)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        background: "var(--bg-active)",
        border: "1px solid var(--border-strong)",
        borderRadius: 2
      }
    }), "Device"))
  }, /*#__PURE__*/React.createElement(BarPair, {
    data: uptimeData,
    h: 200
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Location",
    hint: "Live",
    style: {
      gridColumn: "span 5"
    },
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 220,
      position: "relative",
      background: "linear-gradient(135deg, oklch(96% 0.01 240) 0%, oklch(94% 0.015 220) 100%)",
      borderBottom: "1px solid var(--border-subtle)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 320 220",
    style: {
      position: "absolute",
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "oklch(85% 0.01 240)",
    strokeWidth: "1",
    fill: "none"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "55",
    x2: "320",
    y2: "55"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "115",
    x2: "320",
    y2: "115"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "175",
    x2: "320",
    y2: "175"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "80",
    y1: "0",
    x2: "80",
    y2: "220"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "170",
    y1: "0",
    x2: "170",
    y2: "220"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "245",
    y1: "0",
    x2: "245",
    y2: "220"
  })), /*#__PURE__*/React.createElement("g", {
    stroke: "oklch(82% 0.015 240)",
    strokeWidth: "3",
    fill: "none",
    opacity: "0.6"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "115",
    x2: "320",
    y2: "115"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "170",
    y1: "0",
    x2: "170",
    y2: "220"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "100",
    y: "65",
    width: "55",
    height: "32",
    fill: "oklch(92% 0.01 240)",
    stroke: "oklch(85% 0.01 240)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "190",
    y: "130",
    width: "40",
    height: "28",
    fill: "oklch(92% 0.01 240)",
    stroke: "oklch(85% 0.01 240)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "130",
    width: "50",
    height: "28",
    fill: "oklch(92% 0.01 240)",
    stroke: "oklch(85% 0.01 240)"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "translate(170 115)"
  }, /*#__PURE__*/React.createElement("circle", {
    r: "22",
    fill: "var(--accent-500)",
    opacity: "0.15"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "r",
    values: "14;30;14",
    dur: "2.4s",
    repeatCount: "indefinite"
  }), /*#__PURE__*/React.createElement("animate", {
    attributeName: "opacity",
    values: "0.3;0;0.3",
    dur: "2.4s",
    repeatCount: "indefinite"
  })), /*#__PURE__*/React.createElement("circle", {
    r: "7",
    fill: "var(--accent-600)",
    stroke: "white",
    strokeWidth: "2.5"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-tertiary)"
    }
  }, "Address"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 450,
      textAlign: "right"
    }
  }, "372 Ave du Mont-Royal E, Montr\xE9al")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-tertiary)"
    }
  }, "Last fix"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "2s ago \xB7 \xB14m")))), /*#__PURE__*/React.createElement(Card, {
    title: "Recent activity",
    hint: "Last 24 hours",
    style: {
      gridColumn: "span 12"
    },
    padding: 24,
    action: /*#__PURE__*/React.createElement("button", {
      style: {
        fontSize: 12.5,
        color: "var(--fg-secondary)",
        padding: "5px 12px",
        border: "1px solid var(--border-default)",
        borderRadius: 6
      }
    }, "View all \u2192")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, [{
    e: "Firmware update pushed",
    who: "Elena C.",
    t: "12:48",
    tone: "success"
  }, {
    e: "App deployment scheduled",
    who: "auto · scheduler",
    t: "12:32",
    tone: "info"
  }, {
    e: "Diagnostics run complete",
    who: "Elena C.",
    t: "11:18",
    tone: "success"
  }, {
    e: "Screen lock command failed",
    who: "Marc D.",
    t: "10:42",
    tone: "warning"
  }].map((it, i, arr) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 16,
      padding: "14px 0",
      alignItems: "center",
      borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      flexShrink: 0,
      background: it.tone === "success" ? "var(--success)" : it.tone === "warning" ? "var(--warning)" : "var(--info)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14
    }
  }, it.e), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)"
    }
  }, it.who), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      width: 60,
      textAlign: "right"
    }
  }, it.t))))));
}
window.OverviewTab = OverviewTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/tab-overview.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/tabs-rest-spacious.jsx
try { (() => {
/* global React, Card, Stat, Toggle, FieldRow, Pill, ActionButton, Ico, TomsCharts */
// EXTRA SPACIOUS · less content, more whitespace, larger type
const {
  Sparkline: SparkB,
  Donut: DonutB
} = TomsCharts;
const PAD = "56px 64px";
const GAP = 32;

// ─────────────────────────────────────────────────────────────
// Basic Info
// ─────────────────────────────────────────────────────────────
function BasicTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Identity",
    style: {
      gridColumn: "span 6"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "Vendor"
  }, "Newland"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Model",
    mono: true
  }, "N750P"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Serial number",
    mono: true,
    copy: true
  }, "NL750-K9F2H7B3"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "PCI version",
    mono: true
  }, "v6.0.1")), /*#__PURE__*/React.createElement(Card, {
    title: "Compliance",
    action: /*#__PURE__*/React.createElement(Pill, {
      tone: "success",
      dot: true
    }, "Pass"),
    style: {
      gridColumn: "span 6"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "Root status"
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Not rooted")), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Bootloader"
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Locked")), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Last audit",
    mono: true
  }, "2026-05-04 06:00")), /*#__PURE__*/React.createElement(Card, {
    title: "Network",
    hint: "Cellular \xB7 LTE Cat-4",
    action: /*#__PURE__*/React.createElement(Pill, {
      tone: "success",
      dot: true
    }, "Connected"),
    style: {
      gridColumn: "span 12"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 36
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldRow, {
    label: "Operator"
  }, "Bell Mobility"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Signal",
    mono: true
  }, "\u221267 dBm")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldRow, {
    label: "SSID"
  }, "office-5g"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "IPv4",
    mono: true,
    copy: true
  }, "10.42.118.27")))));
}

// ─────────────────────────────────────────────────────────────
// App & Firmware
// ─────────────────────────────────────────────────────────────
function AppsTab() {
  const apps = [{
    name: "PaymentCore",
    v: "8.4.2",
    status: "running",
    icon: "card",
    iconBg: "var(--accent-500)"
  }, {
    name: "Inventory Sync",
    v: "3.1.0",
    status: "running",
    icon: "store",
    iconBg: "var(--success)"
  }, {
    name: "TOMS Agent",
    v: "4.2.1",
    status: "running",
    icon: "shield",
    iconBg: "var(--fg-secondary)"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Firmware",
    action: /*#__PURE__*/React.createElement(ActionButton, {
      primary: true,
      icon: "flash"
    }, "Push update"),
    style: {
      gridColumn: "span 12"
    },
    padding: 40
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 56
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 14,
      fontWeight: 500
    }
  }, "Current"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 36,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1
    }
  }, "v4.2.1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)",
      marginTop: 12
    }
  }, "Built 2026-03-20")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 14,
      fontWeight: 500
    }
  }, "Available"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 36,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1,
      color: "var(--accent-700)"
    }
  }, "v4.3.0"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)",
      marginTop: 12
    }
  }, "42 MB \xB7 ~2 min downtime")))), /*#__PURE__*/React.createElement(Card, {
    title: "Applications",
    hint: `${apps.length} running`,
    style: {
      gridColumn: "span 12"
    },
    padding: 0
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("tbody", null, apps.map((a, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: i ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "24px 36px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 11,
      background: a.iconBg,
      color: "white",
      display: "grid",
      placeItems: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: a.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 15.5
    }
  }, a.name), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      marginTop: 4
    }
  }, "v", a.v)))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "24px 36px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Running"))))))));
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [vol, setVol] = React.useState(60);
  const [bri, setBri] = React.useState(72);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Environment",
    hint: "Display, sound & locale",
    style: {
      gridColumn: "span 12"
    },
    padding: 40
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 36
    }
  }, /*#__PURE__*/React.createElement(SliderRow, {
    label: "Brightness",
    value: bri,
    setValue: setBri
  }), /*#__PURE__*/React.createElement(SliderRow, {
    label: "Media volume",
    value: vol,
    setValue: setVol
  }), /*#__PURE__*/React.createElement(SliderRow, {
    label: "Key tone",
    value: 45,
    setValue: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Auto time sync",
    sub: "NTP \xB7 time.toms.io",
    on: true
  }), /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Adaptive sleep",
    sub: "Dim after 2 min idle",
    on: true
  }), /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Haptic feedback",
    sub: "On key press"
  }), /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Dark mode follows location",
    sub: "Sunset \u2192 sunrise",
    on: true
  })))), /*#__PURE__*/React.createElement(Card, {
    title: "Connectivity",
    style: {
      gridColumn: "span 12"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, [{
    i: "signal",
    l: "Cellular",
    s: "LTE · Bell",
    on: true
  }, {
    i: "wifi",
    l: "WiFi",
    s: "office-5g",
    on: true
  }].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "22px 24px",
      border: "1px solid var(--border-subtle)",
      borderRadius: 12,
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      flexShrink: 0,
      background: "var(--accent-50)",
      color: "var(--accent-700)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: c.i,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 500
    }
  }, c.l), /*#__PURE__*/React.createElement("div", {
    className: "tm-truncate",
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      marginTop: 3
    }
  }, c.s)), /*#__PURE__*/React.createElement(Toggle, {
    on: c.on,
    onChange: () => {}
  }))))));
}
function SliderRow({
  label,
  value,
  setValue
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--fg-tertiary)"
    }
  }, value, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: value,
    onChange: e => setValue && setValue(+e.target.value),
    style: {
      width: "100%",
      accentColor: "var(--accent-600)"
    }
  }));
}
function ToggleRow({
  label,
  sub,
  on
}) {
  const [v, setV] = React.useState(!!on);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "18px 20px",
      borderRadius: 12,
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 500
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      marginTop: 3
    },
    className: "tm-truncate"
  }, sub)), /*#__PURE__*/React.createElement(Toggle, {
    on: v,
    onChange: setV
  }));
}

// ─────────────────────────────────────────────────────────────
// Remote Assistance — single calm column of tools
// ─────────────────────────────────────────────────────────────
function RemoteTab() {
  const items = [{
    i: "diag",
    l: "Hardware diagnostics",
    s: "Self-test 12 modules"
  }, {
    i: "log",
    l: "Real-time log",
    s: "Tail journalctl"
  }, {
    i: "remote",
    l: "Remote control",
    s: "Mirror screen + control"
  }, {
    i: "lock",
    l: "Lock / unlock",
    s: "Remote screen lock"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Diagnostics",
    hint: "Streaming tools",
    style: {
      gridColumn: "span 12"
    },
    padding: 36
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 10,
      padding: "26px 28px",
      borderRadius: 12,
      textAlign: "left",
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      transition: "all .12s"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--bg-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--bg-surface)";
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 10,
      background: "var(--accent-50)",
      color: "var(--accent-700)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: it.i,
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      marginTop: 6
    }
  }, it.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)"
    }
  }, it.s))))));
}

// ─────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────
function FilesTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "File task center",
    action: /*#__PURE__*/React.createElement(ActionButton, {
      primary: true,
      icon: "plus"
    }, "New task"),
    style: {
      gridColumn: "span 12"
    },
    padding: 0
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 14.5
    }
  }, /*#__PURE__*/React.createElement("tbody", null, [{
    n: "Daily syslog · 2026-05-04",
    size: "4.2 MB",
    time: "12 min ago"
  }, {
    n: "Hardware self-test",
    size: "82 KB",
    time: "1h ago"
  }, {
    n: "System snapshot",
    size: "16.4 MB",
    time: "Yesterday"
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: i ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "26px 36px",
      fontWeight: 500
    }
  }, r.n), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "26px 36px",
      textAlign: "right",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, r.size), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "26px 36px",
      textAlign: "right",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, r.time)))))));
}
Object.assign(window, {
  BasicTab,
  AppsTab,
  SettingsTab,
  RemoteTab,
  FilesTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/tabs-rest-spacious.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/tabs-rest.jsx
try { (() => {
/* global React, Card, Stat, Toggle, FieldRow, Pill, ActionButton, Ico, TomsCharts */
// Calm density · less content, more whitespace, larger type
const {
  Sparkline: SparkB,
  Donut: DonutB
} = TomsCharts;
const PAD = "32px 40px";
const GAP = 24;
function tempCurve() {
  const pts = [];
  const r = (() => {
    let s = 41;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();
  for (let i = 0; i < 48; i++) pts.push(28 + 4 * Math.sin(i / 7) + r() * 1.6);
  return pts;
}

// ─────────────────────────────────────────────────────────────
// Basic Info
// ─────────────────────────────────────────────────────────────
function BasicTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Identity",
    style: {
      gridColumn: "span 6"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "Vendor"
  }, "Newland"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Model",
    mono: true
  }, "N750P"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Serial number",
    mono: true,
    copy: true
  }, "NL750-K9F2H7B3"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "PCI version",
    mono: true
  }, "PCI 6.x \xB7 v6.0.1"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Group"
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "accent"
  }, "Acme\xA0Coffee"), /*#__PURE__*/React.createElement(Pill, {
    tone: "neutral"
  }, "MTL\xA0Store\xA0#4"))), /*#__PURE__*/React.createElement(Card, {
    title: "Compliance",
    hint: "Audit",
    action: /*#__PURE__*/React.createElement(Pill, {
      tone: "success",
      dot: true
    }, "All checks pass"),
    style: {
      gridColumn: "span 6"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "Root status"
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Not rooted")), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Bootloader"
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Locked")), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Attestation",
    mono: true
  }, "SHA256 \xB7 4f2a\u2026cb19"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Last audit",
    mono: true
  }, "2026-05-04 06:00 UTC")), /*#__PURE__*/React.createElement(Card, {
    title: "Cellular",
    hint: "LTE Cat-4",
    style: {
      gridColumn: "span 6"
    },
    padding: 24,
    action: /*#__PURE__*/React.createElement(Pill, {
      tone: "success",
      dot: true
    }, "Connected")
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "IMEI",
    mono: true,
    copy: true
  }, "867530901244168"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Operator"
  }, "Bell Mobility"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Signal",
    mono: true
  }, "\u221267 dBm \xB7 RSRP \u221294"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Band",
    mono: true
  }, "B7 (2600 MHz)")), /*#__PURE__*/React.createElement(Card, {
    title: "Local network",
    hint: "WiFi",
    style: {
      gridColumn: "span 6"
    },
    padding: 24,
    action: /*#__PURE__*/React.createElement(Pill, {
      tone: "success",
      dot: true
    }, "5 GHz")
  }, /*#__PURE__*/React.createElement(FieldRow, {
    label: "SSID"
  }, "office-5g"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "IPv4",
    mono: true,
    copy: true
  }, "10.42.118.27"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "WiFi MAC",
    mono: true,
    copy: true
  }, "D8:3A:DD:74:18:9F"), /*#__PURE__*/React.createElement(FieldRow, {
    label: "Gateway",
    mono: true
  }, "10.42.118.1")), /*#__PURE__*/React.createElement(Card, {
    title: "Battery health profile",
    hint: "30-day window",
    style: {
      gridColumn: "span 12"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 32,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(DonutB, {
    value: 86,
    color: "var(--success)",
    size: 104,
    stroke: 11
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-tertiary)"
    }
  }, "Cycles"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 22,
      fontWeight: 500
    }
  }, "312 / 500"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-tertiary)",
      marginTop: 8
    }
  }, "Capacity"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 22,
      fontWeight: 500
    }
  }, "3,820 mAh"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)",
      marginBottom: 8
    }
  }, "Operating temperature \xB7 last 48 hours"), /*#__PURE__*/React.createElement(SparkB, {
    data: tempCurve(),
    w: 520,
    h: 90,
    stroke: "var(--warning)",
    fill: "var(--warning-bg)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
      color: "var(--fg-quaternary)",
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "20\xB0C"), /*#__PURE__*/React.createElement("span", null, "min 27.4 \xB7 avg 31.2 \xB7 max 36.1\xB0C"), /*#__PURE__*/React.createElement("span", null, "40\xB0C"))))));
}

// ─────────────────────────────────────────────────────────────
// App & Firmware
// ─────────────────────────────────────────────────────────────
function AppsTab() {
  const apps = [{
    name: "PaymentCore",
    v: "8.4.2",
    cat: "Deployment",
    status: "running",
    size: "284 MB",
    pinned: true,
    icon: "card",
    iconBg: "var(--accent-500)"
  }, {
    name: "Inventory Sync",
    v: "3.1.0",
    cat: "Third Party",
    status: "running",
    size: "104 MB",
    icon: "store",
    iconBg: "var(--success)"
  }, {
    name: "TOMS Agent",
    v: "4.2.1",
    cat: "System",
    status: "running",
    size: "62 MB",
    locked: true,
    icon: "shield",
    iconBg: "var(--fg-secondary)"
  }, {
    name: "Receipt Printer",
    v: "1.8.4",
    cat: "Deployment",
    status: "stopped",
    size: "18 MB",
    icon: "doc",
    iconBg: "var(--info)"
  }];
  const [sel, setSel] = React.useState([]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Firmware",
    hint: "OTA",
    action: /*#__PURE__*/React.createElement(ActionButton, {
      primary: true,
      icon: "flash"
    }, "Push update"),
    style: {
      gridColumn: "span 12"
    },
    padding: 28
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 10,
      fontWeight: 500
    }
  }, "Current"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 22,
      fontWeight: 500
    }
  }, "v4.2.1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)",
      marginTop: 6
    }
  }, "FW-0712-B \xB7 built 2026-03-20")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 10,
      fontWeight: 500
    }
  }, "Available"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: "var(--accent-700)"
    }
  }, "v4.3.0"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-tertiary)",
      marginTop: 6
    }
  }, "42 MB differential \xB7 ~2 min downtime")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 10,
      fontWeight: 500
    }
  }, "Last upgrade"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 22,
      fontWeight: 500
    }
  }, "Mar 30"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--success)",
      marginTop: 6
    }
  }, "Success \xB7 1m 47s")))), /*#__PURE__*/React.createElement(Card, {
    title: "Applications",
    hint: `${apps.length} installed · 3 running`,
    action: /*#__PURE__*/React.createElement(ActionButton, {
      primary: true,
      icon: "upload"
    }, "Push app"),
    style: {
      gridColumn: "span 12"
    },
    padding: 0
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      color: "var(--fg-tertiary)",
      fontSize: 11.5,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 16px 16px 28px",
      width: 28
    }
  }), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "left"
    }
  }, "App"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "left"
    }
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "right"
    }
  }, "Size"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 28px",
      width: 60
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, apps.map((a, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-subtle)",
      background: sel.includes(a.name) ? "var(--accent-50)" : "transparent"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "16px 16px 16px 28px"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: sel.includes(a.name),
    onChange: () => setSel(s => s.includes(a.name) ? s.filter(x => x !== a.name) : [...s, a.name]),
    style: {
      accentColor: "var(--accent-600)"
    }
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "16px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 9,
      background: a.iconBg,
      color: "white",
      display: "grid",
      placeItems: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: a.icon,
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: 14.5
    }
  }, a.name), a.pinned && /*#__PURE__*/React.createElement(Pill, {
    tone: "accent"
  }, "Pinned"), a.locked && /*#__PURE__*/React.createElement(Ico, {
    name: "lock",
    size: 12,
    style: {
      color: "var(--fg-quaternary)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      marginTop: 2
    }
  }, a.cat, " \xB7 v", a.v)))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "16px 8px"
    }
  }, a.status === "running" ? /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Running") : /*#__PURE__*/React.createElement(Pill, {
    tone: "neutral",
    dot: true
  }, "Stopped")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "16px 8px",
      textAlign: "right",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, a.size), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "16px 28px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: 6,
      color: "var(--fg-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "more",
    size: 15
  })))))))));
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [vol, setVol] = React.useState(60);
  const [bri, setBri] = React.useState(72);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Environment",
    hint: "Display & sound",
    style: {
      gridColumn: "span 6"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(SliderRow, {
    label: "Brightness",
    value: bri,
    setValue: setBri
  }), /*#__PURE__*/React.createElement(SliderRow, {
    label: "Media volume",
    value: vol,
    setValue: setVol
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Auto time sync",
    sub: "NTP \xB7 time.toms.io",
    on: true
  }), /*#__PURE__*/React.createElement(ToggleRow, {
    label: "Adaptive sleep",
    sub: "2 min idle",
    on: true
  })))), /*#__PURE__*/React.createElement(Card, {
    title: "Connectivity",
    hint: "Hardware toggles",
    style: {
      gridColumn: "span 6"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, [{
    i: "signal",
    l: "Cellular",
    s: "LTE · Bell",
    on: true
  }, {
    i: "wifi",
    l: "WiFi",
    s: "office-5g",
    on: true
  }, {
    i: "pin",
    l: "GPS",
    s: "±4m accuracy",
    on: true
  }, {
    i: "shield",
    l: "VPN",
    s: "toms-ops",
    on: true
  }].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      border: "1px solid var(--border-subtle)",
      borderRadius: 10,
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      flexShrink: 0,
      background: c.on ? "var(--accent-50)" : "var(--bg-sunken)",
      color: c.on ? "var(--accent-700)" : "var(--fg-tertiary)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: c.i,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, c.l), /*#__PURE__*/React.createElement("div", {
    className: "tm-truncate",
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)"
    }
  }, c.s)), /*#__PURE__*/React.createElement(Toggle, {
    on: c.on,
    onChange: () => {}
  }))))), /*#__PURE__*/React.createElement(Card, {
    title: "Payment modules",
    hint: "Hardware shielding",
    style: {
      gridColumn: "span 12"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, [{
    l: "Magstripe reader",
    s: "ISO 7811 Track 1/2/3",
    on: true
  }, {
    l: "Contactless (NFC)",
    s: "EMV · ApplePay · GPay",
    on: true
  }, {
    l: "IC chip reader",
    s: "EMV Level 2",
    on: true
  }, {
    l: "Receipt printer",
    s: "58mm thermal",
    on: false
  }].map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "16px 18px",
      borderRadius: 10,
      border: "1px solid var(--border-subtle)",
      background: p.on ? "var(--bg-surface)" : "var(--bg-sunken)",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, p.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      marginTop: 2
    }
  }, p.s)), p.on ? /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Enabled") : /*#__PURE__*/React.createElement(Pill, {
    tone: "neutral",
    dot: true
  }, "Disabled"), /*#__PURE__*/React.createElement(Toggle, {
    on: p.on,
    onChange: () => {}
  }))))));
}
function SliderRow({
  label,
  value,
  setValue
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13.5,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--fg-tertiary)"
    }
  }, value, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: value,
    onChange: e => setValue && setValue(+e.target.value),
    style: {
      width: "100%",
      accentColor: "var(--accent-600)"
    }
  }));
}
function ToggleRow({
  label,
  sub,
  on
}) {
  const [v, setV] = React.useState(!!on);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      borderRadius: 10,
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-tertiary)",
      marginTop: 2
    },
    className: "tm-truncate"
  }, sub)), /*#__PURE__*/React.createElement(Toggle, {
    on: v,
    onChange: setV
  }));
}

// ─────────────────────────────────────────────────────────────
// Remote Assistance
// ─────────────────────────────────────────────────────────────
function RemoteTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(ActionGrid, {
    title: "Real-time diagnosis",
    subtitle: "Streaming \xB7 session-based",
    gridSpan: 6,
    items: [{
      i: "diag",
      l: "Hardware diagnostics",
      s: "Self-test 12 modules"
    }, {
      i: "log",
      l: "Real-time log",
      s: "Tail journalctl"
    }, {
      i: "remote",
      l: "Remote control",
      s: "Mirror screen + control"
    }, {
      i: "download",
      l: "Extract log",
      s: "Last 24h to .zip"
    }]
  }), /*#__PURE__*/React.createElement(ActionGrid, {
    title: "High-privilege",
    subtitle: "Audited \xB7 double confirm",
    gridSpan: 6,
    items: [{
      i: "shield",
      l: "Update keys",
      s: "FlyKey rotation",
      danger: true
    }, {
      i: "refresh",
      l: "Recovery",
      s: "Factory reset · keep keys",
      danger: true
    }, {
      i: "lock",
      l: "Lock / unlock",
      s: "Remote screen lock"
    }, {
      i: "info",
      l: "Collect info",
      s: "Hardware + software snap"
    }]
  }), /*#__PURE__*/React.createElement(Card, {
    title: "Custom command",
    hint: "Power user",
    style: {
      gridColumn: "span 12"
    },
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 8,
      fontSize: 13.5,
      background: "var(--bg-sunken)",
      border: "1px solid var(--border-default)"
    }
  }, "Category ", /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--fg-tertiary)"
    }
  }, "shell.exec"), /*#__PURE__*/React.createElement(Ico, {
    name: "chevd",
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)",
      alignSelf: "center"
    }
  }, "128 character limit")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      borderRadius: 10,
      background: "oklch(15% 0.005 270)",
      color: "oklch(85% 0.005 270)",
      minHeight: 140,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "oklch(60% 0.18 152)"
    }
  }, "$"), " systemctl status toms-agent"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      color: "oklch(70% 0.005 270)"
    }
  }, /*#__PURE__*/React.createElement("div", null, "\u25CF toms-agent.service \u2014 TOMS Device Agent"), /*#__PURE__*/React.createElement("div", null, "\xA0\xA0\xA0Active: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "oklch(72% 0.15 152)"
    }
  }, "active (running)"), " since Apr 19 23:47")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "oklch(60% 0.18 152)"
    }
  }, "$"), /*#__PURE__*/React.createElement("span", null, "_"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 14,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      fontSize: 13,
      padding: "8px 14px",
      border: "1px solid var(--border-default)",
      borderRadius: 7
    }
  }, "Save as macro"), /*#__PURE__*/React.createElement(ActionButton, {
    primary: true
  }, "Execute"))));
}
function ActionGrid({
  title,
  subtitle,
  items,
  gridSpan = 6
}) {
  return /*#__PURE__*/React.createElement(Card, {
    title: title,
    hint: subtitle,
    style: {
      gridColumn: `span ${gridSpan}`
    },
    padding: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 6,
      padding: "16px 18px",
      borderRadius: 10,
      textAlign: "left",
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      transition: "all .12s"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--bg-hover)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--bg-surface)";
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: it.danger ? "var(--danger-bg)" : "var(--accent-50)",
      color: it.danger ? "var(--danger)" : "var(--accent-700)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    name: it.i,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      marginTop: 4
    }
  }, it.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--fg-tertiary)"
    }
  }, it.s)))));
}

// ─────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────
function FilesTab() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PAD,
      display: "grid",
      gap: GAP,
      gridTemplateColumns: "repeat(12, 1fr)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "File task center",
    hint: "Scheduled \xB7 ad-hoc",
    action: /*#__PURE__*/React.createElement(ActionButton, {
      primary: true,
      icon: "plus"
    }, "New extract task"),
    style: {
      gridColumn: "span 12"
    },
    padding: 0
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      color: "var(--fg-tertiary)",
      fontSize: 11.5,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 28px",
      textAlign: "left"
    }
  }, "Task"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "left"
    }
  }, "Type"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "left"
    }
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 8px",
      textAlign: "right"
    }
  }, "Size"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "16px 28px",
      textAlign: "right"
    }
  }, "Created"))), /*#__PURE__*/React.createElement("tbody", null, [{
    n: "Daily syslog · 2026-05-04",
    t: "log.zip",
    s: "ready",
    size: "4.2 MB",
    time: "12 min ago"
  }, {
    n: "Hardware self-test",
    t: "diag.xls",
    s: "ready",
    size: "82 KB",
    time: "1h ago"
  }, {
    n: "System snapshot",
    t: "system.zip",
    s: "ready",
    size: "16.4 MB",
    time: "Yesterday"
  }, {
    n: "TX history · April",
    t: "csv",
    s: "ready",
    size: "1.8 MB",
    time: "Apr 30"
  }, {
    n: "Memory profile",
    t: "trace",
    s: "running",
    size: "—",
    time: "Started 2m ago"
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 28px",
      fontWeight: 500
    }
  }, r.n), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 8px",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, r.t), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 8px"
    }
  }, r.s === "ready" ? /*#__PURE__*/React.createElement(Pill, {
    tone: "success",
    dot: true
  }, "Ready") : /*#__PURE__*/React.createElement(Pill, {
    tone: "info",
    dot: true
  }, "Running")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 8px",
      textAlign: "right",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, r.size), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 28px",
      textAlign: "right",
      color: "var(--fg-tertiary)"
    },
    className: "mono"
  }, r.time)))))));
}
Object.assign(window, {
  BasicTab,
  AppsTab,
  SettingsTab,
  RemoteTab,
  FilesTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/tabs-rest.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal-manager/tweaks-panel.jsx
try { (() => {
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-noncommentable": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;

  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}
function TweakColor({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
    type: "color",
    className: "twk-swatch",
    value: value,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal-manager/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// uploads/handoff-data.js
try { (() => {
/* ═══════════════════════════════════════════════════════════════
   Warm Theme · Developer Handoff — data + render
   Renders Foundation grids/tables from token data, populates the
   four export code blocks, wires export tabs + copy buttons.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  /* ─── Token data ──────────────────────────────────────────── */
  const primary = [["--p-primary-50", "oklch(97% 0.012 262)", "primary-subtle bg"], ["--p-primary-100", "oklch(94% 0.025 262)", "subtle border"], ["--p-primary-200", "oklch(86% 0.060 262)", ""], ["--p-primary-300", "oklch(72% 0.100 262)", ""], ["--p-primary-400", "oklch(55% 0.140 262)", ""], ["--p-primary-500", "oklch(40% 0.140 262)", "ring · focus"], ["--p-primary-600", "oklch(32% 0.100 262)", "primary-hover"], ["--p-primary-700", "oklch(24% 0.060 262)", "primary · CTA bg"], ["--p-primary-800", "oklch(18% 0.040 262)", "primary-active"], ["--p-primary-900", "oklch(12% 0.025 262)", ""]];
  const neutral = [["--p-neutral-0", "oklch(100% 0 0)", "card · popover"], ["--p-neutral-50", "oklch(99% 0.003 90)", "background"], ["--p-neutral-100", "oklch(97.2% 0.004 90)", "muted"], ["--p-neutral-150", "oklch(95.8% 0.005 90)", "accent · hover"], ["--p-neutral-200", "oklch(93.5% 0.006 90)", "secondary"], ["--p-neutral-250", "oklch(91% 0.008 90)", "secondary-hover"], ["--p-neutral-300", "oklch(89% 0.010 90)", "border · input"], ["--p-neutral-400", "oklch(80% 0.012 90)", "border-strong"], ["--p-neutral-500", "oklch(60% 0.010 90)", "subtle text"], ["--p-neutral-600", "oklch(44% 0.010 90)", "muted-foreground"], ["--p-neutral-700", "oklch(30% 0.010 90)", ""], ["--p-neutral-900", "oklch(20% 0.010 90)", "foreground"]];
  const status = [["--p-success-50", "oklch(96% 0.030 152)", "success-subtle"], ["--p-success-500", "oklch(58% 0.140 152)", "success"], ["--p-success-700", "oklch(46% 0.130 152)", "success text"], ["--p-warning-50", "oklch(96.5% 0.040 80)", "warning-subtle"], ["--p-warning-500", "oklch(70% 0.160 70)", "warning"], ["--p-warning-700", "oklch(56% 0.150 60)", "warning text"], ["--p-danger-50", "oklch(96% 0.040 25)", "danger-subtle"], ["--p-danger-500", "oklch(58% 0.200 25)", "danger"], ["--p-danger-700", "oklch(46% 0.190 25)", "danger text"], ["--p-info-50", "oklch(96% 0.030 230)", "info-subtle"], ["--p-info-500", "oklch(60% 0.140 230)", "info"], ["--p-info-700", "oklch(48% 0.130 230)", "info text"]];
  const chart = [["--chart-1", "oklch(52% 0.160 240)", "blue"], ["--chart-2", "oklch(60% 0.130 195)", "cyan"], ["--chart-3", "oklch(55% 0.140 152)", "green"], ["--chart-4", "oklch(68% 0.140 90)", "yellow"], ["--chart-5", "oklch(62% 0.170 60)", "orange"]];
  const semantic = [["--primary", "oklch(24% 0.060 262)", "主操作 / CTA 背景"], ["--primary-hover", "oklch(32% 0.100 262)", "主按钮 hover"], ["--primary-active", "oklch(18% 0.040 262)", "主按钮 active / 按下"], ["--primary-foreground", "oklch(99% 0 0)", "主色之上的文字"], ["--secondary", "oklch(93.5% 0.006 90)", "次按钮 / chip 背景"], ["--secondary-foreground", "oklch(20% 0.010 90)", "次色之上的文字"], ["--success", "oklch(58% 0.140 152)", "成功状态"], ["--warning", "oklch(70% 0.160 70)", "警告状态"], ["--danger", "oklch(58% 0.200 25)", "危险 / 删除"], ["--info", "oklch(60% 0.140 230)", "信息提示"], ["--background", "oklch(99% 0.003 90)", "应用画布底色"], ["--foreground", "oklch(20% 0.010 90)", "正文 / 标题"], ["--card", "oklch(100% 0 0)", "卡片 / 浮层表面"], ["--muted", "oklch(97.2% 0.004 90)", "下沉表面 / 表头"], ["--muted-foreground", "oklch(44% 0.010 90)", "次要文字"], ["--border", "oklch(89% 0.010 90)", "默认边线"], ["--input", "oklch(89% 0.010 90)", "输入框边线"], ["--ring", "oklch(40% 0.140 262)", "聚焦环 (indigo)"]];
  const type = [["text-4xl", "36px", "600", "Roles & Users"], ["text-3xl", "28px", "600", "Carbon platform roles"], ["text-2xl", "22px", "600", "Invite teammate"], ["text-xl", "18px", "600", "Permissions"], ["text-lg", "16px", "600", "Section title"], ["text-md", "14px", "400", "Body — the quick brown fox jumps over the lazy dog."], ["text-sm", "13px", "400", "Secondary body text and helper copy."], ["text-xs", "12px", "400", "Caption / metadata"]];
  const radius = [["--radius-sm", "4px"], ["--radius-md", "6px"], ["--radius-lg", "8px"], ["--radius-xl", "12px"], ["--radius-2xl", "16px"], ["--radius-full", "9999px"]];
  const shadow = [["--shadow-1", "subtle hairline"], ["--shadow-2", "card rest"], ["--shadow-3", "raised / dropdown"], ["--shadow-4", "popover / toast"], ["--shadow-5", "modal"]];
  const spacing = [["--space-1", "4px"], ["--space-2", "8px"], ["--space-3", "12px"], ["--space-4", "16px"], ["--space-5", "20px"], ["--space-6", "24px"], ["--space-8", "32px"], ["--space-10", "40px"], ["--space-12", "48px"], ["--space-16", "64px"], ["--space-20", "80px"]];

  /* ─── Renderers ───────────────────────────────────────────── */
  const swatchCard = ([name, val, role]) => `
    <div class="swatch-card">
      <div class="swatch-chip" style="background:${val}"></div>
      <div class="swatch-info">
        <div class="swatch-name">${name}</div>
        <div class="swatch-val">${val}</div>
        ${role ? `<div class="swatch-role">${role}</div>` : ""}
      </div>
    </div>`;
  $("#grid-primary").innerHTML = primary.map(swatchCard).join("");
  $("#grid-neutral").innerHTML = neutral.map(swatchCard).join("");
  $("#grid-status").innerHTML = status.map(swatchCard).join("");
  $("#grid-chart").innerHTML = chart.map(swatchCard).join("");
  $("#sem-rows").innerHTML = semantic.map(([name, val, role]) => `
    <tr>
      <td><span class="swatch-dot" style="background:${val}"></span></td>
      <td><code>${name}</code></td>
      <td class="val">${val}</td>
      <td class="role">${role}</td>
    </tr>`).join("");
  $("#type-specimens").innerHTML = type.map(([tok, size, wt, sample]) => `
    <div class="type-row">
      <div class="type-meta"><b>--${tok}</b>${size} · weight ${wt}</div>
      <div style="font-size:${size}; font-weight:${wt}; letter-spacing:-0.01em; line-height:1.2;">${sample}</div>
    </div>`).join("");
  $("#radius-grid").innerHTML = radius.map(([tok, val]) => `
    <div class="demo-card">
      <div class="demo-box" style="border-radius:${val}"></div>
      <div class="demo-name">${tok}</div><div class="demo-val">${val}</div>
    </div>`).join("");
  $("#shadow-grid").innerHTML = shadow.map(([tok, role]) => `
    <div class="demo-card">
      <div class="demo-box sh" style="box-shadow:var(${tok}); border-radius:8px; background:var(--card)"></div>
      <div class="demo-name">${tok}</div><div class="demo-val">${role}</div>
    </div>`).join("");
  $("#spacing-list").innerHTML = spacing.map(([tok, val]) => `
    <div class="space-row">
      <span class="space-label">${tok}</span>
      <span class="space-bar" style="width:${val}"></span>
      <span class="demo-val">${val}</span>
    </div>`).join("");

  /* ─── Export code blocks ──────────────────────────────────── */
  const cssBlock = `:root {
  /* Primary · TOMS Indigo (hue 262) */
  --primary:            oklch(24% 0.060 262);
  --primary-hover:      oklch(32% 0.100 262);
  --primary-active:     oklch(18% 0.040 262);
  --primary-foreground: oklch(99% 0 0);

  /* Secondary · warm neutral */
  --secondary:            oklch(93.5% 0.006 90);
  --secondary-foreground: oklch(20% 0.010 90);

  /* Status */
  --success: oklch(58% 0.140 152);
  --warning: oklch(70% 0.160 70);
  --danger:  oklch(58% 0.200 25);
  --info:    oklch(60% 0.140 230);

  /* Background / Foreground (warm · hue 90) */
  --background:       oklch(99% 0.003 90);
  --foreground:       oklch(20% 0.010 90);
  --card:             oklch(100% 0 0);
  --muted:            oklch(97.2% 0.004 90);
  --muted-foreground: oklch(44% 0.010 90);

  /* Border / Input / Ring */
  --border: oklch(89% 0.010 90);
  --input:  oklch(89% 0.010 90);
  --ring:   oklch(40% 0.140 262);

  /* Chart */
  --chart-1: oklch(52% 0.160 240);
  --chart-2: oklch(60% 0.130 195);
  --chart-3: oklch(55% 0.140 152);
  --chart-4: oklch(68% 0.140 90);
  --chart-5: oklch(62% 0.170 60);

  --radius: 8px;
}`;
  const shadcnBlock = `/* shadcn/ui · Warm Theme · paste into globals.css @layer base */
:root {
  --background: oklch(99% 0.003 90);
  --foreground: oklch(20% 0.010 90);

  --card: oklch(100% 0 0);
  --card-foreground: oklch(20% 0.010 90);
  --popover: oklch(100% 0 0);
  --popover-foreground: oklch(20% 0.010 90);

  --primary: oklch(24% 0.060 262);
  --primary-foreground: oklch(99% 0 0);
  --secondary: oklch(93.5% 0.006 90);
  --secondary-foreground: oklch(20% 0.010 90);
  --muted: oklch(97.2% 0.004 90);
  --muted-foreground: oklch(44% 0.010 90);
  --accent: oklch(95.8% 0.005 90);
  --accent-foreground: oklch(20% 0.010 90);

  --destructive: oklch(58% 0.200 25);
  --destructive-foreground: oklch(99% 0 0);

  --border: oklch(89% 0.010 90);
  --input: oklch(89% 0.010 90);
  --ring: oklch(40% 0.140 262);

  --chart-1: oklch(52% 0.160 240);
  --chart-2: oklch(60% 0.130 195);
  --chart-3: oklch(55% 0.140 152);
  --chart-4: oklch(68% 0.140 90);
  --chart-5: oklch(62% 0.170 60);

  --radius: 0.5rem;
}`;
  const twBlock = `// tailwind.config.js — token source of truth stays in CSS vars.
// Reference them with var(--…) so light/warm switching is one import.
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          foreground: "var(--primary-foreground)",
        },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          1: "var(--chart-1)", 2: "var(--chart-2)", 3: "var(--chart-3)",
          4: "var(--chart-4)", 5: "var(--chart-5)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
};`;
  const figmaBlock = `{
  "Warm Theme": {
    "color": {
      "primary":            { "value": "oklch(24% 0.060 262)", "type": "color" },
      "primary-hover":      { "value": "oklch(32% 0.100 262)", "type": "color" },
      "primary-active":     { "value": "oklch(18% 0.040 262)", "type": "color" },
      "primary-foreground": { "value": "oklch(99% 0 0)",       "type": "color" },
      "secondary":          { "value": "oklch(93.5% 0.006 90)","type": "color" },
      "secondary-foreground":{ "value": "oklch(20% 0.010 90)", "type": "color" },
      "success":            { "value": "oklch(58% 0.140 152)", "type": "color" },
      "warning":            { "value": "oklch(70% 0.160 70)",  "type": "color" },
      "danger":             { "value": "oklch(58% 0.200 25)",  "type": "color" },
      "info":               { "value": "oklch(60% 0.140 230)", "type": "color" },
      "background":         { "value": "oklch(99% 0.003 90)",  "type": "color" },
      "foreground":         { "value": "oklch(20% 0.010 90)",  "type": "color" },
      "card":               { "value": "oklch(100% 0 0)",      "type": "color" },
      "muted":              { "value": "oklch(97.2% 0.004 90)","type": "color" },
      "muted-foreground":   { "value": "oklch(44% 0.010 90)",  "type": "color" },
      "border":             { "value": "oklch(89% 0.010 90)",  "type": "color" },
      "input":              { "value": "oklch(89% 0.010 90)",  "type": "color" },
      "ring":               { "value": "oklch(40% 0.140 262)", "type": "color" },
      "chart-1":            { "value": "oklch(52% 0.160 240)", "type": "color" },
      "chart-2":            { "value": "oklch(60% 0.130 195)", "type": "color" },
      "chart-3":            { "value": "oklch(55% 0.140 152)", "type": "color" },
      "chart-4":            { "value": "oklch(68% 0.140 90)",  "type": "color" },
      "chart-5":            { "value": "oklch(62% 0.170 60)",  "type": "color" }
    },
    "radius": {
      "sm": { "value": "4", "type": "borderRadius" },
      "md": { "value": "6", "type": "borderRadius" },
      "lg": { "value": "8", "type": "borderRadius" },
      "xl": { "value": "12", "type": "borderRadius" }
    },
    "spacing": {
      "1": { "value": "4", "type": "spacing" },
      "2": { "value": "8", "type": "spacing" },
      "3": { "value": "12", "type": "spacing" },
      "4": { "value": "16", "type": "spacing" },
      "6": { "value": "24", "type": "spacing" }
    }
  }
}`;
  $("#code-css").textContent = cssBlock;
  $("#code-shadcn").textContent = shadcnBlock;
  $("#code-tw").textContent = twBlock;
  $("#code-figma").textContent = figmaBlock;

  /* ─── Export tabs ─────────────────────────────────────────── */
  document.querySelectorAll(".exp-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.exp;
      document.querySelectorAll(".exp-tab").forEach(t => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".exp-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === key));
    });
  });

  /* ─── Copy buttons ────────────────────────────────────────── */
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const code = document.getElementById(btn.dataset.copy);
      try {
        await navigator.clipboard.writeText(code.textContent);
      } catch (e) {
        const r = document.createRange();
        r.selectNode(code);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
        document.execCommand("copy");
        s.removeAllRanges();
      }
      const orig = btn.textContent;
      btn.textContent = "Copied ✓";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove("copied");
      }, 1400);
    });
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "uploads/handoff-data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.ToastProvider = __ds_scope.ToastProvider;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Popover = __ds_scope.Popover;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Layout = __ds_scope.Layout;

__ds_ns.Grid = __ds_scope.Grid;

__ds_ns.GridItem = __ds_scope.GridItem;

__ds_ns.Stack = __ds_scope.Stack;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Switch = __ds_scope.Switch;

})();
