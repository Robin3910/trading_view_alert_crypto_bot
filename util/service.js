// http_server.js
const axios = require("axios")
const CONFIG = require('../config/config');
const CryptoJS = require('crypto-js')
// 创建axios实例s
const service = axios.create({
    baseURL: CONFIG.BASE_URL, // api的base_url  process.env.BASE_API,,注意局域网访问时，不能使用localhost
    timeout: 20 * 1000 // 请求超时时间
});

function calcHash(paramsObject){
    const queryString = Object.keys(paramsObject).map((key) => {
        return `${encodeURIComponent(key)}=${paramsObject[key]}`;
    }).join('&');
    return CryptoJS.HmacSHA256(queryString, CONFIG.SECRET_KEY).toString();
}

// request拦截器,拦截每一个请求加上请求头
service.interceptors.request.use(config => {
    config.headers.get['Content-Type'] = 'application/json';
    config.headers.get['X-MBX-APIKEY'] = CONFIG.API_KEY;
    config.headers.post['Content-Type'] = 'application/json';
    config.headers.post['X-MBX-APIKEY'] = CONFIG.API_KEY;
    config.headers.delete['Content-Type'] = 'application/json';
    config.headers.delete['X-MBX-APIKEY'] = CONFIG.API_KEY;
    return config;
}, error => {
    console.log(error) // for debug
    Promise.reject(error)
})

// respone拦截器 拦截到所有的response，然后先做一些判断
service.interceptors.response.use(
    response => {
        // if(response.status === 200) {
        //     return response.data;
        // }
        console.log(response.data);
        return Promise.resolve(response.data);
    },error => {
        console.log('err: ' + error)// for debug
        return Promise.reject(error)
    })

module.exports = {
    service,
    calcHash
}
