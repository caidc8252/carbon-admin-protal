# HeaderKpis — 设备详情头部 KPI 图标簇（逻辑 + 样式提炼）

设备详情页标题栏右上角的状态图标簇：**连接状态 → 信号 → 电量**一行，下面一行是**最后签到时间戳**。
对应你点的 `App › FleetGate › DeviceDetailScreen › HeaderKpis`（`"67% Updated 5/12/2026 … · 1 min ago"`）。

---

## 1. 输入

```ts
device = {
  status: "active" | "locked" | "pending",
  lastSeenAt: string,          // 相对时间串: "just now" | "5 min ago" | "2 hours ago" | "never"
  battery?: { level: number }, // 0–100；缺省 = 市电供电
  network: {
    wifi:     { enabled: bool, ssid },
    sim:      { enabled: bool, carrier },
    ethernet: { enabled: bool },
  },
  sn: string,                  // 仅用于派生 demo telemetry 的种子
}
```

## 2. 派生逻辑

### 2.1 在线判定 `online`
设备在**最近 15 分钟内**签到则为在线，否则离线。`pending` 永远离线。
```
online =
  status !== "pending" &&
  lastSeenAt 解析:
    "just now"        → true
    "<n> sec ago"     → true
    "<n> min ago"     → n <= 15
    hour/day/week/…   → false
    "never"/空        → false
```

### 2.2 当前网络通道 `channel`
按优先级取**已启用**的接口（以太 > Wi-Fi > 蜂窝）：
```
channel =
  ethernet.enabled ? "Ethernet"
  : wifi.enabled   ? "WIFI"
  : sim.enabled    ? "Cellular"
  : "Offline"
```
- 以太网 → 端口图标，**不显示信号强度**。
- Wi-Fi / 蜂窝 → 显示信号格（弧线 / 竖条）。
- Offline → 灰色蜂窝竖条（0 格）。

### 2.3 信号格 `bars`（0–4）
从当前无线接口的 RSSI(dBm) 映射：
```
rssi = isWifi ? wifi.signalDbm : isCell ? cellular.signalDbm : null
bars =
  rssi == null ? 0
  : rssi > -60 ? 4
  : rssi > -70 ? 3
  : rssi > -80 ? 2
  :              1
```
> 演示数据里 Wi-Fi RSSI ≈ −42…−80 dBm，蜂窝 ≈ −68…−100 dBm（按 `sn` 种子稳定生成）。接真实数据时直接喂 dBm 即可。

### 2.4 颜色阈值
| 元素 | 规则 |
|---|---|
| **连接** | online → `--color-success-700`；否则 `--fg3`（图标用断链） |
| **信号** | 离线 → `--border-2`（灰）；`bars > 2` → `--color-success-700`；`bars === 2` → `--color-warning-700`；否则 `--color-error-700`。离线时强制按 0 格渲染 |
| **以太** | online → `--fg2`；离线 → `--border-2` |
| **电量** | 离线 → `--fg3`；`level < 20` → `--color-error-700`；`level < 40` → `--color-warning-700`；否则 `--fg1` |
| **市电** | 无 `battery` → 显示闪电图标，`--fg3` |

### 2.5 时间戳
- `pending` 或解析失败 → `"Never reported"`。
- 否则：把相对串换算成绝对时间（参考“现在” = `2026-05-12T14:30:00`），格式 `M/D/YYYY h:mm:ss`，再额外附原始相对串。
  - 渲染：`Updated <绝对时间(前16字符)> · <相对串>`，例如 `Updated 5/12/2026 2:29:0 · 1 min ago`。
- 绝对时间用等宽字体（`--font-mono`，`mono` class）。

---

## 3. 布局与样式

外层：右对齐两行纵向堆叠。
```
容器: marginLeft:auto; flex:none; display:flex; flex-direction:column;
      align-items:flex-end; gap:9px

第一行(图标行): display:flex; align-items:center; gap:18px
  每个 item:   display:inline-flex; align-items:center; gap:7px; color:--fg1
  电量数字:    fontSize:14; fontWeight:600; font-family:--font-mono;
               font-variant-numeric:tabular-nums

第二行(时间):  display:flex; align-items:center; gap:5px; fontSize:11;
               color:--fg3; text-align:right; justify-content:flex-end;
               flex-wrap:wrap   （前置 12×12 时钟图标）
```

### 用到的 token（可自行替换为本项目变量）
`--fg1 / --fg2 / --fg3`（前景三级灰阶）、`--border-2`（禁用/灰）、
`--color-success-700`、`--color-warning-700`、`--color-error-700`、`--font-mono`。

---

## 4. 图标（24×24，stroke 1.6，round cap/join，`stroke="currentColor"`）

颜色由父级 `color` 决定（信号格/电量条内部按格数填充 `currentColor` 或 `--border-2`）。

```jsx
const KpiSVG = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 22} height={props.size || 22}
    fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round">{props.children}</svg>
);

// 已连接 / 断链
const LinkIco = () => <KpiSVG><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-11.64-1.5A4 4 0 0 0 6.5 19z"/><path d="M9.5 13.5 11 15l3.5-3.5"/></KpiSVG>;
const LinkBrokenIco = () => <KpiSVG><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97 6 6 0 0 0-9.2-3.3"/><path d="M6.6 8.2A4.9 4.9 0 0 0 5 9.5 4 4 0 0 0 6.5 19h8"/><path d="M3 3l18 18"/></KpiSVG>;

// 以太网端口
const EthernetIco = () => <KpiSVG><rect x="3" y="9" width="18" height="10" rx="2"/><path d="M7 9V6h10v3M9 19v2M15 19v2"/></KpiSVG>;

// 市电（闪电）
const BoltIco = () => <KpiSVG><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></KpiSVG>;

// 时间戳前的小时钟（12×12, stroke 1.7）
const ClockMiniIco = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l2.5 1.5"/></svg>;

// Wi-Fi 弧线（bars 0–4：3 段弧 + 圆点，逐段点亮）
function WifiArcs({ bars, grey }) {
  const on = (n) => (grey || bars < n) ? "var(--border-2)" : "currentColor";
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 8.5a16 16 0 0 1 20 0"   stroke={on(3)}/>
      <path d="M5 12a11 11 0 0 1 14 0"     stroke={on(2)}/>
      <path d="M8.5 15.5a6 6 0 0 1 7 0"    stroke={on(1)}/>
      <circle cx="12" cy="19" r="1.1" fill={bars >= 1 && !grey ? "currentColor" : "var(--border-2)"} stroke="none"/>
    </svg>
  );
}

// 蜂窝竖条（4 根递增高度，按 bars 点亮）
function CellBars({ bars, grey }) {
  const heights = [6, 10, 14, 18];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      {heights.map((h, i) => (
        <rect key={i} x={3 + i * 5} y={21 - h} width="3.4" height={h} rx="1"
          fill={!grey && bars >= i + 1 ? "currentColor" : "var(--border-2)"}/>
      ))}
    </svg>
  );
}

// 电量（外框 + 填充宽度随 level 变化）
function BatteryIco({ level, color }) {
  const w = Math.max(2, Math.round(level / 100 * 13));   // 填充宽度 2–13
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7.5" width="17" height="10" rx="2.2"/>
      <path d="M21.5 11v3"/>
      <rect x="4" y="9.5" width={w} height="6" rx="0.8" fill={color} stroke="none"/>
    </svg>
  );
}
```

---

## 5. 组装（精简版）

```jsx
function HeaderKpis({ device }) {
  const isPending = device.status === "pending";
  const online    = !isPending && deviceIsOnline(device);
  const tel       = deviceTelemetryFor(device);
  const channel   = tel.network.type;
  const isWifi = channel === "WIFI", isCell = channel === "Cellular", isEth = channel === "Ethernet";

  const rssi = isWifi ? tel.network.wifi.signalDbm : isCell ? tel.network.cellular.signalDbm : null;
  const bars = rssi == null ? 0 : rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;
  const sigColor = !online ? "var(--border-2)"
                 : bars > 2 ? "var(--color-success-700)"
                 : bars === 2 ? "var(--color-warning-700)"
                 : "var(--color-error-700)";

  const GREY = "var(--border-2)";
  const item = { display: "inline-flex", alignItems: "center", gap: 7, color: "var(--fg1)" };
  const ts = lastSeenTimestamp(device.lastSeenAt);

  return (
    <div style={{ marginLeft: "auto", flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* 连接 */}
        <span style={{ ...item, color: online ? "var(--color-success-700)" : "var(--fg3)" }}
          title={online ? "Connected" : isPending ? "Never connected" : "Disconnected"}>
          {online ? <LinkIco/> : <LinkBrokenIco/>}
        </span>
        {/* 信号 */}
        {isEth ? (
          <span style={{ ...item, color: online ? "var(--fg2)" : GREY }} title="Ethernet"><EthernetIco/></span>
        ) : (isWifi || isCell) ? (
          <span style={{ ...item, color: sigColor }} title={`${isWifi ? "Wi-Fi" : "Cellular"} signal`}>
            {isWifi ? <WifiArcs bars={online ? bars : 0} grey={!online}/> : <CellBars bars={online ? bars : 0} grey={!online}/>}
          </span>
        ) : (
          <span style={{ ...item, color: GREY }} title="No network"><CellBars bars={0} grey/></span>
        )}
        {/* 电量 / 市电 */}
        {device.battery ? (
          <span style={{ ...item, color: kpiBatteryColor(device.battery.level, online) }} title={`Battery ${device.battery.level}%`}>
            <BatteryIco level={device.battery.level} color={kpiBatteryColor(device.battery.level, online)}/>
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{device.battery.level}%</span>
          </span>
        ) : (
          <span style={{ ...item, color: "var(--fg3)" }} title="Line-powered"><BoltIco/></span>
        )}
      </div>
      {/* 最后签到 */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg3)", textAlign: "right", justifyContent: "flex-end", flexWrap: "wrap" }}>
        <ClockMiniIco/>
        {isPending || !ts
          ? <span>Never reported</span>
          : <span>Updated <span className="mono">{ts.slice(0, 16)}</span> · {device.lastSeenAt}</span>}
      </div>
    </div>
  );
}

function kpiBatteryColor(level, online) {
  if (!online)     return "var(--fg3)";
  if (level < 20)  return "var(--color-error-700)";
  if (level < 40)  return "var(--color-warning-700)";
  return "var(--fg1)";
}
```

---

## 6. 移植清单
1. **token**：把 `--fg1/2/3`、`--border-2`、`--color-{success,warning,error}-700`、`--font-mono` 映射到目标项目的变量（或换成具体色值）。
2. **依赖函数**：`deviceIsOnline`（15 分钟阈值）、`lastSeenTimestamp`（相对→绝对时间，可换成你项目的时间格式化）、`deviceTelemetryFor`（**仅 demo 用**，真实项目里直接传入 `channel` 与 `signalDbm`，可删）。
3. **真实接入**：去掉 `deviceTelemetryFor`，直接喂当前通道类型 + RSSI(dBm) + 电量百分比 + `lastSeenAt`。其余阈值/颜色/图标原样可用。
