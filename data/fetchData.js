'use strict';
const ccxt = require('ccxt');
const config = require('./config')
const fs = require('fs')

let data = [];
let exchange;

const START = config.START;
const END = config.END;

let startTimeStamp = new Date(START).getTime();
const endTimeStamp = new Date(END).getTime();


function connectBinance() {
    const exchangeId = 'binance';
    const exchangeClass = ccxt[exchangeId];
    return new exchangeClass({
        'apiKey': config.API_KEY,
        'secret': config.SECRET_KEY,
    });
}

async function fetchData(){
    while(!data.length || data[data.length - 1][0] < endTimeStamp) {
        let temp = await exchange.fetchOHLCV (config.COIN, '1m', startTimeStamp, 1000);
        data = data.concat(temp);
        startTimeStamp += 1000 * 60 * 1000;
    }
    fs.writeFileSync(`./data_${START.split(' ')[0]}_${END.split(' ')[0]}.json`, JSON.stringify((data)));
    console.log(data[data.length - 1]);
}


exchange = connectBinance();
fetchData();