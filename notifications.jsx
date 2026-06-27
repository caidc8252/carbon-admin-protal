/* global React, Icon */
// ─────────────────────────────────────────────────────────────
// Notification center — shared store + top-bar bell popover.
//
// Admin (NPT) scope only. Surfaces the actionable, operator-facing
// events agreed in the notification spec: Tickets, Customer invites,
// Apps, Orders. Nothing marketing, nothing decorative —
// every row points at one concrete next step (the `nav` descriptor).
//
// The popover is a quick "scan the latest" surface: NO category tabs,
// newest-first, capped at 20, grouped Today / Earlier, with a
// "View all notifications" footer that routes to the full page
// (notifications-page.jsx). Both surfaces read/write the same store
// so marking-read stays in sync.
//
// Exposes:
//   window.NC_MODULE       — module → { icon, label, tint } map
//   window.useNotifications() — hook → { items, unread, markRead, markAllRead }
//   window.NotificationBell — the top-bar bell + popover
// ─────────────────────────────────────────────────────────────
(function () {
  const { useState, useRef, useEffect } = React;

  // ── Module taxonomy → icon + tint ──────────────────────────
  // Tints map onto the semantic token trios so the bell reads the
  // same as the rest of the console.
  const MODULE = {
    ticket:   { icon: 'ticket',  label: 'Tickets',   bg: 'var(--color-info-50)',    fg: 'var(--color-info-700)',    bd: 'oklch(60% 0.14 230 / 0.25)' },
    customer: { icon: 'users',   label: 'Customers', bg: 'var(--color-primary-50)', fg: 'var(--color-primary-700)', bd: 'oklch(60% 0.14 262 / 0.25)' },
    app:      { icon: 'package', label: 'Apps',      bg: 'oklch(95% 0.04 300)',     fg: 'var(--color-accent-600)',  bd: 'oklch(60% 0.14 300 / 0.25)' },
    order:    { icon: 'cash',    label: 'Orders',    bg: 'var(--color-success-50)', fg: 'var(--color-success-700)', bd: 'oklch(65% 0.14 150 / 0.25)' },
  };
  window.NC_MODULE = MODULE;

  // ── Seed notifications (newest first) ───────────────────────
  // `nav` is a descriptor resolved by the bell / page onto a route.
  // `group`: 'today' | 'earlier' drives the popover section header.
  const SEED = [
    // ── Today ──
    { id: 'n-01', module: 'ticket',   unread: true,  group: 'today',
      title: 'A ticket was assigned to you',
      body: 'T-2026-003 · Security alert — escalated to NPT',
      time: '5 min ago', nav: { kind: 'ticket', id: 'T-2026-003' } },
    { id: 'n-03', module: 'ticket',   unread: true,  group: 'today',
      title: 'A ticket was escalated to NPT',
      body: 'Brightleaf Retail raised T-2026-008 to the NPT queue',
      time: '40 min ago', nav: { kind: 'ticket', id: 'T-2026-008' } },
    { id: 'n-04', module: 'app',      unread: true,  group: 'today',
      title: 'A subscribed app was unpublished',
      body: 'Smart Receipt was withdrawn by its publisher',
      time: '1 h ago', nav: { kind: 'app', id: 'app-smart-receipt' } },
    { id: 'n-05', module: 'ticket',   unread: true,  group: 'today',
      title: 'New comment on a ticket you handle',
      body: 'ISO replied on T-2026-001 · Payment failure',
      time: '2 h ago', nav: { kind: 'ticket', id: 'T-2026-001' } },
    { id: 'n-06', module: 'customer', unread: true,  group: 'today',
      title: 'Invitation accepted',
      body: 'li.mei@northwind.io registered and accepted your invite',
      time: '3 h ago', nav: { kind: 'customer', id: 'c-001' } },
    { id: 'n-07', module: 'order',    unread: false, group: 'today',
      title: 'Your order is complete',
      body: 'SO-2026-0184 completed · sample devices activated',
      time: '5 h ago', nav: { kind: 'order', id: 'o-2026-0184' } },

    // ── Earlier ──
    { id: 'n-09', module: 'ticket',   unread: false, group: 'earlier',
      title: 'A ticket you handled was reopened',
      body: 'T-2026-006 was reopened by the ISO',
      time: 'Yesterday 14:12', nav: { kind: 'ticket', id: 'T-2026-006' } },
    { id: 'n-10', module: 'customer', unread: false, group: 'earlier',
      title: 'Invitation link expires tomorrow',
      body: 'Your invite to Helios Payments expires in 24 hours',
      time: 'Yesterday 11:05', nav: { kind: 'customer', id: 'c-002' } },
    { id: 'n-11', module: 'app',      unread: false, group: 'earlier',
      title: 'App version scan completed',
      body: 'Loyalty+ 1.4.0-rc1 scan result: dirty',
      time: 'Yesterday 08:22', nav: { kind: 'app', id: 'app-loyalty-plus' } },
    { id: 'n-12', module: 'ticket',   unread: false, group: 'earlier',
      title: 'NPT replied to your ticket',
      body: 'Resolution posted on T-2026-002 · Terminal offline',
      time: 'May 31 17:30', nav: { kind: 'ticket', id: 'T-2026-002' } },
    { id: 'n-14', module: 'order',    unread: false, group: 'earlier',
      title: 'Your order is complete',
      body: 'SO-2026-0179 completed · 24 devices activated',
      time: 'May 30 15:02', nav: { kind: 'order', id: 'o-2026-0179' } },
    { id: 'n-15', module: 'customer', unread: false, group: 'earlier',
      title: 'Invitation accepted',
      body: 'ops@brightleaf.co registered and accepted your invite',
      time: 'May 30 09:48', nav: { kind: 'customer', id: 'c-003' } },
    { id: 'n-16', module: 'ticket',   unread: false, group: 'earlier',
      title: 'A ticket was assigned to you',
      body: 'T-2026-004 · Firmware rollback request',
      time: 'May 29 13:20', nav: { kind: 'ticket', id: 'T-2026-004' } },
    { id: 'n-17', module: 'app',      unread: false, group: 'earlier',
      title: 'App version scan completed',
      body: 'Fleet Insights 2.1.0 scan result: clean',
      time: 'May 29 08:05', nav: { kind: 'app', id: 'app-fleet-insights' } },
    { id: 'n-18', module: 'customer', unread: false, group: 'earlier',
      title: 'Invitation link expired',
      body: 'Your invite to Cypress Roastery expired unused',
      time: 'May 28 23:59', nav: { kind: 'customer', id: 'c-004' } },
    { id: 'n-19', module: 'ticket',   unread: false, group: 'earlier',
      title: 'New comment on a ticket you handle',
      body: 'ISO replied on T-2026-005 · Settlement mismatch',
      time: 'May 28 16:41', nav: { kind: 'ticket', id: 'T-2026-005' } },
    { id: 'n-21', module: 'order',    unread: false, group: 'earlier',
      title: 'Your order is complete',
      body: 'SO-2026-0173 completed · 12 devices activated',
      time: 'May 27 14:30', nav: { kind: 'order', id: 'o-2026-0173' } },
    { id: 'n-22', module: 'app',      unread: false, group: 'earlier',
      title: 'A subscribed app was unpublished',
      body: 'Tip Manager was withdrawn by its publisher',
      time: 'May 27 10:18', nav: { kind: 'app', id: 'app-tip-manager' } },
    { id: 'n-23', module: 'ticket',   unread: false, group: 'earlier',
      title: 'A ticket you handled was reopened',
      body: 'T-2026-007 was reopened by the ISO',
      time: 'May 26 19:55', nav: { kind: 'ticket', id: 'T-2026-007' } },
    { id: 'n-24', module: 'customer', unread: false, group: 'earlier',
      title: 'Invitation accepted',
      body: 'admin@cypressroast.com registered and accepted your invite',
      time: 'May 26 12:03', nav: { kind: 'customer', id: 'c-005' } },
    { id: 'n-25', module: 'ticket',   unread: false, group: 'earlier',
      title: 'NPT replied to your ticket',
      body: 'Resolution posted on T-2026-003 · Security alert',
      time: 'May 25 17:22', nav: { kind: 'ticket', id: 'T-2026-003' } },
    { id: 'n-27', module: 'app',      unread: false, group: 'earlier',
      title: 'App version scan completed',
      body: 'Smart Receipt 3.0.0 scan result: clean',
      time: 'May 24 15:11', nav: { kind: 'app', id: 'app-smart-receipt' } },
    { id: 'n-28', module: 'order',    unread: false, group: 'earlier',
      title: 'Your order is complete',
      body: 'SO-2026-0168 completed · 6 devices activated',
      time: 'May 24 11:27', nav: { kind: 'order', id: 'o-2026-0168' } },
    { id: 'n-29', module: 'ticket',   unread: false, group: 'earlier',
      title: 'A ticket was escalated to NPT',
      body: 'Helios Payments raised T-2026-009 to the NPT queue',
      time: 'May 23 14:48', nav: { kind: 'ticket', id: 'T-2026-009' } },
    { id: 'n-30', module: 'customer', unread: false, group: 'earlier',
      title: 'Invitation link expired',
      body: 'Your invite to Pier 41 Foods expired unused',
      time: 'May 23 08:00', nav: { kind: 'customer', id: 'c-006' } },
  ];

  // ── Shared store ────────────────────────────────────────────
  // One source of truth behind the bell popover, the full page and
  // the detail view; subscribers re-render on mutation. `arrival`
  // listeners fire only on a brand-new notification (push) so the
  // toaster can slide it in without re-toasting the whole list.
  let items = SEED.map((n) => ({ ...n }));
  const listeners = new Set();
  const arrivals = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  const store = {
    get: () => items,
    getById: (id) => items.find((n) => n.id === id) || null,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    subscribeArrival(fn) { arrivals.add(fn); return () => arrivals.delete(fn); },
    markRead(id) { items = items.map((n) => n.id === id ? { ...n, unread: false } : n); emit(); },
    markUnread(id) { items = items.map((n) => n.id === id ? { ...n, unread: true } : n); emit(); },
    markAllRead() { items = items.map((n) => ({ ...n, unread: false })); emit(); },
    push(n) {
      // Prepend as newest + unread, then notify arrival listeners.
      items = [{ ...n, unread: true, group: 'today' }, ...items];
      emit();
      arrivals.forEach((fn) => fn(items[0]));
    },
  };
  window.__ncStore = store;

  window.useNotifications = function useNotifications() {
    const [, force] = useState(0);
    useEffect(() => store.subscribe(() => force((x) => x + 1)), []);
    const list = store.get();
    return {
      items: list,
      unread: list.filter((n) => n.unread).length,
      markRead: store.markRead,
      markUnread: store.markUnread,
      markAllRead: store.markAllRead,
    };
  };

  // Resolve a notification's `nav` descriptor onto route helpers.
  window.NC_resolveNav = function (d, nav) {
    if (!d || !nav) return;
    switch (d.kind) {
      case 'ticket':    return nav.ticket?.(d.id);
      case 'customer':  return nav.customer?.(d.id);
      case 'app':       return nav.app?.(d.id);
      case 'order':     return nav.order?.(d.id);
      default: return;
    }
  };

  // ── Detail enrichment ───────────────────────────────────────
  // Notifications carry content that lives nowhere else — the note an
  // assigner typed, the comment an ISO left. The
  // detail page needs that. We infer a `kind` from the title (no need to
  // migrate every seed row) and synthesize a realistic actor + body +
  // metadata + the CTA that opens the underlying record.
  const NPT_PEOPLE = [
    { name: 'Maya Hernandez', role: 'Tier 2 Support',  initials: 'MH' },
    { name: 'Ravi Kapoor',    role: 'Onboarding Ops',  initials: 'RK' },
    { name: 'Sofia Chen',     role: 'Contracts Lead',  initials: 'SC' },
    { name: 'Liam Thompson',  role: 'Tier 2 Support',  initials: 'LT' },
    { name: 'Wei Chen',       role: 'Risk Manager',    initials: 'WC' },
  ];
  const ISO_ORGS = ['Brightleaf Retail', 'Helios Payments', 'Northwind Commerce', 'Cypress Roastery', 'Pier 41 Foods'];
  const pick = (arr, seed) => {
    let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return arr[h % arr.length];
  };

  function kindOf(n) {
    const t = n.title.toLowerCase();
    if (n.module === 'ticket') {
      if (t.includes('assigned'))  return 'ticket.assigned';
      if (t.includes('escalated')) return 'ticket.escalated';
      if (t.includes('comment'))   return 'ticket.comment';
      if (t.includes('reopened'))  return 'ticket.reopened';
      if (t.includes('replied'))   return 'ticket.reply';
    }
    if (n.module === 'customer') {
      if (t.includes('accepted')) return 'customer.accepted';
      if (t.includes('expires'))  return 'customer.expiring';
      if (t.includes('expired'))  return 'customer.expired';
    }
    if (n.module === 'app') {
      if (t.includes('unpublished')) return 'app.unpublished';
      if (t.includes('scan'))        return 'app.scan';
    }
    if (n.module === 'order') return 'order.complete';
    return n.module;
  }
  window.NC_kindOf = kindOf;

  // Returns { actorLabel, actor, detail, detailKind, meta, cta }.
  // `cta` is { label, nav } — the button that opens the related record.
  window.NC_enrich = function (n) {
    const ref = n.nav && n.nav.id ? n.nav.id : null;
    const org = pick(ISO_ORGS, n.id);
    const who = pick(NPT_PEOPLE, n.id);
    const k = kindOf(n);
    const ticketCta  = ref ? { label: `Open ticket ${ref}`, nav: n.nav } : null;
    const custCta    = { label: 'Open customer', nav: n.nav };
    const appCta     = { label: 'Open app', nav: n.nav };
    const orderCta   = ref ? { label: `Open order ${ref}`, nav: n.nav } : null;

    switch (k) {
      case 'ticket.assigned':
        return {
          actorLabel: 'Assigned by', actor: who,
          detailKind: 'note',
          detail: `${org} reports intermittent card-reader failures on 3 of 8 checkout lanes since the 2.4.1 firmware push. Terminal logs show EMV kernel timeouts on tap. Assigning to you for L2 triage — please confirm whether a firmware rollback is warranted before end of day.`,
          meta: [
            { label: 'Ticket', value: ref, mono: true },
            { label: 'Priority', value: 'High' },
            { label: 'Customer', value: org },
            { label: 'SLA due', value: 'in 4 hours' },
          ],
          cta: ticketCta,
        };
      case 'ticket.escalated':
        return {
          actorLabel: 'Escalated by', actor: { name: org, role: 'ISO contact', initials: org.slice(0, 2).toUpperCase() },
          detailKind: 'note',
          detail: `Tier 1 could not resolve within SLA. Customer's settlement batch is failing nightly and the store cannot reconcile. Escalating to the NPT queue for engineering review — full diagnostic bundle attached on the ticket.`,
          meta: [
            { label: 'Ticket', value: ref, mono: true },
            { label: 'Raised by', value: org },
            { label: 'Queue', value: 'NPT · Engineering' },
            { label: 'Priority', value: 'High' },
          ],
          cta: ticketCta,
        };
      case 'ticket.comment':
        return {
          actorLabel: 'Comment from', actor: { name: org, role: 'ISO contact', initials: org.slice(0, 2).toUpperCase() },
          detailKind: 'quote',
          detail: `We tried the suggested re-pairing steps on two terminals and the issue persists after reboot. Attaching a fresh log export from this morning — the timeout still appears around 06:14 UTC. Let us know if you need remote access to the device.`,
          meta: [
            { label: 'Ticket', value: ref, mono: true },
            { label: 'Commenter', value: org },
          ],
          cta: ticketCta,
        };
      case 'ticket.reopened':
        return {
          actorLabel: 'Reopened by', actor: { name: org, role: 'ISO contact', initials: org.slice(0, 2).toUpperCase() },
          detailKind: 'note',
          detail: `The fix held for 3 days but the card-reader timeout returned this morning on the same lane. Reopening — please re-investigate; we can provide a maintenance window tonight after 22:00 local.`,
          meta: [
            { label: 'Ticket', value: ref, mono: true },
            { label: 'Reopened by', value: org },
            { label: 'Previously', value: 'Resolved' },
          ],
          cta: ticketCta,
        };
      case 'ticket.reply':
        return {
          actorLabel: 'Resolved by', actor: who,
          detailKind: 'note',
          detail: `Root cause was an EMV kernel regression in 2.4.1. Pushed the 2.4.2 hotfix to the affected fleet and confirmed clean transactions on all lanes for 24h. Marking resolved — please confirm on your side before we close.`,
          meta: [
            { label: 'Ticket', value: ref, mono: true },
            { label: 'Resolved by', value: who.name },
            { label: 'Resolution', value: 'Firmware hotfix 2.4.2' },
          ],
          cta: ticketCta,
        };
      case 'customer.accepted':
        return {
          actorLabel: null, actor: null,
          detailKind: 'note',
          detail: `The operator you invited has completed registration and accepted the invitation. The customer account is now active and ready for contract setup.`,
          meta: [
            { label: 'Operator', value: n.body.split(' ')[0] },
            { label: 'Status', value: 'Active' },
            { label: 'Invited by', value: 'You' },
          ],
          cta: custCta,
        };
      case 'customer.expiring':
        return {
          actorLabel: null, actor: null,
          detailKind: 'note',
          detail: `The invitation link you sent has not been used and expires within 24 hours. After expiry the operator will need a fresh invitation to register.`,
          meta: [
            { label: 'Expires', value: 'in 24 hours' },
            { label: 'Status', value: 'Pending' },
            { label: 'Invited by', value: 'You' },
          ],
          cta: { label: 'Open customer · resend invite', nav: n.nav },
        };
      case 'customer.expired':
        return {
          actorLabel: null, actor: null,
          detailKind: 'note',
          detail: `The invitation link you sent expired before it was used. Send a new invitation if this operator still needs access.`,
          meta: [
            { label: 'Status', value: 'Expired' },
            { label: 'Invited by', value: 'You' },
          ],
          cta: { label: 'Open customer · resend invite', nav: n.nav },
        };
      case 'app.unpublished':
        return {
          actorLabel: 'Publisher', actor: null,
          detailKind: 'note',
          detail: `The publisher has withdrawn this app from the catalog. Subscribed terminals will keep the installed version, but no new installs or updates are available until it is republished.`,
          meta: [
            { label: 'App', value: n.body.split(' was')[0] },
            { label: 'Action', value: 'Unpublished' },
          ],
          cta: appCta,
        };
      case 'app.scan': {
        const dirty = /dirty/i.test(n.body);
        return {
          actorLabel: null, actor: null,
          detailKind: 'note',
          detail: dirty
            ? `The security scan flagged this version. 1 high and 2 medium findings were detected, including an over-broad permission request. Review the report before promoting this version to the catalog.`
            : `The security scan completed with no findings. This version is clear to promote to the catalog.`,
          meta: [
            { label: 'App version', value: n.body.split(' scan')[0], mono: true },
            { label: 'Result', value: dirty ? 'Dirty · 3 findings' : 'Clean' },
          ],
          cta: appCta,
        };
      }
      case 'order.complete':
        return {
          actorLabel: null, actor: null,
          detailKind: 'note',
          detail: `All sample devices on this order have been activated and the order is now complete. Activation records are available on the order detail page.`,
          meta: [
            { label: 'Order', value: ref, mono: true },
            { label: 'Status', value: 'Complete' },
          ],
          cta: orderCta,
        };
      default:
        return { actorLabel: null, actor: null, detailKind: 'note', detail: n.body, meta: [], cta: null };
    }
  };

  // ── A single notification row (popover) ─────────────────────
  function Row({ n, onOpen, onMarkRead }) {
    const m = MODULE[n.module];
    return (
      <div className={`nc-row ${n.unread ? 'is-unread' : 'is-read'}`}
        role="button" tabIndex={0}
        onClick={() => onOpen(n)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(n); } }}>
        <span className="nc-row__dot" />
        <span className="nc-row__icon"
          style={{ background: m.bg, color: m.fg, borderColor: m.bd }}>
          <Icon name={m.icon} size={15} />
        </span>
        <div className="nc-row__main">
          <div className="nc-row__title">{n.title}</div>
          <div className="nc-row__body">{n.body}</div>
          <div className="nc-row__time">{n.time}</div>
        </div>
        {n.unread ? (
          <button type="button" className="nc-row__mark"
            title="Mark as read"
            onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}>
            <Icon name="check" size={13} />
          </button>
        ) : (
          <span className="nc-row__chev"><Icon name="chevR" size={14} /></span>
        )}
      </div>
    );
  }

  const GROUP_LABEL = { today: 'Today', earlier: 'Earlier' };
  const POPOVER_CAP = 20;

  // ── The bell + popover ──────────────────────────────────────
  window.NotificationBell = function NotificationBell({ onOpen, onViewAll, toast }) {
    const { items, unread, markRead, markAllRead } = window.useNotifications();
    const [open, setOpen] = useState(false);
    const popRef = useRef(null);
    const btnRef = useRef(null);

    // Outside-click + Escape close
    useEffect(() => {
      if (!open) return;
      const onDown = (e) => {
        if (popRef.current && !popRef.current.contains(e.target) &&
            btnRef.current && !btnRef.current.contains(e.target)) {
          setOpen(false);
        }
      };
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDown);
        document.removeEventListener('keydown', onKey);
      };
    }, [open]);

    const allRead = () => {
      markAllRead();
      toast?.('All notifications marked as read', 'success');
    };
    const openNotif = (n) => {
      markRead(n.id);
      setOpen(false);
      onOpen?.(n.id);
    };
    const viewAll = () => {
      setOpen(false);
      onViewAll?.();
    };

    // Unread-only triage list. Reading a row marks it read → it drops out
    // of the popover (the full archive lives on the View-all page). Newest-
    // first, capped, grouped Today / Earlier.
    const unreadItems = items.filter((n) => n.unread);
    const recent = unreadItems.slice(0, POPOVER_CAP);
    const truncated = unreadItems.length - recent.length; // unread beyond the cap
    const hasHistory = items.length > 0;                  // any read history to browse
    const groups = ['today', 'earlier']
      .map((g) => ({ g, rows: recent.filter((n) => n.group === g) }))
      .filter((x) => x.rows.length > 0);

    return (
      <div className="nc">
        <button ref={btnRef} type="button"
          className={`iconbtn nc__bell ${open ? 'is-open' : ''}`}
          aria-label="Notifications"
          aria-expanded={open}
          title={unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
          onClick={() => setOpen((v) => !v)}>
          <Icon name="bell" size={15} />
          {unread > 0 && (
            <span className="nc__badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>

        {open && (
          <div ref={popRef} className="nc-pop" role="dialog" aria-label="Notifications">
            <div className="nc-pop__head">
              <span className="nc-pop__title">Notifications</span>
              {unread > 0 && <span className="nc-pop__count">{unread}</span>}
              <button type="button" className="nc-pop__allread"
                onClick={allRead} disabled={unread === 0}>
                <Icon name="check" size={13} /> Mark all as read
              </button>
            </div>

            <div className="nc-pop__scroll">
              {groups.length === 0 ? (
                <div className="nc-empty">
                  <Icon name={hasHistory ? 'check' : 'bell'} size={30} />
                  <div className="nc-empty__t">{hasHistory ? "You're all caught up" : 'No notifications'}</div>
                  <div className="nc-empty__s">
                    {hasHistory
                      ? 'No unread notifications.'
                      : 'New tickets and order updates show up here.'}
                  </div>
                </div>
              ) : groups.map(({ g, rows }) => (
                <div key={g}>
                  <div className="nc-group">{GROUP_LABEL[g]}</div>
                  {rows.map((n) => (
                    <Row key={n.id} n={n} onOpen={openNotif} onMarkRead={markRead} />
                  ))}
                </div>
              ))}
            </div>

            <div className="nc-pop__foot">
              {truncated > 0 && (
                <div className="nc-pop__more-hint">Showing {recent.length} of {unreadItems.length} unread</div>
              )}
              <button type="button" className="nc-pop__viewall" onClick={viewAll}>
                View all notifications <Icon name="chevR" size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Demo: synthesize an incoming notification ───────────────
  // For the prototype only — lets you watch a fresh notification
  // arrive (badge bump + toast). In production, store.push() would
  // be called by the live event feed instead.
  const DEMO_POOL = [
    { module: 'ticket',   title: 'A ticket was assigned to you',
      body: 'T-2026-014 · Card reader timeout on lane 2', nav: { kind: 'ticket', id: 'T-2026-014' } },
    { module: 'ticket',   title: 'New comment on a ticket you handle',
      body: 'ISO replied on T-2026-008 · Settlement batch', nav: { kind: 'ticket', id: 'T-2026-008' } },
    { module: 'customer', title: 'Invitation accepted',
      body: 'ops@pier41foods.com registered and accepted your invite', nav: { kind: 'customer', id: 'c-006' } },
    { module: 'app',      title: 'A subscribed app was unpublished',
      body: 'Queue Buster was withdrawn by its publisher', nav: { kind: 'app', id: 'app-queue-buster' } },
  ];
  let demoSeq = 0;
  window.NC_simulate = function () {
    const base = DEMO_POOL[demoSeq % DEMO_POOL.length];
    demoSeq += 1;
    store.push({ ...base, id: `n-live-${Date.now()}`, time: 'Just now' });
  };

  // ── Toaster — slides an arriving notification in, top-right ──
  // Quiet, infra-grade: 8px translate + fade, auto-dismiss, hover to
  // pause, click to open its detail, ✕ to dismiss (stays unread in
  // the list). Stacks newest-on-top, capped. No bell shake.
  const TOAST_MS = 6000;
  const TOAST_CAP = 3;

  function Toast({ t, onOpen, onClose }) {
    const m = MODULE[t.module];
    const [leaving, setLeaving] = useState(false);
    const timer = useRef(null);
    const start = () => { timer.current = setTimeout(() => close(), TOAST_MS); };
    const close = () => { setLeaving(true); setTimeout(() => onClose(t.toastId), 200); };
    useEffect(() => { start(); return () => clearTimeout(timer.current); }, []);
    return (
      <div className={`nc-toast nc-toast--${t.module} ${leaving ? 'is-leaving' : ''}`}
        role="button" tabIndex={0}
        onMouseEnter={() => clearTimeout(timer.current)}
        onMouseLeave={start}
        onClick={() => { clearTimeout(timer.current); onOpen(t); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { clearTimeout(timer.current); onOpen(t); } }}>
        <span className="nc-toast__edge" style={{ background: m.fg }} />
        <span className="nc-toast__icon" style={{ background: m.bg, color: m.fg, borderColor: m.bd }}>
          <Icon name={m.icon} size={15} />
        </span>
        <div className="nc-toast__main">
          <div className="nc-toast__title">{t.title}</div>
          <div className="nc-toast__body">{t.body}</div>
        </div>
        <button type="button" className="nc-toast__x"
          aria-label="Dismiss"
          onClick={(e) => { e.stopPropagation(); clearTimeout(timer.current); close(); }}>
          <Icon name="x" size={13} />
        </button>
      </div>
    );
  }

  window.NotificationToaster = function NotificationToaster({ onOpen }) {
    const [stack, setStack] = useState([]);
    useEffect(() => store.subscribeArrival((n) => {
      setStack((s) => [{ ...n, toastId: `${n.id}-${Math.random().toString(36).slice(2, 7)}` }, ...s].slice(0, TOAST_CAP));
    }), []);
    const dismiss = (toastId) => setStack((s) => s.filter((x) => x.toastId !== toastId));
    const open = (t) => {
      store.markRead(t.id);
      dismiss(t.toastId);
      onOpen?.(t.id);
    };
    if (stack.length === 0) return null;
    return (
      <div className="nc-toaster" aria-live="polite">
        {stack.map((t) => (
          <Toast key={t.toastId} t={t} onOpen={open} onClose={dismiss} />
        ))}
      </div>
    );
  };
})();
