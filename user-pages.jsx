/* global React, Icon, Btn, Input, Field, Textarea, Select, useToast, UIcon */
/* User-related sub-pages: Profile, Account & Security, Workspaces, Activity, Help, Feedback */
const { useState: upUseState } = React;

// ─── Common page chrome ─────────────────────────────────────────
const UPHeader = ({ icon, title, sub, actions }) =>
<div className="up-header">
    <div className="up-header__icon"><UIcon name={icon} size={20} /></div>
    <div className="up-header__main">
      <h1 className="up-header__title">{title}</h1>
      {sub && <p className="up-header__sub">{sub}</p>}
    </div>
    {actions && <div className="up-header__actions">{actions}</div>}
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

  // Re-sync the draft whenever the saved user changes (e.g. after an identity flow).
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

  // Photo / color is saved on its own — it must persist immediately without
  // touching the in-progress name/country edits tracked by `draft`.
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
                : <span className="up-id__avatar" style={draft.avatarColor ? { background: draft.avatarColor } : undefined}>{upInitials(draft.name)}</span>}
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
            <div className="up-frow">
              <div className="up-frow__label">Display name</div>
              <div className="up-frow__ctrl">
                <Input value={draft.name || ''} placeholder="e.g. Jordan Diaz"
                  onChange={(e) => set('name', e.target.value)} invalid={!draft.name?.trim()} />
              </div>
            </div>
            <div className="up-frow">
              <div className="up-frow__label">Country</div>
              <div className="up-frow__ctrl">
                <Select value={draft.country || ''} onChange={(e) => set('country', e.target.value)}>
                  {(window.COUNTRIES || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </Select>
              </div>
            </div>
          </div>

          {/* Login identity — changed only through a verified flow */}
          <div className="up-sec">
            <div className="up-sec__title">Sign-in &amp; security</div>
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
// Upload a photo (center-cropped + downscaled client-side so it stays small
// in localStorage) or fall back to initials on a chosen color.
const AVATAR_COLORS = [
  { label: 'Default', value: null, css: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-600))' },
  { label: 'Indigo', value: 'var(--color-primary-600)', css: 'var(--color-primary-600)' },
  { label: 'Amber', value: 'var(--color-accent-600)', css: 'var(--color-accent-600)' },
  { label: 'Blue', value: 'var(--color-info-700)', css: 'var(--color-info-700)' },
  { label: 'Green', value: 'var(--color-success-700)', css: 'var(--color-success-700)' },
  { label: 'Orange', value: 'var(--color-warning-700)', css: 'var(--color-warning-700)' },
];

const AvatarChangeFlow = ({ user, onClose, onApply }) => {
  const Modal = window.Modal;
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
            : <div className="av-edit__fallback" style={{ background: avatarColor || AVATAR_COLORS[0].css }}>{upInitials(user.name)}</div>}
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
// A verified multi-step flow. Codes are simulated client-side for the demo:
// the generated code is shown in an info banner so it can be entered.
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

const IdentityChangeFlow = ({ mode, user, onClose, onApply, onSignOut }) => {
  const Modal = window.Modal;
  const isEmail = mode === 'email';
  // Step machine —
  //   email:    verify-old → new → verify-new → done
  //   username: verify-old → new → done
  const [step, setStep] = upUseState('verify-old');
  const [code, setCode] = upUseState('');     // the live (demo-visible) code
  const [sentTo, setSentTo] = upUseState(''); // where it was sent
  const [entry, setEntry] = upUseState('');   // typed code
  const [newVal, setNewVal] = upUseState(''); // new email / username
  const [err, setErr] = upUseState('');

  const sendTo = (addr) => { setCode(genCode()); setSentTo(addr); setEntry(''); setErr(''); };
  React.useEffect(() => { sendTo(user.email); }, []); // first code → current email

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

// ─── Change-password flow ───────────────────────────────────────
// Security-critical, so it re-authenticates before allowing the change:
//   verify current password → (step-up MFA, only if MFA on) → new password → done
// The MFA step is the standard "step-up authentication" for a sensitive
// action — a hijacked session alone must not be able to rotate the password.
const DEMO_CURRENT_PW = 'Carbon@2026';
const PW_MIN = 12;
const pwChecks = (pw, current) => [
  { label: `At least ${PW_MIN} characters`, ok: pw.length >= PW_MIN },
  { label: 'Upper- and lower-case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: 'A number', ok: /\d/.test(pw) },
  { label: 'A symbol', ok: /[^A-Za-z0-9]/.test(pw) },
  { label: 'Different from current password', ok: pw.length > 0 && pw !== current },
];

const PasswordChangeFlow = ({ mfaEnabled, mfaLabel, onClose, onDone }) => {
  const Modal = window.Modal;
  const [step, setStep] = upUseState('verify-old');
  const [curPw, setCurPw] = upUseState('');
  const [code, setCode] = upUseState('');       // demo MFA code
  const [entry, setEntry] = upUseState('');      // typed MFA code
  const [newPw, setNewPw] = upUseState('');
  const [confirmPw, setConfirmPw] = upUseState('');
  const [show, setShow] = upUseState(false);
  const [err, setErr] = upUseState('');

  const newCode = () => { setCode(genCode()); setEntry(''); setErr(''); };

  const verifyOld = () => {
    if (curPw !== DEMO_CURRENT_PW) { setErr('Current password is incorrect.'); return; }
    setErr('');
    if (mfaEnabled) { newCode(); setStep('mfa'); } else setStep('new');
  };
  const verifyMfa = () => {
    if (entry.trim() !== code) { setErr('Incorrect code. Check your authenticator app for the current code.'); return; }
    setErr(''); setStep('new');
  };

  const checks = pwChecks(newPw, curPw);
  const allOk = checks.every((c) => c.ok);
  const submitNew = () => {
    if (!allOk) { setErr('New password does not meet every requirement.'); return; }
    if (newPw !== confirmPw) { setErr('The two passwords do not match.'); return; }
    setErr(''); setStep('done');
  };

  const eye = (
    <button type="button" className="pw-reveal" tabIndex={-1} onClick={() => setShow((s) => !s)}>
      {show ? 'Hide' : 'Show'}
    </button>);
  const ptype = show ? 'text' : 'password';

  const titles = {
    'verify-old': 'Change password · confirm it\'s you',
    'mfa': 'Two-factor verification',
    'new': 'Set a new password',
    'done': 'Password changed',
  };

  let body, footer;
  if (step === 'verify-old') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">To change your password, first confirm your <strong>current password</strong>.</p>
        <Field label="Current password">
          <Input type={ptype} value={curPw} autoFocus suffix={eye} placeholder="Enter current password"
            onChange={(e) => { setCurPw(e.target.value); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') verifyOld(); }} />
        </Field>
        {mfaEnabled &&
          <div className="flow-note">
            <UIcon name="shield" size={15} />
            <span>Two-factor is on — you'll confirm a code from <strong>{mfaLabel}</strong> next.</span>
          </div>}
        {err && <div className="flow-step__err">{err}</div>}
        <div className="flow-demo">Demo password: <strong>{DEMO_CURRENT_PW}</strong></div>
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" onClick={verifyOld}>Continue</Btn>
    </>;
  } else if (step === 'mfa') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">Enter the 6-digit code from <strong>{mfaLabel}</strong> to authorize this change.</p>
        <input className="otp-input" inputMode="numeric" maxLength={6} value={entry} placeholder="000000" autoFocus
          onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') verifyMfa(); }} />
        <div className="otp-meta">
          <button type="button" className="otp-resend" onClick={newCode}>Use a new code</button>
          <span className="otp-hint">Demo code: <strong>{code}</strong></span>
        </div>
        {err && <div className="flow-step__err">{err}</div>}
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => { setErr(''); setStep('verify-old'); }}>Back</Btn>
      <Btn variant="primary" onClick={verifyMfa}>Verify</Btn>
    </>;
  } else if (step === 'new') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">Choose a new password. It must meet company policy and will rotate again in 90 days.</p>
        <Field label="New password">
          <Input type={ptype} value={newPw} autoFocus suffix={eye} placeholder="New password"
            onChange={(e) => { setNewPw(e.target.value); setErr(''); }} />
        </Field>
        <ul className="flow-reqs">
          {checks.map((c, i) =>
            <li key={i} className={`flow-req ${c.ok ? 'is-ok' : ''}`}>
              <span className="flow-req__dot">{c.ok && <UIcon name="check" size={12} />}</span>{c.label}
            </li>)}
        </ul>
        <Field label="Confirm new password">
          <Input type={ptype} value={confirmPw} suffix={eye} placeholder="Re-enter new password"
            onChange={(e) => { setConfirmPw(e.target.value); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); }} />
        </Field>
        {err && <div className="flow-step__err">{err}</div>}
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => { setErr(''); setStep(mfaEnabled ? 'mfa' : 'verify-old'); }}>Back</Btn>
      <Btn variant="primary" onClick={submitNew}>Change Password</Btn>
    </>;
  } else { // done
    body =
      <div className="flow-step flow-step--done">
        <div className="flow-done__icon"><UIcon name="check" size={22} /></div>
        <p className="flow-step__desc">Your password has been changed.</p>
      </div>;
    footer = <Btn variant="primary" onClick={() => { onClose(); onDone?.(); }}>Done</Btn>;
  }

  return (
    <Modal open onClose={onClose} title={titles[step]} width={460}
      footer={<div className="flow-foot">{footer}</div>}>
      {body}
    </Modal>);

};

// ─── MFA: authenticator reconfigure + single security-key slot ──
// One account holds one MFA configuration: a single authenticator app and a
// single security key. Both are changed through verified flows; the key is a
// one-slot setting (set up once → manage / replace / remove), never "add many".
const genSecret = () => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  for (let i = 0; i < 16; i++) out += A[Math.floor(Math.random() * A.length)];
  return out.replace(/(.{4})(?=.)/g, '$1 ');
};

// A decorative QR-shaped grid (deterministic from a seed) — stands in for the
// real enrollment QR without hand-drawing artwork.
const QrCode = ({ seed = 'toms', px = 156 }) => {
  const N = 21;
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const finder = (r, c) => {
    const box = (br, bc) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    const ring = (br, bc) => {
      const lr = r - br, lc = c - bc;
      return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
    };
    if (box(0, 0)) return ring(0, 0);
    if (box(0, N - 7)) return ring(0, N - 7);
    if (box(N - 7, 0)) return ring(N - 7, 0);
    return null;
  };
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const f = finder(r, c);
    cells.push(f === null ? rnd() > 0.52 : f);
  }
  return (
    <div className="qr" style={{ width: px, height: px, gridTemplateColumns: `repeat(${N},1fr)`, gridTemplateRows: `repeat(${N},1fr)` }}>
      {cells.map((on, i) => <span key={i} className={`qr__c ${on ? 'is-on' : ''}`} />)}
    </div>);
};

// OTP entry block shared by the MFA flows below.
const McOtp = ({ entry, setEntry, onEnter, hint, code, err }) =>
  <div className="flow-step">
    <p className="flow-step__desc">{hint}</p>
    <input className="otp-input" inputMode="numeric" maxLength={6} value={entry} placeholder="000000" autoFocus
      onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }} />
    <div className="otp-meta">
      <span className="otp-hint">Open your authenticator app for the current code.</span>
      <span className="otp-hint">Demo code: <strong>{code}</strong></span>
    </div>
    {err && <div className="flow-step__err">{err}</div>}
  </div>;

const AuthenticatorReconfigureFlow = ({ appName, onClose, onDone }) => {
  const Modal = window.Modal;
  const [step, setStep] = upUseState('verify');
  const [curCode] = upUseState(genCode);
  const [newCode] = upUseState(genCode);
  const [entry, setEntry] = upUseState('');
  const [err, setErr] = upUseState('');
  const secret = React.useMemo(genSecret, []);

  const verify = () => {
    if (entry.trim() !== curCode) { setErr('Incorrect code. Check your current authenticator.'); return; }
    setErr(''); setEntry(''); setStep('scan');
  };
  const confirm = () => {
    if (entry.trim() !== newCode) { setErr("That code doesn't match. Scan the new key, then enter its current code."); return; }
    setErr(''); onDone?.(); setStep('done');
  };

  const titles = {
    verify: "Reconfigure authenticator · confirm it's you",
    scan: 'Scan the new setup key',
    confirm: 'Confirm the new authenticator',
    done: 'Authenticator updated',
  };

  let body, footer;
  if (step === 'verify') {
    body = <McOtp entry={entry} setEntry={(v) => { setEntry(v); setErr(''); }} onEnter={verify} code={curCode} err={err}
      hint={<>Changing your authenticator is sensitive, so first confirm a code from your <strong>current</strong> authenticator.</>} />;
    footer = <>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" onClick={verify}>Continue</Btn>
    </>;
  } else if (step === 'scan') {
    body =
      <div className="flow-step">
        <p className="flow-step__desc">In your authenticator app, remove the old <strong>{appName}</strong> entry, then scan this new setup key.</p>
        <div className="qr-wrap"><QrCode seed={secret} /></div>
        <div className="setupkey">
          <span className="setupkey__label">Can't scan? Enter this setup key</span>
          <code className="setupkey__val">{secret}</code>
        </div>
      </div>;
    footer = <>
      <Btn variant="ghost" onClick={() => { setEntry(''); setErr(''); setStep('verify'); }}>Back</Btn>
      <Btn variant="primary" onClick={() => { setEntry(''); setErr(''); setStep('confirm'); }}>I've scanned it</Btn>
    </>;
  } else if (step === 'confirm') {
    body = <McOtp entry={entry} setEntry={(v) => { setEntry(v); setErr(''); }} onEnter={confirm} code={newCode} err={err}
      hint={<>Enter the 6-digit code shown for the new <strong>{appName}</strong> entry to confirm it's working.</>} />;
    footer = <>
      <Btn variant="ghost" onClick={() => { setEntry(''); setErr(''); setStep('scan'); }}>Back</Btn>
      <Btn variant="primary" onClick={confirm}>Confirm</Btn>
    </>;
  } else {
    body =
      <div className="flow-step flow-step--done">
        <div className="flow-done__icon"><UIcon name="check" size={22} /></div>
        <p className="flow-step__desc">Your authenticator app has been reconfigured. The previous setup no longer works.</p>
      </div>;
    footer = <Btn variant="primary" onClick={onClose}>Done</Btn>;
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
  const [pwFlow, setPwFlow] = upUseState(false);
  // The authenticator app is the active MFA factor; SMS (twoFA) is a backup.
  const authenticatorActive = true;
  const mfaEnabled = authenticatorActive || twoFA;
  const mfaLabel = authenticatorActive ? '1Password' : 'SMS to +1 (415) ••• 0142';
  // MFA management state.
  const [authReconfig, setAuthReconfig] = upUseState(false);
  const [authReconfiguredAt, setAuthReconfiguredAt] = upUseState(null);

  return (
    <div className="page up-page">
      <UPHeader icon="shield" title="Account & security" sub="Sign-in credentials, multi-factor and connected services" />

      <div className="stack stack--lg">
        <UPCard title="Sign-in" sub="Password rotates every 90 days per company policy">
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">Password</div>
              <div className="up-row__sub">Last changed 41 days ago · expires in 49 days</div>
            </div>
            <Btn variant="secondary" onClick={() => setPwFlow(true)}>Change password</Btn>
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
              <div className="up-row__sub">{authReconfiguredAt ? `1Password · reconfigured ${authReconfiguredAt}` : '1Password · added Feb 14, 2025 · used 3 hours ago'}</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setAuthReconfig(true)}>Reconfigure</Btn>
          </div>
          <div className="up-row">
            <div className="up-row__main">
              <div className="up-row__title">SMS backup</div>
              <div className="up-row__sub">+1 (415) ••• ‑‑0142</div>
            </div>
            <UPToggle on={twoFA} onChange={setTwoFA} />
          </div>
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

      {pwFlow && (
        <PasswordChangeFlow
          mfaEnabled={mfaEnabled}
          mfaLabel={mfaLabel}
          onClose={() => setPwFlow(false)}
          onDone={() => {
            toast({ kind: 'success', title: 'Password changed' });
          }} />
      )}

      {authReconfig && (
        <AuthenticatorReconfigureFlow
          appName="1Password"
          onClose={() => setAuthReconfig(false)}
          onDone={() => { setAuthReconfiguredAt('just now'); toast({ kind: 'success', title: 'Authenticator reconfigured' }); }} />
      )}
    </div>);

};

const UPToggle = ({ on, onChange }) =>
<button type="button" className={`up-toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
    <span className="up-toggle__dot" />
  </button>;


// ─── Switch partner ─────────────────────────────────────────────
// One signed-in account can belong to many Partners (Entities) via
// EntityUserRelationship rows. Per 公共约束 §2.5a, the destination portal
// is derived from the Partner's CONTRACT TYPE — switching to a non-ADMIN
// Partner is a cross-portal jump, not an in-app context swap.
const PARTNER_PORTALS = {
  admin:    { key: 'admin',    label: 'Admin Console',   tint: 'oklch(40% 0.14 262)', current: true },
  partner:  { key: 'partner',  label: 'Partner Portal',  tint: 'oklch(52% 0.13 200)' },
  merchant: { key: 'merchant', label: 'Merchant Portal', tint: 'oklch(56% 0.13 152)' },
};
const upPortalForContract = (kind) => {
  const k = String(kind || '').toUpperCase();
  if (k === 'ADMIN') return 'admin';
  if (k === 'MERCHANT') return 'merchant';
  return 'partner'; // ISO / ISV / ISO-PILOT / ISV-PILOT
};
const upPortalForPartner = (kinds) => {
  const set = new Set((kinds || []).map(upPortalForContract));
  if (set.has('admin')) return 'admin';
  if (set.has('partner')) return 'partner';
  return 'merchant';
};
const upFmtJoined = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return iso.slice(0, 10); }
};

const WorkspacesPage = ({ userId = 'u-2' }) => {
  const toast = useToast();
  const [jump, setJump] = upUseState(null); // partner pending cross-portal confirm

  // Build the partner list straight from the data model: every
  // EntityUserRelationship for this user, joined to its Entity view.
  const items = React.useMemo(() => {
    const rels = (window.SEED_ENTITY_USER_RELATIONSHIPS || []).filter((r) => r.userId === userId);
    return rels.map((rel) => {
      const ev = window.getEntityView ? window.getEntityView(rel.entityId) : null;
      const liveContracts = (ev?.contracts || []).filter((c) => c.status !== 'TERMINATED');
      // Distinct contract kinds, ADMIN/ISO/ISV first, pilots after.
      const kinds = [...new Set(liveContracts.map((c) => c.kind))];
      const portalKey = upPortalForPartner(kinds);
      const portal = PARTNER_PORTALS[portalKey];
      return {
        eurId: rel.id,
        entityId: rel.entityId,
        name: ev?.name || rel.entityId,
        kinds,
        portalKey,
        portal,
        joinedAt: rel.authorizingTimestamp,
        authType: rel.authorizingType,           // ADMIN | NORMAL
        locked: rel.status === 'LOCKED',
        initial: (ev?.name || '?').trim().charAt(0).toUpperCase(),
      };
    }).sort((a, b) => {
      // Current portal (ADMIN) first; locked last; then by join date desc.
      if (a.portal.current !== b.portal.current) return a.portal.current ? -1 : 1;
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      return String(b.joinedAt).localeCompare(String(a.joinedAt));
    });
  }, [userId]);

  const portalCount = new Set(items.map((i) => i.portalKey)).size;

  const onSwitch = (w) => {
    if (w.locked) {
      toast({ kind: 'error', title: `Access locked · ${w.name}`, body: "This Partner's contract is suspended. Contact an administrator." });
      return;
    }
    if (w.portal.current) {
      toast({ kind: 'info', title: `You're already in the ${w.portal.label}` });
      return;
    }
    // Non-current portal → confirm before leaving this console.
    setJump(w);
  };

  return (
    <div className="page up-page">
      <UPHeader icon="building" title="Switch partner"
        sub={`You belong to ${items.length} ${items.length === 1 ? 'partner' : 'partners'} across ${portalCount} ${portalCount === 1 ? 'portal' : 'portals'}. Each partner opens in its own portal.`} />

      <div className="up-ws-grid">
        {items.map((w) => {
          const cur = w.portal.current;
          return (
            <button key={w.eurId} type="button"
              className={`up-ws ${cur ? 'is-on' : ''} ${w.locked ? 'is-locked' : ''}`}
              onClick={() => onSwitch(w)}>
              <div className="up-ws__logo" style={{ background: w.portal.tint }}>{w.initial}</div>
              <div className="up-ws__main">
                <div className="up-ws__top">
                  <span className="up-ws__name">{w.name}</span>
                  <span className="up-ws__chips">
                    {w.kinds.map((k) => (
                      <span key={k} className={`up-ctype up-ctype--${/-PILOT$/.test(k) ? 'pilot' : k.toLowerCase()}`}>{k}</span>
                    ))}
                    {w.kinds.length === 0 && <span className="up-ctype up-ctype--none">No active contract</span>}
                  </span>
                </div>
                <div className="up-ws__meta">
                  <span className="up-ws__portal">
                    <UIcon name={cur ? 'building' : 'external'} size={13} />
                    {w.portal.label}
                  </span>
                  <span className="up-ws__dot">·</span>
                  <span className="up-ws__joined">Joined {upFmtJoined(w.joinedAt)}</span>
                  <span className="up-ws__dot">·</span>
                  <span className={`up-auth up-auth--${w.authType.toLowerCase()}`}>
                    {w.authType === 'ADMIN' ? 'Admin access' : 'Role-based access'}
                  </span>
                  {w.locked && <><span className="up-ws__dot">·</span><span className="up-auth up-auth--locked"><UIcon name="lock" size={11} />Locked</span></>}
                </div>
              </div>
              <div className="up-ws__trail">
                {cur ? <UIcon name="check" size={18} /> : w.locked ? <UIcon name="lock" size={15} /> : <UIcon name="external" size={15} />}
              </div>
            </button>
          );
        })}
      </div>

      <window.ConfirmDialog
        open={!!jump}
        onClose={() => setJump(null)}
        icon="external"
        title={jump ? `Open ${jump.name} in the ${jump.portal.label}?` : ''}
        body={jump ? <>This partner runs on a separate portal. You'll <b>leave the Admin Console</b> and continue in the {jump.portal.label}. Any unsaved changes here will be lost.</> : ''}
        confirmLabel="Leave & continue"
        cancelLabel="Stay here"
        tone="primary"
        onConfirm={() => {
          toast({ kind: 'info', title: `Opening ${jump.portal.label}`, body: `Redirecting · ${jump.name}` });
          setJump(null);
        }} />
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

Object.assign(window, { ProfilePage, AccountSecurityPage, WorkspacesPage, ActivityPage, HelpPage });
