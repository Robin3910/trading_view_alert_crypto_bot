const express = require('express');
const app = express();
const api = require('../util/api');
const config = require("../config/config");
const {Log, notifyToPhone} = require("../util/common");
const {cancelOrder} = require("../util/api");
const port = config.PORT;

// IP 白名单过滤中间件
const ipFilterMiddleware = (req, res, next) => {
    const clientIp = req.ip.match(/\d+\.\d+\.\d+\.\d+/);
    if (config.WHITE_IP_CONFIG.includes(clientIp[0])) { // IP 在白名单中，继续处理请求
        next();
    } else {
        // IP 不在白名单中，返回 403 Forbidden
        res.send(`403, ip: ${clientIp}`);
    }
};

app.use(ipFilterMiddleware);
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// calc precision
function calculateQuantityPrecision(price, symbol) {
    if (symbol === "BTCUSDT") {
        return 3;
    }
    // 获取价格的小数点位数
    const decimalCount = price.toString().split('.')[1]?.length || 0;

    // 根据规则计算quantity的精度
    if (decimalCount >= 3) {
        return 0; // 精度到个位
    } else if (decimalCount === 2) {
        return 1; // 精度到一位小数点
    } else {
        return 2; // 精度到两位小数点
    }
}

function calculatePricePrecision(price) {
    // 获取价格的小数点位数
    let precision = price.toString().split('.')[1]?.length || 0;
    if (precision >= 4) {
        precision = 4;
    }
    return precision;
}


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

app.post('/cancel', async (req, res) => {
    const body = req.body;
    const data = await cancelOrder({symbol: body["symbol"]});
    res.send(data);
});

app.get('/exchangeInfo', async (req, res) => {
    // 精度信息
    const precisionMap = {};
    let exchangeInfo = await api.getExchangeInfo();
    // Log(exchangeInfo);
    const symbolsInfo = exchangeInfo['symbols'];
    for (const symbolInfo of symbolsInfo) {
        let tmp = {};
        const filters = symbolInfo['filters'];
        for (const filter of filters) {
            if (filter['filterType'] === "PRICE_FILTER") {
                tmp['pricePrecision'] = filter["tickSize"].toString().split('.')[1]?.length || 0;
                continue;
            }
            if (filter['filterType'] === "LOT_SIZE") {
                tmp['qtyPrecision'] = filter["stepSize"].toString().split('.')[1]?.length || 0;
            }
        }
        precisionMap[symbolInfo['symbol']] = tmp;
    }
    res.send(precisionMap);
});

// 合约买入接口
// action: long/short/closebuy/closesell/close
// {
//     "action": "long/short/closebuy/closesell/close",
//     "symbol": "COMPUSDT",
//     "quantity": "0.1",
//     "price": 57.26,
//     "slAndTp": 0, // 是否开启开仓后便挂止盈止损单, 0关闭，1开启
//     "multiOrder": 0, // 是否为金字塔模式开仓，可以对同一个方向开多个订单，0关闭，1开启
// }
app.post('/message', async (req, res) => {
    try {
        const body = req.body;
        const params = {};
        params.symbol = body["symbol"];
        params.type = 'market'; // 下单类型，可以是market或limit
        let price = body["price"];
        const precision = calculateQuantityPrecision(price, params.symbol);
        const pricePrecision = calculatePricePrecision(price);
        params.quantity = Number(body["quantity"]).toFixed(precision);
        Log(`symbol:${params.symbol}|side: ${body.action}|quantity: ${params.quantity}|qty precision: ${precision}|price precision: ${pricePrecision}`);

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
        Log(`symbol:${params.symbol}|infoQnt: ${qntStr}|curPosition: ${curPosition}`);
        switch (body.action) {
            case "long":
                // 如果仓位存在 且 当前不是金字塔类型的策略，则跳过
                if (curPosition > 0 && !body["multiOrder"]) {
                    Log(`position is already existed|symbol:${params.symbol}|curPosition: ${qntStr}`);
                    res.status(400).send(`position is already existed|symbol:${params.symbol}|curPosition: ${qntStr}`);
                    return;
                }
                // 建多仓前先清掉之前的空仓
                if (curPosition < 0) {
                    await api.placeOrder({
                        symbol: params.symbol,
                        side: "BUY",
                        type: "market",
                        quantity: curPosition * -1
                    });
                    Log(`close prev position|symbol:${params.symbol}|curPosition: ${qntStr}`);
                }
                params.side = "BUY";
                break;
            case "short":
                // 如果仓位存在，则跳过
                if (curPosition < 0 && !body["multiOrder"]) {
                    Log(`position is already existed|symbol:${params.symbol}|curPosition: ${qntStr}`);
                    res.status(400).send(`position is already existed|symbol:${params.symbol}|curPosition: ${qntStr}`);
                    return;
                }
                // 建多仓前先清掉之前的空仓
                if (curPosition > 0) {
                    await api.placeOrder({
                        symbol: params.symbol,
                        side: "SELL",
                        type: "market",
                        quantity: curPosition
                    });
                }
                params.side = "SELL";
                break;
            case "close":
                // close 的时候无论当前仓位是否还存在，都清除掉止盈止损的挂单
                // 1、仓位存在，直接close，清除订单
                // 2、仓位不存在，说明已经被其中一个止盈止损单已经成交了，也清理掉另一个无用的挂单，防止重复开单
                if (curPosition > 0) {
                    params.quantity = curPosition;
                    params.side = "SELL";
                }else if (curPosition < 0){
                    params.quantity = curPosition * -1;
                    params.side = "BUY";
                } else {
                    Log(`no position available|symbol:${params.symbol}|side: close|quantity: ${qntStr}`);
                    res.send(`no position available|symbol:${params.symbol}|side: close|quantity: ${qntStr}`);
                    return;
                }
                break;
            case "closebuy":
                // close 的时候无论当前仓位是否还存在，都清除掉止盈止损的挂单
                // 1、仓位存在，直接close，清除订单
                // 2、仓位不存在，说明已经被其中一个止盈止损单已经成交了，也清理掉另一个无用的挂单，防止重复开单
                await cancelOrder({symbol: params.symbol});
                if (curPosition > 0) {
                    params.quantity = curPosition;
                    params.side = "SELL";
                } else {
                    Log(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                    res.send(`no position available|symbol:${params.symbol}|side: closebuy|quantity: ${qntStr}`);
                    return;
                }
                break;
            case "closesell":
                await cancelOrder({symbol: params.symbol});
                if (curPosition < 0) {
                    params.quantity = curPosition * -1;
                    params.side = "BUY";
                } else {
                    Log(`no position available|symbol:${params.symbol}|side: closesell|quantity: ${qntStr}`);
                    res.send(`no position available|symbol:${params.symbol}|side: closesell|quantity: ${qntStr}`);
                    return;
                }
                break;
            default:
                Log(`order action error|symbol:${params.symbol}|side: ${body["action"]}|quantity: ${body['quantity']}`);
                res.status(400).send(`order action error|symbol:${params.symbol}|side: ${body["action"]}|quantity: ${body['quantity']}`);
                return;
        }

        // 下单前清除之前挂的止盈止损单
        await cancelOrder({symbol: params.symbol});
        // 下单
        await api.placeOrder(params);
        // 开仓就挂上止盈止损单
        if (body.slAndTp === "1" && (body.action === "long" || body.action === "short")) {
            Log(`SL/TP|symbol: ${params.symbol}|stop side: ${body.action === "long" ? "SELL" : "BUY"}|sl:${body.action === "long" ?  (Number(body["price"]) * (1 - config.STOP_LOSS)).toFixed(pricePrecision) : (Number(body["price"]) * (1 + config.STOP_LOSS)).toFixed(pricePrecision)}|TP:${body.action === "long" ? (Number(body["price"]) * (1 + config.STOP_PROFIT)).toFixed(pricePrecision) : (Number(body["price"]) * (1 - config.STOP_PROFIT)).toFixed(pricePrecision)}`);
            // 止损单
            await api.placeOrder({
                symbol: params.symbol,
                side: body.action === "long" ? "SELL" : "BUY",
                type: "STOP",
                stopPrice: body.action === "long" ? (Number(body["price"]) * (1 - config.STOP_LOSS)).toFixed(pricePrecision) : (Number(body["price"]) * (1 + config.STOP_LOSS)).toFixed(pricePrecision),
                price: body.action === "long" ? (Number(body["price"]) * (1 - config.STOP_LOSS)).toFixed(pricePrecision) : (Number(body["price"]) * (1 + config.STOP_LOSS)).toFixed(pricePrecision),
                quantity: params.quantity
            });
            // 止盈单
            await api.placeOrder({
                symbol: params.symbol,
                side: body.action === "long" ? "SELL" : "BUY",
                type: "TAKE_PROFIT",
                stopPrice: body.action === "long" ? (Number(body["price"]) * (1 + config.STOP_PROFIT)).toFixed(pricePrecision) : (Number(body["price"]) * (1 - config.STOP_PROFIT)).toFixed(pricePrecision),
                price: body.action === "long" ? (Number(body["price"]) * (1 + config.STOP_PROFIT)).toFixed(pricePrecision) : (Number(body["price"]) * (1 - config.STOP_PROFIT)).toFixed(pricePrecision),
                quantity: params.quantity
            });
        }
        Log(`order executed successfully|symbol:${params.symbol}|side: ${body["action"]}|quantity: ${body['quantity']}`);
        res.send(`order executed successfully|symbol:${params.symbol}|side: ${body["action"]}|quantity: ${body['quantity']}`);
    } catch (error) {
        notifyToPhone(`bin_:${req.body.symbol}_${req.body["action"]}`);
        res.status(500).send(`Error executing order|symbol:${req.body.symbol}|side: ${req.body["action"]}|quantity: ${req.body['quantity']}`);
    }
});

app.listen(port, () => {
    Log(`Example app listening on port ${port}`)
});