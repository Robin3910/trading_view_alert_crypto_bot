const axios = require('axios');

function Log(str){
    console.log(`${new Date()}|${str}`);
}

function transTimeStampToDate(timeStamp) {
    const date = new Date(timeStamp);
    const Y = date.getFullYear() + '-';
    const M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    const D = date.getDate() + ' ';
    const h = date.getHours() + ':';
    const m = date.getMinutes() + ':';
    const s = date.getSeconds();
    return Y + M + D + h + m + s;
}

function notifyToPhone(msg) {
    const config = {
        method: 'post',
        url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=9fd3ba17-af23-4a78-b40f-7903c89cb4bf',
        data: {
            "msgtype": "text",
            "text": {
                "content": msg
            }
        }
    };

    axios(config)
        .then(function (response) {
            console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });
}

module.exports = {
    transTimeStampToDate,
    notifyToPhone,
    Log
}