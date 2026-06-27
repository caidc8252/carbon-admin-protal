/* global React, Btn, Input, Icon, Badge, useToast */
/* Audit log — cross-operator activity stream for compliance review */
const { useState: alUseState, useMemo: alUseMemo, useEffect: alUseEffect, useRef: alUseRef } = React;

// ─── Seed data ──────────────────────────────────────────────────────────────
const AL_OPERATORS = [
  { id: 'jd',  name: 'Jordan Diaz',     email: 'jordan.diaz@toms',     role: 'Admin',           hue: ['#5B7CFA', '#3D5BC9'] },
  { id: 'mh',  name: 'Maya Hernandez',  email: 'maya.h@toms',          role: 'Risk Manager',    hue: ['#FA8F5B', '#C95F3D'] },
  { id: 'rk',  name: 'Ravi Kapoor',     email: 'ravi.k@toms',          role: 'Onboarding Ops',  hue: ['#3DC97A', '#1F9A52'] },
  { id: 'sc',  name: 'Sofia Chen',      email: 'sofia.c@toms',         role: 'Contracts Lead',  hue: ['#7A5BFA', '#5A3DC9'] },
  { id: 'lt',  name: 'Liam Thompson',   email: 'liam.t@toms',          role: 'Tier 2 Support',  hue: ['#C24E8B', '#962F66'] },
  { id: 'aw',  name: 'Aisha Williams',  email: 'aisha.w@toms',         role: 'Finance',         hue: ['#5BC5FA', '#3D9AC9'] },
  { id: 'sys', name: 'System',          email: 'automation@toms',      role: 'Automation',      hue: ['#8A8F99', '#5E626B'] },
];

const AL_CATEGORIES = ['All', 'Authentication', 'Customer', 'Order', 'Contract', 'Operator', 'Settings', 'Security'];
const AL_RESULTS    = ['All', 'Success', 'Warning', 'Failed'];

// action → category + tone mapping
const AL_EVENTS = [
  // Today
  { id: 'ev-1041', ts: '2026-05-13T14:48:22', op: 'jd',  cat: 'Customer',       action: 'customer.update',      target: 'Greenline Tech',          targetType: 'Customer',  result: 'Success', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Updated billing email to ops@greenline.tech' },
  { id: 'ev-1040', ts: '2026-05-13T14:31:05', op: 'mh',  cat: 'Security',       action: 'risk.flag.cleared',    target: 'Northpoint Industries',   targetType: 'Customer',  result: 'Success', ip: '52.18.114.6',  ua: 'Firefox 128 · Win',  detail: 'Cleared sanctions screening hit after manual review' },
  { id: 'ev-1039', ts: '2026-05-13T14:12:41', op: 'sc',  cat: 'Contract',       action: 'contract.sign',        target: 'ISV MSA — Bayfront Studios', targetType: 'Contract', result: 'Success', ip: '99.32.7.221',  ua: 'Safari 17 · macOS',  detail: 'Counter-signed via DocuSign envelope 8F3-A91' },
  { id: 'ev-1038', ts: '2026-05-13T13:55:18', op: 'rk',  cat: 'Customer',       action: 'customer.create',      target: 'Cypress Roastery',        targetType: 'Customer',  result: 'Success', ip: '24.96.8.119',  ua: 'Chrome 126 · Win',   detail: 'New ISO customer · 4 docs uploaded' },
  { id: 'ev-1037', ts: '2026-05-13T13:21:09', op: 'jd',  cat: 'Operator',       action: 'operator.role.change', target: 'liam.t@toms',             targetType: 'Operator',  result: 'Success', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Elevated from Tier 1 → Tier 2 Support' },
  { id: 'ev-1036', ts: '2026-05-13T12:58:44', op: 'lt',  cat: 'Order',          action: 'order.refund',         target: 'ORD-2451 · Acme Foods',   targetType: 'Order',     result: 'Warning', ip: '173.5.21.88',  ua: 'Chrome 125 · Win',   detail: 'Partial refund $238.40 — flagged for daily review' },
  { id: 'ev-1035', ts: '2026-05-13T11:43:02', op: 'sys', cat: 'Authentication', action: 'session.expire',       target: 'aisha.w@toms',            targetType: 'Operator',  result: 'Success', ip: '—',            ua: 'Scheduled task',     detail: 'Idle timeout after 30 min · 1 session ended' },
  { id: 'ev-1033', ts: '2026-05-13T09:14:36', op: 'jd',  cat: 'Authentication', action: 'auth.signin',          target: 'jordan.diaz@toms',        targetType: 'Operator',  result: 'Success', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Signed in with SSO · device trusted' },
  { id: 'ev-1032', ts: '2026-05-13T08:51:12', op: 'mh',  cat: 'Authentication', action: 'auth.signin.failed',   target: 'maya.h@toms',             targetType: 'Operator',  result: 'Failed',  ip: '198.51.100.4', ua: 'Firefox 128 · Win',  detail: 'Wrong password · 1st of 5 allowed attempts' },

  // Yesterday
  { id: 'ev-1031', ts: '2026-05-12T17:42:55', op: 'sc',  cat: 'Contract',       action: 'contract.archive',     target: 'ISO Schedule A — Pier 41', targetType: 'Contract', result: 'Success', ip: '99.32.7.221',  ua: 'Safari 17 · macOS',  detail: 'Archived expired schedule · retention: 7 years' },
  { id: 'ev-1030', ts: '2026-05-12T16:11:08', op: 'jd',  cat: 'Settings',       action: 'settings.role.update', target: 'Role: ISO Operator T2',   targetType: 'Role',      result: 'Success', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Added permission contract.view · 4 operators affected' },
  { id: 'ev-1029', ts: '2026-05-12T15:34:47', op: 'rk',  cat: 'Customer',       action: 'customer.kyc.approve', target: 'Bayfront Studios',        targetType: 'Customer',  result: 'Success', ip: '24.96.8.119',  ua: 'Chrome 126 · Win',   detail: 'KYC approved · risk score 28/100' },
  { id: 'ev-1028', ts: '2026-05-12T14:02:22', op: 'jd',  cat: 'Operator',       action: 'operator.revoke',      target: 'j.chen@partner.io',       targetType: 'Operator',  result: 'Warning', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Reason: terminated employment · sessions invalidated' },
  { id: 'ev-1027', ts: '2026-05-12T11:47:01', op: 'lt',  cat: 'Order',          action: 'order.status.update',  target: 'ORD-2447 · Harbor Eats',  targetType: 'Order',     result: 'Success', ip: '173.5.21.88',  ua: 'Chrome 125 · Win',   detail: 'In transit → Delivered · 12 terminals' },
  { id: 'ev-1026', ts: '2026-05-12T10:18:39', op: 'sys', cat: 'Security',       action: 'security.scan.daily',  target: 'Workspace: Production',   targetType: 'Workspace', result: 'Success', ip: '—',            ua: 'Scheduled task',     detail: '0 high · 2 medium · 14 low findings' },
  { id: 'ev-1025', ts: '2026-05-12T09:32:14', op: 'aw',  cat: 'Settings',       action: 'settings.export',      target: 'Audit log · April',       targetType: 'Report',    result: 'Success', ip: '88.213.7.55',  ua: 'Chrome 126 · macOS', detail: 'Exported 2,418 rows as CSV · 412 KB' },

  // Earlier
  { id: 'ev-1024', ts: '2026-05-11T18:09:53', op: 'mh',  cat: 'Security',       action: 'risk.flag.raised',     target: 'Coastline Ventures',      targetType: 'Customer',  result: 'Warning', ip: '52.18.114.6',  ua: 'Firefox 128 · Win',  detail: 'PEP screening hit · manual review queued' },
  { id: 'ev-1023', ts: '2026-05-11T15:21:08', op: 'sc',  cat: 'Contract',       action: 'contract.send',        target: 'Acquirer MSA — Lumen POS', targetType: 'Contract', result: 'Success', ip: '99.32.7.221',  ua: 'Safari 17 · macOS',  detail: 'Sent for signature to 3 recipients' },
  { id: 'ev-1022', ts: '2026-05-11T13:44:31', op: 'jd',  cat: 'Settings',       action: 'settings.theme.update', target: 'Workspace: Production',  targetType: 'Workspace', result: 'Success', ip: '73.241.0.18',  ua: 'Chrome 126 · macOS', detail: 'Updated primary brand color · logo replaced' },
  { id: 'ev-1021', ts: '2026-05-11T10:02:17', op: 'rk',  cat: 'Customer',       action: 'customer.delete',      target: 'Test Customer XYZ',       targetType: 'Customer',  result: 'Failed',  ip: '24.96.8.119',  ua: 'Chrome 126 · Win',   detail: 'Blocked: customer has 2 active contracts' },
  { id: 'ev-1020', ts: '2026-05-11T09:48:00', op: 'sys', cat: 'Authentication', action: 'auth.session.purge',   target: 'All operators',           targetType: 'Workspace', result: 'Success', ip: '—',            ua: 'Scheduled task',     detail: 'Weekly purge: 142 expired sessions removed' },
];

// ─── Action → tone for the small icon chip ─────────────────────────────────
const AL_ACTION_TONE = {
  Authentication: 'info',
  Customer:       'success',
  Order:          'info',
  Contract:       'warning',
  Operator:       'success',
  Settings:       'neutral',
  Security:       'warning',
};
const AL_ACTION_ICON = {
  Authentication: 'shield',
  Customer:       'users',
  Order:          'package',
  Contract:       'file',
  Operator:       'operator',
  Settings:       'settings',
  Security:       'shield',
};
const AL_RESULT_TONE = { Success: 'success', Warning: 'warning', Failed: 'error' };

// ─── Generate filler events so pagination is meaningful ────────────────────
const AL_FILLER_TEMPLATES = [
  { cat: 'Authentication', action: 'auth.signin',           targetType: 'Operator',  result: 'Success', detail: 'Signed in with SSO · device trusted' },
  { cat: 'Authentication', action: 'auth.signin.failed',    targetType: 'Operator',  result: 'Failed',  detail: 'Wrong password · attempt logged' },
  { cat: 'Authentication', action: 'auth.mfa.challenge',    targetType: 'Operator',  result: 'Success', detail: 'MFA challenge passed · TOTP' },
  { cat: 'Authentication', action: 'session.expire',        targetType: 'Operator',  result: 'Success', detail: 'Idle timeout · session ended' },
  { cat: 'Customer',       action: 'customer.update',       targetType: 'Customer',  result: 'Success', detail: 'Updated billing address' },
  { cat: 'Customer',       action: 'customer.view.sensitive', targetType: 'Customer', result: 'Warning', detail: 'Revealed sensitive contact info · written to audit' },
  { cat: 'Customer',       action: 'customer.kyc.approve',  targetType: 'Customer',  result: 'Success', detail: 'KYC approved after document review' },
  { cat: 'Customer',       action: 'customer.note.add',     targetType: 'Customer',  result: 'Success', detail: 'Added internal note · risk team' },
  { cat: 'Order',          action: 'order.status.update',   targetType: 'Order',     result: 'Success', detail: 'In transit → Delivered' },
  { cat: 'Order',          action: 'order.refund',          targetType: 'Order',     result: 'Warning', detail: 'Partial refund · daily review queue' },
  { cat: 'Order',          action: 'order.cancel',          targetType: 'Order',     result: 'Success', detail: 'Cancelled prior to fulfillment' },
  { cat: 'Contract',       action: 'contract.send',         targetType: 'Contract',  result: 'Success', detail: 'Sent for signature · DocuSign envelope' },
  { cat: 'Contract',       action: 'contract.sign',         targetType: 'Contract',  result: 'Success', detail: 'Counter-signed by operator' },
  { cat: 'Contract',       action: 'contract.archive',      targetType: 'Contract',  result: 'Success', detail: 'Archived expired schedule · 7y retention' },
  { cat: 'Operator',       action: 'operator.role.change',  targetType: 'Operator',  result: 'Success', detail: 'Role elevated after manager approval' },
  { cat: 'Operator',       action: 'operator.invite',       targetType: 'Operator',  result: 'Success', detail: 'Invite sent · expires in 7 days' },
  { cat: 'Operator',       action: 'operator.revoke',       targetType: 'Operator',  result: 'Warning', detail: 'Sessions invalidated · ticket linked' },
  { cat: 'Settings',       action: 'settings.role.update',  targetType: 'Role',      result: 'Success', detail: 'Updated permission set' },
  { cat: 'Settings',       action: 'settings.export',       targetType: 'Report',    result: 'Success', detail: 'Exported report as CSV' },
  { cat: 'Security',       action: 'risk.flag.raised',      targetType: 'Customer',  result: 'Warning', detail: 'PEP screening hit · manual review queued' },
  { cat: 'Security',       action: 'risk.flag.cleared',     targetType: 'Customer',  result: 'Success', detail: 'Cleared after manual review' },
  { cat: 'Security',       action: 'security.scan.daily',   targetType: 'Workspace', result: 'Success', detail: 'Daily scan completed · 0 high findings' },
];
const AL_FILLER_TARGETS = {
  Customer:  ['Northpoint Industries', 'Bayfront Studios', 'Cypress Roastery', 'Acme Foods', 'Pier 41', 'Harbor Eats', 'Coastline Ventures', 'Greenline Tech', 'Lumen POS', 'Anvil Hardware', 'Sterling Capital', 'Marigold Bakery', 'Riverstone Holdings'],
  Order:     ['ORD-2401 · Acme Foods', 'ORD-2417 · Pier 41', 'ORD-2429 · Anvil Hardware', 'ORD-2444 · Marigold Bakery', 'ORD-2452 · Sterling Capital', 'ORD-2466 · Riverstone Holdings'],
  Contract:  ['ISV MSA — Bayfront Studios', 'ISO Schedule A — Pier 41', 'Acquirer MSA — Lumen POS', 'PayFac Addendum — Sterling', 'ISV MSA — Cypress Roastery'],
  Operator:  ['liam.t@toms', 'aisha.w@toms', 'sofia.c@toms', 'ravi.k@toms', 'maya.h@toms', 'jordan.diaz@toms', 'j.chen@partner.io'],
  Role:      ['Role: ISO Operator T2', 'Role: Compliance Reviewer', 'Role: Read-only Finance', 'Role: Onboarding Ops'],
  Workspace: ['Workspace: Production', 'Workspace: Staging'],
  Report:    ['Audit log · April', 'Customer roster · Q1', 'Operator activity · Week 18'],
};
const AL_IPS = ['73.241.0.18', '52.18.114.6', '99.32.7.221', '24.96.8.119', '88.213.7.55', '173.5.21.88', '198.51.100.4', '203.0.113.42', '76.14.91.203', '64.225.18.7'];
const AL_UAS = ['Chrome 126 · macOS', 'Firefox 128 · Win', 'Safari 17 · macOS', 'Chrome 125 · Win', 'Edge 126 · Win', 'Safari 17 · iPadOS'];

// Deterministic PRNG so the seed is stable.
const alRand = (() => {
  let s = 0x12345678;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
})();
const alPick = (arr) => arr[Math.floor(alRand() * arr.length)];

const generateFiller = (startIso, count) => {
  const rows = [];
  let cursor = new Date(startIso).getTime();
  for (let i = 0; i < count; i++) {
    // Step back 5–55 minutes per row.
    cursor -= (300 + Math.floor(alRand() * 3000)) * 1000;
    const tpl = AL_FILLER_TEMPLATES[Math.floor(alRand() * AL_FILLER_TEMPLATES.length)];
    const operator = tpl.action.startsWith('session.') || tpl.action.startsWith('security.scan') ? 'sys' :
      alPick(AL_OPERATORS.filter((o) => o.id !== 'sys')).id;
    rows.push({
      id: `ev-${900 + i}`,
      ts: new Date(cursor).toISOString().slice(0, 19),
      op: operator,
      cat: tpl.cat,
      action: tpl.action,
      target: alPick(AL_FILLER_TARGETS[tpl.targetType] || ['Workspace: Production']),
      targetType: tpl.targetType,
      result: tpl.result,
      ip: operator === 'sys' ? '—' : alPick(AL_IPS),
      ua: operator === 'sys' ? 'Scheduled task' : alPick(AL_UAS),
      detail: tpl.detail,
    });
  }
  return rows;
};

const AL_EVENTS_ALL = [...AL_EVENTS, ...generateFiller('2026-05-11T09:00:00', 140)];

// ui-spec §11: 12 小时制 h:mm AM/PM（审计行当前不显示秒，沿用无秒）。
const alFmtTime = (iso) => window.fmtTime(iso);
const alFmtDay = (iso) => {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const AuditLogPage = ({ onOpenEvent }) => {
  const toast = useToast();
  // §4: 统一搜索栏——draft → applied，点 Search / Enter 才生效（R-01）。
  const { draft, applied, setDraft, runSearch } = window.useSearchBar({
    op: 'all', result: 'All', from: '', to: '',
  });
  const [page, setPage]         = alUseState(1);
  const [pageSize, setPageSize] = alUseState(25);
  const toolbarRef = alUseRef(null);

  const opById = AL_OPERATORS.reduce((m, o) => (m[o.id] = o, m), {});

  const filtered = alUseMemo(() => {
    const fromTs = applied.from ? new Date(applied.from + 'T00:00:00').getTime() : null;
    const toTs = applied.to ? new Date(applied.to + 'T23:59:59.999').getTime() : null;
    return AL_EVENTS_ALL.filter((e) => {
      if (applied.op !== 'all' && e.op !== applied.op) return false;
      if (applied.result !== 'All' && e.result !== applied.result) return false;
      const t = new Date(e.ts).getTime();
      if (fromTs != null && t < fromTs) return false;
      if (toTs != null && t > toTs) return false;
      return true;
    });
  }, [applied]);

  // Reset page if filters change
  alUseEffect(() => { setPage(1); }, [applied, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);
  const hasFilters = applied.op !== 'all' || applied.result !== 'All' || !!applied.from || !!applied.to;

  return (
    <div className="page page--list">
      <window.TitleBar
        title="Audit log"
        subtitle="Every action taken by an operator in this workspace. Retained 7 years for compliance."
      />

      {/* Filter bar — §4 standard SearchBar (draft → applied on Search/Enter) */}
      <div ref={toolbarRef} className="list-toolbar-wrap">
      <window.SearchBar onSearch={runSearch} sticky={false}>
        <window.SearchCombo
          value={draft.op}
          onChange={(v) => setDraft({ op: v })}
          icon="users"
          width={220}
          searchPlaceholder="Filter operators…"
          emptyText="No matching operators"
          options={[
            { value: 'all', label: `All operators (${AL_OPERATORS.length})` },
            ...AL_OPERATORS.map((o) => ({ value: o.id, label: o.name })),
          ]}
        />
        <window.SearchSelect
          value={draft.result}
          onChange={(v) => setDraft({ result: v })}
          options={AL_RESULTS.map((r) => ({ value: r, label: r === 'All' ? 'All results' : r }))}
        />
        <label className="al-datefield">
          <span className="al-datefield__lbl">From</span>
          <input type="date" value={draft.from} max={draft.to || undefined} onChange={(ev) => setDraft({ from: ev.target.value })} />
        </label>
        <label className="al-datefield">
          <span className="al-datefield__lbl">To</span>
          <input type="date" value={draft.to} min={draft.from || undefined} onChange={(ev) => setDraft({ to: ev.target.value })} />
        </label>
      </window.SearchBar>
      </div>

      {/* Standard list card — sticky head + sticky thead via CSS vars (§3) */}
      <window.ListCard toolbarRef={toolbarRef}>
        <window.ListCardHead
          count={filtered.length}
          unit={`event${filtered.length === 1 ? '' : 's'}`}
          hasFilters={hasFilters}>
          <Btn variant="ghost" icon="download" size="sm"
            onClick={() => toast({ kind: 'success', title: 'Export queued', desc: `${filtered.length.toLocaleString()} rows · CSV` })}>
            Export
          </Btn>
        </window.ListCardHead>
        <table className="tds-table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Time</th>
              <th style={{ width: '24%' }}>Operator</th>
              <th>Action &amp; target</th>
              <th style={{ width: 120 }}>Result</th>
              <th style={{ width: 120, textAlign: 'right' }}>IP</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ?
              <tr><td colSpan="6">
                <div className="empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  {hasFilters ? 'No events match these filters.' : 'No events yet.'}
                </div>
              </td></tr> :
            pageRows.map((e) => {
              const op = opById[e.op];
              return (
                <tr key={e.id} onClick={() => onOpenEvent && onOpenEvent(e.id)} style={{ cursor: 'pointer' }}>
                  <td className="al-trow__time">
                    <div>{alFmtTime(e.ts)}</div>
                    <div className="al-trow__date">{new Date(e.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </td>
                  <td>
                    <div className="al-trow__op">
                      <div className="al-trow__opmeta">
                        <div className="al-trow__opname">{op.name}</div>
                        <div className="al-trow__oprole">{op.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="al-trow__main">
                    <div className="al-trow__action-line">
                      <code className="al-trow__action">{e.action}</code>
                    </div>
                    <div className="al-trow__target">
                      <span style={{ color: 'var(--color-text-tertiary)' }}>on </span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{e.target}</span>
                      <span className="muted"> · {e.targetType}</span>
                    </div>
                  </td>
                  <td><Badge tone={AL_RESULT_TONE[e.result]} dot>{e.result}</Badge></td>
                  <td className="al-trow__ip">{e.ip}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="iconbtn" onClick={(ev) => { ev.stopPropagation(); onOpenEvent && onOpenEvent(e.id); }}>
                      <Icon name="chevR" size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {window.Pagination &&
          <window.Pagination
            total={filtered.length}
            totalUnfiltered={AL_EVENTS_ALL.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
            pageSizeOptions={[25, 50, 100]}
            unit="events"
            divider />
        }
      </window.ListCard>

      <style>{`
        .al-datefield { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; background: var(--color-bg-2); border: 1px solid var(--color-border-default); border-radius: 7px; }
        .al-datefield:focus-within { border-color: var(--color-border-focus); box-shadow: var(--shadow-focus); }
        .al-datefield__lbl { font-size: 12.5px; color: var(--color-text-tertiary); }
        .al-datefield input { border: 0; background: transparent; font: 13px var(--font-family-sans); color: var(--color-text-primary); outline: none; font-variant-numeric: tabular-nums; cursor: pointer; }

        /* Row content (inside standard .tds-table) */
        .al-trow__time { font: 500 12px var(--font-family-mono); color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; white-space: nowrap; line-height: 1.25; }
        .al-trow__date { font-size: 11px; color: var(--color-text-tertiary); opacity: 0.7; margin-top: 1px; }
        .al-trow__op { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .al-row__avatar { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: grid; place-items: center; font: 600 10px var(--font-family-sans); flex: none; letter-spacing: -0.01em; }
        .al-trow__opmeta { min-width: 0; }
        .al-trow__opname { font-size: 13px; font-weight: 500; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.25; }
        .al-trow__oprole { font-size: 11.5px; color: var(--color-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.25; }

        .al-row__chip { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; flex: none; }
        .al-row__chip--info    { background: var(--color-info-50);    color: var(--color-info-700);    border: 1px solid oklch(60% 0.14 230 / 0.25); }
        .al-row__chip--success { background: var(--color-success-50); color: var(--color-success-700); border: 1px solid oklch(58% 0.14 152 / 0.25); }
        .al-row__chip--warning { background: var(--color-warning-50); color: var(--color-warning-700); border: 1px solid oklch(70% 0.16 70 / 0.25); }
        .al-row__chip--neutral { background: var(--color-bg-3);       color: var(--color-text-secondary); border: 1px solid var(--color-border-default); }

        .al-trow__main { min-width: 0; }
        .al-trow__action-line { display: flex; align-items: center; gap: 8px; line-height: 1.2; margin-bottom: 3px; }
        .al-trow__action { font: 500 12.5px var(--font-family-mono); background: var(--color-bg-3); color: var(--color-text-primary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--color-border-subtle); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
        .al-trow__target { font-size: 12px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .al-trow__ip { font: 500 11.5px var(--font-family-mono); color: var(--color-text-tertiary); text-align: right; font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
};

// ─── Standalone event-detail page (§8 detail layout) ──────────────────────
const AuditEventDetail = ({ id, onBack }) => {
  const toast = useToast();
  const e = AL_EVENTS_ALL.find((x) => x.id === id);
  const opById = AL_OPERATORS.reduce((m, o) => (m[o.id] = o, m), {});

  if (!e) {
    return (
      <div className="page page--detail">
        <window.TitleBar back onBack={onBack} backLabel="Back to Audit log" title="Event not found" />
        <div className="empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
          This audit event no longer exists.
        </div>
      </div>
    );
  }

  const op = opById[e.op];
  return (
    <div className="page page--detail">
      <window.TitleBar
        back
        onBack={onBack}
        backLabel="Back to Audit log"
        title={<code style={{ fontFamily: 'var(--font-family-mono)' }}>{e.action}</code>}
        badges={<Badge tone={AL_RESULT_TONE[e.result]} dot>{e.result}</Badge>}
        meta={<span className="ndet__time" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <Icon name="clock" size={13} /> {new Date(e.ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>}
      />

      <div className="ndet">
        {/* Summary */}
        <div className="ndet__section">
          <p className="ndet__detail">{e.detail}</p>
        </div>

        {/* Event metadata */}
        <div className="ndet__metagrid">
          <div className="ndet__metarow"><span className="ndet__meta-label">Event ID</span><span className="ndet__meta-value is-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{e.id}<button type="button" className="iconbtn" title="Copy event ID" style={{ width: 22, height: 22 }} onClick={() => { navigator.clipboard?.writeText(e.id); toast({ kind: 'success', title: 'Event ID copied' }); }}><Icon name="copy" size={13} /></button></span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Category</span><span className="ndet__meta-value">{e.cat}</span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Target</span><span className="ndet__meta-value">{e.target} <span className="muted" style={{ fontWeight: 400 }}>({e.targetType})</span></span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Result</span><span className="ndet__meta-value"><Badge tone={AL_RESULT_TONE[e.result]} dot>{e.result}</Badge></span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">IP address</span><span className="ndet__meta-value is-mono">{e.ip}</span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Client</span><span className="ndet__meta-value">{e.ua}</span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Session</span><span className="ndet__meta-value is-mono">sess_{e.id.slice(-6)}</span></div>
          <div className="ndet__metarow"><span className="ndet__meta-label">Operator</span><span className="ndet__meta-value">{op.name} <span className="muted" style={{ fontWeight: 400 }}>· {op.email} · {op.role}</span></span></div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AuditLogPage, AuditEventDetail });
