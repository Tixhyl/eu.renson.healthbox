const fetch = require('node-fetch');
const util = require('util');

const { URLSearchParams } = require('url');

class EnduraApi {
    constructor(ip) {
        this.ip = ip;
    }
    async initializeSession() {
        try {
            const url = `http://${this.ip}/JSON/ModifiedItems?wsn=150324488709`;
            console.log(url)

            const response = await fetch(url);
            const data = await response;
            return true
        } catch (error) {
            throw error;
        }
    }

    async getData() {
        try {
            const url = `http://${this.ip}/JSON/ModifiedItems?wsn=150324488709`;
            console.log(url)

            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }

    async processData(data) {
        let deviceName;
        let CO2;
        let indoorAirQuality;
        let currentVentilationLevel;
        let externalTemperature;
        let internalTemperature;
        let humidity;
        let measuredSupAirflow;
        let measuredEtaAirflow;
        let deviceMAC;
        try {
            for (let index = 0; index < data["ModifiedItems"].length; index++) {
                if (data["ModifiedItems"][index]["Name"] == "Warranty number") {
                    deviceName = data["ModifiedItems"][index]["Value"];
                }
                if (data["ModifiedItems"][index]["Name"] == "CO2") {
                    CO2 = parseInt(data["ModifiedItems"][index]["Value"]);
                }
                if (data["ModifiedItems"][index]["Name"] == "IAQ") {
                    indoorAirQuality = parseInt(data["ModifiedItems"][index]["Value"]);
                }
                if (data["ModifiedItems"][index]["Name"] == "Current ventilation level") {
                    currentVentilationLevel = data["ModifiedItems"][index]["Value"];
                    console.log(currentVentilationLevel);
                }
                if (data["ModifiedItems"][index]["Name"] == "T21") {
                    externalTemperature = parseInt(data["ModifiedItems"][index]["Value"]);
                }
                if (data["ModifiedItems"][index]["Name"] == "T11") {
                    internalTemperature = parseInt(data["ModifiedItems"][index]["Value"]);
                }
                if (data["ModifiedItems"][index]["Name"] == "RH11") {
                    humidity = parseInt(data["ModifiedItems"][index]["Value"]);
                }
                if (data["ModifiedItems"][index]["Name"] == "Measured SUP airflow") {
                    measuredSupAirflow = data["ModifiedItems"][index]["Value"];
                }
                if (data["ModifiedItems"][index]["Name"] == "Measured ETA airflow") {
                    measuredEtaAirflow = data["ModifiedItems"][index]["Value"];
                }
                if (data["ModifiedItems"][index]["Name"] == "MAC") {
                    deviceMAC = data["ModifiedItems"][index]["Value"];
                }

            }
            return { deviceName, CO2, indoorAirQuality, currentVentilationLevel, externalTemperature, internalTemperature, humidity, measuredSupAirflow, measuredEtaAirflow, deviceMAC };
        } catch (error) {
            throw error;
        }

    }

}

module.exports = { EnduraApi };
