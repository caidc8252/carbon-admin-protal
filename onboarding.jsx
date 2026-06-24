/* global React, Icon, Btn, Input, Field, Select, Modal, useToast,
   PLATFORM_ENTITY, SEED_ROLES, PASSWORD_POLICY, fmtDateTime, relTime */
const { useState: useStateOB, useMemo: useMemoOB, useEffect: useEffOB, useRef: useRefOB } = React;

// =====================================================================
// Onboarding (invite-link landing page) — rebuilt on TOMS DS v2.0.
//
// Full-viewport takeover (no app sidebar/topbar). What the invitee sees
// when they click the link in their invitation email.
//
// Single CENTERED composition (Stripe/Linear-style focused auth):
//   · a brand moment up top, the step card, and a trust footer carrying
//     the encrypted-link "data voice", over a faint blueprint background.
//   · v2.0 addendum components: tds-otp cells for code entry, tds-progress
//     for password strength, tds-btn--{soft,outline,subtle} variants.
//   · obx-* visual layer (assets/onboarding-v2.css): flat surfaces, mono
//     initials, hairline borders, single CTA per surface.
//
// Props: token, invitation, currentUser, onAccept(payload), onSignOut(), onExit()
// =====================================================================

const Onboarding = ({ token, invitation, currentUser, onAccept, onSignOut, onExit }) => {
  // step: 'landing' | 'signin' | 'register' | 'confirm' | 'welcome' | 'invalid'
  const initialStep = invitation ? 'landing' : 'invalid';
  const [step, setStep] = useStateOB(initialStep);
  const [pending, setPending] = useStateOB(null);

  const goLanding = () => setStep('landing');
  const goConfirmExisting = (acct) => { setPending({ viaExisting: true, account: acct }); setStep('confirm'); };
  const goConfirmRegister = (acct) => { setPending({ viaExisting: false, account: acct }); setStep('confirm'); };
  const accept = () => { onAccept && onAccept({ token, ...pending }); setStep('welcome'); };

  const card = (
    <>
      {step === 'invalid' && <OBInvalid token={token} onExit={onExit}/>}
      {step === 'landing' && (
        <OBLanding
          invitation={invitation} currentUser={currentUser}
          onUseCurrent={() => goConfirmExisting(currentUser)}
          onSignInOther={() => { onSignOut && onSignOut(); setStep('signin'); }}
          onRegister={() => setStep('register')}
          onSignIn={() => setStep('signin')}
        />
      )}
      {step === 'signin' && (
        <OBSignIn defaultEmail={invitation?.email} onBack={goLanding} onSignedIn={(a) => goConfirmExisting(a)}/>
      )}
      {step === 'register' && (
        <OBRegister invitation={invitation} onBack={goLanding} onDone={(a) => goConfirmRegister(a)}/>
      )}
      {step === 'confirm' && (
        <OBConfirm invitation={invitation} pending={pending} onBack={goLanding} onAccept={accept}/>
      )}
      {step === 'welcome' && <OBWelcome pending={pending} onExit={onExit}/>}
    </>
  );

  const canExit = step !== 'welcome' && step !== 'invalid';
  const showFooter = step === 'landing' || step === 'signin' || step === 'register' || step === 'confirm';
  const showHero = showFooter; // hero band on the main flow; welcome/invalid keep the slim mark

  return (
    <div className="obx-shell" data-screen-label="Onboarding">
      <div className="obx-bggrid" aria-hidden/>
      {showHero ? (
        <div className="obx-main obx-main--stacked">
          <OBHero invitation={invitation} canExit={canExit} onExit={onExit}/>
          <div className="obx-body">
            <div className="obx-stage">
              {card}
              {showFooter && <SecureFooter invitation={invitation}/>}
            </div>
          </div>
        </div>
      ) : (
        <main className="obx-main">
          <div className="obx-stage">
            <div className="obx-mark">
              <div className="obx-mark__logo"><img src="assets/toms-logo.png" alt="TOMS"/></div>
              <div className="obx-mark__name">TOMS <span>Carbon Admin</span></div>
            </div>
            {card}
          </div>
        </main>
      )}
    </div>
  );
};

// ─── Top hero band — brand + secure-invitation + fleet "data voice" ──
// Full-bleed deep-indigo band that fills wide viewports and turns the empty
// left/right gutters into substance: a multi-column fleet stat strip in
// tabular mono. The single dark brand surface; everything below stays light.
const FLEET_STATS = [
  { v: '24,418', l: 'Terminals managed' },
  { v: '99.94%', l: 'Fleet uptime · 90d' },
  { v: '1.24M',  l: 'Transactions / day' },
  { v: '12',     l: 'Regions live' },
  { v: '3',      l: 'Firmware tracks' },
  { v: '38s',    l: 'Median sync time' },
];

const OBHero = ({ invitation, canExit, onExit }) => (
  <header className="obx-hero">
    <div className="obx-hero__grid" aria-hidden/>
    <div className="obx-hero__inner">
      <div className="obx-hero__bar">
        <div className="obx-hero__brand">
          <div className="obx-hero__logo"><img src="assets/toms-logo.png" alt="TOMS"/></div>
          <div className="obx-hero__name">TOMS<span>Carbon Admin</span></div>
        </div>
        {canExit && (
          <button type="button" className="obx-hero__exit" onClick={onExit}>
            <Icon name="x" size={13}/> Exit to admin
          </button>
        )}
      </div>

      <div className="obx-hero__lead">
        <div className="obx-hero__eyebrow"><span className="obx-hero__dot"/> Secure invitation</div>
        <h1 className="obx-hero__headline">Join the Carbon admin platform.</h1>
        <p className="obx-hero__lede">
          Provision terminals, push firmware, and audit compliance across the fleet — from one back office.
        </p>
      </div>

      <div className="obx-hero__stats">
        {FLEET_STATS.map((s, i) => (
          <div className="obx-hero__stat" key={i}>
            <div className="obx-hero__stat-v">{s.v}</div>
            <div className="obx-hero__stat-l">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </header>
);

// ─── Trust footer — encrypted-link "data voice" under the card ───────
const SecureFooter = ({ invitation }) => {
  const rawId = (invitation?.token || invitation?.id || 'pending').toString().replace(/[^a-z0-9]/gi, '');
  const shortToken = 'inv_' + rawId.slice(-8).padStart(8, '0') + 'k9';
  return (
    <div className="obx-secure">
      <span className="obx-secure__lead"><Icon name="lock" size={13}/> Encrypted invite link</span>
      <code className="obx-secure__token">{shortToken}</code>
      <span className="obx-secure__sep" aria-hidden/>
      <span className="obx-secure__meta">Single-use · expires on acceptance</span>
    </div>
  );
};

// =====================================================================
// Invalid / expired link
// =====================================================================
const OBInvalid = ({ token, onExit }) => (
  <div className="obx-card obx-card--err">
    <div className="obx-medallion obx-medallion--err"><Icon name="x" size={20}/></div>
    <h1 className="obx-title">Invitation not found</h1>
    <p className="obx-sub" style={{ marginBottom: 22 }}>
      The link you followed (<code className="obx-code">{token || '—'}</code>) doesn't match any pending invitation.
      It may have been cancelled, already used, or expired.
    </p>
    <Btn variant="primary" onClick={onExit}>Back to admin</Btn>
  </div>
);

// =====================================================================
// Landing — branching entry point
// =====================================================================
const OBLanding = ({ invitation, currentUser, onUseCurrent, onSignInOther, onRegister, onSignIn }) => (
  <div className="obx-card obx-card--wide">
    <div className="obx-eyebrow">Invitation</div>
    <h1 className="obx-title">Join {PLATFORM_ENTITY.name}</h1>
    <p className="obx-sub" style={{ marginBottom: 20 }}>
      You've been invited to join the admin platform. Choose how to continue.
    </p>

    <div className="obx-entity">
      <div className="obx-entity__logo">{PLATFORM_ENTITY.initials}</div>
      <div className="obx-entity__main">
        <div className="obx-entity__name">{PLATFORM_ENTITY.fullName}</div>
        <div className="obx-entity__sub">Invited by <strong>{invitation?.invitedBy || 'admin@carbon'}</strong></div>
      </div>
    </div>

    {currentUser ? (
      <>
        <div className="obx-divider"><span>You're signed in as</span></div>
        <div className="obx-account obx-account--lg">
          <div className="obx-account__avatar">{currentUser.initials || currentUser.name?.[0]}</div>
          <div className="obx-account__main">
            <div className="obx-account__name">{currentUser.name}</div>
            <div className="obx-account__email">{currentUser.email}</div>
          </div>
        </div>
        <div className="obx-actions">
          <Btn variant="primary" icon="check" onClick={onUseCurrent}>Use this account to join</Btn>
          <Btn variant="outline" icon="user" onClick={onSignInOther}>Sign out &amp; use a different account</Btn>
          <Btn variant="subtle" icon="plus" onClick={onRegister}>Register a new account</Btn>
        </div>
      </>
    ) : (
      <>
        <div className="obx-divider"><span>Continue with</span></div>
        <div className="obx-actions">
          <Btn variant="primary" icon="user" onClick={onSignIn}>Sign in with existing account</Btn>
          <Btn variant="outline" icon="plus" onClick={onRegister}>Register a new account</Btn>
        </div>
      </>
    )}

    <div className="obx-meta">
      <Icon name="clock" size={12}/>
      <span>Sent to <strong>{invitation?.email}</strong> · expires {relTime(invitation?.inviteExpiresAt)}</span>
    </div>
  </div>
);

// =====================================================================
// Sign-in (mock — any password ≥ 6 chars; recognized emails fast-pathed)
// =====================================================================
const OBSignIn = ({ defaultEmail, onBack, onSignedIn }) => {
  const [email, setEmail] = useStateOB(defaultEmail || '');
  const [password, setPassword] = useStateOB('');
  const [busy, setBusy] = useStateOB(false);
  const [err, setErr] = useStateOB('');
  const valid = email.includes('@') && password.length >= 6;

  const submit = () => {
    if (!valid) return;
    setBusy(true); setErr('');
    setTimeout(() => {
      setBusy(false);
      const u = (window.SEED_USERS || []).find(s => s.email.toLowerCase() === email.toLowerCase() && s.status === 'ACTIVE');
      if (u) {
        onSignedIn({
          email: u.email, name: u.displayName,
          initials: (u.displayName || u.loginName || '?').split(/\s+/).slice(0,2).map(s => s[0]).filter(Boolean).join('').toUpperCase(),
          existingUserId: u.id,
        });
      } else {
        const local = email.split('@')[0];
        onSignedIn({ email, name: local.charAt(0).toUpperCase() + local.slice(1), initials: local.slice(0, 2).toUpperCase(), existingUserId: null });
      }
    }, 500);
  };
  const onKey = (e) => { if (e.key === 'Enter' && valid && !busy) submit(); };

  return (
    <div className="obx-card obx-card--narrow">
      <button type="button" className="obx-back" onClick={onBack}><Icon name="chevL" size={13}/> Back</button>
      <div className="obx-eyebrow">Step 1 of 2</div>
      <h1 className="obx-title">Sign in to your account</h1>
      <p className="obx-sub" style={{ marginBottom: 18 }}>
        After signing in, you'll be asked to confirm joining <strong>{PLATFORM_ENTITY.name}</strong>.
      </p>
      <div className="obx-entity">
        <div className="obx-entity__logo">{PLATFORM_ENTITY.initials}</div>
        <div className="obx-entity__main">
          <div className="obx-entity__name">Joining {PLATFORM_ENTITY.fullName}</div>
          <div className="obx-entity__sub">Invited as <strong>{defaultEmail || '—'}</strong></div>
        </div>
      </div>
      <div className="obx-stack" style={{ gap: 14, marginTop: 18 }} onKeyDown={onKey}>
        <Field label="Email">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" prefix={<Icon name="mail" size={14}/>}/>
        </Field>
        <Field label="Password" hint="Any 6+ char password works in this demo.">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
        </Field>
        {err && <div className="obx-error">{err}</div>}
      </div>
      <div className="obx-actions obx-actions--row" style={{ marginTop: 22 }}>
        <Btn variant="subtle" onClick={onBack}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={submit} disabled={!valid} loading={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Btn>
      </div>
    </div>
  );
};

// =====================================================================
// OTP — six single-digit cells (v2.0 tds-otp), auto-advance + paste.
// =====================================================================
const OBOtp = ({ value, onChange, length = 6, autoFocus }) => {
  const refs = useRefOB([]);
  const focus = (i) => { const el = refs.current[i]; if (el) el.focus(); };

  const setAt = (i, digit) => {
    const arr = value.split('');
    while (arr.length < length) arr.push('');
    arr[i] = digit;
    onChange(arr.join('').slice(0, length).replace(/\s+$/, ''));
  };
  const handle = (i, raw) => {
    const digit = (raw.match(/\d/g) || []).pop() || '';
    setAt(i, digit);
    if (digit && i < length - 1) focus(i + 1);
  };
  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) setAt(i, '');
      else if (i > 0) { focus(i - 1); setAt(i - 1, ''); }
    } else if (e.key === 'ArrowLeft' && i > 0) focus(i - 1);
    else if (e.key === 'ArrowRight' && i < length - 1) focus(i + 1);
  };
  const onPaste = (e) => {
    const txt = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    focus(Math.min(txt.length, length - 1));
  };

  return (
    <div className="obx-otp-wrap">
      <div className="tds-otp" onPaste={onPaste}>
        {Array.from({ length }).map((_, i) => (
          <input key={i} ref={el => { refs.current[i] = el; }}
            className={`tds-otp__cell ${value[i] ? 'tds-otp__cell--filled' : ''}`}
            inputMode="numeric" maxLength={1} value={value[i] || ''}
            onChange={e => handle(i, e.target.value)}
            onKeyDown={e => onKeyDown(i, e)}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1}`}/>
        ))}
      </div>
    </div>
  );
};

// =====================================================================
// Register — multi-step wizard (email choice → [new email + verify] →
//   login name → password → country → display name)
// =====================================================================
const OBRegister = ({ invitation, onBack, onDone }) => {
  const [emailMode, setEmailMode] = useStateOB('invite');
  const [customEmail, setCustomEmail] = useStateOB('');
  const [code, setCode] = useStateOB('');
  const [sending, setSending] = useStateOB(false);
  const [verifying, setVerifying] = useStateOB(false);
  const [codeErr, setCodeErr] = useStateOB('');
  const [cooldown, setCooldown] = useStateOB(0);

  const STEPS = useMemoOB(() => {
    const list = [{ id: 'emailchoice', label: 'Email' }];
    if (emailMode === 'custom') {
      list.push({ id: 'emailnew', label: 'New email' });
      list.push({ id: 'emailverify', label: 'Verify code' });
    }
    list.push(
      { id: 'login',    label: 'Login name' },
      { id: 'password', label: 'Password' },
      { id: 'country',  label: 'Country' },
      { id: 'display',  label: 'Display name' },
    );
    return list;
  }, [emailMode]);

  const [stepIdx, setStepIdx] = useStateOB(0);
  const [acct, setAcct] = useStateOB({ loginName: '', password: '', confirm: '', country: 'US', displayName: '' });
  const cur = STEPS[Math.min(stepIdx, STEPS.length - 1)];

  useEffOB(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const effectiveEmail = emailMode === 'invite' ? (invitation?.email || '') : customEmail.trim();
  const customEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.trim());
  const codeValid = /^\d{6}$/.test(code.trim());

  const pickMode = (m) => {
    setEmailMode(m);
    if (m === 'invite') { setCustomEmail(''); setCode(''); setCodeErr(''); setCooldown(0); }
  };

  const loginTaken = (window.SEED_USERS || []).some(u => u.loginName === acct.loginName.trim());
  const loginValid = /^[a-z][a-z0-9._-]{1,30}$/.test(acct.loginName.trim()) && !loginTaken;

  const pwLong   = acct.password.length >= (PASSWORD_POLICY?.minLength || 12);
  const pwUpper  = /[A-Z]/.test(acct.password);
  const pwLower  = /[a-z]/.test(acct.password);
  const pwDigit  = /[0-9]/.test(acct.password);
  const pwSymbol = /[^A-Za-z0-9]/.test(acct.password);
  const pwMatch  = acct.password && acct.password === acct.confirm;
  const pwScore  = [pwLong, pwUpper, pwLower, pwDigit, pwSymbol].filter(Boolean).length;
  const pwValid  = pwScore === 5 && pwMatch;

  const countryValid = !!acct.country;
  const displayValid = acct.displayName.trim().length >= 1;

  const stepValid = {
    emailchoice: true,
    emailnew:    customEmailValid,
    emailverify: codeValid,
    login:       loginValid,
    password:    pwValid,
    country:     countryValid,
    display:     displayValid,
  }[cur.id];

  const isLast = stepIdx === STEPS.length - 1;

  const continueLabel = {
    emailchoice: 'Continue',
    emailnew:    sending ? 'Sending…' : 'Send verification code',
    emailverify: verifying ? 'Verifying…' : 'Verify & continue',
    login:       'Continue',
    password:    'Continue',
    country:     'Continue',
    display:     'Continue to confirmation',
  }[cur.id];

  const continueIcon = { emailchoice: 'chevR', emailnew: 'mail', emailverify: 'check', display: 'check' }[cur.id] || 'chevR';

  const advance = () => setStepIdx(stepIdx + 1);
  const next = () => {
    if (cur.id === 'emailnew') {
      setSending(true); setCodeErr('');
      setTimeout(() => { setSending(false); setCooldown(30); advance(); }, 600);
      return;
    }
    if (cur.id === 'emailverify') {
      setVerifying(true); setCodeErr('');
      setTimeout(() => {
        setVerifying(false);
        if (codeValid) advance(); else setCodeErr('Invalid code. Try 123456.');
      }, 500);
      return;
    }
    if (!isLast) { advance(); return; }
    onDone({
      loginName: acct.loginName.trim(), password: acct.password, country: acct.country,
      displayName: acct.displayName.trim(), email: effectiveEmail, emailIsCustom: emailMode === 'custom',
      name: acct.displayName.trim(),
      initials: acct.displayName.trim().split(/\s+/).slice(0,2).map(s => s[0]).filter(Boolean).join('').toUpperCase(),
      existingUserId: null,
    });
  };
  const back = () => { if (stepIdx === 0) onBack(); else setStepIdx(stepIdx - 1); };
  const onKey = (e) => { if (e.key === 'Enter' && stepValid && !sending && !verifying) { e.preventDefault(); next(); } };

  const resendCode = () => {
    if (cooldown || sending) return;
    setSending(true); setCodeErr('');
    setTimeout(() => { setSending(false); setCooldown(30); }, 500);
  };

  const strength = ['Too short', 'Weak', 'Fair', 'Fair', 'Good', 'Strong'][pwScore] || 'Weak';
  const strengthTone = pwScore >= 5 ? 'success' : pwScore >= 3 ? 'warning' : 'error';

  return (
    <div className="obx-card obx-card--wide">
      <button type="button" className="obx-back" onClick={back}>
        <Icon name="chevL" size={13}/> {stepIdx === 0 ? 'Back to landing' : 'Previous step'}
      </button>

      <div className="obx-eyebrow">Register a new account · Step {stepIdx + 1} of {STEPS.length}</div>
      <h1 className="obx-title">{cur.label}</h1>

      <div className="obx-entity" style={{ marginTop: 4, marginBottom: 16 }}>
        <div className="obx-entity__logo">{PLATFORM_ENTITY.initials}</div>
        <div className="obx-entity__main">
          <div className="obx-entity__name">Joining {PLATFORM_ENTITY.fullName}</div>
          <div className="obx-entity__sub">
            {emailMode === 'invite' ? (
              <>Account email <strong>{invitation?.email}</strong>
                <span className="obx-account__chip obx-account__chip--ok" style={{ marginLeft: 8 }}>From invite</span></>
            ) : (
              <>Using a different email
                <span className="obx-account__chip obx-account__chip--new" style={{ marginLeft: 8 }}>Custom</span></>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="obx-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`obx-stepper__node ${i < stepIdx ? 'is-done' : i === stepIdx ? 'is-on' : ''}`}>
              <div className="obx-stepper__dot">{i < stepIdx ? <Icon name="check" size={11}/> : i + 1}</div>
              <span className="obx-stepper__lbl">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`obx-stepper__bar ${i < stepIdx ? 'is-done' : ''}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="obx-step-body" onKeyDown={cur.id === 'password' ? undefined : onKey}>
        {cur.id === 'emailchoice' && (
          <div className="obx-stack" style={{ gap: 12 }}>
            <div className="obx-sub" style={{ margin: 0 }}>Confirm which email address to use for your new account.</div>
            <label className={`obx-radio-card ${emailMode === 'invite' ? 'is-on' : ''}`}>
              <input type="radio" name="emailmode" checked={emailMode === 'invite'} onChange={() => pickMode('invite')}/>
              <div className="obx-radio-card__main">
                <div className="obx-radio-card__title">Use my invitation email
                  <span className="obx-account__chip obx-account__chip--ok">Verified</span></div>
                <div className="obx-radio-card__sub"><strong>{invitation?.email}</strong> — already confirmed by clicking the invite link.</div>
              </div>
            </label>
            <label className={`obx-radio-card ${emailMode === 'custom' ? 'is-on' : ''}`}>
              <input type="radio" name="emailmode" checked={emailMode === 'custom'} onChange={() => pickMode('custom')}/>
              <div className="obx-radio-card__main">
                <div className="obx-radio-card__title">Use a different email</div>
                <div className="obx-radio-card__sub">You'll enter the new email next, then verify it with a 6-digit code.</div>
              </div>
            </label>
          </div>
        )}

        {cur.id === 'emailnew' && (
          <Field label="New email address" required
                 hint="A 6-digit verification code will be sent to confirm you own this address.">
            <Input type="email" value={customEmail}
                   onChange={e => { setCustomEmail(e.target.value); setCode(''); setCodeErr(''); }}
                   placeholder="name@company.com" prefix={<Icon name="mail" size={14}/>} autoFocus/>
          </Field>
        )}

        {cur.id === 'emailverify' && (
          <div className="obx-stack" style={{ gap: 16 }}>
            <div className="obx-sub" style={{ margin: 0, textAlign: 'center' }}>
              We sent a 6-digit code to <strong>{customEmail}</strong>. Enter it below to confirm.
            </div>
            <OBOtp value={code} onChange={(v) => { setCode(v); setCodeErr(''); }} autoFocus/>
            {codeErr
              ? <div className="obx-error" style={{ textAlign: 'center' }}>{codeErr}</div>
              : <div className="obx-sub" style={{ margin: 0, textAlign: 'center', fontSize: 12 }}>Demo: enter <code className="obx-code">123456</code> or any 6 digits.</div>}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Btn variant="subtle" onClick={resendCode} disabled={!!cooldown || sending}>
                {cooldown ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
              </Btn>
            </div>
          </div>
        )}

        {cur.id === 'login' && (
          <Field label="Choose a login name" required
                 hint={
                   acct.loginName && loginTaken ? <span style={{ color: 'var(--color-error-700)' }}>Already taken — pick another.</span>
                   : acct.loginName && !loginValid ? <span style={{ color: 'var(--color-error-700)' }}>Letters, digits, '.', '_' or '-' only (2–31 chars; must start with letter).</span>
                   : 'Lowercase letters, digits, and . _ - allowed. 2–31 characters. Used to sign in.'
                 }>
            <Input value={acct.loginName} invalid={!!acct.loginName && !loginValid}
                   onChange={e => setAcct({ ...acct, loginName: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                   placeholder="e.g. kai.tanaka" prefix={<Icon name="user" size={14}/>} autoFocus/>
          </Field>
        )}

        {cur.id === 'password' && (
          <div className="obx-stack" style={{ gap: 14 }} onKeyDown={onKey}>
            <Field label="Set a password" required>
              <Input type="password" value={acct.password}
                     onChange={e => setAcct({ ...acct, password: e.target.value })}
                     placeholder="At least 12 characters" autoFocus/>
            </Field>
            {acct.password && (
              <div className="obx-strength">
                <div className="obx-strength__row">
                  <span className="obx-strength__lbl">Password strength</span>
                  <span className="obx-strength__val" data-lvl={pwScore}>{strength}</span>
                </div>
                <div className={`tds-progress tds-progress--sm tds-progress--${strengthTone}`}>
                  <div className="tds-progress__bar" style={{ width: `${(pwScore / 5) * 100}%` }}/>
                </div>
              </div>
            )}
            <ul className="obx-checklist">
              <PwRule on={pwLong}   text={`${PASSWORD_POLICY?.minLength || 12}+ characters`}/>
              <PwRule on={pwUpper}  text="Uppercase"/>
              <PwRule on={pwLower}  text="Lowercase"/>
              <PwRule on={pwDigit}  text="Number"/>
              <PwRule on={pwSymbol} text="Symbol"/>
              <PwRule on={!!pwMatch} text="Passwords match"/>
            </ul>
            <Field label="Confirm password" required
                   error={acct.confirm && !pwMatch ? "Passwords don't match." : null}>
              <Input type="password" value={acct.confirm} invalid={!!acct.confirm && !pwMatch}
                     onChange={e => setAcct({ ...acct, confirm: e.target.value })}
                     placeholder="Repeat password"/>
            </Field>
          </div>
        )}

        {cur.id === 'country' && (
          <Field label="Where are you based?" required hint="Used for compliance routing (locale, audit jurisdiction).">
            <Select value={acct.country} onChange={e => setAcct({ ...acct, country: e.target.value })}>
              {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
        )}

        {cur.id === 'display' && (
          <Field label="What should we call you?" required hint="Your display name appears in audit logs and to colleagues.">
            <Input value={acct.displayName} onChange={e => setAcct({ ...acct, displayName: e.target.value })}
                   placeholder="Kai Tanaka" prefix={<Icon name="user" size={14}/>} autoFocus/>
          </Field>
        )}
      </div>

      <div className="obx-actions obx-actions--row" style={{ marginTop: 22 }}>
        <Btn variant="subtle" onClick={back}>{stepIdx === 0 ? 'Back to landing' : 'Previous'}</Btn>
        <Btn variant="primary" icon={continueIcon} onClick={next}
             disabled={!stepValid || sending || verifying} loading={sending || verifying}>
          {continueLabel}
        </Btn>
      </div>
    </div>
  );
};

// Curated country list for the Register wizard's Country step.
const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' }, { code: 'GB', name: 'United Kingdom' }, { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' }, { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' }, { code: 'CH', name: 'Switzerland' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IN', name: 'India' }, { code: 'SG', name: 'Singapore' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'CN', name: 'China' }, { code: 'HK', name: 'Hong Kong SAR' },
  { code: 'TW', name: 'Taiwan' }, { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
];

const PwRule = ({ on, text }) => (
  <li className={`obx-checklist__row ${on ? 'is-on' : ''}`}>
    <Icon name={on ? 'check' : 'minus'} size={11}/>
    <span>{text}</span>
  </li>
);

// =====================================================================
// Confirm — authorize joining the entity
// =====================================================================
const OBConfirm = ({ invitation, pending, onBack, onAccept }) => {
  const acct = pending?.account || {};
  return (
    <div className="obx-card obx-card--wide">
      <button type="button" className="obx-back" onClick={onBack}><Icon name="chevL" size={13}/> Back</button>
      <div className="obx-eyebrow">Final step</div>
      <h1 className="obx-title">Join {PLATFORM_ENTITY.name}</h1>
      <p className="obx-sub" style={{ marginBottom: 20 }}>
        Confirm you want to join with the account below. An administrator will set up your access after you join.
      </p>

      <div className="obx-entity">
        <div className="obx-entity__logo">{PLATFORM_ENTITY.initials}</div>
        <div className="obx-entity__main">
          <div className="obx-entity__name">{PLATFORM_ENTITY.fullName}</div>
          <div className="obx-entity__sub">Invited by <strong>{invitation?.invitedBy || 'admin@carbon'}</strong></div>
        </div>
      </div>

      <div className="obx-divider"><span>You're joining as</span></div>

      <div className="obx-account obx-account--lg">
        <div className="obx-account__avatar">{acct.initials || acct.name?.[0] || '?'}</div>
        <div className="obx-account__main">
          <div className="obx-account__name">{acct.name || acct.displayName}</div>
          <div className="obx-account__email">{acct.email || invitation?.email}</div>
        </div>
        {pending?.viaExisting
          ? <span className="obx-account__chip obx-account__chip--ok">Existing</span>
          : <span className="obx-account__chip obx-account__chip--new">New</span>}
      </div>

      <div className="obx-actions obx-actions--row" style={{ marginTop: 24 }}>
        <Btn variant="subtle" onClick={onBack}>Decline</Btn>
        <Btn variant="primary" icon="check" onClick={onAccept}>Authorize &amp; join</Btn>
      </div>
    </div>
  );
};

// =====================================================================
// Welcome — completion screen
// =====================================================================
const OBWelcome = ({ pending, onExit }) => {
  const name = pending?.account?.name || pending?.account?.displayName || 'there';
  return (
    <div className="obx-card obx-card--narrow obx-card--centered">
      <div className="obx-confetti" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => <span key={i} style={{ '--i': i }}/>)}
      </div>
      <div className="obx-medallion obx-medallion--ok"><Icon name="check" size={28}/></div>
      <h1 className="obx-title">Welcome to {PLATFORM_ENTITY.name}, {name.split(' ')[0]}.</h1>
      <p className="obx-sub">
        You're now a member of <strong>{PLATFORM_ENTITY.fullName}</strong>. We've recorded your sign-up time and the
        roles you accepted. You can adjust your profile from your account menu.
      </p>
      <div className="obx-actions obx-actions--row obx-actions--center" style={{ marginTop: 22 }}>
        <Btn variant="primary" icon="check" onClick={onExit}>Go to dashboard</Btn>
      </div>
    </div>
  );
};

window.Onboarding = Onboarding;
