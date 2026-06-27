# Models 数据模型目录

本目录收录各功能模块的数据模型定义（表结构、字段、约束）。每新增一个模型文档，请在下表追加一条记录。

## 模型清单

| 模块 | 文件 | 描述 |
| --- | --- | --- |
| Devices 设备 | [`devices.md`](./devices.md) | 设备及相关数据模型：型号(DEVICE MODEL)、设备(DEVICE)、设备应用密钥、虚拟设备及应用参数(支付/费率/小费/小票等配置)、参数模板与历史、证书颁发者、设备信息/扩展/电池/统计、设备事件等。 |
| Users 用户 | [`users.md`](./users.md) | 用户域模型：USER(登录账号，状态 ACTIVE/LOCKED/DELETE，DELETE 为软删除终态)、MFA INFO(TOTP)、ENTITY USER RELATIONSHIP(实体⇄用户绑定与授权)、OPERATOR INVITE(操作员邀请)。 |
