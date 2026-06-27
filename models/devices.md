# 设备及相关的数据模型
- 厂家也是通过实体 + 契约方式来实现的
- 设备处理的几种逻辑：
    - 设备激活：
        - 完成与PARTY的绑定关系
        - 完成与门店的绑定关系
    - 设备划拨，因为销售/业务关系，可以将设备销售给另一个实体，这时就需要用到划拨。划拨完后设备的所有者关系就会发生变化
    - 设备委托，将设备委托给另一方进行运营，但所有者不发生变化，被委托方会拥有一定限度的管理权限

## DEVICE MODEL
- DEVICE MODEL ID, PRIMARY
- MODEL CODE, UNIQUE
- OS, ANDROID | LINUX | RTOS
- LOGO URL, Array<JSON>
    - size: 140 | 70 | 55 | 35, 单位 px, 全部用正方形
    - URL, String
- ATTRIBUTES, JSONB(Array<JSON>), 型号属性，是可以根据需要动态配置的
- DESCRIPTION

**约束**
- ATTRIBUTES, 系统默认写死一些属性及对应的可选参数，操作员可以根据不同的型号自己决定要添加哪些属性并选择对应的值。可选属性及可选值如下：
    - OS VERSION, String[]
        - 可选值：Options("Android 10", "Android 12", "Android 14", "Android 16")
    - SECOND-SCREEN[]
        - 可选值：Options("4-inch", "6-inch", "8-inch", "10-inch", "11-inch", "12-inch", 其它手输)
    - CELLULAR, Boolean
    - WiFi, Boolean
    - STORAGE, String[], Options
        - 8G
        - 16G
        - 32G
        - 64G

## DEVICE
- DEVICE ID, PRIMARY
- DEVICE SN, UNIQUE
- DEVICE PN
- MODEL CODE
- PARTY ID，实际设备拥有者主体信息
- CERT CN, 设备上预装的支付证书的CN，由终端上送，以此来识别设备的真实归属。
- OS, String, 操作系统, ENUM("ANDROID", "LINUX", "RTOS")
- OS VERSION, 操作系统版本, 格式：ANDROID 14
- FIRMWARE VERSION, 固件版本
- HARDWARE ID: 内部用的，用来标识设备特性的，与MODE CODE结合，用来区分OTA版本树的
- HARDWARE CODE：硬件配置码
- RUN MODE, String, 运行模式, ENUM("UNATTENDED", "ATTENDED")
- DEVELOP MODE(0-关闭，1-开启)
- ROOT MODE(0-关闭，1-开启)
- PCI VERSION, PIC版本: PCI6 | PCI7
- CLIENT CERT, JSONB, 设备通讯证书，用于双向认证使用
    - CN
    - PUBLICH KEY
    - SHA1
    - EXPIRED DATE
    - ISSUER CN
    - ISSUER PUBLICK KEY
    - ISSUER SHA1
- LAST SEEN AT
- ACTIVE TIMESTAMP, 激活时间
- SECRET KEY, JSONB(Array<JSON>), 
    - keyType, String, Options
        - AES, 数据传输过程用于敏感信息保护的密钥
        - TOTP, 授权使用
        - RSA， 公钥，用于设备验签
    - secret
    - creTime, timestamp
- OPT,用于脱机验证码的计算
- STATUS, String, ENUM("ACTIVE", "LOCKED", "INVENTORY")

**约束**
- PARTY ID: 注意，这里指的是拥有US-ISO 或 US-ISO-PILOT 契约的公司，如果要表达这台设备归属哪个商户，将会从 DEVICE->STORE->MERCHANT 这样的关系上来获取
- CLIENT CERT, TOMS CLIENT 用于与服务端通信用的证书
- CLIENT CERT, 对应的CERT文件要存在物理磁盘上，遵守以下规则：
    {basePath}/client-cert/{devSn}/{devSn}-{expired-date}.crt

## DEVICE APPLICATION SECRET, 设备上应用的密钥集
- DEVICE APPLICATION SECRET ID, UUID, PRIMARY
- DEVICE SN, String, REQUIRED
- PKG NAME, String, REQUIRED
- SECRETS, JSONB(Array<JSON>)
    - secret
    - keyType, String, options
        - AES, 数据传输过程用于敏感信息保护的密钥
        - TOTP, 授权使用
        - COMMUNICATION PUBLIC KEY


## VIRTUAL DEVICE, 虚拟设备
- VIRTUAL DEVICE ID, UUID, PRIMARY
- DEVICE SN, UNIQUE, 允许为空
- SAMPLE DEVICE FLAG, boolean, 是否样机标记

## VIRTUAL DEVICE APPLICATION, 应用参数
- VIRTUAL DEVICE APPLICATION ID, UUID, PRIMARY
- VIRTUAL DEVICE ID, UUID
- STORE ID, 可以为空；
- PKG NAME, String, REQUIRED
- APP VERSION ID
- VERSION CODE, INT, 冗余字段
- VERSION NAME, String, 冗余字段
- RUN MODE, JSONB
    - CONFIG TIMESTAMP, TIMESTAMP, 配置时间
    - IS UNINSTALLABLE, boolean, 是否可卸载
        - NULL, 未设置，终端不做任何改变
        - TRUE/FALSE，终端需要执行设置
    - IS AUTO START ON BOOT, boolean, 是否开机自启
        - NULL, 未设置，终端不做任何改变
        - TRUE/FALSE，终端需要执行设置
    - IS KIOSK MODE, boolean,是否霸屏模式
        - NULL, 未设置，终端不做任何改变
        - TRUE/FALSE，终端需要执行设置
    - IS APP LAUNCH DISABLED, boolean, 是否不可启动
        - NULL, 未设置，终端不做任何改变
        - TRUE/FALSE，终端需要执行设置
    - IS LAUNCHER ICON HIDDEN, boolean, 是否桌面不可见
        - NULL, 未设置，终端不做任何改变
        - TRUE/FALSE，终端需要执行设置
- UPGRADE STRATEGY, JSONB
    - UPGRADE STRATEGY:
        - CASUAL, 有空升级（不急，在设备空闲的时候升级，不影响商户使用）
        - IMEEDIATE, 立即升级（紧急，需要立即升级设备）
        - CUSTOM
    - NETWORK REQUEST: NO RESTRICTION / WiFi or Ethernet only / WiFi or Ethernet or Callular under cap
    - UPGRADE TIME：IMMEDIATE / ON THE NEXT BOOT / NEXT BOOT OR AFTER 10 MIN IDLE / SC
    - CALLULAR CAP, number
    - INSTALL WINDOWS: Array<JSON>, 不允许跨24点    
        - START：02:00 
        - END：04:00
- PARAMETER PAYLOAD, JSONB
- PARAMETER MD5
- PARAMETER STRUCTURE VERSION, INT, 数据结构版本号
- PARAMETER REQUEST MIN VERSION CODE, INT, 参数对应用版本的最低要求，允许为空，表示没有要求。
- PARAMETER REQUEST MAX VERSION CODE, INT, 参数对应用版本的最高要求，允许为空，表示没有要求。
- STATUS, String, ENUM("PENDING DOWNLOAD", "DOWNLOADING", "DOWNLOAD SUCCESSFUL", "DOWNLOAD FAILED", "UPDATE SUCCESSFUL", "UPDATE FAILED", "WAITING SETTLEMENT", "REFUSED")
- STATUS TIMESTAMP

**约束**
- UNIQUE("PKG NAME", "VIRTUAL DEVICE ID")
- 一台虚拟设备如果被标记为 样机时(VIRTUAL DEFICE.SAMPLE DEVICE FLAG = true),不允许绑定到门店
    - 当是样机时，STORE ID = NULL
    - 当非样机时，STORE ID 不能为空
- 当 PKG NAME = "com.newland.payexplorer"时, PARAMETER PAYLOAD
    - PROCESSORS, JSONB, 
    - PAYMENT FUNCS, JSONB, 功能开关
        - paymentMethod, JSON
            - credit, boolean, 是否受理credit卡, default true
            - debit, boolean, 是否受理debit卡, default true
            - cash, boolean, 是否受理 cash 卡, default true
            - ebt, boolean, 是否受理 ebt 卡, default true
        - passwordProtection, JSONB, 标记以下交易是否需要Manager的密码授权
            - void, boolean, 撤销交易, default true
            - refund, boolean, 退货交易, default true
            - tipAdjustment, boolean, 小费调整交易, default false
            - ebt, boolean, ebt交易, default false
            - cash, boolean, 现金交易, default false
            - transactions, boolean, 查看流水, default false
            - batchClose, boolean, 批结算, default false
            - reports, boolean, 查看报表, default true
            - settings, boolean, 设置, default true
        - batchClose, JSONB,
            - closeMode, String, ENUM("Manual", "Auto")
            - TRIGGER TIME, 触发时间, 只到分钟, 24小时制，默认："02:00". 当closeMode=AUTO时生效
            - summaryReport, boolean, default true
            - detailedReport, boolean, default false
    - SIGNATURE, JSONB
        - signatureMethod, String, ENUM({label: "Auto(CVM)", code: "AUTO-CVM"}, {label: "Force", code: "FORCE"})
        - eSignature, boolean, default false
    - OPERATOR, JSONB, 终端的操作员
        - loginMode, String, ENUM("PIN Only", "Clerk without PIN", "Clerk with PIN"), 操作员登录模式, 默认："PIN Only"
    - TAX FEE, JSONB
        - enabled, boolean, default true
        - enableRemoveTax, boolean, default true
        - cashWithTax, boolean, default true
        - authWithTax, boolean, default true
        - taxes, Array<JSON>, 允许操作员增删改
            - enabled, boolean
            - taxCode, String, 3位数字，从001开始自增
            - percent, double, 保留小数点后3位, 单位%
            - taxName, String
    - FEES, JSONB
        - enabled, boolean, default true
        - presentToCustomer, Boolean, 是否展示给客户
        - amountConfirmation, Boolean, 金额确认
        - feeType, String, ENUM("Surcharge", "Dual Pricing", "Cash Discount"), 费用类型, 默认："Dual Pricing"
        - surcharge, JSON
            - enabled, boolean
            - includeTax, boolean
            - includeTip, boolean
            - surchargeRate, double, 保留小数点后3位, 单位%
        - dualPricing, JSON
            - enabled, boolean
            - includeTax, boolean
            - includeTip, boolean
            - cashDiscountRate, double, 保留小数点后3位, 单位%
            - printSavingsLabel, String, 举例："You could have saved with Cash"
            - showDualPrompt, boolean
            - cardRate, double, 保留小数点后3位, 单位 %
            - dualPromptText, String, 举例："CASH DISCOUNT"
            - printDualPricing, boolean, 单位 $
            - entryPriceType, ENUM("CASH_PRICE", "CARD_PRICE")
        - cashDiscount, JSON
            - enabled, boolean
            - includeTax, boolean
            - includeTip, boolean
            - discountRate, double, 保留小数点后3位, 单位 %
    - CUSTOM FEES, JSONB(Array<JSON>)
        - enabled, boolean, default true
        - includeTax, boolean, default true
        - includeTip, boolean, default true
        - feeList, Array<JSON>, 允许操作员增删改
            - enabled, boolean
            - feeName, String
            - feeRate, double, 保留小数点后3位, 单位 %
    - TIP FEE, JSONB
        - enabled, boolean, default true
        - calculationMode, String, ENUM("Percentage", "FlatAmount")
        - tipAmtountOptions, Array<Double>, 操作员可以增删改，保留小数点后3位, 当 calculationMode = "FlatAmount" 时生效, 单位 $
        - tipPercentOptions, Array<Double>, 操作员可以增删改，保留小数点后3位，当 calculationMode = "Percentage" 时生效, 单位 %
            - 15.0
            - 18.0
            - 20.0 
            - 30.0
        - limits, JSON
            - maxAmountByPercentage, double, default 350.0, 单位 %
            - maxTipAmount, double, default 350.0, 单位 $
        - tipShowOpt, JSON
            - tipSuggestionOnReceipt, boolean ,default true
            - tipLineOnReceipt, boolean, default true
            - tipOnScreen, boolean, default true
    - TERMINAL, JSONB
        - logo, JSON
            - enabled, boolean, default true
            - content, String, "{BASE64(LOGO FILE)}"
    - TRANSACTION, JSONB
        - maxAmountOfRefund,  最大退款金额，小数点后2位, DEFAULT 10000.0
        - fallbackEnable, boolean, default true
        - splitPayment, boolean, default true
        - inputOperatorEnable, boolean, 是否需要输入操作员, default true
        - pinBypass, String, ENUM("MANUAL", "AUTO", "DISABLE")
        - pinDebit, JSON
            - enabled, boolean
            - cashbackEnabled, boolean, 反现开关
    - RECEIPT, JSON
        - addStoreName, boolean, default true
        - addAddress, boolean, default true
        - addStorePhone, boolean, default true
        - header, Array<String>, 操作员可以增删改, default ["Line 1", "Line 2", "Line 3"]
        - footer, Array<String>, 操作员可以增删改, default ["Line 1", "Line 2", "Line 3"]
        - disclaimer, JSON
            - enabled, boolean, default true
            - content, String, default "Cardholder acknowledges receipt of goods and obligations set forth by the cardholder's agreement with issuer"
    - PRINT OPT, JSONB
        - enabled, boolean, default true
        - receiptForTipAdjust, String, ENUM("Confirm before print", "Auto Print", "No Print"), default "Confirm before print"
        - merchantReceiptOptions, String, ENUM("Confirm before print", "Auto Print", "No Print"), default "Confirm before print"
        - customerReceiptOptions, String, ENUM("Confirm before print", "Auto Print", "No Print"), default "Confirm before print"
    - TROUBLESHOOTING, JSONB
        - enabled, boolean, default true
        - issueCategories, String, default "[\"Unable to transact\",\"Transaction failed\",\"Printing issue\",\"Network issue\",\"Surcharge issue\"]"
        - phone, String
        - merchantNote, String
        - email, String
- TAX.TAXES 初始数据：
    [
        {
            "enabled": "true",
            "taxCode": "001",
            "percent": "4",
            "taxName": "state"
        },
        {
            "enabled": "true",
            "taxCode": "002",
            "percent": "3",
            "taxName": "city"
        }
    ]
- CUSTOM FEE.feeList 初始数据：
    [
        {
            "feeName": "custom fee",
            "feeRate": "4",
            "enabled": "false"
        },
        {
            "feeName": "custom fee",
            "feeRate": "4",
            "enabled": "false"
        }
    ]

## APPLICATION PARAMETER TEMPLATE, 配置模板(仅用于新建时填充默认值)
- APPLICATION PARAMETER TEMPLATE ID, PRIMARY
- PARTY ID, INT, 模板归属PARTY
- BELONG TO TYPE, String, ENUM("PARTY", "MERCHANT")
- TEMPLATE NAME, String
- PKG NAME, String, REQUIRED, 模板针对哪个 APP
- PARAMETER STRUCTURE VERSION
- PARAMETER, JSONB，结构 = PAYMENT CONFIG 的行为配置部分(PAYMENT FUNCS / SIGNATURE / OPERATOR / TAX FEE / FEES / CUSTOM FEE / TIP FEE / TERMINAL / TRANSACTION / RECEIPT / PRINT OPT / TROUBLESHOOTING)

**约束**
- UNIQUE(PARTNER ID + TEMPLATE NAME)
- 在代码里硬编码应用参数结构的版本号与应用版本的约束：
    - 数据结构如下：
        - PKG NAME, REQUIRED
        - PARAMETER STRUCTURE VERSION, REQUIRED
        - PKG VERSION CODE MIN, 允许为空，表示不限制
        - PKG VERSION CODE MAX, 允许为空，表示不限制
    - 允许没有登记PARAMETER STRUCTURE VERSION，找不到代表没有限制

## APPLICATION PARAMETER HISTORY, 设备参数更新历史记录
- APPLICATION PARAMETER HISTORY ID, UUID, PRIMARY
- APPLICATION PARAMETER ID, UUID, REQUIRED
- PKG NAME, REQUIRED
- DEVICE SN, REQUIRED
- PARAMETER MD5, REQUIRED
- EVENT TYPE, String, ENUM("START DOWNLOAD", "DOWNLOAD SUCCESSFUL", "DOWNLOAD FAILED", "UPDATE SUCCESSFUL", "UPDATE FAILED", "WAITING SETTLEMENT", "REFUSED")
- PARAMETER PAYLOAD, JSONB
- EVENT TIMESTAMP, REQUIRED
- ERROR DESC, JSONB
    - MESSAGE, 对失败交易的补充说明
    - CODE, 失败交易的错误码


## ISSUER CERT 终端证书颁发者证书,存储签发终端证书的颁发者证书信息
- ISSUER CERT ID, 颁发者证书ID(主键,自增)
- ISSUER DN, 颁发者DN
- FINGERPRINT, 指纹(唯一)
- ISSUER CERT PEM, PEM 证书

## DEVICE INFO
- DEVICE INFO ID
- DEVICE SN
- DEVICE MODEL, 索引
- PARTY ID, 实际设备拥有者主体信息,索引：单列索引
- OS
- OS VERSION
- FIRMWARE VERSION
- BOOT TIMESTAMP, 开机时间戳
- CURRENT TIMESTAMP, 当前时间戳
- DEVICE TIMEZONE
- SYNC TIMESTAMP, 同步 INSTALLED APPS 信息的时间
- LANG
- STORAGE Capacity, JSON, 存储信息
    - TOTAL
    - USED
    - BASE, 换算单位
- MEMORY INFO, JSON
    - TOTAL, 单位 byte
    - USED, 单位 byte
- PRINTER STATUS, 打印机状态（0：正常|2：缺纸|4：过热|8：打印机忙|112：电压异常|1024：温度低|2048：轴不在位或仓门未关闭）
- NETWORK TYPE, 当前网络类型（0:以太网|2:2G|3:3G|4:4G|5:5G|1:WiFi|99:其他），独立列
- USAGE COUNTERS
    - TOTAL UP TIME, 历史累计开机时长
    - CONTACT CARD READ COUNT, 插卡次数
    - CONTACTLESS CARD READ COUNT, 挥卡次数
    - MAG STRIPE CARD READ COUNT, 刷卡次数
    - POWER CYCLE COUNT, 开关机次数
    - POWER BUTTON PRESS COUNT, 开关机键按键次数
    - USB PLUG COUNT, USB插拔次数
    - FRONT CAMERA OPEN COUNT, 前置摄像头打开次数
    - REAR CAMERA OPEN COUNT, 后置摄像头打开次数
    - FLASH COUNT, 刷机次数
    - TOTAL PRINT LENGTH,打印长度（毫米）
- LOCATION, JSONB
    - GPS SWITCH, 0|1
    - LOCATION PROVIDER, 高通|HERE|GOOGLE
    - GPS, JSONB
        - LATITUDE, NUMERIC(10, 7)
        - LONGITUDE, NUMERIC(10, 7)
    - NEARBY CELL LIST, Array<JSON>
        - CELL ID, 基站编号
        - LAC, 区域码
        - MCC, 移动国家代码
        - MNC, 移动网络号码
        - SIGNAL STRENGTH, 信号强度值
    - NEARBY WIFI, Array<JSON>
        - MAC
        - SIGNAL STRENGTH
- SAVED WIFI, Array<JSON>
    - NAME
    - SIGNAL STRENGTH
    - MAC
- SIM SLOTS, Array<JSON>, 双卡槽信息，GIN 索引支持 IMEI 精确查询
    - SLOT INDEX, 卡槽编号（0|1）
    - SLOT STATUS, 卡槽状态（EMPTY|ACTIVE|INACTIVE|LOCKED|ERROR|UNKNOWN）
    - ICCID, SIM卡唯一标识
    - IMEI, 设备IMEI，GIN 索引
    - IMSI, 运营商id
    - RSSI, 信号强度
    - IP ADDRESS, 蜂窝网络IP地址

## DEVICE INSTALLED APPLICATION, 设备已安装的应用列表
- DEVICE ISNTALLED APPLICATION ID, UUID, PRIMARY
- DEVICE SN, REQUIRED
- PKG NAME, String
- APP NAME, String
- VERSION CODE, Int
- VERSION NAME, String
- INSTALLATION TIMESTAMP
- IS UNINSTALLABLE, 是否可卸载
    - NULL, 未设置
    - TRUE/FALSE
- IS AUTO START ON BOOT, 是否开机自启
    - NULL, 未设置
    - TRUE/FALSE
- IS KIOSK MODE, 是否霸屏模式
    - NULL, 未设置
    - TRUE/FALSE
- IS APP LAUNCH DISABLED, 是否不可启动
    - NULL, 未设置
    - TRUE/FALSE
- IS LAUNCHER ICON HIDDEN, 是否桌面不可见
    - NULL, 未设置
    - TRUE/FALSE

**约束**
- UNIQUE("DEVICE SN", "PKG NAME")    

## DEVICE EXTEND
- DEVICE EXTEND ID
- DEVICE SN
- LOCK STATUS, 终端锁定状态（ON|OFF），独立列，索引列
- DEVICE PN
- MANUFACTURER, 厂家
- HARDWARE ID, 硬件识别码
- HARDWARE CONFIG CODE, 硬件配置码
- SYSTEM SETTING, JSON, 系统配置（不含 SYSTEM CONFIGURATION）
    - SCREEN, JSON
        - SLEEP TIME, 屏幕长时间不操作休眠时间（毫秒）
        - SCREEN BRIGHTNESS, 主屏幕亮度
        - SECONDARY SCREEN BRIGHTNESS, 副屏亮度
    - MEDIA, JSON
        - MEDIA VOLUME, 当前媒体音量（默认值：10）
        - RING VOLUME, 当前铃声音量（默认值：6）
        - MAX MEDIA VOLUME, 媒体音量最大值（默认值：15）
        - MAX RING VOLUME, 铃声音量最大值（默认值：7）
    - TIME, JSON
        - AUTO TIME ZONE SWITCH, 自动时区开关（0：开启|1：关闭）
        - AUTO TIME SWITCH, 自动时间开关（0：开启|1：关闭）
    - SYSTEM CONFIGURATION, JSON, 系统配置，服务端下发时有值，否则为空
        - SYSTEM PROPERTY, Array<JSON>
            - KEY, 参数名
            - VALUE, 参数值
        - SYSTEM SETTINGS, Array<JSON>
            - KEY, 参数名
            - VALUE, 参数值
- SECURITY SETTING, JSON
    - MAG CARD SWITCH, 刷卡开关（0：禁用|1：启用）
    - IC CARD SWITCH, 插卡开关（0：禁用|1：启用）
    - RF CARD SWITCH, 挥卡开关（0：禁用|1：启用）
    - PRINT SWITCH, 打印机开关（0：禁用|1：启用）
- NETWORK, JSON
    - CURRENT NETWORK CHANNEL, 以太网，蜂窝网络+类型，WiFi，其他
    - WIFI, JSON
        - SWITCH, 0-关|1-开
        - CONNECTED WIFI SSID, 连接的Wi-Fi名称
        - LINK SPEED, 链路速率
        - IP ADDRESS
        - SECURITY TYPE, 加密类型
        - CAPABILITIES, 安全能力集合
    - CELLULAR, JSON
        - SWITCH
        - IP ADDRESS
    - BLUETOOTH, JSON
        - SWITCH
    - ETHERNET, JSON
        - SWITCH
        - IP ADDRESS
        - MASK
    - APN, JSON
        - NAME, 当前网络APN的name（无配置时，为空）
        - APN, 当前网络APN的apn（无配置时，为空）
        - MNC, 当前网络APN的mnc（无配置时，为空）
        - MCC, 当前网络APN的mcc（无配置时，为空）
        - TYPE, 当前网络APN的Type（无配置时，为空）
        - PROXY, 代理（无配置时，为空）
        - PORT, 端口（无配置时，为空）
        - USERNAME, 用户名（无配置时，为空）
        - PASSWORD, 密码（无配置时，为空）
        - SERVER, 服务器（无配置时，为空）
        - MMSC, 多媒体信息服务中心地址（无配置时，为空）
        - MMS PROXY, 彩信代理（无配置时，为空）
        - MMS PORT, 彩信代理端口（无配置时，为空）
        - AUTH TYPE, 身份验证类型（无配置时，为空）
        - PROTOCOL, apn协议（无配置时，为空）
        - ROAMING PROTOCOL, apn漫游协议（无配置时，为空）
        - BEARER, 承载系统（无配置时，为空）
        - MVNO TYPE, 虚拟运营商类型（无配置时，为空）
        - MVNO MATCH DATA, 虚拟运营商值（无配置时，为空）
- SYSTEM SECURITY, JSON, 系统安全
    - HARDWARE ATTACK COUNT, 硬件安全攻击次数
    - SOFTWARE ATTACK COUNT, 软件安全攻击次数
    - IS ROOTED, root状态（0:未ROOT|1:ROOT）
    - TAMPER STATUS, JSON, 安全触发状态
        - STATUS, 状态
        - REASON, Array<String>
- SYSTEM STATUS, JSON
    - STATUS BAR SWITCH, 当前状态栏是否可下拉（0：开启|1：关闭）
    - USB HOST SWITCH, USB HOST开关状态（0：开启|1：关闭）
    - HOTSPOT MENU SWITCH, 热点菜单开关状态（0：开启|1：关闭）
    - UNATTENDED MODE ENABLED, 是否启用无人值守模式（0：否|1：是）
    - IS DEVELOPMENT DEVICE, 是否开发机（0：用户机|1：开发机）
    - SYSTEM PARAMETERS, Array<JSON>, 服务端下发时有值，否则为空
        - KEY, 参数名
        - VALUE, 参数值
- BATTERY PROTECTION INFO, JSON
    - ENABLED, 是否打开电池保护（0：开启|1：关闭）
    - MAX, 充电最大上限，电量达到该值时停止充电（0~100）
    - MIN, 充电最低容量，电量低于该值时开始充电
    - GREEN MAX, 绿色电池状态充电最大上限
    - GREEN MIN, 绿色电池状态充电最低容量
    - RED MAX, 红色电池状态充电最大上限
    - RED MIN, 红色电池状态充电最低容量
    - YELLOW MAX, 黄色电池状态充电最大上限
    - YELLOW MIN, 黄色电池状态充电最低容量
- VERSION INFO,JSON
    - FIRMWARE ID, 固件识别码 
    - USER VERSION, 用户版本（固件版本分支） 
    - FINANCE APP, 金融模块的应用版本（安全模块） 
    - FINANCE FIRMWARE, 金融模块的固件版本 
    - FINANCE BOOT, 金融模块的BOOT版本 
    - SIGNATURE LIBRARY VERSION, 验签库版本号 
    - BSP VERSION, BSP版本号 
    - PAYMENT MODULE VERSION, 支付模块版本号 
    - BASEBAND VERSION, 基带版本号 
- CREATE TIMESTAMP
- UPDATE TIMESTAMP

## BATTERY INFO
- BATTERY ID
- DEVICE SN
- PARTY ID，实际设备拥有者主体信息,索引：单列索引
- DEVICE MODEL

- VOLTAGE, 电池电压
- BATTERY SN, 电池序列号
- IS CONTINUE ONLINE, 是否持续充电（1：持续充电|0：未持续充电）
- IS NEVER SLEEP, 设备是否设为永不休眠（1：永不休眠|0：不是永不休眠）
- CYCLE COUNT, 电池充放电循环次数
- START DATE, 电池开始使用时间（格式：YYYY-MM-DD）
- USE DAYS, 电池使用时长（单位：天）
- TEMPERATURE, 环境温度
- INTERNAL RESISTANCE, 电池内阻
- RECHARGING LEVEL, 复充档次
- HEALTH STATUS, 电池健康状态（Android原生的电池健康状态值及新大陆固件自定义的状态值）
- RED YELLOW REASON, 异常原因
- TELEMETRY ,JSONB, 实时遥测，高频更新
    - STATUS, Android原生的充放电状态（2：充电中未充满|5：充电中已充满|其他：不在充电）
    - IS CHARGING, 设备是否正在充电（1：充电中|0：不在充电）
- ALARM CONFIG JSONB 报警阈值配置，低频，服务端下发）
    - RECHARGING LEVEL PARAM, 复充档次对应的电量上限配置
    - WARNING INTERNAL RESISTANCE PARAM, 电池内阻异常报警参数
    - WARNING CHARGING TIME PARAM, 充电时间异常报警参数
    - YELLOW CYCLE COUNT, 电池寿命循环次数黄色警报限制
    - RED CYCLE COUNT, 电池寿命循环次数红色警报限制
    - OVER VOLTAGE LIMIT, 电池过压报警限制
    - SECURITY LEVEL, 电池安全等级
    - PRINTER DETECT DELAY, 打印温度采集时间间隔（单位：分钟）
    - PRINTER COOL DOWN, 打印头温度下降等待时间（单位：分钟）
    - BATTERY CHARGING TIME LIMIT, 持续充电限制时间（单位：小时）
    - YELLOW WARNING ON, 黄色警报弹窗开关（1：开启弹窗|0：关闭弹窗）
    - RED WARNING ON, 红色警报弹窗开关（1：开启弹窗|0：关闭弹窗）
    - PRODUCTION AGE THRESHOLD, 带内置EEPROM的电池出厂使用时间报警参数（时间格式 yy,yy）
    - USE AGE THRESHOLD, 带内置EEPROM的电池使用时间报警参数（时间格式：yy,yy）
- PROTECTION UPPER LIMIT, 电保护上限（充电容量）
- PROTECTION LOWER LIMIT, 充电保护下限（复充容量）
- IS PROTECTION ENABLED, 充电保护是否开启（1：开启|0：未开启）
- BATTERY OPERATION COUNTS, 充电总次数
- BATTERY STATUS, 电量状态（0：电量值小于等于25|1：电量值小于等于50|2：电量值小于等于75|3：电量值小于等于100）
- BATTERY AVAILABLE, 电量值
- BATTERY VERIFIED STATE, 设备是否支持电池加密（1：支持|0：不支持）
- BATTERY HEALTH, 电池健康度（计算公式：(100 - cycle Count ✖ 0.035) + 1，算出来的值向下取整，超过100时取值100）
- BATTERY PRODUCTION DATE, 电池生产日期（格式：YYWW，YY为年份后2位数，WW为该年份的第几周，如2332表示2023年第32周）
- BATTERY QUALITY, 电池是否是正品（1：正品|0：非正品）
- SCREEN POWER SAVE ENABLED, 是否开启长时间未操作屏幕调暗亮度（1：开启|0：关闭）
- NEVER SLEEP SCREEN DIM CONFIG, 多长时间未操作屏幕调暗亮度（单位：秒）
- REPLACE MODE, 电池更换模式（0：简易模式|1：输入SN|2：一键更换重置电池状态）
- ONE KEY REPLACE NUM, 电池一键更换次数
- MAX DISCHARGE VOL, 满充亮屏最大放电电压（单位mV）
- LOW TEMP CHARGING TIME, 低温容量小充电时间（单位分钟）
- HIGH TEMP CHARGING TIME, 高温容量小充电时间（单位分钟）
- LAST FIVE RESISTANCE, 高低温内阻参数值
- CHARGING METHOD, 充电方式（1：适配器|2：USB|4：无线|其他：未充电）
- VOLT ERR PARAM, 压差大异常报警参数
- HEALTH RESERVE1, A10电池健康预留区域
- HEALTH RESERVE2, A10电池健康预留区域
- HEALTH RESERVE3, A10电池健康预留区域
- BATTERY FACTORY START TIME, 电池出厂时间（时间格式 yyyy-MM-dd）
- VOLTAGE NOW, 电池真实电压
- BATTERY REAL LEVEL, 电池驱动电量
- OVER CURR LIMIT, 电池过压报警限制（单位mAh）


- FULL BATTERY LIFE TIME, 电池满电续航时间（单位毫秒）
- ADAPTER DETECT TIMESTAMP, 完成适配器检测的时间点的时间戳
- ADAPTER DETECT STATE, 适配器状态（detecting：检测中|normal：功率正常|underload：功率较低）
- ADAPTER DETECT CHARGE TIME, 此次检测到的充电时长（单位分钟，当没有测出值时，字段值为-1）
- CREATE TIMESTAMP
- UPDATE TIMESTAMP

## DEVICE APPLICATION STATISTIC, 终端应用使用信息
- DEVICE APP STATISTIC ID
- DEVICE SN
- PARTY ID，实际设备拥有者主体信息,索引：单列索引
- DEVICE MODEL
- COLLECTION DATE
- PKG NAME
- APP NAME
- WIFI RX BYTES, 下行流量
- WIFI TX BYTES, 上行流量
- WIFI TOTAL BYTES,总流量
- MOBILE RX BYTES,下行流量
- MOBILE TX BYTES,上行流量
- MOBILE TOTAL BYTES,总流量
- ETHERNET RX BYTES,下行流量
- ETHERNET TX BYTES,上行流量
- ETHERNET TOTAL BYTES,总流量
- FOREGROUND DURATION, 应用使用时长（秒）
- CREATE TIMESTAMP

## DEVICE STATISTIC 终端使用信息
- DEVICE STATISTIC ID
- DEVICE SN
- PARTY ID，实际设备拥有者主体信息,索引：单列索引
- DEVICE MODEL
- COLLECTION DATE，采集日期
- CONTACT CARD READ COUNT, 插卡次数
- CONTACTLESS CARD READ COUNT, 挥卡次数
- MAG STRIPE CARD READ COUNT, 刷卡次数
- PRINTER LENGTH，打印长度（毫米）
- UP TIME,开机时长
- WIFI RX BYTES, 下行流量
- WIFI TX BYTES, 上行流量
- WIFI TOTAL BYTES,总流量
- MOBILE RX BYTES,下行流量
- MOBILE TX BYTES,上行流量
- MOBILE TOTAL BYTES,总流量
- ETHERNET RX BYTES,下行流量
- ETHERNET TX BYTES,上行流量
- ETHERNET TOTAL BYTES,总流量
- FOREGROUND DURATION, 应用使用时长（秒）
- CREATE TIMESTAMP
- LOCATION, JSONB(Array<JSON>)
     - SDK,类型（Qualcomm）
     - SUCCESS COUNT,成功次数
     - FAIL COUNT, 失败次数

## STORAGE INFO HISTORY 存储模块历史信息，每次变更存储模块都新增一条记录
- STORAGE INFO HISTORY ID,
- DEVICE SN,
- MANU NAME, 厂家名称
- MANU ID, 厂家ID
- FW VERSION, 版本号
- LIFE TIME, 寿命
- CREATE TIMESTAMP

## DEVICE EVENT 设备事件
- DEVICE EVENT ID
- DEVICE SN
- EVENT TYPE, 事件类型, ENUM(应用开始下载, 应用下载成功, 应用下载失败, 应用安装失败, 应用安装成功, 用户取消升级, 用户确定升级, 应用卸载成功，应用不存无法删除)
- PKG NAME, 应用包名 或 OTA代表固件更新
- VERSION NAME
- EVENT TIME 事件发生时间
- EVENT DURATION 事件持续时间（秒）
- DESCRIPTION 事件描述
- TARGET1 (事件如果是应用，填写包名，固件填OTA)
- TARGET2 (TYPE为跟应用相关时，存储应用名)
- TARGET3 (TYPE为跟应用或固件相关时，存储版本号)
