/* global React, Icon */
const { useState, useMemo, useEffect, useRef } = React;

// Mirrors every item in the left sidebar nav. `id` is the route name passed to
// setRoute({ name: id }) by the host's onPick handler; `sub` carries the
// sidebar section so results read as "Section · menu item".
const ROUTE_ITEMS = [
  // Manage
  { id: 'list',            title: 'Customers',                 sub: 'Manage',  icon: 'users' },
  // Apps
  { id: 'apps',            title: 'Published Apps',            sub: 'Apps',    icon: 'package' },
  { id: 'app-publish',     title: 'App Publish',               sub: 'Apps',    icon: 'upload' },
  { id: 'firmware',        title: 'Firmware',                  sub: 'Apps',    icon: 'cpu' },
  // Sales
  { id: 'orders',          title: 'Orders',                    sub: 'Sales',   icon: 'cash' },
  { id: 'products',        title: 'Catalog',                   sub: 'Sales',   icon: 'gift' },
  { id: 'catalog',         title: 'Products',                  sub: 'Sales',   icon: 'file' },
  // Devices
  { id: 'models',          title: 'Device Models',             sub: 'Devices', icon: 'pos' },
  { id: 'factory-images',  title: 'Factory Images',            sub: 'Devices', icon: 'image' },
  { id: 'devices-list',    title: 'Devices',                   sub: 'Devices', icon: 'monitor' },
  // Support
  { id: 'tickets',         title: 'Tickets',                   sub: 'Support', icon: 'lifebuoy' },
  // System
  { id: 'admin-users',     title: 'Users',                     sub: 'System',  icon: 'users' },
  { id: 'admin-roles',     title: 'Roles',                     sub: 'System',  icon: 'shield' },
  { id: 'customer-roles',  title: 'Customer Role Definitions', sub: 'System',  icon: 'shield' },
  { id: 'audit',           title: 'Audit Logs',                sub: 'System',  icon: 'audit' },
];

const CommandPalette = ({ customers, devices = [], apps = [], orders, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = (txt) => !s || (txt || '').toLowerCase().includes(s);

    const custMatches = customers
      .filter((c) => match(c.name) || match(c.legalName) || match(c.id))
      .slice(0, 6)
      .map((c) => ({ kind: 'customer', id: c.id, title: c.name, sub: `${c.contracts.length} contract${c.contracts.length === 1 ? '' : 's'} · ${c.operators.length} operator${c.operators.length === 1 ? '' : 's'}`, icon: 'users' }));

    const deviceMatches = devices
      .filter((d) => match(d.sn) || match(d.model) || match(d.imei) || match(d.merchantId))
      .slice(0, 6)
      .map((d) => ({ kind: 'device', id: d.sn, title: d.sn, sub: `${d.model} · ${d.state === 'active' ? 'Active' : d.state === 'pending' ? 'Pending' : d.state} · ${d.os}`, icon: 'monitor' }));

    const appMatches = apps
      .filter((a) => match(a.name) || match(a.package) || match(a.category))
      .slice(0, 6)
      .map((a) => {
        const cur = (a.versions || []).find((v) => v.current) || (a.versions || [])[0];
        return { kind: 'app', id: a.id, title: a.name, sub: `${a.category} · ${a.package}${cur ? ` · v${cur.name}` : ''}`, icon: 'package' };
      });

    const orderMatches = orders
      .filter((o) => match(o.number) || match(o.customerName) || match(o.status))
      .slice(0, 6)
      .map((o) => ({ kind: 'order', id: o.id, title: o.number, sub: `${o.customerName} · ${o.status}`, icon: 'cash' }));

    const routes = ROUTE_ITEMS
      .filter((r) => match(r.title) || match(r.sub))
      .slice(0, 6)
      .map((r) => ({ kind: 'route', id: r.id, title: r.title, sub: r.sub, icon: r.icon }));

    const g = [];
    if (custMatches.length) g.push({ label: 'Customers', items: custMatches });
    if (deviceMatches.length) g.push({ label: 'Devices', items: deviceMatches });
    if (appMatches.length) g.push({ label: 'Apps', items: appMatches });
    if (orderMatches.length) g.push({ label: 'Orders', items: orderMatches });
    if (routes.length) g.push({ label: 'Navigate', items: routes });
    return g;
  }, [q, customers, devices, apps, orders]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  useEffect(() => { setActive(0); }, [q]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = flat[active]; if (it) onPick(it.kind, it.id); }
  };

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__head">
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Search customers, devices, apps, orders, menus…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd style={{ font: '500 10px/1 var(--font-family-mono)', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 3, padding: '2px 5px', color: 'var(--color-text-tertiary)' }}>esc</kbd>
        </div>
        <div className="cmdk__body">
          {flat.length === 0 ? (
            <div className="cmdk__empty">No results for "{q}"</div>
          ) : (
            groups.map((g, gi) => {
              let offset = 0;
              for (let i = 0; i < gi; i++) offset += groups[i].items.length;
              return (
                <div key={g.label} className="cmdk__group">
                  <div className="cmdk__grouplabel">{g.label}</div>
                  {g.items.map((it, ii) => {
                    const idx = offset + ii;
                    return (
                      <div
                        key={`${it.kind}-${it.id}-${ii}`}
                        className={`cmdk__item ${idx === active ? 'is-active' : ''}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => onPick(it.kind, it.id)}
                      >
                        <div className="cmdk__item-icon"><Icon name={it.icon} size={14}/></div>
                        <div className="cmdk__item-text">
                          <div className="cmdk__item-title">{it.title}</div>
                          <div className="cmdk__item-sub">{it.sub}</div>
                        </div>
                        <Icon name="chevR" size={12} style={{ color: 'var(--color-text-tertiary)' }}/>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="cmdk__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

window.CommandPalette = CommandPalette;
