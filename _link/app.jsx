/* global React, ReactDOM, ToastProvider, CustomerList, CustomerWizard, CustomerDetail, OrderList, OrderWizard, OrderDetail, Settings, AdminRoles, AdminUsers, Onboarding, Icon, useToast, SEED_CUSTOMERS, SEED_ORDERS, SEED_USERS, SEED_DEVICE_MODELS, SEED_APPS, SEED_ROLES, AppList, AppDetail, VersionDetail, useTweaks, TweaksPanel, TweakSection, TweakSelect, TweakRadio, TweakToggle, TweakButton, CommandPalette, UserMenu, SignOutModal, LockScreen, UIcon, ProfilePage, AccountSecurityPage, WorkspacesPage, ActivityPage, HelpPage, FeedbackPage, AuditLogPage, DeviceModelList, DeviceModelForm, FactoryImageList, FactoryImageWizard, FactoryImageDetail */
const { useState, useEffect, useRef } = React;

const CURRENT_USER = { name: 'Jordan Diaz', email: 'admin@toms', initials: 'JD', org: 'TOMS · Carbon · Production' };

const SidebarItem = ({ icon, label, active, onClick, badge, children, expanded, onToggle, hasActiveChild }) => {
  const hasChildren = !!children;
  // The chevron + sublist follow the `expanded` flag only — clicking a parent
  // row (or its chevron) toggles `expanded`, so the user can always collapse
  // a section even when one of its children is the current route.
  // `hasActiveChild` is kept on the API for callers that want to drive an
  // auto-expand effect on first navigation into the section.
  const showOpen = hasChildren && expanded;
  const handleRowClick = () => {
    if (hasChildren) {
      if (onClick) onClick();
      if (onToggle) onToggle();
    } else if (onClick) {
      onClick();
    }
  };
  return (
    <>
      <div
        className={`side__item ${active ? 'is-active' : ''} ${hasChildren ? 'is-parent' : ''} ${showOpen ? 'is-open' : ''}`}
        onClick={handleRowClick}>
        <Icon name={icon} size={15} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge != null && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{badge}</span>}
        {hasChildren && (
          <span className={`side__chev ${showOpen ? 'is-open' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}>
            <Icon name="chevR" size={12} />
          </span>
        )}
      </div>
      {showOpen && (
        <div className="side__sublist">{children}</div>
      )}
    </>
  );
};

const SidebarSub = ({ label, active, onClick }) => (
  <div className={`side__sub ${active ? 'is-active' : ''}`} onClick={onClick}>
    <span>{label}</span>
  </div>
);

// ─── App Publish host ──────────────────────────────────────
// Mounts window.AP.App (the self-contained App Publish bundle) into the
// content area. The bundle is a complete app with its own Sidebar + TopBar +
// Tweaks; index.html hides that chrome (.ap-host rules) so it integrates with
// this Carbon admin shell.
const AppPublishHost = () => {
  const AP = window.AP;
  return (
    <div className="ap-host"
         style={{ width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  background: 'var(--color-bg-1)' }}>
      {AP && AP.App ? <AP.App /> : (
        <div style={{ padding: 24, color: 'var(--color-text-tertiary)' }}>
          App Publish bundle didn’t load. Check console.
        </div>
      )}
    </div>
  );
};


const App = () => {
  // Persistent tweak state (via tweaks-panel helper)
  const [t, setTweak] = useTweaks(window.__CARBON_TWEAKS__ || { density: 'comfortable', demoState: 'list', maskSensitive: true, theme: 'light', lang: 'en' });

  // Apply theme to <html data-theme>; 'system' follows OS
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      let theme = t.theme || 'light';
      if (theme === 'system') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.setAttribute('data-theme', theme);
    };
    applyTheme();
    if (t.theme === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [t.theme]);

  // Lang + user menu state
  useEffect(() => { document.documentElement.setAttribute('data-lang', t.lang || 'en'); }, [t.lang]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const userCardRef = useRef(null);
  const toast = useToast();

  const [customers, setCustomers] = useState(SEED_CUSTOMERS);
  const [orders, setOrders] = useState(SEED_ORDERS);
  const [models, setModels] = useState(SEED_DEVICE_MODELS);
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [users, setUsers] = useState(SEED_USERS);   // platform staff incl. pending invites
  // System-defined tenant roles (Common/ISV/ISO/Merchant) — single source of
  // truth shared by Customer Role Definitions and every customer's Operators
  // & Roles tab. Editing roles in Settings is reflected immediately on every
  // customer detail page.
  const [systemRoles, setSystemRoles] = useState(SEED_ROLES);
  const [apps] = useState(SEED_APPS);                // ISV-published apps (admin sees all)
  // OTA firmware bundles — grouped by (modelCode, deviceFlag).
  // The Firmware sub-menu under Apps reads from this state.
  const [firmwares, setFirmwares] = useState(window.SEED_FIRMWARE || []);
  // Factory Images — Day 0 pre-install spec the factory uses when flashing
  // a fresh device. Per-model bundles + ISO bindings + cert.
  const [factoryImages, setFactoryImages] = useState(window.SEED_FACTORY_IMAGES || []);
  // Tickets live in window.TICKETS (initialised by tickets.jsx). The source
  // module mutates that array directly when the operator takes / replies /
  // closes / reopens / reassigns; we just bump a tick to re-render the
  // ticket list when something changed.
  const [, bumpTickets] = useState(0);
  const tickets = window.TICKETS || [];
  // Whether the "current device" has an active session — drives the
  // onboarding landing-page A/B branch (current account vs. anonymous).
  const [sessionUser, setSessionUser] = useState(CURRENT_USER);
  const [route, setRoute] = useState({ name: 'list' });
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  // Resolved cart line count (excludes stale lines whose product/variant no longer exists)
  // — used for the cart badge so the number matches what's actually visible in the drawer.
  const resolvedCartCount = cart.lines.filter((l) => {
    const p = products.find((pp) => pp.id === l.productId);
    return !!(p && p.variants.find((v) => v.id === l.variantId));
  }).length;

  // Direct-buy (Order now) — bypasses the persistent cart.
  // When set, the Checkout step reads from these ephemeral lines instead of cart.lines.
  const [buyNowLines, setBuyNowLines] = useState(null);
  const startBuyNow = (product, variant, qty = 1, opts = {}) => {
    setBuyNowLines([{
      uid: 'bn-' + Math.random().toString(36).slice(2, 9),
      productId: product.id,
      variantId: variant.id,
      qty: qty || 1,
      unitPriceOverride: variant.price,
      integrationMode: (opts && opts.integrationMode) || null,
      addedAt: new Date().toISOString(),
    }]);
    setCartOpen(false);
    setRoute({ name: 'checkout' });
  };
  const setBuyNowQty = (uid, q) => setBuyNowLines((ls) => (ls || []).map((l) => l.uid === uid ? { ...l, qty: Math.max(1, q) } : l));
  const setBuyNowUnitPrice = (uid, price) => setBuyNowLines((ls) => (ls || []).map((l) => l.uid === uid ? { ...l, unitPriceOverride: price } : l));
  const removeBuyNow = () => setBuyNowLines(null);
  const clearBuyNow = () => setBuyNowLines(null);
  const [expandedMenus, setExpandedMenus] = useState({ settings: false, orders: false, customers: false, devices: false, sales: false, apps: false, support: false });
  const toggleMenu = (key) => setExpandedMenus((m) => ({ ...m, [key]: !m[key] }));
  // Global ⌘K / Ctrl+K and ⌘L shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLocked(true);
      } else if (e.key === 'Escape' && cmdkOpen) {
        setCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdkOpen]);

  // Apply demoState tweak as a one-way teleport
  const [lastDemoState, setLastDemoState] = useState(t.demoState);
  useEffect(() => {
    if (t.demoState !== lastDemoState) {
      setLastDemoState(t.demoState);
      if (t.demoState === 'List') setRoute({ name: 'list' });
      if (t.demoState === 'Wizard') setRoute({ name: 'new' });
      if (t.demoState === 'Detail') setRoute({ name: 'detail', id: customers[0]?.id });
      if (t.demoState === 'Customer Role Definitions') setRoute({ name: 'customer-roles' });
      if (t.demoState === 'Roles') setRoute({ name: 'admin-roles' });
      if (t.demoState === 'Users') setRoute({ name: 'admin-users' });
      if (t.demoState === 'Orders') setRoute({ name: 'orders' });
      if (t.demoState === 'New order') setRoute({ name: 'order-new' });
      if (t.demoState === 'Order detail') setRoute({ name: 'order', id: orders[0]?.id });
      if (t.demoState === 'Profile') setRoute({ name: 'profile' });
      if (t.demoState === 'Account') setRoute({ name: 'account' });
      if (t.demoState === 'Workspaces') setRoute({ name: 'workspaces' });
      if (t.demoState === 'Activity') setRoute({ name: 'activity' });
      if (t.demoState === 'Help') setRoute({ name: 'help' });
      if (t.demoState === 'Feedback') setRoute({ name: 'feedback' });
      if (t.demoState === 'Audit log') setRoute({ name: 'audit' });
      if (t.demoState === 'Device models') setRoute({ name: 'models' });
      if (t.demoState === 'New model') setRoute({ name: 'model-new' });
      if (t.demoState === 'Edit model') setRoute({ name: 'model-edit', id: models[0]?.id });
      if (t.demoState === 'Products') setRoute({ name: 'products' });
      if (t.demoState === 'Product detail') setRoute({ name: 'product-detail', id: products[0]?.id });
      if (t.demoState === 'Catalog') setRoute({ name: 'catalog' });
      if (t.demoState === 'New catalog product') setRoute({ name: 'catalog-new' });
      if (t.demoState === 'Edit catalog product') setRoute({ name: 'catalog-edit', id: products[0]?.id });
      if (t.demoState === 'Devices') setRoute({ name: 'devices-list' });
      if (t.demoState === 'Device detail') setRoute({ name: 'device-detail', sn: (window.PROD_DEVICES || [])[0]?.sn });
      if (t.demoState === 'Apps') setRoute({ name: 'apps' });
      if (t.demoState === 'App detail') setRoute({ name: 'app-detail', id: apps[0]?.id, tab: 'overview' });
      if (t.demoState === 'App versions') setRoute({ name: 'app-detail', id: apps[0]?.id, tab: 'versions' });
      if (t.demoState === 'App subscribers') setRoute({ name: 'app-detail', id: apps[0]?.id, tab: 'subscribers' });
      if (t.demoState === 'App activity') setRoute({ name: 'app-detail', id: apps[0]?.id, tab: 'activity' });
      if (t.demoState === 'Firmware') setRoute({ name: 'firmware' });
      if (t.demoState === 'Upload firmware') setRoute({ name: 'firmware-upload' });
      if (t.demoState === 'Firmware detail') setRoute({ name: 'firmware-detail', id: firmwares[0]?.id, tab: 'overview' });
      if (t.demoState === 'Firmware deployments') setRoute({ name: 'firmware-detail', id: firmwares[0]?.id, tab: 'deployments' });
      if (t.demoState === 'Firmware version') {
        const f = firmwares[0];
        const v = f?.versions?.find(v => v.current) || f?.versions?.[0];
        if (f && v) setRoute({ name: 'firmware-version', id: f.id, versionId: v.id });
      }
      if (t.demoState === 'Tickets') setRoute({ name: 'tickets' });
      if (t.demoState === 'Ticket detail') setRoute({ name: 'ticket', id: (window.TICKETS || [])[0]?.id });
      if (t.demoState === 'New ticket') setRoute({ name: 'ticket-new' });
      if (t.demoState === 'Merchants') setRoute({ name: 'merchants' });
      if (t.demoState === 'Merchant detail') setRoute({ name: 'merchant-detail', id: (window.MERCHANTS || [])[0]?.id });
      if (t.demoState === 'Factory Images') setRoute({ name: 'factory-images' });
      if (t.demoState === 'New factory image') setRoute({ name: 'factory-image-new' });
      if (t.demoState === 'Factory image detail') setRoute({ name: 'factory-image', id: factoryImages[0]?.id });
      if (t.demoState === 'Version detail') {
        const a = apps[0];
        const v = a?.versions?.find(v => v.current) || a?.versions?.[0];
        if (a && v) setRoute({ name: 'app-version', id: a.id, versionId: v.id });
      }
    }
  }, [t.demoState, lastDemoState, customers, orders, models, products, apps, tickets, factoryImages, firmwares]);

  const current = route.name === 'detail' ? customers.find((c) => c.id === route.id) : null;
  const currentOrder = route.name === 'order' ? orders.find((o) => o.id === route.id) : null;
  const currentModel = route.name === 'model-edit' ? models.find((m) => m.id === route.id) : null;
  const currentApp = route.name === 'app-detail' || route.name === 'app-version' ? apps.find((a) => a.id === route.id) : null;
  const currentVersion = route.name === 'app-version' && currentApp ? (currentApp.versions || []).find((v) => v.id === route.versionId) : null;
  const currentFirmware = (route.name === 'firmware-detail' || route.name === 'firmware-version') ? firmwares.find((f) => f.id === route.id) : null;
  const currentFirmwareVersion = route.name === 'firmware-version' && currentFirmware ? (currentFirmware.versions || []).find((v) => v.id === route.versionId) : null;
  const currentFactoryImage = route.name === 'factory-image' ? factoryImages.find((fi) => fi.id === route.id) : null;
  const currentTicket = route.name === 'ticket' ? window.findTicketById?.(route.id) : null;
  const workbenchTicket = route.name === 'workbench' ? window.findTicketById?.(route.id) : null;
  const currentMerchant = route.name === 'merchant-detail' ? window.findMerchantById?.(route.id) : null;

  const update = (next) => setCustomers((cs) => cs.map((c) => c.id === next.id ? next : c));
  const add = (c) => setCustomers((cs) => [c, ...cs]);

  // ─── Approval workflow applier ─────────────────────────────
  // The approval store (window.AW) calls __applyApprovalChange when a request
  // is approved; we mutate the matching customer's operator here so the change
  // shows up on the operators table immediately.
  React.useEffect(() => {
    window.__applyApprovalChange = (req) => {
      if (!req || !req.customerId) return;
      setCustomers((cs) => cs.map((c) => {
        if (c.id !== req.customerId) return c;
        let touched = false;
        const operators = (c.operators || []).map((op, i) => {
          const matchesId  = op.id && req.operatorId && op.id === req.operatorId;
          const matchesIdx = !matchesId && typeof req.operatorIdx === 'number' && req.operatorIdx === i;
          const matchesEmail = !matchesId && !matchesIdx && op.email && op.email.toLowerCase() === (req.operatorEmail || '').toLowerCase();
          if (!matchesId && !matchesIdx && !matchesEmail) return op;
          touched = true;
          if (req.type === 'change-email') return { ...op, email: req.payload.newEmail };
          if (req.type === 'promote-admin') return { ...op, role: 'Admin' };
          return op;
        });
        if (!touched) return c;
        const ev = {
          at: req.appliedAt || new Date().toISOString(),
          kind: req.type === 'promote-admin' ? 'operator+' : 'info',
          by: req.reviewedBy || 'carbon-admin',
          text: req.type === 'change-email'
            ? `Operator email updated to ${req.payload.newEmail} (approval ${req.id})`
            : `${req.operatorName} promoted to Admin (approval ${req.id})`,
        };
        return { ...c, operators, events: [...(c.events || []), ev] };
      }));
    };
    return () => { delete window.__applyApprovalChange; };
  }, []);

  // Pending review count for the sidebar badge — subscribes to the AW store.
  const [awTick, setAwTick] = useState(0);
  React.useEffect(() => window.AW?.subscribe(() => setAwTick((x) => x + 1)), []);
  const awState = window.AW?.state || { persona: 'sam@carbon', requests: [] };
  const awPersona = awState.persona;
  const approvalsBadgeCount = awState.requests.filter((r) => r.status === 'pending' && r.submittedBy !== awPersona).length;

  const updateOrder = (next) => setOrders((os) => os.map((o) => o.id === next.id ? next : o));
  const addOrder = (o) => setOrders((os) => [o, ...os]);

  // The source tickets module mutates window.TICKETS in place. We expose
  // these helpers for any legacy callers, but the new module no longer
  // needs them — a tick bump is enough to refresh the list.
  const refreshTickets = () => bumpTickets((n) => n + 1);
  const updateTicket = (next) => {
    const arr = window.TICKETS || [];
    const i = arr.findIndex((t) => t.id === next.id);
    if (i >= 0) arr[i] = next;
    refreshTickets();
  };
  const addTicket = (t) => {
    (window.TICKETS = window.TICKETS || []).unshift(t);
    refreshTickets();
  };

  const updateModel = (next) => setModels((ms) => ms.map((m) => m.id === next.id ? next : m));
  const addModel = (m) => setModels((ms) => [m, ...ms]);
  const removeModel = (id) => setModels((ms) => ms.filter((m) => m.id !== id));

  // Products (Sales > Products / Catalog) — sales-facing SKU catalog,
  // distinct from Device Models (engineering hardware spec).
  const updateProduct = (next) => setProducts((ps) => ps.map((p) => p.id === next.id ? next : p));
  const addProduct    = (p)    => setProducts((ps) => [p, ...ps]);
  const removeProduct = (id)   => setProducts((ps) => ps.filter((p) => p.id !== id));

  const addFactoryImage    = (fi)   => setFactoryImages((xs) => [fi, ...xs]);
  const updateFactoryImage = (next) => setFactoryImages((xs) => xs.map((fi) => fi.id === next.id ? next : fi));

  // Add a freshly-uploaded firmware version. If a firmware row matching
  // (modelCode, deviceFlag, os) already exists, append the version to it
  // and re-mark `current` on the new one. Otherwise create a new firmware
  // row. Returns the firmware id so the caller can navigate to it.
  const addFirmwareVersion = ({ os, modelCode, deviceFlag, version }) => {
    let fwId = null;
    setFirmwares((fws) => {
      const idx = fws.findIndex((f) => f.modelCode === modelCode && f.deviceFlag === deviceFlag && f.os === os);
      if (idx >= 0) {
        const fw = fws[idx];
        fwId = fw.id;
        const wasCurrent = version.current;
        const nextVersions = [
          { ...version, current: wasCurrent },
          ...fw.versions.map((v) => wasCurrent ? { ...v, current: false } : v),
        ];
        const nextFw = { ...fw, versions: nextVersions };
        return [nextFw, ...fws.slice(0, idx), ...fws.slice(idx + 1)];
      }
      const newFw = {
        id: `fw-${modelCode}-${deviceFlag}`.toLowerCase(),
        modelCode, deviceFlag, os,
        customerScope: null,
        versions: [{ ...version, current: true }],
      };
      fwId = newFw.id;
      return [newFw, ...fws];
    });
    return fwId;
  };

  // Mutate a single firmware version (publish / unpublish / etc).
  const mutateFirmwareVersion = (fwId, versionId, mutator) => {
    setFirmwares((fws) => fws.map((fw) => {
      if (fw.id !== fwId) return fw;
      const nextVersions = [];
      for (const v of fw.versions) {
        if (v.id !== versionId) { nextVersions.push(v); continue; }
        const m = mutator(v, fw);
        if (m !== null) nextVersions.push(m);
      }
      return { ...fw, versions: nextVersions };
    }));
  };

  // Whole-firmware mutator for atomic multi-version actions.
  const mutateFirmware = (fwId, mutator) => {
    setFirmwares((fws) => fws.map((fw) => fw.id === fwId ? mutator(fw) : fw));
  };

  const goList = () => setRoute({ name: 'list' });
  const goNew = () => setRoute({ name: 'new' });
  const goDetail = (id, tab) => setRoute({ name: 'detail', id, tab });
  const goCustomerRoles = () => setRoute({ name: 'customer-roles' });
  const goAdminRoles = () => setRoute({ name: 'admin-roles' });
  const goAdminUsers = () => setRoute({ name: 'admin-users' });
  const goOrders = () => setRoute({ name: 'orders' });
  // From a Sales-side surface (Products / Product Detail) — remembers the
  // origin so the Orders page shows a "Back to ..." breadcrumb-style button.
  // Calling goOrders() with no from (e.g. from the sidebar menu) shows no Back.
  const goOrdersFrom = (from, id) => setRoute({ name: 'orders', from, fromId: id });

  // ── Onboarding ───────────────────────────────────────────────────
  // Open the onboarding link for a given pending USER row (the row's id
  // doubles as the invite token in this mock).
  const goOnboard = (token) => setRoute({ name: 'onboard', token });
  const exitOnboard = () => setRoute({ name: 'admin-users' });

  // Apply an accepted invitation: pending → active, fill account fields.
  const acceptInvitation = ({ token, viaExisting, account }) => {
    setUsers(us => us.map(u => {
      if (u.id !== token) return u;
      const now = new Date().toISOString();
      return {
        ...u,
        status: 'ACTIVE',
        pending: false,
        loginName:   account.loginName   || account.email?.split('@')[0] || u.loginName,
        displayName: account.displayName || account.name || u.displayName,
        country:     account.country     || u.country || 'US',
        lastLoginAt: now,
        passwordUpdatedAt:        viaExisting ? null : now,
        passwordChangedTimestamp: viaExisting ? null : now,
        passwordChangeTimes:      viaExisting ? 0 : 1,
        updatedAt: now,
        acceptedAt: now,
        acceptedVia: viaExisting ? 'existing' : 'registered',
      };
    }));
  };

  // Expose for cross-component calls (e.g. toast actions in admin-users)
  useEffect(() => {
    window.__openInvitation = (token) => goOnboard(token);
    return () => { delete window.__openInvitation; };
  }, []);

  // ── Tweaks demo-state side effect (handled below) ────────────────
  const goNewOrder = () => setRoute({ name: 'order-new' });
  const goOrder = (id) => setRoute({ name: 'order', id });
  const goProfile = () => setRoute({ name: 'profile' });
  const goAccount = () => setRoute({ name: 'account' });
  const goWorkspaces = () => setRoute({ name: 'workspaces' });
  const goActivity = () => setRoute({ name: 'activity' });
  const goHelp = () => setRoute({ name: 'help' });
  const goFeedback = () => setRoute({ name: 'feedback' });
  const goAudit = () => setRoute({ name: 'audit' });
  const goApprovals = () => setRoute({ name: 'approvals' });
  const goNotifications = () => setRoute({ name: 'notifications' });
  const goNotification = (id) => setRoute({ name: 'notification', id });
  const goModels = () => setRoute({ name: 'models' });
  const goNewModel = () => setRoute({ name: 'model-new' });
  const goEditModel = (id) => setRoute({ name: 'model-edit', id });
  const goProducts      = () => setRoute({ name: 'products' });        // Shop browse
  const goProductDetail = (id) => setRoute({ name: 'product-detail', id });
  const goCatalog       = () => setRoute({ name: 'catalog' });         // admin list
  const goNewProduct    = () => setRoute({ name: 'catalog-new' });
  const goEditProduct   = (id) => setRoute({ name: 'catalog-edit', id });
  const goDevicesList = () => setRoute({ name: 'devices-list' });
  const goDeviceDetail = (sn, tab) => setRoute({ name: 'device-detail', sn, tab });
  const goFactoryImages   = () => setRoute({ name: 'factory-images' });
  const goNewFactoryImage = () => setRoute({ name: 'factory-image-new' });
  const goFactoryImage    = (id, tab) => setRoute({ name: 'factory-image', id, tab });
  const goApps = () => setRoute({ name: 'apps' });
  const goAppPublish = () => setRoute({ name: 'app-publish' });
  const goFirmware = () => setRoute({ name: 'firmware' });
  const goFirmwareUpload = () => setRoute({ name: 'firmware-upload' });
  const goFirmwareDetail = (id, tab) => setRoute({ name: 'firmware-detail', id, tab: tab || 'overview' });
  const goFirmwareVersion = (id, versionId) => setRoute({ name: 'firmware-version', id, versionId });
  const goApp = (id, tab) => setRoute({ name: 'app-detail', id, tab: tab || 'overview' });
  const goAppVersion = (appId, versionId) => setRoute({ name: 'app-version', id: appId, versionId });
  const goTickets = () => setRoute({ name: 'tickets' });
  const goTicket = (id) => setRoute({ name: 'ticket', id });
  const goMerchants = () => setRoute({ name: 'merchants' });
  const goMerchant  = (id) => setRoute({ name: 'merchant-detail', id });
  const goNewTicket = () => setRoute({ name: 'ticket-new' });
  const goWorkbench = (id) => setRoute({ name: 'workbench', id });

  // Adapter for the source ticket module. Source screens speak in
  // {screen: "tickets" | "ticketDetail" | "newTicket" | "deviceDetail" | …}
  // payloads; map them onto our route names.
  const ticketsNavigate = (target) => {
    if (!target) return;
    switch (target.screen) {
      case "tickets":        return goTickets();
      case "ticketDetail":   return goTicket(target.ticketId);
      case "newTicket":      return setRoute({ name: "ticket-new", deviceSn: target.deviceSn });
      case "deviceDetail":   return goDeviceDetail(target.deviceSn, target.tab);
      case "devices":        return goDevicesList();
      case "merchantDetail": return goMerchant(target.merchantId);
      case "merchants":      return goMerchants();
      default: return;
    }
  };

  // Source ticket detail's "Open workbench" / "Take & open" buttons call
  // window.openWorkbenchInNewWindow(ticketId). Wire it to our local
  // workbench takeover route. (We don't actually open a new window — the
  // admin portal renders the workbench as a full-viewport overlay.)
  useEffect(() => {
    window.openWorkbenchInNewWindow = (id) => goWorkbench(id);
    window.openWorkbenchTab = window.openWorkbenchTab || ((id) => goWorkbench(id));
    return () => {
      if (window.openWorkbenchInNewWindow) delete window.openWorkbenchInNewWindow;
    };
  }, []);

  const userPageRoutes = ['profile','account','workspaces','activity','help','feedback'];
  const userCrumb = {
    profile: 'My profile', account: 'Account & security', workspaces: 'Switch workspace',
    activity: 'My activity', help: 'Help center', feedback: 'Send feedback'
  };

  const inOrdersSection = route.name === 'orders' || route.name === 'order-new' || route.name === 'order';
  const inProductsSection = route.name === 'products' || route.name === 'product-detail';
  const inCatalogSection  = route.name === 'catalog' || route.name === 'catalog-new' || route.name === 'catalog-edit';
  const inSalesSection = inOrdersSection || inProductsSection || inCatalogSection;
  const inModelsSection = route.name === 'models' || route.name === 'model-new' || route.name === 'model-edit';
  const inFleetSection  = route.name === 'devices-list' || route.name === 'device-detail';
  const inFactoryImagesSection = route.name === 'factory-images' || route.name === 'factory-image-new' || route.name === 'factory-image';
  const inDevicesSection = inModelsSection || inFleetSection || inFactoryImagesSection;
  const inMerchantsSection = route.name === 'merchants' || route.name === 'merchant-detail';

  // ─── Bridges for the imported Carbon devices module ──────────────
  // window.__navigate is the source's app-wide router contract;
  // map its {screen, …} payloads onto our route names.
  useEffect(() => {
    window.__navigate = (target) => {
      if (!target || !target.screen) return;
      if (target.screen === 'devices')        return goDevicesList();
      if (target.screen === 'deviceDetail')   return goDeviceDetail(target.deviceSn, target.tab);
      if (target.screen === 'tickets')        return goTickets();
      if (target.screen === 'ticketDetail')   return goTicket(target.ticketId);
      if (target.screen === 'newTicket')      return goNewTicket();
      if (target.screen === 'merchantDetail') return goMerchant(target.merchantId);
      if (target.screen === 'merchants')      return goMerchants();
    };
    return () => { delete window.__navigate; };
  }, [toast]);
  useEffect(() => {
    window.showToast = (msg, tone) => toast({
      kind: tone === 'danger' ? 'error' : tone === 'info' ? 'info' : 'success',
      title: msg,
    });
    window.APPS = SEED_APPS;
    return () => { delete window.showToast; };
  }, [toast]);

  // Fleet-list navigation adapter passed to the imported screens
  const fleetNavigate = (target) => {
    if (!target || !target.screen) return;
    if (target.screen === 'devices')      return goDevicesList();
    if (target.screen === 'deviceDetail') return goDeviceDetail(target.deviceSn, target.tab);
    if (window.__navigate) window.__navigate(target);
  };
  const inAppsSection = route.name === 'apps' || route.name === 'app-detail' || route.name === 'app-version' || route.name === 'firmware' || route.name === 'firmware-upload' || route.name === 'firmware-detail' || route.name === 'firmware-version' || route.name === 'app-publish';
  const inPubAppsSection = route.name === 'apps' || route.name === 'app-detail' || route.name === 'app-version';
  const inAppPublishSection = route.name === 'app-publish';
  const inFirmwareSection = route.name === 'firmware' || route.name === 'firmware-upload' || route.name === 'firmware-detail' || route.name === 'firmware-version';
  const inTicketsSection = route.name === 'tickets' || route.name === 'ticket' || route.name === 'ticket-new';

  // Auto-expand a sidebar group when the user navigates INTO one of its
  // children, but don't force it open — clicking the parent row still
  // toggles it back closed.
  useEffect(() => { if (inAppsSection)     setExpandedMenus((m) => m.apps     ? m : { ...m, apps: true });     }, [inAppsSection]);
  useEffect(() => { if (inSalesSection)    setExpandedMenus((m) => m.sales    ? m : { ...m, sales: true });    }, [inSalesSection]);
  useEffect(() => { if (inDevicesSection)  setExpandedMenus((m) => m.devices  ? m : { ...m, devices: true });  }, [inDevicesSection]);

  // ─── Workbench takeover (full-screen overlay) ───────────────────
  // The workbench is the operator's deep-triage surface for a ticket:
  // terminal logs, monitoring snapshot, remote desk, log/file pull,
  // hardware diag, reboot, factory reset. Bypasses sidebar/topbar
  // so it gets the full viewport.
  if (route.name === 'workbench') {
    if (!workbenchTicket || !window.WorkbenchScreen) {
      return (
        <div className="page"><div className="empty">
          Workbench unavailable. <a onClick={() => goTicket(route.id)} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to ticket</a>
        </div></div>
      );
    }
    return (
      <window.WorkbenchScreen
        ticket={workbenchTicket}
        navigate={(target) => {
          if (target.screen === 'ticketDetail') return goTicket(target.ticketId);
          if (target.screen === 'tickets')      return goTickets();
        }}
        onCloseTab={() => goTicket(workbenchTicket.id)}
      />
    );
  }

  // ─── Onboarding takeover (no sidebar/topbar) ─────────────────────
  if (route.name === 'onboard') {
    const invitation = users.find(u => u.id === route.token);
    return (
      <Onboarding
        token={route.token}
        invitation={invitation}
        currentUser={sessionUser}
        onAccept={(payload) => acceptInvitation(payload)}
        onSignOut={() => setSessionUser(null)}
        onExit={() => {
          // Restore session for next demo and head to dashboard
          setSessionUser(CURRENT_USER);
          setRoute({ name: 'admin-users' });
        }}
      />
    );
  }

  return (
    <div className="app" data-density={t.density}>
      <aside className="side">
        <div className="side__brand">
          <div className="side__logo"><img src="assets/logo.png" alt="TOMS" /></div>
          <div className="side__name">TOMS<small>Carbon · Admin</small></div>
        </div>

        <div className="side__scroll">
        <div className="side__sectionlabel">Manage</div>
        <nav className="side__nav">
          <SidebarItem icon="users" label="Customers" active={route.name === 'list' || route.name === 'new' || route.name === 'detail'} onClick={goList} />
          <SidebarItem icon="building" label="Merchants" active={inMerchantsSection} onClick={goMerchants} />
        </nav>

        <div className="side__sectionlabel">Apps</div>
        <nav className="side__nav">
          <SidebarItem icon="package" label="Published Apps" active={inPubAppsSection} onClick={goApps} />
          <SidebarItem icon="upload" label="App Publish" active={inAppPublishSection} onClick={goAppPublish} />
          <SidebarItem icon="cpu" label="Firmware" active={inFirmwareSection} onClick={goFirmware} />
        </nav>

        <div className="side__sectionlabel">Sales</div>
        <nav className="side__nav">
          <SidebarItem icon="cash" label="Orders" active={inOrdersSection} onClick={goOrders} />
          <SidebarItem icon="gift" label="Goods" active={inProductsSection} onClick={goProducts} />
          <SidebarItem icon="file" label="Catalog" active={inCatalogSection} onClick={goCatalog} />
        </nav>

        <div className="side__sectionlabel">Devices</div>
        <nav className="side__nav">
          <SidebarItem icon="pos" label="Device Models" active={inModelsSection} onClick={goModels} />
          <SidebarItem icon="image" label="Factory Images" active={inFactoryImagesSection} onClick={goFactoryImages} />
          <SidebarItem icon="monitor" label="Devices" active={inFleetSection} onClick={goDevicesList} />
        </nav>

        <div className="side__sectionlabel">Support</div>
        <nav className="side__nav">
          <SidebarItem icon="lifebuoy" label="Tickets" active={inTicketsSection} onClick={goTickets} />
        </nav>

        <div className="side__sectionlabel">System</div>
        <nav className="side__nav">
          <SidebarItem icon="users" label="Users" active={route.name === 'admin-users'} onClick={goAdminUsers} />
          <SidebarItem icon="shield" label="Roles" active={route.name === 'admin-roles'} onClick={goAdminRoles} />
          <SidebarItem icon="shield" label="Customer Role Definitions" active={route.name === 'customer-roles'} onClick={goCustomerRoles} />
          <SidebarItem
            icon="check"
            label="Approvals"
            active={route.name === 'approvals'}
            onClick={goApprovals} />
          <SidebarItem icon="audit" label="Audit Logs" active={route.name === 'audit'} onClick={goAudit} />
        </nav>
        </div>

        <button
          ref={userCardRef}
          type="button"
          className={`side__footer side__user ${menuOpen ? 'is-open' : ''} ${userPageRoutes.includes(route.name) ? 'is-active' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}>
          <div className="side__avatar">{CURRENT_USER.initials}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CURRENT_USER.name}</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CURRENT_USER.email}</div>
          </div>
          <span className="side__user__chev"><Icon name="chevR" size={12} /></span>
        </button>

        <UserMenu
          anchorRef={userCardRef}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          user={CURRENT_USER}
          theme={t.theme || 'light'}
          lang={t.lang || 'en'}
          onTheme={(v) => { setTweak('theme', v); toast({ kind: 'success', title: `Theme set to ${v}` }); }}
          onLang={(v) => { setTweak('lang', v); toast({ kind: 'success', title: v === 'zh' ? '已切换为中文' : 'Switched to English' }); }}
          onGoProfile={goProfile}
          onGoAccount={goAccount}
          onGoWorkspaces={goWorkspaces}
          onGoActivity={goActivity}
          onGoHelp={goHelp}
          onGoFeedback={goFeedback}
          onLock={() => setLocked(true)}
          onSignOut={() => setSignOutOpen(true)}
        />
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {userPageRoutes.includes(route.name) ?
            <>
                <a onClick={() => setMenuOpen(true)}>{CURRENT_USER.name}</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">{userCrumb[route.name]}</span>
              </> :
            route.name === 'customer-roles' ?
            <>
                <a onClick={goCustomerRoles}>System</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Customer Role Definitions</span>
              </> :
            route.name === 'admin-roles' ?
            <>
                <a onClick={goAdminRoles}>System</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Roles</span>
              </> :
            route.name === 'admin-users' ?
            <>
                <a onClick={goAdminUsers}>System</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Users</span>
              </> :
            route.name === 'audit' ?
            <>
                <a onClick={goAudit}>System</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Audit Logs</span>
              </> :
            route.name === 'approvals' ?
            <>
                <a onClick={goApprovals}>System</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Approvals</span>
              </> :
            route.name === 'notifications' ?
            <>
                <span className="crumbs__current">Notifications</span>
              </> :
            route.name === 'notification' ?
            <>
                <a onClick={goNotifications}>Notifications</a>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__current">Detail</span>
              </> :
            inTicketsSection ?
            <>
                <a onClick={goTickets}>Support</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'tickets' ? (
                  <span className="crumbs__current">Tickets</span>
                ) : (
                  <>
                    <a onClick={goTickets}>Tickets</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{route.name === 'ticket-new' ? 'New' : (currentTicket ? currentTicket.id : 'Ticket')}</span>
                  </>
                )}
              </> :
            inAppsSection ?
            <>
                <a onClick={goApps}>Apps</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'app-publish' ? (
                  <span className="crumbs__current">App Publish</span>
                ) : inFirmwareSection ? (
                  route.name === 'firmware' ? (
                    <span className="crumbs__current">Firmware</span>
                  ) : route.name === 'firmware-upload' ? (
                    <>
                      <a onClick={goFirmware}>Firmware</a>
                      <span className="crumbs__sep">/</span>
                      <span className="crumbs__current">Upload</span>
                    </>
                  ) : route.name === 'firmware-detail' && currentFirmware ? (
                    <>
                      <a onClick={goFirmware}>Firmware</a>
                      <span className="crumbs__sep">/</span>
                      <span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{currentFirmware.modelCode} · {currentFirmware.deviceFlag}</span>
                    </>
                  ) : route.name === 'firmware-version' && currentFirmware && currentFirmwareVersion ? (
                    <>
                      <a onClick={goFirmware}>Firmware</a>
                      <span className="crumbs__sep">/</span>
                      <a onClick={() => goFirmwareDetail(currentFirmware.id, 'versions')} style={{ fontFamily: 'var(--font-family-mono)' }}>{currentFirmware.modelCode} · {currentFirmware.deviceFlag}</a>
                      <span className="crumbs__sep">/</span>
                      <span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{currentFirmwareVersion.versionName}</span>
                    </>
                  ) : (
                    <span className="crumbs__current">Firmware</span>
                  )
                ) : (route.name === 'app-detail' || route.name === 'app-version') && currentApp ? (
                  route.name === 'app-version'
                    ? <><a onClick={goApps}>Published Apps</a><span className="crumbs__sep">/</span><a onClick={() => goApp(currentApp.id, 'versions')}>{currentApp.name}</a><span className="crumbs__sep">/</span><span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{currentVersion ? currentVersion.name : 'Version'}</span></>
                    : <><a onClick={goApps}>Published Apps</a><span className="crumbs__sep">/</span><span className="crumbs__current">{currentApp.name}</span></>
                ) : (
                  <span className="crumbs__current">Published Apps</span>
                )}
              </> :
            inFleetSection ?
            <>
                <a onClick={goDevicesList}>Devices</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'devices-list' ? (
                  <span className="crumbs__current">Devices</span>
                ) : (
                  <>
                    <a onClick={goDevicesList}>Devices</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{route.sn}</span>
                  </>
                )}
              </> :
            inFactoryImagesSection ?
            <>
                <a onClick={goFactoryImages}>Devices</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'factory-images' ? (
                  <span className="crumbs__current">Factory Images</span>
                ) : route.name === 'factory-image-new' ? (
                  <>
                    <a onClick={goFactoryImages}>Factory Images</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current">New</span>
                  </>
                ) : (
                  <>
                    <a onClick={goFactoryImages}>Factory Images</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current">{currentFactoryImage ? currentFactoryImage.name : 'Factory image'}</span>
                  </>
                )}
              </> :
            inModelsSection ?
            <>
                <a onClick={goModels}>Devices</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'models' ? (
                  <span className="crumbs__current">Device Models</span>
                ) : (
                  <>
                    <a onClick={goModels}>Device Models</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current">{route.name === 'model-new' ? 'New' : (currentModel ? currentModel.modelCode : 'Edit')}</span>
                  </>
                )}
              </> :
            inOrdersSection ?
            <>
                <a onClick={goOrders}>Sales</a>
                <span className="crumbs__sep">/</span>
                <a onClick={goOrders}>Orders</a>
                {route.name === 'order-new' && <><span className="crumbs__sep">/</span><span className="crumbs__current">New</span></>}
                {route.name === 'order' && currentOrder && <><span className="crumbs__sep">/</span><span className="crumbs__current" style={{ fontFamily: 'var(--font-family-mono)' }}>{currentOrder.number}</span></>}
              </> :
            inProductsSection ?
            <>
                <a onClick={goProducts}>Sales</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'products' ? (
                  <span className="crumbs__current">Goods</span>
                ) : (
                  <>
                    <a onClick={goProducts}>Goods</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current">
                      {products.find((p) => p.id === route.id)?.name || 'Product'}
                    </span>
                  </>
                )}
              </> :
            inCatalogSection ?
            <>
                <a onClick={goCatalog}>Sales</a>
                <span className="crumbs__sep">/</span>
                {route.name === 'catalog' ? (
                  <span className="crumbs__current">Catalog</span>
                ) : (
                  <>
                    <a onClick={goCatalog}>Catalog</a>
                    <span className="crumbs__sep">/</span>
                    <span className="crumbs__current">
                      {route.name === 'catalog-new'
                        ? 'New'
                        : (products.find((p) => p.id === route.id)?.name || 'Edit')}
                    </span>
                  </>
                )}
              </> :
            inMerchantsSection ?
            <>
                <a onClick={goMerchants}>Merchants</a>
                {route.name === 'merchant-detail' && (
                  <><span className="crumbs__sep">/</span><span className="crumbs__current">{currentMerchant ? currentMerchant.name : route.id}</span></>
                )}
              </> :

            <>
                <a onClick={goList}>Customers</a>
                {route.name === 'new' && <><span className="crumbs__sep">/</span><span className="crumbs__current">New</span></>}
                {route.name === 'detail' && current && <><span className="crumbs__sep">/</span><span className="crumbs__current">{current.name}</span></>}
              </>
            }
          </div>
          <div className="topbar__spacer" />
          <button type="button" className="topbar__search" onClick={() => setCmdkOpen(true)}>
            <Icon name="search" size={13} />
            <span data-comment-anchor="5bbeb0405f-span-109-13">Search…</span>
            <kbd>⌘K</kbd>
          </button>
          <window.NotificationBell
            toast={(msg, tone) => toast({ kind: tone === 'danger' ? 'error' : tone === 'info' ? 'info' : 'success', title: msg })}
            onViewAll={goNotifications}
            onOpen={goNotification} />
        </header>

        <div className="content">
          {route.name === 'list' &&
          <CustomerList customers={customers} onOpen={goDetail} onNew={goNew} />
          }
          {route.name === 'new' &&
          <CustomerWizard onCancel={goList} onComplete={(c) => {add(c);goDetail(c.id, 'operators');}} />
          }
          {route.name === 'detail' && current &&
          <CustomerDetail customer={current} orders={orders} initialTab={route.tab} onBack={goList} onUpdate={update} onOpenOrder={(id) => id === '__all__' ? goOrders() : goOrder(id)} onNewOrder={() => goNewOrder()} maskOn={t.maskSensitive} setMaskOn={(v) => setTweak('maskSensitive', v)} systemRoles={systemRoles} />
          }
          {route.name === 'detail' && !current &&
          <div className="page"><div className="empty">Customer not found. <a onClick={goList} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to list</a></div></div>
          }
          {route.name === 'customer-roles' && <Settings roles={systemRoles} setRoles={setSystemRoles} />}
          {route.name === 'admin-roles' && <AdminRoles users={users} />}
          {route.name === 'admin-users' && <AdminUsers users={users} setUsers={setUsers}/>}
          {route.name === 'orders' &&
          <OrderList
            orders={orders}
            onOpen={goOrder}
            onNew={goNewOrder}
            onBack={
              route.from === 'products' ? goProducts :
              route.from === 'product-detail' ? () => goProductDetail(route.fromId) :
              undefined
            }
            backLabel={
              route.from === 'products' ? 'Back to Goods' :
              route.from === 'product-detail' ? `Back to ${products.find((p) => p.id === route.fromId)?.name || 'Product'}` :
              undefined
            } />
          }
          {route.name === 'order-new' &&
          <OrderWizard customers={customers} onCancel={goOrders} onComplete={(o) => {addOrder(o);goOrder(o.id);}} />
          }
          {route.name === 'order' && currentOrder &&
          <OrderDetail order={currentOrder} onBack={goOrders} onUpdate={updateOrder} />
          }
          {route.name === 'order' && !currentOrder &&
          <div className="page"><div className="empty">Order not found. <a onClick={goOrders} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to orders</a></div></div>
          }
          {route.name === 'profile' && <ProfilePage user={CURRENT_USER} />}
          {route.name === 'account' && <AccountSecurityPage />}
          {route.name === 'workspaces' && <WorkspacesPage />}
          {route.name === 'activity' && <ActivityPage />}
          {route.name === 'help' && <HelpPage onOpenShortcuts={() => setCmdkOpen(true)} />}
          {route.name === 'feedback' && <FeedbackPage />}
          {route.name === 'audit' && <AuditLogPage />}
          {route.name === 'approvals' && window.ApprovalsPage && <window.ApprovalsPage />}
          {route.name === 'notifications' && window.NotificationsPage &&
            <window.NotificationsPage onOpen={goNotification} />}
          {route.name === 'notification' && window.NotificationDetail &&
            <window.NotificationDetail
              id={route.id}
              onBack={goNotifications}
              nav={{
                ticket:    (id) => goTicket(id),
                customer:  (id) => goDetail(id, 'operators'),
                app:       (id) => goApp(id),
                order:     (id) => goOrder(id),
                approvals: ()   => goApprovals(),
              }} />}
          {route.name === 'merchants' && window.MerchantsListScreen &&
            <window.MerchantsListScreen onOpen={(m) => goMerchant(m.id)} />
          }
          {route.name === 'merchant-detail' && currentMerchant && window.MerchantsDetailScreen &&
            <window.MerchantsDetailScreen merchant={currentMerchant} onBack={goMerchants} maskOn={t.maskSensitive} />
          }
          {route.name === 'merchant-detail' && !currentMerchant &&
            <div className="page"><div className="empty">Merchant not found. <a onClick={goMerchants} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to merchants</a></div></div>
          }
          {route.name === 'tickets' && window.TicketsListScreen &&
          <div className="tickets-host"><window.TicketsListScreen navigate={ticketsNavigate} /></div>
          }
          {route.name === 'ticket' && currentTicket && window.TicketDetailScreen &&
          <div className="tickets-host"><window.TicketDetailScreen ticket={currentTicket} navigate={ticketsNavigate} /></div>
          }
          {route.name === 'ticket' && !currentTicket &&
          <div className="page"><div className="empty">Ticket not found. <a onClick={goTickets} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to tickets</a></div></div>
          }
          {route.name === 'ticket-new' && window.NewTicketScreen &&
          <div className="tickets-host"><window.NewTicketScreen navigate={ticketsNavigate} presetSn={route.deviceSn} /></div>
          }
          {route.name === 'models' &&
          <DeviceModelList
            models={models}
            onNew={goNewModel}
            onEdit={goEditModel}
            onDelete={(m) => {
              // Delete guard (删除阻断): block while referenced by in-sale products
              // or unsettled orders. No soft-delete — model has no status field.
              const OPEN_ORDER_STATUSES = ['Awaiting payment', 'Awaiting shipment'];
              const prodRefs = products.filter((p) => p.deviceModelId === m.id).length;
              const orderRefs = orders.filter((o) =>
                OPEN_ORDER_STATUSES.includes(o.status) && (o.items || []).some((i) => i.modelId === m.id)
              ).length;
              if (prodRefs > 0 || orderRefs > 0) {
                const parts = [];
                if (prodRefs) parts.push(`${prodRefs} product${prodRefs === 1 ? '' : 's'}`);
                if (orderRefs) parts.push(`${orderRefs} open order${orderRefs === 1 ? '' : 's'}`);
                toast({ kind: 'error', title: `Can’t delete ${m.modelCode}`, desc: `Still referenced by ${parts.join(' and ')}. Unbind them first.` });
                return;
              }
              if (window.confirm(`Delete ${m.modelCode}? This cannot be undone.`)) { removeModel(m.id); toast({ kind: 'success', title: `${m.modelCode} deleted` }); }
            }} />
          }
          {route.name === 'model-new' &&
          <DeviceModelForm allModels={models} onCancel={goModels} onSave={(m) => { addModel(m); goModels(); }} />
          }
          {route.name === 'model-edit' && currentModel &&
          <DeviceModelForm initial={currentModel} allModels={models} onCancel={goModels} onSave={(m) => { updateModel(m); goModels(); }} />
          }
          {route.name === 'model-edit' && !currentModel &&
          <div className="page"><div className="empty">Device model not found. <a onClick={goModels} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to models</a></div></div>
          }
          {route.name === 'products' &&
          <ProductsBrowse products={products} onOpen={goProductDetail}
            cartQty={resolvedCartCount}
            cartSubtotal={cart.lines.reduce((s, l) => {
              const p = products.find((pp) => pp.id === l.productId);
              const v = p && p.variants.find((vv) => vv.id === l.variantId);
              return s + (v ? v.price * l.qty : 0);
            }, 0)}
            onOpenCart={() => setCartOpen(true)}
            onOpenOrders={() => goOrdersFrom('products')}
            onCheckout={() => { setCartOpen(false); setRoute({ name: 'checkout' }); }}
            onOrderNow={(prod, variant, qty, opts) => startBuyNow(prod, variant, qty, opts)}
            onQuickAdd={(prod, variant, qty, opts) => { cart.add(prod, variant, qty || 1, opts || {}); }} />
          }
          {route.name === 'product-detail' &&
          <ProductDetail productId={route.id} products={products}
            onBack={goProducts}
            cartQty={resolvedCartCount}
            cartSubtotal={cart.lines.reduce((s, l) => {
              const p = products.find((pp) => pp.id === l.productId);
              const v = p && p.variants.find((vv) => vv.id === l.variantId);
              return s + (v ? v.price * l.qty : 0);
            }, 0)}
            onOpenCart={() => setCartOpen(true)}
            onOpenOrders={() => goOrdersFrom('product-detail', route.id)}
            onCheckout={() => { setCartOpen(false); setRoute({ name: 'checkout' }); }}
            onOrderNow={(prod, variant, qty, opts) => startBuyNow(prod, variant, qty, opts)}
            onAddToCart={(prod, variant, qty) => { cart.add(prod, variant, qty); }} />
          }
          {route.name === 'checkout' &&
          <CheckoutWizard
            lines={buyNowLines || cart.lines}
            products={products}
            customers={customers}
            isBuyNow={!!buyNowLines}
            onSetQty={buyNowLines ? setBuyNowQty : cart.setQty}
            onRemove={buyNowLines ? removeBuyNow : cart.remove}
            onSetUnitPrice={buyNowLines ? setBuyNowUnitPrice : cart.setUnitPrice}
            onClearCart={buyNowLines ? clearBuyNow : cart.clear}
            onCancel={() => { setBuyNowLines(null); goProducts(); }}
            onBackToMall={() => {
              // "Continue order" — unified handler.
              // From cart entry: cart.lines persist; just navigate.
              // From Buy Now entry: merge buyNowLines into cart so the items
              // aren't lost when the user picks up more from Products, then
              // open the cart drawer so the user sees the item land in cart.
              const fromBuyNow = !!(buyNowLines && buyNowLines.length > 0);
              if (fromBuyNow) {
                cart.merge(buyNowLines);
                toast({ kind: 'success', title: 'Added to cart', msg: 'View it in the cart anytime.' });
              }
              setBuyNowLines(null);
              goProducts();
              if (fromBuyNow) {
                // Open cart drawer just after the route transition lands so
                // the drawer animates over the Products page (not Checkout).
                setTimeout(() => setCartOpen(true), 220);
              }
            }}
            onCreateOrder={(order) => { setBuyNowLines(null); addOrder(order); goOrder(order.id); }} />
          }
          {route.name === 'catalog' &&
          <ProductList products={products} models={models} onOpen={goEditProduct} onNew={goNewProduct}
            onDelete={(p) => {
              if (window.confirm(`Delete "${p.name}"? This permanently removes the product. This cannot be undone.`)) {
                removeProduct(p.id);
                toast({ kind: 'success', title: `${p.name} deleted` });
              }
            }} />
          }
          {route.name === 'catalog-new' &&
          <ProductForm models={models} onCancel={goCatalog} onSave={(p) => { addProduct(p); goCatalog(); }} />
          }
          {route.name === 'catalog-edit' && (() => {
            const currentProduct = products.find((p) => p.id === route.id);
            if (!currentProduct) {
              return <div className="page"><div className="empty">Product not found. <a onClick={goCatalog} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to Catalog</a></div></div>;
            }
            return <ProductForm initial={currentProduct} models={models} onCancel={goCatalog} onSave={(p) => { updateProduct(p); goCatalog(); }}
              onDelete={(prod) => {
                if (window.confirm(`Delete "${prod.name}"? This permanently removes the product. This cannot be undone.`)) {
                  removeProduct(prod.id);
                  toast({ kind: 'success', title: `${prod.name} deleted` });
                  goCatalog();
                }
              }} />;
          })()
          }
          {route.name === 'devices-list' && window.DevicesListScreen &&
            <div className="devices-host"><window.DevicesListScreen navigate={fleetNavigate} /></div>
          }
          {route.name === 'device-detail' && window.DeviceDetailScreen && (() => {
            const dev = window.findDeviceBySn?.(route.sn);
            if (!dev) {
              return <div className="page"><div className="empty">Device not found. <a onClick={goDevicesList} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to devices</a></div></div>;
            }
            const detailRoute = { screen: 'deviceDetail', deviceSn: dev.sn, tab: route.tab || 'basic' };
            return <div className="devices-host"><window.DeviceDetailScreen device={dev} route={detailRoute} navigate={fleetNavigate} /></div>;
          })()
          }
          {route.name === 'apps' &&
          <AppList apps={apps} onOpen={(id) => goApp(id)} onOpenPublisher={(cid) => goDetail(cid)} />
          }
          {route.name === 'app-publish' && <AppPublishHost />}
          {route.name === 'app-detail' && currentApp &&
          <AppDetail
            app={currentApp}
            initialTab={route.tab}
            onBack={goApps}
            onOpenPublisher={(cid) => goDetail(cid)}
            onOpenSubscriber={(cid) => goDetail(cid)}
            onOpenVersion={(vid) => goAppVersion(currentApp.id, vid)} />
          }
          {route.name === 'app-version' && currentApp && currentVersion &&
          <VersionDetail
            app={currentApp}
            version={currentVersion}
            onBack={() => goApp(currentApp.id, 'versions')}
            onOpenApp={(id) => goApp(id)} />
          }
          {route.name === 'app-version' && (!currentApp || !currentVersion) &&
          <div className="page"><div className="empty">Version not found. <a onClick={goApps} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to apps</a></div></div>
          }
          {route.name === 'app-detail' && !currentApp &&
          <div className="page"><div className="empty">App not found. <a onClick={goApps} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to apps</a></div></div>
          }
          {route.name === 'firmware' && window.FirmwareList &&
          <window.FirmwareList
            firmwares={firmwares}
            onOpen={(id) => goFirmwareDetail(id)}
            onUpload={goFirmwareUpload} />
          }
          {route.name === 'firmware-upload' && window.FirmwareUploadWizard &&
          <window.FirmwareUploadWizard
            onCancel={goFirmware}
            onSaved={({ fwId }) => goFirmwareDetail(fwId)}
            onCommit={addFirmwareVersion} />
          }
          {route.name === 'firmware-detail' && currentFirmware && window.FirmwareDetail &&
          <window.FirmwareDetail
            firmware={currentFirmware}
            initialTab={route.tab}
            onBack={goFirmware}
            onOpenVersion={(vid) => goFirmwareVersion(currentFirmware.id, vid)}
            onMutateVersion={(vid, fn) => mutateFirmwareVersion(currentFirmware.id, vid, fn)}
            onMutateFirmware={(fn) => mutateFirmware(currentFirmware.id, fn)} />
          }
          {route.name === 'firmware-detail' && !currentFirmware &&
          <div className="page"><div className="empty">Firmware not found. <a onClick={goFirmware} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to firmware list</a></div></div>
          }
          {route.name === 'firmware-version' && currentFirmware && currentFirmwareVersion && window.FirmwareVersionDetail &&
          <window.FirmwareVersionDetail
            firmware={currentFirmware}
            version={currentFirmwareVersion}
            onBack={() => goFirmwareDetail(currentFirmware.id, 'versions')}
            onOpenFirmware={(id, tab) => goFirmwareDetail(id, tab)}
            onMutateFirmware={(fn) => mutateFirmware(currentFirmware.id, fn)} />
          }
          {route.name === 'firmware-version' && (!currentFirmware || !currentFirmwareVersion) &&
          <div className="page"><div className="empty">Firmware version not found. <a onClick={goFirmware} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to firmware list</a></div></div>
          }
          {route.name === 'factory-images' && window.FactoryImageList &&
          <window.FactoryImageList
            images={factoryImages}
            onOpen={(id) => goFactoryImage(id)}
            onNew={goNewFactoryImage} />
          }
          {route.name === 'factory-image-new' && window.FactoryImageWizard &&
          <window.FactoryImageWizard
            existingImages={factoryImages}
            onCancel={goFactoryImages}
            onComplete={(fi) => { addFactoryImage(fi); goFactoryImage(fi.id); }} />
          }
          {route.name === 'factory-image' && currentFactoryImage && window.FactoryImageDetail &&
          <window.FactoryImageDetail
            factoryImage={currentFactoryImage}
            initialTab={route.tab}
            onBack={goFactoryImages}
            onUpdate={updateFactoryImage}
            onOpenCustomer={(cid) => goDetail(cid)} />
          }
          {route.name === 'factory-image' && !currentFactoryImage &&
          <div className="page"><div className="empty">Factory image not found. <a onClick={goFactoryImages} style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>Back to factory images</a></div></div>
          }
        </div>
      </main>

      {window.NotificationToaster && <window.NotificationToaster onOpen={goNotification} />}

      {cmdkOpen && (
        <CommandPalette
          customers={customers}
          orders={orders}
          onClose={() => setCmdkOpen(false)}
          onPick={(kind, id) => {
            setCmdkOpen(false);
            if (kind === 'customer') goDetail(id);
            else if (kind === 'order') goOrder(id);
            else if (kind === 'route') {
              if (id === 'list') goList();
              else if (id === 'orders') goOrders();
              else if (id === 'new') goNew();
              else if (id === 'order-new') goNewOrder();
              else if (id === 'customer-roles') goCustomerRoles();
              else if (id === 'admin-roles') goAdminRoles();
              else if (id === 'admin-users') goAdminUsers();
            }
          }}
        />
      )}

      <SignOutModal
        open={signOutOpen}
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => { setSignOutOpen(false); setSignedOut(true); }}
      />
      <LockScreen open={locked} user={CURRENT_USER} onUnlock={() => setLocked(false)} />
      {signedOut && (
        <div className="signedout">
          <div className="signedout__card">
            <div className="signedout__logo"><img src="assets/logo.png" alt="TOMS" /></div>
            <h2 className="signedout__title">You've been signed out</h2>
            <p className="signedout__sub">Your session ended at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Sign back in to continue.</p>
            <button type="button" className="tds-btn tds-btn--primary tds-btn--md" onClick={() => setSignedOut(false)}>Back to sign in</button>
            <div className="signedout__hint">Demo only — click to return to the workspace.</div>
          </div>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart.lines}
        products={products}
        onSetQty={cart.setQty}
        onRemove={cart.remove}
        onClear={cart.clear}
        onChangeVariant={cart.changeVariant}
        onChangeIntegrationMode={cart.setIntegrationMode}
        onAddLine={(prod, variant, integrationMode) => cart.add(prod, variant, 1, { integrationMode })}
        onOpenProduct={(pid) => { setCartOpen(false); goProductDetail(pid); }}
        onCheckout={() => { setCartOpen(false); setRoute({ name: 'checkout' }); }}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Demo state" />
        <TweakSelect label="Screen" value={t.demoState}
        options={['List', 'Wizard', 'Detail', 'Customer Role Definitions', 'Roles', 'Users', 'Orders', 'New order', 'Order detail', 'Products', 'Product detail', 'Catalog', 'New catalog product', 'Edit catalog product', 'Device models', 'New model', 'Edit model', 'Devices', 'Device detail', 'Factory Images', 'New factory image', 'Factory image detail', 'Firmware', 'Upload firmware', 'Firmware detail', 'Firmware deployments', 'Firmware version', 'Apps', 'App detail', 'App versions', 'App subscribers', 'App activity', 'Version detail', 'Tickets', 'Ticket detail', 'New ticket', 'Merchants', 'Merchant detail', 'Profile', 'Account', 'Workspaces', 'Activity', 'Help', 'Feedback', 'Audit log']}
        onChange={(v) => setTweak('demoState', v)} />

        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme || 'light'}
        options={['light', 'dark', 'system']}
        onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Language" value={t.lang || 'en'}
        options={['en', 'zh']}
        onChange={(v) => setTweak('lang', v)} />

        <TweakSection label="Display" />
        <TweakRadio label="Density" value={t.density}
        options={['comfortable', 'compact']}
        onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Mask sensitive data" value={t.maskSensitive}
        onChange={(v) => setTweak('maskSensitive', v)} />

        <TweakSection label="Demo flows" />
        <TweakButton label="Open invitation link (signed-in)" onClick={() => {
          const pending = users.find(u => u.status === 'PENDING');
          if (pending) {
            setSessionUser(CURRENT_USER);
            goOnboard(pending.id);
          } else {
            toast({ kind: 'warning', title: 'No pending invitations', msg: 'Invite a user first to generate a link.' });
          }
        }}/>
        <TweakButton label="Open invitation link (signed-out)" secondary onClick={() => {
          const pending = users.find(u => u.status === 'PENDING');
          if (pending) {
            setSessionUser(null);
            goOnboard(pending.id);
          } else {
            toast({ kind: 'warning', title: 'No pending invitations', msg: 'Invite a user first to generate a link.' });
          }
        }}/>
        <TweakButton label="Open invalid invitation" secondary onClick={() => goOnboard('not-a-real-token')}/>

        <TweakSection label="Notifications" />
        <TweakButton label="Simulate incoming notification" onClick={() => window.NC_simulate && window.NC_simulate()}/>
      </TweaksPanel>

      {/* density styles */}
      <style>{`
        [data-density="compact"] .page { padding: 18px 24px 48px; }
        [data-density="compact"] .stats { gap: 10px; margin-bottom: 14px; }
        [data-density="compact"] .stat { padding: 12px 14px; }
        [data-density="compact"] .stat__val { font-size: 20px; }
        [data-density="compact"] .info-card__body { padding: 14px 16px; }
        [data-density="compact"] .info-card__head { padding: 10px 16px; }
        [data-density="compact"] .crow { padding: 10px 14px; }
        [data-density="compact"] .det-header { padding: 16px 18px; }
        [data-density="compact"] .tds-table tbody td { padding: 8px 14px; }
        [data-density="compact"] .stepper { padding: 12px 16px; margin-bottom: 18px; }
      `}</style>
    </div>);

};

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);