/* global React */
// ─────────────────────────────────────────────────────────────
// Lazy "fleet" chunk — tickets + workbench.
//
// (Devices — devices-fleet.jsx + devices-list-search.jsx — used to live here
// too, but now load EAGERLY in index.html so the design-tool's data-om-id
// tagging applies and the Devices UI is fully markable. They are no longer
// part of this chunk.)
//
// tickets.jsx + workbench-shims.jsx + workbench.jsx are still large and not
// needed until the user opens Support → Tickets or the Workbench, so we keep
// the same fetch + Babel-transform + inject on first use, cache the promise
// globally. Same pattern as the App Publish bundle in app.jsx.
//
// Load order inside the chunk: tickets → workbench-shims → workbench
// (workbench-shims overrides currentRole AFTER tickets.jsx). PROD_DEVICES is
// already seeded eagerly by devices-fleet.jsx, so no seeding dance is needed
// here anymore.
// ─────────────────────────────────────────────────────────────

const FLEET_FILES = [
  'tickets.jsx',
  'workbench-shims.jsx',
  'workbench.jsx',
];

window.__FLEET_STATUS__ = window.__FLEET_STATUS__ || 'idle';

window.loadFleetModules = function loadFleetModules() {
  if (window.__FLEET_PROMISE__) return window.__FLEET_PROMISE__;
  window.__FLEET_STATUS__ = 'loading';
  window.__FLEET_PROMISE__ = (async () => {
    // Fetch all sources in parallel…
    const sources = await Promise.all(FLEET_FILES.map(async (f) => {
      const res = await fetch(f);
      if (!res.ok) throw new Error(f + ' → HTTP ' + res.status);
      return res.text();
    }));

    // merchants-data.jsx (eager) syncs synthesized merchant-terminal SNs into
    // window.PROD_DEVICES via setTimeout(0). devices-fleet.jsx now seeds the
    // canonical fleet EAGERLY at boot (before that setTimeout fires), and the
    // merchants-data merge is push-if-absent, so no PROD_DEVICES juggling is
    // needed here.
    //
    // The (also-lazy) App Publish bundle seeds window.TICKETS with
    // its own smaller seed when it happens to load first. The canonical seed
    // lives in tickets.jsx — drop a foreign pre-seed so it wins, exactly as
    // it did when tickets.jsx was loaded eagerly on boot.
    if (window.TICKETS && !window.__FLEET_TICKETS__) window.TICKETS = undefined;

    // …then transform + inject sequentially (order matters), yielding to
    // the event loop between files so the spinner keeps animating.
    for (let i = 0; i < sources.length; i++) {
      await new Promise((r) => setTimeout(r, 0));
      const out = window.Babel.transform(sources[i], {
        presets: ['react'],
        filename: FLEET_FILES[i],
      }).code;
      const s = document.createElement('script');
      s.textContent = out;
      document.body.appendChild(s);
    }

    window.__FLEET_TICKETS__ = true;
    window.__FLEET_STATUS__ = 'ready';
    window.dispatchEvent(new Event('toms:fleet-ready'));
  })();
  window.__FLEET_PROMISE__.catch((err) => {
    console.error('[fleet] lazy chunk failed to load', err);
    window.__FLEET_STATUS__ = 'error';
  });
  return window.__FLEET_PROMISE__;
};

// ─── FleetGate — route host ──────────────────────────────────
// Renders a centered spinner until the chunk is in, then calls
// children() to render the real screen. Mirrors AppPublishHost.
function FleetGate({ children, full = false }) {
  const [status, setStatus] = React.useState(
    window.__FLEET_STATUS__ === 'ready' ? 'ready' : 'loading'
  );
  React.useEffect(() => {
    if (window.__FLEET_STATUS__ === 'ready') return;
    let on = true;
    window.loadFleetModules()
      .then(() => { if (on) setStatus('ready'); })
      .catch(() => { if (on) setStatus('error'); });
    return () => { on = false; };
  }, []);

  if (status === 'ready') return children();

  return (
    <div style={{ flex: 1, minHeight: full ? '100vh' : 360,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 16, background: 'var(--color-bg-1)' }}>
      {status === 'error' ? (
        <div style={{ padding: 24, color: 'var(--color-text-tertiary)', fontSize: 13.5, textAlign: 'center' }}>
          Module failed to load. Check console.
        </div>
      ) : (
        <>
          <div style={{ width: 30, height: 30, borderRadius: '50%',
                        border: '2.5px solid var(--color-border-default)',
                        borderTopColor: 'var(--color-primary-700)',
                        animation: 'boot-spin 0.7s linear infinite' }}></div>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>Loading</div>
        </>
      )}
    </div>
  );
}

// ─── Idle prefetch ───────────────────────────────────────────
// Cmd+K device search, the customer-detail terminal drawer and
// ticket lookups all read fleet globals without visiting a fleet
// route first. Prefetch the chunk once boot has settled so those
// surfaces stay fully functional — off the critical path.
setTimeout(() => {
  if (!window.__FLEET_PROMISE__) window.loadFleetModules();
}, 3500);

Object.assign(window, { FleetGate });
