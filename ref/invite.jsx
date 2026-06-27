/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Invite-mode publishing
// ─────────────────────────────────────────────────────────────
// A published version can be made invite-only at publish time. No ISO gets
// automatic visibility — the publisher hand-sends a one-time invite link to
// each ISO contact. Clicking the link drops the recipient into BrowsePool
// with this app pre-selected and the Subscribe flow pre-opened. The token
// is consumed on successful subscription.
//
// All state lives on window so the prototype can mutate it cheaply.
// ─────────────────────────────────────────────────────────────

const { useState: useStateInv, useEffect: useEffectInv, useMemo: useMemoInv } = React;

// ─── Storage ────────────────────────────────────────────────
// VERSION_INVITES[appId][versionId] = InviteRecord[]
window.VERSION_INVITES = window.VERSION_INVITES || {};

const INVITE_TTL_DAYS = 30;
const TODAY_STR = "May 14, 2026";
function nowEpoch() { return Date.parse(TODAY_STR); }
function plusDays(e, d) { return e + d * 86400 * 1000; }
function fmtDate(epoch) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(epoch);
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
}
function relDays(epoch) {
  const diff = Math.round((epoch - nowEpoch()) / 86400000);
  if (diff === 0) return "today";
  if (diff > 0)   return `in ${diff} day${diff === 1 ? "" : "s"}`;
  return `${-diff} day${-diff === 1 ? "" : "s"} ago`;
}

function genToken() {
  const a = () => Math.random().toString(36).slice(2, 10);
  return `inv_${a()}${a()}${a()}`.slice(0, 28);
}
function inviteUrl(token) {
  return `https://toms.example/i/${token}`;
}

function createInvite(appId, versionId, email) {
  const now = nowEpoch();
  const rec = {
    token: genToken(),
    email: email.trim(),
    appId, versionId,
    createdAt: now,
    expiresAt: plusDays(now, INVITE_TTL_DAYS),
    status: "active",
    createdBy: "You",
  };
  window.VERSION_INVITES[appId] = window.VERSION_INVITES[appId] || {};
  const list = window.VERSION_INVITES[appId][versionId] = window.VERSION_INVITES[appId][versionId] || [];
  list.unshift(rec);
  window.dispatchEvent(new Event("__invite_changed"));
  return rec;
}

function listInvites(appId, versionId) {
  const arr = ((window.VERSION_INVITES[appId] || {})[versionId]) || [];
  const now = nowEpoch();
  arr.forEach(r => { if (r.status === "active" && r.expiresAt < now) r.status = "expired"; });
  return arr;
}

function findInvite(token) {
  for (const appId of Object.keys(window.VERSION_INVITES)) {
    for (const vid of Object.keys(window.VERSION_INVITES[appId])) {
      const r = window.VERSION_INVITES[appId][vid].find(x => x.token === token);
      if (r) return r;
    }
  }
  return null;
}

function consumeInvite(token, usedByEmail) {
  const r = findInvite(token);
  if (!r) return null;
  if (r.status !== "active") return r;
  if (r.expiresAt < nowEpoch()) { r.status = "expired"; window.dispatchEvent(new Event("__invite_changed")); return r; }
  r.status = "used";
  r.usedAt = nowEpoch();
  r.usedBy = usedByEmail || r.email;
  window.dispatchEvent(new Event("__invite_changed"));
  return r;
}

function revokeInvite(token) {
  const r = findInvite(token);
  if (!r || r.status === "used") return r;
  r.status = "expired";
  window.dispatchEvent(new Event("__invite_changed"));
  return r;
}

// ─── Seed demo records so the history card is meaningful ────
(function seed() {
  if (Object.keys(window.VERSION_INVITES).length > 0) return;
  window.VERSION_INVITES.pos = {
    v32: [
      { token: genToken(), email: "ops@summit-retail.example",     appId: "pos", versionId: "v32",
        createdAt: Date.parse("May 12, 2026"), expiresAt: Date.parse("Jun 11, 2026"),
        status: "active", createdBy: "You" },
      { token: genToken(), email: "kris.bowman@northbay.example",  appId: "pos", versionId: "v32",
        createdAt: Date.parse("May 09, 2026"), expiresAt: Date.parse("Jun 08, 2026"),
        status: "used", usedAt: Date.parse("May 11, 2026"),
        usedBy: "kris.bowman@northbay.example", createdBy: "You" },
      { token: genToken(), email: "deploy@lighthouse-iso.example", appId: "pos", versionId: "v32",
        createdAt: Date.parse("Apr 02, 2026"), expiresAt: Date.parse("May 02, 2026"),
        status: "expired", createdBy: "You" },
    ],
  };
  window.VERSION_INVITES.loyalty = {
    v07: [
      { token: genToken(), email: "rosa.martinez@northbay.example", appId: "loyalty", versionId: "v07",
        createdAt: Date.parse("May 13, 2026"), expiresAt: Date.parse("Jun 12, 2026"),
        status: "active", createdBy: "You" },
    ],
  };
  // Mark the loyalty RC and POS v32 as invite-mode publishes (for the badge).
  const apps = window.APPS || [];
  const tagInvite = (appId, vId) => {
    const a = apps.find(x => x.id === appId); if (!a) return;
    const v = (a.versions || []).find(x => x.id === vId); if (!v) return;
    v.visibility = "invite";
  };
  tagInvite("loyalty", "v07");
})();

window.createInvite  = createInvite;
window.listInvites   = listInvites;
window.findInvite    = findInvite;
window.consumeInvite = consumeInvite;
window.revokeInvite  = revokeInvite;
window.inviteUrl     = inviteUrl;
window.inviteFmtDate = fmtDate;
window.inviteRelDays = relDays;

// ─── Invite-ISO modal ──────────────────────────────────────
function InviteIsoModal({ open, onClose, app, version, onCreated }) {
  const [email, setEmail] = useStateInv("");
  const [errored, setErrored] = useStateInv(false);
  const [created, setCreated] = useStateInv(null);
  const [copyState, setCopyState] = useStateInv("idle");

  useEffectInv(() => {
    if (open) { setEmail(""); setErrored(false); setCreated(null); setCopyState("idle"); }
  }, [open, app?.id, version?.id]);

  if (!open || !app || !version) return null;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = () => {
    if (!emailValid) { setErrored(true); return; }
    const rec = createInvite(app.id, version.id, email);
    setCreated(rec);
    onCreated && onCreated(rec);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(created.token));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch (e) {
      window.showToast?.("Clipboard blocked — copy manually", "warning");
    }
  };

  return (
    <window.Modal open onClose={onClose} width={580}
      title={created
        ? <>Invite created · <span style={{ fontWeight: 500 }}>{created.email}</span></>
        : <>Push <span style={{ fontWeight: 600 }}>{app.name}</span> to an ISO</>}
      subtitle={created
        ? <>One-time link, valid 30 days. Share it via your usual channel — email, Slack DM, etc.</>
        : <>Generate a single-use invite link for an ISO contact. Opening it drops them into TOMS with this app's subscribe flow pre-opened.</>}
      footer={created ? (
        <window.Button primary onClick={onClose}>Done</window.Button>
      ) : (
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="send" disabled={!emailValid} onClick={submit}>Create invite link</window.Button>
        </>
      )}>
      {created
        ? <InviteCreatedView rec={created} app={app} version={version} onCopy={copyLink} copyState={copyState} />
        : <InviteFormView email={email} setEmail={setEmail} app={app} version={version}
            errored={errored} setErrored={setErrored} />}
    </window.Modal>
  );
}

function InviteFormView({ email, setEmail, app, version, errored, setErrored }) {
  const emailErr = errored && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        background: "var(--color-bg-3)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}>
        <window.AppIcon app={app} version={version} size={40} radius={9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {app.name}{" "}
            <span className="mono" style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>· v{version.name}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{app.package}</div>
        </div>
        {version.visibility === "invite" && <window.Pill tone="accent" size="sm" dot>Invite-only</window.Pill>}
      </div>

      <window.Field label="ISO contact email" required
        hint="The address you'd send the invite to. (Display-only in this prototype — we don't actually send mail.)"
        error={emailErr ? "Enter a valid email address." : null}>
        <window.Input value={email}
          onChange={(e) => { setEmail(e.target.value); if (errored) setErrored(false); }}
          placeholder="ops@partner-iso.example"
          prefix={<window.Ico name="mail" size={13} />} />
      </window.Field>

      <div style={{
        padding: "10px 12px",
        background: "var(--color-info-50)",
        border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
        borderRadius: "var(--radius-md)",
        display: "flex", gap: 10, alignItems: "flex-start",
        fontSize: 12, color: "var(--color-info-700)", lineHeight: 1.55,
      }}>
        <window.Ico name="shieldCheck" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>About the link</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Carries a signed token bound to <span className="mono">{app.package}</span></li>
            <li>Valid for <b>30 days</b> from now</li>
            <li><b>Single-use</b> — burns on subscribe</li>
            <li>You can revoke it any time from the invite history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InviteCreatedView({ rec, app, version, onCopy, copyState }) {
  const url = inviteUrl(rec.token);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        padding: "14px 16px",
        background: "var(--color-primary-50)",
        border: "1px solid var(--color-primary-500)",
        borderRadius: "var(--radius-md)",
      }}>
        <div className="overline" style={{
          fontSize: 9.5, color: "var(--color-primary-700)", marginBottom: 6,
        }}>Invite link</div>
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <code style={{
            flex: 1, minWidth: 0,
            padding: "10px 12px",
            background: "var(--color-bg-2)",
            border: "1px solid var(--color-primary-500)",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-family-mono)",
            fontSize: 12, color: "var(--color-text-primary)",
            wordBreak: "break-all",
            display: "flex", alignItems: "center",
          }}>{url}</code>
          <window.Button onClick={onCopy} icon={copyState === "copied" ? "check" : "copy"} primary>
            {copyState === "copied" ? "Copied" : "Copy link"}
          </window.Button>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px",
        padding: "12px 14px",
        background: "var(--color-bg-2)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}>
        <KvMini label="Recipient" value={<span className="mono">{rec.email}</span>} />
        <KvMini label="For version" value={<span className="mono">{app.name} · v{version.name}</span>} />
        <KvMini label="Expires"
          value={<span className="mono">{fmtDate(rec.expiresAt)}{" "}
            <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>· 30 days</span>
          </span>} />
        <KvMini label="Token"
          value={<span className="mono" style={{
            fontSize: 11, padding: "2px 6px", borderRadius: 3,
            background: "var(--color-bg-3)", color: "var(--color-text-secondary)",
            display: "inline-block",
          }}>{rec.token}</span>} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>When the recipient opens the link, they'll:</div>
        <ol style={{ margin: 0, paddingLeft: 18,
          fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          <li>Sign into TOMS (or be prompted to, if not already)</li>
          <li>Land directly on this app's <b>Subscribe</b> screen with the version pre-pinned</li>
          <li>Confirm the subscription — the token is burned at that moment</li>
        </ol>
      </div>
    </div>
  );
}

function KvMini({ label, value }) {
  return (
    <div>
      <div className="overline" style={{ fontSize: 9.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

// ─── Invite history card (mounted on VersionDetail) ────────
function InviteHistoryCard({ app, version, onInviteAgain, navigate }) {
  const [tick, setTick] = useStateInv(0);
  useEffectInv(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener("__invite_changed", h);
    return () => window.removeEventListener("__invite_changed", h);
  }, []);

  const records = listInvites(app.id, version.id);
  const counts = useMemoInv(() => ({
    active:  records.filter(r => r.status === "active").length,
    used:    records.filter(r => r.status === "used").length,
    expired: records.filter(r => r.status === "expired").length,
  }), [records, tick]);

  const handleCopy = async (url) => {
    try { await navigator.clipboard.writeText(url); window.showToast?.("Invite link copied", "success"); }
    catch (e) { window.showToast?.("Couldn't copy link", "warning"); }
  };
  const handleRevoke = (rec) => {
    revokeInvite(rec.token);
    window.showToast?.(`Invite to ${rec.email} revoked`, "warning");
  };
  const handleSimulateClick = (rec) => {
    navigate({ screen: "browsePool", presetAppId: app.id, inviteToken: rec.token, from: "appStore" });
  };

  return (
    <window.Card padding={0}
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <window.Ico name="send" size={14} /> Invite history
      </span>}
      hint={<span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span className="mono num">{records.length}</span> total
        {records.length > 0 && <>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          {counts.active > 0  && <Counter color="var(--color-success-500)" n={counts.active} label="active" />}
          {counts.used > 0    && <Counter color="var(--color-info-500)"    n={counts.used}    label="used" />}
          {counts.expired > 0 && <Counter color="var(--color-text-tertiary)" n={counts.expired} label="expired" />}
        </>}
      </span>}
      action={<window.Button size="sm" icon="send" onClick={onInviteAgain}>Push to ISO</window.Button>}>

      {records.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 12.5 }}>
          No invites sent yet. Push this version to an ISO with the button above.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "var(--color-bg-3)", textAlign: "left" }}>
              {["Recipient", "Status", "Sent", "Expires", "Token", ""].map((h, i) => (
                <th key={i} className="overline" style={{
                  padding: "8px 12px", fontSize: 10,
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => <InviteRow key={r.token} rec={r}
              onCopy={() => handleCopy(inviteUrl(r.token))}
              onRevoke={() => handleRevoke(r)}
              onOpen={() => handleSimulateClick(r)}
              last={i === records.length - 1} />)}
          </tbody>
        </table>
      )}
    </window.Card>
  );
}

function Counter({ color, n, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <span className="mono num">{n}</span>
      <span style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
    </span>
  );
}

function InviteRow({ rec, onCopy, onRevoke, onOpen, last }) {
  const meta = {
    active:  { label: "Active",  tone: "success" },
    used:    { label: "Used",    tone: "info"    },
    expired: { label: "Expired", tone: "neutral" },
  }[rec.status] || { label: rec.status, tone: "neutral" };

  return (
    <tr style={{
      borderTop: "1px solid var(--color-border-subtle)",
      background: rec.status === "expired" ? "var(--color-bg-3)" : "transparent",
      opacity: rec.status === "expired" ? 0.7 : 1,
    }}>
      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--color-bg-3)", color: "var(--color-text-secondary)",
            display: "grid", placeItems: "center",
            fontSize: 10, fontWeight: 600, flexShrink: 0,
            border: "1px solid var(--color-border-subtle)",
          }}>{(rec.email || "?").slice(0, 1).toUpperCase()}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{rec.email}</span>
        </div>
        {rec.status === "used" && rec.usedBy && (
          <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 3, marginLeft: 32 }}>
            Subscribed by <span className="mono">{rec.usedBy}</span>
          </div>
        )}
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
        <window.Pill tone={meta.tone} size="sm" dot>{meta.label}</window.Pill>
        {rec.status === "used" && rec.usedAt && (
          <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 3 }}>
            <span className="mono">{fmtDate(rec.usedAt)}</span>
          </div>
        )}
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "top", color: "var(--color-text-secondary)" }}>
        <div className="mono" style={{ fontSize: 11.5 }}>{fmtDate(rec.createdAt)}</div>
        <div style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 1 }}>{relDays(rec.createdAt)}</div>
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "top", color: "var(--color-text-secondary)" }}>
        <div className="mono" style={{ fontSize: 11.5 }}>{fmtDate(rec.expiresAt)}</div>
        <div style={{ fontSize: 10.5,
          color: rec.status === "active" && rec.expiresAt - nowEpoch() < 86400000 * 5
            ? "var(--color-warning-700)" : "var(--color-text-tertiary)",
          marginTop: 1 }}>
          {rec.status === "active" ? relDays(rec.expiresAt) : "—"}
        </div>
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
        <span className="mono" style={{
          fontSize: 10.5, padding: "2px 6px", borderRadius: 3,
          background: "var(--color-bg-3)", color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}>{rec.token.slice(0, 12)}…</span>
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "top", textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 4 }}>
          {rec.status === "active" && (
            <>
              <window.Button size="sm" ghost icon="copy"   onClick={onCopy}   title="Copy link" />
              <window.Button size="sm" ghost icon="bolt"   onClick={onOpen}   title="Open as invitee">Preview</window.Button>
              <window.Button size="sm" ghost icon="x"      onClick={onRevoke} title="Revoke" />
            </>
          )}
          {rec.status !== "active" && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

window.InviteIsoModal     = InviteIsoModal;
window.InviteHistoryCard  = InviteHistoryCard;
