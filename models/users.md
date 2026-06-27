# Users 用户 — 数据模型

用户域的数据模型：所有可登录的人（平台员工 + 客户操作员）及其登录安全、实体绑定、邀请。一个人一行 `USER`，同一个人通过多条 `ENTITY USER RELATIONSHIP` 绑定到多个实体（公司）。真源在 `data-tables.jsx`（`SEED_USERS` / `SEED_MFA_INFO` / `SEED_ENTITY_USER_RELATIONSHIPS` / `SEED_OPERATOR_INVITES`）。

> 字段 / 枚举 / 约束以本文件为准；与代码现状或历史口头约定冲突时，以此为准。

## USER（用户）

每个可登录的人一行；平台员工与客户操作员同表，差别仅在通过哪条 `ENTITY USER RELATIONSHIP` 绑到哪个实体。

- `id` — 主键。
- `username` — 登录名。注册时设定，**之后不可改**。
- `passwordHash` — 口令散列（mock 中为占位串，字段保留以对齐生产形状）。
- `passwordChangedTimestamp` — 最近一次改密时间；与 `PASSWORD_POLICY.expiryDays` 一起算口令是否过期。
- `passwordErrorTimes` — 连续登录失败次数；达到 `PASSWORD_POLICY.maxErrorTimes` 触发自动锁定。
- `passwordErrorLockExpiredTimestamp` — 自动锁定的解锁时间；`null` 表示未因失败被锁。
- `nickname` — 显示名（UI 里的 displayName）。
- `email` — 邮箱。onboarding 时校验，**之后不可改**。
- `country` — 国家 / 地区代码。注册时设定，**之后不可改**。
- `mfaEnable` — 是否启用 MFA（true 时另有一条 MFA INFO）。
- `status` — 账号状态，枚举见下。
- `lastLoginAt` — 最近登录时间；`null` 表示从未登录。
- `passwordHistory` — 最近若干条历史口令记录（条数上限 `PASSWORD_POLICY.historySize`，默认 5），用于禁止复用。每条含 `id` / `changedTimestamp` / `cretimeTimestamp`。
- `remark` — 内部备注，仅平台管理员可见。

### status 枚举

- `ACTIVE` — 正常，可登录。
- `LOCKED` — 被锁定（连续登录失败自动锁，或管理员手动锁）。**可恢复**：自动解锁到期或管理员解锁后回到 `ACTIVE`。
- `DELETE` — 管理员删除（软删除）。**终态**：拒绝登录、**不可再启用**；数据行保留以维持审计与关系引用的可追溯，平台 Users 列表**不显示**该用户。

> 无 `PENDING` 态：未消费的邀请只存在于 `OPERATOR INVITE`，不是 USER 的状态。（平台 Users UI 里看到的 “PENDING” 行是邀请态的展示，不是 `USER.status`。）

### 约束

- `username` / `email` / `country` 一旦在注册 / onboarding 阶段确定即不可修改；平台后台只可改 `remark` 与角色绑定。
- `status` 流转：`ACTIVE ⇄ LOCKED`；`ACTIVE | LOCKED → DELETE`（单向终态，不可回到 `ACTIVE` / `LOCKED`）。
- 软删除护栏：**不能删除自己**（当前登录用户），**不能删除根管理员** `u-1`。
- `DELETE` 行不参与列表 / 筛选 / 计数展示，但保留在数据中（审计、`ENTITY USER RELATIONSHIP.authorizingUserId`、邀请人等引用不悬空）。
- `passwordHistory` 条数不超过 `PASSWORD_POLICY.historySize`；其中任一历史口令不可被复用。
- 遗留：个别客户操作员种子仍带历史 `DISABLED` 值，属当前平台 Users 工作范围之外，待迁移；新逻辑只认 `ACTIVE / LOCKED / DELETE`。

## MFA INFO（多因子认证信息）

仅 `mfaEnable = true` 的用户有一行，一对一。

- `id` — 主键。
- `userId` — 指向 USER。
- `mfaType` — 类型，当前为 `TOTP`。
- `secretEncrypted` — 加密后的 TOTP 密钥。
- `failTimes` — MFA 校验连续失败次数。
- `lastFailTimestamp` — 最近一次失败时间；`null` 表示无。
- `status` — 字符串枚举 `ENABLED` / `PENDING`。`ENABLED` = 已激活并验证过；`PENDING` = 密钥已生成、等待首次验证通过。（旧的整型 0/1/2 编码与 `DISABLE` 态已废弃——未启用 MFA 的用户直接没有该行。）

### 约束

- 无 MFA 的用户**没有** MFA INFO 行（不是 `DISABLE` 状态）。
- 一个用户至多一行 MFA INFO。

## ENTITY USER RELATIONSHIP（实体 ⇄ 用户绑定）

用户与实体的多对多关系，并承载该实体内的授权方式与角色绑定。

- `id` — 主键。
- `entityId` — 实体（公司）。
- `userId` — 用户。
- `authorizingType` — `ADMIN`（在该实体内拥有全部权限，绕过角色检查）或 `NORMAL`（权限由 `roleIds` 解析）。
- `roleIds` — 角色绑定，仅 `authorizingType = NORMAL` 时有意义。
- `authorizingTimestamp` — 关系创建时间。
- `authorizingUserId` — 创建者（指向某个 USER）。
- `authorizingUserName` — 创建者显示名（冗余存储，便于展示）。
- `status` — `ACTIVE` / `LOCKED`。
- `authorizingFrom` — 授权生效起始；`null` = 无起始限制。
- `authorizingTo` — 授权生效截止；`null` = 无截止限制。

### 约束

- 无 `EXPIRED` 状态：授权窗口是否过期由 `authorizingTo` 实时派生，不单独存。
- 无 `PENDING` 状态：未消费邀请在 `OPERATOR INVITE` 表，消费后才落 `ENTITY USER RELATIONSHIP`。
- 一个用户可有多条关系（绑多个实体）。

## OPERATOR INVITE（操作员邀请）

外发的邀请（未消费或已消费均留档）。

- `id` — 主键。
- `inviterUserId` — 邀请发起人（USER）。
- `inviteEmail` — 受邀邮箱。
- `token` — 邀请令牌。
- `expiresAt` — 过期时间（`createdAt + PASSWORD_POLICY.inviteTokenDays`，默认 7 天）。
- `status` — 枚举 `PENDING` / `CONSUMED` / `EXPIRED`。
- `consumedAt` — 被接受的时间；`null` = 未消费。
- `resendCount` — 重发次数。

mock UI 扩展字段（非正式模型）：`entityId` / `inviterEntityId` / `inviterUserName` / `inviteRoleIds` / `inviteAuthType`（`ADMIN` 首位管理员 | `NORMAL`）/ `inviteMethod`（`email` | `link`）/ `createdAt`。

### 约束

- 已消费的邀请（`consumedAt != null`）保留以供审计，不删除。
- outstanding（未消费）派生：未过期且 `consumedAt = null`。

## 关联指针

- 角色（`ROLE`）定义、权限合并：见 Roles 相关模型 / `SEED_ROLES`。
- 实体（`ENTITY`）与合同：见 customers 行为层与实体模型。
- 删除 / 锁定 / 邀请等**行为规则**：本文件只定义字段与约束；具体怎么动见 `flows/`（如新增 `flows/users.md`）。
