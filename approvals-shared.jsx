/* global React, ReactDOM, Icon, Btn, Badge, Modal, Field, Input, Textarea, CompanyLogo, useToast, maskEmail, relTime */
// ──────────────────────────────────────────────────────────────
// Approval workflow — global store + UI primitives.
// Ported from approval-prototype.jsx and wired into the main shell so
// "Change email" and "Promote to Admin" on the operators table go through a
// second-admin review instead of applying immediately.
// ──────────────────────────────────────────────────────────────
const { useState: aw_useState, useEffect: aw_useEffect, useMemo: aw_useMemo, useRef: aw_useRef } = React;

// ─── Personas (simulated admins for the demo) ───────────────────
const AW_PERSONAS = {
  'sam@carbon':   { id: 'sam@carbon',   name: 'Sam Park',   initials: 'SP', short: 'Sam' },
  'priya@carbon': { id: 'priya@carbon', name: 'Priya Chen', initials: 'PC', short: 'Priya' },
  'wei@carbon':   { id: 'wei@carbon',   name: 'Wei Liu',    initials: 'WL', short: 'Wei' },
};
const awPersonaName = (id) => AW_PERSONAS[id]?.name || id;

const AW_STATUS_META = {
  pending:   { label: 'Pending review', tone: 'warning' },
  approved:  { label: 'Approved',       tone: 'success' },
  rejected:  { label: 'Rejected',       tone: 'neutral' },
  withdrawn: { label: 'Withdrawn',      tone: 'neutral' },
};
const AW_TYPE_META = {
  'change-email':  { label: 'Change Email',     icon: 'mail',   cardCls: 'acard__icon--info' },
  'promote-admin': { label: 'Promote to Admin', icon: 'shield', cardCls: 'acard__icon--warn' },
};

// ─── Time helpers ────────────────────────────────────────────────
const awIsoNow = () => new Date().toISOString();
const awAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const awFmtRel = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const awFmtFull = (iso) => new Date(iso).toLocaleString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ─── Store ──────────────────────────────────────────────────────
const AW_KEY = 'carbon.aw.v2';
// Mock customer + operator pool used to fabricate a realistic ~30-row dataset
// so the Approvals page can exercise filtering / pagination without depending on
// the live customer table. Each entry stays internally consistent (operator
// email domain matches customer domain when given).
const AW_MOCK_CUSTOMERS = [
  { name: 'Foundry Robotics',     domain: 'foundry.io' },
  { name: 'Acme Health',          domain: 'acmehealth.com' },
  { name: 'Northstar Cabs',       domain: 'northstar.co' },
  { name: 'Harbor Eats',          domain: 'harboreats.com' },
  { name: 'Bluepeak Capital',     domain: 'bluepeak.com' },
  { name: 'Cedar & Pine Hotels',  domain: 'cedarpine.com' },
  { name: 'Greenline Grocers',    domain: 'greenline.shop' },
  { name: 'Lumen Studios',        domain: 'lumenstudios.io' },
  { name: 'Pioneer Logistics',    domain: 'pioneer-log.com' },
  { name: 'Quarry Hardware',      domain: 'quarryhw.com' },
  { name: 'Riverstone Bank',      domain: 'riverstone.bank' },
  { name: 'Solace Pharmacy',      domain: 'solacepharma.com' },
  { name: 'Tidewater Auto',       domain: 'tidewaterauto.com' },
  { name: 'Westwood Markets',     domain: 'westwoodmkt.com' },
  { name: 'Yellowstone Tickets',  domain: 'ystone.events' },
];
const AW_MOCK_OPERATORS = [
  { name: 'Jamie Park',     local: 'jamie.p' },
  { name: 'Carla Reyes',    local: 'carla' },
  { name: 'Lia Wu',         local: 'lia' },
  { name: 'Diego Alvarez',  local: 'diego.a' },
  { name: 'Mei Tanaka',     local: 'mei.t' },
  { name: 'Owen Brooks',    local: 'owen.b' },
  { name: 'Priya Iyer',     local: 'priya.i' },
  { name: 'Reza Khan',      local: 'reza' },
  { name: 'Sofia Marino',   local: 's.marino' },
  { name: 'Tomás Vidal',    local: 't.vidal' },
  { name: 'Hana Sato',      local: 'hana.s' },
  { name: 'Noah Bennett',   local: 'noah.b' },
  { name: 'Yara El-Amin',   local: 'yara' },
  { name: 'Kenji Mori',     local: 'kenji.m' },
  { name: 'Ada Quinn',      local: 'ada.q' },
];
const AW_MOCK_REASONS_EMAIL = [
  'Operator consolidated their email aliases; the short form is now the canonical mailbox.',
  'Personal forwarding address request after switching providers.',
  'Marriage name change · update sign-in mailbox to match HR record.',
  'Old domain is being decommissioned at month-end.',
  'Typo in original onboarding · operator never received invite emails.',
  'Operator moved to a new internal team; team mailbox is now the canonical address.',
  'Restoring access after corporate domain migration on customer side.',
];
const AW_MOCK_REASONS_PROMOTE = [
  'Coverage for parental leave of current Admin (ticket #4521).',
  'Operator is taking over store-onboarding responsibility for the West region.',
  'Existing Admin departed company last week; coverage needed before EOM close.',
  'Promoted internally to Ops Lead — Admin role required for contract edits.',
  'Customer requested a dedicated reviewer per their compliance program.',
  'Holiday-season coverage; will be reviewed and possibly reverted in February.',
];
const AW_MOCK_REJECT_REASONS = [
  'New address is a personal domain. Per policy operators must use a company-controlled mailbox.',
  'Reason field does not match the change request — please re-submit with the correct justification.',
  'Operator is on a 90-day onboarding lock; Admin promotions require account age ≥ 90 days.',
  'Customer contract limits Admins to a maximum of three; please remove an existing Admin first.',
  'Conflicts with open ticket #2204 — wait for that ticket to resolve before re-submitting.',
];

// Deterministic PRNG so the seeded mock dataset is stable across reloads.
const awRand = (seed) => {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
};

const awSeedRequests = () => {
  const rng = awRand(20260530);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // Distribution per scope so "All" shows ~30 rows.
  //   pending: 12, approved: 10, rejected: 6, withdrawn: 2  → 30
  const dist = [
    ...Array(12).fill('pending'),
    ...Array(10).fill('approved'),
    ...Array(6).fill('rejected'),
    ...Array(2).fill('withdrawn'),
  ];

  // We need rows for BOTH tabs from the perspective of the default
  // persona (sam@carbon):
  //   "To review" → submittedBy !== 'sam@carbon'
  //   "Submitted" → submittedBy === 'sam@carbon'
  const make = (scope, idx) => {
    const status = dist[idx % dist.length];
    const submitter = scope === 'toReview'
      ? (idx % 2 === 0 ? 'priya@carbon' : 'wei@carbon')
      : 'sam@carbon';
    const reviewer = submitter === 'priya@carbon' ? 'sam@carbon'
                   : submitter === 'wei@carbon'   ? 'sam@carbon'
                   :                                (idx % 2 === 0 ? 'priya@carbon' : 'wei@carbon');

    const isEmail = idx % 2 === 0;
    const type = isEmail ? 'change-email' : 'promote-admin';
    const customer = pick(AW_MOCK_CUSTOMERS);
    const operator = pick(AW_MOCK_OPERATORS);
    const opEmail = `${operator.local}@${customer.domain}`;
    const newEmail = `${operator.local}.${(idx + 3) % 9}@${customer.domain}`;

    // Spread submittedAt over the last ~30 days so relative-time labels vary.
    const submittedMinAgo = 30 + idx * 47 + Math.floor(rng() * 120);
    const reviewedMinAgo = Math.max(5, submittedMinAgo - 30 - Math.floor(rng() * 90));

    const reason = isEmail ? pick(AW_MOCK_REASONS_EMAIL) : pick(AW_MOCK_REASONS_PROMOTE);

    const base = {
      id: `req-${scope === 'toReview' ? '2' : '3'}${String(idx + 1).padStart(3, '0')}`,
      type,
      customerId: '__demo__',
      customerName: customer.name,
      operatorId: `op-${scope}-${idx}`,
      operatorIdx: -1,
      operatorName: operator.name,
      operatorEmail: opEmail,
      payload: isEmail ? { newEmail } : undefined,
      reason,
      submittedBy: submitter,
      submittedAt: awAgo(submittedMinAgo),
      status,
      events: [{ at: awAgo(submittedMinAgo), kind: 'submit', by: submitter,
                 text: `Request submitted · ${isEmail ? 'Change email' : 'Promote to Admin'}` }],
    };

    if (status === 'approved') {
      base.reviewedAt = awAgo(reviewedMinAgo);
      base.reviewedBy = reviewer;
      base.appliedAt = base.reviewedAt;
      base.events.push({ at: base.reviewedAt, kind: 'approve', by: reviewer,
        text: isEmail
          ? `Approved · sign-in email changed to ${newEmail}`
          : `Approved · ${operator.name} promoted to Admin` });
    } else if (status === 'rejected') {
      base.reviewedAt = awAgo(reviewedMinAgo);
      base.reviewedBy = reviewer;
      base.rejectReason = pick(AW_MOCK_REJECT_REASONS);
      base.events.push({ at: base.reviewedAt, kind: 'reject', by: reviewer,
        text: 'Rejected · ' + base.rejectReason.slice(0, 80) });
    } else if (status === 'withdrawn') {
      base.events.push({ at: awAgo(reviewedMinAgo), kind: 'withdraw', by: submitter,
        text: 'Withdrawn by submitter' });
    }
    return base;
  };

  const toReview  = dist.map((_, i) => make('toReview',  i));
  const submitted = dist.map((_, i) => make('submitted', i));
  // Newest first.
  return [...toReview, ...submitted].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
};
const awSeedNotifications = () => ([
  {
    id: 'n-seed-1', channel: 'inapp', to: 'sam@carbon',
    at: awAgo(45), kind: 'new-request', requestId: 'req-1001',
    subject: 'New approval request · Change email',
    preview: 'Wei Liu requested a Change email for Jamie Park on Foundry Robotics.',
  },
  {
    id: 'n-seed-2', channel: 'inapp', to: 'sam@carbon',
    at: awAgo(60 * 4), kind: 'new-request', requestId: 'req-1002',
    subject: 'New approval request · Promote to Admin',
    preview: 'Priya Chen requested to promote Carla Reyes to Admin on Acme Health.',
  },
]);

const awLoad = () => {
  try {
    const raw = localStorage.getItem(AW_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { persona: 'sam@carbon', requests: awSeedRequests(), notifications: awSeedNotifications() };
};
const awPersist = (s) => { try { localStorage.setItem(AW_KEY, JSON.stringify(s)); } catch (e) {} };

let awState = awLoad();
const awSubs = new Set();
const awSet = (updater) => {
  awState = typeof updater === 'function' ? updater(awState) : { ...awState, ...updater };
  awPersist(awState);
  awSubs.forEach((fn) => fn(awState));
};
const awNotify = (items) => awSet((s) => ({
  ...s,
  notifications: [
    ...items.map((n) => ({ id: 'n-' + Math.random().toString(36).slice(2, 8), at: awIsoNow(), ...n })),
    ...s.notifications,
  ],
}));

window.AW = {
  get state() { return awState; },
  PERSONAS: AW_PERSONAS,
  TYPE_META: AW_TYPE_META,
  STATUS_META: AW_STATUS_META,
  subscribe(fn) { awSubs.add(fn); return () => awSubs.delete(fn); },
  setPersona(id) { awSet({ persona: id }); },
  reset() { awSet({ persona: awState.persona, requests: awSeedRequests(), notifications: awSeedNotifications() }); },
  pendingFor(customerId, operatorId, type) {
    return awState.requests.find((r) =>
      r.customerId === customerId && r.operatorId === operatorId &&
      r.type === type && r.status === 'pending');
  },
  submitChangeEmail({ customer, op, idx, newEmail, reason, me }) {
    const id = 'req-' + Math.random().toString(36).slice(2, 6);
    const ts = awIsoNow();
    awSet((s) => ({ ...s, requests: [{
      id, type: 'change-email',
      customerId: customer.id, customerName: customer.name,
      operatorId: op.id || `op-${idx}`, operatorIdx: idx,
      operatorName: op.name || op.email, operatorEmail: op.email,
      payload: { newEmail },
      reason, submittedBy: me, submittedAt: ts,
      status: 'pending',
      events: [{ at: ts, kind: 'submit', by: me, text: 'Request submitted · Change email' }],
    }, ...s.requests] }));
    awNotify([
      { channel: 'inapp', to: op.email, kind: 'status', requestId: id,
        subject: 'A change to your sign-in email was requested',
        preview: `${awPersonaName(me)} requested a change of your sign-in email from ${op.email} to ${newEmail}. The change applies only after another Carbon admin approves it.` },
      ...Object.keys(AW_PERSONAS).filter((p) => p !== me).map((p) => ({
        channel: 'inapp', to: p, kind: 'new-request', requestId: id,
        subject: 'New approval request · Change email',
        preview: `${awPersonaName(me)} requested a change of email for ${op.name || op.email} on ${customer.name}.`,
      })),
    ]);
    return id;
  },
  submitPromote({ customer, op, idx, reason, me }) {
    const id = 'req-' + Math.random().toString(36).slice(2, 6);
    const ts = awIsoNow();
    awSet((s) => ({ ...s, requests: [{
      id, type: 'promote-admin',
      customerId: customer.id, customerName: customer.name,
      operatorId: op.id || `op-${idx}`, operatorIdx: idx,
      operatorName: op.name || op.email, operatorEmail: op.email,
      reason, submittedBy: me, submittedAt: ts,
      status: 'pending',
      events: [{ at: ts, kind: 'submit', by: me, text: 'Request submitted · Promote to Admin' }],
    }, ...s.requests] }));
    awNotify(Object.keys(AW_PERSONAS).filter((p) => p !== me).map((p) => ({
      channel: 'inapp', to: p, kind: 'new-request', requestId: id,
      subject: 'New approval request · Promote to Admin',
      preview: `${awPersonaName(me)} requested to promote ${op.name || op.email} to Admin on ${customer.name}.`,
    })));
    return id;
  },
  approve(reqId, me) {
    const ts = awIsoNow();
    const req = awState.requests.find((r) => r.id === reqId);
    if (!req) return null;
    const text = req.type === 'change-email'
      ? `Approved · sign-in email changed to ${req.payload.newEmail}`
      : `Approved · ${req.operatorName} promoted to Admin`;
    awSet((s) => ({ ...s, requests: s.requests.map((r) => r.id === reqId
      ? { ...r, status: 'approved', reviewedAt: ts, reviewedBy: me, appliedAt: ts,
          events: [...r.events, { at: ts, kind: 'approve', by: me, text }] }
      : r) }));
    // Notifications
    awNotify([
      { channel: 'inapp', to: req.submittedBy, kind: 'status', requestId: req.id,
        subject: 'Your request was approved',
        preview: `${awPersonaName(me)} approved your ${AW_TYPE_META[req.type].label} request for ${req.operatorName}. The change is live.` },
      ...(req.type === 'change-email' ? [
        { channel: 'inapp', to: req.operatorEmail, kind: 'status', requestId: req.id,
          subject: 'Your sign-in email has been changed',
          preview: `Your sign-in email on ${req.customerName} has been changed to ${req.payload.newEmail}. If you did not authorize this, contact Carbon support.` },
      ] : []),
    ]);
    // Apply the side effect via app-level applier (registered by app.jsx).
    if (typeof window.__applyApprovalChange === 'function') {
      try { window.__applyApprovalChange({ ...req, status: 'approved', appliedAt: ts, reviewedBy: me }); }
      catch (e) { console.warn('aw applier failed', e); }
    }
    return req;
  },
  reject(reqId, me, reason) {
    const ts = awIsoNow();
    const req = awState.requests.find((r) => r.id === reqId);
    if (!req) return;
    awSet((s) => ({ ...s, requests: s.requests.map((r) => r.id === reqId
      ? { ...r, status: 'rejected', reviewedAt: ts, reviewedBy: me, rejectReason: reason,
          events: [...r.events, { at: ts, kind: 'reject', by: me, text: 'Rejected · ' + reason.slice(0, 80) }] }
      : r) }));
    awNotify([{
      channel: 'inapp', to: req.submittedBy, kind: 'status', requestId: req.id,
      subject: 'Your request was rejected',
      preview: `${awPersonaName(me)} rejected your ${AW_TYPE_META[req.type].label} request. Reason: ${reason}`,
    }]);
  },
  withdraw(reqId, me) {
    const ts = awIsoNow();
    awSet((s) => ({ ...s, requests: s.requests.map((r) => r.id === reqId
      ? { ...r, status: 'withdrawn', events: [...r.events, { at: ts, kind: 'withdraw', by: me, text: 'Withdrawn by submitter' }] }
      : r) }));
  },
};

// React hook that re-renders subscribers when the store updates.
const useApprovalStore = () => {
  const [, force] = aw_useState(0);
  aw_useEffect(() => window.AW.subscribe(() => force((x) => x + 1)), []);
  return window.AW.state;
};

// ─── Submit Change-Email modal ─────────────────────────────────
const SubmitEmailModal = ({ open, onClose, op, idx, customer, me, onSubmitted }) => {
  const [newEmail, setNewEmail] = aw_useState('');
  const [reason, setReason] = aw_useState('');
  aw_useEffect(() => { if (open) { setNewEmail(''); setReason(''); } }, [open, op?.id]);
  if (!open || !op) return null;

  const trimmed = newEmail.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const same = trimmed.toLowerCase() === (op.email || '').toLowerCase();
  const dup = trimmed && customer.operators.some((o, i) => i !== idx && (o.email || '').toLowerCase() === trimmed.toLowerCase());
  const reasonOk = reason.trim().length >= 10;
  const error = !trimmed ? null : !isEmail ? 'Enter a valid email address' : same ? 'New email must differ from current one' : dup ? 'Another operator on this customer already uses this email' : null;
  const canSubmit = isEmail && !same && !dup && reasonOk;

  return (
    <Modal open onClose={onClose} title="Submit · Change operator email" width={560}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" disabled={!canSubmit}
          onClick={() => {
            window.AW.submitChangeEmail({ customer, op, idx, newEmail: trimmed, reason: reason.trim(), me });
            onSubmitted && onSubmitted(trimmed);
          }}>Submit for review</Btn>
      </>}>
      <div className="stack">
        <div className="notice">
          <Icon name="info" size={14} />
          <div>This change requires <strong>approval from another Carbon admin</strong> before it takes effect. {awPersonaName(me)} cannot self-approve.</div>
        </div>
        <Field label="Operator">
          <Input value={`${op.name || op.email} · ${op.role || 'Operator'} on ${customer.name}`} disabled prefix={<Icon name="user" size={14} />} />
        </Field>
        <Field label="Current email">
          <Input value={op.email} disabled prefix={<Icon name="mail" size={14} />} />
        </Field>
        <Field label="New email" required error={error}>
          <Input type="email" autoFocus value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            prefix={<Icon name="mail" size={14} />}
            placeholder={`new.address@${(customer.domain || op.email?.split('@')[1] || 'company.com')}`}
            invalid={!!error} />
        </Field>
        <Field label="Reason for the change" required hint={`${reason.trim().length}/10 character minimum · visible to reviewer and audit log`}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this change is necessary." />
        </Field>
      </div>
    </Modal>);
};

// ─── Submit Promote modal ──────────────────────────────────────
const SubmitPromoteModal = ({ open, onClose, op, idx, customer, me, onSubmitted }) => {
  const [reason, setReason] = aw_useState('');
  aw_useEffect(() => { if (open) setReason(''); }, [open, op?.id]);
  if (!open || !op) return null;
  const reasonOk = reason.trim().length >= 10;
  return (
    <Modal open onClose={onClose} title="Submit · Promote operator to Admin" width={560}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" disabled={!reasonOk}
          onClick={() => {
            window.AW.submitPromote({ customer, op, idx, reason: reason.trim(), me });
            onSubmitted && onSubmitted();
          }}>Submit for review</Btn>
      </>}>
      <div className="stack">
        <div className="notice">
          <Icon name="info" size={14} />
          <div>This change requires <strong>approval from another Carbon admin</strong>. It takes effect immediately upon approval. The current Admin keeps their role.</div>
        </div>
        <Field label="Operator">
          <Input value={`${op.name || op.email} · ${op.email} · currently ${op.role || 'Operator'}`} disabled prefix={<Icon name="user" size={14} />} />
        </Field>
        <div className="diff">
          <div className="diff__col diff__col--old"><h5>Current role</h5><div className="diff__val">{op.role || 'Operator'}</div></div>
          <div className="diff__arrow"><Icon name="arrowR" size={18} /></div>
          <div className="diff__col diff__col--new"><h5>After approval</h5><div className="diff__val">Admin</div></div>
        </div>
        <Field label="Reason for promotion" required hint={`${reason.trim().length}/10 character minimum · visible to reviewer and audit log`}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this operator needs Admin privileges." />
        </Field>
      </div>
    </Modal>);
};

// ─── Reject modal ──────────────────────────────────────────────
const AwRejectModal = ({ req, onClose, onSubmit }) => {
  const [reason, setReason] = aw_useState('');
  aw_useEffect(() => { setReason(''); }, [req?.id]);
  if (!req) return null;
  const ok = reason.trim().length >= 10;
  return (
    <Modal open onClose={onClose} title={`Reject · ${AW_TYPE_META[req.type].label}`} width={500}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" icon="x" disabled={!ok} onClick={() => onSubmit(req, reason.trim())}>Reject request</Btn>
      </>}>
      <div className="stack">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          Rejecting will close this request. The submitter will be notified with the reason below; they will need to submit a new request to retry.
        </p>
        <Field label="Reason (visible to submitter, recorded in audit log)" required hint={`${reason.trim().length}/10 character minimum`}>
          <Textarea rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., New address is on a personal domain; please re-submit with a company-controlled mailbox." />
        </Field>
      </div>
    </Modal>);
};

// ─── Pending-request chip with popover ─────────────────────────
const PendingChip = ({ req, me, label, onWithdraw }) => {
  const [open, setOpen] = aw_useState(false);
  const [pos, setPos] = aw_useState(null);
  const btnRef = aw_useRef(null);
  const popRef = aw_useRef(null);
  const isMine = req.submittedBy === me;

  aw_useEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    const POP_W = 280;
    const POP_H_EST = popRef.current?.getBoundingClientRect().height || 240;
    const GAP = 6;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < POP_H_EST + GAP + 8 && spaceAbove > spaceBelow;
    const top = flipUp ? Math.max(8, r.top - POP_H_EST - GAP)
                       : Math.min(window.innerHeight - POP_H_EST - 8, r.bottom + GAP);
    setPos({ top, left: Math.max(8, Math.min(window.innerWidth - POP_W - 8, r.left)) });
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <React.Fragment>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button ref={btnRef} className="pendchip pendchip--warn" onClick={() => setOpen((o) => !o)}
          title={isMine ? 'View details · you can cancel this request' : 'View request details'}>
          <Icon name="clock" size={11} />{label}
        </button>
        {isMine && (
          <button className="pendchip pendchip--cancel"
            onClick={(e) => { e.stopPropagation(); onWithdraw(req); }}
            title="Cancel this request" aria-label="Cancel this request">
            <Icon name="x" size={11} />Cancel
          </button>)}
      </span>
      {open && pos && ReactDOM.createPortal(
        <div ref={popRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: 280, zIndex: 200,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-default)',
          borderRadius: 8, boxShadow: '0 8px 24px oklch(0% 0 0 / 0.15)', padding: 14,
        }}>
          <div style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
            {AW_TYPE_META[req.type].label} · {req.id}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
            {req.type === 'change-email'
              ? <React.Fragment>Change email to <code style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>{req.payload.newEmail}</code></React.Fragment>
              : <React.Fragment>Promote to Admin</React.Fragment>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            <div>Submitted by <strong style={{ color: 'var(--color-text-primary)' }}>{awPersonaName(req.submittedBy)}</strong></div>
            <div title={awFmtFull(req.submittedAt)}>· {awFmtRel(req.submittedAt)}</div>
            <div>Status · <span style={{ color: 'var(--color-warning-700)', fontWeight: 600 }}>Pending review by another Carbon admin</span></div>
          </div>
          {req.reason && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55, padding: '8px 10px', background: 'var(--color-bg-3)', borderRadius: 6, marginBottom: 10 }}>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Reason: </span>{req.reason}
            </div>)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            {isMine
              ? <Btn variant="danger" size="sm" icon="x" onClick={() => { setOpen(false); onWithdraw(req); }}>Withdraw request</Btn>
              : <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Only the submitter can withdraw</span>}
          </div>
        </div>,
        document.body)}
    </React.Fragment>);
};

// ─── Approval card (one row on the Approvals page) ─────────────
const ApprovalCard = ({ req, me, onApprove, onReject, onWithdraw }) => {
  const sm = AW_STATUS_META[req.status];
  const tm = AW_TYPE_META[req.type];
  const canReview = req.status === 'pending' && req.submittedBy !== me;
  const isMine = req.submittedBy === me;
  const reviewer = req.reviewedBy ? awPersonaName(req.reviewedBy) : null;

  return (
    <div className="acard" data-req-id={req.id}>
      <div className={`acard__icon ${tm.cardCls}`}>
        <Icon name={tm.icon} size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="acard__head">
          <span>{tm.label} · {req.id}</span>
          <Badge tone={sm.tone}>{sm.label}</Badge>
          {isMine && <Badge tone="neutral">Submitted by you</Badge>}
        </div>
        <div className="acard__title">
          {req.type === 'change-email'
            ? <React.Fragment>Change email for <span>{req.operatorName}</span> on <span>{req.customerName}</span></React.Fragment>
            : <React.Fragment>Promote <span>{req.operatorName}</span> to Admin on <span>{req.customerName}</span></React.Fragment>}
        </div>
        {req.type === 'change-email' && (
          <div className="acard__diff">
            <span className="old">{req.operatorEmail}</span>
            <Icon name="arrowR" size={12} />
            <span>{req.payload.newEmail}</span>
          </div>)}
        <div className="acard__meta">
          <span title={awFmtFull(req.submittedAt)}>By {awPersonaName(req.submittedBy)} · {awFmtRel(req.submittedAt)}</span>
          {reviewer && <span>Reviewed by {reviewer}</span>}
        </div>
        {req.rejectReason && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-error-700)', background: 'var(--color-error-50)', border: '1px solid oklch(58% 0.20 25 / 0.2)', borderRadius: 6, padding: '6px 10px', lineHeight: 1.5 }}>
            <strong>Reason:</strong> {req.rejectReason}
          </div>)}
        {req.reason && req.status !== 'rejected' && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>Reason: </span>{req.reason}
          </div>)}
      </div>
      <div className="acard__actions" style={{ alignSelf: 'flex-start' }}>
        {canReview && (
          <React.Fragment>
            <Btn variant="primary" size="sm" icon="check" onClick={onApprove}>Approve</Btn>
            <Btn variant="secondary" size="sm" icon="x" onClick={onReject}>Reject</Btn>
          </React.Fragment>)}
        {req.status === 'pending' && isMine && (
          <Btn variant="danger" size="sm" icon="x" onClick={onWithdraw}>Withdraw</Btn>)}
        {req.status === 'pending' && !canReview && !isMine && (
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', maxWidth: 130, textAlign: 'right' }}>Awaiting another Carbon admin</span>)}
      </div>
    </div>);
};

// ─── Approvals page (full route) ───────────────────────────────
const AW_STATUS_FILTERS = [
  { value: 'pending',   label: 'Pending review' },
  { value: 'approved',  label: 'Approved' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'all',       label: 'All statuses' },
];
const AW_TYPE_FILTERS = [
  { value: 'all',            label: 'All types' },
  { value: 'change-email',   label: 'Change Email' },
  { value: 'promote-admin',  label: 'Promote to Admin' },
];
const AW_PAGE_SIZE = 20;
const AW_PAGE_STEP = 20;

// Filter select — aligned to the canonical control spec (36px / radius-md /
// 14px / custom chevron), matching the search Input and other list pages.
const awSelectStyle = {
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  boxSizing: 'border-box', height: 36, lineHeight: '34px',
  padding: '0 30px 0 12px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg-2) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23889\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 10px center / 12px',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
};

// Active-filter chip — Devices › Devices style.
const AwFilterChip = ({ label, onRemove }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '2px 8px', borderRadius: 999,
    background: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    border: '1px solid color-mix(in oklab, var(--color-primary-500) 25%, transparent)',
    fontSize: 12, fontWeight: 500, lineHeight: 1.5,
    whiteSpace: 'nowrap',
  }}>
    {label}
    {onRemove && (
      <span onClick={onRemove} title="Remove this filter"
        style={{ cursor: 'pointer', display: 'inline-grid', placeItems: 'center' }}>
        <Icon name="x" size={9} />
      </span>)}
  </span>);

const awTypeLabel   = (v) => AW_TYPE_FILTERS.find((f) => f.value === v)?.label   || v;
const awStatusLabel = (v) => AW_STATUS_FILTERS.find((f) => f.value === v)?.label || v;

const ApprovalsPage = () => {
  const store = useApprovalStore();
  const me = store.persona;
  const toast = useToast();
  const [scope, setScope] = aw_useState('toReview'); // 'toReview' | 'submitted'

  // Draft (input) vs Applied (committed) filter state — the list only
  // refreshes when the operator hits the Search button.
  const [qDraft,      setQDraft]      = aw_useState('');
  const [typeDraft,   setTypeDraft]   = aw_useState('all');
  const [statusDraft, setStatusDraft] = aw_useState('pending');
  const [applied, setApplied] = aw_useState({ q: '', type: 'all', status: 'pending' });

  const [visibleCount, setVisibleCount] = aw_useState(AW_PAGE_SIZE);
  const [loadingMore,  setLoadingMore]  = aw_useState(false);

  const [rejectTarget,   setRejectTarget]   = aw_useState(null);
  const [withdrawTarget, setWithdrawTarget] = aw_useState(null);

  // Switching tabs resets the filter state back to the default
  // (Pending review) and clears the search input.
  aw_useEffect(() => {
    setQDraft(''); setTypeDraft('all'); setStatusDraft('pending');
    setApplied({ q: '', type: 'all', status: 'pending' });
    setVisibleCount(AW_PAGE_SIZE);
  }, [scope]);

  const scoped = aw_useMemo(() => store.requests.filter((r) =>
    scope === 'toReview' ? r.submittedBy !== me : r.submittedBy === me
  ), [store.requests, me, scope]);

  const filtered = aw_useMemo(() => scoped.filter((r) => {
    if (applied.status !== 'all' && r.status !== applied.status) return false;
    if (applied.type   !== 'all' && r.type   !== applied.type)   return false;
    if (applied.q) {
      // Search is scoped to customer name only.
      if (!(r.customerName || '').toLowerCase().includes(applied.q.toLowerCase())) return false;
    }
    return true;
  }), [scoped, applied]);

  const list = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleSearch = () => {
    setApplied({ q: qDraft.trim(), type: typeDraft, status: statusDraft });
    setVisibleCount(AW_PAGE_SIZE);
  };
  const handleSearchKey = (e) => { if (e.key === 'Enter') handleSearch(); };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((n) => n + AW_PAGE_STEP);
      setLoadingMore(false);
    }, 600);
  };

  const empty = (() => {
    if (filtered.length === 0 && scoped.length === 0) {
      return scope === 'toReview'
        ? { title: 'All caught up', sub: 'No requests are waiting for your review.' }
        : { title: 'You haven\u2019t submitted any requests', sub: 'Operator changes you submit will appear here.' };
    }
    return { title: 'No matching requests', sub: 'Try adjusting the filters above and search again.' };
  })();

  const handleApprove = (r) => {
    window.AW.approve(r.id, me);
    toast({ kind: 'success', title: 'Approved · change applied' });
  };
  const handleReject = (r, reason) => {
    window.AW.reject(r.id, me, reason);
    toast({ kind: 'warning', title: 'Request rejected' });
    setRejectTarget(null);
  };
  const handleWithdraw = (r) => {
    window.AW.withdraw(r.id, me);
    toast({ kind: 'info', title: 'Request withdrawn' });
    setWithdrawTarget(null);
  };

  return (
    <div className="page">
      <div className="det-band" style={{ marginBottom: 12 }}>
        <div className="det-band__inner" style={{ paddingBottom: 14 }}>
          <h1 className="det-header__title">Approvals</h1>
          <p className="page__sub" style={{ margin: '4px 0 0' }}>
            Sensitive operator changes (email, role) go through a second-admin review before they apply.
          </p>
        </div>
        {/* Tabs docked on the band's bottom edge — consistent with detail pages. */}
        <div className="det-tabs">
          <button className={`tds-tab ${scope === 'toReview' ? 'tds-tab--active' : ''}`}
            onClick={() => setScope('toReview')}>
            To review
          </button>
          <button className={`tds-tab ${scope === 'submitted' ? 'tds-tab--active' : ''}`}
            onClick={() => setScope('submitted')}>
            Submitted
          </button>
        </div>
      </div>

      {/* Sticky condition area — only the toolbar + active chips pin to
          the top of the scroll viewport. The Tab row scrolls away normally. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--color-bg-1)',
        marginBottom: 12,
      }}>
        {/* Filter toolbar — devices-list style. Filters only apply on Search. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 0',
                      flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
            <Input value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search by customer name"
              prefix={<Icon name="search" size={12} />} />
          </div>
          <select value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)}
            style={awSelectStyle}>
            {AW_TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}
            style={awSelectStyle}>
            {AW_STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <Btn variant="secondary" size="md" icon="search" onClick={handleSearch}>Search</Btn>
        </div>

        {/* Active filter chips — Devices › Devices style. Only appears
            after Search promotes a non-default filter from draft → applied. */}
        {(applied.q || applied.type !== 'all' || applied.status !== 'all') && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
            padding: '0 0 12px',
          }}>
            <span style={{
              fontSize: 10, color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>
              Active filters
            </span>
            {applied.q && (
              <AwFilterChip label={`Customer: ${applied.q}`}
                onRemove={() => {
                  setQDraft(''); setApplied((a) => ({ ...a, q: '' })); setVisibleCount(AW_PAGE_SIZE);
                }} />)}
            {applied.type !== 'all' && (
              <AwFilterChip label={`Type: ${awTypeLabel(applied.type)}`}
                onRemove={() => {
                  setTypeDraft('all'); setApplied((a) => ({ ...a, type: 'all' })); setVisibleCount(AW_PAGE_SIZE);
                }} />)}
            {applied.status !== 'all' && (
              <AwFilterChip label={`Status: ${awStatusLabel(applied.status)}`}
                onRemove={() => {
                  setStatusDraft('all'); setApplied((a) => ({ ...a, status: 'all' })); setVisibleCount(AW_PAGE_SIZE);
                }} />)}
            <button type="button" className="sb__clear-all"
              onClick={() => {
                setQDraft(''); setTypeDraft('all'); setStatusDraft('all');
                setApplied({ q: '', type: 'all', status: 'all' });
                setVisibleCount(AW_PAGE_SIZE);
              }}>
              <Icon name="x" size={11} />
              Clear all
            </button>
          </div>)}
      </div>{/* /sticky condition area */}

      <div className="info-card">

        {/* List */}
        <div className="alist">
          {list.length === 0
            ? <div className="empty">
                <Icon name="audit" size={28} />
                <div className="empty__title">{empty.title}</div>
                <div className="empty__sub">{empty.sub}</div>
              </div>
            : list.map((r) => (
                <ApprovalCard key={r.id} req={r} me={me}
                  onApprove={() => handleApprove(r)}
                  onReject={() => setRejectTarget(r)}
                  onWithdraw={() => setWithdrawTarget(r)} />))}
        </div>

        {/* Load more — mirrors Sales › Products (shop-browse) pattern */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 18px' }}>
            <Btn variant="secondary" size="md" disabled={loadingMore} onClick={loadMore}>
              {loadingMore
                ? <React.Fragment><span className="aw-loadmore__spinner" /> Loading…</React.Fragment>
                : 'Load more'}
            </Btn>
          </div>)}
      </div>

      {rejectTarget && <AwRejectModal req={rejectTarget} onClose={() => setRejectTarget(null)} onSubmit={handleReject} />}
      <Modal open={!!withdrawTarget} onClose={() => setWithdrawTarget(null)} title="Withdraw request?" width={420}
        footer={<>
          <Btn variant="ghost" onClick={() => setWithdrawTarget(null)}>Keep request</Btn>
          <Btn variant="danger" icon="x" onClick={() => handleWithdraw(withdrawTarget)}>Withdraw</Btn>
        </>}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          This will close the request without applying any changes. You can re-submit later if needed.
        </p>
      </Modal>
    </div>);
};

// ─── Persona switcher (used in topbar + Approvals page header) ─────
const PersonaSwitcher = ({ compact }) => {
  const store = useApprovalStore();
  const me = store.persona;
  const [open, setOpen] = aw_useState(false);
  const [pos, setPos] = aw_useState(null);
  const btnRef = aw_useRef(null);
  const popRef = aw_useRef(null);

  aw_useEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const meta = AW_PERSONAS[me];
  return (
    <React.Fragment>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)}
        className="aw-persona-btn"
        title="Switch acting persona (demo only)">
        <span className="aw-persona-avatar">{meta.initials}</span>
        {!compact && <React.Fragment>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Acting as</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{meta.name}</span>
          </span>
          <Icon name="chevD" size={13} />
        </React.Fragment>}
      </button>
      {open && pos && ReactDOM.createPortal(
        <div ref={popRef} className="opmenu" role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: 240, zIndex: 600 }}>
          <div style={{ padding: '8px 10px 4px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
            Demo · switch admin persona
          </div>
          {Object.values(AW_PERSONAS).map((p) => (
            <button key={p.id} className="opmenu__item"
              onClick={() => { window.AW.setPersona(p.id); setOpen(false); }}
              style={p.id === me ? { background: 'var(--color-bg-hover)' } : undefined}>
              <span className="aw-persona-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{p.initials}</span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>{p.id}</span>
              </span>
              {p.id === me && <Icon name="check" size={14} style={{ marginLeft: 'auto', color: 'var(--color-success-700)' }} />}
            </button>))}
          <div className="opmenu__sep" />
          <button className="opmenu__item" onClick={() => { window.AW.reset(); setOpen(false); }}>
            <Icon name="refresh" size={14} />Reset approval demo data
          </button>
        </div>,
        document.body)}
    </React.Fragment>);
};

// Expose for other Babel scripts (each <script type="text/babel"> gets its own scope).
Object.assign(window, {
  AW_PERSONAS, AW_TYPE_META, AW_STATUS_META,
  awPersonaName, awFmtRel, awFmtFull,
  useApprovalStore,
  SubmitEmailModal, SubmitPromoteModal, AwRejectModal,
  PendingChip, ApprovalCard, ApprovalsPage, PersonaSwitcher,
});
