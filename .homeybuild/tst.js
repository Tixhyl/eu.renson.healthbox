const axios = require('axios');

(async() => {
    const req = await axios.get('http://192.168.10.41/v2/api/data/current');
    if (!req) throw new Error('Request failed ');

    console.log(req.data.sensor !== undefined)

    if(req.data.sensor !== undefined && req.data.sensor.length > 0 && req.data.sensor[0] !== undefined && 
        req.data.sensor[0].parameter !== undefined && req.data.sensor[0].parameter.index !== undefined && 
        req.data.sensor[0].parameter.index.value !== undefined)
        console.log("yes!", req.data.sensor.length);

    const _aqi = req.data.sensor[0].parameter.index.value;
    console.log(_aqi)

    

})();