/* global React, Icon, Btn, Input, Field, Textarea, Select, useToast, UIcon */
/* User-related sub-pages: Profile, Account & Security, Workspaces, Activity, Help, Feedback */
const { useState: upUseState } = React;

// ─── Common page chrome ─────────────────────────────────────────
const UPHeader = ({ icon, title, sub, actions }) =>
<div className="page__head">
    <div>
      <h1 className="page__title">{title}</h1>
      {sub && <p className="page__sub">{sub}</p>}
    </div>
    {actions && <div className="page__actions">{actions}</div>}
  </div>;


const UPCard = ({ title, sub, action, children, danger }) =>
<section className={`up-card ${danger ? 'up-card--danger' : ''}`}>
    {(title || action) &&
  <header className="up-card__head">
        <div>
          <h3 className="up-card__title">{title}</h3>
          {sub && <p className="up-card__sub">{sub}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
  }
    <div className="up-card__body">{children}</div>
  </section>;


// ─── Profile ────────────────────────────────────────────────────
const upInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

const ProfilePage = ({ user, onSave, onSignOut }) => {
  const toast = useToast();
  // The form is always editable — no view/edit toggle. `draft` tracks edits;
  // a save bar appears only when something actually changed.
  const [draft, setDraft] = upUseState(user);
  const [flow, setFlow] = upUseState(null); // 'email' | 'username' | null
  const [avatarOpen, setAvatarOpen] = upUseState(false);

  React.useEffect(() => { setDraft(user); }, [user]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const EDITABLE = ['name', 'country'];
  const dirty = EDITABLE.some((k) => (draft[k] || '') !== (user[k] || ''));

  const discard = () => setDraft(user);
  const save = () => {
    if (!draft.name?.trim()) { toast({ kind: 'error', title: 'Display name is required' }); return; }
    const { initials, ...rest } = draft; // initials are always derived, never stored
    onSave?.({ ...rest, name: draft.name.trim() });
    toast({ kind: 'success', title: 'Profile updated' });
  };

  const applyIdentity = (patch) => onSave?.({ ...user, ...patch });

  const applyAvatar = ({ avatar, avatarColor }) => {
    const { initials, ...rest } = user; // initials are derived, never stored
    onSave?.({ ...rest, avatar, avatarColor });
    setDraft((d) => ({ ...d, avatar, avatarColor }));
    toast({ kind: 'success', title: avatar ? 'Profile photo updated' : 'Profile photo removed' });
  };

  return (
    <div className="page up-page">
      <UPHeader icon="user" title="My profile" sub="Manage your personal details and sign-in." />

      <div className="up-grid up-grid--single">
        <UPCard>
          {/* Identity header — avatar + name + login handle */}
          <div className="up-id">
            <button type="button" className="up-id__avatar-btn" onClick={() => setAvatarOpen(true)}
              aria-label="Change profile photo" title="Change profile photo">
              {draft.avatar
                ? <img className="up-id__avatar up-id__avatar--img" src={draft.avatar} alt="" />
                : <span className="up-id__avatar" style={draft.avatarColor ? { background: draft.avatarColor, color: '#fff' } : undefined}>{upInitials(draft.name)}</span>}
              <span className="up-id__avatar-edit"><UIcon name="image" size={13} /></span>
            </button>
            <div className="up-id__main">
              <div className="up-id__name">{draft.name || '—'}</div>
              <div className="up-id__handle">@{user.username}</div>
            </div>
          </div>

          {/* Editable personal details */}
          <div className="up-sec">
            <div className="up-sec__title">Personal details</div>
            <div className="up-fgrid">
              <div className="up-frow up-frow--stack">
                <div className="up-frow__label">Display name</div>
                <div className="up-frow__ctrl">
                  <Input value={draft.name || ''} placeholder="e.g. Jordan Diaz"
                    onChange={(e) => set('name', e.target.value)} invalid={!draft.name?.trim()} />
                </div>
              </div>
              <div className="up-frow up-frow--stack">
                <div className="up-frow__label">Country</div>
                <div className="up-frow__ctrl">
                  <Select value={draft.country || ''} onChange={(e) => set('country', e.target.value)}>
                    {(window.COUNTRIES || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Login identity — changed only through a verified flow */}
          <div className="up-sec">
            <div className="up-sec__title">Sign-in &amp; security</div>
            <div className="up-fgrid">
              <div className="up-frow">
                <div className="up-frow__label">Username
                  <span className="up-frow__val" style={{ fontFamily: 'var(--font-family-mono)' }}>{user.username}</span>
                </div>
                <div className="up-frow__ctrl up-frow__ctrl--action">
                  <Btn variant="secondary" size="sm" onClick={() => setFlow('username')}>Change</Btn>
                </div>
              </div>
              <div className="up-frow">
                <div className="up-frow__label">Email
                  <span className="up-frow__val">{user.email}</span>
                </div>
                <div className="up-frow__ctrl up-frow__ctrl--action">
                  <Btn variant="secondary" size="sm" onClick={() => setFlow('email')}>Change</Btn>
                </div>
              </div>
            </div>
          </div>

          <div className={`up-foot ${dirty ? 'is-dirty' : ''}`}>
            <Btn variant="ghost" onClick={discard} disabled={!dirty}>Discard</Btn>
            <Btn variant="primary" icon="check" onClick={save} disabled={!dirty}>Save changes</Btn>
          </div>
        </UPCard>
      </div>

      {flow && (
        <IdentityChangeFlow
          mode={flow}
          user={user}
          onClose={() => setFlow(null)}
          onApply={applyIdentity}
          onSignOut={onSignOut} />
      )}

      {avatarOpen && (
        <AvatarChangeFlow
          user={draft}
          onClose={() => setAvatarOpen(false)}
          onApply={(patch) => { applyAvatar(patch); setAvatarOpen(false); }} />
      )}
    </div>);

};

// ─── Profile photo flow ─────────────────────────────────────────
const AVATAR_COLORS = [
  { label: 'Default', value: null, css: 'var(--avatar-bg)' },
  { label: 'Indigo', value: 'var(--color-primary-600)', css: 'var(--color-primary-600)' },
  { label: 'Amber', value: 'var(--color-accent-600)', css: 'var(--color-accent-600)' },
  { label: 'Blue', value: 'var(--color-info-700)', css: 'var(--color-info-700)' },
  { label: 'Green', value: 'var(--color-success-700)', css: 'var(--color-success-700)' },
  { label: 'Orange', value: 'var(--color-warning-700)', css: 'var(--color-warning-700)' },
];

const AvatarChangeFlow = ({ user, onClose, onApply }) => {
  const Modal = window.TdsModal || window.Modal;
  const fileRef = React.useRef(null);
  const [avatar, setAvatar] = upUseState(user.avatar || null);
  const [avatarColor, setAvatarColor] = upUseState(user.avatarColor || null);
  const [busy, setBusy] = upUseState(false);
  const [drag, setDrag] = upUseState(false);
  const [err, setErr] = upUseState('');

  const onFiles = (files) => {
    const file = files && files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErr('Choose an image file — PNG, JPG, or WebP.'); return; }
    if (file.size > 8 * 1024 * 1024) { setErr('That image is over 8 MB. Pick a smaller one.'); return; }
    setErr(''); setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 240; // center-crop to a square, downscale, export as JPEG
        const canvas = document.createElement('canvas');
        canvas.width = S; canvas.height = S;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
        setBusy(false);
      };
      img.onerror = () => { setErr('Could not read that image. Try another file.'); setBusy(false); };
      img.src = reader.result;
    };
    reader.onerror = () => { setErr('Could not read that file.'); setBusy(false); };
    reader.readAsDataURL(file);
  };

  return (
    <Modal open onClose={onClose} title="Profile photo" width={460}
      footer={<div className="flow-foot">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" disabled={busy}
          onClick={() => onApply({ avatar, avatarColor: avatar ? null : avatarColor })}>Save</Btn>
      </div>}>
      <div className="av-edit">
        <div className="av-edit__preview">
          {avatar
            ? <img className="av-edit__img" src={avatar} alt="" />
            : <div className="av-edit__fallback" style={{ background: avatarColor || 'var(--avatar-bg)', color: avatarColor ? '#fff' : 'var(--avatar-fg)' }}>{upInitials(user.name)}</div>}
        </div>
        <div className="av-edit__main">
          <div className={`av-drop ${drag ? 'is-drag' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }} onChange={(e) => onFiles(e.target.files)} />
            <div className="av-drop__icon"><UIcon name="upload" size={18} /></div>
            <div className="av-drop__title">{busy ? 'Processing…' : 'Upload a photo'}</div>
            <div className="av-drop__sub">Drag &amp; drop or click · PNG / JPG / WebP · square works best</div>
          </div>
          {err && <div className="flow-step__err">{err}</div>}
          {avatar &&
            <button type="button" className="av-remove" onClick={() => { setAvatar(null); setErr(''); }}>
              <UIcon name="trash" size={13} /> Remove photo
            </button>}
        </div>
      </div>

      {!avatar &&
        <div className="av-colors">
          <div className="av-colors__label">Or use initials on a color</div>
          <div className="av-colors__row">
            {AVATAR_COLORS.map((c) =>
              <button key={c.label} type="button"
                className={`av-swatch ${avatarColor === c.value ? 'is-on' : ''}`}
                style={{ background: c.css }} aria-label={c.label} title={c.label}
                onClick={() => setAvatarColor(c.value)}>
                {avatarColor === c.value && <UIcon name="check" size={14} />}
              </button>)}
          </div>
        </div>}
    </Modal>);

};

// ─── Identity change flow (email / username) ─────────────────────
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

const IdentityChangeFlow = ({ mode, user, onClose, onApply, onSignOut }) => {
  const Modal = window.TdsModal || window.Modal;
  const isEmail = mode === 'email';
  const [step, setStep] = upUseState('verify-old');
  const [code, setCode] = upUseState('');     // the live (demo-visible) code
  const [sentTo, setSentTo] = upUseState(''); // where it was sent
  const [entry, setEntry] = upUseState('');   // typed code
  const [newVal, setNewVal] = upUseState(''); // new email / username
  const [err, setErr] = upUseState('');

  const sendTo = (addr) => { setCode(genCode()); setSentTo(addr); setEntry(''); setErr(''); };
  React.useEffect(() => { sendTo(user.email); }, []);

  const checkCode = (onOk) => {
    if (entry.trim() !== code) { setErr('Incorrect code. Check the latest code and try again.'); return; }
    setErr(''); onOk();
  };

  const submitNew = () => {
    if (isEmail) {
      if (!EMAIL_RX.test(newVal.trim())) { setErr('Enter a valid email address.'); return; }
      if (newVal.trim().toLowerCase() === (user.email || '').toLowerCase()) { setErr('That is already your email.'); return; }
      setErr(''); sendTo(newVal.trim()); setStep('verify-new');
    } else {
      const v = newVal.trim();
      if (!/^[a-z0-9._-]{3,32}$/i.test(v)) { setErr('3–32 chars: letters, numbers, dot, dash, underscore.'); return; }
      if (v.toLowerCase() === (user.username || '').toLowerCase()) { setErr('That is already your username.'); return; }
      setErr(''); onApply({ username: v }); setStep('done');
    }
  };

  const titles = {
    'verify-old': isEmail ? 'Change email · verify it\'s you' : 'Change username · verify it\'s you',
    'new': isEmail ? 'Enter new email' : 'Choose new username',
    'verify-new': 'Verify new email',
    'done': isEmail ? 'Email updated' : 'Username updated',
  };

  const otpField = (label) =>
    <div className="flow-step">
      <p className="flow-step__desc">{label}</p>
      <input className="otp-input" inputMode="numeric" maxLength={6} value={entry}
        placeholder="000000" autoFocus
        onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      <div className="otp-meta">
        <button type="button" className="otp-resend" onClick={() => sendTo(sentTo)}>Resend code</button>
        <span className="otp-hint">Demo code: <strong>{code}</strong></span>
      </div>
      {err && <div className="flow-step__err">{err}</div>}
    </div>;

  let body, footer;
  if (step === 'verify-old') {
    body = otpField(<>To protect your account, enter the 6-digit code we sent to your current email <strong>{user.email}</strong>.</>);
    footer = <>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" onClick={() => checkCode(() => setStep('new'))}>Verify</Btn>
    </>;
  } else if (step === 'new') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">{isEmail ? 'Enter the new email address you want to use to sign in.' : 'Pick a new username. This is your login handle.'}</p>
        <Field label={isEmail ? 'New email' : 'New username'}>
          <Input value={newVal} autoFocus
            placeholder={isEmail ? 'name@company.com' : 'jordan.diaz'}
            prefix={isEmail ? null : '@'}
            onChange={(e) => { setNewVal(e.target.value); setErr(''); }} />
        </Field>
        {err && <div className="flow-step__err">{err}</div>}
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => { setErr(''); setStep('verify-old'); }}>Back</Btn>
      <Btn variant="primary" onClick={submitNew}>{isEmail ? 'Continue' : 'Change username'}</Btn>
    </>;
  } else if (step === 'verify-new') {
    body = otpField(<>Enter the 6-digit code we sent to your new email <strong>{newVal}</strong>.</>);
    footer = <>
      <Btn variant="ghost" onClick={() => { setErr(''); setStep('new'); }}>Back</Btn>
      <Btn variant="primary" onClick={() => checkCode(() => { onApply({ email: newVal.trim() }); setStep('done'); })}>Verify & change</Btn>
    </>;
  } else { // done
    body =
      <div className="flow-step flow-step--done">
        <div className="flow-done__icon"><UIcon name="check" size={22} /></div>
        {isEmail ?
          <p className="flow-step__desc">Your email is now <strong>{newVal}</strong>. For security you'll be signed out — sign back in with your new email.</p> :
          <p className="flow-step__desc">Your username is now <strong>@{newVal}</strong>.</p>}
      </div>;
    footer = isEmail ?
      <Btn variant="primary" onClick={() => { onClose(); onSignOut?.(); }}>Sign out</Btn> :
      <Btn variant="primary" onClick={onClose}>Done</Btn>;
  }

  return (
    <Modal open onClose={onClose} title={titles[step]} width={460}
      footer={<div className="flow-foot">{footer}</div>}>
      {body}
    </Modal>);

};

// ─── Account & Security ─────────────────────────────────────────
const AccountSecurityPage = () => {
  const toast = useToast();
  const [twoFA, setTwoFA] = upUseState(true);
  const [magicLink, setMagicLink] = upUseState(false);
  return (
    <div className="page up-page">
      <UPHeader icon="shield" title="Account & security" sub="Sign-in credentials, multi-factor, sessions and connected services" />

      <div className="stack stack--lg">
        <UPCard title="Sign-in" sub="Password rotates every 90 days per company policy">
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Password</div>
              <div className="up-row__sub">Last changed 41 days ago · expires in 49 days</div>
            </div>
            <Btn variant="secondary" onClick={() => toast({ kind: 'info', title: 'Password reset email sent' })}>Change password</Btn>
          </div>
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Email login link</div>
              <div className="up-row__sub">Sign in with a one-time link instead of a password</div>
            </div>
            <UPToggle on={magicLink} onChange={setMagicLink} />
          </div>
        </UPCard>

        <UPCard title="Multi-factor authentication" sub="At least one factor is required for admin accounts">
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Authenticator app <span className="up-badge up-badge--ok">Active</span></div>
              <div className="up-row__sub">1Password · added Feb 14, 2025 · used 3 hours ago</div>
            </div>
            <Btn variant="ghost" size="sm">Reconfigure</Btn>
          </div>
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Security key</div>
              <div className="up-row__sub">Hardware FIDO2 key (YubiKey, Solo, Titan)</div>
            </div>
            <Btn variant="ghost" size="sm" icon="plus">Add key</Btn>
          </div>
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">SMS backup</div>
              <div className="up-row__sub">+1 (415) ••• ‑‑0142</div>
            </div>
            <UPToggle on={twoFA} onChange={setTwoFA} />
          </div>
        </UPCard>

        <UPCard title="Active sessions" sub="Devices currently signed into this workspace" action={<Btn variant="ghost" size="sm" onClick={() => toast({ kind: 'success', title: 'Signed out other sessions' })}>Sign out all others</Btn>}>
          {[
          { dev: 'MacBook Pro · macOS 14', loc: 'San Francisco, CA', ip: '73.241.0.18', when: 'This device', current: true },
          { dev: 'iPhone 15 · Safari', loc: 'San Francisco, CA', ip: '73.241.0.18', when: '2 hours ago' },
          { dev: 'Chrome · Windows 11', loc: 'Austin, TX', ip: '32.18.5.224', when: '3 days ago' }].
          map((s, i) =>
          <div key={i} className="up-row">
              <div className="up-row__main">
                <div className="up-row__title">{s.dev} {s.current && <span className="up-badge up-badge--ok">Current</span>}</div>
                <div className="up-row__sub">{s.loc} · {s.ip} · {s.when}</div>
              </div>
              {!s.current && <Btn variant="ghost" size="sm" onClick={() => toast({ kind: 'success', title: 'Session signed out' })}>Sign out</Btn>}
            </div>
          )}
        </UPCard>

        <UPCard title="Connected services" sub="Single sign‑on and external identity providers">
          {[
          { name: 'Okta SSO', sub: 'carbon.okta.com · enforced', on: true },
          { name: 'Google Workspace', sub: 'admin@carbon · scopes: profile, email', on: true },
          { name: 'Microsoft Entra', sub: 'Not connected', on: false }].
          map((p, i) =>
          <div key={i} className="up-row">
              <div className="up-row__main">
                <div className="up-row__title">{p.name} {p.on && <span className="up-badge up-badge--ok">Linked</span>}</div>
                <div className="up-row__sub">{p.sub}</div>
              </div>
              <Btn variant="ghost" size="sm">{p.on ? 'Manage' : 'Connect'}</Btn>
            </div>
          )}
        </UPCard>

        <UPCard title="Danger zone" danger>
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Revoke all API tokens</div>
              <div className="up-row__sub">Invalidate 4 personal access tokens. Integrations will need to reauthenticate.</div>
            </div>
            <Btn variant="danger" size="sm" onClick={() => toast({ kind: 'error', title: 'All tokens revoked' })}>Revoke tokens</Btn>
          </div>
        </UPCard>
      </div>
    </div>);

};

const UPToggle = ({ on, onChange }) =>
<button type="button" className={`up-toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
    <span className="up-toggle__dot" />
  </button>;


// ─── Switch workspace ───────────────────────────────────────────
const WorkspacesPage = () => {
  const toast = useToast();
  const [current, setCurrent] = upUseState('prod');
  const items = [
  { id: 'prod', name: 'Carbon TOMS · Production', sub: '4 contracts · 482 operators', tier: 'Enterprise', initials: 'C', tint: 'oklch(40% 0.14 262)' },
  { id: 'sbx', name: 'Carbon TOMS · Sandbox', sub: 'Test environment · isolated data', tier: 'Internal', initials: 'C', tint: 'oklch(56% 0.12 152)' },
  { id: 'acme', name: 'Acme Payments Demo', sub: 'Guest access · expires Jun 12, 2025', tier: 'Guest', initials: 'A', tint: 'oklch(56% 0.16 50)' }];

  return (
    <div className="page up-page">
      <UPHeader icon="building" title="Switch workspace" sub="You belong to 3 workspaces. Switching reloads the admin console." actions={
      <Btn variant="secondary" icon="plus" onClick={() => toast({ kind: 'info', title: 'Workspace creation is gated to org admins' })}>Create workspace</Btn>
      } />

      <div className="up-ws-grid">
        {items.map((w) =>
        <button key={w.id} type="button" className={`up-ws ${current === w.id ? 'is-on' : ''}`} onClick={() => {
          if (current === w.id) return;
          setCurrent(w.id);
          toast({ kind: 'success', title: `Switched to ${w.name}` });
        }}>
            <div className="up-ws__logo" style={{ background: w.tint }}>{w.initials}</div>
            <div className="up-ws__main">
              <div className="up-ws__name">{w.name}</div>
              <div className="up-ws__sub">{w.sub}</div>
              <div className="up-ws__chips">
                <span className="um-chip">{w.tier}</span>
                {current === w.id && <span className="um-chip um-chip--admin"><UIcon name="check" size={11} />Current</span>}
              </div>
            </div>
            <div className="up-ws__trail">{current === w.id ? <UIcon name="check" size={18} /> : <UIcon name="chevR" size={16} />}</div>
          </button>
        )}
      </div>
    </div>);

};

// ─── My activity ────────────────────────────────────────────────
const ActivityPage = () => {
  const groups = [
  { day: 'Today', items: [
    { t: '14:22', icon: 'shield', title: 'Signed in from MacBook Pro · San Francisco, CA', sub: 'IP 73.241.0.18 · trusted device', tone: 'info' },
    { t: '13:08', icon: 'edit', title: 'Updated role "ISO Operator (Tier 2)"', sub: 'Granted contract.view to 4 contracts · Customers affected: 28', tone: 'success' },
    { t: '11:51', icon: 'file', title: 'Signed contract — ISV Master Services Agreement', sub: 'Customer: Greenline Tech · 2 signers remaining', tone: 'success' },
    { t: '09:42', icon: 'user', title: 'Created customer "Bayfront Studios"', sub: 'Assigned ISV contract · KYC: pending review', tone: 'info' }] },

  { day: 'Yesterday', items: [
    { t: '17:14', icon: 'shield', title: 'Approved KYC for Northpoint Industries', sub: 'Risk score 32/100 · documents 4/4', tone: 'success' },
    { t: '14:02', icon: 'trash', title: 'Revoked operator access — j.chen@partner.io', sub: 'Reason: terminated employment · effective immediately', tone: 'warning' },
    { t: '10:38', icon: 'package', title: 'Issued 12 POS terminals', sub: 'Order #ORD-2451 · shipped to Acme Foods', tone: 'info' }] },

  { day: 'Apr 28', items: [
    { t: '15:30', icon: 'edit', title: 'Updated organization branding', sub: 'New logo and primary color', tone: 'info' },
    { t: '11:12', icon: 'logout', title: 'Signed out all sessions', sub: 'Triggered manually from security settings', tone: 'warning' }] }];


  return (
    <div className="page up-page">
      <UPHeader icon="activity" title="My activity" sub="Everything you've done across this workspace in the past 30 days" actions={
      <Btn variant="ghost" icon="download">Export CSV</Btn>
      } />

      <UPCard>
        <div className="up-activity">
          {groups.map((g, gi) =>
          <div key={gi} className="up-actgroup">
              <div className="up-actgroup__day">{g.day}</div>
              <div className="up-actgroup__list">
                {g.items.map((it, i) =>
              <div key={i} className="up-actrow">
                    <div className={`up-actrow__dot up-actrow__dot--${it.tone}`}><UIcon name={it.icon} size={13} /></div>
                    <div className="up-actrow__time">{it.t}</div>
                    <div className="up-actrow__main">
                      <div className="up-actrow__title">{it.title}</div>
                      <div className="up-actrow__sub">{it.sub}</div>
                    </div>
                  </div>
              )}
              </div>
            </div>
          )}
        </div>
      </UPCard>
    </div>);

};

// ─── Help center ────────────────────────────────────────────────
const HelpPage = ({ onOpenShortcuts }) => {
  const toast = useToast();
  const [q, setQ] = upUseState('');
  const cats = [
  { icon: 'home', name: 'Getting started', n: 12 },
  { icon: 'users', name: 'Customers & KYC', n: 18 },
  { icon: 'file', name: 'Contracts', n: 24 },
  { icon: 'package', name: 'Orders', n: 9 },
  { icon: 'shield', name: 'Roles & permissions', n: 15 },
  { icon: 'settings', name: 'Workspace settings', n: 7 }];

  const faqs = [
  { q: 'How do I move a customer between ISV and ISO contracts?', a: 'Open the customer detail, switch to the Contracts tab, then use "Reassign contract" from the row menu.' },
  { q: 'Why is a permission greyed out in the role editor?', a: 'The role is inheriting a deny from a parent contract. Override it from the contract scope panel above.' },
  { q: 'Where do I find audit logs for a single operator?', a: 'Audit log → filter by Actor, then enter the operator email. Export to CSV is available.' },
  { q: 'Can I sign in with my hardware key only?', a: 'Yes — add a FIDO2 key under Account & security, then disable other factors. Admin policy may require a backup factor.' }];


  const filtered = q.trim() ? faqs.filter((f) => (f.q + f.a).toLowerCase().includes(q.toLowerCase())) : faqs;

  return (
    <div className="page up-page">
      <UPHeader icon="help" title="Help center" sub="Guides, references and direct support for the Carbon TOMS admin" />

      <div className="up-help-search">
        <UIcon name="help" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles, e.g. KYC, role inheritance, webhook…" />
        <button className="up-help-search__kbd" onClick={onOpenShortcuts}>⌘K</button>
      </div>

      <div className="up-help-grid">
        {cats.map((c, i) =>
        <button key={i} type="button" className="up-helpcat" onClick={() => toast({ kind: 'info', title: `Opening ${c.name}` })}>
            <div className="up-helpcat__icon"><UIcon name={c.icon} size={18} /></div>
            <div className="up-helpcat__name">{c.name}</div>
            <div className="up-helpcat__n">{c.n} articles</div>
          </button>
        )}
      </div>

      <UPCard title={q.trim() ? `Results · ${filtered.length}` : 'Popular questions'}>
        {filtered.length === 0 &&
        <div className="empty">No articles match "{q}". Try a different keyword or contact support below.</div>
        }
        {filtered.map((f, i) =>
        <details key={i} className="up-faq">
            <summary>
              <UIcon name="chevR" size={12} />
              {f.q}
            </summary>
            <div className="up-faq__a">{f.a}</div>
          </details>
        )}
      </UPCard>

      <UPCard title="Still stuck?" sub="Reach the platform team directly. Average response is under 4 hours during business days.">
        <div className="up-help-cta">
          <Btn variant="primary" icon="message" onClick={() => toast({ kind: 'success', title: 'Support chat opened' })}>Start a chat</Btn>
          <Btn variant="secondary" icon="mail">Email support@carbon</Btn>
          <Btn variant="ghost" icon="info" onClick={onOpenShortcuts}>Keyboard shortcuts</Btn>
        </div>
      </UPCard>
    </div>);

};

// ─── Feedback ───────────────────────────────────────────────────
const FeedbackPage = () => {
  const toast = useToast();
  const [kind, setKind] = upUseState('idea');
  const [title, setTitle] = upUseState('');
  const [body, setBody] = upUseState('');
  const [sev, setSev] = upUseState('normal');
  const [share, setShare] = upUseState(true);

  const submit = () => {
    if (!title.trim()) {
      toast({ kind: 'warning', title: 'Add a short headline first' });
      return;
    }
    toast({ kind: 'success', title: 'Feedback submitted', msg: 'The platform team will reply via email when triaged.' });
    setTitle('');setBody('');
  };

  return (
    <div className="page up-page">
      <UPHeader icon="message" title="Send feedback" sub="Tell us what's working, what's broken, or what's missing. Goes straight to the platform team." />

      <div className="up-fb-grid">
        <UPCard>
          <div className="up-fb-kind">
            {[
            { id: 'idea', label: 'Idea', icon: 'plus', sub: 'A new feature or improvement' },
            { id: 'bug', label: 'Bug', icon: 'info', sub: "Something isn't working" },
            { id: 'praise', label: 'Praise', icon: 'check', sub: 'Something delightful' }].
            map((opt) =>
            <button key={opt.id} type="button" className={`up-fb-kind__btn ${kind === opt.id ? 'is-on' : ''}`} onClick={() => setKind(opt.id)}>
                <UIcon name={opt.icon} size={16} />
                <div>
                  <div className="up-fb-kind__lbl">{opt.label}</div>
                  <div className="up-fb-kind__sub">{opt.sub}</div>
                </div>
              </button>
            )}
          </div>

          <Field label="Headline" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary, like: Filter chips overflow on long contract names" />
          </Field>

          <Field label="Details" hint="Steps to reproduce, screenshots, or what you'd like instead">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="As specific as you can — what page were you on, what did you click, what happened, what did you expect…" />
          </Field>

          {kind === 'bug' &&
          <Field label="How blocking is this?">
              <div className="seg">
                {['low', 'normal', 'high', 'critical'].map((s) =>
              <button key={s} type="button" className={`seg__btn ${sev === s ? 'is-on' : ''}`} onClick={() => setSev(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              )}
              </div>
            </Field>
          }

          <label className="up-fb-share">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            <span>
              <strong>Share diagnostic snapshot</strong>
              <small>Console logs, the page you're on (currently <code>/settings/roles</code>), browser + viewport. No customer data is included.</small>
            </span>
          </label>

          <div className="up-fb-actions">
            <Btn variant="ghost" onClick={() => {setTitle('');setBody('');}}>Clear</Btn>
            <Btn variant="primary" icon="message" onClick={submit}>Send feedback</Btn>
          </div>
        </UPCard>

        <div className="stack">
          <UPCard title="Recent reports" sub="Things teammates have submitted lately">
            {[
            { kind: 'Bug', t: 'Date filter on Orders ignores timezone', when: '2 days ago', status: 'Triaged' },
            { kind: 'Idea', t: 'Bulk-assign roles across contracts', when: '1 week ago', status: 'Planned' },
            { kind: 'Praise', t: 'The signer preview is great 👏', when: '2 weeks ago', status: 'Read' }].
            map((r, i) =>
            <div key={i} className="up-row">
                <div className="up-row__main">
                  <div className="up-row__title">{r.t}</div>
                  <div className="up-row__sub">{r.kind} · {r.when}</div>
                </div>
                <span className="um-chip">{r.status}</span>
              </div>
            )}
          </UPCard>
          <UPCard title="Privacy">
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
              Feedback is reviewed by the Carbon platform team only. We never share what you send with customers
              or third parties. Diagnostic snapshots are deleted after 30 days.
            </p>
          </UPCard>
        </div>
      </div>
    </div>);

};

Object.assign(window, { ProfilePage, AccountSecurityPage, WorkspacesPage, ActivityPage, HelpPage, FeedbackPage });
