const express = require('express');
const app = express();
const port = 3000;
const api = require('../util/api');
const config = require("../config/config");

// IP 白名单过滤中间件
const ipFilterMiddleware = (req, res, next) => {
    const clientIp = req.ip.match(/\d+\.\d+\.\d+\.\d+/);
    // console.log(clientIp);
    if (config.WHITE_IP_CONFIG.includes(clientIp[0])) { // IP 在白名单中，继续处理请求
        next();
    } else {
        // IP 不在白名单中，返回 403 Forbidden
        res.send(`403, ip: ${clientIp}`);
    }
};

app.use(ipFilterMiddleware);

app.get('/', (req, res) => {
    res.send('Hello World!')
});
app.get('/ping', async (req, res) => {
    const data = await api.ping();
    res.send(data);
});
app.get('/time', async (req, res) => {
    const data = await api.checkServerTime();
    res.send(data);
});

app.get('/account', async (req, res) => {
    const data = await api.getAccount();
    res.send(data);
});

// 合约买入接口
// action: long/short/close_buy/close_sell
// {
//     "action": "long/short/close_buy/close_sell",
//     "symbol": "BTCUSDT",
//     "quantity": "0.001",
// }
app.post('/message', async (req, res) => {
    try {
        const body = req.body;
        const params = {};
        params.symbol = body["symbol"];
        params.quantity = body["quantity"];
        params.type = 'market'; // 下单类型，可以是market或limit

        // 获取账户信息，查看当前是否有持仓
        const account = await api.getAccount();
        const curPositionList = account["positions"];
        let curPosition = 0;
        let qntStr = "";
        for (const curPositionListElement of curPositionList) {
            if (curPositionListElement["symbol"] === params.symbol) {
                curPosition = parseFloat(curPositionListElement["positionAmt"]);
                qntStr = curPositionListElement["positionAmt"]
            }
        }
        switch (body.action) {
            case "long":
                // 建多仓前先清掉之前的空仓
                if (curPosition < 0) {
                    // 先取消之前的订单
                    await api.cancelOrder({
                        symbol: params.symbol
                    });
                    await api.placeOrder({
                        symbol: params.symbol,
                        side: "BUY",
                        type: "market",
                        quantity: qntStr
                    });
                }
                params.side = "BUY";
                break;
            case "short":
                // 建多仓前先清掉之前的空仓
                if (curPosition > 0) {
                    // 先取消之前的订单
                    await api.cancelOrder({
                        symbol: params.symbol
                    });
                    await api.placeOrder({
                        symbol: params.symbol,
                        side: "SELL",
                        type: "market",
                        quantity: qntStr
                    });
                }
                params.side = "SELL";
                break;
            case "closebuy":
                if (curPosition > 0) {
                    params.quantity = qntStr;
                    params.side = "SELL";
                } else {
                    console.log(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                    res.send(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                }
                break;
            case "closesell":
                if (curPosition < 0) {
                    params.quantity = qntStr;
                    params.side = "BUY";
                } else {
                    console.log(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                    res.send(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                }
                break;
        }
        // 先取消之前的订单
        await api.cancelOrder({
            symbol: params.symbol
        });
        // 下单
        await api.placeOrder(params);

        res.send(`order executed successfully|symbol:${params.symbol}|side: ${body["action"]}|quantity: ${body['quantity']}`);
    } catch (error) {
        res.status(500).send(`Error executing order|symbol:${req.body.symbol}|side: ${req.body["action"]}|quantity: ${req.body['quantity']}`);
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});