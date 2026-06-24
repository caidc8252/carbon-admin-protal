/* global React, Icon, Btn, Input, Field, Textarea, Modal, useToast, relTime, CONTRACT_INFO,
   RolesPanel, SEED_ROLES */
const { useState: useStateAR } = React;

// =====================================================================
// Platform Roles (admin-roles.jsx)
// Manages the roles bound to the ADMIN contract — i.e. the Carbon platform
// itself. These are the roles assignable to Carbon staff (see Users).
// =====================================================================
const AdminRoles = ({ users = [] }) => {
  const [roles, setRoles] = useStateAR(SEED_ROLES);

  // Show only ADMIN-contract global roles
  const visibleRoles = roles.filter(r => r.contractDefineCode === 'ADMIN' && r.roleType === 'global');

  return (
    <div className="page" data-screen-label="Roles">
      <div className="page__head">
        <div>
          <h1 className="page__title">Roles</h1>
          <p className="page__sub">
            Carbon platform roles — assignable only to Carbon staff (see <strong>System → Users</strong>).
            <span className="muted"> All roles here are bound to the <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>ADMIN</code> contract.</span>
          </p>
        </div>
      </div>

      <div className="stack" style={{ gap: 14 }}>
        <div className="notice role-scope-note">
          <Icon name="shield" size={14}/>
          <div>
            <strong>Internal scope.</strong> These roles are not visible to customer operators.
            They govern access to the Carbon admin platform itself — managing other staff users,
            platform-wide notifications, API keys, and global audit.
          </div>
        </div>

        <RolesPanel
          roles={visibleRoles}
          allRoles={roles}
          setRoles={setRoles}
          activeContract="ADMIN"
          fixedContract="ADMIN"
          hideContractField={true}
          hideSystemTag={true}
          users={users}
          showAssignedUsers={true}
        />
      </div>
    </div>
  );
};

window.AdminRoles = AdminRoles;
