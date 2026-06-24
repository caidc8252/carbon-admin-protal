/* global React */
// ─────────────────────────────────────────────────────────────
// Merchant Contracts tab — MERCHANT + MERCHANT_PORTAL cards plus the
// PORTAL-gated Operators sub-section.
//
// Implementation status (per product spec for this iteration):
//
//   ✅ MERCHANT contract           — fully implemented. Carries the
//                                    "is the merchant active?" switch;
//                                    flipping it disables the merchant.
//   ⏳ MERCHANT_PORTAL contract     — UI mocked. Bind / renew / unbind
//                                    flows write to the in-memory merchant
//                                    record so the rest of the UI reacts,
//                                    but no backend wiring beyond that.
//                                    Every interaction shows a MOCK badge
//                                    and the actions toast "TODO: not yet
//                                    wired".
//   ⏳ Operators sub-section        — same: list + invite + per-row actions
//                                    are fully mocked. Visible only when
//                                    the merchant has a PORTAL contract.
//
// TODO when wiring for real:
//   · MERCHANT_PORTAL contracts should sync to billing + portal access
//     control. Expiration enforcement happens server-side.
//   · Operator invites send an email; registered-via "invite" vs "admin"
//     reflects who triggered the registration.
//   · Operator actions (reset password, lock, grant/revoke admin) all
//     audit-log to a per-merchant trail and notify the operator by email.
//   · Email privacy: the unmask toggle should also audit-log when used.
// ─────────────────────────────────────────────────────────────

const { useState: useStateMC, useMemo: useMemoMC } = React;

// ─── Top-level tab content ────────────────────────────────
function MerchantContractsTab({ merchant, onRequestToggleDisable }) {
  window.useMerchantTick?.();
  const portal = window.getMerchantContract?.(merchant, "MERCHANT_PORTAL");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1280, margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Contracts</h2>
        <p className="body-sm" style={{ margin: "2px 0 0", color: "var(--fg3)", fontSize: 12 }}>
          MERCHANT is the base contract — required for any merchant to receive
          changes. MERCHANT_PORTAL unlocks the self-service operator portal.
        </p>
      </div>

      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <MerchantBaseContractCard
          merchant={merchant}
          onToggle={onRequestToggleDisable} />
        <PortalContractCard merchant={merchant} />
      </div>

      {portal && (
        <OperatorsSection merchant={merchant} />
      )}
    </div>
  );
}

// ─── MERCHANT contract card (implemented) ─────────────────
function MerchantBaseContractCard({ merchant, onToggle }) {
  const c = window.getMerchantContract?.(merchant, "MERCHANT");
  const def = window.getContractDef?.("MERCHANT") || { name: "MERCHANT", description: "" };
  const disabled = c?.status === "disabled";
  return (
    <ContractCard
      title={def.name}
      subtitle={def.description}
      statusBadge={
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "1px 8px", borderRadius: 999,
          background: disabled ? "var(--bg3)" : "var(--success-bg, oklch(96% 0.05 158))",
          color:      disabled ? "var(--fg3)" : "var(--success, oklch(42% 0.13 158))",
          border: "1px solid var(--color-border-subtle)",
          fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
          {disabled ? "Disabled" : "Active"}
        </span>
      }>
      <KV label="Granted"  value={c?.grantedAt || "—"} />
      <KV label="Operator" value={c?.operator  || "—"} />
      <KV label="Expires"  value="No expiry" />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <window.Button danger={!disabled} primary={disabled}
          icon={disabled ? "check" : "lock"} onClick={onToggle}>
          {disabled ? "Re-enable merchant" : "Disable merchant"}
        </window.Button>
        <span style={{ fontSize: 11, color: "var(--fg3)" }}>
          {disabled
            ? "Re-enabling restores maintenance access."
            : "Disabling pauses all maintenance. Terminals keep transacting."}
        </span>
      </div>
    </ContractCard>
  );
}

// ─── MERCHANT_PORTAL contract card (mock — add / remove only) ─
// Iteration spec change: the contract is a boolean — either bound or not.
// No expiry, no renewal. Binding is one click; unbinding goes through
// the usual destructive confirm.
function PortalContractCard({ merchant }) {
  const c = window.getMerchantContract?.(merchant, "MERCHANT_PORTAL");
  const def = window.getContractDef?.("MERCHANT_PORTAL") || { name: "MERCHANT_PORTAL", description: "" };
  const [unbindOpen, setUnbindOpen] = useStateMC(false);

  const onAdd = () => {
    const grantedAt = new Date().toLocaleDateString("en-US",
      { month: "short", day: "2-digit", year: "numeric" });
    merchant.contracts = [
      ...(merchant.contracts || []),
      { type: "MERCHANT_PORTAL", grantedAt, expiresAt: null, status: "active",
        operator: window.currentOperatorName?.() || "M. Hassan" },
    ];
    merchant.updatedAt = "just now";
    window.bumpMerchants?.();
    window.showToast?.(`Portal contract bound · TODO: not yet wired to backend`, "warning");
  };

  return (
    <>
      <ContractCard
        title={def.name}
        subtitle={def.description}
        mockBadge
        statusBadge={
          c ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "1px 8px", borderRadius: 999,
              background: "var(--accent-soft, oklch(94% 0.04 262))",
              color: "var(--accent, oklch(40% 0.14 262))",
              border: "1px solid var(--color-border-subtle)",
              fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              Bound
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "1px 8px", borderRadius: 999,
              background: "var(--bg3)", color: "var(--fg3)",
              border: "1px solid var(--color-border-default)",
              fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            }}>Not bound</span>
          )
        }>
        <KV label="Granted"  value={c?.grantedAt || "—"} />
        <KV label="Operator" value={c?.operator  || "—"} />

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {!c && (
            <window.Button primary icon="plus" onClick={onAdd}>
              Add MERCHANT_PORTAL
            </window.Button>
          )}
          {c && (
            <window.Button danger icon="trash" onClick={() => setUnbindOpen(true)}>
              Remove MERCHANT_PORTAL
            </window.Button>
          )}
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>
            {c
              ? "Removing revokes self-service portal access. Operator accounts stay on file."
              : "Adds the self-service portal. Operators can be invited from this page once bound."}
          </span>
        </div>
      </ContractCard>

      {unbindOpen && c && (
        <window.ConfirmDialog
          open
          title="Remove MERCHANT_PORTAL?"
          body={`Removing the contract revokes self-service portal access for ${merchant.name}. Existing operator accounts remain on file but can no longer sign in until the contract is re-added.`}
          confirmLabel="Remove contract"
          tone="danger"
          onCancel={() => setUnbindOpen(false)}
          onConfirm={() => {
            merchant.contracts = (merchant.contracts || []).filter(x => x.type !== "MERCHANT_PORTAL");
            merchant.updatedAt = "just now";
            window.bumpMerchants?.();
            setUnbindOpen(false);
            window.showToast?.(`Portal contract removed · TODO: not yet wired to backend`, "warning");
          }} />
      )}
    </>
  );
}

// ─── Operators section (mock — gated on PORTAL contract) ──
function OperatorsSection({ merchant }) {
  window.useMerchantTick?.();
  const [inviteOpen, setInviteOpen] = useStateMC(false);
  const [revealedFor, setRevealedFor] = useStateMC({}); // operatorId → bool
  const [menuOpenFor, setMenuOpenFor] = useStateMC(null);
  const ops = merchant.operators || [];

  // ─── Filters ──
  const [q,            setQ]            = useStateMC("");
  const [statusFilter, setStatusFilter] = useStateMC("any");      // any | active | pending | locked
  const [roleFilter,   setRoleFilter]   = useStateMC("any");      // any | admin | operator
  const [methodFilter, setMethodFilter] = useStateMC(new Set());  // multi: invite | admin

  const filteredOps = useMemoMC(() => ops.filter(o => {
    if (statusFilter !== "any" && o.status !== statusFilter) return false;
    if (roleFilter === "admin"    && !o.isAdmin) return false;
    if (roleFilter === "operator" &&  o.isAdmin) return false;
    if (methodFilter.size > 0 && !methodFilter.has(o.registeredVia || "admin")) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!`${o.name} ${o.email}`.toLowerCase().includes(n)) return false;
    }
    return true;
  }), [ops, q, statusFilter, roleFilter, methodFilter]);

  const moreActiveCountO =
    (roleFilter   !== "any" ? 1 : 0) +
    (methodFilter.size > 0    ? 1 : 0);
  const resetMoreO = () => { setRoleFilter("any"); setMethodFilter(new Set()); };

  const opager = window.usePaginated(filteredOps, 10,
    `op|${merchant.id}|${q}|${statusFilter}|${roleFilter}|${[...methodFilter].sort().join(",")}`);

  const fireMockAction = (operator, action) => {
    setMenuOpenFor(null);
    window.showToast?.(`${action} for ${operator.name} · TODO: not yet wired`, "warning");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Operators</h2>
        <MockBadge />
        <div style={{ flex: 1 }} />
        <window.Button primary icon="plus" onClick={() => setInviteOpen(true)}>Invite operator</window.Button>
      </div>
      <p className="body-sm" style={{ margin: 0, color: "var(--fg3)", fontSize: 12 }}>
        People authorised to sign in to the self-service portal for {merchant.name}. ADMIN operators can manage other operators on the merchant side.
      </p>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-1)" }}>
        {ops.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            padding: "10px 14px", borderBottom: "1px solid var(--border-1)",
            background: "var(--bg2)",
          }}>
            <window.Input size="sm" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / email"
              prefix={<window.Ico name="search" size={12} />}
              style={{ width: 220 }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
              padding: "6px 10px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-default)", fontSize: 12,
              fontFamily: "inherit", height: 30,
              background: "var(--bg2)", color: "var(--fg1)",
            }}>
              <option value="any">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="locked">Locked</option>
            </select>
            <div style={{ marginLeft: "auto" }}>
            <window.MoreFilters activeCount={moreActiveCountO} onClear={resetMoreO} width={260}>
              <window.MoreFiltersSection label="Role">
                <window.FilterChipGroup
                  value={roleFilter} onChange={(v) => setRoleFilter(v || "any")}
                  options={[
                    { value: "any",      label: "Any" },
                    { value: "admin",    label: "ADMIN" },
                    { value: "operator", label: "Operator" },
                  ]} />
              </window.MoreFiltersSection>
              <window.MoreFiltersSection label="Registered via">
                <window.FilterChipGroup multi
                  value={methodFilter} onChange={setMethodFilter}
                  options={[
                    { value: "invite", label: "Invite link" },
                    { value: "admin",  label: "Admin-created" },
                  ]} />
              </window.MoreFiltersSection>
            </window.MoreFilters>
            </div>
          </div>
        )}
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg3)", textAlign: "left" }}>
                {["Operator", "Email", "Registered", "Status", "Method", "Role", ""].map((h, i) => (
                  <th key={i} className="overline" style={{
                    padding: "10px 14px", fontSize: 10.5,
                    borderBottom: "1px solid var(--border-1)",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ops.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                  No operators yet. Invite one to enable portal sign-in.
                </td></tr>
              )}
              {ops.length > 0 && filteredOps.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)", fontSize: 12 }}>
                  No operators match those filters.
                </td></tr>
              )}
              {opager.slice.map(o => {
                const revealed = !!revealedFor[o.id];
                const lockedOrPending = o.status !== "active";
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500,
                        textDecoration: lockedOrPending ? "none" : "none",
                        color: lockedOrPending ? "var(--fg3)" : "var(--fg1)" }}>
                        {o.name}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>
                          {revealed ? o.email : window.maskEmail?.(o.email)}
                        </span>
                        <button onClick={() => setRevealedFor(s => ({ ...s, [o.id]: !s[o.id] }))}
                          title={revealed ? "Hide email" : "Show full email"}
                          style={{ color: "var(--fg3)", padding: "2px 6px",
                            fontSize: 10.5, border: "1px solid var(--border-1)",
                            borderRadius: "var(--radius-sm)", lineHeight: 1.4,
                            background: "var(--bg2)" }}>
                          {revealed ? "Hide" : "Show"}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--fg3)", fontSize: 12 }}>
                      {o.registeredAt || "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <OperatorStatusPill status={o.status} />
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--fg2)", fontSize: 12,
                      textTransform: "capitalize" }}>
                      {o.registeredVia || "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {o.isAdmin
                        ? <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "1px 8px", borderRadius: 999,
                            background: "var(--accent-soft, oklch(94% 0.04 262))",
                            color: "var(--accent, oklch(40% 0.14 262))",
                            border: "1px solid var(--color-border-subtle)",
                            fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
                            textTransform: "uppercase",
                          }}>ADMIN</span>
                        : <span style={{ fontSize: 12, color: "var(--fg3)" }}>Operator</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <OperatorRowMenu
                        open={menuOpenFor === o.id}
                        onToggle={() => setMenuOpenFor(menuOpenFor === o.id ? null : o.id)}
                        onClose={() => setMenuOpenFor(null)}
                        actions={[
                          { label: "Reset password",
                            onClick: () => fireMockAction(o, "Reset password sent") },
                          o.status === "locked"
                            ? { label: "Unlock", onClick: () => fireMockAction(o, "Unlocked") }
                            : { label: "Lock",   onClick: () => fireMockAction(o, "Locked") },
                          o.isAdmin
                            ? { label: "Revoke ADMIN", onClick: () => fireMockAction(o, "Admin revoked") }
                            : { label: "Grant ADMIN",  onClick: () => fireMockAction(o, "Granted ADMIN") },
                        ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredOps.length > 0 && (
          <window.Pagination
            page={opager.page} pageSize={opager.pageSize} total={opager.total}
            onChange={opager.setPage} onPageSizeChange={opager.setPageSize}
            pageSizes={[10, 20, 50]} />
        )}
      </div>

      {inviteOpen && (
        <InviteOperatorModal merchant={merchant} onClose={() => setInviteOpen(false)} />
      )}
    </div>
  );
}

function InviteOperatorModal({ merchant, onClose }) {
  const [name, setName] = useStateMC("");
  const [email, setEmail] = useStateMC("");
  const [isAdmin, setIsAdmin] = useStateMC(false);
  const canSave = name.trim().length > 0 && /.+@.+\..+/.test(email.trim());

  return (
    <window.Modal open onClose={onClose} width={520}
      title="Invite operator"
      subtitle={`Send a self-service portal invitation for ${merchant.name}.`}
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="email" disabled={!canSave}
            onClick={() => {
              // Mock: append a pending operator to the in-memory list so
              // the table reacts. Real invite would dispatch an email.
              const id = `op-${Date.now().toString(36)}`;
              merchant.operators = [
                ...(merchant.operators || []),
                { id, name: name.trim(), email: email.trim(),
                  registeredAt: "—", status: "pending",
                  registeredVia: "invite", isAdmin },
              ];
              merchant.updatedAt = "just now";
              window.bumpMerchants?.();
              onClose();
              window.showToast?.(`Invitation queued for ${name.trim()} · TODO: not yet wired to email`, "warning");
            }}>
            Send invitation
          </window.Button>
        </>
      }>
      <MockNotice text="Mock: appends a pending operator row. Real invite sends an email and creates an inactive account on the portal." />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <window.Field label="Name">
          <window.Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sandra Vu" />
        </window.Field>
        <window.Field label="Email">
          <window.Input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. sandra@merchant.com" />
        </window.Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          <span>Grant ADMIN permission</span>
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>
            (Admins can manage other operators inside the portal.)
          </span>
        </label>
      </div>
    </window.Modal>
  );
}

// ─── Shared atoms ─────────────────────────────────────────
function ContractCard({ title, subtitle, statusBadge, mockBadge, children }) {
  return (
    <div style={{
      padding: 16, borderRadius: "var(--radius-lg)",
      background: "var(--bg2)",
      border: "1px solid var(--border-1)",
      boxShadow: "var(--shadow-1)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 12.5, fontWeight: 600,
              letterSpacing: "0.02em", color: "var(--fg1)" }}>{title}</span>
            {mockBadge && <MockBadge />}
          </div>
          <p className="body-sm" style={{ margin: "2px 0 0", color: "var(--fg3)", fontSize: 11.5,
            lineHeight: 1.4 }}>{subtitle}</p>
        </div>
        {statusBadge}
      </div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: 12, padding: "5px 0", borderBottom: "1px dashed var(--color-border-subtle)" }}>
      <span className="overline" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--fg1)" }}>{value}</span>
    </div>
  );
}

function MockBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 6px", borderRadius: 4,
      background: "oklch(94% 0.04 60)",
      color: "oklch(38% 0.14 60)",
      border: "1px solid oklch(82% 0.10 60)",
      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>MOCK</span>
  );
}

function MockNotice({ text }) {
  return (
    <div style={{
      padding: "8px 12px", borderRadius: "var(--radius-sm)",
      background: "oklch(96% 0.03 60)",
      border: "1px solid oklch(88% 0.06 60)",
      color: "oklch(34% 0.10 60)",
      fontSize: 11.5, display: "flex", alignItems: "center", gap: 8,
    }}>
      <window.Ico name="info" size={13} />
      <span>{text}</span>
    </div>
  );
}

// ─── Per-row action menu — uses PortalDropdown so it escapes table scroll
//     ancestors and never gets clipped at the bottom of the page body. ──
function OperatorRowMenu({ open, onToggle, onClose, actions }) {
  const anchorRef = React.useRef(null);
  return (
    <>
      <button ref={anchorRef} onClick={onToggle}
        style={{ padding: "4px 8px", color: "var(--fg3)" }}>
        <window.Ico name="more" size={14} />
      </button>
      <window.PortalDropdown anchorRef={anchorRef} open={open} onClose={onClose}
        placement="bottom-end" minWidth={180}>
        <div style={{
          background: "var(--bg2)", border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-3)",
          padding: 4, textAlign: "left",
        }}>
          {actions.map((a, i) => (
            <MenuAction key={i} onClick={a.onClick}>{a.label}</MenuAction>
          ))}
        </div>
      </window.PortalDropdown>
    </>
  );
}

function MenuAction({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "8px 10px",
      borderRadius: "var(--radius-sm)", fontSize: 12.5, color: "var(--fg1)",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}

function OperatorStatusPill({ status }) {
  const config = {
    active:  { label: "Active",  bg: "var(--success-bg, oklch(96% 0.05 158))", fg: "var(--success, oklch(42% 0.13 158))" },
    pending: { label: "Pending", bg: "var(--warning-bg, oklch(96% 0.05 80))",   fg: "var(--warning, oklch(54% 0.14 80))"   },
    locked:  { label: "Locked",  bg: "var(--bg3)",                              fg: "var(--fg3)"                            },
  }[status] || { label: status, bg: "var(--bg3)", fg: "var(--fg3)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 8px", borderRadius: 999,
      background: config.bg, color: config.fg,
      border: "1px solid var(--color-border-subtle)",
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {config.label}
    </span>
  );
}

Object.assign(window, {
  MerchantContractsTab,
});
