# Trading View Alert Crypto Bot

基于 TradingView 信号自动在 Binance 交易的机器人。

## 功能特点

- 接收 TradingView 的警报信号
- 自动在 Binance 执行加密货币交易
- 支持多种交易策略
- 实时监控交易状态
- 自动风险管理

## 安装要求

- Python 3.8+
- Binance API 密钥
- TradingView 账户

## 快速开始

1. 克隆仓库
```bash
git clone https://github.com/your-username/trading_view_alert_crypto_bot.git
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 Binance API 密钥
```

## 配置说明

1. Binance API 配置
- 在 Binance 创建 API 密钥
- 将 API 密钥和密钥填入配置文件

2. TradingView 警报设置
- 在 TradingView 创建策略
- 设置警报消息格式
- 配置 Webhook URL

## 使用方法

1. 启动机器人

```bash
python main.py
```

可以使用nohup让机器人保持后台运行
```bash
nohup python main.py &
```

2. 监控日志

```bash
tail -f logs/trading.log
```

## 安全提示

- 请勿分享你的 API 密钥
- 建议先使用测试网进行测试
- 设置合理的交易限额
- 定期检查交易记录

## 贡献指南

欢迎提交 Pull Request 或创建 Issue。

## 许可证

MIT License

## 免责声明

本项目仅供学习和研究使用，作者不对使用本项目导致的任何损失负责。交易加密货币具有高风险，请谨慎使用。