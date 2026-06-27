/* global React, Btn, Input, Field, Textarea, Select, Icon, Badge, ContractBadge, CONTRACT_INFO, COUNTRIES, COUNTRY_BY_CODE, useToast, iconForKind */
const { useState } = React;

const CONTRACT_OPTIONS = [
  { kind: 'ISO',       title: 'ISO — Independent Sales Organization', desc: 'Authorizes the customer to onboard sub-merchants and earn residuals on processing volume.',                       iconClass: 'iso' },
  { kind: 'ISO-PILOT', title: 'ISO-Pilot — ISO Trial',                desc: '180-day ISO trial. All service fees locked at $0. Independent contract — extend or let it expire.',               iconClass: 'iso' },
  { kind: 'ISV',       title: 'ISV — Independent Software Vendor',    desc: 'Grants the customer the ability to integrate Carbon APIs into their own software and resell payment services.', iconClass: 'isv' },
  { kind: 'ISV-PILOT', title: 'ISV-Pilot — ISV Trial',                desc: '180-day ISV trial. All service fees locked at $0. Independent contract — extend or let it expire.',               iconClass: 'isv' },
];


const Stepper = ({ step }) => (
  <window.StepperCard
    steps={[
      { label: 'Company' },
      { label: 'Contracts' },
      { label: 'Confirmation' },
    ]}
    current={step}/>
);

// ─── Step 1 — Company info ────────────────────────────────
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^[\d\s\-().]{4,}$/;

const Step1 = ({ data, onChange }) => {
  const [touched, setTouched] = useState({});
  // Only Company Name + Country are mandatory. Everything else is optional —
  // but Email / Phone must still be format-valid IF the admin chose to fill
  // them in. Phone-country-code is only required when a phone number is
  // present (so "+1" without a number is rejected too).
  const errs = {
    name: !data.name?.trim() ? 'Company name is required' : null,
    country: !data.country ? 'Country is required' : null,
    timezone: !data.timezone ? 'Timezone is required' : null,
    address: null,
    phoneCountryCode: data.phone?.trim() && !data.phoneCountryCode?.trim() ? 'Required with phone' : null,
    phone: data.phone?.trim() && !PHONE_RE.test(data.phone) ? 'Invalid phone number' : null,
    email: data.email?.trim() && !EMAIL_RE.test(data.email) ? 'Invalid email address' : null,
  };
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }));
  const handleCountryChange = (code) => {
    // Auto-fill phone country code when none has been set (or when it matches the prior country's dial).
    const prev = COUNTRY_BY_CODE?.[data.country];
    const next = COUNTRY_BY_CODE?.[code];
    const shouldSyncDial = !data.phoneCountryCode || (prev && data.phoneCountryCode === prev.dial);
    onChange({ country: code, ...(shouldSyncDial && next ? { phoneCountryCode: next.dial } : {}) });
  };
  const tzList = window.TIMEZONES || [];
  return (
    <div className="tds-card">
      <div className="tds-card__header"><div className="tds-card__title">Company information</div></div>
      <div className="tds-card__body">
        <div className="form-grid" style={{ gap: 18 }}>
          <Field label="Company name" required error={touched.name && errs.name}>
            <Input value={data.name} onChange={(e) => onChange({ name: e.target.value })} onBlur={() => blur('name')} placeholder="e.g. Northwind Commerce" invalid={!!(touched.name && errs.name)} />
          </Field>
          <Field label="License">
            <Input value={data.license} onChange={(e) => onChange({ license: e.target.value })} placeholder="e.g. NW-2024-08831-CA" />
          </Field>
          <div className="form-grid form-grid--2" style={{ gap: 18 }}>
            <Field label="Country" required error={touched.country && errs.country}>
              <Select value={data.country || ''} onChange={(e) => handleCountryChange(e.target.value)} onBlur={() => blur('country')}>
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Timezone" required error={touched.timezone && errs.timezone}>
              <Select value={data.timezone || ''} onChange={(e) => onChange({ timezone: e.target.value })} onBlur={() => blur('timezone')}>
                <option value="">Select timezone…</option>
                {tzList.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Registered address" error={touched.address && errs.address}>
            <Textarea value={data.address} onChange={(e) => onChange({ address: e.target.value })} onBlur={() => blur('address')} placeholder="Street, city, region, postal code" rows={2} invalid={!!(touched.address && errs.address)} />
          </Field>
          <div className="form-grid form-grid--2" style={{ gap: 18 }}>
            <Field label="Contact name">
              <Input value={data.contactName || ''} onChange={(e) => onChange({ contactName: e.target.value })} placeholder="e.g. Sarah Chen" />
            </Field>
            <Field label="Email" error={touched.email && errs.email}>
              <Input type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} onBlur={() => blur('email')} placeholder="contact@company.com" prefix={<Icon name="mail" size={14} />} invalid={!!(touched.email && errs.email)} />
            </Field>
          </div>
          <Field label="Phone" error={(touched.phoneCountryCode && errs.phoneCountryCode) || (touched.phone && errs.phone)}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
              <Select value={data.phoneCountryCode || ''} onChange={(e) => onChange({ phoneCountryCode: e.target.value })} onBlur={() => blur('phoneCountryCode')}>
                <option value="">Code…</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.dial} · {c.code}</option>)}
              </Select>
              <Input value={data.phone} onChange={(e) => onChange({ phone: e.target.value })} onBlur={() => blur('phone')} placeholder="e.g. 415 226 4800" invalid={!!(touched.phone && errs.phone)} />
            </div>
          </Field>
          <Field label="Remark" hint="Internal note — not visible to the customer.">
            <Textarea value={data.remark || ''} onChange={(e) => onChange({ remark: e.target.value })} placeholder="Internal note" rows={2} />
          </Field>
        </div>
      </div>
    </div>);

};

// ─── Step 2 — Contracts (uses shared ContractAssignBoard) ───
// Picker rail + clause form layout (B2 pattern). Defined in
// contract-assign.jsx so customer-detail.jsx's Add-contract modal can
// use the same component and the UX stays in sync.

// Edit one already-added contract's clauses + term (wizard-local modal).
const WizardEditContract = ({ kind, ents: ents0, terms: terms0, onClose, onSave }) => {
  const Modal = window.Modal;
  const [ents, setEnts] = useState(ents0 || {});
  const [terms, setTerms] = useState(terms0 || {});
  const errors = (window.collectAssignErrors([kind], { [kind]: ents }) || {})[kind] || {};
  const ok = Object.keys(errors).length === 0;
  return (
    <Modal open onClose={onClose} title={`Edit ${kind} contract`} width={560}
      footer={<div className="flow-foot">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" disabled={!ok} onClick={() => ok && onSave(ents, terms)}>Save</Btn>
      </div>}>
      <window.ContractClauseForm kind={kind} ents={ents} setEnts={setEnts} terms={terms} setTerms={setTerms} errors={errors}/>
    </Modal>);
};

// Step 2 — contracts are added ONE AT A TIME (no unified panel). The list
// shows what's been assigned; "Add contract" opens the single-add modal.
// At least one contract is required to continue (gated in canNext).
const Step2 = ({ contracts, entitlements, terms, data, errorsByKind, onAdd, onEdit, onRemove }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editKind, setEditKind] = useState(null);
  const pseudoExisting = contracts.map((k) => ({ kind: k, status: 'ACTIVE' }));
  // One contract per family in the wizard: offer only families not yet added.
  const wizOptions = (window.contractAddOptions ? window.contractAddOptions(pseudoExisting, data.timezone) : [])
    .filter((o) => !contracts.some((k) => window.contractFamily(k) === o.family));

  return (
    <div className="tds-card">
      <div className="tds-card__header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="tds-card__title">Assign contracts</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Add contracts one at a time. At least one is required. Each takes effect when the customer is created.
          </div>
        </div>
        <Btn variant="primary" size="sm" icon="plus" disabled={wizOptions.length === 0} onClick={() => setAddOpen(true)}>Add contract</Btn>
      </div>
      <div className="tds-card__body" style={{ padding: 16 }} data-comment-anchor="cbaab1ba9d-div-73-5">
        {contracts.length === 0 ? (
          <div className="empty" style={{ padding: '28px 16px', fontSize: 13 }}>
            No contracts yet. Click <strong>Add contract</strong> to assign the customer's first contract.
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {contracts.map((k) => {
              const errs = errorsByKind?.[k];
              const hasErr = errs && Object.keys(errs).length > 0;
              const t = terms[k] || {};
              const isPilot = window.contractIsPilot(k);
              return (
                <div key={k} className="crow crow--clickable" role="button" tabIndex={0}
                  onClick={() => setEditKind(k)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditKind(k); } }}>
                  <div className={`pick-card__icon pick-card__icon--${window.baseKind(k).toLowerCase()}`} style={{ width: 40, height: 40, borderRadius: 10 }}>
                    <Icon name={iconForKind(k)} size={18}/>
                  </div>
                  <div className="crow__main">
                    <div className="crow__title">
                      {k}
                      {isPilot && <span className="tds-badge tds-badge--pilot"><Icon name="sparkles" size={11}/>Pilot · $0</span>}
                      {hasErr && <span className="tds-badge tds-badge--error"><Icon name="alert" size={10}/>{Object.keys(errs).length} to fix</span>}
                    </div>
                    <div className="crow__sub">
                      {isPilot ? '180-day trial · all fees locked at $0' : `Effective ${t.effectiveFrom || 'today'}${t.effectiveTo ? ` → ${t.effectiveTo}` : ' · no end date'}`}
                    </div>
                  </div>
                  <div className="crow__actions">
                    <button type="button" className="iconbtn" title="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); setEditKind(k); }}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" className="iconbtn iconbtn--danger" title="Remove" aria-label="Remove" onClick={(e) => { e.stopPropagation(); onRemove(k); }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {wizOptions.length === 0 && contracts.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            All contract families assigned. Edit or remove above to change.
          </div>
        )}
      </div>

      {addOpen && window.AddContractModal && (
        <window.AddContractModal
          options={wizOptions}
          customer={{ contracts: pseudoExisting, country: data.country, timezone: data.timezone }}
          onClose={() => setAddOpen(false)}
          onConvert={() => {}}
          onAddOne={(kind, ents, t) => { onAdd(kind, ents, t); setAddOpen(false); }}
        />
      )}
      {editKind && (
        <WizardEditContract
          kind={editKind}
          ents={entitlements[editKind] || {}}
          terms={terms[editKind] || {}}
          onClose={() => setEditKind(null)}
          onSave={(ents, t) => { onEdit(editKind, ents, t); setEditKind(null); }}
        />
      )}
    </div>
  );
};


// ─── Step 3 — Done ────────────────────────────────────────
const StepDone = ({ customer, onGoToDetail }) =>
<div className="tds-card" style={{ textAlign: 'center' }}>
    <div className="tds-card__body" style={{ padding: '40px 32px' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-info-50, var(--color-bg-3))', color: 'var(--color-info-700, var(--color-text-primary))', display: 'inline-grid', placeItems: 'center', margin: '0 auto 18px', border: '1px solid var(--color-border-subtle)' }}>
        <Icon name="check" size={36} />
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-subtle)', fontSize: 11.5, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        <Badge tone="info" dot>Onboarding</Badge>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Customer created — awaiting first Admin</h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', maxWidth: 500, marginInline: 'auto', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{customer.name}</strong> is registered with{' '}
        {customer.contracts.length} active contract{customer.contracts.length === 1 ? '' : 's'}.
        Next step: invite an Admin so the customer can sign in and start operating.
        The account will move to <strong style={{ color: 'var(--color-text-primary)' }}>Active</strong> automatically once the Admin is invited.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Btn variant="primary" iconRight="chevR" onClick={onGoToDetail}>Invite Admin</Btn>
      </div>
    </div>
  </div>;


// ─── Wizard shell ────────────────────────────────────────
const CustomerWizard = ({ onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name: '', country: 'US', address: '', phoneCountryCode: '+1', phone: '', email: '', license: '', contactName: '', timezone: '', remark: '' });
  const [contracts, setContracts] = useState([]);
  // entitlements: { [kind]: { [clauseKey]: value } } — per-kind clause
  // forms. Populated by Step2's right pane; consumed by finalize() so the
  // created contracts already carry their clauses on creation.
  const [entitlements, setEntitlements] = useState({});
  // Per-kind term state: { [kind]: { effectiveFrom, effectiveTo } }
  // Captured in Step 2's date inputs and consumed by finalize().
  const [terms, setTerms] = useState({});
  // focusedKind drives Step2's right pane — which contract type's clauses
  // are currently being edited. Defaults to the first picked, or ISV if
  // nothing's picked yet (so the right pane isn't empty on first paint).
  const [focusedKind, setFocusedKind] = useState(null);
  const [created, setCreated] = useState(null);
  const toast = useToast();

  const canNext = (() => {
    if (step === 1) {
      // Company Name + Country + Timezone are mandatory. Email / Phone must
      // still pass format validation when present (empty is fine).
      if (!data.name.trim() || !data.country || !data.timezone) return false;
      if (data.phone?.trim()) {
        if (!PHONE_RE.test(data.phone)) return false;
        if (!data.phoneCountryCode?.trim()) return false;
      }
      if (data.email?.trim() && !EMAIL_RE.test(data.email)) return false;
      return true;
    }
    if (step === 2) {
      if (contracts.length === 0) return false;
      const errs = window.collectAssignErrors(contracts, entitlements);
      return Object.keys(errs).length === 0;
    }
    return true;
  })();

  // Live error map for Step 2. Only used to render error chips in the rail
  // / red borders on inputs — the canNext gate above is what really blocks
  // Continue.
  const step2Errors = step === 2 ? window.collectAssignErrors(contracts, entitlements) : {};

  const addContract = (kind, ents, t) => {
    setContracts((c) => c.includes(kind) ? c : [...c, kind]);
    setEntitlements((e) => ({ ...e, [kind]: ents }));
    setTerms((tt) => ({ ...tt, [kind]: t }));
    setFocusedKind(kind);
  };
  const editContract = (kind, ents, t) => {
    setEntitlements((e) => ({ ...e, [kind]: ents }));
    setTerms((tt) => ({ ...tt, [kind]: t }));
  };
  const removeContract = (kind) => {
    setContracts((c) => c.filter((x) => x !== kind));
    setEntitlements((e) => { const x = { ...e }; delete x[kind]; return x; });
    setTerms((tt) => { const x = { ...tt }; delete x[kind]; return x; });
  };

  const finalize = () => {
    const id = 'c-' + Date.now().toString().slice(-4);
    const nowIso = new Date().toISOString();
    const cust = {
      id,
      name: data.name.trim(),
      country: data.country,
      address: data.address.trim(),
      phoneCountryCode: data.phoneCountryCode.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      license: data.license.trim(),
      contactName: (data.contactName || '').trim(),
      timezone: data.timezone || '',
      remark: (data.remark || '').trim(),
      status: 'Onboarding',
      registeredAt: nowIso,
      contracts: contracts.map((kind) => {
        const t = terms[kind] || {};
        // Audit event with operator + timestamp baked into description
        // (matches the new {statusFrom, statusTo, description} schema and
        // mirrors what customer-detail.jsx's handleAddContracts produces).
        const when = new Date(nowIso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
        // Pilot-ness is a property of the contract TYPE ('*-PILOT') —
        // each type is independent (no pilot↔active linkage). A pilot is a
        // 180-day trial with all fees locked at $0.
        const isPilot = window.contractIsPilot(kind);
        const effFrom = t.effectiveFrom || window.todayDate(data.timezone);
        // PILOT auto-fills +180 days from effectiveFrom. Admin can extend
        // (+30/60/90) before expiry from the contract row menu.
        const pilotEnd = window.addDaysDate(effFrom, 180);
        // PILOT contracts must have all fees = 0 per spec. Zero out
        // every price/feature in the user-supplied entitlements (admin
        // shouldn't have entered fees in PILOT mode but we defend
        // anyway). models / currency carry over unchanged.
        const ents = (() => {
          if (!isPilot) return entitlements[kind] || {};
          const src = entitlements[kind] || {};
          const out = { ...src };
          Object.keys(out).forEach((k) => {
            const v = out[k];
            if (v && typeof v === 'object' && 'price' in v && !('enable' in v)) {
              // price clause
              out[k] = { ...v, price: 0 };
            } else if (v && typeof v === 'object' && 'enable' in v) {
              // feature clause — preserve enable flag, zero the price
              const inner = v.priceStrategy ? { priceStrategy: { ...v.priceStrategy, price: 0 } } : { price: 0 };
              out[k] = { ...v, ...inner };
            }
          });
          return out;
        })();
        return {
          kind,
          // Pilot is a TYPE, not a status — every contract is persisted
          // ACTIVE; pilot behavior is derived from the '-PILOT' kind.
          status: 'ACTIVE',
          signedAt: nowIso,
          signedBy: 'admin@carbon',
          authorizingEntityName: 'NPT',
          authorizingEntityId: 'e-npt',
          effectiveFrom: effFrom,
          // PILOT auto-locks the end date; ACTIVE uses whatever admin set
          // (which can be null / "no end date").
          effectiveTo: isPilot ? pilotEnd : (t.effectiveTo || null),
          entitlements: ents,
          events: [
            isPilot
              ? {
                  statusFrom: null,
                  statusTo: 'ACTIVE',
                  description: `${kind} pilot started on ${when} by admin@carbon · 180-day trial · all fees locked at $0`,
                  eventType: 'BIND_PILOT',
                  at: nowIso,
                  by: 'admin@carbon',
                  eventInfo: { initialEffectiveTo: pilotEnd },
                }
              : {
                  statusFrom: null,
                  statusTo: 'ACTIVE',
                  description: `${kind} contract bound on ${when} by admin@carbon`,
                },
          ],
        };
      }),
      operators: [],
      events: [
      { at: nowIso, kind: 'created', by: 'admin@carbon', text: 'Company registered · awaiting first Admin' },
      ...contracts.map((kind) => {
        const isPilot = window.contractIsPilot(kind);
        return {
          at: nowIso,
          kind: 'contract+',
          by: 'admin@carbon',
          text: isPilot
            ? `${kind} pilot started · 180-day trial · all fees locked at $0`
            : `${kind} contract configured · active`,
        };
      })]

    };
    setCreated(cust);
    setStep(3);
  };

  return (
    <div className="page">
      <window.TitleBar
        back
        onBack={onCancel}
        backLabel="Back to Customers"
        title="New customer"
        subtitle="Register a company and configure its contracts. Operators can be added later from the customer detail." />

      <Stepper step={step} />

      <div className={`wizard-grid ${step === 2 ? 'wizard-grid--wide' : ''}`}>
        <div>
          {step === 1 && <Step1 data={data} onChange={(p) => setData((d) => ({ ...d, ...p }))} />}
          {step === 2 && <Step2
            contracts={contracts}
            entitlements={entitlements}
            terms={terms}
            data={data}
            errorsByKind={step2Errors}
            onAdd={addContract}
            onEdit={editContract}
            onRemove={removeContract}
          />}
          {step === 3 && created && <StepDone customer={created} onGoToDetail={() => onComplete(created)} />}

          {step < 3 &&
            <window.WizardFooter
              step={step} totalSteps={2}
              onBack={() => setStep((s) => s - 1)}
              onNext={() => setStep((s) => s + 1)} nextDisabled={!canNext}
              onFinal={finalize} finalDisabled={!canNext}
              finalLabel="Create customer" />
          }
        </div>

        {/* Step 2 uses the full width for the picker rail + clause form,
            so the company-summary aside is suppressed there. The contract
            picks are still visible in Step 2's own "Will be created as"
            footer. */}
        {step !== 2 && (
        <aside className="wizard-aside">
          <h4>Summary</h4>
          <dl>
            <dt>Name</dt>      <dd>{data.name || <span className="muted">—</span>}</dd>
            <dt>Country</dt>   <dd>{data.country ? (COUNTRY_BY_CODE?.[data.country]?.name || data.country) : <span className="muted">—</span>}</dd>
            <dt>Address</dt>   <dd style={{ fontSize: 12.5 }}>{data.address || <span className="muted">—</span>}</dd>
            <dt>Phone</dt>     <dd>{data.phone ? <><span className="muted" style={{ marginRight: 4 }}>{data.phoneCountryCode}</span>{data.phone}</> : <span className="muted">—</span>}</dd>
            <dt>Email</dt>     <dd style={{ fontSize: 12.5 }}>{data.email || <span className="muted">—</span>}</dd>
            <dt>License</dt>   <dd>{data.license || <span className="muted">—</span>}</dd>
            <dt>Contracts</dt> <dd>
              {contracts.length === 0 ? <span className="muted">None selected</span> :
              <div className="badge-row">{contracts.map((k) => <ContractBadge key={k} kind={k} status="Active" />)}</div>
              }
            </dd>
          </dl>
        </aside>
        )}
      </div>
    </div>);

};

window.CustomerWizard = CustomerWizard;