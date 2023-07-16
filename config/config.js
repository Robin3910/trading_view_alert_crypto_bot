// up 1, down -1
const GRID_DIRECTION = 1;
const API_KEY = '';
const SECRET_KEY = '';
const COIN = 'ethusdt';
const GRID_TOP_PRICE = 2000;
const GRID_BOTTOM_PRICE = 1750;
const INIT_MONEY = 80; // usdt
const GRID_PERCENT = 0.006;
const WHITE_IP_CONFIG = ['52.89.214.238',
    '34.212.75.30',
    '54.218.53.128',
    '52.32.178.7',
    '127.0.0.1',
    '103.254.155.26'];
const env = "prd";
const BASE_URL = env === "prd" ? "https://fapi.binance.com" : "https://testnet.binancefuture.com";
const LOG_FILE_PATH = './log.txt';
const GRID_DATA = './data.json';
const NOTIFY_COUNTDOWN = 60;
module.exports = {
    GRID_PERCENT,
    INIT_MONEY,
    GRID_TOP_PRICE,
    GRID_BOTTOM_PRICE,
    GRID_DIRECTION,
    API_KEY,
    SECRET_KEY,
    COIN,
    LOG_FILE_PATH,
    BASE_URL,
    NOTIFY_COUNTDOWN,
    GRID_DATA,
    WHITE_IP_CONFIG
}
/**
 * price ticker structure
 * { symbol: 'BTC/USDT',
  timestamp: 1653720307736,
  datetime: '2022-05-28T06:45:07.736Z',
  high: 29397.66,
  low: 28282.9,
  bid: 28891.57,
  bidVolume: 3.01097,
  ask: 28891.58,
  askVolume: 4.88877,
  vwap: 28811.20491494,
  open: 28859.14,
  close: 28891.57,
  last: 28891.57,
  previousClose: '28859.14000000',
  change: 32.43,
  percentage: 0.112,
  average: 28875.355,
  baseVolume: 75567.85256,
  quoteVolume: 2177200885.087909,
  info:
   { symbol: 'BTCUSDT',
     priceChange: '32.43000000',
     priceChangePercent: '0.112',
     weightedAvgPrice: '28811.20491494',
     prevClosePrice: '28859.14000000',
     lastPrice: '28891.57000000',
     lastQty: '0.00450000',
     bidPrice: '28891.57000000',
     bidQty: '3.01097000',
     askPrice: '28891.58000000',
     askQty: '4.88877000',
     openPrice: '28859.14000000',
     highPrice: '29397.66000000',
     lowPrice: '28282.90000000',
     volume: '75567.85256000',
     quoteVolume: '2177200885.08790900',
     openTime: '1653633907736',
     closeTime: '1653720307736',
     firstId: '1382967960',
     lastId: '1384154635',
     count: '1186676' } }

 */
