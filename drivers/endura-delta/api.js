const fetch = require('node-fetch');
const util = require('util');

const { URLSearchParams } = require('url');

class EnduraApi {
    constructor(ip) {
        this.ip = ip;
    }
    // #172.30.27.52
    async initializeSession() {
        const url = `http://${this.ip}/JSON/ModifiedItems?wsn=150324488709`;
        console.log(url)
        // const requestBody = JSON.stringify({
        //     "userName": this.username,
        //     "systemCode": this.password
        // });
        const response = await fetch(url);
        const data = await response.json();

        // console.log(data);
        return data;
    }

    async processData(data) {
        let deviceName;
        let CO2;
        let currentPollutionLevel;
        let currentVentilationLevel;

        for (let index = 0; index < data["ModifiedItems"].length; index++) {
            if (data["ModifiedItems"][index]["Name"] == "Warranty number") {
                deviceName = data["ModifiedItems"][index]["Value"];
            }
            if (data["ModifiedItems"][index]["Name"] == "CO2") {
                CO2 = data["ModifiedItems"][index]["Value"];
            }
            if (data["ModifiedItems"][index]["Name"] == "Current pollution level") {
                currentPollutionLevel = data["ModifiedItems"][index]["Value"];
            }
            if (data["ModifiedItems"][index]["Name"] == "Current ventilation level") {
                currentVentilationLevel = data["ModifiedItems"][index]["Value"];
            }
            // if (session[index]["Device name"] !== null) {
            //     deviceName = session[index];
            // }
        }
        return { deviceName, CO2, currentPollutionLevel, currentVentilationLevel };
    }
    // async apiRequest(url, methodContent, requestBody) {

    //     const apiResponse = await fetch(url, {
    //         method: methodContent,
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json;charset=UTF-8'
    //         },
    //         body: requestBody,
    //     });

    //     const apiData = await apiResponse;
    //     const bodyData = await apiData.text();

    //     token = apiData.headers.get('xsrf-token');
    //     if (apiData.statusText === 'OK' && bodyData.length > 0) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }

    // async getSystems() {

    //     const systemsUrl = `${baseUrl}/getStationList`;

    //     const response = await fetch(systemsUrl, {
    //         method: "POST",
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json;charset=UTF-8',
    //             "XSRF-TOKEN": token,
    //         }
    //     });
    //     const apiData = await response.json();
    //     return apiData.data;

    // }

    // async getBasicStats(stationCode) {
    //     const systemsUrl = `${baseUrl}/getStationRealKpi`;

    //     let bodyData = JSON.stringify({
    //         "stationCodes": stationCode
    //     });
    //     const response = await fetch(systemsUrl, {
    //         method: "POST",
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json;charset=UTF-8',
    //             "XSRF-TOKEN": token,
    //         },
    //         body: bodyData
    //     });

    //     const apiData = await response.json();
    //     if (apiData.data !== null) {
    //         return apiData.data[0].dataItemMap;
    //     } else {
    //         return null;
    //     }
    // }

    // async getDevList(stationCode) {

    //     const systemsUrl = `${baseUrl}/getDevList`;
    //     let battery = "";
    //     let inverter = "";
    //     let powerSensor = "";

    //     let bodyData = JSON.stringify({
    //         "stationCodes": stationCode
    //     });
    //     const response = await fetch(systemsUrl, {
    //         method: "POST",
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json;charset=UTF-8',
    //             "XSRF-TOKEN": token,
    //         },
    //         body: bodyData
    //     });

    //     const apiData = await response.json();

    //     for (let index = 0; index < apiData.data.length; index++) {

    //         if (apiData.data[index]["devName"] !== null && apiData.data[index]["devName"].includes('Battery')) {
    //             battery = apiData.data[index];
    //         }

    //         if (apiData.data[index]["devName"] !== null && apiData.data[index]["devName"].includes('meter')) {
    //             powerSensor = apiData.data[index];
    //         }

    //         if (apiData.data[index]["devName"] !== null && apiData.data[index]["devName"].includes('Power Sensor')) {
    //             powerSensor = apiData.data[index];
    //         }

    //         if (apiData.data[index]["invType"] !== null && apiData.data[index]["invType"].includes("SUN2000-")) {
    //             inverter = apiData.data[index];
    //         }
    //     }
    //     return { battery, inverter, powerSensor };

    // }
    // async getDevRealKpi(devIds, devTypeId, server) {

    //     const systemsUrl = `https://${server}.fusionsolar.huawei.com:31942/thirdData/getDevRealKpi`;
    //     let bodyData = JSON.stringify({
    //         "devIds": devIds,
    //         "devTypeId": devTypeId
    //     });
    //     const response = await fetch(systemsUrl, {
    //         method: "POST",
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json;charset=UTF-8',
    //             "XSRF-TOKEN": token,
    //         },
    //         body: bodyData
    //     });

    //     const apiData = await response.json();

    //     if (apiData.errorCode !== "undefined") {
    //         if (apiData.data !== 'undefined') {
    //             return apiData.data[0].dataItemMap;;
    //         } else {
    //             return null;
    //         }
    //     } else {
    //         return null;
    //     }



    // }
}

module.exports = { EnduraApi };
