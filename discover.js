/* eslint-disable no-console */
/* eslint-disable indent */
/* eslint-disable strict */
const axios = require('axios');

(async () => {
    async function axiosFetch(ip, endpoint, _timeout = 3000) {
        const url = `http://${ip}/v1/api${endpoint}`;
        console.log(`Requesting ${url} with timeout ${_timeout}`);
        try {
            const resp = await axios.get(url, { timeout: _timeout });
            // this.setAvailable().catch(this.error);
            return resp.data;
        } catch (error) {
            // let errcode;
            // if (error.response === undefined) errcode = 1; // Timeout
            // if (error.response !== undefined && error.response.data.status === 404) errcode = 2; // 404 - Not Found
            // const errMess = { error: true, error_code: errcode };
            console.log(`Error at endpoint ${endpoint}`, error);
            return null;
        }
    }

    const res = await axiosFetch('192.168.10.41', '/data/current');
    const devices = [];
    if (res) {
        if (res.sensor && res.sensor[0] && res.sensor[0].parameter && res.sensor[0].parameter.index && res.sensor[0].parameter.index.value) {
            console.log("Air Quality Index", res.sensor[0].parameter.index.value);
        }
        //console.log(res.room)
        if (res.room && res.room.length) {
            res.room.forEach(element => {
                axiosFetch('192.168.10.41', `/boost/${element.id}`)
                    .then(val => {
                        console.log(element.id, element.name, element.actuator[0].parameter.flow_rate.value, "m³/h", 'boost enabled', val.enable, 'boost value', val.level, 'remaining', val.remaining);
                    });
            });
        }
    } else {
        console.log('Failed!');
    }
})();


// http://192.168.10.41/v1/constellation

/*
PUT "http://{HEALTHBOX_IP}/v1/api/boost/{ROOM_ID}"
Content-Type: application/json
{
  "enable": true,
  "level": 175,
  "timeout": 900
}
*/