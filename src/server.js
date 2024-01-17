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

let symbolInfoMap = {};

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

async function getPositionRisk(){
    try {
        const params = {};
        const data = await api.getPositionRisk(params);

        for(const item of data) {
            symbolInfoMap[item["symbol"]] = {};
            symbolInfoMap[item["symbol"]]["leverage"] = parseInt(item["leverage"]);
            symbolInfoMap[item["symbol"]]["marginType"] = item["marginType"] === "isolated" ? 1 : 2;
        }

    } catch (e) {
        Log(`getPositionRisk failed`);
    }
    Log(`getPositionRisk success|${JSON.stringify(symbolInfoMap)}`);

    // console.log(symbolInfoMap);
}

async function init() {
    await getPositionRisk();
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

app.post('/setLevel', async (req, res) => {
    const body = req.body;
    const params = {};
    params.symbol = body["symbol"];
    params.leverage = body["leverage"];
    const data = await api.setLevel(params);
    res.send(data);
});
app.post('/setMarginType', async (req, res) => {
    const body = req.body;
    const params = {};
    params.symbol = body["symbol"];
    params.marginType = body["marginType"];
    const data = await api.setMarginType(params);
    res.send(data);
});
app.post('/setPositionMargin', async (req, res) => {
    const body = req.body;
    const params = {};
    params.symbol = body["symbol"];
    params.amount = body["amount"];
    params.type = 1;
    const data = await api.setPositionMargin(params);
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

async function setSymbolInfo(symbol, marginType, leverage) {
    if (!symbolInfoMap[symbol]) {
        symbolInfoMap[symbol] = {};
    }
    try {
        if (leverage !== symbolInfoMap[symbol]["leverage"]) {
            Log(`change leverage: wanna change to: ${leverage}|cur: ${symbolInfoMap[symbol]["leverage"]} | symbol: ${symbol}`);
            const params = {};
            params.symbol = symbol;
            params.leverage = leverage;
            await api.setLevel(params);
            symbolInfoMap[symbol]["leverage"] = leverage;
            Log(`set leverage: ${leverage} | symbol: ${symbol}`);
        }


        if (marginType !== symbolInfoMap[symbol]["marginType"]) {
            Log(`change margin type, cur: ${symbolInfoMap[symbol]["marginType"]}| wanna change to: ${marginType} | symbol: ${symbol}`);
            const params = {};
            params.symbol = symbol;
            params.marginType = marginType === 1 ? "ISOLATED" : "CROSSED";
            await api.setMarginType(params);
            symbolInfoMap[symbol]["marginType"] = marginType;
            Log(`set margin type: ${params.marginType} | symbol: ${symbol}`);
        }
        return true;
    } catch (e) {
        Log(`setSymbolInfo failed|symbol: ${symbol}|leverage: ${leverage} | marginType: ${marginType}`);
        return false;
    }
    return true;
}

async function setPositionMargin(symbol, positionMargin) {
    try {
        const params = {};
        params.symbol = symbol;
        params.amount = positionMargin;
        params.type = 1; // 1为增加保证金
        await api.setPositionMargin(params);
    } catch (e) {
        Log(`setPositionMargin failed|symbol: ${symbol}|positionMargin: ${positionMargin}`);
        return false;
    }
    return true;
}

function isOpenAction(action) {
    return action === "long" || action === "short";
}

// 合约买入接口
// action: long/short/closebuy/closesell/close
// {
//     "action": "long/short/close",
//     "symbol": "COMPUSDT",
//     "quantity": "0.1",
//     "price": 57.26,
//     "slAndTp": 0, // 是否开启开仓后便挂止盈止损单, 0关闭，1开启
//     "multiOrder": 0, // 是否为金字塔模式开仓，可以对同一个方向开多个订单，0关闭，1开启
//     "marginType": 1, // 1：ISOLATED(逐仓),2： CROSSED(全仓)。不传时默认为"全仓"。
//     "leverage": 20, // 设置杠杆倍数，不传时默认为20倍杠杆。
//     "positionMargin"：300, // 逐仓时，逐仓保证金为300U。
//     "maxMarginPercent"：40, // 所有占用保证金占用总本金的比例，超过了该比例，不能再继续开单。比如，设置40，本金1000U，目前开仓占用的保证金已经超过了400U，新进入的信号不开单。
// }

app.post('/message', async (req, res) => {
    try {
        const body = req.body;
        const params = {};
        params.symbol = body["symbol"];
        params.type = 'market'; // 下单类型，可以是market或limit
        let price = body["price"];
        let account = await api.getAccount();
        let leverage = body["leverage"] ? parseInt(body["leverage"]) : 10;
        let marginType = body["marginType"] ? parseInt(body["marginType"]) : 2; // 默认全仓
        // 开仓的时候才需要去判断杠杆、逐仓、逐仓保证金
        if (isOpenAction(body.action)) {
            let maxMarginPercent = body["maxMarginPercent"] ? parseInt(body["maxMarginPercent"]) / 100 : 0.4;
            let availableBalance = parseInt(account["availableBalance"]);
            let totalWalletBalance = parseInt(account["totalWalletBalance"]);
            Log(`max margin percent: ${maxMarginPercent}, available bal: ${availableBalance}, total bal: ${totalWalletBalance}`);

            // 控制仓位情况
            if ((totalWalletBalance - availableBalance) / totalWalletBalance > maxMarginPercent) {
                res.status(400).send(`over max margin percent|max margin percent: ${maxMarginPercent}, available bal: ${availableBalance}, total bal: ${totalWalletBalance}`);
                return;
            }

            let setStatus = await setSymbolInfo(params.symbol, marginType, leverage);

            if (!setStatus) {
                res.status(500).send(`set info failed|symbol:${params.symbol}|marginType: ${marginType}|leverage: ${leverage}`);
                return;
            }
        }

        const precision = calculateQuantityPrecision(price, params.symbol);
        const pricePrecision = calculatePricePrecision(price);
        params.quantity = Number(body["quantity"]).toFixed(precision);
        Log(`symbol:${params.symbol}|side: ${body.action}|quantity: ${params.quantity}|qty precision: ${precision}|price precision: ${pricePrecision}`);

        // 查看当前是否有持仓
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
                } else if (curPosition < 0) {
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
        if (body.slAndTp) {
            await cancelOrder({symbol: params.symbol});
        }

        // 下单
        await api.placeOrder(params);
        if (isOpenAction(body.action) && marginType === 1) {
            let positionMargin = body["positionMargin"] ? parseInt(body["positionMargin"]) : 500;
            // 增加保证金
            await setPositionMargin(params.symbol, positionMargin);
        }
        // 开仓就挂上止盈止损单
        if (body.slAndTp === "1" && (body.action === "long" || body.action === "short")) {
            Log(`SL/TP|symbol: ${params.symbol}|stop side: ${body.action === "long" ? "SELL" : "BUY"}|sl:${body.action === "long" ? (Number(body["price"]) * (1 - config.STOP_LOSS)).toFixed(pricePrecision) : (Number(body["price"]) * (1 + config.STOP_LOSS)).toFixed(pricePrecision)}|TP:${body.action === "long" ? (Number(body["price"]) * (1 + config.STOP_PROFIT)).toFixed(pricePrecision) : (Number(body["price"]) * (1 - config.STOP_PROFIT)).toFixed(pricePrecision)}`);
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

app.listen(port, async () => {
    await init();

    Log(`Example app listening on port ${port}`)
});