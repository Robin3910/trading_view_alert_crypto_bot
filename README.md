# 币安合约交易API服务

这是一个基于Express的REST API服务，用于对接币安合约交易所的各项功能。

## 主要功能

### 1. 基础功能
- IP白名单过滤
- 多API Key管理和切换
- 服务器状态检查 (`/ping`, `/time`)
- 精度自动计算和处理

### 2. 账户管理
- 获取账户信息 (`/account`)
- 切换持仓模式 (`/changepositiondual`)
- 查询持仓信息 (`/positiondual`)
- 获取交易对信息 (`/exchangeInfo`)

### 3. 交易功能

#### 3.1 基础交易接口 (`/message`)
- 支持多种交易行为：
  - 买入/卖出
  - 平仓
  - 插针挂单
- 特性：
  - 支持市价单和限价单
  - 自动处理仓位检查
  - 支持止盈止损单自动挂单
  - 支持金字塔式建仓

示例请求:
```json
{
    "action": "buy/sell/close/pin",
    "symbol": "BTCUSDT",
    "quantity": "0.1",
    "price": 57.26,
    "slAndTp": "0",  // 是否开启止盈止损
    "multiOrder": "0" // 是否允许同向多单
}
```

#### 3.2 双MACD策略接口 (`/doublemacd`)
- 支持大小周期MACD策略
- 自动处理仓位管理
- 支持止损设置
- 方向记录与追踪

示例请求:
```json
{
    "action": "buy/sell/close",
    "symbol": "BTCUSDT",
    "quantity": "0.1",
    "price": 57.26,
    "sl": "0",
    "macd_type": "big/small"
}
```

#### 3.3 TradingView策略接口 (`/order`)
- 支持TradingView信号直接对接
- 支持全仓位管理
- 自动处理止盈止损

### 4. 订单管理
- 订单取消 (`/cancel`)
- 自动清理无效订单
- 持仓监控和管理

## 安全特性
- IP白名单控制
- 多API密钥管理
- 错误处理和日志记录
- 异常通知（支持Server酱推送）

## 部署说明

### 环境要求
- Node.js
- PM2 (推荐)

### 配置文件
需要在`config/config.js`中配置以下信息：
- API密钥列表
- IP白名单
- 基础URL
- 止盈止损参数

### 运行
```bash
# 直接运行
node server.js

# 使用PM2运行
pm2 start server.js

# 使用监控脚本运行
bash process_monitor.sh
```

## 错误处理
- 所有API调用都有完整的错误处理
- 异常情况会通过Server酱推送到手机
- 详细的日志记录

## 注意事项
- 请确保API密钥具有足够的权限
- 建议在正式环境使用前进行充分测试
- 注意风险控制，合理设置止盈止损