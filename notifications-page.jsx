/* global React, Icon, Btn, useToast, SearchBar, SearchInput, SearchSelect,
   ActiveFilters, FilterChip, useSearchBar */
// ─────────────────────────────────────────────────────────────
// Notifications — full page (the bell popover's "View all" target).
//
// Unlike the popover (a quick newest-20 scan with no tabs), the full
// page is where classification + history live. It follows the project
// list-page convention verbatim (CLAUDE.md): SearchBar with draft/
// applied state, click Search / Enter to apply, ActiveFilters chips,
// ListCard + sticky head + standard Pagination.
//
// Classification is exposed as a Module filter (Tickets / Customers /
// Apps / Orders) plus a Status filter (Unread / Read),
// alongside free-text search — matching how every other list page
// filters. No export (per product decision).
//
// Exposes window.NotificationsPage. Props: { nav } (route helpers).
// ─────────────────────────────────────────────────────────────
(function () {
  const { useState } = React;

  const MODULE = window.NC_MODULE;
  const MODULE_OPTS = [
    { value: 'All',      label: 'All types' },
    { value: 'ticket',   label: 'Tickets' },
    { value: 'customer', label: 'Customers' },
    { value: 'app',      label: 'Apps' },
    { value: 'order',    label: 'Orders' },
  ];
  const STATUS_OPTS = [
    { value: 'All',    label: 'All status' },
    { value: 'Unread', label: 'Unread' },
    { value: 'Read',   label: 'Read' },
  ];
  const MODULE_LABEL = Object.fromEntries(MODULE_OPTS.map((o) => [o.value, o.label]));

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

  window.NotificationsPage = function NotificationsPage({ onOpen }) {
    const toast = useToast();
    const { items, unread, markRead, markAllRead } = window.useNotifications();
    const { draft, applied, setDraft, runSearch, clearAll, clearOne, hasFilters } =
      useSearchBar({ q: '', module: 'All', status: 'All' });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const onSearch = () => { runSearch(); setPage(1); };

    // Filter on applied.* (never draft.*)
    const q = applied.q.trim().toLowerCase();
    const filtered = items.filter((n) => {
      if (applied.module !== 'All' && n.module !== applied.module) return false;
      if (applied.status === 'Unread' && !n.unread) return false;
      if (applied.status === 'Read' && n.unread) return false;
      if (q && !(`${n.title} ${n.body}`.toLowerCase().includes(q))) return false;
      return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, filtered.length);
    const pageRows = filtered.slice(pageStart, pageEnd);

    const open = (n) => {
      markRead(n.id);
      onOpen?.(n.id);
    };
    const allRead = () => {
      if (unread === 0) return;
      markAllRead();
      toast({ kind: 'success', title: 'All notifications marked as read' });
    };

    const toolbarRef = React.useRef(null);

    return (
      <div className="page page--list">
        <window.TitleBar
          title="Notifications"
          subtitle="Every actionable update across tickets, customers, apps and orders. Click a notification to open the related record."
          actions={<Btn variant="secondary" size="sm" icon="check" disabled={unread === 0} onClick={allRead}>Mark all as read</Btn>}
        />

        <div ref={toolbarRef} className="list-toolbar-wrap">
          <SearchBar onSearch={onSearch} sticky={false}>
            <SearchInput
              value={draft.q}
              onChange={(v) => setDraft({ q: v })}
              onSearch={onSearch}
              placeholder="Search notifications…" />
            <SearchSelect
              value={draft.module}
              onChange={(v) => setDraft({ module: v })}
              options={MODULE_OPTS}
              icon="filter" />
            <SearchSelect
              value={draft.status}
              onChange={(v) => setDraft({ status: v })}
              options={STATUS_OPTS} />
          </SearchBar>

          <ActiveFilters
            onClearAll={clearAll}
            hasFilters={hasFilters}>
            {applied.q ? <FilterChip label={`Search: ${applied.q}`} onRemove={() => clearOne('q', '')} /> : null}
            {applied.module !== 'All' ? <FilterChip label={`Type: ${MODULE_LABEL[applied.module]}`} onRemove={() => clearOne('module', 'All')} /> : null}
            {applied.status !== 'All' ? <FilterChip label={`Status: ${applied.status}`} onRemove={() => clearOne('status', 'All')} /> : null}
          </ActiveFilters>
        </div>

        <window.ListCard toolbarRef={toolbarRef}>
          <window.ListCardHead
            count={filtered.length}
            unit={`notification${filtered.length === 1 ? '' : 's'}`}
            hasFilters={hasFilters}>
            <Btn variant="ghost" size="sm" icon="download"
              disabled={filtered.length === 0}
              onClick={() => {
                const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
                const head = ['Time', 'Type', 'Status', 'Title', 'Body'];
                const rows = filtered.map((n) => [n.time, (MODULE_LABEL[n.module] || n.module), n.unread ? 'Unread' : 'Read', n.title, n.body]);
                const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                const a = document.createElement('a');
                a.href = url; a.download = `notifications_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
                toast({ kind: 'success', title: 'Export downloaded', desc: `${filtered.length.toLocaleString()} notification${filtered.length === 1 ? '' : 's'} · CSV` });
              }}>
              Export
            </Btn>
          </window.ListCardHead>

          <table className="tds-table nc-table">
            <colgroup>
              <col style={{ width: '44px' }} />
              <col />
              <col style={{ width: '1%' }} />
              <col style={{ width: '1%' }} />
              <col style={{ width: '40px' }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>Notification</th>
                <th style={{ whiteSpace: 'nowrap' }}>Type</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan="5"><div className="empty">No notifications match your filters.</div></td></tr>
              ) : pageRows.map((n) => {
                return (
                  <tr key={n.id} className={n.unread ? 'nc-tr-unread' : ''} onClick={() => open(n)}>
                    <td>
                      <div className="nc-cell-ic">
                        <span className="nc-cell-dot" style={{ background: n.unread ? 'var(--color-primary-500)' : 'transparent' }} />
                      </div>
                    </td>
                    <td>
                      <div className={`nc-cell-title ${n.unread ? 'is-unread' : ''}`}>{n.title}</div>
                      <div className="nc-cell-body">{n.body}</div>
                    </td>
                    <td><ModuleChip module={n.module} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span className="nc-cell-time">{n.time}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="nc-cell-chev"><Icon name="chevR" size={15} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <window.Pagination
            total={filtered.length}
            totalUnfiltered={items.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={(n) => { setPageSize(n); setPage(1); }}
            unit="notifications"
            divider />
        </window.ListCard>
      </div>
    );
  };
})();
