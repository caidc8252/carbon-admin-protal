/* global React, Icon, Btn, useToast */
// ─────────────────────────────────────────────────────────────
// Notification detail — the landing for clicking any notification
// (from the bell popover or the full list). Inbox → detail → record.
//
// Why this exists: some notifications carry content that lives nowhere
// else — the note an assigner typed, the comment an ISO left, an
// approval rationale. This page shows that full content + who/when +
// structured metadata, then a primary CTA that opens the underlying
// record (ticket / customer / app / order / approvals).
//
// Exposes window.NotificationDetail. Props: { id, nav, onBack }.
// ─────────────────────────────────────────────────────────────
(function () {
  const MODULE = window.NC_MODULE;

  function Avatar({ initials }) {
    return <span className="ndet-avatar">{initials}</span>;
  }

  function ModuleChip({ module }) {
    const m = MODULE[module];
    if (!m) return null;
    return (
      <span className="nc-modchip"
        style={{ background: m.bg, color: m.fg, borderColor: m.bd }}>
        <Icon name={m.icon} size={12} /> {m.label}
      </span>
    );
  }

  window.NotificationDetail = function NotificationDetail({ id, nav, onBack }) {
    const toast = useToast();
    const { items, markRead, markUnread } = window.useNotifications();
    const n = items.find((x) => x.id === id) || null;

    // Opening detail marks it read.
    React.useEffect(() => {
      if (n && n.unread) markRead(n.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (!n) {
      return (
        <div className="page page--detail">
          <window.TitleBar back onBack={onBack} backLabel="Notifications" title="Notification not found" />
          <div className="empty">Notification not found. <a onClick={onBack} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to notifications</a></div>
        </div>
      );
    }

    const e = window.NC_enrich(n);

    const openRecord = () => {
      if (e.cta && e.cta.nav) window.NC_resolveNav(e.cta.nav, nav);
    };

    return (
      <div className="page page--detail">
        <window.TitleBar
          back
          onBack={onBack}
          backLabel="Notifications"
          title={n.title}
          badges={<ModuleChip module={n.module} />}
          meta={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {e.actor && <>
              <span className="ndet-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{e.actor.initials}</span>
              <span><span className="ndet__actor-label">{e.actorLabel}</span> <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{e.actor.name}</strong>{e.actor.role ? ` · ${e.actor.role}` : ''}</span>
              <span className="ndet__dotsep">·</span>
            </>}
            <span className="ndet__time"><Icon name="clock" size={13} /> {n.time}</span>
          </span>}
        />

        <div className="ndet">
          {/* Detail body */}
          <div className="ndet__section">
            {e.detailKind === 'quote' ? (
              <blockquote className="ndet__quote">{e.detail}</blockquote>
            ) : (
              <p className="ndet__detail">{e.detail}</p>
            )}
          </div>

          {/* Metadata */}
          {e.meta && e.meta.length > 0 && (
            <div className="ndet__metagrid">
              {e.meta.filter((r) => r.value).map((r, i) => (
                <div className="ndet__metarow" key={i}>
                  <span className="ndet__meta-label">{r.label}</span>
                  <span className={`ndet__meta-value ${r.mono ? 'is-mono' : ''}`}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="ndet__actions">
            {e.cta && (
              <Btn variant="primary" onClick={openRecord}>
                {e.cta.label} <Icon name="chevR" size={15} />
              </Btn>
            )}
          </div>
        </div>
      </div>
    );
  };
})();
