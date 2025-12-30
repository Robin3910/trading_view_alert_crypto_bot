const service = require('./service');
const CONFIG = require('../config/config');
const axios = require('axios');

function checkPositionDual() {
    const ts = Date.now();
    return service.service({
        url: '/fapi/v1/positionSide/dual',
        method: 'get',
        params: {
            timestamp: ts,
            signature: service.calcHash({timestamp: ts})
        }
    })
}

function changePositionDual(params) {
    params.timestamp = Date.now();
    return service.service({
        url: '/fapi/v1/positionSide/dual',
        method: 'post',
        params: {
            ...params,
            signature: service.calcHash(params)
        }
    })
}

function checkServerTime() {
    return service.service({
        url: '/fapi/v1/time',
        method: 'get'
    });
}
function ping() {
    return service.service({
        url: '/fapi/v1/ping',
        method: 'get'
    });
}

function createListenKey() {
    return service.service({
        url: '/fapi/v1/listenKey',
        method: 'post'
    });
}

function getBalance() {
    const ts = Date.now();
    return service.service({
        url: '/fapi/v2/balance',
        method: 'get',
        params: {
            timestamp: ts,
            signature: service.calcHash({timestamp: ts})
        }
    })
}

function getExchangeInfo(){
    const ts = Date.now();
    return service.service({
        url: '/fapi/v1/exchangeInfo',
        method: 'get',
        params: {
            timestamp: ts,
            signature: service.calcHash({timestamp: ts})
        }
    });
}

/**
 * 下单接口
 * @param params
 * symbol: ethusdt
 * side: BUY/SELL
 * type: MARKET
 * quantity: 0.003 需要将usdt转化成目标eth单位
 */
function placeOrder(params) {
    params.timestamp = Date.now();
    return service.service({
        url: '/fapi/v1/order',
        method: 'post',
        params: {
            ...params,
            signature: service.calcHash(params)
        }
    })
}

/**
 * 查询所有挂单
 * 挂单后需要确认当前订单已经成交了，才能进行下一步操作
 * 查询三次还未成单后，撤销订单
 * @param params
 * symbol: ethusdt
 * @returns {AxiosPromise}
 */
function queryOrders(params) {
    params.timestamp = Date.now();
    return service.service({
        url: '/fapi/v1/openOrders',
        method: 'get',
        params: {
            ...params,
            signature: service.calcHash(params)
        }
    })
}

/**
 * 查询单个挂单
 * @param params
 * symbol: ethusdt
 * orderId: 8389765524955795196
 * @returns {AxiosPromise}
 */
async function querySingleOrder(params) {
    return new Promise((resolve, reject) => {
        params.timestamp = Date.now();
        params.signature = service.calcHash(params);
        const queryString = Object.keys(params).map((key) => {
            return `${encodeURIComponent(key)}=${params[key]}`;
        }).join('&');
        const config = {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'X-MBX-APIKEY': CONFIG.API_KEY,
            },
            url: `${CONFIG.BASE_URL}/fapi/v1/openOrder?${queryString}`,
        };

        axios(config)
            .then(function (response) {
                resolve(response.data);
            }).catch(err => {
            resolve(err.response.data);
        });
    })

}

/**
 * 查询当前账户信息，可用于获取头寸
 * @param params
 * @returns {AxiosPromise}
 */
async function getAccount() {
    let params = {};
    return new Promise((resolve, reject) => {
        params.timestamp = Date.now();
        params.signature = service.calcHash(params);
        const queryString = Object.keys(params).map((key) => {
            return `${encodeURIComponent(key)}=${params[key]}`;
        }).join('&');
        const config = {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'X-MBX-APIKEY': CONFIG.API_KEY,
            },
            url: `${CONFIG.BASE_URL}/fapi/v2/account?${queryString}`,
        };

        axios(config)
            .then(function (response) {
                resolve(response.data);
            }).catch(err => {
            resolve(err.response.data);
        });
    })

}

/**
 * 撤销订单接口
 * @param params
 * symbol: ethusdt
 * @returns {AxiosPromise}
 */
function cancelOrder(params) {
    return new Promise((resolve, reject) => {
        params.timestamp = Date.now();
        params.signature = service.calcHash(params);
        const queryString = Object.keys(params).map((key) => {
            return `${encodeURIComponent(key)}=${params[key]}`;
        }).join('&');
        const config = {
            method: 'delete',
            headers: {
                'Content-Type': 'application/json',
                'X-MBX-APIKEY': CONFIG.API_KEY,
            },
            url: `${CONFIG.BASE_URL}/fapi/v1/allOpenOrders?${queryString}`,
        };

        axios(config)
            .then(function (response) {
                resolve(response.data);
            }).catch(err => {
                resolve(err.response.data);
        });
    })
}


/**
 * 下单接口V2
 * @param params
 * {
 *    symbol: "ethusdt",
 *    side: "BUY" | "SELL",
 *    type: "LIMIT" | "MARKET" | ...,
 *    quantity: "0.1",
 *    price: "100",
 *    timeInForce: "GTC",
 *    ...
 * }
 * @returns {Promise}
 */
function placeOrderV2(params) {
    return new Promise((resolve, reject) => {
        params.timestamp = Date.now();
        params.signature = service.calcHash(params);
        const queryString = Object.keys(params).map((key) => {
            return `${encodeURIComponent(key)}=${params[key]}`;
        }).join('&');
        const config = {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-MBX-APIKEY': CONFIG.API_KEY,
            },
            url: `${CONFIG.BASE_URL}/fapi/v1/order?${queryString}`,
            // data: '' // POST 请求参数均已写在url query string中，Binance要求
        };

        axios(config)
            .then(function (response) {
                resolve(response.data);
            }).catch(err => {
                resolve(err.response?.data || err);
            });
    });
}


module.exports = {
    ping,
    createListenKey,
    getBalance,
    placeOrder,
    queryOrders,
    cancelOrder,
    querySingleOrder,
    checkServerTime,
    getAccount,
    getExchangeInfo,
    checkPositionDual,
    changePositionDual,
    placeOrderV2
}

