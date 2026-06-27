/* global React, ReactDOM, Icon */
// ───────────────────────────────────────────────────────────────
// TitleBar — ui-spec §7.0 ② / §8 统一标题栏模板。
//
// 渲染进 Shell 的固定 #titlebar-portal 横带（位于 TopNav 之下、滚动的
// .content 之上）。职责单一：页面标题（或详情头）+ 页面级操作。
//
//   • 基底（§8.1）：白底 --color-bg-2（非卡片，无边框卡/无 shadow）；
//     底部一条 1px --color-border-default 横线；左右内边距与内容区对齐；
//     不设 max-width（横向铺满）。
//   • 固定不滚 —— 横带在 .content 之外，绝不与 list-head / thead 的
//     sticky 偏移冲突（§7.2）。
//   • 插槽（除 title 外均可选）：
//       back · eyebrow · icon(实体图标) · title · subtitle
//       · badges · meta · actions · tabs(形态 E)
//
// 形态（§8.3）:
//   D  列表 / 首页   → title + subtitle + actions（单行紧凑，操作底对齐）
//   B  详情默认       → back + title + badges + meta + actions
//   C  带实体图标     → back + icon + title + badges + meta + actions
//   E  + 底部 Tab     → 上述任一 + tabs[]
//
// badges / meta / actions 接收已渲染节点，调用方保留自己的
// Badge / ContractBadge / Btn 实例与逻辑。
// ───────────────────────────────────────────────────────────────

const TitleBar = ({
  back,
  onBack,
  backLabel = 'Back',
  eyebrow,
  icon,
  title,
  subtitle,
  titleSize,          // 'lg' → 22px（实体名 / 列表头）
  badges,
  meta,
  actions,
  tabs,               // [{ id, label, count?, active, onClick }] — 形态 E
  tabsExtra,          // arbitrary node pinned to the right end of the tabs row (e.g. context hint)
  bottom,             // arbitrary node rendered in the bottom row — 形态 E′（Stepper / StatusTrack）
}) => {
  const [host, setHost] = React.useState(() =>
    (typeof document !== 'undefined' ? document.getElementById('titlebar-portal') : null));
  React.useEffect(() => {
    if (!host) setHost(document.getElementById('titlebar-portal'));
  }, [host]);
  if (!host) return null;

  // 单行（形态 D）：仅 title + subtitle + actions，无 back/icon/eyebrow/
  // badges/meta/tabs/bottom → 紧凑横带，操作底对齐。
  const compact = !back && !icon && !eyebrow && !badges && !meta && !tabs && !bottom;

  const bar = (
    <div className={`titlebar${tabs || bottom ? ' titlebar--tabs' : ''}${compact ? ' titlebar--compact' : ''}`}>
      <div className="titlebar__inner">
        <div className="titlebar__row">
          {back && (
            <button
              type="button"
              className="titlebar__back"
              title={backLabel}
              aria-label={backLabel}
              onClick={onBack}>
              <Icon name="chevL" size={18} />
            </button>
          )}
          {icon && <div className="titlebar__icon">{icon}</div>}
          <div className="titlebar__main">
            {eyebrow && <div className="titlebar__eyebrow">{eyebrow}</div>}
            <div className="titlebar__titlerow">
              <h1 className={`titlebar__title${titleSize === 'lg' ? ' titlebar__title--lg' : ''}`}>{title}</h1>
              {badges && <div className="titlebar__badges">{badges}</div>}
            </div>
            {subtitle && <p className="titlebar__subtitle">{subtitle}</p>}
            {meta && <div className="titlebar__meta">{meta}</div>}
          </div>
          {actions && <div className="titlebar__actions">{actions}</div>}
        </div>
        {tabs && (
          <div className="titlebar__tabs" role="tablist">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                role="tab"
                aria-selected={!!tb.active}
                className={`titlebar__tab${tb.active ? ' is-active' : ''}`}
                onClick={tb.onClick}>
                {tb.label}
                {typeof tb.count === 'number' && <span className="titlebar__tab-count">{tb.count}</span>}
              </button>
            ))}
            {tabsExtra && <div className="titlebar__tabs-extra">{tabsExtra}</div>}
          </div>
        )}
        {!tabs && bottom && (
          <div className="titlebar__bottom">{bottom}</div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(bar, host);
};

window.TitleBar = TitleBar;

// ─── Inject styles once ──────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('titlebar-styles')) {
  const s = document.createElement('style');
  s.id = 'titlebar-styles';
  s.textContent = `
/* The portal host band lives in .main, between .topbar and .content.
   Empty (no <TitleBar> mounted) → it collapses to nothing. */
.titlebar-portal { flex: none; }

/* §8.1 base — white surface, NOT a card, single bottom hairline, full-bleed. */
.titlebar {
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border-default);
}
.titlebar__inner {
  /* gutters align with .content / .page (32px); no max-width (§8.1). */
  padding: 0 32px;
}
.titlebar__row {
  display: flex;
  align-items: flex-start;   /* detail forms (B/C/E): top-aligned */
  gap: 16px;
  padding: 16px 0;
}
/* §8.1 form D: single-row title + subtitle + actions → compact, actions bottom-aligned. */
.titlebar--compact .titlebar__row {
  align-items: flex-end;
  padding: 10px 0;
}
.titlebar--tabs .titlebar__row { padding-bottom: 12px; }

.titlebar__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.titlebar__back:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.titlebar__back:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary-500) 25%, transparent);
}

.titlebar__icon {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.titlebar__main { flex: 1; min-width: 0; }

.titlebar__eyebrow {
  font-family: var(--font-family-mono);
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
  margin-bottom: 2px;
}
.titlebar__title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--color-text-primary);
  margin: 0;
  text-wrap: pretty;
}
.titlebar__title--lg { font-size: 22px; }
.titlebar__subtitle {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
  text-wrap: pretty;
}
/* §8.2: 状态徽章与标题同处一行（标题右侧），不再单列徽章行。 */
.titlebar__titlerow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.titlebar__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.titlebar__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.titlebar__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
}
/* §8.2: titlebar action buttons keep 13px label (match Search), height 36. */
.titlebar__actions .tds-btn,
.titlebar__actions .sb__primary { font-size: 13px; }

/* Form E — bottom tab row inside the same band; hairline moves below tabs. */
.titlebar__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.titlebar__tabs-extra {
  margin-left: auto;
  display: flex;
  align-items: center;
}
/* Form E′ — bottom row hosting a Stepper / StatusTrack (arbitrary node). */
.titlebar__bottom { display: block; }
.titlebar__bottom > .stepper { margin: 0; padding: 0; }
.titlebar__tab {
  position: relative;
  background: transparent;
  border: 0;
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 6px 6px 0 0;
}
.titlebar__tab:hover { color: var(--color-text-primary); background: var(--color-bg-hover); }
.titlebar__tab.is-active { color: var(--color-text-primary); }
.titlebar__tab.is-active::after {
  content: '';
  position: absolute;
  left: 8px; right: 8px; bottom: -1px;
  height: 2px;
  background: var(--color-primary-700);
  border-radius: 2px;
}
.titlebar__tab-count {
  margin-left: 6px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}
`;
  document.head.appendChild(s);
}
